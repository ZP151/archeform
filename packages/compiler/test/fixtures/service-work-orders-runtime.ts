import { createRequire } from "node:module";
import { posix } from "node:path";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { generateApplicationBundle } from "../../src/index.js";
import {
  serviceWorkOrdersInput,
  serviceWorkOrdersBlueprint,
} from "./service-work-orders.js";
import { composeInventoryInput } from "./inventory-operations.js";
import { hashApplicationGraph, hashRequirementSpec } from "@factory/graph";
import { createCapabilityCompositionLock } from "@factory/capabilities";
export function renamedWorkOrdersInput(
  entity: string,
  history = "work-order-history",
) {
  const input = JSON.parse(
    JSON.stringify(serviceWorkOrdersBlueprint()),
    (_key, value) =>
      value === "work-order"
        ? entity
        : value === "work-order-history"
          ? history
          : value,
  );
  input.blueprint.requirementChecksum = hashRequirementSpec(input.spec);
  return composeInventoryInput(input.spec, input.blueprint);
}
/** Full immutable inputs: rename every role reference, including lock bindings. */
export function roleWorkOrdersInput(dispatcher: string, technician: string) {
  const replacements: Record<string, string> = {
    dispatcher,
    technician,
    "graph.policy.dispatcher": "graph.policy." + dispatcher,
    "graph.policy.technician": "graph.policy." + technician,
  };
  const input = JSON.parse(
    JSON.stringify(serviceWorkOrdersInput()),
    (_key, value) =>
      typeof value === "string" && Object.hasOwn(replacements, value)
        ? replacements[value]
        : value,
  ) as ReturnType<typeof serviceWorkOrdersInput>;
  return {
    ...input,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    }),
  };
}

export const workOrdersRoleCases = [
  { name: "canonical", dispatcher: "dispatcher", technician: "technician" },
  { name: "renamed", dispatcher: "coordinator", technician: "engineer" },
  { name: "swapped", dispatcher: "technician", technician: "dispatcher" },
  ...[64, 128].flatMap((length) => [
    {
      name: `dispatcher-${length}`,
      dispatcher: "d".repeat(length),
      technician: "technician",
    },
    {
      name: `technician-${length}`,
      dispatcher: "dispatcher",
      technician: "t".repeat(length),
    },
    {
      name: `both-${length}`,
      dispatcher: "d".repeat(length),
      technician: "t".repeat(length),
    },
  ]),
] as const;

const require = createRequire(import.meta.url);
const fileCache = new Map<
  string,
  ReturnType<typeof generateApplicationBundle>["files"]
>();
const compiledCache = new Map<string, string>();
export function loadWorkOrdersRuntime(
  client?: unknown,
  input = serviceWorkOrdersInput(),
  realNest = false,
  transform: (path: string, source: string) => string = (_path, source) =>
    source,
) {
  const cacheKey = JSON.stringify(input);
  const files =
    fileCache.get(cacheKey) ??
    generateApplicationBundle({
      publishedRevisionId: "work-orders-runtime-test",
      ...input,
    }).files;
  fileCache.set(cacheKey, files);
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
    source = transform(path, source);
    if (path === "api/src/main.ts")
      source = source.replace(
        "void bootstrap();",
        "export { GeneratedController, GeneratedModule };",
      );
    const exports: any = {};
    cache.set(path, exports);
    const compiled =
      compiledCache.get(source) ??
      transpileModule(source, {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          target: ScriptTarget.ES2022,
          experimentalDecorators: true,
        },
      }).outputText;
    compiledCache.set(source, compiled);
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

/** Transactional delegate double. Actual PostgreSQL concurrency and restart evidence remain pending. */
export function workOrdersPrismaHarness() {
  let state = {
    orders: [] as any[],
    history: [] as any[],
    audit: [] as any[],
    effects: [] as any[],
    receipts: [] as any[],
  };
  let tail = Promise.resolve(),
    failAt = "",
    retryCode = "",
    attempts = 0,
    failureCode = "",
    failuresLeft = Infinity;
  const calls: { method: string; input: any }[] = [];
  const after = (boundary: string) => {
    if (failAt === boundary && failuresLeft-- > 0)
      throw Object.assign(Error("private injected failure"), {
        code: failureCode,
      });
  };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([key, value]: any) =>
      key === "AND"
        ? value.every((v: any) => matches(row, v))
        : value && typeof value === "object" && "lt" in value
          ? row[key] < value.lt
          : value && typeof value === "object" && "gt" in value
            ? row[key] > value.gt
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
    const delegate = (collection: "orders" | "history") => ({
      findMany: async (input: any) => {
        calls.push({ method: collection + ".findMany", input });
        if (!input || input.take > 51 || !Number.isInteger(input.take))
          throw Error("Unbounded read");
        return data[collection]
          .filter((row) => matches(row, input.where))
          .sort((a, b) =>
            collection === "orders"
              ? a.id < b.id
                ? -1
                : a.id > b.id
                  ? 1
                  : 0
              : b.orderVersion - a.orderVersion || b.id.localeCompare(a.id),
          )
          .slice(0, input.take)
          .map((row) => clone(row, input.select));
      },
      findUnique: async ({ where }: any) => {
        calls.push({ method: collection + ".findUnique", input: { where } });
        return clone(data[collection].find((row) => row.id === where.id));
      },
      create: async ({ data: values }: any) => {
        if (
          collection === "history" &&
          data.history.some(
            (row) =>
              row.workOrderId === values.workOrderId &&
              row.orderVersion === values.orderVersion,
          )
        )
          throw Object.assign(Error("Unique"), {
            code: "P2002",
            meta: { target: ["workOrderId", "orderVersion"] },
          });
        for (const key of [
          "dueDate",
          "beforeDueDate",
          "afterDueDate",
          "recordedAt",
        ])
          if (
            values[key] !== undefined &&
            values[key] !== null &&
            !(values[key] instanceof Date)
          )
            throw Error("Prisma date must be Date: " + key);
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
        if (
          input.data.dueDate !== undefined &&
          input.data.dueDate !== null &&
          !(input.data.dueDate instanceof Date)
        )
          throw Error("Prisma date must be Date");
        if (row) Object.assign(row, input.data);
        after("updateMany");
        return { count: row ? 1 : 0 };
      },
    });
    return {
      workOrder: delegate("orders"),
      workOrderHistory: delegate("history"),
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
      factory_WorkOrderMutationReceipt: {
        findUnique: async ({ where: { scope_keyDigest: key } }: any) => {
          calls.push({ method: "receipts.findUnique", input: key });
          return clone(
            data.receipts.find(
              (row) =>
                row.scope === key.scope && row.keyDigest === key.keyDigest,
            ),
          );
        },
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
    fail: (boundary: string, code = "", times = Infinity) => {
      failAt = boundary;
      failureCode = code;
      failuresLeft = times;
    },
    retry: (code: string) => {
      retryCode = code;
    },
    attempts: () => attempts,
    corrupt: (values: any) => Object.assign(state.orders[0]!, values),
  };
}
