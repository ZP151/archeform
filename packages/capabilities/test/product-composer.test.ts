import { describe, expect, it } from "vitest";
import { canonicalTeamTaskInterpretation } from "../../adapters/src/requirements/task-definition-selection.js";

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
  composeProductRecipe,
  currentCapabilityCatalogue,
  planProductAlternatives,
} from "../src/index.js";
import {
  appointmentBookingPrompt,
  appointmentBookingV1Prompt,
  expenseApprovalPrompt,
} from "./product-fixtures.js";
import { restaurantProductFixture } from "./restaurant-product-fixture.js";

function blankDraft(applicationId: string, name: string): DraftRevisionV1 {
  return createBlankApplicationDraft({
    applicationId,
    workspaceId: "local-workspace",
    name,
  });
}

describe("composeProductDraft", () => {
  it("converts every Appointment field plan symbol to a manifest-owned binding and preserves valid seed references", () => {
    const { requirement, blueprint } = appointmentBookingV1Prompt();
    const baseDraft = blankDraft(requirement.requirementId, blueprint.title);
    const alternatives = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft,
    });
    for (const { plan } of alternatives) {
      const graph = applyGraphDiffToDraft(
        baseDraft,
        composeProductDraft({ plan, blueprint, baseDraft }).diff,
      ).graph;
      const selection = graph.integration.compositionSelections?.find(
        ({ lock }) => lock.key === "scheduling.appointment",
      );
      expect(selection?.bindings).toEqual({
        serviceEntity: { graphSymbol: "graph.domain.service" },
        serviceNameField: {
          graphSymbol: "graph.domain.service",
          fieldKey: "name",
        },
        serviceDurationMinutesField: {
          graphSymbol: "graph.domain.service",
          fieldKey: "durationMinutes",
        },
        serviceActiveField: {
          graphSymbol: "graph.domain.service",
          fieldKey: "active",
        },
        scheduleEntity: { graphSymbol: "graph.domain.schedule" },
        scheduleServiceReferenceField: {
          graphSymbol: "graph.domain.schedule",
          fieldKey: "serviceId",
        },
        scheduleStartField: {
          graphSymbol: "graph.domain.schedule",
          fieldKey: "startUtc",
        },
        scheduleEndField: {
          graphSymbol: "graph.domain.schedule",
          fieldKey: "endUtc",
        },
        scheduleTimezoneField: {
          graphSymbol: "graph.domain.schedule",
          fieldKey: "timezone",
        },
        scheduleCapacityField: {
          graphSymbol: "graph.domain.schedule",
          fieldKey: "capacity",
        },
        scheduleStatusField: {
          graphSymbol: "graph.domain.schedule",
          fieldKey: "status",
        },
        appointmentEntity: { graphSymbol: "graph.domain.appointment" },
        appointmentScheduleReferenceField: {
          graphSymbol: "graph.domain.appointment",
          fieldKey: "scheduleId",
        },
        appointmentCustomerNameField: {
          graphSymbol: "graph.domain.appointment",
          fieldKey: "customerName",
        },
        appointmentNotesField: {
          graphSymbol: "graph.domain.appointment",
          fieldKey: "notes",
        },
        appointmentCancellationReasonField: {
          graphSymbol: "graph.domain.appointment",
          fieldKey: "cancellationReason",
        },
        appointmentStatusField: {
          graphSymbol: "graph.domain.appointment",
          fieldKey: "status",
        },
      });
      expect(graph.domain.seedData).toEqual([
        {
          entity: "service",
          id: "sample-service",
          values: { name: "Sample service", durationMinutes: 30, active: true },
        },
        {
          entity: "schedule",
          id: "sample-schedule",
          values: {
            serviceId: "sample-service",
            startUtc: "2026-10-01T09:00:00Z",
            endUtc: "2026-10-01T09:30:00Z",
            timezone: "UTC",
            capacity: 3,
            status: "open",
          },
        },
        {
          entity: "schedule",
          id: "sample-schedule-alt",
          values: {
            serviceId: "sample-service",
            startUtc: "2026-10-01T10:00:00Z",
            endUtc: "2026-10-01T10:30:00Z",
            timezone: "UTC",
            capacity: 1,
            status: "open",
          },
        },
        {
          entity: "appointment",
          id: "sample-appointment",
          values: {
            scheduleId: "sample-schedule",
            customerName: "Sample customer",
            notes: "Synthetic fixture note",
            cancellationReason: "Synthetic fixture cancellation reason",
            status: "requested",
          },
        },
      ]);
    }
  });

  it("rejects stale Appointment locks, duplicate bindings, and unregistered catalogue manifests", () => {
    const { requirement, blueprint } = appointmentBookingV1Prompt();
    const baseDraft = blankDraft(requirement.requirementId, blueprint.title);
    const [alternative] = planProductAlternatives({
      requirement,
      blueprint,
      baseDraft,
    });
    const plan = alternative!.plan;
    const appointmentLock = plan.capabilityLocks.find(
      ({ key }) => key === "scheduling.appointment",
    )!;
    expect(() =>
      composeProductIntegration({
        ...plan,
        capabilityLocks: plan.capabilityLocks.map((lock) =>
          lock.key === appointmentLock.key
            ? { ...lock, manifestDigest: `sha256:${"0".repeat(64)}` }
            : lock,
        ),
      }),
    ).toThrow("stale manifest digest");
    expect(() =>
      composeProductIntegration({
        ...plan,
        graphBindings: [
          ...plan.graphBindings,
          plan.graphBindings.find(
            ({ capabilityKey, inputKey }) =>
              capabilityKey === "scheduling.appointment" &&
              inputKey === "serviceEntity",
          )!,
        ],
      }),
    ).toThrow();
    const catalogue = currentCapabilityCatalogue();
    const injected = structuredClone(catalogue);
    injected.optional.find(
      ({ asset }) => asset.key === "scheduling.appointment",
    )!.asset.manifestDigest = `sha256:${"1".repeat(64)}`;
    expect(() =>
      planProductAlternatives({
        requirement,
        blueprint,
        baseDraft,
        catalogue: injected,
      }),
    ).toThrow("not an exact registered capability manifest");
  });

  it("composes Task fields and role/state authority without approval effects or an extra business entity", () => {
    const { spec, blueprint } = canonicalTeamTaskInterpretation(),
      baseDraft = blankDraft("team-board", "Team board");
    const [standard] = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    const graph = applyGraphDiffToDraft(
      baseDraft,
      composeProductDraft({ plan: standard.plan, blueprint, baseDraft }).diff,
    ).graph;
    expect(graph.domain.entities.map((e) => e.key)).toEqual([
      "task",
      "team-board-principal",
      "team-board-session",
    ]);
    expect(
      graph.domain.entities[0].fields.map((f) => [f.key, f.type, f.required]),
    ).toEqual([
      ["title", "string", true],
      ["description", "text", false],
      ["assignee", "string", true],
      ["dueDate", "date", true],
      ["priority", "enum", true],
      ["status", "enum", true],
    ]);
    expect(graph.flow.flows).toEqual([
      {
        id: "task-lifecycle",
        entity: "task",
        initialState: "not-started",
        states: ["not-started", "in-progress", "completed"],
        events: ["start", "complete", "reopen"],
        transitions: [
          {
            from: "not-started",
            event: "start",
            to: "in-progress",
            roles: ["member"],
          },
          {
            from: "in-progress",
            event: "complete",
            to: "completed",
            roles: ["member"],
          },
          {
            from: "completed",
            event: "reopen",
            to: "in-progress",
            roles: ["member"],
          },
        ],
      },
    ]);
    expect(
      graph.policy.permissions.filter((p) => p.resource === "task"),
    ).toEqual([
      {
        role: "member",
        resource: "task",
        actions: ["create", "read", "update", "start", "complete", "reopen"],
      },
      { role: "viewer", resource: "task", actions: ["read"] },
    ]);
    expect(graph.page.pages.map((p) => p.blocks[0].type)).toEqual([
      "stats",
      "list",
      "form",
      "detail",
      "queue",
    ]);
  });
  it("composes only the eligible deterministic Restaurant recipe and rejects semantic overrides", () => {
    const fixture = restaurantProductFixture();
    const first = composeProductRecipe(fixture);
    const second = composeProductRecipe({
      ...fixture,
      proposedRecipeKey: "restaurant-ordering",
    });
    expect(first.recipe.key).toBe("restaurant-ordering");
    expect(first.graph).toEqual(second.graph);
    expect(first.graphHash).toBe(second.graphHash);
    expect(() =>
      composeProductRecipe({
        ...fixture,
        pages: [{ id: "provider-owned" }],
      } as never),
    ).toThrow(/override|input/i);
    expect(() =>
      composeProductRecipe({
        ...fixture,
        fieldAuthorities: [],
      } as never),
    ).toThrow(/override|input/i);
  });

  it("redacts hostile Product Recipe composition wrappers without invoking accessors", () => {
    const fixture = restaurantProductFixture();
    const fixedMessage = "Product Recipe composition input is invalid.";
    let getterCalls = 0;
    const accessor = Object.defineProperty(
      { intent: fixture.intent, experience: fixture.experience },
      "baseDraft",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return fixture.baseDraft;
        },
      },
    );
    const throwingProxy = new Proxy(fixture, {
      getOwnPropertyDescriptor() {
        throw new Error("DO-NOT-ECHO-composition-reflection");
      },
    });
    const malformed = [
      null,
      {},
      { intent: fixture.intent, experience: fixture.experience },
      { ...fixture, extra: "DO-NOT-ECHO-extra" },
      { ...fixture, proposedRecipeKey: "not_an_identifier" },
      accessor,
      throwingProxy,
    ];
    for (const candidate of malformed) {
      let error: unknown;
      try {
        composeProductRecipe(candidate as never);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(fixedMessage);
      expect((error as Error).message).not.toContain("DO-NOT-ECHO");
    }
    expect(getterCalls).toBe(0);
  });

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
import { canonicalExpenseApprovalInterpretation } from "../../adapters/src/requirements/approval-definition-selection.js";
import { deriveProductOperations } from "../src/product-composer.js";
describe("numeric-domain composition", () => {
  const selectedKeys = [
    "core.crud",
    "core.workflow",
    "core.identity-policy",
    "core.policy-declarations",
    "core.audit",
    "core.notification",
  ];
  const positive = {
    apiVersion: "factory.numeric-field-domain/v1" as const,
    minimum: { value: 0, inclusive: false },
  };
  function constrained() {
    const blueprint = structuredClone(
      canonicalExpenseApprovalInterpretation().blueprint,
    );
    blueprint.entities[0]!.fields.find(
      (f) => f.key === "amount",
    )!.numericDomain = positive;
    return blueprint;
  }
  it("copies the policy with the unchanged decimal witness", () => {
    const diff = deriveProductOperations({
      blueprint: constrained(),
      applicationId: "numeric",
      selectedKeys,
    });
    expect(
      diff.operations.find((o) => o.path === "/domain/entities/-")?.op,
    ).toBe("add");
    const entities = diff.operations.find(
      (o) => o.path === "/domain/entities/-",
    ) as any;
    expect(
      entities.value.fields.find((f: any) => f.key === "amount").numericDomain,
    ).toEqual(positive);
    const seeds = diff.operations.find(
      (o) => o.path === "/domain/seedData",
    ) as any;
    expect(seeds.value[0].values.amount).toBe(125.5);
  });
  it.each([
    "missing-reviewer",
    "extra-state",
    "wrong-submit",
    "secondary-policy",
  ])("rejects unsupported Approval lookalike %s", (kind) => {
    const blueprint = constrained();
    let keys = selectedKeys;
    if (kind === "missing-reviewer")
      blueprint.actors[1]!.permissions[0]!.actions = ["read"];
    if (kind === "extra-state")
      blueprint.workflows[0]!.states.push({
        key: "archived",
        label: "Archived",
      });
    if (kind === "wrong-submit")
      blueprint.workflows[0]!.transitions.find((t) => t.key === "submit")!.to =
        "approved";
    if (kind === "secondary-policy")
      blueprint.entities[1]!.fields.push({
        key: "otherFee",
        label: "Other fee",
        type: "currency",
        required: false,
        numericDomain: positive,
      });
    expect(() =>
      deriveProductOperations({
        blueprint,
        applicationId: "numeric",
        selectedKeys: keys,
      }),
    ).toThrow();
  });
  it("plans Standard but rejects composing the unsupported Minimal target", () => {
    const { spec } = canonicalExpenseApprovalInterpretation(),
      blueprint = constrained(),
      baseDraft = blankDraft(spec.requirementId, "Numeric request");
    const alternatives = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    expect(() =>
      composeProductDraft({
        plan: alternatives[0]!.plan,
        blueprint,
        baseDraft,
      }),
    ).not.toThrow();
    expect(() =>
      composeProductDraft({
        plan: alternatives[1]!.plan,
        blueprint,
        baseDraft,
      }),
    ).toThrow(/Numeric domains/);
  });
  it("rejects numeric policy on Task", () => {
    const blueprint = structuredClone(
      canonicalTeamTaskInterpretation().blueprint,
    );
    blueprint.entities[0]!.fields.push({
      key: "size",
      label: "Size",
      type: "number",
      required: true,
      numericDomain: positive,
    });
    expect(() =>
      deriveProductOperations({
        blueprint,
        applicationId: "numeric",
        selectedKeys,
      }),
    ).toThrow(/Numeric domains/);
  });
});

describe("calculated request composition", () => {
  const positive = {
    apiVersion: "factory.numeric-field-domain/v1" as const,
    minimum: { value: 0, inclusive: false },
  };
  function calculated() {
    const source = canonicalExpenseApprovalInterpretation();
    const blueprint = structuredClone(source.blueprint);
    blueprint.entities[0]!.fields = [
      { key: "item", label: "Item", type: "text", required: true },
      {
        key: "quantity",
        label: "Quantity",
        type: "number",
        required: true,
        numericDomain: positive,
      },
      {
        key: "price",
        label: "Unit price",
        type: "currency",
        required: true,
        numericDomain: positive,
      },
      {
        key: "total",
        label: "Total",
        type: "currency",
        required: true,
        calculation: {
          apiVersion: "factory.quantity-unit-price-total/v1",
          quantityFieldKey: "quantity",
          unitPriceFieldKey: "price",
        },
      },
      {
        key: "reason",
        label: "Justification",
        type: "long-text",
        required: true,
      },
    ];
    return { ...source, blueprint };
  }
  it("composes the complete profile with coherent operand/output witnesses", () => {
    const { spec, blueprint } = calculated(),
      baseDraft = blankDraft("calculated", "Calculated requests");
    const [standard, minimal] = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    const diff = composeProductDraft({
      plan: standard!.plan,
      blueprint,
      baseDraft,
    }).diff;
    const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
    expect(
      graph.domain.entities[0]!.fields.find((f) => f.key === "total")
        ?.calculation,
    ).toEqual(blueprint.entities[0]!.fields[3]!.calculation);
    expect(graph.domain.seedData![0]!.values).toMatchObject({
      quantity: 12,
      price: 125.5,
      total: 1506,
    });
    expect(() =>
      composeProductDraft({ plan: minimal!.plan, blueprint, baseDraft }),
    ).toThrow();
  });
  it.each([
    "extra-numeric",
    "ambiguous-title",
    "bad-witness",
    "secondary-calculation",
  ])("rejects unsupported %s", (kind) => {
    const { spec, blueprint } = calculated(),
      baseDraft = blankDraft("calculated", "Calculated requests");
    if (kind === "extra-numeric")
      blueprint.entities[0]!.fields.push({
        key: "fee",
        label: "Fee",
        type: "currency",
        required: false,
      });
    if (kind === "ambiguous-title")
      blueprint.entities[0]!.fields.push({
        key: "otherTitle",
        label: "Other title",
        type: "text",
        required: true,
      });
    if (kind === "bad-witness")
      blueprint.entities[0]!.fields[1]!.numericDomain = {
        ...positive,
        minimum: { value: 20, inclusive: true },
      };
    if (kind === "secondary-calculation")
      blueprint.entities[1]!.fields = structuredClone(
        blueprint.entities[0]!.fields,
      );
    expect(() =>
      planProductAlternatives({ requirement: spec, blueprint, baseDraft }),
    ).toThrow();
  });
});
