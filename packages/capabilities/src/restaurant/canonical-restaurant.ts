import {
  assertExperienceBrief,
  assertProductIntent,
  createDraftRevision,
  type ApplicationGraphV3,
  type ExperienceBriefV1,
  type ProductIntentV1,
} from "@factory/graph";

import { composeDefaultCapabilityDraft } from "../index.js";
import { composeRestaurantProductGraph } from "./product-graph.js";

const requirementChecksum =
  "sha256:4cafea9d0a83bd84d27e4b29c6694af0456b7bc88758106276db18e23fbe7749";

/**
 * The standard fine-dining Restaurant product intent. This is the accepted
 * product-level input, not a test artifact; the compiler derives its canonical
 * authority from the profile composition over this input.
 */
export function restaurantOrderingProductIntent(): ProductIntentV1 {
  return assertProductIntent({
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
}

/**
 * The standard fine-dining Restaurant experience brief.
 */
export function restaurantOrderingExperienceBrief(): ExperienceBriefV1 {
  return assertExperienceBrief({
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
}

export type CanonicalRestaurantAuthorityV1 = {
  readonly roles: ApplicationGraphV3["policy"]["roles"];
  readonly permissions: ApplicationGraphV3["policy"]["permissions"];
  readonly flows: ApplicationGraphV3["flow"]["flows"];
  readonly journeys: ApplicationGraphV3["journeys"];
};

let cachedAuthority: CanonicalRestaurantAuthorityV1 | null = null;

/**
 * Composes the canonical Restaurant V3 Graph once and returns its authority
 * (roles, permissions, flows, and journeys). The result is deterministic for
 * the accepted profile and standard product input, so the compiler can restore
 * these locations during permission/actor-admission normalization without
 * depending on a test fixture.
 */
export function getCanonicalRestaurantAuthority(): CanonicalRestaurantAuthorityV1 {
  if (cachedAuthority) return cachedAuthority;
  const intent = restaurantOrderingProductIntent();
  const experience = restaurantOrderingExperienceBrief();
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
  cachedAuthority = Object.freeze({
    roles: graph.policy.roles,
    permissions: graph.policy.permissions,
    flows: graph.flow.flows,
    journeys: graph.journeys,
  });
  return cachedAuthority;
}
