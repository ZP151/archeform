import type { PublishedGraphInput } from "@factory/compiler";
import {
  hashApplicationGraph,
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
 * lifecycle always cleans up, and compile failures propagate honestly (the
 * job never fabricates evidence for a compilation that did not happen).
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
 * Runs one queued verification job end to end: compile the immutable input,
 * boot the isolated preview, run the declared profile probes, always clean
 * up, and report exactly one evidence bundle plus — only when a step failed —
 * one deterministic diagnosis. Retries with the same job identity re-run the
 * same deterministic lifecycle and report idempotently.
 */
export async function executeQueuedVerificationRun(
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
