# Isolated Verifier acceptance (Simple Ecommerce)

## Required lifecycle proof

A queued verification job must accept only a Published Compilation ID, an
immutable artifact manifest, and a derived `verificationRunId`; compile that
immutable input; boot the generated application as an isolated Docker preview;
run the bounded probes against it; report one safe evidence bundle and one
final status; and clean the preview up afterwards. Retries with the same job
identity must be idempotent. The proof is the Docker-backed acceptance command:

```
pnpm verify:isolated-verifier-simple-ecommerce
```

which is `node scripts/verify-isolated-verifier-profile.mjs simple-ecommerce`
(the profile-parameterized harness; `expense-approval` and
`restaurant-ordering` are sibling profiles in the same command) and performs
the full loop against real infrastructure:

1. Starts the dedicated infra stack (postgres + redis) in Docker.
2. Seeds a deterministic Published Compilation (the simple-ecommerce
   composition with `everyday-tote` product and `order-fixture-01` cart
   records) into PostgreSQL; artifact digests are computed from the real
   generated bundle.
3. Starts the Control Plane and the Worker on the host (the probes reach the
   generated application through the host loopback, where Docker Desktop
   publishes the isolated preview). A control-plane boot failure prints the
   captured bounded tail before teardown, so a recurrence is self-diagnosing.
4. Creates one verification run through the public API, waits for the terminal
   status, and asserts the allowlisted evidence: all ten steps passed,
   create/add-line/submit-replay/pay/fulfil/read/denial statuses
   201/201/403/201/201/200/403, cleanup succeeded, no diagnosis persisted, and
   the preview project has no remaining containers.
5. Re-creates the run with the same identity and asserts the same terminal run
   and the same evidence digest are returned without re-enqueueing.
6. Boots the exact materialized bundle as a fresh preview and runs the
   generated application's own journey test suite against the generated
   database.

## Isolated runtime acceptance — passed

Evidence from the green Docker-backed run at the reviewed commit `a4e835c1`
plus the Batch 2 fixture repair (2026-08-08, exit 0). This is the first
runtime acceptance record for the simple-ecommerce profile (the pre-Batch-2
verifier covered only expense-approval):

- Terminal status: `succeeded`; no diagnosis persisted for a passing run.
- Evidence digest:
  `sha256:2f98d7135e88e216212e946cd2824c3946d108f5a12e910e849a2a8b35679aa1`.
- Compilation identity: `cmsjn1csh0001w484k7l16ktb`, artifact digest
  `sha256:8ddc3efa4e14a5f271e7a1ce2d7c9634afcfb4f9090c0a730690c50334626651`,
  profile `simple-ecommerce`.
- Ten step IDs, all `passed`, in plan order: `migration`, `health`,
  `shopper-creates-order`, `shopper-adds-cart-item`, `shopper-submits-order`,
  `shopper-pays-order`, `merchant-fulfils-order`, `shopper-reads-catalog`,
  `shopper-denied-cancel`, `cleanup`.
- Journey HTTP statuses asserted by the harness: create `201`, cart line
  `201`, idempotency replay `403`, pay `201`, fulfil `201`, catalog read
  `200`, denied cancel `403`.
- Idempotent retry: re-creating the run with the same identity returned the
  same terminal run and the same evidence digest without re-enqueueing.
- Preview cleanup succeeded; no `factory-preview-*` containers or volumes
  remained after the run.
- Generated journey tests: `passed` — the bundle's own
  `api/test/journey.generated.test.ts` suite ran inside the generated api
  image against the generated database (audit length, capability event pairs,
  and every declared transition assertion).
- Infra: postgres + redis in Docker; control plane + worker on the host.

The flow moved the seeded record cart -> submitted -> paid -> fulfilled
through the declared flow events: the shopper stocked the cart through the
commerce line route, submitted (the idempotency replay of the same key
returned `403` as the declared probe expects), paid, and the merchant
fulfilled under the merchant fixture session. The denied cancel returned
`403` against the fulfilled record. The preview project and its volumes were
removed after the run.

## Regression this re-run surfaced and closed

The first ecommerce re-run attempt failed with three probe failures:
`order.submit`, `order.pay`, and `order.fulfil` each returned `403` instead
of the declared `201`. Root cause was a verifier-fixture defect, not a
runtime defect: the order-operations runtime computes the payment due from
the cart lines and refuses an empty cart (`Order operations require at least
one cart item.`), and the seeded `order-fixture-01` had no cart line — so
every order operation on it failed closed. Create and the catalog read
passed because they never touch order operations, which is what made the
defect visible only through the real runtime.

Closed at the Batch 2 repair with a platform-authored fixture change (TDD:
failing profile test first): the ecommerce acceptance flow now stocks the
seeded order through the commerce line route before the flow moves it —
a new `shopper-adds-cart-item` role-journey step
(`POST /api/commerce/order/order-fixture-01/items`,
`{"catalogEntity":"product","catalogRecordId":"everyday-tote","quantity":1}`)
between create and submit, pinned by profile tests that assert the step
order, the journey body, and the registry route. The harness's expected step
plan and statuses were extended to the ten-step plan. The re-run above then
passed the full loop end-to-end with the new step in evidence.

## Deterministic checks

Worker (183, 16 files) and Control Plane (184, 18 files) suites pass in full
at the reviewed commit `a4e835c1` plus the Batch 2 fixture repair; both apps
typecheck, build, and lint clean. The repair added one profile test (29 in
the profile suite) asserting the cart-line step's position, journey
declaration, and registry route; the order-progression test now includes the
add-line step. The remaining suites are unchanged from the Task 6 Batch 2
ledger entry.

## Security and retention

No generated source, Published Graph content, credentials, prompts, or raw
probe bodies are persisted by the verification path or retained in this
record. Every per-run credential the harness generates is a synthetic Factory
token (worker token, redis password); the only static credential is the
dedicated infra stack's own local development `factory:factory` database URL,
which is local-only and never exported. Evidence summaries are allowlisted
prose only. The acceptance teardown restores the host (child processes
terminated, infra stack stopped) without removing existing volumes.
