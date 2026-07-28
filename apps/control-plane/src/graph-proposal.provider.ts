import {
  OpenAIGraphProposalProvider,
  type GraphProposalProvider,
} from "@factory/adapters/ai";

export const GRAPH_PROPOSAL_PROVIDER = Symbol("GRAPH_PROPOSAL_PROVIDER");

export type FactoryGraphProposalProvider = GraphProposalProvider;

export function createGraphProposalProvider(): FactoryGraphProposalProvider {
  return new OpenAIGraphProposalProvider();
}
