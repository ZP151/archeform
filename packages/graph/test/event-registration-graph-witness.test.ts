import { describe, it, expect } from "vitest";
import {
  parseApplicationGraph,
  validateApplicationGraph,
} from "../src/model.js";
import { matchEventRegistrationGraphV1 } from "../src/event-registration-graph-witness.js";
import { eventRegistrationInput } from "../../compiler/test/fixtures/event-registration.js";
describe("Event Registration Graph witness", () => {
  it("recognizes the complete persisted graph without seeds", () => {
    const { graph } = eventRegistrationInput();
    const persisted = parseApplicationGraph(JSON.parse(JSON.stringify(graph)));
    expect(validateApplicationGraph(persisted)).toEqual([]);
    expect(
      matchEventRegistrationGraphV1(persisted)?.numericFields,
    ).toHaveLength(6);
  });
  it.each([
    "index",
    "seed",
    "owner",
    "effect",
    "cancel",
    "identity",
    "page",
    "navigation",
    "relation",
    "provider",
  ])("rejects altered %s", (change) => {
    const { graph: g } = structuredClone(eventRegistrationInput());
    if (change === "index") g.domain.entities[1]!.indexes[0]!.unique = false;
    if (change === "seed")
      g.domain.seedData = [{ entity: "event", values: { capacity: 1 } }];
    if (change === "owner") g.policy.permissions[7]!.actions.push("cancel");
    if (change === "effect")
      g.flow.flows[1]!.transitions[0]!.effects = [
        { capability: "audit.record", operation: "record" },
      ];
    if (change === "cancel") g.flow.flows[1]!.transitions[0]!.roles!.pop();
    if (change === "identity") g.domain.entities[4]!.fields[0]!.unique = false;
    if (change === "page") g.page.pages[0]!.route = "/wrong";
    if (change === "navigation") g.page.navigation[1]!.icon = "inbox";
    if (change === "relation") g.domain.relations[0]!.field = "wrongId";
    if (change === "provider") g.integration.capabilities.pop();
    expect(matchEventRegistrationGraphV1(g)).toBeUndefined();
    expect(validateApplicationGraph(g).length).toBeGreaterThan(0);
  });
});

it.each([
  "capacity",
  "reservedSeats",
  "eventVersion",
  "beforeCapacity",
  "afterCapacity",
  "registrationVersion",
])("rejects numeric drift at %s without a synthetic seed", (key) => {
  for (const change of [
    "min",
    "max",
    "exclusive",
    "negative-zero",
    "missing",
    "decimal",
  ]) {
    const { graph: g } = structuredClone(eventRegistrationInput());
    const f = g.domain.entities
      .flatMap((e) => e.fields)
      .find((f) => f.key === key)!;
    if (change === "min") f.numericDomain!.minimum!.value--;
    if (change === "max") f.numericDomain!.maximum!.value++;
    if (change === "exclusive") f.numericDomain!.maximum!.inclusive = false;
    if (change === "negative-zero") f.numericDomain!.minimum!.value = -0;
    if (change === "missing") delete f.numericDomain;
    if (change === "decimal") f.type = "decimal";
    expect(matchEventRegistrationGraphV1(g)).toBeUndefined();
    expect(validateApplicationGraph(g).length).toBeGreaterThan(0);
  }
});
