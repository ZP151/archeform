import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  getCustomerIcon,
  getCustomerIconAssets,
} from "../src/targets/restaurant-v3/customer-icons.js";

describe("generated customer icon assets", () => {
  it("refuses names outside the internal allowlist", () => {
    for (const key of ["toString", "__proto__", "../../secret", "<svg>"])
      expect(() => getCustomerIcon(key as never)).toThrow(
        "Unknown customer icon.",
      );
  });

  it.each(["changed", "missing"])(
    "refuses a %s installed icon asset",
    async (mode) => {
      vi.resetModules();
      vi.doMock("node:fs", async () => {
        const original =
          await vi.importActual<typeof import("node:fs")>("node:fs");
        return {
          ...original,
          readFileSync: (path: string, encoding: "utf8") => {
            if (String(path).endsWith("house.svg")) {
              if (mode === "missing") throw new Error("Missing icon asset.");
              return '<svg onload="alert(1)"></svg>';
            }
            return original.readFileSync(path, encoding);
          },
        };
      });
      try {
        const fresh =
          await import("../src/targets/restaurant-v3/customer-icons.js");
        expect(() => fresh.getCustomerIconAssets()).toThrow(
          mode === "missing"
            ? "Missing icon asset."
            : "Customer icon package asset integrity mismatch.",
        );
      } finally {
        vi.doUnmock("node:fs");
        vi.resetModules();
      }
    },
  );

  it("embeds only selected decorative SVGs from the pinned published library", () => {
    const { icons } = getCustomerIconAssets();
    expect(Object.keys(icons).sort()).toEqual([
      "arrow-left",
      "arrow-right",
      "chef-hat",
      "circle-check",
      "circle-help",
      "circle-x",
      "clock",
      "house",
      "receipt-text",
      "refresh-cw",
      "shopping-bag",
      "user-round",
      "utensils-crossed",
    ]);
    for (const svg of Object.values(icons)) {
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).toContain('focusable="false"');
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).not.toMatch(
        /<(?:script|foreignObject|image|use)\b|\son\w+=|(?:href|src)=/i,
      );
    }
    expect(Buffer.byteLength(JSON.stringify(icons))).toBeLessThan(15_000);
    expect(getCustomerIconAssets()).toEqual(getCustomerIconAssets());
    expect(Object.isFrozen(icons)).toBe(true);
  });

  it("preserves the exact upstream license alongside generated copies", () => {
    const root = dirname(
      createRequire(import.meta.url).resolve("lucide-static/package.json"),
    );
    const license = readFileSync(join(root, "LICENSE"), "utf8");
    expect(createHash("sha256").update(license).digest("hex")).toBe(
      "1e7290b35280a048667bbf0ebabac1c7fd52a75300e8b2946ac165715997f2bc",
    );
    expect(getCustomerIconAssets().notice).toContain(license);
    expect(getCustomerIconAssets().notice).toContain("lucide-static 0.468.0");
  });
});
