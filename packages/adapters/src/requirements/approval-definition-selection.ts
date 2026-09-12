import { z } from "zod";
import { createApprovalDefinition } from "./approval-definition-template.js";

export const expenseApprovalDefinition = createApprovalDefinition({
  definitionKey: "expense-approval",
  guideTag: "supported-expense-default",
  identity:
    "Local demo with explicitly selectable employee, manager and finance roles; role-wide reads, no requester-owned record privacy or tenant isolation.",
  integrations:
    "No external identity, HR, accounting, notification delivery or real receipt storage integration.",
  instruction: [
    "Every Expense Approval brief returns definition-selection with definitionKey expense-approval, generatedInterpretation null and businessParameters null. Do not generate its blueprint or supply fields, pages, permissions or workflows in the selection.",

    "A coarse expense submission and manager approval request accepts omitted canonical fields, permissions, page intents and workflow details as supported defaults, with zero materialQuestions. A detailed request is supported-default only when every explicit requirement is compatible with this exact default. A display title and requirementId customize identity text only; neither changes business structure. Use a trimmed safe display title of 2 through 80 characters, a lowercase kebab-case requirementId of at most 128 characters and an outcome of at most 2000 characters.",
    "The supported workflow is draft to submitted by employee, then approved or returned with a required reason by a single manager; employees may edit drafts, revise returned records to draft and resubmit the same record; finance audits all decisions. Amount, category and date are required; receipt and notes are optional; category options are travel, meals, software, office and other. Employee name is required and department optional. The roles are explicitly selectable demo roles with role-wide reads. Omitted routine details do not require questions.",
    "Any explicit or ambiguous change to authority, visibility, identity, tenant boundary, fields or requiredness, enum values, workflow or integrations requires needs-clarification with at least one material question. Never discard or approximate an explicit incompatible requirement to select supported-default. Preserve every independent material question in the first response, using only authorization, visibility, role, business-rule, data or integration categories. Keep technical plans, packages, provider setup and credentials out of the questions.",
    "Multiple approval levels, thresholds or an ambiguous decision owner require a role or business-rule question; missing reviewer read permission or changed decision rights require authorization clarification. Requester-only privacy, requests that each employee sees only their own records, and private multiuser access require visibility or authorization clarification: role-wide demo reads do not satisfy requester-only privacy. External authentication, SSO, tenant isolation or real users require authorization or integration clarification. Changed required fields require data clarification. Withdrawal, reopening approved records, editing submitted or approved records, configurable reason policy and post-approval changes require business-rule clarification. HR, accounting, external notifications, file upload storage and other external integrations require integration clarification; a receipt placeholder is not real receipt storage.",
    "For Expense Approval follow-ups, retain needs-clarification for every still-required unsupported capability, even when the user has answered a prior question. Only explicit acceptance of the exact supported scope can resolve an unsupported-scope question; an answer that still demands requester privacy, external identity or different authority/workflow is never supported-default. Never infer acceptance from an answer, omit a material requirement or implement unsupported semantics through title or outcome.",
  ].join(" "),

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
  copy: {
    requirementId: "expense-approval-requirement",
    outcome:
      "Employees submit expenses and managers decide them; finance audits the decisions.",
    requesterKey: "employee",
    requesterLabel: "Employee",
    requesterDescription:
      "Submits expenses with amount, category, date, receipt, and notes.",
    reviewerKey: "manager",
    reviewerLabel: "Manager",
    reviewerDescription: "Approves or returns submitted expenses.",
    auditorKey: "finance",
    auditorLabel: "Finance",
    auditorDescription: "Audits all approval decisions.",
    entityKey: "expense",
    entityLabel: "Expense",
    entityDescription: "A claim for reimbursement.",
    decisionDescription: "A manager decision on a submitted expense.",
    workflowLabel: "Expense approval",
    submitScenarioKey: "employee-submits",
    submitGiven: "an employee with an expense",
    submitWhen: "the employee submits it",
    submitThen: "the expense is submitted for approval",
    approveScenarioKey: "manager-approves",
    decisionGiven: "a submitted expense",
    approveWhen: "the manager approves it",
    approveThen: "the expense is approved",
    rejectScenarioKey: "manager-rejects",
    rejectWhen: "the manager returns it with a reason",
    rejectThen:
      "the expense is returned with a required reason for same-record revision and resubmission",
    auditScenarioKey: "finance-audits",
    auditGiven: "decided expenses",
    auditWhen: "finance audits them",
    auditThen: "every decision is recorded in the audit trail",
    title: "Expense Approval",
    requesterEntityDescription: "The person who submits expenses.",
    dashboardLabel: "Expense dashboard",
    listLabel: "Expense list",
    formLabel: "New expense",
    detailLabel: "Expense detail",
    settingsLabel: "Expense settings",
    submitJourneyKey: "employee-submits-expense",
    submitJourneyDescription: "An employee submits an expense.",
    submitAction: "submits an expense",
    decisionJourneyKey: "manager-decides-expense",
    decisionJourneyDescription:
      "A manager approves or returns a submitted expense.",
    decisionAction: "approves or returns it",
    auditJourneyKey: "finance-audits-decisions",
    auditJourneyDescription: "Finance audits every decision.",
    reviewAction: "decides it",
    auditAction: "audits the decision",
  },
});
export const approvalDefinitionSelectionSchema =
  expenseApprovalDefinition.selectionSchema;
export type ApprovalDefinitionSelectionV1 = z.infer<
  typeof approvalDefinitionSelectionSchema
>;
export const canonicalExpenseApprovalInterpretation =
  expenseApprovalDefinition.canonical;
export const projectApprovalDefinitionSelection =
  expenseApprovalDefinition.project;
