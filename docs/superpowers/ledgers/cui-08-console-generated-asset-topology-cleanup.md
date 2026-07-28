# Task Ledger: CUI-08 Console/Generated Asset-Topology Cleanup

- **State:** implementing
- **Owner:** pm
- **Single write owner:** `/root/cui08_asset_topology_frontend_engineer` —
  sole `frontend` writer within the listed allowed paths.
- **Specialization:** frontend (serialized candidate Console/source-boundary
  work; no parallel Console/generated writer).
- **Contract owner:** integration
- **Contract status:** Controller-authorized writer materialization;
  `docs/contracts/factory-ui-asset-topology-v1.md` must be created and frozen
  by Task 1 before candidate source changes begin. Any requested contract
  expansion returns ownership to integration and pauses this writer.
- **Plan:**
  `docs/superpowers/plans/2026-07-28-cui-08-console-generated-asset-topology-cleanup.md`
- **Approved governance:** Founder-delegated Controller authorizes this
  candidate-only cleanup. It adds no dependency, API, data contract, runtime,
  deployment topology, generated-output contract, or Golden promotion.

## Outcome

Create a distinct Console-only `factory-ui-console@1.6.0` candidate that
removes generated-application selector residue from Console CSS and has a
byte-verified live Console map, while proving all current generated
application distributions remain independent, immutable, and runnable.

## Non-goals

- No edit, hash refresh, relabel, promotion, or retirement of Console 1.4 or
  1.5, their manifests, or their replay evidence.
- No edit to any canonical generated `factory-ui` root, generated component
  package, generated CSS/template, sidecar, lock, Composer scaffold, generated
  output, API, Planner, Registry, Composer, Executor, or control plane.
- No new dependency, icon source, framework, route, API, data model, model
  call, cloud target, publication, release, or deployment.
- No selector alias, runtime stylesheet rewrite, or generated application
  fallback to Console CSS.

## Acceptance criteria

1. `docs/contracts/factory-ui-asset-topology-v1.md` explicitly names Console
   1.6, generated 1.4, the exact three-file live map, selector ownership,
   immutable roots, and fail-closed rejection IDs.
2. `factory-ui-console@1.6.0` is a distinct canonical candidate with a
   truthful three-file inventory and a live Console map that is byte-identical
   to it; Console 1.4 and 1.5 retain their exact pre-task bytes.
3. Candidate/live Console CSS contains no `.fp-`, `.fp-app`, or generated
   approval-product distribution selector/comment block. Console CSS retains
   accepted Console behavior and safe Lineage presentation.
4. Generated canonical/package roots remain byte-identical and their current
   verifier evidence passes. Generated source/sidecar/template scans contain
   no `factory-ui-console`, `apps/console-next`, or Console-version reference.
5. Console preflight/build, workflow E2E, accessibility E2E, generated
   approval-app E2E, and generated composable-preview E2E pass; the latter
   demonstrate generated flows run without Console stylesheet reliance. At
   1440×900 and 1280×720, repeated Restore and Close → Open cycles prove every
   rendered Lineage node rectangle and transformed edge endpoint remains in
   the current canvas.
6. Task review, QA, and independent release review find no unresolved P0/P1.
   Acceptance never promotes candidate 1.6 to Golden or makes it eligible for
   generated-app selection, release, or deployment.

## Safety and contract invariants

- Candidate 1.6 is a Console-only distribution and cannot satisfy a generated
  `factory-ui` dependency.
- Existing generated assets are read-only inputs; a discovered required change
  to any generated asset blocks this task and requires a separate governed
  generated-asset slice.
- The topology contract may only describe source ownership and verification;
  it cannot become executable selector rewriting or a runtime asset resolver.
- Existing Products-left/Evidence-right/Command-and-Stop-center/Lineage-
  floating matrix, keyboard/focus behavior, themes, reduced motion, and
  Lineage safe-data boundary remain frozen.

## Allowed write paths after implementation is authorized

```text
docs/contracts/factory-ui-asset-topology-v1.md
packages/ui-kit/factory-ui-console/1.6.0/**
apps/console-next/components/factory-ui/factory-ui.css
apps/console-next/components/factory-ui/tokens.css
apps/console-next/components/factory-ui/factory-ui.tsx
apps/console-next/components/factory-ui/lineage-dag.tsx
tools/factory_ui_kit.py
tests/api/test_factory_ui_kit.py
tests/api/test_console_ui_sources.py
tests/web/console-next-e2e.mjs
tests/web/console-next-accessibility.mjs
tests/web/generated-approval-app-e2e.mjs
tests/web/generated-composable-preview-e2e.mjs
docs/superpowers/ledgers/cui-08-console-generated-asset-topology-cleanup.md
```

QA is read-only by default. Only after writer hand-off, QA may change one of
the four listed browser tests when fresh evidence demonstrates a regression;
QA may not change the contract, asset roots, verifier, or ledger state.

## Required evidence and gates

### Writer hand-off

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
node tests/web/generated-approval-app-e2e.mjs
node tests/web/generated-composable-preview-e2e.mjs
git diff --check
```

The hand-off records exact RED/GREEN output, candidate/live digest evidence,
immutable Console/generated pre/post snapshots, generated-source scan results,
browser/Docker cleanup evidence, changed paths, and residual risks.

### Task review

Read-only review verifies contract completeness, candidate identity, exact
live map, selector boundary, historic/generated immutability, source scans,
browser evidence, scope, and no implicit promotion. It additionally verifies
the Controller-approved `LineageDag` exception is epoch-safe, post-size-commit
only, preserves selection, and proves repeated Restore/Close → Open containment
at both required viewports. P0/P1 returns to the same writer.

### QA and release review

QA independently repeats all hand-off commands, including Console and
generated browser behavior. Independent release review repeats the identity,
source, build, browser, cleanup, repeated lifecycle, and diff checks, then
confirms no generated asset or topology scope drift. PM alone records
`reviewed → accepted` after both have no unresolved P0/P1.

## PM decision log

- **2026-07-28:** Founder-delegated Controller authorized CUI-08 as the next
  smallest frontend slice after CUI-07. PM created this plan/ledger in
  `planned` state only. No code, product asset, contract, or generated source
  was modified by this planning action.
- **2026-07-28:** Controller approves CUI-08 execution without a further
  founder decision. PM advances `planned → implementing` and assigns
  `/root/cui08_asset_topology_frontend_engineer` as the sole frontend writer.
  The exact allowed paths, generated-asset immutability, candidate-only
  status, and integration-owned contract-expansion stop rule remain unchanged.
- **2026-07-28:** Read-only task review passed with no P0/P1. Controller
  approves independent QA and PM advances `implementing → ready_for_qa`.
  Candidate 1.6 remains non-Golden and no release, deployment, or generated
  application selection is implied.
- **2026-07-28:** Independent release review found a P1 intermittent Lineage
  geometry failure. PM moves CUI-08 `ready_for_qa → implementing` and
  returns ownership to the same sole writer,
  `/root/cui08_asset_topology_frontend_engineer`, for systematic-debugging and
  TDD repair. CUI-08 is not accepted; 1.6 remains candidate-only/non-Golden.
- **2026-07-28:** Controller approves the minimum P1 scope expansion:
  `apps/console-next/components/factory-ui/lineage-dag.tsx` only. It is a
  Console presentation lifecycle file outside the frozen three-file asset map.
  The writer may implement only an epoch-safe post-ResizeObserver refit after
  React Flow size commit and the repeated Restore/Close → Open containment
  regressions. No other asset, API, generated application, or scope change is
  authorized.
- **2026-07-28:** Read-only review of the P1 repair passed with no P0/P1/P2.
  Controller approves fresh independent QA and PM advances
  `implementing → ready_for_qa`. Pre-repair QA evidence is superseded for
  acceptance purposes: QA must rerun the complete mandated gates, including
  repeated Lineage stability, before a new release review. Candidate 1.6
  remains Console-only/non-Golden.
- **2026-07-28:** Fresh QA failed with two P1 blockers. PM returns CUI-08
  `ready_for_qa → implementing` for the same-owner 1280×720 Lineage
  lifecycle failure. A separate governed generated-app auth/navigation P1
  task is required for the independently failing generated browser gate.
  CUI-08 cannot be accepted or promoted until both its own repeated Lineage
  gate and its required generated-app gate are green.

## Task review — read-only

- **Result:** PASS; no P0/P1 findings.
- **Verified scope:** Candidate `factory-ui-console@1.6.0` is isolated from
  immutable Console 1.4/1.5 and generated assets; the topology contract,
  exact three-file live map, selector boundary, historic identity checks, and
  Console/generated behavior gates conform to the task card.
- **P2 advisory — deferred:** Expand the static generated-reference scan to
  cover Composer scaffold sources in a later, separately governed
  asset-topology cleanup. The current slice intentionally treats Composer
  scaffold assets as immutable and did not change generated behavior.
- **P2 advisory — deferred:** Two pre-existing isolated temporary Console
  copies remain outside this candidate slice. They are test-harness artifacts,
  not source/product changes, and must be handled only under the separate
  isolated-runner cleanup policy.
- **Disposition:** Hand-off is accepted for independent QA. Neither task
  review nor QA authorizes Golden promotion or generated-asset changes.

## QA assignment — independent

- **Authority:** Controller-approved after task-review PASS.
- **Write authority:** QA is read-only by default. After fresh evidence of a
  gap, QA may modify only one of the four browser test paths already listed in
  this ledger; it may not modify source assets, the topology contract, the
  verifier, generated packages, or ledger state.
- **Required evidence:** Independently rerun the API identity/source suite,
  Console preflight/build/workflow/accessibility gates, generated
  approval-app/composable-preview browser gates, and diff check. Verify the
  live candidate contains no generated selector residue, generated assets have
  no Console dependency/reference, Console 1.4/1.5 and generated roots remain
  immutable, and isolated cleanup stays within validated temporary copies.

## QA result — independent

- **Result:** PASS; no P0/P1 findings.
- **Fresh evidence:** QA passed the CUI-08 API identity/source gate and the
  full API suite: `py -3.12 -m unittest discover -s tests/api -v` —
  219/219 passed in 309.489s. It also passed the required Console preflight
  and production build, Console workflow/accessibility browser gates, and
  generated approval-app/composable-preview browser gates, followed by
  `git diff --check`.
- **Boundary evidence:** Candidate 1.6/live three-file identity remained
  verified; Console CSS had no generated selector residue; Console 1.4/1.5
  and generated roots remained immutable; and generated sources/packages did
  not acquire a Console CSS/key/path/version dependency. Existing Console
  interaction and generated role-aware workflow evidence remained green.
- **Disposition:** CUI-08 remains `ready_for_qa` pending independent release
  review. QA PASS does not accept, promote, release, deploy, or make
  `factory-ui-console@1.6.0` eligible for generated-app selection.

## Release-review authorization — independent

- **Authority:** Controller authorization for the candidate-only CUI-08
  correction is already recorded; no further founder decision is needed.
- **Reviewer scope:** Independently inspect all CUI-08 changed paths and
  rerun the full API identity/source and required browser/build/diff gate.
  Reconfirm selector separation, exact live/candidate mapping, historic and
  generated-asset immutability, generated application independence, isolated
  cleanup containment, and no dependency/API/runtime/generated-output or
  promotion scope expansion.
- **Stop condition:** An unresolved P0/P1 returns the issue to
  `/root/cui08_asset_topology_frontend_engineer`; otherwise report the
  read-only release result to PM. Only PM may reconcile it and advance this
  ledger to `reviewed` or `accepted`.

## Release review — failed

- **Result:** FAIL — P1, intermittent Lineage Restore containment overflow
  at 1440×900.
- **Exact evidence:** The first fresh
  `node tests/web/console-next-e2e.mjs` run failed in
  `tests/web/console-next-e2e.mjs` lines 556–559: after Restore, at least one
  rendered Lineage node/edge endpoint exceeded the 1440×900 canvas bounds.
  An immediate rerun passed. This is a nondeterministic failure, not a waiver:
  the required lifecycle guarantee is deterministic containment.
- **Required repair:** The same CUI-08 writer must first use
  `.agents/skills/systematic-debugging` to reproduce/minimize the Restore
  lifecycle race and retain diagnostic evidence. Then use TDD to add a
  deterministic regression that repeats Restore and Close → Open containment
  at 1440×900 and 1280×720 (including actual node rectangles and transformed
  edge endpoints) sufficiently to expose the prior flake. The
  Controller-approved `lineage-dag.tsx` exception must use an epoch-safe
  post-ResizeObserver refit after React Flow size commit. Repair only within
  the existing CUI-08 allowed paths plus that one exception; do not widen the
  source map, modify generated assets, or promote 1.6.
- **Re-entry gate:** Before task re-review, the writer records the root cause,
  RED/GREEN command evidence, and repeated deterministic success for Restore,
  Close → Open, and 1280×720/1440×900 containment. QA and release review
  must then rerun the repeated lifecycle checks. Any further P0/P1 follows
  the existing same-writer repair loop.

## P1 repair task review — read-only

- **Result:** PASS; no P0/P1/P2 findings.
- **Verified scope:** The repair is confined to the Controller-approved
  `lineage-dag.tsx` presentation-lifecycle exception and its repeated browser
  regression. It retains the immutable three-file asset map, source topology,
  generated-asset boundary, graph data, selection, API, and candidate-only
  status.
- **Required next gate:** The prior release failure invalidates earlier QA for
  acceptance. Fresh independent QA must rerun all required source/identity,
  build, Console workflow/accessibility, generated-app/composable-preview,
  cleanup, and diff gates; it must additionally prove at least five complete
  Restore/Close → Open containment cycles at 1440×900 and at least three at
  1280×720 before any new release review is authorized.

## QA assignment — P1 repair rerun

- **Authority:** Controller-approved after P1 repair task-review PASS.
- **Write authority:** QA is read-only by default. It may modify only a listed
  browser regression path when fresh evidence demonstrates a defect; it may
  not alter `lineage-dag.tsx`, any asset, contract, verifier, generated
  package, or ledger state.
- **Mandatory command and behavior gate:**

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  py -3.12 -m unittest discover -s tests/api -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  git diff --check
  ```

  QA must independently measure every rendered node rectangle and transformed
  edge endpoint in the current Lineage canvas for at least five
  maximize → Restore → measure → Close → Open → measure cycles at 1440×900,
  then at least three identical cycles at 1280×720. It records per-cycle
  node/edge counts, confirms selection/focus/overlay invariants, and reports
  isolated cleanup evidence. A passing single rerun is insufficient.

## QA result — P1 repair rerun failed

- **Result:** FAIL — two P1 blockers; no acceptance or promotion.
- **P1 / same-owner CUI-08:** At 1280×720, repeated Restore cycle 3 produced
  11 rendered Lineage nodes outside the current canvas. This violates the
  required deterministic containment rule. The same
  `/root/cui08_asset_topology_frontend_engineer` returns to
  systematic-debugging/TDD under the existing epoch-safe `lineage-dag.tsx`
  exception; task review, QA, and release review must repeat the mandated
  five 1440×900 and three 1280×720 cycles after a repair.
- **P1 / external generated-app dependency:**
  `tests/web/generated-composable-preview-e2e.mjs:344` independently failed
  its signed-out keyboard-exposure assertion. This is a generated application
  authentication/navigation boundary, outside CUI-08's immutable-generated
  scope. It must not be repaired by changing CUI-08 Console/topology assets.
  Founder-delegated Controller authorizes a separate high-priority governed
  generated-app auth/navigation investigation and repair task.
- **Disposition:** CUI-08 remains `implementing` but is blocked from
  acceptance until its own deterministic Lineage repair and the required
  generated-app gate both pass in fresh QA and release review. Candidate 1.6
  remains Console-only/non-Golden.

## Writer hand-off — 2026-07-28

### RED → GREEN

- **RED:** `py -3.12 -m unittest tests.api.test_factory_ui_kit
  tests.api.test_console_ui_sources -v` failed as intended before materialization:
  the 1.6 candidate manifest/CSS and topology contract were absent.
- **GREEN:** the same focused suite passes **40/40** after materializing the
  candidate, exact live map, source contract, source guards, and stable
  `console_candidate_copy_digest_mismatch` denial.
- **Regression discovered and repaired:** the first Console workflow run
  consistently failed after Restore Lineage: React Flow nodes escaped the
  compact canvas. Root cause was not a graph change: the old 1.5 global marker
  had accidentally supplied `box-sizing` to the still-1.5 Lineage subtree.
  The minimal Console-owned 1.6 rule `.lineage-dag, .lineage-dag * {
  box-sizing: border-box; }` replaces that accidental generated-residue
  coupling. A focused source assertion was RED, then GREEN; the original
  workflow now proves 17 nodes and 16 edges contained at both 1440×900 and
  1280×720 through maximize/restore.

### Candidate/live identity and immutable evidence

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| 1.6 `factory-ui.css` | `ea6a1d579ccbbff49f3a127a2605eaa72fb58393246564042b47a62f66b02b0e` | exact live match |
| 1.6 `tokens.css` | `d5993a5b2286fc9e781088649a18dc2218cd7d00b848deb3c0c7d25759b3a55a` | exact live match |
| 1.6 `react/factory-ui.tsx` | `d842891897ecf73e95bf9fe45112f0122f2f7ecc32c4a72f188e95ef3c3cb7a5` | exact live match |
| 1.4 Console CSS/tokens/React | `6963c4c683f96e4ae2391e4df5618eeb4465a4894f66b0b5149e653dfcbdf885`, `d5993a5b2286fc9e781088649a18dc2218cd7d00b848deb3c0c7d25759b3a55a`, `ae2fafb256fd4c26d3ec41f26baa2e46fdd9f16cde258808f5ab00ed79cf43bb` | unchanged |
| 1.5 Console CSS/tokens/React | `a9537aeab65c81daf2a56d0196c4ef127edfcac15e1ca2ebc8b02d0496a34923`, `d5993a5b2286fc9e781088649a18dc2218cd7d00b848deb3c0c7d25759b3a55a`, `b5511a600144ee0a168e00a0554fb33e172def61fa05926dc739d177b0ae0111` | unchanged |

The expanded source scan covered all 27 declared generated roots (canonical
1.0/1.3/1.4 and package 2.1/2.2/2.3 families): **0** occurrences of
`factory-ui-console` or `apps/console-next`. Candidate/live Console CSS has
0 `.fp-`, `.fp-app`, or generated-distribution-comment occurrences.
`generated-composable-preview-e2e.mjs` now also rejects those two Console
identifiers from every materialized generated output before Docker/browser
proof begins.

### Fresh writer verification

```text
py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v  -> PASS (40/40)
npm --prefix apps/console-next run preflight                                -> PASS
npm --prefix apps/console-next run build                                    -> exit 0
node tests/web/console-next-e2e.mjs                                         -> PASS
node tests/web/console-next-accessibility.mjs                               -> PASS
node tests/web/generated-approval-app-e2e.mjs                               -> exit 0
node tests/web/generated-composable-preview-e2e.mjs                         -> exit 0
git diff --check                                                            -> PASS
```

The generated composable gate materializes leave and expense applications,
validates the shared candidate package locks, runs their role-aware
submit/approve/audit browser flow in local Docker Compose, and tears down
containers and volumes. The named generated-approval gate delegates to that
canonical proof. No user-owned service was targeted.

### Changed paths

```text
docs/contracts/factory-ui-asset-topology-v1.md
packages/ui-kit/factory-ui-console/1.6.0/**
apps/console-next/components/factory-ui/factory-ui.css
apps/console-next/components/factory-ui/factory-ui.tsx
tools/factory_ui_kit.py
tests/api/test_factory_ui_kit.py
tests/api/test_console_ui_sources.py
tests/web/generated-composable-preview-e2e.mjs
docs/superpowers/ledgers/cui-08-console-generated-asset-topology-cleanup.md
```

### Residual risks

- Candidate 1.6 remains Console-only and is not Golden, selectable by the
  generated-app Registry, releasable, or deployable.
- `LineageDag` remains outside the frozen three-file map and retains its
  prior 1.5 marker; the new explicit Console-owned `.lineage-dag` boundary
  prevents that marker from importing generated CSS semantics. Changing that
  unrelated component marker requires a separately governed source-map slice.
- At writer hand-off, QA, task review, release review, and PM state
  transitions remained pending. Task review and QA later passed; the current
  release-review P1 is recorded above and blocks acceptance.

## P1 writer repair hand-off — 2026-07-28

- **Root cause:** Restore changes the compact Lineage canvas dimensions while
  React Flow is processing its own size observation. The old single animation
  frame could call `fitView` for the pre-commit expanded viewport; the compact
  canvas then retained that transform and rendered node rectangles/edge
  endpoints outside its visible bounds.
- **RED:** With the original single-frame lifecycle and the new repeated
  1440x900 regression, `node tests/web/console-next-e2e.mjs` deterministically
  failed on `1440x900 repeated restore 1`: component rectangles began at
  approximately `left=743, top=806` and continued below the compact canvas,
  which is an actual rendered containment failure rather than a model-layout
  assertion.
- **Repair:** The Controller-approved `lineage-dag.tsx` exception now uses a
  monotonically increasing epoch, cancels both pending animation-frame handles,
  re-reads nonzero current canvas dimensions, and calls `fitView` only after
  two animation-frame turns. A stale ResizeObserver/transition callback cannot
  apply after a newer epoch or after unmount. Selection, graph data, edge data,
  package mapping, and generated sources are unchanged.
- **Regression:** `assertLineageCanvasContainsRenderedGraph` now awaits an
  explicit rendered-settled condition: at least 17 nodes and 16 edges exist,
  every DOM node rectangle is inside the current canvas, and both
  `getScreenCTM()`-transformed endpoints of every edge are inside. It has no
  fixed sleep. The workflow performs five total Restore/Close->Open cycles at
  1440x900 (one baseline plus four repeated) and three at 1280x720.
- **GREEN evidence:**

  ```text
  node tests/web/console-next-e2e.mjs                         -> PASS twice
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
                                                              -> PASS (40/40, 0.176s)
  npm --prefix apps/console-next run preflight                -> PASS (5.6s)
  npm --prefix apps/console-next run build                    -> PASS
  node tests/web/console-next-accessibility.mjs               -> PASS
  node tests/web/generated-approval-app-e2e.mjs               -> exit 0
  node tests/web/generated-composable-preview-e2e.mjs         -> exit 0
  git diff --check                                            -> PASS
  ```

  Each successful workflow run reported 17 nodes and 16 edges at both
  1440x900 and 1280x720. Its isolated owned runner logged
  `degraded-tree-termination` only after exact spawned-root absence and
  validated temporary-copy removal; no user-owned service was targeted.
- **P1-only changed paths:**

  ```text
  apps/console-next/components/factory-ui/lineage-dag.tsx
  tests/web/console-next-e2e.mjs
  docs/superpowers/ledgers/cui-08-console-generated-asset-topology-cleanup.md
  ```

- **Residual risk:** This is still a Console-only presentation lifecycle
  exception outside the frozen three-file asset map. Candidate 1.6 remains
  non-Golden, non-selectable by generated applications, unreleased, and
  undeployed. The PM, task reviewer, QA, and release reviewer must independently
  rerun the repeated lifecycle gate before any state transition.

## P1 lifecycle re-repair hand-off — 2026-07-28

- **New RED evidence:** Fresh QA found 11 Lineage nodes outside the 1280x720
  compact canvas on repeated Restore cycle 3. The earlier epoch/two-frame
  strategy was insufficient because browser-frame ordering is not a reliable
  representation of a controlled React Flow layout transition.
- **Root cause:** Selecting a component inserts the compact selection summary,
  reducing canvas height. React Flow can then report `nodesInitialized=false`
  during the controlled node-data refresh even though all 17 nodes are visibly
  rendered. The old viewport therefore remained calculated for the prior
  330px-height canvas while the current canvas was 296px tall. Fresh diagnosis
  observed matching DOM/React Flow root dimensions of `858x296`, a retained
  `scale(0.637931)` transform, and approximately 17px overflow above and below
  the current canvas. This is a concrete stale-viewport condition, not an
  arbitrary timing failure.
- **Repair:** `LineageDag` now observes the actual canvas geometry, invalidates
  superseded work by epoch, and derives the next React Flow viewport from the
  current rendered `.react-flow__node` bounds and current canvas rectangle.
  It centers and scales the graph to a fixed visible inset using the current
  viewport as the coordinate transform. It never relies on a later
  `nodesInitialized` transition, guesses a delay, mutates graph data, or
  modifies generated assets. The stale internal-height fit cannot survive a
  Restore or selection-height transition.
- **GREEN evidence:** Three fresh executions of
  `node tests/web/console-next-e2e.mjs` passed. Each execution includes five
  complete 1440x900 Restore/Close->Open cycles and three complete 1280x720
  cycles, checking 17 rendered node rectangles, 16 edge paths, and both
  `getScreenCTM()` endpoint transforms against the current canvas each time.
  The current source/identity gate passed 40/40; the production build and
  accessibility gate passed. The owned temporary Console runner was cleaned
  only after exact spawned-root absence.
- **Changed paths for this re-repair:**

  ```text
  apps/console-next/components/factory-ui/lineage-dag.tsx
  tests/web/console-next-e2e.mjs
  docs/superpowers/ledgers/cui-08-console-generated-asset-topology-cleanup.md
  ```

- **External blocker retained:** CUI-08 did not modify or retry-repair the
  separate generated-app signed-out keyboard/auth/navigation P1. CUI-08 cannot
  be accepted until that governed task and fresh end-to-end QA are green.
