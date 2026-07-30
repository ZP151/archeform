import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { digestBytes, type Sha256Digest } from "../src/canonical.js";
import {
  PINNED_MODULE_INVENTORY_IDENTITY,
  runModuleInventory,
  type ModuleInventoryAdapterV1,
  type ModuleInventoryResultV1,
} from "../src/module-inventory.js";
import type { ReadonlySnapshotView } from "../src/scans.js";
import { ExternalIntakeStore } from "../src/store.js";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "scans",
);
const roots: string[] = [];
const snapshotDigest = `sha256:${"1".repeat(64)}` as Sha256Digest;
const treeDigest = `sha256:${"2".repeat(64)}` as Sha256Digest;

function source(name = "safe.ts.fixture"): Uint8Array {
  return readFileSync(join(fixtureRoot, name));
}

function view(
  name = "safe.ts.fixture",
  path = "src/safe.ts",
): ReadonlySnapshotView {
  const content = source(name);
  return {
    snapshotDigest,
    treeDigest,
    files: [{ path, digest: digestBytes(content), content }],
  };
}

function tempStore(): ExternalIntakeStore {
  const root = mkdtempSync(join(tmpdir(), "factory-inventory-test-"));
  roots.push(root);
  return new ExternalIntakeStore(root);
}

function inventoryResult(
  overrides: Partial<ModuleInventoryResultV1> = {},
): ModuleInventoryResultV1 {
  const report = new TextEncoder().encode(
    '{"modules":[{"path":"src/safe.ts","symbols":["total"]}]}',
  );
  const content = source();
  return {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    status: "pass",
    report,
    reportDigest: digestBytes(report),
    modules: [
      {
        path: "src/safe.ts",
        symbols: ["total"],
        imports: [],
        exports: ["total"],
        dependencies: [],
        size: content.byteLength,
        noticeMarker: false,
        generated: false,
        binary: false,
        sourceDigest: digestBytes(content),
        dynamicEvaluation: false,
        dynamicLoad: false,
        processAccess: false,
        filesystemAccess: false,
        networkAccess: false,
        parseStatus: "parsed",
      },
    ],
    ...overrides,
  };
}

function adapter(
  overrides: Partial<ModuleInventoryResultV1> = {},
): ModuleInventoryAdapterV1 {
  return {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    async inventory() {
      return inventoryResult(overrides);
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("pinned module inventory", () => {
  it("normalizes deterministic locator metadata without emitting source", async () => {
    const result = await runModuleInventory(view(), adapter(), tempStore());

    expect(result).toMatchObject({
      ...PINNED_MODULE_INVENTORY_IDENTITY,
      modules: [
        {
          path: "src/safe.ts",
          symbols: ["total"],
          imports: [],
          exports: ["total"],
          sourceDigest: digestBytes(source()),
        },
      ],
      rawReport: { kind: "evidence" },
    });
    expect(result.modules[0]).not.toHaveProperty("content");
    expect(result).not.toHaveProperty("transformedSource");
  });

  it.each([
    ["parser failure", { parseStatus: "failed" }, "parser-failure"],
    ["dynamic evaluation", { dynamicEvaluation: true }, "dynamic-evaluation"],
    ["dynamic load", { dynamicLoad: true }, "dynamic-load"],
    ["process access", { processAccess: true }, "process-access"],
    ["filesystem access", { filesystemAccess: true }, "filesystem-access"],
    ["network access", { networkAccess: true }, "network-access"],
    ["generated source", { generated: true }, "generated-source"],
    ["binary source", { binary: true }, "binary-source"],
  ] as const)("blocks %s", async (_label, mutation, code) => {
    const base = inventoryResult().modules[0]!;

    await expect(
      runModuleInventory(
        view(),
        adapter({ modules: [{ ...base, ...mutation }] }),
        tempStore(),
      ),
    ).rejects.toMatchObject({ code });
  });

  it.each([
    "vendor/copied.ts",
    "node_modules/package/index.ts",
    "dist/generated.ts",
  ])("blocks prohibited module path %s", async (path) => {
    const base = inventoryResult().modules[0]!;

    await expect(
      runModuleInventory(
        view("safe.ts.fixture", path),
        adapter({ modules: [{ ...base, path }] }),
        tempStore(),
      ),
    ).rejects.toMatchObject({ code: "prohibited-module-path" });
  });

  it.each([
    [
      "unavailable parser",
      { status: "unavailable" as const },
      "parser-unavailable",
    ],
    [
      "report digest drift",
      { reportDigest: `sha256:${"f".repeat(64)}` as Sha256Digest },
      "inventory-report-drift",
    ],
    [
      "parser identity drift",
      { parserVersion: "9.9.9" },
      "parser-identity-drift",
    ],
  ])("fails closed on %s", async (_label, overrides, code) => {
    await expect(
      runModuleInventory(view(), adapter(overrides), tempStore()),
    ).rejects.toMatchObject({ code });
  });

  it("quarantines an unavailable parser report before failing closed", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-inventory-test-"));
    roots.push(root);
    const store = new ExternalIntakeStore(root);
    const unavailable = inventoryResult({ status: "unavailable" });

    await expect(
      runModuleInventory(view(), adapter(unavailable), store),
    ).rejects.toMatchObject({ code: "parser-unavailable" });
    expect(
      existsSync(
        join(
          root,
          "blobs",
          "evidence",
          `${unavailable.reportDigest.slice(7)}.bin`,
        ),
      ),
    ).toBe(true);
  });

  it("rejects a module digest that differs from the immutable snapshot view", async () => {
    const base = inventoryResult().modules[0]!;

    await expect(
      runModuleInventory(
        view(),
        adapter({
          modules: [{ ...base, sourceDigest: `sha256:${"f".repeat(64)}` }],
        }),
        tempStore(),
      ),
    ).rejects.toMatchObject({ code: "module-source-drift" });
  });
});
