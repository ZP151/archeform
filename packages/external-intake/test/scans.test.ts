import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { digestBytes, type Sha256Digest } from "../src/canonical.js";
import {
  PINNED_SCANNER_IDENTITIES,
  SCAN_KIND_ORDER,
  runPinnedLocalScans,
  type LocalScannerV1,
  type NormalizedScanResultV1,
  type ReadonlySnapshotView,
  type ScanKindV1,
} from "../src/scans.js";
import { ExternalIntakeStore } from "../src/store.js";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "scans",
);
const roots: string[] = [];
const snapshotDigest = `sha256:${"1".repeat(64)}` as Sha256Digest;
const treeDigest = `sha256:${"2".repeat(64)}` as Sha256Digest;

function fixture(name: string): Uint8Array {
  return readFileSync(join(fixtureRoot, name));
}

function snapshotView(): ReadonlySnapshotView {
  const content = fixture("safe.ts.fixture");
  return {
    snapshotDigest,
    treeDigest,
    files: [
      {
        path: "src/safe.ts",
        digest: digestBytes(content),
        content,
      },
    ],
  };
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-scan-test-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

function resultFor(
  kind: ScanKindV1,
  overrides: Partial<NormalizedScanResultV1> = {},
): NormalizedScanResultV1 {
  const identity = PINNED_SCANNER_IDENTITIES[kind];
  const report = fixture(
    kind === "licence"
      ? "safe-licence-report.json"
      : kind === "secret"
        ? "safe-secret-report.json"
        : kind === "sast"
          ? "safe-sast-report.json"
          : "safe-dependency-report.json",
  );
  const base: NormalizedScanResultV1 = {
    ...identity,
    kind,
    status: "pass",
    findings: [],
    report,
    reportDigest: digestBytes(report),
    ...(kind === "licence" ? { scannerExpression: "MIT" } : {}),
    ...(kind === "dependency"
      ? {
          sbom: {
            format: "CycloneDX" as const,
            components: 0,
            report: fixture("safe-sbom.cdx.json"),
            reportDigest: digestBytes(fixture("safe-sbom.cdx.json")),
          },
        }
      : {}),
  };
  return { ...base, ...overrides } as NormalizedScanResultV1;
}

function scanner(
  kind: ScanKindV1,
  overrides: Partial<NormalizedScanResultV1> = {},
): LocalScannerV1 {
  const identity = PINNED_SCANNER_IDENTITIES[kind];
  return {
    kind,
    ...identity,
    async scan() {
      return resultFor(kind, overrides);
    },
  };
}

function scanners(): LocalScannerV1[] {
  return [
    scanner("dependency"),
    scanner("sast"),
    scanner("licence"),
    scanner("secret"),
  ];
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("pinned local scan orchestration", () => {
  it("records all four pinned scanner identities in deterministic order", async () => {
    const { store } = tempStore();

    const result = await runPinnedLocalScans(snapshotView(), scanners(), store);

    expect(result.scans.map(({ kind }) => kind)).toEqual([
      "licence",
      "secret",
      "sast",
      "dependency",
    ]);
    expect(
      result.scans.map(({ tool, toolVersion, rulesetDigest }) => ({
        tool,
        toolVersion,
        rulesetDigest,
      })),
    ).toEqual(SCAN_KIND_ORDER.map((kind) => PINNED_SCANNER_IDENTITIES[kind]));
  });

  it("persists raw reports and the CycloneDX SBOM only as quarantined references", async () => {
    const { root, store } = tempStore();

    const result = await runPinnedLocalScans(snapshotView(), scanners(), store);

    expect(result.scans).toHaveLength(4);
    for (const scan of result.scans) {
      expect(scan.rawReport).toEqual({
        kind: "evidence",
        digest: scan.resultDigest,
      });
      expect(
        existsSync(
          join(root, "blobs", "evidence", `${scan.resultDigest.slice(7)}.bin`),
        ),
      ).toBe(true);
    }
    expect(result.sbom).toMatchObject({
      format: "CycloneDX",
      components: 0,
      rawReport: { kind: "evidence" },
    });
    expect(result).not.toHaveProperty("sourceBody");
  });

  it.each([
    ["missing", () => scanners().slice(0, 3)],
    ["duplicate", () => [...scanners(), scanner("secret")]],
  ] as const)(
    "fails closed when scanner evidence is %s",
    async (_label, create) => {
      const { store } = tempStore();

      await expect(
        runPinnedLocalScans(snapshotView(), create(), store),
      ).rejects.toMatchObject({ code: expect.stringMatching(/scanner/) });
    },
  );

  it.each([
    [
      "unavailable",
      "secret" as const,
      { status: "unavailable" as const },
      "scanner-unavailable",
    ],
    [
      "report digest drift",
      "sast" as const,
      { reportDigest: `sha256:${"f".repeat(64)}` as Sha256Digest },
      "scan-report-drift",
    ],
    [
      "ruleset drift",
      "licence" as const,
      { rulesetDigest: `sha256:${"e".repeat(64)}` as Sha256Digest },
      "scanner-identity-drift",
    ],
  ])("fails closed on %s", async (_label, kind, overrides, code) => {
    const { store } = tempStore();
    const input = scanners().map((item) =>
      item.kind === kind ? scanner(kind, overrides) : item,
    );

    await expect(
      runPinnedLocalScans(snapshotView(), input, store),
    ).rejects.toMatchObject({ code });
  });

  it("blocks every unresolved secret finding without persisting its match", async () => {
    const { root, store } = tempStore();
    const secret = resultFor("secret", {
      status: "fail",
      findings: [{ code: "secret-token", severity: "high", count: 1 }],
    });
    const input = scanners().map((item) =>
      item.kind === "secret" ? scanner("secret", secret) : item,
    );

    await expect(
      runPinnedLocalScans(snapshotView(), input, store),
    ).rejects.toMatchObject({ code: "secret-finding" });
    const persisted = readFileSync(
      join(root, "blobs", "evidence", `${secret.reportDigest.slice(7)}.bin`),
      "utf8",
    );
    expect(persisted).not.toContain("actual-secret-value");
  });

  it.each(["sast", "dependency"] as const)(
    "blocks high and critical %s findings",
    async (kind) => {
      const { store } = tempStore();
      const input = scanners().map((item) =>
        item.kind === kind
          ? scanner(kind, {
              status: "fail",
              findings: [
                { code: `${kind}-unsafe`, severity: "critical", count: 1 },
              ],
            })
          : item,
      );

      await expect(
        runPinnedLocalScans(snapshotView(), input, store),
      ).rejects.toMatchObject({ code: `${kind}-high-finding` });
    },
  );

  it("rejects malformed normalized findings instead of trusting adapter output", async () => {
    const { store } = tempStore();
    const input = scanners().map((item) =>
      item.kind === "sast"
        ? scanner("sast", {
            findings: [{ code: "not stable!", severity: "low", count: 1 }],
          })
        : item,
    );

    await expect(
      runPinnedLocalScans(snapshotView(), input, store),
    ).rejects.toMatchObject({ code: "scan-output-malformed" });
  });
});
