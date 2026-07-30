# Commercial Profile Capability Intake

Updated: 2026-07-30

## Decision investigated

Which publicly attributable, fixed-reference sources can inform a governed,
Graph-first capability library for a commercial Restaurant Ordering profile and
additional reusable profile families, without turning Factory Pilot into a
collection of copied vertical applications?

This is a research intake, not a dependency approval, source-copy approval, or
product implementation plan. Observed facts are cited in the source table.
All package names and sequencing recommendations are Factory inferences.

## Current-state constraint

The Restaurant requirements audit proves a local dine-in MVP, including table
session entry, catalog discovery, cart notes, simulated payment, kitchen state,
cashier, inventory, audit, and a small dashboard. It does not prove commercial
customer identity, configurable menu options, promotions, reservations,
merchant menu authoring, amendments/refunds, governed printing, rich reporting,
or offline operation. This intake therefore treats those as capability
contracts that must be composed and independently accepted, rather than as
Restaurant-only controller logic.

## Candidate records

"Fixed reference" is a tag or immutable commit URL. Dates are upstream release
dates where available; otherwise they are the public-reference retrieval date.
An observed permissive license is not legal advice and does not authorise a
dependency or source reuse.

| Candidate and fixed reference                                                                                                                                                                                                                                                                                                          | Observed license and maintenance signal                                                                                                                                        | Source category                                                    | Capability contract informed                                                                                                                                                                                                                      | Exact reuse boundary                                                                                                                                                                                                                                                      | Confidence                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [TastyIgniter Cart v4.3.1](https://github.com/tastyigniter/ti-ext-cart/tree/287ec45dc3f545814c24c5a97f180a97409108fd), release [2026-07-30](https://github.com/tastyigniter/ti-ext-cart/releases/tag/v4.3.1), with [MIT license](https://github.com/tastyigniter/ti-ext-cart/blob/287ec45dc3f545814c24c5a97f180a97409108fd/LICENSE.md) | MIT at the fixed reference. Its public release gives an explicit versioned restaurant cart boundary.                                                                           | Architecture/source-study-only                                     | `commerce.line-configuration/v1`: option groups, choices, cardinality, price deltas, line notes, availability, and stock reservation facts.                                                                                                       | No Laravel/PHP, migrations, templates, extension discovery, session handling, payment integration, UI, or source may be copied. Factory defines its own schema, fixture, adapter, compiler contribution, and tests.                                                       | High for license/ref; medium for Factory mapping.        |
| [TastyIgniter Local v4.1.5](https://github.com/tastyigniter/ti-ext-local/tree/305d39fd6d83dde68f6793692fadf91b073ea6ba) and [Reservation v4.1.4](https://github.com/tastyigniter/ti-ext-reservation/tree/4b7f8559b77f8c1599b996067f67b6e8abb86432)                                                                                     | Both fixed extension references are MIT-licensed in the prior source study; they give store, operating-hour, dining-area, table, availability, and waiting vocabulary.         | Architecture/source-study-only                                     | `core.location-context/v1`, `core.availability/v1`, `core.reservation/v1`, `core.queue/v1`, and profile adapter `restaurant.table-session/v1`.                                                                                                    | No booking forms, availability algorithm, Laravel/PHP source, migrations, or table/session implementation may be imported. Factory's Published Graph remains the availability authority.                                                                                  | High for reference; medium for behavior mapping.         |
| [Keycloak 26.7.0](https://github.com/keycloak/keycloak/tree/6c73e3027811d9c7b22683edd825e839272e9547), released 2026-07-09, [Apache-2.0 license](https://github.com/keycloak/keycloak/blob/6c73e3027811d9c7b22683edd825e839272e9547/LICENSE.txt)                                                                                       | Apache-2.0. The release documents provisioning, federation, authorization, organization, and session-related capabilities; it is actively versioned upstream.                  | Architecture/source-study-only; future identity Provider candidate | `core.identity-context/v1` and `core.principal-session/v1`: opaque subject, authentication assurance, session expiry, organization/location scope, role claims, and provider binding.                                                             | Do not copy Keycloak code, themes, realm model, admin UI, migration, or user store. Do not make an identity provider the Factory PolicyModel or application authority. A future provider consumes Factory policy bindings and returns authenticated principal facts only. | High for release/license; medium for provider boundary.  |
| [InvenTree 1.4.3](https://github.com/inventree/InvenTree/tree/6b237de54e4cbfd7f51daff8403c17869898d965), released 2026-07-29, [MIT license](https://github.com/inventree/InvenTree/blob/6b237de54e4cbfd7f51daff8403c17869898d965/LICENSE)                                                                                              | MIT. Upstream describes an inventory management system with low-level stock control and part tracking; the release is current as of this intake.                               | Architecture/source-study-only                                     | `commerce.inventory-ledger/v1`, `commerce.stock-reservation/v1`, `commerce.stock-adjustment/v1`, and `core.operational-report/v1`: immutable movement reasons, reservations, release/decrement/adjust effects, thresholds, and projection inputs. | No Django/Python code, database structure, plugins, UI, report templates, or inventory source semantics may be copied. Factory must define its own idempotency, transaction, audit, and compiler fixtures.                                                                | High for release/license; medium for contract scope.     |
| [Workbox v7.4.1](https://github.com/GoogleChrome/workbox/tree/8674ff37178007fb2c5b225d124b224c5055145f), released 2026-05-05, [MIT license](https://github.com/GoogleChrome/workbox/blob/8674ff37178007fb2c5b225d124b224c5055145f/LICENSE)                                                                                             | MIT. It is a versioned service-worker library; the release offers a pin suitable for a later dependency review.                                                                | Direct dependency candidate, not approved                          | `core.offline-projection/v1`: build-cache policy, declared offline route/data projection, replayable command queue metadata, and reconnect diagnostics.                                                                                           | No adoption yet. A future exact package version needs an ADR, SBOM, license notice, cache/ejection test, and generated-app isolation proof. A service worker cannot persist credentials, decide authorization, confirm payment, or become an order-state authority.       | High for release/license; medium for suitability.        |
| [Eventyay Tickets dev commit `25934879`](https://github.com/fossasia/eventyay-tickets/tree/25934879a2c738c6cbf422d8d1ccfd1b82d2186c), public reference retrieved 2026-07-30, [Apache-2.0 license](https://github.com/fossasia/eventyay-tickets/blob/25934879a2c738c6cbf422d8d1ccfd1b82d2186c/LICENSE)                                  | Apache-2.0 at the fixed commit. Upstream publicly identifies the repository as open-source event management and ticketing.                                                     | Architecture/source-study-only                                     | `ticketing.capacity/v1`, `ticketing.hold/v1`, `ticketing.issue/v1`, `ticketing.check-in/v1`, and reusable `commerce.payment-attempt/v1`: capacity allocation, expiry, single-use admission, cancellation/release, and audit events.               | Do not copy Django/Python code, templates, migrations, ticket QR formats, payment flows, media, or source. Factory must independently specify check-in idempotency and capacity locking.                                                                                  | High for fixed ref/license; medium for behavior mapping. |
| [Backstage v1.53.1](https://github.com/backstage/backstage/tree/3fbc2fe1b3eff3c6eb9372f748d95e3d5dcb3ac7), released 2026-07-29, [Apache-2.0 license](https://github.com/backstage/backstage/blob/3fbc2fe1b3eff3c6eb9372f748d95e3d5dcb3ac7/LICENSE)                                                                                     | Apache-2.0. The versioned project documents catalog and template patterns for software operations.                                                                             | Architecture/source-study-only                                     | `core.profile-catalog/v1`, `core.capability-evidence/v1`, `core.generated-application-record/v1`, and Internal Operations profile inventory: ownership, lifecycle, declared dependencies, evidence links, and discovery projections.              | Do not copy its plugins, catalog schema, template actions, backend, UI, or code generators. Factory's Application Graph and immutable compilation record are not Backstage entities.                                                                                      | High for release/license; medium for catalog mapping.    |
| [n8n `n8n@2.32.6`](https://github.com/n8n-io/n8n/tree/c580585cf48c62fe71adabfffe3f238ce604e263), released 2026-07-29, [Sustainable Use License](https://github.com/n8n-io/n8n/blob/c580585cf48c62fe71adabfffe3f238ce604e263/LICENSE.md)                                                                                                | The fixed license limits use to internal, non-commercial, or personal use and separately restricts enterprise files. It is not an approved open-source dependency for Factory. | Excluded                                                           | None admitted. Its visual-automation category only highlights the need for a strictly declarative, policy-bound FlowModel.                                                                                                                        | Do not copy, embed, depend on, ship, or use source, nodes, UI, workflow format, templates, credentials handling, or runtime.                                                                                                                                              | High.                                                    |

## Restaurant capability decomposition

The following is a Factory recommendation, based on the current audit and the
source-study boundaries above. It is deliberately smaller than a "restaurant
application" so that each item can be reused, versioned, validated, and
independently compiled.

| Customer and merchant concern                          | Proposed reusable capability contract                                                                                  | First Restaurant binding                                                                                                                  | Reuse beyond Restaurant                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Login, store selection, and table entry                | `core.identity-context`, `core.location-context`, `restaurant.table-session`                                           | Phone/provider identity remains optional; opaque QR table session plus validated manual table code binds an order to store/table/session. | Ecommerce customer context, Appointment staff/customer, Internal Operations actor scope.      |
| Menu, modifiers, dietary/preparation details, and cart | `commerce.catalog`, `commerce.line-configuration`, `commerce.cart`, `commerce.price-rule`                              | Category/menu item, min/max option choices, price deltas, line and order notes, availability, media reference.                            | Product variants, service add-ons, ticket class options.                                      |
| Member, coupon, and promotion                          | `core.customer-profile`, `commerce.promotion`, `core.loyalty-ledger`                                                   | Member tier/points, eligibility proof, coupon reservation/redemption, member price projection.                                            | Ecommerce and paid ticketing; do not entangle with payment provider state.                    |
| Reservation, queue, and no-show                        | `core.availability`, `core.reservation`, `core.queue`, `workflow.deadline`                                             | Dining area/table capacity, party size, hold/expire/seated/cancelled facts, wait estimate projection.                                     | Appointment bookings and ticket holds.                                                        |
| Order, payment, amendment/refund, and receipt          | `commerce.order`, `commerce.payment-attempt`, `commerce.order-amendment`, `commerce.settlement-intent`, `core.receipt` | Simulated payment first; versioned amendment/cancellation/reversal reason and stock/audit effects.                                        | Ecommerce checkout and paid ticketing. Real money is a later provider contract.               |
| Kitchen and fulfilment                                 | `workflow.case`, `workflow.deadline`, `core.event-envelope`, `restaurant.kitchen-queue`                                | Ticket priority/table, accepted/preparing/ready/served transitions, declarative outbox intent.                                            | Ecommerce fulfilment, Appointment service delivery, Internal Operations queues.               |
| Merchant menu, inventory, reports, print jobs          | `commerce.catalog-authoring`, `commerce.inventory-ledger`, `core.operational-report`, `core.print-job`                 | Menu drafts/publication, stock movements, time/category sales projections, render-only receipt/label print job.                           | Ecommerce catalogue/inventory and operations reporting. Printer transport remains a provider. |

## Three-iteration reusable capability roadmap

This roadmap is a recommendation, not a commitment to implement the listed
packages together. Every iteration begins with a package manifest, typed Graph
contribution, declared inputs/outputs, locked digest, fixtures, compiler
contribution, semantic validation, and a published-Graph acceptance run.

### Iteration 1 — Context and configurable commercial intake

Prioritise `core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`.

Acceptance proof: a Published Restaurant Graph compiles a customer menu with
validated option-group selections and a manual-or-QR table context; a merchant
edits availability/stock through declared capability actions; an invalid option
selection or mismatched table/session is rejected without state mutation.

Why first: it closes the current audit's highest user-visible gap (modifiers)
while creating identity/location/inventory contracts shared by Restaurant,
Ecommerce, Appointment, and Internal Operations.

### Iteration 2 — Commercial commitments and recovery

Prioritise `commerce.price-rule`, `commerce.promotion`,
`commerce.payment-attempt`, `commerce.order-amendment`, `core.receipt`, and
`workflow.compensation`.

Acceptance proof: Restaurant and Ecommerce use the same pinned order/payment
packages with different valid bindings. A one-time simulated payment, an
audited merchant amendment/cancellation, promotion eligibility, stock
reserve/release/decrement, and a receipt projection remain deterministic.

Why second: it turns the existing simple checkout into governed financial
intent without adding real payment credentials or provider ownership.

### Iteration 3 — Availability, fulfilment, and profile portfolio proof

Prioritise `core.availability`, `core.reservation`, `core.queue`,
`workflow.deadline`, `core.event-envelope`, and profile adapters
`restaurant.kitchen-queue`, `ticketing.check-in`, and
`operations.work-queue`.

Acceptance proof: independently published Restaurant, Appointment, Ticketing,
and Internal Operations Graphs compile their own simulator, Web/API/database,
tests, documentation, and role journeys. A timeout/expiry/cancellation emits
an immutable event and audit record exactly once; an adapter cannot write
outside declared target slots.

Why third: this establishes multiple profile families without copying any
vertical runtime, while preserving the same Graph, lifecycle, and compilation
invariants.

## Decision consequences

1. **Profile breadth comes from contracts, not repository ingestion.** Each
   proposed profile is a composed package recipe with declared Graph
   contributions, rather than an imported restaurant, ecommerce, appointment,
   ticketing, or operations codebase.
2. **Identity, payment, printers, realtime transport, and offline support are
   providers.** They may enrich generated applications only through a pinned,
   tested adapter; none may define the Factory Graph, mutate a Published
   revision, or bypass PolicyModel enforcement.
3. **Commercial restaurant expansion should start with Iteration 1.** It
   creates visible customer/merchant value and contracts reused by the next
   profiles. Payment-provider, delivery, loyalty, real-time, and physical
   printer activation remain later, separately governed work.
4. **Excluded licenses remain excluded.** n8n, Vendure, pretix, and any
   unpinned or ambiguously licensed source are not candidates for copying or
   runtime adoption. A permissive license is still only a source-study result
   until a separate adoption ADR identifies exact package, notice, SBOM,
   version, security review, and conformance evidence.

## Limitations

This is public desk research performed on 2026-07-30. Repository releases and
licenses can change. The material confirms the stated upstream references and
their boundaries; it does not establish security fitness, operational fitness,
or product-market fit for Factory Pilot. No external account was created, no
person was contacted, and no upstream source was copied, installed, executed,
or added as a dependency.
