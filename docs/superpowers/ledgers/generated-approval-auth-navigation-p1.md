# Task Ledger: Generated Approval Auth/Navigation P1

- **State:** implementing
- **Owner:** pm
- **Single write owner:** `/root/generated_auth_navigation_p1_engineer` — sole
  `integration` writer within the listed paths.
- **Specialization:** integration (serialized generated package/Composer
  candidate boundary).
- **Contract owner:** integration
- **Contract status:** Controller-authorized writer materialization;
  `docs/contracts/generated-approval-auth-navigation-v1.md` must be created
  and frozen from Task 1 RED evidence before candidate 2.4 source changes.
- **Plan:**
  `docs/superpowers/plans/2026-07-28-generated-approval-auth-navigation-p1.md`
- **Approved governance:** Founder-delegated Controller authorizes the
  high-priority P1 investigation and repair dispatch. No framework,
  dependency, API/data contract, runtime, cloud, or promotion change is
  authorized.

## Outcome

Create a coherent immutable `ui.*@2.4.0` candidate family that prevents
signed-out keyboard exposure of generated approval-app protected navigation
and actions, while preserving local session/RBAC authority and existing
role-aware workflows.

## Non-goals

- No patch to historic generated 2.1/2.2/2.3 or canonical `factory-ui` roots.
- No CUI-08 Console source, live mapping, Lineage, or asset-topology change.
- No external identity provider, credentials persistence, session API/data
  change, Planner policy change, normal candidate selection, Golden promotion,
  cloud deployment, real model call, or release.
- No weakening/removal of the signed-out browser assertion without replacing it
  with the contract's explicit focusable-control inventory proof.

## Acceptance criteria

1. The auth/navigation v1 contract defines signed-out allow/deny controls,
   role-neutral account labels, signed-in `allowedRoutes`, version isolation,
   and fail-closed rejection identifiers.
2. A full exact `ui.*@2.4.0` candidate family is inventory/sidecar/fixture/
   test/trust complete, bound to immutable canonical `factory-ui@1.4.0`; every
   non-shell component requires `ui.app-shell@2.4.0` and mixed families fail.
3. Generated leave and expense outputs have no signed-out Primary navigation,
   protected action/route/Sign out control, or privileged role/destination
   label in their focusable keyboard surface; failed tests print the inventory.
4. After local sign-in, role-filtered navigation exactly matches
   `allowedRoutes`, keyboard focus works, submit/approve/reject/audit flows
   retain backend session/RBAC authority, and Sign out returns to the safe
   surface without residual state. Delayed 2.4-only decision/load completions
   after Sign out or role switch cannot recreate feedback, records, audit,
   confirmation, or protected controls.
5. Historic roots/packages remain byte-identical; no Console asset/path,
   external dependency, API/data schema, or normal Registry policy changes.
6. Full API/build/browser/Docker/diff gates, task review, QA, and release
   review report no unresolved P0/P1. 2.4 remains candidate-only/non-Golden.

## Task-review repair loop

- **2026-07-28 — Result:** FAIL; two P1 evidence gaps. State remains
  `implementing`; no QA, release review, acceptance, or promotion is allowed.
- **P1 / post-sign-out reset evidence:** Before any subsequent sign-in, each
  sign-out transition must assert the exact safe signed-out allowlist and
  assert absence of residual protected navigation/actions, request/record
  summaries, and audit content. Testing only the later sign-in path is not
  evidence of a clean signed-out boundary.
- **P1 / positive allowlist evidence:** Signed-out browser proof must compare
  the complete focusable-control inventory to the contract's exact positive
  allowlist: role-neutral account selector, theme control, feedback when
  present, and Sign in. Existing denylist/navigation checks remain required;
  they are insufficient by themselves because an unexpected focusable control
  could otherwise pass.
- **P2 / deferred:** Session-cookie revocation semantics are out of scope for
  this local UI candidate. They require a later ADR covering session lifecycle
  and are not a reason to weaken the current client-side sign-out boundary.
- **Controller decision:** The same writer is authorized to repair these test
  evidence gaps within existing paths. It must use TDD, rerun task review,
  then fresh independent QA and release review before PM may advance state.

### Evidence-repair re-review

- **2026-07-28 — Result:** FAIL; P1. State remains `implementing`; no QA,
  release review, acceptance, or promotion is allowed.
- **P1 / incomplete signed-out inventory:** The positive allowlist regression
  currently omits enabled `contenteditable`, `summary`, `iframe`, `object`,
  and `embed` surfaces. The same browser inventory helper must include all
  these families and preserve native control/link checks.
- **P1 / missing hostile proof:** Add a test-only hostile regression proving a
  protected focusable/browse surface in each omitted family is rejected by the
  exact signed-out inventory assertion. The assertion must identify the
  offending family/name; production output is not to be modified for this
  evidence repair.
- **Controller decision:** The same writer may modify only the existing listed
  generated browser test paths for this TDD repair. Re-review is required
  before fresh QA/release. Docker/network DNS availability for the named
  wrapper is an external pre-start condition, not a code-regression finding;
  once re-review passes, QA/release must await environment recovery and rerun
  all required Docker/browser gates before any acceptance decision.

### Complete-inventory re-review

- **2026-07-28 — Result:** FAIL; two P1 evidence gaps plus one P2 contract
  inconsistency. State remains `implementing`; no QA/release/acceptance.
- **P1 / accessible-name resolution:** The complete inventory must resolve and
  report `aria-labelledby` references, not only direct labels/text. A hostile
  protected surface whose only accessible name is `aria-labelledby` must fail
  the same assertion.
- **P1 / local-account combobox exception:** The account selector cannot pass
  as a generic labelled select. Assert its exact marker, fixture actor-ID
  option values/order, and deterministic role-neutral labels. Hostile arbitrary
  and privileged-looking option values/labels must be rejected.
- **P2 / feedback contract:** The former phrase `feedback when present` was
  ambiguous. The contract/test now supports a conditional allowlist: the
  uniquely identified feedback target is allowed only with a nonempty
  status/feedback message; otherwise it is absent. This is an evidence
  clarification, not a candidate/backend/policy change.
- **Controller decision:** Same writer has test-only authority within existing
  generated browser paths to add these regressions. Fresh local proof and
  task re-review are required before awaiting Docker/network recovery for
  named wrapper QA/release gates.

### Stale-async lifecycle P1

- **2026-07-28 — Result:** New P1; state remains `implementing`. Late
  `confirmDecision`/`load` async completions can currently write
  `.fp-feedback`, records, or audit state after Sign out or role switch.
- **Controller-approved source repair:** Production code authority is limited
  to `apps/api/component_composer.py` and only its explicit 2.4 emitted client
  branch. Add a generation/abort/epoch guard so stale response handlers cannot
  write client state after the current signed-in actor/session is invalidated.
  Historic 2.3 and earlier emitted source, backend API/session/RBAC, candidate
  policy, and all package assets remain frozen.
- **Required deterministic regression:** The listed generated browser tests
  must intercept delayed decision and load requests with explicit route/promise
  gates, trigger Sign out and role switch before release, then prove no stale
  feedback/records/audit/confirmation/protected control is rendered. Arbitrary
  delays/retries are not acceptable evidence. Fresh task review, QA, and
  release review remain mandatory after this repair.

### Async proof re-review

- **2026-07-28 — Result:** FAIL; P1. State remains `implementing`; no QA,
  release review, acceptance, or promotion is allowed.
- **P1 / abort-only proof is insufficient:** The previous held fetch aborted
  before fulfillment, so the guarded continuation never ran. It therefore
  does not prove the generation/actor guard rejects a stale completion.
- **P1 / same-actor proof is insufficient:** Reauthenticating the same actor
  cannot prove actor-mismatch containment. The deterministic regression must
  switch to a different actor before the old completion is released.
- **Controller decision:** Same writer has test-only authority within the
  listed generated browser path to install a deterministic completion seam
  that resolves a labelled stale response despite an aborted signal, with no
  production flag/source change. For delayed decision and delayed load/audit,
  assert stale completion cannot affect signed-out or different-actor feedback,
  records, audit, confirmation, or protected controls. No sleep/retry is
  permitted. Fresh task review, then QA/release, is required.

## Allowed write paths

```text
docs/contracts/generated-approval-auth-navigation-v1.md
packages/components/ui.app-shell/2.4.0/**
packages/components/ui.login-page/2.4.0/**
packages/components/ui.home-page/2.4.0/**
packages/components/ui.profile-page/2.4.0/**
packages/components/ui.system-settings-page/2.4.0/**
packages/components/ui.approval-form/2.4.0/**
packages/components/ui.my-requests/2.4.0/**
packages/components/ui.approval-queue/2.4.0/**
apps/api/component_composer.py
apps/api/component_registry.py
apps/api/component_contract.py
tools/factory_ui_kit.py
tests/api/test_component_composer.py
tests/api/test_component_contract.py
tests/api/test_factory_ui_kit.py
tests/web/generated-approval-app-e2e.mjs
tests/web/generated-composable-preview-e2e.mjs
docs/superpowers/ledgers/generated-approval-auth-navigation-p1.md
```

QA is read-only by default and may amend only the two listed generated browser
tests after fresh evidence identifies a test gap. QA cannot change assets,
Composer, contracts, Registry policy, or this ledger's state.

## Required evidence and gates

### Writer hand-off

```powershell
py -3.12 -m unittest discover -s tests/api -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/generated-approval-app-e2e.mjs
node tests/web/generated-composable-preview-e2e.mjs
git diff --check
```

The hand-off includes exact RED/Green output, emitted signed-out focusable
inventories for leave and expense, candidate locks/digests, historic snapshots,
signed-in role-route/focus/workflow evidence, cleanup evidence, and residual
risk.

### Task review, QA, and release gates

Read-only task review verifies candidate versioning, contract/source mapping,
no historic/Console/API/RBAC drift, and evidence quality. QA independently
repeats the full hand-off and role workflows. Release review repeats all gates
and confirms candidate-only status. P0/P1 always returns to the same writer;
PM alone changes state through `ready_for_qa → reviewed → accepted`.

## PM decision log

- **2026-07-28:** Fresh CUI-08 QA found an independent generated-app P1 at
  `tests/web/generated-composable-preview-e2e.mjs:344`: signed-out keyboard
  control inventory exposed protected/privileged text. This lies outside
  CUI-08's immutable-generated boundary. Founder-delegated Controller
  authorized this separate, high-priority investigation/repair plan and
  serialized integration writer. No source was changed by PM planning.

## Writer hand-off evidence — 2026-07-28

The State field remains PM-owned and is intentionally unchanged by this
writer.

### Contract, implementation, and isolation

- Added `docs/contracts/generated-approval-auth-navigation-v1.md`. It binds
  the repair to the candidate-only `ui.*@2.4.0` family, enumerates the
  role-neutral signed-out allowlist and protected-control denylist, preserves
  Composer-filtered signed-in `allowedRoutes`, and documents the four
  fail-closed identifiers.
- Materialized all eight exact candidate packages under
  `packages/components/ui.*\/2.4.0\/`; each has package inventory, fixture,
  tests, sidecars, lifecycle metadata, and canonical `factory-ui@1.4.0`
  evidence. Non-shell packages require `ui.app-shell@2.4.0`.
- Composer source mapping: `_runtime_scaffold_files` gates the auth-safe
  projection on shell version `2.4.0`; `_frontend_page` renders only local
  account ordinals while signed out. It retains actor IDs as option values,
  and its signed-in `ApplicationShell` path retains the existing server-backed
  session/RBAC and Composer-filtered route model.
- Historic `2.1`, `2.2`, `2.3`, canonical `factory-ui@1.4.0`, Console,
  backend/session/RBAC, and normal candidate selection are untouched. No
  package was promoted and no real model call was made.

### RED evidence

- The original isolated browser check failed with this signed-out focusable
  inventory (role labels leaked via the local account selector):

  ```json
  [
    {"tag":"button","role":"button","ariaLabel":"Switch to dark theme","visibleText":"Dark","keyboardReachable":true},
    {"tag":"select","role":"combobox","visibleText":"RequesterApproverObserver","associatedLabel":"Preview roleRequesterApproverObserver","value":"requester","keyboardReachable":true},
    {"tag":"button","role":"button","visibleText":"Sign in","component":"ui.login-page@2.3.0","keyboardReachable":true}
  ]
  ```

- The focused Composer regression was first RED because the generated page
  lacked `signedOutAccountLabel` and rendered `candidate.label` in the
  signed-out selector.
- The 2.4 trust regression was first RED because the Lucide closure verifier
  admitted only the 2.3 candidate identity.

### GREEN evidence

- `py -3.12 -B -m unittest discover -s tests/api -v` — **223 tests in
  250.858s, OK**; `console-next closure: CAPTURED`.
- All eight package-local 2.4 suites — **19 tests, OK**.
- `npm --prefix apps/console-next run preflight` — `console-next preflight:
  PASS`.
- `npm --prefix apps/console-next run build` — exit 0; Next.js 15.5.21
  optimized production build completed.
- `node tests/web/generated-approval-app-e2e.mjs` — exit 0 for isolated
  leave and expense generated applications.
- `FACTORY_E2E_INVENTORY=1 node tests/web/generated-composable-preview-e2e.mjs`
  — exit 0 for isolated leave and expense generated applications. Both
  emitted the same safe signed-out keyboard inventory:

  ```json
  [
    {"tag":"button","role":"button","ariaLabel":"Switch to dark theme","visibleText":"Dark","keyboardReachable":true},
    {"tag":"select","role":"combobox","visibleText":"Local account 1Local account 2Local account 3","associatedLabel":"Local accountLocal account 1Local account 2Local account 3","value":"requester","keyboardReachable":true},
    {"tag":"button","role":"button","visibleText":"Sign in","component":"ui.login-page@2.4.0","keyboardReachable":true}
  ]
  ```

- The generated browser suites additionally verify role-filtered navigation,
  keyboard activation/focus, submit, approve/reject, audit, sign-out/sign-in
  transitions, and isolated Docker cleanup for both fixtures.
- `node --check apps/web/app.js` and `git diff --check` both exited 0. The
  latter printed only Git's pre-existing CRLF-normalization warning for
  `apps/console-next/tsconfig.json`.

### Candidate locks

```text
ui.app-shell@2.4.0              sha256:3395df84ca216cb93a692ab3299fe570d0f9e31caff1d39a6af4202e6725c15d
ui.login-page@2.4.0             sha256:c4e2bcf9453e68cc75c0791f276e593c722a601717ce61b2c997b3e3616d7712
ui.home-page@2.4.0              sha256:8e4dd67e0b7ae605cc15a41a68b0fba2e448fb71dc4cb14a739b656492d6f7ea
ui.profile-page@2.4.0           sha256:f5d3ce24493c063d650569426782caa9c25f7a72bbb391f5437c0003ba507986
ui.system-settings-page@2.4.0   sha256:6a47cb02b065ba69ba7ff43c2b1db245acb3b3153e5b7aea2d906c5f886550f1
ui.approval-form@2.4.0          sha256:d3602a34dd02bc6114707c78a3896a1b6e6969af9ffa95e8387fb4c3dc4f4585
ui.my-requests@2.4.0            sha256:09ec24ccd450444c9ffa57a2012012648fed015b043a0f18cc3e6dbbaa7acf6e
ui.approval-queue@2.4.0         sha256:680d64c9e74f2ff41214b6d5e323931c739bf0dcf8e87114d9533ffee482281b
```

### Residual risk for review/QA

- This is candidate-only and therefore still needs independent task review,
  QA, and release review before PM status transition or any promotion.
- The policy remains local-session based by design; external identity,
  production deployment, and real-model generation are outside this repair.

## Writer evidence-repair hand-off — 2026-07-28

The State field remains PM-owned and unchanged. This repair changes only the
authoritative generated-browser evidence; no candidate asset, Composer,
backend/session API, or RBAC source changed.

### Root cause and repair

- Task review correctly found two evidence gaps: the prior assertion only
  admitted broad safe control *roles*, and `switchAndSignIn` called the next
  local sign-in immediately after Sign out without proving the reset surface.
- `tests/web/generated-composable-preview-e2e.mjs` now classifies each
  focusable element and requires exact positive equality with the three
  current keyboard controls: `theme-control`, `local-account-selector`, and
  `sign-in`. The selector must expose only `Local account N` labels; its
  retained actor ID value is intentionally not presented as user-facing text.
- Every `switchAndSignIn` first invokes `assertSignedOutBoundary`. Besides the
  exact focusable allowlist, it proves absence of Primary navigation,
  Approve/Reject/Sign out controls, approval/queue/request/audit component
  content, row summaries, submitted record text, and per-profile immutable
  audit event text. This happens before the next actor is selected or the
  session endpoint is invoked.

### Fresh evidence

- `FACTORY_E2E_INVENTORY=1 node tests/web/generated-composable-preview-e2e.mjs`
  — exit 0. Leave and expense each passed the initial surface plus all four
  post-sign-out transitions: submitter→approver, approver→submitter,
  submitter→approver retry, and approver→auditor/observer. Every recorded
  inventory was exactly theme control, role-neutral local account selector,
  and `ui.login-page@2.4.0` Sign in; protected content and residual state
  assertions passed before each re-sign-in. Isolated Docker cleanup also
  passed.
- `py -3.12 -B -m unittest discover -s tests/api -v` — **223 tests in
  262.155s, OK**; `console-next closure: CAPTURED`.
- `npm --prefix apps/console-next run preflight` — PASS.
- `npm --prefix apps/console-next run build` — exit 0; Next.js 15.5.21
  production build completed.
- `node --check apps/web/app.js`, `git diff --check`, and candidate 2.4
  bytecode absence check — exit 0. Git printed only its existing CRLF warning
  for `apps/console-next/tsconfig.json`.

### External gate condition

- The subsequent named wrapper command
  `node tests/web/generated-approval-app-e2e.mjs` could not start Docker
  because Docker Desktop failed DNS resolution for `registry-1.docker.io`
  while checking uncached `node:22.14.0-alpine` and `python:3.12.8-slim`
  metadata. It failed before application startup or browser assertions; the
  exact imported composable proof had passed immediately beforehand. Docker
  inspection found no services or volumes for the failed project. No retry
  workaround, image pull, Compose change, or network-side action was made.

### Residual risk

- Independent task review must decide whether the direct authoritative
  composable proof plus the documented transient wrapper environment failure
  satisfies its gate or whether Docker network/image availability must recover
  for a fresh wrapper rerun. PM state must not advance until that decision and
  subsequent QA/release review are complete.

## Writer complete-inventory repair hand-off — 2026-07-28

The State field remains PM-owned and unchanged. This second review repair is
limited to `tests/web/generated-composable-preview-e2e.mjs`; no candidate,
Composer, backend/session/RBAC, or package source changed.

### Root cause and RED evidence

- Task review identified that the prior focusable inventory did not enumerate
  every native/embedded focusable family. A test-only hostile-surface harness
  injects a protected `Approve` surface for each of: native button, input,
  select, textarea, link, contenteditable, summary, iframe, object, embed,
  audio controls, and video controls. Each injected surface must both appear
  in the inventory and make the exact positive signed-out allowlist fail.
- First RED: the inventory reported only the three legitimate signed-out
  controls and failed `inventory must capture hostile summary surface`.
- Second RED: after adding selector entries, an unadorned contenteditable
  surface was still removed by the generic `tabIndex >= 0` filter. This
  demonstrated that selector coverage alone did not establish a complete
  keyboard inventory.

### Repair and GREEN evidence

- The test-only inventory now includes native controls/links, contenteditable,
  summary, iframe, object, embed, and controlled audio/video; it maps their
  semantic roles, records visible/accessibility value, placeholder, and title
  fields, and permits intrinsic focusable families through to actual focus
  verification. `contenteditable="false"` remains excluded.
- Protected text matching now uses word boundaries and treats the retained
  actor ID of the role-neutral local-account selector as non-public state. All
  other interactive values remain inspected. This prevents the allowed
  internal `approver` value from being confused with the prohibited `Approve`
  action while preserving hostile-input rejection.
- `FACTORY_E2E_APPLICATION_LIMIT=1 node
  tests/web/generated-composable-preview-e2e.mjs` — exit 0 for leave after
  every hostile family was injected/rejected and the complete workflow ran.
- `node tests/web/generated-composable-preview-e2e.mjs` — exit 0 for both
  leave and expense with all hostile-family rejections, exact positive
  allowlist checks, all post-sign-out reset checks, role workflows, and Docker
  cleanup.
- `py -3.12 -B -m unittest discover -s tests/api -v` — **223 tests in
  272.063s, OK**; `console-next closure: CAPTURED`.
- `npm --prefix apps/console-next run preflight` — PASS; `npm --prefix
  apps/console-next run build` — exit 0 (Next.js 15.5.21 production build).
- `node --check apps/web/app.js` and `git diff --check` — exit 0. Git emitted
  only its existing CRLF-normalization warning for
  `apps/console-next/tsconfig.json`.

### Review scope

- Re-review the complete-inventory helper and hostile-family regression, then
  proceed to fresh independent QA/release review. Candidate 2.4 remains
  candidate-only and no PM state transition is implied by this writer record.

## Writer accessibility/strict-allowlist re-repair — 2026-07-28

The State field remains PM-owned and unchanged. This writer added only
test-browser evidence; no candidate, Composer, backend/session/RBAC, package,
or policy source changed.

### RED and evidence expansion

- A hostile button whose only name was `aria-labelledby` first failed because
  the inventory emitted it with no resolved name. The test uses reverse
  attribute-token order and document-order text `Approve Audit`, proving the
  resolver must follow referenced nodes rather than direct labels alone.
- The inventory now records raw and document-order resolved
  `aria-labelledby`, final accessible name, select options, frozen
  local-account label marker, and governed-feedback marker. It rejects the
  labelled hostile along with prior native/embedded hostiles.
- The local-account exception is now strict: it requires the frozen
  `label.fp-field:Local account` marker, exact fixture actor-ID option values
  in order, and `Local account 1…N` labels in order. Test-only hostile extra
  arbitrary options and privileged-looking labels both must be rejected.
- A nonempty `.fp-feedback` status/alert is conditionally accepted as the
  sole additional identified feedback surface; an empty target is excluded.

### Current gate result: blocked by newly observed product behavior

- One-fixture leave proof passed all expanded accessibility/allowlist tests.
- The required two-fixture proof failed at
  `submitter-to-approver retry sign-out`: after Sign in appeared and a
  condition had observed `.fp-feedback` absent, the feedback target reappeared
  before the immediate zero-count assertion. This is a late asynchronous
  feedback write following Sign out, not a static inventory gap.
- Source inspection shows `switchRole` clears feedback, but asynchronous
  decision/load paths can still schedule a later feedback update. The current
  authorization explicitly prohibits candidate/backend source changes, so the
  writer did not delay, suppress, or otherwise mask this failure.

### Required controller decision

- Treat this as a P1 behavioral blocker. A new version-gated candidate source
  repair authorization (or an explicit product decision) is required before
  re-review/QA/release can continue. The PM must not advance state based on
  the one-fixture result.

## Writer stale-async containment hand-off — 2026-07-28

The State field remains PM-owned and unchanged. The controller-authorized
repair changes only the 2.4 emitted client path in
`apps/api/component_composer.py` and the authorized Composer/browser tests.
No backend API/session/RBAC, package asset, policy, or historic emitted branch
was changed.

### Root cause, RED, and repair

- RED: the two-fixture generated-browser proof observed an empty signed-out
  feedback boundary and then a late `.fp-feedback` write after Sign out.
- Candidate 2.4 now creates a monotonically increasing session generation and
  retains one `AbortController` ref. Every `load` and `confirmDecision`
  completion captures the generation and actor, checks both before state
  writes, and ignores invalidated work. Sign out/role switch increments the
  generation, aborts the active request, and synchronously clears records,
  audit events, feedback, confirmation, and pending state.
- The source-level regression proves these symbols are emitted only when
  `auth_safe_candidate=True`; a historic page contains neither the generation
  nor abort-controller symbols.

### Deterministic browser regressions

- Replaced the previous 250ms decision delay with an explicit Playwright
  promise gate.
- A delayed rejected-decision route is captured, Sign out occurs before its
  gated response is released, and the exact safe signed-out inventory is
  reasserted before and after release.
- A first-auditor delayed `/audit-events` route is captured, that session is
  invalidated, a new auditor generation is started, and the delayed route is
  released with a `stale.audit` fixture. The new session must never render the
  stale marker. The regressions contain no timing delay or retry.

### Fresh evidence

- `py -3.12 -B -m unittest tests.api.test_component_composer
  tests.api.test_component_contract tests.api.test_factory_ui_kit -v` — 82
  tests, OK.
- `node tests/web/generated-approval-app-e2e.mjs` — exit 0.
- `node tests/web/generated-composable-preview-e2e.mjs` — exit 0 for leave
  and expense candidate 2.4 fixtures, including both gated stale-async cases
  and Docker cleanup.
- `py -3.12 -B -m unittest discover -s tests/api -v` — completed after the
  full suite; no failure output was emitted. A later accidental duplicate
  quiet runner was stopped while the original full runner continued, so QA
  should independently rerun this required gate.
- `node --check apps/web/app.js`, `node --check
  tests/web/generated-composable-preview-e2e.mjs`, and `git diff --check` —
  exit 0. Git reported only the pre-existing CRLF warning for
  `apps/console-next/tsconfig.json`.

### Residual risk and next gate

- The source transformation is intentionally version-gated after page
  rendering so historic client output is not changed. Task review must inspect
  this containment and the deferred-route cases; QA must rerun the full API
  and named browser gates independently before release review.

## Writer async-proof re-repair hand-off — 2026-07-28

The State field remains PM-owned and unchanged. This repair changes only
`tests/web/generated-composable-preview-e2e.mjs`; no production, package,
backend, API, session, RBAC, policy, or generated source changed.

### RED and deterministic completion seam

- RED: the original held-route proof let the browser abort the fetch before
  route fulfillment, so no guarded client continuation ran. A normal pointer
  Sign out is also blocked by the pending confirmation backdrop, which is
  expected product behavior but cannot exercise invalidation during a held
  decision.
- The browser test now installs an `addInitScript`-only fetch seam before page
  load. It captures an armed path, ignores the aborted signal after release,
  and resolves a labelled JSON `Response` directly to the existing generated
  client promise. This is test harness code only; it does not add a product
  flag, source hook, or emitted asset.
- The pending-decision proof invokes the existing Sign out handler through a
  test-only DOM click while the modal overlay blocks pointer interaction.
  This executes the real invalidation controller without weakening the UI.

### Different-actor stale-completion evidence

- Decision: an approver's delayed rejected-decision completion is captured,
  the safe signed-out boundary is asserted, a submitter signs in, and the
  labelled `stale-decision-*` response is released. The new actor has no
  feedback, confirmation, decision result, stale payload, Approve, or Reject
  leakage.
- Audit: an auditor/observer delayed `/audit-events` completion is captured,
  the actor signs out, a submitter signs in, and a labelled `stale-audit-*`
  response is released. The new actor has no feedback, confirmation, stale
  payload, Approve/Reject control, or audit surface leakage.
- Every assertion names the old actor, new actor, delayed request class, and
  sentinel. The proof uses promise capture/release and one animation-frame
  completion boundary, never sleeps or retries.

### Fresh evidence

- `FACTORY_E2E_APPLICATION_LIMIT=1 node
  tests/web/generated-composable-preview-e2e.mjs` — exit 0 for leave.
- `node tests/web/generated-composable-preview-e2e.mjs` — exit 0 for leave
  and expense, including both deterministic post-abort continuation cases and
  Docker cleanup.
- `node --check tests/web/generated-composable-preview-e2e.mjs` — exit 0.

### Next gate

- A fresh task review must inspect the test-only completion seam, DOM-click
  controller invocation, and cross-actor assertions before QA/release work
  resumes.
