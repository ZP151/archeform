import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generateApplicationBundle } from "../../compiler/src/index.js";
import { parseApplicationGraph } from "../../graph/src/index.js";
import { resolveCapabilityAssetLock } from "../../capabilities/src/index.js";

import {
  ExternalIntakeStore,
  createExternalIntakeApi,
  parseCandidateCapability,
  verifyPromotionPacket,
} from "../src/index.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const digest = `sha256:${"a".repeat(64)}`;

function candidateArtifact(): unknown {
  return {
    apiVersion: "factory.candidate-capability/v1",
    createdAt: "2026-07-31T13:00:00.000Z",
    producerVersion: "0.1.0",
    parentDigests: [digest],
    id: "fixture-candidate",
    version: "1.0.0",
    status: "quarantined",
    sourceSnapshotDigest: digest,
    evidenceDigest: digest,
    proposedFactoryKey: "candidate.fixture",
    proposedClassification: "provider-adapter",
    selectedModules: [
      {
        path: "src/fixture.ts",
        symbol: "fixture",
        digest,
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
    candidateManifestDigest: digest,
    fixtureDigest: digest,
    adapterDigest: digest,
  };
}

describe("External Intake release boundary", () => {
  it("keeps Candidate artifacts out of Golden, Graph, compiler, generated/runtime, and provider authorities", () => {
    const candidate = parseCandidateCapability(candidateArtifact());
    expect(candidate.status).toBe("quarantined");

    for (const prohibitedAuthority of [
      "goldenAsset",
      "graph",
      "compilerInput",
      "generatedRuntime",
      "provider",
      "approval",
      "copyExecution",
    ]) {
      expect(() =>
        parseCandidateCapability({
          ...candidate,
          [prohibitedAuthority]: { requested: true },
        }),
      ).toThrow();
    }

    expect(() => parseApplicationGraph(candidate)).toThrow();
    expect(() =>
      resolveCapabilityAssetLock({
        key: candidate.proposedFactoryKey,
        version: candidate.version,
        packageRoot: "ecosystem/intake/candidates/fixture-candidate/1.0.0",
        manifestDigest: candidate.candidateManifestDigest,
        lifecycle: "candidate",
      } as never),
    ).toThrow("does not match a registered Golden asset");
    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-fixture-candidate-1",
        graph: candidate as never,
      }),
    ).toThrow();
  });

  it("keeps pending review non-authoritative and rejects approval or copy execution commands", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-release-boundary-test-"));
    const api = createExternalIntakeApi(new ExternalIntakeStore(root), root);

    try {
      expect(Object.keys(api).sort()).toEqual([
        "candidateBlock",
        "candidateCreate",
        "candidateList",
        "candidateReject",
        "candidateShow",
        "candidateTest",
        "candidateVerify",
        "evidence",
        "promotionPacket",
        "status",
        "submitBatch",
        "verifyJob",
      ]);
      expect(
        verifyPromotionPacket({
          apiVersion: "factory.external-capability-promotion-packet/v1",
          decision: "approved",
        }).valid,
      ).toBe(false);
      expect(() =>
        api.submitBatch({
          apiVersion: "factory.external-intake-batch/v1",
          items: [],
          approval: "grant",
        }),
      ).toThrow("strict batch input");
      expect(() =>
        api.submitBatch({
          apiVersion: "factory.external-intake-batch/v1",
          items: [],
          copyExecution: "run",
        }),
      ).toThrow("strict batch input");
      await expect(api.candidateList({})).resolves.toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("preserves package-root and importer isolation outside the repository-local CLI", () => {
    const manifests = ["apps", "packages"].flatMap((area) =>
      readdirSync(join(workspaceRoot, area), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(workspaceRoot, area, entry.name, "package.json")),
    );
    const importers = manifests.filter((manifest) =>
      readFileSync(manifest, "utf8").includes("@factory/external-intake"),
    );

    expect(importers).toEqual([
      join(workspaceRoot, "apps", "intake-cli", "package.json"),
      join(workspaceRoot, "packages", "external-intake", "package.json"),
    ]);
    expect(
      readdirSync(join(workspaceRoot, "packages", "capabilities", "assets")),
    ).not.toContain("candidate");
  });
});
