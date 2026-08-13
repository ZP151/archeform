import { z } from "zod";

import {
  capabilityKeySchema,
  CompositionError,
  digestJson,
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

export type ApplicationSurfaceV2 = Omit<ApplicationSurfaceV1, "apiVersion"> & {
  apiVersion: "factory.application-surface/v2";
  ownedPageKeys: string[];
};

export type ProductRecipeV2 = Omit<
  ProductRecipeV1,
  "apiVersion" | "surfaces"
> & {
  apiVersion: "factory.product-recipe/v2";
  surfaces: ApplicationSurfaceV2[];
};

export type VersionedProductRecipe = ProductRecipeV1 | ProductRecipeV2;

type StrictBoundaryCopyResult = { ok: true; value: unknown } | { ok: false };

const strictProductRecipeBoundaryIssue =
  "Input must contain only plain own records and arrays.";
const strictProductRecipeMaximumDepth = 64;
const strictProductRecipeMaximumArrayLength = 100;

function isCanonicalArrayIndex(key: string, length: number): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < length &&
    String(index) === key
  );
}

function copyStrictProductRecipeBoundaryInput(
  input: unknown,
  depth = 0,
  activeInputs = new WeakSet<object>(),
): StrictBoundaryCopyResult {
  if (depth > strictProductRecipeMaximumDepth) return { ok: false };
  if (Array.isArray(input)) {
    let tracked = false;
    try {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
      if (
        !lengthDescriptor ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number" ||
        !Number.isInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0 ||
        lengthDescriptor.value > strictProductRecipeMaximumArrayLength
      ) {
        return { ok: false };
      }
      const length = lengthDescriptor.value;
      if (Object.getPrototypeOf(input) !== Array.prototype)
        return { ok: false };
      if (activeInputs.has(input)) return { ok: false };
      activeInputs.add(input);
      tracked = true;
      for (const key of Reflect.ownKeys(input)) {
        if (key === "length") continue;
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (
          typeof key !== "string" ||
          !isCanonicalArrayIndex(key, length) ||
          descriptor?.enumerable !== true ||
          !("value" in descriptor)
        ) {
          return { ok: false };
        }
      }
      const copy: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          input,
          String(index),
        );
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !("value" in descriptor)
        ) {
          return { ok: false };
        }
        const nested = copyStrictProductRecipeBoundaryInput(
          descriptor.value,
          depth + 1,
          activeInputs,
        );
        if (!nested.ok) return nested;
        copy.push(nested.value);
      }
      return { ok: true, value: copy };
    } finally {
      if (tracked) activeInputs.delete(input);
    }
  }
  if (input !== null && typeof input === "object") {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false };
    }
    if (activeInputs.has(input)) return { ok: false };
    activeInputs.add(input);
    try {
      const copy: Record<string, unknown> = Object.create(null);
      for (const key of Reflect.ownKeys(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (
          typeof key !== "string" ||
          descriptor?.enumerable !== true ||
          !("value" in descriptor)
        ) {
          return { ok: false };
        }
        const nested = copyStrictProductRecipeBoundaryInput(
          descriptor.value,
          depth + 1,
          activeInputs,
        );
        if (!nested.ok) return nested;
        copy[key] = nested.value;
      }
      return { ok: true, value: copy };
    } finally {
      activeInputs.delete(input);
    }
  }
  return { ok: true, value: input };
}

function createStrictProductRecipeBoundarySchema<T>(
  rawSchema: z.ZodType<T>,
  refine?: (value: T, context: z.RefinementCtx) => void,
): z.ZodType<T> {
  return new (class extends z.ZodType<T> {
    private fixedBoundaryError(): z.ZodError<T> {
      return new z.ZodError<T>([
        {
          code: z.ZodIssueCode.custom,
          path: [],
          message: strictProductRecipeBoundaryIssue,
        },
      ]);
    }

    private finishSafeParse(
      context: z.ParseContext,
      result: z.SyncParseReturnType<T>,
    ): z.SafeParseReturnType<T, T> {
      if (result.status === "valid") {
        return { success: true, data: result.value };
      }
      return {
        success: false,
        error:
          context.common.issues.length > 0
            ? new z.ZodError<T>(context.common.issues)
            : this.fixedBoundaryError(),
      };
    }

    private parseContext(data: unknown, async: boolean): z.ParseContext {
      return {
        common: {
          issues: [],
          async,
          contextualErrorMap: undefined,
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: z.ZodParsedType.unknown,
      };
    }

    parse(data: unknown, _params?: Parameters<z.ZodType<T>["parse"]>[1]): T {
      const result = this.safeParse(data);
      if (result.success) return result.data;
      throw result.error;
    }

    safeParse(
      data: unknown,
      _params?: Parameters<z.ZodType<T>["safeParse"]>[1],
    ): z.SafeParseReturnType<T, T> {
      const context = this.parseContext(data, false);
      try {
        const result = this._parseSync({
          data,
          path: context.path,
          parent: context,
        });
        return this.finishSafeParse(context, result);
      } catch {
        return {
          success: false,
          error: this.fixedBoundaryError(),
        };
      }
    }

    async parseAsync(
      data: unknown,
      _params?: Parameters<z.ZodType<T>["parseAsync"]>[1],
    ): Promise<T> {
      const result = await this.safeParseAsync(data);
      if (result.success) return result.data;
      throw result.error;
    }

    async safeParseAsync(
      data: unknown,
      _params?: Parameters<z.ZodType<T>["safeParseAsync"]>[1],
    ): Promise<z.SafeParseReturnType<T, T>> {
      const context = this.parseContext(data, true);
      try {
        const result = await this._parse({
          data,
          path: context.path,
          parent: context,
        });
        return this.finishSafeParse(context, result);
      } catch {
        return {
          success: false,
          error: this.fixedBoundaryError(),
        };
      }
    }

    override spa = (
      data: unknown,
      _params?: Parameters<z.ZodType<T>["safeParseAsync"]>[1],
    ): Promise<z.SafeParseReturnType<T, T>> => this.safeParseAsync(data);

    _parse(input: z.ParseInput): z.ParseReturnType<T> {
      const context: z.RefinementCtx = {
        addIssue: (issue) => z.addIssueToContext(input.parent, issue),
        get path() {
          return input.path;
        },
      };
      try {
        const copied = copyStrictProductRecipeBoundaryInput(input.data);
        if (!copied.ok) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: strictProductRecipeBoundaryIssue,
          });
          return z.INVALID;
        }
        const parsed = rawSchema.safeParse(copied.value);
        if (!parsed.success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: strictProductRecipeBoundaryIssue,
          });
          return z.INVALID;
        }
        refine?.(parsed.data, context);
        return input.parent.common.issues.length > 0
          ? z.INVALID
          : z.OK(parsed.data);
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: strictProductRecipeBoundaryIssue,
        });
        return z.INVALID;
      }
    }
  })({});
}

const strictProductRecipeBoundarySchema =
  createStrictProductRecipeBoundarySchema(z.unknown());

const rawApplicationSurfaceV2ShapeSchema = applicationSurfaceSchema
  .omit({ apiVersion: true })
  .extend({
    apiVersion: z.literal("factory.application-surface/v2"),
    ownedPageKeys: z.array(graphKeySchema).min(1).max(100),
  })
  .strict();

const structuralApplicationSurfaceV2Schema =
  createStrictProductRecipeBoundarySchema<ApplicationSurfaceV2>(
    rawApplicationSurfaceV2ShapeSchema,
  );

export const applicationSurfaceV2Schema =
  createStrictProductRecipeBoundarySchema<ApplicationSurfaceV2>(
    rawApplicationSurfaceV2ShapeSchema,
    (surface, context) => {
      const seen = new Set<string>();
      for (let index = 0; index < surface.ownedPageKeys.length; index += 1) {
        const pageKey = surface.ownedPageKeys[index]!;
        if (seen.has(pageKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Owned page keys must be unique.",
            path: ["ownedPageKeys", index],
          });
          return;
        }
        seen.add(pageKey);
      }
    },
  );

const rawProductRecipeV2ShapeSchema = productRecipeSchema
  .omit({ apiVersion: true, surfaces: true })
  .extend({
    apiVersion: z.literal("factory.product-recipe/v2"),
    surfaces: z.array(rawApplicationSurfaceV2ShapeSchema).min(1).max(10),
  })
  .strict();

const structuralProductRecipeV2Schema =
  createStrictProductRecipeBoundarySchema<ProductRecipeV2>(
    rawProductRecipeV2ShapeSchema,
  );

export const productRecipeV2Schema =
  createStrictProductRecipeBoundarySchema<ProductRecipeV2>(
    rawProductRecipeV2ShapeSchema,
    (recipe, context) => {
      for (
        let surfaceIndex = 0;
        surfaceIndex < recipe.surfaces.length;
        surfaceIndex += 1
      ) {
        const surface = recipe.surfaces[surfaceIndex]!;
        const seen = new Set<string>();
        for (let index = 0; index < surface.ownedPageKeys.length; index += 1) {
          const pageKey = surface.ownedPageKeys[index]!;
          if (seen.has(pageKey)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Owned page keys must be unique.",
              path: ["surfaces", surfaceIndex, "ownedPageKeys", index],
            });
            return;
          }
          seen.add(pageKey);
        }
      }
    },
  );

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

function assertProductRecipeV2Semantics(recipe: ProductRecipeV2): void {
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

    const ownedPageKeys = new Set<string>();
    for (const pageKey of surface.ownedPageKeys) {
      if (ownedPageKeys.has(pageKey)) {
        throw new CompositionError(
          `Product Recipe surface '${surface.key}' owned page '${pageKey}' is duplicated.`,
        );
      }
      ownedPageKeys.add(pageKey);
      if (!screens.has(pageKey)) {
        throw new CompositionError(
          `Product Recipe surface '${surface.key}' owns unknown screen '${pageKey}'.`,
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
    if (!ownedPageKeys.has(surface.entryPageKey)) {
      throw new CompositionError(
        `Product Recipe surface '${surface.key}' entry screen '${surface.entryPageKey}' is not owned.`,
      );
    }
    for (const { pageKey } of surface.navigation.items) {
      if (!ownedPageKeys.has(pageKey)) {
        throw new CompositionError(
          `Product Recipe surface '${surface.key}' navigation target '${pageKey}' is not owned.`,
        );
      }
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
}

export function assertProductRecipeV2(input: unknown): ProductRecipeV2 {
  const recipe = parseStrict(structuralProductRecipeV2Schema, input);
  assertProductRecipeV2Semantics(recipe);
  return recipe;
}

export function hashProductRecipeV2(input: unknown): Sha256Digest {
  return digestJson(assertProductRecipeV2(input)) as Sha256Digest;
}

function copyVersionedBoundaryInput(input: unknown): unknown {
  return parseStrict(strictProductRecipeBoundarySchema, input);
}

function copiedApiVersion(input: unknown): unknown {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }
  return (input as Record<string, unknown>).apiVersion;
}

export function assertVersionedProductRecipe(
  input: unknown,
): VersionedProductRecipe {
  const copiedInput = copyVersionedBoundaryInput(input);
  const apiVersion = copiedApiVersion(copiedInput);
  if (apiVersion === "factory.product-recipe/v1") {
    return assertProductRecipe(copiedInput);
  }
  if (apiVersion === "factory.product-recipe/v2") {
    return assertProductRecipeV2(copiedInput);
  }
  throw new CompositionError(
    "Product Recipe apiVersion must be 'factory.product-recipe/v1' or 'factory.product-recipe/v2'.",
  );
}

export function adaptProductRecipeV1DraftToV2(input: unknown): ProductRecipeV2 {
  const copiedInput = copyVersionedBoundaryInput(input);
  if (copiedApiVersion(copiedInput) !== "factory.product-recipe/v1") {
    throw new CompositionError(
      "Product Recipe Draft adapter accepts only 'factory.product-recipe/v1'.",
    );
  }
  const recipe = assertProductRecipe(copiedInput);
  const adapted: ProductRecipeV2 = {
    ...structuredClone(recipe),
    apiVersion: "factory.product-recipe/v2",
    surfaces: recipe.surfaces.map((surface) => ({
      ...structuredClone(surface),
      apiVersion: "factory.application-surface/v2",
      ownedPageKeys: [
        ...new Set([
          surface.entryPageKey,
          ...surface.navigation.items.map(({ pageKey }) => pageKey),
        ]),
      ],
    })),
  };
  return assertProductRecipeV2(adapted);
}
