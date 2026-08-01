import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createCandidateFoundryScaffold,
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

describe("Candidate Foundry scaffold", () => {
  it("creates a source-free deterministic selective-port scaffold", () => {
    const first = createCandidateFoundryScaffold({
      portfolio: portfolio(),
      sourceId: "tastyigniter",
      candidate: candidate(),
    });
    const second = createCandidateFoundryScaffold({
      portfolio: portfolio(),
      sourceId: "tastyigniter",
      candidate: candidate(),
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      apiVersion: "factory.candidate-foundry-scaffold/v1",
      mode: "selective-source-copy",
      targetCapability: "candidate.source.tastyigniter",
      requiredArtifacts: ["manifest", "fixture", "adapter", "conformance-plan"],
    });
    expect(JSON.stringify(first)).not.toMatch(
      /"(?:sourceText|repositoryUrl|secret|token)"\s*:/i,
    );
  });

  it("rejects a Candidate whose evidence module is not safe for a source port", () => {
    const unsafe = candidate({
      completedEvidence: {
        status: "evidenced",
        inventory: {
          modules: [
            {
              ...candidate().completedEvidence.inventory.modules[0]!,
              networkAccess: true,
            },
          ],
        },
      },
    });

    expect(() =>
      createCandidateFoundryScaffold({
        portfolio: portfolio(),
        sourceId: "tastyigniter",
        candidate: unsafe,
      }),
    ).toThrow(
      "Candidate port plan selected module is absent from completed safe evidence.",
    );
  });

  it.each(["graph", "assetLocks", "compiler", "runtime", "provider"])(
    "does not emit a %s authority field",
    (forbidden) => {
      const scaffold = createCandidateFoundryScaffold({
        portfolio: portfolio(),
        sourceId: "tastyigniter",
        candidate: candidate(),
      });
      expect(JSON.stringify(scaffold)).not.toContain(forbidden);
    },
  );
});
