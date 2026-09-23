import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";
import {
  createCapabilityCompositionLock,
  getCapabilityAsset,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import {
  createAppointmentCommandRuntime,
  renderAppointmentApiDispatch,
  renderAppointmentMutationRuntime,
  renderAppointmentPrismaStore,
  type AppointmentCommandStore,
  type AppointmentRuntimeProfile,
} from "../src/appointment-mutation-contract.js";
import { createGeneratedPageRuntimeProjection } from "../src/page-runtime-projection.js";
import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";
import type { ApplicationGraphV1 } from "@factory/graph";
import { appointmentDefinitionCompilationInput } from "./fixtures/definition-data-compatibility.js";

const profile: AppointmentRuntimeProfile = {
  capability: "scheduling.appointment@1.0.1",
  effect: "appointment.booking",
  serviceEntity: "service",
  scheduleEntity: "schedule",
  appointmentEntity: "appointment",
  fields: {
    serviceActive: "active",
    scheduleService: "serviceId",
    scheduleStart: "start",
    scheduleEnd: "end",
    scheduleTimezone: "timezone",
    scheduleCapacity: "capacity",
    scheduleStatus: "status",
    appointmentSchedule: "scheduleId",
    appointmentCustomer: "customerName",
    appointmentNotes: "notes",
    appointmentCancellationReason: "cancellationReason",
    appointmentStatus: "status",
  },
};

const context = (role: string, key: string) => ({
  factoryServer: true as const,
  role,
  scope: "appointment-test",
  idempotencyKey: key,
  requestHash: `hash:${key}`,
  now: "2026-10-01T00:00:00.000Z",
});

const generatedTypecheckDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".generated-appointment-profile-typecheck",
);
const generatedWebTypecheckDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".generated-appointment-web-typecheck",
);

afterAll(async () => {
  await rm(generatedTypecheckDirectory, { recursive: true, force: true });
  await rm(generatedWebTypecheckDirectory, { recursive: true, force: true });
});

async function typecheckGeneratedAppointmentPageRuntime(): Promise<
  readonly string[]
> {
  await mkdir(generatedWebTypecheckDirectory, { recursive: true });
  const directory = await mkdtemp(
    join(generatedWebTypecheckDirectory, "project-"),
  );
  try {
    const input = appointmentDefinitionCompilationInput();
    const pageRuntime = generateApplicationBundle({
      publishedRevisionId: "appointment-page-runtime-typecheck",
      graph: input.graph,
      compositionLock: input.compositionLock,
    } as PublishedGraphInput).files.find(
      (file) => file.path === "web/app/page-runtime.tsx",
    )!;
    const blockType = pageRuntime.content.match(
      /^type PageRuntimeBlock = .+;$/m,
    )?.[0];
    const projectionType = pageRuntime.content.match(
      /^type PageRuntimeProjection = .+;$/m,
    )?.[0];
    const projectionValue = pageRuntime.content.match(
      /const projection: PageRuntimeProjection = [\s\S]+?(?=\nconst definition:)/,
    )?.[0];
    const runtimeEntityType = pageRuntime.content.match(
      /^type RuntimeEntity = .+;$/m,
    )?.[0];
    const runtimeDefinitionType = pageRuntime.content.match(
      /^type RuntimeDefinition = .+;$/m,
    )?.[0];
    const definitionValue = pageRuntime.content.match(
      /const definition: RuntimeDefinition = [\s\S]+?(?=\n\n)/,
    )?.[0];
    if (
      !blockType ||
      !projectionType ||
      !projectionValue ||
      !runtimeEntityType ||
      !runtimeDefinitionType ||
      !definitionValue
    )
      throw new Error(
        "Generated appointment page runtime declarations were unavailable.",
      );
    expect(projectionType).toContain(
      "readonly appointment?: { readonly appointmentEntity: string; readonly commands: readonly ['request', 'confirm', 'reschedule', 'cancel', 'history'] }",
    );
    expect(projectionValue).toContain('"appointment"');
    await writeFile(
      resolve(directory, "page-runtime-projection.ts"),
      `${blockType}\n${projectionType}\n${runtimeEntityType}\n${runtimeDefinitionType}\n${projectionValue}\n${definitionValue}`,
      "utf8",
    );
    await writeFile(
      resolve(directory, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
          include: ["page-runtime-projection.ts"],
        },
        null,
        2,
      ),
      "utf8",
    );
    const parsed = ts.getParsedCommandLineOfConfigFile(
      resolve(directory, "tsconfig.json"),
      undefined,
      ts.sys as ts.ParseConfigFileHost,
    );
    if (!parsed)
      throw new Error(
        "Generated appointment page runtime typecheck configuration was unavailable.",
      );
    return ts
      .getPreEmitDiagnostics(ts.createProgram(parsed.fileNames, parsed.options))
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function typecheckGeneratedAppointmentProfile(): Promise<
  readonly string[]
> {
  await mkdir(generatedTypecheckDirectory, { recursive: true });
  const directory = await mkdtemp(
    join(generatedTypecheckDirectory, "project-"),
  );
  try {
    const bundle = generatedAppointmentBundle();
    const typecheckedPaths = new Set([
      "api/src/main.ts",
      "api/src/application-runtime.ts",
      "api/src/prisma-record-store.ts",
    ]);
    const typecheckedFiles = bundle.files.filter((file) =>
      typecheckedPaths.has(file.path),
    );
    await Promise.all(
      typecheckedFiles.map(async (file) => {
        const destination = resolve(directory, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.content, "utf8");
      }),
    );
    const stubbedPaths = new Set<string>();
    for (const file of typecheckedFiles) {
      for (const match of file.content.matchAll(
        /import\s+(?:type\s+)?(.+?)\s+from\s+["'](\.[^"']+)["'];/g,
      )) {
        const clause = match[1]!;
        const specifier = match[2]!;
        const stubPath = resolve(
          dirname(resolve(directory, file.path)),
          specifier.replace(/\.js$/, ".ts"),
        );
        if (
          typecheckedPaths.has(
            `api/src/${stubPath.slice(resolve(directory, "api/src").length + 1).replace(/\\/g, "/")}`,
          ) ||
          stubbedPaths.has(stubPath)
        )
          continue;
        const named = /^\{(.+)\}$/.exec(clause.trim());
        const declarations = specifier.endsWith("core.identity-policy.js")
          ? [
              "export type LocalPrincipalContext = { sessionId: string; roles: readonly string[]; [key: string]: unknown };",
              "export function resolveFixturePrincipal(..._args: unknown[]): LocalPrincipalContext | undefined { return undefined; }",
              'export function authorizeDeclaredAction(..._args: unknown[]): { allowed: boolean; reason: string } { return { allowed: false, reason: "stub" }; }',
            ].join("\n")
          : named
            ? named[1]!
                .split(",")
                .map((entry) => entry.trim().replace(/^type\s+/, ""))
                .filter(Boolean)
                .map((entry) => {
                  const alias = entry.split(/\s+as\s+/).at(-1)!;
                  return `export type ${alias} = any; export const ${alias}: any = undefined as any;`;
                })
                .join("\n")
            : clause.trim().startsWith("*")
              ? "export const __stub: any = undefined as any;"
              : "const value: any = undefined as any; export default value;";
        await mkdir(dirname(stubPath), { recursive: true });
        await writeFile(stubPath, declarations, "utf8");
        stubbedPaths.add(stubPath);
      }
    }
    await mkdir(resolve(directory, "types"), { recursive: true });
    await writeFile(
      resolve(directory, "types/nest-common.d.ts"),
      `
      export declare const Controller: (...args: any[]) => ClassDecorator;
      export declare const Get: (...args: any[]) => MethodDecorator;
      export declare const Post: (...args: any[]) => MethodDecorator;
      export declare const Patch: (...args: any[]) => MethodDecorator;
      export declare const Delete: (...args: any[]) => MethodDecorator;
      export declare const Param: (...args: any[]) => ParameterDecorator;
      export declare const Body: (...args: any[]) => ParameterDecorator;
      export declare const Req: (...args: any[]) => ParameterDecorator;
      export declare const Module: (...args: any[]) => ClassDecorator;
      export declare const Injectable: (...args: any[]) => ClassDecorator;
      export declare const HttpCode: (...args: any[]) => MethodDecorator;
      export declare class HttpException { constructor(response: unknown, status: number); }
      export declare const HttpStatus: { readonly BAD_REQUEST: 400; readonly FORBIDDEN: 403; readonly NOT_FOUND: 404; readonly CONFLICT: 409; };
    `,
      "utf8",
    );
    await writeFile(
      resolve(directory, "types/nest-core.d.ts"),
      "export declare const NestFactory: { create(input: unknown): Promise<any> };",
      "utf8",
    );
    await writeFile(
      resolve(directory, "types/prisma-client.d.ts"),
      "export declare class PrismaClient { [key: string]: unknown; $transaction<T>(callback: (client: PrismaClient) => Promise<T>, options?: unknown): Promise<T>; }",
      "utf8",
    );
    await writeFile(
      resolve(directory, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            experimentalDecorators: true,
            types: ["node"],
            baseUrl: ".",
            paths: {
              "@nestjs/common": ["types/nest-common.d.ts"],
              "@nestjs/core": ["types/nest-core.d.ts"],
              "@prisma/client": ["types/prisma-client.d.ts"],
            },
          },
          include: ["api/src/**/*.ts"],
        },
        null,
        2,
      ),
      "utf8",
    );
    const parsed = ts.getParsedCommandLineOfConfigFile(
      resolve(directory, "tsconfig.json"),
      undefined,
      ts.sys as ts.ParseConfigFileHost,
    );
    if (!parsed)
      throw new Error(
        "Generated appointment typecheck configuration was unavailable.",
      );
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram(parsed.fileNames, parsed.options),
    );
    return diagnostics.map((diagnostic) => {
      const location =
        diagnostic.file && diagnostic.start !== undefined
          ? `${diagnostic.file.fileName}:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`
          : "configuration";
      return `${location} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function legacyGeneratedAppointmentBundle(): ReturnType<
  typeof generateApplicationBundle
> {
  const asset = getCapabilityAsset("scheduling.appointment");
  const bindings = {
    serviceEntity: { graphSymbol: "graph.domain.service" },
    serviceNameField: { graphSymbol: "graph.domain.service", fieldKey: "name" },
    serviceDurationMinutesField: {
      graphSymbol: "graph.domain.service",
      fieldKey: "durationMinutes",
    },
    serviceActiveField: {
      graphSymbol: "graph.domain.service",
      fieldKey: "active",
    },
    scheduleEntity: { graphSymbol: "graph.domain.schedule" },
    scheduleServiceReferenceField: {
      graphSymbol: "graph.domain.schedule",
      fieldKey: "serviceId",
    },
    scheduleStartField: {
      graphSymbol: "graph.domain.schedule",
      fieldKey: "start",
    },
    scheduleEndField: { graphSymbol: "graph.domain.schedule", fieldKey: "end" },
    scheduleTimezoneField: {
      graphSymbol: "graph.domain.schedule",
      fieldKey: "timezone",
    },
    scheduleCapacityField: {
      graphSymbol: "graph.domain.schedule",
      fieldKey: "capacity",
    },
    scheduleStatusField: {
      graphSymbol: "graph.domain.schedule",
      fieldKey: "status",
    },
    appointmentEntity: { graphSymbol: "graph.domain.appointment" },
    appointmentScheduleReferenceField: {
      graphSymbol: "graph.domain.appointment",
      fieldKey: "scheduleId",
    },
    appointmentCustomerNameField: {
      graphSymbol: "graph.domain.appointment",
      fieldKey: "customerName",
    },
    appointmentNotesField: {
      graphSymbol: "graph.domain.appointment",
      fieldKey: "notes",
    },
    appointmentCancellationReasonField: {
      graphSymbol: "graph.domain.appointment",
      fieldKey: "cancellationReason",
    },
    appointmentStatusField: {
      graphSymbol: "graph.domain.appointment",
      fieldKey: "status",
    },
  };
  const selection = {
    lock: {
      key: asset.manifest.key,
      version: asset.manifest.version,
      packageRoot: asset.manifest.packageRoot,
      manifestDigest: asset.manifest.manifestDigest,
      lifecycle: asset.manifest.lifecycle,
    },
    bindings,
  };
  const graph = {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "appointment-generated",
      workspaceId: "local",
      name: "Appointment generated",
    },
    page: { pages: [], navigation: [] },
    domain: {
      entities: [
        {
          key: "service",
          label: "Service",
          fields: [
            { key: "name", type: "string", required: true },
            { key: "durationMinutes", type: "integer", required: true },
            { key: "active", type: "boolean", required: true },
          ],
          indexes: [],
        },
        {
          key: "schedule",
          label: "Schedule",
          fields: [
            { key: "serviceId", type: "string", required: true },
            { key: "start", type: "datetime", required: true },
            { key: "end", type: "datetime", required: true },
            { key: "timezone", type: "string", required: true },
            { key: "capacity", type: "integer", required: true },
            { key: "status", type: "enum", required: true },
          ],
          indexes: [],
        },
        {
          key: "appointment",
          label: "Appointment",
          fields: [
            { key: "scheduleId", type: "string", required: true },
            { key: "customerName", type: "string", required: true },
            { key: "notes", type: "text", required: false },
            { key: "cancellationReason", type: "text", required: false },
            { key: "status", type: "enum", required: true },
          ],
          indexes: [],
        },
      ],
      relations: [
        {
          from: "schedule",
          to: "service",
          kind: "many-to-one",
          field: "serviceId",
        },
        {
          from: "appointment",
          to: "schedule",
          kind: "many-to-one",
          field: "scheduleId",
        },
      ],
    },
    policy: { roles: ["customer", "staff", "administrator"], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
  } as unknown as ApplicationGraphV1;
  return generateApplicationBundle({
    publishedRevisionId: "appointment-generated-1",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: [selection],
    }),
  } as PublishedGraphInput);
}

function generatedAppointmentBundle(): ReturnType<
  typeof generateApplicationBundle
> {
  const { graph, compositionLock } = appointmentDefinitionCompilationInput();
  return generateApplicationBundle({
    publishedRevisionId: "appointment-generated-1",
    graph,
    compositionLock,
  } as PublishedGraphInput);
}

function snapshot(store: TestStore) {
  return structuredClone({
    records: [...store.records.entries()].map(([entity, records]) => [
      entity,
      [...records.entries()],
    ]),
    receipts: [...store.receipts.entries()],
    history: store.history,
    events: store.events,
  });
}

class TestStore implements AppointmentCommandStore {
  readonly records = new Map<string, Map<string, Record<string, unknown>>>([
    ["service", new Map([["service-1", { id: "service-1", active: true }]])],
    [
      "schedule",
      new Map([
        [
          "slot-1",
          {
            id: "slot-1",
            serviceId: "service-1",
            start: "2026-10-01T09:00:00Z",
            end: "2026-10-01T09:30:00Z",
            timezone: "Asia/Singapore",
            capacity: 1,
            status: "open",
          },
        ],
        [
          "slot-2",
          {
            id: "slot-2",
            serviceId: "service-1",
            start: "2026-10-01T10:00:00Z",
            end: "2026-10-01T10:30:00Z",
            timezone: "Asia/Singapore",
            capacity: 1,
            status: "open",
          },
        ],
      ]),
    ],
    ["appointment", new Map()],
  ]);
  readonly receipts = new Map<string, Record<string, unknown>>();
  readonly history: Record<string, unknown>[] = [];
  readonly events: Record<string, unknown>[] = [];
  forceConditionalMiss = false;

  async list(entity: string) {
    return structuredClone([...(this.records.get(entity)?.values() ?? [])]);
  }
  async find(entity: string, id: string) {
    return structuredClone(this.records.get(entity)?.get(id));
  }
  async create(entity: string, values: Record<string, unknown>) {
    const records = this.records.get(entity)!;
    const record = { id: `${entity}-${records.size + 1}`, ...values };
    records.set(String(record.id), structuredClone(record));
    return structuredClone(record);
  }
  async update(entity: string, id: string, values: Record<string, unknown>) {
    const current = this.records.get(entity)?.get(id);
    if (!current) throw new Error("missing record");
    const next = { ...current, ...values };
    this.records.get(entity)!.set(id, structuredClone(next));
    return structuredClone(next);
  }
  async conditionalUpdate(
    entity: string,
    id: string,
    expectedVersion: number,
    values: Record<string, unknown>,
  ) {
    const current = this.records.get(entity)?.get(id);
    if (this.forceConditionalMiss || current?.version !== expectedVersion)
      return undefined;
    return this.update(entity, id, values);
  }
  async getAppointmentReceipt(scope: string, key: string) {
    return structuredClone(this.receipts.get(`${scope}:${key}`));
  }
  async saveAppointmentReceipt(receipt: Record<string, unknown>) {
    this.receipts.set(
      `${receipt.scope}:${receipt.idempotencyKey}`,
      structuredClone(receipt),
    );
  }
  async appendAppointmentHistory(entry: Record<string, unknown>) {
    this.history.push(structuredClone(entry));
  }
  async appendCapabilityEvent(event: Record<string, unknown>) {
    this.events.push(structuredClone(event));
  }
  async listAppointmentHistory(appointmentId: string) {
    return structuredClone(
      this.history.filter((entry) => entry.appointmentId === appointmentId),
    );
  }
  async inTransaction<T>(
    operation: (store: AppointmentCommandStore) => Promise<T>,
  ) {
    const before = snapshot(this);
    try {
      return await operation(this);
    } catch (error) {
      this.records.clear();
      for (const [entity, entries] of before.records as [
        string,
        [string, Record<string, unknown>][],
      ][])
        this.records.set(entity, new Map(entries));
      this.receipts.clear();
      for (const [key, value] of before.receipts as [
        string,
        Record<string, unknown>,
      ][])
        this.receipts.set(key, value);
      this.history.splice(
        0,
        this.history.length,
        ...(before.history as Record<string, unknown>[]),
      );
      this.events.splice(
        0,
        this.events.length,
        ...(before.events as Record<string, unknown>[]),
      );
      throw error;
    }
  }
}

describe("appointment booking compiler runtime", () => {
  it("renders a type-complete appointment profile bundle with durable retry and safe API errors", () => {
    const files = new Map(
      generatedAppointmentBundle().files.map((file) => [
        file.path,
        file.content,
      ]),
    );
    const runtime = files.get("api/src/application-runtime.ts")!;
    const prisma = files.get("api/src/prisma-record-store.ts")!;
    const api = files.get("api/src/main.ts")!;
    const proxy = files.get("web/app/api/[...path]/route.ts")!;
    const schema = files.get("api/prisma/schema.prisma")!;
    const migration = files.get(
      "database/prisma/migrations/0001_initial/migration.sql",
    )!;
    expect(prisma).toContain(
      'import type { AppointmentMutationReceipt, AppointmentHistoryEntry } from "./application-runtime.js";',
    );
    expect(prisma).toContain("code === 'P2002'");
    expect(prisma).toContain(
      "entry instanceof Date ? entry.toISOString() : entry",
    );
    expect(prisma).toContain(
      "function asStoredRecord(value: unknown): StoredRecord",
    );
    expect(prisma).toContain(
      "const {apiVersion:_apiVersion,...persisted}=entry",
    );
    expect(prisma).toContain(
      "apiVersion:'factory.generated.appointment-history-entry/v1'",
    );
    expect(runtime).toContain("appointmentEligibility");
    expect(runtime).toContain("appointmentSnapshot");
    expect(runtime).toContain("function appointmentTemporalValue");
    expect(runtime).toContain("value instanceof Date ? value.toISOString()");
    expect(runtime).toContain("appointmentScopeDigest");
    expect(runtime).toContain("Buffer.byteLength(value,'utf8')");
    expect(api).toContain("AppointmentDomainError");
    expect(api).toContain("@HttpCode(200)");
    expect(api).toContain("HttpStatus.CONFLICT");
    expect(proxy).toContain("async function fetchUpstream");
    expect(proxy).toContain("requestBody");
    expect(proxy).toContain("setTimeout(resolve, 150 * (attempt + 1))");
    expect(schema).toMatch(
      /model Appointment \{[\s\S]*version Int @default\(0\)/,
    );
    expect(migration).toContain('"version" INTEGER NOT NULL DEFAULT 0');
  });

  it("emits exact API, runtime, and Prisma sources that TypeScript accepts as one project", async () => {
    const files = new Map(
      generatedAppointmentBundle().files.map((file) => [
        file.path,
        file.content,
      ]),
    );
    const digest = (path: string) =>
      createHash("sha256").update(files.get(path)!, "utf8").digest("hex");
    expect({
      api: digest("api/src/main.ts"),
      runtime: digest("api/src/application-runtime.ts"),
      prisma: digest("api/src/prisma-record-store.ts"),
    }).toEqual({
      api: "0a2adde4eb1517b7e95975b5a617db7fe2997cc9967df0b95d6957fde7dbaad5",
      runtime:
        "225e832d72f1382e119b74491e742abcf09820527f39e2783c030e8a0332283e",
      prisma:
        "503c5fe12eb7440e69c7f3b0b088f9022e29b3220a9e9a8ec4a19155f8573714",
    });
    expect(await typecheckGeneratedAppointmentProfile()).toEqual([]);
  }, 30_000);

  it("typechecks the emitted Appointment page runtime projection", async () => {
    expect(await typecheckGeneratedAppointmentPageRuntime()).toEqual([]);
  }, 30_000);

  it("injects server-derived entity routes and serializable appointment stores", () => {
    const api = renderAppointmentApiDispatch(
      "import { ApplicationRuntime } from \"./application-runtime.js\";\nfunction rejected(error: unknown): HttpException {\n  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);\n}\n@Controller('api')\nclass GeneratedController { create(){ return await applicationRuntime.create( } transition(){ return await applicationRuntime.transition( } }",
      profile,
    );
    expect(api).toContain("@Get(':entity/:recordId/appointment-history')");
    expect(api).toContain(
      "appointmentCommand(appointmentServerContext(request,entity,'create')",
    );
    expect(api).toContain(
      "new AppointmentDomainError(403, 'appointment.forbidden')",
    );
    expect(api).not.toMatch(/factoryServer|requestHash|actorScope|\bnow\b/);
    const runtime = renderAppointmentMutationRuntime(
      "export interface RecordStore {\n  inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T>;\n}\nexport class InMemoryRecordStore {\n  private readonly auditEvents: AuditEvent[] = [];\n  private collection(entityKey: string) {}\n}\nexport class ApplicationRuntime {\n}",
      profile,
    );
    expect(runtime).toContain("conditionalAppointmentUpdate");
    expect(runtime).toContain(
      "appointmentCommand(server:{role:string;scope:string;graphHash:string}",
    );
    expect(runtime).toContain("createHash('sha256')");
    expect(runtime).toContain("appointmentEligibility(store");
    expect(runtime).toContain("appointmentSnapshot(store");
    const prisma = renderAppointmentPrismaStore(
      "export class PrismaRecordStore implements RecordStore {\n  constructor(private readonly prisma: PrismaClient) {}\n  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> { return operation(this); }\n}",
      profile,
    );
    expect(prisma).toContain("isolationLevel:'Serializable'");
    expect(prisma).toContain("P2034");
    expect(prisma).toContain("attempt < 3");
    expect(prisma).toContain("appointmentMutationReceipt");
    expect(prisma).toContain("appointmentHistoryEntryDelegate");
  });

  it("projects only server command names for a lock-resolved appointment profile", () => {
    const graph = {
      metadata: { name: "Bookings" },
      experience: { theme: { mode: "light" } },
      domain: { entities: [], relations: [] },
      integration: { capabilities: [] },
      page: { pages: [], navigation: [] },
    } as unknown as ApplicationGraphV1;
    const projection = createGeneratedPageRuntimeProjection(graph, {
      appointment: profile,
    });
    expect(projection.appointment).toEqual({
      appointmentEntity: "appointment",
      commands: ["request", "confirm", "reschedule", "cancel", "history"],
    });
    expect(JSON.stringify(projection.appointment)).not.toMatch(
      /capacity|timezone|slot/i,
    );
  });

  it("creates, confirms, moves, cancels, and returns append-only history", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const requested = await runtime.request(
      store,
      context("customer", "request"),
      {
        scheduleId: "slot-1",
        customerName: "Ada",
        notes: "Morning",
      },
    );
    const confirmed = await runtime.confirm(
      store,
      context("staff", "confirm"),
      {
        appointmentId: requested.id,
        expectedVersion: 0,
      },
    );
    const moved = await runtime.reschedule(store, context("staff", "move"), {
      appointmentId: requested.id,
      expectedVersion: 1,
      scheduleId: "slot-2",
    });
    const cancelled = await runtime.cancel(
      store,
      context("customer", "cancel"),
      {
        appointmentId: requested.id,
        expectedVersion: 2,
        cancellationReason: "Changed plans",
      },
    );

    expect(
      [requested, confirmed, moved, cancelled].map((record) => [
        record.status,
        record.version,
      ]),
    ).toEqual([
      ["requested", 0],
      ["confirmed", 1],
      ["requested", 2],
      ["cancelled", 3],
    ]);
    expect(cancelled.cancellationReason).toBe("Changed plans");
    expect(
      await runtime.history(store, context("staff", "history"), requested.id),
    ).toEqual([
      expect.objectContaining({
        apiVersion: "factory.generated.appointment-history-entry/v1",
        action: "claim",
        fromStatus: null,
        toStatus: "requested",
        toSlot: {
          scheduleId: "slot-1",
          serviceId: "service-1",
          startUtc: "2026-10-01T09:00:00.000Z",
          endUtc: "2026-10-01T09:30:00.000Z",
          timezone: "Asia/Singapore",
        },
      }),
      expect.objectContaining({
        action: "confirm",
        fromStatus: "requested",
        toStatus: "confirmed",
      }),
      expect.objectContaining({
        action: "move",
        fromStatus: "confirmed",
        toStatus: "requested",
        fromSlot: expect.objectContaining({ scheduleId: "slot-1" }),
        toSlot: expect.objectContaining({ scheduleId: "slot-2" }),
      }),
      expect.objectContaining({
        action: "cancel",
        fromStatus: "requested",
        toStatus: "cancelled",
        cancellationReason: "Changed plans",
        fromSlot: expect.objectContaining({ scheduleId: "slot-2" }),
        toSlot: null,
      }),
    ]);
    expect(store.events.map((entry) => entry.operation)).toEqual([
      "claim",
      "confirm",
      "move",
      "release",
    ]);
  });

  it("denies a second capacity-one claim without recording a partial mutation", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    await runtime.request(store, context("customer", "first"), {
      scheduleId: "slot-1",
      customerName: "Ada",
    });
    const before = snapshot(store);
    await expect(
      runtime.request(store, context("customer", "second"), {
        scheduleId: "slot-1",
        customerName: "Bea",
      }),
    ).rejects.toMatchObject({
      code: "appointment.capacity_conflict",
      status: 409,
    });
    expect(snapshot(store)).toEqual(before);
  });

  it("uses a conditional version write when an otherwise valid command races", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const requested = await runtime.request(
      store,
      context("customer", "request"),
      { scheduleId: "slot-1", customerName: "Ada" },
    );
    store.forceConditionalMiss = true;
    const before = snapshot(store);
    await expect(
      runtime.confirm(store, context("staff", "confirm"), {
        appointmentId: requested.id,
        expectedVersion: 0,
      }),
    ).rejects.toMatchObject({
      code: "appointment.version_conflict",
      status: 409,
    });
    expect(snapshot(store)).toEqual(before);
  });

  it("revalidates the stored canonical schedule and timezone before confirmation", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const requested = await runtime.request(
      store,
      context("customer", "request"),
      { scheduleId: "slot-1", customerName: "Ada" },
    );
    store.records.get("schedule")!.get("slot-1")!.timezone = "Mars/Olympus";
    const before = snapshot(store);
    await expect(
      runtime.confirm(store, context("staff", "confirm"), {
        appointmentId: requested.id,
        expectedVersion: 0,
      }),
    ).rejects.toMatchObject({
      code: "appointment.schedule_invalid",
      status: 400,
    });
    expect(snapshot(store)).toEqual(before);
  });

  it("rejects unsafe cancellation reasons without any partial appointment effects", async () => {
    const runtime = createAppointmentCommandRuntime(profile);
    for (const cancellationReason of [
      "   ",
      "x".repeat(501),
      "bad\u0000reason",
      "bad\u007freason",
      "bad\u0001reason",
      42,
    ]) {
      const store = new TestStore();
      const requested = await runtime.request(
        store,
        context("customer", `request-${String(cancellationReason)}`),
        { scheduleId: "slot-1", customerName: "Ada" },
      );
      const before = snapshot(store);
      await expect(
        runtime.cancel(
          store,
          context("customer", `cancel-${String(cancellationReason)}`),
          {
            appointmentId: requested.id,
            expectedVersion: 0,
            cancellationReason,
          },
        ),
      ).rejects.toMatchObject({
        code: "appointment.invalid_request",
        status: 400,
      });
      expect(snapshot(store)).toEqual(before);
    }
  });

  it("uses the same complete slot integrity rules for private confirmation and cancellation", async () => {
    const runtime = createAppointmentCommandRuntime(profile);
    const confirmStore = new TestStore();
    const requested = await runtime.request(
      confirmStore,
      context("customer", "confirm-request"),
      { scheduleId: "slot-1", customerName: "Ada" },
    );
    confirmStore.records.get("schedule")!.get("slot-1")!.end =
      "2026-10-01T09:00:00Z";
    const invalidInterval = snapshot(confirmStore);
    await expect(
      runtime.confirm(
        confirmStore,
        context("staff", "confirm-invalid-interval"),
        { appointmentId: requested.id, expectedVersion: 0 },
      ),
    ).rejects.toMatchObject({
      code: "appointment.schedule_invalid",
      status: 400,
    });
    expect(snapshot(confirmStore)).toEqual(invalidInterval);

    const cancelStore = new TestStore();
    const cancellable = await runtime.request(
      cancelStore,
      context("customer", "cancel-request"),
      { scheduleId: "slot-1", customerName: "Bea" },
    );
    const schedule = cancelStore.records.get("schedule")!.get("slot-1")!;
    schedule.status = "closed";
    schedule.capacity = 0;
    cancelStore.records.get("service")!.get("service-1")!.active = false;
    await expect(
      runtime.cancel(cancelStore, context("customer", "cancel-closed"), {
        appointmentId: cancellable.id,
        expectedVersion: 0,
        cancellationReason: "No longer available",
      }),
    ).resolves.toMatchObject({ status: "cancelled" });

    const missingServiceStore = new TestStore();
    const withoutService = await runtime.request(
      missingServiceStore,
      context("customer", "missing-service-request"),
      { scheduleId: "slot-1", customerName: "Cleo" },
    );
    missingServiceStore.records.get("service")!.delete("service-1");
    const missingService = snapshot(missingServiceStore);
    await expect(
      runtime.cancel(
        missingServiceStore,
        context("customer", "missing-service-cancel"),
        {
          appointmentId: withoutService.id,
          expectedVersion: 0,
          cancellationReason: "No service remains",
        },
      ),
    ).rejects.toMatchObject({
      code: "appointment.schedule_invalid",
      status: 400,
    });
    expect(snapshot(missingServiceStore)).toEqual(missingService);
  });

  it("replays an identical command and rejects stale, forbidden, invalid, and forged commands unchanged", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const input = { scheduleId: "slot-1", customerName: "Ada" };
    const first = await runtime.request(
      store,
      context("customer", "request"),
      input,
    );
    const afterFirst = snapshot(store);
    await expect(
      runtime.request(store, context("customer", "request"), input),
    ).resolves.toEqual(first);
    expect(snapshot(store)).toEqual(afterFirst);

    for (const command of [
      () =>
        runtime.confirm(store, context("customer", "forbidden"), {
          appointmentId: first.id,
          expectedVersion: 0,
        }),
      () =>
        runtime.cancel(store, context("customer", "stale"), {
          appointmentId: first.id,
          expectedVersion: 1,
          cancellationReason: "x",
        }),
      () =>
        runtime.request(store, context("customer", "forged"), {
          ...input,
          capacity: 99,
        }),
    ]) {
      const before = snapshot(store);
      await expect(command()).rejects.toMatchObject({
        code: expect.stringMatching(/^appointment\./),
      });
      expect(snapshot(store)).toEqual(before);
    }

    const schedule = store.records.get("schedule")!.get("slot-2")!;
    schedule.end = schedule.start;
    const beforeInvalid = snapshot(store);
    await expect(
      runtime.request(store, context("customer", "invalid"), {
        scheduleId: "slot-2",
        customerName: "Bea",
      }),
    ).rejects.toMatchObject({
      code: "appointment.schedule_invalid",
      status: 400,
    });
    expect(snapshot(store)).toEqual(beforeInvalid);

    store.records.get("schedule")!.get("slot-2")!.timezone = "Mars/Olympus";
    const beforeTimezone = snapshot(store);
    await expect(
      runtime.request(store, context("customer", "timezone"), {
        scheduleId: "slot-2",
        customerName: "Bea",
      }),
    ).rejects.toMatchObject({
      code: "appointment.schedule_invalid",
      status: 400,
    });
    expect(snapshot(store)).toEqual(beforeTimezone);
    const slot = store.records.get("schedule")!.get("slot-2")!;
    slot.timezone = "Asia/Singapore";
    slot.start = "2026-02-30T10:00:00Z";
    slot.end = "2026-02-30T10:30:00Z";
    const beforeImpossibleDate = snapshot(store);
    await expect(
      runtime.request(store, context("customer", "impossible-date"), {
        scheduleId: "slot-2",
        customerName: "Bea",
      }),
    ).rejects.toMatchObject({
      code: "appointment.schedule_invalid",
      status: 400,
    });
    expect(snapshot(store)).toEqual(beforeImpossibleDate);
    await expect(
      runtime.history(store, context("staff", "missing-history"), "missing"),
    ).rejects.toMatchObject({ code: "appointment.not_found", status: 404 });
  });
});
