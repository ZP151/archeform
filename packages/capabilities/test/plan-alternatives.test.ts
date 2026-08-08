import { describe, expect, it } from "vitest";

import {
  applyGraphDiffToDraft,
  assertCompositionPlan,
  createBlankApplicationDraft,
  hashApplicationGraph,
  hashRequirementSpec,
  type CompositionPlanV1,
  type DraftRevisionV1,
} from "@factory/graph";

import { currentCapabilityAssets } from "../src/assets/index.js";
import { currentCapabilityCatalogue } from "../src/index.js";
import { planProductAlternatives } from "../src/index.js";
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

function planKeys(plan: CompositionPlanV1): readonly string[] {
  return plan.capabilityLocks.map((lock) => lock.key);
}

describe("planProductAlternatives", () => {
  it("proposes standard and minimal alternatives for Prompt A", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const alternatives = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    expect(alternatives.map((a) => a.key)).toEqual(["standard", "minimal"]);
    expect(alternatives.map((a) => a.label).length).toBe(2);
    for (const { plan } of alternatives) {
      expect(() => assertCompositionPlan(plan)).not.toThrow();
      expect(plan.planId).toMatch(/^expense-approval-(standard|minimal)$/);
      expect(plan.requirementChecksum).toBe(hashRequirementSpec(requirement));
      expect(plan.draftBaseChecksum).toBe(hashApplicationGraph(base.graph));
      // A plan may never carry derived page routes.
      for (const op of plan.proposedOperations) {
        expect(op.path.startsWith("/page/pages/")).toBe(false);
      }
    }

    const standard = alternatives[0].plan;
    const minimal = alternatives[1].plan;
    expect(planKeys(standard)).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
      "core.audit",
      "core.notification",
    ]);
    expect(planKeys(minimal)).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
    ]);
    // The alternatives differ in their declared graph changes too.
    expect(standard.proposedOperations).not.toEqual(minimal.proposedOperations);
  });

  it("binds every lock to an approved, digest-matched asset version", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const alternatives = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    for (const { plan } of alternatives) {
      for (const lock of plan.capabilityLocks) {
        const asset = currentCapabilityAssets.find(
          (candidate) =>
            candidate.manifest.key === lock.key &&
            candidate.manifest.version === lock.version,
        );
        expect(
          asset,
          `no approved asset for ${lock.key}@${lock.version}`,
        ).toBeDefined();
        expect(lock.manifestDigest).toBe(asset!.manifest.manifestDigest);
      }
    }
  });

  it("binds graph symbols for every selected capability", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const [standard] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });

    const bindings = standard.plan.graphBindings;
    const forLock = (key: string) =>
      bindings.filter((b) => b.capabilityKey === key);
    expect(forLock("core.crud")).toEqual([
      {
        capabilityKey: "core.crud",
        inputKey: "entityKey",
        graphSymbol: "graph.domain.expense",
      },
      {
        capabilityKey: "core.crud",
        inputKey: "routeKey",
        graphSymbol: "graph.page.expense-list",
      },
    ]);
    expect(forLock("core.workflow")).toEqual([
      {
        capabilityKey: "core.workflow",
        inputKey: "flowKey",
        graphSymbol: "graph.flow.expense-approval",
      },
    ]);
    expect(forLock("core.identity-policy")).toEqual([
      {
        capabilityKey: "core.identity-policy",
        inputKey: "principalEntity",
        graphSymbol: "graph.domain.expense-approval-principal",
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "sessionEntity",
        graphSymbol: "graph.domain.expense-approval-session",
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "defaultRole",
        graphSymbol: "graph.policy.employee",
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "authenticatedRole",
        graphSymbol: "graph.policy.manager",
      },
    ]);
    expect(forLock("core.audit")).toEqual([
      {
        capabilityKey: "core.audit",
        inputKey: "actorRole",
        graphSymbol: "graph.policy.manager",
      },
    ]);
    expect(forLock("core.notification")).toEqual([
      {
        capabilityKey: "core.notification",
        inputKey: "recipientRole",
        graphSymbol: "graph.policy.employee",
      },
    ]);
  });

  it("omits audit (no approval decision) for Prompt B and differs from Prompt A", () => {
    const promptA = expenseApprovalPrompt();
    const promptB = appointmentBookingPrompt();
    const baseA = blankDraft("expense-approval", "Expense Approval");
    const baseB = blankDraft("appointment-booking", "Appointment Booking");

    const [standardB, minimalB] = planProductAlternatives({
      requirement: promptB.requirement,
      blueprint: promptB.blueprint,
      baseDraft: baseB,
    });
    expect(planKeys(standardB.plan)).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
      "core.notification",
    ]);
    expect(planKeys(minimalB.plan)).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
    ]);
    expect(standardB.plan.planId).toBe("appointment-booking-standard");

    const [standardA] = planProductAlternatives({
      requirement: promptA.requirement,
      blueprint: promptA.blueprint,
      baseDraft: baseA,
    });
    expect(planKeys(standardA.plan)).not.toEqual(planKeys(standardB.plan));
    expect(standardA.plan.proposedOperations).not.toEqual(
      standardB.plan.proposedOperations,
    );
    // Crud binds the first entity and its primary list page.
    const crudB = standardB.plan.graphBindings.filter(
      (b) => b.capabilityKey === "core.crud",
    );
    expect(crudB).toEqual([
      {
        capabilityKey: "core.crud",
        inputKey: "entityKey",
        graphSymbol: "graph.domain.service",
      },
      {
        capabilityKey: "core.crud",
        inputKey: "routeKey",
        graphSymbol: "graph.page.service-list",
      },
    ]);
  });

  it("collapses to a single alternative when nothing optional is triggered", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    const catalogue = {
      apiVersion: "factory.product-capability-catalogue/v1" as const,
      required: currentCapabilityCatalogue().required,
      optional: [],
    };
    const alternatives = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
      catalogue,
    });
    expect(alternatives).toHaveLength(1);
    expect(alternatives[0].key).toBe("standard");
  });

  it("rejects stale blueprints, mismatched requirements, and non-blank bases", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");

    const otherPrompt = appointmentBookingPrompt();
    // A blueprint whose requirement binding does not match the requirement
    // it is planned against.
    const staleBlueprint = {
      ...blueprint,
      requirementChecksum: hashRequirementSpec(otherPrompt.requirement),
    };
    expect(() =>
      planProductAlternatives({
        requirement,
        blueprint: staleBlueprint,
        baseDraft: base,
      }),
    ).toThrow(/checksum/i);
    expect(() =>
      planProductAlternatives({
        requirement: otherPrompt.requirement,
        blueprint,
        baseDraft: base,
      }),
    ).toThrow();

    const polluted = applyGraphDiffToDraft(base, {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        {
          op: "add",
          path: "/domain/entities/-",
          value: {
            key: "intruder",
            label: "Intruder",
            fields: [],
            indexes: [],
          },
        },
      ],
    });
    expect(() =>
      planProductAlternatives({
        requirement,
        blueprint,
        baseDraft: polluted,
      }),
    ).toThrow(/blank/i);
  });
});
