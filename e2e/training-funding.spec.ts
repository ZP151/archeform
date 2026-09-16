import { test } from "@playwright/test";
import { resolve } from "node:path";
import {
  runApprovalDefinitionBatch,
  type ApprovalDefinitionCase,
} from "./helpers/approval-definition-batch";

const finalJustification =
  "Revised course outline and budget support better project reviews for the team.";
const trainingFundingCase: ApprovalDefinitionCase = {
  definitionKey: "training-funding-approval",
  brief:
    "Build a local training funding approval app. Employees request a course with its session date, a positive fee and justification. Managers return requests with a reason or approve them, and finance reads the decisions. Use selectable local demo roles; record funding approval only, without payments, enrollment or private employee accounts.",
  title: "Training Funding",
  outcome:
    "Employees request training funding and managers decide it with retained revisions and reasons.",
  deliveryRegion: "Approval delivery",
  evidenceDirectory: resolve(
    process.cwd(),
    "docs/acceptance/evidence/training-funding",
  ),
  correction: {
    entity: "training-request",
    requester: "employee",
    reviewer: "manager",
    auditor: "finance",
    list: "All training requests",
    create: "New training request",
    createAction: "Create Training request",
    identity: "Leading effective project reviews",
    identityField: "Course title",
    identityKey: "courseTitle",
    fields: {
      "Course title": "Leading effective project reviews",
      Fee: "249.5",
      "Session date": "2026-11-12",
      Justification:
        "Improve the team's project review practice with a focused course.",
    },
    requiredFields: [
      { key: "courseTitle", label: "Course title" },
      { key: "fee", label: "Fee" },
      { key: "sessionDate", label: "Session date" },
      { key: "justification", label: "Justification" },
    ],
    recordMedia: "optional",
    assertAuditorDenied: true,
    invalidUpdates: [{ fee: 0 }, { fee: -1 }, { fee: "299.5" }],
    clientInvalidValue: {
      label: "Fee",
      input: "0",
      message: "Fee must be greater than 0.",
    },
    correction: {
      key: "fee",
      label: "Fee",
      initialInput: "249.5",
      firstEditInput: "269.5",
      concurrentApiValue: 279.5,
      expectedConflictValue: 279.5,
      finalInput: "299.5",
      expectedFinalValue: 299.5,
    },
    finalCorrectionFields: [
      {
        key: "justification",
        label: "Justification",
        input: finalJustification,
        expectedValue: finalJustification,
      },
    ],
  },
  retainedDetails: { Justification: finalJustification },
  visibleSummary: [
    { label: "Fee", corrected: "299.5", additional: "449" },
    {
      label: "Session date",
      corrected: "2026-11-12",
      additional: "2026-12-04",
    },
  ],
  additionalApprovedRecord: {
    identity: "Practical service design",
    fields: {
      "Course title": "Practical service design",
      Fee: "449",
      "Session date": "2026-12-04",
      Justification: "Learn to improve the employee service experience.",
    },
  },
};

test("Training Funding assembles from definition data and completes correction", async ({
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
    definition: trainingFundingCase,
  });
});
