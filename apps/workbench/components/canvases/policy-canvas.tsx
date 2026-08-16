"use client";

import { ShieldCheck } from "lucide-react";
import type { ApplicationGraphV1, PolicyModel } from "@factory/graph";

import { setPolicyAction } from "../../lib/graph-editors";
import { compileCasbinPolicyPreview } from "../../lib/policy-preview";

const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "submit",
  "approve",
  "reject",
  "audit",
] as const;

/**
 * The Policy canvas: the declared role and resource controls. The matrix
 * edits permissions cell by cell; the Casbin projection is a read-only
 * preview of the declared policy.
 */
export function PolicyCanvas({
  graph,
  onPolicyChange,
}: {
  graph: ApplicationGraphV1;
  onPolicyChange: (policy: PolicyModel) => void;
}) {
  const preview = compileCasbinPolicyPreview(graph.policy);
  return (
    <div className="policy-canvas">
      <div className="policy-header">
        <ShieldCheck size={20} />
        <div>
          <strong>Compiled policy preview</strong>
          <small>{graph.policy.roles.length} declared roles</small>
        </div>
      </div>
      <div
        className="policy-matrix"
        role="table"
        aria-label="Role and resource policy matrix"
      >
        {graph.policy.roles.flatMap((role) =>
          graph.domain.entities.map((entity) => {
            const permission = graph.policy.permissions.find(
              (entry) => entry.role === role && entry.resource === entity.key,
            );
            return (
              <div
                className="policy-row"
                key={`${role}:${entity.key}`}
                role="row"
              >
                <span>{role}</span>
                <strong>{entity.label}</strong>
                <div className="policy-actions">
                  {ACTIONS.map((action) => (
                    <label
                      key={action}
                      title={`${role} · ${entity.key} · ${action}`}
                    >
                      <input
                        checked={permission?.actions.includes(action) ?? false}
                        onChange={(event) =>
                          onPolicyChange(
                            setPolicyAction(
                              graph.policy,
                              role,
                              entity.key,
                              action,
                              event.target.checked,
                            ),
                          )
                        }
                        type="checkbox"
                      />
                      {action}
                    </label>
                  ))}
                </div>
              </div>
            );
          }),
        )}
      </div>
      <details className="casbin-preview">
        <summary>Casbin projection · {preview.rows.length} rules</summary>
        <pre aria-label="Compiled Casbin policy preview">
          {preview.policy || "# No policy rules declared\n"}
        </pre>
      </details>
    </div>
  );
}
