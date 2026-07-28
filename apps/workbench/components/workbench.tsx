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
  addDomainField,
  setPolicyAction,
} from "../lib/graph-editors";
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
import type {
  ApplicationGraphV1,
  DomainModel,
  FlowModel,
  PageModel,
  PolicyModel,
} from "@factory/graph";

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
    "connecting" | "ready" | "offline" | "saving" | "proposing" | "publishing" | "published"
  >("connecting");
  const [draftDirty, setDraftDirty] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
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
  const changeDomainModel = (domain: DomainModel) => {
    setGraph((current) => ({ ...current, domain }));
    setDraftDirty(true);
  };
  const changePolicyModel = (policy: PolicyModel) => {
    setGraph((current) => ({ ...current, policy }));
    setDraftDirty(true);
  };
  const changeFlowModel = (flow: FlowModel) => {
    setGraph((current) => ({ ...current, flow }));
    setDraftDirty(true);
  };
  const proposeWithAi = async (brief: string): Promise<string> => {
    if (!remoteDraft) {
      throw new Error("The local Control Plane is unavailable.");
    }
    setOperationError(null);
    setConnectionState("proposing");
    try {
      const result = await controlPlane.proposeDraft(
        remoteDraft.applicationGraphId,
        brief,
      );
      setRemoteDraft(result.draft);
      setGraph(result.draft.graph);
      setDraftDirty(false);
      setAiSummary(result.summary);
      dispatch({ type: "synchronize-draft", revision: `r.${result.draft.revisionNumber}` });
      dispatch({ type: "propose-draft-change", source: "AI Studio" });
      setConnectionState("ready");
      return result.summary;
    } catch (error) {
      setConnectionState("offline");
      const message = error instanceof Error ? error.message : "AI proposal failed.";
      setOperationError(message);
      throw error;
    }
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
              disabled={!remoteDraft || connectionState === "saving" || connectionState === "proposing" || connectionState === "publishing" || state.lifecycle === "published"}
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
              {state.activeSurface === "domain" && (
                <DomainCanvas graph={graph} onDomainChange={changeDomainModel} />
              )}
              {state.activeSurface === "flow" && (
                <FlowStudio
                  diagram={flowDiagram}
                  flow={graph.flow}
                  roles={graph.policy.roles}
                  onFlowChange={changeFlowModel}
                  onDraftProposal={proposeDraftChange}
                />
              )}
              {state.activeSurface === "policy" && (
                <PolicyCanvas graph={graph} onPolicyChange={changePolicyModel} />
              )}
              {state.activeSurface === "ai" && (
                <AiCanvas
                  disabled={!remoteDraft || connectionState === "proposing"}
                  onPropose={proposeWithAi}
                  summary={aiSummary}
                />
              )}
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

function DomainCanvas({
  graph,
  onDomainChange,
}: {
  graph: ApplicationGraphV1;
  onDomainChange: (domain: DomainModel) => void;
}) {
  const [entityKey, setEntityKey] = useState(graph.domain.entities[0]?.key ?? "");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<DomainModel["entities"][number]["fields"][number]["type"]>("string");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const primary = graph.domain.entities.find((entity) => entity.key === entityKey) ?? graph.domain.entities[0];

  const addField = () => {
    const key = fieldKey.trim();
    if (!key) return;
    try {
      onDomainChange(addDomainField(graph.domain, entityKey, { key, type: fieldType, required }));
      setFieldKey("");
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add field.");
    }
  };

  return (
    <div className="domain-canvas">
      <div className="record-card primary-record">
        <span className="record-icon">
          <FileText size={16} />
        </span>
        <strong>{primary?.label ?? "No entity"}</strong>
        <small>Selected record</small>
        <div>
          {primary?.fields.map((field) => <code key={field.key}>{field.key}</code>)}
        </div>
      </div>
      <div className="record-link" aria-hidden="true" />
      <form
        className="domain-field-editor"
        onSubmit={(event) => {
          event.preventDefault();
          addField();
        }}
      >
        <label>
          Entity
          <select value={entityKey} onChange={(event) => setEntityKey(event.target.value)}>
            {graph.domain.entities.map((entity) => <option key={entity.key} value={entity.key}>{entity.label}</option>)}
          </select>
        </label>
        <label>
          Field key
          <input value={fieldKey} onChange={(event) => setFieldKey(event.target.value)} placeholder="priority" pattern="[a-z][a-zA-Z0-9_]*" />
        </label>
        <label>
          Type
          <select value={fieldType} onChange={(event) => setFieldType(event.target.value as typeof fieldType)}>
            {["string", "text", "integer", "decimal", "boolean", "date", "datetime", "json", "url", "email"].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="required-field">
          <input checked={required} onChange={(event) => setRequired(event.target.checked)} type="checkbox" /> Required
        </label>
        <button type="submit"><Plus size={15} /> Add field</button>
        {error && <small className="studio-error">{error}</small>}
      </form>
      <div className="record-note">
        {graph.domain.relations.length} declared relation{graph.domain.relations.length === 1 ? "" : "s"} · {primary?.fields.length ?? 0} fields
      </div>
    </div>
  );
}

function PolicyCanvas({
  graph,
  onPolicyChange,
}: {
  graph: ApplicationGraphV1;
  onPolicyChange: (policy: PolicyModel) => void;
}) {
  const actions = ["create", "read", "update", "delete", "submit", "approve", "reject", "audit"];
  return (
    <div className="policy-canvas">
      <div className="policy-header">
        <ShieldCheck size={20} />
        <div>
          <strong>Compiled policy preview</strong>
          <small>{graph.policy.roles.length} declared roles</small>
        </div>
      </div>
      <div className="policy-matrix" role="table" aria-label="Role and resource policy matrix">
        {graph.policy.roles.flatMap((role) =>
          graph.domain.entities.map((entity) => {
            const permission = graph.policy.permissions.find((entry) => entry.role === role && entry.resource === entity.key);
            return (
              <div className="policy-row" key={`${role}:${entity.key}`} role="row">
                <span>{role}</span>
                <strong>{entity.label}</strong>
                <div className="policy-actions">
                  {actions.map((action) => (
                    <label key={action} title={`${role} · ${entity.key} · ${action}`}>
                      <input
                        checked={permission?.actions.includes(action) ?? false}
                        onChange={(event) => onPolicyChange(setPolicyAction(graph.policy, role, entity.key, action, event.target.checked))}
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
    </div>
  );
}

function AiCanvas({
  disabled,
  onPropose,
  summary,
}: {
  disabled: boolean;
  onPropose: (brief: string) => Promise<string>;
  summary: string | null;
}) {
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const value = brief.trim();
    if (!value) return;
    setSubmitting(true);
    setError(null);
    void onPropose(value)
      .then(() => setBrief(""))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Proposal failed."))
      .finally(() => setSubmitting(false));
  };

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
        <h2>Propose a Graph change inside declared boundaries.</h2>
        <textarea
          aria-label="Describe a Graph change"
          disabled={disabled || submitting}
          maxLength={12_000}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Add a receipt field to expenses and suggest the test coverage."
          value={brief}
        />
        <button disabled={disabled || submitting || !brief.trim()} onClick={submit} type="button">
          {submitting ? "Proposing…" : "Propose Draft change"}
        </button>
        {summary && <small className="ai-result">{summary}</small>}
        {error && <small className="ai-error">{error}</small>}
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
