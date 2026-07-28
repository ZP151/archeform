# Light-Default Developer Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose Factory Pilot into a light-default, dark-optional,
shadcn-based developer control console without changing Factory workflow
semantics.

**Architecture:** Extend the canonical Factory UI Kit with Factory-owned
shadcn/Radix/Lucide wrappers. Console pages consume only those wrappers. The
workspace owns the selected lifecycle state, while evidence and lineage use
progressive disclosure.

**Tech Stack:** Next.js 15.5.21, React 19.2.7, shadcn primitive snapshot,
`radix-ui@1.4.3`, `lucide-react@0.474.0`, `next-themes@0.4.6`,
`sonner@2.0.7`, `@xyflow/react@12.11.2`.

## Global Constraints

- Light is the default theme; dark is fully supported.
- Console pages import Factory UI Kit wrappers only.
- Existing package pins, intake verifier, API routes, and generated-app
  contracts remain unchanged.
- No browser-visible capability, local transport, raw brief, provider output,
  or arbitrary path/URL is permitted.
- Use TDD and production `next start` visual verification.

---

### Task 1: Define the dual-theme semantic UI Kit

**Files:**
- Modify: `packages/ui-kit/factory-ui/1.0.0/react/factory-ui.tsx`
- Modify: `packages/ui-kit/factory-ui/1.0.0/tokens.css`
- Modify: `packages/ui-kit/factory-ui/1.0.0/factory-ui.css`
- Modify: `packages/ui-kit/factory-ui/1.0.0/factory-ui.manifest.json`
- Modify: `apps/console-next/components/factory-ui/*`
- Modify: `tools/factory_ui_kit.py`
- Test: `tests/api/test_factory_ui_kit.py`

**Interfaces:**
- Produces `FactoryTheme`, `FactoryIconAction`, `FactoryTooltip`,
  `FactorySheet`, `FactoryCommandTrigger`, and `FactoryThemeControl`.
- `FactoryTheme` defaults to `light` and accepts only `light | dark`.

- [ ] Add a failing manifest test for the six new semantic components and both
  `:root` light tokens and `.dark` tokens.
- [ ] Run `py.exe -3.12 -m unittest tests.api.test_factory_ui_kit -v` and
  confirm the inventory failure.
- [ ] Implement wrappers over the verified primitive distribution; give each
  icon action an `aria-label` and Tooltip.
- [ ] Copy canonical assets into Console, recompute every manifest digest, and
  rerun the focused verifier tests.

### Task 2: Build the light-default application shell

**Files:**
- Modify: `apps/console-next/app/layout.tsx`
- Modify: `apps/console-next/app/globals.css`
- Modify: `apps/console-next/components/console-workspace.tsx`
- Test: `tests/web/console-next-e2e.mjs`
- Test: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- Consumes `FactoryTheme` and `FactoryThemeControl`.
- Produces a 56px icon rail, top command bar, compact lifecycle rail, and one
  selected-state workspace.

- [ ] Add failing browser checks for default light mode, a named theme control,
  icon-rail tooltip semantics, and no persistent evidence inspector.
- [ ] Replace the permanent project/evidence columns with the compact shell;
  preserve project switching and valid lifecycle stage controls.
- [ ] Implement the theme toggle and persist only the selected theme value.
- [ ] Run fixture workflow and accessibility suites on isolated ports.

### Task 3: Add progressive evidence and command interactions

**Files:**
- Modify: `apps/console-next/components/console-workspace.tsx`
- Create: `apps/console-next/components/factory-ui/evidence-sheet.tsx`
- Create: `apps/console-next/components/factory-ui/command-menu.tsx`
- Test: `tests/web/console-next-accessibility.mjs`

**Interfaces:**
- `EvidenceSheet({ run, open, onOpenChange })` renders only supplied,
  sanitized artifact metadata.
- `CommandMenu({ open, onOpenChange, actions })` lists only local UI actions.

- [ ] Add failing keyboard tests for opening/closing evidence and command UI,
  Escape dismissal, and focus restoration.
- [ ] Implement filename rows with download icon actions and accessible labels.
- [ ] Implement `Ctrl/Cmd+K` command trigger with lifecycle-safe actions.
- [ ] Rerun accessibility and workflow tests.

### Task 4: Make lineage a focused canvas

**Files:**
- Modify: `apps/console-next/components/factory-ui/lineage-dag.tsx`
- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css`
- Test: `tests/web/console-next-lineage.mjs`

**Interfaces:**
- The existing sanitized graph model remains read-only.
- The canvas opens from a labeled action and supports fit/maximize without
  network work or graph mutation.

- [ ] Add a failing browser test asserting lineage is not expanded initially
  and can be opened/closed from a named action.
- [ ] Move canvas rendering into a focused surface with selected-node context.
- [ ] Preserve node sanitation, no direct action mutations, and run graph
  tests plus browser workflow.

### Task 5: Verify visual and live acceptance

**Files:**
- Modify: `docs/superpowers/ledgers/governed-console-source-integration.md`
- Modify: `docs/project-status.md`

- [ ] Build the Console with `npm --prefix apps/console-next run build`.
- [ ] Start production Console in light and dark modes; capture and inspect
  desktop and narrow screenshots.
- [ ] Run Factory UI Kit/source verifiers, fixture workflow, accessibility,
  lineage, and `git diff --check`.
- [ ] Execute the guarded real OpenAI schema call from local process
  environment, then run a full generated application submit/approve/audit and
  explicit stop/cleanup verification.
- [ ] Record commands, redacted evidence, and release decision in the ledger.
