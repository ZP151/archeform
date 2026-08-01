import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { portfolioPublicSummary } from "@factory/portfolio-public";
import { describe, expect, it } from "vitest";

import { loadExternalPortfolio } from "../src/index.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const portfolioPath = join(
  workspaceRoot,
  "ecosystem/portfolio/2026-07-30-external-business-logic.json",
);

describe("public Portfolio summary boundary", () => {
  it("matches the private Portfolio's classified counts without exporting its source records", () => {
    const portfolio = loadExternalPortfolio(portfolioPath);
    const classes = Object.groupBy(
      portfolio.sources,
      ({ portfolioClass }) => portfolioClass,
    );

    expect(portfolioPublicSummary).toMatchObject({
      apiVersion: "factory.portfolio-public-summary/v1",
      scenarioCount: portfolio.scenarios.length,
      candidateBlueprints: portfolio.sources.filter(
        ({ intakeClassification }) => intakeClassification !== null,
      ).length,
      sourceCounts: {
        total: portfolio.sources.length,
        intakeEligible: portfolio.sources.filter(
          ({ intakeClassification }) => intakeClassification !== null,
        ).length,
        directDependency: classes["direct-dependency"]?.length,
        selectiveSource: classes["selective-source"]?.length,
        provider: classes.provider?.length,
        policyOnly:
          (classes["architecture-only"]?.length ?? 0) +
          (classes.excluded?.length ?? 0),
      },
    });
    expect(portfolioPublicSummary.supply).toMatchObject({
      apiVersion: "factory.capability-supply-summary/v1",
      families: expect.arrayContaining([
        expect.objectContaining({ key: "commerce-transaction" }),
      ]),
    });
    expect(JSON.stringify(portfolioPublicSummary.supply)).not.toMatch(
      /https?:\/\/|\.git|sha256:|url|path|source|token|secret|password/iu,
    );
    expect(JSON.stringify(portfolioPublicSummary)).not.toMatch(
      /https?:\/\/|\.git|sha256:|token|secret|password/iu,
    );
    expect(
      readFileSync(
        join(workspaceRoot, "packages/portfolio-public/src/summary.ts"),
        "utf8",
      ),
    ).not.toContain("@factory/external-intake");
  });
});
