import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertProductBlueprint,
  type ProductBlueprintV1,
} from "../src/product-blueprint.js";
import { matchServiceWorkOrdersBlueprintV1 } from "../src/service-work-orders-blueprint-witness.js";

function fixture(): ProductBlueprintV1 {
  return assertProductBlueprint(
    JSON.parse(
      readFileSync(
        new URL(
          "./fixtures/service-work-orders-blueprint.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ).blueprint,
  );
}

describe("Work Orders Blueprint structural witness", () => {
  it("recognizes the complete assignment, resolution and two-source cancellation shape", () => {
    expect(matchServiceWorkOrdersBlueprintV1(fixture())).toEqual({
      orderEntity: "work-order",
      historyEntity: "work-order-history",
      workflow: "fulfil-order",
      roles: { dispatcher: "dispatcher", technician: "technician" },
      pages: {
        list: "dispatch",
        form: "new-order",
        detail: "order-detail",
        queue: "assigned-work",
      },
      numericFields: [
        { entityKey: "work-order-history", fieldKey: "orderVersion" },
      ],
    });
  });

  it.each([
    [
      "extra role",
      (b: ProductBlueprintV1) => b.actors.push(structuredClone(b.actors[0]!)),
    ],
    [
      "extra entity",
      (b: ProductBlueprintV1) =>
        b.entities.push(structuredClone(b.entities[0]!)),
    ],
    [
      "extra page",
      (b: ProductBlueprintV1) =>
        b.pageIntents.push(structuredClone(b.pageIntents[0]!)),
    ],
    ["missing queue", (b: ProductBlueprintV1) => b.pageIntents.pop()],
    [
      "extra flow",
      (b: ProductBlueprintV1) =>
        b.workflows.push(structuredClone(b.workflows[0]!)),
    ],
    [
      "history create grant",
      (b: ProductBlueprintV1) =>
        b.actors[1]!.permissions[1]!.actions.push("create"),
    ],
    [
      "technician cancel grant",
      (b: ProductBlueprintV1) =>
        b.actors[1]!.permissions[0]!.actions.push("cancel"),
    ],
    [
      "wrong history reference",
      (b: ProductBlueprintV1) =>
        (b.entities[1]!.fields[0]!.referenceTo = b.entities[1]!.key),
    ],
    [
      "missing numeric bound",
      (b: ProductBlueprintV1) => delete b.entities[1]!.fields[2]!.numericDomain,
    ],
    [
      "negative order version",
      (b: ProductBlueprintV1) =>
        (b.entities[1]!.fields[2]!.numericDomain!.minimum!.value = -1),
    ],
    [
      "larger order version",
      (b: ProductBlueprintV1) =>
        (b.entities[1]!.fields[2]!.numericDomain!.maximum!.value = 2147483648),
    ],
    [
      "exclusive zero",
      (b: ProductBlueprintV1) =>
        (b.entities[1]!.fields[2]!.numericDomain!.minimum!.inclusive = false),
    ],
    [
      "required correction snapshot",
      (b: ProductBlueprintV1) => (b.entities[1]!.fields[11]!.required = true),
    ],
    [
      "missing correction snapshot",
      (b: ProductBlueprintV1) => b.entities[1]!.fields.pop(),
    ],
    [
      "extra order field",
      (b: ProductBlueprintV1) =>
        b.entities[0]!.fields.push({
          key: "amount",
          label: "Amount",
          type: "number",
          required: true,
        }),
    ],
    [
      "wrong cancel target",
      (b: ProductBlueprintV1) =>
        (b.workflows[0]!.transitions[3]!.to = "resolved"),
    ],
    [
      "wrong cancel actor",
      (b: ProductBlueprintV1) =>
        (b.workflows[0]!.transitions[4]!.actorKey = "technician"),
    ],
    [
      "duplicate cancel source",
      (b: ProductBlueprintV1) =>
        (b.workflows[0]!.transitions[4]!.from = "open"),
    ],
    [
      "missing cancel source",
      (b: ProductBlueprintV1) => b.workflows[0]!.transitions.pop(),
    ],
    [
      "extra transition",
      (b: ProductBlueprintV1) =>
        b.workflows[0]!.transitions.push(
          structuredClone(b.workflows[0]!.transitions[0]!),
        ),
    ],
    [
      "renamed fixed field",
      (b: ProductBlueprintV1) => (b.entities[0]!.fields[1]!.key = "address"),
    ],
    [
      "different priority",
      (b: ProductBlueprintV1) =>
        b.entities[0]!.fields[2]!.options!.push("urgent"),
    ],
  ] as const)("rejects %s despite matching product labels", (_name, change) => {
    const blueprint = fixture();
    change(blueprint);
    expect(matchServiceWorkOrdersBlueprintV1(blueprint)).toBeUndefined();
    expect(() => assertProductBlueprint(blueprint)).toThrow();
  });

  it("does not serialize, mutate or use display labels as authority", () => {
    const blueprint = fixture();
    blueprint.title = "Building Maintenance";
    for (const actor of blueprint.actors) actor.label = "Example staff role";
    for (const entity of blueprint.entities) {
      entity.label = "Example record";
      entity.description = "Safe descriptive copy.";
      for (const field of entity.fields) field.label = "Example field";
    }
    const before = structuredClone(blueprint);
    expect(matchServiceWorkOrdersBlueprintV1(blueprint)).toBeDefined();
    expect(blueprint).toEqual(before);
  });

  it("derives coordinates from a complete consistently renamed definition", () => {
    const blueprint = fixture();
    const renamed = new Map([
      ["dispatcher", "coordinator"],
      ["technician", "field-worker"],
      ["work-order", "repair"],
      ["work-order-history", "repair-history"],
    ]);
    const rename = (value: string) => renamed.get(value) ?? value;
    for (const actor of blueprint.actors) {
      actor.key = rename(actor.key);
      for (const permission of actor.permissions)
        permission.entityKey = rename(permission.entityKey);
    }
    for (const entity of blueprint.entities) {
      entity.key = rename(entity.key);
      for (const field of entity.fields)
        if (field.referenceTo) field.referenceTo = rename(field.referenceTo);
    }
    for (const page of blueprint.pageIntents) {
      page.key = "repair-" + page.key;
      page.entityKey = rename(page.entityKey!);
    }
    const workflow = blueprint.workflows[0]!;
    workflow.key = "repair-work";
    workflow.entityKey = rename(workflow.entityKey);
    for (const transition of workflow.transitions)
      transition.actorKey = rename(transition.actorKey);
    for (const journey of blueprint.acceptanceJourneys)
      for (const step of journey.steps) step.actorKey = rename(step.actorKey);
    const persisted = JSON.parse(
      JSON.stringify(blueprint),
    ) as ProductBlueprintV1;
    expect(matchServiceWorkOrdersBlueprintV1(persisted)).toEqual({
      orderEntity: "repair",
      historyEntity: "repair-history",
      workflow: "repair-work",
      roles: { dispatcher: "coordinator", technician: "field-worker" },
      pages: {
        list: "repair-dispatch",
        form: "repair-new-order",
        detail: "repair-order-detail",
        queue: "repair-assigned-work",
      },
      numericFields: [
        { entityKey: "repair-history", fieldKey: "orderVersion" },
      ],
    });
    persisted.entities[1]!.fields[0]!.referenceTo = "work-order";
    expect(matchServiceWorkOrdersBlueprintV1(persisted)).toBeUndefined();
  });
});
