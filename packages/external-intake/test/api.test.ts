import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createExternalIntakeApi } from "../src/api.js";
import { digestBytes } from "../src/canonical.js";
import type { EvidenceBundleV1, IntakeRequestV1 } from "../src/contracts.js";
import { ExternalIntakeStore } from "../src/store.js";

const roots: string[] = [];
const createdAt = "2026-07-31T06:00:00.000Z";

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

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("External Intake module API", () => {
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
