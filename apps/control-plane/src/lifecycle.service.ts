import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

import { PrismaService } from "./prisma.service.js";
import {
  COMPILATION_QUEUE,
  type CompilationQueue,
} from "./compilation-queue.js";
import {
  GRAPH_PROPOSAL_PROVIDER,
  type FactoryGraphProposalProvider,
} from "./graph-proposal.provider.js";

const LOCAL_WORKSPACE_SLUG = "local-workspace";
const LOCAL_WORKSPACE_NAME = "Local workspace";

type UnknownRecord = Record<string, unknown>;

function exactRecord(
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

function requiredString(record: UnknownRecord, key: string): string {
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

function artifactEvidence(input: unknown): ArtifactEvidence {
  const record = exactRecord(input, ["path", "digest", "sizeBytes"], [
    "path",
    "digest",
    "sizeBytes",
  ]);
  const path = requiredString(record, "path");
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new BadRequestException("Artifact path must be a safe relative path.");
  }
  const sizeBytes = record.sizeBytes;
  if (
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 0
  ) {
    throw new BadRequestException("Artifact sizeBytes must be a non-negative integer.");
  }
  return { path, digest: requiredSha256(record, "digest"), sizeBytes };
}

function completionEvidence(input: unknown): {
  readonly graphHash: string;
  readonly rootDirectory: string;
  readonly artifacts: readonly ArtifactEvidence[];
} {
  const body = exactRecord(input, ["graphHash", "rootDirectory", "artifacts"], [
    "graphHash",
    "rootDirectory",
    "artifacts",
  ]);
  if (!Array.isArray(body.artifacts)) {
    throw new BadRequestException("artifacts must be an array.");
  }
  const artifacts = body.artifacts.map(artifactEvidence);
  if (new Set(artifacts.map((artifact) => artifact.path)).size !== artifacts.length) {
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

function jsonValue(value: unknown, key: string): Prisma.InputJsonValue {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("not JSON");
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    throw new BadRequestException(`${key} must be JSON-serializable.`);
  }
}

function validatedGraph(input: unknown): {
  graph: ApplicationGraphV1;
  graphHash: string;
} {
  try {
    const graph = parseApplicationGraph(input);
    return { graph, graphHash: hashApplicationGraph(graph) };
  } catch {
    throw new BadRequestException("Application Graph validation failed.");
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COMPILATION_QUEUE)
    private readonly compilationQueue: CompilationQueue,
    @Inject(GRAPH_PROPOSAL_PROVIDER)
    private readonly graphProposalProvider: FactoryGraphProposalProvider,
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
      const proposal = await this.graphProposalProvider.propose({ graph, brief });
      const nextDraft = applyGraphDiffToDraft(
        createDraftRevision(graph, latestDraft.id),
        proposal.diff,
      );
      const draftRevision = await this.prisma.draftRevision.create({
        data: {
          applicationGraphId,
          revisionNumber: latestDraft.revisionNumber + 1,
          graph: nextDraft.graph as unknown as Prisma.InputJsonValue,
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
      throw new UnprocessableEntityException(
        {
          code: "ai_proposal_rejected",
          reason: error instanceof GraphProposalError ? error.code : "proposal_invalid",
        },
      );
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
    const { graph, graphHash } = validatedGraph(draft.graph);
    assertGraphIdentity(graph, draft.applicationGraph);
    const existing = await this.prisma.publishedRevision.findFirst({
      where: { sourceDraftRevisionId: draftRevisionId, applicationGraphId },
    });
    if (existing)
      throw new ConflictException("Draft revision is already published.");
    const publishedCount = await this.prisma.publishedRevision.count({
      where: { applicationGraphId },
    });
    return this.prisma.publishedRevision.create({
      data: {
        applicationGraphId,
        sourceDraftRevisionId: draftRevisionId,
        revisionNumber: publishedCount + 1,
        graph: graph as unknown as Prisma.InputJsonValue,
        graphHash,
      },
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

  async completeCompilation(compilationId: string, input: unknown) {
    const evidence = completionEvidence(input);
    const compilation = await this.prisma.compilation.findUnique({
      where: { id: compilationId },
    });
    if (!compilation) throw new NotFoundException("Compilation was not found.");
    if (!queuedCompilation(compilation.result)) {
      throw new ConflictException("Compilation is no longer awaiting Worker evidence.");
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
        result: { status: "succeeded", artifactCount: evidence.artifacts.length },
      },
    });
  }
}
