import { z } from "zod";

import {
  CompositionError,
  capabilityKeySchema,
  identifierSchema,
  parseStrict,
  sha256DigestSchema,
} from "@factory/graph";

import {
  currentCapabilityAssets,
  type CapabilityAssetV1,
} from "./assets/index.js";

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

export const catalogueAssetSchema = z
  .object({
    key: capabilityKeySchema,
    version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
    packageRoot: z.string().min(1).max(512),
    manifestDigest: sha256DigestSchema,
    lifecycle: z.literal("golden"),
    inputs: z.array(catalogueInputSchema).max(50),
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
  };
}

/**
 * The current approved catalogue: the capability assets every composed
 * product needs, plus the optional assets their declared triggers activate.
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
    ].map(lookup),
    optional: [
      { asset: lookup("core.audit@1.0.2"), triggers: ["approval-decision"] },
      {
        asset: lookup("core.notification@1.1.1"),
        triggers: ["workflow-driven"],
      },
    ],
  });
}
