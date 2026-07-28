'use client';

import { Boxes, FileText, FolderKanban, PackageCheck, Play, type LucideIcon } from 'lucide-react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

export type LineageNodeData = {
  kind: 'project' | 'definition' | 'plan' | 'run' | 'component';
  label: string;
  detail: string;
  status: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export type FactoryLineageFlowNode = Node<LineageNodeData, 'factory'>;

const icons: Record<LineageNodeData['kind'], LucideIcon> = {
  project: FolderKanban,
  definition: FileText,
  plan: Boxes,
  run: Play,
  component: PackageCheck,
};

export function FactoryLineageNode({ id, data, selected }: NodeProps<FactoryLineageFlowNode>) {
  const Icon = icons[data.kind];
  const isPlan = data.kind === 'plan';
  const isSelected = selected || data.selected;
  return <div className={`factory-lineage-node${isSelected ? ' is-selected' : ''}`} data-selected={isSelected ? 'true' : undefined}>
    <Handle type="target" position={data.kind === 'component' ? Position.Top : Position.Left} className="factory-lineage-handle" />
    <button type="button" className="factory-lineage-node-button" aria-label={`${data.kind}: ${data.label}`} aria-pressed={isSelected} onClick={() => data.onSelect?.(id)}>
      <span className="factory-lineage-node-icon"><Icon aria-hidden="true" size={14} /></span>
      <span className="factory-lineage-node-copy"><strong>{data.label}</strong><small>{data.status}</small></span>
    </button>
    {data.kind !== 'component' && <Handle id="next" type="source" position={Position.Right} className="factory-lineage-handle" />}
    {isPlan && <Handle id="assets" type="source" position={Position.Bottom} className="factory-lineage-handle" />}
  </div>;
}
