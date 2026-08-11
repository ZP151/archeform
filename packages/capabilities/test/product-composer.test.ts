import { describe, expect, it } from "vitest";

import {
  applyGraphDiffToDraft,
  assertProductBlueprint,
  createBlankApplicationDraft,
  hashProductCompositionDiff,
  type DraftRevisionV1,
} from "@factory/graph";

import {
  composeProductDraft,
  composeProductIntegration,
  planProductAlternatives,
} from "../src/index.js";
import {
  appointmentBookingPrompt,
  expenseApprovalPrompt,
} from "./product-fixtures.js";

function blankDraft(applicationId: string, name: string): DraftRevisionV1 {
  return createBlankApplicationDraft({
    applicationId,
    workspaceId: "local-workspace",
    name,
  });
}

describe("composeProductDraft", () => {
  it("composes Prompt A from a blank Draft into a valid product revision", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const [alternative] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    const { diff, checksum } = composeProductDraft({
      plan: alternative.plan,
      blueprint,
      baseDraft: base,
    });
    expect(checksum).toBe(hashProductCompositionDiff(diff));

    const composed = applyGraphDiffToDraft(base, diff);
    expect(composed.status).toBe("draft");
    expect(composed.revision).toBe(base.revision + 1);
    expect(composed.graph.metadata.name).toBe("Expense Approval");
    expect(composed.graph.metadata.id).toBe("expense-approval");
    expect(composed.graph.page.pages.map((p) => p.route)).toEqual([
      "/expense-dashboard",
      "/expense-form",
      "/expense-queue",
      "/expense-list",
    ]);
    expect(composed.graph.page.navigation).toEqual([
      {
        id: "nav-expense-dashboard",
        label: "Expense dashboard",
        pageId: "expense-dashboard",
        icon: "layout-grid",
      },
      {
        id: "nav-expense-queue",
        label: "Approval queue",
        pageId: "expense-queue",
        icon: "inbox",
      },
      {
        id: "nav-expense-list",
        label: "Expense",
        pageId: "expense-list",
        icon: "list",
      },
    ]);
    expect(composed.graph.domain.entities.map((e) => e.key)).toEqual([
      "expense",
      "expense-approval-principal",
      "expense-approval-session",
    ]);
    const expense = composed.graph.domain.entities[0];
    expect(expense.fields.map((f) => [f.key, f.type])).toEqual([
      ["amount", "decimal"],
      ["category", "enum"],
      ["incurredOn", "date"],
      ["receipt", "url"],
      ["notes", "text"],
      ["status", "enum"],
    ]);
    expect(composed.graph.domain.relations).toEqual([
      {
        from: "expense-approval-session",
        to: "expense-approval-principal",
        kind: "many-to-one",
        field: "subjectRef",
      },
    ]);
    expect(composed.graph.policy.roles).toEqual([
      "employee",
      "manager",
      "finance",
    ]);
    expect(composed.graph.policy.permissions).toEqual([
      {
        role: "employee",
        resource: "expense",
        actions: ["create", "read", "submit"],
      },
      {
        role: "employee",
        resource: "expense-approval-principal",
        actions: ["read"],
      },
      {
        role: "employee",
        resource: "expense-approval-session",
        actions: ["create", "read", "update"],
      },
      {
        role: "manager",
        resource: "expense",
        actions: ["read", "approve", "reject"],
      },
      {
        role: "manager",
        resource: "expense-approval-principal",
        actions: ["read"],
      },
      {
        role: "manager",
        resource: "expense-approval-session",
        actions: ["read"],
      },
      { role: "finance", resource: "expense", actions: ["read", "audit"] },
      {
        role: "finance",
        resource: "expense-approval-principal",
        actions: ["read"],
      },
      {
        role: "finance",
        resource: "expense-approval-session",
        actions: ["read"],
      },
    ]);
    const flow = composed.graph.flow.flows[0];
    expect(flow).toMatchObject({
      id: "expense-approval",
      entity: "expense",
      initialState: "draft",
      states: ["draft", "submitted", "approved", "rejected"],
      events: ["submit", "approve", "reject"],
    });
    expect(
      flow.transitions.find((t) => t.event === "approve")?.effects,
    ).toEqual([
      { capability: "audit.record", operation: "record" },
      { capability: "notification.send", operation: "send" },
    ]);
    expect(composed.graph.domain.seedData).toEqual([
      {
        entity: "expense",
        id: "sample-expense",
        values: {
          amount: 125.5,
          category: "travel",
          incurredOn: "2026-08-01",
          receipt: "sample-receipt.pdf",
          notes: "Sample Notes detail",
          status: "draft",
        },
      },
    ]);
    expect(composed.graph.integration.compositionSelections).toHaveLength(6);
  });

  it("composes Prompt B with materially different pages, entities, roles, and flows", () => {
    const { requirement, blueprint } = appointmentBookingPrompt();
    const base = blankDraft("appointment-booking", "Appointment Booking");
    const [alternative] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    const { diff } = composeProductDraft({
      plan: alternative.plan,
      blueprint,
      baseDraft: base,
    });
    const composed = applyGraphDiffToDraft(base, diff);

    expect(composed.graph.metadata.name).toBe("Appointment Booking");
    expect(
      composed.graph.page.pages.map((p) => [p.id, p.route, p.title]),
    ).toEqual([
      ["appointment-calendar", "/appointment-calendar", "Appointment calendar"],
      ["appointment-form", "/appointment-form", "New appointment"],
      ["service-list", "/service-list", "Services"],
      ["appointment-list", "/appointment-list", "Appointment"],
      ["schedule-list", "/schedule-list", "Schedule"],
    ]);
    expect(composed.graph.page.navigation.map((n) => n.icon)).toEqual([
      "calendar",
      "list",
      "list",
      "list",
    ]);
    expect(composed.graph.domain.entities.map((e) => e.key)).toEqual([
      "service",
      "appointment",
      "schedule",
      "appointment-booking-principal",
      "appointment-booking-session",
    ]);
    expect(composed.graph.domain.relations).toEqual([
      {
        from: "appointment",
        to: "service",
        kind: "many-to-one",
        field: "serviceRefId",
      },
      {
        from: "appointment-booking-session",
        to: "appointment-booking-principal",
        kind: "many-to-one",
        field: "subjectRef",
      },
    ]);
    expect(composed.graph.policy.roles).toEqual([
      "customer",
      "staff",
      "administrator",
    ]);
    const flow = composed.graph.flow.flows[0];
    expect(flow).toMatchObject({
      id: "appointment-lifecycle",
      initialState: "requested",
      states: ["requested", "confirmed", "cancelled"],
      events: ["confirm", "cancel", "reschedule"],
    });
    // No approval decision exists, so no audit effects are derived; the
    // audit package is still locked to satisfy identity-policy's interface.
    for (const transition of flow.transitions) {
      expect(transition.effects).toBeUndefined();
    }
    expect(composed.graph.integration.compositionSelections).toHaveLength(6);
  });

  it("normalizes a semantic reference name to an explicit id scalar before compilation", () => {
    const { requirement, blueprint: baseBlueprint } = expenseApprovalPrompt();
    const blueprint = assertProductBlueprint({
      ...baseBlueprint,
      entities: [
        ...baseBlueprint.entities,
        {
          key: "user",
          label: "User",
          fields: [
            {
              key: "email",
              label: "Email",
              type: "text",
              required: true,
            },
          ],
        },
        {
          key: "audit-log",
          label: "Audit log",
          fields: [
            {
              key: "performedBy",
              label: "Performed by",
              type: "reference",
              required: true,
              referenceTo: "user",
            },
          ],
        },
      ],
    });
    const base = blankDraft("expense-audit", "Expense Audit");
    const [alternative] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });
    const { diff } = composeProductDraft({
      plan: alternative.plan,
      blueprint,
      baseDraft: base,
    });
    const composed = applyGraphDiffToDraft(base, diff);

    expect(
      composed.graph.domain.entities
        .find((entity) => entity.key === "audit-log")
        ?.fields.map((field) => field.key),
    ).toContain("performedById");
    expect(composed.graph.domain.relations).toContainEqual({
      from: "audit-log",
      to: "user",
      kind: "many-to-one",
      field: "performedById",
    });
  });

  it("produces different composed products for the two prompts", () => {
    const promptA = expenseApprovalPrompt();
    const promptB = appointmentBookingPrompt();
    const baseA = blankDraft("expense-approval", "Expense Approval");
    const baseB = blankDraft("appointment-booking", "Appointment Booking");
    const [planA] = planProductAlternatives({ ...promptA, baseDraft: baseA });
    const [planB] = planProductAlternatives({ ...promptB, baseDraft: baseB });

    const diffA = composeProductDraft({
      plan: planA.plan,
      blueprint: promptA.blueprint,
      baseDraft: baseA,
    });
    const diffB = composeProductDraft({
      plan: planB.plan,
      blueprint: promptB.blueprint,
      baseDraft: baseB,
    });
    expect(diffA.checksum).not.toBe(diffB.checksum);
    expect(diffA.diff).not.toEqual(diffB.diff);

    const graphA = applyGraphDiffToDraft(baseA, diffA.diff).graph;
    const graphB = applyGraphDiffToDraft(baseB, diffB.diff).graph;
    expect(graphA.page.pages.map((p) => p.id)).not.toEqual(
      graphB.page.pages.map((p) => p.id),
    );
    expect(graphA.domain.entities.map((e) => e.key)).not.toEqual(
      graphB.domain.entities.map((e) => e.key),
    );
    expect(graphA.domain.entities[0].fields.map((f) => f.key)).not.toEqual(
      graphB.domain.entities[0].fields.map((f) => f.key),
    );
    expect(graphA.policy.roles).not.toEqual(graphB.policy.roles);
    expect(graphA.flow.flows.map((f) => f.id)).not.toEqual(
      graphB.flow.flows.map((f) => f.id),
    );
    // Both prompts lock the same dependency-closed capability set; the
    // selection bindings (entities, routes, roles) differ materially.
    expect(
      graphA.integration.compositionSelections?.map((s) => s.lock.key),
    ).toEqual(graphB.integration.compositionSelections?.map((s) => s.lock.key));
    expect(
      graphA.integration.compositionSelections?.map((s) => s.bindings),
    ).not.toEqual(
      graphB.integration.compositionSelections?.map((s) => s.bindings),
    );
  });

  it("composes the minimal alternative with the closed required set", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const [, minimal] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    const { diff } = composeProductDraft({
      plan: minimal.plan,
      blueprint,
      baseDraft: base,
    });
    const composed = applyGraphDiffToDraft(base, diff);
    // `core.audit` is part of the closed required set (identity-policy's
    // provider), so even minimal carries it; notification stays optional.
    expect(
      composed.graph.integration.compositionSelections?.map((s) => s.lock.key),
    ).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
      "core.audit",
    ]);
    // The expense blueprint has an approval decision, so its minimal flows
    // record audit events; notification effects remain unselected.
    expect(composed.graph.flow.flows[0].transitions[0].effects).toEqual([
      { capability: "audit.record", operation: "record" },
    ]);
    expect(composed.graph.flow.flows[0].transitions[0].effects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ capability: "notification.send" }),
      ]),
    );
  });

  it("rejects stale checksums, altered plans, and non-blank derivation input", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const [alternative] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    const staleBlueprint = {
      ...blueprint,
      requirementChecksum:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    expect(() =>
      composeProductDraft({
        plan: alternative.plan,
        blueprint: staleBlueprint,
        baseDraft: base,
      }),
    ).toThrow(/checksum/i);

    const tamperedPlan = {
      ...alternative.plan,
      proposedOperations: alternative.plan.proposedOperations.slice(0, -1),
    };
    expect(() =>
      composeProductDraft({ plan: tamperedPlan, blueprint, baseDraft: base }),
    ).toThrow();

    const otherBase = blankDraft("expense-approval", "Different name");
    expect(() =>
      composeProductDraft({
        plan: alternative.plan,
        blueprint,
        baseDraft: otherBase,
      }),
    ).toThrow(/draft/i);
  });

  it("never composes a plan whose locks or bindings are inconsistent", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const [alternative] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    const unknownLock = {
      ...alternative.plan,
      capabilityLocks: [
        ...alternative.plan.capabilityLocks,
        {
          key: "core.fabricated",
          version: "9.9.9",
          manifestDigest:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
    };
    expect(() => composeProductIntegration(unknownLock)).toThrow(
      /catalogue|unknown/i,
    );

    const missingBinding = {
      ...alternative.plan,
      graphBindings: alternative.plan.graphBindings.filter(
        (b) =>
          !(b.capabilityKey === "core.audit" && b.inputKey === "actorRole"),
      ),
    };
    expect(() => composeProductIntegration(missingBinding)).toThrow(/binding/i);
  });

  it("rejects blueprints that carry package, route, or URL material", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const withPackage = {
      ...blueprint,
      capabilityLocks: [{ key: "core.crud", version: "1.0.1" }],
    };
    expect(() => assertProductBlueprint(withPackage)).toThrow();
    const withRoute = {
      ...blueprint,
      title: "Expense portal at https://evil.example",
    };
    expect(() => assertProductBlueprint(withRoute)).toThrow();
  });
});
