import { afterEach, describe, expect, it, vi } from "vitest";

import {
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
import { planProductAlternatives } from "@factory/capabilities/node";
import type { OpenAIResponseTransport } from "../src/ai.js";
import type { OpenAITransportRequest } from "../src/ai.js";
import { FixtureRequirementInterpreter } from "../src/requirements/fixture-interpreter.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";
import {
  clarificationQuestionsMatch,
  factoryClarificationDefault,
  RequirementInterpreterError,
} from "../src/requirements/requirement-interpreter.js";

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
    ).toEqual(
      expect.arrayContaining(["confirm", "reschedule", "delete", "cancel"]),
    );
    // Every declared transition must be granted to its actor: the composed
    // runtime authorizes (role, entity, event) against the blueprint
    // permissions, and assertProductBlueprint now rejects ungranted flows.
    expect(() => parseProductBlueprint(interpretation.blueprint)).not.toThrow();

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

    const interpretation = await adapter.interpret({
      brief: "Build a restaurant ordering application.",
      answers: {},
    });

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
      "Only non-Restaurant products return generated-blueprint",
    );
    expect(requests[0]?.instructions).toContain(
      "For Restaurant follow-ups, reevaluate definition fit and retain needs-clarification for every still-material question or new material difference",
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
    expect(schema.properties.definitionSelection.anyOf).toHaveLength(2);
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

    const interpretation = await adapter.interpret({
      brief: "Build a restaurant app named Saffron Table.",
      answers: {},
    });

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
      adapter.interpret({
        brief: "Build a restaurant app named Go.",
        answers: {},
      }),
    ).resolves.toMatchObject({ blueprint: { title } });

    const schema = requests[0]?.jsonSchema as {
      readonly properties: {
        readonly definitionSelection: {
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
            unknown,
          ];
        };
      };
    };
    const titleSchema =
      schema.properties.definitionSelection.anyOf[0].properties.title;
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
      adapter.interpret({
        brief: "Build a restaurant app named Saffron & Sage.",
        answers: {},
      }),
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
      adapter.interpret({
        brief: "Build a restaurant app named Café & Sage.",
        answers: {},
      }),
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
      adapter.interpret({
        brief:
          "Build a restaurant ordering application named Saffron Table with a sample menu customers can browse.",
        answers: {},
      }),
    ).resolves.toMatchObject({
      blueprint: { title: "Saffron Table" },
      clarifications: [],
    });
    expect(requests[0]?.instructions).toContain(
      "Treat an explicit request for a sample, demo, or default menu, or generic menu browsing alone, as the existing canonical default; application branding is not menu content.",
    );
  });

  it("keeps requested custom menu data fail-closed after an answer", async () => {
    // Changing the data category, accepting an answered custom-menu request,
    // or removing the boundary instruction would make this existing
    // clarification projection stop protecting unbound menu data. The mocked
    // selection does not prove model classification.
    const question =
      "Custom menu items and prices are outside the current restaurant binding. Accept the canonical menu, or retain custom menu data as required?";
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
        brief:
          "Build a restaurant with a custom tasting menu including Black Cod priced at 120.",
        answers: { "q-menu-data": "Keep the custom menu data as required." },
        clarificationContext: [
          {
            key: "q-menu-data",
            category: "data",
            defaultPolicy: "required",
            question,
            answer: "Keep the custom menu data as required.",
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "output_invalid" });
    expect(requests).toHaveLength(3);
    expect(requests[0]?.instructions).toContain(
      "An explicit request for a custom or noncanonical menu, or supplied actual dish names or price values, is custom menu data. When either is explicit, it is outside the current canonical binding: return needs-clarification with one consolidated data scope question, and do not encode menu data in title.",
    );
  });

  it("keeps explicit custom-menu intent material without supplied menu values", async () => {
    // This known provider output checks the adapter clarification boundary and
    // emitted instruction. It does not claim that a mocked response proves
    // model semantic classification.
    const question =
      "Custom menu data is outside the current restaurant binding. Accept the canonical menu, or retain the custom menu as required?";
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
        brief:
          "Build a restaurant ordering application that uses my custom menu.",
        answers: {},
      }),
    ).resolves.toMatchObject({
      clarifications: [{ questions: [{ category: "data", question }] }],
    });
    expect(requests[0]?.instructions).toContain(
      "Treat an explicit request for a sample, demo, or default menu, or generic menu browsing alone, as the existing canonical default; application branding is not menu content.",
    );
    expect(requests[0]?.instructions).toContain(
      "An explicit request for a custom or noncanonical menu, or supplied actual dish names or price values, is custom menu data.",
    );
  });

  it("preserves the generated Appointment envelope through the private provider branch", async () => {
    const fixture = await new FixtureRequirementInterpreter().interpret({
      brief: appointmentBookingBrief,
      answers: {},
    });
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
      adapter.interpret({ brief: appointmentBookingBrief, answers: {} }),
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
      "A Restaurant follow-up may return supported-default only when the supplied answer explicitly accepts the supported scope and no unresolved material requirement remains.",
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

    const interpretation = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {
        "q-who-may-approve-an-expense": "Managers approve submitted expenses.",
      },
    });

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

    const interpretation = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {
        "q-who-may-approve-an-expense": "Managers approve submitted expenses.",
      },
    });

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

    const interpretation = await adapter.interpret({
      brief: "Build a restaurant ordering application.",
      answers: {},
    });

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

    const interpretation = await adapter.interpret({
      brief: "Build a restaurant ordering application with live payment.",
      answers: {},
    });

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

    const interpretation = await adapter.interpret({
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
    });

    expect(interpretation.spec.productType).toBe("restaurant-ordering");
    expect(interpretation.clarifications).toEqual([]);
    expect(JSON.parse(requests[0]!.input)).toMatchObject({
      answers: { "q-live-payment-scope": answer },
      clarificationContext: [{ question, answer }],
    });
    expect(requests[0]?.instructions).toContain(
      "A Restaurant follow-up may return supported-default only when the supplied answer explicitly accepts the supported scope and no unresolved material requirement remains.",
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
      "Only non-Restaurant products follow the generated-blueprint interpretation rules.",
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

    const interpretation = await adapter.interpret({
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
    });

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
    const interpretation = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });
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

    const interpretation = await adapter.interpret({
      brief: expenseApprovalBrief,
      answers: {},
    });

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
    const create = vi.fn().mockResolvedValue({ output_text: "{}" });
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
    expect(create.mock.calls[0]?.[1]).toEqual({
      signal,
      timeout: 180_000,
      maxRetries: 0,
    });
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
