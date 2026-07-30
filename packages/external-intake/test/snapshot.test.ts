import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { IntakeRequestV1, SourceSnapshotV1 } from "../src/contracts.js";
import { acquireSourceEvidence } from "../src/evidence.js";
import type {
  FixedSourceClient,
  ResolvedSourceReferenceV1,
  SourceTreeEntryV1,
} from "../src/source-client.js";
import { canonicalTreeDigest, validateSourceTree } from "../src/snapshot.js";
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

function fixtureBytes(name: string): Uint8Array {
  return readFileSync(join(fixtureRoot, name));
}

function fixtureTree(): SourceTreeEntryV1[] {
  return JSON.parse(
    readFileSync(join(fixtureRoot, "tree.json"), "utf8"),
  ) as SourceTreeEntryV1[];
}

class FixtureClient implements FixedSourceClient {
  readonly calls: string[] = [];

  constructor(
    readonly resolved = reference,
    readonly tree = fixtureTree(),
    readonly evidence: Readonly<Record<string, Uint8Array>> = {
      LICENSE: fixtureBytes("LICENSE"),
      NOTICE: fixtureBytes("NOTICE"),
    },
  ) {}

  async resolve(): Promise<ResolvedSourceReferenceV1> {
    this.calls.push("resolve");
    return this.resolved;
  }

  async fetchArchive(): Promise<Uint8Array> {
    this.calls.push("archive");
    return fixtureBytes("archive.fixture");
  }

  async fetchTree(): Promise<SourceTreeEntryV1[]> {
    this.calls.push("tree");
    return this.tree;
  }

  async fetchEvidence(
    _reference: ResolvedSourceReferenceV1,
    path: string,
  ): Promise<Uint8Array> {
    this.calls.push(`evidence:${path}`);
    const bytes = this.evidence[path];
    if (bytes === undefined) {
      throw new Error("Fixture evidence is unreadable.");
    }
    return bytes;
  }
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-source-snapshot-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("source snapshot acquisition", () => {
  it.each(["main", "refs/heads/main", "pull/12/head"])(
    "rejects floating ref %s before retrieval",
    async (requestedRef) => {
      const client = new FixtureClient();
      const { store } = tempStore();

      await expect(
        acquireSourceEvidence(
          {
            ...request,
            source: { ...request.source, requestedRef },
          } as IntakeRequestV1,
          client,
          store,
        ),
      ).rejects.toThrow(/exact tag or commit|full commit/i);
      expect(client.calls).toEqual([]);
    },
  );

  it("rejects a resolved commit that differs from expectedCommit before snapshot writes", async () => {
    const client = new FixtureClient({
      ...reference,
      resolvedCommit: "b".repeat(40),
    });
    const { root, store } = tempStore();

    await expect(acquireSourceEvidence(request, client, store)).rejects.toThrow(
      /resolved commit mismatch/i,
    );
    expect(client.calls).toEqual(["resolve"]);
    expect(existsSync(join(root, "records", "snapshot"))).toBe(false);
    expect(existsSync(join(root, "blobs", "snapshot"))).toBe(false);
  });

  it("stores exact archive bytes and a canonical tree digest without extraction", async () => {
    const client = new FixtureClient();
    const { root, store } = tempStore();

    const result = await acquireSourceEvidence(request, client, store);
    const snapshot = store.getRecord(result.snapshot) as SourceSnapshotV1;

    expect(snapshot.archiveDigest).toBe(
      "sha256:767703ba01ffd23ad7347bd263964c7fbeb6f9a691d6f3665e9d7de67fe946ac",
    );
    expect(snapshot.treeDigest).toBe(
      "sha256:6ef898d0e1e4a4a47a172782c536fe11e9539e34a014813a1e35a9042d7b0cf4",
    );
    expect(snapshot.includedPaths).toEqual([
      "LICENSE",
      "NOTICE",
      "src/rules.ts",
    ]);
    expect(
      readFileSync(
        join(
          root,
          "blobs",
          "snapshot",
          `${snapshot.archiveDigest.slice(7)}.bin`,
        ),
      ),
    ).toEqual(Buffer.from(fixtureBytes("archive.fixture")));
    expect(existsSync(join(root, "sources"))).toBe(false);
  });

  it("canonicalizes tree order independently of API response order", () => {
    const tree = fixtureTree();
    expect(canonicalTreeDigest([...tree].reverse())).toBe(
      "sha256:6ef898d0e1e4a4a47a172782c536fe11e9539e34a014813a1e35a9042d7b0cf4",
    );
  });

  it("uses total locale-independent ordering for reversed mixed Unicode and ASCII paths", () => {
    const mixed = [
      "中.ts",
      "Ωmega.ts",
      "Ångstrom.ts",
      "alpha.ts",
      "Zeta.ts",
    ].map((path) => ({
      path,
      mode: "100644",
      type: "blob" as const,
      size: 1,
      blobDigest: `sha256:${"1".repeat(64)}` as const,
    }));

    const forward = validateSourceTree(mixed);
    const reversed = validateSourceTree([...mixed].reverse());

    expect(forward.blobEntries.map(({ path }) => path)).toEqual([
      "Zeta.ts",
      "alpha.ts",
      "Ångstrom.ts",
      "Ωmega.ts",
      "中.ts",
    ]);
    expect(reversed.blobEntries.map(({ path }) => path)).toEqual(
      forward.blobEntries.map(({ path }) => path),
    );
    expect(reversed.treeDigest).toBe(forward.treeDigest);
  });

  it.each([
    [
      "path traversal",
      {
        path: "../escape.ts",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    [
      "symlink",
      {
        path: "link",
        mode: "120000",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    ["submodule", { path: "module", mode: "160000", type: "commit" }],
    [
      "special mode",
      {
        path: "device",
        mode: "100600",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    [
      "reserved name",
      {
        path: "src/CON.ts",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    [
      "vendor tree",
      {
        path: "vendor/code.ts",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    [
      "generated source",
      {
        path: "src/client.generated.ts",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    [
      "binary",
      {
        path: "assets/icon.png",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
    [
      "nested archive",
      {
        path: "fixtures/source.zip",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ],
  ])("rejects %s entries", (_name, entry) => {
    expect(() => validateSourceTree([entry as SourceTreeEntryV1])).toThrow();
  });

  it("rejects case-fold collisions and configured count/byte overflow", () => {
    const [license] = fixtureTree();
    expect(license).toBeDefined();
    const collision = {
      ...license!,
      path: "license",
    } as SourceTreeEntryV1;
    expect(() => validateSourceTree([license!, collision])).toThrow(
      /case-fold/i,
    );
    expect(() => validateSourceTree([license!], { maxEntries: 0 })).toThrow(
      /entry count/i,
    );
    expect(() => validateSourceTree([license!], { maxTotalBytes: 1 })).toThrow(
      /byte limit/i,
    );
  });

  it("validates the tree before persisting fetched archive bytes", async () => {
    const invalidTree = [
      {
        path: "../escape.ts",
        mode: "100644",
        type: "blob",
        size: 1,
        blobDigest: `sha256:${"1".repeat(64)}`,
      },
    ] as SourceTreeEntryV1[];
    const client = new FixtureClient(reference, invalidTree);
    const { root, store } = tempStore();

    await expect(acquireSourceEvidence(request, client, store)).rejects.toThrow(
      /path|unsafe/i,
    );
    expect(client.calls).toEqual(["resolve", "archive", "tree"]);
    expect(existsSync(join(root, "blobs", "snapshot"))).toBe(false);
  });
});
