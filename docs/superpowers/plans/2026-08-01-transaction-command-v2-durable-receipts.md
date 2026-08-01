# Transaction Command V2 and Durable Receipts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated Generic Commerce applications type-safe and correct under real PostgreSQL concurrency through immutable Transaction Command V2 packages.

**Architecture:** New `commerce.transaction@2.2.0` and `commerce.order@2.1.0` assets replace the invalid V1 command boundary for new Generic Commerce Drafts. Their generated runtime commits a durable receipt claim before its atomic aggregate/effect transaction, uses lease-token ownership and aggregate compare-and-swap, and is accepted only after generated-app and live PostgreSQL evidence.

**Tech Stack:** TypeScript, pnpm, Vitest, generated NestJS, Prisma, PostgreSQL 16, Docker Compose.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation. Generic Draft recipes may select successor locks only after Task 4's generated-project and live PostgreSQL acceptance evidence passes.
- Do not mutate `commerce.transaction@2.1.0`, `commerce.order@2.0.3`, or existing Published locks.
- The package boundary must not branch on Profile name, external URL, mutable draft, arbitrary package identity, raw AI material, or credentials.
- Generated source must pass its own strict TypeScript and Vitest gates, not only the Factory compiler test suite.
- Live tests use an isolated generated Compose project and database; never the Factory Control Plane database.
- Code, tests, UI text, comments, and documentation are English.

---

## File Structure

- `docs/adr/adr-0013-transaction-command-v2-and-durable-receipt-lease.md` — accepted successor contract.
- `packages/capabilities/assets/commerce.transaction/2.2.0/**` — Transaction V2 package, schema, migration, executor, fixture, and evidence.
- `packages/capabilities/assets/commerce.order/2.1.0/**` — Generic order V2 adapter/create/journey successor package.
- `packages/capabilities/src/assets/commerce/transaction-v2-2-0.ts` and `packages/capabilities/src/assets/commerce/order-v2-1-0.ts` — typed, immutable asset projections for successor package manifests.
- `packages/capabilities/src/assets/index.ts` — canonical package discovery used by composition and verified publication.
- `packages/capabilities/src/composition.ts` and `packages/capabilities/src/node.ts` — exact interface compatibility and verified-lock publication for successor selections.
- `packages/capabilities/src/index.ts` — fixture registration; Generic Draft successor selection is deferred until Task 4 acceptance.
- `packages/capabilities/test/capability-registry.test.ts` — package physical/digest/interface/selection verification.
- `packages/capabilities/test/commerce-transaction-profile-composition.test.ts` and `packages/capabilities/test/order-operations-profile.test.ts` — Generic Profile lock-version regressions.
- `packages/compiler/src/index.ts` — successor contribution resolution, generated runtime, Prisma store, journey projection, active schema/migration merge, and generated validation command.
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts` — focused generated-runtime and emitted-artifact regression evidence.
- `packages/compiler/test/generated-generic-order-lifecycle-v2-postgres.test.ts` — isolated generated Compose PostgreSQL acceptance evidence.
- `packages/compiler/test/profile-compilation.test.ts` and `packages/compiler/test/compilation-plan.test.ts` — lock and compiler-plan regressions.

## Task 1: Freeze successor package contracts and exact Generic lock selection

**Files:**

- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/component.json`
- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/tests/contract.json`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/component.json`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/tests/contract.json`
- Create: `packages/capabilities/src/assets/commerce/transaction-v2-2-0.ts`
- Create: `packages/capabilities/src/assets/commerce/order-v2-1-0.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/composition.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/capabilities/test/commerce-transaction-profile-composition.test.ts`
- Modify: `packages/capabilities/test/order-operations-profile.test.ts`

**Interfaces:**

- Consumes: ADR-0013 and existing `factory.capability-binding/v1` manifest rules.
- Produces: one `factory.transaction-executor/v2`, one `factory.transaction-operation-adapter/v2`, and exact direct composition locks for compiler integration tests. Existing Generic Draft recipes remain on the verified historical pair until Task 4 acceptance.

- [ ] **Step 1: Write failing successor-contract tests**

```ts
expect(resolveCapabilityAssetLock(transactionV2Lock).manifest.version).toBe(
  "2.2.0",
);
expect(resolveCapabilityAssetLock(orderV2Lock).manifest.version).toBe("2.1.0");
expect(defaultGenericRecipeLock.packages).toContainEqual(
  expect.objectContaining({
    lock: expect.objectContaining({
      key: "commerce.transaction",
      version: "2.1.0",
    }),
  }),
);
expect(() =>
  createCapabilityCompositionLock({
    graphChecksum,
    selections: mixedV1V2Selections,
  }),
).toThrow(
  "Generic order lifecycle requires one compatible Transaction V2 executor and operation adapter",
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts`

Expected: FAIL because the successor assets and their lock/interface registration do not exist.

- [ ] **Step 3: Publish only new physical successor assets and register them**

```ts
type TransactionCommandV2 = Readonly<{
  flowId: string;
  event: string;
  aggregate: Readonly<{
    entity: string;
    id: string;
    expectedVersion: number;
    expectedState: string;
  }>;
  idempotency: Readonly<{ scope: string; key: string; payloadDigest: string }>;
}>;
```

Set `commerce.transaction@2.2.0` to require
`factory.transaction-operation-adapter/v2`; set `commerce.order@2.1.0` to
provide it. Create their typed asset projections and register them through the
canonical `capabilityAssets` registry consumed by composition and verified
publication. Copy no old asset bytes in place: create new manifests and new
digest-covered source paths. Do not move Generic Draft recipes to either
successor during this task. Reject all mixed V1/V2 lifecycle lock sets in both
local composition and verified Control Plane lock publication.

- [ ] **Step 4: Run focused tests and package validation**

Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint`

Expected: PASS, including unchanged historical package digest assertions.
Retain existing Generic Profile version assertions and historical replay
checks. Add direct-composition successor assertions without changing Draft
recipe defaults.

- [ ] **Step 5: Commit**

```bash
git add packages/capabilities
git commit -m "feat: publish transaction v2 package contracts"
```

## Task 2: Implement lease-owned transaction execution and atomic Prisma CAS

**Files:**

- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/templates/api/commerce-transaction-executor.ts.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/templates/database/commerce-transaction.prisma.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/templates/database/commerce-transaction.sql.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.2.0/templates/test/commerce-transaction.journey.ts.tpl`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/templates/api/commerce-order-create-handler.ts.tpl`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/templates/api/commerce-order-transaction-operation-adapter.ts.tpl`
- Create: `packages/capabilities/assets/commerce.order/2.1.0/templates/test/commerce-order-lifecycle.journey.ts.tpl`
- Modify: `packages/capabilities/assets/commerce.transaction/2.2.0/component.json`
- Modify: `packages/capabilities/assets/commerce.transaction/2.2.0/adapter.json`
- Modify: `packages/capabilities/assets/commerce.order/2.1.0/component.json`
- Modify: `packages/capabilities/assets/commerce.order/2.1.0/adapter.json`
- Modify: `packages/capabilities/src/assets/commerce/transaction-v2-2-0.ts`
- Modify: `packages/capabilities/src/assets/commerce/order-v2-1-0.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Interfaces:**

- Consumes: the exact V2 package locks from Task 1.
- Produces: `claimReceipt`, `markReceiptRetryable`, `completeReceipt`, and `applyExpectedAggregateVersion` operations whose ownership and mutation guarantees are explicit.

The implementation must add every new template to the owning package manifest
and declarative adapter with a digest-covered declared output slot, then refresh
the typed asset projection and physical-package digest assertions. It may not
add an undeclared compiler-only fallback or mutate historical package bytes.

- [ ] **Step 1: Write failing generated-runtime tests**

```ts
await expect(secondTransition).resolves.toMatchObject({ kind: "in-progress" });
await expect(replayedTransition).resolves.toMatchObject({ replayed: true });
await expect(changedPayloadTransition).rejects.toThrow(
  "idempotency payload mismatch",
);
await expect(staleOwner.completeReceipt()).rejects.toThrow("lease ownership");
```

Include an assertion that `flowId === "ecommerce-order"` and `event === "submit"` coexist in the emitted command; they must not occupy the same property.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts`

Expected: FAIL because current emitted command, receipt state, and Prisma adapter are V1.

- [ ] **Step 3: Implement the durable receipt protocol and V2 operation adapter**

```ts
type ReceiptClaimV2 =
  | Readonly<{
      kind: "claimed";
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
    }>
  | Readonly<{
      kind: "completed";
      receiptId: string;
      outcome: TransactionOutcomeV2;
    }>
  | Readonly<{ kind: "in-progress"; receiptId: string; retryAfterMs: number }>
  | Readonly<{ kind: "payload-mismatch"; receiptId: string }>;
```

Commit an initial claim before entering the business transaction. Execute the
aggregate CAS, stock effects, audit, outbox, and token-bound completion inside
one transaction. On business failure, roll back effects and issue a
token-bound retryable release outside that transaction. Use Prisma `updateMany`
with ID, expected version, and expected status predicates; exactly one updated
row is required for success.

- [ ] **Step 4: Emit matching Prisma schema and migration**

Create the receipt unique key, `leaseExpiresAt`, `leaseEpoch`, `leaseToken`,
terminal outcome, receipt lookup index, and aggregate entity/ID/version index
in both outputs. Add a compiler parity assertion that rejects a selected V2
schema fragment whose named indexes are missing from the active migration.

- [ ] **Step 5: Run focused compiler tests**

Run: `pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint`

Expected: PASS for three Generic Profiles, replay, active claim, stale version,
retryable failure, expired takeover, and no central transition bypass.

- [ ] **Step 6: Commit**

```bash
git add packages/capabilities packages/compiler
git commit -m "feat: execute generic transactions with durable leases"
```

## Task 2.5: Reissue the PostgreSQL-safe Transaction V2 package

**Files:**

- Create: `packages/capabilities/assets/commerce.transaction/2.2.1/**`
- Create: `packages/capabilities/src/assets/commerce/transaction-v2-2-1.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/composition.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- Modify: `docs/project-status.md`

**Interfaces:**

- Consumes: Task 2 package pair and ADR-0014.
- Produces: an immutable, direct-composable `commerce.transaction@2.2.1`
  successor paired with `commerce.order@2.1.0`; a fail-closed revocation rule
  for the physical 2.2.0 package; and package-level PostgreSQL name validation.

- [ ] **Step 1: Write failing revocation and PostgreSQL-name tests**

```ts
expect(() =>
  createCapabilityCompositionLock({
    graphChecksum,
    selections: directV2Selections({ transactionVersion: "2.2.0" }),
  }),
).toThrow("commerce.transaction@2.2.0 is revoked: PostgreSQL index identifier exceeds 63 bytes");

expect(resolveCapabilityAssetLock(transactionV2_2_1Lock).manifest.version).toBe(
  "2.2.1",
);
expect(postgresIndexNames(emittedSchema)).toSatisfyAll((name) =>
  Buffer.byteLength(name, "ascii") <= 63,
);
```

- [ ] **Step 2: Run the focused package/compiler tests and verify RED**

Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts && pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts`

Expected: FAIL because 2.2.1 is absent, 2.2.0 remains selectable, and no
package-level PostgreSQL identifier validation exists.

- [ ] **Step 3: Publish the immutable successor and revoke selection of 2.2.0**

Copy only Factory-owned 2.2.0 package source into a new 2.2.1 root, replace
the receipt aggregate index map name in both schema and SQL with the same
explicit ASCII identifier no longer than 63 bytes, and refresh all
manifest/contribution/projection digests. Register 2.2.1 as the direct V2
transaction asset. Retain 2.2.0 physical bytes for audit but make local
composition and verified lock publication reject it before it can compile.
Direct V2 tests select 2.2.1 with `commerce.order@2.1.0`; default recipes and
historical assets remain unchanged.

- [ ] **Step 4: Verify static schema/migration parity and safe PostgreSQL names**

Validate every explicit `map:` identifier emitted by the V2 schema and SQL:
schema/migration names match, are ASCII, and are at most 63 bytes. The exact
successor’s source, component, adapter, and typed projection digests must all
agree. Do not move this check into a compiler rewrite.

- [ ] **Step 5: Run focused tests and commit**

Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts && pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/compiler lint && git diff --check`

Expected: PASS. Record the P1012 root cause and corrected successor/revocation
in factual project status. Commit:

```bash
git add packages/capabilities packages/compiler docs/project-status.md
git commit -m "fix: reissue postgres-safe transaction package"
```

## Task 3: Derive generated journeys from locks and validate emitted projects

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Interfaces:**

- Consumes: `TransactionCommandV2`, exact selected `orderEntity` and `orderFlow` bindings.
- Produces: a generated create payload with no server-owned values, correctly bound transition options, and a clean generated-project typecheck/test command.

- [ ] **Step 1: Write failing emitted-artifact tests**

```ts
expect(files["api/test/generated-journey.test.ts"]).not.toContain('"status"');
expect(files["api/test/generated-journey.test.ts"]).not.toContain('"version"');
expect(files["api/test/generated-journey.test.ts"]).toContain(
  "expectedVersion: 0",
);
expect(files["api/test/generated-journey.test.ts"]).toContain(
  "generated-submit-1",
);
```

Run the generated API's `typecheck` and `test` scripts for `simple-ecommerce`,
`retail-counter`, and `grocery-pickup` from newly written directories.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts profile-compilation.test.ts`

Expected: FAIL because current journey generation includes server fields and
recognizes only an entity named `order`.

- [ ] **Step 3: Make journey derivation binding-owned**

Use the selected successor package binding to identify its order entity and
flow. Exclude `id`, `status`, and `version` from create payloads whenever the
locked create handler owns them. Add expected-version/idempotency options for
every locked V2 transition regardless of entity name.

- [ ] **Step 4: Add generated project command validation**

Write the emitted API files, install only the generated package's locked local
dependencies, then run `pnpm typecheck` and `pnpm test` in a clean temporary
directory. Fail the compiler test if strict generated TypeScript or its
journey suite fails.

- [ ] **Step 5: Run focused tests and broader compiler suite**

Run: `pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts profile-compilation.test.ts compilation-plan.test.ts && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint`

Expected: PASS; all three Generic Profiles produce their own type-safe,
lock-bound journey.

- [ ] **Step 6: Commit**

```bash
git add packages/compiler
git commit -m "test: validate generated generic commerce projects"
```

## Task 4: Prove the successor against live generated PostgreSQL

**Files:**

- Create: `packages/compiler/test/generated-generic-order-lifecycle-v2-postgres.test.ts`
- Modify: `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- Modify: `packages/compiler/package.json` only if an isolated live-test script is required.
- Modify: `docs/project-status.md`

**Interfaces:**

- Consumes: generated Generic Compose bundles and V2 Prisma receipt/aggregate schema.
- Produces: reproducible live PostgreSQL evidence for the command ownership and failure semantics defined by ADR-0013.

- [ ] **Step 1: Write the live test harness and a failing two-client case**

```ts
const [first, second] = await Promise.allSettled([
  clientA.transition(commandA),
  clientB.transition(commandB),
]);
expect(
  [first, second].filter((result) => result.status === "fulfilled"),
).toHaveLength(1);
expect(await readAggregate()).toMatchObject({
  version: 1,
  status: "submitted",
});
```

Use a unique Compose project name and ports for each test run. Start only the
generated database/API needed by the test and tear it down with volumes in a
`finally` block.

- [ ] **Step 2: Run the live test and verify RED before the complete implementation**

Run: `pnpm --filter @factory/compiler test -- generated-generic-order-lifecycle-v2-postgres.test.ts`

Expected: FAIL before Task 2's CAS/lease implementation; the failure must
demonstrate concurrent success, missing active claim visibility, or schema
absence rather than a skipped test.

- [ ] **Step 3: Implement only the harness support required for deterministic live evidence**

The test must prove: same-key completed replay; same-key active
`in-progress`; changed digest rejection; exactly one competing expected-version
transition; expired-lease takeover; stale lease-owner rejection; and full
rollback of aggregate, inventory, audit, outbox, and terminal receipt effects.
Use two independent Prisma clients or two HTTP clients connected to the
generated API/database.

- [ ] **Step 4: Run live and regression gates**

Run: `pnpm --filter @factory/compiler test -- generated-generic-order-lifecycle-v2-postgres.test.ts generic-order-lifecycle-v2.test.ts && pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/compiler lint`

Expected: PASS with no skipped live PostgreSQL cases, no leaked Compose
project/volume, and unchanged historical package checks.

- [ ] **Step 5: Record only safe, reproducible evidence and commit**

Document commands, generated profile names, pass/fail behavior, and cleanup
proof. Do not record connection strings, ports, raw request payloads, prompts,
or credentials.

- [ ] **Step 6: Activate successors only after all live evidence passes**

Update the three uncompiled Generic Draft recipe locks to
`commerce.transaction@2.2.0` and `commerce.order@2.1.0`. Add a regression
that compiles each newly composed Draft into a Published Graph bundle before
the recipe can be enabled. Historical locks and Restaurant remain unchanged.

```bash
git add packages/compiler packages/capabilities docs/project-status.md
git commit -m "test: prove generic transactions against postgres"
```

## Task 5: Independent quality gates and readiness update

**Files:**

- Modify: `docs/project-status.md`
- Modify: `docs/superpowers/ledgers/2026-08-01-generic-order-lifecycle-operations.md` if it exists in the tracked worktree; otherwise update the tracked task status record referenced by its current ledger.

**Interfaces:**

- Consumes: all task evidence and immutable successor locks.
- Produces: an accurate readiness statement; it must not claim Restaurant's independent typed migration or external candidate promotion is complete.

- [ ] **Step 1: Run a clean generated-output audit**

Run: `git diff --check && pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm --filter @factory/capabilities build && pnpm --filter @factory/compiler build`

Expected: PASS. Separately inspect the generated output directories to confirm
no raw external source, URL, credential, or AI material is emitted.

- [ ] **Step 2: Request independent review**

Ask a read-only reviewer to inspect the exact successor assets, compiler path,
generated typecheck/journey proof, and live PostgreSQL evidence. P0/P1 issues
return the task to implementation; P2 issues are fixed before readiness is
advanced.

- [ ] **Step 3: Update factual status only after review passes**

State the three accepted Generic Profile names, successor versions, generated
project typecheck evidence, and live PostgreSQL evidence. Keep Restaurant
typed runtime migration and Candidate-to-package execution explicitly pending.

- [ ] **Step 4: Commit**

```bash
git add docs/project-status.md docs/superpowers/ledgers
git commit -m "docs: record transaction v2 acceptance evidence"
```

## Plan Self-Review

- ADR-0013 decisions map to Tasks 1 through 4: immutable successors, V2 command separation, durable lease, CAS, schema/migration parity, binding-owned journey projection, generated typecheck, and live PostgreSQL evidence.
- The plan does not authorize external source copying, Provider activation, Golden promotion of external Candidates, Restaurant runtime substitution, mutable Draft compilation, or secrets in evidence.
- Task 5 prevents a passing compiler unit suite from being misrepresented as generated-application acceptance.
- Task 1 deliberately registers but does not activate successor package locks;
  Task 4 owns activation after the required generated and live evidence.
