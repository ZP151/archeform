# Factory UI Kit 1.2 Console Visual Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified Console-only `factory-ui@1.2.0` that closes the approved visual-accessibility gaps without changing generated UI 1.0/2.1 assets or the 1.1 rollback.

**Architecture:** Copy the verified 1.1 canonical asset to a new immutable 1.2 root, apply ADR-014 visual/accessibility changes, and materialize the complete Console copy from 1.2. The verifier recognizes 1.2 for Console while proving 1.1 rollback and generated 1.0 isolation. One integration writer owns the canonical, Console, verifier, and browser-test boundary.

**Tech Stack:** Python 3.12, Next.js 15.5.21, React 19.2.7, Radix UI 1.4.3, `@xyflow/react` 12.11.2, Lucide 0.474.0, Playwright.

## Global Constraints

- ADR-014 and frozen `factory-ui-kit/v1.2` govern this work.
- Preserve 1.0 and generated `ui.*@2.1.0` byte-for-byte; keep 1.1 complete and
  verifiable as the only Console rollback identity.
- Preserve `effectiveModal = modal ?? side !== 'floating'`; only Lineage opts
  into explicit modal/clear behavior.
- No dependency, API/data, Registry, Composer, generated-app, or topology
  change is permitted.

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/ui-kit/factory-ui/1.2.0/**` | Canonical 1.2 asset, manifest, digests, primitives, fixtures, and tests. |
| `apps/console-next/components/factory-ui/**` | Exact controlled Console 1.2 distribution. |
| `apps/console-next/components/console-workspace.tsx`, `app/globals.css` | Compact evidence/rail/Lineage presentation without dead owners. |
| `tools/factory_ui_kit.py`, `tools/console_next_intake.py` | Console 1.2 copy verification plus 1.1 rollback/generated-1.0 proof. |
| focused API and Console browser tests | Source, computed-style, reduced-motion, viewport, and focus regressions. |

---

### Task 1: Build the canonical 1.2 Console visual-accessibility successor

**Files:**

- Create: `packages/ui-kit/factory-ui/1.2.0/**`
- Modify: `apps/console-next/components/factory-ui/**`
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css`
- Modify: `tools/factory_ui_kit.py`, `tools/console_next_intake.py`
- Modify: `tests/api/test_factory_ui_kit.py`, `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-e2e.mjs`, `tests/web/console-next-accessibility.mjs`

**Interfaces:**

- Consumes: frozen `factory-ui-kit/v1.2`, ADR-014, the CUI-01 overlay matrix,
  1.1 verified Console rollback, and generated 1.0 identity.
- Produces: verified Console 1.2 copy, source/browser regressions, and explicit
  1.1 rollback/generated-1.0 isolation proof.

- [ ] **Step 1: Write failing source and browser assertions.**

  Add source negatives for dead `.build-evidence-peek`, rendered disabled
  Settings/Help, non-compact secondary actions, Console-copy drift, and a
  generated 1.1/1.2 reference. Add browser checks for desktop computed styles,
  reduced motion, and Lineage bounds/focus at 390 and 560 px.

  ```js
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.build-evidence-peek').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Console settings' }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  ```

- [ ] **Step 2: Run RED evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit -v
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: failures for absent 1.2 identity/verification, dead CSS, missing
  computed-style/reduced-motion/390/560 evidence, and unavailable rail controls.

- [ ] **Step 3: Materialize 1.2 and Console presentation changes.**

  Clone 1.1 into canonical 1.2, apply only ADR-014 changes, regenerate manifest
  digests, and copy the complete 1.2 Factory UI distribution into Console. Add
  the reduced-motion policy, remove only proven-dead evidence-card rules, hide
  the unavailable rail controls, and retain bounded evidence/download/diagnostic
  behavior plus text on primary/destructive actions.

- [ ] **Step 4: Bind verification and prove rollback/isolation.**

  Bind Console verification to exact 1.2, retain a temporary-copy proof that
  verified 1.1 rollback works, and reject a 1.1/1.2 Console mix or any generated
  1.1/1.2 declaration. Do not modify 1.0, generated assets, or their locks.

- [ ] **Step 5: Run GREEN evidence and hand off.**

  Run the ledger's required verification gate. Record computed-style values and
  contrast calculations, reduced-motion values, 390/560/desktop Lineage bounds,
  focus restoration, source-copy/rollback negatives, exact command output, and
  residual risks before task review.

## Self-review

- The task covers every ADR-014 requirement: 1.2 exact copy, light/dark
  computed styles, reduced motion, 390/560 Lineage, dead evidence CSS removal,
  compact accessible actions, hidden disabled rail controls, 1.1 rollback, and
  generated-1.0 isolation.
- No task path permits a frozen 1.0/1.1/generated mutation or a new dependency.

## Execution handoff

Execute only through the paired ledger with `/root` as the single integration
writer. Task review, QA, and independent release review are required before PM
acceptance.
