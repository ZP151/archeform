import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  canonicalRecordDigest,
  createPortfolioCandidateProposal,
  getPortfolioCandidateBlueprint,
  loadExternalPortfolio,
} from "../src/index.js";
import type {
  CompletedEvidenceRefV1,
  ExternalIntakeStore,
  IntakeRequestV1,
  IntakeJobV1,
  PortfolioCandidateProposalInputV1,
  StoredRecordRef,
} from "../src/index.js";

const createdAt = "2026-08-01T00:00:00.000Z";

function digest(character: string): `sha256:${string}` {
  return `sha256:${character.repeat(64)}`;
}

interface CandidateInputFixture extends PortfolioCandidateProposalInputV1 {
  readonly request: StoredRecordRef;
  readonly store: ExternalIntakeStore;
}

function candidateInput(sourceId = "medusa"): CandidateInputFixture {
  const portfolio = loadExternalPortfolio(
    fileURLToPath(
      new URL(
        "../../../ecosystem/portfolio/2026-07-30-external-business-logic.json",
        import.meta.url,
      ),
    ),
  );
  const source = portfolio.sources.find(({ id }) => id === sourceId)!;
  if (source.intakeClassification === null) {
    throw new Error("Candidate fixture requires an intake-eligible source.");
  }
  const request: IntakeRequestV1 = {
    apiVersion: "factory.external-intake-request/v1",
    createdAt,
    producerVersion: "1.0.0",
    parentDigests: [],
    source: {
      canonicalRepositoryUrl: source.canonicalRepositoryUrl,
      requestedRef: source.fixedRef,
      portfolioRecord: source.id,
    },
    classification: source.intakeClassification,
    requestedModules: [],
    allowNetworkRetrieval: true,
  };
  const requestRef: StoredRecordRef = {
    kind: "request",
    digest: canonicalRecordDigest(request),
  };
  const snapshot: StoredRecordRef = { kind: "snapshot", digest: digest("a") };
  const acquisition: StoredRecordRef = {
    kind: "acquisition",
    digest: digest("b"),
  };
  const sourceDigest = digest("c");
  const evidenceJob: IntakeJobV1 = {
    apiVersion: "factory.external-evidence-job/v1",
    id: `${source.id}-source`,
    createdAt,
    producerVersion: "1.0.0",
    snapshot,
    acquisition,
    snapshotView: {
      snapshotDigest: snapshot.digest,
      treeDigest: digest("d"),
      files: [
        {
          path: "src/provider.ts",
          mode: "100644",
          digest: sourceDigest,
          content: new TextEncoder().encode("export const provider = true;"),
        },
      ],
    },
  };

  return {
    portfolio,
    sourceId: source.id,
    createdAt,
    producerVersion: "1.0.0",
    request: requestRef,
    store: {
      getRecord(ref: StoredRecordRef) {
        if (ref.kind === "request" && ref.digest === requestRef.digest) {
          return request;
        }
        throw new Error("Unexpected source-study record request.");
      },
    } as unknown as ExternalIntakeStore,
    snapshot,
    acquisition,
    evidenceJob,
    completedEvidence: {
      status: "evidenced",
      inventory: {
        modules: [
          {
            path: "src/provider.ts",
            symbols: ["provider"],
            imports: [],
            exports: ["provider"],
            dependencies: [],
            size: 29,
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
    } as unknown as CompletedEvidenceRefV1,
  };
}

describe("Portfolio Candidate proposal", () => {
  it("derives a deterministic non-promoting blueprint for every intake-eligible source", () => {
    const portfolio = loadExternalPortfolio(
      fileURLToPath(
        new URL(
          "../../../ecosystem/portfolio/2026-07-30-external-business-logic.json",
          import.meta.url,
        ),
      ),
    );
    const expected = [
      [
        "tastyigniter",
        "tastyigniter-source-study",
        "candidate.source.tastyigniter",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "ti-ext-cart",
        "ti-ext-cart-source-study",
        "candidate.source.ti-ext-cart",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "medusa",
        "medusa-provider",
        "candidate.provider.medusa",
        "provider-adapter",
        "adapter-contract",
      ],
      [
        "saleor",
        "saleor-provider",
        "candidate.provider.saleor",
        "provider-adapter",
        "adapter-contract",
      ],
      [
        "bagisto",
        "bagisto-source-study",
        "candidate.source.bagisto",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "spree",
        "spree-source-study",
        "candidate.source.spree",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "eventyay-tickets",
        "eventyay-tickets-source-study",
        "candidate.source.eventyay-tickets",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "inventree",
        "inventree-source-study",
        "candidate.source.inventree",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "traccar",
        "traccar-provider",
        "candidate.provider.traccar",
        "provider-adapter",
        "adapter-contract",
      ],
      [
        "chatwoot",
        "chatwoot-source-study",
        "candidate.source.chatwoot",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "bookstack",
        "bookstack-source-study",
        "candidate.source.bookstack",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "strapi",
        "strapi-source-study",
        "candidate.source.strapi",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "appsmith",
        "appsmith-source-study",
        "candidate.source.appsmith",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "baserow",
        "baserow-source-study",
        "candidate.source.baserow",
        "source-fragment",
        "proposed-copy",
      ],
      [
        "workbox",
        "workbox-dependency",
        "candidate.dependency.workbox",
        "dependency",
        "reference",
      ],
      [
        "openfga",
        "openfga-provider",
        "candidate.provider.openfga",
        "provider-adapter",
        "adapter-contract",
      ],
      [
        "appwrite",
        "appwrite-provider",
        "candidate.provider.appwrite",
        "provider-adapter",
        "adapter-contract",
      ],
      [
        "centrifugo",
        "centrifugo-provider",
        "candidate.provider.centrifugo",
        "provider-adapter",
        "adapter-contract",
      ],
      [
        "tray",
        "tray-provider",
        "candidate.provider.tray",
        "provider-adapter",
        "adapter-contract",
      ],
    ] as const;

    expect(
      portfolio.sources
        .filter((source) => source.intakeClassification !== null)
        .map((source) => {
          const blueprint = getPortfolioCandidateBlueprint(source);
          const proposal = createPortfolioCandidateProposal(
            candidateInput(source.id),
          );
          return [
            source.id,
            blueprint.id,
            blueprint.proposedFactoryKey,
            blueprint.proposedClassification,
            blueprint.selectedModulePurpose,
            proposal.id,
            proposal.proposedFactoryKey,
          ];
        }),
    ).toEqual(
      expected.map(([sourceId, id, key, classification, purpose]) => [
        sourceId,
        id,
        key,
        classification,
        purpose,
        id,
        key,
      ]),
    );
  });

  it("rejects a policy-only Portfolio source before accepting evidence input", () => {
    const portfolio = loadExternalPortfolio(
      fileURLToPath(
        new URL(
          "../../../ecosystem/portfolio/2026-07-30-external-business-logic.json",
          import.meta.url,
        ),
      ),
    );

    expect(() =>
      createPortfolioCandidateProposal({
        portfolio,
        sourceId: "opensourcepos",
      } as never),
    ).toThrow(/policy-only/i);
  });

  it("derives a deterministic declarative provider Candidate from completed Portfolio evidence", () => {
    const input = candidateInput();

    const proposal = createPortfolioCandidateProposal(input);

    expect(proposal).toMatchObject({
      apiVersion: "factory.candidate-proposal/v1",
      id: "medusa-provider",
      version: "0.1.0",
      proposedFactoryKey: "candidate.provider.medusa",
      proposedClassification: "provider-adapter",
    });
    expect(proposal.artifacts.adapter.effects).toEqual([
      "candidate.observe",
      "candidate.project",
      "candidate.validate",
    ]);
    expect(proposal.selectedModules).toEqual([
      {
        path: "src/provider.ts",
        symbol: "provider",
        digest: digest("c"),
        purpose: "adapter-contract",
      },
    ]);
    expect(JSON.stringify(proposal)).not.toMatch(
      /https?:\/\/|token|password|secret/iu,
    );
  });

  it("rejects evidence whose immutable parents do not match the proposal", () => {
    const input = candidateInput();

    expect(() =>
      createPortfolioCandidateProposal({
        ...input,
        evidenceJob: {
          ...input.evidenceJob,
          snapshot: { kind: "snapshot", digest: digest("e") },
        },
      }),
    ).toThrow(/does not match/i);
  });

  it("rejects a completed evidence chain from another Portfolio source", () => {
    const input = candidateInput();
    const otherRequest: IntakeRequestV1 = {
      apiVersion: "factory.external-intake-request/v1",
      createdAt,
      producerVersion: "1.0.0",
      parentDigests: [],
      source: {
        canonicalRepositoryUrl: "https://github.com/example/not-medusa.git",
        requestedRef: "v1.0.0",
        portfolioRecord: "not-medusa",
      },
      classification: "provider",
      requestedModules: [],
      allowNetworkRetrieval: true,
    };
    const otherRequestRef: StoredRecordRef = {
      kind: "request",
      digest: canonicalRecordDigest(otherRequest),
    };

    expect(() =>
      createPortfolioCandidateProposal({
        ...input,
        request: otherRequestRef,
        store: {
          getRecord() {
            return otherRequest;
          },
        } as unknown as ExternalIntakeStore,
      } as never),
    ).toThrow(/does not match Portfolio/i);
  });
});
