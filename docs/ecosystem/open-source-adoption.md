# Open-source adoption register

## Purpose

This register turns the Application Graph ecosystem decision into an executable
adoption policy. Factory Pilot can use mature open-source software, reuse
legally compatible code after a focused source study, and integrate providers
through contracts. It does not vendor whole products or delegate ownership of
business semantics to third parties.

`ApplicationGraphV1` remains the only product source of truth. Every library,
provider, snapshot, or copied fragment must map to a bounded Graph input or
output and must pass the intake gates below.

## Adoption classes

| Class                 | What may enter the repository                                                                                  | What must not happen                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Direct dependency** | A pinned package dependency, a Factory adapter, tests, and its notice.                                         | Library data becomes a stored Graph or bypasses Draft -> Publish -> Compilation.      |
| **Provider contract** | A versioned TypeScript contract, fixture provider, conformance tests, and optional provider adapter.           | A provider SDK/service becomes required for v1 or defines Factory business semantics. |
| **Source study**      | An immutable upstream commit record and, only after approval, the identified compatible fragment with notices. | Entire repositories, unreviewed examples, or excluded licence areas are copied.       |
| **Reference only**    | Design notes and independently written Factory code.                                                           | Source, generated output, packages, assets, or runtime are copied or embedded.        |

## Approved ecosystem map

| Project                                                           | Class                              | Factory role                                                                               | First delivery slice                           | Source rule                                                                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)                        | Direct dependency                  | Page Studio canvas. Factory maps `PageModel` to a Puck document and back.                  | Current Graph Studio                           | Pin `@puckeditor/core`; retain its MIT notice. Do not persist Puck data as the Graph.                                                                |
| [React Flow / xyflow](https://github.com/xyflow/xyflow)           | Direct dependency                  | Flow, relation, lineage, and dependency canvases.                                          | Current Graph Studio                           | Pin `@xyflow/react`; adapters accept only declared FlowModel nodes, events, guards, and effects.                                                     |
| [XState](https://github.com/statelyai/xstate)                     | Direct dependency                  | Compiler target for declared state machines and generated flow handlers.                   | Compiler core                                  | Pin `xstate`; compile FlowModel only, never arbitrary actions or executable code from an editor.                                                     |
| [Prisma](https://github.com/prisma/prisma)                        | Direct dependency                  | DomainModel to PostgreSQL schema, migrations, seed data, and typed access.                 | Compiler core                                  | Pin Prisma packages; generate project-local schema and migrations from Published Graphs only.                                                        |
| [node-casbin](https://github.com/apache/casbin-node-casbin)       | Direct dependency                  | PolicyModel to Casbin model/policy and generated NestJS guards.                            | Compiler core                                  | Pin `casbin`; compile roles/resources/actions from PolicyModel, not free-form policy files.                                                          |
| [Blockly](https://github.com/RaspberryPiFoundation/blockly)       | Provider contract                  | Optional visual Flow authoring adapter.                                                    | After Flow Studio acceptance                   | Use only when blocks serialize into a restricted Factory Flow DSL; no JavaScript/Python code generation or execution.                                |
| [bpmn-js](https://github.com/bpmn-io/bpmn-js)                     | Provider contract                  | Optional BPMN import/export and diagram adapter.                                           | After Flow Studio acceptance                   | BPMN is translated to declared FlowModel elements; unsupported constructs fail closed.                                                               |
| [GrapesJS](https://github.com/GrapesJS/grapesjs)                  | Provider contract                  | Possible non-React page/asset import adapter.                                              | Deferred                                       | It may not replace PageModel or introduce arbitrary script/style execution.                                                                          |
| [Appwrite](https://github.com/appwrite/appwrite)                  | Provider contract                  | Future backend/runtime provider.                                                           | Deferred after native Nest/Prisma output works | Factory owns the Graph mapping and provider metadata. No v1 dependency or reverse parsing of Appwrite applications.                                  |
| [OpenFGA](https://github.com/openfga/openfga)                     | Provider contract                  | Later fine-grained authorization provider.                                                 | Provider-contract milestone                    | Define contract and conformance fixtures first; the Casbin compiler remains the v1 baseline.                                                         |
| [Amplication](https://github.com/amplication/amplication)         | Source study                       | Study generator, plugin, template, and Git-sync patterns.                                  | Ecosystem study milestone                      | Never consume `ee/`. A copied fragment requires a separate immutable-commit source-study record and confirmed compatible licence.                    |
| [Medusa](https://github.com/medusajs/medusa)                      | Provider contract and source study | Later commerce provider; inspiration for bounded catalog/cart/order integrations.          | After Simple Ecommerce independent acceptance  | v1 implements Factory-owned minimal commerce capabilities. Do not make Medusa a dependency until a provider contract and conformance suite pass.     |
| [Saleor](https://github.com/saleor/saleor)                        | Provider contract and source study | Future API-first commerce-provider comparison.                                             | After native commerce Profile acceptance       | Do not make Saleor a v1 dependency. Use it only to ensure the provider contract is not Medusa-specific.                                              |
| [Vendure](https://github.com/vendurehq/vendure)                   | Reference only                     | Commerce architecture and plugin-boundary study.                                           | Read-only research                             | GPLv3 source, packages, generated output, and runtime are excluded unless Factory Pilot is intentionally relicensed GPLv3.                           |
| [Workbox](https://github.com/GoogleChrome/workbox)                | Candidate direct dependency        | Generated-Web service-worker and offline shell tooling.                                    | Restaurant offline-read slice                  | Pin an MIT-licensed published version in generated Web only. Cached menu reads and static assets are never authoritative payment or order mutations. |
| [TanStack Query](https://github.com/TanStack/query)               | Candidate direct dependency        | Generated-Web query cache and retry boundary.                                              | Restaurant offline-write slice                 | Require Factory-generated idempotency, cart revisions, and conflict tests before enabling offline mutation replay.                                   |
| [Socket.IO](https://github.com/socketio/socket.io)                | Candidate direct dependency        | Generated-runtime realtime kitchen-event adapter.                                          | Restaurant realtime kitchen slice              | Order transitions remain persisted Graph-runtime actions. Socket events are emitted after commits and cannot mutate order state.                     |
| [Centrifugo](https://github.com/centrifugal/centrifugo)           | Provider contract                  | Optional higher-scale realtime provider.                                                   | After realtime-event contract acceptance       | Implement only against a Factory-owned, transport-neutral event envelope.                                                                            |
| [qrcode.react](https://github.com/zpao/qrcode.react)              | Candidate direct dependency        | Generated-Web QR presentation.                                                             | Restaurant table-session slice                 | Render only opaque, signed, expiring Factory table-session tokens. It must not expose an authorisation credential or raw table identifier.           |
| [react-to-print](https://github.com/MatthewHerbst/react-to-print) | Candidate direct dependency        | Generated-Web browser receipt printing.                                                    | Restaurant cashier slice                       | Compile a Factory receipt projection and print CSS. Browser print status is not payment or kitchen-print completion evidence.                        |
| [QZ Tray](https://github.com/qzind/tray)                          | Provider contract                  | Later silent thermal-print provider.                                                       | Deferred                                       | LGPL source is never vendored. Use an externally installed, signed-request adapter only after security and licence review.                           |
| [Apache ECharts](https://github.com/apache/echarts)               | Candidate direct dependency        | Generated merchant dashboard charts.                                                       | Restaurant reporting slice                     | Retain Apache-2.0 and embedded third-party notices; charts consume Factory-owned aggregate read models only.                                         |
| [Open Source POS](https://github.com/opensourcepos/opensourcepos) | Reference only                     | Restaurant/POS domain-pattern research.                                                    | Read-only research                             | Its additional visible-footer condition makes its UI, code, and assets unsuitable for Factory reuse.                                                 |
| [ERPNext](https://github.com/frappe/erpnext)                      | Reference only                     | POS-domain research.                                                                       | Read-only research                             | GPL-3.0 source, packages, generated output, and runtime are excluded.                                                                                |
| [Plausible Analytics](https://github.com/Plausible/analytics)     | Reference only                     | Analytics-domain research.                                                                 | Read-only research                             | AGPL-3.0 source, packages, generated output, and runtime are excluded.                                                                               |
| [shadcn/ui](https://github.com/shadcn-ui/ui)                      | Source study                       | Candidate component primitives for the Factory Workbench and generated-app design systems. | Workbench design-system slice                  | Each selected component requires an exact version/source record, compatible notice, accessibility test, and Factory-owned wrapper.                   |

The listed Puck, React Flow, XState, node-casbin, OpenFGA, Blockly, Amplication,
Medusa, and Vendure repositories are maintained public projects whose stated
roles and licence information must be rechecked at the exact adopted release
or commit. Puck documents that it is a React/Next-compatible visual editor
that leaves data ownership with the host, which matches the Factory adapter
boundary. [Puck repository](https://github.com/puckeditor/puck) React Flow is
an MIT-licensed node-based UI library, and XState is an MIT-licensed
TypeScript state-machine solution; both fit direct, bounded use. [React Flow
repository](https://github.com/xyflow/xyflow) [XState
repository](https://github.com/statelyai/xstate) Casbin and OpenFGA publish
Apache-2.0 licences. [node-casbin repository](https://github.com/apache/casbin-node-casbin)
[OpenFGA repository](https://github.com/openfga/openfga) Blockly publishes an
Apache-2.0 licence and is therefore a candidate editor adapter rather than a
code generator. [Blockly repository](https://github.com/RaspberryPiFoundation/blockly)

## Source intake gate

Before any external code or provider is introduced, create a record at:

```text
docs/ecosystem/source-studies/<publisher>-<repository>-<commit>.md
```

The record must include all of the following:

1. Canonical repository URL, immutable commit SHA, retrieval date, and the
   licence text or authoritative licence URL at that commit.
2. Exact source paths and line ranges inspected or copied; an empty list means
   the study is reference-only.
3. The Factory interface that owns the integration, input/output schemas, and
   why a published package alone is insufficient when source copying is
   proposed.
4. A licence compatibility decision, notice obligations, security scan result,
   dependency/SBOM impact, and upstream attribution location.
5. Focused tests showing the adapter or copied fragment cannot mutate a
   Published Revision, introduce arbitrary executable effects, or leak
   credentials/AI payloads.
6. A removal or replacement path, so the external project cannot become a
   hidden platform dependency.

An intake is rejected when the commit cannot be fixed, licensing is unclear or
incompatible, a provider alters Factory-owned semantics, a source fragment is
larger than the stated purpose, or an adapter lets user-controlled code, URLs,
secrets, SQL, or provider configuration run without Graph validation.

## Ecosystem directory topology

The repository should add the following only as each intake passes its gate:

```text
ecosystem/
  sources/<publisher>/<repository>/<commit>/
  adapters/<provider>/<version>/
  contracts/<capability>/<version>/
  fixtures/<provider>/<version>/
  candidates/<package>/<digest>/
  evidence/<package>/<digest>/
docs/ecosystem/source-studies/<publisher>-<repository>-<commit>.md
docs/third-party-notices.md
```

`ecosystem/sources` is an immutable research snapshot, never an import path for
the Factory runtime. `adapters`, `contracts`, and `fixtures` are Factory-owned
code and contracts. `candidates` and `evidence` remain quarantined until their
reviewed package can become an approved capability or provider.

## Delivery order and acceptance gates

1. **Direct Graph toolchain.** Keep Puck, React Flow, XState, Prisma, and
   Casbin as pinned dependencies with adapters/compiler tests and third-party
   notices. Acceptance: Page/Flow round trips, deterministic Prisma/Casbin/
   XState output, and no external format in persisted Graph data.
2. **Native three-profile proof.** Deliver Expense Approval, Restaurant
   Ordering, and Simple Ecommerce from Factory-owned capabilities. Acceptance:
   each Published Graph independently produces a simulator, Web/API/database,
   policy, flow, tests, and docs bundle.
3. **Authoring adapters.** Evaluate Blockly, bpmn-js, and GrapesJS with
   contract-only prototypes. Acceptance: unsupported constructs fail closed;
   round trips preserve Graph semantics; no generated arbitrary code runs.
4. **Restaurant runtime adapters.** Evaluate QR presentation, browser receipts,
   realtime kitchen events, offline reads, and merchant charts as bounded
   generated-runtime capabilities. Acceptance: all adapter inputs derive from
   Published Graph data, orders stay server-authoritative, and their tests
   prove no adapter can bypass policy, audit, or the order lifecycle.
5. **Provider contracts.** Add OpenFGA, Appwrite, Centrifugo, Medusa, Saleor,
   and QZ Tray contracts with fixture providers as their respective Profiles
   need them. Acceptance: Factory can swap fixtures without a Graph change and
   no provider is required to compile native targets.
6. **Source studies.** Create the Amplication study, then a Medusa provider
   study/contract. Acceptance: exact commits and licence evidence, selected
   patterns documented, and no prohibited directories or source reaches the
   runtime.
7. **Optional runtime providers.** Activate a provider only behind a dedicated
   profile and its own acceptance suite. Vendure stays excluded unless a future
   relicensing decision explicitly changes this policy.

## Non-negotiable protections

- No whole-repository copy, Git submodule, or vendored external application in
  `apps/` or `packages/`.
- No licence, provider, or UI project may replace Factory's Graph as the source
  of truth.
- No external editor output may invoke arbitrary code, database queries,
  network calls, URLs, webhooks, or credentials.
- No source reuse happens without the source-study record, tests, and notices.
- No real-model credential, raw prompt, or raw response enters an ecosystem
  snapshot, fixture, report, runtime state, or generated artifact.

## Dated evidence update — 2026-07-30

This is a public-source classification update, not approval to install,
upgrade, or copy a project. Resolved versions are observations from the
Factory lockfile on 2026-07-30; every adoption still needs exact-version
intake, notices, and focused tests.

### Compiler and provider candidates

| Candidate                                                                                               | Classification              | Public evidence (license, version/date, maintenance)                                                                                                      | Factory decision                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Puck](https://github.com/puckeditor/puck)                                                              | Direct dependency candidate | MIT; Factory resolves `@puckeditor/core` 0.22.3. Upstream documents host-owned data and displayed v0.21.2 (2026-04-01) and 38 releases.                   | Use it as a Page canvas only. Persist PageModel, not Puck data; retain MIT notice.                                                                                   |
| [React Flow / xyflow](https://github.com/xyflow/xyflow)                                                 | Direct dependency candidate | MIT; Factory resolves `@xyflow/react` 12.11.2. Upstream documents package installation and changeset-based releases; 372 releases were displayed.         | Factory owns mapping/validation; positions, display metadata, and editor events cannot extend FlowModel semantics.                                                   |
| [XState](https://github.com/statelyai/xstate)                                                           | Direct dependency candidate | MIT; Factory resolves `xstate` 5.32.5. Upstream displayed xstate@5.31.1 (2026-05-10) and warns minor releases can affect machine behaviour.               | Pin and regression-test compiled artifacts; FlowModel cannot supply executable actions.                                                                              |
| [Prisma](https://github.com/prisma/prisma)                                                              | Direct dependency candidate | Apache-2.0; Factory resolves `prisma`/`@prisma/client` 6.19.3. The releases page shows maintained v6/v7 lines.                                            | Generate project-local schema/migrations/access only from Published DomainModel; do not reverse-import a database into Draft.                                        |
| [node-casbin](https://github.com/apache/casbin-node-casbin)                                             | Direct dependency candidate | Apache-2.0; Factory resolves `casbin` 5.51.1. Official v5.50.0 release is dated 2026-04-25.                                                               | Generate model/policy and guards from PolicyModel. Free-form Casbin configuration is an artifact, never authoring input.                                             |
| [OpenFGA](https://github.com/openfga/openfga)                                                           | Source-study/reference only | Apache-2.0; v1.15.1 is dated 2026-05-06. Docs updated 2026-07-24 say authorization models are immutable and recommend an explicit model ID in production. | Keep Casbin v1 baseline. Admit only a later `AuthorizationProviderV1` adapter with Published-Revision-to-model-ID metadata, fixture provider, and conformance tests. |
| [Amplication](https://github.com/amplication/amplication/tree/7656495d27f0dceff89657590c3f14149e45c7a6) | Source-study/reference only | Existing fixed study: commit `7656495d27f0dceff89657590c3f14149e45c7a6`, retrieved 2026-07-29; Apache-2.0 outside `ee/`, with `ee/**` excluded.           | Pattern study only: no package/source/runtime adoption and no copying without a new focused record.                                                                  |
| [Medusa](https://github.com/medusajs/medusa/tree/dde167d0be4c23ed37aa7a3d71721728e31f3e96)              | Source-study/reference only | Existing fixed MIT study: commit `dde167d0be4c23ed37aa7a3d71721728e31f3e96`, retrieved 2026-07-29. Upstream v2.15.3 is dated 2026-05-21.                  | Future Provider contract only; native Restaurant/Simple Ecommerce compilation stays independent.                                                                     |

### Profile-vocabulary and example candidates

| Candidate                                                                | Classification              | Public evidence (license, version/date, maintenance)                                                                                                           | Factory decision                                                                                                                                                       |
| ------------------------------------------------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Schema.org Restaurant / MenuItem](https://schema.org/Restaurant)        | Source-study/reference only | Schema.org v30.0 is dated 2026-03-19; its terms license schemas/examples CC BY-SA 3.0. Restaurant is reported at 100K–1M indexed domains (Google, May 2026).   | Separately authored outbound JSON-LD projection only; it cannot determine Restaurant Graph names or operations.                                                        |
| [iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)             | Source-study/reference only | IETF Standards Track, September 2009; defines transport-independent event/free-busy exchange under IETF legal provisions.                                      | Future Appointment import/export contract only; Factory owns availability, booking lifecycle, collision checks, and audit.                                             |
| [GS1 EPCIS](https://ref.gs1.org/standards/epcis/)                        | Source-study/reference only | EPCIS 2.0 ratified June 2022; official archive identifies 2.0.1 as current. It models append-only business-visibility events.                                  | Consider only for a future commerce traceability export. No schema/source enters the repository before standards-use licence review; Factory ledger remains canonical. |
| [Cal.com](https://github.com/calcom/cal.com)                             | Excluded                    | Upstream describes an AGPLv3 core and commercial `ee/` split, observed 2026-07-30.                                                                             | No appointment runtime/package/source/data adoption.                                                                                                                   |
| [pretix](https://github.com/pretix/pretix)                               | Excluded                    | The ticketing application says most code is AGPLv3 with additional terms; it reports use for thousands of events and millions of tickets. Observed 2026-07-30. | No ticketing runtime/package/source/data adoption.                                                                                                                     |
| [Open Food Facts](https://github.com/openfoodfacts/openfoodfacts-server) | Excluded                    | Server is AGPL-3.0; upstream reports v2.93.0 dated 2026-05-26. Its API-client documentation identifies the database as ODbL.                                   | No Restaurant menu/allergen fixture or data snapshot. Any enrichment requires a separate API/data-licence, locality, quality, and safety review.                       |

### Resulting acceptance conditions

- Page, Flow, Domain, and Policy compiler work remains independently
  compilable: each consumes a Published Graph projection and produces
  deterministic artifacts without persisting an external document format in
  the Graph.
- A governed provider requires a versioned Factory contract, fixture
  implementation, conformance tests, removal path, and exact dependency/source
  evidence before activation. This applies to OpenFGA and Medusa.
- Standards/examples are reference material only. Source or data copying is
  prohibited unless a new immutable source-study record approves precise paths,
  license, notices, and tests.
