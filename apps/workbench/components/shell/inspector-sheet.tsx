"use client";

import { useEffect, useRef } from "react";

import type { WorkbenchCompilation } from "../../lib/control-plane-client";
import type { Surface } from "../../lib/workbench-model";
import type { ApplicationGraphV1 } from "@factory/graph";

type Props = {
  readonly open: boolean;
  readonly surface: Surface;
  readonly graph: ApplicationGraphV1;
  readonly compilation: WorkbenchCompilation | null;
  readonly publishedRevisionId: string | null;
  readonly revision: string;
  readonly lifecycle: "draft" | "published";
  readonly draftProposals: number;
  readonly lastProposal: string | null;
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
};

type Fact = {
  readonly label: string;
  readonly value: string;
};

/**
 * The contextual Inspector: every fact is read from the open Graph, the
 * Draft, or the Compilation. There are no placeholder fields — nothing here
 * pretends to edit state it does not own.
 */
export function InspectorSheet({
  open,
  surface,
  graph,
  compilation,
  publishedRevisionId,
  revision,
  lifecycle,
  draftProposals,
  lastProposal,
  triggerRef,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const factRows = (): readonly Fact[] => {
    switch (surface) {
      case "home":
        return [
          { label: "Workspace", value: graph.metadata.name },
          { label: "Revision", value: revision },
          {
            label: "Lifecycle",
            value: lifecycle === "draft" ? "Draft" : "Published",
          },
        ];
      case "page": {
        const blocks = graph.page.pages.reduce(
          (count, page) => count + page.blocks.length,
          0,
        );
        return [
          { label: "Pages", value: `${graph.page.pages.length} pages` },
          { label: "Blocks", value: `${blocks} blocks` },
          {
            label: "Navigation",
            value: `${graph.page.navigation.length} links`,
          },
        ];
      }
      case "domain": {
        const fields = graph.domain.entities.reduce(
          (count, entity) => count + entity.fields.length,
          0,
        );
        return [
          {
            label: "Entities",
            value: `${graph.domain.entities.length} entities`,
          },
          { label: "Fields", value: `${fields} fields` },
          {
            label: "Relations",
            value: `${graph.domain.relations.length} relations`,
          },
        ];
      }
      case "flow": {
        const transitions = graph.flow.flows.reduce(
          (count, flow) => count + flow.transitions.length,
          0,
        );
        return [
          { label: "Flows", value: `${graph.flow.flows.length} flows` },
          { label: "Transitions", value: `${transitions} transitions` },
          {
            label: "States",
            value: `${graph.flow.flows.reduce((count, flow) => count + flow.states.length, 0)} states`,
          },
        ];
      }
      case "policy":
        return [
          { label: "Roles", value: `${graph.policy.roles.length} roles` },
          {
            label: "Permissions",
            value: `${graph.policy.permissions.length} permissions`,
          },
          {
            label: "Capabilities",
            value: `${graph.integration.capabilities.length} capabilities`,
          },
        ];
      case "ai":
        return [
          {
            label: "Proposals",
            value: `${draftProposals} Draft change${draftProposals === 1 ? "" : "s"} proposed`,
          },
          { label: "Last source", value: lastProposal ?? "None" },
        ];
      case "code":
        return [
          {
            label: "Compilation",
            value: compilation?.result.status ?? "Not queued",
          },
          {
            label: "Published revision",
            value: publishedRevisionId ? "Bound" : "None",
          },
        ];
    }
  };

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
      return;
    }
    panelRef.current?.focus();
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <aside
      className="inspector-sheet overlay-sheet"
      aria-label="Inspector"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="overlay-sheet-heading">
        <div>
          <span className="eyebrow-label">Inspector</span>
          <h2>{surface === "home" ? "Workspace" : `${surface} details`}</h2>
        </div>
        <button
          className="overlay-close"
          aria-label="Close inspector"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <dl className="inspector-facts">
        {factRows().map((fact) => (
          <div className="inspector-fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      <p className="inspector-note">
        Read-only facts from the open Graph, Draft, and Compilation.
      </p>
    </aside>
  );
}
