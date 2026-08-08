import { describe, expect, it } from "vitest";

import { createProfileDraft } from "../profile-starters";
import { buildExpenseApprovalDraft } from "./build-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "./plan-alternatives";
import { expenseApprovalRequirementStarter } from "./discuss-model";
import { lineageElements } from "./lineage-model";

function builtDraft() {
  const alternatives = planExpenseApprovalAlternatives(
    expenseApprovalRequirementStarter(),
  );
  if (!alternatives.ok)
    throw new Error("Starter alternatives must be plan-ready.");
  return buildExpenseApprovalDraft(
    alternatives.alternatives[0]!.plan,
    createExpenseApprovalPlanningBase(),
  );
}

describe("lineageElements", () => {
  it("derives deterministic nodes and edges from the Draft graph", () => {
    const elements = lineageElements(builtDraft().graph);
    expect(elements.nodes.length).toBeGreaterThan(0);
    expect(elements.edges.length).toBeGreaterThan(0);
    for (const node of elements.nodes) {
      expect(typeof node.id).toBe("string");
      expect(Number.isInteger(node.x)).toBe(true);
      expect(Number.isInteger(node.y)).toBe(true);
      expect(
        ["pages", "roles", "entities", "flows", "locks"].includes(node.layer),
      ).toBe(true);
    }
    for (const edge of elements.edges) {
      expect(elements.nodes.some((node) => node.id === edge.source)).toBe(true);
      expect(elements.nodes.some((node) => node.id === edge.target)).toBe(true);
    }
  });

  it("is deterministic: identical graphs produce identical elements", () => {
    const graph = builtDraft().graph;
    expect(lineageElements(graph)).toEqual(lineageElements(graph));
  });

  it("connects pages to bound entities and entities to read-capable roles", () => {
    const elements = lineageElements(builtDraft().graph);
    const pageEntityEdges = elements.edges.filter((edge) =>
      edge.id.startsWith("page-entity:"),
    );
    expect(pageEntityEdges.length).toBeGreaterThan(0);
    const entityRoleEdges = elements.edges.filter((edge) =>
      edge.id.startsWith("entity-role:"),
    );
    expect(entityRoleEdges.length).toBeGreaterThan(0);
    const employeeRead = entityRoleEdges.some(
      (edge) => edge.target === "role:employee",
    );
    expect(employeeRead).toBe(true);
  });

  it("connects each flow to its entity", () => {
    const elements = lineageElements(builtDraft().graph);
    expect(
      elements.edges.some((edge) => edge.id.startsWith("flow-entity:")),
    ).toBe(true);
  });

  it("adds the release lineage only when release material is provided", () => {
    const graph = builtDraft().graph;
    const withoutRelease = lineageElements(graph);
    expect(withoutRelease.nodes.some((node) => node.layer === "release")).toBe(
      false,
    );

    const withRelease = lineageElements(graph, {
      phase: "preview",
      publishedRevisionId: "published-1",
      compilationId: "compilation-1",
      verificationRunId: "verification-run-1",
      previewRunId: "preview-1",
    });
    const releaseLayers = withRelease.nodes.filter(
      (node) => node.layer === "release",
    );
    expect(releaseLayers.map((node) => node.kind)).toEqual([
      "published",
      "compilation",
      "verification",
      "preview",
    ]);
    const chain = withRelease.edges.filter((edge) =>
      edge.id.startsWith("release:"),
    );
    expect(chain.map((edge) => [edge.source, edge.target])).toEqual([
      ["release:published", "release:compilation"],
      ["release:compilation", "release:verification"],
      ["release:verification", "release:preview"],
    ]);
  });

  it("exposes plain presentation data only — never the graph itself", () => {
    const elements = lineageElements(builtDraft().graph);
    expect(elements).toEqual(JSON.parse(JSON.stringify(elements)));
  });
});
