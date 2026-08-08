import type { DraftRevisionV1 } from "@factory/graph";

/**
 * Deterministic role and data simulation over the mutable Draft for the
 * Expense Approval Golden Path. Scenario records are seeded by this module
 * (the starter Graph declares no seed data); role switching, visible
 * navigation, and the per-role action surface are derived from the Draft's
 * policy; record transitions follow the Draft's flow transitions, with audit
 * events recorded only for effect-declared transitions. Policy is the
 * authoritative action gate (a roleless flow transition still requires the
 * policy action), and the flow's transition roles gate additionally.
 *
 * The simulation is clearly labelled and never presented as a deployment or
 * as production verification: every state carries `kind: "simulation"` and a
 * label stating it runs over the mutable Draft.
 *
 * Pure and deterministic: all functions derive from the Draft and the
 * module-owned seed; nothing is mutated — every step returns a new state.
 */

export interface ExpenseRecord {
  readonly id: string;
  readonly amount: number;
  readonly description: string;
  readonly status: string;
}

export interface ExpenseAuditEvent {
  readonly at: number;
  readonly recordId: string;
  readonly event: string;
  readonly from: string;
  readonly to: string;
  readonly role: string;
  readonly effects: readonly {
    readonly capability: string;
    readonly operation: string;
  }[];
}

export interface ExpenseDenialEvent {
  readonly at: number;
  readonly role: string;
  readonly action: string;
  readonly recordId: string;
  readonly reason: "policy-denied" | "flow-state" | "transition-role";
}

export interface SimulationState {
  readonly kind: "simulation";
  readonly label: string;
  readonly role: string;
  readonly records: readonly ExpenseRecord[];
  readonly auditEvents: readonly ExpenseAuditEvent[];
  readonly denials: readonly ExpenseDenialEvent[];
}

export type ExpenseTransitionOutcome =
  | {
      readonly ok: true;
      readonly state: SimulationState;
      readonly record: ExpenseRecord;
    }
  | {
      readonly ok: false;
      readonly state: SimulationState;
      readonly reason: "policy-denied" | "flow-state" | "transition-role";
    };

/** Deterministic scenario seed owned by the simulator, not the Draft. */
const EXPENSE_SIMULATION_SEED: readonly ExpenseRecord[] = [
  {
    id: "expense-100",
    amount: 40,
    description: "Taxi to client meeting",
    status: "draft",
  },
  {
    id: "expense-101",
    amount: 1200,
    description: "Team dinner with stakeholders",
    status: "submitted",
  },
  {
    id: "expense-102",
    amount: 60,
    description: "Printer ink refill",
    status: "submitted",
  },
];

const SIMULATION_LABEL =
  "Deterministic role and data simulation over the mutable Draft (not a deployment).";

function requireExpenseApprovalFlow(draft: DraftRevisionV1) {
  const flow = draft.graph.flow.flows.find(
    (candidate) => candidate.id === "expense-review",
  );
  if (flow === undefined) {
    throw new Error("The Draft has no expense-review flow to simulate.");
  }
  return flow;
}

function policyActions(
  draft: DraftRevisionV1,
  role: string,
  resource: string,
): readonly string[] {
  const actions = draft.graph.policy.permissions
    .filter(
      (permission) =>
        permission.role === role && permission.resource === resource,
    )
    .flatMap((permission) => permission.actions);
  return [...new Set(actions)].sort();
}

function deny(
  state: SimulationState,
  role: string,
  action: string,
  recordId: string,
  reason: ExpenseDenialEvent["reason"],
): ExpenseTransitionOutcome {
  return {
    ok: false,
    reason,
    state: {
      ...state,
      denials: [
        ...state.denials,
        {
          at: state.denials.length,
          role,
          action,
          recordId,
          reason,
        },
      ],
    },
  };
}

export function startExpenseApprovalSimulation(
  draft: DraftRevisionV1,
): SimulationState {
  requireExpenseApprovalFlow(draft);
  return {
    kind: "simulation",
    label: SIMULATION_LABEL,
    role: "employee",
    records: EXPENSE_SIMULATION_SEED.map((record) => ({ ...record })),
    auditEvents: [],
    denials: [],
  };
}

/** Restores the deterministic seed: fresh role, records, and event trails. */
export function resetExpenseApprovalSimulation(
  draft: DraftRevisionV1,
  _state: SimulationState,
): SimulationState {
  return startExpenseApprovalSimulation(draft);
}

export function switchRole(
  draft: DraftRevisionV1,
  state: SimulationState,
  role: string,
): SimulationState {
  if (!draft.graph.policy.roles.includes(role)) {
    throw new Error(`Role '${role}' is not part of the Draft's policy roles.`);
  }
  return { ...state, role };
}

/**
 * The per-role action surface, derived from policy permissions on the flow
 * entity: policy is authoritative, so a roleless flow transition is still
 * gated by the policy action below.
 */
export function allowedActions(
  draft: DraftRevisionV1,
  state: SimulationState,
): readonly string[] {
  return policyActions(
    draft,
    state.role,
    requireExpenseApprovalFlow(draft).entity,
  );
}

/**
 * Navigation entries whose page's entity-bound blocks the role can read.
 * Pages without entity-bound blocks are visible to every role.
 */
export function visibleNavigation(
  draft: DraftRevisionV1,
  state: SimulationState,
) {
  return draft.graph.page.navigation.filter((entry) => {
    const page = draft.graph.page.pages.find(
      (candidate) => candidate.id === entry.pageId,
    );
    if (page === undefined) return false;
    const entities = [
      ...new Set(
        page.blocks
          .filter((block) => block.entity !== undefined)
          .map((block) => block.entity as string),
      ),
    ];
    return entities.every((entity) =>
      policyActions(draft, state.role, entity).includes("read"),
    );
  });
}

/**
 * Applies one flow event to a record under the current role. Gates, in
 * order: policy action surface (authorization), flow state (a transition
 * must leave the record's current state), and flow transition roles.
 * Denials are recorded on the returned state; successes append an audit
 * event only when the transition declares the audit effect.
 */
export function transitionExpenseRecord(
  draft: DraftRevisionV1,
  state: SimulationState,
  recordId: string,
  event: string,
): ExpenseTransitionOutcome {
  const record = state.records.find((candidate) => candidate.id === recordId);
  if (record === undefined) {
    throw new Error(`Simulation record '${recordId}' does not exist.`);
  }
  const flow = requireExpenseApprovalFlow(draft);
  if (!policyActions(draft, state.role, flow.entity).includes(event)) {
    return deny(state, state.role, event, recordId, "policy-denied");
  }
  const transition = flow.transitions.find(
    (candidate) =>
      candidate.from === record.status && candidate.event === event,
  );
  if (transition === undefined) {
    return deny(state, state.role, event, recordId, "flow-state");
  }
  if (
    transition.roles !== undefined &&
    !transition.roles.includes(state.role)
  ) {
    return deny(state, state.role, event, recordId, "transition-role");
  }

  const nextRecord: ExpenseRecord = { ...record, status: transition.to };
  const records = state.records.map((candidate) =>
    candidate.id === recordId ? nextRecord : candidate,
  );
  const auditDeclared =
    transition.effects?.some(
      (effect) => effect.capability === "audit.record",
    ) ?? false;
  const stateAfterTransition: SimulationState = auditDeclared
    ? {
        ...state,
        records,
        auditEvents: [
          ...state.auditEvents,
          {
            at: state.auditEvents.length,
            recordId,
            event,
            from: record.status,
            to: transition.to,
            role: state.role,
            effects: transition.effects ?? [],
          },
        ],
      }
    : { ...state, records };
  return { ok: true, state: stateAfterTransition, record: nextRecord };
}
