---
title: "ADR-0063: Task Mutation Safety and Retry Contract"
status: "Proposed"
date: "2026-09-13"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "tasks", "generated-api", "security"]
supersedes: ""
superseded_by: ""
---

# ADR-0063: Task Mutation Safety and Retry Contract

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** only future exact ADR-0057 Task output from the
generic generated mutation path to compiler-private `task-mutation@1.0.0`,
composed with compiler-private `generated-write-protection@1.0.0` and generated
contracts `factory.generated.task-mutation/v1` and
`factory.generated.task-mutation-receipt/v1`. Create, Start, Complete, and
Reopen become authorization-first, idempotent, version-checked, and atomic.
Keep ADR-0057's exact fields, roles, states, transitions, pages, assignment
truth, exclusions, definition count, and `task-workspace-presentation@1.0.0`.
This is still a bounded Task family experiment, not a mature task product.

This proposal is not accepted and authorizes no source change, Product Publish,
Compilation, Preview, provider call, external resource, deployment, Git action,
or release. A qualified independent standing-acceptance review and PM ledger
record are required before implementation.

## Context and decision gap

- **CTX-001**: ADR-0057 is standing-accepted at SHA-256
  `8ee8ff2870369bed43d076ab8ff8d63653138d761c9970ace9358dd9d5465017`.
  It admits Blueprint verbs `start`, `complete`, and `reopen`, one canonical
  `team-task-tracking` definition, structural `task-v1` presentation, and a
  create/start/complete/reopen local shared-board journey. It explicitly keeps
  existing generated API routes and CRUD/event persistence.
- **CTX-002**: The current generic generated runtime accepts optional
  `expectedVersion` and `idempotencyKey` transition inputs but enforces them
  only for a locked commerce order. Other workflows read state and then apply
  an unconditional status update; generic Create has no idempotency receipt.
  Replayed Create can duplicate a task, and concurrent event requests can both
  act on one stale state.
- **CTX-003**: `docs/threat-model.md` requires state-changing requests to bind
  to idempotency and optimistic concurrency or immutable-revision checks.
  Immutable Published Graph input protects compilation identity, not mutable
  generated Task records. ADR-0057's existing generic mutation assumption
  therefore cannot authorize a compliant Task implementation on the current
  baseline.
- **CTX-004**: The delivered approval correction provides a proven private
  pattern: authorization before receipt lookup, actor-scoped keys, canonical
  request hashes, persisted responses, conditional version writes, transaction
  rollback, and safe replay/conflict errors. Those mechanics form a bounded
  reusable write-protection port. Approval operations, reason, correction,
  decision-history, field validation, and state rules remain in the approval
  adapter and do not apply to Task.
- **CTX-005**: Commit `d28f1fedf4fa0aaefe3e81492cabd857db69d8cb`
  is the accepted pre-Task source baseline. Root's
  `packages/compiler/test/fixtures/task-non-task-baseline.json` freezes three
  canonical definition hashes and ten complete ordered bundle hashes, including
  draft-shaped and true Published Graph inputs with separately recomputed locks,
  three legacy bundles, and Restaurant V3.
- **CTX-006**: ADR-0057 TSK-007 excludes edits after creation. This amendment
  adds mutation safety only; it does not add Edit, Save, correction, comments,
  assignment identity, owner privacy, notifications, or any other product
  behavior. A later correction journey requires a separate product decision.

## Current and proposed profiles

- **CUR-001 — Accepted Golden technology profile**: Node
  `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`,
  Next `^15.1.0` resolved `15.5.22`, React/DOM `^19.0.0` resolved `19.2.8`,
  Puck `0.22.3`, XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`,
  BullMQ `5.81.2`, ioredis `5.11.1`, PostgreSQL `16-alpine`, Redis
  `7-alpine`, compiler Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`,
  `lucide-static` exactly `0.468.0`, Docker Compose, and implemented
  `factory.application-graph/v1`. `@factory/adapters@0.1.0` uses OpenAI
  `^4.77.0` resolved `4.104.0`; `@factory/compiler` and
  `@factory/compiler-worker` remain `0.1.0`. Manifests, `pnpm-lock.yaml`,
  Dockerfiles, and floating-major image tags remain authoritative.
- **CUR-002 — Current generated mutation behavior**: Non-commerce generic
  Create accepts a plain record body and generic event POST accepts an optional
  `{ expectedVersion, idempotencyKey }` body without enforcing either value.
  Only exact approval correction output has private persisted mutation receipts
  and conditional record versions. No Task definition or Compilation exists.
- **PRO-001 — Proposed private Task profile**: Keep every CUR-001 coordinate,
  Graph/Blueprint/requirement identifier, package, provider, capability lock,
  compiler target, and Compose service. After the exact ADR-0057 Task selector
  succeeds, add `task-mutation@1.0.0`, compose
  `generated-write-protection@1.0.0`,
  `factory.generated.task-mutation/v1`, and
  `factory.generated.task-mutation-receipt/v1` to that newly generated Task
  artifact only. Add a Factory-owned integer `version` to its Task record and a
  private receipt model to its initial schema. This proposed private profile is
  distinct from the current accepted Golden profile and does not change it.
- **PRO-002 — Isolation**: Existing Restaurant, approval, appointment, legacy,
  and all nonmatching outputs retain their current selectors, API/data shapes,
  generated source, schema, migration, and exact bytes. No public endpoint,
  public package export, public catalog entry, Graph schema, Blueprint version,
  database service, or historic artifact changes.

## Frozen selection and reuse contract

- **SEL-001 — One selector**: Mutation and `task-v1` presentation use the same
  compiler-private selection result. It must match exactly ADR-0057 UI-001:
  one Task entity with semantic fields `title`, `description`, `assignee`,
  `dueDate`, `priority`, and injected `status`; one flow with initial
  `not-started`, exact states `not-started`, `in-progress`, `completed`, and
  exact transitions `start`, `complete`, `reopen`; exact Member and Viewer
  grants; exact bound dashboard/list/form/detail/queue blocks; and the six
  locks and nine bindings frozen by ADR-0057 FAM-001A. Naming and declaration
  order vary only where ADR-0057 permits. Zero, multiple, incomplete, or
  conflicting matches do not receive any Task-private mutation path.
- **SEL-002 — Bounded candidate fail-close**: A Task-shaped candidate is a
  Graph with one entity carrying the exact ADR-0057 five business-field
  signature, the six exact locks and nine bindings of FAM-001A targeted to that
  entity, and an associated flow containing any of `start`, `complete`, or
  `reopen`. Such a candidate that fails the complete SEL-001 match must fail
  compilation with a fixed safe contract error. It cannot fall back to the
  unsafe generic mutation renderer or receive a partial Task profile. Every
  other Graph, including a generic Graph that happens to use one of those
  arbitrary event names without the Task field-and-lock signature, retains its
  existing selector, output, behavior, and bytes.
- **REU-001 — Bounded write-protection port**: Extract one compiler-private
  `generated-write-protection@1.0.0` source-emission port from the proven
  approval implementation. Its exact responsibilities are deterministic source
  fragments for idempotency-key validation, a compiler-selected key-storage
  transform, length-delimited scope hashing, canonical request hashing,
  receipt-before-write ordering, stored-response replay, same-key/different-hash
  conflict, conditional `(id,status,version)` update coordination, unique receipt
  persistence, and transaction rollback. Its configuration admits only fixed
  compiler-owned identifiers, error prefix, receipt type/table/delegate names,
  Graph checksum, selected entity, the already validated operation name, and
  `idempotencyKeyStorage: "legacy-raw" | "sha256-v1"`. The compiler fixes
  `legacy-raw` for approval and `sha256-v1` for Task; neither a provider nor
  Graph input can choose it. The port exports compile-time fragment builders and
  does not own or replace approval authorization call sites or runtime types. It
  accepts no provider, Graph text, route, arbitrary source, SQL, field schema,
  role, transition, or UI configuration.
- **REU-002 — Two thin business adapters**: Keep
  `approval-mutation-contract.ts` and new `task-mutation-contract.ts` as distinct
  adapters around REU-001. Approval composes the common fragment builders with
  `legacy-raw` while retaining its existing authorization-before-receipt lookup
  anchors, call sites, runtime types, update/return reason, decision history,
  field validation, operations, states, errors, and response shape byte for
  byte. No branded authorization context or other new runtime source enters the
  approval output. Task composes the same builders with `sha256-v1`, owns only
  exact Create/Start/Complete/Reopen validation, Task fields/states/errors, and
  its response shape, and may construct a Task-only branded authorized context
  after its policy decision. The shared builders must supply the common
  security-critical validation, hash, replay, conflict, conditional-write,
  receipt, and rollback fragments; duplicating or renamed-copying those
  algorithms in either adapter is forbidden.
- **REU-003 — Byte-compatible extraction**: The port operates at compile-time
  source composition. Its approval configuration must render the exact current
  approval runtime, Prisma schema, migration, route, and client byte strings.
  The extraction is invalid if any of the ten non-Task baseline bundles or
  existing approval focused byte assertions change. No public/general mutation
  capability or runtime registration is created. ADR-0057's separately accepted
  presentation-helper work remains governed by its byte-preservation rule.

## Frozen generated API and data contract

- **API-001 — Exact entity boundary**: The contracts in this section apply only
  to the unique SEL-001 Task entity, called `taskEntity`. Other entities in the
  same Graph retain existing read behavior and gain no version field, receipt,
  mutation, or generic PATCH route. The Task output exposes no post-create edit
  or delete endpoint.
- **API-002 — Command identity**: Every `taskEntity` Create, Start, Complete,
  and Reopen request requires header `x-factory-idempotency-key` matching
  `[A-Za-z0-9._:-]{1,128}`. The server resolves and authorizes the current
  fixture session or local role before receipt lookup. `actorScope` is the
  validated fixture-session ID in fixture mode and otherwise the resolved local
  role string; neither is a verified person identity. `scope` is SHA-256 of the
  length-delimited tuple
  `(Published Graph checksum, actorScope, role, entity, record ID or $create, operation)`.
  After validation, Task computes
  `storedIdempotencyKey` as the ASCII prefix `sha256:` followed by the 64
  lowercase hexadecimal characters of SHA-256 over the exact UTF-8 bytes of the
  header value, with no case folding or other normalization. Receipt lookup and
  persistence use only this stored value. `requestHash` is a separate SHA-256 of
  the validated JSON body canonicalized recursively with lexicographically
  sorted object keys.
  Raw Task keys are transient request memory only; raw keys and bodies never
  enter logs, errors, receipts, or evidence.
- **API-003 — Create request and response**: `POST /api/:taskEntity` accepts
  exactly `{ values: Record<string, unknown> }`. Values contain only the five
  declared business fields, obey their exact types, requiredness, and priority
  enum, and cannot supply `id`, `status`, `version`, timestamps, relations,
  access, or actor data. First success atomically creates one record with
  Factory-owned `status: "not-started"` and `version: 0`, one `create` audit
  event, applicable declared local effects, and one receipt. It returns HTTP
  `201` with exactly the stored record `{ id, status, version, title,
description, assignee, dueDate, priority }`; optional description is `null`
  when absent, and the date uses the existing serialized ISO representation.
- **API-004 — Event requests and responses**:
  `POST /api/:taskEntity/:recordId/events/:event` accepts only `start`,
  `complete`, or `reopen` and a body exactly
  `{ expectedVersion: nonnegative safe integer }`. Start requires
  `not-started -> in-progress`; Complete requires
  `in-progress -> completed`; Reopen requires
  `completed -> in-progress`. The exact declared Member role and Graph grant
  must authorize the event. Success conditionally matches record ID, current
  status, and version, increments version once, applies the declared transition
  and local effects, writes one audit event, stores one receipt, and returns
  HTTP `200` with the exact stored-record shape from API-003. Viewer and every
  wrong role receive safe `403` with no write or receipt.
- **API-005 — Receipt and replay**: Each generated Task schema contains private
  `TaskMutationReceipt { id String @id @default(cuid()), scope String, idempotencyKey String, requestHash String, operation String, recordId String, responseStatus Int, responseBody Json, createdAt DateTime @default(now()), @@unique([scope, idempotencyKey]) }`.
  For Task, `idempotencyKey` stores only the API-002 `storedIdempotencyKey`; the
  same validated raw key deterministically reaches the same unique tuple.
  Existing approval receipts retain their current raw-key storage and generated
  source unchanged under the compiler-fixed `legacy-raw` configuration; they
  are outside this Task receipt contract. A same-scope key and request hash returns
  the stored status and body, including the same record ID and version, without
  another record, version increment, audit event, effect, or outbox entry. The
  same key with a different hash returns HTTP `409`
  `{ code: "task.idempotency_conflict" }`. Denied or rolled-back work stores no
  receipt.
- **API-006 — Conflict and error precedence**: Evaluation order is exact:
  current authorization; scoped receipt lookup and replay/hash comparison;
  record existence; expected-version comparison; same-version state/event
  validation; conditional write. Missing or malformed header/body/field data is
  HTTP `400` `{ code: "task.invalid_request" }`; missing record is HTTP `404`
  `{ code: "task.not_found" }`; version mismatch or a conditional-write loser
  is HTTP `409` `{ code: "task.version_conflict", current: { id, status,
version } }`; a same-version invalid state/event or denied role is HTTP `403`
  `{ code: "task.denied" }`. Errors expose no business values, stack, policy
  internals, receipt scope, key, or request hash and cause no write.
- **DAT-001 — Atomic isolated storage**: Add `version Int @default(0)` only to
  the generated `taskEntity` model and add the API-005 receipt model/table to
  exact new Task initial Prisma/SQL. In-memory and Prisma stores provide the
  same conditional update and unique receipt semantics. Record/status/version,
  audit, declared local effects or outbox work, and receipt commit in one
  transaction or all roll back. Receipt response and audit rows are append-only
  after commit. No existing schema, row, database, Graph, or Compilation is
  migrated or rewritten.

## Frozen generated client and verifier contract

- **UI-001 — Activation and retry**: The Task Create form and each visible
  Start, Complete, or Reopen button create one `crypto.randomUUID()` key per
  user activation. They retain the exact validated payload and key after an
  unknown network result and reuse both only when the user explicitly retries.
  Editing a retained Create payload creates a new key. The client sends the
  displayed record version with every event, disables all commands for the
  affected form or record while pending, and ignores repeated activation.
- **UI-002 — Success and conflict**: First success or stored replay refreshes
  authoritative records and retains list-level success through filtering. A
  `409` refreshes the record, clears the stale command, and displays a plain
  conflict message; the client never overwrites, guesses a new version, or
  automatically retries with a new key. A known `400`, `403`, or `404` uses a
  safe fixed message. A transport failure uses an explicit unknown-result
  message and Retry action without claiming success.
- **UI-003 — Scope guards**: Pending and retained command state is scoped to
  role, entity, record, operation, displayed version, and Create payload as
  applicable. Role, route, record, or generation changes invalidate late
  callbacks so a stale response cannot repopulate another scope. Assignee
  remains escaped display text and never becomes actor scope or authority.
- **VER-001 — Generated verification requests**: For an exact SEL-001 Task,
  the compiler-worker plan emits `x-factory-fixture-session` plus
  `x-factory-idempotency-key`. Create uses `{ values }`; events use
  `{ expectedVersion }`. Chains calculate versions from committed steps:
  Create `0`, Start result `1`, Complete result `2`, Reopen result `3`, and a
  final Complete result `4`. The first safe command is replayed with the same
  key/body and must return its stored success, not an expected rejection.
  Denial requests use a distinct key and prove `403` with no receipt. Existing
  journey header validation and probe execution are reused unchanged.

## Compatibility, security, catalog, and operability effects

- **CMP-001 — Exact old bytes**: The three canonical definition hashes and all
  ten ordered bundle hashes in
  `packages/compiler/test/fixtures/task-non-task-baseline.json` must remain
  exact. This covers canonical Restaurant/Expense/Purchase draft-shaped and
  Published inputs, legacy Expense/Purchase/Booking, and Restaurant V3. Existing
  approval mutation, presentation, media, history, API, schema, and database
  bytes cannot drift.
- **CMP-002 — Artifact compatibility**: Old Drafts, Published Graphs,
  Compilations, source manifests, and hashes remain immutable. No Task artifact
  exists to migrate. Once a Task Compilation is retained, the compiler must
  continue supporting its exact private contract even if new Task selection is
  later disabled.
- **SEC-001**: Browser visibility and assignee text grant no authority. Server
  authorization, exact state, expected version, conditional write, and scoped
  persisted receipt remain decisive. Replays recheck current authorization.
  No credential, raw prompt/response, tenant, upload, filesystem, remote URL,
  HTML, package, or external-provider boundary changes.
- **CAT-001**: Public capability, UI, recipe, definition, source-study, and
  compiler-target catalogs remain unchanged. The Task definition/family count
  changes from three/two to four/three only after the complete ADR-0057
  experiment passes acceptance. `task-mutation@1.0.0` is factory-authored,
  `UNLICENSED`, compiler-private, and unexported.
  `generated-write-protection@1.0.0` is likewise factory-authored,
  `UNLICENSED`, compiler-private, unexported, and absent from public catalog
  counts. No package, lockfile, license notice, copied source, icon, font,
  provider, or service is added.
- **OPS-001**: Task output adds bounded receipt storage proportional to
  successful commands, one integer per Task record, and no route beyond the
  existing Task Create/event paths. A crash before commit leaves no outcome; a
  retry executes once. A crash after commit replays the persisted response.
  Receipt retention follows the generated application's record retention while
  replay is supported. Health, ports, network, Compose topology, Preview,
  cleanup, and deployment boundaries remain unchanged.

## Consequences

### Positive

- **POS-001**: Lost Create or event responses cannot duplicate records or
  transitions; users can recover the exact stored outcome.
- **POS-002**: Competing Task commands cannot silently overwrite one another,
  and stale state receives a bounded authoritative conflict.
- **POS-003**: A narrow private selector and reusable write-protection port close
  the new Task risk without changing delivered products or generalizing the
  public runtime.

### Negative

- **NEG-001**: Task output carries a receipt table, record version, and private
  command emitter in addition to the existing generic runtime.
- **NEG-002**: The compiler retains separate approval and Task business adapters
  plus one small shared source-emission port; approval byte compatibility makes
  that extraction a permanent regression obligation.
- **NEG-003**: This amendment does not make the Task family product-complete;
  post-create correction and all ADR-0057 exclusions remain open.

## Alternatives considered

### Keep the generic mutation path

- **ALT-001 — Description**: Implement ADR-0057 exactly as originally planned
  and rely on current state checks.
- **ALT-002 — Rejection reason**: Create has no replay identity and generic
  event writes lack optimistic concurrency, violating the current threat model.

### Generalize every generated mutation now

- **ALT-003 — Description**: Add receipts and versions to every generic entity
  and event in all current and future families.
- **ALT-004 — Rejection reason**: This changes existing API/data contracts and
  bundle bytes outside Task, creates a broad migration, and exceeds the active
  product goal.

### Duplicate the approval mutation emitter for Task

- **ALT-005 — Description**: Copy the approval emitter and replace approval
  fields, operations, states, errors, schema names, and UI copy with Task terms.
- **ALT-006 — Rejection reason**: This duplicates security-critical hashing,
  replay, conditional-write, and transaction logic and lets later fixes diverge.
  The bounded REU-001 mechanics are reusable without coupling the two business
  adapters.

### Generalize approval business behavior into one mutation module

- **ALT-007 — Description**: Parameterize approval field validation, reason,
  history, correction states, Task states, responses, and UI in one emitter.
- **ALT-008 — Rejection reason**: Those are distinct product contracts. A broad
  configurable framework increases invalid combinations and risks approval
  bytes; only the write-protection mechanics have a stable shared port.

### Add post-create Task editing with mutation safety

- **ALT-009 — Description**: Introduce Task Edit/Save together with the version
  and receipt mechanism.
- **ALT-010 — Rejection reason**: ADR-0057 explicitly classifies edits after
  creation as material clarification. Mutation safety cannot silently expand
  the accepted business scope.

## Migration, ownership, rollback, and abort conditions

- **MIG-001 — Contract owner and serialization**: Root/PM owns
  `factory.generated.task-mutation/v1`,
  `factory.generated.task-mutation-receipt/v1`, errors, actor/session semantics,
  and compatibility. The Graph package owner retains the accepted additive
  Blueprint verb contract. These artifacts are frozen enough for focused tests,
  but frontend/backend disjoint writers are not authorized because one compiler
  emits the UI, proxy, API, store, and initial database. One integration writer
  serially owns shared contracts, generated templates, database target, and
  compiler-worker request planning. Root separately owns E2E, evidence, ledger,
  acceptance, and Git.
- **MIG-002 — Exact additional writer paths**: Add to ADR-0057 MIG-001 new
  `packages/compiler/src/mutation-write-protection.ts`; existing
  `packages/compiler/src/approval-mutation-contract.ts`; new
  `packages/compiler/src/task-mutation-contract.ts`; existing
  `packages/compiler/src/targets/database/target.ts`; new
  `packages/compiler/test/mutation-write-protection.test.ts`; new
  `packages/compiler/test/task-mutation-runtime.test.ts`; existing
  `packages/compiler/test/database-target-parity.test.ts` and
  `packages/compiler/test/compilation-plan.test.ts`; existing
  `apps/compiler-worker/src/verifier/verification-graph-plan.ts`; and existing
  `apps/compiler-worker/test/verification-graph-plan.test.ts`. The approval
  module edit is extraction-only and must preserve every emitted byte. ADR-0057 already
  owns `packages/compiler/src/index.ts`, Task presentation, and composition-page
  tests. No approval presentation source path is added.
- **MIG-003 — Root compatibility paths**: Root owns new
  `packages/compiler/test/task-compatibility.test.ts` and
  `packages/compiler/test/fixtures/task-non-task-baseline.json`, plus the
  ADR-0057 Task E2E/fixture/presentation, acceptance evidence, plan, ledger,
  status, review, and Git paths. The compatibility test is a permanent gate and
  is disjoint from the integration writer's tests.
- **MIG-004 — Sequence**: Preserve the green d28f1fed compatibility baseline;
  add a RED parity test around the bounded write-protection port and existing
  approval emitted strings; extract the port while keeping approval output
  exact; add failing selector/API/store/database/client/verifier tests;
  implement the thin Task adapter and database fragments; wire exact `task-v1` emission;
  update compiler-worker request derivation; then run the complete affected
  package and Task acceptance wave. Generated templates, shared contracts,
  actual Compilation, and end-to-end smoke remain serialized integration work.
- **ROL-001 — Before retained Task output**: Revert the ADR-0057 and ADR-0063
  listed source/tests and remove Task selection, private Task contracts, and
  generated Task-only schema fragments. Old product bytes remain the d28f1fed
  baseline.
- **ROL-002 — After retained Task output**: Stop selecting Task for new work but
  retain exact compilation support for immutable Task Published Graphs and
  Compilations. Do not rewrite their Graph, source, schema, receipt, record, or
  hash. Remove only exact task-scoped local Preview resources. No destructive
  database migration or irreversible step is authorized.
- **ABT-001**: Abort on mutable-Draft compilation; any old definition or bundle
  drift; partial Task selection; a Task-shaped candidate reaching the unsafe generic path;
  mutation without authorization-first receipt lookup, strict key/body,
  conditional version write, atomic audit/effects/receipt, or replay; duplicate
  Create; stale overwrite; post-create edit; assignee authority; new dependency,
  public registry, Graph/API version, general database migration, approval
  business-contract change or emitted-byte drift, Compose change, external
  call, historic artifact mutation, or a
  claim of mature/product-complete Task delivery.

## Measurable verification plan

- **TST-001 — Selector and containment**: Positive cases cover permitted naming
  and ordering changes while retaining exact ADR-0057 fields, grants, states,
  transitions, pages, blocks, locks, and bindings. Negative cases independently
  remove, add, duplicate, rename, mistype, or rebind each required semantic and
  prove no private Task mutation output. A Task-shaped candidate that fails the
  complete selector must fail compilation rather than emit the generic mutator;
  non-candidate Graphs with same-named arbitrary events remain byte-identical.
- **TST-002 — Request validation and authorization**: For Create/Start/Complete/
  Reopen, prove exact headers, bodies, status codes, response shapes, field and
  enum validation, forbidden Factory-owned keys, safe 400/403/404, Viewer and
  wrong-state denials, authorization before receipt lookup, and zero writes on
  every rejection.
- **TST-003 — Shared-port parity, replay, and concurrency**: Prove the shared
  port accepts only fixed compiler-owned configuration and that providers and
  Graphs cannot select key storage. Prove the approval adapter renders exact
  pre-extraction bytes, retains its existing authorization-before-lookup anchors
  and runtime types, and retains its current raw-key receipt behavior under
  `legacy-raw`. Prove Task persistence contains exactly `sha256:` plus the
  lowercase SHA-256 digest of the exact validated key bytes, uses that digest
  for replay lookup, and contains no raw key in receipts, logs, errors, or
  evidence. In memory and Prisma, prove first
  success plus same-key/hash replay across a reconstructed runtime yields the
  identical stored status/body and one record/version/audit/effect/receipt;
  same key with a changed body is idempotency 409; two different keys at one
  version produce one success and one version 409; failure injected before each
  record, audit, effect/outbox, and receipt boundary rolls back everything.
- **TST-004 — Lifecycle and client**: Create two distinct tasks; drive
  Start `v0 -> v1`, Complete `v1 -> v2`, Reopen `v2 -> v3`, and Complete
  `v3 -> v4`; reload exact values/status/version. Prove one pending command per
  scope, ignored double activation, unknown-result retention and explicit same-
  key retry, 409 refresh without overwrite, stale role/record callback rejection,
  Viewer read/denial, finder/status/no-match/clear, and no Edit/Save surface.
- **TST-005 — Verifier parity**: Derive the plan from a true Published Graph and
  separate digest-matched composition lock. Assert Task Create/event bodies,
  fixture-session and idempotency headers, chain versions, stored-success replay,
  denial key isolation, deterministic plan bytes, and unchanged approval,
  Restaurant, appointment, and generic verification plans.
- **TST-006 — Exact compatibility**: Run the permanent Task compatibility test
  and require exact equality for all three definition hashes and ten complete
  ordered bundle hashes. Also assert exact approval receipt/presentation
  coordinates and no Task schema/contract text in any non-Task output.
- **TST-007 — Commands and delivery evidence**: Run
  `pnpm --filter @factory/graph exec vitest run test/product-blueprint.test.ts`,
  `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`,
  `pnpm --filter @factory/capabilities exec vitest run test/plan-alternatives.test.ts test/product-composer.test.ts`,
  `pnpm --filter @factory/workbench exec vitest run lib/product-journey/use-consumer-generation.test.tsx`,
  `pnpm --filter @factory/compiler exec vitest run test/task-compatibility.test.ts test/mutation-write-protection.test.ts test/task-mutation-runtime.test.ts test/composition-page-runtime.test.ts test/database-target-parity.test.ts test/compilation-plan.test.ts`, and
  `pnpm --filter @factory/compiler-worker exec vitest run test/verification-graph-plan.test.ts`.
  Then run affected package typecheck/build/lint and complete package suites once.
  After a separate runtime authorization, run the provider-free Task E2E with
  one worker and zero retries at 390/768/1440 px. Apply one existing full task
  review, independent Terra QA, independent Sol release review, PM acceptance,
  and controller delivery at this shared boundary; add no component-specific
  gate. Record hashes, commands, immutable identities, actual replay/conflict
  outcomes, visual/accessibility evidence, cleanup, and remaining product limits
  in the active ledger and Task acceptance note.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and `docs/delivery-policy.md`.
- **REF-002**: ADR-0057, ADR-0060, ADR-0061, and ADR-0062.
- **REF-003**: `packages/compiler/src/approval-mutation-contract.ts`,
  `packages/compiler/src/targets/database/target.ts`,
  `apps/compiler-worker/src/verifier/verification-graph-plan.ts`, and
  `apps/compiler-worker/src/verifier/probes.ts`.
- **REF-004**: `docs/superpowers/plans/2026-09-11-canonical-team-task-family.md`
  and `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
