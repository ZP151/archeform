import type {
  ApplicationGraphV1,
  PublishedGraphExchangeV1,
} from "@factory/graph";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type DraftRecord = {
  readonly id: string;
  readonly revisionNumber: number;
  readonly graph: ApplicationGraphV1;
};

type LocalGraphRecord = {
  readonly id: string;
  readonly draftRevisions: readonly DraftRecord[];
  readonly publishedRevisions?: readonly WorkbenchPublishedRevision[];
};

export type WorkbenchDraft = {
  readonly applicationGraphId: string;
  readonly draftRevisionId: string;
  readonly revisionNumber: number;
  readonly graph: ApplicationGraphV1;
};

type AiProposalResponse = {
  readonly draftRevision: DraftRecord;
  readonly proposal: {
    readonly impact: {
      readonly summary: string;
      readonly affectedModels: readonly string[];
      readonly risks: readonly string[];
    };
    readonly testSuggestions: readonly {
      readonly id: string;
      readonly title: string;
      readonly type: string;
    }[];
  };
};

export type WorkbenchAiProposal = {
  readonly draft: WorkbenchDraft;
  readonly summary: string;
  readonly affectedModels: readonly string[];
  readonly risks: readonly string[];
  readonly testSuggestions: readonly {
    readonly id: string;
    readonly title: string;
    readonly type: string;
  }[];
};

export type WorkbenchPublishedRevision = {
  readonly id: string;
  readonly revisionNumber: number;
  readonly sourceDraftRevisionId?: string;
  readonly graphHash: string;
  readonly graph?: ApplicationGraphV1;
};

export type WorkbenchOpenedApplication = {
  readonly draft: WorkbenchDraft;
  readonly publishedRevision: WorkbenchPublishedRevision | null;
};

export type WorkbenchRevisionTimeline = {
  readonly drafts: readonly {
    readonly id: string;
    readonly revisionNumber: number;
    readonly graph: ApplicationGraphV1;
  }[];
  readonly published: readonly WorkbenchPublishedRevision[];
};

export type WorkbenchCompilation = {
  readonly id: string;
  readonly publishedRevisionId: string;
  readonly target: string;
  readonly result: {
    readonly status: string;
    readonly completedAt?: string | null;
  };
  readonly artifacts?: readonly {
    readonly path: string;
    readonly digest: string;
    readonly mediaType: string;
    readonly sizeBytes?: number | null;
  }[];
};

export type WorkbenchApplicationSummary = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly compositionProfile: string | null;
  readonly latestDraft: {
    readonly revisionNumber: number;
    readonly createdAt: string;
  } | null;
  readonly latestPublished: {
    readonly revisionNumber: number;
    readonly publishedAt: string;
  } | null;
  readonly latestCompilation: {
    readonly id: string;
    readonly status: string;
    readonly completedAt: string | null;
  } | null;
  readonly goldenAssetMaturity: {
    readonly status: "golden" | "incomplete";
    readonly goldenAssets: number;
    readonly totalAssets: number;
  };
};

export type WorkbenchWorkspacePortfolioSummary = {
  readonly apiVersion: "factory.workspace-portfolio-summary/v1";
  readonly profiles: readonly {
    readonly profile: string;
    readonly label: string;
    readonly category: "approval" | "commerce";
    readonly requiredPackages: number;
    readonly optionalPackages: number;
  }[];
  readonly capabilities: {
    readonly golden: number;
    readonly lockedVersions: number;
    readonly candidate: number;
    readonly provider: number;
  };
  readonly intake: {
    readonly portfolioSources: number;
    readonly intakeEligible: number;
    readonly candidateBlueprints: number;
    readonly quarantined: number;
    readonly blocked: number;
  };
  readonly compilations: {
    readonly queued: number;
    readonly running: number;
    readonly succeeded: number;
    readonly failed: number;
  };
};

export type WorkbenchArtifactContent = {
  readonly path: string;
  readonly digest: string;
  readonly content: string;
};

export type WorkbenchPreviewRun = {
  readonly id: string;
  readonly compilationId: string;
  readonly status: "starting" | "ready" | "stopping" | "stopped" | "failed";
  readonly previewUrl: string | null;
  readonly webPort: number | null;
  readonly apiPort: number | null;
  readonly diagnostic: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

function workbenchPreviewRun(record: WorkbenchPreviewRun): WorkbenchPreviewRun {
  return {
    id: record.id,
    compilationId: record.compilationId,
    status: record.status,
    previewUrl: record.previewUrl,
    webPort: record.webPort,
    apiPort: record.apiPort,
    diagnostic: record.diagnostic,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class ControlPlaneError extends Error {
  constructor(readonly status: number) {
    super(`Control Plane request failed with ${status}.`);
  }
}

function recordAsDraft(record: LocalGraphRecord): WorkbenchDraft {
  const draft = record.draftRevisions[0];
  if (
    !record.id ||
    !draft?.id ||
    !Number.isInteger(draft.revisionNumber) ||
    !draft.graph
  ) {
    throw new Error(
      "Control Plane response did not contain a current Draft revision.",
    );
  }
  return {
    applicationGraphId: record.id,
    draftRevisionId: draft.id,
    revisionNumber: draft.revisionNumber,
    graph: draft.graph,
  };
}

function recordAsOpenedApplication(
  record: LocalGraphRecord,
): WorkbenchOpenedApplication {
  const draft = recordAsDraft(record);
  const published = record.publishedRevisions?.[0] ?? null;
  return {
    draft,
    publishedRevision: published
      ? {
          id: published.id,
          revisionNumber: published.revisionNumber,
          ...(published.sourceDraftRevisionId
            ? { sourceDraftRevisionId: published.sourceDraftRevisionId }
            : {}),
          graphHash: published.graphHash,
          ...(published.sourceDraftRevisionId === draft.draftRevisionId
            ? { graph: draft.graph }
            : {}),
        }
      : null,
  };
}

function applicationSummary(
  record: WorkbenchApplicationSummary,
): WorkbenchApplicationSummary {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    compositionProfile: record.compositionProfile,
    latestDraft: record.latestDraft
      ? {
          revisionNumber: record.latestDraft.revisionNumber,
          createdAt: record.latestDraft.createdAt,
        }
      : null,
    latestPublished: record.latestPublished
      ? {
          revisionNumber: record.latestPublished.revisionNumber,
          publishedAt: record.latestPublished.publishedAt,
        }
      : null,
    latestCompilation: record.latestCompilation
      ? {
          id: record.latestCompilation.id,
          status: record.latestCompilation.status,
          completedAt: record.latestCompilation.completedAt,
        }
      : null,
    goldenAssetMaturity: {
      status: record.goldenAssetMaturity.status,
      goldenAssets: record.goldenAssetMaturity.goldenAssets,
      totalAssets: record.goldenAssetMaturity.totalAssets,
    },
  };
}

function nonNegativeCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Control Plane Portfolio summary has invalid ${label}.`);
  }
  return value;
}

function workspacePortfolioSummary(
  value: unknown,
): WorkbenchWorkspacePortfolioSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Control Plane Portfolio summary is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (record.apiVersion !== "factory.workspace-portfolio-summary/v1") {
    throw new Error("Control Plane Portfolio summary version is unsupported.");
  }
  const profiles = record.profiles;
  if (!Array.isArray(profiles)) {
    throw new Error("Control Plane Portfolio summary profiles are invalid.");
  }
  const profileRecords = profiles.map((profile) => {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      throw new Error("Control Plane Portfolio profile is invalid.");
    }
    const entry = profile as Record<string, unknown>;
    const category = entry.category;
    if (
      typeof entry.profile !== "string" ||
      typeof entry.label !== "string" ||
      (category !== "approval" && category !== "commerce")
    ) {
      throw new Error("Control Plane Portfolio profile is invalid.");
    }
    return {
      profile: entry.profile,
      label: entry.label,
      category: category as "approval" | "commerce",
      requiredPackages: nonNegativeCount(
        entry.requiredPackages,
        "profile requiredPackages",
      ),
      optionalPackages: nonNegativeCount(
        entry.optionalPackages,
        "profile optionalPackages",
      ),
    };
  });
  const counts = <T extends readonly string[]>(
    input: unknown,
    fields: T,
    label: string,
  ): Record<T[number], number> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(`Control Plane Portfolio ${label} is invalid.`);
    }
    const record = input as Record<string, unknown>;
    return Object.fromEntries(
      fields.map((field) => [
        field,
        nonNegativeCount(record[field], `${label}.${field}`),
      ]),
    ) as Record<T[number], number>;
  };

  return {
    apiVersion: "factory.workspace-portfolio-summary/v1",
    profiles: profileRecords,
    capabilities: counts(
      record.capabilities,
      ["golden", "lockedVersions", "candidate", "provider"] as const,
      "capabilities",
    ),
    intake: counts(
      record.intake,
      [
        "portfolioSources",
        "intakeEligible",
        "candidateBlueprints",
        "quarantined",
        "blocked",
      ] as const,
      "intake",
    ),
    compilations: counts(
      record.compilations,
      ["queued", "running", "succeeded", "failed"] as const,
      "compilations",
    ),
  };
}

export class ControlPlaneClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetcher: Fetcher = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const fetcher = this.fetcher;
    const response = await fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    });
    if (!response.ok) throw new ControlPlaneError(response.status);
    return response.json() as Promise<T>;
  }

  async bootstrapLocalDraft(
    graph: ApplicationGraphV1,
  ): Promise<WorkbenchDraft> {
    try {
      const existing = await this.request<LocalGraphRecord>(
        `/workspaces/local/application-graphs/${encodeURIComponent(graph.metadata.id)}`,
        { method: "GET" },
      );
      return recordAsDraft(existing);
    } catch (error) {
      if (!(error instanceof ControlPlaneError) || error.status !== 404)
        throw error;
    }

    const created = await this.request<LocalGraphRecord>(
      "/workspaces/local/application-graphs",
      { method: "POST", body: JSON.stringify({ graph }) },
    );
    return recordAsDraft(created);
  }

  async listLocalApplicationSummaries(): Promise<
    readonly WorkbenchApplicationSummary[]
  > {
    const records = await this.request<readonly WorkbenchApplicationSummary[]>(
      "/workspaces/local/application-graphs",
      { method: "GET" },
    );
    return records.map(applicationSummary);
  }

  async getWorkspacePortfolioSummary(
    workspaceId: string,
  ): Promise<WorkbenchWorkspacePortfolioSummary> {
    const summary = await this.request<unknown>(
      `/workspaces/${encodeURIComponent(workspaceId)}/portfolio-summary`,
      { method: "GET" },
    );
    return workspacePortfolioSummary(summary);
  }

  async openLocalApplication(
    applicationKey: string,
  ): Promise<WorkbenchOpenedApplication> {
    const record = await this.request<LocalGraphRecord>(
      `/workspaces/local/application-graphs/${encodeURIComponent(applicationKey)}`,
      { method: "GET" },
    );
    return recordAsOpenedApplication(record);
  }

  async appendDraft(
    applicationGraphId: string,
    graph: ApplicationGraphV1,
  ): Promise<WorkbenchDraft> {
    const draft = await this.request<DraftRecord>(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/draft-revisions`,
      { method: "POST", body: JSON.stringify({ graph }) },
    );
    return {
      applicationGraphId,
      draftRevisionId: draft.id,
      revisionNumber: draft.revisionNumber,
      graph: draft.graph,
    };
  }

  async proposeDraft(
    applicationGraphId: string,
    brief: string,
  ): Promise<WorkbenchAiProposal> {
    const response = await this.request<AiProposalResponse>(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/ai-proposals`,
      { method: "POST", body: JSON.stringify({ brief }) },
    );
    return {
      draft: {
        applicationGraphId,
        draftRevisionId: response.draftRevision.id,
        revisionNumber: response.draftRevision.revisionNumber,
        graph: response.draftRevision.graph,
      },
      summary: response.proposal.impact.summary,
      affectedModels: response.proposal.impact.affectedModels,
      risks: response.proposal.impact.risks,
      testSuggestions: response.proposal.testSuggestions,
    };
  }

  publishDraft(
    applicationGraphId: string,
    draftRevisionId: string,
  ): Promise<WorkbenchPublishedRevision> {
    return this.request(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/published-revisions`,
      { method: "POST", body: JSON.stringify({ draftRevisionId }) },
    );
  }

  async listRevisionTimeline(
    applicationGraphId: string,
  ): Promise<WorkbenchRevisionTimeline> {
    const encodedId = encodeURIComponent(applicationGraphId);
    const [drafts, published] = await Promise.all([
      this.request<WorkbenchRevisionTimeline["drafts"]>(
        `/application-graphs/${encodedId}/draft-revisions`,
        { method: "GET" },
      ),
      this.request<WorkbenchRevisionTimeline["published"]>(
        `/application-graphs/${encodedId}/published-revisions`,
        { method: "GET" },
      ),
    ]);
    return { drafts, published };
  }

  exportPublishedGraph(
    applicationGraphId: string,
    publishedRevisionId: string,
  ): Promise<PublishedGraphExchangeV1> {
    return this.request(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/published-revisions/${encodeURIComponent(publishedRevisionId)}/export`,
      { method: "GET" },
    );
  }

  async importPublishedGraph(
    exchange: PublishedGraphExchangeV1,
  ): Promise<WorkbenchDraft> {
    const created = await this.request<LocalGraphRecord>(
      "/workspaces/local/application-graphs/import",
      { method: "POST", body: JSON.stringify({ exchange }) },
    );
    return recordAsDraft(created);
  }

  createCompilation(
    publishedRevisionId: string,
  ): Promise<WorkbenchCompilation> {
    return this.request("/compilations", {
      method: "POST",
      body: JSON.stringify({
        publishedRevisionId,
        target: "application-bundle",
        compilerVersion: "factory-compiler/v1",
      }),
    });
  }

  getCompilation(compilationId: string): Promise<WorkbenchCompilation> {
    return this.request(`/compilations/${encodeURIComponent(compilationId)}`, {
      method: "GET",
    });
  }

  getCompilationArtifact(
    compilationId: string,
    artifactPath: string,
  ): Promise<WorkbenchArtifactContent> {
    return this.request(
      `/compilations/${encodeURIComponent(compilationId)}/artifact-content?path=${encodeURIComponent(artifactPath)}`,
      { method: "GET" },
    );
  }

  startPreviewRun(compilationId: string): Promise<WorkbenchPreviewRun> {
    return this.request<WorkbenchPreviewRun>(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs`,
      { method: "POST", body: JSON.stringify({}) },
    ).then(workbenchPreviewRun);
  }

  getCurrentPreviewRun(
    compilationId: string,
  ): Promise<WorkbenchPreviewRun | null> {
    return this.request<WorkbenchPreviewRun | null>(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
      { method: "GET" },
    ).then((preview) => (preview ? workbenchPreviewRun(preview) : null));
  }

  stopPreviewRun(previewRunId: string): Promise<WorkbenchPreviewRun> {
    return this.request<WorkbenchPreviewRun>(
      `/preview-runs/${encodeURIComponent(previewRunId)}/stop`,
      { method: "POST", body: JSON.stringify({}) },
    ).then(workbenchPreviewRun);
  }
}
