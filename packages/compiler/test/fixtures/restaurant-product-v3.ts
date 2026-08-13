import {
  assertExperienceBrief,
  assertProductIntent,
  createDraftRevision,
  hashApplicationGraphV3,
  type PublishedApplicationGraphV3Input,
} from "@factory/graph";
import {
  composeDefaultCapabilityDraft,
  composeRestaurantProductGraph,
  createCapabilityCompositionLock,
} from "@factory/capabilities";

export function restaurantProductV3Fixture() {
  const requirementChecksum =
    "sha256:4cafea9d0a83bd84d27e4b29c6694af0456b7bc88758106276db18e23fbe7749";
  const intent = assertProductIntent({
    apiVersion: "factory.product-intent/v1",
    requirementChecksum,
    productType: "restaurant-ordering",
    title: "Maison Aurelia private dining",
    businessOutcome:
      "Guests place table orders while restaurant staff manage service safely.",
    actors: [
      {
        key: "customer",
        label: "Guest",
        goals: ["Discover dishes and place a table order."],
      },
      {
        key: "cashier",
        label: "Cashier",
        goals: ["Collect simulated payment and serve orders."],
      },
      {
        key: "kitchen",
        label: "Kitchen",
        goals: ["Prepare accepted orders in priority order."],
      },
      {
        key: "manager",
        label: "Manager",
        goals: ["Manage menu, tables, users, settings, and exceptions."],
      },
    ],
    coreJourneys: [
      "customer-place-order",
      "manager-cancel-submitted-order",
      "manager-cancel-paid-order",
      "manager-table-session",
      "manager-expire-open-table-session",
      "manager-expire-active-table-session",
      "manager-adjust-inventory",
    ].map((key) => ({
      key,
      actorKey: key.startsWith("customer") ? "customer" : "manager",
      outcome: `Complete ${key}.`,
      critical: true,
    })),
    constraints: {
      regulatedData: false,
      externalSideEffects: false,
      moneyMovement: "simulated",
    },
  });
  const experience = assertExperienceBrief({
    apiVersion: "factory.experience-brief/v1",
    requirementChecksum,
    surfaces: [
      {
        key: "customer-mobile",
        device: "mobile",
        audience: ["customer"],
        navigation: "bottom-tabs",
        density: "comfortable",
      },
      {
        key: "merchant-desktop",
        device: "desktop",
        audience: ["cashier", "kitchen", "manager"],
        navigation: "sidebar",
        density: "compact",
      },
    ],
    brand: {
      qualities: ["refined", "warm", "private"],
      contrast: "balanced",
      imagery: "image-led",
    },
    theme: { defaultMode: "light", supportsDark: true },
    responsiveTargets: ["mobile", "tablet", "desktop"],
  });
  const base = composeDefaultCapabilityDraft({
    profile: "restaurant-ordering",
  });
  const baseDraft = createDraftRevision(
    base.graph,
    "restaurant-ordering-draft",
  );
  const graph = composeRestaurantProductGraph({
    intent,
    experience,
    baseDraft,
  });
  const graphHash = hashApplicationGraphV3(graph);
  const publishedGraph: PublishedApplicationGraphV3Input = {
    kind: "published-application-graph",
    status: "published",
    graphVersion: "factory.application-graph/v3",
    revisionId: "restaurant-product-v3-published-1",
    revisionNumber: 1,
    graphHash,
    graph,
  };
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: graphHash,
    selections: base.graph.integration.compositionSelections ?? [],
  });
  return {
    intent,
    experience,
    baseDraft,
    graph,
    graphHash,
    publishedGraph,
    compositionLock,
  };
}
