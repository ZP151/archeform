# Task 5 report — Merchant operations and transport-neutral outbox

Status: DONE

Commit: `feat: generate restaurant merchant operations`

## Changed files

- `packages/compiler/src/restaurant-merchant-runtime.ts`
- `packages/compiler/test/restaurant-merchant-runtime.test.ts`
- `packages/compiler/src/restaurant-runtime.ts`
- `packages/compiler/src/index.ts`
- `e2e/generated-restaurant.spec.ts`
- `.superpowers/sdd/2026-07-30-restaurant-ordering-mvp/task-5-report.md`

No Graph, capability, Golden asset, Customer runtime, Docker topology,
Workbench, dependency manifest, source-study, notice, or ledger path changed.

## Delivered Merchant contract

- The generated Web application routes the five validated Merchant pages to a
  typed Merchant client module: table board, menu manager, kitchen board,
  cashier console, and Restaurant dashboard.
- Merchant fetches can use only frozen typed Restaurant paths. Mutation inputs
  are locally bounded, every mutation sends an idempotency key and expected
  version from the authoritative table or menu-item read model, and visible
  records are replaced only by server results or a fresh server read. The
  client does not compute workflow state, stock, order totals, aggregate
  reports, or cancellation compensation.
- Restaurant tables and menu items persist an explicit resource version.
  Merchant writes use one atomic `id + resourceVersion` update that increments
  the version, return a bounded typed 409 with the current safe state/version
  after a stale or concurrent write, and stamp supported inventory outbox rows
  with the committed resource version. Idempotent command replay still returns
  the first committed outcome without duplicating capability, audit, ledger, or
  outbox evidence.
- The table board reads authoritative tables and invokes manager-only
  open/seat/close transactions. Seating stores only a digest of a generated
  opaque token and the Merchant DTO returns no token or token digest.
- The menu manager reads all server categories/items and changes availability
  or stock through dedicated manager commands. Both commands append a truthful
  `manager-adjustment` ledger record with no order id, a bounded adjustment
  reason, ordered `inventory.adjust/adjust` and `audit.record/record`
  capability evidence, an audit record, and an `inventory.changed` outbox row.
- Order reservation and release ledger entries retain a required order id and
  compile as `order-reservation` and `order-release`. Prisma and SQL now emit a
  nullable order foreign key plus required provenance and optional bounded
  adjustment reason, faithfully consuming the accepted Task 1.1 projection.
- Kitchen reads only paid, accepted, preparing, or ready tickets and sorts
  priority descending, then paid time ascending, table number ascending, and
  stable id. Accept/start/ready remain kitchen-role Casbin commands.
- Cashier reads authoritative active orders, captures the existing full
  simulated payment, serves ready orders, and requests a bounded Merchant
  receipt. Receipt modifiers reuse the accepted safe allowlist projection;
  native `window.print()` is the only print affordance.
- Manager cancellation validates a non-empty, bounded, control-character-free
  reason and returns server-confirmed `inventoryReleased`, `auditRecorded`, and
  reason fields. The dashboard displays that confirmation only after success.
- Dashboard metrics and low-stock entries come only from the server summary and
  low-stock read models. Every new controller boundary first enforces the
  frozen Casbin resource/action policy.
- The generated demo seed links the Graph table to its Restaurant location and
  adds isolated Merchant E2E tables 98/99, opaque derived session digests, two
  submitted unpaid orders, order lines, and truthful reservation ledgers. The
  fixture is deterministic, uses the Graph location/menu item and price, and
  does not expose a customer session token.
- The Merchant browser scenario targets fixture records directly. It pays and
  renders the bounded receipt before kitchen/serve, drives authoritative stock
  to four and observes it in low-stock reporting, validates sales total, order
  count, average preparation, and cancellations, cancels table 99, and asserts
  every result in the table 98 close/open/seat/close sequence.

## Outbox semantics

- Generated `RestaurantEventV1` has exactly `order.created`,
  `order.transitioned`, and `inventory.changed`, optional `orderId`, required
  location/version/time, plus the transport-neutral `RestaurantEventPublisher`.
- The baseline recording publisher has no command API. The processor explicitly
  reads committed unpublished rows in occurred-time/id order, publishes one
  safe event, then marks that row published. It is never started eagerly by a
  command and contains no workflow-transition, serve, or cancel entry point.
- Executable compiler evidence starts with zero publisher calls and proves the
  exact committed-read -> publish -> mark sequence for ordered events.
- Executable generated-service tests prove Casbin/service denial before writes,
  stale and forced-concurrent version conflicts, replay without duplicate
  evidence, deterministic kitchen sorting, cancellation validation and atomic
  rollback/compensation, bounded Merchant receipts, persisted reports, and that
  every persisted event type belongs to the frozen publisher contract.
- Table transitions retain transactional table/session, capability, and audit
  evidence but persist no outbox row: the frozen `RestaurantEventV1` contract
  has no table-session event, so no unknown or permanently unpublishable record
  is created.
- No Socket.IO, react-to-print, ECharts, realtime, printer-credential, or chart
  integration is installed or claimed. No source-study intake was needed.

## TDD evidence

- Initial RED:
  `pnpm --filter @factory/compiler test -- restaurant-merchant-runtime.test.ts`
  failed 5/5 for absent Merchant routes/page output, kitchen projection,
  provenance schema, safe Merchant receipt/dashboard, and event publisher.
- Merchant route-wiring RED failed 1/5 until the generated catch-all selected
  the bounded Merchant client without coupling the accepted Customer module.
- Review regression RED failed 2/8 for absent authoritative resource versions
  and absent executable Merchant service regressions. After versioning was
  implemented, 1/8 remained RED until the generated service tests were emitted.
- The first fresh generated-service run failed 2/54 because the in-memory Prisma
  fake ignored Customer menu `select`; the fake was corrected to preserve the
  production projection, after which the same emitted tests passed 54/54.
- E2E re-review RED failed 1/9 because no isolated deterministic Merchant seed
  was emitted. It passed after adding the fixture records and their Graph-backed
  location/menu relationships.
- Final outbox re-review RED failed 4/58 across the two emitted service suites:
  successful table seating left one outbox row and the observed type set
  included unsupported `table-session.changed`. Removing that persistence call
  made both executable regressions pass while table audit/capability evidence
  remained asserted.
- GREEN focused suite: 9/9, including executable post-commit outbox ordering,
  authoritative stale/concurrent writes, and no eager publisher call.
- Full compiler suite: 143/143 across six files.

## Verification evidence

- `pnpm --filter @factory/compiler test` — PASS, 143/143.
- `pnpm --filter @factory/compiler typecheck` — PASS.
- `pnpm --filter @factory/compiler lint` — PASS.
- `pnpm --filter @factory/compiler build` — PASS.
- Fresh 65-file emitted bundle — generated Web production build and strict
  TypeScript check PASS;
  generated Prisma Client 6.19.3 PASS; generated seed TypeScript check
  PASS; generated API strict build PASS;
  generated API tests PASS, 58/58 across two executable suites.
- `pnpm exec playwright test e2e/generated-restaurant.spec.ts --grep
  "merchant|kitchen|cashier"` — one Merchant scenario discovered and accurately
  SKIPPED because `FACTORY_GENERATED_RESTAURANT_E2E_URL` was absent. Task 7
  owns the isolated generated application prerequisite; no browser pass is
  claimed. URL presence is the only Merchant skip condition. Every fixture row,
  action, state transition, receipt field, low-stock result, and dashboard
  metric has a hard assertion, so missing scenario records cannot silently
  remove workflow coverage.
- `git diff --check` — PASS.

## Acceptance status and remaining risks

- Version-safe table operations, menu availability/stock, deterministic kitchen
  workflow, cashier simulated payment/serve/receipt, manager cancellation
  compensation, reporting, Casbin boundaries, truthful manager-adjustment
  provenance, deterministic Merchant E2E fixtures, and transport-neutral
  post-commit delivery are satisfied by compiler and emitted artifact evidence.
- Live browser execution, PostgreSQL concurrency, Compose startup, and Node 22
  container evidence remain Task 7 acceptance work.
- Host verification used Node 24.18.0 and emitted the expected engine warning;
  supported release evidence remains Node 22.
- Merchant identity remains the approved later provider capability. The
  generated `x-factory-role` header is explicitly test-only role simulation,
  not authentication.
