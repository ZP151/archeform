import { isDeepStrictEqual } from "node:util";

import {
  assertApplicationGraphV3,
  type ApplicationGraphV3,
} from "@factory/graph";

const INVALID_REQUEST = "Template Draft request is invalid.";
const REVISION_MOVED = "Template Draft revision moved; reload before editing.";
const GRAPH_KEY = /^[a-z][a-z0-9-]*$/;
const INPUT_KEYS = ["baseDraftRevisionId", "mode"] as const;

export type AppendTemplateExperienceThemeRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly mode: "dark";
};

export type TemplateExperienceThemeEditResult =
  AppendTemplateExperienceThemeRevisionInput & {
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

export function captureTemplateExperienceThemeRevisionInput(
  input: unknown,
): AppendTemplateExperienceThemeRevisionInput {
  const body = exactInput(input);
  if (body.mode !== "dark") return invalidRequest();
  return Object.freeze({
    baseDraftRevisionId: graphKey(body.baseDraftRevisionId),
    mode: "dark" as const,
  });
}

export function applyTemplateExperienceThemeEdit(
  graphInput: unknown,
  input: unknown,
): TemplateExperienceThemeEditResult {
  return applyCapturedTemplateExperienceThemeEdit(
    graphInput,
    captureTemplateExperienceThemeRevisionInput(input),
  );
}

export function applyCapturedTemplateExperienceThemeEdit(
  graphInput: unknown,
  command: AppendTemplateExperienceThemeRevisionInput,
): TemplateExperienceThemeEditResult {
  try {
    const graph = assertApplicationGraphV3(graphInput);
    if (graph.experience.theme.mode === "dark") {
      throw new Error(REVISION_MOVED);
    }
    if (graph.experience.theme.mode !== "light") return invalidRequest();

    const candidate = structuredClone(graph);
    candidate.experience.theme.mode = "dark";
    const restored = structuredClone(candidate);
    restored.experience.theme.mode = "light";
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
