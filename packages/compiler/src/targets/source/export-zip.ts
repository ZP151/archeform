import {
  type GeneratedFile,
  assertSafeGeneratedFileSet,
} from "../../core/generated-files.js";

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

function encodePath(path: string): Uint8Array {
  return encoder.encode(path);
}

// A fixed 1980-01-01 00:00:00 DOS timestamp keeps output byte-identical.
const DOS_DATE = 0x21;
const DOS_TIME = 0;

interface EntryLayout {
  readonly path: string;
  readonly name: Uint8Array;
  readonly data: Uint8Array;
  readonly checksum: number;
  readonly localHeaderOffset: number;
}

/**
 * Serializes a checked generated-file set into a deterministic ZIP archive
 * using the stored method (no compression), path-sorted entries, a fixed DOS
 * timestamp, and a hand-rolled CRC-32. Equal input produces byte-identical
 * output. Unsafe or duplicate paths are rejected before any byte is written.
 */
export function buildSourceZip(files: readonly GeneratedFile[]): Uint8Array {
  assertSafeGeneratedFileSet(files);

  const sorted = [...files].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );

  const entries: EntryLayout[] = [];
  let localTotal = 0;
  for (const file of sorted) {
    const name = encodePath(file.path);
    const data = encoder.encode(file.content);
    const checksum = crc32(data);
    const headerSize = 30 + name.length;
    entries.push({
      path: file.path,
      name,
      data,
      checksum,
      localHeaderOffset: localTotal,
    });
    localTotal += headerSize + data.length;
  }

  let centralSize = 0;
  for (const entry of entries) {
    centralSize += 46 + entry.name.length;
  }

  const output = new Uint8Array(localTotal + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;

  for (const entry of entries) {
    const name = entry.name;
    const headerSize = 30 + name.length;

    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0, true);
    view.setUint16(offset + 8, 0, true); // stored
    view.setUint16(offset + 10, DOS_TIME, true);
    view.setUint16(offset + 12, DOS_DATE, true);
    view.setUint32(offset + 14, entry.checksum, true);
    view.setUint32(offset + 18, entry.data.length, true);
    view.setUint32(offset + 22, entry.data.length, true);
    view.setUint16(offset + 26, name.length, true);
    view.setUint16(offset + 28, 0, true);
    output.set(name, offset + 30);
    output.set(entry.data, offset + 30 + name.length);
    offset += headerSize + entry.data.length;
  }

  const centralOffset = offset;
  for (const entry of entries) {
    const name = entry.name;

    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, 0, true); // stored
    view.setUint16(offset + 12, DOS_TIME, true);
    view.setUint16(offset + 14, DOS_DATE, true);
    view.setUint32(offset + 16, entry.checksum, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, name.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, entry.localHeaderOffset, true);
    output.set(name, offset + 46);
    offset += 46 + name.length;
  }

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, centralOffset, true);
  view.setUint16(offset + 20, 0, true);

  return output;
}
