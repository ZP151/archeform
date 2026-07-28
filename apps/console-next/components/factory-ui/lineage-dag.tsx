'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Background, Controls, MiniMap, ReactFlow, type Edge, type NodeTypes, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Plan, Project, Run, Version } from '@/lib/types';
import { FactoryIconAction } from './factory-ui';
import { FactoryLineageNode, type FactoryLineageFlowNode, type LineageNodeData } from './lineage-node';
import { toLineageGraph } from './lineage-model';

const nodeTypes = { factory: FactoryLineageNode } as NodeTypes;

export function LineageDag({ project, version, plan, run, compact = false }: { project: Project; version: Version | null; plan: Plan | null; run: Run | null; compact?: boolean }) {
  const graph = useMemo(() => toLineageGraph(project, version, plan, run), [project, version, plan, run]);
  const [selection, setSelection] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<ReactFlowInstance<FactoryLineageFlowNode, Edge> | null>(null);
  const refitEpochRef = useRef(0);
  const frameRef = useRef<{ first: number | null; second: number | null }>({ first: null, second: null });
  const selected = graph.nodes.find((item) => item.id === selection);
  const nodes = useMemo<FactoryLineageFlowNode[]>(() => graph.nodes.map((item) => ({ ...item, data: { ...(item.data as LineageNodeData), selected: item.id === selection, onSelect: setSelection } })), [graph, selection]);
  const cancelPendingRefit = useCallback(() => {
    if (frameRef.current.first !== null) window.cancelAnimationFrame(frameRef.current.first);
    if (frameRef.current.second !== null) window.cancelAnimationFrame(frameRef.current.second);
    frameRef.current = { first: null, second: null };
  }, []);
  const invalidateLineageRefit = useCallback(() => {
    ++refitEpochRef.current;
    cancelPendingRefit();
  }, [cancelPendingRefit]);
  const refitLineage = useCallback(() => {
    const epoch = ++refitEpochRef.current;
    const canvas = canvasRef.current;
    cancelPendingRefit();
    frameRef.current.first = window.requestAnimationFrame(() => {
      frameRef.current.first = null;
      if (epoch !== refitEpochRef.current || !canvas?.isConnected) return;
      const instance = flowRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const nodes = [...canvas.querySelectorAll<HTMLElement>('.react-flow__node')];
      if (!instance || canvasRect.height <= 0 || canvasRect.width <= 0 || nodes.length === 0) return;
      const bounds = nodes.reduce((current, node) => {
        const rect = node.getBoundingClientRect();
        return {
          bottom: Math.max(current.bottom, rect.bottom),
          left: Math.min(current.left, rect.left),
          right: Math.max(current.right, rect.right),
          top: Math.min(current.top, rect.top),
        };
      }, { bottom: Number.NEGATIVE_INFINITY, left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, top: Number.POSITIVE_INFINITY });
      const viewport = instance.getViewport();
      const inset = compact ? 18 : 28;
      const scale = Math.min((canvasRect.width - inset * 2) / (bounds.right - bounds.left), (canvasRect.height - inset * 2) / (bounds.bottom - bounds.top));
      if (!Number.isFinite(scale) || scale <= 0 || viewport.zoom <= 0) return;
      const worldCenterX = ((bounds.left + bounds.right) / 2 - canvasRect.left - viewport.x) / viewport.zoom;
      const worldCenterY = ((bounds.top + bounds.bottom) / 2 - canvasRect.top - viewport.y) / viewport.zoom;
      const zoom = viewport.zoom * scale;
      void instance.setViewport({ x: canvasRect.width / 2 - worldCenterX * zoom, y: canvasRect.height / 2 - worldCenterY * zoom, zoom }, { duration: 0 });
    });
  }, [cancelPendingRefit, compact]);
  useLayoutEffect(() => {
    invalidateLineageRefit();
    refitLineage();
  }, [compact, expanded, graph, invalidateLineageRefit, refitLineage, selection]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(refitLineage);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [refitLineage]);
  useEffect(() => () => {
    invalidateLineageRefit();
  }, [invalidateLineageRefit]);
  const selectionSummary = selected && <div className={compact ? 'lineage-floating-selection' : 'lineage-selection'} data-factory-component="lineage-selection" role="status" aria-live="polite"><span>{selected.data.kind}</span><strong>{selected.data.label}</strong><small>{selected.data.detail}</small><small>{selected.data.status}</small></div>;
  return <section className={`lineage-dag${compact ? ' is-compact' : ''}${expanded ? ' is-expanded' : ''}`} data-factory-ui="1.5.0" data-factory-component="lineage-dag">
    {compact && <div className="lineage-floating-actions"><FactoryIconAction label={expanded ? 'Restore lineage' : 'Maximize lineage'} onClick={() => setExpanded((value) => !value)}>{expanded ? <Minimize2 aria-hidden="true" size={16} /> : <Maximize2 aria-hidden="true" size={16} />}</FactoryIconAction></div>}
    {!compact && <div className="lineage-dag-head"><div><span className="rail-kicker">Inspectability</span><h2>Product lineage</h2><p>Definition, approved package plan, and execution evidence remain connected without exposing raw input.</p></div>{selectionSummary}</div>}
    {compact && selectionSummary}
    <div ref={canvasRef} className="lineage-canvas" aria-label="Read-only Factory lineage graph"><ReactFlow<FactoryLineageFlowNode, Edge> nodes={nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: compact ? 0.12 : 0.16 }} onInit={(instance) => { flowRef.current = instance; refitLineage(); }} nodesDraggable={false} nodesConnectable={false} elementsSelectable onNodeClick={(_, item) => setSelection(item.id)} proOptions={{ hideAttribution: true }}><Background gap={18} size={1} />{!compact && <MiniMap pannable={false} zoomable={false} />}<Controls showInteractive={false} /></ReactFlow></div>
  </section>;
}
