import { createHash } from "node:crypto";

import type { PublishedGraphInput } from "@factory/compiler";
import {
  parseVerificationEvidence,
  parseVerificationRun,
  verificationStepKindSchema,
  verificationStepSchema,
  type VerificationEvidenceV1,
  type VerificationRunV1,
  type VerificationStepV1,
} from "@factory/graph";

import type { executeCompilation } from "../compilation-executor.js";
import { safeArtifactManifest } from "../preview-runner.js";
import {
  VerificationEnvironment,
  VerificationLifecycleError,
  type VerificationEnvironmentOptions,
} from "./verification-environment.js";

export { VerificationLifecycleError };

const stepIdPattern = /^[a-z0-9-]{1,64}$/;
const factoryIdPattern = /^[a-z0-9-]{1,128}$/;
const profileKeyPattern = /^[a-z][a-z0-9-]{0,127}$/;
const sha256DigestPattern = /^sha256:[a-f0-9]{64}$/;
const minimumOperationTimeoutMs = 1_000;
const maximumOperationTimeoutMs = 3_600_000;
const maximumStepPlanLength = 99;
const boundedFailureSummaryLength = 180;

export type VerificationStepPlanEntry = {
  readonly stepId: string;
  readonly kind: VerificationStepV1["kind"];
};

export type VerificationLifecycleInput = {
  readonly verificationRunId: string;
  readonly profileKey: string;
  /** The immutable Published Graph input; draft-shaped inputs are rejected. */
  readonly compilation: PublishedGraphInput;
  /** The immutable compilation digest the run identity is bound to. */
  readonly expectedCompilationDigest: string;
  readonly stepPlan: readonly VerificationStepPlanEntry[];
};

export type VerificationLifecycleDependencies = {
  readonly artifactRoot: string;
  /** Bounded lifecycle timeout; unbounded timeouts are rejected. */
  readonly operationTimeoutMs: number;
  readonly executeCompilation: typeof executeCompilation;
  readonly startPreviewRun: VerificationEnvironmentOptions["startPreviewRun"];
  readonly stopPreviewRun: VerificationEnvironmentOptions["stopPreviewRun"];
  readonly runProbe: (
    entry: VerificationStepPlanEntry,
    environment: VerificationEnvironment,
    signal: AbortSignal,
  ) => Promise<VerificationStepV1>;
  readonly now?: () => string;
  readonly nowMs?: () => number;
};

/**
 * Derives the immutable compilation digest: the canonical hash of the graph
 * hash and the sorted artifact manifest (path, digest, sizeBytes). Ordering
 * is normalized so the digest is deterministic across materializations.
 */
export function deriveCompilationDigest(
  graphHash: string,
  artifacts: readonly { path: string; digest: string; sizeBytes: number }[],
): string {
  const canonical = JSON.stringify({
    graphHash,
    artifacts: [...artifacts]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(({ path, digest, sizeBytes }) => ({ path, digest, sizeBytes })),
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function lifecycleError(
  code: string,
  message: string,
): VerificationLifecycleError {
  return new VerificationLifecycleError(code, message);
}

/**
 * The lifecycle accepts the immutable Published Graph input only. Draft-shaped
 * input (a missing publication ID, or any unknown field) fails closed before
 * compilation starts.
 */
function assertImmutablePublishedInput(input: PublishedGraphInput): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw lifecycleError(
      "invalid_input",
      "Verification input is not a record.",
    );
  }
  const record = input as unknown as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !==
    "compositionLock,graph,publishedRevisionId"
  ) {
    throw lifecycleError(
      "invalid_input",
      "Verification input must be an immutable Published Graph.",
    );
  }
  if (
    typeof record.publishedRevisionId !== "string" ||
    record.publishedRevisionId.length === 0 ||
    !record.graph ||
    typeof record.graph !== "object" ||
    !record.compositionLock ||
    typeof record.compositionLock !== "object"
  ) {
    throw lifecycleError(
      "invalid_input",
      "Verification input must be an immutable Published Graph.",
    );
  }
}

function boundedErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, " ").trim();
  return (
    cleaned.slice(0, boundedFailureSummaryLength) ||
    "The preview runner failed."
  );
}

function skippedStep(
  entry: VerificationStepPlanEntry,
  summary: string,
): VerificationStepV1 {
  return {
    stepId: entry.stepId,
    kind: entry.kind,
    status: "skipped",
    summary,
  };
}

function crashedStep(entry: VerificationStepPlanEntry): VerificationStepV1 {
  return {
    stepId: entry.stepId,
    kind: entry.kind,
    status: "failed",
    failureCode: "probe.crashed",
    summary: "Probe crashed without returning evidence.",
  };
}

function abortSignal(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

/**
 * Runs the isolated verification lifecycle: compile the immutable Published
 * Graph, boot the isolated preview, run the declared probes in order, and
 * ALWAYS clean up. Boot and probe failures are recorded as skipped/failed
 * steps in the evidence — never fabricated as probe results — and cleanup
 * outcomes are reported truthfully in the evidence cleanup facts.
 */
export async function runVerificationLifecycle(
  input: VerificationLifecycleInput,
  dependencies: VerificationLifecycleDependencies,
): Promise<VerificationEvidenceV1> {
  assertImmutablePublishedInput(input.compilation);

  if (!factoryIdPattern.test(input.verificationRunId)) {
    throw lifecycleError(
      "invalid_input",
      "Verification run ID is not Factory-derived.",
    );
  }
  if (!profileKeyPattern.test(input.profileKey)) {
    throw lifecycleError(
      "invalid_input",
      "Profile key is not Factory-derived.",
    );
  }
  if (!sha256DigestPattern.test(input.expectedCompilationDigest)) {
    throw lifecycleError(
      "invalid_input",
      "Expected compilation digest is not sha256.",
    );
  }
  const { operationTimeoutMs } = dependencies;
  if (
    !Number.isInteger(operationTimeoutMs) ||
    operationTimeoutMs < minimumOperationTimeoutMs ||
    operationTimeoutMs > maximumOperationTimeoutMs
  ) {
    throw lifecycleError(
      "invalid_timeout",
      "The lifecycle timeout must be bounded between 1s and 1h.",
    );
  }
  if (
    !Array.isArray(input.stepPlan) ||
    input.stepPlan.length === 0 ||
    input.stepPlan.length > maximumStepPlanLength
  ) {
    throw lifecycleError(
      "invalid_input",
      "The verification step plan is empty or unbounded.",
    );
  }
  const stepIds = new Set<string>();
  for (const entry of input.stepPlan) {
    if (
      !stepIdPattern.test(entry.stepId) ||
      entry.kind === "cleanup" ||
      !verificationStepKindSchema.safeParse(entry.kind).success ||
      stepIds.has(entry.stepId)
    ) {
      throw lifecycleError(
        "invalid_input",
        "The verification step plan is not allowlisted.",
      );
    }
    stepIds.add(entry.stepId);
  }

  const now = dependencies.now ?? (() => new Date().toISOString());
  const nowMs = dependencies.nowMs ?? (() => performance.now());
  const startedAt = now();

  const compilation = await dependencies.executeCompilation(
    dependencies.artifactRoot,
    input.compilation,
  );

  const compilationDigest = deriveCompilationDigest(
    compilation.graphHash,
    compilation.artifacts,
  );
  if (compilationDigest !== input.expectedCompilationDigest) {
    throw lifecycleError(
      "compilation_digest_mismatch",
      "The compiled artifacts do not match the immutable compilation digest.",
    );
  }

  let manifest: VerificationEnvironmentOptions["artifacts"];
  try {
    manifest = safeArtifactManifest(compilation.artifacts);
  } catch {
    throw lifecycleError(
      "invalid_artifact_manifest",
      "The compiled artifact manifest is untrusted.",
    );
  }

  const previewRunId = `preview-${input.verificationRunId}`;
  const run: VerificationRunV1 = {
    apiVersion: "factory.verification-run/v1",
    verificationRunId: input.verificationRunId,
    compilationDigest,
    profileKey: input.profileKey,
    status: "running",
    startedAt,
    stepIds: [...input.stepPlan.map((entry) => entry.stepId), "cleanup"],
  };
  parseVerificationRun(run);

  const environment = new VerificationEnvironment({
    artifactRoot: dependencies.artifactRoot,
    previewRunId,
    rootDirectory: compilation.rootDirectory,
    composeProjectName: `factory-preview-${previewRunId}`,
    artifacts: manifest,
    operationTimeoutMs,
    startPreviewRun: dependencies.startPreviewRun,
    stopPreviewRun: dependencies.stopPreviewRun,
    nowMs,
  });

  const probeSteps: VerificationStepV1[] = [];
  let environmentFailed = false;
  let probeAborted = false;

  try {
    await environment.boot();
  } catch {
    environmentFailed = true;
  }

  for (const entry of input.stepPlan) {
    let step: VerificationStepV1;
    if (environmentFailed) {
      step = skippedStep(
        entry,
        "Probe was skipped because the isolated environment did not start.",
      );
    } else if (probeAborted) {
      step = skippedStep(
        entry,
        "Probe was skipped after an earlier probe failed.",
      );
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), operationTimeoutMs);
      try {
        const raced = await Promise.race([
          dependencies
            .runProbe(entry, environment, controller.signal)
            .then((probeStep) => ({ outcome: "step", probeStep }) as const),
          abortSignal(controller.signal).then(
            () => ({ outcome: "timeout" }) as const,
          ),
        ]);
        if (raced.outcome === "timeout") {
          step = skippedStep(
            entry,
            "Probe did not finish before the lifecycle timeout.",
          );
        } else {
          const parsed = verificationStepSchema.safeParse(raced.probeStep);
          if (
            !parsed.success ||
            parsed.data.stepId !== entry.stepId ||
            parsed.data.kind !== entry.kind
          ) {
            throw lifecycleError(
              "invalid_step",
              "Probe evidence is not contract-shaped.",
            );
          }
          step = parsed.data;
        }
      } catch {
        probeAborted = true;
        step = crashedStep(entry);
      } finally {
        clearTimeout(timer);
      }
    }
    probeSteps.push(step);
  }

  // Cleanup ALWAYS runs, and its outcome is reported truthfully.
  const cleanupStartedMs = nowMs();
  let cleanupSucceeded = false;
  let cleanupSummary = "";
  try {
    await environment.cleanup();
    cleanupSucceeded = true;
    cleanupSummary = "Stopped the preview and removed its resources.";
  } catch (error) {
    cleanupSucceeded = false;
    cleanupSummary = `Preview cleanup failed: ${boundedErrorMessage(error)}`;
  }
  const cleanupDurationMs = Math.max(0, Math.round(nowMs() - cleanupStartedMs));
  probeSteps.push({
    stepId: "cleanup",
    kind: "cleanup",
    status: cleanupSucceeded ? "passed" : "failed",
    summary: cleanupSummary,
    durationMs: cleanupDurationMs,
  });

  const evidence: VerificationEvidenceV1 = {
    apiVersion: "factory.verification-evidence/v1",
    verificationRunId: input.verificationRunId,
    compilationDigest,
    steps: probeSteps,
    cleanup: { succeeded: cleanupSucceeded, summary: cleanupSummary },
    artifactDigests: manifest.map(({ path, digest }) => ({ path, digest })),
    completedAt: now(),
  };
  return parseVerificationEvidence(evidence, run);
}
