import type { DomainModel, FlowModel, PolicyModel } from "@factory/graph";

type DomainField = DomainModel["entities"][number]["fields"][number];

/**
 * Produces an immutable DomainModel edit. The Workbench persists the returned
 * Graph only through the Draft lifecycle; this helper never writes remotely.
 */
export function addDomainField(
  domain: DomainModel,
  entityKey: string,
  field: DomainField,
): DomainModel {
  const entity = domain.entities.find((candidate) => candidate.key === entityKey);
  if (!entity) throw new Error(`Unknown entity '${entityKey}'.`);
  if (entity.fields.some((candidate) => candidate.key === field.key)) {
    throw new Error(`Entity '${entityKey}' already has field '${field.key}'.`);
  }
  return {
    ...domain,
    entities: domain.entities.map((candidate) =>
      candidate.key === entityKey
        ? { ...candidate, fields: [...candidate.fields, field] }
        : candidate,
    ),
  };
}

/**
 * Sets one role/resource/action cell while maintaining one normalized
 * permission row per role and resource.
 */
export function setPolicyAction(
  policy: PolicyModel,
  role: string,
  resource: string,
  action: string,
  enabled: boolean,
): PolicyModel {
  const existing = policy.permissions.find(
    (permission) => permission.role === role && permission.resource === resource,
  );
  const nextActions = new Set(existing?.actions ?? []);
  if (enabled) nextActions.add(action);
  else nextActions.delete(action);
  const nextPermission = {
    role,
    resource,
    actions: [...nextActions].sort(),
  };
  const remaining = policy.permissions.filter(
    (permission) => permission.role !== role || permission.resource !== resource,
  );
  return {
    ...policy,
    permissions: nextPermission.actions.length
      ? [...remaining, nextPermission]
      : remaining,
  };
}

type FlowTransition = FlowModel["flows"][number]["transitions"][number];

/**
 * Adds one declarative transition after checking the FlowModel vocabulary.
 * It deliberately has no extension point for scripts, URLs, or generated code.
 */
export function addFlowTransition(
  flowModel: FlowModel,
  flowId: string,
  transition: FlowTransition,
): FlowModel {
  const flow = flowModel.flows.find((candidate) => candidate.id === flowId);
  if (!flow) throw new Error(`Unknown flow '${flowId}'.`);
  if (!flow.states.includes(transition.from)) {
    throw new Error(`Flow '${flowId}' has unknown source state '${transition.from}'.`);
  }
  if (!flow.states.includes(transition.to)) {
    throw new Error(`Flow '${flowId}' has unknown target state '${transition.to}'.`);
  }
  if (!flow.events.includes(transition.event)) {
    throw new Error(`Flow '${flowId}' has unknown event '${transition.event}'.`);
  }
  if (flow.transitions.some((candidate) => candidate.from === transition.from && candidate.event === transition.event)) {
    throw new Error(`Flow '${flowId}' already maps '${transition.from}' and '${transition.event}'.`);
  }
  return {
    ...flowModel,
    flows: flowModel.flows.map((candidate) =>
      candidate.id === flowId
        ? { ...candidate, transitions: [...candidate.transitions, transition] }
        : candidate,
    ),
  };
}
