import { z } from "zod";

import {
  capabilityKeySchema,
  CompositionError,
  graphKeySchema,
  parseStrict,
  safeBusinessTextSchema,
  sha256DigestSchema,
} from "./composition-shared.js";
import { productIntentSchema, type Sha256Digest } from "./product-intent.js";

const publishedVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/);
const typedSha256DigestSchema = sha256DigestSchema as z.ZodType<Sha256Digest>;

export const screenIntentSchema = z
  .object({
    apiVersion: z.literal("factory.screen-intent/v1"),
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    purpose: z.enum([
      "discovery",
      "configuration",
      "transaction",
      "tracking",
      "operations",
      "fulfillment",
      "reporting",
      "administration",
    ]),
    primaryJourneyKeys: z.array(graphKeySchema).max(30),
    entityKeys: z.array(graphKeySchema).max(30),
    capabilityKeys: z.array(capabilityKeySchema).max(30),
    recipeKey: graphKeySchema,
    preferredViewport: z.enum(["mobile", "desktop", "responsive"]),
  })
  .strict();

export type ScreenIntentV1 = z.infer<typeof screenIntentSchema>;

const navigationItemSchema = z
  .object({
    pageKey: graphKeySchema,
    label: safeBusinessTextSchema.max(80),
    icon: graphKeySchema,
  })
  .strict();

export const applicationSurfaceSchema = z
  .object({
    apiVersion: z.literal("factory.application-surface/v1"),
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    kind: z.enum(["customer", "merchant", "operations"]),
    audienceRoles: z.array(graphKeySchema).max(20),
    device: z.enum(["mobile", "desktop", "responsive"]),
    entryPageKey: graphKeySchema,
    navigation: z
      .object({
        pattern: z.enum(["bottom-tabs", "sidebar", "topbar"]),
        items: z.array(navigationItemSchema).max(30),
      })
      .strict(),
    responsive: z
      .object({
        minimumWidth: z.number().int().nonnegative(),
        maximumContentWidth: z.number().int().positive().optional(),
      })
      .strict(),
  })
  .strict();

export type ApplicationSurfaceV1 = z.infer<typeof applicationSurfaceSchema>;

export const productRecipeSchema = z
  .object({
    apiVersion: z.literal("factory.product-recipe/v1"),
    key: graphKeySchema,
    version: publishedVersionSchema,
    intentMatchers: z
      .array(
        z
          .object({ productType: productIntentSchema.shape.productType })
          .strict(),
      )
      .min(1)
      .max(10),
    capabilityLocks: z
      .array(
        z
          .object({
            key: capabilityKeySchema,
            version: publishedVersionSchema,
            digest: typedSha256DigestSchema,
          })
          .strict(),
      )
      .max(50),
    surfaces: z.array(applicationSurfaceSchema).min(1).max(10),
    screens: z.array(screenIntentSchema).min(1).max(100),
    roles: z.array(graphKeySchema).max(50),
    flows: z.array(graphKeySchema).max(50),
    seedScenarioKeys: z.array(graphKeySchema).max(50),
    acceptanceJourneyKeys: z.array(graphKeySchema).max(50),
  })
  .strict();

export type ProductRecipeV1 = z.infer<typeof productRecipeSchema>;

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new CompositionError(`${label} '${value}' is duplicated.`);
    }
    seen.add(value);
  }
}

export function assertProductRecipe(input: unknown): ProductRecipeV1 {
  const recipe = parseStrict(productRecipeSchema, input);
  assertUnique(
    recipe.intentMatchers.map(({ productType }) => productType),
    "Product Recipe intent matcher",
  );
  assertUnique(
    recipe.capabilityLocks.map(({ key }) => key),
    "Product Recipe capability lock",
  );
  assertUnique(
    recipe.surfaces.map(({ key }) => key),
    "Product Recipe surface",
  );
  assertUnique(
    recipe.screens.map(({ key }) => key),
    "Product Recipe screen",
  );
  assertUnique(recipe.roles, "Product Recipe role");
  assertUnique(recipe.flows, "Product Recipe flow");
  assertUnique(recipe.seedScenarioKeys, "Product Recipe seed scenario");
  assertUnique(
    recipe.acceptanceJourneyKeys,
    "Product Recipe acceptance journey",
  );

  const roles = new Set(recipe.roles);
  const screens = new Set(recipe.screens.map(({ key }) => key));
  const capabilities = new Set(recipe.capabilityLocks.map(({ key }) => key));
  const journeys = new Set(recipe.acceptanceJourneyKeys);
  const owners = new Map<string, string>();
  for (const surface of recipe.surfaces) {
    assertUnique(
      surface.audienceRoles,
      `Product Recipe surface '${surface.key}' audience role`,
    );
    assertUnique(
      surface.navigation.items.map(({ pageKey }) => pageKey),
      `Product Recipe surface '${surface.key}' navigation target`,
    );
    for (const role of surface.audienceRoles) {
      if (!roles.has(role)) {
        throw new CompositionError(
          `Product Recipe surface '${surface.key}' references unknown role '${role}'.`,
        );
      }
    }
    const pageKeys = new Set([
      surface.entryPageKey,
      ...surface.navigation.items.map(({ pageKey }) => pageKey),
    ]);
    for (const pageKey of pageKeys) {
      if (!screens.has(pageKey)) {
        throw new CompositionError(
          `Product Recipe surface '${surface.key}' references unknown screen '${pageKey}'.`,
        );
      }
      const owner = owners.get(pageKey);
      if (owner && owner !== surface.key) {
        throw new CompositionError(
          `Product Recipe screen '${pageKey}' belongs to more than one surface.`,
        );
      }
      owners.set(pageKey, surface.key);
    }
  }

  for (const screen of recipe.screens) {
    if (!owners.has(screen.key)) {
      throw new CompositionError(
        `Product Recipe screen '${screen.key}' has no surface owner.`,
      );
    }
    assertUnique(screen.primaryJourneyKeys, `Screen '${screen.key}' journey`);
    assertUnique(screen.entityKeys, `Screen '${screen.key}' entity`);
    assertUnique(screen.capabilityKeys, `Screen '${screen.key}' capability`);
    for (const capability of screen.capabilityKeys) {
      if (!capabilities.has(capability)) {
        throw new CompositionError(
          `Screen '${screen.key}' references unknown capability '${capability}'.`,
        );
      }
    }
    for (const journey of screen.primaryJourneyKeys) {
      if (!journeys.has(journey)) {
        throw new CompositionError(
          `Screen '${screen.key}' references unknown acceptance journey '${journey}'.`,
        );
      }
    }
  }
  return recipe;
}
