# Task 6 report — Workbench Home and safe application summaries

Status: DONE_WITH_CONCERNS

Commit message: `feat: add workbench application home`

## Delivered Control Plane contract

- Added `GET /workspaces/local/application-graphs`, scoped by the fixed
  `local-workspace` slug.
- The endpoint uses explicit Prisma selections and returns only application
  id/key/name, composition Profile, latest Draft revision/time, latest
  Published revision/time, latest Compilation id/status/completion time, and
  aggregate Golden-asset maturity counts.
- The mapper never spreads stored Draft Graph, Compilation result, AI,
  credential, prompt/response, provider, or artifact data into the response.
  Compilation status is reduced to a bounded lifecycle value, and the client
  repeats an explicit safe-field projection.
- The latest Compilation is selected across all Published revisions while the
  latest Published metadata remains the highest publication revision.
- A terminal Compilation now records its actual completion timestamp in the
  existing immutable `result` JSON. Safe summaries accept that timestamp only
  for terminal `succeeded`/`failed` results and only when it is a canonical ISO
  value; queued creation time is no longer presented as completion time.

## Delivered Workbench Home

- Home is the initial and rail-addressable Workbench surface. The Factory Pilot
  brand button also returns to Home.
- Golden Profile cards visibly include Restaurant Ordering, capability names,
  maturity, and local application counts.
- Projects are grouped by Profile and show Draft/Published lifecycle,
  Golden-asset counts, failed-compilation attention, Open, and Compile actions.
  Recent activity is ordered from safe lifecycle timestamps.
- Compile is disabled for Draft-only projects. Home Open uses the existing
  exact-Graph bootstrap endpoint, and retains only Draft plus safe Published
  metadata. It compares `sourceDraftRevisionId` before presenting the current
  Draft as Published.
- Home creation reuses the existing guided-creation drawer. Open, publish, save,
  and compile reuse the existing reducer, client, lifecycle endpoints, and
  compilation polling; no second store or API was added.
- Application summaries refresh both when compilation polling crosses into a
  terminal result and whenever Home activates. Integration coverage exercises
  queued-to-succeeded and queued-to-failed transitions before returning Home.
- Overlapping summary reads are generation-guarded so a slower mount/Home
  request cannot overwrite a newer terminal refresh.
- A targeted browser journey covers Restaurant Profile creation, Draft editing,
  Home summary/gating, reopening, publication, compilation, and artifact
  inspection when the existing Factory stack is available.

## External gate remediation

- Terminal compilation transitions persist a true `completedAt` alongside the
  terminal result. A delayed-completion regression proves it differs from the
  Compilation row's queue-time `compiledAt` value.
- No Prisma migration is required: `Compilation.result` is the existing JSON
  lifecycle-result field, and pre-remediation or malformed terminal results are
  mapped safely with `completedAt: null` rather than a fabricated fallback.
- Reopen projection attaches the current Draft Graph to Published metadata only
  when `sourceDraftRevisionId` exactly matches the current Draft revision.
  Mismatched revisions keep no Graph snapshot, and the Code surface reports
  `Publish a revision to compare` instead of a false semantic match.

## Changed files

- `apps/control-plane/src/lifecycle.controller.ts`
- `apps/control-plane/src/lifecycle.service.ts`
- `apps/control-plane/test/lifecycle.controller.test.ts`
- `apps/control-plane/test/lifecycle.service.test.ts`
- `apps/workbench/components/workbench-home.tsx`
- `apps/workbench/components/workbench-home.test.tsx`
- `apps/workbench/components/workbench.tsx`
- `apps/workbench/lib/control-plane-client.ts`
- `apps/workbench/lib/control-plane-client.test.ts`
- `apps/workbench/lib/workbench-model.ts`
- `apps/workbench/lib/workbench-model.test.ts`
- `e2e/workbench.spec.ts`
- `.superpowers/sdd/2026-07-30-restaurant-ordering-mvp/task-6-report.md`

No Graph, capability, compiler, generated runtime, Prisma schema, Docker,
dependency, source-study, notice, or ledger path changed.

## TDD evidence

- Summary RED: focused Control Plane tests failed because
  `listLocalApplicationSummaries` did not exist and GET returned 404; focused
  Workbench client failed because its summary method did not exist.
- Summary GREEN: lifecycle service/controller 77/77 and client 16/16 passed,
  including local-workspace Prisma scope and forbidden-field assertions.
- Home RED: the component test failed to resolve the absent Home module.
- Home GREEN: Open Restaurant dispatched its key, Draft-only Compile remained
  disabled, Published Compile reused the callback, failed activity was visible,
  and the Create action reused its callback.
- Integration RED/GREEN: Workbench model tests first failed while Home was not
  initial; client tests first failed while exact-Graph Open and published-source
  metadata were absent. They then passed 29/29.
- Accessibility/grouping RED/GREEN: semantic Restaurant Profile heading and
  Profile-group project headings each failed before their focused render
  changes and passed afterward.
- External-gate RED: lifecycle tests failed because terminal summaries returned
  queue time and completion persistence omitted `completedAt`; the client test
  failed because matching Published metadata lacked its verified Draft Graph;
  Workbench integration tests failed because no terminal summary refresh was
  issued after queued-to-succeeded/failed polling.
- External-gate GREEN: lifecycle service 49/49, client 18/18, and Home/Workbench
  integration 6/6 passed. The latter covers both terminal outcomes, Home
  reactivation refresh, out-of-order request resolution, and mismatched-source
  reopen with no false semantic match.

## Verification evidence

- `pnpm --filter @factory/control-plane test` — PASS, 97/97 across 10 files.
- `pnpm --filter @factory/control-plane typecheck` — PASS.
- `pnpm --filter @factory/control-plane build` — PASS.
- `pnpm --filter @factory/workbench test` — PASS, 65/65 across 15 files.
- `pnpm --filter @factory/workbench typecheck` — PASS.
- `pnpm --filter @factory/workbench build` — PASS; Next compiled, typechecked,
  and prerendered all four static pages.
- Explicit Prettier check over all remediation-touched source/test paths — PASS.
- `git diff --check` — PASS.
- `pnpm exec playwright test e2e/workbench.spec.ts --grep "Home|Restaurant"`
  — one scenario discovered; FAIL after 60 seconds before any product assertion
  because `page.goto("http://127.0.0.1:5174/")` had no available listener. The isolated
  compose stack could not be started because this worktree has no `.env`.
- Package-wide Control Plane lint — FAIL only on pre-existing, out-of-scope
  `src/graph-proposal.provider.ts` and `src/main.ts` formatting.
- Package-wide Workbench lint — FAIL only on eight pre-existing, out-of-scope
  files: `app/page.tsx`, `app/workbench-client.tsx`,
  `components/domain-relation-graph.tsx`, `lib/graph-exchange.test.ts`,
  `lib/graph-exchange.ts`, `lib/policy-preview.ts`,
  `lib/profile-starters.test.ts`, and `lib/profile-starters.ts`.

## Acceptance status and remaining risks

- Fresh read-only remediation review: **APPROVE** with no P0/P1 findings. Its
  only P2 is the live browser/target-runtime evidence gap described below.
- Safe summary shape, local workspace scope, Golden maturity, Profile/project
  Home surface, direct creation/open/compile actions, Draft compile gating,
  failed-compilation attention, exact-Graph Open, and lifecycle-source handling
  are satisfied by focused and full automated evidence.
- Terminal summary freshness, true persisted completion time, safe handling of
  historical results without a timestamp, and Draft/Published identity safety
  are satisfied by focused and Workbench-level integration regressions.
- Live Workbench browser execution is not claimed. It requires the Task 7
  isolated Factory/Docker environment or another configured server at port
  5174. The E2E is present and reached Playwright execution, but navigation did
  not reach the product.
- Verification ran on host Node 24.18.0 and emitted the expected engine warning.
  Node 22 Docker release evidence remains required.
- Package-wide formatting debt is outside the Task 6 ledger paths and was not
  changed; every Task 6-owned source/test file is formatted.
