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
  type ApplicationGraphV1,
} from "@factory/graph";

import { createGeneratedPageRuntimeProjection } from "../src/page-runtime-projection.js";
import {
  generateApplicationBundle,
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
  const interpretation = await fixtureInterpreter.interpret({ brief });
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
    const interpretation = await fixtureInterpreter.interpret({
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

    it("emits a type-checkable runtime for the calendar product", async () => {
      // The isolated preview build type-checks the emitted bundle (that is
      // where the runtime bug was found), so the unit suite must catch a
      // non-compiling emission before any pipeline run. The check runs inside
      // this package so "react" resolves to the @types/react devDependency;
      // the emitted file is otherwise self-contained.
      const graph = await composedGraphFor(bookingBrief);
      const bundle = generateApplicationBundle(bundleInputFor(graph));
      const runtime = bundle.files.find(
        (file) => file.path === "web/app/page-runtime.tsx",
      );
      expect(runtime).toBeDefined();

      const directory = join(__dirname, ".typecheck", `runtime-${Date.now()}`);
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
    });
  });
});
