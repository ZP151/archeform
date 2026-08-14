"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { flowModelToReactFlow } from "@factory/adapters/browser";
import type {
  ApplicationGraphV1,
  DomainModel,
  ExperienceModel,
  FlowModel,
  PageModel,
  PolicyModel,
  PublishedGraphExchangeV1,
} from "@factory/graph";

import {
  ControlPlaneClient,
  type WorkbenchAiProposal,
  type WorkbenchApplicationSummary,
  type WorkbenchArtifactContent,
  type WorkbenchCompilation,
  type WorkbenchDraft,
  type WorkbenchOpenedApplication,
  type WorkbenchPreviewRun,
  type WorkbenchPublishedRevision,
  type WorkbenchRevisionTimeline,
  type WorkbenchWorkspacePortfolioSummary,
  type WorkbenchCuratedTemplate,
  type WorkbenchTemplateDraftInstance,
} from "../lib/control-plane-client";
import { isPendingCompilation } from "../lib/compilation-status";
import {
  graphExchangeFilename,
  parseGraphExchangeText,
  serializeGraphExchange,
} from "../lib/graph-exchange";
import { useProductJourney } from "../lib/product-journey/use-product-journey";
import { useReleaseJourney } from "../lib/product-journey/use-release-journey";
import {
  initialWorkbenchState,
  transitionWorkbench,
  type WorkbenchState,
} from "../lib/workbench-model";

/**
 * The control plane starts cold with the compose stack, so the mount-time
 * bootstrap can race its boot. These bound the retry schedule: one attempt
 * immediately, then one every two seconds until the plane accepts
 * connections (or the bound is exhausted and the shell stays offline).
 */
const BOOTSTRAP_RETRY_DELAY_MS = 2_000;
const BOOTSTRAP_RETRY_LIMIT = 45;

/**
 * The workbench controller owns server state and commands; shell components
 * receive explicit state and callbacks from it. Each overlay exposes its
 * trigger ref so a dismissed sheet can restore focus to the control that
 * opened it.
 */
export type WorkbenchController = {
  readonly state: WorkbenchState;
  readonly graph: ApplicationGraphV1;
  readonly remoteDraft: WorkbenchDraft | null;
  readonly publishedRevision: WorkbenchPublishedRevision | null;
  readonly compilation: WorkbenchCompilation | null;
  readonly previewRun: WorkbenchPreviewRun | null;
  readonly connectionState:
    | "connecting"
    | "ready"
    | "offline"
    | "saving"
    | "proposing"
    | "publishing"
    | "published"
    | "compiling";
  readonly draftDirty: boolean;
  readonly operationError: string | null;
  readonly aiProposal: WorkbenchAiProposal | null;
  readonly exchangeStatus: string | null;
  readonly revisionTimeline: WorkbenchRevisionTimeline | null;
  readonly historyOpen: boolean;
  readonly historyLoading: boolean;
  readonly artifactSnapshot: WorkbenchArtifactContent | null;
  readonly artifactLoading: boolean;
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly applicationsLoading: boolean;
  readonly portfolioSummary: WorkbenchWorkspacePortfolioSummary | null;
  readonly portfolioLoading: boolean;
  readonly compilingApplicationKey: string | null;
  readonly curatedTemplates: readonly WorkbenchCuratedTemplate[];
  readonly templatesLoading: boolean;
  readonly templateDraft: WorkbenchTemplateDraftInstance | null;
  readonly templateBusy: boolean;
  readonly templateError: string | null;
  readonly flowDiagram: ReturnType<typeof flowModelToReactFlow>;
  readonly journey: ReturnType<typeof useProductJourney>;
  readonly release: ReturnType<typeof useReleaseJourney>;

  readonly inspectorTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly activityTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly libraryTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly historyTriggerRef: React.RefObject<HTMLButtonElement | null>;

  readonly navigate: (surface: WorkbenchState["activeSurface"]) => void;
  readonly toggleTheme: () => void;
  readonly toggleInspector: () => void;
  readonly toggleActivity: () => void;
  readonly toggleLibrary: () => void;
  readonly toggleHistory: () => void;
  readonly closeHistory: () => void;
  readonly commandFocus: () => void;
  readonly saveDraft: () => void;
  readonly publish: () => void;
  readonly queueCompilation: () => void;
  readonly openApplication: (applicationKey: string) => void;
  readonly compileApplication: (applicationKey: string) => void;
  readonly startCuratedTemplate: (templateKey: string) => void;
  readonly renameTemplateDraft: (name: string) => void;
  readonly editTemplatePageTitle: (
    input: {
      readonly surfaceKey: "customer-mobile" | "merchant-desktop";
      readonly pageId: string;
    } & (
      | { readonly title: string }
      | {
          readonly regionKey: "main";
          readonly blockIds: readonly string[];
        }
    ),
  ) => void;
  readonly returnToTemplatePreview: () => void;
  readonly inspectArtifact: (artifactPath: string) => void;
  readonly startPreview: () => void;
  readonly stopPreview: () => void;
  readonly openPreview: () => void;
  readonly exportPublishedGraph: () => void;
  readonly importPublishedGraph: (file: File) => void;
  readonly changePageModel: (page: PageModel) => void;
  readonly changeExperienceModel: (experience: ExperienceModel) => void;
  readonly changeDomainModel: (domain: DomainModel) => void;
  readonly changePolicyModel: (policy: PolicyModel) => void;
  readonly changeFlowModel: (flow: FlowModel) => void;
  readonly proposeWithAi: (brief: string) => Promise<string>;
  readonly applyComposedProduct: () => Promise<void>;
};

type Props = {
  readonly initialGraph: ApplicationGraphV1;
  readonly controlPlaneUrl: string;
};

const WORKBENCH_THEME_STORAGE_KEY = "factory.workbench.theme";

export function useWorkbenchController({
  initialGraph,
  controlPlaneUrl,
}: Props): WorkbenchController {
  const [state, dispatch] = useReducer(
    transitionWorkbench,
    initialWorkbenchState,
  );
  useEffect(() => {
    if (
      globalThis.localStorage?.getItem(WORKBENCH_THEME_STORAGE_KEY) === "dark"
    ) {
      dispatch({ type: "toggle-theme" });
    }
  }, []);
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
  const [connectionState, setConnectionState] =
    useState<WorkbenchController["connectionState"]>("connecting");
  const [draftDirty, setDraftDirty] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<WorkbenchAiProposal | null>(
    null,
  );
  const [exchangeStatus, setExchangeStatus] = useState<string | null>(null);
  const [revisionTimeline, setRevisionTimeline] =
    useState<WorkbenchRevisionTimeline | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [artifactSnapshot, setArtifactSnapshot] =
    useState<WorkbenchArtifactContent | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [applications, setApplications] = useState<
    readonly WorkbenchApplicationSummary[]
  >([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [portfolioSummary, setPortfolioSummary] =
    useState<WorkbenchWorkspacePortfolioSummary | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [compilingApplicationKey, setCompilingApplicationKey] = useState<
    string | null
  >(null);
  const [curatedTemplates, setCuratedTemplates] = useState<
    readonly WorkbenchCuratedTemplate[]
  >([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateDraft, setTemplateDraft] =
    useState<WorkbenchTemplateDraftInstance | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const bootstrapRequest = useRef(0);
  const applicationsRequest = useRef(0);
  const portfolioRequest = useRef(0);
  const templateCloneRequest = useRef<{
    readonly templateKey: string;
    readonly requestId: string;
  } | null>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);
  const activityTriggerRef = useRef<HTMLButtonElement>(null);
  const libraryTriggerRef = useRef<HTMLButtonElement>(null);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const controlPlane = useMemo(
    () => new ControlPlaneClient(controlPlaneUrl),
    [controlPlaneUrl],
  );
  const flowDiagram = useMemo(
    () => flowModelToReactFlow(graph.flow),
    [graph.flow],
  );
  const journey = useProductJourney(controlPlaneUrl);

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

  const refreshPortfolio = useCallback(async (): Promise<void> => {
    const request = ++portfolioRequest.current;
    setPortfolioLoading(true);
    try {
      const next = await controlPlane.getWorkspacePortfolioSummary("local");
      if (request === portfolioRequest.current) setPortfolioSummary(next);
    } catch {
      if (request === portfolioRequest.current) setPortfolioSummary(null);
    } finally {
      if (request === portfolioRequest.current) setPortfolioLoading(false);
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
      dispatch({ type: "close-history" });
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

  const release = useReleaseJourney(
    controlPlaneUrl,
    remoteDraft === null
      ? null
      : {
          applicationGraphId: remoteDraft.applicationGraphId,
          draftRevisionId: remoteDraft.draftRevisionId,
        },
    useCallback(
      (draft: WorkbenchDraft) => {
        // The approval created a new Draft revision of the same application
        // graph; adopting re-opens the application so the newest revision
        // becomes the open Draft, and the release surface reseeds for it.
        void controlPlane
          .openLocalApplication(draft.applicationGraphId)
          .then((opened) => {
            adoptOpenedApplication(opened);
            setOperationError(null);
          })
          .catch((error) => {
            setOperationError(
              error instanceof Error
                ? error.message
                : "The approved Draft could not be adopted.",
            );
          });
      },
      [controlPlane, adoptOpenedApplication],
    ),
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
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attemptBootstrap = async (retriesLeft: number): Promise<void> => {
      try {
        await bootstrapGraph(initialGraph);
      } catch {
        // The control plane may still be booting; retry on a bounded schedule
        // instead of wedging the shell in "offline". The bootstrap is
        // idempotent (GET-first, create-on-404), so retries are safe, and a
        // newer request superseding this one resolves the loop naturally.
        if (cancelled || retriesLeft <= 0) return;
        timer = setTimeout(() => {
          void attemptBootstrap(retriesLeft - 1);
        }, BOOTSTRAP_RETRY_DELAY_MS);
      }
    };
    void attemptBootstrap(BOOTSTRAP_RETRY_LIMIT)
      .catch(() => undefined)
      .finally(() => {
        void refreshApplications();
        void refreshPortfolio();
      });
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [bootstrapGraph, initialGraph, refreshApplications, refreshPortfolio]);

  useEffect(() => {
    let active = true;
    setTemplatesLoading(true);
    void controlPlane
      .listCuratedTemplates()
      .then((templates) => {
        if (active) setCuratedTemplates(templates);
      })
      .catch(() => {
        if (active) setCuratedTemplates([]);
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [controlPlane]);

  useEffect(() => {
    if (state.activeSurface === "home") {
      void refreshApplications();
      void refreshPortfolio();
    }
  }, [refreshApplications, refreshPortfolio, state.activeSurface]);

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

  const saveDraft = useCallback(() => {
    setOperationError(null);
    void persistDraft()
      .then(() => refreshApplications())
      .catch((error) => {
        setConnectionState("offline");
        setOperationError(
          error instanceof Error ? error.message : "Draft save failed.",
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, remoteDraft, controlPlane, refreshApplications]);

  const publish = useCallback(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftDirty, remoteDraft, controlPlane, refreshApplications]);

  const queueCompilation = useCallback(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedRevision, controlPlane, refreshApplications]);

  const toggleHistory = useCallback(() => {
    if (state.historyOpen) {
      dispatch({ type: "close-history" });
      return;
    }
    if (!remoteDraft) return;
    setHistoryLoading(true);
    setOperationError(null);
    void controlPlane
      .listRevisionTimeline(remoteDraft.applicationGraphId)
      .then((timeline) => {
        setRevisionTimeline(timeline);
        dispatch({ type: "open-history" });
      })
      .catch((error) => {
        setOperationError(
          error instanceof Error
            ? error.message
            : "Revision history could not be read.",
        );
      })
      .finally(() => setHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.historyOpen, remoteDraft, controlPlane]);

  const closeHistory = useCallback(() => {
    dispatch({ type: "close-history" });
  }, []);

  const inspectArtifact = useCallback(
    (artifactPath: string) => {
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
    },
    [compilation, controlPlane],
  );

  const startPreview = useCallback(() => {
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
  }, [compilation, controlPlane]);

  const stopPreview = useCallback(() => {
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
  }, [previewRun, controlPlane]);

  const openPreview = useCallback(() => {
    if (previewRun?.status !== "ready" || !previewRun.previewUrl) return;
    window.open(previewRun.previewUrl, "_blank", "noopener,noreferrer");
  }, [previewRun]);

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

  const exportPublishedGraph = useCallback(() => {
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
  }, [remoteDraft, publishedRevision, controlPlane]);

  const importPublishedGraph = useCallback(
    (file: File) => {
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
    },
    [controlPlane],
  );

  const changePageModel = useCallback((page: PageModel) => {
    setGraph((current) => ({ ...current, page }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Page Studio" });
  }, []);
  const changeExperienceModel = useCallback((experience: ExperienceModel) => {
    setGraph((current) => ({ ...current, experience }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Page Studio" });
  }, []);
  const changeDomainModel = useCallback((domain: DomainModel) => {
    setGraph((current) => ({ ...current, domain }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Domain Studio" });
  }, []);
  const changePolicyModel = useCallback((policy: PolicyModel) => {
    setGraph((current) => ({ ...current, policy }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Policy Studio" });
  }, []);
  const changeFlowModel = useCallback((flow: FlowModel) => {
    setGraph((current) => ({ ...current, flow }));
    setDraftDirty(true);
    dispatch({ type: "propose-draft-change", source: "Flow Studio" });
  }, []);

  const proposeWithAi = useCallback(
    async (brief: string): Promise<string> => {
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
    },
    [remoteDraft, controlPlane],
  );

  /**
   * Applies the accepted composition Diff and adopts the composed Graph as
   * the open local Draft. The product Graph lives in the local workspace (the
   * product review bound it by key), so the bootstrap GET adopts the applied
   * revision as-is; the next Publish/Compile actions then operate on it.
   */
  const applyComposedProduct = useCallback(async (): Promise<void> => {
    const applied = await journey.applyProduct();
    if (applied === null) return; // failed; the composer shows the bounded error
    try {
      await bootstrapGraph(applied.graph);
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "The composed product could not be opened.",
      );
    }
    await refreshApplications();
    journey.reset();
    dispatch({ type: "open", surface: "page" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey, bootstrapGraph, refreshApplications]);

  const openApplication = useCallback(
    (applicationKey: string) => {
      setOperationError(null);
      setConnectionState("connecting");
      const summary = applications.find(
        (candidate) => candidate.key === applicationKey,
      );
      if (summary?.templateOrigin) {
        setTemplateBusy(true);
        setTemplateError(null);
        void controlPlane
          .openTemplateDraft(applicationKey)
          .then((instance) => {
            setTemplateDraft(instance);
            setConnectionState("ready");
            dispatch({ type: "open", surface: "home" });
          })
          .catch((error) => {
            setConnectionState("offline");
            const message =
              error instanceof Error
                ? error.message
                : "Template Draft could not be opened.";
            setTemplateError(message);
            setOperationError(message);
          })
          .finally(() => setTemplateBusy(false));
        return;
      }
      void controlPlane
        .openLocalApplication(applicationKey)
        .then((opened) => {
          setTemplateDraft(null);
          setTemplateError(null);
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
    },
    [applications, controlPlane, adoptOpenedApplication],
  );

  const startCuratedTemplate = useCallback(
    (templateKey: string) => {
      setTemplateBusy(true);
      setTemplateError(null);
      setOperationError(null);
      setConnectionState("connecting");
      const pendingRequest =
        templateCloneRequest.current?.templateKey === templateKey
          ? templateCloneRequest.current
          : {
              templateKey,
              requestId: `restaurant-${globalThis.crypto.randomUUID()}`,
            };
      templateCloneRequest.current = pendingRequest;
      const selected = curatedTemplates.find(({ key }) => key === templateKey);
      void controlPlane
        .instantiateCuratedTemplate(templateKey, {
          requestId: pendingRequest.requestId,
          ...(selected ? { name: selected.name } : {}),
        })
        .then((instance) => {
          templateCloneRequest.current = null;
          setTemplateDraft(instance);
          setConnectionState("ready");
          void refreshApplications();
        })
        .catch((error) => {
          setConnectionState("offline");
          const message =
            error instanceof Error
              ? error.message
              : "Template Draft could not be created.";
          setTemplateError(message);
          setOperationError(message);
        })
        .finally(() => setTemplateBusy(false));
    },
    [controlPlane, curatedTemplates, refreshApplications],
  );

  const renameTemplateDraft = useCallback(
    (name: string) => {
      if (!templateDraft) return;
      setTemplateBusy(true);
      setTemplateError(null);
      setConnectionState("saving");
      void controlPlane
        .appendTemplateDraftRevision(templateDraft.draft.applicationGraphId, {
          baseDraftRevisionId: templateDraft.draft.draftRevisionId,
          name,
        })
        .then((instance) => {
          setTemplateDraft(instance);
          setConnectionState("ready");
          void refreshApplications();
        })
        .catch((error) => {
          setConnectionState("offline");
          setTemplateError(
            error instanceof Error
              ? error.message
              : "Template Draft could not be saved.",
          );
        })
        .finally(() => setTemplateBusy(false));
    },
    [controlPlane, refreshApplications, templateDraft],
  );

  const editTemplatePageTitle = useCallback(
    (
      input: {
        readonly surfaceKey: "customer-mobile" | "merchant-desktop";
        readonly pageId: string;
      } & (
        | { readonly title: string }
        | {
            readonly regionKey: "main";
            readonly blockIds: readonly string[];
          }
      ),
    ) => {
      if (!templateDraft) return;
      setTemplateBusy(true);
      setTemplateError(null);
      setConnectionState("saving");
      const request =
        "blockIds" in input
          ? controlPlane.appendTemplatePageBlockOrderRevision(
              templateDraft.draft.applicationGraphId,
              {
                baseDraftRevisionId: templateDraft.draft.draftRevisionId,
                ...input,
              },
            )
          : controlPlane.appendTemplatePageRevision(
              templateDraft.draft.applicationGraphId,
              {
                baseDraftRevisionId: templateDraft.draft.draftRevisionId,
                ...input,
              },
            );
      void request
        .then((instance) => {
          setTemplateDraft(instance);
          setConnectionState("ready");
        })
        .catch(() => {
          setConnectionState("ready");
          setTemplateError("Template page could not be saved.");
        })
        .finally(() => setTemplateBusy(false));
    },
    [controlPlane, templateDraft],
  );

  const compileApplication = useCallback(
    (applicationKey: string) => {
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
    },
    [controlPlane, adoptOpenedApplication, refreshApplications],
  );

  const navigate = useCallback((surface: WorkbenchState["activeSurface"]) => {
    if (surface === "home") {
      setTemplateDraft(null);
      setTemplateError(null);
    }
    dispatch({ type: "open", surface });
  }, []);
  const returnToTemplatePreview = useCallback(() => {
    setTemplateError(null);
    dispatch({ type: "open", surface: "home" });
  }, []);

  const toggleTheme = useCallback(() => {
    globalThis.localStorage?.setItem(
      WORKBENCH_THEME_STORAGE_KEY,
      state.theme === "light" ? "dark" : "light",
    );
    dispatch({ type: "toggle-theme" });
  }, [state.theme]);
  const toggleInspector = useCallback(() => {
    dispatch({ type: "toggle-inspector" });
  }, []);
  const toggleActivity = useCallback(() => {
    dispatch({ type: "toggle-activity" });
  }, []);
  const toggleLibrary = useCallback(() => {
    dispatch({ type: "toggle-library" });
  }, []);
  const commandFocus = useCallback(() => {
    setTemplateDraft(null);
    setTemplateError(null);
    dispatch({ type: "open", surface: "home" });
    dispatch({ type: "command-focus" });
  }, []);

  return {
    state,
    graph,
    remoteDraft,
    publishedRevision,
    compilation,
    previewRun,
    connectionState,
    draftDirty,
    operationError,
    aiProposal,
    exchangeStatus,
    revisionTimeline,
    historyOpen: state.historyOpen,
    historyLoading,
    artifactSnapshot,
    artifactLoading,
    applications,
    applicationsLoading,
    portfolioSummary,
    portfolioLoading,
    compilingApplicationKey,
    curatedTemplates,
    templatesLoading,
    templateDraft,
    templateBusy,
    templateError,
    flowDiagram,
    journey,
    release,
    inspectorTriggerRef,
    activityTriggerRef,
    libraryTriggerRef,
    historyTriggerRef,
    navigate,
    toggleTheme,
    toggleInspector,
    toggleActivity,
    toggleLibrary,
    toggleHistory,
    closeHistory,
    commandFocus,
    saveDraft,
    publish,
    queueCompilation,
    openApplication,
    compileApplication,
    startCuratedTemplate,
    renameTemplateDraft,
    editTemplatePageTitle,
    returnToTemplatePreview,
    inspectArtifact,
    startPreview,
    stopPreview,
    openPreview,
    exportPublishedGraph,
    importPublishedGraph,
    changePageModel,
    changeExperienceModel,
    changeDomainModel,
    changePolicyModel,
    changeFlowModel,
    proposeWithAi,
    applyComposedProduct,
  };
}
