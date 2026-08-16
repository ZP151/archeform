import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { sha256HexUtf8 } from "../src/sha256.js";

/** FIPS 180-4 published vectors. */
const VECTORS: readonly { readonly input: string; readonly digest: string }[] =
  [
    {
      input: "",
      digest:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    {
      input: "abc",
      digest:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    },
    {
      input: "The quick brown fox jumps over the lazy dog",
      digest:
        "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    },
    {
      input: "hello world",
      digest:
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    },
  ];

describe("sha256HexUtf8", () => {
  it("matches the published FIPS 180-4 vectors", () => {
    for (const { input, digest } of VECTORS) {
      expect(sha256HexUtf8(input)).toBe(digest);
    }
  });

  it("matches node:crypto for ASCII, multi-byte UTF-8, surrogate pairs, and lone surrogates", () => {
    const inputs = [
      "héllo wörld",
      "费用审批流程",
      "emoji 🚀🎉 end",
      "lone \ud800 surrogate",
      "mixed ascii + café + 中文 + 🧑‍💻",
      "a".repeat(55), // one block boundary minus padding
      "b".repeat(56), // exact first block
      "c".repeat(57), // spills into the second block
      "d".repeat(120), // padding wraps across blocks
    ];
    for (const input of inputs) {
      const expected = createHash("sha256").update(input, "utf8").digest("hex");
      expect(sha256HexUtf8(input), input).toBe(expected);
    }
  });
});
