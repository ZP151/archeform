import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { assertProductBlueprint } from "../src/product-blueprint.js";
import {
  parseApplicationGraph,
  validateApplicationGraph,
} from "../src/model.js";
import { matchServiceWorkOrdersGraphV1 } from "../src/service-work-orders-graph-witness.js";
import { serviceWorkOrdersInput } from "../../compiler/test/fixtures/service-work-orders.js";
const blueprint = () =>
  JSON.parse(
    readFileSync(
      new URL("./fixtures/service-work-orders-blueprint.json", import.meta.url),
      "utf8",
    ),
  ).blueprint;
describe("Work Orders public admission", () => {
  it("admits the complete Blueprint cancellation pair through JSON persistence", () => {
    const value = blueprint();
    expect(assertProductBlueprint(JSON.parse(JSON.stringify(value)))).toEqual(
      value,
    );
  });
  it.each(["assign", "reassign", "resolve"])(
    "rejects %s outside the complete family",
    (verb) => {
      const value = blueprint();
      value.pageIntents.pop();
      value.workflows[0].transitions.pop();
      value.actors[0].permissions[0].actions = [
        "create",
        "read",
        "update",
        verb,
      ];
      expect(() => assertProductBlueprint(value)).toThrow();
    },
  );
  it("admits the complete Graph with exactly the empty-seed numeric exception", () => {
    const { graph } = serviceWorkOrdersInput();
    expect(validateApplicationGraph(graph)).toEqual([]);
    const persisted = parseApplicationGraph(JSON.parse(JSON.stringify(graph)));
    expect(matchServiceWorkOrdersGraphV1(persisted)?.numericFields).toEqual([
      { entityKey: "work-order-history", fieldKey: "orderVersion" },
    ]);
  });
  it.each([
    "missing-seed",
    "seed",
    "bound",
    "exclusive",
    "decimal",
    "coordinate",
    "field",
    "grant",
    "role",
    "page",
    "effect",
    "event",
    "identity",
    "index",
    "relation",
  ])("rejects malformed Graph %s", (change) => {
    const { graph: g } = serviceWorkOrdersInput();
    const h = g.domain.entities[1]!;
    const version = h.fields.find((f) => f.key === "orderVersion")!;
    if (change === "missing-seed") delete g.domain.seedData;
    if (change === "seed")
      g.domain.seedData = [
        { entity: h.key, id: "fake", values: { orderVersion: 0 } },
      ];
    if (change === "bound") version.numericDomain!.maximum!.value++;
    if (change === "exclusive")
      version.numericDomain!.minimum!.inclusive = false;
    if (change === "decimal") version.type = "decimal";
    if (change === "coordinate") version.key = "otherVersion";
    if (change === "field") h.fields.pop();
    if (change === "grant") g.policy.permissions[0]!.actions.push("delete");
    if (change === "role") g.policy.roles.push("administrator");
    if (change === "page") g.page.pages[0]!.route = "/other";
    if (change === "effect")
      g.flow.flows[0]!.transitions[0]!.effects = [
        { capability: "audit.record", operation: "record" },
      ];
    if (change === "event") g.flow.flows[0]!.events.push("cancel");
    if (change === "identity") g.domain.entities[2]!.fields[0]!.unique = false;
    if (change === "index") h.indexes = [];
    if (change === "relation") g.domain.relations[0]!.field = "wrongId";
    expect(matchServiceWorkOrdersGraphV1(g)).toBeUndefined();
    if (change !== "seed")
      expect(
        validateApplicationGraph(g).some((i) =>
          [
            "domain.field.numeric_domain_witness_missing",
            "domain.field.numeric_domain_invalid",
          ].includes(i.code),
        ),
      ).toBe(true);
  });
});

it("reserves the dispatcher assignee endpoint from both business entity keys", () => {
  for (const key of ["work-order", "work-order-history"]) {
    const b = JSON.parse(
      JSON.stringify(blueprint()).replaceAll(
        '"' + key + '"',
        '"work-order-assignees"',
      ),
    );
    expect(() => assertProductBlueprint(b)).toThrow();
    const { graph } = serviceWorkOrdersInput();
    const g = JSON.parse(
      JSON.stringify(graph).replaceAll(
        '"' + key + '"',
        '"work-order-assignees"',
      ),
    );
    expect(matchServiceWorkOrdersGraphV1(g)).toBeUndefined();
    expect(() => parseApplicationGraph(g)).toThrow();
  }
});
import { projectDefinitionSelection } from "../../adapters/src/requirements/definition-selection-catalogue.js";
it.each([
  "team-task-tracking",
  "expense-approval",
  "appointment-booking-v1",
  "appointment-booking-v2",
  "knowledge-resource-directory",
  "supplies-stockroom",
])("keeps new verbs out of existing %s", (definitionKey) => {
  const { blueprint: existing } = projectDefinitionSelection({
    definitionKey,
    disposition: "supported-default",
    requirementId: "old-family-test",
    title: "Existing family",
    outcome: "Complete the existing reviewed workflow.",
    materialQuestions: [],
    businessParameters: null,
  });
  for (const verb of ["assign", "reassign", "resolve"]) {
    const changed = structuredClone(existing);
    changed.actors[0]!.permissions[0]!.actions.push(verb as "assign");
    expect(() => assertProductBlueprint(changed)).toThrow(
      /complete Service Work Orders/,
    );
  }
});
it("retains duplicate transition rejection without any new action verb", () => {
  const { blueprint: existing } = projectDefinitionSelection({
    definitionKey: "team-task-tracking",
    disposition: "supported-default",
    requirementId: "old-family-test",
    title: "Existing family",
    outcome: "Complete the existing reviewed workflow.",
    materialQuestions: [],
    businessParameters: null,
  });
  existing.workflows[0]!.transitions.push(
    structuredClone(existing.workflows[0]!.transitions[0]!),
  );
  expect(() => assertProductBlueprint(existing)).toThrow(/duplicated/);
});
it.each([
  "missing-minimum",
  "missing-maximum",
  "wrong-coordinate",
  "invalid-seed",
  "unrelated-field",
])("retains numeric validation for %s", (change) => {
  const { graph: g } = serviceWorkOrdersInput();
  const version = g.domain.entities[1]!.fields.find(
    (f) => f.key === "orderVersion",
  )!;
  if (change === "missing-minimum") delete version.numericDomain!.minimum;
  if (change === "missing-maximum") delete version.numericDomain!.maximum;
  if (change === "wrong-coordinate") {
    g.domain.entities[0]!.fields.push(version);
    g.domain.entities[1]!.fields = g.domain.entities[1]!.fields.filter(
      (f) => f !== version,
    );
  }
  if (change === "invalid-seed")
    g.domain.seedData = [
      { entity: g.domain.entities[1]!.key, values: { orderVersion: -1 } },
    ];
  if (change === "unrelated-field")
    g.domain.entities[0]!.fields.push({
      ...structuredClone(version),
      key: "otherNumber",
    });
  expect(matchServiceWorkOrdersGraphV1(g)).toBeUndefined();
  expect(
    validateApplicationGraph(g).some(
      (i) =>
        i.code.startsWith("domain.field.numeric_domain") ||
        i.code === "domain.seed.numeric_domain_invalid",
    ),
  ).toBe(true);
});
