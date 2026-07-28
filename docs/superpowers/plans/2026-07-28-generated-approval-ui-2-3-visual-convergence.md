# Generated Approval UI 2.3 Visual Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a new immutable candidate generated approval family with the
approved compact, icon-led workspace and safe centered confirmation.

**Architecture:** Materialize canonical `factory-ui@1.4.0`, add the exact
Lucide closure to the generated scaffold, then clone all eight 2.2 UI packages
to a coherent 2.3 candidate family. Composer materializes it only through the
same test-only candidate boundary; planner/production selection remains denied.

**Tech Stack:** Python 3.12 Composer, Next.js 15/React 19 generated app,
Docker Compose, `lucide-react@0.474.0` ISC-licensed static named imports.

## Global Constraints

- ADR-016 and `docs/contracts/generated-approval-ui-2-3.md` are frozen.
- Never mutate 1.0/1.3 canonical assets or UI 2.1/2.2 packages/locks/output.
- No API, data, route, slot, Compose topology, model, or generated Lineage
  feature change is permitted.
- 2.3 remains candidate-only; ordinary Registry/Planner resolution must deny
  it until a later explicit promotion decision.

---

### Task 1: Create the canonical 1.4 asset and governed icon closure

**Files:**
- Create: `packages/ui-kit/factory-ui/1.4.0/**`
- Modify: `packages/composer-scaffold/1.0.0/frontend/package.json`
- Modify: `packages/composer-scaffold/1.0.0/frontend/package-lock.json`
- Modify: `packages/composer-scaffold/1.0.0/scaffold.json`
- Create/modify: third-party notice, SBOM/closure evidence paths named by ADR-016
- Modify: `tools/factory_ui_kit.py`, `tests/api/test_factory_ui_kit.py`

**Interfaces:**
- Produces: exact canonical 1.4 CSS/token/React inventory and a generated
  dependency closure pinned to `lucide-react@0.474.0`.

- [ ] Write failing tests for canonical 1.4 identity, exact Lucide version,
  lock integrity, ISC notice, static-only imports, and rejection of dynamic or
  remote icon resolution.
- [ ] Run the focused tests and confirm they fail before 1.4/closure evidence
  exists.
- [ ] Materialize the new canonical asset and update the generated scaffold
  through the locked local dependency workflow; record notice/SBOM/closure
  evidence and regenerate inventories.
- [ ] Run focused package/contract checks and an isolated generated frontend
  install/build to prove the closure is reproducible.

### Task 2: Materialize the coherent UI 2.3 candidate family

**Files:**
- Create: `packages/components/ui.*/2.3.0/**`
- Modify: `tests/api/test_factory_ui_kit.py`, `tests/api/test_component_contract.py`

**Interfaces:**
- Consumes: canonical 1.4 evidence and frozen existing component/adapter slots.
- Produces: eight exact 2.3 candidate packages, all requiring
  `ui.app-shell@2.3.0`, with one truthful audit marker.

- [ ] Write failing identity/sidecar/inventory tests for all eight 2.3 roots,
  exact dependencies, and the `ui.app-shell.audit@2.3.0` marker.
- [ ] Run the tests; confirm missing packages/canonical mapping fail.
- [ ] Copy 2.2 package structure into fresh 2.3 roots, update manifests,
  adapters, fixtures, sidecars, trust records, and inventories without
  changing 2.2 bytes.
- [ ] Run package/contract tests; confirm mixed 2.2/2.3 candidate locks fail.

### Task 3: Implement compact generated workspace and modal safety

**Files:**
- Modify: 1.4 canonical CSS/React assets and their 2.3 package template copies
- Modify: `apps/api/component_composer.py`
- Modify: `tests/api/test_component_composer.py`
- Modify: `tests/web/generated-composable-preview-e2e.mjs`

**Interfaces:**
- Consumes: existing signed-out boundary, roles, routes, decisions, feedback,
  and validated component inputs.
- Produces: one-column content, real labelled icon rail/top utilities, compact
  read-only Settings/Profile, and centered focus-trapped confirmation.

- [ ] Write failing Composer/browser tests for no unused column, static named
  icon imports, tooltip/accessibility names, centered backdrop dialog,
  initial Cancel focus, Tab/Shift+Tab loop, Escape/Cancel no-request and
  origin focus return.
- [ ] Run focused tests; confirm 2.2’s side-column/bottom-right confirmation
  fails the candidate 2.3 expectations.
- [ ] Implement only 2.3 candidate templates and Composer’s version-gated
  assembly path. Keep signed-out and role routing behavior intact.
- [ ] Run leave and expense browser flow; confirm their 2.3 locks are equal,
  profile fields differ through inputs, and all role/approval/audit safety
  checks remain green.

### Task 4: Prove containment, privacy, responsive themes, and cleanup

**Files:**
- Modify: `tests/api/test_component_planner.py`,
  `tests/api/test_composable_control_plane.py`,
  `tests/web/generated-composable-preview-e2e.mjs`

- [ ] Add failing regressions for normal Registry candidate denial, dynamic
  icon/remote source denial, 390px/desktop no overflow, dark/reduced-motion,
  raw brief/provider/credential exclusion, and Docker cleanup.
- [ ] Run them against pre-fix behavior and confirm each fails for the named
  missing requirement.
- [ ] Implement the minimum verifier/test-harness changes that prove the
  candidate-only path and no forbidden material reaches generated output.
- [ ] Run the complete generated gate and record exact output in the ledger:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_component_contract tests.api.test_component_composer tests.api.test_component_planner tests.api.test_composable_control_plane -v
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  node --check apps/web/app.js
  git diff --check
  ```

- [ ] Hand off to task review, QA, and independent release review. Do not
  promote the candidate from this slice.
