---
title: "ADR-0010: Profile Transaction Operation Adapters"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "profiles", "transactions"]
supersedes: ""
superseded_by: ""
---

# ADR-0010: Profile Transaction Operation Adapters

## Status

**Accepted**

## Context

**CTX-001**: ADR-0009 correctly separates an atomic transaction executor from
controllers. Its executor contract is deliberately small: idempotency, a
versioned aggregate, inventory movement, audit, outbox, and immutable outcome.

**CTX-002**: Generic Commerce order transitions can map to that contract.
Restaurant commands also need declared table-session state, line capture,
payment evidence, cancellation reason, kitchen state, and a Restaurant-shaped
response. Hiding those values in a generic executor or leaving direct
Restaurant Prisma mutations would break either reuse or atomicity.

**CTX-003**: Existing `restaurant.ordering` package output is a capability
module, not a typed transaction-operation adapter. Existing package versions,
including `commerce.transaction@2.0.0`, are immutable once verified.

**CTX-004**: Future Profile families must add business-specific transaction
logic without making the Application Graph depend on a third-party schema or
allowing a controller to execute unverified code.

## Decision

**DEC-001**: Keep the executor core provider-neutral. Introduce
`factory.transaction-operation-adapter/v1` as a second, digest-covered
executable contribution supplied by a Profile or domain capability package.

**DEC-002**: A transaction-enabled compilation requires exactly one locked
operation adapter compatible with the locked transaction executor. The
compiler selects it from the Published composition lock's package identities,
declared bindings, contribution digests, interface version, and dependency
order. It must not branch on a Profile name or a mutable Draft property.

**DEC-003**: The operation adapter owns only these bounded responsibilities:

```ts
interface TransactionOperationAdapterV1<Request, Context, Response> {
  parseRequest(request: unknown): Request;
  prepare(request: Request): {
    command: CommerceTransactionCommandV1;
    context: Context;
  };
  createStore(context: Context, dependencies: TransactionDependenciesV1):
    CommerceTransactionStoreV1;
  present(result: CommerceTransactionResultV1, context: Context): Response;
}
```

`Context` is Factory-owned, typed source emitted from the locked adapter; it
cannot be arbitrary controller JSON, a URL, a source path, a credential, or a
free-form code payload. `createStore` encapsulates Profile-specific effects
inside the executor's one transaction boundary.

**DEC-004**: Introduce new immutable package versions rather than editing
existing bytes:

- `commerce.transaction@2.1.0` consumes one
  `factory.transaction-operation-adapter/v1` provider alongside its executor
  contributions;
- `commerce.order@<next>` provides the generic Commerce order adapter;
- `restaurant.ordering@<next>` provides the Restaurant order operation
  adapter.

The first migration accepts the generic Commerce and Restaurant adapters only.
Retail Counter and Grocery Pickup use the generic Commerce adapter until they
need their own declared operation package.

**DEC-005**: Generated generic and Restaurant controllers follow one path:
parse request -> operation adapter `prepare` -> executor `execute` -> adapter
`present`. Controllers cannot update an order, reserve/release stock, append
an audit/outbox event, or invoke a payment/table mutation outside the Store
created by the adapter.

## Consequences

### Positive

- **POS-001**: One transaction core can serve increasingly diverse business
  Profiles without becoming a hidden Restaurant/commerce monolith.
- **POS-002**: Restaurant-specific inputs, side effects, and response shape
  are typed and locked in its own package rather than represented as untrusted
  generic payload.
- **POS-003**: External source studies can map bounded business algorithms to
  operation-adapter packages without surrendering Graph or controller authority.
- **POS-004**: A new Profile can replace or add an operation adapter while
  retaining the same executor replay, concurrency, rollback, and audit rules.

### Negative

- **NEG-001**: Transaction adoption now requires coordinated package versions
  and an exact provider relationship in the composition lock.
- **NEG-002**: Generic and Restaurant operation adapters need their own
  behavioural and generated-project conformance suites.
- **NEG-003**: Retail and Grocery initially retain the generic adapter and
  cannot claim custom tender/pickup semantics until they own an adapter.

## Alternatives Considered

### Extend the core executor with Restaurant fields

- **ALT-001**: Add table, line, payment, kitchen, and cancellation properties
  directly to `CommerceTransactionCommandV1`.
- **ALT-002**: Rejected because every new vertical would expand the shared
  command and make a supposedly reusable component profile-specific.

### Keep Restaurant's direct command service

- **ALT-003**: Use the core executor only for generic Commerce Profiles.
- **ALT-004**: Rejected because the same capability key would make different
  atomicity claims and Restaurant would retain a controller bypass.

### Pass arbitrary JSON through the operation adapter

- **ALT-005**: Let controllers pass untyped request data to a universal Store.
- **ALT-006**: Rejected because it recreates arbitrary executable/input
  semantics and prevents compile-time conformance testing.

## Implementation Notes

- **IMP-001**: Define `TransactionOperationAdapterV1` in the generated
  transaction runtime template and validate its provider declaration with a
  new `executableContributions` interface version.
- **IMP-002**: The transaction V2.1 package declares an explicit required
  interface and fails compilation if zero or more than one adapter providers
  are selected.
- **IMP-003**: `commerce.order` and `restaurant.ordering` successor packages
  declare exact adapter source, target, namespace, bindings, fixture, and
  journey contribution digests. Historic versions remain replayable.
- **IMP-004**: The generic adapter's context contains only order transition
  facts. The Restaurant adapter's context has typed table, line, payment, and
  cancellation structures validated before `prepare` returns.
- **IMP-005**: Prisma adapters receive the transaction-scoped delegate only
  within `store.transaction`. Any operation failure rolls back core and
  Profile-specific records together.

## Verification

- **VER-001**: Compilation rejects no adapter, two adapter providers, wrong
  interface version, wrong digest, wrong dependency order, unsafe target, or
  bindings that do not match the adapter's declared Graph symbols.
- **VER-002**: Generic Commerce and Restaurant generated APIs both execute
  parse -> prepare -> execute -> present. Static checks prove no direct
  commerce mutation path remains in either controller.
- **VER-003**: Both adapter suites prove idempotent replay, changed-payload
  rejection, pending duplicate behaviour, stale version, and rollback across
  their own business effects.
- **VER-004**: Retail and Grocery compile with the generic adapter and retain
  deterministic Profile binding remaps.
- **VER-005**: All executor, operation, schema/migration, generated TypeScript,
  and four-Profile journey tests pass before readiness becomes available.

## References

- **REF-001**: `docs/adr/adr-0009-executable-transaction-adapter-contract.md`
- **REF-002**: `docs/superpowers/plans/2026-08-01-executable-transaction-adapter-contract.md`
- **REF-003**: Task V2-4 structural report in ignored SDD workspace,
  2026-08-01.
