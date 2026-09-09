import { z } from "zod";
import {
  graphKeySchema,
  hashRequirementSpec,
  safeBusinessTextSchema,
  type ProductBlueprintV1,
} from "@factory/graph";
import {
  assertRequirementInterpretation,
  deriveClarifications,
  type RequirementInterpretationV1,
} from "./requirement-interpreter.js";

const materialQuestionSchema = z
  .object({
    category: z.enum([
      "authorization",
      "visibility",
      "role",
      "business-rule",
      "data",
      "integration",
    ]),
    question: safeBusinessTextSchema.max(500),
  })
  .strict();

/** Private provider selection; never a public Graph or package-root contract. */
export const approvalDefinitionSelectionSchema = z
  .object({
    definitionKey: z.literal("expense-approval"),
    disposition: z.enum(["supported-default", "needs-clarification"]),
    requirementId: graphKeySchema,
    title: safeBusinessTextSchema
      .min(2)
      .max(80)
      .refine(
        (value) =>
          value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value),
        "Approval display names must be trimmed and exclude control characters.",
      ),
    outcome: safeBusinessTextSchema.max(2000),
    materialQuestions: z.array(materialQuestionSchema).max(30),
    businessParameters: z.null(),
  })
  .strict()
  .superRefine((selection, context) => {
    if (
      (selection.disposition === "supported-default") !==
      (selection.materialQuestions.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The selection disposition must match its material questions.",
      });
    }
  });

export type ApprovalDefinitionSelectionV1 = z.infer<
  typeof approvalDefinitionSelectionSchema
>;

/** Canonical D2 authority, extracted unchanged from the deterministic fixture. */
export function canonicalExpenseApprovalInterpretation(): RequirementInterpretationV1 {
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

/** Substitute only validated presentation and requirement/question identity. */
export function projectApprovalDefinitionSelection(
  selection: ApprovalDefinitionSelectionV1,
): RequirementInterpretationV1 {
  const canonical = canonicalExpenseApprovalInterpretation();
  const spec = {
    ...canonical.spec,
    requirementId: selection.requirementId,
    outcome: selection.outcome,
    openQuestions: selection.materialQuestions.map((question) => ({
      ...question,
    })),
  };
  return assertRequirementInterpretation({
    spec,
    blueprint: {
      ...canonical.blueprint,
      title: selection.title,
      requirementChecksum: hashRequirementSpec(spec),
    },
    clarifications: deriveClarifications(spec),
  });
}
