import {
  hashRequirementSpec,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";

/**
 * The two canonical acceptance briefs (Prompt A — Expense Approval,
 * Prompt B — Appointment Booking) as bound requirement + blueprint pairs.
 * Factories recompute the blueprint requirement checksum so every test
 * starts from a checksum-consistent pair; mutation tests break the binding
 * explicitly.
 */
export interface PromptFixtures {
  readonly requirement: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
}

export function expenseApprovalPrompt(): PromptFixtures {
  const requirement: RequirementSpecV1 = {
    apiVersion: "factory.requirement-spec/v1",
    requirementId: "expense-approval",
    outcome:
      "Employees submit expense reports and managers approve or reject them while finance keeps an audit view of every decision.",
    actors: [
      { key: "employee", label: "Employee", description: "Submits expenses" },
      { key: "manager", label: "Manager", description: "Approves or rejects" },
      { key: "finance", label: "Finance", description: "Audits decisions" },
    ],
    domainConcepts: [
      { key: "expense", label: "Expense" },
      { key: "approval", label: "Approval" },
    ],
    workflows: [{ key: "expense-approval", label: "Expense approval" }],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "approve",
        given: "an employee submitted an expense",
        when: "the manager approves it",
        then: "the expense is approved and finance sees the decision",
      },
      {
        key: "reject",
        given: "a submitted expense",
        when: "the manager rejects it",
        then: "the expense is rejected and cannot be paid",
      },
    ],
  };
  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1",
    requirementChecksum: hashRequirementSpec(requirement),
    title: "Expense Approval",
    actors: [
      {
        key: "employee",
        label: "Employee",
        permissions: [
          { entityKey: "expense", actions: ["create", "read", "submit"] },
        ],
      },
      {
        key: "manager",
        label: "Manager",
        permissions: [
          { entityKey: "expense", actions: ["read", "approve", "reject"] },
        ],
      },
      {
        key: "finance",
        label: "Finance",
        permissions: [{ entityKey: "expense", actions: ["read", "audit"] }],
      },
    ],
    entities: [
      {
        key: "expense",
        label: "Expense",
        fields: [
          { key: "amount", label: "Amount", type: "currency", required: true },
          {
            key: "category",
            label: "Category",
            type: "enum",
            required: true,
            options: ["travel", "meals", "office"],
          },
          {
            key: "incurredOn",
            label: "Incurred on",
            type: "date",
            required: true,
          },
          { key: "receipt", label: "Receipt", type: "file", required: false },
          { key: "notes", label: "Notes", type: "long-text", required: false },
        ],
      },
    ],
    pageIntents: [
      {
        key: "expense-dashboard",
        label: "Expense dashboard",
        intent: "dashboard",
      },
      {
        key: "expense-form",
        label: "New expense",
        intent: "form",
        entityKey: "expense",
      },
      {
        key: "expense-queue",
        label: "Approval queue",
        intent: "queue",
        entityKey: "expense",
      },
    ],
    workflows: [
      {
        key: "expense-approval",
        label: "Expense approval",
        entityKey: "expense",
        states: [
          { key: "draft", label: "Draft" },
          { key: "submitted", label: "Submitted" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ],
        transitions: [
          {
            key: "submit",
            from: "draft",
            to: "submitted",
            label: "Submit",
            actorKey: "employee",
          },
          {
            key: "approve",
            from: "submitted",
            to: "approved",
            label: "Approve",
            actorKey: "manager",
          },
          {
            key: "reject",
            from: "submitted",
            to: "rejected",
            label: "Reject",
            actorKey: "manager",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "submit-approve",
        description:
          "An employee submits an expense and the manager approves it.",
        steps: [
          { actorKey: "employee", action: "submit an expense" },
          { actorKey: "manager", action: "approve the expense" },
        ],
      },
    ],
  };
  return { requirement, blueprint };
}

export function appointmentBookingPrompt(): PromptFixtures {
  const requirement: RequirementSpecV1 = {
    apiVersion: "factory.requirement-spec/v1",
    requirementId: "appointment-booking",
    outcome:
      "Customers request appointments for available services; staff confirm, reschedule, or cancel them.",
    actors: [
      {
        key: "customer",
        label: "Customer",
        description: "Requests appointments",
      },
      { key: "staff", label: "Staff", description: "Confirms and reschedules" },
      {
        key: "administrator",
        label: "Administrator",
        description: "Maintains services",
      },
    ],
    domainConcepts: [
      { key: "service", label: "Service" },
      { key: "appointment", label: "Appointment" },
      { key: "schedule", label: "Schedule" },
    ],
    workflows: [
      { key: "appointment-lifecycle", label: "Appointment lifecycle" },
    ],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "book-and-confirm",
        given: "a customer requested an appointment",
        when: "staff confirm it",
        then: "the appointment is confirmed",
      },
    ],
  };
  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1",
    requirementChecksum: hashRequirementSpec(requirement),
    title: "Appointment Booking",
    actors: [
      {
        key: "customer",
        label: "Customer",
        permissions: [
          { entityKey: "appointment", actions: ["create", "read", "cancel"] },
        ],
      },
      {
        key: "staff",
        label: "Staff",
        permissions: [
          {
            entityKey: "appointment",
            actions: ["read", "confirm", "reschedule", "cancel"],
          },
          { entityKey: "schedule", actions: ["read", "update"] },
        ],
      },
      {
        key: "administrator",
        label: "Administrator",
        permissions: [
          {
            entityKey: "service",
            actions: ["create", "read", "update", "delete"],
          },
          { entityKey: "appointment", actions: ["read", "manage"] },
        ],
      },
    ],
    entities: [
      {
        key: "service",
        label: "Service",
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "durationMinutes",
            label: "Duration minutes",
            type: "number",
            required: true,
          },
          { key: "price", label: "Price", type: "currency", required: true },
          { key: "active", label: "Active", type: "boolean", required: true },
        ],
      },
      {
        key: "appointment",
        label: "Appointment",
        fields: [
          {
            key: "serviceRef",
            label: "Service",
            type: "reference",
            required: true,
            referenceTo: "service",
          },
          {
            key: "startsAt",
            label: "Starts at",
            type: "datetime",
            required: true,
          },
          {
            key: "customerName",
            label: "Customer name",
            type: "text",
            required: true,
          },
          { key: "notes", label: "Notes", type: "long-text", required: false },
        ],
      },
      {
        key: "schedule",
        label: "Schedule",
        fields: [
          { key: "day", label: "Day", type: "date", required: true },
          {
            key: "capacity",
            label: "Capacity",
            type: "number",
            required: true,
          },
        ],
      },
    ],
    pageIntents: [
      {
        key: "appointment-calendar",
        label: "Appointment calendar",
        intent: "calendar",
        entityKey: "appointment",
      },
      {
        key: "appointment-form",
        label: "New appointment",
        intent: "form",
        entityKey: "appointment",
      },
      {
        key: "service-list",
        label: "Services",
        intent: "list",
        entityKey: "service",
      },
    ],
    workflows: [
      {
        key: "appointment-lifecycle",
        label: "Appointment lifecycle",
        entityKey: "appointment",
        states: [
          { key: "requested", label: "Requested" },
          { key: "confirmed", label: "Confirmed" },
          { key: "cancelled", label: "Cancelled" },
        ],
        transitions: [
          {
            key: "confirm",
            from: "requested",
            to: "confirmed",
            label: "Confirm",
            actorKey: "staff",
          },
          {
            key: "cancel",
            from: "requested",
            to: "cancelled",
            label: "Cancel",
            actorKey: "customer",
          },
          {
            key: "reschedule",
            from: "confirmed",
            to: "requested",
            label: "Reschedule",
            actorKey: "staff",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "book-confirm",
        description: "A customer requests an appointment and staff confirm it.",
        steps: [
          { actorKey: "customer", action: "request an appointment" },
          { actorKey: "staff", action: "confirm the appointment" },
        ],
      },
    ],
  };
  return { requirement, blueprint };
}
