# Isolated Verifier finalization — release hand-off

**Scope:** P0 Isolated Verifier Finalization Goal, Task 6 (queued verification
failure boundary) plus independent acceptance of the isolated
generated-application verifier on branch `feat/isolated-verifier`.

**Reviewed commit:** `924bd5b` (`test: harden harness failure reporting and
diagnostics`), remote-reachable at
`https://github.com/ZP151/assembler/tree/feat/isolated-verifier` (full short
history: `4c70d2c` -> `41fae0f` -> `ee97b97` -> `765dd39` -> `924bd5b`; no
force-push or amend).

Each acceptance criterion below maps to one concrete commit, command, result,
and evidence path. The authoritative runtime evidence is
`docs/acceptance/isolated-verifier-expense.md`; the governed task state is the
2026-08-07 ledger; the plan is
`docs/superpowers/plans/2026-08-07-isolated-verifier-finalization.md`.

## Criterion map

| # | Criterion | Commit(s) | Command | Result | Evidence |
| - | --------- | --------- | ------- | ------ | -------- |
| 1 | Queued verification run always reaches a terminal status (failure boundary) | `4c70d2c` | `pnpm --filter @factory/compiler-worker test` | 163/163, incl. the failed-job termination regressions; worker `on("failed")`/`on("stalled")` observe queue-layer failures with bounded 180-char sanitized diagnostics | `apps/compiler-worker/test/verification-lifecycle.test.ts`; `apps/compiler-worker/src/main.ts`; ledger Task 1–2 entries |
| 2 | Deterministic suite gates | `4c70d2c`..`924bd5b` | `pnpm test` (per-package) | Worker 163/163, Graph 103/103, Control Plane 150/150, Compiler 330/330; typecheck/lint/build clean | ledger Task 1–3 entries; `packages/compiler/vitest.config.ts` and `apps/compiler-worker/vitest.config.ts` (30 s test timeout for bundle-materialization suites) |
| 3 | Real Docker acceptance: compile | `41fae0f`, `ee97b97`, `924bd5b` | `pnpm verify:isolated-verifier-expense` | Final run at `924bd5b`: compilation `cmsj1uvkz0001w4eo7o1gfkad`; artifact digest `sha256:4c54683f…6688ece` (byte-identical across all green runs); profile `expense-approval` | `docs/acceptance/isolated-verifier-expense.md` |
| 4 | Isolated boot, migration, health, API | `41fae0f`, `ee97b97`, `924bd5b` | same | Steps `migration`, `health` passed; journey probes create `201` | same |
| 5 | Role journeys and authorization denial | `41fae0f`, `ee97b97`, `924bd5b` | same | Steps `employee-creates-expense`, `employee-submits-expense`, `manager-approves-expense`, `employee-denied-approval` passed; denial `403` | same |
| 6 | Idempotency | `41fae0f`, `ee97b97`, `924bd5b` | same | Idempotency replay `403`; re-creating the run with the same identity returned the same terminal run and the same evidence digest without re-enqueueing | same; `scripts/verify-isolated-verifier-expense.mjs` step 5 |
| 7 | Cleanup | `41fae0f`, `ee97b97`, `924bd5b` | same | Step `cleanup` passed; no `factory-preview-*` containers or volumes remain (asserted after teardown; preflight asserts a clean host state) | same; harness teardown in `finally` |
| 8 | Generated journey tests | `41fae0f` (generation fix), `ee97b97` (harness), `924bd5b` (final run) | same | `generatedTests: "passed"` — the materialized bundle's own `api/test/journey.generated.test.ts` ran inside the generated api image against the generated database; the generated test follows the runtime-returned record through the declared flow | `packages/compiler/src/index.ts` `renderJourneyTest`; `packages/compiler/test/profile-compilation.test.ts` regression |
| 9 | Safe evidence | `4c70d2c`..`924bd5b` | same | One allowlisted evidence bundle; no diagnosis persisted for a passing run; only synthetic per-run credentials; local-only `factory:factory` infra URL; 8 KB-bounded failure dumps; bounded 180-char sanitized failure diagnostics (`src/diagnostics.ts`) | `docs/acceptance/isolated-verifier-expense.md` "Security and retention"; `apps/compiler-worker/test/diagnostics.test.ts` |
| 10 | Exclusion property of the environment allowlist | `ee97b97` | `pnpm --filter @factory/compiler-worker test` | Regression asserts every environment key passed to the preview command is allowlisted | `apps/compiler-worker/test/preview-runner.test.ts` |
| 11 | Migration environment contract | `ee97b97` | same | Migrate command environment equals `dockerHostLookupEnvironment()` | `apps/compiler-worker/test/verification-lifecycle.test.ts` |
| 12 | Independent gates | `924bd5b` | four independent review contexts | Task review (TASK_REVIEW_PASS, zero open items), behavioral QA (QA_PASS), release review (RELEASE_PASS), and PM acceptance all re-verified at the final remote-reachable commit `924bd5b`; prior reopen findings verified resolved (QA P1 exclusion-property; release P1s ledger staleness and worker-suite gate reproducibility, fixed at `765dd39`; task P2s fixed at `924bd5b`; PM P2s) | ledger "Gate records" |

## Terminal status proof

The acceptance harness polls with a bounded deadline (180 minutes covers the
worst bounded case of ~160 minutes) and fails on any non-terminal poll window;
the worker's `failed`/`stalled`/`error` listeners log bounded, newline-free
diagnostics so a queue-layer failure can never strand a run silently. The
pending-run failure boundary (`4c70d2c`) closes the previously recorded risk.

## Release posture

- The verifier never patches generated source, Published Graphs, or
  Compilations; diagnosis remains a Draft Diff proposal only.
- No credentials, raw prompts, or probe bodies are retained in evidence; the
  evidence digest and allowlisted prose are the only persisted outcomes.
- The worktree is clean at the final commit; history is linear with no
  force-push or amend; every green iteration was committed and pushed
  (`4c70d2c` -> `41fae0f` -> `ee97b97` -> `765dd39` -> `924bd5b` -> governance
  docs).
- Out of scope for this Goal (unchanged): production identity, provider-backed
  authorization, staged AI composition, managed deployment.
