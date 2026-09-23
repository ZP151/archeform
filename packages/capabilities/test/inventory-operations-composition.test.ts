import { canonicalTeamTaskInterpretation } from "../../adapters/src/requirements/task-definition-selection.js";
import { planProductAlternatives } from "../src/plan-alternatives.js";
import { createBlankApplicationDraft } from "@factory/graph";
import { describe, it, expect } from "vitest";
import {
  inventoryBlueprint,
  composeInventoryInput,
  inventoryOperationsInput,
  inventoryDomain,
} from "../../compiler/test/fixtures/inventory-operations.js";
describe("Inventory composition", () => {
  it.each(["removed", "renamed"] as const)(
    "rejects combined %s stock quantity coordinates before generic composition",
    (change) => {
      const { spec, blueprint } = inventoryBlueprint();
      const coordinates = new Set([
        "quantity",
        "delta",
        "beforeQuantity",
        "afterQuantity",
        "itemVersion",
      ]);
      for (const entity of blueprint.entities) {
        for (const field of entity.fields) delete field.numericDomain;
        entity.fields =
          change === "removed"
            ? entity.fields.filter((field) => !coordinates.has(field.key))
            : entity.fields.map((field) => ({
                ...field,
                key: coordinates.has(field.key)
                  ? "renamed_" + field.key
                  : field.key,
              }));
      }
      expect(() => composeInventoryInput(spec, blueprint)).toThrow(
        /Unsupported Inventory/,
      );
    },
  );

  it.each([false, true])(
    "preserves a non-stock draft-to-recorded submit workflow (sku/unit only: %s)",
    (withSkuUnit) => {
      const { spec, blueprint } = structuredClone(
        canonicalTeamTaskInterpretation(),
      );
      if (withSkuUnit)
        blueprint.entities[0]!.fields.push(
          { key: "sku", label: "SKU", type: "text", required: false },
          { key: "unit", label: "Unit", type: "text", required: false },
        );
      const flow = blueprint.workflows[0]!;
      flow.states = [
        { key: "draft", label: "Draft" },
        { key: "recorded", label: "Recorded" },
      ];
      flow.transitions = [
        {
          key: "submit",
          label: "Submit",
          from: "draft",
          to: "recorded",
          actorKey: blueprint.actors[0]!.key,
        },
      ];
      blueprint.actors[0]!.permissions.find(
        (permission) => permission.entityKey === flow.entityKey,
      )!.actions = ["create", "read", "update", "submit"];
      const { graph } = composeInventoryInput(spec, blueprint);
      expect(
        graph.domain.entities
          .flatMap((entity) => entity.fields)
          .some((field) =>
            ["quantity", "delta", "beforeQuantity", "afterQuantity"].includes(
              field.key,
            ),
          ),
      ).toBe(false);
      expect(graph.flow.flows[0]!.states).toEqual(["draft", "recorded"]);
      expect(graph.flow.flows[0]!.transitions).toEqual([
        {
          from: "draft",
          event: "submit",
          to: "recorded",
          roles: [blueprint.actors[0]!.key],
        },
      ]);
    },
  );
  it("derives empty seeds, bounded fields, unique SKU, stored reference and declared audit", () => {
    const { graph } = inventoryOperationsInput();
    expect(graph.domain.seedData).toEqual([]);
    const [item, movement] = graph.domain.entities;
    expect(item!.fields[0]).toEqual({
      key: "sku",
      type: "string",
      required: true,
      unique: true,
    });
    expect(item!.fields[3]!.numericDomain).toEqual(
      inventoryDomain(0, 1000000000),
    );
    expect(movement!.fields[0]).toEqual({
      key: "stockItemId",
      type: "string",
      required: true,
    });
    expect(movement!.fields[2]!.numericDomain).toEqual(
      inventoryDomain(-1000000000, 1000000000),
    );
    expect(movement!.indexes).toEqual([
      { fields: ["status"] },
      { fields: ["stockItemId", "itemVersion"], unique: true },
    ]);
    expect(graph.domain.relations[0]).toEqual({
      from: movement!.key,
      to: item!.key,
      kind: "many-to-one",
      field: "stockItemId",
    });
    expect(graph.flow.flows[0]!.transitions[0]!.effects).toEqual([
      { capability: "audit.record", operation: "record" },
    ]);
    expect(graph.integration.capabilities).toContainEqual({
      key: "audit.record",
      providerId: "factory",
      operation: "record",
    });
  });
  it("offers only the complete six-lock alternative and the three item pages", () => {
    const { spec, blueprint } = inventoryBlueprint();
    const baseDraft = createBlankApplicationDraft({
      applicationId: spec.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    });
    const alternatives = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    expect(alternatives).toHaveLength(1);
    expect(
      alternatives[0]!.plan.capabilityLocks.map((lock) => lock.key).sort(),
    ).toEqual([
      "core.audit",
      "core.crud",
      "core.identity-policy",
      "core.notification",
      "core.policy-declarations",
      "core.workflow",
    ]);
    const { graph } = inventoryOperationsInput();
    expect(
      graph.page.pages.map((page) => [
        page.blocks[0]!.type,
        page.blocks[0]!.entity,
      ]),
    ).toEqual([
      ["list", "stock-item"],
      ["form", "stock-item"],
      ["detail", "stock-item"],
    ]);
  });
  it.each([
    "bound",
    "required",
    "reference",
    "kind",
    "field",
    "grant",
    "state",
    "page",
    "calculation",
    "numeric-removed",
  ])("rejects incomplete witness: %s", (change) => {
    const { spec, blueprint: b } = inventoryBlueprint();
    if (change === "bound")
      b.entities[0]!.fields[3]!.numericDomain!.maximum!.value++;
    if (change === "required") b.entities[1]!.fields[6]!.required = false;
    if (change === "reference")
      b.entities[1]!.fields[0]!.referenceTo = "stock-movement";
    if (change === "kind") b.entities[1]!.fields[1]!.options!.push("transfer");
    if (change === "field")
      b.entities[0]!.fields.push({
        key: "location",
        label: "Location",
        type: "text",
        required: true,
      });
    if (change === "grant") b.actors[1]!.permissions[0]!.actions.push("update");
    if (change === "state")
      b.workflows[0]!.states.push({ key: "amended", label: "Amended" });
    if (change === "page") b.pageIntents[1]!.entityKey = "stock-movement";
    if (change === "calculation")
      b.entities[0]!.fields[3]!.calculation = {
        apiVersion: "factory.calculated-request-total/v1",
        quantityFieldKey: "quantity",
        unitPriceFieldKey: "quantity",
        rounding: "half-up",
        scale: 2,
      } as never;
    if (change === "numeric-removed")
      for (const e of b.entities)
        for (const f of e.fields) delete f.numericDomain;
    expect(() => composeInventoryInput(spec, b)).toThrow();
  });
});
