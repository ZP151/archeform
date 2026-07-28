# Console Lifecycle and Overlay Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local Console's lifecycle route and transient surfaces compact, deliberate, keyboard-contained, and safe to run beside a founder development server.

**Architecture:** Keep the existing Console state and frozen local-proxy API. `FactoryStageRail` changes only its presentation from equal cards to a connected route; `FactorySheet` gains an explicit modal/clear-overlay behavior so floating Lineage remains visually floating while Radix contains focus. A small local Python launcher owns a unique Next output directory per founder-run, while each E2E harness owns and deletes a separate output directory after its child server exits.

**Tech Stack:** Python 3.12, Next.js 15.5.21, React 19.2.7, Radix Dialog, Playwright, Node.js browser harnesses.

## Global Constraints

- Preserve `console-local-proxy/v1`, `factory-ui-kit/v1`, Registry/trust,
  Composer, Executor, generated-product, and API/data contracts exactly.
- Do not add dependencies or modify `package-lock.json`.
- Light remains the default; existing dark behavior must continue to work.
- The browser receives no capability token, upstream URL, raw brief, model
  response, API key, signing value, or arbitrary command channel.
- Only `/root` is the integration writer; all allowed production/test paths are
  listed in the paired ledger. Do not write outside them.
- A change to a frozen contract stops work and returns it to PM/integration.

## File structure

| Path | Responsibility |
| --- | --- |
| `apps/console-next/components/console-workspace.tsx` | Retain lifecycle state/actions while rendering count-first evidence and supplying the placement contract to each surface. |
| `apps/console-next/components/factory-ui/factory-ui.tsx` | Make sheet modality independent of visual placement; preserve initial focus and focus restoration. |
| `apps/console-next/components/factory-ui/factory-ui.css` | Define bounded left/right/center/floating surface geometry and clear modal overlay behavior. |
| `apps/console-next/app/globals.css` | Replace the lifecycle card grid with a connected route and remove persistent evidence styling. |
| `tools/console_next_dev.py` | Launch a founder-owned Next child with a unique, contained output directory and remove only that directory after child exit. |
| `apps/console-next/package.json` | Route the existing preflight-gated `dev` command through the Python launcher without changing dependencies. |
| `tests/api/test_console_next_dev.py` | Prove unique directory names and launcher cleanup/path containment without starting a real browser. |
| `tests/web/console-next-e2e.mjs` | Prove workflow behavior, overlay geometry, Lineage focus containment, evidence default state, and workflow-harness cleanup. |
| `tests/web/console-next-accessibility.mjs` | Prove keyboard semantics/focus restoration and accessibility-harness cleanup. |

---

### Task 1: Deliver the serialized lifecycle, overlay, and output-isolation refinement

**Files:**

- Create: `tools/console_next_dev.py`
- Create: `tests/api/test_console_next_dev.py`
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/components/factory-ui/factory-ui.tsx`
- Modify: `apps/console-next/components/factory-ui/factory-ui.css`
- Modify: `apps/console-next/app/globals.css`
- Modify: `apps/console-next/package.json`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**

- Consumes: `FactoryStageRail({ stages, value, onChange })`, `FactorySheet`, the
  existing `Run.artifacts` array, `FACTORY_CONSOLE_DIST_DIR`, and the frozen
  local Console proxy.
- Produces: the unchanged stage-action API, a `FactorySheet` that can be
  floating and modal, an accessible evidence trigger with a supplied artifact
  count, `console_next_dev.unique_dist_dir() -> str`, and isolated harness
  cleanup that never touches a reused server.

- [ ] **Step 1: Add failing focused tests for the observable contract.**

  In `tests/web/console-next-e2e.mjs`, first assert that the route is not laid
  out as four equal cards, evidence detail is absent before the trigger is
  activated, the Products/Evidence/Command/Stop/Lineage bounding boxes match
  the placement matrix, and `Tab` from the last Lineage focusable control cycles
  within the dialog rather than reaching a background rail button. In
  `tests/web/console-next-accessibility.mjs`, assert Escape/Close restores the
  initiating control for Products, Command, Evidence, Stop, and Lineage.

  ```js
  assert.equal(await page.locator('.build-evidence-peek').count(), 0);
  assert.equal(await page.getByText('Run diagnostics', { exact: true }).count(), 0);
  await page.getByRole('button', { name: /Open build evidence.*artifacts/i }).click();
  await page.getByRole('dialog', { name: 'Build evidence' }).waitFor();
  ```

  Add `tests/api/test_console_next_dev.py` cases for a generated name matching
  `^\.next-founder-[0-9]+-[0-9a-f]+$`, rejecting a non-Console-root cleanup
  target, and removing a created owner directory after a stub child exits.

  ```python
  self.assertRegex(unique_dist_dir(1234, token_hex=lambda _: 'a1b2c3d4'), r'^\.next-founder-1234-a1b2c3d4$')
  with self.assertRaises(ValueError):
      remove_owned_dist_dir(console_root, console_root.parent / '.next-founder-1-a1')
  ```

- [ ] **Step 2: Run RED evidence and record it in the ledger.**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_console_next_dev -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: the focused assertions fail against the existing card-grid,
  non-modal Lineage, persistent evidence peek, shared/stale accessibility
  directory, and absent founder launcher. Do not change frozen contracts to
  make these tests pass.

- [ ] **Step 3: Implement the compact route and count-first evidence.**

  Keep the existing `FactoryStageRail` props and stage enabled-state logic.
  Replace only the Console-specific equal-card grid with a compact ordered route
  whose CSS connector ends before the final stage; preserve `aria-current="step"`
  and disabled stages. Remove `.build-evidence-peek`; render one visible
  count-first action in the Build heading using `run?.artifacts?.length ?? 0`
  and keep the existing evidence sheet's artifact downloads and diagnostics.

  ```tsx
  <FactoryAction id="build-evidence-trigger" tone="neutral" onClick={() => setEvidenceOpen(true)} disabled={!run}>
    Evidence <span aria-hidden="true">{run?.artifacts?.length ?? 0}</span>
  </FactoryAction>
  ```

  Use an accessible label such as `Open build evidence, 3 artifacts`; do not
  expose artifact paths or diagnostics until the sheet opens.

- [ ] **Step 4: Implement the overlay matrix and bounded Lineage focus loop.**

  Make `FactorySheet` accept an explicit `modal?: boolean` and
  `overlay?: 'dim' | 'clear' | 'none'`; its default remains modal. Do not infer
  modality from `side === 'floating'`. Render a clear overlay for the floating
  modal Lineage surface so it still looks like a work window but Radix blocks
  background pointer/focus interaction. Keep Products left, Evidence right,
  Command/Stop centered, and set Lineage to `side="floating"`, `modal`, and a
  clear overlay. Preserve the active opener for focus restoration.

  ```tsx
  <FactorySheet open={lineageOpen} onOpenChange={setLineageOpen} side="floating" modal overlay="clear"
    title="Product lineage" description="Read-only product-to-package graph.">
    <LineageDag compact project={project} version={version} plan={plan} run={run} />
  </FactorySheet>
  ```

  Define desktop Lineage bounds below the 58px top bar and above the viewport
  bottom, with a width that leaves the focused lifecycle workspace readable.
  Its maximized state must be contained to a viewport inset and must not add a
  minimap. At narrow widths, use viewport insets rather than a fixed left/right
  combination that overflows.

- [ ] **Step 5: Add the founder dev launcher and harness-owned cleanup.**

  Implement `tools/console_next_dev.py` with a pure
  `unique_dist_dir(pid, token_hex)` helper, a root-resolving containment check,
  and a `run(command, console_root)` function. The child environment receives
  a launcher-created `.next-founder-<pid>-<nonce>` in
  `FACTORY_CONSOLE_DIST_DIR`; the parent waits for the child, then removes only
  that directory after confirming it resolves under `apps/console-next` and
  has the expected prefix. Change the `dev` package script to retain the intake
  verifier and invoke the launcher with:

  ```json
  "dev": "python ../../tools/console_next_intake.py verify-console-next --snapshot packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf --lockfile apps/console-next/package-lock.json --console-root apps/console-next && python ../../tools/console_next_dev.py -- node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 5173"
  ```

  Give both browser harnesses a nonce-bearing `.next-test-*` name. In each
  `finally`, close the browser, wait for an owned spawned server to exit, then
  remove only `join(consoleRoot, testDistDir)` with retry; assert its absence.
  When `FACTORY_CONSOLE_REUSE=1`, do not kill a server or remove any directory.

- [ ] **Step 6: Run GREEN evidence and hand off.**

  Run, retaining exact output/counts in the ledger:

  ```powershell
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  py -3.12 -m unittest tests.api.test_console_next_dev -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  node --check apps/web/app.js
  git diff --check
  ```

  The hand-off must list changed paths, RED/GREEN output, desktop and narrow
  placement measurements, each opener's focus-restoration result, founder and
  E2E output-directory evidence, residual risks, and the required next reviewer.

## Self-review

- **Scope coverage:** Task 1 covers the compact connected route, bounded
  keyboard-contained Lineage, count-first closed evidence, all five overlay
  placements, founder output isolation, and E2E cleanup. It deliberately leaves
  Registry lifecycle implementation, dark visual screenshots, reduced motion,
  and unrelated navigation destinations outside this slice.
- **Contract check:** No API/data/Registry/Composer/Executor/package contract or
  dependency changes are planned. Existing `FactoryStageRail` and frozen proxy
  interfaces remain intact.
- **Placeholder scan:** The task identifies all source/test paths, commands,
  expected RED behavior, and exact cleanup ownership; no deferred behavior is
  implied.

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-07-27-console-lifecycle-overlay-refinement.md`. Execute only through the paired ledger with `/root` as the single integration writer; after its hand-off, run task review, QA, and one independent release review before PM acceptance.
