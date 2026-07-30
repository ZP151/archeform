import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalJson,
  digestBytes,
  type Sha256Digest,
} from "../src/canonical.js";
import {
  PINNED_SCANNER_IDENTITIES,
  SCAN_KIND_ORDER,
  runPinnedLocalScans,
  validateScanCheckpoint,
  type LocalScannerV1,
  type NormalizedScanResultV1,
  type ReadonlySnapshotView,
  type ScanKindV1,
} from "../src/scans.js";
import { canonicalTreeDigest } from "../src/snapshot.js";
import { ExternalIntakeStore } from "../src/store.js";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "scans",
);
const roots: string[] = [];
const snapshotDigest = `sha256:${"1".repeat(64)}` as Sha256Digest;

function fixture(name: string): Uint8Array {
  return readFileSync(join(fixtureRoot, name));
}

function snapshotView(): ReadonlySnapshotView {
  return canonicallyBoundSnapshotView();
}

function canonicallyBoundSnapshotView(
  content = fixture("safe.ts.fixture"),
): ReadonlySnapshotView {
  const path = "src/safe.ts";
  const mode = "100644" as const;
  const digest = digestBytes(content);
  return {
    snapshotDigest,
    treeDigest: canonicalTreeDigest([
      {
        path,
        mode,
        type: "blob",
        size: content.byteLength,
        blobDigest: digest,
      },
    ]),
    files: [{ path, mode, digest, content }],
  } as ReadonlySnapshotView;
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-scan-test-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

function persistedArtifactText(root: string): string {
  const texts: string[] = [];
  const visit = (path: string): void => {
    if (!existsSync(path)) {
      return;
    }
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path)) {
        visit(join(path, entry));
      }
      return;
    }
    texts.push(readFileSync(path, "utf8"));
  };
  visit(join(root, "blobs", "evidence"));
  visit(join(root, "records", "receipt"));
  return texts.join("\n");
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
  const result = { ...base, ...overrides } as NormalizedScanResultV1;
  if (
    overrides.report === undefined &&
    (overrides.status !== undefined ||
      overrides.findings !== undefined ||
      overrides.scannerExpression !== undefined)
  ) {
    const report = new TextEncoder().encode(
      JSON.stringify({
        status: result.status,
        findings: result.findings,
        ...(kind === "licence" ? { expression: result.scannerExpression } : {}),
      }),
    );
    return {
      ...result,
      report,
      reportDigest: overrides.reportDigest ?? digestBytes(report),
    };
  }
  return result;
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
  it("accepts snapshot bytes only when their modes and digests reproduce the canonical tree", async () => {
    const { store } = tempStore();

    await expect(
      runPinnedLocalScans(canonicallyBoundSnapshotView(), scanners(), store),
    ).resolves.toMatchObject({ scans: expect.any(Array) });
  });

  it("rejects substituted content with a matching self-digest under the accepted tree label", async () => {
    const { store } = tempStore();
    const accepted = canonicallyBoundSnapshotView();
    const substitutedContent = new TextEncoder().encode(
      "export const substituted = true;",
    );
    const substituted = {
      ...accepted,
      files: [
        {
          ...accepted.files[0]!,
          content: substitutedContent,
          digest: digestBytes(substitutedContent),
        },
      ],
    } as ReadonlySnapshotView;

    await expect(
      runPinnedLocalScans(substituted, scanners(), store),
    ).rejects.toMatchObject({ code: "snapshot-evidence-drift" });
  });

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

  it("persists safe scan summaries and the CycloneDX SBOM only as quarantined references", async () => {
    const { root, store } = tempStore();

    const result = await runPinnedLocalScans(snapshotView(), scanners(), store);

    expect(result.scans).toHaveLength(4);
    for (const scan of result.scans) {
      expect(scan.summary).toEqual({
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

  it("persists only a derived safe scanner summary", async () => {
    const { root, store } = tempStore();
    const snapshot = snapshotView();

    const result = await runPinnedLocalScans(snapshot, scanners(), store);
    const secret = result.scans.find(({ kind }) => kind === "secret")!;
    const persisted = JSON.parse(
      readFileSync(
        join(root, "blobs", "evidence", `${secret.resultDigest.slice(7)}.bin`),
        "utf8",
      ),
    ) as unknown;

    expect(persisted).toEqual({
      apiVersion: "factory.external-scan-summary/v1",
      snapshotDigest: snapshot.snapshotDigest,
      treeDigest: snapshot.treeDigest,
      kind: "secret",
      ...PINNED_SCANNER_IDENTITIES.secret,
      status: "pass",
      findings: [],
    });
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

  it("rejects raw secret fields before any sentinel reaches persistence", async () => {
    const { root, store } = tempStore();
    const sentinel = "FACTORY-RAW-SECRET-SENTINEL-5f8d4e";
    const rawSecretReport = new TextEncoder().encode(
      JSON.stringify({
        status: "fail",
        findings: [{ code: "secret-token", severity: "high", count: 1 }],
        source: "src/safe.ts",
        match: "token",
        value: sentinel,
      }),
    );
    const secret = resultFor("secret", {
      status: "fail",
      findings: [{ code: "secret-token", severity: "high", count: 1 }],
      report: rawSecretReport,
      reportDigest: digestBytes(rawSecretReport),
    });
    const input = scanners().map((item) =>
      item.kind === "secret" ? scanner("secret", secret) : item,
    );

    await expect(
      runPinnedLocalScans(snapshotView(), input, store),
    ).rejects.toMatchObject({ code: "scan-report-unsafe" });
    expect(persistedArtifactText(root)).not.toContain(sentinel);
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

  it.each([
    [
      "non-JSON bytes",
      new TextEncoder().encode("not-json"),
      0,
      "sbom-output-malformed",
    ],
    [
      "incomplete document",
      new TextEncoder().encode('{"bomFormat":"CycloneDX"}'),
      0,
      "sbom-output-malformed",
    ],
    [
      "wrong schema contract",
      new TextEncoder().encode(
        JSON.stringify({
          $schema: "http://cyclonedx.org/schema/bom-1.5.schema.json",
          bomFormat: "CycloneDX",
          specVersion: "1.5",
          version: 1,
          components: [],
        }),
      ),
      0,
      "sbom-output-malformed",
    ],
    [
      "component-count drift",
      new TextEncoder().encode(
        JSON.stringify({
          $schema: "http://cyclonedx.org/schema/bom-1.6.schema.json",
          bomFormat: "CycloneDX",
          specVersion: "1.6",
          version: 1,
          components: [{ type: "library", name: "safe", version: "1.0.0" }],
        }),
      ),
      0,
      "sbom-component-count-drift",
    ],
  ] as const)(
    "rejects CycloneDX %s",
    async (_label, report, components, code) => {
      const { store } = tempStore();
      const input = scanners().map((item) =>
        item.kind === "dependency"
          ? scanner("dependency", {
              sbom: {
                format: "CycloneDX",
                components,
                report,
                reportDigest: digestBytes(report),
              },
            })
          : item,
      );

      await expect(
        runPinnedLocalScans(snapshotView(), input, store),
      ).rejects.toMatchObject({ code });
    },
  );

  it("rejects a component type outside the CycloneDX 1.6 enumeration", async () => {
    const { store } = tempStore();
    const report = new TextEncoder().encode(
      JSON.stringify({
        $schema: "http://cyclonedx.org/schema/bom-1.6.schema.json",
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        version: 1,
        components: [
          { type: "source-module", name: "unsafe", version: "1.0.0" },
        ],
      }),
    );
    const input = scanners().map((item) =>
      item.kind === "dependency"
        ? scanner("dependency", {
            sbom: {
              format: "CycloneDX",
              components: 1,
              report,
              reportDigest: digestBytes(report),
            },
          })
        : item,
    );

    await expect(
      runPinnedLocalScans(snapshotView(), input, store),
    ).rejects.toMatchObject({ code: "sbom-output-malformed" });
  });

  it("rejects a digest-consistent resume checkpoint with an invalid CycloneDX component type", async () => {
    const { store } = tempStore();
    const snapshot = snapshotView();
    const result = await runPinnedLocalScans(snapshot, scanners(), store);
    const componentIdentities = [
      { type: "source-module", name: "unsafe", version: "1.0.0" },
    ];
    const digest = digestBytes(
      new TextEncoder().encode(
        canonicalJson({
          $schema: "http://cyclonedx.org/schema/bom-1.6.schema.json",
          bomFormat: "CycloneDX",
          specVersion: "1.6",
          version: 1,
          components: componentIdentities,
        }),
      ),
    );

    expect(() =>
      validateScanCheckpoint(snapshot, {
        scans: result.scans,
        sbom: {
          ...result.sbom,
          digest,
          components: 1,
          componentIdentities,
          rawReport: { kind: "evidence", digest },
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "receipt-chain-invalid" }));
  });
});
