import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDefinitionCaseIndex,
  validateDefinitionCaseBindings,
} from "./definition-case-index.mjs";
import { definitionCaseBindings } from "./definition-case-bindings.mjs";

const definitions = [
  { definitionKey: "expense-approval" },
  { definitionKey: "appointment-booking-v1" },
];
const bindings = [
  {
    definitionKey: "expense-approval",
    runtimeFamily: "approval-correction/v1",
    caseId: "expense-approval-local",
    casePath: "e2e/consumer-approval.spec.ts",
    evidencePath:
      "docs/acceptance/evidence/consumer-approval-correction/expense",
  },
  {
    definitionKey: "appointment-booking-v1",
    runtimeFamily: "appointment-booking/v1",
    caseId: "appointment-booking-local",
    casePath: "e2e/appointment-booking.spec.ts",
    evidencePath: "docs/acceptance/evidence/appointment-booking",
  },
];

describe("definition case index", () => {
  it("routes the admitted stockroom to its actual Inventory case without changing acceptance status", () => {
    assert.deepEqual(
      definitionCaseBindings.find(
        (row) => row.definitionKey === "supplies-stockroom",
      ),
      {
        definitionKey: "supplies-stockroom",
        runtimeFamily: "inventory-operations/v1",
        caseId: "supplies-stockroom-local",
        casePath: "e2e/inventory-operations.spec.ts",
        evidencePath: "docs/acceptance/evidence/inventory-operations",
        protectedFixture: false,
      },
    );
  });
  it("derives a non-authoritative one-case-per-definition index", () => {
    const index = createDefinitionCaseIndex({ definitions, bindings });

    assert.deepEqual(index, {
      apiVersion: "factory.product-definition-case-index/v1",
      authoritative: false,
      definitions: [
        {
          definitionKey: "expense-approval",
          runtimeFamily: "approval-correction/v1",
          caseId: "expense-approval-local",
          casePath: "e2e/consumer-approval.spec.ts",
          evidencePath:
            "docs/acceptance/evidence/consumer-approval-correction/expense",
        },
        {
          definitionKey: "appointment-booking-v1",
          runtimeFamily: "appointment-booking/v1",
          caseId: "appointment-booking-local",
          casePath: "e2e/appointment-booking.spec.ts",
          evidencePath: "docs/acceptance/evidence/appointment-booking",
        },
      ],
    });
    assert.equal(Object.isFrozen(index), true);
    assert.equal(Object.isFrozen(index.definitions), true);
  });

  it("rejects a definition without exactly one case binding", () => {
    assert.throws(
      () => validateDefinitionCaseBindings(definitions, [bindings[0]]),
      (error) => error?.code === "definition.case.missing",
    );
  });

  it("rejects a case binding for an unregistered definition", () => {
    assert.throws(
      () =>
        validateDefinitionCaseBindings(definitions, [
          ...bindings,
          {
            ...bindings[0],
            definitionKey: "unregistered-definition",
            caseId: "unregistered-case",
          },
        ]),
      (error) => error?.code === "definition.case.unregistered",
    );
  });

  it("rejects duplicate definition and case identities", () => {
    assert.throws(
      () =>
        validateDefinitionCaseBindings(definitions, [
          bindings[0],
          { ...bindings[1], caseId: bindings[0].caseId },
        ]),
      (error) => error?.code === "definition.case.duplicate",
    );
  });
});
