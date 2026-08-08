# P1 Base44-Inspired Golden Path Ledger

**Goal:** Complete one low-friction, evidence-backed path from a business
requirement to a runnable local preview for the Expense Approval profile,
without editing source and without manually assembling capability locks.
Pause new capability families and vertical Profiles until the Golden Path
acceptance gate is green.

**Design:** `docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md`

**Plan:** `docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md`

## State vocabulary

```text
planned -> implementing -> ready_for_qa -> reviewed -> accepted
```

The PM alone advances a state. Any P0/P1/P2 finding, unexplained output drift,
unsafe proposal, provenance gap, or secret boundary violation returns the
owning slice to `implementing`.

## Baseline at dispatch

- Foundry P1 contracts and evidence are retained: 27 current capability
  families, 16 eligible, matrix `16/0/11/0`, three verified Profiles
  (expense-approval, simple-ecommerce, restaurant-ordering) with isolated
  verifier evidence. Batch 5 closed at `75d78da5`.
- Platform backbone in place: `RequirementSpecV1`, `CompositionPlanV1`,
  `CompositionClarificationV1`, `CompositionDecisionV1`, deterministic
  `planComposition`, Control Plane lifecycle + composition review + preview
  run APIs, Workbench Graph Studio with guided-creation drawer and
  scope-level Graph Diff.
- The active branch is `feat/governed-composition-capability-foundry`.

## Delivery slices

| Slice | Scope                                              | State | Latest commit | Evidence |
| ----- | -------------------------------------------------- | ----- | ------------- | -------- |
| S1    | Discuss mode: RequirementSpec brief + clarifications | implementing | 2fe78d30 | 11 focused tests; workbench 84/84; graph 175/175 |
| S2    | Plan mode: deterministic alternatives + visual Diff | implementing | 671e45b2 | 12 focused tests; workbench 96/96; capabilities 356/356 |
| S3    | Build mode: accepted plan to Draft + Experience System | implementing | (see record) | 14 focused tests; workbench 110/110; graph 188/188; capabilities 356/356; control-plane 184/184; compiler-worker 183/183 |
| S4    | Role and data simulation over the mutable Draft | implementing | 5c3a3c52 | 16 focused tests; workbench 126/126; graph 188/188; capabilities 356/356; control-plane 184/184; compiler-worker 183/183 |
| S5    | Unified bounded Activity/Evidence Timeline | implementing | 3989e3cf | 13 focused tests; workbench 139/139; graph 188/188; capabilities 356/356; control-plane 184/184; compiler-worker 183/183 |
| S6    | One-action Publish -> Compile -> Verify -> Preview + cleanup | implementing | (see record) | 13 focused + 3 client tests; workbench 155/155; graph 188/188; control-plane 184/184 |

## Slice records

### 2026-08-08 — S6 One-action release model implemented

`apps/workbench/lib/golden-path/release-model.ts` (+ 13 focused tests) is
the pure one-action release state machine over the existing control-plane
endpoints: an eligible Published Draft advances publish -> compile ->
isolated verification -> preview, with a cleanup control. Every progress
event is a pure transition that fails closed on a wrong phase, a
mismatched identifier, or a terminal phase; failures carry only bounded
safe reason codes; a failed verification may carry a reviewable Draft
Diff that the caller may review but the model never applies. The runtime
preview URL stays on the state and never enters the timeline (timeline
links are app-relative evidence refs only). Every release state is
labelled as a local preview over the immutable Draft lifecycle, never a
deployment.

The control-plane client gains the verification surface (3 new tests):
`createVerificationRun`, `getVerificationRun`, and
`approveVerificationDraftDiff` (the server translates change-constraint
Draft Diff operations into the next immutable Draft revision). The
timeline gains the bounded `verify` event kind. The mode-shell UI wiring
lands with the S7 release journey. S6 state stays `implementing` for PM
advancement.

### 2026-08-08 — S5 Unified bounded Activity/Evidence Timeline implemented

`apps/workbench/lib/golden-path/timeline.ts` (+ 13 focused tests) delivers
one bounded activity/evidence timeline for the Golden Path: compilation,
isolated boot, migration, health, API, journey, authorization-denial,
idempotency, cleanup, preview, and safe-diagnosis events carry only a
bounded status, duration (0-600s), safe reason codes
(`/^[a-z][a-z0-9._-]*$/`), bounded business text (reuses the Graph's
`safeBusinessTextSchema`), and app-relative artifact links (no schemes,
drive letters, leading slashes, traversal, queries, or fragments).
Unknown shapes are rejected outright — raw prompts, provider responses,
request bodies, logs, and secrets are not event fields; a deployment is
not an event kind, so the timeline never presents a deployment. Appends
are pure and deterministic (`at` is the sequential append index):
identical append sequences produce identical timelines.

S5 state stays `implementing` for PM advancement.

### 2026-08-08 — S4 Role and data simulation implemented

`apps/workbench/lib/golden-path/simulator.ts` (+ 16 focused tests) delivers
the deterministic role and data simulation over the mutable Draft: scenario
records are seeded by the module (the starter Graph declares no seed data),
role switching, visible navigation, and the per-role action surface are
derived from the Draft's policy, and record transitions follow the Draft's
flow transitions with audit events recorded only for effect-declared
transitions. Policy is the authoritative action gate — the plan-built
roleless `submit` transition is still denied for roles whose policy surface
lacks `submit` (manager/finance) — and the flow's transition roles gate
additionally. Every state carries `kind: "simulation"` and a label stating
it runs over the mutable Draft (not a deployment); the module never
presents the simulation as deployment or production verification.

Denials are recorded on the returned state with a bounded reason
(`policy-denied` / `flow-state` / `transition-role`); reset restores the
deterministic seed. The full starter surface was probed first and pinned in
the tests: policy permissions (employee expense [create, read, submit];
manager [read, approve, reject]; finance [read, audit]), single Expenses
navigation entry, expense-review flow with role-guarded approve/reject
(audit.record + notification.send effects) and the Build-added roleless
submit. S4 state stays `implementing` for PM advancement.

### 2026-08-08 — S3 Build mode implemented

`packages/graph` gains the Factory-owned Experience System
(`experience.ts`, 13 focused tests): semantic colour/typography/spacing/
radius/elevation/motion tokens with per-group validated value languages
(no CSS injection surface), light and dark themes, approved shell and
page-layout recipes, density presets, approved component variants, and
the accessible focus/contrast/validation/loading/empty/error states —
all schema-validated with deterministic Factory defaults
(`EXPERIENCE_DESIGN_SYSTEM_DEFAULTS`) so the first Golden Path needs no
visual adjustment. Declared design systems are optional on the
ExperienceModel (backward compatible); `resolveExperienceDesignSystem`
merges declarations over defaults; `defaultPageLayoutFor`/`resolvePageLayout`
pick the deterministic recipe per page kind; page-layout selections
reference existing pages (graph-level semantic check). The immutable
lifecycle gains `appendDraftRevision` for content restore.

`apps/workbench/lib/golden-path/build-model.ts` (+ 14 focused tests)
delivers Build mode over the immutable lifecycle: the accepted,
checksum-bound `CompositionDecision` advances the mutable Draft through
`applyApprovedComposition` (fail-closed on rejected decisions, tampered
checksums, stale base Drafts); Experience adjustments and approved page
layout variants are constrained Graph Diffs over the resolved system;
Draft revision comparison surfaces Experience changes entry-level;
restore appends the next immutable revision from an earlier revision's
content — history is never rewritten. The Workbench Build UI surface
wiring lands with the S7 mode shell.

Also fixed: `control-plane` portfolio summary still pinned the stale
restaurant-ordering package count (18, now 20 after accepted Foundry
recipe growth) — same drift class as the S1 workbench tables; aligned
in a separate fix commit.

S3 state stays `implementing` for PM advancement.

### 2026-08-08 — S2 Plan mode implemented

`plan-alternatives.ts` produces up to three schema-valid `CompositionPlanV1`
alternatives over the deterministic planner with a schema-valid anchor
recipe catalogue (7 approved locks, surfaces web/api/database, the S1
acceptance journeys). Alternatives differ only by requirement framing
variants (standard / strict / light); each carries a safe summary,
capability locks, compatibility, risks, affected pages/entities/roles/
flows, acceptance journeys, and known limitations. Fail-closed: unresolved
required questions block Plan; planner clarifications return bounded
results.

`graph-diff-visual.ts` derives entry-level visual Graph Diff (pages,
entities, roles, flows) from the plan's constrained
`factory.graph-diff/v1` operations — never from generated source — and
fails closed on stale base Draft checksums.

The S1 `employee-submit` scenario was amended to state only the
review-entry guarantee: fixture-derived transitions carry no capability
effects, so the plan-built Draft records audit events on approve/reject
(effect-declared) but not on the fixture-added submit. Surfaced as a
known limitation on every alternative.

S2 state stays `implementing` for PM advancement.

### 2026-08-08 — S1 Discuss mode implemented

`apps/workbench/lib/golden-path/discuss-model.ts` (+ 11 tests) delivers the
bounded Discuss state machine: deterministic Expense Approval clarification
set (approval threshold, manager role, audit trail, multi-level approval),
immutable answering with explicit deferral, fail-closed unresolved-required
questions that block Plan, and a deterministic starter requirement fixture
reproducible without AI. Discuss cannot mutate a Draft — the module exports
no Graph or Draft surface; the only output is a schema-valid
RequirementSpecV1 (asserted at build time, sha256-able for plan binding).

The workbench suite was red at dispatch with two stale count tables
(expense-approval 6→7, restaurant-ordering 18→20, simple-ecommerce 16→18)
caused by accepted Foundry recipe growth after 2026-08-02. Fixed in
`bf73cdf`; full workbench 84/84 green, typecheck and prettier clean.

S1 state stays `implementing` for PM advancement.

### 2026-08-08 — Plan and roadmap

The approved design's `Required-Plan: pending design review` is satisfied:
`docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md` defines
eight test-first slices (S1-S8) over the verified existing surface; the
roadmap gains the **P1 Product Closure gate** ahead of the Foundry breadth
gates. S1 begins now.

## Completion marker

`GOAL_COMPLETE` requires the complete Expense Approval browser journey and the
generated application to pass acceptance: Discuss -> RequirementSpec -> plan
alternatives -> visual Graph Diff -> Draft -> role/data simulation -> Publish
-> Compile -> isolated verification -> preview and cleanup, with the
Workbench build, focused component tests, control-plane composition tests,
compiler tests, and Expense browser E2E green from a clean checkout, and all
slices committed and pushed.
