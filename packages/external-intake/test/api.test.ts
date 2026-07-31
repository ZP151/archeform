import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createExternalIntakeApi } from "../src/api.js";
import { digestBytes, type Sha256Digest } from "../src/canonical.js";
import type { EvidenceBundleV1, IntakeRequestV1 } from "../src/contracts.js";
import { acquireSourceEvidence } from "../src/evidence.js";
import { runEvidencePipeline, type IntakeJobV1 } from "../src/jobs.js";
import {
  PINNED_MODULE_INVENTORY_IDENTITY,
  type ModuleInventoryAdapterV1,
} from "../src/module-inventory.js";
import { loadExternalPortfolio } from "../src/portfolio.js";
import {
  PINNED_SCANNER_IDENTITIES,
  type LocalScannerV1,
  type NormalizedScanResultV1,
  type ScanKindV1,
} from "../src/scans.js";
import { canonicalTreeDigest } from "../src/snapshot.js";
import type {
  FixedSourceClient,
  ResolvedSourceReferenceV1,
  SourceTreeEntryV1,
} from "../src/source-client.js";
import { ExternalIntakeStore } from "../src/store.js";

const roots: string[] = [];
const createdAt = "2026-07-31T06:00:00.000Z";
const commit = "a".repeat(40);
const encoder = new TextEncoder();

function bytes(value: string): Uint8Array {
  return encoder.encode(value);
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-intake-api-test-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

function request(id: string): IntakeRequestV1 {
  return {
    apiVersion: "factory.external-intake-request/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [],
    source: {
      canonicalRepositoryUrl: `https://github.com/example/${id}.git`,
      requestedRef: "v1.0.0",
      expectedCommit: "a".repeat(40),
    },
    classification: "provider",
    requestedModules: [{ path: "src/index.ts" }],
    allowNetworkRetrieval: true,
  };
}

function successfulScan(kind: ScanKindV1): NormalizedScanResultV1 {
  const report = bytes(
    JSON.stringify({
      status: "pass",
      findings: [],
      ...(kind === "licence" ? { expression: "MIT" } : {}),
    }),
  );
  const sbom = bytes(
    JSON.stringify({
      $schema: "http://cyclonedx.org/schema/bom-1.6.schema.json",
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: 1,
      components: [],
    }),
  );
  return {
    kind,
    ...PINNED_SCANNER_IDENTITIES[kind],
    status: "pass",
    findings: [],
    report,
    reportDigest: digestBytes(report),
    ...(kind === "licence" ? { scannerExpression: "MIT" } : {}),
    ...(kind === "dependency"
      ? {
          sbom: {
            format: "CycloneDX" as const,
            components: 0,
            report: sbom,
            reportDigest: digestBytes(sbom),
          },
        }
      : {}),
  };
}

async function createCompletedMedusaInput(store: ExternalIntakeStore) {
  const portfolio = loadExternalPortfolio(
    fileURLToPath(
      new URL(
        "../../../ecosystem/portfolio/2026-07-30-external-business-logic.json",
        import.meta.url,
      ),
    ),
  );
  const source = portfolio.sources.find(({ id }) => id === "medusa")!;
  const resolvedCommit = source.fixedRef;
  const sourceBytes = bytes("export const provider = true;");
  const sourceDigest = digestBytes(sourceBytes);
  const licenceBytes = bytes("MIT License");
  const request: IntakeRequestV1 = {
    apiVersion: "factory.external-intake-request/v1",
    createdAt,
    producerVersion: "1.0.0",
    parentDigests: [],
    source: {
      canonicalRepositoryUrl: source.canonicalRepositoryUrl,
      requestedRef: source.fixedRef,
      expectedCommit: resolvedCommit,
      portfolioRecord: source.id,
    },
    classification: "provider",
    requestedModules: [],
    allowNetworkRetrieval: true,
  };
  const requestRef = store.putRecord("request", request);
  const tree: SourceTreeEntryV1[] = [
    {
      path: "LICENSE",
      mode: "100644",
      type: "blob",
      size: licenceBytes.byteLength,
      blobDigest: digestBytes(licenceBytes),
    },
    {
      path: "src/provider.ts",
      mode: "100644",
      type: "blob",
      size: sourceBytes.byteLength,
      blobDigest: sourceDigest,
    },
  ];
  const reference: ResolvedSourceReferenceV1 = {
    apiVersion: "factory.resolved-source-reference/v1",
    repositoryUrl: source.canonicalRepositoryUrl,
    requestedRef: source.fixedRef,
    resolvedCommit,
    retrievedAt: createdAt,
    archiveUrl: `https://codeload.github.com/medusajs/medusa/tar.gz/${resolvedCommit}`,
    treeUrl: `https://api.github.com/repos/medusajs/medusa/git/trees/${resolvedCommit}`,
    requiredNoticePaths: [],
  };
  const client: FixedSourceClient = {
    async resolve() {
      return reference;
    },
    async fetchArchive() {
      return bytes("medusa-candidate-archive");
    },
    async fetchTree() {
      return tree;
    },
    async fetchEvidence(_reference, path) {
      if (path === "LICENSE") return licenceBytes;
      throw new Error("Unexpected evidence path.");
    },
  };
  const acquired = await acquireSourceEvidence(request, client, store);
  const evidenceJob: IntakeJobV1 = {
    apiVersion: "factory.external-evidence-job/v1",
    id: "medusa-source",
    createdAt,
    producerVersion: "1.0.0",
    snapshot: acquired.snapshot,
    acquisition: acquired.acquisition,
    snapshotView: {
      snapshotDigest: acquired.snapshot.digest,
      treeDigest: canonicalTreeDigest(tree),
      files: [
        {
          path: "LICENSE",
          mode: "100644",
          digest: digestBytes(licenceBytes),
          content: licenceBytes,
        },
        {
          path: "src/provider.ts",
          mode: "100644",
          digest: sourceDigest,
          content: sourceBytes,
        },
      ],
    },
  };
  const scanners: LocalScannerV1[] = (
    ["dependency", "secret", "licence", "sast"] as const
  ).map((kind) => ({
    kind,
    ...PINNED_SCANNER_IDENTITIES[kind],
    async scan() {
      return successfulScan(kind);
    },
  }));
  const inventory: ModuleInventoryAdapterV1 = {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    async inventory() {
      const report = bytes("medusa-module-inventory");
      return {
        ...PINNED_MODULE_INVENTORY_IDENTITY,
        status: "pass" as const,
        report,
        reportDigest: digestBytes(report),
        modules: [
          {
            path: "src/provider.ts",
            symbols: ["provider"],
            imports: [],
            exports: ["provider"],
            dependencies: [],
            size: sourceBytes.byteLength,
            noticeMarker: false,
            generated: false,
            binary: false,
            sourceDigest,
            dynamicEvaluation: false,
            dynamicLoad: false,
            processAccess: false,
            filesystemAccess: false,
            networkAccess: false,
            parseStatus: "parsed" as const,
          },
        ],
      };
    },
  };
  const completedEvidence = await runEvidencePipeline(
    evidenceJob,
    scanners,
    inventory,
    store,
  );

  return {
    portfolio,
    sourceId: source.id,
    createdAt,
    producerVersion: "1.0.0",
    request: requestRef,
    snapshot: acquired.snapshot,
    acquisition: acquired.acquisition,
    evidenceJob,
    completedEvidence,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("External Intake module API", () => {
  it("exposes Candidate listing as an asynchronous verified boundary", async () => {
    const { root, store } = tempStore();
    const api = createExternalIntakeApi(store, root);

    expect(api.candidateList({})).toBeInstanceOf(Promise);
    await expect(api.candidateList({})).resolves.toEqual([]);
  });

  it("routes Portfolio Candidate creation through the internal quarantine boundary", async () => {
    const { root, store } = tempStore();
    const api = createExternalIntakeApi(store, root);
    const portfolio = loadExternalPortfolio(
      fileURLToPath(
        new URL(
          "../../../ecosystem/portfolio/2026-07-30-external-business-logic.json",
          import.meta.url,
        ),
      ),
    );

    await expect(
      api.portfolioCandidateCreate({
        portfolio,
        sourceId: "opensourcepos",
      } as never),
    ).rejects.toThrow(/policy-only/i);
  });

  it("stores a verified Portfolio Candidate only in quarantined state", async () => {
    const { root, store } = tempStore();
    const api = createExternalIntakeApi(store, root);
    const input = await createCompletedMedusaInput(store);

    const ref = await api.portfolioCandidateCreate(input);

    expect(ref).toMatchObject({
      kind: "candidate",
      id: "medusa-provider",
      version: "0.1.0",
      status: "quarantined",
    });
    await expect(api.candidateList({ status: "quarantined" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          proposedFactoryKey: "candidate.commerce.medusa-provider",
        }),
      ]),
    );
  });

  it("submits local batch data as independent immutable request items", () => {
    const { root, store } = tempStore();
    const api = createExternalIntakeApi(store, root);

    const result = api.submitBatch({
      apiVersion: "factory.external-intake-batch/v1",
      items: [
        { id: "safe-source", request: request("safe-source") },
        {
          id: "invalid-source",
          request: {
            ...request("invalid-source"),
            allowNetworkRetrieval: false,
          },
        },
      ],
    });

    expect(result.byId["safe-source"]).toMatchObject({
      status: "requested",
      request: { kind: "request" },
    });
    expect(result.byId["invalid-source"]).toEqual({
      status: "blocked",
      failureCode: "invalid-intake-request",
    });
    expect(api.status("safe-source")).toEqual({
      id: "safe-source",
      status: "requested",
      producerVersion: "0.1.0",
      recordDigests: [result.byId["safe-source"]!.request!.digest],
    });
    const lookupId = result.byId["safe-source"]!.lookupId!;
    expect(lookupId).toMatch(/^job-[a-f0-9]{64}$/u);
    expect(createExternalIntakeApi(store, root).status(lookupId)).toEqual({
      id: "safe-source",
      status: "requested",
      producerVersion: "0.1.0",
      recordDigests: [result.byId["safe-source"]!.request!.digest],
    });
  });

  it("returns evidence metadata without source, findings, or report bytes", () => {
    const { root, store } = tempStore();
    const api = createExternalIntakeApi(store, root);
    const snapshotDigest = digestBytes(new TextEncoder().encode("snapshot"));
    const resultDigest = digestBytes(new TextEncoder().encode("scan"));
    const evidence: EvidenceBundleV1 = {
      apiVersion: "factory.external-evidence/v1",
      createdAt,
      producerVersion: "0.1.0",
      parentDigests: [snapshotDigest, resultDigest],
      snapshotDigest,
      licence: {
        primaryPaths: ["LICENSE"],
        textDigests: [digestBytes(new TextEncoder().encode("MIT"))],
        manualStatus: "unreviewed",
      },
      notices: [],
      sbom: { format: "CycloneDX", digest: resultDigest, components: 0 },
      scans: (["licence", "secret", "sast", "dependency"] as const).map(
        (kind) => ({
          kind,
          tool: `factory-${kind}-scanner`,
          toolVersion: "1.0.0",
          rulesetDigest: resultDigest,
          resultDigest,
          status: "pass" as const,
        }),
      ),
      ast: {
        parser: "factory-typescript-module-locator",
        parserVersion: "1.0.0",
        inventoryDigest: resultDigest,
      },
    };
    const ref = store.putRecord("evidence", evidence);

    const shown = api.evidence(ref.digest);

    expect(shown).toEqual({
      apiVersion: "factory.external-evidence-summary/v1",
      digest: ref.digest,
      snapshotDigest,
      producerVersion: "0.1.0",
      licence: {
        manualStatus: "unreviewed",
        primaryPathCount: 1,
        noticeCount: 0,
      },
      sbom: { format: "CycloneDX", digest: resultDigest, components: 0 },
      scans: evidence.scans,
      ast: evidence.ast,
    });
    expect(JSON.stringify(shown)).not.toMatch(
      /source|finding|report|secret-match/iu,
    );
  });

  it.each([
    ["Graph payload", { apiVersion: "factory.application-graph/v1" }],
    [
      "promotion command",
      { apiVersion: "factory.external-capability-promotion/v1" },
    ],
    [
      "arbitrary path",
      {
        apiVersion: "factory.external-intake-batch/v1",
        items: [
          { id: "unsafe", request: request("unsafe"), outputPath: "../out" },
        ],
      },
    ],
  ])("rejects %s at the module API boundary", (_, input) => {
    const { root, store } = tempStore();
    const api = createExternalIntakeApi(store, root);

    expect(() => api.submitBatch(input as never)).toThrow("strict batch input");
  });
});
