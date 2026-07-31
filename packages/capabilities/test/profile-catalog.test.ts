import { describe, expect, it } from "vitest";

import {
  getFactoryProfileDescriptor,
  getProfileComposition,
  listFactoryProfiles,
} from "../src/index.js";

describe("Factory Profile catalog", () => {
  it("describes every current composition recipe from one canonical catalog", () => {
    expect(listFactoryProfiles()).toEqual([
      expect.objectContaining({
        profile: "expense-approval",
        category: "approval",
        requiredCapabilities: ["core.crud", "core.workflow"],
      }),
      expect.objectContaining({
        profile: "restaurant-ordering",
        category: "commerce",
      }),
      expect.objectContaining({
        profile: "simple-ecommerce",
        category: "commerce",
      }),
      expect.objectContaining({
        profile: "retail-counter",
        category: "commerce",
      }),
      expect.objectContaining({
        profile: "grocery-pickup",
        category: "commerce",
      }),
    ]);

    for (const descriptor of listFactoryProfiles()) {
      expect(descriptor.requiredCapabilities).toEqual(
        getProfileComposition(descriptor.profile).requiredCapabilities.map(
          ({ key }) => key,
        ),
      );
    }
  });

  it("resolves an individual descriptor without exposing a mutable recipe", () => {
    expect(getFactoryProfileDescriptor("retail-counter")).toMatchObject({
      profile: "retail-counter",
      category: "commerce",
      label: "Retail counter",
    });
  });
});
