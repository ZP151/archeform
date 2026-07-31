import type { CapabilityAssetV1 } from "../contract.js";

import { restaurantOrderingAssetV1_2_0 } from "./ordering-v1-2-0.js";

export const restaurantOrderingAssetV1_2_1: CapabilityAssetV1 = {
  manifest: {
    ...restaurantOrderingAssetV1_2_0.manifest,
    version: "1.2.1",
    packageRoot: "packages/capabilities/assets/restaurant.ordering/1.2.1",
    manifestDigest:
      "sha256:79e8b233061e6d4c1244be2f624af10ef8043e9e616b3ac2ebfca1e549a0cb0b",
    executableContributions:
      restaurantOrderingAssetV1_2_0.manifest.executableContributions?.map(
        (contribution) => ({
          ...contribution,
          digest:
            contribution.id ===
            "restaurant-ordering-transaction-operation-adapter"
              ? "sha256:0562b440bcc929b1f84e8296c314f5be0ff3fa4df5d65a51823082d71fe6078b"
              : "sha256:90ec8fd980ba259a8beb95671718c6d26c39e2d48ed61f3cf852bcfcd27c441d",
        }),
      ),
    verification: {
      ...restaurantOrderingAssetV1_2_0.manifest.verification,
      fixtureDigest:
        "sha256:50a478e6b30bfe380ebc61735ef322daad2f520d00ee996d77952b05345f7856",
      contractTestDigest:
        "sha256:9c359a235658935bb583987384a634314470c7f24f106b79a5fbd68c659d44cc",
    },
  },
};
