import { isDeepStrictEqual } from "node:util";

import {
  assertApplicationGraphV3,
  type ApplicationGraphV3,
} from "@factory/graph";

const INVALID_REQUEST = "Template Draft request is invalid.";
const REVISION_MOVED = "Template Draft revision moved; reload before editing.";
const GRAPH_KEY = /^[a-z][a-z0-9-]*$/;

export type TemplatePageBlockOrderSurfaceKey =
  "customer-mobile" | "merchant-desktop";

export type AppendTemplatePageBlockOrderRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly surfaceKey: TemplatePageBlockOrderSurfaceKey;
  readonly pageId: string;
  readonly regionKey: "main";
  readonly blockIds: readonly string[];
};

export type TemplatePageBlockOrderEditResult =
  AppendTemplatePageBlockOrderRevisionInput & {
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
    const allowed = new Set([
      "baseDraftRevisionId",
      "surfaceKey",
      "pageId",
      "regionKey",
      "blockIds",
    ]);
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== allowed.size ||
      keys.some((key) => typeof key !== "string" || !allowed.has(key))
    ) {
      return invalidRequest();
    }
    const output: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      if (typeof key !== "string") return invalidRequest();
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor?.enumerable !== true || !("value" in descriptor)) {
        return invalidRequest();
      }
      output[key] = descriptor.value;
    }
    return output;
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

function denseBlockIds(input: unknown): readonly string[] {
  try {
    if (!Array.isArray(input)) {
      return invalidRequest();
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    const length = lengthDescriptor?.value;
    if (
      !lengthDescriptor ||
      !("value" in lengthDescriptor) ||
      lengthDescriptor.enumerable !== false ||
      lengthDescriptor.configurable !== false ||
      lengthDescriptor.writable !== true ||
      typeof length !== "number" ||
      !Number.isSafeInteger(length) ||
      length < 2 ||
      length > 20
    ) {
      return invalidRequest();
    }
    if (Object.getPrototypeOf(input) !== Array.prototype) {
      return invalidRequest();
    }
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== length + 1 ||
      keys.some((key) => typeof key !== "string") ||
      !keys.includes("length") ||
      Array.from({ length }, (_, index) => String(index)).some(
        (key) => !keys.includes(key),
      )
    ) {
      return invalidRequest();
    }
    const values: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (descriptor?.enumerable !== true || !("value" in descriptor)) {
        return invalidRequest();
      }
      values.push(graphKey(descriptor.value));
    }
    if (
      keys.some(
        (key) =>
          typeof key !== "string" ||
          (key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key)),
      ) ||
      new Set(values).size !== values.length
    ) {
      return invalidRequest();
    }
    return Object.freeze(values);
  } catch {
    return invalidRequest();
  }
}

export function captureTemplatePageBlockOrderRevisionInput(
  input: unknown,
): AppendTemplatePageBlockOrderRevisionInput {
  const body = exactInput(input);
  const surfaceKey = body.surfaceKey;
  if (surfaceKey !== "customer-mobile" && surfaceKey !== "merchant-desktop") {
    return invalidRequest();
  }
  if (body.regionKey !== "main") return invalidRequest();
  return Object.freeze({
    baseDraftRevisionId: graphKey(body.baseDraftRevisionId),
    surfaceKey,
    pageId: graphKey(body.pageId),
    regionKey: "main" as const,
    blockIds: denseBlockIds(body.blockIds),
  });
}

export function applyTemplatePageBlockOrderEdit(
  graphInput: unknown,
  input: unknown,
): TemplatePageBlockOrderEditResult {
  return applyCapturedTemplatePageBlockOrderEdit(
    graphInput,
    captureTemplatePageBlockOrderRevisionInput(input),
  );
}

export function applyCapturedTemplatePageBlockOrderEdit(
  graphInput: unknown,
  command: AppendTemplatePageBlockOrderRevisionInput,
): TemplatePageBlockOrderEditResult {
  const graph = assertApplicationGraphV3(graphInput);
  const matches = graph.page.pages.filter((page) => page.id === command.pageId);
  const page = matches[0];
  const region = page?.recipe.regions[0];
  const currentIds = page?.blocks.map(({ id }) => id) ?? [];
  if (
    matches.length !== 1 ||
    !page ||
    page.surfaceKey !== command.surfaceKey ||
    page.recipe.regions.length !== 1 ||
    region?.key !== command.regionKey ||
    currentIds.length !== command.blockIds.length ||
    new Set(currentIds).size !== currentIds.length ||
    !isDeepStrictEqual(region.blockIds, currentIds) ||
    command.blockIds.some((id) => !currentIds.includes(id)) ||
    new Set(command.blockIds).size !== command.blockIds.length
  ) {
    return invalidRequest();
  }
  if (isDeepStrictEqual(command.blockIds, currentIds)) {
    throw new Error(REVISION_MOVED);
  }

  const blocksById = new Map(page.blocks.map((block) => [block.id, block]));
  const next = structuredClone(graph);
  const nextPage = next.page.pages.find(({ id }) => id === command.pageId);
  const nextRegion = nextPage?.recipe.regions[0];
  if (!nextPage || !nextRegion) return invalidRequest();
  nextPage.blocks = command.blockIds.map((id) =>
    structuredClone(blocksById.get(id)!),
  );
  nextRegion.blockIds = [...command.blockIds];
  const asserted = assertApplicationGraphV3(next);

  const restored = structuredClone(asserted);
  const restoredPage = restored.page.pages.find(
    ({ id }) => id === command.pageId,
  );
  if (!restoredPage) return invalidRequest();
  const restoredById = new Map(
    restoredPage.blocks.map((block) => [block.id, block]),
  );
  restoredPage.blocks = currentIds.map((id) => restoredById.get(id)!);
  restoredPage.recipe.regions[0]!.blockIds = [...currentIds];
  if (!isDeepStrictEqual(restored, graph)) return invalidRequest();

  return {
    ...command,
    blockIds: [...command.blockIds],
    graph: asserted,
  };
}
