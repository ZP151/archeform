import { describe, expect, it } from "vitest";

import {
  hashProductBlueprint,
  hashRequirementSpec,
  parseProductBlueprint,
  parseRequirementSpec,
} from "@factory/graph";
import type { OpenAIResponseTransport } from "../src/ai.js";
import type { OpenAITransportRequest } from "../src/ai.js";
import { FixtureRequirementInterpreter } from "../src/requirements/fixture-interpreter.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";
import { RequirementInterpreterError } from "../src/requirements/requirement-interpreter.js";

const expenseApprovalBrief = [
  "Build an expense approval application. Employees submit expenses with",
  "amount, category, date, receipt, and notes. Managers approve or reject",
  "them, and finance can audit all decisions.",
].join(" ");

const appointmentBookingBrief = [
  "Build an appointment booking application. Customers choose a service and",
  "an available time, staff confirm or reschedule appointments, and",
  "administrators manage services, schedules, and cancellations.",
].join(" ");

const vagueApprovalBrief = [
  "I need an application where people can submit things for approval.",
].join(" ");

describe("RequirementInterpreterAdapterV1 contract", () => {
  it("interpretations carry exactly the spec, blueprint, and clarifications — never the brief", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const interpretation = await interpreter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(Object.keys(interpretation).sort()).toEqual([
      "blueprint",
      "clarifications",
      "spec",
    ]);
    expect(JSON.stringify(interpretation)).not.toContain(
      "Build an expense approval application",
    );
  });
});

describe("FixtureRequirementInterpreter (test authority)", () => {
  it("Prompt A yields a schema-valid spec and blueprint bound to the exact requirement checksum", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const interpretation = await interpreter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });

    const spec = parseRequirementSpec(interpretation.spec);
    const blueprint = parseProductBlueprint(interpretation.blueprint);
    expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));
    expect(interpretation.clarifications).toEqual([]);

    expect(blueprint.title).toBe("Expense Approval");
    const entityKeys = blueprint.entities.map((entity) => entity.key);
    expect(entityKeys).toContain("expense");
    const expense = blueprint.entities.find(
      (entity) => entity.key === "expense",
    );
    expect(expense?.fields.map((field) => field.key).sort()).toEqual([
      "amount",
      "category",
      "date",
      "notes",
      "receipt",
    ]);
    const amount = expense?.fields.find((field) => field.key === "amount");
    expect(amount?.type).toBe("currency");
    const category = expense?.fields.find((field) => field.key === "category");
    expect(category?.type).toBe("enum");
    expect(category?.options).toContain("travel");

    const actorKeys = blueprint.actors.map((actor) => actor.key);
    expect(actorKeys).toEqual(
      expect.arrayContaining(["employee", "manager", "finance"]),
    );
    const pageKeys = blueprint.pageIntents.map((page) => page.key);
    expect(pageKeys).toEqual(
      expect.arrayContaining([
        "expense-dashboard",
        "expense-list",
        "expense-form",
      ]),
    );
    const workflow = blueprint.workflows.find(
      (candidate) => candidate.key === "expense-approval",
    );
    expect(workflow?.states.map((state) => state.key)).toEqual(
      expect.arrayContaining(["submitted", "approved", "rejected"]),
    );
    expect(
      workflow?.transitions.map((transition) => transition.key).sort(),
    ).toEqual(["approve", "reject", "submit"]);
  });

  it("Prompt B yields a materially different spec and blueprint", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const interpretation = await interpreter.interpret({
      brief: appointmentBookingBrief,
      answers: {},
    });

    const spec = parseRequirementSpec(interpretation.spec);
    const blueprint = parseProductBlueprint(interpretation.blueprint);
    expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));

    expect(blueprint.title).toBe("Appointment Booking");
    const entityKeys = blueprint.entities.map((entity) => entity.key);
    expect(entityKeys).toEqual(
      expect.arrayContaining(["appointment", "service", "schedule"]),
    );
    const appointment = blueprint.entities.find(
      (entity) => entity.key === "appointment",
    );
    const serviceReference = appointment?.fields.find(
      (field) => field.key === "serviceKey",
    );
    expect(serviceReference?.type).toBe("reference");
    expect(serviceReference?.referenceTo).toBe("service");

    const actorKeys = blueprint.actors.map((actor) => actor.key);
    expect(actorKeys).toEqual(
      expect.arrayContaining(["customer", "staff", "administrator"]),
    );
    const pageIntents = blueprint.pageIntents.map((page) => page.intent);
    expect(pageIntents).toContain("calendar");

    const workflow = blueprint.workflows.find(
      (candidate) => candidate.key === "appointment-lifecycle",
    );
    expect(
      workflow?.transitions.map((transition) => transition.key).sort(),
    ).toEqual(expect.arrayContaining(["confirm", "reschedule", "cancel"]));

    // Material difference: neither spec hash nor blueprint hash may collide.
    const other = await interpreter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(hashRequirementSpec(spec)).not.toBe(
      hashRequirementSpec(parseRequirementSpec(other.spec)),
    );
    expect(hashProductBlueprint(blueprint)).not.toBe(
      hashProductBlueprint(parseProductBlueprint(other.blueprint)),
    );
  });

  it("a vague brief surfaces bounded clarifications; answers close them", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const initial = await interpreter.interpret({
      brief: vagueApprovalBrief,
      answers: {},
    });
    expect(initial.clarifications.length).toBeGreaterThan(0);
    const questionKeys = initial.clarifications.flatMap((clarification) =>
      clarification.questions.map((question) => question.key),
    );
    expect(questionKeys).toEqual(["approval-object", "approval-levels"]);

    const answered = await interpreter.interpret({
      brief: vagueApprovalBrief,
      answers: {
        "approval-object": "expense claims",
        "approval-levels": "one level",
      },
    });
    expect(answered.clarifications).toEqual([]);
    const spec = parseRequirementSpec(answered.spec);
    const answeredQuestions = spec.openQuestions.filter(
      (question) => question.answer !== undefined,
    );
    expect(answeredQuestions).toHaveLength(2);
  });

  it("fails closed on an unknown or empty brief", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    await expect(
      interpreter.interpret({ brief: "build me a rocket", answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
    await expect(
      interpreter.interpret({ brief: "", answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
    await expect(
      interpreter.interpret({ brief: "   ", answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
  });
});

describe("OpenAIRequirementInterpreterAdapter", () => {
  /** A schema-valid model candidate for Prompt A (checksum is adapter-computed). */
  function openaiExpenseCandidate(): Record<string, unknown> {
    return {
      spec: {
        apiVersion: "factory.requirement-spec/v1",
        requirementId: "expense-approval-requirement",
        outcome: "Employees submit expenses and managers decide them.",
        actors: [
          {
            key: "employee",
            label: "Employee",
            description: "Submits expenses.",
          },
          {
            key: "manager",
            label: "Manager",
            description: "Approves or rejects expenses.",
          },
          {
            key: "finance",
            label: "Finance",
            description: "Audits decisions.",
          },
        ],
        domainConcepts: [],
        workflows: [],
        constraints: [],
        openQuestions: [],
        acceptanceScenarios: [
          {
            key: "submit-then-decide",
            given: "an employee has an expense",
            when: "the employee submits it",
            then: "the manager decides it",
          },
        ],
      },
      blueprint: {
        apiVersion: "factory.product-blueprint/v1",
        title: "Expense Approval",
        actors: [
          {
            key: "employee",
            label: "Employee",
            permissions: [
              { entityKey: "expense", actions: ["create", "submit"] },
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
                options: ["travel", "meals", "software"],
              },
              { key: "date", label: "Date", type: "date", required: true },
              {
                key: "receipt",
                label: "Receipt",
                type: "file",
                required: false,
              },
              {
                key: "notes",
                label: "Notes",
                type: "long-text",
                required: false,
              },
            ],
          },
        ],
        pageIntents: [
          {
            key: "expense-list",
            label: "Expense list",
            intent: "list",
            entityKey: "expense",
          },
          {
            key: "expense-form",
            label: "Expense form",
            intent: "form",
            entityKey: "expense",
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
            key: "submit-and-approve",
            description: "An employee submits and a manager approves.",
            steps: [
              { actorKey: "employee", action: "submits an expense" },
              { actorKey: "manager", action: "approves it" },
            ],
          },
        ],
      },
    };
  }

  function capturingTransport(response: Record<string, unknown>): {
    readonly requests: OpenAITransportRequest[];
    readonly transport: OpenAIResponseTransport;
  } {
    const requests: OpenAITransportRequest[] = [];
    const transport: OpenAIResponseTransport = {
      async create(request: OpenAITransportRequest) {
        requests.push(request);
        return { outputText: JSON.stringify(response) };
      },
    };
    return { requests, transport };
  }

  it("interprets a model candidate, computing the requirement checksum authoritatively", async () => {
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    const interpretation = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: { threshold: "1000" },
    });

    const spec = parseRequirementSpec(interpretation.spec);
    const blueprint = parseProductBlueprint(interpretation.blueprint);
    expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));
    expect(interpretation.clarifications).toEqual([]);

    // The brief and answers travel to the provider in-memory only.
    const sent = JSON.parse(requests[0].input) as {
      brief: string;
      answers: Record<string, string>;
    };
    expect(sent.brief).toBe(expenseApprovalBrief);
    expect(sent.answers).toEqual({ threshold: "1000" });
  });

  it("fails closed on unsafe model material without echoing it", async () => {
    const candidate = openaiExpenseCandidate();
    (candidate.blueprint as Record<string, unknown>).title =
      "Expense portal at https://example.com";
    const { transport } = capturingTransport(candidate);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(/interpret/i);
  });

  it("fails closed on route/package/provider material the model must not select", async () => {
    const candidate = openaiExpenseCandidate();
    (candidate.blueprint as Record<string, unknown>).routes = ["/expenses"];
    const { transport } = capturingTransport(candidate);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);

    const withPackage = openaiExpenseCandidate();
    (withPackage.blueprint as Record<string, unknown>).capabilityLocks = [
      { key: "core.approvals", version: "1.0.0" },
    ];
    const second = new OpenAIRequirementInterpreterAdapter({
      transport: capturingTransport(withPackage).transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      second.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
  });

  it("fails closed on a malformed candidate and a broken reference", async () => {
    const malformed = openaiExpenseCandidate();
    (malformed.blueprint as Record<string, unknown>).actors = undefined;
    const { transport } = capturingTransport(malformed);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);

    const dangling = openaiExpenseCandidate();
    const actors = (dangling.blueprint as Record<string, unknown>)
      .actors as Record<string, unknown>[];
    (actors[0].permissions as Record<string, unknown>[])[0].entityKey =
      "missing";
    const second = new OpenAIRequirementInterpreterAdapter({
      transport: capturingTransport(dangling).transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      second.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
  });

  it("reports configuration and transport failures as bounded codes", async () => {
    const missingKey = new OpenAIRequirementInterpreterAdapter({
      readEnvironment: () => undefined,
    });
    await expect(
      missingKey.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toMatchObject({ code: "configuration_missing" });

    const failing = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create() {
          throw new Error("upstream exploded");
        },
      },
      readEnvironment: () => "test-key",
    });
    await expect(
      failing.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toMatchObject({ code: "provider_request_failed" });
  });
});
