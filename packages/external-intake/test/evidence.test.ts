import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { EvidenceBundleV1, IntakeRequestV1 } from "../src/contracts.js";
import { acquireSourceEvidence } from "../src/evidence.js";
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
  requestedModules: [],
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

function tree(): SourceTreeEntryV1[] {
  return JSON.parse(
    readFileSync(join(fixtureRoot, "tree.json"), "utf8"),
  ) as SourceTreeEntryV1[];
}

class EvidenceFixtureClient implements FixedSourceClient {
  constructor(
    readonly sourceTree = tree(),
    readonly resolved = reference,
    readonly evidence: Readonly<Record<string, Uint8Array | Error>> = {
      LICENSE: bytes("LICENSE"),
      NOTICE: bytes("NOTICE"),
    },
  ) {}

  async resolve(): Promise<ResolvedSourceReferenceV1> {
    return this.resolved;
  }

  async fetchArchive(): Promise<Uint8Array> {
    return bytes("archive.fixture");
  }

  async fetchTree(): Promise<SourceTreeEntryV1[]> {
    return this.sourceTree;
  }

  async fetchEvidence(
    _reference: ResolvedSourceReferenceV1,
    path: string,
  ): Promise<Uint8Array> {
    const result = this.evidence[path];
    if (result instanceof Error) {
      throw result;
    }
    if (result === undefined) {
      throw new Error("Evidence fixture is unreadable.");
    }
    return result;
  }
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-source-evidence-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

function receiptIndexes(root: string): unknown[] {
  const jobsRoot = join(root, "jobs");
  return readdirSync(jobsRoot).flatMap((jobId) =>
    readdirSync(join(jobsRoot, jobId, "receipts")).map(
      (name) =>
        JSON.parse(
          readFileSync(join(jobsRoot, jobId, "receipts", name), "utf8"),
        ) as unknown,
    ),
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("licence, notice, and provenance acquisition", () => {
  it("stores exact licence and notice bytes with unreviewed fail-closed evidence", async () => {
    const { root, store } = tempStore();
    const result = await acquireSourceEvidence(
      request,
      new EvidenceFixtureClient(),
      store,
    );
    const evidence = store.getRecord(result.evidence) as EvidenceBundleV1;

    expect(evidence.licence).toEqual({
      primaryPaths: ["LICENSE"],
      textDigests: [
        "sha256:4a786b39a74b8476d53e364c77902fa965ff8a74809cc69bcfbd9cc0b69cfa85",
      ],
      manualStatus: "unreviewed",
    });
    expect(evidence.notices).toEqual([
      {
        path: "NOTICE",
        digest:
          "sha256:78588cd2264ed321499cecaf2d9c92fcf871cb038241e3361efbaa2a9c91e832",
        required: true,
      },
    ]);
    expect(evidence.scans.map(({ status }) => status)).toEqual([
      "unavailable",
      "unavailable",
      "unavailable",
      "unavailable",
    ]);

    for (const digest of [
      evidence.licence.textDigests[0]!,
      evidence.notices[0]!.digest,
    ]) {
      expect(
        readFileSync(join(root, "blobs", "evidence", `${digest.slice(7)}.bin`)),
      ).toEqual(
        Buffer.from(
          digest === evidence.notices[0]!.digest
            ? bytes("NOTICE")
            : bytes("LICENSE"),
        ),
      );
    }
    expect(receiptIndexes(root)).toHaveLength(1);
  });

  it("records immutable origin URLs at the exact resolved commit", async () => {
    const { store } = tempStore();
    const result = await acquireSourceEvidence(
      request,
      new EvidenceFixtureClient(),
      store,
    );
    const snapshot = store.getRecord(result.snapshot);

    expect(snapshot).toMatchObject({
      originEvidence: expect.arrayContaining([
        {
          url: `https://github.com/example/project/blob/${commit}/LICENSE`,
          retrievedAt: reference.retrievedAt,
          digest:
            "sha256:4a786b39a74b8476d53e364c77902fa965ff8a74809cc69bcfbd9cc0b69cfa85",
        },
        {
          url: `https://github.com/example/project/blob/${commit}/NOTICE`,
          retrievedAt: reference.retrievedAt,
          digest:
            "sha256:78588cd2264ed321499cecaf2d9c92fcf871cb038241e3361efbaa2a9c91e832",
        },
      ]),
    });
  });

  it.each([
    ["missing", tree().filter(({ path }) => path !== "LICENSE")],
    [
      "ambiguous",
      [
        ...tree(),
        {
          path: "COPYING",
          mode: "100644",
          type: "blob",
          size: 63,
          blobDigest:
            "sha256:4a786b39a74b8476d53e364c77902fa965ff8a74809cc69bcfbd9cc0b69cfa85",
        },
      ],
    ],
  ])(
    "blocks %s primary licence and preserves a redacted receipt",
    async (_case, sourceTree) => {
      const { root, store } = tempStore();

      await expect(
        acquireSourceEvidence(
          request,
          new EvidenceFixtureClient(sourceTree as SourceTreeEntryV1[]),
          store,
        ),
      ).rejects.toThrow(/primary licence/i);
      expect(receiptIndexes(root)).toHaveLength(1);
      const persisted = readFileSync(
        join(
          root,
          "records",
          "receipt",
          `${(receiptIndexes(root)[0] as { receiptDigest: string }).receiptDigest.slice(7)}.json`,
        ),
        "utf8",
      );
      expect(persisted).not.toContain("MIT License fixture");
      expect(persisted).not.toContain("Permission is granted");
    },
  );

  it("blocks a missing declared required notice", async () => {
    const { root, store } = tempStore();
    const resolved = {
      ...reference,
      requiredNoticePaths: ["THIRD_PARTY_NOTICES"],
    };

    await expect(
      acquireSourceEvidence(
        request,
        new EvidenceFixtureClient(tree(), resolved),
        store,
      ),
    ).rejects.toThrow(/required notice/i);
    expect(receiptIndexes(root)).toHaveLength(1);
  });

  it("blocks evidence whose fetched raw bytes drift from the tree digest", async () => {
    const { root, store } = tempStore();
    const client = new EvidenceFixtureClient(tree(), reference, {
      LICENSE: new TextEncoder().encode("changed licence"),
      NOTICE: bytes("NOTICE"),
    });

    await expect(acquireSourceEvidence(request, client, store)).rejects.toThrow(
      /digest drift/i,
    );
    expect(receiptIndexes(root)).toHaveLength(1);
  });

  it("blocks unreadable evidence and retries the same failure receipt idempotently", async () => {
    const { root, store } = tempStore();
    const client = new EvidenceFixtureClient(tree(), reference, {
      LICENSE: new Error("fixture read failed"),
      NOTICE: bytes("NOTICE"),
    });

    await expect(acquireSourceEvidence(request, client, store)).rejects.toThrow(
      /unreadable|read failed/i,
    );
    await expect(acquireSourceEvidence(request, client, store)).rejects.toThrow(
      /unreadable|read failed/i,
    );
    expect(receiptIndexes(root)).toHaveLength(1);
  });
});
