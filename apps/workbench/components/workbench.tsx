"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  FileText,
  FolderKanban,
  GitBranch,
  LayoutPanelLeft,
  Moon,
  PanelRight,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  initialWorkbenchState,
  transitionWorkbench,
  type Surface,
} from "../lib/workbench-model";
import {
  ControlPlaneClient,
  type WorkbenchDraft,
} from "../lib/control-plane-client";
import { PageStudio } from "./page-studio";
import { FlowStudio } from "./flow-studio";
import {
  flowModelToReactFlow,
  pageModelToPuckDocument,
} from "@factory/adapters";
import type { ApplicationGraphV1, PageModel } from "@factory/graph";

type Navigation = {
  id: Surface;
  label: string;
  icon: LucideIcon;
  hint: string;
};

const navigation: Navigation[] = [
  {
    id: "page",
    label: "Page",
    icon: LayoutPanelLeft,
    hint: "Shape the experience",
  },
  { id: "domain", label: "Domain", icon: FolderKanban, hint: "Define records" },
  { id: "flow", label: "Flow", icon: Workflow, hint: "Connect decisions" },
  { id: "policy", label: "Policy", icon: ShieldCheck, hint: "Set controls" },
  { id: "ai", label: "AI", icon: Bot, hint: "Configure intelligence" },
  { id: "code", label: "Code", icon: Code2, hint: "Inspect generated output" },
];

type Props = {
  initialGraph: ApplicationGraphV1;
  controlPlaneUrl: string;
};

export function Workbench({ initialGraph, controlPlaneUrl }: Props) {
  const [state, dispatch] = useReducer(
    transitionWorkbench,
    initialWorkbenchState,
  );
  const [graph, setGraph] = useState(initialGraph);
  const [remoteDraft, setRemoteDraft] = useState<WorkbenchDraft | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "ready" | "offline" | "saving" | "publishing" | "published"
  >("connecting");
  const [draftDirty, setDraftDirty] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const controlPlane = useMemo(
    () => new ControlPlaneClient(controlPlaneUrl),
    [controlPlaneUrl],
  );
  const pageDocument = useMemo(
    () => pageModelToPuckDocument(graph.page),
    [graph.page],
  );
  const flowDiagram = useMemo(
    () => flowModelToReactFlow(graph.flow),
    [graph.flow],
  );

  useEffect(() => {
    let active = true;
    void controlPlane
      .bootstrapLocalDraft(initialGraph)
      .then((draft) => {
        if (!active) return;
        setRemoteDraft(draft);
        setGraph(draft.graph);
        dispatch({ type: "synchronize-draft", revision: `r.${draft.revisionNumber}` });
        setConnectionState("ready");
      })
      .catch(() => {
        if (!active) return;
        setConnectionState("offline");
      });
    return () => {
      active = false;
    };
  }, [controlPlane, initialGraph]);

  const persistDraft = async (): Promise<WorkbenchDraft> => {
    if (!remoteDraft) {
      throw new Error("The local Control Plane is unavailable.");
    }
    setConnectionState("saving");
    const next = await controlPlane.appendDraft(remoteDraft.applicationGraphId, graph);
    setRemoteDraft(next);
    setGraph(next.graph);
    dispatch({ type: "synchronize-draft", revision: `r.${next.revisionNumber}` });
    setDraftDirty(false);
    setConnectionState("ready");
    return next;
  };

  const saveDraft = () => {
    setOperationError(null);
    void persistDraft().catch((error) => {
      setConnectionState("offline");
      setOperationError(error instanceof Error ? error.message : "Draft save failed.");
    });
  };

  const publish = () => {
    setOperationError(null);
    void (async () => {
      const draft = draftDirty ? await persistDraft() : remoteDraft;
      if (!draft) throw new Error("The local Control Plane is unavailable.");
      setConnectionState("publishing");
      await controlPlane.publishDraft(draft.applicationGraphId, draft.draftRevisionId);
      dispatch({ type: "publish" });
      setConnectionState("published");
    })().catch((error) => {
      setConnectionState("offline");
      setOperationError(error instanceof Error ? error.message : "Publish failed.");
    });
  };

  const changePageModel = (page: PageModel) => {
    setGraph((current) => ({ ...current, page }));
    setDraftDirty(true);
  };
  const active =
    navigation.find((item) => item.id === state.activeSurface) ?? navigation[0];
  const proposeDraftChange = (source: string) =>
    dispatch({ type: "propose-draft-change", source });

  return (
    <main className={`workbench theme-${state.theme}`} data-theme={state.theme}>
      <aside className="rail" aria-label="Workbench navigation">
        <button className="brand-mark" aria-label="Factory Pilot home">
          <Sparkles size={18} strokeWidth={2.2} />
        </button>
        <nav className="rail-nav">
          {navigation.map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              className={`rail-item${state.activeSurface === id ? " is-active" : ""}`}
              onClick={() => dispatch({ type: "open", surface: id })}
              aria-current={state.activeSurface === id ? "page" : undefined}
              aria-label={label}
              title={`${label}: ${hint}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button
            className="rail-item"
            aria-label="Workbench settings"
            title="Settings"
          >
            <Settings2 size={18} />
            <span>Settings</span>
          </button>
          <button className="avatar" aria-label="Open account menu">
            AO
          </button>
        </div>
      </aside>

      <section className="shell">
        <header className="topbar">
          <div className="project-control">
            <button className="project-picker" aria-label="Select project">
              <span className="project-glyph">
                <FolderKanban size={15} />
              </span>
              <strong>{graph.metadata.name}</strong>
              <ChevronDown size={15} />
            </button>
            <span className="top-divider" />
            <button className="revision-picker" aria-label="Select revision">
              {state.revision}
              <ChevronDown size={14} />
            </button>
            <span className={`lifecycle lifecycle-${state.lifecycle}`}>
              <CircleDot size={12} />
              {connectionState === "offline"
                ? "Offline"
                : state.lifecycle === "draft"
                  ? "Draft"
                  : "Published"}
            </span>
          </div>
          <div className="top-actions">
            <button
              className="utility-button"
              onClick={() => dispatch({ type: "toggle-properties" })}
              aria-pressed={state.propertiesOpen}
              aria-label="Toggle properties panel"
              title="Toggle properties"
            >
              <PanelRight size={16} />
            </button>
            <button
              className="utility-button"
              onClick={() => dispatch({ type: "toggle-theme" })}
              aria-label={`Switch to ${state.theme === "light" ? "dark" : "light"} theme`}
              title="Toggle theme"
            >
              {state.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              className="publish-button"
              onClick={publish}
              disabled={!remoteDraft || connectionState === "saving" || connectionState === "publishing" || state.lifecycle === "published"}
            >
              {state.lifecycle === "published" ? (
                <>
                  <Check size={15} />
                  Published
                </>
              ) : (
                "Publish"
              )}
            </button>
          </div>
        </header>

        <section className="work-area">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">
                <span /> Workbench
              </p>
              <h1>{active.label}</h1>
              <p className="heading-description">{active.hint}</p>
            </div>
            <div className="heading-actions">
              <button className="quiet-button">
                <Plus size={15} /> Add
              </button>
              <button className="quiet-button">
                <GitBranch size={15} /> History
              </button>
            </div>
          </div>
          <div className={`canvas surface-${state.activeSurface}`}>
            <section
              className="canvas-board"
              aria-label={`${active.label} canvas`}
            >
              {state.activeSurface === "page" && (
                <PageStudio
                  pageDocument={pageDocument}
                  onDraftProposal={proposeDraftChange}
                  onPageModelChange={changePageModel}
                />
              )}
              {state.activeSurface === "domain" && <DomainCanvas graph={graph} />}
              {state.activeSurface === "flow" && (
                <FlowStudio
                  diagram={flowDiagram}
                  onDraftProposal={proposeDraftChange}
                />
              )}
              {state.activeSurface === "policy" && <PolicyCanvas graph={graph} />}
              {state.activeSurface === "ai" && <AiCanvas />}
              {state.activeSurface === "code" && <CodeCanvas graph={graph} />}
            </section>
            {state.lastProposal && (
              <p className="draft-proposal-status" role="status">
                <span /> {state.lastProposal} proposed a Draft change
                <small>{state.draftProposals}</small>
              </p>
            )}
            {state.propertiesOpen && (
              <PropertiesPanel surface={state.activeSurface} />
            )}
          </div>
          <div className="workbench-operations" role="status">
            <span className={`connection-dot connection-${connectionState}`} />
            <span>{connectionState === "offline" ? "Control Plane unavailable" : `Control Plane ${connectionState}`}</span>
            {draftDirty && <span className="draft-changed">Unsaved Draft</span>}
            {operationError && <span className="operation-error">{operationError}</span>}
            {draftDirty && remoteDraft && (
              <button className="quiet-button" onClick={saveDraft} disabled={connectionState === "saving"}>
                Save draft
              </button>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function DomainCanvas({ graph }: { graph: ApplicationGraphV1 }) {
  const [primary, secondary] = graph.domain.entities;
  return (
    <div className="domain-canvas">
      <div className="record-card primary-record">
        <span className="record-icon">
          <FileText size={16} />
        </span>
        <strong>{primary?.label ?? "No entity"}</strong>
        <small>Primary record</small>
        <div>
          {primary?.fields.map((field) => <code key={field.key}>{field.key}</code>)}
        </div>
      </div>
      <div className="record-link" />
      <div className="record-card">
        <span className="record-icon violet">
          <FolderKanban size={16} />
        </span>
        <strong>{secondary?.label ?? "No related entity"}</strong>
        <small>Supporting record</small>
        <div>
          {secondary?.fields.map((field) => <code key={field.key}>{field.key}</code>)}
        </div>
      </div>
      <div className="record-note">
        {graph.domain.relations.length} declared relation{graph.domain.relations.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function PolicyCanvas({ graph }: { graph: ApplicationGraphV1 }) {
  return (
    <div className="policy-canvas">
      <div className="policy-header">
        <ShieldCheck size={20} />
        <div>
          <strong>Compiled policy preview</strong>
          <small>{graph.policy.roles.length} declared roles</small>
        </div>
      </div>
      {graph.policy.permissions.map((permission) => (
        <div className="policy-row" key={`${permission.role}:${permission.resource}`}>
          <span>{permission.role}</span>
          <strong>{permission.resource} · {permission.actions.join(", ")}</strong>
          <ChevronDown size={15} />
        </div>
      ))}
    </div>
  );
}

function AiCanvas() {
  return (
    <div className="ai-canvas">
      <div className="ai-orbit">
        <Bot size={26} />
        <span className="orbit-dot first" />
        <span className="orbit-dot second" />
        <span className="orbit-dot third" />
      </div>
      <div>
        <p>AI policy assistant</p>
        <h2>Suggest actions inside approved boundaries.</h2>
        <button>Configure assistant</button>
      </div>
    </div>
  );
}

function CodeCanvas({ graph }: { graph: ApplicationGraphV1 }) {
  return (
    <div className="code-canvas">
      <div className="code-tabs">
        <span className="selected">application-graph.json</span>
        <span>generated-api</span>
        <span>policy.csv</span>
      </div>
      <pre>
        <code>
          <i>01</i> metadata: <b>{JSON.stringify(graph.metadata.id)}</b>,{"\n"}
          <i>02</i> pages: <b>{graph.page.pages.length}</b>,{"\n"}
          <i>03</i> entities: <b>{graph.domain.entities.length}</b>,{"\n"}
          <i>04</i> flows: <b>{graph.flow.flows.length}</b>,{"\n"}
          <i>05</i> lifecycle: <b>{JSON.stringify("Draft → Publish → Compile")}</b>
        </code>
      </pre>
    </div>
  );
}

function PropertiesPanel({ surface }: { surface: Surface }) {
  const titles: Record<Surface, string> = {
    page: "Page settings",
    domain: "Record details",
    flow: "Step properties",
    policy: "Policy details",
    ai: "Assistant settings",
    code: "Build details",
  };
  return (
    <aside className="properties" aria-label="Properties">
      <div className="properties-heading">
        <div>
          <p>Inspector</p>
          <h2>{titles[surface]}</h2>
        </div>
        <button aria-label="More inspector options">•••</button>
      </div>
      <div className="property-section">
        <label>
          Name
          <input
            defaultValue={surface === "page" ? "Request intake" : surface}
          />
        </label>
        <label>
          Identifier
          <input defaultValue={`ops.${surface}.v1`} />
        </label>
      </div>
      <div className="property-section">
        <span className="section-label">Visibility</span>
        <button className="select-row">
          Team members <ChevronDown size={15} />
        </button>
      </div>
      <div className="property-section status-stack">
        <span className="section-label">Validation</span>
        <div>
          <Check size={14} />
          <span>Required fields complete</span>
        </div>
        <div>
          <Check size={14} />
          <span>Accessible controls</span>
        </div>
      </div>
    </aside>
  );
}
