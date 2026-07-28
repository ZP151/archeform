import { Position, type Edge } from '@xyflow/react';
import type { Plan, Project, Run, Version } from '@/lib/types';
import type { FactoryLineageFlowNode, LineageNodeData } from './lineage-node';

export type FactoryLineageNode = FactoryLineageFlowNode;
export type FactoryLineageGraph = { edges: Edge[]; nodes: FactoryLineageNode[] };

type LineageKind = LineageNodeData['kind'];
const supportedKinds = new Set<LineageKind>(['project', 'definition', 'plan', 'run', 'component']);

function label(value: string | undefined, fallback: string) {
  const candidate = (value || fallback).replace(/\s+/g, ' ').trim().slice(0, 72);
  return /(?:https?:\/\/|\/|\\)/i.test(candidate) ? fallback : candidate || fallback;
}

function node(id: string, kind: LineageKind, rawLabel: string | undefined, rawDetail: string | undefined, status: string, x: number, y: number, sourcePosition = Position.Right, targetPosition = Position.Left): FactoryLineageNode {
  if (!supportedKinds.has(kind)) throw new Error('unsupported_lineage_kind');
  return { id, type: 'factory', position: { x, y }, data: { kind, label: label(rawLabel, kind), detail: label(rawDetail, `${kind} identifier`), status: label(status, 'unknown') }, sourcePosition, targetPosition, selectable: true, focusable: true, draggable: false, connectable: false };
}

export function toLineageGraph(project: Project, version: Version | null, plan: Plan | null, run: Run | null): FactoryLineageGraph {
  const nodes: FactoryLineageNode[] = [node(`project:${project.id}`, 'project', project.name, project.id, 'active', 0, 20)];
  const edges: Edge[] = [];
  let previous = nodes[0].id;
  if (version) { const current = node(`definition:${version.id}`, 'definition', `Definition v${version.definition.metadata.version || '1'}`, version.id, version.status, 180, 20); nodes.push(current); edges.push({ id: `${previous}->${current.id}`, source: previous, sourceHandle: 'next', target: current.id, type: 'smoothstep', className: 'lineage-edge-chain', ariaLabel: 'Product lineage relationship' }); previous = current.id; }
  if (plan) {
    const current = node(`plan:${plan.id}`, 'plan', 'Component plan', plan.id, plan.status, 360, 20);
    nodes.push(current); edges.push({ id: `${previous}->${current.id}`, source: previous, sourceHandle: 'next', target: current.id, type: 'smoothstep', className: 'lineage-edge-chain', ariaLabel: 'Product lineage relationship' }); previous = current.id;
    const domainRank = (key: string) => key.startsWith('ui.') ? 0 : key.startsWith('backend.') ? 1 : key.startsWith('workflow.') ? 2 : key.startsWith('data.') ? 3 : key.startsWith('ops.') ? 4 : 5;
    const selected = [...(plan.components || [])].sort((left, right) => domainRank(left.key) - domainRank(right.key) || left.key.localeCompare(right.key));
    for (const [index, component] of selected.entries()) {
      const assetColumn = index % 4;
      const assetRow = Math.floor(index / 4);
      const asset = node(`component:${component.key}:${component.version}`, 'component', component.key, component.version, component.trust_level || 'golden', 76 + assetColumn * 172, 168 + assetRow * 88, Position.Right, Position.Top);
      nodes.push(asset); edges.push({ id: `${current.id}->${asset.id}`, source: current.id, sourceHandle: 'assets', target: asset.id, type: 'smoothstep', className: 'lineage-edge-asset', ariaLabel: `Component plan includes ${component.key}` });
    }
  }
  if (run) { const current = node(`run:${run.id}`, 'run', 'Build run', run.id, run.status, 540, 20); nodes.push(current); edges.push({ id: `${previous}->${current.id}`, source: previous, sourceHandle: 'next', target: current.id, type: 'smoothstep', className: 'lineage-edge-chain', ariaLabel: 'Product lineage relationship' }); }
  return { nodes, edges };
}
