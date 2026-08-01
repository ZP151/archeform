import {
  createFixtureRuntimeProvider,
  type RuntimeProviderV1,
} from "./provider-contract.js";

/**
 * Contract-only Medusa projection. The v1 native Factory compiler owns the
 * commerce semantics; this fixture provisions no Medusa runtime or source.
 */
export const medusaProvider: RuntimeProviderV1 =
  createFixtureRuntimeProvider("medusa");
