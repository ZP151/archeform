import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  ExternalIntakeStore,
  createExternalIntakeApi,
  createPortfolioIntakeRequest,
  loadExternalPortfolio,
} from "@factory/external-intake";

import { runIntakeCli } from "../src/main.js";

const roots: string[] = [];
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const portfolioPath = join(
  workspaceRoot,
  "ecosystem/portfolio/2026-07-30-external-business-logic.json",
);
const provenance = {
  createdAt: "2026-07-31T13:00:00.000Z",
  producerVersion: "0.1.0",
};

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "factory-intake-bulk-test-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("fixture-only bulk intake preflight", () => {
  it("preflights exactly 43 portfolio sources and 108 demand signals with isolated, resumable, redacted results", async () => {
    const parent = tempRoot();
    const runRoot = join(parent, "run-fixture-43-108");
    const retainedRoot = join(parent, "retain-outside-run");
    mkdirSync(retainedRoot);
    writeFileSync(join(retainedRoot, "keep.txt"), "outside run ownership");

    const portfolio = loadExternalPortfolio(portfolioPath);
    expect(portfolio.sources).toHaveLength(43);
    expect(portfolio.scenarios).toHaveLength(108);

    const items = portfolio.sources.map((source) => ({
      id: source.id,
      request:
        source.intakeClassification === null
          ? {
              apiVersion: "factory.fixture-policy-only-source/v1",
              sourceId: source.id,
            }
          : createPortfolioIntakeRequest(portfolio, source.id, provenance),
    }));
    expect(items).toHaveLength(43);

    const requestPath = join(parent, "fixture-preflight.json");
    writeFileSync(
      requestPath,
      JSON.stringify({
        apiVersion: "factory.external-intake-batch/v1",
        items,
      }),
    );

    const api = createExternalIntakeApi(
      new ExternalIntakeStore(runRoot),
      runRoot,
    );
    const firstStdout: string[] = [];
    const firstStderr: string[] = [];
    const firstExit = await runIntakeCli(
      ["batch", "submit", "--file", "fixture-preflight.json"],
      {
        api,
        cwd: parent,
        stdout: (line) => firstStdout.push(line),
        stderr: (line) => firstStderr.push(line),
      },
    );

    expect(firstExit).toBe(0);
    expect(firstStderr).toEqual([]);
    expect(firstStdout).toHaveLength(1);
    expect(firstStdout[0]).not.toMatch(
      /canonicalRepositoryUrl|requestedRef|expectedCommit|sourceBody|finding/iu,
    );

    const first = JSON.parse(firstStdout[0]!) as {
      readonly byId: Record<
        string,
        { readonly status: "requested" | "blocked"; readonly lookupId?: string }
      >;
    };
    expect(Object.keys(first.byId)).toHaveLength(43);
    expect(
      Object.values(first.byId).filter(({ status }) => status === "requested"),
    ).toHaveLength(19);
    expect(
      Object.values(first.byId).filter(({ status }) => status === "blocked"),
    ).toHaveLength(24);
    expect(
      portfolio.sources.every((source) => {
        const result = first.byId[source.id]!;
        return source.intakeClassification === null
          ? result.status === "blocked"
          : result.status === "requested" && result.lookupId !== undefined;
      }),
    ).toBe(true);
    await expect(api.candidateList({})).resolves.toEqual([]);

    const secondStdout: string[] = [];
    const secondExit = await runIntakeCli(
      ["batch", "submit", "--file", "fixture-preflight.json"],
      {
        api,
        cwd: parent,
        stdout: (line) => secondStdout.push(line),
        stderr: () => undefined,
      },
    );
    expect(secondExit).toBe(0);
    expect(secondStdout).toEqual(firstStdout);

    expect(existsSync(join(runRoot, "records", "candidate"))).toBe(false);
    expect(existsSync(join(runRoot, "candidates"))).toBe(false);
    expect(readdirSync(join(runRoot, "records", "request"))).toHaveLength(19);

    rmSync(runRoot, { recursive: true, force: false });
    expect(existsSync(runRoot)).toBe(false);
    expect(readFileSync(join(retainedRoot, "keep.txt"), "utf8")).toBe(
      "outside run ownership",
    );
  });
});
