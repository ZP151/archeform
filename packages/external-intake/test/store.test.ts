import {
  existsSync,
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
  type ExternalSourceAcquisitionV1,
  type IntakeReceiptV1,
  type IntakeRequestV1,
  type SourceSnapshotV1,
  type StoredRecordRef,
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
const digest = `sha256:${"a".repeat(64)}` as const;
const otherDigest = `sha256:${"b".repeat(64)}` as const;
const validAcquisition: ExternalSourceAcquisitionV1 = {
  apiVersion: "factory.external-source-acquisition/v1",
  createdAt: "2026-07-31T00:00:00.000Z",
  producerVersion: "0.1.0",
  parentDigests: [digest, otherDigest],
  sourceRequestDigest: digest,
  source: {
    canonicalRepositoryUrl: "https://github.com/example/project.git",
    requestedRef: "v1.0.0",
    resolvedCommit: "c".repeat(40),
  },
  snapshot: {
    recordDigest: otherDigest,
    archiveDigest: digest,
    treeDigest: otherDigest,
    entryCount: 2,
    declaredBytes: 512,
  },
  licence: {
    primaryPaths: ["LICENSE"],
    textDigests: [digest],
  },
  notices: [{ path: "NOTICE", digest: otherDigest, required: true }],
  provenance: [
    {
      url: "https://github.com/example/project/archive/cccccccccccccccccccccccccccccccccccccccc.tar.gz",
      retrievedAt: "2026-07-31T00:00:00.000Z",
      digest,
    },
  ],
  manualStatus: "unreviewed",
  acquisitionState: "acquired",
};

function recordPath(root: string, ref: StoredRecordRef): string {
  return join(root, "records", ref.kind, `${ref.digest.slice(7)}.json`);
}

function storeAcquisitionParents(
  store: ExternalIntakeStore,
  options: {
    readonly request?: IntakeRequestV1;
    readonly snapshotParentDigests?: SourceSnapshotV1["parentDigests"];
  } = {},
): {
  readonly acquisition: ExternalSourceAcquisitionV1;
  readonly requestRef: StoredRecordRef;
  readonly snapshotRef: StoredRecordRef;
} {
  const request = options.request ?? validRequest;
  const requestRef = store.putRecord("request", request);
  const snapshot: SourceSnapshotV1 = {
    apiVersion: "factory.external-source-snapshot/v1",
    createdAt: "2026-07-31T00:00:01.000Z",
    producerVersion: "0.1.0",
    parentDigests: options.snapshotParentDigests ?? [requestRef.digest],
    repositoryUrl: request.source.canonicalRepositoryUrl,
    requestedRef: request.source.requestedRef,
    resolvedCommit: validAcquisition.source.resolvedCommit,
    retrievedAt: "2026-07-31T00:00:01.000Z",
    archiveDigest: validAcquisition.snapshot.archiveDigest,
    treeDigest: validAcquisition.snapshot.treeDigest,
    includedPaths: ["LICENSE", "NOTICE"],
    excludedPaths: [],
    originEvidence: validAcquisition.provenance,
  };
  const snapshotRef = store.putRecord("snapshot", snapshot);
  const acquisition: ExternalSourceAcquisitionV1 = {
    ...validAcquisition,
    parentDigests: [requestRef.digest, snapshotRef.digest],
    sourceRequestDigest: requestRef.digest,
    source: {
      ...validAcquisition.source,
      canonicalRepositoryUrl: request.source.canonicalRepositoryUrl,
      requestedRef: request.source.requestedRef,
    },
    snapshot: {
      ...validAcquisition.snapshot,
      recordDigest: snapshotRef.digest,
    },
  };
  return { acquisition, requestRef, snapshotRef };
}

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
  it("stores acquisition records under a distinct immutable kind", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const { acquisition } = storeAcquisitionParents(store);

    const ref = store.putRecord("acquisition", acquisition);

    expect(ref).toEqual({
      kind: "acquisition",
      digest: canonicalRecordDigest(acquisition),
    });
    expect(store.getRecord(ref)).toEqual(acquisition);
    expect(
      lstatSync(
        join(root, "records", "acquisition", `${ref.digest.slice(7)}.json`),
      ).isFile(),
    ).toBe(true);
    expect(() => store.putRecord("candidate", acquisition as never)).toThrow();
    expect(() => store.putRecord("evidence", acquisition as never)).toThrow();
  });

  it("requires exactly the request and snapshot acquisition parents", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const { acquisition } = storeAcquisitionParents(store);

    expect(() =>
      store.putRecord("acquisition", {
        ...acquisition,
        parentDigests: [
          ...acquisition.parentDigests,
          `sha256:${"f".repeat(64)}`,
        ],
      }),
    ).toThrow(/parent/i);
  });

  it.each([
    ["request", "missing"],
    ["request", "tampered"],
    ["snapshot", "missing"],
    ["snapshot", "tampered"],
  ] as const)(
    "rejects a %s parent whose backing record is %s",
    (kind, state) => {
      const root = tempRoot();
      const store = new ExternalIntakeStore(root);
      const { acquisition, requestRef, snapshotRef } =
        storeAcquisitionParents(store);
      const ref = kind === "request" ? requestRef : snapshotRef;

      if (state === "missing") {
        rmSync(recordPath(root, ref));
      } else {
        writeFileSync(recordPath(root, ref), "{}", "utf8");
      }

      expect(() => store.putRecord("acquisition", acquisition)).toThrow(
        /parent|digest|immutable/i,
      );
    },
  );

  it("rejects acquisition parent digests stored under the wrong record kinds", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const { acquisition, requestRef, snapshotRef } =
      storeAcquisitionParents(store);

    expect(() =>
      store.putRecord("acquisition", {
        ...acquisition,
        parentDigests: [snapshotRef.digest, requestRef.digest],
        sourceRequestDigest: snapshotRef.digest,
        snapshot: {
          ...acquisition.snapshot,
          recordDigest: requestRef.digest,
        },
      }),
    ).toThrow(/request|snapshot|parent/i);
  });

  it.each([
    "repository-url",
    "requested-ref",
    "resolved-commit",
    "archive-digest",
    "tree-digest",
  ] as const)("rejects acquisition %s mismatches", (mismatch) => {
    const store = new ExternalIntakeStore(tempRoot());
    const { acquisition } = storeAcquisitionParents(store);
    let altered: ExternalSourceAcquisitionV1;

    switch (mismatch) {
      case "repository-url":
        altered = {
          ...acquisition,
          source: {
            ...acquisition.source,
            canonicalRepositoryUrl: "https://github.com/example/different.git",
          },
        };
        break;
      case "requested-ref":
        altered = {
          ...acquisition,
          source: { ...acquisition.source, requestedRef: "v9.9.9" },
        };
        break;
      case "resolved-commit":
        altered = {
          ...acquisition,
          source: { ...acquisition.source, resolvedCommit: "d".repeat(40) },
        };
        break;
      case "archive-digest":
        altered = {
          ...acquisition,
          snapshot: {
            ...acquisition.snapshot,
            archiveDigest: `sha256:${"e".repeat(64)}`,
          },
        };
        break;
      case "tree-digest":
        altered = {
          ...acquisition,
          snapshot: {
            ...acquisition.snapshot,
            treeDigest: `sha256:${"e".repeat(64)}`,
          },
        };
        break;
    }

    expect(() => store.putRecord("acquisition", altered)).toThrow(
      /match|link/i,
    );
  });

  it("rejects a snapshot that is not linked to the acquisition request", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const { acquisition } = storeAcquisitionParents(store, {
      snapshotParentDigests: [`sha256:${"f".repeat(64)}`],
    });

    expect(() => store.putRecord("acquisition", acquisition)).toThrow(
      /request|link/i,
    );
  });

  it("rejects a resolved commit that conflicts with the request expectation", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const request: IntakeRequestV1 = {
      ...validRequest,
      source: {
        ...validRequest.source,
        expectedCommit: "d".repeat(40),
      },
    };
    const { acquisition } = storeAcquisitionParents(store, { request });

    expect(() => store.putRecord("acquisition", acquisition)).toThrow(
      /commit|request/i,
    );
  });

  it("rejects a full-SHA requested ref that differs from the resolved commit without an expected commit", () => {
    const store = new ExternalIntakeStore(tempRoot());
    const request: IntakeRequestV1 = {
      ...validRequest,
      source: {
        ...validRequest.source,
        requestedRef: "d".repeat(40),
      },
    };
    const { acquisition } = storeAcquisitionParents(store, { request });

    expect(request.source).not.toHaveProperty("expectedCommit");
    expect(() => store.putRecord("acquisition", acquisition)).toThrow(
      /commit|request/i,
    );
  });

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

  it("does not publish a receipt index when backing verification fails", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const receipt = receiptAt(1);
    const digest = canonicalRecordDigest(receipt);
    const recordPath = join(
      root,
      "records",
      "receipt",
      `${digest.slice(7)}.json`,
    );
    mkdirSync(join(root, "records", "receipt"), { recursive: true });
    writeFileSync(recordPath, "{}", "utf8");

    expect(() => store.appendReceipt("job-1", receipt)).toThrow(
      /immutable|digest|existing/i,
    );
    expect(existsSync(join(root, "jobs", "job-1", "receipts", "1.json"))).toBe(
      false,
    );
  });

  it("rejects chain extension when indexed backing receipt is missing", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const first = store.appendReceipt("job-1", receiptAt(1));
    rmSync(join(root, "records", "receipt", `${first.digest.slice(7)}.json`));

    expect(() =>
      store.appendReceipt("job-1", receiptAt(2, [first.digest])),
    ).toThrow(/indexed backing receipt/i);
    expect(existsSync(join(root, "jobs", "job-1", "receipts", "2.json"))).toBe(
      false,
    );
  });

  it("rejects chain extension when indexed backing receipt is tampered", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const first = store.appendReceipt("job-1", receiptAt(1));
    writeFileSync(
      join(root, "records", "receipt", `${first.digest.slice(7)}.json`),
      "{}",
      "utf8",
    );

    expect(() =>
      store.appendReceipt("job-1", receiptAt(2, [first.digest])),
    ).toThrow(/indexed backing receipt/i);
    expect(existsSync(join(root, "jobs", "job-1", "receipts", "2.json"))).toBe(
      false,
    );
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
