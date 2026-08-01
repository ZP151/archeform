# Durable notification outbox acceptance evidence

Date: 2026-08-01

Status: reopened and superseded by Task 8 re-QA after independent release
review identified material gaps in the earlier Task 5 acceptance. Historical
Task 5 evidence is retained below unchanged; this record must not be treated as
final acceptance unless the Task 8 correction evidence and an independent
release-review approval are both recorded.

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

## Task 5 resumed attempt (blocked by repository gate)

After Task 4 correction commit `e601870`, fresh package/compiler gates passed:

```text
pnpm --filter @factory/capabilities test
Exit 0: 20 test files and 277 tests passed.

pnpm --filter @factory/compiler test
Exit 0: 13 test files and 232 tests passed.

pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint
Exit 0 for all four commands.
```

The required `pnpm test` repository gate exited 1 due to one unrelated
`@factory/compiler-worker` preview-runner test (77 tests passed, 1 failed).
Its permanent-readiness fixture expects one health check in a 10 ms budget, but
the runner permits a retry after up to 5 ms before that deadline; the root run
observed two health checks while an immediate focused rerun passed 33/33. This
is scheduler-dependent test evidence, so the repository gate remains red.

No further repository gates, Compose/generated-profile journeys, cleanup, or
real-model call were run. No credential was read, and release evidence remains
uncommitted and unpushed.

The fresh compiler gate also left an untracked generated directory at
`packages/compiler/test/notification-runtime-k2vugb` (16 files, 54,476 bytes).
The worktree was clean before the gates. This release-QA task does not have
authority to remove it, so it is an additional test-harness cleanup defect.

## Task 5 resumed repository gate (blocked by portfolio fixture)

After the reviewed preview-test correction `918b2c5`, the stale generated
runtime directory was absent before the fresh root gate. `pnpm test` still
exited 1, now solely because the Control Plane portfolio-summary fixture
expects `lockedVersions: 48` while the verified count is 50 (120 tests passed,
1 failed). A focused rerun reproduced the mismatch. The two additional locked
versions are this slice's immutable notification `1.1.0` and `1.1.1` assets;
the static portfolio expectation predates them.

No remaining repository gates, Compose/generated-profile journeys, cleanup, or
real-model call were run. No credential was read, and release evidence remains
uncommitted and unpushed.

## Task 5 final release verification

The final deterministic gates were green after the focused remediation commits
`e601870`, `918b2c5`, and `10003d8`:

```text
pnpm --filter @factory/capabilities test     Exit 0: 20 files, 277 tests.
pnpm --filter @factory/compiler test         Exit 0: 13 files, 232 tests.
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint         Exit 0 for all four commands.
pnpm test                                    Exit 0: 16 Turbo tasks.
pnpm typecheck                               Exit 0: 16 Turbo tasks.
pnpm lint                                    Exit 0: 10 Turbo tasks.
pnpm build                                   Exit 0: 10 Turbo tasks.
pnpm verify:third-party                      Exit 0: 5 notices verified.
pnpm verify:source-studies                   Exit 0: 2 studies verified.
git diff --check                             Exit 0.
```

An isolated Factory Compose project, `factory-task5-notification-1785596023`,
published, compiled, previewed, and stopped both generated profile journeys.
The browser harness recorded two expected journeys with zero unexpected,
flaky, or skipped results. It exercised the generated Expense employee/manager
approval route and generated Ecommerce shopper/merchant payment and fulfilment
route. The deterministic compiler runtime suite separately exercised the
fixture worker's delivery, retry, terminal-failure, idempotency, and client
input-rejection paths.

The browser harness stopped each Factory-issued generated preview and checked
its exact label-scoped resources. Final cleanup also stopped the Factory
project with `down --volumes --remove-orphans`: zero project-labeled
containers, networks, and volumes remained, and zero generated-preview
container projects remained.

One guarded real OpenAI Graph-Diff was accepted against a mutable Expense
Draft. The control plane read the credential only from the local launch-process
environment. Safe outcome identifiers: application `cmsai45zc006sls4tbcxd3j73`,
new Draft `cmsaic676008pls4tg23kduva`, revision `3`. No credential, brief,
raw Graph Diff, or model response is retained here.

Residual scope: notification delivery remains the local deterministic fixture
transport; no external notification provider, credential, or network delivery
was enabled.

## Task 8 correction re-QA (2026-08-02)

Status: deterministic re-QA evidence is complete, but final acceptance remains
pending independent release-review approval. This section supersedes the Task 5
acceptance conclusion above; it does not alter the historic facts recorded in
earlier sections.

The PM ledger recorded the Task 7 remediation as `ready_for_qa` before this
work started. The implementation handoff stated that Workbench Restaurant
defaults omit notification, explicit durable Restaurant selection fails closed,
and the generated drain must execute from the API Compose service.

Fresh deterministic gates:

```text
pnpm --filter @factory/capabilities test     Exit 0: 20 files, 279 tests.
pnpm --filter @factory/compiler test         Exit 0: 13 files, 235 tests.
pnpm --filter @factory/workbench test        Exit 0: 17 files, 73 tests.
pnpm test                                    Exit 0: 16 Turbo tasks.
pnpm typecheck                               Exit 0: 16 Turbo tasks.
pnpm lint                                    Exit 0: 10 Turbo tasks.
pnpm build                                   Exit 0: 10 Turbo tasks.
pnpm verify:third-party                      Exit 0: 5 notices verified.
pnpm verify:source-studies                   Exit 0: 2 studies verified.
git diff --check                             Exit 0.
```

Focused error-path and state-transition evidence:

```text
pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts \
  -t "rolls back generated Prisma domain and outbox writes after post-enqueue failure"
Exit 0: 1 passed, 17 skipped.

pnpm --filter @factory/workbench test -- \
  lib/guided-creation-model.test.ts lib/profile-starters.test.ts
Exit 0: 2 files, 6 tests passed.

pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts \
  -t "rejects a Restaurant durable notification lock instead of omitting its outbox"
Exit 0: 1 passed, 17 skipped.
```

The first focused compiler result exercises the external test-only transaction
decorator: it throws after enqueue through the generated Prisma runtime and
proves that neither domain mutation nor outbox write commits. The Workbench
result covers the default notification-free Restaurant path and retained
eligible toggle; the compiler result verifies explicit durable selection is
rejected rather than silently suppressed.

Two independently generated, uniquely named Compose applications exercised
the API, PostgreSQL store, and documented drain command. Their generated
revision identifiers and file counts were `task8-expense-1785600304188` (62)
and `task8-ecommerce-1785600735126` (78). The exact command used inside each
generated application root was:

```text
docker compose exec -T api pnpm notification:drain
```

The Expense transition produced one PostgreSQL outbox row in
`pending|employee|expense.approval-outcome`; the command reported
`processed: 1, delivered: 1, pending: 0, failed: 0`; and the same row became
`delivered|employee|expense.approval-outcome`. The Ecommerce payment transition
produced `pending|shopper|ecommerce.order-outcome`; its drain reported the same
count-based summary; and the row became
`delivered|shopper|ecommerce.order-outcome`.

Each project ran `docker compose down --volumes --remove-orphans`. Label-scoped
checks then found zero containers, networks, and volumes, and both temporary
generated application directories were removed. The isolated guarded-model
Control Plane project was also removed with zero labeled containers, networks,
and volumes.

During the Expense observation, an initial ad-hoc PostgreSQL query used an
invalid empty quoted identifier and then a nonexistent `NotificationOutbox`
timestamp column. Systematic debugging established that the generated outbox
has no creation timestamp and that the shell query, not the application,
caused the observation failure. A column-discovery query and a field-separated
read (`status`, `recipientRole`, `template`) reproduced the expected pending
state before the subsequent successful drain. No product defect was found.

One and only one guarded OpenAI Graph-Diff request was made after deterministic
and Compose evidence completed. The Control Plane read the credential only from
the local `.env` launch environment. It returned HTTP 201 and created mutable
Expense application `cmsakji980002pg4tcwyb54ur`, Draft
`cmsakjzka0005pg4t25k2w0x3`, revision `2`, with one affected model and one test
suggestion. No credential, brief, prompt, raw diff, or raw model response is
retained here.

Coverage note: the live journeys verify one successful pending-to-delivered
delivery for each required profile. Existing deterministic compiler coverage
continues to cover deduplication, transient retry, terminal failure,
idempotency, and rejected client-controlled delivery input. Independent release
review remains the release-blocking gate; no Task 8 final acceptance claim is
made by this record.

## Release-review remediation evidence (2026-08-02)

Status: ready for a new independent release review. This section corrects one
scope statement in the Task 8 section: the earlier focused compiler test used a
transactional Prisma fixture. It did not run `ApplicationRuntime.transition`
against a generated PostgreSQL schema, so it is not the final evidence for the
post-enqueue rollback boundary.

The committed `pnpm verify:generated-notification-outbox` verifier now creates
an isolated generated Expense application and Compose project. It exercises the
real generated `ApplicationRuntime.transition` through a transaction-scoped
`PrismaRecordStore` decorator that delegates notification enqueue and the
subsequent domain update, then throws an exact post-update sentinel. The
verifier requires that exact sentinel and records both milestones before it
asserts the durable outcomes at the database boundary:

```text
pendingBeforeDrain: 1
enqueueCompleted: true
domainUpdateCompleted: true
rollbackStatus: draft
rollbackOutbox: 0
delivered: 1
safeFailure: true
```

The same verifier runs the documented generated drain command, verifies its
count-only pending-to-delivered result, and invokes it once with a deliberately
unusable database setting. The error path exits nonzero and emits only the
fixed safe status `{"status":"failed"}`. It emits no connection, provider,
recipient, prompt, or credential diagnostic. The verifier always removes its
temporary directory and exact Compose project with volumes and orphans.

Fresh release gates after this remediation:

```text
pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts
Exit 0: 18 tests passed.

pnpm verify:generated-notification-outbox
Builds @factory/graph, @factory/capabilities, and @factory/compiler from the
current checkout before executing the verifier. Exit 0: pendingBeforeDrain 1,
enqueueCompleted true, domainUpdateCompleted true, delivered 1,
rollbackOutbox 0, safeFailure true.

pnpm test                                    Exit 0: 16 Turbo tasks.
pnpm typecheck                               Exit 0: 16 Turbo tasks.
pnpm lint                                    Exit 0: 10 Turbo tasks.
pnpm build                                   Exit 0: 10 Turbo tasks.
pnpm verify:third-party                      Exit 0: 5 notices verified.
pnpm verify:source-studies                   Exit 0: 2 studies verified.
git diff --check                             Exit 0.
```

No real-model request was made during this remediation. Independent release
review remains required before the durable notification outbox slice can be
accepted.

## Final independent release review (2026-08-02)

Status: accepted for this capability slice. The independent review of
`8a9a602..b6a6fc5` found no remaining P0, P1, or P2 issue. It verified that the
committed verifier requires the exact post-update sentinel, both transaction
milestones, and the generated PostgreSQL rollback outcome. It also verified
that the root command rebuilds its Graph, capability, and compiler inputs from
the current checkout before starting the generated Compose application.

This acceptance does not expand notification delivery beyond its local fixture
transport or authorize an external provider.
