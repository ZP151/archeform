import { describe, expect, it } from "vitest";
import * as capabilities from "@factory/capabilities";
import { projectDefinitionSelection } from "../../adapters/src/requirements/definition-selection-catalogue.js";
import { canonicalTeamTaskInterpretation } from "../../adapters/src/requirements/task-definition-selection.js";

import {
  applyGraphDiffToDraft,
  assertCompositionPlan,
  assertProductBlueprint,
  createBlankApplicationDraft,
  hashApplicationGraph,
  hashRequirementSpec,
  matchServiceWorkOrdersBlueprintV1,
  matchCustomerRequestsBlueprintV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
} from "@factory/graph";

import { currentCapabilityAssets } from "../src/assets/index.js";
import { currentCapabilityCatalogue } from "../src/index.js";
import { planProductAlternatives } from "../src/index.js";
import {
  appointmentBookingPrompt,
  appointmentBookingV1Prompt,
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

describe("public exact consumer family plan matcher", () => {
  const families = [
    [
      "appointment-booking-v2",
      "appointment",
      "isAppointmentConsumerWorkspaceBlueprint",
    ],
    [
      "knowledge-resource-directory",
      "content-directory",
      "isContentDirectoryBlueprint",
    ],
    [
      "supplies-stockroom",
      "inventory-operations",
      "isInventoryOperationsBlueprint",
    ],
    [
      "facilities-service-desk",
      "service-work-orders",
      "matchServiceWorkOrdersBlueprintV1",
    ],
    [
      "customer-support-desk",
      "customer-requests",
      "matchCustomerRequestsBlueprintV1",
    ],
  ] as const;

  for (const [definitionKey, family, predicate] of families) {
    function accepted() {
      const { spec: requirement, blueprint } = projectDefinitionSelection({
        definitionKey,
        disposition: "supported-default",
        requirementId: "consumer-requirement",
        title: "Accepted business product",
        outcome: "Complete the accepted business operation.",
        materialQuestions: [],
        businessParameters: null,
      });
      const plan = planProductAlternatives({
        requirement,
        blueprint,
        baseDraft: blankDraft(requirement.requirementId, blueprint.title),
      }).find(({ key }) => key === "standard")!.plan;
      return { requirement, blueprint, plan };
    }

    it(`exports the shared ${family} predicate and matches its accepted projection`, () => {
      const { requirement, blueprint, plan } = accepted();
      expect(
        predicate === "matchServiceWorkOrdersBlueprintV1"
          ? !!matchServiceWorkOrdersBlueprintV1(blueprint)
          : predicate === "matchCustomerRequestsBlueprintV1"
            ? !!matchCustomerRequestsBlueprintV1(blueprint)
            : capabilities[predicate](blueprint),
      ).toBe(true);
      expect(
        capabilities.matchExactConsumerFamilyPlan(
          blueprint,
          requirement.requirementId,
          plan,
        ),
      ).toBe(family);
      const reorderProperties = <T>(value: T): T =>
        JSON.parse(
          JSON.stringify(value, (_key, item) =>
            item && typeof item === "object" && !Array.isArray(item)
              ? Object.fromEntries(Object.entries(item).reverse())
              : item,
          ),
        );
      expect(
        capabilities.matchExactConsumerFamilyPlan(
          assertProductBlueprint(reorderProperties(blueprint)),
          requirement.requirementId,
          reorderProperties(plan),
        ),
      ).toBe(family);
      expect(
        capabilities.matchExactConsumerFamilyPlan(
          blueprint,
          "database-graph-id",
          plan,
        ),
      ).toBeNull();
      plan.planId = "untrusted-display-identity";
      blueprint.title = "A differently named business";
      expect(
        capabilities.matchExactConsumerFamilyPlan(
          blueprint,
          requirement.requirementId,
          plan,
        ),
      ).toBe(family);
    });

    it(`rejects every changed ${family} lock coordinate and array shape`, () => {
      const { requirement, blueprint, plan } = accepted();
      const reject = (changed: CompositionPlanV1) =>
        expect(
          capabilities.matchExactConsumerFamilyPlan(
            blueprint,
            requirement.requirementId,
            changed,
          ),
        ).toBeNull();
      for (let index = 0; index < plan.capabilityLocks.length; index++) {
        for (const [field, value] of [
          ["key", "unapproved.capability"],
          ["version", "0.0.0"],
          ["manifestDigest", `sha256:${"0".repeat(64)}`],
        ] as const) {
          const changed = structuredClone(plan);
          changed.capabilityLocks[index]![field] = value;
          reject(changed);
        }
        const missing = structuredClone(plan);
        missing.capabilityLocks.splice(index, 1);
        reject(missing);
        const duplicate = structuredClone(plan);
        duplicate.capabilityLocks.splice(
          index,
          0,
          duplicate.capabilityLocks[index]!,
        );
        reject(duplicate);
      }
      const extra = structuredClone(plan);
      extra.capabilityLocks.push({
        ...extra.capabilityLocks[0]!,
        key: "unapproved.capability",
      });
      reject(extra);
      const reordered = structuredClone(plan);
      reordered.capabilityLocks.reverse();
      reject(reordered);
    });

    it(`rejects every changed ${family} binding coordinate and array shape`, () => {
      const { requirement, blueprint, plan } = accepted();
      const reject = (changed: CompositionPlanV1) =>
        expect(
          capabilities.matchExactConsumerFamilyPlan(
            blueprint,
            requirement.requirementId,
            changed,
          ),
        ).toBeNull();
      for (let index = 0; index < plan.graphBindings.length; index++) {
        for (const field of [
          "capabilityKey",
          "inputKey",
          "graphSymbol",
        ] as const) {
          const changed = structuredClone(plan);
          changed.graphBindings[index]![field] = "unapproved-symbol";
          reject(changed);
        }
        const missing = structuredClone(plan);
        missing.graphBindings.splice(index, 1);
        reject(missing);
        const duplicate = structuredClone(plan);
        duplicate.graphBindings.splice(
          index,
          0,
          duplicate.graphBindings[index]!,
        );
        reject(duplicate);
        const rebound = structuredClone(plan);
        rebound.graphBindings[index]!.graphSymbol =
          plan.graphBindings[
            (index + 1) % plan.graphBindings.length
          ]!.graphSymbol;
        if (
          rebound.graphBindings[index]!.graphSymbol !==
          plan.graphBindings[index]!.graphSymbol
        )
          reject(rebound);
      }
      const extra = structuredClone(plan);
      extra.graphBindings.push({
        ...extra.graphBindings[0]!,
        inputKey: "extra",
      });
      reject(extra);
      const reordered = structuredClone(plan);
      reordered.graphBindings.reverse();
      reject(reordered);
    });

    it(`rejects near-${family} structure despite accepted labels and plans`, () => {
      const { requirement, blueprint, plan } = accepted();
      const changed = structuredClone(blueprint);
      changed.entities[0]!.fields[0]!.required = false;
      expect(
        predicate === "matchServiceWorkOrdersBlueprintV1"
          ? !!matchServiceWorkOrdersBlueprintV1(changed)
          : predicate === "matchCustomerRequestsBlueprintV1"
            ? !!matchCustomerRequestsBlueprintV1(changed)
            : capabilities[predicate](changed),
      ).toBe(false);
      expect(
        capabilities.matchExactConsumerFamilyPlan(
          changed,
          requirement.requirementId,
          plan,
        ),
      ).toBeNull();
      for (const [otherKey] of families.filter(
        ([key]) => key !== definitionKey,
      )) {
        const other = projectDefinitionSelection({
          definitionKey: otherKey,
          disposition: "supported-default",
          requirementId: requirement.requirementId,
          title: blueprint.title,
          outcome: "Complete the accepted business operation.",
          materialQuestions: [],
          businessParameters: null,
        });
        expect(
          capabilities.matchExactConsumerFamilyPlan(
            other.blueprint,
            requirement.requirementId,
            plan,
          ),
        ).toBeNull();
      }
    });
  }

  it("keeps the old broad Appointment fixture outside the accepted families", () => {
    const { requirement, blueprint } = appointmentBookingPrompt();
    const [{ plan }] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: blankDraft(requirement.requirementId, blueprint.title),
    });
    expect(
      capabilities.matchExactConsumerFamilyPlan(
        blueprint,
        requirement.requirementId,
        plan,
      ),
    ).toBeNull();
  });
});

function safelyRenamedAppointmentV1() {
  const source = appointmentBookingV1Prompt();
  const requirement = structuredClone(source.requirement) as any;
  const blueprint = structuredClone(source.blueprint) as any;
  const entityKeys = ["offering", "slot", "booking"];
  const fieldKeys = [
    ["displayName", "minuteSpan", "published"],
    ["offeringRef", "startUtc", "endUtc", "zone", "seats", "availability"],
    ["slotRef", "personName", "notes", "cancellationReason", "state"],
  ];
  const oldEntityKeys = blueprint.entities.map((entity: any) => entity.key);
  const byOldEntity = new Map(
    oldEntityKeys.map((key: string, index: number) => [
      key,
      entityKeys[index]!,
    ]),
  );
  blueprint.entities.forEach((entity: any, entityIndex: number) => {
    entity.key = entityKeys[entityIndex]!;
    entity.fields.forEach((field: any, fieldIndex: number) => {
      field.key = fieldKeys[entityIndex]![fieldIndex]!;
      if (field.referenceTo)
        field.referenceTo = byOldEntity.get(field.referenceTo);
    });
  });
  blueprint.actors.forEach((actor: any) =>
    actor.permissions.forEach(
      (permission: any) =>
        (permission.entityKey = byOldEntity.get(permission.entityKey)),
    ),
  );
  blueprint.workflows[0].entityKey = "booking";
  blueprint.pageIntents.forEach((page: any) => {
    if (page.entityKey) page.entityKey = byOldEntity.get(page.entityKey);
  });
  requirement.domainConcepts.forEach(
    (concept: any, index: number) => (concept.key = entityKeys[index]!),
  );
  blueprint.title = "Arbitrary renamed product";
  blueprint.requirementChecksum = hashRequirementSpec(requirement);
  return { requirement, blueprint };
}

describe("planProductAlternatives", () => {
  it("selects the exact seven locks and all Appointment V1 bindings in both alternatives", () => {
    const { requirement, blueprint } = appointmentBookingV1Prompt();
    const alternatives = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: blankDraft(requirement.requirementId, blueprint.title),
    });

    expect(alternatives.map(({ key }) => key)).toEqual(["standard", "minimal"]);
    for (const { plan } of alternatives) {
      expect(
        plan.capabilityLocks.map(({ key, version, manifestDigest }) => ({
          key,
          version,
          manifestDigest,
        })),
      ).toEqual([
        {
          key: "core.crud",
          version: "1.0.1",
          manifestDigest:
            "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
        },
        {
          key: "core.workflow",
          version: "1.0.1",
          manifestDigest:
            "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
        },
        {
          key: "core.identity-policy",
          version: "1.0.0",
          manifestDigest:
            "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
        },
        {
          key: "core.policy-declarations",
          version: "1.0.0",
          manifestDigest:
            "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
        },
        {
          key: "core.audit",
          version: "1.0.2",
          manifestDigest:
            "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
        },
        {
          key: "core.notification",
          version: "1.1.1",
          manifestDigest:
            "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
        },
        {
          key: "scheduling.appointment",
          version: "1.0.1",
          manifestDigest:
            "sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7",
        },
      ]);
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
    }
  });

  it("selects Appointment from the complete structural witness after safe entity and field renames", () => {
    const { requirement, blueprint } = safelyRenamedAppointmentV1();
    const alternatives = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: blankDraft(requirement.requirementId, blueprint.title),
    });
    for (const { plan } of alternatives) {
      expect(planKeys(plan)).toContain("scheduling.appointment");
      expect(
        plan.graphBindings
          .filter(
            ({ capabilityKey }) => capabilityKey === "scheduling.appointment",
          )
          .map(({ inputKey, graphSymbol }) => [inputKey, graphSymbol]),
      ).toContainEqual([
        "scheduleServiceReferenceField",
        "graph.domain.slot.offeringRefId",
      ]);
      expect(
        plan.graphBindings
          .filter(
            ({ capabilityKey }) => capabilityKey === "scheduling.appointment",
          )
          .map(({ inputKey, graphSymbol }) => [inputKey, graphSymbol]),
      ).toContainEqual([
        "appointmentScheduleReferenceField",
        "graph.domain.booking.slotRefId",
      ]);
    }
  });

  it.each([
    [
      "reversed service relation",
      (blueprint: any) =>
        (blueprint.entities[1].fields[0].referenceTo =
          blueprint.entities[2].key),
    ],
    [
      "an extra business entity",
      (blueprint: any) =>
        blueprint.entities.push(structuredClone(blueprint.entities[0])),
    ],
    [
      "workflow drift",
      (blueprint: any) =>
        (blueprint.workflows[0].transitions[0].to = "cancelled"),
    ],
    [
      "permission drift",
      (blueprint: any) => blueprint.actors[1].permissions[0].actions.pop(),
    ],
    [
      "missing positive duration domain",
      (blueprint: any) => delete blueprint.entities[0].fields[1].numericDomain,
    ],
    [
      "an extra numeric domain",
      (blueprint: any) =>
        (blueprint.entities[0].fields[0].numericDomain = {
          apiVersion: "factory.numeric-field-domain/v1",
          minimum: { value: 0, inclusive: false },
        }),
    ],
    [
      "a numeric calculation",
      (blueprint: any) =>
        (blueprint.entities[0].fields[1].calculation = {
          apiVersion: "factory.quantity-unit-price-total/v1",
          quantityFieldKey: "durationMinutes",
          unitPriceFieldKey: "durationMinutes",
        }),
    ],
    [
      "changed optional-field requiredness",
      (blueprint: any) => (blueprint.entities[2].fields[2].required = true),
    ],
  ] as const)("fails closed for %s", (_label, mutate) => {
    const { requirement, blueprint } = appointmentBookingV1Prompt();
    const candidate = structuredClone(blueprint) as any;
    mutate(candidate);
    expect(() =>
      planProductAlternatives({
        requirement,
        blueprint: candidate,
        baseDraft: blankDraft(requirement.requirementId, candidate.title),
      }),
    ).toThrow();
  });

  it.each([
    [
      "renamed schedule start",
      (blueprint: any) => (blueprint.entities[1].fields[1].key = "beginsAt"),
    ],
    [
      "renamed schedule end",
      (blueprint: any) => (blueprint.entities[1].fields[2].key = "endsAt"),
    ],
    [
      "renamed appointment notes",
      (blueprint: any) =>
        (blueprint.entities[2].fields[2].key = "requestNotes"),
    ],
    [
      "renamed appointment cancellation reason",
      (blueprint: any) =>
        (blueprint.entities[2].fields[3].key = "cancellationText"),
    ],
    [
      "reordered schedule timestamps",
      (blueprint: any) =>
        ([blueprint.entities[1].fields[1], blueprint.entities[1].fields[2]] = [
          blueprint.entities[1].fields[2],
          blueprint.entities[1].fields[1],
        ]),
    ],
    [
      "reordered appointment optional text",
      (blueprint: any) =>
        ([blueprint.entities[2].fields[2], blueprint.entities[2].fields[3]] = [
          blueprint.entities[2].fields[3],
          blueprint.entities[2].fields[2],
        ]),
    ],
  ] as const)("rejects a fixed ambiguous slot with %s", (_label, mutate) => {
    const { requirement, blueprint } = appointmentBookingV1Prompt();
    const candidate = structuredClone(blueprint) as any;
    mutate(candidate);
    expect(() =>
      planProductAlternatives({
        requirement,
        blueprint: candidate,
        baseDraft: blankDraft(requirement.requirementId, candidate.title),
      }),
    ).toThrow();
  });

  it("assembles the canonical Task with the six existing locks and nine exact bindings", () => {
    const { spec, blueprint } = canonicalTeamTaskInterpretation();
    const [standard] = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft: blankDraft("team-board", "Team board"),
    });
    expect(
      standard.plan.capabilityLocks
        .map((lock) => lock.key + "@" + lock.version)
        .sort(),
    ).toEqual([
      "core.audit@1.0.2",
      "core.crud@1.0.1",
      "core.identity-policy@1.0.0",
      "core.notification@1.1.1",
      "core.policy-declarations@1.0.0",
      "core.workflow@1.0.1",
    ]);
    expect(
      standard.plan.graphBindings.map((b) => [
        b.capabilityKey,
        b.inputKey,
        b.graphSymbol,
      ]),
    ).toEqual([
      ["core.crud", "entityKey", "graph.domain.task"],
      ["core.crud", "routeKey", "graph.page.task-list"],
      ["core.workflow", "flowKey", "graph.flow.task-lifecycle"],
      [
        "core.identity-policy",
        "principalEntity",
        "graph.domain.team-board-principal",
      ],
      [
        "core.identity-policy",
        "sessionEntity",
        "graph.domain.team-board-session",
      ],
      ["core.identity-policy", "defaultRole", "graph.policy.member"],
      ["core.identity-policy", "authenticatedRole", "graph.policy.viewer"],
      ["core.audit", "actorRole", "graph.policy.member"],
      ["core.notification", "recipientRole", "graph.policy.member"],
    ]);
  });
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
      "core.audit",
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

  it("keeps Prompt B's plan dependency-closed and differs from Prompt A", () => {
    const promptA = expenseApprovalPrompt();
    const promptB = appointmentBookingPrompt();
    const baseA = blankDraft("expense-approval", "Expense Approval");
    const baseB = blankDraft("appointment-booking", "Appointment Booking");

    const [standardB, minimalB] = planProductAlternatives({
      requirement: promptB.requirement,
      blueprint: promptB.blueprint,
      baseDraft: baseB,
    });
    // `core.identity-policy` requires the `audit.event@v1` interface, so the
    // closed selection carries `core.audit` even without an approval
    // decision; a plan without it could never resolve into a lock.
    expect(planKeys(standardB.plan)).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
      "core.audit",
      "core.notification",
    ]);
    expect(planKeys(minimalB.plan)).toEqual([
      "core.crud",
      "core.workflow",
      "core.identity-policy",
      "core.policy-declarations",
      "core.audit",
    ]);
    expect(standardB.plan.planId).toBe("appointment-booking-standard");

    const [standardA] = planProductAlternatives({
      requirement: promptA.requirement,
      blueprint: promptA.blueprint,
      baseDraft: baseA,
    });
    // Both prompts lock the same closed capability set; the products differ
    // in their declared graph changes and bindings, not the package set.
    expect(standardA.plan.graphBindings).not.toEqual(
      standardB.plan.graphBindings,
    );
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

  it("binds the primary actor as the audit actor when no approver exists", () => {
    const { requirement, blueprint } = appointmentBookingPrompt();
    const base = blankDraft("appointment-booking", "Appointment Booking");
    const [standard] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft: base,
    });
    const auditBindings = standard.plan.graphBindings.filter(
      (binding) => binding.capabilityKey === "core.audit",
    );
    expect(auditBindings).toEqual([
      {
        capabilityKey: "core.audit",
        inputKey: "actorRole",
        graphSymbol: "graph.policy.customer",
      },
    ]);
  });

  it("rejects a plan whose selection cannot satisfy its requirements", () => {
    const { requirement, blueprint } = expenseApprovalPrompt();
    const base = blankDraft("expense-approval", "Expense Approval");
    // Dropping the audit provider while `core.identity-policy` remains
    // required can never resolve into a lock: the planner must fail at plan
    // time, before the plan is reviewed or accepted.
    const catalogue = {
      apiVersion: "factory.product-capability-catalogue/v1" as const,
      required: currentCapabilityCatalogue().required.filter(
        (asset) => asset.key !== "core.audit",
      ),
      optional: currentCapabilityCatalogue().optional,
    };
    expect(() =>
      planProductAlternatives({
        requirement,
        blueprint,
        baseDraft: base,
        catalogue,
      }),
    ).toThrow(/requires interface 'audit\.event@v1'/);
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
