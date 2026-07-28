import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LifecycleService } from "../src/lifecycle.service.js";
import type { PrismaService } from "../src/prisma.service.js";
import { localApplicationGraph } from "./application-graph.fixture.js";

function prismaMock() {
  return {
    workspace: { upsert: vi.fn() },
    applicationGraph: { create: vi.fn(), findUnique: vi.fn() },
    draftRevision: { create: vi.fn(), findFirst: vi.fn() },
    publishedRevision: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    compilation: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    artifact: { createMany: vi.fn() },
  };
}

const workspace = {
  id: "workspace-1",
  slug: "local-workspace",
  name: "Local workspace",
  createdAt: new Date("2026-07-29T00:00:00.000Z"),
  updatedAt: new Date("2026-07-29T00:00:00.000Z"),
};

const applicationGraph = {
  id: "graph-1",
  workspaceId: workspace.id,
  key: localApplicationGraph.metadata.id,
  name: localApplicationGraph.metadata.name,
  createdAt: new Date("2026-07-29T00:00:00.000Z"),
  updatedAt: new Date("2026-07-29T00:00:00.000Z"),
};

const draftRevision = {
  id: "draft-1",
  applicationGraphId: applicationGraph.id,
  revisionNumber: 1,
  graph: localApplicationGraph,
  createdAt: new Date("2026-07-29T00:01:00.000Z"),
};

describe("LifecycleService", () => {
  let prisma: ReturnType<typeof prismaMock>;
  let service: LifecycleService;
  let queue: { enqueue: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = prismaMock();
    queue = { enqueue: vi.fn() };
    service = new (LifecycleService as unknown as new (
      prismaService: PrismaService,
      compilationQueue: typeof queue,
    ) => LifecycleService)(prisma as unknown as PrismaService, queue);
  });

  it("creates the local workspace, graph aggregate, and first draft revision", async () => {
    prisma.workspace.upsert.mockResolvedValue(workspace);
    prisma.applicationGraph.create.mockResolvedValue({
      ...applicationGraph,
      draftRevisions: [draftRevision],
    });

    const created = await service.createLocalApplicationGraph({
      graph: localApplicationGraph,
    });

    expect(created).toEqual({
      ...applicationGraph,
      draftRevisions: [draftRevision],
    });
    expect(prisma.workspace.upsert).toHaveBeenCalledWith({
      where: { slug: "local-workspace" },
      update: {},
      create: { slug: "local-workspace", name: "Local workspace" },
    });
    expect(prisma.applicationGraph.create).toHaveBeenCalledWith({
      data: {
        workspaceId: workspace.id,
        key: "expense-approval",
        name: "Expense approval",
        draftRevisions: {
          create: { revisionNumber: 1, graph: localApplicationGraph },
        },
      },
      include: { draftRevisions: true },
    });
  });

  it("appends the next immutable draft revision", async () => {
    prisma.applicationGraph.findUnique.mockResolvedValue({
      ...applicationGraph,
      workspace,
    });
    prisma.draftRevision.findFirst.mockResolvedValue(draftRevision);
    prisma.draftRevision.create.mockResolvedValue({
      ...draftRevision,
      id: "draft-2",
      revisionNumber: 2,
    });

    const appended = await service.appendDraftRevision(applicationGraph.id, {
      graph: localApplicationGraph,
    });

    expect(appended).toMatchObject({ id: "draft-2", revisionNumber: 2 });
    expect(prisma.draftRevision.create).toHaveBeenCalledWith({
      data: {
        applicationGraphId: applicationGraph.id,
        revisionNumber: 2,
        graph: localApplicationGraph,
      },
    });
  });

  it("reads the latest draft revision", async () => {
    prisma.applicationGraph.findUnique.mockResolvedValue(applicationGraph);
    prisma.draftRevision.findFirst.mockResolvedValue(draftRevision);

    await expect(service.getDraft(applicationGraph.id)).resolves.toEqual(
      draftRevision,
    );
    expect(prisma.draftRevision.findFirst).toHaveBeenCalledWith({
      where: { applicationGraphId: applicationGraph.id },
      orderBy: { revisionNumber: "desc" },
    });
  });

  it("publishes a validated stored draft snapshot with a stable Graph hash", async () => {
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...draftRevision,
      applicationGraph: { ...applicationGraph, workspace },
    });
    prisma.publishedRevision.findFirst.mockResolvedValue(null);
    prisma.publishedRevision.count.mockResolvedValue(0);
    const published = {
      id: "published-1",
      applicationGraphId: applicationGraph.id,
      sourceDraftRevisionId: draftRevision.id,
      revisionNumber: 1,
      graph: localApplicationGraph,
      graphHash:
        "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
      publishedAt: new Date("2026-07-29T00:02:00.000Z"),
    };
    prisma.publishedRevision.create.mockResolvedValue(published);

    await expect(
      service.publishDraft(applicationGraph.id, {
        draftRevisionId: draftRevision.id,
      }),
    ).resolves.toEqual(published);
    expect(prisma.publishedRevision.create).toHaveBeenCalledWith({
      data: {
        applicationGraphId: applicationGraph.id,
        sourceDraftRevisionId: draftRevision.id,
        revisionNumber: 1,
        graph: localApplicationGraph,
        graphHash:
          "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
      },
    });
  });

  it("rejects a publish payload that attempts to supply a mutable Graph", async () => {
    await expect(
      service.publishDraft(applicationGraph.id, {
        draftRevisionId: draftRevision.id,
        graph: localApplicationGraph,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.publishedRevision.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown or cross-graph draft revision", async () => {
    prisma.draftRevision.findFirst.mockResolvedValue(null);

    await expect(
      service.publishDraft("another-graph", {
        draftRevisionId: draftRevision.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.draftRevision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: draftRevision.id, applicationGraphId: "another-graph" },
      }),
    );
  });

  it("rejects publishing the same draft revision twice", async () => {
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...draftRevision,
      applicationGraph: { ...applicationGraph, workspace },
    });
    prisma.publishedRevision.findFirst.mockResolvedValue({ id: "published-1" });

    await expect(
      service.publishDraft(applicationGraph.id, {
        draftRevisionId: draftRevision.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.publishedRevision.create).not.toHaveBeenCalled();
  });

  it("rejects publishing a stored draft that fails semantic Graph validation", async () => {
    const invalidGraph = structuredClone(localApplicationGraph);
    invalidGraph.page.navigation.push({
      id: "missing-navigation",
      label: "Missing",
      pageId: "missing-page",
    });
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...draftRevision,
      graph: invalidGraph,
      applicationGraph: { ...applicationGraph, workspace },
    });

    await expect(
      service.publishDraft(applicationGraph.id, {
        draftRevisionId: draftRevision.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.publishedRevision.create).not.toHaveBeenCalled();
  });

  it("lists published revisions in publication order", async () => {
    prisma.applicationGraph.findUnique.mockResolvedValue(applicationGraph);
    prisma.publishedRevision.findMany.mockResolvedValue([
      { id: "published-1" },
    ]);

    await expect(
      service.listPublishedRevisions(applicationGraph.id),
    ).resolves.toEqual([{ id: "published-1" }]);
    expect(prisma.publishedRevision.findMany).toHaveBeenCalledWith({
      where: { applicationGraphId: applicationGraph.id },
      orderBy: { revisionNumber: "asc" },
    });
  });

  it("rejects a client supplied compilation result", async () => {
    await expect(
      service.createCompilation({
        publishedRevisionId: "published-1",
        target: "application-bundle",
        compilerVersion: "0.1.0",
        result: { status: "succeeded" },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.compilation.create).not.toHaveBeenCalled();
  });

  it("queues a validated Published Graph and never accepts a client supplied result", async () => {
    prisma.publishedRevision.findUnique.mockResolvedValue({
      id: "published-1",
      graph: localApplicationGraph,
      graphHash:
        "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
    });
    prisma.compilation.count.mockResolvedValue(0);
    prisma.compilation.create.mockResolvedValue({ id: "compilation-1" });
    queue.enqueue.mockResolvedValue(undefined);

    await expect(
      service.createCompilation({
        publishedRevisionId: "published-1",
        target: "application-bundle",
        compilerVersion: "0.1.0",
      }),
    ).resolves.toEqual({ id: "compilation-1" });

    expect(prisma.compilation.create).toHaveBeenCalledWith({
      data: {
        publishedRevisionId: "published-1",
        sequence: 1,
        target: "application-bundle",
        inputGraphHash:
          "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
        compilerVersion: "0.1.0",
        result: { status: "queued" },
      },
    });
    expect(queue.enqueue).toHaveBeenCalledWith({
      compilationId: "compilation-1",
      publishedRevisionId: "published-1",
      target: "application-bundle",
      compilerVersion: "0.1.0",
      graph: localApplicationGraph,
    });
  });

  it("records matching Worker artifact evidence without storing the Graph", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-1",
      inputGraphHash:
        "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
      result: { status: "queued" },
    });
    prisma.artifact.createMany.mockResolvedValue({ count: 1 });
    prisma.compilation.update.mockResolvedValue({ id: "compilation-1" });

    await expect(
      service.completeCompilation("compilation-1", {
        graphHash:
          "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
        rootDirectory: "expense-approval-published-1",
        artifacts: [
          {
            path: "api/src/main.ts",
            digest:
              "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            sizeBytes: 48,
          },
        ],
      }),
    ).resolves.toEqual({ id: "compilation-1" });

    expect(prisma.artifact.createMany).toHaveBeenCalledWith({
      data: [
        {
          compilationId: "compilation-1",
          kind: "generated-file",
          path: "api/src/main.ts",
          digest:
            "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          mediaType: "application/vnd.factory.generated-file",
          sizeBytes: 48,
          metadata: { rootDirectory: "expense-approval-published-1" },
        },
      ],
    });
    expect(prisma.compilation.update).toHaveBeenCalledWith({
      where: { id: "compilation-1" },
      data: { result: { status: "succeeded", artifactCount: 1 } },
    });
  });

  it("rejects compilation inputs containing a DraftRevision or mutable Graph", async () => {
    await expect(
      service.createCompilation({
        publishedRevisionId: "published-1",
        draftRevisionId: draftRevision.id,
        graph: localApplicationGraph,
        target: "simulator",
        compilerVersion: "0.1.0",
        result: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.compilation.create).not.toHaveBeenCalled();
  });

  it("rejects a compilation for an unknown PublishedRevision", async () => {
    prisma.publishedRevision.findUnique.mockResolvedValue(null);

    await expect(
      service.createCompilation({
        publishedRevisionId: "missing-published",
        target: "application-bundle",
        compilerVersion: "0.1.0",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.compilation.create).not.toHaveBeenCalled();
  });
});
