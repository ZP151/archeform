import { z } from "zod";

import {
  CompositionError,
  graphKeySchema,
  parseStrict,
  safeBusinessTextSchema,
  sha256DigestSchema,
} from "./composition-shared.js";

export type Sha256Digest = `sha256:${string}`;

const typedSha256DigestSchema = sha256DigestSchema as z.ZodType<Sha256Digest>;

const actorSchema = z
  .object({
    key: graphKeySchema,
    label: safeBusinessTextSchema.max(160),
    goals: z.array(safeBusinessTextSchema.max(500)).min(1).max(20),
  })
  .strict();

const coreJourneySchema = z
  .object({
    key: graphKeySchema,
    actorKey: graphKeySchema,
    outcome: safeBusinessTextSchema.max(500),
    critical: z.boolean(),
  })
  .strict();

export const productIntentSchema = z
  .object({
    apiVersion: z.literal("factory.product-intent/v1"),
    requirementChecksum: typedSha256DigestSchema,
    productType: z.enum([
      "restaurant-ordering",
      "commerce",
      "workflow",
      "custom",
    ]),
    title: safeBusinessTextSchema.max(200),
    businessOutcome: safeBusinessTextSchema.max(1000),
    actors: z.array(actorSchema).min(1).max(20),
    coreJourneys: z.array(coreJourneySchema).min(1).max(30),
    constraints: z
      .object({
        regulatedData: z.boolean(),
        externalSideEffects: z.boolean(),
        moneyMovement: z.enum(["none", "simulated", "real"]),
      })
      .strict(),
  })
  .strict();

export type ProductIntentV1 = z.infer<typeof productIntentSchema>;

const experienceSurfaceSchema = z
  .object({
    key: graphKeySchema,
    device: z.enum(["mobile", "desktop", "responsive"]),
    audience: z.array(graphKeySchema).min(1).max(20),
    navigation: z.enum(["bottom-tabs", "sidebar", "topbar"]),
    density: z.enum(["comfortable", "compact"]),
  })
  .strict();

export const experienceBriefSchema = z
  .object({
    apiVersion: z.literal("factory.experience-brief/v1"),
    requirementChecksum: typedSha256DigestSchema,
    surfaces: z.array(experienceSurfaceSchema).min(1).max(10),
    brand: z
      .object({
        qualities: z.array(safeBusinessTextSchema.max(80)).min(1).max(12),
        contrast: z.enum(["soft", "balanced", "high"]),
        imagery: z.enum(["none", "supporting", "image-led"]),
      })
      .strict(),
    theme: z
      .object({
        defaultMode: z.enum(["light", "dark", "system"]),
        supportsDark: z.boolean(),
      })
      .strict(),
    responsiveTargets: z
      .array(z.enum(["mobile", "tablet", "desktop"]))
      .min(1)
      .max(3),
  })
  .strict();

export type ExperienceBriefV1 = z.infer<typeof experienceBriefSchema>;

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new CompositionError(`${label} '${value}' is duplicated.`);
    }
    seen.add(value);
  }
}

export function assertProductIntent(input: unknown): ProductIntentV1 {
  const intent = parseStrict(productIntentSchema, input);
  assertUnique(
    intent.actors.map(({ key }) => key),
    "Product Intent actor",
  );
  assertUnique(
    intent.coreJourneys.map(({ key }) => key),
    "Product Intent journey",
  );
  const actors = new Set(intent.actors.map(({ key }) => key));
  for (const journey of intent.coreJourneys) {
    if (!actors.has(journey.actorKey)) {
      throw new CompositionError(
        `Product Intent journey '${journey.key}' references unknown actor '${journey.actorKey}'.`,
      );
    }
  }
  if (intent.constraints.moneyMovement === "real") {
    throw new CompositionError(
      "Product Intent cannot authorize real money movement in this contract.",
    );
  }
  return intent;
}

export function assertExperienceBrief(input: unknown): ExperienceBriefV1 {
  const brief = parseStrict(experienceBriefSchema, input);
  assertUnique(
    brief.surfaces.map(({ key }) => key),
    "Experience Brief surface",
  );
  assertUnique(brief.responsiveTargets, "Experience Brief responsive target");
  for (const surface of brief.surfaces) {
    assertUnique(surface.audience, `Surface '${surface.key}' audience`);
  }
  return brief;
}
