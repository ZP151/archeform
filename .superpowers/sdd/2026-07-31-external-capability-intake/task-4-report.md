# External Capability Intake Task 4 implementation report

Date: 2026-07-31

Ledger state: `implementing`

Specialization: `integration`

Contract owner: External Capability Intake

Contract status: frozen for Repair Round 8/8 under ledger commit `1848f08`

Last reconciled product commit: `f8bb51f`

## Scope delivered

- A strict Candidate proposal boundary converts only accepted Task 3 evidence
  into an immutable, quarantined Candidate record. The record binds source,
  acquisition, evidence, module inventory, selected module, declarative
  manifest, fixture, adapter, and conformance-plan identities and digests.
- Candidate artifacts are bounded declarative JSON. URL-like, credential-like,
  secret-like, executable, and unsafe fixture values fail before persistence.
- The Candidate registry keeps append-only status receipts. Only quarantined
  Candidates can enter conformance; conformance may record `conformance-passed`,
  `blocked`, or `rejected`, but cannot publish, promote, approve, waive, mutate
  Golden capabilities, write an Application Graph, compile, or run a provider.
- Verification reloads immutable Candidate records and receipts and re-puts the
  exact canonical declarative artifacts through the accepted store. Missing
  artifacts may be restored only when their deterministic bytes reproduce the
  bound reference; tampered or conflicting content fails closed.
- The pure conformance boundary validates safe fixtures and declarative adapter
  projections without filesystem, process, network, Graph, compiler, runtime,
  or provider callbacks.
- A local `factory-intake` CLI exposes batch submit, redacted status/evidence,
  Candidate show/test, and immutable-job verification commands. Input is a
  bounded regular local JSON file; URL, UNC, symlink, special, oversized, and
  non-JSON input is rejected. Durable writes remain under
  `<cwd>/ecosystem/intake` through the External Intake store.
- Graph, Golden capability-registry, and compilation-plan regression locks
  reject Candidate lifecycle records and Candidate identity/path/digest
  references before any downstream behavior or output.

## Changed product paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/conformance.ts`
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
- `packages/graph/test/application-graph.test.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `pnpm-lock.yaml`

This report is the parent-authorized ignored operational-evidence exception;
it is not a product or runtime path.

## TDD evidence

Every pnpm command prepended
`C:\Users\15492\AppData\Local\nvm\v22.11.0` to `PATH`.

- Initial External Intake RED: the focused Candidate, API, and conformance run
  exited 1 because `candidates.ts`, `api.ts`, and `conformance.ts` did not
  exist.
- Initial CLI RED: the focused CLI run exited 1 because `src/main.ts` did not
  exist after configuring the source alias.
- Artifact-integrity RED: a persisted Candidate artifact was removed and
  replaced with conflicting bytes; the initial registry verification still
  returned valid. GREEN: deterministic re-put restores only exact missing
  bytes and rejects digest-conflicting/tampered artifacts; the focused Candidate
  suite passed 9/9.
- Downstream boundary regressions lock the complete literal Candidate lifecycle
  record. Graph schema validation, exact Golden registry resolution, and
  compilation planning all reject Candidate API, identity, path, and digest
  references.
- The full portfolio test initially failed because its frozen importer list did
  not include the new CLI package. Implementation stopped until PM amended the
  Task 4 exact paths at `74f9142`; the regression now proves the CLI manifest is
  the sole new production importer of `@factory/external-intake`.

## Fresh verification evidence

- `pnpm --filter @factory/external-intake build`: exit 0.
- `pnpm --filter @factory/intake-cli build`: exit 0.
- Affected package typechecks for External Intake, CLI, Graph, Capabilities,
  and Compiler: all exit 0.
- Affected package lints for External Intake, CLI, Graph, Capabilities, and
  Compiler: all exit 0.
- Full External Intake suite: exit 0; 216/216 tests passed across 12 files.
- CLI suite: exit 0; 9/9 tests passed.
- Focused Graph suite: exit 0; 26/26 tests passed.
- Focused Capabilities suite: exit 0; 71/71 tests passed.
- Focused Compiler suite: exit 0; 46/46 tests passed.
- Workspace `pnpm typecheck`: exit 0; 14/14 tasks passed.
- Workspace `pnpm test`: exit 0; 14/14 tasks and 830/830 tests passed.
- Owned-file Prettier check: exit 0.
- `git diff --check 74f9142 --`: exit 0.
- Exact-path audit found only the 17 ledger-authorized product paths.
- Import audit found the CLI as the only production package importing External
  Intake beyond External Intake itself; Graph, Capabilities, Compiler, Control
  Plane, Workbench, and Compiler Worker had no forbidden production import.
- Privacy scan found only defensive sensitive-key/value regular expressions,
  with no persisted test sentinel or raw prompt/response data.

Workspace `pnpm lint` is not green because of inherited Prettier failures
outside Task 4 in Control Plane, Adapters, Workbench, and Compiler Worker. All
five affected Task 4 package lint commands pass. No out-of-scope formatting was
changed.

## Acceptance-criterion status

- Accepted Task 3 evidence to immutable quarantined Candidate proposal:
  satisfied.
- Strict declarative manifest, fixture, adapter, and conformance-plan boundary:
  satisfied.
- Candidate identity/version uniqueness and exact parent/digest binding:
  satisfied.
- Append-only lifecycle with no promotion, Golden, Graph, compiler, runtime, or
  provider side effects: satisfied.
- Deterministic conformance and artifact re-verification: satisfied.
- Redacted local batch/status/evidence/Candidate CLI under the fixed quarantine
  root: satisfied.
- Candidate exclusion from Application Graph, Golden registry, and compilation
  planning: satisfied.
- Portfolio/import isolation and exact-path boundary: satisfied.

## Remaining risks

- Candidate identity, request-status, and job-status lookup indexes are
  process-local. Immutable Candidate records, artifacts, evidence references,
  and receipt chains are durable, but a fresh CLI process cannot discover a
  prior opaque job or Candidate identity without a caller-retained reference.
  The frozen Task 2 store exposes no public listing/root traversal API; adding
  one would cross the Task 4 contract and requires a separately approved
  contract change.
- The conformance adapter is intentionally a code-owned, pure declarative
  projection. It does not adopt, load, execute, or network-call third-party
  source or providers.

Task 4 is ready for independent task review only. It is not marked ready for
QA, reviewed, accepted, promoted, or released.

## Commit and post-commit evidence

Bounded implementation commit: `33fd204` (`feat: add quarantined Candidate
registry`).

- Post-commit full External Intake suite: Node `v22.11.0`; exit 0; 216/216
  tests passed across 12 files.
- Post-commit CLI suite: Node `v22.11.0`; exit 0; 9/9 tests passed.
- Post-commit External Intake and CLI typechecks: Node `v22.11.0`; both exit 0.
- Post-commit External Intake and CLI lints: Node `v22.11.0`; both exit 0;
  all matched files use Prettier style.
- `git diff --check HEAD^ HEAD`: exit 0.
- Commit path audit lists exactly the 17 ledger-authorized product paths, with
  no missing or extra path.
- `git status --short`: empty; this operational report remains ignored.

## Repair Round 1/5

Repair contract base: `60c15ac` (`docs: bound candidate registry repair`).

Specialization: `integration`.

Contract owner: Candidate Registry.

Contract status: frozen for Repair Round 1/5 implementation.

Bounded repair commit: `53f2150` (`fix: bind Candidate registry
verification`).

### Repair delivered

- Candidate creation now requires the non-overlapping `candidate.` capability
  namespace. Application Graph parsing, semantic validation, and compilation
  reject that reserved namespace even when an external provider declaration is
  otherwise valid.
- Candidate manifests and adapters accept only the code-owned nonmutating
  declarative effects `candidate.observe`, `candidate.project`, and
  `candidate.validate`. Graph, Policy, Flow, publication, compiler, runtime,
  approval, and promotion effects fail closed.
- Task 3 now exports one `verifyCompletedEvidence` boundary. Candidate create
  and in-process verify reuse it to validate all seven receipts, execution and
  parent identity, scanner and inventory checkpoints, deterministic blob
  rehydration, and the terminal EvidenceBundle binding without executing a
  scanner.
- Batch jobs and Candidates return receipt-addressed opaque locators. A fresh
  API/CLI process can load status and verify a retained job locator; a fresh
  Candidate registry can load/show/verify quarantined and conformance-passed
  Candidate locators. Deterministic Candidate job IDs plus the existing
  immutable receipt index enforce id/version uniqueness across processes.
- Candidate evidence discovery validates the canonical seven-receipt Task 3
  chain, one evidence execution, exact phase order and predecessor links, the
  immutable creation Candidate, terminal EvidenceBundle, and conformance
  predecessor/result bindings.
- The generic public status-appending method was removed. The sole pass
  transition recomputes a strict conformance pass from the current quarantined
  Candidate and artifacts, persists it through the immutable store, rereads
  and compares the written bytes, and binds the result to a new immutable
  Candidate revision and receipt. Verification repeats that proof and fails
  closed on tampered result bytes or receipts.

### Repair TDD evidence

- Candidate namespace/effect RED: an unreserved provider key and eight
  mutation effects were accepted; Graph and Compiler also accepted an
  otherwise-valid `candidate.safe-adapter`. GREEN: all three boundaries reject
  the reserved namespace and the Candidate allow-list rejects every mutation.
- Accepted-evidence verifier RED: `verifyCompletedEvidence` did not exist.
  GREEN: removing a persisted scanner summary causes deterministic
  rehydration while all seven accepted Task 3 phases and terminal evidence are
  revalidated without scanner execution.
- Durable lifecycle RED: strict proposals rejected the required evidence job;
  fresh registries could not resolve Candidate locators; Candidate status was
  exposed through a generic append API. GREEN: async create/verify use the
  Task 3 verifier, receipt locators survive fresh instances, and only the
  validated conformance-pass operation exists.
- API/CLI durability RED: batch output had no locator and a fresh CLI reported
  the retained job reference as an invalid command/job. GREEN: fresh
  status/verify succeeds through the immutable receipt locator.
- Adversarial receipt/result RED: a forged conformance result binding, mixed
  evidence job IDs, and tampered persisted conformance bytes all verified as
  valid. GREEN: all three fail closed.

### Repair changed product paths

- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/jobs.ts`
- `packages/external-intake/test/api.test.ts`
- `packages/external-intake/test/candidates.test.ts`
- `packages/external-intake/test/conformance.test.ts`
- `packages/graph/src/model.ts`
- `packages/graph/test/application-graph.test.ts`

No Task 2 store path, ledger/state path, Task 5 path, or other production path
was changed.

### Repair verification evidence

Every command used Node `v22.11.0` by prepending
`C:\Users\15492\AppData\Local\nvm\v22.11.0` to `PATH`.

- Full External Intake suite: exit 0; 234/234 tests passed across 12 files.
- CLI suite: exit 0; 10/10 tests passed.
- Graph suite: exit 0; 28/28 tests passed.
- Capabilities suite: exit 0; 123/123 tests passed, including all 71 capability
  registry cases.
- Compiler suite: exit 0; 180/180 tests passed, including all 47 compilation
  plan cases.
- Affected package typechecks for External Intake, CLI, Graph, Capabilities,
  and Compiler: all exit 0.
- Affected package lints for External Intake, CLI, Graph, Capabilities, and
  Compiler: all exit 0.
- External Intake and CLI builds: both exit 0.
- Workspace `pnpm typecheck`: exit 0; 14/14 tasks passed.
- Workspace `pnpm test`: exit 0; 14/14 tasks and 851/851 tests passed.
- Workspace `pnpm lint`: exit 1 only for inherited formatting failures outside
  Task 4 in Compiler Worker, Workbench, and Adapters. All five affected package
  lints pass, and no out-of-scope formatting was changed.
- `git diff --check 60c15ac --`: exit 0.
- Exact-path audit: 12 changed product paths, all Repair Round 1/5 authorized.
- Import audit: the CLI remains the only production package outside External
  Intake importing `@factory/external-intake`.
- Privacy audit: matches are limited to defensive validators and negative test
  sentinels; no credential, raw prompt, or raw response is persisted or
  reported.

### Repair acceptance status and residual risk

All five Repair Round 1/5 requirements are satisfied. Fresh-process
load/status/verify is receipt-addressed and therefore requires the caller to
retain the returned opaque locator; no unauthorized store listing API was
added. Fresh Candidate verification proves the durable creation/evidence and
status receipt attestations. Re-running conformance in a fresh process remains
intentionally unavailable because Task 2 exposes no blob-read API for the
declarative artifacts; conformance execution was not part of the required
fresh-process load/status/verify surface.

Task 4 remains `implementing` in the PM ledger and is handed to independent
task review. This report does not mark it ready for QA, reviewed, accepted,
promoted, or released.

### Repair post-commit evidence

- Committed-tree External Intake suite: Node `v22.11.0`; exit 0; 234/234 tests
  passed across 12 files.
- Committed-tree CLI suite: Node `v22.11.0`; exit 0; 10/10 tests passed.
- Committed-tree External Intake and CLI typechecks: both exit 0.
- `git diff --check HEAD^ HEAD`: exit 0.
- Commit path audit lists exactly the 12 authorized Repair Round 1/5 product
  paths.
- `git status --short`: empty; this operational report remains ignored.

## Repair Round 2/5

Repair contract base: `54994ed` (`docs: bound candidate verification repair`).

Specialization: `integration`.

Contract owner: Candidate Registry.

Contract status: frozen for Repair Round 2/5 implementation.

Bounded repair commit: `fad4a5b` (`fix: persist candidate verification
state`).

### Repair delivered

- Candidate creation persists a canonical, immutable, redacted verification
  state that binds the exact evidence job metadata, completed Task 3 evidence,
  all declarative Candidate artifacts, and snapshot source-blob references.
  Snapshot bytes remain only in the configured local quarantine blob store and
  are omitted from Candidate records, receipts, API/CLI output, and the state
  document.
- Receipt-addressed recovery uses a Candidate-owned quarantine reader. It
  accepts only digest-derived snapshot/evidence blob paths below the configured
  root and rejects invalid digests, traversal, symbolic-link/special entries,
  missing content, and size/digest drift. It never accepts caller paths or URLs
  and never executes or transforms source content.
- Fresh recovery reconstructs the exact `IntakeJobV1`,
  `CompletedEvidenceRefV1`, canonical artifacts, creation Candidate, current
  Candidate revision, and receipt history. It requires the exact Candidate
  parent set, creation receipt digest list, deterministic Candidate job ID, and
  conformance predecessor/result bindings.
- Candidate verification no longer has optional artifact/evidence fallbacks.
  It always re-puts the bound state and every artifact, calls the exported Task
  3 `verifyCompletedEvidence` boundary, and recomputes/re-puts a passed
  conformance result. Missing, fabricated, truncated, or conflicting state
  fails closed.
- The module API and repository-local CLI now explicitly configure the same
  local quarantine root for storage and Candidate recovery. No Task 2 store,
  dependency, Graph, compiler, Task 5, or ledger path changed.

### Repair TDD evidence

- Focused restart/adversarial RED: 10 focused cases produced 9 failures before
  implementation. The receipt-only implementation reported valid for missing
  snapshot/acquisition records, missing or tampered source blobs, missing or
  truncated strict state, tampered Candidate artifacts, and tampered
  conformance output; the fabricated-chain guard was the sole pre-existing
  pass.
- GREEN: Candidate tests now cover strict redacted state persistence, source
  and artifact/checkpoint rehydration, fresh quarantined and conformance-passed
  recovery, missing snapshot metadata, missing immutable parents, missing or
  tampered source blobs, missing/truncated state, fabricated/truncated receipts,
  tampered artifacts, and tampered conformance results. The focused Candidate
  suite passes 38/38.

### Repair changed product paths

- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/test/api.test.ts`
- `packages/external-intake/test/candidates.test.ts`

This ignored report is the previously authorized operational-evidence
exception. No other path changed.

### Repair verification evidence

Every command used Node `v22.11.0` by prepending
`C:\Users\15492\AppData\Local\nvm\v22.11.0` to `PATH`.

- External Intake build and CLI build: both exit 0.
- External Intake suite: exit 0; 245/245 tests passed across 12 files.
- CLI suite: exit 0; 10/10 tests passed.
- External Intake and CLI typechecks: all exit 0.
- External Intake and CLI lints: all exit 0.
- Workspace `pnpm typecheck`: exit 0; 14/14 tasks passed.
- Workspace `pnpm test`: exit 0; 14/14 tasks and 862/862 tests passed.
- Workspace `pnpm lint`: exit 1 only for inherited formatting failures outside
  Task 4 in Compiler Worker and Adapters before Turbo stopped remaining work.
  The two affected Task 4 package lints independently pass; no out-of-scope
  formatting was changed.
- `git diff --check 54994ed --`: exit 0.
- Exact-path audit: the six changed product paths are all existing
  ledger-authorized Task 4 Candidate/API/CLI/test paths.
- Production privacy scan found no added raw prompt, raw response, source-body,
  credential, password, API-key, or secret-match persistence/output field.

### Repair acceptance status and residual risk

All four Repair Round 2/5 requirements are satisfied. Durable Candidate
discovery remains receipt-addressed, so callers must retain the opaque locator.
The direct CandidateRegistry constructor may omit a verification root for
same-process creation and verification, but receipt-addressed recovery then
fails closed; the public module API and CLI always configure the root.

Task 4 remains `implementing` in the PM ledger and is handed to independent
task review. This report does not mark it ready for QA, reviewed, accepted,
promoted, or released.

### Repair post-commit evidence

- Committed-tree External Intake suite: exit 0; 245/245 tests passed.
- Committed-tree CLI suite: exit 0; 10/10 tests passed.
- Committed-tree External Intake and CLI typechecks and lints: all exit 0.

## Repair Round 3/5

Repair contract base: `f639c1d` (`docs: require verified candidate recovery`).

Specialization: `integration`.

Contract owner: Candidate Registry.

Contract status: frozen for Repair Round 3/5 implementation.

Bounded repair commit: `1c52a42` (`fix: verify candidate recovery before
conformance`).

### Repair delivered

- Fresh receipt recovery now creates an explicitly unverified registry entry.
  Synchronous Candidate record/reference access rejects that entry, list access
  excludes it, and the entry becomes usable only after the full existing
  Candidate verifier succeeds. A later failed verification clears the verified
  state again.
- `verifyIdentity` is the shared asynchronous recovery boundary. It runs the
  existing Task 3 `verifyCompletedEvidence` proof, parent/provenance loading,
  checkpoint rehydration, Candidate artifact verification/re-put, Candidate and
  receipt binding checks, and persisted conformance-result verification.
- Candidate conformance bundles are now asynchronous and verified. Both direct
  `recordConformancePass` and API `candidateTest` must cross the full boundary
  before evaluation or persistence. API `candidateShow` also verifies before
  returning a recovered summary, while `candidateVerify` uses the same identity
  boundary directly.
- Fresh verification requires Candidate artifact and conformance-result bytes
  to exist at their bound digest before the canonical verification re-put.
  Missing or conflicting bytes therefore cannot be silently reconstructed and
  consumed by the same conformance operation. Task 3 checkpoint rehydration
  remains unchanged.
- The CLI already awaited Candidate API operations, so the asynchronous show and
  test gate required no CLI source change. No Task 2, Graph, compiler,
  dependency, network, process, runtime, ledger, or Task 5 path changed.

### Repair TDD evidence

- Focused two-process RED: all 10 damaged-state cases returned a conformance
  `pass` instead of rejecting. The failures covered missing and tampered
  snapshot records, acquisition records, terminal EvidenceBundle records,
  Candidate artifact bytes, and persisted conformance-result bytes.
- GREEN: all 10 damaged-state cases reject Candidate show/test, hide the
  unverified entry from list output, reject direct lifecycle transition, and
  preserve Candidate and receipt record counts. An eleventh positive case
  proves an intact fresh Candidate completes verification and records exactly
  one `conformance-passed` revision and receipt.
- Focused Candidate suite: exit 0; 49/49 tests passed.

### Repair changed product paths

- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/test/candidates.test.ts`

This ignored report is the previously authorized operational-evidence
exception. No other path changed.

### Repair verification evidence

Every command used Node `v22.11.0` by prepending
`C:\Users\15492\AppData\Local\nvm\v22.11.0` to `PATH`.

- External Intake and CLI builds: both exit 0.
- External Intake suite: exit 0; 256/256 tests passed across 12 files.
- CLI suite: exit 0; 10/10 tests passed.
- External Intake and CLI typechecks and lints: all exit 0.
- Workspace `pnpm typecheck`: exit 0; 14/14 tasks passed.
- Workspace `pnpm test`: exit 0; 14/14 tasks and 873/873 tests passed.
- Workspace `pnpm lint`: exit 1 only for inherited formatting failures outside
  Task 4 in Adapters, Compiler Worker, Workbench, and Control Plane before Turbo
  stopped remaining work. Both affected Task 4 package lints independently
  pass; no out-of-scope formatting was changed.
- `git diff --check f639c1d --`: exit 0.
- Exact-path audit: exactly three existing ledger-authorized Task 4 paths
  changed.
- Production privacy scan found no added raw prompt, raw response, source-body,
  credential, password, API-key, or secret-match persistence/output field.

### Repair acceptance status and residual risk

All Repair Round 3/5 requirements are satisfied. Receipt-addressed discovery
still requires the caller-retained opaque locator. Unverified recovery state is
held only long enough to run verification and remains inaccessible to record,
list, conformance, lifecycle, API, and CLI consumers on failure.

Task 4 remains `implementing` in the PM ledger and is handed to independent
task review. This report does not mark it ready for QA, reviewed, accepted,
promoted, or released.

### Repair post-commit evidence

- Committed-tree External Intake suite: exit 0; 256/256 tests passed.
- Committed-tree CLI suite: exit 0; 10/10 tests passed.
- Committed-tree External Intake and CLI typechecks and lints: all exit 0.

## Repair Round 4/5

Repair contract base: `16a4842` (`docs: require exactly-once conformance`).

Specialization: `integration`.

Contract owner: Candidate Registry.

Contract status: frozen for Repair Round 4/5 implementation.

Bounded repair commit: `986319a` (`fix: make candidate conformance exactly
once`).

### Repair delivered

- `recordConformancePass` no longer derives the transition from mutable
  `entry.latest`, the last mutable receipt, or the receipt-array length. After
  full verification and immediately before persistence, it reloads and
  validates the immutable quarantined creation Candidate and sequence-1
  creation receipt from the store.
- The passed Candidate revision is derived only from that verified creation
  Candidate, its immutable digest, and the canonical conformance-result digest.
  The transition receipt is always sequence 2 and always names the creation
  receipt plus the deterministic passed Candidate revision as parents.
- The existing immutable receipt index supplies the durable compare-and-set.
  Concurrent identical writers persist or validate the same Candidate, result,
  receipt, and sequence-2 index bytes. Any conflicting sequence-2 write rejects
  through the existing store boundary; sequence 3 is never requested.
- Persisted Candidate and receipt records are reread and compared with the exact
  deterministic values before the in-memory entry adopts the transition.
  History and receipt arrays de-duplicate by digest, preventing stale concurrent
  callers from extending mutable state twice.
- Conformance bundles always use the quarantined creation Candidate. A retry
  therefore recomputes the original conformance result and converges on the
  existing immutable sequence-2 transition instead of producing a result bound
  to the passed revision.
- No API, CLI, Task 2 store, dependency, Graph, compiler, network, process,
  runtime, ledger, or Task 5 path changed.

### Repair TDD evidence

- Focused RED: two overlapping `candidateTest` calls returned matching pass
  results but persisted three Candidate records and ten receipts. The expected
  durable state was two Candidate records and nine receipts, proving one extra
  passed revision and one unsupported sequence-3 receipt.
- GREEN: the same concurrent calls return identical results with exactly one
  Candidate revision delta and one receipt delta. A later fresh API verifies
  the returned locator as `conformance-passed`; an idempotent retry returns the
  identical result without changing Candidate or receipt counts.
- Focused Candidate suite: exit 0; 50/50 tests passed.

### Repair changed product paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/test/candidates.test.ts`

This ignored report is the previously authorized operational-evidence
exception. No other path changed.

### Repair verification evidence

Every command used Node `v22.11.0` by prepending
`C:\Users\15492\AppData\Local\nvm\v22.11.0` to `PATH`.

- External Intake and CLI builds: both exit 0.
- External Intake suite: exit 0; 257/257 tests passed across 12 files.
- CLI suite: exit 0; 10/10 tests passed.
- External Intake and CLI typechecks and lints: all exit 0.
- Workspace `pnpm typecheck`: exit 0; 14/14 tasks passed.
- Workspace `pnpm test`: exit 0; 14/14 tasks and 874/874 tests passed.
- Workspace `pnpm lint`: exit 1 only for inherited formatting failures outside
  Task 4 in Adapters, Compiler Worker, Workbench, and Control Plane. Both
  affected Task 4 package lints independently pass; no out-of-scope formatting
  was changed.
- `git diff --check 16a4842 --`: exit 0.
- Exact-path audit: exactly two existing ledger-authorized Task 4 paths changed.
- Production privacy scan found no added raw prompt, raw response, source-body,
  credential, password, API-key, or secret-match persistence/output field.

### Repair acceptance status and residual risk

All Repair Round 4/5 requirements are satisfied. The compare-and-set relies on
the accepted Task 2 immutable receipt index: identical sequence-2 bytes
converge, while conflicting bytes reject. Receipt-addressed discovery still
requires callers to retain the returned transitioned locator.

Task 4 remains `implementing` in the PM ledger and is handed to independent
task review. This report does not mark it ready for QA, reviewed, accepted,
promoted, or released.

### Repair post-commit evidence

- Committed-tree External Intake suite: exit 0; 257/257 tests passed.
- Committed-tree CLI suite: exit 0; 10/10 tests passed.
- Committed-tree External Intake and CLI typechecks and lints: all exit 0.

## PM Repair Round 4 independent re-review reconciliation

Independent re-review of repair commit `986319a` PASSED with no P0/P1/P2. The
reviewer reproduced concurrent fresh API and separate-consumer races with
exactly one Candidate revision and receipt delta, only sequences 1 and 2, valid
fresh show/verification, and idempotent retry. Focused Repair Round 4 and prior
corruption coverage passed 45/45; Graph, compiler, and Golden Candidate
exclusions remained intact.

The PM moved Task 4 `implementing -> ready_for_qa`. Independent behavioral QA
is the next gate. Task 4 is not reviewed, accepted, promoted, or released. Its
complete repair history, contract, exact paths, non-goals, and acceptance
evidence remain frozen. Tasks 5 and 6 remain `planned`.

## Repair Round 5/5

Contract base: `f712104` (`docs: bound final candidate registry repair`).

Bounded repair commit: `0f7811a` (`test: prove candidate process race safety`).

### Repair delivered

- Added deterministic separate-OS-process conformance-race evidence proving
  exactly one Candidate revision and one sequence-2 receipt delta, a valid fresh
  transitioned Candidate, and an idempotent retry with no additional records.
- Expanded fabricated and truncated receipt-chain coverage across public show,
  list, test, conformance-bundle, and transition paths. Every corrupted path
  fails closed with zero Candidate or receipt mutation.
- Mechanically formatted the existing lockfile without changing dependency
  content or resolution.

### Changed product and test paths

- `packages/external-intake/test/candidates.test.ts`
- `pnpm-lock.yaml`

No production, Store, dependency, Graph, Compiler, network, or runtime behavior
changed.

### Verification and reconciliation

- Candidate suite: 61/61.
- Focused Task 4: 226/226.
- Full External Intake: 268/268.
- Intake CLI: 10/10.
- Graph: 28/28.
- Capabilities: 123/123, including Golden boundary 71/71.
- Compiler: 180/180, including compilation-plan boundary 47/47.
- Workspace tests and typecheck: 14/14 tasks each.
- Affected builds, typechecks, lints, bounded diff, privacy, and formatting
  checks passed.

Independent task review and behavioral QA passed with no P0/P1/P2. Task 4 moved
through `ready_for_qa` to `reviewed`, but it was not accepted.

## Release convergence: Repair Round 6/6

Contract bases:

- `fc748ec` (`docs: bound final candidate convergence`);
- `627f778` (`docs: authorize atomic terminal candidate transition`).

Bounded repair commit: `3f4b58c` (`fix: converge candidate terminal lifecycle`).

### Repair delivered

- Added bounded recursive Candidate artifact and CLI output privacy guards for
  sensitive key families, structured authorization formats, and
  credential-like high-entropy values. Validation occurs before Candidate
  persistence, lifecycle receipts, conformance output, or CLI rendering.
- Enforced exact requested `id@version` binding for warm and fresh show, verify,
  test, bundle, and lifecycle operations.
- Added validated append-only `blocked` and `rejected` terminal operations with
  exact Candidate-revision binding. `conformance-passed` remains available only
  through verified conformance.
- Added an atomic immutable sequence-2 terminal transition primitive that
  verifies the sequence-1 creation parent, chooses exactly one indexed winner,
  rejects a conflicting terminal operation without orphan persistence, and
  preserves idempotent retry.

### Changed product and test paths

- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/store.ts`
- `packages/external-intake/test/candidates.test.ts`
- `packages/external-intake/test/store.test.ts`

### Verification and review result

- Full External Intake: 316/316.
- Intake CLI: 27/27.
- External Intake and CLI typecheck and lint passed.
- Workspace tests and typecheck: 14/14 tasks each.
- Bounded diff and clean-worktree checks passed.

Independent review found that the terminal primitive was reachable through the
public Store surface. The atomic behavior itself remained valid, but the
accessibility boundary required Repair Round 7/7. Task 4 remained
`implementing`.

## Public-surface convergence: Repair Round 7/7

Contract base: `bdfc8c3` (`docs: hide candidate terminal CAS surface`).

Bounded repair commit: `3112e26`
(`fix: hide candidate terminal transition primitive`).

### Repair delivered

- Removed the terminal transition primitive from the public
  `ExternalIntakeStore` instance and package-root API.
- Retained it only as an internal module-level primitive imported directly by
  `CandidateRegistry`.
- Preserved atomic sequence-2 ownership, winner-only recovery, conflict
  rejection, no-orphan persistence, and idempotent retry.
- Added public package and Store boundary regressions and corrected the
  child-process test import placement.

### Changed product and test paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/store.ts`
- `packages/external-intake/test/store.test.ts`

### Verification and QA result

- Store: 34/34, including the three-process mixed-terminal race.
- jobs: 30/30.
- Full External Intake: 317/317.
- Intake CLI: 27/27.
- Sensitive-data boundary: 62/62; CLI privacy: 18/18.
- Three-process terminal race: 3/3.
- Graph Candidate isolation: 27/27.
- Golden boundary: 71/71.
- Compiler boundary: 47/47.
- Workspace verification: 14/14 tasks.
- Built package surface:
  `{"modulePrimitive":false,"storeOperation":false}`.

Independent task review and QA passed with no P0/P1/P2. Task 4 moved to
`reviewed` but remained unaccepted. Repository-root formatting debt in
unchanged files remained out of scope.

## Privacy convergence: Repair Round 8/8

Contract base: `1848f08` (`docs: bound opaque token privacy repair`).

Bounded product commit: `f8bb51f`
(`fix: reject delimited candidate credentials`).

### Exact changed product and test paths

- `apps/intake-cli/src/main.ts`
- `apps/intake-cli/test/cli.test.ts`
- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/test/candidates.test.ts`

No other product, Store, Graph, Compiler, dependency, network, process, runtime,
ledger, or Task 5 path changed.

### Repair delivered

- Candidate creation rejects delimiter-bearing credential-like high-entropy
  values before registry mutation or quarantine persistence.
- CLI rendering redacts the same bounded value class in both direct and
  structured authorization forms.
- Canonical Factory identifiers, versions, keys, API-version values, digests,
  and locators are preserved only for their exact command and typed field path.
- Nested metadata and malformed object properties cannot impersonate canonical
  array elements or use leaf-key-only exceptions.
- Rejection tests snapshot the quarantine before create and prove no record,
  receipt, blob, sentinel text, or registry entry is added.

### TDD evidence

- Initial focused RED: the new delimiter cases crossed Candidate create and CLI
  rendering under the Round 7 implementation. The focused runs exited non-zero
  before the bounded detector change.
- Initial GREEN: Candidate create rejected before mutation and CLI rendering
  redacted the new bounded shapes.
- Independent review RED: leaf-key-only CLI exceptions preserved canonical
  values in unapproved nested metadata paths. The focused review regression
  exited non-zero.
- Final GREEN: command-aware full-path allow-listing preserved canonical values
  only in approved result fields and redacted nested or malformed lookalikes.

No credential value or raw payload is retained in this report.

### Exact Node 22 verification commands and results

The verification environment prepended
`C:\Users\15492\Develop\Agents\CICD-agents\.tools\node-v22.11.0-win-x64`
to `PATH`. `node --version` returned `v22.11.0`.

1. `pnpm --filter @factory/external-intake exec vitest run test/candidates.test.ts`
   - exit 0;
   - 111/111 tests passed.
2. `pnpm --filter @factory/intake-cli exec vitest run test/cli.test.ts`
   - exit 0;
   - 35/35 tests passed.
3. `pnpm --filter @factory/external-intake test`
   - exit 0;
   - 325/325 tests passed.
4. `pnpm --filter @factory/intake-cli test`
   - exit 0;
   - 35/35 tests passed.
5. `pnpm --filter @factory/external-intake typecheck`
   - exit 0.
6. `pnpm --filter @factory/intake-cli typecheck`
   - exit 0.
7. `pnpm --filter @factory/external-intake lint`
   - exit 0.
8. `pnpm --filter @factory/intake-cli lint`
   - exit 0.
9. `pnpm exec turbo run test --force`
   - exit 0;
   - 14/14 workspace tasks passed.
10. `pnpm typecheck -- --force`
    - exit 0;
    - 14/14 workspace tasks passed.
11. `git diff --check 1848f08 f8bb51f`
    - exit 0.
12. `git status --short`
    - empty before this ignored evidence-only report update.

### Round 8 handoff status

Independent task review passed with no P0/P1/P2 after the full-path allow-list
repair and package lint. The remaining bounded risk is that a future
credential alphabet or canonical schema field requires a deliberate detector
or allow-list amendment.

Task 4 remains `implementing` in the PM ledger. This report does not advance
Task 4 to `ready_for_qa`, `reviewed`, or `accepted`, and it does not authorize
Task 5.

## Evidence privacy declaration

This ignored operational report contains command names, counts, commit IDs,
path names, and summarized outcomes only. It contains no credential, raw model
prompt, raw model response, raw third-party source, raw scanner output, or
finding payload. Negative test values remain in test code only and are not
copied here.

## Privacy completion: Repair Round 9/9

Contract base: `f02747d`
(`docs: bound authorization prefix privacy repair`).

Bounded product commit: `aee5c99`
(`fix: reject authorization-prefixed candidate credentials`).

### Exact changed product and test paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/test/candidates.test.ts`
- `apps/intake-cli/test/cli.test.ts`

No other Task 4 product, Store, Graph, Compiler, dependency, network, process,
runtime, ledger, lifecycle, CAS, version, provenance, recovery, isolation, or
Task 5 path changed.

### Repair delivered

- The shared bounded Candidate/CLI credential detector recognizes an optional
  case-insensitive authorization label and an optional existing auth-scheme
  shape before applying the existing high-entropy token test.
- Candidate registry regressions cover both prefixed forms for each authorized
  delimiter. They snapshot the populated quarantine before creation and prove
  rejection leaves every record, receipt, blob, registry entry, and sentinel
  unchanged.
- CLI regressions cover the same six forms and prove neither the complete value
  nor its token component reaches rendered output.
- Repair Round 8/8's exact typed Candidate and command-aware CLI canonical
  allow-lists remain unchanged.

### TDD and built-output evidence

- Mutation RED restored the Round 8 matcher: all six Candidate cases resolved
  to persisted quarantined Candidates instead of rejecting, and all six CLI
  cases rendered the synthetic sentinel. Both focused commands exited nonzero
  for the intended missing-prefix reason.
- GREEN restored the minimal optional-label matcher: focused Candidate passed
  6/6 and focused CLI passed 6/6.
- After building both packages, a direct Node import of
  `apps/intake-cli/dist/main.js` exercised all six prefixed delimiter/scheme
  combinations. The compiled output probe reported 6/6 redacted with no token
  component present.

No credential value or raw payload is retained in this report.

### Fresh Node 22 verification

The verification environment prepended
`C:\Users\15492\Develop\Agents\CICD-agents\.tools\node-v22.11.0-win-x64`
to `PATH`. `node --version` returned `v22.11.0`.

1. `pnpm --filter @factory/external-intake exec vitest run test/candidates.test.ts -t "Authorization prefix"`
   - exit 0;
   - 6/6 focused tests passed.
2. `pnpm --filter @factory/intake-cli exec vitest run test/cli.test.ts -t "Authorization prefix"`
   - exit 0;
   - 6/6 focused tests passed.
3. `pnpm --filter @factory/external-intake exec vitest run test/candidates.test.ts`
   - exit 0;
   - 117/117 Candidate tests passed.
4. `pnpm --filter @factory/intake-cli exec vitest run test/cli.test.ts`
   - exit 0;
   - 41/41 CLI tests passed.
5. `pnpm --filter @factory/external-intake test`
   - exit 0;
   - 331/331 tests passed across 12 files.
6. `pnpm --filter @factory/intake-cli test`
   - exit 0;
   - 41/41 tests passed.
7. External Intake and CLI `build`, `typecheck`, and `lint`
   - all exit 0;
   - both lint commands reported all matched files formatted.
8. `pnpm --filter @factory/graph exec vitest run test/application-graph.test.ts`
   - exit 0;
   - 27/27 tests passed.
9. `pnpm --filter @factory/capabilities exec vitest run test/capability-registry.test.ts`
   - exit 0;
   - 71/71 tests passed.
10. `pnpm --filter @factory/compiler exec vitest run test/compilation-plan.test.ts`
    - exit 0;
    - 47/47 tests passed.
11. `git diff --check f02747d aee5c99 --`
    - exit 0.
12. Exact-path and privacy audits
    - exactly the three authorized paths changed;
    - exactly one production path changed;
    - no credential-like literal or raw prompt, response, source-body, or
      secret-match field was added.

### Round 9 handoff status

All three Round 9 acceptance requirements have direct regression evidence.
The bounded detector continues to intentionally recognize only the frozen token
alphabet, delimiter set, auth-scheme grammar, and entropy threshold; new
credential alphabets require a future governed amendment.

Task 4 remains `implementing` in the PM ledger and is handed to independent
task review. This report does not advance Task 4 to `ready_for_qa`, `reviewed`,
or `accepted`, and it does not authorize Task 5.

## Durable creation convergence: Repair Round 10/10

Contract bases:

- `302a14e` (`docs: authorize external intake repair round 10`);
- `63c5ff3` (`docs: bound external intake round 10 convergence`).

Initial bounded product commit: `37345e5`
(`fix: make candidate creation durable`).

### Exact Round 10 paths

- `packages/external-intake/src/candidates.ts`
- `packages/external-intake/src/api.ts`
- `packages/external-intake/src/store.ts`
- `packages/external-intake/test/candidates.test.ts`
- `packages/external-intake/test/api.test.ts`
- `packages/external-intake/test/store.test.ts`
- `.superpowers/sdd/2026-07-31-external-capability-intake/task-4-report.md`
  (the ledger-authorized ignored operational-evidence exception)

No dependency, Graph, Golden registry, compiler, runtime, network, public API,
terminal-lifecycle, privacy, provenance, isolation, conformance, Task 5, or
Task 6 path changed.

### Repair delivered

- Candidate creation first establishes one immutable exact `id@version` claim.
  Candidate-owned records, blobs, receipt, and current locator are written only
  for that claim. Same-input recovery completes or validates the claimed
  transaction; a conflicting input is rejected before any Candidate-owned
  write.
- The durable current receipt is discoverable through the exact identity
  locator. Fresh list, show, and verification resolve the current immutable
  revision, including a sequence-2 terminal winner.
- Warm registry and API show, verify, and get paths now reconcile their cached
  sequence-1 entry with the durable current receipt before returning. Separate
  registry writers were verified for `blocked`, `rejected`, and
  `conformance-passed`.
- The claim and completion functions remain internal to the source module.
  They are absent from the package-root exports and
  `ExternalIntakeStore.prototype`.
- A deterministic child process establishes only the sequence-1 creation claim
  and is then killed by the operating system. Separate fresh processes prove a
  conflict adds no Candidate-owned record, receipt, blob, or locator; the
  original input completes with the exact winner-only deltas; list-before-show
  sees only that winner; and an idempotent retry adds nothing.

### Focused RED and GREEN evidence

Every command used Node `v22.11.0` by prepending
`C:\Users\15492\AppData\Local\nvm\v22.11.0` to `PATH`.

- Warm-cache RED:
  `pnpm exec vitest run test/candidates.test.ts --testNamePattern "reconciles warm show"`
  exited 1 with 3/3 focused failures. For each terminal outcome, the warm API
  returned the cached quarantined creation digest, locator, and status.
- Warm-cache GREEN: the same command exited 0 with 3/3 focused tests passed
  after durable-current reconciliation.
- Crash-evidence harness RED:
  `pnpm exec vitest run test/candidates.test.ts --testNamePattern "recovers only the claimed winner in a fresh process"`
  initially exited 1 because Vitest intercepted `process.exit`; this was a test
  harness failure, not a product failure. The child was changed to a
  deterministic self-`SIGKILL`, which cannot run cleanup handlers.
- Crash-evidence GREEN: the same command exited 0 with 1/1 focused test passed.
  It proved post-claim recovery, conflict rejection, zero loser persistence,
  exact winner-only blob/record/locator deltas, fresh list-before-show
  discovery, and idempotent retry.
- Combined focused GREEN:
  `pnpm exec vitest run test/candidates.test.ts --testNamePattern "reconciles warm show|recovers only the claimed winner"`
  exited 0 with 4/4 focused tests passed.

### Fresh Node 22 verification

1. `node --version`
   - exit 0;
   - `v22.11.0`.
2. `pnpm --filter @factory/external-intake exec vitest run test/candidates.test.ts test/api.test.ts test/store.test.ts`
   - exit 0;
   - 167/167 tests passed across 3 files.
3. `pnpm --filter @factory/external-intake test`
   - exit 0;
   - 342/342 tests passed across 12 files.
4. External Intake `build`, `typecheck`, and `lint`
   - all exit 0;
   - lint reported all matched files formatted.
5. Intake CLI `build`, `typecheck`, `lint`, and `test`
   - all exit 0;
   - 41/41 CLI tests passed.
6. `pnpm --filter @factory/graph exec vitest run test/application-graph.test.ts`
   - exit 0;
   - 27/27 tests passed.
7. `pnpm --filter @factory/capabilities exec vitest run test/capability-registry.test.ts`
   - exit 0;
   - 71/71 tests passed.
8. `pnpm --filter @factory/compiler exec vitest run test/compilation-plan.test.ts`
   - exit 0;
   - 47/47 tests passed.
9. Built package-root and Store-prototype surface probe:
   - exit 0;
   - `{"rootClaimCandidateCreation":false,"rootCompleteCandidateCreation":false,"storeClaimCandidateCreation":false,"storeCompleteCandidateCreation":false}`.
10. Bounded formatting and exact-path checks
    - `git show --check 37345e5` and the final staged
      `git diff --check` exited 0;
    - the exact Round 10 set is the seven paths listed above.

### Acceptance status and residual risk

The Round 10 convergence requirements have direct regression evidence. The
exclusive claim depends on same-filesystem atomic exclusive-create semantics.
Processes sharing that filesystem converge as tested, but a future distributed
or non-conforming filesystem would require a governed transactional boundary.
A crash after the claim intentionally leaves the immutable claim so the same
input can recover while conflicting input remains fenced.

This sanitized report contains command names, counts, commit IDs, path names,
and summarized outcomes only. It contains no credential, raw prompt, raw model
response, raw third-party source, raw scanner output, or sensitive finding
payload.

Task 4 remains `implementing` and is handed to independent task review. This
report does not advance it to `ready_for_qa`, `reviewed`, or `accepted`, and it
does not authorize Task 5 or Task 6.
