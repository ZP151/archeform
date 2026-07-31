# 100+ Profile Capability Ecosystem

**Research date:** 2026-08-01  
**Decision investigated:** How Factory Pilot can support more than 100
production-relevant application scenarios by reusing mature open-source
software without surrendering Application Graph authority, bypassing
provenance/security controls, or copying a third party's business model.

## Decision

Factory should scale by compiling a small, composable capability kernel into
many **Profile recipes**, then attaching selected infrastructure and service
providers through typed adapters. It must not scale by cloning vertical
repositories or treating a third-party schema, editor, workflow engine, or
runtime as a source of truth.

The reusable unit is:

```text
Published Graph capability contract
  + exact dependency or provider adapter
  + immutable source and licence evidence
  + local fixture and conformance tests
  + removal / replacement test
```

This is an inference from the public sources below. None of the entries is an
installed dependency, a Candidate, a Golden package, an approved provider, or
permission to copy source code.

## Operating boundary

```text
Requirement / visual editor / AI proposal
                 |
                 v
        Factory Application Graph     <- only business source of truth
                 |
       Publish + semantic validation
                 |
                 v
       compiler-owned generated targets
                 |
     bounded package or provider adapter
                 |
           external library/service
```

An adapter may receive a versioned command, a projection, or an immutable
artifact reference. It may return a typed result, receipt, or delivery event.
It may not mutate Drafts, author Graph nodes, supply arbitrary source paths,
choose packages, or override policy/audit facts.

## Capability taxonomy and Profile portfolio

The first column is the stable vocabulary Factory should own. The second is a
planning portfolio, not a promise that every scenario shares identical
regulatory, safety, payment, or operational requirements. Counts deliberately
exceed 100 so that profiles can be accepted independently rather than blocked
by one vertical programme.

| Factory-owned capability family | Reusable building blocks | Profile families and scenarios | Portfolio count |
| --- | --- | --- | ---: |
| Identity, tenancy, policy | principal, organisation, session, RBAC/ABAC, consent, audit | employee portal, B2B portal, membership, franchise, partner portal, school, clinic, property manager, field technician, marketplace seller | 10 |
| Records and operations | entity, field, attachment, relation, import/export, search, activity stream | CRM, case management, contact directory, asset register, document register, vendor management, contract register, project tracker, grant tracker, incident register | 10 |
| Requests and approvals | request, form, task, state machine, SLA, escalation, audit | expense, leave, purchase request, travel, equipment, onboarding, access request, claim, change request, permit | 10 |
| Scheduling and capacity | availability, slot, resource, reservation, waitlist, reminder | appointments, restaurant reservations, room booking, desk booking, class booking, consultation, vehicle booking, salon, rental, inspection, queueing | 11 |
| Commerce and ordering | catalogue, configurable line, price, cart, order, stock, fulfilment, simulated payment | retail ecommerce, B2B ordering, restaurant dine-in, pickup, subscription box, wholesale, donation shop, ticket shop, spare parts, digital goods, quotation-to-order | 11 |
| Service and field work | work order, assignment, dispatch, checklist, asset, parts, proof of completion | help desk, maintenance, cleaning, repair, inspection, installation, delivery, fleet service, facilities, warranty claim | 10 |
| Inventory and supply | location, stock ledger, transfer, cycle count, replenishment, supplier order | warehouse, restaurant stock, clinic supplies, school equipment, retail inventory, lab stock, spare parts, library holdings, construction materials, returns | 10 |
| Finance-adjacent operations | invoice projection, receipt, budget, cost centre, approval, reconciliation event | expense, invoicing, quote, procurement, reimbursement, subscription administration, donation pledge, tuition billing, rental billing, membership dues | 10 |
| Communications and engagement | notification intent, template, inbox, preference, campaign, feedback | notification centre, appointment reminders, order status, support updates, surveys, NPS, event announcements, learning nudges, donor updates, tenant notices | 10 |
| Knowledge and content | article, taxonomy, publication, asset, review, search | knowledge base, CMS, policy library, SOP hub, FAQ, product content, course materials, onboarding hub, release notes, public directory | 10 |
| Analytics and governance | telemetry, aggregate, dashboard, retention, report, evidence, export | operational dashboard, sales dashboard, audit explorer, compliance report, stock report, service SLA report, cohort view, accessibility report, data retention review, export centre | 10 |
| Spatial, event, and ecosystem | map projection, route, QR token, barcode, event envelope, integration contract | delivery dispatch, field service, venue/event, visitor check-in, QR ordering, property map, fleet tracking, pickup lockers, event admissions, IoT alert console | 10 |

**Total planning scenarios: 122.** A scenario is only a recipe of Graph
subgraphs, capability locks, fixtures, and acceptance journeys. It is not a
new hand-written application or a claim of production readiness.

### Cross-vertical kernel

The repeated core across the portfolio is intentionally small:

1. `core.identity-context`, `core.location-context`, `core.attachment`, and
   `core.audit-log`.
2. `data.record-api`, `data.import-export`, `search.index-projection`, and
   `jobs.durable-command`.
3. `policy.decision`, `workflow.state-machine`, `notification.dispatch`, and
   `experience.page-composition`.
4. Commerce/service extensions: `commerce.catalog`, `commerce.line-configuration`,
   `commerce.cart`, `commerce.order`, `commerce.inventory-ledger`,
   `service.assignment`, and `scheduling.reservation`.

Restaurant and simple ecommerce should consume the same named kernel assets
where their semantics overlap. The Restaurant-specific table/session and
kitchen projections remain recipe contributions, not reasons to fork the
commerce kernel.

## Public ecosystem map

**Observed facts** below were checked against the linked upstream repository,
licence, or official documentation on 2026-08-01 unless a date is stated.
Maintenance/adoption evidence is only a prioritisation signal; it is not a
security certification. “Direct dependency” means a small pinned library used
by Factory or a generated target. “Provider adapter” means a separately
operated service behind a Factory interface. “Source study” permits analysis
only. “Prohibited/no-copy” excludes copying, embedding, or making the project
a required Factory runtime under the current policy.

### Direct dependency candidates

| Project / official source | Licence | Observed fact | Factory interface supported | Maintenance / governance note |
| --- | --- | --- | --- | --- |
| [Puck](https://github.com/puckeditor/puck) | MIT | Upstream describes a React visual editor, including Next.js support, where the host owns saved data. | `experience.page-composition/v1` editor adapter | 38 releases shown; Puck data is an editable projection of `PageModel`, never canonical. |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | MIT | The repository publishes React and Svelte node-based UI libraries under MIT. | `experience.graph-layout/v1` | 372 releases shown. Persist visual coordinates only after Graph semantic validation. |
| [XState](https://github.com/statelyai/xstate) | MIT | The project provides TypeScript state machines, statecharts, actors, and model-based testing utilities. | `workflow.state-machine/v1` compiler target | 490 releases shown. Compile closed transitions; do not compile editor-supplied JavaScript actions. |
| [Prisma](https://github.com/prisma/prisma) | Apache-2.0 | The Node/TypeScript ORM supports PostgreSQL and other declared data stores. | `domain.prisma-schema/v1` compiler target | Pin generator/client together; generated schema is a Published Graph artifact. |
| [node-casbin](https://github.com/apache/casbin-node-casbin) | Apache-2.0 | Upstream documents Node/browser ACL, RBAC, and ABAC enforcement and explicitly does not perform authentication. | `policy.decision/v1` compiler target | 152 releases shown. Factory owns role/resource/action vocabulary and emits bounded policies. |
| [Zod](https://github.com/colinhacks/zod) | MIT | TypeScript-first schema validation library. | `contract.runtime-validation/v1` | Pin schema package; generated API validation must originate from Graph schema rather than arbitrary user code. |
| [TanStack Query](https://github.com/TanStack/query) | MIT | Upstream provides async server-state caching for React and other clients. | `experience.server-state/v1` | Use only as generated-client plumbing; commands retain idempotency keys and server revision checks. |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) | MIT | Upstream supplies React form validation and state management. | `experience.bound-form/v1` | Bind declared PageModel controls to Graph field constraints; do not let form configuration create domain fields. |
| [Radix Primitives](https://github.com/radix-ui/primitives) | MIT | Accessible, unstyled React UI primitives. | `experience.accessible-primitives/v1` | Retain notices and visual-regression fixtures; styles remain Factory design tokens. |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC | Open icon library with framework packages. | `experience.icon-token/v1` | Pin icon names in a design manifest; do not persist arbitrary SVG blobs in Graphs. |
| [dnd kit](https://github.com/clauderic/dnd-kit) | MIT | React drag-and-drop toolkit. | `experience.layout-editing/v1` | Drag operations produce validated PageModel layout changes only. |
| [i18next](https://github.com/i18next/i18next) | MIT | Internationalisation framework for JavaScript. | `experience.locale-catalog/v1` | Graph owns message identifiers/default locale; providers or translators cannot alter business semantics. |
| [Apache ECharts](https://github.com/apache/echarts) | Apache-2.0 | Apache charting project. | `analytics.dashboard-projection/v1` | Keep chart data as redacted aggregate projections; retain bundled notice requirements. |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | BSD-3-Clause | Open vector-map renderer; its tiles and geocoding are separate services. | `geo.map-presentation/v1` | Map renderer never owns location or routing facts; privacy and tile licences need profile review. |
| [qrcode.react](https://github.com/zpao/qrcode.react) | ISC | React component for QR-code rendering. | `experience.qr-token/v1` | Render only opaque, expiring Factory-signed tokens; never raw table IDs, user IDs, or credentials. |
| [Workbox](https://github.com/GoogleChrome/workbox) | Apache-2.0 | Google-maintained web/PWA service-worker tooling. | `runtime.offline-shell/v1` | Cache shell and safe reads first; offline writes require explicit conflict and authority design. |
| [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js) | Apache-2.0 | Upstream documents stable tracing/metrics SDKs and Node 22 support; logs remain development status. | `ops.telemetry/v1` | Pin compatible package families. Redaction, sampling, and event schemas are Factory-owned. |
| [BullMQ](https://github.com/taskforcesh/bullmq) | MIT | Redis-protocol job queue for workers, delayed jobs, retries, and rate limiting. | `jobs.durable-command/v1` | Queue delivery is not business truth: persist facts/outbox first. Use a separately approved Redis-compatible runtime such as Valkey. |

### Provider adapter and bounded source-study candidates

| Project / official source | Licence | Observed fact | Factory interface supported | Maintenance / governance note |
| --- | --- | --- | --- | --- |
| [Keycloak](https://github.com/keycloak/keycloak) | Apache-2.0 | Open identity and access-management server with OIDC/SAML material; release 26.6.3 was visible 2026-06-04. | `identity.oidc-session/v1` provider | Realm/client/admin credentials are deployment metadata, never Graph content. |
| [OpenFGA](https://github.com/openfga/openfga) | Apache-2.0 | Relationship-based authorization engine with external model/tuple store. | `policy.relationship-decision/v1` provider | Later option after Casbin baseline and conformance suite; model IDs belong to published deployment metadata. |
| [Temporal](https://github.com/temporalio/temporal) and [TypeScript SDK](https://github.com/temporalio/sdk-typescript) | MIT | Durable workflow service and TS SDK; upstream shows an active release line. | `workflow.durable-execution/v1` provider | Heavy runtime: Factory FlowModel remains semantic truth and outputs only start/signal/query/cancel commands. |
| [NATS / JetStream](https://github.com/nats-io/nats-server) | Apache-2.0 | CNCF messaging system; JetStream provides built-in persistence/at-least-once semantics. | `events.transport/v1` provider | Require versioned envelope, consumer idempotency, replay and dead-letter fixtures. |
| [Valkey](https://github.com/valkey-io/valkey) | BSD-3-Clause | Redis-compatible open-source server governed by the Valkey project. | `runtime.redis-compatible/v1` provider | Isolate it from BullMQ API assumptions and test Redis-protocol compatibility at exact version. |
| [Gotenberg](https://github.com/gotenberg/gotenberg) | MIT | Stateless document/PDF conversion API project. | `document.render/v1` provider | Only bounded templates/artifact inputs; no arbitrary URL, host path, or executable conversion requests. |
| [Novu](https://github.com/novuhq/novu) | MIT core; enterprise areas require path-specific review | Notification platform spanning inbox, email, SMS, push, and chat. | `notification.dispatch/v1` source study then provider | Do not copy or traverse commercial/enterprise directories; isolate PII and channel credentials. |
| [Meilisearch](https://github.com/meilisearch/meilisearch) | MIT Community Edition; commercial material needs path review | Search engine with a distinct Community Edition. | `search.index-projection/v1` source study then provider | Projection must be policy-filtered and rebuildable; record exact CE source boundary before any use. |
| [Appwrite](https://github.com/appwrite/appwrite) | BSD-3-Clause | Backend platform with authentication, databases, storage, functions, and messaging surfaces. | `runtime.backend-provider/v1` source study | Never import its resource model as DomainModel; use only a narrow provider contract after a dedicated ADR. |
| [Supabase](https://github.com/supabase/supabase) | Apache-2.0 repository, path-specific dependencies still require review | Postgres-oriented backend platform with services in a monorepo. | `runtime.backend-provider/v1` source study | Treat it as a provider comparison, not a Graph target; no automatic source copying from its monorepo. |
| [PostHog](https://github.com/PostHog/posthog) | MIT outside `ee/` | Product analytics and feature tooling with an enterprise tree. | `analytics.product-event/v1` source study then adapter | Sensitive behavioural data/consent and mixed licensing require a fixed source study; never copy `ee/`. |
| [OpenSearch](https://github.com/opensearch-project/OpenSearch) | Apache-2.0 | Open search/analytics engine. | `search.query-provider/v1` provider | Heavy service; retain search projection, filter and retention rules in Factory. |
| [Qdrant](https://github.com/qdrant/qdrant) | Apache-2.0 | Vector similarity search engine. | `knowledge.vector-retrieval/v1` provider | Later knowledge/RAG provider. Embeddings, consent, deletion, and document ACL filtering are Factory requirements. |
| [Amplication](https://github.com/amplication/amplication) | Apache-2.0 outside `ee/` | Code-generation platform with plugin and Git-sync patterns. | generator/source-study reference | The existing source-study rule remains: no `ee/`, no Graph ownership, no copied generator logic without separately approved record. |
| [Medusa](https://github.com/medusajs/medusa) | MIT | Modular commerce platform; v2.15.3 was released 2026-05-21. | `commerce.provider/v1` source study only | Use as comparison for capability boundaries. Do not inherit its runtime/schema as Factory commerce truth. |
| [Saleor](https://github.com/saleor/saleor) | BSD-3-Clause | API-first commerce core, with a BSD-3-Clause licence file. | `commerce.provider/v1` source study only | Compare against Medusa to prevent a vendor-specific Factory contract; no direct model import. |

### Explicitly excluded or no-copy references

| Project / official source | Licence / observed fact | Treatment and reason |
| --- | --- | --- |
| [Vendure](https://github.com/vendure-ecommerce/vendure/blob/master/LICENSE) | GPLv3 community core | **Prohibited/no-copy.** Do not embed, link, or use as a Factory runtime under the current policy; concepts may inform independent requirements. |
| [ERPNext](https://github.com/frappe/erpnext) | GPL-3.0 | **Prohibited/no-copy.** Its broad ERP model is useful only as a vocabulary reference. |
| [ToolJet](https://github.com/ToolJet/ToolJet) | AGPLv3 | **Prohibited/no-copy.** No code, embedded runtime, or direct internal-tools foundation. |
| [Budibase](https://github.com/Budibase/budibase) | GPLv3 / package-specific licensing | **Prohibited/no-copy.** Visual patterns only; never make its app model Factory truth. |
| [Cal.com](https://github.com/calcom/cal.com) | AGPLv3 core with enterprise material | **Prohibited/no-copy.** Appointment semantics must be authored independently. |
| [pretix](https://github.com/pretix/pretix) | AGPLv3 with additional terms | **Prohibited/no-copy.** Ticketing profiles need Factory-owned admission/refund/audit semantics. |
| [Directus](https://github.com/directus/directus) | BSL 1.1 | **Prohibited/no-copy** under current policy. Do not embed its runtime or use it as a generated back-end. |
| [n8n](https://github.com/n8n-io/n8n) | Sustainable Use License / fair-code terms | **Prohibited/no-copy.** Workflow concepts may be studied; runtime cannot bypass Factory FlowModel. |
| [Sentry](https://github.com/getsentry/sentry) | Functional Source License / source-available terms | **Prohibited/no-copy** until a licensing decision; observability remains OpenTelemetry-first. |
| [MinIO](https://github.com/minio/minio) | AGPLv3 | **Prohibited/no-copy.** Object storage must be an independently governed provider decision. |

## Fast, governed adoption pipeline

The point of automation is to make careful reuse inexpensive and repeatable,
not to automate legal approval or turn arbitrary GitHub code into a production
component.

```text
1. Allowlisted discovery
   official repo/package URL + desired Factory interface + licence family
       |
2. Immutable quarantine
   fetch exact release/tag/commit -> content digest -> notice + manifest capture
       |
3. Automated evidence
   SBOM + dependency licence scan + secret scan + SAST + vulnerability scan
   + maintainer/release/security-policy metadata
       |
4. Boundary design
   declare direct package OR provider adapter; define input/output schema,
   credential isolation, timeout/retry/idempotency and removal path
       |
5. Offline conformance
   local fake/fixture, negative tests, redaction tests, output-slot and
   Published-Revision-only tests
       |
6. Human promotion gate
   source-study + exact notice + findings disposition + package/adaptor ADR
       |
7. Golden implementation
   Factory-authored package/adapter, pinned lock, generated SBOM, provenance,
   regression/e2e fixtures, periodic revalidation
```

### What must be automated

- Registry API and package metadata collection from an allowlisted official
  URL only; no unaudited search result becomes code.
- Exact source/release digest, SPDX/CycloneDX SBOM, dependency graph, licence
  inventory, secret scan, SAST, vulnerability scan, and reproducible fixture
  build.
- Adapter conformance: it accepts only a Published Graph projection, cannot
  access mutable Drafts, cannot write Graph facts, has no arbitrary filesystem
  or network destination, and has a local fake.
- Evidence expiry/revalidation: open critical finding, changed source digest,
  licence change, or failed fixture automatically blocks new promotion/locks.

### What must remain an explicit decision

- Licence compatibility and third-party notices for the exact source tree.
- Whether the vendor/service is appropriate for regulated, payment, health,
  location, or PII-bearing profiles.
- The Factory semantic boundary, data ownership, and migration/removal plan.
- Promotion from quarantined Candidate evidence to a Factory-authored Golden
  package. Passing automation is evidence, not promotion.

## Dependency integration versus copying business logic

| Activity | Permitted route | Required evidence | Never permitted automatically |
| --- | --- | --- | --- |
| Install a small OSS library | Pin published package/version; retain licence and SBOM; write Factory wrapper/fixtures. | package digest, notice, scan, tests, removal test | Floating `latest`, transitive-licence blindness, library taking Graph authority. |
| Call an external service | Implement a Factory-owned provider adapter against a declared contract. | provider ADR/source study, fake, error/idempotency/redaction tests, secret isolation | Provider credential in Graph, provider-created entities/policies becoming canonical. |
| Learn from an OSS project | Record a fixed source-study with public URLs and conclusions. | source-study record and licence scope | Copying files, templates, migrations, UI assets, business schema, or tests. |
| Reuse upstream source code | Only after a separate source-study identifies exact files, licence/notice obligations, security review, and a Factory-owned purpose. | explicit approval and provenance record | Whole-repository imports, copying `ee/`/mixed licence trees, or treating permissive licence as blanket approval. |

“Directly copy the core business logic” can sometimes be legally possible with
a permissive licence, but it is still a poor default: it imports hidden data
models, upgrade obligations, support/security responsibility, and often a
vertical architecture that prevents cross-profile composition. Factory should
usually write a smaller Graph capability with tests derived from observed
behaviour, then use upstream only through a pinned dependency or provider
contract.

## Prioritised next 15 source studies / intake candidates

These are ordered by cross-profile leverage and low coupling. They are not
approved installations or live intake requests.

| Priority | Candidate | Classification | First Factory-owned interface / decision | Why now |
| ---: | --- | --- | --- | --- |
| 1 | Zod | direct dependency study | `contract.runtime-validation/v1` | Validates Graph-derived API/form boundaries for every profile. |
| 2 | TanStack Query | direct dependency study | `experience.server-state/v1` | Reusable generated-client reads/mutations with explicit conflict semantics. |
| 3 | React Hook Form | direct dependency study | `experience.bound-form/v1` | Converts declared fields/validation to production form behaviour. |
| 4 | Radix Primitives + Lucide | direct dependency study | `experience.accessible-primitives/v1` | Establishes accessible shared Workbench/generated-app visual primitives. |
| 5 | BullMQ + Valkey | paired direct/provider study | `jobs.durable-command/v1` | Enables imports, notifications, scheduled reminders, document generation, and fulfilment jobs. |
| 6 | OpenTelemetry JS | direct dependency study | `ops.telemetry/v1` | Makes generated-app failures observable before expanding profile count. |
| 7 | Workbox | direct dependency study | `runtime.offline-shell/v1` | Supports safe offline shell/read experience for hospitality, field, and retail. |
| 8 | Gotenberg | provider source study | `document.render/v1` | Unblocks receipts, invoices, certificates, reports and contracts without copying template engines. |
| 9 | Keycloak | provider source study | `identity.oidc-session/v1` | Replaces role simulation with an adapter-ready production identity boundary. |
| 10 | NATS / JetStream | provider source study | `events.transport/v1` | Reusable realtime/event delivery for order, logistics, notification and analytics projections. |
| 11 | Meilisearch CE | provider source study | `search.index-projection/v1` | High-value search across catalog, knowledge, CRM and support with strict CE path review. |
| 12 | Novu | provider source study | `notification.dispatch/v1` | Avoids reimplementing multi-channel notification; requires enterprise-path and PII review. |
| 13 | MapLibre GL JS | direct dependency study | `geo.map-presentation/v1` | Shared map presentation for delivery, property, fleet and field profiles. |
| 14 | Medusa + Saleor | paired source study | `commerce.provider/v1` comparison | Validates neutral commerce contracts before any external commerce provider exists. |
| 15 | Temporal | provider source study | `workflow.durable-execution/v1` | Follow after native FlowModel and jobs prove the need for long-running durable orchestration. |

## Recommended sequencing

1. Finish the current Commercial Capability Foundation composition work;
   it establishes that profile recipes reuse the same Foundation locks.
2. In parallel only at the research level, create individual fixed-ref source
   studies for the top 15. Start with UI/form, validation, jobs/telemetry, and
   documents because they improve all profiles without introducing a new
   business source of truth.
3. Promote at most one bounded capability/provider at a time after its
   conformance suite. Candidate volume is not a success metric.
4. Build Profile recipes across the 122-scenario portfolio from the kernel;
   accept each only after its published Graph, simulator, generated Web/API,
   migration, policy, and role journey evidence pass.
5. Defer real payments, regulated health records, tax/accounting ledgers,
   high-stakes identity proofing, and cloud provider activation to dedicated
   provider decisions.

## Residual risks

- Licences can change between releases; retain the exact file/tree evidence,
  not a repository-level label or a search result.
- Permissive source still creates security, maintenance, attribution and
  migration obligations. It is not a shortcut around an adapter contract.
- Mixed repositories require directory-level scope checks. `ee/`, enterprise,
  commercial, source-available, and generated assets are excluded until a
  specific study approves otherwise.
- A 122-scenario planning map is breadth planning. It cannot substitute for
  profile-specific security, privacy, accessibility, availability, domain and
  acceptance evidence.
