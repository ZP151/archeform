import type { CapabilityAssetV1 } from "../contract.js";

import { orderAssetV1_3_1 } from "./order-v1-3-1.js";

export const orderAssetV1_3_2: CapabilityAssetV1 = {
  manifest: {
    ...orderAssetV1_3_1.manifest,
    version: "1.3.2",
    packageRoot: "packages/capabilities/assets/commerce.order/1.3.2",
    manifestDigest:
      "sha256:edd971e37004446f076968050f4794c3228bc346288ff61750fd16d5884c5b42",
    executableContributions:
      orderAssetV1_3_1.manifest.executableContributions?.map(
        (contribution) => ({
          ...contribution,
          digest:
            contribution.id === "commerce-order-transaction-operation-adapter"
              ? "sha256:208a82af35ad833768eca7d0f1d5ac9708de59e04eb45b7efff92941efe9f313"
              : "sha256:21eeb6bb42a3404c7349c656998820262034a85e6353db526e2aa959baab17ca",
        }),
      ),
    verification: {
      ...orderAssetV1_3_1.manifest.verification,
      fixtureDigest:
        "sha256:5843fb34566833ab420fb6c6c56278a385b9dd7a52835b765b17f8a7d89ba8f8",
      contractTestDigest:
        "sha256:52acf23c1076f9e226e18361bc1159fe4a191b0a8d73e4e9109a0f790da24ebf",
    },
  },
};
