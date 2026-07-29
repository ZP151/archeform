import { describe, expect, it } from "vitest";

import { assertValidApplicationGraph } from "@factory/graph";
import { createProfileDraft } from "./profile-starters";
import {
  createGuidedApplicationDraft,
  guidedProfileSummary,
} from "./guided-application";

describe("guided application composition", () => {
  it("creates a valid independently identified Draft from a selected profile", () => {
    const graph = createGuidedApplicationDraft(
      {
        profile: "expense-approval",
        name: "  Travel approvals  ",
        theme: "dark",
      },
      "test-42",
    );

    expect(graph.metadata).toEqual({
      id: "travel-approvals-test-42",
      workspaceId: "local-workspace",
      name: "Travel approvals",
    });
    expect(graph.experience.theme.mode).toBe("dark");
    expect(() => assertValidApplicationGraph(graph)).not.toThrow();
    expect(guidedProfileSummary(graph)).toEqual({
      pages: 2,
      entities: 1,
      roles: 3,
      flows: 1,
    });
  });

  it("rejects an empty product name before a Draft can be created", () => {
    expect(() =>
      createGuidedApplicationDraft(
        { profile: "expense-approval", name: "   ", theme: "light" },
        "test-43",
      ),
    ).toThrow("Application name is required.");
  });

  it("does not mutate the pinned profile starter when a guided Draft changes it", () => {
    const original = createProfileDraft("expense-approval");
    const guided = createGuidedApplicationDraft(
      { profile: "expense-approval", name: "Travel approvals", theme: "dark" },
      "test-44",
    );

    expect(createProfileDraft("expense-approval")).toEqual(original);
    expect(guided.metadata.id).not.toBe(original.metadata.id);
    expect(guided).not.toBe(original);
  });
});
