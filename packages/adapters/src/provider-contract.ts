import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

export type PublishedGraphInput = {
  readonly publishedRevisionId: string;
  readonly graph: ApplicationGraphV1;
};

export type ProviderCompilationResult = {
  readonly providerKey: string;
  readonly providerVersion: string;
  readonly publishedRevisionId: string;
  readonly graphHash: string;
  readonly artifacts: readonly string[];
};

export interface RuntimeProviderV1 {
  readonly key: string;
  readonly version: string;
  compile(input: unknown): Promise<ProviderCompilationResult>;
  teardown(result: ProviderCompilationResult): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parsePublishedGraph(input: unknown): PublishedGraphInput {
  if (
    !isRecord(input) ||
    typeof input.publishedRevisionId !== "string" ||
    input.publishedRevisionId.trim().length === 0
  ) {
    throw new Error("Published revision required.");
  }
  return {
    publishedRevisionId: input.publishedRevisionId,
    graph: assertValidApplicationGraph(input.graph),
  };
}

/**
 * A deterministic conformance fixture for provider adapters. It proves the
 * boundary without provisioning an external application or service.
 */
export function createFixtureRuntimeProvider(
  key: string,
  version = "1",
): RuntimeProviderV1 {
  return {
    key,
    version,
    async compile(input) {
      const published = parsePublishedGraph(input);
      return {
        providerKey: key,
        providerVersion: version,
        publishedRevisionId: published.publishedRevisionId,
        graphHash: hashApplicationGraph(published.graph),
        artifacts: [],
      };
    },
    async teardown(result) {
      if (result.providerKey !== key || result.providerVersion !== version) {
        throw new Error(
          "Provider compilation result does not belong to this provider.",
        );
      }
    },
  };
}

export const fixtureNativeProvider =
  createFixtureRuntimeProvider("fixture-native");
