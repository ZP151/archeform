# Consumer Generation Delivery Ledger

Updated: 2026-09-10 (Asia/Singapore). PM is the single task-state and
product-scorecard owner. The task and approval started on September 7.

## Approved objective and authority

The founder approved the consumer-generation correction on 2026-09-07 and
requested a detailed iteration roadmap, efficient regression, rapid delivery,
and product-goal tracking. Ordinary users should describe a need, answer only
necessary business questions, and receive a complete usable application.
User-managed planning, technical setup, and repeated development are not the
default product journey.

The [execution plan](../plans/2026-09-07-consumer-generation-delivery.md) and
[approved product reset](../../iterations/2026-09-05-consumer-app-generation-reset.md)
supersede historical technical-evaluator and edit-first product priorities.
They do not supersede technology/security authorities or authorize a provider,
cloud resource, new shared contract, or repository release.

## Current evidence, kept separate

| Surface                   | Evidence / state                                                                                                                                            | Meaning                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Delivered baseline        | `factory-pilot-v0.1.0`                                                                                                                                      | Local Alpha; not a hosted consumer platform                                                                      |
| Main                      | `ff9ae7eca0ca09b0d643d32627fa2882678eae94`; readiness PR #3 merged                                                                                          | U3/U4 local readiness integrated; historical September 3 status below the new checkpoint is stale                |
| Main CI                   | Run `33756827488`: Node 22.11 test lane failed on Candidate concurrency; Node 22.x passed                                                                   | Release baseline remains red; fast selected tests cannot close this issue                                        |
| Stopped R0 experiment     | `codex/r0-postgresql-publication-experiment`, observed `7c2d2442`; final outcome inconclusive                                                               | Preserve evidence; no automatic restart, cleanup edits, acceptance or merge in this task                         |
| Current task              | `codex/consumer-delivery-roadmap`, isolated worktree `.worktrees/consumer-delivery`, base `ff9ae7ec`                                                        | D0 delivered; bounded D1.1-D1.3 automatic default accepted locally; full D1 remains open                         |
| Asset inventory           | 43 source entries, 108 scenarios, 27 current capability assets, 5 profile entries; September 5 inspection                                                   | These are different units, not 108 or 1,000 delivered applications                                               |
| Existing executable reuse | Restaurant ordering customer/merchant recipe and runtime tests; August 11 real-model Expense Approval and Appointment journeys accepted 2/2 in 20.3 minutes | Reuse these implementations; their manual workflows do not measure the new consumer first-pass or hosted targets |
| Product scorecard         | No new 30-case benchmark or ordinary-user pilot run                                                                                                         | Unknown values remain unmeasured, never fabricated as zero or success                                            |

The original workspace has pre-existing Candidate test edits, ADR-0031 and
planning changes. This worktree preserves them. Current remote status was
read again on September 7; recheck the remote tip before future integration.

## Task board and write ownership

| Task                           | Status                                       | Owner / write boundary                                                                                  | Next evidence                                                               |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D0 planning and tracking       | Accepted and delivered                       | Root PM: this ledger, plan, reset/research docs, testing guide, status/roadmap/delivery-policy pointers | Reviewed coherent roadmap and safe metric definitions                       |
| ADR-0037 proposal              | Accepted under founder standing policy       | Tech Lead `regression_scope`; independent reviewer `regression_decision_review`                         | Decision record below; implementation review remains separate               |
| D0 regression helper           | Accepted and delivered                       | Engineer `regression_implementation`: `scripts/regression.mjs` and `scripts/regression.test.mjs` only   | Focused RED/GREEN, both actual lanes, one independent implementation review |
| D1 first complete ordering app | Default automation accepted; broader D1 open | Root integration; completed D1 writers and exact path handoffs recorded below                           | D1.9 delivered; D1.10 accepted for branch delivery; H1 and D2 next          |
| H1 hosted usability            | Planned with D1                              | Tech Lead proposal first; implementation unassigned                                                     | Smallest identity/persistence/hosting decision and external prerequisites   |
| D2 intake/approval             | Planned                                      | Unassigned; reuse existing profiles and capability boundaries                                           | Full submit/review/result journey in the common entry                       |
| D3 appointment                 | Planned                                      | Unassigned; schedule contract gaps first                                                                | Conflict/cancel/timezone tests and 30-case cross-family evaluation          |
| D4 ordinary-user validation    | Planned                                      | PM/QA, invited participants                                                                             | 5–8 non-programmer sessions; structured observations                        |
| D5 catalog expansion           | Conditional                                  | PM + research + implementation, disjoint assignments                                                    | Demand, reusable coverage, first-pass evidence and maintenance cost         |
| B1 baseline repair / release   | Separate blocked baseline                    | Existing governance; no writer assigned here                                                            | Specific disposition and a repair that passes unchanged concurrency tests   |

Do not write outside an assignment. A shared-contract change stops its parallel
wave for one consolidated decision. Routine fixes inside the frozen scope do
not require another founder approval or a new audit document.

## Product scorecard

D1 was explicitly started by the founder on September 8. See the execution
record below for the current bounded dispatch; D0 remains delivered.

Planning targets apply to the three-family pilot. They are not current
performance claims. Synthetic benchmark and real-user observations are reported
separately. Show numerator/denominator per family as well as pooled results.

| Metric                       | Definition                                                                                                                           | Pilot target                                                                                      | Current value                                                                                                  | Evidence owner / next update                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| First-result success         | First generated result completes all declared core role journeys with no user correction or developer repair / all eligible attempts | At least 90%, at least 27/30 benchmark cases; no family below 8/10                                | D1.10 first sample: 2/3 supported complete; unsupported handled 1/1; restart failure retained                  | QA; first D1 ten-case run, then D3 30-case run  |
| User questions               | Business questions answered before usable result; count each question even when batched                                              | Median at most 1; at most 3 for ordinary supported requests                                       | D1.10 coarse/detailed: 0; ambiguous scope/live payment: 1 each; earlier failures retained                      | Workbench owner; D1 structured journey events   |
| Required technical decisions | Framework, schema, provider, manual compilation or similar decisions required of the ordinary user                                   | 0                                                                                                 | 0 in all four D1.10 request scenarios                                                                          | UX/QA; D1 journey observation                   |
| Active user effort           | Time typing/choosing/correcting from request start until first successful business task; machine wait reported separately            | Establish baseline in D1; reduce each slice without reducing success                              | Unmeasured                                                                                                     | PM/QA; D1 and invited-user sessions             |
| Time to usable app           | Accepted request until ready address plus successful core task; includes clarification, generation, verification and deployment wait | Prepared environment p50 at most 5 min, p95 at most 10 min                                        | D1.10 ready: coarse 25.483 s, supplied 26.437 s, one-answer 121.579 s; local, no percentile                    | Platform/QA; D1 local and H1 hosted separately  |
| Cold-start delivery          | Same clock with first provisioning/install included                                                                                  | Record p50/p95 and failures separately; no hidden exclusion                                       | Unmeasured                                                                                                     | Platform; H1                                    |
| Developer rescue             | Attempts requiring staff to edit code/configuration or steer the user / all attempts                                                 | 0 in accepted benchmark; pilot observation reported honestly                                      | D1.10: 1/3 supported scenarios required the restart-address runtime correction                                 | PM/QA; D1/D4                                    |
| Platform repair              | Automatic repair count and elapsed time before usable result                                                                         | Bounded by the accepted repair policy; visible in measurements                                    | Unmeasured                                                                                                     | Platform; D1                                    |
| Durable hosted success       | Intended user completes task from another device; state survives supported restart; unauthorized user is denied                      | Every accepted hosted pilot case                                                                  | Unmeasured                                                                                                     | Platform/QA; H1                                 |
| Executable coverage          | Distinct definitions with bound recipes and passing end-to-end business acceptance; cases and families counted separately            | 3 families / 30 benchmark cases; then build toward 30 distinct definitions before broad expansion | Restaurant canonical and supplied menus (1/3/100) validated locally; broader families and hosted coverage open | PM; D1/D2/D3/D5                                 |
| Validated demand             | Participants independently completing a useful task they actually need                                                               | 5–8 invited non-programmers; report counts and unmet needs                                        | Unmeasured                                                                                                     | PM; D4                                          |
| Feedback cost                | Duration of focused test, smoke, product and existing full checks, separately                                                        | Initial budgets: smoke 30 s, warm product 120 s; optimize after measuring                         | D1.9 product 2,385 tests / 151 files, fresh compiler 218.80 s; generated-browser matrix 10.9 s                 | Integration owner; every meaningful lane change |

At 30 cases, tail-latency estimates are directional; publish the observed
distribution and failures instead of claiming a stable production percentile.
Unsupported requests are separately counted and explained, not silently
removed from the request mix to improve success. Freeze supported scope and
case version before a run. A failed attempt remains a failure in first-result
success even if a later retry succeeds.

## Lightweight measurement record

For each accepted business slice, add one compact record with: task ID, code
revision, benchmark version, environment class (prepared/cold, local/hosted),
case IDs/families, attempts, first-result passes, question count distribution,
active-user and total elapsed time, platform repairs, developer rescues,
core-journey/denial/persistence results, and the highest-impact next defect.
Store aggregate counts and safe structured codes only. Do not store raw AI
prompts/responses, personal data, credentials or screenshots containing them.

Each task close updates this ledger and the short current-status pointer once.
A metric regression becomes the next bounded corrective task when it affects
the core result. Cosmetic improvements cannot displace a broken core journey.
Use this record for progress answers; do not create parallel audit/status
ledgers for the same slice. No scheduled automation is established by this task.

## D0 decision and verification record

- Proposal: ADR-0037, recommendation `keep`, no Golden-profile transition.
- Standing acceptance: independent read-only reviewer
  `/root/regression_decision_review` returned
  `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1/P2 `0/0/0`, for proposed
  ADR-0037 SHA-256
  `345e1cf4dea0345d6ccdde4b7885773b1e9091a43cea0e238a527cedc0001788`
  at base `ff9ae7eca0ca09b0d643d32627fa2882678eae94`. PM records founder
  acceptance under the exact September 1 standing policy before authorizing
  implementation. The ADR proposal remains unmodified; this ledger records
  its accepted state.
- Decision evidence: real Windows pnpm adapter test passed 1/1; Turbo dry-run
  selected exactly five test tasks and nine upstream builds; authority files
  are unchanged. Approval covers only the bounded two-script helper and no
  product, API, runtime, provider, deployment or release action.
- Writer authorization: `regression_implementation` may implement exactly
  `scripts/regression.mjs` and `scripts/regression.test.mjs` under ADR-0037.
  PM owns documentation concurrently. Spark inventory could not run because
  its model quota was exhausted; the assigned Engineer is the available
  implementation fallback. No worker may commit or push.
- Environment: Windows, Node `22.23.2`, pnpm `9.0.0`, existing frozen lockfile.
- Isolated dependency installation: `pnpm install --frozen-lockfile
--ignore-scripts` passed; no manifest or lockfile changes. Prisma generation
  is not evidence from this install and is not needed by the selected lanes.
- Helper RED: the focused Node test failed with `ERR_MODULE_NOT_FOUND` before
  `scripts/regression.mjs` existed. GREEN: `node --test
scripts/regression.test.mjs` passed 9/9 tests. Both dry-runs passed without
  executing their selected commands. Writer changed only the two assigned
  scripts; manifests, lockfile, Turbo, workflow and Compose are unchanged.
- Actual smoke: `node scripts/regression.mjs smoke` passed both fixed steps
  on September 7, exit 0, 17.11 seconds. This exercises tooling fixture tests;
  it does not boot a product or perform Docker/model acceptance.
- Actual product: `node scripts/regression.mjs product` passed, exit 0,
  167.39 seconds on September 8 in the freshly installed worktree, including
  prerequisite builds. Five package suites passed 2,271 tests across 145 files:
  Graph 661/21, adapters 74/10, capabilities 384/32, compiler 616/37 and
  Workbench 536/45 (tests/files). The compiler suite took 140.87 seconds and
  owns most of the cold-run cost.
- Warm feedback measurement: a second unchanged product invocation passed in
  0.99 seconds. Turbo dry-run confirmed all five selected test tasks had cache
  `HIT`. This is cache-reuse latency, not 2,271 freshly executed tests or a new
  consumer outcome measurement. No failure was retried or suppressed.
- Static verification: exact changed-file formatting, Markdown links in the
  four new operational documents, and protected authority-file diff checks
  passed. Ledger formatting and diff checks passed after the evidence update.
- Independent task review: `/root/regression_decision_review` returned `ACCEPT`, P0/P1/P2 `0/0/0`, for all 11 task paths on September 8. This single ordinary-task review includes specification, code quality and the whole bounded diff. PM accepts D0. Controller delivered accepted content commit `c94918a28a0c361a792d67a645bec57a9d29d677` to `origin/codex/consumer-delivery-roadmap` and verified exact local/remote tip equality. This documentation-only receipt records that completed handoff. No main merge, new repository release or deployment is accepted.
- Main CI and hosted consumer readiness remain separate and unaccepted.

## D1 execution record — started 2026-09-08

- Founder instruction: begin iteration according to the latest approved plan
  and product goal. This authorizes execution of the agreed consumer journey;
  ordinary implementation choices do not require another general design approval.
- Workspace: continue the clean isolated consumer-delivery worktree from
  `dfc0f71d`. Preserve the original workspace's unrelated work and stopped R0.
- Current finding: Describe already reaches canonical Restaurant V3 composition
  and `openTemplateDraft`. Mandatory plan selection, diff confirmation and
  manual lifecycle handoffs are the immediate consumer-effort gap.
- PM owns this ledger, the execution plan and status documentation. Tech Lead
  `d1_design` owns only proposed
  `docs/adr/adr-0038-consumer-generation-orchestration.md`. No product writer
  is assigned until the exact orchestration scope and decision are recorded.
- Reuse inventory: approved Workbench UI registry and existing Home composer,
  clarification panel, ProductConversation, BuildingPreview, template workspace,
  product/release hooks and ControlPlaneClient. Keep existing Graph/API,
  compiler, capability, template and provider contracts unless a specific
  accepted decision establishes otherwise. No new UI asset is authorized merely
  for styling.
- Environment preparation: initial local Doctor found Docker stopped and no
  worktree environment file. Started installed Docker Desktop and copied the
  existing local environment file into the ignored worktree `.env` without
  displaying any values. Runtime readiness will be rechecked before acceptance.
- Current remote evidence: branch CI `34141740418` at `dfc0f71d` passed Node
  22.x and failed Node 22.11 in Candidate tests. This remains a B1 baseline
  issue; local D1 work proceeds without describing main or release as green.
- D1 implementation, benchmark and real runtime acceptance are in progress,
  not yet accepted. Product scorecard values remain unmeasured until actual
  journey evidence exists.

### D1.1 decision and frozen writer assignment

- ADR-0038 is accepted through the September 1 founder standing policy.
  Independent read-only reviewer `/root/d1_decision_review` returned
  `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1/P2 `0/0/0`, for exact SHA-256
  `78262f75b276bc4ab218758232c080f88781586f4f6abce7d54fe55700675f0f`.
  PM records this before assigning implementation. The accepted scope is code
  and tests for fresh Restaurant-only frontend orchestration; existing local
  lifecycle outputs are within the approved D1 journey, not a new deployment
  or repository-release authority. The proposal file remains unmodified.
- One Engineer, `d1_implementation`, owns the serialized Workbench integration.
  Authorized files (and focused sibling `.test.ts` / `.test.tsx` files) are:
  `apps/workbench/lib/product-journey/use-product-journey.ts`,
  `apps/workbench/lib/product-journey/use-release-journey.ts`, optional new
  `apps/workbench/lib/product-journey/use-consumer-generation.ts`,
  `apps/workbench/hooks/use-workbench-controller.ts`,
  `apps/workbench/components/workbench.tsx`,
  `apps/workbench/components/workbench-home.tsx`,
  `apps/workbench/components/journey/requirement-composer.tsx`,
  `apps/workbench/components/journey/building-preview.tsx`,
  `apps/workbench/components/journey/release-workspace.tsx`, and
  `apps/workbench/styles/builder-workspace.css` if existing responsive styles
  require a scoped adjustment. Adapt existing assets; no new registry asset.
- The same writer owns browser evidence fixtures and cases at
  `apps/workbench/test/consumer-generation-fixture.ts`,
  `apps/workbench/e2e/consumer-generation.pw.ts`,
  `e2e/consumer-restaurant.spec.ts`, and only the optional manual-entry adjustment
  in `e2e/restaurant-v3.spec.ts`. Retain its existing assertions. Test-only
  helper extraction requires a PM ownership update before writing.
- Frozen behavior: default automatic progression only for a fresh interpreted
  `restaurant-ordering` request with no open questions and exactly one `standard`
  alternative. Existing/generic/edit/refresh flows retain manual behavior. An
  optional advanced manual-entry choice preserves the original Restaurant
  acceptance. No background retry, automatic repair-Diff approval, new backend
  contract, default-public access, external hosting or provider change.
- Root PM owns all documents and environment preparation concurrently; no
  other code writer is active. Root will run browser/runtime verification.
  Worker must run focused RED/GREEN and Workbench checks, report exact evidence,
  and never commit/push. Normal task review follows the frozen implementation.
- Prepared environment: local Doctor now passes and the existing Playwright
  Chromium binary is installed. Unchanged Control Plane and compiler-worker
  images built successfully. The isolated `factory-t9-consumer-d1-20260908`
  backend is running with every published port bound to `127.0.0.1`. Host and
  worker-to-Control-Plane health checks both returned HTTP 200. No service has been
  deployed externally and no credentials are displayed or committed.
- Focused RED: the new consumer-generation hook test failed because the
  implementation module did not yet exist. Its first assertion exercises
  exactly-once selection of the stored `standard` alternative under StrictMode.
  Implementation and GREEN evidence remain pending.

### D1.1 bounded browser work handoff

- To shorten delivery after the first focused GREEN checkpoint, PM transfers
  only `apps/workbench/test/consumer-generation-fixture.ts`,
  `apps/workbench/e2e/consumer-generation.pw.ts`, `e2e/consumer-restaurant.spec.ts`
  and the retained manual-entry adjustment in `e2e/restaurant-v3.spec.ts` to
  `d1_browser`. The integration writer confirmed these paths are untouched and
  will not write them. All product, hook, UI and unit-test paths remain owned
  by `d1_implementation`. PM continues documentation and environment work.
- Frozen shared interface: existing Graph and Control Plane APIs; `Restaurant
delivery` region, `Open local app`, `Restart local delivery`, `Advanced
options`, and `Review the Restaurant plan and delivery steps myself` checkbox.
  Coordinate any change to these contracts before either writer proceeds.
  No worker may commit or push. This test-only partition adds no product scope
  or acceptance gate; the completed diff receives one independent task review.
- First GREEN checkpoint: integration writer reports consumer-hook tests 2/2,
  including real `useProductJourney` transitions from fresh Describe, a passing
  non-loopback readiness refusal test, and a passing Workbench typecheck.
  Existing composer regression tests were restored and the new test appended.
  Remaining focused guards, browser and runtime evidence are pending.
- The first complete Workbench run passed 543 tests across 47 files, typecheck
  and lint. Root's implementation inspection then found missing full-lifecycle
  StrictMode and stale-response guards despite that green result. The same
  writer is correcting those concrete defects and adding focused regression
  cases before final review. The first green run is not D1.1 acceptance.

### D1.1 final verification in progress

Root now owns `apps/workbench/lib/product-journey/use-release-journey.ts` and
its focused `.test.tsx` to complete the exact preview cleanup and late-start
edge cases directly. The integration writer acknowledged the handoff and has
no running test process; all other product paths are frozen. Browser files are
complete with 4/4 mocked cases passing, typecheck and formatting passing. Real
runtime acceptance remains pending. This continues the same implementation
review and does not add a gate or change the accepted contract.

- Root RED reproduced two lifecycle defects: restart advanced before a late
  preview POST settled, and readiness accepted a different current preview ID.
  GREEN: 23 release tests pass, including exact teardown before restart,
  rejected-preview cleanup followed by target change, and failed cleanup
  preventing republish. Test teardown now settles mocked cleanup before
  restoring the global transport.
- Final selected product lane passed in 17.62 seconds. Workbench passed 556
  tests across 47 files; the four unchanged package suites reuse existing
  cache evidence (aggregate selected inventory: 2,291 tests, 147 files).
  A subsequent dry-run shows all five test tasks cached. This is not a fresh
  full-repository run or consumer-success measurement.
- Root reran the four mocked browser cases after the final lifecycle fix:
  4/4 passed in 20.1 seconds. The happy path verifies exact request order and
  standard-key choice with minimal first, no mandatory technical panels,
  1440/768/390 px overflow and accessibility checks. Other cases retain
  manual review, refuse an unsafe preview link and reject duplicate standards.
- Workbench typecheck and lint pass. The final production Workbench image
  builds successfully and its isolated HTTP endpoint returns 200. Runtime
  checks confirm fixture mode is disabled and existing provider and local
  demo credentials are present; their values are never displayed.
- Independent review is checking the frozen corrections. Real runtime
  acceptance, delivery commit/push and D1.1 acceptance remain pending.

### D1 product cases and measurement boundary

These are authored intent attributes and expected business outcomes, not captured
provider input/output. Every case is pending actual execution. Hook tests and
mocked browser tests validate orchestration; they cannot fill this product table
with successful outcomes. D1.1 does not claim unsupported rule binding.

| Case | Intent or condition                                                 | Required user-visible result                                                                                                                       |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| O01  | Coarse single-location table ordering                               | A standard customer and merchant app; complete a real order without technical handoffs.                                                            |
| O02  | Detailed request matching supported standard roles and order states | Preserve the requested supported behavior and expose the working result directly.                                                                  |
| O03  | Appearance and optional content omitted                             | Apply disclosed defaults without asking the user to choose schemas, components or framework settings.                                              |
| O04  | Live payment or another unavailable integration requested           | Explain the unsupported requirement before claiming completion; a simulated payment app must not count as satisfying live payment.                 |
| O05  | Private staff operations with public customer ordering              | Customer access works; unauthorized merchant actions remain denied with no public-access fallback.                                                 |
| O06  | Ambiguous business intent                                           | Ask only a material business question and resume; an unrelated standard app must not count as a useful first result.                               |
| O07  | Interpretation or planning fails                                    | Give one actionable recovery route, preserve the user's recoverable input in the current session, and do not start hidden repeated provider calls. |
| O08  | Compilation, verification or preview fails                          | Explain that the app is not ready; no fabricated success link or automatic approval of a repair diff.                                              |
| O09  | Repeated submit or navigation during generation                     | Avoid duplicate lifecycle mutations; never continue against a different or stale Draft.                                                            |
| O10  | Completed order followed by supported runtime restart               | Persist business data; merchant fulfilment remains visible to the customer after restart.                                                          |

For real executions record result, business-question count, required technical
choices, user actions, elapsed time, manual rescue and environment preparation
separately. Do not turn ten cases into a percentage without a declared sample:
the later 30-case benchmark measures first-result success across three families.
O04 and O06 require honest requirement handling beyond merely automating the
canonical default. They stay open until implemented and exercised.

### D1.1 real-attempt failure and bounded recovery correction

The first real-provider run stopped after 244.76 seconds because the total
business-question limit of three was exceeded, before composition or a usable
app. It remains a failed first attempt; no customer/merchant or persistence
success is inferred. The first instrumentation did not record the exact count
or categories, so those values are unavailable rather than estimated.

Root took ownership of `use-release-journey.ts`, its test, and subsequently
`use-consumer-generation.ts` and its test from the completed integration writer
for the same review's recovery fixes. No backend, adapter, Graph, compiler,
provider, or deployment contract changed. The fixes preserve completed
Published/Compilation identities and late creation promises; verification
reuses its request identity; an unreconcilable immutable creation returns the
consumer to Describe instead of offering an endlessly failing replay. New
focused tests were observed failing before the fixes, then 34 release/consumer
tests passed. Workbench typecheck passes.

The browser owner also corrected the authored test answers: one generic answer
had been supplied to every category, including access and role questions it did
not answer. The coarse brief, maximum three questions and maximum two cycles
remain unchanged. Explicit canonical category answers and enum/count-only
failure diagnostics support one bounded affected rerun. This does not change
product clarification behavior, establish why the first provider asked excess
questions, or erase the failed attempt. No raw question, prompt, response, or
credential is retained in diagnostics.

The rerun must distinguish local orchestration success from first-result
quality. If the question ceiling still fails, prioritize capability-aware
clarification and supported-default guidance as the next bounded D1 correction;
do not enlarge the catalog, suppress unresolved access questions, or repeat
provider calls until one happens to pass. Final acceptance and task delivery
remain pending the same review and actual runtime result.

### D1.1 bounded real rerun and current disposition

- Attempt 1: failed at 244.76 seconds at the three-question ceiling; the exact
  count and categories were not captured. No application was generated.
- Attempt 2: failed at 174.28 seconds. At 171,430 ms after submission the DOM
  contained four initial questions, zero answered questions and no verification
  evidence. The category diagnostic then failed because its browser-evaluated
  callback referenced a Node variable. This is a test-harness failure, and the
  four-question observation independently exceeds the product target. Category
  values are unavailable. No further provider rerun is authorized by this
  bounded correction record; fix product behavior and the harness first.
- The latest production image built successfully; the container's release hook
  hash matched the reviewed source. A later browser-driven start-over navigation
  correction is validated separately and is not included in that image's real
  run. Neither real run reached compilation, runtime verification or the order
  journey; no first-result success percentage or ready-time percentile is claimed.
- Isolated cleanup completed with the exact Compose project
  `factory-t9-consumer-d1-20260908`. Before cleanup only the bootstrap app and
  five outer services existed. Its containers, network and two volumes are now
  absent; no global Docker prune or unrelated workspace mutation was used.
- The latest recovery review by `d1_decision_review` reports P0/P1/P2 0/0/0
  and independently passes 34 focused tests. The current product regression
  passed in 18.94 seconds: Workbench 561/47, with four unchanged package suites
  reusing valid cache evidence (selected inventory 2,296 tests / 147 files).
  These checks are developer feedback, not real consumer acceptance.

D1.1 remains implemented but **not accepted or delivered**. No task commit,
push, main integration, repository release or hosted deployment is claimed.
D0 remains the delivered checkpoint. The next functional correction is
`definition-aware clarification` in the active plan: ground interpretation in
existing supported definitions/defaults, preserve material questions and
unsupported-requirement honesty, and measure the actual business result.

### Final browser correction

The browser recovery case exposed a retained-view defect: after clearing the
consumer target, Workbench still selected `TemplateDraftWorkspace`, hiding the
Describe composer. Root took the one callback-wiring edit in
`apps/workbench/components/workbench.tsx` and reused the existing
`controller.commandFocus` action via the consumer's `onStartOver` callback.
No new navigation/controller/API contract was introduced. The callback only
runs for the exact live target when immutable creation requires start-over.

The browser owner observed RED before that correction and GREEN afterwards:
5/5 mocked browser cases in 16.6 seconds, including one unknown Publish 503,
no duplicate Publish or Compile/Verify, and a usable new Describe input.
Temporary React instrumentation was removed. The real-spec category closure
was corrected by passing the allowed enum values explicitly to browser
`evaluateAll`; a provider-free Chromium probe verified known/unknown categories.
Workbench typecheck and all changed-file formatting/whitespace checks pass.
No real-provider success is inferred from this test-harness correction.

Final affected product regression after the start-over navigation correction:
passed in 13.90 seconds, Workbench 561 tests / 47 files; the four unchanged
package suites reused cache evidence. This supersedes 18.94 seconds as the
latest selected-lane duration, without changing the failed real-attempt result.

Final independent reviewer `d1_decision_review`: P0/P1/P2 **0/0/0**,
`CODE_SCOPE_APPROVED: yes`, `D1.1_WHOLE_SLICE_ACCEPTED: no`. The reviewer
independently reran the final 34 release/consumer tests and Workbench typecheck.
The code and test scope is clear; the missing real consumer result remains the
acceptance blocker. The latest root package counts are 561/47 and selected
2,296/147; the review's earlier 556/2,291 quotation is superseded by the final
root run above. Preserve this distinction and do not turn code approval into
business acceptance or task delivery.

## D1.2 continuation — resolve the real consumer blocker

The founder explicitly requested continued iteration and resolution of the
obstacles. This resumes the queued definition-aware clarification correction;
it does not erase either failed D1.1 real attempt. D1.1's reviewed uncommitted
implementation remains intact in `codex/consumer-delivery-roadmap` at the same
D0 base. No additional general audit or unrelated baseline repair is started.

- Root owns the existing ledger, plan, status and isolated local runtime.
- Tech Lead `d12_definition_decision` owns only proposed ADR-0039, after reading
  technology/security authorities and the actual canonical Restaurant sources.
  This is the concrete boundary decision needed before adapter writes because
  ADR-0038 excluded them. Standing independent review remains applicable.
- The correction must preserve the original coarse real case, three-question
  and two-cycle ceilings, material access questions, unsupported-requirement
  honesty, immutable lifecycle and non-empty runtime verification.
- First prove the change with focused provider-free tests, then run a bounded
  affected real acceptance. New provider calls follow a substantive correction,
  not unchanged retries until a lucky pass. Local runtime preparation resumes
  under the existing user-authorized acceptance scope; credentials remain only
  in ignored environment files and are never displayed.
- The local backend is healthy, fixture mode is disabled and existing provider
  and demo inputs are present. These are boolean preflight observations, not
  app-generation success.

### ADR-0039 accepted; serialized implementation assigned

Tech Lead `d12_definition_decision` froze
`docs/adr/adr-0039-definition-aware-restaurant-interpretation.md` at SHA-256
`8a7668279e3bafc0fb37595ae7899f28975a73415a2692ed9edbebe01867c0c4`.
Independent reviewer `d1_decision_review` returned P0/P1 **0/0** and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. PM records founder acceptance under
the September 1 standing policy in `docs/tech-governance.md`, with the current
founder instruction providing continuation of the approved product correction.
The proposed file remains unchanged; acceptance is recorded here.

PM assigns Engineer `d12_interpretation` exclusively
`packages/adapters/src/requirements/openai-interpreter.ts` and
`packages/adapters/test/requirement-interpreter.test.ts`. Implement the accepted
allowlisted canonical guide and first-response/concise-blueprint instructions
with focused RED/GREEN. Do not change question filtering, schemas, provider
settings, capabilities, frontend, compiler, Compose, dependencies or E2E cases.
No other product writer is active. Root owns documents and real runtime
acceptance; one independent implementation review follows focused checks.

Root owns one acceptance-only correction in `e2e/restaurant-v3.spec.ts`: disable
its historical two automatic retries for the retained manual-entry run. Keep
all brief, answer, edit, lifecycle, business and cleanup assertions unchanged.
This makes real-provider failures visible and prevents silent repeated calls;
it does not weaken acceptance. The adapter writer owns disjoint paths only.

### D1.2 focused implementation evidence

- RED: the new first-request guide assertions failed before implementation.
  The generic ambiguity instruction also failed its consistency assertion until
  it explicitly deferred to applicable supported defaults.
- GREEN: 42/42 focused adapter tests, adapter typecheck and lint pass. The
  sensitive Restaurant fixture retains authorization, data and live-payment
  questions; no output question is removed or automatically answered.
- Independent reviewer `d1_decision_review`: P0/P1/P2 **0/0/0**,
  `CODE_SCOPE_APPROVED: yes`; independently reran the same focused checks.
  This approves the implementation boundary, not real product acceptance.
- The affected product lane passed in 136.75 seconds, including Workbench
  561/47 and adapters 77/10. The production Workbench image built successfully;
  its adapter source hash matches the worktree and both HTTP surfaces return 200. The real consumer run uses this image and zero automatic retries.

The D1.2 real consumer attempt failed: 280,257 ms from submission, 302.03 s
total, zero displayed/answered questions, no non-empty verification or usable
app. This does not prove that first-response clarification succeeded: the
failure category was not captured. Only the bootstrap app exists. Preserve
this third failed consumer attempt; no unchanged coarse retry is authorized.

Root takes the two existing real Restaurant specs and one shared test-only
helper `e2e/helpers/interpretation-diagnostics.ts` to capture HTTP status and
allowlisted interpretation error codes, never raw bodies or generated text.
The already-required distinct manual acceptance may run once with this
observation and unchanged assertions. Tech Lead `d12_definition_decision`
performs a bounded read-only source investigation while root owns diagnostics
and runtime; no product writer or broader implementation is authorized yet.

### D1.2 reference-mirror repair

The Tech Lead's read-only trace found a concrete existing mirror defect:
blueprint declaration keys are lowercase Graph keys, but reference fields in
the provider/Zod mirror still permit camelCase identifiers. Such references
cannot name any valid declaration and only fail at downstream semantic
validation. Tightening those references to the existing Graph-key grammar
does not change the accepted set of semantically valid blueprints, the public
schema, APIs, persistence, provider selection or runtime. This is an in-contract
mirror correction, not the broader definition-selection path.

Root assigns `d12_interpretation` the same two adapter files again for focused
RED/GREEN on every affected reference position, preserving ordinary identifier
and entity-field grammar. This finding is not claimed as the cause of the
uncategorized coarse failure. Reuse the prior reviews and add one scoped
re-review for the actual correction; any further real consumer run must use
the corrected build and preserve all previous failures. The separately planned
manual run continues against the earlier frozen image and is recorded as such.

The retained manual Restaurant V3 acceptance passed **1/1 in 243.85 seconds**
against the reviewed D1.2 guide image, before the reference-mirror repair.
Both observed interpretation requests returned HTTP 200. The unchanged lane
verified Draft edits across Page/Data/Experience/Access, immutable Publish,
Compile, generated customer/merchant/shared-state verification, local customer
and merchant HTTP readiness, desktop/mobile accessibility, and exact preview
stop. Only the five outer acceptance services remain. This proves the retained
manual workflow works; it does not turn the failed automatic case into a pass.

Diagnostic-only review by `d1_decision_review`: P0/P1/P2 **0/0/0**, approved.
Provider-free projection checks confirm known/unknown-code handling, no reads
of successful bodies, no raw-body output, and ignoring unrelated requests.
The first projection probe incorrectly expected asynchronous logs to be in
submission order; its corrected order-independent assertion passed. No product
change or acceptance waiver resulted from that harness-only assertion error.

The reference repair is frozen. Its schema regression first failed against the
broad reference pattern, then passed with all eight reference positions using
the existing Graph-key grammar. Focused adapter tests pass **43/43**, adapter
typecheck/lint and diff checks pass. Independent reviewer `d1_decision_review`
returned P0/P1/P2 **0/0/0** and independently reran those checks. Ordinary
requirement/journey identifiers, entity-field grammar and authoritative
semantic validation are unchanged. A rebuilt image and one affected coarse
consumer acceptance follow this substantive repair.

The corrected production image built successfully and its adapter source hash
matches the worktree. The affected product regression passed in **140.45 s**:
Graph 661/21, adapters 78/10, capabilities 384/32, compiler 616/37, Workbench
561/47; selected inventory **2,300 tests / 147 files**, including unchanged
cache evidence. This remains developer feedback, not an automatic business
pass. The corrected coarse consumer run now uses zero retries and the safe
HTTP observer. The manual run's retained evidence is reused for unaffected
manual UI/lifecycle behavior; the automatic run exercises the corrected
adapter against the real provider.

The corrected coarse run also failed: HTTP **422**,
`requirement.output_invalid`, **349,123 ms** from submission, **377.27 s**
total, zero displayed/answered questions and no verified app. The output-invalid
result follows the adapter's existing bounded candidate-repair path; no raw
candidate or specific rejected invariant was captured. There are now four
failed coarse consumer attempts across changing code, and one distinct passing
manual acceptance. Do not rerun unchanged or claim the mirror repair solved
the coarse failure.

### D1.3 — eliminate redundant Restaurant blueprint generation

The founder's continuation/obstacle-resolution instruction remains active.
The code-backed structural defect is now the functional priority: Restaurant
interpretation creates and semantically repairs a full generic blueprint that
the final canonical Restaurant composer does not use. Root assigns Tech Lead
`d12_definition_decision` only a proposed ADR-0040 defining the smallest concise
supported-definition path. Prefer preserving public Graph/HTTP/lifecycle
contracts through deterministic projection from existing first-party canonical
assets; no fixture fallback, keyword-only routing, new provider, dependency or
runtime. Keep explicit unsupported requirements and material questions visible,
and preserve the unchanged coarse benchmark. This is a proposal assignment,
not product-write authorization. One standing decision review precedes exact
implementation ownership. Root owns documents and the isolated runtime.

Root additionally owns one business acceptance file,
`e2e/restaurant-definition-selection.spec.ts`, for the distinct live-payment
negative probe. It exercises the unchanged public Workbench boundary and
asserts that integration clarification prevents automatic delivery. Preparing
this test does not authorize the still-pending adapter experiment; its real
execution follows implementation review and build. No raw interpretation or
question text is logged, and no generated app is published by this probe.

### ADR-0040 accepted; D1.3 implementation assigned

Tech Lead `d12_definition_decision` froze proposed ADR-0040 at SHA-256
`77eda5ebb779d49858d05cdb25b6c5fb0992c4a12a56e222b5d1406fb2b4d218`.
Independent reviewer `d1_decision_review` returned P0/P1 **0/0** and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. PM records founder acceptance under
the September 1 standing policy and the active consumer-generation objective.
The ADR remains unchanged. This authorizes the bounded reversible experiment,
not a release, cloud action or new provider/resource authority.

Engineer `d12_interpretation` exclusively owns
`packages/adapters/src/requirements/openai-interpreter.ts`, new private
`packages/adapters/src/requirements/restaurant-definition-selection.ts`, and
`packages/adapters/test/requirement-interpreter.test.ts`. Implement the exact
private union and canonical subset projector with focused RED/GREEN, generic
compatibility, material-question preservation and canonical-drift checks.
No public API/Graph/runtime/catalog/dependency writer is authorized. Root owns
the already assigned docs and acceptance files/runtime. One scoped independent
implementation review includes the new negative acceptance test; still-valid
D1.1/D1.2 evidence is reused.

Initial D1.3 implementation passes 47 focused adapter tests, typecheck and
lint, including an actual `planProductAlternatives` compatibility check. Root
identified two missing accepted checks before real execution: canonical-source
drift injection and Appointment through the new generic provider wrapper.
The same writer may reopen only the existing test file to add these while the
read-only reviewer examines frozen product code. Any product correction from
review must be serialized and rechecked before provider execution. Root also
flagged branch/answer instruction ambiguity for this same scoped review.

The reviewer confirmed one P1 instruction conflict before any D1.3 real call:
unsupported Restaurant briefs did not have an unambiguous branch, and generic
follow-up instructions demanded a full blueprint from definition selections.
Root authorizes the same writer to correct those instruction lines and add the
focused protocol regression within the existing three-file contract. Every
Restaurant brief uses definition selection; only its supported disposition
requires canonical fit, and unresolved deviations keep their questions. Only
non-Restaurant generation updates a full spec/blueprint. The reviewer will
finish this same scoped review against the correction; no new audit is added.

The corrected D1.3 implementation is frozen with **49/49** focused adapter
tests, typecheck/lint and diff checks passing. It now includes cloned canonical
transition/grant/role/state/event/recipe drift cases, exact public Appointment
output through the generic provider branch, preservation of four material
questions, and explicit Restaurant/non-Restaurant follow-up instructions.
The previous initial D1.3 product run passed 2,304/147 in 173.75 s and its image
built, but those predate the instruction correction. Final affected regression
and image build are running; no D1.3 provider call has occurred yet.

The affected product lane passed **2,306 tests / 147 files** in **229.47 s**
(Graph 661/21, adapters 84/10, capabilities 384/32, compiler 616/37,
Workbench 561/47); the corresponding production image built. The same
reviewer found one remaining P1 in the adjacent unqualified follow-up sentence:
it could suppress an answered but still-material Restaurant integration
question. Root authorizes the same writer to scope that sentence to the generic
branch and assert the qualifier in the focused regression. Reuse the unaffected
full product evidence, rerun focused adapter checks and rebuild the affected
image. This is the existing scoped correction, not a new decision or audit.
No D1.3 real call has occurred yet.

Final D1.3 scoped implementation review is **approved**, P0/P1/P2 **0/0/0**,
by independent `d1_decision_review`. The reviewer independently passed 49/49
adapter tests in 4.40 s, adapter typecheck and negative Playwright discovery.
The two instruction findings are closed; public-envelope compatibility,
canonical drift refusal, planner compatibility, material-question preservation
and safe negative acceptance diagnostics are covered. Root rebuilt and restarted
Workbench; both adapter product files match the running image:
`openai-interpreter.ts` SHA-256
`419acdae5aa2dd859fa7aad7086a722f9a551501826ccdbe700ff8afb6f180d8`,
`restaurant-definition-selection.ts` SHA-256
`1e79da376f3165b4067f850f9ac9ae4d4af3a622bf26bae2d0eb2026d32579f1`.
Workbench and control-plane health return HTTP 200. Root now executes the
zero-retry real live-payment negative, followed by the unchanged coarse case;
code approval alone is not consumer acceptance.

The distinct real live-payment negative passed **1/1**, zero retries, **35.81 s**
total. Interpretation returned HTTP 200, with clarification visible at
**30,343 ms**, **14 questions**, **4 integration questions**, and **0 product
or lifecycle delivery mutations**. No ready app was claimed. This proves this
explicit unsupported request was not silently converted to the simulated
standard; it does not prove general semantic classification accuracy. The
14-question interaction is a concrete remaining effort defect for unsupported
requests. Preserve material requirements while replacing the long question
sequence with a clear capability boundary and one meaningful choice in a
subsequent scoped slice; never fix it by truncating unanswered requirements.
The unchanged coarse positive now runs separately with its original
three-question/two-cycle ceiling and zero retries.

### D1.1-D1.3 bounded local acceptance and delivery

The original coarse case passed **1/1**, zero retries, with **0 business
questions**, **0 required technical handoffs**, and **21,385 ms** from submitted
brief to verified ready. The complete test took **40.79 s**. Environment:
prepared local Docker with warm generated-image/package caches from the retained
manual acceptance; these are not cold-start or hosted timings. No developer
intervention occurred within this successful attempt. Four prior coarse failures
and the separate manual success remain historical evidence, not a fabricated
benchmark distribution. Provider repair count and active human effort were not
measured by this test.

The runtime recorded four authoritative verification steps and succeeded.
The browser placed a customer order with simulated payment. Kitchen API actions
accepted, prepared and marked it ready; repeated acceptance with the same
idempotency key preserved the exact response/version; customer staff action
returned 403; customer, manager and cashier APIs agreed on the ready state.
Workbench and generated pages passed axe and overflow checks at 390/1440 px;
retained mocked Workbench evidence also covers 768 px. Both real preview runs
were confirmed stopped, then the exact outer Compose project was removed.
Final inspection: **0 owned containers, 0 owned networks, 0 owned volumes**,
no generated preview/verifier resources; only Docker built-in networks remain.

Root inspected the safe ready and mobile screenshots. The automatic ready
screen and app link are present. The generated order page remains visually
rudimentary with concatenated values, and its screenshot still displays the
previous paid state after backend fulfilment. The current test proves backend
state visibility through the customer API, not automatic live DOM refresh.
These are concrete full-D1 usability gaps; do not describe the generated product
as polished or claim customer live-status acceptance. Screenshots remain in the
ignored `acceptance-artifacts/d1/` directory, outside the commit.

PM accepts only the bounded supported-default orchestration and concise
interpretation slice under ADR-0038/0039/0040, the scoped independent approvals,
focused/product/browser evidence and exact cleanup above. Root may create and
push one bounded English task commit under the existing delivery policy.
Full D1, the ten-case benchmark, custom business binding, restart persistence,
ordinary-user usefulness and hosted delivery are not accepted. Main integration
and repository release remain blocked by the independently recorded baseline
CI defect; the stopped R0 experiment remains untouched.

Next functional priorities are the generated order page's readable business
fields and visible status refresh, followed by a concise unsupported-capability
choice and required Restaurant parameter binding. Strengthen acceptance to
observe customer DOM status after merchant fulfilment, not only the API. Keep
one independently reviewed frozen scope per change; do not add general audits
or expand the catalog before these user-effort gaps are measured. A generated
template or shared-contract change receives the existing Tech Lead decision;
no new runtime/cloud action is implied.

The enclosing bounded task commit is the delivery checkpoint on
`codex/consumer-delivery-roadmap`; its parent is `dfc0f71d`. Before commit,
all changed/new owned files passed Prettier and `git diff --check`, accepted
ADR hashes were reconfirmed unchanged, and the remote branch still matched
the recorded D0 parent. Controller delivery requires a normal push and exact
local/remote equality; no main merge or repository release is included.

### D1.4 started — readable customer orders and visible refresh

The founder requested continued rapid execution on September 8. Delivered
parent `c61fedff27a8f102f0edd92edfd662db40d90c71` is clean in the existing
`consumer-delivery` worktree. Root owns this ledger, the current plan/status,
and a new bounded provider-free browser acceptance `e2e/restaurant-orders.spec.ts`.
Read-only Spark `d14_explore` maps existing registry/recipe/compiler reuse and
root causes. Tech Lead `d14_decision` owns only proposed ADR-0041
`docs/adr/adr-0041-generated-restaurant-order-readability.md`, because generated
template changes trigger governance. No product writer is assigned until the
exact standing decision acceptance is recorded. The active scope is readable
customer order fields and a clear existing-page refresh, with browser DOM
status evidence after merchant fulfilment. No new polling, dependency, public
contract, provider, identity boundary or cloud deployment is proposed.
Unrelated original-checkout edits and the stopped R0 experiment remain untouched.
The existing plan and founder continuation cover the product outcome; routine
UI choices do not require a repeated brainstorming approval loop.

ADR-0041 is founder-accepted under the September 1 standing independent-review
policy. Final SHA-256: `d26a4a5551aa8b3d466bab7ff8ab3e98299bc7a199fd321addc90875e2aacaf1`.
Tech Lead `d14_decision` recommends **keep**; independent `d1_decision_review`
reports P0/P1 **0/0**, `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, and confirms
bounded reversibility with no material ambiguity or boundary expansion. This
record precedes implementation. No external/provider/cloud/release authority
is added. The accepted currency presentation reads existing
`state.settings.currency`, with two-decimal integer-minor-unit amounts.

PM assigns one bounded Spark implementation writer `d14_orders` only the four
compiler paths listed in ADR-0041 CON-003. Root retains the browser test and
PM documents; no shared write paths. The implementation brief is
`.superpowers/sdd/2026-09-07-consumer-generation-delivery/d14-brief.md`.
Focused RED/GREEN, compiler types/lint, one scoped independent review and actual
provider-free generated-browser acceptance apply. Earlier code/review evidence
outside these paths remains valid; no new broad audit is required.

Root also owns mechanical acceptance alignment in
`e2e/consumer-restaurant.spec.ts` and `e2e/restaurant-template-acceptance.spec.ts`:
replace the obsolete visible `simulated-paid` expectation with the accepted
`Paid (simulated)` presentation and add native refresh plus visible `Ready`
after the existing backend fulfilment checks. API assertions stay unchanged.
This is test maintenance for the accepted template correction, not an expanded
product contract or a reason to repeat unchanged paid model generation.

Spark writer `d14_orders` exhausted its model quota before completing checks.
Its turn ended; no writer remains active on the four compiler paths. Root
assumes serialized ownership of those exact paths to finish the correction,
focused verification and handoff. In-progress source and tests are preserved;
no new contract or permission is needed. The observed browser RED remains valid.

Root closed the unfinished implementation with a focused RED for duplicate
refresh links, then GREEN **17/17** target tests in **17.13 s**. The correction
also preserves existing renderer exports, rejects inherited status keys,
encodes detail identifiers once, handles missing orders explicitly, and shares
one customer stylesheet between customer-only and dual-surface targets.
Generated API/state/merchant/registry sources remain unmodified.

The provider-free real generated-browser acceptance passed **1/1 in 4.2 s**:
empty state -> customer checkout -> kitchen fulfilment -> keyboard activation
of the native refresh -> visible `Ready`, with item/payment/currency and detail
checks. Browser read/refresh operations issued zero mutations. Axe and overflow
passed at **390/768/1440 px**. Both loopback servers closed and the temporary
state directory was removed with a post-removal assertion. Root inspected the
390/1440 screenshots together: values are separated and status is visible.
Compiler build/typecheck/lint and mechanical Impeccable detection passed; the
three affected E2E specifications are discoverable. The two existing full
factory/model cases were updated mechanically but were not rerun; their
unchanged generation/lifecycle evidence is retained separately. Product lane
and the one scoped implementation review are pending.

### D1.4 accepted and branch delivery

Final product regression succeeded in **192.93 s**, selected inventory
**2,310 tests / 147 files**: Graph 661/21, adapters 84/10, capabilities 384/32,
compiler 620/37 and Workbench 561/47, including unchanged cache evidence.
Independent `d1_decision_review` returns scoped implementation **APPROVED**,
P0/P1/P2 **0/0/0**, with independent 17/17 focused compiler tests and typecheck.
Root's final build, lint, browser, visual, responsive and exact cleanup evidence
above completes this bounded task's acceptance. No unresolved scoped finding.

PM accepts D1.4 and authorizes normal controller commit/push. The enclosing
commit on `codex/consumer-delivery-roadmap`, parent `c61fedff`, is its delivery
checkpoint; controller must verify exact local/remote equality. No main merge,
repository release or hosted deployment is included. This corrects only new
compiled customer order presentation; prior immutable artifacts stay unchanged.
The next functional priority is the real unsupported-payment case's 14-question
interaction, followed by parameter binding, ten-case reliability and persistence.
Full D1 and hosted usability remain open. Do not claim live automatic updates:
customers explicitly select Refresh status to see authoritative progress.

### D1.5 — customer visual completeness (active)

The founder's September 8 continuation explicitly prioritizes the visibly
unfinished mobile customer output. Root continues from `88ec618f` in the same
isolated iteration worktree. Root owns `customer-target.ts`, its focused test,
`e2e/restaurant-orders.spec.ts`, this ledger, the active plan and project status.
Tech Lead `d15_design_decision` owns only proposed ADR-0042; no product writer
starts before the required standing decision review. Spark's prior quota failure
remains unresolved, so root performs the bounded implementation serially.

Reproduction: the real generated bundle loads one stylesheet (HTTP 200,
text/css), all module requests succeed and no page errors occur. Its actual CSS
leaves the browser body margin at 8px and navigation has no active destination.
This is incomplete target styling, not a missing UI package or CDN outage.
Browser RED (6.7 s) and focused compiler RED reproduce missing aria-current.

Design: retain fine-dining colors, native document navigation, existing shell
and truthful order data. Add a deliberate brand header, padded content, clear
serif heading / sans-serif information hierarchy, prominent fulfilment state,
readable receipt rows, and persistent touch-sized navigation with the current
page identified. Do not add decorative images, third-party assets or a package.
The previous functional acceptance did not establish sufficient visual quality;
new rendered evidence must show the actual generated application.

ADR-0042 is accepted under the founder's September 1 standing authorization.
Exact SHA-256: `1060ef0e97dc67bdabb722fa2450b46e0119f73f02ad3ff2bcc1f34fe69da538`.
Tech Lead `d15_design_decision` recommends keep; independent read-only
`d1_decision_review` returns P0/P1 0/0 and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. Root now authorizes the serialized
implementation within the above owned paths. The server's embedded stylesheet
literal may change; routing, APIs/state, merchant and shared generated sources
remain unchanged. This record precedes product edits. Root captured both prior
compiled file maps locally for exact output comparison after build.

D1.5 implementation GREEN: all 18 focused customer/product target tests passed
in 19.42 s, including all eight navigation routes. Compiler build, typecheck,
and lint passed. The real generated-browser case passed 1/1 in 4.2 s (5.8 s
runner total): stylesheet 200, zero failed requests/page errors, one current
navigation destination, zero body margin, 44px minimum navigation targets,
visible native refresh to Ready, zero page mutations, and axe/overflow checks
at 320/390/768/1440 px. Mobile fixed navigation does not cover the order action.

Root inspected the emitted mobile, desktop and empty-state screenshots in one
batch. The new presentation uses the existing Fine Dining colors, brand header,
serif display and system information text, prominent truthful fulfilment and
receipt rows. No external asset, font, icon or framework was introduced.
Impeccable detection exited zero with no findings.

Comparison against the preceding built bundles proves identical generated path
sets and unchanged shared UI/experience source, manifests, runtime state/API and
merchant source. Customer-only changes app.mjs, styles.css and the exact embedded
CSS response literal in server.mjs; dual-surface changes only customer app.mjs
and styles.css because its server reads the file. The initial comparison helper
incorrectly required a server change for both bundles; correcting that harness
expectation confirmed the actual narrower dual-surface scope. No product fix
was required for that comparison. Product regression and scoped review pending.

Final D1.5 product regression succeeded: 2,311 tests / 147 files, including
fresh compiler 621/37 in 184.94 s and retained unchanged-package cache evidence
(Graph 661/21, adapters 84/10, capabilities 384/32, Workbench 561/47).
No generated-browser temporary roots remain; both test servers closed normally.

### D1.5 accepted and branch delivery

Independent `d1_decision_review` approves the scoped implementation, P0/P1/P2
0/0/0, after checking all four screenshots, boundaries and tests, independently
rerunning customer focused tests 11/11 in 12.58 s, and checking the exact ADR
hash. Root's 18/18 combined target tests, browser 1/1, build/types/lint, exact
file comparison, product 2,311/147 and cleanup complete the task evidence.
PM accepts D1.5 and authorizes controller commit/push on the existing branch.
The enclosing commit, parent `88ec618f`, is the bounded delivery checkpoint;
controller verifies local/remote equality. No main merge, repository release or
cloud deployment is included. New generated applications inherit this visual
correction; existing immutable compilations retain their prior output.

Product outcome: remove the unfinished browser-default appearance from customer
orders and navigation without adding user configuration or iteration steps.
Functional and visual acceptance are separate: the founder's D1.4 feedback is
retained as evidence that passing business/a11y tests did not prove visual
completion. Next remains the 14-question unsupported-payment interaction,
then business parameter binding, frozen case reliability and hosted usability.

### D1.6 — local icon library in generated customer UI (active)

Founder explicitly requests a library for icons or images and a concise visual
interface rather than text-only components. Continue from `bdd54f28`. Reuse
inventory finds existing Lucide policy/React coordinate in UI primitives and
Workbench, but generated native navigation is text-only and the generic tab
pattern emits unresolved data-lucide placeholders. Root recommends the same
Lucide family through compile-time static SVG; selected icons are shipped inline,
with labels on navigation/status and an accessible icon-only refresh action.
No stock images are introduced into order data or represented as actual dishes.

Root owns compiler customer/product targets, new target-local icon adapter and
its focused test, existing two target tests, compiler package manifest, lockfile,
provenance/notice records, existing order browser acceptance and PM documents.
Tech Lead `d15_design_decision` owns only proposed ADR-0043. Product and dependency
implementation waits for its standing independent decision review. Spark quota
failure is retained; root performs serialized implementation. User direction and
existing consumer scope cover routine visual choices without another design
approval loop. Focused RED (7.24 s runner) confirms emitted output has no Lucide
house icon. Browser assertions require real visible SVG, accessible labels,
non-focusable decorative icons, truthful status symbols and native navigation.

ADR-0043 is accepted under the founder's September 1 standing authorization.
Exact SHA-256: `bfcc41be6eae359700176a8be0365acf94d17559546b27012af7810903c44290`.
Tech Lead `d15_design_decision` recommends migrate; independent
`d1_decision_review` returns P0/P1 0/0 and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, independently matching package facts.
PM authorizes root's serialized dependency, helper, target, notice and test
implementation on the frozen paths. The helper test path is
`packages/compiler/test/restaurant-customer-icons.test.ts`. This acceptance
precedes dependency installation and product edits. The source package is
approximately 31 MB installed; only selected inline SVGs reach generated apps.

D1.6 focused GREEN: 24/24 across customer/product targets and icon helper in
21.69 s. Missing or changed pinned SVG inputs and unknown internal icon names
are refused; original package version, license and fixed geometry are checked.
Compiler build/types/lint, frozen install, existing third-party/source-study
checks and Impeccable detection passed. The lockfile delta is exactly the new
compiler importer, package integrity and empty dependency snapshot (11 lines);
pnpm's unrelated formatting and importer order changes were removed.

Browser harness correction: Playwright's root CommonJS transform misclassified
import.meta-based package resolution, then a mixed native/transformed Graph
module cache failed. The test now runs the built compiler ESM entry and authored
fixture in a bounded native Node child, receives the bundle in memory, and
starts its real generated servers as before. Build compiler before this browser
command. No product/runtime workaround was added for the test runner.
Browser acceptance then passed 1/1 in 4.6 s (5.8 s runner): actual visible SVGs,
accessible navigation names and decorative semantics, native Refresh to Ready,
zero external requests/page errors/mutations, and axe/overflow/touch/occlusion
checks at 320/390/768/1440 px. Root inspected mobile, desktop and empty screenshots
in one batch. All temporary state was removed and both servers closed.

Exact generated comparison against the prior built bundles proves only the new
THIRD_PARTY_NOTICES.md path plus customer app/styles (and customer-only server's
embedded CSS literal) changed. Shared registry/experience sources and digests,
Graph manifests, API/state/seed, merchant and generated package manifests remain
byte-identical. Product regression and scoped implementation review are pending.

Final D1.6 product regression succeeded: selected 2,317 tests / 148 files,
including fresh compiler 627/38 in 188.76 s and unchanged-package cache evidence
(Graph 661/21, adapters 84/10, capabilities 384/32, Workbench 561/47).
The direct package pin, integrity and zero transitive dependencies are verified
by frozen installation and focused helper checks; the existing ecosystem notice
and source-study gates cover their pre-existing scopes separately.

### D1.6 accepted and branch delivery

Independent `d1_decision_review` approves the bounded implementation with
P0/P1/P2 0/0/0, independent affected tests 24/24 in 19.38 s and inspection of all
four screenshots. Root's focused 24/24, browser 1/1, package/build/frozen-install
checks, exact file comparison, product 2,317/148 and cleanup complete acceptance.
PM accepts D1.6 and authorizes one normal controller commit/push. The enclosing
commit, parent `bdd54f28`, is the task delivery checkpoint; controller verifies
local/remote equality. No main merge, repository release or cloud deployment.

The generated customer app now uses a real library visual vocabulary without
asking users to choose/install icons or repair missing loaders. The fixed set
adds less than 15 KB of serialized SVG strings (focused budget assertion), not
the full library, to each generated customer module. Imagery/photo selection is
not part of this icon slice; the broader business priorities remain material
question reduction, required parameters, reliability and hosted usability.

### D1.7 — reduce unsupported-capability clarification effort (active)

The founder requests continued execution and an explicit long-task goal. Root
activates that goal against the accepted consumer roadmap, starting at
`e237ed75`. The retained live-payment case required 14 questions, including four
integration questions. This slice preserves canonical defaults independently
for omitted Restaurant details when another capability is unsupported. Ask one
scope decision per independent material difference, state unsupported capability
limits clearly, and avoid provider setup or credentials questions for unavailable
integrations. Preserve all actual independent access, privacy, business and data
decisions; no question truncation, keyword classifier or silent substitution.

Engineer `d17_clarification` exclusively owns
`packages/adapters/src/requirements/openai-interpreter.ts` and
`packages/adapters/test/requirement-interpreter.test.ts`. Root owns the existing
`e2e/restaurant-definition-selection.spec.ts`, PM plan/ledger/status and Git.
The frozen scope is a prompt-policy correction within accepted ADR-0040: no
private/public schema, Graph, runtime, deadline or repair-policy change. Focused
failing tests precede implementation. A discovered follow-up repair rejection
is being assessed separately before broadening this boundary.

Acceptance requires focused regressions, one scoped independent review and a
bounded live probe with safe count/timing evidence. Mock transport tests establish
instruction/projection behavior only; they do not establish live-model semantic
reliability. The authored single unsupported-payment probe targets one material
scope question with no delivery mutations. Update the product scorecard with
observed results and deliver the accepted slice before proceeding to parameter
binding. Full D1, frozen-case reliability and hosted usability remain open.

In parallel, Tech Lead `d15_design_decision` owns only proposed
`docs/adr/adr-0044-restaurant-business-parameter-binding.md` for D1.8. Assess
existing binding seams and the smallest useful business-name/menu parameter
slice. This is decision preparation only; no shared or product writes are
authorized before exact proposal review and PM acceptance. D1.7's frozen
prompt-only contract is independent and remains unchanged.

D1.7 local GREEN: focused interpreter 51/51, full adapter package 86/10 in
4.52 s, affected Workbench interpretation/clarification/orchestration 36/4 in
4.49 s, adapter types/lint and diff checks passed. Existing mixed authorization,
data, integration and role preservation remains covered. ADR-0040 PRO-004
explicitly retains bounded fail-closed behavior after a reiterated unsupported
answer; changing that return path is deferred to a separate decision.

The live negative uses an isolated Workbench-only local Compose project, with
the control-plane endpoint offline and fixture mode disabled. This focused
probe measures actual interpretation and visible clarification, including any
attempted delivery requests; it does not claim full lifecycle/runtime acceptance.
Only status, count and timing evidence is emitted. The first build started
before the engineer's final instruction freeze and is superseded before any
provider call. That first tested interpreter source SHA-256 is
`1c64ffc08e1752e1592131254f4c8a3134b38d790d77afec0c836b5bb74afc73`.

Initial focused RED was 47 passed / 3 failed out of 50: the independent-default
and explicit supported-scope follow-up instruction assertions were absent.
After restoring mixed-category coverage, RED was 50 passed / 1 failed out of
51 for the explicit no-discard/no-count-target instruction. Both preceded
their minimal prompt corrections and the final 51/51 GREEN.

The first real D1.7 probe failed the exact-one acceptance: HTTP 200 in 21,161 ms,
two questions including one integration question, zero delivery attempts,
25.1 s test duration. The image source hash matches the frozen implementation;
fixture mode is off. This reduces the historical 14/4 interaction but is not an
accepted fix. Independent review records one P1 against the unmet criterion.
No raw questions were retained, so the other category cannot be reconstructed.
Root authorizes one explicitly diagnostic provider invocation after adding
allowlisted category-only evidence. It is not a new passing acceptance sample
or a retry that erases the first failure. Product source remains frozen while
the engineer assesses instruction interactions read-only.

The diagnostic invocation also failed: HTTP 200 in 22,605 ms, six questions
(`integration`, `business-rule`, `data`, `authorization`, `data`, `business-rule`),
one integration question and zero delivery attempts; test duration 23.2 s.
These two observations demonstrate unstable over-questioning, not a reliable
two-question improvement. The authored brief contains only one noncanonical
requirement; broad ambiguity guidance still allows the model to infer downstream
decisions about a capability the platform cannot implement. Root authorizes one
prompt-only correction on the same two engineer-owned files: distinguish such
inferred consequences from independently requested material differences, with
a single-payment scope example. Preserve every actual independent requirement,
private/public shapes and existing fail-closed behavior. One fresh acceptance
probe follows the final frozen source and focused checks; no assertion is relaxed.

D1.8 proposal scope is narrowed before decision freeze: first propagate the
already-authoritative Graph application name into generated branding/settings,
instead of adding a parameter sidecar, database fields or an arbitrary two-item
menu contract. The Tech Lead verifies this existing seam and records remaining
menu/price binding separately. No broader parameter architecture is authorized.

The bounded D1.7 fix first produced focused RED 49 passed / 2 failed, then
51/51 GREEN. Scoped review additionally identified that the exact-one
`integration` instruction must explicitly apply to external capabilities so
non-external business-rule differences keep their category. The mechanical
correction produced RED 50 passed / 1 failed, then focused 51/51, full adapters
86/10, types/lint and diff checks passed. Independent scoped recheck confirms
that finding closed, with a fresh 51/51 run in 4.22 s. Final source SHA-256:
`bb7678be9261be48703de90ba7fe1557b1c052e26e488360a52839ffe14768c8`.
The live criterion remains open until the final-source image is exercised.

ADR-0044's proposed narrow name/currency binding is under independent standing
decision review by `d1_decision_review`; it is not accepted or assigned for
implementation. Its initial proposal SHA-256 is
`ac6b6014c8639f26760f5dbd416dd2bba29667102c15a613405aca445cf7a1e0`.

### D1.7 accepted and branch delivery

Final-source image and configured real provider are verified; fixture mode is
off. The fresh authored live-payment case passed 1/1, zero retries: HTTP 200,
12,840 ms to one visible `integration` question, zero delivery attempts, 14.2 s
test / 15.4 s runner. Both earlier failures remain above; no general reliability
claim follows from one pass. The exact local project was removed and root
confirmed zero owned containers, networks and volumes plus the closed probe
port. No generated app or cloud resource was created.

Independent `d1_decision_review` returns final P0/P1/P2 0/0/0. Focused RED/GREEN,
full adapters 86/10, affected Workbench 36/4, types/lint, actual production image
build, final live probe and cleanup complete this ordinary prompt-only slice.
Root also reran final focused 51/51 in 4.65 s. Unchanged compiler/runtime full
regressions retain D1.6 evidence; they are not claimed freshly executed here.
PM accepts D1.7 and authorizes one normal controller commit/push with parent
`e237ed75`, followed by local/remote equality verification. The pending D1.8 ADR
remains separately owned proposal work, outside this bounded product commit.
Full D1, required business binding, frozen reliability and hosted usability stay
open, and the long-task goal remains active for the next functional delivery.

D1.7 delivered as `2db84e41b3d37f6685c1f28b69a0697373745dad`; local HEAD and
remote iteration tip match. Only the separately owned D1.8 proposal remained
untracked after that bounded commit.

### D1.8 — bind existing application branding (active)

PM accepts ADR-0044 under the founder's September 1 standing authorization.
Exact SHA-256:
`d8996f2debf5842c247c25ad3e75ed4d0ccba5fa5ea051209d5ab24535db5480`.
Tech Lead `d15_design_decision` recommends keep; independent
`d1_decision_review` returns P0/P1 0/0 and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. The initial proposal's two evidence
issues were corrected before acceptance: mock tests do not prove model
semantics, and the real provider path now has an exact owned acceptance file.

One engineer `d18_brand_binding` owns serialized implementation in:

- `packages/adapters/src/requirements/openai-interpreter.ts`
- `packages/adapters/test/requirement-interpreter.test.ts`
- `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
- `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
- `packages/compiler/test/restaurant-customer-runtime.test.ts`
- `packages/compiler/test/restaurant-customer-target.test.ts`
- `packages/compiler/test/restaurant-product-v3-target.test.ts`

Root owns existing `e2e/restaurant-orders.spec.ts`, new provider-driven
`e2e/restaurant-business-binding.spec.ts`, PM plan/ledger/status and Git. D1.7's
writer is finished. This is a single writer, with frozen existing shapes;
no schema, database, package, catalog, menu, Graph or lifecycle edits. Reuse
existing shell/hero/settings rendering and Published plan fields. Runtime
merchant-name edits remain state changes and do not rewrite Published Graphs.

Require focused RED/GREEN, exact mirrored currency validation, safe JS/HTML
escaping, an authored named runtime/browser case, and separate real named
interpretation-to-Published/application evidence plus menu-refusal evidence.
Retain D1.7 and prior coarse-default results as prerequisites, rerunning them
only for an affected instruction change or concrete regression concern. One
scoped implementation review and required product regression close this slice;
the goal continues to track broader binding and reliability gaps honestly.

Root also owns only the stale literal-brand assertions in existing
`e2e/consumer-restaurant.spec.ts` and
`e2e/restaurant-template-acceptance.spec.ts`. Replace their fixed sample-name
expectation with equality to the observed immutable Published name; preserve
their authored briefs, business journeys, lifecycle and cleanup. This affected
fixture correction is within ADR-0044's retained-regression requirement and
adds no product or shared contract scope.

D1.8 RED discovered a decision-premise defect before production implementation:
canonical and name-only Published fixtures compile, but a correctly mirrored
SGD currency variation does not. Existing `contracts.ts` normalizes allowed
application-name edits, not currency, before the canonical comparison. It is
outside the frozen write scope and remains unchanged. The engineer paused with
RED-only test edits; root narrowed the actual browser fixture to name-only,
which failed correctly on expected `Saffron & Sage` versus `Maison Aurelia`.

The final **name-only** ADR-0044 supersedes the earlier proposal acceptance:
SHA-256 `3ea3a8a55c1e7220d150ccb82d7cf51d3d553878561b4dc513f5bca56e200b93`.
Tech Lead `d15_design_decision` recommends keep and independent
`d1_decision_review` returns P0/P1 0/0 with
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. PM records standing founder acceptance
and resumes the same serialized engineer paths. Remove superseded currency
RED expectations; initial USD and existing merchant currency edits are
unchanged. No Graph-currency binding or contract-guard extension is authorized.
Root's generated-browser test also verifies the authorized runtime name update
and existing order survive a customer server restart using the same state file.
This is specific local persistence evidence, not hosted or full D1 acceptance.

For the next actual business-data gap, Tech Lead `d15_design_decision` owns
only proposed `docs/adr/adr-0045-restaurant-menu-parameter-binding.md`.
Investigate a bounded, reusable menu-name/price binding through immutable Graph
data and existing runtime behavior, including a versioned validated parameter
contract if required. Avoid an arbitrary two-record product limit or invented
support for a requested currency. This is read-only code investigation and one
proposal, not D1.9 acceptance, product implementation or a shared writer wave.
D1.8's final name-only contract and ownership remain frozen.

Root delegates only its disjoint acceptance implementation to
`d18_acceptance`: new `e2e/restaurant-business-binding.spec.ts` and the two
existing consumer/template literal-name assertion corrections named above.
Root retains `e2e/restaurant-orders.spec.ts`, local execution and Git. All
Graph/API shapes and name semantics are frozen by the final ADR; no product
or helper shared-contract write is delegated. This bounded test writer may
perform provider-free discovery/checks only; root owns real model/runtime runs.

D1.8 implementation is frozen for one independent scoped review. Engineer
RED counts were adapters 51/53, runtime 39/40, customer 12/13, and product 7/8;
GREEN counts are adapters 88/88 and compiler 630/630 (178.80 s), with affected
types, lint, and builds passing. Initial currency remains USD. Final adapter
source SHA-256 is
`56e4f0e7763d51615135bcb98a618d233150158222c13cb557fdb2be2fc7c218`.

Root ran the actual provider-free `e2e/restaurant-orders.spec.ts`: 1/1 passed,
zero retries, 4.9 s test / 6.0 s runner. The non-default name reaches the page
and settings; an authorized rename and a Ready order survive a customer server
restart against the same state file. Initial currency remains USD. Viewports
320/390/768/1440 retain readable status, working local icons, no overflow,
zero external asset failures, and zero page errors. Root inspected the four
ignored D1.8 screenshots: mobile empty, detail, list, and desktop list. Exact
temporary generated servers and state are removed by the test. This is local
runtime evidence only; real provider acceptance is still pending. The required
product regression is running once against the frozen production source.

That product regression passed: 2,324 tests / 148 files. Fresh adapters 88/10
in 5.56 s, compiler 630/38 in 188.50 s, and Workbench 561/47 in 31.58 s;
unchanged Graph 661/21 and capabilities 384/32 cache evidence was reused.

The independent implementation review found a P1 before image/provider runs:
the private Restaurant title accepts 200 characters but the existing compiled
application contract permits only 2..80. An exact overlong display name could
therefore fail late. PM pauses production implementation pending Tech Lead's
ADR-0044 alignment and exact independent reacceptance. The engineer may add
focused boundary RED only; no Graph/public-schema expansion or truncation is
authorized. Retain the passing pre-correction checks and rerun affected adapter
checks after the fix rather than repeat unchanged compiler runtime evidence.

PM records exact revised ADR-0044 acceptance under the existing founder
standing authorization: SHA-256
`7b8cd99ef4b3d86566a0a01e45491947e3d297190747f7b34ac8fc61132f60ee`,
Tech Lead keep, independent `d1_decision_review` P0/P1 0/0 and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. This supersedes the prior name-only
hash. Resume `d18_brand_binding` on the existing interpreter/test paths plus
`packages/adapters/src/requirements/restaurant-definition-selection.ts` only.
Align private parser and provider JSON schema to trimmed safe 2..80, preserve
valid names exactly, and clarify/fail closed without truncation for invalid
explicit names. Keep generic/public schemas, Graph/compiler admission, USD,
repair bounds, and all other owned files frozen. RED 54/56 confirms 81/200
currently pass wrongly while exact 80-character escaped branding is retained;
complete the lower-bound case too. Focused adapter GREEN, package checks and
the same review's scoped correction check precede the one exact image build.

D1.8 same-boundary correction is frozen. Private title validation now matches
existing compiler admission: length 2..80, trim equality and C0/DEL refusal.
The provider JSON schema and instructions agree; generic/public title bounds
remain unchanged. Focused 63/63 and full adapters 98/98, types/lint/build pass.
Independent `d1_decision_review` reran 63/63 in 4.08 s and typecheck, and closed
the P1 with final source review P0/P1/P2 0/0/0. Compiler/browser/product evidence
above remains valid for unchanged target files. The exact full local factory
image build is running with interpreter SHA-256
`83692e59eb04b7311b0e7f5370b827d9e5d1156b8a5dcdfd5c5fa67b6a316b88`
and selection parser SHA-256
`dadda3739dfb8cc5229dbeb708f747b33f772cb63fcd71274fe3208b765668c4`.

### D1.9 decision readiness — implementation waits for D1.8 delivery

PM records standing founder acceptance of proposed ADR-0045 SHA-256
`5d9219ceeab24136a201bb515bf48d28d84aaab63c344f32924242c23f3551a7`:
Tech Lead `d15_design_decision` recommends migrate; separate read-only
`d1_decision_review` returns P0/P1 0/0 and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. One to 100 supplied USD menu items,
versioned validated parameters, canonical persistence/checksum, atomic Graph
seed/scenario binding and ordinal IDs are explicit. The default canonical menu
remains unchanged. No runtime create/delete, categories/options, currency,
authority, package or deployment expansion is accepted. Use the existing
contract acceptance sequence once; do not repeat cosmetic gates.

This decision is prepared independently while D1.8 runs. Production writes
remain unassigned until D1.8 is accepted and delivered; the proposed ADR stays
outside the bounded D1.8 commit. Root will record serialized path ownership
before starting D1.9. The long-task goal remains active.

### D1.8 live failure and bounded provider-pattern correction

All three exact-source factory images built and started under isolated project
`factory-t9-consumer-d18-20260908`. Running Workbench interpreter/parser hashes
matched the freeze above, provider configuration was present and fixture mode
off; worker runtime/customer hashes matched their reviewed files. Health was
200 at both loopback boundaries. The real named E2E first attempt failed:
HTTP 422 `requirement.output_invalid`, 11.2 s, before delivery. Its serial
menu-negative case did not run. Retain this failed first result.

Provider-free projection inside the exact image passed. One diagnostic adapter
invocation emitted only safe booleans/counts: all three existing bounded rounds
had invalid JSON. A separate one-call metadata probe reported `incomplete`, an
empty output array and zero output-text length, with no provider error. No raw
prompt/response or credential was recorded. These probes are diagnosis, not
acceptance samples or unchanged reruns to obtain a pass.

A controlled one-call experiment changed only the new title JSON-schema regex
to an equivalent expression without lookaround. It returned valid definition
JSON, exact authored name, and zero questions. This isolates a concrete
provider-pattern compatibility defect. PM assigns only interpreter pattern and
its focused tests back to `d18_brand_binding`; preserve the private full
2..80/trim/control parser and all other production behavior. The same scoped
review rechecks the correction. Rebuild the affected Workbench image only;
Control Plane/worker target code and runtime evidence remain unchanged.

The already-running final-source product lane also passed 2,334 tests / 148
files before this equivalent-pattern fix: adapters 98/10 in 5.41 s, compiler
630/38 in 193.30 s, Workbench 561/47 in 28.94 s; unchanged Graph/capabilities
caches retained. Reuse this evidence and rerun affected adapter checks only.

The equivalent provider-pattern correction is frozen at interpreter SHA-256
`099721a5d68dd3060cf688375ad56e503a746e8c999d7ade8841a4f829ca6276`.
Focused emitted-schema RED failed 62/63 on the old pattern; final focused 63/63
and full adapters 98/98, types/lint/build pass. Tests exercise the emitted
length/pattern admission for short, boundary, Unicode/interior-space values,
invalid bounds, endpoint whitespace, C0 and DEL, and forbid lookaround syntax.
The private parser hash remains unchanged. The same reviewer found no further
issue in the equivalent replacement; only the affected Workbench image is
rebuilding before real acceptance. No extra whole-product rerun is needed.

The corrected-image named run returned HTTP 200 but failed to enter delivery
in 20.4 s, with no named application/review/publication/compilation/preview.
A direct-route diagnostic returned the exact name, Restaurant product type,
and zero questions in 11.880 s; it is not browser acceptance. An instrumented
browser diagnostic then hung before its entry log and was interrupted, with
no additional lifecycle records. Improve safe diagnostics before another live
run: immediate parsed-result counts/booleans, nonwaiting UI attribute snapshots,
manual-review/failure terminals and a 30-second post-response UI bound. This is
test repair, not changing the authored brief or accepting an unchanged rerun.

Provider-free authored projection works in the actual Workbench: the correct
Control Plane origin receives one successful Product request; a deliberately
blocked later planning request returns the expected failed journey. These
diagnostic fixtures remain inside the isolated database and are not model
success evidence.

Read-only `d1_implementation` identified an existing zero-question planning
race: the effect consumes `planningStartedRef` while the interpretation run's
busy latch can still be set, so `createProduct` can return without work and
never be retried. PM assigns only
`apps/workbench/lib/product-journey/use-product-journey.ts` and its existing
`use-product-journey.test.tsx` to that engineer for focused RED, then guard the
planning latch until the journey is idle. This is a reversible orchestration
fix under the accepted D1 scope, with no new API/Graph/provider/lifecycle
authority. Preserve all other writers and source freezes. Prove the race before
claiming it caused the observed live stall; one affected check/review suffices.

The planning-race hypothesis did not reproduce: deferred settlement and forced
React flushing both stayed green on current code. The engineer removed the
non-failing exploratory test and made no hook change. Root's actual browser
probe also passed its diagnostic expectation both immediately and with a
12-second authored response delay: one intercepted Product request, then the
expected `product.unavailable` / review failure from an authored 503, with
immediate safe logs in 1.0 s / 12.8 s. Do not claim the hypothesized race as a
confirmed cause. The improved E2E diagnostic is frozen and a single diagnostic
live replay now captures safe interpretation and terminal state immediately;
it does not erase the earlier failed or interrupted samples.

That diagnostic replay returned HTTP 200, exact name, Restaurant product type,
and **one data question**. The UI outcome was clarification in 20.7 s, so no
delivery was expected; no hook defect was demonstrated. The authored request
explicitly chooses sample menu items and supplies no custom dish names/prices.
This reveals an ambiguity in the new custom-menu boundary instruction: sample
menu references and application branding must not create a menu-data question.
PM assigns only the interpreter instruction and existing focused test back to
`d18_brand_binding`: distinguish canonical sample/default browsing from actual
supplied menu content, preserve independent material requirements and custom
menu refusal, and add no local keyword classifier. The same reviewer rechecks
this semantic clarification, then one changed-source named/menu-negative run
must supply business acceptance. Earlier results remain failed diagnostics.

The semantic correction is frozen at interpreter SHA-256
`6e30c84ca088f0fdedd83f551866c1aa22d020084e064386c9419369e50b0a2d`
and focused-test SHA-256
`77235ffd2c522d53c2760d121516b1a6acd9056ecb1d0b740f7d943758256db2`.
An intermediate rule incorrectly required literal dishes/prices before treating
custom-menu intent as material; the same reviewer caught this P1 and the writer
closed it before the live run. Sample/default browsing and branding alone now
remain canonical, while explicit custom-menu intent or concrete supplied values
require one data clarification. Focused RED was 62/64, then 62/65; final focused
65/65, full adapters 100/100 and types/lint/build pass. Independent focused
65/65 passed in 3.89 s; scoped review P0/P1/P2 is 0/0/0. These authored boundary
tests do not establish model semantic reliability. The affected Workbench image
is rebuilding for a changed-source real named/menu-negative acceptance run.

### D1.8 acceptance and bounded delivery

The running Workbench hash matched the final semantic freeze, with provider
configured and fixture mode off. Changed-source real acceptance passed 2/2,
zero retries, in 46.5 s runner time: the supplied name reached verified local
delivery in 21.054 s with zero questions; Product request, immutable Published
metadata, compilation hash, customer document/shell/hero and merchant settings
all matched. The custom-menu case produced exactly one data question in
11.276 s with zero delivery mutations. Named test duration including cleanup
was 33.4 s; the menu boundary test took 12.0 s.

Two distinct retained-boundary cases also passed 2/2, zero retries, in 53.2 s:
the coarse Restaurant request reached verified ready in 21.031 s with zero
questions and zero user handoffs (37.8 s test including business checks and
cleanup); unsupported live payment required exactly one integration question
in 12.363 s with zero delivery mutations (13.0 s test). Preserve all earlier
failed diagnostics. These are four scenario observations, not a ten-case
reliability benchmark or hosted-maturity evidence.

Reuse the actual provider-free generated-browser order/rename/restart evidence,
the passing 2,334-test product lane and final affected adapters 100/100,
types/lint/build. The single scoped implementation review and its corrections
are clean at P0/P1/P2 0/0/0. No speculative planning-latch change was made.
`verify-no-preview-resources.mjs` passed. Exact factory-project cleanup then
removed all five services, two volumes and its network; final counts were zero
containers/networks/volumes and no listener on port 15178.

PM accepts D1.8 for one bounded branch delivery from parent `2db84e41`.
Root is the sole Git writer. Stage only the D1.8 production/tests, ADR-0044,
and reconciled status/plan/ledger; ADR-0045 stays outside this commit. Do not
integrate main, release or deploy. Record the resulting local/remote equality
before assigning D1.9 production. The long-task goal remains active.

### D1.9 serialized implementation authorization

D1.8 was committed and pushed as
`f9d32e0873b527bc3bef00c5a1aee75d6b0aeb38`; `git ls-remote` confirmed exact
local/remote branch equality. Only the prepared ADR-0045 remained untracked.
PM reaffirms the recorded standing founder acceptance of ADR-0045 SHA-256
`5d9219ceeab24136a201bb515bf48d28d84aaab63c344f32924242c23f3551a7`
after D1.8 delivery. Tech Lead proposed migrate, and independent
`d1_decision_review` approved standing acceptance with P0/P1 0/0.

Assign fresh `d19_menu_implementation` as the sole serialized production/test writer
for this bounded initial-menu slice: the capabilities menu contract/binder and
exports, interpretation adapter and result wrapper, Workbench interpretation
and Product transport, Control Plane Product persistence/apply plus the
additive nullable Prisma migration, compiler menu admission/catalog/placeholder
rendering, and their affected focused tests. Root owns PM documents, acceptance
execution, and all Git operations. Root may inspect but will not write shared
implementation paths during this wave. No other production writer is active.

Read ADR-0045 and both authorities before writing; start with focused failures.
Preserve all omitted-menu defaults and D1.8 name behavior. Do not expand USD,
stock/options/category requirements, runtime CRUD, dependencies, deployment or
security authority. Stop for a concrete contract conflict rather than inventing
a parallel contract. Complete one serialized implementation, then the required
task review, independent QA, release review and PM acceptance sequence once.
The real supplied-menu journey and unsupported-currency boundary remain
root-owned after source freeze; keep paid/model retries bounded and preserve
failed observations. No ten-case reliability or hosted claim is preaccepted.

Initial dispatch `d19_menu_binding` failed before execution because its default
Spark model hit the existing quota. No files changed. Redispatch the same
bounded contract work to GPT-6 Astra under AGENTS' strongest-model rule for
Graph, lifecycle, cross-package contracts and hard debugging; do not consume
a usage reset or introduce a second concurrent writer.

The implementation owner identified one concrete persistence ambiguity before
writing that seam: canonical parameters plus their canonical checksum cannot
distinguish an omitted menu request from an explicitly supplied canonical-default
request, but PRO-008 requires this idempotency distinction. PM pauses the
presence-dependent persistence seam and dispatches Tech Lead
`d12_definition_decision` to amend only proposed ADR-0045 with a nullable
request-presence marker and explicit legacy/corruption/replay rules. Independent
capabilities/adapter/compiler work may continue under the unchanged accepted
contract. No implementation may silently reinterpret the missing presence bit.
The amended proposal needs exact independent standing reacceptance before the
persistence seam resumes. Root remains the sole PM/Git writer.

PM supersedes the prior ADR-0045 acceptance with the exact revised proposal
SHA-256 `6bb3882c5f2a40e77b3fa7ab10ccafebbd678842cbfde4ee9c626792a33351e0`.
Tech Lead `d12_definition_decision` recommends migrate. Separate qualified
read-only `d18_acceptance` reviewed this amendment (not its writer or the D1.9
implementation writer) and returned P0/P1 0/0 with
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. Under the September 1 founder standing
authorization, PM accepts these exact bytes and unpauses the persistence seam.
New Restaurant rows persist the canonical object/checksum plus
`businessParametersProvided` false for omission or true for an explicit object;
legacy/non-Restaurant triple-null handling and corrupt-state refusal are frozen.
Explicit Restaurant null is invalid. No other shared contract changes.

Root reuses D1.8 browser lifecycle/diagnostic helpers in
`e2e/helpers/restaurant-delivery.ts` for the separately owned D1.9 live test,
without changing their behavior. Root added authored 1/3/100-item cases to
`e2e/restaurant-orders.spec.ts`. The initial focused third-item browser RED
failed in 1.9 s at the actual built compiler's canonical-only admission, before
starting servers. The final test will prove exact cents, keyboard ordering,
fulfilment, replay, staff denial, restart persistence and no image requests.

Root's extracted helper is mechanically unchanged: TypeScript AST declaration
printing compared all 23 helper declarations with delivered D1.8 and found zero
differences after stripping export modifiers. The new real test uses the exact
versioned response wrapper and boolean-only parameter/persistence/Graph checks;
its three-item and non-USD requests are authored fixtures fixed before any
provider execution. D1.8's former blanket custom-menu refusal now checks a
specific missing-price case. No D1.9 real provider call has run yet.

The first actual generated-browser run retained the canonical order case
(4.4 s) but found a one-item production defect: generated customer journey
code dereferenced a nonexistent second menu item. The sole implementation
owner is correcting that template assumption with a full-bundle test. The
three- and hundred-item tests initially hit a harness race reading a browser
response body during its reload; root now reads authoritative order state
after navigation. Those changed-harness cases then passed 2/2 in 6.4 s,
including exact cents, kitchen fulfilment, replay, denial, manager reprice,
restart and zero image requests. This is provider-free evidence only.

One batched mobile/desktop inspection found the provided-menu branch lacked
usable layout: price touched its link and the action was only 21 px tall.
A focused browser assertion failed against the required 44 px action. Spark
`d1_browser` owns only a read-only CSS/markup recommendation using those exact
screenshots; `d19_menu_implementation` remains the sole production writer.
Preserve existing visual tokens/icons and use one correction plus one batched
confirmation, not an open-ended polish or audit loop. This fixes the new
branch's concrete mobile usability defect within the accepted D1.9 scope.

The generated one-item journey exposed a second old assumption in
`product-target.ts`: its shared-state test expected the canonical price 1400.
The owner bound that assertion to the actual primary Graph price and added
finally cleanup. The corrected generated canonical/one-item executions passed
2/2 (four emitted journeys each) in 6.19 s; no owned test processes remained.

Final provider-free browser matrix passed 4/4 with zero retries in 10.9 s:
provided 1/3/100 items took 1.8/2.6/1.6 s; retained canonical order/branding
took 3.5 s. Supplied cases verify visible exact prices, keyboard add/payment,
kitchen Ready, exact replay, denied staff action, manager price change, and
restart preserving the changed catalog price and original order price.
There were zero image/external requests or browser/asset errors. The three-item
390/768/1440 checks passed accessibility, overflow and 44 px touch assertions.
Root inspected the final mobile/desktop screenshots together; price/actions
are separated and desktop uses the available width. The single final
Impeccable mechanical check returned `[]`, exit 0. Visual correction is complete;
reuse this evidence unless a later substantive change affects these paths.

### D1.9 task-review corrections and product regression

The required single task review by independent `d18_acceptance` returned
P0/P1/P2 0/3/0. PM assigns the same writer three corrections: omit
canonical-default menu parameters from the ordinary Workbench Product request
(the server still distinguishes explicit canonical DTOs); preserve a complete
provided menu through unrelated data clarifications instead of exempting every
data question; strip the persistence-only Boolean from public composition
review responses. Validated menu/checksum remain public. Root's live test now
asserts the Boolean is absent and leaves stored-marker assertions to server
tests. The controller and its focused test are added to the writer's boundary;
internal rows and transactions retain the field.

The first full product lane failed on an incomplete test-fixture migration:
compiler 57 failed / 592 passed, 39 files, 192.78 s. Every failure was in three
tests still reading the old FixtureInterpreter result. Capabilities passed
403/33 in 28.04 s, adapters 106/11 in 9.64 s and Workbench 562/47 in 31.46 s;
unchanged Graph evidence is retained. The exact response wrapper is frozen.
PM assigns Spark `d1_browser` only
`packages/compiler/test/composition-page-runtime.test.ts`,
`packages/compiler/test/database-target-parity.test.ts`, and
`packages/compiler/test/role-journey-runtime.test.ts` to mechanically unwrap
the authored fixture results and run these three files. All assertions and
scenarios remain. The primary writer acknowledges these disjoint paths and
will not edit them; no shared contract is being revised in this parallel fix.

All three isolated D1.9 factory images built, but no service or provider request
has started. After corrections, rebuild only Workbench/Control Plane; retain
the unchanged compiler-worker image and generated-browser evidence. Run one
final product lane after the demonstrated failures are corrected, and let the
same reviewer recheck only the findings plus the mechanical fixture migration.
Do not treat the first failed lane as passing or claim D1.9 delivered yet.

All three corrections reproduced focused RED and now pass: adapters 75/75,
Workbench 46/46 and Control Plane 60/60. Affected types/lint and adapter/Control
Plane builds pass. The same independent reviewer returned scoped P0/P1/P2
0/0/0. Spark's seven fixture destructures passed the three affected compiler
files, 76/76, without changing their scenarios or assertions.

The final product lane succeeds (exit 0): 2,385 tests, including fresh compiler
649/39 in 218.80 s, adapters 110/11 in 5.62 s and Workbench 562/47 in 27.43 s;
unchanged capabilities 403/33 and Graph 661/21 evidence is reused from cache.
Affected Workbench/Control Plane images rebuilt successfully. The isolated
`factory-t9-consumer-d19-20260909` stack reports both health endpoints 200.
Running source hashes match 11 Control Plane, 16 Workbench and six worker
paths. Provider configuration exists only on the two server interpretation
boundaries; fixtures are off and the worker uses the accepted preview profile.

Independent Terra QA `d19_qa` has no substantive finding after focused fresh
capabilities 19/19, Control Plane 60/60 and compiler menu 18/18 runs. Its final
disposition remains pending the actual-provider outcomes and runtime cleanup.

The first live three-item request returned 200 with the exact authored name,
menu and cents and zero questions. It compiled successfully but the browser
harness stopped before verification: it compared PostgreSQL JSON objects by
serialized key order. A safe in-memory check proves structural equality true
and serialized equality false. The cleanup helper then masked this assertion
by parsing an empty successful no-preview response as JSON. Root corrects only
these two harness defects: structural comparison and empty-response handling.
The first failed 24.3 s test remains recorded; it is not an accepted first-run
delivery. No product correction or image rebuild is required.

The separate first live GBP case passed in 33.7 s (33.264 s to the outcome):
one data question and zero lifecycle mutations. It will not be repeated.
One justified corrected three-item run and the distinct missing-price case are
now running with zero test retries. Raw provider content remains unrecorded.

The corrected three-item run passed in 38.9 s: zero business questions and
technical handoffs, 25.577 s to the verified ready local app, and 26.367 s to
the customer-visible fulfilled order. Exact menu/name/cents, persisted checksum,
public marker omission, Published seed/scenario equivalence, immutable
compilation linkage, both catalogs, local icons and the USD 23.75 order all
passed. The first distinct missing-price case passed in 25.6 s: one data
question after 25.123 s and zero lifecycle mutations. This pair passed 2/2 in
1.1 minutes with zero retries; retain the previous first-attempt harness failure.

The generated preview was stopped by its exact ID. The preview-resource
verifier exited 0. The exact D1.9 factory stack was removed with its volumes;
follow-up inspection found zero project containers, networks or volumes and
port 15179 closed. No cloud action occurred. All production paths remain frozen
for the one required independent release judgment after final QA acceptance.

Independent Terra QA is clean. The final Sol release review found one P1 in
the complete-menu preservation guard: only provided menus were locked; a
canonical-default menu could silently become invented supplied dishes during
an unrelated clarification. Root now owns only the adapter implementation and
its menu-result test for this correction; the previous writer is complete.
Two focused RED cases reproduce the defect for integration and data questions
(2 failed / 10 passed). Extend the existing complete-parameter checksum guard
to every non-null prior menu. Null incomplete menus remain fillable. This is
the existing accepted preservation contract, not a new editing capability.
Run affected adapter checks and the same reviewer's scoped finding recheck;
retain unaffected browser/runtime/QA evidence and avoid another full audit.

The correction is one guard condition (`prior businessParameters != null`).
Final full adapters pass 112/11 in 4.35 s, including the two new cases and
retained supplied-menu/null-menu tests; types/lint/build and diff checks pass.
The prior 2,385-test lane is reused with these affected checks, not described
as a fresh final-source whole run. Actual D1.9 live cases all used initial
requests without a prior interpretation, so their executed branch is unchanged.
Generated runtime and UI are also unchanged. Retain those completed actual
results and cleanup; no new Docker build or paid retry is justified for the
transport-only follow-up guard. The same reviewer checks only this finding.

### D1.9 PM acceptance and delivery boundary

Sol's scoped recheck is clean: the canonical/provided non-null prior lock is
correct, invented items are rejected, unchanged canonical menus pass and null
missing menus remain fillable. No P0/P1/P2 remains. PM accepts D1.9 after the
completed task review, independent Terra QA and independent Sol judgment.
Root is the sole controller and may create one bounded English commit over
the 52 owned changed/new paths, with delivered parent `f9d32e08`, then push
`codex/consumer-delivery-roadmap` and verify the exact remote tip. No main
integration, tag, repository release or cloud deployment is authorized here.

D1.9 delivers initial 1..100-item USD menu binding with zero extra questions
for complete supported input, local icon presentation and a working generated
order/merchant loop. It does not claim multi-currency, menu CRUD, ten-case
reliability or hosted maturity. D1.10 is next: preserve user effort through
failure/recovery, execute the frozen cases with separated evidence types, then
move product investment toward H1 and D2. The long-task goal remains active.

D1.9 delivered as `1c525c5e70d995c8d9c672631b80cc6c81ec5413`; push succeeded
and `git ls-remote` matched local HEAD exactly. The delivery tree was clean.

### D1.10 recovery browser slice — active

The existing plan and O06–O09 definitions authorize this provider-free slice.
Freeze public/Graph/runtime/provider contracts. Reuse the existing consumer
fixture and browser configuration; no new framework or UI asset is introduced.
PM assigns a bounded Spark worker only
`apps/workbench/test/consumer-generation-fixture.ts` and
`apps/workbench/e2e/consumer-recovery.pw.ts` to exercise real page behavior
with authored intercepted responses. Root owns PM evidence, Git and any
subsequently demonstrated production correction. No other writer is active.
The worker must not edit production, relax assertions, start Docker, call a
provider or commit. Report failures for root's focused diagnosis. Use one
scoped review after this in-contract slice; retain D1.9 evidence.

Root separately owns `e2e/consumer-restaurant.spec.ts` for the real benchmark
harness. Before any call, freeze four independent authored request scenarios:
coarse Restaurant ordering (O01, omitted-content O03, customer denial O05 and
post-order restart O10), detailed supplied-menu ordering (O02, existing D1.9
test), unavailable live payment (O04, existing selection test), and ambiguous
orders followed by one Restaurant scope answer (O06). Count four request
scenarios, not seven independent generations; O06 has an initial and one
explicit clarification interpretation. The three deterministic fault cases
O07/O08/O09 have a separate denominator. No previous D1.9 pass is relabeled as
a newly executed benchmark result. Freeze zero questions for the supported
coarse/detailed requests and exactly one material scope decision for O04/O06.

Root also owns the one-line page-close addition in
`e2e/restaurant-definition-selection.spec.ts`: close the live question page
before Playwright failure context can persist generated question text. The
same cleanup applies to the revised consumer benchmark. Diagnostic output
contains only fixed case IDs, counts, codes and timings. No real call has run
for D1.10 yet.

The bounded Spark worker made no edits or test runs and reported no blocker
after the controller requested a handoff. To avoid idle delivery time, root
takes over its two fixture/browser paths. The worker has stopped with no
background processes. No new product authority or test contract is introduced.

Root's eight new provider-free browser cases passed in 57.0 s; the five
existing consumer cases passed in 19.7 s. The verification failure fixture was
strengthened to carry a valid reviewable Draft Diff and failed evidence step;
its no-auto-approval browser case passed again in 12.7 s. Workbench types and
changed-file formatting/diff checks pass. Independent scoped Spark review is
clean after preserving case-specific screenshot names and explicit sequential
`mode: default`; unlike serial groups, a failed case does not skip the next.

The first real benchmark batch completed with 3/4 passing request scenarios,
zero retries, in 4.7 minutes. Coarse O01/O03/O05/O10 reached verified ready in
25.483 s with zero questions/handoffs but failed the original-address restart
assertion. O06 asked one data scope question, accepted the one authored answer,
and reached verified ready in 121.579 s / kitchen Ready in 124.211 s, with no
technical handoff. O04 produced one integration question in 19.858 s and zero
delivery mutations (24.3 s test). O02 supplied-menu generation reached ready
in 26.437 s / order Ready in 27.207 s (39.8 s test). Preserve the failed coarse
scenario in the first-result denominator; do not report a 10/10 combined rate.

Provider-free diagnosis reused the failed scenario's immutable compilation
`cmtsx28na000dp44t464q7oga`, without another interpretation. Docker restart
changed the generated web binding from port 32804 to 32805 while the stored
preview URL stayed unchanged. A second provider-free order/restart probe
confirmed the complete order and exact USD price survive at the new port.
The failure is the local address contract, not demonstrated data loss.

This is an operability trigger. Stop production changes and dispatch Tech Lead
for proposed ADR-0046: a bounded, reversible way for same-container local
preview restart to keep its selected public web/API ports. Preserve loopback
binding, immutable artifacts, existing environment/token allowlists, cleanup,
timeouts and fail-closed handling. No package/provider/cloud/security expansion.
Root owns the pending acceptance harness and PM/Git; Tech Lead may write only
the proposed ADR. An exact separate standing review is required before a
runtime writer can implement. Completed interpretation/recovery evidence stays
valid and must not be repeatedly rerun.

Root owns new `e2e/restaurant-preview-restart.spec.ts` as the focused
provider-free correction acceptance: reuse an already verified immutable
compilation, place/pay/prepare an order, restart the exact derived web/API
containers, assert both original URLs, complete order equality and visible
Ready state, then stop the exact preview. Its actual RED failed in 28.0 s:
both public URLs changed; provider calls were zero. This is the correction
loop for O10, not a fresh real-generation sample or an erased first failure.

### D1.10 ADR-0046 acceptance and runtime assignment

PM records founder standing acceptance (2026-09-01 policy) of exact ADR-0046
SHA-256 `29f36f2c7f63857f8364bcd2cb841de3640b8f80bec9a000e6bde8d101b45a92`.
Separate qualified Sol reviewer `d110_port_standing_review` returned P0/P1/P2
0/0/0 and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`. The reviewer was neither
Tech Lead nor an implementation writer. Recommendation KEEP is bounded and
reversible; it changes no package, Graph/API/data, generated artifact or
external authority. The proposal remains immutable; this ledger is acceptance.

PM assigns existing strongest runtime writer `d19_menu_implementation` only
`apps/compiler-worker/src/preview-port-reservation.ts`,
`apps/compiler-worker/src/preview-runner.ts`,
`apps/compiler-worker/test/preview-port-reservation.test.ts`, and
`apps/compiler-worker/test/preview-runner.test.ts`. Root retains all E2E,
fixture, PM and Git paths. No parallel shared-contract writer is authorized.
Begin focused RED/GREEN, then worker tests/types/lint/build. No provider calls,
Docker operations or Git writes by the runtime writer. Root executes existing
immutable-compilation acceptance only after the implementation is frozen and
reviewed. Reuse valid D1.9 package evidence under delivery-policy rather than
rerunning unrelated repository gates; the standing reviewer explicitly
confirmed this interpretation of VER-008. Main's separate baseline remains red.

The runtime writer froze all four assigned paths after a focused runner RED
(6 failed / 44 passed, 1.99 s) and full worker GREEN (261/261, 19 files,
8.91 s). Typecheck, lint and build passed. The controller verified the reported
four SHA-256 values and retained the exact local manifest. Real-socket cases
include immediate acquisition abort and destruction of accepted connections;
runner coverage includes duplicate rejection, cancellation and fixed-port
contention. Root is building only the worker image; interpretation and generated
artifacts remain unchanged.

Fresh reviewer dispatch reached the agent-thread limit. PM assigns available
independent strongest reviewer `d12_interpretation` (not this runtime or E2E
writer) the bounded task review over the four runtime paths plus root's new
restart test and ignored real bind-race probe. Prior clean Spark review of the
four recovery/benchmark paths is reused. No new general audit is authorized.

The independent bounded task review returned clean P0/P1/P2 0/0/0, including
the four frozen runtime paths and both root acceptance harnesses. PM dispatches
independent Terra `d19_qa` for affected worker regression only. Root rebuilt and
recreated only the isolated D1.10 worker; both changed source and emitted JS
hashes matched the running container (4/4). CP and Workbench are retained from
the completed first benchmark; no new interpretation is required. Root's
provider-free restart acceptance is running against the same original immutable
Compilation. Real bind-race and exact cleanup acceptance follow serially.

### D1.10 corrected runtime acceptance and independent QA

Provider-free restart GREEN: `e2e/restaurant-preview-restart.spec.ts` passed
1/1 in 29.3 s (28.3 s test), zero retries, using the original failed scenario's
immutable Compilation. Both original public URLs were unchanged after restarting
the same web/API containers. The full fulfilled order, exact USD total, merchant
record and customer-visible Ready state survived. No interpretation/provider
call ran. This corrects O10 functionality but does not erase its first failure.

The separately reviewed real bind-race probe ran the actual worker adapter and
Docker Compose against the same immutable artifact manifest. A competing
loopback listener claimed the chosen web port immediately before Compose up.
The operation failed with `preview_compose_up_failed`, no ready result and
`cleanupComplete: true`. Exact project containers/networks/volumes and preview
directory were absent; the unused API port was bindable. The unrelated listener
and existing factory PostgreSQL Compose sentinel retained their identities and
liveness. The probe then closed its own listener. This was provider-free.

Cleanup was verified before deleting the isolated acceptance environment:
PreviewRun stopped, both original public listeners absent, zero preview
directories and `verify-no-preview-resources.mjs` exit 0. Root then ran the exact
D1.10 Compose project `down --volumes`; containers/networks/volumes are 0/0/0,
and ports 5174/15180/13020/15440/16380 have no listeners. Other worktrees and
Compose projects were not removed.

Independent Terra QA `d19_qa` returned CLEAN with no P0/P1. Its fresh affected
worker run passed 89/89 in four files, 2.17 s; typecheck, lint and diff checks
passed. QA reviewed and accepted root's serialized actual runtime/cleanup
evidence without another Docker run. One final bounded independent Sol judgment
is assigned to `d19_release`; no full-project audit, provider retry or main
integration is part of this task.

D1.10 evidence remains separated: 8 new deterministic recovery browser cases
plus 5 existing consumer cases; 4 first-result real request scenarios, of which
2/3 supported scenarios completed all checks and 1/1 unsupported scenario was
handled honestly; a separate corrected provider-free restart pass and bind-race
pass. No combined 10/10 first-result reliability rate is claimed. Local same-
container restart does not establish hosted, host/daemon restart or recreation
durability.

### D1.10 final review correction — pre-Docker directory cleanup

Sol final review found one confirmed P1: acquisition/release failure occurs
after immutable artifacts are materialized, but the pre-Docker catch did not
remove the derived preview directory. Ordinary queue failure reporting does not
invoke stop; fixture-finally cleanup masked this leak in existing tests. PM
keeps D1.10 pending and assigns the same four-path runtime writer a focused fix.
Remove only the owned materialized directory on non-cancelled reservation
failure, retain concurrent-stop cancellation ownership, and report cleanupComplete
only when listener closure and directory removal are both proven. Unknown
listener-close state remains false even when the directory was removed.

Add actual failing assertions before fixture teardown for acquire/release,
removal failure and unrelated-source preservation. No shared API, dependency,
generated artifact or new decision is required. Reuse successful restart and
bind-race runtime evidence because this correction changes only the previously
unexercised pre-Docker failure branch; rerun affected worker tests and the same
reviewer's single finding recheck. No new whole audit or paid call is warranted.

The same Sol reviewer could not be resumed: both follow-up and message tools
returned the agent-thread limit. To avoid a workflow-only delivery block, PM
assigns available independent Sol `d12_definition_decision` the single finding
recheck. Its earlier authorship was ADR-0045, not the current ADR-0046 or this
implementation; it owns no D1.10 runtime/E2E changes. This is a read-only Sol
acceptance judgment, not another ADR or a whole-branch audit. The already clean
scope outside the confirmed P1 remains accepted evidence.

The P1 correction reproduced both directory-absence failures (2/2 RED,
0.787 s), then four cleanup-status/removal-fault failures (4/4 RED, 0.893 s).
Focused GREEN is 73/73 in 1.93 s; final worker regression is 265/265 in 19
files, 7.03 s. Typecheck/lint/build all passed. The helper's internal error
records only proven listener cleanup; the runner removes the exact derived
directory and combines both facts. Generic errors, listener-close uncertainty
and forced directory-removal failure remain cleanupComplete false. Tests assert
source/unrelated directory preservation and zero Docker before fixture cleanup.
The controller verified all four final file hashes and retained a separate
final freeze manifest. The earlier image/runtime acceptance remains explicitly
pre-P1-fix evidence of unchanged successful paths, reused with the final
failure-path checks; no fresh final-source Docker run is claimed.

The scoped Sol recheck found a cancellation race in that correction: Stop can
arrive while the new asynchronous directory removal is pending, wait for Start,
then incorrectly fail verification of the already removed Compose file. PM
keeps the same writer and four-path scope. Add a controlled removal barrier RED
and an internal active-start cleanup outcome so waiting Stop succeeds only for
proven closed listeners plus removed exact directory. Distinguish normal Stop
ownership from failed/uncertain pre-Docker cleanup; uncertainty cannot fall
through to Compose down and be falsely reported as complete. Public contracts
and the previously tested successful restart/bind-contention paths stay frozen.

The cancellation interleaving reproduced 3/3 focused failures in 1.06 s using
an asynchronous removal barrier. Final worker GREEN is 271/271 across 19 files
in 7.00 s, including 79 focused reservation/runner cases; types/lint/build pass.
The internal active-start outcome now distinguishes normal Stop ownership,
proven pre-Docker cleanup and uncertain cleanup. Waiting Stop returns success
only for proven closure and removal; uncertainty fails without Docker. Start
rechecks cancellation after removal. Tests cover all four listener-closure /
directory-removal combinations and typed/unknown uncertain cancellation.
Controller verified the final four hashes. Only the same Sol race/P1 recheck
remains; successful runtime evidence is reused with these fresh failure checks.

### D1.10 PM acceptance and controller delivery

Independent Sol `d12_definition_decision` returned final PASS on the exact
four final hashes: no remaining finding in the assigned P1 cleanup/cancellation
scope. The original directory-leak finding and its cancellation interleaving
are both closed; earlier clean task-review, independent QA and the unaffected
scope of Sol review remain valid. Final affected evidence is 271 worker tests /
19 files, including 79 focused reservation/runner cases, plus types/lint/build.
The actual provider-free restart and bind-race successes are retained with an
explicit unchanged-success-path boundary. Exact environment cleanup is proven.
No P0/P1/P2 remains in this accepted bounded slice.

PM accepts D1.10 and authorizes root as sole Git writer to commit exactly the
13 owned changed/new paths with delivered parent
`1c525c5e70d995c8d9c672631b80cc6c81ec5413`, then push
`codex/consumer-delivery-roadmap` and verify exact local/remote tip equality.
The enclosing bounded commit is the D1.10 delivery checkpoint. No main merge,
repository release, tag, cloud action or hosted maturity is authorized or
claimed. The current long-task objective is fulfilled once branch delivery is
verified: unsupported-question reduction, initial name/menu binding and frozen
first-family reliability validation have been delivered with measured limits.

Product investment now moves to the plan's H1 hosted delivery decision and D2
intake/approval journey, reusing existing profiles and runtime behavior. Keep
user questions, developer rescue and useful first results ahead of extra
Restaurant polish or catalog-count expansion. The first real sample remains
2/3 supported successes plus unsupported 1/1; corrected runtime acceptance does
not rewrite that measurement. Ordinary-user trials, cold starts, cross-device
hosting and the separate main Candidate baseline remain open.

## H1 / D2 continuation — 2026-09-09

The founder explicitly requested continued roadmap iteration driven by a new
long-task goal. D1.10 delivery is verified at
`2c2815c0c21723c563e83f56c054491300681608`; the iteration worktree started clean.
The new goal covers a concrete hosted-delivery decision/external prerequisites
and the next authorized intake/approval consumer slice, with useful role-journey
evidence and bounded branch delivery. It does not grant cloud provisioning or
claim hosted acceptance from a local result.

PM dispatches Tech Lead `h1_hosted_decision` to read the current technology and
threat-model authorities and own only proposed
`docs/adr/adr-0047-invited-hosted-delivery.md` (after checking vacancy). No code,
acceptance, provider/resource/credential mutation or Git write is assigned.
Spark explorer `d2_approval_explore` has read-only ownership of a bounded reuse
and test map for existing Expense Approval and the common consumer journey.
Root owns this ledger, plan/status reconciliation and D2 scope definition.
There is no production write wave yet. The already approved roadmap is the
product design authority; ordinary reversible implementation choices do not
require another founder confirmation. Any new shared/security/runtime contract
still needs its exact accepted technology decision.

Spark exploration was unavailable because the model quota is exhausted through
September 15; it made no changes. Root takes over bounded exploration without
waiting for a quota reset. Existing Expense Approval uses the generic validated
blueprint/composer and core approval/workflow/identity assets; the consumer hook
is Restaurant-only and generic apply currently returns no fresh release target.

PM dispatches Tech Lead `d2_consumer_decision`, owning only proposed
`docs/adr/adr-0048-approval-consumer-orchestration.md`, to freeze the smallest
Workbench-only extension: semantic approval eligibility over the existing
validated blueprint/standard plan, exact fresh V1 Draft binding, reused local
release orchestration and family-appropriate business copy. No production
writes are authorized until the exact decision is accepted. The private generic
identity/runtime limits must be inspected rather than silently treating local
demo roles as hosted authentication. H1 and D2 decision documents have disjoint
ownership; all production and shared-contract integration remain serialized.

The Tech Lead finalized proposed ADR-0048 (KEEP), SHA-256
`dab46a99706a22d24c10f3c1403ae867a801780f4133d61e24f1994332a4d38b`.
PM dispatches independent read-only Sol `d2_decision_review` for the existing
standing founder gate. The actual generic catalog does not select
`core.approvals`; the proposal reuses its current workflow/policy locks and
structural submit/decision semantics instead of adding an unnecessary asset.
The detailed D2.1 execution plan is
`docs/superpowers/plans/2026-09-09-approval-consumer-delivery.md`. The existing
consumer/controller/Home baseline passed 33 tests in 3 files, 28.09 s, before
implementation. Existing controller tests emit React act warnings; updating
their race coverage may correct those test boundaries without a separate gate.

Root confirmed the generic generated runtime still displays raw record JSON,
uses text inputs for all field types and clears forms without success feedback.
These are concrete D2.2 usability gaps, not evidence of missing UI dependencies.
D2.1 acceptance removes technical handoffs and proves the demo role journey;
it does not close presentation, authenticated privacy or hosted readiness.

H1 Tech Lead completed proposed ADR-0047, SHA-256
`b3c558f2a98a580d226dea8dcb7d9486810b3798959a836c8378ea9f778c98c2`,
recommending an invited single-app hosted experiment. It is not accepted:
provider/account/region/hostname/invite/spend and deployment authority remain
external founder choices. The optional infrastructure preference question has
no reply yet; the proposal assumes no existing infrastructure, not approval.

While D2.1 proceeds, PM assigns Tech Lead `h1_hosted_decision` a new disjoint
proposal-only task: `docs/adr/adr-0049-generated-approval-usability.md`, after
checking vacancy. It must reuse approved UI patterns and existing generated
blocks to address the confirmed raw-JSON, typed-input, current-state action and
feedback gaps. No compiler or other production write is authorized by this
dispatch; it keeps the next functional correction ready without widening the
current implementation wave.

### ADR-0048 accepted; D2.1 implementation assigned

Independent read-only Sol `d2_decision_review` verified exact ADR-0048 SHA-256
`dab46a99706a22d24c10f3c1403ae867a801780f4133d61e24f1994332a4d38b`,
reported P0/P1/P2 0/0/0 and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`.
It confirmed all six decision-gate requirements and the canonical Expense
fixture against actual current standard locks/bindings. PM records founder
acceptance under the September 1 standing policy in `docs/tech-governance.md`.
This accepts the bounded reversible proposal, not an implementation or any
external action.

PM authorizes strongest-model `d21_lifecycle` as sole production writer for
ADR-0048 MIG-002's eight Workbench paths. The initial worker dispatch failed
before work because its default Spark quota was exhausted; it made no edits.
The new strongest-model assignment follows AGENTS' lifecycle requirement.
Root owns MIG-003's four fixture/browser/E2E paths and this plan/ledger/status.
The local family interface is frozen as in ADR-0048 PRO-013; root fixtures
consume it without altering production. Browser execution and runtime smoke
are serialized after source freeze. No shared/backend/compiler/identity wave
is authorized. Use focused RED/GREEN, affected package checks and one
independent in-contract review; a discovered boundary change stops this scope.

Root's provider-free browser RED reproduced the same missing handoff: the
new approval fixture stopped after interpretation/review/plan, without choice,
apply or Draft open. It uses the real complete Expense interpretation and
standard composition, not Restaurant metadata relabeled as approval. The
four new browser cases cover automatic V1 delivery, a missing reviewer read
grant, manual Page Studio retention and a newer Draft revision refusal.

The actual business harness `e2e/consumer-approval.spec.ts` uses deterministic
interpretation only, with real composition, Publish, Compilation, verification
and generated services. It is frozen to two synthetic requests, both decision
outcomes, denied requester approval and requester-visible persisted results.
Root owns temporary Compose project `factory-t9-consumer-d21-20260909` with
loopback PostgreSQL 15440, Redis 16380, Control Plane 13020 and Workbench 15180.
The ignored D2 plan workspace holds its exact override. PostgreSQL/Redis are
started; unchanged Control Plane/worker sources are being rebuilt for this
acceptance. No cloud action or model-provider call has occurred.

D2.1 focused implementation GREEN is 57 tests in 4 files (8.95 s), with
typecheck (7.02 s), owned-path formatting and whitespace checks passing.
Additional focused RED/GREEN closed an obsolete scheduled initial bootstrap
retry and a manual-save regression: only automatic apply retains the explicit
consumer release target; a manual save continues to select the latest remote
Draft revision. The final controller SHA-256 is
`44ca34986fd86d0073e06d5ff28807392510780228b000a8385e5f6dbd2608a7`.
Root's ignored `d21-final-source-freeze.json` binds all 12 code/test paths.

The 17 provider-free browser cases passed in 41.9 s: 4 new approval, 5 existing
Restaurant and 8 recovery cases. Their unchanged automatic/manual entry paths
are retained with fresh focused evidence for the subsequent manual-save-only
correction. Full Workbench regression then passed 579 tests in 47 files,
17.05 s. Existing shell-test act/DNS warnings remain; no unrelated warning
cleanup wave is assigned. Root is rebuilding the final Workbench image after the
manual-save correction before actual runtime acceptance.

Independent Sol `d21_review` owns one read-only in-contract review of the 12
frozen paths. It has the exact accepted ADR, plan, focused and package evidence;
runtime acceptance is still pending and cannot be inferred from the mocks.

The first actual D2.1 attempt compiled successfully but verification failed
with `runtime.preview_artifact_failed`. Root's isolated test override had
incorrectly carried forward the Restaurant-only acceptance profile, whose
admission requires kitchen/cashier services absent from a generic approval
bundle. The failed verification is retained on immutable compilation
`cmtu417s6000do14tg49xvkqp`. No preview resources started. Root removed the
test-only profile setting and verified that its environment key is absent in
the recreated worker; production runner and compiler are unchanged. The test
worker was stopped after the terminal failure because its original ready wait
would continue until timeout. The harness now fails promptly on terminal paused
delivery; the interrupted first result is not represented as a pass. A fresh
provider-free replay under the correct default profile is in progress.

The independent review found one P1: Graph import did not invalidate the
consumer request/target, so an import and automatic apply could overwrite each
other or leave release on an older Draft. PM assigns `d21_lifecycle` the scoped
controller/test correction with focused late-apply/import, active-target/import
and late-import supersession cases. No other code-level P1/P2 was found. This
is the same in-contract review/fix cycle, not a new architecture gate.

Tech Lead completed proposed D2.2 ADR-0049 and revised it to reuse the already
accepted hash-checked Lucide icons, with no new dependency or source copy.
Current proposed hash is
`ca30adb1281cc948fb79427a460086a76d84825d33f48663721b073ff8ae331e`.
It remains unaccepted pending actual D2.1 presentation evidence and the existing
standing independent decision gate. No compiler writer is assigned yet.

D2.1 scoped import P1 is corrected. The final controller/test SHA-256 values
are `da1554928bee274ca6aad7ce990abcf17f537214d7e25945987e2a5e80b6abd5`
and `9aafc537bd0ec694207abba7ac184a792bca61d7fe29c08f06a882fe5f472b13`.
Nine focused RED cases reproduced pending/late import hazards, then controller
24/24 and affected 67/67 in four files passed (9.43 s). The final type-only test
correction passed controller 24/24 again and typecheck (5.97 s). Independent
`d21_review` rechecked the exact two hashes and found no remaining code finding.
Final Workbench production build exited zero, including Next compilation,
static generation, lint and types. Prior 17-browser and 579-package evidence
is reused for unchanged paths; the runtime Docker image predates only the
import correction, which the runtime's automatic Describe entry does not use.

The second actual-runtime attempt exposed a test fixture identity collision
with the preserved failed application. The harness now rebinds each fixture to
a fresh requirement ID and matching blueprint checksum. The third attempt
passed real compilation, all ten generated verification steps and preview
startup, then stalled on the test's exact `Role` label selector. A separate
read-only Playwright probe reproduced that selector timeout; the existing
`generated-expense` harness uses the non-exact label. Root aligned this harness
and capped normal browser actions at 30 seconds. The known worker was stopped,
and its exact preview stop API removed the temporary container set. All three
unsuccessful attempts remain separate; none is a business pass. The fourth
unique-application replay runs with zero automatic retries.

ADR-0049's final proposed hash is
`b3d8fc88d5308c0441039db641a008e0c7c97d8c4651a8f1594ebad2bdcbf142`.
It clarifies valid unchecked booleans, approval-only `Requests and approvals`
and `Demo role` copy, and safe status-only failures for record loads as well
as mutations. Independent `d2_decision_review` may assess the proposal now;
standing acceptance remains conditional on successful D2.1 actual business
and rough-presentation evidence. No compiler implementation is authorized yet.

D2.1 actual fourth browser run fails at request creation after successful
single Publish/Compile/Verify/Preview (178,747 ms to the failed business step).
Its finally cleanup removed the exact preview. Root reopened that same immutable
compilation `cmtu4qdcd004lo14te4ak8c77` only for bounded diagnosis, not another
interpretation or compilation. A four-case real API matrix proves the cause:
calendar-only date strings fail with the existing 403 ISO date error regardless
of numeric or string amount; UTC-midnight ISO dates succeed (201) with both
amount representations. The generated form passes a calendar-only string to
the existing Prisma DateTime field without conversion. This is a product P1.

A distinct API-only diagnostic journey then created two synthetic requests,
submitted both, denied requester approval (403), approved/rejected as manager,
and read both final states as requester. This is backend role/workflow evidence,
not successful UI delivery. Root inspected synthetic baseline form and result
screens at 390/768/1440 px: raw JSON records, text-only date/enum controls and no
icons reproduce the D2.2 gaps. No horizontal overflow was found. Screens are
local evidence in `docs/acceptance/evidence/consumer-approval`.

The sole independent D2.1 review closes the import finding but retains the real
creation P1; D2.1 is not accepted for business delivery and is not committed as
passing work. PM prioritizes the already planned D2.2 correction. Tech Lead is
revising the same proposed ADR-0049 to explicitly serialize valid calendar dates
to UTC midnight ISO and replace its impossible prerequisite of an already
working form with the reproduced UI failure plus distinct successful API role
journey. Final implementation acceptance still requires the complete unassisted
UI business journey. No Graph, API, server status, identity or database change
is proposed. The single independent decision reviewer will recheck only those
changed proposal clauses before the compiler writer starts.

### D2.2 standing decision acceptance and serialized implementation

Independent non-author/non-writer Sol `d2_decision_review` verified revised
ADR-0049 SHA-256
`9f56c6aced1f46b935e10d0031cc15084ede423a2c89ecd2dc9653f3028fdca5`,
reused its clean six-item decision review, and rechecked the changed date,
prerequisite and evidence clauses with P0/P1 0/0 and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. PM records founder acceptance under
the September 1 standing policy in `docs/tech-governance.md`. This accepts the
bounded reversible client correction; it does not accept its implementation,
UI business journey, or any external action.

PM assigns fresh strongest-model `d22_compiler` as sole writer of exactly
`packages/compiler/src/index.ts`,
`packages/compiler/test/composition-page-runtime.test.ts`, and
`e2e/generated-expense.spec.ts`. Root owns the later serialized update to
`e2e/consumer-approval.spec.ts`, temporary runtime/evidence, plan/ledger/status
and Git. No other compiler, Graph/API, capability, package, database, Compose,
identity or helper path may change. The existing consumer paths remain frozen.
The accepted ADR is the frozen shared local contract; no parallel compiler
writer is authorized. Spark is still unavailable, so the compiler emission
and byte-preservation task uses the strongest assigned model. Focused TDD,
relevant package checks and one independent in-contract review apply; do not
create an unrelated whole-product or repository-release audit wave.

D2.2 implementation is frozen after 4 initial behavior RED cases and a scoped
SSR RED/GREEN correction for sentence-case field labels and a duplicate Refresh
icon. Focused GREEN is 33/33 (19 composition-page-runtime, 9 Restaurant V3,
5 customer icons), with strict emitted Expense/Appointment checks, compiler
typecheck/build, owned formatting, diff check and five retained notices passing.
The final compiler source hash is
`88c1f664de6d7fc8a28ec2e5d77c57fa96f3201af6323108cc0b966006faa6a5`.
Test and emitted-browser hashes are
`8ca9c528710725740036ac4b3164fb66d9596bb268dfd988d8d76fbb84ab7f6d`
and `897b8614edb6e3137e05fd40cd1b4d45982c9bfece2007ef82d32c650bec6c3f`.

Ordered JSON([path, content]) bundle SHA-256 remains unchanged before/after:
Appointment `b4fc337106c8f005766922c3455cc9c514274f0fb317be38d514b4875c7623ba`;
hand-built non-approval
`7166ed888c49123210dd2e91f2eead02f16203d27cc6c3db9d4e86e5ae35e9e6`;
Restaurant V3
`4f04d9026038e4bf86bc052e8075e9f15a0ee332ff6eb0a53371db0c556aace3`.

Root updated the existing actual consumer harness after focused checks to use
labelled fields/status, native typed form input, ISO request assertions,
state-valid actions, visible decorative icons, persisted approved/rejected
results and required axe/overflow checks. The standalone emitted Expense
fixture reuses the authored hand-built profile with one required existing Graph
date field and valid synthetic seed dates before normal Draft/Publish. This
bounded fixture addition is not a shared Graph contract change.

The previous worker image build was cancelled before image export when the
scoped icon/casing correction was identified; no runtime consumed it. Root is
building the final source and running one full compiler package regression.
Independent `d21_review` reuses its clean D2.1 review and reviews only the four
D2.2 paths under the same proportionate in-contract cycle. Actual emitted and
consumer browser acceptance remain pending. No model-provider call or external
provisioning has occurred.

Final compiler package regression passed 656 tests in 39 files (131.88 s).
Final worker image build exited zero; its config digest is
`sha256:6aac3089cdffc1aaa35ff31f6a2139953a7006a311e6a726e192bc1fe8e38003`
and manifest-list digest is
`sha256:f1b697ab366b3322d1531eed9dab84c141f716d3e2971a470ab7d3321db4d82c`.
After recreation, the in-container compiler source matches the frozen
`88c1f664de6d7fc8a28ec2e5d77c57fa96f3201af6323108cc0b966006faa6a5`.
The standalone emitted runtime now starts through the real immutable lifecycle.
This is not yet a browser pass. Workbench/Control Plane remain on their existing
validated paths; no unrelated image or package wave is required.

The first emitted browser run found a test-only selector collision with Next's
route announcer; scoping product feedback/controls to `main.generated-app`
corrected it without changing the runtime. The second run completed both real
UI creations with typed UTC dates, submission, denied requester approval,
manager approve/reject, persisted requester results, safe failure recovery and
empty state, then failed its final keyboard-focus assertion. It is not recorded
as an overall pass.

A read-only 16-Tab probe reproduced the remaining focus issue: Chromium's date
picker subcontrol leaves its host input active but not `:focus-visible`, losing
the outer outline. Inspected mobile screenshots also place the role icon above
its label because the inherited header label is a grid. PM assigns the same
compiler owner two approval-only CSS corrections: retain date/datetime focus
within the native composite control, and align the existing role icon beside
its label. Keep the keyboard assertion. No generated immutable file is edited.
The independent reviewer had found no other code issue and will recheck only
these final deltas. Existing 656 compiler tests and business assertions remain
valid for unchanged behavior; affected checks and the fresh final UI runs will
cover the CSS correction. Root stops the exact emitted preview before replay.

### D2.2 final generated runtime verification

The focused native-date focus and role-label alignment correction is frozen at
compiler source `2db225252578c585442383a3ca1d02e2c8e1272a1d76f874ea6f8e42cc7d3f17`,
compiler test `ffde2a8d5c7c9a1ed3755e380976c2f539c5bcefa7e3f81205c3f8b3cb4b0693`,
and emitted browser test
`c0b5b3bdc63556bd459e5ed1b3508fe644b2e7dff159f241846c6e728f0907ff`.
The added focus/layout regression was RED, then 34 affected tests passed;
compiler types/build, emitted strict typechecks and formatting also passed.
The previous 656-test result remains valid for unchanged behavior, and all
three legacy bundle digests above remain unchanged. The existing independent
reviewer rechecked this delta with no P0/P1/P2 finding.

The final worker image config is
`sha256:719b9ca0410d471c655e3f5c847d2ca2530b85945a232e52494d70f716a00616`,
manifest list
`sha256:eeb02d0d430a7525be0540a80352c47303dcc82f5bdb9e279667d27914b3679e`.
After recreation, its compiler source matched the final hash above. A fresh
published hand-built Expense fixture compiled as
`cmtu6dz1m008lo14t6pru4wfw`; preview
`preview-6c53ea25-87ae-4810-94dd-0f93fd69f88a` reached ready.
`pnpm exec playwright test e2e/generated-expense.spec.ts --workers=1 --retries=0`
passed 1/1, zero retries (3.0 s test, 4.2 s runner). Both UI-created requests,
UTC date conversion, success/retained failure/pending/empty feedback, duplicate
submit prevention, unauthorized decision denial, approve/reject persistence,
44px mobile controls, keyboard focus and same-row role icon passed. The exact
preview was stopped through the API; labeled containers (including stopped),
networks and volumes are all zero. Final emitted mobile form/list screenshots
replace the interim CSS-failure images and contain synthetic data only.

Root freezes separate consumer interpretation lanes in the existing harness:
default fixture interpretation through real composition/runtime, and explicit
`FACTORY_APPROVAL_REAL_ACCEPTANCE=1` for a real provider with at most one
consolidated clarification and no automatic retry. The latter requires a fresh
isolated database and safe provider-present/fixture-off/test-off preflight.
Provider output and authored input are not logged; metrics, screenshot names
and outcomes distinguish the lanes. Neither lane authorizes cloud provisioning.
The mandatory ADR-0049 consumer run continues using the deterministic lane.

### D2.1/D2.2 mandatory consumer acceptance: passed locally

Final consumer harness SHA-256 is
`4830214859d3fe47505865a435f56267b80cddf0b074ded5e49f576e0ace32c1`.
With explicit isolated Factory project, loopback URLs and fixture interpretation,
`pnpm exec playwright test e2e/consumer-approval.spec.ts --workers=1 --retries=0`
passed 1/1 without retries (3.2 min runner). Compilation
`cmtu6g41a00ano14t7nbx8epr` and its ten-step verification succeeded; preview
`preview-494646ed-d50a-45cb-8af0-4197230b8b14` reached ready.
One Describe action automatically applied the standard composition and performed
exactly one Publish, Compile, Verify and Preview. Measurements: 0 business
questions, 0 technical handoffs, 1 fixture interpretation call, 170538 ms to
ready and 174406 ms to the complete business/presentation assertions. These
numbers describe the prepared local environment, not a cold-start benchmark.

Two typed requests were created and submitted through the actual generated UI;
a manager approved one and rejected one. Requester reload retained both results,
and a requester decision returned 403. The UI showed declared business fields,
calendar dates, valid actions and readable status/icon pairs instead of raw JSON.
At 390/768/1440 px, overflow was false and axe violation IDs were empty. Inspected
`docs/acceptance/evidence/consumer-approval/d22-results-*.png` contains only
declared synthetic test data. The page remains a straightforward generated
business UI; this is not a claim of final visual polish or private identity.
The test stopped the exact preview and verified zero labeled containers,
networks and volumes. All six recorded preview runs were stopped; Factory stack
was stopped before the separate provider lane, preserving its evidence volumes
until final teardown.

Independent nonwriter `d21_review` closes the same in-contract review with
P0/P1/P2 0/0/0 after final source, relevant retained tests, both required actual
browser passes, responsive/accessibility results and exact preview cleanup.
This is not a repository-release or hosted-delivery verdict. PM accepts the
bounded local D2.1/D2.2 behavior for iteration-branch delivery; provider outcome
is a separately reported product metric. Earlier failed attempts remain above.

### Separate real-provider first outcome: not yet one-step delivery

The fresh isolated project `factory-t9-consumer-d22-real-20260909` reused the
same images with a new empty database/artifact volume. Safe preflight required
provider configured, fixture mode false and test mode false. One real
interpretation HTTP request returned 200; no mock route was installed and no
acceptance-harness retry or clarification request was sent. The existing adapter
may perform bounded internal repair; its provider transport count was not
measured and is not inferred from the single browser HTTP request. The test recognized manual
plan choices, then failed to find the automatic Approval delivery surface after
60 seconds. Total elapsed time was 109924 ms, interpretation calls 1,
questions 0, lifecycle operations 0. Database inspection confirmed 0 Compilations
and 0 PreviewRuns. No generated business journey started in this lane.

This is 0/1 real-provider first-result success, not a provider outage and not a
successful consumer delivery. Existing safe diagnostics do not identify the
specific semantic eligibility mismatch; no raw response was retained to invent
that explanation. Do not loosen permission checks or silently choose an
ineligible plan to make the test green. D2.3 first priority is safe structural
eligibility diagnostics and provider-free reproduction, followed by deterministic
supported-definition binding where the accepted contracts permit it. A new
interpretation or shared contract requires one consolidated technology decision.
Do not repeat unchanged real requests, hide the manual handoff, or report this
result in the deterministic runtime pass count. The emitted runtime and D2.1
supported-plan slice remain accepted locally, while full D2 and the product's
ordinary-user first-result objective remain open.

No screenshot, trace or raw provider input/output was captured for this failed
entry. The provider lane is an explicitly gated measurement rather than a
mandatory default CI test. The mandatory fixed-interpretation real-runtime
acceptance remains the passed source-delivery gate under ADR-0049. H1 remains
proposed; no hosted resource, account, invite or deployment was created.

### D2 bounded delivery closeout

Both owned Factory projects were removed with their isolated volumes after safe
outcomes were recorded. An exact-label check across the two Factory projects
and six generated preview projects found zero containers (including stopped),
networks and volumes. No unrelated Docker resources were removed. Root's final
15 code/test paths pass Prettier, five third-party notices pass, and the complete
diff passes whitespace checks. The three ADR documents retain their recorded
hashes; only the local D2 decisions are accepted. The roadmap and scorecard
preserve the separate real-provider failure and H1 external prerequisites.

Root authorizes one bounded iteration-branch commit for the reviewed D2.1/D2.2
local behavior, associated reproducible tests, synthetic before/after evidence
and the governing D2/H1 decision/plan records. This does not mark all D2, the
consumer first-result goal, main integration or a repository release complete.
Remote tip equality is required immediately after the normal branch push. The
long task remains active for the demonstrated real-input handoff gap and its
next focused correction, with no unchanged provider rerun authorized here.

### D2.3 continuation: supported-definition intake gap

Previous goal turn is progress: commit `6527ece91b0a6d09e89fa68a724c6682ee6d82b2`
was pushed with exact remote equality and the two local runtime lanes passed;
the separately measured real-provider first request exposed a manual-plan handoff.
Current branch and clean worktree were revalidated before continuation. No live
job remains; both owned Factory stacks were fully removed.

Read-only source inspection establishes that only Restaurant may return the
private `definition-selection` result; every approval request currently produces
an unconstrained full ProductBlueprint, while consumer-family requires exact
supported approval semantics. This explains a structural reliability gap, not
the exact semantic mismatch in the prior unretained provider response.

PM dispatches Tech Lead `h1_hosted_decision` for one proposed ADR-0050, owning
only `docs/adr/adr-0050-approval-definition-selection.md`. Investigate canonical
Expense reuse and a bounded private definition selection for supported local
approval; preserve material questions, real identity/privacy limits, standard
composition and immutable lifecycle. Compare a prompt-only correction with
deterministic definition binding and keep unsupported requests explicit. Read
both technology/security authorities. No implementation or provider action is
authorized by that proposal. Root independently investigates current predicates
and authored provider-free variants, and owns eventual safe acceptance diagnostics,
plan/ledger/status. The exact implementation manifest is not frozen yet.

Provider-free investigation executed
`node --experimental-strip-types .superpowers/sdd/2026-09-09-approval-consumer-delivery/d23-predicate-probe.mjs`
against current built Graph/capability/adapter packages and source consumer
selector. Six authored variants reported fixed case IDs and booleans only:
canonical and explicit workflow type are valid, compatible and auto-eligible;
no queue page, an extra result list and missing reviewer read are valid and
compatible but not auto-eligible; split duplicate actor permissions are rejected
by Blueprint validation. No provider call occurred. The first three valid
mismatches justify canonical supported-definition projection without weakening
permissions or unique workflow/page requirements. The exact prior real response
is still unknown. The D2 plan now records A01-A10 with separate interpretation,
runtime and real-provider evidence expectations; ten authored rows are not ten
accepted journeys.

PM freezes a separate root-owned, test-only diagnostic correction while the
Tech Lead finalizes the private producer decision. Paths:
`e2e/helpers/approval-intake-diagnostics.ts`,
`apps/workbench/test/approval-intake-diagnostics.test.ts`, and
`e2e/consumer-approval.spec.ts`. Reuse the existing authoritative interpretation
parser in memory. Return only an allowlisted product-type enum, fixed boolean
facts and bounded counts of roles/entities/pages/workflows/questions; never
return provider-authored names, keys, labels, content or parser errors. On
invalid input return only `{ schemaValid: false }`. Capture this safe summary
before the real/fixed consumer run closes its page, and report manual-choice
presence separately in the failure record. No product predicate, request,
provider schema, API, logging service or persistence behavior changes. This is
an ordinary existing acceptance-harness correction under the accepted scope;
focused privacy/variant tests and the same independent review suffice. It does
not authorize implementing the proposed private definition-selection branch.

Root's test-only diagnostic correction has two focused behavior RED failures,
then 3/3 GREEN in
`pnpm --filter @factory/workbench exec vitest run test/approval-intake-diagnostics.test.ts`.
It distinguishes the complete shape from missing queue/reviewer read, excludes
a synthetic business-content canary, and reduces malformed/accessor input to a
single fixed flag. The consumer harness uses only the safe facts from transient
successful interpretation responses and records manual-choice presence before
closing. Browser test discovery passes. No provider call, container startup,
consumer behavior or provider contract change occurred. This evidence prevents
another uninformative live result; it is not the functional intake correction.

Baseline requirement-interpreter suite freshly passed 65/65 in 5.49 s. Current
FixtureRequirementInterpreter Expense envelope SHA-256 is
`6bb06e85fa6a33e3eef1b8ba39770dc6bfb55cc9f882c52fd46a9211f73587d8`;
its requirement checksum is
`sha256:4e62ff6314a43affe62a823ad0d7be7db53dc43336582dab9c480f692e5cd37d`.
This independently captured baseline can verify any proposed shared-definition
extraction leaves the existing fixture unchanged.

Tech Lead completed proposed ADR-0050 at
`63c3a567f2999a78c5ef45742e3cfea28aa0d8c407706924d6e8c2846870c443`;
read-only nonauthor/nonwriter `d21_review` now evaluates standing acceptance.
No private schema or production interpretation change has started. Root's
three-path diagnostic correction also passes Workbench typecheck. Root prepared
new isolated project `factory-t9-consumer-d23-20260909` with the unchanged
accepted Control Plane and compiler images and empty Factory volumes. Only
PostgreSQL, Redis, Control Plane and compiler-worker are running; Workbench is
not started and no provider request or lifecycle mutation has occurred. The
same old images are reused deliberately; only the future affected Workbench
image needs a rebuild. Exact cleanup remains root's responsibility.

### ADR-0050 standing acceptance and D2.3 implementation ownership

Independent nonauthor/nonwriter `d21_review` first rejected ADR-0050 hash
`63c3a567f2999a78c5ef45742e3cfea28aa0d8c407706924d6e8c2846870c443`
with one P1: only a genuine positive case would not validate that the classifier
retains explicit requester privacy. Tech Lead revised VER-007/ABT-003 to require
a separately authorized first-result, no-harness-retry real A10 privacy probe:
material privacy/identity clarification or safe closed failure, zero lifecycle;
supported-default/automatic lifecycle aborts acceptance. SEC-002 permits only
declared synthetic generated-business screenshots under ADR-0049.

The reviewer rechecked exact revised SHA-256
`149188fba6c0323738969b152df4d64bd8cb97dc12a996e2473e98a9f6a57579`
with P0/P1/P2 0/0/0 and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`.
PM records founder acceptance under the September 1 standing authorization in
`docs/tech-governance.md` before product changes. This grants bounded reversible
implementation, not a provider call, external resource or deployment.

PM assigns fresh strongest-model `d23_definition` as sole product writer of
exactly the four adapter paths in ADR-0050 MIG-002. Root remains sole writer of
the three acceptance paths in MIG-003, plan/ledger/status and Git. No consumer
predicate, public contract, catalog, compiler, security boundary or dependency
path changes. The accepted private schema/canonical projection is frozen for
this wave; any shared-contract change stops parallel work. Root's diagnostics
now additionally expose only the authoritative category enum for material
questions; focused category/privacy tests were RED then 4/4 GREEN.

The independent acceptance-code review identified one bounded contract mismatch:
a temporary `questionCategories` output was outside revised ADR-0050 MIG-003's
exact diagnostic allowlist. Root removed that field instead of expanding the
contract or starting another decision cycle. The privacy harness now checks
visibility/authorization membership only transiently through the authoritative
parser; it logs only accepted fixed counts/flags. The helper's fourth test
requires no category array and no business-content canary. Four tests and
Workbench types pass after the correction; final read-only recheck reports
P0/P1/P2 0/0/0 for these three paths:

- consumer harness: `a1471c95c1dcf34842f3cd2c5caf5c684e241362ffd117f301da5e92a7a8070e`;
- diagnostic helper: `e07a8b88a791c6d60803d5d9b962db7d981173d601cae49684fd6a012ec88f2e`;
- diagnostic test: `2a001a6f035bdc159ca84ac83d7157637281e81c184a2f1332a77434d73d4cdb`.

A10 is a separate explicit real-only environment switch, never a default CI
provider call. It sends one authored request, supplies no follow-up answer,
requires a material visibility/authorization question or a recognized public
closed failure, and asserts zero product creation, lifecycle, plan choices and
delivery UI. A failed-closed outcome is a safety result, not successful semantic
clarification or app generation. The combined review remains open for the
four adapter files and actual runtime evidence. No live request has run in D2.3.

### D2.3 producer source freeze

The product owner froze all four paths after compact A01/A02 RED failures
(`output_invalid`), subsequent 2/2 GREEN and a separate JSON Schema parity
RED/GREEN correction. Final requirement interpretation suite passes 103/103;
full adapters passes 150/150 in 11 files; scoped Workbench consumer/controller
regression passes 36/36 (12 consumer + 24 controller, 18.57 s). Adapter types,
build, owned Prettier and whitespace checks pass. Root's read-only
`git diff --check` also passes. Exact original fixture envelope and requirement
checksum remain unchanged. A01/A02 tests use the actual planner/composer,
unchanged six locks/bindings and Workbench consumer predicate; authored material
selections, mixed/unknown/invalid branches, JSON/Zod parity and bounded follow-up
repair are covered without claiming genuine model classification.

Frozen product SHA-256:

- approval-definition-selection.ts: `48f22c91afbee47f2945c4ab497f02960d01c73edd5e6f93934d2b0685c87e24`;
- fixture-interpreter.ts: `c5340d8c7b1d016b06b4375ad87ef48d1de70cf59ee80957336eb201ceb40983`;
- openai-interpreter.ts: `21d926ceefff75d61fecfc1b40b027c1493a71377c1e1d4d9724a86c9483b5b2`;
- requirement-interpreter.test.ts: `a7fece1272f28817096d10f0835c5ddb5c8bac6ab688b195479934f727288e0c`.

The same independent reviewer now reviews only this producer delta, reusing the
clean three-path acceptance review. Root is building only the Workbench image
from frozen source; CP/compiler remain unchanged. Runtime and genuine-provider
acceptance are pending and no D2.3 provider call has occurred.

### D2.3 isolated execution scope

Workbench build exited zero, including existing prerequisite package builds,
Next production compilation, lint/types and static route generation. Image
config is `sha256:64ef09360056f8a04092e17299b11e11ab7228f1b212bbd3f4364927cf0a9843`;
manifest list is
`sha256:6f3cb51840b24a031438f2f03051ecf2560d28b31a58ebff37a6f525430e813f`.
After startup, both in-container adapter sources match their frozen hashes.
The canonical deterministic consumer/runtime lane is now running with explicit
real/privacy switches off; no provider request is involved.

Root separately freezes the following genuine evaluation under the already
founder-approved roadmap's real-model and business/privacy validation, not from
ADR standing acceptance alone. Start only after the deterministic runtime pass
and independent code verdict. Use the existing local configured provider and
same frozen image, on independent empty Factory volumes. Make exactly one A10
request with the authored requester-owned-record/sign-in condition first, then
one unchanged A02 supported local Expense request. A10 receives no answer and
no harness retry; at most one consolidated positive clarification may be
answered using the existing frozen scope response. Each run has one worker,
zero Playwright retries and no automatic rerun. The current adapter can perform
up to two bounded internal repair rounds per HTTP request with SDK retries off;
actual provider transport counts remain unmeasured. Thus browser HTTP counts
are not reported as provider transport counts.

Abort this acceptance if A10 selects a supported default or starts product
creation/lifecycle; do not continue the positive case or weaken any predicate.
A10 safe closed failure is reported as a safety outcome, never as successful
clarification. A02 must complete the actual typed two-request submit, manager
decision, requester reload and denied-action journey. Separate lane metrics,
only accepted safe facts, synthetic generated screenshots and exact preview /
Factory resource cleanup are required. No cloud account, hosting, real-user
invite, deployment, spend commitment or new provider configuration is authorized.

Exact owner commands (no reruns to gather this record):
`pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`
103/103, 4.66 s;
`pnpm --filter @factory/adapters test` 150/150, 11 files, 4.54 s;
`pnpm --filter @factory/adapters typecheck` exit 0, 3.68 s;
`pnpm --filter @factory/adapters build` exit 0, 2.94 s;
`pnpm --filter @factory/workbench exec vitest run lib/product-journey/use-consumer-generation.test.tsx hooks/use-workbench-controller.test.ts`
36/36, 18.57 s. Durations are Vitest where available and shell for types/build.

D2.3 canonical deterministic interpretation through the actual runtime passed
1/1 without retries in 3.1 minutes. Compilation `cmtu7z9en000dpl4t6a77e84a`
and all ten verification steps succeeded. Preview
`preview-b6e9f2e4-fb28-4cd2-b602-3e1141cc342d` was ready, then stopped with
zero exact-label containers/networks/volumes. Business/presentation evidence:
166718 ms to ready, 170861 ms to complete assertions, 0 questions, 0 technical
handoffs, 2 UI-created/submitted requests, approved/rejected requester results
after reload, requester approval 403; no overflow or axe violations at
390/768/1440 px. Safe intake facts show the complete three-actor/two-entity/
one-workflow shape with one requester, reviewer, form, queue and result list.

After the run, root corrected only the screenshot filename prefix from d22 to
d23 (real lane d23-real) so earlier accepted evidence is not overwritten.
Current screenshots were retained under distinct D2.3 names; D2.2 screenshots
were restored byte-for-byte from HEAD. Final consumer harness SHA-256 is
`5cf8f57b29355ae1d020594c372b3dd4d818c653212327cbc6d372e3db984d0f`.
This output-name correction does not change product or business assertions and
requires no repeated runtime build/test. The next real runs consume it.

### D2.3 first real outcomes and focused investigation

The independently reviewed frozen source passed the deterministic runtime but
did not pass the genuine positive lane. A10 returned HTTP 422 with the fixed
`requirement.output_invalid` code in 13723 ms: one browser interpretation call,
zero questions, product creations or lifecycle actions. This is a safe closed
failure, not successful privacy clarification. The unchanged A02 then returned
the same code in 5043 ms, with one browser call and zero creation/lifecycle.
Playwright used one worker and zero retries in both cases. Database counts prove
zero Compilation and PreviewRun records. D2.3 remains unaccepted; no failing
implementation is committed as delivered.

Read-only investigation distinguishes hypotheses. Transport HTTP 400 would map
to `provider_rejected`, whereas a successful transport with invalid, empty or
incomplete output can exhaust local repair and produce `output_invalid`.
The reviewer found the existing root JSON Schema allows mixed/null result
envelopes that the local exclusive parser rejects. This is reproducible but
not established as the cause of either live result. SDK envelope handling is
another falsifiable cause. No raw response was retained and no unchanged paid
request is being retried to guess the cause.

Root assigns one ignored diagnostic script to the same adapter owner. It must
default to provider-free self-tests, leave production/dist bytes unchanged,
memoize at most one explicitly enabled SDK response transiently for local
adapter replay, and report only fixed metadata and validation-stage facts.
Root will inspect it and freeze execution scope before any instrumented call.
The existing four-path product manifest remains frozen during investigation.

The reviewer withdrew the root-envelope observation as a D2.3 finding: it
predates this slice, whose accepted contract explicitly preserves that shape.
Scoped code review remains P0/P1/P2 0/0/0; real acceptance still fails. A nested
envelope redesign is not authorized as a routine repair.

Root inspected diagnostic SHA-256
`542699b79a277b4cb0d7c65fe9fde9a299519a496ee102872afc7bf008fec35d`
and independently ran its nine synthetic cases successfully. Root authorizes
exactly one instrumented A02 diagnostic SDK request against the same container
configuration under the ongoing approved failure investigation. It receives
the existing authored A02 fixture through stdin, adds no business/lifecycle
operation, and memoizes the first result for provider-free local replay. This
is diagnostic evidence, not another acceptance sample or success-rate retry.
Only fixed status/error enums, bounded text presence/length, and validation
stage/allowlisted issue locations and codes may be reported. No raw input,
response, provider key/message or credentials are retained. No follow-up live
call is authorized by this diagnostic scope.

The single diagnostic established this sample's failure stage: SDK status
`incomplete`, reason `max_output_tokens`, zero text parts and zero output-text
length, with no response error or refusal. JSON/private schema was never
reached. Exactly one SDK request was memoized into three local adapter rounds.
The unchanged transport ignores terminal SDK state and treats empty text as a
repairable interpretation failure. This evidence does not retroactively prove
the response metadata of the two earlier unretained calls, and the actual
provider token usage/effective output limit remain unmeasured.

Root dispatched Tech Lead for one narrow proposed ADR-0051: explicit bounded
output budget and terminal response handling before semantic repair. Current
model, dependencies, schema envelope, canonical definition, public failures,
lifecycle and privacy authority stay unchanged. No implementation starts before
its standing decision. Both D2.3 Factory stacks and the deterministic preview
are removed; exact-label checks show zero containers, networks and volumes for
all three. The ignored diagnostic disappeared with its temporary container.

### ADR-0051 standing acceptance and two-path correction

Tech Lead proposed ADR-0051. The independent non-author/non-writer
`/root/d21_review` identified only missing exact commands/evidence location at
initial hash `906ed417bdfab520cdf25838d81fcb90c8bd9d30c51a96ae137e490fab381fcc`.
The author added those documentation details; no technical contract changed.
The reviewer verified final SHA-256
`2938afe895fbb75ce1c5b26abc4dd060b761196483910e1c11d40d1d3ad24257`,
returned P0/P1/P2 0/0/0 and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`.
Root records founder standing acceptance under the September 1 policy before
implementation. No further founder permission is needed for this bounded fix.

The existing adapter owner is authorized to change only
`packages/adapters/src/requirements/openai-interpreter.ts` and
`packages/adapters/test/requirement-interpreter.test.ts`: focused RED first,
fixed 25000 output cap, no reasoning/model change, terminal SDK metadata guard
with existing safe failures and no semantic retry, completed-invalid repair
and cancellation precedence retained. Other five product/acceptance paths stay
frozen. Root owns documents, build/runtime acceptance and Git. The relevant
adapter checks and one scoped independent review are required; unchanged
Workbench/compiler/canonical runtime evidence remains valid. No provider call
is granted by this acceptance; root will separately freeze corrected execution.

### D2.3 corrected source and genuine execution scope

The owner reproduced 17 focused failures for missing budget and terminal
metadata handling. The first correction exposed a synchronous-caller-abort
race: an already-created transport promise could reject without an observer.
The same-file fix observes that promise while preserving immediate cancellation.
The focused requirement suite now passes 121/121 with zero unhandled errors.
Frozen SHA-256: interpreter
`1416d2a73fbf087b5b5760cea8ed15541c0a9b959354a32ff6fe4fedf0232796`;
test `4012dc269211db63c261c6752525fb43755691ff430f686b184cadbd1b7cbe99`.
Root is building only the corrected Workbench image; independent review and
remaining adapter package checks run against these frozen sources.

Root separately authorizes one corrected A10/A02 genuine evaluation pair under
the existing approved roadmap and the now-demonstrated response-boundary fix.
Start only after successful build, required package checks and clean independent
delta review. Use fresh Factory project `factory-t9-consumer-d23r1-real-20260909`,
the existing local model/key configuration and unchanged accepted CP/compiler
images. Run A10 first, with no answer or harness retry; require the existing
material-privacy clarification or recognized safe failure, zero product creation
and zero lifecycle. Abort acceptance if it silently selects the default.
Then run the unchanged A02 once, with at most the existing one consolidated
local-scope answer, no technical choices, and the full generated UI journey.

Each Playwright lane has one worker and zero retries. Every SDK call has the
same fixed 25000 output cap and zero SDK retries; terminal responses now stop
without semantic repair. Completed-invalid content retains at most two internal
repairs. Browser call counts are still distinct from unmeasured actual SDK
transport counts. No automatic budget escalation, extra unchanged samples,
model switch, provider configuration, cloud action or real-user data is granted.
Retain safe first outcomes, product metrics and exact cleanup evidence.

Final corrected test hash after a formatter-only adjustment is
`171d95ea7640d09e84625ebcc0ad61cc62a463d2eac4683b7018cc19236bd1c5`;
production interpreter remains `1416d2a7...`. The exact ADR commands passed:
121/121 focused (4.45 s), 168/168 full adapters (6.49 s), typecheck (7.11 s),
build (7.37 s), and two-file Prettier. Root independently reran the focused
suite against final hashes: 121/121, no unhandled errors, 4.87 s. The same
independent reviewer verified final hashes and returned P0/P1/P2 0/0/0 for the
two-path budget/terminal/cancellation delta. No code finding remains; the
corrected genuine acceptance pair is still required.

The corrected Workbench image built successfully: config
`sha256:6ff327a2de7d8b9133283aa544dcbdf6df32b77d016da4025b733156394878cc`,
manifest list
`sha256:61c185a133eab2992acda4255f516a3ceb96e875c3a6e9bd12503872598905b6`.
In-container production source hash matches the freeze; provider is configured,
fixture and test modes are off. The separately authorized corrected pair still
does not pass real delivery: A10 returned safe closed HTTP 422 in 5537 ms and
A02 returned HTTP 422 in 2572 ms, both `requirement.output_invalid`, one browser
call, zero product creation or lifecycle. Both database counts remain zero.
No retry ran. Fixed-budget sufficiency is not established and the latest
response metadata is not yet known. Code review remains 0/0/0; actual D2.3
acceptance remains failed.

Root assigns an update to the ignored diagnostic only, matching the corrected
terminal-state guard. Add fixed error-presence and configured-cap-match enums,
retain existing safe stage facts, and record no token usage or raw material.
This does not authorize another provider request until root reviews and freezes
that instrumented diagnostic. No additional production change is authorized.

Root inspected updated diagnostic SHA-256
`258480c34fa11954e3eaa2d404792006ae020a4999fc2b82a8ef86f16bf6d78f`
and independently verified its ten provider-free cases. Root authorizes one
SDK request with the existing authored A02 input on the corrected image, solely
to distinguish SDK metadata rejection, output incompleteness and later parsing.
Returned budget is reduced to 25000/absent/other, error presence to fixed enums;
token usage and raw material remain uninspected/unretained. The first response
is memoized locally; no extra provider repairs or acceptance rerun are granted.

The corrected diagnostic made exactly one SDK/adapter call and returned
`incomplete` / `max_output_tokens`, null error, cap 25000, zero text and no
refusal. It stopped at SDK metadata before JSON parsing. This proves the fixed
cap was reflected in this response and the terminal guard avoids semantic
retries; it does not prove a successful user result or explain why the model
exhausted the cap. No budget increase or model change is authorized.

Root assigns a minimal ignored control-diagnostic mode using the same model,
25000 cap, store/timeout/no-retry policy and a tiny authored Boolean schema.
This can distinguish a provider-wide inability to finish from complexity of
the requirement contract, without changing production instructions or schema.
Only fixed response metadata and a schema-valid Boolean may be reported. Root
will inspect the no-cost test before authorizing exactly one control call.

Root verified control diagnostic SHA-256
`e138dbbd006934a7f52aee0d3455e1cb200c6cc623939bfa7574599c6a90da63`
and independently passed its ten diagnostic cases plus control body/no-raw
checks. Root authorizes exactly one `--control-once` SDK call on the current
container, using its existing model/configuration and the same 25000 cap,
180-second timeout, store false and zero SDK retries. This synthetic Boolean
control is not app-generation acceptance. No further call follows automatically.

The tiny control completed successfully with null error, cap 25000, one text
part and schema-valid Boolean output. This rules out a blanket inability of
the current SDK/model path to complete this simple request. It does not isolate
which aspect of the requirement request caused incompleteness.

The source comparison identifies six new provider-pattern occurrences in the
two Approval disposition branches: title, outcome and material-question text.
These introduce negative lookahead, lookbehind and zero-width-only matching,
unlike the previous simple consuming identifier patterns. Root assigns one
ignored diagnostic contrast that removes only these six pattern properties
from a cloned SDK schema while retaining the exact input/instructions/model/
budget and original authoritative local parser/projector. It makes no product
change and cannot create an application. A no-cost exact-delta test must pass
before root authorizes any single contrast request. The hypothesis is not yet
an established cause. Spark exploration remains unavailable due to its usage
limit; root completed the bounded source inventory.

Root inspected diagnostic SHA-256
`0073a73e26c2a1028221531cb810a93c48d59450f4991746bdb390e0aa855c91`
and its passing exact-six-path, clone-preservation and no-raw self-tests. Root
authorizes exactly one `--approval-pattern-control-once` request using authored
A02 stdin on the existing corrected container. The request changes only those
six provider-schema patterns; local authoritative validation is untouched.
Only existing safe metadata and validation-stage facts are reported, with one
SDK response memoized for local replay, no lifecycle or automatic follow-up.

The exact-six-pattern contrast completed: one SDK/adapter call, completed/null
error, cap 25000, one text part, original provider JSON Schema valid, original
private parser/projection/public result accepted. No raw result was retained.
Only the six pattern properties differed in the sent schema. This supports
removing provider-side complex text patterns as the next bounded correction;
it is one diagnostic observation, not a reliability or business-acceptance
claim. Root dispatched ADR-0052 for that precise change. The authoritative
safe-business-text, trimming/control-character and public checks must remain
unchanged; no unsafe output may become accepted.

### ADR-0052 standing acceptance and precise schema correction

The Tech Lead clarified title-only control/trim rules in the proposal while
retaining permitted multiline outcome/question text. Independent non-author/
non-writer `/root/d21_review` verified final ADR-0052 SHA-256
`4e7aee3ef7ded45df67c6048bc0aef19fa2c2adb173fa76fe8812d704ec406c7`,
reported P0/P1/P2 0/0/0 and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`.
Root records acceptance under the founder's September 1 standing authorization
before production implementation. This amends only ADR-0050's provider-side
text-pattern parity. Local accepted output and security authority are unchanged.

The same adapter owner may change only `openai-interpreter.ts` and the existing
`requirement-interpreter.test.ts` in their recorded directories. Add focused
RED tests first, remove the three source pattern fields (six emitted) and
unused constant, and prove provider-permitted unsafe text still fails local
validation without being returned. Preserve every other schema, canonical
file, prompt, model, budget, terminal/repair rule and public contract. Root
retains all acceptance/docs/runtime/Git ownership. Run exact ADR checks and one
scoped independent review; reuse unchanged business-runtime evidence. No real
call is authorized by this standing decision.

The previous corrected Factory project is fully removed: exact-label container,
network and volume counts are zero. Fresh project
`factory-t9-consumer-d23r2-real-20260910` currently has only unchanged local
CP/compiler/Postgres/Redis services; no Workbench/provider/lifecycle run yet.

### D2.3 final source correction and execution scope

ADR-0052 focused RED showed five expected failures; final focused suite passes
127/127 (4.51 s), full adapters 174/174 (4.78 s), typecheck (4.39 s), build
(4.52 s), and two-file Prettier. Final source SHA-256 is
`32fa9b34987ba819d8f4c8edf39a230f17f2b36e5937a996bd7b8589b7eb1cd9`;
test `eecebb08fab7965f36acd188376476cc19014a7c9630ff9215bf02d639483b7f`.
The local approval schema and fixture hashes remain exact. The same independent
reviewer returned P0/P1/P2 0/0/0 for this two-path delta. Root verified hashes
and is building the final Workbench image; the previous diagnostic script is
retired because it intentionally targets the removed pattern constant.

Root separately authorizes one final corrected A10/A02 real evaluation pair
after successful image build and required checks, using the fresh isolated
`factory-t9-consumer-d23r2-real-20260910` project and current local configuration.
This follows a demonstrated one-variable correction and grants no unchanged
retry, extra sample, new model, reasoning, budget increase or cloud action.
A10 runs first with no answer and must preserve a material privacy question or
fail closed, with zero product/lifecycle. Silent default substitution aborts
acceptance. A02 runs once with at most the existing consolidated scope answer,
zero technical choices and the full two-request approval/rejection/reload/
denial/mobile journey. One worker, zero Playwright retries, existing SDK and
semantic call bounds, safe metrics and exact cleanup remain mandatory. Actual
SDK call counts remain unmeasured in browser lanes and are not inferred from
browser request counts.

Final Workbench build passed with source hash verified inside the container:
config `sha256:8d91e4c47a1cfda2ee2c57dbdebd0e54c17774e0430f9d38c6569f57aab51688`,
manifest list
`sha256:95dd8731b69cbeb3b95114780b45b68c7d71dbec9416bf5eb1b8a80cd6f343e5`.
The final genuine A10 passed with HTTP 200 and a material clarification outcome:
one browser call, three questions in the consolidated response, 20054 ms,
zero product creation and zero lifecycle. The valid interpretation retained
the complete canonical 3-actor/2-entity/1-workflow shape but remained blocked
from automatic delivery by its privacy/identity clarification. No question
text was retained. A02 is running separately; A10 success does not establish
the positive journey or full D2 acceptance.

### D2.3 final local acceptance

The final genuine A02 browser lane passed 1/1 with one worker and zero retries:
167833 ms to ready, 171716 ms to completed business assertions, zero questions,
zero technical handoffs and one browser interpretation request. Two requests
were created and submitted via typed UI controls, one approved and one rejected
by the reviewer, both retained after requester reload. Requester approval was
denied, UTC date submission passed, and the app did not present raw JSON records.
All 390/768/1440 px layouts had no horizontal overflow and no axe violations.
Only authored synthetic business screenshots were retained; root visually
inspected `docs/acceptance/evidence/consumer-approval/d23-real-results-390.png`.

Compilation `cmtuaxov3000do14t028vvkin` and verification
`cmtuaxq2h0026o14t4eb6en48` succeeded. Preview
`preview-095d6848-c034-4796-ade0-b9aec3c3a6f5` was ready, then stopped; exact
preview-label container/network/volume counts are all zero. The final Factory
project was removed with its volumes and its exact-label counts are also zero.
All preceding D2.3 Factory projects were likewise removed as recorded above.

The same independent reviewer `/root/d21_review` returned final P0/P1/P2 0/0/0
and approved D2.3 local acceptance after the full 174-test adapter result,
types/build/formatting, source/image checks, genuine privacy and positive
journeys, responsive/role/persistence checks and cleanup. Root accepts this
bounded slice. No full ten-case, ordinary-user, hosted or repository-release
claim is made. H1 ADR-0047 remains proposed with external prerequisites pending.

The delivery manifest is the seven frozen product/acceptance paths, ADR-0050,
ADR-0051, ADR-0052, this ledger, the D2 plan, product status, and six distinct
D2.3 synthetic result screenshots. Previous D2.2 artifacts remain unchanged.
Root owns the bounded English commit and normal push to
`origin/codex/consumer-delivery-roadmap`, followed by exact remote-tip equality.
No main integration, tag, release, cloud provisioning or deployment is included.

Product scorecard: one supported genuine Expense request reached a usable local
app in under three minutes without questions or technical rescue; one separate
genuine privacy request preserved material decisions. Earlier failed attempts
remain evidence and are not hidden by these passes. Next prioritize coarse-input
coverage, ten-case gaps, mobile reading/navigation effort and cross-device user
validation over catalog size or repeated unchanged audits. IDs and demo roles
remain visible in the generated app; they do not constitute mature real-user
identity, requester-owned privacy or polished mobile task navigation.

### D2.4 visible mobile usability correction — 2026-09-10

The founder rejected the D2.3 mobile result as bare and monotonous. PM treats
this as a product acceptance gap: functional success and axe/layout checks did
not establish a polished ordinary-user experience. Icons and styles loaded;
the generated template's hierarchy, navigation and record density are at fault.
Prioritize the [D2.4 plan](../plans/2026-09-10-approval-mobile-presentation.md)
before broadening the intake matrix. The continuation goal now explicitly
requires an actual generated-app before/after visual result.

Base is `424c9c7c83f0e2f3e2f9ecdd5f2f5adcd1ac9045`, with the iteration branch
clean and pushed before this slice. Root retains acceptance harness, evidence,
plan/status/ledger and Git ownership. `/root/d24_ui_decision` is dispatched as
Tech Lead and owns only proposed ADR-0053. No production implementation is
authorized until its exact independent standing-acceptance verdict is recorded.
Current Graph, API, provider, identity and runtime authorities remain unchanged.
The previous Spark availability failure remains applicable; no reset credit
or extra provider attempt is authorized. Use a bounded implementation fallback.

This ordinary private template refinement uses focused tests, relevant compiler
checks, actual deterministic browser acceptance and one independent task review.
Do not add repeated unchanged QA/release waves or a new icon dependency. The
root-owned local runtime lane will use the existing isolated Compose topology,
synthetic authored data, no model request and exact-label cleanup. No external
deployment, main integration or repository release is included.

### ADR-0053 standing acceptance and D2.4 implementation ownership

Independent non-author/non-writer `/root/d24_review` verified ADR-0053 SHA-256
`9adbf1782020b96513626cbbd1bba3804e353559f2a965edbb18a3c36272fad3`,
reported P0/P1 `0/0` and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`. The initial
proposal's semantic-token ambiguity and duplicate-runtime/preparation wording
were corrected before acceptance. Root records founder acceptance under the
September 1 standing authorization before any production write.

Authorize one fresh compiler implementation owner for exactly
`packages/compiler/src/index.ts` and
`packages/compiler/test/composition-page-runtime.test.ts`. Follow ADR-0053's
frozen private presentation rules and D2.4 plan. Root retains all acceptance,
docs, evidence, runtime and Git paths; preparation already changed only tests
and documents. No parallel shared-contract writers are authorized. Use the
engineer fallback because the prescribed Spark is unavailable. Source freeze,
focused RED/GREEN, compiler checks and one independent task review are required.

Root separately authorizes the one provider-free canonical acceptance lane
after compiler source freeze and package checks. Build the affected compiler
image from the tracked Dockerfile, reuse accepted unchanged Control Plane and
Workbench images, and use fresh exact project
`factory-t9-consumer-d24-20260910` on the existing loopback test ports/topology.
The lane may perform local Publish/Compile/Verify/Preview and the synthetic
two-request UI journey under the approved consumer roadmap. Zero model/provider
calls, one worker, zero retries, four new screenshots and exact resource cleanup
bound this execution. The standing ADR itself grants no runtime or cloud action.

### D2.4 actual visual correction and confirmation scope

`/root/d24_mobile_implementation` completed the two paths. Full compiler checks
passed 659 tests/39 files; subsequent CSS-only corrections passed 22 focused
tests, types/build/formatting, with prior full evidence reused. Independent
`/root/d24_review` reports no remaining P0/P1/P2 in source or root harness.

The first actual canonical lane passed 1/1: 184826 ms to ready, 190426 ms to
business assertions, zero questions/handoffs, two UI requests approved/rejected
and retained after reload, requester approval 403, all route/current markers,
keyboard Details, 44 px targets, and no overflow/axe violations at all three
widths. Mobile Submit bottom was 509 px. Exact preview cleanup passed.

The four-image visual inspection still found clipped mobile role text and an
implicit grid track leaving record content too narrow. The single mechanical
scan of exact emitted UI returned `[]`. First-pass screenshots, emitted UI and
safe log remain in ignored D2.4 `visual-pass-1`; D2.3 evidence is unchanged.

One final CSS batch fixes role sizing, full-width record tracks, empty action
spacing and mobile heading layout. Root adds computed text-fit and content-width
checks. Final source SHA-256 is
`9ad9f27c04bbf8c371275d6b92a79a23718836a162957d595e30fc698731ecbe`;
test `11c49f67946425932793f4bdcdfe0b14eedce1d642aa306669b01fe791ff2398`.
Focused RED then 22/22 GREEN, types/build/formatting and scoped review pass.
The tracked-Dockerfile image passes and its internal source hash matches;
config is `c8b63470e6985667fb787eb66543d3ea6daf2396bf555845aa564b89a569b040`.

Root authorizes one confirmation lane for this demonstrated correction on the
same isolated Factory project, with a new application and fresh generated
database. The earlier preview is stopped, unchanged CP/Workbench are reused,
and the compiler service is recreated from the verified image. Workbench has no
model key configured. Retain one final four-image inspection, exact cleanup and
scoped final verdict before delivery; no further subjective polishing loop.

### D2.4 responsive confirmation repair

The confirmation stopped before request creation at the 768 px text-fit check;
390 px passed with the initial Submit bottom at 461 px. Its immutable compilation
and verification succeeded, and its exact generated preview cleanup passed.
The failed safe log is retained as `confirmation-failure.log` in task scratch.

A bounded native-control diagnostic using emitted theme CSS and current header
rules reproduced the cause: employee text measured 69.28125 px; the desktop
control supplied 68 px after padding and the test's conservative 24 px arrow
reserve. This establishes insufficient sizing margin, not visually proven
desktop clipping. The existing 8 rem mobile minimum supplies 86 px when applied
at wider widths too. Root authorizes this single responsive minimum correction
under the same two-file ownership and unchanged ADR, without weakening the guard.
Reuse prior full-suite evidence; rerun focused checks and scoped delta review.
After the changed compiler image hash is verified, run one corrected provider-free
canonical lane with a fresh generated application. The previous confirmation
produced no images, so the final four-image confirmation remains outstanding.
No additional model, external deployment, or subjective design pass is authorized.

### D2.4 accepted result and controller delivery

Final source `4e21934b49caacf2b98473c68dc2007ebee0c2eb5d90dc443e43cbc6f6d5c08f`,
test `6ef952efbd9b5a10fbbd6790d9b9662c7a70e10fa1c945533bdb28cd640171b5`,
and root harness `a2f9240095cf2724938b9cd5f432be1b615d208e79e4eb65b1279374611f2b46`
are frozen. The final image internal source matches; config
`80d447bee8d706a979ff01c579e98f7c35da34f864688eab86aae50f28adc6ed`.
The base select minimum correction has focused RED then 22/22 GREEN, successful
types/build/formatting and clean scoped re-review. Prior unaffected 659-test
compiler evidence remains valid; no redundant full audit wave was added.

Final canonical browser confirmation passed 1/1 with zero retries. Ready was
171646 ms, business completion 177411 ms, questions/handoffs 0/0. Two UI requests
were approved/rejected and retained after reload; requester approval was denied 403. At all three widths the text-fit/content-width checks, route markers,
keyboard Details, no-overflow and axe checks passed. First valid Submit ends at
461/409/409 px for 390/768/1440 widths. The final four screenshots were inspected
by root and the independent reviewer; mobile role text and record width defects
are corrected. The phone list is 390 x 1016; the old D2.3 image remains unchanged.
This is visual presentation evidence, not a measured reduction in user effort.

Final compilation `cmtudzai3004jmt4t9ywx7rc0` and verification
`cmtudzbpo006cmt4tderzq899` succeeded. Final preview
`preview-ab09680e-ad94-45f2-8ac3-a6de1255d380` stopped. Exact-label queries after
teardown found zero containers/networks/volumes for the Factory project and
all three generated preview projects. Unrelated resources were not removed.

Independent `/root/d24_review` reports P0/P1/P2 `0/0/0` and
`APPROVED_FOR_LOCAL_ACCEPTANCE: yes` for the frozen scope, final images and
cleanup. Root accepts D2.4 and authorizes one bounded English commit and normal
push of `codex/consumer-delivery-roadmap`, followed by remote-tip equality.
Git history identifies that delivery commit. Main/release/cloud are out of scope.

The [acceptance record](../../acceptance/approval-mobile-presentation.md) and
[D2.4 follow-on plan](../plans/2026-09-10-approval-mobile-presentation.md) now
prioritize D2.5 coarse-intent and remaining business coverage, real-phone task
validation, then accepted H1 identity/access/hosting work before expanding the
catalog. Preserve real-model, deterministic-runtime and user-study evidence as
separate measures. Local visual acceptance does not close those product gaps.

### Cross-product acceptance correction — founder instruction, September 10

The founder requires the D2.4 lesson to apply to subsequent product types and
requires complete acceptance criteria. Root owns this documentation-only update:
`docs/delivery-policy.md`, `docs/acceptance/consumer-product-checklist.md`, this
ledger, `docs/project-status.md`, and the September 7 consumer roadmap and
September 10 D2.4 follow-on plan. Define one reusable acceptance matrix and link
it from the existing dispatch/delivery entry points. Preserve type-specific
business semantics; do not turn the approval layout into a universal template.
No runtime, template, dependency, Graph/API or security change is authorized by
this documentation work. Check coverage, links, formatting and the bounded diff;
reuse the completed D2.4 implementation review without a new audit wave.

Root completed the shared eight-dimension checklist and connected it to delivery
policy, the main roadmap, immediate follow-on dispatch and project status. It
requires actual generated visual evidence, family-specific business cases,
explicit pass/fail/deferred/not-applicable outcomes and separate evidence for
real-model, local-runtime and ordinary-user claims. It does not require a new
library, decorative media, another approval stage or unchanged full-suite reruns.

Documentation coverage review, 45 local Markdown links across five entry/checklist
documents, Prettier and diff checks passed. No application behavior changed;
runtime and product tests were not rerun. Root accepts this founder-requested
documentation correction for one bounded commit and normal iteration-branch
push with remote-tip equality. Future family compliance remains to be proven
by each task; the new policy is not retrospective product acceptance.

### Assembly supply expansion — next active goal

The founder now prioritizes multi-type application tasks and a large reusable
definition/material supply for rapid composition. Continue from pushed
`3337f390856c9cea6493890d4749749a9167474f` in the existing isolated worktree.
The active long-task goal covers attributable supply research, a bounded
implemented assembly improvement, complete applicable acceptance and delivery.
Root owns integration, plans, status, acceptance and Git. Independent
`/root/assembly_sources` owns only
`docs/research/2026-09-10-reusable-assembly-supply.md`; `/root/assembly_slice_scope`
performs read-only PM slice selection. No production ownership is assigned yet.

Initial source inspection confirms that runtime code is already deterministically
generated; the model interprets business semantics rather than writing arbitrary
application source. Only Restaurant and Expense currently expose canonical
definition selection. The catalog has 27 current capability entries and the UI
recipes are predominantly Restaurant-specific. An Appointment fixture and
`core.scheduling` metadata do not prove a complete usable booking product.
Select an integrated, reusable supply slice instead of inflating template counts
or claiming unimplemented business behavior. Apply the shared acceptance matrix
and the required technology decision to any new contract or template boundary.

### B1 definition bank — standing acceptance and implementation ownership

Root records standing acceptance of ADR-0054, recommendation `experiment`,
SHA-256 `70caa3f131736491411c7f7c922da770695b901a0b0d98b759aac88a58d2ec22`.
Independent read-only `/root/assembly_slice_scope`, neither proposal author nor
implementation writer, verified that exact hash with P0/P1 `0/0` and
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. This applies the existing founder
standing decision policy; it adds no provider, runtime or cloud authorization.

Serialized implementation owner `/root/d19_menu_implementation` owns exactly
ADR-0054 MIG-001's nine adapter/compiler source and focused test paths. Root
owns MIG-002's Workbench fixture/hook test, new Purchase E2E, plan, ledger,
status and acceptance evidence. Shared contracts are frozen by that ADR.
Writers preserve each other's work. No package export, dependency, Graph/API,
Workbench production or other compiler path changes are authorized.

Start focused RED/GREEN tests and preserve pre-change interpretation and ordered
bundle hashes. Root will authorize one isolated provider-free runtime lane after
source freeze and relevant checks. Use one scoped independent implementation
review and the shared consumer checklist, without another unchanged audit wave.

### B1 source freeze and bounded runtime authorization

The serialized owner freezes the nine paths. Compiler source SHA-256 is
`9b6ca694bf3c5c18a186b57d369adbb0a0dc66184e8f790a6b6222f2dea0759d`;
catalogue `c6ba4b9f04e9303616af6880aa764519f2e3b92611fe3baaf812fc122ae6ffc8`;
provider interpreter `de82747547f98bcea385e2639e0e3f151e21550755372b8e36acd8a5a6e1c420`.
Full adapter tests pass 184/184; subsequent strengthened follow-up tests pass
8/8. Relevant compiler tests pass 38/38 plus emitted Purchase strict TypeScript;
both package builds/types and exact manifest formatting pass. Full compiler
suite is still running and must be reconciled before acceptance. Root's affected
Workbench tests pass 14/14 and types/formatting pass. The negative test harness
was corrected to reflect the real controller's material-question state; no
Workbench production change was required.

Root now authorizes tracked-Dockerfile builds for new Workbench/compiler images
and one provider-free canonical Purchase lane in fresh isolated Compose project
`factory-t9-bank-b1-20260910`. Reuse the unchanged accepted Control Plane image;
keep model keys empty in Workbench and Control Plane. The existing loopback
ports 15180/13020/15440/16380 and host-network worker topology are unchanged.
The ignored task overlay contains no credential. Verify image/source hashes;
then exercise actual composition, Product Publish, immutable Compilation,
Verification and Preview with synthetic data, under the predeclared eight-part
acceptance record. Retain four actual images, safe timing/IDs, and exact-label
Preview/Factory teardown. No model call, external deployment or repository
release is authorized. The existing independent reviewer covers code, evidence
and the final visual batch in one review.

### B1 first runtime result and responsive correction

The final full compiler suite passed 662/662 across 39 files. Both tracked image
builds passed; their internal compiler/interpreter hashes match the freeze.
Image configs are compiler
`4cae9cbbf3fd37b927348d8762648795be9231c7c99afce8684af991d4f7a93f`
and Workbench `6b59aa857d160dcaf739363505f254ad3b7bc0a8ac05b31cc726936d61639c16`.
The existing reviewer found two harness coverage gaps; root added exact six-field
payload and rendered values before/after reload, exact five navigation labels,
and absence of excluded action/link surfaces before runtime. No product change
was needed for those test corrections.

First canonical runtime reached immutable delivery and created/submitted two
requests, then approved/rejected them. Requester decision/audit denial and a
repeated terminal decision returned 403. Initial Submit ended at 570/470/470 px
for 390/768/1440. The lane failed at 161751 ms on the 768 px procurement role
text-fit check; it is not an accepted run. Compilation
`cmtug16h7000dpe4tgwjh28hs`, preview
`preview-5ed3b4a4-0992-4c9e-af22-d6812fac37ec` stopped with zero exact-label
containers/networks/volumes. Safe log and first form image remain in ignored
task `first-pass`; Factory stays isolated for the correction.

Read-only reproduction used actual emitted CSS and SSR with native Chromium.
The 768/1440 selector supplies 90 px after padding and the conservative 24 px
arrow allowance; procurement text measures 91.34 px. This proves insufficient
guard margin, not visually proven clipping. At 390 px flex growth supplies
209 px. A scratch-only 10 rem minimum supplies 118 px at wider widths with
no document overflow and unchanged mobile width. The correction is one CSS
rule only under the existing summary-extension predicate. Because PUR-007
explicitly limited the original compiler delta, Tech Lead is amending that
clause and the prior independent reviewer will check the exact delta/hash.
Reuse the clean unchanged implementation review and regressions; do not start
another general audit or full-suite wave for this sizing correction.

Root records standing acceptance of the amended ADR-0054 exact SHA-256
`1f1c4c63a44a53b884428941bf754a0b93c7cabc0b80fb9fa9ae02363a3814a0`.
The same qualified nonauthor/nonwriter `/root/assembly_slice_scope` reviewed the
delta, reports P0/P1 `0/0` and `APPROVED_FOR_STANDING_ACCEPTANCE: yes`.
The existing serialized engineer now owns the one conditional 10 rem rule and
focused regression in the same two compiler paths. No other implementation
change is authorized. Root extends the existing E2E to check all three roles at
all three widths, and authorizes one confirmation lane after corrected source
and image hash verification. Reuse the isolated Factory/unchanged Workbench and
Control Plane, create a fresh synthetic application/Preview, and retain separate
first-pass failure and confirmation evidence with exact final cleanup.

The one-rule correction is frozen at compiler source
`5202c72ce443901c65f85f49b5ef4515c61ad7502facebe177cc299debc6100e`,
test `0a940c2c9a2d668c1e9bf3082b796fa66794db46c96a185fc49b6742c326f20d`.
Focused RED then 4/4 GREEN preserves four old ordered bundles; compiler
types/build/format pass. Corrected image config
`7fad4fbd13806001b15c3ee0bbbf4067c03bf82d790a188b870a176a52fe98e4`
contains the exact source hash.

Confirmation reached ready in 157624 ms. All three-width manager/procurement
layout and axe checks passed, as did procurement audit API evidence and exact
request values retained after reload. It then failed at 163613 ms because the
root harness incorrectly expected the form in navigation. The unchanged
composer's `NAV_INTENTS` excludes form/detail and adds a list for the secondary
Requester entity; the actual five navigation entries match that accepted rule.
Root corrects only the expected five-label array to dashboard, purchase list,
approval queue, settings, Requester. No product source/image change is needed.
Compilation `cmtuggx0f002gpe4tefu8j6rw`, preview
`preview-c6d1adfd-caba-4dfb-8033-dd9d4639bb87` stopped with zero exact resources.
Keep this separate failed harness log. Under ordinary in-scope correction
authority, root authorizes one fresh canonical lane to complete remaining
navigation, outcome screenshots and recoverable-state assertions with the
corrected expectation. Reuse the successful responsive and product checks.

The next lane reached ready in 166939 ms and completed business, procurement
audit, reload, exact navigation and all nine role/viewport checks with zero axe
violations. It captured all four screenshots, inspected by root: useful Item
headings, prominent Amount/Status, visible Needed by, loaded icons and accessible
Details; mobile is stacked and desktop uses two columns. At 175056 ms the injected
service-error assertion matched both the application alert and Next.js's empty
route announcer. The expected safe application error was present. Root scopes
the two error assertions to `main.generated-app`; this is a harness-only fix.
Product source and images are unchanged. Compilation
`cmtugmf7m004jpe4ten1malo0`, preview
`preview-ff415741-bacc-4d6c-af35-1b1bd48f2f85` stopped with zero exact resources.
Root authorizes a final ordinary provider-free confirmation on the same isolated
Factory to finish the corrected recoverable-state assertions and retain a clean
complete lane. Preserve this separate failure log and the inspected image hashes;
no new code, build, model call or audit stage is needed.

### B1 accepted result and controller delivery

Final E2E source `7d5cb42c18dd32c1066a52c46e6ae14170d42f846685d6a8b491beb4591505ee`
passes 1/1 with zero runner retries. Compilation `cmtugsinf006mpe4t4x5i0ajy`
reached ready in 155561 ms; business and recoverable-state assertions completed
in 163345 ms. Two UI requests were approved/rejected; exact values persisted
after reload; procurement audit API, requester denials and invalid terminal
transition passed. Questions/technical handoffs/in-run rescue were 0/0/0.
All three roles at all three widths passed layout and axe; exact routes,
keyboard Details, native controls and mobile target checks passed. Injected
loading/503/empty states recovered to the three actual stored records.

Final preview `preview-67d39d75-e034-4c1c-b563-aab09efe3bf8` stopped. After Factory
`down -v`, exact-label queries found zero containers (including stopped), networks
and volumes for the Factory and all four Preview projects. All four final PNG
hashes match the batch inspected by root and the independent reviewer. The
[acceptance record](../../acceptance/reusable-definition-bank.md) retains every
dimension, source/image hashes, all three earlier failed attempts and explicit
local-demo, fixed-selection, audit-API and hosting limitations.

Independent `/root/d24_review` reports P0/P1/P2 `0/0/0` and
`APPROVED_FOR_LOCAL_ACCEPTANCE: yes` for the final diff, tests, actual runtime,
visual evidence and cleanup. Root accepts B1 and authorizes one bounded English
commit and normal push on `codex/consumer-delivery-roadmap`, with remote-tip
equality afterward. Git history identifies the controller delivery commit.
No main integration, repository release or cloud deployment is authorized.

The implemented bank now has three canonical selection definitions within two
consumer runtime families. Research adds 12 source candidates, no new dependency
or media admission. B2 reusable material admission, B3 additional complete
business families and B4 retrieval-backed 30/100/hundreds-thousands expansion
are prioritized in the plan. Reuse pinned-library evidence and automated batch
checks; new business outcomes still require their applicable consumer acceptance.
H1 identity/access/hosting and real-model/real-user task validation remain open.

### B2 accepted decision and serialized implementation — 2026-09-11

Root records founder standing acceptance of ADR-0055
`docs/adr/adr-0055-generated-approval-record-finding.md`, exact SHA-256
`fb0fa42d1d88cfad61b19a16b1ecbcd89980ba537f5fa0ebb6a52279702c9c22`.
Qualified read-only reviewer `/root/b2_acceptance_decision` is neither the
proposing Tech Lead nor an implementation writer; independently checked the
exact artifact, reported P0/P1/P2 `0/0/0`, and returned
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`. Root uses the founder's 2026-09-01
standing authorization. The recommendation is KEEP, with no dependency,
public registry, Graph/API, security, provider or topology change.

Contract status: frozen. ADR FND-001 through FND-009 own the exact UI labels,
declared scalar-field matching, ordered Graph flow states, conjunctive filter,
count/no-match/reset, entity/block/role lifetime, surviving mutation feedback,
access and responsive semantics. The B2 plan and predeclared acceptance record
map all eight consumer dimensions. This composition adds no definition, runtime
family or public asset count.

Root authorizes `/root/b2_implementation` as sole production writer of exactly
`packages/compiler/src/index.ts` and
`packages/compiler/test/composition-page-runtime.test.ts`. Root owns disjoint
`e2e/consumer-purchase-request.spec.ts`, B2 plan/acceptance/status/ledger,
`docs/acceptance/evidence/consumer-record-finding/` and ignored local harness
files. Writers are not alone and must preserve each other's edits. No other
production path is authorized; a shared-contract change stops the wave.
Spark exploration was dispatched as required but failed on its account usage
limit; root completed the bounded read-only reuse inspection and the engineer
provides implementation without waiting for a reset.

Begin focused RED/GREEN, affected compiler checks and root's disjoint E2E
preparation. Actual template integration, runtime smoke and Git remain root's
serialized work after source freeze. Reuse unchanged B1 evidence and obtain
one independent implementation/evidence review. No runtime, Product Publish,
provider call, cloud action, release or main integration is authorized here.

### B2 source freeze and bounded runtime authorization

The compiler writer reports focused emitted runtime tests 28/28 and compiler
TypeScript/build/lint exit 0. RED was observed before helper implementation;
a deliberate removal of scope guards then reproduced a stale callback fetch,
and restored guards passed. Non-approval and Restaurant byte snapshots pass.
The full compiler suite now runs once in parallel with the tracked image build.
Root's E2E parses and formats; independent early review corrected refresh
synchronization and error-state control visibility, with no production change.

Frozen compiler SHA-256:
`91a09198dc1a89b90053dcb5633679c52f789fd4c261b384ddbb47572375dc69`;
compiler test `a484bcae3c8aea5a7bd02b0a8ef5e213f20a3cf25378217860c8f1f0b3392eb0`;
root E2E `15548d43e29167874675394e50cd6836415c8c97d2e4f1c3929081601a3b40cd`.
Matching workflow states use the existing unique structural approval flow;
capability-effect flows can share its entity and are not status sources.

Root now authorizes the tracked compiler-worker Dockerfile build, reuse of
unchanged accepted B1 Workbench/Control Plane images, and one isolated
provider-free canonical lane in `factory-t9-record-b2-20260911`. Reuse existing
loopback ports 15180/13020/15440/16380 and topology with Workbench/Control Plane
model keys empty; the ignored task overlay changes only the task image tag.
Verify internal source hashes after startup, then run actual composition,
Product Publish, immutable Compilation, Verification and local Preview with
synthetic Purchase data under the predeclared B2 acceptance record. This is
separate bounded local runtime authority; it grants no external provider,
paid resource, cloud action, hosted deployment, main integration or release.
Root owns exact-label teardown and the one independent final evidence review.

### B2 build and full-regression evidence

The single full compiler run completed: 39 files, 665/665 tests, 252.14 seconds.
A detached tool wrapper initially hid its session result; process and log
monitoring recovered the still-live run. No duplicate suite was launched and
no failure was waived. The scoped source review has no actionable findings;
this is the ordinary independent iteration review, not a repository release
gate, and does not create separate unchanged QA/release waves.

Tracked compiler image build passed. OCI manifest/index:
`cdc2a0dca64e98182650aa22617240655c3e03e997c0e5f855218af3a707f4aa`;
config `f727db3a9b347e67b6883359803447cdf168d9d1ef0c6991429e5fecfe77170a`.
The running worker source exactly matches the frozen compiler hash.
The reused Workbench interpreter matches
`de82747547f98bcea385e2639e0e3f151e21550755372b8e36acd8a5a6e1c420`.
Control Plane and Workbench respond HTTP 200; model-key presence checks are
false for both. The first canonical lane now runs with one worker, zero retries
and the exact B2 E2E source. Its actual business/visual result remains pending.

### B2 first actual lane and scoped harness correction

First immutable Compilation `cmtvre5j2000dnx4tv0j6ff9q` reached ready in
189510 ms. Initial Submit ended at 771/592/592 px for 390/768/1440; manager
layout/axe passed at each width. Two UI-created requests reached the decision
stage. At 224293 ms, the harness timed out locating the status select by exact
label text. This is a failed acceptance attempt, not a clean run.

A minimal Chromium reproduction of the emitted nested native label/select
proved `getByLabel('Status filter', exact)` matches zero because label text
includes option text, whereas the exact accessible combobox name matches one.
The native accessible name and explicit label association are correct. Root
changes only all status-select test locators to exact `combobox` role/name.
No product source, image, semantic label or contract changes. New E2E SHA-256:
`8c2b0143f85c68dc66c323fda0528efb685872bd848ffc57bc2685498828b760`.
Test parsing and format pass. The old log and first form image remain in
ignored task evidence; the independent reviewer received the reproduction.

First Preview `preview-2ba113bf-1d28-4895-8dba-310afa799e09` stopped with zero
exact-label containers, networks and volumes. Root authorizes one fresh
provider-free confirmation on the same isolated Factory and unchanged images,
under ordinary in-scope harness-correction authority. Record its separate
result and final exact Factory/Preview cleanup; no new review wave or build.

### B2 final acceptance and controller delivery

Confirmation E2E passed 1/1, exit 0, no runner retries. Immutable Compilation
`cmtvrlwme002gnx4t04tnf7q7` reached ready in 177061 ms and completed the business,
finder and recovery checks in 187601 ms. Two UI requests were submitted and
approved/rejected under filters; removed cards retained list-level success,
exact values survived reload, audit and both 403 cases passed. Known-record
finding took two input changes; one clear restored all three records. Refresh
retained criteria and a held role-bound read proved the former view cleared.
Loading/503/database-empty/no-match recovered. Confirmation questions,
technical handoffs and in-run rescue were 0/0/0; retain the earlier failed
harness attempt separately. No model or physical-phone/user-study claim.

All three roles at 390/768/1440 plus phone search/no-match pass layout and axe.
Root and independent `/root/b2_review` visually inspected all six exact PNGs
and their hashes in the acceptance record. Final scoped independent findings
are P0/P1/P2 `0/0/0`, covering code, business, responsive/state/visual evidence
and cleanup. This is ordinary iteration review, not a repository-release
verdict; no separate unchanged QA/release wave was added.

Confirmation Preview `preview-8ea96914-6ca3-4203-bbfe-40e800e8300e` stopped.
Factory `down -v` exited 0; fresh exact-label container (including stopped),
network and volume queries returned zero for Factory and both Preview projects.
Root accepts bounded B2 and authorizes one English commit and normal push to
`codex/consumer-delivery-roadmap`, followed by clean-tree and remote-tip checks.
Git history identifies this delivery. No main integration, repository release
or cloud deployment is authorized. The updated plan prioritizes a complete
Task journey and retains identity/hosting, real-model/user validation and
material intake as explicit next gaps. Counts remain three canonical business
definitions and two runtime families; this reusable interaction is not counted
as another template or admitted external asset.

### B2 visual rejection and shared presentation repair — 2026-09-11

The founder rejects the B2 visual outcome. Withdraw that visual acceptance while
preserving valid business/compiler evidence at 82e0d4e7. Root owns repair planning,
design records, acceptance criteria, E2E and Git. Tech Lead owns proposed ADR-0056;
production writes wait for exact standing acceptance. No new review wave is
required for unaffected functionality. Spark quota is still unavailable; use the
existing qualified agents for this bounded repair rather than repeated retries.

Root separately authorizes a provider-free baseline diagnostic using the already
accepted B2 worker and B1 Workbench/Control Plane images in the exact isolated
project factory-t9-ui-repair-20260911, existing loopback ports and topology. The
existing canonical Purchase fixture may exercise local Publish, immutable Compile,
Verify and Preview to inspect real stylesheet/icon delivery and reproduce the
missing workspace layout. Root owns exact-label teardown. This is local diagnostic
runtime authority, not external provider, cloud deployment or repository release.

### Shared workspace exact decision acceptance and implementation ownership

Root records founder standing acceptance of proposed ADR-0056 at SHA-256
47da415120bcc8c8432687d9bd6cbfdfb3620aeec30275ded5ed75594f49ef85.
Independent nonauthor/nonwriter /root/b2_review returned
APPROVED_FOR_STANDING_ACCEPTANCE: yes, P0/P1 0/0, under the 2026-09-01
founder policy. The bounded reversible KEEP decision preserves Golden versions,
Graph/API/security/lifecycle/dependency/public-catalog contracts and historical
Compilations. The proposal is not modified after acceptance. Two mobile records
means their identifying summaries, not expanded Details, within 390 x 900.

PM now authorizes /root/b2_implementation to write exactly
packages/compiler/src/approval-workspace-presentation.ts,
packages/compiler/src/index.ts and
packages/compiler/test/composition-page-runtime.test.ts, following the frozen
ADR and packages/compiler/DESIGN.md. Root owns disjoint E2E, docs/design/evidence
and later serialized integration/Git. The private CSS sentinel is
--approval-workspace-version: 1. No copied upstream source or public asset is
added. Focused RED/GREEN plus relevant checks and one combined independent review
apply. Actual runtime/image authority is separately recorded; no main integration,
repository release, cloud action or external provider call is granted.

### Visual correction ownership transfer

The first two emitted-code SSR drafts fail the declared presentation target:
legacy approval CSS initially overlapped the new grid, and the corrected cascade
still placed the first phone action beyond 650 px. These drafts are not runtime
acceptance evidence. Root now owns approval-workspace-presentation.ts for the
final composition/CSS correction. /root/b2_implementation explicitly froze that
module and retains only index.ts and the focused test; existing exported private
helper signatures are frozen. No contract or business scope changes. Root adds
actual CSS-variable resolution and summary non-overlap checks to the E2E helper.
The full compiler suite and actual repaired runtime wait for this visual fix.

### Repaired presentation freeze and actual dual-definition runtime authority

Root's final private recipe replaces the old approval CSS completely. Emitted
Purchase SSR drafts show first phone Submit at 572.86 px and second summary at
743.83 px; desktop contains all three records within 900 px. These are synthetic
static design diagnostics, not business acceptance. Independent /root/b2_review
finds no P1 visual blocker in the four latest list/form phone/desktop drafts and
explicitly requires actual interaction/state evidence next. The early stale CSS
expectations are being replaced with semantic assertions; generated TypeScript
checks passed. The expected Expense bundle digest is
a8cff23cf9a5f15a71562b5e3c38740766ee87d0517e60999b29ee8000786823.

Root now separately authorizes the tracked compiler-worker image build as
factory-t9-workspace-r1-20260911-compiler-worker:latest and replacement of only
that service in factory-t9-ui-repair-20260911, retaining the accepted cached
Workbench/Control Plane images, loopback ports, key-empty provider-free setup
and unchanged topology. Run the existing Purchase and Expense E2E lanes once,
serially with one worker and zero retries: actual synthetic composition, local
Publish, immutable Compilation, Verification and Preview, core business journey,
asset-negative/geometry checks and actual 390/768/1440 evidence. Root owns exact
Factory/Preview cleanup. The compiler writer runs one full affected suite while
the image builds. No external provider, paid/cloud/production deployment,
repository release or main integration is authorized.

### Shared workspace final acceptance and normal delivery authority

Independent /root/b2_review returns P0/P1/P2 0/0/0 for the bounded ordinary
iteration after source, business, final accessibility, all 13 actual images and
cleanup review. Root accepts the shared repair. Full compiler 665/665, runtime
28/28, compiler typecheck/build/lint, actual Expense/Purchase 2/2 (6.9 minutes),
and final focused workspace/digest 2/2 pass. Final recipe SHA is
5e0ddb969bf074c8758c6ba22deb92a885fa556f0c3beb5ef34329379590f6fe;
final Expense bundle digest is
0d88224154e7f9cbc9fe884b93a217c727ff589f7acf0514c35d8ed755e7b573.

The last source change only adds the native mobile summary's accessible name;
exact final emitted Chromium DOM and Enter open/close checks pass for list/form.
The actual business/image lanes precede it and retain valid pixel/business scope.
The actual worker also captured index.ts before formatter-only wrapping of the
recipe spread; AST structure/order/kinds/identifiers/literals are identical.
The acceptance record and image manifest retain actual and final source hashes
rather than claim byte equality or silently reuse a different runtime.

Factory down with explicit local env-file exited 0. Fresh exact-label checks
show zero containers/networks/volumes for Factory and all three Previews. The
first teardown failed env interpolation before mutation and is recorded, not
counted as successful cleanup. No unrelated runtime was touched.

Root owns final docs/Git and authorizes a bounded English repair commit and
normal push to codex/consumer-delivery-roadmap, followed by remote-tip equality
and clean-tree checks. ADR-0057 is a separate proposed follow-on decision, not
production acceptance. No main, release or cloud authority is granted. Counts
remain three definitions/two families; real-model selection, ordinary-user
success, production identity and managed hosting remain maturity gaps.

### B3 final decision acceptance and serialized implementation authority

The shared repair is committed and normally pushed as
2d15323977df174f2d86780f369c0c303cbc6957; local and remote tips match. Only the
separate B3 proposal/plan existed outside that accepted commit.

ADR-0057's initial eb74ff69 proposal received independent P1 feedback for an
underdefined Task selector. Tech Lead froze exact field/grant/state/page/lock and
binding eligibility plus falsification tests. A final pre-implementation delta
corrected actual composer projection (long-text -> text and dashboard -> stats).
No production write occurred under any earlier proposal hash.

Root records founder standing acceptance of ADR-0057 at exact final SHA-256
8ee8ff2870369bed43d076ab8ff8d63653138d761c9970ace9358dd9d5465017.
Independent nonauthor/nonwriter /root/b2_review returns
APPROVED_FOR_STANDING_ACCEPTANCE: yes, P0/P1/P2 0/0/0, after the final projection
recheck under the 2026-09-01 policy. The proposed EXPERIMENT is bounded/reversible,
retains historical inputs and non-Task bytes, and adds no identity/deployment or
external authority. The ADR is now frozen; further changes require an explicit
amendment rather than silently changing its hash.

PM authorizes one strongest-inherited-model integration writer, /root/b3_integration,
for exactly the production/test manifest in
`docs/superpowers/plans/2026-09-11-canonical-team-task-family.md` and ADR MIG-001.
This writer owns the Graph/provider vocabulary, canonical Task, capability tests,
Workbench structural family/Home copy and compiler private assembly serially.
The prior compiler writer owns no B3 paths. Root exclusively owns disjoint Task
E2E/fixture/presentation checks, evidence/docs, acceptance, runtime authority and
Git. Writers must not revert others' work. No parallel shared-contract writer.

Use focused RED/GREEN, one affected package verification wave, and full task
review -> independent Terra QA -> independent Sol release review -> PM acceptance
-> controller delivery at this shared cross-package boundary. No per-component
reviews. Spark quota remains unavailable; do not retry or redeem usage credits.
Source writing/testing is authorized now; actual local Publish/Compilation/Preview
and image/service execution await a separate root runtime record after source
freeze. No main/repository release/cloud/external provider authority. Counts stay
three definitions/two families until actual Task acceptance.

### Founder correction: visual and product completeness — 2026-09-12

The founder again rejects the visual result at 2d153239: color is too weak and
routine icon actions repeat their meaning in text. Withdraw its product visual
acceptance while retaining correctly scoped runtime/compiler evidence. The
controller's previous internal review is not founder acceptance.

The B3 agent failed at startup with a Spark quota error and wrote no production
files. The prior claim that implementation had started describes dispatch only;
actual code delivery is zero. Do not retry the exhausted model or redeem credits.
Root resumes ownership. Keep the frozen ADR-0057 intact, but hold its production
wave while the next priority is reassessed against the founder's closed-loop
product requirement. Basic state transitions alone do not establish maturity.

Root owns the new design/spec, focused tests, future presentation implementation,
E2E and evidence. Tech Lead owns proposed ADR-0058; existing independent reviewer
owns read-only business-gap analysis, followed by the same scoped review when
needed. No extra product audit stage is created. Production presentation writes
wait for the bounded template amendment. Frozen prior artifacts are not edited.

Priority order: (1) shared expressive, accessible UI and removal of redundant
routine-action text; (2) correct/recover/continue a business record with persisted
results and explicit authority; (3) truthful result/history surfaces; (4) expand
families by reusing a proven complete journey. Real identity/private access,
model/ordinary-user trials and hosted operation remain explicit product gaps.

### ADR-0058 accepted and root presentation implementation authorized

Independent nonauthor/nonwriter /root/b2_review returns
APPROVED_FOR_STANDING_ACCEPTANCE: yes, P0/P1 0/0, for exact ADR-0058 SHA-256
181fc1cefd4e0e7fb23c648fbc6602acda3ace60437b7cd67285e2e01e542860.
The prior proposals were not implementation-authorized; the final decision includes
readable token pairs for hover/focus/current states. Root records acceptance under
the September 1 standing policy and now owns/authorizes the exact ADR-0058 source,
test and E2E manifest. No other production writer is active. Ordinary source
checks and one combined independent implementation/product review apply.

Before production changes, an emitted-DOM focused check failed because Refresh
still had visible text. The safe RED log is in ignored
.superpowers/sdd/2026-09-12-approval-emphasis/icon-red.log. Actual local runtime
will receive its own root authorization after source freeze. Counts and current
business contracts stay unchanged; no cloud, provider, release or main authority.

### ADR-0058 source freeze and local runtime authority

Root's presentation correction passes focused runtime tests 29/29, compiler
build/typecheck/lint, and emitted Chromium light/dark phone/desktop checks with
zero axe violations, icon-only accessible Refresh, and brand/nav hover/focus
color pairs. First phone action remains 572.86 px and second summary 743.83 px.
These static emitted views are not business-runtime acceptance. A failed helper
check caught transition timing; it now waits for computed styles. The isolated
axe harness required an explicit browser context, corrected without product edits.

Root separately authorizes building only compiler-worker as
factory-t9-emphasis-20260912-compiler-worker:latest and running the exact local
project factory-t9-ui-emphasis-20260912 with the prior accepted CP/WB images,
loopback ports 15180/13020/15440/16380, current topology and empty model keys.
Use the two existing Expense/Purchase canonical deterministic lanes once with
one worker and zero retries. Record actual Publish/immutable Compilation/Preview,
core business and presentation checks, exact image/source identities and images.
Root owns exact-label teardown. No external model/provider, paid/cloud action,
main integration or repository release is authorized. Production source remains
frozen during this runtime except a recorded targeted correction.

### ADR-0058 ordinary delivery accepted

Actual Expense/Purchase lanes pass 2/2 with one worker and zero retries. The
29/29 focused suite and compiler build/typecheck/lint pass. All 13 actual images
were visually inspected. The final helper's independent keyboard focus and
computed action/badge checks pass on the same live Purchase Preview; the final
canvas and transition-wait assertions pass on exact emitted light/dark views.
Production recipe/index match the built image exactly. Evidence boundaries,
timings, IDs and source hashes are recorded in
docs/acceptance/evidence/consumer-approval-emphasis/README.md.

Factory and both Preview projects have zero containers/networks/volumes after
exact-label cleanup. The single independent nonwriter /root/b2_review reports
P0/P1/P2 0/0/0. Root accepts the bounded correction and authorizes normal commit
and push to codex/consumer-delivery-roadmap. No founder visual approval or mature
business product is claimed. B3 stays held; next is closure slice A under ADR-0059.

### ADR-0059 accepted; visible decision history implementation

ADR-0058 is delivered at aefe0d813332761d2ffd2a6636d59943a88f0273,
verified equal to origin/codex/consumer-delivery-roadmap. Independent nonauthor
and nonwriter /root/b2_review returns APPROVED_FOR_STANDING_ACCEPTANCE: yes,
P0/P1 0/0 for exact ADR-0059 SHA-256
5baaf7119acec0c4c76820585cbc1dcd20ac83a799f5fbab7b72920623e0f37d.
Root records standing acceptance and authorizes its exact MIG-001 source/test/
E2E/evidence manifest, owned solely by root. No parallel production writer.
Use focused RED/GREEN and one combined independent review. Local runtime requires
a later source-freeze entry. Server/database/nonapproval output remains exact.
History is slice A only; correction/resubmission and uncertain-write recovery
remain pending separate contracts. Tech Lead may prepare proposed ADR-0060 only.

### ADR-0059 source freeze and local runtime authority

Focused RED exposed the missing history panel. Final suite passes 34/34 including
strict emitted typechecking, malformed payloads, readable identities, independent
read/audit eligibility, same-scope deduplication, retry and A/B/A late-response
rejection. Compiler build/typecheck/lint pass. Comparing both emitted definitions
against delivered aefe0d81 changes only page-runtime.tsx and globals.css; all 33
API/database files per definition remain exact, with permanent focused digests.
The independent source review found one P2 Retry target issue, corrected before
freeze; no other production issue is open. Final runtime/visual review is pending.

Root freezes the exact source hashes recorded in the upcoming history acceptance
report and authorizes compiler-worker-only build
factory-t9-history-20260912-compiler-worker:latest. Run the isolated project
factory-t9-history-20260912 with prior accepted CP/WB images, the same Compose
topology, loopback ports 15180/13020/15440/16380 and empty provider keys. Extend
the two existing deterministic Expense/Purchase lanes with actual empty/history,
reload, denied roles, response failure/retry and delayed role-switch reads.
Use one worker, zero automatic retries. Root owns source, evidence and exact-label
teardown. No external model/provider, cloud, release or main integration authority.

### Next priority correction: B and required write recovery together

Root owns the roadmap update in
docs/superpowers/plans/2026-09-12-approval-decision-closure.md. The initial
ADR-0060 proposal at 62704b64c8109478cc1b5708ac0bdf9b5d4415da60b750d84dd267f8219f7c81
was not accepted: independent /root/b2_review reports standing no, P0/P1 0/1,
because it deferred mandatory replay/concurrency protection for new mutations.
Root directs Tech Lead to revise the proposed decision to combine the correction
journey with necessary persisted operation identity, expected-version checks and
atomic replay/conflict behavior. No threat-model exception is requested. This
consolidates a required cross-contract gate around one useful business slice.
ADR-0060 has no implementation authority until its revised exact decision passes
and ADR-0059 is delivered. Current source stays frozen for history acceptance.

### ADR-0059 ordinary delivery accepted

Both actual history/business lanes pass 2/2 in 6.9 minutes, one worker and zero
retries. Expense ready/task times are 166451/179953 ms; Purchase 186269/207308 ms.
Both prove empty-before, two persisted readable decisions after reload, exact
unauthorized UI/API denials, safe 500/keyboard Retry and delayed role-switch
response isolation. Source and built image remain byte-identical throughout.
The 34 focused tests, package checks and byte-preservation evidence are clean.
Root inspected all 21 actual images; independent reviewer inspected eight new
and four changed retained images, retaining exact-byte evidence for the other nine.
Factory and both Preview projects have zero containers/networks/volumes.

Independent /root/b2_review final combined ordinary verdict is P0/P1/P2 0/0/0.
Root accepts the bounded capability and authorizes normal branch commit/push.
docs/acceptance/approval-decision-history.md records hashes, outcomes, identities,
visual evidence, cleanup and the remaining limits. No founder visual approval,
complete correction journey, mature-product count, main/release or cloud claim.
Next is the combined correction/resubmission and safe mutation/recovery contract.

### Delivery identity and next long-running goal

ADR-0059 is delivered at 4b02872b056c41c2888b007d2d67193bee1ff433,
verified equal to origin/codex/consumer-delivery-roadmap. The visual/history goal
is complete. Root has created the next goal for the full local correction,
return-reason, same-record resubmission and safe mutation/recovery journey in both
canonical applications. Its first dependency is exact ADR-0060 standing acceptance;
no pending proposal or the goal itself authorizes production writes.

Root also narrows the Expense E2E title from "complete approval journey" to
"persisted approval decisions and history" to match the actual accepted scope.
Only the title changes after runtime; assertions and production are unchanged.
This ordinary wording correction retains the valid 2/2 runtime and independent
review evidence, with formatting/diff checks only, and needs no extra QA gate.

### ADR-0060 standing acceptance and next-goal ownership

Independent nonauthor/nonwriter /root/b2_review returns
APPROVED_FOR_STANDING_ACCEPTANCE: yes, P0/P1/P2 0/0/0 for exact final ADR-0060
SHA-256 b47961bec46af1757087e3c067ff6c1e35556aae2b07e9de01e0dbc16f122107.
The intermediate 6a81b4a5095d90b759ee1cf2286731b0eb7dd9b5f43c16728ae32511480d26e1
was not accepted because conflict precedence and entity scope were ambiguous.
The final decision resolves both and includes the mandatory replay/version
controls. Root records acceptance under the standing policy before source writes.

Root now owns and authorizes the exact serialized ADR-0060 MIG-001 implementation
manifest for the active next goal; no parallel production writer is assigned.
Start with focused failing contract tests and retain a byte baseline from
4b02872b before modifying canonical definitions or compiler behavior. Use the
existing full cross-package task review, independent QA, release review and root
delivery once for this complete business slice. Runtime/Publish/Compilation
acceptance requires a later exact local authorization and source freeze. No
provider, cloud, main integration or repository release authority is implied.

Production status for ADR-0060 is not started: only its accepted decision and
next-goal ownership are delivered here. Root authorizes a normal documentation/
wording commit and push with the unchanged-test-title correction above.
