# Task 2.76 Report — DONE

## Outcome

Published the immutable `commerce.order@2.1.2` package and typed projection.
The successor preserves the exact non-empty, unique, bounded Published
`orderFlow` event projection introduced by 2.1.1, rejects undeclared events,
and constructs an explicitly typed
`TransactionOperationAdapterV2<CommerceOrderTransactionRequestV2,
CommerceOrderTransactionContextV2, OrderTransitionReceipt>` value before
freezing it. `createStore` explicitly types
`CommerceOrderTransactionContextV2` and `TransactionDependenciesV2`;
`present` explicitly types `TransactionResultV2` and
`CommerceOrderTransactionContextV2`.

`commerce.order@2.1.1` is preserved byte-for-byte but revoked before local
composition, verified publication, and compiler contribution resolution with:

```text
commerce.order@2.1.1 is revoked: generated strict TypeScript reports implicit any
```

The only direct Generic V2 pair is now `commerce.transaction@2.2.1` with
`commerce.order@2.1.2`. Historical/default locks, Restaurant, and all
transaction assets remain unchanged. No default was activated and no live
PostgreSQL command ran.

## Implementation commit

- `9345095` — `fix: reissue strict typesafe order adapter`

The report-only commit containing this file is returned in the handoff because
a commit cannot embed its own final hash.

## Changed paths

- `packages/capabilities/assets/commerce.order/2.1.2/adapter.json`
- `packages/capabilities/assets/commerce.order/2.1.2/component.json`
- `packages/capabilities/assets/commerce.order/2.1.2/fixtures/default.json`
- `packages/capabilities/assets/commerce.order/2.1.2/templates/api/commerce-order-create-handler.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.2/templates/api/commerce-order-transaction-operation-adapter.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.2/templates/test/commerce-order-lifecycle.journey.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.2/tests/contract.json`
- `packages/capabilities/src/assets/commerce/order-v2-1-2.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/src/composition.ts`
- `packages/capabilities/src/node.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- `docs/project-status.md`
- `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-2-76-report.md`

The pre-existing modification to
`docs/superpowers/plans/2026-08-01-transaction-command-v2-durable-receipts.md`
and pre-existing untracked
`docs/adr/adr-0016-reissue-strict-typesafe-order-adapter.md` were preserved and
excluded from the implementation commit.

## Digest evidence

- Manifest: `sha256:967f6311b4c94234773ee7090e538a5dd6795bb3cc7338b8fd738228e9bd78ce`
- Typed adapter contribution: `sha256:008b068d728f78a34e4562aaa025d81df64a9bd115c129f72f96f54340c1ac89`
- Create contribution: `sha256:14f8d5f58ef89945dbb32d80035e1c673bdea57225710f0fa5d2059a142eab1b`
- Journey contribution: `sha256:6131de967f863c7576b385d833ecb0ed0ae61b1b48c3f97d534d7858e4cbfb8e`
- Fixture evidence: `sha256:f70c44f81a20009155019eb9b6097208baafcdbeeb67aba8a0de763128e498fb`
- Contract evidence: `sha256:be8bdb1605c48ae4c9d102f7b05a3291ae12fd9d76328a0396ee9b2319e01ef7`

`verifyCapabilityAssetDigest`, physical component/adapter parity, contribution
digests, fixture digest, contract digest, and verified publication all pass in
the focused capability registry suite.

## RED evidence

Command:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts -t "emits an order adapter that passes its generated API strict TypeScript boundary"
```

Result before production changes: FAIL, 1 failed / 21 skipped. The emitted
immutable 2.1.1 source produced exactly:

```text
TS7006 Parameter '_context' implicitly has an 'any' type.
TS7006 Parameter 'dependencies' implicitly has an 'any' type.
TS7006 Parameter 'context' implicitly has an 'any' type.
```

The diagnostics pointed to 2.1.1 `createStore(_context, dependencies)` and
`present(result: TransactionResultV2, context)`.

Command:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts -t "strict-TypeScript-unsafe Order V2"
```

Result before revocation: FAIL because 2.1.1 remained selectable. A later
focused fail-first addition also proved verified publication resolved a stale
2.1.1 digest before returning the required revocation reason.

Command:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts -t "resolves and directly composes the bound-Flow V2 successor pair"
```

Result before registration: FAIL with `expected undefined to be defined`
because 2.1.2 was absent.

Command:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts -t "passes the generated adapter package's own strict TypeScript command"
```

Result before adding the generated package script: FAIL, exit 1, because
`typecheck` was not declared.

## GREEN and verification evidence

Command:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

Result: PASS, 88/88 tests. This includes 2.1.1 fail-fast revocation, 2.1.2
digest/package verification, exact 2.2.1/2.1.2 composition, and unchanged
default/Restaurant locks.

Command:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

Result: PASS, 24/24 tests. The generated adapter strict compiler regression
passes, and the materialised generated adapter package runs its own
`pnpm typecheck` with exit 0. Ecommerce retains
`submit | pay | fulfil | cancel`; Retail retains
`submit | pay | issue-receipt | cancel`; Grocery retains
`submit | pay | pick | ready | handoff | cancel`. Invalid/duplicate/bounded
factory event lists, caller mutation, caller allowlists, and undeclared events
remain rejected.

Commands:

```text
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
```

Result: both PASS, exit 0.

Commands:

```text
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint
```

Result: both PASS; all checked files match Prettier formatting.

Commands:

```text
git diff --check
git diff --exit-code HEAD -- packages/capabilities/assets/commerce.order/2.1.1 packages/capabilities/src/assets/commerce/order-v2-1-1.ts packages/capabilities/assets/commerce.transaction
```

Result: both PASS with no output before the implementation commit. This proves
no working-tree byte changes to immutable order 2.1.1, its typed projection, or
any transaction package.

The local compiler test imports the built capabilities package, so this
no-network bridge command was run after registering 2.1.2:

```text
pnpm --filter @factory/capabilities build
```

Result: PASS, exit 0. Generated `dist` output is ignored and was not committed.

## Acceptance criteria

1. PASS — successor/revocation and strict generated adapter regressions were
   written and observed failing first; the pre-successor failure was the three
   required TS7006 diagnostics from 2.1.1.
2. PASS — 2.1.2 passes strict emitted-source validation and its generated
   adapter package's own command, rejects undeclared events, and retains exact
   Flow-derived event projections for all three Generic profiles.
3. PASS — focused capability/compiler tests, both package typechecks, both
   package lints, and `git diff --check` pass.

## Residual risk and downstream gates

- The focused generated-package command intentionally materialises the emitted
  adapter, its emitted V2 executor dependency, and the generated package's own
  strict configuration. Full generated API Prisma generation, compiler-owned
  array-contract repairs, and complete generated journeys remain Task 3.
- Live PostgreSQL acceptance and default successor activation remain Task 4.
- No network access, credential, raw AI data, live database, release,
  deployment, or external state was used or changed.
