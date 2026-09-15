---
title: "ADR-0055: Generated Approval Record Finding"
status: "Proposed"
date: "2026-09-11"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "generated-ui", "approvals"]
supersedes: ""
superseded_by: ""
---

# ADR-0055: Generated Approval Record Finding

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **keep** the current accepted Golden technology profile and
compose the already approved first-party input, select, button, state, and
approval-card behavior inside the existing generated `approval-v1` record
renderer. Do not admit TanStack Table or another package for this bounded card
list interaction.

This proposal is not accepted. It grants no implementation, Product Publish,
Compilation, Preview, provider/model call, runtime, Git action, external
resource, cloud action, deployment, or release. A qualified read-only reviewer
must return the standing verdict required by `docs/tech-governance.md`; PM must
record the exact accepted hash, verdict, frozen ownership, and contract before
production files change. Root separately owns any later local runtime
authorization.

## Context

- **CTX-001 — User outcome**: Generated Expense and Purchase applications
  currently show readable responsive approval cards and preserve role and
  workflow actions, but every authorized record is displayed at once. An
  ordinary requester or reviewer cannot quickly find a known record or narrow
  work to one workflow state.
- **CTX-002 — Reuse search**: The approved `@factory/ui-primitives@0.1.0`
  registry already contains native `input`, `select`, and `button` primitives.
  The approved `@factory/ui-patterns@0.1.0` registry already contains loading,
  empty, error, confirmation, and denial states. The existing compiler
  `approval-v1` runtime already composes those semantics with responsive rich
  cards, status badges, safe action feedback, and the accepted local Lucide
  allowlist. These are the smallest materials that satisfy this slice.
- **CTX-003 — Documented registry gap**: The existing `data-table` pattern is a
  copyable static HTML table renderer with `columns` and `rows`; it has no
  client state, Graph binding, authorization binding, workflow-state source,
  filtering, mutation refresh, or card presentation. Existing generated UI
  table assets and screen recipes are Restaurant-specific. Reusing either as a
  dynamic approval finder would violate their contracts. No new public UI
  registry item is needed because this proposal composes existing approved
  materials within the existing private generated-template family; therefore
  it adds no asset and no new registry key.
- **CTX-004 — Supply research**: The pinned desk study identifies TanStack
  Table 9.2.4 as a future candidate for materially richer list and task
  workspaces. Search plus one status filter over an existing card list does not
  need its table model, dependency, adapter, notice, bundle cost, or React/Next
  compatibility experiment. This decision does not accept or reject TanStack
  Table for a future sorting, pagination, column, virtualization, or task
  workspace requirement.
- **CTX-005 — Authority boundary**: Filtering is a browser presentation over
  records already authorized and returned by the existing server API. It does
  not claim server search, pagination, ownership privacy, authenticated
  identity, tenant isolation, or broader approval capability. Server policy and
  state transitions remain authoritative.

## Current accepted Golden technology profile

The current accepted profile remains the repository profile and immutable
Draft -> Publish -> Compilation lifecycle in `docs/tech-governance.md`. The
following exact facts are copied from its authoritative manifest/lock/image
table; ranges are supported manifest values, resolutions are exact lockfile
values, and image tags are floating major constraints rather than patch pins.

| Coordinate                     | Supported / tracked value                | Exact resolution                   |
| ------------------------------ | ---------------------------------------- | ---------------------------------- |
| Node.js                        | `>=22.11.0 <23`; Docker `node:22-alpine` | floating major image               |
| pnpm                           | `pnpm@9.0.0`                             | `9.0.0` root declaration           |
| TypeScript                     | `^5.7.2`                                 | `5.9.3`                            |
| Next.js                        | `^15.1.0`                                | `15.5.22`                          |
| React / React DOM              | `^19.0.0` / `^19.0.0`                    | `19.2.8` / `19.2.8`                |
| Puck / XYFlow                  | `^0.22.3` / `^12.3.6`                    | `0.22.3` / `12.11.2`               |
| NestJS common/core/platform    | `^10.4.15`                               | `10.4.22` each                     |
| Prisma client / CLI            | `^6.1.0`                                 | `6.19.3` each                      |
| BullMQ control plane / worker  | `^5.34.10`                               | `5.81.2` each                      |
| ioredis compiler worker        | `^5.4.2`                                 | `5.11.1`                           |
| PostgreSQL / Redis             | `postgres:16-alpine` / `redis:7-alpine`  | floating major images              |
| compiler Casbin / XState / Zod | `^5.37.0` / `^5.19.2` / `^3.24.1`        | `5.51.1` / `5.32.5` / `3.25.76`    |
| compiler Lucide source         | `lucide-static` `0.468.0`                | `0.468.0`                          |
| implemented Graph              | `factory.application-graph/v1`           | versioned serialization identifier |

- **CUR-001**: The current generated target is the private
  `@factory/compiler@0.1.0` Next.js/React template. Its structural approval
  selector emits existing `approval-v1`; `EntityRecords` fetches the entire
  authorized entity collection through the existing API, renders all returned
  records, refreshes after server-authoritative transitions, and distinguishes
  loading, safe service error, empty data, pending action, success/error action,
  and read denial.
- **CUR-002**: Runtime entity fields are derived from the immutable Published
  Graph. Runtime flow data currently carries transitions; the Graph itself owns
  the ordered flow states. Existing public Graph, generated-page-runtime API,
  REST, policy, persistence, queue, artifact, and lifecycle contracts remain
  authoritative.

## Proposed profile and frozen private contract

The proposed profile is distinct from the accepted profile until the founder
gate is satisfied. It keeps every current runtime, framework, package, exact
resolution, manifest, lockfile, image, public identifier, Graph/API/data
contract, compiler target, presentation-family identifier, provider boundary,
and service topology unchanged. It changes only future `approval-v1` generated
page-runtime source and its styles.

- **FND-001 — Scope predicate**: Emit the record finder only when
  `presentationProfileFor(graph)` returns existing `approval-v1`. Expense and
  Purchase therefore consume one implementation through their structural
  approval flow. Preserve byte-identical legacy/non-approval and Restaurant
  page-runtime and CSS output. Do not branch on definition keys, entity names,
  labels, role names, model text, or record values.
- **FND-002 — Existing-material composition**: Use a labelled native text input
  named **Search records**, a labelled native select named **Status filter**,
  an **All statuses** option, and a native **Clear filters** button. Continue to
  render the existing rich approval cards, Lucide icons, details disclosure,
  action buttons, loading/empty/error/denial semantics, and responsive design.
  No source is copied, no package is imported, and no asset allowlist or public
  registry is changed.
- **FND-003 — Search contract**: Search only values addressed by the selected
  entity's declared runtime field keys. Do not search `JSON.stringify(record)`,
  undeclared response properties, hidden metadata, role/session data, another
  entity, or arbitrary object keys. Convert scalar field values to strings,
  trim the query, use deterministic case-insensitive matching, and require at
  least one declared value to contain the normalized query. An empty normalized
  query matches every authorized record. Do not issue a request while typing.
- **FND-004 — Status contract**: Add ordered `states` from the matching
  immutable Graph flow to the private serialized runtime definition for
  `approval-v1` only. The select options are exactly the first matching flow's
  declared ordered unique states; an absent or ambiguous flow yields only
  **All statuses**. Status equality is exact after converting the record value
  to a string. Do not infer options from currently returned rows, humanized
  text, action names, or model output.
- **FND-005 — Combined result**: Search and status predicates are conjunctive.
  Render cards from the derived visible-record array while retaining the
  unmodified authorized source array. Display a polite textual result count in
  the form **`{visible} of {total} records`** after the current fetch settles.
  Filtering never mutates, reorders, paginates, or persists records.
- **FND-006 — Empty and recovery**: When the authorized source array is empty,
  preserve the existing business-specific **No {entity} records yet** state and
  create link. When source records exist but the visible array is empty, render
  a distinct **No matching records.** status and keep the controls and one clear
  action available. Clearing sets query to empty and status to **All statuses**
  in one action and restores every authorized source record.
- **FND-007 — State lifetime and accessibility**: Keep finder controls visible
  during loading and recoverable service error. Reset both filters when the
  entity, page block, or selected demo role changes; preserve input focus and
  cursor during ordinary typing and refresh. Labels must have explicit control
  associations. The result count, no-match state, and list-level mutation
  outcome use appropriate polite live status semantics. At 390 px, every
  interactive control remains at least 44 by 44 CSS pixels with no horizontal
  overflow; tablet and desktop may lay controls out horizontally.
- **FND-008 — Mutations under filters**: Existing `can`, `validTransitions`,
  pending de-duplication, encoded API path, safe error mapping, and server
  refresh remain unchanged. A transition operates on the actual visible record
  object. If refresh moves that record out of the active status filter, retain
  the success or safe error as a list-level message instead of leaving feedback
  only inside the removed card. Derived results recompute from the refreshed
  authorized array so a stale card cannot be acted on.
- **FND-009 — No hidden authority**: Query, status, and result count are local
  presentation state. They are never sent as authorization, API, Graph,
  persistence, audit, or workflow inputs. Switching roles triggers the existing
  role-bound fetch and clears the former view. The browser cannot use filtering
  to obtain a record that the server did not return.

## API, data, adapter, catalog, license, security, and operability effects

- **API-001**: No public request/response field, route, status code, error
  mapping, authentication header, audit event, Graph field, schema,
  serialization identifier, database model, queue payload, hash, or lifecycle
  rule changes. Historic Drafts, Published Graphs, Compilations, and previews
  remain immutable and valid. Future `approval-v1` source bytes change only
  after a new Compilation of a Published Graph.
- **DAT-001**: The added `states` value is private generated-source data copied
  from the already published Graph into the future runtime bundle. It is not a
  new public persisted contract. Record source data and mutation payloads are
  unchanged; search state is ephemeral and resets as specified.
- **ADP-001**: Requirement adapters, the private definition bank, planner,
  composer, capability packages, Workbench production code, Control Plane, and
  compiler worker orchestration have zero behavior impact.
- **CAT-001**: Public capability, definition, UI primitive, UI pattern,
  generated UI, screen recipe, source-study, and compiler-target catalog counts
  remain unchanged. B2 consumes existing approved materials in a new concrete
  generated interaction; it does not count this composition as another business
  definition, runtime family, external admission, or mature application.
- **LIC-001**: Dependency, license, notice, and supply-chain impact is zero. No
  manifest, lockfile, package, copied source, SVG, font, image, Dockerfile, or
  external network input changes. Existing Lucide 0.468.0 notices and allowlist
  remain exact; the finder adds no icon.
- **SEC-001**: This keeps the threat model's untrusted-browser boundary. Only
  server-authorized returned records can enter the local predicate. Server
  tenant, role, policy, workflow, and audit checks remain decisive. No provider
  output, executable string, HTML injection, dynamic import, filesystem,
  credential, secret, Docker, deployment, or arbitrary-network channel is
  introduced.
- **SEC-002**: Tests must prove undeclared response properties cannot match and
  role changes do not retain a prior role's filtered records. Evidence uses
  synthetic values only; credentials and raw prompts/responses remain absent
  from logs, source, screenshots, and reports.
- **OPS-001**: No service, process, port, storage, retry, timeout, token budget,
  provider call, Compose edge, resource, cleanup duty, deployment, or runtime
  dependency is added. Filtering is linear in returned records times declared
  fields. Abort this client-only design if the acceptance fixture needs more
  than 200 returned records or demonstrates material input latency; pagination
  or server search then requires a separate contract decision.

## Consequences

### Positive

- **POS-001**: Expense and Purchase users gain one reusable way to find and
  process records without another model-authored screen or definition-specific
  implementation.
- **POS-002**: The smallest approved asset composition closes the immediate
  task gap with no package, license, supply-chain, API, or deployment work.
- **POS-003**: Distinct no-data and no-match states plus surviving transition
  feedback make filtered actions understandable on phone, tablet, and desktop.

### Negative

- **NEG-001**: Filtering remains client-side and linear; it is unsuitable for
  large collections and does not provide pagination, sorting, columns,
  virtualization, or server query semantics.
- **NEG-002**: The compiler's generated source emitter gains another reusable
  behavior inside a large serialized integration file. Focused source-emission
  and runtime tests are required to prevent template-string drift.
- **NEG-003**: Filter values reset on role, entity, or page change and are not
  deep-linked or persisted. This is intentional for the local-demo security
  boundary but may not match a future authenticated workspace.

## Alternatives considered

### Admit TanStack Table 9.2.4 now

- **ALT-001 — Description**: Add the researched headless table engine behind an
  Archeform adapter and use its filtering model for approval cards.
- **ALT-002 — Rejection reason**: The bounded requirement has no table, sorting,
  pagination, column, grouping, selection, or virtualization contract. A new
  dependency, compatibility experiment, license notice, bundle impact, and
  adapter would add work without improving the accepted user outcome.

### Extend the existing static `data-table` pattern

- **ALT-003 — Description**: Add React state, Graph and policy bindings, card
  output, and mutation refresh to the current copyable static HTML table.
- **ALT-004 — Rejection reason**: That would replace the pattern's existing
  static `columns`/`rows` contract and conflate a table asset with the accepted
  approval-card runtime. It would require a public registry contract decision
  and broader regression without another current consumer.

### Add a new public record-finder registry asset

- **ALT-005 — Description**: Register and version a new generated UI block with
  field, flow, policy, state, and action ports.
- **ALT-006 — Rejection reason**: The current compiler runtime already owns all
  of those bound values, while the external generated UI registry is not used
  by this generic page-runtime path. A nominal unconsumed registry entry would
  inflate supply counts. A future Task family may justify extracting and
  admitting a public asset after a second runtime path proves the port contract.

### Server-side search and status query

- **ALT-007 — Description**: Add query parameters, pagination, indexes, and an
  authorization-aware API response contract.
- **ALT-008 — Rejection reason**: It changes API/data/operability contracts and
  requires realistic scale and tenant semantics. The bounded local acceptance
  set does not justify it.

### Definition-specific Expense and Purchase controls

- **ALT-009 — Description**: Emit separate field lists and filters by canonical
  definition key.
- **ALT-010 — Rejection reason**: It duplicates behavior, makes future family
  expansion slower, and lets private selection identity leak into a structural
  generated runtime that already has declared fields and flow states.

## Migration, rollback, abort conditions, and ownership

- **MIG-001 — Serialized product paths**: After recorded standing acceptance,
  one compiler integration writer owns exactly
  `packages/compiler/src/index.ts` and
  `packages/compiler/test/composition-page-runtime.test.ts`. Start with focused
  failing helper, emitted-source, Expense/Purchase reuse, legacy-byte, state,
  accessibility-copy, and filtered-mutation-feedback tests. No other product
  path is authorized by this ADR.
- **MIG-002 — Root evidence paths**: Root owns
  `e2e/consumer-purchase-request.spec.ts`, a distinct
  `docs/acceptance/evidence/consumer-record-finding/` directory, this ADR's
  plan/ledger/status/acceptance records, and any ignored local acceptance
  harness files. Root extends the existing Purchase lane; it does not create a
  duplicate delivery path. Root may prepare disjoint test expectations after
  the frozen contract is recorded, but actual generated-template integration
  and end-to-end smoke execution remain serialized after compiler source freeze.
- **CON-001 — Contract owner and freeze**: Root/PM is the contract owner. The
  exact UI names, matching/reset rules, state-option source, visible-count text,
  no-match copy, transition-feedback survival, authorization semantics, and
  responsive targets in **FND-001** through **FND-009** form the frozen private
  `approval-v1` acceptance contract. No versioned public API/data artifact is
  needed because public contracts do not change. It is frozen enough for the
  compiler writer and root's disjoint E2E preparation, but not for two product
  writers; generated template source, shared compiler tests, actual Compilation,
  and end-to-end smoke remain serialized integration work.
- **MIG-003**: Existing Published Graphs and Compilations receive no migration.
  Newly compiled structural approval applications gain the interaction. Prove
  both canonical Expense and Purchase produce it from the same structural
  branch and retain exact business fields, actions, and state enforcement.
- **ROL-001**: Revert the two compiler-path changes and root-owned B2 evidence
  additions. Recompile only later synthetic acceptance applications if needed;
  do not mutate or delete historic immutable Compilations. No data rollback,
  dependency removal, or irreversible step exists.
- **ABT-001**: Abort on any public Graph/API/schema/identifier change; manifest,
  lockfile, asset, notice, adapter, Workbench production, Control Plane, worker,
  database, queue, Compose, provider, or deployment change; definition-key
  branch; non-approval/Restaurant emitted-byte drift; undeclared-field match;
  status options inferred from rows; server authorization weakening; retained
  former-role data; stale actionable card after refresh; hidden mutation result;
  indistinguishable no-data/no-match state; accessibility regression; or more
  than 200 records needed for the accepted fixture. Return expanded scope to
  Tech Lead and PM.

## Measurable verification plan

- **VER-001 — Focused compiler behavior**: Run
  `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts`.
  Prove trimmed case-insensitive matching across scalar values of declared
  fields, no match from an undeclared property, combined exact status filtering,
  stable declared state options, one-action clear, distinct empty/no-match
  output, reset on role/entity/block change, list-level mutation feedback, and
  the same emitted helper/component contract for Expense and Purchase.
- **VER-002 — Preservation**: In the focused suite, bind frozen baseline hashes
  or exact expected source for Restaurant and representative legacy graphs and
  prove their generated page-runtime and CSS bytes do not change. Prove Expense
  and Purchase keep existing field values, rich summaries, Details, valid
  actions, pending de-duplication, safe errors, requester denial, and terminal
  transition denial.
- **VER-003 — Generated build quality**: Run
  `pnpm --filter @factory/compiler typecheck`,
  `pnpm --filter @factory/compiler build`, and
  `pnpm --filter @factory/compiler lint`. Compile at least one Expense and one
  Purchase generated bundle and run their existing generated TypeScript/build
  verification path.
- **VER-004 — Actual consumer lane**: Extend and run the existing provider-free
  `e2e/consumer-purchase-request.spec.ts` isolated lane. From an actual Published
  Graph and immutable Compilation, create and submit two synthetic requests;
  find by mixed-case/trimmed search; combine with submitted status; approve or
  reject a visible row; prove it disappears from the active submitted filter
  while the list-level success remains; clear once; reload and confirm exact
  persisted values; retain requester 403 and invalid terminal-transition 403.
- **VER-005 — States and visual acceptance**: Prove populated, loading, safe
  503, recovery, source-empty, no-match, clear/reset, pending action, success,
  error, and read-denial behavior. Inspect actual search/result and no-match
  screenshots at 390 px plus populated output at 768 and 1440 px. Verify labels,
  keyboard operation, focus while typing, 44 px phone targets, long labels,
  no horizontal overflow, and zero applicable axe violations.
- **VER-006 — Effort and cleanup**: Record prepared local time to usable app
  under five minutes; zero questions, technical handoffs, and in-run rescue;
  known-record find in at most two input changes and clear in one action. These
  are deterministic targets, not real-user or real-model claims. Stop exact
  Preview/Factory resources and verify zero exact-label containers, networks,
  and volumes.
- **VER-007 — Evidence and review**: Root records commands, exit codes, source
  hashes, exact Compilation/Preview identity, state/business observations,
  screenshot hashes and inspection, limitations, cleanup, and one independent
  implementation/evidence review in
  `docs/acceptance/reusable-record-finding.md` and the active ledger
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`. Review
  requires P0/P1/P2 `0/0/0` before local acceptance. No main integration,
  repository release, Product Publish beyond the isolated acceptance fixture,
  external provider call, cloud action, deployment, or mature-product claim is
  authorized.

## References

- **REF-001**: `docs/tech-governance.md` and `docs/threat-model.md`.
- **REF-002**: ADR-0043, ADR-0049, ADR-0053, and accepted ADR-0054.
- **REF-003**: `docs/superpowers/plans/2026-09-11-reusable-record-finding.md`.
- **REF-004**: `docs/superpowers/plans/2026-09-10-reusable-definition-bank.md`.
- **REF-005**: `docs/research/2026-09-10-reusable-assembly-supply.md`.
- **REF-006**: `docs/acceptance/consumer-product-checklist.md`.
