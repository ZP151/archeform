import { describe, expect, it } from "vitest";

import {
  createBlankApplicationDraft,
  hashApplicationGraph,
} from "../src/index.js";

describe("createBlankApplicationDraft", () => {
  it("creates a valid mutable Draft revision with no product content", () => {
    const draft = createBlankApplicationDraft({
      applicationId: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense Approval",
    });
    expect(draft.status).toBe("draft");
    expect(draft.revision).toBe(1);
    expect(draft.id).toBe("expense-approval");
    expect(draft.graph.metadata).toEqual({
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense Approval",
    });
    expect(draft.graph.page.pages).toEqual([]);
    expect(draft.graph.page.navigation).toEqual([]);
    expect(draft.graph.domain.entities).toEqual([]);
    expect(draft.graph.domain.relations).toEqual([]);
    expect(draft.graph.domain.seedData).toBeUndefined();
    expect(draft.graph.policy.roles).toEqual([]);
    expect(draft.graph.policy.permissions).toEqual([]);
    expect(draft.graph.flow.flows).toEqual([]);
    expect(draft.graph.integration.providers).toEqual([]);
    expect(draft.graph.integration.capabilities).toEqual([]);
    expect(draft.graph.integration.assetLocks).toBeUndefined();
    expect(draft.graph.integration.compositionProfile).toBeUndefined();
    // Light mode is the default experience; nothing is themed or localized.
    expect(draft.graph.experience.theme.mode).toBe("light");
    expect(draft.graph.experience.locales).toEqual(["en"]);
    expect(hashApplicationGraph(draft.graph).startsWith("sha256:")).toBe(true);
  });

  it("rejects invalid application identifiers and unsafe names", () => {
    expect(() =>
      createBlankApplicationDraft({
        applicationId: "Bad ID",
        workspaceId: "ws",
        name: "App",
      }),
    ).toThrow();
    expect(() =>
      createBlankApplicationDraft({
        applicationId: "app",
        workspaceId: "ws",
        name: "App portal at https://evil.example",
      }),
    ).toThrow();
  });
});
