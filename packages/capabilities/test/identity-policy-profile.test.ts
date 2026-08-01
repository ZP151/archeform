import { describe, expect, it } from "vitest";

import { composeDefaultCapabilityDraft } from "../src/index.js";

function selectionFor(
  profile: Parameters<typeof composeDefaultCapabilityDraft>[0]["profile"],
  key: string,
) {
  return composeDefaultCapabilityDraft({
    profile,
  }).graph.integration.compositionSelections?.find(
    (selection) => selection.lock.key === key,
  );
}

describe("identity policy profile composition", () => {
  it("locks identity policy for Expense and Ecommerce with distinct validated bindings", () => {
    const expense = selectionFor("expense-approval", "core.identity-policy");
    const ecommerce = selectionFor("simple-ecommerce", "core.identity-policy");

    expect(expense?.lock).toMatchObject({
      key: "core.identity-policy",
      version: "1.0.0",
      lifecycle: "golden",
    });
    expect(ecommerce?.lock).toMatchObject({
      key: "core.identity-policy",
      version: "1.0.0",
      lifecycle: "golden",
    });
    expect(expense?.bindings).toEqual({
      principalEntity: { graphSymbol: "graph.domain.expense-principal" },
      sessionEntity: { graphSymbol: "graph.domain.expense-session" },
      defaultRole: { graphSymbol: "graph.policy.employee" },
      authenticatedRole: { graphSymbol: "graph.policy.manager" },
    });
    expect(ecommerce?.bindings).toEqual({
      principalEntity: { graphSymbol: "graph.domain.shopper" },
      sessionEntity: { graphSymbol: "graph.domain.shopper-session" },
      defaultRole: { graphSymbol: "graph.policy.shopper" },
      authenticatedRole: { graphSymbol: "graph.policy.merchant" },
    });

    for (const profile of ["expense-approval", "simple-ecommerce"] as const) {
      expect(
        selectionFor(profile, "core.policy-declarations")?.lock,
      ).toMatchObject({
        version: "1.0.0",
        lifecycle: "golden",
      });
      expect(selectionFor(profile, "core.audit")?.lock).toMatchObject({
        version: "1.0.2",
        lifecycle: "golden",
      });
    }
  });

  it("binds the Expense session relation to the principal natural key", () => {
    const graph = composeDefaultCapabilityDraft({
      profile: "expense-approval",
    }).graph;

    expect(graph.domain.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "expense-principal",
          fields: expect.arrayContaining([
            expect.objectContaining({ key: "subjectRef", unique: true }),
          ]),
        }),
        expect.objectContaining({
          key: "expense-session",
          fields: expect.arrayContaining([
            expect.objectContaining({ key: "subjectRef", type: "string" }),
          ]),
        }),
      ]),
    );
    expect(graph.domain.relations).toContainEqual({
      from: "expense-session",
      to: "expense-principal",
      kind: "many-to-one",
      field: "subjectRef",
    });
  });
});
