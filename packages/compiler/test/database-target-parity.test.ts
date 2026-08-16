import { describe, expect, it } from "vitest";
import ts from "typescript";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  type CapabilitySelectionV1,
  type FactoryProfile,
} from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  assertProductBlueprint,
  assertValidApplicationGraph,
  createBlankApplicationDraft,
  GraphSemanticError,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import {
  buildCompilationInput,
  createCompilerTargetRegistryV1,
  sha256Digest,
  type GeneratedFile,
  type PublishedGraphInput,
} from "../src/index.js";
import { databaseTargetPlugin } from "../src/targets/database/target.js";

const profiles: readonly FactoryProfile[] = [
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
];

/**
 * Frozen database digests captured from generateApplicationBundle on
 * the pre-migration tree (2026-08-06). The plugin must reproduce these exact
 * bytes for every Profile; an intentional change requires a separately
 * documented decision, not a silent refactor drift. The schema digest is
 * identical for `database/prisma/schema.prisma` and `api/prisma/schema.prisma`
 * (the API copy is a byte duplicate); the Restaurant profile carries the
 * specialized runtime schema/migration/seed, and the generic commerce
 * profiles carry the package-owned order-operations persistence fragments.
 *
 * Re-baselined 2026-08-08 (documented in the Golden Path Slice 7 ledger):
 * (1) expense-approval seed.ts changed because the profile starter graph now
 * declares the deterministic `expense-fixture-01` seed record (the
 * verification contract's record-bearing journeys were 403ing on a clean
 * boot with an empty seed); (2) simple-ecommerce / retail-counter /
 * grocery-pickup schema/migration/seed changed because accepted recipe-growth
 * commits after the 2026-08-06 freeze altered those starter graphs (proven
 * pre-existing on the clean tree via git stash; restaurant-ordering and the
 * expense-approval schema/migration are byte-identical to the freeze).
 * Re-baselined 2026-08-10 for the reserved `Factory_` compiler storage
 * namespace. Restaurant remains byte-identical because its closed schema and
 * runtime contract retain the existing model names.
 */
const LEGACY_DIGESTS: Readonly<
  Record<FactoryProfile, Readonly<Record<string, string>>>
> = {
  "expense-approval": {
    "database/prisma/schema.prisma":
      "3b5dab77da3ba585d19f93d73591e5a7f7d05bb06a808df0cfc8013500cae3b0",
    "api/prisma/schema.prisma":
      "3b5dab77da3ba585d19f93d73591e5a7f7d05bb06a808df0cfc8013500cae3b0",
    "database/prisma/migrations/0001_initial/migration.sql":
      "ab8ad7d45b221aa27cd165148818724180d0a6ea54362f9adb389454a0cacd01",
    "database/prisma/seed.ts":
      "e071772bd6a9f1ae9c815f2e41b5a4786aa7d7e36eb0e0ca1e0623c51d57547f",
  },
  "restaurant-ordering": {
    "database/prisma/schema.prisma":
      "4be4e77f4ceff7c66949c3d89c5ab3c923d1f34c0a45e1fcbcecb49bba23ab0b",
    "api/prisma/schema.prisma":
      "4be4e77f4ceff7c66949c3d89c5ab3c923d1f34c0a45e1fcbcecb49bba23ab0b",
    "database/prisma/migrations/0001_initial/migration.sql":
      "dac861b44af2167057bb09f3cf55962237182814f381a7278b232a939fe134bf",
    "database/prisma/seed.ts":
      "15825eb263325df43d1ba92843517374c54cd8342a1d007749767f85399d52d1",
  },
  "simple-ecommerce": {
    "database/prisma/schema.prisma":
      "b148d95a86b5b703ec89efd3184e4d1110fbb1ad8fd2c40b22ad666f74776c81",
    "api/prisma/schema.prisma":
      "b148d95a86b5b703ec89efd3184e4d1110fbb1ad8fd2c40b22ad666f74776c81",
    "database/prisma/migrations/0001_initial/migration.sql":
      "442f0eb21b399d999694994e46fc37635432071de5e6e39866c962de6d15d3ae",
    "database/prisma/seed.ts":
      "9fd87df5204d70cacd85b257587702831e3380ca923fd7f5e6650469d9d53361",
  },
  "retail-counter": {
    "database/prisma/schema.prisma":
      "64c41ce2b1d880cfdddc79ca7edf381943d03564d2ce692a9756d5635d2fc1a1",
    "api/prisma/schema.prisma":
      "64c41ce2b1d880cfdddc79ca7edf381943d03564d2ce692a9756d5635d2fc1a1",
    "database/prisma/migrations/0001_initial/migration.sql":
      "58869553e5b39d158acd68b7d31228e5b3bbe96613621cd510706df8c8450af7",
    "database/prisma/seed.ts":
      "025f39a13cfcd66500188e933b4a895aa417a07a0a5308567e25a6ad9d960724",
  },
  "grocery-pickup": {
    "database/prisma/schema.prisma":
      "63a701cb5ae644e04258fa284880957b81bef57b74d6689ec41a60d7981ae97c",
    "api/prisma/schema.prisma":
      "63a701cb5ae644e04258fa284880957b81bef57b74d6689ec41a60d7981ae97c",
    "database/prisma/migrations/0001_initial/migration.sql":
      "7c28e56ef2c9259d09f187ee60c9894bfea4bf82b03b6cf07371cf737288d39e",
    "database/prisma/seed.ts":
      "261d55d3c50c5bb1f38b35601bcf09bd34e2793f200d67470bc9e3ce5e7d97d4",
  },
};

function persistedSelections(
  graph: ApplicationGraphV1,
): readonly CapabilitySelectionV1[] {
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
}

function compileFor(profile: FactoryProfile): PublishedGraphInput {
  const graph = assertValidApplicationGraph(
    composeProfileDraft({ profile }).graph,
  );
  return {
    publishedRevisionId: "parity",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: persistedSelections(graph),
    }),
  };
}

describe("database target file/byte/digest parity", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(databaseTargetPlugin);

  it.each(profiles)(
    "renders $profile database with exact legacy bytes and digests",
    (profile) => {
      const files = registry.run(
        "prisma-postgres",
        buildCompilationInput(compileFor(profile)),
      );
      const byPath = new Map(files.map((file) => [file.path, file.content]));
      for (const [path, legacyDigest] of Object.entries(
        LEGACY_DIGESTS[profile],
      )) {
        const content = byPath.get(path);
        expect(content, `missing ${path}`).toBeDefined();
        expect(sha256Digest(content!)).toBe(legacyDigest);
        expect(Buffer.byteLength(content!, "utf8")).toBeGreaterThan(0);
      }
      expect(files).toHaveLength(4);
      expect(byPath.get("api/prisma/schema.prisma")).toBe(
        byPath.get("database/prisma/schema.prisma"),
      );
    },
  );

  it("produces the same database set from repeated renders", () => {
    const input = buildCompilationInput(compileFor("simple-ecommerce"));
    const first = registry.run("prisma-postgres", input);
    const second = registry.run("prisma-postgres", input);

    expect(
      first.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    ).toEqual(
      second.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    );
  });
});

describe("seed renders Prisma-valid ISO-8601 for date and datetime fields", () => {
  // The database target emits the seed delegate as the camel-cased entity
  // key; the field-type map below keys on the same shape.
  function toCamelCase(value: string): string {
    return value
      .split(/[-_]/)
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join("")
      .replace(/^./, (first) => first.toLowerCase());
  }

  const fixtureInterpreter = new FixtureRequirementInterpreter();
  const expenseBrief =
    "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";

  async function composedExpenseGraph(): Promise<ApplicationGraphV1> {
    const interpretation = await fixtureInterpreter.interpret({
      brief: expenseBrief,
    });
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: interpretation.spec.requirementId,
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    return assertValidApplicationGraph(
      applyGraphDiffToDraft(baseDraft, diff).graph,
    );
  }

  it("emits only Prisma-valid date and datetime values in the seed", async () => {
    const graph = await composedExpenseGraph();
    const registry = createCompilerTargetRegistryV1();
    registry.register(databaseTargetPlugin);
    const files = registry.run(
      "prisma-postgres",
      buildCompilationInput({
        publishedRevisionId: `published-${graph.metadata.id}`,
        graph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: graph.integration.compositionSelections ?? [],
        }),
      }),
    );
    const seed = files.find((file) => file.path === "database/prisma/seed.ts");
    expect(seed).toBeDefined();

    // The graph's own field types drive the contract: the composer keeps the
    // natural date-only shape ("2026-08-01") in the Graph, and the database
    // target must render a value the Prisma DateTime parser accepts
    // (ISO-8601 with a zone). A date-only string fails at migrate time with
    // "premature end of input. Expected ISO-8601 DateTime."
    const recordsSource = /const records = (\[[\s\S]*?\])\s*as const;/.exec(
      seed!.content,
    );
    expect(
      recordsSource,
      "seed must declare its records literal",
    ).not.toBeNull();
    const records = JSON.parse(recordsSource![1]) as ReadonlyArray<{
      readonly delegate: string;
      readonly values: Readonly<Record<string, unknown>>;
    }>;
    const dateFieldTypes = new Map(
      graph.domain.entities.flatMap((entity) =>
        entity.fields
          .filter((field) => field.type === "date" || field.type === "datetime")
          .map(
            (field) =>
              [`${toCamelCase(entity.key)}:${field.key}`, field.type] as const,
          ),
      ),
    );
    expect(dateFieldTypes.size).toBeGreaterThan(0);
    for (const record of records) {
      for (const [fieldKey, value] of Object.entries(record.values)) {
        const fieldType = dateFieldTypes.get(`${record.delegate}:${fieldKey}`);
        if (fieldType === undefined || typeof value !== "string") continue;
        expect(
          value,
          `${record.delegate}.${fieldKey} (${fieldType}) must be zone-qualified ISO-8601`,
        ).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/,
        );
      }
    }
    // The exact regression: the expense `date` field must not be emitted as
    // the natural date-only Graph value.
    expect(seed!.content).not.toContain('"date": "2026-08-01"');
  });

  it("normalizes date-only values for hyphenated entity keys", async () => {
    // A raw seed key such as `booking-date` must address the same temporal
    // field metadata as its camel-cased Prisma delegate. Otherwise the
    // date-only value reaches Prisma unchanged and migrate rejects it.
    const graph = await composedExpenseGraph();
    const hyphenatedEntityKey = "booking-date";
    const hyphenatedGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: [
          ...graph.domain.entities,
          {
            key: hyphenatedEntityKey,
            label: "Booking date",
            fields: [{ key: "day", type: "date", required: true }],
            indexes: [],
          },
        ],
        seedData: [
          ...(graph.domain.seedData ?? []),
          {
            entity: hyphenatedEntityKey,
            id: "sample-booking-date",
            values: { day: "2026-08-01" },
          },
        ],
      },
    };
    const registry = createCompilerTargetRegistryV1();
    registry.register(databaseTargetPlugin);
    const files = registry.run(
      "prisma-postgres",
      buildCompilationInput({
        publishedRevisionId: `published-${graph.metadata.id}`,
        graph: hyphenatedGraph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(hyphenatedGraph),
          selections: hyphenatedGraph.integration.compositionSelections ?? [],
        }),
      }),
    );
    const seed = files.find((file) => file.path === "database/prisma/seed.ts");
    expect(seed, "missing database/prisma/seed.ts").toBeDefined();
    const recordsSource = /const records = (\[[\s\S]*?\])\s*as const;/.exec(
      seed!.content,
    );
    expect(
      recordsSource,
      "seed must declare its records literal",
    ).not.toBeNull();
    const records = JSON.parse(recordsSource![1]) as ReadonlyArray<{
      readonly delegate: string;
      readonly values: Readonly<Record<string, unknown>>;
    }>;
    const record = records.find(
      (candidate) => candidate.delegate === toCamelCase(hyphenatedEntityKey),
    );
    expect(record?.values.day).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("seed binds required foreign-key scalars to seeded target records", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(databaseTargetPlugin);

  const fixtureInterpreter = new FixtureRequirementInterpreter();
  const bookingBrief =
    "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";

  function seedDelegate(entityKey: string): string {
    return entityKey
      .split(/[-_]/)
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join("")
      .replace(/^./, (first) => first.toLowerCase());
  }

  async function composedAppointmentGraph(options?: {
    readonly duplicateServiceReference?: boolean;
    readonly relationFieldCollision?: boolean;
    readonly longServiceReferences?: boolean;
  }): Promise<ApplicationGraphV1> {
    const interpretation = await fixtureInterpreter.interpret({
      brief: bookingBrief,
    });
    const blueprint = options?.duplicateServiceReference
      ? assertProductBlueprint({
          ...interpretation.blueprint,
          entities: interpretation.blueprint.entities.map((entity) => {
            if (entity.key === "appointment") {
              const baseFields = options.longServiceReferences
                ? entity.fields.filter((field) => field.key !== "serviceKey")
                : entity.fields;
              return {
                ...entity,
                fields: [
                  ...baseFields,
                  ...(options.longServiceReferences
                    ? [
                        {
                          key: "preferredServiceRelationshipIdentifierAlphaKey",
                          label: "Preferred service alpha",
                          type: "reference" as const,
                          required: true,
                          referenceTo: "service",
                        },
                        {
                          key: "preferredServiceRelationshipIdentifierBetaKey",
                          label: "Preferred service beta",
                          type: "reference" as const,
                          required: true,
                          referenceTo: "service",
                        },
                      ]
                    : [
                        {
                          key: "secondaryServiceKey",
                          label: "Secondary service",
                          type: "reference" as const,
                          required: true,
                          referenceTo: "service",
                        },
                      ]),
                  ...(options.relationFieldCollision
                    ? [
                        {
                          key: "serviceByServiceKey",
                          label: "Service relation note",
                          type: "text" as const,
                          required: false,
                        },
                      ]
                    : []),
                ],
              };
            }
            if (entity.key === "service" && options.relationFieldCollision) {
              return {
                ...entity,
                fields: [
                  ...entity.fields,
                  {
                    key: "appointmentsBySecondaryServiceKey",
                    label: "Appointment relation note",
                    type: "text" as const,
                    required: false,
                  },
                ],
              };
            }
            return entity;
          }),
        })
      : interpretation.blueprint;
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: interpretation.spec.requirementId,
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint,
      baseDraft,
    });
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint,
      baseDraft,
    });
    return assertValidApplicationGraph(
      applyGraphDiffToDraft(baseDraft, diff).graph,
    );
  }

  function compileDatabase(
    graph: ApplicationGraphV1,
  ): ReadonlyMap<string, string> {
    const files = registry.run(
      "prisma-postgres",
      buildCompilationInput({
        publishedRevisionId: `published-${graph.metadata.id}`,
        graph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: graph.integration.compositionSelections ?? [],
        }),
      }),
    );
    return new Map(files.map((file) => [file.path, file.content]));
  }

  function compileSeed(graph: ApplicationGraphV1): string {
    const seed = compileDatabase(graph).get("database/prisma/seed.ts");
    expect(seed, "missing database/prisma/seed.ts").toBeDefined();
    return seed!;
  }

  function compileRestaurantSeed(graph: ApplicationGraphV1): string {
    const files = registry.run(
      "prisma-postgres",
      buildCompilationInput({
        publishedRevisionId: `published-${graph.metadata.id}`,
        graph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: persistedSelections(graph),
        }),
      }),
    );
    const seed = files.find((file) => file.path === "database/prisma/seed.ts");
    expect(seed, "missing database/prisma/seed.ts").toBeDefined();
    expect(seed!.content).toContain("RESTAURANT_DEMO_TABLE_TOKEN");
    return seed!.content;
  }

  function seedRecords(seedContent: string): ReadonlyArray<{
    readonly delegate: string;
    readonly id: string;
    readonly values: Readonly<Record<string, unknown>>;
  }> {
    const recordsSource = /const records = (\[[\s\S]*?\])\s*as const;/.exec(
      seedContent,
    );
    expect(
      recordsSource,
      "seed must declare its records literal",
    ).not.toBeNull();
    return JSON.parse(recordsSource![1]);
  }

  async function executeGenericSeed(seedContent: string): Promise<
    ReadonlyArray<{
      readonly delegate: string;
      readonly input: {
        readonly where: { readonly id: string };
        readonly update: Readonly<Record<string, unknown>>;
        readonly create: Readonly<Record<string, unknown>>;
      };
    }>
  > {
    const upserts: Array<{
      readonly delegate: string;
      readonly input: {
        readonly where: { readonly id: string };
        readonly update: Readonly<Record<string, unknown>>;
        readonly create: Readonly<Record<string, unknown>>;
      };
    }> = [];
    const prisma = new Proxy(
      { $disconnect: async () => undefined },
      {
        get(target, property) {
          if (property === "$disconnect") return target.$disconnect;
          return {
            upsert: async (input: (typeof upserts)[number]["input"]) => {
              upserts.push({ delegate: String(property), input });
            },
          };
        },
      },
    );
    const runtimeKey = "__factoryCompilerSeedPrisma";
    Object.defineProperty(globalThis, runtimeKey, {
      configurable: true,
      value: prisma,
    });
    try {
      const executableSource = seedContent
        .replace(
          'import { PrismaClient } from "@prisma/client";',
          `const PrismaClient = class { constructor() { return globalThis.${runtimeKey}; } };`,
        )
        .replace(/^void seed\(\).*$/m, "");
      const javascript = ts.transpileModule(executableSource, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText;
      const exports: { seed?: () => Promise<unknown> } = {};
      Function("exports", javascript)(exports);
      expect(exports.seed, "seed module must export seed").toBeDefined();
      await exports.seed!();
      return upserts;
    } finally {
      delete (globalThis as Record<string, unknown>)[runtimeKey];
    }
  }

  function withDeclaredServiceIdValue(
    graph: ApplicationGraphV1,
    valueId: string,
    options?: { readonly omitSeedId?: boolean },
  ): ApplicationGraphV1 {
    return {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "service"
            ? {
                ...entity,
                fields: [
                  ...entity.fields.filter((field) => field.key !== "id"),
                  { key: "id", type: "string", required: true },
                ],
              }
            : entity,
        ),
        seedData: (graph.domain.seedData ?? []).map((seed) => {
          if (seed.entity !== "service") return seed;
          const withValue = {
            ...seed,
            values: { ...seed.values, id: valueId },
          };
          if (!options?.omitSeedId) return withValue;
          const { id: _seedId, ...withoutSeedId } = withValue;
          return withoutSeedId;
        }),
      },
    } as ApplicationGraphV1;
  }

  it("binds the appointment serviceKey to the seeded service record id", async () => {
    // Run-7 regression: the composed appointment seed declared no serviceKey,
    // so migrate crashed with "Argument `service` is missing" and every
    // appointment journey was skipped. The owning scalar must bind to the
    // seeded service record id (an id-referencing relation).
    const graph = await composedAppointmentGraph();
    const appointmentRelation = (graph.domain.relations ?? []).find(
      (relation) =>
        relation.from === "appointment" && relation.to === "service",
    );
    expect(appointmentRelation).toBeDefined();
    const records = seedRecords(compileSeed(graph));
    const appointment = records.find(
      (record) => record.delegate === "appointment",
    );
    expect(appointment).toBeDefined();
    expect(appointment!.values.serviceKey).toBe("sample-service");
  });

  it("orders an explicit required ID target before its owner without changing the value", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const explicitGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: [
          {
            ...appointment!,
            values: { ...appointment!.values, serviceKey: "sample-service" },
          },
          service!,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(explicitGraph));
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    expect(serviceIndex).toBeLessThan(appointmentIndex);
    expect(records[appointmentIndex]!.values.serviceKey).toBe("sample-service");
  });

  it("resolves an explicit required ID through the target's deterministic fallback ID", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const { id: _serviceId, ...serviceWithoutId } = service!;
    const fallbackGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: [
          {
            ...appointment!,
            values: { ...appointment!.values, serviceKey: "seed-service-2" },
          },
          serviceWithoutId,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(fallbackGraph));
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    expect(serviceIndex).toBeLessThan(appointmentIndex);
    expect(records[serviceIndex]!.id).toBe("seed-service-2");
    expect(records[appointmentIndex]!.values.serviceKey).toBe("seed-service-2");
  });

  it("rejects a declared values.id that conflicts with the factory seed identity", async () => {
    const graph = withDeclaredServiceIdValue(
      await composedAppointmentGraph(),
      "conflicting-service-id",
    );

    expect(() => compileSeed(graph)).toThrow(GraphSemanticError);
  });

  it("rejects an equal declared values.id instead of silently stripping it", async () => {
    const graph = withDeclaredServiceIdValue(
      await composedAppointmentGraph(),
      "sample-service",
    );

    expect(() => compileSeed(graph)).toThrow(GraphSemanticError);
  });

  it("rejects a declared values.id even when it equals the positional fallback", async () => {
    const baseGraph = await composedAppointmentGraph();
    const serviceIndex = (baseGraph.domain.seedData ?? []).findIndex(
      (seed) => seed.entity === "service",
    );
    expect(serviceIndex).toBe(0);
    const fallbackId = "seed-service-1";
    const graph = withDeclaredServiceIdValue(baseGraph, fallbackId, {
      omitSeedId: true,
    });

    expect(() => compileSeed(graph)).toThrow(GraphSemanticError);
  });

  it("accepts a Restaurant menu-category positional fallback referenced by a menu item", () => {
    const graph = compileFor("restaurant-ordering").graph;
    const categoryIndex = (graph.domain.seedData ?? []).findIndex(
      (seed) => seed.entity === "menu-category",
    );
    expect(categoryIndex).toBe(2);
    const categoryId = "seed-menu-category-3";
    const fallbackGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: (graph.domain.seedData ?? []).map((seed, index) => {
          if (index === categoryIndex) {
            const { id: _categoryId, ...withoutId } = seed;
            return withoutId;
          }
          return seed.entity === "menu-item"
            ? {
                ...seed,
                values: { ...seed.values, categoryKey: categoryId },
              }
            : seed;
        }),
      },
    };

    const records = seedRecords(compileRestaurantSeed(fallbackGraph));
    expect(
      records.find((record) => record.delegate === "menuCategory")?.id,
    ).toBe(categoryId);
    expect(
      records.find((record) => record.delegate === "menuItem")?.values
        .categoryKey,
    ).toBe(categoryId);
  });

  it("keeps the specialized Restaurant error for a genuinely missing menu-category", () => {
    const graph = compileFor("restaurant-ordering").graph;
    const missingGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: (graph.domain.seedData ?? []).filter(
          (seed) => seed.entity !== "menu-category",
        ),
      },
    };

    expect(() => compileRestaurantSeed(missingGraph)).toThrow(
      "Restaurant seed generation requires a seeded menu-category for every menu-item categoryKey",
    );
  });

  it.each([
    {
      label: "normalized temporal",
      targetField: "bookingDate",
      ownerField: "serviceBookingDate",
      type: "date" as const,
      input: "2026-08-01",
      expected: "2026-08-01T00:00:00.000Z",
    },
    {
      label: "exact non-temporal",
      targetField: "bookingCode",
      ownerField: "serviceBookingCode",
      type: "string" as const,
      input: "Preserve:Mixed-Case_01",
      expected: "Preserve:Mixed-Case_01",
    },
  ])(
    "orders an explicit $label natural-key target without replacing the owner value",
    async ({ targetField, ownerField, type, input, expected }) => {
      const graph = await composedAppointmentGraph();
      const appointment = (graph.domain.seedData ?? []).find(
        (seed) => seed.entity === "appointment",
      );
      const service = (graph.domain.seedData ?? []).find(
        (seed) => seed.entity === "service",
      );
      expect(appointment).toBeDefined();
      expect(service).toBeDefined();
      const explicitNaturalGraph: ApplicationGraphV1 = {
        ...graph,
        domain: {
          ...graph.domain,
          entities: graph.domain.entities.map((entity) => {
            if (entity.key === "appointment") {
              return {
                ...entity,
                fields: [
                  ...entity.fields,
                  { key: ownerField, type, required: true },
                ],
              };
            }
            if (entity.key === "service") {
              return {
                ...entity,
                fields: [
                  ...entity.fields,
                  { key: targetField, type, required: true, unique: true },
                ],
              };
            }
            return entity;
          }),
          relations: [
            ...graph.domain.relations,
            {
              from: "appointment",
              to: "service",
              kind: "many-to-one",
              field: ownerField,
            },
          ],
          seedData: [
            {
              ...appointment!,
              values: {
                ...appointment!.values,
                serviceKey: "sample-service",
                [ownerField]: input,
              },
            },
            {
              ...service!,
              values: { ...service!.values, [targetField]: input },
            },
            ...(graph.domain.seedData ?? []).filter(
              (seed) => seed !== appointment && seed !== service,
            ),
          ],
        },
      };

      const records = seedRecords(compileSeed(explicitNaturalGraph));
      const serviceIndex = records.findIndex(
        (record) => record.delegate === "service",
      );
      const appointmentIndex = records.findIndex(
        (record) => record.delegate === "appointment",
      );
      expect(serviceIndex).toBeLessThan(appointmentIndex);
      expect(records[serviceIndex]!.values[targetField]).toBe(expected);
      expect(records[appointmentIndex]!.values[ownerField]).toBe(expected);
    },
  );

  it("rejects an unresolved explicit ID with the fixed safe database error", async () => {
    const graph = await composedAppointmentGraph();
    const unresolvedGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: (graph.domain.seedData ?? []).map((seed) =>
          seed.entity === "appointment"
            ? {
                ...seed,
                values: { ...seed.values, serviceKey: "missing-service" },
              }
            : seed,
        ),
      },
    };

    expect(() => compileSeed(unresolvedGraph)).toThrow(
      "Generated database storage validation failed.",
    );
  });

  it("rejects ambiguous explicit effective IDs with the fixed safe database error", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const ambiguousGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: [
          {
            ...appointment!,
            values: { ...appointment!.values, serviceKey: "sample-service" },
          },
          service!,
          { ...service!, values: { ...service!.values, name: "Duplicate" } },
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    expect(() => compileSeed(ambiguousGraph)).toThrow(
      "Generated database storage validation failed.",
    );
  });

  it("rejects normalized natural-key ambiguity with the fixed safe database error", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const ambiguousNaturalGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) => {
          if (entity.key === "appointment") {
            return {
              ...entity,
              fields: [
                ...entity.fields,
                { key: "serviceBookingDate", type: "date", required: true },
              ],
            };
          }
          if (entity.key === "service") {
            return {
              ...entity,
              fields: [
                ...entity.fields,
                {
                  key: "bookingDate",
                  type: "date",
                  required: true,
                  unique: true,
                },
              ],
            };
          }
          return entity;
        }),
        relations: [
          ...graph.domain.relations,
          {
            from: "appointment",
            to: "service",
            kind: "many-to-one",
            field: "serviceBookingDate",
          },
        ],
        seedData: [
          {
            ...appointment!,
            values: {
              ...appointment!.values,
              serviceBookingDate: "2026-08-01",
            },
          },
          {
            ...service!,
            values: { ...service!.values, bookingDate: "2026-08-01" },
          },
          {
            ...service!,
            id: "sample-service-duplicate",
            values: {
              ...service!.values,
              bookingDate: "2026-08-01T00:00:00.000Z",
            },
          },
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    expect(() => compileSeed(ambiguousNaturalGraph)).toThrow(
      "Generated database storage validation failed.",
    );
  });

  it("keeps an explicit optional null intentionally unbound", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const optionalNullGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "appointment"
            ? {
                ...entity,
                fields: entity.fields.map((field) =>
                  field.key === "serviceKey"
                    ? { ...field, required: false }
                    : field,
                ),
              }
            : entity,
        ),
        seedData: [
          {
            ...appointment!,
            values: { ...appointment!.values, serviceKey: null },
          },
          service!,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(optionalNullGraph));
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    expect(appointmentIndex).toBeLessThan(serviceIndex);
    expect(records[appointmentIndex]!.values.serviceKey).toBeNull();
  });

  it("rejects an explicit required null with the fixed safe database error", async () => {
    const graph = await composedAppointmentGraph();
    const requiredNullGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: (graph.domain.seedData ?? []).map((seed) =>
          seed.entity === "appointment"
            ? { ...seed, values: { ...seed.values, serviceKey: null } }
            : seed,
        ),
      },
    };

    expect(() => compileSeed(requiredNullGraph)).toThrow(
      "Generated database storage validation failed.",
    );
  });

  it.each([
    { label: "self", twoNode: false },
    { label: "two-node cycle", twoNode: true },
  ])("never sheds an explicit optional $label binding", async ({ twoNode }) => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const explicitCycleGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) => {
          if (entity.key === "appointment") {
            return {
              ...entity,
              fields: [
                ...entity.fields.map((field) =>
                  field.key === "serviceKey"
                    ? { ...field, required: false }
                    : field,
                ),
                ...(!twoNode
                  ? [
                      {
                        key: "parentAppointmentKey",
                        type: "string" as const,
                        required: false,
                      },
                    ]
                  : []),
              ],
            };
          }
          if (entity.key === "service" && twoNode) {
            return {
              ...entity,
              fields: [
                ...entity.fields,
                { key: "appointmentKey", type: "string", required: false },
              ],
            };
          }
          return entity;
        }),
        relations: [
          ...graph.domain.relations,
          ...(twoNode
            ? [
                {
                  from: "service",
                  to: "appointment",
                  kind: "many-to-one" as const,
                  field: "appointmentKey",
                },
              ]
            : [
                {
                  from: "appointment",
                  to: "appointment",
                  kind: "many-to-one" as const,
                  field: "parentAppointmentKey",
                },
              ]),
        ],
        seedData: [
          {
            ...appointment!,
            values: {
              ...appointment!.values,
              serviceKey: "sample-service",
              ...(!twoNode
                ? { parentAppointmentKey: "sample-appointment" }
                : {}),
            },
          },
          ...(twoNode
            ? [
                {
                  ...service!,
                  values: {
                    ...service!.values,
                    appointmentKey: "sample-appointment",
                  },
                },
              ]
            : [service!]),
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    expect(() => compileSeed(explicitCycleGraph)).toThrow(
      "Generated database storage validation failed.",
    );
  });

  it("orders a double-reference target before an owner that was seeded first", async () => {
    // The two values prove both real bound dependencies are accounted for;
    // ordering only one relation would still leave migrate exposed.
    const graph = await composedAppointmentGraph({
      duplicateServiceReference: true,
    });
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const ownerFirstGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: [
          appointment!,
          service!,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(ownerFirstGraph));
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    expect(serviceIndex).toBeLessThan(appointmentIndex);
    expect(records[appointmentIndex]!.values).toMatchObject({
      serviceKey: "sample-service",
      secondaryServiceKey: "sample-service",
    });
  });

  it("preserves target-first and independent seed order", async () => {
    const graph = await composedAppointmentGraph();
    const originalDelegates = (graph.domain.seedData ?? []).map((seed) =>
      seedDelegate(seed.entity),
    );

    expect(
      seedRecords(compileSeed(graph)).map((record) => record.delegate),
    ).toEqual(originalDelegates);
  });

  it("orders an optional bound target before an owner that was seeded first", async () => {
    const graph = await composedAppointmentGraph();
    const optionalGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "appointment"
            ? {
                ...entity,
                fields: entity.fields.map((field) =>
                  field.key === "serviceKey"
                    ? { ...field, required: false }
                    : field,
                ),
              }
            : entity,
        ),
        seedData: [
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed.entity === "appointment",
          ),
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed.entity === "service",
          ),
          ...(graph.domain.seedData ?? []).filter(
            (seed) =>
              seed.entity !== "appointment" && seed.entity !== "service",
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(optionalGraph));
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    expect(serviceIndex).toBeLessThan(appointmentIndex);
    expect(records[appointmentIndex]!.values.serviceKey).toBe("sample-service");
  });

  it.each([
    {
      label: "date-only",
      targetField: "bookingDate",
      ownerField: "serviceBookingDate",
      type: "date" as const,
      input: "2026-08-01",
      expected: "2026-08-01T00:00:00.000Z",
    },
    {
      label: "zone-less datetime",
      targetField: "bookingStartsAt",
      ownerField: "serviceBookingStartsAt",
      type: "datetime" as const,
      input: "2026-08-01T09:30",
      expected: "2026-08-01T09:30:00Z",
    },
    {
      label: "non-temporal string",
      targetField: "bookingCode",
      ownerField: "serviceBookingCode",
      type: "string" as const,
      input: "Preserve:Mixed-Case_01",
      expected: "Preserve:Mixed-Case_01",
    },
  ])(
    "binds a $label natural key to the target's rendered Prisma value",
    async ({ targetField, ownerField, type, input, expected }) => {
      // The owner starts before its target and omits the relation scalar. The
      // synthesized value must be byte-identical to the target's rendered
      // value, including temporal normalization when applicable.
      const graph = await composedAppointmentGraph();
      const appointment = (graph.domain.seedData ?? []).find(
        (seed) => seed.entity === "appointment",
      );
      const service = (graph.domain.seedData ?? []).find(
        (seed) => seed.entity === "service",
      );
      expect(appointment).toBeDefined();
      expect(service).toBeDefined();
      const naturalKeyGraph: ApplicationGraphV1 = {
        ...graph,
        domain: {
          ...graph.domain,
          entities: graph.domain.entities.map((entity) => {
            if (entity.key === "appointment") {
              return {
                ...entity,
                fields: [
                  ...entity.fields,
                  { key: ownerField, type, required: true },
                ],
              };
            }
            if (entity.key === "service") {
              return {
                ...entity,
                fields: [
                  ...entity.fields,
                  { key: targetField, type, required: true, unique: true },
                ],
              };
            }
            return entity;
          }),
          relations: [
            ...graph.domain.relations,
            {
              from: "appointment",
              to: "service",
              kind: "many-to-one",
              field: ownerField,
            },
          ],
          seedData: [
            appointment!,
            {
              ...service!,
              values: { ...service!.values, [targetField]: input },
            },
            ...(graph.domain.seedData ?? []).filter(
              (seed) => seed !== appointment && seed !== service,
            ),
          ],
        },
      };

      const records = seedRecords(compileSeed(naturalKeyGraph));
      const targetIndex = records.findIndex(
        (record) => record.delegate === "service",
      );
      const ownerIndex = records.findIndex(
        (record) => record.delegate === "appointment",
      );
      expect(targetIndex).toBeLessThan(ownerIndex);
      expect(records[targetIndex]!.values[targetField]).toBe(expected);
      expect(records[ownerIndex]!.values[ownerField]).toBe(expected);
    },
  );

  it("sheds one stable optional binding to resolve a two-node cycle", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const optionalCycleGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) => {
          if (entity.key === "appointment") {
            return {
              ...entity,
              fields: entity.fields.map((field) =>
                field.key === "serviceKey"
                  ? { ...field, required: false }
                  : field,
              ),
            };
          }
          if (entity.key === "service") {
            return {
              ...entity,
              fields: [
                ...entity.fields,
                { key: "appointmentKey", type: "string", required: false },
              ],
            };
          }
          return entity;
        }),
        relations: [
          ...graph.domain.relations,
          {
            from: "service",
            to: "appointment",
            kind: "many-to-one",
            field: "appointmentKey",
          },
        ],
        seedData: [
          appointment!,
          service!,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(optionalCycleGraph));
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    expect(appointmentIndex).toBeLessThan(serviceIndex);
    expect(records[appointmentIndex]!.values.serviceKey).toBeUndefined();
    expect(records[serviceIndex]!.values.appointmentKey).toBe(
      "sample-appointment",
    );
  });

  it("sheds an optional synthesized self-reference", async () => {
    const graph = await composedAppointmentGraph();
    const optionalSelfGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "appointment"
            ? {
                ...entity,
                fields: [
                  ...entity.fields,
                  {
                    key: "parentAppointmentKey",
                    type: "string",
                    required: false,
                  },
                ],
              }
            : entity,
        ),
        relations: [
          ...graph.domain.relations,
          {
            from: "appointment",
            to: "appointment",
            kind: "many-to-one",
            field: "parentAppointmentKey",
          },
        ],
      },
    };

    const appointment = seedRecords(compileSeed(optionalSelfGraph)).find(
      (record) => record.delegate === "appointment",
    );
    expect(appointment).toBeDefined();
    expect(appointment!.values.serviceKey).toBe("sample-service");
    expect(appointment!.values.parentAppointmentKey).toBeUndefined();
  });

  it("preserves an acyclic optional binding into an optional self-cycle", async () => {
    // Seed 0 depends on seed 1 but is not part of seed 1's self-cycle. A
    // global source-order tie-break over-sheds both values; cycle-local
    // release must remove only the Service self-link.
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const inboundGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) => {
          if (entity.key === "appointment") {
            return {
              ...entity,
              fields: entity.fields.map((field) =>
                field.key === "serviceKey"
                  ? { ...field, required: false }
                  : field,
              ),
            };
          }
          if (entity.key === "service") {
            return {
              ...entity,
              fields: [
                ...entity.fields,
                { key: "parentServiceKey", type: "string", required: false },
              ],
            };
          }
          return entity;
        }),
        relations: [
          ...graph.domain.relations,
          {
            from: "service",
            to: "service",
            kind: "many-to-one",
            field: "parentServiceKey",
          },
        ],
        seedData: [
          appointment!,
          service!,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const firstSeed = compileSeed(inboundGraph);
    expect(compileSeed(inboundGraph)).toBe(firstSeed);
    const records = seedRecords(firstSeed);
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    expect(serviceIndex).toBeLessThan(appointmentIndex);
    expect(records[serviceIndex]!.values.parentServiceKey).toBeUndefined();
    expect(records[appointmentIndex]!.values.serviceKey).toBe("sample-service");
  });

  it("preserves external and independent bindings around a two-node optional cycle", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    const schedule = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "schedule",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    expect(schedule).toBeDefined();
    const surroundedCycleGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: [
          ...graph.domain.entities.map((entity) => {
            if (entity.key === "appointment") {
              return {
                ...entity,
                fields: entity.fields.map((field) =>
                  field.key === "serviceKey"
                    ? { ...field, required: false }
                    : field,
                ),
              };
            }
            if (entity.key === "service") {
              return {
                ...entity,
                fields: [
                  ...entity.fields,
                  {
                    key: "appointmentKey",
                    type: "string",
                    required: false,
                  },
                  { key: "scheduleKey", type: "string", required: false },
                ],
              };
            }
            return entity;
          }),
          {
            key: "independent-target",
            label: "Independent target",
            fields: [{ key: "name", type: "string", required: true }],
            indexes: [],
          },
          {
            key: "independent-owner",
            label: "Independent owner",
            fields: [
              {
                key: "independentTargetKey",
                type: "string",
                required: false,
              },
            ],
            indexes: [],
          },
        ],
        relations: [
          ...graph.domain.relations,
          {
            from: "service",
            to: "appointment",
            kind: "many-to-one",
            field: "appointmentKey",
          },
          {
            from: "service",
            to: "schedule",
            kind: "many-to-one",
            field: "scheduleKey",
          },
          {
            from: "independent-owner",
            to: "independent-target",
            kind: "many-to-one",
            field: "independentTargetKey",
          },
        ],
        seedData: [
          appointment!,
          service!,
          {
            entity: "independent-owner",
            id: "sample-independent-owner",
            values: {},
          },
          {
            entity: "independent-target",
            id: "sample-independent-target",
            values: { name: "Independent target" },
          },
          schedule!,
        ],
      },
    };

    const records = seedRecords(compileSeed(surroundedCycleGraph));
    const serviceRecord = records.find(
      (record) => record.delegate === "service",
    );
    const independentOwner = records.find(
      (record) => record.delegate === "independentOwner",
    );
    expect(serviceRecord?.values.scheduleKey).toBe("sample-schedule");
    expect(independentOwner?.values.independentTargetKey).toBe(
      "sample-independent-target",
    );
    expect(
      records.findIndex((record) => record.delegate === "schedule"),
    ).toBeLessThan(
      records.findIndex((record) => record.delegate === "service"),
    );
    expect(
      records.findIndex((record) => record.delegate === "independentTarget"),
    ).toBeLessThan(
      records.findIndex((record) => record.delegate === "independentOwner"),
    );
  });

  it("breaks a mixed cycle only at its optional edge", async () => {
    const graph = await composedAppointmentGraph();
    const appointment = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "appointment",
    );
    const service = (graph.domain.seedData ?? []).find(
      (seed) => seed.entity === "service",
    );
    expect(appointment).toBeDefined();
    expect(service).toBeDefined();
    const mixedCycleGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "service"
            ? {
                ...entity,
                fields: [
                  ...entity.fields,
                  { key: "appointmentKey", type: "string", required: false },
                ],
              }
            : entity,
        ),
        relations: [
          ...graph.domain.relations,
          {
            from: "service",
            to: "appointment",
            kind: "many-to-one",
            field: "appointmentKey",
          },
        ],
        seedData: [
          appointment!,
          service!,
          ...(graph.domain.seedData ?? []).filter(
            (seed) => seed !== appointment && seed !== service,
          ),
        ],
      },
    };

    const records = seedRecords(compileSeed(mixedCycleGraph));
    const appointmentIndex = records.findIndex(
      (record) => record.delegate === "appointment",
    );
    const serviceIndex = records.findIndex(
      (record) => record.delegate === "service",
    );
    expect(serviceIndex).toBeLessThan(appointmentIndex);
    expect(records[serviceIndex]!.values.appointmentKey).toBeUndefined();
    expect(records[appointmentIndex]!.values.serviceKey).toBe("sample-service");
  });

  it("rejects a required synthesized self-reference with the fixed safe error", async () => {
    const graph = await composedAppointmentGraph();
    const requiredSelfGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "appointment"
            ? {
                ...entity,
                fields: [
                  ...entity.fields,
                  {
                    key: "parentAppointmentKey",
                    type: "string",
                    required: true,
                  },
                ],
              }
            : entity,
        ),
        relations: [
          ...graph.domain.relations,
          {
            from: "appointment",
            to: "appointment",
            kind: "many-to-one",
            field: "parentAppointmentKey",
          },
        ],
      },
    };

    expect(() => compileSeed(requiredSelfGraph)).toThrow(
      "Seed generation contains an unsatisfiable required dependency cycle.",
    );
  });

  it("rejects required seeded dependency cycles with one fixed safe error", async () => {
    const graph = await composedAppointmentGraph();
    const cyclicGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "service"
            ? {
                ...entity,
                fields: [
                  ...entity.fields,
                  { key: "appointmentKey", type: "string", required: true },
                ],
              }
            : entity,
        ),
        relations: [
          ...graph.domain.relations,
          {
            from: "service",
            to: "appointment",
            kind: "many-to-one",
            field: "appointmentKey",
          },
        ],
      },
    };

    expect(() => compileSeed(cyclicGraph)).toThrow(
      "Seed generation contains an unsatisfiable required dependency cycle.",
    );
    try {
      compileSeed(cyclicGraph);
    } catch (error) {
      expect((error as Error).message).toBe(
        "Seed generation contains an unsatisfiable required dependency cycle.",
      );
      expect((error as Error).message).not.toMatch(/appointment|service/i);
    }
  });

  it("renders field-distinguished names for repeated endpoint relations", async () => {
    const graph = await composedAppointmentGraph({
      duplicateServiceReference: true,
    });
    expect(
      graph.domain.relations
        .filter(
          (relation) =>
            relation.from === "appointment" && relation.to === "service",
        )
        .map((relation) => relation.field),
    ).toEqual(["serviceKey", "secondaryServiceKey"]);

    const files = compileDatabase(graph);
    const schema = files.get("database/prisma/schema.prisma");
    const migration = files.get(
      "database/prisma/migrations/0001_initial/migration.sql",
    );
    expect(schema, "missing database/prisma/schema.prisma").toBeDefined();
    expect(
      migration,
      "missing database/prisma/migrations/0001_initial/migration.sql",
    ).toBeDefined();
    expect(schema).toContain(
      'appointmentsByServiceKey Appointment[] @relation("AppointmentToServiceByServiceKey")',
    );
    expect(schema).toContain(
      'appointmentsBySecondaryServiceKey Appointment[] @relation("AppointmentToServiceBySecondaryServiceKey")',
    );
    expect(schema).toContain(
      'serviceByServiceKey Service @relation("AppointmentToServiceByServiceKey", fields: [serviceKey], references: [id])',
    );
    expect(schema).toContain(
      'serviceBySecondaryServiceKey Service @relation("AppointmentToServiceBySecondaryServiceKey", fields: [secondaryServiceKey], references: [id])',
    );
    expect(migration).toContain(
      'CONSTRAINT "ServiceToAppointmentByServiceKey_fkey" FOREIGN KEY ("serviceKey")',
    );
    expect(migration).toContain(
      'CONSTRAINT "ServiceToAppointmentBySecondaryServiceKey_fkey" FOREIGN KEY ("secondaryServiceKey")',
    );
  });

  it("preserves exact database bytes for a singleton endpoint pair", async () => {
    const graph = await composedAppointmentGraph();
    const files = compileDatabase(graph);
    const schema = files.get("database/prisma/schema.prisma");
    const migration = files.get(
      "database/prisma/migrations/0001_initial/migration.sql",
    );
    expect(schema, "missing database/prisma/schema.prisma").toBeDefined();
    expect(
      migration,
      "missing database/prisma/migrations/0001_initial/migration.sql",
    ).toBeDefined();
    expect(schema).toContain(
      'appointments Appointment[] @relation("AppointmentToService")',
    );
    expect(schema).toContain(
      'service Service @relation("AppointmentToService", fields: [serviceKey], references: [id])',
    );
    expect(migration).toContain(
      'CONSTRAINT "ServiceToAppointment_fkey" FOREIGN KEY ("serviceKey")',
    );
    expect(sha256Digest(schema!)).toBe(
      "2f1d2477f149ab8fa6942440d937c0e531c79636eeb064a008faa2611710d43e",
    );
    expect(sha256Digest(migration!)).toBe(
      "c09feaa7fcfb0d4f6b51fe31c8fa6f266cec2f06bc67503fbd5ce57adfecde33",
    );
  });

  it("allocates duplicate relation object fields around valid declared fields", async () => {
    const graph = await composedAppointmentGraph({
      duplicateServiceReference: true,
      relationFieldCollision: true,
    });
    const schema = compileDatabase(graph).get("database/prisma/schema.prisma");
    expect(schema, "missing database/prisma/schema.prisma").toBeDefined();

    for (const modelName of ["Appointment", "Service"]) {
      const model = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`).exec(
        schema!,
      );
      expect(model, `missing model ${modelName}`).not.toBeNull();
      const fieldNames = [...model![0].matchAll(/^  ([A-Za-z]\w*)\b/gm)].map(
        (match) => match[1],
      );
      expect(
        new Set(fieldNames).size,
        `${modelName} contains duplicate declared/generated fields`,
      ).toBe(fieldNames.length);
    }
  });

  it("bounds field-distinguished SQL constraints to PostgreSQL identifiers", async () => {
    const graph = await composedAppointmentGraph({
      duplicateServiceReference: true,
      longServiceReferences: true,
    });
    const migration = compileDatabase(graph).get(
      "database/prisma/migrations/0001_initial/migration.sql",
    );
    expect(
      migration,
      "missing database/prisma/migrations/0001_initial/migration.sql",
    ).toBeDefined();
    const constraints = [
      ...migration!.matchAll(
        /ADD CONSTRAINT "([^"]+)" FOREIGN KEY \("preferredServiceRelationshipIdentifier(?:Alpha|Beta)Key"\)/g,
      ),
    ].map((match) => match[1]!);
    expect(constraints).toHaveLength(2);
    expect(new Set(constraints).size).toBe(2);
    expect(
      constraints.every((name) => Buffer.byteLength(name, "utf8") <= 63),
    ).toBe(true);
  });

  it("fails closed when a required foreign key has no seeded target", async () => {
    const graph = await composedAppointmentGraph();
    const withoutServiceSeed: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        seedData: (graph.domain.seedData ?? []).filter(
          (seed) => seed.entity !== "service",
        ),
      },
    };
    expect(() => compileSeed(withoutServiceSeed)).toThrow(
      /required foreign key/,
    );
  });

  it("leaves non-required foreign keys unbound when the target is not seeded", async () => {
    // An optional reference must not fail the compile: the generated schema
    // accepts null, and the seed remains migratable without a binding.
    const graph = await composedAppointmentGraph();
    const withoutServiceSeed: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === "appointment"
            ? {
                ...entity,
                fields: entity.fields.map((field) =>
                  field.key === "serviceKey"
                    ? { ...field, required: false }
                    : field,
                ),
              }
            : entity,
        ),
        seedData: (graph.domain.seedData ?? []).filter(
          (seed) => seed.entity !== "service",
        ),
      },
    };
    const records = seedRecords(compileSeed(withoutServiceSeed));
    const appointment = records.find(
      (record) => record.delegate === "appointment",
    );
    expect(appointment!.values.serviceKey).toBeUndefined();
  });
});

describe("database target fail-closed validation", () => {
  const completeSet = (): readonly GeneratedFile[] => [
    {
      path: "database/prisma/schema.prisma",
      content: 'generator client {\n  provider = "prisma-client-js"\n}\n',
    },
    {
      path: "api/prisma/schema.prisma",
      content: 'generator client {\n  provider = "prisma-client-js"\n}\n',
    },
    {
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content:
        'CREATE TABLE "Sample" (\n  "id" TEXT NOT NULL PRIMARY KEY\n);\n',
    },
    {
      path: "database/prisma/seed.ts",
      content: 'import { PrismaClient } from "@prisma/client";\n',
    },
  ];

  it("accepts the complete database set", () => {
    expect(databaseTargetPlugin.validate(completeSet())).toEqual({ ok: true });
  });

  it("rejects a set missing a declared database file", () => {
    const result = databaseTargetPlugin.validate(completeSet().slice(1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "database/prisma/schema.prisma",
          code: "missing.database-file",
        }),
      );
    }
  });

  it("rejects an undeclared database file", () => {
    const result = databaseTargetPlugin.validate([
      ...completeSet(),
      { path: "database/prisma/unexpected.prisma", content: "x" },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "database/prisma/unexpected.prisma",
          code: "unexpected.database-file",
        }),
      );
    }
  });

  it.each([
    {
      label: "a schema without a generator client",
      path: "database/prisma/schema.prisma",
      content: "model Sample { id String @id }",
    },
    {
      label: "a migration without a CREATE TABLE",
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content: "-- empty migration\n",
    },
    {
      label: "a seed without a prisma import",
      path: "database/prisma/seed.ts",
      content: "export const seed = [];\n",
    },
  ])("rejects $label", ({ path, content }) => {
    const files = completeSet();
    const index = files.findIndex((file) => file.path === path);
    files[index] = { path, content };

    const result = databaseTargetPlugin.validate(files);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path,
          code: "malformed.database-file",
        }),
      );
    }
  });

  it("rejects a registry run whose validation fails", () => {
    const registry = createCompilerTargetRegistryV1();
    const failing = {
      ...databaseTargetPlugin,
      render: () => completeSet().slice(1),
    };

    registry.register(failing);
    expect(() =>
      registry.run(
        "prisma-postgres",
        buildCompilationInput(compileFor("simple-ecommerce")),
      ),
    ).toThrow("validation failed");
  });
});

describe("database target assembled storage namespace validation", () => {
  const input = buildCompilationInput(compileFor("expense-approval"));

  it("rejects a duplicate assembled Prisma model with a fixed safe error", () => {
    const plan = databaseTargetPlugin.plan(input);
    const render = () =>
      databaseTargetPlugin.render({
        ...plan,
        additionalSchemaFragments: [
          ...plan.additionalSchemaFragments,
          "model Factory_AuditEvent {\n  id String @id\n}",
        ],
      });

    expect(render).toThrow("Generated database storage validation failed.");
    try {
      render();
    } catch (error) {
      expect((error as Error).message).toBe(
        "Generated database storage validation failed.",
      );
      expect((error as Error).message).not.toContain("AuditEvent");
    }
  });

  it("rejects a duplicate assembled SQL table with the same fixed safe error", () => {
    const plan = databaseTargetPlugin.plan(input);
    const render = () =>
      databaseTargetPlugin.render({
        ...plan,
        additionalMigrationFragments: [
          ...plan.additionalMigrationFragments,
          'CREATE TABLE "Factory_AuditEvent" (\n  "id" TEXT NOT NULL PRIMARY KEY\n);',
        ],
      });

    expect(render).toThrow("Generated database storage validation failed.");
    try {
      render();
    } catch (error) {
      expect((error as Error).message).toBe(
        "Generated database storage validation failed.",
      );
      expect((error as Error).message).not.toContain("AuditEvent");
    }
  });

  it("rejects a duplicate assembled SQL index with the same fixed safe error", () => {
    const plan = databaseTargetPlugin.plan(input);
    const render = () =>
      databaseTargetPlugin.render({
        ...plan,
        additionalMigrationFragments: [
          ...plan.additionalMigrationFragments,
          'CREATE INDEX "Factory_AuditEvent_entity_recordId_idx" ON "Factory_AuditEvent" ("actor");',
        ],
      });

    expect(render).toThrow("Generated database storage validation failed.");
  });

  it("rejects duplicate SQL constraints on one assembled table with the same fixed safe error", () => {
    const plan = databaseTargetPlugin.plan(input);
    const render = () =>
      databaseTargetPlugin.render({
        ...plan,
        additionalMigrationFragments: [
          ...plan.additionalMigrationFragments,
          'ALTER TABLE "Factory_AuditEvent" ADD CONSTRAINT "Factory_AuditEvent_actor_key" UNIQUE ("actor");\nALTER TABLE "Factory_AuditEvent" ADD CONSTRAINT "Factory_AuditEvent_actor_key" UNIQUE ("actor", "action");',
        ],
      });

    expect(render).toThrow("Generated database storage validation failed.");
  });
});

describe("database target renders Prisma-valid optional native-typed fields", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(databaseTargetPlugin);

  const fixtureInterpreter = new FixtureRequirementInterpreter();
  const expenseBrief =
    "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";

  async function composedExpenseGraph(): Promise<ApplicationGraphV1> {
    const interpretation = await fixtureInterpreter.interpret({
      brief: expenseBrief,
    });
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: interpretation.spec.requirementId,
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    return assertValidApplicationGraph(
      applyGraphDiffToDraft(baseDraft, diff).graph,
    );
  }

  it("attaches optionality to the type before the native annotation", async () => {
    // The real model marks the expense `date` field as non-required; the
    // database target must render `DateTime? @db.Date`, never
    // `DateTime @db.Date?` (the latter fails `prisma generate` with P1012, so
    // the isolated preview can never boot).
    const graph = await composedExpenseGraph();
    const optionalDateGraph: ApplicationGraphV1 = {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) => ({
          ...entity,
          fields: entity.fields.map((field) =>
            field.type === "date" ? { ...field, required: false } : field,
          ),
        })),
      },
    };
    const files = registry.run(
      "prisma-postgres",
      buildCompilationInput({
        publishedRevisionId: `published-${graph.metadata.id}`,
        graph: optionalDateGraph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(optionalDateGraph),
          selections: graph.integration.compositionSelections ?? [],
        }),
      }),
    );
    const schema = files.find(
      (file) => file.path === "api/prisma/schema.prisma",
    );
    expect(schema, "missing api/prisma/schema.prisma").toBeDefined();
    expect(schema!.content).toContain("  date DateTime? @db.Date");
    // A malformed trailing `?` anywhere in the schema is a fail-closed guard:
    // every native-typed optional field must attach the marker to the type.
    expect(schema!.content).not.toContain("@db.Date?");
  });
});

describe("database target handles factory base fields", () => {
  // Real-model acceptance crash (2026-08-08, verify-716fe221): the interpreted
  // Expense entity declared `createdAt DateTime?`, and the renderer
  // unconditionally injected a second `createdAt DateTime @default(now())`.
  // The duplicate field fails `prisma generate` with P1012 inside the preview
  // image build, so the isolated environment never boots and every probe is
  // skipped. The entity's declaration is the contract (the generated runtime
  // and seed read the entity-declared field), so the injected base field must
  // be skipped when the model renders a field of that name from any source.
  type FieldType =
    ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"];

  const registry = createCompilerTargetRegistryV1();
  registry.register(databaseTargetPlugin);

  const fixtureInterpreter = new FixtureRequirementInterpreter();
  const expenseBrief =
    "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";

  async function composedExpenseGraph(): Promise<ApplicationGraphV1> {
    const interpretation = await fixtureInterpreter.interpret({
      brief: expenseBrief,
    });
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: interpretation.spec.requirementId,
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    return assertValidApplicationGraph(
      applyGraphDiffToDraft(baseDraft, diff).graph,
    );
  }

  function withEntityField(
    graph: ApplicationGraphV1,
    entityKey: string,
    field: {
      readonly key: string;
      readonly type: FieldType;
      readonly required: boolean;
    },
  ): ApplicationGraphV1 {
    return {
      ...graph,
      domain: {
        ...graph.domain,
        entities: graph.domain.entities.map((entity) =>
          entity.key === entityKey
            ? {
                ...entity,
                fields: [
                  ...entity.fields.filter(
                    (declared) => declared.key !== field.key,
                  ),
                  field,
                ],
              }
            : entity,
        ),
      },
    };
  }

  function renderDatabase(graph: ApplicationGraphV1): {
    readonly schema: string;
    readonly migration: string;
  } {
    const files = registry.run(
      "prisma-postgres",
      buildCompilationInput({
        publishedRevisionId: `published-${graph.metadata.id}`,
        graph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: graph.integration.compositionSelections ?? [],
        }),
      }),
    );
    const schema = files.find(
      (file) => file.path === "database/prisma/schema.prisma",
    );
    const migration = files.find(
      (file) =>
        file.path === "database/prisma/migrations/0001_initial/migration.sql",
    );
    expect(schema, "missing database/prisma/schema.prisma").toBeDefined();
    expect(
      migration,
      "missing database/prisma/migrations/0001_initial/migration.sql",
    ).toBeDefined();
    return { schema: schema!.content, migration: migration!.content };
  }

  function modelBlock(schema: string, modelName: string): string {
    const match = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`).exec(
      schema,
    );
    expect(match, `missing model ${modelName}`).not.toBeNull();
    return match![0];
  }

  function fieldKeys(model: string): readonly string[] {
    return [...model.matchAll(/^  ([A-Za-z]\w*)\b/gm)].map((match) => match[1]);
  }

  function fieldLines(model: string): readonly string[] {
    return [...model.matchAll(/^  ([A-Za-z]\w* .*)$/gm)].map(
      (match) => match[1],
    );
  }

  function tableBlock(migration: string, tableName: string): string {
    const match = new RegExp(
      `CREATE TABLE "?${tableName}"? \\(\\n[\\s\\S]*?\\n\\);`,
    ).exec(migration);
    expect(match, `missing table ${tableName}`).not.toBeNull();
    return match![0];
  }

  function migrationColumns(
    table: string,
    columnName: string,
  ): readonly string[] {
    // Column lines carry a structural trailing comma unless they close the
    // CREATE TABLE list; strip it so the assertion pins the column itself.
    return [
      ...table.matchAll(new RegExp(`^\\s*"${columnName}"[^\\n]*$`, "gm")),
    ].map((match) => match[0].trim().replace(/,$/, ""));
  }

  it("keeps a single createdAt with the entity's nullability when the entity declares one", async () => {
    const graph = await composedExpenseGraph();
    const withCreatedAt = withEntityField(graph, "expense", {
      key: "createdAt",
      type: "datetime",
      required: false,
    });
    const { schema, migration } = renderDatabase(withCreatedAt);
    const expenseModel = modelBlock(schema, "Expense");
    expect(
      fieldKeys(expenseModel).filter((key) => key === "createdAt"),
    ).toHaveLength(1);
    expect(
      fieldLines(expenseModel).filter((line) => line.startsWith("createdAt")),
    ).toEqual(["createdAt DateTime?"]);
    expect(
      migrationColumns(tableBlock(migration, "Expense"), "createdAt"),
    ).toEqual(['"createdAt" TIMESTAMP(3)']);
  });

  it("keeps a single updatedAt with the entity's requiredness when the entity declares one", async () => {
    const graph = await composedExpenseGraph();
    const withUpdatedAt = withEntityField(graph, "expense", {
      key: "updatedAt",
      type: "datetime",
      required: true,
    });
    const { schema, migration } = renderDatabase(withUpdatedAt);
    const expenseModel = modelBlock(schema, "Expense");
    expect(
      fieldKeys(expenseModel).filter((key) => key === "updatedAt"),
    ).toHaveLength(1);
    expect(
      fieldLines(expenseModel).filter((line) => line.startsWith("updatedAt")),
    ).toEqual(["updatedAt DateTime"]);
    expect(
      migrationColumns(tableBlock(migration, "Expense"), "updatedAt"),
    ).toEqual(['"updatedAt" TIMESTAMP(3) NOT NULL']);
  });

  it("fails closed when an entity declares the factory-reserved id", async () => {
    const graph = await composedExpenseGraph();
    const withId = withEntityField(graph, "expense", {
      key: "id",
      type: "string",
      required: true,
    });

    expect(() => renderDatabase(withId)).toThrow(GraphSemanticError);
  });

  it("never renders duplicate valid system-time declarations in any model", async () => {
    const graph = ["createdAt", "updatedAt"].reduce(
      (current, key) =>
        withEntityField(current, "expense", {
          key,
          type: "datetime",
          required: false,
        }),
      await composedExpenseGraph(),
    );
    const { schema } = renderDatabase(graph);
    for (const model of schema.matchAll(/model [A-Za-z]+ \{\n[\s\S]*?\n\}/g)) {
      const keys = fieldKeys(model[0]);
      const duplicates = keys.filter(
        (key, index) => keys.indexOf(key) !== index,
      );
      expect(
        duplicates,
        `duplicate fields in ${model[0].split("\n")[0]}`,
      ).toEqual([]);
    }
  });
});
