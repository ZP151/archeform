import type { ApplicationGraphV1 } from "@factory/graph";

/**
 * Presentation-only lineage model: a deterministic node/edge layout over the
 * Draft graph's pages, roles, entities, flows, and capability locks, plus the
 * immutable release lineage (published revision -> compilation -> isolated
 * verification -> local preview) when release material is provided.
 *
 * The output is plain presentation data: coordinates and labels are derived
 * deterministically from the graph, the graph itself never appears in the
 * output, and no edit surface exists here. Selection state is owned by the
 * canvas component, never by this model.
 */

export type LineageLayer =
  "pages" | "roles" | "entities" | "flows" | "locks" | "release";

export interface LineageNode {
  readonly id: string;
  readonly layer: LineageLayer;
  readonly kind: string;
  readonly label: string;
  readonly detail?: string;
  // Layout coordinates are presentation data; the deterministic layout pass
  // assigns them after all nodes are collected.
  x: number;
  y: number;
}

export interface LineageEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label?: string;
}

export interface ReleaseLineageInput {
  readonly phase: string;
  readonly publishedRevisionId?: string;
  readonly compilationId?: string;
  readonly verificationRunId?: string;
  readonly previewRunId?: string;
}

export interface LineageElements {
  readonly nodes: readonly LineageNode[];
  readonly edges: readonly LineageEdge[];
}

const LAYERS: readonly LineageLayer[] = [
  "pages",
  "roles",
  "entities",
  "flows",
  "locks",
  "release",
];

const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 110;
const MARGIN_X = 20;
const MARGIN_Y = 30;

export function lineageElements(
  graph: ApplicationGraphV1,
  release?: ReleaseLineageInput,
): LineageElements {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const edgeIds = new Set<string>();
  const addEdge = (
    id: string,
    source: string,
    target: string,
    label?: string,
  ): void => {
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({
      id,
      source,
      target,
      ...(label === undefined ? {} : { label }),
    });
  };

  for (const page of [...graph.page.pages].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    nodes.push({
      id: `page:${page.id}`,
      layer: "pages",
      kind: "page",
      label: page.id,
      x: 0,
      y: 0,
      ...((page as { readonly route?: string }).route === undefined
        ? {}
        : { detail: `route ${(page as { readonly route: string }).route}` }),
    });
  }

  const permissionCounts = new Map<string, number>();
  for (const permission of graph.policy.permissions) {
    permissionCounts.set(
      permission.role,
      (permissionCounts.get(permission.role) ?? 0) + 1,
    );
  }
  for (const role of [...graph.policy.roles].sort()) {
    nodes.push({
      id: `role:${role}`,
      layer: "roles",
      kind: "role",
      label: role,
      detail: `${permissionCounts.get(role) ?? 0} permissions`,
      x: 0,
      y: 0,
    });
  }

  for (const entity of [...graph.domain.entities].sort((a, b) =>
    a.key.localeCompare(b.key),
  )) {
    nodes.push({
      id: `entity:${entity.key}`,
      layer: "entities",
      kind: "entity",
      label: entity.key,
      detail: `${entity.fields.length} fields`,
      x: 0,
      y: 0,
    });
  }

  for (const flow of [...graph.flow.flows].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const transitions = flow.transitions
      .map(
        (transition) =>
          `${transition.from} /${transition.event}/ -> ${transition.to}`,
      )
      .join(", ");
    nodes.push({
      id: `flow:${flow.id}`,
      layer: "flows",
      kind: "flow",
      label: flow.id,
      detail: transitions,
      x: 0,
      y: 0,
    });
    if (flow.entity !== undefined) {
      addEdge(
        `flow-entity:${flow.id}`,
        `flow:${flow.id}`,
        `entity:${flow.entity}`,
      );
    }
  }

  for (const capability of [...graph.integration.capabilities].sort((a, b) =>
    a.key.localeCompare(b.key),
  )) {
    nodes.push({
      id: `lock:${capability.key}`,
      layer: "locks",
      kind: "lock",
      label: capability.key,
      detail: capability.operation,
      x: 0,
      y: 0,
    });
  }

  // All-pages connectivity: every entity-bound page block connects the page
  // to the entity; every read permission connects the entity to the role.
  for (const page of graph.page.pages) {
    const entities = new Set(
      page.blocks
        .map((block) => block.entity)
        .filter((entity): entity is string => entity !== undefined),
    );
    for (const entity of entities) {
      addEdge(
        `page-entity:${page.id}:${entity}`,
        `page:${page.id}`,
        `entity:${entity}`,
        "binds",
      );
    }
  }
  for (const permission of graph.policy.permissions) {
    if (permission.actions.includes("read")) {
      addEdge(
        `entity-role:${permission.resource}:${permission.role}`,
        `entity:${permission.resource}`,
        `role:${permission.role}`,
        "read",
      );
    }
  }

  // Application lineage: the immutable release chain, only when provided.
  if (release !== undefined) {
    const chain: readonly {
      readonly key: string;
      readonly nodeId: string;
      readonly label: string;
      readonly id: string;
    }[] = [
      release.publishedRevisionId === undefined
        ? null
        : {
            key: "published",
            nodeId: "release:published",
            label: "Published revision",
            id: release.publishedRevisionId,
          },
      release.compilationId === undefined
        ? null
        : {
            key: "compilation",
            nodeId: "release:compilation",
            label: "Compilation",
            id: release.compilationId,
          },
      release.verificationRunId === undefined
        ? null
        : {
            key: "verification",
            nodeId: "release:verification",
            label: "Isolated verification",
            id: release.verificationRunId,
          },
      release.previewRunId === undefined
        ? null
        : {
            key: "preview",
            nodeId: "release:preview",
            label: "Local preview",
            id: release.previewRunId,
          },
    ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    let previous: string | null = null;
    let previousKey: string | null = null;
    for (const entry of chain) {
      nodes.push({
        id: entry.nodeId,
        layer: "release",
        kind: entry.key,
        label: entry.label,
        detail: entry.id,
        x: 0,
        y: 0,
      });
      if (previous !== null && previousKey !== null) {
        addEdge(`release:${previousKey}->${entry.key}`, previous, entry.nodeId);
      }
      previous = entry.nodeId;
      previousKey = entry.key;
    }
  }

  // Deterministic layout: one column per layer, rows centered by the busiest
  // layer. Coordinates are presentation data only.
  const byLayer = new Map<LineageLayer, LineageNode[]>();
  for (const node of nodes) {
    const layerNodes = byLayer.get(node.layer) ?? [];
    layerNodes.push(node);
    byLayer.set(node.layer, layerNodes);
  }
  const maxCount = Math.max(
    1,
    ...LAYERS.map((layer) => byLayer.get(layer)?.length ?? 0),
  );
  for (let i = 0; i < LAYERS.length; i += 1) {
    const layer = LAYERS[i]!;
    const layerNodes = byLayer.get(layer) ?? [];
    const startRow = Math.round((maxCount - layerNodes.length) / 2);
    for (let j = 0; j < layerNodes.length; j += 1) {
      layerNodes[j]!.x = MARGIN_X + i * COLUMN_WIDTH;
      layerNodes[j]!.y = MARGIN_Y + (startRow + j) * ROW_HEIGHT;
    }
  }

  return { nodes, edges };
}
