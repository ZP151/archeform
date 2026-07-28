import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "@factory/compiler";

import { materializeGeneratedBundle } from "./artifact-writer.js";

export type CompilationExecutionResult = {
  readonly rootDirectory: string;
  readonly graphHash: string;
  readonly artifacts: readonly {
    path: string;
    digest: string;
    sizeBytes: number;
  }[];
};

/**
 * The executor accepts a Published Graph shape only. The Control Plane is
 * responsible for resolving a publication ID; no mutable draft enters here.
 */
export async function executeCompilation(
  artifactRoot: string,
  input: PublishedGraphInput,
): Promise<CompilationExecutionResult> {
  const bundle = generateApplicationBundle(input);
  const materialized = await materializeGeneratedBundle(artifactRoot, bundle);
  return {
    rootDirectory: bundle.rootDirectory,
    graphHash: materialized.graphHash,
    artifacts: materialized.artifacts,
  };
}
