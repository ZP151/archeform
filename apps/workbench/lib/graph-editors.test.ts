import { describe, expect, it } from "vitest";

import {
  addDomainField,
  addFlowTransition,
  setPolicyAction,
} from "./graph-editors";
import { workbenchGraph } from "./workbench-graph";

describe("Graph Studio editors", () => {
  it("adds a declared field to a DomainModel Draft without mutating the current Graph", () => {
    const domain = addDomainField(workbenchGraph.domain, "request", {
      key: "priority",
      type: "enum",
      required: true,
      values: ["low", "normal", "high"],
    });

    expect(domain.entities[0]?.fields).toContainEqual({
      key: "priority",
      type: "enum",
      required: true,
      values: ["low", "normal", "high"],
    });
    expect(workbenchGraph.domain.entities[0]?.fields).not.toContainEqual(
      expect.objectContaining({ key: "priority" }),
    );
  });

  it("refuses duplicate DomainModel field keys", () => {
    expect(() =>
      addDomainField(workbenchGraph.domain, "request", {
        key: "title",
        type: "string",
        required: true,
      }),
    ).toThrow("already has field");
  });

  it("adds and removes one PolicyModel action without changing other actions", () => {
    const granted = setPolicyAction(
      workbenchGraph.policy,
      "manager",
      "request",
      "audit",
      true,
    );
    const manager = granted.permissions.find((entry) => entry.role === "manager");
    expect(manager?.actions).toEqual(["approve", "audit", "read"]);

    const revoked = setPolicyAction(granted, "manager", "request", "approve", false);
    expect(revoked.permissions.find((entry) => entry.role === "manager")?.actions).toEqual([
      "audit",
      "read",
    ]);
  });

  it("adds only a constrained FlowModel transition between declared states and events", () => {
    const flow = addFlowTransition(workbenchGraph.flow, "request-review", {
      from: "draft",
      event: "approve",
      to: "approved",
      roles: ["manager"],
    });

    expect(flow.flows[0]?.transitions).toContainEqual({
      from: "draft",
      event: "approve",
      to: "approved",
      roles: ["manager"],
    });
    expect(() =>
      addFlowTransition(workbenchGraph.flow, "request-review", {
        from: "missing",
        event: "approve",
        to: "approved",
      }),
    ).toThrow("unknown source state");
  });
});
