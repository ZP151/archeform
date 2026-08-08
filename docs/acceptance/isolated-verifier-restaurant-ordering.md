# Isolated Verifier acceptance (Restaurant Ordering)

## Required lifecycle proof

A queued verification job must accept only a Published Compilation ID, an
immutable artifact manifest, and a derived `verificationRunId`; compile that
immutable input; boot the generated application as an isolated Docker preview;
run the bounded probes against it; report one safe evidence bundle and one
final status; and clean the preview up afterwards. Retries with the same job
identity must be idempotent. The proof is the Docker-backed acceptance command:

```
pnpm verify:isolated-verifier-restaurant-ordering
```

which is `node scripts/verify-isolated-verifier-profile.mjs
restaurant-ordering` (the profile-parameterized harness;
`simple-ecommerce` and `expense-approval` are sibling profiles in the same
command) and performs the full loop against real infrastructure:

1. Starts the dedicated infra stack (postgres + redis) in Docker.
2. Seeds a deterministic Published Compilation (the restaurant-ordering
   composition with the `main-location` location, `table-12` table,
   `mains` menu category, `margherita-pizza` menu item, and the
   `table-12-demo-session` demo table session) into PostgreSQL; artifact
   digests are computed from the real generated bundle. The restaurant
   runtime requires a local demo table token of at least 16 characters; the
   harness injects the worker's authored fixture constant and only the
   SHA-256 digest is persisted.
3. Starts the Control Plane and the Worker on the host (the probes reach the
   generated application through the host loopback, where Docker Desktop
   publishes the isolated preview). A control-plane boot failure prints the
   captured bounded tail before teardown, so a recurrence is self-diagnosing.
4. Creates one verification run through the public API, waits for the terminal
   status, and asserts the allowlisted evidence: all thirteen steps passed,
   the declared journey statuses (session resolve 201, menu read 200,
   cashier payment 201, table seating 201, kitchen tickets 200, summary and
   low-stock reports 200, and the three denials 403), cleanup succeeded, no
   diagnosis persisted, and the preview project has no remaining containers.
5. Re-creates the run with the same identity and asserts the same terminal run
   and the same evidence digest are returned without re-enqueueing.
6. Boots the exact materialized bundle as a fresh preview and runs the
   generated application's own journey test suite against the generated
   database.

## Isolated runtime acceptance — passed

Evidence from the green Docker-backed run at the reviewed commit `a4e835c1`
plus the Batch 2 fixture and rendering repairs (2026-08-08, exit 0). This is
the first runtime acceptance record for the restaurant-ordering profile (the
pre-Batch-2 verifier covered only expense-approval):

- Terminal status: `succeeded`; no diagnosis persisted for a passing run.
- Evidence digest:
  `sha256:2d33f32caea919d4b1c7354b4f9ead86c713362a4f7af5fbfd3211734f46b90f`.
- Compilation identity: `cmsjpncv60001w414q557eai4`, artifact digest
  `sha256:0be478173b883ac83cde3e42ac5a6db98a1c60de11cb7ad1839038f300d9c09a`,
  profile `restaurant-ordering`.
- Thirteen step IDs, all `passed`, in plan order: `migration`, `health`,
  `customer-resolves-demo-session`, `customer-reads-menu`,
  `cashier-pays-merchant-order`, `merchant-seats-table`,
  `kitchen-lists-tickets`, `manager-reads-summary`,
  `manager-reads-low-stock`, `customer-denied-cancel`,
  `kitchen-denied-payment`, `customer-denied-reports`, `cleanup`.
- Journey HTTP statuses asserted by the harness:
  customer-resolves-demo-session `201`, customer-reads-menu `200`,
  cashier-pays-merchant-order `201`, merchant-seats-table `201`,
  kitchen-lists-tickets `200`, manager-reads-summary `200`,
  manager-reads-low-stock `200`, customer-denied-cancel `403`,
  kitchen-denied-payment `403`, customer-denied-reports `403`.
- Idempotent retry: re-creating the run with the same identity returned the
  same terminal run and the same evidence digest without re-enqueueing.
- Preview cleanup succeeded; no `factory-preview-*` containers or volumes
  remained after the run.
- Generated journey tests: `passed` — the bundle's own
  `api/test/journey.generated.test.ts` suite ran inside the generated api
  image against the generated database (capability event pairs for submit,
  pay, kitchen transitions, serve, and cancellations, outbox counts, audit
  counts, and every declared transition assertion).
- Infra: postgres + redis in Docker; control plane + worker on the host.

The flow moved the seeded table session through the declared merchant flow:
the customer resolved the demo table session and read the menu, the cashier
paid the merchant order, the merchant seated the table, the kitchen listed
its tickets, and the manager read the summary and low-stock reports — while
the customer, kitchen, and manager denials all returned `403` as the declared
probes expect. The preview project and its volumes were removed after the
run.

## Regression this re-run surfaced and closed

Two verifier defects surfaced through the real Docker-backed runtime, neither
of them a defect in the isolated-verifier platform itself:

**1. The preview never booted: a missing seeded menu category (P2003).** The
first restaurant re-run failed at `docker compose up --wait` with
`service "migrate" didn't complete successfully: exit 1`; reproducing the
migrate container against the harness seed showed
`PrismaClientKnownRequestError: Foreign key constraint violated on the
constraint: 'MenuItem_categoryKey_fkey'` (P2003). Root cause was a
verifier-fixture defect: the harness's seed fixture replaces the default
draft's seed array wholesale, and the replacement dropped the `menu-category`
record whose key every seeded `menu-item` references — so the rendered seed
violated the foreign key at migrate time and every downstream preview failed
to boot. Closed at the Batch 2 repair with a platform-authored fail-closed
validation (TDD: failing compiler test first): the database target now throws
at compile time when any seeded `menu-item.categoryKey` does not resolve to a
seeded `menu-category` record, and the harness seed gained the `mains`
category record before its menu items.

**2. The generated journey test demanded a notification effect the composed
Graph does not declare.** Once the preview booted, the generated journey
suite failed on mark-ready: the runtime emitted
`["order.transition/transition", "audit.record/record"]` while the generated
test expected `notification.send/send` as well. Root cause: the journey-test
template hardcoded the canonical base graph's mark-ready effects, but the
composed default Restaurant Draft is notification-free by pinned composition
contract (the composition-contract suite asserts the default draft has no
terminal notification effect and no durable notification lock), and the
compiler fails closed on a restaurant notification lock ("Restaurant Ordering
does not support notification.outbox/v1"). The runtime was already
graph-authoritative — only the test template was stale. Closed by rendering
the generated journey's expected effect pairs from the composed Graph's own
transitions (graph-as-authority, TDD: failing compiler test asserting the
notification-free expectation first), so the generated journey always verifies
exactly the declared capability effects and never demands an undeclared one.

## Deterministic checks

Worker (183, 16 files) and Control Plane (184, 18 files) suites pass in full
at the reviewed commit `a4e835c1` plus the Batch 2 repairs; both apps
typecheck, build, and lint clean. The repairs added two compiler tests (the
restaurant seed reference integrity fail-closed case and the graph-rendered
journey expectation) — compiler 332/332 (19 files) single-fork at the repair
commit. The ecommerce Batch 2 fixture repair added one profile test (29 in
the profile suite). The remaining suites are unchanged from the Task 6 Batch
2 ledger entry.

## Security and retention

No generated source, Published Graph content, credentials, prompts, or raw
probe bodies are persisted by the verification path or retained in this
record. Every per-run credential the harness generates is a synthetic Factory
token (worker token, redis password); the only static credential is the
dedicated infra stack's own local development `factory:factory` database URL,
which is local-only and never exported. The restaurant demo table token is a
fixture constant authored by the worker; only its SHA-256 digest is persisted
in the 24-hour active table session. Evidence summaries are allowlisted prose
only. The acceptance teardown restores the host (child processes terminated,
infra stack stopped) without removing existing volumes.
