import { canonicalRecordDigest } from "./canonical.js";
import {
  parseCandidateArtifacts,
  type CandidateProposalV1,
} from "./candidates.js";
import { parseIntakeRequest } from "./contracts.js";
import {
  getPortfolioCandidateBlueprint,
  getExternalPortfolioSource,
  type ExternalPortfolioV1,
  type ExternalPortfolioSourceV1,
} from "./portfolio.js";
import type { CompletedEvidenceRefV1, IntakeJobV1 } from "./jobs.js";
import { type ExternalIntakeStore, type StoredRecordRef } from "./store.js";

export interface PortfolioCandidateProposalInputV1 {
  readonly portfolio: ExternalPortfolioV1;
  readonly sourceId: string;
  readonly createdAt: string;
  readonly producerVersion: string;
  readonly request: StoredRecordRef;
  readonly store: ExternalIntakeStore;
  readonly snapshot: StoredRecordRef;
  readonly acquisition: StoredRecordRef;
  readonly evidenceJob: IntakeJobV1;
  readonly completedEvidence: CompletedEvidenceRefV1;
}

const candidateSafeEffects = [
  "candidate.observe",
  "candidate.project",
  "candidate.validate",
] as const;

function assertPortfolioRequest(
  input: PortfolioCandidateProposalInputV1,
  source: ExternalPortfolioSourceV1,
): void {
  if (input.request.kind !== "request") {
    throw new Error(
      "Portfolio Candidate request does not match Portfolio source.",
    );
  }
  let request;
  try {
    request = parseIntakeRequest(input.store.getRecord(input.request));
  } catch {
    throw new Error(
      "Portfolio Candidate request does not match Portfolio source.",
    );
  }
  if (
    canonicalRecordDigest(request) !== input.request.digest ||
    request.source.portfolioRecord !== source.id ||
    request.source.canonicalRepositoryUrl !== source.canonicalRepositoryUrl ||
    request.source.requestedRef !== source.fixedRef ||
    request.classification !== source.intakeClassification
  ) {
    throw new Error(
      "Portfolio Candidate request does not match Portfolio source.",
    );
  }
}

function selectSafeModule(
  input: PortfolioCandidateProposalInputV1,
  purpose: CandidateProposalV1["selectedModules"][number]["purpose"],
): CandidateProposalV1["selectedModules"][number] {
  const snapshotFiles = new Map(
    input.evidenceJob.snapshotView.files.map((file) => [
      file.path,
      file.digest,
    ]),
  );
  const module = [...input.completedEvidence.inventory.modules]
    .filter(
      (entry) =>
        snapshotFiles.get(entry.path) === entry.sourceDigest &&
        entry.parseStatus === "parsed" &&
        !entry.generated &&
        !entry.binary &&
        !entry.dynamicEvaluation &&
        !entry.dynamicLoad &&
        !entry.processAccess &&
        !entry.filesystemAccess &&
        !entry.networkAccess,
    )
    .sort((left, right) => left.path.localeCompare(right.path))[0];
  if (module === undefined) {
    throw new Error(
      "Portfolio Candidate proposal requires one safe parsed evidence module.",
    );
  }
  return {
    path: module.path,
    ...(module.symbols[0] === undefined ? {} : { symbol: module.symbols[0] }),
    digest: module.sourceDigest,
    purpose,
  };
}

function assertEvidenceParents(input: PortfolioCandidateProposalInputV1): void {
  if (
    input.snapshot.kind !== "snapshot" ||
    input.acquisition.kind !== "acquisition" ||
    input.evidenceJob.snapshot.digest !== input.snapshot.digest ||
    input.evidenceJob.acquisition.digest !== input.acquisition.digest ||
    input.evidenceJob.createdAt !== input.createdAt ||
    input.evidenceJob.producerVersion !== input.producerVersion ||
    input.completedEvidence.status !== "evidenced"
  ) {
    throw new Error(
      "Portfolio Candidate evidence does not match its immutable proposal parents.",
    );
  }
}

function createCandidateArtifacts(
  proposal: Pick<CandidateProposalV1, "id" | "version" | "proposedFactoryKey">,
): CandidateProposalV1["artifacts"] {
  return parseCandidateArtifacts(
    {
      manifest: {
        apiVersion: "factory.candidate-manifest/v1",
        id: proposal.id,
        version: proposal.version,
        proposedFactoryKey: proposal.proposedFactoryKey,
        inputSchema: {
          type: "object",
          properties: { workspaceName: { type: "string" } },
          required: ["workspaceName"],
          additionalProperties: false,
        },
        outputSchema: {
          type: "object",
          properties: { capabilityKey: { type: "string" } },
          required: ["capabilityKey"],
          additionalProperties: false,
        },
        effects: [...candidateSafeEffects],
      },
      fixture: {
        apiVersion: "factory.candidate-fixture/v1",
        id: proposal.id,
        input: { workspaceName: "sample" },
        expectedOutput: { capabilityKey: "commerce" },
      },
      adapter: {
        apiVersion: "factory.candidate-adapter/v1",
        id: proposal.id,
        projection: { capabilityKey: "result" },
        effects: [...candidateSafeEffects],
      },
      conformancePlan: {
        apiVersion: "factory.candidate-conformance-plan/v1",
        cases: [
          { id: "accept-fixture", expectation: "accept-fixture" },
          {
            id: "reject-unknown-input",
            expectation: "reject-input",
            input: { workspaceName: "sample", extra: "blocked" },
          },
        ],
      },
    },
    proposal,
  );
}

export function createPortfolioCandidateProposal(
  input: PortfolioCandidateProposalInputV1,
): CandidateProposalV1 {
  const source = getExternalPortfolioSource(input.portfolio, input.sourceId);
  if (source.intakeClassification === null) {
    throw new Error(`External portfolio source ${source.id} is policy-only.`);
  }
  assertPortfolioRequest(input, source);
  const blueprint = getPortfolioCandidateBlueprint(source);
  assertEvidenceParents(input);
  const proposal = {
    apiVersion: "factory.candidate-proposal/v1" as const,
    createdAt: input.createdAt,
    producerVersion: input.producerVersion,
    id: blueprint.id,
    version: blueprint.version,
    snapshot: input.snapshot,
    acquisition: input.acquisition,
    evidenceJob: input.evidenceJob,
    completedEvidence: input.completedEvidence,
    proposedFactoryKey: blueprint.proposedFactoryKey,
    proposedClassification: blueprint.proposedClassification,
    selectedModules: [selectSafeModule(input, blueprint.selectedModulePurpose)],
  };
  return {
    ...proposal,
    artifacts: createCandidateArtifacts(proposal),
  };
}
