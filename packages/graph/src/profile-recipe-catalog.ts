import { z } from "zod";

import {
  capabilityKeySchema,
  CompositionError,
  compositionSurfaceSchema,
  digestJson,
  identifierSchema,
  parseStrict,
  safeBusinessTextSchema,
  semanticVersionSchema,
} from "./composition-shared.js";

const capabilityLockSchema = z
  .object({
    key: capabilityKeySchema,
    version: semanticVersionSchema,
  })
  .strict();

const bindingRequirementSchema = z
  .object({
    capabilityKey: capabilityKeySchema,
    inputKey: identifierSchema,
    required: z.boolean(),
    target: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/),
  })
  .strict();

/**
 * A reusable Profile recipe: which capability families serve a business
 * profile, what they require, and the evidence status that lets the Foundry
 * count the family. Unsupported recipes must carry reason codes; anchors and
 * composable recipes may not.
 */
export const profileRecipeSchema = z
  .object({
    id: identifierSchema,
    name: safeBusinessTextSchema.max(160),
    domain: identifierSchema,
    description: safeBusinessTextSchema.max(1000),
    capabilities: z.array(capabilityLockSchema).min(1).max(20),
    bindings: z.array(bindingRequirementSchema).min(1).max(40),
    surfaces: z.array(compositionSurfaceSchema).min(1).max(7),
    acceptanceJourneys: z.array(identifierSchema).min(1).max(20),
    status: z.enum(["anchor", "composable", "unsupported"]),
    reasonCodes: z
      .array(safeBusinessTextSchema.max(120))
      .min(1)
      .max(10)
      .optional(),
  })
  .strict();

export type ProfileRecipeV1 = z.infer<typeof profileRecipeSchema>;

export const profileRecipeCatalogSchema = z
  .object({
    apiVersion: z.literal("factory.profile-recipe-catalog/v1"),
    schemaVersion: z.literal("v1"),
    // An empty catalogue is a valid staged state: the planner answers such a
    // catalogue with a schema-valid clarification instead of guessing, and the
    // authoritative portfolio catalogue is populated before release.
    recipes: z.array(profileRecipeSchema).max(500),
  })
  .strict();

export type ProfileRecipeCatalogV1 = z.infer<typeof profileRecipeCatalogSchema>;

export function parseProfileRecipe(input: unknown): ProfileRecipeV1 {
  const recipe = parseStrict(profileRecipeSchema, input);
  const declared = new Set(
    recipe.capabilities.map((lock) => `${lock.key}@${lock.version}`),
  );
  const declaredKeyOnly = new Set(recipe.capabilities.map((lock) => lock.key));

  const seenLocks = new Set<string>();
  for (const lock of recipe.capabilities) {
    const id = `${lock.key}@${lock.version}`;
    if (seenLocks.has(id)) {
      throw new CompositionError(
        `Profile recipe '${recipe.id}' locks capability '${id}' more than once.`,
      );
    }
    seenLocks.add(id);
  }

  const seenBindings = new Set<string>();
  const boundKeys = new Set<string>();
  for (const binding of recipe.bindings) {
    if (!declaredKeyOnly.has(binding.capabilityKey)) {
      throw new CompositionError(
        `Profile recipe '${recipe.id}' declares a binding for capability '${binding.capabilityKey}' that it never locks.`,
      );
    }
    boundKeys.add(binding.capabilityKey);
    const id = `${binding.capabilityKey}:${binding.inputKey}`;
    if (seenBindings.has(id)) {
      throw new CompositionError(
        `Profile recipe '${recipe.id}' duplicates binding requirement '${id}'.`,
      );
    }
    seenBindings.add(id);
  }
  for (const lock of recipe.capabilities) {
    if (!boundKeys.has(lock.key)) {
      throw new CompositionError(
        `Profile recipe '${recipe.id}' locks capability '${lock.key}' but declares no binding requirement for it.`,
      );
    }
  }

  const seenSurfaces = new Set<string>();
  for (const surface of recipe.surfaces) {
    if (seenSurfaces.has(surface)) {
      throw new CompositionError(
        `Profile recipe '${recipe.id}' repeats surface '${surface}'.`,
      );
    }
    seenSurfaces.add(surface);
  }

  if (recipe.status === "unsupported" && !recipe.reasonCodes) {
    throw new CompositionError(
      `Profile recipe '${recipe.id}' is unsupported but lists no reason codes.`,
    );
  }
  if (recipe.status !== "unsupported" && recipe.reasonCodes) {
    throw new CompositionError(
      `Profile recipe '${recipe.id}' lists reason codes for status '${recipe.status}'.`,
    );
  }
  return recipe;
}

export function assertProfileRecipe(input: unknown): ProfileRecipeV1 {
  return parseProfileRecipe(input);
}

export function parseProfileRecipeCatalog(
  input: unknown,
): ProfileRecipeCatalogV1 {
  const catalog = parseStrict(profileRecipeCatalogSchema, input);
  const seenIds = new Set<string>();
  for (const recipe of catalog.recipes) {
    if (seenIds.has(recipe.id)) {
      throw new CompositionError(
        `Profile recipe catalog repeats recipe id '${recipe.id}'.`,
      );
    }
    seenIds.add(recipe.id);
  }
  return catalog;
}

export function assertProfileRecipeCatalog(
  input: unknown,
): ProfileRecipeCatalogV1 {
  return parseProfileRecipeCatalog(input);
}

export function hashProfileRecipeCatalog(input: unknown): string {
  return digestJson(assertProfileRecipeCatalog(input));
}

/** Recipes that anchor an independently compiled Profile Graph. */
export function listAnchorRecipes(catalog: ProfileRecipeCatalogV1): string[] {
  return catalog.recipes
    .filter((recipe) => recipe.status === "anchor")
    .map((recipe) => recipe.id);
}
