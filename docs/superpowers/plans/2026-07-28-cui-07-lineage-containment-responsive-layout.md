# CUI-07 Lineage Containment and Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Console-only 1.5 candidate whose Product Lineage graph
contains every node and edge inside its canvas at desktop and responsive
viewports, without mutating accepted Console 1.4 or changing Factory behavior.

**Architecture:** Clone the exact immutable `factory-ui-console@1.4.0`
distribution into a distinct 1.5 canonical root, then synchronize the live
Console copy only to the candidate 1.5 bytes. Keep the existing typed Lineage
inputs and read-only model. Make post-node-layout `fitView` measurable and
repeatable after initialization, resize, reopen, compact/full-window changes,
and maximize/restore. The model lays desktop assets in four columns; CSS gives
the floating desktop canvas a wider bounded window and uses a controlled
full-window responsive surface with refit at narrow widths.

**Tech Stack:** Next.js 15, React 19, `@xyflow/react`, existing ResizeObserver
browser API, existing Factory UI-kit verifier and browser fixtures; no new
dependency.

## Global Constraints

- CUI-07 is a `factory-ui-console@1.5.0` **candidate** only. Never edit,
  rehash, replace, relabel, or otherwise mutate accepted Console 1.4, its
  manifest, its tests, or its replay evidence.
- No API, data, Planner, Registry, Composer, Executor, generated application,
  package lock, dependency, cloud/runtime, model, or control-plane change is
  authorized.
- Preserve the overlay matrix: Products left; Evidence right; Command and Stop
  centered; Product Lineage is the floating/controlled-full-window surface.
- Preserve light-default/dark theme, reduced-motion rules, semantic stage
  lifecycle, Command combobox behavior, selected-node state, keyboard node
  activation, modal focus containment, and Escape/Close focus restoration.
- The graph remains read-only and may expose only existing safe
  kind/label/detail/status values. It must not expose raw briefs, model text,
  paths, URLs, credentials, tokens, package source, or artifact contents.
- Desktop compact Lineage is bottom-right, wider than 1.4 as needed for the
  4-column asset band, and never taller than 50vh. At narrow viewports, it may
  use a deterministic safe-inset controlled full window and must refit after
  the viewport/layout changes.
- Use TDD. An unexpected test or layout result requires
  `.agents/skills/systematic-debugging` before repair.

## File Structure and Candidate Boundary

| Path | CUI-07 responsibility |
| --- | --- |
| `packages/ui-kit/factory-ui-console/1.5.0/**` | New immutable Console-only candidate: CSS, tokens, React primitive, and exact inventory. |
| `apps/console-next/components/factory-ui/factory-ui.{css,tsx}` | Live candidate copy, byte-identical to 1.5 mapped source. |
| `apps/console-next/components/factory-ui/tokens.css` | Live candidate token copy, byte-identical to 1.5 mapped source. |
| `apps/console-next/components/factory-ui/lineage-model.ts` | Four-column deterministic asset positions and safe typed graph data only. |
| `apps/console-next/components/factory-ui/lineage-dag.tsx` | Measured `fitView` lifecycle, resize/reopen refit, compact/full-window state, and selected-node preservation. |
| `apps/console-next/components/factory-ui/lineage-node.tsx` | Existing native node button/selected-state semantics only if source marker or class needs candidate synchronization. |
| `apps/console-next/app/globals.css` | Candidate layout rules for wider desktop floating Lineage and narrow controlled full window. |
| `tools/factory_ui_kit.py` | Exact 1.5 canonical/live copy verification without changing historic 1.4 verification. |
| `tests/api/test_factory_ui_kit.py` | Candidate identity, copy-drift, and historic 1.4 immutability regressions. |
| `tests/api/test_console_ui_sources.py` | Source guards for measured refit, safe responsive mode, and four-column asset layout. |
| `tests/web/console-next-e2e.mjs` | Browser rectangle/edge-endpoint containment at 1280×720 and 1440px, reopen/resize refit, and 14-package fixture. |
| `tests/web/console-next-accessibility.mjs` | Keyboard selection/focus/selected state and narrow full-window accessibility regression. |

---

### Task 1: Build and verify the Console 1.5 candidate lineage canvas

**Files:**
- Create: `packages/ui-kit/factory-ui-console/1.5.0/factory-ui.css`
- Create: `packages/ui-kit/factory-ui-console/1.5.0/tokens.css`
- Create: `packages/ui-kit/factory-ui-console/1.5.0/react/factory-ui.tsx`
- Create: `packages/ui-kit/factory-ui-console/1.5.0/factory-ui.manifest.json`
- Modify: `apps/console-next/components/factory-ui/factory-ui.css`
- Modify: `apps/console-next/components/factory-ui/tokens.css`
- Modify: `apps/console-next/components/factory-ui/factory-ui.tsx`
- Modify: `apps/console-next/components/factory-ui/lineage-model.ts`
- Modify: `apps/console-next/components/factory-ui/lineage-node.tsx`
- Modify: `apps/console-next/components/factory-ui/lineage-dag.tsx`
- Modify: `apps/console-next/app/globals.css`
- Modify: `tools/factory_ui_kit.py`
- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes: current `toLineageGraph(project, version, plan, run)`, existing
  `LineageNodeData`, `FactorySheet` floating modal behavior, and the
  `factory-ui-console@1.4.0` canonical distribution as immutable copy source.
- Produces: a new `factory-ui-console@1.5.0` manifest identity; a live
  Console mapping that verifies only against 1.5 candidate bytes; and a
  `LineageDag` local helper with this behavior:

  ```ts
  const refitLineage = () => {
    flowRef.current?.fitView({ padding: compact ? 0.12 : 0.16, duration: 0 });
  };
  ```

  It runs after React Flow initialization, post-node-layout updates, every
  compact/full-window or maximize/restore transition, ResizeObserver callback,
  and mounted reopen.
- Does not produce: a graph API, new node data from the backend, graph editing,
  a generated-app graph, or a new browser/runtime dependency.

- [ ] **Step 1: Write failing candidate, containment, and responsive tests**

  In `tests/api/test_factory_ui_kit.py`, add assertions that
  `verify_factory_ui_kit` accepts only:

  ```python
  verify_factory_ui_kit(
      CONSOLE_LINEAGE_CANDIDATE_CANONICAL,
      CONSOLE,
      expected_key="factory-ui-console",
      expected_version="1.5.0",
  )
  ```

  Copy `factory-ui-console/1.4.0` before the candidate changes, compare its
  inventory bytes to their recorded values after the candidate work, and prove
  a changed candidate live CSS fails `console_copy_digest_mismatch`.

  In `tests/api/test_console_ui_sources.py`, require all of the following:

  ```text
  data-factory-ui="1.5.0"
  ResizeObserver
  refitLineage
  fitView
  index % 4
  Math.floor(index / 4)
  degraded source does not alter LineageNodeData safe fields
  ```

  In `tests/web/console-next-e2e.mjs`, create a fixture plan with exactly 14
  approved components spanning `ui.`, `backend.`, `workflow.`, `data.`, and
  `ops.`. At 1280×720 and at 1440×900, open compact Lineage and measure the
  canvas bounding rectangle. For every `.react-flow__node`, assert its entire
  bounding rectangle lies inside that canvas. For every
  `.react-flow__edge-path`, transform both `getPointAtLength(0)` and
  `getPointAtLength(path.getTotalLength())` with `path.getScreenCTM()` and
  assert both screen points lie inside the same canvas rect. Repeat after a
  viewport resize and after Close → Open.

  In `tests/web/console-next-accessibility.mjs`, at 390px select a graph node
  with Enter, prove its `aria-pressed="true"` and safe status inspector
  survive the controlled full-window/refit path, then close with Escape and
  prove focus returns to `#open-lineage-trigger` without document overflow.

- [ ] **Step 2: Run focused RED checks**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: 1.5 identity fails before the new canonical asset exists, and the
  14-package browser case reports at least one node or edge endpoint outside
  the current 1.4 canvas.

- [ ] **Step 3: Create the immutable 1.5 candidate and preserve 1.4**

  Copy only the three mapped 1.4 canonical source files into the new 1.5 root.
  Change only candidate marker/version strings to `1.5.0`; do not edit 1.4.
  Regenerate the 1.5 manifest inventory from final candidate bytes, extend the
  verifier mapping/test constants for 1.5, and retain explicit historic 1.4
  verification. Synchronize only the three mapped live Console files from
  candidate 1.5 exact bytes.

- [ ] **Step 4: Implement four-column layout and measured refit lifecycle**

  In `lineage-model.ts`, keep the existing safe kind allowlist, sanitizer,
  narrative chain, and domain/lexical ordering. Replace the asset-band position
  formula with exactly four desktop columns:

  ```ts
  const assetColumn = index % 4;
  const assetRow = Math.floor(index / 4);
  position: { x: 76 + assetColumn * 172, y: 168 + assetRow * 88 };
  ```

  Do not truncate, summarize, or synthesize a `+N more` node. Every approved
  component remains one focusable native node button and selected-node state
  remains keyed by its existing stable node ID.

  In `lineage-dag.tsx`, retain the current `ReactFlow` and selection state.
  Store the initialized React Flow instance in a ref. Implement
  `refitLineage()` with zero-duration `fitView` after a
  `requestAnimationFrame`, then invoke it after graph node changes, after
  compact/full-window and maximize/restore state changes, and from a
  `ResizeObserver` watching the canvas. Disconnect the observer and cancel any
  queued frame on unmount. The same mount logic ensures Close → Open gets a
  post-layout refit. Never clear selection while refitting.

  In candidate primitive CSS and `globals.css`, make desktop compact Lineage a
  bottom-right window wide enough for the four-column band:

  ```css
  @media (min-width: 1101px) {
    .factory-sheet-floating { width: min(860px, calc(100vw - 56px)); height: min(50vh, 400px); }
  }
  ```

  Retain safe desktop right/bottom insets. From 701px through 1100px, preserve
  symmetric insets and refit. At 700px and below, use a safe-inset controlled
  full window (`inset: 12px; width: auto; height: calc(100dvh - 24px)`) and
  refit; do not use a clipped side drawer. Retain visible Close, maximize/
  restore control, React Flow controls, selected inspector, and focus trap.

- [ ] **Step 5: Run GREEN evidence and hand off**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  git diff --check
  ```

  Expected: 14-package node rectangles and transformed edge endpoints remain
  inside canvas at 1280×720 and 1440px before and after resize/reopen; desktop
  floating height is at most 50vh; narrow controlled full window is reachable,
  selected state/focus semantics remain intact, and 1.4 remains independently
  verifiable.

- [ ] **Step 6: Complete governed hand-off**

  Record the exact RED/GREEN output, per-viewport node/edge count, candidate
  identity/copy evidence, 1.4 immutability evidence, and remaining risk in the
  CUI-07 ledger. A read-only task reviewer must report no unresolved P0/P1
  before QA begins. QA may add a focused browser regression only in the two
  assigned browser files. An independent release reviewer reruns the full CUI-
  07 gate before PM acceptance.

## CUI-07 Verification Matrix

| Requirement | Evidence |
| --- | --- |
| 1.4 preserved / 1.5 candidate | Exact 1.5 canonical/live verification plus explicit historic 1.4 inventory verification and copy-drift rejection. |
| 14-package containment | 1280×720 and 1440px browser measurements prove every node rect and every transformed edge endpoint is within canvas. |
| Refit correctness | Same containment proof passes initial mount, resize, Close → Open, and maximize/restore paths. |
| Responsive layout | Desktop bottom-right window is no taller than 50vh; narrow controlled full window has no overflow and reachable controls. |
| Existing behavior | Products/Evidence/Command/Stop direction, selection, keyboard controls, themes, reduced motion, and focus return stay green. |
| Scope containment | Diff/reviewer check confirms no product/API/dependency/package/generated-app/contract change. |

## Execution Handoff

PM assigns one `frontend` writer within the CUI-07 ledger. The task is one
serialized candidate implementation: no parallel writer may touch the listed
paths. Task review, QA, release review, and explicit PM reconciliation are
mandatory before CUI-07 may become accepted. No commit, branch, external
process target, or deployment is implied by this task card.
