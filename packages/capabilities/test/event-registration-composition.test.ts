import { describe, it, expect } from "vitest";
import {
  deriveProductOperations,
  composeProductDraft,
} from "../src/product-composer.js";
import {
  eventRegistrationInput,
  eventRegistrationComposition,
} from "../../compiler/test/fixtures/event-registration.js";
describe("Event Registration deterministic composition", () => {
  it("retains cancellation sources, merges only the two registration cancel actors, and builds exact indexes", () => {
    const { graph: g, compositionLock } = eventRegistrationInput();
    expect(compositionLock.packages).toHaveLength(6);
    expect(g.domain.entities).toHaveLength(6);
    expect(g.page.pages).toHaveLength(5);
    expect(g.domain.seedData).toEqual([]);
    expect(g.domain.entities[1]!.indexes).toEqual([
      { fields: ["eventId", "attendeePrincipalId"], unique: true },
      { fields: ["eventId", "status"] },
      { fields: ["attendeePrincipalId"] },
    ]);
    expect(
      g.flow.flows[0]!.transitions.filter((t) => t.event === "cancel"),
    ).toHaveLength(2);
    expect(g.flow.flows[1]!.transitions[0]).toEqual({
      from: "registered",
      event: "cancel",
      to: "cancelled",
      roles: ["attendee", "organizer"],
    });
    expect(g.page.navigation.map((n) => n.icon)).toEqual([
      "list",
      "user",
      "check",
    ]);
  });
  it("rejects missing, additional and duplicate capabilities and altered locks/bindings", () => {
    const composition = eventRegistrationComposition();
    const keys = composition.plan.capabilityLocks.map((l) => l.key);
    for (const selectedKeys of [
      keys.slice(1),
      [...keys, "scheduling.appointment"],
      [...keys, keys[0]!],
    ])
      expect(() =>
        deriveProductOperations({
          blueprint: composition.blueprint,
          applicationId: composition.baseDraft.graph.metadata.id,
          selectedKeys,
        }),
      ).toThrow();
    for (const change of ["lock", "binding"]) {
      const c = structuredClone(composition);
      if (change === "lock")
        c.plan.capabilityLocks[0]!.manifestDigest = "sha256:" + "0".repeat(64);
      else c.plan.graphBindings[0]!.graphSymbol = "graph.domain.registration";
      expect(() => composeProductDraft(c)).toThrow();
    }
  });
});
