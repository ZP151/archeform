---
title: "ADR-0066: Generic Approval Record Identity and Summary"
status: "Proposed"
date: "2026-09-13"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "compiler",
    "approval",
    "generated-ui",
    "product-definitions",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0066: Generic Approval Record Identity and Summary

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** only future eligible generic Approval correction
Compilations to a shared compiler-derived record identity and summary profile.
Keep the accepted Golden technology profile, the public Graph/API/data contracts,
the exact Expense and Purchase presentation paths, and ADR-0061 media admission.
The new profile selects one structurally unique required short-string business
field as the record title, shows at most two declared non-status enum fields as
compact summaries, and uses the same projection in Decision history. Long-text
content remains readable in the existing Details disclosure.

This proposal is not accepted. It authorizes no source or test change, Product
Publish, Compilation, Preview, provider call, external resource, deployment,
Git action or release. It is eligible for the founder's 2026-09-01 standing
acceptance only if a separate qualified read-only reviewer returns
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, reports P0/P1 `0/0`, finds the scope
bounded and reversible, and PM records this ADR's exact hash, reviewer and
evidence. The proposing Tech Lead cannot accept or implement this ADR.

## Context and trigger

- **CTX-001 — Observed failure**: At source base `327eb908`, the first
  Publication Review attempt parsed, compiled and passed graph-derived
  verification, but actual Preview inspection found that record cards showed
  only status. `articleTitle`, `contentBody` and `channel` were available only
  through generic Details, while Decision history fell back to the Graph entity
  label and record ID. Two records cannot be scanned or related to their
  decisions by their business identity.
- **CTX-002 — Current selector cause**: `packages/compiler/src/index.ts`
  recognizes record title only through exact `item:string` and selects summary
  fields only through the legacy `amount`, `category` and date keys.
  `packages/compiler/src/approval-decision-history.ts` independently repeats
  the `item`/legacy-summary fallback. Publication's required
  `articleTitle:string`, required `contentBody:text`, required `channel:enum`
  and optional `editorialNotes:text` match neither path.
- **CTX-003 — Technology trigger**: Fixing the defect changes the generated
  Approval template and its private presentation compatibility/operability
  contract. AGENTS.md and `docs/tech-governance.md` therefore require a proposed
  ADR before implementation. The accepted ADR-0065 data shape and fixed
  `approval-correction/v1` family remain sufficient and are not reopened.
- **CTX-004 — Media finding**: The attempt also inherited an unconditional
  assertion that every record row has a photo. ADR-0061 EXP-001/EXP-002 admits
  row media only for exact Expense and Purchase field signatures and explicitly
  gives unknown signatures a generic family hero with no record-tile photo.
  Publication's loaded hero, Graph styling, icons and progress therefore satisfy
  the accepted material policy. The row-photo failure is test-policy drift, not
  a production asset defect.
- **CTX-005 — Product boundary**: Publication Review remains one local
  author/editor/auditor decision workflow. It records return, correction,
  resubmission and approval; it does not publish, schedule, store media, grant
  real identity or make records private. Training, Equipment, Travel, Leave and
  Access remain unadmitted capability gaps.

## Current accepted and proposed profiles

- **CUR-001 — Current accepted Golden technology profile**: Node
  `>=22.11.0 <23`, root package manager `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React and React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`, Prisma
  `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved `5.81.2`, ioredis
  `^5.4.2` resolved `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, and
  Dockerfiles on floating-major `node:22-alpine`. Manifests, `pnpm-lock.yaml`,
  Dockerfiles and Compose remain executable authorities. The lifecycle remains
  mutable Draft -> immutable Published Graph -> immutable Compilation, with
  implemented serialized contract `factory.application-graph/v1`.
- **CUR-002 — Current private Approval profile**: Exact correction Graphs use
  `approval-workspace-presentation@2.1.0`,
  `approval-presentation-components@1.1.0`,
  `approval-visual-assets@1.1.0`, and
  `approval-decision-history@1.0.0`, with generated contracts
  `factory.generated.approval-correction/v1`,
  `factory.generated.approval-mutation/v1`, and
  `factory.generated.approval-decision-event/v1`. Exact Expense/Purchase
  field-key heuristics own visible identity and summary. Unknown field
  combinations retain safe status, Details and entity/ID fallback.
- **CUR-003 — Current data/family profile**: Accepted private serialization
  `factory.product-definition-data/v1` binds reviewed data to fixed
  `approval-correction/v1`; `factory.product-definition-catalogue/v1` remains
  the checked-in private envelope. Publication is a prospective fifth entry and
  is not an accepted runtime product merely because validation reports 5/5/5/5.
- **PRO-001 — Proposed generic private profile**: Keep every CUR-001 coordinate
  and CUR-003 contract. For a future exact Approval correction Graph that does
  not select the current Expense/Purchase identity path and satisfies IDN-001,
  select `approval-workspace-presentation@2.2.0` and
  `approval-decision-history@1.1.0`. Keep
  `approval-presentation-components@1.1.0` and
  `approval-visual-assets@1.1.0` unchanged. The compiler-private structural
  algorithm is identified as `approval-record-identity/v1`; it is not exported,
  persisted in the Graph, accepted from data, or exposed to the model.
- **PRO-002 — Profile separation**: The original four definition projections
  continue selecting their existing private profiles and must emit exact
  pre-change ordered bundle bytes. The new 2.2/1.1 source fragments are emitted
  only for a previously unsupported eligible generic Approval combination.
  Historic Published Graphs, locks, Compilations and hashes never change.

## Frozen generic record projection

- **IDN-001 — Eligibility**: Begin only after the existing unique structural
  `approval-correction/v1` selector has proven the exact three roles, one
  approval entity, four states, four transitions, permissions, pages, locks and
  presentation binding. Exclude compiler/system fields `id`, `status`,
  `version`, `createdAt` and `updatedAt`. Among remaining declared fields,
  exactly one field must have Graph type `string` and `required: true`. That
  field is the title. Zero or multiple candidates do not activate the generic
  profile; compilation retains the safe current fallback and the product cannot
  pass the generic presentation admission check.
- **IDN-002 — Summary fields**: From the same declared business fields, exclude
  the title and `status`; select Graph type `enum` fields in their validated
  declaration order and retain at most the first two. Render each with the
  existing humanized field label and `formatValue`. Status remains the existing
  separate authoritative badge. Do not infer priority, category, channel,
  currency, date, identity or importance from a name or value.
- **IDN-003 — Long text and remaining values**: Graph `text` values, including
  Publication `contentBody` and optional `editorialNotes`, never become compact
  card titles or summaries. Preserve them under the existing collapsed Details
  control with ID and every other non-title/non-summary declared value. Keep the
  current safe formatter; do not truncate, render HTML, infer rich text or move
  content into attributes.
- **IDN-004 — Shared list/history identity**: Derive one immutable emitted
  projection containing `titleFieldKey` and ordered `summaryFieldKeys` from the
  validated Published Graph at compile time. Both record cards and Decision
  history consume that same projection. A matched history row shows the title
  and the same populated enum summary values before its existing action, actor
  and time; remaining values stay in Details. An unmatched record retains the
  current entity-label/record-ID fallback.
- **IDN-005 — Publication result**: For Publication, the title is
  `articleTitle`, the compact enum summary is `channel`, and `contentBody` plus
  `editorialNotes` remain in Details. Two records with different article titles
  and channels must be distinguishable in both the record list and matched
  Decision history without opening Details.
- **IDN-006 — Conditional emission and compatibility**: Keep the exact current
  generated strings, ordering, source comments and CSS for Expense, Purchase,
  Restaurant and Task. The compiler may add a generic branch around fragment
  construction, but it must not unconditionally add a helper, descriptor,
  comment, serialized value or whitespace to existing outputs. The generic
  fragment may reference only the compile-time derived field keys and existing
  runtime helpers.

## Material and presentation preservation

- **MED-001 — Existing material policy**: Preserve ADR-0061 exact Expense and
  Purchase record-material signatures, asset keys, hashes, sizes, metadata,
  emission caps and failure fallback. Do not change
  `approval-visual-assets@1.1.0`, add an asset, broaden a signature, or assign a
  record image to Publication. Its existing `approval-workspace-material`
  family hero remains the intended decorative material.
- **MED-002 — Acceptance alignment**: Parameterize the shared browser assertion
  with an explicit record-media policy. Existing Expense and Purchase cases keep
  `required` as the default and continue requiring exactly one admitted image
  per row. Publication declares `optional` and proves the hero image, styling,
  icons, progress, readable text and image-disabled fallback without requiring
  a row photo. This preserves, rather than weakens, ADR-0061.
- **PRS-001 — Unchanged behavior**: Preserve forms, field labels and controls,
  search/filter, counts, status tone, progress, actions, correction, return
  reason, optimistic concurrency, idempotency, pending/error/retry behavior,
  history authorization and asynchronous role-scope invalidation. Add no route,
  navigation item, CSS layout, component library or product-specific template.
- **PRS-002 — No product key branch**: Selection cannot inspect
  `publication-review`, application/entity/field labels, provider guidance,
  prompts, raw record text or runtime values. It uses only validated Graph field
  type, requiredness, reserved-key exclusion and declaration order. A later
  definition with the same proven structural conditions receives the same
  behavior.

## Compatibility, catalog, security and operability effects

- **API-001 — API/data compatibility**: Public Graph, Requirement, Blueprint,
  interpretation, API request/response/error, actor/authentication,
  authorization, event, database, capability, queue, adapter serialization and
  compatibility contracts are unchanged. Publication continues using the
  already accepted V1 data and Approval family contracts. No frontend/backend
  request artifact changes.
- **CAT-001 — Catalog impact**: Public capability, product recipe, compiler
  target, UI primitive, UI pattern, generated UI, screen recipe, source-study
  and asset catalogues have zero additions. The two proposed private versions
  and `approval-record-identity/v1` describe compiler presentation behavior;
  they do not add a runtime family or product definition. Publication advances
  the definition count from four to five only after its actual business and
  presentation journey passes acceptance.
- **LIC-001 — License and supply chain**: No dependency, package, lockfile,
  copied source, font, icon, raster byte, notice, network download or license
  changes. Existing factory-authored `UNLICENSED` presentation and media remain
  the only sources.
- **SEC-001 — Security**: Browser content remains untrusted and grants no
  authority. Server role/state/record checks remain decisive. Field selection
  is deterministic compile-time derivation from a validated immutable Published
  Graph; provider/data/runtime values cannot select code, keys, paths, assets,
  HTML, URLs or dependencies. Existing safe formatting prevents raw HTML and
  untrusted object dumping.
- **SEC-002 — Evidence boundary**: Credentials and raw prompts/responses remain
  excluded from source, persistence, logs, screenshots and reports. Actual
  evidence uses authored fixtures and bounded safe record values. No provider,
  identity, tenant, filesystem, Docker or network trust boundary changes.
- **OPS-001 — Operability**: Compose topology, services, ports, persistence,
  queues, preview lifecycle, readiness, retry and cleanup remain unchanged. No
  extra asset bytes or requests are introduced. Generated source size changes
  only for eligible generic Approval output and remains within existing compiler
  artifact limits.

## Consequences

### Positive

- **POS-001**: New data-only Approval definitions can expose business identity
  without a per-product component, field-key branch or Graph contract change.
- **POS-002**: Lists and Decision history cannot drift because both consume one
  compiler-derived projection.
- **POS-003**: Exact conditional emission preserves the original four immutable
  compatibility fixtures while correcting Publication's actual usability gap.

### Negative

- **NEG-001**: Generic eligibility deliberately excludes definitions with no
  unique required short-string field; those products remain presentation gaps.
- **NEG-002**: Only two enum summaries are visible on a compact row. Authors
  must rely on Details for long text and remaining fields.
- **NEG-003**: The compiler now maintains two private Approval presentation
  versions and must prove conditional byte preservation on every change.

## Alternatives considered

### Keep status-only generic cards

- **ALT-001 — Description**: Accept Publication because all values are present
  under Details and history retains a record ID.
- **ALT-002 — Rejection reason**: Users cannot scan records or associate
  decisions with article identity, so the core review journey is incomplete.

### Add Publication-specific field or definition checks

- **ALT-003 — Description**: Check `publication-review`, `articleTitle` and
  `channel` directly in the compiler.
- **ALT-004 — Rejection reason**: This restores per-product UI source and makes
  catalogue growth require a handwritten compiler branch.

### Add presentation metadata to Graph or definition data

- **ALT-005 — Description**: Add title/summary flags or field lists to the
  Blueprint, Application Graph or product-definition serialization.
- **ALT-006 — Rejection reason**: It expands stable data/API contracts before a
  compiler-private structural rule has demonstrated a need for author control.

### Force generic record-row media

- **ALT-007 — Description**: Reuse `approval-workspace-material` on every
  unmatched Approval row so the inherited browser assertion passes.
- **ALT-008 — Rejection reason**: ADR-0061 explicitly withholds tile photos for
  unknown signatures, and the batch design does not require decorative record
  media. A generic photo would not solve business identity.

## Migration, ownership, rollback and abort conditions

- **OWN-001 — Contract owner**: PM assigns one serialized Compiler Presentation
  Owner for `approval-record-identity/v1` and the private 2.2/1.1 selection.
  Root owns the original-four compatibility fixture, shared browser-helper
  policy, actual runtime, evidence, ledger and Git. The accepted API/data
  contracts are frozen and unchanged; no separate frontend/backend writers are
  needed.
- **OWN-002 — Serialized integration**: One compiler owner changes only
  `packages/compiler/src/index.ts`,
  `packages/compiler/src/approval-decision-history.ts`, and, only for exact
  private descriptor/source-comment routing,
  `packages/compiler/src/approval-workspace-presentation.ts` and
  `packages/compiler/src/approval-mutation-contract.ts`, plus focused compiler
  tests. Root retains `e2e/approval-presentation.ts`, the batch spec/helper,
  immutable compatibility fixtures and evidence. Generated-template assembly,
  shared compiler tests, actual Compilation and end-to-end smoke remain
  serialized. No definition data, adapter, Graph, Workbench production,
  control-plane, worker, database, Compose or asset source path is authorized.
- **MIG-001 — Implementation order**: First capture the exact original-four
  ordered bundle results from the current worktree. Add failing compiler tests
  for Publication identity/summary/history and conditional emission. Implement
  one compile-time projection and consume it in the list and history fragments.
  Then align the test-only record-media policy with ADR-0061 and rerun the
  already successful immutable compilation/verification journey before actual
  browser acceptance.
- **MIG-002 — Existing and future artifacts**: Do not rewrite any Draft,
  Published Graph, Compilation, lock, database row or prior attempt evidence.
  Existing exact profiles remain compilable. Only a new eligible generic
  Compilation selects 2.2/1.1.
- **ROL-001 — Rollback**: Stop selecting the generic profile and revert the
  OWN-002 compiler/test paths. Future generic approvals return to the current
  safe entity/ID/status/Details fallback; existing immutable generic
  Compilations remain inspectable. Remove only the exact task-scoped local
  Preview resources. There is no data migration, dual write, external resource
  or irreversible step.
- **ABT-001 — Abort conditions**: Stop on any original-four ordered bundle
  drift; Graph/API/data/database/permission/route/error change; per-definition
  or label-based branch; ambiguous title selection; missing Publication title
  or channel in list/history; hidden or unsafe long text; raw HTML/object output;
  changed Expense/Purchase media policy; new asset/dependency/public catalogue;
  remote request; action/history/role/race regression; overflow, inaccessible
  control, missing focus, or failure to distinguish two actual records.

## Measurable verification plan

- **VER-001 — Focused RED/GREEN**: Add focused compiler tests that first fail
  for a structurally valid Publication Graph. Require the emitted list and
  Decision history to use one `approval-record-identity/v1` projection with
  title `articleTitle`, ordered summary `channel`, and long-text fields only in
  Details. Cover zero, one and multiple required-string candidates; zero, one
  and more than two non-status enums; reserved/system keys; field-order
  determinism; missing record matches; and safe non-string/object values.
- **VER-002 — Exact compatibility**: Run
  `pnpm --filter @factory/compiler test -- definition-data-compatibility.test.ts composition-page-runtime.test.ts`.
  The immutable baseline must still contain exactly the original four recorded
  keys and match every canonical, guide, instruction, selection,
  supported/clarification, Published Graph, lock and complete ordered bundle
  byte. Also prove current Expense/Purchase title, summary, history and media
  output is byte-exact and Publication output is deterministic across two
  compilations.
- **VER-003 — Package and boundary checks**: Run
  `pnpm --filter @factory/compiler typecheck`, `build`, `lint`, and the affected
  full compiler tests. Inspect the diff and emitted source for zero dependency,
  lockfile, adapter, Graph/API/database, asset-byte, remote URL, dynamic import,
  `eval`, product key, raw HTML or public export change. Typecheck the emitted
  Publication API and web applications.
- **VER-004 — Actual business evidence**: In one isolated local
  Published/Compilation/Preview lane, create two Publication records with
  different `articleTitle` and `channel`; return, correct and resubmit the same
  first record; approve it; deny an unauthorized action; recover one stale or
  interrupted action; reload; and open auditor Decision history. At 390, 768
  and 1440 px, require both title/channel pairs to be visible and distinguishable
  in the list and matched history, content body/editorial notes in Details,
  correct current status/progress/actions, no overflow, loaded CSS/icons, 44 px
  controls, visible focus and zero axe violations.
- **VER-005 — Media, security and cleanup**: Require the existing family hero
  to load from verified local WebP data, allow zero Publication row photos, and
  retain exactly one admitted row image in unchanged Expense/Purchase cases.
  Disable images and prove headings, title, channel, status, actions, progress
  and recovery remain usable. Confirm zero new image/network request, zero model
  call, no credential/raw-prompt evidence, and exact task-scoped resource
  teardown.
- **VER-006 — Acceptance evidence**: Retain attempt 1 as failed product
  evidence. A separate qualified reviewer first evaluates this exact ADR for
  standing acceptance. After implementation, one combined task review and
  proportionate QA/release review examine source identity, original-four
  compatibility, actual screenshots, business outcomes and cleanup. PM records
  the decision and evidence in
  `docs/acceptance/evidence/definition-batch-one/` and the active ledger.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: ADR-0059, ADR-0060, ADR-0061 and accepted ADR-0065.
- **REF-003**: `docs/superpowers/specs/2026-09-13-definition-batch-one-design.md`
  and `docs/superpowers/plans/2026-09-13-definition-batch-one.md`.
- **REF-004**: `packages/compiler/src/index.ts`,
  `packages/compiler/src/approval-decision-history.ts`,
  `packages/compiler/src/approval-visual-assets.ts`, and
  `packages/compiler/src/approval-presentation-components.ts`.
- **REF-005**: `docs/acceptance/evidence/definition-batch-one/` and the active
  consumer-delivery ledger.
