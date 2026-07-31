import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createPortfolioIntakeBatch,
  createPortfolioIntakeRequest,
  loadExternalPortfolio,
} from "../src/index.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const portfolioPath = join(
  workspaceRoot,
  "ecosystem/portfolio/2026-07-30-external-business-logic.json",
);
const requestProvenance = {
  createdAt: "2026-07-31T00:00:00.000Z",
  producerVersion: "0.1.0",
};

describe("external business-logic portfolio", () => {
  it("loads 43 references and 108 scenario demand mappings", () => {
    const portfolio = loadExternalPortfolio(portfolioPath);

    expect(portfolio.sources).toHaveLength(43);
    expect(portfolio.scenarios).toHaveLength(108);
    expect(new Set(portfolio.sources.map(({ id }) => id)).size).toBe(43);
    expect(new Set(portfolio.scenarios.map(({ number }) => number)).size).toBe(
      108,
    );
    expect(portfolio.scenarios.map(({ number }) => number)).toEqual(
      Array.from({ length: 108 }, (_, index) => index + 1),
    );
  });

  it("preserves the documented exclusive classification totals", () => {
    const portfolio = loadExternalPortfolio(portfolioPath);
    const totals = Object.groupBy(
      portfolio.sources,
      ({ portfolioClass }) => portfolioClass,
    );

    expect(
      Object.fromEntries(
        Object.entries(totals).map(([key, value]) => [key, value?.length]),
      ),
    ).toEqual({
      "direct-dependency": 1,
      "selective-source": 11,
      provider: 7,
      "architecture-only": 8,
      excluded: 16,
    });
  });

  it("keeps scenarios as demand metadata rather than Candidate records", () => {
    const portfolio = loadExternalPortfolio(portfolioPath);
    const serialized = JSON.stringify(portfolio);

    expect(
      portfolio.scenarios.every(({ capabilities }) => capabilities.length > 0),
    ).toBe(true);
    expect(serialized).not.toContain("factory.candidate-capability/v1");
    expect(serialized).not.toContain('"status"');
    expect(serialized).not.toContain('"sourceBody"');
    expect(serialized).not.toContain('"licenceDecision"');
  });

  it("creates requests only for intake-eligible portfolio classes", () => {
    const portfolio = loadExternalPortfolio(portfolioPath);
    const eligible = portfolio.sources.filter(
      ({ intakeClassification }) => intakeClassification !== null,
    );
    const policyOnly = portfolio.sources.filter(
      ({ intakeClassification }) => intakeClassification === null,
    );

    expect(eligible).toHaveLength(19);
    expect(policyOnly).toHaveLength(24);
    for (const source of eligible) {
      expect(
        createPortfolioIntakeRequest(portfolio, source.id, requestProvenance),
      ).toMatchObject({
        apiVersion: "factory.external-intake-request/v1",
        source: { portfolioRecord: source.id },
        classification: source.intakeClassification,
      });
    }
    for (const source of policyOnly) {
      expect(() =>
        createPortfolioIntakeRequest(portfolio, source.id, requestProvenance),
      ).toThrow(/policy-only/i);
    }
  });

  it("creates one strict batch for selected intake-eligible portfolio sources", () => {
    const portfolio = loadExternalPortfolio(portfolioPath);

    expect(
      createPortfolioIntakeBatch(
        portfolio,
        ["tastyigniter", "medusa"],
        requestProvenance,
      ),
    ).toEqual({
      apiVersion: "factory.external-intake-batch/v1",
      items: [
        {
          id: "tastyigniter",
          request: expect.objectContaining({
            source: expect.objectContaining({
              portfolioRecord: "tastyigniter",
            }),
          }),
        },
        {
          id: "medusa",
          request: expect.objectContaining({
            source: expect.objectContaining({ portfolioRecord: "medusa" }),
          }),
        },
      ],
    });
  });

  it("allows only the repository-local Intake CLI manifest to depend on External Intake", () => {
    const manifests = ["apps", "packages"].flatMap((area) =>
      readdirSync(join(workspaceRoot, area), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(workspaceRoot, area, entry.name, "package.json")),
    );

    const importers = manifests
      .filter((manifest) => manifest !== join(packageRoot, "package.json"))
      .filter((manifest) => {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as Record<
          string,
          unknown
        >;
        return JSON.stringify(parsed).includes("@factory/external-intake");
      });

    expect(importers).toEqual([
      join(workspaceRoot, "apps", "intake-cli", "package.json"),
    ]);
  });
});
