import {
  createFixtureRuntimeProvider,
  type RuntimeProviderV1,
} from "./provider-contract.js";

/**
 * Contract-only OpenFGA projection. This v1 fixture never imports an OpenFGA
 * SDK, reads credentials, sends network traffic, or becomes an authorization
 * runtime; generated Casbin policy remains the active baseline.
 */
export const openFgaProvider: RuntimeProviderV1 = createFixtureRuntimeProvider(
  "openfga",
);
