# Restaurant Ordering MVP design

Status: approved by the Factory Pilot controller authority on 2026-07-30.

## Purpose

Make Restaurant Ordering the first substantial, independently accepted Factory
Pilot Profile. A business user must be able to create a Restaurant Ordering
Draft from the Workbench, edit its Factory Application Graph, publish it, and
compile a runnable application with distinct customer and merchant experiences.
The generated application must use the same Published Graph for its UI, API,
database migration, policies, flows, documentation, and role journeys.

This design is a vertical product slice, not a replacement for the complete
restaurant roadmap. It establishes reusable assets and Graph semantics that
later Profiles can compose without treating an upstream POS, commerce platform,
or generated source code as a source of truth.

## Evidence and current gap

The current Profile proves a narrow menu -> cart -> simulated payment ->
kitchen-ready journey. It has three generic pages, a minimal `menu-item` and
`order` domain model, an in-memory-shaped commerce abstraction backed by
Prisma in generated runtime, and a focused browser journey. It does not yet
have table-session context, notes, merchant operations, cancellation
compensation, reporting, a useful Workbench home, or customer/merchant page
projections.

Focused unit evidence on 2026-07-30 is green: 26 capability tests, 88 compiler
tests, and 55 Workbench tests. This is development evidence only because the
host Node version is 24 while the supported version is Node 22; generated
application acceptance must run in the isolated Docker environment.

## Product boundary

### In the first independent acceptance

The first Restaurant Ordering application is a dine-in, single-location,
simulated-payment product.

Customer experience:

- Enter from an opaque, signed, expiring table-session token, or enter a
  table code manually when the table is active.
- Browse an available menu by category, search by name, inspect a menu item,
  add it to a cart, set quantity, set per-line modifiers and notes, and set an
  order-level note.
- Submit and pay a full simulated amount using a selected simulated method.
- Observe the order progressing through submitted, paid, accepted, preparing,
  ready, and served.
- See a receipt view and their current session's order history.

Merchant experience:

- Open, seat, and close tables; create and invalidate table sessions.
- Create, edit, enable, disable, and stock menu items and categories.
- View a kitchen board sorted by declared priority, paid time, then table
  number. Kitchen roles can accept, start, and mark orders ready.
- Use a cashier surface to capture a simulated full payment, mark an order
  served, and render a browser-printable receipt.
- Cancel an eligible order, recording the reason, audit evidence, and stock
  compensation.
- View a small operational dashboard: sales total, order count, average
  preparation time, cancellations, and low-stock menu items.

Factory Workbench experience:

- Add a functional Home surface that shows applications, their Profile,
  Draft/Published state, most recent compilation state, and direct actions to
  create or open an application.
- The Restaurant starter remains a normal mutable Draft; all Graph changes use
  the existing Draft -> Publish -> immutable Compilation lifecycle.
- Page, Domain, Flow, Policy, AI, Code, and timeline surfaces continue to edit
  or inspect the same Graph. There is no Restaurant-only side channel.

### Explicitly deferred but required by the long-term objective

- Phone, WeChat, Alipay, and account-based sign-in; a first customer identity
  provider contract must precede any real identity integration.
- Real money movement, payment credentials, refunds, automatic settlement, and
  payment-provider SDKs. The first payment methods are immutable simulated
  payment attempts only.
- Partial payments, split bills, credit/hang accounts, and ledger settlement.
- Table merge, table transfer, order suspension/resume, reservations, queueing,
  delivery, pickup, reviews, loyalty, coupons, member pricing, and marketing.
- Silent thermal printing, native mobile clients, 3D menu content, social
  sharing, and AI recommendations.
- Offline mutation replay. The initial generated Web application may later
  cache shell and menu reads, but order and payment changes remain online and
  server-authoritative until idempotency and conflict support are accepted.

These are not discarded requirements. They become separately versioned
capabilities after this Profile has an independent acceptance record.

## Application Graph contract

`ApplicationGraphV1` stays the canonical six-model document. Restaurant
semantics are declared through its Domain, Policy, Flow, Page, and Integration
models; no new untyped `restaurant` JSON blob is added.

The Restaurant composition profile uses `integration.compositionProfile` set
to `restaurant-ordering` and locks only Golden capability asset versions. A
profile-specific semantic validator in `@factory/capabilities` validates the
Restaurant contract after the base `@factory/graph` validator succeeds.

### Required domain entities

| Entity                | Required fields                                                                                                                          | Purpose                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `restaurant-location` | `name`, `currency`, `active`                                                                                                             | The single accepted location and its currency.                                    |
| `restaurant-table`    | `code`, `number`, `status`, `active`                                                                                                     | A physical table and its operational state.                                       |
| `table-session`       | `tableCode`, `tokenDigest`, `status`, `openedAt`, `expiresAt`, `guestCount`                                                              | The customer entry boundary; tokens are stored only as a digest.                  |
| `menu-category`       | `name`, `sortOrder`, `active`                                                                                                            | Customer menu grouping.                                                           |
| `menu-item`           | `categoryKey`, `name`, `description`, `price`, `available`, `stock`, `preparationMinutes`, `imageUrl`                                    | Saleable menu entry and stock counter.                                            |
| `order`               | `tableSessionId`, `status`, `paymentStatus`, `fulfilmentType`, `orderNote`, `priority`, `total`, `orderVersion`, `submittedAt`, `paidAt` | Order state and concurrency-visible version.                                      |
| `order-line`          | `orderId`, `menuItemId`, `quantity`, `unitPrice`, `lineNote`, `modifiers`                                                                | An item, its note, and selected declared modifiers.                               |
| `payment-attempt`     | `orderId`, `method`, `amount`, `status`, `idempotencyKey`, `paidAt`                                                                      | Simulated, full payment evidence.                                                 |
| `kitchen-ticket`      | `orderId`, `tableNumber`, `priority`, `status`, `acceptedAt`, `startedAt`, `readyAt`                                                     | Kitchen board projection.                                                         |
| `inventory-ledger`    | `menuItemId`, `orderId`, `delta`, `reason`, `recordedAt`                                                                                 | Immutable inventory evidence for reservation, decrement, release, and adjustment. |

The Profile may add presentation-only fields, but it cannot remove these
entities or change the meaning of their required fields. Database relations are
declared in `DomainModel.relations`; generated persistence must maintain
referential consistency even where the generic Graph relationship vocabulary
does not encode a database foreign-key name.

### Required policies and roles

| Role       | Scope                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `customer` | Reads published active menu data and creates/reads records tied to its verified table session. |
| `kitchen`  | Reads paid kitchen tickets and transitions accepted/preparing/ready workflow states.           |
| `cashier`  | Reads active orders, records simulated payment attempts, serves orders, and renders receipts.  |
| `manager`  | Manages tables, menu, stock adjustments, cancellations, audit evidence, and reporting.         |

`x-factory-role` remains test-only generated-app role simulation. It is not an
authentication mechanism. The customer runtime uses a table-session token
resolver; merchant authentication is a later provider capability. Generated
Casbin rules remain the enforcement source for every role-to-resource-action
decision.

### Required flows

`table-session` states: `open -> active -> closed`, with expiry as a system
transition that prevents future customer mutations.

`order` states: `cart -> submitted -> paid -> accepted -> preparing -> ready
-> served`, with `cancelled` reachable only from declared eligible states.

- `submit` records the order and reserves stock.
- `pay` creates exactly one successful full simulated payment attempt for the
  current order version, decrements reserved stock, and creates a kitchen
  ticket.
- `accept`, `start-preparing`, and `mark-ready` are kitchen-only actions.
- `serve` is cashier-only.
- `cancel` requires a non-empty reason, records audit evidence, and releases
  reserved inventory when it has not been consumed. A paid cancellation is
  recorded as a simulated reversal request, not an external refund.

All state-changing command endpoints receive an expected `orderVersion` and
an idempotency key. A stale version returns a conflict with current state; a
repeated idempotency key returns the first completed outcome without repeating
inventory or audit effects.

### Required page blocks and route groups

The compiler adds these bounded PageModel block types, each with a typed
Factory projection rather than arbitrary React component references:

| Group    | Route examples                                                                                        | Block types                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Customer | `/table/:token`, `/menu`, `/cart`, `/orders/current`, `/receipt/:id`                                  | `restaurant-entry`, `menu-browser`, `order-cart`, `payment-checkout`, `order-tracker`, `receipt` |
| Merchant | `/merchant/tables`, `/merchant/menu`, `/merchant/kitchen`, `/merchant/cashier`, `/merchant/analytics` | `table-board`, `menu-manager`, `kitchen-board`, `cashier-console`, `restaurant-dashboard`        |

Each block receives only data declared by the validated profile projection.
Generated Web code cannot receive arbitrary component names, URLs, executable
props, provider credentials, or page scripts from a Graph.

## Capability packages and compiler boundary

The initial package set is Factory-owned and independently versioned:

| Asset                      | Main operations                                                     | Primary compiler outputs                                          |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `restaurant.table-session` | create, validate, close, expire                                     | API resolver, database model, customer-entry page block, fixtures |
| `restaurant.menu`          | category/list/search, create/update, availability, stock adjustment | API module, customer menu, merchant menu management, fixtures     |
| `restaurant.ordering`      | add/update/remove line, submit, cancel, history                     | transactional API module, order/cart/track blocks, tests          |
| `restaurant.kitchen`       | create ticket, prioritise, accept, prepare, ready                   | API module, kitchen board, event projection, tests                |
| `restaurant.cashier`       | simulate payment, reversal request, serve, receipt projection       | API module, cashier and receipt blocks, tests                     |
| `restaurant.reporting`     | operational aggregates and low-stock query                          | read-model module, dashboard block, fixtures                      |

The Profile continues to lock and compose `core.audit`, `core.crud`,
`core.notification`, `core.workflow`, `commerce.catalog`, `commerce.cart`,
`commerce.inventory`, `commerce.order`, and `commerce.simulated-payment`.
The new Restaurant assets are not metadata aliases: each has a package root,
manifest, adapter declaration, templates, fixtures, contract test, digest,
version, and Golden verification evidence.

The compiler must create a generated NestJS/Prisma transaction boundary for
each state-changing Restaurant command. It must not fall back to
`InMemoryRecordStore` for a generated Restaurant application. The transaction
commits the order change, payment/inventory/audit records, and an outbox event
atomically. A delivery adapter may emit the committed event to realtime
clients, but no event transport may directly perform a workflow transition.

## Workbench Home

Home is a first-class Workbench surface, not a marketing page or a second
console. It uses a new Control Plane application-summary endpoint to display:

- applications grouped by Profile, with Draft, Published, and latest
  compilation status;
- recent applications and failed compilation attention states;
- a New Application entry point that reuses the left-side guided creation
  drawer;
- direct Open and Compile actions that respect Draft/Published lifecycle
  constraints; and
- Profile cards showing the maturity and capabilities of their Golden assets.

The Home endpoint returns summaries only. It must never include raw model
prompts/responses, credentials, generated artifact contents, or mutable Draft
Graph bodies. Opening an application retains the existing exact Graph fetch
and bootstrap path.

## External project policy

The current adoption decision is recorded in
`docs/ecosystem/open-source-adoption.md` and
`docs/market-validation.md`.

- Workbox, TanStack Query, Socket.IO, `qrcode.react`, `react-to-print`, and
  Apache ECharts are candidate pinned dependencies behind generated-runtime
  adapters. No candidate is automatically added by this design.
- Medusa, Saleor, Centrifugo, and QZ Tray are future provider or adapter
  contracts, not initial runtime dependencies.
- Vendure, ERPNext, Plausible, and Open Source POS are reference-only and
  excluded from source, packages, generated output, assets, and runtime.
- A source study, exact release or commit, licence decision, notices, fixture,
  security evidence, and removal path are mandatory before a candidate reaches
  `package.json` or a Factory capability package.

## Error handling and safety

- Invalid, expired, closed, or tampered table tokens fail before a customer
  can read or mutate session-scoped data.
- Invalid menu availability, insufficient stock, stale order version, duplicate
  idempotency key with different payload, invalid state transition, or denied
  Casbin permission produces a typed API error and leaves persistent state
  unchanged.
- Payment and stock updates are never optimistic client truth. The generated
  UI handles conflict and retry outcomes without creating new mutations.
- Audit and inventory-ledger entries are append-only generated persistence
  records. A manager cancellation cannot delete historical evidence.
- Receipts contain no credentials, provider secrets, or raw AI content.

## Acceptance evidence

The Restaurant Profile is accepted only when all evidence below is collected
in an isolated Node 22 Docker environment:

1. Profile validation rejects a Restaurant Graph missing required entities,
   roles, capability locks, page routes, flow events, or invariants.
2. A Published Restaurant Graph deterministically compiles to customer Web,
   merchant Web, NestJS API, Prisma schema/migration/seed, Casbin policy,
   XState flows, generated tests, API reference, ERD, and permission matrix.
3. The generated Compose project boots PostgreSQL, migration, API, and Web;
   its cleanup command removes only its own named containers, networks, and
   volumes.
4. A browser journey proves table-session entry, menu search, item and order
   notes, cart quantity, submit, simulated pay, customer status view, kitchen
   transition sequence, cashier serve, receipt, and session order history.
5. A merchant journey proves table open/close, menu availability change, stock
   adjustment, low-stock dashboard, cancellation reason, inventory
   compensation, and audit evidence.
6. Tests prove stale and duplicate command handling; cancelled and failed
   payment paths do not double-decrement inventory or duplicate audit entries.
7. Workbench browser tests prove Home summaries, creation from the Restaurant
   Profile, opening the application, Draft editing, publishing, compilation,
   and artifact inspection.
8. The existing Expense Approval and Simple Ecommerce profile tests still pass.
9. A guarded real OpenAI Graph-Diff run changes only a Draft and is rejected if
   it selects packages, paths, URLs, arbitrary code, or undeclared Restaurant
   capabilities. Credentials, raw prompts, and raw responses are absent from
   database state, artifacts, test output, screenshots, and reports.

## Delivery sequence

1. Add base profile semantic validation, Restaurant asset contract vocabulary,
   and a profile-complete starter Graph.
2. Add Customer and Merchant PageModel projection types and generated
   application route/runtime support.
3. Make generated Restaurant commands transactional with Prisma, versioning,
   idempotency, audit, inventory, and outbox evidence.
4. Implement Restaurant asset packages and their compiler contributions.
5. Add the Workbench Home summaries and application operations.
6. Build Docker and browser acceptance for the customer and merchant journeys.
7. Start a new profile-source-study intake only after this acceptance is green;
   each new Profile repeats the same Graph-first acceptance pattern.
