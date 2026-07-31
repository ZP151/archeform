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
`accepted` with its bounded shared-contract amendment reconciled; its original
release behavior remains accepted and frozen. Task 2 is `accepted` after Fix
Round 2/5. Task 3 is `accepted` after Fix Round 4/5 independent re-review, QA,
release review, and fresh final verification all passed with no P0/P1/P2. Task
4 is now `ready_for_qa` under its frozen Candidate Registry contract, exact
allowed paths, and non-goals. A Controller-approved bounded test-contract
amendment adds only `packages/external-intake/test/portfolio.test.ts` to permit
`apps/intake-cli/package.json` as the single `@factory/external-intake`
importer/dependency; the prohibition remains everywhere else. Tasks 5 and 6
remain `planned`. Independent Task 4 review of commit `33fd204` then FAILED with
four P1 findings and one P2. The Controller authorized bounded Repair Round 1/5
and exactly three additional production paths; Task 4 remains `implementing`
under the amended frozen scope. Repair Round 1 re-review then FAILED with one
P1 fresh-process verification finding. Task 4 remains `implementing` in Repair
Round 2/5 without another path amendment. Repair Round 2 re-review then FAILED
with one P1 lifecycle-bypass finding. Task 4 remains `implementing` in Repair
Round 3/5 within its existing Candidate/API/CLI/test paths. Repair Round 3
re-review then FAILED with one P1 exactly-once concurrency finding. Task 4
remained `implementing` in Repair Round 4/5 within its existing
Candidate/API/test paths. Repair Round 4 independent re-review subsequently
PASSED with no P0/P1/P2, and the PM moved Task 4
`implementing -> ready_for_qa`. Independent behavioral QA remains required. The
QA gate then FAILED with two P1 evidence gaps and one P2 formatting defect. The
PM returned Task 4 `ready_for_qa -> implementing` for Repair Round 5/5, limited
to test evidence and `pnpm-lock.yaml` formatting. Repair Round 5 independent
re-review then PASSED with no P0/P1/P2, and the PM moved Task 4
`implementing -> ready_for_qa`. Independent behavioral QA then PASSED with no
P0/P1/P2, and the PM moved Task 4 `ready_for_qa -> reviewed`. Independent
release review then FAILED with two P1 findings and one P2. After the final
scheduled repair round, the Controller escalated and authorized one strict
convergence Repair Round 6/6. The PM returned Task 4
`reviewed -> implementing`; fresh task review, QA, release review, and final
verification will all be required again. Implementation review then exposed a
P1 mixed-terminal process race, and the Controller authorized the exact
`store.ts`/`store.test.ts` atomic terminal sequence-2 CAS amendment recorded in
the Task 4 card. Repair Round 6/6 implementation commit `3f4b58c` then passed
its bounded checks, but root review found a P1 public-store boundary leak and a
P2 test-import defect. The Controller authorized Repair Round 7/7 to make the
terminal CAS internal-only without changing its atomic semantics. Repair Round
7 implementation commit `3112e26` and root review then passed with no
P0/P1/P2, and the PM moved Task 4 `implementing -> ready_for_qa`. Independent
behavioral QA then PASSED with no P0/P1/P2, and the PM moved Task 4
`ready_for_qa -> reviewed`. Independent release review and fresh final
verification then found one P1 privacy gap: delimiter-bearing opaque
high-entropy tokens could bypass Candidate and CLI detection. The Controller
authorized Repair Round 8/8, and the PM returned Task 4
`reviewed -> implementing`. Repair Round 8/8 product commit `f8bb51f` passed its
bounded tests, but root review found one remaining P1 privacy shape: an optional
case-insensitive `Authorization:` prefix could bypass the token detector. The
Controller authorized narrow Repair Round 9/9. Repair commit `aee5c99` and its
independent task review then PASSED with no P0/P1/P2, closing the prefix gap
without changing the frozen allow-lists or any other Task 4 behavior. The PM
moved Task 4 `implementing -> ready_for_qa`; independent behavioral QA remains
required. The system will ingest the 43 fixed-reference
portfolio as metadata, retain the 108 scenarios as composition demand signals,
and produce only quarantined evidence, non-executable Candidate records, and
pending-review promotion packets.

Task 1 independent QA and release review PASSED. Its release code set and
accepted behavior remain frozen. The Controller has reopened only its shared
persistent-record contract to add a truthful acquisition record. That bounded
amendment has now passed re-QA and release review and is accepted.

The Commercial Capability Foundation remains the Golden execution boundary.
External Intake Task 2 is accepted and frozen. Its acceptance satisfies Task
3's recorded dependency gate. The PM has dispatched Task 3 under its frozen
External Evidence Pipeline contract and exact paths. Independent Task 3 review
FAILED with three P1 findings, so Task 3 remains `implementing` in Fix Round
1/5. Fix Round 1 independent re-review subsequently PASSED with no P0/P1/P2,
and the PM moved Task 3 `implementing -> ready_for_qa`. Independent QA then
PASSED with no P0/P1/P2, and the PM moved Task 3
`ready_for_qa -> reviewed`. No downstream work has started; Tasks 4-6 remain
blocked on their preceding Intake dependencies. Release review then FAILED
with three P1 findings and one P2, so the PM returned Task 3
`reviewed -> implementing` for Fix Round 2/5. Fix Round 2 re-review FAILED with
three remaining P1 findings, so Task 3 continues `implementing` in Fix Round
3/5. Fix Round 3 independent re-review subsequently PASSED with no P0/P1/P2,
and the PM moved Task 3 `implementing -> ready_for_qa`. Independent QA then
PASSED with no P0/P1/P2, and the PM moved Task 3
`ready_for_qa -> reviewed`. Release review then FAILED with one P1, so the PM
returned Task 3 `reviewed -> implementing` for Fix Round 4/5. Fix Round 4
independent re-review subsequently PASSED with no P0/P1/P2, and the PM moved
Task 3 `implementing -> ready_for_qa`. Independent QA then PASSED with no
P0/P1/P2, and the PM moved Task 3 `ready_for_qa -> reviewed`. Independent
release review then PASSED with no P0/P1/P2. Fresh Controller verification on
Node v22.11.0 passed 197/197 External Intake tests, typecheck, lint/Prettier,
`git diff --check c2f3c87 HEAD`, and clean-worktree verification. The PM moved
Task 3 `reviewed -> accepted`; its External Evidence Pipeline contract and
accepted recovery behavior are frozen.

Task 3 acceptance satisfies Task 4's final recorded dependency. The Controller
dispatched Task 4 with exclusive ownership of its frozen paths, and the PM moved
Task 4 `planned -> implementing`. Its existing Candidate Registry contract,
exact allowed paths, non-goals, and acceptance evidence are frozen. No other
Task 4 writer is authorized; Tasks 5 and 6 remain `planned`.

Task 4 verification then reached 215/216 because the accepted Task 1
`portfolio.test.ts` prohibition rejected the plan-required Intake CLI
dependency. The Controller approved a minimal Task 4/Task 1 test-contract
amendment: add exactly `packages/external-intake/test/portfolio.test.ts` to Task
4 ownership solely to exempt `apps/intake-cli/package.json` as the single
permitted `@factory/external-intake` importer/dependency. The prohibition
remains unchanged for every other package and path. There is no Graph, Golden,
compiler, or production linkage and no other Task 1 change. Task 4 remains
`implementing`, and its sole writer has been notified.

Independent Task 4 review of commit `33fd204` FAILED with four P1 findings and
one P2: Candidate identity crossed valid Graph/compiler boundaries; registry,
API, and CLI discovery was process-local; Candidate evidence validation weakly
reimplemented rather than reused the accepted Task 3 chain; a raw public status
append could forge `conformance-passed`; and forbidden mutation effects were
accepted. The Controller authorized bounded Repair Round 1/5 and added exactly
`packages/graph/src/model.ts`, `packages/compiler/src/index.ts`, and
`packages/external-intake/src/jobs.ts` to the Task 4 production paths for the
recorded repair only. Task 4 remains `implementing`; Tasks 5 and 6 remain
`planned`.

Repair Round 1 re-review of commit `53f2150` FAILED with one P1: receipt-addressed
fresh-process verification could skip the accepted Task 3 verifier, artifact
rehydration, and persisted conformance-result verification when optional
volatile fields were absent. The Controller authorized Repair Round 2/5 within
the existing Task 4 Candidate/API/test paths. Task 4 remains `implementing`;
the frozen Task 2 store, isolation contract, dependencies, and Tasks 5-6 states
are unchanged.

Repair Round 2 re-review of commit `fad4a5b` FAILED with one P1: a fresh
recovered Candidate could reach conformance evaluation and persist
`conformance-passed` before strict full Candidate verification completed. The
Controller authorized Repair Round 3/5 within the existing Task 4
Candidate/API/CLI/test paths. Task 4 remains `implementing`; Task 2, Graph,
compiler, dependencies, runtime behavior, and Tasks 5-6 states are unchanged.

Repair Round 3 re-review of commit `1c52a42` FAILED with one P1: two overlapping
fresh conformance calls could append duplicate Candidate revisions and receipts,
create an unsupported sequence-3 chain, and make later fresh discovery fail.
The Controller authorized Repair Round 4/5 within the existing Task 4
Candidate/API/test paths. Task 4 remains `implementing`; Task 2, the immutable
store, dependencies, Graph, compiler, and Tasks 5-6 states are unchanged.

Repair Round 4 independent re-review of commit `986319a` PASSED with no
P0/P1/P2. The prior exactly-once finding is closed: concurrent fresh callers
produce exactly one Candidate revision and receipt delta, persist only sequence
2, preserve valid fresh show/verification, and retry without another delta. The
PM moved Task 4 `implementing -> ready_for_qa`. This is not QA, release review,
or acceptance; the full repair history, contract, exact paths, and scope remain
frozen. Tasks 5 and 6 remain `planned`.

Independent Task 4 QA FAILED with two P1 evidence gaps and one P2 gate defect:
the separate-OS-process conformance race existed only as reviewer evidence, not
a deterministic repository regression; fabricated/truncated receipt corruption
was not exercised across every public Candidate path; and Task 4's
`pnpm-lock.yaml` failed Prettier. The PM returned Task 4
`ready_for_qa -> implementing` for Repair Round 5/5. The repair is test-only
except mechanical lockfile formatting; no production, Task 2, dependency,
Graph, compiler, or runtime change is authorized. Tasks 5 and 6 remain
`planned`.

Repair Round 5 independent re-review of commit `0f7811a` PASSED with no
P0/P1/P2. Fresh evidence repeated the separate-OS-process race 3/3, passed the
fabricated/truncated public-path corruption matrix, passed focused and full
relevant suites, and proved the formatted lockfile has no semantic change. The
PM moved Task 4 `implementing -> ready_for_qa`. This is not QA, release review,
or acceptance; Task 5 and Task 6 remain `planned` and unstarted.

Final independent Task 4 QA PASSED with no P0/P1/P2. Fresh Node v22.11.0
evidence passed the separate-process race 3/3, corruption matrix 10/10, External
Intake 268/268, CLI 10/10, Graph 27/27, Golden boundary 71/71, Compiler 47/47,
and forced workspace 14/14. The PM moved Task 4
`ready_for_qa -> reviewed`. Inherited root formatting debt remains outside Task
4 scope; independent release review and fresh final verification are still
required. Task 4 is not accepted, and Tasks 5 and 6 remain `planned`.

Independent release review then FAILED with two P1 findings and one P2:
Candidate artifacts could persist sensitive credentials or prompt/response
data; warm locator fallback did not enforce the requested Candidate version;
and the frozen append-only `blocked` and `rejected` lifecycle operations were
absent. The Controller escalated after Repair Round 5/5 and authorized one
strict convergence Repair Round 6/6 within the existing Task 4
Candidate/API/CLI/test paths. The PM returned Task 4
`reviewed -> implementing`. Tasks 5 and 6 remain `planned` and unstarted.

Independent Task 2 review FAILED with three P1 findings and one P2. The
Controller resolved its schema incompatibility by selecting a distinct
`factory.external-source-acquisition/v1` record. Task 2 entered Fix Round 1/5
under its original scope and exact frozen paths. Tasks 3 through 6 remained
`planned`.

Task 2 Fix Round 1 re-review PASSED with no P0/P1/P2. The PM reconciled the
repair and moved Task 2 `implementing -> ready_for_qa`; independent behavioral
QA subsequently passed. Release review PASSED with two P2 findings, and the
Controller classified the failure-receipt finding as material to audit
integrity. Task 2 therefore returned to `implementing` for Fix Round 2/5. The
Fix Round 2 independent re-review subsequently PASSED with no P0/P1/P2, and the
PM moved Task 2 `implementing -> ready_for_qa` again. Re-QA and release review
then PASSED, and the PM reconciled Task 2 through `reviewed` to `accepted`.

Acquisition amendment Fix Round 2 re-review PASSED with no P0/P1/P2. The PM
reconciled Fix Rounds 1 and 2 and moved the amendment
`implementing -> ready_for_qa`; its contract and exact amendment-owned paths
remain frozen.

| Task                                             | State          | Specialization      | Contract owner                   | Dependency gate                                             |
| ------------------------------------------------ | -------------- | ------------------- | -------------------------------- | ----------------------------------------------------------- |
| 1. Candidate contracts and immutable persistence | `accepted`     | `integration`       | External Intake Contract         | Original release and bounded amendment accepted and frozen. |
| 2. Fixed-source provenance and notices           | `accepted`     | `platform`          | External Source Provenance       | Re-QA and release review PASS; accepted and frozen.         |
| 3. Deterministic scan orchestration              | `accepted`     | `platform-security` | External Evidence Pipeline       | Fix Round 4 release and final verification PASS; frozen.    |
| 4. Candidate registry, API, CLI, and isolation   | `ready_for_qa` | `integration`       | Candidate Registry               | Round 9 task review PASS; independent QA is next.           |
| 5. Review-only promotion packets                 | `planned`      | `governance`        | External Capability Promotion    | Task 4 and Commercial Foundation Task 1 accepted.           |
| 6. Bulk acceptance and release evidence          | `planned`      | `qa`                | External Intake Release Evidence | Tasks 1-5 and Commercial Foundation Task 1 accepted.        |

## Task 1 card: Candidate contracts and immutable persistence

- **State:** `accepted`; original release behavior and bounded amendment are
  frozen.
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

Task 1 release behavior remains accepted and frozen. Reopening its release set,
behavior, scope, or original exact allowed paths requires a new recorded repair
state. The bounded shared-contract amendment below does not reopen or alter the
accepted release behavior.

### Bounded acquisition-record contract amendment

The Controller selected a distinct persistent
`factory.external-source-acquisition/v1` record. It is never a Candidate or an
EvidenceBundle. It records the source request, resolved reference,
snapshot/tree, licence, notices, provenance, literal
`manualStatus: "unreviewed"`, and explicit acquisition state. It cannot claim
SBOM, scanner, scan-result, or AST identities. Task 3 will consume it with real
pinned scan and inventory outputs to create a truthful EvidenceBundle.

Exact amendment-owned paths:

- `packages/external-intake/src/contracts.ts`
- `packages/external-intake/src/index.ts`
- `packages/external-intake/src/store.ts`
- `packages/external-intake/test/contracts.test.ts`
- `packages/external-intake/test/store.test.ts`

Amendment acceptance requires:

- strict parsing, common provenance fields, literal unreviewed manual status,
  and explicit acquisition state;
- rejection of Candidate/Golden/EvidenceBundle identity and every SBOM,
  scanner, scan-result, or AST identity/field;
- registration of a distinct acquisition kind in `ExternalIntakeStore` plus
  immutable write/read round-trip evidence without changing accepted Task 1
  behavior;
- focused contract/store, full External Intake, typecheck, and lint evidence on
  Node 22, followed by independent review, QA, and release reconciliation.

Any amendment contract or path change stops work and starts a recorded repair
round. Task 2 is BLOCKED until this amendment is accepted. Tasks 3 through 6
remain `planned`.

Amendment code commit `989c75b` passed independent task review with no
P0/P1/P2. The PM moved only the amendment
`implementing -> ready_for_qa`; independent behavioral QA remains required.
The original Task 1 release set and behavior remain accepted and frozen, Task 2
remains BLOCKED, and Tasks 3 through 6 remain `planned`.

#### Amendment Fix Round 1/5

Release review FAILED with one P1. Acquisition store writes must:

- require exactly the request and snapshot direct parents;
- load and digest-verify both parents under their required record kinds;
- cross-check repository URL, requested ref, resolved commit, archive/tree
  digests, and request linkage;
- reject absent, tampered, wrong-kind, mismatched, or extra parent digests.

The amendment remains `implementing` with its contract and exact paths frozen.
The accepted Task 1 release behavior is unchanged, Task 2 remains BLOCKED, and
Tasks 3 through 6 remain `planned`.

#### Amendment Fix Round 2/5

Fix Round 1 re-review FAILED with one remaining P1. When a request
`requestedRef` is a full 40-character SHA, the acquisition and snapshot
`resolvedCommit` must equal it even when `expectedCommit` is undefined.

Required repair: enforce that equality and add an adversarial regression for a
full-SHA `requestedRef` mismatch without `expectedCommit`.

At that repair gate, the amendment remained `implementing` with no scope or
path change. The accepted Task 1 release behavior remained frozen, Task 2
remained BLOCKED, and Tasks 3 through 6 remained `planned`.

Fix Round 2 independent re-review PASSED with no P0/P1/P2. Fix Rounds 1 and 2
are reconciled. The bounded amendment code set is:

- `989c75b`
- `af4973c`
- `174d2a0`

The amendment moved `implementing -> ready_for_qa`; at that handoff,
independent behavioral QA remained required before acceptance. Its contract and
paths remained frozen, the original Task 1 release behavior remained accepted
and frozen, Task 2 remained BLOCKED, and Tasks 3 through 6 remained `planned`.

#### Amendment QA, release review, and acceptance reconciliation

The explicit bounded amendment code set is
`989c75b + af4973c + 174d2a0`.

Independent re-QA PASSED on Node 22.11.0 with no P0/P1/P2. Evidence included
72/72 focused contract/store tests, 15/15 persisted-parent adversarial tests,
115/115 full External Intake tests, typecheck, lint, clean code-set diff, and no
product import of External Intake or the acquisition contract.

Independent release review PASSED. The PM preserved both final transitions:

1. `ready_for_qa -> reviewed` after re-QA reconciliation;
2. `reviewed -> accepted` after release review and final evidence
   reconciliation in this ledger update.

The bounded amendment is accepted and frozen. The original Task 1 release
behavior and release set remain separately accepted and frozen. Task 2's
amendment dependency is satisfied, so its existing Fix Round 1/5 resumes under
its unchanged scope and exact paths. Tasks 3 through 6 remain `planned`.

## Task 2 card: Fixed-source provenance, licences, and notices

- **State:** `accepted`
- **Specialization:** `platform`
- **Contract owner:** External Source Provenance
- **Contract artifact:** accepted Task 1 records/store plus the design's source
  acquisition and fail-closed rules, amended with
  `factory.external-source-acquisition/v1`.
- **Dependencies:** accepted Task 1 release behavior plus accepted bounded
  acquisition-record amendment. Both dependencies are satisfied; Fix Round 1/5
  and Fix Round 2/5 are reconciled.

The accepted Task 1 records/store, the design's source acquisition and
fail-closed rules, and the exact allowed paths below are frozen for Task 2.
Any change returns Task 2 to a recorded repair round and stops dependent
dispatch.

Task 2 output is `{ snapshot, acquisition }`. It does not emit an
EvidenceBundle or represent a phase marker as SBOM, scanner, scan-result, or
AST evidence. Task 3 will create the first truthful EvidenceBundle.

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

Fix Round 1 independent re-review PASSED with no P0/P1/P2. The reconciled Task
2 code set is `515e0ba + 3dcb20f`, and it depends on the accepted acquisition
amendment `989c75b + af4973c + 174d2a0`.

Fresh Node 22 evidence passed the full External Intake suite at 123/123 along
with the focused Task 2 suite, typecheck, and lint. Task 2 moved
`implementing -> ready_for_qa`; independent behavioral QA remains required.
Its contract, scope, and exact paths remain frozen, and Tasks 3 through 6 remain
`planned`.

### QA and release review: Fix Round 2/5

Independent QA passed on Node 22 with 46/46 focused Task 2 tests, 72/72
contract/store tests, 123/123 full External Intake tests, typecheck, lint, and
the bounded code-set diff all clean. Release review then PASSED with two P2
findings. The Controller classified the failure-receipt P2 as material to audit
integrity, so Task 2 returned `ready_for_qa -> implementing` for Fix Round 2/5.

The bounded repairs are:

1. Normalize unknown caught errors before receipt creation so `null` or
   `undefined` rejections still append a redacted immutable blocked receipt;
   add an adversarial regression for this behavior.
2. Correct and supersede the Task 2 report's obsolete fake-scan summary. Task 2
   emits only `{ snapshot, acquisition }`; it emits no EvidenceBundle, SBOM,
   scanner, scan-result, or AST identity. Task 3 creates the first truthful
   EvidenceBundle from real scan and inventory outputs.

Task 2's contract, scope, and exact allowed paths remain frozen. Tasks 3 through
6 remain `planned`.

Fix Round 2 independent re-review PASSED with no P0/P1/P2. The reconciled Task
2 code set is `515e0ba + 3dcb20f + dcaddf4`. Fresh Node 22 evidence passed the
full External Intake suite at 125/125 together with the focused Task 2 suite,
typecheck, lint, and bounded diff checks. The PM moved Task 2
`implementing -> ready_for_qa`; independent behavioral QA remains required.
The contract, scope, and exact allowed paths remain frozen, and Tasks 3 through
6 remain `planned`.

### Re-QA, release review, and acceptance reconciliation

The explicit Task 2 code set is `515e0ba + 3dcb20f + dcaddf4`. Independent
re-QA PASSED on Node 22 with 2/2 focused unknown-rejection tests, 48/48 focused
Task 2 tests, 125/125 full External Intake tests, typecheck, lint, and the
bounded diff all clean. Independent release review PASSED.

No sandboxed live GitHub target was supplied, so QA did not run a live operator
smoke probe. This disclosed coverage boundary is preserved: Task 2 acceptance
is based on deterministic injected, network-free acquisition tests, and the
absence of a live smoke is non-blocking for this slice. A future operator probe
must report unavailability truthfully and may not be represented as a fixture
pass.

The PM preserved the final transitions:

1. `ready_for_qa -> reviewed` after re-QA reconciliation;
2. `reviewed -> accepted` after release review and final evidence
   reconciliation in this ledger update.

Task 2 is accepted and frozen. Its acceptance satisfies Task 3's dependency
gate; the PM has now dispatched Task 3 under its recorded contract and exact
paths. Tasks 4 through 6 remain `planned`.

## Task 3 card: Deterministic local scans and module inventory

- **State:** `accepted`
- **Specialization:** `platform-security`
- **Contract owner:** External Evidence Pipeline
- **Contract artifact:** accepted Task 1 records/store including the acquisition
  record, accepted Task 2 snapshot/acquisition output, and code-owned pinned
  scanner/module-inventory interfaces.
- **Dependencies:** Task 1 bounded amendment and Task 2 `accepted`. Both are
  accepted and frozen; Task 3 is dispatched.

The accepted Task 1 acquisition-record amendment, accepted Task 2
`{ snapshot, acquisition }` output, code-owned pinned scanner/module-inventory
interfaces, and exact allowed paths below are frozen for Task 3. Any contract,
dependency, or path change stops implementation and returns Task 3 to a
recorded repair round. Tasks 4 through 6 remain `planned`.

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

### Independent review: Fix Round 1/5

Independent review FAILED with three P1 findings:

1. Bind snapshot-view bytes, modes, and digests to the accepted source tree.
   Validate accepted file modes, recompute each body digest, recompute the
   actual canonical tree digest, and compare it with the accepted snapshot.
   Add an adversarial regression proving that substituted body/digest content
   with a preserved label is rejected.
2. Resume only from a loaded and verified immutable receipt chain. After a
   failed attempt or divergent output, create a new immutable attempt/revision
   identity rather than restarting a colliding sequence. Add fail-then-success
   and changed-report regressions.
3. Derive the allow-listed applicable inventory file set from the accepted
   snapshot and require exactly one disposition for every applicable file.
   Exercise real parser-error and dynamic-eval fixtures through the fixture
   adapter instead of trusting predeclared flags.

Task 3 remains `implementing` in Fix Round 1/5. Its original External Evidence
Pipeline contract and exact allowed paths remain frozen. Tasks 4 through 6
remain `planned`.

Fix Round 1 independent re-review PASSED on repair commit `0030859` with no
P0/P1/P2. Fresh Node 22 evidence passed 48/48 focused Task 3 tests, 173/173 full
External Intake tests, typecheck, lint, bounded diff, and exact-path checks. The
reviewer recommended `ready_for_qa` only; no QA or release acceptance is
implied.

The PM reconciled the repair and moved Task 3
`implementing -> ready_for_qa`. Its contract and exact allowed paths remain
frozen. Independent behavioral QA is the next gate. No Task 4, Task 5, or Task
6 work has started; all three remain `planned`.

### Independent QA reconciliation

Independent QA PASSED with no P0/P1/P2. Fresh Node 22 evidence passed 48/48
focused Task 3 tests, 173/173 full External Intake tests, typecheck, lint,
bounded diff, and cleanup checks. Privacy and isolation adversarial checks also
passed, including redacted evidence boundaries, source-item isolation, and no
downstream Graph, Golden, compiler, runtime, Candidate, or promotion path.

The PM moved Task 3 `ready_for_qa -> reviewed`. This is not release acceptance:
independent release review and fresh final verification remain required before
`accepted`. The original contract and exact paths remain frozen. No Task 4,
Task 5, or Task 6 work has started; all three remain `planned`.

### Release review: Fix Round 2/5

Independent release review FAILED with three P1 findings and one P2:

1. **P1 — report privacy:** Raw secret-match or scanner-report bytes can reach
   persistence. Define and enforce a strict redacted report contract, create a
   canonical safe summary before persistence, and add a sentinel raw-secret
   regression proving no secret or raw match survives in persisted evidence.
2. **P1 — inventory attestation:** `inventoryDigest` currently attests an
   opaque report rather than the normalized module inventory. Canonically
   serialize, digest, and persist the normalized validated inventory and bind
   that digest into the EvidenceBundle. Add a same-report/different-modules
   regression proving the inventory identity changes or the mismatch rejects.
3. **P1 — SBOM semantics:** The persisted wrapper claims CycloneDX without
   bounded JSON semantic validation. Strictly parse and validate `bomFormat`,
   specification/schema shape, and component count before persistence. Add
   malformed JSON, non-JSON, and component-count drift regressions.
4. **P2 — truthful resume:** A verified durable receipt prefix must be exposed,
   loaded, and continued rather than restarting work. Add coverage proving
   completed adapters are not rerun after a verified prefix.

The PM returned Task 3 `reviewed -> implementing` for Fix Round 2/5. The
original External Evidence Pipeline contract, task scope, and exact allowed
paths remain frozen. Task 3 is not accepted. No downstream work has started;
Tasks 4 through 6 remain `planned`.

### Fix Round 2 re-review: Fix Round 3/5

Fix Round 2 independent re-review FAILED with three remaining P1 findings:

1. **Inventory-report privacy:** The inventory adapter report can still persist
   arbitrary raw source or secret bytes. Remove opaque report storage or
   enforce a strict bounded, redacted, locator-only report contract. Add an
   adversarial sentinel regression that scans every persisted blob and receipt
   and proves the raw sentinel is absent.
2. **CycloneDX component semantics:** Enforce the actual CycloneDX 1.6
   component-type enumeration during initial processing and resume validation.
   Add an invalid-component-type regression.
3. **Terminal-chain evidence binding:** Before reusing an existing completed
   chain, load the terminal `evidence-bundle-stored` receipt and require its
   recorded EvidenceBundle digest to equal the recomputed canonical
   EvidenceBundle digest exactly. Add a forged but otherwise digest-valid
   terminal-receipt regression that must fail.

Task 3 remains `implementing` in Fix Round 3/5. The frozen External Evidence
Pipeline contract, task scope, and exact allowed paths remain unchanged. Task 3
is not accepted. No downstream work has started; Tasks 4 through 6 remain
`planned`.

Fix Round 3 independent re-review PASSED on repair commit `91016c4` with no
P0/P1/P2. Reviewer evidence passed 4/4 focused adversarial cases and 66/66 full
Task 3 tests on Node 22, plus typecheck, lint, and bounded diff checks. This
closes all three Fix Round 3 findings: inventory-report privacy, CycloneDX 1.6
component-type validation, and terminal EvidenceBundle receipt binding.

The PM reconciled the repair and moved Task 3
`implementing -> ready_for_qa`. Independent behavioral QA is still required;
no QA, release acceptance, or downstream dispatch is implied. The frozen
contract, task scope, and exact paths remain unchanged. Tasks 4 through 6 remain
`planned`, and no downstream work has started.

### Fix Round 3 independent QA reconciliation

Independent QA PASSED with no P0/P1/P2. Fresh Node 22 evidence passed 66/66
focused Task 3 tests, 191/191 full External Intake tests, typecheck, lint,
bounded diff, and cleanup checks. All new privacy and recovery adversarial
checks passed, including sentinel absence across persisted blobs/receipts,
CycloneDX 1.6 component-type rejection, terminal EvidenceBundle digest binding,
and verified-prefix resume without rerunning completed adapters.

The PM moved Task 3 `ready_for_qa -> reviewed`. This is not acceptance:
independent release review and fresh final verification remain required. The
frozen contract, task scope, and exact paths remain unchanged. No downstream
work has started; Tasks 4 through 6 remain `planned`.

### Release review: Fix Round 4/5

Independent release review FAILED with one P1 recovery-integrity finding. A
resume must not skip a completed scanner, SBOM, or inventory checkpoint when
any referenced quarantined canonical blob is missing or tampered.

The Controller selected the release reviewer's permitted deterministic
rehydration interpretation; the frozen Task 2 store must not be amended. Before
skipping completed work, recovery must re-put the exact canonical scanner
summary, CycloneDX SBOM, and normalized inventory bytes through `putBytes`. An
absent blob may be repaired only from receipt-bound deterministic canonical
bytes, and the returned reference/digest must rebind exactly to the verified
checkpoint. Any existing digest/byte inconsistency, conflicting content, or
inability to reconstruct those canonical bytes deterministically must fail
closed.

Add adversarial regressions proving missing blobs are rehydrated and rebound,
while tampered or conflicting scanner summaries, SBOMs, and normalized
inventories reject. A terminal EvidenceBundle must never attest unverifiable
data.

The PM returned Task 3 `reviewed -> implementing` for Fix Round 4/5. The frozen
External Evidence Pipeline contract, task scope, and exact allowed paths remain
unchanged. Task 3 is not accepted. No downstream work has started; Tasks 4
through 6 remain `planned`.

Fix Round 4 independent re-review PASSED on repair commit `8b31d3a` with no
P0/P1/P2. Reviewer evidence passed 9/9 focused recovery-rehydration cases and
the scope audit was clean. The accepted Controller decision is preserved:
recovery re-puts receipt-bound deterministic canonical bytes through `putBytes`
without amending the frozen Task 2 store, rehydrates and rebinds missing blobs,
and rejects tampered, conflicting, or non-reconstructable content before skip.

The PM reconciled the repair and moved Task 3
`implementing -> ready_for_qa`. Independent behavioral QA is still required;
no QA, release acceptance, or downstream dispatch is implied. The frozen
contract, task scope, and exact paths remain unchanged. No downstream work has
started; Tasks 4 through 6 remain `planned`.

### Fix Round 4 independent QA reconciliation

Independent QA PASSED with no P0/P1/P2. Fresh Node 22 evidence passed 72/72
focused Task 3 tests, 197/197 full External Intake tests, typecheck, lint,
bounded diff, and cleanup checks. All evidence-rehydration, privacy, and
isolation tests passed, including missing-blob restoration and rebinding,
tampered/conflicting blob rejection, no completed-adapter rerun, and no falsely
successful terminal EvidenceBundle.

The PM moved Task 3 `ready_for_qa -> reviewed`. This is not acceptance:
independent release review and fresh final verification remain required. The
frozen contract, task scope, and exact paths remain unchanged. No downstream
work has started; Tasks 4 through 6 remain `planned`.

### Fix Round 4 release and acceptance reconciliation

Independent release review PASSED with no P0/P1/P2. Fresh Controller
verification on local Node v22.11.0 passed 197/197 full External Intake tests,
typecheck, lint/Prettier, `git diff --check c2f3c87 HEAD`, and clean-worktree
verification.

The accepted deterministic rehydration decision is part of the frozen release
behavior: recovery re-puts receipt-bound canonical scanner summaries,
CycloneDX SBOMs, and normalized inventories through `putBytes`; missing blobs
are restored and rebound only when the canonical bytes reproduce the verified
checkpoint, while tampered, conflicting, or non-reconstructable content fails
closed before skip. Completed adapters are not rerun, and no terminal
EvidenceBundle can attest unverifiable data. The frozen Task 2 store remains
unchanged.

The PM moved Task 3 `reviewed -> accepted`. Its contract, task scope, exact
paths, and accepted behavior are frozen. Task 4 now satisfies its recorded
dependency gate but remains unstarted and `planned`; Tasks 5 and 6 also remain
`planned`.

## Task 4 card: Candidate registry, module API, CLI, and isolation

- **State:** `ready_for_qa`
- **Specialization:** `integration`
- **Contract owner:** Candidate Registry
- **Contract artifact:** accepted Tasks 1-3 contracts and the frozen Commercial
  Foundation Golden/Publish verification boundary.
- **Dependencies:** Tasks 1-3 `accepted`; Commercial Capability Foundation Task
  1 `accepted`.

All recorded dependencies are accepted and frozen, including Task 3's accepted
External Evidence Pipeline. The PM moved Task 4 `planned -> implementing` after
Controller dispatch. One bounded `integration` writer exclusively owns the
exact paths below; no other Task 4 writer is authorized. The existing Candidate
Registry contract, task scope, exact allowed paths, non-goals, and acceptance
evidence are frozen. Any overlap or contract, path, or scope change stops work
and returns Task 4 for Controller review.

### Controller-approved bounded test-contract amendment

The initial Task 4 verification reached 215/216 because the accepted Task 1
portfolio isolation test prohibited the one importer required by the frozen
Task 4 plan. The Controller authorizes the sole Task 4 writer to modify exactly
`packages/external-intake/test/portfolio.test.ts`, and only to exempt
`apps/intake-cli/package.json` as the single permitted
`@factory/external-intake` importer/dependency.

The prohibition remains enforced for every other package and path. This
amendment creates no Graph, Golden registry/lock, compiler, product, generated
application, or other production linkage and changes no other Task 1 behavior,
test, contract, or path. Task 4 remains `implementing`; all other Task 4
contract, path, scope, non-goal, and sole-writer constraints remain frozen.

### Independent Task Review: Repair Round 1/5

Independent review of Task 4 implementation commit `33fd204` FAILED with four
P1 findings and one P2. The Controller authorized one bounded repair and added
exactly `packages/graph/src/model.ts`, `packages/compiler/src/index.ts`, and
`packages/external-intake/src/jobs.ts` to the production paths below. The repair
scope is limited to:

1. Reserve the non-overlapping `candidate.` identity namespace and require it
   for Candidate creation. Graph parsing/semantic validation and the compiler
   must reject that namespace even when it appears as an otherwise-valid
   external-provider capability.
2. Export and reuse a pure accepted Task 3 completed-evidence verification
   boundary. Candidate create and verify must validate all seven phases,
   execution identity, parents, checkpoints, deterministic blob rehydration,
   and terminal bindings without reimplementing a weaker receipt chain.
3. Make Candidate, API, and CLI discovery durable through the existing
   immutable store/receipt index or receipt-addressed opaque references. A fresh
   process must load, report status, and verify prior Candidates while enforcing
   deterministic `id@version` uniqueness. The frozen Task 2 store must not
   change.
4. Permit `conformance-passed` only through one validated operation that
   persists and rereads a strict pass result bound to the current Candidate and
   artifact digests. No raw public append transition may create that status.
5. Allow-list only nonmutating, Candidate-safe declarative manifest and
   conformance effects. Reject Graph, Policy, Flow, publication, compiler,
   runtime, approval, and promotion mutations.

All repair tests remain within the existing Task 4 test paths. No other code,
source, Task 1-3 behavior, dependency, network, process, or runtime change is
authorized. Task 4 remains `implementing` with the same sole writer. Tasks 5 and
6 remain `planned`; independent re-review is required before any state advance.

### Repair Round 1 re-review: Repair Round 2/5

Independent re-review of repair commit `53f2150` FAILED with one P1. Fresh
receipt-addressed recovery could construct an entry without canonical
artifacts, strict `IntakeJobV1`, or `CompletedEvidenceRefV1`, then fall back to a
weaker receipt-only result instead of invoking the accepted Task 3 verifier.

The Controller authorizes Repair Round 2/5 within the existing Task 4
Candidate/API/test paths unless implementation proves a genuine blocker. The
sole repair scope is:

1. Persist immutable, redacted, strict Candidate verification state sufficient
   to reconstruct the `IntakeJobV1`, `CompletedEvidenceRefV1`, canonical
   artifacts, and current Candidate revision after restart.
2. Make fresh receipt-addressed locator recovery unconditionally invoke the
   exported `verifyCompletedEvidence` boundary, validate and re-put every
   artifact and checkpoint blob, and verify the persisted conformance result
   whenever the Candidate is `conformance-passed`.
3. Remove every optional volatile-field fallback and weak receipt-only valid
   result. If the strict verification state cannot be reconstructed, fail
   closed.
4. Add fresh-process adversarial coverage for fabricated or truncated chains,
   missing snapshot/acquisition records, missing artifacts, tampered artifacts,
   and tampered conformance results.

The frozen Task 2 store must not change. The Candidate isolation contract and
dependency set remain unchanged; no new network, process, runtime, or external
dependency behavior is authorized. Task 4 remains `implementing` with its sole
writer. Tasks 5 and 6 remain `planned`; independent re-review is required before
any state advance.

### Repair Round 2 re-review: Repair Round 3/5

Independent re-review of repair commit `fad4a5b` FAILED with one P1. Although
explicit verification failed closed, fresh receipt recovery could return an
unverified bundle that `candidateTest` consumed and then persist a conformance
pass after invalid or missing Task 3 evidence.

The Controller authorizes Repair Round 3/5 within the existing Task 4
Candidate/API/CLI/test paths. No API, CLI, lifecycle, or conformance path may
consume a freshly recovered entry or persist a conformance transition until
strict full Candidate verification succeeds, including Task 3 parent,
provenance, checkpoint, artifact re-put, and persisted conformance-byte
verification.

Implementation must use an asynchronous verified recovery boundary or require
`candidateTest` and `recordConformancePass` to invoke full verification first.
Unverified recovery-bundle access must be eliminated. Add two-process
fresh-conformance adversarial tests for missing or tampered Task 3 parents,
artifacts, and conformance bytes, proving that neither pass evaluation nor a
lifecycle transition occurs.

No Task 2, Graph, compiler, dependency, network, process, or runtime change is
authorized. Task 4 remains `implementing` with its sole writer. Tasks 5 and 6
remain `planned`; independent re-review is required before any state advance.

### Repair Round 3 re-review: Repair Round 4/5

Independent re-review of repair commit `1c52a42` FAILED with one P1. Two
concurrent fresh `candidateTest` callers could both persist a
`conformance-passed` revision, append two receipt deltas, create an unsupported
sequence-3 chain, and make subsequent fresh discovery fail strict verification.

The Controller authorizes Repair Round 4/5 within the existing Task 4
Candidate/API/test paths. `recordConformancePass` must perform a durable
compare-and-set immediately before persistence against the verified quarantined
Candidate creation receipt and revision. Only the deterministic sequence-2
conformance transition may be written.

Overlapping fresh callers must converge on the same immutable Candidate revision
and receipt, or one caller must reject cleanly. No caller may append sequence 3
or use a stale mutable entry. Add a two-process concurrent `candidateTest`
regression proving exactly one Candidate revision delta, exactly one receipt
delta, subsequent fresh show remains valid and `conformance-passed`, and retry
is idempotent.

No Task 2, immutable-store, dependency, Graph, compiler, network, process, or
runtime change is authorized. Task 4 remains `implementing` with its sole
writer. Tasks 5 and 6 remain `planned`; independent re-review is required before
any state advance.

### Repair Round 4 independent re-review reconciliation

Independent re-review of repair commit `986319a` PASSED with no P0/P1/P2. The
reviewer reproduced the concurrent fresh-process race and confirmed exactly one
Candidate revision delta, exactly one receipt delta, only receipt sequences 1
and 2, valid `conformance-passed` fresh show and verification, and zero retry
delta. The stricter separate-consumer race also converged on the same immutable
revision and receipt. Focused Repair Round 4 and prior corruption coverage
passed 45/45; Candidate exclusions at Graph, compiler, and Golden boundaries
remained intact. Scope was exactly the two authorized repair paths, with no Task
2 store, dependency, Graph, compiler, network, process, source-execution, or
runtime production change.

The PM reconciled the clean implementation and independent review and moved
Task 4 `implementing -> ready_for_qa`. Independent behavioral QA is the next
gate. Task 4 is not reviewed, accepted, promoted, or released; the complete
repair history, Candidate Registry contract, exact allowed paths, non-goals,
and acceptance evidence remain frozen. Tasks 5 and 6 remain `planned` and have
not started.

### Independent QA: Repair Round 5/5

Independent QA FAILED with two P1 evidence gaps and one P2 formatting defect.
Fresh Node v22.11.0 evidence passed 215/215 focused Task 4 tests, 257/257 full
External Intake tests, 10/10 CLI tests, 874/874 uncached workspace tests, all 14
uncached workspace typecheck tasks, impacted builds/typechecks/package lints,
privacy and isolation checks, third-party/source-study verification, bounded
diff, and clean-worktree checks. Those green results do not close these QA
findings:

1. Add a deterministic separate-OS-process Candidate conformance race test;
   same-process `Promise.all` coverage is insufficient. Assert receipt sequences
   are exactly 1 and 2, the durable deltas are exactly one Candidate revision
   and one receipt, fresh show/verification remains valid and
   `conformance-passed`, and retry adds zero records.
2. Expand fabricated and truncated receipt-chain corruption coverage to every
   public show, list, test, conformance-bundle, and transition path. Each path
   must fail closed with zero Candidate and receipt mutations.
3. Mechanically format the Task 4-owned `pnpm-lock.yaml`; no dependency content
   or resolution may change.

Repair Round 5/5 remains within the existing Task 4 test paths plus the already
allowed `pnpm-lock.yaml`. Child-process execution is permitted only in the test
harness for the separate-OS-process regression. No production, Task 2, immutable
store, dependency, Graph, compiler, network, or runtime change is authorized.
After repair, rerun focused Task 4 and full relevant QA evidence. Task 4 remains
`implementing`; Tasks 5 and 6 remain `planned` and have not started. Any further
failed repair/review cycle requires Controller escalation.

### Repair Round 5 independent re-review reconciliation

Independent re-review of repair commit `0f7811a` PASSED with no P0/P1/P2. Fresh
review evidence repeated the deterministic separate-OS-process conformance race
3/3 and confirmed receipt sequences exactly 1 and 2, one Candidate revision
delta, one receipt delta, valid fresh show/verification, and zero retry delta.
The fabricated/truncated receipt-chain matrix passed across every public show,
list, test, conformance-bundle, and transition path with zero Candidate or
receipt mutations.

Fresh Node v22.11.0 evidence passed 61/61 Candidate tests, 226/226 focused Task
4 tests, 268/268 full External Intake tests, 10/10 CLI, 28/28 Graph, 123/123
Capabilities, 180/180 Compiler, five affected builds and lints, eight affected
dependency-aware typechecks, 885 uncached workspace tests, all 14 workspace
typecheck tasks, third-party/source-study verification, bounded diff, privacy,
and format checks. Canonical comparison of committed versus formatted
`pnpm-lock.yaml` was identical, and the frozen offline install skipped
resolution, proving no dependency-semantic change.

Only `packages/external-intake/test/candidates.test.ts` and `pnpm-lock.yaml`
changed; no production, Task 2, immutable-store, dependency, Graph, compiler,
network, or runtime change occurred. No ignored Round 5 implementation report
was produced, and this reconciliation does not rely on one; it relies on the
committed diff and fresh independent evidence above.

The PM moved Task 4 `implementing -> ready_for_qa`. Independent behavioral QA
is the next gate. This is not QA, release review, acceptance, promotion, or Task
5 authorization. The complete repair history, Candidate Registry contract,
exact paths, non-goals, and acceptance evidence remain frozen. Tasks 5 and 6
remain `planned` and unstarted.

### Final independent QA reconciliation

Independent QA PASSED with no P0/P1/P2 on Node v22.11.0. Fresh evidence passed:

- deterministic separate-OS-process conformance race 3/3;
- fabricated/truncated public-path corruption matrix 10/10;
- External Intake 268/268 and CLI 10/10;
- Graph Candidate isolation 27/27, Golden boundary 71/71, and Compiler 47/47;
- forced workspace verification 14/14.

The Task 4 paths and affected package formatting gates passed. Repository-root
formatting still reports inherited out-of-scope debt in unchanged files; this
is recorded as existing debt and is not treated as Task 4 evidence or repaired
under this contract.

The PM moved Task 4 `ready_for_qa -> reviewed`. Independent release review and
fresh final verification remain required before `accepted`. Task 4 is not
accepted, promoted, or released; its complete repair history, Candidate Registry
contract, exact paths, non-goals, and acceptance evidence remain frozen. Task 5
and Task 6 remain `planned` and unstarted.

### Release review escalation: Repair Round 6/6

Independent release review FAILED with two P1 findings and one P2. The
Controller authorized one escalated strict-convergence repair after the final
scheduled Round 5/5 and returned Task 4 to its sole writer. Repair Round 6/6 is
limited to the existing Task 4 Candidate/API/CLI/test paths:

1. Recursively and with bounded traversal reject sensitive artifact, manifest,
   and adapter key families including `token`, `auth`, `apiKey`, `clientSecret`,
   `privateKey`, `password`, `credential`, `prompt`, and `response`, plus
   credential-like high-entropy values. Rejection must occur before any
   artifact, verification-state, receipt, conformance-result, bundle,
   persistence, or output boundary. Regressions must prove no rejected input
   reaches artifacts, persisted state, receipts, or conformance bundles.
2. Bind every locator fallback to the exact requested `id@version` in both warm
   and fresh APIs. Wrong-version show, verify, test, conformance-bundle, and
   transition operations must always reject with zero Candidate or receipt
   mutation.
3. Implement the frozen append-only validated `blocked` and `rejected`
   lifecycle operations with durable receipts and exact Candidate-revision
   binding. `conformance-passed` remains available only through the exclusive
   verified conformance operation. Tests must reject invalid or duplicate
   transitions and every lifecycle bypass.

Implementation review then identified a P1 mixed-terminal process race: two
concurrent `blocked`/`rejected` writers could both pass the Candidate-layer
precheck, while the losing write could leave recoverable orphan records before
the sequence-index conflict was observed. The Controller therefore authorizes
one exact Task 2 store amendment inside this same Round 6/6:

- `packages/external-intake/src/store.ts` may add only an atomic immutable
  terminal sequence-2 compare-and-set primitive. It must verify the expected
  sequence-1 creation receipt and current Candidate parent, then atomically
  create and persist exactly one terminal Candidate record plus its sequence-2
  receipt and index winner. A conflict must leave no orphan record, blob, or
  locator, and recovery may accept only the indexed winner.
- `packages/external-intake/test/store.test.ts` must add a two-OS-process mixed
  `blocked`/`rejected` concurrency regression. An identical retry must be
  idempotent; a conflicting terminal transition must fail cleanly with no
  orphan persistence or recoverable locator.
- The Candidate privacy repair remains inside the existing Task 4 paths and
  must explicitly reject recursively nested Bearer and JWT structured
  credentials before any persistence or output boundary.

All previous privacy, provenance, rehydration, isolation, exact-version,
fail-closed recovery, and exactly-once race guarantees remain mandatory. No
other Task 2/store behavior or path, Graph, compiler, dependency, network,
process, or runtime change is authorized. No other Task 4 writer is authorized.
Task 4 remains `implementing`; Tasks 5 and 6 remain `planned`. Independent task
review, QA, release review, and fresh final verification are all required again
before acceptance.

### Root review escalation: Repair Round 7/7

Root review of Repair Round 6/6 commit `3f4b58c` FAILED with one P1 and one P2.
The atomic terminal sequence-2 CAS was exposed on the public
`ExternalIntakeStore` instance/package-root surface, allowing a public store
consumer to construct terminal Candidate and receipt records outside the
Candidate Registry lifecycle. The store regression also left its
`node:child_process` import outside the top import block.

The Controller authorizes Repair Round 7/7 under these exact constraints:

1. Remove the atomic Candidate terminal CAS from the public
   `ExternalIntakeStore` instance and package-root API. Provide it solely as an
   internal module-level primitive in `packages/external-intake/src/store.ts`,
   imported directly by `CandidateRegistry` from the source module. It must not
   be re-exported from `packages/external-intake/src/index.ts`.
2. Preserve all Repair Round 6/6 atomic sequence-2, winner-only recovery,
   idempotent retry, conflict rejection, and no-orphan guarantees. This repair
   changes accessibility only, not the terminal transition semantics.
3. Add a package-root regression proving no operation available from
   `@factory/external-intake` or its public `ExternalIntakeStore` can construct
   or persist a terminal Candidate/receipt transition. Update the existing CAS
   tests to import the internal primitive directly, and move the stranded
   `node:child_process` import into the top import block.

Repair Round 7/7 may modify only the already authorized Task 4 Candidate,
store, test, and root-index paths. It may add no dependency and may not alter
any other Store API, Graph, compiler, network, process, or runtime behavior. All
previous lifecycle, privacy, exact-version, isolation, provenance, recovery,
and race guarantees remain mandatory. Task 4 remains `implementing`; Tasks 5
and 6 remain `planned`. Fresh independent task review, QA, release review, and
final verification are required before acceptance.

### Repair Round 7 independent review reconciliation

Repair Round 7/7 implementation commit `3112e26` changed only
`packages/external-intake/src/candidates.ts`,
`packages/external-intake/src/store.ts`, and
`packages/external-intake/test/store.test.ts`. The terminal CAS is now an
internal module-level primitive imported directly by `CandidateRegistry`; the
public `ExternalIntakeStore` instance and package root expose no terminal
transition operation. Independent root review PASSED with no P0/P1/P2.

Fresh Node v22.11.0 evidence passed:

- Store 34/34, including the three-process mixed-terminal race;
- jobs 30/30 and full External Intake 317/317;
- Intake CLI 27/27;
- External Intake and CLI typecheck, lint, and package build;
- forced workspace tests 14/14 and typecheck 14/14;
- `git diff --check bdfc8c3 3112e26` and clean-worktree verification.

The built package public-surface probe returned
`{"modulePrimitive":false,"storeOperation":false}`, proving neither the
module-level CAS nor a Store instance operation is exported through
`@factory/external-intake`.

The PM reconciled the bounded implementation and clean independent review and
moved Task 4 `implementing -> ready_for_qa`. Independent behavioral QA is the
next gate. This is not QA, release review, acceptance, promotion, or Task 5
authorization. The complete Candidate Registry contract, all repair history,
exact paths, non-goals, and acceptance evidence remain frozen. Tasks 5 and 6
remain `planned` and unstarted.

### Independent QA: Repair Round 7/7

Independent behavioral QA of Task 4 Repair Round 7/7 commit `3112e26` PASSED
with no P0/P1/P2. Fresh Node v22.11.0 evidence passed:

- recursive sensitive-data and credential rejection 62/62 plus CLI privacy
  coverage 18/18;
- three-process terminal race coverage 3/3, including winner-only recovery,
  idempotent retry, conflicting-terminal rejection, and no loser orphans;
- full External Intake 317/317 and Intake CLI 27/27;
- Graph Candidate isolation 27/27, Golden boundary 71/71, and Compiler 47/47;
- forced workspace verification 14/14;
- built `@factory/external-intake` package isolation with neither the internal
  terminal primitive nor a Store terminal operation publicly exposed.

The affected Task 4 formatting gates passed. Repository-root formatting still
reports inherited out-of-scope debt in unchanged files; that debt is unchanged,
is not Task 4 evidence, and is not repaired under this contract.

The PM reconciled independent review and QA and moved Task 4
`ready_for_qa -> reviewed`. Independent release review and fresh final
verification are still mandatory before `accepted`. This is not acceptance,
promotion, release, or Task 5 authorization. The complete Candidate Registry
contract, repair history, exact paths, non-goals, and acceptance evidence remain
frozen. Tasks 5 and 6 remain `planned` and unstarted.

### Release review privacy convergence: Repair Round 8/8

Independent release review FAILED with one P1 privacy finding. The bounded
high-entropy detector rejected continuous token shapes and structured
Bearer/JWT credentials, but a single common opaque-token delimiter such as
`.`, `:`, or `@` could make an otherwise credential-like high-entropy value
cross Candidate persistence or CLI output boundaries.

The Controller authorizes Repair Round 8/8 under these exact constraints:

1. Within the existing Candidate and CLI production paths, broaden the bounded
   credential-like high-entropy detector to common opaque-token punctuation
   `.`, `:`, and `@`, plus only other safely designed credential delimiters.
2. Strictly allow-list canonical schema values and canonical digests so the
   broader detector does not reject valid Factory identifiers, versions,
   `sha256:<64hex>` values, or other explicitly frozen safe shapes.
3. Add regressions for single-delimiter high-entropy values proving Candidate
   creation rejects before mutation, no record/receipt/blob sentinel is
   persisted, and CLI output is redacted. The regression must cover each
   authorized delimiter without weakening the existing recursive key-family,
   structured credential, or traversal-bound checks.

Repair Round 8/8 may modify only the already authorized Candidate/CLI
production and test paths. No Task 2/store, Graph, compiler, dependency,
network, process, or runtime change is authorized. All CAS, terminal lifecycle,
exact-version, public-surface, provenance, recovery, isolation, and race
guarantees remain mandatory. Task 4 remains `implementing`; Tasks 5 and 6
remain `planned`. Fresh task review, QA, release review, and final verification
are required before acceptance.

### Root privacy completion: Repair Round 9/9

Root review of Repair Round 8/8 commit `f8bb51f` FAILED with one P1 privacy
finding. The delimiter-aware detector rejected bare and scheme-prefixed
high-entropy tokens, but an optional case-insensitive `Authorization:` label
could allow the same bounded value class to cross Candidate persistence or
built CLI output boundaries.

The Controller authorizes Repair Round 9/9 under these exact constraints:

1. In the existing Candidate and CLI detector paths, recognize an optional
   case-insensitive `Authorization:` prefix followed by an optional auth scheme
   and a credential-like high-entropy token.
2. Reject before Candidate mutation or persistence, and redact from built CLI
   output, both `Authorization: <token>` and
   `Authorization: Bearer <token>` shapes containing `.`, `:`, or `@`
   delimiter variants.
3. Retain the exact command-aware and typed-path canonical allow-lists from
   Repair Round 8/8. The new prefix handling must not broaden safe-value
   exceptions or weaken any existing recursive, structured-credential,
   traversal-bound, or delimiter regression.

Repair Round 9/9 may modify only the existing Candidate/CLI detector and test
paths. No Task 2/store, Graph, compiler, dependency, network, process, runtime,
public-surface, lifecycle, CAS, version, provenance, recovery, isolation, or
race behavior may change. Task 4 remains `implementing`; Tasks 5 and 6 remain
`planned`. Fresh task review, QA, release review, and final verification are
required before acceptance.

### Repair Round 9 independent review reconciliation

Repair Round 9/9 product commit `aee5c99` changed exactly the three authorized
paths: `packages/external-intake/src/candidates.ts`,
`packages/external-intake/test/candidates.test.ts`, and
`apps/intake-cli/test/cli.test.ts`. Independent task review PASSED with
P0/P1/P2 = 0.

The prior P1 is closed. The bounded detector now applies the optional
case-insensitive `Authorization:` label and optional existing auth-scheme
grammar before the established high-entropy check. Candidate validation runs
before any verification-state blob, artifact blob, Candidate record, receipt,
or registry entry is created. Candidate and CLI regressions cover bare,
`Authorization: <token>`, and `Authorization: Bearer <token>` forms for `.`,
`:`, and `@`, while the exact Candidate typed-path and CLI command-aware
canonical allow-lists remain unchanged.

Fresh Node v22.11.0 review evidence passed:

- Candidate privacy, version, lifecycle, provenance, and race coverage 28/28;
- CLI privacy and canonical-output coverage 14/14;
- Store CAS, public-surface, and mixed-process race coverage 3/3;
- Task 3 provenance and rehydration binding coverage 2/2;
- direct compiled CLI coverage 9/9;
- built package surface with `modulePrimitive=false` and
  `storeOperation=false`; and
- `git diff --check` plus clean-worktree verification.

The PM reconciled the bounded implementation and independent task review and
moved Task 4 `implementing -> ready_for_qa`. Independent behavioral QA is the
next gate. This is not QA, release review, final verification, acceptance,
promotion, or Task 5 authorization. The complete Candidate Registry contract,
repair history, exact paths, non-goals, and acceptance evidence remain frozen.
Tasks 5 and 6 remain `planned` and unstarted.

### Exact allowed paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/conformance.ts`
- `packages/external-intake/src/jobs.ts`
- `packages/external-intake/src/index.ts`
- `packages/external-intake/src/store.ts` (Round 6/6 atomic terminal CAS only)
- `packages/external-intake/test/candidates.test.ts`
- `packages/external-intake/test/api.test.ts`
- `packages/external-intake/test/conformance.test.ts`
- `packages/external-intake/test/portfolio.test.ts`
- `packages/external-intake/test/store.test.ts` (Round 6/6 atomic terminal CAS
  regression only)
- `apps/intake-cli/package.json`
- `apps/intake-cli/tsconfig.json`
- `apps/intake-cli/vitest.config.ts`
- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`
- `packages/graph/src/model.ts`
- `packages/graph/test/application-graph.test.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/src/index.ts`
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
6. The bounded Task 1 acquisition-record amendment runs alone. Task 2 resumes
   only after it is accepted, and Task 3 begins only after Task 2's
   `{ snapshot, acquisition }` output is accepted.
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
  Capabilities, and compiler test paths. Task 4 is frozen at `ready_for_qa`;
  independent QA is validation-only, and any writer overlap stops work.

The active smallest valuable slice is independent behavioral QA of Task 4
Repair Round 9/9 commit `aee5c99` under the frozen Candidate Registry contract
and complete repair history. QA must reproduce optional case-insensitive
`Authorization:` prefix rejection before Candidate mutation, built CLI
redaction for the authorized delimiter and scheme shapes, and preservation of
the strict safe-value allow-lists.
All built-package public-surface isolation, Store/CAS, exact `id@version`,
append-only terminal lifecycle, winner-only recovery, and multi-process
no-orphan guarantees remain frozen. Its bounded test-contract amendment
permits only the Intake CLI package manifest to import
`@factory/external-intake`; all other isolation prohibitions remain enforced.
Repair Round 1/5 is limited to Candidate namespace defense,
reuse of accepted Task 3 completed-evidence verification, durable opaque
discovery and uniqueness, validated conformance-pass transition, and
Candidate-safe effect allow-listing. Repair Round 2/5 is now limited to strict
persisted fresh-process verification state, unconditional accepted Task 3
verification and blob rehydration, conformance-result verification, fail-closed
recovery, and the recorded adversarial tests. Repair Round 3/5 now requires
verified recovery before any API, CLI, lifecycle, or conformance consumption or
transition, plus the two-process adversarial proof. Repair Round 4/5 now requires
durable compare-and-set against the verified quarantined creation revision,
deterministic sequence-2 persistence, concurrent convergence or clean rejection,
and exactly-once two-process evidence. The frozen Task 2 store is unchanged.
Task 1's original release and bounded amendments, Task 2's accepted code set
`515e0ba + 3dcb20f + dcaddf4`, and Task 3's accepted repair commit `8b31d3a`
remain frozen. Tasks 5 and 6 remain `planned` and retain their recorded
dependency gates.
