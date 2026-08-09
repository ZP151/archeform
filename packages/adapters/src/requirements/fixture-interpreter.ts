import {
  hashRequirementSpec,
  type CompositionClarificationV1,
  type ProductBlueprintV1,
} from "@factory/graph";

import {
  RequirementInterpreterError,
  assertRequirementInterpretation,
  type RequirementInterpreterAdapterV1,
  type RequirementInterpretationV1,
} from "./requirement-interpreter.js";

/**
 * Deterministic test authority for requirement interpretation. It recognizes
 * exactly the canonical acceptance briefs (Prompt A Expense Approval, Prompt
 * B Appointment Booking) plus one deliberately vague brief that exercises the
 * clarification path; anything else fails closed with `brief_invalid`. The
 * real product path uses the OpenAI interpreter; this adapter exists to pin
 * schemas, checksum binding, and material difference in unit tests without a
 * provider. Nothing is persisted and no brief leaves the call.
 */

const canonicalBriefs = new Map<
  string,
  (answers: Readonly<Record<string, string>>) => RequirementInterpretationV1
>();

function normalizeBrief(brief: string): string {
  return brief.trim().replace(/\s+/g, " ");
}

function expenseApprovalInterpretation(): RequirementInterpretationV1 {
  const spec = {
    apiVersion: "factory.requirement-spec/v1" as const,
    requirementId: "expense-approval-requirement",
    outcome:
      "Employees submit expenses and managers decide them; finance audits the decisions.",
    actors: [
      {
        key: "employee",
        label: "Employee",
        description:
          "Submits expenses with amount, category, date, receipt, and notes.",
      },
      {
        key: "manager",
        label: "Manager",
        description: "Approves or rejects submitted expenses.",
      },
      {
        key: "finance",
        label: "Finance",
        description: "Audits all approval decisions.",
      },
    ],
    domainConcepts: [
      {
        key: "expense",
        label: "Expense",
        description: "A claim for reimbursement.",
      },
      {
        key: "approval",
        label: "Approval",
        description: "A manager decision on a submitted expense.",
      },
      {
        key: "audit-trail",
        label: "Audit trail",
        description: "The record of every decision.",
      },
    ],
    workflows: [
      {
        key: "expense-approval",
        label: "Expense approval",
        description: "From submission to decision.",
      },
    ],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "employee-submits",
        given: "an employee with an expense",
        when: "the employee submits it",
        then: "the expense is submitted for approval",
      },
      {
        key: "manager-approves",
        given: "a submitted expense",
        when: "the manager approves it",
        then: "the expense is approved",
      },
      {
        key: "manager-rejects",
        given: "a submitted expense",
        when: "the manager rejects it",
        then: "the expense is rejected",
      },
      {
        key: "finance-audits",
        given: "decided expenses",
        when: "finance audits them",
        then: "every decision is recorded in the audit trail",
      },
    ],
  };

  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1" as const,
    requirementChecksum: "",
    title: "Expense Approval",
    actors: [
      {
        key: "employee",
        label: "Employee",
        permissions: [
          { entityKey: "expense", actions: ["create", "read", "submit"] },
          { entityKey: "employee", actions: ["read", "update"] },
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
        description: "A claim for reimbursement.",
        fields: [
          { key: "amount", label: "Amount", type: "currency", required: true },
          {
            key: "category",
            label: "Category",
            type: "enum",
            required: true,
            options: ["travel", "meals", "software", "office", "other"],
          },
          { key: "date", label: "Date", type: "date", required: true },
          { key: "receipt", label: "Receipt", type: "file", required: false },
          { key: "notes", label: "Notes", type: "long-text", required: false },
        ],
      },
      {
        key: "employee",
        label: "Employee",
        description: "The person who submits expenses.",
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "department",
            label: "Department",
            type: "text",
            required: false,
          },
        ],
      },
    ],
    pageIntents: [
      {
        key: "expense-dashboard",
        label: "Expense dashboard",
        intent: "dashboard",
        entityKey: "expense",
      },
      {
        key: "expense-list",
        label: "Expense list",
        intent: "list",
        entityKey: "expense",
      },
      {
        key: "expense-form",
        label: "New expense",
        intent: "form",
        entityKey: "expense",
      },
      {
        key: "expense-detail",
        label: "Expense detail",
        intent: "detail",
        entityKey: "expense",
      },
      {
        key: "expense-queue",
        label: "Approval queue",
        intent: "queue",
        entityKey: "expense",
      },
      {
        key: "expense-settings",
        label: "Expense settings",
        intent: "settings",
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
        key: "employee-submits-expense",
        description: "An employee submits an expense.",
        steps: [{ actorKey: "employee", action: "submits an expense" }],
      },
      {
        key: "manager-decides-expense",
        description: "A manager approves or rejects a submitted expense.",
        steps: [
          { actorKey: "employee", action: "submits an expense" },
          { actorKey: "manager", action: "approves or rejects it" },
        ],
      },
      {
        key: "finance-audits-decisions",
        description: "Finance audits every decision.",
        steps: [
          { actorKey: "employee", action: "submits an expense" },
          { actorKey: "manager", action: "decides it" },
          { actorKey: "finance", action: "audits the decision" },
        ],
      },
    ],
  };
  blueprint.requirementChecksum = hashRequirementSpec(spec);
  return { spec, blueprint, clarifications: [] };
}

function appointmentBookingInterpretation(): RequirementInterpretationV1 {
  const spec = {
    apiVersion: "factory.requirement-spec/v1" as const,
    requirementId: "appointment-booking-requirement",
    outcome:
      "Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.",
    actors: [
      {
        key: "customer",
        label: "Customer",
        description: "Books an appointment for a service and a time.",
      },
      {
        key: "staff",
        label: "Staff",
        description: "Confirms or reschedules appointments.",
      },
      {
        key: "administrator",
        label: "Administrator",
        description: "Manages services, schedules, and cancellations.",
      },
    ],
    domainConcepts: [
      {
        key: "appointment",
        label: "Appointment",
        description: "A reserved service time.",
      },
      {
        key: "service",
        label: "Service",
        description: "An offer customers book.",
      },
      {
        key: "schedule",
        label: "Schedule",
        description: "The availability window for bookings.",
      },
    ],
    workflows: [
      {
        key: "appointment-lifecycle",
        label: "Appointment lifecycle",
        description: "From request to confirmed, rescheduled, or cancelled.",
      },
    ],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "customer-books",
        given: "a service with availability",
        when: "a customer books an available time",
        then: "the appointment is requested",
      },
      {
        key: "staff-confirms",
        given: "a requested appointment",
        when: "staff confirm it",
        then: "the appointment is confirmed",
      },
      {
        key: "staff-reschedules",
        given: "a confirmed appointment",
        when: "staff reschedule it",
        then: "the appointment is rescheduled",
      },
      {
        key: "administrator-cancels",
        given: "a confirmed appointment",
        when: "an administrator cancels it",
        then: "the appointment is cancelled",
      },
    ],
  };

  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1" as const,
    requirementChecksum: "",
    title: "Appointment Booking",
    actors: [
      {
        key: "customer",
        label: "Customer",
        permissions: [
          {
            entityKey: "appointment",
            // Booking an appointment is the create journey; the composed
            // lifecycle has no customer-owned update or cancel transition.
            actions: ["create", "read"],
          },
        ],
      },
      {
        key: "staff",
        label: "Staff",
        permissions: [
          {
            entityKey: "appointment",
            actions: ["read", "confirm", "reschedule"],
          },
        ],
      },
      {
        key: "administrator",
        label: "Administrator",
        permissions: [
          {
            entityKey: "service",
            actions: ["create", "read", "update", "delete", "manage"],
          },
          {
            entityKey: "schedule",
            actions: ["create", "read", "update", "delete", "manage"],
          },
          {
            // Cancellation is declared as one approved transition per source
            // state — delete removes an unconfirmed request, cancel a
            // confirmed appointment — and every declared transition must be
            // granted to its actor for the composed runtime to serve the flow.
            entityKey: "appointment",
            actions: ["read", "delete", "cancel", "manage"],
          },
        ],
      },
    ],
    entities: [
      {
        key: "service",
        label: "Service",
        description: "An offer customers book.",
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "durationMinutes",
            label: "Duration minutes",
            type: "number",
            required: true,
          },
          { key: "price", label: "Price", type: "currency", required: true },
        ],
      },
      {
        key: "appointment",
        label: "Appointment",
        description: "A reserved service time.",
        fields: [
          {
            key: "serviceKey",
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
        description: "The availability window for bookings.",
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
        key: "booking-calendar",
        label: "Booking calendar",
        intent: "calendar",
        entityKey: "appointment",
      },
      {
        key: "booking-list",
        label: "Appointment list",
        intent: "list",
        entityKey: "appointment",
      },
      {
        key: "booking-form",
        label: "New appointment",
        intent: "form",
        entityKey: "appointment",
      },
      {
        key: "booking-detail",
        label: "Appointment detail",
        intent: "detail",
        entityKey: "appointment",
      },
      {
        key: "service-list",
        label: "Service list",
        intent: "list",
        entityKey: "service",
      },
      {
        key: "service-form",
        label: "New service",
        intent: "form",
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
          { key: "rescheduled", label: "Rescheduled" },
          { key: "cancelled", label: "Cancelled" },
        ],
        transitions: [
          // Booking an appointment is the customer's create journey (the
          // seeded record starts "requested"); no customer-owned transition
          // may confirm the appointment. Confirming is staff-only.
          {
            key: "confirm",
            from: "requested",
            to: "confirmed",
            label: "Confirm",
            actorKey: "staff",
          },
          {
            key: "reschedule",
            from: "confirmed",
            to: "rescheduled",
            label: "Reschedule",
            actorKey: "staff",
          },
          {
            key: "delete",
            from: "requested",
            to: "cancelled",
            label: "Cancel request",
            actorKey: "administrator",
          },
          {
            key: "cancel",
            from: "confirmed",
            to: "cancelled",
            label: "Cancel appointment",
            actorKey: "administrator",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "customer-books-appointment",
        description: "A customer books a service and staff confirm it.",
        steps: [
          {
            actorKey: "customer",
            action: "books a service at an available time",
          },
          { actorKey: "staff", action: "confirms the appointment" },
        ],
      },
      {
        key: "staff-reschedules-appointment",
        description: "Staff reschedule a confirmed appointment.",
        steps: [
          { actorKey: "customer", action: "books a service" },
          { actorKey: "staff", action: "confirms it" },
          { actorKey: "staff", action: "reschedules it" },
        ],
      },
      {
        key: "administrator-cancels-appointment",
        description: "An administrator cancels an appointment.",
        steps: [
          { actorKey: "customer", action: "books a service" },
          { actorKey: "staff", action: "confirms it" },
          { actorKey: "administrator", action: "cancels it" },
        ],
      },
    ],
  };
  blueprint.requirementChecksum = hashRequirementSpec(spec);
  return { spec, blueprint, clarifications: [] };
}

function vagueApprovalInterpretation(
  answers: Readonly<Record<string, string>>,
): RequirementInterpretationV1 {
  const openQuestions = [
    { key: "approval-object", question: "What item requires approval?" },
    {
      key: "approval-levels",
      question: "How many levels of approval are required?",
    },
  ];

  const spec = {
    apiVersion: "factory.requirement-spec/v1" as const,
    requirementId: "approval-brief",
    outcome: "People submit items and approvers decide them.",
    actors: [
      {
        key: "submitter",
        label: "Submitter",
        description: "Submits items for approval.",
      },
      {
        key: "approver",
        label: "Approver",
        description: "Decides on submitted items.",
      },
    ],
    domainConcepts: [
      {
        key: "request",
        label: "Request",
        description: "An item submitted for approval.",
      },
      {
        key: "decision",
        label: "Decision",
        description: "The approver's verdict.",
      },
    ],
    workflows: [
      {
        key: "request-approval",
        label: "Request approval",
        description: "From submission to decision.",
      },
    ],
    constraints: [],
    openQuestions: openQuestions.map((item) => {
      const answer = answers[item.key];
      return answer === undefined
        ? { question: item.question }
        : { question: item.question, answer };
    }),
    acceptanceScenarios: [
      {
        key: "submit-and-decide",
        given: "a submitted item",
        when: "the approver decides it",
        then: "the item is approved or rejected",
      },
    ],
  };

  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1" as const,
    requirementChecksum: "",
    title: "Approval",
    actors: [
      {
        key: "submitter",
        label: "Submitter",
        permissions: [
          { entityKey: "request", actions: ["create", "read", "submit"] },
        ],
      },
      {
        key: "approver",
        label: "Approver",
        permissions: [
          { entityKey: "request", actions: ["read", "approve", "reject"] },
        ],
      },
    ],
    entities: [
      {
        key: "request",
        label: "Request",
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          {
            key: "details",
            label: "Details",
            type: "long-text",
            required: false,
          },
        ],
      },
    ],
    pageIntents: [
      {
        key: "request-list",
        label: "Request list",
        intent: "list",
        entityKey: "request",
      },
      {
        key: "request-form",
        label: "New request",
        intent: "form",
        entityKey: "request",
      },
    ],
    workflows: [
      {
        key: "request-approval",
        label: "Request approval",
        entityKey: "request",
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
            actorKey: "submitter",
          },
          {
            key: "approve",
            from: "submitted",
            to: "approved",
            label: "Approve",
            actorKey: "approver",
          },
          {
            key: "reject",
            from: "submitted",
            to: "rejected",
            label: "Reject",
            actorKey: "approver",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "submit-and-decide",
        description: "A submitter submits and an approver decides.",
        steps: [
          { actorKey: "submitter", action: "submits an item" },
          { actorKey: "approver", action: "decides it" },
        ],
      },
    ],
  };
  blueprint.requirementChecksum = hashRequirementSpec(spec);

  const questions = openQuestions
    .filter((item) => answers[item.key] === undefined)
    .map((item) => ({ key: item.key, question: item.question }));
  return {
    spec,
    blueprint,
    clarifications:
      questions.length === 0
        ? []
        : [
            {
              apiVersion: "factory.composition-clarification/v1",
              requirementChecksum: blueprint.requirementChecksum,
              questions,
            },
          ],
  };
}

canonicalBriefs.set(
  normalizeBrief(
    "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
  ),
  expenseApprovalInterpretation,
);
canonicalBriefs.set(
  normalizeBrief(
    "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.",
  ),
  appointmentBookingInterpretation,
);
canonicalBriefs.set(
  normalizeBrief(
    "I need an application where people can submit things for approval.",
  ),
  vagueApprovalInterpretation,
);

export class FixtureRequirementInterpreter implements RequirementInterpreterAdapterV1 {
  public async interpret(input: {
    readonly brief: string;
    readonly answers: Readonly<Record<string, string>>;
  }): Promise<RequirementInterpretationV1> {
    if (typeof input.brief !== "string" || normalizeBrief(input.brief) === "") {
      throw new RequirementInterpreterError(
        "The requirement brief must be non-empty prose text.",
        "brief_invalid",
      );
    }
    const factory = canonicalBriefs.get(normalizeBrief(input.brief));
    if (factory === undefined) {
      throw new RequirementInterpreterError(
        "No fixture interpretation exists for this brief.",
        "brief_invalid",
      );
    }
    return assertRequirementInterpretation(factory(input.answers));
  }
}
