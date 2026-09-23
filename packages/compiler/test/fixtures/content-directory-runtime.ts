import { createRequire } from "node:module";
import { posix } from "node:path";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { generateApplicationBundle } from "../../src/index.js";
import { contentDirectoryInput } from "./content-directory.js";

const require = createRequire(import.meta.url);
export function loadDirectoryRuntime(client?: unknown) {
  const files = generateApplicationBundle({
    publishedRevisionId: "directory-runtime-test",
    ...contentDirectoryInput(),
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
        "export { GeneratedController };",
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

/** Transactional delegate double: proves emitted Prisma calls, not PostgreSQL behavior. */
export function directoryPrismaHarness() {
  let state = {
    records: [] as any[],
    audit: [] as any[],
    effects: [] as any[],
    receipts: [] as any[],
  };
  let tail = Promise.resolve();
  let failAt = "";
  let retryCode = "";
  let attempts = 0;
  const calls: { method: string; input: any }[] = [];
  const after = (boundary: string) => {
    if (failAt === boundary) throw Error("private injected store failure");
  };
  const projected = (row: any, select?: any) =>
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
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([key, value]: any) => {
      if (key === "OR")
        return value.some((condition: any) => matches(row, condition));
      if (value && typeof value === "object" && "contains" in value)
        return String(row[key])
          .toLowerCase()
          .includes(value.contains.replace(/\\([%_\\])/g, "$1").toLowerCase());
      return row[key] === value;
    });
  function delegates(data: typeof state): any {
    return {
      resource: {
        findMany: async (input: any) => {
          calls.push({ method: "findMany", input });
          if (
            !input?.where ||
            !Number.isSafeInteger(input.take) ||
            input.take > 51
          )
            throw Error("Unbounded directory read");
          return data.records
            .filter((row) => matches(row, input.where))
            .sort(
              (a, b) =>
                String(a.title).localeCompare(b.title) ||
                a.id.localeCompare(b.id),
            )
            .slice(input.skip, input.skip + input.take)
            .map((row) => projected(row, input.select));
        },
        findFirst: async (input: any) => {
          calls.push({ method: "findFirst", input });
          return projected(
            data.records.find((row) => matches(row, input.where)),
            input.select,
          );
        },
        findUnique: async ({ where }: any) =>
          projected(data.records.find((row) => row.id === where.id)),
        create: async ({ data: values }: any) => {
          const row = { id: "stored-" + (data.records.length + 1), ...values };
          data.records.push(row);
          after("create");
          return structuredClone(row);
        },
        updateMany: async (input: any) => {
          calls.push({ method: "updateMany", input });
          const row = data.records.find((row) => matches(row, input.where));
          if (row) Object.assign(row, input.data);
          after("updateMany");
          return { count: row ? 1 : 0 };
        },
      },
      factory_AuditEvent: {
        create: async ({ data: row }: any) => {
          data.audit.push(row);
          after("audit");
        },
        findMany: async () => structuredClone(data.audit),
      },
      factory_CapabilityEvent: {
        create: async ({ data: row }: any) => {
          data.effects.push(row);
          after("effect");
        },
        findMany: async () => structuredClone(data.effects),
      },
      directoryMutationReceipt: {
        findUnique: async ({ where: { scope_idempotencyKey: key } }: any) =>
          projected(
            data.receipts.find(
              (row) =>
                row.scope === key.scope &&
                row.idempotencyKey === key.idempotencyKey,
            ),
          ),
        create: async ({ data: row }: any) => {
          if (
            data.receipts.some(
              (entry) =>
                entry.scope === row.scope &&
                entry.idempotencyKey === row.idempotencyKey,
            )
          )
            throw Object.assign(Error("Duplicate"), { code: "P2002" });
          data.receipts.push(structuredClone(row));
          after("receipt");
        },
      },
    };
  }
  const client: any = {
    $transaction: async (operation: any, options: any) => {
      if (options?.isolationLevel !== "Serializable")
        throw Error("Isolation required");
      const run = tail.then(async () => {
        attempts++;
        if (retryCode)
          throw Object.assign(Error("private retry error"), {
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
  };
}
