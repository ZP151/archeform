import { type INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { AddressInfo } from "node:net";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LifecycleController } from "../src/lifecycle.controller.js";
import { LifecycleService } from "../src/lifecycle.service.js";

const lifecycle = {
  appendDraftRevision: vi.fn(),
  completeCompilation: vi.fn(),
  failCompilation: vi.fn(),
  createLocalAcceptancePreviewRun: vi.fn(),
  createPreviewRun: vi.fn(),
  createCompilation: vi.fn(),
  createLocalApplicationGraph: vi.fn(),
  exportPublishedGraph: vi.fn(),
  listDraftRevisions: vi.fn(),
  getLocalApplicationGraph: vi.fn(),
  listLocalApplicationSummaries: vi.fn(),
  importPublishedGraph: vi.fn(),
  getDraft: vi.fn(),
  getCompilationArtifact: vi.fn(),
  getCompilation: vi.fn(),
  getCurrentPreviewRun: vi.fn(),
  getPreviewDispatch: vi.fn(),
  listPublishedRevisions: vi.fn(),
  publishDraft: vi.fn(),
  proposeDraftRevision: vi.fn(),
  reportPreviewFailed: vi.fn(),
  reportPreviewReady: vi.fn(),
  reportPreviewStopped: vi.fn(),
  stopPreviewRun: vi.fn(),
};

@Module({
  controllers: [LifecycleController],
  providers: [{ provide: LifecycleService, useValue: lifecycle }],
})
class TestModule {}

describe("LifecycleController", () => {
  let app: INestApplication;
  let baseUrl: string;
  const originalWorkerToken = process.env.FACTORY_INTERNAL_WORKER_TOKEN;
  const originalAcceptanceToken = process.env.FACTORY_LOCAL_ACCEPTANCE_TOKEN;

  beforeAll(async () => {
    process.env.FACTORY_INTERNAL_WORKER_TOKEN = "configured-worker-token";
    process.env.FACTORY_LOCAL_ACCEPTANCE_TOKEN = "a".repeat(64);
    app = await NestFactory.create(TestModule, { logger: ["error"] });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    if (originalWorkerToken === undefined) {
      delete process.env.FACTORY_INTERNAL_WORKER_TOKEN;
    } else {
      process.env.FACTORY_INTERNAL_WORKER_TOKEN = originalWorkerToken;
    }
    if (originalAcceptanceToken === undefined) {
      delete process.env.FACTORY_LOCAL_ACCEPTANCE_TOKEN;
    } else {
      process.env.FACTORY_LOCAL_ACCEPTANCE_TOKEN = originalAcceptanceToken;
    }
    await app.close();
  });

  it.each([
    {
      method: "POST",
      path: "/compilations/compilation-1/preview-runs",
      handler: lifecycle.createPreviewRun,
      arguments: ["compilation-1"],
      response: { id: "preview-1", status: "starting" },
    },
    {
      method: "POST",
      path: "/internal/compilations/compilation-1/preview-runs",
      internal: true,
      acceptance: true,
      status: 200,
      body: {
        apiVersion: "factory.local-preview-intent/v1",
        previewRunId: `preview-${"b".repeat(64)}`,
      },
      handler: lifecycle.createLocalAcceptancePreviewRun,
      arguments: [
        "compilation-1",
        {
          apiVersion: "factory.local-preview-intent/v1",
          previewRunId: `preview-${"b".repeat(64)}`,
        },
      ],
      response: {
        apiVersion: "factory.local-preview-intent/v1",
        compilationId: "compilation-1",
        previewRunId: `preview-${"b".repeat(64)}`,
        composeProjectName: `factory-preview-preview-${"b".repeat(64)}`,
        status: "starting",
      },
    },
    {
      method: "GET",
      path: "/compilations/compilation-1/preview-runs/current",
      handler: lifecycle.getCurrentPreviewRun,
      arguments: ["compilation-1"],
      response: { id: "preview-1", status: "ready" },
    },
    {
      method: "POST",
      path: "/preview-runs/preview-1/stop",
      handler: lifecycle.stopPreviewRun,
      arguments: ["preview-1"],
      response: { id: "preview-1", status: "stopping" },
    },
    {
      method: "POST",
      path: "/internal/preview-runs/preview-1/ready",
      internal: true,
      body: {
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      },
      handler: lifecycle.reportPreviewReady,
      arguments: [
        "preview-1",
        {
          webPort: 43101,
          apiPort: 43102,
          previewUrl: "http://127.0.0.1:43101",
        },
      ],
      response: { id: "preview-1", status: "ready" },
    },
    {
      method: "POST",
      path: "/internal/preview-runs/preview-1/failed",
      internal: true,
      body: { diagnostic: "Preview startup failed." },
      handler: lifecycle.reportPreviewFailed,
      arguments: ["preview-1", { diagnostic: "Preview startup failed." }],
      response: { id: "preview-1", status: "failed" },
    },
    {
      method: "POST",
      path: "/internal/preview-runs/preview-1/stopped",
      internal: true,
      handler: lifecycle.reportPreviewStopped,
      arguments: ["preview-1"],
      response: { id: "preview-1", status: "stopped" },
    },
    {
      method: "GET",
      path: "/application-graphs/graph-1/draft-revisions",
      handler: lifecycle.listDraftRevisions,
      arguments: ["graph-1"],
      response: [{ id: "draft-1", revisionNumber: 1 }],
    },
    {
      method: "POST",
      path: "/workspaces/local/application-graphs/import",
      body: { exchange: { apiVersion: "factory.published-graph-exchange/v1" } },
      handler: lifecycle.importPublishedGraph,
      arguments: [
        { exchange: { apiVersion: "factory.published-graph-exchange/v1" } },
      ],
      response: {
        id: "graph-imported",
        draftRevisions: [{ id: "draft-imported" }],
      },
    },
    {
      method: "GET",
      path: "/workspaces/local/application-graphs",
      handler: lifecycle.listLocalApplicationSummaries,
      arguments: [],
      response: [
        {
          id: "graph-restaurant",
          key: "restaurant-ordering",
          name: "Restaurant ordering",
          compositionProfile: "restaurant-ordering",
        },
      ],
    },
    {
      method: "GET",
      path: "/workspaces/local/application-graphs/expense-approval",
      handler: lifecycle.getLocalApplicationGraph,
      arguments: ["expense-approval"],
      response: { id: "graph-1", draftRevisions: [{ id: "draft-1" }] },
    },
    {
      method: "GET",
      path: "/application-graphs/graph-1/published-revisions/published-1/export",
      handler: lifecycle.exportPublishedGraph,
      arguments: ["graph-1", "published-1"],
      response: {
        apiVersion: "factory.published-graph-exchange/v1",
        kind: "published-application-graph",
      },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/ai-proposals",
      body: { brief: "Add a receipt field." },
      handler: lifecycle.proposeDraftRevision,
      arguments: ["graph-1", { brief: "Add a receipt field." }],
      response: {
        draftRevision: { id: "draft-3" },
        proposal: { impact: { summary: "Adds receipt." } },
      },
    },
    {
      method: "POST",
      path: "/workspaces/local/application-graphs",
      body: { graph: { apiVersion: "factory.application-graph/v1" } },
      handler: lifecycle.createLocalApplicationGraph,
      arguments: [{ graph: { apiVersion: "factory.application-graph/v1" } }],
      response: { id: "graph-1" },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/draft-revisions",
      body: { graph: { apiVersion: "factory.application-graph/v1" } },
      handler: lifecycle.appendDraftRevision,
      arguments: [
        "graph-1",
        { graph: { apiVersion: "factory.application-graph/v1" } },
      ],
      response: { id: "draft-2" },
    },
    {
      method: "GET",
      path: "/application-graphs/graph-1/draft",
      handler: lifecycle.getDraft,
      arguments: ["graph-1"],
      response: { id: "draft-2" },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/published-revisions",
      body: { draftRevisionId: "draft-2" },
      handler: lifecycle.publishDraft,
      arguments: ["graph-1", { draftRevisionId: "draft-2" }],
      response: { id: "published-1" },
    },
    {
      method: "GET",
      path: "/application-graphs/graph-1/published-revisions",
      handler: lifecycle.listPublishedRevisions,
      arguments: ["graph-1"],
      response: [{ id: "published-1" }],
    },
    {
      method: "POST",
      path: "/compilations",
      body: {
        publishedRevisionId: "published-1",
        target: "application-bundle",
        compilerVersion: "0.1.0",
      },
      handler: lifecycle.createCompilation,
      arguments: [
        {
          publishedRevisionId: "published-1",
          target: "application-bundle",
          compilerVersion: "0.1.0",
        },
      ],
      response: { id: "compilation-1" },
    },
    {
      method: "GET",
      path: "/compilations/compilation-1/artifact-content?path=docs%2Fapi-reference.md",
      handler: lifecycle.getCompilationArtifact,
      arguments: ["compilation-1", "docs/api-reference.md"],
      response: {
        path: "docs/api-reference.md",
        digest: "sha256:artifact",
        content: "# API reference",
      },
    },
    {
      method: "GET",
      path: "/compilations/compilation-1",
      handler: lifecycle.getCompilation,
      arguments: ["compilation-1"],
      response: { id: "compilation-1", result: { status: "succeeded" } },
    },
    {
      method: "POST",
      path: "/internal/compilations/compilation-1/complete",
      internal: true,
      body: {
        graphHash:
          "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        rootDirectory: "expense-approval-published-1",
        artifacts: [],
      },
      handler: lifecycle.completeCompilation,
      arguments: [
        "compilation-1",
        {
          graphHash:
            "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          rootDirectory: "expense-approval-published-1",
          artifacts: [],
        },
      ],
      response: { id: "compilation-1" },
    },
    {
      method: "POST",
      path: "/internal/compilations/compilation-1/failed",
      internal: true,
      body: {
        apiVersion: "factory.compilation-failure/v1",
        failureCode: "compilation.failed",
      },
      handler: lifecycle.failCompilation,
      arguments: [
        "compilation-1",
        {
          apiVersion: "factory.compilation-failure/v1",
          failureCode: "compilation.failed",
        },
      ],
      response: { id: "compilation-1", result: { status: "failed" } },
    },
    {
      method: "GET",
      path: "/internal/preview-runs/preview-1/dispatch?action=start",
      internal: true,
      handler: lifecycle.getPreviewDispatch,
      arguments: ["preview-1", "start"],
      response: {
        action: "start",
        previewRunId: "preview-1",
        rootDirectory: "expense-approval-published-1",
        composeProjectName: "factory-preview-preview-1",
        artifacts: [],
      },
    },
  ])("maps $method $path to the lifecycle boundary", async (scenario) => {
    scenario.handler.mockResolvedValueOnce(scenario.response);

    const response = await fetch(`${baseUrl}${scenario.path}`, {
      method: scenario.method,
      headers: {
        ...(scenario.body ? { "content-type": "application/json" } : {}),
        ...("internal" in scenario && scenario.internal
          ? { "x-factory-internal-token": "configured-worker-token" }
          : {}),
        ...("acceptance" in scenario && scenario.acceptance
          ? { "x-factory-local-acceptance-token": "a".repeat(64) }
          : {}),
      },
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    });

    expect(response.status).toBe(
      "status" in scenario
        ? scenario.status
        : scenario.method === "POST"
          ? 201
          : 200,
    );
    expect(await response.json()).toEqual(scenario.response);
    expect(scenario.handler).toHaveBeenCalledWith(...scenario.arguments);
  });

  it.each([
    {
      method: "POST",
      path: "/internal/compilations/compilation-1/complete",
      body: {},
      handler: lifecycle.completeCompilation,
    },
    {
      method: "POST",
      path: "/internal/compilations/compilation-1/failed",
      body: {},
      handler: lifecycle.failCompilation,
    },
    {
      method: "GET",
      path: "/internal/preview-runs/preview-1/dispatch?action=start",
      handler: lifecycle.getPreviewDispatch,
    },
    {
      method: "POST",
      path: "/internal/preview-runs/preview-1/ready",
      body: {},
      handler: lifecycle.reportPreviewReady,
    },
    {
      method: "POST",
      path: "/internal/preview-runs/preview-1/failed",
      body: {},
      handler: lifecycle.reportPreviewFailed,
    },
    {
      method: "POST",
      path: "/internal/preview-runs/preview-1/stopped",
      handler: lifecycle.reportPreviewStopped,
    },
  ])("rejects unauthenticated $method $path requests", async (scenario) => {
    for (const providedToken of [undefined, "wrong-worker-token"]) {
      const response = await fetch(`${baseUrl}${scenario.path}`, {
        method: scenario.method,
        headers: {
          ...(scenario.body ? { "content-type": "application/json" } : {}),
          ...(providedToken
            ? { "x-factory-internal-token": providedToken }
            : {}),
        },
        body: scenario.body ? JSON.stringify(scenario.body) : undefined,
      });

      expect(response.status).toBe(401);
      expect(scenario.handler).not.toHaveBeenCalled();
    }
  });

  it.each([
    [{ "x-factory-internal-token": "configured-worker-token" }],
    [{ "x-factory-local-acceptance-token": "a".repeat(64) }],
    [
      {
        "x-factory-internal-token": "wrong-worker-token",
        "x-factory-local-acceptance-token": "a".repeat(64),
      },
    ],
    [
      {
        "x-factory-internal-token": "configured-worker-token",
        "x-factory-local-acceptance-token": "b".repeat(64),
      },
    ],
  ])("requires both exact local-acceptance capabilities", async (headers) => {
    const response = await fetch(
      `${baseUrl}/internal/compilations/compilation-1/preview-runs`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({
          apiVersion: "factory.local-preview-intent/v1",
          previewRunId: `preview-${"b".repeat(64)}`,
        }),
      },
    );

    expect(response.status).toBe(401);
    expect(lifecycle.createLocalAcceptancePreviewRun).not.toHaveBeenCalled();
  });

  it("rejects duplicate local-acceptance capabilities", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      "x-factory-internal-token": "configured-worker-token",
    });
    headers.append("x-factory-local-acceptance-token", "a".repeat(64));
    headers.append("x-factory-local-acceptance-token", "a".repeat(64));
    const response = await fetch(
      `${baseUrl}/internal/compilations/compilation-1/preview-runs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          apiVersion: "factory.local-preview-intent/v1",
          previewRunId: `preview-${"b".repeat(64)}`,
        }),
      },
    );

    expect(response.status).toBe(401);
    expect(lifecycle.createLocalAcceptancePreviewRun).not.toHaveBeenCalled();
  });

  it("rejects local-acceptance preview intents with query parameters", async () => {
    const response = await fetch(
      `${baseUrl}/internal/compilations/compilation-1/preview-runs?unexpected=1`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-factory-internal-token": "configured-worker-token",
          "x-factory-local-acceptance-token": "a".repeat(64),
        },
        body: JSON.stringify({
          apiVersion: "factory.local-preview-intent/v1",
          previewRunId: `preview-${"b".repeat(64)}`,
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(lifecycle.createLocalAcceptancePreviewRun).not.toHaveBeenCalled();
  });

  it("rejects preview requests that attach caller-controlled runtime fields", async () => {
    const response = await fetch(
      `${baseUrl}/compilations/compilation-1/preview-runs`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rootDirectory: "outside", webPort: 43101 }),
      },
    );

    expect(response.status).toBe(400);
    expect(lifecycle.createPreviewRun).not.toHaveBeenCalled();
  });
});
