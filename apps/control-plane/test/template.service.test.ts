import { BadRequestException, ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertApplicationGraphV3,
  assertDraftPreviewSnapshotV2,
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
} from "@factory/graph";

const compilerCalls = vi.hoisted(() => ({
  failSourceClosure: false,
  failRender: false,
  failRenderSurface: null as string | null,
  closure: vi.fn(),
  render: vi.fn(),
}));
const graphCalls = vi.hoisted(() => ({
  events: [] as string[],
  failDarkHash: false,
}));
vi.mock("@factory/graph", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@factory/graph")>();
  return {
    ...actual,
    hashApplicationGraphV3: (
      ...args: Parameters<typeof actual.hashApplicationGraphV3>
    ) => {
      let mode = "unknown";
      try {
        const graph = args[0] as {
          readonly experience?: {
            readonly theme?: { readonly mode?: unknown };
          };
        };
        if (typeof graph.experience?.theme?.mode === "string") {
          mode = graph.experience.theme.mode;
        }
      } catch {
        mode = "hostile";
      }
      graphCalls.events.push(`hash:${mode}`);
      if (graphCalls.failDarkHash && mode === "dark") {
        throw new Error("HOSTILE_THEME_HASH_SENTINEL");
      }
      return actual.hashApplicationGraphV3(...args);
    },
  };
});
vi.mock("@factory/compiler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@factory/compiler")>();
  return {
    ...actual,
    assertRestaurantDraftPreviewGraphClosure: (
      ...args: Parameters<
        typeof actual.assertRestaurantDraftPreviewGraphClosure
      >
    ) => {
      compilerCalls.closure(...args);
      if (compilerCalls.failSourceClosure) {
        throw new Error("Restaurant Draft preview is invalid.");
      }
      return actual.assertRestaurantDraftPreviewGraphClosure(...args);
    },
    renderRestaurantDraftPreviewSurface: (
      ...args: Parameters<typeof actual.renderRestaurantDraftPreviewSurface>
    ) => {
      compilerCalls.render(...args);
      if (
        compilerCalls.failRender ||
        compilerCalls.failRenderSurface === args[1]
      ) {
        throw new Error("Restaurant Draft preview is invalid.");
      }
      return actual.renderRestaurantDraftPreviewSurface(...args);
    },
  };
});

import {
  createCuratedRestaurantTemplateGraph,
  TemplateService,
} from "../src/template/template.service.js";
import type { PrismaService } from "../src/prisma.service.js";
import { ControlPlaneClient } from "../../workbench/lib/control-plane-client.js";

function prismaMock() {
  const transaction = {
    workspace: { upsert: vi.fn() },
    applicationGraph: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    draftRevision: { create: vi.fn(), findFirst: vi.fn() },
    draftPreviewSnapshot: { create: vi.fn(), findUnique: vi.fn() },
  };
  return {
    ...transaction,
    $transaction: vi.fn(
      async (operation: (client: typeof transaction) => Promise<unknown>) =>
        operation(transaction),
    ),
  };
}

function createdAggregate(data: any) {
  return {
    id: "application-1",
    key: data.key,
    name: data.name,
    templateOrigin: data.templateOrigin,
    workspace: { slug: "local-workspace" },
    draftRevisions: [
      {
        id: "draft-1",
        applicationGraphId: "application-1",
        revisionNumber: 1,
        graph: data.draftRevisions.create.graph,
      },
    ],
  };
}

describe("TemplateService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T08:00:00.000Z"));
    compilerCalls.failSourceClosure = false;
    compilerCalls.failRender = false;
    compilerCalls.failRenderSurface = null;
    compilerCalls.closure.mockClear();
    compilerCalls.render.mockClear();
  });

  it("lists one immutable first-party Restaurant template with a governed checksum", () => {
    const service = new TemplateService(prismaMock() as never);

    const first = service.listCuratedTemplates();
    const second = service.listCuratedTemplates();

    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      apiVersion: "factory.curated-template/v1",
      key: "restaurant-dual-surface",
      version: "1.0.0",
      name: "Maison Aurelia",
      surfaces: ["customer-mobile", "merchant-desktop"],
      graphChecksum: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first[0])).toBe(true);
  });

  it("clones the curated template into an independent V3 Draft and active dual-surface Snapshot", async () => {
    const prisma = prismaMock();
    prisma.applicationGraph.findFirst.mockResolvedValue(null);
    prisma.workspace.upsert.mockResolvedValue({ id: "workspace-1" });
    prisma.applicationGraph.create.mockImplementation(async ({ data }: any) =>
      createdAggregate(data),
    );
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );
    const service = new TemplateService(prisma as unknown as PrismaService);

    const result = await service.instantiateCuratedTemplate(
      "restaurant-dual-surface",
      { requestId: "restaurant-template-001", name: "Maison Rivage" },
    );

    const graph = assertApplicationGraphV3(result.draft.graph);
    const snapshot = assertDraftPreviewSnapshotV2(result.snapshot);
    expect(result).toMatchObject({
      apiVersion: "factory.template-draft-instance/v1",
      origin: {
        templateKey: "restaurant-dual-surface",
        templateVersion: "1.0.0",
      },
      draft: {
        applicationGraphId: "application-1",
        applicationKey: "restaurant-template-001",
        draftRevisionId: "draft-1",
        revisionNumber: 1,
      },
    });
    expect(graph.metadata).toMatchObject({
      id: "restaurant-template-001",
      workspaceId: "local-workspace",
      name: "Maison Rivage",
    });
    expect(hashApplicationGraphV3(graph)).toBe(snapshot.graphChecksum);
    expect(snapshot).toMatchObject({
      applicationGraphId: "application-1",
      draftRevisionId: "draft-1",
      state: "active",
      disposition: "preview-only",
    });
    expect(result.previews.map(({ surface }) => surface.surfaceKey)).toEqual([
      "customer-mobile",
      "merchant-desktop",
    ]);
    expect(result.previews.map(({ surface }) => surface.pages.length)).toEqual([
      8, 7,
    ]);
    expect(prisma.applicationGraph.create).toHaveBeenCalledOnce();
    expect(prisma.draftPreviewSnapshot.create).toHaveBeenCalledOnce();
  });

  it("serves a real dual-surface projection accepted by the Workbench boundary", async () => {
    const prisma = prismaMock();
    prisma.applicationGraph.findFirst.mockResolvedValue(null);
    prisma.workspace.upsert.mockResolvedValue({ id: "workspace-1" });
    prisma.applicationGraph.create.mockImplementation(async ({ data }: any) =>
      createdAggregate(data),
    );
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );
    const service = new TemplateService(prisma as unknown as PrismaService);
    const response = await service.instantiateCuratedTemplate(
      "restaurant-dual-surface",
      { requestId: "restaurant-template-001", name: "Maison Aurelia" },
    );
    const client = new ControlPlaneClient(
      "http://control-plane.test",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const parsed = await client.openTemplateDraft("restaurant-template-001");

    expect(
      parsed.previews.map(({ surface }) => surface.navigation.length),
    ).toEqual([5, 7]);
    expect(parsed.previews.map(({ surface }) => surface.pages.length)).toEqual([
      8, 7,
    ]);
  });

  it("rejects unknown templates and strict hostile clone envelopes without echoing them", async () => {
    const service = new TemplateService(prismaMock() as never);
    const hostile = Object.assign(Object.create({ name: "inherited" }), {
      requestId: "restaurant-template-001",
    });

    await expect(
      service.instantiateCuratedTemplate("unknown-template", {
        requestId: "restaurant-template-001",
      }),
    ).rejects.toThrow("Curated template is not available.");
    await expect(
      service.instantiateCuratedTemplate("restaurant-dual-surface", hostile),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reconciles an identical replay and rejects request identity drift", async () => {
    const prisma = prismaMock();
    const bootstrap = new TemplateService(prisma as unknown as PrismaService);
    const template = bootstrap.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const stored = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-1",
          applicationGraphId: "application-1",
          revisionNumber: 1,
          graph,
          draftPreviewSnapshot: null,
        },
      ],
    };
    prisma.applicationGraph.findFirst.mockResolvedValue(stored);
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const replay = await bootstrap.instantiateCuratedTemplate(
      "restaurant-dual-surface",
      { requestId: "restaurant-template-001", name: "Maison Rivage" },
    );

    expect(replay.draft.draftRevisionId).toBe("draft-1");
    expect(prisma.applicationGraph.create).not.toHaveBeenCalled();
    await expect(
      bootstrap.openTemplateDraft("restaurant-template-001"),
    ).resolves.toMatchObject({
      draft: { applicationKey: "restaurant-template-001" },
    });
    await expect(
      bootstrap.instantiateCuratedTemplate("restaurant-dual-surface", {
        requestId: "restaurant-template-001",
        name: "Different name",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("reconciles the original clone request after the Draft has been renamed", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const originalGraph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Aurelia",
    );
    const renamedGraph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    prisma.applicationGraph.findFirst.mockResolvedValue({
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-2",
          applicationGraphId: "application-1",
          revisionNumber: 2,
          graph: renamedGraph,
        },
      ],
    });
    prisma.draftRevision.findFirst.mockResolvedValue({
      id: "draft-1",
      applicationGraphId: "application-1",
      revisionNumber: 1,
      graph: originalGraph,
    });
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const replay = await service.instantiateCuratedTemplate(
      "restaurant-dual-surface",
      { requestId: "restaurant-template-001", name: "Maison Aurelia" },
    );

    expect(replay.draft).toMatchObject({
      draftRevisionId: "draft-2",
      revisionNumber: 2,
    });
    expect(replay.draft.graph.metadata.name).toBe("Maison Rivage");
    expect(prisma.applicationGraph.create).not.toHaveBeenCalled();
  });

  it("reconciles concurrent clone creation and normalizes concurrent rename conflicts", async () => {
    const clonePrisma = prismaMock();
    const cloneService = new TemplateService(
      clonePrisma as unknown as PrismaService,
    );
    const template = cloneService.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Aurelia",
    );
    const stored = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Aurelia",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-1",
          applicationGraphId: "application-1",
          revisionNumber: 1,
          graph,
        },
      ],
    };
    clonePrisma.applicationGraph.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(stored);
    clonePrisma.workspace.upsert.mockResolvedValue({ id: "workspace-1" });
    clonePrisma.applicationGraph.create.mockRejectedValue({ code: "P2002" });
    clonePrisma.draftRevision.findFirst.mockResolvedValue(
      stored.draftRevisions[0],
    );
    clonePrisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    await expect(
      cloneService.instantiateCuratedTemplate("restaurant-dual-surface", {
        requestId: "restaurant-template-001",
        name: "Maison Aurelia",
      }),
    ).resolves.toMatchObject({
      draft: { draftRevisionId: "draft-1", revisionNumber: 1 },
    });

    const renamePrisma = prismaMock();
    const renameService = new TemplateService(
      renamePrisma as unknown as PrismaService,
    );
    renamePrisma.applicationGraph.findUnique.mockResolvedValue(stored);
    renamePrisma.draftRevision.create.mockRejectedValue({ code: "P2002" });

    await expect(
      renameService.appendTemplateDraftRevision("application-1", {
        baseDraftRevisionId: "draft-1",
        name: "Maison Rivage",
      }),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");
  });

  it("renames by appending Draft r.2 and a new Snapshot while stale edits fail closed", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Aurelia",
    );
    const aggregate = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Aurelia",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-1",
          applicationGraphId: "application-1",
          revisionNumber: 1,
          graph,
        },
      ],
    };
    prisma.applicationGraph.findUnique.mockResolvedValue(aggregate);
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-2",
      ...data,
    }));
    prisma.applicationGraph.update.mockResolvedValue({});
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const renamed = await service.appendTemplateDraftRevision("application-1", {
      baseDraftRevisionId: "draft-1",
      name: "Maison Rivage",
    });

    expect(renamed.draft).toMatchObject({
      draftRevisionId: "draft-2",
      revisionNumber: 2,
    });
    expect(renamed.draft.graph.metadata.name).toBe("Maison Rivage");
    expect(renamed.snapshot.draftRevisionId).toBe("draft-2");
    expect(prisma.draftRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ revisionNumber: 2 }),
    });
    expect(prisma.draftPreviewSnapshot.create).toHaveBeenCalledOnce();

    await expect(
      service.appendTemplateDraftRevision("application-1", {
        baseDraftRevisionId: "draft-stale",
        name: "Maison Obsolete",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("changes one Page title by appending Draft r.3 and a new active Snapshot", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const previousGraph = structuredClone(graph);
    const snapshotBase = {
      apiVersion: "factory.draft-preview-snapshot/v2" as const,
      id: "preview-2",
      workspaceId: "local-workspace",
      applicationGraphId: "application-1",
      draftRevisionId: "draft-2",
      graphVersion: "factory.application-graph/v3" as const,
      graphChecksum: hashApplicationGraphV3(graph),
      snapshotChecksum:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000" as const,
      disposition: "preview-only" as const,
      state: "active" as const,
      createdAt: "2026-08-14T07:30:00.000Z",
      expiresAt: "2026-08-14T08:30:00.000Z",
    };
    const previousSnapshot = assertDraftPreviewSnapshotV2({
      ...snapshotBase,
      snapshotChecksum: hashDraftPreviewSnapshotV2(snapshotBase),
    });
    const previousSnapshotCopy = structuredClone(previousSnapshot);
    prisma.applicationGraph.findFirst.mockResolvedValue({
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-2",
          applicationGraphId: "application-1",
          revisionNumber: 2,
          graph,
          draftPreviewSnapshots: [{ snapshot: previousSnapshot }],
        },
      ],
    });
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-3",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const result = await service.appendTemplatePageRevision("application-1", {
      baseDraftRevisionId: "draft-2",
      surfaceKey: "customer-mobile",
      pageId: "customer-menu",
      title: "Seasonal Menu",
    });

    const expectedGraph = structuredClone(previousGraph);
    expectedGraph.page.pages.find(({ id }) => id === "customer-menu")!.title =
      "Seasonal Menu";
    expect(result.draft).toMatchObject({
      draftRevisionId: "draft-3",
      revisionNumber: 3,
      graph: expectedGraph,
    });
    expect(result.snapshot).toMatchObject({
      draftRevisionId: "draft-3",
      graphChecksum: hashApplicationGraphV3(expectedGraph),
      state: "active",
    });
    expect(result.snapshot.id).not.toBe(previousSnapshot.id);
    expect(
      result.previews[0].surface.pages.find(({ id }) => id === "customer-menu")
        ?.title,
    ).toBe("Seasonal Menu");
    expect(graph).toEqual(previousGraph);
    expect(previousSnapshot).toEqual(previousSnapshotCopy);
    expect(prisma.applicationGraph.update).not.toHaveBeenCalled();
    expect(prisma.draftRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationGraphId: "application-1",
        revisionNumber: 3,
        graph: expectedGraph,
      }),
    });
    expect(prisma.draftPreviewSnapshot.create).toHaveBeenCalledOnce();
  });

  it("rejects stale, unknown, mismatched, unchanged, and racing Page edits", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const aggregate = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-2",
          applicationGraphId: "application-1",
          revisionNumber: 2,
          graph,
        },
      ],
    };
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-stale",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-stale",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Menu",
      }),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");
    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "merchant-desktop",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Menu",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.applicationGraph.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.appendTemplatePageRevision("missing-application", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toThrow("Template Draft was not found.");
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
    prisma.draftRevision.create.mockRejectedValue({ code: "P2002" });
    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");
  });

  it("retries serialization conflicts three times and keeps Snapshot failure atomic", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const aggregate = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-2",
          applicationGraphId: "application-1",
          revisionNumber: 2,
          graph,
        },
      ],
    };
    const committedDrafts: unknown[] = [];
    const committedSnapshots: unknown[] = [];
    const attemptedDrafts: unknown[] = [];
    const attemptedSnapshots: unknown[] = [];
    prisma.$transaction.mockImplementation(async (operation: any) => {
      const stagedDrafts: unknown[] = [];
      const stagedSnapshots: unknown[] = [];
      const transaction = {
        workspace: prisma.workspace,
        applicationGraph: prisma.applicationGraph,
        draftRevision: {
          ...prisma.draftRevision,
          create: vi.fn(async ({ data }: any) => {
            const draft = { id: "draft-3", ...data };
            attemptedDrafts.push(draft);
            stagedDrafts.push(draft);
            return draft;
          }),
        },
        draftPreviewSnapshot: {
          ...prisma.draftPreviewSnapshot,
          create: vi.fn(async ({ data }: any) => {
            attemptedSnapshots.push(data);
            stagedSnapshots.push(data);
            throw new Error("snapshot-store-failed");
          }),
        },
      };
      const result = await operation(transaction);
      committedDrafts.push(...stagedDrafts);
      committedSnapshots.push(...stagedSnapshots);
      return result;
    });
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toThrow("snapshot-store-failed");
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(attemptedDrafts).toHaveLength(1);
    expect(attemptedSnapshots).toHaveLength(1);
    expect(committedDrafts).toEqual([]);
    expect(committedSnapshots).toEqual([]);
    expect(prisma.applicationGraph.update).not.toHaveBeenCalled();

    const retryPrisma = prismaMock();
    const execute = retryPrisma.$transaction.getMockImplementation()!;
    retryPrisma.$transaction
      .mockRejectedValueOnce({ code: "P2034" })
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementation(execute);
    retryPrisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
    retryPrisma.draftRevision.create.mockImplementation(
      async ({ data }: any) => ({ id: "draft-3", ...data }),
    );
    retryPrisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );
    const retryService = new TemplateService(
      retryPrisma as unknown as PrismaService,
    );

    await expect(
      retryService.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).resolves.toMatchObject({ draft: { revisionNumber: 3 } });
    expect(retryPrisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("captures the Page command once before transactions and reuses it across serialization retries", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const aggregate = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-2",
          applicationGraphId: "application-1",
          revisionNumber: 2,
          graph,
        },
      ],
    };
    prisma.applicationGraph.findUnique.mockResolvedValue(aggregate);
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-3",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const events: string[] = [];
    let prototypeCalls = 0;
    let ownKeysCalls = 0;
    let descriptorCalls = 0;
    const input = new Proxy(
      {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      },
      {
        getPrototypeOf(target) {
          prototypeCalls += 1;
          events.push("capture:getPrototypeOf");
          return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
          ownKeysCalls += 1;
          events.push("capture:ownKeys");
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key) {
          descriptorCalls += 1;
          events.push(`capture:descriptor:${String(key)}`);
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    let attempts = 0;
    const execute = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementation(async (...args: any[]) => {
      attempts += 1;
      events.push(`transaction:${attempts}`);
      const result = await execute(...args);
      if (attempts < 3) throw { code: "P2034" };
      return result;
    });

    await expect(
      service.appendTemplatePageRevision("application-1", input),
    ).resolves.toMatchObject({ draft: { revisionNumber: 3 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(events.indexOf("transaction:1")).toBeGreaterThan(
      events.lastIndexOf("capture:descriptor:title"),
    );
    expect(prototypeCalls).toBe(1);
    expect(ownKeysCalls).toBe(1);
    expect(descriptorCalls).toBe(4);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "maps a hostile Page command %s trap to fixed BadRequest before Prisma",
    async (trap) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const input = new Proxy(
        {
          baseDraftRevisionId: "draft-2",
          surfaceKey: "customer-mobile",
          pageId: "customer-menu",
          title: "Seasonal Menu",
        },
        {
          [trap]() {
            throw new Error("HOSTILE_PAGE_COMMAND_SENTINEL");
          },
        },
      );

      await expect(
        service.appendTemplatePageRevision("application-1", input),
      ).rejects.toMatchObject({
        response: {
          message: "Template Draft request is invalid.",
          statusCode: 400,
        },
      });
      await expect(
        service.appendTemplatePageRevision("application-1", input),
      ).rejects.not.toThrow("HOSTILE_PAGE_COMMAND_SENTINEL");
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.applicationGraph.findFirst).not.toHaveBeenCalled();
      expect(prisma.applicationGraph.findUnique).not.toHaveBeenCalled();
    },
  );

  it("returns fixed not-found for a cross-workspace application before inspecting its invalid origin", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const crossWorkspace = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: { leaked: "CROSS_WORKSPACE_ORIGIN_SENTINEL" },
      workspace: { slug: "foreign-workspace" },
      draftRevisions: [],
    };
    prisma.applicationGraph.findUnique.mockResolvedValue(crossWorkspace);
    prisma.applicationGraph.findFirst.mockImplementation(async ({ where }) => {
      expect(where).toEqual({
        id: "application-1",
        workspace: { slug: "local-workspace" },
      });
      return null;
    });

    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toThrow("Template Draft was not found.");
    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.not.toThrow("CROSS_WORKSPACE_ORIGIN_SENTINEL");
    expect(prisma.applicationGraph.findFirst).toHaveBeenCalled();
  });

  it("rolls back the Page Draft when preview rendering fails before Snapshot storage", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const customer = graph.surfaces.find(
      ({ key }) => key === "customer-mobile",
    )!;
    [customer.navigation.items[0], customer.navigation.items[1]] = [
      customer.navigation.items[1]!,
      customer.navigation.items[0]!,
    ];
    expect(() => assertApplicationGraphV3(graph)).not.toThrow();
    const aggregate = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-2",
          applicationGraphId: "application-1",
          revisionNumber: 2,
          graph,
        },
      ],
    };
    const attemptedDrafts: unknown[] = [];
    const attemptedSnapshots: unknown[] = [];
    const committedDrafts: unknown[] = [];
    const committedSnapshots: unknown[] = [];
    prisma.$transaction.mockImplementation(async (operation: any) => {
      const stagedDrafts: unknown[] = [];
      const stagedSnapshots: unknown[] = [];
      const transaction = {
        workspace: prisma.workspace,
        applicationGraph: prisma.applicationGraph,
        draftRevision: {
          ...prisma.draftRevision,
          create: vi.fn(async ({ data }: any) => {
            const draft = { id: "draft-3", ...data };
            attemptedDrafts.push(draft);
            stagedDrafts.push(draft);
            return draft;
          }),
        },
        draftPreviewSnapshot: {
          ...prisma.draftPreviewSnapshot,
          create: vi.fn(async ({ data }: any) => {
            attemptedSnapshots.push(data);
            stagedSnapshots.push(data);
            return data;
          }),
        },
      };
      const result = await operation(transaction);
      committedDrafts.push(...stagedDrafts);
      committedSnapshots.push(...stagedSnapshots);
      return result;
    });
    prisma.applicationGraph.findUnique.mockResolvedValue(aggregate);
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

    await expect(
      service.appendTemplatePageRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-menu",
        title: "Seasonal Menu",
      }),
    ).rejects.toThrow("Restaurant Draft preview is invalid.");
    expect(attemptedDrafts).toHaveLength(1);
    expect(attemptedSnapshots).toEqual([]);
    expect(committedDrafts).toEqual([]);
    expect(committedSnapshots).toEqual([]);
  });

  it("reorders one Page by appending Draft r.4 and an active dual-surface Snapshot", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const previousGraph = structuredClone(graph);
    const snapshotBase = {
      apiVersion: "factory.draft-preview-snapshot/v2" as const,
      id: "preview-3",
      workspaceId: "local-workspace",
      applicationGraphId: "application-1",
      draftRevisionId: "draft-3",
      graphVersion: "factory.application-graph/v3" as const,
      graphChecksum: hashApplicationGraphV3(graph),
      snapshotChecksum:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000" as const,
      disposition: "preview-only" as const,
      state: "active" as const,
      createdAt: "2026-08-14T07:30:00.000Z",
      expiresAt: "2026-08-14T08:30:00.000Z",
    };
    const previousSnapshot = assertDraftPreviewSnapshotV2({
      ...snapshotBase,
      snapshotChecksum: hashDraftPreviewSnapshotV2(snapshotBase),
    });
    const previousDraft = {
      id: "draft-3",
      applicationGraphId: "application-1",
      revisionNumber: 3,
      graph,
      draftPreviewSnapshots: [{ snapshot: previousSnapshot }],
    };
    const previousDraftCopy = structuredClone(previousDraft);
    prisma.applicationGraph.findFirst.mockResolvedValue({
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [previousDraft],
    });
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-4",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const result = await service.appendTemplatePageBlockOrderRevision(
      "application-1",
      {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-items", "home-hero", "home-categories"],
      },
    );

    const resultPage = result.draft.graph.page.pages.find(
      ({ id }) => id === "customer-home",
    )!;
    expect(result.draft).toMatchObject({
      draftRevisionId: "draft-4",
      revisionNumber: 4,
    });
    expect(resultPage.blocks.map(({ id }) => id)).toEqual([
      "home-items",
      "home-hero",
      "home-categories",
    ]);
    expect(resultPage.recipe.regions[0]?.blockIds).toEqual([
      "home-items",
      "home-hero",
      "home-categories",
    ]);
    expect(
      resultPage.blocks.map(({ id, bindings }) => ({ id, bindings })),
    ).toEqual(
      [
        previousGraph.page.pages
          .find(({ id }) => id === "customer-home")!
          .blocks.find(({ id }) => id === "home-items")!,
        previousGraph.page.pages
          .find(({ id }) => id === "customer-home")!
          .blocks.find(({ id }) => id === "home-hero")!,
        previousGraph.page.pages
          .find(({ id }) => id === "customer-home")!
          .blocks.find(({ id }) => id === "home-categories")!,
      ].map(({ id, bindings }) => ({ id, bindings })),
    );
    expect(result.snapshot).toMatchObject({
      draftRevisionId: "draft-4",
      graphChecksum: hashApplicationGraphV3(result.draft.graph),
      state: "active",
    });
    expect(
      result.previews[0].surface.pages
        .find(({ id }) => id === "customer-home")!
        .blocks.map(({ id }) => id),
    ).toEqual(["home-items", "home-hero", "home-categories"]);
    expect(graph).toEqual(previousGraph);
    expect(previousDraft).toEqual(previousDraftCopy);
    expect(previousSnapshot.graphChecksum).toBe(
      hashApplicationGraphV3(previousGraph),
    );
    expect(
      previousDraft.graph.page.pages
        .find(({ id }) => id === "customer-home")!
        .blocks.map(({ id, bindings }) => ({ id, bindings })),
    ).toEqual(
      previousGraph.page.pages
        .find(({ id }) => id === "customer-home")!
        .blocks.map(({ id, bindings }) => ({ id, bindings })),
    );
    expect(prisma.draftRevision.create).toHaveBeenCalledOnce();
    expect(prisma.draftPreviewSnapshot.create).toHaveBeenCalledOnce();
    expect(prisma.applicationGraph.update).not.toHaveBeenCalled();
  });

  it("captures the block-order command once before Prisma and reuses primitives across three attempts", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    prisma.applicationGraph.findFirst.mockResolvedValue({
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-3",
          applicationGraphId: "application-1",
          revisionNumber: 3,
          graph,
        },
      ],
    });
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-4",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => ({ ...data }),
    );

    const events: string[] = [];
    const calls = {
      bodyPrototype: 0,
      bodyKeys: 0,
      bodyDescriptors: 0,
      arrayPrototype: 0,
      arrayKeys: 0,
      arrayDescriptors: 0,
    };
    const blockIds = new Proxy(["home-items", "home-hero", "home-categories"], {
      getPrototypeOf(target) {
        calls.arrayPrototype += 1;
        events.push("capture:array-prototype");
        return Reflect.getPrototypeOf(target);
      },
      ownKeys(target) {
        calls.arrayKeys += 1;
        events.push("capture:array-keys");
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, key) {
        calls.arrayDescriptors += 1;
        events.push(`capture:array-descriptor:${String(key)}`);
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const input = new Proxy(
      {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds,
      },
      {
        getPrototypeOf(target) {
          calls.bodyPrototype += 1;
          events.push("capture:body-prototype");
          return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
          calls.bodyKeys += 1;
          events.push("capture:body-keys");
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key) {
          calls.bodyDescriptors += 1;
          events.push(`capture:body-descriptor:${String(key)}`);
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    let attempts = 0;
    const execute = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementation(async (...args: any[]) => {
      attempts += 1;
      events.push(`transaction:${attempts}`);
      const result = await execute(...args);
      if (attempts < 3) throw { code: "P2034" };
      return result;
    });

    await expect(
      service.appendTemplatePageBlockOrderRevision("application-1", input),
    ).resolves.toMatchObject({ draft: { revisionNumber: 4 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(events.indexOf("transaction:1")).toBeGreaterThan(
      events.lastIndexOf("capture:array-descriptor:length"),
    );
    expect(calls).toEqual({
      bodyPrototype: 1,
      bodyKeys: 1,
      bodyDescriptors: 5,
      arrayPrototype: 1,
      arrayKeys: 1,
      arrayDescriptors: 4,
    });
  });

  it("returns fixed not-found for cross-workspace invalid origin before inspection", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    prisma.applicationGraph.findFirst.mockImplementation(async ({ where }) => {
      expect(where).toEqual({
        id: "application-1",
        workspace: { slug: "local-workspace" },
      });
      return null;
    });

    await expect(
      service.appendTemplatePageBlockOrderRevision("application-1", {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-items", "home-hero", "home-categories"],
      }),
    ).rejects.toThrow("Template Draft was not found.");
    expect(prisma.applicationGraph.findUnique).not.toHaveBeenCalled();
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("rejects stored Graph identity drift before attempting a block-order Draft", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    Object.assign(graph.metadata, { workspaceId: "other-workspace" });
    prisma.applicationGraph.findFirst.mockResolvedValue({
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-3",
          applicationGraphId: "application-1",
          revisionNumber: 3,
          graph,
        },
      ],
    });

    await expect(
      service.appendTemplatePageBlockOrderRevision("application-1", {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-items", "home-hero", "home-categories"],
      }),
    ).rejects.toThrow("Template Draft identity is invalid.");
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("normalizes stale, same-set, P2002, and exhausted P2034 conflicts without rebasing", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    const aggregate = {
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-3",
          applicationGraphId: "application-1",
          revisionNumber: 3,
          graph,
        },
      ],
    };
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

    await expect(
      service.appendTemplatePageBlockOrderRevision("application-1", {
        baseDraftRevisionId: "draft-2",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-hero", "home-categories", "home-items"],
      }),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");

    prisma.draftRevision.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(
      service.appendTemplatePageBlockOrderRevision("application-1", {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-items", "home-hero", "home-categories"],
      }),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");

    const retryPrisma = prismaMock();
    retryPrisma.$transaction.mockRejectedValue({ code: "P2034" });
    const retryService = new TemplateService(
      retryPrisma as unknown as PrismaService,
    );
    await expect(
      retryService.appendTemplatePageBlockOrderRevision("application-1", {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-items", "home-hero", "home-categories"],
      }),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");
    expect(retryPrisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("returns the fixed 409 for an unchanged current-base order with zero writes or render", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const template = service.listCuratedTemplates()[0]!;
    const graph = createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    );
    prisma.applicationGraph.findFirst.mockResolvedValue({
      id: "application-1",
      key: "restaurant-template-001",
      name: "Maison Rivage",
      templateOrigin: {
        templateKey: template.key,
        templateVersion: template.version,
        templateGraphChecksum: template.graphChecksum,
      },
      workspace: { slug: "local-workspace" },
      draftRevisions: [
        {
          id: "draft-3",
          applicationGraphId: "application-1",
          revisionNumber: 3,
          graph,
        },
      ],
    });

    const rejection = await service
      .appendTemplatePageBlockOrderRevision("application-1", {
        baseDraftRevisionId: "draft-3",
        surfaceKey: "customer-mobile",
        pageId: "customer-home",
        regionKey: "main",
        blockIds: ["home-hero", "home-categories", "home-items"],
      })
      .catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(ConflictException);
    expect((rejection as ConflictException).getStatus()).toBe(409);
    expect((rejection as Error).message).toBe(
      "Template Draft revision moved; reload before editing.",
    );
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
    expect(prisma.draftPreviewSnapshot.create).not.toHaveBeenCalled();
    expect(compilerCalls.render).not.toHaveBeenCalled();
  });

  it.each(["type", "binding", "recipe", "source"] as const)(
    "rejects schema-valid Restaurant %s closure drift before Draft create or render",
    async (kind) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const template = service.listCuratedTemplates()[0]!;
      const graph = createCuratedRestaurantTemplateGraph(
        "restaurant-template-001",
        "Maison Rivage",
      );
      const page = graph.page.pages.find(({ id }) => id === "customer-home")!;
      if (kind === "type") {
        page.blocks[0]!.type = "category-rail";
      } else if (kind === "binding") {
        page.blocks[0]!.bindings.locationName =
          "graph.domain.restaurant-location.serviceOpen";
        const policy = graph.bindingPolicies.find(
          (candidate) =>
            candidate.kind === "domain-field" &&
            candidate.pageId === "customer-home" &&
            candidate.blockId === "home-hero" &&
            candidate.bindingKey === "locationName",
        );
        if (!policy || policy.kind !== "domain-field") throw new Error();
        policy.fieldKey = "serviceOpen";
      } else if (kind === "recipe") {
        page.recipe.version = "9.9.9";
      } else {
        compilerCalls.failSourceClosure = true;
      }
      expect(() => assertApplicationGraphV3(graph)).not.toThrow();
      prisma.applicationGraph.findFirst.mockResolvedValue({
        id: "application-1",
        key: "restaurant-template-001",
        name: "Maison Rivage",
        templateOrigin: {
          templateKey: template.key,
          templateVersion: template.version,
          templateGraphChecksum: template.graphChecksum,
        },
        workspace: { slug: "local-workspace" },
        draftRevisions: [
          {
            id: "draft-3",
            applicationGraphId: "application-1",
            revisionNumber: 3,
            graph,
          },
        ],
      });
      prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
        id: "draft-4",
        ...data,
      }));

      await expect(
        service.appendTemplatePageBlockOrderRevision("application-1", {
          baseDraftRevisionId: "draft-3",
          surfaceKey: "customer-mobile",
          pageId: "customer-home",
          regionKey: "main",
          blockIds: ["home-items", "home-hero", "home-categories"],
        }),
      ).rejects.toThrow("Restaurant Draft preview is invalid.");
      expect(compilerCalls.closure).toHaveBeenCalledOnce();
      expect(prisma.draftRevision.create).not.toHaveBeenCalled();
      expect(prisma.draftPreviewSnapshot.create).not.toHaveBeenCalled();
      expect(compilerCalls.render).not.toHaveBeenCalled();
    },
  );

  it.each(["snapshot", "renderer"] as const)(
    "rolls back the block-order Draft when %s fails",
    async (failure) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const template = service.listCuratedTemplates()[0]!;
      const graph = createCuratedRestaurantTemplateGraph(
        "restaurant-template-001",
        "Maison Rivage",
      );
      if (failure === "renderer") {
        compilerCalls.failRender = true;
      }
      const aggregate = {
        id: "application-1",
        key: "restaurant-template-001",
        name: "Maison Rivage",
        templateOrigin: {
          templateKey: template.key,
          templateVersion: template.version,
          templateGraphChecksum: template.graphChecksum,
        },
        workspace: { slug: "local-workspace" },
        draftRevisions: [
          {
            id: "draft-3",
            applicationGraphId: "application-1",
            revisionNumber: 3,
            graph,
          },
        ],
      };
      const attemptedDrafts: unknown[] = [];
      const attemptedSnapshots: unknown[] = [];
      const committedDrafts: unknown[] = [];
      const committedSnapshots: unknown[] = [];
      prisma.$transaction.mockImplementation(async (operation: any) => {
        const stagedDrafts: unknown[] = [];
        const stagedSnapshots: unknown[] = [];
        const transaction = {
          workspace: prisma.workspace,
          applicationGraph: prisma.applicationGraph,
          draftRevision: {
            ...prisma.draftRevision,
            create: vi.fn(async ({ data }: any) => {
              const draft = { id: "draft-4", ...data };
              attemptedDrafts.push(draft);
              stagedDrafts.push(draft);
              return draft;
            }),
          },
          draftPreviewSnapshot: {
            ...prisma.draftPreviewSnapshot,
            create: vi.fn(async ({ data }: any) => {
              attemptedSnapshots.push(data);
              stagedSnapshots.push(data);
              if (failure === "snapshot") throw new Error("snapshot-failed");
              return data;
            }),
          },
        };
        const result = await operation(transaction);
        committedDrafts.push(...stagedDrafts);
        committedSnapshots.push(...stagedSnapshots);
        return result;
      });
      prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

      await expect(
        service.appendTemplatePageBlockOrderRevision("application-1", {
          baseDraftRevisionId: "draft-3",
          surfaceKey: "customer-mobile",
          pageId: "customer-home",
          regionKey: "main",
          blockIds: ["home-items", "home-hero", "home-categories"],
        }),
      ).rejects.toThrow(
        failure === "snapshot"
          ? "snapshot-failed"
          : "Restaurant Draft preview is invalid.",
      );
      expect(attemptedDrafts).toHaveLength(1);
      expect(attemptedSnapshots).toHaveLength(failure === "snapshot" ? 1 : 0);
      expect(committedDrafts).toEqual([]);
      expect(committedSnapshots).toEqual([]);
    },
  );
});

const dataFieldCommand = {
  baseDraftRevisionId: "draft-4",
  entityKey: "menu-item" as const,
  recordId: "margherita-pizza" as const,
  fieldKey: "name" as const,
  value: "Heirloom tomato pizza",
};

function dataFieldSnapshot(
  graph: ReturnType<typeof createCuratedRestaurantTemplateGraph>,
  overrides: Record<string, unknown> = {},
) {
  const snapshotBase = {
    apiVersion: "factory.draft-preview-snapshot/v2" as const,
    id: "preview-4",
    workspaceId: "local-workspace",
    applicationGraphId: "application-1",
    draftRevisionId: "draft-4",
    graphVersion: "factory.application-graph/v3" as const,
    graphChecksum: hashApplicationGraphV3(graph),
    snapshotChecksum:
      "sha256:0000000000000000000000000000000000000000000000000000000000000000" as const,
    disposition: "preview-only" as const,
    state: "active" as const,
    createdAt: "2026-08-14T07:30:00.000Z",
    expiresAt: "2026-08-14T08:30:00.000Z",
    ...overrides,
  };
  return assertDraftPreviewSnapshotV2({
    ...snapshotBase,
    snapshotChecksum: hashDraftPreviewSnapshotV2(snapshotBase),
  });
}

function dataFieldAggregate(
  service: TemplateService,
  graph = createCuratedRestaurantTemplateGraph(
    "restaurant-template-001",
    "Maison Rivage",
  ),
) {
  const template = service.listCuratedTemplates()[0]!;
  return {
    id: "application-1",
    key: "restaurant-template-001",
    name: "Maison Rivage",
    templateOrigin: {
      templateKey: template.key,
      templateVersion: template.version,
      templateGraphChecksum: template.graphChecksum,
    },
    workspace: { slug: "local-workspace" },
    draftRevisions: [
      {
        id: "draft-4",
        applicationGraphId: "application-1",
        revisionNumber: 4,
        graph,
        draftPreviewSnapshots: [{ snapshot: dataFieldSnapshot(graph) }],
      },
    ],
  };
}

describe("TemplateService Restaurant data-field revision", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T08:00:00.000Z"));
    compilerCalls.failSourceClosure = false;
    compilerCalls.failRender = false;
    compilerCalls.failRenderSurface = null;
    compilerCalls.closure.mockClear();
    compilerCalls.render.mockClear();
  });

  it("atomically appends r.5 and one checksum-bound active Snapshot without mutating r.4", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const aggregate = dataFieldAggregate(service);
    const previous = structuredClone(aggregate.draftRevisions[0]!);
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-5",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => data,
    );

    const result = await service.appendTemplateDataFieldRevision(
      "application-1",
      dataFieldCommand,
    );

    const seedIndex = result.draft.graph.domain.seedData!.findIndex(
      ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
    );
    expect(result.draft).toMatchObject({
      draftRevisionId: "draft-5",
      revisionNumber: 5,
    });
    expect(result.draft.graph.domain.seedData![seedIndex]!.values.name).toBe(
      "Heirloom tomato pizza",
    );
    expect(
      result.draft.graph.seedScenarios[0]!.records[seedIndex]!.values.name,
    ).toBe("Heirloom tomato pizza");
    expect(result.snapshot).toMatchObject({
      draftRevisionId: "draft-5",
      graphChecksum: hashApplicationGraphV3(result.draft.graph),
      state: "active",
    });
    expect(result.previews.map(({ surface }) => surface.surfaceKey)).toEqual([
      "customer-mobile",
      "merchant-desktop",
    ]);
    expect(compilerCalls.closure).toHaveBeenCalledOnce();
    expect(compilerCalls.render).toHaveBeenCalledTimes(2);
    expect(prisma.draftRevision.create).toHaveBeenCalledOnce();
    expect(prisma.draftPreviewSnapshot.create).toHaveBeenCalledOnce();
    expect(aggregate.draftRevisions[0]).toEqual(previous);
    expect(prisma.applicationGraph.findFirst).toHaveBeenCalledWith({
      where: {
        id: "application-1",
        workspace: { slug: "local-workspace" },
      },
      include: {
        workspace: true,
        draftRevisions: {
          orderBy: { revisionNumber: "desc" },
          take: 1,
          include: {
            draftPreviewSnapshots: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
  });

  it.each([
    ["missing", null],
    ["malformed", { malformed: true }],
    [
      "wrong Graph checksum",
      {
        graphChecksum:
          "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      },
    ],
    ["wrong workspace identity", { workspaceId: "other-workspace" }],
    ["wrong Application identity", { applicationGraphId: "application-2" }],
    ["wrong Draft identity", { draftRevisionId: "draft-3" }],
    ["non-active state", { state: "rendering" }],
  ] as const)(
    "rejects a %s current Snapshot with fixed 400 before closure or append",
    async (_label, drift) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const aggregate = dataFieldAggregate(service);
      const draft = aggregate.draftRevisions[0]!;
      if (drift === null) {
        draft.draftPreviewSnapshots = [];
      } else if ("malformed" in drift) {
        draft.draftPreviewSnapshots = [{ snapshot: drift }];
      } else {
        draft.draftPreviewSnapshots = [
          { snapshot: dataFieldSnapshot(draft.graph, drift) },
        ];
      }
      const previous = structuredClone(aggregate);
      prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

      const error = await service
        .appendTemplateDataFieldRevision("application-1", dataFieldCommand)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as Error).message).toBe(
        "Template Draft request is invalid.",
      );
      expect(aggregate).toEqual(previous);
      expect(compilerCalls.closure).not.toHaveBeenCalled();
      expect(compilerCalls.render).not.toHaveBeenCalled();
      expect(prisma.draftRevision.create).not.toHaveBeenCalled();
      expect(prisma.draftPreviewSnapshot.create).not.toHaveBeenCalled();
    },
  );

  it("captures once before Prisma and reuses only frozen primitives across three Serializable attempts", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    prisma.applicationGraph.findFirst.mockResolvedValue(
      dataFieldAggregate(service),
    );
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-5",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => data,
    );
    const events: string[] = [];
    const calls = { prototype: 0, keys: 0, descriptors: 0 };
    const input = new Proxy(
      { ...dataFieldCommand },
      {
        getPrototypeOf(target) {
          calls.prototype += 1;
          events.push("capture:prototype");
          return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
          calls.keys += 1;
          events.push("capture:keys");
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key) {
          calls.descriptors += 1;
          events.push(`capture:descriptor:${String(key)}`);
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    let attempts = 0;
    const execute = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementation(async (...args: any[]) => {
      attempts += 1;
      events.push(`transaction:${attempts}`);
      const result = await execute(...args);
      if (attempts < 3) throw { code: "P2034" };
      return result;
    });

    await expect(
      service.appendTemplateDataFieldRevision("application-1", input),
    ).resolves.toMatchObject({ draft: { revisionNumber: 5 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(events.indexOf("transaction:1")).toBeGreaterThan(
      events.lastIndexOf("capture:descriptor:value"),
    );
    expect(calls).toEqual({ prototype: 1, keys: 1, descriptors: 5 });
  });

  it("scopes the Application by local workspace before origin inspection", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    prisma.applicationGraph.findFirst.mockImplementation(async ({ where }) => {
      expect(where).toEqual({
        id: "application-1",
        workspace: { slug: "local-workspace" },
      });
      return null;
    });

    await expect(
      service.appendTemplateDataFieldRevision(
        "application-1",
        dataFieldCommand,
      ),
    ).rejects.toThrow("Template Draft was not found.");
    expect(prisma.applicationGraph.findUnique).not.toHaveBeenCalled();
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("maps stale, normalized no-op, P2002, and exhausted P2034 to the fixed 409", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    prisma.applicationGraph.findFirst.mockResolvedValue(
      dataFieldAggregate(service),
    );

    for (const input of [
      { ...dataFieldCommand, baseDraftRevisionId: "draft-3" },
      { ...dataFieldCommand, value: "  Margherita pizza  " },
    ]) {
      const error = await service
        .appendTemplateDataFieldRevision("application-1", input)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as Error).message).toBe(
        "Template Draft revision moved; reload before editing.",
      );
    }

    prisma.draftRevision.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(
      service.appendTemplateDataFieldRevision(
        "application-1",
        dataFieldCommand,
      ),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");

    const retryPrisma = prismaMock();
    retryPrisma.$transaction.mockRejectedValue({ code: "P2034" });
    const retryService = new TemplateService(
      retryPrisma as unknown as PrismaService,
    );
    await expect(
      retryService.appendTemplateDataFieldRevision(
        "application-1",
        dataFieldCommand,
      ),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");
    expect(retryPrisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it.each(["data closure", "compiler closure"] as const)(
    "rejects %s before Draft create or renderer invocation",
    async (failure) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const graph = createCuratedRestaurantTemplateGraph(
        "restaurant-template-001",
        "Maison Rivage",
      );
      if (failure === "data closure") {
        graph.seedScenarios[0]!.records.find(
          ({ entityKey, values }) =>
            entityKey === "menu-item" && values.name === "Margherita pizza",
        )!.values.name = "Scenario drift";
      } else {
        compilerCalls.failSourceClosure = true;
      }
      prisma.applicationGraph.findFirst.mockResolvedValue(
        dataFieldAggregate(service, graph),
      );

      const error = await service
        .appendTemplateDataFieldRevision("application-1", dataFieldCommand)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as Error).message).toBe(
        "Template Draft request is invalid.",
      );
      expect(prisma.draftRevision.create).not.toHaveBeenCalled();
      expect(prisma.draftPreviewSnapshot.create).not.toHaveBeenCalled();
      expect(compilerCalls.render).not.toHaveBeenCalled();
    },
  );

  it.each(["renderer", "snapshot"] as const)(
    "rolls back the attempted data Draft and Snapshot when %s fails",
    async (failure) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const aggregate = dataFieldAggregate(service);
      if (failure === "renderer") compilerCalls.failRender = true;
      const attemptedDrafts: unknown[] = [];
      const attemptedSnapshots: unknown[] = [];
      const committedDrafts: unknown[] = [];
      const committedSnapshots: unknown[] = [];
      prisma.$transaction.mockImplementation(async (operation: any) => {
        const stagedDrafts: unknown[] = [];
        const stagedSnapshots: unknown[] = [];
        const transaction = {
          workspace: prisma.workspace,
          applicationGraph: prisma.applicationGraph,
          draftRevision: {
            ...prisma.draftRevision,
            create: vi.fn(async ({ data }: any) => {
              const draft = { id: "draft-5", ...data };
              attemptedDrafts.push(draft);
              stagedDrafts.push(draft);
              return draft;
            }),
          },
          draftPreviewSnapshot: {
            ...prisma.draftPreviewSnapshot,
            create: vi.fn(async ({ data }: any) => {
              attemptedSnapshots.push(data);
              stagedSnapshots.push(data);
              if (failure === "snapshot") throw new Error("snapshot-failed");
              return data;
            }),
          },
        };
        prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
        const result = await operation(transaction);
        committedDrafts.push(...stagedDrafts);
        committedSnapshots.push(...stagedSnapshots);
        return result;
      });

      await expect(
        service.appendTemplateDataFieldRevision(
          "application-1",
          dataFieldCommand,
        ),
      ).rejects.toThrow("Template Draft request is invalid.");
      expect(attemptedDrafts).toHaveLength(1);
      expect(attemptedSnapshots).toHaveLength(failure === "snapshot" ? 1 : 0);
      expect(committedDrafts).toEqual([]);
      expect(committedSnapshots).toEqual([]);
    },
  );
});

const experienceThemeCommand = {
  baseDraftRevisionId: "draft-5",
  mode: "dark" as const,
};

function experienceAggregate(service: TemplateService) {
  const graph = createCuratedRestaurantTemplateGraph(
    "restaurant-template-001",
    "Maison Rivage",
  );
  const seedIndex = graph.domain.seedData!.findIndex(
    ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
  );
  graph.domain.seedData![seedIndex]!.values.name = "Heirloom tomato pizza";
  graph.seedScenarios[0]!.records[seedIndex]!.values.name =
    "Heirloom tomato pizza";
  const aggregate = dataFieldAggregate(service, graph);
  const draft = aggregate.draftRevisions[0]!;
  draft.id = "draft-5";
  draft.revisionNumber = 5;
  draft.draftPreviewSnapshots = [
    {
      snapshot: dataFieldSnapshot(graph, {
        id: "preview-5",
        draftRevisionId: "draft-5",
      }),
    },
  ];
  return aggregate;
}

describe("TemplateService Restaurant Experience theme revision", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T08:00:00.000Z"));
    compilerCalls.failSourceClosure = false;
    compilerCalls.failRender = false;
    compilerCalls.failRenderSurface = null;
    compilerCalls.closure.mockClear();
    compilerCalls.render.mockClear();
    graphCalls.events.length = 0;
    graphCalls.failDarkHash = false;
  });

  it("atomically appends r.6 and one checksum-bound active Snapshot without mutating r.5", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const aggregate = experienceAggregate(service);
    const previous = structuredClone(aggregate.draftRevisions[0]!);
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
    graphCalls.events.length = 0;
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => {
      graphCalls.events.push("draft:create");
      return { id: "draft-6", ...data };
    });
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => data,
    );

    const result = await service.appendTemplateExperienceThemeRevision(
      "application-1",
      experienceThemeCommand,
    );

    expect(result.draft).toMatchObject({
      draftRevisionId: "draft-6",
      revisionNumber: 6,
      graph: { experience: { theme: { mode: "dark" } } },
    });
    expect(result.snapshot).toMatchObject({
      draftRevisionId: "draft-6",
      graphChecksum: hashApplicationGraphV3(result.draft.graph),
      state: "active",
    });
    expect(result.previews.map(({ surface }) => surface.surfaceKey)).toEqual([
      "customer-mobile",
      "merchant-desktop",
    ]);
    expect(compilerCalls.closure).toHaveBeenCalledOnce();
    expect(compilerCalls.render).toHaveBeenCalledTimes(2);
    expect(prisma.draftRevision.create).toHaveBeenCalledOnce();
    expect(prisma.draftPreviewSnapshot.create).toHaveBeenCalledOnce();
    expect(aggregate.draftRevisions[0]).toEqual(previous);
    expect(graphCalls.events.indexOf("hash:dark")).toBeGreaterThanOrEqual(0);
    expect(graphCalls.events.indexOf("hash:dark")).toBeLessThan(
      graphCalls.events.indexOf("draft:create"),
    );
    expect(prisma.applicationGraph.findFirst).toHaveBeenCalledWith({
      where: {
        id: "application-1",
        workspace: { slug: "local-workspace" },
      },
      include: {
        workspace: true,
        draftRevisions: {
          orderBy: { revisionNumber: "desc" },
          take: 1,
          include: {
            draftPreviewSnapshots: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
  });

  it.each([
    ["missing", null],
    ["malformed", { malformed: true }],
    [
      "wrong Graph checksum",
      {
        graphChecksum:
          "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      },
    ],
    ["wrong workspace identity", { workspaceId: "other-workspace" }],
    ["wrong Application identity", { applicationGraphId: "application-2" }],
    ["wrong Draft identity", { draftRevisionId: "draft-4" }],
    ["non-active state", { state: "rendering" }],
  ] as const)(
    "rejects a %s current Snapshot with fixed 400 before closure or append",
    async (_label, drift) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const aggregate = experienceAggregate(service);
      const draft = aggregate.draftRevisions[0]!;
      if (drift === null) {
        draft.draftPreviewSnapshots = [];
      } else if ("malformed" in drift) {
        draft.draftPreviewSnapshots = [{ snapshot: drift }];
      } else {
        draft.draftPreviewSnapshots = [
          {
            snapshot: dataFieldSnapshot(draft.graph, {
              id: "preview-5",
              draftRevisionId: "draft-5",
              ...drift,
            }),
          },
        ];
      }
      const previous = structuredClone(aggregate);
      prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

      const error = await service
        .appendTemplateExperienceThemeRevision(
          "application-1",
          experienceThemeCommand,
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as Error).message).toBe(
        "Template Draft request is invalid.",
      );
      expect(aggregate).toEqual(previous);
      expect(compilerCalls.closure).not.toHaveBeenCalled();
      expect(compilerCalls.render).not.toHaveBeenCalled();
      expect(prisma.draftRevision.create).not.toHaveBeenCalled();
      expect(prisma.draftPreviewSnapshot.create).not.toHaveBeenCalled();
    },
  );

  it("captures once before Prisma and reuses frozen primitives across three Serializable attempts", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    prisma.applicationGraph.findFirst.mockResolvedValue(
      experienceAggregate(service),
    );
    prisma.draftRevision.create.mockImplementation(async ({ data }: any) => ({
      id: "draft-6",
      ...data,
    }));
    prisma.draftPreviewSnapshot.create.mockImplementation(
      async ({ data }: any) => data,
    );
    const events: string[] = [];
    const calls = { prototype: 0, keys: 0, descriptors: 0 };
    const input = new Proxy(
      { ...experienceThemeCommand },
      {
        getPrototypeOf(target) {
          calls.prototype += 1;
          events.push("capture:prototype");
          return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
          calls.keys += 1;
          events.push("capture:keys");
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key) {
          calls.descriptors += 1;
          events.push(`capture:descriptor:${String(key)}`);
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    let attempts = 0;
    const execute = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementation(async (...args: any[]) => {
      attempts += 1;
      events.push(`transaction:${attempts}`);
      const result = await execute(...args);
      if (attempts < 3) throw { code: "P2034" };
      return result;
    });

    await expect(
      service.appendTemplateExperienceThemeRevision("application-1", input),
    ).resolves.toMatchObject({ draft: { revisionNumber: 6 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(events.indexOf("transaction:1")).toBeGreaterThan(
      events.lastIndexOf("capture:descriptor:mode"),
    );
    expect(calls).toEqual({ prototype: 1, keys: 1, descriptors: 2 });
  });

  it("scopes the Application by local workspace before origin inspection", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    prisma.applicationGraph.findFirst.mockImplementation(async ({ where }) => {
      expect(where).toEqual({
        id: "application-1",
        workspace: { slug: "local-workspace" },
      });
      return null;
    });

    const error = await service
      .appendTemplateExperienceThemeRevision(
        "application-1",
        experienceThemeCommand,
      )
      .catch((caught: unknown) => caught);
    expect((error as { getStatus(): number }).getStatus()).toBe(404);
    expect((error as Error).message).toBe("Template Draft was not found.");
    expect(prisma.applicationGraph.findUnique).not.toHaveBeenCalled();
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it.each([
    [
      "origin drift",
      (aggregate: ReturnType<typeof experienceAggregate>) => {
        aggregate.templateOrigin = { templateKey: "other-template" };
      },
    ],
    [
      "missing latest Draft",
      (aggregate: ReturnType<typeof experienceAggregate>) => {
        aggregate.draftRevisions = [];
      },
    ],
    [
      "Application name drift",
      (aggregate: ReturnType<typeof experienceAggregate>) => {
        aggregate.name = "Other Restaurant";
      },
    ],
    [
      "Draft ownership drift",
      (aggregate: ReturnType<typeof experienceAggregate>) => {
        aggregate.draftRevisions[0]!.applicationGraphId = "application-2";
      },
    ],
    [
      "current system mode",
      (aggregate: ReturnType<typeof experienceAggregate>) => {
        aggregate.draftRevisions[0]!.graph.experience.theme.mode = "system";
        aggregate.draftRevisions[0]!.draftPreviewSnapshots = [
          {
            snapshot: dataFieldSnapshot(aggregate.draftRevisions[0]!.graph, {
              id: "preview-5",
              draftRevisionId: "draft-5",
            }),
          },
        ];
      },
    ],
  ] as const)(
    "rejects %s with fixed 400 before append",
    async (_label, drift) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const aggregate = experienceAggregate(service);
      drift(aggregate);
      prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

      const error = await service
        .appendTemplateExperienceThemeRevision(
          "application-1",
          experienceThemeCommand,
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
      expect((error as Error).message).toBe(
        "Template Draft request is invalid.",
      );
      expect(prisma.draftRevision.create).not.toHaveBeenCalled();
      expect(compilerCalls.render).not.toHaveBeenCalled();
    },
  );

  it("maps stale base, current dark, P2002, and exhausted P2034 to the fixed 409", async () => {
    const prisma = prismaMock();
    const service = new TemplateService(prisma as unknown as PrismaService);
    const aggregate = experienceAggregate(service);
    prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);

    for (const input of [
      { ...experienceThemeCommand, baseDraftRevisionId: "draft-4" },
      experienceThemeCommand,
    ]) {
      if (input === experienceThemeCommand) {
        aggregate.draftRevisions[0]!.graph.experience.theme.mode = "dark";
        aggregate.draftRevisions[0]!.draftPreviewSnapshots = [
          {
            snapshot: dataFieldSnapshot(aggregate.draftRevisions[0]!.graph, {
              id: "preview-5",
              draftRevisionId: "draft-5",
            }),
          },
        ];
      }
      const error = await service
        .appendTemplateExperienceThemeRevision("application-1", input)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as Error).message).toBe(
        "Template Draft revision moved; reload before editing.",
      );
    }

    aggregate.draftRevisions[0]!.graph.experience.theme.mode = "light";
    aggregate.draftRevisions[0]!.draftPreviewSnapshots = [
      {
        snapshot: dataFieldSnapshot(aggregate.draftRevisions[0]!.graph, {
          id: "preview-5",
          draftRevisionId: "draft-5",
        }),
      },
    ];
    prisma.draftRevision.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(
      service.appendTemplateExperienceThemeRevision(
        "application-1",
        experienceThemeCommand,
      ),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");

    const retryPrisma = prismaMock();
    retryPrisma.$transaction.mockRejectedValue({ code: "P2034" });
    const retryService = new TemplateService(
      retryPrisma as unknown as PrismaService,
    );
    await expect(
      retryService.appendTemplateExperienceThemeRevision(
        "application-1",
        experienceThemeCommand,
      ),
    ).rejects.toThrow("Template Draft revision moved; reload before editing.");
    expect(retryPrisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it.each(["compiler closure", "candidate checksum"] as const)(
    "rejects %s with fixed 400 before Draft create or rendering",
    async (failure) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const aggregate = experienceAggregate(service);
      prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
      if (failure === "compiler closure") {
        compilerCalls.failSourceClosure = true;
      } else {
        graphCalls.failDarkHash = true;
      }

      const error = await service
        .appendTemplateExperienceThemeRevision(
          "application-1",
          experienceThemeCommand,
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toBe(
        "Template Draft request is invalid.",
      );
      expect(prisma.draftRevision.create).not.toHaveBeenCalled();
      expect(prisma.draftPreviewSnapshot.create).not.toHaveBeenCalled();
      expect(compilerCalls.render).not.toHaveBeenCalled();
    },
  );

  it.each([
    "customer renderer",
    "merchant renderer",
    "Snapshot insert",
    "response assembly",
  ] as const)(
    "rolls back the attempted r.6 Draft and Snapshot when %s fails",
    async (failure) => {
      const prisma = prismaMock();
      const service = new TemplateService(prisma as unknown as PrismaService);
      const aggregate = experienceAggregate(service);
      const attemptedDrafts: unknown[] = [];
      const attemptedSnapshots: unknown[] = [];
      const committedDrafts: unknown[] = [];
      const committedSnapshots: unknown[] = [];
      if (failure === "customer renderer") {
        compilerCalls.failRenderSurface = "customer-mobile";
      } else if (failure === "merchant renderer") {
        compilerCalls.failRenderSurface = "merchant-desktop";
      }
      prisma.applicationGraph.findFirst.mockResolvedValue(aggregate);
      prisma.$transaction.mockImplementation(async (operation: any) => {
        const stagedDrafts: unknown[] = [];
        const stagedSnapshots: unknown[] = [];
        const transaction = {
          workspace: prisma.workspace,
          applicationGraph: prisma.applicationGraph,
          draftRevision: {
            ...prisma.draftRevision,
            create: vi.fn(async ({ data }: any) => {
              const draft = {
                id: "draft-6",
                ...data,
                ...(failure === "response assembly" ? { graph: {} } : {}),
              };
              attemptedDrafts.push(draft);
              stagedDrafts.push(draft);
              return draft;
            }),
          },
          draftPreviewSnapshot: {
            ...prisma.draftPreviewSnapshot,
            create: vi.fn(async ({ data }: any) => {
              attemptedSnapshots.push(data);
              stagedSnapshots.push(data);
              if (failure === "Snapshot insert") {
                throw new Error("HOSTILE_SNAPSHOT_INSERT_SENTINEL");
              }
              return data;
            }),
          },
        };
        const result = await operation(transaction);
        committedDrafts.push(...stagedDrafts);
        committedSnapshots.push(...stagedSnapshots);
        return result;
      });

      await expect(
        service.appendTemplateExperienceThemeRevision(
          "application-1",
          experienceThemeCommand,
        ),
      ).rejects.toThrow("Template Draft request is invalid.");
      expect(attemptedDrafts).toHaveLength(1);
      expect(attemptedSnapshots).toHaveLength(
        failure === "Snapshot insert" ? 1 : 0,
      );
      expect(committedDrafts).toEqual([]);
      expect(committedSnapshots).toEqual([]);
    },
  );
});
