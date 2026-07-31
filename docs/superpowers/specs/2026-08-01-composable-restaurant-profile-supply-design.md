# Composable Restaurant Profile Supply Design

**Status:** Proposed implementation design

## Purpose

Make Restaurant Ordering the first deep Profile that proves Factory Pilot can
compose a production-shaped application from reusable capabilities rather than
hand-build a restaurant application. The same assets must remain usable by
Retail Counter, Grocery Pickup, Simple Ecommerce, and later reservation,
service, and hospitality Profiles.

The Application Graph remains the source of truth. A Restaurant Profile is a
typed composition recipe, not a separate runtime or an imported third-party
application.

```text
Published Application Graph
  -> immutable capability selections and locks
  -> shared transaction and domain capability packages
  -> profile page and API projections
  -> simulator, Web, API, database, tests, and documents
```

## Current evidence and gap

The current Restaurant starter has typed entities for tables, table sessions,
menu categories, menu items, modifiers, orders, order lines, payment attempts,
kitchen tickets, and inventory ledger entries. It has customer and merchant
projections, simulated payment, auditable command handling, and bounded local
transaction evidence.

It does not yet prove a reusable Commerce transaction kernel, membership,
promotion, loyalty, reservations, queueing, delivery, actual payment, actual
printer transport, realtime transport, offline recovery, or production
observability. Generic Commerce Profiles do not yet share the Restaurant
transaction boundary. Therefore a Restaurant application must not be described
as production-complete.

## Product model

### Reusable Graph concepts

The following concepts are platform-owned and usable by more than one Profile:

| Graph concept                                                    | Reusable capability family                                          | Initial consumers                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| Product, category, variant, modifier and price rule              | `catalog.product`, `catalog.option`, `pricing.rule`                 | Restaurant, Ecommerce, Retail, Grocery |
| Cart, order, command receipt, state transition and amendment     | `commerce.cart`, `commerce.transaction`, `commerce.order-amendment` | Restaurant, Ecommerce, Retail, Grocery |
| Stock reservation, release, consumption and append-only movement | `commerce.inventory-ledger`                                         | Restaurant, Retail, Grocery, Ecommerce |
| Payment intent, payment reference and settlement projection      | `payment.intent`, `payment.provider`                                | Restaurant, Retail, Ecommerce          |
| Customer, staff membership, roles and consent                    | `identity.member`, `policy.role-assignment`                         | Every Profile                          |
| Campaign, coupon, member price, points and redemption record     | `commerce.promotion`, `commerce.loyalty`                            | Restaurant, Retail, Ecommerce          |
| Reservation, capacity, waitlist and notification intent          | `scheduling.reservation`, `capacity.queue`, `notification.intent`   | Restaurant, Appointment, Service       |
| Pickup, delivery dispatch and fulfillment status                 | `fulfillment.pickup`, `fulfillment.delivery`                        | Restaurant, Grocery, Ecommerce         |
| Receipt document, kitchen slip and printable job                 | `document.receipt`, `document.print-job`                            | Restaurant, Retail, Warehouse          |
| Audit fact, operational event, report projection and export job  | `audit.record`, `analytics.projection`, `data.export-job`           | Every Profile                          |

### Restaurant-only composition

Restaurant-specific assets bind these reusable concepts without redefining
them:

```text
restaurant.table-session
restaurant.menu-service
restaurant.kitchen-board
restaurant.table-operations
restaurant.dining-fulfillment
restaurant.reservation-queue
```

These packages may constrain available Graph symbols, routes, roles, and
capability bindings. They may not replace the shared Commerce schema,
transaction contract, payment contract, or provider boundary.

## Customer and merchant journeys

### Customer application

The generated customer application must compose the following feature groups:

| Feature group                           | First Graph/asset boundary                                      | Initial acceptance journey                                                                                                                       |
| --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity and store selection            | `identity.member`, `location.context`                           | Select a permitted store and restore a remembered preference without placing credentials in the Graph.                                           |
| Table QR entry                          | `restaurant.table-session`                                      | Resolve a signed table-session token into an active table and begin a customer session. A manual table-code fallback is separately policy-gated. |
| Menu browsing                           | `catalog.product`, `catalog.option`, `search.index-projection`  | Browse category, search an available menu item, select valid modifiers, and see a server-derived price.                                          |
| Cart and notes                          | `commerce.cart`, `commerce.line-configuration`                  | Add, remove, and update a line; retain line notes and an order note as separate fields.                                                          |
| Checkout and status                     | `commerce.transaction`, `payment.intent`, `notification.intent` | Submit once with an idempotency key, receive a safe receipt, and observe order/kitchen/fulfillment status.                                       |
| History and repeat                      | `commerce.order-history`                                        | View only the caller's permitted history and copy a prior order into a new mutable cart.                                                         |
| Promotion and membership                | `commerce.promotion`, `commerce.loyalty`                        | Apply a validated promotion decision and append a redemption or points event.                                                                    |
| Reservation, queue, pickup and delivery | `scheduling.reservation`, `capacity.queue`, `fulfillment.*`     | Request a reservation, waitlist place, pickup, or delivery quote through declared capability contracts.                                          |

The MVP customer journey is intentionally smaller: table entry, menu, modifier,
cart, simulated payment, submitted-to-ready status, and receipt. It must reach
checkout in no more than three primary user actions after a valid table entry.

### Merchant application

The generated merchant application must compose the following feature groups:

| Feature group                | First Graph/asset boundary                                                       | Initial acceptance journey                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tables and service           | `restaurant.table-operations`                                                    | Open, transfer, merge, split, suspend, and resume table contexts with an audit fact for each operation.                     |
| Menu and inventory           | `catalog.product`, `catalog.option`, `commerce.inventory-ledger`, `pricing.rule` | Change availability or price only with role permission; generate a stock movement and an auditable effective price.         |
| Kitchen and order operations | `restaurant.kitchen-board`, `commerce.transaction`, `commerce.order-amendment`   | Order is ranked by priority and table; transition, cancel, or amend it without duplicated stock or evidence.                |
| Cashier and settlement       | `payment.intent`, `payment.provider`, `document.receipt`                         | Record one or more bounded payment references, reconcile status, and create a receipt document without retaining card data. |
| Marketing and membership     | `commerce.promotion`, `commerce.loyalty`                                         | Issue a validated campaign or member event and preserve the decision/audit trail.                                           |
| Operations reporting         | `analytics.projection`, `data.export-job`                                        | View generated sales, category, order-state, stock-alert, and repeat-visit projections; run exports as jobs.                |
| Security and governance      | `identity.member`, `policy.role-assignment`, `audit.record`                      | Enforce role/resource/action policies, show redacted audit records, and submit export/import jobs.                          |

## Shared Commerce transaction contract

`commerce.transaction/v1` is the first mandatory implementation boundary. It
must be selected from Golden package locks and used by Restaurant, Simple
Ecommerce, Retail Counter, and Grocery Pickup.

One command transaction must:

1. validate a scope-local idempotency key and canonical payload digest;
2. claim or replay an immutable command receipt;
3. conditionally update the aggregate at the supplied version;
4. apply inventory movements and compensation rules;
5. append audit, capability, and outbox facts;
6. complete the receipt with a defensive, redacted outcome; and
7. commit or roll back all writes together.

The generated API must reject a changed payload using the same key, return a
safe current-state conflict for a stale version, and never double-reserve stock
under concurrent replay. A generic provider or Profile must not bypass this
contract with raw SQL, arbitrary code, webhook input, or an unscoped command.

## Workbench capability operations

The Home surface must become an operational starting point, not a read-only
metric dashboard. It gains these source-free actions and projections:

| Home capability                  | Action                                                                                                                       | Boundary                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Profile capability map           | Open a Profile, inspect available/partial/planned/provider-required capability groups, and view dependent generated targets. | Never exposes upstream source or raw candidate material.                    |
| Gap-driven composition           | Start a Draft from a Profile and choose only Golden optional packages or declared Provider placeholders.                     | Draft remains mutable; compilation consumes only Published Graphs.          |
| Candidate supply queue           | View aggregate Candidate stage, required evidence gates, target family, and blocked reason category.                         | No source bytes, URLs, paths, prompts, credentials, or automatic promotion. |
| Provider readiness               | View a provider contract's configured/unconfigured state and its affected Profile capabilities.                              | Provider credentials remain process-local.                                  |
| Compilation and journey evidence | Open a generated target's deterministic build, smoke, and journey status.                                                    | Does not treat a successful build as Profile acceptance.                    |

The first Home slice is a `Restaurant Profile capability map` with drill-down
to reusable family, maturity, dependency, selected package version, evidence
summary, and next eligible action. It replaces ambiguous numeric maturity with
an actionable path to capability completion.

## Reuse and acquisition lanes

The portfolio is processed automatically, but external source is never directly
selectable by a Draft or compiler.

| Lane                  | Use                                               | Examples                                                           | Automated evidence                                                                        |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Pinned dependency     | Small infrastructure or rendering library         | BullMQ, ReceiptLine                                                | release pin, license/notice, SBOM, vulnerability scan, wrapper contract                   |
| Provider adapter      | Mature system with its own runtime or data plane  | Keycloak, Meilisearch, Novu, Square, Adyen, Waitwhile, Uber Direct | provider contract, fake, secret isolation, error/idempotency and redaction tests          |
| Selective source port | Small, pure, permissively licensed utility        | exact MIT/Apache/BSD/ISC source fragment only                      | fixed SHA, path/range ledger, notice, scanner results, fixture, conformance, removal test |
| Reference only        | Product semantics or incompatible runtime/license | TastyIgniter, Saleor, Odoo, ERPNext, Vendure                       | fixed study record; no dependency, copied source, schema, UI, or runtime                  |

The supply lane must progress from fixed source record to quarantine, evidence
bundle, source-study finding, Candidate port plan, package scaffold,
conformance result, and only then Golden eligibility. It must fail closed on
license ambiguity, source drift, unsafe source path, scanner failure, or a
failed fixture.

## Delivery sequence

1. Implement and accept `commerce.transaction/v1` plus
   `commerce.inventory-ledger/v1` across the four Commerce Profiles.
2. Migrate compiler-owned cart, catalog, and order behavior into package-owned
   handlers selected by immutable locks.
3. Implement Restaurant capability packages for table operations, kitchen
   board, menu service, reservation/queue, and dining fulfillment.
4. Add the Workbench Profile capability map and Candidate supply queue.
5. Activate automated fixed-SHA acquisition, materialization, scanning, and
   Candidate package scaffolding in the quarantine-only intake toolchain.
6. Add Provider contracts for identity, notification, search, printing, payment,
   and fulfillment. Activate none until a dedicated Profile/provider acceptance
   slice proves its fake, contract, and secret boundary.
7. Add promotion, loyalty, reporting, export, and offline/realtime strategy
   only after transaction and event-outbox evidence is accepted.

## Acceptance gates

The Restaurant Profile is independently accepted only when all applicable
journeys compile from one Published Graph and locked assets:

- table session or authorized manual table entry;
- menu search, valid modifier selection, line note, and order note;
- idempotent submit, simulated payment, kitchen priority, ready status, and
  customer receipt;
- merchant table, menu availability, inventory, kitchen, and cancellation
  operations with auditable inventory impact;
- concurrent replay, stale-version, failure rollback, and data-isolation tests;
- generated Web/API/database/test/document artifacts and role-aware browser
  journeys; and
- a real-model Graph-Diff run guarded by local environment credentials, with no
  credential, raw prompt, or raw response persisted.

Real payments, financial settlement, delivery accounts, printer bridges,
membership providers, and production offline guarantees remain independent
Provider acceptance slices. Their configuration status must be visible, but a
missing provider must never make a generated application falsely claim the
capability is active.
