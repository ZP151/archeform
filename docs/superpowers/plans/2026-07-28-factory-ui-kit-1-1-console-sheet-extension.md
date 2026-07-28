# Factory UI Kit 1.1 Console Sheet Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Version the canonical Factory UI Kit for a Console-only Sheet behavior extension without changing frozen 1.0 generated-UI assets.

**Architecture:** `factory-ui@1.1.0` is a new canonical asset and verified Console distribution. It adds explicit Sheet modality/overlay controls and deterministic opener restoration only for Console. `factory-ui@1.0.0` and `ui.*@2.1.0` remain immutable and independently verifiable.

**Tech Stack:** Python 3.12, Next.js 15.5.21, React 19.2.7, Radix Dialog, Playwright, local Factory UI Kit verifier.

## Global Constraints

- Do not start implementation until ADR-013 is proposed by Tech Lead and
  accepted by Founder-delegated Controller.
- Do not change `packages/ui-kit/factory-ui/1.0.0/**` or
  `packages/components/ui.*/2.1.0/**`.
- `factory-ui@1.1.0` is Console-only; generated UI 2.1 remains bound to exact
  1.0.0 CSS/token digests and marker.
- No dependency, framework, Registry, Composer, generated-app, API/data, or
  deployment change is in scope.

## File structure

| Path | Responsibility |
| --- | --- |
| `docs/adr/013-factory-ui-1-1-console-successor.md` | Tech Lead decision proposal and Founder acceptance record. |
| `docs/contracts/factory-ui-kit-v1.1.md` | Frozen Sheet semantics and distribution contract. |
| `packages/ui-kit/factory-ui/1.1.0/**` | Canonical 1.1 inventory, assets, fixtures, tests, and manifest. |
| `apps/console-next/components/factory-ui/**` | Exact controlled Console copy of canonical 1.1. |
| `tools/factory_ui_kit.py`, `tools/console_next_intake.py` | Version-aware Console copy and generated-1.0 isolation verification. |
| `tests/api/test_factory_ui_kit.py`, `tests/api/test_console_ui_sources.py` | Digest, drift, and mixed-version regressions. |
| `tests/web/console-next-*.mjs` | Overlay/focus evidence. |

---

### Task 1: Obtain the versioned-contract decision

**Files:**

- Create: `docs/adr/013-factory-ui-1-1-console-successor.md`
- Create: `docs/contracts/factory-ui-kit-v1.1.md`
- Modify: `docs/superpowers/ledgers/factory-ui-kit-1-1-console-sheet-extension.md`

**Interfaces:**

- Consumes: accepted ADR-007 and frozen `factory-ui-kit/v1`.
- Produces: accepted ADR-013 and frozen `factory-ui-kit/v1.1`.

- [ ] **Step 1: Tech Lead writes ADR-013 as Proposed.**

  Record exact existing/proposed profiles (1.0.0 → 1.1.0), no stack-version
  changes, migration/rollback, security/accessibility impact, and verification
  gate. Reject the alternatives of a CUI-01 local patch, mutating 1.0 in place,
  and migrating generated 2.1 as incompatible with dual-distribution locks.

- [ ] **Step 2: Tech Lead writes the v1.1 contract.**

  ```ts
  type FactorySheetOptions = {
    modal?: boolean;
    overlay?: 'dim' | 'clear' | 'none';
    restoreFocusId?: string;
    initialFocusId?: string;
  };
  ```

  Preserve legacy compatibility with
  `effectiveModal = modal ?? side !== 'floating'`: a legacy floating Sheet is
  non-modal unless its caller passes `modal`. Console Lineage must pass
  `modal` explicitly with `overlay="clear"`; use explicit restoration when
  supplied and otherwise restore the opening control.

- [ ] **Step 3: Obtain Controller acceptance.**

  On rejection, keep this ledger `planned`. On acceptance, freeze the contract,
  name the integration writer, and move the ledger to `implementing`.

### Task 2: Materialize and verify the Console-only 1.1 distribution

**Files:**

- Create: `packages/ui-kit/factory-ui/1.1.0/**`
- Modify: `apps/console-next/components/factory-ui/**`
- Modify: `tools/factory_ui_kit.py`
- Modify: `tools/console_next_intake.py`
- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**

- Consumes: accepted `factory-ui-kit/v1.1`, the 1.0 canonical baseline, and the
  accepted CUI-01 overlay matrix.
- Produces: canonical/Console 1.1 copy verification plus explicit generated-UI
  2.1 isolation from 1.1.

- [ ] **Step 1: Write failing source and browser regressions.**

  ```python
  self.assertEqual(console_manifest['canonical_version'], '1.1.0')
  self.assertEqual(generated_ui_manifest['canonical_version'], '1.0.0')
  with self.assertRaisesRegex(ValueError, 'CONSOLE_UI_COPY_DRIFT'):
      verify_console_copy(tampered_console_root)
  ```

  Assert floating Lineage is modal/clear, Tab cannot reach the background, and
  Escape/Close returns to its opener.

- [ ] **Step 2: Run RED tests.**

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit -v
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  ```

  Expected: FAIL because 1.1 does not yet exist and Console verification still
  identifies 1.0.

- [ ] **Step 3: Create canonical 1.1 and its exact Console copy.**

  Copy 1.0 into new 1.1, update only the governed Sheet surface, recompute the
  1.1 manifest digests, and copy every Console Factory UI file from 1.1. Do not
  modify 1.0 or generated 2.1 paths.

  ```tsx
  <DialogPrimitive.Root modal={effectiveModal} open={open} onOpenChange={handleOpenChange}>
    {overlay !== 'none' && <DialogPrimitive.Overlay className={overlay === 'clear' ? 'factory-sheet-overlay is-clear' : 'factory-sheet-overlay'} />}
  </DialogPrimitive.Root>
  ```

- [ ] **Step 4: Implement verifier isolation and rollback proof.**

  Reject altered/missing/mixed Console files and a 1.1 reference in generated
  2.1 manifests, locks, sidecars, or output. Restore a temporary Console copy to
  verified 1.0 and prove generated 2.1 locks/output remain byte-identical.

- [ ] **Step 5: Run the full gate and hand off.**

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit -v
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  python -m unittest discover -s tests/api -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  python -m unittest discover -s tests/agents -v
  node --check apps/web/app.js
  git diff --check
  ```

## Self-review

- The ADR/contract task gates this versioned shared-contract change before a
  writer can start. The implementation task covers canonical 1.1, exact Console
  copy, Sheet behavior, generated 1.0 isolation, migration, rollback,
  source-contract regressions, and API gates.
- No step authorizes a frozen 1.0 or generated 2.1 mutation.

## Execution handoff

This plan is blocked at Task 1. Do not dispatch a writer until Tech Lead ADR-013
is accepted by Founder-delegated Controller and the ledger records
`factory-ui-kit/v1.1` as frozen.
