---
title: "ADR-0080: Service Work Orders Family"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "work-orders", "compiler", "authorization"]
supersedes: ""
superseded_by: ""
---

# ADR-0080: Service Work Orders Family

## Status and recommendation

**Proposed. Recommendation: experiment** with `service-work-orders/v1`, one
`facilities-service-desk@1.0.0` definition, desktop dispatch and mobile web
technician work on the same persisted orders. Reuse the existing generated
runtime and mutation protection; add assignment, saved correction, cancellation,
resolution history and family-specific authorization/presentation. This is a synthetic local product
experiment with fixture principals, not private staff identity or hosted service.

This document grants no implementation authority. PM records exact-hash founder
acceptance, or an independent qualified review meeting the September 1 standing
policy, before freezing implementation ownership. ADR-0078/0079 remain prior
shared-source work. No count increases from this proposal. No provider, cloud,
release, real-user Product Publish, deployment or credential action is granted.

## Context and current profile

- **CTX-001**: The active consumer ledger reports ten accepted definitions and
  six demonstrated families. The September 24 expansion plan requires actual
  dispatch, assigned technician work, resolution evidence and reopen; changing
  Task labels cannot satisfy it. Hosted delivery and ordinary-user success remain
  unproven and are not prerequisites for this bounded local experiment.
- **CTX-002**: `task-mutation-contract.ts` admits exactly five business fields,
  treats `assignee` as text, authorizes a modifying role, and completes with only
  `expectedVersion`. Its audit records a role, not a technician principal or
  resolution. Its accepted V2 correction already updates all five metadata fields
  with CAS/idempotency in not-started/in-progress states; Inventory also corrects
  saved item names. Reuse those recovery conventions. Keep Task selectors,
  contracts and historical bytes unchanged.
- **CTX-003**: `index.ts` resolves `core.identity-policy@1.0.0` into one predictable
  fixture principal/session per role and a fixed fixture clock. The package
  already exports `LocalPrincipalContext`, `resolveFixturePrincipal` and
  `authorizeDeclaredAction`; none provides private accounts. Assignment requires
  at least two distinct principals sharing the technician role to test honestly.
- **CUR-001**: Keep the exact Golden table in `docs/tech-governance.md`, governed by
  root/package manifests and `pnpm-lock.yaml`: Node `>=22.11.0 <23`, pnpm `9.0.0`,
  TypeScript `5.9.3`, Next `15.5.22`, React/DOM `19.2.8`, Nest `10.4.22`,
  Prisma/client `6.19.3`, BullMQ `5.81.2`, ioredis `5.11.1`, Puck `0.22.3`,
  XYFlow `12.11.2`; images remain floating `node:22-alpine`, `postgres:16-alpine`,
  `redis:7-alpine`. No dependency/range/lockfile, provider or topology change.
- **CUR-002**: Preserve `factory.application-graph/v1`, Blueprint, definition-data,
  catalogue, capability and composition-lock V1 formats. Add Blueprint verbs
  `assign`, `reassign`, `resolve`; reuse existing `update` and `cancel`. The exact
  Work Orders numeric/seed and cancel-transition exceptions below are additive;
  old values, unrelated rejection and output stay identical. Retain Draft ->
  Publish -> immutable Compilation;
  production compilers accept only digest-verified Published input.

## Alternatives considered

- **ALT-001**: **Keep Task and rename it. Rejected:** missing principal assignment,
  record-scoped checks and resolution evidence would remain, despite new labels.
- **ALT-002**: **Experiment with a fixed Work Orders family. Recommended:** compose
  the existing runtime, receipts, stores and UI helpers around explicit business
  rules. Independently reject malformed lookalikes and keep previous output equal.
- **ALT-003**: **Migrate to generic workflow/identity infrastructure. Deferred:** a
  rules engine, staff-account management, uploads or provider delivery expands
  scope before the first complete local job; it requires a separate decision.

## Reuse decision

| Search order        | Sources and reuse                                                                                                                                                                                                                              | Gap / exclusion                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approved registries | `ui-primitives`: button/input/label/select/card/badge/dialog; `ui-patterns`: form-field/data-table/confirmation-dialog and six recovery states; `generated-ui`: mobile-product-shell/merchant-workspace-shell; `workbench-ui` context boundary | Compose controls and shell conventions; no style-only asset or private runtime import.                                                                         |
| Recipes             | `screen-recipes`, `experience-recipes`, `product-recipes` existing Restaurant entries                                                                                                                                                          | Restaurant menu, pricing and customer ports do not express dispatch; reuse responsive/token conventions, not false Restaurant bindings.                        |
| Workbench assets    | `apps/workbench/components/shell/workbench-shell.tsx`                                                                                                                                                                                          | Reuse labelled landmarks/focus conventions; do not import operator controls into generated code.                                                               |
| Generated templates | `task-workspace-presentation.ts`, `approval-workspace-presentation.ts`, `mutation-write-protection.ts`, Appointment history and Inventory runtime/store patterns                                                                               | Reuse shell/data/recovery helpers, transaction/receipt/CAS architecture; add principal-scoped assignment and resolution semantics, not a copied whole runtime. |
| Pinned studies      | `docs/ecosystem/source-studies/README.md`, August 12 UI reuse inventory                                                                                                                                                                        | No eligible external Work Orders implementation is admitted. Copy no upstream or Base44 source.                                                                |

- **REU-001**: New private composition key `service-work-orders-presentation@1.0.0`
  owns the dispatch/technician interaction gap, with Factory-authored `UNLICENSED`
  provenance, reused keys and emitted interaction tests. Keep existing registry
  descriptors unchanged. Existing local Lucide assets retain `0.468.0` notices.
- **REU-002**: Keep the six locks and unchanged manifest digests already frozen in
  `definition-family-registry.ts`: `core.crud@1.0.1`, `core.workflow@1.0.1`,
  `core.identity-policy@1.0.0`, `core.policy-declarations@1.0.0`, `core.audit@1.0.2`,
  `core.notification@1.1.1`. No new capability package or invented effect; the
  family records business history. Notification infrastructure promises no message.

## Proposed frozen family contract

- **FAM-001**: Registry key `service-work-orders`, version `service-work-orders/v1`,
  parameter policy `none/v1`, compiler profile `service-work-orders@1.0.0` and the
  REU-001 presentation. Safe labels and Graph identifiers are definition data;
  business fields/actions remain fixed. One canonical definition first; evaluate
  3–5 later briefs for genuine fit, not five renamed definitions or new branches.
- **FAM-002**: Exactly two business entities plus the composed principal/session
  entities. Order fields: required `title:string`, `serviceLocation:string`,
  `priority:enum(low,medium,high)`, `status:enum(open,in-progress,resolved,cancelled)`;
  optional `description:text`, `dueDate:date`, `assigneePrincipalId:string`.
  Initial order is `open`, unassigned, version `0`; Graph `domain.seedData` is
  explicitly `[]`. IDs/version are factory-owned. Required text is trimmed/nonempty; title/location max 160,
  description max 2000; date is a valid date-only value, not a scheduling promise.
  Dispatcher can correct these five metadata fields in open/in-progress states;
  assignment/status/version are excluded from the edit form and payload.
- **FAM-003**: History fields: required `workOrder` reference, `action` enum
  `create,update,assign,reassign,start,resolve,reopen,cancel`, `orderVersion:integer`,
  `toStatus` using the status enum, `actorPrincipalId:string`, `actorRole:string`,
  `recordedAt:datetime`; optional `fromStatus` using that enum,
  `fromAssigneePrincipalId:string`, `toAssigneePrincipalId:string`, `note:text`.
  Add exactly ten optional snapshot fields: `beforeTitle/afterTitle:string`,
  `beforeServiceLocation/afterServiceLocation:string`,
  `beforePriority/afterPriority:enum(low,medium,high)`,
  `beforeDescription/afterDescription:text`, `beforeDueDate/afterDueDate:date`.
  Each slash denotes two separate fields. Create stores all five after values;
  update stores all five prior/new normalized values, even unchanged ones, and
  its correction reason in `note`. Other events leave these snapshots null;
  absent optional metadata is null. API snapshots use the same scalar field names.
  Blueprint snapshot types are respectively `text,text,enum,long-text,date`, each
  `required:false`; enum options are exactly low/medium/high. Their Graph types
  are the scalar types above; no JSON field or new serialization type is needed.
  Blueprint `workOrder` projects to Graph/storage `workOrderId:string`, with the
  existing many-to-one relation to the order's injected ID; API exposes `workOrder`.
  History IDs, actor, time and snapshots are server-owned. Store one immutable
  event per committed command, unique `(workOrderId,orderVersion)`, including create.
- **FAM-004**: Exactly two roles, dispatcher and technician. Dispatcher order grants
  are `create,read,update,assign,reassign,reopen,cancel`; technician grants `read,start,resolve`;
  both have history `read` only. Keep normal composed identity grants, but expose
  no generic identity/history CRUD route. One flow: `start: open -> in-progress`
  by technician, `resolve: in-progress -> resolved` by technician,
  `reopen: resolved -> open` by dispatcher, and dispatcher `cancel` from each of
  open/in-progress to cancelled; no capability transition effects. Cancelled is
  terminal: no update, assignment, work, resolve, reopen or further cancel.
  Initial state is open, states are exactly open/in-progress/resolved/cancelled,
  and Graph events are exactly start/resolve/reopen/cancel (deduplicated).
  Assignment is an orthogonal field mutation, not an invented workflow transition.
- **FAM-005**: Four page intents over the order: dispatch list, create form, shared
  detail/history, assigned-work queue. Bind `core.crud` to the order/dispatch page,
  workflow to the single flow, identity to composed principal/session and
  dispatcher/technician roles respectively, audit/notification to dispatcher,
  policy-declarations to empty bindings. Integration has no providers and only
  existing identity-resolution, authorization-decision and audit-record operations.
- **FAM-006**: Add a browser-safe computed structural witness
  `factory.service-work-orders-graph-witness/v1`; it is never serialized admission
  authority. Existing families must still reject the three new action verbs.
  Compiler admission additionally validates full schema, exact shapes,
  roles, bindings, physical locks/digests and Graph/lock hash equality after a JSON
  persistence round trip. Reject extra fields, grants, effects, entities or routes;
  a title, definition label, six-package match or caller witness cannot activate it.
- **FAM-007**: History `orderVersion` is Blueprint `{key:"orderVersion",type:"number",
required:true,numericDomain:{apiVersion:"factory.numeric-field-domain/v1",
minimum:{value:0,inclusive:true},maximum:{value:2147483647,inclusive:true}}`
  plus its safe label. Graph/storage uses `type:"integer"`, the same field key and
  identical serialized domain keys/values; no other numeric field/domain is admitted.
  A complete structural Work Orders witness exposes exactly
  `numericFields:[{entityKey:historyEntityKey,fieldKey:"orderVersion"}]` and requires
  explicit empty `seedData`. In `model.ts` waive only the missing numeric seed
  witness for that coordinate after full structural matching; retain ordinary type,
  domain and seeded-value validation. No broad family-name, field-name or seedless
  bypass; unrelated numeric constraints still require their existing witnesses.
- **FAM-008**: Add a pure schema-parsed Blueprint structural matcher shared by
  Blueprint validation and composition. Match the complete frozen two-business-
  entity/role/page/field/domain/flow shape, not labels. Only this exact shape may
  have the two `cancel` keys with distinct `from` open/in-progress, the same
  dispatcher and `to:cancelled`; every other duplicate transition key still fails.
  Evaluate after strict Blueprint schema parsing but before transition-key
  uniqueness, using a browser-safe Graph-package helper with type-only Blueprint
  imports, no Node API, validator recursion or Graph-to-capabilities dependency.
  Retain all state/actor/grant checks. `product-composer.ts` uses that matcher plus
  the exact six selected core keys for its numeric-domain admission and empty seed
  derivation; it must not create a fake history seed. Compiler lock/digest checks
  remain mandatory. Deduplicate this exact family's projected event list while
  retaining both cancel transitions; all older flow projections remain unchanged.

## Identity and business API

- **SEC-001**: A Work-Orders-only fixture hook supplies one dispatcher and two
  technicians with distinct principal/session IDs, the same technician role and
  one fixed fixture tenant. Reuse the package resolver/authorizer and fixture
  expiry semantics; preserve every other family's fixture generation. No passwords,
  token service, custom authentication, invitations or staff CRUD. The roster is
  compiler-owned synthetic data, not model-supplied identities or real personnel.
- **SEC-002**: Server derives `{principalId,tenantId,role,sessionId}` from the fixture
  resolver; rejects absent/unknown sessions and browser role/principal/tenant
  overrides. Scope all records/receipts to this isolated generated application and
  fixture tenant. Dispatcher sees all its orders; a technician sees only orders
  currently assigned to that principal, including history. Enforce this on list,
  detail, history, mutation and receipt replay before returning data. Counts/search
  must use the same filter. Foreign or no-longer-assigned IDs return the same 404.
- **SEC-003**: Predictable fixture sessions and role switching are not credentials
  or privacy. Show a persistent “Local demo — synthetic staff” indicator. No real
  staff data or private-account claim is accepted. Intake requiring private staff
  accounts, customer visibility, independent tenants or real authentication must
  retain that material requirement and clarify/defer via ADR-0078 behavior; never
  silently substitute this demo. Production identity stays blocked under the threat
  model. This is fixture-level rule enforcement, not an authenticated-user proof.
- **API-001**: New versions are `factory.generated.work-order-mutation/v1`,
  `factory.generated.work-order-mutation-receipt/v1` and
  `factory.generated.work-order-history-entry/v1`. Reuse `/api/:entity` list/create,
  `/:recordId` detail and `/:recordId/events/:command` (including `update` and
  `cancel`, with no second generic write alias); history is
  `/:recordId/history`. `GET /api/work-order-assignees` is dispatcher-only and
  returns only `{principalId,displayName}` for the two eligible synthetic technicians.
  Reserve that route from entity keys. Deny generic audit/capability/identity reads
  and all other entity reads/writes; only health and the named family routes remain.
- **API-002**: Create body is exactly `{values:{title,serviceLocation,priority,
description?,dueDate?}}`; assign is `{expectedVersion,assigneePrincipalId}`;
  reassign adds required `reason`; start is `{expectedVersion}`; resolve adds
  `resolutionNote`; reopen/cancel add `reason`. Update is exactly
  `{expectedVersion,reason,values:{title,serviceLocation,priority,description,dueDate}}`:
  all five replacement keys required, with description/date string or explicit
  null to clear; valid date-only strings only. Create accepts omission or null for
  those optional fields. Reject unknown keys, inherited/accessor
  values, invalid types and client-owned state/history. Versions are safe integers
  `0..2147483647`; fail without writes at exhaustion. Notes/reasons are trimmed,
  nonempty plain text of at most 2000/500 characters, rendered as text.
- **API-003**: Assign is dispatcher-only on an unassigned open order and resolves
  an eligible same-tenant principal. Reassign is dispatcher-only on an assigned
  open/in-progress order to a different eligible principal; preserve status and
  require reason. A new technician takes over in-progress work; no fake restart.
  Start/resolve require current assignee equality, checked in the write transaction.
  Resolve requires a substantive textual work report; it is an attributed worker
  assertion, not externally verified proof, a photo, signature or certification.
  Reopen is dispatcher-only with reason; retain assignee and every earlier report.
  A later resolution appends a new report. Resolved orders cannot be reassigned.
- **API-006**: Dispatcher update is allowed only in open/in-progress; preserve
  state, assignee and all existing history/reports. Validate using FAM-002 limits,
  require a correction reason, and reject a normalized no-op with 400
  `work_order.invalid_request`; CAS/history/audit/receipt commit together. A resolved
  order requires explicit reopen with reason before metadata changes. Dispatcher
  cancels mistaken/duplicate open/in-progress orders with reason; retain metadata,
  assignment and earlier reports, append one cancellation event and advance version.
  No deletion, cancelled reopen or fabricated resolution; current assignee may read
  cancelled detail/history but cannot mutate it. UI distinguishes cancellation from
  completed work and surfaces its reason. Correction and cancellation use API-005
  authorization-before-replay and exactly-once behavior. A previously successful
  retry may replay after terminal cancellation only for a still-authorized reader;
  a fresh command cannot modify a cancelled order. After success/replay the UI
  refreshes authoritative detail/history, so an old receipt cannot visually undo
  a newer cancellation or correction.
- **API-004**: Success is 201 create / 200 mutation with `{id,version,...orderFields}`;
  nullable optional fields serialize as null. Detail additionally returns latest
  resolution event or null, labelled historical when reopened/cancelled. History returns
  `{items,nextBeforeVersion}` newest-first, max 50, with optional nonnegative
  `beforeVersion`; list returns the same envelope using `nextAfterId`, max 50,
  stable ID order and optional exact `status`, `assigneePrincipalId`, `afterId`.
  Technician-supplied assignee filters cannot expand server assignment scope.
  Errors are `{code}`: 400 `work_order.invalid_request`, 403 `work_order.forbidden`,
  404 `work_order.not_found`, 409 `work_order.version_conflict|state_conflict|`
  `idempotency_conflict|retryable_conflict|version_exhausted` (each with prefix).
- **API-005**: Require existing bounded idempotency header; reuse canonical hashing,
  hashed stored keys and scoped receipts through an additive private adapter around
  `writeProtectionFragments`. Its current receipt-first transaction fragment must
  be adapted to perform authorization before replay; do not paste it unchanged.
  Scope includes Graph/application identity, tenant,
  principal, role, entity, record and command. Within one serializable transaction,
  recheck current assignment before receipt replay, then expected version/state,
  conditional write, immutable history, safe audit and receipt. Lost-response retry
  returns the original response only while still authorized; reassignment revokes
  the former technician's read/replay authority. Bounded transaction retries never
  duplicate history; exhausted conflicts return a safe code. No session IDs in audit.

## Ownership, delivery and verification

- **IMP-001**: After acceptance, one PM-assigned integration owner serially owns
  `packages/graph/src/{product-blueprint,model,index,service-work-orders-graph-witness,service-work-orders-blueprint-witness}.ts`,
  corresponding Graph tests, definition data/registry/interpreter in
  `packages/adapters/src/requirements/`, their focused tests, compiler
  `src/{index,service-work-orders-contract,service-work-orders-runtime,
service-work-orders-presentation}.ts`, focused compiler tests, and additive
  consumer-family admission in `apps/workbench/lib/product-journey/` with tests.
  Optional fragment/helper edits require old-output equality. PM assigns exact
  files before writes; no simultaneous writer touches these shared contracts.
  Definition-case bindings and existing acceptance harness integration remain
  root-owned serialized work. No change to capability package bytes is authorized.
  The same serialized owner also owns narrowly additive numeric admission, empty
  seed derivation and witnessed event deduplication in
  `packages/capabilities/src/product-composer.ts` and its focused
  `test/service-work-orders-composition.test.ts`; package assets/locks remain fixed.
- **IMP-002**: New applications use additive order/history/receipt tables inside
  their existing isolated PostgreSQL store; memory is fixture-only. No conversion
  of existing Task data, existing app schema, Published bytes or Compilations.
  Rollback removes new-family admission and emitter selection; preserve any new
  app data/artifacts for inspection. Do not run destructive down-migrations or
  Preview cleanup against durable storage. Cross-revision production migration is
  outside this experiment; future upgrades need their own compatibility evidence.
- **VER-001**: RED first: strict Graph/lock round-trip admission; two technicians
  sharing a role; assign/reassign/start/resolve/reopen; metadata update/cancel;
  strict payload, no-op, technician/terminal-state denial and invalid/no-write requests;
  stale/concurrent reassign versus resolve; atomic history/receipt rollback; replay
  after reassignment; list/detail/history/cross-app denial; hostile text. Exercise
  emitted code and real PostgreSQL concurrency, not merely compiler source strings.
  Assert correction snapshots and preserved assignment/reports, stale update versus
  resolve/cancel, cancellation replay with one event, and no forged resolution.
  Graph/Blueprint/composition tests cover exact domain round trip, empty seeds,
  missing/wrong bounds, exclusivity, decimal/wrong coordinate, malformed lookalikes,
  populated seeds, and unrelated missing-witness rejection. Only the exact cancel
  pair is accepted; duplicates with another source/target/actor/family still fail.
- **VER-002**: Proposed focused commands after files exist:
  `pnpm --filter @factory/graph exec vitest run test/service-work-orders-graph-witness.test.ts`;
  `pnpm --filter @factory/adapters exec vitest run test/service-work-orders-definition.test.ts`;
  `pnpm --filter @factory/capabilities exec vitest run test/service-work-orders-composition.test.ts`;
  `pnpm --filter @factory/compiler exec vitest run test/service-work-orders-contract.test.ts test/service-work-orders-runtime.test.ts test/service-work-orders-presentation.test.ts`.
  Run `pnpm regression definitions`, affected package typecheck/build and existing
  Task/non-Task compatibility fixtures without regenerating historical baselines.
  PostgreSQL and browser checks require controller-owned local resources and exact
  cleanup evidence; skipped tests or policy-blocked startup are not passes.
- **VER-003**: Actual consumer entry must reuse accepted ADR-0079 automatic delivery
  only after the exact family witness passes: no manual plan/Publish/Compile steps,
  retained material requirements, visible failure/retry and manual opt-out. Through
  the same generated PostgreSQL app, dispatcher creates incorrect saved metadata
  at 1440, corrects it without rebuild, reloads and inspects prior/new history,
  assigns A, A verifies corrected location/priority at 390 and starts; dispatcher
  corrects an in-progress detail, confirmed on A's fresh mobile view. Then A works
  at 390, dispatcher reassigns B with reason, A loses access, B resolves with report,
  dispatcher reads that report/reopens, B resolves again, and reload preserves both
  reports and the ordered assignment/correction history. Create and cancel a
  mistaken duplicate with reason; prove terminal denial and no resolution report.
  Edit UI preserves typed values on validation/conflict, shows fresh authoritative
  values for conscious reapply, disables duplicate submission and retains the same
  command on uncertain response. Prove one interrupted correction and safe retry.
  Inspect 390/768/1440, keyboard/touch,
  empty/error/denied/stale/lost-response states and no obsolete cached A detail.
- **VER-004**: Root records immutable input/source/Compilation identity, attempts,
  technical actions, business questions, ready/first-action time, repairs, visual
  result, persistence/denial and exact cleanup in the existing consumer ledger.
  Target prepared-local useful action within five minutes and zero technical
  handoffs; report measurements, not a guarantee. Reuse unchanged evidence and
  rerun affected checks only; this shared authority slice still needs task review,
  independent Terra QA, Sol judgment and controller delivery per delivery policy.

## Consequences and abort conditions

- **POS-001**: A real persisted dispatch-to-resolution job distinguishes the family
  from Task, while shared stores, UI helpers and existing locks reduce maintenance.
- **NEG-001**: Synthetic roster and attributed text reports deliberately exclude
  private staff access, account administration, attachments, offline work, routing,
  scheduling/SLAs, billing, messaging, inventory consumption and external proof.
  Users requiring these receive explicit scope clarification, not false completeness.
- **ABT-001**: Stop for a changed identity/data boundary, a real-person/private-data
  requirement, weak authorization, historical byte drift, unrepresentable Graph
  semantics, new package/provider, destructive migration or shared ownership clash.
  Return any material change to Tech Lead/PM; no silent implementation amendment.
- **DEC-001**: Local synthetic identity fits the approved local-family stage; it
  does not redefine mature hosted/private-product success. Dispatcher correction,
  cancellation/reopen, reassignment retaining in-progress status and text-only
  resolution are frozen here. Real staff identity remains outside this admission;
  any newly material identity requirement needs separate founder/governance resolution.
  No unresolved choice may be delegated to the implementation writer.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`, `docs/delivery-policy.md`.
- **REF-002**: `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md` and
  `docs/superpowers/plans/2026-09-24-family-expansion-and-delivery.md`.
- **REF-003**: Task, Appointment, Inventory source paths above; ADR-0076/0078/0079.
