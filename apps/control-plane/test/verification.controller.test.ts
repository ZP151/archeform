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

import { VerificationController } from "../src/verification/verification.controller.js";
import { VerificationService } from "../src/verification/verification.service.js";

const verification = {
  approveDraftDiff: vi.fn(),
  createRun: vi.fn(),
  getRun: vi.fn(),
  reportEvidence: vi.fn(),
};

@Module({
  controllers: [VerificationController],
  providers: [{ provide: VerificationService, useValue: verification }],
})
class TestModule {}

describe("VerificationController", () => {
  let app: INestApplication;
  let baseUrl: string;
  const originalWorkerToken = process.env.FACTORY_INTERNAL_WORKER_TOKEN;

  beforeAll(async () => {
    process.env.FACTORY_INTERNAL_WORKER_TOKEN = "configured-worker-token";
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
    await app.close();
  });

  it.each([
    {
      method: "POST",
      path: "/compilations/compilation-1/verification-runs",
      body: {
        verificationRunId: "verify-01h3k6f",
        profileKey: "expense-approval",
      },
      handler: verification.createRun,
      arguments: [
        "compilation-1",
        {
          verificationRunId: "verify-01h3k6f",
          profileKey: "expense-approval",
        },
      ],
      response: { id: "run-1", status: "pending" },
    },
    {
      method: "GET",
      path: "/verification-runs/verify-01h3k6f",
      handler: verification.getRun,
      arguments: ["verify-01h3k6f"],
      response: { id: "run-1", status: "failed" },
    },
    {
      method: "POST",
      path: "/internal/verification-runs/verify-01h3k6f/evidence",
      internal: true,
      body: {
        evidence: { apiVersion: "factory.verification-evidence/v1" },
      },
      handler: verification.reportEvidence,
      arguments: [
        "verify-01h3k6f",
        { evidence: { apiVersion: "factory.verification-evidence/v1" } },
      ],
      response: { id: "run-1", status: "failed" },
    },
    {
      method: "POST",
      path: "/verification-runs/verify-01h3k6f/approve",
      body: {
        draftDiff: { apiVersion: "factory.draft-diff/v1" },
      },
      handler: verification.approveDraftDiff,
      arguments: [
        "verify-01h3k6f",
        { draftDiff: { apiVersion: "factory.draft-diff/v1" } },
      ],
      response: { draftRevision: { id: "draft-6" } },
    },
  ])("maps $method $path to the verification boundary", async (scenario) => {
    scenario.handler.mockResolvedValueOnce(scenario.response);

    const response = await fetch(`${baseUrl}${scenario.path}`, {
      method: scenario.method,
      headers: {
        ...(scenario.body ? { "content-type": "application/json" } : {}),
        ...("internal" in scenario && scenario.internal
          ? { "x-factory-internal-token": "configured-worker-token" }
          : {}),
      },
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    });

    expect(response.status).toBe(scenario.method === "POST" ? 201 : 200);
    expect(await response.json()).toEqual(scenario.response);
    expect(scenario.handler).toHaveBeenCalledWith(...scenario.arguments);
  });

  it.each([
    {
      method: "POST",
      path: "/internal/verification-runs/verify-01h3k6f/evidence",
      body: { evidence: { apiVersion: "factory.verification-evidence/v1" } },
      handler: verification.reportEvidence,
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

  it("rejects approval requests that attach caller-controlled fields", async () => {
    const response = await fetch(
      `${baseUrl}/verification-runs/verify-01h3k6f/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftDiff: { apiVersion: "factory.draft-diff/v1" },
          compilationId: "compilation-other",
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(verification.approveDraftDiff).not.toHaveBeenCalled();
  });
});
