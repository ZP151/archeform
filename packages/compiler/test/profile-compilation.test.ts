import { describe, expect, it } from "vitest";

import { composeProfileDraft } from "@factory/capabilities";

import { generateApplicationBundle } from "../src/index.js";

describe("profile compilation", () => {
  it("compiles an audit-free Expense Graph deterministically", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.notification"],
    }).graph;

    const first = generateApplicationBundle({
      publishedRevisionId: "expense-audit-free-published-1",
      graph,
    });
    const second = generateApplicationBundle({
      publishedRevisionId: "expense-audit-free-published-1",
      graph,
    });

    expect(first).toEqual(second);
    expect(
      first.files.find((file) => file.path === "api/policy/policy.csv")
        ?.content,
    ).not.toContain(", audit");
    expect(first.files.map((file) => file.path)).not.toContain(
      "api/src/capabilities/core.audit.ts",
    );
  });

  it("counts declared audit capability effects in the generated Expense journey", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
    }).graph;
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "expense-audit-journey-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "toHaveLength(5)",
    );
  });

  it.each([
    "expense-approval",
    "restaurant-ordering",
    "simple-ecommerce",
  ] as const)(
    "compiles $profile as an independent published application",
    (profile) => {
      const graph = composeProfileDraft({ profile }).graph;
      const bundle = generateApplicationBundle({
        publishedRevisionId: profile + "-published-1",
        graph,
      });

      expect(bundle.rootDirectory).toBe(
        profile + "-" + profile + "-published-1",
      );
      expect(bundle.files.map((file) => file.path)).toEqual(
        expect.arrayContaining([
          "web/app/page.tsx",
          "api/src/main.ts",
          "database/prisma/schema.prisma",
          "api/policy/policy.csv",
          "api/src/flows/definitions.ts",
          "tests/journeys.generated.md",
        ]),
      );
    },
  );
});
