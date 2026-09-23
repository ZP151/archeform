import { hashRequirementSpec } from "@factory/graph";
import { createRequire } from "node:module";
import { posix } from "node:path";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { generateApplicationBundle } from "../../src/index.js";
import {
  inventoryOperationsInput,
  inventoryBlueprint,
  composeInventoryInput,
} from "./inventory-operations.js";

const require = createRequire(import.meta.url);
export function renamedInventoryInput(itemEntity: string) {
  const original = inventoryBlueprint();
  const renamed = JSON.parse(JSON.stringify(original), (_key, value) =>
    value === "stock-item" ? itemEntity : value,
  );
  renamed.blueprint.requirementChecksum = hashRequirementSpec(renamed.spec);
  return composeInventoryInput(renamed.spec, renamed.blueprint);
}
export function loadInventoryRuntime(
  client?: unknown,
  input = inventoryOperationsInput(),
  realNest = false,
) {
  const files = generateApplicationBundle({
    publishedRevisionId: "inventory-runtime-test",
    ...input,
  }).files;
  const cache = new Map<string, any>();
  const routes: { method: string; path: string; property: string }[] = [];
  class HttpException extends Error {
    constructor(
      readonly body: unknown,
      readonly status: number,
    ) {
      super("HTTP request failed.");
    }
  }
  function load(path: string): any {
    if (cache.has(path)) return cache.get(path);
    let source = files.find((file) => file.path === path)?.content;
    if (!source) throw Error("Missing emitted file: " + path);
    if (path === "api/src/main.ts")
      source = source.replace(
        "void bootstrap();",
        "export { GeneratedController, GeneratedModule };",
      );
    const exports: any = {};
    cache.set(path, exports);
    const compiled = transpileModule(source, {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        target: ScriptTarget.ES2022,
        experimentalDecorators: true,
      },
    }).outputText;
    new Function("require", "exports", compiled)((name: string) => {
      if (name.startsWith("."))
        return load(
          posix.normalize(
            posix.join(posix.dirname(path), name.replace(/\.js$/, ".ts")),
          ),
        );
      if (name === "@prisma/client")
        return {
          PrismaClient: class {
            constructor() {
              return client ?? {};
            }
          },
        };
      if (realNest && ["@nestjs/core", "@nestjs/common"].includes(name))
        return createRequire(
          new URL(
            "../../../../apps/control-plane/package.json",
            import.meta.url,
          ),
        )(name);
      if (name === "@nestjs/core") return { NestFactory: {} };
      if (name === "@nestjs/common")
        return new Proxy(
          { HttpException, HttpStatus: { FORBIDDEN: 403 } },
          {
            get(target: any, key: string) {
              if (key in target) return target[key];
              if (["Get", "Post", "Patch"].includes(key))
                return (route: string) =>
                  (_target: unknown, property: string) => {
                    routes.push({ method: key, path: route, property });
                  };
              return () => () => {};
            },
          },
        );
      return require(name);
    }, exports);
    return exports;
  }
  return { ...load("api/src/application-runtime.ts"), files, load, routes };
}

/** Transactional delegate double. Actual PostgreSQL behavior has a separate opt-in suite. */
export function inventoryPrismaHarness() {
  let state = {
    items: [] as any[],
    movements: [] as any[],
    audit: [] as any[],
    effects: [] as any[],
    receipts: [] as any[],
  };
  let tail = Promise.resolve(),
    failAt = "",
    retryCode = "",
    attempts = 0;
  const calls: { method: string; input: any }[] = [];
  const after = (boundary: string) => {
    if (failAt === boundary) throw Error("private injected failure");
  };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([key, value]: any) =>
      key === "OR"
        ? value.some((v: any) => matches(row, v))
        : value && typeof value === "object" && "contains" in value
          ? String(row[key])
              .toLowerCase()
              .includes(
                value.contains.replace(/\\([%_\\])/g, "$1").toLowerCase(),
              )
          : row[key] === value,
    );
  const clone = (row: any, select?: any) =>
    row
      ? structuredClone(
          select
            ? Object.fromEntries(
                Object.keys(select)
                  .filter((key) => select[key])
                  .map((key) => [key, row[key]]),
              )
            : row,
        )
      : null;
  function delegates(data: typeof state): any {
    const delegate = (collection: "items" | "movements") => ({
      findMany: async (input: any) => {
        calls.push({ method: collection + ".findMany", input });
        if (!input || input.take > 51 || !Number.isInteger(input.take))
          throw Error("Unbounded read");
        return data[collection]
          .filter((row) => matches(row, input.where))
          .sort((a, b) =>
            collection === "items"
              ? a.sku.localeCompare(b.sku) || a.id.localeCompare(b.id)
              : b.itemVersion - a.itemVersion || b.id.localeCompare(a.id),
          )
          .slice(input.skip, input.skip + input.take)
          .map((row) => clone(row, input.select));
      },
      findUnique: async ({ where }: any) =>
        clone(data[collection].find((row) => row.id === where.id)),
      create: async ({ data: values }: any) => {
        if (
          collection === "items" &&
          data.items.some((row) => row.sku === values.sku)
        )
          throw Object.assign(Error("Unique"), {
            code: "P2002",
            meta: { target: ["sku"] },
          });
        const row = {
          id: collection + "-" + (data[collection].length + 1),
          ...values,
        };
        data[collection].push(row);
        after(collection + ".create");
        return clone(row);
      },
      updateMany: async (input: any) => {
        calls.push({ method: collection + ".updateMany", input });
        const row = data[collection].find((row) => matches(row, input.where));
        if (row) Object.assign(row, input.data);
        after("updateMany");
        return { count: row ? 1 : 0 };
      },
    });
    return {
      stockItem: delegate("items"),
      stockMovement: delegate("movements"),
      factory_AuditEvent: {
        create: async ({ data: row }: any) => {
          data.audit.push(row);
          after("audit");
        },
        findMany: async () => clone(data.audit),
      },
      factory_CapabilityEvent: {
        create: async ({ data: row }: any) => {
          data.effects.push(row);
          after("effect");
        },
        findMany: async () => clone(data.effects),
      },
      factory_InventoryMutationReceipt: {
        findUnique: async ({ where: { scope_keyDigest: key } }: any) =>
          clone(
            data.receipts.find(
              (row) =>
                row.scope === key.scope && row.keyDigest === key.keyDigest,
            ),
          ),
        create: async ({ data: row }: any) => {
          if (
            data.receipts.some(
              (value) =>
                value.scope === row.scope && value.keyDigest === row.keyDigest,
            )
          )
            throw Object.assign(Error("Unique"), {
              code: "P2002",
              meta: { target: ["scope", "keyDigest"] },
            });
          data.receipts.push(structuredClone(row));
          after("receipt");
        },
      },
    };
  }
  const client: any = {
    $transaction: async (operation: any, options: any) => {
      if (options?.isolationLevel !== "Serializable")
        throw Error("Serializable required");
      const run = tail.then(async () => {
        attempts++;
        if (retryCode)
          throw Object.assign(Error("private retry failure"), {
            code: retryCode,
          });
        const pending = structuredClone(state);
        const result = await operation(delegates(pending));
        state = pending;
        return result;
      });
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
  for (const key of Object.keys(delegates(state)))
    Object.defineProperty(client, key, { get: () => delegates(state)[key] });
  return {
    client,
    calls,
    snapshot: () => structuredClone(state),
    fail: (boundary: string) => {
      failAt = boundary;
    },
    retry: (code: string) => {
      retryCode = code;
    },
    attempts: () => attempts,
    corrupt: (values: any) => Object.assign(state.items[0]!, values),
  };
}
