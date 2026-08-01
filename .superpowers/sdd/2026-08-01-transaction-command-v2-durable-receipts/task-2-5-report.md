# Task 2.5 Report: PostgreSQL-safe Transaction V2 Successor

## Status and commit

Task 2.5 is complete within the amended integration boundary at governance
commit `06b1009`.

- Commit message: `fix: reissue postgres-safe transaction package`.
- The exact report-bearing commit SHA is recorded in the final parent-agent
  handoff because a commit cannot contain its own hash.
- No dependency, default Draft recipe, historical lock, Restaurant package,
  Application Graph, compiler schema rewrite, Profile branch, fallback, or
  external state changed.

## Root cause and remediation

Generated Simple Ecommerce, Retail Counter, and Grocery Pickup projects failed
Prisma P1012 before client generation because immutable
`commerce.transaction@2.2.0` declares this explicit index name in both its
Prisma schema and SQL migration:

```text
CommerceTransactionReceipt_aggregateType_aggregateId_aggregateVersion_idx
```

Direct ASCII and UTF-8 measurement is **73 bytes**. The brief and ADR describe
it as 70 bytes, but the exact checked-in identifier measures 73; either value
exceeds PostgreSQL's 63-byte maximum. The 2.2.0 package remains byte-for-byte
unchanged and resolvable for diagnostic audit replay, while its exact lock now
fails before local composition, verified publication, or compiler contribution
resolution with:

```text
commerce.transaction@2.2.0 is revoked: PostgreSQL index identifier exceeds 63 bytes
```

The controlled Factory-owned successor `commerce.transaction@2.2.1` retains
the V2 executor, interfaces, slots, fixture, contract record, and journey, but
uses this identical explicit name in schema and SQL:

```text
ctx_receipt_aggregate_v_idx
```

It is ASCII and **27 bytes**. Package verification extracts every explicit V2
Prisma `@@index(..., map: "...")` and SQL `CREATE INDEX` name, requires equal
sorted name sets, rejects non-ASCII names, and rejects names over 63 UTF-8
bytes. The compiler retains its schema/migration parity check with the new
package-owned identifier; it performs no name rewrite or truncation.

## Exact changed paths

- `packages/capabilities/assets/commerce.transaction/2.2.1/adapter.json`
- `packages/capabilities/assets/commerce.transaction/2.2.1/component.json`
- `packages/capabilities/assets/commerce.transaction/2.2.1/fixtures/default.json`
- `packages/capabilities/assets/commerce.transaction/2.2.1/templates/api/commerce-transaction-executor.ts.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.1/templates/database/commerce-transaction.prisma.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.1/templates/database/commerce-transaction.sql.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.1/templates/test/commerce-transaction.journey.ts.tpl`
- `packages/capabilities/assets/commerce.transaction/2.2.1/tests/contract.json`
- `packages/capabilities/src/assets/commerce/transaction-v2-2-1.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/src/composition.ts`
- `packages/capabilities/src/node.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/generic-order-lifecycle-v2.test.ts`
- `docs/project-status.md`
- `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-2-5-report.md`

`git diff -- packages/capabilities/assets/commerce.transaction/2.2.0` is empty.
No path outside the amended ledger changed.

## Selection and dispatch behavior

- Exact asset resolution retains physical 2.2.0 for audit replay.
- Local composition and verified publication reject exact 2.2.0 selection
  with the stable revocation message.
- Direct Generic V2 composition accepts only
  `commerce.transaction@2.2.1` plus `commerce.order@2.1.0`.
- Mixed Transaction/Order V1/V2 pairs continue to fail closed.
- Compiler V2 dispatch now recognizes only transaction 2.2.1 with order 2.1.0
  and rejects 2.2.0 before lock canonicalization can mask the revocation or
  contribution loading can read the defective package.
- Generic default Draft locks remain transaction 2.1.0 and order 2.0.3 for all
  three Generic profiles. Restaurant remains unchanged.

## RED evidence

Focused Capabilities command after adding the tests and correcting the
synthetic adapter fixture:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

Observed RED: 5 failed, 74 passed. The failures proved that 2.2.0 returned the
old compatibility error instead of the revocation, 2.2.1 was absent, and the
package verifier accepted schema/SQL name drift, a non-ASCII name, and a
64-byte name.

After the required Capabilities RED, the direct compiler test was switched to
2.2.1. The amended compiler revocation regression and direct suite produced:

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

Observed RED: 15 failed, 0 passed. Revoked 2.2.0 was masked as a composition
lock mismatch, while 2.2.1 failed exact V2 dispatch. A subsequent minimal
dispatch run exposed the old index name in the existing compiler parity list;
that literal was updated to the package-owned 2.2.1 name without changing
emission behavior.

## Fresh GREEN and required verification

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
```

PASS: 79/79 tests, exit 0.

```text
pnpm --filter @factory/compiler test -- generic-order-lifecycle-v2.test.ts
```

PASS: 15/15 tests, exit 0. This includes early revoked-lock rejection, all
three direct profiles, receipt replay/mismatch/in-progress behavior, expired
takeover, stale-owner rejection, aggregate CAS, rollback, package adapter
binding, and emitted schema/migration parity.

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

- manifest: `sha256:b7067d65ff4b7b5f5d4d42b48022aac8a96cd90a56079f0a205cad04db665b66`
- executor: `sha256:9e7f4146ebc1045810ee7acc20e82024493df4553a19f5f1556e515868d8dfef`
- Prisma schema: `sha256:0b438c33a96405914b692c3cc2d4ffb3b34f4883568fc377bd9d9f1021f83e5f`
- SQL migration: `sha256:06b77f0e9cdb890062335a86232dd7460eb359c6dccb9534516ee72ebcfbe6f5`
- journey: `sha256:ec16b2f1bf7ab3a889b948137608b2db8f71d650968cb9a03efbcdda0c935d5c`
- fixture: `sha256:8518b5427ba2844f12aff73a8a9f201d84fd524670087b530881a832c7382cef`
- contract record: `sha256:3341948c4b06f011ee45d125cb0efb5003753505da0676c42c6c51564d048be0`

Audit hashes for the successor metadata/projection files are:

- adapter JSON: `sha256:255366b78ae08c51348dc1d70e5aba66e0910109f78badf83745f763a035e9ec`
- component JSON: `sha256:54fe4d85f826c8d040725ee1bd4fc9be9d85953892efc75fbe4f99f9184eb607`
- typed projection: `sha256:7399e5c0dc211bef7968769da9e4eb4ed0378c5c145c90aa4f89e41a7e61227f`

The focused package test verifies canonical typed-projection/component parity,
component/adapter contribution parity, declared manifest digest, and every
physical source/evidence digest.

The successor fixture, executor, journey, and contract record are byte-identical
to 2.2.0. Only component version/root/manifest metadata, adapter/component
schema and migration digests, and the two database sources differ.

The immutable 2.2.0 SHA-256 baseline remains:

- adapter: `ccba2d5f14819a68482307d19f04af94792d25e7f72b1989250b3df701d0fb46`
- component: `7d9acaf1acfc77622a473a2345ef2801a5566d9bf4aa220ef30796457f4f1908`
- fixture: `8518b5427ba2844f12aff73a8a9f201d84fd524670087b530881a832c7382cef`
- executor: `9e7f4146ebc1045810ee7acc20e82024493df4553a19f5f1556e515868d8dfef`
- Prisma schema: `a272f4d45d759d6f5d7c64d2dbd88183317b8549c09e609daa2cf2f0d185f2ca`
- SQL migration: `1a7a7bb2034c6afbe2b5ca1f89f525c724b3e58bf3e637d1546b4361c4cb20d4`
- journey: `ec16b2f1bf7ab3a889b948137608b2db8f71d650968cb9a03efbcdda0c935d5c`
- contract record: `3341948c4b06f011ee45d125cb0efb5003753505da0676c42c6c51564d048be0`

## Acceptance-criterion status

- Immutable 2.2.0 diagnostic bytes: PASS.
- Stable fail-closed 2.2.0 composition/publication/compiler rejection: PASS.
- Complete immutable 2.2.1 controlled successor: PASS.
- Matching 27-byte ASCII schema/SQL index name: PASS.
- Component, adapter, source, evidence, manifest, and typed projection digests:
  PASS.
- Exact 2.2.1 resolution and direct 2.2.1/2.1.0 composition: PASS.
- Mixed pair rejection and historical/default/Restaurant locks: PASS.
- Package-level schema/SQL equality, ASCII, and 63-byte validation: PASS.
- Exact compiler dispatch without fallback, Profile branch, or rewrite: PASS.
- Project status remains factual and does not claim activation/acceptance: PASS.

## Residual Task 3 and Task 4 risks

- Task 3 must resume generated-project validation for all three Generic
  profiles, including clean Prisma generation, strict generated TypeScript,
  and emitted journey execution. This task's focused compiler suite is not a
  substitute for that generated-project evidence.
- Task 4 retains live PostgreSQL two-client acceptance for claim visibility,
  same-key replay/in-progress/mismatch behavior, competing CAS commands,
  expired takeover, stale-owner rejection, and atomic rollback.
- Task 4 also retains default Generic Draft activation after all acceptance
  evidence. The 2.2.1 successor is direct-composable but is not active or
  accepted here.
- The 70-byte wording in ADR-0014/task briefing should be reconciled with the
  measured 73-byte identifier in a future governance-only correction; it does
  not change the defect, fix, or 63-byte acceptance boundary.

No model call, credential, raw prompt/response, network access, dependency
installation, release, deployment, purchase, or external mutation occurred.
