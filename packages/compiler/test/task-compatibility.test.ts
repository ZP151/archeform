import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projectDefinitionSelection } from "../../adapters/src/requirements/definition-selection-catalogue.js";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
} from "@factory/graph";
import {
  generateApplicationBundle,
  generateRestaurantProductApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";
import { approvalLegacyFixtures } from "./fixtures/approval-legacy.js";
import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";

const baselinePath = new URL(
  "./fixtures/task-non-task-baseline.json",
  import.meta.url,
);
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const bundleDigest = (files: readonly { path: string; content: string }[]) =>
  digest(files.map(({ path, content }) => [path, content]));

function currentCompatibility() {
  const definitions: Record<string, string> = {};
  const bundles: Record<string, string> = {};
  for (const definitionKey of [
    "restaurant-ordering",
    "expense-approval",
    "purchase-request-approval",
  ]) {
    const interpretation = projectDefinitionSelection({
      definitionKey,
      disposition: "supported-default",
      requirementId: `task-baseline-${definitionKey}`,
      title: "Compatibility Baseline",
      outcome: "Use the reviewed local business workflow.",
      materialQuestions: [],
      businessParameters: null,
    });
    definitions[definitionKey] = digest(interpretation);
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: "Compatibility Baseline",
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const { diff } = composeProductDraft({
      plan: standard!.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections ?? [],
    });
    bundles[definitionKey] = bundleDigest(
      generateApplicationBundle({
        publishedRevisionId: `task-baseline-${definitionKey}`,
        graph,
        compositionLock,
      }).files,
    );
    const published = structuredClone(graph);
    delete published.integration.compositionSelections;
    const publishedLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(published),
      selections: graph.integration.compositionSelections ?? [],
    });
    bundles[`${definitionKey}-published`] = bundleDigest(
      generateApplicationBundle({
        publishedRevisionId: `task-baseline-${definitionKey}`,
        graph: published,
        compositionLock: publishedLock,
      }).files,
    );
  }
  for (const [key, fixture] of Object.entries(approvalLegacyFixtures)) {
    bundles[`legacy-${key}`] = bundleDigest(
      generateApplicationBundle(fixture.input as unknown as PublishedGraphInput)
        .files,
    );
  }
  const restaurant = restaurantProductV3Fixture();
  bundles["restaurant-v3"] = bundleDigest(
    generateRestaurantProductApplicationBundle({
      publishedGraph: restaurant.publishedGraph,
      compositionLock: restaurant.compositionLock,
    }).files,
  );
  return { definitions, bundles };
}

describe("Task introduction compatibility with delivered non-Task products", () => {
  it("preserves canonical definitions and complete ordered generated bundles from d28f1fed", () => {
    const actual = currentCompatibility();
    const expected = JSON.parse(readFileSync(baselinePath, "utf8"));
    expect(actual).toEqual({
      definitions: expected.definitions,
      bundles: expected.bundles,
    });
  });
});
