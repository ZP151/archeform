# Base44-Inspired Golden Path — Implementation Plan

> **Historical status — 2026-08-10:** This plan completed a fixed Expense
> Approval replay and retained useful Workbench, verification, and cleanup
> evidence. The 2026-08-09 Product Closure iteration inherited that evidence
> but reopened product closure because the replay did not start from a
> free-form requirement. The 2026-08-10 Restaurant Product iteration
> supersedes this plan only as the forward product-experience target; preserve
> the existing content and evidence as historical regression material.

- **Date:** 2026-08-08
- **Status:** Approved for implementation
- **Spec:** docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md
- **Supersedes:** none
- **Amends:** docs/superpowers/plans/2026-08-07-governed-composition-capability-foundry.md
  (delivery order only; Foundry contracts and evidence are retained)

## Objective

Complete one low-friction, evidence-backed path from a business requirement to
a runnable local preview for the **Expense Approval** profile, without editing
source and without manually assembling capability locks:

```text
Discuss
  -> RequirementSpec
  -> reviewable CompositionPlan
  -> visual Graph Diff alternatives
  -> mutable Draft
  -> role and data simulation
  -> Publish
  -> immutable Compilation
  -> isolated verification
  -> local preview URL
```

Pause new capability families and vertical Profiles. Keep the Application
Graph authoritative; preserve mutable Draft -> immutable Published Graph ->
immutable Compilation.

## Existing surface (verified 2026-08-08)

The platform backbone is already in place; this plan adds the Workbench
journey over it:

- `packages/graph`: `RequirementSpecV1`, `CompositionPlanV1`,
  `CompositionClarificationV1`, `CompositionDecisionV1`, `factory.graph-diff/v1`
  with strict schema validation, `applyApprovedComposition` (Draft-only),
  `createDraftRevision`, hash/digest helpers, `ExperienceModel` with theme
  tokens.
- `packages/capabilities`: deterministic `planComposition` over the approved
  assets and the recipe catalogue; 27 current families; expense-approval
  profile recipe (7 selections incl. core.approvals).
- `packages/adapters`: `DeterministicCompositionPlannerAdapter` (schema-valid
  proposals or bounded clarifications; AI optional, never authoritative).
- `apps/control-plane`: lifecycle API (draft revisions, publish, compilations,
  preview runs with internal-worker auth and dispatch/ready/failed/stopped
  reports) and composition review API (requirements -> requestPlan -> getReview
  -> decide -> apply with checksum-bound plan/Diff and Draft-moved guards).
- `apps/workbench`: Graph Studio with guided-creation drawer (template-first),
  page/flow/domain studios, scope-level `diffApplicationGraphs`, portfolio
  home, compilation-status helper, control-plane client.

## Slices

Each slice is a coherent, test-first, committed and pushed green change. A
slice is "green" when its focused tests pass, the workbench typecheck passes,
the capabilities/graph suites still pass proportionally, and formatting is
clean.

### S1 — Discuss mode: RequirementSpec brief + bounded clarification model

- `apps/workbench/lib/golden-path/discuss-model.ts` (+ test): a bounded
  Discuss state machine over the existing `RequirementSpecV1` contract —
  outcome brief, actors, constraints, open questions (answered or explicitly
  deferred), acceptance scenarios. Deterministic clarification-question set
  for the Expense Approval outcome (budget approval threshold, manager role,
  audit trail requirement, multi-level approval). Fail-closed: Discuss cannot
  mutate a Draft; unresolved *required* questions block Plan.
- Deterministic Expense Approval starter requirement fixture so the journey
  is reproducible without AI.

### S1A — Adaptive Requirement Interview: user-confirmed requirement baseline

- Replace the fixed Expense Approval question sequence with the Factory-owned
  deterministic decision graph in
  `docs/superpowers/specs/2026-08-08-adaptive-requirement-interview-design.md`.
  Discuss asks exactly one applicable question at a time, exposes a
  recommendation and rationale, permits only safe deferrals, and requires an
  explicit Requirement Summary confirmation before Plan.
- The structured completed interview is the primary `RequirementSpecV1` and
  Plan baseline. It cannot mutate a Draft, select packages, introduce source
  or credentials, or persist raw chat/provider material. Unsupported second
  approval and receipt answers become visible limitations or bounded blocking
  clarifications rather than invented capabilities.
- This slice is a prerequisite for S2 acceptance. Its detailed test-first
  implementation plan is
  `docs/superpowers/plans/2026-08-08-adaptive-requirement-interview.md`.

### S2 — Plan mode: deterministic plan alternatives + visual Graph Diff

- `apps/workbench/lib/golden-path/plan-alternatives.ts` (+ test): up to three
  bounded, schema-valid plan alternatives for the requirement via the
  deterministic planner over the recipe catalogue and approved assets. Each
  alternative carries a safe summary, capability locks, compatibility
  evidence, risks, affected pages/data/policy/flows, acceptance journeys, and
  known limitations. The first alternative uses the user's confirmed Discuss
  answers as its baseline; at most two comparisons change exactly one declared
  supported answer relative to that baseline. Alternatives never override an
  unrelated user answer and never vary by random or model choice.
- `apps/workbench/lib/golden-path/graph-diff-visual.ts` (+ test): entry-level
  visual Graph Diff (pages, entities, roles, flows) between the base Draft and
  each alternative, derived from the constrained `factory.graph-diff/v1`
  operations — never from generated source.
- Acceptance records the chosen plan; stale base checksums, altered locks,
  unsafe operations, and unresolved required questions fail closed (reusing
  the control-plane checksum-bound review contract).

### S3 — Build mode: accepted plan to Draft + Experience System

- Apply the accepted constrained Diff to the mutable Draft through the
  existing lifecycle (`applyApprovedComposition` -> `appendDraftRevision`).
- `packages/graph` Experience System: semantic colour, typography, spacing,
  radius, elevation, and motion tokens; light and dark themes; responsive
  shell and page-layout recipes; approved component variants. Schema-validated
  with deterministic defaults; no arbitrary CSS/packages/scripts/component
  source in the Graph.
- Workbench Build surface: adjust one Experience token and one approved page
  layout variant; Draft revision comparison and restore using the existing
  immutable lifecycle contracts.

### S4 — Role and data simulation over the mutable Draft

- `apps/workbench/lib/golden-path/simulator.ts` (+ test): pure deterministic
  simulator over the mutable Draft — seeded scenario data, role switching,
  per-role visible navigation and allowed actions derived from policy,
  workflow record submission/transition, audit events, authorization denials,
  reset-to-seed. Clearly labelled simulation; never presented as deployment or
  production verification.

### S5 — Unified bounded Activity/Evidence Timeline

- `apps/workbench/lib/golden-path/timeline.ts` (+ test): one bounded timeline
  rendering compilation, isolated boot, migration, health, API, journey,
  authorization-denial, idempotency, cleanup, and safe-diagnosis events with
  status, duration, safe reason codes, and artifact links. Never raw prompts,
  provider responses, secrets, request bodies, or unbounded logs.

### S6 — One-action Publish -> Compile -> Verify -> Preview + cleanup

- Workbench wiring over the existing control-plane endpoints: one primary
  action advances an eligible Published Graph through compile -> isolated
  boot -> verify -> preview URL. Success shows the preview, tested roles and
  journeys, evidence summary, and a cleanup control. Failure shows bounded
  safe diagnosis and may propose a reviewable new Draft Diff; it never patches
  generated source, a Published Graph, a Compilation, or running state.

### S7 — Mode shell UI, lineage canvas, browser E2E

- Split `apps/workbench/components/workbench.tsx` by stable responsibility:
  mode components (Discuss/Plan/Build) over the S1-S6 models; the existing
  studios and home are not rewritten.
- Connected all-pages and application-lineage canvas: pages and routes,
  actors and roles, entities and relations, flows and guarded transitions,
  selected capability locks, and Publish/Compilation/verification/preview
  lineage. Canvas coordinates and selection state are presentation data, not
  business truth.
- Playwright browser E2E for the complete Expense Approval journey:
  describe -> clarify -> compare at least two alternatives -> accept + inspect
  visual Graph Diff -> apply to Draft -> adjust one token and one approved
  layout -> simulate employee submission, manager approval/rejection, finance
  audit, and an authorization denial -> publish -> compile and pass the
  isolated verifier -> open the local preview -> prove cleanup.

### S8 — Clean-checkout acceptance + gates + close

- Verify from a clean checkout: workbench build, focused component tests,
  control-plane composition tests, compiler tests, and the Expense browser
  E2E green.
- Independent review + QA gates on the Golden Path delivery train.
- Update project-status and the Golden Path ledger with observed evidence;
  record remaining gaps and the next recommended goal.

## Test-first discipline

- Every lib module in S1-S6 starts with a failing focused test pinned to the
  behavior contract (positive path, fail-closed negatives, determinism).
- Workbench tests run with `vitest` from `apps/workbench`; the workbench has
  no network-dependent tests.
- Proportional regression: `packages/graph`, `packages/capabilities`,
  `apps/control-plane`, `apps/compiler-worker` suites where a slice touches
  the shared contract (S3 changes `packages/graph`).
- Playwright browser E2E is dev-only tooling; the suite skips cleanly when the
  browser is unavailable.

## Boundaries (non-negotiable)

- Discuss mode cannot mutate a Draft; Build cannot start without an accepted,
  checksum-bound plan.
- The canvas and editors persist only validated Graph semantics; adapter state
  never becomes Graph authority.
- No raw prompt, provider response, credential, sensitive payload, or
  unbounded runtime log enters persisted state, evidence, screenshots, or
  reports.
- Only a Published Graph may compile; the resulting application must complete
  the isolated verifier before the preview is marked ready.
- No Base44 source, assets, prompts, schemas, design tokens, or proprietary
  implementation may be copied (closed commercial product; public-document
  patterns only).
- New packages require explicit pinned version, licence/provenance record,
  removal path, focused tests, and the repository dependency gate.

## Acceptance gates (from the design)

- The complete Expense Approval journey completes without editing source or
  manually assembling capability locks.
- Discuss cannot mutate a Draft; Build requires an accepted, checksum-bound
  plan.
- The default generated product is coherent in light and dark themes and meets
  the declared accessibility checks.
- Role simulation proves allowed and denied journeys before Publish.
- Only a Published Graph may compile; the isolated verifier passes before the
  preview is marked ready.
- Failure produces bounded evidence and, when possible, a reviewable Draft
  Diff without mutating immutable or generated artifacts.
- No sensitive material in persisted state, evidence, screenshots, or reports.
- Workbench build, focused component tests, control-plane composition tests,
  compiler tests, and the Expense browser E2E are green from a clean checkout.
