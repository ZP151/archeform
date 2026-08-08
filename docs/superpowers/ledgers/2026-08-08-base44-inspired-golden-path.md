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
| S7    | Mode shell UI, lineage canvas, browser E2E acceptance | implementing | 395ca36a | workbench 222/222; capabilities 356/356; graph 190/190; adapters 34/34; control-plane 184/184; compiler-worker 183/183; compiler 332/332; browser E2E green (2.3m, incl. cleanup proof) |
| S8    | Clean-checkout acceptance + gates + close | implementing | 89bd684 | clean clone: build 10/10; workbench 222/222; graph 190/190; capabilities 356/356; adapters 34/34; compiler-worker 183/183; control-plane 184/184; compiler 332/332; E2E green (2.1m); acceptance gates reviewed |

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

### 2026-08-08 — S7 Mode shell UI, lineage canvas, browser E2E acceptance

The workbench gains the mode-shell wiring over the S1-S6 pure models:
`components/golden-path/` renders the four-mode shell (Discuss -> Plan ->
Build -> Release) with the immutable Draft lifecycle, the lineage canvas
(`lineage-model.ts` + tests) derives Draft lineage purely from the
control-plane evidence (Application Graph revisions, asset locks,
verification/preview runs), and `apps/workbench/app/api/` hosts the
mode-boundary routes. The client journey model (`journey-model.ts` +
tests, `polling.ts` + tests) drives the browser E2E acceptance over the
immutable lifecycle: Discuss -> RequirementSpec -> plan alternatives ->
visual Graph Diff -> Draft -> role/data simulation -> Publish -> Compile ->
isolated verification -> preview and cleanup.

Delivery fixes that made the journey pass end-to-end:

- **Worker credentials and host networking** (`infra/docker-compose.yml`):
  the compiler-worker runs with `network_mode: host` and publishes Redis on
  127.0.0.1 so the verification probes' hardcoded `http://127.0.0.1:${port}`
  resolves inside the container; ephemeral credentials are generated per
  `compose:up` and never committed.
- **Seed contract fix** (`packages/capabilities`): the Expense Approval
  starter graph template now declares the deterministic `expense-fixture-01`
  seed record (`renderPrismaSeed` renders `graph.domain.seedData` into the
  generated app's migrate-time seed). Before this, the compiled app booted
  with an empty seed and every record-bearing verification transition
  (employee submits, manager approves) failed closed with 403
  "Record 'expense-fixture-01' was not found". The verifier registries and
  role journeys are unchanged; the acceptance fixture's manual seed add
  became redundant and was removed.
- **Pre-existing parity drift re-baselined** (documented decision, per the
  frozen parity contract): accepted recipe-growth commits after the
  2026-08-06 digest freeze changed the simple-ecommerce / retail-counter /
  grocery-pickup starter graphs and added two selections per default
  composition. Proven pre-existing via git stash on the clean tree, then
  re-baselined: `database-target-parity.test.ts` and
  `documentation-target-parity.test.ts` digests updated (restaurant and
  expense-approval byte-identical to the freeze), and
  `composition-compilation.test.ts` selection counts 18 -> 20 /
  16 -> 18 with the decision noted in-file.
- **Pure-TS sha256** (`packages/graph/src/sha256.ts` + tests) so digest
  computation needs no Node crypto import in browser contexts.
- **Journey timeline wiring** (`apps/workbench/lib/golden-path/journey-model.ts`):
  `updateRelease`/`startRelease` now merge the release's own evidence
  timeline (publish -> compile -> verify -> boot -> cleanup) into the
  journey timeline once per stage (`releaseTimelineMerged` cursor, reset
  when a Draft Diff restarts the release). The browser E2E asserts exactly
  this evidence trail on the timeline; without the merge the journey UI
  showed only discuss/plan/build/simulate events and the journey could not
  pass acceptance.
- **Bounded control-plane bootstrap retry**
  (`apps/workbench/components/workbench.tsx`): the mount-time bootstrap ran
  once and wedged the shell in `offline` when the page loaded while the
  control plane was still booting (Nest starts cold with the compose stack,
  ~60s after `compose:up` returns). The mount effect now retries on a
  bounded schedule (2s apart, 45 attempts) — safe because
  `bootstrapLocalDraft` is idempotent (GET-first, create-on-404) — and the
  browser E2E's first wait covers the full cold-boot window. One new
  focused component test drives the retry with fake timers (two refusals
  then success); the shell shows "Control Plane unavailable" while retrying
  and flips to "Control Plane ready" when the plane accepts connections.
- **Eventually-consistent cleanup proof** (`e2e/golden-path.spec.ts`): the
  stop endpoint transitions the preview run to `stopping` and enqueues the
  worker job, which then tears down the compose project (containers,
  network, volumes) and removes the copied preview directory seconds later.
  The E2E now polls for the terminal resource-free state (120s bound)
  instead of asserting immediately after the stop request returns — run 13
  showed the teardown completing moments after the earlier instant
  assertion failed.

**Browser E2E acceptance (2026-08-09):** the complete Expense Approval
browser journey passes end-to-end (2.3m): app creation -> Discuss ->
RequirementSpec -> plan alternatives -> visual Graph Diff -> Draft (token
and layout adjustments) -> role/data simulation with recorded
authorization denial -> one-action publish -> compile -> isolated
verification -> generated-app preview -> Stop preview -> docker-level proof
that the preview project's containers, network, volumes, and worker
artifact directory are removed. The generated preview is a real
application (`main.generated-app`, no Puck studio), never the Workbench.
Run 13 exercised the exact cold-start race the bootstrap retry was built
for and passed the entire journey; run 14 is fully green including the
cleanup poll.

Evidence: workbench full 222/222 (golden-path lib + components 139/139);
capabilities 356/356; graph 190/190; adapters 34/34; control-plane 184/184;
compiler-worker 183/183; compiler 332/332 (incl. re-baselined parity +
composition suites); browser E2E green (see above). S7 state stays
`implementing` for PM advancement.

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

### 2026-08-09 — S8 Clean-checkout acceptance + gates + close

**Clean-checkout verification** (fresh clone of
`feat/governed-composition-capability-foundry` @ `89bd684`, frozen lockfile):
`pnpm install --frozen-lockfile` -> `pnpm --filter @factory/control-plane
prisma:generate` (the committed build depends on generated Prisma client
types; the Dockerfile already runs this step) -> `pnpm build` (turbo
10/10, incl. the workbench production `next build`). Then, in the clean
tree: workbench 222/222; graph 190/190; capabilities 356/356; adapters
34/34; compiler-worker 183/183; control-plane 184/184; compiler 332/332
(committed single-fork pool config). The Expense browser E2E from the
clean checkout passes (2.1m) against the compose stack built from the same
committed source.

One environment note: the control-plane vitest suite is load-fragile under
full parallelism on this machine (tinypool worker stack-overflow crash —
the same class the compiler config documents and pins); an isolated run is
green. Pinning the forks pool for the control-plane suite is recorded as a
gap below.

**Acceptance-gate self-review** (per the design's gates): the complete
journey completes without editing source or manually assembling capability
locks (E2E, twice green incl. clean checkout); Discuss cannot mutate a
Draft and Build requires an accepted, checksum-bound plan (S1/S3 focused
tests, fail-closed on tampered checksums); the default generated product is
coherent in light and dark themes (deterministic Experience System token
defaults) — an automated a11y audit of the generated app remains a gap;
role simulation proves allowed and denied journeys before Publish (S4
tests + the E2E's recorded `authorization-denial` evidence); only a
Published Graph compiles and the isolated verifier passes before the
preview is marked ready (S6 release model + E2E ordering); failure produces
bounded evidence and a reviewable Draft Diff without mutating immutable or
generated artifacts (S5 timeline + release-model Draft Diff, unit-covered);
no sensitive material in persisted state, evidence, screenshots, or reports
(bounded timeline schema, env-only credentials, E2E reports carry none);
and every required suite is green from a clean checkout (this record).

**Remaining gaps**: (1) no automated accessibility audit (axe-class) over
the generated application in the E2E — the Experience System declares the
states and themes, the generated preview renders, but the declared
accessibility checks are not yet asserted at the browser level; (2) the
failed-verification -> reviewable Draft Diff -> next revision path is
unit-covered but not exercised end-to-end in the browser journey (no
failure injection in the E2E); (3) the control-plane vitest suite should
pin the forks pool like the compiler does, so full-parallelism runs are
deterministic on this machine; (4) the journey UI reports completion when
the stop request is accepted; the terminal teardown is proven by the E2E
cleanup poll (eventually-consistent by design). The `2026-08-08` plan,
adaptive-requirement-interview, and archeform-brand documents remain
uncommitted by explicit exclusion.

**Recommended next goal (P1 post-closure)**: a hardening round before
resuming Foundry breadth — (a) browser-level accessibility assertions over
the generated Expense Approval app (light/dark theme toggle + declared
contrast/focus checks), (b) an E2E scenario driving a failing verification
through the reviewable Draft Diff to the next immutable revision, and (c)
pin the control-plane vitest pool. After hardening, resume the roadmap's
Foundry breadth gates (100+ recipe catalogue, twelve compiled anchors).

S8 state stays `implementing` for PM advancement.

## Completion marker

`GOAL_COMPLETE` requires the complete Expense Approval browser journey and the
generated application to pass acceptance: Discuss -> RequirementSpec -> plan
alternatives -> visual Graph Diff -> Draft -> role/data simulation -> Publish
-> Compile -> isolated verification -> preview and cleanup, with the
Workbench build, focused component tests, control-plane composition tests,
compiler tests, and Expense browser E2E green from a clean checkout, and all
slices committed and pushed.
