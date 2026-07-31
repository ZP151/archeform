import type { CapabilityAssetV1 } from "../contract.js";

import { orderAssetV1_3_0 } from "./order-v1-3-0.js";

export const orderAssetV1_3_1: CapabilityAssetV1 = {
  manifest: {
    ...orderAssetV1_3_0.manifest,
    version: "1.3.1",
    packageRoot: "packages/capabilities/assets/commerce.order/1.3.1",
    manifestDigest:
      "sha256:a793e4dec183ebe772248677ceaa5cd42ed049b23344da1519461487efb08e2f",
    executableContributions:
      orderAssetV1_3_0.manifest.executableContributions?.map(
        (contribution) => ({
          ...contribution,
          digest:
            contribution.id === "commerce-order-transaction-operation-adapter"
              ? "sha256:f7b08bc1b10e3434016305032bcf61eb360995eb51c4e6b0ff8d5c4b58825fcf"
              : "sha256:a0e04094ac09a1da73b6095d2208036071e00d5d53a70ba924a19ce536928112",
        }),
      ),
    verification: {
      ...orderAssetV1_3_0.manifest.verification,
      fixtureDigest:
        "sha256:deeca2bd51386b6c498ee2f598210c6b95e75de7fc157fac6a8dc3add85d44f5",
      contractTestDigest:
        "sha256:432decf6c06564ceceb809af0eb08ab282d867ced151749382bd373a4d55280a",
    },
  },
};
