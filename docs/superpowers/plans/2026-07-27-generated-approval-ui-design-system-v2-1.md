# Generated Approval UI Design System v2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Materialize a canonical-asset-backed `ui.*@2.1.0` approval suite that is assembled into a responsive, role-aware generated product without changing historical v2.0.x artifacts.

**Architecture:** ADR-012 makes the existing v2.0.x packages exact replay-only records. A coherent eight-package v2.1.0 successor starts candidate, carries an inventory-locked canonical UI evidence sidecar, and is assembled only through existing declarative slots. The Composer imports the shell-owned stylesheet and supplies a keyboard-operable client workspace; it never lets a package or model choose paths, dependencies, or code.

**Tech Stack:** Python 3.12, FastAPI, Next.js 15.5.21, React 19.2.7, Docker Compose, local Factory UI Kit v1, Playwright.

## Global Constraints

- Preserve every `ui.*@2.0.x` file, digest, lock, and historical replay output exactly.
- Use only declared `factory-component/v1` adapter contributions and existing output slots.
- The successor starts candidate; promotion is an explicit post-evidence Registry decision under ADR-012.
- Generated output imports package-local CSS and carries `data-factory-ui="1.0.0"`; it never imports Console source or a network stylesheet.
- No real-model call is required for this UI implementation slice. Fixture and Docker browser evidence precede a separately guarded live-model acceptance run.

---

### Task 1: Prove canonical generated-distribution containment

**Files:**
- Modify: `tools/factory_ui_kit.py`
- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_component_contract.py`

**Interfaces:**
- Consumes: `factory-ui.manifest.json` and package-local `canonical-ui.json`.
- Produces: a fail-closed verifier that maps `factory-ui/1.0.0` CSS/token digests to each v2.1 package inventory.

- [ ] Write failing tests for a missing sidecar, mismatched digest, missing shell CSS contribution, and a v2.0.x-to-v2.1 mixed dependency.
- [ ] Run the focused tests and record failures caused by missing v2.1 assets/verifier support.
- [ ] Implement sidecar validation without changing frozen manifest or adapter schemas.
- [ ] Run `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_component_contract -v`.

### Task 2: Materialize immutable candidate UI assets

**Files:**
- Create: `packages/components/ui.app-shell/2.1.0/**`
- Create: `packages/components/ui.{login-page,home-page,profile-page,system-settings-page,approval-form,my-requests,approval-queue}/2.1.0/**`

**Interfaces:**
- Consumes: v2.0.x input schemas and declared slots, canonical CSS/token assets.
- Produces: eight candidate package identities with exact 2.1 dependencies, package-local canonical evidence, inventory/digests, fixtures, and package tests.

- [ ] Copy only immutable v2.0 source material into new v2.1 roots; never edit a v2.0.x path.
- [ ] Write the shell stylesheet contribution test and verify it fails before the new root exists.
- [ ] Give `ui.app-shell@2.1.0` a template-owned `factory-ui.css` contribution and remove all inline global style output.
- [ ] Change every dependent package to require `ui.app-shell@2.1.0`; regenerate inventories/digests and retain candidate lifecycle evidence.
- [ ] Run package contract and focused Composer discovery tests.

### Task 3: Assemble genuine navigation, theme, and feedback

**Files:**
- Modify: `apps/api/component_composer.py`
- Modify: `packages/composer-scaffold/1.0.0/frontend/app/globals.css`
- Modify: `packages/composer-scaffold/1.0.0/scaffold.json`
- Modify: `tests/api/test_component_composer.py`

**Interfaces:**
- Consumes: validated component inputs and package output slots.
- Produces: a one-page client workspace with shell CSS import, accessible view tabs, light/dark control, validation/error notice, role switching, submit/approve/reject/audit interactions.

- [ ] Add failing Composer assertions for the shell stylesheet import, canonical marker, absence of inline legacy styles, accessible tabs, and no legacy scaffold selectors.
- [ ] Run them and record expected failure.
- [ ] Implement only Composer-owned assembly glue and the minimal reset scaffold; preserve package-owned labels/fields/views.
- [ ] Run `py -3.12 -m unittest tests.api.test_component_composer tests.api.test_composable_control_plane -v`.

### Task 4: Enforce held-generation policy and promote successor only with evidence

**Files:**
- Modify: `apps/api/component_composer.py`
- Modify: `apps/api/control_plane.py`
- Modify: `tests/api/test_component_planner.py`
- Modify: `tests/api/test_composable_control_plane.py`

**Interfaces:**
- Consumes: ADR-012 held-generation rule and exact locks.
- Produces: v2.0.x denial for new plans, exact historical replay, coherent v2.1 candidate denial before promotion, then explicit evidence-backed v2.1 Golden mapping.

- [ ] Write failing new-plan denial/replay/mixed-family/promotion tests.
- [ ] Implement policy checks without rewriting any historical lock or manifest.
- [ ] Promote only after the package and generated browser gates are green; record the decision in the ledger rather than inferring it from a label.
- [ ] Run planner/control-plane suites and inspect leave/expense locks.

### Task 5: Generated-product browser proof and release gates

**Files:**
- Create: `tests/web/generated-approval-app-e2e.mjs`
- Modify: `tests/web/generated-composable-preview-e2e.mjs`

**Interfaces:**
- Consumes: an Executor-runnable composed leave and expense application.
- Produces: desktop/390px proof for light/dark mode, tab navigation, keyboard focus, validation/error, submit, approve, reject, audit, lock equality, privacy, and cleanup.

- [ ] Write a failing fixture browser test that checks canonical marker, no page overflow, tab transition, theme control, required form error, rejection, audit, and absence of raw brief/credentials.
- [ ] Run it against current output and capture the missing behavior.
- [ ] Add the smallest reliable selectors/assertions and run both generated browser suites through Docker cleanup.
- [ ] Hand off exact commands and evidence to task review, QA, release review, then PM reconciliation.
