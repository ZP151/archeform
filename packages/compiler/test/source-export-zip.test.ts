import { describe, expect, it } from "vitest";

import { buildSourceZip } from "../src/targets/source/export-zip.js";

const decoder = new TextDecoder();

interface ParsedEntry {
  path: string;
  content: string;
  crc32: number;
}

function parseZip(bytes: Uint8Array): ParsedEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Locate EOCD by scanning backward for the signature.
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  expect(eocdOffset).toBeGreaterThanOrEqual(0);

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);

  const entries: ParsedEntry[] = [];
  let offset = centralOffset;
  for (let n = 0; n < entryCount; n += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    const method = view.getUint16(offset + 10, true);
    const crc32 = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    offset += 46 + nameLength;

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);

    expect(method).toBe(0); // stored
    entries.push({ path: name, content: decoder.decode(data), crc32 });
  }

  return entries;
}

function crc32(bytes: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

describe("buildSourceZip", () => {
  const files = [
    { path: "web/index.html", content: "<html></html>\n" },
    { path: "web/app.mjs", content: "console.log(1);\n" },
  ];

  it("produces a deterministic, path-sorted, round-trippable archive", () => {
    const zip = buildSourceZip(files);
    expect(buildSourceZip(files)).toEqual(zip);

    const entries = parseZip(zip);
    expect(entries.map(({ path }) => path)).toEqual([
      "web/app.mjs",
      "web/index.html",
    ]);
    expect(entries[0].content).toBe("console.log(1);\n");
    expect(entries[1].content).toBe("<html></html>\n");
    for (const entry of entries) {
      expect(entry.crc32).toBe(crc32(new TextEncoder().encode(entry.content)));
    }
  });

  it("rejects unsafe and duplicate paths", () => {
    expect(() =>
      buildSourceZip([{ path: "../escape.ts", content: "x" }]),
    ).toThrow(/Generated output path/);

    expect(() =>
      buildSourceZip([
        { path: "a.ts", content: "x" },
        { path: "a.ts", content: "y" },
      ]),
    ).toThrow(/collision/);
  });
});
