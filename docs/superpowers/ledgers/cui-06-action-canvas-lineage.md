# Task Ledger: CUI-06 Action Canvas and Inspectable Lineage

- **State:** implementing
- **Owner:** pm
- **Single write owner:** `/root/cui06_isolated_console_runner_engineer` —
  fresh test-harness writer for the isolated copied-Console extension only.
  Only the two existing browser-harness files are authorized; no production,
  API, dependency, package, contract, or runtime path is authorized.
- **Specialization:** frontend
- **Contract owner:** integration
- **Contract status:** frozen; no contract change is authorized.
- **Frozen interaction invariant:**
  `docs/contracts/factory-ui-console-v1.3.md` supplies the existing overlay,
  viewport, focus, and lifecycle constraints. CUI-06 carries those invariants
  forward while creating an immutable implementation successor; it does not
  create, revise, or broaden a public contract.
- **Plan:**
  `docs/superpowers/plans/2026-07-28-cui-06-action-canvas-lineage.md`
- **Plan extension:**
  `docs/superpowers/plans/2026-07-28-cui-06-isolated-console-copy-runner.md`
- **Approved governance:** Founder-delegated internal approval; no new ADR is
  needed because this slice adds no framework, dependency, API/data contract,
  runtime, or topology.
- **Blocked condition (historical):** Three repair/review cycles failed to close the P1
  browser-harness cleanup boundary. In the accessibility cleanup-only
  multi-case path, a snapshot race can restore a test-owned randomized Next
  dist reference after PASS. The tracked `next-env.d.ts` is currently
  restored/clean and production scope remains unchanged.
- **Historical exception authorization:** Founder-delegated Controller
  authorized a fifth test-only cleanup-lifecycle repair. It remains historical
  evidence only and did not resolve the child-exit blocker.
- **Historical sixth strategy authorization:** The earlier exact-owned-PID
  process-tree authorization remains historical evidence only. The seventh
  authorization below supersedes its lifecycle ordering requirements.
- **Historical seventh strategy authorization:** The earlier root-PID
  process-lifecycle authorization remains historical evidence. The eighth
  authorization below adds its required taskkill-result fail-closed guard.
- **Eighth strategy authorization:** Founder-delegated Controller authorizes
  a narrow test-only correction to verify both taskkill command success and
  owned-PID absence before restoration. It never permits broad process targets
  or expands production, API, dependency, package, contract, or generated-
  application scope.
- **Historical taskkill blocker:** In real Windows full E2E, `taskkill` exited
  `255` for a transient Next jest-worker child. The fail-closed guard correctly
  prevented cleanup/restoration and `apps/console-next/next-env.d.ts` remained
  clean. The isolated-copy strategy below supersedes workspace-mutating runner
  cleanup without changing product runtime topology.
- **Isolated-copy authorization:** Founder-delegated Controller authorizes each
  browser harness to create a unique OS-temporary Console copy excluding build
  output, create a local junction/symlink only to the existing locked
  `node_modules`, run Next only from that copy, and remove only the validated
  temporary parent. The workspace `apps/console-next/next-env.d.ts` must never
  be written.
- **Refined cleanup policy:** When and only when a runner is an already-
  validated OS-temporary Console copy, its exact owned root PID is verified
  absent (`ESRCH`), `taskkill` returned nonzero, and deletion of that exact
  validated temporary copy succeeds, cleanup records a safe
  `degraded-tree-termination` status and is successful. If the root is not
  `ESRCH`, copy validation fails, or deletion fails, cleanup remains fail-
  closed. Workspace `next-env.d.ts` remains untouched by design.

## Outcome

Replace the Console's visually heavy lifecycle-card deck with a compact,
action-first workspace and make Product Lineage a complete, ordered, selected-
node-inspectable floating canvas. The Console remains a local Factory control
surface, not a generated application.

## Non-goals

- No new npm package, icon library, dependency-manifest, or lockfile change.
- No API, proxy, control-plane, Planner, Composer, Registry, Executor, or
  generated-application mutation.
- No graph persistence, graph editing, drag-and-drop, new route, graph API,
  generated-app Lineage, model-derived graph content, or raw brief/model data.
- No mutation, replacement, relabelling, or inventory refresh of
  `factory-ui-console@1.3.0` or historical Console/generated UI assets.
- No Product/Versions drawer redesign: Products stays left; Evidence stays
  right; Command and Stop stay centered.

## Acceptance criteria

1. `factory-ui-console@1.4.0` exists as a new canonical package, has exact
   `factory-ui-console` / `1.4.0` identity and complete inventory, and the
   live Console three-file copy matches its final bytes. Altered 1.4 live copy
   fails closed; 1.3 and generated assets remain independently verifiable.
2. The stage rail is compact and action-first at desktop and 390px, retains
   exactly four labelled native lifecycle buttons, preserves the existing
   `stageItems` eligibility/approval/run semantics and `aria-current`, and
   does not cause document horizontal overflow.
3. The active work surface contains the actionable current stage rather than
   large static explanatory regions, while retaining required visible labels,
   primary actions, errors, notices, artifact names, and run controls.
4. Product Lineage remains a floating clear-overlay modal, bottom-right and
   bounded at desktop, symmetric/inset-safe at 701–900px, and fully usable at
   390px; maximize is its only full-canvas path.
5. A graph with more than four plan components renders every component exactly
   once in deterministic `ui.`, `backend.`, `workflow.`, `data.`, `ops.`, then
   lexical order; no `+N more packages` synthetic node remains.
6. Selecting any graph node is keyboard-operable and visibly/semantically
   exposes only safe kind, label, identifier/version, and status. Selection
   survives maximize/restore; Escape/Close restores focus to the Lineage
   trigger.
7. Existing overlay direction, Command combobox behavior, light-default/dark
   themes, reduced-motion behavior, and approval/build workflow tests remain
   green. No P0/P1 remains after task review, QA, and release review.

## Safety invariants

- The graph derives only from already-loaded typed Factory records and retains
  `lineage-model.ts` safe-label sanitization and kind allowlist.
- No raw brief, model request/response, secret, token, local path, arbitrary
  code, or artifact body enters the graph DOM, diagnostics, or tests.
- The existing stateful API remains the authority for all lifecycle decisions;
  the stage rail and graph are presentation/inspection only.
- A shared contract/dependency/API change stops this work and returns it to
  integration before further frontend implementation.

## Dependencies and sequencing

1. The accepted CUI-05 Products-left regression and accepted Console 1.3
   overlay matrix are the baseline.
2. Task 1 — `compact action-first workspace/stage rail` — starts first and
   creates the immutable Console 1.4 identity.
3. A read-only Task 1 reviewer must report no unresolved P0/P1 before Task 2
   starts.
4. Task 2 — `floating Lineage ordering and selected-node inspection` — runs
   only after Task 1 review. It uses the same 1.4 canonical/copy paths and is
   therefore never parallel with Task 1.
5. QA begins only after Task 2 hand-off and task review. Release review begins
   only after QA evidence is recorded.

## Allowed write paths

The assigned Task 1/2 writer may modify only:

```text
packages/ui-kit/factory-ui-console/1.4.0/**
apps/console-next/components/factory-ui/factory-ui.css
apps/console-next/components/factory-ui/tokens.css
apps/console-next/components/factory-ui/factory-ui.tsx
apps/console-next/components/factory-ui/lineage-model.ts
apps/console-next/components/factory-ui/lineage-node.tsx
apps/console-next/components/factory-ui/lineage-dag.tsx
apps/console-next/components/console-workspace.tsx
apps/console-next/app/globals.css
tools/factory_ui_kit.py
tests/api/test_factory_ui_kit.py
tests/api/test_console_ui_sources.py
tests/web/console-next-e2e.mjs
tests/web/console-next-accessibility.mjs
docs/superpowers/ledgers/cui-06-action-canvas-lineage.md
```

QA may modify only the two `tests/web/console-next-*.mjs` files after the
writer hand-off. `pm` is the only role allowed to change this ledger state.

## Required evidence

### Task 1 writer hand-off

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
npm --prefix apps/console-next run preflight
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
git diff --check
```

The hand-off records one focused RED failure for the missing 1.4 identity and
one for the old stage-card layout, followed by exact GREEN command output at
desktop and 390px.

### Task 2 writer hand-off

```powershell
py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v
npm --prefix apps/console-next run preflight
npm --prefix apps/console-next run build
node tests/web/console-next-e2e.mjs
node tests/web/console-next-accessibility.mjs
git diff --check
```

The hand-off records one focused RED failure for truncated component nodes and
one for absent selected-node inspection, followed by exact GREEN outputs for
the all-component fixture, selection/maximize persistence, desktop, 390px,
and 701–900px behavior.

### QA gate

QA independently reruns the Task 2 commands and adds focused browser
regressions only where a demonstrated coverage gap exists. QA must verify:

- one immutable 1.4 Console identity and no accidental historical mutation;
- all four lifecycle buttons, state/disabled semantics, keyboard focus, light
  default/dark mode, reduced motion, and no 390px horizontal overflow;
- Products-left, Evidence-right, Command/Stop-center, Lineage-floating;
- complete ordered component graph, safe selected-node inspector, keyboard
  activation, maximize/restore persistence, modal containment, and focus
  restoration;
- no changed package/dependency/API/proxy/generated-app files.

### Task review and release review

Task reviewer 1 and Task reviewer 2 are read-only and each report scope,
identity, lifecycle, accessibility, safety, and evidence findings. P0/P1
returns to the corresponding writer and requires re-review. The independent
release reviewer runs the complete required gate, checks the dirty worktree
for out-of-scope paths, and reports a pass only when no unresolved P0/P1
exists.

## PM decision log

- **2026-07-28:** Created in `planned` state. Founder delegated internal
  approvals. No writer is authorized until PM assigns one implementation owner
  and changes state to `implementing`.
- **2026-07-28:** Founder-delegated Controller authorizes CUI-06
  implementation. PM advances this ledger `planned → implementing` and assigns
  `/root/cui06_frontend` as the sole frontend writer for Task 1. All allowed
  paths, non-goals, contract ownership/status, serial Task 2 gate, and
  required review/QA/release gates remain unchanged.
- **2026-07-28:** Task 1 re-review reports no unresolved P0/P1. PM records
  Task 1 complete, retains CUI-06 in `implementing`, and assigns
  `/root/cui06_lineage_frontend` as the sole frontend writer for serialized
  Task 2. The frozen scope, allowed paths, contract ownership/status, and all
  remaining task-review/QA/release gates are unchanged.
- **2026-07-28:** Task 2 review reports no unresolved P0/P1. PM records Task 2
  complete and advances CUI-06 `implementing → ready_for_qa`. QA may now
  validate only within the existing test-path authorization; the frozen scope,
  contract, non-goals, and later release-review gate remain unchanged.

## Fresh implementation, review, QA, and release evidence

No implementation has started. This section is filled in chronological order
by the assigned writer, reviewers, QA, release reviewer, and PM; only PM may
change the ledger state.

### 2026-07-28 — Task 1 writer hand-off (`/root/cui06_frontend`)

- **Changed paths:**
  `packages/ui-kit/factory-ui-console/1.4.0/{factory-ui.css,tokens.css,react/factory-ui.tsx,factory-ui.manifest.json}`;
  `apps/console-next/components/factory-ui/{factory-ui.css,tokens.css,factory-ui.tsx,lineage-dag.tsx}`;
  `apps/console-next/components/console-workspace.tsx`;
  `apps/console-next/app/globals.css`;
  `tests/api/test_factory_ui_kit.py`;
  `tests/api/test_console_ui_sources.py`; and
  `tests/web/console-next-e2e.mjs`.
- **Focused RED:**
  `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v`
  ran 33 tests and failed as expected: 1.4 raised
  `FactoryUiKitError: canonical_manifest_unavailable`, and the source guard
  found the narrow lifecycle rail's `flex-wrap: wrap` rule. The paired
  `node tests/web/console-next-e2e.mjs` run reached the new 390px assertion
  and failed as expected with `actual 'wrap'`, `expected 'nowrap'`.
- **GREEN evidence:**
  `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v`
  — `Ran 33 tests ... OK`.
  `npm --prefix apps/console-next run preflight` —
  `console-next preflight: PASS`.
  `node tests/web/console-next-e2e.mjs` — `console-next workflow: PASS`.
  `node tests/web/console-next-accessibility.mjs` —
  `console-next accessibility and runtime containment: PASS`.
  `git diff --check` exited 0 (only Git's pre-existing CRLF notice for
  `apps/console-next/tsconfig.json` was emitted).
- **Viewport and identity proof:** the browser regression confirms exactly
  four labelled stage buttons, their enabled/disabled state, keyboard focus,
  no document overflow at 390/560/768px, and a 390px internal horizontal
  lifecycle rail. `verify_factory_ui_kit` validates the exact
  `factory-ui-console`/`1.4.0` identity and rejects a tampered live CSS copy;
  `git diff --no-index --quiet` confirmed CSS, tokens, and React primitive
  byte equality between the 1.4 canonical root and live Console copy.
- **Residual risk:** one initial combined browser command intermittently
  failed an existing Command-to-Products focus-restoration assertion before
  reaching the Task 1 assertion; an immediate clean rerun passed end-to-end.
  No production focus logic was changed for that unrelated observation.
- **Review readiness:** ready for the required read-only Task 1 review; this
  entry does not change ledger state.

### 2026-07-28 — Task 1 review repair round 1 (`/root/cui06_frontend`)

- **P1 repair:** moved the connected compact lifecycle rail contract into
  `packages/ui-kit/factory-ui-console/1.4.0/factory-ui.css` (desktop connector,
  compact ordinal markers, and 780px internal horizontal scroll). The live
  `apps/console-next/components/factory-ui/factory-ui.css` is the exact same
  byte sequence. The 1.4 manifest CSS digest was regenerated to
  `sha256:d3f55fe3c53f0ddeec09f0fa4d41dae593f8ea82668381255cc2235da1ea3598`.
- **Focused RED:**
  `py -3.12 -m unittest tests.api.test_factory_ui_kit.FactoryUiKitTests.test_console_action_canvas_canonical_owns_the_connected_compact_stage_rail -v`
  failed as expected before the primitive change: the 1.4 canonical CSS did
  not contain `.factory-stage-rail { position: relative; display: flex;
  align-items: stretch; gap: 0;`.
- **GREEN:** the focused asset regression now passes. The fresh combined
  source/identity command reported `Ran 34 tests ... OK`; preflight reported
  `console-next preflight: PASS`; a standalone
  `node tests/web/console-next-e2e.mjs` reported
  `console-next workflow: PASS`; and
  `node tests/web/console-next-accessibility.mjs` reported
  `console-next accessibility and runtime containment: PASS`.
- **Startup-flake diagnosis (safe):** the one failing combined browser run
  stopped before browser startup with `Console Next stopped before startup
  (exit 0)`. No `FACTORY_CONSOLE*` environment variable was present, no Node
  process remained afterward, and two random per-run `.next-test-*` output
  directories remained because the existing harness begins its cleanup block
  only after `waitForServer`. An immediate standalone workflow run on a new
  loopback port passed. The observed focus-return race is separately guarded
  by waiting for `#open-command-menu-trigger` after the Products dialog closes.
  No credentials, fixture token, request header, or upstream value was
  captured or emitted.
- **Residual concern:** the startup exit-0 condition is intermittent and did
  not reproduce standalone; its underlying Next/process cause remains
  unconfirmed. The repair does not change API, dependency, generated, or
  historical 1.3 assets, and does not change ledger state.

### 2026-07-28 — Task 1 read-only re-review and PM hand-off

- **Review result:** Task 1 is complete. The re-review found no unresolved
  P0/P1: the 1.4 immutable Console identity, byte-equal live copy, compact
  connected rail, desktop/390px lifecycle semantics, existing overlay matrix,
  and focused evidence are sufficient for the serial Task 2 start gate.
- **P2 follow-up 1 — test-harness startup/cleanup hygiene:** An intermittent
  Console Next harness startup can exit `0` before `waitForServer`, leaving
  isolated `.next-test-*` output directories because the existing cleanup path
  is not reached. This is non-blocking for Task 1: standalone fresh runs pass,
  it does not alter Console behavior, and cleanup must be addressed later in a
  narrowly scoped test-harness slice without stopping founder-run processes.
- **P2 follow-up 2 — transient Command-to-Products focus timing:** One initial
  combined browser run observed the existing Command-to-Products
  focus-restoration assertion before its normal trigger wait completed; an
  immediate clean standalone workflow run passed. This is non-blocking because
  Task 1 did not change Command/Products focus code and the established
  `#open-command-menu-trigger` wait/return regression remains green. A future
  focused reliability slice may reproduce and harden the harness only if the
  observation recurs.
- **PM assignment:** `/root/cui06_frontend` no longer has production write
  authority for this slice. `/root/cui06_lineage_frontend` is now the sole
  frontend writer for Task 2; Task 2 must retain its plan/ledger allowed paths
  and may not absorb either P2 follow-up.

### 2026-07-28 — Task 2 writer hand-off (`/root/cui06_lineage_frontend`)

- **Changed paths:**
  `packages/ui-kit/factory-ui-console/1.4.0/{factory-ui.css,factory-ui.manifest.json}`;
  `apps/console-next/components/factory-ui/{factory-ui.css,lineage-model.ts,lineage-node.tsx,lineage-dag.tsx}`;
  `apps/console-next/app/globals.css`;
  `tests/api/test_console_ui_sources.py`; and
  `tests/web/{console-next-e2e.mjs,console-next-accessibility.mjs}`.
- **Focused RED:**
  `py -3.12 -m unittest tests.api.test_console_ui_sources -v` ran 12 tests
  and failed as intended because the old model lacked the required two-column
  asset-band coordinate `184 + (index % 2) * 188` (and still retained the
  four-component truncation path). The paired browser checks reached the
  new Lineage fixture before the missing selection contract existed.
- **GREEN evidence:**
  `py -3.12 -m unittest tests.api.test_factory_ui_kit tests.api.test_console_ui_sources -v`
  — `Ran 35 tests ... OK`.
  `npm --prefix apps/console-next run preflight` —
  `console-next preflight: PASS`.
  `npm --prefix apps/console-next run build` — optimized production build
  compiled, type-checked, and generated all five routes.
  `node tests/web/console-next-e2e.mjs` — `console-next workflow: PASS`.
  `node tests/web/console-next-accessibility.mjs` —
  `console-next accessibility and runtime containment: PASS`.
  `git diff --check` exited 0 (only Git's pre-existing CRLF notice for
  `apps/console-next/tsconfig.json` was emitted).
- **Graph and viewport proof:** the browser fixture refreshes its selected
  plan to six approved components in this exact deterministic order:
  `ui.audit-shell`, `ui.form-shell`, `backend.fastapi-crud`,
  `workflow.approval-gate`, `data.audit-ledger`, `ops.preview-worker`.
  Each appears once below the plan in the fixed two-column band. Selection
  exposes only kind/key/version/trust, persists through Maximize/Restore,
  is keyboard-activated with Enter, and the 390px accessibility regression
  proves status, Close, graph controls, focus restoration, and no document
  overflow. Existing workflow checks retain 560px and 768/900px Lineage
  containment evidence.
- **Identity and scope proof:** the 1.4 canonical/live CSS, React primitive,
  and tokens are byte-identical; the updated canonical CSS inventory digest
  is verified by the immutable identity suite. No dependency, lockfile, API,
  proxy, control-plane, generated-app, or historical 1.3 path changed.
- **Residual risk:** the desktop tool's foreground process wrapper detaches
  browser-harness output before completion. The exact required Node commands
  were therefore run with stdout/stderr captured to isolated temporary logs;
  their recorded PASS markers above are from those fresh command outputs.
  This is harness-output collection only, not a Console runtime change, and
  does not alter the pre-existing P2 cleanup follow-up.
- **Review readiness:** ready for the required read-only Task 2 review; this
  entry does not change ledger state.

### 2026-07-28 — Task 2 P1 harness repair (`/root/cui06_lineage_frontend`)

- **Scope:** test harnesses only: `tests/web/console-next-accessibility.mjs`
  and the matching workflow teardown in `tests/web/console-next-e2e.mjs`.
  No production file remains changed.
- **RED/root cause:** the owned real-Next cleanup regression captured the
  exact pre-run `next-env.d.ts` bytes, then failed because an isolated
  `FACTORY_CONSOLE_DIST_DIR` run rewrote its routes reference (262 bytes to
  308 bytes). The old teardown removed output only while its child still
  reported active, so an early exit could skip cleanup. A duplicate Windows
  kill also produced `EPERM` during the first repair attempt.
- **Repair and GREEN:** both harnesses now snapshot before spawn and use an
  exit/killed-aware bounded stop followed by nested unconditional cleanup:
  remove only the owned output, restore exact `next-env.d.ts` bytes, and
  assert both. `node tests/web/console-next-accessibility.mjs
  --harness-cleanup-only` — `console-next harness cleanup: PASS` for normal
  and early-exit paths. Full accessibility and workflow browser suites each
  reported PASS; the 35 API/source checks and Console preflight passed; and
  `git diff --check` passed with no `next-env.d.ts` diff (only the existing
  CRLF notice for `tsconfig.json`).
- **Review readiness:** ready for P1 re-review; this entry does not change
  ledger state.

### 2026-07-28 — Task 2 P1 harness repair round 2 (`/root/cui06_lineage_frontend`)

- **Root cause and scope:** re-review found `waitForServer` outside the
  workflow `try/finally`, plus separate hydration/detail Next lifecycles.
  Only `tests/web/console-next-e2e.mjs` changed: all three paths now snapshot
  `next-env.d.ts` before spawn and use the same owned-output cleanup helper.
- **RED/GREEN:** the new forced pre-readiness-exit regression initially
  represented the unprotected path; after the outer lifecycle change,
  `node tests/web/console-next-e2e.mjs --pre-readiness-cleanup-only` reported
  `console-next pre-readiness cleanup: PASS`. Full workflow and accessibility
  browser suites both reported PASS. `node --check` for the E2E harness and
  `git diff --check` passed; no `next-env.d.ts` diff remained (only the
  pre-existing `tsconfig.json` CRLF notice).
- **Review readiness:** ready for scoped re-review; this entry does not
  change ledger state.

### 2026-07-28 — Task 2 read-only review and QA hand-off

- **Review result:** Task 2 is complete. The read-only review found no
  unresolved P0/P1 in the deterministic six-component asset band, safe
  selected-node inspector, keyboard selection, maximize/restore persistence,
  responsive floating-canvas behavior, 1.4 identity synchronization, or
  frozen-scope compliance.
- **P2 follow-up — deterministic reopen coverage debt:** The current browser
  regression proves a single deterministic fixture layout and selection path,
  but does not yet compare two separate close/reopen Lineage sessions for
  byte-for-byte-equivalent node positions after a full hydration cycle. This
  is non-blocking because the model uses fixed coordinates and current open/
  restore behavior is covered; a future narrow test-only reliability slice may
  add repeated-open position assertions without changing graph behavior.
- **PM transition:** `/root/cui06_lineage_frontend` no longer has production
  write authority. CUI-06 is `ready_for_qa`; QA may begin the existing gate
  and may modify only `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs` if fresh evidence demonstrates a
  focused coverage gap.

### 2026-07-28 — QA evidence

- **Result:** PASS. QA found no P0, P1, or P2 finding in CUI-06.
- **Permitted QA-only change:** QA modified only
  `tests/web/console-next-e2e.mjs`. The added regression opens Product
  Lineage for the six-component fixture, records each ordered component node's
  rendered coordinate, closes the modal, reopens it after the normal full
  hydration cycle, and asserts the same key/x/y sequence. It changes no
  production source, canonical asset, API, dependency, or contract path.
- **Coverage result:** the new regression closes the prior deterministic-
  reopen coverage debt. It passes together with the established immutable
  identity/source checks, Console preflight/build, workflow, accessibility,
  responsive overlay/focus, and `git diff --check` gates. The product still
  proves all components exactly once, safe selection inspection, selection
  persistence through maximize/restore, 390px containment, and the existing
  lifecycle/overlay matrix.
- **State:** The ledger remains `ready_for_qa` until an independent read-only
  release reviewer returns a result. QA did not alter the frozen scope or
  assign a production writer.

### 2026-07-28 — PM blocked-state decision

- **Trigger:** Per `AGENTS.md`, the same CUI-06 P1 browser-harness
  cleanup-boundary issue has reached three failed repair/review cycles.
- **Exact blocker:** In the accessibility cleanup-only multi-case path, a
  snapshot race can restore a test-owned randomized Next dist reference after
  PASS. This is a test-harness cleanup-lifecycle defect, not a product UI,
  API, dependency, canonical-asset, generated-application, or contract
  defect.
- **Current safety state:** The tracked `next-env.d.ts` is restored and clean;
  no production path, immutable Console 1.4 asset, generated asset, API,
  lockfile, or frozen scope was changed while diagnosing the issue.
- **Decision:** PM advances CUI-06 `ready_for_qa → blocked`. A founder decision
  is required before any fourth repair attempt, specifically to authorize a
  narrowly scoped, test-only cleanup-lifecycle refactor. Until that decision,
  no writer is authorized to alter the harness or production paths for this
  ledger.

### 2026-07-28 — Founder-delegated exceptional fourth repair authorization

- **Decision:** Founder-delegated Controller authorizes one exceptional fourth
  repair for the existing CUI-06 browser-test cleanup lifecycle only. PM
  advances the ledger `blocked → implementing` and assigns
  `/root/cui06_lineage_frontend` as the sole writer for this exception.
- **Strict boundary:** The repair may modify only the existing CUI-06 browser
  test-harness lifecycle paths needed to prevent restoration of a randomized
  test-owned dist reference after PASS. It may not modify product UI, Console
  production source, API/proxy, dependency or lockfile, canonical package,
  generated application, contract, or runtime topology.
- **Required hand-off:** Fresh evidence must prove the tracked `next-env.d.ts`
  remains restored/clean after every successful multi-case accessibility run,
  the harness removes only its owned randomized outputs, and all existing
  CUI-06 tests remain green. A new read-only review is required before any
  subsequent QA/release transition.

### 2026-07-28 — Founder-delegated fifth and final test-only repair

- **Release P1:** Both existing browser harnesses use a one-second race in
  cleanup rather than joining the spawned child process's actual exit. A late
  child can therefore restore a test-owned randomized dist reference after
  an apparent PASS.
- **Decision:** Founder-delegated Controller authorizes a fifth and final
  CUI-06 repair. The ledger remains `implementing`; `/root/cui06_lineage_frontend`
  remains the sole writer.
- **Authorized implementation:** Replace the one-second cleanup race with an
  actual child-exit join and fail-closed behavior in the existing browser test
  harnesses. If the child does not exit, the harness must fail instead of
  reporting PASS or allowing cleanup to race its exit.
- **Strict boundary:** This authorization is test-only. It does not permit any
  product/UI, Console production source, API/proxy, dependency/lockfile,
  package/canonical asset, generated application, contract, or runtime
  topology change.
- **Finality:** No sixth repair is authorized by this decision. The writer
  must provide fresh repeated multi-case cleanup evidence and a new read-only
  review before any further QA or release decision.

### 2026-07-28 — Fifth/final repair blocked: Windows child-exit boundary

- **Result:** No green claim. The fifth/final test-only repair is blocked.
- **Exact reason:** The forced Windows Next pre-readiness child never emits an
  exit event within five seconds. The fail-closed harness therefore correctly
  refuses cleanup and refuses to restore `next-env.d.ts` while that child may
  still write a randomized test-owned dist reference.
- **Safe inspection:** PM inspected the tracked
  `apps/console-next/next-env.d.ts`; it is currently restored/clean, so no
  restoration was attempted. Active local Next processes remain present,
  including a process serving port 5178, so process termination for the forced
  child cannot be verified from this ledger without new authority. No process
  was terminated and no file was overwritten.
- **Decision:** PM advances CUI-06 `implementing → blocked`. The release P1
  remains unresolved. No test or production writer is authorized.
- **Required founder decision:** Authorize a sixth strategy change choosing
  exactly one of: (1) Windows process-tree termination using `taskkill /T`
  followed by verified child exit before cleanup/restoration; or (2) an
  isolated copied Console runner that eliminates mutation of tracked
  `next-env.d.ts`. Either path is a new narrowly scoped test-harness decision;
  no production/API/dependency/package change is authorized by this record.

### 2026-07-28 — Founder-delegated sixth/final strategy authorization

- **Decision:** Founder-delegated Controller authorizes a sixth and final,
  test-only CUI-06 strategy change. PM advances the ledger
  `blocked → implementing` and assigns `/root/cui06_harness_engineer`, a fresh
  specialized test-harness writer, as the sole writer for this strategy.
- **Authorized paths only:** `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs`. No other CUI-06 allowed path is
  authorized for this sixth strategy.
- **Exact termination protocol:** The harness records the PID returned from
  its own `spawn` call. On failed readiness or cleanup it may run exactly
  `taskkill /PID <owned-child-pid> /T /F`; it then polls process existence for
  that exact owned PID and fails closed if the PID remains. Only after absence
  is verified may it clean its own randomized output or restore a tracked
  reference. It must not infer a PID by executable name, port, parent process,
  or directory, and must not terminate any existing user service.
- **Required gates:** The writer supplies repeated multi-case cleanup proof,
  verifies `next-env.d.ts` is clean after every successful and failed harness
  path, and hands off to a new read-only task review. QA and independent
  release review must rerun before any state advance or acceptance decision.
- **Finality:** No seventh repair or alternate strategy is authorized by this
  decision.

### 2026-07-28 — Founder-delegated seventh/final process-lifecycle authorization

- **Decision:** Based on fresh precise review evidence, Founder-delegated
  Controller authorizes a seventh and final exceptional test-only repair. The
  ledger remains `implementing` and assigns the fresh
  `/root/cui06_process_lifecycle_engineer` as sole writer.
- **Authorized paths only:** `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs`. No product/UI, API/proxy,
  dependency/lockfile, package/canonical asset, generated application,
  contract, or runtime-topology path may change.
- **Early-exit regression rule:** The forced early-exit regression must throw
  and abort the actual runner while leaving its owned root process alive for
  cleanup. It must **not** pre-call `server.kill`, and cleanup must never
  early-return merely because `server.exitCode` is non-null.
- **Exact Windows termination rule:** While the owned root PID is still
  positively verified present, cleanup may invoke exactly
  `taskkill /PID <owned-root-pid> /T /F`. It must poll that same PID until
  absence is confirmed. Only confirmed absence enables removal of the owned
  randomized output and restoration of a tracked reference. If the root has
  already exited before tree termination can be issued, the harness fails
  closed and must not restore or clean as though termination were verified.
- **Safety rule:** The harness may not infer a target from a process name,
  port, parent, directory, or a process discovered outside its own `spawn`
  result. Existing user services are never termination candidates.
- **Required gates:** The writer provides fresh success and forced-early-exit
  multi-case evidence, confirms `next-env.d.ts` is clean after each permitted
  completed path, and hands off to new task review, QA, and independent
  release review. No eighth repair is authorized by this decision.

### 2026-07-28 — Founder-delegated eighth fail-closed taskkill correction

- **Review P1:** PID absence alone is insufficient when `taskkill` reports a
  nonzero exit; a no-spawn-error path could otherwise restore a tracked
  reference even though process-tree termination was not successful.
- **Decision:** Founder-delegated Controller authorizes this eighth narrowly
  scoped, test-only correction. The ledger remains `implementing` and assigns
  fresh `/root/cui06_taskkill_verifier` as the sole writer.
- **Authorized paths only:** `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs`. No product/UI, API/proxy,
  dependency/lockfile, package/canonical asset, generated application,
  contract, or runtime-topology path may change.
- **Required fail-closed rule:** After targeting only the exact owned root PID,
  the harness must require `taskkill /PID <owned-root-pid> /T /F` to exit with
  success *and* must verify that exact PID is absent. PID `ESRCH`/absence after
  a nonzero taskkill result is not success and must not enable cleanup or
  `next-env.d.ts` restoration.
- **Required controlled regression:** Add a test-controlled nonzero-taskkill
  outcome that proves the runner fails closed, retains its randomized
  test-owned reference/output for safe manual inspection, and never reports a
  successful cleanup. The regression must not target a real external process.
- **Finality:** Fresh task review, QA, and release review remain required. No
  ninth repair is authorized by this decision.

### 2026-07-28 — Final taskkill strategy blocked in real Windows full E2E

- **Result:** No green claim. The final authorized taskkill strategy failed in
  the real Windows full E2E path: `taskkill` returned status `255` for a
  transient Next jest-worker child.
- **Fail-closed behavior:** The new guard behaved correctly. It did not treat
  PID absence or a spawned command as success, and it prevented cleanup or
  restoration while termination could not be verified.
- **Tracked-file inspection:** PM confirmed
  `apps/console-next/next-env.d.ts` is currently clean. No production file was
  modified, restored, or overwritten as part of this failed path.
- **Decision:** PM advances CUI-06 `implementing → blocked`. No writer is
  authorized and the release P1 remains unresolved.
- **Required strategic founder decision:** Choose exactly one path: (1)
  authorize a new isolated Console-copy test-runner topology, so Next can
  mutate only a temporary copied Console rather than a tracked workspace; or
  (2) accept and document the environment-specific inability to run this
  cleanup gate. Neither option authorizes a product, API, dependency, package,
  or generated-application change merely by being recorded here.

### 2026-07-28 — Founder-delegated isolated copied-Console runner extension

- **Decision:** Founder-delegated Controller chooses the isolated copied-
  Console runner strategy and authorizes this narrowly scoped test-only plan
  extension. PM advances CUI-06 `blocked → implementing` and assigns fresh
  `/root/cui06_isolated_console_runner_engineer` as the sole writer.
- **Task card:**
  `docs/superpowers/plans/2026-07-28-cui-06-isolated-console-copy-runner.md`.
- **Authorized paths only:** `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs`.
- **Required topology boundary:** Each browser harness creates one unique
  validated OS-temporary copy of `apps/console-next`, excludes all `.next*`
  build output, links only its copied `node_modules` to the existing locked
  dependency tree, runs Next with copied `cwd`, and removes only its validated
  temporary parent after its own root process has satisfied the existing
  fail-closed lifecycle rule.
- **Workspace invariant:** The workspace
  `apps/console-next/next-env.d.ts` is read-only evidence for this extension.
  No harness may write or restore it; fresh byte-equality assertions prove it
  remains unchanged on success and controlled failure paths.
- **Required gates:** A new task review, QA rerun, and independent release
  review must all pass before any state advance. No dependency, product,
  production-runtime, API, package, lockfile, contract, or generated-
  application change is authorized.

### 2026-07-28 — Founder-delegated isolated-runner cleanup refinement

- **Decision:** Founder-delegated Controller authorizes the bounded,
  test-only cleanup-policy refinement. The ledger remains `implementing` and
  `/root/cui06_isolated_console_runner_engineer` remains the sole writer.
- **Safe degraded-tree success:** A nonzero `taskkill` result may be treated
  as successful only if all four facts are proven in order: (1) the runner is
  the harness's validated OS-temp Console copy; (2) the exact owned root PID
  is `ESRCH`; (3) deletion of that exact validated temporary copy succeeds;
  and (4) the harness records a `degraded-tree-termination` lifecycle status.
  The workspace `apps/console-next/next-env.d.ts` is never restored or written.
- **Fail-closed remainder:** If any validation fails, the root is still
  present, PID inspection cannot establish `ESRCH`, or the exact copy cannot
  be deleted, the harness must fail closed and retain the copy for inspection.
- **Required regression:** The two harnesses must prove the controlled
  nonzero-taskkill + owned-root-ESRCH + successful temporary-copy deletion
  path records the degraded status and leaves the workspace file unchanged;
  they must also preserve failure for every other combination.
- **One-time retained-copy cleanup:** The Controller also authorizes removal
  only of `C:\\Users\\15492\\AppData\\Local\\Temp\\factory-pilot-console-ub6pPn`
  after re-validation that it is a direct OS-temp child with the expected
  prefix, contains no escaping link other than a junction exactly to the locked
  workspace `node_modules`, and has no matching owned root process. No other
  temporary directory or user service is in scope.

### 2026-07-28 — Isolated copied-Console runner writer handoff

- **Implementation paths:** `tests/web/console-next-e2e.mjs` and
  `tests/web/console-next-accessibility.mjs` only. This entry records writer
  evidence and does not change ledger state.
- **RED/GREEN:** Both full browser commands first failed because the Next cwd
  resolved to the workspace Console. After isolation, the focused normal,
  early-exit, and nonzero-taskkill regressions passed; the full workflow and
  accessibility commands passed; Console source tests passed 12/12; preflight
  passed; and `git diff --check` exited 0.
- **Isolation evidence:** Every runner uses a validated direct OS-temp child,
  excludes `node_modules` and all `.next*` output, and creates one local
  Windows junction resolving exactly to the locked workspace `node_modules`.
  Cleanup unlinks that junction and removes only its revalidated temporary
  parent after exact owned-root absence.
- **Workspace evidence:** `apps/console-next/next-env.d.ts` remained byte-
  identical before, while live, and after normal/early-exit/controlled-failure
  paths; SHA-256 was
  `85AE5AEE75F011967CF2D25CBC342F62D69314E9D925F7F4AA3456FC2CFFCCA6`,
  with no Git diff. The completed GREEN handoff left zero owned temp parents
  and no new workspace `.next-test-*` output.
- **P2 review polish and residual:** Workflow, hydration, and detail PASS
  markers now execute only after their enclosing cleanup returns. A fresh
  workflow rerun hit the known Windows transient-child `taskkill` status 255;
  it emitted no workflow PASS marker and correctly retained only
  `factory-pilot-console-ub6pPn` for inspection. The workspace hash/diff stayed
  unchanged. This fail-closed retained-copy behavior remains the residual risk;
  task review, QA, and release review remain required.
