import { test } from "@playwright/test";
import { resolve } from "node:path";
import {
  runApprovalDefinitionBatch,
  type ApprovalDefinitionCase,
} from "./helpers/approval-definition-batch";

const justification =
  "Five adjustable desks support the revised shared workspace plan.";
const equipmentCase: ApprovalDefinitionCase = {
  definitionKey: "equipment-procurement-approval",
  brief:
    "Build a local equipment procurement approval app. Employees request a named item with a positive whole quantity, positive estimated unit price and justification. Calculate the estimated total automatically. Managers can return a request with a reason or approve it, and finance reads the decision. Use selectable local demo roles and record approval only, without payment, supplier orders or inventory changes.",
  title: "Equipment Procurement",
  outcome:
    "Employees request equipment and managers decide the estimated cost with retained corrections and reasons.",
  deliveryRegion: "Approval delivery",
  evidenceDirectory: resolve(
    process.cwd(),
    "docs/acceptance/evidence/equipment-procurement",
  ),
  correction: {
    entity: "equipment-request",
    requester: "employee",
    reviewer: "manager",
    auditor: "finance",
    list: "All equipment requests",
    create: "New equipment request",
    createAction: "Create Equipment request",
    identity: "Adjustable shared-workspace desks",
    identityField: "Item name",
    identityKey: "itemName",
    fields: {
      "Item name": "Adjustable shared-workspace desks",
      Quantity: "3",
      "Unit price": "249.5",
      Justification: "Replace worn desks in the shared workspace.",
    },
    requiredFields: [
      { key: "itemName", label: "Item name" },
      { key: "quantity", label: "Quantity" },
      { key: "unitPrice", label: "Unit price" },
      { key: "justification", label: "Justification" },
    ],
    recordMedia: "optional",
    assertAuditorDenied: true,
    invalidUpdates: [
      { quantity: 0 },
      { quantity: 1.5 },
      { unitPrice: 0 },
      { unitPrice: -1 },
      { unitPrice: "299.5" },
      { total: 748.5 },
    ],
    clientInvalidValue: {
      label: "Unit price",
      input: "0",
      message: "greater than 0",
    },
    correction: {
      key: "unitPrice",
      label: "Unit price",
      initialInput: "249.5",
      firstEditInput: "269.5",
      concurrentApiValue: 279.5,
      expectedConflictValue: 279.5,
      finalInput: "299.5",
      expectedFinalValue: 299.5,
    },
    finalCorrectionFields: [
      { key: "quantity", label: "Quantity", input: "5", expectedValue: 5 },
      {
        key: "justification",
        label: "Justification",
        input: justification,
        expectedValue: justification,
      },
    ],
  },
  retainedDetails: { Justification: justification },
  visibleSummary: [
    { label: "Quantity", corrected: "5", additional: "2" },
    { label: "Unit price", corrected: "299.5", additional: "89.9" },
    { label: "Total", corrected: "1497.5", additional: "179.8" },
  ],
  requireVisibleSummaryLabels: true,
  calculatedOutput: { key: "total", label: "Total" },
  additionalApprovedRecord: {
    identity: "Meeting-room display stands",
    fields: {
      "Item name": "Meeting-room display stands",
      Quantity: "2",
      "Unit price": "89.9",
      Justification: "Support portable displays for two meeting rooms.",
    },
  },
};

test("Equipment Procurement assembles a calculated approval product from definition data", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(30_000);
  await runApprovalDefinitionBatch({
    page,
    context,
    request,
    definition: equipmentCase,
  });
});
