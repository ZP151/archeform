# Live External Source Acquisition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `subagent-driven-development` or `executing-plans` to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository-local Intake CLI acquire fixed public GitHub
sources into a content-addressed quarantine and emit redacted, non-executable
source-study metadata without giving an acquired source any product authority.

**Architecture:** Keep the existing `GitHubFixedSourceClient` and
`acquireSourceEvidence` as the only network and persistence primitives. Add a
strict sequential acquisition-batch helper, a metadata-only source-study
projection, and two CLI commands. The Control Plane, Compiler Worker,
Application Graph, Golden Registry and generated runtimes remain unable to
read the quarantine or use its records.

**Tech Stack:** TypeScript 5.7, Node.js 22.11, pnpm 9, Zod, Vitest, native
`fetch`, and the existing content-addressed `ExternalIntakeStore`.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation. No acquisition command
  receives, creates, reads or mutates an Application Graph, Draft, Published
  revision, composition lock or compilation.
- Only canonical public `https://github.com/<owner>/<repository>.git` inputs
  with an exact tag or full SHA are valid. Branches, pull references, URLs with
  credentials and redirect destinations outside the existing allow-list reject.
- Source archives are immutable quarantine bytes. The acquisition phase never
  extracts, executes, builds, installs, imports, serves, scans or displays
  downloaded source.
- Console output and source-study metadata never include raw source, source
  path, repository URL, requested reference, resolved commit, licence text,
  scanner finding, credentials, raw model content, command or executable path.
- An acquired item can write only request, snapshot, acquisition, receipt, and
  licence/notice byte records. It cannot write Candidate, promotion, Golden,
  provider, Graph, compiler, generated-runtime or Workbench records.
- No new external dependency, scanner binary, container, Control Plane route,
  Worker queue, Docker service, provider account, credential or source-copy
  operation belongs in this slice.
- Every new behavior begins with a focused failing test. All tests use injected
  `FixedSourceClient` data and make no public network request.

---

## Planned file structure

| Area                                                  | Responsibility                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/external-intake/src/evidence.ts`            | Strict sequential batch acquisition using existing immutable source evidence logic. |
| `packages/external-intake/src/source-study.ts`        | Metadata-only deterministic source-study projection from acquired records.          |
| `packages/external-intake/src/index.ts`               | Exports the new acquisition and source-study interfaces.                            |
| `packages/external-intake/test/evidence.test.ts`      | Independent acquisition success/failure, isolation and record-kind regressions.     |
| `packages/external-intake/test/source-study.test.ts`  | Source-study redaction, deterministic identity and invalid-parent rejection.        |
| `apps/intake-cli/src/main.ts`                         | CLI-only `batch acquire` and `source-study` command dispatch plus redacted output.  |
| `apps/intake-cli/test/cli.test.ts`                    | End-to-end injected-client CLI tests and product-boundary regressions.              |
| `docs/acceptance/live-external-source-acquisition.md` | Exact fixture evidence and a guarded, redacted public-smoke record.                 |

## Task 1: Add strict sequential acquisition batches

**Owner:** Integration

**Files:**

- Modify: `packages/external-intake/src/evidence.ts`
- Modify: `packages/external-intake/src/index.ts`
- Modify: `packages/external-intake/test/evidence.test.ts`

**Consumes:** `IntakeRequestV1`, `FixedSourceClient`,
`ExternalIntakeStore`, and `acquireSourceEvidence`.

**Produces:**

```ts
export type AcquisitionBatchItemResultV1 =
  | {
      readonly status: "acquired";
      readonly snapshot: StoredRecordRef;
      readonly acquisition: StoredRecordRef;
    }
  | { readonly status: "blocked"; readonly failureCode: string };

export type AcquisitionBatchResultV1 = {
  readonly byId: Readonly<Record<string, AcquisitionBatchItemResultV1>>;
};

export async function acquireSourceBatch(
  input: unknown,
  client: FixedSourceClient,
  store: ExternalIntakeStore,
): Promise<AcquisitionBatchResultV1>;
```

- [ ] **Step 1: Write failing acquisition-batch tests**

```ts
it("acquires one fixed source and blocks an independent bad source", async () => {
  const result = await acquireSourceBatch(
    batchWith("safe-source", validRequest, "bad-source", badRequest),
    fixtureClient,
    store,
  );

  expect(result.byId["safe-source"]?.status).toBe("acquired");
  expect(result.byId["bad-source"]).toMatchObject({
    status: "blocked",
    failureCode: "resolved-commit-mismatch",
  });
  expect(store.list("candidate")).toEqual([]);
  expect(store.list("promotion")).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/evidence.test.ts
```

Expected: FAIL because `acquireSourceBatch` is not exported.

- [ ] **Step 3: Implement canonical batch parsing and item isolation**

Reuse the existing strict `factory.external-intake-batch/v1` schema from
`api.ts` by exporting a shared parser, or move that parser into
`contracts.ts` without changing its accepted wire format. Require unique item
IDs and parse each request through `parseIntakeRequest`. Invoke
`acquireSourceEvidence` one item at a time in input order. Convert only thrown
`Error` messages into stable, lower-case failure codes; do not expose messages,
URLs, paths, refs, commits or source bytes in the result.

- [ ] **Step 4: Enforce no-product-record acquisition output**

Add an assertion helper in the focused test that lists the store's record kinds
after an acquired and blocked batch. It must prove that only `request`,
`snapshot`, `acquisition` and `receipt` records plus `snapshot`/`evidence`
byte blobs exist. Candidate, promotion, Graph, lock, provider and compiler
identities must remain absent.

- [ ] **Step 5: Run package verification**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/evidence.test.ts test/source-client.test.ts test/contracts.test.ts
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
```

Expected: valid fixtures acquire deterministically; an invalid sibling blocks
without corrupting its sibling; exact fixed-reference, size, tree, licence and
notice rejections remain fail-closed.

- [ ] **Step 6: Commit the batch helper**

```text
git add packages/external-intake/src/evidence.ts packages/external-intake/src/index.ts packages/external-intake/test/evidence.test.ts
git commit -m "feat: acquire fixed source batches"
```

## Task 2: Emit deterministic metadata-only source-study records

**Owner:** Integration

**Files:**

- Create: `packages/external-intake/src/source-study.ts`
- Modify: `packages/external-intake/src/index.ts`
- Create: `packages/external-intake/test/source-study.test.ts`

**Consumes:** An immutable `IntakeRequestV1`, `SourceSnapshotV1` and
`ExternalSourceAcquisitionV1` from the same content-addressed store.

**Produces:**

```ts
export type ExternalSourceStudyV1 = {
  readonly apiVersion: "factory.external-source-study/v1";
  readonly acquisitionDigest: Sha256Digest;
  readonly snapshotDigest: Sha256Digest;
  readonly classification: "direct-dependency" | "source-study" | "provider";
  readonly licence: {
    readonly primaryPathCount: number;
    readonly noticeCount: number;
  };
  readonly requestedModuleCount: number;
  readonly status: "acquired-unreviewed";
};

export function createExternalSourceStudy(
  input: {
    readonly request: StoredRecordRef;
    readonly snapshot: StoredRecordRef;
    readonly acquisition: StoredRecordRef;
  },
  store: ExternalIntakeStore,
): ExternalSourceStudyV1;
```

- [ ] **Step 1: Write failing source-study safety tests**

```ts
it("projects only source-study metadata from matching immutable parents", () => {
  const study = createExternalSourceStudy(acquiredRefs, store);
  expect(study).toMatchObject({
    apiVersion: "factory.external-source-study/v1",
    classification: "source-study",
    status: "acquired-unreviewed",
  });
  expect(JSON.stringify(study)).not.toContain("github.com");
  expect(JSON.stringify(study)).not.toContain("src/index.ts");
});

it("rejects a mismatched request, snapshot, or acquisition parent", () => {
  expect(() => createExternalSourceStudy(mismatchedRefs, store)).toThrow(
    "parent",
  );
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/source-study.test.ts
```

Expected: FAIL because no source-study projector exists.

- [ ] **Step 3: Implement parent-bound redacted projection**

Load each referenced record through `ExternalIntakeStore`, parse it with the
strict contracts and prove the request digest is a parent of snapshot and
acquisition records. Prove the snapshot digest is a parent of the acquisition
record. Emit only fixed API version, record digests, request classification,
licence primary-path count, notice count, requested-module count and the
literal `acquired-unreviewed` state. Reject non-acquired acquisitions and all
malformed, absent or cross-source references.

- [ ] **Step 4: Add field-deny regressions**

Construct invalid projection inputs containing repository URL, requested ref,
resolved commit, source path, source text, command, executable path, Candidate
identity, Golden identity, Graph data, provider data or credential-shaped keys.
The projector must not accept an override object and its returned object must
have exactly the `ExternalSourceStudyV1` keys.

- [ ] **Step 5: Verify the deterministic projection**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/source-study.test.ts test/evidence.test.ts
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
```

Expected: the same immutable refs yield byte-equivalent JSON; any broken
provenance rejects; no source or executable detail can enter the projection.

- [ ] **Step 6: Commit the source-study projector**

```text
git add packages/external-intake/src/source-study.ts packages/external-intake/src/index.ts packages/external-intake/test/source-study.test.ts
git commit -m "feat: project acquired source studies"
```

## Task 3: Wire the live acquisition and source-study commands into the local CLI

**Owner:** Platform

**Files:**

- Modify: `apps/intake-cli/src/main.ts`
- Modify: `apps/intake-cli/test/cli.test.ts`

**Consumes:** Task 1 `acquireSourceBatch`, Task 2
`createExternalSourceStudy`, existing `ExternalIntakeStore` and
`GitHubFixedSourceClient`.

**Produces:**

```text
factory-intake batch acquire --file <local-batch.json>
factory-intake source-study --request <sha256> --snapshot <sha256> --acquisition <sha256>
```

- [ ] **Step 1: Write failing end-to-end CLI tests**

```ts
it("routes batch acquire through the injected fixed-source client", async () => {
  const { code, output } = await runWithFixtureClient([
    "batch",
    "acquire",
    "--file",
    "batch.json",
  ]);
  expect(code).toBe(0);
  expect(output).toContain('"status":"acquired"');
  expect(output).not.toContain("github.com");
});

it("renders a source study without exposing source details", async () => {
  const { code, output } = await runWithAcquiredFixture([
    "source-study",
    "--request",
    requestDigest,
    "--snapshot",
    snapshotDigest,
    "--acquisition",
    acquisitionDigest,
  ]);
  expect(code).toBe(0);
  expect(output).toContain("factory.external-source-study/v1");
  expect(output).not.toContain("src/index.ts");
});
```

- [ ] **Step 2: Run focused CLI tests and observe RED**

Run:

```text
pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts
```

Expected: FAIL because neither command is recognized and CLI options cannot
inject a fixed-source client.

- [ ] **Step 3: Add injected-client CLI options and safe production default**

Extend `IntakeCliOptionsV1` with an optional `sourceClient` property used only
by `batch acquire`. `main()` constructs a fresh `GitHubFixedSourceClient` when
the property is absent. Tests inject a fixture client. Do not read credentials,
environment variables, request-selected URLs or executable configuration into
the client constructor.

- [ ] **Step 4: Implement strict command dispatch and redaction**

Require exactly four tokens for `batch acquire --file <json>`. Reuse
`localJson`, then call Task 1's batch helper using the API's existing
quarantine store. Require exactly seven tokens for `source-study --request
<digest> --snapshot <digest> --acquisition <digest>`. Validate all three
digests before calling Task 2. Add output contexts that allow only status,
per-item opaque ID, result count and canonical digests at exact digest paths;
every other string is `[redacted]`.

- [ ] **Step 5: Prove product isolation from command paths**

Add tests that a successful `batch acquire` leaves Candidate listing empty and
does not call `candidateCreate`, `promotionPacket`, any Control Plane client,
Worker client or compiler. Add a static package-manifest assertion that no
runtime-facing package gained `@factory/external-intake` as a dependency.

- [ ] **Step 6: Verify CLI behavior**

Run:

```text
pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/intake-cli lint
pnpm --filter @factory/external-intake test -- --run
```

Expected: fixture acquisition is routed through the actual source-client
contract, unsafe requests fail without source output, and metadata rendering
stays redacted and non-executable.

- [ ] **Step 7: Commit the CLI slice**

```text
git add apps/intake-cli/src/main.ts apps/intake-cli/test/cli.test.ts
git commit -m "feat: acquire external sources from the local CLI"
```

## Task 4: Add acceptance evidence and an optional bounded public smoke run

**Owner:** QA

**Files:**

- Create: `docs/acceptance/live-external-source-acquisition.md`
- Modify: `docs/project-status.md`

**Consumes:** Tasks 1-3 and their focused, full package verification.

**Produces:** A redacted acceptance record that distinguishes fixture evidence
from an optional public-network smoke result.

- [ ] **Step 1: Record fixture RED/GREEN evidence**

Before implementation, record the exact failing commands from Tasks 1-3 and
their missing-export or unknown-command outcomes. After implementation, record
only command names, pass/fail totals, opaque item IDs, statuses, counts and
digests. Do not record fixtures' source bytes, URLs, refs, paths or any raw
failure detail.

- [ ] **Step 2: Run full deterministic verification**

Run:

```text
pnpm --filter @factory/external-intake test
pnpm --filter @factory/intake-cli test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/external-intake lint
pnpm --filter @factory/intake-cli lint
pnpm --filter @factory/graph test -- --run test/application-graph.test.ts
pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts
pnpm --filter @factory/compiler test -- --run test/compilation-plan.test.ts
git diff --check
```

Expected: acquisition logic passes, Candidate/Golden/Graph/compiler boundaries
remain unchanged, and format/type/test gates are green.

- [ ] **Step 3: Execute the bounded public smoke run only when network is available**

Use at most two pre-recorded permissive portfolio requests with no credential.
Run the CLI from a newly created exact quarantine directory. Verify the
resulting source-study metadata and terminal receipts, then delete only that
new directory after checking its resolved absolute path is under
`ecosystem/intake/`. Record only opaque IDs, statuses, counts and digests.
If network retrieval is unavailable, record `unavailable` separately from
fixture evidence and do not claim the public run passed.

- [ ] **Step 4: Commit acceptance evidence**

```text
git add docs/acceptance/live-external-source-acquisition.md docs/project-status.md
git commit -m "test: accept live source acquisition"
```

## Plan self-review

- **Design coverage:** Task 1 implements real immutable source acquisition in
  batches. Task 2 exposes only a redacted study record. Task 3 makes both
  operations locally usable. Task 4 proves the boundary and distinguishes real
  network evidence from deterministic fixtures.
- **Isolation:** No task imports the intake package into a runtime-facing
  product package, enables archive extraction, installs a dependency, starts a
  scanner, creates a Candidate, approves a source, copies code or mutates a
  Graph.
- **Determinism:** Tests use a fixture `FixedSourceClient`; public network is
  optional, bounded and never substitutes for unit or integration tests.
- **No placeholders:** Every task names its exact files, interfaces, RED/GREEN
  commands, error behavior and commit scope.

## Execution handoff

Plan saved to
`docs/superpowers/plans/2026-08-01-live-external-source-acquisition.md`.

Execution defaults to autonomous task-by-task delivery: a fresh implementation
owner, read-only review, QA evidence and release review for each task. The
controller receives status and evidence rather than manual cross-window
handoffs.
