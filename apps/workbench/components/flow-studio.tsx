"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ReactFlowDiagram } from "@factory/adapters";
import type { FlowModel } from "@factory/graph";
import { addFlowTransition } from "../lib/graph-editors";

type Props = {
  diagram: ReactFlowDiagram;
  flow: FlowModel;
  roles: string[];
  onFlowChange: (flow: FlowModel) => void;
  onDraftProposal: (source: string) => void;
};

export function FlowStudio({
  diagram,
  flow,
  roles,
  onFlowChange,
  onDraftProposal,
}: Props) {
  const ownedDiagram = useMemo(() => diagram, [diagram]);
  const [nodes, setNodes, onNodesChange] = useNodesState([...ownedDiagram.nodes]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([...ownedDiagram.edges]);
  const [flowId, setFlowId] = useState(flow.flows[0]?.id ?? "");
  const activeFlow = flow.flows.find((candidate) => candidate.id === flowId) ?? flow.flows[0];
  const [from, setFrom] = useState(activeFlow?.states[0] ?? "");
  const [event, setEvent] = useState(activeFlow?.events[0] ?? "");
  const [to, setTo] = useState(activeFlow?.states[0] ?? "");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNodes([...ownedDiagram.nodes]);
    setEdges([...ownedDiagram.edges]);
  }, [ownedDiagram, setEdges, setNodes]);

  useEffect(() => {
    if (!flow.flows.some((candidate) => candidate.id === flowId)) {
      setFlowId(flow.flows[0]?.id ?? "");
    }
  }, [flow.flows, flowId]);

  useEffect(() => {
    if (!activeFlow) return;
    setFrom((current) => activeFlow.states.includes(current) ? current : activeFlow.states[0] ?? "");
    setTo((current) => activeFlow.states.includes(current) ? current : activeFlow.states[0] ?? "");
    setEvent((current) => activeFlow.events.includes(current) ? current : activeFlow.events[0] ?? "");
  }, [activeFlow]);

  const addTransition = () => {
    if (!activeFlow) return;
    try {
      onFlowChange(
        addFlowTransition(flow, activeFlow.id, {
          from,
          event,
          to,
          ...(role ? { roles: [role] } : {}),
        }),
      );
      setError(null);
      onDraftProposal("Flow Studio transition");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add transition.");
    }
  };

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
        <small>Transitions are constrained by the declared Graph vocabulary.</small>
      </div>
      <form
        className="flow-transition-editor"
        onSubmit={(submission) => {
          submission.preventDefault();
          addTransition();
        }}
      >
        <label>
          Flow
          <select value={activeFlow?.id ?? ""} onChange={(change) => setFlowId(change.target.value)}>
            {flow.flows.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.id}</option>)}
          </select>
        </label>
        <label>
          From
          <select value={from} onChange={(change) => setFrom(change.target.value)}>
            {activeFlow?.states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label>
          Event
          <select value={event} onChange={(change) => setEvent(change.target.value)}>
            {activeFlow?.events.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
          </select>
        </label>
        <label>
          To
          <select value={to} onChange={(change) => setTo(change.target.value)}>
            {activeFlow?.states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label>
          Role
          <select value={role} onChange={(change) => setRole(change.target.value)}>
            <option value="">Any declared role</option>
            {roles.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
          </select>
        </label>
        <button type="submit">Add transition</button>
        {error && <small className="studio-error">{error}</small>}
      </form>
      <div className="react-flow-stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
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
