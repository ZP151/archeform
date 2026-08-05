import { describe, expect, it } from "vitest";

import {
  assertSerializablePlan,
  createCompilerTargetRegistryV1,
  type CompilerTargetPluginV1,
  type PublishedCompilationInput,
} from "../src/index.js";

interface DocumentationPlan {
  readonly apiVersion: string;
  readonly title: string;
  readonly sections: readonly string[];
}

function documentationPlugin(): CompilerTargetPluginV1<DocumentationPlan> {
  return {
    apiVersion: "factory.compiler-target/v1",
    key: "documentation",
    supports: (input) => input.context.identityPolicyEnabled === false,
    plan: (input) => ({
      apiVersion: "factory.compiler-target/v1",
      title: input.graph.metadata.name,
      sections: ["api-reference", "entity-relationship"],
    }),
    render: (plan) => [
      {
        path: "docs/api-reference.md",
        content: `# ${plan.title}\n\nGenerated API reference.\n`,
      },
      {
        path: "docs/entity-relationship.md",
        content: `# ${plan.title}\n\nGenerated ERD.\n`,
      },
    ],
    validate: (files) =>
      files.some((file) => file.path.endsWith("api-reference.md"))
        ? { ok: true }
        : {
            ok: false,
            issues: [
              {
                target: "documentation",
                path: "docs/api-reference.md",
                code: "missing.api-reference",
                message: "The documentation set must contain an API reference.",
              },
            ],
          },
  };
}

function stubInput(
  overrides: Partial<PublishedCompilationInput> = {},
): PublishedCompilationInput {
  return {
    publishedRevisionId: "rev-1",
    graph: {
      metadata: { name: "Sample App" },
    } as PublishedCompilationInput["graph"],
    compositionLock: {} as PublishedCompilationInput["compositionLock"],
    rendererGraph: {} as PublishedCompilationInput["rendererGraph"],
    context: {
      restaurantRuntimeEnabled: false,
      restaurantArtifacts: {},
      identityPolicyEnabled: false,
      useGenericOrderOperationsPersistence: false,
      useGenericMoneyPricingPersistence: false,
      notificationOutboxEnabled: false,
      additionalPrismaSchemaFragments: [],
      additionalMigrationFragments: [],
    },
    ...overrides,
  };
}

describe("CompilerTargetPluginV1 lifecycle", () => {
  it("advertises the versioned api contract", () => {
    const plugin = documentationPlugin();
    expect(plugin.apiVersion).toBe("factory.compiler-target/v1");
    expect(plugin.key).toBe("documentation");
  });

  it("plans from the immutable input and renders deterministically", () => {
    const plugin = documentationPlugin();
    const input = stubInput();
    expect(plugin.supports(input)).toBe(true);

    const plan = plugin.plan(input);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);

    const files = plugin.render(plan);
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("docs/api-reference.md");
    expect(files[0].content).toContain("Sample App");
  });

  it("declines input it does not support", () => {
    const plugin = documentationPlugin();
    expect(
      plugin.supports(
        stubInput({
          context: {
            restaurantRuntimeEnabled: false,
            restaurantArtifacts: {},
            identityPolicyEnabled: true,
            useGenericOrderOperationsPersistence: false,
            useGenericMoneyPricingPersistence: false,
            notificationOutboxEnabled: false,
            additionalPrismaSchemaFragments: [],
            additionalMigrationFragments: [],
          },
        }),
      ),
    ).toBe(false);
  });

  it("reports validation issues instead of throwing", () => {
    const plugin = documentationPlugin();
    const result = plugin.validate([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].code).toBe("missing.api-reference");
    }
  });

  it("runs the full lifecycle through the registry", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(documentationPlugin());

    const files = registry.run("documentation", stubInput());
    expect(files.map((file) => file.path)).toEqual([
      "docs/api-reference.md",
      "docs/entity-relationship.md",
    ]);
  });
});

describe("plan serializability boundary", () => {
  it("accepts plain serializable plans", () => {
    expect(() =>
      assertSerializablePlan({
        title: "Sample",
        count: 3,
        flags: [true, false],
        nested: { key: "value" },
        nullable: null,
      }),
    ).not.toThrow();
  });

  it.each([
    {
      label: "a function value",
      plan: { fn: () => 1 },
      message: "must be plain data",
    },
    {
      label: "an undefined value",
      plan: { missing: undefined },
      message: "must be plain data",
    },
    {
      label: "a symbol value",
      plan: { key: Symbol("x") },
      message: "must be plain data",
    },
    {
      label: "a bigint value",
      plan: { count: 1n },
      message: "must be plain data",
    },
    {
      label: "a NaN value",
      plan: { count: Number.NaN },
      message: "must be finite",
    },
    {
      label: "an Infinity value",
      plan: { count: Number.POSITIVE_INFINITY },
      message: "must be finite",
    },
    {
      label: "a Date instance",
      plan: { at: new Date(0) },
      message: "must use plain records and arrays",
    },
  ])("rejects $label", ({ plan, message }) => {
    expect(() => assertSerializablePlan(plan)).toThrow(message);
  });

  it("rejects an array-rooted cycle with the fail-closed message", () => {
    const cyclicArray: unknown[] = [];
    cyclicArray.push(cyclicArray);

    expect(() => assertSerializablePlan(cyclicArray)).toThrow(
      "must not contain cycles",
    );
  });

  it("accepts a shared non-cyclic reference", () => {
    const shared = { key: "value" };

    expect(() =>
      assertSerializablePlan({ first: shared, second: shared }),
    ).not.toThrow();
  });
});
