import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  capabilityAssets,
  type CapabilitySelectionV1,
  type FactoryProfile,
} from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";

import {
  buildCompilationPlan,
  compilationTargets,
  generateApplicationBundle as compileApplicationBundle,
  type GenerateApplicationBundleOptions,
  type PublishedGraphInput,
} from "../src/index.js";

function withCompositionLock(
  input: Omit<PublishedGraphInput, "compositionLock"> | PublishedGraphInput,
): PublishedGraphInput {
  const persistedSelections = (
    graph: ApplicationGraphV1,
  ): readonly CapabilitySelectionV1[] => {
    const profile = graph.integration.compositionProfile as
      FactoryProfile | undefined;
    const selectionByKey = new Map(
      profile
        ? composeDefaultCapabilityDraft({
            profile,
          }).graph.integration.compositionSelections?.map((selection) => [
            selection.lock.key,
            selection,
          ])
        : [],
    );
    return (graph.integration.assetLocks ?? []).map((lock) => {
      const selection = selectionByKey.get(lock.key);
      return {
        lock,
        bindings:
          selection?.lock.version === lock.version &&
          selection.lock.manifestDigest === lock.manifestDigest
            ? selection.bindings
            : {},
      };
    });
  };
  return "compositionLock" in input
    ? input
    : {
        ...input,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(input.graph),
          selections: persistedSelections(input.graph),
        }),
      };
}

function generateApplicationBundle(
  input: Omit<PublishedGraphInput, "compositionLock"> | PublishedGraphInput,
  options?: GenerateApplicationBundleOptions,
) {
  return compileApplicationBundle(withCompositionLock(input), options);
}

const publishedExpense = withCompositionLock({
  publishedRevisionId: "published-expense-1",
  graph: {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense approval",
    },
    page: { pages: [], navigation: [] },
    domain: {
      entities: [{ key: "expense", label: "Expense", fields: [], indexes: [] }],
      relations: [],
    },
    policy: { roles: ["employee"], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
  },
});

const simpleEcommerceAssetLocks = composeProfileDraft({
  profile: "simple-ecommerce",
}).assetLocks;

function profileGraph(
  profile: "expense-approval" | "restaurant-ordering" | "simple-ecommerce",
): ApplicationGraphV1 {
  return structuredClone(composeProfileDraft({ profile }).graph);
}

const compilerTestDirectory = dirname(fileURLToPath(import.meta.url));

type GeneratedRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string; status?: string }>;
  transition(
    role: string,
    entityKey: string,
    recordId: string,
    event: string,
    options?: { expectedVersion: number; idempotencyKey: string },
  ): Promise<Record<string, unknown> & { id: string; status?: string }>;
  addCartItem(
    role: string,
    orderEntity: string,
    orderRecordId: string,
    input: {
      catalogEntity: string;
      catalogRecordId: string;
      quantity: number;
    },
  ): Promise<unknown>;
  cartItems(
    role: string,
    orderEntity: string,
    orderRecordId: string,
  ): Promise<readonly { id: string }[]>;
  list(
    role: string,
    entityKey: string,
  ): Promise<readonly (Record<string, unknown> & { id: string })[]>;
  capabilityEvents(
    role: string,
  ): Promise<
    readonly { capability: string; operation: string; recordId: string }[]
  >;
  auditLog(
    role: string,
  ): Promise<readonly { action: string; recordId: string }[]>;
};

async function withGeneratedRuntime<T>(
  input: PublishedGraphInput,
  run: (runtime: GeneratedRuntime) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(
    join(compilerTestDirectory, "generated-runtime-"),
  );
  try {
    const bundle = generateApplicationBundle(input);
    await Promise.all(
      bundle.files
        .filter((file) => file.path.startsWith("api/src/"))
        .map(async (file) => {
          const path = resolve(directory, file.path);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, file.content, "utf8");
        }),
    );
    const module = (await import(
      pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
    )) as { applicationRuntime: GeneratedRuntime };
    return await run(module.applicationRuntime);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const historicalExecutableLocks = [
  {
    key: "core.notification",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/core.notification/1.0.0",
    manifestDigest:
      "sha256:25eaacb88682dffeb80340ad7dcdd0dc78a49dfcd1eaf1f2bd0a0618750a67b2",
    lifecycle: "golden" as const,
  },
  {
    key: "core.workflow",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/core.workflow/1.0.0",
    manifestDigest:
      "sha256:a16fc83805e0e6b2468b93241374f790ac23b024cee1e8b4a1d54020b93fbd75",
    lifecycle: "golden" as const,
  },
  {
    key: "commerce.inventory",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/commerce.inventory/1.0.0",
    manifestDigest:
      "sha256:b503c3ce6ad627a09ec22d26b9a5cd675bfd3e04c6b0f45f9e02a72c5eba5de8",
    lifecycle: "golden" as const,
  },
  {
    key: "commerce.simulated-payment",
    version: "1.0.0",
    packageRoot:
      "packages/capabilities/assets/commerce.simulated-payment/1.0.0",
    manifestDigest:
      "sha256:0dff9794484428c760b0113c543891e3df87cd73f8082c4e15958f88e2b80981",
    lifecycle: "golden" as const,
  },
] as const;

const historicalCrudLock = {
  key: "core.crud",
  version: "1.0.0",
  packageRoot: "packages/capabilities/assets/core.crud/1.0.0",
  manifestDigest:
    "sha256:69bad8aab8bf23fe3820bba3d6fcf12e39c17399ae98390910f61e0792e8dfb7",
  lifecycle: "golden" as const,
};

const historicalCartLock = {
  key: "commerce.cart",
  version: "1.0.0",
  packageRoot: "packages/capabilities/assets/commerce.cart/1.0.0",
  manifestDigest:
    "sha256:38cf669fe2b0f3bbff51c10980fe3c50cfd9dd7349688576a677c7c12398cd0f",
  lifecycle: "golden" as const,
};

describe("compilation target registry", () => {
  it("defines the complete initial target set", () => {
    expect(compilationTargets.map((target) => target.key)).toEqual([
      "simulator",
      "next-web",
      "nest-api",
      "prisma-postgres",
      "casbin-policy",
      "xstate-flow",
      "test-suite",
      "documentation",
    ]);
  });

  it("builds deterministic output paths from an immutable published graph", () => {
    const first = buildCompilationPlan(publishedExpense);
    const second = buildCompilationPlan(publishedExpense);

    expect(first).toEqual(second);
    expect(first.graphHash).toMatch(/^sha256:/);
    expect(first.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: "next-web", path: "web/" }),
        expect.objectContaining({ target: "nest-api", path: "api/" }),
        expect.objectContaining({
          target: "prisma-postgres",
          path: "database/prisma/schema.prisma",
        }),
      ]),
    );
  });

  it("refuses a mutable or malformed compilation input", () => {
    expect(() =>
      buildCompilationPlan({
        graph: publishedExpense.graph,
      } as PublishedGraphInput),
    ).toThrow("Published revision id is required");
  });

  it("rejects a Candidate capability before compilation even with a declared external provider", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration = {
      providers: [{ id: "external-adapter", type: "http", version: "1.0.0" }],
      capabilities: [
        {
          key: "candidate.safe-adapter",
          providerId: "external-adapter",
          operation: "project",
        },
      ],
    };
    const input: PublishedGraphInput = {
      publishedRevisionId: "published-candidate-capability-1",
      graph,
      compositionLock: publishedExpense.compositionLock,
    };

    expect(() => buildCompilationPlan(input)).toThrow(
      "Candidate capabilities cannot be compiled",
    );
  });

  it("generates deterministic, isolated Web/API/database source from a published Graph", () => {
    const bundle = generateApplicationBundle(publishedExpense);

    expect(bundle.rootDirectory).toBe("expense-approval-published-expense-1");
    expect(bundle.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "web/app/page-runtime.tsx",
          content: expect.stringContaining("Expense approval"),
        }),
        expect.objectContaining({
          path: "web/app/[...path]/page.tsx",
          content: expect.stringContaining("GeneratedApplication"),
        }),
        expect.objectContaining({
          path: "web/app/favicon.ico/route.ts",
          content: expect.stringContaining("image/svg+xml"),
        }),
        expect.objectContaining({
          path: "web/package.json",
          content: expect.stringContaining("next"),
        }),
        expect.objectContaining({
          path: "api/src/main.ts",
          content: expect.stringContaining("NestFactory"),
        }),
        expect.objectContaining({
          path: "api/package.json",
          content: expect.stringContaining("@nestjs/core"),
        }),
        expect.objectContaining({
          path: "database/prisma/schema.prisma",
          content: expect.stringContaining("model Expense"),
        }),
        expect.objectContaining({
          path: "docker-compose.yml",
          content: expect.stringContaining("postgres"),
        }),
        expect.objectContaining({
          path: "api/policy/policy.csv",
          content: expect.any(String),
        }),
      ]),
    );
    expect(generateApplicationBundle(publishedExpense)).toEqual(bundle);
  });

  it("declares every handler type emitted by a non-commerce capability contract", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [
        file.path,
        file.content,
      ]),
    );

    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "export type CapabilityCommerceLineItem",
    );
    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "export type CapabilityConfiguredLine",
    );
  });

  it("plans one deterministic Restaurant bundle with transaction and projection artifacts", () => {
    const graph = composeProfileDraft({ profile: "restaurant-ordering" }).graph;
    const bundle = generateApplicationBundle({
      publishedRevisionId: "restaurant-transaction-plan-1",
      graph,
    });
    const paths = bundle.files.map((file) => file.path);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(
      expect.arrayContaining([
        "api/src/restaurant/restaurant-command.service.ts",
        "api/prisma/schema.prisma",
        "database/prisma/migrations/0001_initial/migration.sql",
        "api/policy/policy.csv",
        "api/src/flows/definitions.ts",
        "api/test/restaurant-runtime.generated.test.ts",
        "docs/api-reference.md",
        "docs/entity-relationship.md",
        "docs/permission-matrix.md",
      ]),
    );
    expect(
      generateApplicationBundle({
        publishedRevisionId: "restaurant-transaction-plan-1",
        graph,
      }),
    ).toEqual(bundle);
  });

  it("emits the immutable capability asset lock alongside generated source", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration.compositionProfile = "expense-approval";
    graph.integration.assetLocks = [
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
        lifecycle: "golden",
      },
    ];

    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-locked-capability-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["capability-lock.json"]).toContain('"key": "core.audit"');
    expect(files["capability-lock.json"]).toContain('"lifecycle": "golden"');
    expect(files["capability-lock.json"]).toContain('"graphHash": "sha256:');
  });

  it("composes each locked Golden package template into the API runtime", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration = {
      providers: [],
      capabilities: [
        {
          key: "audit.record",
          providerId: "factory",
          operation: "record",
        },
      ],
      compositionProfile: "expense-approval",
      assetLocks: [
        {
          key: "core.audit",
          version: "1.0.0",
          packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
          manifestDigest:
            "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
          lifecycle: "golden",
        },
      ],
    };

    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-package-template-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      'key: "core.audit"',
    );
    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      'effects: ["audit.record"],',
    );
    expect(files["api/src/capabilities/core.audit.ts"]).not.toContain("{{");
    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "export interface CapabilityRuntimeModule",
    );
    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "readonly version: string;",
    );
    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "readonly applicationId: string;",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      'from "./core.audit.js"',
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "getEffectHandler",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "getRecordHandler",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "getEffectHandler(capability: string, operation: string)",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "declaredEffectOperations.has(effectOperationKey(capability, operation))",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      'import { providedEffects } from "./capabilities/registry.js";',
    );
    expect(files["capability-template-lock.json"]).toContain(
      '"assetKey": "core.audit"',
    );
  });

  it("compiles a historical Golden asset lock from its physical package", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration = {
      providers: [],
      capabilities: [
        {
          key: "audit.record",
          providerId: "factory",
          operation: "record",
        },
      ],
      compositionProfile: "expense-approval",
      assetLocks: [
        {
          key: "core.audit",
          version: "1.0.0",
          packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
          manifestDigest:
            "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
          lifecycle: "golden",
        },
      ],
    };

    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-historical-audit-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      'version: "1.0.0"',
    );
    expect(files["api/src/capabilities/core.audit.ts"]).not.toContain(
      "core.audit v1.0.1",
    );
    expect(files["capability-template-lock.json"]).toContain(
      '"assetVersion": "1.0.0"',
    );
    expect(files["capability-template-lock.json"]).toContain(
      '"digest": "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b"',
    );
  });

  it("renders every changed base package from its historical template", () => {
    const currentGraph = composeProfileDraft({
      profile: "simple-ecommerce",
    }).graph;
    const historicalLocksByKey = new Map(
      historicalExecutableLocks.map((lock) => [lock.key, lock]),
    );
    const historicalGraph = structuredClone(currentGraph);
    historicalGraph.integration.assetLocks =
      historicalGraph.integration.assetLocks?.map(
        (lock) => historicalLocksByKey.get(lock.key) ?? lock,
      );

    const currentFiles = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "current-executable-packages-1",
        graph: currentGraph,
      }).files.map((file) => [file.path, file.content]),
    );
    const historicalFiles = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "historical-executable-packages-1",
        graph: historicalGraph,
      }).files.map((file) => [file.path, file.content]),
    );
    const historicalTemplateLock = JSON.parse(
      historicalFiles["capability-template-lock.json"] as string,
    ) as {
      templates: readonly {
        assetKey: string;
        assetVersion: string;
        digest: string;
      }[];
    };

    for (const lock of historicalExecutableLocks) {
      const path = `api/src/capabilities/${lock.key}.ts`;
      const currentLock = currentGraph.integration.assetLocks?.find(
        (candidate) => candidate.key === lock.key,
      );

      expect(currentLock).toBeDefined();
      expect(currentLock?.version).not.toBe(lock.version);
      expect(currentFiles[path]).toContain(
        `version: "${currentLock?.version}"`,
      );
      expect(historicalFiles[path]).toContain('version: "1.0.0"');
      expect(historicalFiles[path]).toContain("} as const;");
      expect(historicalTemplateLock.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            assetKey: lock.key,
            assetVersion: "1.0.0",
            digest:
              "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
          }),
        ]),
      );
    }
  });

  it("runs a fully locked current Expense lifecycle through package handlers", async () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
    }).graph;

    await withGeneratedRuntime(
      { publishedRevisionId: "historical-expense-lifecycle-1", graph },
      async (runtime) => {
        const created = await runtime.create("employee", "expense", {
          amount: 125,
          description: "Historical lock lifecycle",
        });
        expect(created.status).toBe("draft");
        const submitted = await runtime.transition(
          "employee",
          "expense",
          created.id,
          "submit",
        );
        expect(submitted.status).toBe("submitted");
        const approved = await runtime.transition(
          "manager",
          "expense",
          created.id,
          "approve",
        );

        expect(approved.status).toBe("approved");
        expect(await runtime.auditLog("finance")).toHaveLength(5);
        expect(
          (await runtime.capabilityEvents("finance")).map((event) => [
            event.capability,
            event.operation,
          ]),
        ).toEqual([
          ["audit.record", "record"],
          ["audit.record", "record"],
        ]);
      },
    );
  });

  it("replays a historical cart lock beside current executable packages", async () => {
    const draft = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    }).graph;
    const selections = draft.integration.compositionSelections!.map(
      (selection) =>
        selection.lock.key === "commerce.cart"
          ? { ...selection, lock: historicalCartLock }
          : selection,
    );
    const graph = structuredClone(draft);
    delete graph.integration.compositionSelections;
    graph.integration.assetLocks = selections.map(({ lock }) => lock);
    graph.integration.compositionProfile = "simple-ecommerce";
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    });
    const order = graph.domain.entities.find(
      (entity) => entity.key === "order",
    )!;
    const catalogEntity = graph.domain.relations.find(
      (relation) => relation.from === order.key,
    )!.to;
    const catalogSeed = graph.domain.seedData!.find(
      (seed) => seed.entity === catalogEntity,
    )!;
    const customer = graph.policy.permissions.find(
      (permission) =>
        permission.resource === order.key &&
        permission.actions.includes("create"),
    )!.role;

    await withGeneratedRuntime(
      {
        publishedRevisionId: "historical-cart-replay-1",
        graph,
        compositionLock,
      },
      async (runtime) => {
        const cart = await runtime.create(customer, order.key, {});
        await runtime.addCartItem(customer, order.key, cart.id, {
          catalogEntity,
          catalogRecordId: catalogSeed.id!,
          quantity: 1,
        });

        await expect(
          runtime.cartItems(customer, order.key, cart.id),
        ).resolves.toHaveLength(1);
      },
    );
  });

  it("keeps current handler runtime alongside unchanged metadata packages", () => {
    const graph = composeProfileDraft({ profile: "simple-ecommerce" }).graph;
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "current-handler-metadata-coexistence-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(graph.integration.assetLocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "core.crud", version: "1.0.1" }),
        expect.objectContaining({ key: "core.workflow", version: "1.0.1" }),
        expect.objectContaining({
          key: "commerce.inventory",
        }),
        expect.objectContaining({
          key: "commerce.simulated-payment",
          version: "1.0.1",
        }),
        expect.objectContaining({ key: "commerce.catalog", version: "1.2.0" }),
        expect.objectContaining({ key: "commerce.cart", version: "1.0.1" }),
        expect.objectContaining({ key: "commerce.order", version: "1.2.0" }),
      ]),
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getRecordHandler().create({",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getWorkflowHandler().applyTransition({",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "const item = await getCartHandler().add({",
    );
  });

  it("does not select a migrated target contribution from compositionProfile", () => {
    const graphWithUnknownProfile = structuredClone(
      composeProfileDraft({ profile: "expense-approval" }).graph,
    );
    graphWithUnknownProfile.integration.assetLocks =
      graphWithUnknownProfile.integration.assetLocks?.map((lock) =>
        lock.key === "core.crud" ? historicalCrudLock : lock,
      );
    const persisted = withCompositionLock({
      publishedRevisionId: "unknown-profile-contribution-1",
      graph: graphWithUnknownProfile,
    });
    graphWithUnknownProfile.integration.compositionProfile = "unknown-profile";
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graphWithUnknownProfile),
      selections: persisted.compositionLock.packages,
    });

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "unknown-profile-contribution-1",
        graph: graphWithUnknownProfile,
        compositionLock,
      }),
    ).not.toThrow();
  });

  it("preflights external providers before changing record state", async () => {
    const composed = composeProfileDraft({
      profile: "expense-approval",
    }).graph;
    const graph = {
      ...composed,
      integration: {
        ...composed.integration,
        providers: [{ id: "mail", type: "email", version: "1.0.0" }],
        capabilities: [
          ...composed.integration.capabilities,
          { key: "email.send", providerId: "mail", operation: "send" },
        ],
      },
      flow: {
        ...composed.flow,
        flows: composed.flow.flows.map((flow) => ({
          ...flow,
          transitions: flow.transitions.map((transition) =>
            transition.event === "submit"
              ? {
                  ...transition,
                  effects: [{ capability: "email.send", operation: "send" }],
                }
              : transition,
          ),
        })),
      },
    };

    await withGeneratedRuntime(
      { publishedRevisionId: "historical-external-provider-1", graph },
      async (runtime) => {
        const record = await runtime.create("employee", "expense", {
          amount: 1,
          description: "Historical provider boundary",
        });

        await expect(
          runtime.transition("employee", "expense", record.id, "submit"),
        ).rejects.toThrow(
          "External provider capability 'email.send' requires an activated adapter for provider 'mail'.",
        );
        expect((await runtime.list("employee", "expense"))[0]?.status).toBe(
          "draft",
        );
      },
    );
  });

  it("rejects a Graph capability without a locked Golden package", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration.capabilities = [
      {
        key: "audit.record",
        providerId: "factory",
        operation: "record",
      },
    ];

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-unlocked-capability-1",
        graph,
      }),
    ).toThrow("require matching Golden asset locks");
  });

  it("rejects the Candidate API version before compiler output", () => {
    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-candidate-api-boundary-1",
        graph: {
          apiVersion: "factory.candidate-capability/v1",
          id: "safe-adapter",
          version: "1.0.0",
          status: "quarantined",
        } as never,
      }),
    ).toThrow();
  });

  it.each([
    ["identity", { key: "candidate.safe-adapter" }],
    ["path", { packageRoot: "ecosystem/intake/candidates/safe-adapter/1.0.0" }],
    [
      "digest",
      {
        manifestDigest:
          "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    ],
  ])("rejects Candidate %s before compiler output", (_, part) => {
    const graph = structuredClone(
      composeProfileDraft({ profile: "expense-approval" }).graph,
    ) as unknown as Record<string, unknown>;
    const integration = graph.integration as {
      assetLocks: Array<Record<string, unknown>>;
    };
    integration.assetLocks[0] = { ...integration.assetLocks[0], ...part };

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-candidate-boundary-1",
        graph: graph as unknown as ApplicationGraphV1,
      }),
    ).toThrow();
  });

  it("compiles declared external capabilities without Golden package locks", () => {
    const graph = {
      ...publishedExpense.graph,
      integration: {
        providers: [{ id: "mail", type: "email", version: "1.0.0" }],
        capabilities: [
          { key: "email.send", providerId: "mail", operation: "send" },
        ],
      },
    };
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-external-capability-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "capabilityModules: readonly CapabilityRuntimeModule[] = [];",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      '"providerId": "mail"',
    );
  });

  it("fails a declared external effect at the provider boundary before state changes", async () => {
    const composed = composeProfileDraft({ profile: "expense-approval" }).graph;
    const graph = {
      ...composed,
      integration: {
        ...composed.integration,
        providers: [{ id: "mail", type: "email", version: "1.0.0" }],
        capabilities: [
          ...composed.integration.capabilities,
          { key: "email.send", providerId: "mail", operation: "send" },
        ],
      },
      flow: {
        ...composed.flow,
        flows: composed.flow.flows.map((flow) => ({
          ...flow,
          transitions: flow.transitions.map((transition) =>
            transition.event === "submit"
              ? {
                  ...transition,
                  effects: [{ capability: "email.send", operation: "send" }],
                }
              : transition,
          ),
        })),
      },
    };

    await withGeneratedRuntime(
      { publishedRevisionId: "published-external-effect-1", graph },
      async (runtime) => {
        const record = await runtime.create("employee", "expense", {
          amount: 1,
          description: "provider boundary",
        });

        await expect(
          runtime.transition("employee", "expense", record.id, "submit"),
        ).rejects.toThrow(
          "External provider capability 'email.send' requires an activated adapter for provider 'mail'.",
        );
        expect((await runtime.list("employee", "expense"))[0]?.status).toBe(
          "draft",
        );
      },
    );
  });

  it("preflights an external effect before Factory payment and inventory handlers", async () => {
    const composed = composeProfileDraft({
      profile: "simple-ecommerce",
    }).graph;
    const order = composed.domain.entities.find(
      (entity) => entity.key === "order",
    )!;
    const catalogEntity = composed.domain.relations.find(
      (relation) => relation.from === order.key,
    )!.to;
    const catalogSeed = composed.domain.seedData!.find(
      (seed) => seed.entity === catalogEntity,
    )!;
    const customer = composed.policy.permissions.find(
      (permission) =>
        permission.resource === order.key &&
        permission.actions.includes("create"),
    )!.role;
    const auditRole = composed.policy.permissions.find(
      (permission) =>
        permission.resource === order.key &&
        permission.actions.includes("audit"),
    )!.role;
    const graph = {
      ...composed,
      integration: {
        ...composed.integration,
        providers: [{ id: "mail", type: "email", version: "1.0.0" }],
        capabilities: [
          ...composed.integration.capabilities,
          { key: "email.send", providerId: "mail", operation: "send" },
        ],
      },
      flow: {
        ...composed.flow,
        flows: composed.flow.flows.map((flow) => ({
          ...flow,
          transitions: flow.transitions.map((transition) =>
            transition.event === "pay"
              ? {
                  ...transition,
                  effects: [
                    ...(transition.effects ?? []),
                    { capability: "email.send", operation: "send" },
                  ],
                }
              : transition,
          ),
        })),
      },
    };

    await withGeneratedRuntime(
      { publishedRevisionId: "published-mixed-provider-effects-1", graph },
      async (runtime) => {
        const record = await runtime.create(customer, order.key, {});
        await runtime.addCartItem(customer, order.key, record.id, {
          catalogEntity,
          catalogRecordId: catalogSeed.id!,
          quantity: 1,
        });
        await runtime.transition(customer, order.key, record.id, "submit", {
          expectedVersion: 0,
          idempotencyKey: "external-provider-preflight-submit-1",
        });
        const stockBefore = (await runtime.list(customer, catalogEntity)).find(
          (candidate) => candidate.id === catalogSeed.id,
        )!.stock;
        const capabilityEventsBefore =
          await runtime.capabilityEvents(auditRole);

        await expect(
          runtime.transition(customer, order.key, record.id, "pay", {
            expectedVersion: 1,
            idempotencyKey: "external-provider-preflight-pay-1",
          }),
        ).rejects.toThrow(
          "External provider capability 'email.send' requires an activated adapter for provider 'mail'.",
        );

        expect(
          (await runtime.list(customer, catalogEntity)).find(
            (candidate) => candidate.id === catalogSeed.id,
          )!.stock,
        ).toBe(stockBefore);
        expect(await runtime.capabilityEvents(auditRole)).toEqual(
          capabilityEventsBefore,
        );
        expect((await runtime.list(customer, order.key))[0]?.status).toBe(
          "submitted",
        );
      },
    );
  });

  it.each(["simple-ecommerce"] as const)(
    "executes a seeded $profile cart and payment journey",
    async (profile) => {
      const graph = composeProfileDraft({ profile }).graph;
      const order = graph.domain.entities.find(
        (entity) => entity.key === "order",
      )!;
      const catalogEntity = graph.domain.relations.find(
        (relation) => relation.from === order.key,
      )!.to;
      const catalogSeed = graph.domain.seedData!.find(
        (seed) => seed.entity === catalogEntity,
      )!;
      const customer = graph.policy.permissions.find(
        (permission) =>
          permission.resource === order.key &&
          permission.actions.includes("create"),
      )!.role;
      const auditRole = graph.policy.permissions.find((permission) =>
        permission.actions.includes("audit"),
      )?.role;
      const files = Object.fromEntries(
        generateApplicationBundle({
          publishedRevisionId: `${profile}-commerce-journey-1`,
          graph,
        }).files.map((file) => [file.path, file.content]),
      );
      const journey = files["api/test/journey.generated.test.ts"]!;

      expect(journey.indexOf("applicationRuntime.addCartItem")).toBeLessThan(
        journey.indexOf('record.id, "submit"'),
      );
      expect(journey.indexOf('record.id, "submit"')).toBeLessThan(
        journey.indexOf('record.id, "pay"'),
      );

      await withGeneratedRuntime(
        { publishedRevisionId: `${profile}-commerce-runtime-1`, graph },
        async (runtime) => {
          const record = await runtime.create(customer, order.key, {});
          await runtime.addCartItem(customer, order.key, record.id, {
            catalogEntity,
            catalogRecordId: catalogSeed.id!,
            quantity: 1,
          });
          const submitted = await runtime.transition(
            customer,
            order.key,
            record.id,
            "submit",
            {
              expectedVersion: 0,
              idempotencyKey: "generated-profile-submit-1",
            },
          );
          expect(submitted.status).toBe("submitted");
          const paid = await runtime.transition(
            customer,
            order.key,
            record.id,
            "pay",
            {
              expectedVersion: 1,
              idempotencyKey: "generated-profile-pay-2",
            },
          );

          expect(paid.status).toBe("paid");
          expect(
            (await runtime.list(customer, catalogEntity)).find(
              (candidate) => candidate.id === catalogSeed.id,
            )?.stock,
          ).toBe((catalogSeed.values.stock as number) - 1);
          if (auditRole) {
            expect(
              (await runtime.capabilityEvents(auditRole)).map((event) => [
                event.capability,
                event.operation,
              ]),
            ).toEqual([
              ["cart.add", "add"],
              ["inventory.reserve", "reserve"],
              ["audit.record", "record"],
              ["payment.simulate", "simulate"],
              ["payment.simulate", "simulate"],
              ["inventory.decrement", "decrement"],
            ]);
          }
        },
      );
    },
  );

  it("rejects a locked package when its Factory repository root is unavailable", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: [],
    }).graph;

    expect(() =>
      generateApplicationBundle(
        {
          publishedRevisionId: "published-missing-package-root-1",
          graph,
        },
        { repositoryRoot: resolve("C:/factory-missing-root") },
      ),
    ).toThrow("could not be resolved");
  });

  it("emits a deployable initial Prisma migration and isolated Compose lifecycle", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [
        file.path,
        file.content,
      ]),
    );

    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "Expense"');
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "AuditEvent"');
    expect(files["database/Dockerfile"]).toContain("prisma migrate deploy");
    expect(files["api/Dockerfile"]).not.toContain("prisma db push");
    expect(files["web/.dockerignore"]).toContain("node_modules");
    expect(files["api/.dockerignore"]).toContain("node_modules");
    expect(files["api/package.json"]).toContain("@types/node");
    expect(files["docker-compose.yml"]).toContain("migrate:");
    expect(files["docker-compose.yml"]).toContain(
      "FACTORY_COMPOSE_PROJECT_NAME",
    );
    expect(files["docker-compose.yml"]).toContain(
      '"127.0.0.1:${FACTORY_API_PORT:-0}:3001"',
    );
    expect(files["docker-compose.yml"]).toContain(
      '"127.0.0.1:${FACTORY_WEB_PORT:-0}:3000"',
    );
    expect(files["docker-compose.yml"]).toContain(
      "factory-expense-approval-published-expense-1",
    );
    expect(files["pnpm-workspace.yaml"]).toContain("web");
    expect(files["README.md"]).toContain(
      "factory-expense-approval-published-expense-1",
    );
    expect(files["README.md"]).toContain(
      "docker compose down --volumes --remove-orphans",
    );
  });

  it("does not duplicate relation scalar fields within emitted Restaurant command models", () => {
    const draft = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph;
    const selections = draft.integration.compositionSelections!;
    const graph = structuredClone(draft);
    delete graph.integration.compositionSelections;
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    });
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-generic-relation-schema-1",
        graph,
        compositionLock,
      }).files.map(({ path, content }) => [path, content]),
    );
    const schema = files["database/prisma/schema.prisma"];
    const migration =
      files["database/prisma/migrations/0001_initial/migration.sql"];

    expect(schema).toBeDefined();
    expect(migration).toBeDefined();
    const schemaModel = (name: string) =>
      schema?.match(new RegExp(`model ${name} \\{[\\s\\S]*?^\\}`, "m"))?.[0];
    const migrationTable = (name: string) =>
      migration?.match(
        new RegExp(`CREATE TABLE "${name}" \\([\\s\\S]*?^\\);`, "m"),
      )?.[0];
    for (const [field, modelNames] of [
      ["tableSessionId", ["Order"]],
      [
        "orderId",
        ["OrderLine", "PaymentAttempt", "KitchenTicket", "InventoryLedger"],
      ],
      ["menuItemId", ["OrderLine", "InventoryLedger"]],
    ] as const) {
      for (const modelName of modelNames) {
        expect(
          schemaModel(modelName)?.match(new RegExp(`^  ${field} String`, "gm")),
        ).toHaveLength(1);
        expect(
          migrationTable(modelName)?.match(new RegExp(`^  "${field}" `, "gm")),
        ).toHaveLength(1);
      }
    }
    expect(schema).toContain(
      "table RestaurantTable @relation(fields: [tableCode], references: [code])",
    );
    expect(schema).toContain(
      "category MenuCategory @relation(fields: [categoryKey], references: [id])",
    );
    expect(schema).not.toContain("restaurantTableId");
    expect(schema).not.toContain("menuCategoryId");
    expect(migration).toContain(
      'FOREIGN KEY ("tableCode") REFERENCES "RestaurantTable" ("code")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("categoryKey") REFERENCES "MenuCategory" ("id")',
    );
    expect(migration).not.toContain('"restaurantTableId"');
    expect(migration).not.toContain('"menuCategoryId"');
  });

  it("fails closed when a declared relation field cannot resolve a unique target field", () => {
    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-unresolved-relation-field-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              {
                key: "expense",
                label: "Expense",
                fields: [
                  {
                    key: "accountReference",
                    type: "string",
                    required: true,
                  },
                ],
                indexes: [],
              },
              {
                key: "account",
                label: "Account",
                fields: [{ key: "name", type: "string", required: true }],
                indexes: [],
              },
            ],
            relations: [
              {
                from: "expense",
                to: "account",
                kind: "many-to-one",
                field: "accountReference",
              },
            ],
          },
        },
      }),
    ).toThrow(
      "Relation 'expense' to 'account' field 'accountReference' cannot resolve a unique target field.",
    );
  });

  it("emits reviewable API, relationship, and permission documents from the Published Graph", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-documentation-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              {
                key: "expense",
                label: "Expense",
                fields: [
                  { key: "amount", type: "decimal", required: true },
                  {
                    key: "status",
                    type: "enum",
                    required: true,
                    values: ["draft", "approved"],
                  },
                ],
                indexes: [{ fields: ["status"] }],
              },
              { key: "receipt", label: "Receipt", fields: [], indexes: [] },
            ],
            relations: [
              { from: "expense", to: "receipt", kind: "one-to-many" },
            ],
          },
          policy: {
            roles: ["employee", "manager"],
            permissions: [
              {
                role: "employee",
                resource: "expense",
                actions: ["create", "read"],
              },
              { role: "manager", resource: "expense", actions: ["approve"] },
            ],
          },
          flow: {
            flows: [
              {
                id: "expense-review",
                entity: "expense",
                initialState: "draft",
                states: ["draft", "approved"],
                events: ["approve"],
                transitions: [
                  {
                    from: "draft",
                    event: "approve",
                    to: "approved",
                    roles: ["manager"],
                  },
                ],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["docs/api-reference.md"]).toContain(
      "| POST | `/api/:entity` |",
    );
    expect(files["docs/api-reference.md"]).toContain(
      "| POST | `/api/:entity/:recordId/events/:event` |",
    );
    expect(files["docs/entity-relationship.md"]).toContain(
      "`expense` 1 → * `receipt`",
    );
    expect(files["docs/entity-relationship.md"]).toContain(
      "`status`: enum (required)",
    );
    expect(files["docs/permission-matrix.md"]).toContain(
      "| employee | expense | create, read |",
    );
    expect(files["docs/permission-matrix.md"]).toContain(
      "| manager | expense | approve |",
    );
    expect(files["docs/application.md"]).toContain("Generated documentation");
  });

  it("emits a role-aware Next application that reaches the generated API through a same-origin proxy", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-web-1",
        graph: {
          ...publishedExpense.graph,
          policy: {
            roles: ["employee"],
            permissions: [
              {
                role: "employee",
                resource: "expense",
                actions: ["create", "read"],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["web/app/page.tsx"]).toContain("GeneratedApplication");
    expect(files["web/app/page-runtime.tsx"]).toContain('"use client"');
    expect(files["web/app/page-runtime.tsx"]).toContain("x-factory-role");
    expect(files["web/app/page-runtime.tsx"]).toContain(
      "actions: readonly string[]",
    );
    expect(files["web/app/[...path]/page.tsx"]).toContain(
      "GeneratedApplication",
    );
    expect(files["web/app/api/[...path]/route.ts"]).toContain(
      "FACTORY_API_URL",
    );
    expect(files["api/src/main.ts"]).toContain("enableCors");
    expect(files["api/src/main.ts"]).toContain(
      "return await applicationRuntime.create",
    );
    expect(files["docker-compose.yml"]).toContain(
      "FACTORY_API_URL: http://api:3001",
    );
  });

  it("emits a Factory-owned PageModel runtime and only declared Next routes", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "ecommerce-page-runtime-1",
        graph: composeProfileDraft({ profile: "simple-ecommerce" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );
    const runtime = files["web/app/page-runtime.tsx"]!;

    expect(runtime).toContain("factory.generated-page-runtime/v1");
    expect(runtime).toContain("applicationName");
    expect(runtime).toContain("canTriggerEvent");
    expect(runtime).toContain("HeroBlock");
    expect(runtime).toContain("FormBlock");
    expect(runtime).toContain("CollectionBlock");
    expect(runtime).toContain("CatalogBlock");
    expect(runtime).toContain("CartBlock");
    expect(runtime).toContain("QueueBlock");
    expect(runtime).toContain("CheckoutBlock");
    expect(runtime).toContain("formRouteByEntity");
    expect(runtime).toContain("checkoutRoute");
    expect(runtime).toContain("Continue to checkout");
    expect(runtime).toContain("Pay simulated payment");
    expect(runtime).toContain("factory.generated.cart-id");
    expect(runtime).toContain("transitionBody");
    expect(runtime).toContain(
      "The declared order flow cannot submit this cart.",
    );
    expect(runtime).toContain(
      "routeFallback: { readonly rootRoute: string | null; readonly unknownRoute: 'not-found' }; readonly commerce: { readonly orderEntity: string | null; readonly paymentEvent: string | null }",
    );
    expect(runtime).toContain('"/checkout"');
    expect(runtime).not.toContain("@puckeditor/core");
    expect(runtime).not.toContain("reactflow");
    expect(runtime).not.toContain("<aside>");
    expect(files["web/app/page.tsx"]).toContain('requestedPath="/"');
    expect(files["web/app/[...path]/page.tsx"]).toContain(
      "GeneratedApplication",
    );
    expect(files["web/app/generated-application-client.tsx"]).toBeUndefined();
    expect(files["web/app/application-manifest.ts"]).toBeUndefined();
  });

  it("uses the validated order flow for a catalog-only commerce PageModel", () => {
    const composed = composeProfileDraft({
      profile: "simple-ecommerce",
    }).graph;
    const graph = {
      ...composed,
      page: {
        pages: [composed.page.pages[0]!],
        navigation: [composed.page.navigation[0]!],
      },
    };
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "catalog-only-commerce-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["web/app/page-runtime.tsx"]).toContain(
      '"orderEntity": "order"',
    );
    expect(files["web/app/page-runtime.tsx"]).toContain(
      '"paymentEvent": "pay"',
    );
  });

  it("emits the validated payment event for a checkout PageModel", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "checkout-commerce-1",
        graph: composeProfileDraft({ profile: "simple-ecommerce" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["web/app/page-runtime.tsx"]).toContain(
      '"orderEntity": "order"',
    );
    expect(files["web/app/page-runtime.tsx"]).toContain(
      '"paymentEvent": "pay"',
    );
    expect(files["web/app/page-runtime.tsx"]).not.toContain(
      '"paymentEvent": null',
    );
  });

  it.each([
    {
      name: "is missing the exact Factory cart capability",
      mutate(graph: ApplicationGraphV1) {
        graph.integration.capabilities = graph.integration.capabilities.filter(
          (capability) => capability.key !== "cart.add",
        );
      },
      message:
        "Interactive commerce PageModel blocks require Factory capability 'cart.add' with operation 'add'.",
    },
    {
      name: "does not declare the order DomainModel entity",
      mutate(graph: ApplicationGraphV1) {
        graph.domain.entities = graph.domain.entities.filter(
          (entity) => entity.key !== "order",
        );
        graph.domain.relations = graph.domain.relations.filter(
          (relation) => relation.from !== "order" && relation.to !== "order",
        );
        graph.policy.permissions = graph.policy.permissions.filter(
          (permission) => permission.resource !== "order",
        );
        graph.flow.flows = graph.flow.flows.filter(
          (flow) => flow.entity !== "order",
        );
      },
      message:
        "Interactive commerce PageModel blocks require a declared locked order entity.",
    },
    {
      name: "does not declare an order FlowModel",
      mutate(graph: ApplicationGraphV1) {
        graph.flow.flows = graph.flow.flows.filter(
          (flow) => flow.entity !== "order",
        );
      },
      message:
        "Interactive commerce PageModel blocks require a FlowModel for entity 'order'.",
    },
  ])(
    "rejects a catalog-only commerce PageModel that $name before returning files",
    ({ mutate, message }) => {
      const source = composeProfileDraft({
        profile: "simple-ecommerce",
      }).graph;
      const graph = structuredClone({
        ...source,
        page: {
          pages: [source.page.pages[0]!],
          navigation: [source.page.navigation[0]!],
        },
      });
      mutate(graph);

      expect(() =>
        generateApplicationBundle({
          publishedRevisionId: "invalid-catalog-commerce-1",
          graph,
        }),
      ).toThrow(message);
    },
  );

  it("rejects checkout before returning files when its order flow lacks simulated payment", () => {
    const graph = structuredClone(
      composeProfileDraft({ profile: "simple-ecommerce" }).graph,
    );
    graph.flow.flows = graph.flow.flows.map((flow) =>
      flow.entity === "order"
        ? {
            ...flow,
            transitions: flow.transitions.map((transition) => ({
              ...transition,
              effects: (transition.effects ?? []).filter(
                (effect) => effect.capability !== "payment.simulate",
              ),
            })),
          }
        : flow,
    );

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "invalid-checkout-payment-1",
        graph,
      }),
    ).toThrow(
      "Interactive commerce PageModel blocks require an 'order' FlowModel transition with Factory effect 'payment.simulate' and operation 'simulate'.",
    );
  });

  it("rejects a catalog-only commerce PageModel before returning files when its order flow lacks simulated payment", () => {
    const source = composeProfileDraft({
      profile: "simple-ecommerce",
    }).graph;
    const graph = structuredClone({
      ...source,
      page: {
        pages: [source.page.pages[0]!],
        navigation: [source.page.navigation[0]!],
      },
      flow: {
        flows: source.flow.flows.map((flow) => ({
          ...flow,
          transitions: flow.transitions.map((transition) => ({
            ...transition,
            effects: (transition.effects ?? []).filter(
              (effect) => effect.capability !== "payment.simulate",
            ),
          })),
        })),
      },
    });

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "invalid-catalog-payment-1",
        graph,
      }),
    ).toThrow(
      "Interactive commerce PageModel blocks require an 'order' FlowModel transition with Factory effect 'payment.simulate' and operation 'simulate'.",
    );
  });

  it("rejects reserved generated Next routes before returning files", () => {
    for (const route of [
      "/api",
      "/api/orders",
      "/_next",
      "/_next/static/chunk.js",
      "/favicon.ico",
    ]) {
      const graph = profileGraph("simple-ecommerce");
      graph.page.pages[0]!.route = route;

      expect(() =>
        generateApplicationBundle({
          publishedRevisionId: `reserved-route-${route.replaceAll("/", "-")}`,
          graph,
        }),
      ).toThrow(
        `PageModel route '${route}' is reserved by the generated Next application.`,
      );
    }
  });

  it("preconfigures generated Next projects so a build does not rewrite their TypeScript contract", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [
        file.path,
        file.content,
      ]),
    );
    const tsconfig = JSON.parse(files["web/tsconfig.json"] as string) as {
      compilerOptions: Record<string, unknown>;
      include: string[];
    };

    expect(tsconfig.compilerOptions.module).toBe("esnext");
    expect(tsconfig.compilerOptions.moduleResolution).toBe("node");
    expect(tsconfig.compilerOptions.isolatedModules).toBe(true);
    expect(tsconfig.include).toContain(".next/types/**/*.ts");
    expect(files["web/next-env.d.ts"]).toContain('reference types="next"');
  });

  it("emits a browser-only role simulator that replays declared FlowModel transitions", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-simulator-1",
        graph: {
          ...publishedExpense.graph,
          policy: { roles: ["employee", "manager"], permissions: [] },
          flow: {
            flows: [
              {
                id: "expense-review",
                entity: "expense",
                initialState: "draft",
                states: ["draft", "submitted", "approved"],
                events: ["submit", "approve"],
                transitions: [
                  { from: "draft", event: "submit", to: "submitted" },
                  {
                    from: "submitted",
                    event: "approve",
                    to: "approved",
                    roles: ["manager"],
                  },
                ],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["simulator/index.html"]).toContain("Role simulator");
    expect(files["simulator/index.html"]).toContain("expense-review");
    expect(files["simulator/index.html"]).toContain("Transition denied");
    expect(files["simulator/index.html"]).toContain("selectedRole");
  });

  it("compiles declared DomainModel relations into Prisma relation fields", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-relations-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              { key: "order", label: "Order", fields: [], indexes: [] },
              { key: "menu-item", label: "Menu item", fields: [], indexes: [] },
            ],
            relations: [
              { from: "order", to: "menu-item", kind: "many-to-many" },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/prisma/schema.prisma"]).toContain(
      'menuItems MenuItem[] @relation("OrderToMenuItem")',
    );
    expect(files["api/prisma/schema.prisma"]).toContain(
      'orders Order[] @relation("OrderToMenuItem")',
    );
  });

  it("compiles every non-many-to-many relation mode as an optional foreign key", () => {
    const cases = [
      {
        kind: "one-to-many" as const,
        from: "journey",
        to: "expense",
        owningModel: "Expense",
        targetModel: "Journey",
        foreignKey: "journeyId",
        relation:
          'journey Journey? @relation("JourneyToExpense", fields: [journeyId], references: [id])',
        constraint: '"JourneyToExpense_fkey"',
      },
      {
        kind: "many-to-one" as const,
        from: "expense",
        to: "journey",
        owningModel: "Expense",
        targetModel: "Journey",
        foreignKey: "journeyId",
        relation:
          'journey Journey? @relation("ExpenseToJourney", fields: [journeyId], references: [id])',
        constraint: '"JourneyToExpense_fkey"',
      },
      {
        kind: "one-to-one" as const,
        from: "account",
        to: "profile",
        owningModel: "Profile",
        targetModel: "Account",
        foreignKey: "accountId",
        relation:
          'account Account? @relation("AccountToProfile", fields: [accountId], references: [id])',
        constraint: '"AccountToProfile_fkey"',
      },
    ];

    for (const relationCase of cases) {
      const files = Object.fromEntries(
        generateApplicationBundle({
          publishedRevisionId: `published-optional-${relationCase.kind}-1`,
          graph: {
            ...publishedExpense.graph,
            domain: {
              entities: [
                {
                  key: relationCase.from,
                  label: relationCase.from,
                  fields: [],
                  indexes: [],
                },
                {
                  key: relationCase.to,
                  label: relationCase.to,
                  fields: [],
                  indexes: [],
                },
              ],
              relations: [
                {
                  from: relationCase.from,
                  to: relationCase.to,
                  kind: relationCase.kind,
                },
              ],
            },
          },
        }).files.map((file) => [file.path, file.content]),
      );
      const prismaSchema = files["api/prisma/schema.prisma"]!;
      const migration =
        files["database/prisma/migrations/0001_initial/migration.sql"]!;
      const prismaModel = prismaSchema.match(
        new RegExp(`model ${relationCase.owningModel} \\{[\\s\\S]*?\\n\\}`),
      )?.[0];
      const migrationTable = migration.match(
        new RegExp(
          `CREATE TABLE "${relationCase.owningModel}" \\([\\s\\S]*?\\n\\);`,
        ),
      )?.[0];

      expect(prismaModel).toContain(`${relationCase.foreignKey} String?`);
      expect(prismaModel).toContain(relationCase.relation);
      expect(migrationTable).toContain(`"${relationCase.foreignKey}" TEXT`);
      expect(migrationTable).not.toContain(
        `"${relationCase.foreignKey}" TEXT NOT NULL`,
      );
      expect(migration).toContain(
        `ALTER TABLE "${relationCase.owningModel}" ADD CONSTRAINT ${relationCase.constraint} FOREIGN KEY ("${relationCase.foreignKey}") REFERENCES "${relationCase.targetModel}" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
      );

      if (relationCase.kind === "one-to-one") {
        expect(prismaModel).toContain("accountId String? @unique");
        expect(migrationTable).toContain('"accountId" TEXT UNIQUE');
      }
    }
  });

  it("generates a role-guarded record runtime, XState machines, and an executable journey", () => {
    const input = withCompositionLock({
      publishedRevisionId: "published-expense-runtime-1",
      graph: {
        ...publishedExpense.graph,
        integration: composeProfileDraft({
          profile: "expense-approval",
        }).graph.integration,
        domain: {
          entities: [
            {
              key: "expense",
              label: "Expense",
              fields: [
                { key: "amount", type: "decimal", required: true },
                { key: "description", type: "text", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["draft", "submitted", "approved", "rejected"],
                },
              ],
              indexes: [{ fields: ["status"] }],
            },
          ],
          relations: [],
        },
        policy: {
          roles: ["employee", "manager", "finance"],
          permissions: [
            {
              role: "employee",
              resource: "expense",
              actions: ["create", "read"],
            },
            {
              role: "manager",
              resource: "expense",
              actions: ["read", "approve", "reject"],
            },
            {
              role: "finance",
              resource: "expense",
              actions: ["read", "audit"],
            },
          ],
        },
        flow: {
          flows: [
            {
              id: "expense-review",
              entity: "expense",
              initialState: "draft",
              states: ["draft", "submitted", "approved", "rejected"],
              events: ["submit", "approve", "reject"],
              transitions: [
                { from: "draft", event: "submit", to: "submitted" },
                {
                  from: "submitted",
                  event: "approve",
                  to: "approved",
                  roles: ["manager"],
                },
                {
                  from: "submitted",
                  event: "reject",
                  to: "rejected",
                  roles: ["manager"],
                },
              ],
            },
          ],
        },
      },
    });
    const files = Object.fromEntries(
      generateApplicationBundle(input).files.map((file) => [
        file.path,
        file.content,
      ]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain(
      "export class ApplicationRuntime",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "type RuntimeDefinition",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "const definition: RuntimeDefinition",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "effects?: readonly",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "async transition(",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "assertTransitionAllowed",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "this.assertAllowed(role, entityKey, 'update')",
    );
    expect(files["api/src/capabilities/core.crud.ts"]).toContain(
      "recordHandler",
    );
    expect(files["api/src/capabilities/core.workflow.ts"]).toContain(
      "workflowHandler",
    );
    expect(files["api/src/application-runtime.ts"]).not.toContain(
      "await this.store.create(entityKey",
    );
    expect(files["api/src/application-runtime.ts"]).not.toContain(
      "await this.store.update(entityKey, recordId, { status: transition.to })",
    );
    expect(files["api/src/policy.ts"]).toContain("newEnforcer");
    expect(files["api/src/flows/machines.ts"]).toContain("createMachine");
    expect(files["api/src/prisma-record-store.ts"]).toContain("PrismaClient");
    expect(files["api/prisma/schema.prisma"]).toContain("model Expense");
    expect(files["api/src/main.ts"]).toContain("PrismaRecordStore");
    expect(files["api/src/main.ts"]).toContain('@Controller("api")');
    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "applicationRuntime.create",
    );
    expect(files["api/package.json"]).toContain("vitest");
    expect(files["api/package.json"]).toContain("@prisma/client");
  });

  it("expects notification delivery and generic evidence in an Expense journey", () => {
    const composed = composeProfileDraft({ profile: "expense-approval" }).graph;
    const graph = {
      ...composed,
      flow: {
        ...composed.flow,
        flows: composed.flow.flows.map((flow) => ({
          ...flow,
          transitions: flow.transitions.map((transition) =>
            transition.event === "submit"
              ? {
                  ...transition,
                  effects: [
                    ...(transition.effects ?? []),
                    { capability: "notification.send", operation: "send" },
                  ],
                }
              : transition,
          ),
        })),
      },
    };
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-notification-journey-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/test/journey.generated.test.ts"]).toContain(
      '[["audit.record","record"],["notification.send","send"],["notification.send","send"],["audit.record","record"]]',
    );
  });

  it("emits durable notification outbox persistence only for the verified v1 provider", () => {
    const graph = composeProfileDraft({ profile: "expense-approval" }).graph;
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-notification-outbox-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    for (const schemaPath of [
      "api/prisma/schema.prisma",
      "database/prisma/schema.prisma",
    ]) {
      expect(files[schemaPath]).toContain("model NotificationOutbox");
      expect(files[schemaPath]).toContain("dedupeKey String @unique");
      expect(files[schemaPath]).toContain("availableAt DateTime");
      expect(files[schemaPath]).toContain("deliveredAt DateTime?");
      expect(files[schemaPath]).toContain("lastError String?");
    }
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "NotificationOutbox"');
    expect(files["api/src/application-runtime.ts"]).toContain(
      "export type NotificationOutboxEntry",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "enqueueNotification",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "claimDueNotifications",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "markNotificationDelivered",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "recordNotificationFailure",
    );
  });

  it("keeps the historical notification package free of outbox persistence and worker source", () => {
    const graph = composeProfileDraft({ profile: "expense-approval" }).graph;
    const historical = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "core.notification" && manifest.version === "1.0.1",
    )!;
    const historicalLock = {
      key: historical.manifest.key,
      version: historical.manifest.version,
      packageRoot: historical.manifest.packageRoot,
      manifestDigest: historical.manifest.manifestDigest,
      lifecycle: historical.manifest.lifecycle,
    };
    graph.integration.assetLocks = graph.integration.assetLocks?.map((lock) =>
      lock.key === "core.notification" ? historicalLock : lock,
    );
    const selections =
      composeDefaultCapabilityDraft({ profile: "expense-approval" }).graph
        .integration.compositionSelections ?? [];
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: selections.map((selection) =>
        selection.lock.key === "core.notification"
          ? { ...selection, lock: historicalLock }
          : selection,
      ),
    });
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-notification-historical-1",
        graph,
        compositionLock,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/prisma/schema.prisma"]).not.toContain(
      "model NotificationOutbox",
    );
    expect(files["database/prisma/schema.prisma"]).not.toContain(
      "model NotificationOutbox",
    );
    expect(files["api/src/application-runtime.ts"]).not.toContain(
      "NotificationOutboxEntry",
    );
    expect(files).not.toHaveProperty("api/src/notification-outbox-worker.ts");
  });

  it("executes declared capability effects as durable evidence and fails closed for unknown effects", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-payment-effects-1",
        graph: {
          ...publishedExpense.graph,
          integration: {
            providers: [],
            compositionProfile: "simple-ecommerce",
            assetLocks: simpleEcommerceAssetLocks,
            capabilities: [
              {
                key: "payment.simulate",
                providerId: "factory",
                operation: "simulate",
              },
            ],
          },
          policy: {
            roles: ["customer", "finance"],
            permissions: [
              {
                role: "customer",
                resource: "expense",
                actions: ["create", "read"],
              },
              { role: "finance", resource: "expense", actions: ["audit"] },
            ],
          },
          flow: {
            flows: [
              {
                id: "expense-payment",
                entity: "expense",
                initialState: "draft",
                states: ["draft", "paid"],
                events: ["pay"],
                transitions: [
                  {
                    from: "draft",
                    event: "pay",
                    to: "paid",
                    effects: [
                      { capability: "payment.simulate", operation: "simulate" },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain("executeEffects");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "Unsupported capability effect",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "appendCapabilityEvent",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "capabilityEvent",
    );
    expect(files["api/prisma/schema.prisma"]).toContain(
      "model CapabilityEvent",
    );
    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "capabilityEvents",
    );
    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "payment.simulate",
    );
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "CapabilityEvent"');
  });

  it("compiles DomainModel seed scenarios into idempotent Prisma data", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-seed-data-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              {
                key: "expense",
                label: "Expense",
                fields: [{ key: "amount", type: "decimal", required: true }],
                indexes: [],
              },
            ],
            relations: [],
            seedData: [
              {
                entity: "expense",
                id: "seed-expense-1",
                values: { amount: 42 },
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["database/prisma/seed.ts"]).toContain("upsert");
    expect(files["database/prisma/seed.ts"]).toContain("seed-expense-1");
    expect(files["database/Dockerfile"]).toContain("tsx prisma/seed.ts");
  });

  it("compiles reusable catalog, cart, and inventory capability runtime assets", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-commerce-runtime-1",
        graph: {
          ...publishedExpense.graph,
          integration: {
            providers: [],
            compositionProfile: "simple-ecommerce",
            assetLocks: simpleEcommerceAssetLocks,
            capabilities: [
              { key: "cart.add", providerId: "factory", operation: "add" },
              {
                key: "inventory.decrement",
                providerId: "factory",
                operation: "decrement",
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/prisma/schema.prisma"]).toContain(
      "model CommerceLineItem",
    );
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "CommerceLineItem"');
    expect(files["api/src/application-runtime.ts"]).toContain("addCartItem");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "decrementInventory",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "commerceLineItem",
    );
    expect(files["api/src/main.ts"]).toContain(
      "commerce/:entity/:recordId/items",
    );
    expect(files["web/app/page-runtime.tsx"]).toContain("addToCart");
    expect(files["web/app/page-runtime.tsx"]).toContain("Continue to checkout");
    expect(files["web/app/page-runtime.tsx"]).toContain(
      "Pay simulated payment",
    );
  });
});
