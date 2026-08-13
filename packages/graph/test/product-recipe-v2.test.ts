import { describe, expect, it } from "vitest";
import { z } from "zod";

import * as graph from "../src/index.js";
import type {
  ApplicationSurfaceV2,
  ProductRecipeV2,
  VersionedProductRecipe,
} from "../src/index.js";

const digest = `sha256:${"b".repeat(64)}`;
const fixedHash =
  "sha256:93fb56182c117e674a2997c878daf53e6813b25a16b1cdde1afa9c662f4579b0";
const fixedBoundaryIssue = {
  code: "custom",
  path: [],
  message: "Input must contain only plain own records and arrays.",
} as const;

const customerPageKeys = [
  "customer-home",
  "customer-menu",
  "customer-dish-detail",
  "customer-cart",
  "customer-checkout",
  "customer-orders",
  "customer-order-detail",
  "customer-profile",
] as const;

const customerTabKeys = [
  "customer-home",
  "customer-menu",
  "customer-cart",
  "customer-orders",
  "customer-profile",
] as const;

type PublicIssue = {
  code: string;
  path: (string | number)[];
  message: string;
};

type PublicSafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: PublicIssue[]; message: string } };

type PublicSchema<T> = {
  parse(input: unknown, params?: unknown): T;
  safeParse(input: unknown, params?: unknown): PublicSafeParseResult<T>;
  parseAsync(input: unknown, params?: unknown): Promise<T>;
  safeParseAsync(
    input: unknown,
    params?: unknown,
  ): Promise<PublicSafeParseResult<T>>;
  spa(input: unknown, params?: unknown): Promise<PublicSafeParseResult<T>>;
};

type ProductRecipeV2Api = {
  applicationSurfaceV2Schema: PublicSchema<ApplicationSurfaceV2>;
  productRecipeV2Schema: PublicSchema<ProductRecipeV2>;
  assertProductRecipeV2(input: unknown): ProductRecipeV2;
  assertVersionedProductRecipe(input: unknown): VersionedProductRecipe;
  hashProductRecipeV2(input: unknown): string;
  adaptProductRecipeV1DraftToV2(input: unknown): ProductRecipeV2;
};

const api = graph as unknown as ProductRecipeV2Api;

function expectFixedBoundaryFailure<T>(
  parse: () => PublicSafeParseResult<T>,
  hostileSentinels: readonly string[] = [],
): Extract<PublicSafeParseResult<T>, { success: false }> {
  let result: PublicSafeParseResult<T> | undefined;
  expect(() => {
    result = parse();
  }).not.toThrow();
  expect(result?.success).toBe(false);
  if (!result || result.success) {
    throw new Error("Expected a fixed public boundary failure.");
  }
  expect(result.error.issues).toEqual([fixedBoundaryIssue]);
  const serialized = `${JSON.stringify(result.error)}\n${result.error.message}`;
  for (const sentinel of hostileSentinels) {
    expect(serialized).not.toContain(sentinel);
  }
  return result;
}

function expectFixedZodError(
  error: unknown,
  hostileSentinels: readonly string[] = [],
): void {
  expect(error).toBeInstanceOf(z.ZodError);
  const zodError = error as z.ZodError;
  expect(zodError.issues).toEqual([fixedBoundaryIssue]);
  const serialized = `${JSON.stringify(zodError)}\n${zodError.message}`;
  for (const sentinel of hostileSentinels) {
    expect(serialized).not.toContain(sentinel);
  }
}

const publicSchemaEntrypoints = [
  {
    label: "parse",
    returnsSafeResult: false,
    invoke: async (
      schema: PublicSchema<unknown>,
      input: unknown,
      params?: unknown,
    ) => schema.parse(input, params),
  },
  {
    label: "safeParse",
    returnsSafeResult: true,
    invoke: async (
      schema: PublicSchema<unknown>,
      input: unknown,
      params?: unknown,
    ) => schema.safeParse(input, params),
  },
  {
    label: "parseAsync",
    returnsSafeResult: false,
    invoke: async (
      schema: PublicSchema<unknown>,
      input: unknown,
      params?: unknown,
    ) => schema.parseAsync(input, params),
  },
  {
    label: "safeParseAsync",
    returnsSafeResult: true,
    invoke: async (
      schema: PublicSchema<unknown>,
      input: unknown,
      params?: unknown,
    ) => schema.safeParseAsync(input, params),
  },
  {
    label: "spa",
    returnsSafeResult: true,
    invoke: async (
      schema: PublicSchema<unknown>,
      input: unknown,
      params?: unknown,
    ) => schema.spa(input, params),
  },
] as const;

async function expectFixedBoundaryAtPublicEntrypoint(
  entrypoint: (typeof publicSchemaEntrypoints)[number],
  schema: PublicSchema<unknown>,
  input: unknown,
  hostileSentinels: readonly string[] = [],
  params?: unknown,
): Promise<void> {
  let result: unknown;
  let rawError: unknown;
  try {
    result = await entrypoint.invoke(schema, input, params);
  } catch (error) {
    rawError = error;
  }
  if (entrypoint.returnsSafeResult) {
    expect(rawError).toBeUndefined();
    const safeResult = result as PublicSafeParseResult<unknown> | undefined;
    expect(safeResult?.success).toBe(false);
    if (!safeResult || safeResult.success) {
      throw new Error("Expected a fixed public boundary failure.");
    }
    expect(safeResult.error.issues).toEqual([fixedBoundaryIssue]);
    const serialized = `${JSON.stringify(safeResult.error)}\n${safeResult.error.message}`;
    for (const sentinel of hostileSentinels) {
      expect(serialized).not.toContain(sentinel);
    }
    return;
  }
  expectFixedZodError(rawError, hostileSentinels);
}

async function expectFreshParityAcrossPublicEntrypoints<T>(
  schema: PublicSchema<T>,
  input: unknown,
): Promise<void> {
  const syncParsed: T = schema.parse(input);
  const syncSafe = schema.safeParse(input);
  expect(syncSafe.success).toBe(true);
  if (!syncSafe.success) throw new Error("Expected sync safeParse success.");
  const asyncParsed: T = await schema.parseAsync(input);
  const asyncSafe = await schema.safeParseAsync(input);
  expect(asyncSafe.success).toBe(true);
  if (!asyncSafe.success) throw new Error("Expected async safeParse success.");
  const spa = await schema.spa(input);
  expect(spa.success).toBe(true);
  if (!spa.success) throw new Error("Expected spa success.");

  for (const output of [
    syncParsed,
    syncSafe.data,
    asyncParsed,
    asyncSafe.data,
    spa.data,
  ]) {
    expect(output).toEqual(input);
    expectFreshTree(output, input);
  }
}

type ThrowingProxyTrap =
  "getPrototypeOf" | "ownKeys" | "getOwnPropertyDescriptor";

function throwingProxy<T extends object>(
  target: T,
  trap: ThrowingProxyTrap,
  sentinel: string,
): { value: T; calls: () => number } {
  let calls = 0;
  const fail = (): never => {
    calls += 1;
    throw new Error(sentinel);
  };
  const handler: ProxyHandler<T> = {};
  if (trap === "getPrototypeOf") handler.getPrototypeOf = fail;
  if (trap === "ownKeys") handler.ownKeys = fail;
  if (trap === "getOwnPropertyDescriptor") {
    handler.getOwnPropertyDescriptor = fail;
  }
  return { value: new Proxy(target, handler), calls: () => calls };
}

function addDepthProbe(
  root: Record<string, any>,
  targetDepth: number,
): () => number {
  let current = root;
  for (let depth = 1; depth < targetDepth; depth += 1) {
    const child: Record<string, unknown> = {};
    current.depthProbe = child;
    current = child;
  }
  let calls = 0;
  current.depthProbe = new Proxy(
    {},
    {
      getPrototypeOf() {
        calls += 1;
        return Object.prototype;
      },
    },
  );
  return () => calls;
}

function oversizedArrayProbe(length: number): {
  value: unknown[];
  lengthDescriptorCalls: () => number;
  prototypeCalls: () => number;
  ownKeysCalls: () => number;
  numericDescriptorCalls: () => number;
} {
  const target = new Array(length);
  let lengthDescriptorCalls = 0;
  let prototypeCalls = 0;
  let ownKeysCalls = 0;
  let numericDescriptorCalls = 0;
  const value = new Proxy(target, {
    getOwnPropertyDescriptor(array, key) {
      if (key === "length") lengthDescriptorCalls += 1;
      if (typeof key === "string" && /^(?:0|[1-9]\d*)$/.test(key)) {
        numericDescriptorCalls += 1;
      }
      return Reflect.getOwnPropertyDescriptor(array, key);
    },
    getPrototypeOf(array) {
      prototypeCalls += 1;
      return Reflect.getPrototypeOf(array);
    },
    ownKeys(array) {
      ownKeysCalls += 1;
      return Reflect.ownKeys(array);
    },
  });
  return {
    value,
    lengthDescriptorCalls: () => lengthDescriptorCalls,
    prototypeCalls: () => prototypeCalls,
    ownKeysCalls: () => ownKeysCalls,
    numericDescriptorCalls: () => numericDescriptorCalls,
  };
}

function validRecipeV1Data(): Record<string, any> {
  return {
    apiVersion: "factory.product-recipe/v1",
    key: "restaurant-ordering",
    version: "1.0.0",
    intentMatchers: [{ productType: "restaurant-ordering" }],
    capabilityLocks: [{ key: "commerce.orders", version: "1.0.0", digest }],
    surfaces: [
      {
        apiVersion: "factory.application-surface/v1",
        key: "customer-mobile",
        label: "Customer",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "home",
        navigation: {
          pattern: "bottom-tabs",
          items: [{ pageKey: "home", label: "Home", icon: "house" }],
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 480 },
      },
    ],
    screens: [
      {
        apiVersion: "factory.screen-intent/v1",
        key: "home",
        label: "Home",
        purpose: "discovery",
        primaryJourneyKeys: ["place-order"],
        entityKeys: ["order"],
        capabilityKeys: ["commerce.orders"],
        recipeKey: "restaurant-customer-home",
        preferredViewport: "mobile",
      },
    ],
    roles: ["customer"],
    flows: ["order-flow"],
    seedScenarioKeys: ["dinner-service"],
    acceptanceJourneyKeys: ["place-order"],
  };
}

function validRecipeV2(): Record<string, any> {
  const recipe = structuredClone(validRecipeV1Data());
  recipe.apiVersion = "factory.product-recipe/v2";
  const surface = recipe.surfaces[0];
  surface.apiVersion = "factory.application-surface/v2";
  surface.ownedPageKeys = ["home"];
  return recipe;
}

function restaurantCustomerV2(): Record<string, any> {
  const recipe = validRecipeV2();
  const surface = recipe.surfaces[0];
  surface.entryPageKey = "customer-home";
  surface.ownedPageKeys = [...customerPageKeys];
  surface.navigation.items = customerTabKeys.map((pageKey) => ({
    pageKey,
    label: pageKey,
    icon: "circle",
  }));
  recipe.screens = customerPageKeys.map((key) => ({
    apiVersion: "factory.screen-intent/v1",
    key,
    label: key,
    purpose: "discovery",
    primaryJourneyKeys: ["place-order"],
    entityKeys: ["order"],
    capabilityKeys: ["commerce.orders"],
    recipeKey: `restaurant-${key}`,
    preferredViewport: "mobile",
  }));
  return recipe;
}

function expectRecipeError(
  mutate: (recipe: Record<string, any>) => void,
  message: string | RegExp,
): void {
  const recipe = restaurantCustomerV2();
  mutate(recipe);
  expect(() => api.assertProductRecipeV2(recipe)).toThrow(message);
}

function expectFreshTree(left: unknown, right: unknown): void {
  if (left === null || right === null) return;
  if (typeof left !== "object" || typeof right !== "object") return;
  expect(left).not.toBe(right);
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  for (const key of Object.keys(leftRecord)) {
    expectFreshTree(leftRecord[key], rightRecord[key]);
  }
}

type BoundaryCase = {
  input: unknown;
  calls: () => number;
};

function hostileArray(
  values: readonly unknown[],
  customPrototype = false,
): { value: unknown[]; calls: () => number } {
  let calls = 0;
  if (customPrototype) {
    const value = Array.from(values);
    const prototype = Object.create(Array.prototype) as Record<
      PropertyKey,
      unknown
    >;
    prototype.map = function (...args: unknown[]) {
      calls += 1;
      return Reflect.apply(Array.prototype.map, this, args);
    };
    Object.setPrototypeOf(value, prototype);
    return { value, calls: () => calls };
  }

  class HostileArray extends Array<unknown> {
    public override map<U>(
      callback: (value: unknown, index: number, array: unknown[]) => U,
      thisArg?: unknown,
    ): U[] {
      calls += 1;
      return Array.prototype.map.call(this, callback, thisArg) as U[];
    }
  }
  const value = new HostileArray();
  for (const item of values) Array.prototype.push.call(value, item);
  return { value, calls: () => calls };
}

const hostileRecipeCases = [
  {
    label: "own enumerable getter",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      let calls = 0;
      Object.defineProperty(recipe.surfaces[0].navigation.items[0], "pageKey", {
        enumerable: true,
        get() {
          calls += 1;
          return "hostile-value";
        },
      });
      return { input: recipe, calls: () => calls };
    },
  },
  {
    label: "inherited required value",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      const surface = recipe.surfaces[0];
      delete surface.entryPageKey;
      Object.setPrototypeOf(surface, { entryPageKey: "home" });
      return { input: recipe, calls: () => 0 };
    },
  },
  {
    label: "own symbol key",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      recipe.screens[0][Symbol("hostile-value")] = "hostile-value";
      return { input: recipe, calls: () => 0 };
    },
  },
  {
    label: "own non-enumerable key",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      Object.defineProperty(recipe.surfaces[0].navigation, "hostile-value", {
        value: "hostile-value",
        enumerable: false,
      });
      return { input: recipe, calls: () => 0 };
    },
  },
  {
    label: "non-plain record",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      Object.setPrototypeOf(recipe.screens[0], { hostile: true });
      return { input: recipe, calls: () => 0 };
    },
  },
  {
    label: "array subclass",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      const hostile = hostileArray(recipe.surfaces);
      recipe.surfaces = hostile.value;
      return { input: recipe, calls: hostile.calls };
    },
  },
  {
    label: "custom array prototype",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      const hostile = hostileArray(recipe.surfaces[0].ownedPageKeys, true);
      recipe.surfaces[0].ownedPageKeys = hostile.value;
      return { input: recipe, calls: hostile.calls };
    },
  },
  {
    label: "sparse array slot",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      recipe.screens = new Array(2);
      recipe.screens[1] = validRecipeV2().screens[0];
      return { input: recipe, calls: () => 0 };
    },
  },
  {
    label: "accessor array slot",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      let calls = 0;
      const pageKey = recipe.surfaces[0].ownedPageKeys[0];
      Object.defineProperty(recipe.surfaces[0].ownedPageKeys, "0", {
        enumerable: true,
        get() {
          calls += 1;
          return pageKey;
        },
      });
      return { input: recipe, calls: () => calls };
    },
  },
  {
    label: "hidden array slot",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      Object.defineProperty(recipe.surfaces[0].ownedPageKeys, "0", {
        value: "home",
        enumerable: false,
      });
      return { input: recipe, calls: () => 0 };
    },
  },
  {
    label: "extra enumerable array key",
    create(): BoundaryCase {
      const recipe = validRecipeV2();
      recipe.surfaces[0].ownedPageKeys.hostile = "hostile-value";
      return { input: recipe, calls: () => 0 };
    },
  },
] as const;

const boundaryApis = [
  ["schema", (input: unknown) => api.productRecipeV2Schema.parse(input)],
  ["assert", (input: unknown) => api.assertProductRecipeV2(input)],
  ["hash", (input: unknown) => api.hashProductRecipeV2(input)],
] as const;

describe("ProductRecipeV2 ownership", () => {
  it("accepts the canonical and complete Restaurant ownership contracts", () => {
    expect(api.assertProductRecipeV2(validRecipeV2())).toEqual(validRecipeV2());
    const restaurant = api.assertProductRecipeV2(restaurantCustomerV2());
    expect(restaurant.surfaces[0]?.ownedPageKeys).toEqual(customerPageKeys);
    expect(
      restaurant.surfaces[0]?.navigation.items.map(({ pageKey }) => pageKey),
    ).toEqual(customerTabKeys);
  });

  it("rejects duplicate owned pages with the exact semantic error", () => {
    const recipe = restaurantCustomerV2();
    recipe.surfaces[0].ownedPageKeys.push("customer-home");
    const assertDuplicate = () => api.assertProductRecipeV2(recipe);

    expect(assertDuplicate).toThrow(graph.CompositionError);
    expect(assertDuplicate).toThrow(
      "Product Recipe surface 'customer-mobile' owned page 'customer-home' is duplicated.",
    );
  });

  it("reports exact duplicate ownership issues at both schema boundaries", () => {
    const recipe = validRecipeV2();
    recipe.surfaces[0].ownedPageKeys.push("home");

    const surfaceResult = api.applicationSurfaceV2Schema.safeParse(
      recipe.surfaces[0],
    );
    const recipeResult = api.productRecipeV2Schema.safeParse(recipe);
    expect(surfaceResult.success).toBe(false);
    expect(recipeResult.success).toBe(false);
    if (surfaceResult.success || recipeResult.success) {
      throw new Error("Expected duplicate ownership failures.");
    }
    expect(surfaceResult.error.issues).toEqual([
      {
        code: "custom",
        path: ["ownedPageKeys", 1],
        message: "Owned page keys must be unique.",
      },
    ]);
    expect(recipeResult.error.issues).toEqual([
      {
        code: "custom",
        path: ["surfaces", 0, "ownedPageKeys", 1],
        message: "Owned page keys must be unique.",
      },
    ]);

    const assertDuplicate = () => api.assertProductRecipeV2(recipe);
    expect(assertDuplicate).toThrow(graph.CompositionError);
    expect(assertDuplicate).toThrow(
      "Product Recipe surface 'customer-mobile' owned page 'home' is duplicated.",
    );
  });

  it("rejects unknown owned pages with the exact semantic error", () => {
    expectRecipeError(
      (recipe) => recipe.surfaces[0].ownedPageKeys.push("missing-screen"),
      "Product Recipe surface 'customer-mobile' owns unknown screen 'missing-screen'.",
    );
  });

  it("requires each entry screen to be owned by its surface", () => {
    expectRecipeError(
      (recipe) => recipe.surfaces[0].ownedPageKeys.shift(),
      "Product Recipe surface 'customer-mobile' entry screen 'customer-home' is not owned.",
    );
  });

  it("requires each navigation target to be owned by its surface", () => {
    expectRecipeError(
      (recipe) =>
        (recipe.surfaces[0].ownedPageKeys =
          recipe.surfaces[0].ownedPageKeys.filter(
            (key: string) => key !== "customer-menu",
          )),
      "Product Recipe surface 'customer-mobile' navigation target 'customer-menu' is not owned.",
    );
  });

  it("rejects ownership of one screen by two surfaces", () => {
    expectRecipeError((recipe) => {
      recipe.surfaces.push({
        apiVersion: "factory.application-surface/v2",
        key: "operations-desktop",
        label: "Operations",
        kind: "operations",
        audienceRoles: ["customer"],
        device: "desktop",
        entryPageKey: "customer-home",
        ownedPageKeys: ["customer-home"],
        navigation: {
          pattern: "sidebar",
          items: [{ pageKey: "customer-home", label: "Home", icon: "house" }],
        },
        responsive: { minimumWidth: 768 },
      });
    }, "Product Recipe screen 'customer-home' belongs to more than one surface.");
  });

  it("requires every declared screen to have an owner", () => {
    expectRecipeError(
      (recipe) =>
        (recipe.surfaces[0].ownedPageKeys =
          recipe.surfaces[0].ownedPageKeys.filter(
            (key: string) => key !== "customer-dish-detail",
          )),
      "Product Recipe screen 'customer-dish-detail' has no surface owner.",
    );
  });

  it("enforces ownership bounds and strict nested shapes", () => {
    expectRecipeError(
      (recipe) => (recipe.surfaces[0].ownedPageKeys = []),
      "Composition record is invalid: Input must contain only plain own records and arrays.",
    );
    expectRecipeError(
      (recipe) =>
        (recipe.surfaces[0].ownedPageKeys = Array.from(
          { length: 101 },
          (_, index) => `page-${index}`,
        )),
      "Composition record is invalid: Input must contain only plain own records and arrays.",
    );
    for (const mutate of [
      (recipe: Record<string, any>) => (recipe.provider = "provider"),
      (recipe: Record<string, any>) =>
        (recipe.surfaces[0].provider = "provider"),
      (recipe: Record<string, any>) =>
        (recipe.surfaces[0].navigation.provider = "provider"),
    ]) {
      expectRecipeError(
        mutate,
        "Composition record is invalid: Input must contain only plain own records and arrays.",
      );
    }
  });

  it.each([
    {
      label: "intent matcher duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.intentMatchers.push(structuredClone(recipe.intentMatchers[0])),
      message:
        "Product Recipe intent matcher 'restaurant-ordering' is duplicated.",
    },
    {
      label: "capability lock duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.capabilityLocks.push(structuredClone(recipe.capabilityLocks[0])),
      message:
        "Product Recipe capability lock 'commerce.orders' is duplicated.",
    },
    {
      label: "surface duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.surfaces.push(structuredClone(recipe.surfaces[0])),
      message: "Product Recipe surface 'customer-mobile' is duplicated.",
    },
    {
      label: "screen duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.screens.push(structuredClone(recipe.screens[0])),
      message: "Product Recipe screen 'home' is duplicated.",
    },
    {
      label: "role duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.roles.push(recipe.roles[0]),
      message: "Product Recipe role 'customer' is duplicated.",
    },
    {
      label: "flow duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.flows.push(recipe.flows[0]),
      message: "Product Recipe flow 'order-flow' is duplicated.",
    },
    {
      label: "seed scenario duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.seedScenarioKeys.push(recipe.seedScenarioKeys[0]),
      message: "Product Recipe seed scenario 'dinner-service' is duplicated.",
    },
    {
      label: "acceptance journey duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.acceptanceJourneyKeys.push(recipe.acceptanceJourneyKeys[0]),
      message: "Product Recipe acceptance journey 'place-order' is duplicated.",
    },
    {
      label: "surface audience role duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.surfaces[0].audienceRoles.push(
          recipe.surfaces[0].audienceRoles[0],
        ),
      message:
        "Product Recipe surface 'customer-mobile' audience role 'customer' is duplicated.",
    },
    {
      label: "surface navigation target duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.surfaces[0].navigation.items.push(
          structuredClone(recipe.surfaces[0].navigation.items[0]),
        ),
      message:
        "Product Recipe surface 'customer-mobile' navigation target 'home' is duplicated.",
    },
    {
      label: "screen journey duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.screens[0].primaryJourneyKeys.push(
          recipe.screens[0].primaryJourneyKeys[0],
        ),
      message: "Screen 'home' journey 'place-order' is duplicated.",
    },
    {
      label: "screen entity duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.screens[0].entityKeys.push(recipe.screens[0].entityKeys[0]),
      message: "Screen 'home' entity 'order' is duplicated.",
    },
    {
      label: "screen capability duplicate",
      mutate: (recipe: Record<string, any>) =>
        recipe.screens[0].capabilityKeys.push(
          recipe.screens[0].capabilityKeys[0],
        ),
      message: "Screen 'home' capability 'commerce.orders' is duplicated.",
    },
    {
      label: "unknown audience role",
      mutate: (recipe: Record<string, any>) =>
        (recipe.surfaces[0].audienceRoles = ["manager"]),
      message:
        "Product Recipe surface 'customer-mobile' references unknown role 'manager'.",
    },
    {
      label: "unknown screen capability",
      mutate: (recipe: Record<string, any>) =>
        (recipe.screens[0].capabilityKeys = ["commerce.inventory"]),
      message:
        "Screen 'home' references unknown capability 'commerce.inventory'.",
    },
    {
      label: "unknown screen journey",
      mutate: (recipe: Record<string, any>) =>
        (recipe.screens[0].primaryJourneyKeys = ["unknown-journey"]),
      message:
        "Screen 'home' references unknown acceptance journey 'unknown-journey'.",
    },
  ])("preserves the shared $label semantic", ({ mutate, message }) => {
    const recipe = validRecipeV2();
    mutate(recipe);
    expect(() => api.assertProductRecipeV2(recipe)).toThrow(message);
  });
});

describe("ProductRecipeV2 hashing and freshness", () => {
  it("matches the fixed canonical hash", () => {
    expect(api.hashProductRecipeV2(validRecipeV2())).toBe(fixedHash);
  });

  it("returns deterministic fresh values without mutating input", () => {
    const input = validRecipeV2();
    const before = structuredClone(input);
    const first = api.assertProductRecipeV2(input);
    const second = api.assertProductRecipeV2(input);

    expect(first).toEqual(second);
    expectFreshTree(first, second);
    expect(input).toEqual(before);
    expect(api.hashProductRecipeV2(input)).toBe(fixedHash);
    expect(input).toEqual(before);
  });

  it("ignores object-key order but preserves array order in hashes", () => {
    const input = restaurantCustomerV2();
    const reordered = Object.fromEntries(Object.entries(input).reverse());
    expect(api.hashProductRecipeV2(reordered)).toBe(
      api.hashProductRecipeV2(input),
    );

    const arrayReordered = structuredClone(input);
    arrayReordered.surfaces[0].ownedPageKeys.reverse();
    expect(api.hashProductRecipeV2(arrayReordered)).not.toBe(
      api.hashProductRecipeV2(input),
    );
  });
});

describe("ProductRecipeV2 public schema envelope", () => {
  it.each([
    {
      label: "surface root extra key",
      parse(input: unknown) {
        return api.applicationSurfaceV2Schema.safeParse(input);
      },
      create() {
        const input = validRecipeV2().surfaces[0];
        input.hostileSurfaceKey = "hostile-surface-value";
        return {
          input,
          sentinels: ["hostileSurfaceKey", "hostile-surface-value"],
        };
      },
    },
    {
      label: "surface nested navigation extra key",
      parse(input: unknown) {
        return api.applicationSurfaceV2Schema.safeParse(input);
      },
      create() {
        const input = validRecipeV2().surfaces[0];
        input.navigation.hostileNavigationKey = "hostile-navigation-value";
        return {
          input,
          sentinels: ["hostileNavigationKey", "hostile-navigation-value"],
        };
      },
    },
    {
      label: "surface nested invalid navigation enum",
      parse(input: unknown) {
        return api.applicationSurfaceV2Schema.safeParse(input);
      },
      create() {
        const input = validRecipeV2().surfaces[0];
        input.navigation.pattern = "hostile-navigation-enum";
        return { input, sentinels: ["hostile-navigation-enum"] };
      },
    },
    {
      label: "recipe root extra key",
      parse(input: unknown) {
        return api.productRecipeV2Schema.safeParse(input);
      },
      create() {
        const input = validRecipeV2();
        input.hostileRecipeKey = "hostile-recipe-value";
        return {
          input,
          sentinels: ["hostileRecipeKey", "hostile-recipe-value"],
        };
      },
    },
    {
      label: "recipe nested surface extra key",
      parse(input: unknown) {
        return api.productRecipeV2Schema.safeParse(input);
      },
      create() {
        const input = validRecipeV2();
        input.surfaces[0].hostileNestedSurfaceKey =
          "hostile-nested-surface-value";
        return {
          input,
          sentinels: [
            "hostileNestedSurfaceKey",
            "hostile-nested-surface-value",
          ],
        };
      },
    },
    {
      label: "recipe nested invalid surface enum",
      parse(input: unknown) {
        return api.productRecipeV2Schema.safeParse(input);
      },
      create() {
        const input = validRecipeV2();
        input.surfaces[0].kind = "hostile-surface-enum";
        return { input, sentinels: ["hostile-surface-enum"] };
      },
    },
  ])("collapses $label to one fixed no-echo issue", ({ create, parse }) => {
    const { input, sentinels } = create();
    expectFixedBoundaryFailure(
      () => parse(input) as PublicSafeParseResult<unknown>,
      sentinels,
    );
  });

  for (const schemaCase of [
    {
      label: "surface",
      create: () => validRecipeV2().surfaces[0],
      parse: (input: unknown) =>
        api.applicationSurfaceV2Schema.safeParse(
          input,
        ) as PublicSafeParseResult<unknown>,
    },
    {
      label: "recipe",
      create: validRecipeV2,
      parse: (input: unknown) =>
        api.productRecipeV2Schema.safeParse(
          input,
        ) as PublicSafeParseResult<unknown>,
    },
  ]) {
    it.each<ThrowingProxyTrap>([
      "getPrototypeOf",
      "ownKeys",
      "getOwnPropertyDescriptor",
    ])(
      `${schemaCase.label} catches and redacts a throwing %s Proxy trap`,
      (trap) => {
        const sentinel = `hostile-${schemaCase.label}-${trap}-trap`;
        const hostile = throwingProxy(schemaCase.create(), trap, sentinel);
        expectFixedBoundaryFailure(
          () => schemaCase.parse(hostile.value),
          [sentinel],
        );
        expect(hostile.calls()).toBeGreaterThan(0);
      },
    );

    it(`${schemaCase.label} rejects an ordinary getter without invoking it`, () => {
      const input = schemaCase.create();
      let calls = 0;
      Object.defineProperty(input, "apiVersion", {
        enumerable: true,
        get() {
          calls += 1;
          return "hostile-getter-value";
        },
      });
      expectFixedBoundaryFailure(
        () => schemaCase.parse(input),
        ["hostile-getter-value"],
      );
      expect(calls).toBe(0);
    });

    it.each([
      { depth: 64, expectedTrapCalls: "positive" },
      { depth: 65, expectedTrapCalls: "zero" },
    ] as const)(
      `${schemaCase.label} enforces root-zero depth $depth before descent`,
      ({ depth, expectedTrapCalls }) => {
        const input = schemaCase.create();
        const calls = addDepthProbe(input, depth);
        expectFixedBoundaryFailure(() => schemaCase.parse(input));
        if (expectedTrapCalls === "positive") {
          expect(calls()).toBeGreaterThan(0);
        } else {
          expect(calls()).toBe(0);
        }
      },
    );
  }
});

describe("ProductRecipeV2 complete public schema entrypoint boundary", () => {
  const schemaCases = [
    {
      label: "surface",
      create: () => validRecipeV2().surfaces[0],
      schema: api.applicationSurfaceV2Schema as PublicSchema<unknown>,
    },
    {
      label: "recipe",
      create: validRecipeV2,
      schema: api.productRecipeV2Schema as PublicSchema<unknown>,
    },
  ] as const;

  for (const schemaCase of schemaCases) {
    for (const entrypoint of publicSchemaEntrypoints) {
      it(`${schemaCase.label} ${entrypoint.label} never reads an own root then getter`, async () => {
        const input = schemaCase.create();
        const sentinel = `hostile-${schemaCase.label}-${entrypoint.label}-then-getter`;
        let calls = 0;
        Object.defineProperty(input, "then", {
          enumerable: true,
          get() {
            calls += 1;
            throw new Error(sentinel);
          },
        });

        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          input,
          [sentinel],
        );
        expect(calls).toBe(0);
      });

      it(`${schemaCase.label} ${entrypoint.label} redacts a revoked root Proxy`, async () => {
        const revocable = Proxy.revocable(schemaCase.create(), {});
        revocable.revoke();

        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          revocable.proxy,
        );
      });

      it(`${schemaCase.label} ${entrypoint.label} redacts a throwing reflection Proxy`, async () => {
        const sentinel = `hostile-${schemaCase.label}-${entrypoint.label}-reflection`;
        const hostile = throwingProxy(
          schemaCase.create(),
          "getPrototypeOf",
          sentinel,
        );

        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          hostile.value,
          [sentinel],
        );
        expect(hostile.calls()).toBeGreaterThan(0);
      });
    }
  }

  it("returns fresh typed Surface values with sync and async parity", async () => {
    const input = validRecipeV2().surfaces[0];
    await expectFreshParityAcrossPublicEntrypoints(
      api.applicationSurfaceV2Schema,
      input,
    );
  });

  it("returns fresh typed Recipe values with sync and async parity", async () => {
    const input = validRecipeV2();
    await expectFreshParityAcrossPublicEntrypoints(
      api.productRecipeV2Schema,
      input,
    );
  });
});

describe("ProductRecipeV2 hostile params and array budget", () => {
  const schemaCases = [
    {
      label: "surface",
      create: () => validRecipeV2().surfaces[0],
      schema: api.applicationSurfaceV2Schema as PublicSchema<unknown>,
    },
    {
      label: "recipe",
      create: validRecipeV2,
      schema: api.productRecipeV2Schema as PublicSchema<unknown>,
    },
  ] as const;

  for (const schemaCase of schemaCases) {
    for (const entrypoint of publicSchemaEntrypoints) {
      it(`${schemaCase.label} ${entrypoint.label} never reads hostile optional params`, async () => {
        const input = schemaCase.create();
        let calls = 0;
        const params = Object.defineProperties(
          {},
          Object.fromEntries(
            ["path", "errorMap", "async"].map((key) => [
              key,
              {
                enumerable: true,
                get() {
                  calls += 1;
                  throw new Error(`hostile-params-${key}`);
                },
              },
            ]),
          ),
        );

        const output = await entrypoint.invoke(
          schemaCase.schema,
          input,
          params,
        );
        if (entrypoint.returnsSafeResult) {
          const result = output as PublicSafeParseResult<unknown>;
          expect(result.success).toBe(true);
          if (!result.success) throw new Error("Expected valid safe result.");
          expectFreshTree(result.data, input);
        } else {
          expect(output).toEqual(input);
          expectFreshTree(output, input);
        }
        expect(calls).toBe(0);
      });

      it(`${schemaCase.label} ${entrypoint.label} ignores a revoked optional params Proxy`, async () => {
        const invalid = schemaCase.create();
        invalid.hostileStructuralKey = "hostile-structural-value";
        const revocable = Proxy.revocable({}, {});
        revocable.revoke();

        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          invalid,
          ["hostileStructuralKey", "hostile-structural-value"],
          revocable.proxy,
        );
      });

      it(`${schemaCase.label} ${entrypoint.label} never traps a throwing optional params Proxy`, async () => {
        const invalid = schemaCase.create();
        invalid.hostileStructuralKey = "hostile-structural-value";
        const sentinel = `hostile-${schemaCase.label}-${entrypoint.label}-params-proxy`;
        let calls = 0;
        const params = new Proxy(
          {},
          {
            get() {
              calls += 1;
              throw new Error(sentinel);
            },
          },
        );

        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          invalid,
          ["hostileStructuralKey", "hostile-structural-value", sentinel],
          params,
        );
        expect(calls).toBe(0);
      });

      it(`${schemaCase.label} ${entrypoint.label} never reads hostile params for invalid data`, async () => {
        const invalid = schemaCase.create();
        invalid.hostileStructuralKey = "hostile-structural-value";
        let calls = 0;
        const params = Object.defineProperties(
          {},
          Object.fromEntries(
            ["path", "errorMap", "async"].map((key) => [
              key,
              {
                enumerable: true,
                get() {
                  calls += 1;
                  throw new Error(`hostile-invalid-params-${key}`);
                },
              },
            ]),
          ),
        );

        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          invalid,
          ["hostileStructuralKey", "hostile-structural-value"],
          params,
        );
        expect(calls).toBe(0);
      });

      it(`${schemaCase.label} ${entrypoint.label} keeps invalid data fixed at root with benign params`, async () => {
        const invalid = schemaCase.create();
        invalid.hostileStructuralKey = "hostile-structural-value";
        await expectFixedBoundaryAtPublicEntrypoint(
          entrypoint,
          schemaCase.schema,
          invalid,
          ["hostileStructuralKey", "hostile-structural-value"],
          {
            path: ["caller", "supplied"],
            errorMap: () => ({ message: "hostile-error-map" }),
            async: false,
          },
        );
      });
    }
  }

  it.each([
    { label: "surface Array(101)", length: 101, sparse: false },
    { label: "surface sparse 20k", length: 20_000, sparse: true },
  ])("rejects $label before key or slot reflection", ({ length }) => {
    const input = validRecipeV2().surfaces[0];
    const probe = oversizedArrayProbe(length);
    input.ownedPageKeys = probe.value;

    expectFixedBoundaryFailure(() =>
      api.applicationSurfaceV2Schema.safeParse(input),
    );
    expect(probe.lengthDescriptorCalls()).toBeLessThanOrEqual(1);
    expect(probe.prototypeCalls()).toBe(0);
    expect(probe.ownKeysCalls()).toBe(0);
    expect(probe.numericDescriptorCalls()).toBe(0);
  });

  it.each([
    { label: "recipe Array(101)", length: 101 },
    { label: "recipe sparse 20k", length: 20_000 },
  ])("rejects $label before key or slot reflection", ({ length }) => {
    const input = validRecipeV2();
    const probe = oversizedArrayProbe(length);
    input.screens = probe.value;

    expectFixedBoundaryFailure(() =>
      api.productRecipeV2Schema.safeParse(input),
    );
    expect(probe.lengthDescriptorCalls()).toBeLessThanOrEqual(1);
    expect(probe.prototypeCalls()).toBe(0);
    expect(probe.ownKeysCalls()).toBe(0);
    expect(probe.numericDescriptorCalls()).toBe(0);
  });

  it("accepts and descends through a valid Surface array of length 100", () => {
    const input = validRecipeV2().surfaces[0];
    input.ownedPageKeys = Array.from({ length: 100 }, (_, index) =>
      index === 0 ? "home" : `page-${index}`,
    );
    expect(api.applicationSurfaceV2Schema.safeParse(input).success).toBe(true);
  });

  it("accepts and descends through a valid Recipe array of length 100", () => {
    const input = validRecipeV2();
    input.screens = Array.from({ length: 100 }, (_, index) => ({
      ...structuredClone(input.screens[0]),
      key: index === 0 ? "home" : `page-${index}`,
    }));
    input.surfaces[0].ownedPageKeys = input.screens.map(({ key }) => key);
    expect(api.productRecipeV2Schema.safeParse(input).success).toBe(true);
  });
});

describe("ProductRecipeV2 strict own data boundary", () => {
  it("returns a safeParse failure for a cyclic surface record", () => {
    const surface = validRecipeV2().surfaces[0];
    let calls = 0;
    surface.navigation.self = surface.navigation;
    Object.defineProperty(surface.navigation, "callerProbe", {
      enumerable: true,
      get() {
        calls += 1;
        return "hostile-value";
      },
    });
    let result: { success: boolean; error?: { message: string } } | undefined;
    expect(() => {
      result = api.applicationSurfaceV2Schema.safeParse(
        surface,
      ) as typeof result;
    }).not.toThrow();
    expect(result?.success).toBe(false);
    expect(result?.error?.message).toMatch(/plain own records and arrays/i);
    expect(result?.error?.message).not.toContain("callerProbe");
    expect(result?.error?.message).not.toContain("hostile-value");
    expect(calls).toBe(0);
  });

  it("returns a safeParse failure for a nested cyclic recipe record", () => {
    const recipe = validRecipeV2();
    let calls = 0;
    recipe.surfaces[0].navigation.self = recipe.surfaces[0].navigation;
    Object.defineProperty(recipe.surfaces[0].navigation, "callerProbe", {
      enumerable: true,
      get() {
        calls += 1;
        return "hostile-value";
      },
    });
    let result: { success: boolean; error?: { message: string } } | undefined;
    expect(() => {
      result = api.productRecipeV2Schema.safeParse(recipe) as typeof result;
    }).not.toThrow();
    expect(result?.success).toBe(false);
    expect(result?.error?.message).toMatch(/plain own records and arrays/i);
    expect(result?.error?.message).not.toContain("callerProbe");
    expect(result?.error?.message).not.toContain("hostile-value");
    expect(calls).toBe(0);
  });

  it("returns a safeParse failure for a nested cyclic recipe array", () => {
    const recipe = validRecipeV2();
    recipe.surfaces.push(recipe.surfaces as unknown as Record<string, any>);

    let result: { success: boolean; error?: { message: string } } | undefined;
    expect(() => {
      result = api.productRecipeV2Schema.safeParse(recipe) as typeof result;
    }).not.toThrow();
    expect(result?.success).toBe(false);
    expect(result?.error?.message).toMatch(/plain own records and arrays/i);
  });

  it("accepts repeated acyclic aliases by copying each path independently", () => {
    const recipe = validRecipeV2();
    recipe.flows = recipe.roles;

    const result = api.productRecipeV2Schema.safeParse(recipe);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roles).not.toBe(result.data.flows);
    }
  });

  it.each([
    {
      label: "assert",
      create: validRecipeV2,
      invoke: (input: unknown) => api.assertProductRecipeV2(input),
    },
    {
      label: "hash",
      create: validRecipeV2,
      invoke: (input: unknown) => api.hashProductRecipeV2(input),
    },
    {
      label: "dispatch",
      create: validRecipeV2,
      invoke: (input: unknown) => api.assertVersionedProductRecipe(input),
    },
    {
      label: "adapter",
      create: validRecipeV1Data,
      invoke: (input: unknown) => api.adaptProductRecipeV1DraftToV2(input),
    },
  ])(
    "rejects cyclic $label input with the fixed boundary error",
    (testCase) => {
      const input = testCase.create();
      input.surfaces[0].navigation.self = input.surfaces[0].navigation;
      const invoke = () => testCase.invoke(input);

      expect(invoke).toThrow(graph.CompositionError);
      expect(invoke).toThrow(
        "Composition record is invalid: Input must contain only plain own records and arrays.",
      );
    },
  );

  it.each(boundaryApis)(
    "%s rejects caller code before invocation",
    (_label, invoke) => {
      const recipe = validRecipeV2();
      let calls = 0;
      Object.defineProperty(recipe, "apiVersion", {
        enumerable: true,
        get() {
          calls += 1;
          return "hostile-value";
        },
      });

      expect(() => invoke(recipe)).toThrow(
        /plain own records and arrays|Composition record is invalid/i,
      );
      expect(calls).toBe(0);
    },
  );

  for (const [apiLabel, invoke] of boundaryApis) {
    it.each(hostileRecipeCases)(
      `${apiLabel} rejects $label at nested depths`,
      ({ create }) => {
        const hostile = create();
        let message = "";
        try {
          invoke(hostile.input);
        } catch (error) {
          message = String(error);
        }
        expect(message).toMatch(
          /plain own records and arrays|Composition record is invalid/i,
        );
        expect(message).not.toContain("hostile-value");
        expect(hostile.calls()).toBe(0);
      },
    );
  }

  it("applies the same boundary to the standalone surface schema", () => {
    const surface = validRecipeV2().surfaces[0];
    let calls = 0;
    Object.defineProperty(surface.navigation.items[0], "pageKey", {
      enumerable: true,
      get() {
        calls += 1;
        return "hostile-value";
      },
    });
    expect(() => api.applicationSurfaceV2Schema.parse(surface)).toThrow(
      /plain own records and arrays/i,
    );
    expect(calls).toBe(0);
  });

  it("accepts null-prototype plain records by copying them", () => {
    const input = Object.assign(Object.create(null), validRecipeV2());
    const parsed = api.productRecipeV2Schema.parse(input);
    expect(parsed).toEqual(validRecipeV2());
    expect(parsed).not.toBe(input);
  });
});

describe("Product Recipe version dispatch", () => {
  it("dispatches only the exact V1 and V2 recipe identifiers", () => {
    expect(
      api.assertVersionedProductRecipe(validRecipeV1Data()).apiVersion,
    ).toBe("factory.product-recipe/v1");
    expect(api.assertVersionedProductRecipe(validRecipeV2()).apiVersion).toBe(
      "factory.product-recipe/v2",
    );
  });

  it.each([{}, { apiVersion: "factory.product-recipe/v3" }])(
    "rejects missing or unknown versions explicitly",
    (input) => {
      expect(() => api.assertVersionedProductRecipe(input)).toThrow(
        "Product Recipe apiVersion must be 'factory.product-recipe/v1' or 'factory.product-recipe/v2'.",
      );
    },
  );

  it("rejects mismatched recipe and surface versions without guessing", () => {
    const v2 = validRecipeV2();
    v2.surfaces[0].apiVersion = "factory.application-surface/v1";
    expect(() => api.assertVersionedProductRecipe(v2)).toThrow();

    const v1 = validRecipeV1Data();
    v1.surfaces[0].apiVersion = "factory.application-surface/v2";
    v1.surfaces[0].ownedPageKeys = ["home"];
    expect(() => api.assertVersionedProductRecipe(v1)).toThrow();
  });

  it("rejects accessor-backed dispatch without invoking caller code", () => {
    const input = validRecipeV2();
    let calls = 0;
    Object.defineProperty(input, "apiVersion", {
      enumerable: true,
      get() {
        calls += 1;
        return "factory.product-recipe/v2";
      },
    });
    expect(() => api.assertVersionedProductRecipe(input)).toThrow(
      /plain own records and arrays/i,
    );
    expect(calls).toBe(0);
  });

  it.each([
    {
      label: "inherited",
      create: () => Object.create({ apiVersion: "factory.product-recipe/v2" }),
    },
    {
      label: "hidden",
      create: () => {
        const input = {};
        Object.defineProperty(input, "apiVersion", {
          value: "factory.product-recipe/v2",
          enumerable: false,
        });
        return input;
      },
    },
    {
      label: "symbol-backed",
      create: () => ({
        [Symbol("apiVersion")]: "factory.product-recipe/v2",
      }),
    },
  ])("rejects $label version dispatch before inspection", ({ create }) => {
    expect(() => api.assertVersionedProductRecipe(create())).toThrow(
      /plain own records and arrays/i,
    );
  });
});

describe("Product Recipe V1 Draft adapter", () => {
  it("derives ordered de-duplicated ownership from entry then visible navigation", () => {
    const input = validRecipeV1Data();
    input.surfaces[0].navigation.items.push({
      pageKey: "orders",
      label: "Orders",
      icon: "receipt",
    });
    input.screens.push({
      ...structuredClone(input.screens[0]),
      key: "orders",
      label: "Orders",
      recipeKey: "restaurant-customer-orders",
    });

    const adapted = api.adaptProductRecipeV1DraftToV2(input);
    expect(adapted.apiVersion).toBe("factory.product-recipe/v2");
    expect(adapted.surfaces[0]?.apiVersion).toBe(
      "factory.application-surface/v2",
    );
    expect(adapted.surfaces[0]?.ownedPageKeys).toEqual(["home", "orders"]);
  });

  it("returns a fully fresh output and never mutates the V1 input", () => {
    const input = validRecipeV1Data();
    const before = structuredClone(input);
    const first = api.adaptProductRecipeV1DraftToV2(input);
    const second = api.adaptProductRecipeV1DraftToV2(input);

    expect(first).toEqual(second);
    expectFreshTree(first, second);
    expect(input).toEqual(before);
  });

  it.each([validRecipeV2(), { apiVersion: "factory.product-recipe/v3" }])(
    "rejects every non-V1 adapter input",
    (input) => {
      expect(() => api.adaptProductRecipeV1DraftToV2(input)).toThrow(
        "Product Recipe Draft adapter accepts only 'factory.product-recipe/v1'.",
      );
    },
  );

  it("rejects adapter caller code before invocation", () => {
    const input = validRecipeV1Data();
    let calls = 0;
    Object.defineProperty(input.surfaces[0], "entryPageKey", {
      enumerable: true,
      get() {
        calls += 1;
        return "home";
      },
    });
    expect(() => api.adaptProductRecipeV1DraftToV2(input)).toThrow(
      /plain own records and arrays/i,
    );
    expect(calls).toBe(0);
  });

  it("does not expose a V2-to-V1 or down-conversion API", () => {
    const exportedNames = Object.keys(graph);
    expect(
      exportedNames.some((name) => /V2.*ToV1|down.?convert/i.test(name)),
    ).toBe(false);
  });
});
