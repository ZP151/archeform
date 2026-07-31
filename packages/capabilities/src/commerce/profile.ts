import type { ApplicationGraphV1 } from "@factory/graph/browser";

type FieldType =
  ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"];

export type LineConfigurationSelectionMode = "single" | "multiple";

export type LineConfigurationSelectionRuleV1 = {
  readonly selectionMode: string;
  readonly minimumSelections: number;
  readonly maximumSelections: number;
  readonly availableOptionCount: number;
};

export type CommerceLineConfigurationProfileProjectionV1 = {
  readonly apiVersion: "factory.commerce-line-configuration-profile/v1";
  readonly catalogEntity: string;
  readonly lineEntity: string;
  readonly optionGroupEntity: string;
  readonly optionEntity: string;
  readonly snapshotEntity: string;
  readonly customerRole: string;
  readonly merchantRole: string;
  readonly catalogRoute: string;
  readonly merchantRoute: string;
  readonly entityFields: Readonly<
    Record<string, Readonly<Record<string, FieldType>>>
  >;
  readonly relations: readonly (readonly [string, string])[];
};

const requiredEntityFields: Readonly<
  Record<string, Readonly<Record<string, FieldType>>>
> = {
  optionGroup: {
    name: "string",
    selectionMode: "enum",
    minimumSelections: "integer",
    maximumSelections: "integer",
    active: "boolean",
    sortOrder: "integer",
  },
  option: {
    label: "string",
    priceDelta: "decimal",
    available: "boolean",
    sortOrder: "integer",
  },
  snapshot: {
    label: "string",
    priceDelta: "decimal",
    quantity: "integer",
  },
};

function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

function assertRoute(value: string, label: string): void {
  if (!value.startsWith("/")) {
    throw new Error(`${label} must be a declared absolute route.`);
  }
}

function assertEntityFields(
  projection: CommerceLineConfigurationProfileProjectionV1,
  entity: string,
  kind: keyof typeof requiredEntityFields,
): void {
  const fields = projection.entityFields[entity];
  if (!fields) throw new Error(`${kind} entity '${entity}' is missing.`);
  for (const [key, expectedType] of Object.entries(
    requiredEntityFields[kind],
  )) {
    if (fields[key] !== expectedType) {
      throw new Error(
        `${kind} entity '${entity}' requires ${key}:${expectedType}.`,
      );
    }
  }
}

function hasRelation(
  projection: CommerceLineConfigurationProfileProjectionV1,
  from: string,
  to: string,
): boolean {
  return projection.relations.some(
    ([candidateFrom, candidateTo]) =>
      candidateFrom === from && candidateTo === to,
  );
}

export function assertLineConfigurationSelectionRule(
  rule: LineConfigurationSelectionRuleV1,
): asserts rule is LineConfigurationSelectionRuleV1 & {
  readonly selectionMode: LineConfigurationSelectionMode;
} {
  if (rule.selectionMode !== "single" && rule.selectionMode !== "multiple") {
    throw new Error("Selection mode must be single or multiple.");
  }
  if (!Number.isInteger(rule.minimumSelections) || rule.minimumSelections < 0) {
    throw new Error("minimumSelections must be a non-negative integer.");
  }
  if (!Number.isInteger(rule.maximumSelections) || rule.maximumSelections < 1) {
    throw new Error("maximumSelections must be a positive integer.");
  }
  if (rule.maximumSelections < rule.minimumSelections) {
    throw new Error(
      "maximumSelections must be greater than or equal to minimumSelections.",
    );
  }
  if (
    !Number.isInteger(rule.availableOptionCount) ||
    rule.availableOptionCount < rule.maximumSelections
  ) {
    throw new Error("maximumSelections must not exceed availableOptionCount.");
  }
  if (rule.selectionMode === "single" && rule.maximumSelections !== 1) {
    throw new Error(
      "single selection mode requires maximumSelections to equal 1.",
    );
  }
}

export function assertCommerceLineConfigurationProfile(
  projection: CommerceLineConfigurationProfileProjectionV1,
): void {
  if (
    projection.apiVersion !== "factory.commerce-line-configuration-profile/v1"
  ) {
    throw new Error("Unsupported commerce line-configuration profile version.");
  }
  for (const [value, label] of [
    [projection.catalogEntity, "Catalog entity"],
    [projection.lineEntity, "Line entity"],
    [projection.optionGroupEntity, "Option group entity"],
    [projection.optionEntity, "Option entity"],
    [projection.snapshotEntity, "Order-line option snapshot entity"],
    [projection.customerRole, "Customer role"],
    [projection.merchantRole, "Merchant role"],
  ] as const) {
    assertNonEmpty(value, label);
  }
  assertRoute(projection.catalogRoute, "Catalog route");
  assertRoute(projection.merchantRoute, "Merchant route");
  assertEntityFields(projection, projection.optionGroupEntity, "optionGroup");
  assertEntityFields(projection, projection.optionEntity, "option");
  assertEntityFields(projection, projection.snapshotEntity, "snapshot");

  if (
    !hasRelation(
      projection,
      projection.catalogEntity,
      projection.optionGroupEntity,
    )
  ) {
    throw new Error("Option group must be related to the catalog entity.");
  }
  if (
    !hasRelation(
      projection,
      projection.optionGroupEntity,
      projection.optionEntity,
    )
  ) {
    throw new Error("Option must be related to the option group.");
  }
  if (
    !hasRelation(projection, projection.lineEntity, projection.snapshotEntity)
  ) {
    throw new Error("Order-line snapshot must be related to the order line.");
  }
  if (
    !hasRelation(projection, projection.snapshotEntity, projection.optionEntity)
  ) {
    throw new Error("Order-line snapshot must be related to the option.");
  }
}
