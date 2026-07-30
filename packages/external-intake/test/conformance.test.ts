import { describe, expect, it } from "vitest";

import { canonicalJson, digestBytes } from "../src/canonical.js";
import {
  evaluateCandidateConformance,
  type CandidateConformanceInputV1,
} from "../src/conformance.js";

function safeInput(): CandidateConformanceInputV1 {
  const artifacts: CandidateConformanceInputV1["artifacts"] = {
    manifest: {
      apiVersion: "factory.candidate-manifest/v1",
      id: "safe-adapter",
      version: "1.0.0",
      proposedFactoryKey: "candidate.safe-adapter",
      inputSchema: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
        additionalProperties: false,
      },
      outputSchema: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
        additionalProperties: false,
      },
      effects: ["candidate.project"],
    },
    fixture: {
      apiVersion: "factory.candidate-fixture/v1",
      id: "safe-fixture",
      input: { message: "hello" },
      expectedOutput: { message: "hello" },
    },
    adapter: {
      apiVersion: "factory.candidate-adapter/v1",
      id: "safe-adapter",
      projection: { message: "message" },
      effects: ["candidate.project"],
    },
    conformancePlan: {
      apiVersion: "factory.candidate-conformance-plan/v1",
      cases: [
        { id: "accept-safe-fixture", expectation: "accept-fixture" },
        {
          id: "reject-unknown-field",
          expectation: "reject-input",
          input: { message: "hello", extra: "blocked" },
        },
      ],
    },
  };
  const digest = (value: unknown) =>
    digestBytes(new TextEncoder().encode(canonicalJson(value)));
  const planDigest = digest(artifacts.conformancePlan);
  return {
    candidate: {
      apiVersion: "factory.candidate-capability/v1",
      createdAt: "2026-07-31T05:00:00.000Z",
      producerVersion: "0.1.0",
      parentDigests: [
        `sha256:${"a".repeat(64)}`,
        `sha256:${"b".repeat(64)}`,
        planDigest,
      ],
      id: "safe-adapter",
      version: "1.0.0",
      status: "quarantined",
      sourceSnapshotDigest: `sha256:${"a".repeat(64)}`,
      evidenceDigest: `sha256:${"b".repeat(64)}`,
      proposedFactoryKey: "candidate.safe-adapter",
      proposedClassification: "provider-adapter",
      selectedModules: [
        {
          path: "src/index.ts",
          symbol: "safe",
          digest: `sha256:${"c".repeat(64)}`,
          purpose: "adapter-contract",
        },
      ],
      allowedOutputs: ["manifest", "fixture", "adapter", "conformance-plan"],
      prohibited: [
        "capability-selection",
        "golden-registration",
        "graph-mutation",
        "compilation",
      ],
      candidateManifestDigest: digest(artifacts.manifest),
      fixtureDigest: digest(artifacts.fixture),
      adapterDigest: digest(artifacts.adapter),
    },
    artifacts,
  };
}

describe("Candidate conformance", () => {
  it("passes only deterministic declarative fixture projection and schema rejection", () => {
    const input = safeInput();

    const first = evaluateCandidateConformance(input);
    const second = evaluateCandidateConformance(structuredClone(input));

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      apiVersion: "factory.candidate-conformance-result/v1",
      candidateId: "safe-adapter",
      candidateVersion: "1.0.0",
      status: "pass",
      cases: [
        { id: "accept-safe-fixture", status: "pass" },
        { id: "reject-unknown-field", status: "pass" },
      ],
    });
    expect(first).not.toHaveProperty("source");
    expect(first).not.toHaveProperty("graph");
  });

  it.each([
    [
      "candidate identity drift",
      (input: CandidateConformanceInputV1) => ({
        ...input,
        artifacts: {
          ...input.artifacts,
          manifest: { ...input.artifacts.manifest, id: "other" },
        },
      }),
    ],
    [
      "unsafe adapter field path",
      (input: CandidateConformanceInputV1) => ({
        ...input,
        artifacts: {
          ...input.artifacts,
          adapter: {
            ...input.artifacts.adapter,
            projection: { message: "__proto__.polluted" },
          },
        },
      }),
    ],
    [
      "undeclared output",
      (input: CandidateConformanceInputV1) => ({
        ...input,
        artifacts: {
          ...input.artifacts,
          adapter: {
            ...input.artifacts.adapter,
            projection: { extra: "message" },
          },
        },
      }),
    ],
  ])("fails closed for %s", (_, mutate) => {
    expect(() =>
      evaluateCandidateConformance(
        mutate(safeInput()) as CandidateConformanceInputV1,
      ),
    ).toThrow();
  });

  it("does not expose filesystem, process, network, Graph, or runtime callbacks", () => {
    const input = safeInput() as unknown as Record<string, unknown>;
    for (const key of [
      "filesystem",
      "process",
      "network",
      "graph",
      "compiler",
      "runtime",
    ]) {
      input[key] = () => {
        throw new Error(`${key} callback must not run`);
      };
    }

    expect(() =>
      evaluateCandidateConformance(
        input as unknown as CandidateConformanceInputV1,
      ),
    ).toThrow("strict conformance input");
  });
});
