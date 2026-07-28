import {
  createFixtureRuntimeProvider,
  type RuntimeProviderV1,
} from "./provider-contract.js";

/**
 * Contract-only Appwrite projection. The native NestJS/Prisma compiler remains
 * authoritative in v1; this fixture has no SDK, network, credential, or
 * reverse-import path.
 */
export const appwriteProvider: RuntimeProviderV1 =
  createFixtureRuntimeProvider("appwrite");
