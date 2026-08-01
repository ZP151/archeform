import { describe, expect, it } from "vitest";

import {
  createEnvironmentGitHubDiscoveryClient,
  discoverGitHubFamilies,
  GitHubDiscoveryRateLimitError,
} from "../src/github-discovery-client.js";
import { createGitHubReadTokenFetch } from "../src/github-source-client.js";

describe("createGitHubReadTokenFetch", () => {
  it("adds the configured token only to GitHub API requests", async () => {
    const requests: Array<{ readonly url: string; readonly headers: Headers }> =
      [];
    const fetch = createGitHubReadTokenFetch(
      "read-token-for-test-only",
      async (input, init) => {
        requests.push({
          url: String(input),
          headers: new Headers(init?.headers),
        });
        return new Response("{}", { status: 200 });
      },
    );

    await fetch("https://api.github.com/repos/acme/widget", {
      headers: { accept: "application/vnd.github+json" },
    });
    await fetch("https://codeload.github.com/acme/widget/tar.gz/commit");
    await fetch("https://example.test/redirect");

    expect(requests[0]!.headers.get("authorization")).toBe(
      "Bearer read-token-for-test-only",
    );
    expect(requests[0]!.headers.get("accept")).toBe(
      "application/vnd.github+json",
    );
    expect(requests[1]!.headers.get("authorization")).toBeNull();
    expect(requests[2]!.headers.get("authorization")).toBeNull();
    expect(JSON.stringify(requests.slice(1))).not.toContain(
      "read-token-for-test-only",
    );
  });

  it("rejects malformed token input without echoing the value", () => {
    const secret = "malformed\nread-token";

    expect(() => createGitHubReadTokenFetch(secret)).toThrow(
      "GitHub read token is invalid.",
    );
    expect(() => createGitHubReadTokenFetch(secret)).not.toThrow(secret);
  });
});

describe("createEnvironmentGitHubDiscoveryClient", () => {
  it("uses a fixed family query and returns only quarantine metadata", async () => {
    const requests: Array<{
      readonly url: string;
      readonly init?: RequestInit;
    }> = [];
    const client = createEnvironmentGitHubDiscoveryClient(
      { FACTORY_GITHUB_READ_TOKEN: "read-token-for-test-only" },
      async (input, init) => {
        requests.push({ url: String(input), init });
        if (new URL(String(input)).pathname === "/search/repositories") {
          return new Response(
            JSON.stringify({
              items: [
                {
                  name: "catalog",
                  full_name: "factory/catalog",
                  owner: { login: "factory" },
                  default_branch: "main",
                  license: { spdx_id: "MIT" },
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ sha: "a".repeat(40) }), {
          status: 200,
        });
      },
      () => new Date("2026-08-01T00:00:00.000Z"),
    );

    const records = await client.discover("catalog");

    expect(requests).toHaveLength(2);
    expect(new URL(requests[0]!.url).origin).toBe("https://api.github.com");
    expect(new URL(requests[1]!.url).pathname).toBe(
      "/repos/factory/catalog/commits/main",
    );
    expect(requests[0]!.init?.redirect).toBe("error");
    expect(new Headers(requests[0]!.init?.headers).get("authorization")).toBe(
      "Bearer read-token-for-test-only",
    );
    expect(records).toEqual([
      expect.objectContaining({
        id: "github-factory-catalog",
        sourceHost: "github",
        familyHints: ["catalog"],
        immutableReference: expect.objectContaining({
          resolvedVersionOrCommit: "a".repeat(40),
        }),
      }),
    ]);
    expect(JSON.stringify(records)).not.toContain("read-token-for-test-only");
  });

  it("returns a resumable, bounded checkpoint when a later family is rate limited", async () => {
    const calls: string[] = [];
    const client = {
      discover: async (family: "identity" | "catalog" | "inventory") => {
        calls.push(family);
        if (family === "catalog") {
          throw new GitHubDiscoveryRateLimitError(60);
        }
        return [];
      },
    };

    const result = await discoverGitHubFamilies(
      ["identity", "catalog", "inventory"],
      client,
    );

    expect(result).toEqual({
      apiVersion: "factory.github-discovery-batch/v1",
      status: "rate-limited",
      records: [],
      completedFamilies: ["identity"],
      pendingFamilies: ["catalog", "inventory"],
      checkpoint: {
        apiVersion: "factory.github-discovery-checkpoint/v1",
        completedFamilies: ["identity"],
      },
      retryAfterSeconds: 60,
    });
    expect(calls).toEqual(["identity", "catalog"]);

    const resumed = await discoverGitHubFamilies(
      ["identity", "catalog", "inventory"],
      {
        discover: async (family) => {
          calls.push(`resume:${family}`);
          return [];
        },
      },
      result.checkpoint,
    );
    expect(resumed.status).toBe("complete");
    expect(resumed.completedFamilies).toEqual([
      "identity",
      "catalog",
      "inventory",
    ]);
    expect(calls).toEqual([
      "identity",
      "catalog",
      "resume:catalog",
      "resume:inventory",
    ]);
  });

  it("classifies an API rate-limit response without exposing the response body", async () => {
    const client = createEnvironmentGitHubDiscoveryClient(
      {},
      async () =>
        new Response("sensitive upstream diagnostic", {
          status: 429,
          headers: { "retry-after": "90" },
        }),
    );

    await expect(client.discover("catalog")).rejects.toEqual(
      new GitHubDiscoveryRateLimitError(90),
    );
  });
});
