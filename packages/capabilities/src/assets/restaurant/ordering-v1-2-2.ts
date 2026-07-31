import type { CapabilityAssetV1 } from "../contract.js";

import { restaurantOrderingAssetV1_2_1 } from "./ordering-v1-2-1.js";

export const restaurantOrderingAssetV1_2_2: CapabilityAssetV1 = {
  manifest: {
    ...restaurantOrderingAssetV1_2_1.manifest,
    version: "1.2.2",
    packageRoot: "packages/capabilities/assets/restaurant.ordering/1.2.2",
    manifestDigest:
      "sha256:075fd15eb4746bf51a6797e18062a059224ee6a99693236c748ba5326f66c42b",
    executableContributions:
      restaurantOrderingAssetV1_2_1.manifest.executableContributions?.map(
        (contribution) => ({
          ...contribution,
          digest:
            contribution.id ===
            "restaurant-ordering-transaction-operation-adapter"
              ? "sha256:5e8edf8b1763e30686ab759ba820d9a2c8ec9b3b41d595536f3686bc1a3eeb58"
              : "sha256:8b8da53faf5ea1fb23d5d9a9bf98dbd3a5725bb31e74117b3a566e4b36b2d00c",
        }),
      ),
    verification: {
      ...restaurantOrderingAssetV1_2_1.manifest.verification,
      fixtureDigest:
        "sha256:72780ce75e4b3608ad835033ec218723902b99dafae8727f6b3dcc0428ed7b5b",
      contractTestDigest:
        "sha256:66682fb5f4e7ed292de4c40cd5c3d5069b0a7ad365de796a9ef3985d5e211903",
    },
  },
};
