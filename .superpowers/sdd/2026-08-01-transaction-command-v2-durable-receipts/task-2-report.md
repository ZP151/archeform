# Task 2 Report: Lease-owned Transaction Execution and Atomic Prisma CAS

## Status and commits

Task 2 implementation is complete within the assigned integration boundary.

- Implementation commit: `29225b3` (`feat: execute generic transactions with durable leases`).
- The report-only hand-off commit is recorded in the final parent-agent hand-off.
- Ledger-declared base commit: `07808e7`.
- Actual implementation parent: `f5d1d99`.
- Generic Draft defaults remain on `commerce.order@2.0.3` and
  `commerce.transaction@2.1.0`; the successor pair is direct-composable only.

## Exact changed paths

Implementation commit `29225b3` changes exactly:

- `packages/capabilities/assets/commerce.order/2.1.0/adapter.json`
- `packages/capabilities/assets/commerce.order/2.1.0/component.json`
- `packages/capabilities/assets/commerce.order/2.1.0/templates/api/commerce-order-create-handler.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.0/templates/api/commerce-order-transaction-operation-adapter.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.0/templates/test/commerce-order-lifecycle.journey.ts.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.0/adapter.json`
- `packages/capabilities/assets/commerce.transaction/2.2.0/component.json`
- `packages/capabilities/assets/commerce.transaction/2.2.0/templates/api/commerce-transaction-executor.ts.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.0/templates/database/commerce-transaction.prisma.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.0/templates/database/commerce-transaction.sql.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.0/templates/test/commerce-transaction.journey.ts.tpl`
- `packages/capabilities/src/assets/commerce/order-v2-1-0.ts`
- `packages/capabilities/src/assets/commerce/transaction-v2-2-0.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts`

This report adds only:

- `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-2-report.md`

No historical package, profile recipe/default selection, Published lock, task
ledger, or path outside the Task 2 allowlist changed.

## RED evidence

After extending the focused test and refreshing the already-changed Task 1
Capabilities build output so the compiler test could resolve the successor
registry, the command was:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

Observed result before implementation:

```text
Test Files  1 failed (1)
Tests       13 failed (13)
Error: Commerce compilation does not support locked commerce.transaction@2.2.0.
Exit status 1.
```

All 13 cases reached the intended unsupported-successor compiler boundary.
The earlier test-harness import attempt was discarded as invalid RED evidence
because it failed before exercising product behavior.

## GREEN evidence

Focused compiler command:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

Fresh result:

```text
Test Files  1 passed (1)
Tests       13 passed (13)
Exit status 0.
```

The suite proves direct lock selection for all three Generic graphs, command
Flow/event separation, active-lease `in-progress`, completed replay, changed
payload rejection, expired takeover, stale-owner rejection, stale aggregate
conflict, rollback/retry, package-owned adapter execution, Prisma CAS shape,
and schema/migration index parity.

Focused package command:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

Fresh result: PASS, 74/74 tests. This includes physical package, manifest,
adapter, source digest, target, output slot, evidence digest, direct successor
composition, mixed-version rejection, and default-activation guard evidence.

Supplemental historical-default command:

```text
pnpm --filter @factory/compiler test -- profile-compilation.test.ts
```

Result: PASS, 20/20 tests. Current Generic Drafts and Restaurant still compile
through their historical lock selections.

## Command, receipt, and CAS invariants proven

- The generated `TransactionCommandV2` has exactly top-level `flowId`,
  `event`, `aggregate`, and `idempotency`; the Simple Ecommerce adapter emits
  `flowId === "ecommerce-order"` and `event === "submit"` simultaneously.
- The exact locked executor validates the Flow; the exact locked order
  operation adapter validates the event and constructs the command. The V2
  order path obtains its store through the package adapter and does not apply a
  central order transition mutation afterward.
- A receipt claim is created before the business transaction. A matching
  completed receipt replays its stored outcome, a mismatched digest rejects,
  and an unexpired active owner returns bounded `in-progress` without entering
  the business mutation.
- Retryable or expired receipts reclaim only by rotating an opaque token and
  incrementing the lease epoch. Completion and retryable release match receipt
  ID, claimed state, token, and epoch; stale owners reject with `lease
  ownership`.
- Aggregate CAS, inventory effects, audit, outbox, and receipt completion run
  inside one business transaction. On failure those effects roll back, then a
  separate token-bound release marks the durable claim retryable.
- Generated Prisma persistence uses exactly one `updateMany` constrained by
  aggregate `id`, `version`, and `status`, increments the version in that same
  statement, and accepts only `count === 1`.
- The compiler recognizes both historical Generic V1 contributions and the
  direct-composable successor V2 pair by exact package version and exact target
  runtime interface version. No Profile-name branch or fallback template was
  added.

## Template manifest and digest evidence

`commerce.transaction@2.2.0` declares and physically verifies:

- executor: `sha256:9e7f4146ebc1045810ee7acc20e82024493df4553a19f5f1556e515868d8dfef`
- Prisma schema: `sha256:a272f4d45d759d6f5d7c64d2dbd88183317b8549c09e609daa2cf2f0d185f2ca`
- SQL migration: `sha256:1a7a7bb2034c6afbe2b5ca1f89f525c724b3e58bf3e637d1546b4361c4cb20d4`
- journey: `sha256:ec16b2f1bf7ab3a889b948137608b2db8f71d650968cb9a03efbcdda0c935d5c`
- manifest: `sha256:ef753be70a7751ec4919cca7dd55118a208ec38b95703ec85e2a1994e7e565fe`

`commerce.order@2.1.0` declares and physically verifies:

- create handler: `sha256:14f8d5f58ef89945dbb32d80035e1c673bdea57225710f0fa5d2059a142eab1b`
- V2 operation adapter: `sha256:b522e47a9b38866bb9339b5205050bd80c07b3e65838fd7df21aa1e7a101953d`
- journey: `sha256:91400ed48f14d74e0f6671c41ab144fc53d083ea7f4c347af9cb13c8813583f5`
- manifest: `sha256:f4eb93a5d11961333c9665c7c3ba614101679bff9366360628dd2b3840b35a97`

The Prisma fragment and migration both contain the receipt unique key,
`leaseExpiresAt`, `leaseEpoch`, `leaseToken`, terminal outcome, receipt lookup
index, receipt aggregate index, and aggregate entity/ID/version index. The
compiler fails closed if any of the three named V2 indexes is absent from
either active output.

## Exact required verification

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

PASS: 74/74.

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

PASS: 13/13.

```text
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
```

PASS: both TypeScript commands exited 0.

```text
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint
```

PASS: both Prettier checks reported all matched files formatted.

```text
git diff --check
```

PASS: exit status 0 with no whitespace errors.

## Acceptance-criterion status

- Exact V2 command boundary: PASS.
- Direct successor composition without default activation: PASS.
- Durable claim/replay/mismatch/in-progress protocol: PASS.
- Expired takeover with token rotation and epoch increment: PASS.
- Token-bound completion/release and stale-owner rejection: PASS.
- Business rollback followed by retryable release: PASS.
- Atomic ID/version/status Prisma CAS with exactly-one-row success: PASS.
- Matching schema/migration lease, outcome, unique, and index assets: PASS.
- Component/adapter/typed-projection/source-digest parity: PASS.
- Historical/default lock behavior unchanged: PASS.
- No Draft input, Profile-name branch, external URL, credential, raw prompt,
  raw response, or compiler-only hidden template: PASS.

## Residual risks deliberately deferred

- Task 3 owns emitted-project strict TypeScript and generated journey execution
  from a clean generated directory; Task 2 proves compiler integration and
  runtime behavior through focused generated-module tests only.
- Task 4 owns live PostgreSQL two-client evidence for unique-claim visibility,
  concurrent competing commands, takeover, stale-owner rejection, atomic
  rollback, and schema/migration deployment.
- Task 4 also owns activating the successor locks in Generic Draft defaults
  only after that live proof. This task deliberately leaves defaults unchanged.
- No real model call, external release, deployment, purchase, or network-side
  mutation was performed.

## Fix round 1: preserve the public in-progress receipt union

Review found that the package adapter returned a runtime `kind` discriminator
and retry delay, but the generated application runtime erased both fields from
its exported `OrderTransitionReceipt`. The focused test also hid this mismatch
behind a handwritten stronger receipt interface. Commit `1f6997c` fixes both
issues without changing any Generic Draft default or historical package.

### Exact changed paths

- `packages/capabilities/assets/commerce.order/2.1.0/adapter.json`
- `packages/capabilities/assets/commerce.order/2.1.0/component.json`
- `packages/capabilities/assets/commerce.order/2.1.0/templates/api/commerce-order-transaction-operation-adapter.ts.tpl`
- `packages/capabilities/src/assets/commerce/order-v2-1-0.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts`

The adapter now exports a discriminated `OrderTransitionReceipt` union. Its
`in-progress` branch requires `retryAfterMs: number`; its `completed` branch
does not expose that property. The durable generated runtime aliases and
exports the package-owned type. The historical compiler branch retains its
existing receipt declaration, preserving the direct-lock activation gate.

### RED evidence

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

Observed before the production fix: FAIL, 1 failed and 13 passed. The generated
TypeScript consumer reported `TS2339` for missing `kind`, `TS2339` for missing
`retryAfterMs`, and `TS2322` because extracting the `in-progress` branch
produced `never`. An earlier `TS2307` virtual-module resolution failure was
corrected in the test harness and was not accepted as product RED evidence.

### GREEN and regression evidence

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

PASS: 14/14. The new consumer imports the generated declaration directly and
proves the discriminator, required in-progress retry delay, and absence of a
completed retry-delay field. Existing execution, replay, mismatch, lease,
takeover, stale-owner, CAS, rollback, and direct-lock cases remain green.

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

PASS: 74/74, including source, component, adapter, and typed-projection digest
parity. The refreshed order adapter digest is
`sha256:b522e47a9b38866bb9339b5205050bd80c07b3e65838fd7df21aa1e7a101953d`;
the refreshed order manifest digest is
`sha256:f4eb93a5d11961333c9665c7c3ba614101679bff9366360628dd2b3840b35a97`.

```text
pnpm --filter @factory/compiler test -- profile-compilation.test.ts
```

PASS: 20/20. Historical/default profile compilation remains unchanged.

```text
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint
git diff --check
```

PASS: both typechecks exited 0, both lint commands reported all matched files
formatted, and the whitespace check exited 0.

### Fix acceptance status and remaining risk

- Public completed/in-progress discriminated union: PASS.
- `retryAfterMs` required only for `kind: "in-progress"`: PASS.
- Generated declaration tested without a handwritten stronger cast: PASS.
- Durable behavior and default activation gate retained: PASS.
- Report ancestry corrected to actual implementation parent `f5d1d99`: PASS.

Residual integration risks remain assigned to Tasks 3 and 4 as documented
above; this review fix does not expand their generated-project or live
PostgreSQL proof boundaries.
