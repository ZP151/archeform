# Order Operations Capability Portfolio Design

Status: accepted for initial portfolio planning by the Factory controller on
2026-08-01.

## Purpose

Make Factory Pilot able to compose mature order-driven products from reusable,
independently verifiable capability packages instead of relying on a
Restaurant-specific compiler runtime. Restaurant Ordering remains the reference
application, but the same package set must support Retail Counter, Grocery
Pickup, Pharmacy Counter, Wholesale Pickup, Equipment Rental, and Field Service
Parts profiles.

The Product Graph remains canonical. Package assets, source studies, direct
dependencies, providers, generated code, and runtime projections remain
adapters or outputs of that Graph.

## Current-state decision

The existing Restaurant Profile has executable table-session, menu, order,
simulated-payment, kitchen, cashier, inventory, reporting, RBAC, audit, and
outbox behaviour. Its physical Restaurant assets exist, but much of the actual
behaviour is emitted by `packages/compiler/src/restaurant-runtime.ts` and
restaurant-specific page renderers. The current result therefore proves a
vertical application but does not yet prove reusable capability composition.

This design does not replace the current Draft -> Publish -> immutable
Compilation lifecycle. It does not make an external project, generated source,
or a visual editor the persistent source of truth.

## Product model

```text
Requirement / visual editing / AI Graph Diff
                |
                v
       Factory Application Graph
                |
                v
      Order Operations capability recipe
                |
                v
  Published locks -> deterministic compilers
                |
                v
Customer application + Merchant application + API + DB + tests + docs
```

The first reusable portfolio contains these capability families:

| Family                    | Graph responsibility                                                       | Initial use                           | Reused by                             |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| Identity and context      | principal, authenticated session, customer/member, location, table/session | customer scope, merchant access       | every Profile                         |
| Catalog and configuration | categories, sellable items, availability, option groups, price lists       | menu and modifiers                    | retail, rental, wholesale             |
| Cart and order            | quote/cart, lines, notes, version, idempotent lifecycle                    | customer cart and merchant amendments | all order-driven products             |
| Inventory                 | stock location, reservation, movement, provenance, adjustments             | availability and depletion            | retail, pharmacy, MRO, warehouse      |
| Payment and settlement    | intent, attempt, provider outcome, refund/reversal, settlement state       | simulated payment first               | deposits, retail, services, events    |
| Fulfilment                | channel, fulfilment unit, ticket, priority, handoff status                 | kitchen display and service           | pickup, delivery, dispatch, repairs   |
| Print and device jobs     | immutable print request, station, device capability, delivery receipt      | browser receipt then print adapter    | POS, warehouse, labels, tickets       |
| Promotion and loyalty     | eligibility, rule, redemption, points ledger, member price                 | deferred package family               | hospitality, retail, fitness, events  |
| Capacity operations       | hold, booking, waitlist, check-in, queue position                          | deferred package family               | reservation, wellness, health, venues |
| Reporting                 | declared metric input, read model, aggregation window, export request      | sales and stock views                 | every operational Profile             |
| Realtime and durable jobs | declared domain event, outbox, job, retry, delivery channel                | KDS/queue notifications               | every asynchronous Profile            |

Each family is expressed as Factory-owned package contracts. A package has a
versioned manifest, exact digest, declared Graph inputs and outputs, static
templates, fixtures, tests, verification evidence, notices, and a removal path.
No package accepts arbitrary source, SQL, JavaScript, URLs, provider secrets, or
unbounded runtime effects through the Graph.

## Restaurant composition

Restaurant Ordering is the first proof recipe, not a special compiler mode. It
selects the generic Order Operations families plus only these Restaurant
extensions:

- `restaurant.table-session` for opaque table QR/manual table entry;
- `restaurant.kitchen` for ticket priority, preparation and ready transitions;
- a Restaurant receipt/serving projection; and
- restaurant operational metrics.

The generated Customer application must contain store/table context, menu
search, configured lines, cart, line and order notes, checkout, status tracking,
receipt, history, and only the enabled fulfilment channels. The generated
Merchant application must contain table/session operations, catalog/stock
management, order/KDS, payment/receipt operations, reporting, audit views, and
policy-aware actions.

The first reusable acceptance scope stays deliberately bounded:

- Customer authentication is a provider-neutral session contract; no real
  WeChat, Alipay, phone, or merchant identity provider is activated in this
  slice.
- Payment remains simulated until a `PaymentProviderV1` contract, webhook
  verification, idempotency, reconciliation, and provider-specific acceptance
  exist.
- Restaurant table/session and KDS semantics are Restaurant extensions;
  appointment, reservation, queue, delivery and loyalty are separately
  versioned generic families.
- Browser-print output is supported before silent device printing. Device
  printing requires a provider contract and a local trusted agent.

## Workbench Home and Profile Catalog

Workbench Home becomes the visible control surface for composition rather than
a static project list. It must show:

- a Profile Catalog grouped by capability family and maturity;
- each profile's selected Golden package versions, required inputs, generated
  targets, provider requirements, and verification status;
- applications grouped by Draft, Published, Compilation, and runtime state;
- a New Application path that starts from a Profile recipe and exposes only
  declared configuration fields;
- an inspectable Definition -> selected packages -> Compilation -> artifact
  lineage; and
- explicit unavailable/deferred capabilities, without presenting them as
  executable features.

The Home summary API returns identifiers, states, bounded package metadata and
artifact summary only. It must not return mutable Draft bodies, raw AI content,
credentials, unreviewed Candidate evidence, or generated source bodies.

## Generated application targets

Every Published Order Operations Graph compiles deterministically to:

1. a customer-focused Next.js application;
2. a merchant-focused Next.js application or role-scoped route group;
3. a NestJS API with XState flow handlers;
4. Prisma schema, migration, seed, and typed data access;
5. Casbin policy plus Nest authorization guards;
6. role-aware browser journeys, API tests, flow tests, and smoke tests;
7. API reference, ERD, permission matrix, component lock, source manifest and
   generated-operation evidence.

All state-changing commands use declared expected versions and idempotency
keys. The transaction that changes order state must atomically persist required
inventory, audit, payment/fulfilment evidence, and an outbox event. Event
transport cannot mutate the order directly.

## External reuse policy and portfolio

External sources are acceleration inputs, never implicit runtime authority.

| Candidate                                                                           | Intended Factory use                                               | Class                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| BullMQ, Socket.IO, OpenFeature, FullCalendar, Radix, TanStack Table, MapLibre       | pinned runtime/UI dependency behind a Factory adapter              | direct dependency candidate |
| FloCafe                                                                             | offline/POS/KDS/print state and recovery source study              | source study                |
| Medusa, Saleor, Sylius, Bagisto                                                     | commerce, pricing, promotion, inventory and return boundaries      | source study                |
| TastyIgniter                                                                        | menu modifiers, scheduled pickup/delivery and reservation concepts | source study                |
| InvenTree, Apache OFBiz                                                             | traceable stock, supplier and order domain seams                   | source study                |
| Stripe, Adyen, OpenTable, Voucherify, Talon.One, Onfleet, OSRM/Valhalla/GraphHopper | payment, reservation, promotion, delivery/routing contracts        | provider adapter candidate  |

Vendure, ERPNext, Plausible, Unleash, Easy!Appointments, Open Source POS, any
enterprise-only path, and any unlicensed or custom-restriction path remain
reference-only unless a later legal decision explicitly changes Factory's
licensing policy.

Before an upstream source can influence a capability package it must pass:

```text
fixed URL + immutable commit/release + artifact digest
  -> quarantine snapshot
  -> license/notices + SBOM + secret/vulnerability scans
  -> source-study record with exact reusable paths
  -> Factory-owned adapter/fixture/conformance plan
  -> reviewed, independently authored Golden package
```

Candidate source never imports into Graph, compiler, generated runtime, or a
Golden package automatically. Candidate Intake is not a source-copy executor.

## Delivery sequence

1. Reconcile the accepted immutable composition boundary with Typed Binding
   Task 2, then complete typed owner-aware Graph selection and admission work.
2. Extract `commerce.cart`, `commerce.catalog`, `commerce.order`, and
   `commerce.line-configuration` behaviour from centralized compiler paths into
   new package versions with exact bindings and handler templates.
3. Extract common inventory, payment, outbox/realtime, receipt and reporting
   boundaries, keeping Restaurant table/KDS projections as small extensions.
4. Add Workbench Home Profile Catalog and a package/lineage inspection model.
5. Add Restaurant, Retail Counter, and Grocery Pickup recipes using the same
   generic package locks but distinct Graph configuration and page projections.
6. Activate live Candidate Intake in separate governed slices: fixed-SHA
   acquisition, safe quarantine materialization, offline scanner adapters and
   generated source-study packets.
7. Add new generic families in priority order: promotion/loyalty, capacity and
   queue, delivery, then provider-specific identity/payment/print adapters.

## Acceptance criteria

The first portfolio acceptance requires all of the following:

- Restaurant, Retail Counter, and Grocery Pickup compile from different
  Published Graphs while sharing the same generic Order Operations package
  versions.
- A generated Restaurant customer journey proves QR/manual table context, menu
  search, selected modifiers, line/order notes, cart update, submit, simulated
  payment, order status, receipt, and history.
- A generated Restaurant merchant journey proves table/session operation,
  menu/availability/stock change, KDS priority transition, simulated cashier
  payment/serve, receipt, cancellation compensation, report and audit evidence.
- Retail and Grocery recipes prove their own cart/order/stock/fulfilment
  journeys without Restaurant table or kitchen entities.
- Missing, unsigned, incompatible or Candidate packages; undeclared adapter
  output; arbitrary provider fields; wrong owner/type bindings; and stale or
  repeated commands all fail closed.
- Profile Catalog displays actual package maturity and compilation state, and
  never claims a deferred provider or Candidate as executable.
- All direct dependencies and copied fragments have fixed versions, notices,
  source studies where required, fixtures, deterministic tests, and removal
  paths.
- Each acceptance runs a guarded real OpenAI Graph-Diff only against a Draft;
  credentials and raw prompts/responses remain absent from state, output,
  evidence and reports.

## Explicit non-goals

This design does not authorize real money movement, payment credentials,
production cloud deployment, customer PII import, external source copying,
Candidate promotion, or a generic arbitrary-code low-code editor. Those require
their own provider, security, deployment, and source-study decisions.
