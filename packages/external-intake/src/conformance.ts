import {
  canonicalJson,
  canonicalRecordDigest,
  digestBytes,
  type Sha256Digest,
} from "./canonical.js";
import {
  parseCandidateArtifacts,
  type CandidateArtifactsV1,
  type CandidateObjectSchemaV1,
} from "./candidates.js";
import {
  parseCandidateCapability,
  type CandidateCapabilityV1,
} from "./contracts.js";

export interface CandidateConformanceInputV1 {
  readonly candidate: CandidateCapabilityV1;
  readonly artifacts: CandidateArtifactsV1;
}

export interface CandidateConformanceCaseResultV1 {
  readonly id: string;
  readonly status: "pass" | "fail";
  readonly code: string;
}

export interface CandidateConformanceResultV1 {
  readonly apiVersion: "factory.candidate-conformance-result/v1";
  readonly candidateId: string;
  readonly candidateVersion: string;
  readonly candidateDigest: Sha256Digest;
  readonly manifestDigest: Sha256Digest;
  readonly fixtureDigest: Sha256Digest;
  readonly adapterDigest: Sha256Digest;
  readonly planDigest: Sha256Digest;
  readonly status: "pass" | "fail";
  readonly cases: readonly CandidateConformanceCaseResultV1[];
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function assertStrictInput(
  input: unknown,
): asserts input is CandidateConformanceInputV1 {
  if (
    !isPlainRecord(input) ||
    Object.keys(input).length !== 2 ||
    !Object.hasOwn(input, "candidate") ||
    !Object.hasOwn(input, "artifacts")
  ) {
    throw new TypeError(
      "Candidate conformance requires strict conformance input.",
    );
  }
}

function artifactDigest(input: unknown): Sha256Digest {
  return digestBytes(new TextEncoder().encode(canonicalJson(input)));
}

function validateObject(
  schema: CandidateObjectSchemaV1,
  input: Readonly<Record<string, unknown>>,
): boolean {
  const inputKeys = Object.keys(input);
  const declared = Object.keys(schema.properties);
  if (
    inputKeys.some((key) => !declared.includes(key)) ||
    schema.required.some((key) => !Object.hasOwn(input, key))
  ) {
    return false;
  }
  return inputKeys.every((key) => {
    const expected = schema.properties[key];
    const value = input[key];
    if (expected === undefined) return false;
    switch (expected.type) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && Number.isFinite(value);
      case "integer":
        return typeof value === "number" && Number.isInteger(value);
      case "boolean":
        return typeof value === "boolean";
    }
  });
}

function projectFixture(
  artifacts: CandidateArtifactsV1,
  input: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const output: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [target, source] of Object.entries(artifacts.adapter.projection)) {
    if (
      !Object.hasOwn(artifacts.manifest.outputSchema.properties, target) ||
      !Object.hasOwn(artifacts.manifest.inputSchema.properties, source)
    ) {
      throw new Error(
        "Candidate adapter projection contains an undeclared field.",
      );
    }
    output[target] = input[source];
  }
  return output;
}

export function evaluateCandidateConformance(
  input: CandidateConformanceInputV1,
): CandidateConformanceResultV1 {
  assertStrictInput(input);
  const candidate = parseCandidateCapability(input.candidate);
  if (
    candidate.status !== "quarantined" &&
    candidate.status !== "conformance-passed"
  ) {
    throw new Error("Only an active Candidate may run conformance.");
  }
  const artifacts = parseCandidateArtifacts(input.artifacts, candidate);
  const manifestDigest = artifactDigest(artifacts.manifest);
  const fixtureDigest = artifactDigest(artifacts.fixture);
  const adapterDigest = artifactDigest(artifacts.adapter);
  const planDigest = artifactDigest(artifacts.conformancePlan);
  if (
    candidate.candidateManifestDigest !== manifestDigest ||
    candidate.fixtureDigest !== fixtureDigest ||
    candidate.adapterDigest !== adapterDigest ||
    !candidate.parentDigests.includes(planDigest)
  ) {
    throw new Error(
      "Candidate conformance artifacts differ from immutable digests.",
    );
  }
  if (
    !validateObject(artifacts.manifest.inputSchema, artifacts.fixture.input) ||
    !validateObject(
      artifacts.manifest.outputSchema,
      artifacts.fixture.expectedOutput,
    )
  ) {
    throw new Error("Candidate fixture does not satisfy its declared schemas.");
  }
  const projected = projectFixture(artifacts, artifacts.fixture.input);
  if (!validateObject(artifacts.manifest.outputSchema, projected)) {
    throw new Error(
      "Candidate adapter output does not satisfy its declared schema.",
    );
  }
  const cases: CandidateConformanceCaseResultV1[] =
    artifacts.conformancePlan.cases.map((testCase) => {
      if (testCase.expectation === "accept-fixture") {
        const matches =
          canonicalJson(projected) ===
          canonicalJson(artifacts.fixture.expectedOutput);
        return {
          id: testCase.id,
          status: matches ? "pass" : "fail",
          code: matches
            ? "fixture-projection-matched"
            : "fixture-projection-drift",
        };
      }
      const rejected = !validateObject(
        artifacts.manifest.inputSchema,
        testCase.input!,
      );
      return {
        id: testCase.id,
        status: rejected ? "pass" : "fail",
        code: rejected ? "invalid-input-rejected" : "invalid-input-accepted",
      };
    });
  return {
    apiVersion: "factory.candidate-conformance-result/v1",
    candidateId: candidate.id,
    candidateVersion: candidate.version,
    candidateDigest: canonicalRecordDigest(candidate),
    manifestDigest,
    fixtureDigest,
    adapterDigest,
    planDigest,
    status: cases.every(({ status }) => status === "pass") ? "pass" : "fail",
    cases,
  };
}
