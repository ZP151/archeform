import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { canonicalRecordDigest } from "../src/canonical.js";
import type { IntakeRequestV1 } from "../src/contracts.js";
import { acquireSourceEvidence } from "../src/evidence.js";
import { createExternalSourceStudy } from "../src/source-study.js";
import type {
  FixedSourceClient,
  ResolvedSourceReferenceV1,
  SourceTreeEntryV1,
} from "../src/source-client.js";
import { ExternalIntakeStore } from "../src/store.js";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "public-source",
);
const roots: string[] = [];
const commit = "a".repeat(40);
const request: IntakeRequestV1 = {
  apiVersion: "factory.external-intake-request/v1",
  createdAt: "2026-07-31T00:00:00.000Z",
  producerVersion: "0.1.0",
  parentDigests: [],
  source: {
    canonicalRepositoryUrl: "https://github.com/example/project.git",
    requestedRef: "v1.2.3",
    expectedCommit: commit,
  },
  classification: "source-study",
  requestedModules: [{ path: "src/index.ts", symbol: "createApp" }],
  allowNetworkRetrieval: true,
};
const reference: ResolvedSourceReferenceV1 = {
  apiVersion: "factory.resolved-source-reference/v1",
  repositoryUrl: request.source.canonicalRepositoryUrl,
  requestedRef: request.source.requestedRef,
  resolvedCommit: commit,
  retrievedAt: "2026-07-31T01:02:03.000Z",
  archiveUrl: `https://codeload.github.com/example/project/tar.gz/${commit}`,
  treeUrl: `https://api.github.com/repos/example/project/git/trees/${commit}`,
  requiredNoticePaths: [],
};

function bytes(name: string): Uint8Array {
  return readFileSync(join(fixtureRoot, name));
}

class EvidenceFixtureClient implements FixedSourceClient {
  async resolve(): Promise<ResolvedSourceReferenceV1> {
    return reference;
  }

  async fetchArchive(): Promise<Uint8Array> {
    return bytes("archive.fixture");
  }

  async fetchTree(): Promise<SourceTreeEntryV1[]> {
    return JSON.parse(
      readFileSync(join(fixtureRoot, "tree.json"), "utf8"),
    ) as SourceTreeEntryV1[];
  }

  async fetchEvidence(
    _reference: ResolvedSourceReferenceV1,
    path: string,
  ): Promise<Uint8Array> {
    return bytes(path);
  }
}

function tempStore(): ExternalIntakeStore {
  const root = mkdtempSync(join(tmpdir(), "factory-source-study-"));
  roots.push(root);
  return new ExternalIntakeStore(root);
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("ExternalSourceStudy", () => {
  it("projects deterministic metadata without source details", async () => {
    const store = tempStore();
    const acquired = await acquireSourceEvidence(
      request,
      new EvidenceFixtureClient(),
      store,
    );

    const study = createExternalSourceStudy(
      {
        request: {
          kind: "request",
          digest: canonicalRecordDigest(request),
        },
        snapshot: acquired.snapshot,
        acquisition: acquired.acquisition,
      },
      store,
    );

    expect(study).toEqual({
      apiVersion: "factory.external-source-study/v1",
      acquisitionDigest: acquired.acquisition.digest,
      snapshotDigest: acquired.snapshot.digest,
      classification: "source-study",
      licence: { primaryPathCount: 1, noticeCount: 1 },
      requestedModuleCount: 1,
      status: "acquired-unreviewed",
    });
    expect(JSON.stringify(study)).not.toContain("github.com");
    expect(JSON.stringify(study)).not.toContain("src/index.ts");
  });

  it("rejects references that are not the acquisition parents", async () => {
    const store = tempStore();
    const acquired = await acquireSourceEvidence(
      request,
      new EvidenceFixtureClient(),
      store,
    );

    expect(() =>
      createExternalSourceStudy(
        {
          request: acquired.snapshot,
          snapshot: acquired.snapshot,
          acquisition: acquired.acquisition,
        },
        store,
      ),
    ).toThrow(/parent/i);
  });
});
