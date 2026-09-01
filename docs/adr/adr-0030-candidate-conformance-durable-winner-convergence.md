---
title: "ADR-0030: Candidate Conformance Durable Winner Convergence"
status: "Accepted"
date: "2026-09-02"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "external-intake", "concurrency", "security", "operability"]
supersedes: ""
superseded_by: ""
---

# ADR-0030: Candidate Conformance Durable Winner Convergence

## Status and standing decision gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** the internal Candidate conformance transition from
race-dependent rejection to strict convergence on one byte-identical,
fully-verified durable sequence-2 winner while **keeping** the current accepted
Golden technology profile and every versioned serialization identifier.

**Accepted on 2026-09-02** under the founder's standing independent-review
authorization. The first independent reviewer `/root/review_adr_0030` reported
P0/P1/P2 `0/1/0` and rejected sibling staging because a crash-left file could
disable strict Candidate enumeration. The Tech Lead revised the proposal to
isolate staging at `<quarantine-root>/.immutable-staging` and added explicit
crash-isolation gates. A separate independent reviewer
`/root/review_adr_0030_revision` then reported decision-gate compliance,
P0/P1/P2 `0/0/0`, and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`. PM therefore
records this bounded, reversible decision as accepted without another founder
interruption. Focused RED/GREEN, implementation review, QA, controller
delivery, and replacement CI remain mandatory.

- **GAT-001**: This proposal is not approval. Under the founder's standing
  independent-review authorization recorded in `docs/tech-governance.md`, PM
  may record it as accepted only after a separate qualified read-only reviewer
  returns `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, reports P0/P1 `0/0`, and
  confirms every standing-policy condition.
- **GAT-002**: The Tech Lead stops after this proposal. PM owns the decision
  record, implementation authorization, task paths, and state transitions.
- **GAT-003**: Acceptance grants no repository release, Product Publish,
  external provider call, paid resource, cloud action, deployment, credential
  exposure, security-boundary weakening, destructive migration, or
  irreversible step.

## Context

- **CTX-001**: External Intake admits an untrusted Candidate only through
  strict verification and an append-only lifecycle. A permissive Candidate may
  move from `quarantined` to `conformance-passed` through the internal
  deterministic sequence-2 transition. That status grants no Golden, Graph,
  compiler, source-copy, publication, provider, or runtime authority.
- **CTX-002**: The accepted Candidate contract requires overlapping identical
  conformance attempts to converge on one immutable Candidate revision and one
  receipt, or to reject cleanly without sequence 3, orphan records, or a
  weakened verification boundary. The current separate-process regression is
  intended to prove that contract.
- **CTX-003**: Remote CI run `33529198551`, Node `22.11.0` lane job
  `99927705355`, reached the existing separate-process Candidate conformance
  regression and failed one child at
  `CandidateRegistry.recordConformancePass` with
  `Strict Candidate verification is required before access.` The failure was
  reached only after the earlier formatting gate was repaired; it is not a
  formatting or workflow failure.
- **CTX-004**: The Candidate-layer race is a verified-to-reconcile time-of-check
  / time-of-use gap. `recordConformancePass` first strictly verifies the
  sequence-1 Candidate. Another process can then commit the deterministic
  sequence-2 transition. The caller's subsequent `#entry` call reconciles to a
  freshly loaded sequence-2 entry whose in-memory `verified` flag is false and
  throws before the existing durable-winner recovery branch can validate and
  return that winner.
- **CTX-005**: A second independent race exists in
  `ExternalIntakeStore.#writeExclusiveVerified`. `writeFileSync(finalPath,
bytes, { flag: "wx" })` makes the final pathname visible after exclusive
  creation but before all bytes are necessarily written. An identical loser
  can receive `EEXIST`, immediately read an empty or partial file, and report a
  terminal sequence conflict even though the writer subsequently publishes
  the exact deterministic bytes.
- **CTX-006**: The current winner checks correctly reject a different
  sequence-2 receipt, altered evidence, corrupt content-addressed records,
  unsupported sequence 3, and mixed `blocked` / `rejected` /
  `conformance-passed` terminal attempts. The repair must preserve those
  fail-closed outcomes and must not turn an unverified durable record into a
  successful retry.
- **CTX-007**: The two defects cross the Candidate registry and its internal
  immutable store contract. Repairing only the Candidate-layer ordering leaves
  the partial-final-path race; repairing only file publication leaves the
  verified-to-reconcile gap. They therefore form one bounded serialized
  correction.
- **CTX-008**: A sibling staging file is not safe in this store. Candidate
  discovery strictly enumerates `candidates/` and rejects unknown filenames;
  equivalent record/blob/receipt namespaces are digest- or contract-addressed.
  A process death that leaves staging beside a final Candidate locator can
  therefore make otherwise valid listing or recovery fail permanently. Atomic
  publication requires a staging namespace that no data reader enumerates or
  addresses.

## Current accepted Golden technology profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; local and exact CI
  selection remains `22.11.0`; tracked and generated Node images retain the
  floating-major `node:22-alpine` tag.
- **CUR-002**: The package manager remains exactly `pnpm@9.0.0`, and
  `pnpm-lock.yaml` remains the exact resolved dependency authority.
- **CUR-003**: The accepted root coordinates remain TypeScript `^5.7.2` /
  `5.9.3`; Next.js `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` /
  `19.2.8`; NestJS Common/Core/Platform Express `^10.4.15` / `10.4.22`;
  Prisma Client and CLI `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`;
  Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` / `12.11.2`; and
  compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: `@factory/external-intake` remains private version `0.1.0`. Its
  direct dependency remains Zod `^3.24.1` / lockfile resolution `3.25.76`; its
  test dependency remains Vitest `^2.1.8` / lockfile resolution `2.1.9`; and
  `@factory/portfolio-public` remains the private workspace package at version
  `0.1.0` through `workspace:*`.
- **CUR-005**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and the accepted Docker Compose topology remains unchanged.
  These images and `node:22-alpine` are floating-major tags, not exact patch or
  digest pins.
- **CUR-006**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume a mutable Draft.
- **CUR-007**: The External Intake serialized identifiers remain
  `factory.candidate-capability/v1`,
  `factory.external-intake-receipt/v1`,
  `factory.external-intake-receipt-index/v1`,
  `factory.candidate-creation-claim/v1`,
  `factory.candidate-transition-claim/v1`,
  `factory.candidate-receipt-locator/v1`, and
  `factory.candidate-verification-state/v1`.
- **CUR-008**: The accepted lifecycle permits exactly one deterministic
  sequence-2 terminal transition from a digest-verified sequence-1 creation.
  `conformance-passed` is available only through the strict internal
  conformance operation; the internal compare-and-set primitive is not exposed
  from the package root or public `ExternalIntakeStore` surface.

## Proposed Candidate convergence profile

This proposed profile is distinct from, and does not replace, the current
accepted Golden technology profile above.

- **PRO-001**: Keep every `CUR-*` version, package, image, serialization,
  lifecycle, public API, data, Graph, compiler, adapter, catalog, security, and
  deployment coordinate unchanged.
- **PRO-002**: After the initiating caller has strictly verified sequence 1 and
  computed the deterministic conformance result, treat an observed indexed
  sequence-2 `candidate-conformance-passed` receipt as a possible concurrent
  winner, not as proof of success. Load it through the receipt-addressed path,
  perform full strict verification, and require its creation binding,
  Candidate bytes/digest, receipt bytes/digest, verification-state binding,
  conformance-result bytes/digest, version, and status to equal the caller's
  deterministic expected transition.
- **PRO-003**: Return the durable winner only when every `PRO-002` condition is
  satisfied. Mark or use the recovered entry as verified only as the result of
  that full verification. A missing, incomplete, differently bound, mixed
  terminal, unsupported, or tampered winner continues to fail closed without
  mutation.
- **PRO-004**: Replace final-path `wx` publication inside
  `#writeExclusiveVerified` with complete-file, no-replace publication. The
  supported implementation creates and verifies exactly
  `<quarantine-root>/.immutable-staging` as a dedicated mode-`0o700` directory
  on the same resolved filesystem as the quarantine root but outside every
  `candidates`, `blobs`, `records`, `jobs`, receipt, index, locator, and
  recovery namespace. It writes a uniquely named mode-`0o600` staging file
  there, verifies and closes it, atomically establishes the final pathname
  without replacement through a same-filesystem hard-link operation, then
  removes the staging link in `finally`.
- **PRO-005**: If atomic publication observes an existing final pathname, read
  it only through the existing bounded regular-file and stable-descriptor
  verification boundary. Succeed only when its complete bytes, expected
  SHA-256 digest, and required canonical-JSON form are exact. Otherwise throw
  the existing bounded conflict class/message without overwrite, deletion,
  waiting, or retry.
- **PRO-006**: Normal success, identical-winner, conflict, and ordinary error
  paths leave zero staging files. A process death before publication must leave
  no authoritative final path; a process death after publication may not make
  the verified final path partial or mutable. A crash-left staging file remains
  confined to the dedicated staging directory. Its directory and filename are
  outside every strictly enumerated or addressable Candidate, blob, record,
  receipt, index, locator, and recovery namespace, so its presence cannot enter
  or disable lookup, list, verification, or receipt-addressed recovery. Staging
  content is never authoritative input.
- **PRO-007**: Add no production sleep, polling loop, backoff, timer, lease,
  mutex, lock service, database, dependency, network access, worker protocol,
  compatibility shim, or public test hook. Test harnesses may use bounded
  process deadlines and explicit phase barriers; those controls do not enter
  production code.
- **PRO-008**: The implementation slice is limited by default to
  `packages/external-intake/src/candidates.ts`,
  `packages/external-intake/src/store.ts`,
  `packages/external-intake/test/candidates.test.ts`, and
  `packages/external-intake/test/store.test.ts`. PM must separately freeze any
  additional path before writing it.

## Decision

- **DEC-001 — Migrate**: Repair both concurrency gaps as one serialized
  External Intake contract correction. Identical strict conformance attempts
  converge on the one fully verified durable sequence-2 winner.
- **DEC-002 — Publish complete immutable files**: A final managed pathname is
  never the staging location, and no staging path is a sibling inside a strict
  data namespace. A final path becomes visible only through atomic no-replace
  publication from the isolated same-filesystem staging directory after
  complete-byte, digest, and canonical-form verification.
- **DEC-003 — Verify, do not trust, the winner**: Receipt-index existence or
  byte identity alone is insufficient. Candidate-layer convergence returns
  only after full strict verification of the exact deterministic winner and
  all accepted parent/evidence bindings.
- **DEC-004 — Preserve conflict semantics**: Different terminal statuses,
  different canonical bytes or digests, partial or malformed content,
  unsupported sequences, stale parents, and tampering remain terminal
  fail-closed errors with zero authoritative loser mutation.
- **DEC-005 — Preserve isolation and public surface**: The Candidate terminal
  compare-and-set and any publication helper remain internal. No package-root,
  public store, Graph, compiler, generated runtime, Golden catalog, or browser
  consumer gains a transition operation or Candidate authority.
- **DEC-006 — No delivery authority**: Acceptance authorizes at most PM
  reconciliation, focused RED/GREEN implementation in frozen paths,
  independent review and QA, controller-only non-force delivery, and
  replacement CI evidence.

## API, data, adapter, catalog, license, and supply-chain effects

- **API-001**: No exported TypeScript type, package-root symbol, CLI command,
  route, request/response, event, actor, authentication, or authorization
  contract changes. Successful concurrent identical calls become reliably
  idempotent instead of race-dependently throwing.
- **DAT-001**: No serialized field, identifier, canonical JSON form, digest,
  record kind, receipt sequence, index, locator, directory identity, or
  retention rule changes. Existing valid quarantine roots remain readable
  without conversion.
- **DAT-002**: Exactly one sequence-2 Candidate/receipt/evidence winner remains
  authoritative. The dedicated staging directory is disjoint from all strict
  enumerations and address constructors; staging files are never addressable
  data and cannot be used for lookup, listing, verification, or recovery. A
  different or corrupt existing final path is never repaired in place or
  overwritten.
- **ADP-001**: No editor, AI, Git, source-acquisition, compiler, queue,
  database, runtime-provider, or deployment adapter changes.
- **CAT-001**: No capability asset, Candidate promotion, Golden profile,
  manifest, binding, composition lock, registry key, recipe, compiler target,
  generated file, evidence digest, or catalog admission effect. A
  `conformance-passed` Candidate remains quarantined and non-promoted.
- **COM-001**: The change is data-compatible with all valid V1 records because
  canonical bytes and digests are unchanged. It intentionally does not accept
  partial, mismatched, or historically corrupt files as compatibility input.
- **LIC-001**: No dependency, copied source, upstream coordinate, license,
  notice, or source-study record changes.
- **SUP-001**: No package, action, image, cache, service, remote source, or
  supply-chain authority is added. The implementation uses only Node 22
  filesystem primitives already present in the accepted runtime.

## Security and operability effects

- **SEC-001**: Strict verification remains fail closed across the complete
  Task 3 evidence chain, Candidate artifacts, verification state,
  content-addressed records, receipt indexes, locator, and conformance-result
  bytes. Concurrent success cannot be inferred from a pathname, receipt index,
  in-memory status, or unverified rehydration alone.
- **SEC-002**: Complete-file publication removes the window in which another
  process can mistake a partially written final path for immutable evidence.
  The dedicated staging directory must be root-contained, same-filesystem,
  realpath-verified, non-symlinked, non-addressable, and mode `0o700`; staged
  files must be regular, non-symlinked files at mode `0o600`. No implementation
  may place staging under a strict data namespace, overwrite an existing
  immutable path, follow a symlink, accept a non-regular file, or weaken
  canonical/digest checks.
- **SEC-003**: Errors and evidence remain bounded and secret-safe. They must not
  include raw Candidate content, source bytes, credentials, prompts,
  responses, environment values, filesystem contents, or uncontrolled OS
  diagnostics.
- **SEC-004**: Candidate/Golden/Graph/compiler isolation remains unchanged.
  Convergence grants no promotion, source-copy, execution, network, provider,
  publish, compilation, runtime, or deployment authority.
- **OPS-001**: Identical cross-process attempts become deterministic on both
  the exact Node `22.11.0` lane and the supported current Node 22 lane. No
  correctness property depends on scheduler timing or an arbitrary retry
  timeout.
- **OPS-002**: Same-filesystem hard-link publication is a new internal
  filesystem assumption. Implementation and CI must prove it on the supported
  Windows local workspace and Linux GitHub runner. An unsupported filesystem
  fails closed; it does not fall back to visible final-path writes or
  overwrite-capable rename.
- **OPS-003**: The additional staging write, verification, link, and unlink add
  bounded local I/O. Content remains held in memory as it is today; no new
  unbounded buffer, traversal, or file-size authority is introduced.
- **OPS-004**: Candidate discovery continues to enumerate only its accepted
  data namespaces. It never enumerates the dedicated staging directory, and no
  staged filename can satisfy or collide with a Candidate, blob, record,
  receipt, index, claim, locator, or recovery address.

## Consequences

### Positive

- **POS-001**: Restores the accepted exactly-once sequence-2 convergence
  contract under real OS-process concurrency.
- **POS-002**: Preserves strict verification and tamper rejection rather than
  treating a race winner as implicitly trusted.
- **POS-003**: Makes immutable final paths atomic publication points instead of
  in-progress write locations.
- **POS-004**: Keeps valid serialized bytes, digests, public APIs, dependencies,
  and product behavior unchanged.

### Negative

- **NEG-001**: The repair spans Candidate registry and immutable store internals
  and must remain one serialized, independently reviewed security-sensitive
  slice.
- **NEG-002**: Atomic publication adds staging-file lifecycle and a
  dedicated verified same-filesystem directory plus a hard-link requirement
  that needs cross-platform evidence.
- **NEG-003**: Cross-process regression repetition increases focused test and
  CI time.
- **NEG-004**: A crash can leave one non-addressable file for that interrupted
  operation in `.immutable-staging`. It cannot enter or disable any
  lookup/list/recovery path, but repeated process kills can accumulate isolated
  local files. Automated stale-staging reclamation is outside this ADR because
  safe cross-process liveness ownership is not yet defined; the quarantine-root
  owner retains that local disk-hygiene residual risk.

## Alternatives considered

### Keep the race-dependent behavior

- **ALT-001**: Leave both gaps unchanged and rerun CI until both Node lanes are
  green.
- **ALT-002**: **Rejected.** A scheduler-dependent pass is not evidence of the
  accepted cross-process convergence contract and hides a real immutable-store
  publication defect.

### Add retries, sleeps, or backoff after EEXIST

- **ALT-003**: Poll a partial final path until its size or digest appears
  stable, using a timeout to distinguish a slow writer from a crashed writer.
- **ALT-004**: **Rejected.** No timeout is a correctness boundary; short values
  remain flaky, long values delay tamper rejection, and an unbounded wait fails
  operability.

### Trust any indexed sequence-2 winner

- **ALT-005**: If receipt index 2 exists, return the addressed Candidate without
  repeating strict verification or exact deterministic comparison.
- **ALT-006**: **Rejected.** A pathname or index is attacker-influenceable local
  state and cannot replace verification of parents, artifacts, evidence,
  canonical bytes, and digests.

### Add a process-local mutex

- **ALT-007**: Serialize `recordConformancePass` calls inside one Node process.
- **ALT-008**: **Rejected.** The reproduced failure crosses OS processes, and a
  process-local mutex provides neither cross-process exclusion nor crash
  recovery.

### Overwrite or rename the final path

- **ALT-009**: Write a temporary file and use an overwrite-capable rename, or
  delete a conflicting destination before retrying.
- **ALT-010**: **Rejected.** Replacement violates immutable no-clobber storage,
  creates platform-dependent behavior, and could destroy a different valid
  terminal winner or tamper evidence.

### Repair only one layer

- **ALT-011**: Change only Candidate reconciliation or only Store publication.
- **ALT-012**: **Rejected.** Either choice leaves an independently confirmed
  race that can still reject identical attempts or consume partial final-path
  state.

## Migration, rollback, and abort conditions

- **MIG-001**: A separate qualified read-only reviewer evaluates this ADR under
  the standing founder policy. PM records the exact reviewer identity, verdict,
  P0/P1 counts, evidence, and acceptance before authorizing implementation.
- **MIG-002**: PM freezes one serialized repair with the four default `PRO-008`
  paths, contract owner, implementer, reviewer, QA owner, and controller. No
  production writer starts before that ledger record.
- **MIG-003**: Capture RED from remote run `33529198551` and add focused
  deterministic tests for the stale-verified Candidate ordering and
  complete-file no-replace publication. Add phase-controlled pre-publication
  and post-publication/pre-cleanup crash tests that leave staging files behind
  and prove they cannot enter or disable lookup, list, verification, or
  receipt-addressed recovery before changing production code.
- **MIG-004**: Implement complete-file publication in `store.ts`, then strict
  durable-winner recovery in `candidates.ts`. The publication implementation
  first establishes and verifies the dedicated same-filesystem staging
  directory outside all strict namespaces. Keep canonical objects, digests,
  receipt sequence, messages, and public surface unchanged except where a
  focused test proves the accepted identical-winner success outcome.
- **MIG-005**: Run focused tests, bounded repeated process races, full External
  Intake gates, relevant dependent package gates, root gates, independent task
  review, independent QA, and replacement two-lane remote CI before PM accepts
  the repair.
- **ROL-001**: Before delivery, rollback restores only the PM-authorized four
  path candidate to its task-base blobs and preserves all unrelated work.
- **ROL-002**: After delivery, rollback is a non-force revert of the dedicated
  repair commit. No database, serialized-record, Graph, catalog, generated
  artifact, service, cloud, or deployment rollback is required.
- **ROL-003**: No data rewrite or irreversible step is authorized. Valid V1
  quarantine roots require no migration and remain byte-identical.
- **ABT-001**: Abort if implementation changes any manifest, lockfile,
  dependency, version, API version, canonical bytes/digest, public package
  export, CLI, Graph, compiler, capability, generated template, database,
  Dockerfile, Compose topology, workflow, provider, network, or deployment
  contract.
- **ABT-002**: Abort if an identical retry succeeds without full strict winner
  verification, or if a mismatched, partial, mixed-terminal, missing, malformed,
  non-regular, symlinked, or tampered path becomes retryable or accepted.
- **ABT-003**: Abort if correctness requires a production sleep, poll, timeout,
  retry count, backoff, lease, process-local mutex, overwrite, deletion of an
  existing final path, or platform-specific fallback that weakens no-clobber
  semantics.
- **ABT-004**: Abort if normal operation leaves staging files; if the staging
  directory or a staged filename is inside, enumerated by, or addressable from
  any Candidate/blob/record/receipt/index/claim/locator/recovery namespace; if
  a crash-left staging file disables lookup, list, verification, or recovery;
  or if an OS-crash test exposes a partial authoritative final path.
- **ABT-005**: Abort if supported Windows and Linux filesystems cannot prove the
  same atomic no-replace publication semantics. Return to Tech Lead governance
  rather than silently selecting a weaker primitive.

## Ownership, frozen contracts, and serialized integration

- **OWN-001**: External Intake Contract is the contract owner. PM owns ledger,
  state, paths, and implementation authorization. The implementation owner is
  the PM-assigned External Intake engineer; QA owns reproducible concurrency,
  tamper, and cleanup evidence; the controller alone owns commit and push.
- **OWN-002**: This proposal has no frontend/backend split. The V1 serialized
  Candidate, receipt, claim, index, locator, and verification-state artifacts
  are frozen enough for consumers because their bytes and meanings do not
  change; they are not open to parallel modification.
- **OWN-003**: `candidates.ts` and `store.ts` are not disjoint work. Their
  verified-winner and publication invariants jointly define one lifecycle
  transition, so production implementation remains serialized under one
  writer.
- **OWN-004**: Generated templates, shared Graph/API contracts, Compose
  topology, and end-to-end smoke tests remain serialized integration work and
  are outside this proposal. A discovered need to change any of them stops the
  task and returns to governance.
- **DEL-001**: Required order is independent ADR review -> PM acceptance record
  -> focused RED -> serialized GREEN -> focused/full verification ->
  independent task review and QA with P0/P1 `0/0` -> controller-only non-force
  delivery -> replacement remote CI -> PM reconciliation.

## TDD and measurable verification plan

- **TST-001 — Candidate RED**: Add a phase-controlled regression whose delayed
  registry completes strict sequence-1 verification, permits another registry
  to commit the exact deterministic sequence-2 conformance transition, and
  then resumes before entry reconciliation. Before the repair it must fail with
  the current strict-access error; after the repair both calls must return the
  exact same Candidate ref and conformance result.
- **TST-002 — Publication RED**: Add a focused Store regression proving that an
  identical loser never observes a zero-length or partial final managed path.
  The final path must be absent before publication and immediately have the
  full expected size, bytes, digest, and canonical form when first visible.
  Assert that staging occurs only in the dedicated verified directory and that
  this directory is outside all strict data and recovery namespaces.
- **TST-003 — Identical process GREEN**: Repeat the existing two-OS-process
  identical conformance race at least 20/20 times on Node `22.11.0` and 20/20
  times on the current supported Node 22 CI lane. Every iteration must produce
  two equal successful results, exactly one Candidate revision delta, one
  receipt delta, one conformance evidence blob, receipt sequences exactly
  `[1, 2]`, a strictly valid fresh show/verify, and zero retry delta.
- **TST-004 — Store GREEN**: Repeat an identical internal terminal commit race
  at least 20/20 times per Node lane. Both callers must return equal candidate,
  receipt, and evidence digests; the managed root must contain one authoritative
  winner and zero staging files after normal completion.
- **TST-005 — Crash isolation**: Use phase-controlled child processes to kill a
  writer (a) after complete staging but before hard-link publication and (b)
  after hard-link publication but before staging cleanup. In case (a), require
  no final path; in case (b), require the final path to contain the complete
  expected bytes, digest, and canonical form. In both cases retain the crash
  staging file while fresh store and registry instances run lookup, list,
  strict verification, current-receipt lookup, and receipt-addressed recovery.
  Every operation must ignore the staging namespace, preserve valid results,
  and create zero authoritative mutation.
- **TST-006 — Conflict oracle**: Repeat the existing mixed-process
  `blocked`/`rejected`/append-bypass oracle. Require exactly one committed
  terminal winner, all different losers rejected, no sequence 3, no loser
  Candidate/receipt/evidence/index/locator, and byte-identical winner records.
- **TST-007 — Fail-closed matrix**: Existing missing, truncated, partial,
  non-canonical, digest-mismatched, wrong-version, wrong-parent, symlink,
  non-regular, tampered artifact, tampered verification-state, tampered
  conformance-result, fabricated receipt, and unsupported-sequence tests must
  all reject with zero authoritative mutation and no raw-content output.
- **TST-008 — No timing authority**: Static review of the production diff must
  find no added `setTimeout`, sleep, retry/backoff loop, lease, mutex, overwrite
  rename, final-path deletion, or public test hook. Bounded waits remain confined
  to test process orchestration.
- **VER-001**: Run
  `pnpm --filter @factory/external-intake exec vitest run test/store.test.ts test/candidates.test.ts`.
  Require exit `0` and every `TST-*` assertion green.
- **VER-002**: Run `pnpm --filter @factory/external-intake test`,
  `pnpm --filter @factory/external-intake typecheck`,
  `pnpm --filter @factory/external-intake lint`, and
  `pnpm --filter @factory/external-intake build`. Every command must exit `0`.
- **VER-003**: Run relevant dependent Intake CLI, Graph, Capabilities, and
  Compiler test/typecheck gates selected by QA. Require no Candidate promotion,
  Graph admission, compiler admission, public-store transition export, or
  fixture/digest regression.
- **VER-004**: Run `pnpm verify:third-party`,
  `pnpm verify:source-studies`, `pnpm format:check`, `pnpm typecheck`,
  `pnpm test`, and `pnpm build` after any required Prisma generation. Every
  command must exit `0`.
- **VER-005**: Run `git diff --check` and
  `git diff --exit-code -- package.json pnpm-lock.yaml pnpm-workspace.yaml packages/external-intake/package.json packages/external-intake/src/index.ts`.
  Require no output and exit `0` for the implementation slice.
- **VER-006**: Independent task review and QA must each report specification
  compliance and P0/P1 `0/0`. QA must reproduce `TST-003` through `TST-008`
  without changing the implementation candidate.
- **VER-007**: Replacement GitHub CI must pass every configured step in both
  Node `22.11.0` and current Node `22.x` lanes at the exact delivered commit.
- **VER-008**: PM records the ADR reviewer verdict, RED witness, exact
  changed-path manifest, per-lane repetition counts, bounded digests/counts,
  staging-directory isolation, both crash-phase outcomes, normal-path staging
  cleanup, full gate exits, task review, QA, delivered commit, and replacement
  CI run ID in
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**:
  `docs/adr/adr-0008-immutable-composition-resolution-input.md`.
- **REF-005**:
  `docs/adr/adr-0024-post-v0.1-local-operability-profile.md`.
- **REF-006**:
  `docs/adr/adr-0029-generated-notification-outbox-verifier-delegate.md`.
- **REF-007**:
  `docs/superpowers/ledgers/2026-07-31-external-capability-intake.md`.
- **REF-008**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
- **REF-009**:
  `docs/superpowers/plans/2026-09-01-post-v0.1-local-restaurant-readiness.md`.
- **REF-010**: `packages/external-intake/src/candidates.ts`.
- **REF-011**: `packages/external-intake/src/store.ts`.
- **REF-012**: `packages/external-intake/test/candidates.test.ts`.
- **REF-013**: `packages/external-intake/test/store.test.ts`.
- **REF-014**: GitHub Actions run `33529198551`, job `99927705355`.
