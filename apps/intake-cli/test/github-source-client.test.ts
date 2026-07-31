import { describe, expect, it } from "vitest";

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
