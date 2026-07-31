import {
  isCredentialLikeCandidateValue,
  type CandidateProposalV1,
} from "./candidates.js";
import {
  getExternalPortfolioSource,
  getPortfolioCandidateBlueprint,
  type ExternalPortfolioV1,
} from "./portfolio.js";

export type CandidatePortReuseModeV1 =
  "direct-dependency" | "provider-adapter" | "selective-source-copy";

export interface CandidatePortPlanV1 {
  readonly apiVersion: "factory.candidate-port-plan/v1";
  readonly candidate: { readonly id: string; readonly version: string };
  readonly reuseMode: CandidatePortReuseModeV1;
  readonly targetCapability: string;
  readonly selectedModule: {
    readonly path: string;
    readonly symbol?: string;
    readonly digest: string;
  };
  readonly requiredEvidence: readonly (
    | "license"
    | "notice"
    | "sbom"
    | "secret-scan"
    | "sast"
    | "vulnerability-scan"
    | "conformance"
    | "removal-test"
  )[];
}

export interface CreateCandidatePortPlanInputV1 {
  readonly portfolio: ExternalPortfolioV1;
  readonly sourceId: string;
  readonly candidate: CandidateProposalV1;
}

const safeModulePath =
  /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\)[A-Za-z0-9_.@/-]{1,512}$/u;
const sha256Digest = /^sha256:[a-f0-9]{64}$/u;
const safeSymbol = /^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/u;
const requiredEvidence = Object.freeze([
  "license",
  "notice",
  "sbom",
  "secret-scan",
  "sast",
  "vulnerability-scan",
  "conformance",
  "removal-test",
] as const);

const reuseModeByClassification = {
  dependency: "direct-dependency",
  "source-fragment": "selective-source-copy",
  "provider-adapter": "provider-adapter",
} as const satisfies Readonly<
  Record<
    CandidateProposalV1["proposedClassification"],
    CandidatePortReuseModeV1
  >
>;

function assertCandidateIdentity(input: CreateCandidatePortPlanInputV1): void {
  const source = getExternalPortfolioSource(input.portfolio, input.sourceId);
  if (source.intakeClassification === null) {
    throw new Error(`External portfolio source ${source.id} is policy-only.`);
  }
  const blueprint = getPortfolioCandidateBlueprint(source);
  const candidate = input.candidate;
  if (
    candidate.apiVersion !== "factory.candidate-proposal/v1" ||
    candidate.id !== blueprint.id ||
    candidate.version !== blueprint.version ||
    candidate.proposedFactoryKey !== blueprint.proposedFactoryKey ||
    candidate.proposedClassification !== blueprint.proposedClassification
  ) {
    throw new Error("Candidate port plan does not match Portfolio identity.");
  }
  if (
    candidate.snapshot.kind !== "snapshot" ||
    candidate.acquisition.kind !== "acquisition" ||
    candidate.evidenceJob.snapshot.digest !== candidate.snapshot.digest ||
    candidate.evidenceJob.acquisition.digest !== candidate.acquisition.digest ||
    candidate.completedEvidence.status !== "evidenced"
  ) {
    throw new Error(
      "Candidate port plan requires completed matching evidence.",
    );
  }
}

function assertSafeCandidateText(value: string): void {
  if (isCredentialLikeCandidateValue(value)) {
    throw new Error("Candidate port plan rejects credential-shaped input.");
  }
}

function selectEvidenceModule(
  candidate: CandidateProposalV1,
): CandidatePortPlanV1["selectedModule"] {
  if (
    !Array.isArray(candidate.selectedModules) ||
    candidate.selectedModules.length !== 1
  ) {
    throw new Error(
      "Candidate port plan requires exactly one selected module.",
    );
  }
  const selected = candidate.selectedModules[0];
  if (
    selected === undefined ||
    typeof selected.path !== "string" ||
    !safeModulePath.test(selected.path) ||
    typeof selected.digest !== "string" ||
    !sha256Digest.test(selected.digest) ||
    (selected.symbol !== undefined &&
      (typeof selected.symbol !== "string" ||
        !safeSymbol.test(selected.symbol)))
  ) {
    throw new Error("Candidate port plan selected module is invalid.");
  }
  assertSafeCandidateText(selected.path);
  if (selected.symbol !== undefined) assertSafeCandidateText(selected.symbol);

  const module = candidate.completedEvidence.inventory.modules.find(
    (entry) =>
      entry.path === selected.path &&
      entry.sourceDigest === selected.digest &&
      entry.parseStatus === "parsed" &&
      !entry.generated &&
      !entry.binary &&
      !entry.dynamicEvaluation &&
      !entry.dynamicLoad &&
      !entry.processAccess &&
      !entry.filesystemAccess &&
      !entry.networkAccess,
  );
  if (module === undefined) {
    throw new Error(
      "Candidate port plan selected module is absent from completed safe evidence.",
    );
  }
  if (
    selected.symbol !== undefined &&
    !module.symbols.includes(selected.symbol)
  ) {
    throw new Error(
      "Candidate port plan selected symbol is absent from completed evidence.",
    );
  }
  return Object.freeze({
    path: selected.path,
    ...(selected.symbol === undefined ? {} : { symbol: selected.symbol }),
    digest: selected.digest,
  });
}

/**
 * Plans, but never performs, a quarantined Candidate port. The returned
 * record is source-free and cannot promote a Candidate, mutate a Graph, or
 * create a package without subsequent independent approval and verification.
 */
export function createCandidatePortPlan(
  input: CreateCandidatePortPlanInputV1,
): CandidatePortPlanV1 {
  assertCandidateIdentity(input);
  const selectedModule = selectEvidenceModule(input.candidate);
  const reuseMode =
    reuseModeByClassification[input.candidate.proposedClassification];
  if (reuseMode === undefined) {
    throw new Error("Candidate port plan classification is unsupported.");
  }
  return Object.freeze({
    apiVersion: "factory.candidate-port-plan/v1",
    candidate: Object.freeze({
      id: input.candidate.id,
      version: input.candidate.version,
    }),
    reuseMode,
    targetCapability: input.candidate.proposedFactoryKey,
    selectedModule,
    requiredEvidence,
  });
}
