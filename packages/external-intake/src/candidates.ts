import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

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
  parseIntakeReceipt,
  type CandidateCapabilityV1,
  type IntakeReceiptV1,
} from "./contracts.js";
import {
  verifyCompletedEvidence,
  type CompletedEvidenceRefV1,
  type IntakeJobV1,
} from "./jobs.js";
import { ExternalIntakeStore, type StoredRecordRef } from "./store.js";

const encoder = new TextEncoder();
const OPAQUE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;
const DOTTED_KEY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;
const CANDIDATE_KEY = /^candidate\.[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/u;
const FIELD = /^[a-z][a-zA-Z0-9]{0,63}$/u;
const SAFE_PATH =
  /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\)[A-Za-z0-9_.@/-]{1,512}$/u;
const SAFE_FIXTURE_TEXT = /^[A-Za-z0-9 _.,:@/-]{0,128}$/u;
const SENSITIVE_VALUE =
  /(?:https?:\/\/|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|AKIA[A-Z0-9]|private[ -]?key|password|secret|\b(?:eval|require|import|export|function|class|process|fetch)\b|[{};`]|\r|\n)/iu;
const CANDIDATE_SAFE_EFFECTS = new Set([
  "candidate.observe",
  "candidate.project",
  "candidate.validate",
]);
const candidateSafeEffectSchema = z
  .string()
  .regex(DOTTED_KEY)
  .refine(
    (effect) => CANDIDATE_SAFE_EFFECTS.has(effect),
    "Candidate-safe effects must be nonmutating declarative operations.",
  );

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
    proposedFactoryKey: z.string().regex(CANDIDATE_KEY),
    inputSchema: objectSchema,
    outputSchema: objectSchema,
    effects: z
      .array(candidateSafeEffectSchema)
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
      .array(candidateSafeEffectSchema)
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
  readonly evidenceJob: IntakeJobV1;
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
  readonly lookupId: string;
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
  readonly lookupId: string;
  readonly proposedFactoryKey: string;
  readonly candidateDigest: Sha256Digest;
  readonly evidenceDigest: Sha256Digest;
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
  create(input: CandidateProposalV1): Promise<StoredCandidateRefV1>;
  get(id: string, version: string): CandidateCapabilityV1;
  list(filter: CandidateQueryV1): readonly CandidateSummaryV1[];
  recordConformancePass(
    id: string,
    version: string,
    result: unknown,
  ): Promise<StoredCandidateRefV1>;
  verify(ref: StoredCandidateRefV1): Promise<CandidateVerificationResultV1>;
}

interface CandidateEntry {
  readonly id: string;
  readonly version: string;
  latest: StoredCandidateRefV1;
  readonly history: StoredCandidateRefV1[];
  readonly artifacts: CandidateArtifactsV1;
  readonly evidenceJob: IntakeJobV1;
  readonly completedEvidence: CompletedEvidenceRefV1;
  readonly verificationState: CandidateVerificationStateV1;
  readonly verificationStateRef: StoredRecordRef;
  readonly jobId: string;
  readonly receipts: StoredRecordRef[];
}

interface PersistedSnapshotFileV1 {
  readonly path: string;
  readonly mode: "100644" | "100755";
  readonly digest: Sha256Digest;
  readonly size: number;
  readonly blob: { readonly kind: "snapshot"; readonly digest: Sha256Digest };
}

interface CandidateVerificationStateV1 {
  readonly apiVersion: "factory.candidate-verification-state/v1";
  readonly id: string;
  readonly version: string;
  readonly proposedFactoryKey: string;
  readonly evidenceJob: Omit<IntakeJobV1, "snapshotView"> & {
    readonly snapshotView: {
      readonly snapshotDigest: Sha256Digest;
      readonly treeDigest: Sha256Digest;
      readonly files: readonly PersistedSnapshotFileV1[];
    };
  };
  readonly completedEvidence: CompletedEvidenceRefV1;
  readonly artifacts: CandidateArtifactsV1;
}

class CandidateBlobReader {
  readonly #root: string;

  constructor(root: string) {
    if (root.length === 0) {
      throw new TypeError("Candidate verification root is required.");
    }
    const stat = lstatSync(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new TypeError(
        "Candidate verification root must be a real directory.",
      );
    }
    this.#root = realpathSync.native(root);
  }

  read(kind: "snapshot" | "evidence", digest: Sha256Digest): Uint8Array {
    if (!/^sha256:[a-f0-9]{64}$/u.test(digest)) {
      throw new TypeError("Candidate verification blob digest is invalid.");
    }
    const path = resolve(
      this.#root,
      "blobs",
      kind,
      `${digest.slice("sha256:".length)}.bin`,
    );
    const fromRoot = relative(this.#root, path);
    if (
      fromRoot === "" ||
      fromRoot === ".." ||
      fromRoot.startsWith(`..${sep}`) ||
      resolve(this.#root, fromRoot) !== path
    ) {
      throw new Error("Candidate verification blob escaped quarantine.");
    }
    for (const directory of [
      resolve(this.#root, "blobs"),
      resolve(this.#root, "blobs", kind),
    ]) {
      const directoryStat = lstatSync(directory);
      if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
        throw new Error(
          "Candidate verification blob parent is not a real directory.",
        );
      }
    }
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error("Candidate verification blob is not a regular file.");
    }
    const bytes = readFileSync(path);
    if (digestBytes(bytes) !== digest) {
      throw new Error("Candidate verification blob digest is invalid.");
    }
    return bytes;
  }
}

function exactRef(ref: StoredRecordRef): StoredRecordRef {
  return { kind: ref.kind, digest: ref.digest };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function candidateLookupId(receiptDigest: Sha256Digest): string {
  return `candidate-${receiptDigest.slice("sha256:".length)}`;
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

function artifactBytes(artifact: unknown): Uint8Array {
  return encoder.encode(canonicalJson(artifact));
}

function assertStoredReference(
  input: unknown,
  kind: StoredRecordRef["kind"],
  message: string,
): asserts input is StoredRecordRef {
  assertExactKeys(input, ["kind", "digest"], [], message);
  if (
    input.kind !== kind ||
    typeof input.digest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(input.digest)
  ) {
    throw new TypeError(message);
  }
}

function parseCandidateVerificationState(
  input: unknown,
): CandidateVerificationStateV1 {
  assertExactKeys(
    input,
    [
      "apiVersion",
      "id",
      "version",
      "proposedFactoryKey",
      "evidenceJob",
      "completedEvidence",
      "artifacts",
    ],
    [],
    "Candidate verification state must be strict.",
  );
  if (
    input.apiVersion !== "factory.candidate-verification-state/v1" ||
    typeof input.id !== "string" ||
    !OPAQUE_ID.test(input.id) ||
    typeof input.version !== "string" ||
    !VERSION.test(input.version) ||
    typeof input.proposedFactoryKey !== "string" ||
    !CANDIDATE_KEY.test(input.proposedFactoryKey)
  ) {
    throw new TypeError("Candidate verification state identity is invalid.");
  }
  assertExactKeys(
    input.evidenceJob,
    [
      "apiVersion",
      "id",
      "createdAt",
      "producerVersion",
      "snapshot",
      "acquisition",
      "snapshotView",
    ],
    ["resume"],
    "Candidate verification evidence job must be strict.",
  );
  assertStoredReference(
    input.evidenceJob.snapshot,
    "snapshot",
    "Candidate verification snapshot reference is invalid.",
  );
  assertStoredReference(
    input.evidenceJob.acquisition,
    "acquisition",
    "Candidate verification acquisition reference is invalid.",
  );
  assertExactKeys(
    input.evidenceJob.snapshotView,
    ["snapshotDigest", "treeDigest", "files"],
    [],
    "Candidate verification snapshot metadata must be strict.",
  );
  if (
    typeof input.evidenceJob.snapshotView.snapshotDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(
      input.evidenceJob.snapshotView.snapshotDigest,
    ) ||
    typeof input.evidenceJob.snapshotView.treeDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(input.evidenceJob.snapshotView.treeDigest) ||
    !Array.isArray(input.evidenceJob.snapshotView.files) ||
    input.evidenceJob.snapshotView.files.length > 100_000
  ) {
    throw new TypeError("Candidate verification snapshot metadata is invalid.");
  }
  const seenPaths = new Set<string>();
  for (const unknownFile of input.evidenceJob.snapshotView.files) {
    assertExactKeys(
      unknownFile,
      ["path", "mode", "digest", "size", "blob"],
      [],
      "Candidate verification snapshot file must be strict.",
    );
    assertStoredReference(
      unknownFile.blob,
      "snapshot",
      "Candidate verification source blob reference is invalid.",
    );
    if (
      typeof unknownFile.path !== "string" ||
      !SAFE_PATH.test(unknownFile.path) ||
      seenPaths.has(unknownFile.path) ||
      (unknownFile.mode !== "100644" && unknownFile.mode !== "100755") ||
      typeof unknownFile.digest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/u.test(unknownFile.digest) ||
      unknownFile.blob.digest !== unknownFile.digest ||
      typeof unknownFile.size !== "number" ||
      !Number.isSafeInteger(unknownFile.size) ||
      unknownFile.size < 0
    ) {
      throw new TypeError("Candidate verification snapshot file is invalid.");
    }
    seenPaths.add(unknownFile.path);
  }
  assertExactKeys(
    input.completedEvidence,
    [
      "executionId",
      "status",
      "evidence",
      "scans",
      "inventory",
      "receipts",
      "resume",
    ],
    [],
    "Candidate completed evidence state must be strict.",
  );
  if (
    !Array.isArray(input.completedEvidence.receipts) ||
    input.completedEvidence.receipts.length !== 7
  ) {
    throw new TypeError("Candidate completed evidence chain is incomplete.");
  }
  const artifacts = parseArtifacts(input.artifacts, {
    id: input.id,
    version: input.version,
    proposedFactoryKey: input.proposedFactoryKey,
  });
  return {
    apiVersion: "factory.candidate-verification-state/v1",
    id: input.id,
    version: input.version,
    proposedFactoryKey: input.proposedFactoryKey,
    evidenceJob:
      input.evidenceJob as unknown as CandidateVerificationStateV1["evidenceJob"],
    completedEvidence:
      input.completedEvidence as unknown as CompletedEvidenceRefV1,
    artifacts,
  };
}

function verificationStateBytes(
  state: CandidateVerificationStateV1,
): Uint8Array {
  return encoder.encode(canonicalJson(state));
}

function persistCandidateVerificationState(
  input: CandidateProposalV1,
  artifacts: CandidateArtifactsV1,
  store: ExternalIntakeStore,
): {
  readonly state: CandidateVerificationStateV1;
  readonly ref: StoredRecordRef;
} {
  const { snapshotView, ...evidenceJob } = input.evidenceJob;
  const files = snapshotView.files.map((file) => {
    const blob = store.putBytes("snapshot", file.content);
    if (blob.digest !== file.digest) {
      throw new Error(
        "Candidate source blob differs from its accepted digest.",
      );
    }
    return {
      path: file.path,
      mode: file.mode,
      digest: file.digest,
      size: file.content.byteLength,
      blob,
    };
  });
  const state = parseCandidateVerificationState({
    apiVersion: "factory.candidate-verification-state/v1",
    id: input.id,
    version: input.version,
    proposedFactoryKey: input.proposedFactoryKey,
    evidenceJob: {
      ...evidenceJob,
      snapshotView: {
        snapshotDigest: snapshotView.snapshotDigest,
        treeDigest: snapshotView.treeDigest,
        files,
      },
    },
    completedEvidence: input.completedEvidence,
    artifacts,
  });
  const stored = store.putBytes("evidence", verificationStateBytes(state));
  return {
    state,
    ref: { kind: "evidence", digest: stored.digest },
  };
}

function loadCandidateVerificationState(
  ref: StoredRecordRef,
  reader: CandidateBlobReader,
  store: ExternalIntakeStore,
): CandidateVerificationStateV1 {
  assertStoredReference(
    ref,
    "evidence",
    "Candidate verification state reference is invalid.",
  );
  const bytes = reader.read("evidence", ref.digest as Sha256Digest);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const input = JSON.parse(text) as unknown;
  if (canonicalJson(input) !== text) {
    throw new Error("Candidate verification state is not canonical JSON.");
  }
  const state = parseCandidateVerificationState(input);
  const rebound = store.putBytes("evidence", bytes);
  if (rebound.digest !== ref.digest) {
    throw new Error("Candidate verification state digest drifted.");
  }
  return state;
}

function reconstructEvidenceJob(
  state: CandidateVerificationStateV1,
  reader: CandidateBlobReader,
  store: ExternalIntakeStore,
): IntakeJobV1 {
  const files = state.evidenceJob.snapshotView.files.map((file) => {
    const content = reader.read("snapshot", file.blob.digest);
    if (
      content.byteLength !== file.size ||
      digestBytes(content) !== file.digest
    ) {
      throw new Error("Candidate source blob size or digest drifted.");
    }
    const rebound = store.putBytes("snapshot", content);
    if (rebound.digest !== file.blob.digest) {
      throw new Error("Candidate source blob reference drifted.");
    }
    return {
      path: file.path,
      mode: file.mode,
      digest: file.digest,
      content: new Uint8Array(content),
    };
  });
  return {
    ...state.evidenceJob,
    snapshotView: {
      snapshotDigest: state.evidenceJob.snapshotView.snapshotDigest,
      treeDigest: state.evidenceJob.snapshotView.treeDigest,
      files,
    },
  };
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

function assertCandidateSelection(
  input: CandidateProposalV1,
  store: ExternalIntakeStore,
): void {
  const modules = input.completedEvidence.inventory.modules;
  for (const selected of input.selectedModules) {
    if (!SAFE_PATH.test(selected.path)) {
      throw new Error("Candidate selected module path is unsafe.");
    }
    const matches = modules.filter(
      (module) =>
        module.path === selected.path &&
        (selected.symbol === undefined ||
          module.symbols.includes(selected.symbol)),
    );
    const module = matches[0];
    if (
      matches.length !== 1 ||
      module === undefined ||
      module.sourceDigest !== selected.digest ||
      module.parseStatus !== "parsed" ||
      module.generated ||
      module.binary ||
      module.dynamicEvaluation ||
      module.dynamicLoad ||
      module.processAccess ||
      module.filesystemAccess ||
      module.networkAccess
    ) {
      throw new Error(
        "Candidate selected module identity or digest is invalid.",
      );
    }
  }
  if (
    input.proposedClassification === "source-fragment" ||
    input.selectedModules.some(({ purpose }) => purpose === "proposed-copy")
  ) {
    const evidence = parseEvidenceBundle(
      store.getRecord(exactRef(input.completedEvidence.evidence)),
    );
    if (evidence.licence.manualStatus !== "approved") {
      throw new Error(
        "Proposed source copying requires an approved licence decision.",
      );
    }
  }
}

async function validateProposal(
  input: CandidateProposalV1,
  store: ExternalIntakeStore,
): Promise<CandidateArtifactsV1> {
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
      "evidenceJob",
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
    !CANDIDATE_KEY.test(input.proposedFactoryKey) ||
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
      "Candidate proposal identity must use the candidate. namespace with a valid version and module set.",
    );
  }
  const artifacts = parseArtifacts(input.artifacts, input);
  if (
    input.evidenceJob.snapshot.digest !== input.snapshot.digest ||
    input.evidenceJob.acquisition.digest !== input.acquisition.digest ||
    input.evidenceJob.createdAt !== input.createdAt ||
    input.evidenceJob.producerVersion !== input.producerVersion
  ) {
    throw new Error(
      "Candidate evidence job differs from its proposal parents.",
    );
  }
  await verifyCompletedEvidence(
    input.evidenceJob,
    input.completedEvidence,
    store,
  );
  assertCandidateSelection(input, store);
  return artifacts;
}

export class CandidateRegistry implements CandidateRegistryV1 {
  readonly #entries = new Map<string, CandidateEntry>();
  readonly #reader: CandidateBlobReader | undefined;

  constructor(
    readonly store: ExternalIntakeStore,
    verificationRoot?: string,
  ) {
    this.#reader =
      verificationRoot === undefined
        ? undefined
        : new CandidateBlobReader(verificationRoot);
  }

  async create(input: CandidateProposalV1): Promise<StoredCandidateRefV1> {
    const key = this.#key(input.id, input.version);
    if (this.#entries.has(key)) {
      throw new Error(`Candidate '${key}' already exists and is immutable.`);
    }
    const artifacts = await validateProposal(input, this.store);
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
    const verification = persistCandidateVerificationState(
      input,
      artifacts,
      this.store,
    );
    const candidate = parseCandidateCapability({
      apiVersion: "factory.candidate-capability/v1",
      createdAt: input.createdAt,
      producerVersion: input.producerVersion,
      parentDigests: unique([
        input.snapshot.digest,
        input.acquisition.digest,
        input.completedEvidence.evidence.digest,
        verification.ref.digest,
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
      recordDigests: unique([
        stored.digest,
        verification.ref.digest,
        ...input.completedEvidence.receipts.map(({ digest }) => digest),
        input.completedEvidence.evidence.digest,
        ...Object.values(artifactDigests),
      ]),
    });
    const ref: StoredCandidateRefV1 = {
      ...stored,
      kind: "candidate",
      id: candidate.id,
      version: candidate.version,
      status: candidate.status,
      lookupId: candidateLookupId(receipt.digest as Sha256Digest),
    };
    this.#entries.set(key, {
      id: candidate.id,
      version: candidate.version,
      latest: ref,
      history: [ref],
      artifacts: structuredClone(artifacts),
      evidenceJob: structuredClone(input.evidenceJob),
      completedEvidence: structuredClone(input.completedEvidence),
      verificationState: structuredClone(verification.state),
      verificationStateRef: verification.ref,
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
          lookupId: entry.latest.lookupId,
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

  async recordConformancePass(
    id: string,
    version: string,
    result: unknown,
  ): Promise<StoredCandidateRefV1> {
    const entry = this.#entry(id, version);
    const current = this.get(id, version);
    if (current.status !== "quarantined") {
      throw new Error("Candidate conformance lifecycle is append-only.");
    }
    const { evaluateCandidateConformance } = await import("./conformance.js");
    const expected = evaluateCandidateConformance({
      candidate: current,
      artifacts: entry.artifacts,
    });
    if (
      expected.status !== "pass" ||
      canonicalJson(result) !== canonicalJson(expected)
    ) {
      throw new Error(
        "Candidate conformance pass must match the current Candidate and artifacts.",
      );
    }
    const resultBytes = artifactBytes(expected);
    const resultDigest = digestBytes(resultBytes);
    const persisted = this.store.putBytes("evidence", resultBytes);
    if (persisted.digest !== resultDigest) {
      throw new Error("Candidate conformance result persistence drifted.");
    }
    const next = parseCandidateCapability({
      ...current,
      parentDigests: unique([
        ...current.parentDigests,
        entry.latest.digest,
        resultDigest,
      ]),
      status: "conformance-passed",
      conformanceResultDigest: resultDigest,
    });
    const stored = this.store.putRecord("candidate", next);
    const receiptRecord: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: current.createdAt,
      producerVersion: current.producerVersion,
      parentDigests: [entry.receipts.at(-1)!.digest, stored.digest],
      jobId: entry.jobId,
      sequence: entry.receipts.length + 1,
      status: "candidate-ready",
      code: "candidate-conformance-passed",
      recordDigests: [
        stored.digest,
        resultDigest,
        entry.verificationStateRef.digest,
      ],
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
      lookupId: candidateLookupId(receipt.digest as Sha256Digest),
    };
    entry.latest = nextRef;
    entry.history.push(nextRef);
    entry.receipts.push(receipt);
    return nextRef;
  }

  async verify(
    ref: StoredCandidateRefV1,
  ): Promise<CandidateVerificationResultV1> {
    const issues: string[] = [];
    let candidate: CandidateCapabilityV1 | undefined;
    try {
      assertExactKeys(ref, [
        "kind",
        "digest",
        "id",
        "version",
        "status",
        "lookupId",
      ]);
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
      const entry = this.#entry(ref.lookupId, ref.version);
      if (!entry.history.some(({ digest }) => digest === ref.digest)) {
        issues.push(
          "Candidate reference is not present in this registry timeline.",
        );
      } else {
        try {
          const stateBytes = verificationStateBytes(entry.verificationState);
          const rebound = this.store.putBytes("evidence", stateBytes);
          if (
            rebound.digest !== entry.verificationStateRef.digest ||
            !candidate.parentDigests.includes(rebound.digest)
          ) {
            throw new Error("Candidate verification state drifted.");
          }
        } catch {
          issues.push(
            "Candidate verification state is absent, conflicting, or digest-invalid.",
          );
        }
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
      try {
        await verifyCompletedEvidence(
          entry.evidenceJob,
          entry.completedEvidence,
          this.store,
        );
      } catch {
        issues.push("Candidate accepted evidence is no longer verifiable.");
      }
      if (candidate.status === "conformance-passed") {
        try {
          const priorCandidateRef = entry.history.at(-2);
          if (priorCandidateRef === undefined) {
            throw new Error("Candidate conformance predecessor is absent.");
          }
          const priorCandidate = parseCandidateCapability(
            this.store.getRecord(exactRef(priorCandidateRef)),
          );
          const { evaluateCandidateConformance } =
            await import("./conformance.js");
          const expectedResult = evaluateCandidateConformance({
            candidate: priorCandidate,
            artifacts: entry.artifacts,
          });
          const expectedBytes = artifactBytes(expectedResult);
          const expectedDigest = digestBytes(expectedBytes);
          if (
            expectedResult.status !== "pass" ||
            candidate.conformanceResultDigest !== expectedDigest ||
            this.store.putBytes("evidence", expectedBytes).digest !==
              expectedDigest
          ) {
            throw new Error("Candidate conformance result drifted.");
          }
        } catch {
          issues.push(
            "Candidate conformance result is absent, conflicting, or digest-invalid.",
          );
        }
        try {
          const receiptRef = entry.receipts.at(-1);
          const priorReceiptRef = entry.receipts.at(-2);
          if (receiptRef === undefined || priorReceiptRef === undefined) {
            throw new Error("Candidate conformance receipt chain is absent.");
          }
          const receipt = parseIntakeReceipt(this.store.getRecord(receiptRef));
          if (
            candidate.conformanceResultDigest === undefined ||
            receipt.jobId !== entry.jobId ||
            receipt.sequence !== entry.receipts.length ||
            receipt.status !== "candidate-ready" ||
            receipt.code !== "candidate-conformance-passed" ||
            receipt.parentDigests.length !== 2 ||
            !receipt.parentDigests.includes(priorReceiptRef.digest) ||
            !receipt.parentDigests.includes(ref.digest) ||
            receipt.recordDigests.length !== 3 ||
            receipt.recordDigests[0] !== ref.digest ||
            receipt.recordDigests[1] !== candidate.conformanceResultDigest ||
            receipt.recordDigests[2] !== entry.verificationStateRef.digest ||
            candidateLookupId(receiptRef.digest as Sha256Digest) !==
              ref.lookupId
          ) {
            throw new Error("Candidate conformance receipt binding drifted.");
          }
        } catch {
          issues.push("Candidate conformance receipt is invalid.");
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
    const entry =
      this.#entries.get(key) ??
      [...this.#entries.values()].find((candidate) =>
        candidate.history.some(({ lookupId }) => lookupId === id),
      );
    if (entry !== undefined) return entry;
    if (!/^candidate-[a-f0-9]{64}$/u.test(id)) {
      throw new Error(`Unknown Candidate '${key}'.`);
    }
    return this.#loadReceiptAddressedEntry(id, version);
  }

  #loadReceiptAddressedEntry(id: string, version: string): CandidateEntry {
    if (this.#reader === undefined) {
      throw new Error(
        "Candidate receipt recovery requires the configured quarantine root.",
      );
    }
    const terminalRef: StoredRecordRef = {
      kind: "receipt",
      digest: `sha256:${id.slice("candidate-".length)}`,
    };
    const terminal = parseIntakeReceipt(this.store.getRecord(terminalRef));
    if (
      terminal.status !== "candidate-ready" ||
      !["candidate-quarantined", "candidate-conformance-passed"].includes(
        terminal.code,
      ) ||
      terminal.recordDigests.length < 2
    ) {
      throw new Error("Candidate receipt-addressed reference is invalid.");
    }
    const current = parseCandidateCapability(
      this.store.getRecord({
        kind: "candidate",
        digest: terminal.recordDigests[0]!,
      }),
    );
    if (current.version !== version) {
      throw new Error("Candidate receipt version does not match its record.");
    }
    let creationRef = terminalRef;
    let creation = terminal;
    const receipts: StoredRecordRef[] = [terminalRef];
    if (terminal.code === "candidate-conformance-passed") {
      const previousDigest = terminal.parentDigests.find((digest) => {
        try {
          const previous = parseIntakeReceipt(
            this.store.getRecord({ kind: "receipt", digest }),
          );
          return previous.jobId === terminal.jobId;
        } catch {
          return false;
        }
      });
      if (previousDigest === undefined) {
        throw new Error("Candidate conformance receipt has no prior receipt.");
      }
      creationRef = { kind: "receipt", digest: previousDigest };
      creation = parseIntakeReceipt(this.store.getRecord(creationRef));
      receipts.unshift(creationRef);
    }
    const creationCandidateDigest = creation.recordDigests[0];
    const verificationStateDigest = creation.recordDigests[1];
    if (
      creationCandidateDigest === undefined ||
      verificationStateDigest === undefined
    ) {
      throw new Error("Candidate creation receipt is incomplete.");
    }
    const creationCandidate = parseCandidateCapability(
      this.store.getRecord({
        kind: "candidate",
        digest: creationCandidateDigest,
      }),
    );
    const verificationStateRef: StoredRecordRef = {
      kind: "evidence",
      digest: verificationStateDigest,
    };
    const verificationState = loadCandidateVerificationState(
      verificationStateRef,
      this.#reader,
      this.store,
    );
    const evidenceJob = reconstructEvidenceJob(
      verificationState,
      this.#reader,
      this.store,
    );
    const artifacts = verificationState.artifacts;
    const artifactDigests = [
      digestBytes(artifactBytes(artifacts.manifest)),
      digestBytes(artifactBytes(artifacts.fixture)),
      digestBytes(artifactBytes(artifacts.adapter)),
      digestBytes(artifactBytes(artifacts.conformancePlan)),
    ];
    const expectedCandidateParents = unique([
      evidenceJob.snapshot.digest,
      evidenceJob.acquisition.digest,
      verificationState.completedEvidence.evidence.digest,
      verificationStateDigest,
      ...artifactDigests,
    ]);
    const expectedCreationDigests = [
      creationCandidateDigest,
      verificationStateDigest,
      ...verificationState.completedEvidence.receipts.map(
        ({ digest }) => digest,
      ),
      verificationState.completedEvidence.evidence.digest,
      ...artifactDigests,
    ];
    const creationStoredRef: StoredCandidateRefV1 = {
      kind: "candidate",
      digest: creationCandidateDigest,
      id: creationCandidate.id,
      version: creationCandidate.version,
      status: creationCandidate.status,
      lookupId: candidateLookupId(creationRef.digest as Sha256Digest),
    };
    if (
      creation.code !== "candidate-quarantined" ||
      creation.status !== "candidate-ready" ||
      creation.sequence !== 1 ||
      creation.jobId !==
        `candidate-${digestBytes(
          encoder.encode(
            `${creationCandidate.id}@${creationCandidate.version}`,
          ),
        ).slice(7, 39)}` ||
      creation.createdAt !== creationCandidate.createdAt ||
      creation.producerVersion !== creationCandidate.producerVersion ||
      creation.parentDigests.length !== 1 ||
      creation.parentDigests[0] !== creationCandidateDigest ||
      canonicalJson(creation.recordDigests) !==
        canonicalJson(expectedCreationDigests) ||
      creationCandidate.status !== "quarantined" ||
      canonicalRecordDigest(creationCandidate) !== creationCandidateDigest ||
      creationCandidate.id !== current.id ||
      creationCandidate.version !== current.version ||
      creationCandidate.evidenceDigest !== current.evidenceDigest ||
      creationCandidate.evidenceDigest !==
        verificationState.completedEvidence.evidence.digest ||
      canonicalJson(creationCandidate.parentDigests) !==
        canonicalJson(expectedCandidateParents) ||
      creationCandidate.id !== verificationState.id ||
      creationCandidate.version !== verificationState.version ||
      creationCandidate.proposedFactoryKey !==
        verificationState.proposedFactoryKey ||
      creationCandidate.sourceSnapshotDigest !== evidenceJob.snapshot.digest ||
      !creationCandidate.parentDigests.includes(
        evidenceJob.acquisition.digest,
      ) ||
      !creationCandidate.parentDigests.includes(verificationStateDigest) ||
      creationCandidate.candidateManifestDigest !== artifactDigests[0] ||
      creationCandidate.fixtureDigest !== artifactDigests[1] ||
      creationCandidate.adapterDigest !== artifactDigests[2] ||
      !creationCandidate.parentDigests.includes(artifactDigests[3]!)
    ) {
      throw new Error("Candidate strict verification state is invalid.");
    }
    if (terminal.code === "candidate-quarantined") {
      if (
        terminalRef.digest !== creationRef.digest ||
        current.status !== "quarantined" ||
        canonicalJson(current) !== canonicalJson(creationCandidate)
      ) {
        throw new Error("Candidate quarantined revision is inconsistent.");
      }
    } else {
      const resultDigest = current.conformanceResultDigest;
      if (resultDigest === undefined) {
        throw new Error("Candidate conformance result reference is absent.");
      }
      const expectedCurrent = parseCandidateCapability({
        ...creationCandidate,
        parentDigests: unique([
          ...creationCandidate.parentDigests,
          creationCandidateDigest,
          resultDigest,
        ]),
        status: "conformance-passed",
        conformanceResultDigest: resultDigest,
      });
      if (
        terminal.jobId !== creation.jobId ||
        terminal.sequence !== 2 ||
        terminal.parentDigests.length !== 2 ||
        !terminal.parentDigests.includes(creationRef.digest) ||
        !terminal.parentDigests.includes(terminal.recordDigests[0]!) ||
        canonicalJson(terminal.recordDigests) !==
          canonicalJson([
            terminal.recordDigests[0],
            resultDigest,
            verificationStateDigest,
          ]) ||
        canonicalJson(current) !== canonicalJson(expectedCurrent)
      ) {
        throw new Error("Candidate conformance receipt is inconsistent.");
      }
    }
    const latest: StoredCandidateRefV1 = {
      kind: "candidate",
      digest: terminal.recordDigests[0]!,
      id: current.id,
      version: current.version,
      status: current.status,
      lookupId: id,
    };
    const loaded: CandidateEntry = {
      id: current.id,
      version: current.version,
      latest,
      history:
        current.status === "quarantined"
          ? [latest]
          : [creationStoredRef, latest],
      artifacts,
      evidenceJob,
      completedEvidence: verificationState.completedEvidence,
      verificationState,
      verificationStateRef,
      jobId: terminal.jobId,
      receipts,
    };
    this.#entries.set(this.#key(current.id, current.version), loaded);
    return loaded;
  }
}
