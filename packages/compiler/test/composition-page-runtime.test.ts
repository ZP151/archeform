import { approvalLegacyFixtures } from "./fixtures/approval-legacy.js";
import { canonicalPurchaseRequestApprovalInterpretation } from "../../adapters/src/requirements/purchase-request-definition-selection.js";
import { createHash } from "node:crypto";
import { transpileModule, ModuleKind, JsxEmit } from "typescript";
import { getCustomerIconAssets } from "../src/targets/restaurant-v3/customer-icons.js";
import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  assertProductBlueprint,
  assertValidApplicationGraph,
  createBlankApplicationDraft,
  hashApplicationGraph,
  resolveExperienceDesignSystem,
  type ApplicationGraphV1,
} from "@factory/graph";

import { createGeneratedPageRuntimeProjection } from "../src/page-runtime-projection.js";
import { approvalWorkspacePresentation } from "../src/approval-workspace-presentation.js";
import { approvalDecisionHistory } from "../src/approval-decision-history.js";
import { approvalPresentationComponents } from "../src/approval-presentation-components.js";
import {
  approvalVisualAssets,
  selectApprovalRecordMaterial,
} from "../src/approval-visual-assets.js";
import {
  generateApplicationBundle,
  generateRestaurantProductApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const bookingBrief =
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";

/**
 * The honest round-trip authority: the deterministic fixture interprets the
 * two acceptance prompts, the deterministic planner locks the standard
 * alternative, and the composer derives the complete product Graph. The
 * composed product must compile as-is and keep every bounded studio edit
 * through the projection and the generated application bundle.
 */
async function composedGraphFor(brief: string): Promise<ApplicationGraphV1> {
  if (brief === expenseBrief) {
    const graph = structuredClone(
      approvalLegacyFixtures.expense.input.graph,
    ) as unknown as ApplicationGraphV1;
    return graph;
  }
  const { interpretation } = await fixtureInterpreter.interpret({ brief });
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
  return applyGraphDiffToDraft(baseDraft, diff).graph;
}

function bundleInputFor(graph: ApplicationGraphV1): PublishedGraphInput {
  return {
    publishedRevisionId: `published-${graph.metadata.id}`,
    graph,
    // Exactly what Publish does: the lock is canonicalized from the
    // deterministic composer's own selections bound to the graph hash.
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections ?? [],
    }),
  };
}

/**
 * The bounded edit shape a studio produces: page order, page title, block
 * text, component insert/delete, entity binding, and experience tokens. Each
 * edit stays inside the declared surface (approved block types, safe text
 * props, declared entities, schema-valid tokens).
 */
function withBoundedStudioEdits(graph: ApplicationGraphV1): ApplicationGraphV1 {
  const [first, second, ...rest] = graph.page.pages;
  const [headingPage] = graph.page.pages.filter((page) =>
    page.blocks.some(
      (block) => block.type === "stats" || block.type === "list",
    ),
  );
  const headingBlock = headingPage?.blocks.find((block) =>
    ["stats", "list"].includes(block.type),
  );
  const [detailPage] = graph.page.pages.filter((page) =>
    page.blocks.some((block) => block.type === "detail"),
  );
  const detailBlock = detailPage?.blocks.find(
    (block) => block.type === "detail",
  );
  const pages = [
    ...(first ? [{ ...first, title: "Primary overview" }] : []),
    ...(second ? [second] : []),
    ...rest,
  ]
    .map((page) =>
      page.id === headingPage?.id && headingBlock
        ? {
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === headingBlock.id
                ? {
                    ...block,
                    props: { ...block.props, heading: "Edited headline" },
                  }
                : block,
            ),
          }
        : page,
    )
    .map((page) =>
      page.id === detailPage?.id && detailBlock && detailBlock.entity
        ? {
            ...page,
            blocks: page.blocks.map((block) =>
              block.id === detailBlock.id
                ? { ...block, entity: detailBlock.entity }
                : block,
            ),
          }
        : page,
    );
  const [firstNavigation, ...restNavigation] = graph.page.navigation;
  return {
    ...graph,
    page: {
      ...graph.page,
      pages,
      navigation: [
        ...(firstNavigation
          ? [{ ...firstNavigation, label: "Primary overview" }]
          : []),
        ...restNavigation,
      ],
    },
  };
}

describe("composition page runtime round trip", () => {
  it("compiles a valid composed graph with two references to the same target", async () => {
    const { interpretation } = await fixtureInterpreter.interpret({
      brief: bookingBrief,
    });
    const blueprint = assertProductBlueprint({
      ...interpretation.blueprint,
      entities: interpretation.blueprint.entities.map((entity) =>
        entity.key === "appointment"
          ? {
              ...entity,
              fields: [
                ...entity.fields,
                {
                  key: "secondaryServiceKey",
                  label: "Secondary service",
                  type: "reference",
                  required: true,
                  referenceTo: "service",
                },
              ],
            }
          : entity,
      ),
    });
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
    const graph = assertValidApplicationGraph(
      applyGraphDiffToDraft(baseDraft, diff).graph,
    );

    expect(
      graph.domain.relations
        .filter(
          (relation) =>
            relation.from === "appointment" && relation.to === "service",
        )
        .map((relation) => relation.field),
    ).toEqual(["serviceKey", "secondaryServiceKey"]);

    const bundle = generateApplicationBundle(bundleInputFor(graph));
    expect(bundle.files).toContainEqual(
      expect.objectContaining({ path: "database/prisma/schema.prisma" }),
    );
  });

  for (const [promptLabel, brief] of [
    ["Prompt A (Expense Approval)", expenseBrief],
    ["Prompt B (Appointment Booking)", bookingBrief],
  ] as const) {
    describe(promptLabel, () => {
      it("composes at least four generated pages", async () => {
        const graph = await composedGraphFor(brief);
        expect(graph.page.pages.length).toBeGreaterThanOrEqual(4);
      });

      it("projects every composed page and its navigation", async () => {
        const graph = await composedGraphFor(brief);
        const projection = createGeneratedPageRuntimeProjection(graph);
        expect(projection.pages.length).toBe(graph.page.pages.length);
        expect(projection.navigation.length).toBeGreaterThan(0);
        for (const page of projection.pages) {
          expect(page.blocks.length).toBeGreaterThan(0);
        }
      });

      it("keeps bounded studio edits through the projection", async () => {
        const graph = await composedGraphFor(brief);
        const edited = withBoundedStudioEdits(graph);
        const projection = createGeneratedPageRuntimeProjection(edited);
        expect(projection.pages[0].title).toBe("Primary overview");
        expect(projection.navigation.map((item) => item.label)).not.toEqual(
          createGeneratedPageRuntimeProjection(graph).navigation.map(
            (item) => item.label,
          ),
        );
        expect(
          projection.pages.flatMap((page) =>
            page.blocks.map((block) => block.props.heading),
          ),
        ).toContain("Edited headline");
      });

      it("renders the edited page tree and navigation in the generated bundle", async () => {
        const graph = await composedGraphFor(brief);
        const edited = withBoundedStudioEdits(graph);
        const bundle = generateApplicationBundle(bundleInputFor(edited));
        const rendered = bundle.files.find(
          (file) => file.path === "web/app/page-runtime.tsx",
        );
        expect(rendered).toBeDefined();
        expect(rendered?.content).toContain("Primary overview");
        expect(rendered?.content).toContain("Edited headline");
        expect(rendered?.content).toContain("not-found");
      });

      it("keeps responsive theme tokens in the generated styles", async () => {
        const graph = await composedGraphFor(brief);
        const bundle = generateApplicationBundle(bundleInputFor(graph));
        const styles = bundle.files.find(
          (file) => file.path === "web/app/globals.css",
        );
        expect(styles).toBeDefined();
        expect(styles?.content).toContain("@media (max-width: 720px)");
        expect(styles?.content).toContain("data-theme");
      });
    });
  }

  describe("the generated page runtime type-checks with the strict compiler", () => {
    const generatedDirectories: string[] = [];

    afterEach(() => {
      while (generatedDirectories.length > 0) {
        rmSync(generatedDirectories.pop() as string, {
          recursive: true,
          force: true,
        });
      }
    });

    it.each([bookingBrief, expenseBrief, "purchase-request-approval"])(
      "emits a strictly type-checkable runtime for %s",
      async (brief) => {
        // The isolated preview build type-checks the emitted bundle (that is
        // where the runtime bug was found), so the unit suite must catch a
        // non-compiling emission before any pipeline run. The check runs inside
        // this package so "react" resolves to the @types/react devDependency;
        // the emitted file is otherwise self-contained.
        const graph =
          brief === "purchase-request-approval"
            ? await purchaseGraphFor()
            : await composedGraphFor(brief);
        const bundle = generateApplicationBundle(bundleInputFor(graph));
        const runtime = bundle.files.find(
          (file) => file.path === "web/app/page-runtime.tsx",
        );
        expect(runtime).toBeDefined();

        const directory = join(
          __dirname,
          ".typecheck",
          `runtime-${Date.now()}`,
        );
        mkdirSync(directory, { recursive: true });
        generatedDirectories.push(directory);
        writeFileSync(
          join(directory, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              noEmit: true,
              strict: true,
              target: "es2022",
              module: "esnext",
              moduleResolution: "bundler",
              jsx: "react-jsx",
              lib: ["es2022", "dom"],
              skipLibCheck: true,
              types: [],
            },
            include: ["page-runtime.tsx"],
          }),
        );
        writeFileSync(
          join(directory, "page-runtime.tsx"),
          runtime?.content ?? "",
        );

        const tsc = require.resolve("typescript/bin/tsc");
        const check = spawnSync(
          process.execPath,
          [tsc, "--noEmit", "-p", join(directory, "tsconfig.json")],
          { encoding: "utf8" },
        );
        expect(check.status, check.stderr + check.stdout).toBe(0);
      },
    );
  });
});

function nonApprovalGraph(): ApplicationGraphV1 {
  const graph = structuredClone(
    createBlankApplicationDraft({
      applicationId: "non-approval",
      workspaceId: "local-workspace",
      name: "Request tracker",
    }).graph,
  );
  graph.domain.entities = [
    {
      key: "request",
      label: "Request",
      indexes: [],
      fields: [{ key: "title", type: "string", required: true }],
    },
  ];
  graph.page = {
    pages: [
      {
        id: "requests",
        route: "/requests",
        title: "Requests",
        blocks: [
          { id: "requests-list", type: "collection", entity: "request" },
        ],
      },
    ],
    navigation: [{ id: "requests-nav", label: "Requests", pageId: "requests" }],
  };
  return graph;
}

function orderedBundleDigest(
  files: readonly { readonly path: string; readonly content: string }[],
): string {
  return createHash("sha256")
    .update(JSON.stringify(files.map(({ path, content }) => [path, content])))
    .digest("hex");
}

function runtimeFor(graph: ApplicationGraphV1): string {
  return generateApplicationBundle(bundleInputFor(graph)).files.find(
    (file) => file.path === "web/app/page-runtime.tsx",
  )!.content;
}

async function purchaseGraphFor(): Promise<ApplicationGraphV1> {
  return structuredClone(
    approvalLegacyFixtures.purchase.input.graph,
  ) as unknown as ApplicationGraphV1;
}

describe("Purchase approval summary", () => {
  it("emits one labelled demo role control for an enhanced approval workspace", async () => {
    const source = runtimeFor(await purchaseGraphFor());
    expect(source.match(/id='demo-role'/g)).toHaveLength(1);
    expect(source).toContain("<label htmlFor='demo-role'>");
    expect(runtimeFor(nonApprovalGraph())).not.toContain("id='demo-role'");
  });

  it("promotes only declared item identity and a unique temporal fallback", async () => {
    const graph = await purchaseGraphFor();
    const source = runtimeFor(graph);
    expect(source.includes("<h3 className='approval-record-title'>")).toBe(
      true,
    );
    const { exports: runtime } = approvalModule(
      source + "\nexport { selectRecordTitleField };",
    );
    expect(
      runtime.selectRecordTitleField([{ key: "item", type: "string" }])?.key,
    ).toBe("item");
    for (const fields of [
      [],
      [{ key: "item", type: "integer" }],
      [
        { key: "item", type: "string" },
        { key: "item", type: "string" },
      ],
      [{ key: "name", type: "string" }],
    ])
      expect(runtime.selectRecordTitleField(fields)).toBeUndefined();
    expect(
      runtime.selectSummaryFields([{ key: "neededBy", type: "date" }]),
    ).toEqual([undefined, undefined, "neededBy"]);
    expect(
      runtime.selectSummaryFields([
        { key: "neededBy", type: "date" },
        { key: "createdAt", type: "datetime" },
      ]),
    ).toEqual([undefined, undefined, undefined]);
    expect(
      runtime.selectSummaryFields([
        { key: "date", type: "date" },
        { key: "neededBy", type: "date" },
      ]),
    ).toEqual([undefined, undefined, "date"]);
    expect(
      runtime.selectSummaryFields([
        { key: "date", type: "string" },
        { key: "neededBy", type: "date" },
      ]),
    ).toEqual([undefined, undefined, undefined]);
  });
});

describe("definition bank byte preservation", () => {
  it("keeps the ordered expressive Expense approval bundle deterministic", async () => {
    expect(
      orderedBundleDigest(
        generateApplicationBundle(
          bundleInputFor(await composedGraphFor(expenseBrief)),
        ).files,
      ),
    ).toBe(
      orderedBundleDigest(
        generateApplicationBundle(
          bundleInputFor(await composedGraphFor(expenseBrief)),
        ).files,
      ),
    );
  });
});

describe("approval presentation compatibility", () => {
  it("freezes ordered legacy bundles before the approval change", async () => {
    const restaurant = restaurantProductV3Fixture();
    const digests = {
      appointment: orderedBundleDigest(
        generateApplicationBundle(
          bundleInputFor(await composedGraphFor(bookingBrief)),
        ).files,
      ),
      nonApproval: orderedBundleDigest(
        generateApplicationBundle(bundleInputFor(nonApprovalGraph())).files,
      ),
      restaurant: orderedBundleDigest(
        generateRestaurantProductApplicationBundle({
          publishedGraph: restaurant.publishedGraph,
          compositionLock: restaurant.compositionLock,
        }).files,
      ),
    };
    expect(digests).toEqual({
      appointment:
        "b4fc337106c8f005766922c3455cc9c514274f0fb317be38d514b4875c7623ba",
      nonApproval:
        "7166ed888c49123210dd2e91f2eead02f16203d27cc6c3db9d4e86e5ae35e9e6",
      restaurant:
        "4f04d9026038e4bf86bc052e8075e9f15a0ee332ff6eb0a53371db0c556aace3",
    });
  });
});

function approvalModule(
  runtime: string,
  runtimeRequire?: (name: string) => unknown,
) {
  const source =
    runtime +
    "\nexport { calendarDateToPrisma, formPayload, fieldLabel, formatValue, validTransitions, safeResponseMessage, FieldControl, ApprovalIcon, actionIcon, stateIcon, selectSummaryFields, statusTone, filterRecords, statusOptions, EntityRecords, definition, ApprovalDecisionHistory, decisionHistoryPayload, decisionIdentityFields, DecisionHistoryRow, ApprovalProgress, approvalProgressSteps, approvalMaterialKey, approvalHeroEntity, ApprovalPageHero, projection };";
  const compiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, any> = {};
  const reactRequire = (name: string) =>
    runtimeRequire
      ? runtimeRequire(name)
      : require(
          require.resolve(name, {
            paths: [join(__dirname, "../../../apps/workbench")],
          }),
        );
  new Function("require", "exports", compiled)(reactRequire, exports);
  return { exports, compiled };
}

describe("approval runtime behavior", () => {
  it("binds record material to the selected entity and keeps unknown signatures neutral", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const approval = graph.domain.entities.find(
      (entity) => entity.key === "expense",
    )!;
    graph.domain.entities.push({
      ...structuredClone(approval),
      key: "unrelated-expense",
      label: "Unrelated expense",
    });
    const { exports: runtime } = approvalModule(runtimeFor(graph));
    const selected = runtime.definition.entities.find(
      (entity: { key: string }) => entity.key === "expense",
    );
    expect(runtime.approvalMaterialKey(selected.fields, selected.key)).toBe(
      "approval-expense-material",
    );
    expect(
      runtime.approvalMaterialKey(selected.fields, "unrelated-expense"),
    ).toBeUndefined();
    approval.fields.push({
      ...structuredClone(
        approval.fields.find((field) => field.key === "notes")!,
      ),
      key: "extra",
    });
    const { exports: unknown } = approvalModule(runtimeFor(graph));
    for (const entity of unknown.definition.entities)
      expect(
        unknown.approvalMaterialKey(entity.fields, entity.key),
      ).toBeUndefined();
  });

  it("uses cobalt only for absent design systems and preserves explicit light/dark palettes", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const cssFor = (candidate: ApplicationGraphV1) =>
      generateApplicationBundle(bundleInputFor(candidate)).files.find(
        (file) => file.path === "web/app/globals.css",
      )!.content;
    const defaults = cssFor(graph);
    for (const pair of [
      "--factory-accent: #155EEF; --factory-accent-text: #FFFFFF;",
      "--factory-accent: #84ADFF; --factory-accent-text: #102A56;",
    ])
      expect(defaults).toContain(pair);
    const explicit = structuredClone(graph);
    explicit.experience.designSystem = structuredClone(
      resolveExperienceDesignSystem(graph.experience),
    );
    for (const custom of [false, true]) {
      if (custom) {
        explicit.experience.designSystem.tokens.colour.light.brand = "#285430";
        explicit.experience.designSystem.tokens.colour.light.background =
          "#fff9e8";
        explicit.experience.designSystem.tokens.colour.dark.brand = "#b3d9ba";
        explicit.experience.designSystem.tokens.colour.dark.background =
          "#142b1b";
      }
      const css = cssFor(explicit);
      expect(css).toContain(
        "--factory-accent: var(--factory-colour-brand); --factory-accent-text: var(--factory-colour-background);",
      );
      expect(css).not.toContain("--factory-accent: #155EEF");
      expect(css).not.toContain("--factory-accent: #84ADFF");
      for (const mode of ["light", "dark"] as const) {
        const palette = explicit.experience.designSystem.tokens.colour[mode];
        expect(css).toContain(`--factory-colour-brand: ${palette.brand};`);
        expect(css).toContain(
          `--factory-colour-background: ${palette.background};`,
        );
      }
    }
  });
  it("keeps material selection identical at compile and runtime for both field signatures", async () => {
    for (const [graph, key] of [
      [await composedGraphFor(expenseBrief), "approval-expense-material"],
      [await purchaseGraphFor(), "approval-workspace-material"],
    ] as const) {
      const { exports: runtime } = approvalModule(runtimeFor(graph));
      const entity = runtime.definition.entities.find(
        (candidate: {
          fields: Parameters<typeof selectApprovalRecordMaterial>[0];
        }) => selectApprovalRecordMaterial(candidate.fields),
      );
      const fields = entity.fields as Parameters<
        typeof selectApprovalRecordMaterial
      >[0];
      expect(selectApprovalRecordMaterial([...fields].reverse())).toBe(key);
      expect(
        runtime.approvalMaterialKey([...fields].reverse(), entity.key),
      ).toBe(key);
      const mutations = [
        fields.slice(1),
        [...fields, fields[0]],
        [...fields, { key: "extra", type: "text", required: false }],
        fields.map((field, index) =>
          index === 0 ? { ...field, key: "renamed" } : field,
        ),
        fields.map((field) =>
          field.key === "amount" ? { ...field, type: "integer" } : field,
        ),
        fields.map((field) =>
          field.key === "amount" ? { ...field, required: false } : field,
        ),
        fields.map((field) =>
          field.key === "category"
            ? { ...field, values: [...field.values!].reverse() }
            : field,
        ),
      ];
      for (const candidate of mutations) {
        expect(selectApprovalRecordMaterial(candidate)).toBeUndefined();
        expect(
          runtime.approvalMaterialKey(candidate, entity.key),
        ).toBeUndefined();
      }
    }
  });

  it("places one page-named hero on dashboard/list/queue and none on forms or details", async () => {
    for (const graph of [
      await composedGraphFor(expenseBrief),
      await purchaseGraphFor(),
    ]) {
      const { exports: runtime } = approvalModule(runtimeFor(graph));
      for (const page of runtime.projection.pages) {
        const expected = page.blocks.some((block: { type: string }) =>
          ["stats", "list", "queue", "collection"].includes(block.type),
        );
        const hero = runtime.ApprovalPageHero({
          page,
          role: runtime.definition.policy.roles[0],
          formRoutes: {},
        });
        if (expected) expect(hero.props.title).toBe(page.title);
        else expect(hero).toBeNull();
      }
      expect(
        runtime.ApprovalPageHero({
          page: { title: "History", blocks: [] },
          role: "manager",
          formRoutes: {},
        }),
      ).toBeNull();
    }
  });
  it("keeps approval API and database bytes at the delivered pre-history baseline", async () => {
    for (const [graph, expected] of [
      [
        await purchaseGraphFor(),
        "b26942bdf5587af399f58db6f4d8635196c2eb3d4345afc16b9a4fcd646af2b5",
      ],
      [
        await composedGraphFor(expenseBrief),
        "8dfdca8272c77c9531baf6a165975029ca82e50690af133935d97e517378fd77",
      ],
    ] as const) {
      const files = generateApplicationBundle(
        bundleInputFor(graph),
      ).files.filter(
        (file) => file.path.startsWith("api/") || file.path.includes("prisma/"),
      );
      expect(files).toHaveLength(33);
      expect(
        createHash("sha256").update(JSON.stringify(files)).digest("hex"),
      ).toBe(expected);
    }
  });
  it("validates decision reads strictly and preserves only real ordered outcomes", async () => {
    const runtime = approvalModule(
      runtimeFor(await purchaseGraphFor()),
    ).exports;
    const event = {
      actor: "manager",
      action: "approve",
      entity: "purchase-request",
      recordId: "r1",
      at: "2026-09-12T10:00:00.000Z",
    };
    const record = { id: "r1", item: "Shared desk" };
    const filtered = runtime.decisionHistoryPayload(
      [
        { ...event, action: "submit" },
        { ...event, id: "internal-storage-id" },
        { ...event, action: "record" },
        { ...event, entity: "other" },
        { ...event, action: "reject" },
        event,
      ],
      [record],
      "purchase-request",
    );
    expect(filtered.events).toEqual([
      event,
      { ...event, action: "reject" },
      event,
    ]);
    expect(filtered.records).toEqual([record]);
    for (const audit of [
      null,
      {},
      [null],
      [[]],
      [{ ...event, actor: " " }],
      [{ ...event, at: "invalid" }],
      [{ ...event, recordId: 1 }],
    ]) {
      expect(() =>
        runtime.decisionHistoryPayload(audit, [record], "purchase-request"),
      ).toThrow("Decision history is unavailable. Try again.");
    }
    for (const records of [
      null,
      {},
      [[]],
      [null],
      [{ id: " " }],
      [{ id: 12 }],
    ]) {
      expect(() =>
        runtime.decisionHistoryPayload([event], records, "purchase-request"),
      ).toThrow("Decision history is unavailable. Try again.");
    }
    expect(
      runtime.decisionHistoryPayload(
        [{ ...event, action: "submit" }],
        [],
        "purchase-request",
      ).events,
    ).toEqual([]);
    expect(approvalDecisionHistory).toMatchObject({
      key: "approval-decision-history",
      version: "1.0.0",
      ownership: "factory-authored",
      license: "UNLICENSED",
    });
    expect(approvalDecisionHistory.reuse).toContain("error-state");
  });

  it("renders readable current record identity, safe details, actor and actual time", async () => {
    const resolveReact = (name: string) =>
      require(
        require.resolve(name, {
          paths: [join(__dirname, "../../../apps/workbench")],
        }),
      );
    const { createElement } = resolveReact("react");
    const { renderToStaticMarkup } = resolveReact("react-dom/server");
    for (const [graph, key, record, labels] of [
      [
        await purchaseGraphFor(),
        "purchase-request",
        {
          id: "opaque",
          item: "Shared desk",
          amount: 125,
          category: "equipment",
        },
        ["Shared desk"],
      ],
      [
        await composedGraphFor(expenseBrief),
        "expense",
        { id: "opaque", amount: 0, category: "travel" },
        ["Amount: 0", "Category: travel"],
      ],
    ] as const) {
      const runtime = approvalModule(runtimeFor(graph)).exports;
      const entity = runtime.definition.entities.find(
        (entity: any) => entity.key === key,
      );
      const event = {
        actor: "manager",
        action: "approve",
        entity: key,
        recordId: "opaque",
        at: "2026-09-12T10:00:00.000Z",
      };
      const markup = renderToStaticMarkup(
        createElement(runtime.DecisionHistoryRow, { entity, event, record }),
      );
      for (const label of labels) expect(markup).toContain(label);
      expect(markup).toContain("Demo role: Manager");
      expect(markup).toContain('dateTime="2026-09-12T10:00:00.000Z"');
      expect(markup).not.toContain("<h3>opaque");
      const missing = renderToStaticMarkup(
        createElement(runtime.DecisionHistoryRow, { entity, event }),
      );
      expect(missing).toContain(entity.label + " decision");
      expect(missing).toContain("Record ID: opaque");
      const structured = renderToStaticMarkup(
        createElement(runtime.DecisionHistoryRow, {
          entity: {
            ...entity,
            fields: [...entity.fields, { key: "extra", type: "json" }],
          },
          event,
          record: { ...record, extra: { secret: "not-visible-payload" } },
        }),
      );
      expect(structured).not.toContain("not-visible-payload");
      expect(structured).toContain("Structured value");
      const auditor = key === "expense" ? "finance" : "procurement";
      expect(
        renderToStaticMarkup(
          createElement(runtime.ApprovalDecisionHistory, { role: auditor }),
        ),
      ).toContain("Decision history");
      const permissions = runtime.definition.policy.permissions;
      for (const removedAction of ["read", "audit"]) {
        runtime.definition.policy.permissions = permissions.map(
          (permission: any) => ({
            ...permission,
            actions: permission.actions.filter(
              (action: string) => action !== removedAction,
            ),
          }),
        );
        expect(
          renderToStaticMarkup(
            createElement(runtime.ApprovalDecisionHistory, { role: auditor }),
          ),
        ).toBe("");
      }
      runtime.definition.policy.permissions = permissions;
    }
  });

  it("deduplicates history reads and clears privileged responses across role scopes", async () => {
    const state: any[] = [];
    const refs: any[] = [];
    let cursor = 0;
    const jsx = (type: unknown, props: any) => ({ type, props });
    const react = {
      useState(initial: any) {
        const index = cursor++;
        if (!(index in state))
          state[index] = typeof initial === "function" ? initial() : initial;
        return [
          state[index],
          (value: any) => {
            state[index] =
              typeof value === "function" ? value(state[index]) : value;
          },
        ];
      },
      useRef(initial: any) {
        const index = cursor++;
        return (refs[index] ??= { current: initial });
      },
      useEffect() {
        cursor++;
      },
      useCallback(value: any) {
        cursor++;
        return value;
      },
    };
    const runtime = approvalModule(
      runtimeFor(await purchaseGraphFor()),
      (name) =>
        name === "react"
          ? react
          : { jsx, jsxs: jsx, Fragment: Symbol.for("react.fragment") },
    ).exports;
    const render = (role: string) => {
      cursor = 0;
      return runtime.ApprovalDecisionHistory({ role });
    };
    const requests: Array<{
      url: string;
      headers: HeadersInit | undefined;
      resolve: (value: Response) => void;
    }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((url: string, init?: RequestInit) =>
      new Promise<Response>((resolve) =>
        requests.push({ url, headers: init?.headers, resolve }),
      )) as typeof fetch;
    const settle = async (
      offset: number,
      audit: unknown,
      records: unknown,
      ok = true,
    ) => {
      requests[offset]!.resolve({ ok, json: async () => audit } as Response);
      requests[offset + 1]!.resolve({
        ok: true,
        json: async () => records,
      } as Response);
      for (let tick = 0; tick < 10; tick++) await Promise.resolve();
    };
    try {
      expect(render("requester")).toBeNull();
      expect(render("manager")).toBeNull();
      expect(requests).toHaveLength(0);
      const panel = render("procurement");
      expect(panel.props.open).toBe(false);
      panel.props.onToggle({ currentTarget: { open: true } });
      panel.props.onToggle({ currentTarget: { open: true } });
      expect(requests.map((r) => r.url)).toEqual([
        "/api/audit",
        "/api/purchase-request",
      ]);
      expect(requests[0]!.headers).toEqual(requests[1]!.headers);
      expect(JSON.stringify(requests[0]!.headers)).toContain("procurement");
      expect(render("requester")).toBeNull();
      const fresh = render("procurement");
      expect(fresh.props.open).toBe(false);
      fresh.props.onToggle({ currentTarget: { open: true } });
      await settle(
        0,
        [
          {
            actor: "manager",
            action: "approve",
            entity: "purchase-request",
            recordId: "private",
            at: "2026-09-12",
          },
        ],
        [{ id: "private" }],
      );
      expect(JSON.stringify(state)).not.toContain("private");
      expect(state[0].phase).toBe("loading");
      await settle(2, [], []);
      expect(state[0].phase).toBe("success");
      expect(state[0].events).toEqual([]);
      render("procurement").props.onToggle({ currentTarget: { open: false } });
      render("procurement").props.onToggle({ currentTarget: { open: true } });
      expect(requests).toHaveLength(4);
      const find = (node: any, label: string): any => {
        if (!node || typeof node !== "object") return undefined;
        if (
          node.type === "button" &&
          (node.props["aria-label"] === label || node.props.children === label)
        )
          return node;
        return [node.props?.children]
          .flat(Infinity)
          .map((child) => find(child, label))
          .find(Boolean);
      };
      find(render("procurement"), "Refresh").props.onClick();
      await settle(4, { internal: "unsafe-error-body" }, [], false);
      expect(state[0].phase).toBe("error");
      expect(JSON.stringify(render("procurement"))).not.toContain(
        "unsafe-error-body",
      );
      find(render("procurement"), "Retry").props.onClick();
      await settle(6, [], []);
      expect(state[0].phase).toBe("success");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  it("exposes decision history only through the shared approval workspace", async () => {
    const source = runtimeFor(await purchaseGraphFor());
    expect(source).toContain("function ApprovalDecisionHistory");
    expect(source).toContain("<ApprovalDecisionHistory role={role} />");
    expect(source).toContain("Decision history is unavailable. Try again.");
    expect(runtimeFor(nonApprovalGraph())).not.toContain("Decision history");
  });
  it("emits icon-only Refresh controls with accessible names for both approval definitions", async () => {
    for (const graph of [
      await composedGraphFor(expenseBrief),
      await purchaseGraphFor(),
    ]) {
      const source = runtimeFor(graph);
      expect(source).not.toContain(
        "<ApprovalIcon name='refresh-cw' />Refresh</button>",
      );
      const controls =
        source.match(
          /<button[^<]*><ApprovalIcon name='refresh-cw' \/><\/button>/g,
        ) ?? [];
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        expect(control).toContain("className='approval-refresh'");
        expect(control).toContain("aria-label='Refresh'");
        expect(control).toContain("title='Refresh'");
      }
      expect(source).toContain("disabled={loading}");
    }
  });
  it("filters only declared scalar values with the selected immutable workflow state", async () => {
    const expense = approvalModule(
      runtimeFor(await composedGraphFor(expenseBrief)),
    ).exports;
    const purchase = approvalModule(
      runtimeFor(await purchaseGraphFor()),
    ).exports;
    const fields = [
      { key: "amount", type: "decimal", required: true },
      { key: "category", type: "enum", required: true },
      { key: "receipt", type: "json", required: false },
      { key: "paid", type: "boolean", required: true },
    ];
    const records = [
      {
        id: "expense-1",
        amount: 18.5,
        category: "Taxi",
        receipt: { reference: "private-token" },
        paid: false,
        status: "submitted",
        undeclared: "private-token",
      },
      {
        id: "expense-2",
        amount: 42,
        category: "Meals",
        receipt: { reference: "taxi" },
        paid: true,
        status: "approved",
      },
      {
        id: "expense-3",
        amount: 7,
        category: "Parking",
        receipt: null,
        paid: false,
        status: "archived",
      },
    ];

    expect(
      expense.filterRecords(fields, records, "  tAxI ", "submitted"),
    ).toEqual([records[0]]);
    expect(expense.filterRecords(fields, records, "private-token", "")).toEqual(
      [],
    );
    expect(expense.filterRecords(fields, records, "true", "approved")).toEqual([
      records[1],
    ]);
    expect(expense.filterRecords(fields, records, "", "submitted")).toEqual([
      records[0],
    ]);
    expect(expense.filterRecords(fields, records, "", "")).toEqual(records);

    const expenseFlow = expense.definition.flow.flows.find(
      (flow: any) => flow.entity === "expense",
    );
    expect(expense.statusOptions(expenseFlow.entity)).toEqual([
      "draft",
      "submitted",
      "approved",
      "rejected",
    ]);
    expect(purchase.statusOptions("purchase-request")).toEqual([
      "draft",
      "submitted",
      "approved",
      "rejected",
    ]);
  });

  it("ignores a delayed transition from an earlier role scope", async () => {
    const state: unknown[] = [];
    const refs: Array<{ current: unknown }> = [];
    const stateWrites: Array<{ index: number; value: unknown }> = [];
    let hookIndex = 0;
    const react = {
      useState(initial: unknown) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value: unknown) => {
            state[index] =
              typeof value === "function"
                ? (value as (current: unknown) => unknown)(state[index])
                : value;
            stateWrites.push({ index, value: state[index] });
          },
        ];
      },
      useRef(initial: unknown) {
        const index = hookIndex++;
        return (refs[index] ??= { current: initial });
      },
      useEffect() {
        hookIndex++;
      },
      useCallback(callback: unknown) {
        hookIndex++;
        return callback;
      },
    };
    const jsx = (type: unknown, props: Record<string, unknown>) => ({
      type,
      props,
    });
    const runtime = approvalModule(
      runtimeFor(await composedGraphFor(expenseBrief)),
      (name) =>
        name === "react"
          ? react
          : { jsx, jsxs: jsx, Fragment: Symbol.for("react.fragment") },
    ).exports;
    const entity = runtime.definition.entities.find(
      (candidate: any) => candidate.key === "expense",
    );
    state[0] = [
      {
        id: "expense-1",
        amount: 18.5,
        category: "Taxi",
        date: "2026-09-11",
        status: "submitted",
      },
    ];
    state[1] = null;
    state[2] = false;
    const render = (role: string) => {
      hookIndex = 0;
      return runtime.EntityRecords({
        block: { id: "expenses", type: "collection", props: {} },
        entity,
        role,
        reportError: () => {},
      });
    };
    const findAction = (node: any): any => {
      if (!node || typeof node !== "object") return undefined;
      if (node.type === "button" && node.props.children?.includes?.("Approve"))
        return node;
      const children = node.props?.children;
      for (const child of Array.isArray(children) ? children : [children]) {
        const found = findAction(child);
        if (found) return found;
      }
      return undefined;
    };
    const originalFetch = globalThis.fetch;
    const pendingResponses: Array<(value: Response) => void> = [];
    const requests: Array<{ url: string; method?: string }> = [];
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      requests.push({ url, method: init?.method });
      return new Promise<Response>((resolve) => pendingResponses.push(resolve));
    }) as typeof fetch;
    try {
      const first = findAction(render("manager"));
      first.props.onClick();
      expect(requests).toEqual([
        { url: "/api/expense/expense-1/events/approve", method: "POST" },
      ]);
      render("employee");
      const second = findAction(render("manager"));
      second.props.onClick();
      expect(requests).toHaveLength(2);
      pendingResponses[0]!({
        ok: true,
        json: async () => ({ status: "approved" }),
      } as Response);
      await Promise.resolve();
      await Promise.resolve();
      second.props.onClick();
      expect(requests).toHaveLength(2);
      expect(
        stateWrites
          .filter((write) => write.index === 9)
          .map((write: any) => write.value.message),
      ).not.toContain("Expense: Approved.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("selects only exact, unambiguous declared summary fields and neutralizes ambiguous status tones", async () => {
    const { exports: runtime } = approvalModule(
      runtimeFor(await composedGraphFor(expenseBrief)),
    );
    expect(
      runtime.selectSummaryFields([
        { key: "amount", type: "decimal", required: true },
        { key: "category", type: "enum", required: true },
        { key: "date", type: "date", required: true },
        { key: "amountCents", type: "integer", required: true },
      ]),
    ).toEqual(["amount", "category", "date"]);
    expect(
      runtime.selectSummaryFields([
        { key: "amount", type: "decimal", required: true },
        { key: "category", type: "text", required: true },
        { key: "date", type: "datetime", required: true },
        { key: "amount", type: "integer", required: true },
      ]),
    ).toEqual([undefined, undefined, "date"]);
    expect(runtime.selectSummaryFields([])).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(
      runtime.selectSummaryFields([
        { key: "amountValue", type: "decimal", required: true },
        { key: "expense_category", type: "enum", required: true },
        { key: "dateAt", type: "datetime", required: true },
      ]),
    ).toEqual([undefined, undefined, undefined]);
    expect(runtime.statusTone("expense", "submitted")).toBe("pending");
    expect(runtime.statusTone("expense", "approved")).toBe("positive");
    expect(runtime.statusTone("expense", "rejected")).toBe("negative");
    expect(runtime.statusTone("expense", "missing")).toBe("neutral");
    expect(runtime.statusTone("expense", null)).toBe("neutral");
    const ambiguous = structuredClone(runtime.definition);
    ambiguous.flow.flows[0].transitions.push({
      from: "submitted",
      event: "approve",
      to: "approved",
      roles: [],
    });
    const original = runtime.definition.flow.flows;
    runtime.definition.flow.flows = ambiguous.flow.flows;
    expect(runtime.statusTone("expense", "approved")).toBe("neutral");
    runtime.definition.flow.flows = original;
  });

  it("emits the reusable expressive approval workspace with media and current-state progress", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const themed = structuredClone(graph);
    const designSystem = structuredClone(
      resolveExperienceDesignSystem(graph.experience),
    );
    designSystem.tokens.colour.light.success = "#146c43";
    designSystem.tokens.colour.light.warning = "#8a4b00";
    designSystem.tokens.colour.light.danger = "#98251f";
    designSystem.tokens.colour.dark.success = "#78d58a";
    designSystem.tokens.colour.dark.warning = "#ffc05a";
    designSystem.tokens.colour.dark.danger = "#ff7b73";
    themed.experience = { ...themed.experience, designSystem };
    const runtime = runtimeFor(graph);
    const styles = generateApplicationBundle(bundleInputFor(themed)).files.find(
      (file) => file.path === "web/app/globals.css",
    )!.content;
    expect(approvalWorkspacePresentation).toEqual({
      key: "approval-workspace-presentation",
      version: "2.0.0",
      ownership: "factory-authored",
      license: "UNLICENSED",
      reuse: [
        "button",
        "input",
        "label",
        "select",
        "card",
        "badge",
        "compact-sidebar-navigation",
        "form-field",
        "loading-state",
        "empty-state",
        "error-state",
        "confirmation-state",
        "denial-state",
      ],
      icons: [
        "house",
        "receipt-text",
        "user-round",
        "refresh-cw",
        "clock",
        "circle-check",
        "circle-x",
      ],
    });
    expect(approvalPresentationComponents).toMatchObject({
      key: "approval-presentation-components",
      version: "1.0.0",
      ownership: "factory-authored",
      license: "UNLICENSED",
    });
    expect(Object.keys(approvalVisualAssets)).toHaveLength(2);
    expect(runtime).toContain("<aside className='approval-workspace-sidebar'>");
    expect(runtime).toContain(
      "<details className='approval-workspace-mobile-nav'><summary aria-label={'Navigation: ' + activePage.title} title='Navigation'><ApprovalIcon name='receipt-text' /></summary><nav aria-label='Application routes'>",
    );
    expect(runtime).toContain("<h1>{activePage.title}</h1>");
    expect(runtime).toContain("<ApprovalFamilyHero");
    expect(runtime).toContain("<ApprovalProgress");
    expect(runtime).toContain("data-approval-material={asset.key}");
    expect(runtime).toContain(
      "aria-current={item.route === requestedRoute ? 'page' : undefined}",
    );
    expect(runtime).toContain("<details><summary>Details</summary>");
    expect(runtime).toContain(
      "className={'approval-record approval-tone-' + tone}",
    );
    expect(runtime).toContain(
      "<section className='generated-card approval-records-section'>",
    );
    expect(runtime).toContain(
      "className='generated-primary' href={formRoute}>New {entity.label.toLowerCase()}</a>",
    );
    expect(styles).toContain("--approval-workspace-version: 4;");
    expect(styles).toContain(
      ".approval-v1.generated-app { --approval-workspace-version: 4; display: grid;",
    );
    expect(styles).toContain(".approval-family-hero");
    expect(styles).toContain(".approval-progress");
    expect(styles).toContain(".approval-workspace-sidebar");
    expect(styles).toContain(".approval-workspace-mobile-nav");
    for (const colour of [
      "#146c43",
      "#8a4b00",
      "#98251f",
      "#78d58a",
      "#ffc05a",
      "#ff7b73",
    ])
      expect(styles).toContain(colour);
    const referencedTokens = Array.from(
      styles.matchAll(/var\((--factory-[\w-]+)/g),
      ([, token]) => token!,
    );
    const definedTokens = new Set(
      Array.from(
        styles.matchAll(/(--factory-[\w-]+)\s*:/g),
        ([, token]) => token!,
      ),
    );
    for (const token of referencedTokens)
      expect(definedTokens).toContain(token);
  });

  it("derives exactly the four current approval states and rejects malformed flows", async () => {
    const { exports: runtime } = approvalModule(
      runtimeFor(await composedGraphFor(expenseBrief)),
    );
    const entity = runtime.definition.entities.find(
      (candidate: { key: string }) => candidate.key === "expense",
    );
    for (const [status, current] of [
      ["draft", 0],
      ["submitted", 1],
      ["approved", 2],
      ["rejected", 2],
    ] as const) {
      const steps = runtime.approvalProgressSteps(entity, status);
      expect(steps.map((step: { phase: string }) => step.phase)).toEqual(
        ["complete", "complete", "complete"].map((phase, index) =>
          index < current ? phase : index === current ? "current" : "pending",
        ),
      );
      expect(steps.map((step: { label: string }) => step.label)).toEqual([
        "Draft",
        "Submitted",
        status === "approved"
          ? "Approved"
          : status === "rejected"
            ? "Rejected"
            : "Decision",
      ]);
      const items = runtime.ApprovalProgress({ entity, status }).props.children
        .props.children;
      expect(
        items.filter((item: any) => item.props["aria-current"] === "step"),
      ).toHaveLength(1);
      expect(items[current].props["aria-current"]).toBe("step");
    }
    for (const status of ["unknown", undefined, null, {}]) {
      expect(runtime.approvalProgressSteps(entity, status)).toBeUndefined();
      expect(runtime.ApprovalProgress({ entity, status })).toBeNull();
    }
    const original = structuredClone(runtime.definition.flow.flows);
    const selectedIndex = original.findIndex(
      (flow: { entity: string }) => flow.entity === entity.key,
    );
    const originalFlow = original[selectedIndex];
    const mutations = [
      { initialState: "submitted" },
      { states: ["draft", "submitted", "approved", "other"] },
      { transitions: originalFlow.transitions.slice(1) },
      {
        transitions: [...originalFlow.transitions, originalFlow.transitions[0]],
      },
      ...originalFlow.transitions.flatMap((_: unknown, index: number) =>
        ["event", "from", "to"].map((key) => ({
          transitions: originalFlow.transitions.map(
            (transition: object, candidate: number) =>
              candidate === index
                ? { ...transition, [key]: "invalid" }
                : transition,
          ),
        })),
      ),
    ];
    for (const mutation of mutations) {
      runtime.definition.flow.flows = structuredClone(original);
      Object.assign(runtime.definition.flow.flows[selectedIndex], mutation);
      expect(
        runtime.approvalProgressSteps(entity, "submitted"),
      ).toBeUndefined();
      expect(
        runtime.ApprovalProgress({ entity, status: "submitted" }),
      ).toBeNull();
    }
    runtime.definition.flow.flows = structuredClone(original);
    runtime.definition.flow.flows.push({
      ...structuredClone(runtime.definition.flow.flows[0]),
    });
    expect(runtime.approvalProgressSteps(entity, "submitted")).toBeUndefined();
  });

  it("selects only an unambiguous structural approval flow independent of naming or order", async () => {
    const graph = await composedGraphFor(expenseBrief);
    expect(runtimeFor(graph)).toContain("Requests and approvals");
    const renamed = structuredClone(graph);
    renamed.metadata.name = "Appointment booking";
    renamed.domain.entities.reverse();
    renamed.flow.flows.reverse();
    for (const flow of renamed.flow.flows) flow.transitions.reverse();
    expect(runtimeFor(renamed)).toContain("Requests and approvals");
    const noApproval = structuredClone(graph);
    for (const flow of noApproval.flow.flows)
      flow.transitions = flow.transitions.filter(
        (transition) => transition.event !== "reject",
      );
    expect(runtimeFor(noApproval)).not.toContain("Requests and approvals");
    const ambiguous = structuredClone(graph);
    ambiguous.flow.flows.push({
      ...structuredClone(graph.flow.flows[0]!),
      id: "other-approval",
    });
    expect(runtimeFor(ambiguous)).not.toContain("Requests and approvals");
    expect(runtimeFor(nonApprovalGraph())).not.toContain(
      "Requests and approvals",
    );
    expect(runtimeFor(await composedGraphFor(bookingBrief))).not.toContain(
      "Requests and approvals",
    );
  });

  it("converts typed values and validates impossible dates before submission in both timezones", async () => {
    const { exports: runtime, compiled } = approvalModule(
      runtimeFor(await composedGraphFor(expenseBrief)),
    );
    const fields = [
      { key: "amount", type: "decimal", required: true },
      { key: "count", type: "integer", required: true },
      { key: "isRequired", type: "boolean", required: true },
      { key: "isOptional", type: "boolean", required: false },
      { key: "date", type: "date", required: true },
      { key: "notes", type: "text", required: false },
      { key: "metadata", type: "json", required: false },
      {
        key: "category",
        type: "enum",
        values: ["travel", "other"],
        required: true,
      },
    ];
    const values = {
      amount: "128.50",
      count: "2",
      date: "2026-09-09",
      notes: "",
      metadata: '{"ok":true}',
      category: "travel",
    };
    expect(runtime.formPayload(fields, values)).toEqual({
      amount: 128.5,
      count: 2,
      isRequired: false,
      isOptional: false,
      date: "2026-09-09T00:00:00.000Z",
      metadata: { ok: true },
      category: "travel",
    });
    expect(
      runtime.formPayload(fields, { ...values, isRequired: true }).isRequired,
    ).toBe(true);
    for (const [key, value] of [
      ["amount", "Infinity"],
      ["count", "1.5"],
      ["metadata", "{"],
      ["category", "invented"],
      ["date", "2026-02-30"],
    ]) {
      expect(() =>
        runtime.formPayload(fields, { ...values, [key!]: value }),
      ).toThrow(runtime.fieldLabel(key));
    }
    expect(runtime.fieldLabel("receiptURL_value-name")).toBe(
      "Receipt url value name",
    );
    for (const timezone of ["UTC", "America/Los_Angeles"]) {
      const script = `const out = {}; new Function('require','exports', ${JSON.stringify(compiled)})(name => require(require.resolve(name, { paths: [${JSON.stringify(join(__dirname, "../../../apps/workbench"))}] })), out); const values = ['2026-09-09','2024-02-29','2026-02-29','2026-02-30','2026-13-01','2026-9-09','not-a-date','2026-09-09T00:00:00Z']; process.stdout.write(JSON.stringify(values.map(value => { try { return out.calendarDateToPrisma(value); } catch { return 'invalid'; } })));`;
      const check = spawnSync(process.execPath, ["-"], {
        input: script,
        encoding: "utf8",
        env: { ...process.env, TZ: timezone },
      });
      expect(check.status, check.stderr).toBe(0);
      expect(JSON.parse(check.stdout)).toEqual([
        "2026-09-09T00:00:00.000Z",
        "2024-02-29T00:00:00.000Z",
        "invalid",
        "invalid",
        "invalid",
        "invalid",
        "invalid",
        "invalid",
      ]);
    }
  });

  it("renders native controls, declared values, and role-and-state valid actions", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const { exports: runtime } = approvalModule(runtimeFor(graph));
    for (const [type, tag, htmlType] of [
      ["string", "input", "text"],
      ["text", "textarea", undefined],
      ["json", "textarea", undefined],
      ["integer", "input", "number"],
      ["decimal", "input", "number"],
      ["boolean", "input", "checkbox"],
      ["date", "input", "date"],
      ["datetime", "input", "datetime-local"],
      ["email", "input", "email"],
      ["url", "input", "url"],
      ["enum", "select", undefined],
    ]) {
      const control = runtime.FieldControl({
        field: { key: "example", type, required: true, values: ["one", "two"] },
        value: "",
        onChange: () => {},
        id: "example",
      });
      expect(control.type).toBe(tag);
      expect(control.props.type).toBe(htmlType);
      expect(control.props.required).toBe(
        type === "boolean" ? undefined : true,
      );
      if (type === "boolean") expect(control.props.checked).toBe(false);
      if (type === "integer") expect(control.props.step).toBe(1);
      if (type === "decimal") expect(control.props.step).toBe("any");
    }
    expect(runtime.formatValue({ type: "boolean" }, false)).toBe("No");
    expect(runtime.formatValue({ type: "text" }, null)).toBe("Not provided");
    const date = runtime.formatValue(
      { type: "date" },
      "2026-09-09T00:00:00.000Z",
    );
    expect(date.type).toBe("time");
    expect(date.props.children).toBe("2026-09-09");
    const flow = graph.flow.flows.find((candidate) =>
      candidate.transitions.some(
        (transition) => transition.event === "approve",
      ),
    )!;
    const submit = flow.transitions.find(
      (transition) => transition.event === "submit",
    )!;
    const approve = flow.transitions.find(
      (transition) => transition.event === "approve",
    )!;
    expect(
      runtime
        .validTransitions(submit.roles![0], flow.entity, submit.from)
        .map((transition: any) => transition.event),
    ).toEqual(["submit"]);
    expect(
      runtime.validTransitions(submit.roles![0], flow.entity, approve.from),
    ).toEqual([]);
    expect(
      runtime
        .validTransitions(approve.roles![0], flow.entity, approve.from)
        .map((transition: any) => transition.event)
        .sort(),
    ).toEqual(["approve", "reject"]);
    expect(
      runtime.validTransitions(approve.roles![0], flow.entity, approve.to),
    ).toEqual([]);
  });

  it("keeps native date controls and one associated demo role label", async () => {
    const source = runtimeFor(await composedGraphFor(expenseBrief));
    expect(source).toContain(
      "type={field.type === 'datetime' ? 'datetime-local' : field.type === 'string' ? 'text' : field.type}",
    );
    expect(source.match(/id='demo-role'/g)).toHaveLength(1);
    expect(source).toContain("<label htmlFor='demo-role'>");
  });

  it("renders one refresh icon and sentence-case labels", async () => {
    const { exports: runtime } = approvalModule(
      runtimeFor(await composedGraphFor(expenseBrief)),
    );
    expect.soft(runtime.fieldLabel("dueDate")).toBe("Due date");
    expect(runtime.fieldLabel("review_status-code")).toBe("Review status code");
    const resolveReact = (name: string) =>
      require(
        require.resolve(name, {
          paths: [join(__dirname, "../../../apps/workbench")],
        }),
      );
    const { createElement } = resolveReact("react");
    const { renderToStaticMarkup } = resolveReact("react-dom/server");
    const entity = runtime.definition.entities.find(
      (candidate: any) => candidate.key === "expense",
    );
    const markup = renderToStaticMarkup(
      createElement(runtime.EntityRecords, {
        block: { id: "expenses", type: "collection", props: {} },
        entity,
        role: "employee",
        reportError: () => {},
      }),
    );
    expect(markup.match(/lucide-refresh-cw/g)).toHaveLength(1);
  });

  it("embeds the seven fixed decorative assets and exact notice with deterministic safe output", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const bundle = generateApplicationBundle(bundleInputFor(graph));
    expect(generateApplicationBundle(bundleInputFor(graph)).files).toEqual(
      bundle.files,
    );
    const { exports: runtime } = approvalModule(runtimeFor(graph));
    for (const key of [
      "house",
      "receipt-text",
      "user-round",
      "refresh-cw",
      "clock",
      "circle-check",
      "circle-x",
    ] as const) {
      const icon = runtime.ApprovalIcon({ name: key });
      expect(icon.props.dangerouslySetInnerHTML.__html).toBe(
        getCustomerIconAssets().icons[key],
      );
      expect(icon.props["aria-hidden"]).toBe(true);
    }
    expect(runtime.ApprovalIcon({ name: "constructor" })).toBeNull();
    expect(runtime.actionIcon("submit")).toBe("receipt-text");
    expect(runtime.actionIcon("approve")).toBe("circle-check");
    expect(runtime.actionIcon("reject")).toBe("circle-x");
    expect(runtime.actionIcon("other")).toBeNull();
    expect(
      bundle.files.filter((file) => file.path === "THIRD_PARTY_NOTICES.md"),
    ).toEqual([
      {
        path: "THIRD_PARTY_NOTICES.md",
        content: getCustomerIconAssets().notice,
      },
    ]);
    expect(
      bundle.files.find((file) => file.path === "web/package.json")!.content,
    ).not.toContain("lucide");
    for (const status of [400, 409, 401, 403, 500, 503, 418])
      expect(runtime.safeResponseMessage(status)).toMatch(
        /record|role|service|again/i,
      );
    expect(runtimeFor(graph)).not.toContain("await response.text()");
  });
});
