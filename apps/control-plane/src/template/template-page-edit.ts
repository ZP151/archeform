import {
  assertApplicationGraphV3,
  type ApplicationGraphV3,
} from "@factory/graph";

const INVALID_REQUEST = "Template Draft request is invalid.";

export type TemplatePageSurfaceKey = "customer-mobile" | "merchant-desktop";

export type AppendTemplatePageRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly surfaceKey: TemplatePageSurfaceKey;
  readonly pageId: string;
  readonly title: string;
};

export type TemplatePageTitleEditResult = AppendTemplatePageRevisionInput & {
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
      "title",
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

function boundedIdentifier(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.length > maximum ||
    !/^[a-z][a-z0-9-]{4,}$/.test(value)
  ) {
    return invalidRequest();
  }
  return value;
}

function pageTitle(value: unknown): string {
  if (typeof value !== "string") return invalidRequest();
  const title = value.trim();
  if (
    title.length < 2 ||
    title.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(title)
  ) {
    return invalidRequest();
  }
  return title;
}

export function captureTemplatePageRevisionInput(
  input: unknown,
): AppendTemplatePageRevisionInput {
  const body = exactInput(input);
  const baseDraftRevisionId = boundedIdentifier(body.baseDraftRevisionId, 80);
  const surfaceKey = body.surfaceKey;
  if (surfaceKey !== "customer-mobile" && surfaceKey !== "merchant-desktop") {
    return invalidRequest();
  }
  const pageId = boundedIdentifier(body.pageId, 128);
  const title = pageTitle(body.title);
  return { baseDraftRevisionId, surfaceKey, pageId, title };
}

export function applyTemplatePageTitleEdit(
  graphInput: unknown,
  input: unknown,
): TemplatePageTitleEditResult {
  const command = captureTemplatePageRevisionInput(input);
  return applyCapturedTemplatePageTitleEdit(graphInput, command);
}

export function applyCapturedTemplatePageTitleEdit(
  graphInput: unknown,
  command: AppendTemplatePageRevisionInput,
): TemplatePageTitleEditResult {
  const graph = assertApplicationGraphV3(graphInput);
  const matches = graph.page.pages.filter((page) => page.id === command.pageId);
  if (
    matches.length !== 1 ||
    matches[0]?.surfaceKey !== command.surfaceKey ||
    matches[0].title === command.title
  ) {
    return invalidRequest();
  }
  const next = structuredClone(graph);
  const page = next.page.pages.find(
    (candidate) => candidate.id === command.pageId,
  );
  if (!page) return invalidRequest();
  page.title = command.title;
  return {
    ...command,
    graph: assertApplicationGraphV3(next),
  };
}
