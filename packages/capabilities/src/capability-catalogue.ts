import { z } from "zod";

import {
  assertProductIntent,
  CompositionError,
  capabilityKeySchema,
  identifierSchema,
  parseStrict,
  sha256DigestSchema,
  type ProductIntentV1,
  type ProductRecipeV2,
} from "@factory/graph";

import {
  currentCapabilityAssets,
  type CapabilityAssetV1,
} from "./assets/index.js";
import { copyStrictOwnDataEnvelope } from "./commerce/product-recipe.js";
import { restaurantOrderingProductRecipe } from "./restaurant/product-recipe.js";

/**
 * The approved, deterministic capability surface the product composer may
 * select. It is not a model decision: the catalogue is a fixed registry
 * projection of the approved capability assets, and only the deterministic
 * planner picks from it. `inputs` mirrors each manifest's inputSchema so
 * binding completeness can be verified before anything is composed.
 */

const catalogueInputSchema = z
  .object({
    key: identifierSchema,
    required: z.boolean(),
  })
  .strict();

const catalogueInterfaceRefSchema = z
  .object({
    interfaceKey: capabilityKeySchema,
    version: z.string().regex(/^v\d+$/),
  })
  .strict();

export const catalogueAssetSchema = z
  .object({
    key: capabilityKeySchema,
    version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
    packageRoot: z.string().min(1).max(512),
    manifestDigest: sha256DigestSchema,
    lifecycle: z.literal("golden"),
    inputs: z.array(catalogueInputSchema).max(50),
    // The interface contracts each asset requires and provides, mirrored
    // from its manifest so the deterministic planner can close any
    // selection over its declared dependencies before a plan is reviewed.
    requires: z.array(catalogueInterfaceRefSchema).default([]),
    provides: z.array(catalogueInterfaceRefSchema).default([]),
  })
  .strict();

export type CatalogueAssetRefV1 = z.infer<typeof catalogueAssetSchema>;

/** Deterministic signals a blueprint may trigger in the catalogue. */
export const capabilityTriggerSchema = z.enum([
  "approval-decision",
  "workflow-driven",
]);

export type CapabilityTrigger = z.infer<typeof capabilityTriggerSchema>;

export const productCapabilityCatalogueSchema = z
  .object({
    apiVersion: z.literal("factory.product-capability-catalogue/v1"),
    required: z.array(catalogueAssetSchema).min(1).max(50),
    optional: z
      .array(
        z
          .object({
            asset: catalogueAssetSchema,
            triggers: z.array(capabilityTriggerSchema).min(1).max(10),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

export type ProductCapabilityCatalogueV1 = z.infer<
  typeof productCapabilityCatalogueSchema
>;

export function assertProductCapabilityCatalogue(
  input: unknown,
): ProductCapabilityCatalogueV1 {
  return parseStrict(productCapabilityCatalogueSchema, input);
}

function assetRef(asset: CapabilityAssetV1): CatalogueAssetRefV1 {
  return {
    key: asset.manifest.key,
    version: asset.manifest.version,
    packageRoot: asset.manifest.packageRoot,
    manifestDigest: asset.manifest.manifestDigest,
    lifecycle: asset.manifest.lifecycle,
    inputs: asset.manifest.inputSchema.map((input) => ({
      key: input.key,
      required: input.required,
    })),
    requires: (asset.manifest.requires ?? []).map((requirement) => ({
      interfaceKey: requirement.interfaceKey,
      version: requirement.version,
    })),
    provides: (asset.manifest.provides ?? []).map((provided) => ({
      interfaceKey: provided.interfaceKey,
      version: provided.version,
    })),
  };
}

/**
 * The current approved catalogue: the capability assets every composed
 * product needs, plus the optional assets their declared triggers activate.
 * The required set is dependency-closed: `core.identity-policy` requires the
 * `audit.event@v1` interface, so `core.audit` is required with it — every
 * product lock set must resolve, and the planner re-verifies the closure.
 */
export function currentCapabilityCatalogue(): ProductCapabilityCatalogueV1 {
  const byKeyVersion = new Map(
    currentCapabilityAssets.map((asset) => [
      `${asset.manifest.key}@${asset.manifest.version}`,
      asset,
    ]),
  );
  const lookup = (keyVersion: string): CatalogueAssetRefV1 => {
    const asset = byKeyVersion.get(keyVersion);
    if (asset === undefined) {
      throw new CompositionError(
        `Catalogue has no approved asset '${keyVersion}'.`,
      );
    }
    return assetRef(asset);
  };
  return assertProductCapabilityCatalogue({
    apiVersion: "factory.product-capability-catalogue/v1",
    required: [
      "core.crud@1.0.1",
      "core.workflow@1.0.1",
      "core.identity-policy@1.0.0",
      "core.policy-declarations@1.0.0",
      "core.audit@1.0.2",
    ].map(lookup),
    optional: [
      {
        asset: lookup("core.notification@1.1.1"),
        triggers: ["workflow-driven"],
      },
    ],
  });
}

export interface SelectProductRecipeForIntentInput {
  readonly intent: ProductIntentV1;
  readonly proposedRecipeKey?: string;
}

export function currentProductRecipeCatalogue(): readonly ProductRecipeV2[] {
  return [restaurantOrderingProductRecipe()];
}

export function selectProductRecipeForIntent(
  input: SelectProductRecipeForIntentInput,
): ProductRecipeV2 | undefined;
export function selectProductRecipeForIntent(
  input: unknown,
): ProductRecipeV2 | undefined {
  const envelope = copyStrictOwnDataEnvelope(
    input,
    ["intent"],
    ["proposedRecipeKey"],
    "Product Recipe selection input is invalid.",
  );
  const proposedRecipeKey = envelope.proposedRecipeKey;
  if (
    proposedRecipeKey !== undefined &&
    (typeof proposedRecipeKey !== "string" ||
      proposedRecipeKey.length > 128 ||
      !/^[a-z][a-z0-9-]*$/.test(proposedRecipeKey))
  ) {
    throw new CompositionError("Product Recipe selection input is invalid.");
  }
  const intent = assertProductIntent(envelope.intent);
  const eligible = currentProductRecipeCatalogue().find((recipe) =>
    recipe.intentMatchers.some(
      (matcher) => matcher.productType === intent.productType,
    ),
  );
  if (proposedRecipeKey !== undefined && proposedRecipeKey !== eligible?.key) {
    throw new CompositionError(
      `Proposed Product Recipe '${proposedRecipeKey}' is not eligible for intent '${intent.productType}'.`,
    );
  }
  return eligible;
}
