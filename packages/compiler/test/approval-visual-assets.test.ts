import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  approvalVisualAssets,
  approvalVisualAssetRegistry,
  selectApprovalRecordMaterial,
  validateApprovalVisualAssets,
} from "../src/approval-visual-assets.js";

describe("approval visual assets", () => {
  it("rejects corrupted, replaced, oversized or noncanonical material bytes", () => {
    const key = "approval-workspace-material";
    const original = approvalVisualAssets[key];
    const changed = Buffer.from(original.base64, "base64");
    changed[changed.length - 2] ^= 1;
    const mutations = [
      { base64: original.base64 + "\n" },
      { base64: "not-an-image" },
      { byteLength: original.byteLength + 1 },
      { byteLength: 97 * 1024 },
      { width: 1 },
      { license: "unknown" },
      { provenance: "external" },
      { role: "expense-record" },
      { role: "unknown" },
      { extra: true },
      {
        base64: changed.toString("base64"),
        sha256: createHash("sha256").update(changed).digest("hex"),
      },
    ];
    for (const mutation of mutations) {
      const candidate = {
        ...approvalVisualAssets,
        [key]: { ...original, ...mutation },
      };
      expect(() =>
        validateApprovalVisualAssets(candidate as typeof approvalVisualAssets),
      ).toThrow();
    }
    for (const kind of ["EXIF", "XMP ", "ICCP", "ANIM", "ANMF"]) {
      const chunk = Buffer.alloc(8);
      chunk.write(kind);
      const bytes = Buffer.concat([
        Buffer.from(original.base64, "base64"),
        chunk,
      ]);
      bytes.writeUInt32LE(bytes.length - 8, 4);
      const candidate = {
        ...approvalVisualAssets,
        [key]: {
          ...original,
          base64: bytes.toString("base64"),
          byteLength: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      };
      expect(() => validateApprovalVisualAssets(candidate)).toThrow();
    }
  });
  it("admits only the fixed first-party WebP manifest", () => {
    expect(approvalVisualAssetRegistry).toEqual({
      key: "approval-visual-assets",
      version: "1.0.0",
      ownership: "factory-authored",
      license: "UNLICENSED",
      assets: Object.keys(approvalVisualAssets),
    });
    expect(validateApprovalVisualAssets(approvalVisualAssets)).toBeUndefined();
    expect(Object.keys(approvalVisualAssets)).toEqual([
      "approval-workspace-material",
      "approval-expense-material",
    ]);
    for (const asset of Object.values(approvalVisualAssets)) {
      const bytes = Buffer.from(asset.base64, "base64");
      expect(asset.mediaType).toBe("image/webp");
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(bytes.byteLength).toBe(asset.byteLength);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        asset.sha256,
      );
    }
  });

  it("uses a tile image only for exact approved field signatures", () => {
    const exact = [
      { key: "notes", type: "text", required: false },
      {
        key: "category",
        type: "enum",
        required: true,
        values: ["travel", "meals", "software", "office", "other"],
      },
      { key: "amount", type: "decimal", required: true },
      { key: "receipt", type: "url", required: false },
      { key: "date", type: "date", required: true },
      {
        key: "status",
        type: "enum",
        required: true,
        values: ["draft", "submitted", "approved", "rejected"],
      },
    ] as const;
    expect(selectApprovalRecordMaterial([...exact].reverse())).toBe(
      "approval-expense-material",
    );
    for (const candidate of [
      exact.slice(1),
      [...exact, { key: "extra", type: "text", required: false }],
      [...exact, exact[0]],
      exact.map((field) =>
        field.key === "amount" ? { ...field, type: "integer" } : field,
      ),
      exact.map((field) =>
        field.key === "receipt" ? { ...field, required: true } : field,
      ),
      exact.map((field) =>
        field.key === "category"
          ? { ...field, values: [...field.values].reverse() }
          : field,
      ),
    ]) {
      expect(selectApprovalRecordMaterial(candidate)).toBeUndefined();
    }
  });
});
