# Domain capability and provider ecosystem

**Research date:** 2026-08-01  
**Decision investigated:** Which externally maintained libraries, services, and
reference implementations can accelerate rich Application Graph Profile recipes
without turning Factory Pilot into a collection of copied vertical products.

## Decision

Factory should build rich Profiles from a limited set of Factory-owned,
versioned capability contracts. It should use small permissive libraries as
pinned implementation details and place stateful services behind typed provider
adapters. It must not treat a third-party application schema, database, UI, or
workflow runtime as an `ApplicationGraph` authority.

This is particularly important for a Restaurant Profile. A credible restaurant
application has customer and merchant capabilities far beyond the current
MVP, but those capabilities overlap heavily with ecommerce, booking, CRM,
inventory, field service, approval, content, and education profiles. The right
unit of reuse is a Graph subgraph and a capability contract, not a forked
restaurant repository.

```text
Published Application Graph
  -> Factory capability contracts and locks
  -> generated command/projection adapters
  -> pinned library or provider adapter
  -> external system
```

**Observed fact:** the reviewed upstream projects below are maintained under
the licences stated in their official repositories. Links were checked against
public upstream pages on 2026-08-01. Licence and adoption are intake signals,
not a security certification or permission to copy source.

**Inference:** a portfolio of about 25 cross-domain capability contracts can
support more than 100 Profile recipes. A Profile is a set of Graph bindings,
asset locks, fixtures, journeys, and optional adapters; it is not a hand-coded
vertical application.

## Classification and non-negotiable boundary

| Classification       | Meaning                                                                                                             | Graph boundary                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Direct library**   | A small, pinned dependency may be considered after source study and normal dependency review.                       | It receives typed, compiler-owned values only. It cannot select Graph assets or mutate Drafts.                                          |
| **Provider adapter** | A service is reached only through a Factory interface with a fake/conformance suite.                                | It receives a bounded command or projection and returns a typed receipt/event. It cannot author policy, flow, audit, or business facts. |
| **Source study**     | The repository is a valuable design, test, or data-model reference. No source may be copied by this classification. | Factory authors independent contracts and implementation after a separately approved copy ledger, if any.                               |
| **No-copy**          | Copyleft, source-available, mixed, archived, or unsuitable material is reference-only.                              | It cannot be embedded, linked, installed as a required runtime, or copied under the current policy.                                     |

No entry below is an installed dependency, Candidate, Golden capability,
approved provider, source-copy permission, or runtime authority.

## Candidate inventory

### Identity, policy, workflow, jobs, and messaging

| Upstream and official source                                                | Exact licence | Classification          | Neutral capability contract and Graph boundary                                                                                             | Rationale and risk                                                                                                                                                       |
| --------------------------------------------------------------------------- | ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Keycloak](https://github.com/keycloak/keycloak)                            | Apache-2.0    | Provider adapter        | `identity.oidc-session/v1`: verified principal, issuer, session expiry, logout receipt. The Graph owns roles, policy and profile entities. | Active releases and OIDC/SAML support make it a strong production identity option. Realm configuration and admin credentials must remain environment configuration.      |
| [Ory Kratos](https://github.com/ory/kratos)                                 | Apache-2.0    | Provider adapter        | `identity.self-service/v1`: opaque authenticated principal and recovery/verification outcome.                                              | It covers headless identity flows. Do not import its identity schema into `DomainModel`; identity-provider migration and PII retention need their own conformance suite. |
| [Apache Casbin / node-casbin](https://github.com/apache/casbin-node-casbin) | Apache-2.0    | Direct library          | `policy.decision/v1`: compiled role/resource/action check and generated Nest guard. Graph PolicyModel is the only model input.             | Casbin documents ACL/RBAC/ABAC support. Generated applications must not accept arbitrary model/policy text.                                                              |
| [OpenFGA](https://github.com/openfga/openfga)                               | Apache-2.0    | Provider adapter, later | `policy.relationship-decision/v1`: tuple-backed relationship check with correlation ID.                                                    | Appropriate for marketplace/share/multi-organisation Profiles. Relationship tuples and model revisions are a provider projection, never the PolicyModel source.          |
| [XState](https://github.com/statelyai/xstate)                               | MIT           | Direct library          | `workflow.state-machine/v1`: closed state/event/guard/effect machine compiled from FlowModel.                                              | Useful for approval, order, booking, and service flows. Reject editor- or AI-supplied JavaScript actions; compile only declared effects.                                 |
| [Temporal](https://github.com/temporalio/temporal)                          | MIT           | Provider adapter        | `workflow.durable-execution/v1`: start, signal, query, cancel, and outcome for a Factory correlation ID.                                   | Mature durable execution reference/service for long-running work. Workflow versioning and operational footprint rule out embedding it as generated business truth.       |
| [BullMQ](https://github.com/taskforcesh/bullmq)                             | MIT           | Direct library          | `jobs.durable-command/v1`: delayed/retried/idempotent delivery of an already-committed command.                                            | The project documents delayed jobs, priorities, rate limiting, and deduplication. Queue completion is not business truth: outbox fact first, job second.                 |
| [NATS / JetStream](https://github.com/nats-io/nats-server)                  | Apache-2.0    | Provider adapter        | `events.transport/v1`: versioned outbox envelope, consumer cursor, replay, dead-letter result.                                             | CNCF project with many releases and clients. At-least-once delivery requires idempotent consumers; inbound events cannot execute arbitrary Graph commands.               |
| [Valkey](https://github.com/valkey-io/valkey)                               | BSD-3-Clause  | Provider adapter        | `cache.ephemeral/v1` and queue/cache backing-provider configuration only.                                                                  | A permissive Redis-compatible option. It may cache projections or support jobs, but may not store canonical orders, permissions, locks, or receipts.                     |

### Payments, notification, document, storage, search, and observability

| Upstream and official source                                                   | Exact licence                            | Classification                     | Neutral capability contract and Graph boundary                                                                                   | Rationale and risk                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Stripe Node SDK](https://github.com/stripe/stripe-node)                       | MIT                                      | Provider adapter                   | `payment.intent/v1`: create/confirm/cancel/reconcile immutable payment attempt/result facts.                                     | The SDK is a client, not a payment domain model. Start with a local fake; real money needs webhook signature, retries, reconciliation, credential isolation, and legal review.           |
| [Adyen Node API library](https://github.com/Adyen/adyen-node-api-library)      | MIT                                      | Provider adapter                   | Same `payment.intent/v1`; provider-specific request/response mapping is adapter-private.                                         | Gives a second payment-provider comparison path. Do not compile direct SDK calls into capability logic or expose provider credentials to Graph/AI/UI.                                    |
| [Novu](https://github.com/novuhq/novu)                                         | MIT core; commercial `/enterprise` areas | Source study then provider adapter | `notification.dispatch/v1`: intent, template reference, preference decision, delivery attempt, receipt.                          | Its multi-channel model is useful, but the mixed tree requires a path-level licence inventory. Notification content/PII, opt-out, and provider failures remain Factory responsibilities. |
| [Gotenberg](https://github.com/gotenberg/gotenberg)                            | MIT                                      | Provider adapter                   | `document.render/v1`: approved template projection to immutable PDF artifact digest.                                             | Its Docker API can render documents to PDF. Never offer arbitrary URL/file/path conversion; enforce template/data schema, egress, timeout, and isolation.                                |
| [Meilisearch](https://github.com/meilisearch/meilisearch)                      | `MIT AND BUSL-1.1` repository; CE is MIT | Source study then provider adapter | `search.index-projection/v1`: policy-filtered, rebuildable document projection; query -> entity references only.                 | CE can be evaluated, but the repository contains enterprise material. Search indexes are not data authority and must be re-built from published facts.                                   |
| [SeaweedFS](https://github.com/seaweedfs/seaweedfs)                            | Apache-2.0                               | Provider adapter                   | `storage.object/v1`: signed upload/download intent and immutable object descriptor.                                              | Permissive S3/file storage candidate. Store only object descriptors in Graph/domain facts; quota, retention, malware scanning, and encryption remain explicit policies.                  |
| [MinIO](https://github.com/minio/minio)                                        | AGPL-3.0                                 | No-copy                            | No Factory runtime contract decision from this repo. Use generic `storage.object/v1` with another reviewed provider if required. | The upstream is AGPL and archived/read-only according to its public repository. It is not eligible for copying/embedding under current policy.                                           |
| [OpenTelemetry JavaScript](https://github.com/open-telemetry/opentelemetry-js) | Apache-2.0                               | Direct library                     | `ops.telemetry/v1`: trace context, redacted metric/log/event emission.                                                           | Vendor-neutral instrumentation for all generated applications. Sensitive business/identity data must be excluded at compilation time.                                                    |
| [Prometheus](https://github.com/prometheus/prometheus)                         | Apache-2.0                               | Provider adapter                   | `ops.metrics-query/v1`: allowed aggregate metric query and alert outcome.                                                        | Mature metrics reference/provider. Raw labels cannot become an unbounded PII or tenant-exfiltration channel.                                                                             |
| [Grafana](https://github.com/grafana/grafana)                                  | AGPL-3.0                                 | No-copy                            | Graph emits governed dashboard specifications; no Grafana source/runtime adoption is implied.                                    | Useful as a dashboard-design reference but not eligible for copying or embedding under current policy.                                                                                   |

### Commerce, hospitality, scheduling, CRM, import/export, and maps

| Upstream and official source                                                | Exact licence                         | Classification                           | Neutral capability contract and Graph boundary                                                              | Rationale and risk                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Medusa](https://github.com/medusajs/medusa)                                | MIT                                   | Source study; future provider comparison | Factory-authored `commerce.catalog`, `cart`, `order`, `pricing`, `inventory`, and `fulfilment` contracts.   | Its TypeScript modular commerce model is a useful reference for ecommerce and food delivery. It must not become the canonical order schema or generated runtime.     |
| [Saleor](https://github.com/saleor/saleor)                                  | BSD-3-Clause                          | Source study; future provider comparison | Same provider-neutral commerce contracts as Medusa.                                                         | An API-first commerce reference with a permissive core licence. Its Python/GraphQL data model remains external and must not leak into Factory Graph contracts.       |
| [Vendure](https://github.com/vendure-ecommerce/vendure)                     | GPL-3.0                               | No-copy                                  | No integration. Use only for feature comparison.                                                            | Its NestJS/TypeScript architecture is informative but its core GPLv3 licence excludes copying, linking, or required runtime embedding under current policy.          |
| [Mercur](https://github.com/mercurjs/mercur)                                | MIT                                   | Source study                             | `commerce.marketplace-party/v1`: seller, catalogue ownership, commission projection; no direct model reuse. | A Medusa-based marketplace reference. The dependency stack and upgrade/security responsibility make a full clone unsuitable.                                         |
| [Open Source Point of Sale](https://github.com/opensourcepos/opensourcepos) | GPL-3.0                               | No-copy                                  | No integration. Discover POS feature vocabulary only.                                                       | A vertical POS reference for cashier, receipts, employee permissions, and stock concepts; the GPL model cannot be copied.                                            |
| [FullCalendar React](https://github.com/fullcalendar/fullcalendar-react)    | MIT                                   | Direct library                           | `experience.schedule-view/v1`: rendered time-grid/list of Graph reservation projections.                    | Useful presentation adapter for reservation, appointment, class, and field-service Profiles. It must not decide booking capacity or write reservations.              |
| [Cal.com](https://github.com/calcom/cal.com)                                | AGPL-3.0                              | No-copy                                  | No integration. Use only for scheduling-product comparison.                                                 | Its scheduling UX and integration breadth are useful references, but its AGPL application source is not eligible for Factory reuse.                                  |
| [Twenty](https://github.com/twentyhq/twenty)                                | AGPL-3.0                              | No-copy                                  | No integration. Use only to catalogue CRM capability gaps.                                                  | Its CRM entities and workflows are reference material; Factory should independently author contact, activity, assignment, and consent contracts.                     |
| [SheetJS Community Edition](https://github.com/SheetJS/sheetjs)             | Apache-2.0                            | Direct library                           | `data.exchange/v1`: schema-bound workbook import/export with dry-run/error rows.                            | The upstream explicitly identifies CE as Apache-2.0. Do not treat spreadsheets as Graph or policy input; imports require validation, redaction, rollback, and audit. |
| [ExcelJS](https://github.com/exceljs/exceljs)                               | MIT                                   | Direct library                           | `data.export/v1`: generated workbook/report projection only.                                                | TypeScript-friendly XLSX generation. Use a deterministic report schema and size/time limits; never execute workbook formulas as business logic.                      |
| [Papa Parse](https://github.com/mholt/PapaParse)                            | MIT                                   | Direct library                           | `data.csv-import/v1`: bounded CSV parse -> validated staging rows.                                          | Browser/server parsing can support catalog, contacts, inventory, and education imports. CSV parsing is not authorization or transactional import.                    |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)                | BSD-3-Clause                          | Direct library                           | `experience.map-view/v1`: display-only markers, route geometry, viewport.                                   | Supports delivery, field-service, property, and pickup experience. Tiles, geocoding, routing, location consent, and retention are separate provider/policy choices.  |
| [PostHog](https://github.com/PostHog/posthog)                               | MIT core with separate `ee/` material | Source study then analytics adapter      | `analytics.product-event/v1` and `experiment.assignment/v1` with Factory-owned event schema.                | Useful analytics/feature-flag reference, but mixed licensing and behavioural data retention require path-level review and consent controls.                          |

### Representative direct dependencies for visual and Graph authoring

These remain platform/editor implementation candidates rather than business
capabilities. They are listed because a usable Profile factory needs visual
composition without granting UI libraries semantic authority.

| Upstream and official source                            | Exact licence | Classification | Neutral capability contract and Graph boundary                                                                     | Rationale and risk                                                                                                                                    |
| ------------------------------------------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)              | MIT           | Direct library | `experience.page-composition/v1`: declared blocks, routes, tokens, responsive layout; PageModel remains canonical. | The host owns its saved data. Constrain blocks and bindings; do not import untrusted component source.                                                |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | MIT           | Direct library | `experience.graph-layout/v1`: visual coordinates and validated edges for Flow/Domain/lineage editors.              | Useful for Graph Studio. Coordinates cannot create executable nodes, effects, or connections.                                                         |
| [Zod](https://github.com/colinhacks/zod)                | MIT           | Direct library | `schema.validation/v1`: generated input/output schema validation.                                                  | Useful at capability/provider boundaries. Schema definitions are compiler-owned and versioned; user data never dynamically widens the Graph contract. |

**Inventory total: 34 upstream projects.** This is a research inventory, not a
bulk adoption list. Its value is coverage of domain contracts and explicit
licence/operational boundaries.

## Restaurant feature matrix: reuse versus provider adapters

The table separates required customer/merchant groups from the reusable
capabilities that Factory should own and the optional systems that can be
adapted. “New package” means a Factory-authored, Graph-level slice is still
needed; it does not mean a new hand-coded restaurant app.

| Requested feature group                                    | Reusable Factory capabilities / package direction                                                               | Optional external adapter or library                                     | Current maturity and required proof                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer sign-in, saved store, location                    | `core.identity-context`, `party.membership`, `core.location-context`                                            | Keycloak or Ory provider                                                 | Identity/location contracts exist or are planned; prove local provider fake, ownership, logout, retention, and cross-profile bindings.                           |
| QR table entry and manual table number                     | `hospitality.table-context`, `core.location-context`, `core.qr-token`                                           | QR library after separate study                                          | New hospitality/context package. Prove opaque/expired/foreign token rejection and manual-table equivalence.                                                      |
| Menu, categories, search, details                          | `commerce.catalog`, `commerce.line-configuration`, `search.index-projection`                                    | Meilisearch provider                                                     | Catalog exists in the shared commercial direction; option/price/search authoring and rebuildable policy filtering remain gaps.                                   |
| Cart, quantity, line note and order note                   | `commerce.cart`, `commerce.configured-line`, `commerce.order`                                                   | None required                                                            | Shared Graph packages, not a restaurant clone. Prove per-line vs whole-order audit facts, expected version, and price recalculation.                             |
| Submit, status, payment, history and reorder               | `commerce.order`, `commerce.payment-intent`, `commerce.order-event`                                             | Local fake first; Stripe/Adyen later                                     | Simulated payment exists; real payment is explicitly later. Prove duplicate callback/reconciliation and no money claim from fixture results.                     |
| Reviews, photo, member and promotion                       | `party.membership`, `core.attachment`, `commerce.price-rule`, `feedback.review`                                 | Object storage provider, notification provider                           | New packages. Require consent, retention/deletion, content moderation boundary, deterministic price stacking, and receipt parity.                                |
| Reservation, waitlist, pickup, delivery                    | `reservation.capacity`, `fulfilment.pickup`, `fulfilment.delivery`                                              | FullCalendar presentation, MapLibre presentation, routing provider later | New generic scheduling/fulfilment packages. Prove capacity races, handoff/timeout/cancellation, location privacy, and role-safe journeys.                        |
| Merchant table open/merge/move/hold                        | `hospitality.table-allocation`, `commerce.order-hold`                                                           | None required                                                            | New hospitality overlays. Prove exclusivity, merge/move conflicts, traceable ownership, audit, and stock/order consistency.                                      |
| Menu authoring, variants, availability, price              | `commerce.catalog-authoring`, `commerce.line-configuration`, `commerce.price-rule`, `commerce.inventory-ledger` | SheetJS import/export                                                    | New Graph packages around existing foundations. Prove role policy, option cardinality, decimal rounding, import dry-run, and no partial mutation.                |
| Kitchen display, priority, call number, amendments/refunds | `hospitality.kitchen-queue`, `commerce.order-amendment`, `core.event-envelope`                                  | NATS/Valkey realtime provider later                                      | Kitchen is currently vertical evidence only. Extract event-derived read projection and prove idempotent/replay-safe ordering; refunds stay apart from amendment. |
| Cashier, payment methods, split bill, settlement, print    | `commerce.payment-intent`, `commerce.settlement`, `receipt.document`, `printing.document`                       | Stripe/Adyen, Gotenberg, printer provider                                | Simulated payment/receipt evidence is not a settlement system. Real/split payment and financial posting need independent regulatory scope.                       |
| Member marketing and notifications                         | `party.membership`, `campaign.audience`, `notification.dispatch`                                                | Novu provider                                                            | New packages plus consent/preference controls. Prove preference enforcement and failed delivery does not roll back business facts.                               |
| Sales, time/category/customer analytics and stock alerts   | `analytics.operational-read-model`, `commerce.inventory-ledger`, `core.audit-log`                               | Prometheus/PostHog provider later                                        | Derive read models from committed facts. Prove rebuild, cancellation/amendment parity, role filters, export redaction, and no mutable-dashboard authority.       |
| Roles, audit, import/export, lock                          | `policy.decision`, `core.audit-log`, `data.exchange`, `administration.lock`                                     | Casbin; OpenFGA later                                                    | Casbin/audit direction exists. New exchange/lock packages need schema versioning, dry run, redaction, locked-state rejection, and audit.                         |

## Prioritized adoption and source-study queue

The first queue deliberately favours contracts that unlock many Profiles. Each
row is still subject to the quarantine/promotion procedure below. “Adopt” here
means write Factory-owned contract/fixture work, not install or copy upstream
material today.

| Priority | Candidate                      | Recommended next action                                                                                                                | Profiles unlocked                                                | First acceptance evidence                                                                                           |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1        | BullMQ + Valkey                | Study and author `jobs.durable-command/v1`; use local fake/queue fixture.                                                              | Imports, notifications, documents, reports, fulfilment.          | Outbox-first, retry, idempotency, cancellation, removal, and no job-as-truth tests.                                 |
| 2        | XState                         | Adopt a closed FlowModel compiler target only.                                                                                         | Approval, restaurant, ecommerce, booking, field service.         | Invalid transition/effect rejection, replay, deterministic test generation.                                         |
| 3        | Casbin                         | Conform existing PolicyModel compiler to a narrowed guard interface.                                                                   | Every profile.                                                   | Role/resource/action matrix, deny, ownership, generated API and browser journeys.                                   |
| 4        | Keycloak                       | Source study and ProviderV1 contract with a local OIDC fake.                                                                           | Every production-oriented profile.                               | Claims mapping, expiry/logout, tenant isolation, no credentials in Graph/artifacts.                                 |
| 5        | OpenTelemetry + Prometheus     | Add redacted telemetry and aggregate metrics contracts.                                                                                | Every profile and provider.                                      | PII redaction, trace correlation, metric schema, disabled-provider fallback.                                        |
| 6        | SheetJS + Papa Parse + ExcelJS | Author `data.exchange/v1` then pin parsers/writer only if needed.                                                                      | Catalog, CRM, inventory, education, content.                     | Dry-run, per-row errors, rollback, redacted export, limit tests.                                                    |
| 7        | Gotenberg                      | Define `document.render/v1` and a local fake.                                                                                          | Receipts, invoices, reports, certificates, contracts.            | Template digest, isolation, timeout, retry/idempotency, no arbitrary URL/path.                                      |
| 8        | NATS                           | Define `core.event-envelope/v1` and fake transport.                                                                                    | Kitchen, order status, analytics, notification, logistics.       | Persist-before-publish, duplicate/replay/order handling, provider removal.                                          |
| 9        | Meilisearch CE                 | Conduct path-level licence/source study, then only index-provider conformance.                                                         | Catalog, restaurant menu, knowledge, CRM, support.               | Policy-filtered rebuildable index, deletion, index-failure isolation.                                               |
| 10       | FullCalendar + MapLibre        | Use only as presentation adapters over reservation/location projections.                                                               | Booking, restaurant, field service, delivery, property.          | No write authority, responsive/accessibility behaviour, consent-aware location display.                             |
| 11       | Medusa                         | Source-study its modular commerce boundaries; author Factory `order-amendment`, `price-rule`, and `fulfilment` packages independently. | Ecommerce, restaurant, B2B, marketplace.                         | Cross-profile semantic tests with no profile-name implementation branch.                                            |
| 12       | Saleor                         | Compare API/commerce boundary against Medusa; do not make it a runtime dependency.                                                     | Ecommerce, marketplace, B2B.                                     | Contract comparison record and provider-neutral fixture suite.                                                      |
| 13       | Stripe + Adyen                 | Author `PaymentProviderV1` with a simulated provider first.                                                                            | Commerce, ticketing, billing.                                    | Idempotency, signed callback, timeout, duplicate/reconciliation, secret isolation; no live money in MVP acceptance. |
| 14       | Novu                           | Source-study core/enterprise boundary and define notification contract.                                                                | Ordering, booking, approval, CRM, education.                     | Preference/consent, delivery failure, template validation, provider replacement.                                    |
| 15       | OpenFGA + Temporal             | Keep both provider-later until base policy/flow contracts are accepted.                                                                | Enterprise CRM, multi-org commerce, long-running claims/service. | Local fakes, version migration, conformance, provider removal, explicit operational ADR.                            |

## Automatic intake and promotion: scale evidence, not manual certification

Factory should automate the repeatable evidence work and reserve human or
controller judgement for exception/authority decisions. That avoids manually
certifying every package while preserving safe Graph authority.

```text
Allow-listed registry/source metadata
  -> fixed tag + commit/SHA + licence path acquisition record
  -> SBOM + dependency/secret/vulnerability + licence-policy scan
  -> isolated build / fixture / interface-conformance test
  -> immutable Candidate evidence and quality score
  -> generated pending-review promotion packet
  -> reviewed Factory-owned implementation or pinned dependency change
  -> Golden package / ProviderV1 contract / locked Published Graph
```

Automation may:

1. discover allow-listed upstream releases and licence metadata;
2. create immutable Candidate records, scan evidence, SBOMs, test fixtures,
   compatibility scores, and a proposed contract mapping;
3. continuously re-run vulnerability, licence-drift, release-age, and
   conformance checks; and
4. open a new pending-review packet or automatically quarantine a failing
   version.

Automation must not:

1. mark a Candidate Golden, waive a licence/security finding, or select a
   provider for a Published Graph;
2. copy source, install a dependency, or link/embed a service merely because
   it has a permissive-looking licence;
3. let upstream documentation, schemas, generated code, webhooks, or AI output
   author Factory Graph facts; or
4. hide real payment, regulated identity, analytics PII, accounting, or
   production-operational obligations inside a generic “component”.

The existing accepted External Capability Intake work is fixture-only. It
therefore remains a quarantine/evidence mechanism, not permission for live
network intake, source copying, promotion, or runtime selection. The top-15
queue requires new source-study and implementation slices before any asset can
be used by a Profile.

## Product decision affected

**Near term:** finish the active Commercial Foundation Task 2 repair. Its
cross-profile composition must be accepted before generic compiler and
Workbench work begins. Do not expand Restaurant functionality by adding more
vertical modules during that repair.

**After Foundation acceptance:** use the adoption queue to add independent,
cross-profile packages in this order: command/jobs and policy/flow foundations;
data exchange/documents/events/search; then payment, notification, identity,
and scheduling providers behind local fakes. Each new package must prove two
materially different Profile bindings before it is called reusable.

**Long term:** Restaurant becomes one evidence-rich recipe consuming shared
commerce, scheduling, document, notification, analytics, identity, and policy
contracts. The same package collection can then express the wider 100+ profile
portfolio without copying the core of a restaurant POS, ecommerce platform,
CRM, or low-code product.
