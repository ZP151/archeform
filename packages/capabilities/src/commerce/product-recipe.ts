import { CompositionError, type ApplicationGraphV3 } from "@factory/graph";

export function copyStrictOwnDataEnvelope(
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  errorMessage: string,
): Readonly<Record<string, unknown>> {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new Error();
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error();
    }
    const keys = Reflect.ownKeys(input);
    if (keys.some((key) => typeof key !== "string")) {
      throw new Error();
    }
    const allowed = new Set([...requiredKeys, ...optionalKeys]);
    if (
      keys.some((key) => !allowed.has(key as string)) ||
      requiredKeys.some((key) => !keys.includes(key))
    ) {
      throw new Error();
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const copied: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new Error();
      }
      copied[key] = descriptor.value;
    }
    if (requiredKeys.some((key) => copied[key] === undefined)) {
      throw new Error();
    }
    return Object.freeze(copied);
  } catch {
    throw new CompositionError(errorMessage);
  }
}

export type ProductBindingSpec =
  | {
      readonly kind: "domain-field";
      readonly bindingKey: string;
      readonly entityKey: string;
      readonly fieldKey: string;
      readonly access: "read" | "write";
    }
  | {
      readonly kind: "flow-transition";
      readonly bindingKey: string;
      readonly flowKey: string;
      readonly from: string;
      readonly event: string;
      readonly to: string;
      readonly access: "request";
    }
  | {
      readonly kind: "policy-permission";
      readonly bindingKey: string;
      readonly roleKey: string;
      readonly resource: string;
      readonly action: string;
      readonly access: "evaluate";
    };

export const restaurantClientAuthoritativeFields = Object.freeze([
  "restaurant-principal.displayName",
  "restaurant-principal.locale",
  "restaurant-principal.marketingOptIn",
  "restaurant-location.name",
  "restaurant-location.currency",
  "restaurant-location.active",
  "restaurant-location.taxRate",
  "restaurant-location.serviceChargeRate",
  "restaurant-location.timezone",
  "restaurant-location.logoUrl",
  "restaurant-location.serviceOpen",
  "restaurant-table.code",
  "restaurant-table.number",
  "restaurant-table.capacity",
  "restaurant-table.active",
  "menu-category.name",
  "menu-category.sortOrder",
  "menu-category.active",
  "menu-item.categoryKey",
  "menu-item.name",
  "menu-item.description",
  "menu-item.price",
  "menu-item.available",
  "menu-item.preparationMinutes",
  "menu-item.imageUrl",
  "menu-option-group.menuItemId",
  "menu-option-group.name",
  "menu-option-group.selectionMode",
  "menu-option-group.minimumSelections",
  "menu-option-group.maximumSelections",
  "menu-option-group.required",
  "menu-option-group.active",
  "menu-option-group.sortOrder",
  "menu-option.optionGroupId",
  "menu-option.name",
  "menu-option.label",
  "menu-option.priceDelta",
  "menu-option.available",
  "menu-option.sortOrder",
  "order.fulfilmentType",
  "order.orderNote",
  "order.priority",
  "order-line.quantity",
  "order-line.lineNote",
  "order-line.modifiers",
  "order-line-option.quantity",
  "payment-attempt.method",
] as const);

export function fieldAuthoritiesFor(
  entities: ApplicationGraphV3["domain"]["entities"],
): ApplicationGraphV3["fieldAuthorities"] {
  const client = new Set<string>(restaurantClientAuthoritativeFields);
  return entities.flatMap((entity) =>
    entity.fields.map((field) => ({
      entityKey: entity.key,
      fieldKey: field.key,
      authority: client.has(`${entity.key}.${field.key}`)
        ? ("client" as const)
        : ("server" as const),
    })),
  );
}

export function bindingTarget(spec: ProductBindingSpec): string {
  if (spec.kind === "domain-field") {
    return `graph.domain.${spec.entityKey}.${spec.fieldKey}`;
  }
  if (spec.kind === "flow-transition") {
    return `graph.flow.${spec.flowKey}.${spec.from}.${spec.event}.${spec.to}`;
  }
  return `graph.policy.${spec.roleKey}.${spec.resource}.${spec.action}`;
}
