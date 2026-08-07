import { describe, expect, it } from "vitest";

import {
  assertRequirementSpec,
  CompositionError,
  hashRequirementSpec,
  parseRequirementSpec,
  type RequirementSpecV1,
} from "../src/index.js";

const requirementFixture: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-tracking",
  outcome: "Employees can submit expenses that managers review and approve.",
  actors: [
    {
      key: "employee",
      label: "Employee",
      description: "Submits expense claims",
    },
    { key: "manager", label: "Manager", description: "Reviews and approves" },
  ],
  domainConcepts: [
    {
      key: "expense",
      label: "Expense claim",
      description: "A submitted claim",
    },
  ],
  workflows: [
    {
      key: "submit-approve",
      label: "Submit and approve",
      description: "Draft, submit, approve, reject",
    },
  ],
  constraints: [
    {
      key: "review-deadline",
      kind: "compliance",
      statement: "Managers review within five working days.",
    },
  ],
  openQuestions: [
    {
      question: "Should rejected claims be editable after rejection?",
    },
  ],
  acceptanceScenarios: [
    {
      key: "submit-then-approve",
      given: "an employee with a completed expense draft",
      when: "the employee submits and the manager approves",
      then: "the expense reaches approved status",
    },
  ],
};

describe("RequirementSpecV1", () => {
  it("parses a complete requirement", () => {
    expect(parseRequirementSpec(requirementFixture).requirementId).toBe(
      "expense-tracking",
    );
  });

  it("rejects unknown keys such as raw model material", () => {
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        rawModelResponse: "system: you are an expense planner",
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a prompt payload under a known-sounding key", () => {
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        prompts: [{ role: "user", content: "build me an app" }],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects URLs in business text", () => {
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        outcome: "Sync with the external ledger at https://ledger.example.com.",
      }),
    ).toThrow(CompositionError);
  });

  it("rejects absolute and traversal paths in business text", () => {
    for (const outcome of [
      "Import rows from /etc/passwd.",
      "Load fixtures from ../secrets.env.",
      "Read C:\\Users\\admin\\.env for the source.",
    ]) {
      expect(() =>
        parseRequirementSpec({ ...requirementFixture, outcome }),
      ).toThrow(CompositionError);
    }
  });

  it("rejects unknown keys nested inside actor and scenario items", () => {
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        actors: [
          ...requirementFixture.actors,
          { key: "auditor", label: "Auditor", rawModelResponse: "..." },
        ],
      }),
    ).toThrow(CompositionError);
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        acceptanceScenarios: [
          ...requirementFixture.acceptanceScenarios,
          {
            key: "audit-trail",
            given: "a",
            when: "b",
            then: "c",
            prompts: ["..."],
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects prototype-key material in business text", () => {
    for (const outcome of ["__proto__", "constructor", "prototype"]) {
      expect(() =>
        parseRequirementSpec({ ...requirementFixture, outcome }),
      ).toThrow(CompositionError);
    }
    expect(
      parseRequirementSpec({
        ...requirementFixture,
        outcome: "The prototype covers the full journey.",
      }).outcome,
    ).toBe("The prototype covers the full journey.");
  });

  it("rejects empty open questions and untyped constraints", () => {
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        openQuestions: [{ question: "  " }],
      }),
    ).toThrow(CompositionError);
    expect(() =>
      parseRequirementSpec({
        ...requirementFixture,
        constraints: [
          { key: "x", kind: "mystery", statement: "Anything goes." },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("hashes canonically regardless of object key order", () => {
    const first = hashRequirementSpec(requirementFixture);
    const reordered: unknown = {
      acceptanceScenarios: requirementFixture.acceptanceScenarios,
      actors: requirementFixture.actors,
      apiVersion: requirementFixture.apiVersion,
      constraints: requirementFixture.constraints,
      domainConcepts: requirementFixture.domainConcepts,
      openQuestions: requirementFixture.openQuestions,
      outcome: requirementFixture.outcome,
      requirementId: requirementFixture.requirementId,
      workflows: requirementFixture.workflows,
    };
    expect(hashRequirementSpec(reordered)).toBe(first);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("exposes the required fields through assert", () => {
    expect(assertRequirementSpec(requirementFixture)).toMatchObject({
      apiVersion: "factory.requirement-spec/v1",
      requirementId: "expense-tracking",
    });
  });
});
