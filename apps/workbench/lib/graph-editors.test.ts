import { describe, expect, it } from "vitest";

import {
  addDomainEntity,
  addDomainField,
  addDomainIndex,
  addDomainRelation,
  addFlowTransition,
  setDomainFieldOptions,
  setFlowTransitionEffects,
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
    expect(() =>
      addDomainField(workbenchGraph.domain, "request", {
        key: "category",
        type: "enum",
        required: true,
        values: [],
      }),
    ).toThrow("requires at least one value");
    expect(() =>
      addDomainField(workbenchGraph.domain, "request", {
        key: `f${"a".repeat(128)}`,
        type: "string",
        required: false,
      }),
    ).toThrow("invalid");
  });

  it("adds an entity, index, and relation only when their domain references exist", () => {
    const withVendor = addDomainEntity(workbenchGraph.domain, {
      key: "vendor",
      label: "Vendor",
      fields: [{ key: "name", type: "string", required: true }],
      indexes: [],
    });
    const indexed = addDomainIndex(withVendor, "vendor", {
      fields: ["name"],
      unique: true,
    });
    const related = addDomainRelation(indexed, {
      from: "request",
      to: "vendor",
      kind: "many-to-one",
    });

    expect(related.entities.map((entity) => entity.key)).toContain("vendor");
    expect(
      related.entities.find((entity) => entity.key === "vendor")?.indexes,
    ).toEqual([{ fields: ["name"], unique: true }]);
    expect(related.relations).toContainEqual({
      from: "request",
      to: "vendor",
      kind: "many-to-one",
    });
    expect(
      workbenchGraph.domain.entities.map((entity) => entity.key),
    ).not.toContain("vendor");
    expect(() =>
      addDomainIndex(workbenchGraph.domain, "request", { fields: ["missing"] }),
    ).toThrow("unknown field");
    expect(() =>
      addDomainIndex(workbenchGraph.domain, "request", { fields: [] }),
    ).toThrow("at least one field");
    expect(() =>
      addDomainEntity(workbenchGraph.domain, {
        key: "invalid-index",
        label: "Invalid index",
        fields: [{ key: "name", type: "string", required: true }],
        indexes: [{ fields: [] }],
      }),
    ).toThrow("at least one field");
  });

  it("changes a field's declared options without retaining enum values on another type", () => {
    const enumField = setDomainFieldOptions(
      workbenchGraph.domain,
      "request",
      "title",
      { type: "enum", values: ["standard", "priority"], unique: true },
    );
    const textField = setDomainFieldOptions(enumField, "request", "title", {
      type: "text",
      required: false,
    });

    expect(
      textField.entities[0]?.fields.find((field) => field.key === "title"),
    ).toEqual({
      key: "title",
      type: "text",
      required: false,
      unique: true,
    });
  });

  it("adds and removes one PolicyModel action without changing other actions", () => {
    const granted = setPolicyAction(
      workbenchGraph.policy,
      "manager",
      "request",
      "audit",
      true,
    );
    const manager = granted.permissions.find(
      (entry) => entry.role === "manager",
    );
    expect(manager?.actions).toEqual(["approve", "audit", "read"]);

    const revoked = setPolicyAction(
      granted,
      "manager",
      "request",
      "approve",
      false,
    );
    expect(
      revoked.permissions.find((entry) => entry.role === "manager")?.actions,
    ).toEqual(["audit", "read"]);
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

  it("attaches Flow effects only from a declared capability and operation", () => {
    const flow = setFlowTransitionEffects(
      workbenchGraph.flow,
      "request-review",
      "draft",
      "submit",
      [{ capability: "notification.email", operation: "send" }],
      [{ key: "notification.email", providerId: "factory", operation: "send" }],
    );

    expect(flow.flows[0]?.transitions[0]?.effects).toEqual([
      { capability: "notification.email", operation: "send" },
    ]);
    expect(() =>
      setFlowTransitionEffects(
        workbenchGraph.flow,
        "request-review",
        "draft",
        "submit",
        [{ capability: "notification.email", operation: "fetch" }],
        [
          {
            key: "notification.email",
            providerId: "factory",
            operation: "send",
          },
        ],
      ),
    ).toThrow("not declared");
  });
});
