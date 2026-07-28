import { describe, expect, it } from "vitest";

import { diffApplicationGraphs } from "./graph-diff";
import { workbenchGraph } from "./workbench-graph";

describe("diffApplicationGraphs", () => {
  it("reports every changed Graph model without comparing generated source", () => {
    const current = structuredClone(workbenchGraph);
    current.page.pages[0]!.route = "/review";
    current.page.pages[0]!.blocks[0]!.bindings = { title: "request.title" };
    current.domain.entities[0]!.fields[0]!.unique = true;
    current.flow.flows[0]!.transitions[0]!.effects = [
      { capability: "notification.email", operation: "send" },
    ];
    current.policy.permissions[0]!.actions.push("submit");
    current.integration.providers.push({
      id: "mail-provider",
      type: "email",
      version: "v1",
    });
    current.experience.theme.tokens = { brand: "#008f7a" };

    expect(diffApplicationGraphs(workbenchGraph, current)).toEqual({
      changed: true,
      entries: [
        { scope: "page", kind: "changed", key: "PageModel" },
        { scope: "domain", kind: "changed", key: "DomainModel" },
        { scope: "flow", kind: "changed", key: "FlowModel" },
        { scope: "policy", kind: "changed", key: "PolicyModel" },
        {
          scope: "integration",
          kind: "changed",
          key: "IntegrationModel",
        },
        {
          scope: "experience",
          kind: "changed",
          key: "ExperienceModel",
        },
      ],
    });
  });

  it("is empty when both Graph revisions have the same semantics", () => {
    expect(
      diffApplicationGraphs(workbenchGraph, structuredClone(workbenchGraph)),
    ).toEqual({
      changed: false,
      entries: [],
    });
  });
});
