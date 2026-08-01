# Durable notification outbox acceptance evidence

Date: 2026-08-01

Status: Task 4 deterministic cross-profile evidence complete; Task 5 release
gate is blocked by a compiler regression failure recorded below.

## Accepted boundary

New mutable Expense Approval and Simple Ecommerce recipes select the exact same
immutable notification asset:

| Profile          | Package                   | Manifest digest                                                           | Recipient role | Template                   |
| ---------------- | ------------------------- | ------------------------------------------------------------------------- | -------------- | -------------------------- |
| Expense Approval | `core.notification@1.1.1` | `sha256:9258e7686b55c69dcafdc8d4d4e7484da527dae56134b25629855cca3df8b8d4` | `employee`     | `expense.approval-outcome` |
| Simple Ecommerce | `core.notification@1.1.1` | `sha256:9258e7686b55c69dcafdc8d4d4e7484da527dae56134b25629855cca3df8b8d4` | `shopper`      | `ecommerce.order-outcome`  |

The Expense `approve` and `reject` outcomes and Ecommerce `pay` outcome declare
`notification.send`. The generated runtime derives recipient, template,
dedupe key, and delivery input from the verified composition lock; clients
cannot supply recipient addresses, message bodies, URLs, providers, or delivery
callbacks.

Historical `core.notification@1.1.0` locks remain unchanged and replay with a
`null` template. The package, Graph, composition, and compiler contracts were
not changed by Task 4.

## TDD evidence

Initial capability RED:

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
Exit 1: 1 failed, 77 passed.
Expected cause: the Expense recipe had no profile template binding.
```

Initial compiler RED:

```text
pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts profile-compilation.test.ts
Exit 1: 4 failed, 33 passed.
Expected causes: neither outcome flow declared notification.send and both
generated worker drains returned no delivery.
```

Focused GREEN after refreshing ignored workspace build output consumed by the
compiler tests:

```text
pnpm --filter @factory/capabilities build
Exit 0.

pnpm --filter @factory/capabilities test -- capability-registry.test.ts
Exit 0: 78 passed.

pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts profile-compilation.test.ts
Exit 0: 37 passed.

pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint
Exit 0 for all four commands.
```

The generated profile journeys use real generated `ApplicationRuntime`,
`InMemoryRecordStore`, `NotificationOutboxWorker`, and
`FixtureNotificationTransport` implementations. Expense creates and submits an
expense before manager approval. Ecommerce creates a cart, adds a seeded
product, submits it, and pays it. Each worker drain observes exactly one
delivered record with the expected profile role and template.

The negative recipe regression omits `recipientRole` while supplying the valid
Expense template and verifies that composition fails before a lock is created.

## Cleanup and release follow-up

The materialization harness creates each generated runtime beneath a unique
temporary test directory and removes it in `finally`, including failure paths.
It creates no Docker resources and performs no network delivery.

Task 5 must still run the full package and repository gates, publish and compile
isolated profile revisions, start uniquely named Compose previews, execute the
role-aware journeys, and run:

```text
docker compose down --volumes --remove-orphans
```

for each generated preview. Task 5 must confirm that no generated Compose
resources remain and may run the guarded real OpenAI Graph-Diff only through an
environment-only credential. Credentials and raw prompts/responses must not be
persisted or reported.

## Task 5 release-gate attempt (blocked)

```text
pnpm --filter @factory/capabilities test
Exit 0: 20 test files and 277 tests passed.

pnpm --filter @factory/compiler test
Exit 1: 13 test files: 12 passed, 1 failed; 228 tests passed, 4 failed.
```

All four failures are in `packages/compiler/test/compilation-plan.test.ts` and
demonstrate stale assertions/fixtures after the profile notification changes:
two capability-event assertions omit now-declared `notification.send` effects,
one test appends that already-declared effect and asserts the previous generated
sequence, and the historical `1.0.1` fixture retains a `template` binding that
the older package correctly rejects. No production behavior change was made by
release QA.

The compiler gate is therefore red. Repository-wide, Compose/generated-profile,
cleanup, and real-model gates were not run; no credential was read. Release
evidence has not been committed or pushed.
