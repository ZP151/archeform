# Platform and Profile Completeness Audit

Updated: 2026-08-01

## Scope and method

This audit describes the checked `main` worktree only. It distinguishes code
and repeatable tests from roadmap intent, stale status records, and external
research. It does not treat an asset manifest, a source Candidate, or a
skipped browser test as proof that a generated product is production-ready.

## Implemented foundation

Factory Pilot has a functioning Graph-first local platform:

- A mutable Draft can be published to an immutable compilation input.
- The compiler emits a web application, NestJS API, Prisma schema and
  migrations, Casbin policy, XState flow code, tests, documentation, and a
  revision-isolated Compose definition.
- The worker has a bounded artifact materialisation and preview lifecycle.
- The Workbench exposes a source-free portfolio/readiness projection.
- Capability assets are physical, versioned directories with an exact lock,
  manifest digest, fixture, contract evidence, and declared output targets.

The checked asset directory contains **20 asset families** and **43 versioned
asset packages**. The five shipped starter Profiles are Expense Approval,
Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.

The current Restaurant graph is materially richer than a label-only starter:
it contains separate table-session, menu, ordering, kitchen, cashier, and
reporting assets, customer/merchant routes, domain entities, policy roles,
flows, inventory provenance checks, and profile validation. The same shared
commerce operations package is selected by Restaurant, Ecommerce, Retail
Counter, and Grocery Pickup.

## Proven behaviour, not inferred behaviour

The following has current focused regression evidence:

- The shared `commerce.order-operations@1.1.0` package plans locked holds,
  amendments, cancellation, payment capture, refund, inventory effects, and
  audit actions.
- The generic generated commerce runtime resolves the planner only through a
  locked package and validates its declared Graph bindings.
- Restaurant's specialised transaction runtime, generated customer/merchant
  pages, and worker materialisation paths have compiler/worker test coverage.
- The Candidate Foundry discovers fixed external source metadata into a
  quarantine-only Candidate pipeline. It neither downloads executable source
  into a generated application nor promotes a Candidate to Golden.

This is a composable foundation, not proof of a broad production application
catalogue.

## Material gaps

### Runtime completeness

1. `commerce.order-operations@1.1.0` now declares and compiles a persistent
   payment/idempotency receipt for the generic commerce runtime. It has focused
   compiler evidence, but it has not yet been exercised against a fresh
   PostgreSQL-backed generated application.
2. Restaurant has a specialised transactional path with its own persistent
   command, payment, receipt, inventory, and idempotency records. The generic
   package's persistence contribution is intentionally consumed by Ecommerce,
   Retail Counter, and Grocery Pickup; the equivalence of their shared order
   invariants still needs generated-application evidence.
3. No fresh isolated generated Restaurant and Ecommerce Compose runs have
   completed their browser role journeys for the current asset locks. Existing
   generated-app Playwright suites are environment-gated; a skipped test is
   not acceptance evidence.
   A fresh Restaurant Workbench flow has reached immutable publication,
   successful compilation, generated customer and merchant actions, and
   preview teardown. The teardown then reported `preview_stop_failed` even
   though its generated preview resources were removed. Until that lifecycle
   state-reporting failure is reproduced and repaired, the run is diagnostic
   evidence only and is not Profile acceptance.
4. Generated local applications do not yet provide production-grade identity,
   real payment, notification delivery, printing, realtime events, delivery
   dispatch, observability, backup, or managed deployment. Those are Provider
   or platform slices, not local template additions.

### Capability portfolio completeness

The present catalogue is concentrated in CRUD/workflow/audit and commerce.
It cannot honestly claim support for one hundred production scenarios. The
highest-leverage gaps are shared families rather than one-off Profile screens:

| Portfolio family                       | Reuses                                   | Current state     | Next proof                                                       |
| -------------------------------------- | ---------------------------------------- | ----------------- | ---------------------------------------------------------------- |
| Identity and sessions                  | all customer/workforce Profiles          | provider-required | neutral OIDC/session contract plus local fake                    |
| Decimal money, pricing, promotions     | commerce, invoice, expense, subscription | partial           | deterministic amount/promotion asset and properties              |
| Persistent orders and inventory ledger | restaurant, ecommerce, counter, pickup   | partial           | transactional receipt/idempotency and exactly-once stock tests   |
| Reservations, queue, scheduling        | restaurant, care, services, events       | planned           | bounded availability/booking state machine                       |
| Fulfilment and delivery                | restaurant, grocery, commerce, logistics | planned           | provider-neutral fulfilment contract and local simulator         |
| Notifications and inbound messages     | all operational Profiles                 | partial           | durable outbox plus fake email/SMS adapters                      |
| Media, files, documents                | catalog, support, compliance             | planned           | quarantine/derivative asset and policy fixture                   |
| Search and import                      | catalog, CRM, support, procurement       | planned           | tenant-filtered derived index and hardened import contract       |
| Reporting and analytics                | all Profiles                             | partial           | read-model/report contract, not direct database queries          |
| Release, observability, and fleet      | all generated applications               | planned           | deployment manifest, health, logs, upgrade and rollback evidence |

### Workbench completeness

The Workbench can create, edit, publish, and compile Graph-backed starters,
but it is not yet the low-friction thirty-minute product-creation experience.
The critical missing user path is a guided requirement-to-Graph proposal,
pre-populated Page/Domain/Flow/Policy choices, role simulation, and a visual
generated-preview review before Publish. Visual polish must be driven by the
same component system that generated applications use; it is not a separate
console skin.

## External reuse position

Whole-repository copying is not a scalable or safe strategy. A complete
application repository contains an upstream schema, runtime assumptions,
licence obligations, and security surface that will conflict with the
Factory Application Graph. It also fails the requirement that generated
applications remain reproducible from locked assets.

The scalable fast path is:

```text
Fixed-source discovery
  -> quarantine evidence and module inventory
  -> source study
  -> one approved reuse mode
  -> Factory-owned contract, fixture, and removal test
  -> versioned Golden asset or pinned Provider
```

The permitted reuse modes are a pinned direct dependency, an adapter around a
provider, a template adapter, a selective source port with attribution and a
removal test, or reference-only. A Candidate has no compiler or Graph authority
until it passes that route. This allows one reviewed module to support dozens
of Profiles without importing an entire upstream product.

The existing Candidate Foundry already has fixed-reference discovery,
licence/evidence gates, source-study records, candidate scaffolds, and
non-promoting port plans. The missing acceleration is an automated Discovery
Index plus triage/release lanes, so that the next family does not require a
manual discovery exercise from scratch.

On 2026-08-01, a no-write GitHub metadata trial covered the identity,
catalog, commerce-transaction, inventory, availability, queue, and payment
families. It returned 140 repository records: 28 met the fixed-reference and
declared-licence preflight, and 112 were blocked by policy. Anonymous GitHub
API rate limiting stopped the remaining families. The trial persisted no
Candidate or source content. This confirms that the next Foundry slice needs
bounded read-token support, cache/continuation state, and rate-aware batches;
it does not constitute approval of any discovered source.

## Acceptance baseline for the next iteration

The next iteration must first accept a shared persistent order-operations
asset and prove one new isolated generated Restaurant run and one Ecommerce
run. It then expands a reusable capability family only when that family has a
locked asset or Provider contract, fixtures, validation, generated output,
and a cross-Profile journey. Counting templates or external Candidates does
not advance the portfolio claim.
