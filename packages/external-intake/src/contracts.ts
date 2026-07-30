import { z } from "zod";

import type { Sha256Digest } from "./canonical.js";

const sensitiveKeyFragments = [
  "credential",
  "password",
  "rawprompt",
  "rawresponse",
  "sourcebody",
  "executablepath",
  "command",
] as const;

function assertNoSensitiveKeys(
  input: unknown,
  ancestors = new WeakSet<object>(),
): void {
  if (input === null || typeof input !== "object") {
    return;
  }
  if (ancestors.has(input)) {
    throw new TypeError("Intake records cannot contain cyclic objects.");
  }
  ancestors.add(input);
  try {
    for (const [key, value] of Object.entries(input)) {
      const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
      if (
        sensitiveKeyFragments.some((fragment) => normalized.includes(fragment))
      ) {
        throw new TypeError(`Sensitive intake field is prohibited: ${key}.`);
      }
      assertNoSensitiveKeys(value, ancestors);
    }
  } finally {
    ancestors.delete(input);
  }
}

const sha256DigestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/)
  .transform((value) => value as Sha256Digest);
const commitSchema = z.string().regex(/^[a-f0-9]{40}$/);
const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9-]*$/);
const versionSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/);
const dottedKeySchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/);
const symbolSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z_$][A-Za-z0-9_$.-]*$/);
const canonicalTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .refine((value) => {
    const timestamp = Date.parse(value);
    return (
      Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
    );
  }, "Timestamp must be a canonical UTC ISO-8601 instant.");

const persistentRecordProvenanceShape = {
  createdAt: canonicalTimestampSchema,
  producerVersion: versionSchema,
  parentDigests: z
    .array(sha256DigestSchema)
    .max(256)
    .refine(
      (digests) => new Set(digests).size === digests.length,
      "Parent digests must be unique.",
    ),
} as const;
const persistentRecordProvenanceSchema = z
  .object(persistentRecordProvenanceShape)
  .strict();

const unsafeWindowsName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const relativePathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine((path) => !path.includes("\\"), "Paths must use POSIX separators.")
  .refine((path) => !path.startsWith("/"), "Paths must be relative.")
  .refine((path) => !path.includes("\0"), "Paths cannot contain NUL.")
  .refine((path) => {
    const segments = path.split("/");
    return segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !/[<>:"|?*\u0000-\u001f]/u.test(segment) &&
        !unsafeWindowsName.test(segment) &&
        !/[.: ]$/u.test(segment),
    );
  }, "Path contains an unsafe segment.");

function canonicalRepositoryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/u.test(url.pathname) &&
      url.toString() === value
    );
  } catch {
    return false;
  }
}

const canonicalRepositoryUrlSchema = z
  .string()
  .max(512)
  .refine(
    canonicalRepositoryUrl,
    "Repository URL must be canonical public GitHub HTTPS.",
  );

const canonicalHttpsUrlSchema = z
  .string()
  .max(1024)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.port === "" &&
        url.username === "" &&
        url.password === "" &&
        url.search === "" &&
        url.hash === "" &&
        url.toString() === value
      );
    } catch {
      return false;
    }
  }, "Evidence URL must be canonical HTTPS without credentials, query, or fragment.");

const fixedReferenceSchema = z
  .string()
  .min(1)
  .max(128)
  .refine((value) => {
    if (/^[a-f0-9]{40}$/.test(value)) {
      return true;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._@/-]*$/.test(value) || !/\d/.test(value)) {
      return false;
    }
    if (
      /^(?:head|main|master|develop|development|trunk|latest)$/i.test(value)
    ) {
      return false;
    }
    return (
      !value.startsWith("refs/") &&
      !value.startsWith("pull/") &&
      !value.includes("//") &&
      !value.includes("..") &&
      !value.endsWith("/")
    );
  }, "Reference must be an exact tag or lower-case full commit.");

function uniqueBy<T>(values: readonly T[], key: (value: T) => string): boolean {
  return new Set(values.map(key)).size === values.length;
}

const requestedModuleSchema = z
  .object({
    path: relativePathSchema,
    symbol: symbolSchema.optional(),
  })
  .strict();

export const intakeRequestSchema = z
  .object({
    apiVersion: z.literal("factory.external-intake-request/v1"),
    ...persistentRecordProvenanceShape,
    source: z
      .object({
        canonicalRepositoryUrl: canonicalRepositoryUrlSchema,
        requestedRef: fixedReferenceSchema,
        expectedCommit: commitSchema.optional(),
        portfolioRecord: opaqueIdSchema.optional(),
      })
      .strict(),
    classification: z.enum(["direct-dependency", "source-study", "provider"]),
    requestedModules: z
      .array(requestedModuleSchema)
      .max(256)
      .refine(
        (modules) =>
          uniqueBy(modules, ({ path, symbol }) => `${path}\0${symbol ?? ""}`),
        "Requested modules must be unique.",
      ),
    allowNetworkRetrieval: z.literal(true),
  })
  .strict()
  .refine(
    ({ parentDigests }) => parentDigests.length === 0,
    "Intake requests cannot declare parent records.",
  );

const originEvidenceSchema = z
  .object({
    url: canonicalHttpsUrlSchema,
    retrievedAt: canonicalTimestampSchema,
    digest: sha256DigestSchema,
  })
  .strict();

export const sourceSnapshotSchema = z
  .object({
    apiVersion: z.literal("factory.external-source-snapshot/v1"),
    ...persistentRecordProvenanceShape,
    repositoryUrl: canonicalRepositoryUrlSchema,
    requestedRef: fixedReferenceSchema,
    resolvedCommit: commitSchema,
    retrievedAt: canonicalTimestampSchema,
    archiveDigest: sha256DigestSchema,
    treeDigest: sha256DigestSchema,
    includedPaths: z
      .array(relativePathSchema)
      .max(100_000)
      .refine(
        (paths) => uniqueBy(paths, (path) => path),
        "Included paths must be unique.",
      ),
    excludedPaths: z
      .array(relativePathSchema)
      .max(100_000)
      .refine(
        (paths) => uniqueBy(paths, (path) => path),
        "Excluded paths must be unique.",
      ),
    originEvidence: z
      .array(originEvidenceSchema)
      .min(1)
      .max(256)
      .refine(
        (evidence) => uniqueBy(evidence, ({ url }) => url),
        "Origin evidence URLs must be unique.",
      ),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.parentDigests.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source snapshots require a parent Intake request digest.",
        path: ["parentDigests"],
      });
    }
    const included = new Set(snapshot.includedPaths);
    for (const path of snapshot.excludedPaths) {
      if (included.has(path)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A path cannot be both included and excluded.",
          path: ["excludedPaths"],
        });
      }
    }
  });

const noticeSchema = z
  .object({
    path: relativePathSchema,
    digest: sha256DigestSchema,
    required: z.boolean(),
  })
  .strict();
const scanSchema = z
  .object({
    kind: z.enum(["licence", "secret", "sast", "dependency"]),
    tool: opaqueIdSchema,
    toolVersion: z.string().min(1).max(64),
    rulesetDigest: sha256DigestSchema,
    resultDigest: sha256DigestSchema,
    status: z.enum(["pass", "fail", "unavailable"]),
  })
  .strict();

export const evidenceBundleSchema = z
  .object({
    apiVersion: z.literal("factory.external-evidence/v1"),
    ...persistentRecordProvenanceShape,
    snapshotDigest: sha256DigestSchema,
    licence: z
      .object({
        primaryPaths: z
          .array(relativePathSchema)
          .min(1)
          .refine(
            (paths) => uniqueBy(paths, (path) => path),
            "Licence paths must be unique.",
          ),
        textDigests: z
          .array(sha256DigestSchema)
          .min(1)
          .refine(
            (digests) => uniqueBy(digests, (digest) => digest),
            "Licence digests must be unique.",
          ),
        scannerExpression: z.string().min(1).max(256).optional(),
        manualStatus: z.enum(["unreviewed", "approved", "rejected"]),
      })
      .strict(),
    notices: z
      .array(noticeSchema)
      .max(10_000)
      .refine(
        (notices) => uniqueBy(notices, ({ path }) => path),
        "Notice paths must be unique.",
      ),
    sbom: z
      .object({
        format: z.literal("CycloneDX"),
        digest: sha256DigestSchema,
        components: z.number().int().nonnegative().finite(),
      })
      .strict(),
    scans: z
      .array(scanSchema)
      .length(4)
      .refine(
        (scans) => uniqueBy(scans, ({ kind }) => kind),
        "Scan kinds must be unique.",
      ),
    ast: z
      .object({
        parser: opaqueIdSchema,
        parserVersion: z.string().min(1).max(64),
        inventoryDigest: sha256DigestSchema,
      })
      .strict(),
  })
  .strict()
  .refine(
    ({ parentDigests, snapshotDigest }) =>
      parentDigests.includes(snapshotDigest),
    {
      message: "Evidence parent digests must include its snapshot digest.",
      path: ["parentDigests"],
    },
  );

const selectedModuleSchema = z
  .object({
    path: relativePathSchema,
    symbol: symbolSchema.optional(),
    digest: sha256DigestSchema,
    purpose: z.enum(["reference", "proposed-copy", "adapter-contract"]),
  })
  .strict();

const requiredCandidateProhibitions = [
  "capability-selection",
  "golden-registration",
  "graph-mutation",
  "compilation",
] as const;

export const candidateCapabilitySchema = z
  .object({
    apiVersion: z.literal("factory.candidate-capability/v1"),
    ...persistentRecordProvenanceShape,
    id: opaqueIdSchema,
    version: versionSchema,
    status: z.enum([
      "quarantined",
      "conformance-passed",
      "blocked",
      "rejected",
    ]),
    sourceSnapshotDigest: sha256DigestSchema,
    evidenceDigest: sha256DigestSchema,
    proposedFactoryKey: dottedKeySchema,
    proposedClassification: z.enum([
      "dependency",
      "source-fragment",
      "provider-adapter",
    ]),
    selectedModules: z
      .array(selectedModuleSchema)
      .max(256)
      .refine(
        (modules) =>
          uniqueBy(modules, ({ path, symbol }) => `${path}\0${symbol ?? ""}`),
        "Selected modules must be unique.",
      ),
    allowedOutputs: z
      .array(z.enum(["manifest", "fixture", "adapter", "conformance-plan"]))
      .min(1)
      .max(4)
      .refine(
        (outputs) => uniqueBy(outputs, (output) => output),
        "Allowed outputs must be unique.",
      ),
    prohibited: z
      .array(opaqueIdSchema)
      .min(1)
      .refine(
        (items) => uniqueBy(items, (item) => item),
        "Prohibitions must be unique.",
      ),
    candidateManifestDigest: sha256DigestSchema,
    fixtureDigest: sha256DigestSchema,
    adapterDigest: sha256DigestSchema.optional(),
    conformanceResultDigest: sha256DigestSchema.optional(),
  })
  .strict()
  .superRefine((candidate, context) => {
    for (const parent of [
      candidate.sourceSnapshotDigest,
      candidate.evidenceDigest,
    ]) {
      if (!candidate.parentDigests.includes(parent)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Candidate parent digests must include snapshot and evidence.",
          path: ["parentDigests"],
        });
      }
    }
    const prohibitions = new Set(candidate.prohibited);
    for (const required of requiredCandidateProhibitions) {
      if (!prohibitions.has(required)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Candidate must prohibit ${required}.`,
          path: ["prohibited"],
        });
      }
    }
  });

const sourceCopySchema = z
  .object({
    path: relativePathSchema,
    lineRanges: z
      .array(z.string().regex(/^\d+(?:-\d+)?$/))
      .min(1)
      .refine(
        (ranges) => uniqueBy(ranges, (range) => range),
        "Line ranges must be unique.",
      ),
    purpose: z.string().min(1).max(256),
  })
  .strict();

export const promotionDecisionSchema = z
  .object({
    apiVersion: z.literal("factory.external-capability-promotion/v1"),
    ...persistentRecordProvenanceShape,
    candidateDigest: sha256DigestSchema,
    decision: z.enum(["promoted", "rejected"]),
    reviewedBy: z
      .array(opaqueIdSchema)
      .min(1)
      .refine(
        (reviewers) => uniqueBy(reviewers, (reviewer) => reviewer),
        "Reviewers must be unique.",
      ),
    reviewedAt: canonicalTimestampSchema,
    sourceCopy: z
      .array(sourceCopySchema)
      .max(256)
      .refine(
        (items) => uniqueBy(items, ({ path }) => path),
        "Source-copy paths must be unique.",
      ),
    licenceDecision: z.enum(["compatible", "incompatible"]),
    noticesDestination: relativePathSchema.optional(),
    replacementPath: relativePathSchema,
    goldenAsset: z
      .object({
        key: dottedKeySchema,
        version: versionSchema,
        manifestDigest: sha256DigestSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    ({ candidateDigest, parentDigests }) =>
      parentDigests.includes(candidateDigest),
    {
      message: "Promotion parent digests must include its Candidate digest.",
      path: ["parentDigests"],
    },
  );

export const intakeReceiptSchema = z
  .object({
    apiVersion: z.literal("factory.external-intake-receipt/v1"),
    ...persistentRecordProvenanceShape,
    jobId: opaqueIdSchema,
    sequence: z.number().int().positive().finite(),
    status: z.enum([
      "requested",
      "resolved",
      "snapshotted",
      "evidenced",
      "scanned",
      "inventoried",
      "candidate-ready",
      "blocked",
      "rejected",
    ]),
    code: opaqueIdSchema,
    recordDigests: z
      .array(sha256DigestSchema)
      .max(256)
      .refine(
        (digests) => uniqueBy(digests, (digest) => digest),
        "Record digests must be unique.",
      ),
  })
  .strict();

export type IntakeRequestV1 = z.infer<typeof intakeRequestSchema>;
export type SourceSnapshotV1 = z.infer<typeof sourceSnapshotSchema>;
export type EvidenceBundleV1 = z.infer<typeof evidenceBundleSchema>;
export type CandidateCapabilityV1 = z.infer<typeof candidateCapabilitySchema>;
export type PromotionDecisionV1 = z.infer<typeof promotionDecisionSchema>;
export type IntakeReceiptV1 = z.infer<typeof intakeReceiptSchema>;
export type PersistentRecordProvenanceV1 = z.infer<
  typeof persistentRecordProvenanceSchema
>;

export type IntakeRecordKind =
  "request" | "snapshot" | "evidence" | "candidate" | "promotion" | "receipt";
export type IntakeRecordV1 =
  | IntakeRequestV1
  | SourceSnapshotV1
  | EvidenceBundleV1
  | CandidateCapabilityV1
  | PromotionDecisionV1
  | IntakeReceiptV1;

function parseStrict<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  assertNoSensitiveKeys(input);
  return schema.parse(input) as z.output<TSchema>;
}

export function parseIntakeRequest(input: unknown): IntakeRequestV1 {
  return parseStrict(intakeRequestSchema, input);
}

export function parseSourceSnapshot(input: unknown): SourceSnapshotV1 {
  return parseStrict(sourceSnapshotSchema, input);
}

export function parseEvidenceBundle(input: unknown): EvidenceBundleV1 {
  return parseStrict(evidenceBundleSchema, input);
}

export function parseCandidateCapability(
  input: unknown,
): CandidateCapabilityV1 {
  return parseStrict(candidateCapabilitySchema, input);
}

export function parsePromotionDecision(input: unknown): PromotionDecisionV1 {
  return parseStrict(promotionDecisionSchema, input);
}

export function parseIntakeReceipt(input: unknown): IntakeReceiptV1 {
  return parseStrict(intakeReceiptSchema, input);
}

export function parseIntakeRecord(
  kind: IntakeRecordKind,
  input: unknown,
): IntakeRecordV1 {
  switch (kind) {
    case "request":
      return parseIntakeRequest(input);
    case "snapshot":
      return parseSourceSnapshot(input);
    case "evidence":
      return parseEvidenceBundle(input);
    case "candidate":
      return parseCandidateCapability(input);
    case "promotion":
      return parsePromotionDecision(input);
    case "receipt":
      return parseIntakeReceipt(input);
  }
}

export const intakeContractPrimitives = {
  opaqueIdSchema,
  sha256DigestSchema,
  canonicalTimestampSchema,
  versionSchema,
  canonicalRepositoryUrlSchema,
  canonicalHttpsUrlSchema,
  fixedReferenceSchema,
} as const;
