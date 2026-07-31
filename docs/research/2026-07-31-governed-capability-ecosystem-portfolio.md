# Governed capability ecosystem portfolio

**Research date:** 2026-07-31  
**Decision:** How Factory Pilot can accelerate support for 100+ application
scenarios through externally maintained engines and services without allowing a
third-party runtime, source tree, or data model to become the Application Graph
source of truth.

## Executive recommendation

Factory should build a **thin, reusable capability vocabulary** and place mature
systems behind provider adapters. It should not try to recreate every
notification, workflow, search, identity, map, payment, or analytics engine.
It also must not bulk-copy repositories into capability packages: a permissive
licence is necessary but not sufficient, and a copied vertical application
usually imports another product's hidden data model, upgrades, security
obligations, and operational assumptions.

The scalable unit is therefore:

```text
Graph capability contract + generated adapter + provider fixture + removal test
```

not a repository clone. A provider may be selected only from a Published Graph,
receives a bounded command/projection, and cannot author Graph, policy, flow, or
audit facts. Direct packages are limited to small, pinned libraries used by
Factory or a generated target; full platforms are normally adapters or
source-study references.

The portfolio below is evidence for future Candidate records only. It is not a
candidate, a Golden asset, a licence decision, a dependency installation, or
permission to copy source.

## Observed facts and decision rules

All source observations below were made on 2026-07-31 from public upstream
repositories or official documentation. Star/release counts are maintenance
signals, not quality or security certification.

1. The existing lifecycle remains mandatory: fixed source reference ->
   quarantined Candidate -> offline conformance -> pending-review promotion
   packet -> named human decision -> separately authored Golden package ->
   Published Graph lock -> release evidence.
2. A direct package needs a pinned version, SBOM/licence notice, deterministic
   fixture, capability boundary, and removal test. An adapter additionally needs
   credential isolation, timeout/retry/idempotency semantics, error mapping, and
   a local fake.
3. GPL, AGPL, BSL, fair-code/Sustainable Use, and mixed enterprise trees are not
   eligible for Factory source copying or embedded runtime under the current
   product licence. They may be architecture references only where marked.
4. No provider stores or receives raw AI prompts, credentials, mutable Draft
   authority, or unbounded source/code paths. Provider output is an untrusted
   proposal or event and is validated before a Factory command is accepted.

## Top 20 intake candidates

| Priority | Candidate and observed source                                                                                         | Licence / observed maintenance signal                                                                                    | Recommended integration level                     | Factory-owned reusable capability boundary                                                               | Profile families unlocked                                            | Principal governance risk                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1        | [XState](https://github.com/statelyai/xstate)                                                                         | MIT; existing Factory research records 490 releases.                                                                     | **Direct package**                                | `flow.state-machine/v1`: declared states, events, guards, effects and replay.                            | Approval, restaurant, commerce, booking, support, field service.     | Compile only closed Graph transitions; never editor/AI-supplied actions.                                                  |
| 2        | [node-casbin](https://github.com/apache/casbin-node-casbin)                                                           | Apache-2.0; upstream identifies Node/browser ACL, RBAC and ABAC support and 152 releases.                                | **Direct package**                                | `policy.decision/v1`: role/resource/action decision and generated guard.                                 | Every profile; backoffice, CRM, health, education, commerce.         | Graph compiles policy; arbitrary Casbin model/policy input is forbidden.                                                  |
| 3        | [BullMQ](https://github.com/taskforcesh/bullmq)                                                                       | MIT; Redis-based queue with delayed jobs, deduplication and rate limiting, 856 releases.                                 | **Direct package**                                | `jobs.durable-command/v1`: scheduled, retried, idempotent background command.                            | Notifications, imports, document generation, fulfilment, campaigns.  | Queue completion is not business truth; commit facts before enqueue and retain an outbox.                                 |
| 4        | [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js)                                                | Apache-2.0; supports Node 22 and vendor-neutral trace/metric/log exporters.                                              | **Direct package**                                | `ops.telemetry/v1`: trace context, metrics and redacted structured events.                               | Every generated application and provider.                            | Explicit redaction/schema and sampling; browser instrumentation has experimental portions.                                |
| 5        | [Puck](https://github.com/puckeditor/puck)                                                                            | MIT; host-owned React/Next editor data.                                                                                  | **Direct package**                                | `experience.page-composition/v1`: declared blocks, routes, tokens, responsive layout.                    | All web profiles.                                                    | Puck remains an editor adapter; PageModel remains canonical.                                                              |
| 6        | [React Flow / xyflow](https://github.com/xyflow/xyflow)                                                               | MIT; existing research records 372 releases.                                                                             | **Direct package**                                | `experience.graph-editor/v1`: visual positions for flow/domain/lineage models.                           | All visual-authoring profiles.                                       | UI coordinates cannot introduce executable nodes, effects or connections.                                                 |
| 7        | [Temporal](https://github.com/temporalio/temporal) and [TypeScript SDK](https://github.com/temporalio/sdk-typescript) | MIT; public organization lists an MIT core service with about 21k stars and active TypeScript SDK.                       | **Provider adapter**                              | `workflow.durable-execution/v1`: start/signal/query/cancel with immutable correlation IDs.               | Long-running approvals, bookings, fulfilment, claims, service jobs.  | Heavy operational dependency and workflow-version migration; Factory FlowModel must still define business semantics.      |
| 8        | [NATS / JetStream](https://github.com/nats-io/nats-server)                                                            | Apache-2.0; server reports about 19.9k stars and active releases.                                                        | **Provider adapter**                              | `events.transport/v1`: versioned outbox envelope, subscriber cursor, replay and dead-letter outcome.     | Realtime kitchen, logistics, inventory, notifications, analytics.    | At-least-once delivery requires idempotent consumers; event delivery cannot execute Graph commands directly.              |
| 9        | [Keycloak](https://github.com/keycloak/keycloak)                                                                      | Apache-2.0; identity and access server, about 34.9k stars, latest visible release 26.6.3 (2026-06-04).                   | **Provider adapter**                              | `identity.oidc-session/v1`: verified principal, tenant/role claims, logout and token lifecycle.          | Every production profile.                                            | Realm/client configuration, tenant boundaries and admin credentials must never be Graph content.                          |
| 10       | [OpenFGA](https://github.com/openfga/openfga)                                                                         | Apache-2.0; HTTP/gRPC fine-grained authorization engine, production use claims and PostgreSQL/MySQL support.             | **Provider adapter, later**                       | `policy.relationship-decision/v1`: tuple-backed relationship check only.                                 | Marketplace, B2B commerce, sharing, multi-organisation CRM.          | External model/tuple lifecycle and consistency; keep Casbin baseline and require a provider conformance suite.            |
| 11       | [Novu](https://github.com/novuhq/novu)                                                                                | Core MIT but repository has commercial `/enterprise` areas; supports inbox, email, SMS, push and chat.                   | **Source-study then adapter**                     | `notification.dispatch/v1`: notification intent, preference, delivery attempt and receipt.               | Every profile; approvals, ordering, appointment, support, marketing. | Mixed licence tree, provider credentials and channel-specific PII; do not embed/copy enterprise code.                     |
| 12       | [Meilisearch Community Edition](https://github.com/meilisearch/meilisearch)                                           | CE is MIT; repo is mixed MIT and BSL enterprise material.                                                                | **Source-study then adapter**                     | `search.index-projection/v1`: approved searchable projection, query and result reference.                | Ecommerce, restaurant menus, knowledge, CRM, ticketing.              | Index must be rebuildable and filtered by Factory policy; no source copying across CE/EE boundary.                        |
| 13       | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)                                                          | BSD-3-Clause; browser vector-map library, active v6 release on 2026-07-22.                                               | **Direct package**                                | `geo.map-presentation/v1`: map markers, route geometry and viewport only.                                | Delivery, field service, logistics, booking, property.               | Mapping tiles/geocoding are separate providers; coordinate/location privacy and data licence remain explicit.             |
| 14       | [Stripe Node SDK](https://github.com/stripe/stripe-node)                                                              | MIT; Node 18+ SDK for Stripe API.                                                                                        | **Provider adapter**                              | `payment.intent/v1`: payment attempt/result/reconciliation facts with simulated provider first.          | Restaurant, ecommerce, invoice, ticketing, subscription.             | Real money, webhooks, PCI scope and secrets; never direct SDK calls from generated business logic.                        |
| 15       | [Medusa](https://github.com/medusajs/medusa)                                                                          | MIT; modular commerce architecture, about 34k stars and release v2.15.3 (2026-05-21).                                    | **Source-study only; future provider**            | `commerce.catalog`, `cart`, `order`, `pricing`, `inventory`, `fulfilment` contracts authored by Factory. | Ecommerce, restaurant, marketplace, B2B wholesale.                   | Do not inherit its model/runtime as Graph truth; upgrade/migration and version coupling require a dedicated provider ADR. |
| 16       | [Saleor](https://github.com/saleor/saleor/blob/main/LICENSE)                                                          | BSD-3-Clause; API-first commerce reference.                                                                              | **Source-study only; future provider comparison** | Same transport-neutral commerce contract as Medusa.                                                      | Ecommerce, marketplace, B2B.                                         | Python/GraphQL runtime and provider-specific model must not leak into Factory contracts.                                  |
| 17       | [Appsmith](https://github.com/appsmithorg/appsmith)                                                                   | Apache-2.0; internal-tools platform with 25+ database/API integrations, about 39.9k stars.                               | **Source-study only**                             | `backoffice.resource-view/v1`, `data-connector-contract/v1` design reference.                            | Admin, operations, support, CRM, inventory.                          | Its application model/editor must not become PageModel or connector execution authority.                                  |
| 18       | [PostHog](https://github.com/PostHog/posthog)                                                                         | MIT except `ee/`; analytics, flags, experiments and session replay.                                                      | **Source-study then analytics adapter**           | `analytics.product-event/v1`, `experiment.assignment/v1` with provider-neutral events.                   | Every generated product.                                             | Mixed enterprise tree, sensitive behavioural data, consent/retention and feature-flag control plane.                      |
| 19       | [Flowable](https://github.com/flowable/flowable-engine)                                                               | Apache-2.0 Java BPMN/CMMN/DMN engine; v8.0.0 release on 2026-02-27.                                                      | **Source-study only; enterprise provider later**  | `workflow.bpmn-interop/v1`: import/export and human-task projection, not the canonical FlowModel.        | Complex approvals, case management, public sector, HR, claims.       | JVM runtime/operational cost and BPMN feature leakage; no direct compilation of arbitrary BPMN execution.                 |
| 20       | [Gotenberg](https://github.com/gotenberg/gotenberg)                                                                   | Official stateless document/PDF API project; licence and supported conversion surface need fixed-reference verification. | **Source-study then document provider adapter**   | `document.render/v1`: bounded HTML/template input -> immutable document artifact/digest.                 | Receipts, invoices, reports, certificates, contracts.                | Rendering attack surface, templates and file isolation; no arbitrary URL/file/path conversion.                            |

### Evidence notes

- Casbin explicitly supports ACL/RBAC/ABAC but does not perform
  authentication; that supports separating identity and policy providers.
  [Casbin](https://github.com/apache/casbin) [node-casbin](https://github.com/apache/casbin-node-casbin)
- OpenFGA documents its in-memory store as development-only and recommends a
  production datastore; it should be an optional provider rather than an
  initial local runtime dependency. [OpenFGA](https://github.com/openfga/openfga)
- Temporal's core service and TypeScript SDK are MIT, but its server is an
  operational product, not a library to hide inside generated applications.
  [Temporal organization](https://github.com/orgs/temporalio/repositories)
- Meilisearch distinguishes MIT Community Edition from BSL/commercial
  enterprise material. [Meilisearch](https://github.com/meilisearch/meilisearch)
- OpenTelemetry lists Node 22 support, matching Factory's generated target.
  [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js)

## Explicit exclusions and reference-only systems

| Project                                                                        | Observed fact                                                                                       | Treatment                                                                                                                                               |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Vendure](https://github.com/vendure-ecommerce/vendure/blob/v3.7.1/LICENSE.md) | Community edition is GPLv3 by default.                                                              | Prohibited from copying, package/linking and runtime embedding; concepts may be discussed as external reference.                                        |
| [ERPNext](https://github.com/frappe/erpnext) / Odoo-class ERP                  | ERPNext is GPL-3.0 and contains a broad vertical ERP model.                                         | Prohibited from source copying or embedded runtime; use only to discover independent Graph capabilities such as ledger, procurement and stock concepts. |
| [Budibase](https://github.com/Budibase/budibase)                               | Overall GPLv3; packages vary.                                                                       | Prohibited from copying/embedding; study visual patterns only.                                                                                          |
| [ToolJet](https://github.com/ToolJet/ToolJet)                                  | AGPLv3.                                                                                             | Prohibited from copying/embedding.                                                                                                                      |
| [Formbricks](https://github.com/formbricks/formbricks)                         | Core AGPLv3 and separate enterprise tree.                                                           | Prohibited from copying/embedding. Implement Factory survey/feedback contracts independently if needed.                                                 |
| [Directus](https://github.com/directus/directus)                               | BSL 1.1 with a revenue/funding additional-use grant.                                                | Prohibited from source copying/embedding under present policy.                                                                                          |
| [n8n](https://github.com/n8n-io/n8n)                                           | Sustainable Use/fair-code licence limits resale/hosting uses; advertises 1,500+ integrations.       | Prohibited from copying/embedding. A future `AutomationProviderV1` can use a separately licensed external deployment only after an ADR.                 |
| [Camunda 8](https://github.com/camunda/camunda)                                | Zeebe, Operate and Tasklist source uses Camunda License 1.0; only selected subtrees are Apache-2.0. | Prohibited from bulk copying or embedding. Any Apache subtree still needs fixed-reference review.                                                       |
| [MinIO](https://github.com/minio/minio)                                        | AGPLv3, repository archived by owner on 2026-04-25 and community binaries are no longer provided.   | Prohibited as embedded/default object-storage runtime. Use an S3-compatible object-storage provider contract instead.                                   |

## Capability lattice for 100+ scenarios

The portfolio need not create 100 vertical applications. These 15 stable
capability families combine into more than 100 plausible profile recipes while
keeping business semantics explicit:

```text
identity + policy + audit + CRUD + files + notification + workflow
catalog + pricing + cart/order + inventory + payment + fulfilment
schedule/capacity + location/map + search + documents + analytics + eventing
```

Profile families that can reuse several of these include approval/operations,
restaurant/hospitality, simple ecommerce, B2B commerce/marketplace,
appointment/service booking, field service/logistics, inventory/procurement,
CRM/support, internal administration, knowledge/CMS, ticketing/admission,
education/certification, membership/community, property/maintenance, and
analytics/reporting. This is an inference from composability, not a claim that
all those profiles are currently production-ready.

## Recommended first intake batch

Prioritise **eight** Candidate records, one at a time or in independent
quarantine worktrees, because they maximize cross-profile reuse and have clear
Factory boundaries:

1. `BullMQ` -> `jobs.durable-command/v1`
2. `OpenTelemetry JS` -> `ops.telemetry/v1`
3. `NATS` -> `events.transport/v1`
4. `Keycloak` -> `identity.oidc-session/v1`
5. `Novu` -> `notification.dispatch/v1`
6. `Meilisearch CE` -> `search.index-projection/v1`
7. `MapLibre GL JS` -> `geo.map-presentation/v1`
8. `Stripe Node` -> `PaymentProviderV1` (simulated provider fixture before any
   real key or money movement)

Each intake should contain a fixed tag/SHA, licence file digest, dependency
tree/SBOM, source and binary provenance, CVE scan, network-denied fixture,
capability boundary, provider removal test, notice plan, and a negative test
showing the provider cannot change a Draft, Publish, Graph lock or audit fact.
Only then may it create a `pending-review` packet. The review packet must not
copy upstream code; if later approved code reuse is proposed, it needs a
specific symbol/range/notice ledger and separately authored implementation.

## Product decisions affected

1. Adopt shared **provider contracts before vertical features**: identity,
   durable jobs, event transport, telemetry, notification, search, document,
   payment and map are multipliers for Restaurant, Ecommerce and future
   profiles.
2. Keep `FlowModel`, `PolicyModel`, `DomainModel`, and audit/event facts
   Factory-owned. Temporal, Flowable, Casbin, OpenFGA, Medusa, Saleor and all
   SaaS providers are replaceable implementations or references.
3. Establish a **provider conformance harness** alongside the external intake
   lifecycle. Without it, a large candidate catalogue becomes a collection of
   unproven dependencies rather than reusable production capability.
4. Do not bulk import application repositories. The speed win comes from
   adopting bounded engines and adapters once, then reusing them across many
   Graph recipes; ungoverned copying only moves maintenance and licence risk
   into Factory.

## Confidence and limitations

High confidence applies to stated upstream licences and published project
capabilities. Medium confidence applies to maintenance/adoption signals shown
on public repositories. Low confidence applies to any provider's fitness for a
specific regulated workload until a fixed-version source study, security review,
and local conformance evidence are completed. No source was downloaded,
executed, copied, installed, or contacted for this memo.
