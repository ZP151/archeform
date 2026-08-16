import { describe, expect, it } from "vitest";

import { assertSourceOverlay } from "../src/index.js";

const digest = `sha256:${"c".repeat(64)}`;

function validOverlay(): Record<string, unknown> {
  return {
    apiVersion: "factory.source-overlay/v1",
    compilationChecksum: digest,
    baselineDigest: `sha256:${"d".repeat(64)}`,
    writableRoots: ["src/extensions"],
    declaredSlots: [
      {
        key: "customer-banner",
        file: "src/extensions/customer-banner.tsx",
        exportName: "CustomerBanner",
      },
    ],
    files: [
      {
        path: "src/extensions/customer-banner.tsx",
        baseDigest: `sha256:${"e".repeat(64)}`,
        contentDigest: `sha256:${"f".repeat(64)}`,
      },
    ],
    conflictState: "clean",
  };
}

describe("SourceOverlayV1", () => {
  it("accepts the exact isolated overlay contract", () => {
    expect(assertSourceOverlay(validOverlay())).toEqual(validOverlay());
  });

  it("requires the sole approved writable root", () => {
    for (const writableRoots of [
      [],
      ["src"],
      ["src/extensions", "src/generated"],
      ["src/extensions/child"],
    ]) {
      expect(() =>
        assertSourceOverlay({ ...validOverlay(), writableRoots }),
      ).toThrow();
    }
  });

  it.each([
    "../outside.ts",
    "/absolute.ts",
    "C:\\outside.ts",
    "src/extensions/../../outside.ts",
    "src\\extensions\\windows.ts",
    "https://example.invalid/overlay.ts",
  ])("rejects unsafe overlay path %s", (path) => {
    const overlay = validOverlay();
    (overlay.files as Record<string, unknown>[])[0].path = path;
    expect(() => assertSourceOverlay(overlay)).toThrow(/path|unsafe|invalid/i);
  });

  it("rejects unsafe declared-slot files and extra material", () => {
    const unsafeSlot = validOverlay();
    (unsafeSlot.declaredSlots as Record<string, unknown>[])[0].file =
      "../generated/customer-banner.tsx";
    expect(() => assertSourceOverlay(unsafeSlot)).toThrow(
      /path|unsafe|invalid/i,
    );

    const extraKey = validOverlay();
    (extraKey.files as Record<string, unknown>[])[0].content =
      "raw user source";
    expect(() => assertSourceOverlay(extraKey)).toThrow(/Unrecognized key/);
  });

  it("rejects duplicate slot keys, slot files, and overlay file paths", () => {
    const duplicateSlotKey = validOverlay();
    (duplicateSlotKey.declaredSlots as Record<string, unknown>[]).push({
      key: "customer-banner",
      file: "src/extensions/alternate-banner.tsx",
      exportName: "AlternateBanner",
    });
    expect(() => assertSourceOverlay(duplicateSlotKey)).toThrow(/duplicated/i);

    const duplicateSlotFile = validOverlay();
    (duplicateSlotFile.declaredSlots as Record<string, unknown>[]).push({
      key: "alternate-banner",
      file: "src/extensions/customer-banner.tsx",
      exportName: "AlternateBanner",
    });
    expect(() => assertSourceOverlay(duplicateSlotFile)).toThrow(/duplicated/i);

    const duplicateFile = validOverlay();
    (duplicateFile.files as Record<string, unknown>[]).push(
      structuredClone((duplicateFile.files as Record<string, unknown>[])[0]),
    );
    expect(() => assertSourceOverlay(duplicateFile)).toThrow(/duplicated/i);
  });

  it("requires every declared slot and file to remain under the writable root", () => {
    const outside = validOverlay();
    (outside.files as Record<string, unknown>[])[0].path =
      "src/custom/customer-banner.tsx";
    expect(() => assertSourceOverlay(outside)).toThrow(/writable|root/i);

    for (const path of [
      "package.json",
      "pnpm-lock.yaml",
      "vite.config.ts",
      "src/main.tsx",
    ]) {
      const selfDeclared = validOverlay();
      (selfDeclared.declaredSlots as Record<string, unknown>[])[0].file = path;
      (selfDeclared.files as Record<string, unknown>[])[0].path = path;
      expect(() => assertSourceOverlay(selfDeclared)).toThrow(/writable|root/i);
    }
  });

  it.each([
    "src/extensions/package.json",
    "src/extensions/pnpm-lock.yaml",
    "src/extensions/vite.config.ts",
    "src/extensions/main.tsx",
  ])("rejects reserved package, configuration, and entry path %s", (path) => {
    const reserved = validOverlay();
    (reserved.declaredSlots as Record<string, unknown>[])[0].file = path;
    (reserved.files as Record<string, unknown>[])[0].path = path;
    expect(() => assertSourceOverlay(reserved)).toThrow(
      /package|lock|configuration|entry|unsafe/i,
    );
  });

  it.each([
    "/absolute.ts",
    "C:\\absolute.ts",
    "src\\extensions\\windows.ts",
    "https://example.invalid/overlay.ts",
    "src/extensions/./dot.ts",
    "src/extensions/nested/../traversal.ts",
  ])("rejects unsafe slot and file variant %s", (path) => {
    const unsafe = validOverlay();
    (unsafe.declaredSlots as Record<string, unknown>[])[0].file = path;
    (unsafe.files as Record<string, unknown>[])[0].path = path;
    expect(() => assertSourceOverlay(unsafe)).toThrow(/path|unsafe|invalid/i);
  });

  it.each([
    "src/extensions/package.json.",
    "src/extensions/package.json ",
    "src/extensions/package.json::$DATA",
    "src/extensions/main.tsx.",
    "src/extensions/nested./file.ts",
    "src/extensions/nested /file.ts",
    "src/extensions/control\u0000.ts",
    "src/extensions/control\u001f.ts",
    "src/extensions/control\u007f.ts",
    "src/extensions/bad<name>.ts",
    "src/extensions/bad>name.ts",
    "src/extensions/bad:name.ts",
    'src/extensions/bad"name.ts',
    "src/extensions/bad|name.ts",
    "src/extensions/bad?name.ts",
    "src/extensions/bad*name.ts",
  ])("rejects Windows-invalid path alias %s", (path) => {
    const invalid = validOverlay();
    (invalid.declaredSlots as Record<string, unknown>[])[0].file = path;
    (invalid.files as Record<string, unknown>[])[0].path = path;
    expect(() => assertSourceOverlay(invalid)).toThrow(
      /path|unsafe|invalid|windows/i,
    );
  });

  it.each([
    "src/extensions/CON.ts",
    "src/extensions/PrN.json",
    "src/extensions/aux.txt",
    "src/extensions/NuL.data",
    "src/extensions/Clock$.log",
    "src/extensions/COM1.ts",
    "src/extensions/com2.ts",
    "src/extensions/Com3.ts",
    "src/extensions/cOM4.ts",
    "src/extensions/COM5.ts",
    "src/extensions/com6.ts",
    "src/extensions/Com7.ts",
    "src/extensions/cOM8.ts",
    "src/extensions/COM9.ts",
    "src/extensions/LPT1.tsx",
    "src/extensions/lpt2.tsx",
    "src/extensions/Lpt3.tsx",
    "src/extensions/lPT4.tsx",
    "src/extensions/LPT5.tsx",
    "src/extensions/lpt6.tsx",
    "src/extensions/Lpt7.tsx",
    "src/extensions/lPT8.tsx",
    "src/extensions/LPT9.tsx",
  ])("rejects Windows device-stem alias %s", (path) => {
    const device = validOverlay();
    (device.declaredSlots as Record<string, unknown>[])[0].file = path;
    (device.files as Record<string, unknown>[])[0].path = path;
    expect(() => assertSourceOverlay(device)).toThrow(
      /path|unsafe|invalid|device|windows/i,
    );
  });

  it("rejects case-only slot and file aliases as canonical duplicates", () => {
    const duplicateSlot = validOverlay();
    (duplicateSlot.declaredSlots as Record<string, unknown>[]).push({
      key: "alternate-banner",
      file: "SRC/EXTENSIONS/CUSTOMER-BANNER.TSX",
      exportName: "AlternateBanner",
    });
    expect(() => assertSourceOverlay(duplicateSlot)).toThrow(/duplicated/i);

    const duplicateFile = validOverlay();
    (duplicateFile.files as Record<string, unknown>[]).push({
      path: "SRC/EXTENSIONS/CUSTOMER-BANNER.TSX",
      baseDigest: `sha256:${"1".repeat(64)}`,
      contentDigest: `sha256:${"2".repeat(64)}`,
    });
    expect(() => assertSourceOverlay(duplicateFile)).toThrow(/duplicated/i);
  });

  it("checks writable roots and reserved paths case-insensitively", () => {
    const mixedCaseRoot = validOverlay();
    (mixedCaseRoot.declaredSlots as Record<string, unknown>[])[0].file =
      "SRC/EXTENSIONS/Customer-Banner.tsx";
    (mixedCaseRoot.files as Record<string, unknown>[])[0].path =
      "SRC/EXTENSIONS/Customer-Banner.tsx";
    expect(assertSourceOverlay(mixedCaseRoot)).toEqual(mixedCaseRoot);

    const reservedAlias = validOverlay();
    (reservedAlias.declaredSlots as Record<string, unknown>[])[0].file =
      "SRC/EXTENSIONS/PACKAGE.JSON";
    (reservedAlias.files as Record<string, unknown>[])[0].path =
      "SRC/EXTENSIONS/PACKAGE.JSON";
    expect(() => assertSourceOverlay(reservedAlias)).toThrow(/package|unsafe/i);
  });

  it.each([
    "src/extensions/console.ts",
    "src/extensions/conifer.ts",
    "src/extensions/com0.ts",
    "src/extensions/com10.ts",
    "src/extensions/lpt0.ts",
    "src/extensions/lpt10.ts",
    "src/extensions/clock.ts",
    "src/extensions/clockwise.ts",
    "src/extensions/auxiliary.ts",
    "src/extensions/null.ts",
    "src/extensions/package.json-safe.ts",
    "src/extensions/main-view.tsx",
  ])("accepts benign Windows device and reserved-name neighbor %s", (path) => {
    const benign = validOverlay();
    (benign.declaredSlots as Record<string, unknown>[])[0].file = path;
    (benign.files as Record<string, unknown>[])[0].path = path;
    expect(assertSourceOverlay(benign)).toEqual(benign);
  });

  it.each([
    "src/extensions/PACKAG~1.JSO",
    "src/extensions/TSCONF~1.JSO",
    "src/extensions/VITEST~1.TS",
    "src/extensions/packag~1.jso",
    "src/extensions/TsCoNf~1.JsO",
    "src/extensions/vItEsT~1.tS",
    "src/extensions/PACKAG~1.JSO/plugin.ts",
    "src/extensions/nested~/plugin.ts",
    "src/extensions/~cache/plugin.ts",
  ])("rejects DOS short-name or tilde-segment alias %s", (path) => {
    const alias = validOverlay();
    (alias.declaredSlots as Record<string, unknown>[])[0].file = path;
    (alias.files as Record<string, unknown>[])[0].path = path;
    expect(() => assertSourceOverlay(alias)).toThrow(/path|unsafe|invalid/i);
  });

  it.each([
    "src/extensions/package-1.jso",
    "src/extensions/tsconfig-1.jso",
    "src/extensions/vitest-1.ts",
    "src/extensions/nested-short/plugin.ts",
    "src/extensions/cache-short/plugin.ts",
  ])("accepts benign no-tilde neighbor %s", (path) => {
    const benign = validOverlay();
    (benign.declaredSlots as Record<string, unknown>[])[0].file = path;
    (benign.files as Record<string, unknown>[])[0].path = path;
    expect(assertSourceOverlay(benign)).toEqual(benign);
  });

  it("rejects malformed checksums and unknown conflict states", () => {
    expect(() =>
      assertSourceOverlay({
        ...validOverlay(),
        baselineDigest: "sha256:invalid",
      }),
    ).toThrow();
    expect(() =>
      assertSourceOverlay({ ...validOverlay(), conflictState: "overwrite" }),
    ).toThrow();
  });
});
