import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createCandidatePortPlan,
  loadExternalPortfolio,
  type CandidateProposalV1,
  type ExternalPortfolioV1,
} from "../src/index.js";

function digest(character: string): `sha256:${string}` {
  return `sha256:${character.repeat(64)}`;
}

function portfolio(): ExternalPortfolioV1 {
  return loadExternalPortfolio(
    fileURLToPath(
      new URL(
        "../../../ecosystem/portfolio/2026-07-30-external-business-logic.json",
        import.meta.url,
      ),
    ),
  );
}

function candidate(
  overrides: Partial<CandidateProposalV1> = {},
): CandidateProposalV1 {
  const snapshot = { kind: "snapshot" as const, digest: digest("a") };
  const acquisition = { kind: "acquisition" as const, digest: digest("b") };
  const sourceDigest = digest("c");
  return {
    apiVersion: "factory.candidate-proposal/v1",
    createdAt: "2026-08-01T00:00:00.000Z",
    producerVersion: "1.0.0",
    id: "tastyigniter-source-study",
    version: "0.1.0",
    snapshot,
    acquisition,
    evidenceJob: {
      apiVersion: "factory.external-evidence-job/v1",
      id: "tastyigniter-source",
      createdAt: "2026-08-01T00:00:00.000Z",
      producerVersion: "1.0.0",
      snapshot,
      acquisition,
      snapshotView: {
        snapshotDigest: snapshot.digest,
        treeDigest: digest("d"),
        files: [],
      },
    },
    completedEvidence: {
      status: "evidenced",
      inventory: {
        modules: [
          {
            path: "extensions/catalog/cart.ts",
            symbols: ["createCart"],
            imports: [],
            exports: ["createCart"],
            dependencies: [],
            size: 24,
            noticeMarker: false,
            generated: false,
            binary: false,
            sourceDigest,
            dynamicEvaluation: false,
            dynamicLoad: false,
            processAccess: false,
            filesystemAccess: false,
            networkAccess: false,
            parseStatus: "parsed",
          },
        ],
      },
    },
    proposedFactoryKey: "candidate.source.tastyigniter",
    proposedClassification: "source-fragment",
    selectedModules: [
      {
        path: "extensions/catalog/cart.ts",
        symbol: "createCart",
        digest: sourceDigest,
        purpose: "proposed-copy",
      },
    ],
    artifacts: {} as CandidateProposalV1["artifacts"],
    ...overrides,
  };
}

describe("Candidate port plan", () => {
  it("creates a deterministic selective-source plan without exposing source material", () => {
    const plan = createCandidatePortPlan({
      portfolio: portfolio(),
      sourceId: "tastyigniter",
      candidate: candidate(),
    });

    expect(plan).toEqual({
      apiVersion: "factory.candidate-port-plan/v1",
      candidate: { id: "tastyigniter-source-study", version: "0.1.0" },
      reuseMode: "selective-source-copy",
      targetCapability: "candidate.source.tastyigniter",
      selectedModule: {
        path: "extensions/catalog/cart.ts",
        symbol: "createCart",
        digest: digest("c"),
      },
      requiredEvidence: [
        "license",
        "notice",
        "sbom",
        "secret-scan",
        "sast",
        "vulnerability-scan",
        "conformance",
        "removal-test",
      ],
    });
    expect(JSON.stringify(plan)).not.toMatch(
      /https?:\/\/|prompt|credential|sourceContent|runtime/iu,
    );
    expect(plan).not.toHaveProperty("sourceUrl");
    expect(plan).not.toHaveProperty("sourceContent");
    expect(plan).not.toHaveProperty("graph");
    expect(plan).not.toHaveProperty("activation");
  });

  it.each([
    ["policy-only source", { sourceId: "opensourcepos" }],
    [
      "mismatched candidate identity",
      { candidate: candidate({ id: "wrong" }) },
    ],
    [
      "missing selected module",
      { candidate: candidate({ selectedModules: [] }) },
    ],
    [
      "altered selected module digest",
      {
        candidate: candidate({
          selectedModules: [
            {
              path: "extensions/catalog/cart.ts",
              symbol: "createCart",
              digest: digest("e"),
              purpose: "proposed-copy",
            },
          ],
        }),
      },
    ],
    [
      "duplicated selected module",
      {
        candidate: candidate({
          selectedModules: [
            ...candidate().selectedModules,
            ...candidate().selectedModules,
          ],
        }),
      },
    ],
    [
      "credential-shaped selected symbol",
      {
        candidate: candidate({
          selectedModules: [
            {
              path: "extensions/catalog/cart.ts",
              symbol: "sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD",
              digest: digest("c"),
              purpose: "proposed-copy",
            },
          ],
        }),
      },
    ],
  ] as const)("rejects %s", (_label, overrides) => {
    expect(() =>
      createCandidatePortPlan({
        portfolio: portfolio(),
        sourceId: "tastyigniter",
        candidate: candidate(),
        ...overrides,
      }),
    ).toThrow();
  });
});
