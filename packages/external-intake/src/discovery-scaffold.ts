import {
  createCandidatePortPlan,
  type CandidatePortPlanV1,
  type CreateCandidatePortPlanInputV1,
} from "./candidate-port-plan.js";

export interface CandidateFoundryScaffoldV1 {
  readonly apiVersion: "factory.candidate-foundry-scaffold/v1";
  readonly candidate: { readonly id: string; readonly version: string };
  readonly mode:
    "direct-dependency" | "provider-adapter" | "selective-source-copy";
  readonly targetCapability: string;
  readonly sourcePortPlan?: CandidatePortPlanV1;
  readonly requiredArtifacts: readonly [
    "manifest",
    "fixture",
    "adapter",
    "conformance-plan",
  ];
}

export type CreateCandidateFoundryScaffoldInputV1 =
  CreateCandidatePortPlanInputV1;

const requiredArtifacts = Object.freeze([
  "manifest",
  "fixture",
  "adapter",
  "conformance-plan",
] as const);

/**
 * Creates a declarative quarantine hand-off for an independently reviewed
 * Candidate. This record intentionally has no filesystem target, source body,
 * executable contribution, Graph authority, or promotion authority.
 */
export function createCandidateFoundryScaffold(
  input: CreateCandidateFoundryScaffoldInputV1,
): CandidateFoundryScaffoldV1 {
  const portPlan = createCandidatePortPlan(input);
  return Object.freeze({
    apiVersion: "factory.candidate-foundry-scaffold/v1",
    candidate: Object.freeze({ ...portPlan.candidate }),
    mode: portPlan.reuseMode,
    targetCapability: portPlan.targetCapability,
    ...(portPlan.reuseMode === "selective-source-copy"
      ? { sourcePortPlan: portPlan }
      : {}),
    requiredArtifacts,
  });
}
