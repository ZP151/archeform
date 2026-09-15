---
title: "ADR-0064: Team Task Same-Record Field Correction"
status: "Proposed"
date: "2026-09-13"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "tasks",
    "generated-api",
    "generated-ui",
    "security",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0064: Team Task Same-Record Field Correction

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** future canonical `team-task-tracking`
interpretations to an exact correction-capable Task profile. Add only `update`
to the Team member's Task grant, compile that exact Graph shape with private
`task-mutation@2.0.0` / `factory.generated.task-mutation/v2`, and render it with
the existing `task-workspace-presentation` asset at private version `1.1.0`.
Keep delivered Task Published Graphs on exact `task-mutation@1.0.0` /
`factory.generated.task-mutation/v1` and
`task-workspace-presentation@1.0.0` behavior. Both profiles keep
`factory.generated.task-mutation-receipt/v1`.

This proposal is not accepted. It authorizes no source or test change, Product
Publish, Compilation, Preview, provider call, external resource, deployment,
Git action, or release. It is eligible for the founder's 2026-09-01 standing
acceptance only if a separate qualified read-only reviewer returns
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 `0/0`, no material ambiguity,
and PM records the exact ADR hash, reviewer, evidence, and standing authority.
The proposing Tech Lead cannot accept this ADR.

## Context and decision boundary

- **CTX-001**: The accepted Team Task delivery creates, starts, completes,
  reopens, finds, persists, retries, and concurrency-protects shared local
  tasks. It has four registered definitions and three demonstrated local
  runtime families in total, but Task explicitly excludes post-creation field
  editing and is not product-complete.
- **CTX-002**: The active scale roadmap names correction as the next bounded
  slice: correct title, description, assignee, due date, and priority on the
  same record under a declared state policy, with stale-write and retry
  recovery. A clone/new-record correction would break that outcome.
- **CTX-003**: The delivered Task runtime already owns a Factory-managed
  integer version, authorization-first actor-scoped receipt lookup, hashed
  Task idempotency-key storage, canonical request hashing, conditional
  `(id, status, version)` writes, serializable transactions, safe conflicts,
  append-only audit evidence, and retry-safe Create/Start/Complete/Reopen.
  Approval correction supplies the accepted generated `PATCH` and edit-draft
  interaction precedent. Their shared write-protection mechanics are reusable;
  approval states, reasons, history, fields, and business policy are not.
- **CTX-004**: `update` is already valid in
  `factory.product-blueprint/v1` and generic Graph policy actions. The current
  canonical Team Task Graph deliberately omits it. Adding that one exact
  business grant is a sufficient fail-closed activation marker and does not
  require a new public Blueprint or Application Graph version.
- **CTX-005**: Root captured the authentic Published Task Graph, separate
  composition lock, and complete ordered 63-file generated bundle from clean
  baseline `5b65169e56c834f2a466539ee81ec020e76541c3` in
  `packages/compiler/test/fixtures/task-correction-legacy-baseline.json`.
  Its recorded ordered-bundle SHA-256 is
  `3d7ce570279b2caa501a3b458e6f4503ef13f1efa76b308640ad52da01bf4bac`.
  This is the byte-compatibility authority for delivered Task output.
- **CTX-006**: The scope remains one local shared board with selectable demo
  roles. `assignee` is escaped display text, not a principal reference. The
  decision adds no owner-only record, private assignment, verified person,
  authentication, invitation, membership, tenant, notification, calendar,
  integration, or hosted-operation claim.

## Current and proposed profiles

- **CUR-001 — Current accepted Golden technology profile**: Node
  `>=22.11.0 <23`, root package manager `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React and React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`, Prisma
  `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved `5.81.2`, ioredis
  `^5.4.2` resolved `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, the
  compiler's Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`, and directly
  pinned `lucide-static` `0.468.0`. Dockerfiles use floating-major
  `node:22-alpine`; Docker Compose remains the local topology. Manifests,
  `pnpm-lock.yaml`, Dockerfiles, and `infra/docker-compose.yml` are the
  executable authorities.
- **CUR-002 — Current accepted data and Task profile**: The lifecycle remains
  mutable Draft -> immutable Published Graph -> immutable Compilation, and
  `factory.application-graph/v1` is the currently implemented serialized Graph
  contract. The canonical Task Blueprint uses
  `factory.requirement-spec/v1`, `factory.product-blueprint/v1`, stable
  definition key `team-task-tracking`, five business fields, exact states
  `not-started` / `in-progress` / `completed`, and Member actions
  `create/read/start/complete/reopen`; Viewer has `read`. Exact matching output
  uses `task-mutation@1.0.0`, `factory.generated.task-mutation/v1`,
  `factory.generated.task-mutation-receipt/v1`,
  `generated-write-protection@1.0.0`, and
  `task-workspace-presentation@1.0.0`. It exposes no Task `PATCH` route.
- **PRO-001 — Proposed private correction profile**: Keep every CUR-001
  technology coordinate, package, provider, service, database engine, compiler
  target, Compose topology, public schema identifier, capability lock, and
  stable `@factory/*` / `factory.application-graph/*` identifier. Future
  canonical `team-task-tracking` output adds `update` to the Member Task grant
  and no other structural semantic. The exact correction shape selects private
  `task-mutation@2.0.0`, serialized marker
  `factory.generated.task-mutation/v2`, existing receipt contract
  `factory.generated.task-mutation-receipt/v1`, existing
  `generated-write-protection@1.0.0` with Task `sha256-v1` key storage, and the
  same presentation key `task-workspace-presentation` at version `1.1.0`.
- **PRO-002 — Distinction from Golden**: PRO-001 is a proposed compiler-private
  API/data/presentation profile, not part of the current accepted Golden
  profile. It becomes an implementation authority only after the independent
  standing-acceptance gate and PM record. No manifest, lockfile, image, public
  registry, or public serialized Graph version changes.

## Frozen activation and business contract

- **ACT-001 — Existing profile**: A Graph with the complete ADR-0057/0063 Task
  shape and exact Task grants `Member=create/read/start/complete/reopen` and
  `Viewer=read` must continue selecting the existing Task profile and render
  the exact CTX-005 63-file bundle. It never receives `PATCH`, Edit, or Save.
- **ACT-002 — Correction profile**: A Graph selects correction only when it
  satisfies every existing Task field, state, transition, page/block, role,
  permission, six-lock, nine-binding, checksum, Published identity, and
  composition-lock rule, except that the unique Member Task grant is exactly
  `create/read/update/start/complete/reopen`. The unique Viewer Task grant
  remains exactly `read`. Names and declaration order vary only where the
  accepted Task selector already permits them. `update` is a same-state
  command, not a flow event or transition.
- **ACT-003 — Fail closed**: A Task-shaped candidate with any partial or extra
  field, role, grant, state, event, transition, page, block, lock, binding, or
  correction authority matches neither profile and fails compilation with the
  existing fixed safe Task-contract error. It cannot fall through to generic
  CRUD or receive a partial Edit UI. Arbitrary non-Task Graphs retain current
  behavior even if they use an `update` action.
- **ACT-004 — Canonical producer**: Keep selection key
  `team-task-tracking`, `businessParameters: null`, the five fields, pages,
  states, transitions, role labels, shared visibility, and display-only
  assignee. Future supported-default selection projects the ACT-002 Member
  grant and says that Member may correct fields in Not started and In progress;
  Completed must be reopened before correction. Requests for other editable
  states, partial/custom fields, private assignments, or post-completion edits
  remain material questions.
- **BUS-001 — Same record and fields**: Edit retains the exact Task `id` and
  status. It replaces exactly the complete five-field value set: `title`,
  `description`, `assignee`, `dueDate`, and `priority`. Title, assignee, due
  date, and priority remain required; description is a string or `null`; enum
  values remain exactly `low`, `medium`, `high`. Reuse current Task value and
  date validation. Clients cannot write `id`, `status`, `version`, timestamps,
  relations, access, actor, receipt, or audit data.
- **BUS-002 — State policy**: Member may update a matching-version record only
  in `not-started` or `in-progress`. Update preserves that exact status and
  increments version once. A same-version `completed` update returns the safe
  denial; the user must invoke the existing `reopen` transition to reach
  `in-progress`, receive its new version, and then start a separate Edit.
  Viewer and every other role can read under current rules and cannot update.
- **BUS-003 — Exclusions**: This proposal adds no delete/archive, bulk edit,
  custom fields, state editing, drag scheduling, comments, attachments,
  reminders, notifications, recurrence, subtasks, dependencies, personal
  ownership, or assignment enforcement. It does not change Start, Complete,
  Reopen, Create, finder, filtering, or read semantics.

## Frozen generated API and data contract

- **API-001 — Route and request**: Exact ACT-002 output adds
  `PATCH /api/:taskEntity/:recordId`. It requires the current role/session
  header and `x-factory-idempotency-key` matching
  `[A-Za-z0-9._:-]{1,128}`. The body is exactly
  `{ expectedVersion: nonnegative safe integer, values: { title, description,
assignee, dueDate, priority } }`, with all five value keys present and no
  others. `description: null` clears it. Event-route alias
  `/events/update` remains denied. Exact ACT-001 output has no Task `PATCH`.
- **API-002 — Success**: First success returns HTTP `200` and the same exact
  stored-record shape as current Task commands:
  `{ id, status, version, title, description, assignee, dueDate, priority }`.
  ID and status are unchanged, version is previous `expectedVersion + 1`,
  a cleared nullable description is serialized as `null`, and due date uses
  the current ISO representation.
- **API-003 — Shared protection and identity**: Reuse ADR-0063's exact
  authorization-first mutation boundary. `scope` remains SHA-256 of the
  length-delimited tuple `(Published Graph checksum, actorScope, role, entity,
record ID, operation)`, with operation exactly `update`. Task stores only
  `sha256:` plus lowercase SHA-256 of the exact validated raw key bytes.
  `requestHash` is SHA-256 of the strictly validated incoming JSON body under
  the current recursive, lexicographically key-sorted canonicalizer. No raw
  key, raw request envelope, prompt, or provider response enters persistence,
  audit, logs, errors, screenshots, or evidence. The receipt stores the
  validated response body required for exact replay; authorized UI may render
  the readable Task values, and acceptance may use controlled synthetic Task
  values. Audit rows, errors, and logs contain no Task field values or request
  body.
- **API-004 — Replay and changed payload**: After current authorization and
  strict request validation, the same scope/key and request hash returns the
  persisted HTTP `200` response body without another update, version change,
  audit event, effect, outbox entry, or receipt. The same scope/key with any
  different body returns HTTP `409`
  `{ code: "task.idempotency_conflict" }`. Replays recheck current
  authorization before receipt lookup.
- **API-005 — Error and conflict order**: Preserve Task error precedence:
  resolved actor and `update` authorization; strict key/body/value validation;
  scoped receipt replay/hash comparison; record existence; expected-version
  comparison; allowed-state check; conditional write. Invalid input is HTTP
  `400 { code: "task.invalid_request" }`; missing record is HTTP
  `404 { code: "task.not_found" }`; stale version or the conditional-write
  loser is HTTP `409 { code: "task.version_conflict", current: { id, status,
version } }`; Viewer/wrong role or matching-version Completed update is HTTP
  `403 { code: "task.denied" }`. Errors contain no Task values, policy detail,
  key, scope, hash, body, or stack and commit no receipt.
- **DAT-001 — Atomicity**: In-memory and Prisma stores reuse the existing
  conditional Task update and unique receipt operations. One serializable
  transaction conditionally matches `(id, status, version)`, replaces the five
  validated fields while preserving status, increments version, appends one
  safe audit row with actor role and action `update`, and appends one mutation
  receipt. Update has no workflow capability effect or notification/outbox
  work. All components commit once or all roll back.
- **DAT-002 — Storage compatibility**: The current Task record model already
  has `version Int @default(0)` and the current Task schema already has
  `TaskMutationReceipt` with unique `(scope, idempotencyKey)`. Correction adds
  no column, table, migration, service, or database dependency. Existing Task
  rows and deployed databases are not migrated by this proposal; future
  correction output uses its own immutable Compilation and current initial
  schema.

## Frozen generated presentation and continuity contract

- **UI-001 — Reuse**: Render correction through the existing approved private
  cobalt workspace shell, native form controls, shared typed-field/value
  helpers, record loader, finder, compact Task rows, responsive tokens, and the
  existing seven-icon allowlist. Use the same
  `task-workspace-presentation` key at `1.1.0`; add no component asset, public
  registry key, copied source, icon, font, framework, or near-duplicate style.
- **UI-002 — Visibility and state**: Member sees Edit for Not started and In
  progress records only. Viewer never sees Edit. Completed shows the existing
  Reopen action and no Edit; after a successful Reopen refresh, Edit becomes
  available against the new version. The edit form is labelled `Edit Task`, is
  prefilled from all five current values, and offers `Save` and `Cancel` with
  native controls and 44 px targets.
- **UI-003 — Draft ownership**: Own edit state above the current
  `TaskRecord` keyed by `id:version`, scoped by generation, role, entity, record
  ID, and base version. An in-progress draft survives record refresh/remount,
  sorting, and temporary filter removal. `Cancel` before an uncertain result
  discards only that local draft and writes nothing. Role, entity, route,
  generation, or record-scope change invalidates late callbacks and clears data
  that must not cross scope.
- **UI-004 — Activation, pending, and unknown result**: One Save activation
  validates and freezes the full five-field payload, displayed base version,
  and one `crypto.randomUUID()` key. Pending disables that record's fields and
  commands and ignores repeat activation. A transport failure makes the result
  explicitly unknown, keeps the intended values visible but frozen, and offers
  Retry with the exact same serialized payload/key. It never claims success or
  silently creates another key. A deliberate `Review latest` / new-Edit choice
  first refreshes authoritative data, abandons the retained command explicitly,
  and creates a new activation only on a later Save.
- **UI-005 — Conflict and draft continuity**: On a known `409`, refresh the
  authoritative record, retain the user's intended five values as a local stale
  draft, and show the fixed conflict message. Display the latest status/version
  context without business-value leakage outside the already readable record.
  Do not overwrite, automatically rebase, automatically retry, or submit with a
  new version/key. The user explicitly chooses either to discard the draft and
  use latest values or to keep the intended values after reviewing latest;
  either choice starts a new edit scope and a later Save creates a new key.
- **UI-006 — Result continuity**: Success closes the editor, refreshes
  authoritative records, and retains a list-level `Task updated.` status even
  if filtering removes or remounts the row. Validation and known 400/403/404
  failures preserve editable draft values. Escaping and safe date/value
  formatting remain authoritative; assignee never becomes actor scope.

## Generated verifier contract

- **VRF-001**: The compiler-worker's private Task selector must recognize the
  exact ACT-001 and ACT-002 profiles and mirror their fail-closed distinction.
  For ACT-002 it registers `task.update` as `PATCH /api/:taskEntity/:recordId`,
  expected HTTP `200`, with fixture-session and distinct deterministic
  idempotency headers and exact `{ expectedVersion, values }` body. ACT-001
  verifier plan bytes remain unchanged.
- **VRF-002**: The correction chain derives versions only from committed
  outcomes: Create `v0`; Not-started Update `v1`; Start `v2`; In-progress
  Update `v3`; Complete `v4`; denied Completed Update stays `v4`; Reopen `v5`;
  final Complete `v6`. Replay one successful Update with its exact key/body and
  require the stored `200` response. Viewer and Completed denial use distinct
  keys and create no receipt. Generated templates, shared request/response
  contracts, and this end-to-end verification path remain serialized.

## Compatibility, catalog, security, and operability effects

- **CMP-001 — Delivered Task**: Regenerating the CTX-005 Published Graph and
  lock must produce exactly 63 ordered files and ordered-bundle SHA-256
  `3d7ce570279b2caa501a3b458e6f4503ef13f1efa76b308640ad52da01bf4bac`.
  Its API, schema, migration, runtime, proxy, UI, CSS, package files, manifests,
  and verification artifacts remain byte exact. Historic Graph/source hashes
  and immutable Compilations are never rewritten.
- **CMP-002 — Every existing product**: The existing three canonical
  non-Task definition hashes and ten complete non-Task ordered bundle hashes
  remain exact under `task-non-task-baseline.json`. Approval correction and
  presentation bytes, Restaurant V3, legacy Expense/Purchase/Booking, generic
  output, stable package names, and every existing API/data shape remain
  unchanged. New Task correction output is additive and selected only by
  ACT-002.
- **CAT-001**: The private definition bank stays at four entries and the
  demonstrated family count stays three; correction improves one existing
  family and creates no catalog entry. Public capability, UI, recipe,
  definition, source-study, and compiler-target catalogs and counts remain
  unchanged. The new private contract and presentation version are
  Factory-authored, `UNLICENSED`, and unexported.
- **SUP-001**: No package, version range, lockfile entry, license notice,
  copied source, external code, provider, credential, network call, icon, font,
  image, or supply-chain input is added. Existing manifest and lockfile
  authorities remain exact.
- **SEC-001**: The browser remains untrusted. Server-side role, Graph grant,
  state, expected version, conditional write, and actor-scoped receipt are
  authoritative. IDs and assignee text grant nothing. The proposal does not
  weaken tenant, credential, model-provider, Published-Graph, compiler, path,
  archive, generated-source, or preview boundaries. Current local demo roles
  are still not verified identities or production tenant isolation.
- **OPS-001**: Correction adds one bounded route and one receipt per successful
  Update only to new exact Task output. A crash before commit leaves no outcome;
  a retry may execute once. A crash after commit replays the stored outcome.
  Existing receipt retention, health, ports, resource limits, loopback binding,
  Preview isolation, teardown, and cleanup rules apply. No Compose topology,
  queue, service, backup, deployment, or cloud-operating decision is made.

## Consequences

### Positive

- **POS-001**: A Member corrects all ordinary Task fields on the same record in
  both active working states without cloning work or losing lifecycle history.
- **POS-002**: Lost responses, changed-payload replay, stale versions, and
  concurrent updates reuse the already-proven authorization, receipt,
  conditional-write, audit, and rollback boundary.
- **POS-003**: Exact structural activation and byte baselines preserve every
  delivered Task and non-Task artifact while future Task interpretations gain
  correction.
- **POS-004**: Parent-owned edit drafts preserve intended input through refresh,
  filtering, row remount, unknown results, and conflicts without automatic
  overwrite.

### Negative

- **NEG-001**: The compiler and verifier must retain two exact private Task
  profiles and permanent byte checks for delivered Task output.
- **NEG-002**: The generated Task UI gains record-scoped draft, retained-command,
  conflict-review, and late-callback state in addition to lifecycle actions.
- **NEG-003**: Full replacement makes the contract deterministic but requires
  clients to submit all five editable fields for every correction.
- **NEG-004**: This bounded correction still does not provide real identity,
  private assignment, scheduling, collaboration, or mature task management.

## Alternatives considered

### Keep Task without correction

- **ALT-001 — Description**: Retain the accepted Task profile and require a new
  record whenever field values are wrong.
- **ALT-002 — Rejection reason**: This leaves the roadmap's highest-value Task
  gap open and breaks same-record continuity.

### Add generic PATCH to every generated entity

- **ALT-003 — Description**: Enable one update route for all current and future
  generated CRUD entities.
- **ALT-004 — Rejection reason**: It changes existing API/data and generated
  bundle contracts outside Task, bypasses family-specific state policy, and
  exceeds the active product slice.

### Permit partial Task updates

- **ALT-005 — Description**: Accept any nonempty subset of the five fields and
  merge omitted values with current storage.
- **ALT-006 — Rejection reason**: Omission versus clearing becomes another
  input semantic, expands validation and replay cases, and is unnecessary for
  the full prefilled native form.

### Edit Completed in place

- **ALT-007 — Description**: Allow Update in all three states without a
  lifecycle transition.
- **ALT-008 — Rejection reason**: It silently changes completed work. The
  existing explicit Reopen transition provides a visible, audited return to an
  editable working state.

### Clone a corrected Task

- **ALT-009 — Description**: Create a replacement Task with corrected values
  and leave the old Task unchanged.
- **ALT-010 — Rejection reason**: It duplicates identity and history and fails
  the required same-record outcome.

### Reuse Approval correction as one business module

- **ALT-011 — Description**: Parameterize Approval draft/returned correction,
  reasons, decision history, states, fields, and UI for Task.
- **ALT-012 — Rejection reason**: Task has no requester, return reason,
  decision history, or approval state. Only the existing write-protection and
  native presentation ports have matching semantics.

### Introduce a new public Graph or Blueprint version

- **ALT-013 — Description**: Encode Task correction through a new public
  serialized schema or action verb.
- **ALT-014 — Rejection reason**: `update` already exists in Blueprint V1 and
  Graph V1 policy. The exact additional grant plus private generated-contract
  version provides unambiguous activation without a public migration.

## Migration, ownership, rollback, and abort conditions

- **OWN-001 — Contract owner and parallel decision**: Root/PM owns
  `factory.generated.task-mutation/v2`, the ACT-002 selector, API-001..005,
  DAT-001..002, UI-001..006, actor/session semantics, errors, and compatibility.
  These clauses are frozen enough for focused consumer and API contract tests.
  Frontend and backend production writers still cannot run as disjoint parallel
  tasks because one compiler emits their shared UI, proxy, API, store, schema,
  and verification plan. PM assigns one serialized integration writer. Root
  separately owns E2E, acceptance evidence, ledger, and Git.
- **MIG-001 — Canonical and Workbench paths**: After recorded acceptance, the
  integration owner updates
  `packages/adapters/src/requirements/task-definition-selection.ts` and
  `packages/adapters/test/requirement-interpreter.test.ts`; then updates
  `apps/workbench/lib/product-journey/consumer-family.ts` and its Task tests plus
  `apps/workbench/components/workbench-home.tsx` and its focused tests. The
  definition key and catalogue registration remain unchanged.
- **MIG-002 — Serialized compiler paths**: The same owner extends
  `packages/compiler/src/task-mutation-contract.ts`,
  `packages/compiler/src/task-workspace-presentation.ts`, and their focused
  tests, plus only the necessary wiring/parity assertions in
  `packages/compiler/src/index.ts`,
  `packages/compiler/src/targets/database/target.ts`,
  `packages/compiler/test/composition-page-runtime.test.ts`,
  `packages/compiler/test/task-mutation-runtime.test.ts`,
  `packages/compiler/test/database-target-parity.test.ts`, and
  `packages/compiler/test/compilation-plan.test.ts`. Reuse
  `mutation-write-protection.ts` unchanged unless a failing parity test proves
  one contract-neutral port extension is required; any algorithm or Approval
  byte change stops the work.
- **MIG-003 — Verifier and integration paths**: The same serialized owner
  updates `apps/compiler-worker/src/verifier/verification-graph-plan.ts` and
  its focused test. Root owns the already captured
  `packages/compiler/test/fixtures/task-correction-legacy-baseline.json`,
  `packages/compiler/test/task-correction-compatibility.test.ts`, correction
  E2E/fixture/presentation paths, acceptance note/evidence, ledger/status, and
  Git. Generated templates, shared API/data contracts, database target,
  compiler-worker mirror, actual Compilation, and end-to-end smoke remain
  serialized integration work.
- **MIG-004 — Sequence**: Preserve green old-Task and non-Task baselines; add
  RED canonical-grant and dual-profile selector tests; add RED API/store/audit/
  replay/concurrency tests; add RED parent-owned draft and emitted responsive UI
  tests; implement the exact producer and compiler profile; update the verifier
  mirror; run the completed shared boundary once; then, only under separate
  runtime authority, execute actual immutable Publish/Compilation/Preview
  acceptance.
- **ROL-001 — Before retained correction output**: Revert only MIG-001..003
  correction changes and keep the accepted ACT-001 implementation and captured
  baselines. No product data or database migration exists to undo.
- **ROL-002 — After retained correction output**: Stop projecting ACT-002 for
  new interpretations but retain exact compiler and verifier support for both
  immutable ACT-001 and ACT-002 Published Graphs and Compilations. Never rewrite
  their Graph, lock, source, schema, rows, receipts, or hashes. Remove only exact
  task-scoped local Preview resources through current cleanup procedures. No
  destructive or irreversible step is authorized.
- **ABT-001**: Abort on mutable-Draft compilation; old Task or non-Task byte
  drift; partial Task fallback; a generic PATCH; partial-value merge; changed
  Task ID/status outside Reopen; Completed edit; Viewer update; assignee
  authority; missing authorization-first replay, strict request/hash, version
  check, conditional write, atomic audit/receipt, or rollback; raw key/body/value
  disclosure outside the API-003 response/evidence boundary; automatic
  conflict overwrite/rebase/retry; lost draft across
  refresh/filter; new dependency, catalog key, public Graph/API version,
  database migration, Compose change, provider/external call, historic artifact
  mutation, deployment, or mature/identity/private-assignment claim.

## Measurable verification plan

- **TST-001 — Definition and selectors**: Focused tests prove the future
  canonical selection has exactly Member
  `create/read/update/start/complete/reopen`, Viewer `read`, unchanged five
  fields/states/transitions/pages/locks/bindings, correction acceptance copy,
  and no identity claim. Positive selector cases cover permitted renaming and
  ordering for ACT-001 and ACT-002. Negative cases independently cover missing,
  extra, duplicate, or rebound fields, grants, roles, states, events,
  transitions, pages, blocks, locks, bindings, and mismatched checksum/lock;
  partial Task candidates fail closed.
- **TST-002 — Exact API and authorization**: For ACT-002 prove the PATCH method,
  route, full request/response shapes, idempotency header, all field/date/enum
  validation, forbidden Factory-owned or extra keys, alias denial, Member
  success in Not started and In progress, Viewer denial, Completed denial,
  missing-record 404, and safe errors with zero writes. Prove ACT-001 has no
  PATCH/Edit text and remains executable.
- **TST-003 — Replay, races, and atomicity**: In memory and Prisma, prove first
  Update success plus same-key/body replay after runtime reconstruction yields
  one version increment, audit, and receipt; same key/different intended values
  returns idempotency 409; two distinct keys at one version yield one HTTP 200
  and one authoritative version 409; authorization is rechecked before replay;
  failures injected before record, audit, and receipt boundaries roll back all
  work. Assert receipt keys are digest-only and no body/value enters audit or
  safe diagnostics.
- **TST-004 — Draft and presentation**: At 390/768/1440 px prove prefilled five-
  field Edit, Cancel/no-write, Not-started/In-progress visibility, Completed
  Reopen-first policy, 44 px controls, keyboard/focus order, no overlap or
  horizontal overflow, loaded approved CSS/icons, and zero axe violations.
  Prove draft continuity across row `id:version` remount, refresh, sorting, and
  filter removal; pending double-activation denial; unknown-result exact retry;
  deliberate new edit; conflict refresh with intended values retained and
  explicit latest review; safe late-callback invalidation; success retained
  after filtering.
- **TST-005 — Compatibility**: Run the root-owned correction compatibility test
  and require exact 63-file CTX-005 digest. Run the permanent non-Task
  compatibility test and require its three definition and ten full bundle
  digests. Assert Approval mutation/presentation byte anchors and no v2
  Task/PATCH/Edit text in ACT-001 or any non-Task output.
- **TST-006 — Verifier and actual journey**: Derive from an immutable Published
  ACT-002 Graph plus its separate digest-matched lock. Assert VRF-001/002
  deterministic request bytes and unchanged ACT-001/non-Task plans. In the
  authorized provider-free actual lane, create one Task, edit all five fields in
  Not started, reload, Start, edit all five fields again in In progress, race a
  stale update, Complete, prove Completed edit UI/API denial, Reopen, correct
  again, and reload the same ID with exact values/status/version. Inject a lost
  PATCH response, restart the API, replay the same key/body, then send the same
  key with changed values. Verify exact record/version/audit/receipt counts,
  immutable Published/Compilation identity, responsive evidence, and cleanup.
- **TST-007 — Commands and evidence**: Run focused adapter, Workbench, compiler,
  compiler-worker, emitted-UI, and compatibility tests named by MIG-001..003;
  the minimum exact commands are
  `pnpm --filter @factory/graph exec vitest run test/product-blueprint.test.ts`,
  `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`,
  `pnpm --filter @factory/capabilities exec vitest run test/plan-alternatives.test.ts test/product-composer.test.ts`,
  `pnpm --filter @factory/workbench exec vitest run lib/product-journey/use-consumer-generation.test.tsx components/workbench-home.test.tsx`,
  `pnpm --filter @factory/compiler exec vitest run test/task-correction-compatibility.test.ts test/task-compatibility.test.ts test/task-mutation-runtime.test.ts test/composition-page-runtime.test.ts test/database-target-parity.test.ts test/compilation-plan.test.ts`, and
  `pnpm --filter @factory/compiler-worker exec vitest run test/verification-graph-plan.test.ts`.
  Then run each affected package's complete `test`, `typecheck`, `build`, and
  `lint` scripts once at the finished shared boundary. After separate runtime
  authorization, run the Task correction Playwright lane with one worker and
  zero retries. Record commands, hashes, immutable identities, safe bounded
  outcomes, 390/768/1440 evidence, resource-zero cleanup, and remaining
  identity/provider/hosting limits in the active ledger and correction
  acceptance directory. Apply one existing full task review, independent Terra
  QA, independent Sol release review, PM acceptance, and controller delivery;
  add no component-specific gate.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and `docs/delivery-policy.md`.
- **REF-002**: ADR-0057, ADR-0060, ADR-0063, and
  `docs/acceptance/team-task.md`.
- **REF-003**:
  `docs/superpowers/plans/2026-09-13-product-definition-scale.md`,
  `docs/superpowers/plans/2026-09-13-task-correction.md`, and the active
  consumer-delivery ledger.
- **REF-004**: `packages/adapters/src/requirements/task-definition-selection.ts`,
  `packages/compiler/src/task-mutation-contract.ts`,
  `packages/compiler/src/mutation-write-protection.ts`,
  `packages/compiler/src/task-workspace-presentation.ts`, and
  `apps/compiler-worker/src/verifier/verification-graph-plan.ts`.
