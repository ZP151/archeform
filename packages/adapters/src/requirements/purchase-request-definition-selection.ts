import { z } from "zod";
import { createApprovalDefinition } from "./approval-definition-template.js";
export const purchaseRequestApprovalDefinition = createApprovalDefinition({
  definitionKey: "purchase-request-approval",
  guideTag: "supported-purchase-request-default",
  identity:
    "Local demo with explicitly selectable requester, manager and procurement roles; role-wide reads, no requester-owned record privacy or tenant isolation.",
  integrations:
    "No external purchasing, inventory, invoice, payment, identity or notification integration.",
  instruction:
    "Every Purchase Request approval brief returns definition-selection with definitionKey purchase-request-approval, generatedInterpretation null and businessParameters null. The reviewed correction local demo lets a requester create and edit drafts, submit, revise returned records and resubmit the same record; one manager approves or returns with a required reason, and procurement read and audit. An approval records a decision only: it does not place purchase orders, reserve inventory, contact suppliers, create invoices, or spend or transfer money. Omitted routine pages and presentation accept supported-default with zero questions. Explicit or ambiguous requester-only or private records, real identity, SSO, tenant isolation, thresholds, budgets, multiple or sequential reviewers, editing submitted or approved records, reopening approved records, configurable reason policy, changed fields, requiredness or category options, currency codes or symbols or conversion, quote or file storage, purchase orders, vendor management, ERP or procurement integrations, inventory, fulfilment, invoices, payments or external notification delivery require needs-clarification. Preserve every independent material question using authorization, visibility, role, business-rule, data or integration. Follow-ups retain every still-required exclusion until the user explicitly accepts supported scope; never infer acceptance or hide requirements in identity text. Amount is numeric requested amount without an invented currency code, symbol or payment. The exact roles are selectable local demo roles with role-wide reads.",
  fields: [
    {
      key: "amount",
      label: "Amount",
      type: "currency",
      required: true,
    },
    {
      key: "category",
      label: "Category",
      type: "enum",
      required: true,
      options: ["equipment", "software", "services", "supplies", "other"],
    },
    {
      key: "neededBy",
      label: "Needed by",
      type: "date",
      required: true,
    },
    {
      key: "item",
      label: "Item",
      type: "text",
      required: true,
    },
    {
      key: "supplier",
      label: "Supplier",
      type: "text",
      required: false,
    },
    {
      key: "businessJustification",
      label: "Business justification",
      type: "long-text",
      required: true,
    },
  ],
  copy: {
    requirementId: "purchase-request-approval-requirement",
    outcome:
      "Requesters submit purchase requests and managers decide them; procurement audits the decisions.",
    requesterKey: "requester",
    requesterLabel: "Requester",
    requesterDescription:
      "Submits purchase requests with amount, category, needed date, item, supplier, and business justification.",
    reviewerKey: "manager",
    reviewerLabel: "Manager",
    reviewerDescription: "Approves or returns submitted purchase requests.",
    auditorKey: "procurement",
    auditorLabel: "Procurement",
    auditorDescription: "Audits all approval decisions.",
    entityKey: "purchase-request",
    entityLabel: "Purchase request",
    entityDescription: "A request for a manager decision before a purchase.",
    decisionDescription: "A manager decision on a submitted purchase request.",
    workflowLabel: "Purchase request approval",
    submitScenarioKey: "requester-submits",
    submitGiven: "a requester with a purchase request",
    submitWhen: "the requester submits it",
    submitThen: "the purchase request is submitted for approval",
    approveScenarioKey: "manager-approves",
    decisionGiven: "a submitted purchase request",
    approveWhen: "the manager approves it",
    approveThen: "the purchase request is approved",
    rejectScenarioKey: "manager-rejects",
    rejectWhen: "the manager returns it with a reason",
    rejectThen:
      "the purchase request is returned with a required reason for same-record revision and resubmission",
    auditScenarioKey: "procurement-audits",
    auditGiven: "decided purchase requests",
    auditWhen: "procurement audits them",
    auditThen: "every decision is recorded in the audit trail",
    title: "Purchase Request Approval",
    requesterEntityDescription: "The person who submits purchase requests.",
    dashboardLabel: "Purchase request dashboard",
    listLabel: "Purchase request list",
    formLabel: "New purchase request",
    detailLabel: "Purchase request detail",
    settingsLabel: "Purchase request settings",
    submitJourneyKey: "requester-submits-purchase-request",
    submitJourneyDescription: "A requester submits a purchase request.",
    submitAction: "submits a purchase request",
    decisionJourneyKey: "manager-decides-purchase-request",
    decisionJourneyDescription:
      "A manager approves or returns a submitted purchase request.",
    decisionAction: "approves or returns it",
    auditJourneyKey: "procurement-audits-decisions",
    auditJourneyDescription: "Procurement audits every decision.",
    reviewAction: "decides it",
    auditAction: "audits the decision",
  },
});
export const purchaseRequestDefinitionSelectionSchema =
  purchaseRequestApprovalDefinition.selectionSchema;
export type PurchaseRequestDefinitionSelectionV1 = z.infer<
  typeof purchaseRequestDefinitionSelectionSchema
>;
export const canonicalPurchaseRequestApprovalInterpretation =
  purchaseRequestApprovalDefinition.canonical;
export const projectPurchaseRequestDefinitionSelection =
  purchaseRequestApprovalDefinition.project;
