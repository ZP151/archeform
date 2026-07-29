import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPublishedGraphExchange,
  hashApplicationGraph,
} from "@factory/graph";
import { getCapabilityAsset } from "@factory/capabilities";

import { LifecycleService } from "../src/lifecycle.service.js";
import type { PrismaService } from "../src/prisma.service.js";
import { localApplicationGraph } from "./application-graph.fixture.js";

function prismaMock() {
  return {
    workspace: { upsert: vi.fn() },
    applicationGraph: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    draftRevision: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
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
    artifact: { createMany: vi.fn(), findFirst: vi.fn() },
    previewRun: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
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

const coreAuditLock = (() => {
  const { key, version, packageRoot, manifestDigest, lifecycle } =
    getCapabilityAsset("core.audit").manifest;
  return { key, version, packageRoot, manifestDigest, lifecycle };
})();

describe("LifecycleService", () => {
  let prisma: ReturnType<typeof prismaMock>;
  let service: LifecycleService;
  let queue: { enqueue: ReturnType<typeof vi.fn> };
  let previewQueue: { enqueue: ReturnType<typeof vi.fn> };
  let proposalProvider: { propose: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = prismaMock();
    queue = { enqueue: vi.fn() };
    previewQueue = { enqueue: vi.fn() };
    proposalProvider = { propose: vi.fn() };
    service = new (
      LifecycleService as unknown as new (
        prismaService: PrismaService,
        compilationQueue: typeof queue,
        graphProposalProvider: typeof proposalProvider,
        previewRunQueue: typeof previewQueue,
      ) => LifecycleService
    )(
      prisma as unknown as PrismaService,
      queue,
      proposalProvider,
      previewQueue,
    );
  });

  it("applies a validated AI Graph Diff only by appending a new Draft revision", async () => {
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...draftRevision,
      applicationGraph: { ...applicationGraph, workspace },
    });
    proposalProvider.propose.mockResolvedValue({
      diff: {
        apiVersion: "factory.graph-diff/v1",
        baseGraphHash:
          "sha256:762e834186c8fec51569cc8fe690f4ca90219c6f5b179fa6121bb73867c268fb",
        operations: [
          {
            op: "replace",
            path: "/metadata/name",
            value: "AI-updated expense approval",
          },
        ],
      },
      impact: {
        summary: "Renames the application.",
        affectedModels: ["metadata"],
        risks: [],
      },
      testSuggestions: [
        {
          id: "name-visible",
          title: "Shows the new product name",
          type: "journey",
        },
      ],
    });
    prisma.draftRevision.create.mockResolvedValue({
      id: "draft-2",
      revisionNumber: 2,
    });

    const result = await service.proposeDraftRevision(applicationGraph.id, {
      brief: "Rename the expense approval product.",
    });

    expect(proposalProvider.propose).toHaveBeenCalledWith({
      graph: localApplicationGraph,
      brief: "Rename the expense approval product.",
    });
    expect(prisma.draftRevision.create).toHaveBeenCalledWith({
      data: {
        applicationGraphId: applicationGraph.id,
        revisionNumber: 2,
        graph: expect.objectContaining({
          metadata: expect.objectContaining({
            name: "AI-updated expense approval",
          }),
        }),
      },
    });
    expect(result).toEqual({
      draftRevision: { id: "draft-2", revisionNumber: 2 },
      proposal: {
        diff: expect.any(Object),
        impact: {
          summary: "Renames the application.",
          affectedModels: ["metadata"],
          risks: [],
        },
        testSuggestions: [
          {
            id: "name-visible",
            title: "Shows the new product name",
            type: "journey",
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain(
      "Rename the expense approval product.",
    );
  });

  it("rejects an AI Graph Diff that attempts to select a different Golden asset", async () => {
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...draftRevision,
      graph: {
        ...localApplicationGraph,
        integration: {
          ...localApplicationGraph.integration,
          compositionProfile: "expense-approval",
          assetLocks: [coreAuditLock],
        },
      },
      applicationGraph: { ...applicationGraph, workspace },
    });
    proposalProvider.propose.mockResolvedValue({
      diff: {
        apiVersion: "factory.graph-diff/v1",
        operations: [
          {
            op: "add",
            path: "/integration/assetLocks/1",
            value: {
              key: "commerce.cart",
              version: "1.0.0",
              packageRoot: "packages/capabilities/assets/commerce.cart/1.0.0",
              manifestDigest:
                "sha256:f3f0ba58748cd7a8464950b56b68f77fa9826f7c9c7839813e4d2126e048d2cb",
              lifecycle: "golden",
            },
          },
        ],
      },
      impact: {
        summary: "Selects another asset.",
        affectedModels: [],
        risks: [],
      },
      testSuggestions: [],
    });

    await expect(
      service.proposeDraftRevision(applicationGraph.id, {
        brief: "Add a cart.",
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "ai_proposal_rejected" }),
    });
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
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

  it("exports only an immutable Published Revision as a digest-verified Graph exchange", async () => {
    prisma.publishedRevision.findFirst.mockResolvedValue({
      id: "published-3",
      applicationGraphId: applicationGraph.id,
      revisionNumber: 3,
      graph: localApplicationGraph,
      graphHash: hashApplicationGraph(localApplicationGraph),
    });

    await expect(
      service.exportPublishedGraph(applicationGraph.id, "published-3"),
    ).resolves.toEqual(createPublishedGraphExchange(localApplicationGraph, 3));
    expect(prisma.publishedRevision.findFirst).toHaveBeenCalledWith({
      where: { id: "published-3", applicationGraphId: applicationGraph.id },
    });
  });

  it("imports a verified published Graph exchange as a new mutable Draft only", async () => {
    prisma.workspace.upsert.mockResolvedValue(workspace);
    prisma.applicationGraph.create.mockResolvedValue({
      ...applicationGraph,
      draftRevisions: [draftRevision],
    });
    const exchange = createPublishedGraphExchange(localApplicationGraph, 3);

    await expect(service.importPublishedGraph({ exchange })).resolves.toEqual({
      ...applicationGraph,
      draftRevisions: [draftRevision],
    });
    expect(prisma.applicationGraph.create).toHaveBeenCalledWith({
      data: {
        workspaceId: workspace.id,
        key: localApplicationGraph.metadata.id,
        name: localApplicationGraph.metadata.name,
        draftRevisions: {
          create: { revisionNumber: 1, graph: localApplicationGraph },
        },
      },
      include: { draftRevisions: true },
    });
  });

  it("finds a local Graph with its newest Draft revision for Workbench bootstrap", async () => {
    prisma.applicationGraph.findFirst.mockResolvedValue({
      ...applicationGraph,
      draftRevisions: [draftRevision],
    });

    await expect(
      service.getLocalApplicationGraph(applicationGraph.key),
    ).resolves.toEqual({
      ...applicationGraph,
      draftRevisions: [draftRevision],
    });
    expect(prisma.applicationGraph.findFirst).toHaveBeenCalledWith({
      where: {
        key: applicationGraph.key,
        workspace: { slug: "local-workspace" },
      },
      include: {
        draftRevisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
        publishedRevisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
      },
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

  it("lists immutable Draft snapshots in their append-only order for revision history", async () => {
    prisma.applicationGraph.findUnique.mockResolvedValue(applicationGraph);
    prisma.draftRevision.findMany.mockResolvedValue([
      { ...draftRevision, revisionNumber: 1 },
      { ...draftRevision, id: "draft-2", revisionNumber: 2 },
    ]);

    await expect(
      service.listDraftRevisions(applicationGraph.id),
    ).resolves.toEqual([
      { ...draftRevision, revisionNumber: 1 },
      { ...draftRevision, id: "draft-2", revisionNumber: 2 },
    ]);
    expect(prisma.draftRevision.findMany).toHaveBeenCalledWith({
      where: { applicationGraphId: applicationGraph.id },
      orderBy: { revisionNumber: "asc" },
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

  it("rejects publishing a Draft with a tampered Golden capability asset lock", async () => {
    const invalidGraph = structuredClone(localApplicationGraph);
    invalidGraph.integration.assetLocks = [
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        lifecycle: "golden",
      },
    ];
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

  it("rejects a queued compilation before a preview can start", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-queued",
      result: { status: "queued" },
      artifacts: [
        { metadata: { rootDirectory: "expense-approval-published-1" } },
      ],
    });

    await expect(
      service.createPreviewRun("compilation-queued"),
    ).rejects.toThrow("Compilation must succeed before a preview can start.");
    expect(prisma.previewRun.create).not.toHaveBeenCalled();
  });

  it("creates a Factory-controlled preview run for a succeeded compilation and queues its start", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-succeeded",
      result: { status: "succeeded", artifactCount: 1 },
      artifacts: [
        { metadata: { rootDirectory: "expense-approval-published-1" } },
      ],
    });
    prisma.previewRun.count.mockResolvedValue(0);
    prisma.previewRun.create.mockImplementation(async ({ data }) => data);

    const preview = await service.createPreviewRun("compilation-succeeded");

    expect(preview).toMatchObject({
      id: expect.stringMatching(/^preview-/),
      status: "starting",
      compilationId: "compilation-succeeded",
      composeProjectName: expect.stringMatching(/^factory-preview-preview-/),
    });
    expect(previewQueue.enqueue).toHaveBeenCalledWith({
      action: "start",
      previewRunId: preview.id,
    });
  });

  it.each([
    { action: "start" as const, status: "starting" },
    { action: "stop" as const, status: "stopping" },
  ])(
    "returns an authoritative $action dispatch only while the run is $status",
    async ({ action, status }) => {
      prisma.previewRun.findUnique.mockResolvedValue({
        id: "preview-1",
        status,
        composeProjectName: "factory-preview-preview-1",
        compilation: {
          artifacts: [
            {
              path: "api/src/main.ts",
              digest:
                "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
              sizeBytes: 48,
              metadata: { rootDirectory: "expense-approval-published-1" },
            },
            {
              path: "docker-compose.yml",
              digest:
                "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
              sizeBytes: 512,
              metadata: { rootDirectory: "expense-approval-published-1" },
            },
          ],
        },
      });

      await expect(
        service.getPreviewDispatch("preview-1", action),
      ).resolves.toEqual({
        action,
        previewRunId: "preview-1",
        rootDirectory: "expense-approval-published-1",
        composeProjectName: "factory-preview-preview-1",
        artifacts: [
          {
            path: "api/src/main.ts",
            digest:
              "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
            sizeBytes: 48,
          },
          {
            path: "docker-compose.yml",
            digest:
              "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            sizeBytes: 512,
          },
        ],
      });
    },
  );

  it.each([
    { action: "start" as const, status: "stopping" },
    { action: "stop" as const, status: "starting" },
  ])(
    "rejects a $action dispatch while the run is $status",
    async ({ action, status }) => {
      prisma.previewRun.findUnique.mockResolvedValue({
        id: "preview-1",
        status,
        composeProjectName: "factory-preview-preview-1",
        compilation: { artifacts: [] },
      });

      await expect(
        service.getPreviewDispatch("preview-1", action),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it.each([
    { field: "path", value: "../outside.ts" },
    { field: "path", value: "C:/outside.ts" },
    { field: "path", value: "C:outside.ts" },
    { field: "digest", value: "sha256:not-a-digest" },
    { field: "sizeBytes", value: -1 },
  ])(
    "rejects dispatch artifact evidence with an invalid $field",
    async ({ field, value }) => {
      prisma.previewRun.findUnique.mockResolvedValue({
        id: "preview-1",
        status: "starting",
        composeProjectName: "factory-preview-preview-1",
        compilation: {
          artifacts: [
            {
              path: "api/src/main.ts",
              digest:
                "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
              sizeBytes: 48,
              metadata: { rootDirectory: "expense-approval-published-1" },
              [field]: value,
            },
          ],
        },
      });

      await expect(
        service.getPreviewDispatch("preview-1", "start"),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it("returns the current starting preview without enqueuing a second start", async () => {
    const current = { id: "preview-1", status: "starting" };
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-succeeded",
      result: { status: "succeeded" },
      artifacts: [
        { metadata: { rootDirectory: "expense-approval-published-1" } },
      ],
    });
    prisma.previewRun.findFirst.mockResolvedValue(current);

    await expect(
      service.createPreviewRun("compilation-succeeded"),
    ).resolves.toEqual(current);
    expect(prisma.previewRun.create).not.toHaveBeenCalled();
    expect(previewQueue.enqueue).not.toHaveBeenCalled();
  });

  it("returns a stopping preview without enqueuing a duplicate stop", async () => {
    const current = {
      id: "preview-1",
      status: "stopping",
      compilationId: "compilation-succeeded",
      composeProjectName: "factory-preview-preview-1",
      compilation: {
        artifacts: [
          { metadata: { rootDirectory: "expense-approval-published-1" } },
        ],
      },
    };
    prisma.previewRun.findUnique.mockResolvedValue(current);

    await expect(service.stopPreviewRun("preview-1")).resolves.toEqual(current);
    expect(prisma.previewRun.update).not.toHaveBeenCalled();
    expect(previewQueue.enqueue).not.toHaveBeenCalled();
  });

  it("reports ready evidence only from starting runs with loopback ports and URL", async () => {
    prisma.previewRun.findUnique.mockResolvedValue({
      id: "preview-1",
      status: "starting",
      compilationId: "compilation-succeeded",
      composeProjectName: "factory-preview-preview-1",
    });
    prisma.previewRun.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.reportPreviewReady("preview-1", {
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      }),
    ).resolves.toMatchObject({ id: "preview-1", status: "ready" });
    expect(prisma.previewRun.updateMany).toHaveBeenCalledWith({
      where: { id: "preview-1", status: "starting" },
      data: {
        status: "ready",
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      },
    });
  });

  it("rejects Worker evidence that attempts a non-loopback preview URL", async () => {
    await expect(
      service.reportPreviewReady("preview-1", {
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "https://example.com",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records bounded failure evidence only while a preview is transitioning", async () => {
    prisma.previewRun.findUnique.mockResolvedValue({
      id: "preview-1",
      status: "starting",
    });
    prisma.previewRun.updateMany.mockResolvedValue({ count: 1 });
    prisma.previewRun.findUnique
      .mockResolvedValueOnce({
        id: "preview-1",
        status: "starting",
      })
      .mockResolvedValueOnce({
        id: "preview-1",
        status: "failed",
      });

    await expect(
      service.reportPreviewFailed("preview-1", {
        diagnostic: "preview_start_failed",
      }),
    ).resolves.toMatchObject({ id: "preview-1", status: "failed" });
    expect(prisma.previewRun.updateMany).toHaveBeenCalledWith({
      where: { id: "preview-1", status: "starting" },
      data: { status: "failed", diagnostic: "Preview startup failed." },
    });
  });

  it("records stopped evidence only after a queued stop", async () => {
    prisma.previewRun.findUnique.mockResolvedValue({
      id: "preview-1",
      status: "stopping",
    });
    prisma.previewRun.updateMany.mockResolvedValue({ count: 1 });
    prisma.previewRun.findUnique
      .mockResolvedValueOnce({
        id: "preview-1",
        status: "stopping",
      })
      .mockResolvedValueOnce({
        id: "preview-1",
        status: "stopped",
      });

    await expect(
      service.reportPreviewStopped("preview-1"),
    ).resolves.toMatchObject({
      id: "preview-1",
      status: "stopped",
    });
    expect(prisma.previewRun.updateMany).toHaveBeenCalledWith({
      where: { id: "preview-1", status: "stopping" },
      data: { status: "stopped", activeKey: null },
    });
  });

  it("rejects arbitrary failure text and never persists source or credential-looking content", async () => {
    const diagnostic = "docker compose --env-file .env API_TOKEN=not-safe";

    await expect(
      service.reportPreviewFailed("preview-1", { diagnostic }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.previewRun.updateMany).not.toHaveBeenCalled();
  });

  it("compensates a failed start enqueue so a retry creates a new run", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-succeeded",
      result: { status: "succeeded" },
      artifacts: [
        { metadata: { rootDirectory: "expense-approval-published-1" } },
      ],
    });
    prisma.previewRun.count.mockResolvedValue(0);
    prisma.previewRun.create.mockImplementation(async ({ data }) => data);
    previewQueue.enqueue.mockRejectedValueOnce(new Error("Redis unavailable"));
    prisma.previewRun.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.createPreviewRun("compilation-succeeded"),
    ).rejects.toThrow("Redis unavailable");
    expect(prisma.previewRun.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "starting" }),
      }),
    );

    prisma.previewRun.create.mockImplementation(async ({ data }) => data);
    await expect(
      service.createPreviewRun("compilation-succeeded"),
    ).resolves.toMatchObject({
      status: "starting",
    });
  });

  it("compensates a failed stop enqueue back to ready so a retry can enqueue", async () => {
    const current = {
      id: "preview-1",
      status: "ready",
      compilationId: "compilation-succeeded",
      composeProjectName: "factory-preview-preview-1",
      compilation: {
        artifacts: [
          { metadata: { rootDirectory: "expense-approval-published-1" } },
        ],
      },
    };
    prisma.previewRun.findUnique.mockResolvedValue(current);
    prisma.previewRun.updateMany.mockResolvedValue({ count: 1 });
    previewQueue.enqueue.mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(service.stopPreviewRun("preview-1")).rejects.toThrow(
      "Redis unavailable",
    );
    expect(prisma.previewRun.updateMany).toHaveBeenLastCalledWith({
      where: { id: "preview-1", status: "stopping" },
      data: { status: "ready" },
    });

    await expect(service.stopPreviewRun("preview-1")).resolves.toMatchObject({
      status: "stopping",
    });
    expect(previewQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(previewQueue.enqueue).toHaveBeenLastCalledWith({
      action: "stop",
      previewRunId: "preview-1",
    });
  });

  it("returns the winning current run when concurrent start creation loses the sequence race", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-succeeded",
      result: { status: "succeeded" },
      artifacts: [
        { metadata: { rootDirectory: "expense-approval-published-1" } },
      ],
    });
    prisma.previewRun.count.mockResolvedValue(0);
    prisma.previewRun.create.mockRejectedValue({ code: "P2002" });
    const winner = { id: "preview-winner", status: "starting" };
    prisma.previewRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);

    await expect(
      service.createPreviewRun("compilation-succeeded"),
    ).resolves.toEqual(winner);
    expect(previewQueue.enqueue).not.toHaveBeenCalled();
  });

  it("rejects a stale ready callback when its conditional transition loses a race", async () => {
    prisma.previewRun.findUnique.mockResolvedValue({
      id: "preview-1",
      status: "starting",
    });
    prisma.previewRun.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.reportPreviewReady("preview-1", {
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
