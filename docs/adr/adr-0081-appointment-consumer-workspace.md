---
title: "ADR-0081: Appointment Consumer Workspace"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "decision", "appointment", "generated-ui", "authorization"]
supersedes: ""
superseded_by: ""
---

# ADR-0081: Appointment Consumer Workspace

## Status and recommendation

**Proposed.** Recommendation: **migrate** fresh local Appointment consumer
selection to a versioned Appointment V2 workspace. Keep the existing atomic
booking capability, runtime stack, fixture sessions, and immutable V1 artifacts.
Add an explicit, limited availability permission and projection only to the new
profile. This is a repair of one existing logical product, not another business
family or proof of private customer accounts.

This proposal authorizes no implementation, Product Publish, Compilation,
repository release, service startup, provider call, cloud resource or deployment.
An independent reviewer must assess the exact ADR hash against the standing
policy in `docs/tech-governance.md`; PM records the verdict and any founder
acceptance before assigning implementation. The availability grant is a new
security/data contract, not an already accepted permission. If the reviewer
classifies it as security-boundary weakening, material scope expansion, or is
uncertain, standing acceptance is unavailable and explicit founder acceptance
is required. The proposer cannot decide or imply that acceptance.

## Context and source authority

- **CTX-001**: `docs/tech-governance.md` and `docs/threat-model.md` control this
  proposal. ADR-0071 defines atomic booking; ADR-0072 defines exact composition
  and byte compatibility; ADR-0073 moves the current capability to `1.0.1`;
  ADR-0077 preserves historical generic booking. Their historical artifacts
  remain authoritative for their own versions.
- **CTX-002**: The accepted `appointment-booking-v1` reaches generic rendering
  in `packages/compiler/src/index.ts` (`presentationProfile` and bundle page
  dispatch). `projection.appointment` is metadata, not a consumer workspace.
  Generic create sends raw fields without the required idempotency header;
  generic transitions send `{}`. `appointment-mutation-contract.ts` requires
  `{ values }`, `x-factory-idempotency-key`, and versioned transition bodies.
  Generic pages have no booking history interface. This is a pre-existing
  template gap, not a regression introduced by ADR-0079 automatic entry.
- **CTX-003**: `appointment-compilation-admission.ts` and the exact Blueprint
  predicate grant customer/staff Appointment rights, but neither role has
  Service or Schedule `read`. A picker cannot silently fetch those collections
  or obtain administrator credentials. The browser cannot supply its own policy.
- **CTX-004**: `e2e/appointment-booking.spec.ts` currently proves business behavior
  through API calls and screenshots; that does not prove those actions work
  through visible UI. `definition-data-compatibility.test.ts` explicitly freezes
  V1 generic page output. Updating that baseline to hide the defect is forbidden.
- **CTX-005**: ADR-0079 EFF-001/IMP-005 exclude templates and definition JSON;
  ABT-001 therefore requires this separate decision. This proposal changes those
  boundaries only for the new version described below, after acceptance. It does
  not amend an accepted ADR in place or reopen Directory/Inventory delivery.
- **CTX-006**: Definition data fixes `definitionVersion` to `1.0.0`; selection
  keys are unique. In-place replacement cannot preserve the old projection.
  Blueprint actions are a closed enum in `packages/graph/src/product-blueprint.ts`.
  The new permission requires an explicit additive action-schema change, even
  though the outer serialization versions remain unchanged.

## Current and proposed profiles

- **CUR-001**: Keep the Golden profile governed by root/package manifests,
  `pnpm-lock.yaml`, tracked Dockerfiles and `infra/docker-compose.yml`: Node
  `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` / `5.9.3`, Next
  `^15.1.0` / `15.5.22`, React/React DOM `^19.0.0` / `19.2.8`, NestJS
  `^10.4.15` / `10.4.22`, Prisma `^6.1.0` / `6.19.3`, BullMQ
  `^5.34.10` / `5.81.2`, ioredis `^5.4.2` / `5.11.1`, Puck `0.22.3`,
  XYFlow `12.11.2`; `node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`
  remain floating-major image constraints. No package, manifest, lockfile,
  dependency, image, queue, database topology or provider changes.
- **CUR-002**: Keep Graph `factory.application-graph/v1`, Blueprint
  `factory.product-blueprint/v1`, definition data `factory.product-definition-data/v1`,
  plan `factory.composition-plan/v1`, and capability/binding V1 envelopes.
  Old V1 definition family is `appointment-booking/v1`, presentation
  `appointment-booking@1.0.0`, compiler profile `appointment-booking@1.0.0`.
- **PRO-001**: Add replacement definition key `appointment-booking-v2`, still
  definitionVersion `1.0.0`, family key `appointment`, family version
  `appointment-booking/v2`, parameter policy `none/v1`, presentation
  `appointment-booking@2.0.0`, and compiler profile `appointment-booking@2.0.0`.
  These are the only new family/profile coordinates. Keep V1 registered for
  explicit historical/manual projection and byte verification.
- **PRO-002**: Both versions use exactly the current seven locks, in the current
  order: `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`,
  `core.audit@1.0.2`, `core.notification@1.1.1`, and
  `scheduling.appointment@1.0.1`. The Appointment manifest digest remains
  `sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7`.
  The other six exact digests remain ADR-0072 LCK-005; every physical manifest,
  template, fixture and digest stays unchanged. No capability version is being
  relabeled: the new profile composes the existing atomic command capability
  with a separately versioned read-only compiler projection.
- **PRO-003**: Add exactly `read-availability` to Blueprint action verbs and
  their derived provider schema. Graph already serializes string actions.
  This is an additive allowed-value contract change, not permission for models
  to invent routes, packages or arbitrary actions. Only the complete V2 family
  witness admits this action for automatic Appointment generation. Existing
  predicates remain exact and reject V2 as V1.

## Decision: witness, selection and immutable compatibility

- **WIT-001**: Implement one exact V2 Blueprint predicate alongside the retained
  V1 predicate. V2 inherits all V1 ordered entities/fields, canonical ambiguous
  field keys, positive numeric domains, references, roles, workflows, page
  intents and 17 owner-aware bindings. Its sole business-structure difference
  is an additional Schedule permission with actions exactly
  `["read-availability"]` for customer and staff, appended after each role's
  current Appointment permission. Administrator permissions are unchanged.
  Labels, titles, definition keys and provider prose never select a profile.
- **WIT-002**: The planner and definition validator consume that same predicate.
  The compiler independently proves the equivalent immutable Graph witness,
  all exact locks/digests/bindings, Graph checksum, numeric domains, permission
  order and flow before emitting V2. Any missing/extra permission, broadened
  action, role, wrong owner, rebound field, stale digest, mixed V1/V2 witness or
  unsupported profile fails before generation. Preserve private compiler witness
  boundaries and the closed `@factory/compiler` export map.
- **WIT-003**: V1 still goes through its existing witness and generates identical
  bytes. V2 alone emits the appointment workspace and availability routes.
  Keep ADR-0077 historical booking admission separate. Never select V2 merely
  because an Appointment lock exists, and never bypass existing numeric checks
  without the complete appropriate witness at both real compiler seams.
- **SEL-001**: Fresh default requirement selection offers V2 for supported
  Appointment intent; V1 is excluded from default provider instructions/schema
  offerings but remains addressable through explicit historical projection.
  Maintain a private, exact selection policy for these two keys, not a general
  public registry extension. Do not mutate V1's data row or provider guide.
  Existing persisted V1 selections remain V1; no implicit conversion on refresh.
- **SEL-002**: After V2 passes all gates, the existing shared consumer plan matcher
  admits its exact standard plan under consumer family `appointment`. The old
  V1 witness no longer starts new automatic consumer sessions: route it to manual
  inspection with a truthful unsupported-consumer-workspace explanation. Retain
  ADR-0079 checksums, material clarification, opt-out and lifecycle latches.
  Do not expose a broken canonical V1 as the default useful app.
- **SEL-003**: The physical catalogue gains a replacement key because the present
  schema cannot store two versions of one key. Report physical rows and active
  logical definitions separately: this increases neither logical product coverage
  nor demonstrated runtime-family count. V1 is a retained historical revision,
  V2 its active replacement. Preserve unrelated counts, fixtures and evidence.
- **CMP-001**: Keep all old definition rows, Graphs, locks, generated paths/bytes
  and fixture expectations byte identical, including Appointment V1 and generic
  historical booking. Add separate V2 fixtures with exact compiler-input hash,
  lock digest and generated manifest. Never recapture protected baselines.
  Existing Published revisions/Compilations are inspection-only and immutable.
- **CMP-002**: Migration creates a fresh Draft through V2 selection, followed
  only by the existing authorized Publish and immutable Compilation lifecycle.
  No in-place Graph, record, receipt, history, artifact or database migration.
  Old previews remain old; a new preview has its own isolated application data.

## Decision: bounded availability read

- **API-001**: V2 adds `GET /api/appointment-availability` in the generated API
  and same-origin web proxy, with a dedicated static route before generic entity
  routing. Emit it only for V2; an arbitrary generic Graph cannot obtain it.
  Resolve the existing server fixture principal, verify Published Graph binding,
  then require `read-availability` on the bound Schedule entity. Allow exactly
  customer/staff with that permission. Administrator uses its existing authorized
  Service/Schedule setup routes. No role header, query parameter, browser flag,
  definition name or record ID substitutes for authorization.
- **API-002**: Query shape is exactly `from`, `to`, optional `serviceId`, optional
  `offset`. Reject duplicate/unknown parameters. `from`
  and `to` are canonical UTC ISO timestamps; `from < to`, interval at most 31
  days, with `to` at most 366 days ahead of the live server clock. Historical
  lower bounds remain valid without age expiry; an entirely elapsed window
  returns an empty page. API-004 still filters every result against live server
  now. Retain the exact chosen window during deliberation, pagination and retry;
  elapsed time alone never makes that window invalid. IDs follow API-009 below.
  Offset defaults to zero and must be an integer from 0 to 100000.
  Sort by startUtc then scheduleId; return at most 100 eligible slots. Return
  next offset when more candidate schedules remain; return null only when the
  bounded query has exhausted the interval. No cursor contains an unavailable
  schedule identifier. Changes between pages may cause repeats; deduplicate slots
  by scheduleId and refresh on mutation. Pagination is advisory, not a snapshot.
- **API-003**: Response is exactly
  `{ apiVersion: "factory.generated.appointment-availability/v1", slots, next }`.
  Each slot contains only `scheduleId`, `serviceId`, `serviceName`,
  `durationMinutes`, `startUtc`, `endUtc`, `timezone`. `next` is null or
  `{ offset }`. Service choices are deduplicated from these slots;
  the UI needs no Service-list read. Service names render as escaped text.
  No raw records, capacity/occupancy counts, customer data, notes, reasons,
  principals, history, policy details, receipt data, Graph hash or internal keys
  beyond the two necessary business IDs appear in this response.
- **API-004**: Include only active valid services and valid open schedules whose
  start is at/after server now and within `[from,to)`, with positive integer
  capacity and an unoccupied place under the existing requested/confirmed
  occupancy rule. Return canonical stored UTC instants and the validated IANA
  timezone; never infer or rewrite a zone. A schedule is one offered slot: no
  client-generated subdivisions or duration-based slot synthesis. Exclude the
  current schedule client-side during rescheduling. No excluded appointment ID
  parameter or occupancy exception is introduced.
- **API-005**: Availability is advisory. Existing atomic claim/move revalidates
  service, schedule, capacity, role and expected version in the transaction;
  a stale choice may conflict. Existing atomic claim/move does not reject a
  past start time. Future-only discovery is advisory, not a new transactional
  guarantee: this ADR adds no past-start mutation rejection or other command
  semantic change. The read does not reserve capacity, mint a token,
  write history or alter any mutation response. Use bounded database filtering
  and a deterministic scan budget of 500 schedules per request; if exhausted
  before a complete page, return the next scanned offset, even for an empty page.
  At the maximum offset return 400 rather than scan further; UI offers a narrower
  date window. Offset filtering and scan limits must be applied in the store.
  Fetch/count only occupancy for those bounded schedules; no full appointment
  collection scan. In-memory and durable stores must yield equivalent results.
- **API-006**: Use `Cache-Control: no-store` on proxy and API. Safe error bodies
  are exactly `{ code }`: 400 `appointment.availability_invalid_query`, 403
  `appointment.forbidden`, 503 `appointment.availability_unavailable`.
  Unauthorized requests fail before querying; an unknown service filter yields
  empty slots without revealing its existence. Bound all cursors/queries and
  ensure proxy forwards only existing fixture-session context. No raw error or
  business record enters logs/evidence. Cursors convey position, never authority.
- **API-007**: V2 also adds `GET /api/:entity/:recordId/appointment-summary`
  through the same proxy so full/cancelled appointments still have human-readable
  labels after reload. Resolve the bound Appointment record after its existing
  `read` check; customer/staff additionally need Schedule `read-availability`,
  while administrator needs its existing Service and Schedule `read` checks.
  No arbitrary entity, history export, client role or unscoped record lookup.
  Return exactly `{ apiVersion: "factory.generated.appointment-summary/v1",
serviceName, durationMinutes, slot, source }`. `slot` is the latest non-null
  `toSlot` or `fromSlot` from the record's existing history, with exactly
  scheduleId/serviceId/startUtc/endUtc/timezone. Read one latest relevant history
  row with deterministic timestamp/ID ordering, not an unbounded history list.
  If no history exists, use the validated current referenced schedule and mark
  `source: "current-schedule"`; otherwise `source: "history"`. Resolve the current
  Service name/duration from that slot's serviceId; label them current service
  metadata, not historical snapshots. Invalid/missing referenced data returns
  404 `appointment.not_found` without partial data. Use the same no-store and
  403/503 safe errors as availability. The UI labels the no-history fallback
  clearly. This read adds no mutation/history member and uses only the same
  expressly approved service/time projection fields.
- **API-008**: Bootstrap the UI clock through its existing authenticated
  `GET /api/<appointmentEntity>` list request before the first availability
  query. For V2 only, the generated API sets `Date` from the live server clock
  on successful Appointment-list, availability and summary responses. Use
  canonical IMF-fixdate, with second precision. The V2 web proxy explicitly
  forwards that upstream `Date` and `Cache-Control: no-store`; it must not
  synthesize a browser/proxy clock or keep its current content-type-only behavior
  for these responses. No clock endpoint or response-body field is added.
  The UI accepts exactly one parseable canonical IMF-fixdate header on a
  successful list response and derives the initial `[Date, Date + 7 days)`
  window before issuing availability. No client local-clock fallback.
  Missing/invalid Date or list failure leaves availability unavailable, preserves
  entered form values, disables booking submit, and offers `Retry availability`.
  Retry first repeats the authenticated list bootstrap; after a valid Date it
  initializes an absent window or preserves an existing chosen window, resets
  offset to zero, replaces the availability results and deduplicates by scheduleId.
  A selected slot is retained only if returned again; otherwise clear the slot
  and show a choose-again message without losing service/name/notes input.
  Subsequent availability pages also require valid Date: on missing/invalid Date
  discard that page and use the same recovery state. Successful pagination uses
  the retained window and appends deduplicated results; explicit refresh after
  mutation/conflict restarts offset zero and replaces results. Never change a
  frozen pending mutation's body/key/version as part of availability recovery.
  Server filtering uses live request time; fixture principal authentication
  continues using its existing fixed `localFixtureNow` value
  `2026-01-01T00:00:00.000Z`. Do not replace that authentication clock with live
  time or use it to decide availability. Test clocks may inject each separately.
- **API-009**: The new read surfaces define their own bounded ID validator;
  the existing Appointment `nonEmpty` helper is not such a validator. Optional
  serviceId, when present, and required summary recordId must decode exactly
  once using the normal URL parser and then match
  `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`: 1 through 128 ASCII characters,
  case-sensitive, with no trimming, lowercasing or Unicode normalization.
  This preserves generated CUID/UUID IDs, current entity-counter IDs and
  `sample-...` fixture IDs exactly; it creates no replacement stored ID.
  Allow ordinary percent encoding of those characters once; reject malformed
  escapes/UTF-8 and double-encoded material rather than decoding again. The
  decoded value must be a scalar string; reject arrays/duplicate serviceId,
  empty strings, whitespace, controls, non-ASCII, slash/backslash and all other
  characters. Apply after authentication and before store lookup on both new
  read routes. Invalid serviceId returns the existing 400
  `appointment.availability_invalid_query`; invalid summary recordId returns
  400 `{ code: "appointment.summary_invalid_id" }`. Never echo the rejected
  value. Valid unknown IDs use the existing empty-availability/404-summary
  outcomes. These checks govern only V2 read inputs, not existing mutation
  validators or stored/history identifiers; retain older data byte for byte.
- **SEC-001**: Generic Service/Schedule reads remain denied to customer/staff;
  `read-availability` does not imply `read`, `manage`, mutation, or wildcard
  access. V1 and all other families gain no access. Direct route, proxy,
  forged-role, absent-session, wrong-policy, cross-application and V1 endpoint
  tests must prove this. The new disclosure is exactly public-to-the-local-demo
  service labels and available choices, plus already-readable booking slot
  summaries. Existing private record entitlements do not change.
- **SEC-002**: ADR-0071's local customer role is shared: no verified per-person
  ownership exists. Label the view `My demo appointments` with nearby clear copy
  that this is the shared customer fixture, not a private account. Its contents
  are the existing customer-role appointment list; never claim browser filtering
  is authorization. Customer can cancel eligible records under that same accepted
  role-wide contract. No external/private/multi-user/tenant acceptance is implied.

## Decision: actual consumer workspace

- **UIR-001**: Reuse search order is approved primitives/patterns/generated UI,
  screen/experience/product recipes, Workbench assets, generated templates,
  then pinned source studies. Inspected registries provide button/input/select/
  label/card/badge, form-field, confirmation-dialog, data-table, navigation and
  loading/empty/error/denial states. Restaurant recipes do not provide booking
  command semantics. Workbench editors are not generated customer applications.
  Existing `approval-workspace-presentation.ts` and
  `task-workspace-presentation.ts` provide reusable native shell, styles,
  safe data helpers and record hooks. Source studies grant no new copying right.
- **UIR-002**: Compose those existing helpers and approved icon assets. Add one
  distinct first-party compiler presentation key
  `appointment-workspace-presentation@1.0.0`, with reuse/provenance manifest,
  source digest, state fixtures and focused tests. The documented gap is the
  appointment picker and atomic command/recovery/history composition, not styling.
  Parameterize shared helpers only where old rendered bytes remain identical.
  Keep existing `lucide-static@0.468.0` allowlist and license notices; no external
  source, framework, calendar/timezone package or new runtime dependency.
- **UIR-003**: Customer mobile root shows service/date choices and readable
  available slots, customer name and optional notes, then a review/submit action.
  Default browse window uses the authenticated live-server clock bootstrap and
  missing-clock recovery in API-008, then spans seven days;
  navigation uses subsequent bounded windows and cursor pages with loading/error
  states. Display local slot date/time and explicit stored timezone. Show requested
  confirmation, shared demo appointment list and details with cancellation reason.
  Raw IDs, role headers and manual JSON are never form inputs.
- **UIR-004**: Desktop staff sees a filterable requested/confirmed/cancelled list,
  selected record details, confirm/reschedule/cancel controls, and existing
  append-only history. Confirm appears only for requested; reschedule only for
  confirmed and changes status back to requested; cancel only for requested or
  confirmed. Customer has request/read/cancel; administrator has existing setup,
  appointment read/cancel. Cancelled records show no mutation controls. Policies
  and accepted command semantics, not generic workflow buttons, drive these states.
- **UIR-005**: Administrator setup uses human Service selectors and labelled
  fields for name, positive duration, active flag, UTC start/end, IANA timezone,
  positive capacity and open/closed state. Reuse existing CRUD routes and current
  server validation; no claim of new admin transaction/idempotency guarantees.
  Validate required/positive/time-order inputs before submit, preserve user input
  on failure, refresh visible values after save, and explain synthetic-demo scope.
- **UIR-006**: Booking mutations use existing `/api/<appointmentEntity>` create
  and `/api/<appointmentEntity>/<id>/events/<event>` routes. Create sends exactly
  `{ values: { <scheduleField>: scheduleId, <customerField>: name,
<notesField>?: notes } }`; confirm `{ expectedVersion }`; reschedule
  `{ expectedVersion, scheduleId }`; cancel `{ expectedVersion, cancellationReason }`.
  Fetch history from the existing record `appointment-history` route. Do not add
  mutation fields, client status, capacity, receipt scope, or duplicate endpoints.
- **UIR-007**: Generate a fresh valid idempotency key once per confirmed booking
  intent. Freeze URL, method, exact body bytes, key, record version and actor
  context while pending/uncertain; disable duplicate submit and edits to that
  command. A lost response/network error retries the same command, including
  after API process restart. A role switch may not replay it as another actor.
  Do not treat an uncertain result as success or mint a replacement key silently.
  Keep business payload in memory only; no raw body logging or evidence capture.
  On full browser reload, do not automatically reconstruct/replay a lost command:
  reload authoritative demo appointments/history and require conscious review
  before another booking. Exact retry acceptance covers the retained page session.
- **UIR-008**: After a definite validation/capacity/version/state conflict, retain
  typed values, fetch fresh authoritative record/availability, explain the conflict
  and require deliberate revised submission with a new key. Receipt replay may
  return an earlier response; refresh current record/history before enabling later
  actions. Never silently overwrite a stale version or retry with a newer version.
- **UIR-009**: At 390/768/1440 widths use clear primary action, compact status
  badges, readable service/time summaries, touch targets at least 44px, and no
  horizontal page overflow. Icon actions need accessible names, tooltips where
  useful, visible focus and text for destructive/primary actions. Native controls,
  keyboard operation, focus restoration, live status, loading/empty/denied/error
  states, escaped text, reduced motion and existing light/dark tokens are required.

## Effects, migration, rollback and ownership

- **EFF-001**: API effect is the versioned availability projection/proxy for V2 only
  and one bounded record-summary projection for readable saved bookings.
  Data effect is additional immutable Graph permission rows, no persistence
  schema migration. Adapter/catalogue effect is a replacement default and retained
  historical key. New Blueprint action admission is explicit. Existing command,
  receipt/history identifiers, atomicity and response shapes stay exact.
- **EFF-002**: No generated deployment or resource topology change. All execution
  remains prepared isolated loopback preview under existing quota/expiry/cleanup
  policy. No credentials or raw model material enter source, browser, artifacts,
  screenshots or evidence. Keep original third-party notices and package pins.
- **IMP-001**: PM records exact accepted ADR SHA, security review, contract owner,
  request/response/errors/auth/compatibility paths and frozen status before work.
  The current ADR-0079 Task 3 Directory/Inventory E2E writer keeps its assignment;
  shared capabilities and Workbench paths remain frozen for its review/QA. Wait
  for that gate before any overlapping V2 implementation. This proposal itself
  writes only this ADR.
- **IMP-002**: One serialized Graph/capability/adapter integration owner owns the
  additive action in `packages/graph/src/product-blueprint.ts`, exact V2 predicate
  and plan/binding admission in `packages/capabilities/src/`, corresponding
  definition-family/default-selection paths and appended data row under
  `packages/adapters/src/requirements/`, and focused tests. No asset-package
  manifests/templates change. Shared contracts must finish/freeze before consumers.
- **IMP-003**: One serialized compiler integration owner owns
  `packages/compiler/src/index.ts`, private Appointment admission/read projection,
  store query/proxy rendering, new appointment workspace module, necessary shared
  helper parameterization, and focused compiler tests/new V2 fixtures. Preserve
  old mutation renderer bytes. Assign any Workbench matcher change subsequently
  to its existing owner. End-to-end ownership is `e2e/appointment-booking.spec.ts`
  plus focused helper changes only after Directory/Inventory ownership clears.
- **ROL-001**: Rollback disables V2 fresh default and automatic admission, restores
  manual Appointment selection, and stops owned V2 previews using normal cleanup.
  Retain emitted V2 Published/Compilation artifacts and read support necessary
  for inspection; do not rewrite them as V1. Prior V1 output remains valid under
  its historical contract. No destructive rollback or database conversion exists.
- **ABT-001**: Stop on any old byte/hash drift, required package/manifest mutation,
  expanded read fields or permission, private-account claim, unidentified tenant
  scope, inability to enforce bounded queries, altered atomic command semantics,
  unrepresentable frozen contract, missing license/provenance or ownership clash.
  Return material amendments to Tech Lead/review/PM. No writer may silently broaden
  this proposal or use generic reads as an availability shortcut.

## Acceptance and evidence

Apply `docs/acceptance/consumer-product-checklist.md` within the existing review,
including actual UI primary journeys, JSON-round-trip compiler checks and visual
inspection. The cases below bind that shared matrix to Appointment; they add no
new audit stage. Current verified coverage remains ten historical registered
definitions and six demonstrated runtime families, with Appointment UI reopened.

- **TST-001**: Begin with focused RED tests proving V1 remains generic and byte
  identical, V2 is separately recognized, and an actual generated V2 form emits
  exact mutation requests. Add negatives for every witness/permission/lock/binding
  mutation and direct compiler page seam. Test the preserved V1 projection while
  fresh default selects V2; prove no extra logical-family count.
- **TST-002**: Add route/store tests for missing/forged session, wrong role/policy,
  V1 endpoint absence, generic read denial, unknown/duplicate query, limits,
  escaped labels, pagination with scan exhaustion, inactive/closed/full/past/
  invalid slots, stable timezone values, no extra response fields and no-store.
  Summary cases cover full/cancelled bookings, historical slot/current label
  distinction, missing history, missing references and both authorization checks.
  Advance the live clock by more than one minute after initial selection and
  prove the retained window still works for pagination, refresh, validation/
  capacity-conflict recovery and exact-command retry; past slots disappear,
  while unchanged future choices remain valid. An entirely elapsed window is
  empty, not invalid. Prove first availability waits for the list Date bootstrap,
  proxy Date forwarding, missing/invalid-header retry, separate live/filter and
  fixed/auth clocks, replacement-versus-append results and selection preservation.
  Assert existing past-start claim/move behavior remains unchanged. ID tests
  include 1/128/129-character boundaries, generated and fixture IDs, case-distinct
  lookup, once-encoded valid characters, malformed/double encoding, whitespace,
  controls, non-ASCII, separators, duplicates, valid unknown IDs and safe errors.
  Race availability with a concurrent claim: one atomic winner at capacity one,
  visible conflict for the loser, no duplicate history/receipt/effect.
- **TST-003**: Run `pnpm --filter @factory/graph test`,
  `pnpm --filter @factory/capabilities test`,
  `pnpm --filter @factory/adapters test`, and
  `pnpm --filter @factory/compiler test` with focused Vitest filenames first.
  Run affected package typechecks, `pnpm --filter @factory/workbench test` for
  consumer-family/home cases, `pnpm --filter @factory/workbench build`,
  `node scripts/regression.mjs product`,
  `node scripts/verify-third-party-notices.mjs`, and
  `node scripts/verify-source-studies.mjs`. Check changed-file formatting.
  Record exact executed commands/results; this proposal reports none as passing.
- **TST-004**: After normal environment authorization, run
  `pnpm exec playwright test e2e/appointment-booking.spec.ts`. From actual fresh
  consumer business input through V2 verified ready link, observe zero technical
  lifecycle actions. All primary business operations must use visible generated
  controls: administrator creates service and two future schedules; mobile customer
  chooses service/time, requests, reloads and inspects shared demo appointment;
  staff confirms, reschedules, inspects ordered history and confirms again;
  customer cancels with reason; reload proves cancellation and history persistence.
  API helpers may seed auth/setup or inject failures and verify state, but cannot
  substitute for those UI business actions. Record each action and assertion.
- **TST-005**: Exercise real PostgreSQL concurrency, capacity conflict, stale
  expectedVersion, request/confirm/move/cancel lost response with exact retry,
  and a process restart while a browser command is retained. Verify one logical
  mutation/history effect, authoritative refresh and no unsafe duplicate button.
  Apply the shared checklist to keyboard/touch, icon names, validation retention, denied/
  empty/loading/error states, role switch and 390/768/1440 light/dark screenshots.
  A ready URL or API-only pass is not consumer acceptance. Skipped startup/blocked
  services are not passes. Prove owned preview container/network/volume/artifact
  cleanup on both success and failure using the existing harness.
- **TST-006**: Evidence belongs in
  `docs/acceptance/evidence/appointment-consumer-workspace/`; PM state remains in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Record ADR/source/input/Compilation identities, exact commands, safe request
  shape assertions without raw bodies, business questions/actions, technical
  actions, retries, machine wait, ready/first-use times, screenshots, persistence,
  negative cases and cleanup. Keep failures and old evidence. Report replacement
  revision acceptance separately from physical catalogue row count; add zero new
  logical products/runtime families. Independent task review, QA and final release
  judgment remain mandatory under delivery policy.

## Consequences and alternatives

- **POS-001**: Ordinary users can request a real available slot and act through
  correct controls; staff can manage state and history without manually crafting
  requests. Existing atomicity and immutable lineage remain reusable authority.
- **NEG-001**: Two presentation witnesses and one extra physical definition row
  require permanent compatibility coverage. The availability grant needs explicit
  security review, and role-wide fixture customer access is deliberately limited.
- **NEG-002**: Availability is a time-sensitive advisory view; large schedules
  require pagination and a slot can disappear before submit. No calendar sync,
  notifications provider, private ownership, recurring schedule or production
  deployment is included. Old V1 compilations retain their historical UI defect.
- **ALT-001**: Patch V1 generic output in place. Rejected: it breaks protected
  byte compatibility and silently changes immutable compiler semantics.
- **ALT-002**: Give customer/staff generic Schedule/Service read, or bypass policy
  using an administrator request. Rejected: it exposes excess data and weakens
  the explicit authorization boundary.
- **ALT-003**: Leave canonical V1 as automatic default and use API E2E calls.
  Rejected: it does not deliver the requested ordinary-user product.
- **ALT-004**: Add private customer ownership or a calendar package now. Rejected:
  those introduce separate identity/data/dependency decisions beyond this repair.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`; ADR-0071, ADR-0072, ADR-0073, ADR-0077 and ADR-0079.
- **REF-002**: Source and evidence paths in CTX, UIR, IMP and TST above are the
  current implementation authority; prose/UI screenshots alone are not proof of
  supported request contracts or acceptance.
