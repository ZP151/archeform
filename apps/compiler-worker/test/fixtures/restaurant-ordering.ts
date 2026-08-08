import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import type { PublishedGraphInput } from "@factory/compiler";
import { hashApplicationGraph } from "@factory/graph";

import {
  restaurantVerifierDemoToken,
  restaurantVerifierMenuItemPrice,
} from "../../src/verifier/verification-profiles.js";

/**
 * The deterministic Restaurant Ordering acceptance profile for Task 6
 * Batch 2. The generated application is role-header bound (`x-factory-role`)
 * and command-idempotent (`x-factory-idempotency-key` / session tokens travel
 * as headers). Its database seed requires a location, a table, and a
 * menu item (the rendered seed fails closed without them), plus the demo
 * table-session record whose token digest the seed derives from
 * `RESTAURANT_DEMO_TABLE_TOKEN` at boot; the merchant E2E fixtures
 * (fixed ids, digests derived from the same demo token) are rendered by the
 * seed itself and are the static vehicles for the merchant journeys.
 *
 * The fixture replaces the composed draft's seed set with exactly the
 * records the worker profile resolves against: the demo session, the seeded
 * catalog, and the menu item whose price is the declared payment amount.
 * The demo token and price are the worker profile's authored fixture
 * constants — the seed digests derive from the token at boot, so every
 * journey is replayable from a clean boot.
 *
 * The fixture is a pure function of the profile name: same input, same
 * graph, same lock, same digest. It is consumed by the worker integration
 * tests and the Docker-backed acceptance command.
 */

export const restaurantOrderingProfileKey = "restaurant-ordering";
export const restaurantOrderingPublishedRevisionId =
  "published-restaurant-ordering-1";

export function restaurantOrderingCompilation(): PublishedGraphInput {
  const draft = composeDefaultCapabilityDraft({
    profile: restaurantOrderingProfileKey,
  }).graph;
  const selections = draft.integration.compositionSelections;
  const graph = structuredClone(draft);
  delete graph.integration.compositionSelections;
  graph.domain.seedData = [
    {
      entity: "restaurant-location",
      id: "main-location",
      values: { name: "Main restaurant", currency: "USD", active: true },
    },
    {
      entity: "restaurant-table",
      id: "table-12",
      values: { code: "T12", number: 12, status: "open", active: true },
    },
    {
      entity: "menu-item",
      id: "margherita-pizza",
      values: {
        categoryKey: "mains",
        name: "Margherita pizza",
        description: "Tomato, mozzarella, and basil",
        price: restaurantVerifierMenuItemPrice,
        available: true,
        stock: 10,
        preparationMinutes: 12,
        imageUrl: "/menu/margherita-pizza.jpg",
      },
    },
    {
      entity: "table-session",
      // The rendered seed derives the demo session id from the table seed.
      id: "table-12-demo-session",
      values: {
        tableCode: "T12",
        // Placeholder: the seed overwrites tokenDigest, status, and expiry
        // with the digest derived from RESTAURANT_DEMO_TABLE_TOKEN at boot.
        tokenDigest: "verifier-fixture-placeholder",
        status: "active",
        openedAt: "2026-08-01T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        guestCount: 2,
      },
    },
  ];
  return {
    publishedRevisionId: restaurantOrderingPublishedRevisionId,
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}

/** The declared demo token; the acceptance command must set it verbatim. */
export { restaurantVerifierDemoToken };
