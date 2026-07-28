# Task Ledger: CUI-07 Lineage Containment and Responsive Layout

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root/cui07_lineage_layout_engineer` — sole
  `frontend` writer within the listed allowed paths.
- **Specialization:** frontend
- **Contract owner:** integration
- **Contract status:** frozen; CUI-07 adds no API/data/generated-output
  contract and may not alter the accepted Console 1.4 contract.
- **Frozen interaction invariants:**
  `docs/contracts/factory-ui-console-v1.3.md` overlay/focus/lifecycle
  invariants carry forward; accepted CUI-06 behavior is baseline evidence.
- **Plan:**
  `docs/superpowers/plans/2026-07-28-cui-07-lineage-containment-responsive-layout.md`
- **Approved governance:** Founder-delegated Controller authorizes this
  candidate-only Console correction. No new dependency, public API, data
  contract, runtime, or deployment topology is authorized.

## Outcome

Create an immutable Console-only 1.5 candidate that renders a 14-package
Product Lineage graph completely inside a responsive floating canvas and
continues to support keyboard inspection, focus-safe overlays, and controlled
narrow-view behavior.

## Non-goals

- No mutation of accepted `factory-ui-console@1.4.0`, generated `factory-ui`,
  component packages, API/proxy, Planner, Registry, Composer, Executor, or
  fixture contract.
- No new dependency, lockfile, package, icon source, runtime, route, cloud
  target, model behavior, graph persistence, graph editing, or generated-app
  Lineage surface.
- No raw brief, model text, credential, token, path, URL, package source, or
  artifact body exposure in the graph.
- No overlay-direction redesign: Products remains left; Evidence remains right;
  Command and Stop remain centered.

## Acceptance criteria

1. `factory-ui-console@1.5.0` exists as a distinct candidate canonical root
   with a complete exact inventory; live Console mapped files match it byte for
   byte. Accepted 1.4 remains independently verifiable and unmodified.
2. A fixture plan containing exactly 14 approved components renders every
   node once, in existing deterministic domain/lexical order, without a summary
   node or truncation.
3. At 1280×720 and 1440×900, every React Flow node rectangle and both screen-
   transformed endpoints of every edge path are inside the Lineage canvas.
   The assertion repeats after viewport resize and Close → Open refit.
4. Desktop compact Lineage is bottom-right, wider for the four-column asset
   band, and no taller than 50vh. At narrow widths, Lineage uses controlled
   safe-inset full-window/refit behavior with no document horizontal overflow.
5. Selected node kind/label/detail/status, `aria-pressed`, keyboard activation,
   maximize/restore preservation, modal containment, Escape/Close focus return,
   themes, reduced motion, and existing lifecycle/overlay matrix remain green.
6. Task review, QA, and independent release review report no unresolved P0/P1;
   no candidate promotion is implied by passing tests.

## Safety invariants

- The graph derives exclusively from existing typed `Project`, `Version`,
  `Plan`, `Run`, and approved `plan.components` values through the existing
  safe-label/kind allowlist.
- `fitView`/ResizeObserver only change local client presentation and must never
  persist state, select packages, call an API, or change lifecycle authority.
- Candidate 1.5 is not Golden and is not eligible for generated application
  selection or production promotion under this ledger.
- A dependency/API/contract/package/generated-output scope change stops the
  task and returns ownership to integration.

## Allowed write paths

The assigned CUI-07 writer may modify only:

```text
packages/ui-kit/factory-ui-console/1.5.0/**
apps/console-next/components/factory-ui/factory-ui.css
apps/console-next/components/factory-ui/tokens.css
apps/console-next/components/factory-ui/factory-ui.tsx
apps/console-next/components/factory-ui/lineage-model.ts
apps/console-next/components/factory-ui/lineage-node.tsx
apps/console-next/components/factory-ui/lineage-dag.tsx
apps/console-next/app/globals.css
tools/factory_ui_kit.py
tests/api/test_factory_ui_kit.py
tests/api/test_console_ui_sources.py
tests/web/console-next-e2e.mjs
tests/web/console-next-accessibility.mjs
docs/superpowers/ledgers/cui-07-lineage-containment-responsive-layout.md
```

QA may modify only `tests/web/console-next-e2e.mjs` and
`tests/web/console-next-accessibility.mjs` after writer hand-off. PM alone
changes this ledger state.

## Required evidence and gates

### Writer hand-off

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
git diff --check
```

The hand-off includes focused RED evidence for missing 1.5 identity and an
out-of-canvas 14-package node/edge endpoint, followed by GREEN measurement
results at 1280×720, 1440×900, resize, reopen, maximize/restore, and narrow
full-window viewports.

### Task review

Read-only reviewer verifies immutable 1.4 preservation, exact candidate/live
copy binding, post-layout refit timing, actual geometry measurement (not only
model coordinates), safe node content, overlay/focus behavior, and scope.
P0/P1 returns to the same writer; no second writer starts.

### QA gate

QA independently reruns the full writer command set and verifies every node
rect and transformed edge endpoint against the rendered canvas at both desktop
viewports. QA also verifies selected-node keyboard behavior, 390px controlled
full window, no horizontal overflow, and unchanged Products/Evidence/Command/
Stop placement. QA may add only evidence-backed focused browser regressions.

### Release gate

Independent reviewer repeats source/identity, preflight/build, workflow,
accessibility, and diff checks; inspects all changed paths; and reports no
unresolved P0/P1 before PM may move `reviewed → accepted`.

## PM decision log

- **2026-07-28:** Created in `planned` state. Founder-delegated Controller
  authorizes the candidate-only CUI-07 correction without a further founder
  decision, subject to the frozen scope and required review/QA/release gates.
- **2026-07-28:** Controller approval authorizes implementation. PM advances
  CUI-07 `planned → implementing` and assigns
  `/root/cui07_lineage_layout_engineer` as the single writer. Candidate-only
  scope, frozen invariants, allowed paths, and task-review/QA/release gates
  remain unchanged.
- **2026-07-28:** Read-only task review passed with no P0/P1 findings.
  Controller approval advances CUI-07 `implementing → ready_for_qa` and
  assigns independent QA. QA must rerun the stated command set and validate
  actual rendered node rectangles and transformed edge endpoints at 1280×720
  and 1440×900, including resize and Close → Open refit; it must also
  validate the 390px controlled full-window/no-horizontal-overflow behavior
  and the frozen keyboard, focus, overlay-direction, and selection invariants.
- **2026-07-28:** Independent QA passed with no P0/P1/P2 findings. Independent
  release review then passed with no P0/P1. PM records the governed state
  transitions `ready_for_qa → reviewed → accepted`. This accepts only the
  Console 1.5 candidate correction; it does not promote
  `factory-ui-console@1.5.0` to Golden or authorize release/deployment.

## Writer hand-off — `/root/cui07_lineage_layout_engineer`

- **Candidate boundary:** Created the distinct
  `factory-ui-console@1.5.0` canonical candidate with inventory-locked CSS,
  tokens, and React primitive. The mapped live Console files are byte-equal to
  that candidate. Focused tests independently verify the unchanged 1.4
  CSS/tokens/React hashes and reject a tampered 1.5 live copy.
- **RED evidence:** Before implementation,
  `py -3.12 -m unittest tests.api.test_factory_ui_kit
  tests.api.test_console_ui_sources -v` produced the expected missing-1.5
  canonical errors plus the expected failure for absent four-column model
  markers. The initial build also exposed the React Flow instance generic
  mismatch; the root cause was an unparameterized instance type, corrected by
  binding the ref and ReactFlow to the existing typed Lineage node and Edge
  types.
- **Implementation:** The model retains safe fields and deterministic
  domain/lexical ordering but places assets in four columns. The read-only DAG
  now schedules zero-duration post-layout `fitView` through a typed React Flow
  ref on initialization, graph/compact/maximize changes, and a canvas
  `ResizeObserver`; it cancels queued frames and disconnects on cleanup. CSS
  gives desktop Lineage a bounded 860px bottom-right window and a deterministic
  safe-inset full window at <=700px. No selection, graph data, lifecycle, API,
  or overlay-direction behavior changes.
- **GREEN evidence:**
  - `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v` — 37/37 passed.
  - `npm --prefix apps/console-next run preflight` — passed.
  - `npm --prefix apps/console-next run build` — passed.
  - `node tests/web/console-next-e2e.mjs` — passed. A 14-package fixture
    measured 17 total graph nodes and 16 SVG edges; every node rectangle and
    both screen-transformed endpoints of every edge were inside the canvas at
    1440x900 initial, reopen, maximize, restore, and 1280x720 resize.
  - `node tests/web/console-next-accessibility.mjs` — passed, including
    390px keyboard selection, safe selected-node status, no document overflow,
    reachable controls, Escape, and trigger-focus restoration.
  - `git diff --check` — exit 0 (only the existing non-blocking CRLF notice
    for `apps/console-next/tsconfig.json`).
- **Residual risks:** Candidate 1.5 is deliberately not Golden/promoted. The
  isolated browser runner reported its authorized
  `degraded-tree-termination` cleanup path while removing its exact temporary
  copy; this is existing test-harness behavior, not a Console product change.
  Read-only task review, QA, and independent release review remain required;
  PM alone may advance the ledger state.

## Task review — read-only

- **Result:** PASS; no P0/P1 findings.
- **Scope checked:** immutable Console 1.4 preservation; exact 1.5
  candidate/live binding; deterministic 14-package rendering; post-layout
  `fitView` timing and cleanup; real rendered geometry rather than model-only
  coordinates; safe node content; overlay/focus behavior; and allowed-path
  compliance.
- **Disposition:** The writer hand-off is accepted for independent QA only.
  Candidate 1.5 remains non-Golden and no promotion or release decision is
  implied.

## QA assignment — independent

- **Authority:** Controller-approved after task-review PASS.
- **Write authority:** QA is read-only by default and may modify only the
  two explicitly assigned browser regression paths if fresh evidence exposes
  a gap: `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs`.
- **Required evidence:** Re-run every command in the QA gate, independently
  measure all node rectangles and both transformed endpoints of every edge at
  1280×720 and 1440×900, repeat after resize and Close → Open, and verify
  the 390px full-window/no-horizontal-overflow path. Preserve and verify
  selected-node keyboard behavior, focus return, modal containment, themes,
  reduced motion, and Products-left/Evidence-right/Command-and-Stop-center
  placement.

## QA result — independent

- **Result:** PASS; no P0, P1, or P2 findings.
- **Evidence reviewed:** QA independently re-ran the required CUI-07
  preflight, build, browser workflow, browser accessibility, source-identity,
  and diff checks. It verified actual rendered geometry—every Lineage node
  rectangle and both screen-transformed endpoints of every edge—inside the
  canvas at 1280×720 and 1440×900. The same checks passed after viewport
  resize and Close → Open refit.
- **Responsive and interaction evidence:** QA passed the 390px controlled
  full-window path with no document horizontal overflow, keyboard
  selected-node inspection, focus restoration, modal containment, themes,
  reduced motion, and the frozen Products-left/Evidence-right/Command-and-
  Stop-center placement.
- **Disposition:** CUI-07 remains `ready_for_qa` pending the independent
  release-review result. Candidate `factory-ui-console@1.5.0` remains
  non-Golden; QA PASS neither promotes it nor authorizes a release.

## Release-review authorization — independent

- **Authority:** Controller approval already recorded for this CUI-07
  candidate-only correction; no further founder decision is required.
- **Reviewer scope:** Independently inspect every changed path and repeat the
  source/identity, preflight, build, 14-package geometry, resize/reopen,
  narrow viewport, workflow, accessibility, and diff checks. Confirm the
  accepted Console 1.4 remains immutable and CUI-07 did not expand into a
  dependency, contract, runtime, generated-output, or promotion change.
- **Stop condition:** Any unresolved P0/P1 returns ownership to
  `/root/cui07_lineage_layout_engineer`; otherwise report a read-only release
  result to PM. Only PM may reconcile that result and advance the ledger.

## Release review — independent

- **Result:** PASS; no P0/P1 findings.
- **Fresh root evidence:**
  - `py -3.12 -m unittest tests.api.test_factory_ui_kit
    tests.api.test_console_ui_sources -v` — 37/37 passed.
  - `npm --prefix apps/console-next run preflight` — passed.
  - `npm --prefix apps/console-next run build` — passed.
  - `node tests/web/console-next-e2e.mjs` — passed with actual containment
    of 17 nodes and 16 edges; the authorized isolated runner recorded
    `degraded-tree-termination` during temporary-copy cleanup.
  - `node tests/web/console-next-accessibility.mjs` — passed.
  - `git diff --check` — exit 0.
- **P2 deferred:** Canonical Console CSS still contains scoped
  generated-application selectors inherited from earlier Console assets.
  They are outside CUI-07's Lineage behavior and do not affect this candidate
  acceptance, but require a separately governed asset-topology cleanup.
- **PM acceptance:** CUI-07 is accepted as a candidate-only Console slice.
  Console 1.4 remains immutable and 1.5 remains non-Golden, ineligible for
  generated-application selection, promotion, release, or deployment.
