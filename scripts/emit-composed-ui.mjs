import { readFileSync } from "node:fs";
import { createCapabilityCompositionLock } from "../packages/capabilities/dist/index.js";
import {
  composeProductDraft,
  planProductAlternatives,
} from "../packages/capabilities/dist/node.js";
import {
  createBlankApplicationDraft,
  applyGraphDiffToDraft,
  hashApplicationGraph,
} from "../packages/graph/dist/index.js";
import { generateApplicationBundle } from "../packages/compiler/dist/index.js";

// Native ESM isolates compiler loading from Playwright's TypeScript hooks.
const interpretation = JSON.parse(readFileSync(0, "utf8"));
const baseDraft = createBlankApplicationDraft({
  applicationId: interpretation.spec.requirementId,
  workspaceId: "local-workspace",
  name: interpretation.blueprint.title,
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
const graph = structuredClone(applyGraphDiffToDraft(baseDraft, diff).graph);
const selections = graph.integration.compositionSelections ?? [];
delete graph.integration.compositionSelections;
const compositionLock = createCapabilityCompositionLock({
  graphChecksum: hashApplicationGraph(graph),
  selections,
});
const { files } = generateApplicationBundle({
  publishedRevisionId: "focused-ui-published",
  graph,
  compositionLock,
});
const runtime = files.find(
  (file) => file.path === "web/app/page-runtime.tsx",
).content;
const css = files
  .filter((file) => file.path.startsWith("web/") && file.path.endsWith(".css"))
  .map((file) => file.content)
  .join("\n");
process.stdout.write(JSON.stringify({ runtime, css }));
