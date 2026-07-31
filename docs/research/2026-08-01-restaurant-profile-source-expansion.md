# Restaurant Ordering Profile: public source expansion

**Research date:** 2026-08-01
**Decision:** Which public sources should inform *reusable, Factory-owned*
capability packages and optional provider boundaries needed by a future
Restaurant Ordering Profile, without importing a restaurant application or
claiming functionality that the accepted dine-in MVP does not prove?

This is a research memo, not a dependency, source-copy approval, provider
activation, Graph change, or Restaurant implementation plan. All public-source
facts were retrieved 2026-08-01. A release date, pushed date, or GitHub star
count is only an adoption/maintenance signal; it is not a security or legal
approval.

## Scope and evidence rules

The [requirements audit](../audits/restaurant-ordering-requirements-audit.md)
proves only a local dine-in MVP: opaque table session, menu/category/search,
cart quantities and notes, simulated cash/card full payment, deterministic
kitchen lifecycle, cashier receipt/browser print, stock effects, dashboards,
roles, and audit. In particular, configurable options, identity/membership,
real settlement, reservations/waitlist, executable pickup/delivery, printer
providers, realtime, and offline are absent or partial. Nothing in this memo
changes those facts.

The [external-intake design](../superpowers/specs/2026-07-31-external-capability-intake-design.md)
requires a resolved commit, archive/tree hashes, primary licence and notice
evidence, offline scans, source-study review, and a promotion decision before
any use. GPL, AGPL, SSPL, BSL, source-available, custom reciprocal, and unclear
licences block source copying or embedding. Provider documentation is evidence
for a replaceable contract only; it is not a source-intake candidate and must
not put an external model in the Application Graph.

**Classification:** `selective reuse` means a permissive source could be
considered only for a later file-and-line source study; `provider` means a
Factory-owned adapter with fixture/conformance/removal path; `reference` means
independent Factory implementation informed by observed behaviour; `excluded`
means no copying, linking, embedding, packaging, generated output, or runtime
use. “Fixed SHA route” is deliberately not an approval: it states exactly what
the quarantine-only intake would need to bind. Provider-only rows say `N/A`
where no public source distribution is proposed.

## Candidate records

| Public source, fixed reference, and primary licence evidence | Observed maintenance/adoption and targeted restaurant capability | Classification and exact restriction | Fixed-SHA intake route | Product decision affected |
| --- | --- | --- | --- | --- |
| [TastyIgniter v4.3.4](https://github.com/tastyigniter/TastyIgniter/releases/tag/v4.3.4), [commit `fb69286`](https://github.com/tastyigniter/TastyIgniter/tree/fb69286cd3c7830eb5731c147eb38df5dd709335), [MIT licence](https://github.com/tastyigniter/TastyIgniter/blob/fb69286cd3c7830eb5731c147eb38df5dd709335/LICENSE.md) | Release/push 2026-07-25; 3.7k GitHub stars observed. Upstream describes restaurant menus, online ordering, locations, reservations, and table booking. | **Selective reuse.** No Laravel app, migrations, payment/extension runtime, UI/assets, or booking schema. | Resolve the release tag to the listed SHA; acquire archive/tree and licence/notice paths only in `ecosystem/intake/**`; any candidate must be a new `restaurant.availability` or `reservation.capacity` study. | Keep availability, table session, and capacity as distinct reusable contracts. |
| [TastyIgniter Cart v4.3.1](https://github.com/tastyigniter/ti-ext-cart/releases/tag/v4.3.1), [commit `287ec45`](https://github.com/tastyigniter/ti-ext-cart/tree/287ec45dc3f545814c24c5a97f180a97409108fd), [MIT licence](https://github.com/tastyigniter/ti-ext-cart/blob/287ec45dc3f545814c24c5a97f180a97409108fd/LICENSE.md) | Release/push 2026-07-25. Cart options, choices, quantities, comments, availability, and price deltas are documented by its repository. | **Selective reuse.** No PHP/session/cart persistence, payments, templates, or extension runtime. | Bind `v4.3.1` to `287ec45…`; only a tiny pure validator may enter a future file-level study, with exact paths/ranges and notices. | Put option-group cardinality, availability, and price-at-selection in generic `commerce.line-configuration`. |
| [Open Source Point of Sale 3.4.1](https://github.com/opensourcepos/opensourcepos/releases/tag/3.4.1), [commit `5f395d9`](https://github.com/opensourcepos/opensourcepos/tree/5f395d987b02562092b838073cb2e23a22d2bca4), [MIT licence](https://github.com/opensourcepos/opensourcepos/blob/5f395d987b02562092b838073cb2e23a22d2bca4/LICENSE) | Release 2025-06-05; push 2026-07-30; 4.3k stars observed. POS covers cashier, tender, receipt, stock movement, returns, reports, and audit vocabulary. | **Reference.** The existing portfolio records a visible-footer condition; do not reuse code, UI, assets, database, receipt layout, or runtime. | The commit is fixed, but classify source-copy as prohibited until the extra displayed attribution condition is reviewed; no Candidate now. | Define cash-drawer/receipt/stock/audit seams without inheriting a retail application. |
| [Medusa v2.18.0](https://github.com/medusajs/medusa/releases/tag/v2.18.0), [commit `b574ef2`](https://github.com/medusajs/medusa/tree/b574ef20cbd58bc6a3361a3da969070e6ca97846), [MIT licence](https://github.com/medusajs/medusa/blob/b574ef20cbd58bc6a3361a3da969070e6ca97846/LICENSE) | Release 2026-07-23; push 2026-07-30; 35.5k stars observed. Product/cart/order/payment/inventory/fulfilment modules are public. | **Provider.** No Node runtime, module schema, migrations, admin/storefront, or provider implementation becomes authoritative. | Pin the listed source only if a later adapter study needs it; adapter candidate has empty source-copy ledger and uses a local fixture provider first. | Specify `CommerceProviderV1` only after native commerce contracts exist. |
| [Saleor 3.23.22](https://github.com/saleor/saleor/releases/tag/3.23.22), [commit `2ce3808`](https://github.com/saleor/saleor/tree/2ce380835a51ddde0f3815a5b410bc9f4e8d44f8), [BSD-3-Clause licence](https://github.com/saleor/saleor/blob/2ce380835a51ddde0f3815a5b410bc9f4e8d44f8/LICENSE) | Release 2026-07-27; push 2026-07-30; 23.2k stars observed. It separates catalogue, checkout, orders, customers, promotions, and payments. | **Provider.** No Python/GraphQL server, dashboard/storefront, plugin, or data model reuse. | Fixed commit supports a future adapter-only source study; record its BSD notice and use no copied path. | Keep a commerce adapter contract vendor-neutral rather than Medusa-specific. |
| [Bagisto v2.4.8](https://github.com/bagisto/bagisto/releases/tag/v2.4.8), [commit `17005ef`](https://github.com/bagisto/bagisto/tree/17005efdcadd56c9b46d57ce9b2dec24b29629b4), [MIT licence](https://github.com/bagisto/bagisto/blob/17005efdcadd56c9b46d57ce9b2dec24b29629b4/LICENSE) | Release 2026-07-08; push 2026-07-30; 27.9k stars observed. Public catalogue, checkout, inventory, customer, and administration functions. | **Selective reuse.** No Laravel app, database/migration, storefront/admin UI, payment, or inventory implementation. | Fixed commit is quarantine-only; require an exact, small pure-logic path/range and independent tests before any promotion packet. | Share catalogue/price/stock vocabulary across Restaurant and ecommerce. |
| [Spree v5.6.1](https://github.com/spree/spree/releases/tag/v5.6.1), [commit `9573936`](https://github.com/spree/spree/tree/95739365949b0c78dd3a8bde4d59f642b84f68e5), [BSD-3-Clause licence](https://github.com/spree/spree/blob/95739365949b0c78dd3a8bde4d59f642b84f68e5/LICENSE) | Release 2026-07-28; push 2026-07-30; 15.6k stars observed. Products, orders, promotions, payments, and stock are modular public concerns. | **Selective reuse.** No Ruby/Rails runtime, migrations, storefront/admin, payment code, or extension ecosystem. | Bind tag/commit plus BSD notice; proposed-copy requires source inventory and exact source-copy ledger. | Model `commerce.price-rule` and order adjustment separately from Restaurant UI. |
| [Vendure v3.7.1](https://github.com/vendure-ecommerce/vendure/releases/tag/v3.7.1), [commit `d968e11`](https://github.com/vendure-ecommerce/vendure/tree/d968e114f32ad6783f11b2fa95d94f7d1073cb1c), [GPLv3/commercial licence](https://github.com/vendure-ecommerce/vendure/blob/d968e114f32ad6783f11b2fa95d94f7d1073cb1c/LICENSE.md) | Release 2026-07-14; push 2026-07-30; 8.3k stars observed. Ecommerce plugin and TypeScript/NestJS boundaries are public. | **Excluded.** GPL community edition and commercial alternative block copy, package, generated output, and runtime adoption. | Fixed SHA may support read-only architecture notes only; do not create a source-copy/dependency Candidate. | Avoid selecting a TypeScript stack merely because it resembles Factory Pilot. |
| [ERPNext v15.118.3](https://github.com/frappe/erpnext/releases/tag/v15.118.3), [commit `7098602`](https://github.com/frappe/erpnext/tree/7098602dccf012a88683da862828899e245e5525), [GPL-3.0 licence](https://github.com/frappe/erpnext/blob/7098602dccf012a88683da862828899e245e5525/license.txt) | Release 2026-07-30; push 2026-07-30; 37.5k stars observed. POS, stock, recipes/BOM, manufacturing, accounting, and reporting concepts cover merchant operations. | **Excluded.** No Frappe/Python app, doctypes, stock or accounting logic, reports, migrations, UI, or sample data. | Fixed SHA is read-only vocabulary evidence; current policy blocks source intake. | Keep recipe/stock/settlement as independently authored capability contracts. |
| [Odoo 19.0](https://github.com/odoo/odoo/tree/19.0), [commit `4727199`](https://github.com/odoo/odoo/tree/4727199214d30f37f043f803aaf4901c5101b090), [LGPLv3 licence](https://github.com/odoo/odoo/blob/4727199214d30f37f043f803aaf4901c5101b090/LICENSE) | Commit pushed 2026-07-31; 53.4k stars observed. Official modules expose POS, restaurant floor/table, inventory, accounting, and reporting terminology. | **Reference.** LGPLv3 and a large application/migration ecosystem make it unsuitable for selective copying under current policy. | Treat as a fixed architecture reference only; no source/dependency Candidate without a specific policy and licence decision. | Separate table/floor layout from orders and settlements. |
| [Floreant POS `floreantpos-2.0`](https://github.com/floreantpos/floreantpos/tree/floreantpos-2.0), [commit `6cf73ad`](https://github.com/floreantpos/floreantpos/tree/6cf73ad8eaedd94400ba4bdff0a7f7cc98bf5356), [MRPL 1.2 with attribution clause](https://github.com/floreantpos/floreantpos/blob/6cf73ad8eaedd94400ba4bdff0a7f7cc98bf5356/LICENSE) | Repository pushed 2026-05-23. Restaurant POS/table, kitchen ticket, modifier, and cash-drawer ideas are visible. | **Excluded.** Custom reciprocal/attribution terms are not a permissive intake route; no Java app, printer, UI, database, or ticket logic. | Fixed SHA is reference-only; licence policy blocks intake. | Preserve native table/KDS state semantics and no forced-attribution UI. |
| [Square Node SDK 45.0.1](https://github.com/square/square-nodejs-sdk/releases/tag/45.0.1), [commit `1bf3d37`](https://github.com/square/square-nodejs-sdk/tree/1bf3d376f6ef03aabe9f7258cd829c1ae31af404), [MIT licence](https://github.com/square/square-nodejs-sdk/blob/1bf3d376f6ef03aabe9f7258cd829c1ae31af404/LICENSE) and [Square Orders API](https://developer.squareup.com/reference/square/orders) | SDK release/push 2026-07-14; API exposes order/catalog/payment/loyalty/inventory domains. | **Provider.** No direct SDK dependency yet, credential handling, provider data ownership, or mutation of a Published Graph. | If selected, pin this SHA and MIT notice in a separate provider/dependency study; first deliver a fake `PaymentsProviderV1` conformance fixture. | Payments, receipts, loyalty, and inventory must be replaceable integrations. |
| [Stripe Node v22.4.0](https://github.com/stripe/stripe-node/releases/tag/v22.4.0), [commit `57626dc`](https://github.com/stripe/stripe-node/tree/57626dcdfb94164fc9f112dfaa3c57aec5130e4f), [MIT licence](https://github.com/stripe/stripe-node/blob/57626dcdfb94164fc9f112dfaa3c57aec5130e4f/LICENSE) | Release 2026-07-29; push 2026-07-31; 4.5k stars observed. This is a maintained payment SDK, not restaurant domain source. | **Provider.** No direct dependency before payment threat model, webhook verification, money/settlement model, and conformance suite. | Pin the commit only under a payment-provider source study; no copied source and no test credentials. | Separate a payment attempt/receipt reference from settlement and order lifecycle. |
| [Adyen Node API library v32.0.0](https://github.com/Adyen/adyen-node-api-library/releases/tag/v32.0.0), [commit `99d1a0c`](https://github.com/Adyen/adyen-node-api-library/tree/99d1a0cf69c8660952baffd1437b00aae2fa4f23), [MIT licence](https://github.com/Adyen/adyen-node-api-library/blob/99d1a0cf69c8660952baffd1437b00aae2fa4f23/LICENSE) | Release 2026-07-15; push 2026-07-30. Maintained provider client for payment terminal/API operations. | **Provider.** No direct SDK, terminal integration, credentials, or merchant account model. | Fix the listed SHA only if a later terminal/payment provider review accepts it; adapter contract and fake must compile without it. | Add a terminal-provider boundary rather than hard-coding browser print/cashier behaviour. |
| [Toast Menus API](https://doc.toasttab.com/doc/devguide/apiGettingMenuInformationFromTheMenusAPI.html), [Orders API](https://doc.toasttab.com/doc/devguide/portalOrdersApiOverview.html) | Official docs retrieved 2026-08-01 describe resolved menus, modifiers/pricing, orders, dine-in/takeout/curbside/delivery, and KDS auto-fire. | **Provider.** The API documentation exposes no reusable source licence; access is commercial/credentialed. No source/runtime reuse, account creation, credential, or vendor schema authority. | **N/A for source SHA.** Record only versioned endpoint/document evidence; a future SDK, if any, must be separately pinned/licence-reviewed. | Restaurant-specific adapter mapping is future-only; menu/configuration remains Factory-owned. |
| [Clover developer reference](https://docs.clover.com/reference) | Official public developer documentation retrieved 2026-08-01 presents merchant API reference; Clover is an external POS/payment platform. | **Provider.** No public source licence is asserted for the service/API documentation; no SDK dependency, credentials, or remote data authority. | **N/A for source SHA.** Use documentation evidence for a provider contract only; independently pin any future client library. | Maintain a `PosProviderV1` seam rather than implementing against a single merchant platform. |
| [Uber Eats Order Fulfillment API](https://developer.uber.com/docs/eats/references/api/order_suite), [authentication/scopes](https://developer.uber.com/docs/eats/guides/authentication) | Official docs retrieved 2026-08-01 cover order webhooks, accept/deny/cancel, ready time, ready-to-handoff, price adjustment, and scoped OAuth; production scopes may require approval. | **Provider.** Proprietary/credentialed API; no source reuse, account request, webhook endpoint, credential, or operational commitment. | **N/A for source SHA.** Persist only a documentation evidence record; select/pin a public client separately if later authorised. | Treat marketplace orders as external fulfilment projections with idempotent reconciliation. |
| [DoorDash Drive guide](https://developer.doordash.com/en-US/docs/drive_classic/tutorials/get_started/) and [Create Delivery v2](https://developer.doordash.com/en-US/docs/drive/how_to/Parcel/api_create_delivery/) | Official docs retrieved 2026-08-01 describe quote/create/reschedule/cancel, scheduled deliveries, lifecycle events, tracking, and retry guidance. | **Provider.** Proprietary API; no delivery account, JWT, runtime client, or external delivery state as Graph truth. | **N/A for source SHA.** Evidence-only until a separate provider contract and fixed client source study. | Make delivery quote/dispatch/tracking an optional provider projection after native pickup is proven. |
| [QZ Tray v2.2.6](https://github.com/qzind/tray/releases/tag/v2.2.6), [commit `4be9430`](https://github.com/qzind/tray/tree/4be94301797d04684f4d70c6bbbff5d9acc36987), [LGPL-2.1 licence and component terms](https://github.com/qzind/tray/blob/4be94301797d04684f4d70c6bbbff5d9acc36987/LICENSE.txt) | Release 2026-04-05; push 2026-07-29; 1.0k stars observed. Its public project concerns browser-to-local-printer communication. | **Reference.** LGPL/component terms plus local-device/security implications exclude copying/embedding today. | Fixed SHA may support a threat-model/reference study only; no dependency or source Candidate. | Browser print is not a governed receipt/label/printer provider. |
| [Workbox v7.4.1](https://github.com/GoogleChrome/workbox/releases/tag/v7.4.1), [commit `62b9d8b`](https://github.com/GoogleChrome/workbox/tree/62b9d8ba8eb3c1a2ab8aac9d84c90cda7865d6a3), [MIT licence](https://github.com/GoogleChrome/workbox/blob/62b9d8ba8eb3c1a2ab8aac9d84c90cda7865d6a3/LICENSE) | Release 2026-05-05; push 2026-07-25; 13.0k stars observed. This is a maintained service-worker/PWA toolkit. | **Reference.** No service worker, cache policy, queue, or package adoption is proposed; upstream defaults must not define payment/order consistency. | The SHA is available for a future direct-dependency study, but first define Factory offline policies/fixtures and conflict tests. | Offline must be a cross-profile capability, not Restaurant-only cache code. |
| [Dexie v4.4.4](https://github.com/dexie/Dexie.js/releases/tag/v4.4.4), [commit `f151e96`](https://github.com/dexie/Dexie.js/tree/f151e9629d03062453857b8a1899f7ecc2f19b9c), [Apache-2.0 licence](https://github.com/dexie/Dexie.js/blob/f151e9629d03062453857b8a1899f7ecc2f19b9c/LICENSE) | Release 2026-06-16; push 2026-07-08; 14.5k stars observed. Public IndexedDB library useful only as an implementation option for local projections. | **Selective reuse.** No dependency adopted; local persistence may not become a second order/inventory truth or bypass idempotency/audit. | Pin commit/licence only after an offline source/dependency review with schema migration, encryption, retention, queue, and reconciliation evidence. | Define an `offline.command-queue` contract before choosing a storage library. |
| [Open Food Facts Server v2.98.0](https://github.com/openfoodfacts/openfoodfacts-server/releases/tag/v2.98.0), [commit `d3f31f1`](https://github.com/openfoodfacts/openfoodfacts-server/tree/d3f31f1217870fbeae831b4eef4ad79bdaf92c2d), [AGPL-3.0 licence](https://github.com/openfoodfacts/openfoodfacts-server/blob/d3f31f1217870fbeae831b4eef4ad79bdaf92c2d/LICENSE) | Release 2026-07-16; push 2026-07-30. Public food-product catalogue signals an optional ingredient/nutrition enrichment concern. | **Excluded.** AGPL blocks source/runtime reuse; no food database import, ingredient logic, images, or user/merchant data. | Fixed SHA is read-only landscape evidence; no intake Candidate. | Ingredient/nutrition enrichment, if ever needed, is a separately governed provider/data decision. |

## Coverage and composable profile map

| Restaurant concern | Observed source coverage | Factory-owned reusable package candidate | Restaurant Profile subgraph contribution (future, not implemented) |
| --- | --- | --- | --- |
| Menu, catalogue, option/modifier and cart | TastyIgniter Cart; Toast; Medusa/Saleor/Bagisto/Spree | `commerce.catalog`, `commerce.line-configuration`, `commerce.cart` | `menu`, `option-group`, `option`, `order-line-configuration`, immutable selected-price/availability facts |
| Table, capacity, reservation/waitlist | TastyIgniter; Odoo and Floreant as restricted references | `hospitality.table-session`, `reservation.capacity` | `venue-area`, `table`, `party`, `reservation`, `waitlist-entry`; table session only binds an accepted reservation or walk-in |
| Kitchen display and lifecycle | Toast Orders/KDS; TastyIgniter; restricted Floreant | `fulfilment.production-queue` | `kitchen-ticket`, `station`, `course`, priority, acceptance/preparing/ready/served transitions and outbox projection |
| Inventory and recipes | ERPNext/Odoo references; OSPOS; ecommerce references | `inventory.ledger`, `inventory.recipe` | `ingredient`, `recipe`, `stock-item`, reservation/release/consumption/adjustment facts; recipe calculation remains independent |
| Payment, settlement and receipt | Square, Stripe, Adyen; OSPOS reference | `payments.attempt`, `payments.settlement`, `receipt.document` plus `PaymentsProviderV1` | payment attempt/authorise/capture/refund and receipt reference; no provider payload controls order truth |
| Loyalty, promotions and member pricing | Square, Saleor, Spree | `identity.membership`, `commerce.price-rule`, `loyalty.ledger` | member account, offer eligibility, earned/redeemed points, price adjustment facts; requires identity first |
| Pickup, delivery and marketplace reconciliation | Toast, Uber Eats, DoorDash Drive | `fulfilment.pickup`, `fulfilment.delivery` plus `DeliveryProviderV1` / `MarketplaceOrderProviderV1` | fulfilment appointment/address/dispatch/tracking projections; delivery added only after independent pickup slice |
| Merchant dashboards/reporting | OSPOS; ERPNext/Odoo; ecommerce references | `analytics.operational-read-model` | derived sales/order/prep/stock metrics with data lineage; not a source of command authority |
| Printer/labels | QZ Tray restricted reference; current browser print | `printing.document` plus `PrintProviderV1` | render request, printer selection, delivery receipt, retry/audit; no browser or local agent is assumed |
| Offline/PWA | Workbox; Dexie | `offline.projection`, `offline.command-queue` | cache policy, queued idempotent command, conflict/expiry/reconciliation/telemetry bindings; not local inventory/order authority |

## Findings separated from inference

### Observed facts

1. Maintained, permissively licensed public projects cover catalog/cart/order,
   commerce, and browser storage concerns: TastyIgniter and Cart are MIT;
   Medusa/Bagisto are MIT; Saleor/Spree are BSD-3-Clause; Workbox is MIT; Dexie
   is Apache-2.0. Their immutable commit links and release/push signals are in
   the candidate table.
2. The restaurant-specific full-application landscape is materially mixed:
   Vendure is GPLv3/commercial, ERPNext is GPL-3.0, Floreant uses a custom MRPL
   attribution licence, and Odoo/QZ Tray are LGPL-based. These are not
   permissive source-copy approvals under the intake policy.
3. Public Toast documentation explicitly models menus, option groups/pricing,
   dining options, order updates, and KDS auto-fire. Uber Eats and DoorDash
   documentation explicitly model accepted/cancelled/ready or dispatch/tracking
   workflows, but require credentialed commercial integrations.
4. The audit proves the current MVP lacks the contract layers that these sources
   would exercise: declared modifiers, reservations, provider settlement,
   realtime, and offline semantics.

### Factory inferences and resulting product decisions

| Decision | Evidence-supported inference | Resulting guardrail |
| --- | --- | --- |
| Prioritise composition before restaurant growth | The most useful logic divides into catalogue, configuration, inventory, fulfilment, payment, membership, and offline concerns; full apps bundle them with their own runtime/data model. | Deliver Parameterized Capability Composition v1, then migrate shared commerce assets before a Restaurant-only feature. |
| Make modifiers a first reusable capability slice | The closest permissive restaurant logic is TastyIgniter Cart; the audit identifies configurable modifiers as partial. | Define `commerce.line-configuration` with bounded rules, immutable selection/price evidence, fixtures, and conformance tests; do not copy Cart PHP/session logic. |
| Keep provider boundaries outside native money/order truth | Square/Stripe/Adyen/Toast/Uber/DoorDash show important integrations but each is credentialed and vendor-specific. | Native orders, inventory, audit, and fulfilment state remain authoritative; providers receive Published-Graph projections and return opaque IDs/statuses. |
| Separate reservation, table, and queue | Restaurant and ERP/POS references conflate these domains differently; the MVP has no reservation/waitlist model. | Introduce `reservation.capacity` separately from `hospitality.table-session`, with explicit cancellation/no-show/walk-in policies. |
| Treat offline and printing as cross-profile infrastructure | Workbox/Dexie and QZ Tray address local browser/device mechanics rather than Restaurant semantics. | No PWA or printer implementation until Factory contracts specify queue, conflict, retention, device trust, conformance fixtures, and removal path. |

## Intake and promotion boundary

No row is approved for reuse. For every non-excluded source that later merits
study, the next artifact is a **new** immutable intake request with the exact
SHA above, primary licence/notice inventory, archive and tree digests, scanner
results, source/module inventory, and a source-study record. A selective-reuse
proposal additionally needs an exact path-and-line copy ledger and independently
authored Factory tests. A provider proposal needs a Factory contract, fixture,
conformance tests, retry/idempotency/error mapping, credential policy, and a
removal path. It may never modify a Draft or Published Revision or let external
records define Graph semantics.

Accordingly, this research changes no Restaurant capability claim. It offers a
source-governed path for future composable capabilities, while the current
dine-in MVP remains the scope proven by the audit.
