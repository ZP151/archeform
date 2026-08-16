import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { hashApplicationGraph, parseDiagnosis } from "@factory/graph";

import { diagnoseCompilation } from "../src/verifier/diagnosis.js";

const runId = "verify-01h3k6f";

function digestOf(label: string): string {
  return `sha256:${createHash("sha256").update(label).digest("hex")}`;
}

function validGraph() {
  return {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense approval",
    },
    page: { pages: [], navigation: [] },
    domain: {
      entities: [
        {
          key: "expense",
          label: "Expense",
          fields: [
            { key: "amount", type: "decimal", required: true },
            { key: "status", type: "enum", required: true },
          ],
          indexes: [],
        },
      ],
      relations: [],
    },
    policy: {
      roles: ["employee", "manager"],
      permissions: [],
    },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
  };
}

function validLock(graphChecksum: string) {
  return {
    apiVersion: "factory.composition/v1",
    applicationGraphChecksum: graphChecksum,
    packages: [],
    resolvedContributionDigests: [],
    providedAndRequiredInterfaces: [],
    targetRuntimeInterfaceVersions: [],
    resolvedDependencyOrder: [],
    lockDigest: digestOf("lock"),
  };
}

function validEvidence() {
  return {
    apiVersion: "factory.verification-evidence/v1",
    verificationRunId: runId,
    compilationDigest: digestOf("compilation"),
    steps: [
      {
        stepId: "health",
        kind: "health",
        status: "failed",
        failureCode: "health.unreachable",
        summary: "Health endpoint did not respond.",
        durationMs: 40,
      },
      {
        stepId: "cleanup",
        kind: "cleanup",
        status: "passed",
        summary: "Stopped the preview and removed its resources.",
        durationMs: 20,
      },
    ],
    cleanup: {
      succeeded: true,
      summary: "Stopped the preview and removed its resources.",
    },
    artifactDigests: [{ path: "docker-compose.yml", digest: digestOf("c") }],
    completedAt: "2026-08-06T12:00:00.000Z",
  };
}

describe("diagnoseCompilation", () => {
  it("parses raw evidence, graph, and lock at the worker boundary and returns a contract diagnosis", () => {
    const graph = validGraph();
    const diagnosis = diagnoseCompilation(
      validEvidence(),
      graph,
      validLock(hashApplicationGraph(graph)),
    );

    expect(diagnosis.verificationRunId).toBe(runId);
    expect(diagnosis.category).toBe("runtime");
    expect(diagnosis.draftDiff).toBeNull();
    expect(parseDiagnosis(diagnosis)).toEqual(diagnosis);
  });

  it("rejects malformed evidence before diagnosing", () => {
    const graph = validGraph();
    expect(() =>
      diagnoseCompilation(
        { steps: [] },
        graph,
        validLock(hashApplicationGraph(graph)),
      ),
    ).toThrow();
  });

  it("rejects a graph that fails validation", () => {
    const graph = validGraph();
    const broken = {
      ...graph,
      metadata: { ...graph.metadata, id: "Bad ID" },
    };
    expect(() =>
      diagnoseCompilation(
        validEvidence(),
        broken,
        validLock(hashApplicationGraph(graph)),
      ),
    ).toThrow();
  });

  it("rejects a draft-shaped snapshot at the worker boundary", () => {
    const graph = validGraph();
    expect(() =>
      diagnoseCompilation(
        validEvidence(),
        { id: "draft-expense-approval", status: "draft", revision: 1, graph },
        validLock(hashApplicationGraph(graph)),
      ),
    ).toThrow(/Published Graph/i);
  });
});
