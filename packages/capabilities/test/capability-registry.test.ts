import { describe, expect, it } from "vitest";

import {
  capabilityCatalog,
  capabilitiesForProfile,
  getCapability,
  profileGraphs,
} from "../src/index.js";
import { validateApplicationGraph } from "@factory/graph";

describe("capability catalog", () => {
  it("exposes independently composable core and commerce capabilities", () => {
    expect(capabilityCatalog.map((capability) => capability.key)).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.order",
      "commerce.simulated-payment",
    ]);
  });

  it("returns a complete, deterministic capability set for each initial profile", () => {
    expect(capabilitiesForProfile("expense-approval").map(({ key }) => key)).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
    ]);
    expect(capabilitiesForProfile("restaurant-ordering").map(({ key }) => key)).toContain(
      "commerce.simulated-payment",
    );
    expect(capabilitiesForProfile("simple-ecommerce").map(({ key }) => key)).toContain(
      "commerce.inventory",
    );
  });

  it("rejects unknown capability keys", () => {
    expect(() => getCapability("commerce.unknown")).toThrow(
      "Unknown Factory capability: commerce.unknown",
    );
  });

  it("ships independently valid Graph starters for the three acceptance profiles", () => {
    expect(profileGraphs.map(({ profile }) => profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
    ]);
    for (const profile of profileGraphs) {
      expect(validateApplicationGraph(profile.graph)).toEqual([]);
    }
  });
});
