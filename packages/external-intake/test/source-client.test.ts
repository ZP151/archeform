import { describe, expect, it, vi } from "vitest";

import type { IntakeRequestV1 } from "../src/contracts.js";
import {
  GitHubFixedSourceClient,
  type ResolvedSourceReferenceV1,
  type SourceFetch,
} from "../src/source-client.js";

const commit = "a".repeat(40);
const tagObject = "b".repeat(40);

const validRequest: IntakeRequestV1 = {
  apiVersion: "factory.external-intake-request/v1",
  createdAt: "2026-07-31T00:00:00.000Z",
  producerVersion: "0.1.0",
  parentDigests: [],
  source: {
    canonicalRepositoryUrl: "https://github.com/example/project.git",
    requestedRef: "v1.2.3",
  },
  classification: "source-study",
  requestedModules: [],
  allowNetworkRetrieval: true,
};

const resolvedReference: ResolvedSourceReferenceV1 = {
  apiVersion: "factory.resolved-source-reference/v1",
  repositoryUrl: validRequest.source.canonicalRepositoryUrl,
  requestedRef: "v1.2.3",
  resolvedCommit: commit,
  retrievedAt: "2026-07-31T00:00:00.000Z",
  archiveUrl: `https://codeload.github.com/example/project/tar.gz/${commit}`,
  treeUrl: `https://api.github.com/repos/example/project/git/trees/${commit}`,
  requiredNoticePaths: [],
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function scriptedFetch(responses: readonly Response[]): {
  fetch: SourceFetch;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const queue = [...responses];
  const calls: Array<{ url: string; init: RequestInit }> = [];
  return {
    calls,
    fetch: async (input, init = {}) => {
      calls.push({ url: String(input), init });
      const response = queue.shift();
      if (response === undefined) {
        throw new Error("Unexpected fixture fetch.");
      }
      return response;
    },
  };
}

describe("GitHubFixedSourceClient", () => {
  it("resolves a full commit only after official existence verification", async () => {
    const transport = scriptedFetch([jsonResponse({ sha: commit })]);
    const client = new GitHubFixedSourceClient({
      fetch: transport.fetch,
      now: () => new Date("2026-07-31T01:02:03.000Z"),
    });

    const resolved = await client.resolve({
      ...validRequest,
      source: { ...validRequest.source, requestedRef: commit },
    });

    expect(resolved).toMatchObject({
      repositoryUrl: validRequest.source.canonicalRepositoryUrl,
      requestedRef: commit,
      resolvedCommit: commit,
      retrievedAt: "2026-07-31T01:02:03.000Z",
      archiveUrl: `https://codeload.github.com/example/project/tar.gz/${commit}`,
    });
    expect(transport.calls.map(({ url }) => url)).toEqual([
      `https://api.github.com/repos/example/project/commits/${commit}`,
    ]);
    expect(transport.calls[0]?.init.redirect).toBe("manual");
  });

  it("peels an annotated tag to a verified full commit", async () => {
    const transport = scriptedFetch([
      jsonResponse({ object: { type: "tag", sha: tagObject } }),
      jsonResponse({ object: { type: "commit", sha: commit } }),
      jsonResponse({ sha: commit }),
    ]);
    const client = new GitHubFixedSourceClient({ fetch: transport.fetch });

    const resolved = await client.resolve(validRequest);

    expect(resolved.resolvedCommit).toBe(commit);
    expect(transport.calls.map(({ url }) => url)).toEqual([
      "https://api.github.com/repos/example/project/git/ref/tags/v1.2.3",
      `https://api.github.com/repos/example/project/git/tags/${tagObject}`,
      `https://api.github.com/repos/example/project/commits/${commit}`,
    ]);
  });

  it.each(["main", "refs/heads/main", "pull/12/head"])(
    "rejects floating ref %s before retrieval",
    async (requestedRef) => {
      const fetch = vi.fn<SourceFetch>();
      const client = new GitHubFixedSourceClient({ fetch });

      await expect(
        client.resolve({
          ...validRequest,
          source: { ...validRequest.source, requestedRef },
        } as IntakeRequestV1),
      ).rejects.toThrow(/exact tag or commit|full commit/i);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects redirects outside the GitHub API and codeload allow-list", async () => {
    const transport = scriptedFetch([
      new Response(null, {
        status: 302,
        headers: { location: "https://attacker.example/archive" },
      }),
    ]);
    const client = new GitHubFixedSourceClient({ fetch: transport.fetch });

    await expect(
      client.resolve({
        ...validRequest,
        source: { ...validRequest.source, requestedRef: commit },
      }),
    ).rejects.toThrow(/redirect|allow-list/i);
    expect(transport.calls).toHaveLength(1);
  });

  it("rejects an unexpected cross-host redirect even between allowed hosts", async () => {
    const transport = scriptedFetch([
      new Response(null, {
        status: 302,
        headers: {
          location: `https://codeload.github.com/example/project/tar.gz/${commit}`,
        },
      }),
    ]);
    const client = new GitHubFixedSourceClient({ fetch: transport.fetch });

    await expect(
      client.resolve({
        ...validRequest,
        source: { ...validRequest.source, requestedRef: commit },
      }),
    ).rejects.toThrow(/cross-host redirect/i);
    expect(transport.calls).toHaveLength(1);
  });

  it("enforces response byte limits from headers and streamed bytes", async () => {
    const headerTransport = scriptedFetch([
      new Response("{}", {
        headers: { "content-length": "100" },
      }),
    ]);
    const headerClient = new GitHubFixedSourceClient({
      fetch: headerTransport.fetch,
      maxMetadataResponseBytes: 16,
    });
    await expect(
      headerClient.resolve({
        ...validRequest,
        source: { ...validRequest.source, requestedRef: commit },
      }),
    ).rejects.toThrow(/response.*limit/i);

    const streamTransport = scriptedFetch([new Response(new Uint8Array(17))]);
    const streamClient = new GitHubFixedSourceClient({
      fetch: streamTransport.fetch,
      maxMetadataResponseBytes: 16,
    });
    await expect(
      streamClient.resolve({
        ...validRequest,
        source: { ...validRequest.source, requestedRef: commit },
      }),
    ).rejects.toThrow(/response.*limit/i);
  });

  it("aborts a response that exceeds the configured time bound", async () => {
    const fetch: SourceFetch = (_input, init = {}) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    const client = new GitHubFixedSourceClient({
      fetch,
      responseTimeoutMs: 5,
    });

    await expect(
      client.resolve({
        ...validRequest,
        source: { ...validRequest.source, requestedRef: commit },
      }),
    ).rejects.toThrow(/time limit/i);
  });

  it("bounds a stalled response body after headers arrive", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"sha":"'));
        setTimeout(() => controller.close(), 30);
      },
    });
    const transport = scriptedFetch([new Response(body)]);
    const client = new GitHubFixedSourceClient({
      fetch: transport.fetch,
      responseTimeoutMs: 5,
    });

    await expect(
      client.resolve({
        ...validRequest,
        source: { ...validRequest.source, requestedRef: commit },
      }),
    ).rejects.toThrow(/time limit/i);
  });

  it("returns exact archive bytes without following automatic redirects", async () => {
    const bytes = new Uint8Array([0, 10, 13, 255]);
    const transport = scriptedFetch([new Response(bytes)]);
    const client = new GitHubFixedSourceClient({ fetch: transport.fetch });

    await expect(client.fetchArchive(resolvedReference)).resolves.toEqual(
      bytes,
    );
    expect(transport.calls[0]?.init.redirect).toBe("manual");
  });

  it("hashes official tree blob bytes and reuses them for allow-listed evidence", async () => {
    const objectId = "c".repeat(40);
    const transport = scriptedFetch([
      jsonResponse({
        truncated: false,
        tree: [
          {
            path: "LICENSE",
            mode: "100644",
            type: "blob",
            sha: objectId,
            size: 3,
          },
          { path: "src", mode: "040000", type: "tree", sha: objectId },
        ],
      }),
      new Response("abc"),
    ]);
    const client = new GitHubFixedSourceClient({ fetch: transport.fetch });

    await expect(client.fetchTree(resolvedReference)).resolves.toEqual([
      {
        path: "LICENSE",
        mode: "100644",
        type: "blob",
        size: 3,
        blobDigest:
          "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      },
      { path: "src", mode: "040000", type: "tree" },
    ]);
    await expect(
      client.fetchEvidence(resolvedReference, "LICENSE"),
    ).resolves.toEqual(new TextEncoder().encode("abc"));
    expect(transport.calls).toHaveLength(2);
  });

  it("rejects non-evidence paths without retrieval", async () => {
    const fetch = vi.fn<SourceFetch>();
    const client = new GitHubFixedSourceClient({ fetch });

    await expect(
      client.fetchEvidence(resolvedReference, "src/rules.ts"),
    ).rejects.toThrow(/allow-listed/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an unsafe declared notice path before retrieval", async () => {
    const fetch = vi.fn<SourceFetch>();
    const client = new GitHubFixedSourceClient({ fetch });

    await expect(
      client.fetchEvidence(
        { ...resolvedReference, requiredNoticePaths: ["../NOTICE"] },
        "../NOTICE",
      ),
    ).rejects.toThrow(/safe relative path/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
