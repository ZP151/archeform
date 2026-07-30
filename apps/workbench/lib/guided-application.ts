import type { FactoryProfile } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import { createProfileDraft } from "./profile-starters";

export type GuidedApplicationInput = {
  readonly profile: FactoryProfile;
  readonly name: string;
  readonly theme: "light" | "dark";
  readonly optionalCapabilities?: readonly string[];
};

export type GuidedProfileSummary = {
  readonly pages: number;
  readonly entities: number;
  readonly roles: number;
  readonly flows: number;
};

const maximumNameLength = 160;
const maximumGraphKeyLength = 96;

function normalizedApplicationName(input: string): string {
  const name = input.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Application name is required.");
  if (name.length > maximumNameLength) {
    throw new Error(
      `Application name must not exceed ${maximumNameLength} characters.`,
    );
  }
  return name;
}

function normalizedNonce(input: string): string {
  const nonce = input.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nonce)) {
    throw new Error(
      "Application nonce must contain lowercase letters, numbers, and hyphens only.",
    );
  }
  return nonce;
}

function applicationKey(name: string, nonce: string): string {
  const slug =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "application";
  const suffix = `-${nonce}`;
  return `${slug.slice(0, maximumGraphKeyLength - suffix.length).replace(/-+$/g, "") || "application"}${suffix}`;
}

export function createGuidedApplicationDraft(
  input: GuidedApplicationInput,
  nonce: string,
): ApplicationGraphV1 {
  const name = normalizedApplicationName(input.name);
  const graph = createProfileDraft(input.profile, input.optionalCapabilities);
  graph.metadata = {
    ...graph.metadata,
    id: applicationKey(name, normalizedNonce(nonce)),
    name,
  };
  graph.experience = {
    ...graph.experience,
    theme: {
      ...graph.experience.theme,
      mode: input.theme,
    },
  };
  return graph;
}

export function guidedProfileSummary(
  graph: ApplicationGraphV1,
): GuidedProfileSummary {
  return {
    pages: graph.page.pages.length,
    entities: graph.domain.entities.length,
    roles: graph.policy.roles.length,
    flows: graph.flow.flows.length,
  };
}
