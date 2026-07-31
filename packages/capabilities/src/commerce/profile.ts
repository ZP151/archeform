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

function bindingTarget(
  bindings: Readonly<Record<string, unknown>>,
  bindingKey: string,
  model: "domain" | "page" | "policy",
): string {
  const binding = bindings[bindingKey];
  if (
    !binding ||
    typeof binding !== "object" ||
    Array.isArray(binding) ||
    !Object.hasOwn(binding, "graphSymbol") ||
    typeof (binding as Readonly<Record<string, unknown>>).graphSymbol !==
      "string"
  ) {
    throw new Error(
      `Line configuration binding '${bindingKey}' must be an exact Graph symbol.`,
    );
  }

  const graphSymbol = (binding as Readonly<Record<string, unknown>>)
    .graphSymbol as string;
  const prefix = `graph.${model}.`;
  const target = graphSymbol.startsWith(prefix)
    ? graphSymbol.slice(prefix.length)
    : "";
  if (!target) {
    throw new Error(
      `Line configuration binding '${bindingKey}' must reference graph.${model}.`,
    );
  }
  return target;
}

function pageRoute(graph: ApplicationGraphV1, pageId: string): string {
  const page = graph.page.pages.find(({ id }) => id === pageId);
  if (!page) {
    throw new Error(
      `Line configuration page binding '${pageId}' does not exist in the Graph.`,
    );
  }
  return page.route;
}

function snapshotEntity(
  graph: ApplicationGraphV1,
  lineEntity: string,
  optionEntity: string,
): string {
  const candidates = [
    ...new Set(
      graph.domain.relations
        .filter(({ to }) => to === lineEntity)
        .map(({ from }) => from)
        .filter((candidate) =>
          graph.domain.relations.some(
            ({ from, to }) => from === candidate && to === optionEntity,
          ),
        ),
    ),
  ];
  if (candidates.length !== 1) {
    throw new Error(
      "Line configuration requires exactly one order-line option snapshot entity.",
    );
  }
  return candidates[0];
}

/**
 * Projects a generic Application Graph into the small semantic surface owned
 * by the versioned line-configuration package. The package infers its
 * immutable snapshot entity from declared Graph relations instead of adding a
 * profile-specific parameter.
 */
export function createCommerceLineConfigurationProfileProjection(
  graph: ApplicationGraphV1,
  bindings: Readonly<Record<string, unknown>>,
): CommerceLineConfigurationProfileProjectionV1 {
  const catalogEntity = bindingTarget(bindings, "catalogEntity", "domain");
  const lineEntity = bindingTarget(bindings, "lineEntity", "domain");
  const optionGroupEntity = bindingTarget(
    bindings,
    "optionGroupEntity",
    "domain",
  );
  const optionEntity = bindingTarget(bindings, "optionEntity", "domain");
  const catalogPage = bindingTarget(bindings, "catalogPage", "page");
  const merchantPage = bindingTarget(bindings, "merchantPage", "page");
  const customerRole = bindingTarget(bindings, "customerRole", "policy");
  const merchantRole = bindingTarget(bindings, "merchantRole", "policy");
  const entityFields = Object.fromEntries(
    graph.domain.entities.map((entity) => [
      entity.key,
      Object.fromEntries(
        entity.fields.map((field) => [field.key, field.type] as const),
      ),
    ]),
  );
  const relations: [string, string][] = [];
  for (const relation of graph.domain.relations) {
    relations.push([relation.from, relation.to], [relation.to, relation.from]);
  }

  return {
    apiVersion: "factory.commerce-line-configuration-profile/v1",
    catalogEntity,
    lineEntity,
    optionGroupEntity,
    optionEntity,
    snapshotEntity: snapshotEntity(graph, lineEntity, optionEntity),
    customerRole,
    merchantRole,
    catalogRoute: pageRoute(graph, catalogPage),
    merchantRoute: pageRoute(graph, merchantPage),
    entityFields,
    relations,
  };
}
