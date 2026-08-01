import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runIntakeCli, type IntakeCliOptionsV1 } from "../src/main.js";
import { GitHubDiscoveryRateLimitError } from "../src/github-discovery-client.js";

function discoveryFixture(root: string): string {
  const path = join(root, "discovery.json");
  writeFileSync(
    path,
    JSON.stringify([
      {
        apiVersion: "factory.discovery-record-input/v1",
        id: "safe-catalog-source",
        discoveredAt: "2026-08-01T00:00:00.000Z",
        sourceKind: "repository",
        sourceHost: "github",
        immutableReference: {
          canonicalIdentifier: "github:factory/safe-catalog-source",
          resolvedVersionOrCommit: "a".repeat(40),
          integrity: `sha256:${"b".repeat(64)}`,
        },
        declaredLicense: "MIT",
        familyHints: ["catalog"],
        profileHints: ["restaurant-ordering"],
        reuseMode: "selective-source-copy",
      },
    ]),
  );
  return path;
}

function options(root: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    options: {
      api: {} as IntakeCliOptionsV1["api"],
      cwd: root,
      stdout: (line: string) => stdout.push(line),
      stderr: (line: string) => stderr.push(line),
    } satisfies IntakeCliOptionsV1,
  };
}

describe("Candidate Foundry discovery CLI", () => {
  it("prints only aggregate counts and gate categories for a fixture run", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-discovery-cli-"));
    const harness = options(root);
    discoveryFixture(root);

    await expect(
      runIntakeCli(
        ["discovery", "fixture", "--file", "discovery.json"],
        harness.options,
      ),
    ).resolves.toBe(0);

    expect(harness.stdout.join("\n")).toContain('"eligible":1');
    expect(harness.stdout.join("\n")).not.toMatch(
      /github\.com|canonicalIdentifier|token|sourceText/i,
    );
  });

  it("rejects an unregistered family before it invokes GitHub", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-discovery-cli-"));
    const harness = options(root);
    const discover = () => {
      throw new Error("GitHub must not be invoked.");
    };

    await expect(
      runIntakeCli(["discovery", "github", "--family", "unknown"], {
        ...harness.options,
        discoveryClient: { discover },
      }),
    ).resolves.toBe(2);
    expect(harness.stderr.join("\n")).toContain("invalid-command");
  });

  it("renders an aggregate resumable summary for a bounded all-family discovery run", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-discovery-cli-"));
    const harness = options(root);
    const calls: string[] = [];

    await expect(
      runIntakeCli(["discovery", "github", "--all"], {
        ...harness.options,
        discoveryClient: {
          discover: async (family) => {
            calls.push(family);
            throw new GitHubDiscoveryRateLimitError(75);
          },
        },
      }),
    ).resolves.toBe(0);

    const output = harness.stdout.join("\n");
    expect(output).toContain(
      '"apiVersion":"factory.discovery-batch-summary/v1"',
    );
    expect(output).toContain('"status":"rate-limited"');
    expect(output).toContain('"retryAfterSeconds":75');
    expect(output).not.toMatch(
      /github\.com|canonicalIdentifier|token|sourceText|sensitive/i,
    );
    expect(calls).toEqual(["identity"]);
  });
});
