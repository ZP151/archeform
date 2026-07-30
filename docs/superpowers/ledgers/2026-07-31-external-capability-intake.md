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
4 is now `implementing` under its frozen Candidate Registry contract, exact
allowed paths, and non-goals, with one exclusive `integration` writer and no
other Task 4 writer. A Controller-approved bounded test-contract amendment adds
only `packages/external-intake/test/portfolio.test.ts` to permit
`apps/intake-cli/package.json` as the single `@factory/external-intake`
importer/dependency; the prohibition remains everywhere else. Tasks 5 and 6
remain `planned`. Independent Task 4 review of commit `33fd204` then FAILED with
four P1 findings and one P2. The Controller authorized bounded Repair Round 1/5
and exactly three additional production paths; Task 4 remains `implementing`
under the amended frozen scope. The system will
ingest the 43 fixed-reference portfolio as metadata, retain the 108 scenarios as
composition demand signals, and produce only quarantined evidence,
non-executable Candidate records, and pending-review promotion packets.

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
| 4. Candidate registry, API, CLI, and isolation   | `implementing` | `integration`       | Candidate Registry               | Repair Round 1/5 under bounded amended scope.               |
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

- **State:** `implementing`
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

### Exact allowed paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/conformance.ts`
- `packages/external-intake/src/jobs.ts`
- `packages/external-intake/src/index.ts`
- `packages/external-intake/test/candidates.test.ts`
- `packages/external-intake/test/api.test.ts`
- `packages/external-intake/test/conformance.test.ts`
- `packages/external-intake/test/portfolio.test.ts`
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
  Capabilities, and compiler test paths. The dispatched Task 4 writer has
  exclusive ownership of every frozen path; any overlap stops work.

The active smallest valuable slice is Task 4 implementation under its frozen
Candidate Registry contract, exact allowed paths, and non-goals. It is
`implementing` with one exclusive `integration` writer and no other Task 4
writer. Its bounded test-contract amendment permits only the Intake CLI package
manifest to import `@factory/external-intake`; all other isolation prohibitions
remain enforced. Repair Round 1/5 is limited to Candidate namespace defense,
reuse of accepted Task 3 completed-evidence verification, durable opaque
discovery and uniqueness, validated conformance-pass transition, and
Candidate-safe effect allow-listing. The frozen Task 2 store is unchanged. Task
1's original release and bounded amendments, Task 2's accepted code set
`515e0ba + 3dcb20f + dcaddf4`, and Task 3's accepted repair commit `8b31d3a`
remain frozen. Tasks 5 and 6 remain `planned` and retain their recorded
dependency gates.
