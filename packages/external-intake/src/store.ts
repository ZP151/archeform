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
  parseExternalSourceAcquisition,
  parseIntakeReceipt,
  parseIntakeRecord,
  type ExternalSourceAcquisitionV1,
  type IntakeReceiptV1,
  type IntakeRecordKind,
  type IntakeRecordV1,
} from "./contracts.js";

const blobKindSchema = z.enum(["snapshot", "evidence"]);
const recordKindSchema = z.enum([
  "request",
  "snapshot",
  "acquisition",
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
const receiptIndexSchema = z
  .object({
    apiVersion: z.literal("factory.external-intake-receipt-index/v1"),
    createdAt: intakeContractPrimitives.canonicalTimestampSchema,
    producerVersion: intakeContractPrimitives.versionSchema,
    parentDigests: z
      .array(intakeContractPrimitives.sha256DigestSchema)
      .length(1),
    jobId: intakeContractPrimitives.opaqueIdSchema,
    sequence: z.number().int().positive().finite(),
    receiptDigest: intakeContractPrimitives.sha256DigestSchema,
  })
  .strict()
  .refine(
    ({ parentDigests, receiptDigest }) => parentDigests[0] === receiptDigest,
    "Receipt index parent must be its receipt digest.",
  );

type ReceiptIndexV1 = z.infer<typeof receiptIndexSchema>;

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
    if (parsedKind === "acquisition") {
      const parsed = parseExternalSourceAcquisition(record);
      this.#validateAcquisitionParents(parsed);
      return this.#putRecord(parsedKind, parsed);
    }
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
    if (parsed.sequence > 1) {
      const previous = this.#readReceiptIndex(parsedJobId, parsed.sequence - 1);
      if (previous === null) {
        throw new Error(
          `Receipt sequence ${parsed.sequence} is out of order for ${parsedJobId}.`,
        );
      }
      let previousReceipt: IntakeReceiptV1;
      try {
        previousReceipt = parseIntakeReceipt(
          this.getRecord({
            kind: "receipt",
            digest: previous.receiptDigest,
          }),
        );
      } catch {
        throw new Error(
          `Indexed backing receipt ${parsedJobId}#${previous.sequence} is missing or invalid.`,
        );
      }
      if (
        previousReceipt.jobId !== parsedJobId ||
        previousReceipt.sequence !== previous.sequence ||
        canonicalRecordDigest(previousReceipt) !== previous.receiptDigest
      ) {
        throw new Error(
          `Indexed backing receipt ${parsedJobId}#${previous.sequence} is inconsistent.`,
        );
      }
      if (!parsed.parentDigests.includes(previous.receiptDigest)) {
        throw new Error(
          `Receipt sequence ${parsed.sequence} must include the previous receipt digest.`,
        );
      }
    }

    const recordRef = this.#putRecord("receipt", parsed);
    const receiptDigest = recordRef.digest;
    const index: ReceiptIndexV1 = {
      apiVersion: "factory.external-intake-receipt-index/v1",
      createdAt: parsed.createdAt,
      producerVersion: parsed.producerVersion,
      parentDigests: [receiptDigest],
      jobId: parsedJobId,
      sequence: parsed.sequence,
      receiptDigest,
    };
    const indexBytes = new TextEncoder().encode(canonicalJson(index));
    const indexPath = this.#managedPath([
      "jobs",
      parsedJobId,
      "receipts",
      `${parsed.sequence}.json`,
    ]);
    this.#writeExclusiveVerified(
      indexPath,
      indexBytes,
      digestBytes(indexBytes),
      true,
      `Receipt sequence conflict for ${parsedJobId}#${parsed.sequence}.`,
    );
    return recordRef;
  }

  #readReceiptIndex(jobId: string, sequence: number): ReceiptIndexV1 | null {
    const path = this.#managedPath([
      "jobs",
      jobId,
      "receipts",
      `${sequence}.json`,
    ]);
    let bytes: Uint8Array;
    try {
      bytes = this.#readRegularFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = receiptIndexSchema.parse(JSON.parse(decoded) as unknown);
    if (
      parsed.jobId !== jobId ||
      parsed.sequence !== sequence ||
      canonicalJson(parsed) !== decoded
    ) {
      throw new Error("Receipt sequence index is not canonical or consistent.");
    }
    return parsed;
  }

  #validateAcquisitionParents(acquisition: ExternalSourceAcquisitionV1): void {
    const expectedParents = [
      acquisition.sourceRequestDigest,
      acquisition.snapshot.recordDigest,
    ];
    if (
      acquisition.parentDigests.length !== expectedParents.length ||
      expectedParents.some(
        (digest) => !acquisition.parentDigests.includes(digest),
      )
    ) {
      throw new Error(
        "Acquisition must declare exactly its request and snapshot parents.",
      );
    }

    const request = this.#readAcquisitionParent(
      "request",
      acquisition.sourceRequestDigest,
    );
    const snapshot = this.#readAcquisitionParent(
      "snapshot",
      acquisition.snapshot.recordDigest,
    );

    if (
      request.apiVersion !== "factory.external-intake-request/v1" ||
      snapshot.apiVersion !== "factory.external-source-snapshot/v1"
    ) {
      throw new Error(
        "Acquisition parents must use the request and snapshot record kinds.",
      );
    }
    if (
      request.source.canonicalRepositoryUrl !==
        acquisition.source.canonicalRepositoryUrl ||
      snapshot.repositoryUrl !== acquisition.source.canonicalRepositoryUrl
    ) {
      throw new Error(
        "Acquisition repository URL does not match its request and snapshot parents.",
      );
    }
    if (
      request.source.requestedRef !== acquisition.source.requestedRef ||
      snapshot.requestedRef !== acquisition.source.requestedRef
    ) {
      throw new Error(
        "Acquisition requested ref does not match its request and snapshot parents.",
      );
    }
    if (
      snapshot.resolvedCommit !== acquisition.source.resolvedCommit ||
      (/^[a-f0-9]{40}$/u.test(request.source.requestedRef) &&
        request.source.requestedRef !== acquisition.source.resolvedCommit) ||
      (request.source.expectedCommit !== undefined &&
        request.source.expectedCommit !== acquisition.source.resolvedCommit)
    ) {
      throw new Error(
        "Acquisition resolved commit does not match its request and snapshot parents.",
      );
    }
    if (
      snapshot.archiveDigest !== acquisition.snapshot.archiveDigest ||
      snapshot.treeDigest !== acquisition.snapshot.treeDigest
    ) {
      throw new Error(
        "Acquisition archive or tree digest does not match its snapshot parent.",
      );
    }
    if (!snapshot.parentDigests.includes(acquisition.sourceRequestDigest)) {
      throw new Error(
        "Acquisition snapshot parent is not linked to its request parent.",
      );
    }
  }

  #readAcquisitionParent(
    kind: "request" | "snapshot",
    digest: Sha256Digest,
  ): IntakeRecordV1 {
    try {
      return this.getRecord({ kind, digest });
    } catch {
      throw new Error(
        `Acquisition ${kind} parent is absent, tampered, or stored under the wrong kind.`,
      );
    }
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
    conflictMessage = "Existing immutable quarantine entry differs from requested bytes.",
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
        throw new Error(conflictMessage);
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
