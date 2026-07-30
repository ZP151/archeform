import { z } from "zod";

import {
  canonicalJson,
  canonicalRecordDigest,
  digestBytes,
  type Sha256Digest,
} from "./canonical.js";
import {
  parseCandidateCapability,
  parseEvidenceBundle,
  parseExternalSourceAcquisition,
  parseIntakeReceipt,
  parseSourceSnapshot,
  type CandidateCapabilityV1,
  type IntakeReceiptV1,
} from "./contracts.js";
import type { CompletedEvidenceRefV1 } from "./jobs.js";
import { PINNED_MODULE_INVENTORY_IDENTITY } from "./module-inventory.js";
import { SCAN_KIND_ORDER } from "./scans.js";
import { ExternalIntakeStore, type StoredRecordRef } from "./store.js";

const encoder = new TextEncoder();
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const OPAQUE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;
const DOTTED_KEY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;
const FIELD = /^[a-z][a-zA-Z0-9]{0,63}$/u;
const SAFE_PATH =
  /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\)[A-Za-z0-9_.@/-]{1,512}$/u;
const SAFE_FIXTURE_TEXT = /^[A-Za-z0-9 _.,:@/-]{0,128}$/u;
const SENSITIVE_VALUE =
  /(?:https?:\/\/|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|AKIA[A-Z0-9]|private[ -]?key|password|secret|\b(?:eval|require|import|export|function|class|process|fetch)\b|[{};`]|\r|\n)/iu;

const scalarSchema = z
  .object({ type: z.enum(["string", "number", "integer", "boolean"]) })
  .strict();
const objectSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(scalarSchema),
    required: z.array(z.string().regex(FIELD)).max(64),
    additionalProperties: z.literal(false),
  })
  .strict()
  .superRefine((schema, context) => {
    const propertyKeys = Object.keys(schema.properties);
    if (
      propertyKeys.length === 0 ||
      propertyKeys.length > 64 ||
      propertyKeys.some((key) => !FIELD.test(key)) ||
      new Set(schema.required).size !== schema.required.length ||
      schema.required.some((key) => !propertyKeys.includes(key))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate schemas must use bounded declared fields.",
      });
    }
  });

const safeFixtureScalar = z
  .union([z.string().max(128), z.number().finite(), z.boolean(), z.null()])
  .superRefine((value, context) => {
    if (
      typeof value === "string" &&
      (!SAFE_FIXTURE_TEXT.test(value) || SENSITIVE_VALUE.test(value))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate fixtures may contain safe declarative data only.",
      });
    }
  });
const safeFixtureObject = z
  .record(safeFixtureScalar)
  .superRefine((value, context) => {
    const keys = Object.keys(value);
    if (
      keys.length > 64 ||
      keys.some((key) => !FIELD.test(key) || key === "constructor")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate fixtures may contain safe declarative data only.",
      });
    }
  });

const manifestSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-manifest/v1"),
    id: z.string().regex(OPAQUE_ID),
    version: z.string().regex(VERSION),
    proposedFactoryKey: z.string().regex(DOTTED_KEY),
    inputSchema: objectSchema,
    outputSchema: objectSchema,
    effects: z
      .array(z.string().regex(DOTTED_KEY))
      .max(64)
      .refine((items) => new Set(items).size === items.length),
  })
  .strict();
const fixtureSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-fixture/v1"),
    id: z.string().regex(OPAQUE_ID),
    input: safeFixtureObject,
    expectedOutput: safeFixtureObject,
  })
  .strict();
const adapterSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-adapter/v1"),
    id: z.string().regex(OPAQUE_ID),
    projection: z.record(z.string().regex(FIELD)),
    effects: z
      .array(z.string().regex(DOTTED_KEY))
      .max(64)
      .refine((items) => new Set(items).size === items.length),
  })
  .strict()
  .superRefine((adapter, context) => {
    const outputFields = Object.keys(adapter.projection);
    if (
      outputFields.length === 0 ||
      outputFields.length > 64 ||
      outputFields.some(
        (field) =>
          !FIELD.test(field) ||
          field === "constructor" ||
          adapter.projection[field] === "constructor",
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate adapter projection paths must be safe fields.",
      });
    }
  });
const conformanceCaseSchema = z
  .object({
    id: z.string().regex(OPAQUE_ID),
    expectation: z.enum(["accept-fixture", "reject-input"]),
    input: safeFixtureObject.optional(),
  })
  .strict()
  .superRefine((testCase, context) => {
    if (
      (testCase.expectation === "accept-fixture" &&
        testCase.input !== undefined) ||
      (testCase.expectation === "reject-input" && testCase.input === undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate conformance cases must declare exact inputs.",
      });
    }
  });
const conformancePlanSchema = z
  .object({
    apiVersion: z.literal("factory.candidate-conformance-plan/v1"),
    cases: z
      .array(conformanceCaseSchema)
      .min(2)
      .max(64)
      .refine(
        (items) => new Set(items.map(({ id }) => id)).size === items.length,
      )
      .refine(
        (items) =>
          items.some(({ expectation }) => expectation === "accept-fixture") &&
          items.some(({ expectation }) => expectation === "reject-input"),
      ),
  })
  .strict();
const artifactsSchema = z
  .object({
    manifest: manifestSchema,
    fixture: fixtureSchema,
    adapter: adapterSchema,
    conformancePlan: conformancePlanSchema,
  })
  .strict();

export type CandidateObjectSchemaV1 = z.infer<typeof objectSchema>;
export type CandidateManifestV1 = z.infer<typeof manifestSchema>;
export type CandidateFixtureV1 = z.infer<typeof fixtureSchema>;
export type CandidateAdapterV1 = z.infer<typeof adapterSchema>;
export type CandidateConformancePlanV1 = z.infer<typeof conformancePlanSchema>;
export type CandidateArtifactsV1 = z.infer<typeof artifactsSchema>;

export interface CandidateProposalV1 {
  readonly apiVersion: "factory.candidate-proposal/v1";
  readonly createdAt: string;
  readonly producerVersion: string;
  readonly id: string;
  readonly version: string;
  readonly snapshot: StoredRecordRef;
  readonly acquisition: StoredRecordRef;
  readonly completedEvidence: CompletedEvidenceRefV1;
  readonly proposedFactoryKey: string;
  readonly proposedClassification:
    "dependency" | "source-fragment" | "provider-adapter";
  readonly selectedModules: CandidateCapabilityV1["selectedModules"];
  readonly artifacts: CandidateArtifactsV1;
}

export interface StoredCandidateRefV1 extends StoredRecordRef {
  readonly kind: "candidate";
  readonly id: string;
  readonly version: string;
  readonly status: CandidateCapabilityV1["status"];
}

export interface CandidateQueryV1 {
  readonly id?: string;
  readonly status?: CandidateCapabilityV1["status"];
  readonly proposedFactoryKey?: string;
}

export interface CandidateSummaryV1 {
  readonly id: string;
  readonly version: string;
  readonly status: CandidateCapabilityV1["status"];
  readonly proposedFactoryKey: string;
  readonly candidateDigest: Sha256Digest;
  readonly evidenceDigest: Sha256Digest;
}

export interface CandidateStatusReceiptV1 {
  readonly apiVersion: "factory.candidate-status-receipt/v1";
  readonly id: string;
  readonly version: string;
  readonly from: CandidateCapabilityV1["status"];
  readonly to: Exclude<CandidateCapabilityV1["status"], "quarantined">;
  readonly createdAt: string;
  readonly producerVersion: string;
  readonly parentCandidateDigest: Sha256Digest;
  readonly conformanceResultDigest?: Sha256Digest;
}

export interface CandidateVerificationResultV1 {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly candidate?: CandidateCapabilityV1;
}

export interface CandidateConformanceBundleV1 {
  readonly candidate: CandidateCapabilityV1;
  readonly artifacts: CandidateArtifactsV1;
}

export interface CandidateRegistryV1 {
  create(input: CandidateProposalV1): StoredCandidateRefV1;
  get(id: string, version: string): CandidateCapabilityV1;
  list(filter: CandidateQueryV1): readonly CandidateSummaryV1[];
  appendStatus(input: CandidateStatusReceiptV1): StoredRecordRef;
  verify(ref: StoredCandidateRefV1): CandidateVerificationResultV1;
}

interface CandidateEntry {
  readonly id: string;
  readonly version: string;
  latest: StoredCandidateRefV1;
  readonly history: StoredCandidateRefV1[];
  readonly artifacts: CandidateArtifactsV1;
  readonly jobId: string;
  readonly receipts: StoredRecordRef[];
}

function exactRef(ref: StoredRecordRef): StoredRecordRef {
  return { kind: ref.kind, digest: ref.digest };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function assertExactKeys(
  input: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
  message = "Input must be strict.",
): asserts input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(message);
  }
  const keys = Object.keys(input);
  if (
    required.some((key) => !keys.includes(key)) ||
    keys.some((key) => !required.includes(key) && !optional.includes(key))
  ) {
    throw new TypeError(message);
  }
}

function assertReference(
  ref: StoredRecordRef,
  kind: StoredRecordRef["kind"],
  message: string,
): void {
  assertExactKeys(ref, ["kind", "digest"], [], message);
  if (ref.kind !== kind || !DIGEST.test(ref.digest))
    throw new TypeError(message);
}

function artifactBytes(artifact: unknown): Uint8Array {
  return encoder.encode(canonicalJson(artifact));
}

function inventoryDigest(
  snapshotDigest: Sha256Digest,
  treeDigest: Sha256Digest,
  completed: CompletedEvidenceRefV1,
): Sha256Digest {
  return digestBytes(
    artifactBytes({
      apiVersion: "factory.external-module-inventory/v1",
      snapshotDigest,
      treeDigest,
      ...PINNED_MODULE_INVENTORY_IDENTITY,
      modules: completed.inventory.modules,
    }),
  );
}

function assertCompletedEvidence(
  proposal: CandidateProposalV1,
  store: ExternalIntakeStore,
): void {
  const completed = proposal.completedEvidence;
  if (completed.status !== "evidenced") {
    throw new Error("Candidate requires accepted completed evidence.");
  }
  assertReference(
    proposal.snapshot,
    "snapshot",
    "Candidate snapshot reference is invalid.",
  );
  assertReference(
    proposal.acquisition,
    "acquisition",
    "Candidate acquisition reference is invalid.",
  );
  assertReference(
    completed.evidence,
    "evidence",
    "Candidate evidence reference is invalid.",
  );
  const snapshot = parseSourceSnapshot(
    store.getRecord(exactRef(proposal.snapshot)),
  );
  const acquisition = parseExternalSourceAcquisition(
    store.getRecord(exactRef(proposal.acquisition)),
  );
  const evidence = parseEvidenceBundle(
    store.getRecord(exactRef(completed.evidence)),
  );
  if (
    proposal.producerVersion !== snapshot.producerVersion ||
    proposal.producerVersion !== acquisition.producerVersion ||
    proposal.producerVersion !== evidence.producerVersion
  ) {
    throw new Error(
      "Candidate producer version differs from immutable evidence.",
    );
  }
  if (
    acquisition.acquisitionState !== "acquired" ||
    acquisition.snapshot.recordDigest !== proposal.snapshot.digest ||
    !acquisition.parentDigests.includes(proposal.snapshot.digest) ||
    evidence.snapshotDigest !== proposal.snapshot.digest ||
    !evidence.parentDigests.includes(proposal.acquisition.digest)
  ) {
    throw new Error(
      "Candidate source, acquisition, and evidence linkage is invalid.",
    );
  }
  if (
    completed.inventory.parser !== evidence.ast.parser ||
    completed.inventory.parserVersion !== evidence.ast.parserVersion ||
    completed.inventory.inventoryDigest !== evidence.ast.inventoryDigest ||
    completed.inventory.inventory.digest !== evidence.ast.inventoryDigest ||
    inventoryDigest(
      proposal.snapshot.digest,
      snapshot.treeDigest,
      completed,
    ) !== evidence.ast.inventoryDigest
  ) {
    throw new Error(
      "Candidate module inventory identity or digest is invalid.",
    );
  }
  const normalizedScans = completed.scans.scans.map(
    ({ kind, tool, toolVersion, rulesetDigest, resultDigest, status }) => ({
      kind,
      tool,
      toolVersion,
      rulesetDigest,
      resultDigest,
      status,
    }),
  );
  if (
    canonicalJson(normalizedScans) !== canonicalJson(evidence.scans) ||
    completed.scans.sbom.digest !== evidence.sbom.digest ||
    completed.scans.sbom.components !== evidence.sbom.components ||
    evidence.scans.some(({ status }) => status !== "pass") ||
    canonicalJson(evidence.scans.map(({ kind }) => kind)) !==
      canonicalJson(SCAN_KIND_ORDER)
  ) {
    throw new Error("Candidate requires the accepted passing scan bundle.");
  }
  const modulesByIdentity = new Map(
    completed.inventory.modules.map((module) => [
      `${module.path}\0${module.symbols.join("\0")}`,
      module,
    ]),
  );
  for (const selected of proposal.selectedModules) {
    if (!SAFE_PATH.test(selected.path)) {
      throw new Error("Candidate selected module path is unsafe.");
    }
    const candidates = [...modulesByIdentity.values()].filter(
      (module) =>
        module.path === selected.path &&
        (selected.symbol === undefined ||
          module.symbols.includes(selected.symbol)),
    );
    if (
      candidates.length !== 1 ||
      candidates[0]!.sourceDigest !== selected.digest ||
      candidates[0]!.parseStatus !== "parsed" ||
      candidates[0]!.generated ||
      candidates[0]!.binary ||
      candidates[0]!.dynamicEvaluation ||
      candidates[0]!.dynamicLoad ||
      candidates[0]!.processAccess ||
      candidates[0]!.filesystemAccess ||
      candidates[0]!.networkAccess
    ) {
      throw new Error(
        "Candidate selected module identity or digest is invalid.",
      );
    }
  }
  if (
    (proposal.proposedClassification === "source-fragment" ||
      proposal.selectedModules.some(
        ({ purpose }) => purpose === "proposed-copy",
      )) &&
    evidence.licence.manualStatus !== "approved"
  ) {
    throw new Error(
      "Proposed source copying requires an approved licence decision.",
    );
  }
  if (
    completed.receipts.length === 0 ||
    completed.resume.executionId !== completed.executionId ||
    canonicalJson(completed.resume.receipts) !==
      canonicalJson(completed.receipts)
  ) {
    throw new Error("Candidate evidence receipt chain is invalid.");
  }
  let previous: StoredRecordRef | undefined;
  let jobId: string | undefined;
  for (const [index, ref] of completed.receipts.entries()) {
    assertReference(
      ref,
      "receipt",
      "Candidate evidence receipt reference is invalid.",
    );
    const receipt = parseIntakeReceipt(store.getRecord(exactRef(ref)));
    if (
      receipt.sequence !== index + 1 ||
      (jobId !== undefined && receipt.jobId !== jobId) ||
      (previous !== undefined &&
        !receipt.parentDigests.includes(previous.digest))
    ) {
      throw new Error("Candidate evidence receipt chain is invalid.");
    }
    jobId = receipt.jobId;
    previous = ref;
  }
  const terminal = parseIntakeReceipt(store.getRecord(exactRef(previous!)));
  if (
    terminal.status !== "evidenced" ||
    terminal.code !== "evidence-bundle-stored" ||
    terminal.recordDigests.length !== 1 ||
    terminal.recordDigests[0] !== completed.evidence.digest
  ) {
    throw new Error("Candidate evidence terminal receipt is invalid.");
  }
}

function parseArtifacts(
  input: unknown,
  proposal: Pick<CandidateProposalV1, "id" | "version" | "proposedFactoryKey">,
): CandidateArtifactsV1 {
  let artifacts: CandidateArtifactsV1;
  try {
    artifacts = artifactsSchema.parse(input);
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some(({ message }) =>
        message.includes("safe declarative data"),
      )
    ) {
      throw new Error(
        "Candidate fixtures may contain safe declarative data only.",
      );
    }
    throw new Error("Candidate artifacts must be strict declarative metadata.");
  }
  if (
    artifacts.manifest.id !== proposal.id ||
    artifacts.manifest.version !== proposal.version ||
    artifacts.manifest.proposedFactoryKey !== proposal.proposedFactoryKey ||
    artifacts.adapter.id !== proposal.id ||
    canonicalJson(artifacts.adapter.effects) !==
      canonicalJson(artifacts.manifest.effects)
  ) {
    throw new Error(
      "Candidate artifact identity or effect declarations differ.",
    );
  }
  return artifacts;
}

export function parseCandidateArtifacts(
  input: unknown,
  identity: Pick<
    CandidateCapabilityV1,
    "id" | "version" | "proposedFactoryKey"
  >,
): CandidateArtifactsV1 {
  return parseArtifacts(input, identity);
}

function validateProposal(
  input: CandidateProposalV1,
  store: ExternalIntakeStore,
): CandidateArtifactsV1 {
  assertExactKeys(
    input,
    [
      "apiVersion",
      "createdAt",
      "producerVersion",
      "id",
      "version",
      "snapshot",
      "acquisition",
      "completedEvidence",
      "proposedFactoryKey",
      "proposedClassification",
      "selectedModules",
      "artifacts",
    ],
    [],
    "Candidate proposal must be strict.",
  );
  if (
    input.apiVersion !== "factory.candidate-proposal/v1" ||
    !OPAQUE_ID.test(input.id) ||
    !VERSION.test(input.version) ||
    !VERSION.test(input.producerVersion) ||
    !DOTTED_KEY.test(input.proposedFactoryKey) ||
    !["dependency", "source-fragment", "provider-adapter"].includes(
      input.proposedClassification,
    ) ||
    !Array.isArray(input.selectedModules) ||
    input.selectedModules.length === 0 ||
    input.selectedModules.length > 256 ||
    new Set(
      input.selectedModules.map(
        ({ path, symbol }) => `${path}\0${symbol ?? ""}`,
      ),
    ).size !== input.selectedModules.length
  ) {
    throw new Error(
      "Candidate proposal identity, version, or module set is invalid.",
    );
  }
  const artifacts = parseArtifacts(input.artifacts, input);
  assertCompletedEvidence(input, store);
  return artifacts;
}

export class CandidateRegistry implements CandidateRegistryV1 {
  readonly #entries = new Map<string, CandidateEntry>();

  constructor(readonly store: ExternalIntakeStore) {}

  create(input: CandidateProposalV1): StoredCandidateRefV1 {
    const key = this.#key(input.id, input.version);
    if (this.#entries.has(key)) {
      throw new Error(`Candidate '${key}' already exists and is immutable.`);
    }
    const artifacts = validateProposal(input, this.store);
    const artifactEntries = [
      ["manifest", artifacts.manifest],
      ["fixture", artifacts.fixture],
      ["adapter", artifacts.adapter],
      ["conformance-plan", artifacts.conformancePlan],
    ] as const;
    const artifactDigests = Object.fromEntries(
      artifactEntries.map(([name, artifact]) => [
        name,
        digestBytes(artifactBytes(artifact)),
      ]),
    ) as Record<(typeof artifactEntries)[number][0], Sha256Digest>;
    const candidate = parseCandidateCapability({
      apiVersion: "factory.candidate-capability/v1",
      createdAt: input.createdAt,
      producerVersion: input.producerVersion,
      parentDigests: unique([
        input.snapshot.digest,
        input.acquisition.digest,
        input.completedEvidence.evidence.digest,
        ...Object.values(artifactDigests),
      ]),
      id: input.id,
      version: input.version,
      status: "quarantined",
      sourceSnapshotDigest: input.snapshot.digest,
      evidenceDigest: input.completedEvidence.evidence.digest,
      proposedFactoryKey: input.proposedFactoryKey,
      proposedClassification: input.proposedClassification,
      selectedModules: input.selectedModules,
      allowedOutputs: ["manifest", "fixture", "adapter", "conformance-plan"],
      prohibited: [
        "capability-selection",
        "golden-registration",
        "graph-mutation",
        "compilation",
      ],
      candidateManifestDigest: artifactDigests.manifest,
      fixtureDigest: artifactDigests.fixture,
      adapterDigest: artifactDigests.adapter,
    });
    for (const [name, artifact] of artifactEntries) {
      const stored = this.store.putBytes("evidence", artifactBytes(artifact));
      if (stored.digest !== artifactDigests[name]) {
        throw new Error(
          "Candidate artifact digest changed during immutable write.",
        );
      }
    }
    const stored = this.store.putRecord("candidate", candidate);
    const ref: StoredCandidateRefV1 = {
      ...stored,
      kind: "candidate",
      id: candidate.id,
      version: candidate.version,
      status: candidate.status,
    };
    const jobId = `candidate-${digestBytes(encoder.encode(key)).slice(7, 39)}`;
    const receipt = this.store.appendReceipt(jobId, {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: input.createdAt,
      producerVersion: input.producerVersion,
      parentDigests: [stored.digest],
      jobId,
      sequence: 1,
      status: "candidate-ready",
      code: "candidate-quarantined",
      recordDigests: [stored.digest],
    });
    this.#entries.set(key, {
      id: candidate.id,
      version: candidate.version,
      latest: ref,
      history: [ref],
      artifacts: structuredClone(artifacts),
      jobId,
      receipts: [receipt],
    });
    return ref;
  }

  get(id: string, version: string): CandidateCapabilityV1 {
    const entry = this.#entry(id, version);
    return parseCandidateCapability(
      this.store.getRecord(exactRef(entry.latest)),
    );
  }

  list(filter: CandidateQueryV1): readonly CandidateSummaryV1[] {
    assertExactKeys(filter, [], ["id", "status", "proposedFactoryKey"]);
    return [...this.#entries.values()]
      .map((entry) => {
        const candidate = this.get(entry.id, entry.version);
        return {
          id: candidate.id,
          version: candidate.version,
          status: candidate.status,
          proposedFactoryKey: candidate.proposedFactoryKey,
          candidateDigest: entry.latest.digest as Sha256Digest,
          evidenceDigest: candidate.evidenceDigest,
        };
      })
      .filter(
        (summary) =>
          (filter.id === undefined || summary.id === filter.id) &&
          (filter.status === undefined || summary.status === filter.status) &&
          (filter.proposedFactoryKey === undefined ||
            summary.proposedFactoryKey === filter.proposedFactoryKey),
      )
      .sort((left, right) =>
        `${left.id}@${left.version}`.localeCompare(
          `${right.id}@${right.version}`,
        ),
      );
  }

  appendStatus(input: CandidateStatusReceiptV1): StoredRecordRef {
    assertExactKeys(
      input,
      [
        "apiVersion",
        "id",
        "version",
        "from",
        "to",
        "createdAt",
        "producerVersion",
        "parentCandidateDigest",
      ],
      ["conformanceResultDigest"],
      "Candidate status receipt must be strict.",
    );
    const entry = this.#entry(input.id, input.version);
    const current = this.get(input.id, input.version);
    if (
      input.apiVersion !== "factory.candidate-status-receipt/v1" ||
      input.from !== "quarantined" ||
      current.status !== "quarantined" ||
      input.parentCandidateDigest !== entry.latest.digest ||
      input.producerVersion !== current.producerVersion ||
      !["conformance-passed", "blocked", "rejected"].includes(input.to)
    ) {
      throw new Error("Candidate status lifecycle is append-only.");
    }
    if (
      (input.to === "conformance-passed" &&
        (input.conformanceResultDigest === undefined ||
          !DIGEST.test(input.conformanceResultDigest))) ||
      (input.to !== "conformance-passed" &&
        input.conformanceResultDigest !== undefined)
    ) {
      throw new Error(
        "Candidate conformance status requires an exact result digest.",
      );
    }
    const next = parseCandidateCapability({
      ...current,
      createdAt: input.createdAt,
      parentDigests: unique([
        ...current.parentDigests,
        entry.latest.digest,
        ...(input.conformanceResultDigest === undefined
          ? []
          : [input.conformanceResultDigest]),
      ]),
      status: input.to,
      ...(input.conformanceResultDigest === undefined
        ? {}
        : { conformanceResultDigest: input.conformanceResultDigest }),
    });
    const stored = this.store.putRecord("candidate", next);
    const receiptRecord: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: input.createdAt,
      producerVersion: input.producerVersion,
      parentDigests: [entry.receipts.at(-1)!.digest, stored.digest],
      jobId: entry.jobId,
      sequence: entry.receipts.length + 1,
      status: input.to === "conformance-passed" ? "candidate-ready" : input.to,
      code: `candidate-${input.to}`,
      recordDigests: [stored.digest],
    };
    const receipt = this.store.appendReceipt(
      entry.jobId,
      parseIntakeReceipt(receiptRecord),
    );
    const nextRef: StoredCandidateRefV1 = {
      ...stored,
      kind: "candidate",
      id: next.id,
      version: next.version,
      status: next.status,
    };
    entry.latest = nextRef;
    entry.history.push(nextRef);
    entry.receipts.push(receipt);
    return receipt;
  }

  verify(ref: StoredCandidateRefV1): CandidateVerificationResultV1 {
    const issues: string[] = [];
    let candidate: CandidateCapabilityV1 | undefined;
    try {
      assertExactKeys(ref, ["kind", "digest", "id", "version", "status"]);
      if (ref.kind !== "candidate") throw new Error("wrong record kind");
      candidate = parseCandidateCapability(this.store.getRecord(exactRef(ref)));
      if (
        canonicalRecordDigest(candidate) !== ref.digest ||
        candidate.id !== ref.id ||
        candidate.version !== ref.version ||
        candidate.status !== ref.status
      ) {
        issues.push(
          "Candidate reference identity does not match its immutable record.",
        );
      }
      const entry = this.#entries.get(this.#key(ref.id, ref.version));
      if (
        entry === undefined ||
        !entry.history.some(({ digest }) => digest === ref.digest)
      ) {
        issues.push(
          "Candidate reference is not present in this registry timeline.",
        );
      } else {
        const artifacts = [
          [candidate.candidateManifestDigest, entry.artifacts.manifest],
          [candidate.fixtureDigest, entry.artifacts.fixture],
          [candidate.adapterDigest, entry.artifacts.adapter],
          [undefined, entry.artifacts.conformancePlan],
        ] as const;
        try {
          for (const [recordedDigest, artifact] of artifacts) {
            const expectedDigest = digestBytes(artifactBytes(artifact));
            if (
              (recordedDigest !== undefined &&
                recordedDigest !== expectedDigest) ||
              (recordedDigest === undefined &&
                !candidate.parentDigests.includes(expectedDigest)) ||
              this.store.putBytes("evidence", artifactBytes(artifact))
                .digest !== expectedDigest
            ) {
              throw new Error("Candidate artifact digest mismatch.");
            }
          }
        } catch {
          issues.push(
            "Candidate artifact is absent, conflicting, or digest-invalid.",
          );
        }
      }
    } catch {
      issues.push("Candidate record is absent, malformed, or digest-invalid.");
    }
    return {
      valid: issues.length === 0,
      issues,
      ...(candidate === undefined ? {} : { candidate }),
    };
  }

  getRef(id: string, version: string): StoredCandidateRefV1 {
    return this.#entry(id, version).latest;
  }

  getConformanceBundle(
    id: string,
    version: string,
  ): CandidateConformanceBundleV1 {
    const entry = this.#entry(id, version);
    return {
      candidate: this.get(id, version),
      artifacts: structuredClone(entry.artifacts),
    };
  }

  #key(id: string, version: string): string {
    if (!OPAQUE_ID.test(id) || !VERSION.test(version)) {
      throw new TypeError("Candidate identity and version must be opaque.");
    }
    return `${id}@${version}`;
  }

  #entry(id: string, version: string): CandidateEntry {
    const key = this.#key(id, version);
    const entry = this.#entries.get(key);
    if (entry === undefined) throw new Error(`Unknown Candidate '${key}'.`);
    return entry;
  }
}
