import { z } from "zod";

import {
  applicationGraphV2Schema,
  assertApplicationGraphV2,
  hashApplicationGraphV2,
  type ApplicationGraphV2,
} from "./application-graph-v2.js";
import {
  applicationGraphV3Schema,
  assertApplicationGraphV3,
  hashApplicationGraphV3,
  type ApplicationGraphV3,
} from "./application-graph-v3.js";
import {
  CompositionError,
  graphKeySchema,
  parseStrict,
  sha256DigestSchema,
} from "./composition-shared.js";
import {
  applicationGraphSchema,
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "./model.js";
import {
  applicationSurfaceSchema,
  screenIntentSchema,
} from "./product-recipe.js";
import type { Sha256Digest } from "./product-intent.js";

const publishedV1Schema = z
  .object({
    kind: z.literal("published-application-graph"),
    status: z.literal("published"),
    graphVersion: z.literal("factory.application-graph/v1"),
    revisionId: graphKeySchema,
    revisionNumber: z.number().int().positive(),
    graphHash: sha256DigestSchema,
    graph: applicationGraphSchema,
  })
  .strict();

export type PublishedApplicationGraphV1Input = {
  kind: "published-application-graph";
  status: "published";
  graphVersion: "factory.application-graph/v1";
  revisionId: string;
  revisionNumber: number;
  graphHash: Sha256Digest;
  graph: ApplicationGraphV1;
};

const pageRecipeSchema =
  applicationGraphV2Schema.shape.page.shape.pages.element.shape.recipe;
const responsiveNavigationSchema =
  applicationGraphV2Schema.shape.experience.shape.responsiveNavigation.element;

export const applicationGraphV1ToV2UpgradeContextSchema = z
  .object({
    migrationVersion: z.literal("factory.application-graph-v1-to-v2/v1"),
    targetDraftRevisionId: graphKeySchema,
    targetDraftRevisionNumber: z.number().int().positive(),
    surfaces: z.array(applicationSurfaceSchema),
    pageUpgrades: z.array(
      z
        .object({
          pageId: graphKeySchema,
          surfaceKey: graphKeySchema,
          screenIntent: screenIntentSchema,
          recipe: pageRecipeSchema,
        })
        .strict(),
    ),
    responsiveNavigation: z.array(responsiveNavigationSchema),
    seedScenarios: applicationGraphV2Schema.shape.seedScenarios,
    journeys: applicationGraphV2Schema.shape.journeys,
    fieldAuthorities: applicationGraphV2Schema.shape.fieldAuthorities,
    bindingPolicies: applicationGraphV2Schema.shape.bindingPolicies,
  })
  .strict();

export type ApplicationGraphV1ToV2UpgradeContext = {
  migrationVersion: "factory.application-graph-v1-to-v2/v1";
  targetDraftRevisionId: string;
  targetDraftRevisionNumber: number;
  surfaces: import("./product-recipe.js").ApplicationSurfaceV1[];
  pageUpgrades: Array<{
    pageId: string;
    surfaceKey: string;
    screenIntent: import("./product-recipe.js").ScreenIntentV1;
    recipe: {
      key: string;
      version: string;
      regions: Array<{ key: string; blockIds: string[] }>;
    };
  }>;
  responsiveNavigation: Array<{
    surfaceKey: string;
    compactAt: number;
    collapse: "drawer" | "tabs" | "none";
  }>;
  seedScenarios: ApplicationGraphV2["seedScenarios"];
  journeys: ApplicationGraphV2["journeys"];
  fieldAuthorities: ApplicationGraphV2["fieldAuthorities"];
  bindingPolicies: ApplicationGraphV2["bindingPolicies"];
};

export type ApplicationGraphV2DraftRevision = {
  kind: "application-graph-draft-revision";
  status: "draft";
  revisionId: string;
  revisionNumber: number;
  graphVersion: "factory.application-graph/v2";
  graphHash: Sha256Digest;
  graph: ApplicationGraphV2;
  lineage: {
    kind: "application-graph-v1-upgrade";
    migrationVersion: "factory.application-graph-v1-to-v2/v1";
    source: Omit<PublishedApplicationGraphV1Input, "graph">;
  };
};

const publishedV2Schema = z
  .object({
    kind: z.literal("published-application-graph"),
    status: z.literal("published"),
    graphVersion: z.literal("factory.application-graph/v2"),
    revisionId: graphKeySchema,
    revisionNumber: z.number().int().positive(),
    graphHash: sha256DigestSchema,
    graph: applicationGraphV2Schema,
  })
  .strict();

export type PublishedApplicationGraphV2Input = {
  kind: "published-application-graph";
  status: "published";
  graphVersion: "factory.application-graph/v2";
  revisionId: string;
  revisionNumber: number;
  graphHash: Sha256Digest;
  graph: ApplicationGraphV2;
};

const publishedV3Schema = z
  .object({
    kind: z.literal("published-application-graph"),
    status: z.literal("published"),
    graphVersion: z.literal("factory.application-graph/v3"),
    revisionId: graphKeySchema,
    revisionNumber: z.number().int().positive(),
    graphHash: sha256DigestSchema,
    graph: applicationGraphV3Schema,
  })
  .strict();

export type PublishedApplicationGraphV3Input = {
  kind: "published-application-graph";
  status: "published";
  graphVersion: "factory.application-graph/v3";
  revisionId: string;
  revisionNumber: number;
  graphHash: Sha256Digest;
  graph: ApplicationGraphV3;
};

export type PublishedApplicationGraphInput =
  | PublishedApplicationGraphV1Input
  | PublishedApplicationGraphV2Input
  | PublishedApplicationGraphV3Input;

export type AdaptedPublishedApplicationGraph = PublishedApplicationGraphInput;

export type ApplicationGraphV2ToV3UpgradeContext = {
  migrationVersion: "factory.application-graph-v2-to-v3/v1";
  targetDraftRevisionId: string;
  targetDraftRevisionNumber: number;
  journeys: ApplicationGraphV3["journeys"];
};

export type ApplicationGraphV3DraftRevision = {
  kind: "application-graph-draft-revision";
  status: "draft";
  revisionId: string;
  revisionNumber: number;
  graphVersion: "factory.application-graph/v3";
  graphHash: Sha256Digest;
  graph: ApplicationGraphV3;
  lineage: {
    kind: "application-graph-v2-upgrade";
    migrationVersion: "factory.application-graph-v2-to-v3/v1";
    source: Omit<PublishedApplicationGraphV2Input, "graph">;
  };
};

const applicationGraphV2ToV3UpgradeContextSchema = z
  .object({
    migrationVersion: z.literal("factory.application-graph-v2-to-v3/v1"),
    targetDraftRevisionId: graphKeySchema,
    targetDraftRevisionNumber: z.number().int().positive(),
    journeys: z.array(z.unknown()),
  })
  .strict();

function isArrayIndexKey(key: string, length: number): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < length &&
    String(index) === key
  );
}

function copyPlainOwnRecordInput(
  input: unknown,
  scope = "Published Application Graph",
): unknown {
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) {
      throw new CompositionError(
        `${scope} input must contain only plain arrays.`,
      );
    }
    for (const key of Reflect.ownKeys(input)) {
      if (key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        !isArrayIndexKey(key, input.length) ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        throw new CompositionError(
          `${scope} contains an unrecognized extra key.`,
        );
      }
    }
    const copy: unknown[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !("value" in descriptor)
      ) {
        throw new CompositionError(
          `${scope} input must contain only dense plain arrays.`,
        );
      }
      copy.push(copyPlainOwnRecordInput(descriptor.value, scope));
    }
    return copy;
  }
  if (input !== null && typeof input === "object") {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CompositionError(
        "Published Application Graph input must contain only plain records.",
      );
    }
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        throw new CompositionError(
          `${scope} contains an unrecognized extra key.`,
        );
      }
      copy[key] = copyPlainOwnRecordInput(descriptor.value, scope);
    }
    return copy;
  }
  return input;
}

function hasDiscardedKeys(input: unknown, parsed: unknown): boolean {
  if (Array.isArray(input)) {
    return (
      !Array.isArray(parsed) ||
      input.length !== parsed.length ||
      input.some((value, index) => hasDiscardedKeys(value, parsed[index]))
    );
  }
  if (input !== null && typeof input === "object") {
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return true;
    }
    const parsedRecord = parsed as Record<string, unknown>;
    return Reflect.ownKeys(input).some((key) => {
      if (typeof key !== "string") return true;
      const value = (input as Record<string, unknown>)[key];
      return (
        !Object.prototype.hasOwnProperty.call(parsedRecord, key) ||
        hasDiscardedKeys(value, parsedRecord[key])
      );
    });
  }
  return false;
}

function assertPublishedV1(input: unknown): PublishedApplicationGraphV1Input {
  const ownInput = copyPlainOwnRecordInput(input);
  const parsed = parseStrict(publishedV1Schema, ownInput);
  const rawGraph =
    ownInput &&
    typeof ownInput === "object" &&
    Object.prototype.hasOwnProperty.call(ownInput, "graph")
      ? (ownInput as { graph: unknown }).graph
      : undefined;
  if (hasDiscardedKeys(rawGraph, parsed.graph)) {
    throw new CompositionError(
      "Published Application Graph contains an unrecognized extra key.",
    );
  }
  const graph = assertValidApplicationGraph(parsed.graph);
  if (parsed.graphVersion !== graph.apiVersion) {
    throw new CompositionError(
      "Published Application Graph envelope version does not match its Graph.",
    );
  }
  if (parsed.graphHash !== hashApplicationGraph(graph)) {
    throw new CompositionError(
      "Published Application Graph hash does not match its Graph.",
    );
  }
  return structuredClone({
    ...parsed,
    graph,
  }) as PublishedApplicationGraphV1Input;
}

function assertPublishedV2(input: unknown): PublishedApplicationGraphV2Input {
  const ownInput = copyPlainOwnRecordInput(input);
  const parsed = parseStrict(publishedV2Schema, ownInput);
  const graph = assertApplicationGraphV2(parsed.graph);
  if (parsed.graphVersion !== graph.apiVersion) {
    throw new CompositionError(
      "Published Application Graph envelope version does not match its Graph.",
    );
  }
  if (parsed.graphHash !== hashApplicationGraphV2(graph)) {
    throw new CompositionError(
      "Published Application Graph hash does not match its Graph.",
    );
  }
  return structuredClone({
    ...parsed,
    graph,
  }) as PublishedApplicationGraphV2Input;
}

function assertPublishedV3(input: unknown): PublishedApplicationGraphV3Input {
  const ownInput = copyPlainOwnRecordInput(input);
  const parsed = parseStrict(publishedV3Schema, ownInput);
  const graph = assertApplicationGraphV3(parsed.graph);
  if (parsed.graphVersion !== graph.apiVersion) {
    throw new CompositionError(
      "Published Application Graph envelope version does not match its Graph.",
    );
  }
  if (parsed.graphHash !== hashApplicationGraphV3(graph)) {
    throw new CompositionError(
      "Published Application Graph hash does not match its Graph.",
    );
  }
  return structuredClone({
    ...parsed,
    graph,
  }) as PublishedApplicationGraphV3Input;
}

export function upgradeApplicationGraphV1ToV2Draft(
  sourceInput: PublishedApplicationGraphV1Input,
  contextInput: ApplicationGraphV1ToV2UpgradeContext,
): ApplicationGraphV2DraftRevision {
  const source = assertPublishedV1(sourceInput);
  const context = parseStrict(
    applicationGraphV1ToV2UpgradeContextSchema,
    contextInput,
  );
  if (context.targetDraftRevisionId === source.revisionId) {
    throw new CompositionError(
      "A V1-to-V2 upgrade requires a new Draft revision id different from its Published source.",
    );
  }
  const sourcePageIds = new Set(source.graph.page.pages.map(({ id }) => id));
  const pageUpgrades = new Map<string, (typeof context.pageUpgrades)[number]>();
  for (const pageUpgrade of context.pageUpgrades) {
    if (!sourcePageIds.has(pageUpgrade.pageId)) {
      throw new CompositionError(
        `V1-to-V2 page upgrade references unknown page '${pageUpgrade.pageId}'.`,
      );
    }
    if (pageUpgrades.has(pageUpgrade.pageId)) {
      throw new CompositionError(
        `V1-to-V2 page upgrade for '${pageUpgrade.pageId}' is duplicated; exactly one is required.`,
      );
    }
    pageUpgrades.set(pageUpgrade.pageId, pageUpgrade);
  }
  for (const pageId of sourcePageIds) {
    if (!pageUpgrades.has(pageId)) {
      throw new CompositionError(
        `V1-to-V2 upgrade is missing page '${pageId}'; every V1 page requires exactly one mapping.`,
      );
    }
  }

  const graph = assertApplicationGraphV2({
    apiVersion: "factory.application-graph/v2",
    metadata: structuredClone(source.graph.metadata),
    surfaces: structuredClone(context.surfaces),
    page: {
      pages: source.graph.page.pages.map((page) => {
        const upgrade = pageUpgrades.get(page.id)!;
        return {
          ...structuredClone(page),
          surfaceKey: upgrade.surfaceKey,
          screenIntent: structuredClone(upgrade.screenIntent),
          recipe: structuredClone(upgrade.recipe),
        };
      }),
    },
    domain: structuredClone(source.graph.domain),
    policy: structuredClone(source.graph.policy),
    flow: structuredClone(source.graph.flow),
    integration: structuredClone(source.graph.integration),
    experience: {
      ...structuredClone(source.graph.experience),
      responsiveNavigation: structuredClone(context.responsiveNavigation),
    },
    seedScenarios: structuredClone(context.seedScenarios),
    journeys: structuredClone(context.journeys),
    fieldAuthorities: structuredClone(context.fieldAuthorities),
    bindingPolicies: structuredClone(context.bindingPolicies),
  });
  const graphHash = hashApplicationGraphV2(graph) as Sha256Digest;
  return {
    kind: "application-graph-draft-revision",
    status: "draft",
    revisionId: context.targetDraftRevisionId,
    revisionNumber: context.targetDraftRevisionNumber,
    graphVersion: "factory.application-graph/v2",
    graphHash,
    graph: structuredClone(graph),
    lineage: {
      kind: "application-graph-v1-upgrade",
      migrationVersion: context.migrationVersion,
      source: {
        kind: source.kind,
        status: source.status,
        graphVersion: source.graphVersion,
        revisionId: source.revisionId,
        revisionNumber: source.revisionNumber,
        graphHash: source.graphHash,
      },
    },
  };
}

export function upgradeApplicationGraphV2ToV3Draft(
  sourceInput: PublishedApplicationGraphV2Input,
  contextInput: ApplicationGraphV2ToV3UpgradeContext,
): ApplicationGraphV3DraftRevision {
  const source = assertPublishedV2(sourceInput);
  const ownContextInput = copyPlainOwnRecordInput(
    contextInput,
    "Application Graph V2-to-V3 upgrade context",
  );
  const context = parseStrict(
    applicationGraphV2ToV3UpgradeContextSchema,
    ownContextInput,
  );
  if (context.targetDraftRevisionId === source.revisionId) {
    throw new CompositionError(
      "A V2-to-V3 upgrade requires a new Draft revision id different from its Published source.",
    );
  }

  const {
    apiVersion: _apiVersion,
    journeys: _journeys,
    bindingPolicies,
    ...retained
  } = source.graph;
  const graph = assertApplicationGraphV3({
    ...structuredClone(retained),
    apiVersion: "factory.application-graph/v3",
    journeys: context.journeys,
    bindingPolicies: bindingPolicies.map((policy) => ({
      kind: "domain-field" as const,
      ...structuredClone(policy),
    })),
  });
  const graphHash = hashApplicationGraphV3(graph);
  return {
    kind: "application-graph-draft-revision",
    status: "draft",
    revisionId: context.targetDraftRevisionId,
    revisionNumber: context.targetDraftRevisionNumber,
    graphVersion: "factory.application-graph/v3",
    graphHash,
    graph: structuredClone(graph),
    lineage: {
      kind: "application-graph-v2-upgrade",
      migrationVersion: context.migrationVersion,
      source: {
        kind: source.kind,
        status: source.status,
        graphVersion: source.graphVersion,
        revisionId: source.revisionId,
        revisionNumber: source.revisionNumber,
        graphHash: source.graphHash,
      },
    },
  };
}

const outerPublishedDiscriminatorSchema = z
  .object({
    kind: z.literal("published-application-graph"),
    status: z.literal("published"),
    graphVersion: z.enum([
      "factory.application-graph/v1",
      "factory.application-graph/v2",
      "factory.application-graph/v3",
    ]),
  })
  .passthrough();

export function adaptPublishedApplicationGraph(
  input: unknown,
): AdaptedPublishedApplicationGraph {
  const ownInput = copyPlainOwnRecordInput(input);
  const outer = parseStrict(outerPublishedDiscriminatorSchema, ownInput);
  const graphVersion =
    ownInput &&
    typeof ownInput === "object" &&
    Object.prototype.hasOwnProperty.call(ownInput, "graph")
      ? ((ownInput as { graph: { apiVersion?: unknown } }).graph?.apiVersion ??
        undefined)
      : undefined;
  if (graphVersion !== outer.graphVersion) {
    throw new CompositionError(
      "Published Application Graph envelope version does not match its Graph.",
    );
  }
  if (outer.graphVersion === "factory.application-graph/v1") {
    return assertPublishedV1(ownInput);
  }
  if (outer.graphVersion === "factory.application-graph/v2") {
    return assertPublishedV2(ownInput);
  }
  return assertPublishedV3(ownInput);
}
