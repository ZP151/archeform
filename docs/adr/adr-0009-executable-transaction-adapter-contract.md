---
title: "ADR-0009: Executable Transaction Adapter Contract"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "compiler", "commerce", "transactions"]
supersedes: ""
superseded_by: ""
---

# ADR-0009: Executable Transaction Adapter Contract

## Status

**Accepted**

## Context

**CTX-001**: `commerce.transaction@1.0.0` is a valid Golden package with
typed Graph bindings, exact template digests, and declared target slots. Its
current API contribution is a type-only template and its Prisma contribution
is a fragment. It does not declare an executable controller/runtime adapter.

**CTX-002**: The generic generated application runtime and the Restaurant
runtime currently own independent transaction paths. Controllers call those
runtimes directly. A compiler-generated transaction file that is not imported
by both paths cannot make their effects atomic.

**CTX-003**: An isolated Prisma fragment is not part of the generated
application unless the compiler merges it into the active schema and migration.
Likewise, a TypeScript source file that is not typechecked in the generated
project is not execution evidence.

**CTX-004**: A production-shaped commerce transition requires one boundary for
idempotency, expected-version checks, aggregate change, inventory movement,
audit record, outbox event, and completed command outcome. Each must either
commit together or leave no observable change.

**CTX-005**: Existing `commerce.transaction@1.0.0` package bytes, digests, and
historical locks are immutable. Retrofitting a runtime contract into that
version would break replayability.

## Decision

**DEC-001**: Introduce `factory.transaction-executor/v1` as an executable
capability-adapter contract. A new immutable
`commerce.transaction@2.0.0` package, not a mutation of `1.0.0`, declares this
adapter and its four contributions: API runtime module, active Prisma schema
extension, active migration extension, and behavioural journey fixture.

**DEC-002**: The compiler resolves the adapter only from the exact Published
composition lock. The selected manifest version, package root, digest,
declared bindings, adapter entrypoint, and target contributions are validated
together before output. A Profile name, mutable Draft field, arbitrary path,
or compiler hardcoded parallel implementation cannot select an executor.

**DEC-003**: Generated generic and Restaurant controllers must receive one
`CommerceTransactionExecutorV1` dependency. A locked commerce transition calls
`executor.execute(command)`; it must not call a record handler, effect runner,
or audit writer directly. Non-commerce transitions retain their existing
bounded paths.

**DEC-004**: The generated fixture adapter and Prisma adapter implement the
same public command semantics:

```ts
type CommerceTransactionCommandV1 = {
  scope: string;
  idempotencyKey: string;
  payloadDigest: string;
  aggregate: { entity: string; id: string; expectedVersion: number };
  transition: string;
};

interface CommerceTransactionExecutorV1 {
  execute(command: CommerceTransactionCommandV1): Promise<
    | { kind: "completed"; receiptId: string; replayed: boolean; outcome: unknown }
    | { kind: "in-progress"; receiptId: string }
  >;
}
```

The first command atomically creates or claims a receipt. A matching completed
scope/key/payload digest replays its immutable outcome; a changed digest
rejects. A concurrent claimed receipt returns the explicit `in-progress`
result or performs a controlled re-read; it must not leak a raw uniqueness
error. A stale aggregate version rejects. Aggregate update, inventory, audit,
outbox, and receipt completion execute in one database transaction.

**DEC-005**: The compiler merges the adapter's verified Prisma schema and SQL
migration contributions into the actual generated `schema.prisma` and
migration chain. Generated-project TypeScript checking and behavioural
transaction tests are mandatory compiler evidence. String-presence assertions
are insufficient.

**DEC-006**: `1.0.0` locks remain historical and compile through their existing
mode. A transaction-capable Profile can report `available` only after it is
locked to `2.0.0` and has immutable compilation evidence that passes the
executor behaviour matrix. Until then, `commerce.transaction` remains
`partial`.

## Consequences

### Positive

- **POS-001**: Restaurant, Ecommerce, Retail Counter, and Grocery Pickup use
  one testable atomic transaction boundary rather than profile-specific order
  paths.
- **POS-002**: Package identity, selected bindings, compiled source, schema,
  migration, and behavioural evidence become traceable from one Published
  lock.
- **POS-003**: The generated simulator and Prisma runtime exercise equivalent
  idempotency, concurrency, rollback, and optimistic-concurrency semantics.
- **POS-004**: Future commerce providers can implement the adapter contract
  without changing the Factory Application Graph.

### Negative

- **NEG-001**: A new immutable package version, lock migration, and a compiler
  integration slice are required before any current commerce Profile can claim
  atomic transaction readiness.
- **NEG-002**: Restaurant's independent runtime must be migrated rather than
  treated as an exempt vertical path.
- **NEG-003**: Generated Prisma schema composition and generated-project
  typechecking increase compile time and test surface.

## Alternatives Considered

### Keep the compiler-owned transaction implementation

- **ALT-001**: Emit a second hardcoded transaction source and manually add it
  to generated output.
- **ALT-002**: Rejected because the locked package would not govern execution
  and controllers could bypass it.

### Upgrade `commerce.transaction@1.0.0` in place

- **ALT-003**: Add an adapter declaration to the existing Golden manifest.
- **ALT-004**: Rejected because it changes digest-covered historical package
  bytes and invalidates Published lock replay.

### Make only generic commerce atomic

- **ALT-005**: Use an executor for Ecommerce, Retail, and Grocery while
  retaining Restaurant's bespoke command runtime.
- **ALT-006**: Rejected because one capability key would then describe two
  incompatible execution guarantees.

### Introduce a database transaction without a package adapter

- **ALT-007**: Change generated controllers and record stores directly.
- **ALT-008**: Rejected because it leaves target contribution ownership,
  versioning, and provider replacement outside the capability contract.

## Implementation Notes

- **IMP-001**: Create a new `commerce.transaction/2.0.0` physical package;
  retain `1.0.0` unchanged. Its adapter manifest declares one named executor
  entrypoint and exact contribution digests for runtime, schema, migration,
  and journey fixture.
- **IMP-002**: Add adapter-contract tests before runtime code. They must reject
  a package with missing, duplicate, mismatched, or undeclared executor
  contributions.
- **IMP-003**: Render the package's adapter contribution into the actual API
  module graph and inject `CommerceTransactionExecutorV1` into both generic
  and Restaurant controller construction.
- **IMP-004**: PostgreSQL uses a single `prisma.$transaction` and a unique
  `(scope, idempotencyKey)` receipt. Fixture storage models the same state
  transitions and exposes no raw mutable outcome reference.
- **IMP-005**: The compiler rejects generated output unless the merged Prisma
  schema, migration, TypeScript project, executor behaviour suite, and four
  Profile journey matrix pass.
- **IMP-006**: Do not expose a live payment, real identity, external provider,
  raw source material, credential, or mutable Draft to the executor.

## Verification

- **VER-001**: An exact `2.0.0` lock emits one executor module and the active
  schema/migration; missing, wrong-version, wrong-digest, or missing-dependency
  locks fail before output.
- **VER-002**: All four Commerce Profiles execute the same behavioural matrix:
  completed replay, changed-payload rejection, controlled concurrent duplicate,
  stale-version rejection, and all-or-nothing rollback.
- **VER-003**: Generated TypeScript typechecks with the generated Prisma client
  surface; generated journey tests import and run the emitted executor.
- **VER-004**: Generic and Restaurant controllers have no direct commerce
  mutation, effect, audit, or outbox bypass outside the executor.
- **VER-005**: Historical `1.0.0` locks remain replayable and are never
  labelled atomic/available without `2.0.0` compiler evidence.

## References

- **REF-001**: `docs/adr/adr-0006-typed-capability-binding-validation.md`
- **REF-002**: `docs/adr/adr-0008-immutable-composition-resolution-input.md`
- **REF-003**: `docs/superpowers/plans/2026-08-01-commerce-transaction-and-profile-operations.md`
- **REF-004**: Independent review of commit `47dcd00` against `da850d1`,
  2026-08-01.
