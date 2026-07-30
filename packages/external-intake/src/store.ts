import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import { z } from "zod";

import {
  canonicalJson,
  canonicalRecordDigest,
  digestBytes,
  type Sha256Digest,
} from "./canonical.js";
import {
  intakeContractPrimitives,
  parseIntakeReceipt,
  parseIntakeRecord,
  type IntakeReceiptV1,
  type IntakeRecordKind,
  type IntakeRecordV1,
} from "./contracts.js";

const blobKindSchema = z.enum(["snapshot", "evidence"]);
const recordKindSchema = z.enum([
  "request",
  "snapshot",
  "evidence",
  "candidate",
  "promotion",
  "receipt",
]);
const storedRecordRefSchema = z
  .object({
    kind: recordKindSchema,
    digest: intakeContractPrimitives.sha256DigestSchema,
  })
  .strict();

export type StoredRecordRef = z.infer<typeof storedRecordRefSchema>;
export type StoredBlobRef = {
  readonly kind: "snapshot" | "evidence";
  readonly digest: Sha256Digest;
};

function buffersEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return left.every((byte, index) => byte === right[index]);
}

export class ExternalIntakeStore {
  readonly #root: string;

  constructor(root: string) {
    if (root.length === 0) {
      throw new TypeError("External Intake store root is required.");
    }
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const rootStat = lstatSync(root);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw new TypeError(
        "External Intake store root must be a real directory.",
      );
    }
    this.#root = realpathSync.native(root);
  }

  putRecord(
    kind: Exclude<IntakeRecordKind, "receipt">,
    record: IntakeRecordV1,
  ): StoredRecordRef {
    const parsedKind = recordKindSchema.exclude(["receipt"]).parse(kind);
    const parsed = parseIntakeRecord(parsedKind, record);
    return this.#putRecord(parsedKind, parsed);
  }

  putBytes(kind: "snapshot" | "evidence", bytes: Uint8Array): StoredBlobRef {
    const parsedKind = blobKindSchema.parse(kind);
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError(
        "External Intake blobs must be raw Uint8Array bytes.",
      );
    }
    const digest = digestBytes(bytes);
    const hexadecimal = digest.slice("sha256:".length);
    const path = this.#managedPath(["blobs", parsedKind, `${hexadecimal}.bin`]);
    this.#writeExclusiveVerified(path, bytes, digest, false);
    return { kind: parsedKind, digest };
  }

  getRecord(ref: StoredRecordRef): IntakeRecordV1 {
    const parsedRef = storedRecordRefSchema.parse(ref);
    const hexadecimal = parsedRef.digest.slice("sha256:".length);
    const path = this.#managedPath([
      "records",
      parsedRef.kind,
      `${hexadecimal}.json`,
    ]);
    const bytes = this.#readRegularFile(path);
    if (digestBytes(bytes) !== parsedRef.digest) {
      throw new Error(
        "Stored record bytes do not match their immutable digest.",
      );
    }
    const input = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
    const parsed = parseIntakeRecord(parsedRef.kind, input);
    const canonicalBytes = new TextEncoder().encode(canonicalJson(parsed));
    if (!buffersEqual(bytes, canonicalBytes)) {
      throw new Error("Stored record is not canonical JSON.");
    }
    return parsed;
  }

  appendReceipt(jobId: string, receipt: IntakeReceiptV1): StoredRecordRef {
    const parsedJobId = intakeContractPrimitives.opaqueIdSchema.parse(jobId);
    const parsed = parseIntakeReceipt(receipt);
    if (parsed.jobId !== parsedJobId) {
      throw new Error("Receipt job ID does not match the append target.");
    }
    return this.#putRecord("receipt", parsed);
  }

  #putRecord(kind: IntakeRecordKind, record: IntakeRecordV1): StoredRecordRef {
    const digest = canonicalRecordDigest(record);
    const hexadecimal = digest.slice("sha256:".length);
    const path = this.#managedPath(["records", kind, `${hexadecimal}.json`]);
    const bytes = new TextEncoder().encode(canonicalJson(record));
    this.#writeExclusiveVerified(path, bytes, digest, true);
    return { kind, digest };
  }

  #managedPath(segments: readonly string[]): string {
    const path = resolve(this.#root, ...segments);
    const fromRoot = relative(this.#root, path);
    if (
      fromRoot === "" ||
      fromRoot === ".." ||
      fromRoot.startsWith(`..${sep}`) ||
      resolve(this.#root, fromRoot) !== path
    ) {
      throw new Error(
        "External Intake path escaped the configured quarantine root.",
      );
    }
    this.#ensureDirectory(dirname(path));
    return path;
  }

  #ensureDirectory(directory: string): void {
    const fromRoot = relative(this.#root, directory);
    const segments = fromRoot === "" ? [] : fromRoot.split(sep);
    let current = this.#root;
    for (const segment of segments) {
      current = resolve(current, segment);
      try {
        const stat = lstatSync(current);
        if (stat.isSymbolicLink() || !stat.isDirectory()) {
          throw new Error(
            `Managed quarantine directory is a symbolic link or special file: ${segment}.`,
          );
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        mkdirSync(current, { mode: 0o700 });
        const created = lstatSync(current);
        if (created.isSymbolicLink() || !created.isDirectory()) {
          throw new Error(
            "Managed quarantine directory creation was not safe.",
          );
        }
      }
    }
  }

  #readRegularFile(path: string): Uint8Array {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(
        "Managed quarantine entry is a symbolic link or special file.",
      );
    }
    return readFileSync(path);
  }

  #writeExclusiveVerified(
    path: string,
    bytes: Uint8Array,
    digest: Sha256Digest,
    canonicalRecord: boolean,
  ): void {
    try {
      writeFileSync(path, bytes, {
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      const existing = this.#readRegularFile(path);
      if (!buffersEqual(existing, bytes) || digestBytes(existing) !== digest) {
        throw new Error(
          "Existing immutable quarantine entry differs from requested bytes.",
        );
      }
      return;
    }

    const stored = this.#readRegularFile(path);
    if (!buffersEqual(stored, bytes) || digestBytes(stored) !== digest) {
      throw new Error("Quarantine write verification failed.");
    }
    if (canonicalRecord) {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(stored);
      if (canonicalJson(JSON.parse(decoded) as unknown) !== decoded) {
        throw new Error("Quarantine record write was not canonical JSON.");
      }
    }
  }
}
