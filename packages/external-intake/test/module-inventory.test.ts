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
import { canonicalTreeDigest } from "../src/snapshot.js";
import { ExternalIntakeStore } from "../src/store.js";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "scans",
);
const roots: string[] = [];
const snapshotDigest = `sha256:${"1".repeat(64)}` as Sha256Digest;

function source(name = "safe.ts.fixture"): Uint8Array {
  return readFileSync(join(fixtureRoot, name));
}

function view(
  name = "safe.ts.fixture",
  path = "src/safe.ts",
): ReadonlySnapshotView {
  return viewWithFiles([{ name, path }]);
}

function viewWithFiles(
  inputs: readonly { readonly name: string; readonly path: string }[],
): ReadonlySnapshotView {
  const files = inputs.map(({ name, path }) => {
    const content = source(name);
    return {
      path,
      mode: "100644" as const,
      digest: digestBytes(content),
      content,
    };
  });
  return {
    snapshotDigest,
    treeDigest: canonicalTreeDigest(
      files.map(({ path, mode, digest, content }) => ({
        path,
        mode,
        type: "blob" as const,
        size: content.byteLength,
        blobDigest: digest,
      })),
    ),
    files,
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

function pinnedFixtureAdapter(): ModuleInventoryAdapterV1 {
  return {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    async inventory(input) {
      const modules = input.files
        .filter(({ path }) => /\.[cm]?[jt]sx?$/u.test(path.toLowerCase()))
        .map((file) => {
          const text = new TextDecoder("utf-8", { fatal: true }).decode(
            file.content,
          );
          return {
            path: file.path,
            symbols: [],
            imports: [],
            exports: [],
            dependencies: [],
            size: file.content.byteLength,
            noticeMarker: /copyright|licen[cs]e/iu.test(text),
            generated: false,
            binary: false,
            sourceDigest: file.digest,
            dynamicEvaluation: /\beval\s*\(/u.test(text),
            dynamicLoad: false,
            processAccess: false,
            filesystemAccess: false,
            networkAccess: false,
            parseStatus: /\(\s*$/u.test(text)
              ? ("failed" as const)
              : ("parsed" as const),
          };
        });
      const report = new TextEncoder().encode(
        JSON.stringify(
          modules.map(({ path, parseStatus, dynamicEvaluation }) => ({
            path,
            parseStatus,
            dynamicEvaluation,
          })),
        ),
      );
      return {
        ...PINNED_MODULE_INVENTORY_IDENTITY,
        status: "pass",
        report,
        reportDigest: digestBytes(report),
        modules,
      };
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("pinned module inventory", () => {
  it("requires exactly one inventory disposition for every applicable snapshot file", async () => {
    const snapshot = viewWithFiles([
      { name: "safe.ts.fixture", path: "src/safe.ts" },
      { name: "safe.ts.fixture", path: "src/second.ts" },
    ]);

    await expect(
      runModuleInventory(snapshot, adapter(), tempStore()),
    ).rejects.toMatchObject({ code: "inventory-file-missing" });

    const first = inventoryResult().modules[0]!;
    await expect(
      runModuleInventory(
        view(),
        adapter({
          modules: [first, { ...first, symbols: ["second-disposition"] }],
        }),
        tempStore(),
      ),
    ).rejects.toMatchObject({ code: "inventory-file-duplicate" });
  });

  it("does not require a parser disposition for non-applicable evidence files", async () => {
    const snapshot = viewWithFiles([
      { name: "safe.ts.fixture", path: "src/safe.ts" },
      { name: "safe-licence-report.json", path: "LICENSE" },
    ]);

    await expect(
      runModuleInventory(snapshot, adapter(), tempStore()),
    ).resolves.toMatchObject({ modules: [{ path: "src/safe.ts" }] });
  });

  it.each([
    ["parser-error.ts.fixture", "src/parser-error.ts", "parser-failure"],
    ["dynamic-eval.ts.fixture", "src/dynamic-eval.ts", "dynamic-evaluation"],
  ])(
    "blocks committed %s source through the pinned fixture adapter",
    async (name, path, code) => {
      await expect(
        runModuleInventory(
          view(name, path),
          pinnedFixtureAdapter(),
          tempStore(),
        ),
      ).rejects.toMatchObject({ code });
    },
  );

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

  it("attests the fully normalized inventory when opaque report bytes are identical", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-inventory-attestation-"));
    roots.push(root);
    const store = new ExternalIntakeStore(root);
    const base = inventoryResult().modules[0]!;

    const first = await runModuleInventory(view(), adapter(), store);
    const changed = await runModuleInventory(
      view(),
      adapter({ modules: [{ ...base, symbols: ["changedSymbol"] }] }),
      store,
    );

    expect(changed.rawReport).toEqual(first.rawReport);
    expect(changed.inventoryDigest).not.toBe(first.inventoryDigest);
    expect(
      JSON.parse(
        readFileSync(
          join(
            root,
            "blobs",
            "evidence",
            `${changed.inventoryDigest.slice(7)}.bin`,
          ),
          "utf8",
        ),
      ),
    ).toMatchObject({
      apiVersion: "factory.external-module-inventory/v1",
      parser: PINNED_MODULE_INVENTORY_IDENTITY.parser,
      parserVersion: PINNED_MODULE_INVENTORY_IDENTITY.parserVersion,
      modules: [{ path: "src/safe.ts", symbols: ["changedSymbol"] }],
    });
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
