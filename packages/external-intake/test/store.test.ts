import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ExternalIntakeStore,
  canonicalRecordDigest,
  type IntakeReceiptV1,
} from "../src/index.js";

const roots: string[] = [];
const validRequest = {
  apiVersion: "factory.external-intake-request/v1" as const,
  createdAt: "2026-07-31T00:00:00.000Z",
  producerVersion: "0.1.0",
  parentDigests: [],
  source: {
    canonicalRepositoryUrl: "https://github.com/example/project.git",
    requestedRef: "v1.0.0",
  },
  classification: "source-study" as const,
  requestedModules: [],
  allowNetworkRetrieval: true as const,
};

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "factory-external-intake-"));
  roots.push(root);
  return root;
}

function receiptAt(
  sequence: number,
  parentDigests: IntakeReceiptV1["parentDigests"] = [],
  code = `receipt-${sequence}`,
): IntakeReceiptV1 {
  return {
    apiVersion: "factory.external-intake-receipt/v1",
    jobId: "job-1",
    sequence,
    createdAt: `2026-07-31T00:00:0${sequence}.000Z`,
    producerVersion: "0.1.0",
    parentDigests,
    status: sequence === 1 ? "requested" : "resolved",
    code,
    recordDigests: [],
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("ExternalIntakeStore", () => {
  it("stores canonical records immutably and returns matching writes idempotently", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);

    const first = store.putRecord("request", validRequest);
    const second = store.putRecord("request", structuredClone(validRequest));

    expect(first).toEqual(second);
    expect(first.digest).toBe(canonicalRecordDigest(validRequest));
    expect(store.getRecord(first)).toEqual(validRequest);
    expect(
      lstatSync(
        join(root, "records", "request", `${first.digest.slice(7)}.json`),
      ).isFile(),
    ).toBe(true);
  });

  it("detects tampering instead of overwriting an existing record identity", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const ref = store.putRecord("request", validRequest);
    const path = join(
      root,
      "records",
      "request",
      `${ref.digest.slice(7)}.json`,
    );
    writeFileSync(path, "{}", "utf8");

    expect(() => store.putRecord("request", validRequest)).toThrow(
      /immutable|digest|existing/i,
    );
    expect(readFileSync(path, "utf8")).toBe("{}");
  });

  it("content-addresses raw bytes and refuses altered existing blobs", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const bytes = new Uint8Array([0, 10, 13, 255]);
    const ref = store.putBytes("snapshot", bytes);
    const path = join(root, "blobs", "snapshot", `${ref.digest.slice(7)}.bin`);

    expect(store.putBytes("snapshot", bytes)).toEqual(ref);
    writeFileSync(path, new Uint8Array([1, 2, 3]));
    expect(() => store.putBytes("snapshot", bytes)).toThrow(
      /immutable|digest|existing/i,
    );
  });

  it("rejects opaque-ID escapes and forged record references", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const receipt: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      jobId: "job-1",
      sequence: 1,
      createdAt: "2026-07-31T00:00:00.000Z",
      producerVersion: "0.1.0",
      parentDigests: [],
      status: "requested",
      code: "request-accepted",
      recordDigests: [],
    };

    expect(() => store.appendReceipt("../escape", receipt)).toThrow();
    expect(() =>
      store.getRecord({
        kind: "../request",
        digest: canonicalRecordDigest(validRequest),
      } as never),
    ).toThrow();
    expect(() =>
      store.getRecord({ kind: "request", digest: "sha256:../escape" } as never),
    ).toThrow();
  });

  it("appends strict redacted receipts without an update or delete API", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const receipt: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      jobId: "job-1",
      sequence: 1,
      createdAt: "2026-07-31T00:00:00.000Z",
      producerVersion: "0.1.0",
      parentDigests: [],
      status: "blocked",
      code: "unsafe-path",
      recordDigests: [],
    };

    const ref = store.appendReceipt("job-1", receipt);
    expect(store.getRecord(ref)).toEqual(receipt);
    expect(store).not.toHaveProperty("update");
    expect(store).not.toHaveProperty("delete");
    expect(() =>
      store.appendReceipt("job-1", {
        ...receipt,
        rawResponse: "private",
      } as never),
    ).toThrow();
  });

  it("indexes each job receipt sequence and retries identical content idempotently", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const receipt = receiptAt(1);

    const first = store.appendReceipt("job-1", receipt);
    const retry = store.appendReceipt("job-1", structuredClone(receipt));
    const index = JSON.parse(
      readFileSync(join(root, "jobs", "job-1", "receipts", "1.json"), "utf8"),
    ) as unknown;

    expect(retry).toEqual(first);
    expect(index).toEqual({
      apiVersion: "factory.external-intake-receipt-index/v1",
      createdAt: receipt.createdAt,
      producerVersion: receipt.producerVersion,
      parentDigests: [first.digest],
      jobId: "job-1",
      sequence: 1,
      receiptDigest: first.digest,
    });
  });

  it("rejects conflicting content for an existing job receipt sequence", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const receipt = receiptAt(1);
    const first = store.appendReceipt("job-1", receipt);

    expect(() =>
      store.appendReceipt("job-1", {
        ...receipt,
        code: "different-outcome",
      }),
    ).toThrow(/receipt sequence conflict/i);
    expect(store.getRecord(first)).toEqual(receipt);
  });

  it("rejects missing, out-of-order, and unlinked job receipt sequences", () => {
    const store = new ExternalIntakeStore(tempRoot());

    expect(() => store.appendReceipt("job-1", receiptAt(2))).toThrow(
      /out of order/i,
    );
    const first = store.appendReceipt("job-1", receiptAt(1));
    expect(() => store.appendReceipt("job-1", receiptAt(3))).toThrow(
      /out of order/i,
    );
    expect(() => store.appendReceipt("job-1", receiptAt(2))).toThrow(
      /previous receipt digest/i,
    );

    const second = store.appendReceipt("job-1", receiptAt(2, [first.digest]));
    expect(store.getRecord(second)).toMatchObject({
      jobId: "job-1",
      sequence: 2,
      parentDigests: [first.digest],
    });
  });

  it("rejects symlinks in the managed quarantine path", () => {
    const root = tempRoot();
    const outside = tempRoot();
    mkdirSync(join(root, "records"), { recursive: true });
    symlinkSync(outside, join(root, "records", "request"), "junction");
    const store = new ExternalIntakeStore(root);

    expect(() => store.putRecord("request", validRequest)).toThrow(
      /symbolic|link/i,
    );
  });
});
