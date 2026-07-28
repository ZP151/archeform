"use client";

import { useReducer } from "react";
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
  Play,
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

const flowNodes = [
  ["Request", "Employee", "#34d399"],
  ["Review", "Manager", "#8b5cf6"],
  ["Policy", "Rules", "#f59e0b"],
  ["Record", "Audit log", "#38bdf8"],
] as const;

export function Workbench() {
  const [state, dispatch] = useReducer(
    transitionWorkbench,
    initialWorkbenchState,
  );
  const active =
    navigation.find((item) => item.id === state.activeSurface) ?? navigation[0];

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
              <strong>Ops workspace</strong>
              <ChevronDown size={15} />
            </button>
            <span className="top-divider" />
            <button className="revision-picker" aria-label="Select revision">
              {state.revision}
              <ChevronDown size={14} />
            </button>
            <span className={`lifecycle lifecycle-${state.lifecycle}`}>
              <CircleDot size={12} />
              {state.lifecycle === "draft" ? "Draft" : "Published"}
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
              onClick={() => dispatch({ type: "publish" })}
              disabled={state.lifecycle === "published"}
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
              {state.activeSurface === "page" && <PageCanvas />}
              {state.activeSurface === "domain" && <DomainCanvas />}
              {state.activeSurface === "flow" && <FlowCanvas />}
              {state.activeSurface === "policy" && <PolicyCanvas />}
              {state.activeSurface === "ai" && <AiCanvas />}
              {state.activeSurface === "code" && <CodeCanvas />}
            </section>
            {state.propertiesOpen && (
              <PropertiesPanel surface={state.activeSurface} />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function PageCanvas() {
  return (
    <div className="page-canvas">
      <div className="canvas-toolbar">
        <button className="toolbar-active">Desktop</button>
        <button>Tablet</button>
        <button>Mobile</button>
        <span />
        <button aria-label="Preview">
          <Play size={14} /> Preview
        </button>
      </div>
      <div className="site-frame">
        <div className="site-nav">
          <strong>Northstar</strong>
          <span>Overview</span>
          <span>Requests</span>
          <span>Activity</span>
          <button>New request</button>
        </div>
        <div className="site-body">
          <div className="site-copy">
            <p>Operations, without the handoffs.</p>
            <h2>Move work through the right decision.</h2>
            <button>
              Start a request <span>↗</span>
            </button>
          </div>
          <div className="site-stat">
            <span>Open requests</span>
            <strong>24</strong>
            <small>+12% from last week</small>
            <div className="bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainCanvas() {
  return (
    <div className="domain-canvas">
      <div className="record-card primary-record">
        <span className="record-icon">
          <FileText size={16} />
        </span>
        <strong>Request</strong>
        <small>Primary record</small>
        <div>
          <code>title</code>
          <code>owner</code>
          <code>status</code>
          <code>priority</code>
        </div>
      </div>
      <div className="record-link" />
      <div className="record-card">
        <span className="record-icon violet">
          <FolderKanban size={16} />
        </span>
        <strong>Attachment</strong>
        <small>Supporting record</small>
        <div>
          <code>file</code>
          <code>source</code>
        </div>
      </div>
      <div className="record-note">
        A clear domain model keeps components composable.
      </div>
    </div>
  );
}

function FlowCanvas() {
  return (
    <div className="flow-canvas">
      <div className="flow-start">Start</div>
      <div className="flow-line" />
      {flowNodes.map(([name, owner, color], index) => (
        <div
          className="flow-item"
          style={{ left: `${106 + index * 194}px` }}
          key={name}
        >
          <div
            className="flow-node"
            style={{ "--node-color": color } as React.CSSProperties}
          >
            <span>{index + 1}</span>
            <strong>{name}</strong>
            <small>{owner}</small>
          </div>
          {index < flowNodes.length - 1 && <i className="node-connector" />}
        </div>
      ))}
      <div className="flow-end">
        <Check size={16} /> Complete
      </div>
    </div>
  );
}

function PolicyCanvas() {
  return (
    <div className="policy-canvas">
      <div className="policy-header">
        <ShieldCheck size={20} />
        <div>
          <strong>Publishing controls</strong>
          <small>Applies to the request lifecycle</small>
        </div>
      </div>
      {[
        ["Required approval", "Manager sign-off"],
        ["Retention", "7 years"],
        ["Access", "Operations team"],
      ].map(([label, value]) => (
        <div className="policy-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
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

function CodeCanvas() {
  return (
    <div className="code-canvas">
      <div className="code-tabs">
        <span className="selected">request-flow.ts</span>
        <span>request.schema.ts</span>
        <span>policy.yaml</span>
      </div>
      <pre>
        <code>
          <i>01</i> export const requestFlow = flow({"{"}
          {"\n"}
          <i>02</i> trigger: <b>"request.created"</b>,{"\n"}
          <i>03</i> next: <b>"manager.review"</b>,{"\n"}
          <i>04</i> audit: <b>true</b>,{"\n"}
          <i>05</i> {"}"});
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
