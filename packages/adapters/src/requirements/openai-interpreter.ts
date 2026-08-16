import OpenAI from "openai";
import { z } from "zod";

import {
  blueprintActionVerbs,
  blueprintActionSchema,
  blueprintFieldTypeSchema,
  graphFieldKeySchema,
  graphKeySchema,
  hashRequirementSpec,
  identifierSchema,
  pageIntentSchema,
  parseStrict,
  safeBusinessTextSchema,
} from "@factory/graph";

import {
  type OpenAIResponseTransport,
  type OpenAITransportRequest,
} from "../ai.js";
import {
  RequirementInterpreterError,
  assertRequirementInterpretation,
  clarificationQuestionsMatch,
  deriveClarifications,
  type ClarificationAnswerContextV1,
  type RequirementInterpreterAdapterV1,
  type RequirementInterpretationV1,
} from "./requirement-interpreter.js";

/** Optional text fields arrive as `null` from strict JSON mode. */
function optionalText<T extends z.ZodTypeAny>(
  schema: T,
): z.ZodType<z.output<T> | undefined> {
  return z.preprocess(
    (value) => (value === null ? undefined : value),
    schema.optional(),
  ) as z.ZodType<z.output<T> | undefined>;
}

const modelNamedItemSchema = z
  .object({
    key: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    description: optionalText(safeBusinessTextSchema.max(500)),
  })
  .strict();

/**
 * The model's requirement candidate: the full RequirementSpecV1 shape with
 * strict JSON-nullable optionals. It is re-validated authoritatively by
 * parseRequirementSpec inside assertRequirementInterpretation.
 */
const modelRequirementSchema = z
  .object({
    apiVersion: z.literal("factory.requirement-spec/v1"),
    // The requirementId becomes the graph key and the identity-policy domain
    // symbols (`graph.domain.<requirementId>-principal`); it mirrors the
    // authoritative graphKeySchema so the model can never propose a key the
    // seam would later reject.
    requirementId: graphKeySchema,
    productType: z
      .enum(["restaurant-ordering", "commerce", "workflow", "custom"])
      .optional(),
    outcome: safeBusinessTextSchema,
    actors: z.array(modelNamedItemSchema).min(1).max(30),
    domainConcepts: z.array(modelNamedItemSchema).max(60),
    workflows: z.array(modelNamedItemSchema).max(40),
    constraints: z
      .array(
        z
          .object({
            key: identifierSchema,
            kind: z.enum([
              "performance",
              "security",
              "compliance",
              "usability",
              "availability",
              "cost",
            ]),
            statement: safeBusinessTextSchema.max(1000),
          })
          .strict(),
      )
      .max(30),
    openQuestions: z
      .array(
        z
          .object({
            category: z.enum([
              "experience.visual-style",
              "authorization",
              "visibility",
              "role",
              "business-rule",
              "data",
              "integration",
            ]),
            question: safeBusinessTextSchema.max(500),
            answer: optionalText(safeBusinessTextSchema.max(1000)),
          })
          .strict(),
      )
      .max(30),
    acceptanceScenarios: z
      .array(
        z
          .object({
            key: identifierSchema,
            given: safeBusinessTextSchema.max(1000),
            when: safeBusinessTextSchema.max(1000),
            then: safeBusinessTextSchema.max(1000),
          })
          .strict(),
      )
      .max(40),
  })
  .strict();

type ModelRequirement = z.infer<typeof modelRequirementSchema>;

/**
 * The provider cannot revoke a user's answer to the exact same deterministic
 * clarification key. Different or newly phrased questions remain unresolved
 * and are handled by the bounded clarification policy.
 */
function reconcileClarificationAnswers(
  spec: ModelRequirement,
  answers: Readonly<Record<string, string>>,
  clarificationContext: readonly ClarificationAnswerContextV1[],
): ModelRequirement {
  const projected = deriveClarifications(spec).flatMap(
    (clarification) => clarification.questions,
  );
  let projectedIndex = 0;
  return {
    ...spec,
    openQuestions: spec.openQuestions.map((question) => {
      if (question.answer !== undefined) return question;
      const clarification = projected[projectedIndex];
      projectedIndex += 1;
      if (clarification?.question !== question.question) return question;
      const contextualAnswer = clarificationContext.find(
        (context) =>
          context.category === question.category &&
          clarificationQuestionsMatch(context.question, question.question),
      )?.answer;
      const answer =
        answers[clarification.key]?.trim() ?? contextualAnswer?.trim();
      return answer ? { ...question, answer } : question;
    }),
  };
}

const modelFieldKeySchema = graphFieldKeySchema.refine((key) => key !== "id");

const modelFieldSchema = z
  .object({
    key: modelFieldKeySchema,
    label: safeBusinessTextSchema.max(160),
    description: optionalText(safeBusinessTextSchema.max(500)),
    type: blueprintFieldTypeSchema,
    required: z.boolean(),
    options: optionalText(
      z.array(safeBusinessTextSchema.max(160)).min(2).max(50),
    ),
    referenceTo: optionalText(identifierSchema),
  })
  .strict();

// Entity, actor, page-intent, and workflow keys become graph-symbol segments
// verbatim (`graph.domain.<key>`, `graph.policy.<key>`, `graph.page.<key>`,
// `graph.flow.<key>`); they mirror the authoritative graphKeySchema. Field keys
// become graph domain entity field keys verbatim (`domain.entities[].fields[].key`),
// whose grammar is lowercase-first camelCase with underscores — never hyphens;
// state keys become graph flow state identifiers (lowercase-kebab like the
// other graph symbols). Journey keys stay ordinary identifiers (they never
// reach the graph).
const modelEntitySchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    description: optionalText(safeBusinessTextSchema.max(500)),
    fields: z.array(modelFieldSchema).min(1).max(60),
  })
  .strict();

const modelActorSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    description: optionalText(safeBusinessTextSchema.max(500)),
    permissions: z
      .array(
        z
          .object({
            entityKey: identifierSchema,
            actions: z.array(blueprintActionSchema).min(1).max(12),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

const modelPageIntentSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    intent: pageIntentSchema,
    entityKey: optionalText(identifierSchema),
  })
  .strict();

const modelStateSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
  })
  .strict();

// The same bounded vocabulary as the provider schema and the authoritative
// blueprint schema: a transition key is the event the runtime authorizes
// (role, entity, event) against, so it must be grantable.
const modelTransitionSchema = z
  .object({
    key: z.enum(blueprintActionVerbs),
    from: identifierSchema,
    to: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    actorKey: identifierSchema,
  })
  .strict();

const modelWorkflowSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    entityKey: identifierSchema,
    states: z.array(modelStateSchema).min(2).max(20),
    transitions: z.array(modelTransitionSchema).min(1).max(40),
  })
  .strict();

const modelJourneySchema = z
  .object({
    key: identifierSchema,
    description: safeBusinessTextSchema.max(500),
    steps: z
      .array(
        z
          .object({
            actorKey: identifierSchema,
            action: safeBusinessTextSchema.max(500),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

/**
 * The model's blueprint candidate: business semantics only. There is no
 * requirementChecksum field — the adapter computes it authoritatively from
 * the validated spec — and no route, URL, path, capability, package, or
 * provider surface exists in the schema.
 */
const modelBlueprintSchema = z
  .object({
    apiVersion: z.literal("factory.product-blueprint/v1"),
    title: safeBusinessTextSchema.max(200),
    actors: z.array(modelActorSchema).min(1).max(20),
    entities: z.array(modelEntitySchema).min(1).max(30),
    pageIntents: z.array(modelPageIntentSchema).min(1).max(40),
    workflows: z.array(modelWorkflowSchema).min(1).max(20),
    acceptanceJourneys: z.array(modelJourneySchema).min(1).max(20),
  })
  .strict();

const modelInterpretationSchema = z
  .object({
    spec: modelRequirementSchema,
    blueprint: modelBlueprintSchema,
  })
  .strict();

type ModelInterpretation = z.infer<typeof modelInterpretationSchema>;

/**
 * Same grammar as graphKeySchema: the provider-side lock for keys that become
 * graph-symbol segments verbatim (`graph.flow.<key>`, `graph.domain.<key>`,
 * `graph.policy.<key>`, `graph.page.<key>`). Lowercase kebab only — a
 * camelCase key could never produce a plan the seam accepts, so the provider
 * is steered here, the mirror schema mirrors it, and the authoritative
 * boundary rejects it.
 */
const graphKeyJsonPattern = "^[a-z][a-z0-9-]*$";

/**
 * Entity FIELD keys become graph `domain.entities[].fields[].key` verbatim,
 * whose grammar is lowercase-first camelCase with underscores — hyphens and
 * the exact Factory-owned identity key `id` are forbidden. Distinct from the
 * kebab grammar above on purpose: the provider must never generalize one
 * grammar to the other surface.
 */
const graphFieldKeyJsonPattern =
  "^([a-hj-z][a-zA-Z0-9_]*|i|i[a-ce-zA-Z0-9_][a-zA-Z0-9_]*|id[a-zA-Z0-9_]+)$";

function namedItemJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["key", "label", "description"],
    properties: {
      key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
      label: { type: "string", minLength: 1, maxLength: 160 },
      description: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
  };
}

function fieldJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "key",
      "label",
      "description",
      "type",
      "required",
      "options",
      "referenceTo",
    ],
    properties: {
      key: { type: "string", pattern: graphFieldKeyJsonPattern },
      label: { type: "string", minLength: 1, maxLength: 160 },
      description: { anyOf: [{ type: "string" }, { type: "null" }] },
      type: {
        type: "string",
        enum: [
          "text",
          "long-text",
          "number",
          "currency",
          "boolean",
          "date",
          "datetime",
          "enum",
          "reference",
          "file",
        ],
      },
      required: { type: "boolean" },
      options: {
        anyOf: [
          {
            type: "array",
            minItems: 2,
            maxItems: 50,
            items: { type: "string", minLength: 1, maxLength: 160 },
          },
          { type: "null" },
        ],
      },
      referenceTo: {
        anyOf: [
          { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
          { type: "null" },
        ],
      },
    },
  };
}

const interpretationJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["spec", "blueprint"],
  properties: {
    spec: {
      type: "object",
      additionalProperties: false,
      required: [
        "apiVersion",
        "requirementId",
        "outcome",
        "actors",
        "domainConcepts",
        "workflows",
        "constraints",
        "openQuestions",
        "acceptanceScenarios",
      ],
      properties: {
        apiVersion: { type: "string", const: "factory.requirement-spec/v1" },
        requirementId: { type: "string", pattern: graphKeyJsonPattern },
        productType: {
          type: "string",
          enum: ["restaurant-ordering", "commerce", "workflow", "custom"],
        },
        outcome: { type: "string", minLength: 1, maxLength: 2000 },
        actors: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: namedItemJsonSchema(),
        },
        domainConcepts: {
          type: "array",
          maxItems: 60,
          items: namedItemJsonSchema(),
        },
        workflows: {
          type: "array",
          maxItems: 40,
          items: namedItemJsonSchema(),
        },
        constraints: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "kind", "statement"],
            properties: {
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              kind: {
                type: "string",
                enum: [
                  "performance",
                  "security",
                  "compliance",
                  "usability",
                  "availability",
                  "cost",
                ],
              },
              statement: { type: "string", minLength: 1, maxLength: 1000 },
            },
          },
        },
        openQuestions: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["category", "question", "answer"],
            properties: {
              category: {
                type: "string",
                enum: [
                  "experience.visual-style",
                  "authorization",
                  "visibility",
                  "role",
                  "business-rule",
                  "data",
                  "integration",
                ],
              },
              question: { type: "string", minLength: 1, maxLength: 500 },
              answer: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
          },
        },
        acceptanceScenarios: {
          type: "array",
          maxItems: 40,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "given", "when", "then"],
            properties: {
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              given: { type: "string", minLength: 1, maxLength: 1000 },
              when: { type: "string", minLength: 1, maxLength: 1000 },
              then: { type: "string", minLength: 1, maxLength: 1000 },
            },
          },
        },
      },
    },
    blueprint: {
      type: "object",
      additionalProperties: false,
      required: [
        "apiVersion",
        "title",
        "actors",
        "entities",
        "pageIntents",
        "workflows",
        "acceptanceJourneys",
      ],
      properties: {
        apiVersion: { type: "string", const: "factory.product-blueprint/v1" },
        title: { type: "string", minLength: 1, maxLength: 200 },
        actors: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "description", "permissions"],
            properties: {
              key: { type: "string", pattern: graphKeyJsonPattern },
              label: { type: "string", minLength: 1, maxLength: 160 },
              description: { anyOf: [{ type: "string" }, { type: "null" }] },
              permissions: {
                type: "array",
                minItems: 1,
                maxItems: 30,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["entityKey", "actions"],
                  properties: {
                    entityKey: {
                      type: "string",
                      pattern: "^[a-z][a-zA-Z0-9-]*$",
                    },
                    actions: {
                      type: "array",
                      minItems: 1,
                      maxItems: 12,
                      items: {
                        type: "string",
                        enum: [
                          "create",
                          "read",
                          "update",
                          "delete",
                          "submit",
                          "approve",
                          "reject",
                          "confirm",
                          "reschedule",
                          "cancel",
                          "audit",
                          "manage",
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        entities: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "description", "fields"],
            properties: {
              key: { type: "string", pattern: graphKeyJsonPattern },
              label: { type: "string", minLength: 1, maxLength: 160 },
              description: { anyOf: [{ type: "string" }, { type: "null" }] },
              fields: {
                type: "array",
                minItems: 1,
                maxItems: 60,
                items: fieldJsonSchema(),
              },
            },
          },
        },
        pageIntents: {
          type: "array",
          minItems: 1,
          maxItems: 40,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "intent", "entityKey"],
            properties: {
              key: { type: "string", pattern: graphKeyJsonPattern },
              label: { type: "string", minLength: 1, maxLength: 160 },
              intent: {
                type: "string",
                enum: [
                  "dashboard",
                  "list",
                  "form",
                  "detail",
                  "queue",
                  "calendar",
                  "settings",
                ],
              },
              entityKey: {
                anyOf: [
                  { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
                  { type: "null" },
                ],
              },
            },
          },
        },
        workflows: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "entityKey", "states", "transitions"],
            properties: {
              key: { type: "string", pattern: graphKeyJsonPattern },
              label: { type: "string", minLength: 1, maxLength: 160 },
              entityKey: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              states: {
                type: "array",
                minItems: 2,
                maxItems: 20,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "label"],
                  properties: {
                    key: { type: "string", pattern: graphKeyJsonPattern },
                    label: { type: "string", minLength: 1, maxLength: 160 },
                  },
                },
              },
              transitions: {
                type: "array",
                minItems: 1,
                maxItems: 40,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "from", "to", "label", "actorKey"],
                  properties: {
                    // The same bounded action vocabulary the permission
                    // grants are drawn from: a transition key is the event
                    // the runtime authorizes (role, entity, event) against,
                    // so it must be grantable.
                    key: {
                      type: "string",
                      enum: [
                        "create",
                        "read",
                        "update",
                        "delete",
                        "submit",
                        "approve",
                        "reject",
                        "confirm",
                        "reschedule",
                        "cancel",
                        "audit",
                        "manage",
                      ],
                    },
                    from: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
                    to: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
                    label: { type: "string", minLength: 1, maxLength: 160 },
                    actorKey: {
                      type: "string",
                      pattern: "^[a-z][a-zA-Z0-9-]*$",
                    },
                  },
                },
              },
            },
          },
        },
        acceptanceJourneys: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "description", "steps"],
            properties: {
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              description: { type: "string", minLength: 1, maxLength: 500 },
              steps: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["actorKey", "action"],
                  properties: {
                    actorKey: {
                      type: "string",
                      pattern: "^[a-z][a-zA-Z0-9-]*$",
                    },
                    action: { type: "string", minLength: 1, maxLength: 500 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const interpretationInstructions = [
  "You are the Factory Pilot requirement interpreter adapter.",
  "Return only a JSON object matching the provided schema.",
  "Interpret the brief into a factory.requirement-spec/v1 requirement and a factory.product-blueprint/v1 product blueprint.",
  "Set the requirement's productType to 'restaurant-ordering' when the brief describes a restaurant, dining, or food-ordering product (guests order dishes; staff manage the menu, kitchen, tables, and service). Leave productType absent for every other product.",
  "The blueprint proposes business semantics only: actors with entity permissions, entities with typed fields, page intents from the approved enum, workflows with states and transitions, and acceptance journeys.",
  "Never propose routes, URLs, paths, capability or package selections, source, code, providers, or credentials.",
  "Business text must not contain URLs, absolute or Windows paths, traversal segments, or prototype-key material.",
  "Do not invent actors, entities, workflows, or acceptance scenarios the brief does not imply.",
  "If the brief is ambiguous, leave an open question in the spec instead of guessing.",
  "Consolidate every material clarification into the first response; never ask one question at a time.",
  "When clarification answers are supplied, treat them as authoritative business input, apply them to the complete spec and blueprint, and mark the corresponding open questions answered.",
  "clarificationContext contains the original category, question, and user answer for each opaque answer key; use that semantic context and do not ask for the same decision again.",
  "When priorInterpretation is supplied, treat it as the validated baseline: revise only semantics affected by the supplied answers, preserve stable identifiers and unaffected actors, entities, fields, workflows, pages, and journeys, and return the complete revised interpretation.",
  "Do not repeat, rephrase, or progressively reveal additional questions after answers are supplied. Leave only a genuinely new safety-critical ambiguity open; use conventional product defaults for any remaining noncritical detail.",
  "Classify every open question using its narrow Factory category. Use experience.visual-style only for optional aesthetic direction; authorization, visibility, role, business-rule, data, and integration questions are never optional visual preferences.",
  "Every workflow must be internally consistent with the actors and permissions: each transition's from and to must be states declared in the same workflow, the transition's actor must be a declared actor, and that actor's permissions must grant the transition's event as an action on the workflow's entity.",
  "Transition events and permission grants may only use the bounded action vocabulary: create, read, update, delete, submit, approve, reject, confirm, reschedule, cancel, audit, manage — never invent a verb outside this vocabulary.",
  "Every enum-typed field must include its options as a list of at least two distinct business values; every reference-typed field must name an entity declared in the same blueprint.",
  "Never duplicate any key: actors, entities, fields, workflows, states, transitions, page intents, and journeys must each be unique.",
  "Keys that become graph symbols — the requirementId and every actor, entity, workflow, page-intent, and workflow-state key — must be lowercase kebab-case: lowercase letters, digits, and hyphens only, starting with a lowercase letter. Never use camelCase for these keys (for example expense-approval, not expenseApproval).",
  "Entity field keys use the opposite grammar: lowercase-first camelCase with letters, digits, and underscores only, and never a hyphen — for example submittedBy, never submitted-by. Do not apply the kebab-case rule to field keys.",
  "Identity is Factory-owned. Never declare an entity field with the exact key id; the runtime supplies record identity outside blueprint fields.",
  "Journey steps may only reference declared actors.",
  "The composed runtime rejects inconsistent flows, so never declare a transition, state, journey step, or actor that you do not fully grant.",
  "If a repair note is included, adjust the proposal to satisfy it exactly and return a complete, valid interpretation.",
].join(" ");

type OpenAIRequirementClient = {
  readonly responses: {
    create(
      body: Record<string, unknown>,
      options: {
        readonly signal: AbortSignal;
        readonly timeout: 180_000;
        readonly maxRetries: 0;
      },
    ): Promise<{ readonly output_text: string }>;
  };
};

export class OpenAIRequirementResponsesApiTransport implements OpenAIResponseTransport {
  private readonly createClient: (apiKey: string) => OpenAIRequirementClient;

  public constructor(
    options: {
      readonly createClient?: (apiKey: string) => OpenAIRequirementClient;
    } = {},
  ) {
    this.createClient =
      options.createClient ??
      ((apiKey) =>
        new OpenAI({ apiKey }) as unknown as OpenAIRequirementClient);
  }

  public async create(
    request: OpenAITransportRequest,
  ): Promise<{ outputText: string }> {
    if (
      request.signal === undefined ||
      request.timeout !== 180_000 ||
      request.maxRetries !== 0
    ) {
      throw new Error("Requirement transport policy is missing.");
    }
    const client = this.createClient(request.apiKey);
    const response = await client.responses.create(
      {
        model: request.model,
        instructions: request.instructions,
        input: request.input,
        store: request.store,
        text: {
          format: {
            type: "json_schema",
            name: "factory_requirement_interpretation",
            strict: request.strictJson,
            schema: request.jsonSchema,
          },
        },
      },
      {
        signal: request.signal,
        timeout: request.timeout,
        maxRetries: request.maxRetries,
      },
    );
    return { outputText: response.output_text };
  }
}

const PROVIDER_ROUND_TIMEOUT_MS = 180_000 as const;
const INTERPRETATION_TOTAL_TIMEOUT_MS = 540_000;
const MAX_REPAIR_ROUNDS = 2;
const FIXED_REPAIR_INSTRUCTION =
  "The previous interpretation was invalid. Return one complete interpretation that satisfies the required schema and semantic contract.";

class InterpretationAbort extends Error {}

function composeAbortSignals(signals: readonly AbortSignal[]): {
  readonly signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const listeners: Array<{
    readonly signal: AbortSignal;
    readonly listener: () => void;
  }> = [];
  const abort = (): void => {
    if (!controller.signal.aborted) controller.abort();
  };
  for (const signal of signals) {
    if (signal.aborted) {
      abort();
      break;
    }
    const listener = (): void => abort();
    signal.addEventListener("abort", listener, { once: true });
    listeners.push({ signal, listener });
  }
  return {
    signal: controller.signal,
    dispose: () => {
      for (const item of listeners) {
        item.signal.removeEventListener("abort", item.listener);
      }
    },
  };
}

async function withAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new InterpretationAbort();
  let listener: (() => void) | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        listener = () => reject(new InterpretationAbort());
        signal.addEventListener("abort", listener, { once: true });
      }),
    ]);
  } finally {
    if (listener !== undefined) signal.removeEventListener("abort", listener);
  }
}

function providerStatus(error: unknown): unknown {
  return typeof error === "object" && error !== null && "status" in error
    ? (error as { readonly status?: unknown }).status
    : undefined;
}

function isProviderTimeout(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name =
    "name" in error ? (error as { readonly name?: unknown }).name : undefined;
  const code =
    "code" in error ? (error as { readonly code?: unknown }).code : undefined;
  return (
    name === "AbortError" ||
    name === "APIConnectionTimeoutError" ||
    code === "ETIMEDOUT"
  );
}

function timeoutFailure(): RequirementInterpreterError {
  return new RequirementInterpreterError(
    "Requirement interpretation timed out.",
    "timeout",
  );
}

function outputFailure(): RequirementInterpreterError {
  return new RequirementInterpreterError(
    "Requirement interpretation output was invalid.",
    "output_invalid",
  );
}

function providerFailure(error: unknown): RequirementInterpreterError {
  const status = providerStatus(error);
  if (status === 400 || status === 401 || status === 403) {
    return new RequirementInterpreterError(
      "Requirement interpretation provider rejected the request.",
      "provider_rejected",
    );
  }
  return new RequirementInterpreterError(
    "Requirement interpretation provider is unavailable.",
    "provider_unavailable",
  );
}

export type OpenAIRequirementInterpreterOptions = {
  model?: string;
  transport?: OpenAIResponseTransport;
  /** Dependency injection is intentionally only for test environments. */
  readEnvironment?: () => string | undefined;
};

/**
 * OpenAI-first requirement interpreter. The model may normalize the brief
 * into bounded business semantics, but the returned spec and blueprint are
 * re-validated authoritatively, the blueprint checksum is always computed
 * from the validated spec (never accepted from the model), and every
 * failure — unsafe material, route/package/provider material, malformed
 * output, transport failures, a missing key — returns a bounded
 * RequirementInterpreterError. Nothing is persisted and no raw prompt,
 * response, or credential is ever returned.
 */
export class OpenAIRequirementInterpreterAdapter implements RequirementInterpreterAdapterV1 {
  private readonly model: string;
  private readonly transport: OpenAIResponseTransport;
  private readonly readEnvironment: () => string | undefined;

  public constructor(options: OpenAIRequirementInterpreterOptions = {}) {
    this.model = options.model ?? "gpt-5";
    this.transport =
      options.transport ?? new OpenAIRequirementResponsesApiTransport();
    this.readEnvironment =
      options.readEnvironment ?? (() => process.env.OPENAI_API_KEY);
  }

  public async interpret(input: {
    readonly brief: string;
    readonly answers: Readonly<Record<string, string>>;
    readonly clarificationContext?: readonly ClarificationAnswerContextV1[];
    readonly priorInterpretation?: RequirementInterpretationV1;
    readonly signal?: AbortSignal;
  }): Promise<RequirementInterpretationV1> {
    if (typeof input.brief !== "string" || input.brief.trim().length === 0) {
      throw new RequirementInterpreterError(
        "The requirement brief must be non-empty prose text.",
        "request_invalid",
      );
    }
    if (input.signal?.aborted) throw timeoutFailure();
    const apiKey = this.readEnvironment();
    if (!apiKey) {
      throw new RequirementInterpreterError(
        "No requirement interpretation provider is configured.",
        "provider_not_configured",
      );
    }
    const priorInterpretation =
      input.priorInterpretation === undefined
        ? undefined
        : assertRequirementInterpretation(input.priorInterpretation);

    // One invocation owns a hard total deadline. Each semantic call also owns
    // a round deadline; provider/network failures never enter the repair loop.
    // Schema and semantic repair uses one fixed instruction that cannot carry
    // parser, validator, candidate, provider, or abort material.
    const totalController = new AbortController();
    const totalTimer = setTimeout(
      () => totalController.abort(),
      INTERPRETATION_TOTAL_TIMEOUT_MS,
    );
    let repairNote: string | undefined;
    try {
      for (let round = 0; round <= MAX_REPAIR_ROUNDS; round += 1) {
        if (input.signal?.aborted || totalController.signal.aborted) {
          throw timeoutFailure();
        }
        const roundController = new AbortController();
        const roundTimer = setTimeout(
          () => roundController.abort(),
          PROVIDER_ROUND_TIMEOUT_MS,
        );
        const combined = composeAbortSignals([
          ...(input.signal === undefined ? [] : [input.signal]),
          totalController.signal,
          roundController.signal,
        ]);
        let outputText: string;
        try {
          const response = await withAbort(
            this.transport.create({
              apiKey,
              model: this.model,
              instructions: interpretationInstructions,
              input: JSON.stringify({
                brief: input.brief,
                answers: input.answers,
                clarificationContext: input.clarificationContext ?? [],
                ...(priorInterpretation === undefined
                  ? {}
                  : { priorInterpretation }),
                ...(repairNote === undefined ? {} : { repair: repairNote }),
              }),
              store: false,
              strictJson: true,
              jsonSchema: interpretationJsonSchema,
              signal: combined.signal,
              timeout: PROVIDER_ROUND_TIMEOUT_MS,
              maxRetries: 0,
            }),
            combined.signal,
          );
          outputText = response.outputText;
        } catch (error) {
          if (combined.signal.aborted || isProviderTimeout(error)) {
            throw timeoutFailure();
          }
          throw providerFailure(error);
        } finally {
          clearTimeout(roundTimer);
          combined.dispose();
        }

        if (input.signal?.aborted || totalController.signal.aborted) {
          throw timeoutFailure();
        }

        let candidate: ModelInterpretation;
        try {
          const parsed = JSON.parse(outputText) as unknown;
          candidate = parseStrict(modelInterpretationSchema, parsed);
        } catch {
          if (round >= MAX_REPAIR_ROUNDS) throw outputFailure();
          repairNote = FIXED_REPAIR_INSTRUCTION;
          continue;
        }

        const spec = reconcileClarificationAnswers(
          candidate.spec,
          input.answers,
          input.clarificationContext ?? [],
        );
        const clarifications = deriveClarifications(spec);
        if (
          (input.clarificationContext?.length ?? 0) > 0 &&
          clarifications.length > 0
        ) {
          if (round >= MAX_REPAIR_ROUNDS) throw outputFailure();
          repairNote = FIXED_REPAIR_INSTRUCTION;
          continue;
        }
        const blueprint = {
          ...candidate.blueprint,
          requirementChecksum: hashRequirementSpec(spec),
        };
        try {
          return assertRequirementInterpretation({
            spec,
            blueprint,
            clarifications,
          });
        } catch {
          if (round >= MAX_REPAIR_ROUNDS) throw outputFailure();
          repairNote = FIXED_REPAIR_INSTRUCTION;
        }
      }
      throw outputFailure();
    } finally {
      clearTimeout(totalTimer);
    }
  }
}
