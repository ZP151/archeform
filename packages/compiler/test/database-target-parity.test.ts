import { describe, expect, it } from "vitest";

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
  assertValidApplicationGraph,
  createBlankApplicationDraft,
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
 * Frozen legacy database digests captured from generateApplicationBundle on
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
 */
const LEGACY_DIGESTS: Readonly<
  Record<FactoryProfile, Readonly<Record<string, string>>>
> = {
  "expense-approval": {
    "database/prisma/schema.prisma":
      "3ffa052a9b59176e3ef371f8a3851cf323f2d30edf3129634838cdcc7c3fdcd4",
    "api/prisma/schema.prisma":
      "3ffa052a9b59176e3ef371f8a3851cf323f2d30edf3129634838cdcc7c3fdcd4",
    "database/prisma/migrations/0001_initial/migration.sql":
      "2229af3704a3b919ad43b98472198a197f4da191118e4f441088fa6390fa04a8",
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
      "3af9642ea2c1d1a7fb4578207e5f2a142b6e9bcaeef1833a1e6abe094d8db2aa",
    "api/prisma/schema.prisma":
      "3af9642ea2c1d1a7fb4578207e5f2a142b6e9bcaeef1833a1e6abe094d8db2aa",
    "database/prisma/migrations/0001_initial/migration.sql":
      "a48099178008987193918786c37da5f9c61a2d2ffddb8f6928ea879bbd0a15d4",
    "database/prisma/seed.ts":
      "9fd87df5204d70cacd85b257587702831e3380ca923fd7f5e6650469d9d53361",
  },
  "retail-counter": {
    "database/prisma/schema.prisma":
      "660318f1b2d50f158f8b1686175b81d4a5cc166f4cd8970455233ff78fc09dbb",
    "api/prisma/schema.prisma":
      "660318f1b2d50f158f8b1686175b81d4a5cc166f4cd8970455233ff78fc09dbb",
    "database/prisma/migrations/0001_initial/migration.sql":
      "5688a40eadaf88643fdc6dda2d3a4a145a9d463ad20671612a85c1655cfa16b1",
    "database/prisma/seed.ts":
      "025f39a13cfcd66500188e933b4a895aa417a07a0a5308567e25a6ad9d960724",
  },
  "grocery-pickup": {
    "database/prisma/schema.prisma":
      "22fd2bf17fbfc0c3467f35c356743707c6229985765c40f748d18346452c7940",
    "api/prisma/schema.prisma":
      "22fd2bf17fbfc0c3467f35c356743707c6229985765c40f748d18346452c7940",
    "database/prisma/migrations/0001_initial/migration.sql":
      "bf9b57bc1520155249039fc719e8d19f70be545856e456c730fd733b1ae6d9c7",
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
});

describe("seed binds required foreign-key scalars to seeded target records", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(databaseTargetPlugin);

  const fixtureInterpreter = new FixtureRequirementInterpreter();
  const bookingBrief =
    "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";

  async function composedAppointmentGraph(): Promise<ApplicationGraphV1> {
    const interpretation = await fixtureInterpreter.interpret({
      brief: bookingBrief,
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

  function compileSeed(graph: ApplicationGraphV1): string {
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
    expect(seed, "missing database/prisma/seed.ts").toBeDefined();
    return seed!.content;
  }

  function seedRecords(seedContent: string): ReadonlyArray<{
    readonly delegate: string;
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
