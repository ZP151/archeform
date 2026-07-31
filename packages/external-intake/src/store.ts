import {
  closeSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import { z } from "zod";

import {
  canonicalJson,
  canonicalRecordDigest,
  digestBytes,
  type Sha256Digest,
} from "./canonical.js";
import {
  intakeContractPrimitives,
  parseCandidateCapability,
  parseExternalSourceAcquisition,
  parseIntakeReceipt,
  parseIntakeRecord,
  type ExternalSourceAcquisitionV1,
  type CandidateCapabilityV1,
  type IntakeReceiptV1,
  type IntakeRecordKind,
  type IntakeRecordV1,
} from "./contracts.js";
import { DEFAULT_SNAPSHOT_LIMITS } from "./snapshot.js";

const blobKindSchema = z.enum(["snapshot", "evidence"]);
const recordKindSchema = z.enum([
  "request",
  "snapshot",
  "acquisition",
  "evidence",
  "candidate",
  "promotion",
  "receipt",
]);
const storedRecordRefSchema = z
  .object({
    kind: recordKindSchema,
    digest: intakeContractPrimitives.sha256DigestSchema,
  })
  .strict();
const receiptIndexSchema = z
  .object({
    apiVersion: z.literal("factory.external-intake-receipt-index/v1"),
    createdAt: intakeContractPrimitives.canonicalTimestampSchema,
    producerVersion: intakeContractPrimitives.versionSchema,
    parentDigests: z
      .array(intakeContractPrimitives.sha256DigestSchema)
      .length(1),
    jobId: intakeContractPrimitives.opaqueIdSchema,
    sequence: z.number().int().positive().finite(),
    receiptDigest: intakeContractPrimitives.sha256DigestSchema,
  })
  .strict()
  .refine(
    ({ parentDigests, receiptDigest }) => parentDigests[0] === receiptDigest,
    "Receipt index parent must be its receipt digest.",
  );

type ReceiptIndexV1 = z.infer<typeof receiptIndexSchema>;

const candidateCreationClaimInputSchema = z
  .object({
    id: intakeContractPrimitives.opaqueIdSchema,
    version: intakeContractPrimitives.versionSchema,
    jobId: intakeContractPrimitives.opaqueIdSchema,
    candidateDigest: intakeContractPrimitives.sha256DigestSchema,
    receiptDigest: intakeContractPrimitives.sha256DigestSchema,
    blobs: z
      .array(
        z
          .object({
            kind: blobKindSchema,
            digest: intakeContractPrimitives.sha256DigestSchema,
          })
          .strict(),
      )
      .min(1)
      .max(100_000)
      .refine(
        (blobs) =>
          new Set(blobs.map(({ kind, digest }) => `${kind}:${digest}`)).size ===
          blobs.length,
      ),
  })
  .strict();
const candidateCreationClaimSchema = candidateCreationClaimInputSchema
  .extend({
    apiVersion: z.literal("factory.candidate-creation-claim/v1"),
  })
  .strict();
const candidateReceiptLocatorSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-receipt-locator/v1"),
    id: intakeContractPrimitives.opaqueIdSchema,
    version: intakeContractPrimitives.versionSchema,
    jobId: intakeContractPrimitives.opaqueIdSchema,
    creationReceiptDigest: intakeContractPrimitives.sha256DigestSchema,
  })
  .strict();

const candidateTransitionClaimSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-transition-claim/v1"),
    jobId: intakeContractPrimitives.opaqueIdSchema,
    sequence: z.literal(2),
    creationReceiptDigest: intakeContractPrimitives.sha256DigestSchema,
    expectedCandidateDigest: intakeContractPrimitives.sha256DigestSchema,
    candidateDigest: intakeContractPrimitives.sha256DigestSchema,
    receiptDigest: intakeContractPrimitives.sha256DigestSchema,
    evidenceDigest: intakeContractPrimitives.sha256DigestSchema.optional(),
  })
  .strict();

type CandidateTransitionClaimV1 = z.infer<
  typeof candidateTransitionClaimSchema
>;

export type StoredRecordRef = z.infer<typeof storedRecordRefSchema>;
export type StoredBlobRef = {
  readonly kind: "snapshot" | "evidence";
  readonly digest: Sha256Digest;
};

export type CandidateCreationClaimV1 = z.infer<
  typeof candidateCreationClaimInputSchema
>;

export interface CandidateTransitionCommitV1 {
  readonly jobId: string;
  readonly expectedCreationReceipt: StoredRecordRef;
  readonly expectedCandidate: StoredRecordRef;
  readonly candidate: CandidateCapabilityV1;
  readonly receipt: IntakeReceiptV1;
  readonly evidenceBytes?: Uint8Array;
}

export interface CandidateTransitionCommitResultV1 {
  readonly candidate: StoredRecordRef;
  readonly receipt: StoredRecordRef;
  readonly evidence?: StoredBlobRef;
}

const candidateTransitionCommitters = new WeakMap<
  ExternalIntakeStore,
  (input: CandidateTransitionCommitV1) => CandidateTransitionCommitResultV1
>();
const candidateCreationClaimers = new WeakMap<
  ExternalIntakeStore,
  (input: CandidateCreationClaimV1) => void
>();
const candidateCreationCompleters = new WeakMap<
  ExternalIntakeStore,
  (input: CandidateCreationClaimV1) => void
>();
const candidateSnapshotBlobReaders = new WeakMap<
  ExternalIntakeStore,
  (digest: Sha256Digest) => Uint8Array
>();

function buffersEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return left.every((byte, index) => byte === right[index]);
}

export class ExternalIntakeStore {
  readonly #root: string;

  constructor(root: string) {
    if (root.length === 0) {
      throw new TypeError("External Intake store root is required.");
    }
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const rootStat = lstatSync(root);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw new TypeError(
        "External Intake store root must be a real directory.",
      );
    }
    this.#root = realpathSync.native(root);
    candidateCreationClaimers.set(this, (input) =>
      this.#claimCandidateCreation(input),
    );
    candidateCreationCompleters.set(this, (input) =>
      this.#completeCandidateCreation(input),
    );
    candidateTransitionCommitters.set(this, (input) =>
      this.#commitCandidateTransition(input),
    );
    candidateSnapshotBlobReaders.set(this, (digest) =>
      this.#readVerifiedCandidateSnapshotBlob(digest),
    );
  }

  putRecord(
    kind: Exclude<IntakeRecordKind, "receipt">,
    record: IntakeRecordV1,
  ): StoredRecordRef {
    const parsedKind = recordKindSchema.exclude(["receipt"]).parse(kind);
    if (parsedKind === "acquisition") {
      const parsed = parseExternalSourceAcquisition(record);
      this.#validateAcquisitionParents(parsed);
      return this.#putRecord(parsedKind, parsed);
    }
    if (parsedKind === "candidate") {
      const parsed = parseCandidateCapability(record);
      if (parsed.status !== "quarantined") {
        throw new Error(
          "Terminal Candidate records require the atomic transition primitive.",
        );
      }
      return this.#putRecord(parsedKind, parsed);
    }
    const parsed = parseIntakeRecord(parsedKind, record);
    return this.#putRecord(parsedKind, parsed);
  }

  putBytes(kind: "snapshot" | "evidence", bytes: Uint8Array): StoredBlobRef {
    const parsedKind = blobKindSchema.parse(kind);
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError(
        "External Intake blobs must be raw Uint8Array bytes.",
      );
    }
    const digest = digestBytes(bytes);
    const hexadecimal = digest.slice("sha256:".length);
    const path = this.#managedPath(["blobs", parsedKind, `${hexadecimal}.bin`]);
    this.#writeExclusiveVerified(path, bytes, digest, false);
    return { kind: parsedKind, digest };
  }

  getRecord(ref: StoredRecordRef): IntakeRecordV1 {
    const parsedRef = storedRecordRefSchema.parse(ref);
    const hexadecimal = parsedRef.digest.slice("sha256:".length);
    const path = this.#managedPath([
      "records",
      parsedRef.kind,
      `${hexadecimal}.json`,
    ]);
    const bytes = this.#readRegularFile(path);
    if (digestBytes(bytes) !== parsedRef.digest) {
      throw new Error(
        "Stored record bytes do not match their immutable digest.",
      );
    }
    const input = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
    const parsed = parseIntakeRecord(parsedRef.kind, input);
    const canonicalBytes = new TextEncoder().encode(canonicalJson(parsed));
    if (!buffersEqual(bytes, canonicalBytes)) {
      throw new Error("Stored record is not canonical JSON.");
    }
    return parsed;
  }

  appendReceipt(jobId: string, receipt: IntakeReceiptV1): StoredRecordRef {
    const parsedJobId = intakeContractPrimitives.opaqueIdSchema.parse(jobId);
    const parsed = parseIntakeReceipt(receipt);
    if (parsed.jobId !== parsedJobId) {
      throw new Error("Receipt job ID does not match the append target.");
    }
    if (parsed.sequence > 1) {
      const creationIndex = this.#readReceiptIndex(parsedJobId, 1);
      if (creationIndex !== null) {
        let creationReceipt: IntakeReceiptV1;
        try {
          creationReceipt = parseIntakeReceipt(
            this.getRecord({
              kind: "receipt",
              digest: creationIndex.receiptDigest,
            }),
          );
        } catch {
          throw new Error(
            `Indexed backing receipt ${parsedJobId}#1 is missing or invalid.`,
          );
        }
        if (creationReceipt.code === "candidate-quarantined") {
          throw new Error(
            "Candidate lifecycle receipts require the atomic transition primitive.",
          );
        }
      }
    }
    if (parsed.sequence > 1) {
      const previous = this.#readReceiptIndex(parsedJobId, parsed.sequence - 1);
      if (previous === null) {
        throw new Error(
          `Receipt sequence ${parsed.sequence} is out of order for ${parsedJobId}.`,
        );
      }
      let previousReceipt: IntakeReceiptV1;
      try {
        previousReceipt = parseIntakeReceipt(
          this.getRecord({
            kind: "receipt",
            digest: previous.receiptDigest,
          }),
        );
      } catch {
        throw new Error(
          `Indexed backing receipt ${parsedJobId}#${previous.sequence} is missing or invalid.`,
        );
      }
      if (
        previousReceipt.jobId !== parsedJobId ||
        previousReceipt.sequence !== previous.sequence ||
        canonicalRecordDigest(previousReceipt) !== previous.receiptDigest
      ) {
        throw new Error(
          `Indexed backing receipt ${parsedJobId}#${previous.sequence} is inconsistent.`,
        );
      }
      if (!parsed.parentDigests.includes(previous.receiptDigest)) {
        throw new Error(
          `Receipt sequence ${parsed.sequence} must include the previous receipt digest.`,
        );
      }
    }

    const recordRef = this.#putRecord("receipt", parsed);
    const receiptDigest = recordRef.digest;
    const index: ReceiptIndexV1 = {
      apiVersion: "factory.external-intake-receipt-index/v1",
      createdAt: parsed.createdAt,
      producerVersion: parsed.producerVersion,
      parentDigests: [receiptDigest],
      jobId: parsedJobId,
      sequence: parsed.sequence,
      receiptDigest,
    };
    const indexBytes = new TextEncoder().encode(canonicalJson(index));
    const indexPath = this.#managedPath([
      "jobs",
      parsedJobId,
      "receipts",
      `${parsed.sequence}.json`,
    ]);
    this.#writeExclusiveVerified(
      indexPath,
      indexBytes,
      digestBytes(indexBytes),
      true,
      `Receipt sequence conflict for ${parsedJobId}#${parsed.sequence}.`,
    );
    return recordRef;
  }

  #claimCandidateCreation(input: CandidateCreationClaimV1): void {
    const parsed = candidateCreationClaimInputSchema.parse(input);
    const identity = `${parsed.id}@${parsed.version}`;
    const expectedJobId = `candidate-${digestBytes(
      new TextEncoder().encode(identity),
    ).slice(7, 39)}`;
    if (parsed.jobId !== expectedJobId) {
      throw new Error(
        "Candidate creation claim does not match its exact identity.",
      );
    }
    const claim = candidateCreationClaimSchema.parse({
      apiVersion: "factory.candidate-creation-claim/v1",
      ...parsed,
      blobs: [...parsed.blobs].sort((left, right) =>
        `${left.kind}:${left.digest}`.localeCompare(
          `${right.kind}:${right.digest}`,
        ),
      ),
    });
    const bytes = new TextEncoder().encode(canonicalJson(claim));
    this.#writeExclusiveVerified(
      this.#managedPath(["jobs", parsed.jobId, "receipts", "1.claim.json"]),
      bytes,
      digestBytes(bytes),
      true,
      `Candidate creation claim conflict for ${identity}.`,
    );
  }

  #completeCandidateCreation(input: CandidateCreationClaimV1): void {
    const parsed = candidateCreationClaimInputSchema.parse(input);
    this.#claimCandidateCreation(parsed);
    const candidateRef: StoredRecordRef = {
      kind: "candidate",
      digest: parsed.candidateDigest,
    };
    const receiptRef: StoredRecordRef = {
      kind: "receipt",
      digest: parsed.receiptDigest,
    };
    const candidate = parseCandidateCapability(this.getRecord(candidateRef));
    const receipt = parseIntakeReceipt(this.getRecord(receiptRef));
    const indexed = this.#readReceiptIndex(parsed.jobId, 1);
    for (const blob of parsed.blobs) {
      let bytes: Uint8Array;
      try {
        bytes = this.#readRegularFile(
          this.#managedPath([
            "blobs",
            blob.kind,
            `${blob.digest.slice("sha256:".length)}.bin`,
          ]),
        );
      } catch {
        throw new Error("Candidate creation claimed blob is absent.");
      }
      if (digestBytes(bytes) !== blob.digest) {
        throw new Error("Candidate creation claimed blob is invalid.");
      }
    }
    if (
      candidate.id !== parsed.id ||
      candidate.version !== parsed.version ||
      candidate.status !== "quarantined" ||
      receipt.jobId !== parsed.jobId ||
      receipt.sequence !== 1 ||
      receipt.status !== "candidate-ready" ||
      receipt.code !== "candidate-quarantined" ||
      canonicalJson(receipt.parentDigests) !==
        canonicalJson([parsed.candidateDigest]) ||
      receipt.recordDigests[0] !== parsed.candidateDigest ||
      indexed?.receiptDigest !== parsed.receiptDigest
    ) {
      throw new Error("Candidate creation completion is invalid.");
    }
    const locator = candidateReceiptLocatorSchema.parse({
      apiVersion: "factory.candidate-receipt-locator/v1",
      id: parsed.id,
      version: parsed.version,
      jobId: parsed.jobId,
      creationReceiptDigest: parsed.receiptDigest,
    });
    const locatorBytes = new TextEncoder().encode(canonicalJson(locator));
    const identityDigest = digestBytes(
      new TextEncoder().encode(`${parsed.id}@${parsed.version}`),
    );
    this.#writeExclusiveVerified(
      this.#managedPath([
        "candidates",
        `${identityDigest.slice("sha256:".length)}.json`,
      ]),
      locatorBytes,
      digestBytes(locatorBytes),
      true,
      `Candidate locator conflict for ${parsed.id}@${parsed.version}.`,
    );
  }

  #commitCandidateTransition(
    input: CandidateTransitionCommitV1,
  ): CandidateTransitionCommitResultV1 {
    const jobId = intakeContractPrimitives.opaqueIdSchema.parse(input.jobId);
    const expectedCreationReceipt = storedRecordRefSchema.parse(
      input.expectedCreationReceipt,
    );
    const expectedCandidate = storedRecordRefSchema.parse(
      input.expectedCandidate,
    );
    if (
      expectedCreationReceipt.kind !== "receipt" ||
      expectedCandidate.kind !== "candidate"
    ) {
      throw new TypeError(
        "Candidate transition expected references use invalid kinds.",
      );
    }
    const creationIndex = this.#readReceiptIndex(jobId, 1);
    if (
      creationIndex === null ||
      creationIndex.receiptDigest !== expectedCreationReceipt.digest
    ) {
      throw new Error(
        "Candidate transition does not match the indexed creation receipt.",
      );
    }
    const creationReceipt = parseIntakeReceipt(
      this.getRecord(expectedCreationReceipt),
    );
    const creationCandidate = parseCandidateCapability(
      this.getRecord(expectedCandidate),
    );
    const verificationStateDigest = creationReceipt.recordDigests[1];
    if (
      creationReceipt.jobId !== jobId ||
      creationReceipt.sequence !== 1 ||
      creationReceipt.status !== "candidate-ready" ||
      creationReceipt.code !== "candidate-quarantined" ||
      creationReceipt.parentDigests.length !== 1 ||
      creationReceipt.parentDigests[0] !== expectedCandidate.digest ||
      creationReceipt.recordDigests[0] !== expectedCandidate.digest ||
      verificationStateDigest === undefined ||
      creationCandidate.status !== "quarantined" ||
      canonicalRecordDigest(creationCandidate) !== expectedCandidate.digest
    ) {
      throw new Error("Candidate transition creation state is invalid.");
    }
    const candidate = parseCandidateCapability(input.candidate);
    const receipt = parseIntakeReceipt(input.receipt);
    const candidateRef: StoredRecordRef = {
      kind: "candidate",
      digest: canonicalRecordDigest(candidate),
    };
    const receiptRef: StoredRecordRef = {
      kind: "receipt",
      digest: canonicalRecordDigest(receipt),
    };
    const evidence =
      input.evidenceBytes === undefined
        ? undefined
        : {
            kind: "evidence" as const,
            digest: digestBytes(input.evidenceBytes),
          };
    const expectedStatus = candidate.status;
    const terminalStatus =
      expectedStatus === "blocked" || expectedStatus === "rejected";
    const conformanceStatus = expectedStatus === "conformance-passed";
    const expectedParents = terminalStatus
      ? [...creationCandidate.parentDigests, expectedCandidate.digest]
      : conformanceStatus && candidate.conformanceResultDigest !== undefined
        ? [
            ...creationCandidate.parentDigests,
            expectedCandidate.digest,
            candidate.conformanceResultDigest,
          ]
        : [];
    const expectedCandidateRecord = parseCandidateCapability({
      ...creationCandidate,
      parentDigests: [...new Set(expectedParents)],
      status: expectedStatus,
      ...(conformanceStatus
        ? { conformanceResultDigest: candidate.conformanceResultDigest }
        : {}),
    });
    const expectedReceiptStatus = terminalStatus
      ? expectedStatus
      : "candidate-ready";
    const expectedReceiptCode = terminalStatus
      ? `candidate-${expectedStatus}`
      : "candidate-conformance-passed";
    const expectedRecordDigests = conformanceStatus
      ? [
          candidateRef.digest,
          candidate.conformanceResultDigest,
          verificationStateDigest,
        ]
      : [candidateRef.digest, verificationStateDigest];
    if (
      (!terminalStatus && !conformanceStatus) ||
      canonicalJson(candidate) !== canonicalJson(expectedCandidateRecord) ||
      receipt.jobId !== jobId ||
      receipt.sequence !== 2 ||
      receipt.createdAt !== creationCandidate.createdAt ||
      receipt.producerVersion !== creationCandidate.producerVersion ||
      receipt.status !== expectedReceiptStatus ||
      receipt.code !== expectedReceiptCode ||
      canonicalJson(receipt.parentDigests) !==
        canonicalJson([expectedCreationReceipt.digest, candidateRef.digest]) ||
      canonicalJson(receipt.recordDigests) !==
        canonicalJson(expectedRecordDigests) ||
      (conformanceStatus &&
        (evidence === undefined ||
          evidence.digest !== candidate.conformanceResultDigest)) ||
      (terminalStatus && evidence !== undefined)
    ) {
      throw new Error("Candidate transition binding is invalid.");
    }
    const existingIndex = this.#readReceiptIndex(jobId, 2);
    if (existingIndex !== null) {
      if (existingIndex.receiptDigest !== receiptRef.digest) {
        throw new Error(`Candidate terminal sequence conflict for ${jobId}.`);
      }
      this.#verifyCandidateTransitionRecords(
        candidateRef,
        receiptRef,
        evidence,
      );
      return {
        candidate: candidateRef,
        receipt: receiptRef,
        ...(evidence === undefined ? {} : { evidence }),
      };
    }
    const claim: CandidateTransitionClaimV1 = {
      apiVersion: "factory.candidate-transition-claim/v1",
      jobId,
      sequence: 2,
      creationReceiptDigest: expectedCreationReceipt.digest,
      expectedCandidateDigest: expectedCandidate.digest,
      candidateDigest: candidateRef.digest,
      receiptDigest: receiptRef.digest,
      ...(evidence === undefined ? {} : { evidenceDigest: evidence.digest }),
    };
    const claimBytes = new TextEncoder().encode(canonicalJson(claim));
    this.#writeExclusiveVerified(
      this.#managedPath(["jobs", jobId, "receipts", "2.claim.json"]),
      claimBytes,
      digestBytes(claimBytes),
      true,
      `Candidate terminal sequence conflict for ${jobId}.`,
    );
    const storedEvidence =
      input.evidenceBytes === undefined
        ? undefined
        : this.putBytes("evidence", input.evidenceBytes);
    const storedCandidate = this.#putRecord("candidate", candidate);
    const storedReceipt = this.#putRecord("receipt", receipt);
    const index: ReceiptIndexV1 = {
      apiVersion: "factory.external-intake-receipt-index/v1",
      createdAt: receipt.createdAt,
      producerVersion: receipt.producerVersion,
      parentDigests: [storedReceipt.digest],
      jobId,
      sequence: 2,
      receiptDigest: storedReceipt.digest,
    };
    const indexBytes = new TextEncoder().encode(canonicalJson(index));
    this.#writeExclusiveVerified(
      this.#managedPath(["jobs", jobId, "receipts", "2.json"]),
      indexBytes,
      digestBytes(indexBytes),
      true,
      `Candidate terminal sequence conflict for ${jobId}.`,
    );
    this.#verifyCandidateTransitionRecords(
      storedCandidate,
      storedReceipt,
      storedEvidence,
    );
    return {
      candidate: storedCandidate,
      receipt: storedReceipt,
      ...(storedEvidence === undefined ? {} : { evidence: storedEvidence }),
    };
  }

  #verifyCandidateTransitionRecords(
    candidate: StoredRecordRef,
    receipt: StoredRecordRef,
    evidence: StoredBlobRef | undefined,
  ): void {
    parseCandidateCapability(this.getRecord(candidate));
    parseIntakeReceipt(this.getRecord(receipt));
    if (evidence !== undefined) {
      const path = this.#managedPath([
        "blobs",
        "evidence",
        `${evidence.digest.slice("sha256:".length)}.bin`,
      ]);
      const bytes = this.#readRegularFile(path);
      if (digestBytes(bytes) !== evidence.digest) {
        throw new Error("Candidate transition evidence is invalid.");
      }
    }
  }

  #readReceiptIndex(jobId: string, sequence: number): ReceiptIndexV1 | null {
    const path = this.#managedPath([
      "jobs",
      jobId,
      "receipts",
      `${sequence}.json`,
    ]);
    let bytes: Uint8Array;
    try {
      bytes = this.#readRegularFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = receiptIndexSchema.parse(JSON.parse(decoded) as unknown);
    if (
      parsed.jobId !== jobId ||
      parsed.sequence !== sequence ||
      canonicalJson(parsed) !== decoded
    ) {
      throw new Error("Receipt sequence index is not canonical or consistent.");
    }
    return parsed;
  }

  #validateAcquisitionParents(acquisition: ExternalSourceAcquisitionV1): void {
    const expectedParents = [
      acquisition.sourceRequestDigest,
      acquisition.snapshot.recordDigest,
    ];
    if (
      acquisition.parentDigests.length !== expectedParents.length ||
      expectedParents.some(
        (digest) => !acquisition.parentDigests.includes(digest),
      )
    ) {
      throw new Error(
        "Acquisition must declare exactly its request and snapshot parents.",
      );
    }

    const request = this.#readAcquisitionParent(
      "request",
      acquisition.sourceRequestDigest,
    );
    const snapshot = this.#readAcquisitionParent(
      "snapshot",
      acquisition.snapshot.recordDigest,
    );

    if (
      request.apiVersion !== "factory.external-intake-request/v1" ||
      snapshot.apiVersion !== "factory.external-source-snapshot/v1"
    ) {
      throw new Error(
        "Acquisition parents must use the request and snapshot record kinds.",
      );
    }
    if (
      request.source.canonicalRepositoryUrl !==
        acquisition.source.canonicalRepositoryUrl ||
      snapshot.repositoryUrl !== acquisition.source.canonicalRepositoryUrl
    ) {
      throw new Error(
        "Acquisition repository URL does not match its request and snapshot parents.",
      );
    }
    if (
      request.source.requestedRef !== acquisition.source.requestedRef ||
      snapshot.requestedRef !== acquisition.source.requestedRef
    ) {
      throw new Error(
        "Acquisition requested ref does not match its request and snapshot parents.",
      );
    }
    if (
      snapshot.resolvedCommit !== acquisition.source.resolvedCommit ||
      (/^[a-f0-9]{40}$/u.test(request.source.requestedRef) &&
        request.source.requestedRef !== acquisition.source.resolvedCommit) ||
      (request.source.expectedCommit !== undefined &&
        request.source.expectedCommit !== acquisition.source.resolvedCommit)
    ) {
      throw new Error(
        "Acquisition resolved commit does not match its request and snapshot parents.",
      );
    }
    if (
      snapshot.archiveDigest !== acquisition.snapshot.archiveDigest ||
      snapshot.treeDigest !== acquisition.snapshot.treeDigest
    ) {
      throw new Error(
        "Acquisition archive or tree digest does not match its snapshot parent.",
      );
    }
    if (!snapshot.parentDigests.includes(acquisition.sourceRequestDigest)) {
      throw new Error(
        "Acquisition snapshot parent is not linked to its request parent.",
      );
    }
  }

  #readAcquisitionParent(
    kind: "request" | "snapshot",
    digest: Sha256Digest,
  ): IntakeRecordV1 {
    try {
      return this.getRecord({ kind, digest });
    } catch {
      throw new Error(
        `Acquisition ${kind} parent is absent, tampered, or stored under the wrong kind.`,
      );
    }
  }

  #putRecord(kind: IntakeRecordKind, record: IntakeRecordV1): StoredRecordRef {
    const digest = canonicalRecordDigest(record);
    const hexadecimal = digest.slice("sha256:".length);
    const path = this.#managedPath(["records", kind, `${hexadecimal}.json`]);
    const bytes = new TextEncoder().encode(canonicalJson(record));
    this.#writeExclusiveVerified(path, bytes, digest, true);
    return { kind, digest };
  }

  #managedPath(segments: readonly string[]): string {
    const path = resolve(this.#root, ...segments);
    const fromRoot = relative(this.#root, path);
    if (
      fromRoot === "" ||
      fromRoot === ".." ||
      fromRoot.startsWith(`..${sep}`) ||
      resolve(this.#root, fromRoot) !== path
    ) {
      throw new Error(
        "External Intake path escaped the configured quarantine root.",
      );
    }
    this.#ensureDirectory(dirname(path));
    return path;
  }

  #ensureDirectory(directory: string): void {
    const fromRoot = relative(this.#root, directory);
    const segments = fromRoot === "" ? [] : fromRoot.split(sep);
    let current = this.#root;
    for (const segment of segments) {
      current = resolve(current, segment);
      try {
        const stat = lstatSync(current);
        if (stat.isSymbolicLink() || !stat.isDirectory()) {
          throw new Error(
            `Managed quarantine directory is a symbolic link or special file: ${segment}.`,
          );
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        mkdirSync(current, { mode: 0o700 });
        const created = lstatSync(current);
        if (created.isSymbolicLink() || !created.isDirectory()) {
          throw new Error(
            "Managed quarantine directory creation was not safe.",
          );
        }
      }
    }
  }

  #readRegularFile(path: string): Uint8Array {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(
        "Managed quarantine entry is a symbolic link or special file.",
      );
    }
    return readFileSync(path);
  }

  #readVerifiedCandidateSnapshotBlob(digest: Sha256Digest): Uint8Array {
    if (!/^sha256:[a-f0-9]{64}$/u.test(digest)) {
      throw new TypeError("Candidate snapshot digest is invalid.");
    }
    const snapshotDirectory = resolve(this.#root, "blobs", "snapshot");
    for (const directory of [resolve(this.#root, "blobs"), snapshotDirectory]) {
      const stat = lstatSync(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(
          "Candidate snapshot parent must be a real managed directory.",
        );
      }
    }
    const path = resolve(
      snapshotDirectory,
      `${digest.slice("sha256:".length)}.bin`,
    );
    const fromRoot = relative(snapshotDirectory, path);
    if (
      fromRoot === "" ||
      fromRoot === ".." ||
      fromRoot.startsWith(`..${sep}`) ||
      resolve(snapshotDirectory, fromRoot) !== path
    ) {
      throw new Error("Candidate snapshot path escaped its fixed domain.");
    }

    const descriptor = openSync(path, "r");
    try {
      const before = fstatSync(descriptor);
      if (
        !before.isFile() ||
        !Number.isSafeInteger(before.size) ||
        before.size < 0 ||
        before.size > DEFAULT_SNAPSHOT_LIMITS.maxFileBytes
      ) {
        throw new Error("Candidate snapshot must be a bounded regular file.");
      }
      const bytes = Buffer.alloc(before.size);
      let offset = 0;
      while (offset < bytes.byteLength) {
        const count = readSync(
          descriptor,
          bytes,
          offset,
          bytes.byteLength - offset,
          null,
        );
        if (count === 0) {
          throw new Error("Candidate snapshot ended before its verified size.");
        }
        offset += count;
      }
      const extra = Buffer.alloc(1);
      if (readSync(descriptor, extra, 0, 1, null) !== 0) {
        throw new Error("Candidate snapshot grew during verified reading.");
      }
      const after = fstatSync(descriptor);
      if (
        !after.isFile() ||
        after.size !== before.size ||
        after.dev !== before.dev ||
        after.ino !== before.ino ||
        digestBytes(bytes) !== digest
      ) {
        throw new Error(
          "Candidate snapshot descriptor or byte digest changed.",
        );
      }
      return new Uint8Array(bytes);
    } finally {
      closeSync(descriptor);
    }
  }

  #writeExclusiveVerified(
    path: string,
    bytes: Uint8Array,
    digest: Sha256Digest,
    canonicalRecord: boolean,
    conflictMessage = "Existing immutable quarantine entry differs from requested bytes.",
  ): void {
    try {
      writeFileSync(path, bytes, {
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      const existing = this.#readRegularFile(path);
      if (!buffersEqual(existing, bytes) || digestBytes(existing) !== digest) {
        throw new Error(conflictMessage);
      }
      return;
    }

    const stored = this.#readRegularFile(path);
    if (!buffersEqual(stored, bytes) || digestBytes(stored) !== digest) {
      throw new Error("Quarantine write verification failed.");
    }
    if (canonicalRecord) {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(stored);
      if (canonicalJson(JSON.parse(decoded) as unknown) !== decoded) {
        throw new Error("Quarantine record write was not canonical JSON.");
      }
    }
  }
}

export function claimCandidateCreation(
  store: ExternalIntakeStore,
  input: CandidateCreationClaimV1,
): void {
  const claim = candidateCreationClaimers.get(store);
  if (claim === undefined) {
    throw new TypeError(
      "Candidate creation claims require an External Intake store instance.",
    );
  }
  claim(input);
}

export function completeCandidateCreation(
  store: ExternalIntakeStore,
  input: CandidateCreationClaimV1,
): void {
  const complete = candidateCreationCompleters.get(store);
  if (complete === undefined) {
    throw new TypeError(
      "Candidate creation completion requires an External Intake store instance.",
    );
  }
  complete(input);
}

export function commitCandidateTransition(
  store: ExternalIntakeStore,
  input: CandidateTransitionCommitV1,
): CandidateTransitionCommitResultV1 {
  const commit = candidateTransitionCommitters.get(store);
  if (commit === undefined) {
    throw new TypeError(
      "Candidate transitions require an External Intake store instance.",
    );
  }
  return commit(input);
}

export function readVerifiedCandidateSnapshotBlob(
  store: ExternalIntakeStore,
  digest: Sha256Digest,
): Uint8Array {
  const read = candidateSnapshotBlobReaders.get(store);
  if (read === undefined) {
    throw new TypeError(
      "Candidate snapshot reads require an External Intake store instance.",
    );
  }
  return read(digest);
}
