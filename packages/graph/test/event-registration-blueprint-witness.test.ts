import { definitionSelectionCatalogue } from "../../adapters/src/requirements/definition-selection-catalogue.js";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  assertProductBlueprint,
  type ProductBlueprintV1,
} from "../src/product-blueprint.js";
import { matchEventRegistrationBlueprintV1 } from "../src/event-registration-blueprint-witness.js";
const fixture = (): ProductBlueprintV1 =>
  JSON.parse(
    readFileSync(
      new URL("./fixtures/event-registration-blueprint.json", import.meta.url),
      "utf8",
    ),
  ).blueprint;
describe("Event Registration exact Blueprint", () => {
  it("admits four entities, two workflows and five pages after persistence", () => {
    const blueprint = assertProductBlueprint(fixture());
    const witness = matchEventRegistrationBlueprintV1(
      JSON.parse(JSON.stringify(blueprint)),
    )!;
    expect(witness.roles).toEqual({
      organizer: "organizer",
      attendee: "attendee",
    });
    expect(witness.numericFields).toHaveLength(6);
    expect(Object.isFrozen(witness.pages)).toBe(true);
  });
  it.each([
    "owner",
    "cancellation",
    "grant",
    "duplicate",
    "event-cancel",
    "registration-cancel",
    "order",
    "bounds",
    "history",
    "pages",
  ])("rejects malformed %s", (change) => {
    const b = fixture();
    if (change === "owner") b.entities[1]!.fields[1]!.required = false;
    if (change === "cancellation") b.entities[0]!.fields.pop();
    if (change === "grant")
      b.actors[1]!.permissions.push({
        entityKey: "event-history",
        actions: ["read"],
      });
    if (change === "duplicate")
      b.workflows[0]!.transitions.push(
        structuredClone(b.workflows[0]!.transitions[0]!),
      );
    if (change === "event-cancel") b.workflows[0]!.transitions.pop();
    if (change === "registration-cancel")
      b.workflows[1]!.transitions.splice(1, 1);
    if (change === "order") b.entities.reverse();
    if (change === "bounds")
      b.entities[0]!.fields[6]!.numericDomain!.minimum!.value = 0;
    if (change === "history") b.entities[2]!.fields.reverse();
    if (change === "pages") b.pageIntents.pop();
    expect(matchEventRegistrationBlueprintV1(b)).toBeUndefined();
    expect(() => assertProductBlueprint(b)).toThrow();
  });
});

it.each([
  "capacity",
  "reservedSeats",
  "eventVersion",
  "beforeCapacity",
  "afterCapacity",
  "registrationVersion",
])("keeps exact integer domain for %s", (key) => {
  for (const change of [
    "min",
    "max",
    "exclusive",
    "negative-zero",
    "missing",
    "decimal",
  ]) {
    const b = fixture();
    const f = b.entities.flatMap((e) => e.fields).find((f) => f.key === key)!;
    if (change === "min") f.numericDomain!.minimum!.value--;
    if (change === "max") f.numericDomain!.maximum!.value++;
    if (change === "exclusive") f.numericDomain!.maximum!.inclusive = false;
    if (change === "negative-zero") f.numericDomain!.minimum!.value = -0;
    if (change === "missing") delete f.numericDomain;
    if (change === "decimal") f.type = "currency";
    expect(matchEventRegistrationBlueprintV1(b)).toBeUndefined();
    expect(() => assertProductBlueprint(b)).toThrow(/Event Registration/);
  }
});
it.each(
  definitionSelectionCatalogue.map(
    (entry) => [entry.definitionKey, entry.structure.blueprint] as const,
  ),
)(
  "does not admit old definition %s or widen its verb vocabulary",
  (_key, original) => {
    expect(matchEventRegistrationBlueprintV1(original)).toBeUndefined();
    for (const verb of ["check-in", "undo-check-in"] as const) {
      const b = structuredClone(original);
      b.actors[0]!.permissions[0]!.actions.push(verb);
      expect(() => assertProductBlueprint(b)).toThrow(/Event Registration/);
    }
  },
);
it("does not generally permit duplicate cancel transitions", () => {
  const b = structuredClone(
    definitionSelectionCatalogue.find(
      (entry) => entry.family === "customer-requests",
    )!.structure.blueprint,
  );
  b.workflows[0]!.transitions.push(
    structuredClone(
      b.workflows[0]!.transitions.find((t) => t.key === "cancel")!,
    ),
  );
  expect(() => assertProductBlueprint(b)).toThrow();
});

it("keeps Appointment time/capacity admission and rejects its Event cancellation near-match", () => {
  const entry = definitionSelectionCatalogue.find(
    (entry) =>
      entry.family === "appointment" &&
      entry.structure.blueprint.entities.some((entity) =>
        ["startUtc", "endUtc", "capacity"].every((key) =>
          entity.fields.some((field) => field.key === key),
        ),
      ),
  )!;
  const b = structuredClone(entry.structure.blueprint);
  expect(() => assertProductBlueprint(b)).not.toThrow();
  expect(matchEventRegistrationBlueprintV1(b)).toBeUndefined();
  const schedule = b.entities.find((entity) =>
    entity.fields.some((field) => field.key === "capacity"),
  )!;
  schedule.fields.push(
    {
      key: "cancellationReason",
      label: "Cancellation reason",
      type: "long-text",
      required: false,
    },
    {
      key: "cancelledAt",
      label: "Cancelled at",
      type: "datetime",
      required: false,
    },
  );
  expect(() => assertProductBlueprint(b)).toThrow(/Event Registration/);
});
