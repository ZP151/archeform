import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import type {
  ApplicationGraphV1,
  PublishedApplicationGraphV3Input,
} from "@factory/graph";

import {
  executeCompilation,
  executeV3Compilation,
  type CompilationExecutionResult,
} from "./compilation-executor.js";

export interface CompilationJob {
  readonly compilationId: string;
  readonly publishedRevisionId: string;
  readonly target: string;
  readonly compilerVersion: string;
  readonly compositionLock: CapabilityCompositionLockV1;
  readonly graphVersion:
    "factory.application-graph/v1" | "factory.application-graph/v3";
  readonly graph?: ApplicationGraphV1;
  readonly publishedGraph?: PublishedApplicationGraphV3Input;
}

export interface CompilationReporter {
  complete(evidence: {
    readonly compilationId: string;
    readonly graphHash: string;
    readonly rootDirectory: string;
    readonly artifacts: CompilationExecutionResult["artifacts"];
  }): Promise<void>;
  fail(evidence: { readonly compilationId: string }): Promise<void>;
}

const BOUNDED_COMPILATION_FAILURE =
  "Queued compilation failed after bounded failure reporting.";
const BOUNDED_COMPLETION_REPORT_FAILURE =
  "Queued compilation completion reporting failed after bounded attempts.";
const COMPLETION_REPORT_ATTEMPTS = 3;

/**
 * Runs a job created from a Published Revision and reports immutable output
 * evidence. The Graph is intentionally not part of the report payload.
 */
export async function executeQueuedCompilation(
  artifactRoot: string,
  job: CompilationJob,
  reporter: CompilationReporter,
): Promise<CompilationExecutionResult> {
  let result: CompilationExecutionResult;
  try {
    result =
      job.graphVersion === "factory.application-graph/v3"
        ? await executeV3Compilation(artifactRoot, {
            publishedGraph: job.publishedGraph!,
            compositionLock: job.compositionLock,
          })
        : await executeCompilation(artifactRoot, {
            publishedRevisionId: job.publishedRevisionId,
            graph: job.graph!,
            compositionLock: job.compositionLock,
          });
  } catch {
    try {
      await reporter.fail({ compilationId: job.compilationId });
    } catch {
      // Failure reporting is best-effort and deliberately non-disclosing.
    }
    throw new Error(BOUNDED_COMPILATION_FAILURE);
  }

  const completionEvidence = {
    compilationId: job.compilationId,
    graphHash: result.graphHash,
    rootDirectory: result.rootDirectory,
    artifacts: result.artifacts,
  };
  for (let attempt = 0; attempt < COMPLETION_REPORT_ATTEMPTS; attempt += 1) {
    try {
      await reporter.complete(completionEvidence);
      return result;
    } catch {
      // Completion delivery is retried with identical, idempotent evidence.
    }
  }
  throw new Error(BOUNDED_COMPLETION_REPORT_FAILURE);
}
