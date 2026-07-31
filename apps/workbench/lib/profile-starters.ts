import {
  composeDefaultCapabilityDraft,
  listFactoryProfiles,
  type FactoryProfile,
  type FactoryProfileDescriptorV1,
} from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

export type ProfileStarterOption = FactoryProfileDescriptorV1;

export const profileStarterOptions: readonly ProfileStarterOption[] =
  listFactoryProfiles();

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
