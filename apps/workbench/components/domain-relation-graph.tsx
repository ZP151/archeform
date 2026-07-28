"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DomainReactFlowDiagram } from "@factory/adapters/browser";

type Props = {
  readonly diagram: DomainReactFlowDiagram;
};

/**
 * Read-only relationship projection. Domain commands own mutations, so canvas
 * layout changes cannot become persisted business semantics.
 */
export function DomainRelationGraph({ diagram }: Props) {
  const ownedDiagram = useMemo(() => diagram, [diagram]);
  const [nodes, setNodes] = useNodesState([...ownedDiagram.nodes]);
  const [edges, setEdges] = useEdgesState([...ownedDiagram.edges]);

  useEffect(() => {
    setNodes([...ownedDiagram.nodes]);
    setEdges([...ownedDiagram.edges]);
  }, [ownedDiagram, setEdges, setNodes]);

  return (
    <section className="domain-relation-graph" aria-label="Domain relation graph">
      <div className="domain-relation-heading">
        <span>Relation graph</span>
        <small>Read-only projection of the current Draft</small>
      </div>
      <div className="domain-react-flow-stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesConnectable={false}
          nodesDraggable={false}
          aria-label="Declared entity relations"
        >
          <Background gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
