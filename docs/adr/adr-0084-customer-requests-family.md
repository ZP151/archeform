---
title: "ADR-0084: Customer Requests Family"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "decision", "customer-requests", "compiler", "authorization"]
supersedes: ""
superseded_by: ""
---

# ADR-0084: Customer Requests Family

## Status and recommendation

**Proposed. Recommendation: experiment** with `customer-requests/v1`, one
`customer-support-desk@1.0.0` definition and a responsive, persisted in-app
conversation. A customer submits and corrects a request; staff replies; the same
customer reads the reply and status, supplies further information or reopens a
resolution. Mistaken requests can be cancelled with retained history. Reuse the
existing generated store, transaction protection and UI assets. This is a bounded
local experiment with explicitly synthetic principals.

This proposal grants no implementation authority. PM must record exact-hash
founder acceptance, directly or through the separate qualified reviewer and
standing authorization in `docs/tech-governance.md`, before implementation.
No Product Publish, repository release, provider call, database operation, service
startup, cleanup, paid resource, cloud action or deployment is granted here.
The rejected Workbench startup remains blocked; this document is not a new route
to execute it. Proposal, source acceptance, actual local acceptance and hosted
availability remain separate outcomes.

## Context and current profile

- **CTX-001**: The source handoff is `22852e923c313d071266769bf9810937aad47017`.
  The active ledger records ten historically accepted local definitions across
  six demonstrated runtime families, reopened Appointment UI qualification and
  pending Work Orders actual consumer/PostgreSQL acceptance. Neither this
  proposal nor passing source tests increases those counts.
- **CTX-002**: Work Orders now has principal-aware assigned-work visibility,
  attributed events, correction, cancellation and authorization before receipt
  replay. It has no customer-owned request, customer-visible reply or customer
  reopen contract. A technician resolution report cannot stand in for a customer
  conversation. Appointment supplies persisted history, bounded reads and
  no-store transport patterns; its role-based customer read path is not evidence
  of same-role customer ownership isolation.
- **CUR-001**: Keep the Golden profile and governing root/package manifests and
  `pnpm-lock.yaml`: Node `>=22.11.0 <23`, pnpm `9.0.0`, resolved TypeScript
  `5.9.3`, Next `15.5.22`, React/DOM `19.2.8`, Nest `10.4.22`, Prisma/client
  `6.19.3`, BullMQ `5.81.2`, ioredis `5.11.1`, Puck `0.22.3`, XYFlow
  `12.11.2`; images remain floating `node:22-alpine`, `postgres:16-alpine`,
  `redis:7-alpine`. No package, range, lockfile, provider or topology changes.
- **CUR-002**: Retain `factory.application-graph/v1`,
  `factory.product-blueprint/v1`, existing definition-data/catalogue and
  composition-lock formats, stable `@factory/*` identifiers and immutable prior
  outputs. This additive family uses the current compiler target. Draft ->
  Publish -> immutable Compilation remains mandatory; production compilers accept
  only digest-verified Published Graphs with their verified physical locks.

## Alternatives considered

- **ALT-001**: **Keep and relabel Task or Work Orders — reject.** Neither currently
  enforces immutable customer ownership with an attributed conversation visible
  to that customer. Labels or a notification capability lock do not create it.
- **ALT-002**: **Experiment with the fixed local family below — recommend.** Add
  the missing ownership and conversation semantics while reusing proven
  transaction and rendering seams. It is reversible and independently testable.
- **ALT-003**: **Build full hosted support software now — defer.** Real accounts,
  email intake/delivery, staff assignment, internal notes, attachments, SLAs and
  production retention require further product and security decisions. They are
  not implied by this family. Real identity and authorized durable hosting remain
  explicit requirements of the overall goal, rather than being satisfied by a
  fixture or removed from it.

## Ordered reuse search and effects

| Order                  | Inspected source                                                                                                                                                                                                                                      | Reuse and remaining gap                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Approved registries | `packages/ui-primitives/src/index.ts`, `packages/ui-patterns/src/index.ts`, `packages/generated-ui/src/index.ts`, `packages/workbench-ui/src/index.ts`                                                                                                | Compose button, input, label, select, card, badge, dialog, form-field, data-table, confirmation-dialog, compact-sidebar-navigation and the six interaction states. Reuse mobile-product-shell and merchant-workspace-shell conventions. Restaurant order-timeline and customer-profile-form have incompatible business ports. No registry item supplies an attributed support transcript. |
| 2. Recipes             | `packages/screen-recipes/src/index.ts`, `packages/experience-recipes/src/index.ts`, `packages/product-recipes/src/index.ts`                                                                                                                           | Existing Restaurant/Fine Dining recipes supply responsive/token conventions, not customer-request semantics. Do not fabricate Restaurant bindings.                                                                                                                                                                                                                                        |
| 3. Workbench assets    | `apps/workbench/components/shell/workbench-shell.tsx`                                                                                                                                                                                                 | Reuse labelled landmarks, focus restoration and dismissible navigation conventions. Generated apps do not import the operator Workbench.                                                                                                                                                                                                                                                  |
| 4. Generated templates | `service-work-orders-presentation.ts`, `approval-workspace-presentation.ts`, `appointment-workspace-presentation.ts`, `service-work-orders-runtime.ts`, `mutation-write-protection.ts`, `appointment-consumer-read.ts` under `packages/compiler/src/` | Parameterize existing native workspace styling, state controls, immutable command recovery, escaping, bounded store reads and history views. Add the conversation and customer ownership adapter; do not clone a dispatcher runtime and change its labels.                                                                                                                                |
| 5. Pinned studies      | `docs/ecosystem/source-studies/README.md`, `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`                                                                                                                                        | No admitted external support implementation satisfies this contract. The August inventory is historical, not a claim that today's registries are absent. Copy no upstream or Base44 source.                                                                                                                                                                                               |

- **REU-001**: The distinct private composition key is
  `customer-requests-presentation@1.0.0`, Factory-authored, `UNLICENSED`.
  It owns the customer/staff transcript, correction linkage, next-action projection
  and role-appropriate actions. Record reused keys and emitted interaction tests;
  keep existing registry descriptors unchanged. Reuse only the existing local
  `lucide-static@0.468.0` allowlist and retain its ISC notices. No new icon package,
  downloaded asset, copied source or generated runtime dependency is needed.
- **REU-002**: Reuse exactly these existing physical locks. Verify their package
  roots, manifests, complete composition closure, bindings and lock digest; do
  not edit capability assets or invent a new capability effect.

| Capability                 | Version | Manifest SHA-256                                                   |
| -------------------------- | ------- | ------------------------------------------------------------------ |
| `core.crud`                | `1.0.1` | `8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1` |
| `core.workflow`            | `1.0.1` | `16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884` |
| `core.identity-policy`     | `1.0.0` | `a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82` |
| `core.policy-declarations` | `1.0.0` | `56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54` |
| `core.audit`               | `1.0.2` | `fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8` |
| `core.notification`        | `1.1.1` | `207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132` |

- **REU-003**: Executable reuse is mandatory, not merely catalogue membership:
  call `writeProtectionFragments("task", graphHash)` for canonical hashing,
  bounded idempotency keys, scoped identity and receipt serialization through the
  small family adapter already used by Work Orders; reuse the generated
  `RecordStore.inTransaction`, memory `coordinateMutation`, Prisma transaction
  lifecycle and normal record/audit delegates in `packages/compiler/src/index.ts`.
  Add only the owner-aware conditional write, scoped bounded reads and receipt
  delegate needed by this family. Reuse `createGeneratedPageRuntimeProjection`,
  parameterize `renderWorkspaceStyles` with the `customer-request` prefix, and
  reuse `getCustomerIconAssets` plus the existing token/recovery control patterns.
  Reuse `resolveFixturePrincipal`/`authorizeDeclaredAction` as executable identity
  boundaries. Appointment's read routing and Work Orders' frozen-command state
  are patterns to adapt, not falsely claimed callable generic conversation helpers.
- **REU-004**: New first-party logic is limited to exact family admission,
  customer ownership, message/correction validation, nextActor projection,
  transcript/actions and their bound storage/transport adapters. Do not copy the
  complete Work Orders emitter, introduce a second generic application runtime,
  or refactor unrelated families. A private helper extraction is permitted only
  within the assigned integration paths, with bounded inputs and exact historical
  generated-byte equality; otherwise compose the existing seam. Subsequent
  supported domain definitions use the same family/profile/presentation through
  safe definition data and bindings, with zero new runtime/UI branches per
  definition. A materially different rule is unsupported until separately decided.

- **EFF-001**: API/data effects are the new fixed request/history/receipt contracts
  below. Adapter/catalogue effects are one strict family registration and one
  definition through the existing data admission and requirement-retention path.
  Preserve unsupported requirements using accepted ADR-0078 behavior; no prompt
  label, capability match or successful provider response establishes admission.
  Notification infrastructure sends no email, push message or external response.
  A saved in-app reply is its actual delivery outcome.
- **EFF-002**: Security effects are fixture-level customer ownership checks and
  no-store responses inside one isolated generated application. Existing
  production identity, multi-tenant and Docker-socket residual risks remain with
  their current owners. Operability stays within the existing local compiler and
  isolated PostgreSQL store; no new worker, queue, transport or service is needed.

## Proposed frozen family and Graph contract

- **FAM-001**: Family key `customer-requests`, version `customer-requests/v1`,
  parameter policy `none/v1`, compiler profile `customer-requests@1.0.0` and
  REU-001 presentation. Add only `reply` to the Blueprint action vocabulary.
  Reuse `complete` for the staff action labelled **Resolve request**; it moves
  this family's state to `resolved`. Reuse `create/read/update/reopen/cancel`.
  This avoids redefining Work Orders' `resolve`/assignment candidate contract.
  Older family matchers must reject `reply`; a malformed Customer Requests
  candidate must fail rather than fall through into generic CRUD or another family.
- **FAM-002**: Exactly two ordered business entities: request, history; followed
  by the existing composed principal and session entities. Labels, role keys,
  entity keys, workflow key and page keys may vary as safe Graph identifiers;
  field keys, field ordering, types, actions and relationships are fixed. Request
  fields in order are required `subject:string`, `description:text`,
  `status:enum(open,resolved,cancelled)`, `customerPrincipalId:string`.
  Indexes are `[{fields:["status"]},{fields:["customerPrincipalId"]}]`.
  ID/version remain factory-owned, never declared as business fields. New
  requests start `open`, version `0`, with owner derived from the server actor.
  `domain.seedData` is explicitly `[]`; neither fake requests nor fake messages
  are business seed witnesses.
- **FAM-003**: History fields in order are required `request` reference,
  `action:enum(create,update,reply,complete,reopen,cancel)`,
  `requestVersion:integer`, `toStatus:enum(open,resolved,cancelled)`,
  `actorPrincipalId:string`, `actorRole:string`, `recordedAt:datetime`; then
  optional `fromStatus` with the same status enum, `message:text`, `reason:text`,
  `correctsVersion:integer`, `beforeSubject:string`, `afterSubject:string`,
  `beforeDescription:text`, `afterDescription:text`.
  Blueprint uses `reference`, `number`, `text`, `long-text`, `datetime`, `enum`
  for the corresponding types. `request` projects to Graph/storage
  `requestId:string`, a many-to-one relation to the request's injected ID, and
  API field `request`. History is unique by `(requestId,requestVersion)`.
  Each committed command, including create, appends exactly one event at the new
  request version. There is no generic history write or separate mutable message.
- **FAM-004**: Both numeric coordinates use exactly
  `{apiVersion:"factory.numeric-field-domain/v1",minimum:{value:0,inclusive:true},maximum:{value:2147483647,inclusive:true}}`.
  `requestVersion` is required; `correctsVersion` is optional. A pure,
  schema-parsed Blueprint matcher and browser-safe computed Graph witness
  `factory.customer-requests-graph-witness/v1` recognize the complete family.
  Only their two history numeric coordinates receive the existing witnessed
  seedless-domain treatment in Graph validation/composition. Retain bounds,
  integer validation and every unrelated numeric/seed check. No new field type,
  serialized authority flag or general seedless bypass is introduced.
- **FAM-005**: Ordered roles are staff, customer. Staff request grants are
  `read,reply,complete`; customer grants are `create,read,update,reply,reopen,cancel`.
  Both have history `read` only. Preserve standard composed identity grants:
  staff principal `read`, session `create,read,update`; customer principal `read`,
  session `read`. All generic identity routes remain denied. The sole request
  flow starts `open`, has states `open,resolved,cancelled`, events
  `complete,reopen,cancel`, and exactly these transitions without effects:
  staff `complete: open -> resolved`; customer `reopen: resolved -> open`;
  customer `cancel: open -> cancelled`. Reply and correction are versioned
  mutations that keep `open`; they are not additional flow transitions.
  No duplicate-transition exception is necessary.
- **FAM-006**: Four ordered request page intents: customer list, submission form,
  shared detail, staff queue (`list,form,detail,queue`). Use the established
  one-block-per-intent projection, routes `/<pageKey>`, block IDs
  `<pageKey>-<intent>`, and list/queue navigation with icons `list/inbox`.
  The presentation shows the customer list/form to customers and the triage queue
  to staff; route visibility alone never authorizes a read. Bind `core.crud` to
  request/customer-list, workflow to the sole flow, identity to the composed
  principal/session with staff default role and customer authenticated role,
  audit/notification to staff, and policy-declarations to empty bindings. Keep
  the existing principal/session shape and relation from the composer.
  Integration has `providers:[]` and only `identity.context.resolve/resolve`,
  `authorization.decision/decision`, `audit.record/record` with provider `factory`.
- **FAM-007**: Compiler selection independently checks strict lossless schema
  parsing, full structure, roles/grants, pages, relations, exact bindings and six
  physical locks/digests against the Published Graph hash after a JSON persistence
  round trip. Reject extra fields, grants, effects, routes, entities, populated
  seeds, inherited/accessor data or caller-supplied witnesses. Family selection
  must be mutually exclusive with Task, Approval, Work Orders and Appointment.
  Candidate recognition includes the distinctive owner/history coordinates and
  `reply`, not a user-visible title. Preserve old compiled bytes and failures.

## Identity and ownership boundary

- **SEC-001**: Only this exact family receives the fixed roster below. Roles are
  selector bindings, never inferred from slot identifiers. Reuse the package
  `LocalPrincipalContext`, `resolveFixturePrincipal`, `authorizeDeclaredAction`,
  tenant `tenant-local`, expiry `2099-01-01T00:00:00.000Z` and resolver clock
  `2026-01-01T00:00:00.000Z`. All IDs satisfy existing 64-character transport
  bounds even when Graph role keys are at their maximum length.

| Slot       | Principal ID                      | Session ID                      | Role                     |
| ---------- | --------------------------------- | ------------------------------- | ------------------------ |
| Staff      | `fixture-principal-support-staff` | `fixture-session-support-staff` | `profile.roles.staff`    |
| Customer A | `fixture-principal-customer-a`    | `fixture-session-customer-a`    | `profile.roles.customer` |
| Customer B | `fixture-principal-customer-b`    | `fixture-session-customer-b`    | `profile.roles.customer` |

- **SEC-002**: Server resolution, not the browser, supplies principal, tenant,
  role and session. Reject missing, unknown, expired or malformed sessions,
  multiple/oversized headers and role/principal/tenant override headers. Require
  the fixed same-app fixture tenant and declared role/capability permission on
  every route. The isolated generated store is the application boundary; shared
  stores or independent real tenants are outside this profile.
- **SEC-003**: The owner is immutable. Customers may read and act only on their
  own requests; staff may read/respond/resolve requests in this application.
  Enforce ownership on list, detail, history, latest-message projections, all
  mutation paths and receipt replay. Owner or role passed in a body/filter is
  never accepted. Foreign-owner, cross-app and absent record IDs have the same
  `404 customer_request.not_found` result. Role denial is 403 without record
  information. Do not expose generic CRUD, audit, capability, identity, session,
  standalone history or receipt routes as a bypass.
- **SEC-004**: Show **Local demo — synthetic customers and staff** persistently.
  Fixture switching is explicitly a demonstration, not authentication. Same-role
  A/B tests prove the server's ownership rule, not private accounts: predictable
  fixture sessions cannot protect real customer data. Real customer identity,
  private portal access and authorized durable hosting remain blocking final-goal
  work with the existing PM/Security owners. Intake that requires these retains
  the requirement and clarifies/defers; it cannot claim this experiment meets it.
- **SEC-005**: All request responses and Next proxy forwarding use
  `Cache-Control: no-store`; browser fetches use `cache:'no-store'`. On principal
  switch abort reads and clear request, transcript, draft and pending-command UI;
  ignore late results by principal plus request identity. No message, description,
  session or pending command is persisted to local/session storage, logs, audit
  bodies or evidence. The selected synthetic slot may be stored separately, as
  in Work Orders. Business message text persists only in its authorized business
  record/event and receipt response, never as raw provider material.

## Mutation, conversation and correction contract

- **API-001**: Versioned identifiers are
  `factory.generated.customer-request-mutation/v1`,
  `factory.generated.customer-request-mutation-receipt/v1`,
  `factory.generated.customer-request-history-entry/v1` and
  `factory.generated.customer-request-read/v1`. The first two identify the fixed
  command/receipt schemas; history and read responses carry `apiVersion`.
  Reuse `GET/POST /api/:entity`, `GET /api/:entity/:recordId`,
  `GET /api/:entity/:recordId/history` and
  `POST /api/:entity/:recordId/events/:command` only for the request entity.
  Create has no second event alias. Reserve business entity keys `health`,
  `audit`, `capabilities`, `work-order-assignees` to avoid static-route collisions.
  Health is the sole unauthenticated route; no roster API or external endpoint.
- **API-002**: Require the existing `x-factory-idempotency-key`, matching
  `^[A-Za-z0-9._:-]{1,128}$`, on every command. Bodies are exact own JSON data
  objects with no unknown/inherited/accessor keys. Trim and require nonempty
  plain text: subject maximum 160, description/message/resolution maximum 2000,
  reason maximum 500. Reject NUL and control characters except tab/newline/CR in
  multiline fields; subject allows none. Render all business text as text, never
  HTML, Markdown, a URL or executable source. Integers are safe `0..2147483647`,
  excluding negative zero. The following is the complete body/action contract.

| Command    | Exact body                                              | Actor/state and resulting behavior                                                                                                                        |
| ---------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`   | `{values:{subject,description}}`                        | Customer; create an owned open request at version 0.                                                                                                      |
| `update`   | `{expectedVersion,reason,values:{subject,description}}` | Owning customer, open only; replace both metadata values, reject a normalized no-op; preserve owner/messages.                                             |
| `reply`    | `{expectedVersion,message,correctsVersion}`             | Staff or owning customer, open only; `correctsVersion` is null for a new message or a previous version as specified below; preserve state/metadata/owner. |
| `complete` | `{expectedVersion,resolutionMessage}`                   | Staff, open only; save a customer-visible resolution message and set resolved atomically.                                                                 |
| `reopen`   | `{expectedVersion,reason}`                              | Owning customer, resolved only; set open and retain every earlier message/resolution.                                                                     |
| `cancel`   | `{expectedVersion,reason}`                              | Owning customer, open only; set cancelled, retain all prior content and attribution.                                                                      |

- **API-003**: Create history stores afterSubject/afterDescription; update stores
  both before and after values and the reason. Reply stores message and optional
  correctsVersion; complete stores resolutionMessage as message; reopen/cancel
  store reason. All inapplicable optional event fields serialize as null. Server
  owns actor, role, time, versions, state, owner and snapshots. Staff cannot edit
  a customer's initial text; customers cannot edit staff text. No event is edited
  or deleted. A linked correction is a new reply: its target must be an earlier
  `reply` or `complete` event in this request by the exact same principal, and
  must not already have a correcting reply. To correct a correction, target its
  newer reply version. Validate this inside the command transaction. Other
  request/principal, nonexistent, duplicate-target or non-message targets return
  400 invalid_request without revealing the target. UI retains the original,
  clearly links the correction and offers the latest corrected text. There is no
  private/internal note: every history entry is visible to the owning customer.
- **API-004**: Resolved requests are read-only except explicit customer reopen;
  no automatic reopen on reply. Staff cannot reopen on a customer's behalf.
  A mistaken resolution needs customer reopen before further reply/correction.
  Cancelled requests are terminal, with cancellation reason visible; customers
  can submit a new request, not resurrect or delete the cancelled one. Repeated
  resolution/reopen cycles remain separate attributed events. This deliberate
  bounded policy is not an SLA, automatic closure rule or customer-read receipt.
- **API-005**: Within one serializable transaction: resolve/recheck actor and
  permission; find the record and verify ownership before replay; validate the
  same-scope stored receipt; check expected version/current state; validate any
  correction target; conditionally update by ID, owner, version and state; append
  one history event, safe body-free audit and receipt. Creation stores the owner
  and event atomically; a create receipt replay rechecks ownership of its saved
  record before returning. No read-modify-write outside the transaction and no
  generic unguarded update alias. Version exhaustion fails without writes.
- **API-006**: Reuse canonical normalized-payload hashing and hashed stored keys
  through a private adapter around `writeProtectionFragments`. Scope includes
  Graph/application identity, tenant, principal, role, entity, record or `$create`,
  and command. Reuse at most four transaction attempts for existing P2002/P2034
  races; exhausted conflicts return retryable_conflict. Do not reuse the generic
  receipt-first fragment unchanged. Exact retries return the original status and
  response only to a still-authorized actor, even after later resolution or
  cancellation; a fresh command must satisfy current state/version. Changed-body
  key reuse returns idempotency_conflict. The UI refreshes authoritative state
  after replay so an old success cannot appear to undo a later state change.
- **API-007**: Success is 201 create or 200 event command with exactly
  `{request,event}`. Request is `{id,version,subject,description,status,customerPrincipalId}`;
  event contains its history apiVersion, ID and all FAM-003 API fields, including
  explicit nulls. The private receipt persists scope, keyDigest, requestHash,
  command, recordId, responseStatus, responseBody, with unique `(scope,keyDigest)`;
  it is inaccessible as a public resource. Errors are `{code}`: 400
  `customer_request.invalid_request`; 403 `customer_request.forbidden`; 404
  `customer_request.not_found`; 409 `customer_request.version_conflict`,
  `customer_request.state_conflict`, `customer_request.idempotency_conflict`,
  `customer_request.retryable_conflict`, `customer_request.version_exhausted`;
  500 `customer_request.internal_error`; 503
  `customer_request.unavailable` for unavailable read/proxy transport. No error
  includes a body, foreign metadata or internal exception.

## Bounded reads and understandable triage

- **RDS-001**: List query accepts only `limit` (default 20, integer 1..50), exact
  `status` and `afterId`; history accepts only `limit` with the same bounds and
  `beforeVersion` (nonnegative bounded integer). Reject duplicate/unknown query
  keys, malformed encoding, signs, decimal/leading-zero numeric strings and empty
  cursors. Record/cursor IDs are bounded nonempty strings, at most 128 characters,
  with no controls or whitespace. An absent/foreign record path still returns
  indistinguishable 404. An `afterId` is a comparison cursor, never an access
  credential or a lookup that reveals its owner's record.
- **RDS-002**: List returns
  `{apiVersion:"factory.generated.customer-request-read/v1",items,nextAfterId}`,
  stable ID ascending, maximum limit rows; `items` are request fields plus
  `nextActor` and `lastActivity` below. Apply server owner/status/cursor predicates
  before limit+1 retrieval. History returns the same read apiVersion with
  `{items,nextBeforeVersion}`, strictly descending requestVersion, maximum limit;
  every item is the attributed history entry. Cursors are the last returned
  ID/version only when another row exists, otherwise null. Show **Load more** or
  **Load earlier messages**, not a silently truncated transcript. Newer activity
  requires refresh; pagination makes no snapshot-across-requests guarantee.
- **RDS-003**: Detail returns the read apiVersion plus
  `{request,nextActor,lastActivity,latestReply}`. `latestReply` is the newest
  `reply` or `complete` event or null, with `historical:true` exactly when it is a
  `complete` event and the current state is no longer resolved. Full history
  preserves earlier resolutions and correction links; a latestReply projection
  never replaces the transcript. `lastActivity` is the highest-version event
  projected to `{requestVersion,action,actorRole,recordedAt}`. In `open`,
  `nextActor` is `customer` after a staff reply and `staff` otherwise; it is null
  in resolved/cancelled states. These are fixed semantic slots, not Graph role
  names. Display **Waiting for customer reply**, **Waiting for staff reply**, or
  the terminal status, without implying delivery outside the app, unread counts,
  viewed timestamps, assignment or a deadline.
- **RDS-004**: Use one serializable read transaction for each list/detail/history
  response, with at most four attempts for the existing transaction conflict
  codes; exhausted read retries return 503 unavailable without partial data.
  List does one scoped limit+1 request query and at most one indexed take-1
  latest-event query for each returned request, maximum 51 bounded queries.
  Detail uses the authorized request and at most two take-1 history queries
  (latest event; latest reply/complete). History authorizes its parent before
  querying limit+1 events. Do not materialize all history or use an unbounded
  in-memory distinct operation in PostgreSQL. Missing/corrupt required event
  evidence, including a lastActivity version unequal to the request version,
  fails safely, rather than inventing a next actor. These bounds trade a
  small fixed number of queries for a simple auditable implementation; no new
  mutable triage state, count endpoint or search index is introduced.

## Responsive business and recovery surface

- **UXR-001**: At 390px, customers can submit, find their request, read the staff
  answer and resolution, reply, correct their own text, cancel a mistake and
  reopen. At 1440px, staff can triage by status/next actor, open a request, read
  context, reply, correct their own message and resolve. Both use the same saved
  records; 768px retains usable navigation and all applicable actions. Compose a
  compact request list and readable attributed conversation, with clear status,
  role, saved time and correction labels; do not present a technician work queue.
- **UXR-002**: Keep typed values on validation/stale failure. Show authoritative
  current values and changed status before a user consciously reapplies a draft.
  Freeze principal, path, serialized body, expectedVersion and key for an uncertain
  write. Retry only that same command while its actor remains selected; never
  silently replace its key or update its version. Disable duplicate submits,
  separate safe retry from starting another command and announce success/errors.
  A principal switch clears this in-memory command instead of replaying it under
  another principal. Reload restores committed server state, not unsaved text.
- **UXR-003**: Provide loading, empty, validation, error, confirmation and denial
  states, explicit stale/lost-response recovery, focus restoration, labelled
  native controls, touch targets, keyboard navigation and wrapped long text.
  A saved response says it was saved in the request; it does not say an email was
  sent or the customer read it. Actual consumer entry composes accepted automatic
  delivery only after exact witness admission, with visible failure/retry and
  manual opt-out. Ordinary users should not operate plan, Publish or Compile
  controls to obtain this family.

## Ownership, rollout and abort conditions

- **IMP-001**: After acceptance, PM assigns one serialized contract/integration
  owner for Graph `src/{product-blueprint,model,index,customer-requests-blueprint-witness,customer-requests-graph-witness}.ts`
  and tests; capabilities `src/product-composer.ts` and focused composition tests;
  compiler `src/{index,customer-requests-contract,customer-requests-runtime}.ts`
  and focused contract/runtime/compilation tests. This owner freezes the exact
  profile/fixture/read/write handoff before any presentation writer starts.
  New compiler root exports are limited to `selectCustomerRequestsProfile` and
  type `CustomerRequestsProfile` for worker selection; update the exact existing
  export allowlist test, not deep-import access. The immutable profile exposes
  key/version, graphHash, request/history/principal/session entity keys, workflow,
  roles `{staff,customer}`, pages `{list,form,detail,queue}` and reference
  `{blueprint:"request",storage:"requestId",api:"request"}`; limits are fixed by
  this ADR, not caller configuration. No capability asset writes are authorized.
- **IMP-002**: The later presentation owner owns only compiler
  `src/customer-requests-presentation.ts` and its interaction tests. The integration
  owner serially adds the style profile and emitter routing in shared files.
  Worker verification uses new `customer-requests-verification.ts` plus its
  focused tests under `apps/compiler-worker/src/verifier/`; root assigns shared
  verifier routing, bounded probes and scenario handoff serially. Fixed roster
  IDs, Graph role bindings and transport limits must agree across all three
  consumers. No implementation writer chooses a replacement identity contract.
- **IMP-003**: After runtime contracts freeze, PM assigns the definition/consumer
  slice in `packages/adapters/src/requirements/` and its tests, relevant
  capability-matcher tests, and Workbench
  `lib/product-journey/{consumer-family,use-consumer-generation}` with tests.
  Root owns exact definition-case bindings, case index/typecheck integration,
  `e2e/customer-requests.spec.ts` and helpers, and PM/evidence docs unless
  explicitly transferred. Use existing admission tooling for the single
  canonical definition, not a new harness. Parallel work requires disjoint
  enumerated paths and a frozen shared handoff; any shared-contract change stops
  the wave. Reuse source reviews for unchanged paths and affected checks only.
- **IMP-004**: Only newly generated apps receive additive request/history/receipt
  tables in their existing isolated PostgreSQL store; memory remains fixture-only.
  No migration of existing Task/Work Orders/Appointment data, historic Published
  Graphs or Compilations. Backout disables new-family admission and emitter
  selection while preserving artifacts and saved experimental data for inspection.
  No destructive down-migration, volume deletion or cleanup against durable data.
  Compatible upgrades and backup restore for this new data contract still need
  actual delivery evidence; the existing Task rehearsal does not prove them.
- **ABT-001**: Stop for historical byte drift, weak ownership/receipt scope,
  unrepresentable Graph semantics, a contract ambiguity, a shared-writer clash,
  new dependency/provider, real private data, new tenant/storage boundary,
  destructive migration or an expanded hosting requirement. Return the concrete
  change to PM/Tech Lead; never silently relax a validator or acceptance outcome.
- **ABT-002**: The local source stage excludes account administration, customer
  organization sharing, anonymous/private links, staff assignment, internal notes,
  attachments, email/SMS/push, omnichannel intake, unread/read receipts, search,
  SLA/priority automation, escalation, merges, deletion/redaction and payments.
  Messages are append-only; real retention/erasure policy remains part of the
  later real-data boundary. Requested unsupported needs remain visible. No
  unresolved business policy is delegated to the implementation writer.

## Acceptance witnesses and measurable verification

- **VER-001**: RED first for exact Graph/Blueprint/lock admission after JSON round
  trip, numeric domains/empty seeds, unknown keys, overgrant, extra effects,
  duplicate transitions, changed locks and malformed lookalikes. Prove old-family
  rejection and unchanged historical generated bytes without recapturing existing
  baselines. Include renamed/swapped/maximum-length roles and fixture parity.
- **VER-002**: Execute emitted runtime, not source-string assertions alone.
  Two customers sharing one role independently create requests. B cannot list,
  read, inspect history/latest reply, mutate, correct or replay A's request;
  staff can respond and A can read it after reload. Forge owners/context, probe
  every generic route and cross-app ID, mutate corrected/terminal records, submit
  hostile text and malformed pagination. Assert no foreign response or write.
  Exercise all commands, repeated reopen/resolution, no-op correction, append
  correction linkage/duplicate-target denial, terminal cancellation and event
  attribution. Walk more than 50 requests/events to prove pagination and bounds.
- **VER-003**: Real PostgreSQL witnesses must prove CAS for simultaneous
  reply/resolve, update/cancel and reply/correction; exactly one event per committed
  version; one result on lost-response retry; changed-body key conflict; atomic
  rollback of request/history/audit/receipt on injected failure; version exhaustion;
  authoritative nextActor and retained messages after reload/restart. Memory and
  skipped database checks cannot satisfy durable acceptance. No service/database
  execution is authorized by this proposed ADR, and the current startup rejection
  is not retried or circumvented for these witnesses.
- **VER-004**: Once files exist, focused source commands are:
  `pnpm --filter @factory/graph exec vitest run test/customer-requests-blueprint-witness.test.ts test/customer-requests-graph-witness.test.ts`;
  `pnpm --filter @factory/capabilities exec vitest run test/customer-requests-composition.test.ts`;
  `pnpm --filter @factory/compiler exec vitest run test/customer-requests-contract.test.ts test/customer-requests-runtime.test.ts test/customer-requests-compilation.test.ts test/customer-requests-presentation.test.ts test/index-exports.test.ts`;
  `pnpm --filter @factory/adapters exec vitest run test/customer-requests-definition.test.ts`.
  Reuse `pnpm regression definitions`, affected package typecheck/build and the
  existing worker verification and consumer-family tests. Future actual case
  selection is `pnpm exec playwright test e2e/customer-requests.spec.ts` only after
  the controller has independently cleared the blocked execution boundary and
  owns the exact local resources. Listing commands is not evidence they passed.
- **VER-005**: The actual consumer case must start at Home with a synthetic-local
  brief, retain material requirements, reach the same immutable generated app
  without manual lifecycle buttons and measure technical handoffs. At 390,
  customer A submits wrong metadata, corrects it, reloads and retains before/after
  history. At 1440, staff reads it, replies, corrects that reply, and A reads both
  with attribution on a fresh phone view. A sends a follow-up; staff resolves
  with a visible message; A reads status/message, reopens with reason; staff
  responds and resolves again. Separately cancel a mistaken request; prove its
  terminal state and history. B's same-role session sees neither request. Inject
  one uncertain write and one stale correction with useful UI recovery, check
  390/768/1440, keyboard/touch, all states and no cached A data after switching.
- **VER-006**: PM records immutable Graph/Published/Compilation/source identities,
  attempted commands, safe summaries/digests, viewport observations, business
  questions, ready/first-action times, technical actions, repair steps, persistence,
  denied access and authorized resource cleanup in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`, with the
  packet under `docs/acceptance/evidence/customer-requests/`. Preserve failures and
  blocked cases. Target prepared-local useful action within five minutes and zero
  technical handoffs, with measured results rather than a guarantee. The shared
  contract/security slice uses existing task review, independent Terra QA, Sol
  judgment, PM acceptance and controller delivery; ordinary contained corrections
  do not restart the chain. Hosted availability, durable upgrades and recovery
  remain separate final-goal scorecard fields.
- **VER-007**: Record executable helper names, reused asset keys, new/changed
  family runtime/UI paths and nonblank line counts in the existing acceptance
  packet; compare them with the frozen source baseline rather than claiming an
  unsupported reuse percentage. After this canonical family passes, assess
  3-5 domain briefs through the existing definition admission tool. For every
  admitted brief, the runtime/profile/UI source diff must be zero, the frozen
  business witness and requirement-retention checks must pass, and the existing
  semantic fingerprint/deduplication rules must reject label-only duplicates.
  Report candidates, duplicates, unsupported rules and genuinely distinct admitted
  jobs separately; if this fixed family admits only the canonical job, report that
  result rather than manufacturing additional products.

## Consequences

- **POS-001**: Customer ownership and persisted in-app conversation make this a
  distinct reusable business family. Existing locks, history stores, mutation
  protection and UI assets cover much of the mechanism without a new provider.
- **POS-002**: Explicit correction, cancellation, reopen and uncertainty handling
  support the second useful action, while immutable event attribution explains
  what changed and who should reply next.
- **NEG-001**: Synthetic sessions cannot establish privacy for real customers.
  This source experiment alone does not deliver the hosted product the goal
  ultimately requires. Pending actual local evidence remains a real gap.
- **NEG-002**: The fixed policy excludes common support features and requires
  customer reopen even for a mistaken staff resolution. Append-only corrections
  preserve erroneous text; no private or sensitive real data is admitted here.
  Bounded per-request last-activity lookups are simple but add up to 50 small
  indexed reads per page; measure before proposing a different projection.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`, `docs/acceptance/consumer-product-checklist.md`.
- **REF-002**: Active consumer ledger and
  `docs/superpowers/plans/2026-09-24-family-expansion-and-delivery.md`.
- **REF-003**: ADR-0080/0083 Work Orders contract/fixture coordinates;
  ADR-0071/0081/0082 Appointment transaction/read/workspace patterns;
  ADR-0078 requirement retention; ADR-0079 automatic consumer delivery.
- **REF-004**: Inspected implementation paths in the reuse table,
  `packages/compiler/src/service-work-orders-contract.ts`,
  `packages/graph/src/service-work-orders-graph-witness.ts`,
  `packages/capabilities/src/product-composer.ts`,
  `packages/adapters/src/requirements/definition-family-registry.ts` and
  `packages/compiler/src/index.ts`. Public behavioral research, separately owned
  by root in `docs/market-validation.md`, is reference only and admits no source,
  dependency, copied state machine or additional feature scope.
