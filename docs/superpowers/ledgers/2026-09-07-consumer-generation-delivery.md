# Consumer Generation Delivery Ledger

Updated: 2026-09-08 (Asia/Singapore). PM is the single task-state and
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

| Task                           | Status                                       | Owner / write boundary                                                                                  | Next evidence                                                                          |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| D0 planning and tracking       | Accepted and delivered                       | Root PM: this ledger, plan, reset/research docs, testing guide, status/roadmap/delivery-policy pointers | Reviewed coherent roadmap and safe metric definitions                                  |
| ADR-0037 proposal              | Accepted under founder standing policy       | Tech Lead `regression_scope`; independent reviewer `regression_decision_review`                         | Decision record below; implementation review remains separate                          |
| D0 regression helper           | Accepted and delivered                       | Engineer `regression_implementation`: `scripts/regression.mjs` and `scripts/regression.test.mjs` only   | Focused RED/GREEN, both actual lanes, one independent implementation review            |
| D1 first complete ordering app | Default automation accepted; broader D1 open | Root integration; completed D1 writers and exact path handoffs recorded below                           | Reduce unsupported-request effort; bind business parameters, ten cases and persistence |
| H1 hosted usability            | Planned with D1                              | Tech Lead proposal first; implementation unassigned                                                     | Smallest identity/persistence/hosting decision and external prerequisites              |
| D2 intake/approval             | Planned                                      | Unassigned; reuse existing profiles and capability boundaries                                           | Full submit/review/result journey in the common entry                                  |
| D3 appointment                 | Planned                                      | Unassigned; schedule contract gaps first                                                                | Conflict/cancel/timezone tests and 30-case cross-family evaluation                     |
| D4 ordinary-user validation    | Planned                                      | PM/QA, invited participants                                                                             | 5–8 non-programmer sessions; structured observations                                   |
| D5 catalog expansion           | Conditional                                  | PM + research + implementation, disjoint assignments                                                    | Demand, reusable coverage, first-pass evidence and maintenance cost                    |
| B1 baseline repair / release   | Separate blocked baseline                    | Existing governance; no writer assigned here                                                            | Specific disposition and a repair that passes unchanged concurrency tests              |

Do not write outside an assignment. A shared-contract change stops its parallel
wave for one consolidated decision. Routine fixes inside the frozen scope do
not require another founder approval or a new audit document.

## Product scorecard

D1 was explicitly started by the founder on September 8. See the execution
record below for the current bounded dispatch; D0 remains delivered.

Planning targets apply to the three-family pilot. They are not current
performance claims. Synthetic benchmark and real-user observations are reported
separately. Show numerator/denominator per family as well as pooled results.

| Metric                       | Definition                                                                                                                           | Pilot target                                                                                      | Current value                                                                                           | Evidence owner / next update                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| First-result success         | First generated result completes all declared core role journeys with no user correction or developer repair / all eligible attempts | At least 90%, at least 27/30 benchmark cases; no family below 8/10                                | D1.3 coarse case 1/1 passed; four prior coarse failures retained; no multi-case benchmark rate          | QA; first D1 ten-case run, then D3 30-case run  |
| User questions               | Business questions answered before usable result; count each question even when batched                                              | Median at most 1; at most 3 for ordinary supported requests                                       | D1.3 supported case: 0; distinct unsupported live-payment case: 14 (4 integration), an effort defect    | Workbench owner; D1 structured journey events   |
| Required technical decisions | Framework, schema, provider, manual compilation or similar decisions required of the ordinary user                                   | 0                                                                                                 | 0 in the D1.3 supported automated case                                                                  | UX/QA; D1 journey observation                   |
| Active user effort           | Time typing/choosing/correcting from request start until first successful business task; machine wait reported separately            | Establish baseline in D1; reduce each slice without reducing success                              | Unmeasured                                                                                              | PM/QA; D1 and invited-user sessions             |
| Time to usable app           | Accepted request until ready address plus successful core task; includes clarification, generation, verification and deployment wait | Prepared environment p50 at most 5 min, p95 at most 10 min                                        | D1.3: 21.385 s to verified ready, 40.79 s complete test; prepared local warm caches, no percentile      | Platform/QA; D1 local and H1 hosted separately  |
| Cold-start delivery          | Same clock with first provisioning/install included                                                                                  | Record p50/p95 and failures separately; no hidden exclusion                                       | Unmeasured                                                                                              | Platform; H1                                    |
| Developer rescue             | Attempts requiring staff to edit code/configuration or steer the user / all attempts                                                 | 0 in accepted benchmark; pilot observation reported honestly                                      | Unmeasured                                                                                              | PM/QA; D1/D4                                    |
| Platform repair              | Automatic repair count and elapsed time before usable result                                                                         | Bounded by the accepted repair policy; visible in measurements                                    | Unmeasured                                                                                              | Platform; D1                                    |
| Durable hosted success       | Intended user completes task from another device; state survives supported restart; unauthorized user is denied                      | Every accepted hosted pilot case                                                                  | Unmeasured                                                                                              | Platform/QA; H1                                 |
| Executable coverage          | Distinct definitions with bound recipes and passing end-to-end business acceptance; cases and families counted separately            | 3 families / 30 benchmark cases; then build toward 30 distinct definitions before broad expansion | One standard Restaurant case passed locally; broader D1 and hosted coverage remain open                 | PM; D1/D2/D3/D5                                 |
| Validated demand             | Participants independently completing a useful task they actually need                                                               | 5–8 invited non-programmers; report counts and unmet needs                                        | Unmeasured                                                                                              | PM; D4                                          |
| Feedback cost                | Duration of focused test, smoke, product and existing full checks, separately                                                        | Initial budgets: smoke 30 s, warm product 120 s; optimize after measuring                         | Smoke 17.11 s; latest product 192.93 s / 2,310 tests; focused compiler 17.13 s; generated browser 4.2 s | Integration owner; every meaningful lane change |

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
