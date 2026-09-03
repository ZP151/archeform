---
title: "ADR-0029: Generated Notification Outbox Verifier Delegate"
status: "Accepted"
date: "2026-09-01"
authors: "Archeform Tech Lead"
tags: ["architecture", "compiler", "prisma", "verification", "operability"]
supersedes: ""
superseded_by: ""
amends_if_accepted: "ADR-0028 VER-006 and active Task 3 verification scope only"
---

# ADR-0029: Generated Notification Outbox Verifier Delegate

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** only the generated-notification-outbox verifier's
two database-count accesses from the obsolete Prisma delegate
`notificationOutbox` to the emitted and typed delegate
`factory_NotificationOutbox`.

**Accepted on 2026-09-01** by the founder's explicit ADR-0029 decision. The
same founder message requires a separate qualified agent to review Tech Lead
ADRs and establishes the standing independent-review authorization recorded in
`docs/tech-governance.md`. ADR-0029 implementation remains serialized until
that independent review reports it eligible with P0/P1 `0/0`.

Independent reviewer `/root/review_adr_0029` returned
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, specification compliant, and P0/P1/P2
`0/0/0` on 2026-09-01. PM may therefore authorize the exact focused repair.

- **GAT-001**: The founder explicitly accepted ADR-0029. This recorded decision
  resolves the founder gate but does not replace PM authorization, independent
  ADR review, implementation review, QA, or controller delivery.
- **GAT-002**: Future ADRs use the exact standing independent-review policy in
  `docs/tech-governance.md`; plan prose or inferred intent still cannot approve
  a decision.
- **GAT-003**: This proposal stops at the decision record. It authorizes no
  source edit, test edit, plan or ledger edit, commit, push, CI run, repository
  release, Product Publish, cloud resource, or deployment.
- **GAT-004**: Accepted ADR-0027 and ADR-0028 remain authority for the format
  baseline. If accepted, ADR-0029 amends only the disposition of ADR-0028
  `VER-006`: the verifier must be corrected and rerun without adding either
  verifier or compiler implementation paths to the 58-path format-baseline
  diff.

## Context and reproduced evidence

- **CTX-001**: Task 3's current implementation diff contains exactly 58 paths:
  `.prettierignore` plus the 57 paths frozen by accepted ADR-0028. It does not
  modify `scripts/verify-generated-notification-outbox.mjs` or
  `packages/compiler/src/index.ts`.
- **CTX-002**: After the Task 3 byte-integrity repair, the root format gate,
  direct JSON and copied-source integrity checks, third-party and source-study
  gates, focused Graph/capability/compiler checks, Control Plane Prisma
  generation, root typecheck, root test, root build, `git diff --check`, and
  unchanged manifest/lockfile/workflow checks pass. The remaining Task 3 gate
  is `pnpm verify:generated-notification-outbox`.
- **CTX-003**: The compiler emits the Prisma model exactly as
  `model Factory_NotificationOutbox` in
  `packages/compiler/src/index.ts`. Prisma therefore exposes the generated
  client delegate as `factory_NotificationOutbox`; the emitted
  `PrismaRecordStore` already accesses that exact delegate through its typed
  `notificationOutboxDelegate()` method.
- **CTX-004**: The verifier injects `outbox-runtime-proof.ts` into the generated
  API and directly accesses `prisma.notificationOutbox.count(...)` at the two
  count sites corresponding to `pendingBeforeDrain` and `rollbackOutbox`.
  That property does not exist on the generated Prisma client.
- **CTX-005**: The generated Compose API build fails closed during TypeScript
  compilation with `TS2339` at both injected count sites. The failure occurs
  before the runtime proof, drain, safe-failure assertion, or success summary
  can run. It is a verifier typecheck failure, not evidence of changed outbox
  persistence or transaction behavior.
- **CTX-006**: Git history explains the mismatch. The verifier's two
  `notificationOutbox` accesses were introduced at commit `8a9a602b`; commit
  `7cfd9a76` later migrated compiler-owned storage to the `Factory_` namespace,
  changing the schema model and emitted store delegate to
  `Factory_NotificationOutbox` / `factory_NotificationOutbox` without changing
  those proof-only accesses.
- **CTX-007**: Historical acceptance evidence reports the verifier green before
  the compiler storage-prefix migration. That history does not make the
  current typed mismatch acceptable and does not justify reversing the stable
  compiler-owned storage namespace.

## Current accepted Golden technology profile

- **CUR-001**: Node remains supported at `>=22.11.0 <23`; local selection is
  exactly `22.11.0`; tracked and generated application images retain the
  floating-major `node:22-alpine` tag.
- **CUR-002**: `packageManager` remains exactly `pnpm@9.0.0`, `engines.pnpm`
  remains `>=9`, and `pnpm-lock.yaml` remains the exact root dependency
  authority.
- **CUR-003**: The accepted root package coordinates remain TypeScript
  `^5.7.2` / `5.9.3`; Puck `^0.22.3` / `0.22.3`; XYFlow `^12.3.6` /
  `12.11.2`; Next.js `^15.1.0` / `15.5.22`; React and React DOM `^19.0.0` /
  `19.2.8`; NestJS Common/Core/Platform Express `^10.4.15` / `10.4.22`;
  Prisma Client and CLI `^6.1.0` / `6.19.3`; BullMQ `^5.34.10` / `5.81.2`;
  and compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: The generated API manifest retains `@prisma/client ^6.19.0`,
  `prisma ^6.19.0`, TypeScript `^5.7.0`, and `pnpm@9.0.0`; this proposal does
  not add a generated lockfile or claim an exact generated-container resolution
  that the generated artifact does not carry.
- **CUR-005**: PostgreSQL remains `postgres:16-alpine`, Redis remains
  `redis:7-alpine`, and both the platform and generated Compose topologies
  remain unchanged. These and `node:22-alpine` are floating-major tags, not
  exact patch or digest pins.
- **CUR-006**: Mutable Draft -> immutable Published Revision -> immutable
  Compilation remains unchanged. Compilers never consume a mutable Draft.
- **CUR-007**: Application Graph V1/V2/V3, Product Recipe V1/V2, Snapshot
  V1/V2, API, data, lifecycle, compiler target, generated runtime, capability,
  provider, adapter, security, and deployment contracts remain unchanged.
- **CUR-008**: The accepted compiler-owned persistence namespace is
  `Factory_*`; the notification outbox Prisma model/delegate pair is exactly
  `Factory_NotificationOutbox` / `factory_NotificationOutbox`.

## Proposed verifier profile

This proposed profile is distinct from, and does not replace, the current
accepted Golden technology profile above.

- **PRO-001**: Keep every `CUR-*` coordinate and every generated runtime,
  compiler, Graph, lifecycle, data, security, and Compose contract unchanged.
- **PRO-002**: In only
  `scripts/verify-generated-notification-outbox.mjs`, replace the two obsolete
  `prisma.notificationOutbox.count(...)` proof accesses with the exact typed
  `prisma.factory_NotificationOutbox.count(...)` delegate emitted from
  `Factory_NotificationOutbox`.
- **PRO-003**: Preserve both existing query predicates and all bounded outcome
  assertions: one pending row before drain, zero outbox rows after the forced
  transaction rollback, one delivered row after drain, and fixed safe failure
  output without connection diagnostics.
- **PRO-004**: Add no alias, compatibility shim, raw SQL, `any` cast, dynamic
  property lookup, fallback delegate, compiler-template edit, Prisma schema
  edit, migration edit, package change, lockfile change, or Compose change.
- **PRO-005**: The existing failing
  `pnpm verify:generated-notification-outbox` command is the required behavioral
  characterization RED. If PM and the implementation owner determine a
  smaller no-Docker failing characterization test is practical without
  exporting production-only internals or duplicating the compiler contract,
  PM may additionally authorize one focused verifier test; otherwise the
  existing generated Compose proof is sufficient RED/GREEN evidence.
- **PRO-006**: Implement this correction as a separate serialized verifier
  repair after the 58-path Task 3 candidate is frozen. Do not fold the verifier
  source change into the format-baseline implementation diff.

## Decision

- **DEC-001 — Migrate**: Align the proof-only Prisma delegate accesses with the
  already accepted and emitted `Factory_NotificationOutbox` model. The
  compiler-generated contract is the authority; the verifier follows it.
- **DEC-002 — Preserve typed failure**: Use the generated client's exact typed
  delegate. Do not suppress `TS2339`, cast around the error, or introduce a
  compatibility alias for the obsolete property.
- **DEC-003 — Preserve runtime proof semantics**: Change only delegate naming.
  Transaction boundaries, store behavior, outbox row states, drain behavior,
  bounded summaries, secret-safe failure handling, and teardown remain exact.
- **DEC-004 — Separate delivery slices**: ADR-0029 does not enlarge ADR-0028's
  58-path baseline. PM records a focused verifier-repair task or ordered fix
  round before Task 3 can use the corrected verifier as acceptance evidence.
- **DEC-005 — No release or deployment authority**: Acceptance would authorize
  at most PM reconciliation, a focused verifier correction, proportionate RED/
  GREEN evidence, independent review, and controller delivery. It grants no
  main integration, repository release, Product Publish, external resource,
  provider call, cloud action, or deployment.

## API, data, adapter, catalog, license, and supply-chain effects

- **API-001**: No route, request/response, event, Graph, schema, serialization,
  identifier, compatibility, authentication, or actor contract changes.
- **DAT-001**: No Prisma model, SQL table/index, migration, durable row shape,
  seed, retention, or conversion changes. The corrected proof reads the same
  physical `Factory_NotificationOutbox` rows already used by the generated
  store.
- **ADP-001**: No editor, AI, Git, compiler, runtime-provider, queue, database,
  or deployment adapter changes. Only a repository verifier consumes a
  different generated-client property name.
- **CAT-001**: No capability asset, version, binding, manifest, evidence digest,
  lock, registry key, compiler target, generated file, or catalog admission
  effect. In particular, `core.notification`, `notification.outbox/v1`, and
  `core.audit@1.0.2` remain unchanged.
- **COM-001**: Existing generated applications and persisted databases require
  no migration. This correction is backward-compatible with the current
  accepted generated schema because it targets the existing namespaced model;
  it does not add support for obsolete unnamespaced generated artifacts.
- **LIC-001**: No dependency, copied source, upstream coordinate, license,
  notice, or source-study record changes.
- **SUP-001**: No package, action, image, service, cache, network source, or
  supply-chain authority is added.

## Security and operability effects

- **SEC-001**: The proof continues to query only count-bounded outbox state and
  emit a fixed bounded summary. It must not print database URLs, credentials,
  raw rows, request bodies, prompts, provider responses, or connection
  diagnostics.
- **SEC-002**: Keeping the compiler-owned `Factory_` namespace preserves the
  separation between Factory infrastructure storage and graph-defined domain
  entities. Reversing or aliasing the model would weaken that explicit
  ownership boundary.
- **SEC-003**: The generated Compose proof remains local-only, isolated by a
  unique project name, loopback-bound through the generated topology, and
  deterministically torn down with volumes and orphans removed. Docker-socket
  access remains privileged local infrastructure and gains no production
  authority.
- **OPS-001**: The maintained verifier can again reach its intended runtime
  assertions instead of failing at generated API typecheck. A green verifier
  then provides evidence for atomic enqueue/update rollback, drain delivery,
  safe failure output, and cleanup against the current generated artifact.
- **OPS-002**: The change couples the proof explicitly to the accepted Prisma
  delegate spelling. A future model rename must update the generated store and
  verifier together under the applicable governance gate.

## Consequences

### Positive

- **POS-001**: Restores the exact generated-runtime acceptance proof without
  changing the runtime being proved.
- **POS-002**: Retains strict TypeScript/Prisma detection of future schema and
  verifier drift.
- **POS-003**: Keeps Task 3's formatting candidate isolated and its accepted
  58-path manifest auditable.
- **POS-004**: Preserves the compiler-owned storage namespace and all
  transaction, security, and cleanup assertions.

### Negative

- **NEG-001**: Requires a separate governance decision, PM reconciliation,
  focused delivery, review, and rerun before Task 3 can become accepted.
- **NEG-002**: The verifier remains coupled to an exact generated Prisma
  delegate spelling by design.
- **NEG-003**: The full RED/GREEN proof builds and runs isolated Docker Compose
  resources and is slower than a unit test.
- **NEG-004**: This repair does not retrospectively validate historical
  generated artifacts that used the unnamespaced model.

## Alternatives considered

### Keep the failing verifier unchanged

- **ALT-001**: Leave `prisma.notificationOutbox` in place and waive or defer
  ADR-0028 `VER-006`.
- **ALT-002**: **Rejected.** The command is a required maintained acceptance
  gate and currently cannot reach any runtime assertion.

### Revert the generated schema to an unnamespaced model

- **ALT-003**: Rename `Factory_NotificationOutbox` back to
  `NotificationOutbox` and restore the `notificationOutbox` delegate.
- **ALT-004**: **Rejected.** This would change a stable generated schema,
  migration, data identity, compiler-owned namespace, and compatibility
  boundary merely to accommodate stale proof code.

### Add a compatibility alias or untyped access

- **ALT-005**: Cast Prisma to `any`, use dynamic lookup, add an alias, or try
  both delegate names at runtime.
- **ALT-006**: **Rejected.** It defeats the compile-time drift signal, adds
  compatibility behavior for an obsolete generated contract, and can mask a
  real schema mismatch.

### Query the table through raw SQL

- **ALT-007**: Replace the two typed counts with raw SQL against
  `Factory_NotificationOutbox`.
- **ALT-008**: **Rejected.** It bypasses the generated client, expands query and
  injection review surface, and proves less of the intended Prisma-generated
  runtime contract.

## Migration, rollback, and abort conditions

- **MIG-001**: After explicit founder acceptance, PM records ADR-0029 in the
  active ledger and plan, names the focused task owner, and freezes the default
  implementation path to
  `scripts/verify-generated-notification-outbox.mjs`. Any optional focused test
  path requires explicit PM ownership before writing.
- **MIG-002**: Capture RED with the current verifier, including `TS2339` at both
  count sites and confirmation that generated model/store names are
  `Factory_NotificationOutbox` / `factory_NotificationOutbox`.
- **MIG-003**: Change only the two count delegates. Preserve their `where`
  predicates and every other proof, error-classification, safe-output, and
  teardown statement byte-for-byte except formatter-required layout in the
  same authorized file.
- **MIG-004**: Run focused static/source assertions, exact Prettier and diff
  gates, then the generated Compose verifier. Run the accepted Task 3 integrity
  and full repository gates before independent review and controller delivery.
- **ROL-001**: Before delivery, rollback restores only the PM-authorized
  verifier/test candidate to its pre-task blob; preserve the 58-path Task 3
  candidate and all unrelated work.
- **ROL-002**: After delivery, rollback is a non-force revert of the dedicated
  verifier-repair commit. A rollback makes ADR-0028 `VER-006` red again and
  therefore re-blocks Task 3 acceptance.
- **ROL-003**: No database, Graph, generated artifact, service, release, cloud,
  or deployment rollback exists because none changes. No irreversible step is
  authorized beyond retained CI/verification logs containing bounded safe
  evidence.
- **ABT-001**: Abort if implementation changes
  `packages/compiler/src/index.ts`, any generated template or output, Prisma
  schema/migration, Graph/API/data/capability contract, package manifest,
  lockfile, Dockerfile, Compose topology, workflow, dependency, or version.
- **ABT-002**: Abort if either query predicate, runtime assertion, safe-failure
  regex, bounded output, unique Compose identity, teardown, or cleanup behavior
  changes.
- **ABT-003**: Abort if the verifier passes through a cast, alias, dynamic
  fallback, raw SQL, expectation weakening, skipped Docker proof, or ignored
  failure instead of the exact typed delegate correction.
- **ABT-004**: Abort if Task 3's 58-path formatting manifest changes, if either
  verifier/compiler source is attributed to formatting, or if any accepted
  ADR-0027/ADR-0028 integrity gate regresses.

## Ownership, frozen contracts, and serialized integration

- **OWN-001**: Compiler/integration owns the generated notification outbox
  verifier contract. PM owns plan, ledger, task state, allowed paths, and
  implementation authorization. QA owns reproducible evidence. The controller
  alone owns commit, push, and integration mutations.
- **OWN-002**: This proposal contains no frontend/backend feature split. The
  existing versioned Graph/API/data contract is frozen enough for disjoint
  consumers, but not for modification; no shared-contract writer is
  authorized.
- **OWN-003**: Because this proof generates templates, starts the generated
  Compose topology, and exercises an end-to-end smoke boundary, its correction
  and evidence remain serialized integration work. It must not run as a
  parallel writer with Task 3 or any generated-template/shared-contract change.
- **OWN-004**: A discovered need to change a generated template, schema,
  migration, delegate contract, or Compose topology stops this task and returns
  it to Tech Lead governance with a new proposed ADR.
- **DEL-001**: Required order is founder decision -> PM reconciliation -> RED ->
  focused correction -> focused and full GREEN -> independent review with
  P0/P1 `0/0` -> controller-only non-force delivery -> replacement CI evidence
  -> PM task-state reconciliation.

## TDD and measurable verification plan

- **TST-001 — RED**: Run
  `pnpm verify:generated-notification-outbox` before the correction. It must
  fail during generated API typecheck with `TS2339` for
  `notificationOutbox` at exactly two proof sites, while cleanup removes the
  unique temporary Compose project and directory.
- **TST-002 — Static contract**: Assert the generated bundle contains exactly
  `model Factory_NotificationOutbox` and its Prisma store contains exactly the
  `factory_NotificationOutbox` delegate. Assert the verifier preimage contains
  exactly two `prisma.notificationOutbox.count` accesses.
- **TST-003 — GREEN**: After the focused change, assert zero obsolete accesses
  and exactly two `prisma.factory_NotificationOutbox.count` accesses. Run the
  same verifier; it must exit `0` and emit only the bounded summary with
  `pendingBeforeDrain: 1`, `delivered: 1`, `enqueueCompleted: true`,
  `domainUpdateCompleted: true`, `rollbackOutbox: 0`, and `safeFailure: true`.
- **VER-001**: Run
  `pnpm exec prettier --check scripts/verify-generated-notification-outbox.mjs`
  and any separately PM-authorized focused test. Run `git diff --check`.
- **VER-002**: Run `pnpm --filter @factory/graph typecheck`,
  `pnpm --filter @factory/graph test`,
  `pnpm --filter @factory/capabilities typecheck`,
  `pnpm --filter @factory/capabilities test`,
  `pnpm --filter @factory/compiler typecheck`, and
  `pnpm --filter @factory/compiler test`. Every command must exit `0` without
  fixture, snapshot, digest, manifest, lock, or generated-output changes.
- **VER-003**: Run `pnpm verify:generated-notification-outbox`. Require exit
  `0`, exact bounded outcomes from `TST-003`, safe failed-drain output exactly
  `{"status":"failed"}`, and no credential, connection, Prisma, or raw-row
  diagnostic in that failure output.
- **VER-004**: Run `pnpm verify:third-party`,
  `pnpm verify:source-studies`, and the accepted ADR-0028 direct byte-integrity
  checks. Every command/check must pass.
- **VER-005**: Run
  `pnpm --filter @factory/control-plane prisma:generate`, then
  `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Every
  command must exit `0`.
- **VER-006**: Run
  `git diff --exit-code -- package.json pnpm-lock.yaml .github/workflows/ci.yml packages/compiler/src/index.ts infra/docker-compose.yml`
  for the verifier-repair slice. Require no output and exit `0`.
- **VER-007**: Inspect `docker compose ls --format json` before and after the
  proof and require no run-owned project, container, network, or volume remains.
  Record only bounded names/counts; do not record environment values.
- **VER-008**: Independent review must report specification compliance and
  P0/P1 `0/0`. PM records RED/GREEN exit codes, exact changed-path manifest,
  bounded runtime summary, cleanup result, review verdict, delivered commit,
  and replacement CI run ID in the active ledger.

## References

- **REF-001**: `AGENTS.md`.
- **REF-002**: `docs/tech-governance.md`.
- **REF-003**: `docs/threat-model.md`.
- **REF-004**: `docs/adr/adr-0027-repository-format-baseline.md`.
- **REF-005**: `docs/adr/adr-0028-format-baseline-byte-integrity.md`.
- **REF-006**:
  `docs/superpowers/plans/2026-09-01-post-v0.1-local-restaurant-readiness.md`.
- **REF-007**:
  `docs/superpowers/ledgers/2026-08-31-post-v0.1-local-restaurant-readiness.md`.
- **REF-008**:
  `.superpowers/sdd/2026-09-01-post-v0.1-local-restaurant-readiness/task-3-report.md`.
- **REF-009**: `scripts/verify-generated-notification-outbox.mjs`.
- **REF-010**: `packages/compiler/src/index.ts`.
- **REF-011**: `docs/acceptance/durable-notification-outbox.md`.
