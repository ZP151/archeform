import { describe, expect, it } from "vitest";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  type CompositionPlanV1,
  type ProductBlueprintV1,
} from "@factory/graph";
import * as capabilities from "../src/index.js";
import { appointmentBookingV1Prompt } from "./product-fixtures.js";

function fixture() {
  const { requirement, blueprint } = appointmentBookingV1Prompt();
  for (const actor of blueprint.actors.slice(0, 2)) {
    actor.permissions.push({
      entityKey: "schedule",
      actions: ["read-availability"],
    });
  }
  const baseDraft = createBlankApplicationDraft({
    applicationId: "appointment-workspace",
    workspaceId: "local-workspace",
    name: "Appointment workspace",
  });
  return { requirement, blueprint, baseDraft };
}

function planned() {
  const input = fixture();
  return {
    ...input,
    plan: capabilities.planProductAlternatives(input)[0]!.plan,
  };
}

describe("Appointment V2 exact admission", () => {
  it("exports a separate witness and retains V1 identity", () => {
    expect(capabilities.isAppointmentConsumerWorkspaceBlueprint).toBeTypeOf(
      "function",
    );
    const { blueprint } = fixture();
    expect(
      capabilities.isAppointmentConsumerWorkspaceBlueprint(blueprint),
    ).toBe(true);
    expect(capabilities.isAppointmentBookingBlueprint(blueprint)).toBe(false);
    const v1 = appointmentBookingV1Prompt().blueprint;
    expect(capabilities.isAppointmentBookingBlueprint(v1)).toBe(true);
    expect(capabilities.isAppointmentConsumerWorkspaceBlueprint(v1)).toBe(
      false,
    );
  });

  it("plans and composes the full witness with current locks and 17 owner bindings", () => {
    const input = fixture();
    const alternatives = capabilities.planProductAlternatives(input);
    expect(alternatives.map(({ key }) => key)).toEqual(["standard", "minimal"]);
    for (const { plan } of alternatives) {
      expect(
        plan.capabilityLocks.map(({ key, version }) => `${key}@${version}`),
      ).toEqual([
        "core.crud@1.0.1",
        "core.workflow@1.0.1",
        "core.identity-policy@1.0.0",
        "core.policy-declarations@1.0.0",
        "core.audit@1.0.2",
        "core.notification@1.1.1",
        "scheduling.appointment@1.0.1",
      ]);
      expect(plan.capabilityLocks[6]!.manifestDigest).toBe(
        "sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7",
      );
      expect(
        plan.graphBindings
          .filter(
            ({ capabilityKey }) => capabilityKey === "scheduling.appointment",
          )
          .map(({ inputKey, graphSymbol }) => [inputKey, graphSymbol]),
      ).toEqual([
        ["serviceEntity", "graph.domain.service"],
        ["serviceNameField", "graph.domain.service.name"],
        ["serviceDurationMinutesField", "graph.domain.service.durationMinutes"],
        ["serviceActiveField", "graph.domain.service.active"],
        ["scheduleEntity", "graph.domain.schedule"],
        ["scheduleServiceReferenceField", "graph.domain.schedule.serviceId"],
        ["scheduleStartField", "graph.domain.schedule.startUtc"],
        ["scheduleEndField", "graph.domain.schedule.endUtc"],
        ["scheduleTimezoneField", "graph.domain.schedule.timezone"],
        ["scheduleCapacityField", "graph.domain.schedule.capacity"],
        ["scheduleStatusField", "graph.domain.schedule.status"],
        ["appointmentEntity", "graph.domain.appointment"],
        [
          "appointmentScheduleReferenceField",
          "graph.domain.appointment.scheduleId",
        ],
        [
          "appointmentCustomerNameField",
          "graph.domain.appointment.customerName",
        ],
        ["appointmentNotesField", "graph.domain.appointment.notes"],
        [
          "appointmentCancellationReasonField",
          "graph.domain.appointment.cancellationReason",
        ],
        ["appointmentStatusField", "graph.domain.appointment.status"],
      ]);
      const { diff } = capabilities.composeProductDraft({ ...input, plan });
      const graph = applyGraphDiffToDraft(input.baseDraft, diff).graph;
      expect(
        graph.policy.permissions.filter(({ actions }) =>
          actions.includes("read-availability"),
        ),
      ).toEqual([
        {
          role: "customer",
          resource: "schedule",
          actions: ["read-availability"],
        },
        { role: "staff", resource: "schedule", actions: ["read-availability"] },
      ]);
      expect(
        graph.domain.entities
          .find(({ key }) => key === "schedule")!
          .fields.find(({ key }) => key === "capacity")!.numericDomain,
      ).toEqual({
        apiVersion: "factory.numeric-field-domain/v1",
        minimum: { value: 0, inclusive: false },
      });
      expect(
        capabilities.matchExactConsumerFamilyPlan(
          input.blueprint,
          input.baseDraft.graph.metadata.id,
          plan,
        ),
      ).toBe("appointment");
    }
  });

  it("uses structure and owner bindings when labels and unambiguous keys change", () => {
    const input = fixture();
    const names: Record<string, string> = {
      service: "offering",
      schedule: "slot",
      appointment: "reservation",
    };
    input.blueprint.title = "Unrelated product title";
    for (const entity of input.blueprint.entities) {
      entity.key = names[entity.key]!;
      entity.label = "Different label";
      for (const field of entity.fields) {
        if (field.referenceTo) field.referenceTo = names[field.referenceTo]!;
      }
    }
    input.blueprint.entities[0]!.fields[0]!.key = "displayName";
    for (const actor of input.blueprint.actors)
      for (const permission of actor.permissions)
        permission.entityKey = names[permission.entityKey]!;
    for (const workflow of input.blueprint.workflows)
      workflow.entityKey = names[workflow.entityKey]!;
    for (const page of input.blueprint.pageIntents)
      if (page.entityKey) page.entityKey = names[page.entityKey]!;
    expect(
      capabilities.isAppointmentConsumerWorkspaceBlueprint(input.blueprint),
    ).toBe(true);
    const plan = capabilities.planProductAlternatives(input)[0]!.plan;
    expect(
      plan.graphBindings.find((b) => b.inputKey === "serviceNameField")!
        .graphSymbol,
    ).toBe("graph.domain.offering.displayName");
    expect(() =>
      capabilities.composeProductDraft({ ...input, plan }),
    ).not.toThrow();
  });

  it("rejects availability outside the complete witness even without numeric domains", () => {
    const input = fixture();
    for (const entity of input.blueprint.entities)
      for (const field of entity.fields) delete field.numericDomain;
    expect(
      capabilities.isAppointmentConsumerWorkspaceBlueprint(input.blueprint),
    ).toBe(false);
    expect(() => capabilities.planProductAlternatives(input)).toThrow(
      /Availability reads/,
    );
  });

  it("requires every current lock coordinate and every ordered binding", () => {
    const input = planned();
    const keys = input.plan.capabilityLocks.map(({ key }) => key);
    expect(
      capabilities.isAppointmentConsumerWorkspaceBlueprint(
        input.blueprint,
        keys,
      ),
    ).toBe(true);
    expect(
      capabilities.isAppointmentConsumerWorkspaceBlueprint(
        input.blueprint,
        [...keys].reverse(),
      ),
    ).toBe(false);
    for (let index = 0; index < input.plan.capabilityLocks.length; index++) {
      for (const coordinate of ["version", "manifestDigest"] as const) {
        const plan = structuredClone(input.plan);
        plan.capabilityLocks[index]![coordinate] =
          coordinate === "version" ? "9.9.9" : "sha256:" + "0".repeat(64);
        expect(
          () => capabilities.composeProductDraft({ ...input, plan }),
          keys[index] + " " + coordinate,
        ).toThrow();
      }
    }
    for (let index = 0; index < input.plan.graphBindings.length; index++) {
      const plan = structuredClone(input.plan);
      plan.graphBindings[index]!.graphSymbol = "graph.domain.unbound.unbound";
      const selections = capabilities.composeProductIntegration(plan);
      plan.proposedOperations.find(
        (op) => op.path === "/integration/compositionSelections",
      )!.value = selections;
      expect(
        () => capabilities.composeProductDraft({ ...input, plan }),
        input.plan.graphBindings[index]!.inputKey,
      ).toThrow();
    }
  });

  const mutations: [string, (blueprint: ProductBlueprintV1) => void][] = [
    [
      "missing customer grant",
      (b) => {
        b.actors[0]!.permissions.pop();
      },
    ],
    [
      "missing staff grant",
      (b) => {
        b.actors[1]!.permissions.pop();
      },
    ],
    [
      "wrong owner",
      (b) => {
        b.actors[0]!.permissions[1]!.entityKey = "service";
      },
    ],
    [
      "broadened actions",
      (b) => {
        b.actors[1]!.permissions[1]!.actions.push("read");
      },
    ],
    [
      "extra permission",
      (b) => {
        b.actors[0]!.permissions.push({
          entityKey: "service",
          actions: ["read"],
        });
      },
    ],
    [
      "permission order",
      (b) => {
        b.actors[0]!.permissions.reverse();
      },
    ],
    [
      "administrator grant",
      (b) => {
        b.actors[2]!.permissions[1]!.actions.push("read-availability");
      },
    ],
    [
      "role order",
      (b) => {
        b.actors.reverse();
      },
    ],
    [
      "role key",
      (b) => {
        b.actors[0]!.key = "guest";
      },
    ],
    [
      "entity order",
      (b) => {
        b.entities.reverse();
      },
    ],
    [
      "field order",
      (b) => {
        b.entities[1]!.fields.reverse();
      },
    ],
    [
      "ambiguous datetime keys",
      (b) => {
        b.entities[1]!.fields[1]!.key = "arrival";
      },
    ],
    [
      "ambiguous text keys",
      (b) => {
        b.entities[2]!.fields[2]!.key = "comment";
      },
    ],
    [
      "reference owner",
      (b) => {
        b.entities[2]!.fields[0]!.referenceTo = "service";
      },
    ],
    [
      "numeric domain",
      (b) => {
        b.entities[1]!.fields[4]!.numericDomain!.minimum!.inclusive = true;
      },
    ],
    [
      "flow order",
      (b) => {
        b.workflows[0]!.transitions.reverse();
      },
    ],
    [
      "page order",
      (b) => {
        b.pageIntents.reverse();
      },
    ],
  ];
  it.each(mutations)("rejects %s at the witness and planner", (_, mutate) => {
    const input = fixture();
    mutate(input.blueprint);
    expect(
      capabilities.isAppointmentConsumerWorkspaceBlueprint(input.blueprint),
    ).toBe(false);
    expect(() => capabilities.planProductAlternatives(input)).toThrow();
  });

  const planMutations: [string, (plan: CompositionPlanV1) => void][] = [
    [
      "lock order",
      (p) => {
        p.capabilityLocks.reverse();
      },
    ],
    [
      "missing lock",
      (p) => {
        p.capabilityLocks.pop();
      },
    ],
    [
      "stale version",
      (p) => {
        p.capabilityLocks[6]!.version = "1.0.0";
      },
    ],
    [
      "stale digest",
      (p) => {
        p.capabilityLocks[6]!.manifestDigest = `sha256:${"0".repeat(64)}`;
      },
    ],
    [
      "binding order",
      (p) => {
        p.graphBindings.reverse();
      },
    ],
    [
      "missing binding",
      (p) => {
        p.graphBindings.pop();
      },
    ],
    [
      "wrong field owner",
      (p) => {
        p.graphBindings.find(
          (b) => b.inputKey === "appointmentNotesField",
        )!.graphSymbol = "graph.domain.service.name";
      },
    ],
    [
      "rebound field",
      (p) => {
        p.graphBindings.find(
          (b) => b.inputKey === "scheduleStartField",
        )!.graphSymbol = "graph.domain.schedule.endUtc";
      },
    ],
    [
      "wrong notification role",
      (p) => {
        p.graphBindings.find(
          (b) => b.inputKey === "recipientRole",
        )!.graphSymbol = "graph.policy.administrator";
      },
    ],
  ];
  it.each(planMutations)(
    "rejects tampered %s even with updated selection operations",
    (_, mutate) => {
      const input = planned();
      mutate(input.plan);
      // A caller can recompute ordinary integration operations; the exact V2
      // contract must reject altered bindings independently of this checksum.
      try {
        const selections = capabilities.composeProductIntegration(input.plan);
        input.plan.proposedOperations.find(
          (op) => op.path === "/integration/compositionSelections",
        )!.value = selections;
      } catch {
        /* Malformed integration is already denied. */
      }
      expect(() => capabilities.composeProductDraft(input)).toThrow();
    },
  );
});
