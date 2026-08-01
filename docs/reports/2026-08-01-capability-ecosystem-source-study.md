# Capability ecosystem source study

**Research date:** 2026-08-01
**Decision:** build coverage for 100+ eventual business scenarios by adding
small technical dependencies, Factory-owned capability packages, and replaceable
provider adapters without making an upstream product, schema, workflow runtime,
or credential store authoritative.

## Decision summary

Factory should invest first in its native command/receipt/outbox, policy, audit,
and Graph-binding kernel. The next external additions should be narrow UI,
upload, scheduling, and telemetry dependencies, followed by explicitly
contracted identity, authorization, search, document, and notification
providers. Existing vertical applications are useful evidence of vocabulary and
edge cases, but are not a shortcut to application breadth.

The evidence supports a four-lane policy:

1. **Direct published dependency** — use a version-pinned, wrapped library for
   a technical concern only; retain its notice and test the Factory wrapper.
2. **Bounded provider adapter** — compile Factory-owned intent to a versioned
   provider contract. Provider state is an effect/projection, never the Graph.
3. **Selective source port** — exceptionally, port one identified,
   permissively licensed, side-effect-free module only after an immutable source
   study, notice, and removal test. Re-authoring an independently specified
   behaviour is preferred to copying.
4. **Reference only** — learn terminology, state boundaries, and test cases;
   do not import, embed, or execute the upstream product.

This is a research recommendation, not an approval to add a dependency, copy
source, activate a provider, or promote a capability.

## Local constraints observed

### Observed facts

- `docs/project-status.md` (2026-08-01) records 19 capability families, 38
  versioned asset packages, five starters, and a 43-source/108-scenario
  discovery portfolio. It explicitly says this is not installed product
  coverage.
- The same status record says zero external providers are active and zero
  Candidates are Golden.
- `packages/external-intake/src/candidate-port-plan.ts` maps only the three
  executable reuse modes (`direct-dependency`, `provider-adapter`, and
  `selective-source-copy`) from Candidate classifications. A plan is
  source-free, requires one parsed non-generated module with no network,
  process, filesystem, dynamic-load, or dynamic-evaluation access, and requires
  licence, notice, SBOM, secret scan, SAST, vulnerability scan, conformance,
  and removal-test evidence.
- ADR-0013 requires a new commerce command to be selected by exact immutable
  capability bindings; it cannot select a provider or package from caller
  input. Its idempotency receipt, aggregate CAS, stock, audit, outbox, and
  terminal receipt effects are transactionally bounded.

### Inference and decision effect

The platform must treat upstream code and services as *implementations of a
Factory contract*, not as a second application model. This rules out importing
an entire commerce, BaaS, low-code, calendar, or workflow product even where a
permissive repository licence exists. It also means a provider cannot write a
Published Graph, select a capability lock, replace the durable command receipt,
or receive raw prompts/credentials in Graph artefacts.

## Public evidence and classification portfolio

The table classifies every candidate considered by this study. “Maintenance
signal” is an observed public signal, not a security certification. Release
dates and repository activity were checked on 2026-08-01.

| Candidate and public primary source | Observed fact and adoption/maintenance signal | Classification | Product decision affected |
| --- | --- | --- | --- |
| [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js) ([Apache-2.0](https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE)) | Official JS telemetry implementation. GitHub listed release `v2.10.0` on 2026-07-21 and activity on 2026-07-31; the repository documents its stable/experimental version compatibility. | **(a) Direct published dependency** | Add a redacted `observability.telemetry/v1` wrapper; Factory owns event names, sampling, and data classification. |
| [Sentry JavaScript SDK](https://github.com/getsentry/sentry-javascript) ([MIT](https://github.com/getsentry/sentry-javascript/blob/develop/LICENSE)) | Official SDK repository is MIT; GitHub listed `10.69.0` on 2026-07-29 and activity on 2026-07-31. | **(a) Direct published dependency**, optional exporter only | Error capture may be a removable exporter under Factory telemetry. DSN/configuration stays outside Graphs; default fixture exporter is local/no-op. |
| [Uppy](https://github.com/transloadit/uppy) ([MIT](https://github.com/transloadit/uppy/blob/main/LICENSE)) | File-upload UI/client library; GitHub showed activity on 2026-07-30 and 30k+ stars. | **(a) Direct published dependency** | Build `content.attachment/v1` only around Factory-issued upload intent and attachment metadata; do not take Companion or storage configuration as canonical state. |
| [Tiptap core](https://github.com/ueberdosis/tiptap) ([MIT](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)) | The public, headless editor repo is MIT; GitHub listed `v3.29.2` on 2026-07-28 and activity on 2026-07-31. Its Pro extensions have separate paid terms, so they are out of scope. | **(a) Direct published dependency** for public core only | Use a constrained editor surface for `content.article`; persist Factory-owned structured document content and server-side sanitised render output. |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) ([MIT](https://github.com/react-hook-form/react-hook-form/blob/master/LICENSE)) plus [Zod](https://github.com/colinhacks/zod) ([MIT](https://github.com/colinhacks/zod/blob/main/LICENSE)) | Both public TypeScript libraries are MIT and active: GitHub listed RHF `v7.83.0` on 2026-07-25 and Zod `v4.4.3` on 2026-05-04. | **(a) Direct published dependency** | Standardise generated form *presentation* and client validation. Server Graph semantic validation remains authoritative. |
| [TanStack Table](https://github.com/TanStack/table) ([MIT](https://github.com/TanStack/table/blob/main/LICENSE)) | MIT headless table library; GitHub showed 28k+ stars and activity on 2026-07-31. | **(a) Direct published dependency** | Supply a PageModel table renderer for CRM, approvals, inventory, reports, and support without allowing UI resource configuration to define DomainModel fields. |
| [BullMQ](https://github.com/taskforcesh/bullmq) ([MIT](https://github.com/taskforcesh/bullmq/blob/master/LICENSE)) | MIT queue library; GitHub listed an active release on 2026-07-31. It is a queue implementation, not a durable business workflow. | **(a) Direct published dependency** | Use only for dispatching already-committed Factory outbox work, deadlines, notification delivery, and projections. It cannot be the command ledger or workflow authority. |
| [rrule](https://github.com/jkbrzt/rrule) ([licence file](https://github.com/jkbrzt/rrule/blob/master/LICENCE)) | JavaScript implementation for iCalendar recurrence rules. The README documents RFC-style generation and timezone behaviour, but its latest tagged release is `v2.7.1` (2022-07-14) and repository activity was last seen in 2024. | **(a) Direct published dependency, conditional** | A candidate recurrence evaluator for appointments/scheduling only after compatibility, timezone, DST, and maintained-alternative review. Do not port its behaviour as Factory truth. |
| [ZXing JS](https://github.com/zxing-js/library) ([Apache-2.0](https://github.com/zxing-js/library/blob/master/LICENSE)) | JavaScript barcode/QR reader; GitHub listed `v0.23.0` on 2026-04-29 and activity on 2026-07-25. | **(a) Direct published dependency** | Local scanner component for check-in, POS, inventory, and asset checkout; Factory validates the scanned identifier against a compiled operation. |
| [Puck](https://github.com/puckeditor/puck) ([MIT](https://github.com/puckeditor/puck/blob/main/LICENSE)) | MIT visual-editor library; GitHub listed `v0.22.4` on 2026-07-29 and activity on 2026-07-31. | **(a) Direct published dependency, later** | Bounded `PageModel` layout editing. It must emit validated layout diffs only; no user-authored executable code, routes, domain fields, or arbitrary datasource bindings. |
| [Socket.IO](https://github.com/socketio/socket.io) ([MIT](https://github.com/socketio/socket.io/blob/main/LICENSE)) | MIT realtime application framework; GitHub listed `socket.io@4.8.3` on 2026-03-18 and 63k+ stars. Its optional Redis adapter is separately documented and must not be mistaken for the command/outbox ledger. | **(a) Direct published dependency, later** | A `realtime.delivery/v1` transport may deliver already-authorised, post-commit Factory projection events. It cannot carry commands, decide room membership, bypass a query authorization check, or establish business ordering. |
| [Keycloak](https://github.com/keycloak/keycloak) ([Apache-2.0](https://github.com/keycloak/keycloak/blob/main/LICENSE.txt)) | Official IAM server; GitHub listed `26.7.0` on 2026-07-09, 35k+ stars, and current activity. | **(b) Bounded provider adapter** | Prioritise an `IdentitySessionProviderV1` using OIDC/OAuth claims mapped to Factory `party`/role intent. Realm/admin configuration and credentials are provider-local. |
| [OpenFGA](https://github.com/openfga/openfga) ([Apache-2.0](https://github.com/openfga/openfga/blob/main/LICENSE)) | Official relationship-based authorization engine; GitHub listed `v1.18.1` on 2026-06-29 and current activity. | **(b) Bounded provider adapter** | A `RelationshipAuthorizationProviderV1` may decide a compiled, named check. Factory PolicyModel remains the declaration and audit source. |
| [Meilisearch](https://github.com/meilisearch/meilisearch) ([split licence](https://github.com/meilisearch/meilisearch/blob/main/LICENSE)) | Search service repository states `MIT AND BUSL-1.1`; its licence file distinguishes enterprise material. GitHub listed `v1.51.0` on 2026-07-27 and 58k+ stars. | **(b) Bounded provider adapter, path/licence scoped** | Implement `SearchProjectionProviderV1` for Factory-selected, redacted projections only. An exact container/API and MIT-only scope must be reviewed; no Enterprise path or index policy becomes Graph truth. |
| [Gotenberg](https://github.com/gotenberg/gotenberg) ([MIT](https://github.com/gotenberg/gotenberg/blob/main/LICENSE)) | MIT document-conversion API; GitHub listed `v8.34.0` on 2026-06-12 and activity on 2026-07-31. | **(b) Bounded provider adapter** | `DocumentRenderProviderV1` turns an immutable Factory render request into a document blob. Templates, retention, ACL, and attachment record stay Factory-owned. |
| [Novu](https://github.com/novuhq/novu) ([licence split](https://github.com/novuhq/novu/blob/next/LICENSE)) | Notification infrastructure with an open-core repository; GitHub reports no single SPDX identifier and active releases/activity. Licence scope therefore cannot be assumed from the repository landing page. | **(b) Bounded provider adapter, later and path scoped** | Compile Factory `notification.intent` to channel delivery. Provider workflows, subscribers, templates, and enterprise paths cannot replace Factory policy or message audit. |
| [Temporal](https://github.com/temporalio/temporal) ([MIT](https://github.com/temporalio/temporal/blob/main/LICENSE)) | Durable execution service; GitHub listed `v1.31.2` on 2026-07-08, 22k+ stars, and activity through 2026-08-01. | **(b) Bounded provider adapter, later** | Only a constrained compiled `Deadline/Wait/Signal` execution adapter after Factory FlowModel is sufficiently expressive. Never admit arbitrary upstream workflow code as a Graph input. |
| [Stripe Node SDK](https://github.com/stripe/stripe-node) ([MIT](https://github.com/stripe/stripe-node/blob/master/LICENSE)) and [Stripe test mode docs](https://docs.stripe.com/test-mode) | The SDK is MIT and GitHub listed `v22.4.0` on 2026-07-29. Test mode is a provider environment, not a simulated payment domain model. | **(b) Bounded provider adapter, real-money lane only** | Keep `payments.simulated/v1` first. Later map a Factory payment *attempt* and provider reference to Stripe; never delegate Factory order/receipt/ledger state or test a real provider in normal compiler tests. |
| [Appwrite](https://github.com/appwrite/appwrite) ([BSD-3-Clause](https://github.com/appwrite/appwrite/blob/main/LICENSE)) | Multi-purpose BaaS with authentication, databases, storage, functions, messaging, realtime, and hosting; GitHub listed `1.9.6` on 2026-07-22 and 56k+ stars. | **(d) Reference only** | Its broad resource/runtime model conflicts with Graph authority. Study its provider boundaries, but do not adopt its database/functions/realtime platform as a Factory runtime. |
| [Medusa](https://github.com/medusajs/medusa) ([MIT](https://github.com/medusajs/medusa/blob/develop/LICENSE)) | MIT modular commerce platform; GitHub listed `v2.18.0` on 2026-07-23 and 35k+ stars. | **(d) Reference only** (a future provider proposal needs a separate decision) | Learn catalogue/order/fulfilment seams and compare any future commerce adapter. Reject whole API, module, migrations, and admin import: those would create a competing commerce authority. |
| [Saleor](https://github.com/saleor/saleor) ([BSD-3-Clause](https://github.com/saleor/saleor/blob/main/LICENSE)) | Headless commerce API; the public repo is BSD-3-Clause. | **(d) Reference only** | Use as an external GraphQL/extension comparison. Do not import its schema, payment app state, dashboard, or service runtime as Factory Commerce. |
| [TastyIgniter Cart](https://github.com/tastyigniter/ti-ext-cart) ([MIT](https://github.com/tastyigniter/ti-ext-cart/blob/master/LICENSE.md)) | Restaurant cart extension with an MIT licence file; the existing immutable portfolio pins commit `287ec45dc3f545814c24c5a97f180a97409108fd`. | **(c) Selective source port, conditional** | Consider only a side-effect-free option cardinality/availability validator after an exact-file study. Never copy Laravel models, migrations, payment/order state, or extension runtime. |
| [InvenTree](https://github.com/inventree/InvenTree) ([MIT](https://github.com/inventree/InvenTree/blob/master/LICENSE)) | Inventory-management product; its repo exposes stock/part/traceability concepts and an MIT licence. The local portfolio pins `1.4.3`. | **(c) Selective source port, conditional** | Mine fixture cases for reservation/release/consume/adjust and, only if a compact pure module exists, port it with attribution. Factory’s transaction/CAS/outbox owns inventory writes. |
| [Eventyay Tickets](https://github.com/fossasia/eventyay-tickets) ([licence](https://github.com/fossasia/eventyay-tickets/blob/master/LICENSE)) | Ticketing/check-in repository; the local portfolio pins `25934879a2c738c6cbf422d8d1ccfd1b82d2186c` for a source study. | **(c) Selective source port, conditional** | Target only a pure capacity-hold-expiry or check-in validation module after exact licence verification. Never import organisers, payments, schema, migrations, or task runtime. |
| [Strapi](https://github.com/strapi/strapi) ([MIT](https://github.com/strapi/strapi/blob/main/LICENSE)) and [BookStack](https://github.com/BookStackApp/BookStack) ([MIT](https://github.com/BookStackApp/BookStack/blob/development/LICENSE)) | Public content products with versioned repositories; existing portfolio treats them as exact-path source-study candidates. | **(c) Selective source port, conditional** | Use only compact content revision/publication or navigation utilities after licence/path review. Do not import CMS schema, plugin runtime, rich-text data model, admin app, or permission system. |
| [n8n](https://github.com/n8n-io/n8n) ([Sustainable Use Licence](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)), [ERPNext](https://github.com/frappe/erpnext) ([GPL-3.0](https://github.com/frappe/erpnext/blob/develop/LICENSE)), [Vendure](https://github.com/vendure-ecommerce/vendure), and [Cal.com](https://github.com/calcom/cal.com) | These are whole vertical/runtimes. n8n declares a source-available Sustainable Use Licence; ERPNext is GPL-3.0. Vendure and Cal.com also require exact-snapshot/licence-scope review before any use; no repository-level label overrides product topology. | **(d) Reference only** | They can contribute vocabulary and adversarial scenarios. No source, containers, generated code, schemas, or runtime imports under current policy. |

### Inference from the portfolio

The most reusable coverage comes from a small set of horizontal seams:

| Kernel seam | Scenario families unlocked or strengthened | Recommended route |
| --- | --- | --- |
| Typed form, tabular operations UI, content editing, attachment, barcode scan | CRM, approvals, content/forms, restaurant/POS, inventory, support, reports | Direct dependencies behind PageModel/attachment components |
| Availability, recurrence, reservation, capacity hold, deadline | Appointments, rooms/chairs/equipment, classes, restaurant reservations, ticketing, service dispatch | Factory package with conditional `rrule` evaluator |
| Identity/session and relationship authorization | Employee/admin, customer self-service, CRM, data access, compliance | Keycloak then OpenFGA provider adapters |
| Durable outbox jobs, notifications, document rendering, telemetry | Every transactional and approval scenario | BullMQ/OTel direct dependencies; Gotenberg/Novu adapters |
| Realtime post-commit projection delivery | Kitchen/cashier boards, support queues, reservations, dashboards, check-in | Socket.IO behind a Factory authorization and event-envelope boundary |
| Search projection | CRM, knowledge base, catalogue, support, operational consoles | Meilisearch adapter after projection contract |
| Inventory traceability and commerce operations | Restaurant, ecommerce, retail counter, grocery pickup, receiving, warehouse, field service | Factory transaction kernel plus selectively studied fixtures, not a commerce runtime |
| Simulated payment attempt, later real payment provider | Restaurant, commerce, booking, tickets, reimbursement | Factory simulated-first package, then adapter; no direct gateway state |

This is sufficient to compose the existing 108-scenario planning taxonomy without claiming that all 108 are delivered. The critical distinction is that a scenario maps to **Factory capability seams**, not to one imported vertical application.

## Highest-value Candidate-to-Package proposals

The following proposals specify the smallest safe integration boundary. Each is
a design input to the Candidate record; none permits automatic package writing
or Golden registration.

| Candidate / class | Proposed Factory capability and exact boundary | Package scaffold inputs | Fixtures and focused tests | Evidence needed for provisional/local -> Golden |
| --- | --- | --- | --- | --- |
| OTel / direct | `observability.telemetry@0.1.0`: wrapper exposes `startSpan`, `recordMetric`, and redacted `recordException`; no caller passes exporter URL, headers, raw request body, prompt, or identity secrets. | `CapabilityManifest`, `TelemetryIntent` Graph binding, allowed attribute dictionary, sampling/redaction policy, no-op fixture exporter. | Deterministic redaction snapshots; forbidden-attribute tests; outbox trace-correlation test; generated app typecheck. | Exact npm version/integrity and Apache notice; SBOM/scans; wrapper conformance against no-op; removal test proves app works without an exporter; Golden requires immutable package digest and generated-journey evidence. |
| Uppy / direct | `content.attachment@0.1.0`: client acquires a Factory-authorised upload session and reports a completed opaque blob reference. Uppy never chooses storage ACL, content type policy, record ownership, or final attachment state. | Attachment entity/relationship bindings, accepted media policy, upload intent operation, provider-neutral blob reference schema, PageModel block. | File size/type rejection, ownership, virus-scan-pending, cancellation, and replacement fixtures; browser fixture with no real storage credentials. | MIT notice, lockfile integrity/SBOM/scans, client wrapper test, server semantic validation, storage-provider removal test, published fixture compilation and asset digest. |
| RHF + Zod + TanStack Table / direct | `experience.generated-forms@0.1.0` and `experience.operations-table@0.1.0`: render from compiled PageModel and schema. They may improve interaction only; server operation/schema validation is final. | PageModel component declarations, field-level display rules, column policy, action IDs bound to published operations, accessibility defaults. | Invalid client input still rejected by server; hidden field/action cannot be submitted; role-filtered columns; row action idempotency. | MIT notices for each package, exact versions/SBOM/scans, accessibility and generated-app Playwright fixture, version-upgrade compatibility test, component removal/replacement test. |
| BullMQ / direct | `runtime.outbox-dispatch@0.1.0`: consumes already-committed Factory outbox events and schedules bounded retry/deadline projection work. It cannot perform an unrecorded business mutation. | Event envelope version, handler allowlist, retry/dead-letter policy, correlation ID, idempotent consumer receipt, queue adapter config outside Graph. | Duplicate delivery, delayed retry, poison message, worker restart, and effect-before-ack tests; transaction rollback produces no job. | MIT notice, dependency/SAST/vulnerability evidence, local queue fixture, event-handler conformance, runtime-removal fallback, Golden live integration alongside ADR-0013 receipt/outbox evidence. |
| Socket.IO / direct, later | `realtime.delivery@0.1.0`: reads a committed, audience-scoped Factory projection event and delivers it to an already authorised subscriber. It cannot accept a domain command or compute audience membership from client-supplied room IDs. | Versioned event envelope, audited subscription subject, capability/record audience resolver, sequence cursor/reconnect policy, local fake transport. | Unauthorised subscription, cross-tenant event, duplicate/out-of-order delivery, reconnect catch-up, event before commit, and transport outage fixtures. | MIT notice, exact version/SBOM/scans, fake transport conformance, authorization review, post-commit/outbox evidence, and removal test proving polling/query path remains correct. |
| `rrule` / direct conditional | `scheduling.recurrence@0.1.0`: evaluates a stored Factory recurrence expression into candidate slots; Factory owns availability, resource constraints, conflict decision, and reservation state. | `RecurrenceRule` bounded grammar, timezone/locale policy, horizon limit, exception dates, Flow/operation bindings. | DST spring/fall, timezone conversion, exception, count/until, leap-day, horizon limit, and deterministic repeatability fixtures. | Exact licence decision (repository metadata is not SPDX-clear), version pin, maintenance-alternative assessment, RFC compatibility gap record, SBOM/scans, pure evaluator conformance and replacement test. Do not Golden-promote until this is complete. |
| Keycloak / provider | `identity.oidc-session@0.1.0`: consume verified OIDC identity/session result, map only approved claims to Factory Party/role bindings, and emit Factory audit events. | Provider-neutral `IdentitySessionProviderV1`, issuer/audience/JWKS configuration outside Graph, claim mapping policy, session revocation/expiry semantics, local fixture identity provider. | Invalid issuer/audience/signature, claim mapping, disabled membership, refresh/revocation, logout, audit redaction, and no-provider fixture tests. | Pinned image digest/API version, Apache notice/SBOM/scans, adapter contract conformance, threat model, credential boundary review, provider removal test, published recipe generated-journey evidence. |
| OpenFGA / provider | `authorization.relationship@0.1.0`: Factory compiles a named, reviewed relationship check; receives allow/deny only and records the decision context. | `RelationshipAuthorizationProviderV1`, model-version reference, tuple projection boundary, check vocabulary, stale/timeout policy, local in-memory fixture. | Allow/deny matrix, policy drift, missing tuple, provider outage fail-closed, audit, and no direct caller-supplied relation/object tests. | Pinned service image/API and Apache notice, SBOM/scans, model-to-PolicyModel mapping review, adapter conformance, load and removal tests, Golden package/lock evidence. |
| Meilisearch / provider | `search.projection@0.1.0`: Factory outbox produces redacted, versioned index documents and owns query authorization/filter policy; provider returns ranked opaque IDs/highlights. | Search document schema, field classification, projection operation, index migration/version policy, local fixture implementation. | Access-controlled search, deleted/tombstoned document, reindex, stale projection, PII exclusion, outage fallback, result-to-record authorization. | Exact release/container digest; path-level MIT vs BUSL decision and notices; SBOM/scans; projection/adapter conformance; provider deletion/rebuild test; Golden acceptance with redaction audit. |
| Gotenberg / provider | `documents.render@0.1.0`: convert a Factory-owned immutable render model to a blob. The provider cannot receive a mutable Graph, arbitrary URL, or user-defined HTML/command. | Render request schema, approved template ID/version, locale/pagination policy, attachment relation, result checksum, local fixture renderer. | Template allowlist, hostile URL/HTML rejection, deterministic template fixture, timeout, blob ACL, and provider absence. | Pinned OCI digest, MIT notice, container SBOM/scans, adapter conformance, output content/hash tests, deletion/removal test, Golden evidence. |
| TastyIgniter Cart / selective source | `commerce.line-configuration@next`: at most a re-authored/pinned pure cardinality/availability helper. Existing immutable package remains unchanged. | Exact source path/symbol/digest, licence file/digest, Factory input/output specification, copy ledger/notice destination, rationale and replacement implementation. | Cross-catalog option, minimum/maximum, unavailable option, price snapshot, and property tests; no Laravel application boot or database. | Exact pinned snapshot, manual MIT compatibility decision, per-file copyright/notice, AST side-effect proof, source-diff review, fixture/conformance/removal test. Golden only as a new immutable successor. |
| InvenTree / selective source | `commerce.inventory@next`: source study may yield fixture vectors or a compact traceability predicate, not a Django model. | Same source-study fields plus `stockMovement`/reason/lot bindings and explicit transaction owner (`commerce.transaction`). | Reserve/release/consume/adjust, negative stock, trace/lot, competing expected version, rollback/outbox/receipt cases. | Exact path and licence evidence, no model/migration/runtime import, Factory-owned CAS/outbox proof, source attribution, conformance/removal test, live PostgreSQL Golden journey. |
| Eventyay Tickets / selective source | `capacity.admission@0.1.0`: pure capacity hold expiry/check-in rule only. | Exact module and licence scope; Capacity, Hold, Ticket, CheckIn Graph symbols; hold TTL and idempotency bindings. | Competing holds, expiry takeover, check-in replay, cancellation/refund separation, capacity boundary, offline scan rejection. | Exact licence determination, AST/side-effect proof, no payment/task/schema import, source ledger/notices, conformance/removal, Golden live concurrency evidence. |
| Stripe / provider, later | `payments.provider@0.1.0`: translate a completed Factory `payment-attempt` intent to one provider attempt/reference. Provider webhooks enter a verified adapter and create a Factory command; they never mutate order state directly. | `PaymentProviderV1`, simulated fixture provider, provider reference schema, webhook signature verifier, reconciliation command, refund/split settlement explicitly deferred. | Simulated-first success/failure/pending/refund-request fixtures; duplicate/late webhook; mismatched amount/currency; receipt/outbox idempotency; no network in normal tests. | Security and financial/regulatory review; fixed SDK/API version/notice/SBOM/scans; isolated provider sandbox evidence; webhook threat model and conformance; provider removal test; Golden only after simulated package and transaction kernel are accepted. |

## Explicitly rejected integration shapes

### Observed facts

- Appwrite is intentionally broad (auth, database, functions, storage,
  messaging, realtime, hosting); Medusa, Saleor, Strapi, Cal.com, n8n, ERPNext,
  Vendure, and similar products each carry a complete application/runtime data
  model.
- Meilisearch and Novu have licence scopes that cannot safely be collapsed into
  a single repository-wide permissive assumption.
- n8n's public licence is source-available Sustainable Use; ERPNext's is GPL.

### Rejections and their reason

| Rejected shape | Decision |
| --- | --- |
| Import a vertical application's package, database migrations, admin UI, or generated API | Reject. It would import another application schema/lifecycle and turn that repository into de facto Graph authority. |
| Run a third-party workflow engine with arbitrary workflow code generated from Draft state | Reject. Factory must compile only from a Published Graph and retain the transaction/receipt/audit boundary. |
| Let a search, auth, payment, notification, or BaaS provider hold canonical business state | Reject. Adapters are effect/projection boundaries with opaque provider metadata only. |
| Treat one root `LICENSE` as coverage for all subtrees | Reject. Require exact snapshot, module/path licence and notice verification; mixed/open-core repositories remain scoped or excluded. |
| Copy a whole permissively licensed repository | Reject. Permissive terms alone do not solve transitive licences, upgrades, migrations, operational assumptions, embedded credentials, or loss of Factory ownership. |
| Copy reciprocal/source-available code or product assets under default policy | Reject. Reference vocabulary/tests only until an explicit governance decision changes the policy. |

## Promotion evidence: Candidate, provisional/local, and Golden

The current intake implementation correctly keeps a Candidate non-promoting.
The following policy gives the automation a concrete completion definition.

| Stage | Required evidence | Prohibited result |
| --- | --- | --- |
| Portfolio record | Canonical repository URL, exact tag/SHA resolved to a SHA, licence evidence URL, proposed seam and one of the three classifications. | No source checkout becomes a package or a Graph input. |
| Quarantined Candidate | Immutable snapshot/acquisition/evidence digests; a single safe selected module; parsed inventory; licence/notice/SBOM/secret/SAST/vulnerability outputs. | No source content, URL, credential, prompt/response, provider configuration, capability selection, compilation, or Golden registration in the Candidate artifact. |
| Provisional/local package or adapter | Factory-authored manifest, schema/bindings, fixture provider or local implementation, conformance plan, failure tests, replacement/removal test, and a source-study/copy ledger if source is ported. | No production provider activation; no mutable Draft consumption; no capability lock mutation in place. |
| Golden successor | Independent architecture, security/licence, and QA review; all evidence binds to the exact Candidate/source/package digests; semantic/compiler/generated-journey tests pass; published immutable package/version/digest and notices are recorded. Provider integrations additionally pass pinned-image/API and fixture-provider conformance; transaction capabilities additionally meet ADR-0013 live PostgreSQL evidence. | No “Golden by scan”, automatic source copy, automatic external account provisioning, or unreviewed promotion. |

For every source port, require the current intake evidence **plus**: exact file
paths/symbols and line rationale, a manual compatibility decision, attribution
and notice placement, a copy ledger, static side-effect record, Factory-owned
specification, and a deletion/replacement test. A failing removal test means
the port is coupled too tightly to be Golden.

## Prioritized four-wave portfolio

| Wave | Candidates | Why now | Exit criterion |
| --- | --- | --- | --- |
| **1 — horizontal technical foundation** | OTel, RHF/Zod, TanStack Table, Uppy, ZXing, BullMQ; Factory `payments.simulated` stays native | These unblock safe UI, files, operational views, telemetry, barcode use, and outbox delivery across commerce, approvals, CRM, content, and inventory without external authority. | Each wrapper has exact locked dependency/notice/SBOM/scans, no-op/local fixture, generated-app test, and removal test. BullMQ is only after the shared transaction/outbox kernel meets ADR-0013. |
| **2 — native cross-scenario capability packages** | Factory `scheduling.recurrence`, `availability/reservation/capacity`, `content.article/attachment`, `search.projection` contract, `reporting.projection`; conditional `rrule`; source studies for TastyIgniter Cart/InvenTree/Eventyay | These compose booking, restaurant, appointment, ticketing, content, inventory, and reporting scenarios before services are activated. | Published, Factory-owned packages bind only Graph symbols; schedule/hold/inventory tests prove deterministic and concurrent behaviour; any port has exact-file licence and removal evidence. |
| **3 — governed provider adapters and realtime delivery** | Keycloak, OpenFGA, Gotenberg, Meilisearch; Socket.IO; Novu only after path licence review | Identity, authorization, docs, search, delivery, and post-commit realtime introduce mature integrations while their intent remains native. | Contract plus fixture provider first; then pinned service/API, security/licence review, redaction and outage conformance, deletion/removal test, and one accepted generated journey. |
| **4 — high-risk/long-running and real-money lanes** | Temporal constrained executor, Stripe adapter, production realtime/notification providers, optional CRM/commerce comparison adapters | These require higher operational, financial, or semantic risk and should follow the native durable-command and policy foundations. | Separate ADR/threat model; explicit non-goals for settlement/refunds/realtime conflict; sandbox/live isolated evidence; no capability is Golden solely from a provider demonstration. |

## Candidate-to-Package automation recommendations

1. **Keep discovery metadata-only.** Extend the external portfolio only with
   canonical repository URL, release tag and resolved SHA, licence URL, source
   class, capability seams, and an optional public release date. Do not store
   upstream source text, releases archives, credentials, prompts, or provider
   configuration in the public portfolio summary.
2. **Resolve tags once, then pin SHA.** An intake job should resolve a tag to a
   commit and record both values and retrieval time. A mutable tag must never
   be reused as the stable identity.
3. **Make the module selection declarative and singular.** Preserve the
   existing `CandidatePortPlanV1` requirement for one path/symbol/digest. Add a
   policy check that direct dependencies select package metadata; adapters
   select a client/API contract; source ports select one source file/symbol.
4. **Derive a non-promoting scaffold request, not code.** From a
   conformance-passed Candidate, generate a source-free task containing target
   capability key, reuse mode, Graph input/output/effect sketches, required
   notices, fixture matrix, conformance cases, removal test, and owners. A
   human-reviewed Factory change still authors the package.
5. **Automate the common evidence ledger.** For each fixed snapshot create
   machine-verifiable records for licence paths/expressions, notices, SBOM,
   dependency/security/secret/SAST scans, module static side-effect flags,
   release metadata, and expiry/re-review date. Unknown/mixed/custom terms
   fail closed into reference-only.
6. **Compile fixture providers before real providers.** Candidate automation
   should require `ProviderContractV1` plus deterministic local fixture
   conformance before it can request a pinned container/API study. This makes
   outage, timeout, removal, and deterministic compiler tests possible with no
   external account.
7. **Link Golden packets to immutable evidence.** The promotion packet should
   bind Candidate, source snapshot, evidence, manifest, conformance, package
   digest, notices, Published Graph compilation, and generated-journey digest.
   Any mismatch or upgrade creates a new Candidate/version.
8. **Use risk routing, not popularity, for queue order.** Send repositories
   with reciprocal/source-available/mixed licences, network/filesystem/process
   access, runtime/schema/migration ownership, or money/identity/data risk to
   policy-only review. Stars and release recency are tie-breakers, not approval
   evidence.

## Source register

All external sources below are public official documentation or repositories,
accessed 2026-08-01. The candidate table links directly to the relevant
repository and licence where available. Key maintenance signals were checked
from the official GitHub releases/API pages, including:

- [OpenTelemetry JS releases](https://github.com/open-telemetry/opentelemetry-js/releases),
  [Keycloak releases](https://github.com/keycloak/keycloak/releases),
  [OpenFGA releases](https://github.com/openfga/openfga/releases), and
  [Meilisearch releases](https://github.com/meilisearch/meilisearch/releases).
- [Temporal releases](https://github.com/temporalio/temporal/releases),
  [Appwrite releases](https://github.com/appwrite/appwrite/releases),
  [Gotenberg releases](https://github.com/gotenberg/gotenberg/releases), and
  [Medusa releases](https://github.com/medusajs/medusa/releases).
- [BullMQ releases](https://github.com/taskforcesh/bullmq/releases),
  [Uppy releases](https://github.com/transloadit/uppy/releases),
  [Tiptap releases](https://github.com/ueberdosis/tiptap/releases),
  [Socket.IO releases](https://github.com/socketio/socket.io/releases), and
  [Stripe Node releases](https://github.com/stripe/stripe-node/releases).

## Risks and open checks

- **Licence precision:** mixed/open-core repositories (notably Meilisearch and
  Novu) require path-level evidence; historical/repository metadata can differ
  from a release's actual tree. No copy or deployment decision follows from
  this memo.
- **Provider authority creep:** identity, authorization, search, notification,
  workflow, payment, and BaaS products are attractive because they are broad.
  Their breadth is the reason Factory must use a small versioned adapter and
  fixture provider first.
- **Scheduling correctness:** recurrence libraries need explicit timezone/DST,
  horizon, and RFC-compatibility tests. The `rrule` maintenance signal is
  weaker than the other Wave 1 candidates.
- **Transaction integrity:** inventory, capacity, payment webhook, and job
  dispatch adoption is blocked until the shared command/lease/CAS/outbox path
  is proven according to ADR-0013.
- **Scenario inflation:** mapping an OSS source to a planning scenario is not
  acceptance evidence. Package ownership, Published Graph compilation, and
  generated-application journeys remain the unit of delivered capability.
