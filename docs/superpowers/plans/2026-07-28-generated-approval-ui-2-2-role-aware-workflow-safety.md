# Generated Approval UI 2.2 Role-Aware Workflow Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an immutable candidate `factory-ui@1.3.0` and coherent
`ui.*@2.2.0` approval suite whose generated products are role-aware, signed-out
safe, confirmation-protected, accessible, and verifiably composable.

**Architecture:** Integration creates a new generated-product canonical asset,
then complete new 2.2 package identities that use only existing declarative
slots. Composer-owned assembly derives allowed navigation from validated actor
kind, renders the signed-out identity boundary, and owns confirmation/pending/
feedback glue. Candidate assets are verified directly and through generated
leave/expense previews; promotion remains a later explicit PM/controller gate.

**Tech Stack:** Python 3.12, FastAPI, Next.js 15/React 19, Docker Compose,
Playwright, repository-owned Factory UI Kit; no new dependency.

## Global Constraints

- Consume `generated-approval-ui/v2.2` exactly; no modified historical asset,
  lock, trust record, API/data contract, slot, dependency, or topology.
- 2.2 is candidate only throughout implementation. Do not let a writer select
  it for a new plan or infer promotion from a package label.
- Preserve role-based generated API enforcement. UI filtering and confirmation
  are user-safety/accessibility controls, not authorization replacements.
- `/root` is the sole writer. Package, Composer, registry/planner, generated
  browser, and documentation paths are serialized under the ledger.

---

### Task 1: Establish 2.2 RED contract and identity tests

**Files:**

- Modify: `tests/api/test_factory_ui_kit.py`
- Modify: `tests/api/test_component_contract.py`
- Modify: `tests/api/test_component_composer.py`
- Modify: `tests/api/test_component_planner.py`
- Modify: `tests/api/test_composable_control_plane.py`
- Modify: `tests/web/generated-approval-app-e2e.mjs`
- Modify: `tests/web/generated-composable-preview-e2e.mjs`

**Interfaces:**

- Consumes: frozen `generated-approval-ui/v2.2`, current 1.0/2.1 historical
  identity, existing component/adapter contracts, and generated API behavior.
- Produces: failing assertions for canonical 1.3/2.2 identity, candidate
  denial, role routes, signed-out isolation, confirmation/pending, feedback,
  motion, and historical isolation.

- [ ] Write assertions for exact 1.3 marker/digests, eight 2.2 inventory roots,
  exact 2.2 shell dependencies, 2.1/2.2 mixed-family rejection, and unchanged
  historical identities.
- [ ] Write generated-browser cases proving signed-out controls are absent,
  each actor sees only contract routes and a rendered destination, stale route
  fallback, `aria-current`, read-only Profile/Settings, confirmation-before-
  request, cancel/Escape focus return, pending duplicate denial, feedback,
  reduced motion, 390px/desktop, privacy, and cleanup.
- [ ] Run the focused suite to record RED failures caused by absent 1.3/2.2
  identities and missing governed generated behavior.

### Task 2: Materialize immutable candidate package family

**Files:**

- Create: `packages/ui-kit/factory-ui/1.3.0/**`
- Create: `packages/components/ui.*/2.2.0/**`
- Modify: `tools/factory_ui_kit.py`
- Modify: `apps/api/component_contract.py`

**Interfaces:**

- Consumes: immutable 1.0 canonical generated asset and 2.1 package inputs,
  existing adapter schema/slots, and Task 1 identity assertions.
- Produces: exact candidate 1.3/2.2 roots with manifests, inventories, digests,
  declarative adapters, fixtures, tests, canonical sidecars, and candidate
  trust records.

- [ ] Clone only historical inputs into new 1.3/2.2 roots; never modify a
  historical file.
- [ ] Implement canonical 1.3 styles/tokens/React primitives for governed
  feedback, confirmation/pending/disabled/error states, light/dark focus and
  `prefers-reduced-motion: reduce`.
- [ ] Bind each dependent package to exact `ui.app-shell@2.2.0`; verify
  inventories/digests and package-local canonical mapping fail closed.
- [ ] Run canonical/component-contract tests and record candidate lifecycle
  rejection for new-plan selection.

### Task 3: Assemble signed-out, role-aware, confirmation-safe output

**Files:**

- Modify: `apps/api/component_composer.py`
- Modify: `packages/composer-scaffold/1.0.0/frontend/app/globals.css`
- Modify: `packages/composer-scaffold/1.0.0/scaffold.json`
- Modify: `tests/api/test_component_composer.py`
- Modify: `tests/api/test_composable_control_plane.py`

**Interfaces:**

- Consumes: validated actor kinds, assembled 2.2 routes, existing generated
  session/record/audit endpoints, and 2.2 package contributions.
- Produces: Composer-owned generated glue that implements the frozen route,
  signed-out, feedback, focus, and decision interaction contract.

- [ ] Generate identity-only signed-out markup; do not mount protected shell
  navigation/data/actions until session state is established.
- [ ] Derive visible routes from actor kind plus assembled destinations; use
  labelled navigation and `aria-current`, deterministic allowed-route fallback,
  and one labelled landmark/focusable heading per destination.
- [ ] Add local confirmation/pending state around the existing decision call;
  only Confirm invokes it, Cancel/Escape restore origin focus, and completion
  puts focus on the meaningful result with shared safe feedback.
- [ ] Retain read-only Profile/Settings copy and create no fake edit/persistence
  behavior. Run focused Composer/control-plane tests.

### Task 4: Prove candidate containment and generated product behavior

**Files:**

- Modify: `apps/api/component_registry.py`
- Modify: `apps/api/control_plane.py`
- Modify: `tests/api/test_component_planner.py`
- Modify: `tests/web/generated-approval-app-e2e.mjs`
- Modify: `tests/web/generated-composable-preview-e2e.mjs`

**Interfaces:**

- Consumes: candidate 2.2 package identities, Composer output, existing trust
  policy, and local generated leave/expense previews.
- Produces: explicit candidate/new-plan denial plus direct generated evidence;
  it does not promote or rewrite historical locks.

- [ ] Prove new plan resolution rejects 2.2 candidate/unsigned/stale/altered/
  revoked/mixed packages before output creation while 2.1 replay stays exact.
- [ ] Run leave and expense output through generated browser flows proving every
  frozen contract behavior and role-aware submit/approve/reject/audit API flow.
- [ ] Verify no raw brief/secret/provider material reaches output/evidence and
  that Docker resources clean up. Record exact locks/digests and candidate
  status in the ledger.

### Task 5: Release gate and promotion hand-off

**Files:**

- Update after implementation only:
  `docs/superpowers/ledgers/generated-approval-ui-2-2-role-aware-workflow-safety.md`

- [ ] Run the ledger verification gate serially and capture exact output.
- [ ] Hand off changed paths, RED/GREEN evidence, package/digest identities,
  candidate denial, role/confirmation/privacy/motion/browser/Docker proof, and
  residual risk for read-only task review and QA.
- [ ] Do not alter candidate trust/lifecycle to Golden. After clear review and
  QA, request the separate Founder-delegated Controller/PM promotion decision;
  then run a scoped post-promotion plan/lock/release proof before acceptance.

## Self-review

- The plan maps every ADR-015 decision to an immutable asset, Composer behavior,
  rejection rule, or browser evidence without expanding a frozen contract.
- Candidate materialization and promotion are deliberately separated, preserving
  historical replay and stopping writer-inferred lifecycle escalation.

## Execution handoff

Execute only through
`docs/superpowers/ledgers/generated-approval-ui-2-2-role-aware-workflow-safety.md`.
`/root` begins Task 1 with TDD, uses systematic debugging for unexpected
failures, and hands off to read-only task review, QA, release review, then PM
for any promotion/acceptance decision.
