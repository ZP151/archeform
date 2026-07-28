# Task Ledger: Generated Approval UI 2.2 Role-Aware Workflow Safety

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen
- **Contract artifact:** `docs/contracts/generated-approval-ui-2-2.md` (`generated-approval-ui/v2.2`)
- **Approved ADR:** `docs/adr/015-generated-approval-ui-2-2-role-aware-workflow-safety.md` (accepted)
- **Plan:** `docs/superpowers/plans/2026-07-28-generated-approval-ui-2-2-role-aware-workflow-safety.md`
- **Allowed write paths:**

  ```text
  packages/ui-kit/factory-ui/1.3.0/**
  packages/components/ui.*/2.2.0/**
  apps/api/component_composer.py
  apps/api/component_contract.py
  apps/api/component_registry.py
  apps/api/control_plane.py
  packages/composer-scaffold/1.0.0/frontend/app/globals.css
  packages/composer-scaffold/1.0.0/scaffold.json
  tools/factory_ui_kit.py
  tests/api/test_factory_ui_kit.py
  tests/api/test_component_contract.py
  tests/api/test_component_composer.py
  tests/api/test_component_planner.py
  tests/api/test_composable_control_plane.py
  tests/web/generated-approval-app-e2e.mjs
  tests/web/generated-composable-preview-e2e.mjs
  docs/contracts/generated-approval-ui-2-2.md
  docs/superpowers/ledgers/generated-approval-ui-2-2-role-aware-workflow-safety.md
  docs/superpowers/plans/2026-07-28-generated-approval-ui-2-2-role-aware-workflow-safety.md
  docs/project-status.md (PM acceptance only)
  ```

- **Read-only parallel work:** explorer/task review/QA/release review after
  integration hand-off only. No concurrent production/test writer.

## Outcome

Materialize an immutable candidate canonical `factory-ui@1.3.0` plus a coherent
eight-package `ui.*@2.2.0` generated approval family. Its assembled leave and
expense products must present a signed-out identity boundary, role-authorized
working destinations, deliberate approval/rejection confirmation, safe pending
and feedback behavior, read-only profile/settings, and reduced-motion support.

## Non-goals

- Mutation, relabeling, replacement, or silent fallback of any existing
  `factory-ui@1.0.0/1.1.0/1.2.0`, `ui.*@2.1.0`, historical lock, trust record,
  generated output, or Console asset.
- New frontend/backend dependency, API/data endpoint, session/authorization
  behavior, component/adapter schema, slot, Compose topology, cloud/runtime,
  model call, or external resource.
- Automatic 2.2 promotion. The writer may materialize only candidates; the
  Founder-delegated Controller/PM may authorize a trust-policy promotion only
  after the recorded package, Composer, browser, privacy, cleanup, QA, and
  release evidence is green.

## Acceptance criteria

1. Exact canonical 1.3 and all eight exact 2.2 package identities are
   inventory/digest/fixture/test/adapter/sidecar/trust complete. Existing
   canonical 1.0, Console 1.1/1.2, and generated 2.1 identities are unchanged.
2. New plan resolution rejects any missing, mixed 2.1/2.2, unsigned, stale,
   revoked, altered, incompatible, candidate, or non-Golden package before
   lock/output creation. Historical 2.1 replay remains exact and governed.
3. Signed-out output exposes only the contract identity boundary; no protected
   route/data/action is rendered or focusable. Signed-in route eligibility,
   destination rendering, stale-route fallback, and `aria-current` navigation
   conform exactly to the frozen behavior contract.
4. Approve/reject sends no request before confirm; cancel/Escape restore origin
   focus; pending controls cannot duplicate requests; result feedback/focus and
   immutable audit behavior are browser-proven.
5. Shared feedback, light/dark state, readable errors/pending/disabled states,
   reduced-motion behavior, keyboard focus, 390px/desktop layout, and read-only
   Profile/Settings are browser/accessibility-proven for leave and expense.
6. Composer/adapter containment, generated lock equality/differences, API
   smoke, Docker cleanup, and no raw brief/secret/provider-material inspection
   pass. Candidate promotion, if later authorized, is a separate explicit PM
   decision rather than a writer inference.
7. Required focused/full tests, task review, QA, and independent release review
   pass with no unresolved P0/P1.

## Dependencies

1. Accepted ADR-015 and frozen `generated-approval-ui/v2.2` behavior contract.
2. Existing `factory-component/v1`, `factory-component-adapter/v1`,
   `factory-composition/v1`, Golden runtime, and local role/session/API
   contracts remain read-only inputs.
3. Accepted ADR-004 candidate-to-Golden promotion procedure; no promotion is
   implicit in package metadata or visual evidence.
4. Existing leave/expense fixture and Docker Executor remain the only product
   execution evidence; no live-model call is required.

## Stop rules

- A need to change a frozen contract, existing identity/lock/trust record,
  API/data contract, package slot, dependency, runtime topology, or path
  outside this ledger stops implementation.
- Any signed-out protected control, ineligible/focusable route, blank selected
  destination, pre-confirm or duplicate decision request, missing focus return,
  raw error/secret exposure, mixed UI family, invalid canonical mapping,
  out-of-slot adapter write, unresolved P0/P1, or failed cleanup blocks QA.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit -v
py -3.12 -m unittest tests.api.test_component_contract -v
py -3.12 -m unittest tests.api.test_component_composer -v
py -3.12 -m unittest tests.api.test_component_planner -v
py -3.12 -m unittest tests.api.test_composable_control_plane -v
node tests/web/generated-approval-app-e2e.mjs
node tests/web/generated-composable-preview-e2e.mjs
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
node --check apps/web/app.js
git diff --check
```

## Implementation evidence

- **RED:** `test_generated_ui_2_2_candidate_family_has_its_own_canonical_identity`
  failed before the new immutable candidate roots existed; the governed Composer
  test then failed before confirmation, signed-out isolation, and role-route
  glue existed.
- **P1 repair:** the canonical verifier now rejects a generated 2.2
  distribution when its canonical `factory-ui@1.3.0` source CSS/token digest
  has drifted. Generated navigation is limited to assembled UI destinations;
  the candidate shell consumes that filtered navigation rather than rendering
  its own unfiltered copy. The affected approval action becomes natively
  disabled while its decision is pending. Confirmation gains dialog focus;
  governed failure feedback gains focus without exposing raw provider data.
- **Candidate boundary:** the actual eight `ui.*@2.2.0` package roots are
  package-validated and materialized only by the browser test harness for
  isolated candidate-preview evidence. A direct Registry regression proves
  those exact candidate identities are rejected before ordinary lock creation.
  The harness does not make them available to Planner or production execution.
- **GREEN (focused):**
  `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_component_composer tests.api.test_component_contract -q`
  passed **59 tests**. `ui.app-shell@2.2.0` and
  `ui.approval-queue@2.2.0` package tests each passed (3 tests each).
  Python and JavaScript syntax checks and `git diff --check` passed; the
  unrelated existing CRLF notice for Console `tsconfig.json` remains
  non-failing.
- **Browser execution:**
  `node tests/web/generated-composable-preview-e2e.mjs` passed with both
  direct candidate-preview products: `leave-approval` and
  `expense-approval`. Each started isolated API/web Compose services, exercised
  sign-out, role route eligibility, confirmation, pending, success/failure,
  audit, read-only, theme, responsive behavior, and completed Docker
  container/volume cleanup. The test records
  `previewFamily: candidate-ui-2.2`; normal Planner candidate refusal remains
  independently proven above.
- **Residual risks:** candidate 2.2 remains unavailable for new-plan selection
  until an explicit evidence-backed promotion decision. Full required suites,
  independent QA, task review, release review, and controlled real-model
  evidence remain outstanding.

### Repair cycle 1: candidate-evidence and historical-replay containment

- **Review finding:** QA and task review rejected the first browser harness:
  it created a normal Golden 2.1 plan/run and then directly overwrote its UI
  files with 2.2 templates. That made its stated candidate family disagree
  with its locks/manifests and bypassed Composer materialization. Review also
  found that candidate route filtering had leaked into 2.1 runtime output.
- **RED:**
  `test_candidate_browser_harness_uses_composer_materialization_not_a_ui_overlay`
  failed because the harness directly called `render_adapter_template_text`;
  `test_historical_2_1_runtime_scaffold_does_not_gain_candidate_route_filtering`
  failed because generated 2.1 source contained `AVAILABLE_ROUTES`.
- **Repair:** the browser-only Python harness now uses a test-only
  `CandidateVerificationRegistry`. It accepts only the complete exact
  candidate UI family, verifies candidate trust and canonical distribution,
  rejects Golden UI/mixed locks, and is passed to `ComponentComposer` for
  `create_plan_from_locks` plus `materialize`. Production Planner and its
  Registry remain unchanged and reject the same candidate locks. The Composer
  emits route filtering and render-time stale-route fallback only for 2.2;
  2.1 follows its historical unfiltered generator path.
- **GREEN:** targeted Composer regression suite passed (23 tests), including
  both new P1 tests. `FACTORY_E2E_APPLICATION_LIMIT=1 node
  tests/web/generated-composable-preview-e2e.mjs` exited 0 after a live
  Docker/Playwright candidate flow. The full two-product browser gate and
  fresh read-only re-review remain required.

## Task review

- **Cycle 1:** rework requested. QA/task review found the mixed-family
  candidate overlay and 2.1 route-filter leak recorded above. Both were
  returned to the single integration writer; post-repair review is pending.
- **Cycle 2:** rework requested. The reviewer found that
  `ui.app-shell@2.2.0` still emitted the predecessor
  `ui.app-shell.audit@2.1.0` marker from its AuditLog template. This was an
  identity/evidence P1, so QA did not begin.
- **Cycle 2 repair and re-review:** The root cause was a 2.1 template marker
  copied into the immutable 2.2 package and then bound by its inventory. A
  new Contract regression first failed on that exact file; the template now
  emits `ui.app-shell.audit@2.2.0`, and only the corresponding inventory item
  and package digest were regenerated. The browser candidate-preview test now
  rejects a materialized 2.1 audit marker and requires the 2.2 marker. Fresh
  Contract/Composer (49), app-shell package (3), and two-product preview
  evidence passed. Independent re-review found no P0/P1 and authorized QA.
- **Cycle 3 repair and re-review:** Release review required a canonical React
  digest binding under ADR-015. The red regression proved a modified canonical
  React file previously verified; it now fails closed. All eight 2.2 sidecars
  map the exact canonical React digest, their inventory/package digests were
  revalidated, and 2.1 remains CSS/token-only for historical replay. Independent
  re-review found no P0/P1 and authorized repeat QA.

## QA

- **2026-07-28:** Independent QA passed with no P0/P1. It verified all
  focused component/contract/composer/planner/control-plane suites (16, 26,
  23, 10, and 17 tests), both generated browser flows, full candidate-preview
  Docker evidence, agents/API discovery, Node syntax, and diff hygiene.
  It confirmed exact all-2.2 UI candidate locks, no historical audit marker,
  unchanged 2.1 replay, role/confirmation/audit/privacy behavior, distinct
  validated leave/expense inputs and output manifests, responsive/read-only
  views, and no leftover `factory_browser_e2e_` containers or volumes.
- **Repeat QA:** Pending after canonical React binding repair.
- **Repeat QA result:** Passed with no P0/P1. Factory UI kit, Contract, and
  Composer ran 66 tests; Planner and Control Plane passed; the complete
  leave/expense candidate Docker/Playwright flow, syntax, and diff hygiene
  passed. It independently verified React sidecar mapping, canonical React
  drift rejection, exact 2.2 audit markers, preserved 2.1 replay, Composer
  materialization, privacy scan, role/confirmation/audit behavior, and
  resource cleanup.

## Release review

- **Cycle 1:** rework requested. Independent release review found that the
  canonical verifier and every 2.2 sidecar bound only CSS and tokens. This
  violated ADR-015's required canonical React digest mapping: a temporary
  canonical React change still verified. Candidate promotion remains out of
  scope.
- **Cycle 1 repair:** A new red regression modified
  `react/factory-ui.tsx` and proved the verifier incorrectly accepted it. The
  verifier now binds and validates that digest for the 2.2 candidate family;
  all eight 2.2 sidecars and inventory-locked package digests were regenerated
  to include the exact canonical React digest. The historical 2.1 verifier
  path intentionally stays CSS/token-only, preserving replay evidence. The
  red test is now green along with the full Factory UI kit and Composer suites.
  Independent re-review, QA, and release review remain required.
- **Cycle 2:** Pending independent release review after repeat QA.
- **Cycle 2 result:** Independent release review passed with no P0/P1. It
  confirmed all eight packages remain candidates, exact CSS/token/React
  canonical bindings fail closed, historical identities have no diff, normal
  Registry rejection remains active, candidate evidence uses Composer rather
  than an overlay, and QA covers containment, privacy, role behavior, and
  cleanup. The PM advances `reviewed → accepted`; candidate promotion remains
  a separate explicit decision and is not granted here.

## PM decision

- **2026-07-28:** Founder-delegated Controller accepted ADR-015 and authorizes
  this serialized integration task. The behavior contract is frozen, `/root`
  is the only writer, and no candidate is promoted by this authorization.
  Implementation begins in `implementing`; acceptance requires all evidence
  and independent review gates above.
