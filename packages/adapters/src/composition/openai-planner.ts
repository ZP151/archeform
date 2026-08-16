import OpenAI from "openai";
import { z } from "zod";

import {
  assertCompositionPlan,
  canonicalEquals,
  capabilityKeySchema,
  identifierSchema,
  parseRequirementSpec,
  safeBusinessTextSchema,
  semanticVersionSchema,
  type RequirementSpecV1,
} from "@factory/graph";
import {
  planComposition,
  type CapabilityAssetV1,
} from "@factory/capabilities/node";

import {
  classifyOpenAITransportFailure,
  type OpenAIResponseTransport,
  type OpenAITransportRequest,
} from "../ai.js";
import {
  CompositionPlannerError,
  type CompositionPlannerInputV1,
  type CompositionPlannerOutcomeV1,
} from "./deterministic-planner.js";

/** Optional text fields arrive as `null` from strict JSON mode. */
function optionalText(schema: z.ZodType<string>) {
  return z.preprocess(
    (value) => (value === null ? undefined : value),
    schema.optional(),
  );
}

const namedItemSchema = z
  .object({
    key: identifierSchema,
    label: safeBusinessTextSchema.max(160),
    description: optionalText(safeBusinessTextSchema.max(1000)),
  })
  .strict();

/**
 * The model's requirement candidate: the full RequirementSpecV1 shape minus
 * nothing (a requirement carries no derived fields), with strict JSON-nullable
 * optionals. It is re-validated authoritatively by parseRequirementSpec.
 */
const modelRequirementSchema = z
  .object({
    apiVersion: z.literal("factory.requirement-spec/v1"),
    requirementId: identifierSchema,
    outcome: safeBusinessTextSchema,
    actors: z.array(namedItemSchema).min(1).max(30),
    domainConcepts: z.array(namedItemSchema).max(60),
    workflows: z.array(namedItemSchema).max(40),
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

/**
 * The model's plan candidate: only its choices — capability locks
 * (key and version, no digests), graph bindings, output slots, and bounded
 * business text. All derived fields (checksums, proposedOperations,
 * dependencyGraph, acceptanceJourneys, complexity) come from the
 * deterministic planner and are never accepted from the model.
 */
const modelPlanSchema = z
  .object({
    capabilityLocks: z
      .array(
        z
          .object({
            key: capabilityKeySchema,
            version: semanticVersionSchema,
          })
          .strict(),
      )
      .min(1)
      .max(50),
    graphBindings: z
      .array(
        z
          .object({
            capabilityKey: capabilityKeySchema,
            inputKey: identifierSchema,
            graphSymbol: z
              .string()
              .regex(
                /^graph\.(domain\.[a-z][a-z0-9-]*(\.[a-zA-Z0-9_]+)?|page\.[a-z][a-z0-9-]*|policy\.[a-z][a-z0-9-]*|flow\.[a-z][a-z0-9-]*)$/,
              ),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    outputSlots: z
      .array(
        z
          .object({
            capabilityKey: capabilityKeySchema,
            slot: identifierSchema,
            surface: z.enum([
              "web",
              "api",
              "database",
              "policy",
              "flow",
              "test",
              "documentation",
            ]),
          })
          .strict(),
      )
      .max(200),
    compatibility: z
      .object({
        result: z.enum(["compatible", "conflict"]),
        reasons: z.array(safeBusinessTextSchema.max(500)).max(30),
      })
      .strict(),
    risks: z
      .array(
        z
          .object({
            key: identifierSchema,
            level: z.enum(["low", "medium", "high"]),
            description: safeBusinessTextSchema.max(500),
          })
          .strict(),
      )
      .max(20),
    assumptions: z.array(safeBusinessTextSchema.max(500)).max(20),
    explanation: safeBusinessTextSchema.max(2000),
  })
  .strict();

const modelProposalSchema = z
  .object({
    requirement: modelRequirementSchema,
    plan: modelPlanSchema,
  })
  .strict();

type ModelProposal = z.infer<typeof modelProposalSchema>;

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

const compositionPlannerJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["requirement", "plan"],
  properties: {
    requirement: {
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
        apiVersion: {
          type: "string",
          const: "factory.requirement-spec/v1",
        },
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
    plan: {
      type: "object",
      additionalProperties: false,
      required: [
        "capabilityLocks",
        "graphBindings",
        "outputSlots",
        "compatibility",
        "risks",
        "assumptions",
        "explanation",
      ],
      properties: {
        capabilityLocks: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "version"],
            properties: {
              key: {
                type: "string",
                pattern: "^[a-z][a-z0-9-]*(\\.[a-z0-9-]+)*$",
              },
              version: {
                type: "string",
                pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$",
              },
            },
          },
        },
        graphBindings: {
          type: "array",
          minItems: 1,
          maxItems: 200,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["capabilityKey", "inputKey", "graphSymbol"],
            properties: {
              capabilityKey: {
                type: "string",
                pattern: "^[a-z][a-z0-9-]*(\\.[a-z0-9-]+)*$",
              },
              inputKey: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              graphSymbol: {
                type: "string",
                pattern: "^graph\\.[a-z.0-9_-]+$",
              },
            },
          },
        },
        outputSlots: {
          type: "array",
          maxItems: 200,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["capabilityKey", "slot", "surface"],
            properties: {
              capabilityKey: {
                type: "string",
                pattern: "^[a-z][a-z0-9-]*(\\.[a-z0-9-]+)*$",
              },
              slot: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              surface: {
                type: "string",
                enum: [
                  "web",
                  "api",
                  "database",
                  "policy",
                  "flow",
                  "test",
                  "documentation",
                ],
              },
            },
          },
        },
        compatibility: {
          type: "object",
          additionalProperties: false,
          required: ["result", "reasons"],
          properties: {
            result: { type: "string", enum: ["compatible", "conflict"] },
            reasons: {
              type: "array",
              maxItems: 30,
              items: { type: "string", minLength: 1, maxLength: 500 },
            },
          },
        },
        risks: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "level", "description"],
            properties: {
              key: { type: "string", pattern: "^[a-z][a-zA-Z0-9-]*$" },
              level: { type: "string", enum: ["low", "medium", "high"] },
              description: { type: "string", minLength: 1, maxLength: 500 },
            },
          },
        },
        assumptions: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1, maxLength: 500 },
        },
        explanation: { type: "string", minLength: 1, maxLength: 2000 },
      },
    },
  },
};

const compositionPlannerInstructions = [
  "You are the Factory Pilot constrained composition planning adapter.",
  "Return only a JSON object matching the provided schema.",
  "Normalize the brief into a factory.requirement-spec/v1 requirement. Clarify or refine wording, but never invent actors, entities, workflows, or acceptance scenarios that the brief does not imply.",
  "For the plan, declare capability locks (key and version only), graph bindings, output slots, and bounded business text.",
  "Never include derived plan fields: no requirementChecksum, draftBaseChecksum, manifestDigest, proposedOperations, dependencyGraph, acceptanceJourneys, or complexity.",
  "Never propose package names, filesystem paths, URLs, executable code, credentials, or arbitrary Graph operations.",
  "Business text must not contain URLs, absolute or Windows paths, traversal segments, or prototype-key material.",
  "The plan is validated against deterministic resolution and only applied to a mutable Draft.",
].join(" ");

export type OpenAIConstrainedCompositionPlannerOptions = {
  model?: string;
  transport?: OpenAIResponseTransport;
  /** Dependency injection is intentionally only for test environments. */
  readEnvironment?: () => string | undefined;
};

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
          name: "factory_composition_plan_proposal",
          strict: request.strictJson,
          schema: request.jsonSchema,
        },
      },
    });
    return { outputText: response.output_text };
  }
}

/**
 * OpenAI-first constrained composition planner. The model may normalize the
 * requirement and phrase bounded plan text, but every authoritative part of
 * the plan (locks, bindings, slots, operations, checksums, complexity) must
 * equal the deterministic planner's resolution over the approved assets; any
 * divergence, unknown version, unsafe material, or transport failure returns
 * a bounded CompositionPlannerError. Nothing is persisted and no raw prompt,
 * response, or credential is ever returned.
 */
export class OpenAIConstrainedCompositionPlannerAdapter {
  private readonly model: string;
  private readonly transport: OpenAIResponseTransport;
  private readonly readEnvironment: () => string | undefined;

  public constructor(options: OpenAIConstrainedCompositionPlannerOptions = {}) {
    this.model = options.model ?? "gpt-5";
    this.transport = options.transport ?? new OpenAIResponsesApiTransport();
    this.readEnvironment =
      options.readEnvironment ?? (() => process.env.OPENAI_API_KEY);
  }

  public async propose(
    input: CompositionPlannerInputV1,
  ): Promise<CompositionPlannerOutcomeV1> {
    if (typeof input.brief !== "string") {
      throw new CompositionPlannerError(
        "The composition brief must be prose text for the model.",
        "brief_invalid",
      );
    }
    const apiKey = this.readEnvironment();
    if (!apiKey) {
      throw new CompositionPlannerError(
        "OPENAI_API_KEY must be set in the local process environment.",
        "configuration_missing",
      );
    }

    let outputText: string;
    try {
      const response = await this.transport.create({
        apiKey,
        model: this.model,
        instructions: compositionPlannerInstructions,
        input: JSON.stringify({
          brief: input.brief,
          graph: input.baseDraft.graph,
        }),
        store: false,
        strictJson: true,
        jsonSchema: compositionPlannerJsonSchema,
      });
      outputText = response.outputText;
    } catch (error) {
      // Never surface a provider response: upstream errors can carry request
      // context, which is intentionally not an application artifact.
      throw new CompositionPlannerError(
        "OpenAI composition planning request failed.",
        classifyOpenAITransportFailure(error),
      );
    }

    let modelProposal: ModelProposal;
    try {
      modelProposal = modelProposalSchema.parse(JSON.parse(outputText));
    } catch {
      throw new CompositionPlannerError(
        "The model output is not a schema-valid composition proposal.",
        "proposal_invalid",
      );
    }

    // The authoritative requirement parse: strict keys, unique keys, and the
    // unsafe-material boundary for every text field.
    let requirement: RequirementSpecV1;
    try {
      requirement = parseRequirementSpec(modelProposal.requirement);
    } catch {
      throw new CompositionPlannerError(
        "The model requirement failed Factory requirement validation.",
        "proposal_invalid",
      );
    }

    // The deterministic planner is the authority: if it cannot resolve the
    // model's requirement, the model cannot invent a plan either.
    const reference = planComposition(
      requirement,
      input.catalog,
      input.baseDraft,
      input.repositoryRoot,
      input.approvedAssets,
    );
    if (reference.kind === "clarification") {
      return { kind: "clarification", clarification: reference.clarification };
    }
    const referencePlan = reference.plan;

    // Every lock version the model names must be an approved asset version.
    const approved = new Map<string, CapabilityAssetV1>();
    for (const asset of input.approvedAssets) {
      approved.set(`${asset.manifest.key}@${asset.manifest.version}`, asset);
    }
    for (const lock of modelProposal.plan.capabilityLocks) {
      if (!approved.has(`${lock.key}@${lock.version}`)) {
        throw new CompositionPlannerError(
          `The model selected capability '${lock.key}@${lock.version}' that is not an approved asset.`,
          "proposal_invalid",
        );
      }
    }

    // The model's choices must equal deterministic resolution exactly.
    const sameLocks = canonicalEquals(
      modelProposal.plan.capabilityLocks,
      referencePlan.capabilityLocks.map(({ key, version }) => ({
        key,
        version,
      })),
    );
    const sameBindings = canonicalEquals(
      modelProposal.plan.graphBindings,
      referencePlan.graphBindings,
    );
    const sameSlots = canonicalEquals(
      modelProposal.plan.outputSlots,
      referencePlan.outputSlots,
    );
    if (!sameLocks || !sameBindings || !sameSlots) {
      throw new CompositionPlannerError(
        "The model plan diverges from deterministic resolution.",
        "proposal_invalid",
      );
    }

    // Assemble the final plan: the deterministic plan carries every derived
    // field; the model contributes only its parsed, safe business text. The
    // full schema gate (including the operation-value scan) runs last.
    const plan = {
      ...referencePlan,
      compatibility: modelProposal.plan.compatibility,
      risks: modelProposal.plan.risks,
      assumptions: modelProposal.plan.assumptions,
      explanation: modelProposal.plan.explanation,
    };
    try {
      assertCompositionPlan(plan);
    } catch {
      throw new CompositionPlannerError(
        "The assembled composition plan failed Factory validation.",
        "proposal_invalid",
      );
    }
    return { kind: "proposal", requirement, plan };
  }
}
