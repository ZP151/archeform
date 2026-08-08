"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Background,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ApplicationGraphV1 } from "@factory/graph";

import {
  lineageElements,
  type ReleaseLineageInput,
} from "../../lib/golden-path/lineage-model";

// ReactFlow v12 constrains node data to Record<string, unknown>; the index
// signature keeps the custom node payload compatible while the explicit
// properties below stay strongly typed.
interface LineageNodeData {
  readonly label: string;
  readonly detail?: string;
  readonly kind: string;
  readonly layer: string;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
  readonly [key: string]: unknown;
}

type LineageFlowNode = Node<LineageNodeData, "lineage">;

function LineageNodeView({
  id,
  data,
}: NodeProps<LineageFlowNode>): React.JSX.Element {
  return (
    <button
      type="button"
      className={`lineage-node ${data.selected ? "is-selected" : ""}`}
      data-id={id}
      onClick={() => data.onSelect(id)}
    >
      <strong>{data.label}</strong>
      {data.detail !== undefined ? <small>{data.detail}</small> : null}
      <span className="lineage-node-kind">{data.kind}</span>
    </button>
  );
}

const NODE_TYPES = { lineage: LineageNodeView };

interface LineageCanvasProps {
  readonly graph: ApplicationGraphV1;
  readonly release?: ReleaseLineageInput;
}

/**
 * Connected all-pages and application-lineage canvas: the deterministic
 * lineage model lays out pages, roles, entities, flows, capability locks, and
 * the release chain. Canvas coordinates and selection are presentation data,
 * never business truth — the Application Graph stays the sole source.
 */
export function LineageCanvas(props: LineageCanvasProps): React.JSX.Element {
  const { graph, release } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectNode = useCallback((id: string) => setSelectedId(id), []);

  const elements = useMemo(
    () => lineageElements(graph, release),
    [graph, release],
  );

  const nodes = useMemo<LineageFlowNode[]>(
    () =>
      elements.nodes.map((node) => ({
        id: node.id,
        type: "lineage",
        position: { x: node.x, y: node.y },
        data: {
          label: node.label,
          detail: node.detail,
          kind: node.kind,
          layer: node.layer,
          selected: selectedId === node.id,
          onSelect: selectNode,
        },
      })),
    [elements, selectedId, selectNode],
  );

  const edges = useMemo<Edge[]>(
    () =>
      elements.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.label === undefined ? {} : { label: edge.label }),
      })),
    [elements],
  );

  const selected = useMemo(
    () => elements.nodes.find((node) => node.id === selectedId) ?? null,
    [elements, selectedId],
  );

  return (
    <section
      className="golden-path-lineage"
      aria-label="Golden Path lineage canvas"
    >
      <h2>Application lineage</h2>
      <p className="golden-path-hint">
        Canvas coordinates and selection are presentation data — the Application
        Graph stays the sole business truth.
      </p>
      <div className="golden-path-lineage-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          panOnScroll
          zoomOnDoubleClick={false}
          minZoom={0.4}
          maxZoom={2}
          defaultViewport={{ x: 40, y: 20, zoom: 0.8 }}
        >
          <Background />
        </ReactFlow>
      </div>
      <div
        className="golden-path-lineage-selection"
        aria-label="Lineage selection"
      >
        {selected === null
          ? "Select a node to inspect it."
          : `${selected.id} — ${selected.kind} · ${selected.layer}`}
      </div>
    </section>
  );
}
