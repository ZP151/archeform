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
  createCompilation: vi.fn(),
  createLocalApplicationGraph: vi.fn(),
  exportPublishedGraph: vi.fn(),
  getLocalApplicationGraph: vi.fn(),
  importPublishedGraph: vi.fn(),
  getDraft: vi.fn(),
  getCompilation: vi.fn(),
  listPublishedRevisions: vi.fn(),
  publishDraft: vi.fn(),
  proposeDraftRevision: vi.fn(),
};

@Module({
  controllers: [LifecycleController],
  providers: [{ provide: LifecycleService, useValue: lifecycle }],
})
class TestModule {}

describe("LifecycleController", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: ["error"] });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => app.close());

  it.each([
    {
      method: "POST",
      path: "/workspaces/local/application-graphs/import",
      body: { exchange: { apiVersion: "factory.published-graph-exchange/v1" } },
      handler: lifecycle.importPublishedGraph,
      arguments: [{ exchange: { apiVersion: "factory.published-graph-exchange/v1" } }],
      response: { id: "graph-imported", draftRevisions: [{ id: "draft-imported" }] },
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
      response: { apiVersion: "factory.published-graph-exchange/v1", kind: "published-application-graph" },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/ai-proposals",
      body: { brief: "Add a receipt field." },
      handler: lifecycle.proposeDraftRevision,
      arguments: ["graph-1", { brief: "Add a receipt field." }],
      response: { draftRevision: { id: "draft-3" }, proposal: { impact: { summary: "Adds receipt." } } },
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
      path: "/compilations/compilation-1",
      handler: lifecycle.getCompilation,
      arguments: ["compilation-1"],
      response: { id: "compilation-1", result: { status: "succeeded" } },
    },
    {
      method: "POST",
      path: "/internal/compilations/compilation-1/complete",
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
  ])("maps $method $path to the lifecycle boundary", async (scenario) => {
    scenario.handler.mockResolvedValueOnce(scenario.response);

    const response = await fetch(`${baseUrl}${scenario.path}`, {
      method: scenario.method,
      headers: scenario.body
        ? { "content-type": "application/json" }
        : undefined,
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    });

    expect(response.status).toBe(scenario.method === "POST" ? 201 : 200);
    expect(await response.json()).toEqual(scenario.response);
    expect(scenario.handler).toHaveBeenCalledWith(...scenario.arguments);
  });
});
