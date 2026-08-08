import type { ApplicationGraphV1 } from "@factory/graph";

/**
 * The graph-driven simulation: a pure walker over the declared flow
 * scenarios of a composed product. Records come from the Graph's own seed
 * data, events come from the flow's declared transitions, and the roles that
 * may fire them come from the transition role declarations (falling back to
 * the declared policy permissions). Nothing here knows a particular product
 * or scenario — any composed Graph simulates through the same rules.
 */

export type GraphSimulationTransitionV1 = {
  readonly from: string;
  readonly event: string;
  readonly to: string;
  readonly roles: readonly string[];
  readonly effects: readonly {
    readonly capability: string;
    readonly operation: string;
  }[];
};

export type GraphSimulationHistoryEntryV1 = {
  readonly event: string;
  readonly roleKey: string;
  readonly from: string;
  readonly to: string;
  readonly effects: readonly {
    readonly capability: string;
    readonly operation: string;
  }[];
};

export type GraphSimulationRecordV1 = {
  readonly id: string;
  readonly stage: string;
  readonly history: readonly GraphSimulationHistoryEntryV1[];
};

export type GraphSimulationDenialV1 = {
  readonly recordId: string;
  readonly roleKey: string;
  readonly eventKey: string;
  readonly reason: string;
};

export type GraphSimulationStateV1 = {
  readonly scenarioKey: string;
  readonly flow: {
    readonly id: string;
    readonly entity: string;
    readonly initialState: string;
    readonly states: readonly string[];
  };
  readonly transitions: readonly GraphSimulationTransitionV1[];
  readonly roles: readonly string[];
  /** The declared policy permissions, snapped for role-less transitions. */
  readonly permissions: readonly {
    readonly role: string;
    readonly resource: string;
    readonly actions: readonly string[];
  }[];
  readonly records: readonly GraphSimulationRecordV1[];
  readonly denials: readonly GraphSimulationDenialV1[];
};

function findFlow(graph: ApplicationGraphV1, scenarioKey: string) {
  const flow = graph.flow.flows.find(
    (candidate) => candidate.id === scenarioKey,
  );
  if (flow === undefined) throw new Error(`Unknown scenario '${scenarioKey}'.`);
  return flow;
}

/** Records start from the Graph's declared seed data, at its declared stage. */
function seedRecords(
  graph: ApplicationGraphV1,
  flow: ReturnType<typeof findFlow>,
): readonly GraphSimulationRecordV1[] {
  const seeds =
    graph.domain.seedData?.filter((seed) => seed.entity === flow.entity) ?? [];
  if (seeds.length === 0) {
    return [{ id: `${flow.entity}-1`, stage: flow.initialState, history: [] }];
  }
  return seeds.map((seed) => ({
    id: seed.id ?? `${seed.entity}-1`,
    stage:
      typeof seed.values.status === "string"
        ? seed.values.status
        : flow.initialState,
    history: [],
  }));
}

export function startGraphSimulation(
  graph: ApplicationGraphV1,
  scenarioKey: string,
): GraphSimulationStateV1 {
  const flow = findFlow(graph, scenarioKey);
  return {
    scenarioKey,
    flow: {
      id: flow.id,
      entity: flow.entity,
      initialState: flow.initialState,
      states: [...flow.states],
    },
    transitions: flow.transitions.map((transition) => ({
      from: transition.from,
      event: transition.event,
      to: transition.to,
      roles: transition.roles ?? [],
      effects: transition.effects ?? [],
    })),
    roles: [...graph.policy.roles],
    permissions: graph.policy.permissions.map((permission) => ({
      role: permission.role,
      resource: permission.resource,
      actions: [...permission.actions],
    })),
    records: seedRecords(graph, flow),
    denials: [],
  };
}

function allowedByPolicy(
  permissions: GraphSimulationStateV1["permissions"],
  roleKey: string,
  entity: string,
  eventKey: string,
): boolean {
  return permissions.some(
    (permission) =>
      permission.role === roleKey &&
      (permission.resource === entity || permission.resource === "*") &&
      permission.actions.includes(eventKey),
  );
}

/**
 * Applies one declared event to one record. The event must be valid from the
 * record's current stage; the firing role must be declared on the transition
 * (falling back to the declared policy permissions). A role that cannot fire
 * the event is recorded as a denial and the record does not move.
 */
export function dispatchGraphSimulationEvent(
  state: GraphSimulationStateV1,
  event: {
    readonly roleKey: string;
    readonly eventKey: string;
    readonly recordId: string;
  },
): GraphSimulationStateV1 {
  const record = state.records.find(
    (candidate) => candidate.id === event.recordId,
  );
  if (record === undefined) {
    throw new Error(`Unknown record '${event.recordId}'.`);
  }
  const transition = state.transitions.find(
    (candidate) =>
      candidate.event === event.eventKey && candidate.from === record.stage,
  );
  if (transition === undefined) {
    throw new Error(
      `Event '${event.eventKey}' is not valid from '${record.stage}'.`,
    );
  }
  const allowed =
    transition.roles.length > 0
      ? transition.roles.includes(event.roleKey)
      : allowedByPolicy(
          state.permissions,
          event.roleKey,
          state.flow.entity,
          event.eventKey,
        );
  if (!allowed) {
    return {
      ...state,
      denials: [
        ...state.denials,
        {
          recordId: event.recordId,
          roleKey: event.roleKey,
          eventKey: event.eventKey,
          reason: `Role '${event.roleKey}' cannot perform '${event.eventKey}'.`,
        },
      ],
    };
  }
  return {
    ...state,
    records: state.records.map((candidate) =>
      candidate.id === event.recordId
        ? {
            ...candidate,
            stage: transition.to,
            history: [
              ...candidate.history,
              {
                event: transition.event,
                roleKey: event.roleKey,
                from: transition.from,
                to: transition.to,
                effects: transition.effects,
              },
            ],
          }
        : candidate,
    ),
  };
}
