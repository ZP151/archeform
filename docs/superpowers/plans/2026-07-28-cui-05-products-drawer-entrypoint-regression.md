# CUI-05 Products Drawer Entrypoint Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the existing left Products drawer behavior across the rail,
topbar, and Command entry points without changing the overlay implementation.

**Architecture:** This is test-first Console regression coverage. The existing
three actions already set one `projectsOpen` state and one `FactorySheet` owns
the left drawer. Add source assertions for that shared ownership and browser
assertions that independently exercise each opener and preserve the complete
overlay/focus matrix. No layout code is changed unless the new evidence exposes
an actual divergence.

**Tech Stack:** Existing Next.js Console, Factory UI Kit 1.2, Playwright,
Python unittest; no new dependency.

## Global Constraints

- Preserve the exact matrix: Products left; Evidence right; Command/Stop center;
  Lineage floating with its established modal/focus behavior.
- Do not modify Factory UI assets/CSS, API/proxy, generated UI, packages,
  Registry/Composer/Executor, command model, or project-selection behavior.
- The E2E harness owns its isolated server/output; stale manual `127.0.0.1`
  state is not evidence. Do not stop/delete an unknown founder server/output.

---

### Task 1: Add and prove the three-entry-point drawer regression

**Files:**

- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs` only if a focused opener-
  specific keyboard/focus proof is not already expressible in workflow E2E.
- Modify only if RED proves a behavior divergence:
  `apps/console-next/components/console-workspace.tsx`

**Interfaces:**

- Consumes: existing `projectsOpen`, `setProjectsOpen`, `#open-products-trigger`,
  `.console-project-switcher`, Command `open-products` item, and the one
  `FactorySheet(side="left", title="Products")`.
- Produces: source/browser evidence that every opener reaches the same left
  drawer and existing matrix/focus behavior remains intact.

- [ ] **Step 1: Write RED source and browser assertions.**

  Require one left `FactorySheet` tied to `projectsOpen`, a topbar handler that
  opens that state, and a command item that opens that state. Then exercise all
  three runtime paths:

  ```js
  async function expectProductsFrom(opener, expectedFocus) {
    await opener.click();
    const drawer = page.getByRole('dialog', { name: 'Products' });
    await drawer.waitFor();
    const box = await drawer.boundingBox();
    assert.ok(box && box.x < 24);
    await drawer.getByRole('button', { name: 'Close Products' }).click();
    await drawer.waitFor({ state: 'hidden' });
    await page.waitForFunction((selector) => document.querySelector(selector) === document.activeElement, expectedFocus);
  }
  ```

  Invoke it for `#open-products-trigger`, `.console-project-switcher`, and
  Command's `Open products` option. After the Command path, assert no Command
  dialog remains visible.

- [ ] **Step 2: Run RED evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  ```

  Expected: source/test coverage is incomplete for topbar runtime parity; no
  production behavior claim is made before this independent evidence exists.

- [ ] **Step 3: Implement only an evidence-proven repair.**

  If all new tests pass without source changes, do not modify production code.
  If a path diverges, route it to the existing `setProjectsOpen(true)` action
  and keep the sole `FactorySheet` left with existing restore-focus semantics.
  Do not introduce a second Products drawer or change a sheet side.

- [ ] **Step 4: Run GREEN matrix and stale-build verification.**

  Run the ledger gate. Confirm the default harness starts an owned child server
  and deletes only its own output. If a manual view differs, record URL, HTTP
  status, and child-process/output ownership; validate against an owned harness
  or governed launcher before diagnosing UI behavior. Never kill an unknown
  process or remove a broad directory.

- [ ] **Step 5: Hand off.**

  Record exact opener/focus/geometry observations, source changes (or explicit
  no-production-change result), stale-build diagnostic result, commands, and
  residual risks. Request read-only task review, QA, and release review before
  PM acceptance.

## Self-review

- The plan adds missing topbar parity evidence without duplicating/replacing the
  existing Products state or changing the accepted overlay matrix.
- The stale-build rule distinguishes a bad server/output from a UI regression
  and avoids unsafe process/output cleanup.

## Execution handoff

Execute through the paired ledger, now `implementing`, with `/root` as the
single integration writer. Retain the existing Console isolation contract and
hand off to task review, QA, and independent release review.
