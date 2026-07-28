import OpenAI from "openai";
import { z } from "zod";

import {
  applyGraphDiffToDraft,
  createDraftRevision,
  graphDiffSchema,
  parseApplicationGraph,
  type ApplicationGraphV1,
  type GraphDiffV1,
} from "@factory/graph";

const impactSchema = z.object({
  summary: z.string().min(1).max(2_000),
  affectedModels: z.array(z.enum(["metadata", "page", "domain", "policy", "flow", "integration", "experience"])).max(7),
  risks: z.array(z.string().min(1).max(500)).max(20),
});

const testSuggestionSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(500),
  type: z.enum(["unit", "api", "flow", "journey", "smoke"]),
});

const proposalPayloadSchema = z.object({
  diff: graphDiffSchema,
  impact: impactSchema,
  testSuggestions: z.array(testSuggestionSchema).max(25),
});

export type GraphProposal = z.infer<typeof proposalPayloadSchema>;

export type GraphProposalRequest = {
  /** The current Graph stays in memory for the lifetime of this request only. */
  graph: ApplicationGraphV1;
  /** A user-entered request; adapters must never store or log it. */
  brief: string;
};

export interface GraphProposalProvider {
  propose(request: GraphProposalRequest): Promise<GraphProposal>;
}

export class GraphProposalError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GraphProposalError";
  }
}

export type OpenAITransportRequest = {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  store: false;
  strictJson: true;
  jsonSchema: Record<string, unknown>;
};

/**
 * Deliberately narrow transport seam: it allows deterministic test fixtures
 * while the production adapter remains OpenAI Responses API first.
 */
export interface OpenAIResponseTransport {
  create(request: OpenAITransportRequest): Promise<{ outputText: string }>;
}

const graphProposalJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["diff", "impact", "testSuggestions"],
  properties: {
    diff: {
      type: "object",
      additionalProperties: false,
      required: ["apiVersion", "operations"],
      properties: {
        apiVersion: { const: "factory.graph-diff/v1" },
        baseGraphHash: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
        operations: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["op", "path"],
            properties: {
              op: { enum: ["add", "replace", "remove"] },
              path: { type: "string", pattern: "^/" },
              value: {},
            },
          },
        },
      },
    },
    impact: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "affectedModels", "risks"],
      properties: {
        summary: { type: "string" },
        affectedModels: {
          type: "array",
          items: { enum: ["metadata", "page", "domain", "policy", "flow", "integration", "experience"] },
        },
        risks: { type: "array", items: { type: "string" } },
      },
    },
    testSuggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "type"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          type: { enum: ["unit", "api", "flow", "journey", "smoke"] },
        },
      },
    },
  },
};

const proposalInstructions = [
  "You are the Factory Pilot Application Graph proposal adapter.",
  "Return only a JSON object matching the provided schema.",
  "Propose a narrowly scoped factory.graph-diff/v1. Never modify metadata.id or metadata.workspaceId.",
  "Do not propose package names, filesystem paths, URLs, executable code, credentials, or arbitrary runtime configuration.",
  "The Graph Diff will be applied only to a mutable Draft and independently validated.",
].join(" ");

class OpenAIResponsesApiTransport implements OpenAIResponseTransport {
  public async create(request: OpenAITransportRequest): Promise<{ outputText: string }> {
    // The API key exists only in this invocation's stack frame. The OpenAI SDK and
    // this adapter are configured not to persist the response remotely or locally.
    const client = new OpenAI({ apiKey: request.apiKey });
    const response = await client.responses.create({
      model: request.model,
      instructions: request.instructions,
      input: request.input,
      store: request.store,
      text: {
        format: {
          type: "json_schema",
          name: "factory_graph_diff_proposal",
          strict: request.strictJson,
          schema: request.jsonSchema,
        },
      },
    });
    return { outputText: response.output_text };
  }
}

export type OpenAIGraphProposalProviderOptions = {
  model?: string;
  transport?: OpenAIResponseTransport;
  /** Dependency injection is intentionally only for test environments. */
  readEnvironment?: () => string | undefined;
};

/**
 * OpenAI-first adapter that owns no persistence. Control Plane code decides if a
 * validated proposal becomes a Draft revision; this adapter returns no raw model
 * output, raw brief, or credential.
 */
export class OpenAIGraphProposalProvider implements GraphProposalProvider {
  private readonly model: string;
  private readonly transport: OpenAIResponseTransport;
  private readonly readEnvironment: () => string | undefined;

  public constructor(options: OpenAIGraphProposalProviderOptions = {}) {
    this.model = options.model ?? "gpt-5";
    this.transport = options.transport ?? new OpenAIResponsesApiTransport();
    this.readEnvironment = options.readEnvironment ?? (() => process.env.OPENAI_API_KEY);
  }

  public async propose(request: GraphProposalRequest): Promise<GraphProposal> {
    const graph = parseApplicationGraph(request.graph);
    const apiKey = this.readEnvironment();
    if (!apiKey) throw new GraphProposalError("OPENAI_API_KEY must be set in the local process environment.");

    let outputText: string;
    try {
      const response = await this.transport.create({
        apiKey,
        model: this.model,
        instructions: proposalInstructions,
        input: JSON.stringify({ brief: request.brief, graph }),
        store: false,
        strictJson: true,
        jsonSchema: graphProposalJsonSchema,
      });
      outputText = response.outputText;
    } catch {
      // Do not surface a provider response: upstream errors can include request
      // context, which is intentionally not an application artifact.
      throw new GraphProposalError("OpenAI Graph proposal request failed.");
    }

    return validateProposal(graph, outputText);
  }
}

/** A deterministic provider for CI, local development, and editor fixtures. */
export class FixtureGraphProposalProvider implements GraphProposalProvider {
  public constructor(private readonly fixture: GraphProposal) {}

  public async propose(request: GraphProposalRequest): Promise<GraphProposal> {
    const graph = parseApplicationGraph(request.graph);
    return validateProposal(graph, this.fixture);
  }
}

function validateProposal(graph: ApplicationGraphV1, candidate: unknown): GraphProposal {
  try {
    const proposal = typeof candidate === "string" ? proposalPayloadSchema.parse(JSON.parse(candidate)) : proposalPayloadSchema.parse(candidate);
    // This performs base-hash, path boundary, schema, and cross-model semantic
    // validation without retaining the resulting Draft or any model text.
    applyGraphDiffToDraft(createDraftRevision(graph, "proposal-validation"), proposal.diff);
    return proposal;
  } catch {
    throw new GraphProposalError("AI proposal failed Factory Application Graph validation.");
  }
}

export type { GraphDiffV1 };
