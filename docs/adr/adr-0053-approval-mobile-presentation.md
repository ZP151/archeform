---
title: "ADR-0053: Approval Mobile Presentation"
status: "Proposed"
date: "2026-09-10"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "compiler",
    "generated-ui",
    "mobile",
    "accessibility",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0053: Approval Mobile Presentation

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **keep** the current accepted Golden technology profile and
refine only the existing compiler-local `approval-v1` presentation for future
Compilations. Recompose the current shell, navigation, record definition lists,
native controls, and seven accepted Lucide icons. Add no runtime, dependency,
registry asset, recipe, Graph/API/data contract, security boundary, business
rule, generated route, or demo capability.

This proposal is not accepted and authorizes no implementation, model/provider
call, Product Publish, Compilation, local runtime, Git action, external
resource, cloud action, deployment, or release. A qualified independent reviewer
must return the standing-acceptance verdict required by
`docs/tech-governance.md`; PM must record that result and assign the bounded
implementation before any production write. Root separately owns and scopes
local deterministic runtime acceptance.

## Context

- **CTX-001**: Accepted ADR-0049 made the generic approval journey functional:
  typed creation, safe errors, record-state-valid actions, labelled values,
  semantic status, and the accepted seven-icon subset now pass the real local
  Expense journey. The D2.3 390 px result remains visually weak: the role
  control and five wrapping route links consume three rows; internal IDs and
  every field are expanded; record boundaries and hierarchy are weak; and the
  first record action falls below the opening viewport.
- **CTX-002**: The founder rejected that actual result as bare and monotonous.
  Passing accessibility and overflow checks did not establish ordinary-user
  visual acceptance. The active ledger prioritizes this correction before
  broadening the approval intake matrix.
- **CTX-003**: The reuse inventory in the D2.4 plan found that the existing
  approval `EntityRecords`, `FormBlock`, `ApprovalIcon`, shell, and conditional
  styles already own the needed semantics. Approved `button`, `badge`, `input`,
  `select`, `form-field`, `empty-state`, `confirmation-state`, and active-link
  behavior cover the interaction contract. Restaurant generated assets and
  Workbench editor controls have different semantics. No new registry key,
  copied source, or third-party asset is justified.
- **CTX-004**: The browser remains untrusted. Presentation filtering, selected
  demo role, active route, status tone, and visible actions grant no access.
  The generated server remains authoritative for authentication, role policy,
  workflow state, optimistic concurrency, and the existing `403` denial.

## Current accepted Golden profile

- **CUR-001**: The sole accepted Golden profile remains the exact table in
  `docs/tech-governance.md`: Node.js `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript
  `^5.7.2` resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React and React
  DOM `^19.0.0` resolved `19.2.8`, NestJS `^10.4.15` resolved `10.4.22`, Prisma
  `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved `5.81.2`, ioredis
  `^5.4.2` resolved `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, and the
  tracked local Compose topology. Manifest ranges, exact lock resolutions, and
  floating-major image tags retain their distinct meanings.
- **CUR-002**: The implemented serialized contract remains
  `factory.application-graph/v1`; the lifecycle remains mutable Draft ->
  immutable Published Graph -> immutable Compilation. The generated web
  manifest remains Next `^15.5.0`, React/React DOM `^19.0.0`, and TypeScript
  `^5.7.0` without a generated lockfile.
- **CUR-003**: The accepted compiler asset coordinate remains
  `lucide-static` exactly `0.468.0`. The current `approval-v1` branch embeds
  only `house`, `receipt-text`, `user-round`, `refresh-cw`, `clock`,
  `circle-check`, and `circle-x` through the existing hash-checked helper and
  retains its generated notice.
- **CUR-004**: The current accepted approval presentation expands ID, status,
  and every declared field in each record, wraps route links, has no active
  route marker, and gives New and Refresh equal visual weight.

## Proposed Golden profile and frozen presentation contract

The proposed profile remains separate from the accepted profile until the
founder gate is satisfied. It has exactly the same versions, serialized
identifiers, packages, assets, and runtime topology as **CUR-001** through
**CUR-003**. Its only difference is the following `approval-v1` emitted
presentation contract in `packages/compiler/src/index.ts`.

- **DEC-001 — Scope and compatibility branch**: Keep the existing structural
  `approval-v1` selector unchanged. Emit every new helper, class, markup
  fragment, and style only when that profile is selected. The `legacy` branch,
  canonical Appointment and hand-built non-approval bundles, and the separate
  Restaurant V3 target must remain byte-identical. Prior immutable Published
  Graphs and Compilations are never rewritten.
- **DEC-002 — Compact honest shell**: In `approval-v1`, render the application
  name as the first header line and preserve the visible text
  `Requests and approvals` immediately beneath it. Keep the visible `Demo role`
  label, `user-round` decorative icon, native select, and unchanged declared
  role option values in one compact control group. Do not imply sign-in,
  requester identity, tenant privacy, or a production account.
- **DEC-003 — Route navigation**: Keep every `projection.navigation` item as a
  direct native anchor in declaration order. Render the anchors in one
  non-wrapping, horizontally scrollable navigation row with no document-level
  horizontal overflow. The link whose route equals `requestedRoute` receives
  `aria-current="page"` and a visible accent/border marker. All other links omit
  `aria-current`. Keep each visible label and current decorative icon mapping;
  add no tab, drawer, duplicated selector, hidden route, or alternate mobile
  route. Keyboard focus and touch scrolling must reach every link.
- **DEC-004 — Section actions**: Keep the current New and Refresh operations and
  accessible names. When creation is authorized and `formRoute` exists, give
  `New <entity>` the existing `generated-primary` treatment and place it before
  the secondary Refresh action. This is the only new primary action; it does
  not bypass `can(role, entity.key, "create")`.
- **DEC-005 — Exact declared-field summary selection**: A pure compiler-emitted
  helper selects summary fields from `RuntimeEntity.fields`, never from the
  application/entity name, record values, requirement text, field order, or
  response-only keys. `amount` matches only an exact key `amount` with type
  `integer` or `decimal`; `category` matches only an exact key `category` with
  type `string` or `enum`; and `date` matches only an exact key `date` with type
  `date` or `datetime`. A slot is selected only when exactly one compatible
  declaration matches. Missing, duplicated, or incompatible declarations yield
  no promoted slot. No alias, suffix, fuzzy match, inferred currency, unit,
  exchange conversion, or entity-specific fallback is allowed.
- **DEC-006 — Record summary**: Each record remains one direct child `<li>` of
  `.generated-records`. Its always-visible summary uses `<dl>`/`<dt>`/`<dd>`.
  Render the selected Amount first with its existing formatted value and a
  prominent presentation of at least `1.75rem` and font weight `700`; render
  selected Category and Date as compact supporting values; and always render
  the current Status `<dt>`/`<dd>`, visible text, badge, and structural icon.
  A selected declaration with a missing record value displays the existing
  `Not provided`; it never invents a value. If no summary declaration matches,
  the safe fallback is the status summary alone.
- **DEC-007 — Structural status tone**: A pure `statusTone(entityKey, status)`
  derives `positive` only from an `approve` transition target, `negative` only
  from a `reject` transition target, and `pending` only from the shared review
  source state. Zero matches, multiple semantic matches, malformed status, and
  every other state use `neutral`. Tone changes the card boundary and badge but
  never its text or icon; status is not conveyed by color alone. No total,
  score, KPI, urgency, or business judgment is derived.
- **DEC-008 — Native details disclosure**: After the always-visible summary,
  state-valid action group, and mutation message, render one native `<details>`
  with a visible `<summary>Details</summary>`. It is closed by default. Its
  internal `<dl>` renders `ID` and every Graph-declared field not already in the
  summary, in declaration order, using the existing `fieldLabel` and
  `formatValue`. The ID and remaining values are therefore hidden initially but
  remain reachable by pointer, keyboard Enter/Space, and assistive technology.
  No field is discarded, truncated, copied to a modal, or exposed from an
  undeclared response property.
- **DEC-009 — Workflow and form preservation**: Keep `validTransitions`, action
  deduplication, pending locks, server refresh, mutation announcements,
  `safeResponseMessage`, role/read denial, create/submit/approve/reject behavior,
  and the deliberate requester `403` exact. Keep every ADR-0049 typed-control,
  required/optional, coercion, UTC date, validation, success, error, and
  retained-value rule unchanged. Action buttons remain outside the disclosure
  and visible only when valid for the current role and record state.
- **DEC-010 — Approval-scoped layout and color**: Use only conditional
  `approval-v1` classes. Preserve the immutable Graph-derived light, dark, and
  system theme tokens; do not replace the declared brand with a hardcoded teal.
  Use the existing accent for the primary action, active route, focus, and
  subtle emphasis. Map `positive` to the resolved Graph success token,
  `pending` to warning, `negative` to danger, and `neutral` to the resolved
  surface/border/text tokens across light, dark, and system modes. Hardcoded
  status colors are prohibited. Each tone must have distinct
  foreground/background/border treatment with axe-verified contrast, and
  focused tests must prove Graph success/warning/danger overrides reach the
  emitted approval CSS. At widths below 721 px use 16 px card padding, at least
  12 px between records, 44 by 44 CSS-pixel interactive targets, and the
  single-row route scroller. At 900 px and wider, use a two-column record grid.
  No typography, color, radius, or spacing change may escape `approval-v1`.
- **DEC-011 — First-view acceptance**: At a 390 by 900 CSS-pixel viewport with
  the deterministic Expense records loaded, the first record's always-visible
  summary and its valid Submit action must be fully inside the viewport
  (`boundingBox.y + boundingBox.height <= 900`) before its Details disclosure is
  opened. Internal ID must be hidden. This is a presentation acceptance metric,
  not a claim about every data set, browser chrome, or physical device.
- **DEC-012 — Generic fallback and prohibited fabrication**: Unknown approval
  entities use the same deterministic status-only summary, disclosure, and
  state-valid actions. Do not hardcode Expense records, currency, categories,
  dates, KPIs, charts, auth, upload, receipt preview, business copy, route
  labels, or entity-specific branches. Do not inspect entity/application names
  to select layout or data.

## Contracts, ownership, and compatibility

- **CON-001 — API/data compatibility**:
  `factory.application-graph/v1`,
  `factory.generated-page-runtime/v1`, generated API routes and response bodies,
  request payloads, Prisma schema, status/event keys, fixture-session headers,
  capability/composition locks, and immutable hashes remain unchanged. No
  migration or compatibility adapter is added.
- **CON-002 — Contract owner and freeze**: The serialized Compiler integration
  owner owns the internal summary/tone helpers, approval JSX, and conditional
  CSS in `packages/compiler/src/index.ts`. Existing Graph/API/data contracts are
  frozen enough because no frontend/backend contract changes. No disjoint
  frontend/backend wave is authorized. The generated template, its focused
  test, browser harness, and end-to-end smoke path remain serialized integration
  work; any shared-contract need stops the task and returns to Tech Lead/PM.
- **CON-003 — Catalog/adapters**: Catalog impact is zero. No UI primitive,
  pattern, generated UI item, screen/experience/product recipe, capability,
  target registry key, adapter, icon allowlist, helper, notice, or source study
  changes. No license or supply-chain coordinate changes.
- **CON-004 — Security/privacy**: Native disclosure reduces initial exposure of
  internal IDs but is not an authorization or privacy boundary. The server still
  returns the same role-readable record and directly authorizes every mutation.
  Safe errors continue to exclude response bodies, credentials, prompts,
  provider material, and sensitive request data.
- **CON-005 — Operability**: Build/start/health/proxy behavior, ports, Compose
  services, preview isolation, cleanup, and generated file counts remain
  unchanged. Horizontal scrolling is confined to the route navigation. The
  change adds no telemetry, storage, network request, cache, process, or cleanup
  duty.

## Consequences

### Positive

- **POS-001**: Phone users reach the first meaningful record and action sooner
  while every route and declared field stays available.
- **POS-002**: Exact declaration and flow rules make hierarchy deterministic for
  generic approval entities without invented domain meaning.
- **POS-003**: Existing native semantics, icons, tokens, server checks, and
  immutable lifecycle evidence are reused rather than duplicated.

### Negative

- **NEG-001**: Secondary record values and internal IDs require one disclosure
  action, so full-record comparison takes an extra interaction.
- **NEG-002**: A generic entity without the exact compatible `amount`,
  `category`, or `date` keys receives a deliberately sparse status-only summary.
- **NEG-003**: A horizontal navigation row may require touch or keyboard
  scrolling when all routes do not fit; direct links and active context remain
  visible/reachable within the same landmark.

## Alternatives considered

- **ALT-001 — Keep the D2.3 presentation**: **Reject**. Functional workflow and
  axe success do not address the observed mobile hierarchy and reading cost.
- **ALT-002 — Make only cosmetic color changes**: **Reject**. Color cannot move
  internal IDs, remaining fields, or the first valid action above the fold.
- **ALT-003 — Add an approval design system, registry component, form library,
  or icon dependency**: **Reject**. Existing renderer/components cover the
  contract and a new asset would enlarge catalog and supply-chain scope.
- **ALT-004 — Detect Expense by entity/application name or hardcode a finance
  dashboard**: **Reject**. Name heuristics and fabricated totals/business data
  violate generic deterministic generation and would not be Graph authority.
- **ALT-005 — Replace route links with tabs, a duplicated route select, or a
  hidden drawer**: **Reject**. These add interaction semantics and test surface
  without improving the declared route contract. A direct scrollable link row
  is the smaller accessible change.

## Implementation manifest, migration, rollback, and aborts

- **MIG-001 — Writer manifest**: After recorded acceptance, one serialized
  Compiler owner may modify exactly
  `packages/compiler/src/index.ts` and
  `packages/compiler/test/composition-page-runtime.test.ts`. Start with focused
  failing tests for exact summary selection, missing/incompatible/duplicated
  candidates, status-tone ambiguity, native disclosure markup, active route,
  and legacy/Restaurant byte preservation.
- **MIG-002 — Root integration manifest**: Root retains exclusive ownership of
  `e2e/consumer-approval.spec.ts`, the D2.4 plan, active ledger, project status,
  and new D2.4 acceptance evidence. Root may prepare acceptance assertions and
  documentation before production implementation; the actual runtime run waits
  for the compiler source freeze and successful focused checks. D2.3
  screenshots and failure evidence remain unchanged.
- **MIG-003 — Materialization**: Only a new immutable Compilation contains the
  revised presentation. There is no Graph, API, database, queue, catalog,
  package, lockfile, notice, Compose, or prior-artifact migration and no
  irreversible step.
- **ROL-001 — Rollback**: Revert the two writer paths and any root-owned D2.4
  harness/document additions, then materialize a new Compilation with the prior
  accepted approval presentation. Existing data requires no conversion. Never
  edit/delete a Published Graph, prior Compilation, ledger history, or retained
  D2.3 evidence.
- **ABT-001**: Abort on any need for a Graph/API/data/security/identity contract,
  runtime/package/version/lock/notice/icon change, new registry/recipe/catalog
  asset, new route, backend write, Compose topology, provider/model call,
  external resource, or deployment.
- **ABT-002**: Abort if a field is promoted by value or name heuristic beyond
  **DEC-005**, if currency/unit/KPI/business meaning is invented, if any
  declared field becomes unreachable, or if a role/workflow/typed-control/error
  assertion changes.
- **ABT-003**: Abort on legacy, Appointment, hand-built non-approval, or
  Restaurant byte drift; a document-level horizontal overflow; a hidden valid
  action; an inaccessible disclosure; theme-token override; raw error body; or
  failure to keep the first Expense summary/action above the 390 by 900 fold.

## Measurable verification plan

- **VER-001 — Focused emitted contract**: In
  `composition-page-runtime.test.ts`, prove exact-key and type selection for
  Amount/Category/Date; no promotion for absent, incompatible, duplicated, and
  amount-like alias keys; status-only unknown fallback; missing selected values
  display `Not provided`; structural positive/negative/pending/neutral tone and
  ambiguous neutral fallback; ID and remaining declarations appear only in the
  closed native Details block; and every action remains outside it. Strictly
  type-check the emitted Expense runtime.
- **VER-002 — Shell and compatibility**: Prove heading then preserved
  `Requests and approvals` copy, compact visible Demo role control, every direct
  navigation link in declaration order, exactly one current-page
  `aria-current`, primary authorized New link, and secondary Refresh. Compile
  the same Expense input twice for identical output. Re-run the frozen ordered
  bundle digests and unchanged Restaurant target/icon tests for zero byte drift.
- **VER-003 — Package checks**: Run
  `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts restaurant-customer-icons.test.ts restaurant-product-v3-target.test.ts`,
  `pnpm --filter @factory/compiler typecheck`,
  `pnpm --filter @factory/compiler build`, and
  `pnpm exec prettier --check packages/compiler/src/index.ts packages/compiler/test/composition-page-runtime.test.ts e2e/consumer-approval.spec.ts`.
  Record exact commands, test counts, exit codes, final path hashes, and the
  independent task-review verdict in the active ledger.
- **VER-004 — Combined browser workflow**: Root runs exactly one existing
  `e2e/consumer-approval.spec.ts` lane with one worker and zero retries. That
  same lane performs deterministic provider-free interpretation, actual
  composition -> Publish -> Compile -> Verify -> Preview, and the generated UI
  journey; no second runtime build or separate generated-app browser lane is
  mandatory. Through visible UI, create and submit two records, approve one,
  reject one, reload as requester, and retain both terminal results; preserve
  the deliberate direct requester-approve `403`. Existing valid D2.2 browser
  evidence and focused emitted tests preserve safe-error, pending-lock,
  typed-control, UTC-date, and retained-value rules. Re-run an unchanged error
  or pending browser scenario only if its implementation changes or review
  identifies a concrete concern.
- **VER-005 — Presentation/accessibility**: At 390 by 900, 768 by 900, and 1440
  by 900 CSS pixels, require no document horizontal overflow and zero axe WCAG
  A/AA violations. Navigate every route link and verify its active marker.
  Require the visible primary New action, Amount and Status `<dt>`/`<dd>`,
  structural terminal tones, and clear record boundaries. At 390 by 900 require
  the first record summary and Submit action bottom at or above 900, with ID
  hidden by default; focus Details and toggle it with Enter, then verify ID and
  all remaining declared fields are visible and reachable. Primary controls
  retain at least 44 by 44 CSS-pixel targets and visible keyboard focus.
- **VER-006 — Evidence and cleanup from the same lane**: After the
  focused/package checks and separate root authorization, **VER-004** is the one
  required actual local runtime lane. Retain all prior D2.3 evidence and write a
  new D2.4 390 px form screenshot plus list screenshots at 390, 768, and 1440
  px. Root visually inspects those four screenshots in one batch, permits at
  most one bounded visual correction plus one confirmation pass, and records
  exact-label zero containers/networks/volumes after teardown. This is local
  browser evidence, not physical-device, hosted, release, or deployment
  evidence.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and `docs/delivery-policy.md`.
- **REF-002**: ADR-0043, accepted ADR-0049, and the active ledger
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **REF-003**:
  `docs/superpowers/plans/2026-09-10-approval-mobile-presentation.md`,
  `packages/compiler/src/index.ts`,
  `packages/compiler/test/composition-page-runtime.test.ts`,
  `e2e/generated-expense.spec.ts`, and `e2e/consumer-approval.spec.ts`.
- **REF-004**: `packages/ui-primitives/src/index.ts`,
  `packages/ui-patterns/src/index.ts`, `packages/generated-ui/src/index.ts`, and
  the approved screen/experience/product recipe registries.
