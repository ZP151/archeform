# Console UI 1.3 Compact Lineage and Command Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Release a distinct, immutable Console-only UI 1.3 distribution with
a compact floating Lineage window and an accessible command combobox.

**Architecture:** Clone the verified Console 1.2 asset into a new
`factory-ui-console` namespace, make Console source byte-identical to it, then
change only overlay geometry and command semantics. Existing generated assets,
Factory API, and workflow state remain untouched.

**Tech Stack:** Next.js 15, React 19, Radix UI, React Flow, existing Lucide
closure; no new dependencies.

## Global Constraints

- ADR-016 and `docs/contracts/factory-ui-console-v1.3.md` are frozen.
- Products is left; Evidence is right; Command and Stop are centered; Lineage
  is a compact bottom-right floating modal and maximizes separately.
- Do not edit Console 1.1/1.2, generated assets, API/proxy, dependency
  manifests, or workflow semantics.
- Preserve light default/dark mode, reduced motion, keyboard containment, and
  exact focus restoration.

---

### Task 1: Create and verify the distinct Console 1.3 identity

**Files:**
- Create: `packages/ui-kit/factory-ui-console/1.3.0/**`
- Modify: `tools/factory_ui_kit.py`, `tests/api/test_factory_ui_kit.py`
- Modify: `apps/console-next/components/factory-ui/**`

**Interfaces:**
- Consumes: immutable `packages/ui-kit/factory-ui/1.2.0/` and Console copy.
- Produces: a `verify_factory_ui_kit` path that validates an exact canonical
  key/version/copy mapping without accepting generated `factory-ui@1.3.0`.

- [ ] Write failing tests asserting `factory-ui-console@1.3.0` verifies,
  generated `factory-ui@1.3.0` cannot satisfy the Console identity, and an
  altered Console copy fails with `console_copy_digest_mismatch`.
- [ ] Run `py -3.12 -m unittest tests.api.test_factory_ui_kit -v`; confirm
  identity verification fails before the successor exists.
- [ ] Copy only the verified 1.2 Console asset contents, replace its marker
  with `1.3.0`, create a manifest with key `factory-ui-console`, regenerate
  file SHA-256 inventory, and update the verifier/copy mapping.
- [ ] Run the focused test command; confirm the new identity passes while 1.2
  rollback and generated 1.3 remain unchanged.

### Task 2: Make Lineage an actually compact responsive work window

**Files:**
- Modify: `packages/ui-kit/factory-ui-console/1.3.0/factory-ui.css`
- Modify: `apps/console-next/app/globals.css`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes: `FactorySheet(side="floating", modal, overlay="clear")` and
  `LineageDag` maximize/restore behavior.
- Produces: compact geometry at desktop/tablet and full-canvas geometry only
  for `.lineage-dag.is-expanded`.

- [ ] Write browser assertions that compact Lineage is bottom-right, bounded
  below half the desktop viewport height, and non-clipped at 768px/900px.
- [ ] Run `node tests/web/console-next-e2e.mjs`; confirm old tall side-window
  geometry fails the new assertion.
- [ ] Implement explicit compact `width`, `height`, `right`, and `bottom`
  values; add the 701–900px symmetric-inset breakpoint; leave narrow and
  expanded geometry deterministic.
- [ ] Run workflow and accessibility E2E; confirm Products/Evidence/Command/
  Stop matrix and Lineage focus restoration remain green.

### Task 3: Expose Command as a real combobox

**Files:**
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes: `matchingCommands`, `commandIndex`, and `runCommand`.
- Produces: stable option IDs, combobox `aria-controls` and
  `aria-activedescendant`, without changing command actions.

- [ ] Write a failing source/browser test that opens Command, presses arrows,
  and asserts the input’s active descendant names the selected listbox option.
- [ ] Run the focused accessibility test; confirm it fails because semantics
  are absent.
- [ ] Add stable `command-option-${item.id}` IDs; set combobox/listbox
  attributes and update active state from existing keyboard handling.
- [ ] Run source, accessibility, and workflow tests; confirm Enter activation
  still opens Products through the left drawer.

### Task 4: Regenerate identity evidence and review

**Files:**
- Modify: `packages/ui-kit/factory-ui-console/1.3.0/factory-ui.manifest.json`
- Modify: task ledger only after evidence/review.

- [ ] Regenerate inventory after all source changes and run the full Console
  gate:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  git diff --check
  ```

- [ ] Record changed paths, command output, and residual risks; hand off to a
  read-only task reviewer, then QA and release review before PM acceptance.
