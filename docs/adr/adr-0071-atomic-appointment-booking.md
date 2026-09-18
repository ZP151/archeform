---
title: "ADR-0071: Atomic Appointment Booking"
status: "Proposed"
date: "2026-09-18"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "capability",
    "scheduling",
    "appointment",
    "concurrency",
    "compiler",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0071: Atomic Appointment Booking

## Status and recommendation

**Proposed.** Recommendation: **experiment** with one additive, versioned
`scheduling.appointment@1.0.0` capability and one conditional generated
Appointment profile. The experiment may become an accepted eighth local product
only after its complete PostgreSQL/API/browser evidence passes. Keep
`core.scheduling@1.0.0`, `factory.application-graph/v1`, every existing product
output, and the accepted technology profile unchanged.

The proposed capability, `appointment.booking` effect, generated command/data
contracts, and atomic claim/release/move behavior are new stable capability,
API, persistence, compiler-template, and operability contracts. They therefore
trigger the technology-governance ADR gate. Existing ADR-0006, ADR-0007, and
ADR-0008 authorize typed owner-aware bindings and immutable composition input;
they do not authorize booking capacity or mutation semantics. Existing mutation
ADRs provide patterns, not a reusable appointment domain contract.

This proposal grants no implementation, catalogue admission, Product Publish,
Compilation, provider call, paid resource, deployment, cloud action, Git
mutation, or release authority. PM must record separate founder acceptance or
the standing policy's independent read-only review of this exact ADR SHA-256,
reviewer identity, `APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 0/0,
evidence, and authorization before assigning implementation. The proposer
cannot supply that review.

## Context and source evidence

- **CTX-001**: At source base
  `583bc1791979ec4159cd547c9d3661855716d3ab`, seven product definitions in
  three demonstrated runtime families are locally accepted. Appointment is not
  accepted and must not count as a fourth family until its complete business
  journey passes.
- **CTX-002**: `core.scheduling@1.0.0` is a verified Golden capability with
  effect `schedule.plan` and interface `schedule.plan/v1`. Its only semantic
  inputs are one entity and one `datetime` field. It supplies no interval,
  timezone, service, capacity, conflict, cancellation, rescheduling, receipt,
  or persistence contract. It remains useful provenance but cannot be treated
  as booking evidence.
- **CTX-003**: Graph V1 already represents entities, typed scalar fields,
  many-to-one relations, policy roles/actions, flows, immutable capability
  selections, and the `confirm`, `reschedule`, and `cancel` action vocabulary.
  A reference Blueprint field becomes a string `*Id` scalar plus a Graph
  relation. No new serialized Graph version is required for this bounded slot
  model.
- **CTX-004**: ADR-0006 supplies `factory.capability-binding/v1`; ADR-0007
  serializes owner-aware field bindings; ADR-0008 captures one immutable
  composition input. The new asset must reuse all three boundaries. The
  capability binding contract has no `domain.relation` input kind, so relation
  correctness must be an exact structural eligibility witness over the
  Published Graph, never inferred from field labels.
- **CTX-005**: Existing generated Approval and Task runtimes demonstrate scoped
  idempotency receipts, optimistic versions, serializable Prisma transactions,
  safe conflicts, rollback, restart replay, and append-only history/audit. Their
  business state machines and stored contracts are not appointment contracts
  and cannot be selected or renamed for this product.
- **CTX-006**: The current threat model requires authorization before
  disclosure, server-owned state, idempotency and concurrency checks, safe
  audit evidence, immutable Published input, contained output, and exact cleanup.
  Appointment capacity is a security and integrity boundary because a browser
  can race, replay, forge availability, or address another record directly.
- **CTX-007**: The design authority is
  `docs/superpowers/specs/2026-09-18-appointment-booking-v1-design.md`.
  Technology authorities are `docs/tech-governance.md` and
  `docs/threat-model.md`. Product prose alone does not authorize this contract.

## Current and proposed profiles

- **CUR-001**: Keep Node `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`,
  Prisma/client `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved
  `5.81.2`, ioredis `^5.4.2` resolved `5.11.1`, and floating-major
  `node:22-alpine`, `postgres:16-alpine`, and `redis:7-alpine` images. Tracked
  manifests, `pnpm-lock.yaml`, Dockerfiles, and Compose remain authoritative.
- **CUR-002**: Keep `factory.product-definition-data/v1`,
  `factory.product-blueprint/v1`, implemented
  `factory.application-graph/v1`, `factory.capability/v1`,
  `factory.capability-binding/v1`, and the current immutable composition-lock
  serialization. Keep mutable Draft -> immutable Published Graph -> immutable
  Compilation. A compiler never consumes a mutable Draft.
- **CUR-003**: Keep `core.scheduling@1.0.0` byte-for-byte with package root
  `packages/capabilities/assets/core.scheduling/1.0.0`, effect
  `schedule.plan`, and `schedule.plan/v1`. It is not upgraded in place and is
  not a compatibility alias for the proposed package.
- **PRO-001**: Add the exact physical capability coordinate
  `scheduling.appointment@1.0.0`, package root
  `packages/capabilities/assets/scheduling.appointment/1.0.0`, manifest
  `factory.capability/v1`, binding contract
  `factory.capability-binding/v1`, effect `appointment.booking`, and provided
  interface `appointment.booking/v1`. Its digest, templates, fixtures, contract
  test, license declaration, and composition lock are immutable package
  evidence.
- **PRO-002**: Add one compiler-private conditional profile
  `appointment-booking@1.0.0` and generated contracts
  `factory.generated.appointment-command/v1`,
  `factory.generated.appointment-receipt/v1`, and
  `factory.generated.appointment-history-entry/v1`. These names are exact
  versioned identifiers. They do not alter old generated routes, records,
  schemas, comments, whitespace, manifests, or file order.
- **PRO-003**: Add no dependency, package range, lockfile resolution, database
  technology, queue, service, port, Compose topology, provider, credential,
  copied source, external calendar, or deployment behavior. Use built-in
  `Intl.DateTimeFormat` only for bounded timezone validation/display. If the
  accepted contract cannot be implemented without one of those changes, stop
  and return to governance.

## Decision

### Capability and structural eligibility contract

- **CAP-001**: `scheduling.appointment@1.0.0` declares these required typed
  bindings, all through `factory.capability-binding/v1`:

  ```text
  serviceEntity                         domain.entity
  serviceNameField                     domain.field(serviceEntity; string; required)
  serviceDurationMinutesField          domain.field(serviceEntity; integer; required)
  serviceActiveField                   domain.field(serviceEntity; boolean; required)

  scheduleEntity                       domain.entity
  scheduleServiceReferenceField        domain.field(scheduleEntity; string; required)
  scheduleStartField                   domain.field(scheduleEntity; datetime; required)
  scheduleEndField                     domain.field(scheduleEntity; datetime; required)
  scheduleTimezoneField                domain.field(scheduleEntity; string; required)
  scheduleCapacityField                domain.field(scheduleEntity; integer; required)
  scheduleStatusField                  domain.field(scheduleEntity; enum; required)

  appointmentEntity                    domain.entity
  appointmentScheduleReferenceField    domain.field(appointmentEntity; string; required)
  appointmentCustomerNameField         domain.field(appointmentEntity; string; required)
  appointmentNotesField                domain.field(appointmentEntity; text; optional)
  appointmentCancellationReasonField   domain.field(appointmentEntity; text; optional)
  appointmentStatusField               domain.field(appointmentEntity; enum; required)
  ```

  Strict manifest `parameters` mirror every input key and required state. The
  field bindings are owner-aware objects and may use different safe field keys;
  neither the asset nor compiler selects by product key, label, route, or prose.

- **CAP-002**: Eligibility requires three distinct bound entities and exactly
  one many-to-one relation from `scheduleEntity` to `serviceEntity` owned by
  `scheduleServiceReferenceField`, plus exactly one many-to-one relation from
  `appointmentEntity` to `scheduleEntity` owned by
  `appointmentScheduleReferenceField`. Reference fields must be the relation's
  explicit string scalar and target the injected target record ID. Missing,
  extra competing, reversed, self, many-to-many, or ambiguous relation witnesses
  fail before artifact acceptance.
- **CAP-003**: `serviceDurationMinutesField` and
  `scheduleCapacityField` use explicit positive integer numeric domains and fit
  signed Int32. Duration is descriptive in v1; the schedule's stored interval
  is authoritative and is not derived from duration. The exact schedule status
  values are `open`, `closed`; appointment status values are `requested`,
  `confirmed`, `cancelled`. Extra enum values, optional status/capacity/time
  fields, calculated fields on contract fields, or conflicting numeric domains
  fail closed.
- **CAP-004**: The exact appointment flow is:
  `requested --confirm--> confirmed`,
  `requested --cancel--> cancelled`,
  `confirmed --reschedule--> requested`, and
  `confirmed --cancel--> cancelled`. Creation establishes `requested` and
  claims a schedule. Cancelled is terminal. Reschedule changes the same record
  and claims a different schedule. No fallback flow, hidden transition, generic
  update of status/schedule, or cloned record satisfies this profile.
- **CAP-005**: Required role semantics are structural. Customer has appointment
  create/read/cancel for the local demo; staff has appointment read/confirm/
  reschedule/cancel; administrator has service and schedule management plus
  appointment read/cancel. Existing local session/role adapters supply the
  actor. This does not establish person-level ownership, authenticated identity,
  tenant isolation, or production-safe public booking.
- **CAP-006**: The compiler selects `appointment-booking@1.0.0` only from the
  verified immutable composition lock, exact CAP-001 bindings, and complete
  CAP-002..005 Published Graph witness. Partial or unsupported witnesses fail
  with a bounded unsupported-profile error. They never fall back to CRUD or
  `core.scheduling` output that lacks capacity enforcement.

### Interval, timezone, schedule, and availability contract

- **TIM-001**: Schedule start and end are valid finite ISO-8601 instants with
  explicit `Z`/offset input and are persisted as canonical UTC instants. Require
  `end > start`. Reject offset-free local timestamps, invalid dates, overflow,
  and unsupported scalar input before writes. The browser may display local
  time but cannot submit a timezone-free replacement for an instant.
- **TIM-002**: Timezone input is a trimmed 1..64 character string with no
  control characters. `UTC` is allowed explicitly; other values must be
  accepted by the current Node runtime's `Intl.DateTimeFormat` `timeZone`
  option. Persist the formatter's canonical resolved timezone and display its
  explicit label beside localized times. Never infer timezone from the browser,
  host, locale, service name, or UTC offset.
- **TIM-003**: A service must exist and be active when creating a schedule or
  claiming/moving an appointment. A schedule must exist, reference that service,
  have a valid canonical interval/timezone, positive capacity, and status
  `open` at claim time. Availability is derived as
  `capacity - activeAppointmentCount`; it is server-owned and is neither a
  writable Graph field nor trusted from a request.
- **TIM-004**: `requested` and `confirmed` appointments are active and consume
  one capacity unit. `cancelled` appointments consume none. Capacity supports
  any positive Int32 value; capacity one is the mandatory acceptance case.
  V1 does not implement arbitrary interval overlap, staff/resource calendars,
  recurring bookings, or capacity shared across multiple schedule records.
- **TIM-005**: Administrator schedule creation and update use the same interval,
  timezone, service, status, and capacity validators. While active appointments
  exist, service reference, start, end, and timezone are immutable; capacity may
  increase or decrease only to a value at least equal to the active count, and
  open may become closed. A closed schedule admits no new claim/move. Deletion
  of referenced services or schedules is unsupported. Deactivating a service
  blocks new schedules and claims but does not rewrite existing appointments.

### Generated command, response, and history contracts

- **API-000**: Conditional Appointment output keeps the existing entity route
  grammar. Service, schedule, and appointment create use
  `POST /api/:entity`; administrator service/schedule update uses
  `PATCH /api/:entity/:recordId`; appointment transitions use
  `POST /api/:entity/:recordId/events/confirm`, `/events/reschedule`, or
  `/events/cancel`; and record-scoped booking history uses authenticated
  `GET /api/:entity/:recordId/appointment-history`. List/detail reads retain
  existing generated routes. These extra mutation/history behaviors exist only
  for the exact CAP-006 profile; another entity or output returns the existing
  safe unsupported-route result. V1 emits no delete route for a referenced
  service, schedule, or appointment.
- **API-001**: Appointment mutations retain the generated application's normal
  authenticated entity routes and add no product-named endpoint. The exact
  conditional bodies are:

  ```ts
  type AppointmentCreateV1 = {
    values: {
      scheduleId: string;
      customerName: string;
      notes?: string;
    };
  };

  type AppointmentEventV1 =
    | { expectedVersion: number } // confirm
    | { expectedVersion: number; scheduleId: string } // reschedule
    | { expectedVersion: number; cancellationReason: string }; // cancel
  ```

  The actual reference/name/notes/reason field keys come from CAP-001 and are
  projected into these semantics. Bodies are strict own-data JSON objects;
  inherited/accessor/unknown keys, missing keys, unsafe integers, empty IDs,
  and extra values are safe 400. Create cannot submit status, version,
  availability, capacity, interval, timezone, service, or history. Confirm,
  reschedule, and cancel cannot use a generic values patch.

- **API-002**: Every state-changing request requires
  `x-factory-idempotency-key` matching `[A-Za-z0-9._:-]{1,128}`. Authorize the
  current server-resolved role/session before receipt lookup or record
  disclosure. Scope is a SHA-256 digest of length-delimited Published Graph
  checksum, actor scope, role, entity, record ID or `$create`, and command.
  Request hash is over the strict canonical validated body. Raw keys, bodies,
  names, notes, reasons, and IDs are not logged as evidence.
- **API-003**: A receipt is append-only after commit and stores scope,
  idempotency key, request hash, command, record ID, response status, exact safe
  response body, and creation time under a unique `(scope, idempotencyKey)`
  constraint. Same scope/key/hash after current authorization replays the exact
  outcome with no new version/history/audit/effect. Same key with another hash
  returns safe 409 `appointment.idempotency_conflict`. Failed/denied commands
  leave no receipt.
- **API-004**: Every appointment has Factory-owned nonnegative integer version.
  Reschedule, confirm, and cancel require exact `expectedVersion`. A mismatch or
  concurrent conditional-write loser returns safe 409
  `appointment.version_conflict` with only `{id,status,version}`. Same-version
  invalid state returns safe 409 `appointment.state_conflict`; absent/ineligible
  schedule returns a bounded code without leaking other appointment data.
- **API-005**: Exact safe conflict codes are
  `appointment.capacity_conflict`, `appointment.schedule_closed`,
  `appointment.schedule_invalid`, `appointment.version_conflict`,
  `appointment.state_conflict`, and `appointment.idempotency_conflict`.
  Permission denial precedes schedule/record detail and returns the existing safe
  authorization response. Errors never echo capacity counts, customer fields,
  notes, reasons, policy details, raw database errors, or stack traces.
- **API-006**: Service and schedule create bodies remain exact
  `{ values: Record<boundFieldKey, unknown> }`; updates are exact
  `{ expectedVersion: nonnegative safe integer, values: Record<boundFieldKey,
unknown> }` with at least one own value. Only CAP-001 bound writable fields
  are accepted. Status/version/availability/active-count/history fields are
  server-owned except that administrators may explicitly set the declared
  service active flag and schedule `open|closed` status. Each create/update has
  the same idempotency, optimistic-version, serializable transaction, receipt,
  audit, and rollback protections as appointment commands and additionally
  enforces TIM-001..005.
- **HIS-001**: Each committed command writes one append-only
  `factory.generated.appointment-history-entry/v1` row with appointment ID,
  action (`claim`, `confirm`, `move`, or `cancel`), from/to statuses,
  from/to slot snapshots, actor role, and timestamp. A slot snapshot is either
  null or exact `{scheduleId,serviceId,startUtc,endUtc,timezone}`. Move records
  both old and new snapshots; cancellation retains the previous slot snapshot.
  History snapshots are server-derived and do not change when service/schedule
  records later change.
- **HIS-002**: Cancellation reason is trimmed, 1..500 UTF-16 code units, rejects
  NUL/DEL and C0 controls except tab/newline/carriage return, persists on the
  cancelled appointment and its history entry, and renders as escaped text.
  Confirm/claim/move history has null reason. Generic safe audit remains a
  separate append-only operational record and does not replace booking history.
- **HIS-003**: The history route enforces current appointment read permission
  and record existence before returning ascending entries. Its response is a
  bounded array of exact `factory.generated.appointment-history-entry/v1`
  objects; it exposes no receipt scope/hash, capacity count, policy internals,
  or unrelated record. Pagination or the accepted fixed response bound applies
  before a definition can permit histories beyond that bound.

### Atomic claim, release, move, and replay semantics

- **TXN-001**: Claim runs inside one serializable transaction. It revalidates
  current authorization context, service, schedule, interval, timezone, status,
  and capacity; counts active appointments for that exact schedule; requires
  `count < capacity`; then writes one requested appointment at version 0, one
  claim history entry, one audit/effect set, and one receipt. All commit or all
  roll back.
- **TXN-002**: Release is the cancel transition in one serializable transaction.
  It conditionally matches appointment ID, active status, and expected version,
  sets cancelled/reason, increments version once, and writes history,
  audit/effects, and receipt. Capacity is released by the committed change in
  active-count membership; no mutable counter is decremented separately.
- **TXN-003**: Move runs in one serializable transaction. It conditionally
  matches the same appointment and expected version, rejects the current
  schedule as the target, validates the target as in claim, counts target active
  appointments excluding the moving record, requires capacity, updates only the
  same appointment's schedule/status/version, and writes one move history row,
  audit/effects, and receipt. The old capacity release and new claim become
  visible in the same commit; there is no intermediate free or double-booked
  state.
- **TXN-004**: Confirm changes only `requested -> confirmed`, retains the same
  capacity membership, increments version once, and atomically writes history,
  audit/effects, and receipt. It revalidates the appointment's stored schedule
  integrity but does not require the schedule to remain open after a prior
  successful claim.
- **TXN-005**: Prisma uses `Serializable` isolation with bounded retry only for
  recognized serialization/write conflicts. Each retry starts the whole
  transaction and repeats authoritative validation/counting. Exhaustion returns
  a safe retryable conflict, not success. In-memory tests use one owned
  transactional critical section with snapshot rollback. Neither implementation
  may count outside the transaction, trust a cached count, or expose a
  count-then-write gap.
- **TXN-006**: A crash before commit leaves no record, version, history, audit,
  effect, or receipt. A crash after commit is recovered by receipt replay after
  process reconstruction. Injected failure after every write boundary must prove
  total rollback. A replay never recomputes a historical response from later
  schedule/service values and never re-applies capacity effects.

## Security, privacy, supply chain, and operability

- **SEC-001**: Browser, provider, definition, Graph, IDs, role headers, capacity,
  availability, timestamps, timezones, and command bodies remain untrusted.
  The server uses the verified Published Graph and immutable composition lock,
  resolves the actor, authorizes each entity/action, and validates all current
  referenced records before mutation. An ID alone grants no access.
- **SEC-002**: Customer access is role-wide in this local fixture because v1 has
  no verified identity-to-appointment ownership contract. Screens may avoid
  showing unrelated records, but that is not an authorization boundary. Public,
  external, multi-user, or multi-tenant deployment is blocked until a separate
  accepted identity/ownership/tenant decision and adversarial verification exist.
- **SEC-003**: Bound strings use existing identifier and safe-text limits.
  Lists/history paginate or enforce an accepted bounded maximum; count queries
  are indexed by schedule reference and status; idempotency keys and retries are
  bounded. No caller may cause arbitrary timezone enumeration, source execution,
  unbounded history expansion in one response, or raw SQL interpolation.
- **SEC-004**: Generated history, receipts, audit, evidence, screenshots, and
  logs exclude credentials and raw model prompts/responses. Evidence uses
  synthetic names and bounded safe summaries. Notes and reasons are untrusted
  data and render escaped. No generated application receives platform/model
  credentials.
- **LIC-001**: No external source or package is proposed. Existing first-party
  templates and built-in runtime APIs require no new license notice. Any future
  calendar/timezone package triggers separate source, license, integrity, and
  governance review.
- **OPS-001**: Generated Appointment applications add local tables/indexes for
  appointment records, receipts, and history inside the existing isolated
  PostgreSQL preview. They add no service/topology. Preview binds loopback,
  carries no deployment authority, and must prove exact project/container/
  network/volume cleanup.

## Consequences

### Positive

- **POS-001**: Appointment becomes a genuinely different runtime family with a
  server-authoritative scarcity invariant, rather than a calendar-shaped CRUD
  screen or renamed approval flow.
- **POS-002**: One versioned capability can support different service, schedule,
  appointment, and field names through owner-aware bindings without a
  product-key compiler branch.
- **POS-003**: Derived availability plus serializable count-and-write avoids a
  separately mutable capacity counter and makes claim/release/move rollback
  inspectable.
- **POS-004**: Slot snapshots preserve what the customer and staff acted on even
  if schedule presentation data later changes.

### Negative

- **NEG-001**: Serializable contention can reject or retry concurrent claims;
  this is an intentional correctness cost. The first version is suitable for
  local/small-service evidence, not a claim of high-volume production capacity.
- **NEG-002**: The generated schema/API/runtime/UI grows with receipts, versions,
  booking history, and schedule guards. Generic CRUD cannot own these mutations.
- **NEG-003**: Runtime timezone acceptance depends on the accepted Node image's
  ICU/tzdata. A future reproducible timezone-data pin or external calendar
  integration requires another governed decision.
- **NEG-004**: Local roles do not establish record ownership. The product can be
  locally useful and testable, but public customer deployment remains blocked.

## Alternatives considered

### Extend `core.scheduling@1.0.0` in place

- **ALT-001**: Add interval, timezone, and booking behavior under the existing
  version and digest.
- **ALT-002**: Rejected because accepted package bytes/digest and historical
  composition locks are immutable, and `schedule.plan/v1` promises no capacity
  semantics.

### Publish `core.scheduling@1.1.0`

- **ALT-003**: Expand the existing family with optional booking bindings.
- **ALT-004**: Rejected for v1 because planning and atomic reservation have
  materially different API, persistence, retry, and security contracts. A
  distinct package makes absence of capacity enforcement unambiguous.

### Use generic CRUD plus a preflight availability check

- **ALT-005**: Read current appointment count in the browser or API, then create
  or move through generic mutation.
- **ALT-006**: Rejected because concurrent callers can pass the same preflight
  and overbook. UI availability is advisory; only the atomic server command is
  authoritative.

### Store and increment an `available` counter

- **ALT-007**: Persist a writable remaining-capacity field and update it for
  claim/release/move.
- **ALT-008**: Rejected because it introduces a second mutable source of truth
  that can drift from appointment records and invites forged client values.
  Derived active count is sufficient for the bounded experiment.

### Model arbitrary overlapping intervals and resources now

- **ALT-009**: Compute availability across staff, rooms, services, recurrence,
  buffers, and overlapping timestamps.
- **ALT-010**: Deferred because it changes the conflict key and resource model.
  The proposed reusable unit is one administrator-created schedule record with
  positive capacity.

### Use a timezone/calendar dependency

- **ALT-011**: Add a date-time library or external calendar service.
- **ALT-012**: Rejected for this bounded slice because canonical UTC instants and
  labelled IANA display need no new dependency. Recurrence/DST arithmetic and
  external synchronization remain explicit exclusions.

### Reuse Approval or Task mutation contracts directly

- **ALT-013**: Rename an existing workflow and attach schedule fields.
- **ALT-014**: Rejected because those runtimes enforce no shared capacity or
  atomic old-slot release/new-slot claim. Their transaction patterns may be
  reused only through new appointment-specific code and tests.

## Ownership, migration, rollback, and abort conditions

- **OWN-001**: PM owns exact-hash decision recording, contract freeze,
  assignments, acceptance state, and ledger. A Graph/capability owner owns the
  package/binding/structural witness. One serialized compiler/runtime owner owns
  generated schema/API/store/UI integration. Root/controller alone owns local
  services, acceptance evidence, Git, and delivery.
- **OWN-002**: Shared capability manifest, selectors, generated contracts,
  database target, emitted runtime, and end-to-end path are serialized work.
  Frontend/backend parallel writers are prohibited until PM records exact frozen
  request/response/error/actor contracts and disjoint paths. Any identifier,
  binding, body, state, error, transaction order, or history change stops both
  paths and returns to contract review.
- **MIG-001**: Before implementation, capture a source-base-anchored exact
  compatibility baseline for all seven accepted definitions and retain the
  existing six-definition historical snapshot. Add failing focused contract and
  concurrency tests; implement the shared capability/profile; run the
  cross-package gate once; only then add the Appointment definition and execute
  actual admission. Never regenerate an expected baseline from changed output
  to hide drift.
- **MIG-002**: No existing Graph, Published revision, Composition, database,
  Compilation, or package is migrated. Only a new Draft selecting the exact new
  package can publish the new behavior. Historic Graph V1 bytes and hashes stay
  immutable.
- **ROL-001**: Before any Appointment Publish, rollback removes the new package,
  selector, and conditional generated profile while keeping all seven outputs
  exact. After an Appointment Published Graph exists, stop new selection and
  admission but retain its exact package, reader, compiler, and generated
  runtime support. Never rewrite or delete immutable evidence to simulate
  rollback.
- **ROL-002**: A failed transaction rolls back only its appointment command.
  A failed isolated preview is stopped by exact owned project identity and its
  owned containers/network/volumes are verified absent. No broad Docker prune or
  unrelated resource deletion is authorized.
- **ABT-001**: Stop on mutable-Draft compilation, old-output drift, in-place
  `core.scheduling` mutation, package/product-name branching, relation inference
  by label, count outside transaction, unbounded retry, capacity overwrite,
  partial old/new slot effects, replay with a new effect, missing history
  snapshot, unsafe timezone inference, role-header trust without server policy,
  or unexpected dependency/topology/security expansion.
- **ABT-002**: Stop admission if PostgreSQL cannot prove capacity under an
  actual simultaneous claim/move race, if restart replay duplicates an effect,
  if rollback leaves any receipt/history/audit mutation, if provider-free
  emitted UI fails before image construction, or if ordinary review retains any
  P0/P1/P2. Execute the short admission/regression lane instead of weakening a
  bound, omitting a business transition, or counting a partial product.

## Acceptance and evidence gates

- **VER-001 — Contract RED/GREEN**: Capability tests prove exact manifest
  coordinate/effect/interface/bindings, digest/package verification, strict
  parameters, owner/type/required checks, and immutable capture. Structural
  selector tests cover renamed valid fields plus every missing, extra,
  duplicate, reversed, cross-entity, wrong-type, wrong-enum, wrong-domain,
  relation, role, permission, flow, lock, and package-version failure.
- **VER-002 — Compatibility**: Compare every generated file and ordered manifest
  for all seven accepted definitions to the source-base baseline; preserve the
  historical six-definition fixture hash. Compile the new exact Published Graph
  twice and compare ordered files/hashes. Prove Graph/Published/lock bytes remain
  unchanged after compilation and unsupported targets fail deterministically.
- **VER-003 — Interval and timezone**: Test valid UTC/offset instants,
  `Asia/Singapore`, `America/New_York`, and explicit `UTC`; reject invalid zone,
  offset-free timestamp, equal/reversed/invalid interval, inactive/missing
  service, closed/missing schedule, zero/fractional/out-of-range capacity, and
  forged availability. Prove canonical UTC/timezone persistence and labelled
  display after reload.
- **VER-004 — In-memory mutation**: For claim, confirm, move, and cancel, prove
  exact success/version/history/receipt/audit effects; same-key replay; changed
  payload conflict; stale version; wrong role/state; invalid shape; missing
  reference; same-slot move; terminal cancel; and no writes on rejection. Inject
  failure after each write boundary and prove complete snapshot rollback.
- **VER-005 — PostgreSQL concurrency**: Against actual generated Prisma schema
  and PostgreSQL, race at least two claims for a capacity-one schedule and prove
  exactly one active appointment. Race distinct-key move/claim and move/move
  operations into the last target capacity and prove at most capacity commits,
  the loser remains unchanged, old capacity is not released on failed move, and
  receipt/history/audit counts match committed commands. Repeat with capacity
  greater than one and with unrelated schedules to detect accidental global
  serialization.
- **VER-006 — Recovery and integrity**: Simulate lost response after commit,
  reconstruct the runtime/store, replay, and prove the exact stored response and
  no duplicate effect. Corrupt or orphan trusted schedule/appointment data in a
  controlled test and prove read/mutation fails closed without repair. Verify
  schedule update guards against active-booking interval/timezone/service
  changes and capacity below active count.
- **VER-007 — Generated UI**: A provider-free emitted browser test runs before
  image construction with at least three records, a long service name, requested,
  confirmed, and cancelled states, reschedule and conflict recovery, closed
  history, loading/error/empty/media-fallback states, and explicit timezone
  labels. At 390/768/1440 px and light/dark themes, assert no document overflow,
  44 px primary controls, labels/focus, visible icons, reachable actions, and no
  hidden service/slot/timezone/status.
- **VER-008 — Actual product journey**: From one immutable Published Graph and
  isolated Compilation, create/reload a requested appointment, confirm it, deny
  a simultaneous second claim, move the same record, prove old capacity release
  and new capacity claim, cancel with persisted reason, reclaim the released
  slot with another record, replay after lost response/restart, deny stale/
  forged/forbidden commands, and inspect both slot snapshots in history.
- **VER-009 — Commands**: The implementation plan must name focused files, but
  the minimum integrated gate includes:

  ```text
  pnpm --filter @factory/graph test
  pnpm --filter @factory/capabilities test
  pnpm --filter @factory/adapters test
  pnpm --filter @factory/compiler test
  pnpm --filter @factory/compiler-worker test
  pnpm --filter @factory/graph --filter @factory/capabilities --filter @factory/adapters --filter @factory/compiler --filter @factory/compiler-worker typecheck
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  pnpm exec playwright test e2e/appointment-booking.spec.ts --workers=1
  ```

  Focused RED/GREEN, generated in-memory, actual PostgreSQL concurrency, and
  emitted browser checks are mandatory evidence; a broad green suite cannot
  substitute for them.

- **VER-010 — Review and ledger**: Apply one shared-contract task review,
  independent QA, independent release review, and final ordinary-product review
  with no open P0/P1/P2 before admission. Record exact ADR/source/baseline hashes,
  test counts, failed attempts and repairs, ready/full-journey times, fixture vs
  real-model calls, technical handoffs, manual rescue, source identity, and exact
  cleanup in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Proposed safe evidence home is
  `docs/acceptance/evidence/appointment-booking/`.
- **VER-011 — Claim limits**: Report this as local authored-fixture evidence.
  Keep real-model evidence, ordinary-user observation, external identity,
  multi-tenant security, backup/restore, production load, hosted delivery, and
  cloud deployment as separate unproven claims. Count the eighth definition and
  fourth runtime family only after VER-001..010 pass.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and `docs/delivery-policy.md`.
- **REF-002**:
  `docs/superpowers/specs/2026-09-18-appointment-booking-v1-design.md`,
  `docs/superpowers/plans/2026-09-13-product-definition-scale.md`, and
  `docs/superpowers/plans/2026-09-17-iteration-engineering-optimization.md`.
- **REF-003**: `docs/adr/adr-0006-typed-capability-binding-validation.md`,
  `docs/adr/adr-0007-serialized-owner-aware-composition-selections.md`,
  `docs/adr/adr-0008-immutable-composition-resolution-input.md`,
  `docs/adr/adr-0060-approval-correction-and-resubmission.md`, and
  `docs/adr/adr-0063-task-mutation-safety-and-retry-contract.md`.
- **REF-004**: `packages/capabilities/src/assets/core/scheduling.ts`,
  `packages/capabilities/src/assets/contract.ts`,
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/src/product-composer.ts`,
  `packages/graph/src/model.ts`, and current generated mutation stores.
