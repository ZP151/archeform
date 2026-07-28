# CUI-02 Compact Project Context & Inspectable Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make long project context compact but accessible, lifecycle stages discoverable on narrow screens, and Build evidence visibly inspectable without weakening the v1.2 Console contract.

**Architecture:** `ConsoleWorkspace` keeps the existing project/stage/evidence state and API calls. CSS compacts only presentation; evidence retains its right Sheet and artifact API. Tests assert semantic information, geometry, focus, and responsive behavior rather than snapshotting old copy.

**Tech Stack:** Next.js 15.5.21, React 19.2.7, frozen Factory UI Kit v1.2, Playwright, Python unittest.

## Global Constraints

- Preserve `factory-ui-kit/v1.2`, the existing overlay matrix, Sheet semantics,
  local proxy/API behavior, and all generated application packages/assets.
- Change only the ledger-authorized Console workspace/CSS and source/browser
  tests; no dependency, contract, or canonical asset change.
- Preserve closed/count-first evidence, bounded diagnostics/downloads, and all
  keyboard focus/overlay behavior.

---

### Task 1: Deliver compact context, narrow-stage discovery, and inspectable evidence

**Files:**

- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css`
- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**

- Consumes: existing `Project`, lifecycle stage state, `Run.artifacts`, and
  `FactorySheet`/`FactoryIconAction` behavior.
- Produces: accessible full project context, compact evidence rows with visible
  basename + labelled download action, and responsive stage discovery.

- [ ] **Step 1: Add failing source and browser regressions.**

  Add a long-name fixture and assert the switcher is truncated visually but has
  the full accessible name. At 390, 560, and 768 px, assert all stage controls
  can be discovered/focused without document overflow. Assert Build evidence is
  absent until opened, then shows `component-lock.json` visibly beside a compact
  labelled download control.

  ```js
  assert.equal(await page.getByRole('button', { name: longProjectName }).count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: /Open build evidence, 1 artifacts/i }).click();
  assert.equal(await page.getByText('component-lock.json', { exact: true }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Download component-lock.json' }).count(), 1);
  ```

- [ ] **Step 2: Run RED evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: current evidence rows expose only icon controls, current narrow
  geometry/copy lacks the new compact-context assertions, and stale Brief copy
  remains present.

- [ ] **Step 3: Implement the minimal presentation changes.**

  Give the project switcher its full name through `aria-label` and `title` while
  CSS preserves one-line ellipsis. Make stage navigation horizontally
  discoverable at 390/560/768 without hiding a stage. Render each evidence item
  as a visible basename plus compact `FactoryIconAction` download control;
  retain the artifact URL only inside the existing download handler. Remove only
  the audited redundant Brief-context copy, not inputs, presets, notices, or
  workflow labels.

- [ ] **Step 4: Verify layout and focus preservation.**

  Re-run the focused tests. Confirm evidence Escape restores the count-first
  trigger, Command/Stop/Products/Evidence/Lineage retain their existing focus
  behavior, and all stage controls remain focusable/discoverable at each target
  viewport.

- [ ] **Step 5: Run full gates and hand off.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node --check apps/web/app.js
  git diff --check
  ```

  Record exact results, target viewport observations, full-name accessibility,
  visible evidence filenames, focus restoration, residual risks, and changed
  paths in the ledger before task review.

## Self-review

- The task maps each audit conclusion to one allowed path and regression:
  project context, 390/560/768 stages, visible/accessible evidence, Brief-copy
  removal, and layout/focus preservation.
- No task step authorizes a v1.2 asset, overlay/API, or generated-package change.

## Execution handoff

Execute only through the paired ledger with `/root` as the sole integration
writer. Task review, QA, and independent release review remain required before
PM acceptance.
