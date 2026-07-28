# CUI-04 Console Run-State Safety and Transition Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make asynchronous Console transitions single-flight, explicit,
recoverable, and unable to overwrite locally entered Brief input while retaining
the accepted Console visual/overlay model.

**Architecture:** `ConsoleWorkspace` gains a small local operation controller:
a synchronous ref guards duplicate requests while typed React state drives
action-specific feedback and conflict-only disablement. Initial hydration and
run polling gain independent, manually retriable read paths. The fixture
control plane exposes deterministic one-shot failure and delay modes so
Playwright proves the behavior without changing any production API contract.

**Tech Stack:** Next.js 15.5.21, React 19.2.7, frozen Factory UI Kit v1.2,
Python unittest, Playwright, existing fixture control plane.

## Global Constraints

- CUI-04 is governed by
  `docs/superpowers/ledgers/cui-04-console-run-state-safety-and-recovery.md`.
- Preserve CUI-01 direction semantics: Products left, Evidence right, Command
  and Stop center, Lineage floating/clear modal; preserve all associated focus
  restoration and target-width behavior.
- Preserve `factory-ui-kit/v1.2`, all canonical 1.0/1.1/1.2 assets, generated
  `ui.*@2.1.0` packages, API/proxy paths, Registry/Composer/Executor behavior,
  and dependency closure exactly.
- No automatic retry, persistence/cache, server API/idempotency work, or raw
  Brief/provider/credential/capability exposure. Retry buttons issue only the
  explicitly stated GET read operation.
- `/root` is the sole writer. Run browser/build harnesses serially; restore
  only the frozen `tsconfig.json` include list after every owned harness exits.

## File structure

| Path | Responsibility |
| --- | --- |
| `apps/console-next/components/console-workspace.tsx` | Local operation state, synchronous exclusion, hydration/poll retry, input-protection, and accessible action feedback. |
| `apps/console-next/app/globals.css` | Only scoped presentation for operation/recovery feedback if the existing Factory primitives cannot express it without an ambiguous state. |
| `tests/web/fixture-control-plane.mjs` | Deterministic test-only counters, initial-load delay/failure, and run-poll failure modes. |
| `tests/api/test_console_ui_sources.py` | Static Console source guards for the recovery and exclusion seams. |
| `tests/web/console-next-e2e.mjs` | Actual fixture-backed duplicate queue, initial hydration, and poll retry behavior. |
| `tests/web/console-next-accessibility.mjs` | Native disabled semantics, live feedback, keyboard paths, and pre-existing overlay/focus regressions. |

---

### Task 1: Establish RED safety and recovery evidence

**Files:**

- Modify: `tests/api/test_console_ui_sources.py`
- Modify: `tests/web/fixture-control-plane.mjs`
- Modify: `tests/web/console-next-e2e.mjs`
- Modify: `tests/web/console-next-accessibility.mjs`

**Interfaces:**

- Consumes: existing `FactoryApi.request`, `Project`, `Plan`, `Run`, CUI-01
  overlay/focus behavior, and the fixture's capability-protected routes.
- Produces: a fixture configuration interface and executable failure proofs
  that the current generic `busy` implementation cannot satisfy.

- [ ] **Step 1: Add source guards for explicit operation ownership.**

  Add focused assertions that require a synchronous operation/mutation guard,
  named operation values, a `Retry initial load` control, a `Retry run status`
  control, and a local-brief/hydration protection branch. Do not assert source
  formatting or private variable names unrelated to these required seams.

  ```python
  self.assertIn("queue-run", workspace)
  self.assertIn("Retry initial load", workspace)
  self.assertIn("Retry run status", workspace)
  self.assertIn("hasLocalBriefInput", workspace)
  self.assertNotIn("Working'", workspace)
  ```

- [ ] **Step 2: Extend only the test fixture with deterministic modes.**

  Change `startFixtureControlPlane` to accept an optional configuration object
  such as:

  ```js
  startFixtureControlPlane({
    initialProjects: [{ name: 'hydrated-project' }],
    failInitialProjectsOnce: true,
    delayInitialProjectsMs: 300,
    failRunPollOnce: true,
    runCreateDelayMs: 200,
  });
  ```

  Keep default fixture behavior byte-for-byte compatible with existing tests.
  Expose only request counts and booleans needed by assertions, e.g.
  `state.runCreateRequests`, `state.initialProjectsRequests`, and
  `state.runPollRequests`. The fixture must never echo the requirement Brief
  into logs or response error text.

- [ ] **Step 3: Write failing browser cases.**

  Add four deterministic cases:

  ```js
  // Two immediate activations while POST /runs is intentionally delayed.
  await Promise.all([
    page.getByRole('button', { name: 'Queue build' }).click(),
    page.getByRole('button', { name: 'Queue build' }).click(),
  ]);
  assert.equal(fixture.state.runCreateRequests, 1);
  await page.getByText('Queueing build', { exact: true }).waitFor();

  // Initial summary failure is a read-only recovery path.
  await page.getByRole('button', { name: 'Retry initial load' }).click();
  assert.equal(fixture.state.initialProjectsRequests, 2);

  // A late first load cannot select/overwrite a locally edited Brief.
  await page.getByLabel('Name').fill('local-draft');
  await page.getByLabel('Describe what should happen').fill(localBrief);
  await page.getByLabel('Describe what should happen').evaluate((node, value) => node.value === value, localBrief);

  // Retrying run status performs one GET and no run mutation.
  await page.getByRole('button', { name: 'Retry run status' }).click();
  assert.equal(fixture.state.runCreateRequests, 1);
  assert.equal(fixture.state.stopRequests, 0);
  ```

  In the accessibility test, assert disabled mutation/navigation controls use
  native `disabled`, cannot be triggered via Enter/Space, action-specific
  feedback is inside the polite status region, and current Command/Stop/
  Evidence/Lineage focus behavior remains unchanged.

- [ ] **Step 4: Run RED evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: source guards fail because the Console has generic `busy`, no
  hydration/poll retry, and no local-input protection. Browser evidence fails
  because current queueing permits racing handlers and fixture modes have no
  recovery UI.

### Task 2: Implement the minimal local operation controller

**Files:**

- Modify: `apps/console-next/components/console-workspace.tsx`
- Modify: `apps/console-next/app/globals.css` only if Task 1 proves existing
  primitives cannot visibly distinguish operation/recovery status.

**Interfaces:**

- Consumes: Task 1's fixture/test names and the existing `FactoryApi` client;
  it does not change either the request paths or response types.
- Produces: `Operation`-driven feedback, single-flight mutation helpers,
  independent hydration/poll states, and native disabled predicates used by
  all state-changing controls.

- [ ] **Step 1: Replace generic mutation state with named operation state.**

  Define a closed local union and label map near the existing stage types:

  ```ts
  type Operation =
    | 'idle' | 'create-definition' | 'create-version' | 'approve-definition'
    | 'create-plan' | 'approve-plan' | 'queue-run' | 'stop-run'
    | 'download-evidence';

  const operationLabel: Record<Exclude<Operation, 'idle'>, string> = {
    'create-definition': 'Creating definition',
    'create-version': 'Creating version',
    'approve-definition': 'Approving definition',
    'create-plan': 'Creating component plan',
    'approve-plan': 'Approving component plan',
    'queue-run': 'Queueing build',
    'stop-run': 'Requesting stop',
    'download-evidence': 'Downloading evidence',
  };
  ```

  Store the active operation in React state for rendering and an acquired
  `useRef<Operation | null>` for same-tick exclusion. `runMutation(operation,
  action)` returns before issuing a request when the ref is occupied, clears
  only its own acquired value in `finally`, and never converts a read retry
  into a mutation.

- [ ] **Step 2: Bind every mutating action to the correct operation.**

  Route create project, child version, definition approval, plan creation,
  plan approval, queue run, stop run, and evidence download through the named
  helper. Derive `mutationActive` from `operation !== 'idle'`. Update the
  workspace badge and existing polite status region to announce the map label
  while active; retain existing successful notices and bounded errors.

  Establish pure predicates before rendering:

  ```ts
  const activeRun = Boolean(run && ['queued', 'running', 'stopping'].includes(run.phase || run.status));
  const mayQueueRun = Boolean(plan?.status === 'approved') && !mutationActive
    && (!run || ['failed', 'stopped'].includes(run.status));
  const mayStopRun = run?.status === 'ready' && Boolean(run.preview_url) && !mutationActive;
  const mayChangeWorkspace = !mutationActive;
  ```

  Apply them to the icon rail, project switcher, lifecycle stages, Brief
  inputs/presets, definition editor/actions, plan action, Queue/Stop actions,
  command entries, and confirmation action. Preserve theme and safe
  read-only Evidence/Lineage access. Never render `Queue build` as actionable
  during an active run.

- [ ] **Step 3: Add initial-hydration and poll recovery state.**

  Use separate state, not `Operation`, for the two GET paths:

  ```ts
  type HydrationState = 'loading' | 'ready' | 'failed';
  const [hydrationState, setHydrationState] = useState<HydrationState>('loading');
  const [runPollError, setRunPollError] = useState('');
  const hasLocalBriefInput = useRef(false);
  ```

  `hydrateProjects()` fetches summaries, selects a first project only when
  `hasLocalBriefInput.current` is false, and otherwise updates only the
  summary list. Its failure makes the labelled retry visible without clearing
  current local input. Mark the ref on Name and Brief edits and preset use.
  `refreshRunStatus()` performs only the existing GET, keeps the last Run on
  failure, and on success clears poll error and lets normal polling continue.
  Stop polling for terminal runs exactly as before.

- [ ] **Step 4: Retain accepted presentation and focus behavior.**

  Keep the existing semantic controls/IDs that CUI-01/02/03 tests consume:
  `open-lineage-trigger`, `build-evidence-trigger`, `stop-preview-trigger`,
  `cancel-stop-preview`, Command initial focus, Evidence visible filenames,
  and the exact Sheet sides. If a recovery display needs CSS, scope it to a
  new CUI-04-specific class; do not reintroduce deleted Brief-context selectors
  or change Factory UI asset files.

- [ ] **Step 5: Run focused GREEN evidence.**

  ```powershell
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  ```

  Expected: exactly one fixture run POST for duplicate activation; named live
  feedback; disabled conflicting controls; explicit initial/poll retries;
  preserved local Name/Brief; retained overlay/focus evidence.

### Task 3: Run release gates and hand off

**Files:**

- Update after implementation only: `docs/superpowers/ledgers/cui-04-console-run-state-safety-and-recovery.md`
- Modify after owned harnesses only when needed: `apps/console-next/tsconfig.json` restricted to the frozen `include` list.

**Interfaces:**

- Consumes: GREEN Task 2 Console state behavior and CUI-01/02/03/browser
  regressions.
- Produces: reproducible implementation evidence for task review, QA, and
  release review; it does not self-accept the task.

- [ ] **Step 1: Run the full serial gate.**

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

- [ ] **Step 2: Normalize the owned Next configuration only if necessary.**

  After all Console subprocesses exit, restore only:

  ```json
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
  ```

  Do not alter `compilerOptions`, `exclude`, aliases, or any other tsconfig
  field. Rerun `git diff --check`.

- [ ] **Step 3: Record an implementation hand-off.**

  Add to the ledger: RED and GREEN commands/output, changed paths, fixture
  counters, exact named operation labels, duplicate/stop request counts,
  initial/poll retry results, local-brief preservation observation,
  target-width/overlay/focus observations, residual risks, and the exact
  verification commands. Set no state beyond `ready_for_qa`; PM alone advances
  after task review, QA, and release review.

## Self-review

- Every requested safety concern maps to a concrete behavior and test: duplicate
  queue, conflicting interactions, named feedback, initial hydration retry,
  poll retry, and late hydration safety.
- The design makes the local UI safer without claiming to replace the control
  plane's durable authorization, approval, checksum, or Executor invariants.
- The allowed paths exclude frozen Factory UI packages, generated UI, API/data
  contracts, source intake, dependencies, and all overlay-direction changes.

## Execution handoff

Execute exclusively through
`docs/superpowers/ledgers/cui-04-console-run-state-safety-and-recovery.md`.
The `/root` integration writer must use systematic debugging for unexpected
failures and TDD for the implementation. After its GREEN hand-off, dispatch a
read-only task reviewer, QA, and an independent release reviewer before the PM
can reconcile the ledger.
