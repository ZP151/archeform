# Scenario-led family expansion and continuous delivery

> **For agentic workers:** Execute accepted slices with focused tests and one
> ordinary review. Shared Graph/runtime/security/operability changes use the
> existing technology decision process. Do not introduce a separate gate per
> definition, viewport or component.

**Goal:** Grow useful business coverage while an ordinary user describes a need,
answers only material questions and receives an application they can use and keep
using after an update.

**Architecture:** Reuse reviewed family behavior, strict definition data and UI
recipes. Preserve Draft -> Publish -> immutable Compilation. Separate temporary
Preview resources from any future durable delivery environment.

**Tech stack:** Existing accepted TypeScript/Node/React/Next/Nest/Prisma/PostgreSQL
profile. This plan installs no dependency and selects no hosting provider.

## Authority and baseline

The founder requests continued comprehensive family expansion through a long Goal,
and specifies mobile or web according to real usage, with continuous deployment
and delivery included. An active unbudgeted Goal was created on 2026-09-24.

The execution base is `62c53884897a7f72c3a4c9fe25c2b010491515fd` in the existing
isolated `codex/definition-regression-entry` worktree. Root-checkout Eval V2 work
is separately owned and must not be overwritten or imported without review.

At the execution base, the catalogue contained eight registered definitions and
four runtime families. Directory delivery now establishes nine registered and
locally accepted definitions across five demonstrated runtime families. Inventory
now advances that baseline to ten accepted definitions across six families after
its actual journey, responsive inspection, Terra QA and Sol final judgment. Existing
local evidence does not establish ordinary-user success or hosted delivery. New
candidates in this document do not increase those counts.

The September 13 scale roadmap and September 17 engineering plan authorize the
route. A new family contract is implemented only after its exact ADR is accepted.
Cloud execution waits for a concrete environment and its applicable authority;
the environment question does not block local product work.

## Global constraints

- English code, tests, UI and repository documentation.
- Graph is the source of truth; never compile mutable Drafts or modify historical
  Published data, composition locks or protected generated-output fixtures.
- Choose surfaces by job. Mobile web is responsive web, not a native app claim.
- Reuse registered assets before adding source or dependencies. Preserve meaningful
  color, imagery where useful, icon actions with accessible names, and complete
  empty/error/recovery states. Do not duplicate an approval layout for every job.
- Never count a label-only variant, material, candidate brief or unit test as a
  separately accepted product.
- Keep model material and credentials out of artifacts, logs and evidence.
- New public/tenant identity, delivery providers and schema migrations require
  their accepted decisions. Demo role switches do not establish private hosting.

## Ordered business waves

| Wave | Business slice              | Scenario and surfaces                                               | Required closure                                                                                                                                                                               | Status                                                                          |
| ---- | --------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A    | Resource Directory          | Mobile find/read; desktop curator management                        | Create two different entries, find the intended entry, read useful detail, correct it, hide it, prove hidden entries absent from reader list/detail, recover from no results and missing media | Accepted local journey; delivered at e0c0f467; nine definitions / five families |
| B    | Inventory Operations        | Desktop receiving/adjustment/history; mobile stock lookup and issue | Receive, issue and justified adjustment with authoritative quantities, stale/concurrent protection, retained movement history and reload                                                       | Accepted actual local journey; ten definitions / six families                   |
| C    | Service Work Orders         | Mobile technician work; desktop dispatcher queue                    | Assign, work, resolve, reopen; validate the actual assignment/access and evidence requirements before admission                                                                                | Candidate; not a renamed task definition                                        |
| D    | Customer Requests / Support | Desktop triage; mobile customer request/status                      | Submit, respond, resolve, reopen with clear ownership and privacy boundary                                                                                                                     | Candidate; identity and response delivery gaps must be explicit                 |
| E    | Event Registration          | Mobile discovery/registration; desktop attendee management          | Capacity, cancellation and actual check-in; payment and notification requirements cannot be silently omitted                                                                                   | Candidate; appointment capacity reuse is not proof of event semantics           |
| F    | Sales Pipeline              | Desktop pipeline and detail; mobile follow-up                       | Record lead, qualify, progress, retain outcome and follow-up history                                                                                                                           | Candidate; distinct state and privacy contract required                         |

After each new reusable family, assess 3-5 real domain briefs. Admit supported,
semantically distinct jobs through data and bindings. Reject or queue unsupported
rules instead of adding product-specific runtime branches. Thirty varied reviewed
definitions precede 100+ retrieval; hundreds or thousands remain later coverage
targets, not a reason to relax acceptance.

### Next shared-flow correction: unresolved follow-up requirements

Inventory admission exposes a platform-wide usability gap: registered-definition
follow-ups with answered context and still-required unsupported capabilities are
rejected as `requirement.output_invalid`, although provider guidance retains their
questions. Historical tests and ADR-0065 preserve the refusal, so Inventory data
admission must not silently change it. No unsupported feature may be dropped or
reported as implemented.

After the actual Inventory family closes, dispatch the Tech Lead to specify a
compatible, understandable unresolved-requirement outcome and its minimal user
action before increasing catalogue volume. Prove that prior material requirements
survive, explicit scope acceptance resolves only accepted differences, and the
ordinary user sees a useful next action. Keep existing fail-closed safety until
that decision is accepted. Source evidence: the definition-selection guard in
`packages/adapters/src/requirements/openai-interpreter.ts`, historical follow-up
cases in `packages/adapters/test/requirement-interpreter.test.ts`, and the fixed
422 message in `apps/workbench/lib/product-journey/interpret-contract.ts`.

### Next shared-flow correction: accepted-family automatic delivery

Inventory is now locally accepted and delivered as `63c7b12c`. Before Work Orders,
proposed ADR-0079 addresses the existing consumer selector's omission of accepted
Appointment, Directory and Inventory semantics. Their actual business cases use
technical plan and lifecycle buttons; do not count those as automatic consumer
delivery. Reuse the existing phase latches, immutable lifecycle and exact validated
family witnesses. Require actual consumer-entry evidence, explicit manual opt-out,
retained failure/cleanup behavior and measured technical actions. No new provider,
cloud environment or permissive definition-label shortcut is implied. Source work
waits for the independent exact-hash decision review and PM acceptance.

## Next-wave reuse evidence: Work Orders

Source inspection at delivered `9a4bda79` establishes a concrete reuse boundary
while Inventory runtime work continues. This is a fit assessment, not approval of
a new family contract or another accepted definition.

| Required job                                 | Existing evidence                                                                                                                                                     | Remaining decision or implementation                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Start, finish and reopen work                | `packages/compiler/src/task-mutation-contract.ts` already implements locked `start`, `complete`, `reopen`, expected-version writes, audit and scoped receipts         | Reuse the transaction and recovery pattern after an exact Work Orders contract is accepted                                                                         |
| Dispatch to a technician                     | The Task family admits `assignee` as required plain text; `taskValues` validates text, and `taskCommand` authorizes a role without resolving that text to a principal | Define a real assignment target, assignment/reassignment events and the supported identity boundary; changing a label cannot supply this behavior                  |
| Limit technician operations to assigned work | Existing Task business grants use one modifying member role and one read-only viewer role                                                                             | Decide and test record-level assignment authority before promising a technician-specific queue or privacy                                                          |
| Resolve with evidence, then reopen           | Current Task completion takes only `expectedVersion`; its exact five-field business shape has no resolution evidence contract                                         | Decide the minimum useful resolution record and whether reassignment/reopen preserves it; avoid pretending a free-form description is verified completion evidence |

The next Tech Lead proposal must resolve these concrete gaps before source work.
Preserve old Task byte compatibility and reuse its established write protection;
do not broaden Task admission to accept a renamed unsupported Work Order. Mobile
technician work and desktop dispatch must complete the same persisted job. Any
private identity, outbound notification or new data boundary remains subject to
the existing technology/security authority. Inventory stays the active delivery
slice; this assessment introduces no parallel source owner or additional gate.

## Task 1: finish the existing cheap preflight

**Owner/paths:** `definition_lane_completion`, only `scripts/regression.mjs` and
`scripts/regression.test.mjs`. Root owns accompanying evidence/docs.

**Interface:** Preserve `definitions [--dry-run]` and the existing safe summary.
Reuse `approval-numeric-domain.test.ts` and `approval-calculated-total.test.ts` to
run emitted controls, invalid/no-write behavior and complete-workspace density.

- [x] RED: assert the real emitted-test selection is present and a failure stops
      the lane, retaining Windows dispatch and provider-free behavior.
- [x] GREEN: compose those existing tests into the fixed lane; no output changes.
- [x] Execute the real lane and inspect browser execution rather than treating a
      dry-run command listing as visual evidence.
- [x] One ordinary review, focused correction and controller delivery.

This task prevents known regressions; it does not establish visual acceptance of
a new family. New directory controls receive their own representative checks.

## Task 2: deliver Resource Directory as the next family

**Decision owner:** `content_directory_decision`, only proposed ADR-0074.
**Implementation ownership:** assigned after the exact accepted decision freezes
family admission, compiler and persistence interfaces; no parallel shared writers.

- [x] Inspect existing assets and runtime semantics; distinguish event-only
      capability stubs from executable business behavior.
- [x] Record a narrow family design, exact reusable assets and proposed ADR.
- [x] Independent decision review under the existing standing authority if eligible.
- [x] Write focused failing tests for list/detail visibility, management correction,
      invalid input, stale update, denial, retry and missing media.
- [x] Implement shared family behavior, then one canonical definition through data.
- [x] Run old-eight compatibility and actual generated business journey, inspect
      390/768/1440 output appropriate to both reader and curator roles.
- [x] Record real persisted results, immutable lifecycle, failures and cleanup;
      complete applicable shared-contract review and ordinary visual review together.

No contact button implies delivered email. If management is the declared action,
the generated app must visibly perform it on the same persisted entry. Fake
bookings, payments, submission delivery and inaccessible private entries are not
acceptable substitutes for unsupported features.

## Task 3: establish a durable delivery path

ADR-0075 is accepted through the existing standing independent-review authority
at SHA-256 `d2cf85a5bd0bc299e4144a81e708b4407532d081bf087f4e49f8549f2f9167bb`.
It authorizes one synthetic local Team Task A/B rehearsal using unchanged database
artifacts, owned persistent fixture storage, failed readiness, retained-image
rollback and separate backup restore. It does not implement hosted deployment.
Harness and actual runtime evidence pass at attempt 4; the existing independent
review accepts the narrow local rehearsal at 0/0/0. The first three failed
attempts remain recorded.

This is a distinct workstream with a concrete gap: the current Preview runner
names resources per preview and intentionally removes volumes during cleanup.
V1 generated Compose has no explicit durable PostgreSQL volume binding; V3
Restaurant has a per-project `shared-state` volume. Neither establishes safe
cross-revision application upgrades.

| Stage                           | Work and acceptance                                                                                                                                                                                 | Authority/status                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Existing CI                     | Frozen install, types, tests, build and provenance checks in `.github/workflows/ci.yml`                                                                                                             | Present; not deployment                                                            |
| Continuous branch delivery      | Reviewed bounded commits, push equality, accepted integration through PR; report exact revision                                                                                                     | Existing delivery policy; current iteration not yet integrated                     |
| Local durable-upgrade rehearsal | Create business data under revision A; deliver compatible revision B to the same logical app; verify IDs, values, history and actions; inject failed readiness and retain A                         | Actual attempt 4 passes; narrow local rehearsal accepted                           |
| Local recovery rehearsal        | Roll back executable artifacts for a compatible schema; verify post-upgrade writes remain; incompatible downgrade must stop explicitly. Prove separate backup restore into disposable owned storage | Actual rollback, database restart and separate restore pass; scoped cleanup proven |
| Hosted pilot                    | Selected account/environment, private access, durable storage, HTTPS, health checks, failed-rollout recovery, backup restore and operating owner                                                    | Target requested; no provider selected or deployed                                 |
| Routine hosted delivery         | Immutable artifact promotion, readiness-based traffic switch, safe serialized rollouts and visible current/previous release                                                                         | After pilot acceptance, not a fresh user-operated development checklist            |

The user should see a working address, release progress and an understandable
failure/retry result. Internal schema compatibility, build, checks and promotion
remain platform responsibilities. Destructive schema changes cannot be disguised
as automatic rollback. A future deployment adapter must never call Preview's
volume-deleting cleanup against durable product storage.

For the first Directory product, the phone acceptance journey is find -> read;
the desktop curator journey is create -> correct -> show -> hide. Verify a
curator's change through a fresh reader view on the same persisted entry, not
two unrelated viewport fixtures. Each surface must preserve its useful action,
readable content, keyboard/touch access and error recovery at its intended size.
Do not require native packaging or duplicate all desktop controls on a phone
unless a concrete business job needs them.

Continuous delivery has two separately reported outcomes: shipping reviewed
platform revisions, and promoting a generated application's executable revision
while its data survives. Passing CI or pushing this branch proves neither a
hosted rollout nor the second outcome. The rehearsal establishes the narrow
compatible-revision foundation; selecting the hosted pilot environment and
implementing its accepted adapter remain explicit follow-up work.

Evidence sources: `apps/compiler-worker/src/preview-runner.ts`, generated Compose
in `packages/compiler/src/index.ts`, V3 Compose in
`packages/compiler/src/targets/restaurant-v3/product-target.ts`, and
`docs/delivery-policy.md`. This is source inspection, not a deployment test result.

## Task 4: scale after usable slices

Initial source assessment found reusable inventory foundations, with an important
boundary. `commerce.inventory@1.1.1` implements cart-bound reserve/release effects;
the `commerce.inventory-ledger@1.0.0` template exports metadata, while concrete
transactional adjustment/history behavior lives in
`packages/compiler/src/restaurant-runtime.ts` and is selected by the Restaurant
profile. Therefore standalone stock receiving/issue cannot be claimed from the
ledger registry entry alone. The next inventory decision must evaluate extraction
or composition of that actual implementation, without changing historical
Restaurant bundles or exposing order-specific assumptions to inventory users.

ADR-0076 and its accepted AMN-001 through AMN-012 amendments complete this
assessment at final SHA-256
`b73f303c780e371ef9afa146b5940153fa84d9e5e87b433c16bf91aaad446800`
through the recorded standing review. The [Inventory execution plan](2026-09-24-inventory-operations.md)
uses existing mutation protection with an explicit new stock/movement contract,
empty initial stock, indivisible units and unchanged historical outputs. Start
its serialized implementation only after Directory's family delivery closes.

- [x] Assess inventory-ledger and inventory capability contracts against receiving,
      issue, adjustment and concurrency; reuse only semantics actually implemented.
- [x] Build the smallest missing shared rule, then admit the business definition.
- [ ] Expand supported definitions in small data batches, measuring per-definition
      runtime/UI changes and rejecting duplicates.
- [ ] Reuse the separately owned evaluation work after an accepted integration;
      measure rough-prompt selection and requirement retention without another harness.
- [ ] Run consented ordinary-user sessions when available, tracking questions,
      time to first useful action, rescue and subsequent correction effort.

## Delivery scorecard and stopping rules

Record reviewed candidates, registered definitions, runtime-proven families,
locally accepted journeys and hosted products separately. For each new journey
record source/Compilation identity, chosen surfaces, measured ready time and first
action, retained requirements, reused keys, handwritten runtime changes, visual
result, recovery result and exact resource cleanup.

Target a prepared-local useful app within five minutes with zero technical
handoffs or manual rescue; this is a target, not an external service guarantee.
One failed meaningful action outranks catalogue expansion. Fix a shared defect
once, rerun affected checks, and reuse unchanged evidence. Do not restart a full
audit for every field or visual correction. Do not mark the long Goal complete
while its new-family and delivery acceptance outcomes remain open.

Directory's passing actual run measures 182,850 ms in isolated verification and
21,389 ms in Preview startup, with app readiness at 208,554 ms. This identifies
build/verification reuse as a concrete speed investigation after the next family
baseline is frozen. Measure cold/warm costs before choosing an optimization; keep
immutable inputs and required business checks. Do not remove correctness checks
merely to improve the timer or count outer-stack preparation as a user SLA.
