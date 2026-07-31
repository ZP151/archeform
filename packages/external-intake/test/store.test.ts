import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  ExternalIntakeStore,
  canonicalRecordDigest,
  digestBytes,
  type CandidateCapabilityV1,
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

interface AtomicCandidateTransitionStore extends ExternalIntakeStore {
  commitCandidateTransition(input: {
    readonly jobId: string;
    readonly expectedCreationReceipt: StoredRecordRef;
    readonly expectedCandidate: StoredRecordRef;
    readonly candidate: CandidateCapabilityV1;
    readonly receipt: IntakeReceiptV1;
    readonly evidenceBytes?: Uint8Array;
  }): {
    readonly candidate: StoredRecordRef;
    readonly receipt: StoredRecordRef;
  };
}

function candidateTransitionFixture(store: ExternalIntakeStore) {
  const candidate: CandidateCapabilityV1 = {
    apiVersion: "factory.candidate-capability/v1",
    createdAt: "2026-07-31T00:00:00.000Z",
    producerVersion: "0.1.0",
    parentDigests: [digest, otherDigest],
    id: "safe-adapter",
    version: "1.0.0",
    status: "quarantined",
    sourceSnapshotDigest: digest,
    evidenceDigest: otherDigest,
    proposedFactoryKey: "candidate.safe-adapter",
    proposedClassification: "provider-adapter",
    selectedModules: [],
    allowedOutputs: ["manifest", "fixture", "adapter", "conformance-plan"],
    prohibited: [
      "capability-selection",
      "golden-registration",
      "graph-mutation",
      "compilation",
    ],
    candidateManifestDigest: digest,
    fixtureDigest: otherDigest,
  };
  const candidateRef = store.putRecord("candidate", candidate);
  const jobId = "candidate-safe-adapter";
  const creationReceipt = store.appendReceipt(jobId, {
    apiVersion: "factory.external-intake-receipt/v1",
    createdAt: candidate.createdAt,
    producerVersion: candidate.producerVersion,
    parentDigests: [candidateRef.digest],
    jobId,
    sequence: 1,
    status: "candidate-ready",
    code: "candidate-quarantined",
    recordDigests: [candidateRef.digest, otherDigest],
  });
  const transition = (status: "blocked" | "rejected") => {
    const terminal: CandidateCapabilityV1 = {
      ...candidate,
      parentDigests: [...candidate.parentDigests, candidateRef.digest],
      status,
    };
    const terminalDigest = canonicalRecordDigest(terminal);
    const receipt: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: candidate.createdAt,
      producerVersion: candidate.producerVersion,
      parentDigests: [creationReceipt.digest, terminalDigest],
      jobId,
      sequence: 2,
      status,
      code: `candidate-${status}`,
      recordDigests: [terminalDigest, otherDigest],
    };
    return { terminal, receipt };
  };
  const conformanceTransition = () => {
    const evidenceBytes = new TextEncoder().encode("validated-conformance");
    const evidenceDigest = digestBytes(evidenceBytes);
    const terminal: CandidateCapabilityV1 = {
      ...candidate,
      parentDigests: [
        ...candidate.parentDigests,
        candidateRef.digest,
        evidenceDigest,
      ],
      status: "conformance-passed",
      conformanceResultDigest: evidenceDigest,
    };
    const terminalDigest = canonicalRecordDigest(terminal);
    const receipt: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: candidate.createdAt,
      producerVersion: candidate.producerVersion,
      parentDigests: [creationReceipt.digest, terminalDigest],
      jobId,
      sequence: 2,
      status: "candidate-ready",
      code: "candidate-conformance-passed",
      recordDigests: [terminalDigest, evidenceDigest, otherDigest],
    };
    return { terminal, receipt, evidenceBytes, evidenceDigest };
  };
  return {
    jobId,
    candidateRef,
    creationReceipt,
    transition,
    conformanceTransition,
  };
}

async function waitForStoreRacePath(path: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for store race barrier '${path}'.`);
    }
    await delay(10);
  }
}

function runStoreRaceProcess(
  root: string,
  workerId: string,
  mode: "cas" | "append",
  inputPath: string,
  readyPath: string,
  releasePath: string,
  resultPath: string,
) {
  const vitestCli = createRequire(import.meta.url).resolve("vitest/vitest.mjs");
  const testFile = fileURLToPath(import.meta.url);
  const child = spawn(
    process.execPath,
    [
      vitestCli,
      "run",
      testFile,
      "--testNamePattern",
      "executes one child-process atomic Candidate terminal attempt",
    ],
    {
      cwd: dirname(dirname(testFile)),
      env: {
        ...process.env,
        FACTORY_STORE_RACE_CHILD: workerId,
        FACTORY_STORE_RACE_MODE: mode,
        FACTORY_STORE_RACE_ROOT: root,
        FACTORY_STORE_RACE_INPUT_PATH: inputPath,
        FACTORY_STORE_RACE_READY_PATH: readyPath,
        FACTORY_STORE_RACE_RELEASE_PATH: releasePath,
        FACTORY_STORE_RACE_RESULT_PATH: resultPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const output: string[] = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => output.push(chunk));
  child.stderr.on("data", (chunk: string) => output.push(chunk));
  const exited = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Store race child '${workerId}' exited ${String(code)}.\n${output.join("")}`,
          ),
        );
    });
  });
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<void>((_, reject) => {
    deadline = setTimeout(
      () => reject(new Error(`Store race child '${workerId}' timed out.`)),
      20_000,
    );
  });
  return {
    child,
    exited,
    completed: Promise.race([exited, timedOut]).finally(() => {
      if (deadline !== undefined) clearTimeout(deadline);
    }),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("ExternalIntakeStore", () => {
  if (process.env.FACTORY_STORE_RACE_CHILD !== undefined) {
    it("executes one child-process atomic Candidate terminal attempt", async () => {
      const input = JSON.parse(
        readFileSync(process.env.FACTORY_STORE_RACE_INPUT_PATH!, "utf8"),
      ) as Parameters<
        AtomicCandidateTransitionStore["commitCandidateTransition"]
      >[0];
      writeFileSync(process.env.FACTORY_STORE_RACE_READY_PATH!, "ready");
      await waitForStoreRacePath(process.env.FACTORY_STORE_RACE_RELEASE_PATH!);
      const store = new ExternalIntakeStore(
        process.env.FACTORY_STORE_RACE_ROOT!,
      ) as AtomicCandidateTransitionStore;
      let result: unknown;
      try {
        const committed =
          process.env.FACTORY_STORE_RACE_MODE === "append"
            ? {
                candidate: input.expectedCandidate,
                receipt: store.appendReceipt(input.jobId, input.receipt),
              }
            : store.commitCandidateTransition(input);
        result = {
          outcome: "committed",
          candidateDigest: committed.candidate.digest,
          receiptDigest: committed.receipt.digest,
        };
      } catch (error) {
        result = {
          outcome: "conflict",
          message: error instanceof Error ? error.message : "unknown",
        };
      }
      writeFileSync(
        process.env.FACTORY_STORE_RACE_RESULT_PATH!,
        JSON.stringify(result),
      );
    }, 30_000);
  }

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

  it("atomically commits one Candidate terminal transition, retries it idempotently, and rejects a conflict without orphans", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(
      root,
    ) as AtomicCandidateTransitionStore;
    const fixture = candidateTransitionFixture(store);
    const blocked = fixture.transition("blocked");
    const rejected = fixture.transition("rejected");
    const conformance = fixture.conformanceTransition();

    const first = store.commitCandidateTransition({
      jobId: fixture.jobId,
      expectedCreationReceipt: fixture.creationReceipt,
      expectedCandidate: fixture.candidateRef,
      candidate: blocked.terminal,
      receipt: blocked.receipt,
    });
    const retry = store.commitCandidateTransition({
      jobId: fixture.jobId,
      expectedCreationReceipt: fixture.creationReceipt,
      expectedCandidate: fixture.candidateRef,
      candidate: structuredClone(blocked.terminal),
      receipt: structuredClone(blocked.receipt),
    });

    expect(retry).toEqual(first);
    expect(store.getRecord(first.candidate)).toEqual(blocked.terminal);
    expect(store.getRecord(first.receipt)).toEqual(blocked.receipt);
    const before = {
      candidates: readFileSync(recordPath(root, first.candidate), "utf8"),
      receipts: readFileSync(recordPath(root, first.receipt), "utf8"),
    };
    expect(() =>
      store.commitCandidateTransition({
        jobId: fixture.jobId,
        expectedCreationReceipt: fixture.creationReceipt,
        expectedCandidate: fixture.candidateRef,
        candidate: rejected.terminal,
        receipt: rejected.receipt,
      }),
    ).toThrow(/terminal|sequence|conflict/iu);
    expect(
      existsSync(
        recordPath(root, {
          kind: "candidate",
          digest: canonicalRecordDigest(rejected.terminal),
        }),
      ),
    ).toBe(false);
    expect(
      existsSync(
        recordPath(root, {
          kind: "receipt",
          digest: canonicalRecordDigest(rejected.receipt),
        }),
      ),
    ).toBe(false);
    expect(() =>
      store.commitCandidateTransition({
        jobId: fixture.jobId,
        expectedCreationReceipt: fixture.creationReceipt,
        expectedCandidate: fixture.candidateRef,
        candidate: conformance.terminal,
        receipt: conformance.receipt,
        evidenceBytes: conformance.evidenceBytes,
      }),
    ).toThrow(/terminal|sequence|conflict/iu);
    expect(
      existsSync(
        join(
          root,
          "blobs",
          "evidence",
          `${conformance.evidenceDigest.slice(7)}.bin`,
        ),
      ),
    ).toBe(false);
    expect(readFileSync(recordPath(root, first.candidate), "utf8")).toBe(
      before.candidates,
    );
    expect(readFileSync(recordPath(root, first.receipt), "utf8")).toBe(
      before.receipts,
    );
  });

  it("reserves terminal Candidate records and sequence-2 Candidate receipts for the atomic transition primitive", () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const fixture = candidateTransitionFixture(store);
    const blocked = fixture.transition("blocked");

    expect(() => store.putRecord("candidate", blocked.terminal)).toThrow(
      /atomic|transition|quarantined/iu,
    );
    expect(() => store.appendReceipt(fixture.jobId, blocked.receipt)).toThrow(
      /atomic|transition|candidate/iu,
    );
    expect(
      existsSync(
        recordPath(root, {
          kind: "candidate",
          digest: canonicalRecordDigest(blocked.terminal),
        }),
      ),
    ).toBe(false);
    expect(
      existsSync(
        recordPath(root, {
          kind: "receipt",
          digest: canonicalRecordDigest(blocked.receipt),
        }),
      ),
    ).toBe(false);
  });

  it.each(["blocked", "rejected", "conformance-passed"] as const)(
    "rejects generic sequence-3 append after Candidate %s without receipt or index mutation",
    (status) => {
      const root = tempRoot();
      const store = new ExternalIntakeStore(
        root,
      ) as AtomicCandidateTransitionStore;
      const fixture = candidateTransitionFixture(store);
      const transition =
        status === "conformance-passed"
          ? fixture.conformanceTransition()
          : fixture.transition(status);
      const committed = store.commitCandidateTransition({
        jobId: fixture.jobId,
        expectedCreationReceipt: fixture.creationReceipt,
        expectedCandidate: fixture.candidateRef,
        candidate: transition.terminal,
        receipt: transition.receipt,
        ...("evidenceBytes" in transition
          ? { evidenceBytes: transition.evidenceBytes }
          : {}),
      });
      const before = readdirSync(join(root, "records", "receipt")).sort();
      const sequenceThree: IntakeReceiptV1 = {
        apiVersion: "factory.external-intake-receipt/v1",
        createdAt: transition.receipt.createdAt,
        producerVersion: transition.receipt.producerVersion,
        parentDigests: [committed.receipt.digest],
        jobId: fixture.jobId,
        sequence: 3,
        status: "rejected",
        code: "candidate-rejected-again",
        recordDigests: [committed.candidate.digest],
      };

      expect(() => store.appendReceipt(fixture.jobId, sequenceThree)).toThrow(
        /atomic|candidate|transition/iu,
      );
      expect(readdirSync(join(root, "records", "receipt")).sort()).toEqual(
        before,
      );
      expect(
        existsSync(join(root, "jobs", fixture.jobId, "receipts", "3.json")),
      ).toBe(false);
    },
  );

  it("atomically chooses one mixed-process Candidate terminal winner and fences appendReceipt without loser orphans", async () => {
    const root = tempRoot();
    const store = new ExternalIntakeStore(root);
    const fixture = candidateTransitionFixture(store);
    const raceRoot = join(root, "store-race");
    mkdirSync(raceRoot);
    const releasePath = join(raceRoot, "release");
    const statuses = ["blocked", "rejected"] as const;
    const inputPaths = statuses.map((status) =>
      join(raceRoot, `${status}.json`),
    );
    const workerIds = ["blocked", "rejected", "append-bypass"] as const;
    const readyPaths = workerIds.map((workerId) =>
      join(raceRoot, `${workerId}.ready`),
    );
    const resultPaths = workerIds.map((workerId) =>
      join(raceRoot, `${workerId}.result.json`),
    );
    const transitions = statuses.map((status) => fixture.transition(status));
    for (const [index, transition] of transitions.entries()) {
      writeFileSync(
        inputPaths[index]!,
        JSON.stringify({
          jobId: fixture.jobId,
          expectedCreationReceipt: fixture.creationReceipt,
          expectedCandidate: fixture.candidateRef,
          candidate: transition.terminal,
          receipt: transition.receipt,
        }),
      );
    }
    const workers = [
      runStoreRaceProcess(
        root,
        "blocked",
        "cas",
        inputPaths[0]!,
        readyPaths[0]!,
        releasePath,
        resultPaths[0]!,
      ),
      runStoreRaceProcess(
        root,
        "rejected",
        "cas",
        inputPaths[1]!,
        readyPaths[1]!,
        releasePath,
        resultPaths[1]!,
      ),
      runStoreRaceProcess(
        root,
        "append-bypass",
        "append",
        inputPaths[0]!,
        readyPaths[2]!,
        releasePath,
        resultPaths[2]!,
      ),
    ];
    const completed = Promise.all(workers.map((worker) => worker.completed));
    try {
      await Promise.race([
        Promise.all(readyPaths.map(waitForStoreRacePath)),
        completed.then(() => {
          throw new Error("Store race children exited before the barrier.");
        }),
      ]);
      writeFileSync(releasePath, "go");
      await completed;
    } finally {
      for (const worker of workers) {
        if (
          worker.child.pid !== undefined &&
          worker.child.exitCode === null &&
          worker.child.signalCode === null
        ) {
          worker.child.kill();
        }
      }
      await Promise.allSettled(workers.map((worker) => worker.exited));
    }
    const results = resultPaths.map(
      (path) =>
        JSON.parse(readFileSync(path, "utf8")) as {
          readonly outcome: "committed" | "conflict";
          readonly candidateDigest?: string;
          readonly receiptDigest?: string;
        },
    );
    expect(results.map(({ outcome }) => outcome).sort()).toEqual([
      "committed",
      "conflict",
      "conflict",
    ]);
    const winner = results.find(({ outcome }) => outcome === "committed")!;
    expect(readdirSync(join(root, "records", "candidate"))).toHaveLength(2);
    expect(readdirSync(join(root, "records", "receipt"))).toHaveLength(2);
    expect(
      transitions.filter(
        ({ terminal }) =>
          canonicalRecordDigest(terminal) === winner.candidateDigest,
      ),
    ).toHaveLength(1);
    const loser = transitions.find(
      ({ terminal }) =>
        canonicalRecordDigest(terminal) !== winner.candidateDigest,
    )!;
    expect(
      existsSync(
        recordPath(root, {
          kind: "candidate",
          digest: canonicalRecordDigest(loser.terminal),
        }),
      ),
    ).toBe(false);
    expect(
      existsSync(
        recordPath(root, {
          kind: "receipt",
          digest: canonicalRecordDigest(loser.receipt),
        }),
      ),
    ).toBe(false);
    const index = JSON.parse(
      readFileSync(
        join(root, "jobs", fixture.jobId, "receipts", "2.json"),
        "utf8",
      ),
    ) as { readonly receiptDigest: string };
    expect(index.receiptDigest).toBe(winner.receiptDigest);
  }, 30_000);

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
import { spawn } from "node:child_process";
