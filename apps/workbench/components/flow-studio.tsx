"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ReactFlowDiagram } from "@factory/adapters";

type Props = {
  diagram: ReactFlowDiagram;
  onDraftProposal: (source: string) => void;
};

export function FlowStudio({ diagram, onDraftProposal }: Props) {
  const ownedDiagram = useMemo(() => diagram, [diagram]);
  const [nodes, , onNodesChange] = useNodesState([...ownedDiagram.nodes]);
  const [edges, , onEdgesChange] = useEdgesState([...ownedDiagram.edges]);

  return (
    <section
      className="studio-shell flow-studio"
      aria-label="React Flow Flow Studio"
    >
      <div className="studio-intro">
        <div>
          <span>React Flow Studio</span>
          <strong>Lifecycle flow</strong>
        </div>
        <small>Canvas edits create Draft proposals only.</small>
      </div>
      <div className="react-flow-stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            onDraftProposal("React Flow node proposal");
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            onDraftProposal("React Flow edge proposal");
          }}
          fitView
          nodesConnectable={false}
          aria-label="Request lifecycle flow editor"
        >
          <Background gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
