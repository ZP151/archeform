import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertProductBlueprint,
  type ProductBlueprintV1,
} from "../src/product-blueprint.js";
import { matchCustomerRequestsBlueprintV1 } from "../src/customer-requests-blueprint-witness.js";
import { matchServiceWorkOrdersBlueprintV1 } from "../src/service-work-orders-blueprint-witness.js";
import { definitionSelectionCatalogue } from "../../adapters/src/requirements/definition-selection-catalogue.js";
const fixture = (): ProductBlueprintV1 =>
  JSON.parse(
    readFileSync(
      new URL("./fixtures/customer-requests-blueprint.json", import.meta.url),
      "utf8",
    ),
  ).blueprint;

describe("Customer Requests exact Blueprint witness", () => {
  it("admits the complete owned conversation after schema parsing and JSON persistence", () => {
    const b = assertProductBlueprint(JSON.parse(JSON.stringify(fixture())));
    expect(matchCustomerRequestsBlueprintV1(b)).toEqual({
      requestEntity: "customer-request",
      historyEntity: "request-history",
      workflow: "handle-request",
      roles: { staff: "staff", customer: "customer" },
      pages: {
        list: "my-requests",
        form: "new-request",
        detail: "request-detail",
        queue: "staff-queue",
      },
      numericFields: [
        { entityKey: "request-history", fieldKey: "requestVersion" },
        { entityKey: "request-history", fieldKey: "correctsVersion" },
      ],
    });
    expect(matchServiceWorkOrdersBlueprintV1(b)).toBeUndefined();
  });
  it.each([
    [
      "extra entity",
      (b: ProductBlueprintV1) =>
        b.entities.push(structuredClone(b.entities[0]!)),
    ],
    ["owner removed", (b: ProductBlueprintV1) => b.entities[0]!.fields.pop()],
    [
      "owner optional",
      (b: ProductBlueprintV1) => (b.entities[0]!.fields[3]!.required = false),
    ],
    [
      "history field removed",
      (b: ProductBlueprintV1) => b.entities[1]!.fields.pop(),
    ],
    [
      "history reference",
      (b: ProductBlueprintV1) =>
        (b.entities[1]!.fields[0]!.referenceTo = "request-history"),
    ],
    [
      "extra role",
      (b: ProductBlueprintV1) => b.actors.push(structuredClone(b.actors[0]!)),
    ],
    [
      "staff create",
      (b: ProductBlueprintV1) =>
        b.actors[0]!.permissions[0]!.actions.push("create"),
    ],
    [
      "customer resolve",
      (b: ProductBlueprintV1) =>
        b.actors[1]!.permissions[0]!.actions.push("complete"),
    ],
    [
      "history write",
      (b: ProductBlueprintV1) =>
        b.actors[1]!.permissions[1]!.actions.push("create"),
    ],
    ["page missing", (b: ProductBlueprintV1) => b.pageIntents.pop()],
    [
      "extra page",
      (b: ProductBlueprintV1) =>
        b.pageIntents.push(structuredClone(b.pageIntents[0]!)),
    ],
    ["page order", (b: ProductBlueprintV1) => b.pageIntents.reverse()],
    ["missing flow", (b: ProductBlueprintV1) => b.workflows.pop()],
    [
      "duplicate transition",
      (b: ProductBlueprintV1) =>
        b.workflows[0]!.transitions.push(
          structuredClone(b.workflows[0]!.transitions[0]!),
        ),
    ],
    [
      "staff reopen",
      (b: ProductBlueprintV1) =>
        (b.workflows[0]!.transitions[1]!.actorKey = "staff"),
    ],
    [
      "wrong cancel state",
      (b: ProductBlueprintV1) =>
        (b.workflows[0]!.transitions[2]!.from = "resolved"),
    ],
    [
      "history ordering",
      (b: ProductBlueprintV1) => b.entities[1]!.fields.reverse(),
    ],
    [
      "required correction",
      (b: ProductBlueprintV1) => (b.entities[1]!.fields[10]!.required = true),
    ],
    [
      "extra business version",
      (b: ProductBlueprintV1) =>
        b.entities[0]!.fields.push({
          key: "version",
          label: "Version",
          type: "number",
          required: true,
        }),
    ],
  ] as const)("rejects %s without label-based admission", (_name, mutate) => {
    const b = fixture();
    mutate(b);
    expect(matchCustomerRequestsBlueprintV1(b)).toBeUndefined();
    expect(() => assertProductBlueprint(b)).toThrow();
  });
  it.each([2, 10])(
    "requires exact numeric domain at history position %s",
    (position) => {
      for (const change of [
        "min",
        "max",
        "exclusive",
        "negative-zero",
        "missing",
        "decimal",
      ]) {
        const b = fixture(),
          f = b.entities[1]!.fields[position]!;
        if (change === "min") f.numericDomain!.minimum!.value = -1;
        if (change === "max") f.numericDomain!.maximum!.value++;
        if (change === "exclusive") f.numericDomain!.maximum!.inclusive = false;
        if (change === "negative-zero") f.numericDomain!.minimum!.value = -0;
        if (change === "missing") delete f.numericDomain;
        if (change === "decimal") f.type = "currency";
        expect(matchCustomerRequestsBlueprintV1(b)).toBeUndefined();
        expect(() => assertProductBlueprint(b)).toThrow();
      }
    },
  );
  it.each(["health", "audit", "capabilities", "work-order-assignees"])(
    "reserves %s for both business entities",
    (reserved) => {
      for (const key of ["customer-request", "request-history"]) {
        const b = JSON.parse(
          JSON.stringify(fixture()).replaceAll(
            '"' + key + '"',
            '"' + reserved + '"',
          ),
        );
        expect(matchCustomerRequestsBlueprintV1(b)).toBeUndefined();
        expect(() => assertProductBlueprint(b)).toThrow();
      }
    },
  );
  it("rejects malformed distinctive coordinates even after removing every reply grant", () => {
    const b = fixture();
    for (const actor of b.actors)
      actor.permissions[0]!.actions = actor.permissions[0]!.actions.filter(
        (a) => a !== "reply",
      );
    expect(() => assertProductBlueprint(b)).toThrow(/Customer Requests/);
  });
  it.each(
    definitionSelectionCatalogue.map(
      (e) => [e.definitionKey, e.structure.blueprint] as const,
    ),
  )("preserves %s and rejects reply there", (_key, original) => {
    expect(() => assertProductBlueprint(original)).not.toThrow();
    expect(matchCustomerRequestsBlueprintV1(original)).toBeUndefined();
    const b = structuredClone(original);
    b.actors[0]!.permissions[0]!.actions.push("reply");
    expect(() => assertProductBlueprint(b)).toThrow(/Customer Requests/);
  });
  it("ignores display copy and never mutates the Blueprint", () => {
    const b = fixture();
    b.title = "Help Desk";
    for (const e of b.entities) {
      e.label = "Example record";
      for (const f of e.fields) f.label = "Example field";
    }
    const before = structuredClone(b);
    expect(
      matchCustomerRequestsBlueprintV1(assertProductBlueprint(b)),
    ).toBeDefined();
    expect(b).toEqual(before);
  });
});
it("returns a detached immutable Blueprint witness", () => {
  const b = fixture();
  const witness = matchCustomerRequestsBlueprintV1(assertProductBlueprint(b))!;
  expect(Object.isFrozen(witness)).toBe(true);
  expect(Object.isFrozen(witness.roles)).toBe(true);
  expect(Object.isFrozen(witness.pages)).toBe(true);
  expect(Object.isFrozen(witness.numericFields)).toBe(true);
  expect(Object.isFrozen(witness.numericFields[0])).toBe(true);
  b.actors[0]!.key = "changed";
  expect(witness.roles.staff).toBe("staff");
});
