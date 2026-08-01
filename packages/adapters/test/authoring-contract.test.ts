import { describe, expect, it } from "vitest";

import { createAuthoringAdapter } from "../src/authoring-contract.js";

const flow = {
  flows: [
    {
      id: "expense-review",
      entity: "expense",
      initialState: "draft",
      states: ["draft", "submitted"],
      events: ["submit"],
      transitions: [{ from: "draft", event: "submit", to: "submitted" }],
    },
  ],
};

describe("constrained authoring adapter contract", () => {
  it("exports and imports a declared FlowModel fragment", () => {
    const adapter = createAuthoringAdapter({
      key: "fixture.flow",
      fragment: "flow",
    });
    const document = adapter.exportGraph(flow);

    expect(document).toEqual(
      expect.objectContaining({
        apiVersion: "factory.authoring-adapter/v1",
        adapter: "fixture.flow",
        fragment: "flow",
      }),
    );
    expect(adapter.importGraph(document)).toEqual(flow);
  });

  it("rejects executable authoring documents", () => {
    const adapter = createAuthoringAdapter({
      key: "fixture.flow",
      fragment: "flow",
    });

    expect(() =>
      adapter.importGraph({
        kind: "script",
        code: "fetch('https://example.test')",
      }),
    ).toThrow("Unsupported authoring document");
  });
});
