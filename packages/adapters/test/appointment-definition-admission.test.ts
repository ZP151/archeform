import { describe, expect, it } from "vitest";
import {
  definitionSelectionSchema,
  definitionSelectionCatalogue,
} from "../src/requirements/definition-selection-catalogue.js";
import { loadProductDefinitionData } from "../src/requirements/product-definition-data.js";

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
      ["cancel", "confirmed", "cancelled", "staff"],
    ],
  },
  providerRules: [
    "UTC ISO-8601 instants with an explicit Z or offset",
    "a supported IANA timezone",
    "cancellation reason is required for a cancel command",
  ],
  providerExclusions: [
    "arbitrary client start/end values",
    "free-form timezone text",
    "zero or negative capacity",
    "an end instant not after start",
    "a closed schedule",
    "recurring appointments",
    "external calendar synchronization",
    "payment",
  ],
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
    providerRules: reviewedAppointmentContract.providerRules.filter((rule) =>
      definition.selection.providerInstruction.includes(rule),
    ),
    providerExclusions: reviewedAppointmentContract.providerExclusions.filter(
      (exclusion) =>
        definition.selection.providerInstruction.includes(exclusion),
    ),
  };
}

const selection = {
  definitionKey,
  disposition: "supported-default",
  requirementId: "appointment-definition-admission",
  title: "Appointment Booking",
  outcome: "Book an open service schedule.",
  materialQuestions: [],
  businessParameters: null,
};

describe("Appointment Booking definition admission", () => {
  it("freezes the reviewed service, schedule and appointment contract before registration", () => {
    expect(contractSummary()).toEqual(reviewedAppointmentContract);
    expect(
      registeredAppointment(),
      "The reviewed Appointment definition must be registered before admission.",
    ).toBeDefined();
  });

  it("rejects provider attempts to extend the reviewed appointment selection", () => {
    for (const extension of [
      { entities: [{ key: "waitlist" }] },
      { routes: ["/api/appointments/payment"] },
      { capabilities: ["external.calendar@1.0.0"] },
      { roles: [{ key: "provider" }] },
    ]) {
      expect(
        definitionSelectionSchema.safeParse({ ...selection, ...extension })
          .success,
      ).toBe(false);
    }
  });

  it("does not make an unregistered appointment definition selectable", () => {
    expect(
      definitionSelectionCatalogue.some(
        (definition) => definition.definitionKey === definitionKey,
      ),
    ).toBe(false);
  });
});
