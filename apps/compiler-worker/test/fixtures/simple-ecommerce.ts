import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import type { PublishedGraphInput } from "@factory/compiler";
import { hashApplicationGraph } from "@factory/graph";

/**
 * The deterministic Simple Ecommerce acceptance profile for Task 6 Batch 2.
 * The generated application is session-bound (`core.identity-policy` fixture
 * sessions `fixture-session-shopper` / `fixture-session-merchant`) and
 * dispatches order transitions strictly by the declared flow events
 * (submit/pay/fulfil/cancel).
 *
 * The composed draft's catalog seed is replaced by exactly the fixture set
 * the worker profile resolves against: one seeded catalog product
 * (`everyday-tote` for the catalog read journey) and one order record in the
 * flow's initialState `cart` at version 0, so every journey is replayable
 * from a clean boot. The generated app's migrate service seeds them at boot.
 *
 * The fixture is a pure function of the profile name: same input, same
 * graph, same lock, same digest. It is consumed by the worker integration
 * tests and the Docker-backed acceptance command.
 */

export const simpleEcommerceProfileKey = "simple-ecommerce";
export const simpleEcommercePublishedRevisionId =
  "published-simple-ecommerce-1";

export function simpleEcommerceCompilation(): PublishedGraphInput {
  const draft = composeDefaultCapabilityDraft({
    profile: simpleEcommerceProfileKey,
  }).graph;
  const selections = draft.integration.compositionSelections;
  const graph = structuredClone(draft);
  delete graph.integration.compositionSelections;
  graph.domain.seedData = [
    {
      entity: "product",
      id: "everyday-tote",
      values: { name: "Everyday tote", price: 48, stock: 20 },
    },
    {
      entity: "order",
      id: "order-fixture-01",
      values: { status: "cart", version: 0 },
    },
  ];
  return {
    publishedRevisionId: simpleEcommercePublishedRevisionId,
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}
