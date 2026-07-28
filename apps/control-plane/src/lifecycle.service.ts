import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  hashApplicationGraph,
  parseApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import { PrismaService } from "./prisma.service.js";

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
  constructor(private readonly prisma: PrismaService) {}

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

  async createCompilation(input: unknown) {
    const body = exactRecord(
      input,
      ["publishedRevisionId", "target", "compilerVersion", "result"],
      ["publishedRevisionId", "target", "compilerVersion", "result"],
    );
    const publishedRevisionId = requiredString(body, "publishedRevisionId");
    const target = requiredString(body, "target");
    const compilerVersion = requiredString(body, "compilerVersion");
    const result = jsonValue(body.result, "result");
    const published = await this.prisma.publishedRevision.findUnique({
      where: { id: publishedRevisionId },
    });
    if (!published)
      throw new NotFoundException("Published revision was not found.");
    const compilationCount = await this.prisma.compilation.count({
      where: { publishedRevisionId },
    });
    return this.prisma.compilation.create({
      data: {
        publishedRevisionId,
        sequence: compilationCount + 1,
        target,
        inputGraphHash: published.graphHash,
        compilerVersion,
        result,
      },
    });
  }
}
