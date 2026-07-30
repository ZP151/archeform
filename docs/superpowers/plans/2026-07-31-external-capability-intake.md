# External Capability Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `subagent-driven-development` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first quarantine-first bulk Candidate Intake lane so fixed
public references can be snapshotted, evidenced, scanned, registered as
non-executable Candidates, and rendered into review-only promotion packets
without becoming selectable or compilable Factory capabilities.

**Architecture:** Add a server-only `@factory/external-intake` TypeScript
package with versioned records, canonical hashing, immutable file-backed
persistence, fixed-reference acquisition, deterministic scan orchestration,
and a separate Candidate registry. Add a repository-local CLI as the only
operator surface. Candidate records never use `factory.capability/v1`, never
enter the Application Graph or Golden registry, and have no dependency path to
the compiler; promotion remains a reviewed commit that independently authors a
Golden asset.

**Tech Stack:** TypeScript, Node.js 22 built-in `fetch`/`crypto`/filesystem APIs,
Zod using the repository's existing published version, pnpm/Turborepo, Vitest,
canonical JSON, CycloneDX metadata, and deterministic local scanner adapters.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation. Intake never receives or
  mutates a Draft, Published Revision, Application Graph, PolicyModel, or
  FlowModel.
- Candidate records are separate from `factory.capability/v1`; they cannot be
  selected, locked, published, compiled, imported into a generated app, or
  registered as Golden.
- Source bytes, scan reports, and Candidate artifacts exist only beneath the
  ignored `ecosystem/intake/**` quarantine or a test-owned temporary directory.
- Accept canonical public Git URLs from an explicit host allow-list and only an
  exact tag or full 40-character commit. Branches, pull refs, embedded
  credentials, unexpected redirects, and an `expectedCommit` mismatch reject.
- No downloaded source, package script, hook, container, migration, sample
  data, UI asset, binary, or example executes during intake.
- Scan adapters are code-owned and allow-listed. Request files cannot select an
  executable, command, argument, ruleset, path, environment variable, or URL.
- Every record uses lower-case `sha256:<64 hex>`, canonical JSON, a schema
  version, producer version, creation time, and parent digests. A changed input
  creates a new immutable record rather than rewriting an old one.
- Logs and status output expose stable IDs, counts, versions, statuses, and
  digests only. They never expose snapshot bodies, source fragments, secret
  matches, credentials, raw scanner findings, or raw model input/output.
- The 43-source portfolio is intake metadata. Its 108 scenarios are demand
  signals for future capability composition, not Candidates, generated apps,
  source-copy approvals, or implementation commitments.
- No new third-party scanner or archive dependency is adopted in this slice.
  Adding one requires its own fixed-version source study, licence notice,
  security review, and governance decision.
- Commercial Capability Foundation Task 1 may proceed through independent QA
  in parallel because Tasks 1-3 below own new, disjoint paths. Candidate/Golden
  rejection and promotion work in Tasks 4-6 require Commercial Foundation Task
  1 to be `accepted` so the Golden verification boundary is frozen.

---

## Planned file structure

| Area                                                          | Responsibility                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/external-intake/src/contracts.ts`                   | Strict v1 request, snapshot, evidence, Candidate, receipt, and promotion-packet schemas. |
| `packages/external-intake/src/canonical.ts`                   | Canonical JSON and raw-byte SHA-256 primitives.                                          |
| `packages/external-intake/src/store.ts`                       | Opaque-ID, content-addressed, immutable quarantine persistence.                          |
| `packages/external-intake/src/portfolio.ts`                   | Validates the 43 source records and 108 scenario demand mappings.                        |
| `packages/external-intake/src/source-client.ts`               | Allow-listed fixed-ref public-source client contract and GitHub implementation.          |
| `packages/external-intake/src/snapshot.ts`                    | Snapshot/tree/provenance/licence/notice acquisition and receipts.                        |
| `packages/external-intake/src/scans.ts`                       | Pinned local scanner interfaces, orchestration, normalization, and failure isolation.    |
| `packages/external-intake/src/candidates.ts`                  | Candidate artifact emission, append-only status receipts, and query API.                 |
| `packages/external-intake/src/promotion.ts`                   | Read-only promotion-packet validation and rendering.                                     |
| `apps/intake-cli/src/main.ts`                                 | Repository-local batch/status/evidence/candidate/promotion commands.                     |
| `ecosystem/portfolio/2026-07-30-external-business-logic.json` | Machine-readable fixed-reference portfolio and scenario demand map; no source bytes.     |
| `ecosystem/intake/**`                                         | Ignored runtime quarantine; never imported by product builds.                            |

## Task 1: Freeze Candidate contracts and immutable persistence

**Owner:** `integration`

**Contract owner:** External Intake Contract

**Files:**

- Create: `packages/external-intake/package.json`
- Create: `packages/external-intake/tsconfig.json`
- Create: `packages/external-intake/vitest.config.ts`
- Create: `packages/external-intake/src/contracts.ts`
- Create: `packages/external-intake/src/canonical.ts`
- Create: `packages/external-intake/src/store.ts`
- Create: `packages/external-intake/src/portfolio.ts`
- Create: `packages/external-intake/src/index.ts`
- Create: `packages/external-intake/test/contracts.test.ts`
- Create: `packages/external-intake/test/store.test.ts`
- Create: `packages/external-intake/test/portfolio.test.ts`
- Create: `ecosystem/portfolio/2026-07-30-external-business-logic.json`
- Modify: `.gitignore`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes:
  `docs/superpowers/specs/2026-07-31-external-capability-intake-design.md`
  and
  `docs/research/2026-07-30-external-business-logic-portfolio.md`.
- Produces:

```ts
export type Sha256Digest = `sha256:${string}`;

export function parseIntakeRequest(input: unknown): IntakeRequestV1;
export function parseSourceSnapshot(input: unknown): SourceSnapshotV1;
export function parseEvidenceBundle(input: unknown): EvidenceBundleV1;
export function parseCandidateCapability(input: unknown): CandidateCapabilityV1;
export function canonicalRecordDigest(input: unknown): Sha256Digest;

export class ExternalIntakeStore {
  constructor(root: string);
  putRecord(kind: IntakeRecordKind, record: IntakeRecordV1): StoredRecordRef;
  putBytes(kind: "snapshot" | "evidence", bytes: Uint8Array): StoredBlobRef;
  getRecord(ref: StoredRecordRef): IntakeRecordV1;
  appendReceipt(jobId: string, receipt: IntakeReceiptV1): StoredRecordRef;
}
```

- The machine-readable portfolio contains exactly 43 uniquely identified
  source records with the documented class counts and exactly 108 numbered,
  unique scenario demand mappings. Excluded/architecture-only records remain
  policy records and cannot be converted to `IntakeRequestV1`.

- [ ] **Step 1: Write failing strict-schema and portfolio tests**

```ts
it("keeps Candidate records outside the Golden capability contract", () => {
  const candidate = parseCandidateCapability(validCandidate);
  expect(candidate.apiVersion).toBe("factory.candidate-capability/v1");
  expect(candidate).not.toHaveProperty("outputSlots");
  expect(() =>
    parseCandidateCapability({
      ...validCandidate,
      apiVersion: "factory.capability/v1",
    }),
  ).toThrow();
});

it("loads 43 references and 108 scenario demand mappings", () => {
  const portfolio = loadExternalPortfolio(portfolioPath);
  expect(portfolio.sources).toHaveLength(43);
  expect(portfolio.scenarios).toHaveLength(108);
  expect(new Set(portfolio.scenarios.map(({ number }) => number)).size).toBe(
    108,
  );
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/contracts.test.ts test/portfolio.test.ts
```

Expected: FAIL because the package, schemas, and machine-readable portfolio do
not exist.

- [ ] **Step 3: Implement strict records and canonical digests**

Implement exact `.strict()` schemas for the design's five records. Reject
unknown fields, noncanonical URLs, branches/pull refs, invalid timestamps,
unsafe relative paths, non-finite counts, duplicate paths/modules, malformed
digests, Candidate `factory.capability/v1`, and any key named like a credential,
raw prompt/response, command, source body, or executable path. Hash raw bytes
for blobs and canonical JSON for records.

- [ ] **Step 4: Implement the immutable store and quarantine boundary**

`ExternalIntakeStore` resolves its configured root once, creates record paths
from validated opaque IDs/digests only, uses exclusive create, rejects
symlinks/special files/path escapes, verifies bytes after write, and returns an
existing matching record idempotently. A different payload at an existing
identity throws; no update/delete API exists. Add `ecosystem/intake/` to
`.gitignore` and prove no product package imports `@factory/external-intake`.

- [ ] **Step 5: Implement and validate the portfolio projection**

Transcribe only research metadata: fixed reference, canonical repository URL,
class, licence evidence URL, proposed adoption class, capability seams, and
scenario demand mappings. Preserve the documented class totals: 1 direct
dependency, 11 selective-source, 7 provider, 8 architecture-only, and 16
excluded. Do not add snapshot bytes, source fragments, legal approval, or a
Candidate status.

- [ ] **Step 6: Verify Task 1**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/contracts.test.ts test/store.test.ts test/portfolio.test.ts
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
git diff --check
```

Expected: schemas fail closed, canonical hashes are deterministic, immutable
records cannot be overwritten or escaped, quarantine remains ignored, and the
43/108 portfolio counts and classification totals match the source memo.

- [ ] **Step 7: Commit the contract slice**

```text
git add .gitignore pnpm-lock.yaml packages/external-intake ecosystem/portfolio/2026-07-30-external-business-logic.json
git commit -m "feat: add external intake contracts"
```

## Task 2: Acquire fixed-SHA snapshots, provenance, licences, and notices

**Owner:** `platform`

**Contract owner:** External Source Provenance

**Files:**

- Create: `packages/external-intake/src/source-client.ts`
- Create: `packages/external-intake/src/snapshot.ts`
- Create: `packages/external-intake/src/evidence.ts`
- Create: `packages/external-intake/test/source-client.test.ts`
- Create: `packages/external-intake/test/snapshot.test.ts`
- Create: `packages/external-intake/test/evidence.test.ts`
- Create: `packages/external-intake/test/fixtures/public-source/**`

**Interfaces:**

- Consumes: Task 1 `IntakeRequestV1`, record parsers, digest primitives, and
  immutable store.
- Produces:

```ts
export interface FixedSourceClient {
  resolve(request: IntakeRequestV1): Promise<ResolvedSourceReferenceV1>;
  fetchArchive(reference: ResolvedSourceReferenceV1): Promise<Uint8Array>;
  fetchTree(reference: ResolvedSourceReferenceV1): Promise<SourceTreeEntryV1[]>;
  fetchEvidence(
    reference: ResolvedSourceReferenceV1,
    path: string,
  ): Promise<Uint8Array>;
}

export async function acquireSourceEvidence(
  request: IntakeRequestV1,
  client: FixedSourceClient,
  store: ExternalIntakeStore,
): Promise<{ snapshot: StoredRecordRef; evidence: StoredRecordRef }>;
```

- [ ] **Step 1: Write fixed-reference and path-adversarial tests**

```ts
it.each(["main", "refs/heads/main", "pull/12/head"])(
  "rejects floating ref %s before retrieval",
  async (requestedRef) => {
    await expect(acquire({ ...validRequest, requestedRef })).rejects.toThrow(
      "exact tag or commit",
    );
    expect(client.calls).toHaveLength(0);
  },
);

it("rejects a resolved commit that differs from expectedCommit", async () => {
  await expect(acquire(expectedCommitMismatch)).rejects.toThrow(
    "resolved commit mismatch",
  );
  expect(store.list("snapshot")).toEqual([]);
});
```

- [ ] **Step 2: Run the focused tests and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/source-client.test.ts test/snapshot.test.ts test/evidence.test.ts
```

Expected: FAIL because fixed-source acquisition does not exist.

- [ ] **Step 3: Implement the allow-listed public-source client**

Support `https://github.com/<owner>/<repository>.git` first. Resolve tags to a
full commit through the official API, peel annotated tags, accept full commit
hashes directly after existence verification, and permit only the explicit
`github.com` -> `api.github.com`/`codeload.github.com` retrieval chain. Use
manual redirect handling, reject user-info/credentials, strip no attacker
input into headers, cap response bytes/time, and never execute Git or source.

- [ ] **Step 4: Acquire immutable snapshot and source-tree evidence**

Store official archive bytes by raw digest without extracting them. Validate
the official tree inventory before storage: normalized relative paths only,
no symlink/submodule/special mode, path traversal, case-fold collision,
reserved name, prohibited vendor/generated/binary/nested-archive path, or
configured file/count/byte overflow. Compute a canonical tree digest over
path/mode/blob-digest records and verify an optional expected commit.

- [ ] **Step 5: Capture licence, notices, provenance, and receipt**

Read only discovered allow-listed `LICENSE*`, `COPYING*`, `NOTICE*`, and
declared notice paths at the resolved commit. Store exact raw-byte digests and
origin URLs. Leave `manualStatus: "unreviewed"`; a missing/ambiguous primary
licence, missing required notice, digest drift, or unreadable evidence blocks
Candidate emission but preserves a redacted failure receipt.

- [ ] **Step 6: Verify Task 2**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/source-client.test.ts test/snapshot.test.ts test/evidence.test.ts
pnpm --filter @factory/external-intake test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
```

Expected: fixtures prove exact ref/SHA binding, raw archive/tree/evidence
digests, safe-path rejection, redirect and size bounds, immutable receipts, and
no code execution. Tests use injected clients and no network.

- [ ] **Step 7: Commit the provenance slice**

```text
git add packages/external-intake
git commit -m "feat: acquire fixed external source evidence"
```

## Task 3: Orchestrate deterministic local scans and module inventory

**Owner:** `platform-security`

**Contract owner:** External Evidence Pipeline

**Files:**

- Create: `packages/external-intake/src/scans.ts`
- Create: `packages/external-intake/src/module-inventory.ts`
- Create: `packages/external-intake/src/jobs.ts`
- Create: `packages/external-intake/test/scans.test.ts`
- Create: `packages/external-intake/test/module-inventory.test.ts`
- Create: `packages/external-intake/test/jobs.test.ts`
- Create: `packages/external-intake/test/fixtures/scans/**`

**Interfaces:**

- Consumes: Task 1 immutable store/contracts and Task 2 snapshot/evidence refs.
- Produces:

```ts
export interface LocalScannerV1 {
  readonly kind: "licence" | "secret" | "sast" | "dependency";
  readonly tool: string;
  readonly toolVersion: string;
  readonly rulesetDigest: Sha256Digest;
  scan(input: ReadonlySnapshotView): Promise<NormalizedScanResultV1>;
}

export async function runEvidencePipeline(
  job: IntakeJobV1,
  scanners: readonly LocalScannerV1[],
  inventory: ModuleInventoryAdapterV1,
  store: ExternalIntakeStore,
): Promise<CompletedEvidenceRefV1>;
```

- [ ] **Step 1: Write failing orchestration and failure-isolation tests**

```ts
it("records all four pinned scanner identities in deterministic order", async () => {
  const result = await runEvidencePipeline(
    job,
    shuffledScanners,
    inventory,
    store,
  );
  expect(result.scans.map(({ kind }) => kind)).toEqual([
    "licence",
    "secret",
    "sast",
    "dependency",
  ]);
});

it("blocks only the failed source item and preserves sibling receipts", async () => {
  const result = await runBatch([safeJob, secretJob]);
  expect(result.byId[safeJob.id].status).toBe("evidenced");
  expect(result.byId[secretJob.id].status).toBe("blocked");
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/scans.test.ts test/module-inventory.test.ts test/jobs.test.ts
```

Expected: FAIL because the scan pipeline and job state machine do not exist.

- [ ] **Step 3: Implement the pinned scanner adapter boundary**

Require exactly one code-owned adapter for each scan kind. Normalize reports to
counts, severities, stable finding codes, and result digests; store raw reports
as quarantined blobs but never print them. Reject duplicate/missing kinds,
unknown tool/version, ruleset drift, network-required status, malformed output,
unsupported scans, unresolved secret findings, and high/critical dependency or
SAST findings. Request data cannot construct a scanner or process command.

- [ ] **Step 4: Implement AST/module inventory as a locator only**

Inventory allow-listed fixture languages through injected pinned adapters. The
normalized record contains path, symbol, imports/exports, dependencies, size,
notice marker, generated/binary flags, and source digest. Parse failure,
dynamic evaluation/load, process/filesystem/network access, generated/binary
source, or a prohibited path blocks `proposed-copy`; no transformer or emitted
source body exists.

- [ ] **Step 5: Implement resumable independent jobs**

Persist state receipts for `requested -> resolved -> snapshotted -> evidenced
-> scanned -> inventoried -> candidate-ready` and terminal `blocked/rejected`.
Resume only when every parent digest/tool version/ruleset digest matches. A
single source failure never marks sibling items complete or promotable. Re-runs
with identical inputs reuse immutable refs; any changed input produces a new
evidence revision.

- [ ] **Step 6: Verify Task 3**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/scans.test.ts test/module-inventory.test.ts test/jobs.test.ts
pnpm --filter @factory/external-intake test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
```

Expected: safe fixtures are deterministic; secret, vulnerable, dynamic-eval,
parser, unavailable-scanner, rule-drift, and path fixtures fail closed with
redacted receipts and independent sibling completion.

- [ ] **Step 7: Commit the scan slice**

```text
git add packages/external-intake
git commit -m "feat: orchestrate external evidence scans"
```

## Task 4: Add the Candidate registry, module API, CLI, and isolation gates

**Owner:** `integration`

**Contract owner:** Candidate Registry

**Dependencies:** Tasks 1-3 accepted and Commercial Capability Foundation Task
1 accepted. No implementation may overlap an open Commercial Foundation change
to the Golden registry or Publish verifier.

**Files:**

- Create: `packages/external-intake/src/candidates.ts`
- Create: `packages/external-intake/src/api.ts`
- Create: `packages/external-intake/src/conformance.ts`
- Create: `packages/external-intake/test/candidates.test.ts`
- Create: `packages/external-intake/test/api.test.ts`
- Create: `packages/external-intake/test/conformance.test.ts`
- Modify: `packages/external-intake/src/index.ts` to publish the accepted Task 2
  source-evidence, Task 3 scan/job, and Task 4 Candidate module APIs together.
- Create: `apps/intake-cli/package.json`
- Create: `apps/intake-cli/tsconfig.json`
- Create: `apps/intake-cli/vitest.config.ts`
- Create: `apps/intake-cli/src/main.ts`
- Create: `apps/intake-cli/test/cli.test.ts`
- Modify: `packages/graph/test/application-graph.test.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: accepted Task 3 `CompletedEvidenceRefV1` and immutable store.
- Produces:

```ts
export interface CandidateRegistryV1 {
  create(input: CandidateProposalV1): StoredCandidateRefV1;
  get(id: string, version: string): CandidateCapabilityV1;
  list(filter: CandidateQueryV1): readonly CandidateSummaryV1[];
  appendStatus(input: CandidateStatusReceiptV1): StoredRecordRef;
  verify(ref: StoredCandidateRefV1): CandidateVerificationResultV1;
}

export function createExternalIntakeApi(
  store: ExternalIntakeStore,
): ExternalIntakeApiV1;
```

- [ ] **Step 1: Write Candidate and product-boundary RED tests**

```ts
it("creates a quarantined Candidate with no executable source output", () => {
  const candidate = registry.create(validProposal);
  expect(registry.get(candidate.id, candidate.version).allowedOutputs).toEqual([
    "manifest",
    "fixture",
    "adapter",
    "conformance-plan",
  ]);
});

it.each(["graph", "capability-registry", "compiler"])(
  "rejects Candidate identity at the %s boundary",
  (boundary) => expectCandidateRejected(boundary, candidateLock),
);
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/candidates.test.ts test/api.test.ts test/conformance.test.ts
pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts
pnpm --filter @factory/graph test -- --run test/application-graph.test.ts
pnpm --filter @factory/capabilities test -- --run test/capability-registry.test.ts
pnpm --filter @factory/compiler test -- --run test/compilation-plan.test.ts
```

Expected: Candidate creation/API/CLI tests fail because the lane does not exist;
existing product boundaries already reject unknown Candidate identities and
receive explicit non-regression assertions.

- [ ] **Step 3: Implement Candidate artifact and status rules**

Emit identifiers/schemas/effects, a minimal JSON fixture, declarative adapter
skeleton, and conformance plan only. Reject copied bodies, source fields,
unsafe paths, arbitrary code/URLs, credentials, Graph/Policy/Flow mutations,
unapproved licence status, failed/unavailable scans, unbounded modules, and
digest mismatches. Status changes append receipts; only
`quarantined -> conformance-passed|blocked|rejected` is valid.

- [ ] **Step 4: Implement module API and repository-local CLI**

Expose batch submit/status/evidence/candidate show/candidate test/verify using
local request files and opaque IDs only. Status output is redacted. There is no
HTTP route, Graph input, interactive URL, source-body output, `--promote` flag,
approval command, or arbitrary output path. `promotion packet` is added only
in Task 5.

- [ ] **Step 5: Implement isolated Factory-owned conformance**

Conformance reads immutable Candidate fixture/adapter metadata plus a read-only
snapshot view. It proves deterministic declarative output, schema rejection,
safe paths, no Graph mutation, no runtime import, and no filesystem/process/
network operation beyond the injected in-memory sandbox. Passing changes only
Candidate status and never registers a capability.

- [ ] **Step 6: Prove Candidate is invisible to product execution**

Add explicit tests that Candidate API versions, IDs, paths, and digests reject
from Application Graph parsing, capability registry/lock resolution, and
compiler inputs. Assert no `apps/*` or runtime-facing `packages/*` production
manifest depends on `@factory/external-intake`; only the CLI may import it.

- [ ] **Step 7: Verify Task 4**

Run all focused commands from Step 2, plus:

```text
pnpm --filter @factory/external-intake test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
```

Expected: a permissive fixture reaches `conformance-passed`, but Candidate
identity rejects at every Graph/Golden/compiler boundary and no runtime package
imports the intake package.

- [ ] **Step 8: Commit the Candidate lane**

```text
git add pnpm-lock.yaml packages/external-intake apps/intake-cli packages/graph/test/application-graph.test.ts packages/capabilities/test/capability-registry.test.ts packages/compiler/test/compilation-plan.test.ts
git commit -m "feat: add quarantined Candidate registry"
```

## Task 5: Render and verify review-only promotion packets

**Owner:** `governance`

**Contract owner:** External Capability Promotion

**Dependencies:** Task 4 accepted and Commercial Capability Foundation Task 1
accepted. This task creates no Golden asset or promotion decision.

**Files:**

- Create: `packages/external-intake/src/promotion.ts`
- Create: `packages/external-intake/test/promotion.test.ts`
- Modify: `packages/external-intake/src/api.ts`
- Modify: `packages/external-intake/src/index.ts`
- Modify: `apps/intake-cli/src/main.ts`
- Modify: `apps/intake-cli/test/cli.test.ts`

**Interfaces:**

- Consumes: immutable `conformance-passed` Candidate and parent evidence refs.
- Produces:

```ts
export function createPromotionPacket(
  candidate: StoredCandidateRefV1,
  registry: CandidateRegistryV1,
  store: ExternalIntakeStore,
): PromotionPacketV1;

export function verifyPromotionPacket(
  packet: unknown,
): PromotionPacketVerificationV1;
```

- [ ] **Step 1: Write incomplete/collision promotion-packet tests**

```ts
it("requires exact evidence, source-copy ranges, notices, reviewers, and removal path", () => {
  expect(() => createPromotionPacket(candidateMissingNotice)).toThrow(
    "notices destination",
  );
});

it("renders a packet without approving or registering the Candidate", () => {
  const packet = createPromotionPacket(validCandidate, registry, store);
  expect(packet.decision).toBe("pending-review");
  expect(() => resolveCapabilityAssetLock(packet.candidateDigest)).toThrow();
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/promotion.test.ts
pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts
```

Expected: FAIL because promotion-packet rendering does not exist.

- [ ] **Step 3: Implement complete packet validation**

Require exact snapshot/evidence/Candidate/conformance digests, source path and
line-range copy ledger, Factory interface proposal, licence manual decision,
finding dispositions, notice text/destination, replacement/removal path,
required reviewer roles, and proposed independently authored Golden identity.
Reject wildcards, missing parent digests, excluded licences, unresolved
findings, collisions, copied UI/migrations/data/tests/runtime, and any approval
or waiver represented as scanner status.

- [ ] **Step 4: Add read-only CLI rendering**

`factory intake promotion packet <candidate>@<version> --out <path>` accepts a
validated output path under an operator-selected empty review directory, writes
canonical JSON with exclusive create, and re-verifies it. It has no decision,
approval, registration, source-copy, notice-modification, or Golden-write
operation.

- [ ] **Step 5: Verify Task 5**

Run:

```text
pnpm --filter @factory/external-intake test -- --run test/promotion.test.ts test/candidates.test.ts
pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/intake-cli typecheck
```

Expected: only a complete `conformance-passed` Candidate yields a pending
packet; no command can accept it, register it, or modify third-party notices.

- [ ] **Step 6: Commit the promotion-packet slice**

```text
git add packages/external-intake apps/intake-cli
git commit -m "feat: create external promotion packets"
```

## Task 6: Prove bulk intake, quarantine cleanup, and release boundaries

**Owner:** `qa`

**Contract owner:** External Intake Release Evidence

**Dependencies:** Tasks 1-5 accepted and Commercial Capability Foundation Task
1 accepted.

**Files:**

- Create: `apps/intake-cli/test/bulk-intake.test.ts`
- Create: `packages/external-intake/test/release-boundary.test.ts`
- Create: `docs/acceptance/external-capability-intake.md`
- Modify: `docs/project-status.md`

**Interfaces:**

- Consumes: complete local intake CLI/API and the machine-readable 43/108
  portfolio.
- Produces: reproducible deterministic acceptance evidence and a redacted,
  exact-scope cleanup record. It produces no promotion decision or Golden asset.

- [ ] **Step 1: Write failing bulk and isolation acceptance tests**

```ts
it("preflights all 43 portfolio records without turning 108 scenarios into Candidates", async () => {
  const result = await api.preflightPortfolio(portfolio);
  expect(result.sources).toHaveLength(43);
  expect(result.scenarioDemandSignals).toBe(108);
  expect(registry.list({})).toEqual([]);
});

it("leaves no Candidate, Graph, lock, compiler artifact, or quarantine bytes after scoped cleanup", async () => {
  const run = await runFixtureBatch();
  await cleanupIntakeRun(run.id);
  expect(await inspectRunOwnership(run.id)).toEqual(emptyRunOwnership);
});
```

- [ ] **Step 2: Run focused tests and observe RED**

Run:

```text
pnpm --filter @factory/intake-cli test -- --run test/bulk-intake.test.ts
pnpm --filter @factory/external-intake test -- --run test/release-boundary.test.ts
```

Expected: FAIL until the complete intake pipeline and cleanup verifier exist.

- [ ] **Step 3: Run deterministic fixture acceptance**

Submit a mixed batch containing safe permissive, excluded-licence, missing
notice, secret, high vulnerability, dynamic-eval, unsafe path, parser-failure,
and scanner-unavailable fixtures. Prove per-source isolation, resumability,
stable digests, redacted status, Candidate invisibility, promotion-packet
read-only behavior, and exact run-owned file cleanup.

- [ ] **Step 4: Run a guarded public-source smoke probe**

When public network is available, resolve at most two already-recorded
permissive fixed references from the 43-source portfolio using no credential.
Verify resolved SHA, archive/tree/provenance/licence/notice digests, then remove
only the exact smoke-run quarantine directory. Record repository identity,
resolved commit, counts, statuses, tool versions, and digests only; record no
source body or raw finding. Network unavailability is reported as unavailable,
not substituted with fixture evidence.

- [ ] **Step 5: Run full verification and independent gates**

Run:

```text
pnpm --filter @factory/external-intake test
pnpm --filter @factory/intake-cli test
pnpm --filter @factory/graph test
pnpm --filter @factory/capabilities test
pnpm --filter @factory/compiler test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
pnpm exec prettier --check packages/external-intake apps/intake-cli ecosystem/portfolio/2026-07-30-external-business-logic.json docs/acceptance/external-capability-intake.md docs/project-status.md
git diff --check
```

After implementation review, independent QA repeats fixture and cleanup
evidence. Independent release review then checks supply-chain, licence,
security, Candidate/Golden isolation, privacy, and maintainability. The PM may
mark Task 6 and this plan accepted only after those gates and fresh root
verification reconcile with no open load-bearing finding.

- [ ] **Step 6: Commit acceptance evidence**

```text
git add apps/intake-cli/test/bulk-intake.test.ts packages/external-intake/test/release-boundary.test.ts docs/acceptance/external-capability-intake.md docs/project-status.md
git commit -m "test: accept external Candidate intake"
```

## Review and delivery sequence

1. The PM records a task `implementing` only after its dependency tasks are
   `accepted` and its contract artifact is frozen.
2. The engineer uses TDD and commits only exact owned paths.
3. A read-only task reviewer checks specification compliance and code quality.
   Any P0/P1 or material P2 returns the same task to `implementing` with a
   bounded repair round; at most five repair rounds are permitted.
4. The PM advances reviewed implementation to `ready_for_qa`; independent QA
   reproduces behavior, adversarial failures, and cleanup evidence.
5. When task review and QA are reconciled, the PM advances to `reviewed`.
   Independent release review and fresh verification remain required.
6. Only after release review and fresh verification pass may the PM mark the
   task `accepted` and unblock its dependents.
7. Tasks 2 and 3 may run in parallel only after Task 1 is accepted because they
   consume the same frozen record/store contract and own disjoint paths. No
   other implementation tasks overlap.

## Plan self-review

- **Design coverage:** Task 1 freezes strict records, canonical hashing,
  immutable storage, and the 43/108 portfolio projection. Task 2 owns fixed
  provenance, snapshots, licence, and notices. Task 3 owns deterministic scans,
  inventory, receipts, and batch isolation. Task 4 creates the Candidate lane
  and proves it cannot select or compile. Task 5 creates a read-only promotion
  packet. Task 6 proves bulk, cleanup, public-smoke, and release boundaries.
- **Candidate/Golden isolation:** No Candidate path, type, API, command, or
  dependency can write to `packages/capabilities/assets`, the Golden registry,
  a Graph, Published revision, compiler input, generated app, notice file, or
  promotion decision.
- **Commercial Foundation dependency:** Tasks 1-3 are path-disjoint and may be
  prepared while Foundation Task 1 is in QA. Tasks 4-6 remain blocked until its
  actual Publish/Golden physical verification is accepted and frozen.
- **No hidden adoption:** No scanner, archive library, upstream repository,
  provider, source fragment, runtime, or dependency is adopted by this plan.
  Future additions require their own fixed-source governance evidence.
- **No placeholders:** Every task defines exact paths, interfaces, RED/GREEN
  commands, failure behavior, commit scope, owner, contract, and dependency.
