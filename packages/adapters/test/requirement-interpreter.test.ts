import {
  definitionSelectionCatalogue,
  definitionSelectionSchema,
  validateDefinitionCatalogue,
  projectDefinitionSelection,
} from "../src/requirements/definition-selection-catalogue.js";
import { canonicalExpenseApprovalInterpretation } from "../src/requirements/approval-definition-selection.js";

describe("canonical Team Task definition", () => {
  const selection = {
    definitionKey: "team-task-tracking",
    disposition: "supported-default",
    requirementId: "team-board",
    title: "Team Board",
    outcome: "Track shared team tasks.",
    materialQuestions: [],
    businessParameters: null,
  };
  it("projects a shared task board with truthful roles, fields, pages and transitions", () => {
    const result = projectDefinitionSelection(selection);
    expect(result.blueprint.actors.map((a) => [a.key, a.permissions])).toEqual([
      [
        "member",
        [
          {
            entityKey: "task",
            actions: ["create", "read", "start", "complete", "reopen"],
          },
        ],
      ],
      ["viewer", [{ entityKey: "task", actions: ["read"] }]],
    ]);
    expect(result.blueprint.entities).toHaveLength(1);
    expect(result.blueprint.entities[0].fields).toEqual([
      { key: "title", label: "Title", type: "text", required: true },
      {
        key: "description",
        label: "Description",
        type: "long-text",
        required: false,
      },
      { key: "assignee", label: "Assignee", type: "text", required: true },
      { key: "dueDate", label: "Due date", type: "date", required: true },
      {
        key: "priority",
        label: "Priority",
        type: "enum",
        required: true,
        options: ["low", "medium", "high"],
      },
    ]);
    expect(
      result.blueprint.pageIntents.map((p) => [p.key, p.intent, p.entityKey]),
    ).toEqual([
      ["task-overview", "dashboard", "task"],
      ["task-list", "list", "task"],
      ["task-form", "form", "task"],
      ["task-detail", "detail", "task"],
      ["task-queue", "queue", "task"],
    ]);
    expect(
      result.blueprint.workflows[0].transitions.map((t) => [
        t.key,
        t.from,
        t.to,
        t.actorKey,
      ]),
    ).toEqual([
      ["start", "not-started", "in-progress", "member"],
      ["complete", "in-progress", "completed", "member"],
      ["reopen", "completed", "in-progress", "member"],
    ]);
    expect(result.clarifications).toEqual([]);
    expect(result.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(result.spec),
    );
  });
  it("rejects provider structure, parameters, unknown keys and unresolved differences", () => {
    for (const patch of [
      { businessParameters: {} },
      { fields: [] },
      { extra: true },
      {
        materialQuestions: [
          { category: "visibility", question: "Require private tasks?" },
        ],
      },
      { disposition: "needs-clarification" },
    ]) {
      expect(
        definitionSelectionSchema.safeParse({ ...selection, ...patch }).success,
      ).toBe(false);
    }
  });
  it.each([
    "authorization",
    "visibility",
    "role",
    "business-rule",
    "data",
    "integration",
  ])("preserves material %s questions", (category) => {
    const result = projectDefinitionSelection({
      ...selection,
      disposition: "needs-clarification",
      materialQuestions: [
        { category, question: "Can you accept the bounded shared board?" },
      ],
    });
    expect(result.spec.openQuestions).toEqual([
      { category, question: "Can you accept the bounded shared board?" },
    ]);
    expect(result.clarifications).toHaveLength(1);
  });
});
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashProductBlueprint,
  hashRequirementSpec,
  parseProductBlueprint,
  parseRequirementSpec,
} from "@factory/graph";
import {
  restaurantOrderingExperienceBrief,
  restaurantOrderingProductIntent,
  restaurantOrderingProductRecipe,
} from "@factory/capabilities";
import * as capabilities from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import { consumerFamilyFor } from "../../../apps/workbench/lib/product-journey/consumer-family.js";
import type { OpenAIResponseTransport } from "../src/ai.js";
import type { OpenAITransportRequest } from "../src/ai.js";
import { approvalDefinitionSelectionSchema } from "../src/requirements/approval-definition-selection.js";
import { FixtureRequirementInterpreter } from "../src/requirements/fixture-interpreter.js";
import {
  OpenAIRequirementInterpreterAdapter,
  OpenAIRequirementResponsesApiTransport,
} from "../src/requirements/openai-interpreter.js";
import {
  clarificationQuestionsMatch,
  factoryClarificationDefault,
  RequirementInterpreterError,
} from "../src/requirements/requirement-interpreter.js";

// Evaluates only the JSON Schema vocabulary used by the private selection.
// Unknown keywords fail the test rather than being silently ignored.
type SelectionJsonSchema = {
  type?: string;
  const?: unknown;
  enum?: unknown[];
  anyOf?: SelectionJsonSchema[];
  properties?: Record<string, SelectionJsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: SelectionJsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

function matchesSelectionJsonSchema(
  schema: SelectionJsonSchema,
  value: unknown,
): boolean {
  const keywords = [
    "type",
    "const",
    "enum",
    "anyOf",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "minItems",
    "maxItems",
    "minLength",
    "maxLength",
    "pattern",
  ];
  expect(Object.keys(schema).every((key) => keywords.includes(key))).toBe(true);
  if (schema.anyOf)
    return schema.anyOf.some((branch) =>
      matchesSelectionJsonSchema(branch, value),
    );
  if ("const" in schema && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string")
    return (
      typeof value === "string" &&
      value.length >= (schema.minLength ?? 0) &&
      value.length <= (schema.maxLength ?? Infinity) &&
      (!schema.pattern || new RegExp(schema.pattern).test(value))
    );
  if (schema.type === "array")
    return (
      Array.isArray(value) &&
      value.length >= (schema.minItems ?? 0) &&
      value.length <= (schema.maxItems ?? Infinity) &&
      value.every((item) => matchesSelectionJsonSchema(schema.items!, item))
    );
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    const properties = schema.properties!;
    return (
      (schema.required ?? []).every((key) => Object.hasOwn(record, key)) &&
      Object.keys(record).every((key) =>
        key in properties
          ? matchesSelectionJsonSchema(properties[key]!, record[key])
          : schema.additionalProperties !== false,
      )
    );
  }
  throw new Error("Unhandled private schema type.");
}

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
    const interpretation = (
      await interpreter.interpret({
        brief: expenseApprovalBrief,
        answers: {},
      })
    ).interpretation;
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

describe("clarification question identity", () => {
  it("uses only the schema-validated Factory visual default policy", () => {
    expect(
      factoryClarificationDefault({
        key: "visual-style",
        category: "experience.visual-style",
        defaultPolicy: "factory-standard-visual",
        question: "Which visual direction should the product use?",
      }),
    ).toBe("Use the product's standard visual theme.");
  });

  it("never defaults authorization, visibility, or role questions", () => {
    for (const category of ["authorization", "visibility", "role"] as const) {
      expect(
        factoryClarificationDefault({
          key: `sensitive-${category}`,
          category,
          defaultPolicy: "required",
          question:
            "Which visual role cannot approve or view protected payments?",
        }),
      ).toBeNull();
    }
  });

  it("matches only an exact normalized semantic identity", () => {
    expect(
      clarificationQuestionsMatch(
        "How many levels of approval should there be?",
        "What number of approval levels should there be?",
      ),
    ).toBe(true);
  });

  it("never reuses an authorization answer across negation", () => {
    expect(
      clarificationQuestionsMatch(
        "Which role can approve a payment?",
        "Which role cannot approve a payment?",
      ),
    ).toBe(false);
  });

  it("never reuses an authorization answer across actors", () => {
    expect(
      clarificationQuestionsMatch(
        "Can a manager approve a payment?",
        "Can an employee approve a payment?",
      ),
    ).toBe(false);
  });

  it("never fuzzily reuses an authorization answer with an extra protected action", () => {
    expect(
      clarificationQuestionsMatch(
        "Can managers approve payment requests?",
        "Can managers approve payment refund requests?",
      ),
    ).toBe(false);
  });
});

describe("FixtureRequirementInterpreter (test authority)", () => {
  it("Prompt A yields a schema-valid spec and blueprint bound to the exact requirement checksum", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const interpretation = (
      await interpreter.interpret({
        brief: expenseApprovalBrief,
        answers: {},
      })
    ).interpretation;

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
      expect.arrayContaining(["submitted", "approved", "returned"]),
    );
    expect(
      workflow?.transitions.map((transition) => transition.key).sort(),
    ).toEqual(["approve", "reject", "submit", "update"]);
  });

  it("Prompt B yields a materially different spec and blueprint", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const interpretation = (
      await interpreter.interpret({
        brief: appointmentBookingBrief,
        answers: {},
      })
    ).interpretation;

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
    ).toEqual(
      expect.arrayContaining(["confirm", "reschedule", "delete", "cancel"]),
    );
    // Every declared transition must be granted to its actor: the composed
    // runtime authorizes (role, entity, event) against the blueprint
    // permissions, and assertProductBlueprint now rejects ungranted flows.
    expect(() => parseProductBlueprint(interpretation.blueprint)).not.toThrow();

    // Material difference: neither spec hash nor blueprint hash may collide.
    const other = (
      await interpreter.interpret({
        brief: expenseApprovalBrief,
        answers: {},
      })
    ).interpretation;
    expect(hashRequirementSpec(spec)).not.toBe(
      hashRequirementSpec(parseRequirementSpec(other.spec)),
    );
    expect(hashProductBlueprint(blueprint)).not.toBe(
      hashProductBlueprint(parseProductBlueprint(other.blueprint)),
    );
  });

  it("a vague brief surfaces bounded clarifications; answers close them", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const initial = (
      await interpreter.interpret({
        brief: vagueApprovalBrief,
        answers: {},
      })
    ).interpretation;
    expect(initial.clarifications.length).toBeGreaterThan(0);
    const questionKeys = initial.clarifications.flatMap((clarification) =>
      clarification.questions.map((question) => question.key),
    );
    expect(questionKeys).toEqual(["approval-object", "approval-levels"]);

    const answered = (
      await interpreter.interpret({
        brief: vagueApprovalBrief,
        answers: {
          "approval-object": "expense claims",
          "approval-levels": "one level",
        },
      })
    ).interpretation;
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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
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

  function restaurantDefinitionSelection(input?: {
    readonly disposition?: "supported-default" | "needs-clarification";
    readonly materialQuestions?: readonly Record<string, unknown>[];
    readonly title?: string;
  }): Record<string, unknown> {
    return {
      resultKind: "definition-selection",
      definitionSelection: {
        businessParameters: capabilities.canonicalRestaurantMenuParameters(),
        definitionKey: "restaurant-ordering",
        disposition: input?.disposition ?? "supported-default",
        requirementId: "restaurant-ordering-requirement",
        title: input?.title ?? "Restaurant Ordering",
        outcome: "Guests place restaurant orders while staff serve them.",
        materialQuestions: input?.materialQuestions ?? [],
      },
      generatedInterpretation: null,
    };
  }

  function generatedBlueprintResult(
    generatedInterpretation: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      resultKind: "generated-blueprint",
      definitionSelection: null,
      generatedInterpretation,
    };
  }

  function candidateWithFieldKey(
    key: string,
    providerMaterial: string,
  ): Record<string, unknown> {
    const candidate = openaiExpenseCandidate();
    const entities = (candidate.blueprint as Record<string, unknown>)
      .entities as Array<Record<string, unknown>>;
    const fields = entities[0]?.fields as Array<Record<string, unknown>>;
    fields[0] = {
      ...fields[0],
      key,
      description: providerMaterial,
    };
    return candidate;
  }

  function providerFieldKeyPattern(request: OpenAITransportRequest): string {
    const providerSchema = request.jsonSchema as {
      properties: {
        generatedInterpretation: { anyOf: unknown[] };
      };
    };
    const schema = providerSchema.properties.generatedInterpretation
      .anyOf[0] as {
      properties: {
        blueprint: {
          properties: {
            entities: {
              items: {
                properties: {
                  fields: {
                    items: { properties: { key: { pattern: string } } };
                  };
                };
              };
            };
          };
        };
      };
    };
    return schema.properties.blueprint.properties.entities.items.properties
      .fields.items.properties.key.pattern;
  }

  function providerPropertyPatterns(
    request: OpenAITransportRequest,
    propertyKey: string,
  ): string[] {
    const patterns: string[] = [];
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      const properties = record.properties;
      if (
        properties !== null &&
        typeof properties === "object" &&
        propertyKey in properties
      ) {
        const property = (properties as Record<string, unknown>)[propertyKey];
        const branches =
          property !== null &&
          typeof property === "object" &&
          Array.isArray((property as Record<string, unknown>).anyOf)
            ? ((property as Record<string, unknown>).anyOf as unknown[])
            : [property];
        for (const branch of branches) {
          if (
            branch !== null &&
            typeof branch === "object" &&
            typeof (branch as Record<string, unknown>).pattern === "string"
          ) {
            patterns.push(
              (branch as Record<string, unknown>).pattern as string,
            );
          }
        }
      }
      for (const child of Object.values(record)) visit(child);
    };
    visit(request.jsonSchema);
    return patterns;
  }

  function capturingTransport(response: Record<string, unknown>): {
    readonly requests: OpenAITransportRequest[];
    readonly transport: OpenAIResponseTransport;
  } {
    const requests: OpenAITransportRequest[] = [];
    const transport: OpenAIResponseTransport = {
      async create(request: OpenAITransportRequest) {
        requests.push(request);
        return {
          outputText: JSON.stringify(
            "resultKind" in response
              ? response
              : generatedBlueprintResult(response),
          ),
        };
      },
    };
    return { requests, transport };
  }

  function approvalDefinitionSelection(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      resultKind: "definition-selection",
      definitionSelection: {
        definitionKey: "expense-approval",
        disposition: "supported-default",
        requirementId: "expense-approval-requirement",
        title: "Expense Approval",
        outcome:
          "Employees submit expenses and managers decide them; finance audits the decisions.",
        materialQuestions: [],
        businessParameters: null,
        ...overrides,
      },
      generatedInterpretation: null,
    };
  }

  it("projects Task through the public strict provider envelope and preserves material follow-up questions", async () => {
    const selection = approvalDefinitionSelection({
      definitionKey: "team-task-tracking",
      requirementId: "team-board",
      title: "Team Board",
      outcome: "Track shared tasks.",
    });
    const { transport, requests } = capturingTransport(selection);
    const result = await new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    }).interpret({ brief: "Create a shared team task tracker.", answers: {} });
    expect(result.interpretation.blueprint.entities[0].key).toBe("task");
    expect(result.interpretation.clarifications).toEqual([]);
    expect(
      matchesSelectionJsonSchema(
        requests[0].jsonSchema as SelectionJsonSchema,
        selection,
      ),
    ).toBe(true);
    expect(requests[0].instructions).toContain("Assignee is display text only");
    const unresolved = approvalDefinitionSelection({
      definitionKey: "team-task-tracking",
      disposition: "needs-clarification",
      materialQuestions: [
        {
          category: "visibility",
          question: "Accept shared visibility instead of private tasks?",
        },
        { category: "integration", question: "Proceed without reminders?" },
      ],
    });
    const followup = capturingTransport(unresolved);
    const next = await new OpenAIRequirementInterpreterAdapter({
      transport: followup.transport,
      readEnvironment: () => "test-key",
    }).interpret({
      brief: "Create private tasks with reminders.",
      answers: { visibility: "Use shared visibility." },
      priorInterpretation: result,
    });
    expect(next.interpretation.spec.openQuestions).toHaveLength(2);
    expect(next.interpretation.blueprint.entities[0].fields).toHaveLength(5);
  });
  it("rejects mixed Task envelopes and provider-authored structural overrides", async () => {
    const valid = approvalDefinitionSelection({
      definitionKey: "team-task-tracking",
    });
    for (const candidate of [
      { ...valid, generatedInterpretation: openaiExpenseCandidate() },
      approvalDefinitionSelection({
        definitionKey: "team-task-tracking",
        businessParameters: {},
      }),
      approvalDefinitionSelection({
        definitionKey: "team-task-tracking",
        fields: [],
      }),
      approvalDefinitionSelection({
        definitionKey: "team-task-tracking",
        disposition: "supported-default",
        materialQuestions: [{ category: "data", question: "Need comments?" }],
      }),
    ]) {
      const { transport, requests } = capturingTransport(candidate);
      await expect(
        new OpenAIRequirementInterpreterAdapter({
          transport,
          readEnvironment: () => "test-key",
        }).interpret({ brief: "Team task tracker", answers: {} }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
      expect(
        matchesSelectionJsonSchema(
          requests[0].jsonSchema as SelectionJsonSchema,
          candidate,
        ),
      ).toBe(false);
    }
  });
  it("keeps four coherent registrations and refuses schema, guide and projector drift", () => {
    expect(
      definitionSelectionCatalogue.map((entry) => entry.definitionKey),
    ).toEqual([
      "restaurant-ordering",
      "expense-approval",
      "purchase-request-approval",
      "team-task-tracking",
    ]);
    expect(Object.isFrozen(definitionSelectionCatalogue)).toBe(true);
    expect(() =>
      validateDefinitionCatalogue([
        ...definitionSelectionCatalogue,
        definitionSelectionCatalogue[0],
      ]),
    ).toThrow();
    const purchase = definitionSelectionCatalogue[2];
    expect(() =>
      validateDefinitionCatalogue([{ ...purchase, definitionKey: "unknown" }]),
    ).toThrow();
    expect(() =>
      validateDefinitionCatalogue([
        { ...purchase, guide: { definitionKey: "expense-approval" } },
      ]),
    ).toThrow();
    expect(() =>
      validateDefinitionCatalogue([
        {
          ...purchase,
          project: () => canonicalExpenseApprovalInterpretation(),
        },
      ]),
    ).toThrow();
    expect(() =>
      projectDefinitionSelection({ definitionKey: "unknown" }),
    ).toThrow();
    expect(
      createHash("sha256")
        .update(JSON.stringify(canonicalExpenseApprovalInterpretation()))
        .digest("hex"),
    ).toBe("7078a1632e6f5436b27c3f92f2531f0ac9f9d5dd97a337106fc11694aa88ad65");
    expect(
      createHash("sha256")
        .update(
          JSON.stringify(
            projectDefinitionSelection({
              definitionKey: "restaurant-ordering",
              disposition: "supported-default",
              requirementId: "bank-restaurant-baseline",
              title: "Restaurant Baseline",
              outcome: "Customers place orders and staff fulfill them.",
              materialQuestions: [],
              businessParameters: null,
            }),
          ),
        )
        .digest("hex"),
    ).toBe("b3c502a4678cee1a1ac5299caf4db9f62ed9ceef2ed165cf5f05a7ce51a953eb");
  });

  it("derives provider fragments and instructions in bank order with cardinality parity", () => {
    for (const entry of definitionSelectionCatalogue) {
      const base = {
        definitionKey: entry.definitionKey,
        disposition: "supported-default",
        requirementId: "bank-check",
        title: "Bank Check",
        outcome: "Review the supported definition.",
        materialQuestions: [],
        businessParameters: null,
      };
      for (const [disposition, materialQuestions, valid] of [
        ["supported-default", [], true],
        [
          "supported-default",
          [{ category: "data", question: "Accept the supported scope?" }],
          false,
        ],
        ["needs-clarification", [], false],
        [
          "needs-clarification",
          [{ category: "data", question: "Accept the supported scope?" }],
          true,
        ],
      ] as const) {
        const value = { ...base, disposition, materialQuestions };
        expect(entry.selectionSchema.safeParse(value).success).toBe(valid);
        expect(
          matchesSelectionJsonSchema(
            entry.jsonSchema as SelectionJsonSchema,
            value,
          ),
        ).toBe(valid);
      }
    }
  });

  it.each([
    "authorization",
    "visibility",
    "role",
    "business-rule",
    "data",
    "integration",
  ])(
    "preserves Purchase material %s questions and strict selection parity",
    async (category) => {
      const selection = approvalDefinitionSelection({
        definitionKey: "purchase-request-approval",
        disposition: "needs-clarification",
        materialQuestions: [
          { category, question: "Accept the supported local demo scope?" },
        ],
      });
      const { transport, requests } = capturingTransport(selection);
      const result = await new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      }).interpret({
        brief:
          "Purchase requests require a decision beyond the supported default.",
      });
      expect(result.interpretation.clarifications).toHaveLength(1);
      expect(result.interpretation.spec.openQuestions[0]!.category).toBe(
        category,
      );
      const providerSchema = requests[0]!.jsonSchema as {
        properties: { definitionSelection: SelectionJsonSchema };
      };
      for (const invalid of [
        { businessParameters: {} },
        { fields: [] },
        { disposition: "supported-default" },
        { materialQuestions: [] },
        { definitionKey: "unknown" },
      ]) {
        const value = {
          ...(selection.definitionSelection as object),
          ...invalid,
        };
        expect(definitionSelectionSchema.safeParse(value).success).toBe(false);
        expect(
          matchesSelectionJsonSchema(
            providerSchema.properties.definitionSelection,
            value,
          ),
        ).toBe(false);
      }
      expect(
        matchesSelectionJsonSchema(
          providerSchema.properties.definitionSelection,
          selection.definitionSelection,
        ),
      ).toBe(true);
    },
  );

  it("advertises Purchase scope through the bank and never resolves still-required exclusions on follow-up", async () => {
    const selection = approvalDefinitionSelection({
      definitionKey: "purchase-request-approval",
      disposition: "needs-clarification",
      materialQuestions: [
        {
          category: "integration",
          question:
            "Accept decision-only approval without purchase orders or payments?",
        },
      ],
    });
    const { requests, transport } = capturingTransport(selection);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    const initial = await adapter.interpret({
      brief: "Purchase approvals must pay suppliers.",
      answers: {},
    });
    expect(initial.interpretation.clarifications).toHaveLength(1);
    const question = initial.interpretation.clarifications[0]!.questions[0]!;
    const instructions = requests[0]!.instructions;
    expect(instructions.indexOf("<supported-restaurant-default>")).toBeLessThan(
      instructions.indexOf("<supported-expense-default>"),
    );
    expect(instructions.indexOf("<supported-expense-default>")).toBeLessThan(
      instructions.indexOf("<supported-purchase-request-default>"),
    );
    for (const exclusion of [
      "requester-only",
      "SSO",
      "thresholds",
      "budgets",
      "sequential reviewers",
      "resubmit",
      "requiredness",
      "category options",
      "currency codes",
      "file storage",
      "purchase orders",
      "vendor management",
      "inventory",
      "fulfilment",
      "invoices",
      "payments",
      "external notification",
    ])
      expect(instructions.includes(exclusion)).toBe(true);
    await expect(
      adapter.interpret({
        brief: "Purchase approvals must pay suppliers.",
        answers: { [question.key]: "Payments remain required." },
        priorInterpretation: initial,
        clarificationContext: [
          {
            key: question.key,
            category: "integration",
            question:
              "Accept decision-only approval without purchase orders or payments?",
            answer: "Payments remain required.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(requests).toHaveLength(4);
  });

  it("projects a registered Purchase selection through the unchanged approval planner", async () => {
    const { transport } = capturingTransport(
      approvalDefinitionSelection({
        definitionKey: "purchase-request-approval",
        requirementId: "purchase-request-requirement",
        title: "Purchase Requests",
        outcome:
          "Requesters submit purchases and managers decide them; procurement audits decisions.",
      }),
    );
    const result = await new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    }).interpret({ brief: "Build a purchase request approval application." });
    const { spec, blueprint } = result.interpretation;
    expect(result.businessParameters).toBeNull();
    expect(
      blueprint.entities[0]!.fields.map(({ key, type, required }) => [
        key,
        type,
        required,
      ]),
    ).toEqual([
      ["amount", "currency", true],
      ["category", "enum", true],
      ["neededBy", "date", true],
      ["item", "text", true],
      ["supplier", "text", false],
      ["businessJustification", "long-text", true],
    ]);
    expect(blueprint.actors.map(({ key }) => key)).toEqual([
      "requester",
      "manager",
      "procurement",
    ]);
    expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));
    const baseDraft = createBlankApplicationDraft({
      applicationId: spec.requirementId,
      workspaceId: "local-workspace",
      name: blueprint.title,
    });
    const [standard] = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    expect(standard).toBeDefined();
    expect(standard!.plan.compatibility.result).toBe("compatible");
    expect(
      standard!.plan.capabilityLocks
        .map(({ key, version }) => `${key}@${version}`)
        .toSorted(),
    ).toEqual([
      "core.audit@1.0.2",
      "core.crud@1.0.1",
      "core.identity-policy@1.0.0",
      "core.notification@1.1.1",
      "core.policy-declarations@1.0.0",
      "core.workflow@1.0.1",
    ]);
    expect(blueprint.entities[0]!.fields[1]!.options).toEqual([
      "equipment",
      "software",
      "services",
      "supplies",
      "other",
    ]);
    expect(blueprint.pageIntents.map(({ key }) => key)).toEqual([
      "purchase-request-dashboard",
      "purchase-request-list",
      "purchase-request-form",
      "purchase-request-detail",
      "purchase-request-queue",
      "purchase-request-settings",
    ]);
    expect(blueprint.actors.map(({ permissions }) => permissions)).toEqual([
      [
        {
          entityKey: "purchase-request",
          actions: ["create", "read", "update", "submit"],
        },
        { entityKey: "requester", actions: ["read", "update"] },
      ],
      [
        {
          entityKey: "purchase-request",
          actions: ["read", "approve", "reject"],
        },
      ],
      [{ entityKey: "purchase-request", actions: ["read", "audit"] }],
    ]);
    expect(
      blueprint.workflows[0]!.transitions.map(({ key, from, to, actorKey }) => [
        key,
        from,
        to,
        actorKey,
      ]),
    ).toEqual([
      ["submit", "draft", "submitted", "requester"],
      ["approve", "submitted", "approved", "manager"],
      ["reject", "submitted", "returned", "manager"],
      ["update", "returned", "draft", "requester"],
    ]);
  });

  it.each([
    ["A01", "Build an expense approval app for employees and managers."],
    ["A02", expenseApprovalBrief],
  ])(
    "projects compact Expense selection %s into the exact canonical envelope",
    async (_caseId, brief) => {
      // Fake transport proves parser/projection, not model semantic classification.
      const { requests, transport } = capturingTransport(
        approvalDefinitionSelection(),
      );
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      });
      const result = await adapter.interpret({ brief, answers: {} });
      const fixture = await new FixtureRequirementInterpreter().interpret({
        brief: expenseApprovalBrief,
        answers: {},
      });
      expect(result).toEqual(fixture);
      expect(
        createHash("sha256").update(JSON.stringify(result)).digest("hex"),
      ).toBe(
        "dbc81c4ee665c6a575cec2e33dee6a6a062a10674e650813e555541692053190",
      );
      expect(result.interpretation.blueprint.requirementChecksum).toBe(
        "sha256:6adb860e104c495b1ad0b06abc7713ec241a3e97d4a8a5e39c444977a82a186b",
      );
      expect(requests).toHaveLength(1);
      expect(result.businessParameters).toBeNull();
    },
  );

  it("advertises the compact Expense schema and canonical defaults in the provider request", async () => {
    const { requests, transport } = capturingTransport(
      approvalDefinitionSelection(),
    );
    await new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    }).interpret({ brief: expenseApprovalBrief, answers: {} });
    const request = requests[0]!;
    const schema = request.jsonSchema as {
      properties: {
        definitionSelection: { anyOf: Array<Record<string, any>> };
      };
    };
    const approval = schema.properties.definitionSelection.anyOf.find(
      (branch) =>
        branch.anyOf?.[0]?.properties?.definitionKey?.const ===
        "expense-approval",
    );
    expect(approval).toBeDefined();
    expect(approval!.anyOf).toHaveLength(2);
    const [supported, material] = approval!.anyOf;
    expect(supported.properties.businessParameters).toEqual({ type: "null" });
    expect(supported.properties.disposition.const).toBe("supported-default");
    expect(supported.properties.materialQuestions.maxItems).toBe(0);
    expect(material.properties.disposition.const).toBe("needs-clarification");
    expect(material.properties.materialQuestions.minItems).toBe(1);
    expect(material.properties.materialQuestions.maxItems).toBe(30);
    for (const branch of [supported, material]) {
      expect(branch.additionalProperties).toBe(false);
      expect(branch.required.toSorted()).toEqual(
        Object.keys(branch.properties).toSorted(),
      );
      expect(branch.properties.requirementId).toMatchObject({
        minLength: 1,
        maxLength: 128,
      });
      expect(branch.properties.title).not.toHaveProperty("pattern");
      expect(branch.properties.outcome).not.toHaveProperty("pattern");
      expect(
        branch.properties.materialQuestions.items.properties.question,
      ).not.toHaveProperty("pattern");
      expect(branch.properties.title).toMatchObject({
        minLength: 2,
        maxLength: 80,
      });
      expect(branch.properties.outcome).toMatchObject({
        minLength: 1,
        maxLength: 2000,
      });
      expect(
        branch.properties.materialQuestions.items.properties.category.enum,
      ).toEqual([
        "authorization",
        "visibility",
        "role",
        "business-rule",
        "data",
        "integration",
      ]);
      expect(
        branch.properties.materialQuestions.items.properties.question,
      ).toMatchObject({ minLength: 1, maxLength: 500 });
    }
    const match = request.instructions.match(
      /<supported-expense-default>(.*?)<\/supported-expense-default>/,
    );
    expect(match).not.toBeNull();
    const defaults = JSON.parse(match![1]!);
    const fixture = await new FixtureRequirementInterpreter().interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(defaults.entities).toEqual(
      fixture.interpretation.blueprint.entities,
    );
    expect(defaults.actors).toEqual(fixture.interpretation.blueprint.actors);
    expect(defaults.workflows).toEqual(
      fixture.interpretation.blueprint.workflows,
    );
    expect(request.instructions).toContain("role-wide reads");
    expect(request.instructions).toContain("requester-only privacy");
    expect(request.instructions).toContain("businessParameters null");
    expect(request.store).toBe(false);
    expect(request.strictJson).toBe(true);
  });

  it.each(["A01", "A02"])(
    "composes %s with exact approval locks, bindings and consumer eligibility",
    async (caseId) => {
      const { transport } = capturingTransport(
        approvalDefinitionSelection({
          requirementId: `expense-${caseId.toLowerCase()}`,
          title: `Expense ${caseId}`,
          outcome: `Employees submit expenses for manager decisions in ${caseId}.`,
        }),
      );
      const result = await new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      }).interpret({ brief: expenseApprovalBrief, answers: {} });
      const { spec, blueprint } = result.interpretation;
      expect(spec.requirementId).toBe(`expense-${caseId.toLowerCase()}`);
      expect(spec.outcome).toBe(
        `Employees submit expenses for manager decisions in ${caseId}.`,
      );
      expect(blueprint.title).toBe(`Expense ${caseId}`);
      expect(blueprint.requirementChecksum).toBe(hashRequirementSpec(spec));
      expect(blueprint.actors).toHaveLength(3);
      expect(blueprint.entities).toHaveLength(2);
      expect(blueprint.pageIntents).toHaveLength(6);
      expect(blueprint.workflows).toHaveLength(1);
      const baseDraft = createBlankApplicationDraft({
        applicationId: spec.requirementId,
        workspaceId: "local-workspace",
        name: blueprint.title,
      });
      const alternatives = planProductAlternatives({
        requirement: spec,
        blueprint,
        baseDraft,
      });
      const standard = alternatives.filter(({ key }) => key === "standard");
      expect(standard).toHaveLength(1);
      const plan = standard[0]!.plan;
      expect(plan.compatibility.result).toBe("compatible");
      expect(
        plan.capabilityLocks
          .map(({ key, version }) => `${key}@${version}`)
          .toSorted(),
      ).toEqual([
        "core.audit@1.0.2",
        "core.crud@1.0.1",
        "core.identity-policy@1.0.0",
        "core.notification@1.1.1",
        "core.policy-declarations@1.0.0",
        "core.workflow@1.0.1",
      ]);
      expect(
        plan.graphBindings.filter(
          ({ capabilityKey }) =>
            capabilityKey === "core.crud" || capabilityKey === "core.workflow",
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            capabilityKey: "core.workflow",
            inputKey: "flowKey",
            graphSymbol: "graph.flow.expense-approval",
          }),
          expect.objectContaining({
            capabilityKey: "core.crud",
            inputKey: "entityKey",
            graphSymbol: "graph.domain.expense",
          }),
          expect.objectContaining({
            capabilityKey: "core.crud",
            inputKey: "routeKey",
            graphSymbol: "graph.page.expense-list",
          }),
        ]),
      );
      expect(
        consumerFamilyFor({
          state: { interpretation: result, alternatives },
          openQuestions: result.interpretation.clarifications.flatMap(
            ({ questions }) => questions,
          ),
        } as Parameters<typeof consumerFamilyFor>[0]),
      ).toBe("approval");
      const { diff } = composeProductDraft({ plan, blueprint, baseDraft });
      const composed = applyGraphDiffToDraft(baseDraft, diff);
      expect(composed.status).toBe("draft");
      expect(composed.graph.metadata.id).toBe(spec.requirementId);
      expect(composed.graph.flow.flows[0]?.transitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: "reject",
            from: "submitted",
            to: "returned",
            roles: ["manager"],
          }),
        ]),
      );
    },
  );

  it.each([
    [
      "A04",
      "data",
      "Should receipt remain optional or must it become required?",
    ],
    [
      "A06",
      "role",
      "Which approval authority is required beyond the supported single manager?",
    ],
    [
      "A07",
      "authorization",
      "Must reviewers decide without the supported expense read permission?",
    ],
    [
      "A08",
      "business-rule",
      "Must withdrawal or return and resubmit remain required beyond the supported workflow?",
    ],
    [
      "A09",
      "integration",
      "Is external identity integration required beyond selectable demo roles?",
    ],
    [
      "A10",
      "visibility",
      "Must requester-only privacy remain required beyond role-wide reads?",
    ],
    [
      "tenant",
      "authorization",
      "Is tenant isolation required beyond the local demo?",
    ],
  ])(
    "retains %s as a material %s selection and excludes consumer continuation",
    async (_caseId, category, question) => {
      const { requests, transport } = capturingTransport(
        approvalDefinitionSelection({
          disposition: "needs-clarification",
          materialQuestions: [{ category, question }],
        }),
      );
      const result = await new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      }).interpret({
        brief: "An expense application with a material business requirement.",
        answers: {},
      });
      expect(result.interpretation.spec.openQuestions).toEqual([
        { category, question },
      ]);
      expect(
        result.interpretation.clarifications.flatMap(
          ({ questions }) => questions,
        ),
      ).toEqual([
        expect.objectContaining({
          category,
          question,
          defaultPolicy: "required",
        }),
      ]);
      expect(result.interpretation.blueprint.requirementChecksum).toBe(
        hashRequirementSpec(result.interpretation.spec),
      );
      const alternatives = planProductAlternatives({
        requirement: result.interpretation.spec,
        blueprint: result.interpretation.blueprint,
        baseDraft: createBlankApplicationDraft({
          applicationId: "expense-clarification",
          workspaceId: "local-workspace",
          name: "Expense clarification",
        }),
      });
      expect(
        consumerFamilyFor({
          state: { interpretation: result, alternatives },
          openQuestions: result.interpretation.clarifications.flatMap(
            ({ questions }) => questions,
          ),
        } as Parameters<typeof consumerFamilyFor>[0]),
      ).toBeNull();
      expect(requests).toHaveLength(1);
      expect(result.businessParameters).toBeNull();
    },
  );

  it.each([
    { definitionKey: "unknown-approval" },
    { definitionKey: "expenseApproval" },
    { businessParameters: {} },
    { businessParameters: capabilities.canonicalRestaurantMenuParameters() },
    { disposition: "needs-clarification" },
    {
      disposition: "supported-default",
      materialQuestions: [
        { category: "visibility", question: "Who may read?" },
      ],
    },
    { materialQuestions: null },
    {
      materialQuestions: [
        { category: "experience.visual-style", question: "Which color?" },
      ],
    },
    {
      disposition: "needs-clarification",
      materialQuestions: Array.from({ length: 31 }, () => ({
        category: "role",
        question: "Which role?",
      })),
    },
    {
      disposition: "needs-clarification",
      materialQuestions: [
        { category: "role", question: "Which role?", answer: "manager" },
      ],
    },
    {
      disposition: "needs-clarification",
      materialQuestions: [{ category: "role", question: "x".repeat(501) }],
    },
    { title: "x" },
    { title: "x".repeat(81) },
    { title: " Expense " },
    { title: "Expense\nApp" },
    { title: "https://example.com" },
    { requirementId: "expenseApproval" },
    { requirementId: "x".repeat(129) },
    { outcome: "x".repeat(2001) },
    { outcome: " " },
    { pageIntents: [{ key: "duplicate-list" }] },
    { permissions: [] },
  ])(
    "rejects malformed compact Expense selection %# with bounded repair",
    async (overrides) => {
      const { requests, transport } = capturingTransport(
        approvalDefinitionSelection(overrides),
      );
      await expect(
        new OpenAIRequirementInterpreterAdapter({
          transport,
          readEnvironment: () => "test-key",
        }).interpret({ brief: expenseApprovalBrief, answers: {} }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
      for (const request of requests.slice(1))
        expect(JSON.parse(request.input).repair).toBe(
          "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.",
        );
    },
  );

  it("rejects mixed, null and incomplete Expense result envelopes", async () => {
    const selection = approvalDefinitionSelection();
    const incomplete = approvalDefinitionSelection();
    delete (incomplete.definitionSelection as Record<string, unknown>)
      .businessParameters;
    for (const candidate of [
      { ...selection, generatedInterpretation: openaiExpenseCandidate() },
      { ...selection, resultKind: "generated-blueprint" },
      { ...selection, definitionSelection: null },
      { ...selection, extra: true },
      incomplete,
    ]) {
      const { requests, transport } = capturingTransport(candidate);
      await expect(
        new OpenAIRequirementInterpreterAdapter({
          transport,
          readEnvironment: () => "test-key",
        }).interpret({ brief: expenseApprovalBrief, answers: {} }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
    }
  });

  it("repairs an invalid Expense selection into a complete canonical selection", async () => {
    let calls = 0;
    const adapter = new OpenAIRequirementInterpreterAdapter({
      readEnvironment: () => "test-key",
      transport: {
        async create() {
          calls += 1;
          return {
            outputText: JSON.stringify(
              approvalDefinitionSelection(
                calls === 1 ? { businessParameters: {} } : {},
              ),
            ),
          };
        },
      },
    });
    const result = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(result.interpretation.blueprint.pageIntents).toHaveLength(6);
    expect(result.interpretation.clarifications).toEqual([]);
    expect(calls).toBe(2);
  });

  it("keeps private Expense Zod and provider structural constraints in parity", async () => {
    const { requests, transport } = capturingTransport(
      approvalDefinitionSelection(),
    );
    await new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    }).interpret({ brief: expenseApprovalBrief, answers: {} });
    const schema = (
      requests[0]!.jsonSchema as {
        properties: { definitionSelection: { anyOf: SelectionJsonSchema[] } };
      }
    ).properties.definitionSelection.anyOf[1]!;
    const selection = approvalDefinitionSelection()
      .definitionSelection as Record<string, unknown>;
    const valid = [
      selection,
      { ...selection, title: "AB" },
      {
        ...selection,
        title: "x".repeat(80),
        requirementId: "x".repeat(128),
        outcome: "x".repeat(2000),
      },
      {
        ...selection,
        disposition: "needs-clarification",
        materialQuestions: [
          { category: "visibility", question: "Who may read?" },
        ],
      },
      {
        ...selection,
        disposition: "needs-clarification",
        materialQuestions: Array.from({ length: 30 }, () => ({
          category: "role",
          question: "x".repeat(500),
        })),
      },
    ];
    const invalid = [
      null,
      {},
      { ...selection, unknown: true },
      { ...selection, businessParameters: {} },
      { ...selection, definitionKey: "unknown" },
      { ...selection, disposition: "needs-clarification" },
      {
        ...selection,
        materialQuestions: [{ category: "role", question: "Which role?" }],
      },
      {
        ...selection,
        disposition: "needs-clarification",
        materialQuestions: [
          { category: "experience.visual-style", question: "Which color?" },
        ],
      },
      ...["", "x", "x".repeat(81)].map((title) => ({ ...selection, title })),
      ...["", "expenseApproval", "x".repeat(129)].map((requirementId) => ({
        ...selection,
        requirementId,
      })),
      ...["", "x".repeat(2001)].map((outcome) => ({ ...selection, outcome })),
      ...["", "x".repeat(501)].map((question) => ({
        ...selection,
        disposition: "needs-clarification",
        materialQuestions: [{ category: "data", question }],
      })),
    ];
    for (const candidate of valid) {
      expect(
        approvalDefinitionSelectionSchema.safeParse(candidate).success,
      ).toBe(true);
      expect(matchesSelectionJsonSchema(schema, candidate)).toBe(true);
    }
    for (const candidate of invalid) {
      expect(
        approvalDefinitionSelectionSchema.safeParse(candidate).success,
      ).toBe(false);
      expect(matchesSelectionJsonSchema(schema, candidate)).toBe(false);
    }
  });

  it.each(["title", "outcome", "question"])(
    "keeps unsafe %s provider-structural text rejected by authoritative local validation",
    async (field) => {
      for (const text of [
        "https://example.com",
        "WWW.example.com",
        "C:\\private",
        "../private",
        "/private",
        "__PrOtO__",
        "Constructor",
        "Prototype",
        "  ",
      ]) {
        const candidate = approvalDefinitionSelection(
          field === "question"
            ? {
                disposition: "needs-clarification",
                materialQuestions: [{ category: "data", question: text }],
              }
            : { [field]: text },
        );
        const { requests, transport } = capturingTransport(candidate);
        const pending = new OpenAIRequirementInterpreterAdapter({
          transport,
          readEnvironment: () => "test-key",
        }).interpret({ brief: expenseApprovalBrief, answers: {} });
        await expect(pending).rejects.toMatchObject({
          code: "output_invalid",
          message: "Requirement interpretation output was invalid.",
        });
        await expect(pending).rejects.not.toThrow(text);
        expect(requests).toHaveLength(3);
        const schema = (
          requests[0]!.jsonSchema as {
            properties: {
              definitionSelection: { anyOf: SelectionJsonSchema[] };
            };
          }
        ).properties.definitionSelection.anyOf[1]!;
        expect(
          matchesSelectionJsonSchema(schema, candidate.definitionSelection),
        ).toBe(true);
        expect(
          approvalDefinitionSelectionSchema.safeParse(
            candidate.definitionSelection,
          ).success,
        ).toBe(false);
      }
    },
  );

  it("keeps title-only trim and control exclusions at the local boundary", async () => {
    for (const title of [
      " Expense",
      "Expense ",
      "Expense\nApp",
      "Expense\u0000App",
    ]) {
      const candidate = approvalDefinitionSelection({ title });
      const { requests, transport } = capturingTransport(candidate);
      await expect(
        new OpenAIRequirementInterpreterAdapter({
          transport,
          readEnvironment: () => "test-key",
        }).interpret({ brief: expenseApprovalBrief, answers: {} }),
      ).rejects.toMatchObject({
        code: "output_invalid",
        message: "Requirement interpretation output was invalid.",
      });
      expect(requests).toHaveLength(3);
      const schema = (
        requests[0]!.jsonSchema as {
          properties: { definitionSelection: { anyOf: SelectionJsonSchema[] } };
        }
      ).properties.definitionSelection.anyOf[1]!;
      expect(
        matchesSelectionJsonSchema(schema, candidate.definitionSelection),
      ).toBe(true);
      expect(
        approvalDefinitionSelectionSchema.safeParse(
          candidate.definitionSelection,
        ).success,
      ).toBe(false);
    }
  });

  it.each(["outcome", "question"])(
    "preserves valid multiline %s and permitted surrounding whitespace",
    async (field) => {
      const text = "  Employees submit expenses.\nManagers decide them.  ";
      const candidate = approvalDefinitionSelection(
        field === "question"
          ? {
              disposition: "needs-clarification",
              materialQuestions: [{ category: "data", question: text }],
            }
          : { outcome: text },
      );
      const { requests, transport } = capturingTransport(candidate);
      const result = await new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      }).interpret({ brief: expenseApprovalBrief, answers: {} });
      expect(requests).toHaveLength(1);
      expect(
        field === "outcome"
          ? result.interpretation.spec.outcome
          : result.interpretation.spec.openQuestions[0]!.question,
      ).toBe(text);
      expect(result.interpretation.blueprint.requirementChecksum).toBe(
        hashRequirementSpec(result.interpretation.spec),
      );
    },
  );

  it("preserves all independent Expense questions and refuses unsupported follow-up approximation", async () => {
    const materialQuestions = [
      {
        category: "visibility",
        question: "Must requester-only privacy remain required?",
      },
      {
        category: "integration",
        question: "Must external identity remain required?",
      },
    ];
    const { transport } = capturingTransport(
      approvalDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions,
      }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    const first = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(first.interpretation.spec.openQuestions).toEqual(materialQuestions);
    expect(
      first.interpretation.clarifications.flatMap(({ questions }) => questions),
    ).toHaveLength(2);
    const question = first.interpretation.clarifications[0]!.questions[0]!;
    const failed = capturingTransport(
      approvalDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions,
      }),
    );
    await expect(
      new OpenAIRequirementInterpreterAdapter({
        transport: failed.transport,
        readEnvironment: () => "test-key",
      }).interpret({
        brief: expenseApprovalBrief,
        answers: { [question.key]: "Requester-only privacy remains required." },
        priorInterpretation: first,
        clarificationContext: [
          {
            key: question.key,
            category: question.category,
            question: question.question,
            answer: "Requester-only privacy remains required.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(failed.requests).toHaveLength(3);
  });

  it("interprets a model candidate, computing the requirement checksum authoritatively", async () => {
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    const interpretation = (
      await adapter.interpret({
        brief: expenseApprovalBrief,
        answers: { threshold: "1000" },
      })
    ).interpretation;

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

  it("projects a supported Restaurant definition selection into the existing public interpretation", async () => {
    // Removing the deterministic definition branch would send this compact
    // supported selection through the generic full-blueprint parser instead.
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: "Build a restaurant ordering application.",
        answers: {},
      })
    ).interpretation;

    expect(interpretation.spec.productType).toBe("restaurant-ordering");
    expect(interpretation.spec.openQuestions).toEqual([]);
    expect(interpretation.blueprint.entities).toHaveLength(1);
    expect(interpretation.blueprint.workflows[0]?.transitions).toEqual([
      expect.objectContaining({
        key: "submit",
        from: "cart",
        to: "submitted",
        actorKey: "customer",
      }),
    ]);
    expect(requests[0]?.instructions).toContain(
      "Every Restaurant result returns definition-selection with generatedInterpretation null; do not produce a full blueprint",
    );
    expect(requests[0]?.instructions).toContain(
      "Products outside the registered supported definitions return generated-blueprint",
    );
    expect(requests[0]?.instructions).toContain(
      "For registered-definition follow-ups, reevaluate definition fit and retain needs-clarification for every still-material question or new material difference",
    );
    expect(requests[0]?.instructions).toContain(
      "For generated-blueprint results, do not repeat, rephrase, or progressively reveal additional questions",
    );
    const schema = requests[0]?.jsonSchema as {
      properties: {
        definitionSelection: { anyOf: unknown[] };
        generatedInterpretation: { anyOf: unknown[] };
      };
    };
    expect(schema.properties.definitionSelection.anyOf).toHaveLength(5);
    expect(schema.properties.generatedInterpretation.anyOf).toHaveLength(2);
    const alternatives = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: interpretation.spec.requirementId,
        workspaceId: "local-workspace",
        name: interpretation.blueprint.title,
      }),
    });
    expect(alternatives.length).toBeGreaterThanOrEqual(1);
    expect(alternatives.length).toBeLessThanOrEqual(2);
    expect(
      alternatives.every(
        ({ plan }) => plan.compatibility.result === "compatible",
      ),
    ).toBe(true);
  });

  it("keeps an explicit Restaurant display name in the existing title projection", async () => {
    // Removing the title mapping or the private name instruction would either
    // lose the selected display name or leave the provider to invent a new
    // naming question. This transport fixture checks the adapter boundary; it
    // does not claim a model semantically extracted the name.
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({ title: "Saffron Table" }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: "Build a restaurant app named Saffron Table.",
        answers: {},
      })
    ).interpretation;

    expect(interpretation.blueprint.title).toBe("Saffron Table");
    expect(interpretation.clarifications).toEqual([]);
    expect(requests[0]?.instructions).toContain(
      "When a Restaurant brief explicitly supplies an application display name, place that exact validated display name in the existing definition-selection title.",
    );
    expect(requests[0]?.instructions).toContain(
      "When no application display name is explicit, keep the validated provider title and do not ask a naming question.",
    );
    expect(requests[0]?.instructions).toContain(
      "A Restaurant display name must be trimmed safe business text from 2 through 80 characters.",
    );
    expect(requests[0]?.instructions).toContain(
      "It must have no leading or trailing whitespace and no control characters.",
    );
    expect(requests[0]?.instructions).toContain(
      "If an explicit display name is invalid, return needs-clarification with one material question that asks for a valid shorter display name; never truncate, replace, or encode the invalid name in title.",
    );
  });

  it("retains an exact two-character Restaurant display name and advertises its private bounds", async () => {
    const title = "Go";
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({ title }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter
        .interpret({
          brief: "Build a restaurant app named Go.",
          answers: {},
        })
        .then((result) => result.interpretation),
    ).resolves.toMatchObject({ blueprint: { title } });

    const schema = requests[0]?.jsonSchema as {
      readonly properties: {
        readonly definitionSelection: {
          readonly anyOf: readonly [
            {
              readonly anyOf: readonly [
                {
                  readonly properties: {
                    readonly title: {
                      readonly type: string;
                      readonly minLength: number;
                      readonly maxLength: number;
                      readonly pattern: string;
                    };
                  };
                },
              ];
            },
            unknown,
          ];
        };
      };
    };
    const titleSchema =
      schema.properties.definitionSelection.anyOf[0].anyOf[0].properties.title;
    expect(titleSchema).toEqual({
      type: "string",
      minLength: 2,
      maxLength: 80,
      pattern:
        "^[^\\s\\u0000-\\u001F\\u007F][^\\u0000-\\u001F\\u007F]*[^\\s\\u0000-\\u001F\\u007F]$",
    });
    expect(titleSchema.pattern).not.toContain("(?");

    const permitsTitle = (value: string): boolean =>
      value.length >= titleSchema.minLength &&
      value.length <= titleSchema.maxLength &&
      new RegExp(titleSchema.pattern, "u").test(value);
    expect(permitsTitle("Go")).toBe(true);
    expect(permitsTitle("Saffron & Sage " + "x".repeat(65))).toBe(true);
    expect(permitsTitle("Café & Sage")).toBe(true);
    expect(permitsTitle("S")).toBe(false);
    expect(permitsTitle("S".repeat(81))).toBe(false);
    expect(permitsTitle(" Saffron")).toBe(false);
    expect(permitsTitle("Saffron ")).toBe(false);
    expect(permitsTitle("Saffron\u0000Sage")).toBe(false);
    expect(permitsTitle("Saffron\u007fSage")).toBe(false);
  });

  it("retains an exact 80-character escaped Restaurant display name", async () => {
    const title = "Saffron & Sage " + "x".repeat(65);
    expect(title).toHaveLength(80);
    const { transport } = capturingTransport(
      restaurantDefinitionSelection({ title }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter
        .interpret({
          brief: "Build a restaurant app named Saffron & Sage.",
          answers: {},
        })
        .then((result) => result.interpretation),
    ).resolves.toMatchObject({ blueprint: { title } });
  });

  it("retains an exact Restaurant display name with internal spaces and Unicode", async () => {
    const title = "Café & Sage";
    const { transport } = capturingTransport(
      restaurantDefinitionSelection({ title }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter
        .interpret({
          brief: "Build a restaurant app named Café & Sage.",
          answers: {},
        })
        .then((result) => result.interpretation),
    ).resolves.toMatchObject({ blueprint: { title } });
  });

  it.each([1, 81, 200])(
    "fails closed instead of truncating an explicit %i-character Restaurant display name",
    async (length) => {
      const { requests, transport } = capturingTransport(
        restaurantDefinitionSelection({ title: "S".repeat(length) }),
      );
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      });

      await expect(
        adapter.interpret({
          brief: "Build a restaurant app with an explicit display name.",
          answers: {},
        }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
    },
  );

  it.each([" Saffron", "Saffron ", "Saffron\u0000Sage", "Saffron\u007fSage"])(
    "fails closed instead of trimming or accepting an unsafe Restaurant display name",
    async (title) => {
      const { requests, transport } = capturingTransport(
        restaurantDefinitionSelection({ title }),
      );
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      });

      await expect(
        adapter.interpret({
          brief: "Build a restaurant app.",
          answers: {},
        }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
    },
  );

  it("keeps a requested canonical sample menu in the supported Restaurant default", async () => {
    // This known provider output exercises the adapter boundary and its
    // instruction emission. It does not claim that a mocked response proves
    // model semantic classification.
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({ title: "Saffron Table" }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter
        .interpret({
          brief:
            "Build a restaurant ordering application named Saffron Table with a sample menu customers can browse.",
          answers: {},
        })
        .then((result) => result.interpretation),
    ).resolves.toMatchObject({
      blueprint: { title: "Saffron Table" },
      clarifications: [],
    });
    expect(requests[0]?.instructions).toContain(
      "Treat a sample, demo, or default menu, generic menu browsing, and application branding as canonical-default menu parameters with currency USD and zero items.",
    );
  });

  it("keeps unsupported menu currency fail-closed after an answer", async () => {
    // Changing the data category, accepting an answered custom-menu request,
    // or removing the boundary instruction would make this existing
    // clarification projection stop protecting unbound menu data. The mocked
    // selection does not prove model classification.
    const question =
      "The menu requires EUR. Can the application use USD, or is EUR required?";
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions: [{ category: "data", question }],
      }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.interpret({
        brief: "Build a restaurant with Black Cod priced at EUR 120.",
        answers: { "q-menu-data": "Keep EUR as required." },
        clarificationContext: [
          {
            key: "q-menu-data",
            category: "data",
            defaultPolicy: "required",
            question,
            answer: "Keep EUR as required.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(requests).toHaveLength(3);
    expect(requests[0]?.instructions).toContain(
      "Explicit currency other than USD, stock, availability, preparation time, images, categories, options, tax, or service-charge requirements remain material data clarification; never discard these requirements, convert another currency, or relabel it USD.",
    );
  });

  it("keeps explicit custom-menu intent material without supplied menu values", async () => {
    // This known provider output checks the adapter clarification boundary and
    // emitted instruction. It does not claim that a mocked response proves
    // model semantic classification.
    const question =
      "What are the custom menu dish names and their USD prices?";
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions: [{ category: "data", question }],
      }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter
        .interpret({
          brief:
            "Build a restaurant ordering application that uses my custom menu.",
          answers: {},
        })
        .then((result) => result.interpretation),
    ).resolves.toMatchObject({
      clarifications: [{ questions: [{ category: "data", question }] }],
    });
    expect(requests[0]?.instructions).toContain(
      "Treat a sample, demo, or default menu, generic menu browsing, and application branding as canonical-default menu parameters with currency USD and zero items.",
    );
    expect(requests[0]?.instructions).toContain(
      "A complete supplied initial menu of 1 through 100 dishes with names and explicit USD prices is supported:",
    );
  });

  it("preserves the generated Appointment envelope through the private provider branch", async () => {
    const fixture = (
      await new FixtureRequirementInterpreter().interpret({
        brief: appointmentBookingBrief,
        answers: {},
      })
    ).interpretation;
    const { requirementChecksum: _checksum, ...blueprint } = fixture.blueprint;
    const { transport } = capturingTransport({
      spec: fixture.spec,
      blueprint,
    });
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter
        .interpret({ brief: appointmentBookingBrief, answers: {} })
        .then((result) => result.interpretation),
    ).resolves.toEqual(fixture);
  });

  it("fails closed when cloned canonical Restaurant sources drift", async () => {
    const mutations: Array<(authority: any) => void> = [
      (authority) => {
        authority.flows.find(
          (flow: { id: string }) => flow.id === "restaurant-order",
        ).transitions = [];
      },
      (authority) => {
        authority.permissions = [];
      },
      (authority) => {
        authority.roles = authority.roles.filter(
          (role: string) => role !== "customer",
        );
      },
      (authority) => {
        authority.flows.find(
          (flow: { id: string }) => flow.id === "restaurant-order",
        ).states = ["submitted"];
      },
      (authority) => {
        authority.journeys.find(
          (journey: { key: string }) => journey.key === "customer-place-order",
        ).steps[0].event = "approve";
      },
    ];
    for (const mutate of mutations) {
      const authority = structuredClone(
        capabilities.getCanonicalRestaurantAuthority(),
      );
      mutate(authority);
      const spy = vi
        .spyOn(capabilities, "getCanonicalRestaurantAuthority")
        .mockReturnValue(authority);
      const { requests, transport } = capturingTransport(
        restaurantDefinitionSelection(),
      );
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      });
      await expect(
        adapter.interpret({ brief: "Build a restaurant.", answers: {} }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
      spy.mockRestore();
    }

    const recipe = structuredClone(
      capabilities.restaurantOrderingProductRecipe(),
    );
    recipe.screens = recipe.screens.filter(
      (screen) => screen.key !== "customer-orders",
    );
    const recipeSpy = vi
      .spyOn(capabilities, "restaurantOrderingProductRecipe")
      .mockReturnValue(recipe);
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: "Build a restaurant.", answers: {} }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(requests).toHaveLength(3);
    recipeSpy.mockRestore();
  });

  it("fails closed on invalid or mixed definition-selection branches", async () => {
    const selection = restaurantDefinitionSelection();
    const generatedRestaurant = openaiExpenseCandidate();
    (generatedRestaurant.spec as { productType?: string }).productType =
      "restaurant-ordering";
    const invalidResults = [
      {
        ...selection,
        definitionSelection: {
          ...(selection.definitionSelection as Record<string, unknown>),
          definitionKey: "unknown-definition",
        },
      },
      {
        ...selection,
        generatedInterpretation: openaiExpenseCandidate(),
      },
      generatedBlueprintResult(generatedRestaurant),
    ];

    for (const result of invalidResults) {
      const { requests, transport } = capturingTransport(result);
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      });
      await expect(
        adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(requests).toHaveLength(3);
    }
  });

  it("rejects invalid selection question cardinality and unsafe business text", async () => {
    const supportedWithQuestion = restaurantDefinitionSelection({
      materialQuestions: [
        { category: "integration", question: "Should payment be live?" },
      ],
    });
    const needsWithoutQuestion = restaurantDefinitionSelection({
      disposition: "needs-clarification",
    });
    const tooManyQuestions = restaurantDefinitionSelection({
      disposition: "needs-clarification",
      materialQuestions: Array.from({ length: 31 }, (_, index) => ({
        category: "business-rule",
        question: `Which service rule applies ${index + 1}?`,
      })),
    });
    const unsafeTitle = restaurantDefinitionSelection();
    (unsafeTitle.definitionSelection as Record<string, unknown>).title =
      "Restaurant at https://example.com";

    for (const result of [
      supportedWithQuestion,
      needsWithoutQuestion,
      tooManyQuestions,
      unsafeTitle,
    ]) {
      const { transport } = capturingTransport(result);
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport,
        readEnvironment: () => "test-key",
      });
      await expect(
        adapter.interpret({ brief: "Build a restaurant.", answers: {} }),
      ).rejects.toMatchObject({ code: "output_invalid" });
    }
  });

  it("fails closed when a Restaurant answer still requires unsupported live payment", async () => {
    const question = "Should checkout use a live payment provider?";
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions: [{ category: "integration", question }],
      }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.interpret({
        brief: "Build a restaurant ordering application.",
        answers: { "q-live-payment": "Use a live payment provider." },
        clarificationContext: [
          {
            key: "q-live-payment",
            category: "integration",
            defaultPolicy: "required",
            question,
            answer: "Use a live payment provider.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(requests).toHaveLength(3);
    expect(requests[0]?.instructions).toContain(
      "A Restaurant follow-up may return supported-default when the supplied answer resolves its material question and no unresolved material requirement remains: missing menu names or USD prices must become complete, and an unsupported-scope question requires explicit acceptance of the supported scope.",
    );
    expect(requests[0]?.instructions).toContain(
      "If an answer continues to require unsupported live payment or another external capability, retain needs-clarification.",
    );
  });

  it("steers every blueprint cross-reference to the declared Graph-key grammar", async () => {
    // A camelCase reference can never resolve to a declared lowercase-kebab
    // blueprint key. Every provider mirror must reject that mismatch before
    // the semantic validator receives a candidate.
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await adapter.interpret({ brief: expenseApprovalBrief, answers: {} });

    const request = requests[0];
    expect(request).toBeDefined();
    const graphKeyPattern = "^[a-z][a-z0-9-]*$";
    expect(providerPropertyPatterns(request!, "referenceTo")).toEqual([
      graphKeyPattern,
    ]);
    expect(providerPropertyPatterns(request!, "entityKey")).toEqual([
      graphKeyPattern,
      graphKeyPattern,
      graphKeyPattern,
    ]);
    expect(providerPropertyPatterns(request!, "from")).toEqual([
      graphKeyPattern,
    ]);
    expect(providerPropertyPatterns(request!, "to")).toEqual([graphKeyPattern]);
    expect(providerPropertyPatterns(request!, "actorKey")).toEqual([
      graphKeyPattern,
      graphKeyPattern,
    ]);
    expect(request!.instructions).toContain(
      "Blueprint references must exactly reuse the matching declared entity, actor, or workflow-state key",
    );
  });

  it("does not project a model question that already carries the user's answer", async () => {
    const candidate = openaiExpenseCandidate();
    const spec = candidate.spec as {
      openQuestions: Array<{
        category: "authorization";
        question: string;
        answer?: string;
      }>;
    };
    spec.openQuestions = [
      {
        category: "authorization",
        question: "Who may approve an expense?",
        answer: "Managers approve submitted expenses.",
      },
    ];
    const { transport } = capturingTransport(candidate);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: expenseApprovalBrief,
        answers: {
          "q-who-may-approve-an-expense":
            "Managers approve submitted expenses.",
        },
      })
    ).interpretation;

    expect(interpretation.clarifications).toEqual([]);
  });

  it("reconciles a supplied answer to the same deterministic question key", async () => {
    const candidate = openaiExpenseCandidate();
    const spec = candidate.spec as {
      openQuestions: Array<{
        category: "authorization";
        question: string;
        answer?: string;
      }>;
    };
    spec.openQuestions = [
      {
        category: "authorization",
        question: "Who may approve an expense?",
      },
    ];
    const { transport } = capturingTransport(candidate);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: expenseApprovalBrief,
        answers: {
          "q-who-may-approve-an-expense":
            "Managers approve submitted expenses.",
        },
      })
    ).interpretation;

    expect(interpretation.clarifications).toEqual([]);
    expect(parseRequirementSpec(interpretation.spec).openQuestions).toEqual([
      {
        category: "authorization",
        question: "Who may approve an expense?",
        answer: "Managers approve submitted expenses.",
      },
    ]);
  });

  it("sends the answered question context with its answer on a follow-up interpretation", async () => {
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {
        "q-who-may-approve-an-expense": "Managers approve submitted expenses.",
      },
      clarificationContext: [
        {
          key: "q-who-may-approve-an-expense",
          category: "authorization",
          defaultPolicy: "required",
          question: "Who may approve an expense?",
          answer: "Managers approve submitted expenses.",
        },
      ],
    });

    const sent = JSON.parse(requests[0].input) as {
      clarificationContext?: unknown;
    };
    expect(sent.clarificationContext).toEqual([
      {
        key: "q-who-may-approve-an-expense",
        category: "authorization",
        defaultPolicy: "required",
        question: "Who may approve an expense?",
        answer: "Managers approve submitted expenses.",
      },
    ]);
  });

  it("sends the validated prior interpretation as the transient follow-up baseline", async () => {
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    const priorInterpretation = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });

    await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
      priorInterpretation,
    });

    const sent = JSON.parse(requests[1].input) as {
      priorInterpretation?: unknown;
    };
    expect(sent.priorInterpretation).toEqual(priorInterpretation);
  });

  it("instructs the provider that every workflow must be internally consistent with the permissions", async () => {
    // The authoritative validator rejects any transition whose event is not
    // granted to its actor on its entity (and any journey step referencing an
    // unknown actor). The instructions are the model contract that keeps
    // real-model output valid, so the contract text is pinned here: a real
    // provider that ignores it fails closed with a bounded error instead of
    // composing a runtime that could not serve the declared flow.
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await adapter.interpret({ brief: expenseApprovalBrief, answers: {} });
    expect(requests[0].instructions).toContain(
      "that actor's permissions must grant the transition's event as an action on the workflow's entity",
    );
  });

  it("instructs the provider to consolidate critical questions and honor supplied answers", async () => {
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: { authorization: "Use least-privilege role access." },
    });

    expect(requests[0].instructions).toContain(
      "Consolidate every material clarification into the first response",
    );
    expect(requests[0].instructions).toContain(
      "For generated-blueprint results, when clarification answers are supplied, treat them as authoritative",
    );
    expect(requests[0].instructions).toContain(
      "For generated-blueprint results, do not repeat, rephrase, or progressively reveal additional questions",
    );
    expect(requests[0].instructions).toContain(
      "clarificationContext contains the original category, question, and user answer",
    );
  });

  it("projects canonical Restaurant facts into the first provider request without enriching a coarse brief", async () => {
    // Removing the definition-aware projection, copying stale Restaurant prose,
    // or serializing a full recipe would leave the provider without current
    // supported defaults or disclose implementation metadata.
    const coarseRestaurantBrief =
      "Build a restaurant where guests can order food.";
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await adapter.interpret({ brief: coarseRestaurantBrief, answers: {} });

    const sent = requests[0];
    expect(sent).toBeDefined();
    const guideMatch = sent!.instructions.match(
      /<supported-restaurant-default>(.*?)<\/supported-restaurant-default>/,
    );
    expect(guideMatch?.[1]).toBeDefined();
    const guide = JSON.parse(guideMatch![1]!) as Record<string, unknown>;
    const intent = restaurantOrderingProductIntent();
    const experience = restaurantOrderingExperienceBrief();
    const recipe = restaurantOrderingProductRecipe();

    expect(guide).toEqual({
      productType: intent.productType,
      actorKeys: intent.actors.map((actor) => actor.key),
      acceptanceJourneyKeys: recipe.acceptanceJourneyKeys,
      constraints: {
        moneyMovement: intent.constraints.moneyMovement,
        externalSideEffects: intent.constraints.externalSideEffects,
      },
      surfaces: experience.surfaces.map((surface) => ({
        key: surface.key,
        device: surface.device,
        audience: surface.audience,
        navigation: surface.navigation,
      })),
    });
    expect(Object.keys(guide).sort()).toEqual([
      "acceptanceJourneyKeys",
      "actorKeys",
      "constraints",
      "productType",
      "surfaces",
    ]);
    expect(JSON.stringify(guide)).not.toMatch(
      /capabilityLocks|route|provider|credential|seedScenarioKeys|pages|screens/i,
    );
    expect((JSON.parse(sent!.input) as { brief: string }).brief).toBe(
      coarseRestaurantBrief,
    );
  });

  it("keeps independent material Restaurant questions unresolved", async () => {
    // A future question filter must not silently remove access, data, or live
    // integration decisions merely because the supported default is grounded.
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions: [
          {
            category: "authorization",
            question: "Which staff roles may view a guest order?",
          },
          {
            category: "data",
            question: "What guest data retention policy applies?",
          },
          {
            category: "integration",
            question: "Should checkout use a live payment provider?",
          },
          {
            category: "role",
            question: "Which staff role may cancel a submitted order?",
          },
        ],
      }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: "Build a restaurant ordering application.",
        answers: {},
      })
    ).interpretation;

    expect(
      parseRequirementSpec(interpretation.spec).openQuestions.map(
        (question) => question.category,
      ),
    ).toEqual(["authorization", "data", "integration", "role"]);
    expect(
      interpretation.clarifications.flatMap((clarification) =>
        clarification.questions.map((question) => question.question),
      ),
    ).toEqual([
      "Which staff roles may view a guest order?",
      "What guest data retention policy applies?",
      "Should checkout use a live payment provider?",
      "Which staff role may cancel a submitted order?",
    ]);
    expect(requests[0]?.instructions).toContain(
      "Apply every omitted canonical Restaurant detail as its own supported default, independently of whether another requested capability needs clarification.",
    );
    expect(requests[0]?.instructions).toContain(
      "For an unsupported live payment or external capability, clearly state the current supported limitation and ask one meaningful scope decision for each genuinely independent material difference.",
    );
    expect(requests[0]?.instructions).toContain(
      "Do not ask for provider setup, credentials, configuration, or integration implementation details that the supported product cannot implement.",
    );
    expect(requests[0]?.instructions).toContain(
      "Never silently discard a material question or impose a count target to return supported-default.",
    );
    expect(requests[0]?.instructions).toContain(
      "Preserve an access, privacy, data, or business-rule decision when the brief separately makes it explicit.",
    );
  });

  it("keeps canonical defaults while one unsupported payment scope decision remains", async () => {
    const question =
      "Live payment is not supported. Use simulated checkout, or keep live payment as a required scope?";
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection({
        disposition: "needs-clarification",
        materialQuestions: [{ category: "integration", question }],
      }),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: "Build a restaurant ordering application with live payment.",
        answers: {},
      })
    ).interpretation;

    expect(interpretation.spec.openQuestions).toEqual([
      { category: "integration", question },
    ]);
    expect(
      interpretation.clarifications.flatMap((clarification) =>
        clarification.questions.map((item) => item.question),
      ),
    ).toEqual([question]);
    expect(requests[0]?.instructions).toContain(
      "Apply every omitted canonical Restaurant detail as its own supported default, independently of whether another requested capability needs clarification.",
    );
    expect(requests[0]?.instructions).toContain(
      "When an unavailable external capability is the only explicit difference from the canonical Restaurant default, return exactly one integration material question that states the current supported limitation and asks whether to accept the supported scope or retain that capability as required.",
    );
    expect(requests[0]?.instructions).toContain(
      "Do not infer downstream policy, data, authorization, implementation, processor, setup, or configuration questions from that one unavailable external capability.",
    );
  });

  it("accepts the supported Restaurant scope only after an explicit follow-up answer", async () => {
    const question =
      "Live payment is not supported. Use simulated checkout, or keep live payment as a required scope?";
    const answer =
      "Use the supported simulated checkout; live payment is not required.";
    const { requests, transport } = capturingTransport(
      restaurantDefinitionSelection(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: "Build a restaurant ordering application with live payment.",
        answers: { "q-live-payment-scope": answer },
        clarificationContext: [
          {
            key: "q-live-payment-scope",
            category: "integration",
            defaultPolicy: "required",
            question,
            answer,
          },
        ],
      })
    ).interpretation;

    expect(interpretation.spec.productType).toBe("restaurant-ordering");
    expect(interpretation.clarifications).toEqual([]);
    expect(JSON.parse(requests[0]!.input)).toMatchObject({
      answers: { "q-live-payment-scope": answer },
      clarificationContext: [{ question, answer }],
    });
    expect(requests[0]?.instructions).toContain(
      "A Restaurant follow-up may return supported-default when the supplied answer resolves its material question and no unresolved material requirement remains: missing menu names or USD prices must become complete, and an unsupported-scope question requires explicit acceptance of the supported scope.",
    );
  });

  it("keeps generic ambiguity guidance for briefs without the Restaurant default", async () => {
    const { requests, transport } = capturingTransport(
      openaiExpenseCandidate(),
    );
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    await adapter.interpret({ brief: expenseApprovalBrief, answers: {} });

    expect(requests[0]?.instructions).toContain(
      "If the brief is ambiguous, leave an open question in the spec instead of guessing unless an applicable supported definition resolves the omitted detail.",
    );
    expect(requests[0]?.instructions).toContain(
      "Products outside the registered supported definitions return generated-blueprint.",
    );
  });

  /** A grant-consistent candidate minus the submit grant on the expense. */
  function inconsistentExpenseCandidate(): Record<string, unknown> {
    const candidate = openaiExpenseCandidate();
    const actors = (candidate.blueprint as Record<string, unknown>).actors as {
      key: string;
      permissions: { entityKey: string; actions: string[] }[];
    }[];
    const employee = actors.find((actor) => actor.key === "employee");
    expect(employee).toBeDefined();
    employee!.permissions = employee!.permissions.map((permission) =>
      permission.entityKey === "expense"
        ? {
            ...permission,
            actions: permission.actions.filter((action) => action !== "submit"),
          }
        : permission,
    );
    return candidate;
  }

  it("repairs a follow-up proposal that invents another unanswered clarification", async () => {
    const unresolved = openaiExpenseCandidate();
    (
      unresolved.spec as {
        openQuestions: Array<{
          category: "business-rule";
          question: string;
        }>;
      }
    ).openQuestions = [
      {
        category: "business-rule",
        question: "Which approval convention applies?",
      },
    ];
    const calls: OpenAITransportRequest[] = [];
    const transport: OpenAIResponseTransport = {
      async create(request) {
        calls.push(request);
        return {
          outputText: JSON.stringify(
            generatedBlueprintResult(
              calls.length === 1 ? unresolved : openaiExpenseCandidate(),
            ),
          ),
        };
      },
    };
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: expenseApprovalBrief,
        answers: { "approval-role": "Managers approve every request." },
        clarificationContext: [
          {
            key: "approval-role",
            category: "authorization",
            defaultPolicy: "required",
            question: "Who may approve a request?",
            answer: "Managers approve every request.",
          },
        ],
      })
    ).interpretation;

    expect(interpretation.clarifications).toEqual([]);
    expect(calls).toHaveLength(2);
    expect((JSON.parse(calls[1].input) as { repair?: string }).repair).toBe(
      "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.",
    );
  });

  it("repairs a rejected candidate with the deterministic reason within the bound", async () => {
    // The model proposes a workflow whose submit transition is not granted;
    // the deterministic validator rejects it. The adapter feeds the
    // validator's own (sanitized) reason back and asks again — never raw
    // provider text — and the authoritative validation still runs on the
    // repaired proposal.
    const calls: OpenAITransportRequest[] = [];
    const transport: OpenAIResponseTransport = {
      async create(request: OpenAITransportRequest) {
        calls.push(request);
        const payload = JSON.parse(request.input) as {
          repair?: string;
        };
        return {
          outputText: JSON.stringify(
            generatedBlueprintResult(
              payload.repair === undefined
                ? inconsistentExpenseCandidate()
                : openaiExpenseCandidate(),
            ),
          ),
        };
      },
    };
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    const interpretation = (
      await adapter.interpret({
        brief: expenseApprovalBrief,
        answers: {},
      })
    ).interpretation;
    const blueprint = parseProductBlueprint(interpretation.blueprint);
    expect(blueprint.title).toBe("Expense Approval");

    // Exactly one repair round, and the repair note is fixed generic text,
    // never provider, candidate, parser, or validator material.
    expect(calls).toHaveLength(2);
    const repair = (JSON.parse(calls[1].input) as { repair?: string }).repair;
    expect(repair).toBe(
      "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.",
    );
    expect(repair).not.toContain("sk-");
  });

  it("fails closed after the bounded repair rounds", async () => {
    // A model that never complies is charged exactly the bound: the initial
    // proposal plus the bounded repair rounds, then the deterministic
    // validator's reason is the failure.
    let calls = 0;
    const transport: OpenAIResponseTransport = {
      async create() {
        calls += 1;
        return {
          outputText: JSON.stringify(
            generatedBlueprintResult(inconsistentExpenseCandidate()),
          ),
        };
      },
    };
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(calls).toBe(3);
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
    // The final failure is fixed local text; validator and offending material
    // never cross the adapter boundary.
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toMatchObject({
      code: "output_invalid",
      message: "Requirement interpretation output was invalid.",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.not.toThrow(/https?:\/\//);
  });

  it("fails closed on a camelCase graph-symbol key the plan seam could never accept", async () => {
    // Blueprint keys become plan graph symbols verbatim (`graph.flow.<key>`,
    // `graph.domain.<key>`, `graph.policy.<key>`, `graph.page.<key>`) whose
    // grammar is lowercase kebab only. The mirror schema steers the model to
    // kebab keys, and a camelCase proposal must fail closed here instead of
    // dead-ending the planning request later with a 409 at the plan seam.
    const candidate = openaiExpenseCandidate();
    (candidate.blueprint as Record<string, unknown>).workflows = (
      candidate.blueprint as Record<string, unknown>
    ).workflows!.map((workflow: Record<string, unknown>) => ({
      ...workflow,
      key: "expenseApproval",
    }));
    const { transport } = capturingTransport(candidate);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
  });

  it("fails closed on a hyphenated entity field key the apply seam could never accept", async () => {
    // Entity field keys become graph `domain.entities[].fields[].key` verbatim,
    // whose grammar is lowercase-first camelCase with underscores — hyphens are
    // forbidden. This is the exact apply-seam failure class seen with the real
    // model (`submitted-by`/`audited-by` dead-ending the composition apply in a
    // raw Graph validation error); the mirror schema must fail the candidate
    // closed here instead.
    const candidate = openaiExpenseCandidate();
    (candidate.blueprint as Record<string, unknown>).entities = (
      candidate.blueprint as Record<string, unknown>
    ).entities!.map((entity: Record<string, unknown>) => ({
      ...entity,
      fields: (entity.fields as Record<string, unknown>[]).map(
        (field, index) =>
          index === 0 ? { ...field, key: "submitted-by" } : field,
      ),
    }));
    const { transport } = capturingTransport(candidate);
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });
    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toThrow(RequirementInterpreterError);
  });

  it("repairs an initial candidate whose exact id field crosses the Factory-owned identity boundary", async () => {
    const providerMaterial = "Reserved identity marker 8472";
    const calls: OpenAITransportRequest[] = [];
    const transport: OpenAIResponseTransport = {
      async create(request) {
        calls.push(request);
        return {
          outputText: JSON.stringify(
            generatedBlueprintResult(
              calls.length === 1
                ? candidateWithFieldKey("id", providerMaterial)
                : candidateWithFieldKey("identity", providerMaterial),
            ),
          ),
        };
      },
    };
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const interpretation = (
      await adapter.interpret({
        brief: expenseApprovalBrief,
        answers: {},
      })
    ).interpretation;

    expect(interpretation.blueprint.title).toBe("Expense Approval");
    expect(interpretation.blueprint.entities[0]?.fields[0]?.key).toBe(
      "identity",
    );
    expect(calls).toHaveLength(2);
    const fieldKeyPattern = providerFieldKeyPattern(calls[0]);
    expect(fieldKeyPattern).not.toContain("(?");
    for (const allowedKey of [
      "amount",
      "i",
      "iD",
      "id2",
      "idA",
      "identity",
      "id_value",
    ]) {
      expect(new RegExp(fieldKeyPattern).test(allowedKey)).toBe(true);
    }
    for (const invalidKey of ["", "Id", "_id", "i-d", "id-", " id", "id "]) {
      expect(new RegExp(fieldKeyPattern).test(invalidKey)).toBe(false);
    }
    expect(new RegExp(fieldKeyPattern).test("id")).toBe(false);
    expect(calls[0].instructions).toContain("Identity is Factory-owned");
    const repair = (JSON.parse(calls[1].input) as { repair?: string }).repair;
    expect(repair).toBe(
      "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.",
    );
    expect(repair).not.toContain(providerMaterial);
    expect(repair).not.toContain('"key":"id"');
  });

  it("fails closed after bounded repairs keep returning exact id without disclosing provider material", async () => {
    const providerMaterial = "Reserved identity marker 9451";
    const calls: OpenAITransportRequest[] = [];
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          calls.push(request);
          return {
            outputText: JSON.stringify(
              generatedBlueprintResult(
                candidateWithFieldKey("id", providerMaterial),
              ),
            ),
          };
        },
      },
      readEnvironment: () => "test-key",
    });

    let observed: unknown;
    try {
      await adapter.interpret({ brief: expenseApprovalBrief, answers: {} });
    } catch (error) {
      observed = error;
    }

    expect(observed).toMatchObject({
      code: "output_invalid",
      message: "Requirement interpretation output was invalid.",
    });
    expect(String(observed)).not.toContain(providerMaterial);
    expect(calls).toHaveLength(3);
    for (const request of calls) {
      expect(new RegExp(providerFieldKeyPattern(request)).test("id")).toBe(
        false,
      );
      expect(request.instructions).toContain("Identity is Factory-owned");
    }
    for (const request of calls.slice(1)) {
      const repair = (JSON.parse(request.input) as { repair?: string }).repair;
      expect(repair).toBe(
        "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.",
      );
      expect(repair).not.toContain(providerMaterial);
      expect(repair).not.toContain('"key":"id"');
    }
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
    ).rejects.toMatchObject({ code: "provider_not_configured" });

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
    ).rejects.toMatchObject({ code: "provider_unavailable" });
  });

  it("aborts one provider round at 180 seconds without starting a repair", async () => {
    vi.useFakeTimers();
    const calls: OpenAITransportRequest[] = [];
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          calls.push(request);
          return new Promise((_, reject) => {
            request.signal.addEventListener("abort", () => {
              reject(new DOMException("must-not-surface", "AbortError"));
            });
          });
        },
      },
      readEnvironment: () => "test-key",
    });

    const pending = adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "timeout",
      message: "Requirement interpretation timed out.",
    });
    await vi.advanceTimersByTimeAsync(180_000);

    await rejection;
    expect(calls).toHaveLength(1);
  });

  it("aborts the whole invocation at 540 seconds without starting repair N+1", async () => {
    vi.useFakeTimers();
    const calls: OpenAITransportRequest[] = [];
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          calls.push(request);
          if (calls.length < 3) {
            return new Promise((resolve) => {
              setTimeout(() => resolve({ outputText: "not-json" }), 179_999);
            });
          }
          return new Promise((_, reject) => {
            request.signal.addEventListener("abort", () => {
              reject(new DOMException("must-not-surface", "AbortError"));
            });
          });
        },
      },
      readEnvironment: () => "test-key",
    });

    const pending = adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "timeout",
      message: "Requirement interpretation timed out.",
    });
    await vi.advanceTimersByTimeAsync(179_999);
    await vi.advanceTimersByTimeAsync(179_999);
    await vi.advanceTimersByTimeAsync(180_002);

    await rejection;
    expect(calls).toHaveLength(3);
  });

  it("propagates caller abort to the active provider transport without exposing its reason", async () => {
    const caller = new AbortController();
    const sentinel = "caller-reason-must-not-surface";
    let transportSignal: AbortSignal | undefined;
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          transportSignal = request.signal;
          return new Promise((_, reject) => {
            request.signal.addEventListener("abort", () => {
              reject(
                new DOMException("transport-must-not-surface", "AbortError"),
              );
            });
          });
        },
      },
      readEnvironment: () => "test-key",
    });

    const pending = adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
      signal: caller.signal,
    });
    caller.abort(new Error(sentinel));

    await expect(pending).rejects.toMatchObject({
      code: "timeout",
      message: "Requirement interpretation timed out.",
    });
    expect(transportSignal?.aborted).toBe(true);
    await expect(pending).rejects.not.toThrow(sentinel);
  });

  it("checks caller abort after transport completion before parsing the candidate", async () => {
    const caller = new AbortController();
    let calls = 0;
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create() {
          calls += 1;
          queueMicrotask(() => caller.abort(new Error("must-not-surface")));
          return {
            outputText: JSON.stringify(
              generatedBlueprintResult(openaiExpenseCandidate()),
            ),
          };
        },
      },
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.interpret({
        brief: expenseApprovalBrief,
        answers: {},
        signal: caller.signal,
      }),
    ).rejects.toMatchObject({
      code: "timeout",
      message: "Requirement interpretation timed out.",
    });
    expect(calls).toBe(1);
  });

  it("passes the composed signal and no-retry 180-second policy to the production SDK", async () => {
    const create = vi.fn().mockResolvedValue({
      status: "completed",
      error: null,
      output: [],
      output_text: "{}",
    });
    const module =
      (await import("../src/requirements/openai-interpreter.js")) as Record<
        string,
        unknown
      >;
    const Transport = module.OpenAIRequirementResponsesApiTransport;
    expect(Transport).toBeTypeOf("function");
    if (typeof Transport !== "function") return;
    const transport = new (
      Transport as new (input: {
        readonly createClient: () => {
          readonly responses: { readonly create: typeof create };
        };
      }) => OpenAIResponseTransport
    )({
      createClient: () => ({ responses: { create } }),
    });
    const signal = new AbortController().signal;

    await transport.create({
      apiKey: "test-key",
      model: "gpt-5",
      instructions: "fixed",
      input: "{}",
      store: false,
      strictJson: true,
      jsonSchema: {},
      signal,
      timeout: 180_000,
      maxRetries: 0,
    });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).toEqual({
      model: "gpt-5",
      instructions: "fixed",
      input: "{}",
      store: false,
      max_output_tokens: 25000,
      text: {
        format: {
          type: "json_schema",
          name: "factory_requirement_interpretation",
          strict: true,
          schema: {},
        },
      },
    });
    expect(create.mock.calls[0]?.[1]).toEqual({
      signal,
      timeout: 180_000,
      maxRetries: 0,
    });
  });

  function completedSdkResponse(outputText: string) {
    return {
      status: "completed",
      error: null,
      output: [],
      output_text: outputText,
    };
  }

  function sdkAdapter(create: ReturnType<typeof vi.fn>) {
    return new OpenAIRequirementInterpreterAdapter({
      transport: new OpenAIRequirementResponsesApiTransport({
        createClient: () => ({ responses: { create } }),
      }),
      readEnvironment: () => "test-key",
    });
  }

  it.each([
    {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    },
    { status: "incomplete", incomplete_details: { reason: "content_filter" } },
    { status: "failed" },
    { status: "queued" },
    { status: "in_progress" },
    { status: "cancelled" },
    { status: undefined },
    { status: "provider-canary-status" },
    {
      error: { code: "provider-canary-code", message: "provider-canary-error" },
    },
    { error: undefined },
    {
      output: [
        { content: [{ type: "refusal", refusal: "provider-canary-refusal" }] },
      ],
    },
  ])(
    "stops terminal SDK response %# before semantic repair even with valid-looking text",
    async (metadata) => {
      const create = vi.fn().mockResolvedValue({
        ...completedSdkResponse(JSON.stringify(approvalDefinitionSelection())),
        ...metadata,
      });
      const pending = sdkAdapter(create).interpret({
        brief: expenseApprovalBrief,
        answers: {},
      });
      await expect(pending).rejects.toMatchObject({
        code: "output_invalid",
        message: "Requirement interpretation output was invalid.",
      });
      await expect(pending).rejects.not.toThrow("provider-canary");
      expect(create).toHaveBeenCalledOnce();
    },
  );

  it("does not read text from an incomplete SDK response", async () => {
    let reads = 0;
    const create = vi.fn().mockResolvedValue({
      status: "incomplete",
      error: null,
      output: [],
      get output_text() {
        reads += 1;
        return "provider-canary-text";
      },
    });
    await expect(
      sdkAdapter(create).interpret({
        brief: expenseApprovalBrief,
        answers: {},
      }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(reads).toBe(0);
    expect(create).toHaveBeenCalledOnce();
  });

  it("accepts a completed SDK Expense response with the fixed output budget", async () => {
    const create = vi
      .fn()
      .mockResolvedValue(
        completedSdkResponse(JSON.stringify(approvalDefinitionSelection())),
      );
    const result = await sdkAdapter(create).interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(result.interpretation.blueprint.requirementChecksum).toBe(
      "sha256:6adb860e104c495b1ad0b06abc7713ec241a3e97d4a8a5e39c444977a82a186b",
    );
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      max_output_tokens: 25000,
      store: false,
      text: { format: { strict: true } },
    });
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("reasoning");
  });

  it.each([
    "not-json",
    JSON.stringify(approvalDefinitionSelection({ businessParameters: {} })),
  ])(
    "keeps completed-invalid SDK repair bounded with the same budget %#",
    async (outputText) => {
      const create = vi
        .fn()
        .mockResolvedValue(completedSdkResponse(outputText));
      await expect(
        sdkAdapter(create).interpret({
          brief: expenseApprovalBrief,
          answers: {},
        }),
      ).rejects.toMatchObject({ code: "output_invalid" });
      expect(create).toHaveBeenCalledTimes(3);
      for (const [body, options] of create.mock.calls) {
        expect(body).toMatchObject({
          max_output_tokens: 25000,
          store: false,
          text: { format: { strict: true } },
        });
        expect(body).not.toHaveProperty("reasoning");
        expect(options).toMatchObject({ timeout: 180_000, maxRetries: 0 });
      }
    },
  );

  it("repairs completed-invalid SDK content into a completed valid selection", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(completedSdkResponse("not-json"))
      .mockResolvedValueOnce(
        completedSdkResponse(JSON.stringify(approvalDefinitionSelection())),
      );
    const result = await sdkAdapter(create).interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    expect(result.interpretation.blueprint.pageIntents).toHaveLength(6);
    expect(create).toHaveBeenCalledTimes(2);
    expect(
      create.mock.calls.every(([body]) => body.max_output_tokens === 25000),
    ).toBe(true);
  });

  it("keeps caller cancellation ahead of terminal SDK classification", async () => {
    const caller = new AbortController();
    const create = vi.fn().mockImplementation(async () => {
      caller.abort(new Error("provider-canary-caller"));
      return {
        ...completedSdkResponse(JSON.stringify(approvalDefinitionSelection())),
        status: "incomplete",
      };
    });
    await expect(
      sdkAdapter(create).interpret({
        brief: expenseApprovalBrief,
        answers: {},
        signal: caller.signal,
      }),
    ).rejects.toMatchObject({
      code: "timeout",
      message: "Requirement interpretation timed out.",
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it("keeps the round deadline ahead of terminal SDK classification", async () => {
    vi.useFakeTimers();
    const create = vi.fn().mockImplementation(
      async (_body, options) =>
        new Promise((resolve) =>
          options.signal.addEventListener("abort", () =>
            resolve({
              status: "incomplete",
              error: null,
              output: [],
              output_text: "provider-canary-timeout",
            }),
          ),
        ),
    );
    const pending = sdkAdapter(create).interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
    const rejected = expect(pending).rejects.toMatchObject({
      code: "timeout",
      message: "Requirement interpretation timed out.",
    });
    await vi.advanceTimersByTimeAsync(180_001);
    await rejected;
    expect(create).toHaveBeenCalledOnce();
  });

  it("does not repair a provider rejection", async () => {
    let calls = 0;
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create() {
          calls += 1;
          throw { status: 400, message: "provider-must-not-surface" };
        },
      },
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
    ).rejects.toMatchObject({
      code: "provider_rejected",
      message: "Requirement interpretation provider rejected the request.",
    });
    expect(calls).toBe(1);
  });

  it("declares a strict-mode JSON schema where every object property is required", async () => {
    let captured: unknown;
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          captured = request.jsonSchema;
          return {
            outputText: JSON.stringify(
              generatedBlueprintResult(openaiExpenseCandidate()),
            ),
          };
        },
      },
      readEnvironment: () => "test-key",
    });

    await adapter.interpret({ brief: expenseApprovalBrief, answers: {} });

    const violations: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (node === null || typeof node !== "object" || Array.isArray(node)) {
        return;
      }
      const record = node as Record<string, unknown>;
      if (record.type === "object") {
        if (record.additionalProperties !== false) {
          violations.push(`${path}: additionalProperties must be false`);
        }
        const required = Array.isArray(record.required)
          ? (record.required as string[])
          : [];
        const properties =
          record.properties !== null && typeof record.properties === "object"
            ? Object.keys(record.properties as Record<string, unknown>)
            : [];
        for (const key of properties) {
          if (!required.includes(key)) {
            violations.push(`${path}.properties.${key}: missing from required`);
          }
        }
      }
      for (const [key, value] of Object.entries(record)) {
        walk(value, `${path}.${key}`);
      }
    };
    walk(captured, "schema");
    expect(violations).toEqual([]);
  });

  it("types malformed JSON and semantic exhaustion as output_invalid", async () => {
    for (const outputText of [
      "not-json",
      JSON.stringify(generatedBlueprintResult(inconsistentExpenseCandidate())),
    ]) {
      let calls = 0;
      const adapter = new OpenAIRequirementInterpreterAdapter({
        transport: {
          async create() {
            calls += 1;
            return { outputText };
          },
        },
        readEnvironment: () => "test-key",
      });

      await expect(
        adapter.interpret({ brief: expenseApprovalBrief, answers: {} }),
      ).rejects.toMatchObject({
        code: "output_invalid",
        message: "Requirement interpretation output was invalid.",
      });
      expect(calls).toBe(3);
    }
  });

  it("never exposes hostile provider, candidate, validator, or abort material", async () => {
    const sentinel = "HOSTILE-SENTINEL-MUST-NOT-SURFACE";
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "debug").mockImplementation(() => undefined),
      vi.spyOn(console, "trace").mockImplementation(() => undefined),
    ];
    const requests: OpenAITransportRequest[] = [];
    const adapter = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          requests.push(request);
          return {
            outputText:
              requests.length === 1
                ? `{${sentinel}`
                : JSON.stringify(
                    generatedBlueprintResult({
                      ...openaiExpenseCandidate(),
                      [sentinel]: true,
                    }),
                  ),
          };
        },
      },
      readEnvironment: () => "test-key",
    });

    let observed: unknown;
    try {
      await adapter.interpret({ brief: expenseApprovalBrief, answers: {} });
    } catch (error) {
      observed = error;
    }

    expect(observed).toMatchObject({
      code: "output_invalid",
      message: "Requirement interpretation output was invalid.",
    });
    expect(String(observed)).not.toContain(sentinel);
    for (const request of requests.slice(1)) {
      const repair = (JSON.parse(request.input) as { repair?: string }).repair;
      expect(repair).toBe(
        "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.",
      );
      expect(repair).not.toContain(sentinel);
    }
    for (const spy of consoleSpies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(sentinel);
    }
  });

  it("keeps hostile brief, answer, provider cause, and abort reason out of failure and console surfaces", async () => {
    const hostileBrief = "HOSTILE-BRIEF-MUST-NOT-SURFACE";
    const hostileAnswer = "HOSTILE-ANSWER-MUST-NOT-SURFACE";
    const hostileCause = "HOSTILE-CAUSE-MUST-NOT-SURFACE";
    const hostileAbort = "HOSTILE-ABORT-MUST-NOT-SURFACE";
    const consoleSpies = ["log", "info", "warn", "error", "debug", "trace"].map(
      (method) =>
        vi.spyOn(console, method as "log").mockImplementation(() => undefined),
    );
    const providerFailure = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create() {
          throw new Error(hostileCause);
        },
      },
      readEnvironment: () => "test-key",
    });

    let providerObserved: unknown;
    try {
      await providerFailure.interpret({
        brief: hostileBrief,
        answers: { hostile: hostileAnswer },
      });
    } catch (error) {
      providerObserved = error;
    }
    expect(providerObserved).toMatchObject({ code: "provider_unavailable" });

    const caller = new AbortController();
    const aborted = new OpenAIRequirementInterpreterAdapter({
      transport: {
        async create(request) {
          return new Promise((_, reject) => {
            request.signal?.addEventListener("abort", () =>
              reject(request.signal?.reason),
            );
          });
        },
      },
      readEnvironment: () => "test-key",
    });
    const pending = aborted.interpret({
      brief: hostileBrief,
      answers: { hostile: hostileAnswer },
      signal: caller.signal,
    });
    caller.abort(new Error(hostileAbort));
    await expect(pending).rejects.toMatchObject({ code: "timeout" });

    const exposed = JSON.stringify({
      providerObserved,
      console: consoleSpies.map((spy) => spy.mock.calls),
    });
    expect(exposed).not.toContain(hostileBrief);
    expect(exposed).not.toContain(hostileAnswer);
    expect(exposed).not.toContain(hostileCause);
    expect(exposed).not.toContain(hostileAbort);
  });
});

describe("approval correction canonical definitions", () => {
  it("declares same-record return and revise with exact grants", () => {
    const definition = canonicalExpenseApprovalInterpretation().blueprint;
    expect(definition.workflows[0]!.states.map((state) => state.key)).toEqual([
      "draft",
      "submitted",
      "approved",
      "returned",
    ]);
    expect(definition.actors[0]!.permissions[0]!.actions).toEqual([
      "create",
      "read",
      "update",
      "submit",
    ]);
    expect(definition.workflows[0]!.transitions.at(-1)).toMatchObject({
      key: "update",
      from: "returned",
      to: "draft",
      actorKey: "employee",
      label: "Revise",
    });
  });
});
