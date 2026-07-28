import type { ApplicationGraphV1 } from "@factory/graph";

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
    readonly impact: { readonly summary: string };
  };
};

export type WorkbenchAiProposal = {
  readonly draft: WorkbenchDraft;
  readonly summary: string;
};

export class ControlPlaneError extends Error {
  constructor(readonly status: number) {
    super(`Control Plane request failed with ${status}.`);
  }
}

function recordAsDraft(record: LocalGraphRecord): WorkbenchDraft {
  const draft = record.draftRevisions[0];
  if (!record.id || !draft?.id || !Number.isInteger(draft.revisionNumber) || !draft.graph) {
    throw new Error("Control Plane response did not contain a current Draft revision.");
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

  constructor(baseUrl: string, private readonly fetcher: Fetcher = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    });
    if (!response.ok) throw new ControlPlaneError(response.status);
    return response.json() as Promise<T>;
  }

  async bootstrapLocalDraft(graph: ApplicationGraphV1): Promise<WorkbenchDraft> {
    try {
      const existing = await this.request<LocalGraphRecord>(
        `/workspaces/local/application-graphs/${encodeURIComponent(graph.metadata.id)}`,
        { method: "GET" },
      );
      return recordAsDraft(existing);
    } catch (error) {
      if (!(error instanceof ControlPlaneError) || error.status !== 404) throw error;
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
    };
  }

  publishDraft(applicationGraphId: string, draftRevisionId: string): Promise<unknown> {
    return this.request(
      `/application-graphs/${encodeURIComponent(applicationGraphId)}/published-revisions`,
      { method: "POST", body: JSON.stringify({ draftRevisionId }) },
    );
  }
}
