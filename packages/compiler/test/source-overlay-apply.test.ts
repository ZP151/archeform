import { describe, expect, it } from "vitest";

import { sha256Digest } from "../src/core/generated-files.js";
import { sourceBaselineDigest } from "../src/targets/source/source-manifest.js";
import {
  applySourceOverlay,
  type SourceOverlayApplyInputV1,
} from "../src/targets/source/overlay.js";

const digest = (hex: string) => `sha256:${hex.repeat(64)}`;

const baseline = [
  { path: "web/index.html", content: "<html></html>\n" },
  { path: "web/app.mjs", content: "console.log(1);\n" },
] as const;

const overlayContent = "export const CustomerBanner = () => null;\n";

function validInput(): SourceOverlayApplyInputV1 {
  return {
    compilationChecksum: digest("a"),
    baseline,
    overlay: {
      apiVersion: "factory.source-overlay/v1",
      compilationChecksum: digest("a"),
      baselineDigest: sourceBaselineDigest(baseline),
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
          baseDigest: digest("e"),
          contentDigest: `sha256:${sha256Digest(overlayContent)}`,
        },
      ],
      conflictState: "clean",
    },
    contents: new Map([["src/extensions/customer-banner.tsx", overlayContent]]),
  };
}

describe("applySourceOverlay", () => {
  it("applies a valid overlay as an added extension file", () => {
    const merged = applySourceOverlay(validInput());

    expect(merged.map(({ path }) => path)).toEqual([
      "src/extensions/customer-banner.tsx",
      "web/app.mjs",
      "web/index.html",
    ]);
    expect(
      merged.find(({ path }) => path.endsWith("customer-banner.tsx"))!.content,
    ).toBe(overlayContent);
  });

  it("rejects a stale baseline digest", () => {
    const input = validInput();
    input.overlay = {
      ...input.overlay,
      baselineDigest: digest("9"),
    } as typeof input.overlay;
    expect(() => applySourceOverlay(input)).toThrow(
      /Source overlay apply is invalid/,
    );
  });

  it("rejects a mismatched compilation checksum", () => {
    const input = validInput();
    input.compilationChecksum = digest("b");
    expect(() => applySourceOverlay(input)).toThrow(
      /Source overlay apply is invalid/,
    );
  });

  it("rejects a non-clean conflict state", () => {
    const input = validInput();
    input.overlay = {
      ...input.overlay,
      conflictState: "stale-baseline",
    } as typeof input.overlay;
    expect(() => applySourceOverlay(input)).toThrow(
      /Source overlay apply is invalid/,
    );
  });

  it("rejects content that fails its contentDigest", () => {
    const input = validInput();
    input.contents = new Map([
      ["src/extensions/customer-banner.tsx", "export const Different = 1;\n"],
    ]);
    expect(() => applySourceOverlay(input)).toThrow(
      /Source overlay apply is invalid/,
    );
  });

  it("rejects missing or extra content entries", () => {
    const missing = validInput();
    missing.contents = new Map();
    expect(() => applySourceOverlay(missing)).toThrow(
      /Source overlay apply is invalid/,
    );

    const extra = validInput();
    extra.contents = new Map([
      ...extra.contents,
      ["src/extensions/other.tsx", "export const Other = 1;\n"],
    ]);
    expect(() => applySourceOverlay(extra)).toThrow(
      /Source overlay apply is invalid/,
    );
  });

  it("rejects an overlay path that collides with a generated file", () => {
    const input = validInput();
    const collidingBaseline = [
      ...baseline,
      { path: "src/extensions/customer-banner.tsx", content: "// default\n" },
    ];
    input.baseline = collidingBaseline;
    input.overlay = {
      ...input.overlay,
      baselineDigest: sourceBaselineDigest(collidingBaseline),
    } as typeof input.overlay;
    expect(() => applySourceOverlay(input)).toThrow(
      /Source overlay apply is invalid/,
    );
  });

  it("rejects an unsafe overlay envelope via assertSourceOverlay", () => {
    const input = validInput();
    input.overlay = {
      ...input.overlay,
      files: [
        {
          path: "package.json",
          baseDigest: digest("e"),
          contentDigest: `sha256:${sha256Digest("{}")}`,
        },
      ],
    } as typeof input.overlay;
    expect(() => applySourceOverlay(input)).toThrow();
  });
});
