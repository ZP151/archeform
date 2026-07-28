import type { ApplicationGraphV1 } from "@factory/graph";

import {
  executeCompilation,
  type CompilationExecutionResult,
} from "./compilation-executor.js";

export interface CompilationJob {
  readonly compilationId: string;
  readonly publishedRevisionId: string;
  readonly target: string;
  readonly compilerVersion: string;
  readonly graph: ApplicationGraphV1;
}

export interface CompilationReporter {
  complete(evidence: {
    readonly compilationId: string;
    readonly graphHash: string;
    readonly rootDirectory: string;
    readonly artifacts: CompilationExecutionResult["artifacts"];
  }): Promise<void>;
}

/**
 * Runs a job created from a Published Revision and reports immutable output
 * evidence. The Graph is intentionally not part of the report payload.
 */
export async function executeQueuedCompilation(
  artifactRoot: string,
  job: CompilationJob,
  reporter: CompilationReporter,
): Promise<CompilationExecutionResult> {
  const result = await executeCompilation(artifactRoot, {
    publishedRevisionId: job.publishedRevisionId,
    graph: job.graph,
  });
  await reporter.complete({
    compilationId: job.compilationId,
    graphHash: result.graphHash,
    rootDirectory: result.rootDirectory,
    artifacts: result.artifacts,
  });
  return result;
}
