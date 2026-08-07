import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import type { PublishedGraphInput } from "@factory/compiler";
import { hashApplicationGraph } from "@factory/graph";

/**
 * The deterministic acceptance profile for Task 6: the Expense Approval
 * composition. The generated application is session-bound (the composition
 * requires `core.identity-policy`, whose `local-fixture-sessions` contribution
 * makes the API resolve principals from `x-factory-fixture-session` and deny
 * 403 without one) and authorizes declared resource/action pairs before any
 * record lookup.
 *
 * The composed draft declares no seed records, so this fixture adds exactly
 * one deterministic record (`expense-fixture-01` in the flow's initialState
 * `draft`); the generated app's migrate service seeds it at boot, which makes
 * every journey replayable from a clean boot.
 *
 * The fixture is a pure function of the profile name: same input, same
 * graph, same lock, same digest. It is consumed by the worker integration
 * tests and the Docker-backed acceptance command.
 */

export const acceptanceProfileKey = "expense-approval";
export const acceptancePublishedRevisionId = "published-expense-approval-1";

export function acceptanceCompilation(): PublishedGraphInput {
  const draft = composeDefaultCapabilityDraft({
    profile: acceptanceProfileKey,
  }).graph;
  const selections = draft.integration.compositionSelections;
  const graph = structuredClone(draft);
  delete graph.integration.compositionSelections;
  graph.domain.seedData = [
    {
      entity: "expense",
      id: "expense-fixture-01",
      values: { amount: "125.50", description: "Team lunch", status: "draft" },
    },
  ];
  return {
    publishedRevisionId: acceptancePublishedRevisionId,
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}

/** The immutable artifact manifest the acceptance compilation records. */
export function acceptanceManifest(): readonly {
  readonly path: string;
  readonly digest: string;
  readonly sizeBytes: number;
}[] {
  return [
    {
      path: "docker-compose.yml",
      digest:
        "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      sizeBytes: 512,
    },
    {
      path: "api/package.json",
      digest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sizeBytes: 1024,
    },
  ];
}
