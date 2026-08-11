# Archeform Codex Long-Run Workstream

Status: ready to start in a new Codex Goal after the founder pastes the launch
prompt from this document.

Plan authority:
`docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`.
State authority:
`docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.
Delivery authority: `docs/delivery-policy.md`.

## Objective

Continue the current dirty Task 0 handoff, seal and push Product Closure, then
execute the Archeform Prompt-to-Polished Restaurant Product plan continuously
through the furthest honestly accepted task. Keep the controller session small
by delegating bounded work, recording hand-offs in files, and trusting ledger,
Git, and fresh test evidence after compaction.

## Controller responsibilities

The controller owns sequencing, model selection, shared-contract decisions,
task briefs, review packages, ledger reconciliation, integration verification,
commits, pushes, and final status. It does not perform mechanical edits that a
bounded Spark worker can safely own.

At startup the controller must:

1. read `AGENTS.md`, `.codex/README.md`, `docs/project-status.md`, the plan,
   ledger, and the 2026-08-09 closure ledger;
2. inspect Git and running processes without discarding, resetting, stashing,
   or recreating the current dirty Task 0 work;
3. reconcile the paused handoff with actual files and tests;
4. resume Task 0 at the stable composition-rejection-code defect;
5. update the ledger after every reviewed slice and before any compaction-prone
   long run.

## Model routing

| Work                                                                                   | Role/model                                  | Boundary                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| Coordination, Graph/lifecycle, hard debugging, cross-package integration               | controller or `engineer` / GPT-5.6-Sol      | Owns load-bearing decisions                         |
| Quick code mapping and test discovery                                                  | `explorer` / GPT-5.3-Codex-Spark            | Read-only                                           |
| CSS/components, one hook/client extraction, fixtures, focused tests, registry metadata | `spark_worker` / GPT-5.3-Codex-Spark        | Frozen contract, normally 1–3 files, disjoint paths |
| Small diff or fix-round review                                                         | `spark_reviewer` / GPT-5.3-Codex-Spark      | Supplemental, read-only                             |
| Task specification/quality gate and release review                                     | `task_reviewer` or `reviewer` / GPT-5.6-Sol | Required for acceptance                             |
| QA and adversarial runtime verification                                                | `qa` / GPT-5.6-Terra                        | Starts only at ledger QA gate                       |

Spark work is promoted to Sol immediately when it encounters a contract
question, security/lifecycle behavior, a cross-package signature, Prisma/Compose
topology, a third failed repair, or uncertainty that affects downstream tasks.
Spark agents never call the real model provider, update the PM ledger, accept
their own work, or commit/push independently.

## Execution waves

### Wave 0 — close the inherited Task 0

Use one integration writer. Spark may map the HTTP 400 path, add a narrow
fixture/regression, or review a small fix, but it may not create a second writer
on the same composition paths. Complete both guarded real-model journeys,
material-difference/accessibility/theme/action checks, clean checkout, cleanup,
task and release reviews, ledger reconciliation, commit, and push.

### Wave 1 — freeze Graph v2

Use Sol for Task 1. Spark may perform read-only call-site mapping and mechanical
fixture preparation. No downstream writer starts until Task 1 is reviewed and
the ledger records the contract frozen.

### Wave 2 — approved parallel product foundations

Start exactly two disjoint writers:

- Task 2: Restaurant/Commerce semantics under `packages/capabilities/**`;
- Task 3: UI Registry and source foundation under the UI/recipe packages named
  in the ledger.

Use the third slot for read-only Spark exploration or scoped review. A missing
shared key or binding stops both writers and returns to Task 1; neither line
modifies the other's files.

### Wave 3 — approved parallel surfaces

After Tasks 2 and 3 are ready for QA, run Task 4 customer and Task 5 merchant
surface writers in parallel on the disjoint compiler/template paths assigned by
the controller. Integrate and run both journeys together before either task is
accepted.

### Wave 4 — Workbench, editors, source, acceptance

Run Tasks 6–9 in dependency order. Within Task 6, delegate characterization,
CSS extraction, controller extraction, client extraction, and focused UI tests
to sequential or demonstrably disjoint Spark slices under one Sol integration
owner. Do not append new behavior to the three monoliths. Task 9 remains a
Sol/Terra acceptance and release-review activity.

## Per-task loop

For every ledger task:

1. generate a bounded task brief and report path;
2. record the base commit and allowed paths;
3. dispatch the least expensive capable model explicitly;
4. require RED/GREEN evidence and a self-review report;
5. create a review package and run the required task review;
6. route P0/P1 findings through bounded fix/re-review rounds;
7. run task-level verification and reconcile the PM ledger;
8. commit and push the reviewed green task before starting its dependent wave.

For UI tasks, the brief and hand-off must contain a reuse inventory: searched
registries/templates, reused keys and paths, parameterization, rejected
candidates, and any proven gap that required a new registered asset. Reviewers
reject unexplained duplicates and style-only forks.

After Task 9 is accepted, follow the integration and release gates in
`docs/delivery-policy.md`: integrate the accepted iteration into `main` without
force, rerun the main-commit release gate, push `main`, and create the planned
repository release. Do not claim or perform cloud deployment.

Never claim completion from a report alone. Inspect the diff, rerun the required
checks, confirm cleanup, and confirm local HEAD equals the pushed remote commit.

## Stop conditions

Continue without asking for routine permission. Stop only when:

- a founder decision would materially change product scope or a frozen contract;
- a secret/credential or external production action needs new authority;
- a load-bearing P0/P1 survives the documented repair cap;
- the active plan is fully accepted and pushed.

Ordinary test failures, review findings, merge conflicts inside assigned paths,
and slow commands are work to resolve, not reasons to stop.

## Required final report

Report the last accepted task, commits pushed, exact verification evidence,
remaining planned tasks, open P0/P1 issues, runtime cleanup state, and the next
dependency-safe task. Use `GOAL_COMPLETE` only when every Task 0–9 acceptance
gate is satisfied, the ledger is accepted, and the final commit is pushed.

## Goal launch prompt

Paste the following text into a new Codex task with **Goal** enabled:

```text
Execute the active Archeform iteration as one continuous long-running Goal.

Read, in order: AGENTS.md, .codex/README.md, docs/project-status.md,
docs/delivery-policy.md,
docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md,
docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md,
docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md,
and the 2026-08-09 Product Closure ledger. Treat the plan as requirements and
the PM ledger as the only task-state authority.

Resume the current dirty Task 0 handoff in place. Do not reset, stash, discard,
or recreate its work. Inspect actual Git, processes, files, tests, and runtime
state; continue from the stable composition HTTP 400 boundary. Seal Task 0 with
focused RED/GREEN evidence, guarded real-model Expense and Appointment
acceptance, clean-checkout and cleanup proof, task/release review, ledger
reconciliation, commit, and push before starting Graph v2.

Then execute Tasks 1–9 dependency-first. Use Codex multi-agent orchestration
and the model routing in the workstream. Prefer GPT-5.3-Codex-Spark for bounded
exploration, mechanical 1–3-file edits, CSS/component details, fixtures,
focused tests, formatting, and scoped re-review. Use GPT-5.6-Sol for Graph and
lifecycle contracts, cross-package integration, hard debugging, security,
task gates, and final release review; use GPT-5.6-Terra for QA. Always specify
the subagent model and allowed paths explicitly.

After Task 1 is reviewed and frozen, run only the approved disjoint writer
waves: Task 2 Restaurant semantics in parallel with Task 3 UI Registry/source
foundation, then Task 4 customer surface in parallel with Task 5 merchant
surface. Stop both writers and return to the Task 1 owner if a shared contract
must change. Run Tasks 6–9 dependency-order; delegate Task 6's characterized
CSS/controller/client decomposition as bounded Spark slices under one Sol
integration owner.

Use TDD for new behavior. Require reports and review packages, task review,
fresh verification, ledger updates, and one reviewed commit/push per completed
task. Preserve Draft -> Publish -> immutable Compilation, environment-only
credentials, source provenance, Archeform public identity, stable internal
protocol/package identifiers, and unrelated existing work. Never persist or
report raw prompts, responses, or secrets. Do not use fixture-only results as
final acceptance where the plan requires a real model.

For every UI slice, apply the reuse inventory in docs/delivery-policy.md before
creating source: prefer approved primitives, patterns, business blocks, screen
and experience recipes, curated templates, and extractable current assets; add
a new registered item only for a documented semantic or interaction gap. Follow
the same policy for task commits/pushes, final non-force integration into main,
and the accepted repository release.

Continue without routine check-ins. Resolve ordinary test failures, review
findings, conflicts within assigned paths, and slow commands autonomously.
Stop only for a material founder decision, new external/credential authority,
a load-bearing P0/P1 that survives the repair cap, or full accepted completion.
Mark the Goal complete and print GOAL_COMPLETE only after Tasks 0–9 are
accepted, all required runtime/clean-checkout/accessibility/security evidence
passes, cleanup is empty, the ledger is accepted, and local HEAD equals the
pushed remote commit. Otherwise report the exact blocker and keep the Goal
active.
```
