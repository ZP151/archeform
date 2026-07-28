import type { Edge, Node } from "@xyflow/react";
import type { PageModel, FlowModel } from "@factory/graph";

/**
 * Data owned by Factory Pilot while Puck supplies the editing canvas. The
 * explicit envelope keeps Puck's runtime document from becoming the source of
 * truth and is safe to serialize into a Draft revision.
 */
export interface PuckPageDocument {
  readonly adapter: "puck";
  readonly version: 1;
  readonly pageModel: PageModel;
}

export function pageModelToPuckDocument(pageModel: PageModel): PuckPageDocument {
  return {
    adapter: "puck",
    version: 1,
    pageModel: structuredClone(pageModel),
  };
}

export function puckDocumentToPageModel(document: PuckPageDocument): PageModel {
  if (document.adapter !== "puck" || document.version !== 1) {
    throw new Error("Unsupported Puck PageModel document.");
  }
  return structuredClone(document.pageModel);
}

export interface FactoryFlowNodeData extends Record<string, unknown> {
  readonly flowId: string;
  readonly state: string;
  readonly initial: boolean;
}

export interface FactoryFlowEdgeData extends Record<string, unknown> {
  readonly flowId: string;
  readonly event: string;
  readonly roles: readonly string[];
}

export interface ReactFlowDiagram {
  readonly nodes: readonly Node<FactoryFlowNodeData>[];
  readonly edges: readonly Edge<FactoryFlowEdgeData>[];
}

/**
 * Generates a constrained view for React Flow. Editing intent is translated
 * back by a future Flow Studio command layer; this adapter never treats canvas
 * coordinates or arbitrary node data as FlowModel semantics.
 */
export function flowModelToReactFlow(flowModel: FlowModel): ReactFlowDiagram {
  const nodes: Node<FactoryFlowNodeData>[] = [];
  const edges: Edge<FactoryFlowEdgeData>[] = [];

  flowModel.flows.forEach((flow, flowIndex) => {
    flow.states.forEach((state, stateIndex) => {
      nodes.push({
        id: `${flow.id}:${state}`,
        type: "default",
        position: { x: stateIndex * 224, y: flowIndex * 184 },
        data: { flowId: flow.id, state, initial: state === flow.initialState },
      });
    });
    flow.transitions.forEach((transition, transitionIndex) => {
      edges.push({
        id: `${flow.id}:${transition.from}:${transition.event}:${transitionIndex}`,
        source: `${flow.id}:${transition.from}`,
        target: `${flow.id}:${transition.to}`,
        label: transition.event,
        type: "smoothstep",
        animated: false,
        data: { flowId: flow.id, event: transition.event, roles: transition.roles ?? [] },
      });
    });
  });

  return { nodes, edges };
}
