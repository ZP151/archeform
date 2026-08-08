"use client";

import { useMemo, useState } from "react";
import type { ApplicationGraphV1 } from "@factory/graph";

import {
  dispatchGraphSimulationEvent,
  startGraphSimulation,
  type GraphSimulationStateV1,
} from "../../lib/product-journey/graph-simulator";

/**
 * The role simulator: a journey through the composed Graph's declared flow
 * scenarios. Records, events, stages, and the roles that may fire each event
 * all come from the Graph — the panel only walks what the product declares,
 * and a role outside the declared transition is shown as a denial.
 */

type Props = {
  readonly graph: ApplicationGraphV1;
};

export function RoleSimulator({ graph }: Props) {
  const firstScenario = graph.flow.flows[0]?.id ?? "";
  const [scenarioKey, setScenarioKey] = useState(firstScenario);
  const [simulation, setSimulation] = useState<GraphSimulationStateV1>(() =>
    startGraphSimulation(graph, firstScenario),
  );
  const record = simulation.records[0];
  const entity = useMemo(
    () =>
      graph.domain.entities.find(
        (candidate) => candidate.key === simulation.flow.entity,
      ),
    [graph, simulation.flow.entity],
  );
  const availableEvents = simulation.transitions.filter(
    (transition) => transition.from === record?.stage,
  );
  const [roleKey, setRoleKey] = useState(() => graph.policy.roles[0] ?? "");
  const scenarioOptions = graph.flow.flows.map((flow) => ({
    id: flow.id,
    label:
      graph.domain.entities.find((candidate) => candidate.key === flow.entity)
        ?.label ?? flow.id,
  }));

  const restart = (scenario: string) => {
    setScenarioKey(scenario);
    setSimulation(startGraphSimulation(graph, scenario));
  };

  return (
    <section className="role-simulator" aria-label="Role simulator">
      <header className="role-simulator-heading">
        <span>Simulation</span>
        <label>
          Scenario
          <select
            value={scenarioKey}
            onChange={(event) => restart(event.target.value)}
          >
            {scenarioOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fire as role
          <select
            value={roleKey}
            onChange={(event) => setRoleKey(event.target.value)}
          >
            {graph.policy.roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => restart(scenarioKey)}>
          Reset
        </button>
      </header>
      {!record ? (
        <p className="role-simulator-empty">
          This scenario declares no records.
        </p>
      ) : (
        <div className="simulation-records">
          <article className="simulation-record">
            <h3>
              {entity?.label ?? simulation.flow.entity} · {record.id}
            </h3>
            <p className="simulation-stage">
              Stage: <strong>{record.stage}</strong>
            </p>
            <div
              className="simulation-events"
              role="group"
              aria-label="Available events"
            >
              {availableEvents.map((transition) => (
                <button
                  key={transition.event}
                  type="button"
                  onClick={() =>
                    setSimulation(
                      dispatchGraphSimulationEvent(simulation, {
                        roleKey,
                        eventKey: transition.event,
                        recordId: record.id,
                      }),
                    )
                  }
                >
                  {transition.event} → {transition.to}
                  <small>
                    ({transition.roles.join(", ") || "declared policy"})
                  </small>
                </button>
              ))}
            </div>
            {record.history.length > 0 && (
              <ol className="simulation-history" aria-label="Journey history">
                {record.history.map((entry, index) => (
                  <li key={`${entry.event}-${index}`}>
                    <code>{entry.roleKey}</code> {entry.event}{" "}
                    <code>{entry.from}</code> → <code>{entry.to}</code>
                    {entry.effects.length > 0 && (
                      <small>
                        {" "}
                        effects:{" "}
                        {entry.effects
                          .map(
                            (effect) =>
                              `${effect.capability}.${effect.operation}`,
                          )
                          .join(", ")}
                      </small>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </article>
        </div>
      )}
      {simulation.denials.length > 0 && (
        <ul className="simulation-denials" aria-label="Denied actions">
          {simulation.denials.map((denial, index) => (
            <li
              key={`${denial.eventKey}-${index}`}
              className="simulation-denied"
            >
              {denial.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
