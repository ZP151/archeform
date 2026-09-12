---
title: "ADR-0061: Expressive Approval Presentation and Bundled Media"
status: "Proposed"
date: "2026-09-12"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "generated-ui", "media"]
supersedes: ""
superseded_by: ""
---

# ADR-0061: Expressive Approval Presentation and Bundled Media

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** the compiler-private approval presentation from
`approval-workspace-presentation@1.2.0` to
`approval-workspace-presentation@2.0.0`, composing
`approval-presentation-components@1.0.0` and
`approval-visual-assets@1.0.0`. Keep the accepted Golden technology profile,
public registries, Graph/API/database contracts, and runtime topology unchanged.
This proposal is not accepted and authorizes no implementation, Product Publish,
Compilation, runtime, provider call, Git action, external resource, deployment,
or release. A qualified independent standing-acceptance review and PM ledger
record are required first.

## Context and verified reuse

- **CTX-001**: The founder selected a combined direction: cobalt visual hierarchy
  from the mobile task/list concept, warm photographic material from the product
  tiles, and clear approval progress from the decision concept. The delivered
  ADR-0058/ADR-0059 workspace is functional and accessible, but its repeated
  neutral rows and text-first heading do not supply those reusable presentation
  capabilities.
- **CTX-002**: ADR-0060 is accepted but has no production implementation. Its
  correction, return reason, same-record resubmission, idempotency, versioning,
  and conflict behavior remain the next separate product phase. This proposal
  emits only the currently implemented `draft`, `submitted`, `approved`, and
  `rejected` states and cannot claim Edit, Return, Revise, reason, retry receipt,
  or recovery behavior.
- **REU-001 — Registries**: The required search first inspected
  `packages/ui-primitives`, `packages/ui-patterns`, `packages/workbench-ui`, and
  `packages/generated-ui`. Reuse the existing `button`, `card`, `badge`,
  `separator`, `compact-sidebar-navigation`, `loading-state`, `empty-state`,
  `error-state`, and existing focus/live-state behavior. The generated registry's
  `menu-item-card` image port and `order-timeline` semantics prove image and
  progression concepts, but their Restaurant data bindings do not apply to an
  approval record and cannot be copied as approval authority.
- **REU-002 — Recipes and local source**: Screen, experience, and product recipes
  contain Restaurant assemblies only. Workbench timeline state describes the
  product-generation process, not a business record. Reuse the existing private
  `approval-workspace-presentation@1.2.0`,
  `approval-decision-history@1.0.0`, structural `approval-v1` selector, Graph
  tokens, record summaries, finder, safe state mapping, and the accepted seven
  Lucide icons. A new public registry asset or separate renderer would be a
  nominal duplicate because this compiler path already owns the bound approval
  entity, flow, state, and generated markup.
- **REU-003 — Studies and provenance**: Pinned source studies add no approved
  approval media/progress asset. The supply study keeps remote media intake,
  DiceBear, broad icon sets, and new record libraries outside current admission.
  The two proposed raster materials are original first-party outputs, not copied
  source. Their exact reviewed bytes, metadata, and SHA-256 digests become the
  only admitted inputs; prompts and raw provider responses never enter source,
  evidence, persistence, screenshots, or logs.

## Current accepted and proposed profiles

- **CUR-001 — Golden profile**: The accepted profile remains Node
  `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, Next
  `^15.1.0` resolved `15.5.22`, React/DOM `^19.0.0` resolved `19.2.8`, Puck
  `0.22.3`, XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, BullMQ
  `5.81.2`, ioredis `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, compiler
  Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`, `lucide-static` exactly
  `0.468.0`, Docker Compose, and implemented
  `factory.application-graph/v1`. The named manifests, lockfile, Dockerfiles,
  and floating-major image tags retain their governed meanings.
- **CUR-002 — Delivered private profile**: ADR-0058 and ADR-0059 are delivered at
  source commit `4b02872b056c41c2888b007d2d67193bee1ff433`. New structural
  approval Compilations use `approval-workspace-presentation@1.2.0`, CSS sentinel
  `--approval-workspace-version: 3`, and
  `approval-decision-history@1.0.0`. They use the resolved Graph brand as their
  accent, text-only record materials, and semantic state badges; they expose no
  record progress indicator.
- **PRO-001 — Proposed private profile**: Keep every CUR-001 coordinate. Advance
  only new structural approval output to
  `approval-workspace-presentation@2.0.0` with CSS sentinel
  `--approval-workspace-version: 4`; add private factory-authored
  `approval-presentation-components@1.0.0` and
  `approval-visual-assets@1.0.0`. Both are `UNLICENSED`, unexported outside the
  compiler, and absent from public registry/catalog counts. No package,
  lockfile, notice, Graph identifier, API route or field, database model,
  provider, service, port, queue, container, volume, or deployment target changes.
- **PRO-002 — ADR-0060 ordering**: If this profile is accepted and delivered
  before ADR-0060 source work, ADR-0060 remains a separate serialized phase and
  must preserve the delivered 2.0 presentation baseline. Its future private
  workspace composition coordinate becomes `2.1.0` rather than resurrecting
  the pre-migration `1.3.0` coordinate. This is only version-order reconciliation;
  every ADR-0060 API, data, security, correction, and recovery requirement stays
  exact and no such behavior is implemented by ADR-0061.

## Frozen private presentation and material contract

- **PAL-001 — Default cobalt recipe**: For `approval-v1` only, when the Published
  Graph has no `experience.designSystem`, use private presentation aliases with
  light brand/on-brand `#155EEF`/`#FFFFFF` and dark brand/on-brand
  `#84ADFF`/`#102A56`. The aliases drive the existing identity band, current
  navigation, primary action, focus, and selection treatments. Other colour,
  typography, spacing, radius, elevation, and motion values continue to come
  from `resolveExperienceDesignSystem`.
- **PAL-002 — Explicit Graph preservation**: When a Published Graph carries any
  explicit `experience.designSystem`, do not apply the private cobalt override;
  use its resolved light/dark brand and background pairs exactly as today.
  Selection never examines names, prompts, requirement text, runtime records, or
  model output. Tests cover absent, exact-default-explicit, and custom systems so
  a Graph design edit cannot be silently replaced.
- **MED-001 — Exact private assets**: `approval-visual-assets@1.0.0` contains
  exactly two admitted WebP assets: `approval-workspace-material`, a generic
  warm work surface usable as the approval-family hero and Purchase material;
  and `approval-expense-material`, a generic travel/receipt still life usable
  only after EXP-001 matches. Both are decorative, contain no branding, people,
  credentials, private data, or legible business values, and have exact
  `key`, `mediaType: image/webp`, width, height, decoded byte length, SHA-256,
  role, provenance `factory-authored-original`, license `UNLICENSED`, and base64
  fields. The final WebP byte digest is recorded in the module and acceptance
  evidence before source freeze.
- **MED-002 — Admission and emission**: Original PNG working files and one-time
  conversion tooling are preparation inputs, not compiler dependencies or
  generated artifacts. The compiler accepts only canonical
  `data:image/webp;base64,` encoding whose decoded bytes match the manifest,
  `RIFF....WEBP` signature, dimensions, and limits. `approval-workspace-material`
  is at most 96 KiB decoded; `approval-expense-material` is at most 64 KiB;
  emitted output includes only assets selected for that application and is at
  most 160 KiB decoded. Reject animation and EXIF, XMP, or other metadata chunks.
  Integrity failure aborts compilation without echoing bytes.
- **EXP-001 — Structural material selection**: The generic family hero is
  available to every exact existing structural `approval-v1`. Select Expense
  material only when the approval entity in the Published Application Graph has
  exactly the field signature `amount:decimal required`,
  `category:enum required` with ordered values
  `travel, meals, software, office, other`, `date:date required`, `receipt:url
optional`, `notes:text optional`, and `status:enum required` with ordered
  values `draft, submitted, approved, rejected`, with no missing, extra, or
  duplicate field. Select the generic workspace material for Purchase tiles
  only when the exact Published Graph signature is `amount:decimal required`,
  `category:enum required` with ordered values
  `equipment, software, services, supplies, other`, `neededBy:date required`,
  `item:string required`, `supplier:string optional`,
  `businessJustification:text required`, and `status:enum required` with ordered
  values `draft, submitted, approved, rejected`. Compare the validated Published
  Graph entity fields, including compiler-added workflow status, independent of
  entity/definition/application labels and field order. Do not compare the
  upstream Blueprint-only `currency`, `file`, `long-text`, or `text` vocabulary.
- **EXP-002 — Safe fallback and meaning**: A renamed business domain with an
  exact EXP-001 signature may retain its structural material. Any extra,
  missing, duplicate, type/requiredness/enum change, unknown signature, or
  ambiguous approval entity receives only the generic hero and a token-backed
  material placeholder; it receives no record tile photo. All raster images use
  empty alt text and fixed dimensions and never identify an exact item, receipt,
  supplier, trip, person, or decision. Graph text and record values remain the
  only business identity.
- **CMP-001 — Reusable composition**: `approval-presentation-components@1.0.0`
  owns small emitted hero, decorative material, and progress renderers plus their
  CSS. The workspace module composes them; `index.ts` remains projection and
  emission orchestration. Do not add a second shell, family-specific page
  template, public component, dynamic import, arbitrary HTML, runtime asset
  route, generated `public/` file, or remote URL.
- **CMP-002 — Hero and list**: On existing approval dashboard/list/queue routes,
  render one responsive family hero using the existing Graph application and
  active-page names, the generic decorative material, and current primary action
  when already authorized. Do not invent a currency, count, identity, business
  promise, or page. On matched Expense/Purchase rows, use the selected decorative
  material as a compact visual rail while retaining current record title,
  declared summary values, status badge, actions, Details, filtering, and neutral
  readable surface. Forms and Decision history retain their behavior and get the
  same spacing/colour language without redundant photos.
- **PRG-001 — Current-state progress**: For an exact current approval flow with
  states `draft, submitted, approved, rejected` and transitions
  `submit: draft -> submitted`, `approve: submitted -> approved`, and
  `reject: submitted -> rejected`, each record row may render an ordered three
  step projection: `Draft`, `Submitted`, and `Decision`. The current third label
  becomes the actual Graph state label `Approved` or `Rejected` only when that
  terminal state is present. Mark the current item with `aria-current='step'`,
  earlier reachable items complete, and later items pending. The visible status
  badge remains authoritative.
- **PRG-002 — Fail closed**: Do not render progress for an absent, duplicate, or
  structurally different flow, an unknown status, or a record without a string
  status. Do not infer chronological timestamps, actors, completion duration,
  percentage, future transition outcome, decision history, return reason, or
  ADR-0060 correction state. Progress is presentational derivation from the
  immutable generated flow plus the current server-returned status, never a new
  Graph/API/persistence fact.
- **CMP-003 — Responsive and accessible behavior**: Preserve the compact mobile
  application bar, complete navigation, icon-only familiar Refresh controls,
  44 by 44 px targets, visible focus, reduced-motion behavior, safe loading/error/
  empty/no-match states, B2 role/scope invalidation, pending locks, and ADR-0059
  late-response protection. Fixed image dimensions/aspect ratios prevent layout
  shift. A token-backed surface remains visible if the browser cannot decode an
  otherwise verified image; image failure does not hide headings, identity,
  status, actions, or recovery.

## API, data, adapter, catalog, security, and operability effects

- **API-001**: Public Graph, Blueprint, requirement, API request/response/error,
  actor, authentication, authorization, event, database, capability, adapter,
  serialization, and compatibility contracts are unchanged. Historic Drafts,
  Published Graphs, Compilations, generated files, hashes, and previews are never
  rewritten. Old Published `factory.application-graph/v1` values continue to
  compile; only a new Compilation receives the proposed presentation.
- **CAT-001**: Public UI primitive, UI pattern, generated UI, screen recipe,
  experience recipe, product recipe, capability, definition, source-study, and
  compiler-target catalogs remain unchanged. Delivered business counts remain
  three registered definitions and two demonstrated runtime families. The two
  private component/material keys count as compiler-owned presentation supply,
  not a new definition, runtime family, public catalog admission, or mature app.
- **LIC-001**: No new package or copied source is adopted. Existing
  `lucide-static@0.468.0` and notices remain exact. The original raster bytes are
  factory-authored and `UNLICENSED`; acceptance evidence records their visual
  review and digests. No third-party attribution or license notice is added.
- **SEC-001**: The browser remains untrusted and visual state grants no authority.
  Server role, record, transition, and audit checks remain decisive. Fixed base64
  literals expose no filesystem, fetch, URL, HTML, SVG script, provider,
  credential, upload, or arbitrary-network channel. The model cannot choose an
  asset, key, field signature, palette, package, path, or renderer.
- **SEC-002**: Compile-time manifest validation rejects byte tampering, malformed
  base64, wrong type/size/dimensions/hash, metadata, or unexpected keys before
  output. Evidence and failures report keys and safe digest summaries only; they
  never print raw bytes, credentials, raw prompts, or raw provider responses.
- **OPS-001**: Preview topology, routes, serving, health, cleanup, and rollback
  stay unchanged because images are part of the emitted source and require zero
  network requests or asset services. The selected data URLs add at most about
  214 KiB base64 text before ordinary source compression. There is no cache,
  retention, upload, object storage, CDN, credential, or availability dependency.

## Consequences

### Positive

- **POS-001**: Expense and Purchase share a more expressive list/home system
  without separate renderers or model-authored styling.
- **POS-002**: Fixed local media is deterministic, self-contained, license-simple,
  and immune to remote availability, tracking, URL injection, or content drift.
- **POS-003**: Users can scan each record's current approval position while the
  existing status and server behavior remain the source of truth.

### Negative

- **NEG-001**: Base64 raises generated source size and duplicates selected image
  bytes across Compilations; strict size limits and emitted-delta checks are now
  required.
- **NEG-002**: Exact structural signatures intentionally withhold specialized
  material from modified or future domains until they receive a reviewed mapping.
- **NEG-003**: Decorative photos can improve character but carry no business
  meaning. The text/status/action hierarchy must remain complete when media is
  absent or fails to decode.

## Alternatives considered

### Keep the ADR-0059 presentation

- **ALT-001 — Description**: Retain `approval-workspace-presentation@1.2.0` and
  limit the next work to ADR-0060 behavior.
- **ALT-002 — Rejection reason**: It ignores the founder-selected visual/material/
  progress direction and leaves no reusable media or current-state presentation
  capability for the existing two approval definitions.

### Add public registry assets and Graph bindings

- **ALT-003 — Description**: Add public hero, tile, progress, and media-selection
  registry entries plus new Graph fields or recipe locks.
- **ALT-004 — Rejection reason**: The current compiler already has the exact
  approved entity/flow/state projection and only one generated family consumes
  the contract. Public keys would expand stable contracts and catalog counts
  before a second renderer proves reusable ports.

### Use remote or user-supplied media

- **ALT-005 — Description**: Fetch stock imagery, call a media provider, or bind
  record URLs/uploads at runtime.
- **ALT-006 — Rejection reason**: This adds availability, license, privacy,
  credential, injection, storage, and network boundaries and makes immutable
  output nondeterministic. No such business/media contract is authorized.

### Let the model choose palette and images

- **ALT-007 — Description**: Extend requirement/provider output with visual style
  prompts, asset names, URLs, or category routing.
- **ALT-008 — Rejection reason**: The threat model forbids model selection of
  packages, paths, runtime targets, or executable material. Deterministic
  structural selection supplies the requested result without provider changes.

### Reuse Restaurant blocks directly

- **ALT-009 — Description**: Emit `menu-item-card` and `order-timeline` in the
  approval runtime.
- **ALT-010 — Rejection reason**: Their ports represent menu availability, price,
  and order timestamps, not approval record identity or flow. Direct reuse would
  fabricate semantics even though their lower-level concepts informed this
  first-party composition.

## Migration, ownership, rollback, and abort conditions

- **MIG-001 — Serialized source manifest**: After recorded acceptance, one
  compiler integration owner changes exactly new
  `packages/compiler/src/approval-visual-assets.ts`, new
  `packages/compiler/src/approval-presentation-components.ts`, existing
  `packages/compiler/src/approval-workspace-presentation.ts`, existing
  `packages/compiler/src/approval-decision-history.ts`, existing
  `packages/compiler/src/index.ts`, new
  `packages/compiler/test/approval-visual-assets.test.ts`, and existing
  `packages/compiler/test/composition-page-runtime.test.ts`. Root owns
  `packages/compiler/DESIGN.md`, `e2e/approval-presentation.ts`,
  `e2e/consumer-approval.spec.ts`, `e2e/consumer-purchase-request.spec.ts`, new
  `docs/acceptance/approval-expressive-presentation.md`, its exact evidence
  directory, ledger/status, runtime authority, review, and Git. No adapter,
  Graph, Workbench production, control-plane, worker-orchestration, database,
  Compose, or public registry path is authorized.
- **CON-001 — Contract owner and freeze**: Root/PM owns PAL-001..002,
  MED-001..002, EXP-001..002, CMP-001..003, and PRG-001..002. No frontend/backend
  API or data contract artifact changes, so no backend writer is needed. The
  private emitted contract is frozen enough for disjoint preparation of original
  asset bytes and E2E expectations, but the compiler writer serially owns asset
  admission, generated components, template composition, shared tests, and
  source freeze. Generated templates, actual Compilation, and end-to-end smoke
  remain serialized integration work.
- **MIG-002 — Compatibility sequence**: Capture byte baselines from delivered
  `4b02872b` first. Implement private asset validation, then structural selection
  and emitted components, then compose the 2.0 workspace. Recompile only future
  synthetic acceptance Graphs. Do not modify historic Graphs or artifacts. Keep
  ADR-0060 production held until this source/evidence review completes and PM
  records the next serialized owner against the new baseline.
- **ROL-001**: Before any new 2.0 Compilation is retained, revert the MIG-001
  source/test/evidence changes and restore 1.2.0/sentinel 3. After a 2.0
  Compilation exists, stop selecting 2.0 for new work and restore compiler
  support to 1.2.0 while leaving the immutable 2.0 artifact untouched. Remove
  only task-scoped local Preview resources. No data or schema rollback and no
  irreversible step exists.
- **ABT-001**: Abort on any Graph/API/database/capability/adapter/public-registry/
  package/lockfile/provider/Compose change; remote media request; raw prompt or
  response retention; unreviewed or unverified raster; incorrect specialized
  signature match; image presented as record evidence; missing text fallback;
  invented value, currency, actor, time, reason, transition, or ADR-0060 control;
  custom Graph design override; server/role/state/pending/race regression;
  non-approval or server/database byte drift; generated source over the media
  limits; overflow, contrast, focus, target-size, layout-shift, or cleanup failure.

## Measurable verification plan

- **VER-001 — Asset RED/GREEN**: Start with focused failing tests, then run
  `pnpm --filter @factory/compiler test -- approval-visual-assets.test.ts
composition-page-runtime.test.ts`. Prove exact private keys/versions/provenance,
  WebP signature/dimensions/size/hash, canonical base64 round trip, forbidden
  metadata/animation rejection, tamper failure, exact emitted selected-byte cap,
  and byte-identical output across two compilations.
- **VER-002 — Selection and truth**: Prove order-independent exact Expense and
  Purchase signature matches and negative cases for every missing, extra,
  duplicate, renamed field, changed type/requiredness/enum value, ambiguous
  approval entity, and unknown flow. Prove generic fallback has no tile photo.
  For every current status, assert exact three-step text/`aria-current`/complete
  state; assert no progress for malformed/unknown flow/state and no timestamp,
  actor, reason, currency, percentage, return, revise, or edit output.
- **VER-003 — Palette and preservation**: Prove absent designSystem resolves to
  the exact light/dark cobalt pairs, while any explicit default or custom
  designSystem retains its resolved Graph brand/background pairs. Preserve all
  ADR-0055/0058/0059 async, finder, history, action, icon, and accessibility
  contracts. Assert byte-exact Restaurant/non-approval output and exact approval
  API/database/server files against the pre-change baselines.
- **VER-004 — Package quality**: Run `pnpm --filter @factory/compiler typecheck`,
  `pnpm --filter @factory/compiler build`, and
  `pnpm --filter @factory/compiler lint`. Typecheck and build emitted Expense and
  Purchase applications. Verify generated source contains no `http:`, `https:`,
  runtime asset route, external fetch, upload input, new dependency, or unexpected
  public key attributable to this profile.
- **VER-005 — Actual generated products**: Extend the existing provider-free
  Expense and Purchase immutable Published Graph/Compilation/Preview lanes.
  Exercise create, reload, submit, approve, reject, finder/no-match, safe failure/
  recovery, role denials, and Decision history. At `390`, `768`, and `1440` px in
  light and dark, inspect home/list, form, empty, populated, pending, approved,
  rejected, history, missing-image fallback, and mobile navigation. Require zero
  axe violations, no horizontal overflow, 44 px controls, visible focus, complete
  keyboard paths, stable image geometry, two identifying summaries and the first
  permitted action within the existing `390 x 900` acceptance bound, loaded
  icons/CSS, correct default cobalt, and exact custom-token preservation.
- **VER-006 — Network, size, and cleanup**: In both actual previews, assert zero
  image/network request beyond existing application/API traffic, selected decoded
  media at or below 160 KiB, emitted base64 delta at or below 214 KiB, and no blank
  or inaccessible content when images are disabled. Retain the existing prepared
  local under-five-minute readiness target. Stop exact task-scoped Factory/Preview
  resources and prove zero matching containers, networks, and volumes.
- **VER-007 — Review and evidence**: One independent qualified nonauthor/nonwriter
  first returns the technology-governance standing-acceptance verdict for this
  exact ADR. After implementation, one combined ordinary review inspects source,
  actual reference-versus-generated images, both business journeys, custom-theme
  preservation, media hashes/size, immutable identities, and cleanup, requiring
  P0/P1/P2 `0/0/0`. Record commands, exit codes, hashes, screenshots, safe findings,
  limitations, and evidence in the active consumer-delivery ledger and
  `docs/acceptance/approval-expressive-presentation.md`. Add no per-component QA,
  release, or audit gate.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and `docs/delivery-policy.md`.
- **REF-002**: ADR-0043, ADR-0055, ADR-0056, ADR-0058, ADR-0059, and ADR-0060.
- **REF-003**: `packages/compiler/DESIGN.md`,
  `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`, and
  `docs/research/2026-09-10-reusable-assembly-supply.md`.
- **REF-004**: `docs/superpowers/plans/2026-09-12-expressive-approval.md` and
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
