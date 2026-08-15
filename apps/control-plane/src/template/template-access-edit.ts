import { isDeepStrictEqual } from "node:util";

import {
  assertApplicationGraphV3,
  type ApplicationGraphV3,
} from "@factory/graph";

const INVALID_REQUEST = "Template Draft request is invalid.";
const GRAPH_KEY = /^[a-z][a-zA-Z0-9-]*$/;
const INPUT_KEYS = ["baseDraftRevisionId", "roleKey"] as const;
const CANONICAL_ROLES = ["customer", "cashier", "kitchen", "manager"] as const;
const GRANTED_RESOURCE = "table-session";
const GRANTED_ACTIONS = ["read"] as const;

export type AppendTemplateAccessRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly roleKey: string;
};

export type TemplateAccessEditResult = AppendTemplateAccessRevisionInput & {
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

export function captureTemplateAccessRevisionInput(
  input: unknown,
): AppendTemplateAccessRevisionInput {
  const body = exactInput(input);
  return Object.freeze({
    baseDraftRevisionId: graphKey(body.baseDraftRevisionId),
    roleKey: graphKey(body.roleKey),
  });
}

export function applyTemplateAccessEdit(
  graphInput: unknown,
  input: unknown,
): TemplateAccessEditResult {
  return applyCapturedTemplateAccessEdit(
    graphInput,
    captureTemplateAccessRevisionInput(input),
  );
}

export function applyCapturedTemplateAccessEdit(
  graphInput: unknown,
  command: AppendTemplateAccessRevisionInput,
): TemplateAccessEditResult {
  try {
    const graph = assertApplicationGraphV3(graphInput);
    if (
      graph.policy.roles.includes(command.roleKey) ||
      CANONICAL_ROLES.some((role) => !graph.policy.roles.includes(role))
    ) {
      return invalidRequest();
    }

    const candidate = structuredClone(graph);
    candidate.policy.roles.push(command.roleKey);
    candidate.policy.permissions.push({
      role: command.roleKey,
      resource: GRANTED_RESOURCE,
      actions: [...GRANTED_ACTIONS],
    });

    const restored = structuredClone(candidate);
    restored.policy.roles = graph.policy.roles.slice();
    restored.policy.permissions = graph.policy.permissions.slice();
    if (!isDeepStrictEqual(restored, graph)) return invalidRequest();

    return {
      ...command,
      graph: assertApplicationGraphV3(candidate),
    };
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_REQUEST)
      throw error;
    return invalidRequest();
  }
}
