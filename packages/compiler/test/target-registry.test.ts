import { describe, expect, it } from "vitest";

import {
  createCompilerTargetRegistryV1,
  type CompilationTargetKey,
  type CompilerTargetPluginV1,
  type GeneratedFile,
  type PublishedCompilationInput,
} from "../src/index.js";

interface StubPlan {
  readonly label: string;
}

function stubPlugin(
  overrides: Partial<CompilerTargetPluginV1<StubPlan>> = {},
): CompilerTargetPluginV1<StubPlan> {
  return {
    apiVersion: "factory.compiler-target/v1",
    key: "documentation",
    supports: () => true,
    plan: () => ({ label: "stub" }),
    render: () => [{ path: "docs/api-reference.md", content: "# API\n" }],
    validate: () => ({ ok: true }),
    ...overrides,
  };
}

function stubInput(): PublishedCompilationInput {
  return {
    publishedRevisionId: "rev-1",
    graph: {} as PublishedCompilationInput["graph"],
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
  };
}

describe("compiler target registry admission", () => {
  it("registers a versioned plugin and exposes deterministic ordering", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(stubPlugin({ key: "prisma-postgres" }));
    registry.register(stubPlugin({ key: "documentation" }));
    registry.register(stubPlugin({ key: "nest-api" }));

    expect(registry.registeredKeys).toEqual([
      "documentation",
      "nest-api",
      "prisma-postgres",
    ]);
  });

  it("rejects a duplicate plugin key", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(stubPlugin());
    expect(() => registry.register(stubPlugin())).toThrow(
      "is already registered",
    );
  });

  it("rejects an unsupported target key", () => {
    const registry = createCompilerTargetRegistryV1();
    expect(() =>
      registry.register(
        stubPlugin({ key: "unknown-target" as CompilationTargetKey }),
      ),
    ).toThrow("not a supported compilation target");
  });

  it("rejects a plugin with the wrong apiVersion", () => {
    const registry = createCompilerTargetRegistryV1();
    expect(() =>
      registry.register(
        stubPlugin({
          apiVersion:
            "factory.compiler-target/v0" as "factory.compiler-target/v1",
        }),
      ),
    ).toThrow("apiVersion 'factory.compiler-target/v1'");
  });

  it("rejects an unregistered target request", () => {
    const registry = createCompilerTargetRegistryV1();
    expect(() => registry.get("documentation")).toThrow(
      "No compiler target plugin is registered for 'documentation'.",
    );
  });
});

describe("compiler target lifecycle runner", () => {
  it("runs supports -> plan -> render -> validate for a supported input", () => {
    const registry = createCompilerTargetRegistryV1();
    const calls: string[] = [];
    registry.register(
      stubPlugin({
        supports: () => {
          calls.push("supports");
          return true;
        },
        plan: (input) => {
          calls.push("plan");
          expect(input.publishedRevisionId).toBe("rev-1");
          return { label: "stub" };
        },
        render: (plan) => {
          calls.push("render");
          expect(plan.label).toBe("stub");
          return [{ path: "docs/api-reference.md", content: "# API\n" }];
        },
        validate: (files: readonly GeneratedFile[]) => {
          calls.push("validate");
          expect(files).toHaveLength(1);
          return { ok: true };
        },
      }),
    );

    const files = registry.run("documentation", stubInput());

    expect(calls).toEqual(["supports", "plan", "render", "render", "validate"]);
    expect(files).toEqual([
      { path: "docs/api-reference.md", content: "# API\n" },
    ]);
  });

  it("rejects an unsupported input before planning", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(stubPlugin({ supports: () => false }));

    expect(() => registry.run("documentation", stubInput())).toThrow(
      "does not support the given compilation input",
    );
  });

  it("rejects a non-serializable plan", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(
      stubPlugin({
        plan: () => ({ label: () => "not plain" }) as unknown as StubPlan,
      }),
    );

    expect(() => registry.run("documentation", stubInput())).toThrow(
      "must be plain data",
    );
  });

  it("rejects a cyclic plan", () => {
    const registry = createCompilerTargetRegistryV1();
    const plan: Record<string, unknown> = { label: "cyclic" };
    plan.self = plan;
    registry.register(stubPlugin({ plan: () => plan as unknown as StubPlan }));

    expect(() => registry.run("documentation", stubInput())).toThrow(
      "must not contain cycles",
    );
  });

  it("rejects nondeterministic rendering", () => {
    const registry = createCompilerTargetRegistryV1();
    let calls = 0;
    registry.register(
      stubPlugin({
        render: () => [
          { path: "docs/api-reference.md", content: `# API ${++calls}\n` },
        ],
      }),
    );

    expect(() => registry.run("documentation", stubInput())).toThrow(
      "produced nondeterministic output",
    );
  });

  it("rejects duplicate output paths", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(
      stubPlugin({
        render: () => [
          { path: "docs/api-reference.md", content: "# API\n" },
          { path: "docs/api-reference.md", content: "# API again\n" },
        ],
      }),
    );

    expect(() => registry.run("documentation", stubInput())).toThrow(
      "Generated output collision at 'docs/api-reference.md'.",
    );
  });

  it.each([
    { label: "a parent traversal", path: "../escape.md" },
    { label: "an absolute path", path: "/etc/passwd" },
    { label: "a backslash path", path: "docs\\api-reference.md" },
  ])("rejects $label", ({ path }) => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(stubPlugin({ render: () => [{ path, content: "x" }] }));

    expect(() => registry.run("documentation", stubInput())).toThrow();
  });

  it("rejects a failed validation with issue details", () => {
    const registry = createCompilerTargetRegistryV1();
    registry.register(
      stubPlugin({
        validate: () => ({
          ok: false,
          issues: [
            {
              target: "documentation",
              path: "docs/api-reference.md",
              code: "missing.api-title",
              message: "The API reference must declare a title.",
            },
          ],
        }),
      }),
    );

    expect(() => registry.run("documentation", stubInput())).toThrow(
      "validation failed: 'docs/api-reference.md' (missing.api-title): The API reference must declare a title.",
    );
  });
});
