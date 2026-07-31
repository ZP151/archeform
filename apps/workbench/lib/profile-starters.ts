import {
  composeDefaultCapabilityDraft,
  type FactoryProfile,
} from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

export type ProfileStarterOption = {
  readonly profile: FactoryProfile;
  readonly label: string;
  readonly description: string;
};

export const profileStarterOptions: readonly ProfileStarterOption[] = [
  {
    profile: "expense-approval",
    label: "Expense approval",
    description: "Employee submission, manager decision, and finance audit.",
  },
  {
    profile: "restaurant-ordering",
    label: "Restaurant ordering",
    description: "Menu, cart, simulated payment, and kitchen fulfilment.",
  },
  {
    profile: "simple-ecommerce",
    label: "Simple ecommerce",
    description: "Catalog, checkout, inventory update, and order lifecycle.",
  },
] as const;

export function createProfileDraft(
  profile: FactoryProfile,
  optionalCapabilities?: readonly string[],
): ApplicationGraphV1 {
  return composeDefaultCapabilityDraft(
    optionalCapabilities === undefined
      ? { profile }
      : { profile, optionalCapabilities },
  ).graph;
}
