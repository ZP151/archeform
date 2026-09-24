---
title: "ADR-0082: Appointment Administrator Setup Updates"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "decision", "appointment", "administrator", "generated-api"]
supersedes: ""
superseded_by: ""
---

# ADR-0082: Appointment Administrator Setup Updates

## Status and recommendation

**Proposed.** Recommendation: **migrate** the undelivered Appointment V2 setup
surface to the narrowly specified create/update boundary below. Keep its accepted
Graph, roles, seven capability locks, booking commands, runtime stack and old
generated artifacts. This supplements, rather than edits or replaces, accepted
ADR-0081 SHA-256
`65f867c7afeeefc892b8493e508d86d5d212302fcc247e927843ce05b6672adc`.

No implementation is authorized by this proposal. PM must obtain an independent
exact-hash standing-eligibility review and record acceptance before dispatch.
The restrictions on editing currently referenced slots and the additional setup guarantees are
explicit proposed business/API decisions, not consequences already authorized by
ADR-0081. The reviewer must assess their materiality and scope. A material choice,
security weakening, uncertainty or failed standing verdict stops implementation;
the proposer cannot declare founder acceptance. No services, provider calls,
Product Publish, repository release, cloud action or deployment is authorized.

## Context and actual implementation

- **CTX-001**: The current authorities are `docs/tech-governance.md` and
  `docs/threat-model.md`. The latest Task 3 checkpoint in the consumer delivery
  ledger pauses source writes before presentation edits. Task 1 admission and
  Task 2 compiler reads have passed independent source review and deterministic
  QA; Task 2 has 163 passing focused cases. This is not delivered V2 acceptance.
- **CTX-002**: Actual emitted-method evidence is retained at
  `docs/acceptance/evidence/appointment-consumer-workspace/setup-update-gap.json`.
  Its source probe/report is under `generated/.appointment-v2-task3-ui/`.
  The emitted `api/src/main.ts` hash is
  `9b7f9e517f57eab023ae3fed7597c90b97ff74bb057e2d0c806849166d7cad96`;
  `api/src/application-runtime.ts` is
  `981161d192524b6e4c994f0667f84c2b07ee6f30a9a0a22843bbf2110821d2ce`.
  The controller has GET list/read and POST create/events, plus Appointment reads;
  it has no PATCH/PUT. `ApplicationRuntime` has no generic update method.
  `RecordStore.update` is an internal primitive, not an authorized API.
- **CTX-003**: `packages/compiler/src/index.ts` emits generic create with policy,
  Factory-owned ID rejection, unknown-field and missing-required-field checks.
  The locked `core.crud@1.0.1` handler delegates directly to `store.create`.
  Generic create does not itself enforce scalar types, positive domains, enum
  membership, reference existence, UTC order or IANA timezone validity. Prisma
  supplies some database type/constraint enforcement; in-memory storage does not
  supply an equivalent domain validator. Graph validation proves the schema, not
  individual runtime request values. Generic create then appends an audit event
  outside a single create-plus-audit transaction. It has no setup receipt or
  caller concurrency precondition and does not execute workflow effects.
- **CTX-004**: Exact V2 already grants administrator Service/Schedule
  `create/read/update/manage`. Customer/staff have no generic Service/Schedule
  read or write. The new method exercises existing rights and grants no new
  action. Reusing a route shape alone does not authorize its implementation.
- **CTX-005**: Existing emitted Appointment transactions already provide the
  notification-backed in-memory mutation coordinator with cloned transaction
  state and rollback, plus Prisma Serializable whole-operation retries (three
  attempts). Existing receipt storage has a unique `(scope, idempotencyKey)`,
  string `command`, response status/body and request hash. Reuse these primitives;
  do not change their booking behavior or physical schemas. The V2 read index
  already participates in create/update and transaction-state copying.
- **CTX-006**: Accepted ADR-0081 API-007 and emitted `readAppointmentSummary`
  use the latest non-null history snapshot, falling back to the current Schedule
  only when there is no history. Existing booking transitions obtain their next
  `fromSlot` snapshot from the currently referenced Schedule; reschedule changes
  the Appointment's reference to the destination. Thus current references need
  protection from silent retiming, while history-only references do not: their
  stored snapshots remain valid without freezing the current Schedule forever.

## Current and proposed profiles

- **CUR-001**: Retain ADR-0081 CUR-001's exact Golden profile: Node
  `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `5.9.3`, Next `15.5.22`,
  React/React DOM `19.2.8`, NestJS `10.4.22`, Prisma `6.19.3`, BullMQ
  `5.81.2`, ioredis `5.11.1`, Puck `0.22.3`, XYFlow `12.11.2`, and its
  floating-major Docker images. Root/package manifests, `pnpm-lock.yaml`,
  Dockerfiles and Compose retain their current ranges and pins. No dependency,
  manifest, lockfile, provider, database technology, service or topology changes.
- **PRO-001**: Retain `appointment-booking-v2`, definitionVersion `1.0.0`,
  family `appointment-booking/v2`, presentation/compiler `appointment-booking@2.0.0`,
  and `appointment-workspace-presentation@1.0.0`. Retain Graph
  `factory.application-graph/v1`, Blueprint `factory.product-blueprint/v1`,
  definition data `factory.product-definition-data/v1` and composition plan
  `factory.composition-plan/v1`. All seven ADR-0081 PRO-002 locks/digests and
  their asset bytes remain unchanged. Add compiler-private setup contract
  identifier `factory.generated.appointment-setup/v1`; it is not a new capability.
- **PRO-002**: Retaining `2.0.0` is justified only because Task 3 stopped before
  UI implementation, default selection and V2 delivery; the ledger records no
  accepted V2 Published/Compilation product. Existing Task 2 synthetic output
  remains evidence of that source checkpoint, never silently recaptured.
  PM must verify this premise before acceptance. Any discovered delivered V2 or
  protected immutable V2 output is an abort condition requiring a new versioned
  decision. No existing Published Graph or Compilation is rewritten.

## Decision: precise amendment to ADR-0081

- **AMD-001**: Amend UIR-005's assumption of existing CRUD and its disclaimer of
  new administrator transaction/idempotency guarantees. V2 receives the explicit
  update method, strict setup create admission, atomic audit and isolated setup
  replay below. These are newly proposed guarantees. Retain its visible fields,
  human selectors, input retention and synthetic-demo explanation.
- **AMD-002**: Extend PRO-002's description of a separately versioned read-only
  compiler projection and EFF-001's read-only API-effect description to include
  this compiler-owned setup surface. The capability locks and booking mutation,
  receipt and history contracts themselves are unchanged. WIT-001 administrator
  permissions remain unchanged; WIT-003 gains only V2 setup emission.
- **AMD-003**: Extend IMP-003's serialized compiler ownership and UIR-007/008's
  recovery pattern to setup writes under the distinct protocol below. Add setup
  update/create, race and retry cases to TST-001/002/004/005. All other ADR-0081
  clauses, including availability, summary, clocks, read IDs, selection,
  historical bytes, UI reuse, booking commands and delivery gates, retain force.

## Decision: HTTP and authorization contract

- **API-001**: Emit only after the existing complete immutable V2 witness:
  `PATCH /api/:entity/:recordId`, where entity equals the bound Service or
  Schedule key. Add no generic update permission, arbitrary entity update or
  Appointment PATCH. The existing `POST /api/:entity` dispatches those two
  bound entities to the setup-create method; all other POST behavior is unchanged.
  Preserve existing authorized GET list/read for loading setup forms. Emit
  private `ApplicationRuntime.appointmentSetupCreate` and
  `ApplicationRuntime.appointmentSetupUpdate`; their server context and policy
  validation cannot be bypassed through generic `create` for these V2 entities.
  Do not expose a generic `ApplicationRuntime.update`.
- **API-002**: Resolve the existing fixture session and immutable Graph/application
  binding at the server; require role exactly `administrator` and the existing
  policy's `create` or `update` action on the bound target, respectively. Check
  `read` on the target as well because the response and expected snapshot are
  full setup records. For Schedule, also require bound Service `read` before
  reference lookup. Authenticate and authorize before target/reference/receipt
  lookup or request-specific existence checks, in both API and runtime entry.
  Actor, role, session, graph hash and receipt scope are server-derived. Retain
  fixed fixture authentication time; no browser role/header claim grants access.
- **API-003**: POST body remains the flat object of all three Service or all six
  Schedule values. PATCH body is exactly `{ expectedValues, values }`, both full
  objects containing every allowed field exactly once, not partial merge patches.
  All create/update requests require one scalar `x-factory-idempotency-key`
  matching `^[A-Za-z0-9._:-]{1,128}$`. Reject missing/duplicate headers, null,
  arrays, unknown envelope/field members and client `id`, `version`, actor or
  scope. JSON scalar types are exact; do not coerce strings to numbers/booleans.
  POST success is 201; PATCH success is 200; response is exactly the saved
  `StoredRecord` with `id` and its allowed fields. No version field is invented.
  No API-version member is added to old record shapes; the private contract
  identifier documents this exact protocol.
- **API-004**: These two setup routes accept no query parameters, including
  unknown or duplicated names. An empty query string is equivalent to none.
  Target record ID and Schedule's Service ID use ADR-0081 API-009's exact
  1..128 ASCII regex, case sensitivity and no-normalization rules. A route ID
  decodes exactly once; a JSON Service ID is already decoded and is never URL
  decoded. Reject malformed URL escapes/UTF-8, double encoding, separators,
  arrays, whitespace and controls. Check raw path before framework decoding can
  reject it outside the safe boundary, after authentication. Exact entity keys
  come from the witness; other targets fail 403 without lookups.
- **API-005**: All success and error responses carry `Cache-Control: no-store`.
  Errors contain exactly `{ code }`, never raw inputs or database messages:

  | Status | Code                                     | Meaning                                                        |
  | ------ | ---------------------------------------- | -------------------------------------------------------------- |
  | 400    | `appointment.setup_invalid_request`      | Body, header, query, ID, scalar, domain or temporal validation |
  | 400    | `appointment.setup_invalid_reference`    | Authorized Schedule operation has a nonexistent Service        |
  | 403    | `appointment.forbidden`                  | Missing/invalid session, wrong graph, role, policy or target   |
  | 404    | `appointment.setup_not_found`            | Valid authorized update target absent                          |
  | 409    | `appointment.setup_conflict`             | Expected values differ from the current target                 |
  | 409    | `appointment.setup_slot_in_use`          | Attempt to change a currently referenced slot's identity       |
  | 409    | `appointment.setup_capacity_conflict`    | Proposed capacity below current occupancy                      |
  | 409    | `appointment.setup_idempotency_conflict` | Same scoped key with different request hash                    |
  | 409    | `appointment.setup_retryable_conflict`   | Existing Serializable retry budget exhausted                   |
  | 503    | `appointment.setup_unavailable`          | Unexpected storage/API/proxy failure; outcome may be uncertain |

  Authorize first, validate syntax next, then check a matching scoped receipt.
  For a new intent, lookup target, compare expected values, validate reference,
  then current-reference and capacity predicates before writing. A receipt replay returns
  its saved response despite later record changes. A malformed HTTP/JSON body
  on these routes must receive the bounded 400 body, not framework debug output.

- **API-006**: The existing same-origin `web/app/api/[...path]/route.ts` forwards
  PATCH for these exact V2 targets and forwards the existing trusted fixture
  session context and scalar idempotency key. Preserve upstream status/code and
  no-store. Forward neither actor assertions nor arbitrary privileged headers.
  Do not silently drop query parameters or decode IDs twice. Suppress automatic
  proxy retries for setup writes; transport failure returns the safe 503 and the
  browser retains its command. Existing booking proxy behavior remains unchanged.
- **API-007**: Controller catches cannot bound malformed JSON or path-decoding
  failures that occur before controller dispatch. The V2 emitted bootstrap must
  install a setup-scoped boundary in this order before Nest initialization/listen:
  raw-path/method recognition and authentication/authorization guard; registration
  of the existing Nest/Express body parser with unchanged default limits/options;
  setup-only parser-error translation; then normal route initialization. The
  error translator must run after parsing and before the framework's generic
  error handler. A recognized setup request with invalid authentication fails
  403 before parsing; an authorized malformed setup JSON/path fails bounded 400
  with no-store and no parser diagnostics. Preserve the raw-path guard's
  once-decoded ID rules. Use only the already declared Nest/Express runtime,
  without adding packages or changing global body-parser semantics. Non-setup
  requests/errors pass through to the original behavior; do not globally rewrite
  malformed booking or unrelated-route errors. Bootstrap-order tests must prove
  this pipeline, not merely invoke controller methods with pre-parsed objects.

## Decision: fields and business semantics

- **VAL-001**: Resolve allowed fields from the frozen binding/profile, never from
  client labels. Service fields are `serviceNameField`,
  `serviceDurationMinutesField`, `serviceActiveField`: name is a string whose
  trimmed content is nonempty, duration is a positive safe integer, active is
  a boolean. Preserve the name exactly; rendering escapes text. No new name
  uniqueness or duration maximum is imposed. For persisted Prisma integer
  parity, duration and capacity cannot exceed `2147483647`.
- **VAL-002**: Schedule fields are `scheduleServiceReferenceField`,
  `scheduleStartField`, `scheduleEndField`, `scheduleTimezoneField`,
  `scheduleCapacityField`, `scheduleStatusField`. Require an existing Service,
  UTC strings exactly equal to `new Date(value).toISOString()` with a four-digit
  year, finite valid instants and `start < end`, a nonempty IANA zone accepted by
  `Intl.DateTimeFormat` and matching `^[A-Za-z][A-Za-z0-9._+/-]*$`, capacity a
  positive safe integer within the persisted integer limit, and status exactly
  `open` or `closed`. Keep the timezone string unchanged. The UI can convert
  labelled UTC inputs to canonical UTC before confirming; never infer a zone.
  This matches discovery's canonical outputs and uses built-ins only.
- **VAL-003**: Apply VAL-001/002 on both V2 setup create and update server paths.
  UI-only checks are insufficient: forged create could otherwise persist an
  invalid schedule that discovery hides and booking rejects. The new create
  validation is a deliberate amendment, not a claim about current generic CRUD.
  No historical row is normalized or migrated. Expected values use the same
  field shapes/types and canonical dates as GET serialization; equality is
  field-by-field exact scalar equality, independent of JSON key order. Internal
  Prisma Date objects are serialized canonically before comparison.
- **BIZ-001**: An inactive Service may have open or closed schedules; both are
  valid setup states, but discovery and new claim/move continue excluding an
  inactive Service. Service rename/duration/active changes are permitted even
  with bookings. They do not resize slots, rewrite appointments, auto-cancel or
  re-confirm. Summary deliberately shows current Service metadata as ADR-0081
  already specifies. UI explains that existing booking labels may reflect edits.
- **BIZ-002**: A slot's identity is its Service reference, start, end and timezone.
  It may be corrected only while no Appointment currently references that
  Schedule, including cancelled and seeded/no-history records. While a current
  reference exists, preserve those four values; an administrator can create a
  replacement slot and close the old slot instead. Current references protect
  the existing record-to-Schedule relationship, subsequent booking snapshots
  and the accepted no-history summary fallback, regardless of occupancy/status.
  Cancellation leaves that reference intact; rescheduling moves it. When the
  final current reference moves away, the old Schedule becomes editable again.
  History-only `fromSlot`/`toSlot` references never prevent an edit, however old
  or numerous: their bytes and the summaries derived from them remain unchanged.
  Do not add a permanent ever-used flag or search history to authorize setup
  edits. This is reference protection, not permission to relocate a currently
  referenced Appointment. No deletion, retargeting or history rewrite is added.
- **BIZ-003**: Capacity and open/closed status remain editable on referenced slots.
  Capacity must be at least the transaction's requested-plus-confirmed occupancy;
  cancelled appointments do not consume capacity. Equality is allowed and means
  full. Increasing capacity exposes additional availability; lowering it never
  evicts a booking. Closing a slot or deactivating its Service removes future
  discovery/new claim/move eligibility and preserves all existing bookings.
  Existing confirm/cancel behavior is unchanged: do not add eligibility checks
  to those commands. Reopening/reactivating restores only otherwise eligible
  availability; past/full slots remain absent.
- **BIZ-004**: Permit valid past schedules for correction/history consistency;
  do not introduce future-only mutation admission. Do not require duration to
  equal slot length, synthesize subdivisions, prohibit overlap, validate calendar
  recurrence or infer DST wall-time intent. The immutable UTC instants and stored
  zone define the slot. Existing booking claim/move remains unchanged, including
  its past-start behavior. No setup operation writes Appointment records,
  existing booking receipts or booking history, or triggers booking transitions.
- **BIZ-005**: Expose BIZ-001/002/003 consequences next to relevant admin fields
  and after conflict. Explain that current Appointment references block slot
  identity correction, while past history alone does not. Do not label a slot
  permanently locked because it was once booked. After a reschedule, refreshing
  setup permits correction if no current references remain. Do not claim
  edit-in-place of a currently referenced Appointment's time is supported.
  Retain desired input on rejection, display authoritative current values
  separately, and require deliberate review before a replacement slot or revised
  save. These conservative proposed restrictions support correction without
  deciding how to relocate customers; mass relocation is outside this repair.

## Decision: concurrency, replay, audit and effects

- **TXN-001**: A setup operation runs inside the existing `store.inTransaction`.
  The same in-memory coordinator and Prisma Serializable transaction protect
  setup versus setup and setup versus booking. Inside it, check scoped receipt,
  expected snapshot, Service existence, current-reference predicate and occupancy, then
  save the record, append audit and save receipt. Roll all of these back together
  on failure, including V2 read-index changes. Do not nest generic runtime create,
  which appends its own audit outside this operation; reuse its underlying CRUD
  primitive after the strict setup validator. No optimistic version column,
  schema migration or new transaction engine is needed.
- **TXN-002**: Full `expectedValues` is a semantic compare-and-set precondition:
  two conflicting edits from one snapshot cannot silently overwrite each other.
  It is not a monotonic revision and cannot detect an A-to-B-to-A sequence; exact
  current field equality is the promised boundary. In a transaction retry, use
  the original expected snapshot, body, key and actor, never refresh them. An
  equal-value save with a new key is a valid deliberate intent and has one audit;
  repeated delivery of that same key has no additional audit or effect.
- **TXN-003**: Reuse the existing receipt table/store without changing its schema,
  old rows or booking namespace. Setup scope is the literal prefix
  `factory.generated.appointment-setup/v1:` followed by lowercase SHA-256 of
  canonical JSON array `[graphHash, serverFixtureSessionScope, role, entityKey,
recordIdOrCreate, command]`, where create uses `$create`, and command is exactly
  `setup-create` or `setup-update`. The literal prefix ensures disjointness from
  old booking digest-only scopes. `requestHash` is lowercase SHA-256 of recursively
  key-sorted canonical JSON of the validated body; preserve scalar contents.
  Store the new command string, generated record ID, 201/200 saved status, saved
  response record and server UTC creation time in the existing columns. Do not
  repurpose, read or overwrite a booking scope or return setup receipts through
  booking endpoints. Reject same-key/different-body reuse with 409. Matching
  retry returns the prior saved response across API process restart and adds
  no write, audit, history, capability event or notification.
- **TXN-004**: Audit exactly once per successful new setup intent using existing
  `{ actor, action, entity, recordId, at }`: actor is the authorized role,
  action `create` or `update`, and time server UTC. No request body, old/new field
  values, session identifier or secret enters audit/log/evidence. Existing
  generic create already appends this create audit but lacks atomicity. This
  proposal makes setup audit atomic and adds the missing update audit; it does
  not claim those guarantees already existed. Setup executes no workflow
  effects and appends no capability event, booking history or notification.
  Receipt responseBody is authorized setup business state, as with existing
  business receipts, not raw request storage or model material.
- **TXN-005**: Add private store queries for current-reference existence and occupancy:
  Prisma uses projected `findFirst`/existence on the bound Appointment Schedule
  reference without a status filter, and
  `count` with exact requested/confirmed filters for one Schedule. Do not load
  all appointments into application memory or query history for setup admission.
  These are database predicate
  queries, not a claim of a fixed scan-work budget without supporting indexes.
  In-memory can maintain current reference counts at Appointment seed/create/update,
  subtracting the previous reference and adding the new one on reschedule,
  copied/rolled back with transaction state; its result must equal Prisma.
  Historical appends never add a current reference. Preserve all existing
  history/read budgets and index guarantees. Race tests must
  prove an accepted slot identity change cannot interleave with a claim using
  its old identity; either serialized order is valid. Capacity reduction racing
  a claim either observes the claim and conflicts, or commits first and the
  unchanged claim predicate sees the reduced capacity.
- **UXR-001**: Before submit, validate all fields, explicitly confirm desired
  values, allocate one key, and freeze URL/method/body bytes/key/expected snapshot
  and actor in page memory. Disable edits and duplicate submit while pending or
  uncertain. On network loss/503, retain the command and show uncertainty with
  an explicit same-command retry. Never retry with a new key or actor. A definite
  400/403/404/409 retains input; refresh authorized current data where possible,
  explain the failure and require deliberate revised submission with a new key.
  On successful receipt replay, refresh GET/list before enabling another edit;
  the returned receipt may be older than the current record. No automatic retry
  after full browser reload: reload setup records, require conscious review,
  and explain that an interrupted create may already exist. Do not infer create
  identity from a nonunique name or silently submit a duplicate. Preserve
  ADR-0081's separate booking recovery unchanged.

## Alternatives and consequences

- **ALT-001**: Add only a policy-checked PATCH calling `store.update`, retain
  current create, and warn on uncertain writes. Rejected: stale forms overwrite
  concurrent edits, direct writes bypass temporal/reference validation, and an
  audit failure can leave an unreported write. It does not satisfy the current
  threat-model requirements for state-changing idempotency/concurrency and safe
  audit evidence. A visible warning is not a replacement for those controls.
- **ALT-002**: Add full expected-value compare-and-set plus transaction, but no
  receipt; on uncertainty only reload and ask the user to reconcile. This is the
  smallest defensible update-only alternative, with naturally repeatable field
  assignment. Rejected for this complete setup boundary: it cannot distinguish
  applied-then-edited state from never-applied, does not prevent duplicate create
  on retry, and cannot replay a committed result across restart. It would retain
  the create-side gap while adding a different update recovery protocol. Choosing
  it would require an explicit exception to the current threat-model requirement,
  not silently treating ADR-0081's disclaimer as such an exception.
- **ALT-003**: Add a new command engine, setup revision columns, new receipt table
  or capability version. Rejected: existing transaction/receipt primitives and
  full expected fields suffice. The selected design adds two bounded methods,
  validators and private query helpers, not generic mutation extensibility or
  another booking workflow. No new business event/state machine is introduced.
- **ALT-004**: Allow time/service edits on currently referenced slots, or reject
  every edit while current references exist. Rejected: the former silently
  changes the record's current Schedule relationship and later snapshots; the
  latter prevents routine closure, metadata correction and safe capacity changes.
  Permanently freeze any historically used Schedule. Also rejected: history
  already contains immutable snapshots, and summaries consume those snapshots;
  a history-only lock adds an unnecessary business restriction. Protect only
  current references and permit correction after they have moved away.
- **POS-001**: Administrators can create and correct real setup through visible
  controls, recover uncertain writes without duplicate creation, and retain
  immutable booking evidence. Server validation and both stores agree.
- **NEG-001**: Setup POST gains required idempotency and stricter validation before
  V2 delivery; synthetic setup callers/tests must adapt. Additional setup receipt
  rows consume storage under existing local-preview lifetime/cleanup policy.
  Snapshot comparison has the stated ABA limit. Currently referenced slots
  require replacement rather than in-place retiming; cancelled records retain
  their reference. A formerly referenced slot can be corrected after all current
  references move away, even when immutable history still names it. No external
  production scale or retention claim is made.

## Implementation, compatibility, rollback and abort conditions

- **IMP-001**: After acceptance PM freezes this request/response/error/actor
  contract and assigns one serialized compiler owner. Proposed source scope is
  new private `packages/compiler/src/appointment-administrator-setup.ts`, focused
  `test/appointment-administrator-setup.test.ts`, and narrow V2-only integration
  in `src/index.ts` plus `src/appointment-consumer-read.ts` only where shared
  store index hooks require it. Exact assigned paths belong in the ledger first.
  Emitted paths affected are `api/src/main.ts`, `api/src/application-runtime.ts`,
  `api/src/prisma-record-store.ts`, `web/app/api/[...path]/route.ts`, and at most
  new `api/src/appointment-administrator-setup.ts`. Schema/migration files and
  `appointment-mutation-contract.ts` remain unchanged. A later Task 3 presentation
  owner consumes the frozen setup seam; no parallel writers on these paths.
- **CMP-001**: Historical V1 and unrelated output paths, bytes, file order,
  hashes, fixtures, locks and capability templates remain identical. Do not
  change accepted ADR-0081 bytes or recapture protected baselines. New setup code
  is gated by exact V2 admission, including persisted JSON round trip. Old
  booking function rendering, command envelopes, errors, receipt namespaces,
  history serialization and effects remain unchanged. No Graph permission,
  adapter/catalogue selection, package export or product-count change is needed.
- **ROL-001**: Before delivery, rollback discards the new V2 source delta and
  resumes the source gate; incomplete V2 remains unavailable as a fresh default.
  After any later delivery, normal versioned rollback stops fresh selection and
  retains immutable artifacts and required inspection support. Never roll an
  existing V2 database back to code that might reinterpret setup receipts; no
  destructive row deletion or migration is authorized. Root owns all delivery,
  lifecycle and cleanup operations. This proposal owns only this ADR file.
- **ABT-001**: Stop for old-byte drift, a delivered V2 discovered under the same
  coordinate, need to change schemas/locks/booking renderer or permissions,
  inability to provide atomic predicates/replay in both stores, unbounded
  application-memory history reads, a private-account claim, owner collision or
  independent-review uncertainty/material business choice. There is no requested
  irreversible step. No unresolved implementation choice may silently weaken
  the specified API, slot protection, authorization or concurrency contract.

## Verification and evidence

- **TST-001**: Start with failing emitted-method tests for the precise PATCH and
  setup POST dispatch, runtime authorization and proxy propagation. Cover V1,
  generic, mixed and malformed witnesses; deny customer/staff/forged/missing/
  wrong-application sessions before store/receipt calls, including direct runtime
  attempts and generic-create bypass. Test invalid IDs/queries/headers/bodies,
  safe errors/no-store, unknown targets and valid unknown references/record IDs.
  Add an actual emitted-bootstrap middleware/parser-order test for unauthorized
  malformed JSON, authorized malformed JSON, malformed encoded paths and valid
  setup requests. Assert the guard precedes parsing, scoped parser errors reach
  the bounded error translator, and ordinary booking/unrelated routes retain
  their prior parser/error behavior. Controller-only stubs are insufficient.
- **TST-002**: Both stores: types, null/arrays/extras/missing fields, integer
  limits, nonempty escaped names, invalid UTC dates/offsets/order, zone validity,
  open/closed, active/inactive, service existence and full expected-value
  comparison. Prove current metadata effects, no-history reference protection,
  requested/confirmed/cancelled current-reference protection, and rescheduling
  away from the final reference followed by a successful slot identity edit.
  Prove history-only references, including beyond 100 events, do not block edits;
  saved snapshot bytes and history-derived summary values remain unchanged.
  Verify reference-count rollback and that history appends do not lock a slot.
  Cover safe equal/increased/reduced capacity and preserved past/overlap/duration
  semantics. Confirm/cancel still work after closure/deactivation; discovery
  reflects valid corrections without rewriting history or current appointments.
- **TST-003**: Prove concurrent stale edits, create duplicate delivery, same-key
  changed body, cross-actor/entity/command/graph namespace separation, original
  booking key coexistence, rollback after record/audit/receipt failures, exact
  replay after restart, no duplicate audit/effect, and original snapshots on
  Serializable retries. Race first claim against slot retiming and capacity
  reduction; preserve command/history/receipt regression tests. Assert query
  shapes rather than treating an in-memory pass as PostgreSQL race evidence.
- **TST-004**: Provider-free commands after implementation:
  `pnpm --filter @factory/compiler exec vitest run test/appointment-administrator-setup.test.ts test/appointment-consumer-read.test.ts test/appointment-consumer-compilation.test.ts test/appointment-booking-runtime.test.ts test/definition-data-compatibility.test.ts`,
  `pnpm --filter @factory/compiler typecheck`,
  `pnpm --filter @factory/compiler build`, and changed-file Prettier checks.
  Strictly typecheck actual emitted controller/runtime/store/proxy, not only
  transpilation. Retain all original compatibility assertions and earlier source
  evidence; do not infer any of these passes from this proposal.
- **TST-005**: In the existing later actual-acceptance gate, extend
  `pnpm exec playwright test e2e/appointment-booking.spec.ts`: administrator
  creates then edits Service and an unused Schedule through visible controls,
  reloads, creates a booking, observes protected slot retiming, safely changes
  capacity/closes/reopens, and sees unchanged appointment/history. After staff
  reschedules the final current reference away, administrator corrects the old
  Schedule and proves retained history snapshots are unchanged. Exercise
  definite conflict, lost create/update responses and exact browser-held retry
  across API restart with real PostgreSQL, plus the existing mobile/staff journey.
  Preserve role-switch/full-reload uncertainty and keyboard/390/768/1440 evidence.
  API assertions support, rather than replace, the primary visible actions.
  No live execution is authorized to the proposer by this verification plan.
- **TST-006**: Store exact ADR/source/input hashes, commands, bounded summaries,
  request-shape assertions without raw bodies, compatibility, source review,
  deterministic QA, actual journey and cleanup evidence under
  `docs/acceptance/evidence/appointment-consumer-workspace/`; PM records state and
  decision in `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  There are zero new logical products/runtime families. Independent review
  decides standing eligibility; no acceptance result is claimed here.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`; accepted ADR-0081 and retained ADR-0071/0072/0073/0077.
- **REF-002**: `packages/compiler/src/index.ts`,
  `packages/compiler/src/appointment-mutation-contract.ts`,
  `packages/compiler/src/appointment-consumer-contract.ts`,
  `packages/compiler/src/appointment-consumer-read.ts`,
  `packages/capabilities/assets/core.crud/1.0.1/templates/api/capability-module.ts.tpl`.
- **REF-003**: Task 3 emitted prerequisite evidence and ledger checkpoint cited
  in CTX-001/002; `docs/superpowers/plans/2026-09-24-appointment-consumer-workspace.md`.
