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
import {
  commitCandidateTransition,
  ExternalIntakeStore,
  type StoredRecordRef,
} from "./store.js";

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
const MAX_ARTIFACT_DEPTH = 16;
const MAX_ARTIFACT_NODES = 4_096;
const MAX_ARTIFACT_UTF8_BYTES = 256 * 1_024;
const SENSITIVE_ARTIFACT_IDENTIFIERS = [
  "token",
  "auth",
  "apikey",
  "clientsecret",
  "privatekey",
  "password",
  "credential",
  "prompt",
  "response",
] as const;
const SAFE_ARTIFACT_API_VERSIONS = new Set([
  "factory.candidate-manifest/v1",
  "factory.candidate-fixture/v1",
  "factory.candidate-adapter/v1",
  "factory.candidate-conformance-plan/v1",
]);
const ARTIFACT_ARRAY_ELEMENT = Symbol("artifact-array-element");
type ArtifactPathSegment = string | typeof ARTIFACT_ARRAY_ELEMENT;

function normalizeArtifactIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function isSensitiveArtifactIdentifier(value: string): boolean {
  const normalized = normalizeArtifactIdentifier(value);
  return SENSITIVE_ARTIFACT_IDENTIFIERS.some((identifier) =>
    normalized.includes(identifier),
  );
}

function shannonEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const character of value) {
    counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function artifactPathEquals(
  path: readonly ArtifactPathSegment[],
  ...expected: readonly ArtifactPathSegment[]
): boolean {
  return (
    path.length === expected.length &&
    path.every((segment, index) => segment === expected[index])
  );
}

function isAllowedCanonicalArtifactValue(
  value: string,
  path: readonly ArtifactPathSegment[],
): boolean {
  if (
    artifactPathEquals(path, "manifest", "apiVersion") ||
    artifactPathEquals(path, "fixture", "apiVersion") ||
    artifactPathEquals(path, "adapter", "apiVersion") ||
    artifactPathEquals(path, "conformancePlan", "apiVersion")
  ) {
    return SAFE_ARTIFACT_API_VERSIONS.has(value);
  }
  if (
    artifactPathEquals(path, "manifest", "id") ||
    artifactPathEquals(path, "fixture", "id") ||
    artifactPathEquals(path, "adapter", "id") ||
    artifactPathEquals(
      path,
      "conformancePlan",
      "cases",
      ARTIFACT_ARRAY_ELEMENT,
      "id",
    )
  ) {
    return OPAQUE_ID.test(value);
  }
  if (artifactPathEquals(path, "manifest", "version")) {
    return VERSION.test(value);
  }
  if (artifactPathEquals(path, "manifest", "proposedFactoryKey")) {
    return CANDIDATE_KEY.test(value);
  }
  return false;
}

export function isCredentialLikeCandidateValue(value: string): boolean {
  if (
    /^sha256:[a-f0-9]{64}$/u.test(value) ||
    /^(?:candidate|job)-[a-f0-9]{64}$/u.test(value)
  ) {
    return true;
  }
  const authorizationToken =
    /^[A-Za-z][A-Za-z0-9_-]{1,31}\s+([A-Za-z0-9+/_=.@:-]{32,})$/u.exec(
      value,
    )?.[1];
  if (
    authorizationToken !== undefined &&
    shannonEntropy(authorizationToken) >= 3.5
  ) {
    return true;
  }
  if (
    value.length >= 32 &&
    /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/u.test(value)
  ) {
    return true;
  }
  if (value.length < 32 || /\s/u.test(value)) return false;
  const tokenShaped = /^[A-Za-z0-9+/_=.@:-]+$/u.test(value);
  return tokenShaped && shannonEntropy(value) >= 3.5;
}

function assertCandidateArtifactPrivacy(input: unknown): void {
  const stack: Array<{
    readonly value: unknown;
    readonly depth: number;
    readonly identifierContext: boolean;
    readonly path: readonly ArtifactPathSegment[];
  }> = [{ value: input, depth: 0, identifierContext: false, path: [] }];
  const seen = new WeakSet<object>();
  let nodes = 0;
  let utf8Bytes = 0;
  const account = (value: string): void => {
    if (value.length > MAX_ARTIFACT_UTF8_BYTES - utf8Bytes) {
      throw new Error("Candidate artifacts exceed privacy inspection bounds.");
    }
    utf8Bytes += encoder.encode(value).byteLength;
    if (utf8Bytes > MAX_ARTIFACT_UTF8_BYTES) {
      throw new Error("Candidate artifacts exceed privacy inspection bounds.");
    }
  };
  while (stack.length > 0) {
    const item = stack.pop()!;
    nodes += 1;
    if (nodes > MAX_ARTIFACT_NODES || item.depth > MAX_ARTIFACT_DEPTH) {
      throw new Error("Candidate artifacts exceed privacy inspection bounds.");
    }
    if (typeof item.value === "string") {
      account(item.value);
      if (
        (isCredentialLikeCandidateValue(item.value) &&
          !isAllowedCanonicalArtifactValue(item.value, item.path)) ||
        (item.identifierContext && isSensitiveArtifactIdentifier(item.value))
      ) {
        throw new Error(
          "Candidate artifacts contain sensitive or credential-like data.",
        );
      }
      continue;
    }
    if (item.value === null || typeof item.value !== "object") continue;
    if (seen.has(item.value)) {
      throw new Error("Candidate artifacts exceed privacy inspection bounds.");
    }
    seen.add(item.value);
    if (Array.isArray(item.value)) {
      for (const value of item.value) {
        stack.push({
          value,
          depth: item.depth + 1,
          identifierContext: item.identifierContext,
          path: [...item.path, ARTIFACT_ARRAY_ELEMENT],
        });
      }
      continue;
    }
    for (const [key, value] of Object.entries(item.value)) {
      account(key);
      if (isSensitiveArtifactIdentifier(key)) {
        throw new Error(
          "Candidate artifacts contain sensitive or credential-like data.",
        );
      }
      const normalizedKey = normalizeArtifactIdentifier(key);
      stack.push({
        value,
        depth: item.depth + 1,
        identifierContext:
          item.identifierContext ||
          normalizedKey === "required" ||
          normalizedKey === "projection",
        path: [...item.path, key],
      });
    }
  }
}
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
  recordBlocked(id: string, version: string): Promise<StoredCandidateRefV1>;
  recordRejected(id: string, version: string): Promise<StoredCandidateRefV1>;
  verify(ref: StoredCandidateRefV1): Promise<CandidateVerificationResultV1>;
  verifyIdentity(
    id: string,
    version: string,
  ): Promise<CandidateVerificationResultV1>;
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
  verified: boolean;
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

  readReceipt(jobId: string, sequence: number): StoredRecordRef | undefined {
    if (
      !OPAQUE_ID.test(jobId) ||
      !Number.isSafeInteger(sequence) ||
      sequence < 1
    ) {
      throw new TypeError("Candidate receipt index identity is invalid.");
    }
    const path = resolve(
      this.#root,
      "jobs",
      jobId,
      "receipts",
      `${sequence}.json`,
    );
    const fromRoot = relative(this.#root, path);
    if (
      fromRoot === "" ||
      fromRoot === ".." ||
      fromRoot.startsWith(`..${sep}`) ||
      resolve(this.#root, fromRoot) !== path
    ) {
      throw new Error("Candidate receipt index escaped quarantine.");
    }
    for (const directory of [
      resolve(this.#root, "jobs"),
      resolve(this.#root, "jobs", jobId),
      resolve(this.#root, "jobs", jobId, "receipts"),
    ]) {
      const directoryStat = lstatSync(directory);
      if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
        throw new Error(
          "Candidate receipt index parent is not a real directory.",
        );
      }
    }
    let decoded: string;
    try {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new Error("Candidate receipt index is not a regular file.");
      }
      decoded = readFileSync(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
    const index = JSON.parse(decoded) as unknown;
    assertExactKeys(index, [
      "apiVersion",
      "createdAt",
      "producerVersion",
      "parentDigests",
      "jobId",
      "sequence",
      "receiptDigest",
    ]);
    if (
      index.apiVersion !== "factory.external-intake-receipt-index/v1" ||
      index.jobId !== jobId ||
      index.sequence !== sequence ||
      typeof index.receiptDigest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/u.test(index.receiptDigest) ||
      !Array.isArray(index.parentDigests) ||
      index.parentDigests.length !== 1 ||
      index.parentDigests[0] !== index.receiptDigest ||
      canonicalJson(index) !== decoded
    ) {
      throw new Error("Candidate receipt index is invalid.");
    }
    return {
      kind: "receipt",
      digest: index.receiptDigest as Sha256Digest,
    };
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
  assertCandidateArtifactPrivacy(input);
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
      verified: true,
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
      .filter((entry) => entry.verified)
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
    const verification = await this.verifyIdentity(id, version);
    if (!verification.valid || verification.candidate === undefined) {
      throw new Error(
        "Strict Candidate verification must pass before a lifecycle transition.",
      );
    }
    const entry = this.#entry(id, version);
    const current = verification.candidate;
    if (
      current.status !== "quarantined" &&
      current.status !== "conformance-passed"
    ) {
      throw new Error("Candidate conformance lifecycle is append-only.");
    }
    const { evaluateCandidateConformance } = await import("./conformance.js");
    const creationRef = entry.history[0];
    const creationReceiptRef = entry.receipts[0];
    if (creationRef === undefined || creationReceiptRef === undefined) {
      throw new Error("Candidate creation compare-and-set state is absent.");
    }
    const creation = parseCandidateCapability(
      this.store.getRecord(exactRef(creationRef)),
    );
    const creationReceipt = parseIntakeReceipt(
      this.store.getRecord(creationReceiptRef),
    );
    if (
      creation.status !== "quarantined" ||
      creation.id !== entry.id ||
      creation.version !== entry.version ||
      canonicalRecordDigest(creation) !== creationRef.digest ||
      creationReceipt.status !== "candidate-ready" ||
      creationReceipt.code !== "candidate-quarantined" ||
      creationReceipt.sequence !== 1 ||
      creationReceipt.parentDigests.length !== 1 ||
      creationReceipt.parentDigests[0] !== creationRef.digest ||
      creationReceipt.recordDigests[0] !== creationRef.digest ||
      candidateLookupId(creationReceiptRef.digest as Sha256Digest) !==
        creationRef.lookupId
    ) {
      throw new Error("Candidate creation compare-and-set state is invalid.");
    }
    const expected = evaluateCandidateConformance({
      candidate: creation,
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
    const indexedTerminal = this.#reader?.readReceipt(entry.jobId, 2);
    if (
      indexedTerminal !== undefined &&
      !entry.receipts.some(({ digest }) => digest === indexedTerminal.digest)
    ) {
      const indexedReceipt = parseIntakeReceipt(
        this.store.getRecord(indexedTerminal),
      );
      if (indexedReceipt.code !== "candidate-conformance-passed") {
        throw new Error("Candidate conformance lifecycle is append-only.");
      }
      const recovered = this.#loadReceiptAddressedEntry(
        candidateLookupId(indexedTerminal.digest as Sha256Digest),
        version,
      );
      const recoveredVerification = await this.verify(recovered.latest);
      if (!recoveredVerification.valid) {
        throw new Error("Candidate durable conformance retry is invalid.");
      }
      return recovered.latest;
    }
    const resultBytes = artifactBytes(expected);
    const resultDigest = digestBytes(resultBytes);
    const next = parseCandidateCapability({
      ...creation,
      parentDigests: unique([
        ...creation.parentDigests,
        creationRef.digest,
        resultDigest,
      ]),
      status: "conformance-passed",
      conformanceResultDigest: resultDigest,
    });
    if (
      current.status === "conformance-passed" &&
      canonicalJson(current) !== canonicalJson(next)
    ) {
      throw new Error(
        "Candidate conformance retry conflicts with the durable transition.",
      );
    }
    const nextDigest = canonicalRecordDigest(next);
    const receiptRecord: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: creation.createdAt,
      producerVersion: creation.producerVersion,
      parentDigests: [creationReceiptRef.digest, nextDigest],
      jobId: creationReceipt.jobId,
      sequence: 2,
      status: "candidate-ready",
      code: "candidate-conformance-passed",
      recordDigests: [
        nextDigest,
        resultDigest,
        entry.verificationStateRef.digest,
      ],
    };
    const parsedReceipt = parseIntakeReceipt(receiptRecord);
    const committed = commitCandidateTransition(this.store, {
      jobId: creationReceipt.jobId,
      expectedCreationReceipt: creationReceiptRef,
      expectedCandidate: exactRef(creationRef),
      candidate: next,
      receipt: parsedReceipt,
      evidenceBytes: resultBytes,
    });
    const stored = committed.candidate;
    const receipt = committed.receipt;
    const persistedCandidate = parseCandidateCapability(
      this.store.getRecord(exactRef(stored)),
    );
    const persistedReceipt = parseIntakeReceipt(this.store.getRecord(receipt));
    if (
      committed.evidence?.digest !== resultDigest ||
      canonicalJson(persistedCandidate) !== canonicalJson(next) ||
      canonicalJson(persistedReceipt) !== canonicalJson(parsedReceipt)
    ) {
      throw new Error(
        "Candidate conformance compare-and-set persistence drifted.",
      );
    }
    const nextRef: StoredCandidateRefV1 = {
      ...stored,
      kind: "candidate",
      id: next.id,
      version: next.version,
      status: next.status,
      lookupId: candidateLookupId(receipt.digest as Sha256Digest),
    };
    entry.latest = nextRef;
    if (!entry.history.some(({ digest }) => digest === nextRef.digest)) {
      entry.history.push(nextRef);
    }
    if (!entry.receipts.some(({ digest }) => digest === receipt.digest)) {
      entry.receipts.push(receipt);
    }
    return nextRef;
  }

  async recordBlocked(
    id: string,
    version: string,
  ): Promise<StoredCandidateRefV1> {
    return this.#recordTerminal(id, version, "blocked");
  }

  async recordRejected(
    id: string,
    version: string,
  ): Promise<StoredCandidateRefV1> {
    return this.#recordTerminal(id, version, "rejected");
  }

  async #recordTerminal(
    id: string,
    version: string,
    status: "blocked" | "rejected",
  ): Promise<StoredCandidateRefV1> {
    const verification = await this.verifyIdentity(id, version);
    if (!verification.valid || verification.candidate === undefined) {
      throw new Error(
        "Strict Candidate verification must pass before a lifecycle transition.",
      );
    }
    const entry = this.#entry(id, version);
    const current = verification.candidate;
    if (current.status !== "quarantined") {
      throw new Error("Candidate terminal lifecycle is append-only.");
    }
    const indexedTerminal = this.#reader?.readReceipt(entry.jobId, 2);
    if (
      indexedTerminal !== undefined &&
      !entry.receipts.some(({ digest }) => digest === indexedTerminal.digest)
    ) {
      throw new Error("Candidate terminal lifecycle is append-only.");
    }
    const creationRef = entry.history[0];
    const creationReceiptRef = entry.receipts[0];
    if (creationRef === undefined || creationReceiptRef === undefined) {
      throw new Error("Candidate creation compare-and-set state is absent.");
    }
    const creation = parseCandidateCapability(
      this.store.getRecord(exactRef(creationRef)),
    );
    const creationReceipt = parseIntakeReceipt(
      this.store.getRecord(creationReceiptRef),
    );
    if (
      creation.status !== "quarantined" ||
      canonicalJson(current) !== canonicalJson(creation) ||
      entry.latest.digest !== creationRef.digest ||
      canonicalRecordDigest(creation) !== creationRef.digest ||
      creationReceipt.status !== "candidate-ready" ||
      creationReceipt.code !== "candidate-quarantined" ||
      creationReceipt.sequence !== 1 ||
      creationReceipt.parentDigests.length !== 1 ||
      creationReceipt.parentDigests[0] !== creationRef.digest ||
      creationReceipt.recordDigests[0] !== creationRef.digest ||
      candidateLookupId(creationReceiptRef.digest as Sha256Digest) !==
        creationRef.lookupId
    ) {
      throw new Error("Candidate creation compare-and-set state is invalid.");
    }
    const next = parseCandidateCapability({
      ...creation,
      parentDigests: unique([...creation.parentDigests, creationRef.digest]),
      status,
    });
    const nextDigest = canonicalRecordDigest(next);
    const receiptRecord = parseIntakeReceipt({
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: creation.createdAt,
      producerVersion: creation.producerVersion,
      parentDigests: [creationReceiptRef.digest, nextDigest],
      jobId: creationReceipt.jobId,
      sequence: 2,
      status,
      code: `candidate-${status}`,
      recordDigests: [nextDigest, entry.verificationStateRef.digest],
    });
    const committed = commitCandidateTransition(this.store, {
      jobId: creationReceipt.jobId,
      expectedCreationReceipt: creationReceiptRef,
      expectedCandidate: exactRef(creationRef),
      candidate: next,
      receipt: receiptRecord,
    });
    const stored = committed.candidate;
    const receipt = committed.receipt;
    const persistedCandidate = parseCandidateCapability(
      this.store.getRecord(exactRef(stored)),
    );
    const persistedReceipt = parseIntakeReceipt(this.store.getRecord(receipt));
    if (
      canonicalJson(persistedCandidate) !== canonicalJson(next) ||
      canonicalJson(persistedReceipt) !== canonicalJson(receiptRecord)
    ) {
      throw new Error(
        "Candidate terminal compare-and-set persistence drifted.",
      );
    }
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
    let entry: CandidateEntry | undefined;
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
      entry = this.#entry(ref.lookupId, ref.version, true);
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
            this.#reader?.read("evidence", expectedDigest);
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
          this.#reader?.read("evidence", expectedDigest);
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
      } else if (
        candidate.status === "blocked" ||
        candidate.status === "rejected"
      ) {
        try {
          const priorCandidateRef = entry.history.at(-2);
          const receiptRef = entry.receipts.at(-1);
          const priorReceiptRef = entry.receipts.at(-2);
          if (
            priorCandidateRef === undefined ||
            receiptRef === undefined ||
            priorReceiptRef === undefined
          ) {
            throw new Error("Candidate terminal receipt chain is absent.");
          }
          const priorCandidate = parseCandidateCapability(
            this.store.getRecord(exactRef(priorCandidateRef)),
          );
          const expected = parseCandidateCapability({
            ...priorCandidate,
            parentDigests: unique([
              ...priorCandidate.parentDigests,
              priorCandidateRef.digest,
            ]),
            status: candidate.status,
          });
          const receipt = parseIntakeReceipt(this.store.getRecord(receiptRef));
          if (
            priorCandidate.status !== "quarantined" ||
            canonicalJson(candidate) !== canonicalJson(expected) ||
            receipt.jobId !== entry.jobId ||
            receipt.sequence !== 2 ||
            receipt.status !== candidate.status ||
            receipt.code !== `candidate-${candidate.status}` ||
            canonicalJson(receipt.parentDigests) !==
              canonicalJson([priorReceiptRef.digest, ref.digest]) ||
            canonicalJson(receipt.recordDigests) !==
              canonicalJson([ref.digest, entry.verificationStateRef.digest]) ||
            candidateLookupId(receiptRef.digest as Sha256Digest) !==
              ref.lookupId
          ) {
            throw new Error("Candidate terminal receipt binding drifted.");
          }
        } catch {
          issues.push("Candidate terminal receipt is invalid.");
        }
      }
    } catch {
      issues.push("Candidate record is absent, malformed, or digest-invalid.");
    }
    const valid = issues.length === 0;
    if (entry !== undefined) entry.verified = valid;
    return {
      valid,
      issues,
      ...(candidate === undefined ? {} : { candidate }),
    };
  }

  async verifyIdentity(
    id: string,
    version: string,
  ): Promise<CandidateVerificationResultV1> {
    const entry = this.#entry(id, version, true);
    return this.verify(entry.latest);
  }

  getRef(id: string, version: string): StoredCandidateRefV1 {
    return this.#entry(id, version).latest;
  }

  async getConformanceBundle(
    id: string,
    version: string,
  ): Promise<CandidateConformanceBundleV1> {
    const verification = await this.verifyIdentity(id, version);
    if (!verification.valid || verification.candidate === undefined) {
      throw new Error(
        "Strict Candidate verification must pass before conformance access.",
      );
    }
    const entry = this.#entry(id, version);
    const creationRef = entry.history[0];
    if (creationRef === undefined) {
      throw new Error("Candidate creation revision is absent.");
    }
    const creation = parseCandidateCapability(
      this.store.getRecord(exactRef(creationRef)),
    );
    if (creation.status !== "quarantined") {
      throw new Error("Candidate creation revision is invalid.");
    }
    const artifacts = parseArtifacts(entry.artifacts, creation);
    return {
      candidate: creation,
      artifacts: structuredClone(artifacts),
    };
  }

  #key(id: string, version: string): string {
    if (!OPAQUE_ID.test(id) || !VERSION.test(version)) {
      throw new TypeError("Candidate identity and version must be opaque.");
    }
    return `${id}@${version}`;
  }

  #entry(id: string, version: string, allowUnverified = false): CandidateEntry {
    const key = this.#key(id, version);
    const entry =
      this.#entries.get(key) ??
      [...this.#entries.values()].find(
        (candidate) =>
          candidate.version === version &&
          candidate.history.some(({ lookupId }) => lookupId === id),
      );
    if (entry !== undefined) {
      if (!allowUnverified && !entry.verified) {
        throw new Error(
          "Strict Candidate verification is required before access.",
        );
      }
      return entry;
    }
    if (!/^candidate-[a-f0-9]{64}$/u.test(id)) {
      throw new Error(`Unknown Candidate '${key}'.`);
    }
    const loaded = this.#loadReceiptAddressedEntry(id, version);
    if (!allowUnverified) {
      throw new Error(
        "Strict Candidate verification is required before access.",
      );
    }
    return loaded;
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
      !(
        (terminal.status === "candidate-ready" &&
          ["candidate-quarantined", "candidate-conformance-passed"].includes(
            terminal.code,
          )) ||
        (terminal.status === "blocked" &&
          terminal.code === "candidate-blocked") ||
        (terminal.status === "rejected" &&
          terminal.code === "candidate-rejected")
      ) ||
      terminal.recordDigests.length < 2
    ) {
      throw new Error("Candidate receipt-addressed reference is invalid.");
    }
    const indexedReceipt = this.#reader.readReceipt(
      terminal.jobId,
      terminal.sequence,
    );
    if (indexedReceipt?.digest !== terminalRef.digest) {
      throw new Error("Candidate receipt is not the indexed lifecycle winner.");
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
    if (terminal.code !== "candidate-quarantined") {
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
        throw new Error("Candidate terminal receipt has no prior receipt.");
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
    } else if (terminal.code === "candidate-conformance-passed") {
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
    } else {
      const expectedStatus =
        terminal.code === "candidate-blocked" ? "blocked" : "rejected";
      const expectedCurrent = parseCandidateCapability({
        ...creationCandidate,
        parentDigests: unique([
          ...creationCandidate.parentDigests,
          creationCandidateDigest,
        ]),
        status: expectedStatus,
      });
      if (
        terminal.jobId !== creation.jobId ||
        terminal.sequence !== 2 ||
        terminal.status !== expectedStatus ||
        canonicalJson(terminal.parentDigests) !==
          canonicalJson([creationRef.digest, terminal.recordDigests[0]]) ||
        canonicalJson(terminal.recordDigests) !==
          canonicalJson([terminal.recordDigests[0], verificationStateDigest]) ||
        canonicalJson(current) !== canonicalJson(expectedCurrent)
      ) {
        throw new Error("Candidate terminal receipt is inconsistent.");
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
      verified: false,
    };
    this.#entries.set(this.#key(current.id, current.version), loaded);
    return loaded;
  }
}
