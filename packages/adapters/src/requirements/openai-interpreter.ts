import OpenAI from "openai";
import { z } from "zod";

import {
  blueprintActionSchema,
  blueprintFieldTypeSchema,
  hashRequirementSpec,
  identifierSchema,
  pageIntentSchema,
  parseStrict,
  safeBusinessTextSchema,
} from "@factory/graph";

import {
  classifyOpenAITransportFailure,
  type OpenAIResponseTransport,
  type OpenAITransportRequest,
} from "../ai.js";
import {
  RequirementInterpreterError,
  assertRequirementInterpretation,
  deriveClarifications,
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
    requirementId: identifierSchema,
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

const modelFieldSchema = z
  .object({
    key: identifierSchema,
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

const modelEntitySchema = z
  .object({
    key: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    description: optionalText(safeBusinessTextSchema.max(500)),
    fields: z.array(modelFieldSchema).min(1).max(60),
  })
  .strict();

const modelActorSchema = z
  .object({
    key: identifierSchema,
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
    key: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    intent: pageIntentSchema,
    entityKey: optionalText(identifierSchema),
  })
  .strict();

const modelStateSchema = z
  .object({
    key: identifierSchema,
    label: safeBusinessTextSchema.max(160),
  })
  .strict();

const modelTransitionSchema = z
  .object({
    key: identifierSchema,
    from: identifierSchema,
    to: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    actorKey: identifierSchema,
  })
  .strict();

const modelWorkflowSchema = z
  .object({
    key: identifierSchema,
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
      key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
        requirementId: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
            required: ["question", "answer"],
            properties: {
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
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
                    key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
                    key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
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
  "The blueprint proposes business semantics only: actors with entity permissions, entities with typed fields, page intents from the approved enum, workflows with states and transitions, and acceptance journeys.",
  "Never propose routes, URLs, paths, capability or package selections, source, code, providers, or credentials.",
  "Business text must not contain URLs, absolute or Windows paths, traversal segments, or prototype-key material.",
  "Do not invent actors, entities, workflows, or acceptance scenarios the brief does not imply.",
  "If the brief is ambiguous, leave an open question in the spec instead of guessing.",
].join(" ");

class OpenAIResponsesApiTransport implements OpenAIResponseTransport {
  public async create(
    request: OpenAITransportRequest,
  ): Promise<{ outputText: string }> {
    // The API key exists only in this invocation's stack frame. The OpenAI SDK
    // and this adapter are configured not to persist the response remotely or
    // locally.
    const client = new OpenAI({ apiKey: request.apiKey });
    const response = await client.responses.create({
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
    });
    return { outputText: response.output_text };
  }
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
    this.transport = options.transport ?? new OpenAIResponsesApiTransport();
    this.readEnvironment =
      options.readEnvironment ?? (() => process.env.OPENAI_API_KEY);
  }

  public async interpret(input: {
    readonly brief: string;
    readonly answers: Readonly<Record<string, string>>;
  }): Promise<RequirementInterpretationV1> {
    if (typeof input.brief !== "string" || input.brief.trim().length === 0) {
      throw new RequirementInterpreterError(
        "The requirement brief must be non-empty prose text.",
        "brief_invalid",
      );
    }
    const apiKey = this.readEnvironment();
    if (!apiKey) {
      throw new RequirementInterpreterError(
        "OPENAI_API_KEY must be set in the local process environment.",
        "configuration_missing",
      );
    }

    let outputText: string;
    try {
      const response = await this.transport.create({
        apiKey,
        model: this.model,
        instructions: interpretationInstructions,
        input: JSON.stringify({
          brief: input.brief,
          answers: input.answers,
        }),
        store: false,
        strictJson: true,
        jsonSchema: interpretationJsonSchema,
      });
      outputText = response.outputText;
    } catch (error) {
      // Never surface a provider response: upstream errors can carry request
      // context, which is intentionally not an application artifact.
      const code = classifyOpenAITransportFailure(error);
      throw new RequirementInterpreterError(
        "OpenAI requirement interpretation request failed.",
        code === "proposal_invalid" ? "provider_request_failed" : code,
      );
    }

    let candidate: ModelInterpretation;
    try {
      const parsed = JSON.parse(outputText) as unknown;
      candidate = parseStrict(modelInterpretationSchema, parsed);
    } catch (error) {
      if (error instanceof RequirementInterpreterError) throw error;
      throw new RequirementInterpreterError(
        "OpenAI requirement interpretation candidate is invalid.",
      );
    }

    const spec = candidate.spec;
    // The checksum is always computed from the validated spec; the model can
    // never bind the blueprint to a different requirement.
    const blueprint = {
      ...candidate.blueprint,
      requirementChecksum: hashRequirementSpec(spec),
    };
    return assertRequirementInterpretation({
      spec,
      blueprint,
      clarifications: deriveClarifications(spec),
    });
  }
}
