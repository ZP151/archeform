# External Capability Intake Project Ledger

Updated: 2026-07-31

Plan: `docs/superpowers/plans/2026-07-31-external-capability-intake.md`

Design contract: `docs/superpowers/specs/2026-07-31-external-capability-intake-design.md`

Portfolio contract: `docs/research/2026-07-30-external-business-logic-portfolio.md`

## Workflow

The only valid task states are:

`planned` -> `implementing` -> `ready_for_qa` -> `reviewed` -> `accepted`

- `planned`: specialization, contract owner, exact paths, dependencies,
  non-goals, and acceptance evidence are recorded.
- `implementing`: one bounded writer owns its exact paths and TDD evidence.
- `ready_for_qa`: implementation and independent task review are reconciled;
  independent behavioral QA remains required.
- `reviewed`: task review and QA are reconciled with no open load-bearing
  finding; release review and fresh verification remain required.
- `accepted`: task review, QA, release review, and fresh verification are all
  reconciled. A Candidate, commit, scan pass, or green developer test alone
  does not qualify.

Only the PM changes state. No task skips a state. A shared contract change
stops every dependent task and returns the owning task to `implementing` with a
recorded repair round. Five failed repair/review rounds require escalation.

## Current milestone

Planning is complete for the first quarantine-first bulk Candidate Intake
slice, and the Controller has accepted the design contract. Task 1 is now
`accepted`, Task 2 is `implementing`, and Tasks 3 through 6 remain `planned`.
The system will ingest the
43 fixed-reference portfolio as metadata, retain the 108 scenarios as
composition demand signals, and produce only quarantined evidence,
non-executable Candidate records, and pending-review promotion packets.

Task 1 independent QA and release review PASSED. The PM reconciled the evidence
through `ready_for_qa -> reviewed -> accepted`. Its release code set, contract,
scope, and exact allowed paths are frozen. Task 2 is now dispatched against
that accepted dependency.

The Commercial Capability Foundation remains the Golden execution boundary.
External Intake Task 2 has been dispatched with its existing contract artifact
and exact allowed paths frozen. Task 3's Task 1 dependency is satisfied, but it
remains `planned` until a separate PM dispatch. Tasks 4-6 remain blocked on
their preceding Intake dependencies.

Independent Task 2 review FAILED with three P1 findings and one P2. Task 2
remains `implementing` in Fix Round 1/5; its original contract, scope, and exact
allowed paths remain frozen. Tasks 3 through 6 remain `planned`.

| Task                                             | State          | Specialization      | Contract owner                   | Dependency gate                                              |
| ------------------------------------------------ | -------------- | ------------------- | -------------------------------- | ------------------------------------------------------------ |
| 1. Candidate contracts and immutable persistence | `accepted`     | `integration`       | External Intake Contract         | QA and release review PASS; release set and contract frozen. |
| 2. Fixed-source provenance and notices           | `implementing` | `platform`          | External Source Provenance       | Task 1 accepted; Task 2 contract and paths frozen.           |
| 3. Deterministic scan orchestration              | `planned`      | `platform-security` | External Evidence Pipeline       | Task 1 accepted; may parallel Task 2 on disjoint paths.      |
| 4. Candidate registry, API, CLI, and isolation   | `planned`      | `integration`       | Candidate Registry               | Tasks 1-3 and Commercial Foundation Task 1 accepted.         |
| 5. Review-only promotion packets                 | `planned`      | `governance`        | External Capability Promotion    | Task 4 and Commercial Foundation Task 1 accepted.            |
| 6. Bulk acceptance and release evidence          | `planned`      | `qa`                | External Intake Release Evidence | Tasks 1-5 and Commercial Foundation Task 1 accepted.         |

## Task 1 card: Candidate contracts and immutable persistence

- **State:** `accepted`
- **Specialization:** `integration`
- **Contract owner:** External Intake Contract
- **Contract artifact:** design Core records, Candidate/Golden registry table,
  storage layout, and the machine-readable 43/108 portfolio projection.
- **Dependencies:** Controller acceptance recorded and satisfied; no Commercial
  Foundation product path dependency.

The accepted design Core records, Candidate/Golden registry table, storage
layout, machine-readable 43/108 portfolio projection, and the exact allowed
paths below are frozen for this implementation. Any change returns Task 1 to a
recorded repair round and stops dependent dispatch.

### Exact allowed paths

- `packages/external-intake/package.json`
- `packages/external-intake/tsconfig.json`
- `packages/external-intake/vitest.config.ts`
- `packages/external-intake/src/contracts.ts`
- `packages/external-intake/src/canonical.ts`
- `packages/external-intake/src/store.ts`
- `packages/external-intake/src/portfolio.ts`
- `packages/external-intake/src/index.ts`
- `packages/external-intake/test/contracts.test.ts`
- `packages/external-intake/test/store.test.ts`
- `packages/external-intake/test/portfolio.test.ts`
- `ecosystem/portfolio/2026-07-30-external-business-logic.json`
- `.gitignore`
- `pnpm-lock.yaml`

Ignored operational-evidence exception (not a product or runtime path):

- `.superpowers/sdd/2026-07-31-external-capability-intake/task-1-report.md`

### Non-goals

- No source retrieval, scanner, Candidate creation, conformance, CLI, promotion,
  Golden asset, Graph, Control Plane, compiler, or profile behavior.
- No external source bytes, dependency adoption, source-copy decision, licence
  approval, secret/raw finding, arbitrary path, or credential field.

### Acceptance evidence

- Strict schema, canonical hash, raw-byte digest, opaque-ID, immutable-write,
  symlink/path escape, overwrite, unknown-field, and redaction tests pass.
- Portfolio evidence proves exactly 43 unique source records, 108 unique
  numbered scenario demand mappings, and class totals 1/11/7/8/16 without
  creating an Intake request for excluded/architecture-only records.
- Quarantine is ignored and no product manifest imports External Intake.

### Independent review: Fix Round 1/5

Review is BLOCKED on these four P1 findings:

1. Add common provenance fields on every persistent record.
2. Require exactly one each licence, secret, SAST, and dependency scan in the
   evidence bundle.
3. Reject ADS and Windows-invalid filesystem characters in safe path segments.
4. Add a job/sequence receipt index with exclusive-create, idempotent retry,
   conflict, and out-of-order checks.

Repair remains bounded to the original Task 1 contract, scope, and exact
allowed paths. Tasks 2 through 6 remain `planned`.

### Independent re-review: Fix Round 2/5

Re-review FAILED with one remaining P1: the receipt sequence index is written
before backing content, and chain extension does not validate that the index
reference exists, its digest matches, and its job/sequence match.

Required repair: verify and write the receipt record first, then exclusively
publish the index. Before extending the chain, validate the indexed backing
record. Add missing and tampered backing-record regressions.

Repair remains bounded to the original Task 1 contract, scope, and exact
allowed paths. Tasks 2 through 6 remain `planned`.

Fix Round 2 independent re-review PASSED with no P0/P1/P2. The reconciled Task
1 release code set is:

- `9ea692c` (`feat: add external intake contracts`)
- `f0a73f7` (`fix: harden external intake contracts`)
- `e4c2314` (`fix: validate receipt index backing records`)

Task 1 moved `implementing -> ready_for_qa`; at that handoff, independent
behavioral QA remained required. The original Task 1 contract, scope, and exact
allowed paths remained frozen, and Tasks 2 through 6 remained `planned`.

### QA, release review, and acceptance reconciliation

The explicit Task 1 release code set is:

- `9ea692c` (`feat: add external intake contracts`)
- `f0a73f7` (`fix: harden external intake contracts`)
- `e4c2314` (`fix: validate receipt index backing records`)

Independent QA passed the Task 1 slice with no Task-1-owned P0/P1/P2. Evidence
included 49/49 focused and full Intake tests across three files, Node 22.11.0
package test/typecheck/lint gates, 12/12 workspace test and typecheck tasks,
five third-party notices, two immutable source studies, clean diff state, and
the frozen-path boundary.

The repository-wide formatting gate separately reports inherited debt:
`pnpm format:check` finds 81 pre-existing files, and workspace lint reproduces
an unchanged formatting failure in
`apps/compiler-worker/src/artifact-writer.ts`. None of those files changed in
the Task 1 release set, while the External Intake package formatter and lint
pass. This inherited global debt is not represented as Task 1 release content
or a Task 1-owned defect.

Independent release review PASSED after separating that inherited debt from
the bounded Task 1 release set. State-transition history is preserved:

1. `implementing -> ready_for_qa` after Fix Round 2 re-review PASS, recorded by
   PM commit `bead907`;
2. `ready_for_qa -> reviewed` after independent QA PASS and PM reconciliation;
3. `reviewed -> accepted` after release review PASS and final evidence
   reconciliation in this ledger update.

Task 1 is accepted and frozen. Reopening its release set, contract, scope, or
exact allowed paths requires a new recorded repair state. Tasks 2 through 6
remain `planned`.

## Task 2 card: Fixed-source provenance, licences, and notices

- **State:** `implementing`
- **Specialization:** `platform`
- **Contract owner:** External Source Provenance
- **Contract artifact:** accepted Task 1 records/store plus the design's source
  acquisition and fail-closed rules.
- **Dependencies:** Task 1 `accepted`; dependency satisfied.

The accepted Task 1 records/store, the design's source acquisition and
fail-closed rules, and the exact allowed paths below are frozen for Task 2.
Any change returns Task 2 to a recorded repair round and stops dependent
dispatch.

### Exact allowed paths

- `packages/external-intake/src/source-client.ts`
- `packages/external-intake/src/snapshot.ts`
- `packages/external-intake/src/evidence.ts`
- `packages/external-intake/test/source-client.test.ts`
- `packages/external-intake/test/snapshot.test.ts`
- `packages/external-intake/test/evidence.test.ts`
- `packages/external-intake/test/fixtures/public-source/**`

### Non-goals

- No Git hooks/clone, extraction/execution, package installation, scanner,
  Candidate, Graph, runtime, private repository, credential, or licence ruling.
- No non-GitHub host in the first slice and no unexpected cross-host redirect.

### Acceptance evidence

- Exact tag/full-SHA resolution, annotated-tag peeling, expected-SHA mismatch,
  host/redirect, response-limit, raw archive/tree digest, path/mode/collision,
  licence/notice, provenance, and immutable failure-receipt tests pass.
- All tests are deterministic through an injected client and use no network.

### Independent review: Fix Round 1/5

Review FAILED on these P1 findings:

1. Preflight tree metadata count, path, mode, declared size, and cumulative
   limit before any blob fetch. Add bounded-cache and no-fetch-over-limit
   regression coverage.
2. Do not falsely identify a phase marker as SBOM, scanner, or AST evidence.
   Persist an honest Task 2 acquisition/provisional record or distinct
   schema-valid unavailable artifacts, escalating a schema mismatch if needed.
3. Use total, locale-independent canonical ordering and add a reversed mixed
   Unicode/ASCII test.

P2: rerun the focused suite, full suite, typecheck, and lint on Node 22.

Repair remains bounded to the original Task 2 contract, scope, and exact
allowed paths. Tasks 3 through 6 remain `planned`.

## Task 3 card: Deterministic local scans and module inventory

- **State:** `planned`
- **Specialization:** `platform-security`
- **Contract owner:** External Evidence Pipeline
- **Contract artifact:** accepted Task 1 records/store and code-owned pinned
  scanner/module-inventory interfaces.
- **Dependencies:** Task 1 `accepted`; may run alongside Task 2 only while the
  Task 1 contract is frozen and paths remain disjoint.

### Exact allowed paths

- `packages/external-intake/src/scans.ts`
- `packages/external-intake/src/module-inventory.ts`
- `packages/external-intake/src/jobs.ts`
- `packages/external-intake/test/scans.test.ts`
- `packages/external-intake/test/module-inventory.test.ts`
- `packages/external-intake/test/jobs.test.ts`
- `packages/external-intake/test/fixtures/scans/**`

### Non-goals

- No scanner/package adoption, user-selected executable/arguments/ruleset,
  shell, source execution/transformation, network call, Candidate, promotion,
  legal approval, Graph, compiler, or runtime behavior.

### Acceptance evidence

- Exactly four pinned scan kinds produce normalized deterministic records and
  raw quarantined reports; missing/duplicate/unavailable/drifted scanners fail.
- Secret, high/critical, dynamic-eval, parser, generated/binary, prohibited path,
  and ruleset fixtures block only their source item and preserve sibling
  receipts. Identical resumes reuse refs; changed parents create new evidence.

## Task 4 card: Candidate registry, module API, CLI, and isolation

- **State:** `planned`
- **Specialization:** `integration`
- **Contract owner:** Candidate Registry
- **Contract artifact:** accepted Tasks 1-3 contracts and the frozen Commercial
  Foundation Golden/Publish verification boundary.
- **Dependencies:** Tasks 1-3 `accepted`; Commercial Capability Foundation Task
  1 `accepted`.

### Exact allowed paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/conformance.ts`
- `packages/external-intake/src/index.ts`
- `packages/external-intake/test/candidates.test.ts`
- `packages/external-intake/test/api.test.ts`
- `packages/external-intake/test/conformance.test.ts`
- `apps/intake-cli/package.json`
- `apps/intake-cli/tsconfig.json`
- `apps/intake-cli/vitest.config.ts`
- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`
- `packages/graph/test/application-graph.test.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `pnpm-lock.yaml`

### Non-goals

- No Control Plane/public HTTP route, browser picker, source body, arbitrary
  output, approval/promote command, Golden registration, product dependency,
  Graph mutation, publication, compilation, or generated application import.

### Acceptance evidence

- Candidate artifacts contain only identifiers/schemas/effects and declared
  manifest/fixture/adapter/conformance-plan outputs; status is append-only.
- A safe fixture can become `conformance-passed`, while Candidate API version,
  identity, path, and digest reject at Graph, Golden registry/lock, and compiler
  boundaries. Only the CLI imports External Intake.
- CLI output is redacted and accepts only local request files and opaque IDs.

## Task 5 card: Review-only promotion packets

- **State:** `planned`
- **Specialization:** `governance`
- **Contract owner:** External Capability Promotion
- **Contract artifact:** accepted Candidate Registry and design promotion gates.
- **Dependencies:** Task 4 `accepted`; Commercial Capability Foundation Task 1
  `accepted`.

### Exact allowed paths

- `packages/external-intake/src/promotion.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/index.ts`
- `packages/external-intake/test/promotion.test.ts`
- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`

### Non-goals

- No decision, approval, waiver, notice modification, source copy, dependency,
  Golden asset/registry write, Graph, compiler, profile, or provider activation.

### Acceptance evidence

- Complete parent digests, manual licence status, finding dispositions, exact
  source-copy ranges, notices destination, reviewers, Factory interface,
  removal path, and collision checks are required.
- Only `conformance-passed` yields a pending packet; incomplete/excluded/
  colliding input fails. CLI renders with exclusive create and has no approval
  or promotion operation.

## Task 6 card: Bulk acceptance and release evidence

- **State:** `planned`
- **Specialization:** `qa`
- **Contract owner:** External Intake Release Evidence
- **Contract artifact:** accepted Tasks 1-5 plus
  `docs/acceptance/external-capability-intake.md`.
- **Dependencies:** Tasks 1-5 `accepted`; Commercial Capability Foundation Task
  1 `accepted`.

### Exact allowed paths

- `apps/intake-cli/test/bulk-intake.test.ts`
- `packages/external-intake/test/release-boundary.test.ts`
- `docs/acceptance/external-capability-intake.md`
- `docs/project-status.md`

### Non-goals

- No implementation repair, promotion, Golden asset, source copy, dependency,
  real provider, private source, credential, raw finding/source, external
  commitment, cloud deployment, or unrelated resource cleanup.

### Acceptance evidence

- Mixed deterministic batch covers safe and every fail-closed class, preserves
  per-source isolation/resume, preflights 43 sources and 108 demand signals,
  creates no scenario Candidate, and cleans only exact run-owned quarantine.
- At most two no-credential public fixed-reference smoke probes record only
  identity/SHA/count/status/version/digests; unavailability is not a fixture
  pass. Candidate remains invisible to Graph/Golden/compiler.
- Independent task review, QA, release review, and fresh verification reconcile
  with no open load-bearing finding before acceptance.

## Review sequence and stop conditions

1. PM moves one dependency-ready task to `implementing` and freezes its
   contract artifact and exact paths.
2. Engineer supplies focused RED/GREEN evidence and a bounded commit.
3. Independent task reviewer checks specification and code quality. Any P0/P1
   or material P2 returns the task to `implementing` with a repair round.
4. PM moves clean implementation to `ready_for_qa`; independent QA reproduces
   functional, adversarial, privacy, and cleanup behavior.
5. PM reconciles review and QA before `reviewed`; release review and fresh
   verification are still mandatory before `accepted`.
6. Tasks 2 and 3 are the only permitted parallel writers, after Task 1 is
   accepted, while their exact paths remain disjoint.
7. Any path from Candidate data to a Graph, Golden registry/lock, Published
   Revision, compiler, generated app, provider runtime, source-copy operation,
   or automatic decision immediately stops all work and triggers controller
   review.
8. Any new scanner/archive/dependency/tool adoption stops the relevant task
   until a fixed-version source study, licence notice, security review, and
   governance decision are accepted.

## Risks and next smallest valuable slice

- **Supply-chain risk:** upstream bytes or scanner output could be treated as
  trusted. Content addressing, immutable receipts, manual licence status, and
  Candidate isolation are release gates.
- **Execution risk:** a scanner/source adapter could become an arbitrary command
  runner. All adapters are code-owned and requests contain no commands.
- **Portfolio risk:** 108 scenarios could be mistaken for ready profiles. They
  remain demand metadata and cannot create Candidates or Drafts.
- **Governance risk:** `conformance-passed` could be mistaken for Golden. It has
  no promotion authority, and the first slice creates no Golden asset.
- **Coordination risk:** Candidate isolation tests touch frozen Graph,
  Capabilities, and compiler test paths. Task 4 waits for Commercial Foundation
  Task 1 acceptance and exclusive path ownership.

The active smallest valuable slice is Task 2: fixed-source provenance,
licences, notices, and fail-closed acquisition. Task 1 remains accepted and
frozen; Task 2 implementation is bounded to its frozen contract and exact
paths, and Tasks 3 through 6 remain `planned` until explicitly dispatched after
their recorded dependency gates are met.
