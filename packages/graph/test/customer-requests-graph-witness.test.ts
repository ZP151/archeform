import { describe, it, expect } from "vitest";
import {
  parseApplicationGraph,
  validateApplicationGraph,
} from "../src/model.js";
import { matchCustomerRequestsGraphV1 } from "../src/customer-requests-graph-witness.js";
import { matchServiceWorkOrdersGraphV1 } from "../src/service-work-orders-graph-witness.js";
import { customerRequestsInput } from "../../compiler/test/fixtures/customer-requests.js";
describe("Customer Requests Graph seedless numeric witness", () => {
  it("recognizes exactly two history numeric coordinates after persistence", () => {
    const { graph } = customerRequestsInput();
    expect(validateApplicationGraph(graph)).toEqual([]);
    const g = parseApplicationGraph(JSON.parse(JSON.stringify(graph)));
    const witness = matchCustomerRequestsGraphV1(g)!;
    expect(witness.apiVersion).toBe(
      "factory.customer-requests-graph-witness/v1",
    );
    expect(witness.numericFields).toEqual([
      { entityKey: "request-history", fieldKey: "requestVersion" },
      { entityKey: "request-history", fieldKey: "correctsVersion" },
    ]);
    expect(Object.isFrozen(witness)).toBe(true);
    expect(Object.isFrozen(witness.numericFields[0])).toBe(true);
    expect(matchServiceWorkOrdersGraphV1(g)).toBeUndefined();
  });
  it.each([
    "missing-seed",
    "populated-seed",
    "missing-owner",
    "optional-owner",
    "grant",
    "identity-grant",
    "role",
    "page",
    "navigation",
    "effect",
    "transition",
    "event",
    "identity",
    "index",
    "relation",
    "provider",
    "capability",
  ])("rejects malformed %s", (change) => {
    const { graph: g } = customerRequestsInput();
    if (change === "missing-seed") delete g.domain.seedData;
    if (change === "populated-seed")
      g.domain.seedData = [
        {
          entity: "request-history",
          id: "fake",
          values: { requestVersion: 0, correctsVersion: 0 },
        },
      ];
    if (change === "missing-owner") g.domain.entities[0]!.fields.pop();
    if (change === "optional-owner")
      g.domain.entities[0]!.fields[3]!.required = false;
    if (change === "grant") g.policy.permissions[0]!.actions.push("create");
    if (change === "identity-grant")
      g.policy.permissions[2]!.actions.push("update");
    if (change === "role") g.policy.roles.push("admin");
    if (change === "page") g.page.pages[0]!.route = "/other";
    if (change === "navigation") g.page.navigation[0]!.icon = "inbox";
    if (change === "effect")
      g.flow.flows[0]!.transitions[0]!.effects = [
        { capability: "audit.record", operation: "record" },
      ];
    if (change === "transition")
      g.flow.flows[0]!.transitions.push(
        structuredClone(g.flow.flows[0]!.transitions[0]!),
      );
    if (change === "event") g.flow.flows[0]!.events.push("reply");
    if (change === "identity") g.domain.entities[2]!.fields[0]!.unique = false;
    if (change === "index") g.domain.entities[1]!.indexes[0]!.unique = false;
    if (change === "relation") g.domain.relations[0]!.field = "otherId";
    if (change === "provider")
      g.integration.providers.push({
        id: "other",
        type: "http",
        config: {},
      } as never);
    if (change === "capability") g.integration.capabilities.pop();
    expect(matchCustomerRequestsGraphV1(g)).toBeUndefined();
    if (change !== "populated-seed")
      expect(validateApplicationGraph(g).length).toBeGreaterThan(0);
  });
  it.each(["requestVersion", "correctsVersion"])(
    "retains bounds and unrelated numeric checks for %s",
    (key) => {
      for (const change of [
        "min",
        "max",
        "negative-zero",
        "exclusive",
        "decimal",
        "missing",
        "moved",
        "extra",
        "bad-seed",
      ]) {
        const { graph: g } = customerRequestsInput();
        const h = g.domain.entities[1]!,
          f = h.fields.find((f) => f.key === key)!;
        if (change === "min") f.numericDomain!.minimum!.value = -1;
        if (change === "max") f.numericDomain!.maximum!.value++;
        if (change === "negative-zero") f.numericDomain!.minimum!.value = -0;
        if (change === "exclusive") f.numericDomain!.minimum!.inclusive = false;
        if (change === "decimal") f.type = "decimal";
        if (change === "missing") delete f.numericDomain!.maximum;
        if (change === "moved") {
          h.fields = h.fields.filter((field) => field !== f);
          g.domain.entities[0]!.fields.push(f);
        }
        if (change === "extra")
          g.domain.entities[0]!.fields.push({
            ...structuredClone(f),
            key: "otherNumber",
          });
        if (change === "bad-seed")
          g.domain.seedData = [{ entity: h.key, values: { [key]: -1 } }];
        expect(matchCustomerRequestsGraphV1(g)).toBeUndefined();
        expect(
          validateApplicationGraph(g).some(
            (i) =>
              i.code.startsWith("domain.field.numeric_domain") ||
              i.code === "domain.seed.numeric_domain_invalid",
          ),
        ).toBe(true);
      }
    },
  );
});
