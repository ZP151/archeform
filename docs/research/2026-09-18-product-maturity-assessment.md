# Product maturity and next priorities

Date: 2026-09-18. Inspected consumer branch: `583bc179`.
Status: evidence-based assessment and recommendations, not implementation or a
new acceptance gate. Existing seven local acceptances remain valid within scope.

## What exists

Seven reviewed definitions use three demonstrated runtime families. A definition
specifies a business job and its fields; a runtime executes its rules. Five
Approval definitions share one engine. Numeric constraints and exact calculated
totals extend that engine rather than adding more families.

| Definition                | Proven bounded outcome                                                                                                       | Important remaining product outcome                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Restaurant Ordering       | Customer menu/cart/order; simulated payment; order status/receipt; merchant stock/menu controls, fulfilment and cancellation | Real payments/refunds, operational integrations and dependable external delivery are not established                              |
| Expense Approval          | Submit, return with reason, edit/resubmit and approve expenses with persistent history                                       | Managed receipt handling, reimbursement execution, real employee access and notification need complete product evidence           |
| Purchase Request Approval | Named item/supplier/amount request and same-record approval correction                                                       | Purchase-order execution, receiving, invoice matching and actual supplier collaboration are not established                       |
| Publication Review        | Title/body/channel review, return, correction and decision                                                                   | Publishing to a real channel, editorial scheduling, version comparison and collaboration are not established                      |
| Training Funding          | Positive course fee, session date and justification; approval/correction                                                     | Enrollment, payment, attendance and training outcomes are outside current scope                                                   |
| Equipment Procurement     | Positive integer quantity, price, server-owned exact total; correction and approval                                          | Multiple lines, supplier ordering, receiving, stock/asset lifecycle, taxes/currency/rounding are outside current scope            |
| Team Task Tracking        | Create/edit/start/complete/reopen with title, description, assignee text, due date and priority                              | Assignee text is not authenticated assignment; collaboration, reminders, private work and scheduling need implementation/evidence |

The catalogue explicitly binds Restaurant to `restaurant-menu/v1`; the other
six definitions use `none/v1` for business parameters. Restaurant has demonstrated
supplied-menu generation. Current data-based authoring is not evidence that an
ordinary user's arbitrary field, policy or workflow changes can already be
configured without platform engineering.

## Evidence strength and limits

Shared behavior has substantial local correctness evidence: immutable Published
inputs and Compilation, exact arithmetic, persisted decimal representation,
transaction rollback, state/role denials, conflict handling and retry after
response loss or API restart. These checks protect real user work and should stay.

Equipment attempt4 reached ready in 197,474ms and completed checks in 248,387ms,
following two presentation failures and one fixture-copy failure. Three retained
failures in four attempts explain the need for cheaper earlier feedback; they
are not a measured production reliability rate. Training's accepted ready time
was 180,306ms. These are prepared local fixture runs, not general user SLAs.

Historical Restaurant evidence includes a small number of real-model rough/name/
menu interpretation cases and unsupported-demand checks. The project's evidence
is therefore not entirely mocked. It still lacks a representative seven-product
real-model benchmark and observed ordinary-user completion/retention. Newer
Approval and Task acceptance uses authored interpretation fixtures.

Selectable demo roles are not production identity or private access. Runtime
role checks are meaningful tests, but a role selector cannot establish who a
real employee is. External hosting, stable sharing, access, backup/restore and
live updates preserving user data remain necessary acceptance boundaries.

## Family-level usability judgment

These are expert judgments from the retained actual artifacts and acceptance
records, not user-study scores or a fresh live-browser audit.

- **Ordering:** Broadest demonstrated operational chain. The inspected mobile
  order view has coherent restaurant branding, a recognizable status/receipt
  hierarchy and persistent navigation. It is a credible local demonstration.
  Payment is visibly simulated and refresh remains explicit; real shop operation
  needs more than this narrow retained screen. Commercial readiness is unproven.
- **Approval:** Most reused and recently exercised engine. Submitting and
  correcting an application is credible within its narrow local contract. Five
  business labels do not create five complete vertical systems. Real identity,
  notification and the downstream outcome often determine whether a team can
  use the product for actual work.
- **Task:** Ordinary correction now closes the create/start/complete/reopen
  loop. It is a usable local shared-list prototype. Real assignment, relevant
  task views, communication and timely reminders are the more valuable next
  steps than sophisticated project-planning features.

## Visual and interaction assessment

Inspected artifacts include `docs/images/restaurant-orders-mobile.png`, final
Task correction result at390px, Equipment results at390/1440px plus its retained
form/dark/fallback views, and Publication results at390px. Restaurant evidence
is a retained order screen, not a new assessment of every menu/merchant page.

Styles and icons visibly load. The remaining issue is composition and relevance:

1. Equipment and Publication repeat a list title in both the heading and large
   photo banner. On phone the first record starts around the middle of the
   viewport. The same office illustration provides branding but little context
   for the immediate task. Keep the approved color/photo vocabulary while making
   the working list denser and using richer imagery where it helps selection.
2. Task rows repeat labels, control groups and whitespace. Due/overdue/assigned
   work does not dominate the hierarchy. Useful groups, compact rows and an
   optional board should be composed from shared assets around the actual job.
3. Approval history precedes the working list and progress tracks repeat on each
   record. Put pending action and latest return reason first; expose the complete
   history progressively without hiding important business values.
4. Sample records and demo role selectors serve testing; a delivered app needs
   a clear sample/live distinction and useful first-run guidance. Do not silently
   delete a user's real data or treat demo controls as final access design.

Visual differentiation should come from a small set of business layouts, not
thousands of bespoke screens: menu/cart, approval inbox/detail, task list/board,
and eventually appointment calendar. Share tokens, icons, fields, dialogs and
states while varying composition and information hierarchy. More pictures or
color alone will not solve these workflow problems.

## Public maturity reference points

Official pages checked 2026-09-18; feature statements are high-confidence vendor
facts, not independent quality or plan-availability endorsements.

- [Square ordering](https://squareup.com/us/en/online-ordering) connects menus,
  payments, pickup/delivery and POS/kitchen orders. This supports treating real
  fulfilment and payment boundaries as a commercial completeness gap.
- [Zoho Expense workflow](https://www.zoho.com/ca/expense/help/getting-started/how-zoho-expense-works/)
  connects receipt capture, expense reports, approval and reimbursement;
  [Zoho receipt tracking](https://www.zoho.com/us/expense/receipt-tracking/)
  documents automated receipt extraction. Approval alone is a narrower user job.
- [Asana features](https://asana.com/features) describes owners/due dates,
  personal tasks, an update inbox, multiple project views and recurring tasks.
  Our near-term task priority should be actual ownership and daily coordination,
  rather than copying the entire suite.
- [Lovable publishing](https://docs.lovable.dev/features/publish) documents a
  hosted shareable HTTPS URL and subsequent publishing of updates;
  [Lovable Cloud](https://docs.lovable.dev/features/cloud) documents backend
  capabilities including authentication, database and storage. Our platform
  must be judged on usable delivery as well as generation speed.

Inference: a competitive ordinary-user platform needs reliable selection,
complete small business jobs, appropriate presentation and durable delivery.
Matching every enterprise feature is unnecessary; the core job must not require
a spreadsheet, chat workaround or repeated model repair to finish.

## Recommended adjustment to the execution route

Keep the existing engineering plan, but bring a real-use pilot and delivery
foundation forward. This recommendation does not accept any new identity,
hosting, package, integration or serialized contract. Those changes follow
existing technology/security authority before implementation.

| Priority     | Small delivery                                                                       | Observable exit                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1            | Short complete definition lane and build/cache work, timeboxed to the existing plan  | Control/summary mismatches fail before expensive generation; record three comparable warm runs; validate the proposed120s and50% targets rather than claim them  |
| 1, alongside | Prepare one low-risk real-use pilot, preferably team tasks or a nonfinancial request | A beginner understands the first screen, creates real work, corrects it and finds the result with no developer help; record obstacles, not only test pass counts |
| 2            | Shared real identity/access and durable delivery slice                               | Two actual accounts have appropriate views; an invited user opens a stable link on another device; updates/restarts preserve data; recovery is demonstrated      |
| 2            | Family-specific working layouts and short onboarding                                 | Users find their pending job and next action; reduce duplicate headings/banner burden; retain approved visual character and readable summaries                   |
| 3            | Expand3–5 distinct supported definitions and parameterization                        | Report business differences, retained requested rules, new runtime edits and complete journeys; reject unsupported requirements honestly                         |
| 4            | Appointment interval/timezone/capacity/conflict/cancel/rebook engine                 | The complete scheduling-and-recovery job works; only then count a fourth family                                                                                  |
| 5            | Varied30 definitions, then100+ retrieval and larger material supply                  | Selection accuracy, ambiguity, user corrections and assembly cost hold at each scale; licensed assets and product counts remain separate                         |

Do not postpone all product work for a compiler rewrite. Extract one private
responsibility when it reduces the next slice's coupling, with exact-output
checks. Use one focused review for ordinary data/layout work; retain the full
shared boundary review only when its contract/risk actually changes.

Measure first useful action, user clarification/correction turns, first-pass
complete delivery, task completion without rescue, seven-day repeat use, and
setup/regression cost separately. Proposed pilot targets are zero technical
handoffs, at most one necessary business clarification for a supported brief,
and a first useful action within five minutes in the declared environment.
These are proposed acceptance targets, not measured results. Make counts and
qualitative observations visible; a handful of testers cannot establish a
population-wide success rate.

## Local references

- [Current status](../project-status.md)
- [Engineering optimization plan](../superpowers/plans/2026-09-17-iteration-engineering-optimization.md)
- [Equipment acceptance](../acceptance/equipment-procurement.md)
- [Task correction](../acceptance/task-correction.md)
- [Restaurant acceptance](../acceptance/restaurant-ordering-mvp.md), supplemented
  by D1.3–D1.10 history in current status
- [Definition batch](../acceptance/definition-batch-one.md)

No application source, acceptance result, deployment or product count changes
were made for this assessment.
