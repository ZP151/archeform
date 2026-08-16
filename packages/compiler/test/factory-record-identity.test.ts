import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  GraphSemanticError,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";
import { describe, expect, it } from "vitest";

import {
  buildCompilationInput,
  buildCompilationPlan,
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";
import { databaseTargetPlugin } from "../src/targets/database/target.js";

const identityInputError =
  "Record input cannot declare Factory-owned record identity 'id'.";

const graph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "identity-contract",
    workspaceId: "local-workspace",
    name: "Identity contract",
  },
  page: {
    pages: [
      {
        id: "expense-create",
        route: "/expenses/new",
        title: "Create expense",
        blocks: [{ id: "expense-form", type: "form", entity: "expense" }],
      },
    ],
    navigation: [
      {
        id: "expense-create-nav",
        label: "Create expense",
        pageId: "expense-create",
      },
    ],
  },
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
  },
  policy: {
    roles: ["employee"],
    permissions: [
      {
        role: "employee",
        resource: "expense",
        actions: ["create", "read", "update"],
      },
    ],
  },
  flow: { flows: [] },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
};

const publishedInput: PublishedGraphInput = {
  publishedRevisionId: "published-identity-contract-1",
  graph,
  compositionLock: createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: [],
  }),
};

type GeneratedRecordStore = {
  create(
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string }>;
  update(
    entityKey: string,
    recordId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string }>;
};

type GeneratedApplicationRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string }>;
};

type GeneratedStoreModules = {
  readonly applicationRuntime: GeneratedApplicationRuntime;
  readonly InMemoryRecordStore: new () => GeneratedRecordStore;
  readonly PrismaRecordStore: new (client: unknown) => GeneratedRecordStore;
};

const compilerTestDirectory = dirname(fileURLToPath(import.meta.url));

async function withGeneratedStoreModules<T>(
  run: (modules: GeneratedStoreModules) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(
    resolve(compilerTestDirectory, "factory-record-identity-"),
  );
  try {
    const bundle = generateApplicationBundle(publishedInput);
    await Promise.all(
      bundle.files
        .filter((file) => file.path.startsWith("api/src/"))
        .map(async (file) => {
          const path = resolve(directory, file.path);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, file.content, "utf8");
        }),
    );
    const applicationModule = (await import(
      pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
    )) as Pick<
      GeneratedStoreModules,
      "applicationRuntime" | "InMemoryRecordStore"
    >;
    const prismaModule = (await import(
      pathToFileURL(resolve(directory, "api/src/prisma-record-store.ts")).href
    )) as Pick<GeneratedStoreModules, "PrismaRecordStore">;
    return await run({ ...applicationModule, ...prismaModule });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function graphWithDeclaredId(): ApplicationGraphV1 {
  const invalid = structuredClone(graph);
  invalid.domain.entities[0]!.fields.push({
    key: "id",
    type: "string",
    required: false,
  });
  return invalid;
}

describe("Factory-owned generated record identity", () => {
  it("fails closed before the compiler or database target can reinterpret a declared id", () => {
    const invalidGraph = graphWithDeclaredId();
    const invalidPublishedInput = { ...publishedInput, graph: invalidGraph };

    expect(() => buildCompilationPlan(invalidPublishedInput)).toThrow(
      GraphSemanticError,
    );

    const targetInput = buildCompilationInput(publishedInput);
    expect(() =>
      databaseTargetPlugin.plan({
        ...targetInput,
        graph: invalidGraph,
        rendererGraph: invalidGraph,
      }),
    ).toThrow(GraphSemanticError);

    const validPlan = databaseTargetPlugin.plan(targetInput);
    expect(() =>
      databaseTargetPlugin.render({ ...validPlan, graph: invalidGraph }),
    ).toThrow(GraphSemanticError);
  });

  it("renders every database file from one validated graph snapshot", () => {
    const validPlan = databaseTargetPlugin.plan(
      buildCompilationInput(publishedInput),
    );
    const expectedFiles = databaseTargetPlugin.render(validPlan);
    const invalidGraph = graphWithDeclaredId();
    let graphReads = 0;
    const accessorPlan = new Proxy(validPlan, {
      get(target, property, receiver) {
        if (property === "graph") {
          graphReads += 1;
          return graphReads % 2 === 1 ? graph : invalidGraph;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    expect(databaseTargetPlugin.render(accessorPlan)).toEqual(expectedFiles);
    expect(graphReads).toBe(1);
  });

  it("rejects optional, empty, non-string, and duplicate client identity in both stores", async () => {
    await withGeneratedStoreModules(async (modules) => {
      const prismaWrites: Record<string, unknown>[] = [];
      const prisma = {
        expense: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            prismaWrites.push(data);
            return { id: "database-owned", ...data };
          },
          update: async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            prismaWrites.push(data);
            return { id: where.id, amount: 1, ...data };
          },
        },
      };
      const stores: readonly GeneratedRecordStore[] = [
        new modules.InMemoryRecordStore(),
        new modules.PrismaRecordStore(prisma),
      ];
      const clientIds: readonly unknown[] = [
        undefined,
        "",
        42,
        "duplicate-client-id",
      ];

      for (const store of stores) {
        for (const id of clientIds) {
          await expect(
            store.create("expense", { amount: 1, id }),
          ).rejects.toThrow(identityInputError);
          await expect(
            store.update("expense", "factory-owned", { amount: 2, id }),
          ).rejects.toThrow(identityInputError);
        }
      }

      const memory = stores[0]!;
      const created = await memory.create("expense", { amount: 1 });
      const updated = await memory.update("expense", created.id, { amount: 2 });
      expect(created.id).toBe("expense-1");
      expect(updated).toMatchObject({ id: "expense-1", amount: 2 });

      const database = stores[1]!;
      await expect(
        database.create("expense", { amount: 1 }),
      ).resolves.toMatchObject({ id: "database-owned", amount: 1 });
      await expect(
        database.update("expense", "database-owned", { amount: 2 }),
      ).resolves.toMatchObject({ id: "database-owned", amount: 2 });
      expect(prismaWrites).toEqual([{ amount: 1 }, { amount: 2 }]);
    });
  });

  it("rejects a client id at the public create boundary and excludes id from generated forms", async () => {
    await withGeneratedStoreModules(async ({ applicationRuntime }) => {
      await expect(
        applicationRuntime.create("employee", "expense", {
          amount: 1,
          id: "client-selected",
        }),
      ).rejects.toThrow(identityInputError);
    });

    const pageRuntime = generateApplicationBundle(publishedInput).files.find(
      (file) => file.path === "web/app/page-runtime.tsx",
    );
    expect(pageRuntime, "missing generated page runtime").toBeDefined();
    expect(pageRuntime!.content).toContain(
      "field.key !== 'id' && field.key !== 'status'",
    );
  });
});
