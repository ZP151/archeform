import type { FactoryProfile } from "./assets/index.js";

export type ProfileCoverageStatusV1 =
  "available" | "partial" | "planned" | "provider-required";

export interface ProfileCoverageItemV1 {
  readonly apiVersion: "factory.profile-coverage/v1";
  readonly key: string;
  readonly label: string;
  readonly status: ProfileCoverageStatusV1;
  readonly packageKeys: readonly string[];
  readonly profiles: readonly FactoryProfile[];
}

type ProfileCoverageDefinition = Omit<ProfileCoverageItemV1, "apiVersion">;

const allProfiles = Object.freeze([
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const satisfies readonly FactoryProfile[]);

const commerceProfiles = Object.freeze([
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const satisfies readonly FactoryProfile[]);

const profileCoverageDefinitions = Object.freeze([
  {
    key: "operations.table-session",
    label: "Table operations",
    status: "partial",
    packageKeys: ["restaurant.table-session"],
    profiles: ["restaurant-ordering"],
  },
  {
    key: "commerce.catalog-experience",
    label: "Catalog experience",
    status: "partial",
    packageKeys: ["commerce.catalog", "commerce.line-configuration"],
    profiles: commerceProfiles,
  },
  {
    key: "commerce.order-operations",
    label: "Order operations",
    status: "partial",
    packageKeys: ["commerce.order", "commerce.inventory", "core.audit"],
    profiles: commerceProfiles,
  },
  {
    key: "commerce.inventory-operations",
    label: "Inventory operations",
    status: "partial",
    packageKeys: ["commerce.inventory", "commerce.inventory-ledger"],
    profiles: commerceProfiles,
  },
  {
    key: "operations.console",
    label: "Merchant operations",
    status: "partial",
    packageKeys: ["core.crud", "core.audit", "core.workflow"],
    profiles: commerceProfiles,
  },
  {
    key: "commerce.promotion-membership",
    label: "Promotion and membership",
    status: "planned",
    packageKeys: [],
    profiles: commerceProfiles,
  },
  {
    key: "availability.reservation-queue",
    label: "Reservation and queue",
    status: "planned",
    packageKeys: [],
    profiles: ["restaurant-ordering", "grocery-pickup"],
  },
  {
    key: "commerce.fulfillment",
    label: "Fulfillment",
    status: "planned",
    packageKeys: ["commerce.order"],
    profiles: ["restaurant-ordering", "simple-ecommerce", "grocery-pickup"],
  },
  {
    key: "identity.party",
    label: "Identity and party",
    status: "provider-required",
    packageKeys: ["core.identity-context"],
    profiles: allProfiles,
  },
  {
    key: "communication.notification",
    label: "Notification",
    status: "provider-required",
    packageKeys: ["core.notification"],
    profiles: allProfiles,
  },
  {
    key: "analytics.operations",
    label: "Operations analytics",
    status: "partial",
    packageKeys: ["core.audit"],
    profiles: allProfiles,
  },
] as const satisfies readonly ProfileCoverageDefinition[]);

function copyCoverageItem(
  definition: ProfileCoverageDefinition,
): ProfileCoverageItemV1 {
  return Object.freeze({
    apiVersion: "factory.profile-coverage/v1" as const,
    key: definition.key,
    label: definition.label,
    status: definition.status,
    packageKeys: Object.freeze([...definition.packageKeys]),
    profiles: Object.freeze([...definition.profiles]),
  });
}

/**
 * Returns Factory-owned product coverage facts. This is intentionally a
 * source-free status projection: it neither authorizes package selection nor
 * represents Candidates, Providers, or installed third-party software.
 */
export function listProfileCoverage(): readonly ProfileCoverageItemV1[] {
  return Object.freeze(profileCoverageDefinitions.map(copyCoverageItem));
}
