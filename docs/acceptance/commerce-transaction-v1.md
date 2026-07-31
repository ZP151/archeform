# Commerce Transaction v1 Acceptance

## Accepted scope

`commerce.transaction@1.0.0` is a Golden, immutable package selected through
the published composition lock. For Restaurant Ordering, Simple Ecommerce,
Retail Counter, and Grocery Pickup, the compiler emits the same public
transaction boundary, Prisma schema fragment, and journey fixture.

The generated boundary requires a scope-local idempotency key and expected
aggregate version. A repeated completed command with an equal payload replays
the immutable receipt outcome; a changed payload with the same key is rejected.
The Prisma adapter wraps receipt lookup/creation, conditional aggregate update,
inventory movement, audit event, outbox event, and completed outcome in one
`prisma.$transaction` callback. The in-memory adapter is fixture-only.

## Verification commands

```sh
pnpm --filter @factory/capabilities test -- commerce-transaction-package.test.ts
pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts
pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts
pnpm --filter @factory/compiler test -- compilation-plan.test.ts
```

## Explicit exclusions

Payments are simulated only. This capability accepts no payment credentials and
does not move money. Identity providers, payment providers, delivery,
reservations, printers, search, notifications, loyalty, realtime operation,
cloud deployment, and production observability are not accepted by this slice.

This is not production-complete until deployment and provider acceptance have
independently passed. A published immutable Graph and verified Golden locks are
mandatory; mutable Drafts and candidate packages cannot compile transaction
output.
