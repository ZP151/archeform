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
  readonly readiness: readonly WorkbenchProfileReadiness[];
  readonly coverage: readonly WorkbenchProfileCoverage[];
  readonly capabilities: {
    readonly golden: number;
    readonly lockedVersions: number;
    readonly candidate: number;
    readonly provider: number;
  };
  readonly capabilityFamilies: readonly {
    readonly key: string;
    readonly lifecycle: "golden";
    readonly version: string;
    readonly profileCount: number;
    readonly validation: "verified";
    readonly generatedTargetState: "ready";
  }[];
  readonly intake: {
    readonly portfolioSources: number;
    readonly intakeEligible: number;
    readonly candidateBlueprints: number;
    readonly quarantined: number;
    readonly blocked: number;
  };
  readonly supply: WorkbenchCapabilitySupplySummary;
  readonly compilations: {
    readonly queued: number;
    readonly running: number;
    readonly succeeded: number;
    readonly failed: number;
  };
};

export type WorkbenchCapabilitySupplySummary = {
  readonly apiVersion: "factory.capability-supply-summary/v1";
  readonly families: readonly {
    readonly key:
      | "identity"
      | "catalog"
      | "commerce-transaction"
      | "inventory"
      | "availability"
      | "queue"
      | "payment"
      | "fulfillment"
      | "notification"
      | "document"
      | "search"
      | "analytics"
      | "integration";
    readonly profiles: readonly (
      | "expense-approval"
      | "restaurant-ordering"
      | "simple-ecommerce"
      | "retail-counter"
      | "grocery-pickup"
    )[];
    readonly discovery: number;
    readonly quarantined: number;
    readonly blocked: number;
    readonly action:
      | "discover"
      | "qualify"
      | "integrate"
      | "provider-review"
      | "design"
      | "defer";
  }[];
};

export type WorkbenchProfileReadinessStatus =
  "available" | "partial" | "planned" | "provider-required";

export type WorkbenchProfileReadiness = {
  readonly apiVersion: "factory.profile-readiness/v1";
  readonly profile: string;
  readonly label: string;
  readonly generatedTargets: readonly (
    "simulator" | "web" | "api" | "database" | "tests" | "docs"
  )[];
  readonly capabilities: readonly {
    readonly key: string;
    readonly status: WorkbenchProfileReadinessStatus;
  }[];
};

export type WorkbenchProfileCoverageStatus =
  "available" | "partial" | "planned" | "provider-required";

export type WorkbenchProfileCoverage = {
  readonly apiVersion: "factory.profile-coverage/v1";
  readonly key: string;
  readonly label: string;
  readonly status: WorkbenchProfileCoverageStatus;
  readonly packageKeys: readonly string[];
  readonly profiles: readonly (
    | "expense-approval"
    | "restaurant-ordering"
    | "simple-ecommerce"
    | "retail-counter"
    | "grocery-pickup"
  )[];
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

function capabilitySupply(value: unknown): WorkbenchCapabilitySupplySummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Control Plane Capability supply is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (
    record.apiVersion !== "factory.capability-supply-summary/v1" ||
    !Array.isArray(record.families) ||
    Object.keys(record).some(
      (key) => key !== "apiVersion" && key !== "families",
    )
  ) {
    throw new Error("Control Plane Capability supply is invalid.");
  }
  const keys = new Set<
    WorkbenchCapabilitySupplySummary["families"][number]["key"]
  >([
    "identity",
    "catalog",
    "commerce-transaction",
    "inventory",
    "availability",
    "queue",
    "payment",
    "fulfillment",
    "notification",
    "document",
    "search",
    "analytics",
    "integration",
  ]);
  const profiles = new Set([
    "expense-approval",
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ]);
  const actions = new Set([
    "discover",
    "qualify",
    "integrate",
    "provider-review",
    "design",
    "defer",
  ]);
  const families = record.families.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Control Plane Capability supply is invalid.");
    }
    const item = value as Record<string, unknown>;
    if (
      Object.keys(item).some(
        (key) =>
          ![
            "key",
            "profiles",
            "discovery",
            "quarantined",
            "blocked",
            "action",
          ].includes(key),
      ) ||
      typeof item.key !== "string" ||
      !keys.has(
        item.key as WorkbenchCapabilitySupplySummary["families"][number]["key"],
      ) ||
      !Array.isArray(item.profiles) ||
      item.profiles.some(
        (profile) => typeof profile !== "string" || !profiles.has(profile),
      ) ||
      new Set(item.profiles).size !== item.profiles.length ||
      typeof item.action !== "string" ||
      !actions.has(item.action)
    ) {
      throw new Error("Control Plane Capability supply is invalid.");
    }
    return {
      key: item.key as WorkbenchCapabilitySupplySummary["families"][number]["key"],
      profiles:
        item.profiles as WorkbenchCapabilitySupplySummary["families"][number]["profiles"],
      discovery: nonNegativeCount(item.discovery, "supply.discovery"),
      quarantined: nonNegativeCount(item.quarantined, "supply.quarantined"),
      blocked: nonNegativeCount(item.blocked, "supply.blocked"),
      action:
        item.action as WorkbenchCapabilitySupplySummary["families"][number]["action"],
    };
  });
  if (new Set(families.map((family) => family.key)).size !== families.length) {
    throw new Error("Control Plane Capability supply is invalid.");
  }
  return {
    apiVersion: "factory.capability-supply-summary/v1",
    families,
  };
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
  const readiness = record.readiness;
  if (!Array.isArray(readiness)) {
    throw new Error("Control Plane Portfolio readiness is invalid.");
  }
  const supportedProfiles = new Set([
    "expense-approval",
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ]);
  const supportedTargets = new Set([
    "simulator",
    "web",
    "api",
    "database",
    "tests",
    "docs",
  ]);
  const supportedReadinessStatuses = new Set([
    "available",
    "partial",
    "planned",
    "provider-required",
  ]);
  const capabilityKeyPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
  const readinessRecords = readiness.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Control Plane Profile readiness is invalid.");
    }
    const candidate = entry as Record<string, unknown>;
    if (
      candidate.apiVersion !== "factory.profile-readiness/v1" ||
      typeof candidate.profile !== "string" ||
      !supportedProfiles.has(candidate.profile) ||
      typeof candidate.label !== "string" ||
      !Array.isArray(candidate.generatedTargets) ||
      !Array.isArray(candidate.capabilities)
    ) {
      throw new Error("Control Plane Profile readiness is invalid.");
    }
    const generatedTargets = candidate.generatedTargets.map((target) => {
      if (typeof target !== "string" || !supportedTargets.has(target)) {
        throw new Error("Control Plane Profile readiness target is invalid.");
      }
      return target as WorkbenchProfileReadiness["generatedTargets"][number];
    });
    if (
      generatedTargets.length !== supportedTargets.size ||
      new Set(generatedTargets).size !== supportedTargets.size
    ) {
      throw new Error("Control Plane Profile readiness targets are invalid.");
    }
    const capabilities = candidate.capabilities.map((capability) => {
      if (
        !capability ||
        typeof capability !== "object" ||
        Array.isArray(capability)
      ) {
        throw new Error(
          "Control Plane Profile readiness capability is invalid.",
        );
      }
      const item = capability as Record<string, unknown>;
      if (
        typeof item.key !== "string" ||
        !capabilityKeyPattern.test(item.key) ||
        typeof item.status !== "string" ||
        !supportedReadinessStatuses.has(item.status)
      ) {
        throw new Error(
          "Control Plane Profile readiness capability is invalid.",
        );
      }
      return {
        key: item.key,
        status: item.status as WorkbenchProfileReadinessStatus,
      };
    });
    return {
      apiVersion: "factory.profile-readiness/v1" as const,
      profile: candidate.profile,
      label: candidate.label,
      generatedTargets,
      capabilities,
    };
  });
  const coverage = record.coverage;
  if (!Array.isArray(coverage)) {
    throw new Error("Control Plane Profile coverage is invalid.");
  }
  const coverageRecords = coverage.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Control Plane Profile coverage is invalid.");
    }
    const candidate = entry as Record<string, unknown>;
    if (
      Object.keys(candidate).some(
        (key) =>
          ![
            "apiVersion",
            "key",
            "label",
            "status",
            "packageKeys",
            "profiles",
          ].includes(key),
      ) ||
      candidate.apiVersion !== "factory.profile-coverage/v1" ||
      typeof candidate.key !== "string" ||
      !capabilityKeyPattern.test(candidate.key) ||
      typeof candidate.label !== "string" ||
      candidate.label.trim().length === 0 ||
      typeof candidate.status !== "string" ||
      !supportedReadinessStatuses.has(candidate.status) ||
      !Array.isArray(candidate.packageKeys) ||
      !Array.isArray(candidate.profiles)
    ) {
      throw new Error("Control Plane Profile coverage is invalid.");
    }
    const packageKeys = candidate.packageKeys.map((packageKey) => {
      if (
        typeof packageKey !== "string" ||
        !capabilityKeyPattern.test(packageKey)
      ) {
        throw new Error("Control Plane Profile coverage package is invalid.");
      }
      return packageKey;
    });
    const profiles = candidate.profiles.map((profile) => {
      if (typeof profile !== "string" || !supportedProfiles.has(profile)) {
        throw new Error("Control Plane Profile coverage profile is invalid.");
      }
      return profile as WorkbenchProfileCoverage["profiles"][number];
    });
    if (
      new Set(packageKeys).size !== packageKeys.length ||
      profiles.length === 0 ||
      new Set(profiles).size !== profiles.length
    ) {
      throw new Error("Control Plane Profile coverage is invalid.");
    }
    return {
      apiVersion: "factory.profile-coverage/v1" as const,
      key: candidate.key,
      label: candidate.label,
      status: candidate.status as WorkbenchProfileCoverageStatus,
      packageKeys,
      profiles,
    };
  });
  if (
    new Set(coverageRecords.map((coverage) => coverage.key)).size !==
    coverageRecords.length
  ) {
    throw new Error("Control Plane Profile coverage is invalid.");
  }
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
  const capabilityFamilies = record.capabilityFamilies;
  if (!Array.isArray(capabilityFamilies)) {
    throw new Error("Control Plane Capability families are invalid.");
  }
  const capabilityFamilyRecords = capabilityFamilies.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Control Plane Capability family is invalid.");
    }
    const family = entry as Record<string, unknown>;
    if (
      typeof family.key !== "string" ||
      !capabilityKeyPattern.test(family.key) ||
      family.lifecycle !== "golden" ||
      typeof family.version !== "string" ||
      family.version.trim().length === 0 ||
      family.validation !== "verified" ||
      family.generatedTargetState !== "ready"
    ) {
      throw new Error("Control Plane Capability family is invalid.");
    }
    return {
      key: family.key,
      lifecycle: "golden" as const,
      version: family.version,
      profileCount: nonNegativeCount(
        family.profileCount,
        "capability family profileCount",
      ),
      validation: "verified" as const,
      generatedTargetState: "ready" as const,
    };
  });

  return {
    apiVersion: "factory.workspace-portfolio-summary/v1",
    profiles: profileRecords,
    readiness: readinessRecords,
    coverage: coverageRecords,
    capabilities: counts(
      record.capabilities,
      ["golden", "lockedVersions", "candidate", "provider"] as const,
      "capabilities",
    ),
    capabilityFamilies: capabilityFamilyRecords,
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
    supply: capabilitySupply(record.supply),
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
