---
title: "ADR-0013: Transaction Command V2 and Durable Receipt Lease"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "postgresql", "idempotency"]
supersedes: ""
superseded_by: ""
---

# ADR-0013: Transaction Command V2 and Durable Receipt Lease

## Status

**Accepted**

## Context

**CTX-001**: `commerce.transaction@2.1.0` and
`commerce.order@2.0.3` are immutable Golden assets selected by new Generic
Commerce recipes. An independent generated-output review found that the
transaction command's `transition` field is typed as a bound Flow identifier
by the executor but is populated with an order event by the operation adapter.
The emitted API therefore cannot typecheck under its own strict TypeScript
configuration.

**CTX-002**: The same review found that generated Generic journey tests pass
server-owned order fields, and infer version semantics from a literal entity
key. This fails for remapped Ecommerce, Retail Counter, and Grocery Pickup
entities even when compiler-package tests pass.

**CTX-003**: The generated Prisma store reads an aggregate version and then
updates only by record ID. Under PostgreSQL `READ COMMITTED`, independently
idempotent concurrent commands can both observe the same version and execute
effects. Its in-memory receipt test can also observe an uncommitted `pending`
receipt that a PostgreSQL transaction cannot expose.

**CTX-004**: Existing physical package contents, digests, and Published locks
are immutable. Rewriting either current asset to correct the contract would
invalidate historical compilation evidence. Restaurant's typed transaction
path remains independent of this Generic Commerce migration.

## Decision

**DEC-001**: Keep `commerce.transaction@2.1.0` and
`commerce.order@2.0.3` replayable and non-selectable for new Generic Commerce
Drafts. Publish their immutable successors as
`commerce.transaction@2.2.0` and `commerce.order@2.1.0`; no compatibility
branch, template mutation, or Profile-name exception is permitted.

**DEC-002**: The successor executor provides
`factory.transaction-executor/v2`, and the successor order package provides
`factory.transaction-operation-adapter/v2`. A command has distinct immutable
Flow and event fields:

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
  idempotency: Readonly<{
    scope: string;
    key: string;
    payloadDigest: string;
  }>;
}>;
```

The exact lock-bound executor validates `flowId`, and the exact lock-bound
operation adapter validates `event`. Neither can choose an entity, Flow,
operation, package, path, URL, or provider from caller input.

**DEC-003**: The successor uses a durable, database-visible receipt lease.
Receipt uniqueness is `(scope, idempotencyKey)`, and a receipt stores a
payload digest, opaque lease token, monotonically increasing lease epoch,
lease expiry, terminal result projection, and state `claimed`, `completed`,
or `retryable`.

- A claim is committed before the business mutation.
- A same-digest completed receipt replays its stored result.
- A same-digest unexpired claim returns `in-progress`; it never reads an
  uncommitted row.
- A mismatched digest fails closed.
- A retryable or expired claim can be acquired only through a conditional
  update that rotates the token and increments the epoch.
- The aggregate mutation, stock ledger, audit record, outbox event, and
  terminal receipt update execute in one transaction. The terminal update
  must match the active lease token and change exactly one row.
- If that business transaction fails, it rolls back all business effects; a
  separate token-bound operation makes the receipt retryable. A stale owner
  cannot complete or release a replacement owner's receipt.

**DEC-004**: Aggregate state changes use an atomic compare-and-swap update.
The generated Prisma adapter issues an update constrained by aggregate ID,
expected version, and expected state, increments the version in that same
statement, and accepts success only when exactly one row changes. Stock and
other bounded effect writes apply equivalent conditional predicates where
their business invariant requires one.

**DEC-005**: The successor schema and migration are emitted as one active
unit. They create the receipt uniqueness constraint, receipt-lease lookup
index, and aggregate entity/ID/version index declared by the Prisma fragment.
The compiler validates schema/migration parity before it emits a bundle.

**DEC-006**: Journey compilation derives server-owned fields, versioned
aggregate identity, transition event, and idempotency requirements exclusively
from the exact selected package bindings. It must not test an entity key
literal such as `order`, or send server-owned ID, status, or version fields to
the create handler.

**DEC-007**: A Generic Commerce Profile may select the successors only after
its generated API passes its own strict typecheck and generated journey suite.
Acceptance additionally requires live PostgreSQL two-client evidence for
same-key replay, same-key active claim, changed-payload rejection, competing
expected-version commands, expired-lease takeover, and rollback of aggregate,
inventory, audit, outbox, and receipt terminal effects.

## Consequences

### Positive

- **POS-001**: A compiled application can distinguish a workflow binding from
  a business event without Profile-specific compiler logic.
- **POS-002**: Idempotency results model what PostgreSQL can actually expose,
  rather than the dirty visibility of an in-memory test double.
- **POS-003**: The Generic order foundation becomes reusable by Restaurant
  extensions, Ecommerce, Retail Counter, Grocery Pickup, and later transaction
  Profiles only through explicit capability bindings.
- **POS-004**: Generated code becomes an independently verified artifact,
  rather than an untypechecked by-product of compiler tests.

### Negative

- **NEG-001**: Two new immutable package roots, contribution digests,
  fixtures, migrations, and contract tests are required.
- **NEG-002**: The generated runtime gains a claim/lease protocol and a live
  PostgreSQL test harness, increasing operational and test complexity.
- **NEG-003**: A caller can receive `in-progress` for a duplicate command and
  must poll or retry after the bounded lease window rather than assuming an
  immediate completed response.

## Alternatives Considered

### Repair the existing Golden assets in place

- **ALT-001**: Change `transition` to mean an event in 2.1.0/2.0.3 and add the
  missing database behavior there.
- **ALT-002**: Rejected because it breaks immutable evidence and Published
  replayability.

### Keep claim and mutation in one PostgreSQL transaction

- **ALT-003**: Preserve the current upsert implementation and translate a
  duplicate database wait into an in-memory-like pending result.
- **ALT-004**: Rejected because an uncommitted row is not externally
  observable at PostgreSQL `READ COMMITTED`; the result would be fabricated.

### Use an application-process mutex or Redis lock as the transaction authority

- **ALT-005**: Serialize commands outside PostgreSQL.
- **ALT-006**: Rejected because process restarts, multiple generated
  deployments, and lock loss would make database correctness depend on a
  non-durable side channel.

### Make all Generic commands Serializable

- **ALT-007**: Replace CAS with serializable transactions and retry failures.
- **ALT-008**: Rejected because it does not define receipt visibility or
  idempotent ownership, increases retry complexity, and is broader than the
  aggregate-level invariant.

## Implementation Notes

- **IMP-001**: Add focused RED tests before source changes for the V2 command
  shape, generated application typecheck, no server-owned create fields,
  non-literal entity bindings, compare-and-swap behavior, lease claims, and
  schema/migration parity.
- **IMP-002**: Run live PostgreSQL tests with two independent Prisma clients
  against an isolated generated Compose project. They must not reuse the
  Factory Control Plane database or credentials.
- **IMP-003**: Update only uncompiled Generic Draft recipes to the successor
  locks after all evidence passes. Historical locks and Restaurant's existing
  typed path remain unchanged.
- **IMP-004**: `in-progress` is a bounded public result, not an exception or
  implicit retry. It contains no raw command payload, credential, prompt, or
  provider detail.

## Verification

- **VER-001**: Package verification proves the old package bytes unchanged,
  exact successor digests, one executor V2, one operation adapter V2, and no
  mixed V1/V2 lifecycle providers.
- **VER-002**: All three Generic Profiles compile output that typechecks and
  passes its emitted journey suite from a clean generated directory.
- **VER-003**: Live PostgreSQL evidence proves only one competing state CAS
  succeeds and only its bounded effects commit.
- **VER-004**: Live PostgreSQL evidence proves durable receipt replay,
  `in-progress`, payload mismatch rejection, stale lease-owner rejection,
  expired takeover, and rollback.
- **VER-005**: Missing, duplicated, unsigned, incompatible, or tampered
  successor contributions fail before bundle generation; no raw source,
  external URL, AI material, or credential appears in output evidence.

## References

- **REF-001**: `docs/adr/adr-0009-executable-transaction-adapter-contract.md`
- **REF-002**: `docs/adr/adr-0011-generic-order-lifecycle-operations.md`
- **REF-003**: `docs/adr/adr-0012-bounded-generic-order-creation-handler.md`
- **REF-004**: Independent generated-runtime review of commit `b9e675f`,
  2026-08-01.
- **REF-005**: PostgreSQL `INSERT ... ON CONFLICT` and transaction-isolation
  documentation, accessed 2026-08-01.
