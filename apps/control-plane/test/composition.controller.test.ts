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

import { CompositionController } from "../src/composition/composition.controller.js";
import { CompositionService } from "../src/composition/composition.service.js";
import { ProductCompositionService } from "../src/composition/product-composition.service.js";

const composition = {
  createRequirement: vi.fn(),
  requestPlan: vi.fn(),
  getReview: vi.fn(),
  decide: vi.fn(),
  apply: vi.fn(),
};

const productComposition = {
  createProductRequirement: vi.fn(),
  requestProductPlan: vi.fn(),
  getReview: vi.fn(),
  chooseProductPlan: vi.fn(),
  applyProduct: vi.fn(),
};

@Module({
  controllers: [CompositionController],
  providers: [
    { provide: CompositionService, useValue: composition },
    { provide: ProductCompositionService, useValue: productComposition },
  ],
})
class TestModule {}

describe("CompositionController", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: ["error"] });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it.each([
    {
      method: "POST",
      path: "/application-graphs/graph-1/composition/requirements",
      body: { requirement: { apiVersion: "factory.requirement-spec/v1" } },
      handler: composition.createRequirement,
      arguments: [
        "graph-1",
        { requirement: { apiVersion: "factory.requirement-spec/v1" } },
      ],
      response: { review: { id: "review-1", status: "planning" } },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/composition/reviews/review-1/plan",
      handler: composition.requestPlan,
      arguments: ["graph-1", "review-1"],
      response: { plan: { planId: "plan-1" } },
    },
    {
      method: "GET",
      path: "/application-graphs/graph-1/composition/reviews/review-1",
      handler: composition.getReview,
      arguments: ["graph-1", "review-1"],
      response: { review: { id: "review-1", status: "planned" } },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/composition/reviews/review-1/decisions",
      body: { decision: { apiVersion: "factory.composition-decision/v1" } },
      handler: composition.decide,
      arguments: [
        "graph-1",
        "review-1",
        { decision: { apiVersion: "factory.composition-decision/v1" } },
      ],
      response: { review: { id: "review-1", status: "approved" } },
    },
    {
      method: "POST",
      path: "/application-graphs/graph-1/composition/reviews/review-1/apply",
      handler: composition.apply,
      arguments: ["graph-1", "review-1"],
      response: { draftRevision: { id: "draft-cuid-6" } },
    },
    {
      method: "POST",
      path: "/product/requirements",
      body: { requirement: { apiVersion: "factory.requirement-spec/v1" } },
      handler: productComposition.createProductRequirement,
      arguments: [
        { requirement: { apiVersion: "factory.requirement-spec/v1" } },
      ],
      response: { review: { id: "review-1", status: "planning" } },
    },
    {
      method: "GET",
      path: "/product/requirements/review-1",
      handler: productComposition.getReview,
      arguments: ["review-1"],
      response: { review: { id: "review-1", status: "planned" } },
    },
    {
      method: "POST",
      path: "/product/requirements/review-1/plan",
      handler: productComposition.requestProductPlan,
      arguments: ["review-1"],
      response: { alternatives: [{ key: "standard" }] },
    },
    {
      method: "POST",
      path: "/product/requirements/review-1/choices",
      body: { alternativeKey: "standard" },
      handler: productComposition.chooseProductPlan,
      arguments: ["review-1", { alternativeKey: "standard" }],
      response: { review: { id: "review-1", status: "approved" } },
    },
    {
      method: "POST",
      path: "/product/requirements/review-1/apply",
      handler: productComposition.applyProduct,
      arguments: ["review-1"],
      response: { draftRevision: { id: "draft-cuid-2" } },
    },
  ])(
    "maps $method $path to the composition review boundary",
    async (scenario) => {
      scenario.handler.mockResolvedValueOnce(scenario.response);

      const response = await fetch(`${baseUrl}${scenario.path}`, {
        method: scenario.method,
        headers: scenario.body ? { "content-type": "application/json" } : {},
        body: scenario.body ? JSON.stringify(scenario.body) : undefined,
      });

      expect(response.status).toBe(scenario.method === "POST" ? 201 : 200);
      await expect(response.json()).resolves.toEqual(scenario.response);
      expect(scenario.handler).toHaveBeenCalledWith(...scenario.arguments);
    },
  );
});
