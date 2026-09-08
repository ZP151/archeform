import {
  digestJson,
  safeBusinessTextSchema,
  type ApplicationGraphV3,
} from "@factory/graph";

export interface RestaurantMenuParametersV1 {
  readonly apiVersion: "factory.restaurant-menu-parameters/v1";
  readonly mode: "canonical-default" | "provided";
  readonly currency: "USD";
  readonly items: readonly {
    readonly name: string;
    readonly description: string | null;
    readonly priceMinor: number;
  }[];
}

function invalid(): never {
  throw new Error("Restaurant menu parameters are invalid.");
}
function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return invalid();
  const own = Reflect.ownKeys(value);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    return invalid();
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      return invalid();
    result[key] = descriptor.value;
  }
  return result;
}
function businessText(value: unknown, maximum: number): string {
  if (typeof value !== "string") return invalid();
  const normalized = value.normalize("NFC");
  if (
    normalized.trim() !== normalized ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    !safeBusinessTextSchema.max(maximum).safeParse(normalized).success
  )
    return invalid();
  return normalized;
}
export function canonicalRestaurantMenuParameters(): RestaurantMenuParametersV1 {
  return {
    apiVersion: "factory.restaurant-menu-parameters/v1",
    mode: "canonical-default",
    currency: "USD",
    items: [],
  };
}
export function parseRestaurantMenuParameters(
  input: unknown,
): RestaurantMenuParametersV1 {
  const value = record(input, ["apiVersion", "mode", "currency", "items"]);
  if (
    value.apiVersion !== "factory.restaurant-menu-parameters/v1" ||
    !["canonical-default", "provided"].includes(value.mode as string) ||
    value.currency !== "USD"
  )
    return invalid();
  const items = value.items;
  if (
    !Array.isArray(items) ||
    Object.getPrototypeOf(items) !== Array.prototype ||
    items.length > 100 ||
    (value.mode === "provided" ? items.length < 1 : items.length !== 0) ||
    Reflect.ownKeys(items).length !== items.length + 1
  )
    return invalid();
  const parsed: RestaurantMenuParametersV1["items"][number][] = [];
  for (let i = 0; i < items.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(items, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      return invalid();
    const item = record(descriptor.value, [
      "name",
      "description",
      "priceMinor",
    ]);
    if (
      typeof item.priceMinor !== "number" ||
      !Number.isInteger(item.priceMinor) ||
      item.priceMinor < 0 ||
      item.priceMinor > 10_000_000
    )
      return invalid();
    parsed.push({
      name: businessText(item.name, 120),
      description:
        item.description === null ? null : businessText(item.description, 1000),
      priceMinor: item.priceMinor === 0 ? 0 : item.priceMinor,
    });
  }
  return {
    apiVersion: "factory.restaurant-menu-parameters/v1",
    mode: value.mode as RestaurantMenuParametersV1["mode"],
    currency: "USD",
    items: parsed,
  };
}
export function hashRestaurantMenuParameters(input: unknown): string {
  return digestJson(parseRestaurantMenuParameters(input));
}
export function isRestaurantMenuSeed(entity: string): boolean {
  return ["menu-item", "menu-option-group", "menu-option"].includes(entity);
}
export function bindRestaurantMenuParameters(
  graph: ApplicationGraphV3,
  input: unknown,
): ApplicationGraphV3 {
  const parameters = parseRestaurantMenuParameters(input);
  const bound = structuredClone(graph);
  if (parameters.mode === "canonical-default") return bound;
  if (
    bound.seedScenarios.length !== 1 ||
    bound.seedScenarios[0]?.key !== "fine-dining-service" ||
    !bound.domain.seedData
  )
    return invalid();
  const records = parameters.items.map((item, index) => ({
    entity: "menu-item",
    id: `menu-item-${String(index + 1).padStart(3, "0")}`,
    values: {
      categoryKey: "mains",
      name: item.name,
      description: item.description ?? "Description not provided.",
      price: item.priceMinor / 100,
      available: true,
      stock: 100,
      preparationMinutes: 15,
      imageUrl: "#",
    },
  }));
  const seeds = bound.domain.seedData;
  const first = seeds.findIndex((seed) => isRestaurantMenuSeed(seed.entity));
  if (first < 0) return invalid();
  bound.domain.seedData = seeds.flatMap((seed, index) =>
    index === first ? records : isRestaurantMenuSeed(seed.entity) ? [] : [seed],
  );
  bound.seedScenarios[0].records = bound.domain.seedData.map(
    ({ entity, values }) => ({
      entityKey: entity,
      values: structuredClone(values),
    }),
  );
  return bound;
}
