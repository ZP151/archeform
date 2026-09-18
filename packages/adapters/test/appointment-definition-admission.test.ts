import { describe, expect, it } from "vitest";
import {
  hashRequirementSpec,
  parseProductBlueprint,
  parseRequirementSpec,
} from "@factory/graph";
import { z } from "zod";
import { definitionSelectionCatalogue } from "../src/requirements/definition-selection-catalogue.js";
import { loadProductDefinitionData } from "../src/requirements/product-definition-data.js";
import {
  assertRequirementInterpretation,
  deriveClarifications,
} from "../src/requirements/requirement-interpreter.js";

const definitionKey = "appointment-booking-v1";
const positiveInteger = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};

/**
 * This is the reviewed contract that Task 4 must register append-only. It is
 * intentionally independent from the shipped catalogue so this test remains a
 * single admission RED until the appointment row exists.
 */
const reviewedAppointmentContract = {
  entities: [
    {
      key: "service",
      fields: [
        { key: "name", type: "text", required: true },
        {
          key: "durationMinutes",
          type: "number",
          required: true,
          numericDomain: positiveInteger,
        },
        { key: "active", type: "boolean", required: true },
      ],
    },
    {
      key: "schedule",
      fields: [
        {
          key: "serviceId",
          type: "reference",
          required: true,
          referenceTo: "service",
        },
        { key: "startUtc", type: "datetime", required: true },
        { key: "endUtc", type: "datetime", required: true },
        { key: "timezone", type: "text", required: true },
        {
          key: "capacity",
          type: "number",
          required: true,
          numericDomain: positiveInteger,
        },
        {
          key: "status",
          type: "enum",
          required: true,
          options: ["open", "closed"],
        },
      ],
    },
    {
      key: "appointment",
      fields: [
        {
          key: "scheduleId",
          type: "reference",
          required: true,
          referenceTo: "schedule",
        },
        { key: "customerName", type: "text", required: true },
        { key: "notes", type: "long-text", required: false },
        {
          key: "cancellationReason",
          type: "long-text",
          required: false,
        },
        {
          key: "status",
          type: "enum",
          required: true,
          options: ["requested", "confirmed", "cancelled"],
        },
      ],
    },
  ],
  roles: [
    [
      "customer",
      [{ entityKey: "appointment", actions: ["create", "read", "cancel"] }],
    ],
    [
      "staff",
      [
        {
          entityKey: "appointment",
          actions: ["read", "confirm", "reschedule", "cancel"],
        },
      ],
    ],
    [
      "administrator",
      [
        {
          entityKey: "service",
          actions: ["create", "read", "update", "manage"],
        },
        {
          entityKey: "schedule",
          actions: ["create", "read", "update", "manage"],
        },
        { entityKey: "appointment", actions: ["read", "cancel"] },
      ],
    ],
  ],
  pages: [
    ["schedule-picker", "calendar", "schedule"],
    ["appointment-list", "list", "appointment"],
    ["appointment-form", "form", "appointment"],
    ["appointment-detail", "detail", "appointment"],
    ["service-management", "settings", undefined],
    ["schedule-management", "settings", undefined],
  ],
  workflow: {
    key: "appointment-booking",
    entityKey: "appointment",
    states: ["requested", "confirmed", "cancelled"],
    transitions: [
      ["confirm", "requested", "confirmed", "staff"],
      ["cancel", "requested", "cancelled", "customer"],
      ["reschedule", "confirmed", "requested", "staff"],
    ],
  },
};

function registeredAppointment() {
  return loadProductDefinitionData().definitions.find(
    (definition) => definition.definitionKey === definitionKey,
  );
}

function contractSummary(definition = registeredAppointment()) {
  if (!definition) return reviewedAppointmentContract;
  const blueprint = definition.canonical.blueprint;
  const workflow = blueprint.workflows.find(
    (candidate) => candidate.key === "appointment-booking",
  );
  return {
    entities: blueprint.entities.map(({ key, fields }) => ({
      key,
      fields: fields.map(
        ({ key, type, required, numericDomain, options, referenceTo }) => ({
          key,
          type,
          required,
          ...(numericDomain ? { numericDomain } : {}),
          ...(options ? { options } : {}),
          ...(referenceTo ? { referenceTo } : {}),
        }),
      ),
    })),
    roles: blueprint.actors.map(({ key, permissions }) => [key, permissions]),
    pages: blueprint.pageIntents.map(({ key, intent, entityKey }) => [
      key,
      intent,
      entityKey,
    ]),
    workflow: workflow && {
      key: workflow.key,
      entityKey: workflow.entityKey,
      states: workflow.states.map((state) => state.key),
      transitions: workflow.transitions.map(({ key, from, to, actorKey }) => [
        key,
        from,
        to,
        actorKey,
      ]),
    },
  };
}

const pendingAppointmentSelectionSchema = z
  .object({
    definitionKey: z.literal(definitionKey),
    disposition: z.enum(["supported-default", "needs-clarification"]),
    requirementId: z.string().regex(/^[a-z][a-z0-9-]*$/),
    title: z.string().min(2).max(80),
    outcome: z.string().min(1).max(2000),
    materialQuestions: z
      .array(
        z
          .object({
            category: z.enum([
              "authorization",
              "visibility",
              "role",
              "business-rule",
              "data",
              "integration",
            ]),
            question: z.string().min(1).max(500),
          })
          .strict(),
      )
      .max(30),
    businessParameters: z.null(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.disposition === "supported-default") !==
      (value.materialQuestions.length === 0)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The selection disposition must match its material questions.",
      });
  });

const selection = {
  definitionKey,
  disposition: "supported-default",
  requirementId: "appointment-definition-admission",
  title: "Appointment Booking",
  outcome: "Book an open service schedule.",
  materialQuestions: [],
  businessParameters: null,
} as const;

const pendingAppointmentComposition = {
  compilerProfile: "appointment-booking@1.0.0",
  capabilitySelection: { key: "scheduling.appointment", version: "1.0.0" },
  bindings: {
    serviceEntity: "service",
    scheduleEntity: "schedule",
    appointmentEntity: "appointment",
    scheduleServiceReferenceField: "serviceId",
    appointmentScheduleReferenceField: "scheduleId",
    scheduleStartField: "startUtc",
    scheduleEndField: "endUtc",
    scheduleTimezoneField: "timezone",
    scheduleCapacityField: "capacity",
    appointmentCancellationReasonField: "cancellationReason",
  },
  commandAuthorization: {
    cancel: [
      { actorKey: "customer", fromStates: ["requested"] },
      { actorKey: "staff", fromStates: ["requested", "confirmed"] },
      { actorKey: "administrator", fromStates: ["requested", "confirmed"] },
    ],
  },
} as const;

const pendingProjectionTransitions =
  reviewedAppointmentContract.workflow.transitions;

/**
 * Strict Task 1 stand-in for the future catalogue family. It deliberately
 * accepts a reviewed selection only, then uses the existing interpretation
 * assertion and checksum boundary. Task 4 must replace this stand-in with the
 * registered definition entry once the appointment capability exists.
 */
function projectPendingAppointmentDefinition(input: unknown) {
  const selected = pendingAppointmentSelectionSchema.parse(input);
  const spec = {
    apiVersion: "factory.requirement-spec/v1" as const,
    requirementId: selected.requirementId,
    outcome: selected.outcome,
    actors: [
      {
        key: "customer",
        label: "Customer",
        description: "Requests and cancels appointments.",
      },
      {
        key: "staff",
        label: "Staff",
        description: "Confirms, reschedules, and cancels appointments.",
      },
      {
        key: "administrator",
        label: "Administrator",
        description: "Manages services and schedules.",
      },
    ],
    domainConcepts: [
      { key: "service", label: "Service", description: "A bookable offer." },
      {
        key: "schedule",
        label: "Schedule",
        description: "A server-owned bookable interval.",
      },
      {
        key: "appointment",
        label: "Appointment",
        description: "A requested, confirmed, or cancelled booking.",
      },
    ],
    workflows: [
      {
        key: "appointment-booking",
        label: "Appointment booking",
        description: "A request is confirmed, rescheduled, or cancelled.",
      },
    ],
    constraints: [],
    openQuestions: selected.materialQuestions,
    acceptanceScenarios: [
      {
        key: "customer-requests-open-schedule",
        given: "an open schedule with positive capacity",
        when: "a customer requests an appointment",
        then: "the appointment is requested",
      },
    ],
  };
  const blueprint = {
    apiVersion: "factory.product-blueprint/v1" as const,
    requirementChecksum: hashRequirementSpec(spec),
    title: selected.title,
    actors: [
      {
        key: "customer",
        label: "Customer",
        permissions: reviewedAppointmentContract.roles[0]![1],
      },
      {
        key: "staff",
        label: "Staff",
        permissions: reviewedAppointmentContract.roles[1]![1],
      },
      {
        key: "administrator",
        label: "Administrator",
        permissions: reviewedAppointmentContract.roles[2]![1],
      },
    ],
    entities: reviewedAppointmentContract.entities.map((entity) => ({
      ...entity,
      label: entity.key[0]!.toUpperCase() + entity.key.slice(1),
      fields: entity.fields.map((field) => ({
        ...field,
        label: field.key.replace(/([A-Z])/g, " $1"),
      })),
    })),
    pageIntents: reviewedAppointmentContract.pages.map(
      ([key, intent, entityKey]) => ({
        key,
        label: key.replace(/-/g, " "),
        intent,
        ...(entityKey ? { entityKey } : {}),
      }),
    ),
    workflows: [
      {
        key: reviewedAppointmentContract.workflow.key,
        label: "Appointment booking",
        entityKey: reviewedAppointmentContract.workflow.entityKey,
        states: reviewedAppointmentContract.workflow.states.map((key) => ({
          key,
          label: key[0]!.toUpperCase() + key.slice(1),
        })),
        transitions: pendingProjectionTransitions.map(
          ([key, from, to, actorKey]) => ({
            key,
            from,
            to,
            label: key[0]!.toUpperCase() + key.slice(1),
            actorKey,
          }),
        ),
      },
    ],
    acceptanceJourneys: [
      {
        key: "customer-requests-and-staff-confirms",
        description: "A customer requests an open schedule and staff confirm.",
        steps: [
          { actorKey: "customer", action: "requests an appointment" },
          { actorKey: "staff", action: "confirms the appointment" },
        ],
      },
    ],
  };
  const parsedSpec = parseRequirementSpec(spec);
  const parsedBlueprint = parseProductBlueprint(blueprint);
  const interpretation = assertRequirementInterpretation({
    spec: parsedSpec,
    blueprint: parsedBlueprint,
    clarifications: deriveClarifications(parsedSpec),
  });
  return {
    interpretation,
    composition: structuredClone(pendingAppointmentComposition),
  };
}

type PendingAppointmentRequest = {
  readonly createValues: Record<string, unknown>;
  readonly schedule: {
    readonly startUtc: string;
    readonly endUtc: string;
    readonly timezone: string;
    readonly capacity: number;
    readonly status: "open" | "closed";
  };
};

function rejectsPendingAppointmentRequest(input: PendingAppointmentRequest) {
  // All request checks begin with the reviewed selection projected through the
  // same requirement/blueprint validation boundary used by interpreters.
  projectPendingAppointmentDefinition(selection);
  const createKeys = Object.keys(input.createValues);
  if (
    createKeys.some(
      (key) => !["scheduleId", "customerName", "notes"].includes(key),
    )
  )
    return {
      verdict: "rejected" as const,
      status: 400,
      code: "appointment.invalid_request",
    };
  const explicitInstant = (value: string) =>
    /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
  if (
    !explicitInstant(input.schedule.startUtc) ||
    !explicitInstant(input.schedule.endUtc)
  )
    return {
      verdict: "rejected" as const,
      status: 400,
      code: "appointment.schedule_invalid",
    };
  try {
    if (
      new Intl.DateTimeFormat("en-US", {
        timeZone: input.schedule.timezone,
      }).resolvedOptions().timeZone !== input.schedule.timezone
    )
      return {
        verdict: "rejected" as const,
        status: 400,
        code: "appointment.schedule_invalid",
      };
  } catch {
    return {
      verdict: "rejected" as const,
      status: 400,
      code: "appointment.schedule_invalid",
    };
  }
  if (
    !Number.isSafeInteger(input.schedule.capacity) ||
    input.schedule.capacity <= 0
  )
    return {
      verdict: "rejected" as const,
      status: 400,
      code: "appointment.schedule_invalid",
    };
  if (Date.parse(input.schedule.endUtc) <= Date.parse(input.schedule.startUtc))
    return {
      verdict: "rejected" as const,
      status: 400,
      code: "appointment.schedule_invalid",
    };
  if (input.schedule.status !== "open")
    return {
      verdict: "rejected" as const,
      status: 409,
      code: "appointment.schedule_closed",
    };
  return { verdict: "accepted" as const };
}

const validPendingAppointmentRequest: PendingAppointmentRequest = {
  createValues: {
    scheduleId: "schedule-1",
    customerName: "Ada Customer",
    notes: "Window seat if available.",
  },
  schedule: {
    startUtc: "2026-10-01T09:00:00Z",
    endUtc: "2026-10-01T09:30:00Z",
    timezone: "Asia/Singapore",
    capacity: 1,
    status: "open",
  },
};

describe("Appointment Booking definition admission", () => {
  it("freezes the reviewed service, schedule and appointment contract before registration", () => {
    expect(contractSummary()).toEqual(reviewedAppointmentContract);
    expect(
      registeredAppointment(),
      "The reviewed Appointment definition must be registered before admission.",
    ).toBeDefined();
  });

  it("accepts only the baseline pending Appointment selection and rejects provider extensions", () => {
    expect(pendingAppointmentSelectionSchema.safeParse(selection).success).toBe(
      true,
    );
    for (const extension of [
      { entities: [{ key: "waitlist" }] },
      { routes: ["/api/appointments/payment"] },
      { capabilities: ["external.calendar@1.0.0"] },
      { roles: [{ key: "provider" }] },
    ]) {
      expect(
        pendingAppointmentSelectionSchema.safeParse({
          ...selection,
          ...extension,
        }).success,
      ).toBe(false);
    }
  });

  it.each([
    [
      "client supplied start and end instants",
      {
        ...validPendingAppointmentRequest,
        createValues: {
          ...validPendingAppointmentRequest.createValues,
          startUtc: "2026-10-01T09:00:00Z",
          endUtc: "2026-10-01T09:30:00Z",
        },
      },
      { verdict: "rejected", status: 400, code: "appointment.invalid_request" },
    ],
    [
      "a free-form timezone",
      {
        ...validPendingAppointmentRequest,
        schedule: {
          ...validPendingAppointmentRequest.schedule,
          timezone: "Singapore time",
        },
      },
      {
        verdict: "rejected",
        status: 400,
        code: "appointment.schedule_invalid",
      },
    ],
    [
      "zero capacity",
      {
        ...validPendingAppointmentRequest,
        schedule: { ...validPendingAppointmentRequest.schedule, capacity: 0 },
      },
      {
        verdict: "rejected",
        status: 400,
        code: "appointment.schedule_invalid",
      },
    ],
    [
      "negative capacity",
      {
        ...validPendingAppointmentRequest,
        schedule: { ...validPendingAppointmentRequest.schedule, capacity: -1 },
      },
      {
        verdict: "rejected",
        status: 400,
        code: "appointment.schedule_invalid",
      },
    ],
    [
      "an end instant that is not after the start instant",
      {
        ...validPendingAppointmentRequest,
        schedule: {
          ...validPendingAppointmentRequest.schedule,
          endUtc: "2026-10-01T09:00:00Z",
        },
      },
      {
        verdict: "rejected",
        status: 400,
        code: "appointment.schedule_invalid",
      },
    ],
    [
      "a closed schedule",
      {
        ...validPendingAppointmentRequest,
        schedule: {
          ...validPendingAppointmentRequest.schedule,
          status: "closed",
        },
      },
      {
        verdict: "rejected",
        status: 409,
        code: "appointment.schedule_closed",
      },
    ],
  ] as const)(
    "rejects %s with a safe admission code",
    (_name, request, expected) => {
      expect(rejectsPendingAppointmentRequest(request)).toEqual(expected);
    },
  );

  it.each([
    ["recurring appointments", "business-rule", "Must appointments recur?"],
    [
      "external calendar synchronization",
      "integration",
      "Must appointments synchronize to an external calendar?",
    ],
    ["payment", "integration", "Must booking execute a payment?"],
  ] as const)(
    "retains %s as a material clarification",
    (_scope, category, question) => {
      const materialQuestions = [{ category, question }];
      const result = projectPendingAppointmentDefinition({
        ...selection,
        disposition: "needs-clarification",
        materialQuestions,
      });
      expect(result.interpretation.spec.openQuestions).toEqual(
        materialQuestions,
      );
      expect(
        result.interpretation.clarifications.flatMap((clarification) =>
          clarification.questions.map((item) => item.question),
        ),
      ).toEqual([question]);
    },
  );

  it("projects deterministic pending composition without a product-name branch", () => {
    const first = projectPendingAppointmentDefinition(selection);
    const second = projectPendingAppointmentDefinition(selection);
    expect(second).toEqual(first);
    expect(first.interpretation.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(first.interpretation.spec),
    );
    expect(first.composition).toEqual(pendingAppointmentComposition);
    expect(JSON.stringify(first.composition)).not.toContain(definitionKey);
    expect(
      first.interpretation.blueprint.workflows[0]!.transitions.map(
        ({ key, from, to, actorKey }) => [key, from, to, actorKey],
      ),
    ).toEqual(reviewedAppointmentContract.workflow.transitions);
    expect(
      first.interpretation.blueprint.actors.map(({ key, permissions }) => [
        key,
        permissions,
      ]),
    ).toEqual(reviewedAppointmentContract.roles);
    expect(first.composition.commandAuthorization.cancel).toEqual([
      { actorKey: "customer", fromStates: ["requested"] },
      { actorKey: "staff", fromStates: ["requested", "confirmed"] },
      { actorKey: "administrator", fromStates: ["requested", "confirmed"] },
    ]);
  });

  it("makes the reviewed appointment definition selectable after append-only admission", () => {
    expect(
      definitionSelectionCatalogue.some(
        (definition) => definition.definitionKey === definitionKey,
      ),
    ).toBe(true);
  });
});
