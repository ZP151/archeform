# Product Definition Scale and Completion Roadmap

Date: 2026-09-13. Planning targets, not delivered coverage or service guarantees.

## Product outcome and current evidence

An ordinary user describes a business need, answers only material business
questions, and receives a usable responsive application assembled from reviewed
definitions, capabilities and presentation assets. The user should not operate
the platform's Draft, composition, verification or repair machinery.

At delivered baseline `d28f1fed`, three canonical definitions are registered:
Restaurant Ordering, Expense Approval and Purchase Request Approval. These span
two demonstrated runtime families, ordering and approval. The latest actual
Expense/Purchase lanes prove correction, same-record resubmission, retained
decisions, role denials, persistence, safe retries and conflict recovery. They
use authored interpretation fixtures and real local generated runtimes. They
do not establish real-model selection accuracy, ordinary-user effort reduction,
real authentication, public hosting or arbitrary application maturity.

Team Task Tracking under ADR-0057/0063 is now accepted: actual attempt 2 passed
its local PostgreSQL/API/browser journey and presentation, ready in 177,738 ms.
It adds one definition and one demonstrated family, taking totals to four/three.
Its lack of post-creation editing means it remains a bounded functional
prototype, not a product-complete task management system. This distinction
follows the current consumer acceptance checklist. Task correction is the next
delivery, followed by data-based definition authoring and batch validation.

## Ordered delivery slices

| Order                           | Slice and reusable output                                                                         | Required business evidence                                                                                                                                        | Exit and next decision                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                               | Team Task definition and private presentation assembled through existing CRUD/workflow components | Create two distinct tasks, start, complete, find, reopen, complete again, reload; Viewer and invalid-state denial; pending/error recovery; actual 390/768/1440 UI | Four definitions / three demonstrated families only after acceptance. Report no real identity and no editing.                                           |
| 2                               | Task correction and result continuity                                                             | Correct title, due date, priority and assignee on the same task under a declared state policy; concurrent/stale changes and retry recovery                        | Decide the contract through existing technology governance; reuse the approval recovery mechanisms where their semantics apply. No bespoke app rewrite. |
| 3                               | Definition expansion within proven families, beginning with a small representative batch          | Every entry has a distinct primary job, fields, roles, rules, exceptions and an executable journey; equivalent or cosmetic entries are deduplicated               | Establish the definition metadata and batch validator before scaling. No new family is inferred from a title.                                           |
| 4                               | Appointment booking family                                                                        | Availability, capacity, conflicting bookings, cancellation/rebooking and timezone behavior backed by authoritative persistence                                    | A calendar-shaped CRUD page is insufficient. Approve the slot/capacity contract before implementation.                                                  |
| 5                               | Content and directory family                                                                      | Find a useful entry, complete its declared submission/contact/management action, correct it and handle missing media or no results                                | Reuse approved media and card/detail/search assets with a complete action, not only a landing page.                                                     |
| 6                               | Inventory family                                                                                  | Receive, issue, adjust and inspect stock; reject invalid quantities, stale updates and prohibited actions                                                         | Approve stock movement and concurrency invariants before source work; a quantity field alone is insufficient.                                           |
| Parallel product evidence       | Small consented ordinary-user sessions and bounded real-model evaluation after fixture stability  | Rough descriptions, paraphrases, material exclusions, discovery mistakes, time to first useful action and manual interventions                                    | Use failures to prioritize capability and guidance gaps. Never substitute fixture success for user evidence.                                            |
| Before external maturity claims | Accepted identity and hosted delivery slice                                                       | Appropriate access controls, stable deployed URL, persistence, recovery and operating ownership                                                                   | Local Preview remains explicitly local until actual authorized deployment and access evidence exists.                                                   |

## Scale targets and selection strategy

**30 reviewed definitions:** assemble a deliberately varied batch from proven
business families. Each definition records its user job, semantic fields and
rules, role policy, success and correction journeys, unsupported demands,
capability locks, presentation bindings, provenance and concrete test cases.
Prioritize useful semantic breadth over a numeric deadline. A product definition
is distinct only when these business semantics differ meaningfully.

The current bank uses private static TypeScript registrations and exact family
selectors. This is useful for proving a few contracts but is not a thousand-entry
authoring system. Before the 30-entry batch, propose a data-based definition
format and validator that composes already admitted family features without
loading executable template code from a prompt. Distinct field sets, permissions
or rules must first be supported by a reviewed family contract; they cannot be
forced through exact Expense or Task selectors by renaming labels. Measure how
many definitions can be added through data and bindings without handwritten
runtime or UI code. This is a future accepted-contract implementation, not a
capability claimed by the present static bank.

**100 reviewed definitions:** expand only after measured selection and assembly
quality hold across the 30-definition set. Propose bounded retrieval of a small
candidate set rather than appending every definition to every model request.
Evaluate ambiguous descriptions, synonyms, out-of-scope requirements and
candidate misses before enabling automatic selection at this scale. Retrieval
implementation is a future contract decision, not an installed feature.

**Hundreds to thousands:** combine a smaller collection of validated business
families with reviewed domain definitions, reusable presentation recipes and
licensed materials. Batch validation checks structural contracts and executable
journeys. Promote representative runtime cases for each distinct rule and UI
combination, and test every new family end to end. Preserve traceability from a
selected definition to immutable generated artifacts. Material inventory,
possible combinations and visual variants are reported separately from actual
reviewed definitions and runnable products.

## Regression that supports delivery

1. On each source change, run focused behavior tests and the affected package
   checks. Run shared-contract suites once at the completed integration boundary.
2. Before new-family implementation, freeze current canonical definitions and
   complete generated bundle hashes. Before long runtime acceptance, exercise
   the true Published Graph with its separate immutable lock and emitted DOM/CSS.
3. Use a reusable business matrix: happy path, ordinary correction or declared
   gap, invalid state, role denial, persistence, interrupted action, finding and
   result continuity. Adapt its assertions to the actual business invariants.
4. Inspect actual product screenshots as a batch at phone, tablet and desktop
   sizes, including meaningful failure/pending/filter states. Keep approved
   color, icons, action visibility, readable summaries and 44 px controls.
5. Keep the existing independent review sequence at shared-contract boundaries;
   reuse unchanged evidence for small fixes. Do not add per-button, per-template
   or per-screenshot approval stages.

## Scorecard for each delivery

Record registered definitions, demonstrated runtime families and product-complete
journeys as three separate counts. Record time to usable app and first completed
business job, material questions, technical handoffs, in-run manual rescues,
canonical-selection rate, material-requirement retention and assembly failures.
Identify fixture, real-model and ordinary-user samples separately, including
sample size and failures. The immediate prepared-local Task fixture target is
usable in five minutes, zero technical handoffs and zero manual rescue. It is
not a measured consumer performance claim until actual evidence exists.

The PM ledger records one next delivery slice and the highest-value unresolved
product gap. A growing catalog does not outrank a broken core journey or a
regression in the approved visual baseline.
