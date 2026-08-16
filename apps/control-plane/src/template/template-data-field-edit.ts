import { isDeepStrictEqual } from "node:util";

import {
  assertApplicationGraphV3,
  type ApplicationGraphV3,
} from "@factory/graph";

const INVALID_REQUEST = "Template Draft request is invalid.";
const REVISION_MOVED = "Template Draft revision moved; reload before editing.";
const GRAPH_KEY = /^[a-z][a-z0-9-]*$/;
const INPUT_KEYS = [
  "baseDraftRevisionId",
  "entityKey",
  "recordId",
  "fieldKey",
  "value",
] as const;

export type AppendTemplateDataFieldRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly entityKey: "menu-item";
  readonly recordId: "margherita-pizza";
  readonly fieldKey: "name";
  readonly value: string;
};

export type TemplateDataFieldEditResult =
  AppendTemplateDataFieldRevisionInput & {
    readonly graph: ApplicationGraphV3;
  };

function invalidRequest(): never {
  throw new Error(INVALID_REQUEST);
}

function exactInput(input: unknown): Record<string, unknown> {
  try {
    if (
      input === null ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.getPrototypeOf(input) !== Object.prototype
    ) {
      return invalidRequest();
    }
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== INPUT_KEYS.length ||
      keys.some(
        (key) =>
          typeof key !== "string" ||
          !INPUT_KEYS.includes(key as (typeof INPUT_KEYS)[number]),
      )
    ) {
      return invalidRequest();
    }
    const captured: Record<string, unknown> = Object.create(null);
    for (const key of INPUT_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor?.enumerable !== true || !("value" in descriptor)) {
        return invalidRequest();
      }
      captured[key] = descriptor.value;
    }
    return captured;
  } catch {
    return invalidRequest();
  }
}

function graphKey(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    !GRAPH_KEY.test(value)
  ) {
    return invalidRequest();
  }
  return value;
}

function fieldValue(value: unknown): string {
  if (typeof value !== "string") return invalidRequest();
  const normalized = value.trim();
  if (
    normalized.length < 2 ||
    normalized.length > 120 ||
    /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    return invalidRequest();
  }
  return normalized;
}

export function captureTemplateDataFieldRevisionInput(
  input: unknown,
): AppendTemplateDataFieldRevisionInput {
  const body = exactInput(input);
  if (
    body.entityKey !== "menu-item" ||
    body.recordId !== "margherita-pizza" ||
    body.fieldKey !== "name"
  ) {
    return invalidRequest();
  }
  return Object.freeze({
    baseDraftRevisionId: graphKey(body.baseDraftRevisionId),
    entityKey: "menu-item" as const,
    recordId: "margherita-pizza" as const,
    fieldKey: "name" as const,
    value: fieldValue(body.value),
  });
}

function assertMirror(graph: ApplicationGraphV3): void {
  const seedData = graph.domain.seedData;
  const scenario = graph.seedScenarios[0];
  if (
    !seedData ||
    graph.seedScenarios.length !== 1 ||
    scenario?.key !== "fine-dining-service" ||
    scenario.records.length !== seedData.length ||
    seedData.some(
      (seed, index) =>
        scenario.records[index]?.entityKey !== seed.entity ||
        !isDeepStrictEqual(scenario.records[index]?.values, seed.values),
    )
  ) {
    return invalidRequest();
  }
}

function assertDataAuthority(graph: ApplicationGraphV3): number {
  assertMirror(graph);
  const seedData = graph.domain.seedData!;
  const seedIndexes = seedData.flatMap((seed, index) =>
    seed.entity === "menu-item" && seed.id === "margherita-pizza"
      ? [index]
      : [],
  );
  const entities = graph.domain.entities.filter(
    ({ key }) => key === "menu-item",
  );
  const fields = entities[0]?.fields.filter(({ key }) => key === "name") ?? [];
  const authorities = graph.fieldAuthorities.filter(
    ({ entityKey, fieldKey }) =>
      entityKey === "menu-item" && fieldKey === "name",
  );
  const bindings = graph.bindingPolicies.filter(
    (policy) =>
      policy.kind === "domain-field" &&
      policy.entityKey === "menu-item" &&
      policy.fieldKey === "name",
  );
  const expectedBindings = [
    "customer-dish-detail/dish-configurator/read",
    "customer-home/home-items/read",
    "customer-menu/menu-items/read",
    "merchant-menu-management/merchant-menu-table/write",
  ];
  const actualBindings = bindings
    .map((policy) => {
      if (
        policy.kind !== "domain-field" ||
        policy.bindingKey !== "name" ||
        policy.authority !== "client"
      ) {
        return "invalid";
      }
      return `${policy.pageId}/${policy.blockId}/${policy.access}`;
    })
    .sort();
  const managerCanUpdate = graph.policy.permissions.some(
    ({ role, resource, actions }) =>
      role === "manager" &&
      resource === "menu-item" &&
      actions.includes("update"),
  );
  if (
    seedIndexes.length !== 1 ||
    typeof seedData[seedIndexes[0]!]?.values.name !== "string" ||
    entities.length !== 1 ||
    fields.length !== 1 ||
    fields[0]?.type !== "string" ||
    fields[0].required !== true ||
    authorities.length !== 1 ||
    authorities[0]?.authority !== "client" ||
    !isDeepStrictEqual(actualBindings, expectedBindings) ||
    !managerCanUpdate
  ) {
    return invalidRequest();
  }
  return seedIndexes[0]!;
}

export function applyTemplateDataFieldEdit(
  graphInput: unknown,
  input: unknown,
): TemplateDataFieldEditResult {
  return applyCapturedTemplateDataFieldEdit(
    graphInput,
    captureTemplateDataFieldRevisionInput(input),
  );
}

export function applyCapturedTemplateDataFieldEdit(
  graphInput: unknown,
  command: AppendTemplateDataFieldRevisionInput,
): TemplateDataFieldEditResult {
  try {
    const graph = assertApplicationGraphV3(graphInput);
    const seedIndex = assertDataAuthority(graph);
    const scenario = graph.seedScenarios[0]!;
    const seed = graph.domain.seedData![seedIndex]!;
    const scenarioRecord = scenario.records[seedIndex]!;
    if (seed.values.name === command.value) {
      throw new Error(REVISION_MOVED);
    }
    const baseSeedName = seed.values.name;
    const baseScenarioName = scenarioRecord.values.name;
    const candidate = structuredClone(graph);
    candidate.domain.seedData![seedIndex]!.values.name = command.value;
    candidate.seedScenarios[0]!.records[seedIndex]!.values.name = command.value;
    assertMirror(candidate);

    const restored = structuredClone(candidate);
    restored.domain.seedData![seedIndex]!.values.name = baseSeedName;
    restored.seedScenarios[0]!.records[seedIndex]!.values.name =
      baseScenarioName;
    if (!isDeepStrictEqual(restored, graph)) return invalidRequest();

    return {
      ...command,
      graph: assertApplicationGraphV3(candidate),
    };
  } catch (error) {
    if (error instanceof Error && error.message === REVISION_MOVED) throw error;
    return invalidRequest();
  }
}
