# Task Ledger: CUI-04 Console Run-State Safety and Transition Recovery

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration)
- **Specialization:** integration
- **Contract owner:** integration
- **Contract status:** frozen; no contract change
- **Contract artifact:** `docs/contracts/factory-ui-kit-v1.2.md` (`factory-ui-kit/v1.2`), plus the accepted CUI-01 overlay matrix
- **Allowed write paths:** `apps/console-next/components/console-workspace.tsx`, `apps/console-next/app/globals.css`, `tests/api/test_console_ui_sources.py`, `tests/web/fixture-control-plane.mjs`, `tests/web/console-next-e2e.mjs`, `tests/web/console-next-accessibility.mjs`, and `apps/console-next/tsconfig.json` solely after every owned CUI-04 browser/build harness has exited to normalize `include` to exactly `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`; this ledger, `docs/superpowers/plans/2026-07-28-cui-04-console-run-state-safety-and-recovery.md`, and `docs/project-status.md` on acceptance only. No other tsconfig field or path is authorized.
- **Read-only parallel work:** task review, QA, and release review only after the integration writer has handed off; no concurrent production or test writer.
- **Approved ADR:** not required. This is a bounded Console state-machine and recovery refinement inside frozen `factory-ui-kit/v1.2`; it adds no dependency, framework, API/data contract, Registry/Composer policy, generated package, or runtime topology.
- **Plan:** `docs/superpowers/plans/2026-07-28-cui-04-console-run-state-safety-and-recovery.md`

## Outcome

Make Console mutations and asynchronous lifecycle updates safe and legible:
one run request per permitted user action, action-specific in-progress feedback,
recovery from initial hydration and run-polling failures, and protection of a
locally entered Brief from late initial hydration.

## Non-goals

- Any control-plane, proxy, Executor, Registry, Composer, generated-app,
  component-package, Factory UI Kit, dependency, or API/data-contract change.
- A new retry policy, client persistence/cache, background worker, cancellation
  endpoint, polling cadence change, retry backoff contract, or automatic retry.
- Changing the accepted overlay matrix: Products opens left; Evidence opens
  right; Command and Stop open center; Lineage opens floating with explicit
  clear modal behavior.
- Mutating canonical Factory UI 1.0/1.1/1.2 assets, generated `ui.*@2.1.0`
  packages, locks, source-intake evidence, or historical rollback artifacts.
- Exposing raw briefs, credentials, model prompts/responses, upstream URLs, or
  capability tokens in state, notices, errors, tests, or evidence.

## Frozen interaction rules

1. **Synchronous mutation exclusion.** A mutation key is acquired before an
   API request begins and released only after its promise settles. A second
   click, keyboard activation, command action, or stale handler cannot create a
   duplicate project/version/approval/plan/run/stop request. The queue key is
   per selected approved plan and forbids a new run while the displayed run is
   `queued`, `running`, or `stopping`.
2. **Permitted run transitions.** `Queue build` is enabled only when there is
   no run, or the selected run is `failed`/`stopped`, the plan is approved, and
   no mutation is active. A queued/running/stopping run cannot expose a second
   queue action. `Stop preview` is enabled only for a ready preview with no
   active mutation; confirm immediately enters the stopping operation and
   cannot send a second stop request.
3. **Transition feedback.** The live status region and workspace status must
   name the active operation, rather than a generic `Working`: `Creating
   definition`, `Creating version`, `Approving definition`, `Creating component
   plan`, `Approving component plan`, `Queueing build`, `Requesting stop`, or
   `Downloading evidence`. Completion and failure retain an actionable,
   bounded notice/error without raw provider material.
4. **Conflict-only interaction lock.** While a mutation is active, disable
   project replacement/switching, New product, lifecycle-stage changes, Brief
   inputs/presets, Definition editing, and all state-changing controls. Keep
   theme selection and already available read-only Evidence/Lineage inspection
   usable when they do not issue the active mutation. Disabled controls must
   use native disabled semantics and remain absent from keyboard activation.
5. **Initial hydration recovery.** The first project-summary/project load has
   explicit loading, ready, and failed states. A failed initial load displays a
   labelled retry action that retries only the initial hydration request; it
   neither creates a product nor clears local Brief inputs.
6. **Late-hydration protection.** If the user types a Name or Brief, or applies
   a preset, before initial hydration resolves, the late response may update
   product summaries but must not select a project, change the lifecycle stage,
   or overwrite either local input. Selecting a product after hydration remains
   the explicit project-switcher action.
7. **Run-poll recovery.** A polling failure leaves the last trusted run data
   visible, announces a bounded status refresh failure, and exposes a labelled
   manual `Retry run status` action. That action refreshes only
   `GET /runs/{id}`, does not queue/stop a run, and resumes normal polling after
   success. Terminal `failed` and `stopped` runs do not continue polling.

## Acceptance criteria

1. Fixture-backed browser evidence proves that rapid mouse and keyboard queue
   activations result in exactly one `POST /plans/{id}/runs`, one Run identity,
   and an immediately visible `Queueing build` state; queued/running/stopping
   states expose no executable duplicate queue path.
2. Every existing mutating Console action has a stable operation identity,
   action-specific polite live feedback, native conflicting-control disablement,
   and a release path on success or failure. Read-only controls retain the
   existing overlay/focus contract when safe.
3. Confirming Stop sends exactly one stop request, disables repeat stop
   activation while the request/teardown is active, reports `Requesting stop`,
   and preserves the centered confirmation/focus-restoration behavior.
4. A fixture first-load failure exposes a labelled retry and reaches the normal
   ready workspace after manual retry; a fixture run-poll failure preserves
   the last run, exposes `Retry run status`, makes no queue/stop mutation, and
   recovers on retry.
5. With a deliberately delayed initial hydration response, a user-entered
   Name and Brief survive exactly; no project/version/definition/plan/run is
   selected until the user explicitly opens/selects a product. The raw Brief
   remains transient and excluded from API/state/evidence contracts.
6. Source and browser regressions cover action exclusion, operation-specific
   feedback, hydration and poll retry, late-hydration input preservation,
   overlay direction, keyboard focus, and no page overflow at the previously
   accepted target widths. No source test weakens a preceding CUI-01/02/03
   assertion.
7. Focused source tests, full agent/API suites, Console preflight/isolated
   build, workflow/accessibility E2E, syntax, diff, task review, QA, and
   release review pass with no unresolved P0/P1.

## Stop rules

- Stop and return to PM if delivery needs an API change, server-side idempotency
  change, client persistence, new dependency, Factory UI Kit change, generated
  UI change, polling backoff contract, or a new overlay direction.
- A test may not simulate safety only by disabling the button after a delayed
  render: it must prove a synchronous duplicate-request guard from the fixture
  request count.
- A failure notice containing a raw Brief, credential, provider response,
  upstream URL, or capability token is a P0 and blocks review.
- A retry that performs a write/mutation, clears local input, or changes the
  selected product without explicit user selection blocks QA.

## Required verification gate

```powershell
py -3.12 -m unittest tests.api.test_console_ui_sources -v
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
npm --prefix apps/console-next run preflight
$env:FACTORY_CONSOLE_DIST_DIR = '.next-cui04-verify'; npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
node --check apps/web/app.js
git diff --check
```

The browser/build harnesses own only their transient output directories. If
Next normalizes `tsconfig.json`, the sole writer restores only the frozen
four-entry `include` list after all owned harnesses exit, then reruns
`git diff --check`.

## Implementation evidence

- **RED:** the pre-CUI-04 Console had a generic `busy` boolean, no synchronous
  exclusion ref, no named operation feedback, no initial hydration retry, no
  poll retry, and no protection against late hydration overwriting local Brief
  input. The new source/browser assertions therefore failed before the writer
  installed the operation controller and deterministic fixture modes.
- **GREEN (2026-07-28, writer hand-off):** focused source suite passed 10/10.
  The fixture-backed workflow E2E passed with a deliberately delayed run POST,
  proving one `POST /plans/{id}/runs` for duplicate activation, named
  `Queueing build` feedback, native conflicting-control disablement, run poll
  failure/retry, centered Stop, and the existing overlay/focus behavior.
  `node tests/web/console-next-e2e.mjs --hydration-only` passed with delayed
  and failing initial hydration, proving manual retry and preservation of the
  locally entered Name/Brief. Accessibility E2E passed action-specific polite
  feedback, disabled semantics, keyboard behavior, evidence, Lineage, and
  focus restoration. Console preflight and isolated build passed; agent suite
  passed 4/4; the full API suite, JavaScript syntax, and `git diff --check`
  passed. The only post-harness configuration action was the authorized
  normalization of the frozen four-entry `tsconfig.json` include list.
- **PM hand-off inspection (2026-07-28):** inspected only CUI-04-authorized
  Console, fixture, source-test, E2E/accessibility-test, and `tsconfig` paths.
  The implementation contains the closed `Operation` union and labels,
  synchronous `operationRef`/`runMutation` guard, independent hydration/poll
  recovery state, `hasLocalBriefInput` protection, and the required retry
  controls. A fresh focused source run passed 10/10 and fresh agent governance
  run passed 4/4. No production/API/Factory-UI/generated-package/frozen
  contract path appears in this CUI-04 hand-off.
- **Residual risks:** the backend still supplies the authoritative durable
  state and must continue to reject duplicate/tampered execution independently.
  The CUI-04 synchronous guard is browser-side interaction exclusion only; it
  is deliberately not a replacement for server-side authorization,
  idempotency, approval, checksum, or Executor invariants.

## Task review

- Independent read-only task review found no P0/P1. It confirmed the operation
  ref closes same-tick duplicate activation, queue/stop predicates match the
  permitted transition rules, retries remain GET-only, and no frozen
  API/Factory-UI/generated-package boundary changed.

## QA

- QA passed with no P0/P1. Fixture-backed workflow evidence covered delayed
  duplicate queue activation, one run POST, named feedback, native disabled
  controls, poll retry without a write, initial-load retry, local Brief
  preservation after delayed hydration, and the accepted overlay/focus flows.

## Release review

- Independent release review passed with no P0/P1. It confirmed the frozen
  four-entry `tsconfig.json` include list was restored after owned harnesses
  exited and `git diff --check` was clean.

## PM decision

- **2026-07-28:** Founder-delegated Controller authorized this serialized
  Console-only safety and recovery slice. The frozen CUI-01 overlay matrix and
  `factory-ui-kit/v1.2` remain read-only. `/root` is the sole writer; this
  ledger is `implementing`. Acceptance requires fresh evidence, task review,
  QA, and independent release review with no unresolved P0/P1.
- **2026-07-28:** The single writer handed off recorded RED→GREEN evidence for
  all CUI-04 acceptance behaviors. PM inspected the authorized implementation
  surface and recorded fresh focused source (10/10) and agent-governance (4/4)
  evidence. The task advances from `implementing` to `ready_for_qa`; it is not
  accepted. Dispatch read-only task review and QA next, then an independent
  release review if no P0/P1 remains.
- **2026-07-28:** Task review, QA, and independent release review all reported
  no P0/P1. Founder-delegated Controller accepts CUI-04. PM advances the
  ledger from `ready_for_qa` to `reviewed` and then `accepted`; the documented
  browser-side-only duplicate exclusion remains a bounded residual, not a
  change to server-side security authority.
