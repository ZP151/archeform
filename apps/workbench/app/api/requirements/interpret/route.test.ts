import { afterEach, describe, expect, it, vi } from "vitest";

import { hashRequirementSpec } from "@factory/graph";
import {
  FixtureRequirementInterpreter,
  OpenAIRequirementInterpreterAdapter,
  RequirementInterpreterError,
  type RequirementInterpretationV1,
} from "@factory/adapters";

import { interpreter } from "../../../../lib/product-journey/interpret-provider";
import {
  classifyInterpretationError,
  parseInterpretPayload,
} from "../../../../lib/product-journey/interpret-payload";
import { POST } from "./route";

afterEach(() => {
  delete process.env.FACTORY_FIXTURE_MODE;
});

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const bookingBrief =
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";
const vagueBrief =
  "I need an application where people can submit things for approval.";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://workbench.test/api/requirements/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function interpretationOf(
  response: Response,
): Promise<RequirementInterpretationV1> {
  return response
    .json()
    .then((body: { interpretation?: RequirementInterpretationV1 }) => {
      if (body.interpretation === undefined) {
        throw new Error("Missing interpretation envelope.");
      }
      return body.interpretation;
    });
}

describe("Requirement interpret route", () => {
  it("interprets the expense brief into a checksum-bound interpretation", async () => {
    const response = await post({ brief: expenseBrief });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      interpretation: RequirementInterpretationV1;
    };
    const interpretation = body.interpretation;
    expect(interpretation.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(interpretation.spec),
    );
    expect(interpretation.spec.requirementId).toBe(
      "expense-approval-requirement",
    );
    // The raw brief is transient input: the response carries only parsed
    // semantics, never the verbatim brief prose.
    expect(JSON.stringify(body)).not.toContain(
      "Managers approve or reject them, and finance can audit all decisions.",
    );
  });

  it("keeps the two acceptance briefs materially different", async () => {
    const expense = await interpretationOf(await post({ brief: expenseBrief }));
    const booking = await interpretationOf(await post({ brief: bookingBrief }));
    expect(expense.blueprint.requirementChecksum).not.toBe(
      booking.blueprint.requirementChecksum,
    );
    expect(expense.spec.requirementId).not.toBe(booking.spec.requirementId);
  });

  it("asks bounded clarification questions for a vague brief", async () => {
    const response = await post({ brief: vagueBrief });
    expect(response.status).toBe(200);
    const interpretation = await interpretationOf(response);
    expect(interpretation.clarifications.length).toBe(1);
    const [clarification] = interpretation.clarifications;
    expect(clarification.requirementChecksum).toBe(
      interpretation.blueprint.requirementChecksum,
    );
    expect(clarification.questions.length).toBeGreaterThan(0);
  });

  it("re-interprets with answers until no clarification remains", async () => {
    const first = await interpretationOf(await post({ brief: vagueBrief }));
    const [clarification] = first.clarifications;
    const answers = Object.fromEntries(
      clarification.questions.map((question, index) => [
        question.key,
        `answer ${index}`,
      ]),
    );
    const second = await interpretationOf(
      await post({ brief: vagueBrief, answers }),
    );
    expect(second.clarifications).toEqual([]);
    for (const question of second.spec.openQuestions) {
      expect(question).toHaveProperty("answer");
    }
  });

  it("rejects an empty or oversized brief", async () => {
    for (const body of [{ brief: "   " }, { brief: "x".repeat(12_001) }]) {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.request_invalid",
        },
      });
    }
  });

  it("rejects an oversized clarification answer", async () => {
    const response = await post({
      brief: vagueBrief,
      answers: { "q-something": "x".repeat(1_001) },
    });
    expect(response.status).toBe(400);
  });

  it("rejects more answers than the bounded limit", async () => {
    const answers = Object.fromEntries(
      Array.from({ length: 31 }, (_, index) => [`q-${index}`, "x"]),
    );
    expect((await post({ brief: vagueBrief, answers })).status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const response = await POST(
      new Request("http://workbench.test/api/requirements/interpret", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        apiVersion: "factory.requirement-interpretation-error/v1",
        code: "requirement.request_invalid",
      },
    });
  });

  it("rejects an unknown envelope field fail-closed", async () => {
    const response = await post({ session: { brief: expenseBrief } });
    expect(response.status).toBe(400);
  });

  it("selects the fixture only under test or the explicit dev lever", () => {
    const environment = process.env as Record<string, string | undefined>;
    const originalNodeEnv = environment.NODE_ENV;
    try {
      // Outside test with no lever the route must demand the real provider.
      environment.NODE_ENV = "production";
      expect(interpreter()).toBeInstanceOf(OpenAIRequirementInterpreterAdapter);
      // The explicit dev/E2E lever activates the deterministic fixture.
      environment.FACTORY_FIXTURE_MODE = "1";
      expect(interpreter()).toBeInstanceOf(FixtureRequirementInterpreter);
      // The lever is never a default: unset again, the real provider returns.
      delete environment.FACTORY_FIXTURE_MODE;
      expect(interpreter()).toBeInstanceOf(OpenAIRequirementInterpreterAdapter);
    } finally {
      if (originalNodeEnv === undefined) delete environment.NODE_ENV;
      else environment.NODE_ENV = originalNodeEnv;
    }
  });

  it("classifies every failure to its exact code-only body and status", () => {
    expect(
      classifyInterpretationError(
        new RequirementInterpreterError(
          "must-not-surface",
          "provider_not_configured",
        ),
      ),
    ).toEqual({
      status: 503,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.provider_not_configured",
        },
      },
    });
    expect(
      classifyInterpretationError(
        new RequirementInterpreterError("must-not-surface", "request_invalid"),
      ),
    ).toEqual({
      status: 400,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.request_invalid",
        },
      },
    });
    expect(
      classifyInterpretationError(
        new RequirementInterpreterError("must-not-surface", "output_invalid"),
      ),
    ).toEqual({
      status: 422,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.output_invalid",
        },
      },
    });
    expect(
      classifyInterpretationError(
        new RequirementInterpreterError(
          "must-not-surface",
          "provider_rejected",
        ),
      ),
    ).toEqual({
      status: 502,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.provider_rejected",
        },
      },
    });
    expect(
      classifyInterpretationError(
        new RequirementInterpreterError("must-not-surface", "timeout"),
      ),
    ).toEqual({
      status: 504,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.timeout",
        },
      },
    });
    expect(classifyInterpretationError(new Error("must-not-surface"))).toEqual({
      status: 500,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.failed",
        },
      },
    });
  });

  it("fails closed for a hostile runtime interpreter code without echoing or logging it", () => {
    const sentinel = "HOSTILE-RUNTIME-CODE-MUST-NOT-SURFACE";
    const consoleSpies = ["log", "info", "warn", "error", "debug", "trace"].map(
      (method) =>
        vi.spyOn(console, method as "log").mockImplementation(() => undefined),
    );
    const error = new RequirementInterpreterError("fixed", "failed");
    Object.defineProperty(error, "code", { value: sentinel });

    const classified = classifyInterpretationError(error);

    expect(classified).toEqual({
      status: 500,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.failed",
        },
      },
    });
    expect(
      JSON.stringify({
        classified,
        console: consoleSpies.map((spy) => spy.mock.calls),
      }),
    ).not.toContain(sentinel);
  });

  it("parses only the bounded brief and answers envelope", () => {
    expect(parseInterpretPayload({ brief: expenseBrief })).toEqual({
      brief: expenseBrief,
      answers: {},
    });
    expect(
      parseInterpretPayload({ brief: expenseBrief, answers: { a: "b" } }),
    ).toEqual({ brief: expenseBrief, answers: { a: "b" } });
    expect(parseInterpretPayload(null)).toBeNull();
    expect(parseInterpretPayload({ brief: 42 })).toBeNull();
    expect(
      parseInterpretPayload({ brief: expenseBrief, extra: true }),
    ).toBeNull();
    expect(
      parseInterpretPayload({ brief: expenseBrief, answers: [1, 2] }),
    ).toBeNull();
  });

  it("parses bounded structured clarification context and rejects mismatches", () => {
    const context = [
      {
        key: "approval-role",
        category: "authorization",
        defaultPolicy: "required",
        question: "Who may approve a request?",
        answer: "Managers approve submitted requests.",
      },
    ];
    expect(
      parseInterpretPayload({
        brief: expenseBrief,
        answers: { "approval-role": context[0].answer },
        clarificationContext: context,
      }),
    ).toEqual({
      brief: expenseBrief,
      answers: { "approval-role": context[0].answer },
      clarificationContext: context,
    });
    expect(
      parseInterpretPayload({
        brief: expenseBrief,
        answers: { "approval-role": "A different answer." },
        clarificationContext: context,
      }),
    ).toBeNull();
  });

  it("accepts only a validated prior interpretation as transient context", async () => {
    const priorInterpretation =
      await new FixtureRequirementInterpreter().interpret({
        brief: expenseBrief,
        answers: {},
      });
    expect(
      parseInterpretPayload({ brief: expenseBrief, priorInterpretation }),
    ).toEqual({ brief: expenseBrief, answers: {}, priorInterpretation });
    expect(
      parseInterpretPayload({
        brief: expenseBrief,
        priorInterpretation: { ...priorInterpretation, clarifications: [] },
        extra: true,
      }),
    ).toBeNull();
    expect(
      parseInterpretPayload({
        brief: expenseBrief,
        priorInterpretation: {
          ...priorInterpretation,
          blueprint: {
            ...priorInterpretation.blueprint,
            requirementChecksum: `sha256:${"0".repeat(64)}`,
          },
        },
      }),
    ).toBeNull();
  });
});
