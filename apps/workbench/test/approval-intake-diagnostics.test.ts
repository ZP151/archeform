import { describe, expect, it } from "vitest";
import {
  deriveClarifications,
  FixtureRequirementInterpreter,
} from "@factory/adapters";
import { hashRequirementSpec } from "@factory/graph";
import { approvalIntakeFacts } from "../../../e2e/helpers/approval-intake-diagnostics";

async function fixture() {
  return new FixtureRequirementInterpreter().interpret({
    brief:
      "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
    answers: {},
  });
}

describe("approval acceptance diagnostics", () => {
  it("reports safe counts for a complete approval without exposing business content", async () => {
    const input = await fixture();
    input.interpretation.blueprint.title = "SYNTHETIC_PRIVATE_DETAIL";
    const facts = approvalIntakeFacts(input);
    expect(facts).toEqual({
      schemaValid: true,
      productType: "unspecified",
      actorCount: 3,
      entityCount: 2,
      questionCount: 0,
      workflows: [
        {
          requesterCount: 1,
          reviewerCount: 1,
          formPages: 1,
          queuePages: 1,
          listPages: 1,
          hasSubmit: true,
          hasApprove: true,
          hasReject: true,
        },
      ],
    });
    expect(JSON.stringify(facts)).not.toMatch(
      /SYNTHETIC_PRIVATE_DETAIL|expense|employee|manager|finance/,
    );
  });

  it("distinguishes compatible but incomplete consumer shapes", async () => {
    const input = await fixture();
    input.interpretation.blueprint.pageIntents =
      input.interpretation.blueprint.pageIntents.filter(
        (p) => p.intent !== "queue",
      );
    input.interpretation.blueprint.actors.find(
      (a) => a.key === "manager",
    )!.permissions[0].actions = ["approve", "reject"];
    expect(approvalIntakeFacts(input)).toMatchObject({
      schemaValid: true,
      workflows: [{ reviewerCount: 0, queuePages: 0 }],
    });
  });

  it("reduces invalid or hostile input to one fixed flag", () => {
    for (const input of [
      null,
      "SYNTHETIC_PRIVATE_DETAIL",
      { interpretation: { blueprint: { title: "SYNTHETIC_PRIVATE_DETAIL" } } },
      {
        get interpretation() {
          throw new Error("SYNTHETIC_PRIVATE_DETAIL");
        },
      },
    ]) {
      expect(approvalIntakeFacts(input)).toEqual({ schemaValid: false });
    }
  });

  it("counts material privacy questions without returning their text or categories", async () => {
    const input = await fixture();
    input.interpretation.spec.openQuestions = [
      { category: "visibility", question: "SYNTHETIC_PRIVATE_DETAIL" },
    ];
    input.interpretation.blueprint.requirementChecksum = hashRequirementSpec(
      input.interpretation.spec,
    );
    const facts = approvalIntakeFacts({
      ...input,
      interpretation: {
        ...input.interpretation,
        clarifications: deriveClarifications(input.interpretation.spec),
      },
    });
    expect(facts).toMatchObject({
      schemaValid: true,
      questionCount: 1,
    });
    expect(JSON.stringify(facts)).not.toContain("SYNTHETIC_PRIVATE_DETAIL");
    expect(facts).not.toHaveProperty("questionCategories");
  });
});
