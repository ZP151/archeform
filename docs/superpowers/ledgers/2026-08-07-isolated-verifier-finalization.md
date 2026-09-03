# P0 Isolated Verifier Finalization Ledger

**Goal:** Finish the interrupted Task 6 implementation and independently accept
the isolated generated-application verifier.

**Design:** `docs/superpowers/specs/2026-08-07-isolated-verifier-finalization-goal-design.md`

**Plan:** `docs/superpowers/plans/2026-08-07-isolated-verifier-finalization.md`

**Status:** complete — the real Docker acceptance exited 0 at the final
commit `924bd5b`; task review, behavioral QA, release review, and PM
acceptance all re-verified at `924bd5b` (P0/P1-free; task P2s all closed);
the governance commit below records the acceptance values and final gate
verdicts; `GOAL_COMPLETE` is written at the end of this record.

## Current state at Goal dispatch

- Branch: `feat/isolated-verifier`.
- Prior accepted tasks: Isolated Verifier Tasks 1–5, as recorded in the
  2026-08-06 ledger.
- Uncommitted Task 6 implementation is present in Worker, Control Plane,
  acceptance script, fixtures, and tests.
- Fresh deterministic checks: Worker 153/153, Control Plane 149/149, Graph
  102/102; Worker and Control Plane typechecks pass.
- Docker Desktop server was unavailable during dispatch, so no real runtime
  acceptance was claimed at dispatch.

## Task state

| Task | Deliverable                                  | State     | Commit                        | Evidence                                     |
| ---- | -------------------------------------------- | --------- | ----------------------------- | -------------------------------------------- |
| 1    | Reconcile and review interrupted Task 6 tree | completed | (dispatch, no code change)    | dispatch state recorded above; Task 6 review |
| 2    | Close the pending-run failure boundary       | completed | `4c70d2c`                     | Worker 158/158 incl. termination regressions |
| 3    | Real Docker Expense acceptance and cleanup   | completed | `41fae0f`, `ee97b97`          | run exit 0 twice; evidence digest; cleanup   |
| 4    | Independent release hand-off                 | completed | `924bd5b` + governance commit | four gates; release hand-off doc             |

## Commits (linear history, no force-push or amend)

| Commit       | Message                                                     | Content                                                                                                                                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `4c70d2c`    | `fix: terminate failed verification jobs safely`            | failure boundary: job adapter reports one terminal evidence bundle; worker `failed`/`stalled`/`error` listeners with bounded 180-char sanitized diagnostics                                                                                                                                |
| `41fae0f`    | `test: accept isolated verifier against Docker`             | Task 6 implementation + Docker acceptance harness, first fully green run                                                                                                                                                                                                                   |
| `ee97b97`    | `test: harden the isolated verifier acceptance harness`     | review fixes: preflight stale check, volume assertion, finally-teardown with leftover asserts, 180-min poll window, sanitized job ids, exclusion-property and migration-env unit regressions, generated journey test following the runtime-returned record, compiler vitest timeout config |
| `765dd39`    | `test: add worker suite timeout for bundle materialization` | `apps/compiler-worker/vitest.config.ts` `testTimeout: 30000` — closes the release-review P1 that the recorded Worker 158/158 gate did not reproduce (fresh run 154/158, four 5 s timeouts in order-operations-lifecycle); fresh run with the config 158/158                                |
| `924bd5b`    | `test: harden harness failure reporting and diagnostics`    | `boundedFailureMessage` extracted to `src/diagnostics.ts` with 5-case unit regression; harness progress line anchored to poll start (15-min cadence) and generated-tests boot failure no longer skips the leftover assertion; final gates and Docker acceptance re-verified at this commit |
| (governance) | `docs: accept isolated verifier finalization`               | this ledger (final gate records, acceptance values at `924bd5b`, `GOAL_COMPLETE`), evidence doc final values, release hand-off doc, project-status, roadmap, 2026-08-06 cross-link                                                                                                         |

## Acceptance evidence (real Docker Desktop, `pnpm verify:isolated-verifier-expense`)

First green run at `41fae0f` (evidence digest
`sha256:062a8cdb76e752688fe0052f801466baf68e46c79a4a08a6e9ad2578b5a19520`).
Hardened harness re-ran green at `ee97b97` (digest
`sha256:5cd411e6baeb451559dae79d2b5e4e782c8dc1544597a96cd3bbb84153cfdefe`).
The final acceptance re-run at the reviewed commit `924bd5b` (exit 0)
returned the values below — the acceptance evidence for the finalization
(compilation `cmsj1uvkz0001w4eo7o1gfkad`; artifact digest byte-identical to
the earlier green runs, confirming deterministic compilation):

- Terminal status: `succeeded`; no diagnosis persisted for a passing run.
- Evidence digest: `sha256:433b08523a0924033dd4c949ad2b2034e445c23ae1ae7c5c6703fb262819343f`.
- Compilation identity: `cmsj1uvkz0001w4eo7o1gfkad`; artifact digest
  `sha256:4c54683f8a3c12e0861528a17d83e484b11ef7e049be30c0e2a38d6fd6688ece`;
  profile `expense-approval`.
- Seven step IDs, all `passed`, in plan order: `migration`, `health`,
  `employee-creates-expense`, `employee-submits-expense`,
  `manager-approves-expense`, `employee-denied-approval`, `cleanup`.
- Journey HTTP statuses: create `201`, idempotency replay `403`, approve
  `201`, authorization denial `403`.
- Idempotent retry: re-creating the run with the same identity returned the
  same terminal run and the same evidence digest without re-enqueueing.
- Preview cleanup succeeded; no `factory-preview-*` containers or volumes
  remain (asserted after teardown; preflight asserts a clean host state).
- Generated journey tests: `passed` — the bundle's own
  `api/test/journey.generated.test.ts` suite ran inside the generated api
  image against the generated database (audit length 5, capability event
  pairs, and every declared transition assertion).
- Infra: postgres + redis in Docker; control plane + worker on the host.

## Failure and repair record

| Iteration           | Failure                                                                                                                                                                                                                                          | Fix                                                                                                                                                                                        | Owner       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| run 6               | `sh: can't create /app/test/journey.generated.test.ts: nonexistent directory` (generated api image has no test dir)                                                                                                                              | `mkdir -p /app/test &&` in harness injection                                                                                                                                               | harness     |
| run 7               | journey test asserted on the create()-returned record while `transition()` returns the updated record without in-place mutation (`expected 'draft' to be 'submitted'`)                                                                           | `renderJourneyTest`: `let record` + reassignment from the returned record; RED regression first                                                                                            | compiler    |
| full suite          | 6–9 compiler suite timeouts at the 5 s vitest default under bundle-materialization parallelism                                                                                                                                                   | `packages/compiler/vitest.config.ts` `testTimeout: 30000`                                                                                                                                  | compiler    |
| QA P1               | exclusion property of the env allowlist had zero test coverage after the objectContaining relaxation                                                                                                                                             | `allowlistedKeys.every(...)` regression in preview-runner.test.ts                                                                                                                          | worker test |
| release P1          | recorded Worker 158/158 gate did not reproduce: 154/158 with four 5 s vitest-default timeouts in order-operations-lifecycle (one test times out even in isolation); worker package had no vitest timeout config                                  | `apps/compiler-worker/vitest.config.ts` `testTimeout: 30000` (`765dd39`); fresh run 158/158                                                                                                | worker test |
| release/PM metadata | stale governance record; no release hand-off doc                                                                                                                                                                                                 | this governance commit                                                                                                                                                                     | docs        |
| task review P2s     | harness progress line anchored to `deadline - 60 min` left a stuck run silent for ~2 h of the 180-min window; generated-tests boot failure propagated past the leftover-container assertion; `boundedFailureMessage` had no direct unit coverage | progress anchored to poll start with 15-min cadence; `generatedBootError` capture with always-run teardown and rethrow; extraction to `src/diagnostics.ts` + 5-case regression (`924bd5b`) | harness     |
| final acceptance    | re-run at `924bd5b` per plan Task 4 (acceptance at the final commit)                                                                                                                                                                             | exit 0; digest `sha256:433b0852…343f`; compilation `cmsj1uvkz0001w4eo7o1gfkad`; artifact digest byte-identical to runs at `41fae0f`/`ee97b97`                                              | acceptance  |

## Deterministic checks (final)

Worker 163/163 across 16 files (reproducible at `924bd5b`), Graph 103/103,
Control Plane 150/150, Compiler 330/330; typecheck, lint, build, and
`git diff --check` clean. Recorded test adjustments: honest tampered-digest
semantics, the declared-clock determinism injection, the generated journey
test following the runtime-returned record through the declared flow, the
Compiler and Worker suites' vitest timeout configurations
(bundle-materialization headroom), and the 5-case `boundedFailureMessage`
unit regression.

## Gate records

First round (at `41fae0f`): task review ACCEPT; behavioral QA REOPEN on the
exclusion-property P1; release review REOPEN on process/metadata P1s; PM
ACCEPT-WITH-NOTES on five P2s. Findings were addressed by `ee97b97`
(code/tests), `765dd39` (worker-suite gate reproducibility), and `924bd5b`
(harness failure reporting, diagnostics, and unit coverage). All four gates
re-verified at the final remote-reachable commit `924bd5b`:

- Task review: first round ACCEPT at `41fae0f`; re-verification at `ee97b97`
  returned four P2s (harness progress-line anchoring, generated-tests
  boot-failure propagation, `boundedFailureMessage` direct unit coverage,
  ledger line-count accuracy) — all closed at `924bd5b`. Final
  TASK_REVIEW_PASS at `924bd5b` (SPEC PASS, QUALITY PASS): worker suite
  163/163, typecheck clean, harness and unit regressions verified, zero open
  items.
- Behavioral QA: REOPEN at `41fae0f` on the env-allowlist exclusion-property
  P1 (zero coverage after the objectContaining relaxation); closed at
  `ee97b97` by the `allowlistedKeys.every(...)` regression in
  `apps/compiler-worker/test/preview-runner.test.ts` and the
  `dockerHostLookupEnvironment()` equality assertion for the migrate command.
  Final QA_PASS re-confirmed at `924bd5b`: Worker 163/163 (16 files), exit 0
  in 20.09 s, diff review showed only failure-reporting paths changed, no new
  P0/P1 findings. One informational P2 recorded (release doc container-check
  wording scoped to the `factory-preview` namespace, as the harness itself
  scopes it; unrelated old Exited containers from earlier goals' stacks
  predate this Goal). Both QA and task review independently observed a vitest
  tinypool worker-spawn crash while the Docker acceptance ran concurrently —
  environmental on this host (538 processes at the time), clean on immediate
  re-run, not a product defect; the worker suite should not run concurrently
  with the acceptance harness.
- Release review: REOPEN at `41fae0f` on process/metadata P1s (stale
  governance record, no release hand-off doc). At `ee97b97` reopened with two
  P1s: (1) ledger staleness — resolved by this governance commit (task table
  completed, acceptance record, gate records, release hand-off doc); (2) the
  recorded Worker 158/158 gate did not reproduce (fresh run 154/158 with four
  5 s timeouts) — resolved by `765dd39` (worker vitest timeout config),
  fresh run 158/158. Two P2s closed (release-doc evidence path prefix
  corrected; gate-record claims finalized). Final RELEASE_PASS at `924bd5b`:
  fresh worker suite 163/163, `boundedFailureMessage` extraction diff
  byte-identical to the pre-extraction implementation, no new findings; the
  reviewer's explicit governance-pass checklist (record RELEASE_PASS at
  `924bd5b`, roll citations forward, record the acceptance re-run in the
  expense doc) is executed by this record.
- PM acceptance: fresh independent context; five prior P2s verified addressed
  (stale claims replaced in the expense/project-status/roadmap docs, the
  release doc maps every criterion to commit/command/result/evidence, the
  ledger task table shows Tasks 1–4 completed). First re-close returned
  PM_REOPEN (procedural): the governance commit must cite the final
  remote-reachable commit `924bd5b`, record the acceptance re-run values,
  and close with a clean worktree. Final verdict returned by the resumed PM
  context on 2026-08-07: **PM_ACCEPT** — read-only verification confirmed
  linear history (`4c70d2c` -> `41fae0f` -> `ee97b97` -> `765dd39` ->
  `924bd5b` -> `219d254`), empty worktree, local = remote =
  `219d254fd6673e36ae1894392282ed54df972b45`, `924bd5b` = 4 files (+55/−20)
  and `219d254` = the six governance docs (+295/−38), deterministic counts
  (Worker 163, Graph 103, Control Plane 150, Compiler 330), acceptance
  evidence consistent across ledger, expense doc, and release doc, and the
  release-doc path-prefix P2 fixed; zero open items at P0/P1/P2.

## Completion marker

`GOAL_COMPLETE` is written only after the real Docker acceptance exits 0, the
failure boundary is tested, all independent gates cite the same
remote-reachable commit (`924bd5b`), and the worktree is clean.

**GOAL_COMPLETE — 2026-08-07.** The final Docker acceptance at `924bd5b`
exited 0 (digest `sha256:433b08523a0924033dd4c949ad2b2034e445c23ae1ae7c5c6703fb262819343f`,
compilation `cmsj1uvkz0001w4eo7o1gfkad`, artifact digest byte-identical
across all green runs); the pending-run failure boundary is closed
(`4c70d2c`); task review, behavioral QA, release review, and PM acceptance
all cite `924bd5b`; the governance commit leaves a clean worktree with every
green iteration pushed. The next Goal after completion is staged AI
composition plus capability-family expansion.
