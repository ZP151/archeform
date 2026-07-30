# Profile Capability Source Study

**Date:** 2026-07-30
**Decision under study:** Which public projects can inform or supply governed,
Graph-first capability packages for Restaurant Ordering, Simple Ecommerce, and
adjacent profiles without turning Factory Pilot into a fork of another product?

## Decision summary

Factory Pilot should first implement small, parameterized Factory packages for
catalog, cart, order, inventory, simulated payment, audit, workflow, role
policy, table session, kitchen queue, cashier actions, and reporting. Existing
full applications are useful only for feature boundaries, data lifecycle,
journey fixtures, and interaction references; they must not be copied or
embedded as complete applications.

Only small, pinned, license-compatible libraries may become direct dependencies.
Any third-party runtime must enter through a documented provider adapter, a
fixed source snapshot, notices, isolated fixtures, and a separate decision.
This report does not approve an integration.

## Intake classes

| Class                       | Meaning                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct dependency candidate | A small upstream library may be pinned after dependency, security, and notice review. It is an adapter, not the Application Graph source of truth.     |
| Source-study only           | Study behavior and architecture, then independently implement a Factory contract and tests. Do not copy application source, assets, migrations, or UI. |
| Do not copy/embed           | License or product topology makes the source unsuitable for Factory reuse. It may be read only as a public architecture reference.                     |

## Direct dependency candidates

| Candidate                                                   | Pinned public ref reviewed                                                                                                                  | License / observed fact                                                                                                                                                      | Factory decision                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)                  | [v0.22.4](https://github.com/puckeditor/puck/releases/tag/v0.22.4), 2026-07-30                                                              | MIT. Its React/Next editor lets the host own data and configure components, fields, responsive viewports, dynamic props, and migrations. [Docs](https://puckeditor.com/docs) | Candidate PageModel adapter only. Translate allow-listed Puck data to a candidate PageModel; keep routes, bindings, effects, roles, and policies in Factory. Puck Cloud AI requires a separate privacy study. |
| [React Flow / xyflow](https://github.com/xyflow/xyflow)     | [`360f5b13e2bc6899ea06b4be1a49b068d86926cf`](https://github.com/xyflow/xyflow/tree/360f5b13e2bc6899ea06b4be1a49b068d86926cf), 2026-07-29    | MIT. It exposes nodes, edges, custom handles, validation, layout, and accessibility primitives. [Docs](https://reactflow.dev/learn)                                          | Candidate presentation/editor adapter for FlowModel, DomainModel, and lineage. Factory owns semantic validation and persistence.                                                                              |
| [XState](https://github.com/statelyai/xstate)               | [`b1811bf77bc2d1a74367328cec7907aa185b70df`](https://github.com/statelyai/xstate/tree/b1811bf77bc2d1a74367328cec7907aa185b70df), 2026-07-22 | MIT. It provides runtime state-machine semantics.                                                                                                                            | Candidate compiled FlowModel target. Packages and users may not inject arbitrary actions.                                                                                                                     |
| [node-casbin](https://github.com/apache/casbin-node-casbin) | [v5.51.1](https://github.com/casbin/node-casbin/releases/tag/v5.51.1), 2026-06-25                                                           | Apache-2.0 Node authorization implementation. [Overview](https://casbin.apache.org/docs/overview/)                                                                           | Candidate PolicyModel compiler target; handwritten policy files cannot become Graph inputs.                                                                                                                   |
| [Prisma ORM](https://github.com/prisma/prisma)              | [7.9.1](https://github.com/prisma/prisma/releases/tag/7.9.1), 2026-07-29                                                                    | Apache-2.0. Prisma provides an explicit schema language and generated access/migrations. [Docs](https://www.prisma.io/docs/orm/prisma-schema/overview)                       | Candidate DomainModel compiler target. Generated schema and migrations are immutable artifacts.                                                                                                               |

## Commerce and restaurant source studies

| Candidate                                                                   | Pinned public ref reviewed                                                                                                                      | License / observed fact                                                                                             | Capability-level decision                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Medusa](https://github.com/medusajs/medusa)                                | [v2.18.0](https://github.com/medusajs/medusa/releases/tag/v2.18.0), 2026-07-30                                                                  | MIT. Upstream presents modular commerce for B2B/DTC, marketplaces, POS, and service businesses.                     | Source-study first; later optional Commerce Provider. Study catalog, cart, order, promotion, inventory, and payment boundaries. Do not add Medusa to v1 generated runtimes.                                                       |
| [Medusa Eats](https://github.com/medusajs/medusa-eats)                      | [`734e7a2fb2d5e2671daaacf2b79fb72fd75073a7`](https://github.com/medusajs/medusa-eats/tree/734e7a2fb2d5e2671daaacf2b79fb72fd75073a7), 2025-09-23 | MIT, an Uber Eats-style Next.js/Medusa example; no release baseline.                                                | Source-study only. Use its browse/cart/checkout/tracking journey as a fixture reference, not a dependency.                                                                                                                        |
| [TastyIgniter](https://github.com/tastyigniter/TastyIgniter)                | [v4.3.4](https://github.com/tastyigniter/TastyIgniter/releases/tag/v4.3.4), 2026-07-30                                                          | MIT. It covers ordering, reservations, menus, locations, and table booking.                                         | Source-study only. It informs `restaurant.menu`, `restaurant.table-session`, `restaurant.reservation`, `restaurant.order`, and `restaurant.location` boundaries; no Laravel/PHP or UI copying.                                    |
| [Kasirku](https://github.com/rezadrian01/Kasirku)                           | [`8d6273d42206bf8a926475b1faf18d6c93dce84d`](https://github.com/rezadrian01/Kasirku/tree/8d6273d42206bf8a926475b1faf18d6c93dce84d), 2026-07-18  | MIT, a small React/Laravel POS with customer menu/cart/search, table numbers, status, dashboard, and receipts.      | Low-maintenance source-study only. Use its journey vocabulary for `restaurant.table-session`, `restaurant.cashier`, `restaurant.kitchen-status`, `core.receipt`, and `core.print-job`; never reuse payment assumptions or source. |
| [Open Source Point of Sale](https://github.com/opensourcepos/opensourcepos) | [3.4.1](https://github.com/opensourcepos/opensourcepos/releases/tag/3.4.1), 2026-07-30                                                          | MIT according to its [LICENSE](https://github.com/opensourcepos/opensourcepos/blob/master/LICENSE); PHP retail POS. | Source-study only. Use its POS vocabulary for cashier sessions, returns, cash drawer/receipt, stock movements, audit, and reports.                                                                                                |
| [Saleor Core](https://github.com/saleor/saleor)                             | [3.23.22](https://github.com/saleor/saleor/releases/tag/3.23.22), 2026-07-30                                                                    | BSD-3-Clause, with catalog/order/customer/promotion/cart/payment and separated dashboard/storefront.                | Source-study only. It informs `commerce.*` interfaces and merchant/customer journey separation; its Python/GraphQL runtime is not a Factory target.                                                                               |
| [Appwrite](https://github.com/appwrite/appwrite)                            | [1.9.6](https://github.com/appwrite/appwrite/releases/tag/1.9.6), 2026-07-30                                                                    | BSD-3-Clause backend platform.                                                                                      | Future provider study only; it may later provide data, identity, or storage targets but never owns Factory business semantics.                                                                                                    |

## Explicit exclusions

| Source                                                                             | License fact                                                                                                                                         | Decision                                                                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [Vendure](https://github.com/vendurehq/vendure)                                    | Its [license](https://github.com/vendurehq/vendure/blob/master/LICENSE.md) states the community source is GPLv3, with separate commercial licensing. | Do not copy, embed, or depend on its GPLv3 source. It may remain read-only TypeScript/NestJS architecture reference. |
| Unpinned repository, template, demo, design asset, or arbitrary npm/Git dependency | A repository page alone proves neither stable provenance nor dependency/security posture.                                                            | Do not intake without a fixed source study, license review, package boundary, fixture, and verification plan.        |

## Capability map inferred from the studies

This is architectural inference, not an assertion that upstream software
contains Factory-ready modules. Each row is intentionally smaller than a
profile and becomes a separate Factory package or contribution group.

| Capability family     | Candidate Factory packages                                                                                                             | Profile combinations                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Identity and context  | `core.session`, `core.role-policy`, `core.profile`, `core.location-context`                                                            | Restaurant customer/merchant, Ecommerce customer/admin, Approval user/manager |
| Catalog and discovery | `commerce.catalog`, `commerce.category`, `commerce.search`, `commerce.price`, `commerce.media`                                         | Restaurant menu, Ecommerce catalog, Appointment/service catalog               |
| Intent and checkout   | `commerce.cart`, `commerce.line-note`, `commerce.checkout`, `commerce.simulated-payment`, `commerce.receipt`                           | Restaurant dine-in/takeaway and Ecommerce checkout                            |
| Order lifecycle       | `commerce.order`, `commerce.order-audit`, `workflow.fulfilment`, `core.notification`                                                   | Restaurant kitchen queue, Ecommerce lifecycle, service fulfilment             |
| Operations            | `commerce.inventory`, `restaurant.table-session`, `restaurant.kitchen-queue`, `restaurant.cashier`, `core.print-job`, `core.reporting` | Restaurant merchant suite and Ecommerce inventory/admin                       |
| Growth and scheduling | `commerce.promotion`, `core.loyalty`, `restaurant.reservation`, `core.queue`                                                           | Restaurant booking/queue and Ecommerce promotions                             |

## Intake order

1. Implement the composition kernel: parameter schemas, Graph/executable contributions, exact interfaces, collision detection, immutable locks, and package-local fixture execution.
2. Implement shared commerce: catalog, cart, order, inventory, simulated payment, audit, workflow, and notification. Prove Restaurant and Ecommerce use the same package versions with different bindings.
3. Add the Restaurant operational layer: QR/table context, notes/modifiers, kitchen priority/status, cashier completion/void audit, reporting. Treat printing and real payment as adapters.
4. Add Puck only when PageModel components, props, tokens, and routes are allow-listed; include responsive preview and role simulation.
5. Add booking/queue, loyalty/promotion, delivery, and ecommerce variants as independently published Graph bindings and fixtures, not compiler branches.
6. Decide Medusa/Appwrite providers only after a dedicated interface mapping, source study, upgrade strategy, security boundary, and isolation test.

## Security and license gates

- Re-verify selected tags/commits at intake; these are research pins, not dependency approvals.
- Run license, SBOM, vulnerability, secret, and provenance checks for every selected package and dependency tree. Retain required notices.
- Do not import upstream migrations, seed data, credentials, payment/webhook logic, printer integrations, or external URLs into Factory packages.
- Keep payment local and simulated until a separate regulated provider contract is accepted.
- Screenshots and interaction patterns may guide independent design; they do not permit copying code, trademarks, artwork, or assets.

## Puck AI boundary update — 2026-07-30

This update classifies Puck AI modes after a public documentation review. It
does not approve a Puck Cloud account, package, credential, or integration.

| Mode     | Observed upstream behavior                                                                                                                     | Factory decision                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assembly | Puck Cloud can generate Puck `Data` from a natural-language prompt and a supplied component configuration.                                     | Deferred provider study. It could propose a Draft-only PageModel candidate only after privacy, credential, retention, cost, availability, and prompt-injection controls are accepted. Its input must be a finite Factory-generated Golden component configuration, and its output must pass the same PageModel validator as Factory AI. |
| Design   | Puck Cloud can create new component types and records them in `_dynamicConfig`; it can also introduce page-wide styles and optionally scripts. | Rejected for Factory. Dynamic component definitions do not have a Golden package identity, verified digest, declared schema, or declared target namespace, so they cannot participate in an immutable composition lock.                                                                                                                 |
| Tools    | Puck Cloud documents host-server tools that can query systems or perform effects.                                                              | Rejected in v1. No model-selected Puck tool may read Factory data or perform side effects. A future read-only tool would require its own declared contract and policy gate.                                                                                                                                                             |

Factory will therefore use self-hosted Puck Core only as a PageModel editor
until a future `PuckAiPageProposalProvider/v1` passes a dedicated provider
decision. Puck Core may edit approved visual components, tokens, responsive
layout, and declared route links; it cannot add business effects, source,
scripts, URLs, policy, domain, or flow semantics.

## Restaurant capability boundary update — 2026-07-30

The official MIT-licensed TastyIgniter extension releases below were inspected
as source-study references, not dependencies or source-copy approval:

| Fixed public reference                                                                                                                                                                                                                                | Useful bounded concepts                                                                                                          | Factory package direction                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Cart v4.3.1](https://github.com/tastyigniter/ti-ext-cart/releases/tag/v4.3.1), commit [`287ec45dc3f545814c24c5a97f180a97409108fd`](https://github.com/tastyigniter/ti-ext-cart/commit/287ec45dc3f545814c24c5a97f180a97409108fd)                      | explicit menu option groups, selectable option values, quantity/cardinality, price deltas, comments, availability, stock history | `restaurant.menu-option-group`, `restaurant.menu-option`, `commerce.line-note`, `commerce.inventory` |
| [Local v4.1.5](https://github.com/tastyigniter/ti-ext-local/releases/tag/v4.1.5), commit [`305d39fd6d83dde68f6793692fadf91b073ea6ba`](https://github.com/tastyigniter/ti-ext-local/commit/305d39fd6d83dde68f6793692fadf91b073ea6ba)                   | current store selection, search, service area, operating-hour context                                                            | `core.location-context`                                                                              |
| [Reservation v4.1.4](https://github.com/tastyigniter/ti-ext-reservation/releases/tag/v4.1.4), commit [`4b7f8559b77f8c1599b996067f67b6e8abb86432`](https://github.com/tastyigniter/ti-ext-reservation/commit/4b7f8559b77f8c1599b996067f67b6e8abb86432) | booking, dining area, table, availability, wait-state vocabulary                                                                 | `restaurant.reservation`, `restaurant.table-session`, `core.queue`                                   |

The first operational expansion after shared commerce should make modifier
groups, choices, cardinality, availability, and price deltas typed Graph
facts. These packages can compose into Restaurant Ordering but have no place
in an Ecommerce profile unless that profile selects them. Do not copy Laravel
conventions, PHP source, migrations, templates, session behavior, payment
gateways, delivery geometry, or extension discovery rules.

## Confidence and limitations

Licenses and maintenance signals are sourced from upstream repositories,
releases, and official documentation on 2026-07-30. Capability mapping is
medium-confidence architectural inference that requires Factory contract and
fixture validation. No source was downloaded, copied, executed, or integrated.

## Profile Portfolio Intake — 2026-07-30

**Decision investigated:** whether the existing restaurant/POS studies and a
small set of additional public references are sufficient to sequence governed,
reusable Factory capabilities for Restaurant, Appointment, Ticketing, Internal
Operations, and Commerce profiles.

This is a research intake, not a dependency, provider, source-copy, or
profile-implementation approval. The six additional sources below were read
from their official repositories, release records, and license files on
2026-07-30.

### Existing-study coverage against the Restaurant requirements audit

The requirement status in
[the Restaurant audit](../audits/restaurant-ordering-requirements-audit.md)
is implementation evidence; a source-study reference does not turn an absent
or partial requirement into a delivered capability.

| Requirement area                                                             | Observed coverage in the existing studies                                                                                                                                                                                                               | Audit result                                                                                                                                                                 | Factory inference and product decision affected                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Menu, cart, order, inventory, checkout, customer/merchant separation         | Medusa, Saleor, Medusa Eats, TastyIgniter, Kasirku, and Open Source Point of Sale all provide public commerce or POS reference material; the prior study fixes license/release evidence for each.                                                       | The current Restaurant MVP proves menu discovery, cart notes/quantities, simulated full payment, kitchen flow, cashier receipt, inventory evidence, and role/audit controls. | Coverage is sufficient to keep `commerce.catalog`, `commerce.cart`, `commerce.order`, `commerce.inventory`, `commerce.simulated-payment`, `core.receipt`, and `core.audit` native and shared with Commerce. It is not evidence to adopt an upstream runtime. |
| Typed modifiers, price deltas, availability, and stock history               | The fixed MIT TastyIgniter Cart study identifies option groups, option values, cardinality, comments, availability, and stock history.                                                                                                                  | Modifier data is only an unconfigured projection; the Customer UI sends no selections and the Merchant has no configuration surface.                                         | The next Restaurant-specific intake should be `restaurant.menu-option-group` and `restaurant.menu-option`, composed with shared price, line-note, and inventory contracts.                                                                                   |
| Table/reservation/queue and location context                                 | The fixed MIT TastyIgniter Local and Reservation studies provide store, operating-hour, dining-area, table, availability, and wait-state vocabulary. The existing iCalendar RFC 5545 entry is a transport reference for appointment/free-busy exchange. | Active table-session entry and table operations are proven; manual verification, reservations, waitlist, and estimates are absent.                                           | Separate `core.location-context`, `core.availability`, `core.reservation`, and `core.queue` from the Restaurant Profile. They are the bridge to Appointment, not an extension of a Restaurant-only compiler branch.                                          |
| Identity, loyalty, promotion, saved preferences, reviews, and member payment | Existing commerce studies identify promotion/customer boundaries, but no fixed study supplies a Factory-owned identity or membership contract.                                                                                                          | These customer requirements are absent.                                                                                                                                      | Establish `core.identity-context` and a scoped `commerce.price-rule`/`core.loyalty` proposal only after the composition kernel; do not add them as UI-only Restaurant fields.                                                                                |
| Merchant authoring, amendment, settlement, printing, realtime, and offline   | Existing POS studies inform cashier, receipt, stock, reporting, and return vocabulary. The existing adoption register separately classifies browser printing, QR, realtime, and offline libraries/providers.                                            | Menu authoring, advanced amendments/refunds, settlement, governed printer, realtime UI, and offline experience remain partial or absent.                                     | Keep real payment, printer, transport, and offline mechanisms behind contracts. First make menu authoring and versioned amendments native; no provider becomes an order-state authority.                                                                     |

**Inference:** the existing portfolio is adequate for capability boundaries and
fixtures around the first Restaurant slice, but not for a whole-profile import
or for claiming coverage of its absent requirements. The immediate platform
gap is the parameterized composition kernel, followed by shared contracts;
Appointment and Ticketing should not start as copied vertical applications.

### Additional fixed public references

Every permissively licensed item is still **source-study/reference only**.
The license is compatible enough to study, but no entry changes the adoption
register or grants direct-dependency approval.

| Source and immutable public reference                                                                                                                                                                                                                   | Classification and exact license evidence                                                                                                                                                  | Observed fact and maintenance signal                                                                                                           | Behavioral pattern Factory may independently specify and test                                                                                                                    | Precise Factory capability/profile decision                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAPI Specification 3.2.0](https://github.com/OAI/OpenAPI-Specification/releases/tag/3.2.0), commit [`99710bcb26cbe4be646565eebeb04348f02374b5`](https://github.com/OAI/OpenAPI-Specification/commit/99710bcb26cbe4be646565eebeb04348f02374b5)       | Reference only; [Apache-2.0 license at the tag](https://github.com/OAI/OpenAPI-Specification/blob/3.2.0/LICENSE).                                                                          | The official release is dated 2025-09-19; the specification defines an API description format.                                                 | Typed command/query operation names, request/response schemas, error variants, and versioned API descriptions generated from a Published Graph.                                  | `core.api-contract` can be shared by every profile; first acceptance: Restaurant command conflicts and idempotent replay are represented in generated API documentation without importing an external API document into the Graph.                                   |
| [AsyncAPI Specification v3.1.0](https://github.com/asyncapi/spec/releases/tag/v3.1.0), commit [`b3fac5bb522771428ea57b16129b273cd3ea0180`](https://github.com/asyncapi/spec/commit/b3fac5bb522771428ea57b16129b273cd3ea0180)                            | Reference only; [Apache-2.0 license at the tag](https://github.com/asyncapi/spec/blob/v3.1.0/LICENSE).                                                                                     | The official release is dated 2026-01-31; its repository describes machine-readable asynchronous API definitions.                              | Declared channels, message schemas, publisher/consumer directions, correlation fields, and generated event documentation.                                                        | `core.event-contract` informs Restaurant kitchen notifications, Appointment reminders, Ticketing check-in events, and Internal Operations work notifications; transports remain adapters.                                                                            |
| [CloudEvents ce@v1.0.2](https://github.com/cloudevents/spec/releases/tag/ce%40v1.0.2), commit [`fc1f6f31f5f011a72183f1bcea20c987cb683ade`](https://github.com/cloudevents/spec/commit/fc1f6f31f5f011a72183f1bcea20c987cb683ade)                         | Reference only; [Apache-2.0 license at the tag](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/LICENSE).                                                                             | The official release is dated 2022-02-06; its core specification standardizes event context attributes and protocol-neutral event data.        | A Factory-owned immutable event envelope with a unique event ID, producer identity, event type, occurrence time, subject, and versioned payload reference.                       | `core.event-envelope` is the common outbox/export boundary. First acceptance: an order transition commits its audit/outbox facts before any kitchen, appointment, ticketing, or operations notification is emitted.                                                  |
| [Temporal TypeScript SDK v1.21.1](https://github.com/temporalio/sdk-typescript/releases/tag/v1.21.1), commit [`2503d4b454c21284cf6f1a919c9ea62bd059253d`](https://github.com/temporalio/sdk-typescript/commit/2503d4b454c21284cf6f1a919c9ea62bd059253d) | Reference only; [MIT license at the tag](https://github.com/temporalio/sdk-typescript/blob/v1.21.1/LICENSE).                                                                               | The official release is dated 2026-07-24. Upstream describes its SDK as a TypeScript/JavaScript framework for durable, long-running workflows. | Explicit waits, deadlines, retries, compensation, and a visible state history represented in a restricted Factory FlowModel, rather than user-supplied executable workflow code. | `workflow.deadline`, `workflow.escalation`, and `workflow.compensation` are shared candidates for Appointment reminders/no-shows, Ticketing holds/expiry, Internal Operations SLAs, and Restaurant cancellation. Temporal is not a Factory runtime dependency.       |
| [Kill Bill killbill-0.24.19](https://github.com/killbill/killbill/releases/tag/killbill-0.24.19), commit [`cc85f87a003011b6f291fd96203288eadf90cc33`](https://github.com/killbill/killbill/commit/cc85f87a003011b6f291fd96203288eadf90cc33)             | Reference only; [Apache-2.0 license at the tag](https://github.com/killbill/killbill/blob/killbill-0.24.19/LICENSE).                                                                       | The official release is dated 2026-07-09; upstream identifies the project as an open-source subscription billing and payments platform.        | Separating an order from payment attempts, immutable attempt outcomes, idempotency keys, and a later compensation/reversal record.                                               | `commerce.payment-attempt` and `commerce.settlement-intent` remain provider-neutral. The Restaurant profile retains simulated full payment; real money, invoices, refunds, and provider credentials remain out of scope.                                             |
| [pretix v2026.6.1](https://github.com/pretix/pretix/tree/v2026.6.1), commit [`2bd0a341d64383456bc78c18c636b4491cfe8945`](https://github.com/pretix/pretix/commit/2bd0a341d64383456bc78c18c636b4491cfe8945)                                              | **Excluded.** Its [license at the tag](https://github.com/pretix/pretix/blob/v2026.6.1/LICENSE) states AGPLv3 and additional terms; GitHub does not assign an SPDX identifier at this tag. | The tag commit is dated 2026-07-28. Upstream is an event-ticketing application.                                                                | None admitted from this source. Capacity, hold, issue, cancellation, and check-in requirements must be independently specified and tested by Factory.                            | Do not copy, embed, depend on, or use its UI/assets/migrations/source/runtime for Ticketing. A future native `ticketing.capacity`, `ticketing.hold`, `ticketing.issue`, and `ticketing.check-in` proposal needs its own public-source study and acceptance evidence. |

The previous Cal.com and pretix exclusions remain in force: GPL, AGPL,
source-available, custom, or otherwise unclear licensing is not a candidate
for copying, embedding, package adoption, or runtime use. The licenses above
are direct evidence at the recorded references, not a legal opinion.

### Ranked capability-package intake

This order is a Factory inference that optimizes use across profiles while
preserving Draft -> Publish -> immutable Compilation. Each item first needs a
Factory-owned manifest, typed Graph contribution, namespace/requirement checks,
fixtures, compiler contribution, and focused acceptance test.

1. **`core.composition` and `core.contract`** — parameter schemas, typed
   requirements/provides, collision detection, immutable package locks, API
   schemas, and Golden-fixture execution. This is the prerequisite for every
   other package and fixes the audit's platform-level gap.
2. **`core.identity-context`, `core.location-context`, and `core.audit`** —
   actor, role/policy binding, location, session scope, and append-only audit
   facts. These prevent Restaurant, Appointment, and Internal Operations from
   independently inventing authorization and tenancy semantics.
3. **`commerce.catalog`, `commerce.price`, `commerce.inventory`, and
   `commerce.line-configuration`** — items/services, categories, availability,
   stock, option groups, cardinality, notes, and price deltas. These compose
   into Restaurant menus, Ecommerce products, Appointment services, and
   Ticketing classes without cross-profile UI coupling.
4. **`commerce.intent`, `commerce.order`, `commerce.payment-attempt`, and
   `core.receipt`** — cart/hold, immutable versioned order, idempotent payment
   attempt, simulated settlement, cancellation reason, and receipt projection.
   Restaurant, Ecommerce, and paid Ticketing can share it with distinct
   bindings.
5. **`workflow.case`, `workflow.deadline`, `workflow.compensation`, and
   `core.notification`** — declared states, assignments, due times, retries,
   cancellation/compensation, and notification intent. This supports kitchen
   flow, appointments, ticket holds, and internal requests without introducing
   arbitrary workflow code.
6. **`core.availability`, `core.reservation`, and `core.queue`** — capacity,
   time window, allocation, waitlist, expiry, and reschedule facts. First use
   them for Restaurant reservations and Appointment bookings, then bind them
   to ticket capacity where the semantics match.
7. **`core.event-contract` and `core.event-envelope`** — generated event
   descriptions and persisted-outbox exports. Add a provider only after its
   contract/conformance suite; HTTP, Socket.IO, or another transport cannot
   advance Factory workflow state.
8. **Profile adapters last** — `restaurant.table-session`,
   `restaurant.kitchen-queue`, `restaurant.cashier`, `ticketing.check-in`, and
   `operations.work-queue`. These consume the shared packages above and must
   not back-propagate profile fields into their contracts.

### Proposed small profile catalog and first acceptance journeys

These are proposed Factory profiles, not observed upstream products. Each
journey is an acceptance target for one Published Graph compiled independently
to its declared UI, API, persistence, policy, flows, tests, and documentation.

| Proposed profile       | First capability composition                                                                                                   | First acceptance journey                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restaurant Ordering    | Shared catalog/order/inventory/payment/audit/workflow plus table session, menu options, kitchen queue, cashier, and reporting. | A guest enters a valid table session, selects a constrained modifier and note, submits and pays a simulated order once, sees the committed kitchen transition, and a cashier serves/cancels with stock and audit evidence. |
| Simple Ecommerce       | Shared identity/context, catalog, cart/order, inventory, simulated payment, receipt, and fulfilment workflow.                  | A shopper browses available stock, changes a cart, completes one idempotent simulated checkout, and an operator fulfils/cancels it without duplicating stock or audit facts.                                               |
| Appointment Operations | Shared identity/location, service catalog, availability/reservation/queue, workflow deadlines, audit, and notification intent. | A customer selects an available service time; a staff member confirms, reschedules, or records a no-show; collision checks, expiry/reminder intent, and audit history all derive from the Published Graph.                 |
| Event Ticketing        | Shared catalog/price/inventory, hold/order/payment attempt, event contract, audit, plus ticket capacity, issue, and check-in.  | An organizer publishes a bounded ticket class; a customer obtains one simulated paid ticket before hold expiry; an operator checks it in exactly once and cancellation releases capacity under declared rules.             |
| Internal Operations    | Shared identity/policy, case workflow, deadline/escalation, audit, notification intent, and work queue.                        | An employee opens a request, a triager assigns it, the assignee completes the declared state path before/after escalation, and the audit/event stream proves no unauthorized transition occurred.                          |

### Non-copy and decision boundary

No upstream code, UI, assets, migrations, seed data, source tree, generated
output, or runtime is copied or embedded from any source in this portfolio.
Such reuse is prohibited unless a separate fixed-commit source-study explicitly
approves exact paths, line ranges, license/notice obligations, Factory-owned
boundary, and tests. No entry above grants direct dependency approval or
changes the existing adoption decision.
