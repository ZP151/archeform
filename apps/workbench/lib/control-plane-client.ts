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
  readonly graphHash: string;
  readonly graph?: ApplicationGraphV1;
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
  readonly result: { readonly status: string };
  readonly artifacts?: readonly {
    readonly path: string;
    readonly digest: string;
    readonly mediaType: string;
    readonly sizeBytes?: number | null;
  }[];
};

export type WorkbenchArtifactContent = {
  readonly path: string;
  readonly digest: string;
  readonly content: string;
};

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
}
