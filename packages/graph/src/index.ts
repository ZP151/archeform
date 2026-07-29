import { createHash } from "node:crypto";

import { z } from "zod";

import {
  applicationGraphSchema,
  assertValidApplicationGraph,
  GraphSemanticError,
  type ApplicationGraphV1,
} from "./model.js";

export * from "./model.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

/** A stable, content-addressable hash of a valid Graph. Array order is intentional Graph meaning. */
export function hashApplicationGraph(input: unknown): string {
  const graph = assertValidApplicationGraph(input);
  const canonicalJson = JSON.stringify(canonicalize(graph));
  return `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
}

export const publishedGraphExchangeSchema = z
  .object({
    apiVersion: z.literal("factory.published-graph-exchange/v1"),
    kind: z.literal("published-application-graph"),
    publishedRevision: z
      .object({
        revisionNumber: z.number().int().positive(),
        graphHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      })
      .strict(),
    graph: applicationGraphSchema,
  })
  .strict();

export type PublishedGraphExchangeV1 = z.infer<
  typeof publishedGraphExchangeSchema
>;

export class GraphExchangeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GraphExchangeError";
  }
}

/**
 * A Graph-first Git payload. It contains no generated source, provider
 * credentials, raw prompts, or compiler artifacts.
 */
export function createPublishedGraphExchange(
  input: unknown,
  revisionNumber: number,
): PublishedGraphExchangeV1 {
  const graph = assertValidApplicationGraph(input);
  if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
    throw new GraphExchangeError(
      "Published Graph exchange requires a positive revision number.",
    );
  }
  return {
    apiVersion: "factory.published-graph-exchange/v1",
    kind: "published-application-graph",
    publishedRevision: {
      revisionNumber,
      graphHash: hashApplicationGraph(graph),
    },
    graph,
  };
}

export function parsePublishedGraphExchange(
  input: unknown,
): PublishedGraphExchangeV1 {
  try {
    const exchange = publishedGraphExchangeSchema.parse(input);
    if (
      exchange.publishedRevision.graphHash !==
      hashApplicationGraph(exchange.graph)
    ) {
      throw new GraphExchangeError(
        "Published Graph exchange digest does not match its Graph.",
      );
    }
    return exchange;
  } catch (error) {
    if (error instanceof GraphExchangeError) throw error;
    throw new GraphExchangeError("Published Graph exchange is invalid.");
  }
}

const graphDiffOperationSchema = z
  .object({
    op: z.enum(["add", "replace", "remove"]),
    path: z.string().min(1).startsWith("/"),
    value: z.unknown().optional(),
  })
  .superRefine((operation, context) => {
    if (operation.op !== "remove" && !("value" in operation)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add and replace operations require a value.",
      });
    }
  });

export const graphDiffSchema = z.object({
  apiVersion: z.literal("factory.graph-diff/v1"),
  baseGraphHash: z
    .string()
    .regex(/^sha256:[a-f0-9]{64}$/)
    .optional(),
  operations: z.array(graphDiffOperationSchema).min(1).max(100),
});

export type GraphDiffV1 = z.infer<typeof graphDiffSchema>;

export type DraftRevisionV1 = {
  id: string;
  status: "draft" | "published";
  revision: number;
  graph: ApplicationGraphV1;
};

export class GraphDiffError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GraphDiffError";
  }
}

export function createDraftRevision(
  graph: unknown,
  id: string,
): DraftRevisionV1 {
  return {
    id,
    status: "draft",
    revision: 1,
    graph: assertValidApplicationGraph(graph),
  };
}

function decodePointer(path: string): string[] {
  return path
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function assertPermittedDiffPath(path: string): string[] {
  const segments = decodePointer(path);
  if (
    segments.some((segment) =>
      ["__proto__", "constructor", "prototype"].includes(segment),
    )
  ) {
    throw new GraphDiffError(
      "Graph Diff paths cannot reference prototype keys.",
    );
  }
  const [root, second] = segments;
  if (
    ![
      "page",
      "domain",
      "policy",
      "flow",
      "integration",
      "experience",
      "metadata",
    ].includes(root)
  ) {
    throw new GraphDiffError(
      `Graph Diff path '${path}' is outside the mutable Application Graph.`,
    );
  }
  if (root === "metadata" && second !== "name") {
    throw new GraphDiffError(
      "Graph Diff may update metadata.name but never Graph identity or workspace scope.",
    );
  }
  return segments;
}

function asContainer(
  value: unknown,
  path: string,
): Record<string, unknown> | unknown[] {
  if (!value || typeof value !== "object") {
    throw new GraphDiffError(
      `Graph Diff path '${path}' does not resolve to a container.`,
    );
  }
  return value as Record<string, unknown> | unknown[];
}

function resolveParent(
  root: Record<string, unknown>,
  segments: readonly string[],
  path: string,
): [Record<string, unknown> | unknown[], string] {
  if (segments.length === 0) {
    throw new GraphDiffError("Graph Diff cannot replace the Graph root.");
  }
  let current: unknown = root;
  for (const segment of segments.slice(0, -1)) {
    const container = asContainer(current, path);
    if (Array.isArray(container)) {
      const index = Number(segment);
      if (
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= container.length
      ) {
        throw new GraphDiffError(
          `Graph Diff array index '${segment}' is invalid at '${path}'.`,
        );
      }
      current = container[index];
    } else {
      if (!(segment in container)) {
        throw new GraphDiffError(`Graph Diff path '${path}' does not exist.`);
      }
      current = container[segment];
    }
  }
  return [asContainer(current, path), segments.at(-1)!];
}

function setOperation(
  target: Record<string, unknown> | unknown[],
  key: string,
  value: unknown,
  path: string,
  appendAllowed: boolean,
): void {
  if (Array.isArray(target)) {
    if (key === "-" && appendAllowed) {
      target.push(value);
      return;
    }
    const index = Number(key);
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index > target.length ||
      (!appendAllowed && index === target.length)
    ) {
      throw new GraphDiffError(
        `Graph Diff array index '${key}' is invalid at '${path}'.`,
      );
    }
    if (appendAllowed) target.splice(index, 0, value);
    else target[index] = value;
    return;
  }
  if (!appendAllowed && !(key in target)) {
    throw new GraphDiffError(
      `Graph Diff path '${path}' does not exist for replacement.`,
    );
  }
  target[key] = value;
}

function removeOperation(
  target: Record<string, unknown> | unknown[],
  key: string,
  path: string,
): void {
  if (Array.isArray(target)) {
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= target.length) {
      throw new GraphDiffError(
        `Graph Diff array index '${key}' is invalid at '${path}'.`,
      );
    }
    target.splice(index, 1);
    return;
  }
  if (!(key in target)) {
    throw new GraphDiffError(
      `Graph Diff path '${path}' does not exist for removal.`,
    );
  }
  delete target[key];
}

/**
 * Applies a narrow JSON-Patch-like Graph proposal. A proposal can only target the
 * mutable portion of a Draft revision; published revisions and Graph identity are
 * intentionally rejected before any data is changed.
 */
export function applyGraphDiffToDraft(
  draft: DraftRevisionV1,
  input: unknown,
): DraftRevisionV1 {
  if (draft.status !== "draft") {
    throw new GraphSemanticError([
      {
        code: "revision.not_draft",
        message: "Only mutable Draft revisions accept Graph Diffs.",
        path: [],
      },
    ]);
  }
  const diff = graphDiffSchema.parse(input);
  const currentGraph = assertValidApplicationGraph(draft.graph);
  const currentHash = hashApplicationGraph(currentGraph);
  if (diff.baseGraphHash && diff.baseGraphHash !== currentHash) {
    throw new GraphDiffError(
      "Graph Diff baseGraphHash does not match the current Draft revision.",
    );
  }

  const next = structuredClone(currentGraph) as Record<string, unknown>;
  for (const operation of diff.operations) {
    const segments = assertPermittedDiffPath(operation.path);
    const [parent, key] = resolveParent(next, segments, operation.path);
    if (operation.op === "remove") removeOperation(parent, key, operation.path);
    if (operation.op === "add")
      setOperation(parent, key, operation.value, operation.path, true);
    if (operation.op === "replace")
      setOperation(parent, key, operation.value, operation.path, false);
  }

  return {
    ...draft,
    revision: draft.revision + 1,
    graph: assertValidApplicationGraph(next),
  };
}
