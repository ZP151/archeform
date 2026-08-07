import type { PublishedGraphInput } from "@factory/compiler";
import {
  hashApplicationGraph,
  parseVerificationEvidence,
  VerificationContractError,
  type DiagnosisV1,
  type VerificationEvidenceV1,
  type VerificationStepV1,
} from "@factory/graph";

import type { executeCompilation } from "../compilation-executor.js";
import {
  safeArtifactManifest,
  type PreviewProcessRunner,
} from "../preview-runner.js";
import type { VerificationReporter } from "../verification-reporter.js";
import { diagnoseCompilation, revisionEnvelopeKeys } from "./diagnosis.js";
import {
  runApiProbe,
  runAuthorizationDenialProbe,
  runHealthProbe,
  runIdempotencyProbe,
  runMigrationProbe,
  runRoleJourneyProbe,
  type ProbeContext,
} from "./probes.js";
import { VerificationLifecycleError } from "./verification-lifecycle.js";
import {
  resolveRegistryAction,
  type IdempotencyJourneyFixture,
} from "./role-journey.js";
import {
  deriveCompilationDigest,
  runVerificationLifecycle,
  type VerificationLifecycleDependencies,
  type VerificationStepPlanEntry,
} from "./verification-lifecycle.js";
import type { VerificationEnvironment } from "./verification-environment.js";
import {
  resolveVerificationProfile,
  type VerificationProfile,
} from "./verification-profiles.js";

/**
 * The queued verification job: one immutable Published Compilation input, one
 * safe evidence bundle, and one final diagnosis (only when a step failed).
 * The job validates the exact payload fail closed before compilation, resolves
 * the deterministic profile, then delegates to the isolated lifecycle; the
 * lifecycle always cleans up, and a worker exception after the run was
 * created is mapped to one safe terminal failure evidence instead of leaving
 * the run at `pending` forever (the job never fabricates a success evidence
 * for a compilation that did not happen).
 */

export type VerificationRunInput = {
  readonly verificationRunId: string;
  readonly compilationId: string;
  readonly profileKey: string;
  readonly publishedRevisionId: string;
  readonly graph: PublishedGraphInput["graph"];
  readonly compositionLock: PublishedGraphInput["compositionLock"];
  readonly artifacts: readonly {
    readonly path: string;
    readonly digest: string;
    readonly sizeBytes: number;
  }[];
};

export type VerificationRunDependencies = {
  readonly operationTimeoutMs: number;
  readonly executeCompilation: typeof executeCompilation;
  readonly startPreviewRun: VerificationLifecycleDependencies["startPreviewRun"];
  readonly stopPreviewRun: VerificationLifecycleDependencies["stopPreviewRun"];
  readonly processRunner: PreviewProcessRunner;
  readonly fetch: typeof fetch;
  /** Declared clocks make the evidence replay-identical for identical runs. */
  readonly now?: () => string;
  readonly nowMs?: () => number;
};

const verificationJobKeyAllowlist = [
  "artifacts",
  "compilationId",
  "compositionLock",
  "graph",
  "profileKey",
  "publishedRevisionId",
  "verificationRunId",
].sort();

function assertJobInput(input: unknown): asserts input is VerificationRunInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VerificationContractError(
      "Verification jobs must be immutable payload records.",
    );
  }
  const record = input as unknown as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !==
    verificationJobKeyAllowlist.join(",")
  ) {
    throw new VerificationContractError(
      "Verification jobs must declare exactly the immutable payload.",
    );
  }
  for (const key of [
    "verificationRunId",
    "compilationId",
    "profileKey",
    "publishedRevisionId",
  ]) {
    if (typeof record[key] !== "string" || record[key].length === 0) {
      throw new VerificationContractError(
        "Verification job identity must be Factory-derived.",
      );
    }
  }
  if (
    !record.graph ||
    typeof record.graph !== "object" ||
    !record.compositionLock ||
    typeof record.compositionLock !== "object" ||
    !Array.isArray(record.artifacts)
  ) {
    throw new VerificationContractError(
      "Verification jobs must carry the immutable Published Graph and manifest.",
    );
  }
}

function probeRunnerFor(profile: VerificationProfile) {
  return async (
    entry: VerificationStepPlanEntry,
    environment: VerificationEnvironment,
    signal: AbortSignal,
  ): Promise<VerificationStepV1> => {
    const context: ProbeContext = { entry, environment, signal };
    switch (entry.kind) {
      case "migration":
        return runMigrationProbe(context);
      case "health":
        return runHealthProbe(context);
      case "api": {
        const journey = profile.journeys[entry.stepId];
        if (journey === undefined) {
          throw new VerificationContractError(
            "API steps must declare a fixture journey.",
          );
        }
        return runApiProbe(
          context,
          resolveRegistryAction(profile.apiRegistry, journey.action),
        );
      }
      case "role-journey":
      case "authorization-denial": {
        const journey = profile.journeys[entry.stepId];
        if (journey === undefined) {
          throw new VerificationContractError(
            "Journey steps must declare a fixture journey.",
          );
        }
        return entry.kind === "role-journey"
          ? runRoleJourneyProbe(context, journey, profile.apiRegistry)
          : runAuthorizationDenialProbe(context, journey, profile.apiRegistry);
      }
      case "idempotency": {
        const journey = profile.journeys[entry.stepId];
        if (journey === undefined) {
          throw new VerificationContractError(
            "Idempotency steps must declare a fixture journey.",
          );
        }
        return runIdempotencyProbe(
          context,
          journey as IdempotencyJourneyFixture,
          profile.apiRegistry,
        );
      }
      default:
        throw new VerificationContractError(
          "Verification step kind is not probe-supported.",
        );
    }
  };
}

/**
 * Terminal failure boundary. A worker exception after the run was created
 * (any fail-closed guard, compile failure, digest mismatch, or rejected
 * report) must not leave the run at `pending`: the adapter maps it to one
 * safe terminal failure evidence through the existing reporter contract, so
 * the Control Plane records a deterministic terminal `failed` status. The
 * failure record carries only an allowlisted diagnostic code and bounded
 * prose — never process output. When the payload is too corrupt to derive a
 * digest, no safe record can be built and the original failure propagates
 * honestly instead.
 */

const jobFailureStepId = "verification";
const jobFailureStepKind = "immutable-snapshot" as const;
const jobFailureSummary =
  "The verification job terminated before completing the declared step plan.";
const jobFailureCleanupSummary =
  "The verification job terminated before the preview cleanup ran.";

function boundedFailureCode(error: unknown): string {
  if (error instanceof VerificationLifecycleError) {
    // Lifecycle codes are Factory-authored; anything off the allowlist shape
    // fails closed to the generic code.
    return /^[a-z][a-z0-9._-]{0,99}$/.test(error.code)
      ? error.code
      : "job.unmapped_failure";
  }
  if (error instanceof VerificationContractError) {
    return "job.contract_violation";
  }
  return "job.unmapped_failure";
}

/**
 * Builds and reports the bounded terminal failure evidence for one queued
 * job. Returns the contract-validated evidence, or `undefined` when no safe
 * record can be constructed or delivered (the caller then rethrows).
 */
export async function reportVerificationJobFailure(
  input: unknown,
  reporter: VerificationReporter,
  error: unknown,
  now?: () => string,
): Promise<VerificationEvidenceV1 | undefined> {
  try {
    const job = input as VerificationRunInput;
    const evidence: VerificationEvidenceV1 = {
      apiVersion: "factory.verification-evidence/v1",
      verificationRunId: job.verificationRunId,
      compilationDigest: deriveCompilationDigest(
        hashApplicationGraph(job.graph),
        job.artifacts,
      ),
      steps: [
        {
          stepId: jobFailureStepId,
          kind: jobFailureStepKind,
          status: "failed",
          failureCode: boundedFailureCode(error),
          summary: jobFailureSummary,
        },
      ],
      cleanup: {
        succeeded: false,
        summary: jobFailureCleanupSummary,
      },
      artifactDigests: job.artifacts.map(({ path, digest }) => ({
        path,
        digest,
      })),
      completedAt: (now ?? (() => new Date().toISOString()))(),
    };
    const validated = parseVerificationEvidence(evidence);
    await reporter.report({ evidence: validated, diagnosis: undefined });
    return validated;
  } catch {
    return undefined;
  }
}

/**
 * Runs one queued verification job end to end: compile the immutable input,
 * boot the isolated preview, run the declared profile probes, always clean
 * up, and report exactly one evidence bundle plus — only when a step failed —
 * one deterministic diagnosis. Retries with the same job identity re-run the
 * same deterministic lifecycle and report idempotently. A worker exception
 * after the run was created is closed by one safe terminal failure report;
 * only when even that record cannot be built does the job fail honestly.
 */
export async function executeQueuedVerificationRun(
  artifactRoot: string,
  input: VerificationRunInput,
  reporter: VerificationReporter,
  dependencies: VerificationRunDependencies,
): Promise<VerificationEvidenceV1> {
  try {
    return await executeVerifiedRun(
      artifactRoot,
      input,
      reporter,
      dependencies,
    );
  } catch (error) {
    const failureEvidence = await reportVerificationJobFailure(
      input,
      reporter,
      error,
      dependencies.now,
    );
    if (failureEvidence === undefined) throw error;
    return failureEvidence;
  }
}

async function executeVerifiedRun(
  artifactRoot: string,
  input: VerificationRunInput,
  reporter: VerificationReporter,
  dependencies: VerificationRunDependencies,
): Promise<VerificationEvidenceV1> {
  assertJobInput(input);
  const profile = resolveVerificationProfile(input.profileKey);
  if (
    typeof input.graph === "object" &&
    input.graph !== null &&
    [...revisionEnvelopeKeys].some((key) => key in input.graph)
  ) {
    throw new VerificationContractError(
      "Verification jobs require an immutable Published Graph, not a draft or exchange envelope.",
    );
  }
  safeArtifactManifest(input.artifacts);

  const graphHash = hashApplicationGraph(input.graph);
  const expectedCompilationDigest = deriveCompilationDigest(
    graphHash,
    input.artifacts,
  );

  const evidence = await runVerificationLifecycle(
    {
      verificationRunId: input.verificationRunId,
      profileKey: input.profileKey,
      compilation: {
        publishedRevisionId: input.publishedRevisionId,
        graph: input.graph,
        compositionLock: input.compositionLock,
      },
      expectedCompilationDigest,
      stepPlan: profile.stepPlan,
    },
    {
      artifactRoot,
      operationTimeoutMs: dependencies.operationTimeoutMs,
      executeCompilation: dependencies.executeCompilation,
      startPreviewRun: dependencies.startPreviewRun,
      stopPreviewRun: dependencies.stopPreviewRun,
      processRunner: dependencies.processRunner,
      fetch: dependencies.fetch,
      now: dependencies.now,
      nowMs: dependencies.nowMs,
      runProbe: probeRunnerFor(profile),
    },
  );

  const failed = evidence.steps.some((step) => step.status === "failed");
  const diagnosis: DiagnosisV1 | undefined = failed
    ? diagnoseCompilation(evidence, input.graph, input.compositionLock)
    : undefined;
  await reporter.report({ evidence, diagnosis });
  return evidence;
}
