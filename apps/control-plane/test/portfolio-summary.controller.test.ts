import {
  type INestApplication,
  Module,
  NotFoundException,
} from "@nestjs/common";
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

import { PortfolioSummaryController } from "../src/portfolio/portfolio-summary.controller.js";
import { WorkspacePortfolioSummaryService } from "../src/portfolio/portfolio-summary.service.js";

const summary = {
  apiVersion: "factory.workspace-portfolio-summary/v1" as const,
  profiles: [
    {
      profile: "restaurant-ordering",
      label: "Restaurant ordering",
      category: "commerce" as const,
      requiredPackages: 16,
      optionalPackages: 1,
    },
  ],
  capabilities: {
    golden: 19,
    lockedVersions: 33,
    candidate: 0,
    provider: 0,
  },
  intake: {
    portfolioSources: 43,
    intakeEligible: 19,
    quarantined: 0,
    blocked: 0,
  },
  compilations: { queued: 1, running: 0, succeeded: 2, failed: 0 },
};

const portfolio = { get: vi.fn() };

@Module({
  controllers: [PortfolioSummaryController],
  providers: [
    { provide: WorkspacePortfolioSummaryService, useValue: portfolio },
  ],
})
class TestModule {}

describe("PortfolioSummaryController", () => {
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

  it("returns a source-free Workspace Portfolio summary", async () => {
    portfolio.get.mockResolvedValueOnce(summary);

    const response = await fetch(
      `${baseUrl}/workspaces/workspace-1/portfolio-summary`,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(summary);
    expect(portfolio.get).toHaveBeenCalledWith("workspace-1");
    expect(JSON.stringify(body)).not.toMatch(
      /https?:\/\/|artifact|prompt|response|token|secret|password/iu,
    );
  });

  it("preserves an unknown workspace as a 404", async () => {
    portfolio.get.mockRejectedValueOnce(
      new NotFoundException("Workspace was not found."),
    );

    const response = await fetch(
      `${baseUrl}/workspaces/missing/portfolio-summary`,
    );

    expect(response.status).toBe(404);
  });
});
