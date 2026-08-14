import { BadRequestException, ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertApplicationGraphV3,
  assertDraftPreviewSnapshotV2,
  hashApplicationGraphV3,
  hashDraftPreviewSnapshotV2,
} from "@factory/graph";

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
});
