# Generated Approval Auth/Navigation P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove signed-out keyboard exposure of generated approval-app
protected navigation/actions while preserving local session authorization and
role-aware flows in a new immutable `ui.*@2.4.0` candidate family.

**Architecture:** Treat the failing signed-out surface as a generated-product
authentication/navigation boundary, not as a Console or CSS problem. First
reproduce and inventory every focusable control emitted before a local session
exists. Then create a coherent 2.4 candidate family bound to unchanged
generated canonical `factory-ui@1.4.0`; its Composer path may render only a
safe sign-in surface before authentication and only role-filtered navigation
after it. Historic generated 2.1/2.2/2.3 assets and outputs remain exact
replay inputs. The emitted UI must be version-gated so the repair cannot
silently rewrite historic 2.3 output.

**Tech Stack:** Existing Python 3.12 component Composer/Registry/contract
tests, current generated Next.js/Docker/Playwright proof, existing local
signed-session API; no new dependency, external identity provider, cloud
target, API/data schema, or real model call.

## Global Constraints

- This is a high-priority, serialized `integration` repair. It is independent
  of CUI-08 production paths: never edit Console candidates, Console live
  files, `LineageDag`, Console contracts, or CUI-08 tests.
- Existing generated canonical roots `factory-ui@1.0.0`, `1.3.0`, and `1.4.0`,
  generated package families `ui.*@2.1.0`, `2.2.0`, and `2.3.0`, their
  manifests/sidecars/locks, historical outputs, and replay evidence are
  immutable. Do not patch 2.3 in place.
- The only new generated assets may be a complete exact candidate
  `ui.*@2.4.0` family. All eight keys must resolve at 2.4.0 together:
  `ui.app-shell`, `ui.login-page`, `ui.home-page`, `ui.profile-page`,
  `ui.system-settings-page`, `ui.approval-form`, `ui.my-requests`, and
  `ui.approval-queue`. Each non-shell package requires exactly
  `ui.app-shell@2.4.0`; all sidecars remain bound to unchanged canonical
  `factory-ui@1.4.0`.
- No candidate is Golden, selectable by ordinary planning, releasable, or
  deployable. Candidate-only composition for deterministic tests must use
  explicit test-local trusted input and must not widen normal Registry policy.
- Before `signedIn === true`, the complete focusable/browse-surface inventory
  must equal the contract allowlist: one role-neutral local-account combobox,
  theme control, Sign in, and a feedback target only with an actual nonempty
  feedback message. No additional
  focusable or embedded/browse surface—including a native button/input/select/
  textarea/link, enabled `contenteditable`, `summary`, `iframe`, `object`, or
  `embed`—may expose protected routes/actions in its accessible/text content:
  navigation, approve, reject, audit, approval queue, my requests, submit
  request, Sign out, or a role-derived privileged destination.
- Local account selection remains a local development credential input, not
  authorization. Its visible/accessible option labels must be role-neutral
  (for example `Local account 1`), while the submitted internal value remains
  the existing actor ID. The combobox must have the frozen local-account
  selector marker and exact option values equal to the fixture actor-ID set;
  it may not accept or expose an arbitrary/privileged extra option. Server-side
  session/RBAC remains the authorization authority and all signed-in role
  filtering remains mandatory.
- After sign-in, navigation must contain exactly the approved routes for that
  actor and keyboard activation/focus behavior must remain intact. Sign-out
  must clear session-bound records/audit state and return to the exact safe
  signed-out allowlist before any next sign-in attempt.
- In the 2.4 emitted client only, every asynchronous `load` and
  `confirmDecision` completion is bound to the current signed-in generation
  and actor. Sign-out or role switch invalidates that generation, aborts
  in-flight request work where supported, and clears feedback/records/audit/
  confirmation state. A stale completion must not reintroduce `.fp-feedback`,
  records, audit events, confirmation state, or protected controls after the
  safe signed-out/next-actor transition.
- Preserve 2.3 candidate visual behavior: light default/dark/reduced motion,
  responsive 390px layout, local signed sessions, submit/approve/reject/audit
  behavior, confirmation focus trap, immutable audit, Docker cleanup, and no
  raw brief, credential, token, path, or artifact exposure.
- Use `.agents/skills/systematic-debugging` for the observed test failure
  before repair and `.agents/skills/test-driven-development` for all changes.
  No real model call belongs to this task.

## File Structure and Candidate Boundary

| Path | Responsibility |
| --- | --- |
| `docs/contracts/generated-approval-auth-navigation-v1.md` | Frozen signed-out/signed-in focusability, account-label, versioning, and rejection contract. |
| `packages/components/ui.*/2.4.0/**` | New, complete candidate family only; current 2.3 roots remain untouched. |
| `apps/api/component_composer.py` | Version-gated 2.4 emitted application behavior; no changed API/session/RBAC contract. |
| `apps/api/component_registry.py` | Explicit test-local candidate family discovery only if required by existing candidate test infrastructure. |
| `apps/api/component_contract.py` | Exact package-family/sidecar validation only if the existing validator requires a 2.4 rule. |
| `tools/factory_ui_kit.py` | Candidate family verification against immutable canonical 1.4 only if the existing verifier needs the new exact family input. |
| `tests/api/test_component_composer.py` | TDD proof of version-gated safe signed-out output and role-filtered signed-in output. |
| `tests/api/test_component_contract.py` | Exact 2.4 family/version/sidecar rejection regressions. |
| `tests/api/test_factory_ui_kit.py` | Candidate 2.4 canonical-sidecar/digest evidence without changing 2.3 assertions. |
| `tests/web/generated-composable-preview-e2e.mjs` | Authoritative generated leave/expense Docker browser proof, including signed-out tab/focusable inventory. |
| `tests/web/generated-approval-app-e2e.mjs` | Focused generated approval UI regression if existing delegated proof lacks the failure predicate. |

Only the exact paths listed in the ledger may be modified. A required API,
data schema, backend authorization, Compose topology, canonical 1.4, historic
package, or Registry-policy change stops this task and returns it to
integration/PM for a new decision.

---

### Task 1: Reproduce the signed-out exposure and freeze the behavior contract

**Files:**
- Create: `docs/contracts/generated-approval-auth-navigation-v1.md`
- Modify: `tests/web/generated-composable-preview-e2e.mjs`
- Modify: `tests/api/test_component_composer.py`

**Interfaces:**
- Consumes: the failing generated candidate 2.3 leave/expense preview fixture,
  `completeBrowserApproval`, current local session endpoint, and frozen
  `generated-approval-ui-2-3.md` behavior.
- Produces: `generated-approval-auth-navigation/v1` and a deterministic RED
  failure that reports the actual signed-out focusable elements/accessible
  labels instead of a blanket text match alone.
- Does not produce: a source asset, package candidate, API change, altered
  server authorization rule, or a repair before the evidence is recorded.

- [ ] **Step 1: Diagnose the current P1 with systematic debugging**

  Reproduce `tests/web/generated-composable-preview-e2e.mjs:344` for both
  leave and expense fixtures. Capture the signed-out DOM focus order, each
  focusable element's tag, role, `aria-label`, visible text, value, and
  `data-factory-component`, plus whether the element is keyboard-reachable.
  Map the first violating element to the emitted Composer string and source
  template. Record the evidence in the task ledger; do not change product
  source during this step.

- [ ] **Step 2: Write the failing browser and source regressions**

  Replace the opaque predicate at line 344 with a helper that fails while
  printing the complete signed-out control inventory. It must assert:

  ```text
  no Primary navigation landmark
  no focusable decision/navigation/sign-out control
  no role-derived privileged label in signed-out accessible or visible control content
  only safe account-selection, theme, feedback, and Sign in controls are reachable
  ```

  In `tests/api/test_component_composer.py`, render the explicit 2.4 candidate
  test plan and assert its emitted signed-out branch does not emit
  `ApplicationShell`, `Primary navigation`, `Sign out`, an approve/reject/audit
  control, or role-labelled account option. Assert that the signed-in branch
  still passes the existing `allowedRoutes` into its application shell.

- [ ] **Step 3: Run RED evidence**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_component_composer -v
  node tests/web/generated-composable-preview-e2e.mjs
  ```

  Expected: 2.3-derived preview fails with the captured protected signed-out
  control. The result identifies whether the source is the Composer sign-in
  branch, an app-shell template, or both; it must not be dismissed as test
  wording without a recorded contract-compatible explanation.

- [ ] **Step 4: Freeze `generated-approval-auth-navigation/v1`**

  Write the contract with these exact sections:

  ```markdown
  ## Candidate identity
  ui.*@2.4.0; canonical factory-ui@1.4.0; candidate-only

  ## Signed-out allowlist
  role-neutral account selector; theme control; feedback; Sign in

  ## Signed-out denylist
  Primary navigation; protected route/action; Sign out; role-derived privileged label

  ## Signed-in invariant
  navigation equals allowedRoutes for session actor; backend session/RBAC remains authority

  ## Historic isolation
  2.1/2.2/2.3 and canonical roots are immutable; 2.4 emission is version-gated
  ```

  Include fail-closed identifiers:
  `signed_out_protected_focusable_exposed`,
  `signed_out_privileged_label_exposed`,
  `generated_auth_candidate_family_mixed`, and
  `historic_generated_family_mutated`.

### Task 2: Materialize a coherent, version-gated 2.4 candidate repair

**Files:**
- Create: `packages/components/ui.app-shell/2.4.0/**`
- Create: `packages/components/ui.login-page/2.4.0/**`
- Create: `packages/components/ui.home-page/2.4.0/**`
- Create: `packages/components/ui.profile-page/2.4.0/**`
- Create: `packages/components/ui.system-settings-page/2.4.0/**`
- Create: `packages/components/ui.approval-form/2.4.0/**`
- Create: `packages/components/ui.my-requests/2.4.0/**`
- Create: `packages/components/ui.approval-queue/2.4.0/**`
- Modify: `apps/api/component_composer.py`
- Modify only if current candidate support requires it:
  `apps/api/component_registry.py`
- Modify only if current validation requires it:
  `apps/api/component_contract.py`
- Modify only if current verification requires it:
  `tools/factory_ui_kit.py`
- Modify: `tests/api/test_component_composer.py`
- Modify: `tests/api/test_component_contract.py`
- Modify: `tests/api/test_factory_ui_kit.py`

**Interfaces:**
- Consumes: frozen auth/navigation v1 contract and Task 1 source mapping.
- Produces: a complete `ui.*@2.4.0` candidate family whose package manifests,
  adapter/package tests, fixtures, trust records, canonical sidecars, and
  inventory hashes are truthful and whose emitted Composer branch is selected
  only for an explicit 2.4 test candidate plan.
- Does not produce: a new canonical UI kit, a changed session API/RBAC rule,
  a 2.3 source mutation, a normal Planner selection path, or Golden
  promotion.

- [ ] **Step 1: Copy immutable candidate inputs into new 2.4 roots**

  Copy the full eight-package 2.3 family into new 2.4 roots. Update each
  manifest, adapter, package-local tests, fixture metadata, dependency version,
  trust record, sidecar reference, and complete inventory digest for 2.4.0.
  Every non-shell package must require only `ui.app-shell@2.4.0`. Retain the
  canonical sidecar binding to `factory-ui@1.4.0`; do not modify canonical CSS,
  tokens, React, or the 2.3 package bytes.

- [ ] **Step 2: Implement only the diagnosed signed-out boundary**

  In the 2.4-specific Composer path, render the signed-out branch outside the
  authenticated application shell/navigation. Keep the existing session
  request shape and internal actor IDs. Present role-neutral visible/accessible
  account option labels while retaining each existing actor ID as the submitted
  option value. Do not emit protected labels, routes, decision controls,
  Sign out, or a navigation landmark until the existing sign-in response sets
  `signedIn` true.

  After authentication, preserve the existing `allowedRoutes` filtering,
  route fallback, focus behavior, theme behavior, and backend authorization.
  On sign-out, clear local records/audit state before returning to the same
  safe signed-out branch. Version-gate all altered emitted source to the 2.4
  candidate: generated 2.3 replay must remain byte/behavior isolated.

- [ ] **Step 3: Implement the 2.4-only stale-async generation guard**

  In `apps/api/component_composer.py`, change only the explicit 2.4 emitted
  client branch. Add a monotonically increasing generation ref and one
  abort-controller/ref for client requests. Capture the generation and actor
  identity at the start of every `load` and `confirmDecision`; immediately
  before each state write (`setFeedback`, `setRecords`, `setAuditEvents`,
  confirmation/pending update), require the captured generation/actor still
  matches the active signed-in session. On Sign out or role switch, increment
  the generation, abort the active request, and synchronously clear feedback,
  records, audit events, confirmation, and pending state before rendering the
  safe signed-out/next-role branch.

  Do not change the backend API request/response shape, server-side session or
  RBAC policy, 2.3/historic emitted source, package identities, or normal
  candidate selection. The guard is presentation-state containment only.

- [ ] **Step 4: Run focused candidate GREEN evidence**

  Run:

  ```powershell
  py -3.12 -m unittest tests.api.test_component_composer tests.api.test_component_contract tests.api.test_factory_ui_kit -v
  ```

  Expected: a mixed 2.3/2.4 family fails closed; candidate 2.4 sidecars and
  inventory verify against canonical 1.4; 2.3 checks remain unchanged; emitted
  2.4 signed-out source has only the contract allowlist and emitted signed-in
  source retains role-filtered navigation.

### Task 3: Prove generated browser security, workflow, and stale-async containment

**Files:**
- Modify: `tests/web/generated-composable-preview-e2e.mjs`
- Modify only if needed for a focused regression:
  `tests/web/generated-approval-app-e2e.mjs`

**Interfaces:**
- Consumes: explicit test-local candidate 2.4 package locks and existing
  leave/expense/observer fixture definitions.
- Produces: browser/Docker evidence that safe signed-out controls remain
  separated from role-aware signed-in navigation/actions.

- [ ] **Step 1: Test the signed-out keyboard boundary for leave and expense**

  For each materialized 2.4 application, tab through all signed-out focusable
  controls and compare the observed inventory for exact equality with the
  contract allowlist. Its query/normalizer must include native controls and
  links plus `[contenteditable]:not([contenteditable="false"])`, `summary`,
  `iframe`, `object`, and `embed`; it must capture each surface's tag, role,
  accessible name, visible text/title, and keyboard/browse reachability. Its
  accessible-name resolver must follow `aria-labelledby` ID references in
  document order before falling back to direct labels/text. In
  addition, assert no Primary navigation landmark, route button, decision
  button, Sign out, privileged role/destination/action label, or unexpected
  extra surface exists. The test must print the observed inventory when
  failing.

  Add a hostile regression for each formerly omitted family. While signed out,
  inject one protected surface at a time (enabled contenteditable `Approve`,
  `summary` `Audit`, titled/labelled `iframe` `Approval queue`, and each
  `object`/`embed` equivalent) into a test-only DOM container. Include an
  `aria-labelledby`-only protected surface. The same inventory assertion must
  reject every injected surface and report its family/resolved name; remove
  the container before continuing with product behavior.

  Treat the local-account combobox as one named exception, never a generic
  `select` exemption. Assert its exact marker, fixture actor-ID option values
  in deterministic order, and `Local account 1` through `Local account N`
  labels. Add hostile arbitrary and privileged-looking option values/labels;
  the assertion must reject both. The feedback target is conditionally allowed
  only with nonempty status/feedback content; in the no-feedback state it is
  absent, and in the feedback state it is the sole additional identified
  expected surface.

- [ ] **Step 2: Test sign-in, role navigation, and sign-out reset before any next sign-in**

  Select each actor by its preserved internal option value, sign in through the
  existing local endpoint, and assert navigation equals that actor's
  `allowedRoutes`; keyboard activation must retain focus. Run submitter,
  approver, and auditor/observer submit/approve/reject/audit behavior as the
  existing proof does. After every Sign out, and before invoking `signInAs` or
  selecting another actor, re-run the exact signed-out focusable inventory
  assertion. Assert there is no Primary navigation landmark, protected
  route/action/Sign out control, pending request/record summary, or audit
  event/action text in the DOM. This proof is mandatory for every actor
  transition.

- [ ] **Step 3: Add deterministic stale-async sign-out and role-switch regressions**

  In `tests/web/generated-composable-preview-e2e.mjs`, add a test-only
  deterministic fetch-completion seam that can hold one `/decision` response
  and one records/audit `load` response after the generated client starts
  them, then deliberately complete the client promise even when its abort
  signal is already aborted. The seam must be installed through browser-test
  injection/route control only; it cannot add a production flag or change the
  emitted candidate source. It returns labelled stale sentinel payloads so the
  guarded continuation is observably reached rather than cancelled by fetch.

  In the delayed-decision case: start as one actor, capture the decision,
  Sign out, sign in as a *different* actor, then release the original stale
  completion. Prove neither the signed-out state before re-authentication nor
  the new actor state afterward gains stale `.fp-feedback`, record summary,
  audit text, confirmation, decision result, or protected control. In the
  delayed-load/audit case: capture a load for one actor, Sign out and sign in
  as a different actor before release, then prove the stale labelled
  records/audit payload cannot appear in the new actor state.

  Run both cases for leave and expense candidate 2.4 fixtures. Each failure
  must name delayed request type, captured generation/old actor/new actor,
  stale sentinel, and leaked DOM marker; no `waitForTimeout`, timing retry, or
  same-actor reauthentication is acceptable evidence.

- [ ] **Step 4: Run browser GREEN evidence**

  Run:

  ```powershell
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  ```

  Expected: both leave and expense 2.4 candidate applications pass signed-out
  keyboard isolation, local sign-in, role-filtered navigation, keyboard focus,
  approve/reject/audit, responsive/theme/reduced-motion, and Docker
  container/volume cleanup evidence. No Console asset or URL is loaded.

### Task 4: Full evidence, review, and gated hand-off

**Files:**
- Modify: `docs/superpowers/ledgers/generated-approval-auth-navigation-p1.md`

**Interfaces:**
- Consumes: Task 1–3 evidence.
- Produces: a writer hand-off suitable for independent task review, QA, and
  release review; it does not promote 2.4.

- [ ] **Step 1: Run the full required gate**

  Run:

  ```powershell
  py -3.12 -m unittest discover -s tests/api -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  git diff --check
  ```

  Record exact output, candidate locks/digests, immutable historic snapshots,
  focusable inventories, role/workflow results, Docker cleanup, and residual
  risk. The live Console CUI-08 gate is read-only evidence only.

- [ ] **Step 2: Review and QA gates**

  A read-only task reviewer verifies no historic/generated mutation, no API/
  RBAC/Planner/Registry-policy change, coherent 2.4 family, safe signed-out
  allow/deny behavior, role-filtered post-auth behavior, and generated output
  isolation. QA independently reruns all full gates and adds a focused browser
  regression only if fresh evidence exposes a gap. P0/P1 returns to the same
  integration writer.

- [ ] **Step 3: Independent release review and PM decision**

  Release review repeats source identity, full API/build/browser/Docker/diff
  evidence and verifies candidate-only status. PM may mark the task accepted
  only after review/QA/release have no unresolved P0/P1. Candidate 2.4 remains
  non-Golden; a promotion decision is explicitly separate.

## Verification Matrix

| Requirement | Evidence |
| --- | --- |
| Deterministic P1 reproduction | Signed-out focusable inventory pinpoints the current violating element and emitted source. |
| Candidate-only repair | Complete 2.4 family/locks/sidecars verify; 2.1/2.2/2.3 and canonical roots remain byte-identical. |
| Signed-out boundary | Leave and expense focusable/browse-surface inventory exactly equals the conditional safe allowlist, resolves `aria-labelledby`, and has no protected label/route/action, embedded surface, or extra control. Hostile contenteditable/summary/iframe/object/embed and labelled-name injections are each rejected. |
| Local-account exception | Only the marked local-account combobox is permitted; it has exact fixture actor-ID values, deterministic role-neutral labels, and rejects hostile arbitrary/privileged option values. |
| Signed-in authorization UX | Existing session/RBAC persists; navigation equals `allowedRoutes`, keyboard focus and role flows work. |
| Sign-out reset | Before any next sign-in, session-bound UI/nav/records/audit controls disappear and the exact signed-out allowlist is restored. Delayed decision/load replies after sign-out or role switch cannot recreate feedback, records, audit, confirmation, or protected controls. |
| Operational containment | Browser/Docker cleanup succeeds; no Console asset, API/data, external dependency, or model call is introduced. |
| Governance | Task review, QA, release review, and PM acceptance have no unresolved P0/P1; candidate remains non-Golden. |

## Execution Handoff

Controller authorized planning and serialized repair dispatch for this P1.
PM assigns one `integration` writer only after this ledger is in
`implementing`. The writer must read `AGENTS.md`, `docs/project-status.md`,
`docs/threat-model.md`, `docs/contracts/generated-approval-ui-2-3.md`, this
plan, and this task's ledger before editing. No commit, branch, external
identity provider, real model call, deployment, or candidate promotion is
implied.
