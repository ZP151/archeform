import { describe, expect, it } from "vitest";

import { createEnvironmentGitHubDiscoveryClient } from "../src/github-discovery-client.js";
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
      },
      () => new Date("2026-08-01T00:00:00.000Z"),
    );

    const records = await client.discover("catalog");

    expect(requests).toHaveLength(1);
    expect(new URL(requests[0]!.url).origin).toBe("https://api.github.com");
    expect(requests[0]!.init?.redirect).toBe("error");
    expect(new Headers(requests[0]!.init?.headers).get("authorization")).toBe(
      "Bearer read-token-for-test-only",
    );
    expect(records).toEqual([
      expect.objectContaining({
        id: "github-factory-catalog",
        sourceHost: "github",
        familyHints: ["catalog"],
      }),
    ]);
    expect(JSON.stringify(records)).not.toContain("read-token-for-test-only");
  });
});
