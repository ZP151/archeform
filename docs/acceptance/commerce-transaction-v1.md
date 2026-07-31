# Commerce Transaction v1 Rejected Implementation Record

`commerce.transaction@1.0.0` remains a Golden immutable package and historical
Published locks remain replayable. The compiler retains those locks for
validation and historical generic/Restaurant behaviour, but suppresses the two
V1 declared target contributions because they are disconnected from generated
controllers and the active Prisma schema. V1 does not declare the executable
adapter required to make a commerce transition atomic.

The former compiler output emitted a runtime, Prisma fragments, and a journey
fixture that no generated controller or active schema consumed. That output is
removed: a `1.0.0` lock does not authorize or claim an atomic transaction
boundary.

ADR-0009 defines the required replacement: a new immutable
`commerce.transaction@2.0.0` package must provide the
`factory.transaction-executor/v1` adapter, with its verified contributions
joined to both generated runtime paths and active Prisma schema and migration.

## Current status

`commerce.transaction` remains partial. No Commerce profile has accepted
atomic-transaction evidence in this record.

## Explicit exclusions

Payments are simulated only. This record accepts no payment credentials,
identity provider, delivery, reservation, printer, search, notification,
loyalty, realtime operation, cloud deployment, production observability, or
atomic transaction runtime.
