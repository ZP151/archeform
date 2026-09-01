# Restaurant capability subgraph map

Date: 2026-08-01

Status: product architecture and delivery specification; no implementation or
adoption decision

## Decision

Restaurant Ordering should grow by composing reusable Application Graph
capability subgraphs, not by adding more behavior to the Restaurant-specific
compiler path. The current local Restaurant MVP remains accepted at its
implemented scope. This document preserves that evidence, separates it from
planned work, and maps the desired Customer and Merchant product to capability
packages that can also serve Ecommerce and later Profile recipes.

This map is grounded in:

- the completed
  [Restaurant requirements audit](../audits/restaurant-ordering-requirements-audit.md)
  and accepted
  [Restaurant MVP evidence](../acceptance/restaurant-ordering-mvp.md);
- the
  [Parameterized Capability Composition evidence](../acceptance/parameterized-capability-composition.md)
  and its later
  [accepted project ledger](../superpowers/ledgers/2026-07-30-parameterized-capability-composition.md);
- the
  [Commercial Capability Foundation ledger](../superpowers/ledgers/2026-07-30-commercial-capability-foundation.md);
- the approved
  [profile ecosystem portfolio](2026-08-01-profile-ecosystem-portfolio.md);
- the accepted
  [External Capability Intake design](../superpowers/specs/2026-07-31-external-capability-intake-design.md)
  and its
  [live delivery ledger](../superpowers/ledgers/2026-07-31-external-capability-intake.md);
- the current [project status](../project-status.md).

Public ecosystems in the portfolio are demand evidence only. This document
approves no dependency, provider, Candidate, source copy, or external runtime.

## How to read the classifications

The labels below are stricter than the audit's user-feature labels because this
document evaluates the reusable subgraph boundary as well as visible behavior.

| Label       | Meaning                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Present** | The capability boundary or platform invariant has accepted current evidence at the stated scope, including generated behavior where the row requires it.                            |
| **Adapt**   | Accepted Restaurant behavior or an accepted physical Golden contract exists, but extraction, profile composition, generic runtime, UI, or broader proof is still required.          |
| **Gap**     | No supported Graph capability and generated product proof exists for the requested behavior. A field, permission, research reference, or provider idea alone is not implementation. |

These labels do not advance any project ledger. In particular, the four
Commercial Capability Foundation packages are physically accepted Golden
contracts, but their Restaurant/Ecommerce recipes, generic runtime, Workbench
surface, and cross-profile release evidence remain planned.

## Actual architecture baseline

Evidence precedence matters. `docs/project-status.md` was last updated on
2026-07-30 and still describes Parameterized Capability Composition at its Task
5 gate. The later project ledger records Tasks 1 through 5 as accepted after
review, QA, release review, and fresh verification. This map uses that later
ledger state. The still later Commercial Capability Foundation ledger records
only its Task 1 as accepted and Tasks 2 through 5 as planned.

### Accepted reusable composition and runtime

Restaurant Ordering and Simple Ecommerce have accepted generated proof using
the same nine immutable package identities with different Graph-symbol
bindings:

- `commerce.cart@1.0.0`
- `commerce.catalog@1.0.0`
- `commerce.inventory@1.0.1`
- `commerce.order@1.0.0`
- `commerce.simulated-payment@1.0.1`
- `core.audit@1.0.1`
- `core.crud@1.0.1`
- `core.notification@1.0.1`
- `core.workflow@1.0.1`

The persisted composition lock, rather than mutable Graph asset locks or a
profile-name switch, supplies the migrated shared-package inputs. The accepted
proof covers deterministic compilation and isolated Node 22 generated journeys.
It does not prove the missing Restaurant features in this map.

### Accepted contracts without product integration

Commercial Capability Foundation Task 1 accepted these physical Golden
packages and their Publish-time byte/evidence verification:

- `core.identity-context@1.0.0`, providing
  `core.principal-context/v1`;
- `core.location-context@1.0.0`, providing
  `core.location-context/v1`;
- `commerce.line-configuration@1.0.0`, providing
  `commerce.configured-line/v1`; and
- `commerce.inventory-ledger@1.0.0`, providing
  `commerce.stock-movement/v1`.

They are not yet accepted Restaurant/Ecommerce product behavior. Foundation
Tasks 2 through 5—profile recipes, generic generated runtime, Workbench
visibility, and cross-profile acceptance—remain planned.

### Accepted Restaurant behavior that still needs extraction

The Restaurant MVP has accepted Customer and Merchant behavior implemented
through the full Restaurant Graph, six Restaurant-specific capability assets,
and remaining Restaurant compiler/runtime modules:

- `restaurant.table-session`
- `restaurant.menu`
- `restaurant.ordering`
- `restaurant.kitchen`
- `restaurant.cashier`
- `restaurant.reporting`

These assets and modules are evidence that the behavior works locally. They are
not proof that the behavior is independently selectable, parameterized, or
reusable. Removing them before replacement subgraphs have generated parity
would regress the accepted MVP.

## Target subgraph architecture

Every package in the desired architecture is a versioned, Factory-owned Golden
capability. It contributes only declared Graph and generated-target fragments,
binds only validated Graph symbols or other constrained parameter types, and
declares exact `requires` and `provides` interfaces. A Profile is a recipe of
package identities and bindings; it is not a cloned vertical application.

| Layer                       | Responsibility                                                                                          | Representative boundaries                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Core context and governance | Principal, location, policy, audit, workflow, notification, event facts                                 | `core.principal-context/v1`, `core.location-context/v1`, `core.event-envelope/v1`                                                      |
| Commerce facts and commands | Catalogue, configured lines, cart, order, amendments, stock movements, prices, payment intent, receipts | `commerce.catalog-item/v1`, `commerce.configured-line/v1`, `commerce.cart/v1`, `commerce.order-event/v1`, `commerce.stock-movement/v1` |
| Hospitality overlays        | Tables, sessions, kitchen queue, reservation capacity, service state                                    | `hospitality.table-context/v1`, `hospitality.kitchen-ticket/v1`, `reservation.capacity/v1`                                             |
| Experience and read models  | Customer/Merchant pages, receipt/print documents, dashboard projections, offline reads                  | PageModel contributions, `receipt.document/v1`, `analytics.operational-read-model/v1`, `offline.projection/v1`                         |
| Replaceable providers       | Real payment, printer delivery, realtime transport, identity verification, delivery tracking            | `PaymentProviderV1`, `PrintProviderV1`, `RealtimeProviderV1`, `IdentityProviderV1`, `DeliveryProviderV1`                               |

The data flow is fixed:

1. A mutable Draft selects Golden package versions and validated bindings.
2. Publish physically verifies packages and stores the canonical immutable
   composition lock with the Published Revision.
3. Compilation consumes only that Published Revision and persisted lock.
4. Generated commands enforce policy, expected version, idempotency, invariant
   checks, audit, and outbox in one transaction.
5. Provider adapters consume committed Factory facts; no provider model becomes
   Graph truth and no provider mutates a Draft or Published Revision.

## Customer capability traceability

The Customer, Merchant, and platform tables map all 43 rows from the completed
requirements audit.

| Audited feature group                         | Target reusable subgraph                                                                                          | Class       | Actual state and required delta                                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QR/table entry                                | `core.location-context` + `hospitality.table-session`                                                             | **Adapt**   | Opaque table entry and session ownership are accepted through `restaurant.table-session`. Bind the accepted location-context contract and extract the table/session flow before retiring vertical code.       |
| Login, saved store, location                  | `core.identity-context` + `party.membership` + `core.location-context`                                            | **Gap**     | The identity and location contracts exist physically, but no Restaurant recipe, member entity, login provider, saved-store relation, or generated journey exists.                                             |
| Manual table verification                     | `core.location-context` + `hospitality.table-session`                                                             | **Adapt**   | The physical location contract declares validated manual context, but Restaurant intentionally supports opaque-token entry only. Add a separately permissioned manual-code path and negative ownership tests. |
| Categories, search, details                   | `commerce.catalog`                                                                                                | **Present** | The shared package is in the accepted cross-profile recipe and the Restaurant Customer menu journey proves category/query/detail behavior.                                                                    |
| Dish images                                   | `commerce.catalog` + `content.media-reference` + Customer PageModel                                               | **Adapt**   | `menu-item.imageUrl` exists, but the generated Customer view does not render it. Define a safe media-reference projection rather than letting external media own catalogue truth.                             |
| Cart quantity and item note                   | `commerce.cart` + `commerce.configured-line`                                                                      | **Present** | Quantity and line-note behavior is accepted. Configured options remain outside this row and require the separate line-configuration slice.                                                                    |
| Whole-order note                              | `commerce.order`                                                                                                  | **Present** | The note persists and is verified in the accepted receipt journey. Preserve it as order data, not provider or page-local state.                                                                               |
| Specifications and cooking modifiers          | `commerce.line-configuration`                                                                                     | **Adapt**   | The accepted physical package has option-group, option, availability, cardinality, and server-price boundaries, but profile/runtime/UI integration remains planned. Untyped receipt JSON is not sufficient.   |
| Remove a cart line                            | `commerce.cart` + Customer PageModel                                                                              | **Adapt**   | `cart.remove` exists, but the generated Customer surface lacks the control and its end-to-end proof.                                                                                                          |
| Submit, simulated full payment, lifecycle     | `commerce.cart` + `commerce.order` + `commerce.simulated-payment` + `core.workflow` + `hospitality.kitchen-queue` | **Adapt**   | Cart/order/payment foundations are shared and the full Restaurant lifecycle has accepted generated proof, but kitchen/cashier stages still rely on vertical runtime. This is not real-money evidence.         |
| WeChat, Alipay, member balance, real money    | `commerce.payment-intent` + `PaymentProviderV1` + `party.membership`                                              | **Gap**     | No provider contract, credential boundary, settlement fact, fake-provider conformance suite, or production reliability evidence exists.                                                                       |
| Partial payment, split bill, suspended credit | `commerce.settlement` + `commerce.account-balance`                                                                | **Gap**     | The current model applies one full payment to one order. Settlement allocation, balance ownership, reconciliation, and credit policy are absent.                                                              |
| History and receipt                           | `commerce.order` + `receipt.document`                                                                             | **Adapt**   | Session-bound history is accepted; receipt rendering remains coupled to Restaurant cashier behavior. Extract a canonical receipt document before adding printer delivery.                                     |
| Review, images, repeat order                  | `engagement.review` + `content.media-reference` + `commerce.reorder`                                              | **Gap**     | No customer identity, review/media lifecycle, moderation policy, or snapshot-safe reorder command exists.                                                                                                     |
| Membership, points, coupons, discounts        | `party.membership` + `loyalty.ledger` + `commerce.price-rule`                                                     | **Gap**     | No member, immutable points ledger, promotion rule, voucher, eligibility, or deterministic price-adjustment model exists.                                                                                     |
| Reservation, waitlist, estimate               | `reservation.capacity` + `reservation.waitlist` + `core.notification`                                             | **Gap**     | No capacity hold, expiry, collision, queue-position, estimate, or Customer/Merchant journey exists.                                                                                                           |
| Pickup, delivery, tracking                    | `fulfilment.pickup` + `fulfilment.delivery` + `DeliveryProviderV1`                                                | **Gap**     | `fulfilmentType` is only stored data. It has no executable state machine, address/ownership rules, courier adapter, or tracking projection.                                                                   |

## Merchant capability traceability

| Audited feature group                            | Target reusable subgraph                                                | Class       | Actual state and required delta                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open, seat, close table                          | `hospitality.table-session` + `core.location-context`                   | **Adapt**   | Manager transitions are accepted, but the flow is Restaurant-specific. Extract parameterized table/context entities, roles, states, and audit effects.                                |
| Merge/move table, hold/reopen order              | `hospitality.table-allocation` + `commerce.order-hold`                  | **Gap**     | No transfer, merge, hold, ownership, conflict, or reopen semantics exist.                                                                                                             |
| Availability and stock adjustment                | `commerce.catalog` + `commerce.inventory-ledger`                        | **Adapt**   | Merchant availability and audited adjustment work today. The accepted stock-ledger package still lacks Restaurant recipe/runtime/Node 22 proof.                                       |
| Create/edit menu item or category                | `commerce.catalog-authoring` + `core.audit`                             | **Gap**     | Manager Graph permissions exist, but no supported authoring command or generated form exists. Generic CRUD alone does not define catalogue invariants.                                |
| Specifications, cooking methods, multiple prices | `commerce.line-configuration` + `commerce.price-rule`                   | **Adapt**   | The line-configuration contract exists physically, but Merchant authoring, price choices, availability, and generated proof remain planned.                                           |
| Reserve/release/decrement/adjust inventory       | `commerce.inventory-ledger`                                             | **Adapt**   | Restaurant transactions prove the invariants vertically. Move them behind the accepted shared stock-movement interface and prove both Restaurant and Ecommerce bindings.              |
| Order amendment, refund, correction              | `commerce.order-amendment` + `commerce.inventory-ledger` + `core.audit` | **Adapt**   | Audited cancellation exists, but versioned Merchant line changes, compensation, correction, and post-payment refund do not. Refund stays outside the first amendment slice.           |
| Kitchen queue and preparation                    | `hospitality.kitchen-queue` + `commerce.order-event`                    | **Adapt**   | Accepted `accept → preparing → ready` behavior is coupled to `restaurant.kitchen`. Extract ticket projection and transition handlers from committed order events.                     |
| Kitchen priority and table ordering              | `hospitality.kitchen-queue`                                             | **Adapt**   | Priority/table fields and deterministic sorting are accepted. Parameterize the queue projection and preserve stable ordering/conflict tests.                                          |
| Realtime kitchen updates                         | `core.event-envelope` + `RealtimeProviderV1`                            | **Gap**     | A transactional outbox exists, but no transport-neutral envelope contract, fake provider, retry/order proof, or active generated UI subscription exists.                              |
| Cashier payment and receipt                      | `commerce.simulated-payment` + `receipt.document`                       | **Adapt**   | Simulated payment is shared and accepted; cashier/receipt behavior remains vertical. Separate payment facts from document projection.                                                 |
| Split settlement, accounting, hanging account    | `commerce.settlement` + `accounting.ledger`                             | **Gap**     | No allocation, posting, reconciliation, period, account, or credit lifecycle exists. Accounting requires a separate regulatory scope.                                                 |
| Receipt, label, invoice printing                 | `receipt.document` + `printing.document` + `PrintProviderV1`            | **Adapt**   | Browser print invocation exists, but there is no governed device/provider contract, delivery job, retry evidence, or label/invoice model.                                             |
| Marketing and membership operations              | `party.membership` + `commerce.price-rule` + `campaign.audience`        | **Gap**     | No member/campaign/promotion capability or consent and retention boundary exists.                                                                                                     |
| Dashboard                                        | `analytics.operational-read-model`                                      | **Adapt**   | Restaurant reporting proves a bounded summary and low-stock view. Extract event-derived read models and add declared time/category/customer dimensions and export policy separately.  |
| RBAC and audit                                   | Graph PolicyModel + `core.audit`                                        | **Present** | Restaurant roles, bounded permissions, Casbin projection, and audit effects have accepted tests and generated evidence. External authorization may only be an optional adapter later. |
| Import, export, administrative lock              | `data.exchange` + `administration.lock`                                 | **Gap**     | No schema-governed import/export job, redaction policy, dry-run, lock lifecycle, or generated surface exists.                                                                         |

## Platform and quality traceability

| Audited requirement                                   | Target boundary                                                         | Class       | Actual state and required delta                                                                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Factory-owned Graph and Golden assets                 | Application Graph + Golden registry                                     | **Present** | Entities, relations, roles, pages, flows, operations, and immutable package identities validate before compilation.                                                                                                            |
| Draft → Publish → immutable compilation               | Control Plane Publish boundary + composition lock                       | **Present** | Accepted tests protect mutable Drafts, immutable Published revisions, physical package verification, and persisted-lock compilation.                                                                                           |
| Generated Web/API/PostgreSQL/Casbin/XState/tests/docs | Compiler target interfaces                                              | **Present** | Direct Restaurant and shared-package composition outputs have deterministic evidence at current scope.                                                                                                                         |
| Workbench-driven preview lifecycle                    | Workbench + Control Plane + Worker preview                              | **Present** | The isolated Node 22 Restaurant lifecycle, stopped state, and exact cleanup are accepted.                                                                                                                                      |
| Command consistency and idempotency                   | Generated command convention; proposed `core.command-envelope`          | **Adapt**   | Implemented Restaurant commands enforce expected version, idempotency, audit, events, and atomic rollback. That convention is not yet an independently selectable package and must be reproduced by every new command package. |
| Offline experience                                    | `offline.projection`                                                    | **Gap**     | No service worker, bounded cache, retention policy, conflict reconciliation, queued command, or offline journey is implemented. The portfolio's Workbox row is research only.                                                  |
| First load ≤1.5 seconds                               | performance budget and generated-browser gate                           | **Gap**     | No measured budget or release gate exists. This is acceptance infrastructure, not a reason to add a runtime dependency.                                                                                                        |
| Payment success ≥99.9 percent                         | `PaymentProviderV1` SLO and observability contract                      | **Gap**     | Simulated payment has no production reliability meaning. No real provider, telemetry, retry, reconciliation, or SLO evidence exists.                                                                                           |
| Security and privacy                                  | `core.identity-context`, PolicyModel, data classification and retention | **Adapt**   | Opaque sessions, ownership, Casbin, and bounded projections exist. Authentication, retention, encryption policy, rate limits, abuse controls, and compliance evidence remain gaps.                                             |

## Ranked capability package sequence

Ranks are dependency order, not implementation status. “Acceptance proof”
describes the evidence required before a package can be called product-ready.
Package names not already present are proposals for a future design gate.

| Rank | Package slice                                                                      | Interfaces                                                                                                                              | Reusable Profiles                               | Required acceptance proof                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Integrate `core.location-context@1.0.0`                                            | Provides `core.location-context/v1`                                                                                                     | Restaurant, Ecommerce, Appointment, Inventory   | Restaurant opaque and manual context plus Ecommerce location bindings; wrong/expired/foreign context rejection; Publish-time physical verification; generic generated Node 22 journeys.                   |
| 2    | Integrate `commerce.line-configuration@1.0.0`                                      | Requires `commerce.catalog-item/v1`, `core.location-context/v1`; provides `commerce.configured-line/v1`                                 | Restaurant, Ecommerce                           | Option ownership, cardinality, availability, decimal price deltas, Merchant configuration, Customer selection, receipt replay, and no mutation on every rejected command.                                 |
| 3    | Integrate `commerce.inventory-ledger@1.0.0`                                        | Requires `commerce.catalog-item/v1`, `commerce.order-event/v1`, `core.location-context/v1`; provides `commerce.stock-movement/v1`       | Restaurant, Ecommerce, Inventory, Field Service | Immutable/idempotent reserve, release, decrement, adjust; location scope; concurrency and rollback; audit/read-model proof in both initial Profiles.                                                      |
| 4    | Integrate `core.identity-context@1.0.0`                                            | Provides `core.principal-context/v1`; later consumed by member/provider packages                                                        | Restaurant, Ecommerce, CRM, Support             | Provider-neutral local fixture, exact principal/session/role binding, ownership denial, no credential persistence, and cross-profile generated proof. This does not itself implement login or membership. |
| 5    | Add `commerce.order-amendment@1.0.0`                                               | Requires `commerce.configured-line/v1`, `commerce.order-event/v1`, `commerce.stock-movement/v1`; provides `commerce.order-amendment/v1` | Restaurant, Ecommerce                           | Expected-version add/remove/change, deterministic price and stock difference, compensation, audit/outbox, concurrent conflict, cancellation parity, and report consistency. Exclude post-payment refund.  |
| 6    | Add `party.membership@1.0.0`                                                       | Requires `core.principal-context/v1`; provides `party.member-context/v1`                                                                | Restaurant, Ecommerce, CRM, Support             | Member ownership, saved locations/stores, consent, classification, retention, deletion/anonymization policy, role matrix, and local identity fixture.                                                     |
| 7    | Add `commerce.price-rule@1.0.0`                                                    | Requires catalogue, configured-line, and optional member context; provides `commerce.price-adjustment/v1`                               | Restaurant, Ecommerce                           | Deterministic eligibility/priority/stacking, exact decimal rounding, voucher reuse and expiry, immutable adjustment facts, adversarial price tests, and receipt/report parity.                            |
| 8    | Add `fulfilment.pickup@1.0.0`                                                      | Requires `commerce.order-event/v1`, location context; provides `fulfilment.intent/v1`                                                   | Restaurant, Ecommerce                           | Pickup state machine, Customer ownership, Merchant handoff, cancellation/timeouts, notification facts, audit, and generated Customer/Merchant journeys. Delivery stays separate.                          |
| 9    | Add `reservation.capacity@1.0.0`                                                   | Requires location and principal context; provides `reservation.capacity/v1`                                                             | Restaurant, Appointment, Ticketing              | Capacity hold/expiry, deterministic clock, collision/concurrency, waitlist handoff, cancellation, audit, and role-safe generated journeys.                                                                |
| 10   | Add `commerce.payment-intent@1.0.0` and `PaymentProviderV1`                        | Requires order events; provides immutable payment attempt/result facts                                                                  | Restaurant, Ecommerce                           | Local fake provider first; idempotency, timeout, retry, duplicate callback, reconciliation, credential isolation, failure mapping, provider removal, and real-provider review before any live money.      |
| 11   | Add `receipt.document@1.0.0`, then `printing.document@1.0.0` and `PrintProviderV1` | Consumes committed order/payment facts; provides canonical document and delivery job                                                    | Restaurant, Ecommerce, Ticketing                | Deterministic document digest, redaction, browser rendering, fake printer, device-trust review, retry/idempotency, audit, and removal proof.                                                              |
| 12   | Add `core.event-envelope@1.0.0` and `RealtimeProviderV1`                           | Consumes committed outbox facts; provides versioned adapter envelopes                                                                   | Restaurant, Ecommerce, Support, Logistics       | Persist-before-publish, schema/version validation, ordering, replay, duplicate handling, fake transport, disconnect recovery, provider replacement, and no command authority from inbound events.         |
| 13   | Add `analytics.operational-read-model@1.0.0`                                       | Consumes audit, order, stock, payment, and service events                                                                               | Restaurant, Ecommerce, Inventory                | Rebuildable projections, declared dimensions, role filtering, time boundaries, deterministic totals, cancellation/amendment parity, export redaction, and generated dashboard proof.                      |
| 14   | Add `offline.projection@1.0.0`                                                     | Consumes bounded read projections and command conflict contracts                                                                        | Restaurant, Ecommerce, Field Service            | Application-shell and approved-read caching, retention, stale-state signalling, queued-command conflict handling, logout purge, offline/online browser journeys, and dependency removal proof.            |

The first four ranks complete the already accepted Commercial Foundation
contract rather than creating new package identities. They should follow that
ledger's Tasks 2 through 5 and must not be represented as implemented before
those gates pass. The ranking does not authorize splitting or reordering that
ledger's frozen multi-package recipe and acceptance work.

## Profile recipes

### Restaurant Ordering

The target Restaurant recipe composes core context/governance, shared commerce,
hospitality overlays, and Customer/Merchant projections. Restaurant-specific
bindings identify table, session, menu, order, line, ticket, payment, and stock
movement Graph symbols. The recipe may add hospitality packages, but it must
not fork shared catalogue, configured-line, order, stock, payment-intent,
receipt, or audit semantics.

Customer and Merchant applications are two PageModel/policy projections of the
same Published Graph. They do not own separate order or inventory truth.

### Simple Ecommerce

Ecommerce should continue to bind the same shared package versions to product,
checkout, order, location, and stock symbols. It is the primary reuse control:
a proposed “shared” package is not proven reusable if its behavior is selected
by Restaurant profile name or only its Restaurant generated journey passes.

### Later Profiles

Appointment and Ticketing should reuse principal/location/capacity/notification
contracts. Inventory, Field Service, and Logistics should reuse location and
stock-movement contracts. CRM and Support should reuse principal/member,
assignment, deadline, notification, audit, and event-envelope contracts.
These are recipe hypotheses from the approved portfolio, not implemented
Profiles.

## Acceptance contract for every package slice

A capability package is product-ready only when all applicable layers pass:

1. **Contract:** exact manifest, constrained parameters, declared effects,
   safe output slots, exact `requires`/`provides`, physical bytes, fixture and
   contract-evidence digests, licence/notices where applicable.
2. **Graph:** valid and invalid entity/relation/policy/page/flow bindings,
   namespace and target collision rejection, and no raw string, source, URL,
   path, command, credential, or model material in composition bindings.
3. **Publish:** physical verification before persistence; immutable Published
   Revision and canonical nonempty composition lock; no asset-lock or mutable
   Draft fallback.
4. **Compiler:** generation only from verified persisted lock contributions,
   deterministic artifacts, safe target namespaces, no profile/version
   dispatch for migrated behavior, and failure before partial output.
5. **Behavior:** focused positive, permission, invariant, idempotency,
   concurrency, rollback, privacy, and malformed-input tests with zero mutation
   on rejection.
6. **Cross-profile reuse:** at least two materially different Graph bindings
   for a shared package, unless the package is explicitly hospitality-only.
7. **Generated release:** isolated Node 22 API/Web/database/policy/runtime
   journey, stopped state, exact cleanup, and no credential or raw model
   evidence.
8. **Independent gates:** task review, behavioral QA, release review, and fresh
   verification reconciled before acceptance.

## External ecosystem adoption path

The approved portfolio can inform boundaries and nominate evidence, but it
cannot skip Factory authorship or release gates. The path is:

1. **Recorded research:** retain the fixed tag/SHA, licence source, observed
   capability, and proposed Factory boundary already recorded in the approved
   portfolio. This is metadata, not a Candidate or adoption.
2. **Quarantine intake:** an allow-listed source may produce immutable
   acquisition, snapshot, scan, and conformance evidence plus a non-executable
   Candidate. The Candidate is invisible to Graph, Golden selection, Publish,
   compiler, generated applications, and providers.
3. **Candidate conformance:** Factory-owned, network-denied fixtures may reach
   `conformance-passed`. That status grants no approval, source-copy right,
   dependency installation, or capability.
4. **Pending promotion packet:** a canonical review packet binds the Candidate,
   immutable evidence, licence status, findings, exact proposed-copy ranges,
   notices, reviewers, Factory interface, removal path, and collision
   inventory. Its only decision is `pending-review`.
5. **Human review:** named reviewers reject the proposal or authorize a
   separate reviewed implementation. Automation cannot approve a licence,
   waive a finding, copy source, install a dependency, or register a Golden
   asset.
6. **Separately authored Golden change:** Factory authors the package/provider
   contract, fixtures, tests, notices, and exact approved copy ledger if any.
   A Candidate record is never relabelled or directly compiled as Golden.
7. **Normal product release:** the new Golden identity enters a mutable Draft,
   is physically verified at Publish, is locked immutably, and passes the full
   package acceptance contract above before any Profile claims the behavior.

External Intake Task 5 is currently `implementing`; this document describes the
governed target path and does not claim that promotion packets or any portfolio
Candidate are accepted.

## Delivery waves and stop conditions

### Wave A: complete accepted Foundation integration

Integrate the four existing Foundation identities through their recorded
profile, runtime, Workbench, and cross-profile acceptance tasks. Preserve the
current Restaurant vertical path until generated parity exists.

### Wave B: close the highest-value transactional gaps

Add order amendment, membership, deterministic price rules, and pickup as
separate packages. Each slice must remain independently rejectable and
releasable; payment refund is not hidden inside order amendment, and delivery
is not hidden inside pickup.

### Wave C: add provider and operational projections

Add payment, printing, realtime, analytics, and offline only behind
Factory-owned contracts with local fakes and replacement proof. A public
ecosystem is not selected merely because its fixed reference appears in the
portfolio.

Stop and return to product/architecture review if a proposed slice:

- changes a Golden interface already consumed by another package;
- introduces a new parameter type, output slot, target runtime interface, or
  compiler merge protocol;
- lets Candidate or provider data become Graph, policy, flow, or command
  authority;
- requires copying or installing external material without the full intake and
  review path;
- removes Restaurant-specific runtime before accepted generated parity;
- combines real money, accounting, regulated data, or production identity with
  an otherwise bounded feature slice; or
- expands scope after failing three repair/review cycles.

## Risks

- **False reuse:** a package can look shared while a profile-name branch still
  selects its behavior. Cross-profile bindings and generated proof are the
  control.
- **Contract-present/product-absent confusion:** the four Foundation packages
  are accepted physical contracts, not accepted Restaurant features.
- **Vertical regression:** prematurely deleting Restaurant modules can remove
  behavior not yet carried by package contributions.
- **Money and provider coupling:** real payment and settlement can contaminate
  order semantics unless payment facts and provider effects remain separate.
- **Read-model authority:** dashboards, realtime, printing, and offline caches
  must remain projections of committed Factory facts.
- **Ecosystem shortcut:** fixed references and permissive-looking licences do
  not authorize source copy, dependency installation, or Golden registration.
- **Recipe-count inflation:** the portfolio's 100-recipe target is composition
  demand evidence, not 100 production-ready applications.

## Outcome

The next product move is not a larger Restaurant compiler fork. It is accepted
cross-profile integration of the four existing Foundation packages, followed
by small versioned packages for order amendment, membership, pricing,
fulfilment, and only then provider-backed operations. The accepted Restaurant
MVP remains the behavioral reference; each migrated subgraph must match or
improve that evidence before its vertical predecessor can be retired.
