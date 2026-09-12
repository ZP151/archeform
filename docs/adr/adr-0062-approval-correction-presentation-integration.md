---
title: "ADR-0062: Approval Correction Presentation Integration"
status: "Proposed"
date: "2026-09-12"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "generated-ui", "approval"]
supersedes: ""
superseded_by: ""
---

# ADR-0062: Approval Correction Presentation Integration

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** only future output selected by accepted ADR-0060 to
`approval-workspace-presentation@2.1.0`,
`approval-presentation-components@1.1.0`, and
`approval-visual-assets@1.1.0`. Reuse the exact founder-approved ADR-0061
layout, icons, and two raster assets while adding exact `returned` correction
selection and progress. Keep legacy one-stage approval output on its delivered
`2.0.0`/`1.0.0`/`1.0.0` profile and byte-identical. This addendum changes no
ADR-0060 API, data, authorization, replay, version, reason, or business scope.
It is a proposal only; it authorizes no implementation, provider/runtime call,
Product Publish, Compilation, external resource, deployment, Git action, or
release.

## Context and decision gap

- **CTX-001**: ADR-0060 was accepted at SHA-256
  `b47961bec46af1757087e3c067ff6c1e35556aae2b07e9de01e0dbc16f122107`.
  It migrates future canonical Expense and Purchase definitions from terminal
  `rejected` to revisable `returned`, but its manifest predates the two private
  ADR-0061 presentation modules.
- **CTX-002**: ADR-0061 was accepted at SHA-256
  `3f71e0ae0eb364a42ec65b57f281b49a983c9c38c1478a7ff5fee869440a7d5a`
  and delivered at `92f21089beeb184a236a1512cb4c1866f158e903`.
  `approval-visual-assets@1.0.0` admits Expense/Purchase record media only for
  exact status enum values `draft, submitted, approved, rejected`, and
  `approval-presentation-components@1.0.0` renders progress only for that exact
  one-stage flow.
- **CTX-003**: Merely applying ADR-0061 PRO-002's workspace coordinate
  reconciliation would make valid ADR-0060 output lose its specialized record
  media and progress. Broadening the existing `1.0.0` selectors in place would
  also violate ADR-0060's exact-old-byte guarantee. A versioned integration
  decision is therefore required.

## Current accepted and proposed profiles

- **CUR-001 — Golden technology profile**: The accepted profile remains Node
  `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, Next
  `^15.1.0` resolved `15.5.22`, React/DOM `^19.0.0` resolved `19.2.8`, Puck
  `0.22.3`, XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, BullMQ
  `5.81.2`, ioredis `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, compiler
  Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`, `lucide-static` exactly
  `0.468.0`, Docker Compose, and implemented
  `factory.application-graph/v1`. `@factory/adapters@0.1.0` keeps OpenAI
  `^4.77.0` resolved `4.104.0`; `@factory/compiler` remains `0.1.0`.
  Manifests, `pnpm-lock.yaml`, Dockerfiles, and floating-major image tags remain
  authoritative.
- **CUR-002 — Delivered private presentation profile**: New exact one-stage
  approval Compilations use `approval-workspace-presentation@2.0.0`, CSS
  sentinel `--approval-workspace-version: 4`,
  `approval-presentation-components@1.0.0`,
  `approval-visual-assets@1.0.0`, and
  `approval-decision-history@1.0.0`. Their flow ends in `approved|rejected`.
- **PRO-001 — Proposed correction presentation profile**: Keep every CUR-001
  coordinate and all ADR-0060 private contracts exact. Only after ADR-0060
  `approval-correction@1.0.0` succeeds, emit
  `approval-workspace-presentation@2.1.0` with CSS sentinel
  `--approval-workspace-version: 5`,
  `approval-presentation-components@1.1.0`,
  `approval-visual-assets@1.1.0`, and unchanged
  `approval-decision-history@1.0.0`. This proposed private profile is distinct
  from the current accepted Golden profile and the delivered legacy private
  profile.

## Frozen selection and presentation contract

- **SEL-001 — Profile dispatch**: The accepted ADR-0060 SEL-001 selector is the
  sole correction-profile authority and runs before presentation selection.
  Its exact match selects PRO-001. An old exact structural approval with
  `reject: submitted -> rejected` selects CUR-002 unchanged. A correction-shaped
  Graph that fails ADR-0060 selection fails closed as ADR-0060 requires; it
  cannot fall back to or partially mix with the legacy renderer. Entity, state,
  transition, field, and page ordering remain immaterial only where ADR-0060 or
  ADR-0061 already says so.
- **SEL-002 — Correction material signatures**: Version `1.1.0` retains the
  exact two ADR-0061 asset keys, bytes, dimensions, roles, provenance, license,
  base64, and SHA-256 values. It adds no asset. After SEL-001 selects the exact
  correction approval entity, Expense and Purchase row material uses the
  corresponding ADR-0061 EXP-001 business-field signature with the sole status
  difference `status:enum required` whose ordered values are exactly
  `draft, submitted, approved, returned`. Field order is ignored; enum order,
  key, type, and requiredness are exact. Any missing, extra, duplicate, renamed,
  mistyped, differently required, differently enumerated, unrelated, or
  ambiguous entity receives the existing generic hero and placeholder with no
  record photo.
- **SEL-003 — Legacy material signatures**: Version `1.0.0` continues matching
  only the delivered Expense/Purchase signatures with ordered status values
  `draft, submitted, approved, rejected`. No correction signature or version
  metadata may enter legacy emitted source.
- **PRG-001 — Correction current-state progress**: Version `1.1.0` renders
  progress only for the one SEL-001 entity and its exact single flow: states
  `draft, submitted, approved, returned`, initial `draft`, and transitions
  `submit: draft -> submitted`, `approve: submitted -> approved`,
  `reject: submitted -> returned`, and `update: returned -> draft`. The exact
  current-state projection is `Draft current / Submitted pending / Decision
  pending` for draft; `Draft complete / Submitted current / Decision pending`
  for submitted; and `Draft complete / Submitted complete / Approved|Returned
  current` for the two decision states. The current item has
  `aria-current='step'`; Returned reuses the admitted `circle-x` icon. After
  Revise returns the record to draft, the projection resets to the draft row;
  decision history, not progress, preserves earlier return/approval evidence.
- **PRG-002 — Truth and fallback**: Progress consumes only the immutable
  generated flow and current server-returned status. It infers no time, actor,
  reason, duration, percentage, version history, or next outcome. Missing,
  duplicate, malformed, unrelated, or unknown flow/status renders no progress.
  The visible status badge and ADR-0060 record-scoped history remain
  authoritative. Legacy `1.0.0` progress and every ADR-0061 responsive,
  palette, media-fallback, focus, icon, pending, and late-response behavior stay
  exact.

## Compatibility, catalog, security, and operability effects

- **API-001**: No Graph, Blueprint, requirement, API route/body/result/error,
  database, receipt, audit, actor, authentication, authorization, capability,
  adapter, serialization, or compatibility contract changes. ADR-0060 API-000
  through API-007 and DAT-001 remain the frozen contract owned by Root/PM.
- **CMP-001**: Historic Drafts, Published Graphs, Compilations, files, hashes,
  and previews are never rewritten. Recompiling either frozen legacy Expense or
  Purchase Published Graph must reproduce the complete ordered emitted artifact
  manifest and aggregate bundle bytes from `92f21089` exactly. The tests use
  self-contained frozen Graph values and hashes, never canonical adapter
  factories that ADR-0060 migrates.
- **CAT-001**: Public UI, recipe, capability, definition, source-study, and
  compiler-target catalogs and their counts/locks remain unchanged. The three
  proposed coordinates are compiler-private factory-authored `UNLICENSED`
  revisions. The same two original media assets and existing Lucide allowlist
  are reused; no dependency, lockfile, notice, copied source, public registry
  key, or business-family count changes.
- **SEC-001**: Browser presentation grants no authority. Server role/state,
  version, idempotency, reason validation, and transaction rules remain
  decisive. Compile-time asset integrity remains exact, presentation matching
  reads only validated Published Graph structure, and no prompt, record value,
  credential, path, upload, HTML, remote URL, fetch, or model choice enters
  asset selection.
- **OPS-001**: Generated routes, services, Compose topology, network traffic,
  ports, storage, cleanup, and media limits remain unchanged. Correction output
  adds no operability surface beyond ADR-0060. Reusing the existing embedded
  media keeps its decoded/base64 limits and zero image-network-request behavior.

## Consequences and alternatives

### Positive

- **POS-001**: The accepted correction journey retains the founder-approved
  expressive layout, exact media, familiar icons, and truthful progress without
  weakening ADR-0060.
- **POS-002**: Explicit profile dispatch makes legacy byte compatibility and
  future correction rendering independently testable.

### Negative

- **NEG-001**: The compiler must retain two private presentation profiles and a
  permanent frozen legacy fixture while either profile remains recompilable.
- **NEG-002**: Progress deliberately resets after Revise because current state
  alone cannot prove prior cycles; users rely on the existing decision history
  for that evidence.

### Keep ADR-0060 and ADR-0061 without an addendum

- **ALT-001 — Description**: Change only the workspace coordinate to `2.1.0`.
- **ALT-002 — Rejection reason**: Exact ADR-0061 material and progress selectors
  reject the ADR-0060 `returned` shape, producing an unintended visual regression.

### Broaden the delivered 1.0.0 modules in place

- **ALT-003 — Description**: Make `1.0.0` accept both terminal rejection and
  correction workflows.
- **ALT-004 — Rejection reason**: It changes a delivered private contract in
  place and risks old generated bytes, contrary to ADR-0060 compatibility.

### Add new assets or a correction-specific renderer

- **ALT-005 — Description**: Create new photos, public components, or a second
  page shell for correction output.
- **ALT-006 — Rejection reason**: The approved media and composition already fit
  both canonical business signatures; duplication adds supply and maintenance
  cost without a documented gap.

## Migration, ownership, rollback, and abort conditions

- **MIG-001 — Additional serialized paths**: Add to ADR-0060 MIG-001 only
  existing `packages/compiler/src/approval-presentation-components.ts`, existing
  `packages/compiler/src/approval-visual-assets.ts`, existing
  `packages/compiler/test/approval-visual-assets.test.ts`, and new test support
  `packages/compiler/test/fixtures/approval-legacy.ts`. ADR-0060 already owns
  `approval-workspace-presentation.ts`, `index.ts`,
  `composition-page-runtime.test.ts`, and `compilation-plan.test.ts`. The frozen
  legacy fixture contains exact standalone old Expense and Purchase Published
  Graph inputs, their checksums, ordered artifact-manifest digests, and aggregate
  bundle hashes captured from `92f21089`; it imports no canonical definition.
  No production path outside the accepted ADR-0060 manifest is added.
- **CON-001 — Owner and serialization**: Root/PM remains contract owner for
  ADR-0060 and this presentation dispatch. The API/data artifact is frozen, but
  frontend/backend writers are not authorized because the compiler emits both
  surfaces. One compiler integration owner serially changes selectors,
  generated templates, shared tests, and fixtures. Actual generated templates,
  shared contracts, Compilation, and end-to-end smoke remain serialized.
- **MIG-002 — Sequence**: Persist the legacy fixtures and prove their GREEN
  baseline first. Add failing correction signature/progress/profile tests, then
  implement profile dispatch and `1.1.0` behavior, then complete the remaining
  ADR-0060 serialized work. Never regenerate the legacy fixture from migrated
  canonical adapters.
- **ROL-001**: Before a correction Compilation is retained, revert the PRO-001
  presentation changes and keep CUR-002. After one exists, stop selecting
  PRO-001 for new work while retaining exact support for immutable correction
  artifacts; do not rewrite either profile's artifacts. No data migration or
  irreversible step exists.
- **ABT-001**: Abort on old Expense/Purchase artifact drift; a correction Graph
  using legacy presentation coordinates; a legacy Graph using correction
  coordinates; partial selector fallback; new media bytes/key/dependency; remote
  request; invented status/reason/history; Graph/API/database/security/catalog/
  Compose change; or any weakening of ADR-0060 authorization, replay, version,
  state, reason, atomicity, or immutable-lifecycle rules.

## Measurable verification plan

- **VER-001 — Frozen old bytes**: Compile both standalone legacy fixtures twice.
  Compare every ordered path, byte length, SHA-256, manifest digest, and aggregate
  bundle hash to the `92f21089` constants. Require exact equality and prove the
  fixture has no import from `packages/adapters` or current definition factories.
- **VER-002 — Exact profile selection**: Prove legacy Expense/Purchase select
  `2.0.0`/`1.0.0`/`1.0.0`; exact ADR-0060 Expense/Purchase select
  `2.1.0`/`1.1.0`/`1.1.0`; every missing, extra, duplicate, renamed, mistyped,
  requiredness, enum-value/order, flow, transition, state, entity, or selector
  mutation fails closed or receives only the ADR-governed generic fallback.
  Assert both selected assets retain byte-for-byte SHA-256
  `6621d5c80cee5784e8e0920e34c090eb31084f4218d61c7a2e38566712b6a715`
  and `c1961dabf8ce08922808dc7f9572bcd1bef57dc95625852d6c65f33097e4d343`.
- **VER-003 — Progress truth**: Assert the exact three-step projection,
  `aria-current`, complete/current/pending states, labels, and admitted icons for
  draft/submitted/returned/approved; Revise reset; no progress for every malformed
  or ambiguous case; and unchanged legacy rejected behavior. Assert no inferred
  version, time, actor, reason, percentage, or history text.
- **VER-004 — Commands and evidence**: Run
  `pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts`,
  `pnpm --filter @factory/compiler test -- approval-visual-assets.test.ts composition-page-runtime.test.ts compilation-plan.test.ts database-target-parity.test.ts approval-correction-runtime.test.ts`, then affected package
  typecheck/build/lint and the accepted ADR-0060 persisted E2E journeys at
  `390`, `768`, and `1440` px. Record exact fixture/output hashes, commands,
  exit codes, source freeze, screenshots, cleanup, reviews, and limitations in
  `docs/acceptance/approval-correction.md` and the active consumer-delivery
  ledger. Require P0/P1/P2 `0/0/0` at the existing combined review gate.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and `docs/delivery-policy.md`.
- **REF-002**: ADR-0058, ADR-0059, accepted ADR-0060, accepted ADR-0061, and
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **REF-003**: `packages/compiler/DESIGN.md`,
  `docs/superpowers/plans/2026-09-12-approval-decision-closure.md`, and
  `docs/superpowers/plans/2026-09-12-expressive-approval.md`.
