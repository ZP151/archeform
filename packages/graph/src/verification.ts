import { z } from "zod";

/**
 * Versioned verification contracts for the P0 isolated verifier.
 *
 * Evidence is allowlisted and digest-addressed: statuses, bounded summaries,
 * role/action names, artifact digests, and cleanup facts. Credential-like
 * assignments, raw prompts/responses, unbounded text, and untrusted paths are
 * rejected fail closed before any run, evidence bundle, diagnosis, or Draft
 * Diff can be persisted.
 */

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9-]*$/);

const fieldKey = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-zA-Z0-9_]*$/);

const factoryId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9-]+$/);

const sha256Digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/);

/** Credential-like assignments with plain keys must never reach persisted evidence. */
const credentialLikeAssignment =
  /\b(?:authorization|set-cookie|cookie|api[_-]?key|pass(?:word|wd|words)?|secret|private[_-]?key|bearer|access[_-]?token|refresh[_-]?token|token)\b\s*[:=]/i;

/**
 * Env-style compound keys, e.g. `AWS_SECRET_ACCESS_KEY=`, `Secret_Access_Key=`,
 * or `client_secret=` — the credential keyword is embedded in a longer key
 * token. Conservative by design: evidence is allowlisted prose, so any
 * key-like token followed by an assignment fails closed (this deliberately
 * also rejects benign-looking tokens such as `monkey=banana`; that behavior
 * is guarded by test).
 */
const compoundCredentialKey =
  /\b[a-z0-9_]*(?:secret|password|passwd|pass|token|key|auth)[a-z0-9_]*\s*[:=]/i;

/** Separator-less bearer forms, e.g. `Bearer xyz` or `Authorization Bearer xyz`. */
const bareBearerForm = /\bbearer\b/i;

/**
 * Separator-less Basic credentials, e.g. `Basic dXNlcjpwYXNz`. The token must
 * be at least four characters (base64 of any user:password pair is) and
 * contain an uppercase letter, digit, or `+`/`/` anywhere — real base64
 * always does — so prose like `basic health check`, `Basic requirements`, or
 * `basic API contract` stays accepted. Deliberately not case-insensitive: the
 * discriminator needs a real uppercase character.
 */
const bareBasicCredential =
  /\b[bB]asic\s+(?=[a-zA-Z0-9+/]{4,}={0,2}\b)[a-zA-Z0-9+/]*[A-Z0-9+/][a-zA-Z0-9+/]*={0,2}\b/;

/**
 * Bounded, redacted evidence text. It is a backstop on top of allowlisted
 * evidence construction: probes may only summarize statuses and declared
 * role/action names, never full bodies, headers, or process output.
 */
const safeBoundedString = z
  .string()
  .min(1)
  .max(400)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: "Evidence cannot contain control characters.",
  })
  .refine(
    (value) =>
      !credentialLikeAssignment.test(value) &&
      !compoundCredentialKey.test(value) &&
      !bareBearerForm.test(value) &&
      !bareBasicCredential.test(value),
    {
      message: "Redact credential-like assignments from evidence.",
    },
  );

const stepIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

const roleActionName = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/);

const graphRoots = [
  "page",
  "domain",
  "policy",
  "flow",
  "integration",
  "experience",
  "metadata",
] as const;

/**
 * A bounded Graph JSON path. Only the mutable Graph roots are accepted; source
 * paths, URLs, and traversal segments are rejected.
 */
const graphEvidencePath = z
  .string()
  .min(2)
  .max(200)
  .regex(/^\/(?:[a-zA-Z0-9._~-]+(?:\/[a-zA-Z0-9._~-]+)*)$/)
  .refine(
    (path) =>
      path
        .split("/")
        .slice(1)
        .every(
          (segment) =>
            segment !== "." &&
            segment !== ".." &&
            segment !== "__proto__" &&
            segment !== "constructor" &&
            segment !== "prototype",
        ) &&
      graphRoots.includes(path.split("/")[1] as (typeof graphRoots)[number]),
    { message: "Affected paths must be mutable Graph paths." },
  );

/**
 * A generated artifact path from the immutable Compilation manifest. It is
 * relative, forward-slash only, and contains no traversal segments.
 */
const generatedArtifactPath = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/)
  .refine(
    (path) =>
      path
        .split("/")
        .every(
          (segment) => segment !== "." && segment !== ".." && segment !== "",
        ),
    { message: "Artifact paths must stay inside the generated bundle." },
  );

export const verificationStepKindSchema = z.enum([
  "migration",
  "health",
  "api",
  "role-journey",
  "authorization-denial",
  "idempotency",
  "immutable-snapshot",
  "cleanup",
]);
export type VerificationStepKindV1 = z.infer<typeof verificationStepKindSchema>;

export const verificationStepStatusSchema = z.enum([
  "passed",
  "failed",
  "skipped",
]);
export type VerificationStepStatusV1 = z.infer<
  typeof verificationStepStatusSchema
>;

export const verificationStepSchema = z
  .object({
    stepId: stepIdSchema,
    kind: verificationStepKindSchema,
    status: verificationStepStatusSchema,
    summary: safeBoundedString,
    httpStatus: z.number().int().min(100).max(599).optional(),
    role: roleActionName.optional(),
    action: roleActionName.optional(),
    digest: sha256Digest.optional(),
    failureCode: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9._-]*$/)
      .optional(),
    durationMs: z.number().int().min(0).max(86_400_000).optional(),
  })
  .strict();
export type VerificationStepV1 = z.infer<typeof verificationStepSchema>;

export const verificationRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export type VerificationRunStatusV1 = z.infer<
  typeof verificationRunStatusSchema
>;

export const verificationRunSchema = z
  .object({
    apiVersion: z.literal("factory.verification-run/v1"),
    verificationRunId: factoryId,
    compilationDigest: sha256Digest,
    profileKey: identifier,
    status: verificationRunStatusSchema,
    startedAt: isoDateTime,
    completedAt: isoDateTime.optional(),
    stepIds: z.array(stepIdSchema).max(100),
  })
  .strict();
export type VerificationRunV1 = z.infer<typeof verificationRunSchema>;

export const verificationEvidenceSchema = z
  .object({
    apiVersion: z.literal("factory.verification-evidence/v1"),
    verificationRunId: factoryId,
    compilationDigest: sha256Digest,
    steps: z.array(verificationStepSchema).min(1).max(100),
    cleanup: z
      .object({
        succeeded: z.boolean(),
        summary: safeBoundedString,
      })
      .strict(),
    artifactDigests: z
      .array(
        z
          .object({
            path: generatedArtifactPath,
            digest: sha256Digest,
          })
          .strict(),
      )
      .max(200),
    completedAt: isoDateTime,
  })
  .strict();
export type VerificationEvidenceV1 = z.infer<typeof verificationEvidenceSchema>;

const graphSymbol = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9._-]*$/);

/** Capability package keys are dotted identifiers, e.g. `core.crud`. */
const capabilityKey = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9.-]*$/);

/**
 * The only Draft Diff operations a diagnosis may propose. There is no source
 * path, URL, shell command, or arbitrary JSON patch: every operation targets
 * a named Graph input, binding, or field constraint.
 */
export const draftDiffOperationSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("replace-input"),
      entity: identifier,
      field: fieldKey,
      value: z.union([z.string(), z.number(), z.boolean()]),
    })
    .strict(),
  z
    .object({
      op: z.literal("add-binding"),
      capability: capabilityKey,
      graphSymbol,
    })
    .strict(),
  z
    .object({
      op: z.literal("remove-binding"),
      capability: capabilityKey,
      graphSymbol,
    })
    .strict(),
  z
    .object({
      op: z.literal("change-constraint"),
      entity: identifier,
      field: fieldKey,
      constraint: z.enum(["required", "unique", "type"]),
      value: z.union([z.string(), z.boolean()]),
    })
    .strict(),
]);
export type DraftDiffOperationV1 = z.infer<typeof draftDiffOperationSchema>;

export const draftDiffSchema = z
  .object({
    apiVersion: z.literal("factory.draft-diff/v1"),
    baseDraftRevisionId: factoryId,
    baseGraphHash: sha256Digest,
    operations: z.array(draftDiffOperationSchema).min(1).max(20),
    affectedPaths: z.array(graphEvidencePath).min(1).max(20),
    rationaleCode: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9.-]*$/),
    summary: safeBoundedString,
  })
  .strict();
export type DraftDiffV1 = z.infer<typeof draftDiffSchema>;

export const diagnosisSchema = z
  .object({
    apiVersion: z.literal("factory.verification-diagnosis/v1"),
    diagnosisId: factoryId,
    verificationRunId: factoryId,
    category: z.enum([
      "graph",
      "capability",
      "binding",
      "target",
      "runtime",
      "unknown",
    ]),
    code: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9._-]*$/),
    summary: safeBoundedString,
    affectedPaths: z.array(graphEvidencePath).min(1).max(20),
    draftDiff: draftDiffSchema.nullable(),
  })
  .strict();
export type DiagnosisV1 = z.infer<typeof diagnosisSchema>;

export class VerificationContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "VerificationContractError";
  }
}

function parseContract<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new VerificationContractError(
      result.error.issues[0]?.message ?? "Invalid verification record.",
    );
  }
  return result.data;
}

export function parseVerificationRun(input: unknown): VerificationRunV1 {
  const run = parseContract(verificationRunSchema, input);
  if (new Set(run.stepIds).size !== run.stepIds.length) {
    throw new VerificationContractError(
      "Verification run contains duplicate step IDs.",
    );
  }
  return run;
}

/**
 * Parses an evidence bundle. When the owning run is supplied, the evidence
 * must bind to the exact run identity, compilation digest, and ordered step
 * IDs; any mismatch fails closed.
 */
export function parseVerificationEvidence(
  input: unknown,
  run?: VerificationRunV1,
): VerificationEvidenceV1 {
  const evidence = parseContract(verificationEvidenceSchema, input);
  const stepIds = evidence.steps.map((step) => step.stepId);
  if (new Set(stepIds).size !== stepIds.length) {
    throw new VerificationContractError(
      "Evidence contains duplicate step IDs.",
    );
  }
  if (run) {
    if (run.verificationRunId !== evidence.verificationRunId) {
      throw new VerificationContractError(
        "Evidence run identity does not match the verification run.",
      );
    }
    if (run.compilationDigest !== evidence.compilationDigest) {
      throw new VerificationContractError(
        "Evidence compilation digest does not match the verification run.",
      );
    }
    if (
      run.stepIds.length !== stepIds.length ||
      run.stepIds.some((id, index) => id !== stepIds[index])
    ) {
      throw new VerificationContractError(
        "Evidence steps do not match the verification run step IDs.",
      );
    }
  }
  return evidence;
}

export function parseDraftDiff(input: unknown): DraftDiffV1 {
  return parseContract(draftDiffSchema, input);
}

export function parseDiagnosis(input: unknown): DiagnosisV1 {
  return parseContract(diagnosisSchema, input);
}

/**
 * A retry is idempotent by verification run identity and immutable Compilation
 * digest. Reusing a run identity with a different digest is a conflicting
 * retry and fails closed.
 */
export function assertConsistentVerificationRetry(
  prior: {
    readonly verificationRunId: string;
    readonly compilationDigest: string;
  },
  candidate: {
    readonly verificationRunId: string;
    readonly compilationDigest: string;
  },
): void {
  if (
    prior.verificationRunId === candidate.verificationRunId &&
    prior.compilationDigest !== candidate.compilationDigest
  ) {
    throw new VerificationContractError(
      "Conflicting retry identity: the verification run ID is already bound to a different compilation digest.",
    );
  }
}
