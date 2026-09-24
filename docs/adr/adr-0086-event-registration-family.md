---
title: "ADR-0086: Event Registration Family"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "events", "compiler", "capacity"]
supersedes: ""
superseded_by: ""
---

# ADR-0086: Event Registration Family

## Status and recommendation

**Proposed. Recommendation: experiment** with one fixed, synthetic-local
`event-registration/v1` family and canonical `community-event-registration@1.0.0`
definition. A person finds a dated event, reserves one place, cancels or registers
again; an organizer manages capacity, cancels an event with a visible reason,
and records actual attendance, including undoing a mistaken check-in. This is a
shared event with an attendee roster, not
Appointment's service/slot/request/confirmation workflow.

This document grants no implementation or execution authority. PM must record
exact-hash founder acceptance, directly or through a separate qualified reviewer
under the standing policy, before assigning implementation. The proposer cannot
provide that acceptance. The rejected Workbench startup remains blocked: no
startup, listener, service, database, Docker, provider, cloud operation or cleanup
is authorized, and no alternative route may retry it. Source acceptance, actual
local business/visual acceptance and hosted delivery remain separate.

## Context and retained profile

- **CTX-001**: Inspected source HEAD is
  `4081594b8bb338db05d9817d3837d32c195f99b2`. The active consumer ledger assigns
  only this new ADR to `event_registration_decision`; root owns the ledger and CI.
  At handoff the catalogue has 13 physical rows, 12 logical definitions and eight
  registered families. Actual evidence remains ten definitions/six families with
  the existing Appointment UI qualification; hosted count is zero. This candidate
  changes none of those counts.
- **CTX-002**: Wave E in the September 24 family plan requires phone discovery
  and registration, desktop attendee/capacity/check-in work, cancellation and
  retained material requirements. Ordinary users should describe the job and use
  its result without operating Graph, Publish, Compile or verification controls.
  Additional definitions reuse a frozen family through data, rather than adding
  another runtime or presentation branch per business name.
- **CUR-001**: Keep root/package manifests and `pnpm-lock.yaml`: Node
  `>=22.11.0 <23`, pnpm `9.0.0`, resolved TypeScript `5.9.3`, Next `15.5.22`,
  React/DOM `19.2.8`, Nest `10.4.22`, Prisma/client `6.19.3`, BullMQ `5.81.2`,
  ioredis `5.11.1`, Puck `0.22.3`, XYFlow `12.11.2`. Keep floating image tags
  `node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`. No dependency,
  lockfile, capability asset, queue, provider or Compose changes are proposed.
- **CUR-002**: Retain `factory.application-graph/v1`,
  `factory.product-blueprint/v1`, current definition-data/composition-lock
  formats, stable `@factory/*` identifiers and the current compiler target.
  Production compilation still requires the exact digest-verified immutable
  Published Graph and physical capability closure. Never compile a mutable Draft,
  reinterpret historical bytes, or add archived-platform compatibility.

## Ordered reuse search and concrete gaps

| Order                  | Inspected authority/source                                                                                                                                                                                                                                                  | Decision and gap                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Approved registries | `packages/ui-primitives/src/index.ts`, `packages/ui-patterns/src/index.ts`, `packages/generated-ui/src/index.ts`, `packages/workbench-ui/src/index.ts`                                                                                                                      | Reuse button/input/label/select/card/badge/dialog, form-field, data-table, confirmation-dialog, compact-sidebar-navigation and the six interaction states. Mobile-product-shell and merchant-workspace-shell supply layout conventions. No admitted block supplies event discovery, a capacity reservation or attendance correction. Restaurant ports are incompatible.                                                                       |
| 2. Recipes             | `packages/screen-recipes/src/index.ts`, `packages/experience-recipes/src/index.ts`, `packages/product-recipes/src/index.ts`                                                                                                                                                 | Existing Restaurant/Fine Dining recipes provide responsive/token conventions, not event semantics. Do not fabricate Restaurant bindings.                                                                                                                                                                                                                                                                                                      |
| 3. Workbench           | `apps/workbench/components/shell/workbench-shell.tsx`, `apps/workbench/lib/product-journey/consumer-family.ts`                                                                                                                                                              | Reuse navigation/focus conventions and exact-family consumer admission. Generated products do not import the operator Workbench. Event Registration is absent from the current consumer union.                                                                                                                                                                                                                                                |
| 4. Generated templates | `packages/compiler/src/{appointment-mutation-contract,appointment-consumer-read,appointment-workspace-presentation,customer-requests-contract,customer-requests-runtime,customer-requests-presentation,mutation-write-protection,approval-workspace-presentation,index}.ts` | Reuse real store transactions, conditional updates, receipt hashing, principal checks, bounded reads, workspace styles and page projection. Appointment claims requested/confirmed slots and moves bookings; it has neither an attendee roster nor check-in. Its role-based reads and unbounded occupancy scan are not the new ownership/capacity implementation. Customer Requests has useful same-role owner checks but no shared capacity. |
| 5. Pinned studies      | `docs/ecosystem/source-studies/README.md`, `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`                                                                                                                                                              | No admitted external event implementation supplies this contract. The August inventory is historical, not evidence that today's registries are absent. No upstream or Base44 code/assets are copied.                                                                                                                                                                                                                                          |

- **REU-001**: Mandatory callable reuse: `writeProtectionFragments("task",
graphHash)` through a small family adapter for canonical normalized-payload
  hashing, bounded keys and receipt serialization; existing `RecordStore.inTransaction`,
  memory `coordinateMutation`, Prisma transaction lifecycle and record/audit
  delegates; `resolveFixturePrincipal` and `authorizeDeclaredAction`;
  `createGeneratedPageRuntimeProjection`, parameterized `renderWorkspaceStyles`
  and `getCustomerIconAssets`. The existing receipt-first transaction fragment
  must not bypass authorization. Frozen-command recovery and bounded-read
  transport are patterns to adapt, not fictitious generic exported helpers.
- **REU-002**: The new private composition key is
  `event-registration-presentation@1.0.0`, Factory-authored, `UNLICENSED`.
  Its distinct semantics are discover/register/my-place and attendee/check-in
  workspaces. Record reuse keys, source hashes and interaction tests in the
  existing acceptance packet. Extend only the compiler-private style selector;
  do not duplicate a registry asset to change colors. Existing registry
  descriptors stay unchanged. Use the accepted local `lucide-static@0.468.0`
  allowlist and ISC notices, including clock, user-round, circle-check,
  circle-x, refresh-cw and navigation arrows. No package or asset download.
- **REU-003**: Reuse the existing physical capability closure below. These are
  declared manifest digests, not raw `component.json` file hashes. Verify package
  roots, complete manifests/bindings and the composition digest using existing
  node-side lock verification. Do not add `scheduling.appointment`: its
  `appointment.booking` effect requires service/schedule semantics absent here.

| Capability                 | Version | Declared manifest SHA-256                                          |
| -------------------------- | ------- | ------------------------------------------------------------------ |
| `core.crud`                | `1.0.1` | `8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1` |
| `core.workflow`            | `1.0.1` | `16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884` |
| `core.identity-policy`     | `1.0.0` | `a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82` |
| `core.policy-declarations` | `1.0.0` | `56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54` |
| `core.audit`               | `1.0.2` | `fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8` |
| `core.notification`        | `1.1.1` | `207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132` |

- **REU-004**: The notification template only appends a capability event; it
  sends no email/SMS/push. This family selects no notification effect and makes
  no delivery claim from that dependency. Existing Graph witnesses and
  `packages/capabilities/src/product-composer.ts` show the exact admission/index
  seams; `definition-family-registry.ts` and `scripts/definition-case-*` provide
  catalogue and actual-case admission. Worker verification uses the current
  profile/probe lifecycle with a family descriptor, not a second harness.
- **REU-005**: New logic is limited to strict family witnesses, event/attendee
  semantics, shared capacity coordination, scoped reads, bound persistence and
  transport, and the two job-specific surfaces. Never clone the entire Appointment
  or Customer Requests runtime/UI. A private helper extraction is permitted only
  in assigned integration paths, with unchanged historical emitted bytes. Record
  helper calls and changed/new nonblank runtime/UI lines rather than inventing a
  reuse percentage.

## Fixed business scope and Graph contract

- **FAM-001**: Family `event-registration`, family version
  `event-registration/v1`, parameter policy `none/v1`, compiler profile
  `event-registration@1.0.0`. Exactly two role slots, ordered organizer/attendee;
  four business entities, ordered event/registration/event-history/registration-history;
  then the existing composed principal/session entities. Empty business seeds.
  Safe labels and role/entity/workflow/page keys may vary; field keys, ordering,
  domains, permissions, relationships and lifecycle semantics below may not.
- **FAM-002**: Event fields, in order: required `title:string`,
  `description:text`, `venue:string`, `startUtc:datetime`, `endUtc:datetime`,
  `timezone:string`, `capacity:integer`, `reservedSeats:integer`,
  `status:enum(closed,open,cancelled)`; then optional
  `cancellationReason:text`, `cancelledAt:datetime`, both server-owned and null
  unless the event is cancelled. Capacity is 1..1,000,000; reservedSeats is
  0..1,000,000 and server-owned. Both use exact inclusive
  `factory.numeric-field-domain/v1` bounds. Version/ID are factory-owned, not
  declared business fields. Version denotes organizer metadata/state changes;
  seat allocation changes reservedSeats without changing that version. Indexes
  are `[status,startUtc]` and `[startUtc]`, nonunique.
- **FAM-003**: Registration fields, in order: required `event` reference,
  `attendeePrincipalId:string`, `attendeeName:string`,
  `status:enum(registered,cancelled,checked-in)`. Blueprint/API reference `event`
  maps to storage `eventId`. Owner comes only from the resolved server principal.
  Exactly one row per `(eventId,attendeePrincipalId)` for its entire lifetime,
  including cancelled state; this is a generated unique index. Other indexes
  are `[eventId,status]` and `[attendeePrincipalId]`. There is no quantity, guest
  count, ticket type, price, provisional hold or reservation expiry.
- **FAM-004**: Event history fields, in order: required `event` reference,
  `action:enum(create,update,reopen,complete,cancel)`, `eventVersion:integer`,
  `toStatus:enum(closed,open,cancelled)`, `actorPrincipalId:string`, `actorRole:string`,
  `recordedAt:datetime`; optional `fromStatus` with the same enum, `reason:text`;
  then optional before/after pairs, in metadata order, for Title, Description,
  Venue, StartUtc, EndUtc, Timezone, Capacity, with matching base field types
  (for example `beforeTitle`, `afterTitle`). Capacity snapshots retain its numeric
  domain. Create stores all after values, null before values, null reason/from;
  update stores all before/after values and a reason, same status; reopen/complete/cancel
  store statuses/reason and null metadata. Only metadata mutations append this
  history; individual seat allocation is evidenced by registration history.
- **FAM-005**: Registration history fields, in order: required `registration`
  reference, `action:enum(create,update,cancel,reopen,check-in,undo-check-in)`,
  `registrationVersion:integer`, `toStatus` with registration's enum,
  `actorPrincipalId:string`, `actorRole:string`, `recordedAt:datetime`; optional
  `fromStatus` with the same enum, `reason:text`, `beforeAttendeeName:string`,
  `afterAttendeeName:string`. Create stores afterName and null before/from/reason;
  update stores both names and reason, same status; state commands store
  from/to/reason and null names. History references map to `eventId` or
  `registrationId` in storage and retain their Blueprint names in API. Histories
  have exactly one unique parent/version index each. Version fields use inclusive
  integer 0..2,147,483,647 domains. Each created parent starts at version zero;
  each later parent command increments once and appends exactly one attributed
  immutable event. Optional API values are explicit nulls. No generic history write.
- **FAM-006**: Exactly two workflows. Event initial `closed`: organizer `reopen`
  closed -> open and `complete` open -> closed, labelled **Open registration**
  and **Close registration**; organizer `cancel` from either closed or open to
  terminal cancelled, labelled **Cancel event**. Registration initial `registered`: `cancel`
  registered -> cancelled by attendee or organizer; attendee `reopen` cancelled
  -> registered; organizer `check-in` registered -> checked-in and
  `undo-check-in` checked-in -> registered. Add only `check-in` and
  `undo-check-in` to the bounded Blueprint action vocabulary. The two cancel
  actors are represented by two exact Blueprint transitions and one composed
  Graph transition with both roles; validators admit only this exact family
  shape. The two event cancel source states remain separate exact transitions.
  No arbitrary duplicate-transition relaxation or new capability effect.
- **FAM-007**: Organizer permissions: event create/read/update/reopen/complete/cancel;
  registration read/cancel/check-in/undo-check-in; both histories read. Attendee:
  event read; registration create/read/update/reopen/cancel; registration-history
  read; no event-history grant. Attendee reads/mutations/history are owner-scoped.
  Five ordered page intents: event list, event form, event detail, registration
  list (My places), registration queue (Attendees). Each becomes its current
  deterministic single-block page route; navigation contains event list,
  My places and Attendees, with existing list/user/check icon semantics and
  role-appropriate visibility. Form is organizer-only; event detail contains
  the reservation action and the current attendee's registration. No fabricated
  read grant follows from a visible route.
- **FAM-008**: Match the complete Blueprint and JSON-round-tripped Graph,
  including both flows, exact permission grants, generated principal/session
  entities, indexes, page routes/navigation, empty seeds, bindings and locks.
  Integration providers stay empty; only existing identity resolution,
  authorization decision and audit recording capabilities are composed, with no
  extra effects. Detect event/owner/history/check-in near-matches structurally
  and reject malformed candidates before generic CRUD or older-family fallback.
  Labels never grant admission. Pure computed witnesses are not serialized
  authority; compiler selection independently verifies physical assets/locks.

## Commands, capacity and identity boundary

- **BUS-001**: Organizer creates a closed event and deliberately opens it.
  Registration/re-registration is allowed only while open and server time is
  strictly before startUtc. Closing registration preserves existing places and
  does not cancel the event. Open/close after start is rejected; the read model
  still reports registration unavailable after start even if stored status is
  open. Both UTC instants are valid canonical millisecond ISO strings, end > start,
  and timezone is a valid IANA zone supported by the accepted runtime. Display
  event-local date/time and zone; browser-local conversion cannot change saved
  instants. Setup accepts an explicit UTC offset and rejects nonexistent local
  times; an ambiguous repeated local time requires an explicit offset choice.
- **BUS-002**: Title 1..160, venue 1..200, attendeeName 1..120, description
  1..2000 and required reasons 1..500 characters after trimming. Reject control
  characters (allow newline/tab only in description/reason), unknown keys,
  nonfinite/fractional/negative-zero integers and exhausted versions. Creation
  requires future start. Updating time/zone is allowed only before any
  registration has ever existed and with future start; otherwise require those
  fields to remain identical. Title/description/venue and capacity may be
  corrected later, with a retained before/after reason. Capacity cannot fall
  below reservedSeats. Reject no-op updates. No deletion or automatic rescheduling.
- **BUS-003**: A reservation immediately occupies one place. Registered and
  checked-in both count; cancelled does not. Cancel requires a reason and releases
  exactly one place; it is allowed for registered records even after the event.
  Register again reuses the cancelled row and reacquires capacity under the same
  open/time rules. Name correction is owner-only in any state and changes no
  capacity. Organizer check-in records their explicit attendance observation;
  it has no automatic time or GPS inference and no QR/security claim. Undo
  requires a reason and preserves the mistaken check-in in history. Both require
  reasons; a checked-in record must first be undone before cancellation. Repeating
  a fresh command in the wrong state fails; replaying its exact receipt does not
  create another action. Event time does not silently change attendance status.
- **BUS-004**: Organizer can cancel an open or closed event at any time, with a
  required reason. Atomically set terminal status cancelled, cancellationReason
  and server cancelledAt, increment event version and append its cancellation
  history/audit/receipt. Do not bulk rewrite registrations or erase check-ins.
  Every registration read derives `effectiveStatus:"event-cancelled"` when its
  parent is cancelled, alongside its unchanged stored status and the visible
  parent reason/time. Historical attendance remains explicitly historical.
  reservedSeats remains the count of stored registered plus checked-in rows,
  labelled **Reservations at cancellation** on the cancelled event, not usable
  places; remainingSeats becomes zero and registrationOpen false. This terminal
  parent denies event edits/reopen, fresh reservations, re-registration,
  individual cancellation and new check-in. Owner name correction and organizer
  undo-check-in remain allowed solely to correct retained history, without
  changing capacity or undoing event cancellation. Existing individual cancelled
  status/history is preserved too. Mistaken whole-event cancellation requires a
  new event; the UI confirms the terminal effect before submission. No external
  notification is implied; returning attendees see the reason in the app.
- **SEC-001**: Use the accepted loopback synthetic fixture-session mechanism,
  not production authentication: principal/session coordinates
  `fixture-principal-event-organizer`/`fixture-session-event-organizer`,
  `fixture-principal-event-attendee-a`/`fixture-session-event-attendee-a`, and
  the corresponding attendee-b pair, all `tenant-local`. Each maps to exactly
  one frozen Graph role slot, independent of its label/key; use existing fixture
  expiry semantics. API, browser and verifier share these fixed coordinates.
  Reject unknown/expired sessions, multiple roles and caller role/principal/tenant
  override headers. Resolve and validate the complete context with the existing
  identity/policy functions on every read and mutation. Caller IDs never grant access.
- **SEC-002**: Attendees may see all event metadata and aggregate seat counts,
  including closed/past/cancelled events and the cancellation reason/time, but
  only their own registration/name/history.
  Organizer may see the roster and both histories. A foreign/absent registration
  or history parent is indistinguishable 404. Reject all generic mutation routes
  and direct reads/writes of principals, sessions, history tables or receipts.
  Recheck ownership/permission before receipt lookup and before create replay
  returns its saved record. Fixture selectors are explicitly labelled local demo;
  clear cached data and pending commands on principal switch. All responses,
  including errors and proxy responses, use `Cache-Control: no-store`.
- **API-001**: Existing generated `/api/:entity` routing is retained only for
  the exact event and registration entities. POST event accepts exactly
  `{values:{title,description,venue,startUtc,endUtc,timezone,capacity}}`.
  POST registration accepts exactly
  `{expectedEventVersion,values:{event,attendeeName}}`. POST
  `/:entity/:id/events/:command` accepts event update
  `{expectedVersion,values:{title,description,venue,startUtc,endUtc,timezone,capacity},reason}`;
  event reopen/complete/cancel `{expectedVersion,reason}`; registration update
  `{expectedVersion,values:{attendeeName},reason}`; registration reopen
  `{expectedVersion,expectedEventVersion,reason}`; other registration state commands
  `{expectedVersion,reason}`. No client owner/status/counter, audit time,
  cancelledAt, ID or new-version write; expected versions are preconditions only.
  Require exactly one valid `x-factory-fixture-session` and bounded
  `x-factory-idempotency-key` (existing ASCII 1..128 grammar). Mutations accept no query.
- **API-002**: Mutation success is 201 creation or 200 command, with exactly
  `{record,history}`; record is the applicable fixed API entity plus id/version;
  history is its fixed API fields plus id and
  `factory.generated.event-history-entry/v1` or
  `factory.generated.event-registration-history-entry/v1`. Receipt stores scope,
  keyDigest, requestHash, command, entity, recordId, responseStatus and responseBody,
  unique `(scope,keyDigest)`. Scope includes immutable application/Graph identity,
  tenant, principal, role, entity, parent ID or `$create`, and command. Never
  persist a raw idempotency key. Exact same-scope retries return original status
  and body to a still-authorized actor; changed normalized body returns conflict.
  UI refreshes current state after replay, rather than presenting an old receipt
  as current availability or attendance.
- **API-003**: Errors contain exactly `{code}` with prefix `event_registration.`:
  400 `invalid_request`; 403 `forbidden`; 404 `not_found`; 409
  `version_conflict`, `state_conflict`, `capacity_conflict`,
  `already_registered`, `event_changed`, `idempotency_conflict`,
  `retryable_conflict`, `version_exhausted`; 500 `internal_error`; 503
  `unavailable`. Stale expectedEventVersion is event_changed; unavailable event
  state/time is state_conflict. Do not include other attendees, request bodies,
  raw exceptions or internal metadata. Proxy errors use the same exact allowlist.
- **TXN-001**: Use one serializable transaction with a consistent parent-event
  first lock order for all writes. Add a narrow store method to lock the known
  event row, with compiler-owned quoted identifiers and parameter-bound record ID;
  no user SQL or identifier interpolation. Event creation is the exception with
  no preexisting row. Existing store transaction lifecycle is reused. After
  locking, re-read actor authorization, event, receipt, registration and versions;
  validate the command and current server time inside the transaction. A stored
  receipt is checked before current business-state/time preconditions, but after
  authorization; a retry of a successful earlier reservation must still succeed
  after registration closes. Registration lookup needed to find its event is
  owner-scoped and rechecked under the lock. Missing/changed parents fail closed.
- **TXN-002**: Under the same event lock, reservation/reopen checks
  reservedSeats < capacity and conditionally increments reservedSeats; cancellation
  checks a registered row and conditionally decrements a positive counter.
  CAS every registration update by id/owner/status/version. Metadata update CAS
  uses event id/version, checks current counter and the existence of any past
  registration before time changes. Shared locking serializes time/capacity edits,
  last-seat races, individual cancellation/reallocation and whole-event
  cancellation against reservation/check-in. A check-in committed first is
  retained as historical attendance; a cancellation committed first denies the
  check-in. All non-replay commands recheck the parent cancellation rules.
  Seat updates do not invalidate
  another attendee's metadata version, avoiding needless refresh when capacity
  remains. Keep reservedSeats equal to the count of registered plus checked-in;
  verify this invariant with actual stored rows. Corrupt counters fail safely,
  never silently repair or invent capacity.
- **TXN-003**: Parent/registration change, history, body-free audit and receipt
  commit atomically. Check-in/undo/name correction do not change capacity.
  Unique event/owner and parent/version indexes backstop races. Reuse at most
  four attempts for existing P2002/P2034 conflicts, re-evaluating under a fresh
  transaction; exhaustion returns retryable_conflict with no partial effects.
  Version overflow, failed counter/CAS or injected history/receipt failure rolls
  everything back. Memory coordination is fixture-only and must model the same
  ordering; it is not durable/concurrency acceptance.

## Bounded reads and responsive product

- **RDS-001**: GET `/:entity` accepts only limit (default 20, integer 1..50),
  afterId and exact status; registration list additionally requires event when
  organizer, optionally filters event for an attendee, and always owner-scopes
  attendee rows before retrieval. GET `/:entity/:id` accepts no query. GET
  `/:entity/:id/history` accepts only limit and beforeVersion. Reject duplicate
  keys, malformed encoding, unknown status, empty/invalid cursors and noncanonical
  integers. IDs are bounded ASCII `[A-Za-z0-9._~-]{1,64}`, excluding `.`/`..`;
  generated IDs and verifier captures must satisfy that same grammar. Never
  truncate captured IDs or loosen existing verifier transports.
- **RDS-002**: Reads use `factory.generated.event-registration-read/v1`.
  Lists return `{apiVersion,items,nextAfterId}`, sorted by ID ascending with
  database predicates applied before limit+1 retrieval. Detail returns
  `{apiVersion,record}`; event record adds authoritative `remainingSeats`,
  `registrationOpen` and `serverNow`, and the current attendee's own registration
  or null (`myRegistration`); for organizer that last field is null. Event list
  items expose the same projection. Each registration read projection adds
  `eventStatus`, `effectiveStatus` (stored status unless parent cancelled, then
  `event-cancelled`) and `eventCancellation` (null or exactly `{reason,recordedAt}`
  from the parent's cancellation fields). This includes My places, organizer
  roster and event myRegistration; mutation receipts retain fixed base records
  and are followed by an authoritative read. Cancelled event projections always
  report remainingSeats zero and registrationOpen false. Parent cancellation
  fields must agree with terminal status or the read fails safely.
  History returns `{apiVersion,items,nextBeforeVersion}`, descending parent
  version, max limit. Cursor is the last returned ID/version only if more exists,
  otherwise null. Show explicit Load more/Load earlier actions; no silently
  truncated roster or history. Refresh is explicit; no across-request snapshot claim.
- **RDS-003**: A single serializable read transaction binds each response.
  Event lists perform one limit+1 query and at most one bounded owner registration
  query per returned event, maximum 51 queries. Organizer event detail may use
  one database count for checked-in records, returned as `checkedInCount` only
  for organizer; attendee projections omit it. History authorizes its parent
  first; roster filters are server-side. Registration lists join or perform at
  most one parent lookup per returned row, maximum 51 queries, in that same
  snapshot so cancellation cannot produce mixed parent/child status. No full-table materialization to compute
  availability or pagination. Read conflict retries are bounded at four and then
  return 503 unavailable without partial data. Required corrupt parent/history
  fields fail safely. History responses remain immutable child events; the
  surrounding detail presents current parent cancellation separately so it cannot
  be mistaken for a fabricated child-history entry. Search, exports, live attendance streams and totals across
  every event are not promised by this bounded read API.
- **UXR-001**: At 390px the first viewport contains product navigation, **Events**,
  event title, local date/time/zone, venue, labelled remaining places, and a clear
  View event/Register action on a meaningful populated fixture. My places opens
  the same saved reservation, correction, cancellation and history. Do not show
  a calendar slot picker or organizer field dump. At 1440px the first viewport
  contains event selection, its date/venue, Capacity/Reserved/Remaining/Checked in
  summaries, and a roster with visible names/status/Check in actions for at least
  two populated fixture rows (the two supported attendee principals). Setup,
  capacity correction and separately confirmed **Cancel event** are discoverable
  beside event details. At 768px use a readable intermediate layout without
  hiding required actions. An organizer may also use the responsive roster on a
  phone; a separate native application is not implied.
- **UXR-002**: Use existing theme tokens with a deliberate accent for the main
  action and distinct labelled open/full/closed/checked-in/cancelled states.
  Reuse clock/person/check/cancel/refresh icons where they aid scanning. This
  smallest job uses a typographic event identity and useful icons, with no photo
  upload, remote image or invented venue photograph. Missing icons retain visible
  action words and usable geometry. Long names/venues wrap without document
  overflow; roster scrolling is explicit. Clear business actions keep words;
  icon-only utility actions have accessible names and 44px targets.
- **UXR-003**: Include empty/setup, loading, populated, full/closed/past, validation,
  service failure, saved confirmation, denied, stale and uncertain-write states.
  A cancelled event shows the reason/time prominently on discovery, event detail,
  My places and organizer roster; historical checked-in status cannot imply
  continued admission. Show **Cancel registration** and **Cancel event** as
  different labelled actions with their concrete effects.
  Keep entered values on validation/stale failure. On event_changed show current
  details and require conscious resubmission; do not silently reserve against a
  revised event. For an uncertain response freeze principal, path, exact body,
  expected versions and key in memory; retry only that command under its original
  selected actor, disable duplicates and distinguish retry from a new action.
  Switch clears the command/cache. Reload restores server state, not unsaved text.
  Use labelled native controls, focus restoration, keyboard access and live
  regions. Confirmation says a place or attendance was saved, never that a ticket
  or notification was delivered.

## Unsupported needs and open decisions

- **OUT-001**: This proposed local experiment supports free individual places,
  one principal per place, organizer-controlled opening/closing, attendee
  cancellation/re-registration, whole-event cancellation with attendee-visible
  reason and retained attendance, and manual attendance with correction. It excludes
  payments/refunds, email/SMS/push, real/private/anonymous account access, invitations,
  group reservations, ticket transfer, waitlists, recurring/multisession events,
  seat maps, timed holds, QR scanning, walk-in registration by staff, imports,
  attachments and event rescheduling after a reservation.
  Close registration is never presented as event cancellation.
- **OUT-002**: These exclusions are material when requested. Definition matching
  and requirement retention must preserve them using accepted ADR-0078 behavior:
  ask only the unresolved business question, show the unsupported requirement,
  and obtain explicit scope revision before offering a supported result. Never
  silently convert a paid/public event into this demo. The canonical definition
  states the synthetic-local scope; it is not a claim of a privately hosted
  registration service. Business names alone cannot imply group/ticket policies.
- **OPN-001**: No supplied real event brief settles production identity, payment,
  notifications or ticket/group policies beyond this fixed free-event scope. Those remain unimplemented
  choices for such a brief, not defaults delegated to an implementation writer.
  The pending hosted target/account/access/storage/operator question remains
  with root; this ADR neither repeats it nor chooses a provider. Existing
  production identity, tenant isolation and Docker-socket residual risks keep
  their threat-model owners. Any reviewer finding that this fixed local scope
  conflicts with a material active requirement blocks standing acceptance.

## Ownership, rollout and abort conditions

- **IMP-001**: After separate decision acceptance, PM assigns one serialized
  contract/integration owner to Graph
  `src/{product-blueprint,model,index,event-registration-blueprint-witness,event-registration-graph-witness}.ts`
  and focused tests; capabilities `src/product-composer.ts` and composition
  tests; compiler `src/{index,event-registration-contract,event-registration-runtime}.ts`
  and contract/runtime/compilation/export tests. Shared Graph, generated templates,
  store/SQL and end-to-end handoffs remain serialized. No capability asset writes.
  Freeze the exact witness, profile, row-lock/counter method, error envelope,
  fixture coordinates and read/write shape before consumer writers start.
- **IMP-002**: Compiler root exports add only `selectEventRegistrationProfile`
  and type `EventRegistrationProfile` for worker selection, with the existing
  export allowlist test updated. Detached immutable profile exposes key/version,
  graphHash, all six entity keys, two workflow keys, roles organizer/attendee,
  five page keys and reference mappings `event/eventId/event` and
  `registration/registrationId/registration`; limits remain constants above.
  No deep imports or caller-configurable SQL/target selection. The later
  presentation owner owns `src/event-registration-presentation.ts` and focused
  interaction tests only; integration owns shared style/emitter routing.
- **IMP-003**: Worker owner later owns
  `apps/compiler-worker/src/verifier/event-registration-verification.ts` and
  focused tests; root serially assigns shared profile/scenario/probe routing.
  Reuse exact safe ID, body-size and transport limits. Case descriptors must
  validate real create/cancel/re-register/check-in/undo effects, not booleans or
  captured identifiers alone. Definition/consumer ownership covers strict family
  registration and canonical data under `packages/adapters/src/requirements/`,
  matcher tests and Workbench `lib/product-journey/{consumer-family,use-consumer-generation}`
  tests. Use existing definition admission and case index tooling.
- **IMP-004**: Root owns the execution plan, ledger/evidence, actual
  `e2e/event-registration.spec.ts` and helpers unless explicitly transferred,
  Git and process authority. Parallel writers require disjoint enumerated paths
  and the frozen handoff; a shared-contract change stops the wave. The accepted
  automatic consumer lifecycle must admit only the exact family/requirements/lock
  witness and retain manual opt-out. Ordinary users receive progress/retry and
  a useful result without technical handoffs.
- **IMP-005**: Add new tables/indexes/counter constraints/receipt only to newly
  generated isolated PostgreSQL apps. Generated constraints enforce
  `0 <= reservedSeats <= capacity <= 1000000` and capacity >= 1. No migration of
  existing Appointment/Task/Requests data, historical Graphs or Compilations.
  Backout disables new family admission/emitter selection while retaining saved
  experimental data and immutable artifacts for inspection. No destructive
  down-migration or volume cleanup. Compatible upgrade and backup-restore
  acceptance for this family still require actual separately authorized evidence;
  the previous Task rehearsal does not prove them.
- **ABT-001**: Stop for historical byte drift, missing physical lock evidence,
  overgrant, ownership/replay leakage, counter drift/oversell, unrepresentable
  Graph semantics, duplicate transition ambiguity, shared-writer conflict,
  verifier contract drift, a new package/provider/boundary, real private data,
  destructive migration or a material unsupported need treated as supported.
  Return the concrete gap to PM/Tech Lead. Do not weaken tests, validators,
  acceptance or the startup restriction to continue.

## Measurable verification and acceptance

- **VER-001**: Focused RED first for strict Blueprint/Graph/physical-lock admission,
  JSON persistence round-trip, field/index/action/role mutations, malformed
  near-matches, empty seeds, overgrant, extra effects and changed locks. Renamed,
  swapped and maximum-length Graph roles must retain slot semantics and fixture
  parity. All historical derivation/bundle baselines remain byte-identical
  without recapture. New verbs must not admit old-family lookalikes.
- **VER-002**: Execute emitted runtime in focused tests. Cover setup/open/close,
  invalid time/zone and ambiguous offset handling, capacity raise/reduction,
  forbidden time changes after even a cancelled reservation, full event, duplicate
  ownership, owner name correction, cancel/re-register, check-in/undo/cancel,
  whole-event cancellation from open/closed with zero/multiple registrations,
  attendee-visible reason/time and effective status, preserved previous individual
  cancellation/check-in history, post-cancellation forbidden commands and allowed
  historical correction. Cover stale metadata/record versions, exhausted versions, exact replay after later
  state/time changes, changed-body keys, owner/session switches and hostile text.
  Two same-role attendees cannot read/mutate/replay each other's records/history;
  neither can read organizer history or use generic routes. Test bounded
  pagination across more than 50 events/registrations/history entries.
- **VER-003**: Actual PostgreSQL must prove: two concurrent final-seat attempts
  produce exactly one reservation; two requests with spare capacity both succeed
  without false metadata conflicts; duplicate-principal race creates one row;
  cancellation/reallocation and capacity reduction cannot oversell; close/time
  edit races obey event locking; check-in/cancel and undo/cancel CAS produce
  legal history. Race whole-event cancellation against create/re-registration,
  check-in and individual cancellation: assert the legal serialized outcome,
  retained attendance, consistent parent/child read projections and no fresh
  registration/check-in after cancellation. Exact whole-event cancellation retry
  returns its original result without duplicate history; undo of an earlier
  check-in remains attributed and never uncancels the event.
  Exact retries add no seat/history/audit; injected failures at
  history/audit/receipt roll back all state; reservedSeats equals stored active
  registrations after reload and service restart. Memory or skipped DB tests
  cannot satisfy this witness. Execution remains deferred while startup is blocked.
- **VER-004**: Once implemented, focused source commands are:
  `pnpm --filter @factory/graph exec vitest run test/event-registration-blueprint-witness.test.ts test/event-registration-graph-witness.test.ts`;
  `pnpm --filter @factory/capabilities exec vitest run test/event-registration-composition.test.ts`;
  `pnpm --filter @factory/compiler exec vitest run test/event-registration-contract.test.ts test/event-registration-runtime.test.ts test/event-registration-compilation.test.ts test/event-registration-presentation.test.ts test/index-exports.test.ts`;
  `pnpm --filter @factory/adapters exec vitest run test/event-registration-definition.test.ts`.
  Run affected worker/consumer tests, package typecheck/build and
  `pnpm regression definitions`. Future actual case selection is
  `pnpm exec playwright test e2e/event-registration.spec.ts` only after root
  independently clears the blocked execution boundary and owns exact resources.
  These are future checks, not commands executed or passed by this proposal.
- **VER-005**: Actual consumer acceptance starts from Home with the synthetic
  brief, retains material requirements and reaches an immutable generated app
  through automatic delivery. On desktop organizer creates/corrects two distinct
  events, opens one with capacity one; phone A finds it, registers, corrects their
  name and reloads. B sees full and cannot inspect A. A cancels; B registers;
  organizer sees the same record, checks B in, undoes a mistaken check-in with
  reason and checks in again; B reads the retained outcome/history on phone.
  Increase capacity and let A register again on their original row. Close
  registration and prove retained attendance and understandable unavailable state.
  Then organizer cancels that event with a reason; A and B reload phone My places
  and detail to see cancellation/reason/time, while organizer retains B's actual
  attendance and both histories. A fresh check-in/re-registration fails; undoing
  B's old check-in corrects history without reopening the event. Cancel the second
  event before any reservation too. Verify projections against the same saved
  parent and registrations, not unrelated screenshots.
  Include one dropped committed response and one stale correction with useful
  recovery. API probes supplement, never substitute for, these UI actions.
- **VER-006**: Capture and actually inspect 390/768/1440 complete workspace
  screenshots after asserting populated discovery, reservation, full/cancelled,
  roster/check-in, whole-event cancellation with retained attendance,
  correction/history and recovery states; inspect dark mode,
  long text, keyboard/touch and denial. Verify stylesheet HTTP success, computed
  layout, primary action reach, roster density and visible icon geometry, and
  prove missing-asset detection fails when assets are removed. Retain meaningful
  labels without icons. One existing review reports functional, mechanical visual
  and qualitative visual conclusions separately. Source/browser fixture tests
  do not establish actual consumer visual acceptance or ordinary-user success.
- **VER-007**: Store the existing acceptance matrix, immutable source/Published/
  Graph/Compilation identities, reused keys/new source counts, commands,
  safe summaries/digests, failures/blocked cases and actual images under
  `docs/acceptance/evidence/event-registration/`, with status in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Predeclare prepared-local first useful action within five minutes, zero technical
  handoffs/manual rescue and only material clarification questions as targets;
  measure ready/first-action time, question/repair counts and retained requirements
  rather than claiming an SLA. Record exact authorized resource cleanup when
  execution eventually becomes available. Hosted address, durable update and
  recovery stay separate pending outcomes.
- **VER-008**: Shared contract/security work uses the existing task review,
  independent Terra QA, Sol final judgment, PM acceptance and controller delivery.
  Reuse unchanged evidence; contained presentation/fixture repairs use affected
  checks and one existing review, not a new bureaucracy per screen. After the
  canonical family passes, assess 3-5 domain briefs through existing admission.
  Admit only genuinely distinct supported jobs with zero per-definition runtime/UI
  changes; report label-only duplicates and unsupported policies separately.
  If only the canonical job fits, record that outcome rather than manufacturing
  catalogue growth. This proposal itself delivers no accepted product.

## Alternatives and consequences

- **ALT-001**: **Keep/relabel Appointment — reject.** Service/time-slot booking,
  confirmation and moving a reservation do not implement event discovery,
  attendee ownership or attendance correction. Reusing its labels or lock would
  falsely imply those semantics and inherit an unsuitable occupancy/read path.
- **ALT-002**: **Experiment with the bounded family above — recommend.** Adds
  the minimum distinct event/attendance coordination while preserving the stack,
  immutable lifecycle, existing primitives and automatic consumer flow.
- **ALT-003**: **Migrate to a ticketing provider or full event suite — defer.**
  Payment, identity, messages, public hosting and provider selection need their
  own product/security decisions and authorized target. They cannot be silently
  implemented or omitted under a free local fixture.
- **POS-001**: One shared event capacity contract supports a complete reversible
  reservation/attendance job, with corrections and history beyond first creation.
  Reuse of executable transaction/UI/admission seams reduces repeated engineering.
- **POS-002**: Separate metadata version and seat count avoid unnecessary attendee
  retries while protecting a consciously chosen event against actual edits.
  Explicit ownership and persisted check-in distinguish this family from Appointment.
- **NEG-001**: An event row lock serializes writes for that event; very large
  admission bursts and high-volume gates are outside this experiment. Four
  attempts bound contention rather than guaranteeing throughput. No new queue,
  cache or distributed admission mechanism is justified without measurements.
- **NEG-002**: One-seat principals, manual attendance and immutable time after
  first reservation exclude common event policies. Synthetic sessions do not
  provide private access. Blocked actual execution and absent hosted delivery
  remain genuine completion gaps, regardless of source test results.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`, `docs/acceptance/consumer-product-checklist.md`.
- **REF-002**: Active consumer ledger and
  `docs/superpowers/plans/2026-09-24-family-expansion-and-delivery.md`, Wave E.
- **REF-003**: ADR-0071/0081/0082 Appointment atomic booking, consumer workspace
  and setup corrections; ADR-0084/0085 Customer Requests ownership/verifier
  adaptation; ADR-0078/0079 requirement retention and automatic family delivery.
- **REF-004**: Concrete inspected paths in the reuse table; capabilities
  `assets/{core.notification/1.1.1,scheduling.appointment/1.0.1}`;
  `packages/graph/src/customer-requests-{blueprint,graph}-witness.ts`;
  `packages/compiler/src/targets/restaurant-v3/customer-icons.ts` and
  `packages/compiler/THIRD_PARTY_NOTICES.md`;
  `apps/compiler-worker/src/verifier/{customer-requests-verification,verification-profiles}.ts`.
  This is local source analysis; no external source copy or runtime experiment
  was performed for the proposal.
