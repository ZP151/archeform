# CUI-06 Action Canvas and Inspectable Lineage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a sparse, action-first Factory Console workspace and a
compact, ordered, inspectable Product Lineage canvas without changing any
Factory lifecycle, API, package-selection, or generated-application behavior.

**Architecture:** Create `factory-ui-console@1.4.0` as a new immutable
Console-only canonical distribution cloned from verified 1.3 source, then make
the live Console copy byte-identical to it. The first serialized task changes
only Console presentation and interaction composition around the existing
stage state machine. The second serialized task changes only the local
Lineage view model and presentation: it renders every approved plan component
in a deterministic graph, with selection details derived only from the
already-loaded project/version/plan/run objects.

**Tech Stack:** Next.js 15, React 19, Radix UI, `@xyflow/react`, existing
`lucide-react@0.474.0`, existing Factory UI-kit verifier; no new dependency.

## Global Constraints

- The founder delegated internal approvals. This plan is approved for the
  stated Console-only presentation work; it does not authorize a new package,
  API, data, runtime, deployment, or generated-output contract.
- Preserve all existing lifecycle semantics: `brief`, `definition`, `plan`,
  and `build` continue to be selected through the existing `stageItems`, and
  their enabled/disabled and approval/run states remain authoritative.
- Create `packages/ui-kit/factory-ui-console/1.4.0/` and synchronize the live
  Console distribution to it. Never modify the immutable 1.3 canonical asset
  or claim that a generated `factory-ui@1.4.0` asset is the Console asset.
- Preserve the existing overlay matrix: Products left, Evidence right,
  Command and Stop centered, Lineage floating with a separate maximize path.
- Preserve light as the default, the retained dark theme, reduced-motion
  behavior, keyboard containment, Escape/Close focus restoration, and no
  horizontal document overflow at 390px.
- The graph is read-only. It must not expose raw briefs, model text, local
  paths, URLs, credentials, tokens, or arbitrary component source.
- No new npm dependency, no dependency-manifest or lockfile change, no API or
  proxy change, no Composer/generated-package change, and no new ADR/contract
  file belong to this slice.
- Use TDD: write and run the focused RED check before the corresponding
  production change; use `.agents/skills/systematic-debugging` for any
  unexpected failure.

## File Structure and Ownership Boundary

| Path | Responsibility in CUI-06 |
| --- | --- |
| `packages/ui-kit/factory-ui-console/1.4.0/` | New immutable canonical Console-only CSS, tokens, React primitives, and inventory manifest. |
| `apps/console-next/components/factory-ui/factory-ui.tsx` | Live byte-identical React primitive copy, including the unchanged `FactoryStageRail` interface. |
| `apps/console-next/components/factory-ui/factory-ui.css` | Live byte-identical canonical primitive styles. |
| `apps/console-next/components/factory-ui/tokens.css` | Live byte-identical canonical token copy. |
| `apps/console-next/components/console-workspace.tsx` | Existing stage state machine and workspace composition; no mutation/API behavior changes. |
| `apps/console-next/app/globals.css` | Console-only action-canvas, responsive stage-rail, and Lineage presentation rules. |
| `apps/console-next/components/factory-ui/lineage-model.ts` | Deterministic, safe graph ordering and full package-node layout. |
| `apps/console-next/components/factory-ui/lineage-node.tsx` | Keyboard-operable node presentation and selected-state affordance. |
| `apps/console-next/components/factory-ui/lineage-dag.tsx` | Floating/expanded canvas, selected-node inspector, and React Flow configuration. |
| `tools/factory_ui_kit.py` | Exact 1.4 canonical/copy verification; no Registry or Composer behavior. |
| `tests/api/test_factory_ui_kit.py` | Immutable identity and digest-lock regressions. |
| `tests/api/test_console_ui_sources.py` | Source-level guard for lifecycle semantics, action canvas, and Lineage constraints. |
| `tests/web/console-next-e2e.mjs` | Browser workflow, desktop/390px layout, graph order, all-component visibility, selection, and focus proof. |
| `tests/web/console-next-accessibility.mjs` | Keyboard stage navigation, node selection, modal containment, focus return, and reduced-motion proof. |

---

### Task 1: Create Console 1.4 and replace the stage card deck with an action canvas

**Files:**
- Create: `packages/ui-kit/factory-ui-console/1.4.0/factory-ui.css`
- Create: `packages/ui-kit/factory-ui-console/1.4.0/tokens.css`
- Create: `packages/ui-kit/factory-ui-console/1.4.0/react/factory-ui.tsx`
- Create: `packages/ui-kit/factory-ui-console/1.4.0/factory-ui.manifest.json`
- Modify: `apps/console-next/components/factory-ui/factory-ui.css`
- Modify: `apps/console-next/components/factory-ui/tokens.css`
- Modify: `apps/console-next/components/factory-ui/factory-ui.tsx`
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css`
- Modify: `tools/factory_ui_kit.py`
- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes: the frozen `FactoryStageRail` input type
  `Array<{ id: string; label: string; enabled: boolean; state?: string }>`,
  the existing `stageItems`, `stage`, and `setStage` values from
  `ConsoleWorkspace`, and the 1.3 Console source asset.
- Produces: `factory-ui-console@1.4.0`, whose manifest key is exactly
  `factory-ui-console`, whose version is exactly `1.4.0`, and whose three-file
  inventory maps exactly to the live Console copy through `CONSOLE_COPY_MAP`.
  `FactoryStageRail` retains its existing props and continues to render one
  native button per lifecycle stage.
- Does not produce: a new API shape, persisted state, model capability,
  generated-package version, external route, or dependency closure.

- [ ] **Step 1: Write the failing immutable-identity and source-structure tests**

  In `tests/api/test_factory_ui_kit.py`, add constants for
  `packages/ui-kit/factory-ui-console/1.4.0` and assertions with this exact
  intent:

  ```python
  verified = verify_factory_ui_kit(
      CONSOLE_ACTION_CANVAS_CANONICAL,
      CONSOLE,
      expected_key="factory-ui-console",
      expected_version="1.4.0",
  )
  self.assertEqual("factory-ui-console", verified["key"])
  self.assertEqual("1.4.0", verified["version"])
  ```

  Copy the live distribution to a temporary directory, alter only
  `factory-ui.css`, and assert `FactoryUiKitError("console_copy_digest_mismatch")`.
  In `tests/api/test_console_ui_sources.py`, assert that the workspace keeps
  `<FactoryStageRail stages={stageItems}`, does not contain a lifecycle-card
  grid selector such as `repeat(4, minmax(0, 1fr))`, and renders an explicit
  `data-factory-component="active-stage-workspace"` wrapper. Add browser
  expectations for a 1440px desktop and 390px viewport: exactly four stage
  buttons are visible, each has the existing label, only the selected stage
  has `aria-current="step"`, unavailable stages remain disabled, and document
  width never exceeds viewport width.

- [ ] **Step 2: Run focused RED checks**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  ```

  Expected: the new identity assertion fails because the canonical 1.4 root
  and verifier mapping do not exist; the visual/source assertion fails because
  the current workflow rail is still a four-card desktop grid.

- [ ] **Step 3: Materialize the immutable Console-only 1.4 distribution**

  Copy only the three mapped 1.3 canonical source files into the new 1.4
  root. Change every Console marker in the copied CSS and React primitive from
  `1.3.0` to `1.4.0`; retain the same component inventory and `factory-ui-
  console` manifest key. Regenerate the manifest inventory from the exact
  bytes after all Task 1 primitive changes. Update the verifier/test constants
  so it validates the 1.4 canonical root against the live Console copy with:

  ```python
  verify_factory_ui_kit(
      CONSOLE_ACTION_CANVAS_CANONICAL,
      CONSOLE,
      expected_key="factory-ui-console",
      expected_version="1.4.0",
  )
  ```

  Do not alter the verification behavior for historical 1.1/1.2/1.3 or any
  generated `factory-ui` identity.

- [ ] **Step 4: Implement the compact action-first workspace and responsive stage rail**

  In the 1.4 primitive CSS, make the stage rail a connected, compact lifecycle
  strip rather than a row of content cards. Keep the button text, ordinal,
  status, disabled attribute, and `aria-current` semantics. Use the existing
  CSS custom properties only: each stage must remain a low-height marker with
  an ordinal/status sublabel, a visible active accent, and a connecting line
  between non-final desktop markers. Do not use a new icon source or replace
  a stage label with an unlabeled icon.

  In `ConsoleWorkspace`, retain the current `stageItems` computation and
  `onChange={setStage}`. Add the named active-workspace wrapper and use the
  existing `stage`/`stageLabels` values to show only compact context: product
  name, current stage, current state badge, and its actionable work surface.
  Remove static explanatory marketing copy and empty display regions; do not
  remove required form labels, button names, state notices, errors, approval
  controls, artifact filenames, or run controls.

  In `globals.css`, constrain the action canvas to the lifecycle width, make
  the primary form/definition/plan/run work surface visually dominant, and
  keep secondary context in compact metadata. At desktop, stage markers are
  one connected row. At 390px, preserve the four native buttons in a
  horizontally scrollable but non-document-overflowing rail with minimum
  touch/focus targets; do not wrap them into large cards or hide lifecycle
  labels. Keep `prefers-reduced-motion: reduce` free of nonessential rail
  transitions.

- [ ] **Step 5: Synchronize the live distribution and prove GREEN behavior**

  Copy the final 1.4 CSS, token, and React primitive bytes to the three live
  `apps/console-next/components/factory-ui/` mapped paths. Update the lineage
  marker only if necessary so every Console-owned Factory UI marker reads
  `1.4.0`; no generated source is touched. Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  npm --prefix apps/console-next run preflight
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: all tests pass; desktop and 390px preserve all stage labels and
  lifecycle eligibility, light remains default, dark remains operable, and
  Products/Evidence/Command/Stop overlay placement is unchanged.

- [ ] **Step 6: Hand off for the Task 1 reviewer gate**

  Record changed paths, the exact RED/GREEN commands and outputs, viewport
  coverage, and residual visual risks in the ledger without changing its
  state. A read-only task reviewer must find no P0/P1 before the Task 2 writer
  starts. A P0/P1 returns only to this task's assigned writer.

---

### Task 2: Build an ordered, inspectable floating Lineage canvas

**Depends on:** Task 1 GREEN evidence and a Task 1 read-only review with no
unresolved P0/P1. Task 2 is serialized after Task 1 because it changes the
same immutable 1.4 asset, live Console copy, shared Console styles, and
browser tests.

**Files:**
- Modify: `packages/ui-kit/factory-ui-console/1.4.0/factory-ui.css`
- Modify: `packages/ui-kit/factory-ui-console/1.4.0/react/factory-ui.tsx`
- Modify: `packages/ui-kit/factory-ui-console/1.4.0/factory-ui.manifest.json`
- Modify: `apps/console-next/components/factory-ui/factory-ui.css`
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
- Consumes: the existing `toLineageGraph(project, version, plan, run)` input
  types, the existing `FactorySheet` floating/modal behavior, and fields
  already present in `Project`, `Version`, `Plan`, `Run`, and
  `plan.components`.
- Produces: a read-only graph with deterministic order
  `project → definition → plan → run` across the top and *all* approved plan
  components in an ordered asset band below the plan. Selecting a node exposes
  only its safe kind, label, status, and safe identifier/version in a compact
  inspector. Selection remains when toggling compact/maximized view.
- Does not produce: graph editing, persistence, a graph API, a generated
  application graph, raw input/model payload, package source, or a new route.

- [ ] **Step 1: Write failing graph-order and inspectability tests**

  In `tests/api/test_console_ui_sources.py`, add a source guard that requires
  `lineage-model.ts` to sort components by the existing domain order
  `ui.`, `backend.`, `workflow.`, `data.`, `ops.` and then lexical key, and
  forbids the synthetic `+${selected.length - visible.length} more packages`
  node. Require the selected inspection surface to have a stable
  `data-factory-component="lineage-selection"` marker and an accessible
  `role="status"` live region.

  In `tests/web/console-next-e2e.mjs`, build/choose a fixture plan with more
  than four components, open Product Lineage, and assert all fixture component
  keys have a node button. Assert their Y coordinates are below the plan node,
  their X/Y positions are deterministic between two opens, and their order is
  the stated domain/lexical order. Click a component node and assert the
  floating inspector reports the component kind, key, version, and trust/status
  without rendering a raw brief or artifact body. Assert selected state and
  inspector content survive Maximize lineage then Restore lineage.

  In `tests/web/console-next-accessibility.mjs`, focus a graph node, activate
  it using Enter, assert `aria-pressed="true"` and the status inspector is
  announced, then close with Escape and assert focus returns to
  `#open-lineage-trigger`. Repeat the selection path at 390px and assert the
  Close and React Flow controls remain visible with no document overflow.

- [ ] **Step 2: Run focused RED checks**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: the source/browser regressions fail because the current model
  truncates components after four and has no selected-node detail contract.

- [ ] **Step 3: Make the graph complete, deterministic, and safe to inspect**

  In `lineage-model.ts`, keep the existing safe `label()` sanitizer and
  supported-kind allowlist. Replace `visible`/synthetic summary node logic
  with one node per `plan.components` entry. Keep the fixed domain rank and
  lexical key tiebreaker. Place the narrative chain at stable top-row
  coordinates and lay component nodes in a stable two-column asset band below
  the plan: for sorted index `i`, use `x = 184 + (i % 2) * 188` and
  `y = 166 + Math.floor(i / 2) * 92`. Retain `plan -> component` edges only,
  use `smoothstep` asset edges, and assign a consistent edge class that the
  theme can render with a muted base and an active/selected accent.

  Extend only the local `LineageNodeData` view-model type with a safe
  `detail` string. For components it is the already-validated package
  `version`; for project/version/plan/run it is their existing safe identity
  identifier. Do not send this data to the API or persist it. Render `detail`
  only after selection, alongside existing kind/label/status.

  In `lineage-node.tsx`, preserve native button semantics and add the selected
  data attribute/class needed for the graph theme. Node activation remains
  `onSelect(id)` and keyboard activation stays native button behavior.

- [ ] **Step 4: Implement floating-canvas interaction and hierarchy**

  In `lineage-dag.tsx`, keep `FactorySheet` as the floating clear-overlay
  modal. Add a compact inspector strip inside the dialog above the canvas that
  is absent until a node is selected, has
  `data-factory-component="lineage-selection"`, `role="status"`, and shows
  `kind`, `label`, `detail`, and `status`. It must not consume most of the
  compact canvas height. Keep the existing maximize/restore `FactoryIconAction`
  and store selection independently from expansion so it survives toggling.

  In `globals.css` and the 1.4 canonical primitive CSS, make compact Lineage
  an ordered floating work window: bottom-right at desktop, bounded below half
  height, no minimap in compact mode, readable node spacing, and a visually
  distinct straight narrative row with subordinate curved asset edges. Use
  existing tokens; no gradient marketing background, new illustration, or new
  icon dependency. In expanded mode, provide the full canvas with the same
  selected inspector and optional minimap only if it does not obscure the
  selected node or control strip. Preserve 701–900px symmetric insets and
  390px containment/controls established in CUI-05/1.3.

- [ ] **Step 5: Regenerate 1.4 inventory, synchronize, and prove GREEN**

  Regenerate `factory-ui.manifest.json` only from final 1.4 canonical bytes.
  Copy the exact canonical CSS/tokens/React primitive bytes to the live
  Console paths and ensure `verify_factory_ui_kit` still validates only the
  1.4 Console identity. Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  git diff --check
  ```

  Expected: all checks pass; every plan component is represented exactly once
  in a deterministic ordered band, selection is keyboard-accessible and
  retained across maximize/restore, the four overlay directions remain exact,
  and desktop/390px Lineage remains fully usable without horizontal overflow.

- [ ] **Step 6: Complete the hand-off and QA/release gates**

  The writer records changed paths, exact RED/GREEN output, graph order
  fixture values, viewport evidence, and residual risks in the ledger. A
  read-only task reviewer checks Task 2 first. After no unresolved P0/P1,
  QA may modify only the assigned two Console browser test files to add
  evidence-backed regressions. A separate read-only release reviewer runs the
  full CUI-06 gate before PM reconciliation.

## CUI-06 Verification Matrix

| Requirement | Evidence |
| --- | --- |
| Immutable Console successor | `test_factory_ui_kit.py` verifies exact key/version/inventory/live-copy equality and copy drift failure. |
| Action-first lifecycle work | Source guard plus desktop/390px browser test proves four labelled native buttons, active state, disabled eligibility, and no document overflow. |
| Existing workflow preserved | Browser workflow retains create/approve/plan/build gates and existing overlay matrix. |
| Complete graph | Browser fixture with more than four packages proves one node per package and no synthetic summary node. |
| Ordered, legible Lineage | Browser position assertions prove top-row provenance and deterministic domain/lexical component band. |
| Inspectability and keyboard support | Browser accessibility tests prove node activation, `aria-pressed`, status inspector, maximize/restore persistence, modal containment, and focus return. |
| Responsive safety | Browser tests prove 390px, 701–900px, and desktop containment/no horizontal overflow with reachable graph controls. |
| No scope drift | Source/API checks and reviewer confirmation prove no dependency, lockfile, API, control-plane, generated package, or raw-data exposure change. |

## Execution Handoff

The plan is intentionally serialized: assign one `frontend` writer for Task 1,
complete its reviewer repair loop, then assign one `frontend` writer for Task
2. The same individual may own both tasks, but no second writer may edit the
listed production paths while the first task is in `implementing`.

After both tasks are reviewed, QA, release review, and PM reconciliation use
the ledger at
`docs/superpowers/ledgers/cui-06-action-canvas-lineage.md`.
