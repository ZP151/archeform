import {
  OpenAIGraphProposalProvider,
  type GraphProposalProvider,
} from "@factory/adapters/ai";

export const GRAPH_PROPOSAL_PROVIDER = Symbol("GRAPH_PROPOSAL_PROVIDER");

export type FactoryGraphProposalProvider = GraphProposalProvider;

export function resolveOpenAIModel(environment: Record<string, string | undefined> = process.env): string {
  return environment.OPENAI_MODEL?.trim() || "gpt-5";
}

export function createGraphProposalProvider(): FactoryGraphProposalProvider {
  return new OpenAIGraphProposalProvider({ model: resolveOpenAIModel() });
}
