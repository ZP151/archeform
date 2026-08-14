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

import { TemplateController } from "../src/template/template.controller.js";
import { TemplateService } from "../src/template/template.service.js";

const templates = {
  listCuratedTemplates: vi.fn(),
  instantiateCuratedTemplate: vi.fn(),
  openTemplateDraft: vi.fn(),
  appendTemplateDraftRevision: vi.fn(),
  appendTemplatePageRevision: vi.fn(),
  appendTemplatePageBlockOrderRevision: vi.fn(),
};

@Module({
  controllers: [TemplateController],
  providers: [{ provide: TemplateService, useValue: templates }],
})
class TestModule {}

describe("TemplateController", () => {
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

  it("exposes the fixed local curated-template catalogue", async () => {
    templates.listCuratedTemplates.mockReturnValue([
      {
        apiVersion: "factory.curated-template/v1",
        key: "restaurant-dual-surface",
      },
    ]);

    const response = await fetch(
      `${baseUrl}/workspaces/local/curated-templates`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        apiVersion: "factory.curated-template/v1",
        key: "restaurant-dual-surface",
      },
    ]);
    expect(templates.listCuratedTemplates).toHaveBeenCalledOnce();
  });

  it("routes an exact template clone request", async () => {
    const body = {
      requestId: "restaurant-template-001",
      name: "Maison Rivage",
    };
    templates.instantiateCuratedTemplate.mockResolvedValue({
      id: "instance-1",
    });

    const response = await fetch(
      `${baseUrl}/workspaces/local/curated-templates/restaurant-dual-surface/instances`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "instance-1" });
    expect(templates.instantiateCuratedTemplate).toHaveBeenCalledWith(
      "restaurant-dual-surface",
      body,
    );
  });

  it("routes an optimistic template Draft edit", async () => {
    const body = { baseDraftRevisionId: "draft-1", name: "Maison Rivage" };
    templates.appendTemplateDraftRevision.mockResolvedValue({
      id: "instance-2",
    });

    const response = await fetch(
      `${baseUrl}/template-draft-instances/application-1/revisions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "instance-2" });
    expect(templates.appendTemplateDraftRevision).toHaveBeenCalledWith(
      "application-1",
      body,
    );
  });

  it("routes the exact server-owned template Page revision command", async () => {
    const body = {
      baseDraftRevisionId: "draft-2",
      surfaceKey: "customer-mobile",
      pageId: "customer-menu",
      title: "Seasonal Menu",
    };
    templates.appendTemplatePageRevision.mockResolvedValue({
      id: "instance-3",
    });

    const response = await fetch(
      `${baseUrl}/template-draft-instances/application-1/page-revisions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "instance-3" });
    expect(templates.appendTemplatePageRevision).toHaveBeenCalledWith(
      "application-1",
      body,
    );
  });

  it("routes the exact server-owned template Page block-order command", async () => {
    const body = {
      baseDraftRevisionId: "draft-3",
      surfaceKey: "customer-mobile",
      pageId: "customer-home",
      regionKey: "main",
      blockIds: ["home-items", "home-hero", "home-categories"],
    };
    templates.appendTemplatePageBlockOrderRevision.mockResolvedValue({
      id: "instance-4",
    });

    const response = await fetch(
      `${baseUrl}/template-draft-instances/application-1/page-block-order-revisions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "instance-4" });
    expect(templates.appendTemplatePageBlockOrderRevision).toHaveBeenCalledWith(
      "application-1",
      body,
    );
  });

  it("routes a resumable template Draft open by application key", async () => {
    templates.openTemplateDraft.mockResolvedValue({ id: "instance-1" });

    const response = await fetch(
      `${baseUrl}/workspaces/local/template-draft-instances/restaurant-template-001`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "instance-1" });
    expect(templates.openTemplateDraft).toHaveBeenCalledWith(
      "restaurant-template-001",
    );
  });
});
