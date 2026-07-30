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

| Class | Meaning |
| --- | --- |
| Direct dependency candidate | A small upstream library may be pinned after dependency, security, and notice review. It is an adapter, not the Application Graph source of truth. |
| Source-study only | Study behavior and architecture, then independently implement a Factory contract and tests. Do not copy application source, assets, migrations, or UI. |
| Do not copy/embed | License or product topology makes the source unsuitable for Factory reuse. It may be read only as a public architecture reference. |

## Direct dependency candidates

| Candidate | Pinned public ref reviewed | License / observed fact | Factory decision |
| --- | --- | --- | --- |
| [Puck](https://github.com/puckeditor/puck) | [v0.22.4](https://github.com/puckeditor/puck/releases/tag/v0.22.4), 2026-07-30 | MIT. Its React/Next editor lets the host own data and configure components, fields, responsive viewports, dynamic props, and migrations. [Docs](https://puckeditor.com/docs) | Candidate PageModel adapter only. Translate allow-listed Puck data to a candidate PageModel; keep routes, bindings, effects, roles, and policies in Factory. Puck Cloud AI requires a separate privacy study. |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | [`360f5b13e2bc6899ea06b4be1a49b068d86926cf`](https://github.com/xyflow/xyflow/tree/360f5b13e2bc6899ea06b4be1a49b068d86926cf), 2026-07-29 | MIT. It exposes nodes, edges, custom handles, validation, layout, and accessibility primitives. [Docs](https://reactflow.dev/learn) | Candidate presentation/editor adapter for FlowModel, DomainModel, and lineage. Factory owns semantic validation and persistence. |
| [XState](https://github.com/statelyai/xstate) | [`b1811bf77bc2d1a74367328cec7907aa185b70df`](https://github.com/statelyai/xstate/tree/b1811bf77bc2d1a74367328cec7907aa185b70df), 2026-07-22 | MIT. It provides runtime state-machine semantics. | Candidate compiled FlowModel target. Packages and users may not inject arbitrary actions. |
| [node-casbin](https://github.com/apache/casbin-node-casbin) | [v5.51.1](https://github.com/casbin/node-casbin/releases/tag/v5.51.1), 2026-06-25 | Apache-2.0 Node authorization implementation. [Overview](https://casbin.apache.org/docs/overview/) | Candidate PolicyModel compiler target; handwritten policy files cannot become Graph inputs. |
| [Prisma ORM](https://github.com/prisma/prisma) | [7.9.1](https://github.com/prisma/prisma/releases/tag/7.9.1), 2026-07-29 | Apache-2.0. Prisma provides an explicit schema language and generated access/migrations. [Docs](https://www.prisma.io/docs/orm/prisma-schema/overview) | Candidate DomainModel compiler target. Generated schema and migrations are immutable artifacts. |

## Commerce and restaurant source studies

| Candidate | Pinned public ref reviewed | License / observed fact | Capability-level decision |
| --- | --- | --- | --- |
| [Medusa](https://github.com/medusajs/medusa) | [v2.18.0](https://github.com/medusajs/medusa/releases/tag/v2.18.0), 2026-07-30 | MIT. Upstream presents modular commerce for B2B/DTC, marketplaces, POS, and service businesses. | Source-study first; later optional Commerce Provider. Study catalog, cart, order, promotion, inventory, and payment boundaries. Do not add Medusa to v1 generated runtimes. |
| [Medusa Eats](https://github.com/medusajs/medusa-eats) | [`734e7a2fb2d5e2671daaacf2b79fb72fd75073a7`](https://github.com/medusajs/medusa-eats/tree/734e7a2fb2d5e2671daaacf2b79fb72fd75073a7), 2025-09-23 | MIT, an Uber Eats-style Next.js/Medusa example; no release baseline. | Source-study only. Use its browse/cart/checkout/tracking journey as a fixture reference, not a dependency. |
| [TastyIgniter](https://github.com/tastyigniter/TastyIgniter) | [v4.3.4](https://github.com/tastyigniter/TastyIgniter/releases/tag/v4.3.4), 2026-07-30 | MIT. It covers ordering, reservations, menus, locations, and table booking. | Source-study only. It informs `restaurant.menu`, `restaurant.table-session`, `restaurant.reservation`, `restaurant.order`, and `restaurant.location` boundaries; no Laravel/PHP or UI copying. |
| [Kasirku](https://github.com/rezadrian01/Kasirku) | [`8d6273d42206bf8a926475b1faf18d6c93dce84d`](https://github.com/rezadrian01/Kasirku/tree/8d6273d42206bf8a926475b1faf18d6c93dce84d), 2026-07-18 | MIT, a small React/Laravel POS with customer menu/cart/search, table numbers, status, dashboard, and receipts. | Low-maintenance source-study only. Use its journey vocabulary for `restaurant.table-session`, `restaurant.cashier`, `restaurant.kitchen-status`, `core.receipt`, and `core.print-job`; never reuse payment assumptions or source. |
| [Open Source Point of Sale](https://github.com/opensourcepos/opensourcepos) | [3.4.1](https://github.com/opensourcepos/opensourcepos/releases/tag/3.4.1), 2026-07-30 | MIT according to its [LICENSE](https://github.com/opensourcepos/opensourcepos/blob/master/LICENSE); PHP retail POS. | Source-study only. Use its POS vocabulary for cashier sessions, returns, cash drawer/receipt, stock movements, audit, and reports. |
| [Saleor Core](https://github.com/saleor/saleor) | [3.23.22](https://github.com/saleor/saleor/releases/tag/3.23.22), 2026-07-30 | BSD-3-Clause, with catalog/order/customer/promotion/cart/payment and separated dashboard/storefront. | Source-study only. It informs `commerce.*` interfaces and merchant/customer journey separation; its Python/GraphQL runtime is not a Factory target. |
| [Appwrite](https://github.com/appwrite/appwrite) | [1.9.6](https://github.com/appwrite/appwrite/releases/tag/1.9.6), 2026-07-30 | BSD-3-Clause backend platform. | Future provider study only; it may later provide data, identity, or storage targets but never owns Factory business semantics. |

## Explicit exclusions

| Source | License fact | Decision |
| --- | --- | --- |
| [Vendure](https://github.com/vendurehq/vendure) | Its [license](https://github.com/vendurehq/vendure/blob/master/LICENSE.md) states the community source is GPLv3, with separate commercial licensing. | Do not copy, embed, or depend on its GPLv3 source. It may remain read-only TypeScript/NestJS architecture reference. |
| Unpinned repository, template, demo, design asset, or arbitrary npm/Git dependency | A repository page alone proves neither stable provenance nor dependency/security posture. | Do not intake without a fixed source study, license review, package boundary, fixture, and verification plan. |

## Capability map inferred from the studies

This is architectural inference, not an assertion that upstream software
contains Factory-ready modules. Each row is intentionally smaller than a
profile and becomes a separate Factory package or contribution group.

| Capability family | Candidate Factory packages | Profile combinations |
| --- | --- | --- |
| Identity and context | `core.session`, `core.role-policy`, `core.profile`, `core.location-context` | Restaurant customer/merchant, Ecommerce customer/admin, Approval user/manager |
| Catalog and discovery | `commerce.catalog`, `commerce.category`, `commerce.search`, `commerce.price`, `commerce.media` | Restaurant menu, Ecommerce catalog, Appointment/service catalog |
| Intent and checkout | `commerce.cart`, `commerce.line-note`, `commerce.checkout`, `commerce.simulated-payment`, `commerce.receipt` | Restaurant dine-in/takeaway and Ecommerce checkout |
| Order lifecycle | `commerce.order`, `commerce.order-audit`, `workflow.fulfilment`, `core.notification` | Restaurant kitchen queue, Ecommerce lifecycle, service fulfilment |
| Operations | `commerce.inventory`, `restaurant.table-session`, `restaurant.kitchen-queue`, `restaurant.cashier`, `core.print-job`, `core.reporting` | Restaurant merchant suite and Ecommerce inventory/admin |
| Growth and scheduling | `commerce.promotion`, `core.loyalty`, `restaurant.reservation`, `core.queue` | Restaurant booking/queue and Ecommerce promotions |

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

| Mode | Observed upstream behavior | Factory decision |
| --- | --- | --- |
| Assembly | Puck Cloud can generate Puck `Data` from a natural-language prompt and a supplied component configuration. | Deferred provider study. It could propose a Draft-only PageModel candidate only after privacy, credential, retention, cost, availability, and prompt-injection controls are accepted. Its input must be a finite Factory-generated Golden component configuration, and its output must pass the same PageModel validator as Factory AI. |
| Design | Puck Cloud can create new component types and records them in `_dynamicConfig`; it can also introduce page-wide styles and optionally scripts. | Rejected for Factory. Dynamic component definitions do not have a Golden package identity, verified digest, declared schema, or declared target namespace, so they cannot participate in an immutable composition lock. |
| Tools | Puck Cloud documents host-server tools that can query systems or perform effects. | Rejected in v1. No model-selected Puck tool may read Factory data or perform side effects. A future read-only tool would require its own declared contract and policy gate. |

Factory will therefore use self-hosted Puck Core only as a PageModel editor
until a future `PuckAiPageProposalProvider/v1` passes a dedicated provider
decision. Puck Core may edit approved visual components, tokens, responsive
layout, and declared route links; it cannot add business effects, source,
scripts, URLs, policy, domain, or flow semantics.

## Restaurant capability boundary update — 2026-07-30

The official MIT-licensed TastyIgniter extension releases below were inspected
as source-study references, not dependencies or source-copy approval:

| Fixed public reference | Useful bounded concepts | Factory package direction |
| --- | --- | --- |
| [Cart v4.3.1](https://github.com/tastyigniter/ti-ext-cart/releases/tag/v4.3.1), commit [`287ec45dc3f545814c24c5a97f180a97409108fd`](https://github.com/tastyigniter/ti-ext-cart/commit/287ec45dc3f545814c24c5a97f180a97409108fd) | explicit menu option groups, selectable option values, quantity/cardinality, price deltas, comments, availability, stock history | `restaurant.menu-option-group`, `restaurant.menu-option`, `commerce.line-note`, `commerce.inventory` |
| [Local v4.1.5](https://github.com/tastyigniter/ti-ext-local/releases/tag/v4.1.5), commit [`305d39fd6d83dde68f6793692fadf91b073ea6ba`](https://github.com/tastyigniter/ti-ext-local/commit/305d39fd6d83dde68f6793692fadf91b073ea6ba) | current store selection, search, service area, operating-hour context | `core.location-context` |
| [Reservation v4.1.4](https://github.com/tastyigniter/ti-ext-reservation/releases/tag/v4.1.4), commit [`4b7f8559b77f8c1599b996067f67b6e8abb86432`](https://github.com/tastyigniter/ti-ext-reservation/commit/4b7f8559b77f8c1599b996067f67b6e8abb86432) | booking, dining area, table, availability, wait-state vocabulary | `restaurant.reservation`, `restaurant.table-session`, `core.queue` |

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
