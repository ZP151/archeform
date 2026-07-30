import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createExternalIntakeApi,
  ExternalIntakeStore,
  type ExternalIntakeApiV1,
} from "@factory/external-intake";

import { runIntakeCli } from "../src/main.js";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "factory-intake-cli-test-"));
  roots.push(root);
  return root;
}

function validRequestFile(root: string): string {
  const path = join(root, "batch.json");
  writeFileSync(
    path,
    JSON.stringify({
      apiVersion: "factory.external-intake-batch/v1",
      items: [
        {
          id: "safe-source",
          request: {
            apiVersion: "factory.external-intake-request/v1",
            createdAt: "2026-07-31T06:00:00.000Z",
            producerVersion: "0.1.0",
            parentDigests: [],
            source: {
              canonicalRepositoryUrl:
                "https://github.com/example/safe-source.git",
              requestedRef: "v1.0.0",
              expectedCommit: "a".repeat(40),
            },
            classification: "provider",
            requestedModules: [{ path: "src/index.ts" }],
            allowNetworkRetrieval: true,
          },
        },
      ],
    }),
  );
  return path;
}

function outputHarness(api: ExternalIntakeApiV1, cwd: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    options: {
      api,
      cwd,
      stdout: (line: string) => stdout.push(line),
      stderr: (line: string) => stderr.push(line),
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("repository-local intake CLI", () => {
  it("submits only a local regular JSON request file and prints redacted status", async () => {
    const root = tempRoot();
    const requestPath = validRequestFile(root);
    const original = readFileSync(requestPath, "utf8");
    const quarantine = join(root, "quarantine");
    const api = createExternalIntakeApi(
      new ExternalIntakeStore(quarantine),
      quarantine,
    );
    const output = outputHarness(api, root);

    expect(
      await runIntakeCli(
        ["batch", "submit", "--file", requestPath],
        output.options,
      ),
    ).toBe(0);
    expect(await runIntakeCli(["status", "safe-source"], output.options)).toBe(
      0,
    );

    const rendered = output.stdout.join("\n");
    expect(rendered).toContain('"status":"requested"');
    expect(rendered).toContain('"id":"safe-source"');
    expect(rendered).not.toContain("github.com");
    expect(rendered).not.toMatch(/sourceBody|raw|secret-match/iu);
    expect(readFileSync(requestPath, "utf8")).toBe(original);
    expect(output.stderr).toEqual([]);
  });

  it("loads status and verifies a prior job in a fresh CLI process", async () => {
    const root = tempRoot();
    const requestPath = validRequestFile(root);
    const quarantine = join(root, "quarantine");
    const submitted = outputHarness(
      createExternalIntakeApi(new ExternalIntakeStore(quarantine), quarantine),
      root,
    );
    expect(
      await runIntakeCli(
        ["batch", "submit", "--file", requestPath],
        submitted.options,
      ),
    ).toBe(0);
    const result = JSON.parse(submitted.stdout[0]!) as {
      byId: Record<string, { lookupId: string }>;
    };
    const lookupId = result.byId["safe-source"]!.lookupId;
    const fresh = outputHarness(
      createExternalIntakeApi(new ExternalIntakeStore(quarantine), quarantine),
      root,
    );

    expect(await runIntakeCli(["status", lookupId], fresh.options)).toBe(0);
    expect(
      await runIntakeCli(["verify", "--job", lookupId], fresh.options),
    ).toBe(0);
    expect(fresh.stdout.join("\n")).toContain('\"valid\":true');
    expect(fresh.stderr).toEqual([]);
  });

  it.each([
    [
      "remote request URL",
      ["batch", "submit", "--file", "https://example.test/batch.json"],
    ],
    ["promotion operation", ["candidate", "promote", "safe-adapter@1.0.0"]],
    ["approval operation", ["candidate", "approve", "safe-adapter@1.0.0"]],
    ["arbitrary output", ["status", "safe-source", "--out", "result.json"]],
    ["path-like opaque ID", ["status", "../safe-source"]],
  ])("rejects %s", async (_, args) => {
    const root = tempRoot();
    const quarantine = join(root, "quarantine");
    const api = createExternalIntakeApi(
      new ExternalIntakeStore(quarantine),
      quarantine,
    );
    const output = outputHarness(api, root);

    expect(await runIntakeCli(args, output.options)).toBe(2);
    expect(output.stdout).toEqual([]);
    expect(output.stderr.join("\n")).toContain("invalid-command");
  });

  it.each([
    ["show", ["candidate", "show", "safe-adapter@1.0.0"]],
    ["test", ["candidate", "test", "safe-adapter@1.0.0"]],
    ["verify", ["verify", "--job", "safe-source"]],
  ])(
    "dispatches the read-only %s command with opaque identities",
    async (_, args) => {
      const root = tempRoot();
      const calls: string[] = [];
      const api = {
        candidateShow(id: string, version: string) {
          calls.push(`show:${id}@${version}`);
          return { id, version, status: "quarantined" };
        },
        candidateTest(id: string, version: string) {
          calls.push(`test:${id}@${version}`);
          return { id, version, status: "conformance-passed" };
        },
        verifyJob(id: string) {
          calls.push(`verify:${id}`);
          return { id, valid: true };
        },
      } as unknown as ExternalIntakeApiV1;
      const output = outputHarness(api, root);

      expect(await runIntakeCli(args, output.options)).toBe(0);
      expect(calls).toHaveLength(1);
      expect(output.stderr).toEqual([]);
      expect(output.stdout.join("\n")).not.toMatch(
        /sourceBody|sourceText|raw|secret-match/iu,
      );
    },
  );
});
