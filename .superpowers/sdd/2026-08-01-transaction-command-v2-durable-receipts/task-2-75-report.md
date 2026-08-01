# Task 2.75 Report: Bound-Flow Order V2 Successor

## Status and commit

Task 2.75 is complete within the integration boundary at governance base
commit `45420dc` and is ready for task review.

- Commit message: `fix: bind order events to published flows`.
- The exact report-bearing commit SHA is recorded in the parent-agent handoff
  because a commit cannot contain its own hash.
- No dependency, transaction asset, default Draft recipe, historical lock,
  Restaurant package, Application Graph, or external state changed.

## Root cause and remediation

Immutable `commerce.order@2.1.0` hard-codes four operation events even though
its exact `orderFlow` binding declares additional Retail Counter and Grocery
Pickup events. The physical 2.1.0 package remains unchanged and resolvable for
audit evidence, while every new selection fails before local composition,
verified publication, or compiler contribution resolution with:

```text
commerce.order@2.1.0 is revoked: fixed event vocabulary excludes bound Flow events
```

Factory now registers immutable `commerce.order@2.1.1`. Its package-owned
operation adapter is a factory that accepts a non-empty, unique list of at
most 128 declared Flow event names. It validates every entry as an exact,
non-blank string, freezes a defensive copy, and admits an API event only by
membership in that frozen list. API requests cannot supply or override an
allowlist. The factory does not inspect Profile names and does not translate
`pay`, `fulfil`, or any other declared event.

For direct V2 compilation, the compiler resolves the exact Published
`orderFlow` Graph symbol and exact bound `orderEntity`. It requires exactly one
matching Flow, matching Flow/entity identity, and non-empty unique ordered
events. The generated runtime constructs the package factory with only that
ordered list. Existing Flow state, role, and effect validation remains first;
the original event then crosses the package boundary for membership validation
and command construction.

## Exact changed paths

- `packages/capabilities/assets/commerce.order/2.1.1/adapter.json`
- `packages/capabilities/assets/commerce.order/2.1.1/component.json`
- `packages/capabilities/assets/commerce.order/2.1.1/fixtures/default.json`
- `packages/capabilities/assets/commerce.order/2.1.1/templates/api/commerce-order-create-handler.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.1/templates/api/commerce-order-transaction-operation-adapter.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.1/templates/test/commerce-order-lifecycle.journey.ts.tpl`
- `packages/capabilities/assets/commerce.order/2.1.1/tests/contract.json`
- `packages/capabilities/src/assets/commerce/order-v2-1-1.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/src/composition.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- `docs/project-status.md`
- `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-2-75-report.md`

`git diff -- packages/capabilities/assets/commerce.order/2.1.0` is empty. No
path outside the Task 2.75 ledger allowlist changed. `packages/capabilities/src/node.ts`
did not require modification because it already applies composition
selectability before verified publication.

## Factory and compiler boundary

- The package factory validates and freezes the compiler-provided ordered
  event list, owns request membership validation, and constructs the
  Transaction Command V2 operation.
- The API boundary retains its six package-owned request fields; an
  `allowedEvents` field or any other caller-provided list is rejected.
- The compiler derives the factory input only from the exact Published
  `orderFlow` lock binding. Missing or malformed symbols, multiple or missing
  Flow matches, entity mismatch, empty events, and duplicates fail closed.
- Generated transition code first resolves and validates the declared Flow
  transition, role, and effects. It passes the original event unchanged to the
  package adapter afterward.
- The existing state-aware transition lookup remains only for durable replay
  of an already completed idempotent command; it does not supply or widen the
  bound event list.

## Exact generated event lists

The compiler regressions assert these ordered factory inputs:

- Simple Ecommerce: `['submit', 'pay', 'fulfil', 'cancel']`
- Retail Counter: `['submit', 'pay', 'issue-receipt', 'cancel']`
- Grocery Pickup: `['submit', 'pay', 'pick', 'ready', 'handoff', 'cancel']`

The emitted source contains no `pay` to `confirm` or `fulfil` to `fulfill`
translation. Unbound events are rejected by the package factory even when
otherwise shaped as valid operation input.

## Lock and version compatibility

- Direct Generic V2 accepts exactly `commerce.transaction@2.2.1` with
  `commerce.order@2.1.1`.
- `commerce.order@2.1.0` is physically retained but revoked before local
  composition, verified publication, and compiler canonical lock resolution.
- `commerce.transaction@2.2.0` remains revoked by its existing PostgreSQL
  identifier guard.
- Every mixed Generic V1/V2 Transaction/Order pair fails closed.
- Default and historical Generic Draft locks remain
  `commerce.transaction@2.1.0` plus `commerce.order@2.0.3` for all three
  Generic profiles. Restaurant remains unchanged.
- The direct pair is not active or accepted in this task.

## RED evidence

After adding the focused Capabilities regressions:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

Observed RED: 5 failed in an 87-test file. The failures proved that the
registry still contained 54 assets, 2.1.1 was unresolved, 2.1.0 was not
revoked, and the selectable V2 interface contained no valid direct pair.

After switching the direct compiler fixture and adding the bound-Flow
regressions:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

Observed RED: 20 failed, 0 passed because the 2.1.1 asset did not yet exist.
The new cases covered the exact three Profile event lists, factory list
validation and defensive freezing, caller-allowlist rejection, unbound event
rejection, Flow entity mismatch, empty and duplicate events, early 2.1.0
revocation, and absence of central event translation.

During GREEN verification, the compiler initially loaded the package's ignored
stale `dist` output and could not see 2.1.1. `pnpm --filter
@factory/capabilities build` refreshed that local dependency artifact; no
ignored or generated file is included in this commit.

## Fresh GREEN and required verification

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

PASS: 87/87 tests, exit 0.

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

PASS: 20/20 tests, exit 0. This includes all three exact bound event lists,
package factory validation, early revoked-lock rejection, Flow binding
fail-closed cases, durable replay, stale version handling, active lease
contention, expired takeover, stale-owner rejection, aggregate CAS, and atomic
rollback.

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

PASS: exit 0 with no whitespace errors.

## Digest and physical-package parity

Successor declared digests, matched by component, adapter, typed projection,
and physical bytes:

- manifest: `sha256:c35159b0459dc74443ae19d5fa2ef2813bf177cd379b0e7101e56bfe1cda1fc1`
- create handler: `sha256:14f8d5f58ef89945dbb32d80035e1c673bdea57225710f0fa5d2059a142eab1b`
- operation-adapter factory: `sha256:d4d818637d8b19eb2658d83a933c61c29ae03457dae688db5dfd23dc09cc1fcc`
- journey: `sha256:6131de967f863c7576b385d833ecb0ed0ae61b1b48c3f97d534d7858e4cbfb8e`
- fixture: `sha256:f70c44f81a20009155019eb9b6097208baafcdbeeb67aba8a0de763128e498fb`
- contract record: `sha256:b7509e39c22090c8f97de5a9530a760604a18d5c2ad2c870978e6b90824dac2f`

Audit hashes for successor metadata/projection files are:

- adapter JSON: `sha256:2051c983eb64e91b5bb0c16044862b1029acc50f7424d1c6d42c8aef6c2a2901`
- component JSON: `sha256:5097d6dfaefe43b163d12e4496b8e38d0055568c73c1d133a185837068c9b256`
- typed projection: `sha256:3d40b1b5210a1c7713cc7367338fdf4c836a9355a66fb6f2f38aa42b3e255ff2`

The focused package test verifies canonical typed-projection/component parity,
component/adapter contribution parity, declared manifest digest, and every
physical source/evidence digest. The fixture and create handler are
byte-identical to 2.1.0; the successor changes only version/root/manifest
metadata, the adapter factory and journey use, and the contract evidence.

## Acceptance-criterion status

- Immutable 2.1.0 bytes and stable early revocation: PASS.
- Complete immutable 2.1.1 assets and typed projection: PASS.
- Component, adapter, source, evidence, manifest, and projection digest parity:
  PASS.
- Non-empty, unique, bounded, defensive-frozen package factory list: PASS.
- API membership validation without caller allowlist: PASS.
- Exact Published Flow/entity resolution with ordered unique events: PASS.
- Flow-first validation and unchanged original event at package boundary: PASS.
- No Profile branch, event translation, or event-list fallback: PASS.
- Exact 2.2.1/2.1.1 direct composition and mixed-pair rejection: PASS.
- Historical/default Generic and Restaurant locks unchanged: PASS.
- Project status remains factual and does not claim activation/acceptance:
  PASS.

## Residual Task 3 and Task 4 risks

- Task 3 must rerun generated-project validation for Simple Ecommerce, Retail
  Counter, and Grocery Pickup, including emitted project typecheck/build and
  journey execution. Focused compiler tests are not a substitute for that
  generated-project evidence.
- Task 4 retains live PostgreSQL two-client acceptance for receipt visibility,
  same-key replay/in-progress/mismatch behavior, competing CAS commands,
  expired takeover, stale-owner rejection, and atomic rollback.
- Task 4 also retains default Generic Draft activation after all acceptance
  evidence. The 2.2.1/2.1.1 pair is only direct-composable here.

No model call, credential, raw prompt/response, network access, dependency
installation, release, deployment, purchase, or external mutation occurred.
