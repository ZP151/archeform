# Consumer Generation Delivery Implementation Plan

> **For agentic workers:** Use the repository's `subagent-driven-development`
> or `executing-plans` skill for authorized implementation tasks. Checkboxes
> describe work to perform; only the active ledger records acceptance.

**Goal:** Turn an ordinary person's business description into a usable,
responsive application with a shareable address, while minimizing questions,
manual correction, and technical decisions.

**Architecture:** Retrieve authored product definitions, bind existing
capabilities and UI recipes, and generate through the immutable Application
Graph lifecycle. The platform owns orchestration, verification, and bounded
repair. User-facing progress describes the business result.

**Tech Stack:** Keep the accepted Node 22 / pnpm 9 TypeScript platform, Next.js
Workbench, NestJS control plane, and current Graph/compiler packages. Provider,
identity, persistence, and deployment changes require specific decisions;
this roadmap does not select them.

## Global constraints

- Every new or changed product family uses the
  [shared consumer acceptance matrix](../../acceptance/consumer-product-checklist.md)
  before implementation and at the existing review. Map business completion,
  user effort, interaction states, actual visual quality, responsive/accessibility,
  access and delivery to concrete evidence. No family is accepted from technical
  tests alone; preserve explicit limits and deferred outcomes in the ledger.
- The founder approved the product correction on 2026-09-07 and requested a
  detailed delivery roadmap, efficient regression, and product-goal tracking.
- English code, tests, UI, and documentation; no credentials or raw AI
  prompts/responses in artifacts, logs, or metrics.
- Preserve Draft -> immutable Published Revision -> immutable Compilation.
  Hiding technical steps must not bypass lifecycle checks.
- Search approved UI registries, recipes, Workbench assets, generated templates,
  then pinned source studies before adding an asset. Retain licenses.
- Ordinary in-contract changes use focused tests and one independent review.
  Existing security, shared-contract, and final-release requirements remain.
- Do not restart the stopped R0 publication experiment, suppress its tests,
  change concurrency to mask it, or claim the current main baseline is green.
- The [active ledger](../ledgers/2026-09-07-consumer-generation-delivery.md)
  owns task state, write assignments, decisions, measurements, and delivery.

## Delivery sequence and time allocation

Timeboxes are estimates of focused engineering days after each task's inputs
are ready, not promised calendar dates. A slice should normally produce a
visible result in 1–3 days; split a larger task around a working journey.

| Stage                           | Timebox                                                        | Result the user can observe                                                                                | Dependencies / exit                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| D0 — delivery foundation        | 1–2 days                                                       | Clear priorities and repeatable fast checks                                                                | This task: roadmap, ledger, working smoke/product regression commands                                                                 |
| D1 — first complete result      | 3–5 days                                                       | A short ordering request opens a working app without manual plan, Graph, Publish, Compile, or Verify steps | Start from existing Restaurant runtime; at least one complete customer-to-merchant journey; local URL explicitly labeled local        |
| H1 — hosted delivery            | Design starts with D1; implementation estimated after decision | An invited ordinary user opens the generated app from another device and keeps their data after restart    | Explicit identity, persistence, hosting, quotas and rollback decision; complete before claiming the first externally usable milestone |
| D2 — cross-business reuse       | 4–6 days                                                       | The same entry creates an intake/approval app as well as an ordering app                                   | Submit -> review -> decision -> requester sees result, with denied cross-role access; no Restaurant semantics in approval             |
| D3 — third family and benchmark | 4–6 days                                                       | Appointment app supports booking, conflict handling and cancellation                                       | Three working families and 30 structured benchmark cases; hosted evidence from H1                                                     |
| D4 — first-use validation       | 3–5 days, overlapping D2/D3                                    | Ordinary users complete useful tasks without developer help                                                | 5–8 invited non-programmers, safe structured observations, defects ranked by user effort                                              |
| D5 — coverage expansion         | Batches of 5–10 definitions                                    | More requests work immediately with the same components                                                    | Scale from 30 definitions / 3 families to 100 definitions / about 10 families only when measured reuse and success justify it         |

Aim at a three-family pilot in roughly 3–5 focused weeks, conditional on H1
scope and evidence. Do not consume that whole period on definitions, governance,
or Restaurant polish before demonstrating D1. R0 baseline repair is separately
owned and prioritized by its effect on release; it must not silently absorb
the consumer-delivery allocation or disappear from release status.

Initial allocation: 40% generation and completion, 30% business definitions
and executable recipes, 20% hosted usability, 10% evaluation and maintenance
of focused regression. Review allocation after each accepted business slice.
An audit or refactor needs a named defect or delivery dependency to displace
functional work.

## D0 — establish regression and the product scorecard

**Owned files:** `scripts/regression.mjs`, `scripts/regression.test.mjs`,
`docs/testing/consumer-regression.md`, this plan, the active ledger, the
consumer reset/research documents, and current status/roadmap pointers.

- [x] Record the approved product objective, current measured evidence, and
      explicit unknowns in the ledger; distinguish main, local experiment, and
      this isolated branch.
- [x] Complete ADR-0037's bounded developer-helper decision under the existing
      standing independent-review policy before implementing the helper.
- [x] Write failing Node tests for argument validation, dry-run without
      execution, fixed command selection, prerequisite ordering, failure exit,
      interruption, and safe summary output.
- [x] Implement `node scripts/regression.mjs smoke` and `product`, plus
      `--dry-run`, reusing existing process execution. No package, CI, or production
      contract changes; no retries that convert intermittent failures into success.
- [x] Run helper tests and both lanes in the isolated worktree. Record duration,
      stage results, relevant omissions, and exact code revision or diff scope.
- [x] Conduct one independent review; fix findings in scope, run affected
      checks, update the ledger, commit and push the bounded task branch.

**Exit:** Commands work on the current Windows checkout, fail honestly, and
do not imply whole-repository or deployed-product acceptance. The ledger is
ready to record D1 evidence. D0 does not itself deliver a generated consumer app.

## D1 — describe once, receive a complete ordering app

**Inspect/reuse:** `packages/adapters/src/requirements/`,
`packages/adapters/src/composition/`, `packages/product-recipes/src/index.ts`,
`apps/control-plane/src/composition/product-composition.service.ts`,
`apps/control-plane/src/template/template.service.ts`,
`apps/control-plane/src/lifecycle.service.ts`,
`apps/workbench/components/workbench-home.tsx`,
`apps/workbench/lib/product-journey/use-release-journey.ts`, and
`apps/workbench/hooks/use-workbench-controller.ts`.

**Why ordering first:** The repository has a current customer/merchant product
recipe, runtime tests and September local-readiness evidence. This is a bounded
first demonstration, not a prerequisite to rebuilding the other families.
The [August requirement acceptance](../../acceptance/requirement-to-product-closure.md)
also records real-model Expense Approval and Appointment journeys passing 2/2
in 20.3 minutes, including isolated runtime, denial, accessibility and cleanup.
Those are valuable existing implementations with explicit review/edit/lifecycle
steps. They do not establish the new low-effort or hosted targets. Reuse their
fixtures and runtime behavior in D2/D3 instead of starting again.

- [x] Author 10 structured ordering cases covering coarse intent, supplied
      business detail, safe omitted details, unavailable integration, and recovery.
      Record intent attributes and expected outcomes, never captured raw prompts.
- [x] Add a failing Workbench journey proving the current manual technical
      handoffs prevent automatic completion. Define the success screen and error
      states in business language before editing behavior.
- [x] Use existing requirement interpretation and recipe selection; apply safe
      defaults to appearance and optional content. Ask only about access or rules
      that materially change the product. Never default private data to public.
- [x] Connect existing lifecycle operations through one platform-owned journey.
      Check required decisions first if orchestration introduces a shared API or
      authority contract. Freeze the contract before assigning parallel writers.
- [x] Show live preview and usable app together; separate readiness from a
      screenshot or successful build. Present one actionable recovery choice when
      bounded automatic recovery cannot finish.
- [x] Prove customer submits -> merchant receives -> merchant fulfills ->
      customer sees status, plus duplicate submission and unauthorized action
      denial. Make the generated data persist across the supported local restart.
- [x] Verify mobile at 390 px, tablet at 768 px, desktop at 1440 px; keyboard
      completion and meaningful empty/loading/error states. Reuse the existing
      Home/template Playwright patterns and generated runtime journey tests.
- [x] Run focused tests, product regression, and relevant local acceptance;
      record first-result usefulness, questions, interventions, time and blockers.

**Exit:** 10/10 defined core journeys work in the supported prepared local
environment; no required technical screens, no developer repair for these
cases, and no concealed external-service prerequisites. Hosted usability
remains pending H1. No new Restaurant feature backlog is a prerequisite.

The implementation and local functional evidence below cover these work items.
The first D1.10 real sample retains 2/3 supported successes and one corrected
restart defect; it does not satisfy a 10/10 first-result reliability claim.
Carry that quality metric into cross-family evaluation instead of delaying H1
and D2 for repeated unchanged Restaurant samples.

### D1.1 execution slice — automatic completion of the supported default

Started September 8 under the founder's iteration instruction. The existing
Restaurant composer uses canonical business definitions; arbitrary prompt
detail is not yet bound to that model. Therefore this first slice removes
manual handoffs for the supported Restaurant default, while D1 remains open
for definition binding, ten-case business acceptance and measured usefulness.

- [x] Accept and record ADR-0038 through the applicable existing decision route.
- [x] Add a failing focused test for fresh Restaurant Describe automatically
      choosing exactly `standard` and reaching the freshly applied V3 target.
- [x] Implement one-time, session-scoped orchestration through existing APIs.
      Never auto-publish bootstrap, opened, edited, refreshed or generic apps.
- [x] Preserve necessary clarification and a retained optional manual review
      path; adapt the existing manual Restaurant acceptance to select that path.
- [x] Present automatic progress and a verified local app link using existing
      Workbench components. Disclose the standard configuration and local/demo
      limitations. Keep the provider's raw input/output out of evidence.
- [x] Prove ordered progression, non-empty verification evidence, loopback
      preview, duplicate-click/StrictMode protection, stale-target refusal,
      phase failure, bounded timeout and cleanup behavior with focused tests.
- [x] Run actual browser interaction at mobile/tablet/desktop sizes and the
      appropriate real-runtime journey. Record mocked and real evidence apart.
- [x] Review once at the ordinary frozen-contract boundary, fix concrete
      findings, commit/push the accepted slice and update the product scorecard.

An automatic UI success in mocked browser tests is not the full D1 acceptance,
an independently usable hosted app, or proof that arbitrary requested rules
were generated. The next functional slice must address whichever measured gap
most prevents first-result usefulness; do not return to catalog-count growth.

### Next D1 correction — definition-aware clarification

The first real run exceeded the three-question ceiling before composition;
the instrumented follow-up observed four questions in the initial response.
The follow-up also exposed a test-only diagnostic closure defect, so it is not
a completed acceptance run. Do not repeat unchanged provider calls to obtain a
passing sample. This is now the next product priority after the current
orchestration corrections, ahead of catalog expansion.

1. Trace the existing canonical Restaurant definition into the requirement
   interpreter. It currently creates a detailed blueprint even though the
   Restaurant composer uses its canonical definition; identify which decisions
   are actually bound and which provider work the existing recipe makes
   unnecessary. Keep source, runtime, provider and Graph contracts unchanged
   unless one consolidated Tech Lead decision explicitly approves a difference.
2. Design a compact supported-default guide using the existing definition:
   sample menu, local table ordering, simulated payment, private staff access,
   and the implemented customer/merchant roles. Retain genuine access and
   business ambiguity; surface unsupported integrations before claiming a
   result. Do not silently truncate questions or substitute public access.
3. Add provider-free regressions for a coarse supported request, omitted
   noncritical details, unresolved ownership and an unavailable integration.
   Assert semantic preservation and the question budget separately. Keep the
   original coarse acceptance brief and the existing three-question/two-cycle
   ceilings; answer actual business decisions rather than bypassing the UI.
4. After a reproducible behavior correction, run one bounded real acceptance
   and record every attempt, including failures. Require the automatic local
   result and actual order/fulfilment/denial/duplicate-action outcomes. Keep
   restart persistence, ten-case coverage, custom rule binding and hosted
   delivery open until separately exercised.

This is the queued corrective brief, not a silent expansion of ADR-0038's
frontend-only implementation authority. PM assigns exact paths after the
relevant contract decision; ordinary in-scope fixes keep one review and the
focused regression lane. No additional general audit is planned.

### D1.2 execution steps — reuse the canonical definition during interpretation

The founder requested continued iteration and obstacle resolution. This is the
bounded implementation of the preceding corrective brief, after the exact
Tech Lead proposal receives the existing standing independent acceptance.

**Frozen product paths:** `packages/adapters/src/requirements/openai-interpreter.ts`
and `packages/adapters/test/requirement-interpreter.test.ts`. One serialized
adapter writer owns both. Root owns this plan, the ledger, status, runtime
preparation and actual acceptance. Existing D1.1 product/test paths stay frozen
unless an actual acceptance defect needs a recorded targeted handoff.

- [x] Record the exact accepted adapter-boundary decision and writer assignment.
- [x] Add focused failing tests that the provider request receives an authored,
      business-only guide projected from the existing canonical Restaurant
      definitions, while preserving the original brief and response contract.
- [x] Include first-response defaults and concise blueprint guidance, retain
      unresolved access and unsupported integration questions, and prove that
      parsing does not discard material questions or leak provider material.
- [x] Implement the projection and instructions without adding packages,
      schema fields, runtime policy, template variants or question truncation.
- [x] Pass focused adapter tests, adapter/Workbench types, formatting and the
      affected product regression. Review the bounded diff once and correct
      concrete findings without another general audit.
- [ ] Build the final Workbench and run the unchanged coarse consumer case
      against the isolated real provider/runtime, with the repaired diagnostics.
      Preserve failed attempts; prove order, fulfilment, denial and idempotency.
- [ ] Validate the retained manual entry at unchanged assertion strength,
      confirm exact runtime cleanup, and reconcile local delivery separately
      from the still-open full D1, hosted milestone and baseline release defect.

### D1.3 execution — concise supported-definition interpretation

The unchanged coarse case still returned `requirement.output_invalid` after
349.123 seconds on the D1.2 reference correction. Preserve the four failed
consumer attempts and the separately passing manual path. Model-authored
Restaurant blueprint details are not used by the canonical V3 composer;
eliminating that redundant generation is the next functional correction.

- [x] Accept one bounded Tech Lead decision for the internal compact selection
      and deterministic first-party projection, with exact write ownership.
- [x] Start with focused failing tests: a coarse supported default returns the
      existing validated interpretation envelope without model-authored Graph
      detail; the result can use the existing real deterministic planner.
- [x] Preserve material authorization/privacy/business/integration questions;
      explicit unavailable live services and custom rules do not become a
      satisfied standard result. Test contradictory, missing and unknown
      selection values and preservation through clarification.
- [x] Keep generic Expense/Appointment interpretation valid, checksum binding,
      strict validation, provider-failure behavior and privacy protection.
      Never use a test fixture, keyword-only bypass or raw-output persistence.
- [x] Implement only the accepted boundary, pass focused/product regressions,
      build and complete one independent scoped implementation review.
- [x] Run the distinct explicit live-payment negative once: retain a material
      integration question and prevent automatic delivery.
- [x] Run the original coarse real acceptance once after the substantive
      correction. Require at most three questions, zero technical handoffs,
      actual customer/merchant task completion, denial, idempotency, non-empty
      verification and exact cleanup. Record time and every failure separately.
- [x] Reconcile the accepted bounded task and deliver its branch checkpoint.
      Keep broader custom-rule binding, ten-case reliability, persistence,
      ordinary-user validation and hosted delivery open until measured.

### Next D1 slice — make the delivered result usable

D1.3 proves the automatic supported-default chain in one prepared local case;
it does not close full D1. Prioritize the observed output over more definitions.

- [x] Inspect/reuse the existing generated order-page recipe and renderer; show
      readable item, payment, total and fulfilment fields. Avoid concatenated
      internal status values. Record the concrete reuse gap before adding an asset.
- [x] Make the customer see the latest fulfilment status through a clear refresh
      or existing runtime update mechanism. Begin with a failing browser test
      where merchant fulfilment changes the visible customer DOM; an API assertion
      alone is insufficient. Do not introduce polling/provider contracts silently.
- [ ] Replace the observed 14-question unsupported-payment interaction with a
      concise capability explanation and meaningful supported alternative, while
      retaining every unsatisfied material requirement and requiring an explicit
      choice before changing the requested business outcome.
- [ ] Bind required Restaurant business parameters and evaluate ten frozen cases,
      including local restart persistence. Keep cold/prepared and local/hosted
      timings separate and preserve failed attempts.

A generated-template, API or other governance trigger receives one bounded
Tech Lead decision before the exact writer assignment. Reuse still-valid
regression/review evidence; no broad audit or catalog expansion is a prerequisite.

### D1.4 execution — customer order readability and explicit refresh

Started September 8 from delivered `c61fedff`. The scoped generated-template
ADR-0041 is accepted; exact standing acceptance and writer identity are recorded
in the active ledger before product edits. This uses the existing dependency-free
runtime, canonical Published fixture and fine-dining shell. No provider replay
or Docker provisioning is needed to test a presentation correction.

**Product paths:** `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
and `product-target.ts`; tests `packages/compiler/test/restaurant-customer-target.test.ts`
and `restaurant-product-v3-target.test.ts`. Root owns `e2e/restaurant-orders.spec.ts`.

- [x] Reproduce missing order presentation in a real generated browser fixture;
      the first meaningful RED is the absent `No orders yet` message.
- [x] Record exact ADR-0041 acceptance and assign one serialized compiler writer.
- [x] Add focused RED/GREEN for readable existing order data, currency display,
      escaped content, distinct links, missing/unknown values and native refresh.
      Keep registry keys, merchant output, APIs and runtime state unchanged.
- [x] Render the same presentation from customer-only and dual-surface bundles.
      Use the existing palette and readable spacing without a new UI registry asset.
- [x] Pass focused compiler tests/types/lint and the affected product lane;
      obtain one scoped independent implementation review.
- [x] Exercise real generated customer/kitchen servers: create/pay an order,
      fulfil it, select `Refresh status` and assert `Ready` in the visible DOM.
      Verify fields and empty/detail paths, keyboard, axe and overflow at
      390/768/1440 px. Inspect safe screenshots and prove exact server/temp cleanup.
- [x] Record measured outcome and remaining gaps, then commit/push the bounded
      task. Keep unsupported-request effort, parameter binding, ten-case coverage,
      persistence and hosted delivery as subsequent product work.

## B1 — converge the release baseline without repeating the stopped experiment

**Dependency:** Required before integration/repository release, not before local
D1 development. PM assigns one Tech Lead investigation alongside D1, with a
1–2 day decision timebox. Implementation estimates follow the selected repair.

**Inspect:** `packages/external-intake/src/candidates.ts`,
`packages/external-intake/src/store.ts`, their existing tests, main CI run
`33756827488`, ADR-0030 and the stopped R0 experiment's final evidence. Do not
edit that worktree or reuse its inconclusive result as production acceptance.

- [ ] Summarize the exact failing concurrent publication interleaving, invariant
      and remaining evidence gap from the existing records; avoid another broad audit.
- [ ] Propose a bounded repair/disposition and its rollback under the existing
      technology/security authority. Identify any decision requiring founder input
      specifically; a proposal does not restart R0 or adopt PostgreSQL publication.
- [ ] After that decision is accepted, assign one writer to the frozen repair
      paths. Preserve a failing focused concurrency case and implement the repair.
- [ ] Prove durable winner identity, immutable bytes and containment through the
      unchanged adversarial cases, then run both supported Node CI lanes and the
      applicable full gate. Do not skip cases, reduce concurrency, or retry away a failure.
- [ ] Update the baseline defect once with repair evidence and the reviewed
      commit. Keep local consumer work moving while the independent defect is resolved.

**Exit:** A separately reviewed production repair passes its concurrency cases
and required full checks. Until then, main stays release-blocked even if the
consumer fast lanes pass. This plan queues the decision; it does not authorize
an unsafe workaround or the stopped experiment's automatic resumption.

## H1 — make the first result accessible and durable

**Design inspection:** `docs/tech-governance.md`, `docs/threat-model.md`,
`packages/adapters/src/provider-contract.ts`,
`packages/compiler/src/targets/`, `infra/docker-compose.yml`,
`apps/control-plane/src/lifecycle.service.ts`, and current preview/verification
services. Exact implementation paths must be frozen by the accepted design;
inventing a provider implementation in this plan would be premature.

- [ ] During D1, propose the smallest hosted profile for invited ordinary users:
      who owns an app, who may use it, durable storage, secret handling, deploy
      status, costs/quotas, rollback, backup/restore and deletion semantics.
- [ ] Compare reuse of the accepted stack with the smallest necessary provider
      adapter; do not add an entire competing application framework for hosting.
- [ ] Record the specific technology and external-action decisions. Product
      direction approval does not supply an account, credentials, spend authority,
      or deployment authorization.
- [ ] Implement the accepted deployment journey and state-based recovery.
      Make local and externally accessible status visibly different.
- [ ] Prove access from a second device, private-app denial, refresh/restart
      persistence, failure recovery, and rollback/restore on controlled test data.
      A URL and an HTTP 200 alone do not pass.

**Exit:** A hosted first complete app usable by its intended audience, with
explicit runtime limitations. Pending authority blocks only the corresponding
external action; local feature work, definitions, and test preparation continue.

## D2 — prove reuse with intake and approval

**September 9 checkpoint:** The bounded D2.1/D2.2 local slice is accepted; see
[approval delivery plan](2026-09-09-approval-consumer-delivery.md). Standard
approval now uses automatic delivery and a complete typed submit/decision/result
UI, with zero technical handoffs in the actual fixed-interpretation runtime lane.
The ten-case exit, real-provider reliability, private identity and hosted use
remain open; do not equate this slice with completion of all D2 criteria.

**Inspect/reuse:** `packages/graph/test/profile-recipe-catalog.test.ts`,
`packages/capabilities/`, `packages/screen-recipes/`,
`packages/product-recipes/`, `packages/adapters/src/composition/`, and the D1
entry/orchestration. Add distinct recipe keys only for distinct semantics.

- [ ] Author 10 benchmark cases around request intake and review, with roles,
      required fields, states, decision rights, return/rejection and duplicate
      submission. Exclude payroll, legal compliance and payment execution initially.
- [ ] Map each requirement to existing capability/recipe keys; document the
      concrete gap before adding an asset. Review any new shared contract once.
- [ ] Start with a failing submit -> reviewer decision -> requester result
      test; implement a single complete form/list/detail/review workflow.
- [ ] Run the same rough-intent entry against both families; show that
      classification and defaults do not leak Restaurant entities or navigation.
- [ ] Validate required-field error, withdrawal/rejection, state persistence,
      access denial and mobile completion. Extend product regression only with
      tests protecting these new user outcomes.

Before adding behavior, replay the existing Expense Approval acceptance and
identify only its manual-handoff, UI and business-rule gaps. Keep existing
runtime and role-denial evidence as regression coverage.

**Exit:** Ten intake/approval cases have independently runnable journeys;
the same platform journey serves two genuinely different business families.

## D3 — appointment and the first 30-case benchmark

**Inspect/reuse:** The existing capability/recipe registries and compiler
targets; appointment conflict/timezone/persistence gaps need a scoped decision
before adding contracts. Reuse D1/D2 orchestration and role/access controls.

- [ ] Define 10 appointment cases: service, resource, duration, availability,
      timezone, booking, cancellation/reschedule, capacity and role visibility.
- [ ] Write failing tests for overlapping reservations, duplicate clicks,
      timezone display and cancelled-slot reuse before extending capabilities.
- [ ] Build customer booking and operator schedule as one complete journey;
      no mandatory external calendar or payment integration in the initial recipe.
- [ ] Execute 30 structured cases across all three families, including varied
      intent completeness and business-rule changes; report each family's results.
- [ ] Evaluate first-pass output before any user correction, then separately
      record platform repair and assisted completion. Freeze the benchmark version
      so improving scores cannot be achieved by quietly dropping hard cases.

Reuse the accepted Appointment requirement fixture, compiled runtime and
journey assertions. Inventory actual conflict/cancellation coverage before
adding scheduling behavior or a new capability.

**Exit:** 3 executable families and 30 evaluated benchmark cases, not 30
screens or labels. Count distinct product definitions separately: variants of
one intent do not create additional definitions. Meet the pilot targets or publish the exact gap
and the next smallest corrective slice; do not inflate coverage counts.

## D4 / D5 — validate value before multiplying the catalog

- [ ] Observe 5–8 invited non-programmers on their own useful tasks; no coaching
      through the happy path. Record structured failure reasons and elapsed active
      effort with permission; do not retain raw descriptions or personal data.
- [ ] Prioritize defects in this order: cannot complete business task; unsafe
      visibility/data loss; confusing forced questions; unusable mobile layout;
      unnecessary user repair; slow prepared delivery; cosmetic variation.
- [ ] Maintain a source -> authored definition -> executable recipe -> verified
      deliverable chain. Each definition includes roles, data, workflows, states,
      permissions, screens, defaults, exceptions and acceptance journeys.
- [ ] Import public product knowledge in batches of 5–10 definitions using the
      existing [research](../../research/2026-09-05-app-definition-and-reuse-ecosystem.md).
      Add packages/source only after pinned provenance and applicable decisions.
- [ ] Promote a definition only when its referenced recipe and business tests
      run. Track reuse ratio and maintenance cost; remove near duplicates.
- [ ] Expand next into lightweight CRM, membership/content access, service
      requests, event registration and simple inventory only according to observed
      user demand and reusable capability coverage.
- [ ] Consider 300–1,000 definitions after 100 definitions / about 10 families
      maintain first-pass success and manageable regression time. Keep observed
      market references separate from definitions and delivered-app coverage.

## Execution rhythm and scope control

Keep at most one shared-contract task and two disjoint implementation tasks
active. A task brief needs an outcome, owned paths, reused assets, acceptance
journey, test lane and decision dependencies; it does not need another parallel
audit document. Update the ledger once after meaningful evidence changes or
acceptance, and use it for status answers.

Every accepted slice carries its focused RED/GREEN evidence, one appropriate
independent review, safe regression summary and a bounded commit. Broaden checks
when a dependency, failure or security risk warrants it. Cosmetic/documentation
corrections reuse valid evidence and only rerun affected checks. Full repository
release checks remain at integration/release; a fast lane never replaces them.

At each business-slice close, compare the scorecard with the previous accepted
slice and select the next task by user effort removed. If D1 cannot show a
working default within its timebox, reduce optional scope and name the concrete
blocker before adding more catalog entries or architecture work.

## D1.5 — complete the generated customer visual presentation

User-directed correction following D1.4: the existing mobile order screenshot
looks unfinished despite successful module and stylesheet loading. Preserve the
accepted lifecycle and customer business behavior; refine the existing target.

- [x] Reproduce loading and identify the missing presentation: native browser
      defaults, weak hierarchy and absent current-page navigation.
- [x] Add focused RED for native route selection and browser asset diagnostics.
- [x] Accept the bounded Tech Lead decision using the existing standing review.
- [x] Refine customer shell, order composition and shared target CSS. Reuse
      fine-dining tokens and existing generated shell; keep registry keys,
      generated shared-source digests, merchant and runtime unchanged.
- [x] Verify all customer navigation routes, generated target tests, package
      types/lint/build, and actual mobile/tablet/desktop order journeys including
      asset loading, touch targets, no overlap/overflow, axe and native refresh.
- [x] Inspect desktop/mobile screenshots together, obtain one scoped review,
      update product evidence and deliver one bounded commit to the branch.

Root owns the target, focused customer test, existing order browser test and PM
records. ADR-0042 records the frozen boundary before implementation. The
unsupported-payment question reduction remains the next business priority.

## D1.6 — introduce local library icons

- [x] Inspect approved UI/recipe assets and verify the published Lucide Static
      coordinate, package license and static SVG layout from primary sources.
- [x] Add focused RED and browser assertions for visible, accessible local icons.
- [x] Accept ADR-0043 with exact dependency, provenance and generated-file scope.
- [x] Add the compile-time icon adapter and license output; use fixed icon
      selections for navigation, refresh, details, order state and empty state.
      Preserve readable names, authoritative status, existing routes and tokens.
- [x] Verify package integrity, selected SVG provenance/license retention,
      deterministic customer-only and dual-surface output, generated journeys,
      responsive/accessibility behavior and zero icon network requests.
- [x] Inspect real mobile/desktop/empty output, obtain one scoped implementation
      review, update evidence and deliver the bounded iteration branch commit.

This implements the founder's explicit icon-library request. Business parameter
binding, unsupported-capability question reduction and hosted usability remain
in the broader consumer roadmap; do not equate a visual slice with full D1.

Browser command prerequisite: run `pnpm --filter @factory/compiler build`, then
`node node_modules/@playwright/test/cli.js test e2e/restaurant-orders.spec.ts --workers=1 --retries=0`.
The test uses the actual built Node ESM compiler outside Playwright transforms.

## D1.7 — preserve defaults when a capability is unsupported

- [x] Identify the prompt rule that reopens canonical decisions and freeze the
      two-file adapter ownership plus root-owned live probe in the ledger.
- [x] Add focused failing instruction/transport regressions, then apply canonical
      defaults independently of the overall Restaurant disposition.
- [x] Preserve unsupported requirements and independent material questions while
      consolidating each unavailable capability into one explicit scope decision.
- [x] Verify affected regressions and one bounded live-payment browser case;
      record actual effort, latency and absence of unintended delivery actions.
- [x] Obtain one scoped review, update product-goal evidence and commit/push the
      accepted iteration. Continue required business parameter binding next.

The long-task goal tracks these functional outcomes across bounded deliveries.
The follow-up repair policy remains unchanged until its existing authority and
the actual failure path have been assessed.

## D1.8 — show the supplied application name

- [x] Accept ADR-0044 through independent standing review; freeze one serialized
      engineer and root-owned live/browser acceptance paths in the ledger.
- [x] Start with focused failures for Published name propagation, escaping,
      unchanged currency behavior, omitted names and menu refusal.
- [x] Bind existing validated title/metadata to initial runtime settings and
      current settings to customer title, shell and hero; preserve merchant edits.
- [x] Run the actual generated browser with an authored name, then
      separately verify a real named request through Published Graph and app.
- [x] Verify menu refusal, retained coarse/default and unsupported-payment
      boundaries; run relevant package/product checks and one scoped review.
- [x] Update observed product metrics and deliver a bounded branch commit.

This supplies application branding without extra editing. It is not legal-name
verification or custom menu/price binding; those remain separate capabilities.

The revised ADR keeps currency unchanged: the frozen canonical input guard
rejects a Graph currency override. Do not expand that contract in this slice.

Before live acceptance, align the private Restaurant title limit with the
existing 2..80-character application-name contract. The scoped review found
the wider private limit could cause late failure; preserve the completed
runtime/browser evidence while closing this interpretation boundary defect.

## D1.9 — supply the initial menu in the same request

ADR-0045 supplies the contract for this slice; its exact proposed text has
standing decision acceptance recorded in the ledger. Begin production
implementation only after D1.8 delivery and a serialized write assignment.

- [x] Freeze the validated menu parameter contract and serialized write owner.
- [x] Add failing boundary and atomic-binding tests, then carry supplied USD
      names/prices from interpretation through the Product request and stored
      review into Graph seed data and its scenario mirror.
- [x] Compile both the unchanged canonical menu and a bounded supplied menu;
      show local placeholders for omitted photos using existing icon assets.
- [x] Prove a supplied third item can be ordered at its exact supplied price,
      fulfilled, and seen by the customer; preserve manager updates and role
      denial. Reject incomplete or unsupported required details before delivery.
- [x] Run focused integration checks, the required contract acceptance sequence
      once, and distinct real supplied-menu/unsupported-currency cases without
      retries; preserve failures and exact runtime cleanup evidence.
- [x] Accept the bounded slice for controller branch delivery. Continue the
      frozen Restaurant benchmark in D1.10; do not expand template counts ahead
      of usefulness. The ledger records the exact push verification.

Root's D1.9 business acceptance is fixed before the first live request:

- Named Restaurant, three authored USD items with distinct integer-cent prices,
  omitted descriptions/photos and simulated payment; require zero clarification
  for these supported details. Verify the third item's exact name and price in
  Published seed/scenario, generated catalog, visible menu, cart and order.
- Complete payment and kitchen fulfilment; verify customer-visible status,
  denied customer staff mutation, duplicate-action reconciliation and retained
  order data after the supported runtime restart. Use actual generated runtime
  for deterministic persistence, separately from real interpretation evidence.
- Omitted photos show the existing local utensils icon with no image request.
  Inspect 390/768/1440 px, keyboard interaction, accessibility and readable
  empty/error states; reuse existing generated browser harness and UI assets.
- A distinct authored non-USD request remains one material currency/data scope
  decision with no fabricated successful USD delivery. Preserve all first
  results and use zero test retries; a repair requires an identified defect.

The ten existing O01–O10 definitions remain frozen in the ledger. Run business
generation cases separately from deterministic fault-injection/recovery cases;
report their denominators and latency separately. The latter can establish
orchestration behavior but cannot raise the real-model first-result success
rate. Previously passing cases are regression evidence, not new benchmark runs.

## D1.10 — verify recovery without making users repeat work (accepted)

Keep the existing O01–O10 definitions. This slice first closes browser-level
recovery coverage, then runs the frozen business-generation sample. It does not
introduce another test framework, gate, automatic provider retry or Graph shape.

- [x] Reuse `apps/workbench/e2e/consumer-generation.pw.ts` and its existing
      fixture. Exercise interpretation/planning failure, compile/verify/preview
      failure, one necessary clarification followed by continuation, and a
      repeated submit or navigation with an in-flight response.
- [x] Assert user-visible recovery, retained in-session input, no false ready
      link, no implicit repair approval, no hidden repeated interpretation and
      no duplicate or stale lifecycle mutation. Add deterministic coverage only
      where existing tests do not prove that outcome.
- [x] Fix demonstrated product gaps with focused failing tests and one named
      writer. Preserve accepted public contracts and reuse current UI assets.
      Do not rebuild or rerun the whole product lane for a fixture-only change.
- [x] Run O01/O02/O03/O04/O05/O06/O10 as a separately declared real-generation
      sample using the existing isolated browser/runtime helpers. Freeze intent
      attributes and expected outcomes before calls; retain each first result,
      question count, handoffs, latency and rescue. A named defect is required
      before an affected paid correction run.
- [x] Record O07/O08/O09 deterministic fault results separately from the real
      sample. Reuse existing role/persistence assertions in actual generated
      apps for O05/O10. Never report a combined mocked/real 10/10 success rate.
- [x] Obtain one scoped independent review for in-contract recovery changes,
      update the product scorecard and deliver the bounded branch commit.

After this first-family evidence, prioritize H1's explicit hosted delivery
decision and the D2 intake/approval family. Additional Restaurant styling or
large template counts must not displace those user-visible capabilities.

The first real sample is four independent requests covering those seven case
conditions: 2/3 supported scenarios complete all checks and 1/1 unsupported
scenario is handled honestly. The failed O10 check is now a focused
provider-free reproduction against the same immutable compilation: Docker
same-container restart reallocates the public web/API ports. ADR-0046 has
exact standing acceptance recorded in the ledger; one serialized runtime
writer owns its bounded correction.
Preserve this first failure and rerun only affected restart acceptance.

The ADR-0046 correction passed focused and full worker regression, independent
task review and Terra QA, then actual provider-free restart and bind-race
acceptance against the same immutable compilation. Original customer/manager
addresses, fulfilled order and visible Ready state were retained. Exact local
resource cleanup passed. The final bounded Sol judgment is clean after the directory-cleanup and
concurrent-cancellation corrections. The ledger accepts the enclosing branch
delivery checkpoint; no new real-model sample was taken.

## Next functional handoff — H1 and D2

1. H1: define the smallest invited-user hosted journey and its identity, durable
   storage, generated-app isolation, quota, rollback and external prerequisites.
   Ask the Tech Lead for one consolidated proposal before implementation; no
   existing local address should be presented as a remotely shareable result.
2. D2: inspect the already implemented Expense Approval definition, recipe,
   interpretation and runtime acceptance. Reuse the common consumer entry to
   deliver submit -> private review -> decision -> requester-visible result.
   Bind required business parameters and ask only material access/rule questions.
3. Add focused regression for each demonstrated gap. Keep real generation,
   injected failures, local persistence and hosted evidence in separate counts.
   Carry current Restaurant regressions forward without another styling wave.
4. Expand definitions after these journeys work. Measure additional required
   questions, developer rescue and actual first-result success before catalog
   size; preserve the failed first sample in the product scorecard.
