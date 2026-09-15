# Consumer App Generation Product Reset

Date: 2026-09-05.
Product direction: founder-approved correction on 2026-09-07.
Execution and measurement authority: [delivery roadmap](../superpowers/plans/2026-09-07-consumer-generation-delivery.md)
and [active ledger](../superpowers/ledgers/2026-09-07-consumer-generation-delivery.md).
Numeric targets are planning objectives; new technical contracts still require
their applicable decisions. Product approval is not evidence of implementation.

## Objective and precedence

Archeform reduces the effort ordinary people spend specifying, building,
correcting and launching applications. Users provide an approximate business
description or answer a few quick questions and receive a complete responsive
application, with deployment handled by the platform.

The founder explicitly rejected the previous framing around technical
evaluators and user-managed repeated development. That framing, the requirement
to finish Restaurant editing before expanding definition coverage, and the
previous plan's automatic F1/F2/F3 ordering are superseded as product priorities.
Preserve their historical acceptance and defect evidence. Restaurant becomes
one reusable reference workload, not the sole future product scope.

The three-user-edit metric is replaced by first-result usefulness and user
effort. Internal revisions, validation and bounded repairs still happen, but
the platform owns them. Application Graph stays authoritative; compilers still
consume immutable Published input. This reset does not accept any new package,
Graph/API, identity, storage, provider or deployment design.

## Default user experience

```text
Describe what you need
        -> optional short business questions
        -> watch the app become usable
        -> use or share the finished app
```

Do not require users to pick a framework, database, schema, template ID,
component binding, compiler, verification command or hosting service. Do not
make requirement-review, plan-review, manual Publish, Compile and Verify
separate obligatory screens. Preserve their internal lifecycle semantics.

Users may adjust an outcome in ordinary language or directly manipulate
content. Advanced tools remain optional. A user does not need to understand
an application's generation history to use it.

Ask only questions that change material business behavior or access. Apply
tested defaults to ordinary layout, typography, navigation and common fields.
Show those defaults through the result. Do not silently infer public access,
financial commitments, external messages, or paid actions. Capture the
necessary business choice or permission once in the user journey.

Preparing a private hosted workspace can be part of a requested creation
outcome; public visibility and external actions must follow explicit intent.
The precise lifecycle/auth/provider contract is a later design decision.

## Why the current product does not demonstrate this outcome

- One official Home template is implemented, with a fixed Restaurant identity.
- The existing 43 source records and 108 scenario records are research assets,
  not a searchable library of executable complete app definitions.
- Twenty-seven current capability entries and five enumerated profile recipes
  offer real foundations but do not prove broad consumer app coverage.
- The UI still exposes development concepts and constrained edits; portions of
  Draft preview are structural representations rather than finished products.
- Local acceptance and repository release do not provide managed hosting.
- Previous milestones rewarded implementation/gate completion without measuring
  how many user decisions or corrections a finished application required.

See the evidence and candidate inventory in
`docs/research/2026-09-05-app-definition-and-reuse-ecosystem.md`.

## The asset system to build

The long-term target is hundreds to thousands of useful product definitions,
backed by a smaller set of composable business capabilities and supported
runtime families. A definition must describe what the application does, not
just how its pages look.

| Layer                          | Contents                                                                                                                   | Completion evidence                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Observed application/reference | Official product flows, permitted demonstrations, API/data documentation and attributable sources.                         | Source date, scope, provenance and observed/inferred/unknown classification.               |
| Product definition             | Users, jobs, domain records, relationships, states, business rules, permissions, screens, defaults and exception journeys. | Internally coherent semantics and a precise mapping to needed capabilities.                |
| Executable blueprint           | Versioned capability selection, component/recipe bindings, data initialization, runtime needs and acceptance cases.        | Successful composition and immutable compilation on the supported stack.                   |
| Validated deliverable          | Working responsive UI, persistent data, authorization, operational journeys and deployment behavior.                       | First-run task completion and hosted health/cleanup evidence under a declared environment. |

Count each layer separately. An observed app is not a validated deliverable.
Do not count color changes as new business definitions or multiply unrelated
options to advertise an untested template count.

### Required definition contents

Each independently authored definition records:

1. the user outcome and supported/excluded business scope;
2. roles, ownership, visibility and allowed actions;
3. records, fields, relationships, constraints and money/time semantics;
4. complete happy-path and exception workflows, triggers and terminal states;
5. page/navigation/block bindings and desktop/mobile behavior;
6. safe defaults and the few unresolved decisions that justify a question;
7. initial/demo versus operational-data handling;
8. required platform capabilities and optional external connections;
9. executable outcome checks, performance expectations and recovery behavior;
10. provenance, license triage, confidence, compatibility and removal/version
    rules.

This is a conceptual content contract. Do not introduce a new serialized
`factory.*` schema from this prose without its technology decision.

### Worked definition specimen: single-location service booking

This is an Archeform-authored candidate definition, not an executable template
or a claim that every rule below was recovered from Cal.diy.

| Definition part      | Concrete candidate content                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User outcome         | A small service business accepts self-service appointments and manages their status.                                                                                                         |
| Roles                | Owner manages services, schedules and bookings; staff sees assigned bookings; customer manages only their own booking.                                                                       |
| Records              | Service (name, duration, active), staff/resource, availability interval, exception/closure, customer, booking (service, resource, start/end, status, version), notification event.           |
| States               | Requested -> confirmed or declined; confirmed -> completed, canceled or no-show. Confirmation mode is an explicit business setting.                                                          |
| Invariants           | No overlapping confirmed use of the same exclusive resource; retries do not duplicate bookings; cancellation releases capacity once; server validates time and role.                         |
| Responsive surfaces  | Service selection, available slots, booking/contact form, confirmation and customer booking view; owner day/week schedule and booking detail.                                                |
| Material questions   | What service is booked; which availability applies; automatic confirmation or owner approval if the request leaves it unclear.                                                               |
| Defaults             | One location; clear timezone display; accessible responsive layout; in-app booking status; no required external calendar or payment provider.                                                |
| Exceptions           | Slot taken during submission, changed availability, duplicate request, cancellation, unauthorized staff access and expired session.                                                          |
| Optional connections | External calendar, email/SMS and payment are separate connected capabilities, never simulated as completed integrations.                                                                     |
| Acceptance           | Customer books; owner sees exactly one booking; second customer cannot claim the same exclusive slot; cancel reopens capacity; refresh preserves state; role denial and mobile journey pass. |

Map each part to current capabilities and missing behavior before it is
classified as executable. Approval/intake and ordering definitions receive the
same level of detail, not merely different labels around this model.

### Reverse analysis pipeline

Study public functionality or authorized source; extract independently authored
definitions; reconcile contradictory sources; bind known capabilities; identify
missing behavior; compile; exercise business journeys; admit the tested result.

Screenshots alone cannot reveal authorization, financial calculations,
concurrency, retention or backend rules. Keep these unknown until supported by
documentation, authorized source or direct evidence. Do not invent proof of
parity with an existing app. No copied Base44 source/assets and no wholesale
copy of protected documentation. Exact source reuse follows source-study rules.

Research automation can draft many definitions offline. Admission checks run
against asset versions, not as repeated manual audits of every user request.
New combinations need compatibility/behavior checks; a previously accepted
component does not prove every arbitrary combination safe.

## Internal generation path

```text
Transient request / brief business answers
  -> intent and required outcomes
  -> retrieve compatible definitions and capability candidates
  -> resolve a complete composition and fill tested defaults
  -> ask only material unresolved questions
  -> construct and validate Graph
  -> internal immutable publication and deterministic compilation
  -> isolated task checks and bounded correction
  -> platform-managed hosting and health verification
  -> finished app and concise connection/action status
```

The retrieval index assists selection; it is not another source of business
truth. Candidate combinations must satisfy typed inputs, capability dependency
closure, role/permission rules, lifecycle and runtime compatibility. Keep the
existing interpreter/planner/Graph/compiler foundations where they satisfy
these needs. Do not replace the stack merely to import a large external app.

Prefer prepared source, cached dependencies and builds, and platform-provisioned
runtime capacity. New persistence/hosting choices remain explicit technical
decisions. Internal correction is bounded in cost and time; changes to business
meaning or authority must not be hidden as technical repair.

External account approvals, payment onboarding, custom domains and OAuth grants
may require user action. Show a concise connection requirement. Do not count a
simulated payment, mock integration or disconnected workflow as fully working.

## First visible result

The next milestone is one common consumer journey that produces three distinct
complete application families. The first finished case is shown as soon as it
works; do not wait for the catalog to reach hundreds.

| Family              | Complete outcome                                                                                                                                            | Initial reusable evidence                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Appointment service | Owner configures services/availability; a customer books; owner sees the booking; cancellation releases the slot; conflicts and timezones behave correctly. | Existing scheduling capability and Cal.diy/Cal.com public scheduling definitions.   |
| Intake and approval | A requester submits a form with attachments; the correct reviewer decides; requester sees status; duplicate decisions and unauthorized access are rejected. | Existing CRUD, files, workflow, approval, notification and identity capabilities.   |
| Ordering            | Owner publishes a usable catalog; a customer submits an order; owner fulfills/cancels it; totals and inventory remain consistent.                           | Existing Restaurant and commerce capabilities; Medusa/Saleor semantic cross-checks. |

A complete result includes purposeful empty states and user-owned records, not
only seeded screenshots. Native in-app status works without external email;
external email/payment is represented accurately as optional or connection
required. Existing product behavior is reused, not rebuilt as three new stacks.

### Initial performance and effort targets

These are proposed goals, not measured current results or universal guarantees:

- A fixed first evaluation set has 30 structured business cases across the
  three families, with imprecise requests, clearer requests and unusual but
  supported variants. Reserve separate held-out cases for unfamiliar wording
  and combinations; do not tune success by renaming cases after failures.
- At least 90% of in-scope cases complete the required first-use journey with
  no manual source repair or technical question. Track failures in the same
  denominator and report coverage against the declared request distribution.
- Median clarification count at most one; ordinary supported cases at most
  three short business questions. Requests requiring material authority may
  need additional explicit decisions and are reported separately.
- On prepared infrastructure, proposed p50 time from last required answer to
  usable hosted app is at most five minutes; proposed p95 at most ten minutes.
  Also report total time from the first request, user active time, and cold
  provisioning time. None of these targets is already proven.
- Mobile at 390px and desktop complete the primary task, with correct persistence
  and role boundaries. No tolerated acceptance case loses data or bypasses
  authorization.
- Measure default acceptance, post-result correction requests, abandoned
  clarification, first task success, runtime cost and provider connection
  burden. Internal attempt counts remain visible to engineering evidence.

Evaluation material is transient at the model boundary. Persist structured
semantic cases, bounded outcomes and digests, never raw model prompts/responses.
Use existing deterministic checks and bounded real-model evaluation when
authorized; do not create an unlimited repair loop.

## Expansion to hundreds and thousands

Run two coordinated work streams: definition supply and first-use delivery.
The definition work must not block the first complete consumer result.

| Stage          | Definition supply target                                                                   | Executable result target                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| First proof    | 30 detailed definitions across the first families, starting with current research records. | Three family-level complete blueprints through one consumer flow; measure the 30-case evaluation.                                        |
| First breadth  | 100 distinct definitions across approximately ten families.                                | Prioritize the highest-value 20-30 definitions for full composition/deployment evidence; report the rest as researched or compile-ready. |
| Broad coverage | 300-1,000 definitions as sustainable demand/evaluation coverage warrants.                  | Grow validated coverage by reusable capability increments; only claim a definition supported when its required behavior has passed.      |

Candidate families: booking, forms/approval, CRM/pipeline, ordering, work orders,
events/registration, content/directory, projects/tasks, inventory/assets, and
service/support. Prioritize overlap with current capabilities, complete outcome
value, low external-account burden, bounded business risk, evidence quality and
implementation cost. These are hypotheses, not measured market-size rankings.

Do not add full accounting, complex manufacturing, regulated decision-making or
arbitrary enterprise integrations merely to increase coverage numbers.

## Delivery sequence and ownership

1. **Product reset and evidence:** PM records this correction and the research.
   This turn is limited to documentation; no product implementation is claimed.
2. **Complete definition specimen:** PM/domain owner turns one scheduling and
   one existing approval/ordering scenario into detailed definitions with a
   capability-gap map. Use an existing registry entry when sufficient.
3. **First consumer result:** one serialized integration owner delivers the
   lowest-gap family through describe, material questions, automatic internal
   completion and usable result. Add only the interfaces necessary for that
   outcome. Expand to the other two families through the same path.
4. **Hosted delivery in the same milestone:** Tech Lead evaluates one provider,
   app identity, persistence and operations boundary. The accepted implementation
   must yield a real usable URL; local acceptance is an intermediate result.
5. **Measured expansion:** admit the next definitions according to missing
   capability reuse and first-result success, while catalog research expands.

Before step 3 changes stable catalog/orchestration contracts, or step 4 changes
identity/runtime/provider boundaries, PM dispatches the corresponding Tech Lead
decision. Group related decisions around these concrete slices; do not create
an ADR for every definition or ordinary component. No new ADR is implicitly
accepted by the founder's product correction.

Ordinary in-contract work retains focused checks and one review. Asset
admission and high-risk changes retain their applicable checks; user creation
uses automation, not human plan-review/QA stages. Existing Candidate defects
still block repository release until resolved; the stopped PostgreSQL experiment
is not reopened and is not a prerequisite for authoring first-party definitions.

## Resource focus

Proposed allocation: 40% consumer generation/completion, 30% executable
definitions and capability reuse, 20% hosted delivery and reliability, 10%
evaluation and evidence. Adjust from actual bottlenecks. Pause generic editor
expansion, large platform experiments and catalog-only accumulation that do not
improve first-result usefulness.

The next review should show generated working applications and measured user
effort. Research documents, source counts and successful infrastructure tests
alone cannot satisfy this milestone.
