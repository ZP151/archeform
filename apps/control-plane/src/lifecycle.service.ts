import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { dirname, posix, resolve, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import {
  assertGoldenCapabilityAssetLocks,
  createCapabilityCompositionLock,
  type CapabilityCompositionLockV1,
  type CapabilitySelectionV1,
} from "@factory/capabilities";
import { createVerifiedCapabilityCompositionLock } from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createDraftRevision,
  createPublishedGraphExchange,
  hashApplicationGraph,
  parseApplicationGraph,
  parsePublishedGraphExchange,
  type ApplicationGraphV1,
} from "@factory/graph";
import { GraphProposalError } from "@factory/adapters/ai";

import { GeneratedArtifactReader } from "./artifact-content.js";
import { PrismaService } from "./prisma.service.js";
import {
  COMPILATION_QUEUE,
  type CompilationQueue,
} from "./compilation-queue.js";
import {
  GRAPH_PROPOSAL_PROVIDER,
  type FactoryGraphProposalProvider,
} from "./graph-proposal.provider.js";
import {
  PREVIEW_RUN_QUEUE,
  type PreviewRunQueue,
} from "./preview-run-queue.js";

const LOCAL_WORKSPACE_SLUG = "local-workspace";
const LOCAL_WORKSPACE_NAME = "Local workspace";
const FACTORY_REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

type UnknownRecord = Record<string, unknown>;

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

export function exactRecord(
  input: unknown,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
): UnknownRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new BadRequestException("Request body must be an object.");
  }
  const record = input as UnknownRecord;
  const unknownKeys = Object.keys(record).filter(
    (key) => !allowedKeys.includes(key),
  );
  if (unknownKeys.length > 0) {
    throw new BadRequestException(
      `Unsupported request field: ${unknownKeys.sort()[0]}.`,
    );
  }
  for (const key of requiredKeys) {
    if (!(key in record))
      throw new BadRequestException(`Missing request field: ${key}.`);
  }
  return record;
}

export function requiredString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`${key} must be a non-empty string.`);
  }
  return value.trim();
}

function requiredSha256(record: UnknownRecord, key: string): string {
  const value = requiredString(record, key);
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new BadRequestException(`${key} must be a SHA-256 digest.`);
  }
  return value;
}

function requiredBrief(record: UnknownRecord): string {
  const brief = requiredString(record, "brief");
  if (brief.length > 12_000) {
    throw new BadRequestException("brief must not exceed 12000 characters.");
  }
  return brief;
}

function generatedRootDirectory(record: UnknownRecord): string {
  const value = requiredString(record, "rootDirectory");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    throw new BadRequestException(
      "rootDirectory must be a single generated application directory name.",
    );
  }
  return value;
}

type ArtifactEvidence = {
  readonly path: string;
  readonly digest: string;
  readonly sizeBytes: number;
};

export type PreviewDispatch = {
  readonly action: "start" | "stop";
  readonly previewRunId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
  readonly artifacts: readonly ArtifactEvidence[];
};

function artifactEvidence(input: unknown): ArtifactEvidence {
  const record = exactRecord(
    input,
    ["path", "digest", "sizeBytes"],
    ["path", "digest", "sizeBytes"],
  );
  const path = requiredString(record, "path");
  if (
    posix.isAbsolute(path) ||
    win32.isAbsolute(path) ||
    win32.parse(path).root.length > 0 ||
    path.includes("\\") ||
    path
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new BadRequestException(
      "Artifact path must be a safe relative path.",
    );
  }
  const sizeBytes = record.sizeBytes;
  if (
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 0
  ) {
    throw new BadRequestException(
      "Artifact sizeBytes must be a non-negative integer.",
    );
  }
  return { path, digest: requiredSha256(record, "digest"), sizeBytes };
}

function completionEvidence(input: unknown): {
  readonly graphHash: string;
  readonly rootDirectory: string;
  readonly artifacts: readonly ArtifactEvidence[];
} {
  const body = exactRecord(
    input,
    ["graphHash", "rootDirectory", "artifacts"],
    ["graphHash", "rootDirectory", "artifacts"],
  );
  if (!Array.isArray(body.artifacts)) {
    throw new BadRequestException("artifacts must be an array.");
  }
  const artifacts = body.artifacts.map(artifactEvidence);
  if (
    new Set(artifacts.map((artifact) => artifact.path)).size !==
    artifacts.length
  ) {
    throw new BadRequestException("Artifact paths must be unique.");
  }
  return {
    graphHash: requiredSha256(body, "graphHash"),
    rootDirectory: generatedRootDirectory(body),
    artifacts,
  };
}

function queuedCompilation(result: unknown): boolean {
  return (
    !!result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    (result as UnknownRecord).status === "queued"
  );
}

function summaryGraphFields(
  graph: unknown,
): Pick<
  WorkbenchApplicationSummary,
  "compositionProfile" | "goldenAssetMaturity"
> {
  const record =
    graph && typeof graph === "object" && !Array.isArray(graph)
      ? (graph as UnknownRecord)
      : {};
  const integration =
    record.integration &&
    typeof record.integration === "object" &&
    !Array.isArray(record.integration)
      ? (record.integration as UnknownRecord)
      : {};
  const profile = integration.compositionProfile;
  const compositionProfile =
    typeof profile === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile) &&
    profile.length <= 80
      ? profile
      : null;
  const assetLocks = Array.isArray(integration.assetLocks)
    ? integration.assetLocks
    : [];
  const goldenAssets = assetLocks.filter(
    (asset) =>
      !!asset &&
      typeof asset === "object" &&
      !Array.isArray(asset) &&
      (asset as UnknownRecord).lifecycle === "golden",
  ).length;
  return {
    compositionProfile,
    goldenAssetMaturity: {
      status:
        assetLocks.length > 0 && goldenAssets === assetLocks.length
          ? "golden"
          : "incomplete",
      goldenAssets,
      totalAssets: assetLocks.length,
    },
  };
}

function summaryCompilationStatus(result: unknown): string {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return "unknown";
  }
  const status = (result as UnknownRecord).status;
  return typeof status === "string" &&
    ["queued", "running", "succeeded", "failed"].includes(status)
    ? status
    : "unknown";
}

function summaryCompilationCompletedAt(result: unknown): string | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }
  const record = result as UnknownRecord;
  if (record.status !== "succeeded" && record.status !== "failed") {
    return null;
  }
  const completedAt = record.completedAt;
  if (typeof completedAt !== "string") return null;
  const parsed = new Date(completedAt);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === completedAt
    ? completedAt
    : null;
}

export function succeededCompilation(result: unknown): boolean {
  return (
    !!result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    (result as UnknownRecord).status === "succeeded"
  );
}

function previewPort(value: unknown, key: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 65_535
  ) {
    throw new BadRequestException(`${key} must be a valid port number.`);
  }
  return value;
}

function loopbackPreviewUrl(value: unknown): string {
  const previewUrl = requiredString({ previewUrl: value }, "previewUrl");
  let parsed: URL;
  try {
    parsed = new URL(previewUrl);
  } catch {
    throw new BadRequestException("previewUrl must be a valid loopback URL.");
  }
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new BadRequestException("previewUrl must be a valid loopback URL.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function previewReadyEvidence(input: unknown) {
  const body = exactRecord(
    input,
    ["webPort", "apiPort", "previewUrl"],
    ["webPort", "apiPort", "previewUrl"],
  );
  const webPort = previewPort(body.webPort, "webPort");
  const apiPort = previewPort(body.apiPort, "apiPort");
  const previewUrl = loopbackPreviewUrl(body.previewUrl);
  const parsed = new URL(previewUrl);
  if (Number(parsed.port) !== webPort || apiPort === webPort) {
    throw new BadRequestException("Preview evidence ports are invalid.");
  }
  return { webPort, apiPort, previewUrl };
}

function previewFailedEvidence(input: unknown) {
  const body = exactRecord(input, ["diagnostic"], ["diagnostic"]);
  const diagnosticCode = requiredString(body, "diagnostic");
  const messages = {
    preview_start_failed: "Preview startup failed.",
    preview_start_timeout: "Preview startup timed out.",
    preview_stop_failed: "Preview cleanup failed.",
    preview_health_check_failed: "Preview health check failed.",
  } as const;
  if (!Object.prototype.hasOwnProperty.call(messages, diagnosticCode)) {
    throw new BadRequestException(
      "diagnostic must be a supported failure code.",
    );
  }
  const code = diagnosticCode as keyof typeof messages;
  return { diagnosticCode: code, diagnostic: messages[code] };
}

function previewAction(input: unknown): "start" | "stop" {
  if (input !== "start" && input !== "stop") {
    throw new BadRequestException("action must be start or stop.");
  }
  return input;
}

function uniqueConstraint(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function jsonValue(value: unknown, key: string): Prisma.InputJsonValue {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("not JSON");
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    throw new BadRequestException(`${key} must be JSON-serializable.`);
  }
}

export function validatedGraph(input: unknown): {
  graph: ApplicationGraphV1;
  graphHash: string;
} {
  try {
    const graph = parseApplicationGraph(input);
    if (graph.integration.assetLocks?.length) {
      if (!graph.integration.compositionProfile) {
        throw new Error("Golden asset locks require a composition profile.");
      }
      assertGoldenCapabilityAssetLocks(graph.integration.assetLocks, {
        profile: graph.integration.compositionProfile,
        capabilityKeys: graph.integration.capabilities.map(
          (capability) => capability.key,
        ),
      });
    }
    return { graph, graphHash: hashApplicationGraph(graph) };
  } catch {
    throw new BadRequestException("Application Graph validation failed.");
  }
}

function publishedGraphFromDraft(
  graph: ApplicationGraphV1,
): ApplicationGraphV1 {
  const { compositionSelections: _compositionSelections, ...integration } =
    graph.integration;
  return { ...graph, integration };
}

function draftCompositionSelections(
  graph: ApplicationGraphV1,
): readonly CapabilitySelectionV1[] {
  return (
    graph.integration.compositionSelections ??
    (graph.integration.assetLocks ?? []).map((lock) => ({
      lock,
      bindings: {},
    }))
  );
}

function createPublishedCompositionLock(
  draftGraph: ApplicationGraphV1,
  publishedGraph: ApplicationGraphV1,
  repositoryRoot: string,
): CapabilityCompositionLockV1 {
  try {
    return createVerifiedCapabilityCompositionLock(
      {
        graphChecksum: hashApplicationGraph(publishedGraph),
        selections: draftCompositionSelections(draftGraph),
      },
      repositoryRoot,
    );
  } catch {
    throw new BadRequestException("Application Graph validation failed.");
  }
}

function hasEqualJsonStructure(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(
    JSON.parse(JSON.stringify(left)),
    JSON.parse(JSON.stringify(right)),
  );
}

export function verifiedPublishedCompositionLock(
  input: unknown,
  storedHash: string | null,
  graphHash: string,
): CapabilityCompositionLockV1 {
  if (input === null || input === undefined || storedHash === null) {
    throw new ConflictException("Published revision has no composition lock.");
  }
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("invalid lock");
    }
    const packages = (input as { packages?: unknown }).packages;
    if (!Array.isArray(packages)) throw new Error("invalid lock packages");
    const canonical = createCapabilityCompositionLock({
      graphChecksum: graphHash,
      selections: packages as readonly CapabilitySelectionV1[],
    });
    if (
      storedHash !== canonical.lockDigest ||
      !hasEqualJsonStructure(input, canonical)
    ) {
      throw new Error("lock mismatch");
    }
    return canonical;
  } catch {
    throw new ConflictException(
      "Published revision composition lock does not match its stored hash.",
    );
  }
}

function assertGraphIdentity(
  graph: ApplicationGraphV1,
  aggregate: { key: string; workspace: { slug: string } },
): void {
  if (
    graph.metadata.id !== aggregate.key ||
    graph.metadata.workspaceId !== aggregate.workspace.slug
  ) {
    throw new BadRequestException(
      "Application Graph identity does not match its aggregate.",
    );
  }
}

@Injectable()
export class LifecycleService {
  private readonly artifactReader = new GeneratedArtifactReader();
  private readonly capabilityRepositoryRoot = FACTORY_REPOSITORY_ROOT;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(COMPILATION_QUEUE)
    private readonly compilationQueue: CompilationQueue,
    @Inject(GRAPH_PROPOSAL_PROVIDER)
    private readonly graphProposalProvider: FactoryGraphProposalProvider,
    @Inject(PREVIEW_RUN_QUEUE)
    private readonly previewRunQueue: PreviewRunQueue,
  ) {}

  async getLocalApplicationGraph(key: string) {
    const graphKey = requiredString({ key }, "key");
    const aggregate = await this.prisma.applicationGraph.findFirst({
      where: { key: graphKey, workspace: { slug: LOCAL_WORKSPACE_SLUG } },
      include: {
        draftRevisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
        publishedRevisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
      },
    });
    if (!aggregate) {
      throw new NotFoundException("Local Application Graph was not found.");
    }
    return aggregate;
  }

  async listLocalApplicationSummaries(): Promise<
    readonly WorkbenchApplicationSummary[]
  > {
    const applications = await this.prisma.applicationGraph.findMany({
      where: { workspace: { slug: LOCAL_WORKSPACE_SLUG } },
      orderBy: [{ updatedAt: "desc" }, { key: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        draftRevisions: {
          orderBy: { revisionNumber: "desc" },
          take: 1,
          select: { revisionNumber: true, createdAt: true, graph: true },
        },
        publishedRevisions: {
          orderBy: { revisionNumber: "desc" },
          select: {
            id: true,
            revisionNumber: true,
            publishedAt: true,
            compilations: {
              orderBy: { compiledAt: "desc" },
              take: 1,
              select: { id: true, result: true, compiledAt: true },
            },
          },
        },
      },
    });

    return applications.map((application) => {
      const latestDraft = application.draftRevisions[0] ?? null;
      const latestPublished = application.publishedRevisions[0] ?? null;
      const latestCompilation =
        application.publishedRevisions
          .flatMap((published) => published.compilations)
          .sort(
            (left, right) =>
              right.compiledAt.getTime() - left.compiledAt.getTime(),
          )[0] ?? null;
      const graphFields = summaryGraphFields(latestDraft?.graph);
      const compilationStatus = latestCompilation
        ? summaryCompilationStatus(latestCompilation.result)
        : null;
      return {
        id: application.id,
        key: application.key,
        name: application.name,
        ...graphFields,
        latestDraft: latestDraft
          ? {
              revisionNumber: latestDraft.revisionNumber,
              createdAt: latestDraft.createdAt.toISOString(),
            }
          : null,
        latestPublished: latestPublished
          ? {
              revisionNumber: latestPublished.revisionNumber,
              publishedAt: latestPublished.publishedAt.toISOString(),
            }
          : null,
        latestCompilation:
          latestCompilation && compilationStatus
            ? {
                id: latestCompilation.id,
                status: compilationStatus,
                completedAt: summaryCompilationCompletedAt(
                  latestCompilation.result,
                ),
              }
            : null,
      };
    });
  }

  async createLocalApplicationGraph(input: unknown) {
    const body = exactRecord(input, ["graph"], ["graph"]);
    const { graph } = validatedGraph(body.graph);
    if (graph.metadata.workspaceId !== LOCAL_WORKSPACE_SLUG) {
      throw new BadRequestException(
        "Application Graph must belong to the local workspace.",
      );
    }
    const workspace = await this.prisma.workspace.upsert({
      where: { slug: LOCAL_WORKSPACE_SLUG },
      update: {},
      create: { slug: LOCAL_WORKSPACE_SLUG, name: LOCAL_WORKSPACE_NAME },
    });
    return this.prisma.applicationGraph.create({
      data: {
        workspaceId: workspace.id,
        key: graph.metadata.id,
        name: graph.metadata.name,
        draftRevisions: {
          create: {
            revisionNumber: 1,
            graph: graph as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: { draftRevisions: true },
    });
  }

  /**
   * Imports only a verified Graph exchange. Generated source, arbitrary Git
   * history, and provider credentials are deliberately not accepted here.
   */
  async importPublishedGraph(input: unknown) {
    const body = exactRecord(input, ["exchange"], ["exchange"]);
    let graph: ApplicationGraphV1;
    try {
      graph = parsePublishedGraphExchange(body.exchange).graph;
    } catch {
      throw new BadRequestException("Published Graph exchange is invalid.");
    }
    return this.createLocalApplicationGraph({ graph });
  }

  async appendDraftRevision(applicationGraphId: string, input: unknown) {
    const body = exactRecord(input, ["graph"], ["graph"]);
    const { graph } = validatedGraph(body.graph);
    const aggregate = await this.prisma.applicationGraph.findUnique({
      where: { id: applicationGraphId },
      include: { workspace: true },
    });
    if (!aggregate)
      throw new NotFoundException("Application Graph was not found.");
    assertGraphIdentity(graph, aggregate);
    const latest = await this.prisma.draftRevision.findFirst({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "desc" },
    });
    return this.prisma.draftRevision.create({
      data: {
        applicationGraphId,
        revisionNumber: (latest?.revisionNumber ?? 0) + 1,
        graph: graph as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listDraftRevisions(applicationGraphId: string) {
    const aggregate = await this.prisma.applicationGraph.findUnique({
      where: { id: applicationGraphId },
    });
    if (!aggregate)
      throw new NotFoundException("Application Graph was not found.");
    return this.prisma.draftRevision.findMany({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "asc" },
    });
  }

  async proposeDraftRevision(applicationGraphId: string, input: unknown) {
    const body = exactRecord(input, ["brief"], ["brief"]);
    const brief = requiredBrief(body);
    const latestDraft = await this.prisma.draftRevision.findFirst({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "desc" },
      include: { applicationGraph: { include: { workspace: true } } },
    });
    if (!latestDraft) {
      throw new NotFoundException("Draft revision was not found.");
    }
    const { graph } = validatedGraph(latestDraft.graph);
    assertGraphIdentity(graph, latestDraft.applicationGraph);

    try {
      const proposal = await this.graphProposalProvider.propose({
        graph,
        brief,
      });
      const nextDraft = applyGraphDiffToDraft(
        createDraftRevision(graph, latestDraft.id),
        proposal.diff,
      );
      const { graph: validatedNextGraph } = validatedGraph(nextDraft.graph);
      const draftRevision = await this.prisma.draftRevision.create({
        data: {
          applicationGraphId,
          revisionNumber: latestDraft.revisionNumber + 1,
          graph: validatedNextGraph as unknown as Prisma.InputJsonValue,
        },
      });
      return {
        draftRevision,
        proposal: {
          diff: proposal.diff,
          impact: proposal.impact,
          testSuggestions: proposal.testSuggestions,
        },
      };
    } catch (error) {
      // Raw model responses and user briefs never leave the adapter's call frame.
      throw new UnprocessableEntityException({
        code: "ai_proposal_rejected",
        reason:
          error instanceof GraphProposalError ? error.code : "proposal_invalid",
      });
    }
  }

  async getDraft(applicationGraphId: string) {
    const aggregate = await this.prisma.applicationGraph.findUnique({
      where: { id: applicationGraphId },
    });
    if (!aggregate)
      throw new NotFoundException("Application Graph was not found.");
    const draft = await this.prisma.draftRevision.findFirst({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "desc" },
    });
    if (!draft) throw new NotFoundException("Draft revision was not found.");
    return draft;
  }

  async publishDraft(applicationGraphId: string, input: unknown) {
    const body = exactRecord(input, ["draftRevisionId"], ["draftRevisionId"]);
    const draftRevisionId = requiredString(body, "draftRevisionId");
    const draft = await this.prisma.draftRevision.findFirst({
      where: { id: draftRevisionId, applicationGraphId },
      include: { applicationGraph: { include: { workspace: true } } },
    });
    if (!draft)
      throw new NotFoundException(
        "Draft revision was not found for this Graph.",
      );
    const { graph } = validatedGraph(draft.graph);
    assertGraphIdentity(graph, draft.applicationGraph);
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.publishedRevision.findFirst({
        where: { sourceDraftRevisionId: draftRevisionId, applicationGraphId },
      });
      if (existing)
        throw new ConflictException("Draft revision is already published.");
      const publishedCount = await transaction.publishedRevision.count({
        where: { applicationGraphId },
      });
      const publishedGraph = publishedGraphFromDraft(graph);
      const graphHash = hashApplicationGraph(publishedGraph);
      const compositionLock = createPublishedCompositionLock(
        graph,
        publishedGraph,
        this.capabilityRepositoryRoot,
      );
      return transaction.publishedRevision.create({
        data: {
          applicationGraphId,
          sourceDraftRevisionId: draftRevisionId,
          revisionNumber: publishedCount + 1,
          graph: publishedGraph as unknown as Prisma.InputJsonValue,
          graphHash,
          compositionLock: jsonValue(compositionLock, "compositionLock"),
          compositionLockHash: compositionLock.lockDigest,
        },
      });
    });
  }

  async listPublishedRevisions(applicationGraphId: string) {
    const aggregate = await this.prisma.applicationGraph.findUnique({
      where: { id: applicationGraphId },
    });
    if (!aggregate)
      throw new NotFoundException("Application Graph was not found.");
    return this.prisma.publishedRevision.findMany({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "asc" },
    });
  }

  async exportPublishedGraph(
    applicationGraphId: string,
    publishedRevisionId: string,
  ) {
    const published = await this.prisma.publishedRevision.findFirst({
      where: { id: publishedRevisionId, applicationGraphId },
    });
    if (!published) {
      throw new NotFoundException(
        "Published Revision was not found for this Graph.",
      );
    }
    const { graph, graphHash } = validatedGraph(published.graph);
    if (graphHash !== published.graphHash) {
      throw new ConflictException(
        "Published Revision Graph hash does not match its stored hash.",
      );
    }
    return createPublishedGraphExchange(graph, published.revisionNumber);
  }

  async createCompilation(input: unknown) {
    const body = exactRecord(
      input,
      ["publishedRevisionId", "target", "compilerVersion"],
      ["publishedRevisionId", "target", "compilerVersion"],
    );
    const publishedRevisionId = requiredString(body, "publishedRevisionId");
    const target = requiredString(body, "target");
    const compilerVersion = requiredString(body, "compilerVersion");
    const published = await this.prisma.publishedRevision.findUnique({
      where: { id: publishedRevisionId },
    });
    if (!published)
      throw new NotFoundException("Published revision was not found.");
    const { graph, graphHash } = validatedGraph(published.graph);
    if (graphHash !== published.graphHash) {
      throw new ConflictException(
        "Published Revision Graph hash does not match its stored hash.",
      );
    }
    const compositionLock = verifiedPublishedCompositionLock(
      published.compositionLock,
      published.compositionLockHash,
      graphHash,
    );
    const compilationCount = await this.prisma.compilation.count({
      where: { publishedRevisionId },
    });
    const compilation = await this.prisma.compilation.create({
      data: {
        publishedRevisionId,
        sequence: compilationCount + 1,
        target,
        inputGraphHash: published.graphHash,
        compilerVersion,
        result: jsonValue({ status: "queued" }, "result"),
      },
    });
    await this.compilationQueue.enqueue({
      compilationId: compilation.id,
      publishedRevisionId,
      target,
      compilerVersion,
      graph,
      compositionLock,
    });
    return compilation;
  }

  async getCompilation(compilationId: string) {
    const id = requiredString({ compilationId }, "compilationId");
    const compilation = await this.prisma.compilation.findUnique({
      where: { id },
      include: { artifacts: { orderBy: { path: "asc" } } },
    });
    if (!compilation) throw new NotFoundException("Compilation was not found.");
    return compilation;
  }

  async getCompilationArtifact(
    compilationId: string,
    path: string | undefined,
  ) {
    const id = requiredString({ compilationId }, "compilationId");
    const artifactPath = requiredString({ path }, "path");
    const artifact = await this.prisma.artifact.findFirst({
      where: { compilationId: id, path: artifactPath },
    });
    if (!artifact)
      throw new NotFoundException("Generated artifact was not found.");
    const metadata = artifact.metadata;
    const rootDirectory =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? (metadata as UnknownRecord).rootDirectory
        : undefined;
    if (typeof rootDirectory !== "string") {
      throw new ConflictException(
        "Generated artifact has no registered root directory.",
      );
    }
    try {
      return await this.artifactReader.read({
        rootDirectory,
        path: artifact.path,
        digest: artifact.digest,
      });
    } catch {
      throw new ConflictException(
        "Generated artifact content does not match registered evidence.",
      );
    }
  }

  async createPreviewRun(compilationId: string) {
    const id = requiredString({ compilationId }, "compilationId");
    const compilation = await this.prisma.compilation.findUnique({
      where: { id },
      include: { artifacts: true },
    });
    if (!compilation) throw new NotFoundException("Compilation was not found.");
    if (!succeededCompilation(compilation.result)) {
      throw new ConflictException(
        "Compilation must succeed before a preview can start.",
      );
    }
    const current = await this.prisma.previewRun.findFirst({
      where: { compilationId: id },
      orderBy: { sequence: "desc" },
    });
    if (current?.status === "starting" || current?.status === "ready") {
      return current;
    }
    this.previewRootDirectory(compilation.artifacts);
    const sequence =
      (await this.prisma.previewRun.count({
        where: { compilationId: id },
      })) + 1;
    const previewRunId = `preview-${randomUUID()}`;
    const composeProjectName = `factory-preview-${previewRunId}`;
    let preview;
    try {
      preview = await this.prisma.previewRun.create({
        data: {
          id: previewRunId,
          compilationId: id,
          activeKey: id,
          sequence,
          composeProjectName,
          status: "starting",
        },
      });
    } catch (error) {
      if (!uniqueConstraint(error)) throw error;
      const winner = await this.prisma.previewRun.findFirst({
        where: { compilationId: id },
        orderBy: { sequence: "desc" },
      });
      if (winner?.status === "starting" || winner?.status === "ready") {
        return winner;
      }
      throw new ConflictException("Preview run creation conflicted.");
    }
    try {
      await this.previewRunQueue.enqueue({
        action: "start",
        previewRunId: preview.id,
      });
    } catch (error) {
      await this.prisma.previewRun.deleteMany({
        where: { id: preview.id, status: "starting" },
      });
      throw error;
    }
    return preview;
  }

  async getCurrentPreviewRun(compilationId: string) {
    const id = requiredString({ compilationId }, "compilationId");
    const compilation = await this.prisma.compilation.findUnique({
      where: { id },
    });
    if (!compilation) throw new NotFoundException("Compilation was not found.");
    return this.prisma.previewRun.findFirst({
      where: { compilationId: id },
      orderBy: { sequence: "desc" },
    });
  }

  async stopPreviewRun(previewRunId: string) {
    const id = requiredString({ previewRunId }, "previewRunId");
    const preview = await this.prisma.previewRun.findUnique({
      where: { id },
      include: { compilation: { include: { artifacts: true } } },
    });
    if (!preview) throw new NotFoundException("Preview run was not found.");
    if (preview.status === "stopping" || preview.status === "stopped") {
      return preview;
    }
    if (
      preview.status !== "starting" &&
      preview.status !== "ready" &&
      preview.status !== "failed"
    ) {
      throw new ConflictException(
        "Preview run cannot be stopped from its current state.",
      );
    }
    this.previewRootDirectory(preview.compilation.artifacts);
    const transitioned = await this.prisma.previewRun.updateMany({
      where: { id, status: preview.status },
      data: { status: "stopping" },
    });
    if (transitioned.count !== 1) {
      const current = await this.prisma.previewRun.findUnique({
        where: { id },
      });
      if (current?.status === "stopping" || current?.status === "stopped") {
        return current;
      }
      throw new ConflictException("Preview run stop conflicted.");
    }
    try {
      await this.previewRunQueue.enqueue({
        action: "stop",
        previewRunId: id,
      });
    } catch (error) {
      await this.prisma.previewRun.updateMany({
        where: { id, status: "stopping" },
        data: { status: preview.status },
      });
      throw error;
    }
    return { ...preview, status: "stopping" };
  }

  async getPreviewDispatch(
    previewRunId: string,
    requestedAction: unknown,
  ): Promise<PreviewDispatch> {
    const id = requiredString({ previewRunId }, "previewRunId");
    const action = previewAction(requestedAction);
    const preview = await this.prisma.previewRun.findUnique({
      where: { id },
      include: {
        compilation: { include: { artifacts: { orderBy: { path: "asc" } } } },
      },
    });
    if (!preview) throw new NotFoundException("Preview run was not found.");
    const expectedStatus = action === "start" ? "starting" : "stopping";
    if (preview.status !== expectedStatus) {
      throw new ConflictException(
        "Preview run is not awaiting the requested Worker action.",
      );
    }
    const artifacts = preview.compilation.artifacts.map((artifact) =>
      artifactEvidence({
        path: artifact.path,
        digest: artifact.digest,
        sizeBytes: artifact.sizeBytes,
      }),
    );
    return {
      action,
      previewRunId: preview.id,
      rootDirectory: this.previewRootDirectory(preview.compilation.artifacts),
      composeProjectName: preview.composeProjectName,
      artifacts,
    };
  }

  async reportPreviewReady(previewRunId: string, input: unknown) {
    const id = requiredString({ previewRunId }, "previewRunId");
    const evidence = previewReadyEvidence(input);
    const preview = await this.prisma.previewRun.findUnique({ where: { id } });
    if (!preview) throw new NotFoundException("Preview run was not found.");
    if (preview.status !== "starting") {
      throw new ConflictException(
        "Preview run is not awaiting start evidence.",
      );
    }
    const transitioned = await this.prisma.previewRun.updateMany({
      where: { id, status: "starting" },
      data: { status: "ready", ...evidence },
    });
    if (transitioned.count !== 1) {
      throw new ConflictException("Preview run start evidence conflicted.");
    }
    return { ...preview, status: "ready", ...evidence };
  }

  async reportPreviewFailed(previewRunId: string, input: unknown) {
    const id = requiredString({ previewRunId }, "previewRunId");
    const evidence = previewFailedEvidence(input);
    const preview = await this.prisma.previewRun.findUnique({ where: { id } });
    if (!preview) throw new NotFoundException("Preview run was not found.");
    const expectedStatus =
      evidence.diagnosticCode === "preview_stop_failed"
        ? "stopping"
        : "starting";
    if (preview.status !== expectedStatus) {
      throw new ConflictException(
        "Preview run cannot accept failure evidence.",
      );
    }
    const transitioned = await this.prisma.previewRun.updateMany({
      where: { id, status: expectedStatus },
      data: { status: "failed", diagnostic: evidence.diagnostic },
    });
    if (transitioned.count !== 1) {
      throw new ConflictException("Preview run failure evidence conflicted.");
    }
    return { ...preview, status: "failed", diagnostic: evidence.diagnostic };
  }

  async reportPreviewStopped(previewRunId: string) {
    const id = requiredString({ previewRunId }, "previewRunId");
    const preview = await this.prisma.previewRun.findUnique({ where: { id } });
    if (!preview) throw new NotFoundException("Preview run was not found.");
    if (preview.status !== "stopping") {
      throw new ConflictException("Preview run is not awaiting stop evidence.");
    }
    const transitioned = await this.prisma.previewRun.updateMany({
      where: { id, status: "stopping" },
      data: { status: "stopped", activeKey: null },
    });
    if (transitioned.count !== 1) {
      throw new ConflictException("Preview run stop evidence conflicted.");
    }
    return { ...preview, status: "stopped", activeKey: null };
  }

  private previewRootDirectory(
    artifacts: readonly { metadata: unknown }[],
  ): string {
    const roots = artifacts
      .map((artifact) => artifact.metadata)
      .filter(
        (metadata): metadata is UnknownRecord =>
          !!metadata &&
          typeof metadata === "object" &&
          !Array.isArray(metadata),
      )
      .map((metadata) => metadata.rootDirectory)
      .filter((root): root is string => typeof root === "string");
    if (roots.length === 0 || new Set(roots).size !== 1) {
      throw new ConflictException(
        "Compilation has no single registered generated artifact root.",
      );
    }
    return generatedRootDirectory({ rootDirectory: roots[0] });
  }

  async completeCompilation(compilationId: string, input: unknown) {
    const evidence = completionEvidence(input);
    const compilation = await this.prisma.compilation.findUnique({
      where: { id: compilationId },
    });
    if (!compilation) throw new NotFoundException("Compilation was not found.");
    if (!queuedCompilation(compilation.result)) {
      throw new ConflictException(
        "Compilation is no longer awaiting Worker evidence.",
      );
    }
    if (compilation.inputGraphHash !== evidence.graphHash) {
      throw new ConflictException(
        "Worker evidence Graph hash does not match the Compilation input.",
      );
    }
    await this.prisma.artifact.createMany({
      data: evidence.artifacts.map((artifact) => ({
        compilationId,
        kind: "generated-file",
        path: artifact.path,
        digest: artifact.digest,
        mediaType: "application/vnd.factory.generated-file",
        sizeBytes: artifact.sizeBytes,
        metadata: { rootDirectory: evidence.rootDirectory },
      })),
    });
    return this.prisma.compilation.update({
      where: { id: compilationId },
      data: {
        result: {
          status: "succeeded",
          artifactCount: evidence.artifacts.length,
          completedAt: new Date().toISOString(),
        },
      },
    });
  }
}
