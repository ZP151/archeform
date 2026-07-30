import { z } from "zod";

import type { Sha256Digest } from "./canonical.js";
import {
  CandidateRegistry,
  type CandidateProposalV1,
  type CandidateQueryV1,
  type CandidateSummaryV1,
  type CandidateVerificationResultV1,
  type StoredCandidateRefV1,
} from "./candidates.js";
import {
  evaluateCandidateConformance,
  type CandidateConformanceResultV1,
} from "./conformance.js";
import {
  parseEvidenceBundle,
  parseIntakeReceipt,
  parseIntakeRequest,
  type EvidenceBundleV1,
  type IntakeRequestV1,
} from "./contracts.js";
import { ExternalIntakeStore, type StoredRecordRef } from "./store.js";

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const opaqueIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,127}$/u);
const batchSchema = z
  .object({
    apiVersion: z.literal("factory.external-intake-batch/v1"),
    items: z
      .array(
        z
          .object({
            id: opaqueIdSchema,
            request: z.unknown(),
          })
          .strict(),
      )
      .min(1)
      .max(1_000)
      .refine(
        (items) => new Set(items.map(({ id }) => id)).size === items.length,
      ),
  })
  .strict();

export interface ExternalIntakeBatchV1 {
  readonly apiVersion: "factory.external-intake-batch/v1";
  readonly items: readonly {
    readonly id: string;
    readonly request: unknown;
  }[];
}

export interface ExternalIntakeBatchItemResultV1 {
  readonly status: "requested" | "blocked";
  readonly request?: StoredRecordRef;
  readonly lookupId?: string;
  readonly failureCode?: "invalid-intake-request";
}

export interface ExternalIntakeBatchResultV1 {
  readonly byId: Readonly<Record<string, ExternalIntakeBatchItemResultV1>>;
}

export interface ExternalIntakeStatusV1 {
  readonly id: string;
  readonly status: "requested" | "blocked";
  readonly producerVersion?: string;
  readonly recordDigests: readonly Sha256Digest[];
  readonly failureCode?: string;
}

export interface ExternalEvidenceSummaryV1 {
  readonly apiVersion: "factory.external-evidence-summary/v1";
  readonly digest: Sha256Digest;
  readonly snapshotDigest: Sha256Digest;
  readonly producerVersion: string;
  readonly licence: {
    readonly manualStatus: EvidenceBundleV1["licence"]["manualStatus"];
    readonly primaryPathCount: number;
    readonly noticeCount: number;
  };
  readonly sbom: EvidenceBundleV1["sbom"];
  readonly scans: EvidenceBundleV1["scans"];
  readonly ast: EvidenceBundleV1["ast"];
}

export interface ExternalIntakeApiV1 {
  submitBatch(input: unknown): ExternalIntakeBatchResultV1;
  status(id: string): ExternalIntakeStatusV1;
  evidence(digest: string): ExternalEvidenceSummaryV1;
  candidateCreate(input: CandidateProposalV1): Promise<StoredCandidateRefV1>;
  candidateShow(id: string, version: string): CandidateSummaryV1;
  candidateList(filter: CandidateQueryV1): readonly CandidateSummaryV1[];
  candidateTest(
    id: string,
    version: string,
  ): Promise<CandidateConformanceResultV1>;
  candidateVerify(
    id: string,
    version: string,
  ): Promise<CandidateVerificationResultV1>;
  verifyJob(id: string): { readonly id: string; readonly valid: boolean };
}

function jobLookupId(receiptDigest: string): string {
  return `job-${receiptDigest.slice("sha256:".length)}`;
}

export function createExternalIntakeApi(
  store: ExternalIntakeStore,
  verificationRoot: string,
): ExternalIntakeApiV1 {
  const registry = new CandidateRegistry(store, verificationRoot);
  const statuses = new Map<string, ExternalIntakeStatusV1>();

  return {
    submitBatch(input: unknown): ExternalIntakeBatchResultV1 {
      let batch: z.infer<typeof batchSchema>;
      try {
        batch = batchSchema.parse(input);
      } catch {
        throw new TypeError("External Intake requires strict batch input.");
      }
      const byId: Record<string, ExternalIntakeBatchItemResultV1> =
        Object.create(null) as Record<string, ExternalIntakeBatchItemResultV1>;
      for (const item of batch.items) {
        try {
          const request: IntakeRequestV1 = parseIntakeRequest(item.request);
          const ref = store.putRecord("request", request);
          const receipt = store.appendReceipt(item.id, {
            apiVersion: "factory.external-intake-receipt/v1",
            createdAt: request.createdAt,
            producerVersion: request.producerVersion,
            parentDigests: [ref.digest],
            jobId: item.id,
            sequence: 1,
            status: "requested",
            code: "intake-request-accepted",
            recordDigests: [ref.digest],
          });
          const lookupId = jobLookupId(receipt.digest);
          byId[item.id] = { status: "requested", request: ref, lookupId };
          statuses.set(item.id, {
            id: item.id,
            status: "requested",
            producerVersion: request.producerVersion,
            recordDigests: [ref.digest],
          });
          statuses.set(lookupId, statuses.get(item.id)!);
        } catch {
          byId[item.id] = {
            status: "blocked",
            failureCode: "invalid-intake-request",
          };
          statuses.set(item.id, {
            id: item.id,
            status: "blocked",
            recordDigests: [],
            failureCode: "invalid-intake-request",
          });
        }
      }
      return { byId };
    },

    status(id: string): ExternalIntakeStatusV1 {
      const parsed = opaqueIdSchema.parse(id);
      const status = statuses.get(parsed);
      if (status !== undefined) return status;
      if (!/^job-[a-f0-9]{64}$/u.test(parsed)) {
        throw new Error(`Unknown intake job '${parsed}'.`);
      }
      const receipt = parseIntakeReceipt(
        store.getRecord({
          kind: "receipt",
          digest: `sha256:${parsed.slice("job-".length)}`,
        }),
      );
      if (
        receipt.sequence !== 1 ||
        receipt.status !== "requested" ||
        receipt.code !== "intake-request-accepted" ||
        receipt.recordDigests.length !== 1
      ) {
        throw new Error("Intake job receipt-addressed reference is invalid.");
      }
      const request = parseIntakeRequest(
        store.getRecord({ kind: "request", digest: receipt.recordDigests[0]! }),
      );
      return {
        id: receipt.jobId,
        status: "requested",
        producerVersion: request.producerVersion,
        recordDigests: [receipt.recordDigests[0]!],
      };
    },

    evidence(digest: string): ExternalEvidenceSummaryV1 {
      if (!DIGEST.test(digest))
        throw new TypeError("Evidence digest is invalid.");
      const parsedDigest = digest as Sha256Digest;
      const evidence = parseEvidenceBundle(
        store.getRecord({ kind: "evidence", digest: parsedDigest }),
      );
      return {
        apiVersion: "factory.external-evidence-summary/v1",
        digest: parsedDigest,
        snapshotDigest: evidence.snapshotDigest,
        producerVersion: evidence.producerVersion,
        licence: {
          manualStatus: evidence.licence.manualStatus,
          primaryPathCount: evidence.licence.primaryPaths.length,
          noticeCount: evidence.notices.length,
        },
        sbom: evidence.sbom,
        scans: evidence.scans,
        ast: evidence.ast,
      };
    },

    async candidateCreate(
      input: CandidateProposalV1,
    ): Promise<StoredCandidateRefV1> {
      return registry.create(input);
    },

    candidateShow(id: string, version: string): CandidateSummaryV1 {
      const candidate = registry.get(id, version);
      const ref = registry.getRef(id, version);
      return {
        id: candidate.id,
        version: candidate.version,
        status: candidate.status,
        lookupId: ref.lookupId,
        proposedFactoryKey: candidate.proposedFactoryKey,
        candidateDigest: ref.digest,
        evidenceDigest: candidate.evidenceDigest,
      };
    },

    candidateList(filter: CandidateQueryV1): readonly CandidateSummaryV1[] {
      return registry.list(filter);
    },

    async candidateTest(
      id: string,
      version: string,
    ): Promise<CandidateConformanceResultV1> {
      const bundle = registry.getConformanceBundle(id, version);
      const result = evaluateCandidateConformance(bundle);
      if (result.status !== "pass") return result;
      if (bundle.candidate.status === "quarantined") {
        await registry.recordConformancePass(id, version, result);
      }
      return result;
    },

    async candidateVerify(
      id: string,
      version: string,
    ): Promise<CandidateVerificationResultV1> {
      return registry.verify(registry.getRef(id, version));
    },

    verifyJob(id: string): { readonly id: string; readonly valid: boolean } {
      const status = this.status(id);
      return { id: status.id, valid: status.status !== "blocked" };
    },
  };
}
