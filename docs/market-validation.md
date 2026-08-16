# Market and ecosystem validation

Updated: 2026-08-01

## 2026-08-01 integration-ecosystem expansion

**Decision investigated.** Which public TypeScript ecosystems can add broad
integration coverage without letting third-party workflow or commerce models
replace the Factory Application Graph.

| Candidate                                                    | Observed public fact                                                                                                                                                                                      | Factory lane                                            | Decision affected                                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Activepieces](https://github.com/activepieces/activepieces) | Its Community Edition is MIT-licensed; its repository describes a TypeScript, versioned "piece" framework and publishes integration pieces to npm. Enterprise features use a separate commercial licence. | Connector-provider/source-study candidate.              | Use fixed, Community-Edition path studies to derive Factory-owned integration contracts and local fakes. Do not copy its workflow runtime, enterprise paths, credential model, or permit a piece to mutate a Graph.                                       |
| [Medusa](https://github.com/medusajs/medusa)                 | Its MIT-licensed TypeScript repository presents separately modular commerce building blocks for B2B, DTC, marketplace, POS, and service business use cases.                                               | Commerce Provider and selective-source-study candidate. | Prioritise neutral transaction, pricing, fulfilment, and marketplace-party contracts. A fixed path may be copied only after source-study, licence notice, fixture, conformance, and removal evidence; the Medusa runtime and schema remain non-canonical. |

**Durable decision.** The high-throughput path is not cloning application
repositories; it is automated, fixed-reference source intake plus an explicit
reuse lane. A source can supply a pinned dependency, a Provider adapter, or a
narrow, attributable Factory-owned port. A licence-compatible repository is
not blanket permission to import its runtime, migrations, data model, or
enterprise directories.

## 2026-08-01 ecosystem classification refresh

**Decision investigated.** Which mature public projects can accelerate broad
Profile coverage while preserving Factory's Application Graph, generated
runtime, and licensing boundaries.

| Candidate                                                                                                                                     | Observed public fact                                                                                                                                              | Factory lane                                                                                                         | Decision affected                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Cal.diy](https://github.com/calcom/cal.com)                                                                                                  | The community scheduling project reports MIT licensing, but also describes itself as a self-hosted community edition intended for personal or non-production use. | Fixed-reference study for appointment, availability, and scheduling semantics; never an embedded scheduling runtime. | A Factory `scheduling` capability needs its own Graph contract, fixtures, and production acceptance evidence.                                        |
| [Chatwoot](https://github.com/chatwoot/chatwoot)                                                                                              | The public repository reports MIT licensing for the non-enterprise source and identifies an `enterprise/` exception.                                              | Path-scoped support-inbox source study or later Provider.                                                            | Intake must exclude enterprise paths and retain notice/provenance before any narrow attributed source port.                                          |
| [Directus](https://github.com/directus/directus)                                                                                              | The repository reports Business Source License 1.1 with an additional use grant.                                                                                  | Reference only.                                                                                                      | Do not copy, embed, or make its schema/runtime a Factory dependency.                                                                                 |
| [n8n](https://github.com/n8n-io/n8n)                                                                                                          | Its published Sustainable Use License places use and redistribution limits on the source-available project.                                                       | Reference only.                                                                                                      | Use its workflow-product patterns only; Factory cannot vendor or expose its runtime as a product capability without a dedicated commercial decision. |
| [Puck](https://github.com/puckeditor/puck), [xyflow](https://github.com/xyflow/xyflow), and [Apache Casbin](https://github.com/apache/casbin) | Their upstream repositories report MIT, MIT, and Apache-2.0 licences respectively.                                                                                | Version-pinned technical dependencies.                                                                               | They can accelerate authoring/presentation/policy enforcement, but cannot substitute for PageModel, FlowModel, or PolicyModel as Graph truth.        |

**Durable decision.** Scale comes from batch automation across four explicit
lanes: pinned dependencies, Provider adapters, narrow source studies, and
reference-only records. The external intake service may turn any allowlisted
fixed source into a non-promoting Candidate proposal after evidence gates; it
must not bulk-copy a vertical repository into the compiler or generated
runtime.

**Implementation update.** Factory now derives the Candidate identity,
classification, and safe module-purpose from every intake-eligible Portfolio
record (`direct-dependency`, `source-study`, or `provider`) and creates batch
proposals with item-level failure isolation. This is a discovery-and-evidence
automation mechanism, not an automatic source-copy or Golden-promotion
mechanism: source-fragment proposals still require licence approval, fixture
evidence, and Factory-owned conformance before they can become a package.

## 2026-08-01 reusable implementation expansion

**Decision investigated.** Which additional public projects can widen the
reusable Profile portfolio without making a vertical application or its data
model authoritative.

| Candidate                                                                                                                                                                | Observed public fact                                                                                                                       | Factory lane                                           | Decision affected                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Builder.io](https://github.com/BuilderIO/builder)                                                                                                                       | MIT-licensed visual-development SDKs support host-owned components and code export.                                                        | Page authoring/source-study reference.                 | Compare Puck and Builder-style component registries, but retain Factory PageModel as the stored representation.                                                                   |
| [Payload](https://github.com/payloadcms/payload)                                                                                                                         | MIT-licensed TypeScript/Next.js application framework with plugin ecosystem and admin-panel patterns.                                      | Source-study reference for content/admin capabilities. | A future content Profile may reuse only precise, studied seams; its runtime and collections cannot become Graph truth.                                                            |
| [OpenWorkflow](https://github.com/openworkflowdev/openworkflow)                                                                                                          | Apache-2.0 TypeScript framework for durable, resumable workflows.                                                                          | Future flow-runtime Provider candidate.                | Keep Factory FlowModel and compiled XState flow authoritative; define a neutral durable-flow Provider contract before activation.                                                 |
| [Bagisto](https://github.com/bagisto/bagisto), [Mercur](https://github.com/mercurjs/mercur), and [Spree](https://github.com/spree/spree)                                 | Their repositories report MIT, MIT, and BSD-3-Clause licences and cover B2B, marketplace, catalogue, cart, order, and fulfilment concerns. | Fixed-source studies and provider-comparison inputs.   | Expand commerce coverage through neutral pricing, marketplace-party, quote, fulfilment, and provider contracts rather than importing Laravel, Medusa-dependent, or Ruby runtimes. |
| [Vendure](https://github.com/vendure-ecommerce/vendure), [Fleetbase](https://github.com/fleetbase/fleetbase), and [Smartstore](https://github.com/smartstore/Smartstore) | Their public repositories describe GPLv3 or AGPLv3 community/core terms.                                                                   | Reference only.                                        | Do not copy, embed, or run their code in Factory Pilot without a separate licensing decision.                                                                                     |

**Durable decision.** The next product increment should grow an executable,
cross-Profile business kernel (identity/party, price and promotion,
availability/reservation, fulfilment/delivery, operational events, and
notification) while the Candidate pipeline turns the existing 19 eligible
sources into reproducible research and implementation tasks. This produces
many Profile combinations without pretending that source studies are already
installed capabilities.

## 2026-07-31 scalable reuse decision

**Decision investigated.** How Factory Pilot can accelerate a portfolio of
100+ business scenarios with public open-source projects without turning each
upstream application into an uncontrolled runtime dependency.

| Candidate                                     | Observed public fact                                                                                                                                                                                               | Factory role                                                 | Decision affected                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Medusa](https://github.com/medusajs/medusa)  | The TypeScript commerce project is MIT-licensed and positions its modules for DTC/B2B stores, marketplaces, POS, service businesses, product, cart, order, payment, inventory, fulfilment, pricing, and locations. | Future commerce Provider adapter and source-study reference. | Reuse its modular boundary ideas and provider patterns; do not copy its runtime or make its data model canonical.                                    |
| [Bagisto](https://github.com/bagisto/bagisto) | The Laravel/Vue commerce framework reports MIT licensing and public B2B, marketplace, multitenant, POS, headless, and mobile extensions.                                                                           | Fixed-reference source-study candidate.                      | Mine individual domain seams only after SHA/license/SBOM/module evidence; its PHP/Laravel runtime cannot be pasted into the NestJS generated target. |
| [Saleor](https://github.com/saleor/saleor)    | The API-first commerce core is BSD-3-Clause and documents multichannel pricing, inventory, product, and API extension patterns.                                                                                    | Future Provider adapter or architectural reference.          | Keep the Provider contract independent of Medusa and test it against a second commerce model before implementation.                                  |

**Durable decision.** Reuse proceeds through three lanes: pinned direct
dependencies, external provider adapters, and fixed-reference source studies.
The intake CLI may bulk-resolve a pre-approved portfolio into redacted
quarantine evidence, but no whole external repository is copied into a Factory
runtime. A source-derived implementation must be an explicitly identified,
licence-compatible fragment with provenance, Factory-owned tests, a declared
package boundary, and a removal path.

This supports broad coverage without misrepresenting 43 source records or 122
scenario mappings as already installed production capabilities.

## Decision under investigation

Determine which public projects can safely inform or support a Factory-owned
Restaurant Ordering Profile without making an external runtime, data model, or
source tree the source of truth.

## Observed sources

| Need                              | Source                                                                         | Observed fact                                                                                                                     | Allowed Factory role                                             | Decision affected                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Commerce architecture             | [Medusa](https://github.com/medusajs/medusa)                                   | MIT-licensed; its documented modules separate product, cart, order, payment, inventory, fulfilment, pricing, and stock locations. | Future provider adapter and refreshed source study only.         | Keep Factory's initial catalog, cart, order, inventory, and payment semantics native.                                                  |
| Commerce architecture             | [Vendure](https://github.com/vendure-ecommerce/vendure/blob/v3.7.1/LICENSE.md) | Community Edition defaults to GPLv3 unless commercially licensed.                                                                 | Reference only. No copy, package, linking, or runtime embedding. | Do not create a Vendure provider or reuse code.                                                                                        |
| Offline Web shell                 | [Workbox](https://github.com/GoogleChrome/workbox)                             | MIT-licensed PWA caching toolkit.                                                                                                 | Candidate direct dependency for generated Web applications.      | Cache application shell, menu reads, and static assets only; never make payments or offline mutations authoritative.                   |
| Query cache and mutation handling | [TanStack Query](https://github.com/TanStack/query)                            | MIT-licensed React data-fetching and caching library.                                                                             | Candidate direct dependency for generated Web applications.      | Require server-side `cartRevision`, `clientMutationId`, idempotency, and conflict handling before offline cart writes.                 |
| Realtime kitchen updates          | [Socket.IO](https://github.com/socketio/socket.io)                             | MIT-licensed bidirectional communication library.                                                                                 | Candidate generated-runtime adapter.                             | Define a Factory event envelope first; publish after a persisted order transition and never transition an order from a socket message. |
| Realtime provider alternative     | [Centrifugo](https://github.com/centrifugal/centrifugo)                        | Apache-2.0 realtime service.                                                                                                      | Future provider adapter.                                         | Keep the event envelope transport-neutral so it can replace Socket.IO.                                                                 |
| QR presentation                   | [qrcode.react](https://github.com/zpao/qrcode.react)                           | ISC-licensed React QR rendering package; its bundled QR encoder is MIT.                                                           | Candidate direct dependency for generated Web applications.      | QR payloads must be opaque, signed, and expiring table-session tokens, never raw table IDs or access credentials.                      |
| Browser receipt printing          | [react-to-print](https://github.com/MatthewHerbst/react-to-print)              | MIT-licensed browser print component with documented WebView limitations.                                                         | Candidate direct dependency for customer receipts.               | Emit a Factory receipt projection and print CSS. A browser print request is not payment or kitchen-print completion evidence.          |
| Silent thermal printing           | [QZ Tray](https://github.com/qzind/tray)                                       | LGPL-2.1 desktop project; silent printing uses signed requests and certificates.                                                  | Future external print-provider adapter only.                     | Expose bounded receipt and kitchen-ticket jobs; never vendor it or place signing keys in Graphs or generated applications.             |
| Operational dashboards            | [Apache ECharts](https://github.com/apache/echarts)                            | Apache-2.0 charting library with bundled third-party notice obligations.                                                          | Candidate direct dependency with notices.                        | Compile Factory-owned aggregate read models for sales, preparation time, cancellations, and stock alerts.                              |
| Commerce-provider comparison      | [Saleor](https://github.com/saleor/saleor)                                     | BSD-3-Clause API-first commerce project.                                                                                          | Future provider adapter or source-study reference only.          | Validate that Factory's provider contract is not Medusa-specific.                                                                      |
| POS reference                     | [Open Source POS](https://github.com/opensourcepos/opensourcepos)              | Its displayed MIT text adds a visible footer-signature condition.                                                                 | Reference only.                                                  | Study table, receipt, stock, and reporting concepts; do not copy code, UI, or assets.                                                  |

## Exclusion list

- [Vendure](https://github.com/vendure-ecommerce/vendure): GPLv3 by default.
- [ERPNext](https://github.com/frappe/erpnext): GPL-3.0.
- [Plausible Analytics](https://github.com/Plausible/analytics): AGPL-3.0.
- QZ Tray: do not vendor LGPL source or runtime into Factory products.
- Any future SSPL, BSL, source-available, or custom-reciprocal project is
  excluded from copying and embedded runtime use until a dedicated legal and
  architecture decision says otherwise.

## Product inference

The first Restaurant increment should introduce Factory-owned order semantics
for table sessions, fulfilment type, order versioning, cancellation audit, and
kitchen state. QR, realtime, receipts, offline behaviour, and providers are
adapters around those semantics. They are not alternative sources of truth.

Before a candidate is implemented, record its exact published version, notice
requirements, adapter boundary, removal path, fixture strategy, and acceptance
tests in the corresponding source-study and capability design.

## 2026-08-01 scale-out source evidence

| Need                       | Source                                              | Observed fact                                                                                                     | Allowed Factory role               | Decision affected                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory and traceability | [InvenTree](https://github.com/inventree/InvenTree) | The MIT-licensed project is an inventory-management system with stock-control and part-tracking concerns.         | Fixed-reference source study only. | Inform independently authored `inventory.ledger`, stock-reservation, movement-reason, and traceability contracts; do not reuse its Django runtime, migrations, UI, or source without a source-study record. |
| Support operations         | [Chatwoot](https://github.com/chatwoot/chatwoot)    | The MIT-licensed project exposes omnichannel customer-support, assignment, collaboration, and reporting concerns. | Fixed-reference source study only. | Inform a bounded `support.inbox` capability distinct from CRM. A future package requires PII boundaries, assignment/SLA fixtures, audit evidence, and an exact source-study before any attributed port.     |

These sources widen the reusable capability map; they do not make either
project an installed dependency, a provider, a Candidate, a Golden package, or
an authority over the Application Graph.

## 2026-07-30 profile and governed-adapter diligence

**Decision investigated.** Identify next independently compilable Application
Graph profiles and governed adapters without allowing an external editor,
runtime, database, authorization service, or vertical product to own Factory
business semantics.

### Observed facts (public sources)

| Candidate                                                                                                            | Classification              | Version / source date                                                                                       | Observed fact and adoption or maintenance signal                                                                                                                     | Product decision affected                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)                                                                           | Direct dependency candidate | Factory lock: `@puckeditor/core` 0.22.3, observed 2026-07-30; public v0.21.2 release dated 2026-04-01       | Its README calls Puck a React visual editor, says the host owns the data, supports Next.js, and publishes MIT. The repository displayed 38 releases and 12.7k stars. | Keep `PageModel` canonical; map only declared blocks to/from Puck and retain its MIT notice.                                                                                       |
| [React Flow / xyflow](https://github.com/xyflow/xyflow)                                                              | Direct dependency candidate | Factory lock: `@xyflow/react` 12.11.2, observed 2026-07-30                                                  | xyflow documents `@xyflow/react`, MIT licensing, changeset-driven releases, and displayed 372 releases.                                                              | Keep `FlowModel` canonical; positions and UI events are presentation data, and only declared nodes/transitions/guards/effects cross the adapter.                                   |
| [XState](https://github.com/statelyai/xstate)                                                                        | Direct dependency candidate | Factory lock: `xstate` 5.32.5, observed 2026-07-30; public xstate@5.31.1 release dated 2026-05-10           | Upstream presents an MIT state-machine/statechart runtime and displayed 490 releases; it warns that machine behaviour may change in minor releases.                  | Compile a closed FlowModel transition table, pin it, and test output. Never compile editor-supplied actions, URLs, or arbitrary code.                                              |
| [Prisma](https://github.com/prisma/prisma)                                                                           | Direct dependency candidate | Factory lock: `prisma`/`@prisma/client` 6.19.3, observed 2026-07-30                                         | The official repository describes a Node.js/TypeScript ORM, publishes Apache-2.0, and maintains v6 and v7 release lines.                                             | Compile immutable `DomainModel` into project-local PostgreSQL schema/migrations/access; generated schema is an artifact, not a Draft import source.                                |
| [node-casbin](https://github.com/apache/casbin-node-casbin)                                                          | Direct dependency candidate | Factory lock: `casbin` 5.51.1, observed 2026-07-30; public v5.50.0 release dated 2026-04-25                 | The official Apache Casbin repository identifies Apache-2.0; the Node repository exposes tagged releases.                                                            | Compile bounded roles/resources/actions to Casbin model/policy artifacts and guards. Free-form Casbin files are not Graph inputs.                                                  |
| [OpenFGA](https://github.com/openfga/openfga)                                                                        | Source-study/reference only | v1.15.1 release dated 2026-05-06; docs updated 2026-07-24                                                   | Apache-2.0 OpenFGA uses an external store, model, tuples, and API. Its docs say authorization models are immutable and recommend an explicit model ID in production. | Do not replace baseline Casbin. First define `AuthorizationProviderV1`, fixtures, and conformance tests; record a Published-Revision-derived model ID as deployment metadata only. |
| [Amplication source study](https://github.com/amplication/amplication/tree/7656495d27f0dceff89657590c3f14149e45c7a6) | Source-study/reference only | Fixed commit `7656495d27f0dceff89657590c3f14149e45c7a6`, retrieved 2026-07-29                               | The existing reviewed record identifies Apache-2.0 outside `ee/`, excludes `ee/**`, and declares that no upstream source was copied.                                 | Continue generator/plugin/template/Git-sync pattern study only. No package, source, generated output, or enterprise tree reaches Factory runtime paths.                            |
| [Medusa](https://github.com/medusajs/medusa/tree/dde167d0be4c23ed37aa7a3d71721728e31f3e96)                           | Source-study/reference only | Fixed MIT commit `dde167d0be4c23ed37aa7a3d71721728e31f3e96`, retrieved 2026-07-29; v2.15.3 dated 2026-05-21 | The upstream modular commerce project’s release notes include database-migration remediation, showing provider upgrades can affect persistence operations.           | Do not add it to Restaurant or Simple Ecommerce. A later Factory-owned provider contract must consume Published Revisions and pass fixtures without changing commerce semantics.   |
| [Schema.org Restaurant / MenuItem](https://schema.org/Restaurant)                                                    | Source-study/reference only | Schema.org v30.0 dated 2026-03-19; terms observed 2026-07-30                                                | The vocabulary offers Restaurant/Menu/MenuItem; the Restaurant page reports 100K–1M indexed domains (Google, May 2026). Schemas and examples are CC BY-SA 3.0.       | Optional, independently authored outbound JSON-LD only after Restaurant acceptance; do not copy examples or make markup vocabulary the DomainModel.                                |
| [iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)                                                         | Source-study/reference only | Standards Track, September 2009; observed 2026-07-30                                                        | It defines transport-independent event and free/busy exchange, distributed under IETF legal provisions.                                                              | For a later Appointment profile, use only as an import/export adapter contract around Factory-owned availability, lifecycle, collision, and audit semantics.                       |
| [GS1 EPCIS 2.0.1](https://ref.gs1.org/standards/epcis/)                                                              | Source-study/reference only | EPCIS 2.0 ratified June 2022; official archive identifies 2.0.1 as current                                  | EPCIS models traceability as process events and specifies corrections as later events rather than mutation/deletion of earlier ones.                                 | Future commerce/inventory event-export vocabulary only; preserve Factory ledger/audit as canonical and do not copy schemas before standards-use licence review.                    |
| [Cal.com](https://github.com/calcom/cal.com)                                                                         | Excluded                    | AGPLv3/open-core split described by upstream, observed 2026-07-30                                           | Upstream describes an AGPLv3 core with commercial `ee/` features, including network source-availability obligations.                                                 | Do not copy, embed, package, or run it as the Appointment profile.                                                                                                                 |
| [pretix](https://github.com/pretix/pretix)                                                                           | Excluded                    | Repository observed 2026-07-30                                                                              | The ticketing application reports use for thousands of events/millions of tickets but says most code is AGPLv3 with additional terms.                                | Do not copy, embed, package, or run it. A Ticketing profile must start with Factory-owned ticket/admission/refund/audit semantics.                                                 |
| [Open Food Facts](https://github.com/openfoodfacts/openfoodfacts-server)                                             | Excluded                    | Server v2.93.0 dated 2026-05-26; observed 2026-07-30                                                        | The server is AGPL-3.0; its API-client documentation identifies the product database as ODbL.                                                                        | Do not use server/code/database snapshots as Restaurant fixtures. Any future enrichment adapter needs a separate API/data-licence, locality, quality, and allergen-safety review.  |

### Inferences

1. **Compiler order:** PageModel/Puck, FlowModel/React Flow plus XState,
   DomainModel/Prisma, and PolicyModel/Casbin remain bounded independently
   compilable targets. This is an inference from the cited evidence and locked
   versions, not approval to upgrade a package.
2. **Provider order:** OpenFGA and Medusa remain after Factory-owned contracts,
   fixed-version evidence, fixture providers, and conformance suites. Neither
   can be a compilation prerequisite or become Graph authority.
3. **Vertical examples:** Schema.org, iCalendar, and EPCIS are interoperability
   references, not internal models. Cal.com, pretix, and Open Food Facts are
   not admissible code, runtime, or data shortcuts under the current policy.

## 2026-08-01 composable Profile portfolio evidence

**Decision investigated.** Whether public ecosystems can accelerate a path to
100+ composable, production-relevant Profile recipes without external products,
source trees, provider records, or Candidate records becoming Factory's source
of truth.

### Durable observed facts

1. The reviewed fixed-reference portfolio contains 43 public references across
   restaurant/POS, commerce, CRM, appointments, ticketing, learning, healthcare
   administration, inventory/warehouse, fleet/logistics, HR, property,
   accounting, support/knowledge/CMS, and platform services. Its exclusive
   classifications are 1 direct-dependency, 7 provider, 11 bounded-source,
   8 pattern-only, and 16 excluded. The 108 scenario mappings are explicitly
   demand metadata, not Candidates or Profile implementations. [Portfolio
   record](../ecosystem/portfolio/2026-07-30-external-business-logic.json)
2. The accepted External Intake design permits automated fixed-ref acquisition,
   hashing, notice capture, offline scanning, module inventory, quarantined
   Candidate evidence, and isolated Factory-owned conformance only. It forbids
   automated licence approval, finding waiver, source copying, dependency
   installation, provider activation, Graph mutation, Golden registration, or
   compilation linkage. [Design](superpowers/specs/2026-07-31-external-capability-intake-design.md)
3. Candidate records use `factory.candidate-capability/v1`, have no Graph or
   compiler visibility, and remain quarantined even when conformance passes.
   Only an independently authored, reviewed Golden asset can later be selected
   by a Draft and compile after Publish. [Design](superpowers/specs/2026-07-31-external-capability-intake-design.md)

### Factory inference and decision effect

The portfolio should be used to validate a small, permission-aware capability
kernel and compose typed recipes, not to recreate or import vertical
applications. Treat a recipe count as coverage planning only: production
readiness still requires Factory-owned semantics, Published-Revision
compilation, permission/failure/audit evidence, relevant security or regulatory
review, and (where used) exact ecosystem promotion evidence and a removal path.
The detailed source map and 30-day recipe staging are in
[the portfolio memo](research/2026-08-01-profile-ecosystem-portfolio.md).

## 2026-08-01 reusable asset fast lane

**Decision investigated.** Determine how Factory can rapidly cover more than
100 production-relevant Profile scenarios by reusing open-source assets and
services without reducing the Application Graph to an unmaintained collection
of forked vertical applications.

### Observed facts (public sources)

| Asset                                                                                                                                                                          | Licence / official source | Reuse lane                               | Factory boundary                                                                              | Portfolio leverage                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)                                                                                                                                     | MIT                       | Pinned dependency plus PageModel adapter | Puck emits validated PageModel diffs only.                                                    | All multi-page products                       |
| [Radix Primitives](https://github.com/radix-ui/primitives)                                                                                                                     | MIT                       | Pinned dependency                        | Factory design-token wrappers, never raw arbitrary props in Graph.                            | All generated web products                    |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) and [Zod](https://github.com/colinhacks/zod)                                                             | MIT                       | Pinned dependencies                      | DomainModel generates fields and validation; no user-provided executable refinements.         | Requests, approvals, commerce, CRM            |
| [TanStack Query](https://github.com/TanStack/query) and [TanStack Table](https://github.com/TanStack/table)                                                                    | MIT                       | Pinned dependencies                      | Generated query/list clients; authorization remains server-side.                              | Operational and merchant products             |
| [Uppy](https://github.com/transloadit/uppy)                                                                                                                                    | MIT                       | Pinned dependency                        | UI upload only; storage, scanning, retention and ACL stay provider-owned.                     | Claims, documents, support, commerce          |
| [FullCalendar](https://github.com/fullcalendar/fullcalendar) core                                                                                                              | MIT core                  | Pinned dependency study                  | Premium packages remain excluded.                                                             | Reservations, scheduling, field service       |
| [xyflow](https://github.com/xyflow/xyflow) and [XState](https://github.com/statelyai/xstate)                                                                                   | MIT                       | Pinned editor/compiler dependencies      | Presentation coordinates are non-semantic; FlowModel compiles closed state machines.          | Workflow-heavy Profiles                       |
| [Prisma](https://github.com/prisma/prisma) and [node-casbin](https://github.com/apache/casbin-node-casbin)                                                                     | Apache-2.0                | Pinned compiler dependencies             | Published DomainModel and PolicyModel are the only compiler inputs.                           | Every protected data application              |
| [BullMQ](https://github.com/taskforcesh/bullmq) and [Valkey](https://github.com/valkey-io/valkey)                                                                              | MIT / BSD-3-Clause        | Pinned dependency plus governed provider | Durable database/outbox state remains authoritative.                                          | Imports, notification, jobs, scheduled work   |
| [OpenTelemetry JavaScript](https://github.com/open-telemetry/opentelemetry-js)                                                                                                 | Apache-2.0                | Pinned dependency                        | Factory controls redaction, sampling and event schema.                                        | Observability across all Profiles             |
| [Keycloak](https://github.com/keycloak/keycloak) and [Gotenberg](https://github.com/gotenberg/gotenberg)                                                                       | Apache-2.0 / MIT          | Governed provider adapters               | Pin container digests; Graph holds declared intent, never provider administrator credentials. | Enterprise identity and document outputs      |
| [Meilisearch Community Edition](https://github.com/meilisearch/meilisearch), [OpenFGA](https://github.com/openfga/openfga), [Temporal](https://github.com/temporalio/temporal) | MIT CE / Apache-2.0 / MIT | Later governed provider adapters         | Each needs a dedicated contract, fixture provider and conformance suite before activation.    | Search, relationship auth, long-running flows |

The official [Backstage Software Templates documentation](https://backstage.io/docs/features/software-templates/)
confirms the useful scaffolding pattern: parameterized skeletons, bounded
actions, task evidence and dry runs. Factory will learn from this pattern but
will retain its own Graph and Published-Revision compilation contract.

### Decision

Factory scales through a **four-lane automated supply chain**, not manual
rewrites of one vertical application at a time:

1. **Direct dependency lane:** package-manager dependencies with locked
   version/integrity, notices, SBOM, vulnerability/secret scan, wrapper and
   fixture tests.
2. **Provider lane:** a fixed OCI image or service API is isolated behind a
   versioned adapter, fixture provider and removal test. Providers never own
   Graph semantics or credentials.
3. **Source-study lane:** a fixed commit is analysed for reusable patterns or
   exact small utilities. It cannot affect runtime until an exact-file licence
   record, attribution, adapter, tests and replacement test exist.
4. **Reference-only lane:** commercial-tree, reciprocal, source-available or
   architecture-only repositories guide Factory-owned implementation but are
   neither copied nor embedded.

Candidate discovery, SHA pinning, licence/SBOM collection, scanning, package
inventory and fixture conformance can be automated in bulk. The resulting
Candidate record remains non-runnable until its generic contract and conformance
evidence pass. This replaces one-by-one hand-authored capability certification
with a repeatable intake gate while retaining deterministic production output.

### Source-copy exception

Copying a whole upstream product is not an admissible fast lane: it brings an
independent schema, migrations, authentication model, runtime assumptions,
dependency graph and security-upgrade obligation. It produces multiple forks
rather than reusable Graph capabilities. A narrow source import may be used
only after recording an immutable commit, exact source paths and licence
obligations; excluding enterprise/premium/generated/schema/migration/runtime
code; and adding Factory-owned adapter, attribution, SBOM, focused tests and a
removal test. This satisfies the repository rule that no external source is
copied without an explicit source-study record.

Projects such as [Vendure](https://github.com/vendure-ecommerce/vendure),
[ERPNext](https://github.com/frappe/erpnext),
[ToolJet](https://github.com/ToolJet/ToolJet),
[Cal.com](https://github.com/calcom/cal.com),
[Directus](https://github.com/directus/directus), and
[n8n](https://github.com/n8n-io/n8n) remain excluded from default copy/embed
lanes because their published terms include GPL, AGPL, BSL or source-available
conditions unsuitable for this default platform policy.

### Next adoption sequence

After Typed Capability Binding Validation is accepted, first create the
`generated-ui` asset foundation: Factory wrappers for Radix, Puck, React Hook
Form/Zod and TanStack Query/Table with Storybook/Playwright fixtures. Next add
cross-Profile attachment, notification intent, durable command and search
projection contracts, using Uppy and BullMQ/Valkey as bounded implementations.
Then compile catalog, cart, order, inventory, reservation and workflow
subgraphs; Restaurant Ordering, Ecommerce and later approvals become
independent acceptance recipes rather than bespoke application codebases.

## 2026-08-01 scale-out discovery: high-leverage reusable assets

**Decision investigated.** Which additional public assets could shorten the
path from three accepted Profiles to a broad catalogue of production-relevant
recipes without importing another product's schema, lifecycle, or deployment
authority.

| Candidate                                                                   | Observed fact                                                                                                                           | Proposed Factory lane                                                          | Boundary decision                                                                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Atomic CRM](https://github.com/marmelab/atomic-crm)                        | The repository is MIT-licensed, TypeScript-first, and publishes its reusable CRM blocks as a shadcn Registry.                           | Fixed-reference source study for CRM list/detail/activity blocks.              | Do not import its Supabase model or application shell. A source study must name exact presentation files before any narrow source reuse.         |
| [react-admin](https://github.com/marmelab/react-admin)                      | The React admin framework is MIT-licensed and targets REST/GraphQL data applications.                                                   | Reference plus possible pinned direct-dependency study.                        | Factory keeps PageModel and generated API contracts; do not let resource configuration become DomainModel input.                                 |
| [refine](https://github.com/refinedev/refine)                               | The TypeScript React meta-framework is MIT-licensed and provides headless enterprise-app integrations.                                  | Reference plus selective source/dependency study.                              | Evaluate hooks and data-provider seams, not the framework's application lifecycle or generated project ownership.                                |
| [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) | The responsive draggable/resizable React grid is MIT-licensed.                                                                          | Direct-dependency candidate for a bounded `experience.free-layout/v1` adapter. | Dragging produces validated PageModel layout diffs; it cannot create routes, components, domain fields, or arbitrary styles.                     |
| [InvenTree](https://github.com/Inventree/InvenTree)                         | The inventory-management application is MIT-licensed and presents stock-control, part-tracking, REST API, and security-policy evidence. | Fixed-reference source study for inventory/procurement semantics.              | Do not copy its Django models or migrations. Extract only independently specified stock/traceability behaviours into Factory Graph capabilities. |
| [Autumn](https://github.com/useautumn/autumn)                               | The pricing/billing platform is Apache-2.0 and largely TypeScript.                                                                      | Later provider/source-study candidate for subscription entitlements.           | Never accept its payment or billing state as Factory truth; real money movement remains out of v1 and requires a dedicated provider decision.    |
| [Frappe CRM](https://github.com/frappe/crm)                                 | The CRM repository declares AGPL-3.0.                                                                                                   | Explicit no-copy reference.                                                    | Its lead/deal/activity vocabulary may inform independent requirements, but no code, assets, or runtime may enter Factory.                        |

### Decision effect

These findings add high-leverage candidate families for CRM, configurable
operations UI, dashboard layout, inventory/procurement, and future
entitlements. They do **not** add dependencies, source copies, provider
activation, or new Profile claims. Before any candidate reaches the external
portfolio it needs a fixed release or commit, exact licence/notice evidence,
an intended Factory interface, a removal path, and an isolated fixture. This
keeps bulk discovery fast while ensuring a hundred scenario labels never turn
into a hundred unmaintainable forks.

## 2026-08-01 current source lanes for order, restaurant, and operations

**Decision investigated.** Which permissively licensed public projects can
accelerate the next reusable capability families without importing an entire
vertical application's data model, runtime, or deployment lifecycle.

| Candidate                                                    | Observed public fact                                                                                                                             | Intended Factory use                                                                                                                | Explicit boundary                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [TastyIgniter](https://github.com/tastyigniter/TastyIgniter) | The repository describes restaurant ordering, table reservation, and restaurant management and publishes an MIT licence.                         | Fixed-reference source study for `scheduling.reservation`, `capacity.queue`, menu availability, and restaurant fulfilment fixtures. | Do not copy Laravel models, migrations, UI, extensions, or runtime before an exact-path source study and Factory conformance tests.              |
| [Medusa](https://github.com/medusajs/medusa)                 | The project is MIT-licensed and presents a modular commerce ecosystem with modules and plugins.                                                  | Provider-pattern and source-study reference for later catalogue, order, fulfilment, and merchant integration contracts.             | It remains a later provider, never the source of Factory commerce semantics or a v1 runtime dependency.                                          |
| [Saleor](https://github.com/saleor/saleor)                   | Saleor Core identifies itself as a BSD-3-Clause headless commerce API; its organisation also publishes dashboard and app-extension repositories. | Source-study reference for GraphQL-commerce boundaries and extension lifecycle patterns.                                            | Study exact permissively licensed paths only; do not import its GraphQL schema, dashboard, payment app state, or service runtime as Graph truth. |
| [Appsmith](https://github.com/appsmithorg/appsmith)          | Appsmith is Apache-2.0 and describes a platform for internal tools, dashboards, APIs, and databases.                                             | Pattern/reference source for a future internal-operations Profile family.                                                           | Do not embed its low-code runtime or datasource configuration. Factory keeps its own Graph, policy, compilation, and credential boundaries.      |

**Decision.** These projects extend discovery coverage, not executable
coverage. The next bulk-intake batch must first repair the independent-review
P1 isolation findings in the External Intake pipeline, then capture immutable
references, notices, SBOM and security evidence before any narrow
Factory-authored adapter or attributed source import is proposed.

## 2026-08-01 provider and source-intake evidence refresh

**Decision investigated.** Which publicly licensed systems can accelerate
cross-profile production features without making a third-party data model or
runtime the source of truth.

| Candidate                                                 | Observed public fact                                                                                                                  | Recommended lane                       | Boundary decision                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Appwrite](https://github.com/appwrite/appwrite)          | The BSD-3-Clause project provides self-hostable authentication, databases, storage, functions, messaging, realtime, and hosting.      | Provider source study                  | A future adapter may implement declared identity, storage, notification, or realtime intent. Appwrite tables, functions, and credentials must not become canonical Graph data. |
| [Keycloak](https://github.com/keycloak/keycloak)          | The project is Apache-2.0 and provides modern application identity and access management.                                             | Identity provider source study         | Pin a provider release and compile declared identity intent to an adapter. Do not copy realm configuration or put provider credentials into a Graph.                           |
| [Temporal](https://github.com/temporalio/temporal)        | The MIT-licensed service provides durable workflow execution, while workflow code is itself a separate deterministic execution model. | Durable-workflow provider source study | Keep Factory FlowModel authoritative. A later adapter may execute a compiled, constrained FlowModel; it must not accept arbitrary generated workflow code.                     |
| [Meilisearch](https://github.com/meilisearch/meilisearch) | The repository separates MIT community material from Business Source Licensed enterprise material.                                    | Search provider source study           | Intake must be path-scoped to MIT material and record that scope. No enterprise path, search index definition, or API key is admitted into the Graph.                          |
| [Novu](https://github.com/novuhq/novu)                    | The project describes an MIT open core but identifies enterprise directories under a commercial licence.                              | Notification provider source study     | Use only a version-pinned CE/provider boundary after a path-level licence study; never copy enterprise paths or treat provider workflows as canonical notification semantics.  |

**Decision effect.** Bulk discovery may queue these records automatically, but
each record must still become exactly one of: a pinned direct dependency, a
governed provider adapter, a narrow attributed source study, or an exclusion.
It must never become a whole-repository runtime import.

## 2026-08-01 source reuse refresh

**Decision investigated.** Which mature upstream projects should accelerate
Factory Profile breadth without taking ownership of the Application Graph or
the generated application runtime.

| Candidate                                        | Verified public evidence                                                                                                                            | Reuse decision                                                                                                                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Medusa](https://github.com/medusajs/medusa)     | MIT-licensed TypeScript commerce platform that presents modular commerce building blocks for DTC, B2B, marketplace, POS, and service scenarios.     | Maintain as a pinned source-study and future `commerce.provider/v1` comparison. Its modules inform neutral capability seams; do not copy its data model or make it a generated runtime dependency. |
| [Appwrite](https://github.com/appwrite/appwrite) | BSD-3-Clause platform covering authentication, data, storage, functions, messaging, realtime, and hosting.                                          | Treat as a bounded backend-provider study. A future adapter may implement an approved interface, but Appwrite resources and credentials cannot become Graph input.                                 |
| [Keycloak](https://github.com/keycloak/keycloak) | Apache-2.0 identity and access-management server with federation, strong authentication, user management, and authorization features.               | Prioritise an OIDC session provider contract and fixture provider; do not copy realm configuration or administrator credentials into Factory artefacts.                                            |
| [Novu](https://github.com/novuhq/novu)           | Notification infrastructure for inbox, email, SMS, push, and chat; its public repository identifies MIT core alongside commercial enterprise paths. | Keep it in a path-scoped provider study. Any future use must exclude enterprise directories and retain a notification-intent contract owned by Factory.                                            |

**Local intake verification.** The current intake tests prove that a batch can
acquire a valid sibling while rejecting an unsafe one, and that source-study
input is strict and sensitive-field checked. The missing scale mechanism is
not another manual certification pass: it is a non-promoting transformation
from an allowlisted Portfolio record and completed evidence into a constrained
Candidate proposal with declarative artifacts and conformance fixtures.

## 2026-08-08 Base44 product-workflow study

**Decision investigated.** Which Base44 product patterns can reduce the time
from requirement to a verified runnable product without replacing Factory's
Application Graph, immutable lifecycle, compiler, or verifier.

### Observed public facts

- Base44 documents separate Default, Discuss, and Edit AI chat modes, prompt
  queues, controls, reversion, and restoration or publication of previous
  versions in its
  [AI chat documentation](https://docs.base44.com/Building-your-app/AI-chat-modes).
- Its [canvas](https://docs.base44.com/Building-your-app/Canvas) presents all
  application pages as live-preview frames on one surface and supports notes,
  drawings, images, collaboration, and instructions sent to AI.
- A workspace
  [design system](https://docs.base44.com/Building-your-app/Design-system)
  defines colours, fonts, logo, and components once and applies them across
  applications.
- Base44 documents safe parallel experimentation and merging through
  [branches](https://docs.base44.com/Building-your-app/working-with-branches),
  and local version-control collaboration through its
  [GitHub integration](https://docs.base44.com/developers/app-code/local-development/github).
- The
  [Activity Monitor](https://docs.base44.com/developers/app-code/editor/activity-monitor)
  shows development-time API requests, responses, status codes, and timing.
- Its
  [connector catalogue](https://docs.base44.com/Integrations/connectors-catalog)
  combines available integrations with example prompts and requested
  permissions.
- Base44 provides a documented
  [pre-publish security scan](https://docs.base44.com/Setting-up-your-app/running-a-security-scan)
  and recommends reviewing proposed remediation before applying it.
- The commercial product also advertises an integrated managed backend,
  authentication, payments, hosting, custom domains, and SEO. These are product
  capabilities, not reusable open-source implementation assets.

### Decision

Factory will reuse these findings as independently implemented product
patterns, not as copied code or a runtime dependency. The first adoption slice
is a Base44-inspired Golden Path:

```text
Discuss -> RequirementSpec -> plan alternatives -> visual Graph Diff
-> Draft -> role/data simulation -> Publish -> Compile -> Verify -> Preview
```

Adopt now: separated discussion/planning/mutation modes; an all-pages and
application-lineage canvas; preview-before-apply alternatives; a coherent
Experience System; deterministic role/data simulation; a bounded activity and
evidence timeline; and one-action verified local preview.

Adapt rather than copy: Base44 branches become Factory Draft revisions;
Activity Monitor becomes redacted compiler/verifier evidence; security
remediation may propose only a reviewable Draft Diff; data editing operates
through DomainModel and seed scenarios rather than becoming a second source of
truth.

Defer: general connectors, GitHub product UX, realtime collaboration,
production identity, real payments, custom domains, managed hosting, and a
backend-as-a-service. Reject: arbitrary package/source import, source reverse
parsing, unbounded AI edits, or any Base44-owned schema/runtime as Graph
authority.

### Roadmap consequence

The principal near-term risk is product closure, not capability count. Pause
new capability-family creation at the current 27-family portfolio and place a
single Expense Approval Golden Path acceptance gate before the remaining
25–35-family promotion, 100+ recipe, and 12-anchor breadth goals. Restaurant
Ordering and Simple Ecommerce remain regression Profiles, but they do not
block first acceptance of the complete user journey.

The approved design is recorded in
[`2026-08-08-base44-inspired-golden-path-design.md`](superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md).
