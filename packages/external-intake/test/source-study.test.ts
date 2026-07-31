import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { canonicalRecordDigest } from "../src/canonical.js";
import type { IntakeRequestV1, SourceSnapshotV1 } from "../src/contracts.js";
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
  constructor(private readonly resolved = reference) {}

  async resolve(): Promise<ResolvedSourceReferenceV1> {
    return this.resolved;
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

  it("rejects source-study references with invalid record kinds", async () => {
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
    ).toThrow();
  });

  it("rejects a type-correct acquisition from another fixed source", async () => {
    const store = tempStore();
    const acquired = await acquireSourceEvidence(
      request,
      new EvidenceFixtureClient(),
      store,
    );
    const otherCommit = "b".repeat(40);
    const otherRequest: IntakeRequestV1 = {
      ...request,
      source: {
        canonicalRepositoryUrl: "https://github.com/example/other-project.git",
        requestedRef: "v2.0.0",
        expectedCommit: otherCommit,
      },
    };
    const other = await acquireSourceEvidence(
      otherRequest,
      new EvidenceFixtureClient({
        ...reference,
        repositoryUrl: otherRequest.source.canonicalRepositoryUrl,
        requestedRef: otherRequest.source.requestedRef,
        resolvedCommit: otherCommit,
        archiveUrl: `https://codeload.github.com/example/other-project/tar.gz/${otherCommit}`,
        treeUrl: `https://api.github.com/repos/example/other-project/git/trees/${otherCommit}`,
      }),
      store,
    );

    expect(() =>
      createExternalSourceStudy(
        {
          request: {
            kind: "request",
            digest: canonicalRecordDigest(request),
          },
          snapshot: acquired.snapshot,
          acquisition: other.acquisition,
        },
        store,
      ),
    ).toThrow(/relationship/i);
  });

  it("rejects a snapshot with an undeclared additional source-study parent", async () => {
    const store = tempStore();
    const acquired = await acquireSourceEvidence(
      request,
      new EvidenceFixtureClient(),
      store,
    );
    const persistedSnapshot = store.getRecord(
      acquired.snapshot,
    ) as SourceSnapshotV1;
    const storeWithAmbiguousSnapshot = {
      getRecord(ref: Parameters<ExternalIntakeStore["getRecord"]>[0]) {
        return ref.kind === "snapshot"
          ? {
              ...persistedSnapshot,
              parentDigests: [
                canonicalRecordDigest(request),
                `sha256:${"f".repeat(64)}`,
              ],
            }
          : store.getRecord(ref);
      },
    } as unknown as ExternalIntakeStore;

    expect(() =>
      createExternalSourceStudy(
        {
          request: {
            kind: "request",
            digest: canonicalRecordDigest(request),
          },
          snapshot: acquired.snapshot,
          acquisition: acquired.acquisition,
        },
        storeWithAmbiguousSnapshot,
      ),
    ).toThrow(/parent/i);
  });

  it.each(["sourceText", "command", "credential"])(
    "rejects forbidden source-study input field %s at runtime",
    async (forbiddenField) => {
      const store = tempStore();
      const acquired = await acquireSourceEvidence(
        request,
        new EvidenceFixtureClient(),
        store,
      );

      expect(() =>
        createExternalSourceStudy(
          {
            request: {
              kind: "request",
              digest: canonicalRecordDigest(request),
            },
            snapshot: acquired.snapshot,
            acquisition: acquired.acquisition,
            [forbiddenField]: "must-not-be-accepted",
          } as unknown as Parameters<typeof createExternalSourceStudy>[0],
          store,
        ),
      ).toThrow();
    },
  );
});
