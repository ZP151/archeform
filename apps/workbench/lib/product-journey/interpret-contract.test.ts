import { describe, expect, it } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";

import { parseInterpretationResponse } from "./interpret-contract";

const brief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";

describe("interpretation response contract", () => {
  it("accepts only the new code-only V2 refusal pair", () => {
    const error = {
      apiVersion: "factory.requirement-interpretation-error/v2",
      code: "requirement.definition_scope_unresolved",
    };
    expect(
      parseInterpretationResponse(422, { error }, "clarification"),
    ).toMatchObject({ ok: false, failure: { code: error.code } });
    for (const [status, candidate] of [
      [400, error],
      [
        422,
        { ...error, apiVersion: "factory.requirement-interpretation-error/v1" },
      ],
      [422, { ...error, code: "requirement.output_invalid" }],
      [422, { ...error, message: "untrusted" }],
      [422, { ...error, details: {} }],
      [
        422,
        { ...error, apiVersion: "factory.requirement-interpretation-error/v3" },
      ],
    ] as const) {
      expect(
        parseInterpretationResponse(
          status,
          { error: candidate },
          "clarification",
        ),
      ).toMatchObject({ ok: false, failure: { code: "requirement.failed" } });
    }
  });
  it("accepts only an exact, strictly revalidated success envelope", async () => {
    const interpretation = await new FixtureRequirementInterpreter().interpret({
      brief,
      answers: {},
    });
    expect(
      parseInterpretationResponse(200, interpretation, "interpretation"),
    ).toEqual({ ok: true, interpretation });
    expect(
      parseInterpretationResponse(
        200,
        { interpretation, extra: "must-not-surface" },
        "interpretation",
      ),
    ).toEqual({
      ok: false,
      failure: {
        phase: "interpretation",
        code: "requirement.failed",
        message: "Requirement interpretation failed.",
      },
    });
    expect(
      parseInterpretationResponse(
        200,
        {
          interpretation: {
            ...interpretation,
            extra: "must-not-surface",
          },
        },
        "interpretation",
      ),
    ).toEqual({
      ok: false,
      failure: {
        phase: "interpretation",
        code: "requirement.failed",
        message: "Requirement interpretation failed.",
      },
    });
  });

  it("accepts only exact failure keys, version, code, and matching status", () => {
    expect(
      parseInterpretationResponse(
        503,
        {
          error: {
            apiVersion: "factory.requirement-interpretation-error/v1",
            code: "requirement.provider_unavailable",
          },
        },
        "interpretation",
      ),
    ).toEqual({
      ok: false,
      failure: {
        phase: "interpretation",
        code: "requirement.provider_unavailable",
        message: "Requirement interpretation is temporarily unavailable.",
      },
    });
    for (const body of [
      {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.provider_unavailable",
          extra: "must-not-surface",
        },
      },
      {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.unknown",
        },
      },
    ]) {
      expect(parseInterpretationResponse(502, body, "interpretation")).toEqual({
        ok: false,
        failure: {
          phase: "interpretation",
          code: "requirement.failed",
          message: "Requirement interpretation failed.",
        },
      });
    }
  });

  it("uses fixed clarification timeout text", () => {
    expect(
      parseInterpretationResponse(
        504,
        {
          error: {
            apiVersion: "factory.requirement-interpretation-error/v1",
            code: "requirement.timeout",
          },
        },
        "clarification",
      ),
    ).toEqual({
      ok: false,
      failure: {
        phase: "clarification",
        code: "requirement.timeout",
        message: "Requirement clarification timed out.",
      },
    });
  });

  it.each([
    [
      400,
      "requirement.request_invalid",
      "Check the requirement and try again.",
    ],
    [
      422,
      "requirement.output_invalid",
      "Requirement interpretation was rejected.",
    ],
    [
      502,
      "requirement.provider_rejected",
      "Requirement interpretation could not start.",
    ],
    [
      503,
      "requirement.provider_not_configured",
      "Requirement interpretation is not configured.",
    ],
    [
      503,
      "requirement.provider_unavailable",
      "Requirement interpretation is temporarily unavailable.",
    ],
    [504, "requirement.timeout", "Requirement interpretation timed out."],
    [500, "requirement.failed", "Requirement interpretation failed."],
  ] as const)(
    "maps %s/%s to provider-free fixed UI text",
    (status, code, message) => {
      expect(
        parseInterpretationResponse(
          status,
          {
            error: {
              apiVersion: "factory.requirement-interpretation-error/v1",
              code,
            },
          },
          "interpretation",
        ),
      ).toEqual({
        ok: false,
        failure: { phase: "interpretation", code, message },
      });
    },
  );
});
