import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generateApplicationBundle } from "../../compiler/src/index.js";
import {
  hashApplicationGraph,
  parseApplicationGraph,
} from "../../graph/src/index.js";
import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
  resolveCapabilityAssetLock,
} from "../../capabilities/src/index.js";

import {
  ExternalIntakeStore,
  canonicalRecordDigest,
  createExternalIntakeApi,
  parseCandidateCapability,
  parsePromotionDecision,
  verifyPromotionPacket,
} from "../src/index.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const digest = `sha256:${"a".repeat(64)}`;

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:[cm]?[jt]sx?|json)$/u.test(entry.name) ? [path] : [];
  });
}

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

function validPendingReviewPacket() {
  const packetDigest = (character: string) =>
    `sha256:${character.repeat(64)}` as const;
  const candidateManifest = {
    apiVersion: "factory.candidate-manifest/v1" as const,
    id: "fixture-candidate",
    version: "1.0.0",
    proposedFactoryKey: "candidate.fixture",
    inputSchema: {
      type: "object" as const,
      properties: { message: { type: "string" as const } },
      required: ["message"],
      additionalProperties: false as const,
    },
    outputSchema: {
      type: "object" as const,
      properties: { message: { type: "string" as const } },
      required: ["message"],
      additionalProperties: false as const,
    },
    effects: ["candidate.project"],
  };
  return {
    apiVersion: "factory.external-capability-promotion-packet/v1" as const,
    decision: "pending-review" as const,
    candidate: {
      id: "fixture-candidate",
      version: "1.0.0",
      digest: packetDigest("a"),
      status: "conformance-passed" as const,
    },
    candidateManifest,
    factoryProposal: {
      apiVersion: "factory.external-factory-interface-proposal/v1" as const,
      reviewStatus: "pending-manual-review" as const,
      key: "integration.fixture",
      version: "1.0.0",
      packageRoot: "packages/capabilities/assets/fixture/1.0.0",
      targets: ["api"],
      candidate: {
        id: "fixture-candidate",
        version: "1.0.0",
        digest: packetDigest("a"),
        classification: "provider-adapter" as const,
        manifestDigest: canonicalRecordDigest(candidateManifest),
      },
      operations: [
        {
          candidateEffect: "candidate.project",
          factoryOperation: "fixture.project",
        },
      ],
      interface: {
        inputSchema: candidateManifest.inputSchema,
        outputSchema: candidateManifest.outputSchema,
      },
    },
    source: {
      repositoryUrl: "https://github.com/example/fixture.git",
      resolvedCommit: "a".repeat(40),
      snapshotDigest: packetDigest("b"),
    },
    evidenceDigest: packetDigest("c"),
    conformanceDigest: packetDigest("d"),
    reviewInputDigest: packetDigest("e"),
    parentDigests: [
      packetDigest("a"),
      packetDigest("b"),
      packetDigest("c"),
      packetDigest("d"),
      packetDigest("e"),
      packetDigest("f"),
    ].sort(),
    licence: {
      manualStatus: "unreviewed" as const,
      reviewStatus: "pending-manual-review" as const,
    },
    findingDispositions: (
      ["licence", "secret", "sast", "dependency"] as const
    ).map((kind, index) => ({
      kind,
      resultDigest: packetDigest(String(index + 1)),
      findings: [],
    })),
    sourceCopy: { mode: "none" as const, modules: [] },
    notices: {
      destination: "docs/third-party-notices.md",
      action: "pending-manual-review" as const,
    },
    reviewers: [
      "intake-maintainer",
      "licence-reviewer",
      "security-reviewer",
      "capability-maintainer",
      "architecture-owner",
      "qa-owner",
      "golden-owner",
    ].map((role) => ({
      role,
      reviewer: `${role}-alice`,
      status: "assigned-not-reviewed" as const,
    })),
    removalPlan: {
      packageRoot: "packages/capabilities/assets/fixture/1.0.0",
      replacement: "factory-native-fixture",
      steps: ["remove-package", "remove-target-bindings", "run-regressions"],
    },
    collision: {
      inventoryDigest: packetDigest("f"),
      result: "no-collision-observed-in-inventory" as const,
      goldenOwnerAction: "pending-manual-review" as const,
    },
    prohibitedFields: [
      "approval",
      "waiver",
      "source-copy-execution",
      "notice-modification",
      "golden-registration",
      "graph-input",
      "asset-lock-input",
      "composition-lock-input",
      "compiler-input",
      "runtime-activation",
      "provider-activation",
    ] as const,
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
      const packet = validPendingReviewPacket();
      const before = JSON.stringify(packet);
      expect(verifyPromotionPacket(packet).valid).toBe(true);
      expect(packet.decision).toBe("pending-review");
      expect(packet.sourceCopy).toEqual({ mode: "none", modules: [] });
      expect(packet.prohibitedFields).toEqual([
        "approval",
        "waiver",
        "source-copy-execution",
        "notice-modification",
        "golden-registration",
        "graph-input",
        "asset-lock-input",
        "composition-lock-input",
        "compiler-input",
        "runtime-activation",
        "provider-activation",
      ]);
      expect(() => resolveCapabilityAssetLock(packet as never)).toThrow();
      expect(() => parseApplicationGraph(packet)).toThrow();
      expect(() =>
        generateApplicationBundle({
          publishedRevisionId: "published-pending-review-packet-1",
          graph: packet as never,
        }),
      ).toThrow();
      expect(() => parsePromotionDecision(packet)).toThrow();
      expect(JSON.stringify(packet)).toBe(before);

      expect(Object.keys(api).sort()).toEqual([
        "candidateBlock",
        "candidateCreate",
        "candidateList",
        "candidateReject",
        "candidateShow",
        "candidateTest",
        "candidateVerify",
        "evidence",
        "portfolioCandidateCreate",
        "portfolioCandidateCreateBatch",
        "promotionPacket",
        "status",
        "submitBatch",
        "verifyJob",
      ]);
      expect(() => api.submitBatch(packet)).toThrow("strict batch input");
      await expect(api.portfolioCandidateCreateBatch(packet)).rejects.toThrow(
        "strict input",
      );
      await expect(api.candidateCreate(packet as never)).rejects.toThrow(
        "Candidate identity and version must be opaque",
      );
      await expect(api.candidateList({})).resolves.toEqual([]);
      expect(JSON.stringify(packet)).toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("permits external-intake dependencies only in quarantine tooling, never Graph, Golden, provider, compiler, runtime, Control Plane, or Worker packages", () => {
    const manifests = ["apps", "packages"].flatMap((area) =>
      readdirSync(join(workspaceRoot, area), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(workspaceRoot, area, entry.name, "package.json"))
        .filter((manifest) => existsSync(manifest)),
    );
    const importers = manifests.filter((manifest) =>
      readFileSync(manifest, "utf8").includes("@factory/external-intake"),
    );

    expect(importers).toEqual([
      join(workspaceRoot, "apps", "intake-cli", "package.json"),
      join(workspaceRoot, "packages", "external-intake", "package.json"),
    ]);
    for (const importer of [
      join(workspaceRoot, "apps", "control-plane", "package.json"),
      join(workspaceRoot, "apps", "compiler-worker", "package.json"),
      join(workspaceRoot, "apps", "workbench", "package.json"),
      join(workspaceRoot, "packages", "capabilities", "package.json"),
      join(workspaceRoot, "packages", "compiler", "package.json"),
      join(workspaceRoot, "packages", "graph", "package.json"),
    ]) {
      const manifest = JSON.parse(readFileSync(importer, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      expect(
        manifest.dependencies?.["@factory/external-intake"],
      ).toBeUndefined();
      expect(
        manifest.devDependencies?.["@factory/external-intake"],
      ).toBeUndefined();
    }
    expect(
      readdirSync(join(workspaceRoot, "packages", "capabilities", "assets")),
    ).not.toContain("candidate");

    const prohibitedRuntimeRoots = [
      join(workspaceRoot, "apps", "control-plane", "src"),
      join(workspaceRoot, "apps", "compiler-worker", "src"),
      join(workspaceRoot, "apps", "workbench", "app"),
      join(workspaceRoot, "apps", "workbench", "components"),
      join(workspaceRoot, "apps", "workbench", "lib"),
      join(workspaceRoot, "packages", "capabilities", "src"),
      join(workspaceRoot, "packages", "capabilities", "assets"),
      join(workspaceRoot, "packages", "compiler", "src"),
      join(workspaceRoot, "packages", "graph", "src"),
    ];
    for (const source of prohibitedRuntimeRoots.flatMap(sourceFiles)) {
      expect(readFileSync(source, "utf8")).not.toMatch(
        /(?:@factory\/external-intake|external-intake(?:[/\\]|["'`]))/u,
      );
    }

    const composed = composeDefaultCapabilityDraft({
      profile: "expense-approval",
    });
    const generated = generateApplicationBundle({
      publishedRevisionId: "published-release-boundary-1",
      graph: composed.graph,
      compositionLock: createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(composed.graph),
        selections: composed.graph.integration.compositionSelections ?? [],
      }),
    });
    for (const file of generated.files) {
      expect(file.content).not.toContain("@factory/external-intake");
      expect(file.content).not.toMatch(/external-intake(?:[/\\]|["'`])/u);
    }
  });
});
