import {
  generateApplicationBundle,
  generateRestaurantProductApplicationBundle,
  type PublishedGraphInput,
} from "@factory/compiler";
import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import type { PublishedApplicationGraphV3Input } from "@factory/graph";

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

/**
 * Compiles an immutable Restaurant V3 Published Graph through the Restaurant
 * V3 target, which validates the canonical-hash negative space, authority, and
 * deterministic rendering. No V3 Draft or Snapshot enters here.
 */
export async function executeV3Compilation(
  artifactRoot: string,
  input: {
    readonly publishedGraph: PublishedApplicationGraphV3Input;
    readonly compositionLock: CapabilityCompositionLockV1;
  },
): Promise<CompilationExecutionResult> {
  const bundle = generateRestaurantProductApplicationBundle(input);
  const materialized = await materializeGeneratedBundle(artifactRoot, bundle);
  return {
    rootDirectory: bundle.rootDirectory,
    graphHash: materialized.graphHash,
    artifacts: materialized.artifacts,
  };
}
