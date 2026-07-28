import { describe, expect, it } from "vitest";

import {
  flowModelToReactFlow,
  pageModelToPuckDocument,
  puckDocumentToPageModel,
} from "../src/index.js";

describe("Graph editor adapters", () => {
  it("round-trips an owned PageModel through a Puck document", () => {
    const page = {
      pages: [
        {
          id: "home",
          route: "/",
          title: "Home",
          blocks: [{ id: "welcome", type: "hero", props: { heading: "Hello" } }],
        },
      ],
      navigation: [{ id: "home", label: "Home", pageId: "home" }],
    };

    expect(puckDocumentToPageModel(pageModelToPuckDocument(page))).toEqual(page);
  });

  it("exposes declared FlowModel transitions as read-only React Flow nodes and edges", () => {
    const flow = {
      flows: [{
        id: "expense-review",
        entity: "expense",
        initialState: "draft",
        states: ["draft", "submitted", "approved"],
        events: ["submit", "approve"],
        transitions: [
          { from: "draft", event: "submit", to: "submitted" },
          { from: "submitted", event: "approve", to: "approved" },
        ],
      }],
    };

    const diagram = flowModelToReactFlow(flow);
    expect(diagram.nodes.map((node) => node.id)).toEqual([
      "expense-review:draft",
      "expense-review:submitted",
      "expense-review:approved",
    ]);
    expect(diagram.edges.map((edge) => edge.label)).toEqual(["submit", "approve"]);
  });
});
