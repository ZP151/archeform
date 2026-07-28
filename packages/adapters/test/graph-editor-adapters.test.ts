import { describe, expect, it } from "vitest";
import { assertValidApplicationGraph } from "@factory/graph";

import {
  domainModelToReactFlow,
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
    expect(() => assertValidApplicationGraph(pageModelToPuckDocument(page))).toThrow();
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
    expect(diagram.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ data: expect.objectContaining({ event: "submit" }) }),
    ]));
  });

  it("projects declared DomainModel relations without making React Flow coordinates semantic", () => {
    const diagram = domainModelToReactFlow({
      entities: [
        { key: "order", label: "Order", fields: [{ key: "status", type: "string", required: true }], indexes: [] },
        { key: "lineItem", label: "Line item", fields: [{ key: "quantity", type: "integer", required: true }], indexes: [] },
      ],
      relations: [{ from: "order", to: "lineItem", kind: "one-to-many" }],
    });

    expect(diagram.nodes.map((node) => node.data.entityKey)).toEqual(["order", "lineItem"]);
    expect(diagram.edges).toEqual([
      expect.objectContaining({
        source: "domain:order",
        target: "domain:lineItem",
        label: "one-to-many",
        data: { kind: "one-to-many" },
      }),
    ]);
  });
});
