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
Task correction under ADR-0064 is also delivered at `f8cdfe81`: same-record
editing, stale-write recovery, completed-state denial, Reopen and retry after
restart passed the actual generated runtime journey. The local app was ready
in 196,950 ms. This remains a bounded prototype with demo roles; real identity,
private assignment, notifications and hosted operations are still unproven.
Data-based definition authoring and batch validation under ADR-0065 are now
accepted. Four immutable round trips, the data-only field compiler probe,
174 independent QA tests and 16 built CLI cases pass. The next delivery is
semantically distinct candidate expansion through the representative batch below.

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

The bank now uses a strict reviewed JSON catalogue and fixed family code under
accepted ADR-0065. The validator and a data-only field compiler probe establish
the authoring foundation; they do not establish a thousand-entry catalogue.
Distinct fields, permissions or rules must still be supported by the reviewed
family contract, and renaming labels does not add semantic coverage. Measure how
many candidate products can be admitted through data and bindings without
handwritten runtime or UI code. Use the authoring guide and report real family
gaps before the 30-entry milestone.

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
   Execute its derived verification journeys through the real bounded probe
   executor and emitted business runtime, including prerequisite chains and
   replay. Checking only the generated plan shape misses execution gaps. Stop
   a failed verification promptly with a bounded failure code, while retaining
   the overall time-to-ready target and original failed-attempt evidence.
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

## Foundation sequence after Task correction

The first scale delivery is the accepted definition authoring and validation
pipeline. Steps 1 through 4 below are complete under ADR-0065; step 5 is the
next admission task. Reviewed data now supplies the catalogue while fixed code
owns execution. A description or catalogue file cannot load arbitrary modules,
packages, routes or executable templates. The sequence remains the regression
and admission reference for future expansions.

1. Capture the four delivered definition projections and representative immutable
   bundles. Use these as round-trip fixtures for data-based authoring; do not
   replace existing historic bundle expectations.
2. Propose a strict versioned data shape for definition identity and family
   version, primary job, fields, roles, state/rule bindings, correction and failure
   journeys, supported defaults, material exclusions, presentation bindings,
   capability locks and provenance. Exact family support must remain explicit.
3. Implement a provider-free validator after contract acceptance. Its table-driven
   tests reject unknown keys/families/versions, executable values, broken bindings,
   unsupported rules, missing correction cases and duplicate business semantics.
   Cosmetic title, color or example changes do not create new product coverage.
4. Round-trip all four current definitions through data and admitted fixed family
   code. Require no projection or immutable-output drift except an explicitly
   accepted new version. Verify one representative actual runtime per changed
   business rule or presentation combination, reusing unchanged family evidence.
5. Admit a small representative batch only where its distinct semantics can be
   expressed using supported family features. Record additions requiring runtime,
   UI or family-contract changes separately; they identify platform gaps rather
   than successful configuration-only assembly.

Exit report: attempted/admitted/distinct definitions; definitions added without
handwritten runtime or UI; validation failures by unsupported capability; batch
validation time; representative assembly failures; and fixture versus real-model
selection evidence. The 30-entry milestone begins after this pipeline passes.
Calendar, inventory invariants, real identity and hosted delivery remain separate
business contracts rather than being inferred from catalog labels.

## Next representative batch after the data foundation

The first batch is an authoring experiment with explicit outcomes, not a promise
that current exact family contracts can admit 30 products. Use six candidate
briefs to distinguish data-only reuse, duplicate semantics and capability gaps:

| Candidate brief           | Distinct business demand to test                                           | Evidence before admission                                                                                              |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Training funding approval | Course, session date, fee and justification reviewed by one decision maker | Data-only fields, required input, return/revise/resubmit, persistence and approved responsive presentation             |
| Publication review        | Review and correct a proposed title/body, then record a decision           | Demonstrate the review closure; external publication is an explicit unsupported integration, never implied by approval |
| Equipment requisition     | Quantity, cost and item details                                            | Compare to existing Purchase Request semantics; a duplicate is reported and not admitted                               |
| Travel authorization      | Trip interval and budget                                                   | Date ordering and any budget rules must be supported and tested; typed dates alone do not prove these invariants       |
| Leave request             | Date interval, overlap and allowance                                       | Identify missing interval/entitlement rules; do not admit a generic approval form as a complete leave system           |
| Access request            | Resource, requested authority and provisioning result                      | Identify real identity/provisioning boundaries; demo roles and an approval record do not prove access delivery         |

For each candidate record attempted, strict-valid, semantically distinct,
family-supported, runtime-admitted and actual-journey-passed separately. A
supported field-variation compiler probe is evidence of composition, not a
new admitted product or end-to-end acceptance. Zero handwritten runtime/UI
changes is the target; any required source change is a measured platform gap.

Use the first successful data-only candidate to publish a concise authoring
recipe and reusable business regression case. Run one complete local generated
journey for each new rule/presentation combination, batching visual inspection
at 390/768/1440. Reuse identical contract evidence; no new gate per field or
definition. Every materially unsupported requirement remains visible to the
ordinary-user clarification flow.

Expand to 30 only after this batch demonstrates meaningful additions without
per-product execution code. If exact family support blocks the batch, prioritize
the narrowest reusable capability extension or the next appointment family,
using actual failed demands to choose. At 30, measure rough-description
selection and material-requirement retention before the 100-definition
retrieval milestone. A larger material inventory remains a separate measure.

## Batch-one execution update

The first six briefs produced one accepted local addition and five shared
capability gaps. Publication Review is the fifth row; actual admission exposed
missing generic record identity in the shared Approval presentation. The reusable
title/enum-summary/history correction is delivered under ADR-0066. Final actual
acceptance passes in 4.3 minutes, with a 191,368 ms prepared-local ready sample;
independent review and exact cleanup pass. Existing record-media rules remain:
unknown signatures use the family hero, without forced decorative record photos.

After the separately recorded identifier repair, prioritize the smallest shared
numeric-domain extension to unlock Training and Equipment. Define positive or
nonnegative amount semantics, positive integer quantity and any calculated-total
requirements explicitly; do not silently omit them. Date intervals and allowance,
real identity/provisioning, appointment capacity and inventory transactions remain
separate subsequent business capabilities. Do not start the 30-definition count by
renaming current products or disguising unsupported rules as typed input fields.

Each new batch must report reviewed briefs, authored/strict-valid data, distinct
registered definitions, shared platform changes, per-product execution/UI changes,
and actual accepted business journeys separately. A fifth registered JSON row
counts as accepted only after visible record identity and the business closure
pass. Reuse the parameterized regression case and keep the original four fixtures
immutable. Acceptance status and final evidence: docs/acceptance/definition-batch-one.md.

### Next bounded delivery: numeric rules, then Training admission

September 17 execution: the bounded identifier repair is delivered at `3eebfc0e`;
historical five-definition fixture bytes are retained. Shared numeric domains are
accepted and delivered at `9eabe817`, including exact persisted Decimal boundary
checks and actual PostgreSQL/browser correction evidence. Training Funding is
accepted as the sixth local definition after actual attempt 2, with 180,306 ms
ready time, two approved courses, complete correction/recovery and reviewed
390/768/1440 presentation. It adds one catalogue row and zero product-specific
runtime/UI branches; demonstrated families remain three. Its initial helper-only
failure remains recorded separately. Independent review has no open P0/P1/P2.
See [numeric acceptance](../../acceptance/numeric-field-domains.md) and
[Training admission](../../acceptance/training-funding.md) for current evidence.

The completed prerequisite repairs the long-application-ID namespace defect:
generated Principal/Session constraint names previously truncated to the same
PostgreSQL identifier. Accepted deterministic bounded naming and fail-early
validation now cover colliding prefixes while retaining historic fixtures.
The original shorter test ID remains test isolation, not the production fix.

1. Use the rejected Training and Equipment demands as failing examples. The
   first decision must specify finite numeric bounds, inclusive versus exclusive
   limits, integer quantities, and consistent create/edit validation. Tech Lead
   proposes the smallest Graph/runtime/verifier contract; record its independent
   standing acceptance before implementation when the standing criteria apply.
2. Implement one reusable numeric-domain capability, with server-authoritative
   validation and useful native form feedback. Exercise zero, negative,
   fractional quantity, boundary values, malformed direct API input, correction
   and exact retry; preserve existing immutable compilations. Do not introduce
   a branch for Training or Equipment.
3. Admit Training Funding only after its actual fee/date/justification journey
   passes with return/revise/resubmit and the approved responsive presentation.
   Reuse the batch helper, required-field/denial cases, image fallback and visible
   multi-record identity checks. Record the new definition separately from the
   shared numeric implementation cost.
4. Keep Equipment pending until calculated-total semantics are supported and
   tested. Numeric bounds alone do not establish arithmetic correctness. Select
   the next shared capability from observed blocked demand, then expand the next
   small batch using data and reused components.

The exit measure is a newly usable business job with fewer user corrections,
not the number of JSON rows. Track authored versus real-model selection, actual
ready time, material requirements retained, business closure, visual acceptance,
and per-product implementation changes. Retain one independent review per
ordinary accepted slice; apply the existing full gate only to its load-bearing
Graph/API/security contract boundary, not again for each catalogue row.

### Route after the sixth local product

1. **Calculated requests before Equipment.** Decide authoritative quantity,
   unit-price and total semantics, including the supported numeric precision and
   rounding behavior. The current numeric presentation supports exactly one
   constrained field, so multiple constrained inputs and derived read-only totals
   are explicit shared gaps. Tech Lead proposes the smallest extension under
   existing authority before implementation. Acceptance must prove correct totals
   after edits, rejection of forged totals/invalid quantities, persistence and
   concurrent correction; only then admit Equipment through data.
2. **A small varied data batch.** Use the authoring recipe and reusable consumer
   runner to assess several distinct jobs in supported families. Record rejected
   requirements and per-product source changes. Keep one ordinary review, affected
   tests and actual checks for each new rule/presentation combination; reuse
   unchanged contract and visual evidence. Do not inflate coverage with label-only
   variants or material counts.
3. **Appointment as the next new family.** Prioritize interval/timezone,
   availability, capacity, simultaneous booking, cancellation and rebooking.
   These are authoritative business rules, not a calendar widget or renamed CRUD.
   Require a complete booking-and-recovery journey before counting the family.
4. **Measure ordinary-user effort alongside expansion.** Run bounded real-model
   rough-prompt/paraphrase selection evaluation and consented user sessions when
   their inputs and authority are available. Track necessary questions, retained
   requirements, first useful action, manual rescue and correction effort. Local
   authored success is a baseline, not proof of these outcomes. Identity and
   dependable hosted delivery remain necessary before external maturity claims.
