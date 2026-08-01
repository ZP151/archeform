# Commerce and Operations Foundation Design

## Decision

Factory Pilot will not create a separately maintained restaurant application.
It will expand the Application Graph with reusable commerce and operations
capability families. Restaurant Ordering is the first acceptance profile;
Simple Ecommerce, Retail Counter, Grocery Pickup, booking, delivery, and
service-operation profiles consume the same family contracts where applicable.

## Product outcome

A requirement such as "table-service restaurant with customer ordering and a
merchant kitchen" must resolve to a Published Application Graph that can
compile into a customer application, merchant application, API, database
migrations, policy, role journeys, and operational evidence. The user may
adjust approved visual blocks and declared parameters, but may not introduce
unverified code, routes, database mutation, provider credentials, or external
package references.

The first complete Restaurant acceptance must cover the following flows:

1. A customer enters through a validated table token or a permitted manual
   table lookup, sees the selected location and table context, configures menu
   items, adds line and order notes, submits an order, pays through a simulated
   method, and follows its status through preparation and service.
2. A merchant opens, moves, merges, or closes a table session; manages menu
   availability and stock; sees an ordered kitchen queue; records an order
   amendment, cancellation, or refund; and can inspect the complete audit and
   inventory effect.
3. A manager can inspect bounded sales, item, inventory, and operational
   metrics. Every state-changing command retains actor, time, reason,
   idempotency key, before/after state, and compensating effect.

Real payment, WeChat/Alipay login, card data, money movement, external delivery
dispatch, and production personal-data integrations remain Provider work. The
first Graph compiles provider intent and local fakes only.

## Coverage audit

| Requirement family | Existing reusable assets | Gap to independent acceptance | Target capability family |
| --- | --- | --- | --- |
| Location, table token, table session | `core.location-context`, `restaurant.table-session` | Manual table lookup, table transfer/merge, suspension, and session history are incomplete | `operations.table-session` |
| Menu, modifiers, cart, line/order notes | `commerce.catalog`, `commerce.line-configuration`, `commerce.cart`, `restaurant.menu` | Search/filter, media lifecycle, availability projections, customer history and reorder are incomplete | `commerce.catalog-experience` |
| Submit, pay, kitchen, serve | `commerce.order`, `commerce.simulated-payment`, Restaurant ordering/kitchen/cashier assets | Amends, partial settlement, hold, cancellation after payment, refund, durable compensation, and cross-profile lifecycle remain incomplete | `commerce.order-operations` |
| Inventory | `commerce.inventory`, `commerce.inventory-ledger` | Recipe consumption, low-stock alerts, stock transfer, reconciliation, and reporting integration are incomplete | `commerce.inventory-operations` |
| Merchant operations | Restaurant table, menu, kitchen, cashier, reporting packages | Explicit command ownership and package-owned runtime contributions are not yet fully generic | `operations.console` |
| Membership and promotions | No reusable production family | Tiers, points, vouchers, member price, cart rules, issuance, expiration, and redemption | `commerce.promotion-membership` |
| Reservation and queue | No reusable production family | Capacity, wait estimate, booking, check-in, call/skip, and table assignment | `availability.reservation-queue` |
| Delivery and pickup | Base order fulfilment type only | Pickup windows, dispatch, address/privacy boundary, driver progress, proof of delivery | `commerce.fulfillment` |
| Identity and notifications | Context assets and generic notification intent | Provider-neutral session, customer profile, message templates, consent, and delivery receipt | `identity.party`, `communication.notification` |
| Reporting and operations | Restaurant reporting package | Reusable event projection, period aggregation, exports, alerts, and observability | `analytics.operations` |

The existing Restaurant profile has a bounded customer menu/cart/checkout and
merchant table/menu/kitchen/cashier/analytics surface. It is not proof that the
full capability matrix is independently package-owned, nor proof that the
other commerce profiles are operationally complete.

## Graph and package model

Each capability family must be a set of versioned Factory packages. A package
declares typed Graph inputs, parameter schema, required roles and permissions,
domain contribution, flow contribution, accepted output slots, fixture,
conformance tests, digest, and evidence. A profile is only an immutable
selection and parameterisation of such packages.

```text
Requirement
  -> coverage analysis
  -> selected capability families and validated parameters
  -> Draft Application Graph
  -> Publish immutable revision and composition lock
  -> compiler targets
       customer web | merchant web | API | Prisma migration | policy
       role journeys | simulator | documents | evidence
```

`commerce.order-operations` is the first shared vertical slice. Its Graph
contract owns order states, commands, effects, compensation, idempotency, and
audit semantics. Restaurant-specific kitchen/table presentation and
Ecommerce-specific shipment presentation remain adapters over this neutral
contract.

Initial order commands are:

```text
create-draft, configure-line, submit, hold, release-hold, amend,
capture-payment, record-partial-payment, cancel, refund, accept,
start-fulfilment, mark-ready, complete, reopen-for-correction
```

Every command must declare actor role, state precondition, required request
version, idempotency scope, allowed mutable fields, primary effects,
compensations, audit event, and a deterministic failure result. A package is
not accepted if its flow updates order state without recording the matching
inventory, payment, and audit effects.

## Candidate and provider supply

The Candidate Foundry is the only bulk admission path for external material:

```text
Public metadata discovery
  -> immutable source/version reference
  -> quarantine evidence, licence, SBOM, OSV and source inventory
  -> Candidate contract/fixture/adapter scaffold
  -> narrow source port, pinned dependency, Provider adapter, or reference-only
  -> Factory package conformance and Golden promotion
```

Repository-scale copying is prohibited. A source port must identify a minimal
path-level implementation, preserve licence and notice obligations, include a
replacement test, and remain behind a Factory-owned contract. A full upstream
application is a reference source only because its schema and runtime would
compete with the Application Graph.

The next discovery batches are ordered by reusable leverage:

1. Order amendment, refund, payment-intent, receipt, inventory-reservation,
   kitchen/queue, and delivery/pickup patterns for `commerce.order-operations`
   and `commerce.fulfillment`.
2. Identity, notification, search, export/print, realtime, and observability
   direct dependencies or Provider candidates.
3. Membership, promotion, reservation/queue, document, CRM/support, and
   analytics source studies.
4. Profile templates for booking, appointment, rental, work order, CRM, and
   marketplace, expressed as compositions of the preceding families.

Medusa and Saleor are high-value commerce architecture/source-study references;
Appwrite, Keycloak, Novu, Meilisearch, and Temporal are potential Provider
studies. None obtains Graph, compiler, or generated-runtime authority.

## Workbench Home and studio requirements

The Home must expose product-operational information, not raw source metadata:

- **Profile catalog:** profile purpose, selected package versions, target
  outputs, maturity, independent acceptance status, and missing capability
  families.
- **Requirement coverage:** a generated requirement analysis maps requested
  concepts to supported, configurable, missing, and Provider-dependent
  capability families.
- **Capability supply:** aggregate discovery/quarantine/blocked/Golden counts,
  allowed next action, and impacted Profiles, with no URL, source path,
  licence text, token, raw model material, or executable code.
- **Revision and release evidence:** Draft/Published state, composition lock,
  compilation status, test journeys, generated artifact checksums, and local
  preview availability.
- **Profile composer:** a constrained configuration surface for package
  parameters and allowed PageModel blocks; Graph semantic validation runs
  before a Draft can be published.

The Home must not expose a button that installs a candidate, downloads source,
or lets a user choose a repository, package, URL, command, or provider
credential.

## Acceptance gates

### `commerce.order-operations` package

It is accepted only when one Published Graph can compile both Restaurant and
Simple Ecommerce configurations using the same package version and different
validated parameters. It must prove:

- line and order notes remain scoped and auditable;
- revision conflicts, repeated commands, invalid transitions, and unauthorised
  commands fail closed;
- amendment/cancellation/refund produce deterministic inventory, payment, and
  audit compensations;
- partial payments and holds have explicit sums and terminal state rules;
- kitchen/fulfilment ordering exposes priority and context without leaking
  customer information;
- generated API, database migration, role journeys, simulator, and web targets
  agree on the command contract.

### Restaurant profile

It is independently accepted only when the customer and merchant journeys
listed in this document pass against a compiled Published Revision, including
responsive browser E2E, role-authorisation checks, generated API tests,
database migration, role simulator, and cleanup of its isolated local runtime.

### Future profile catalogue

An application type counts as supported only when it is a named Profile with a
validated parameter schema, package composition, fixtures, published Graph,
compiled targets, and its own acceptance journeys. A source mapping or a UI
mockup never counts as supported profile coverage.

## Delivery order

1. Add a source-free profile coverage contract and show it on the Workbench
   Home.
2. Implement and independently accept `commerce.order-operations`.
3. Migrate Restaurant and Simple Ecommerce to the shared package and prove
   their separate journeys.
4. Add the recurring Candidate Foundry batches and evidence worker for the
   next three family groups.
5. Implement availability/queue, membership/promotion, and fulfilment as
   separate reusable packages.
6. Publish parameterised Profile recipes for food ordering, ecommerce, retail,
   pickup, appointments, booking, rentals, field service, and CRM/support.

## Non-goals

- No live payment, social-login, mapping, delivery, messaging, or customer PII
  Provider is activated in this slice.
- No external project is forked or copied wholesale.
- No Profile declares support solely from a source study, Candidate record, or
  static UI.
- No mutable Draft compiles or deploys.
