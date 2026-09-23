import { randomBytes } from "node:crypto";
import { createCapabilityCompositionLock } from "../../packages/capabilities/dist/index.js";
import {
  composeProductDraft,
  planProductAlternatives,
} from "../../packages/capabilities/dist/node.js";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  createPublishedGraphExchange,
  parsePublishedGraphExchange,
  hashApplicationGraph,
} from "../../packages/graph/dist/index.js";
import { generateApplicationBundle } from "../../packages/compiler/dist/index.js";
import { OpenAIRequirementInterpreterAdapter } from "../../packages/adapters/dist/index.js";
// Script-local test interface, deliberately not a platform package export.
import { dirname, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Page, TestInfo } from "@playwright/test";
import { pathToFileURL } from "node:url";
// Preserve native ESM through Playwright's CommonJS test transform.
export const loadDurableHarness = () =>
  new Function("url", "return import(url)")(
    pathToFileURL(resolve(process.cwd(), "scripts/local-durable-delivery.mjs"))
      .href,
  );

export function durableTaskTitle(page: Page, title: string) {
  // The emitted heading includes the responsive field label "Title". Match
  // its entire text within a task row; exact plain title text cannot find it.
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page
    .locator(".task-records > .task-record > h3.task-record-title")
    .filter({ hasText: new RegExp(`^Title${escapedTitle}$`) });
}

export async function persistDurableEvidence(
  testInfo: Pick<TestInfo, "outputPath" | "attach">,
  evidence: unknown,
  attach = true,
) {
  const path = testInfo.outputPath("local-durable-delivery-safe-evidence.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(evidence, null, 2));
  if (attach)
    await testInfo.attach("local-durable-delivery-safe-evidence", {
      path,
      contentType: "application/json",
    });
  return path;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Locally authored Published lifecycle fixtures; no Control Plane Publish. */
export async function durableDeliveryFixture() {
  const { manifestFor, checkCompatibility } = await loadDurableHarness();
  const runId = randomBytes(12).toString("hex");
  const applicationId = `durable-task-${runId}`;
  const interpreted = await new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "local-synthetic-fixture",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: "team-task-tracking",
              requirementId: applicationId,
              title: "Team Task Tracking",
              outcome:
                "Team members manage tasks while viewers read the board.",
              disposition: "supported-default",
              materialQuestions: [],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({
    brief:
      "Build a shared local team task board with create, start, complete, reopen and correction.",
    answers: {},
  });
  if (!interpreted.interpretation) throw new Error("delivery.fixture_invalid");
  const baseDraft = createBlankApplicationDraft({
    applicationId,
    workspaceId: "local-durable-workspace",
    name: "Local Durable Team Task",
  });
  const [alternative] = planProductAlternatives({
    requirement: interpreted.interpretation.spec,
    blueprint: interpreted.interpretation.blueprint,
    baseDraft,
  });
  if (!alternative) throw new Error("delivery.fixture_invalid");
  const { diff } = composeProductDraft({
    plan: alternative.plan,
    blueprint: interpreted.interpretation.blueprint,
    baseDraft,
  });
  const composed = applyGraphDiffToDraft(baseDraft, diff).graph;
  const selections = structuredClone(
    composed.integration.compositionSelections ?? [],
  );
  const graph = structuredClone(composed);
  delete graph.integration.compositionSelections;
  const page = graph.page.pages.find(
    (candidate) => candidate.route === "/task-list",
  );
  if (!page) throw new Error("delivery.fixture_invalid");
  const pageId = page.id;
  function revision(input: typeof graph, number: number) {
    const exchange = freeze(
      parsePublishedGraphExchange(createPublishedGraphExchange(input, number)),
    );
    const graphHash = hashApplicationGraph(exchange.graph);
    const compositionLock = freeze(
      createCapabilityCompositionLock({ graphChecksum: graphHash, selections }),
    );
    const publishedRevisionId = `${applicationId}-revision-${number}`;
    const bundle = generateApplicationBundle({
      publishedRevisionId,
      graph: exchange.graph,
      compositionLock,
    });
    return freeze({
      exchange,
      graph: exchange.graph,
      graphHash,
      compositionLock,
      publishedRevisionId,
      files: bundle.files,
      manifest: manifestFor(bundle.files),
    });
  }
  const a = revision(graph, 1);
  const second = structuredClone(a.graph);
  second.page.pages.find((candidate) => candidate.id === pageId)!.title =
    "Team Tasks — Revision B";
  const b = revision(second, 2);
  const databaseContract = checkCompatibility(a, b, pageId);
  return freeze({
    runId,
    applicationId,
    pageId,
    pagePath: page.route,
    aTitle: page.title,
    bTitle: second.page.pages.find((candidate) => candidate.id === pageId)!
      .title,
    a,
    b,
    databaseContract,
  });
}
