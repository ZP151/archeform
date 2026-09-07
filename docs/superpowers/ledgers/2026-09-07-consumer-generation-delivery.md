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
| Current task              | `codex/consumer-delivery-roadmap`, isolated worktree `.worktrees/consumer-delivery`, base `ff9ae7ec`                                                        | Roadmap and additive regression tooling only                                                                     |
| Asset inventory           | 43 source entries, 108 scenarios, 27 current capability assets, 5 profile entries; September 5 inspection                                                   | These are different units, not 108 or 1,000 delivered applications                                               |
| Existing executable reuse | Restaurant ordering customer/merchant recipe and runtime tests; August 11 real-model Expense Approval and Appointment journeys accepted 2/2 in 20.3 minutes | Reuse these implementations; their manual workflows do not measure the new consumer first-pass or hosted targets |
| Product scorecard         | No new 30-case benchmark or ordinary-user pilot run                                                                                                         | Unknown values remain unmeasured, never fabricated as zero or success                                            |

The original workspace has pre-existing Candidate test edits, ADR-0031 and
planning changes. This worktree preserves them. Current remote status was
read again on September 7; recheck the remote tip before future integration.

## Task board and write ownership

| Task                           | Status                                     | Owner / write boundary                                                                                  | Next evidence                                                               |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D0 planning and tracking       | Accepted; controller delivery pending      | Root PM: this ledger, plan, reset/research docs, testing guide, status/roadmap/delivery-policy pointers | Reviewed coherent roadmap and safe metric definitions                       |
| ADR-0037 proposal              | Accepted under founder standing policy     | Tech Lead `regression_scope`; independent reviewer `regression_decision_review`                         | Decision record below; implementation review remains separate               |
| D0 regression helper           | Accepted; controller delivery pending      | Engineer `regression_implementation`: `scripts/regression.mjs` and `scripts/regression.test.mjs` only   | Focused RED/GREEN, both actual lanes, one independent implementation review |
| D1 first complete ordering app | Ready for detailed slice dispatch after D0 | Not assigned; plan's inspected paths are not a parallel write grant                                     | Ten structured cases and failing automatic-completion journey               |
| H1 hosted usability            | Planned with D1                            | Tech Lead proposal first; implementation unassigned                                                     | Smallest identity/persistence/hosting decision and external prerequisites   |
| D2 intake/approval             | Planned                                    | Unassigned; reuse existing profiles and capability boundaries                                           | Full submit/review/result journey in the common entry                       |
| D3 appointment                 | Planned                                    | Unassigned; schedule contract gaps first                                                                | Conflict/cancel/timezone tests and 30-case cross-family evaluation          |
| D4 ordinary-user validation    | Planned                                    | PM/QA, invited participants                                                                             | 5–8 non-programmer sessions; structured observations                        |
| D5 catalog expansion           | Conditional                                | PM + research + implementation, disjoint assignments                                                    | Demand, reusable coverage, first-pass evidence and maintenance cost         |
| B1 baseline repair / release   | Separate blocked baseline                  | Existing governance; no writer assigned here                                                            | Specific disposition and a repair that passes unchanged concurrency tests   |

Do not write outside an assignment. A shared-contract change stops its parallel
wave for one consolidated decision. Routine fixes inside the frozen scope do
not require another founder approval or a new audit document.

## Product scorecard

Planning targets apply to the three-family pilot. They are not current
performance claims. Synthetic benchmark and real-user observations are reported
separately. Show numerator/denominator per family as well as pooled results.

| Metric                       | Definition                                                                                                                           | Pilot target                                                                                      | Current value                                                                   | Evidence owner / next update                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| First-result success         | First generated result completes all declared core role journeys with no user correction or developer repair / all eligible attempts | At least 90%, at least 27/30 benchmark cases; no family below 8/10                                | Unmeasured                                                                      | QA; first D1 ten-case run, then D3 30-case run  |
| User questions               | Business questions answered before usable result; count each question even when batched                                              | Median at most 1; at most 3 for ordinary supported requests                                       | Unmeasured                                                                      | Workbench owner; D1 structured journey events   |
| Required technical decisions | Framework, schema, provider, manual compilation or similar decisions required of the ordinary user                                   | 0                                                                                                 | Unmeasured                                                                      | UX/QA; D1 journey observation                   |
| Active user effort           | Time typing/choosing/correcting from request start until first successful business task; machine wait reported separately            | Establish baseline in D1; reduce each slice without reducing success                              | Unmeasured                                                                      | PM/QA; D1 and invited-user sessions             |
| Time to usable app           | Accepted request until ready address plus successful core task; includes clarification, generation, verification and deployment wait | Prepared environment p50 at most 5 min, p95 at most 10 min                                        | Unmeasured                                                                      | Platform/QA; D1 local and H1 hosted separately  |
| Cold-start delivery          | Same clock with first provisioning/install included                                                                                  | Record p50/p95 and failures separately; no hidden exclusion                                       | Unmeasured                                                                      | Platform; H1                                    |
| Developer rescue             | Attempts requiring staff to edit code/configuration or steer the user / all attempts                                                 | 0 in accepted benchmark; pilot observation reported honestly                                      | Unmeasured                                                                      | PM/QA; D1/D4                                    |
| Platform repair              | Automatic repair count and elapsed time before usable result                                                                         | Bounded by the accepted repair policy; visible in measurements                                    | Unmeasured                                                                      | Platform; D1                                    |
| Durable hosted success       | Intended user completes task from another device; state survives supported restart; unauthorized user is denied                      | Every accepted hosted pilot case                                                                  | Unmeasured                                                                      | Platform/QA; H1                                 |
| Executable coverage          | Distinct definitions with bound recipes and passing end-to-end business acceptance; cases and families counted separately            | 3 families / 30 benchmark cases; then build toward 30 distinct definitions before broad expansion | Not yet measured under this definition                                          | PM; D1/D2/D3/D5                                 |
| Validated demand             | Participants independently completing a useful task they actually need                                                               | 5–8 invited non-programmers; report counts and unmet needs                                        | Unmeasured                                                                      | PM; D4                                          |
| Feedback cost                | Duration of focused test, smoke, product and existing full checks, separately                                                        | Initial budgets: smoke 30 s, warm product 120 s; optimize after measuring                         | Smoke 17.11 s; installed cold product 167.39 s; unchanged cached product 0.99 s | Integration owner; every meaningful lane change |

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
- Independent task review: `/root/regression_decision_review` returned `ACCEPT`, P0/P1/P2 `0/0/0`, for all 11 task paths on September 8. This single ordinary-task review includes specification, code quality and the whole bounded diff. PM accepts D0. Controller commit/push is the remaining delivery action; no main merge or repository release is accepted.
- Main CI and hosted consumer readiness remain separate and unaccepted.
