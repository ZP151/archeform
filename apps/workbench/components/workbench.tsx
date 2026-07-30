"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Bot,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  FileText,
  FolderKanban,
  GitBranch,
  House,
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
  previewRunPresentation,
  transitionWorkbench,
  type Surface,
} from "../lib/workbench-model";
import { isPendingCompilation } from "../lib/compilation-status";
import {
  addDomainEntity,
  addDomainField,
  addDomainIndex,
  addDomainRelation,
  setDomainFieldOptions,
  setPolicyAction,
} from "../lib/graph-editors";
import {
  ControlPlaneClient,
  type WorkbenchCompilation,
  type WorkbenchDraft,
  type WorkbenchOpenedApplication,
  type WorkbenchArtifactContent,
  type WorkbenchAiProposal,
  type WorkbenchApplicationSummary,
  type WorkbenchPublishedRevision,
  type WorkbenchPreviewRun,
  type WorkbenchRevisionTimeline,
} from "../lib/control-plane-client";
import {
  createGuidedApplicationDraft,
  type GuidedApplicationInput,
} from "../lib/guided-application";
import { PageStudio } from "./page-studio";
import { FlowStudio } from "./flow-studio";
import { DomainRelationGraph } from "./domain-relation-graph";
import { GuidedCreationDrawer } from "./guided-creation-drawer";
import { WorkbenchHome } from "./workbench-home";
import {
  domainModelToReactFlow,
  flowModelToReactFlow,
  pageModelToPuckDocument,
} from "@factory/adapters/browser";
import type {
  ApplicationGraphV1,
  DomainModel,
  FlowModel,
  PageModel,
  PolicyModel,
  PublishedGraphExchangeV1,
} from "@factory/graph";
import {
  graphExchangeFilename,
  parseGraphExchangeText,
  serializeGraphExchange,
} from "../lib/graph-exchange";
import { compileCasbinPolicyPreview } from "../lib/policy-preview";
import { diffApplicationGraphs } from "../lib/graph-diff";

type Navigation = {
  id: Surface;
  label: string;
  icon: LucideIcon;
  hint: string;
};

const navigation: Navigation[] = [
  {
    id: "home",
    label: "Home",
    icon: House,
    hint: "Operate applications and Profiles",
  },
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
  const [publishedRevision, setPublishedRevision] =
    useState<WorkbenchPublishedRevision | null>(null);
  const [compilation, setCompilation] = useState<WorkbenchCompilation | null>(
    null,
  );
  const [previewRun, setPreviewRun] = useState<WorkbenchPreviewRun | null>(
    null,
  );
  const [connectionState, setConnectionState] = useState<
    | "connecting"
    | "ready"
    | "offline"
    | "saving"
    | "proposing"
    | "publishing"
    | "published"
    | "compiling"
  >("connecting");
  const [draftDirty, setDraftDirty] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<WorkbenchAiProposal | null>(
    null,
  );
  const [exchangeStatus, setExchangeStatus] = useState<string | null>(null);
  const [revisionTimeline, setRevisionTimeline] =
    useState<WorkbenchRevisionTimeline | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [artifactSnapshot, setArtifactSnapshot] =
    useState<WorkbenchArtifactContent | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [guidedCreationOpen, setGuidedCreationOpen] = useState(false);
  const [applications, setApplications] = useState<
    readonly WorkbenchApplicationSummary[]
  >([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [compilingApplicationKey, setCompilingApplicationKey] = useState<
    string | null
  >(null);
  const bootstrapRequest = useRef(0);
  const applicationsRequest = useRef(0);
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

  const refreshApplications = useCallback(async (): Promise<void> => {
    const request = ++applicationsRequest.current;
    setApplicationsLoading(true);
    try {
      const next = await controlPlane.listLocalApplicationSummaries();
      if (request === applicationsRequest.current) setApplications(next);
    } catch (error) {
      if (request === applicationsRequest.current) {
        setOperationError(
          error instanceof Error
            ? error.message
            : "Local applications could not be read.",
        );
      }
    } finally {
      if (request === applicationsRequest.current) {
        setApplicationsLoading(false);
      }
    }
  }, [controlPlane]);

  const adoptOpenedApplication = useCallback(
    (opened: WorkbenchOpenedApplication): void => {
      ++bootstrapRequest.current;
      setGraph(opened.draft.graph);
      setRemoteDraft(opened.draft);
      setPublishedRevision(opened.publishedRevision);
      setCompilation(null);
      setPreviewRun(null);
      setDraftDirty(false);
      setAiProposal(null);
      setHistoryOpen(false);
      setRevisionTimeline(null);
      dispatch({
        type: "synchronize-draft",
        revision: `r.${opened.draft.revisionNumber}`,
      });
      if (
        opened.publishedRevision?.sourceDraftRevisionId ===
        opened.draft.draftRevisionId
      ) {
        dispatch({ type: "publish" });
        setConnectionState("published");
      } else {
        setConnectionState("ready");
      }
    },
    [],
  );

  const bootstrapGraph = useCallback(
    async (nextGraph: ApplicationGraphV1): Promise<void> => {
      const request = ++bootstrapRequest.current;
      setGraph(nextGraph);
      setRemoteDraft(null);
      setPublishedRevision(null);
      setCompilation(null);
      setPreviewRun(null);
      setDraftDirty(false);
      setAiProposal(null);
      setOperationError(null);
      dispatch({ type: "synchronize-draft", revision: "r.0" });
      setConnectionState("connecting");

      try {
        const draft = await controlPlane.bootstrapLocalDraft(nextGraph);
        if (request !== bootstrapRequest.current) return;
        setRemoteDraft(draft);
        setGraph(draft.graph);
        dispatch({
          type: "synchronize-draft",
          revision: `r.${draft.revisionNumber}`,
        });
        setConnectionState("ready");
      } catch (error) {
        if (request === bootstrapRequest.current) {
          setConnectionState("offline");
        }
        throw error;
      }
    },
    [controlPlane],
  );

  useEffect(() => {
    void bootstrapGraph(initialGraph)
      .catch(() => undefined)
      .finally(() => void refreshApplications());
  }, [bootstrapGraph, initialGraph, refreshApplications]);

  useEffect(() => {
    if (state.activeSurface === "home") void refreshApplications();
  }, [refreshApplications, state.activeSurface]);

  useEffect(() => {
    if (!compilation || !isPendingCompilation(compilation.result.status))
      return;
    let active = true;
    const refresh = () => {
      void controlPlane
        .getCompilation(compilation.id)
        .then((next) => {
          if (!active) return;
          setCompilation(next);
          if (!isPendingCompilation(next.result.status)) {
            setConnectionState("published");
            void refreshApplications();
          }
        })
        .catch((error) => {
          if (!active) return;
          setOperationError(
            error instanceof Error
              ? error.message
              : "Compilation status could not be read.",
          );
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 1_500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [compilation, controlPlane, refreshApplications]);

  useEffect(() => {
    if (!compilation || compilation.result.status !== "succeeded") {
      setPreviewRun(null);
      return;
    }
    let active = true;
    void controlPlane
      .getCurrentPreviewRun(compilation.id)
      .then((next) => {
        if (active) setPreviewRun(next);
      })
      .catch((error) => {
        if (!active) return;
        setOperationError(
          error instanceof Error
            ? error.message
            : "Generated preview status could not be read.",
        );
      });
    return () => {
      active = false;
    };
  }, [compilation?.id, compilation?.result.status, controlPlane]);

  useEffect(() => {
    if (previewRun?.status !== "starting" && previewRun?.status !== "stopping")
      return;
    let active = true;
    const refresh = () => {
      void controlPlane
        .getCurrentPreviewRun(previewRun.compilationId)
        .then((next) => {
          if (active) setPreviewRun(next);
        })
        .catch((error) => {
          if (!active) return;
          setOperationError(
            error instanceof Error
              ? error.message
              : "Generated preview status could not be read.",
          );
        });
    };
    const interval = window.setInterval(refresh, 1_500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [controlPlane, previewRun]);

  const persistDraft = async (): Promise<WorkbenchDraft> => {
    if (!remoteDraft) {
      throw new Error("The local Control Plane is unavailable.");
    }
    setConnectionState("saving");
    const next = await controlPlane.appendDraft(
      remoteDraft.applicationGraphId,
      graph,
    );
    setRemoteDraft(next);
    setGraph(next.graph);
    dispatch({
      type: "synchronize-draft",
      revision: `r.${next.revisionNumber}`,
    });
    setDraftDirty(false);
    setConnectionState("ready");
    return next;
  };

  const saveDraft = () => {
    setOperationError(null);
    void persistDraft()
      .then(() => refreshApplications())
      .catch((error) => {
        setConnectionState("offline");
        setOperationError(
          error instanceof Error ? error.message : "Draft save failed.",
        );
      });
  };

  const publish = () => {
    setOperationError(null);
    void (async () => {
      const draft = draftDirty ? await persistDraft() : remoteDraft;
      if (!draft) throw new Error("The local Control Plane is unavailable.");
      setConnectionState("publishing");
      const published = await controlPlane.publishDraft(
        draft.applicationGraphId,
        draft.draftRevisionId,
      );
      setPublishedRevision({ ...published, graph: draft.graph });
      dispatch({ type: "publish" });
      setConnectionState("published");
      await refreshApplications();
    })().catch((error) => {
      setConnectionState("offline");
      setOperationError(
        error instanceof Error ? error.message : "Publish failed.",
      );
    });
  };

  const queueCompilation = () => {
    if (!publishedRevision) return;
    setOperationError(null);
    setConnectionState("compiling");
    void controlPlane
      .createCompilation(publishedRevision.id)
      .then((next) => {
        setCompilation(next);
        setConnectionState("published");
        dispatch({ type: "open", surface: "code" });
        void refreshApplications();
      })
      .catch((error) => {
        setConnectionState("offline");
        setOperationError(
          error instanceof Error
            ? error.message
            : "Compilation could not be queued.",
        );
      });
  };

  const toggleRevisionTimeline = () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    if (!remoteDraft) return;
    setHistoryLoading(true);
    setOperationError(null);
    void controlPlane
      .listRevisionTimeline(remoteDraft.applicationGraphId)
      .then((timeline) => {
        setRevisionTimeline(timeline);
        setHistoryOpen(true);
      })
      .catch((error) => {
        setOperationError(
          error instanceof Error
            ? error.message
            : "Revision history could not be read.",
        );
      })
      .finally(() => setHistoryLoading(false));
  };

  const inspectArtifact = (artifactPath: string) => {
    if (!compilation) return;
    setArtifactLoading(true);
    setOperationError(null);
    void controlPlane
      .getCompilationArtifact(compilation.id, artifactPath)
      .then(setArtifactSnapshot)
      .catch((error) => {
        setArtifactSnapshot(null);
        setOperationError(
          error instanceof Error
            ? error.message
            : "Generated artifact could not be inspected.",
        );
      })
      .finally(() => setArtifactLoading(false));
  };

  const startPreview = () => {
    if (!compilation || compilation.result.status !== "succeeded") return;
    setOperationError(null);
    void controlPlane
      .startPreviewRun(compilation.id)
      .then(setPreviewRun)
      .catch((error) => {
        setOperationError(
          error instanceof Error
            ? error.message
            : "Generated preview failed to start.",
        );
      });
  };

  const stopPreview = () => {
    if (!previewRun) return;
    setOperationError(null);
    void controlPlane
      .stopPreviewRun(previewRun.id)
      .then(setPreviewRun)
      .catch((error) => {
        setOperationError(
          error instanceof Error
            ? error.message
            : "Generated preview failed to stop.",
        );
      });
  };

  const openPreview = () => {
    if (previewRun?.status !== "ready" || !previewRun.previewUrl) return;
    window.open(previewRun.previewUrl, "_blank", "noopener,noreferrer");
  };

  const downloadPublishedGraphExchange = (
    exchange: PublishedGraphExchangeV1,
  ) => {
    const url = URL.createObjectURL(
      new Blob([serializeGraphExchange(exchange)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = graphExchangeFilename(exchange);
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPublishedGraph = () => {
    if (!remoteDraft || !publishedRevision) return;
    setOperationError(null);
    setExchangeStatus("Preparing verified Graph exchange…");
    void controlPlane
      .exportPublishedGraph(
        remoteDraft.applicationGraphId,
        publishedRevision.id,
      )
      .then((exchange) => {
        downloadPublishedGraphExchange(exchange);
        setExchangeStatus(
          `Exported Published r.${exchange.publishedRevision.revisionNumber}.`,
        );
      })
      .catch((error) => {
        setExchangeStatus(null);
        setOperationError(
          error instanceof Error ? error.message : "Graph export failed.",
        );
      });
  };

  const importPublishedGraph = (file: File) => {
    setOperationError(null);
    setExchangeStatus("Validating Graph exchange…");
    void file
      .text()
      .then(parseGraphExchangeText)
      .then((exchange) => controlPlane.importPublishedGraph(exchange))
      .then((draft) => {
        ++bootstrapRequest.current;
        setGraph(draft.graph);
        setRemoteDraft(draft);
        setPublishedRevision(null);
        setCompilation(null);
        setDraftDirty(false);
        setAiProposal(null);
        dispatch({
          type: "synchronize-draft",
          revision: `r.${draft.revisionNumber}`,
        });
        setConnectionState("ready");
        setExchangeStatus(`Imported as Draft r.${draft.revisionNumber}.`);
      })
      .catch((error) => {
        setExchangeStatus(null);
        setOperationError(
          error instanceof Error ? error.message : "Graph import failed.",
        );
      });
  };

  const changePageModel = (page: PageModel) => {
    setGraph((current) => ({ ...current, page }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Page Studio" });
  };
  const changeDomainModel = (domain: DomainModel) => {
    setGraph((current) => ({ ...current, domain }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Domain Studio" });
  };
  const changePolicyModel = (policy: PolicyModel) => {
    setGraph((current) => ({ ...current, policy }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Policy Studio" });
  };
  const changeFlowModel = (flow: FlowModel) => {
    setGraph((current) => ({ ...current, flow }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Flow Studio" });
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
      setAiProposal(result);
      dispatch({
        type: "synchronize-draft",
        revision: `r.${result.draft.revisionNumber}`,
      });
      dispatch({ type: "propose-draft-change", source: "AI Studio" });
      setConnectionState("ready");
      return result.summary;
    } catch (error) {
      setConnectionState("offline");
      const message =
        error instanceof Error ? error.message : "AI proposal failed.";
      setOperationError(message);
      throw error;
    }
  };
  const active =
    navigation.find((item) => item.id === state.activeSurface) ?? navigation[0];
  const createGuidedDraft = async (input: GuidedApplicationInput) => {
    setOperationError(null);
    const nonce = globalThis.crypto.randomUUID().toLowerCase();
    await bootstrapGraph(createGuidedApplicationDraft(input, nonce));
    await refreshApplications();
    dispatch({ type: "open", surface: "page" });
  };

  const openApplication = (applicationKey: string) => {
    setOperationError(null);
    setConnectionState("connecting");
    void controlPlane
      .openLocalApplication(applicationKey)
      .then((opened) => {
        adoptOpenedApplication(opened);
        dispatch({ type: "open", surface: "page" });
      })
      .catch((error) => {
        setConnectionState("offline");
        setOperationError(
          error instanceof Error
            ? error.message
            : "Application could not be opened.",
        );
      });
  };

  const compileApplication = (applicationKey: string) => {
    setOperationError(null);
    setCompilingApplicationKey(applicationKey);
    setConnectionState("compiling");
    void controlPlane
      .openLocalApplication(applicationKey)
      .then(async (opened) => {
        if (!opened.publishedRevision) {
          throw new Error("Publish this application before compiling.");
        }
        adoptOpenedApplication(opened);
        setConnectionState("compiling");
        const next = await controlPlane.createCompilation(
          opened.publishedRevision.id,
        );
        setCompilation(next);
        setConnectionState("published");
        dispatch({ type: "open", surface: "code" });
        await refreshApplications();
      })
      .catch((error) => {
        setConnectionState("offline");
        setOperationError(
          error instanceof Error
            ? error.message
            : "Compilation could not be queued.",
        );
      })
      .finally(() => setCompilingApplicationKey(null));
  };

  return (
    <main className={`workbench theme-${state.theme}`} data-theme={state.theme}>
      <aside className="rail" aria-label="Workbench navigation">
        <button
          className="brand-mark"
          aria-label="Factory Pilot home"
          onClick={() => dispatch({ type: "open", surface: "home" })}
          type="button"
        >
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
            <button
              className="new-application-button"
              onClick={() => setGuidedCreationOpen(true)}
              type="button"
            >
              <Plus size={15} /> New application
            </button>
            <div className="project-picker" aria-label="Current application">
              <span className="project-glyph">
                <FolderKanban size={15} />
              </span>
              <span className="project-name">{graph.metadata.name}</span>
            </div>
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
              disabled={
                !remoteDraft ||
                connectionState === "saving" ||
                connectionState === "proposing" ||
                connectionState === "publishing" ||
                connectionState === "compiling" ||
                state.lifecycle === "published"
              }
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
            {publishedRevision && (
              <button
                className="compile-button"
                onClick={queueCompilation}
                disabled={connectionState === "compiling"}
              >
                <Code2 size={15} />
                {connectionState === "compiling" ? "Queueing…" : "Compile"}
              </button>
            )}
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
              <button
                className="quiet-button"
                onClick={() => setGuidedCreationOpen(true)}
                type="button"
              >
                <Plus size={15} /> Add
              </button>
              <button
                className="quiet-button"
                disabled={!remoteDraft || historyLoading}
                onClick={toggleRevisionTimeline}
              >
                <GitBranch size={15} /> History
              </button>
            </div>
          </div>
          <div className={`canvas surface-${state.activeSurface}`}>
            <section
              className="canvas-board"
              aria-label={`${active.label} canvas`}
            >
              {state.activeSurface === "home" && (
                <WorkbenchHome
                  applications={applications}
                  compilingKey={compilingApplicationKey}
                  loading={applicationsLoading}
                  onCompile={compileApplication}
                  onCreate={() => setGuidedCreationOpen(true)}
                  onOpen={openApplication}
                />
              )}
              {state.activeSurface === "page" && (
                <PageStudio
                  pageDocument={pageDocument}
                  entityKeys={graph.domain.entities.map((entity) => entity.key)}
                  onPageModelChange={changePageModel}
                />
              )}
              {state.activeSurface === "domain" && (
                <DomainCanvas
                  graph={graph}
                  onDomainChange={changeDomainModel}
                />
              )}
              {state.activeSurface === "flow" && (
                <FlowStudio
                  diagram={flowDiagram}
                  flow={graph.flow}
                  roles={graph.policy.roles}
                  capabilities={graph.integration.capabilities}
                  onFlowChange={changeFlowModel}
                />
              )}
              {state.activeSurface === "policy" && (
                <PolicyCanvas
                  graph={graph}
                  onPolicyChange={changePolicyModel}
                />
              )}
              {state.activeSurface === "ai" && (
                <AiCanvas
                  disabled={!remoteDraft || connectionState === "proposing"}
                  onPropose={proposeWithAi}
                  proposal={aiProposal}
                />
              )}
              {state.activeSurface === "code" && (
                <CodeCanvas
                  canExport={Boolean(remoteDraft && publishedRevision)}
                  compilation={compilation}
                  exchangeStatus={exchangeStatus}
                  graph={graph}
                  onExportPublishedGraph={exportPublishedGraph}
                  onImportPublishedGraph={importPublishedGraph}
                  onInspectArtifact={inspectArtifact}
                  onOpenPreview={openPreview}
                  onStartPreview={startPreview}
                  onStopPreview={stopPreview}
                  publishedRevision={publishedRevision}
                  previewRun={previewRun}
                  artifactLoading={artifactLoading}
                  artifactSnapshot={artifactSnapshot}
                />
              )}
            </section>
            {state.lastProposal && (
              <p className="draft-proposal-status" role="status">
                <span /> {state.lastProposal} proposed a Draft change
                <small>{state.draftProposals}</small>
              </p>
            )}
            {state.propertiesOpen && state.activeSurface !== "home" && (
              <PropertiesPanel surface={state.activeSurface} />
            )}
          </div>
          {historyOpen && (
            <RevisionTimeline
              currentDraftId={remoteDraft?.draftRevisionId ?? null}
              currentPublishedId={publishedRevision?.id ?? null}
              onClose={() => setHistoryOpen(false)}
              timeline={revisionTimeline}
            />
          )}
          <div className="workbench-operations" role="status">
            <span className={`connection-dot connection-${connectionState}`} />
            <span>
              {connectionState === "offline"
                ? "Control Plane unavailable"
                : `Control Plane ${connectionState}`}
            </span>
            {draftDirty && <span className="draft-changed">Unsaved Draft</span>}
            {operationError && (
              <span className="operation-error">{operationError}</span>
            )}
            {draftDirty && remoteDraft && (
              <button
                className="quiet-button"
                onClick={saveDraft}
                disabled={connectionState === "saving"}
              >
                Save draft
              </button>
            )}
          </div>
        </section>
      </section>
      <GuidedCreationDrawer
        onClose={() => setGuidedCreationOpen(false)}
        onCreate={createGuidedDraft}
        open={guidedCreationOpen}
      />
    </main>
  );
}

function RevisionTimeline({
  currentDraftId,
  currentPublishedId,
  onClose,
  timeline,
}: {
  currentDraftId: string | null;
  currentPublishedId: string | null;
  onClose: () => void;
  timeline: WorkbenchRevisionTimeline | null;
}) {
  const entries = [
    ...(timeline?.drafts ?? []).map((revision) => ({
      id: revision.id,
      kind: "Draft" as const,
      revision: revision.revisionNumber,
      isCurrent: revision.id === currentDraftId,
      detail: `${revision.graph.page.pages.length} pages · ${revision.graph.domain.entities.length} entities · ${revision.graph.flow.flows.length} flows`,
    })),
    ...(timeline?.published ?? []).map((revision) => ({
      id: revision.id,
      kind: "Published" as const,
      revision: revision.revisionNumber,
      isCurrent: revision.id === currentPublishedId,
      detail: revision.graphHash.slice(0, 18),
    })),
  ];
  return (
    <section
      className="revision-timeline"
      aria-label="Application Graph revision timeline"
    >
      <div className="revision-timeline-heading">
        <div>
          <span>Revision timeline</span>
          <strong>Draft snapshots and immutable publications</strong>
        </div>
        <button
          aria-label="Close revision timeline"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <ol>
        {entries.map((entry) => (
          <li
            className={entry.isCurrent ? "is-current" : ""}
            key={`${entry.kind}:${entry.id}`}
          >
            <span
              className={`revision-kind revision-kind-${entry.kind.toLowerCase()}`}
            >
              {entry.kind}
            </span>
            <strong>r.{entry.revision}</strong>
            <small>{entry.detail}</small>
            {entry.isCurrent && <em>Current</em>}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="timeline-empty">No persisted revisions yet.</li>
        )}
      </ol>
    </section>
  );
}

function DomainCanvas({
  graph,
  onDomainChange,
}: {
  graph: ApplicationGraphV1;
  onDomainChange: (domain: DomainModel) => void;
}) {
  const [entityKey, setEntityKey] = useState(
    graph.domain.entities[0]?.key ?? "",
  );
  const [newEntityKey, setNewEntityKey] = useState("");
  const [newEntityLabel, setNewEntityLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] =
    useState<DomainModel["entities"][number]["fields"][number]["type"]>(
      "string",
    );
  const [required, setRequired] = useState(true);
  const [unique, setUnique] = useState(false);
  const [enumValues, setEnumValues] = useState("");
  const [indexField, setIndexField] = useState("");
  const [indexUnique, setIndexUnique] = useState(false);
  const [relationTarget, setRelationTarget] = useState("");
  const [relationKind, setRelationKind] =
    useState<DomainModel["relations"][number]["kind"]>("one-to-many");
  const [relationField, setRelationField] = useState("");
  const [error, setError] = useState<string | null>(null);
  const primary =
    graph.domain.entities.find((entity) => entity.key === entityKey) ??
    graph.domain.entities[0];
  const relationDiagram = useMemo(
    () => domainModelToReactFlow(graph.domain),
    [graph.domain],
  );

  useEffect(() => {
    if (!graph.domain.entities.some((entity) => entity.key === entityKey)) {
      setEntityKey(graph.domain.entities[0]?.key ?? "");
    }
  }, [entityKey, graph.domain.entities]);
  useEffect(() => {
    if (!primary) return;
    if (!primary.fields.some((field) => field.key === indexField)) {
      setIndexField(primary.fields[0]?.key ?? "");
    }
    if (!primary.fields.some((field) => field.key === relationField)) {
      setRelationField("");
    }
    if (
      !graph.domain.entities.some(
        (entity) => entity.key === relationTarget && entity.key !== primary.key,
      )
    ) {
      setRelationTarget(
        graph.domain.entities.find((entity) => entity.key !== primary.key)
          ?.key ?? "",
      );
    }
  }, [
    graph.domain.entities,
    indexField,
    primary,
    relationField,
    relationTarget,
  ]);

  const addField = () => {
    const key = fieldKey.trim();
    if (!key) return;
    try {
      const values = enumValues
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      onDomainChange(
        addDomainField(graph.domain, entityKey, {
          key,
          type: fieldType,
          required,
          ...(unique ? { unique: true } : {}),
          ...(fieldType === "enum" ? { values } : {}),
        }),
      );
      setFieldKey("");
      setEnumValues("");
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add field.",
      );
    }
  };

  const createEntity = () => {
    const key = newEntityKey.trim();
    const label = newEntityLabel.trim();
    if (!key || !label) return;
    try {
      onDomainChange(
        addDomainEntity(graph.domain, { key, label, fields: [], indexes: [] }),
      );
      setEntityKey(key);
      setNewEntityKey("");
      setNewEntityLabel("");
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add entity.",
      );
    }
  };

  const createIndex = () => {
    if (!primary || !indexField) return;
    try {
      onDomainChange(
        addDomainIndex(graph.domain, primary.key, {
          fields: [indexField],
          ...(indexUnique ? { unique: true } : {}),
        }),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add index.",
      );
    }
  };

  const createRelation = () => {
    if (!primary || !relationTarget) return;
    try {
      onDomainChange(
        addDomainRelation(graph.domain, {
          from: primary.key,
          to: relationTarget,
          kind: relationKind,
          ...(relationField ? { field: relationField } : {}),
        }),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add relation.",
      );
    }
  };

  return (
    <div className="domain-canvas">
      <DomainRelationGraph diagram={relationDiagram} />
      <div className="record-card primary-record">
        <span className="record-icon">
          <FileText size={16} />
        </span>
        <strong>{primary?.label ?? "No entity"}</strong>
        <small>Selected record</small>
        <div>
          {primary?.fields.map((field) => (
            <code key={field.key}>{field.key}</code>
          ))}
        </div>
      </div>
      <div className="record-link" aria-hidden="true" />
      <form
        className="domain-entity-editor"
        onSubmit={(event) => {
          event.preventDefault();
          createEntity();
        }}
      >
        <label>
          Entity key
          <input
            value={newEntityKey}
            onChange={(event) => setNewEntityKey(event.target.value)}
            placeholder="expense-line"
            pattern="[a-z][a-z0-9-]*"
          />
        </label>
        <label>
          Label
          <input
            value={newEntityLabel}
            onChange={(event) => setNewEntityLabel(event.target.value)}
            placeholder="Expense line"
          />
        </label>
        <button type="submit">
          <Plus size={15} /> Add entity
        </button>
      </form>
      <form
        className="domain-field-editor"
        onSubmit={(event) => {
          event.preventDefault();
          addField();
        }}
      >
        <label>
          Entity
          <select
            value={entityKey}
            onChange={(event) => setEntityKey(event.target.value)}
          >
            {graph.domain.entities.map((entity) => (
              <option key={entity.key} value={entity.key}>
                {entity.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Field key
          <input
            value={fieldKey}
            onChange={(event) => setFieldKey(event.target.value)}
            placeholder="priority"
            pattern="[a-z][a-zA-Z0-9_]*"
          />
        </label>
        <label>
          Type
          <select
            value={fieldType}
            onChange={(event) =>
              setFieldType(event.target.value as typeof fieldType)
            }
          >
            {[
              "string",
              "text",
              "integer",
              "decimal",
              "boolean",
              "date",
              "datetime",
              "enum",
              "json",
              "url",
              "email",
            ].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="required-field">
          <input
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            type="checkbox"
          />{" "}
          Required
        </label>
        <label className="required-field">
          <input
            checked={unique}
            onChange={(event) => setUnique(event.target.checked)}
            type="checkbox"
          />{" "}
          Unique
        </label>
        {fieldType === "enum" && (
          <label className="enum-values-field">
            Values
            <input
              value={enumValues}
              onChange={(event) => setEnumValues(event.target.value)}
              placeholder="draft, submitted"
            />
          </label>
        )}
        <button type="submit">
          <Plus size={15} /> Add field
        </button>
      </form>
      {primary && (
        <div className="domain-schema-controls">
          <section>
            <div className="domain-section-heading">
              <strong>Field constraints</strong>
              <small>Declared schema only</small>
            </div>
            {primary.fields.map((field) => (
              <label className="domain-existing-field" key={field.key}>
                <code>{field.key}</code>
                <span>{field.type}</span>
                <input
                  checked={field.required}
                  onChange={(event) => {
                    try {
                      onDomainChange(
                        setDomainFieldOptions(
                          graph.domain,
                          primary.key,
                          field.key,
                          { required: event.target.checked },
                        ),
                      );
                      setError(null);
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Unable to update field.",
                      );
                    }
                  }}
                  type="checkbox"
                />
                Required
                <input
                  checked={field.unique ?? false}
                  onChange={(event) => {
                    try {
                      onDomainChange(
                        setDomainFieldOptions(
                          graph.domain,
                          primary.key,
                          field.key,
                          { unique: event.target.checked },
                        ),
                      );
                      setError(null);
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Unable to update field.",
                      );
                    }
                  }}
                  type="checkbox"
                />
                Unique
              </label>
            ))}
          </section>
          <form
            className="domain-index-editor"
            onSubmit={(event) => {
              event.preventDefault();
              createIndex();
            }}
          >
            <label>
              Index field
              <select
                value={indexField}
                onChange={(event) => setIndexField(event.target.value)}
              >
                {primary.fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.key}
                  </option>
                ))}
              </select>
            </label>
            <label className="required-field">
              <input
                checked={indexUnique}
                onChange={(event) => setIndexUnique(event.target.checked)}
                type="checkbox"
              />{" "}
              Unique index
            </label>
            <button type="submit">Add index</button>
          </form>
          <form
            className="domain-relation-editor"
            onSubmit={(event) => {
              event.preventDefault();
              createRelation();
            }}
          >
            <label>
              Relation target
              <select
                value={relationTarget}
                onChange={(event) => setRelationTarget(event.target.value)}
              >
                {graph.domain.entities
                  .filter((entity) => entity.key !== primary.key)
                  .map((entity) => (
                    <option key={entity.key} value={entity.key}>
                      {entity.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Kind
              <select
                value={relationKind}
                onChange={(event) =>
                  setRelationKind(event.target.value as typeof relationKind)
                }
              >
                {[
                  "one-to-one",
                  "one-to-many",
                  "many-to-one",
                  "many-to-many",
                ].map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source field
              <select
                value={relationField}
                onChange={(event) => setRelationField(event.target.value)}
              >
                <option value="">No source field</option>
                {primary.fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.key}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={!relationTarget} type="submit">
              Add relation
            </button>
          </form>
        </div>
      )}
      {error && <small className="studio-error domain-error">{error}</small>}
      <div className="record-note">
        {graph.domain.relations.length} declared relation
        {graph.domain.relations.length === 1 ? "" : "s"} ·{" "}
        {primary?.fields.length ?? 0} fields
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
  const actions = [
    "create",
    "read",
    "update",
    "delete",
    "submit",
    "approve",
    "reject",
    "audit",
  ];
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
                  {actions.map((action) => (
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

function AiCanvas({
  disabled,
  onPropose,
  proposal,
}: {
  disabled: boolean;
  onPropose: (brief: string) => Promise<string>;
  proposal: WorkbenchAiProposal | null;
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
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Proposal failed."),
      )
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
        <button
          disabled={disabled || submitting || !brief.trim()}
          onClick={submit}
          type="button"
        >
          {submitting ? "Proposing…" : "Propose Draft change"}
        </button>
        {proposal && (
          <section
            className="ai-proposal-evidence"
            aria-label="AI proposal impact and test suggestions"
          >
            <strong>{proposal.summary}</strong>
            <p>
              Affects{" "}
              {proposal.affectedModels.length
                ? proposal.affectedModels.join(", ")
                : "no declared model"}
              .
            </p>
            {proposal.risks.length > 0 && (
              <p>Risks: {proposal.risks.join(", ")}</p>
            )}
            {proposal.testSuggestions.length > 0 && (
              <ul>
                {proposal.testSuggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <code>{suggestion.type}</code> {suggestion.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {error && <small className="ai-error">{error}</small>}
      </div>
    </div>
  );
}

function CodeCanvas({
  graph,
  publishedRevision,
  compilation,
  canExport,
  exchangeStatus,
  onExportPublishedGraph,
  onImportPublishedGraph,
  onInspectArtifact,
  onOpenPreview,
  onStartPreview,
  onStopPreview,
  artifactLoading,
  artifactSnapshot,
  previewRun,
}: {
  graph: ApplicationGraphV1;
  publishedRevision: WorkbenchPublishedRevision | null;
  compilation: WorkbenchCompilation | null;
  canExport: boolean;
  exchangeStatus: string | null;
  onExportPublishedGraph: () => void;
  onImportPublishedGraph: (file: File) => void;
  onInspectArtifact: (path: string) => void;
  onOpenPreview: () => void;
  onStartPreview: () => void;
  onStopPreview: () => void;
  artifactLoading: boolean;
  artifactSnapshot: WorkbenchArtifactContent | null;
  previewRun: WorkbenchPreviewRun | null;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const artifacts = compilation?.artifacts ?? [];
  const artifactPreview = [
    ...artifacts.filter(
      (artifact) =>
        artifact.path === "capability-template-lock.json" ||
        artifact.path === "capability-lock.json",
    ),
    ...artifacts.filter(
      (artifact) =>
        artifact.path !== "capability-template-lock.json" &&
        artifact.path !== "capability-lock.json",
    ),
  ].slice(0, 6);
  const graphDiff = publishedRevision?.graph
    ? diffApplicationGraphs(publishedRevision.graph, graph)
    : null;
  const preview = previewRunPresentation(
    compilation?.result.status === "succeeded",
    previewRun,
  );
  const adapterMetadata = [
    ["Puck", "PageModel adapter", "puck/v1"],
    ["React Flow", "Flow and relation adapter", "react-flow/v1"],
    ["Prisma", "Domain compiler", "prisma/v1"],
    ["XState", "Flow compiler", "xstate/v1"],
    ["Casbin", "Policy compiler", "casbin/v1"],
  ] as const;
  return (
    <div className="code-canvas">
      <div className="code-tabs">
        <span className="selected">application-graph.json</span>
        <span>
          {publishedRevision
            ? `Published r.${publishedRevision.revisionNumber}`
            : "Draft only"}
        </span>
        <span>
          {compilation
            ? `Compile ${compilation.result.status}`
            : "No compilation"}
        </span>
      </div>
      <pre>
        <code>
          <i>01</i> metadata: <b>{JSON.stringify(graph.metadata.id)}</b>,{"\n"}
          <i>02</i> pages: <b>{graph.page.pages.length}</b>,{"\n"}
          <i>03</i> entities: <b>{graph.domain.entities.length}</b>,{"\n"}
          <i>04</i> flows: <b>{graph.flow.flows.length}</b>,{"\n"}
          <i>05</i> lifecycle:{" "}
          <b>{JSON.stringify("Draft → Publish → Compile")}</b>,{"\n"}
          <i>06</i> graphHash:{" "}
          <b>
            {JSON.stringify(publishedRevision?.graphHash ?? "pending publish")}
          </b>
          ,{"\n"}
          <i>07</i> compilation:{" "}
          <b>{JSON.stringify(compilation?.result.status ?? "not queued")}</b>
        </code>
      </pre>
      <section className="graph-diff" aria-label="Application Graph diff">
        <div>
          <strong>Graph diff</strong>
          <small>
            {graphDiff
              ? graphDiff.changed
                ? `${graphDiff.entries.length} semantic change${graphDiff.entries.length === 1 ? "" : "s"} from Published`
                : "Matches Published semantics"
              : "Publish a revision to compare"}
          </small>
        </div>
        {graphDiff?.changed && (
          <ul>
            {graphDiff.entries.slice(0, 8).map((entry) => (
              <li key={`${entry.scope}:${entry.kind}:${entry.key}`}>
                <span className={`graph-diff-${entry.kind}`}>{entry.kind}</span>
                <code>{entry.scope}</code>
                <strong>{entry.key}</strong>
              </li>
            ))}
            {graphDiff.entries.length > 8 && (
              <li>+{graphDiff.entries.length - 8} more Graph changes</li>
            )}
          </ul>
        )}
      </section>
      <section className="adapter-metadata" aria-label="Adapter metadata">
        <div>
          <strong>Adapter metadata</strong>
          <small>
            Declared projections; generated source is not reverse-imported.
          </small>
        </div>
        <ul>
          {adapterMetadata.map(([name, responsibility, version]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{responsibility}</span>
              <code>{version}</code>
            </li>
          ))}
        </ul>
      </section>
      <div className="graph-exchange-actions">
        <div>
          <strong>Graph-first Git exchange</strong>
          <small>Published Graph only · no source or runtime artifacts</small>
        </div>
        <span className="graph-exchange-spacer" />
        <input
          ref={importInput}
          accept="application/json,.json"
          className="graph-exchange-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportPublishedGraph(file);
            event.target.value = "";
          }}
          type="file"
        />
        <button onClick={() => importInput.current?.click()} type="button">
          Import Draft
        </button>
        <button
          disabled={!canExport}
          onClick={onExportPublishedGraph}
          type="button"
        >
          Export Published
        </button>
      </div>
      {exchangeStatus && (
        <p className="graph-exchange-status" role="status">
          {exchangeStatus}
        </p>
      )}
      {preview.visible && (
        <section
          className="generated-preview"
          aria-label="Generated application preview"
        >
          <div>
            <strong>Generated preview</strong>
            <small role="status">{preview.label}</small>
          </div>
          <p>
            Runs only this immutable generated Compilation. Stopping removes its
            isolated preview resources.
          </p>
          {previewRun?.status === "failed" && previewRun.diagnostic && (
            <small className="generated-preview-diagnostic">
              {previewRun.diagnostic}
            </small>
          )}
          <div className="generated-preview-actions">
            <button
              disabled={!preview.canStart}
              onClick={onStartPreview}
              type="button"
            >
              Start preview
            </button>
            <button
              disabled={!preview.canOpen}
              onClick={onOpenPreview}
              type="button"
            >
              Open preview
            </button>
            <button
              disabled={!preview.canStop}
              onClick={onStopPreview}
              type="button"
            >
              Stop preview
            </button>
          </div>
        </section>
      )}
      {compilation && (
        <section
          className="compilation-artifacts"
          aria-label="Generated artifact manifest"
        >
          <div>
            <strong>Generated artifact manifest</strong>
            <small>
              {artifacts.length
                ? `${artifacts.length} immutable outputs`
                : "Awaiting Worker evidence"}
            </small>
          </div>
          {artifacts.length > 0 && (
            <ul>
              {artifactPreview.map((artifact) => (
                <li key={artifact.path}>
                  <button
                    onClick={() => onInspectArtifact(artifact.path)}
                    type="button"
                  >
                    <code>{artifact.path}</code>
                  </button>
                  <span>{artifact.digest.slice(0, 18)}…</span>
                </li>
              ))}
              {artifacts.length > artifactPreview.length && (
                <li className="artifact-more">
                  +{artifacts.length - artifactPreview.length} more
                </li>
              )}
            </ul>
          )}
        </section>
      )}
      {(artifactLoading || artifactSnapshot) && (
        <section
          className="artifact-snapshot"
          aria-label="Generated source snapshot"
        >
          <div>
            <strong>
              {artifactLoading
                ? "Verifying generated artifact…"
                : artifactSnapshot?.path}
            </strong>
            {artifactSnapshot && (
              <small>
                {artifactSnapshot.digest.slice(0, 18)}… · verified snapshot
              </small>
            )}
          </div>
          {artifactSnapshot && (
            <pre>
              <code>{artifactSnapshot.content}</code>
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

function PropertiesPanel({ surface }: { surface: Surface }) {
  const titles: Record<Surface, string> = {
    home: "Application portfolio",
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
