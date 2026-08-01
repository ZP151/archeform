# Task 4 — Live Generated PostgreSQL Evidence and Successor Activation

Date: 2026-08-01

Ledger state: `implementing`

Specialization: `integration`

Contract owner: PM/controller

Contract status: ADR-0013 through ADR-0016 accepted; Task 3 accepted; Task 4
amendments 1 and 2 recorded in the task brief and plan.

Implementation commit: `67ed906` (`test: prove generic transactions against
postgres`).

## Outcome

The exact direct pair `commerce.transaction@2.2.1` and
`commerce.order@2.1.2` passed generated-project and isolated live PostgreSQL
acceptance for Simple Ecommerce, Retail Counter, and Grocery Pickup. Only after
that evidence was green, newly composed Drafts for those three Profiles were
activated on the successor locks and proved publishable/compilable. Existing
Published Graphs, saved historical locks, Restaurant, and revoked successor
assets were not changed.

The live suite starts a uniquely named Compose project for each case, starts
only the generated PostgreSQL service, applies the generated migration, builds
the generated API, and executes the generated runtime with two independent
Prisma clients where concurrency is required. Every case executes Compose
teardown with volumes in a `finally` path and asserts zero project-labelled
containers, volumes, and networks before returning.

## Changed product paths

- `docs/project-status.md`
- `packages/capabilities/src/index.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/capabilities/test/commerce-transaction-profile-composition.test.ts`
- `packages/capabilities/test/order-operations-profile.test.ts`
- `packages/compiler/test/commerce-transaction-runtime.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `packages/compiler/test/generated-generic-order-lifecycle-v2-postgres.test.ts`
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- `packages/compiler/test/order-operations-runtime.test.ts`
- `packages/compiler/test/profile-compilation.test.ts`

The controller-owned plan modification was deliberately excluded from the
implementation commit. No compiler production source, capability manifest,
package version, generated output, dependency manifest, or lockfile changed.

## Test-driven evidence

### Live database RED and GREEN

Task 2 already supplied the intended CAS implementation, so the concurrency
regression was proven RED with a controlled temporary mutation of only the
materialised generated copy: the aggregate CAS predicate was reduced to the
record id. The focused two-client case then observed two fulfilled commands,
aggregate version 2, stock 18, four audit/outbox effects, and two completed
receipts instead of one winner. The mutation was removed; no package or
compiler source was changed.

- RED command:
  `pnpm --filter @factory/compiler test -- generated-generic-order-lifecycle-v2-postgres.test.ts`
- GREEN command: the same focused command.
- GREEN result: 10/10 live PostgreSQL tests passed with no skipped case.

The final live cases prove:

- each Profile's exact Published Flow event vocabulary, with no event alias;
- full rollback of aggregate, inventory, audit, outbox, and terminal receipt
  effects, leaving only a retryable receipt;
- stale-owner complete and release rejection after lease replacement;
- atomic expired-lease takeover;
- changed-digest rejection;
- active same-key `in-progress` visibility;
- completed replay without duplicated committed effects; and
- exactly one winner for two independent clients competing on the same
  expected aggregate version.

### Default activation RED and GREEN

After the live suite passed, focused capability tests were changed to require
the successor defaults. Before activation they failed on five assertions:
expected order 2.1.2 / transaction 2.2.1 but received order 2.0.3 /
transaction 2.1.0. The three fresh-Draft compiler cases likewise failed before
activation on the old versions.

- Focused capabilities command:
  `pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts order-operations-profile.test.ts`
- GREEN result: 20/20 passed.
- Focused fresh-Draft compiler command:
  `pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts`
  with the newly-composed-Draft case filter.
- GREEN result: all three Profiles selected 2.1.2/2.2.1 and compiled from a
  newly created immutable composition lock.

### Amendment 2 regression alignment

The first complete compiler run after activation surfaced eleven stale tests
in four newly authorised files. Investigation classified every failure before
editing: seven asserted V1/default versions, aliases, or an entity-bound
executor shape; four supplied invalid current-V2 fixtures and were rejected by
the direct-pair bound-Flow preflight. None was an intentionally historical
lock case.

The amended tests now assert the V2 adapter factory and exact `pay`/`fulfil`
receipts, the direct-pair fail-closed message, a generic executor plus
Graph-bound Flow/entity adapter, current default versions, earlier bound-Flow
negative preflight, and valid current-V2 commerce fixtures. Historical replay
tests remain unchanged.

- Focused command:
  `pnpm --filter @factory/compiler test -- order-operations-runtime.test.ts commerce-transaction-runtime.test.ts profile-compilation.test.ts compilation-plan.test.ts`
- RED result before alignment: 11 failures across the four files.
- GREEN result: 76/76 passed across four files.

## Fresh final verification

- `pnpm --filter @factory/compiler test -- generated-generic-order-lifecycle-v2-postgres.test.ts generic-order-lifecycle-v2.test.ts`:
  exit 0; 43/43 tests passed across two files, including 10/10 live cases.
- `pnpm --filter @factory/capabilities test`:
  exit 0; 307/307 tests passed across 18 files.
- `pnpm --filter @factory/compiler test`:
  exit 0; 245/245 tests passed across 12 files, including all live cases.
- `pnpm --filter @factory/capabilities typecheck`: exit 0.
- `pnpm --filter @factory/compiler typecheck`: exit 0.
- `pnpm --filter @factory/capabilities lint`: exit 0.
- `pnpm --filter @factory/compiler lint`: exit 0.
- `git diff --check`: exit 0.
- Explicit post-suite prefix audit: zero `factory-live-*` containers, volumes,
  and networks remained.

No connection string, allocated port, request body, credential, Docker log,
raw model prompt, or raw model response is recorded in this evidence.

## Acceptance-criterion status

- Exact generated direct pair exercised against live PostgreSQL: satisfied.
- Two independent clients and one-winner aggregate CAS: satisfied.
- Three exact Profile vocabularies without aliases: satisfied.
- Replay, in-progress, mismatch, takeover, stale-owner, and rollback semantics:
  satisfied.
- Per-case finally teardown and zero-resource assertion: satisfied.
- Successor default activation only after live GREEN: satisfied.
- Newly composed Draft publish/compile evidence for all three Profiles:
  satisfied.
- Existing Published/saved historical locks, Restaurant, and revoked assets
  unchanged: satisfied.
- Required package tests, typechecks, lints, and diff check: satisfied.

## Remaining risks

- The live harness was verified on the assigned Windows workspace with its
  locally cached PostgreSQL image and installed workspace dependencies. Other
  CI hosts still require a functioning Docker/Compose installation and the
  same dependency availability; the test intentionally performs no network
  acquisition.
- This report hands Task 4 to independent task review only. It does not mark
  the task reviewed, QA-accepted, released, or deployed.
