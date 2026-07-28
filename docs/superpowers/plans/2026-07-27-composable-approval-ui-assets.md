# Composable Approval UI Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate visually mature, role-aware approval applications from immutable UI component packages instead of a centralized frontend renderer.

**Architecture:** Preserve `ui.*@1.0.0` for historical replay. Build `ui.*@2.0.0` candidate packages from the canonical Factory UI Kit, then make `ComponentComposer` render their declared feature slots and a Composer-owned application assembly. The control plane selects only the v2 package family after its registry policy accepts Golden trust evidence.

**Tech Stack:** Python 3.12, FastAPI, PostgreSQL 16, Next.js 15.5.21, React 19.2.7, Docker Compose, verified shadcn/Radix/Lucide source, Playwright.

## Global Constraints

- Preserve every existing v1 package, lock, digest, and historical replay path.
- Component adapters write only their declared output slot and never execute code or resolve a URL.
- Generated UI must use the canonical Factory UI Kit marker and locked local assets only.
- The model can produce only validated Application Definition values; it cannot choose packages, paths, URLs, or code.
- Real OpenAI calls are capped at five for this task, read only from local process environment, and never logged.

---

### Task 1: Add candidate v2 UI package evidence

**Files:**
- Create: `packages/components/ui.app-shell/2.0.0/**`
- Create: `packages/components/ui.approval-form/2.0.0/**`
- Create: `packages/components/ui.my-requests/2.0.0/**`
- Create: `packages/components/ui.approval-queue/2.0.0/**`
- Create: `packages/components/ui.login-page/2.0.0/**`
- Create: `packages/components/ui.home-page/2.0.0/**`
- Create: `packages/components/ui.profile-page/2.0.0/**`
- Create: `packages/components/ui.system-settings-page/2.0.0/**`
- Test: `tests/api/test_component_contract.py`

**Interfaces:**
- Consumes: `factory-component/v1`, `factory-component-adapter/v1`, and `docs/contracts/factory-ui-kit-v1.md`.
- Produces: exact `key@2.0.0` package roots with manifests, declarative adapters, fixtures, package tests, inventories, notices, and candidate trust sidecars.

- [ ] **Step 1: Write contract tests which reject a v2 package without its canonical style asset, notice, declared slot, candidate lifecycle, or v2 shell dependency.**
- [ ] **Step 2: Run `py -3.12 -m unittest tests.api.test_component_contract -v` and verify the new assertions fail before v2 assets exist.**
- [ ] **Step 3: Materialize the eight v2 packages. The shell owns `frontend/app-shell`; each feature package requires `ui.app-shell@2.0.0` and owns only its existing frozen slot.**
- [ ] **Step 4: Generate package inventories and digests with the existing package-validation helper; record only local candidate trust evidence.**
- [ ] **Step 5: Run each package test and the component-contract suite until green.**

### Task 2: Make the Composer own generated frontend assembly

**Files:**
- Modify: `apps/api/component_composer.py`
- Modify: `apps/api/component_contract.py`
- Modify: `tests/api/test_component_composer.py`
- Modify: `tests/api/test_composable_control_plane.py`

**Interfaces:**
- Consumes: resolved exact UI package locks and validated `ApplicationDefinition` inputs.
- Produces: `frontend/app-shell/**`, feature outputs under their declared slots, and Composer-owned `frontend/app/page.tsx` that imports only those outputs.

- [ ] **Step 1: Write a failing composition test asserting `frontend/app/page.tsx` references v2 feature outputs and that no generated v2 output contains the legacy centralized renderer marker.**
- [ ] **Step 2: Run the focused Composer test and verify the legacy centralized output fails the assertion.**
- [ ] **Step 3: Add a Composer-owned assembly template that receives only sanitized feature module paths and API contract values; do not put labels or field definitions in the template.**
- [ ] **Step 4: Render shell and feature templates through existing adapter validation and update the output manifest merge. Reject duplicate, missing, or out-of-slot UI contributions.**
- [ ] **Step 5: Run Composer and composable control-plane tests; verify two profiles share exact v2 UI locks while their validated inputs differ.**

### Task 3: Switch new approval plans to verified v2 UI locks

**Files:**
- Modify: `apps/api/control_plane.py`
- Modify: `apps/api/component_registry.py` or the existing Registry policy module selected by current source
- Modify: `tests/api/test_composable_control_plane.py`
- Modify: `tests/api/test_component_planner.py`

**Interfaces:**
- Consumes: current Golden trust records for exact v2 UI assets.
- Produces: new `internal-approval-app` component locks selecting one coherent v2 UI family; historical v1 locks remain replayable and cannot mix with v2.

- [ ] **Step 1: Write planner tests for v2 selection, v1 replay, mixed-family rejection, candidate/non-Golden rejection, and a missing required UI feature.**
- [ ] **Step 2: Run planner tests and verify new-plan v2 selection is denied before policy implementation.**
- [ ] **Step 3: Implement explicit profile mapping and exact-version policy; fail closed when evidence is missing or a lock mixes UI generations.**
- [ ] **Step 4: Route new VNext materialization through `ComponentComposer`; leave `_render_vnext_application` reachable only for a historical v1 locked run.**
- [ ] **Step 5: Run full planner/composable-control-plane tests and inspect locks and manifests for both leave and expense fixtures.**

### Task 4: Add product-grade generated UI behavior

**Files:**
- Modify: v2 templates under `packages/components/ui.* /2.0.0/templates/`
- Modify: Composer-owned generated frontend assembly assets
- Test: `tests/web/generated-approval-app-e2e.mjs`

**Interfaces:**
- Consumes: sanitized feature inputs, generated API contract, local demo actor selection.
- Produces: accessible light/dark approval workspace with submit, personal records, queue, decision feedback, audit detail, responsive navigation, and keyboard-visible interaction.

- [ ] **Step 1: Write a failing browser test for the application shell marker, light default, dark switch, actor switch, field validation, submit, approve, reject, audit, and no raw model or capability value in the DOM.**
- [ ] **Step 2: Execute the browser test against a generated fixture application and capture the failing assertion.**
- [ ] **Step 3: Implement the feature templates with canonical tokens, semantic icon controls, compact responsive layout, status feedback, and accessible labels.**
- [ ] **Step 4: Run the browser test at desktop and narrow viewport sizes until the interaction sequence is green.**

### Task 5: Perform release evidence

**Files:**
- Modify: `docs/superpowers/ledgers/factory-ui-kit-and-console-migration.md`
- Test: existing API, Executor, Console, and generated-application suites

**Interfaces:**
- Consumes: verified component packages, composed applications, and loopback Executor.
- Produces: evidence that the generated product is a real role-aware application and that its UI source is package-composed.

- [ ] **Step 1: Run package, Composer, planner, API, Executor, Console, and generated-browser suites; fail on any source, contract, lock, smoke, or visual regression.**
- [ ] **Step 2: Run one guarded live model Brief -> v2 plan -> Executor workflow, then submit, approve, audit, and explicitly stop the generated preview.**
- [ ] **Step 3: Verify state/output/evidence contain no raw brief, credential, URL-selected package, or model response.**
- [ ] **Step 4: Update the ledger only with command outcomes, lock versions, artifact checksums, and remaining decision gates.**
