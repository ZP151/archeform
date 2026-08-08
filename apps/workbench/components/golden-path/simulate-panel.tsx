"use client";

import React, { useMemo } from "react";
import { Play, RotateCcw, ScrollText, ShieldX } from "lucide-react";

import type { DraftRevisionV1 } from "@factory/graph";

import {
  allowedActions,
  type SimulationState,
} from "../../lib/golden-path/simulator";

interface SimulatePanelProps {
  readonly draft: DraftRevisionV1;
  readonly simulation: SimulationState | null;
  readonly onStart: () => void;
  readonly onReset: () => void;
  readonly onSwitchRole: (role: string) => void;
  readonly onTransition: (recordId: string, event: string) => void;
  readonly onProceed?: () => void;
}

/**
 * Simulate mode: a deterministic role and data simulation over the mutable
 * Draft. The per-role action surface is derived from the Draft's policy, role
 * switching comes from the policy roles, and every transition is an audit or
 * a recorded denial — nothing leaves the Draft lifecycle.
 */
export function SimulatePanel(props: SimulatePanelProps): React.JSX.Element {
  const { draft, simulation } = props;
  const roles = useMemo(
    () =>
      [
        ...new Set(
          draft.graph.policy.permissions.map((permission) => permission.role),
        ),
      ].sort(),
    [draft],
  );
  const actions = useMemo(
    () => (simulation === null ? [] : allowedActions(draft, simulation)),
    [draft, simulation],
  );

  if (simulation === null) {
    return (
      <section
        className="golden-path-panel"
        aria-label="Simulate the Expense Approval journey"
      >
        <h2>Simulate</h2>
        <p>
          Run the deterministic role and data simulation over the mutable Draft:
          switch roles, submit, approve, and reject expense records, and audit
          every transition. Clearly a simulation — never a deployment.
        </p>
        <div className="golden-path-actions">
          <button
            type="button"
            className="golden-path-primary"
            aria-label="Start simulation"
            onClick={props.onStart}
          >
            <Play size={16} aria-hidden="true" />
            Start simulation
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="golden-path-panel"
      aria-label="Simulate the Expense Approval journey"
    >
      <h2>Simulate</h2>
      <p className="golden-path-simulation-label">{simulation.label}</p>
      <p className="golden-path-role">
        Current role: <strong>{simulation.role}</strong>
      </p>

      <div className="golden-path-role-switch">
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            className={role === simulation.role ? "is-selected" : ""}
            aria-label={`Switch role to ${role}`}
            aria-pressed={role === simulation.role}
            onClick={() => props.onSwitchRole(role)}
          >
            {role}
          </button>
        ))}
      </div>

      <div className="golden-path-records">
        <h3>Expense records</h3>
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {simulation.records.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
                <td>${record.amount}</td>
                <td>{record.description}</td>
                <td>{record.status}</td>
                <td>
                  {actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      aria-label={`Apply ${action} to ${record.id}`}
                      onClick={() => props.onTransition(record.id, action)}
                    >
                      {action}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="golden-path-trails">
        <div aria-label="Audit trail">
          <h3>
            <ScrollText size={14} aria-hidden="true" /> Audit trail
          </h3>
          {simulation.auditEvents.length === 0 ? (
            <p className="golden-path-hint">No transitions yet.</p>
          ) : (
            <ul>
              {simulation.auditEvents.map((event) => (
                <li key={event.at}>
                  #{event.at} {event.role} {event.event} {event.recordId}:{" "}
                  {event.from} → {event.to}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div aria-label="Denial trail">
          <h3>
            <ShieldX size={14} aria-hidden="true" /> Denial trail
          </h3>
          {simulation.denials.length === 0 ? (
            <p className="golden-path-hint">No denials yet.</p>
          ) : (
            <ul>
              {simulation.denials.map((denial) => (
                <li key={denial.at}>
                  {denial.role} {denial.action} {denial.recordId} ·{" "}
                  {denial.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="golden-path-actions">
        <button
          type="button"
          className="golden-path-secondary"
          aria-label="Reset simulation"
          onClick={props.onReset}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset simulation
        </button>
        {props.onProceed !== undefined ? (
          <button
            type="button"
            className="golden-path-primary"
            aria-label="Proceed to Release"
            onClick={props.onProceed}
          >
            Proceed to Release
          </button>
        ) : null}
      </div>
    </section>
  );
}
