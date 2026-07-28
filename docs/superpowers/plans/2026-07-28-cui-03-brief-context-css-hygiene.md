# CUI-03 Brief-context CSS Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the now-unreachable Brief-context panel CSS without changing a live Console behavior or the accepted CUI-02 interaction model.

**Architecture:** This is a CSS-only dead-code removal. The source test treats the rendered Console TSX as the authority for which Brief selectors are live, while Browser checks re-exercise the existing lifecycle and overlay interactions instead of adding a second implementation path.

**Tech Stack:** Next.js 15.5.21, React 19.2.7, frozen Factory UI Kit v1.2, Python unittest, Playwright.

## Global Constraints

- Modify only `apps/console-next/app/globals.css` and
  `tests/api/test_console_ui_sources.py`; all other production paths are
  frozen for this slice.
- Preserve live Brief composer selectors: `brief-workbench`, `brief-composer`,
  `brief-form`, `brief-name-row`, `brief-editor`, `brief-editor-footer`, and
  `brief-presets`.
- Remove only `.brief-context-panel`, `.brief-context-list`, and
  `.brief-context-foot` declarations, including their dark and responsive
  variants.
- Preserve CUI-02 and the accepted overlay matrix: Products left, Evidence
  right, Command and Stop center, Lineage floating.
- Do not add dependencies, alter Factory UI package identities, touch generated
  packages, or reformat unrelated CSS.
- `/root` is the sole writer. Do not run browser/build harnesses concurrently.

---

### Task 1: Prove and remove dead Brief-context CSS

**Files:**

- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `apps/console-next/app/globals.css`
- Update on completion only: `docs/superpowers/ledgers/cui-03-brief-context-css-hygiene.md`

**Interfaces:**

- Consumes: `ConsoleWorkspace`'s live Brief-composer class names and the
  established CUI-02 workflow/browser tests.
- Produces: an explicit source guard against restoring unused Brief-context
  CSS, with unchanged public Console behavior.

- [ ] **Step 1: Add the failing CSS-source regression.**

  Add this test method to `ConsoleUiSourcesTests`:

  ```python
  def test_console_has_no_dead_brief_context_panel_css(self) -> None:
      css = (ROOT / "apps" / "console-next" / "app" / "globals.css").read_text(encoding="utf-8")
      workspace = (ROOT / "apps" / "console-next" / "components" / "console-workspace.tsx").read_text(encoding="utf-8")

      for selector in (".brief-context-panel", ".brief-context-list", ".brief-context-foot"):
          self.assertNotIn(selector, css)
          self.assertNotIn(selector.removeprefix("."), workspace)
      for live_selector in (".brief-workbench", ".brief-composer", ".brief-form", ".brief-editor", ".brief-presets"):
          self.assertIn(live_selector, css)
  ```

- [ ] **Step 2: Run RED evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources.ConsoleUiSourcesTests.test_console_has_no_dead_brief_context_panel_css -v
  ```

  Expected: FAIL because `globals.css` still contains the obsolete selectors.

- [ ] **Step 3: Delete exactly the stale declarations.**

  In `globals.css`, delete the complete declaration groups for:

  ```css
  .brief-context-panel { ... }
  .brief-context-list { ... }
  .brief-context-foot { ... }
  .dark .brief-context-panel { ... }
  @media (...) { .brief-context-panel ... .brief-context-list ... .brief-context-foot ... }
  ```

  Retain the adjacent live Brief composer rules exactly. Do not alter
  `.brief-workbench` to compensate for this deletion: CUI-02 already supplies
  its single-column override.

- [ ] **Step 4: Run GREEN source evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  ```

  Expected: PASS, including the new no-dead-CSS guard and all CUI-02 source
  checks.

- [ ] **Step 5: Run behavioral and release gates serially.**

  ```powershell
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  npm --prefix apps/console-next run preflight
  $env:FACTORY_CONSOLE_DIST_DIR = '.next-cui03-verify'; npm --prefix apps/console-next run build
  node --check apps/web/app.js
  git diff --check
  ```

  Confirm Browser evidence still covers the Brief flow, right Evidence sheet,
  left Products sheet, center Command/Stop sheets, floating Lineage and focus
  restoration. If Next normalises `tsconfig.json`, restore only its accepted
  `include` list after every owned browser/build process exits, then rerun
  `git diff --check`.

- [ ] **Step 6: Hand off for review.**

  Record the exact RED/GREEN and gate output, changed paths, live selectors
  retained, and residual risks in the ledger. Request task review; do not
  self-accept or change the ledger state.

## Self-review

- The sole removal target is the CUI-02-audited unreachable context panel.
- The new source guard detects all selector forms and asserts live Brief
  composer styles survive.
- Existing Browser tests, not snapshots, demonstrate the user-facing Console
  remains functional and retains the overlay model.

## Execution handoff

Execute via `docs/superpowers/ledgers/cui-03-brief-context-css-hygiene.md`.
After the single writer reports GREEN evidence, task review, QA, and an
independent release review are required before PM acceptance.
