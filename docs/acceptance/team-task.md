# Team Task Acceptance

Status: accepted for bounded local Team Task delivery. Task review, independent
Terra QA and independent Sol release review passed with P0/P1/P2 = 0/0/0.

## Scope and outcome

Create a shared local task board from the reviewed `team-task-tracking`
definition through automatic immutable Publish, Compilation, verification and
Preview. A Member creates, starts, completes and reopens tasks; a Viewer reads
all tasks. Assignee is display text. This experiment does not provide real
authentication, private assignments, post-creation editing, scheduling,
notifications or hosted deployment. Missing ordinary task correction is the
next product gap; this is not a mature task management claim.

Base: `d28f1fedf4fa0aaefe3e81492cabd857db69d8cb`. ADR-0057 supplies the exact
business contract. Standing-accepted ADR-0063 at SHA-256
`8d5b2042a798b98f130fe7265f6e1bc1389bd67f618cf1f35a9ce0d8b966ea68`
amends its generic mutation assumption to meet current idempotency/concurrency
requirements. Actual attempt 2 and the required independent checks passed; the
controller accepted this bounded slice on 2026-09-13.

The first actual attempt stopped before Publish because Task recognition used a
database row ID where exact Graph bindings use the checksum-bound requirement
ID. The focused regression now models those distinct IDs; all nine binding
checks remain strict. The existing reviewer approved the repair. Attempt 2
rebuilds only Workbench, preserves the first attempt's evidence, and verifies
the source dependencies actually used by each running service. Attempt 2 passed
one complete Playwright lane in 3.5 minutes: local app ready in 177,738 ms and
the business/evidence sequence completed in 192,917 ms. There was one authored
interpretation and zero provider calls. These are prepared-local fixture results,
not measured model accuracy or ordinary-user performance.

The permanent fast check is
`pnpm exec playwright test e2e/consumer-task-ui.spec.ts --workers=1 --retries=0`.
It exercises actual emitted React/CSS with authored transport fixtures. It found
and now covers tablet alignment and retained conflict feedback after row
version changes and filtering, plus three widths, accessibility and negative
stylesheet/icon controls. Its final run passed 1/1 in 7.9 seconds and separately
proves empty-data feedback and restoration using authored transport responses.
This does not replace the real PostgreSQL/browser lane.

The actual lane proves create/start/complete/reopen/complete with persisted
versions, Viewer and invalid-state denials, interrupted Create across an API
restart, interrupted Start, same-key replay, changed-payload rejection and a
concurrent-write result of one success and one conflict. Direct Prisma queries
confirm audit counts and receipt counts both equal `[5, 2, 1]` for the lifecycle,
replay/race and lost-Create records; only digest-form receipt keys are retained.
The immutable compilation check and actual graph-derived verifier pass.

Sixteen actual PNGs cover home, phone/desktop forms, default seed-tolerant
density, two authored result rows at three widths, pending/error/retry/finding,
filtered feedback, Viewer and final results. The default mobile view must show
two identities and summaries; filtering the authored cohort does not waive it.
Three exact Factory/Preview projects have zero containers, networks or volumes
after cleanup, including stopped containers.

## Predeclared acceptance matrix

| Dimension                 | Case and expected result                                                                                                                                                        | Current evidence                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Existing products         | Three canonical definitions and ten complete ordered bundle hashes remain unchanged, including separate immutable Published locks                                               | Post-change focused compatibility passed                                                             |
| Assembly and effort       | Authored provider selection uses the public interpreter; one automatic delivery; prepared-local ready in at most five minutes; zero technical handoffs and in-run manual rescue | Attempt 2 ready in 177,738 ms; first failed attempt retained; no real-model claim                    |
| Task outcome              | Create two distinct tasks with title/assignee/date/priority; start, complete, filter completed, reopen, retain feedback, complete again and reload exact persisted values       | Actual PostgreSQL/API/browser passed                                                                 |
| Correction and continuity | Retry interrupted operations safely; expose conflicts without silent overwrite; retain useful result through filtering and refresh                                              | Actual retries/races and emitted UI conflict continuity passed; field editing deferred               |
| Access and state          | Viewer reads and actual API rejects create/start/complete/reopen; Member invalid transitions fail; no private-assignee claim                                                    | Actual API denials and Viewer UI passed                                                              |
| Finding and recovery      | Search/status/clear, no-match versus no-data, service failure and recovery, pending and stale-role behavior                                                                     | Actual finding/recovery passed; true-empty branch additionally covered by emitted UI fixture         |
| Actual presentation       | Inspected 390/768/1440 results, phone/desktop forms and affected states; title/priority/due/assignee/status hierarchy, approved color and useful icons                          | 16 actual PNGs independently inspected; QA passed                                                    |
| Usability mechanics       | Two identifying summaries in 390x900, first permitted action at or above 650 px, 44 px controls, no overlap/overflow, zero axe violations                                       | Actual lane passed; thresholds preserved                                                             |
| Assets                    | Actual stylesheet status/type, resolved tokens, grid and SVG geometry; negative CSS/icon controls detect failure                                                                | Actual and fast emitted controls passed                                                              |
| Lifecycle and delivery    | Immutable Graph/Compilation fingerprint unchanged, exact tested source/image identity, all owned Preview/Factory resources cleaned                                              | Actual verifier succeeded; immutable check and service identity passed; exact three projects cleaned |

One existing cross-package task review, independent QA and release review covers
the implemented slice. Small fixture or visual fixes reuse unaffected evidence.
No gate is added for individual components, screenshots or definition variants.

## Coverage and next goal

Coverage is now four registered canonical definitions / three demonstrated local
runtime families. Product-complete journeys remain a separate measure; Task
still needs post-creation correction. See the
[scale roadmap](../superpowers/plans/2026-09-13-product-definition-scale.md).

Evidence: [actual pass](evidence/consumer-task/actual-runtime-attempt-2.log),
[failed first attempt](evidence/consumer-task/actual-runtime-attempt-1.log),
[implementation](evidence/consumer-task/implementation-report.md),
[task review](evidence/consumer-task/task-review.md),
[QA](evidence/consumer-task/qa-report.md),
[release review](evidence/consumer-task/release-review.md),
[runtime identity](evidence/consumer-task/runtime-identity.json),
[cleanup](evidence/consumer-task/cleanup.json),
[phone list](evidence/consumer-task/team-task-tracking/task-list-390.png).
