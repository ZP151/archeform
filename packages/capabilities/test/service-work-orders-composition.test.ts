import { describe, it, expect } from "vitest";
import { createBlankApplicationDraft } from "@factory/graph";
import { planProductAlternatives } from "../src/plan-alternatives.js";
import {
  deriveProductOperations,
  composeProductDraft,
} from "../src/product-composer.js";
import {
  serviceWorkOrdersInput,
  serviceWorkOrdersBlueprint,
} from "../../compiler/test/fixtures/service-work-orders.js";
describe("Work Orders exact composition", () => {
  it("uses six locks, four pages, no fake history and one unique history version index", () => {
    const { graph, compositionLock } = serviceWorkOrdersInput();
    expect(compositionLock.packages).toHaveLength(6);
    expect(graph.page.pages).toHaveLength(4);
    expect(graph.domain.seedData).toEqual([]);
    expect(graph.domain.entities[1]!.indexes).toEqual([
      { fields: ["workOrderId", "orderVersion"], unique: true },
    ]);
    expect(graph.flow.flows[0]!.events).toEqual([
      "start",
      "resolve",
      "reopen",
      "cancel",
    ]);
    expect(graph.flow.flows[0]!.transitions).toHaveLength(5);
    expect(
      graph.flow.flows[0]!.transitions.every((t) => t.effects === undefined),
    ).toBe(true);
    expect(graph.integration.capabilities.map((c) => c.key)).toEqual([
      "identity.context.resolve",
      "authorization.decision",
      "audit.record",
    ]);
  });
  it("offers only the exact six-package plan and rejects missing/extra keys", () => {
    const { spec, blueprint } = serviceWorkOrdersBlueprint();
    const baseDraft = createBlankApplicationDraft({
      applicationId: spec.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    });
    const plans = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    expect(plans).toHaveLength(1);
    const keys = plans[0]!.plan.capabilityLocks.map((l) => l.key);
    for (const selectedKeys of [
      keys.slice(0, -1),
      [...keys, "scheduling.appointment"],
      [...keys, keys[0]!],
    ])
      expect(() =>
        deriveProductOperations({
          blueprint,
          applicationId: spec.requirementId,
          selectedKeys,
        }),
      ).toThrow();
    const plan = structuredClone(plans[0]!.plan);
    plan.capabilityLocks[0]!.manifestDigest = "sha256:" + "0".repeat(64);
    expect(() => composeProductDraft({ plan, blueprint, baseDraft })).toThrow();
  });
});
