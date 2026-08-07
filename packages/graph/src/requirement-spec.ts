import { z } from "zod";

import {
  CompositionError,
  digestJson,
  identifierSchema,
  parseStrict,
  safeBusinessTextSchema,
} from "./composition-shared.js";

const namedItemSchema = z.object({
  key: identifierSchema,
  label: safeBusinessTextSchema.max(160),
  description: safeBusinessTextSchema.max(1000).optional(),
});

/**
 * A Factory-owned requirement record. It carries outcome, actors, domain
 * concepts, workflows, non-functional constraints, explicitly unresolved
 * questions, and acceptance scenarios — never raw model material, URLs,
 * package paths, or credentials.
 */
export const requirementSpecSchema = z
  .object({
    apiVersion: z.literal("factory.requirement-spec/v1"),
    requirementId: identifierSchema,
    outcome: safeBusinessTextSchema,
    actors: z.array(namedItemSchema).min(1).max(30),
    domainConcepts: z.array(namedItemSchema).max(60),
    workflows: z.array(namedItemSchema).max(40),
    constraints: z
      .array(
        z.object({
          key: identifierSchema,
          kind: z.enum([
            "performance",
            "security",
            "compliance",
            "usability",
            "availability",
            "cost",
          ]),
          statement: safeBusinessTextSchema.max(1000),
        }),
      )
      .max(30),
    openQuestions: z
      .array(
        z.object({
          question: safeBusinessTextSchema.max(500),
          answer: safeBusinessTextSchema.max(1000).optional(),
        }),
      )
      .max(30),
    acceptanceScenarios: z
      .array(
        z.object({
          key: identifierSchema,
          given: safeBusinessTextSchema.max(1000),
          when: safeBusinessTextSchema.max(1000),
          then: safeBusinessTextSchema.max(1000),
        }),
      )
      .max(40),
  })
  .strict();

export type RequirementSpecV1 = z.infer<typeof requirementSpecSchema>;

function assertUniqueKeys(
  items: readonly { key: string }[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) {
      throw new CompositionError(
        `Requirement ${label} key '${item.key}' is duplicated.`,
      );
    }
    seen.add(item.key);
  }
}

export function assertRequirementSpec(input: unknown): RequirementSpecV1 {
  const requirement = parseStrict(requirementSpecSchema, input);
  assertUniqueKeys(requirement.actors, "actor");
  assertUniqueKeys(requirement.domainConcepts, "domain concept");
  assertUniqueKeys(requirement.workflows, "workflow");
  assertUniqueKeys(requirement.constraints, "constraint");
  assertUniqueKeys(requirement.acceptanceScenarios, "acceptance scenario");
  return requirement;
}

export function parseRequirementSpec(input: unknown): RequirementSpecV1 {
  return assertRequirementSpec(input);
}

export function hashRequirementSpec(input: unknown): string {
  return digestJson(assertRequirementSpec(input));
}
