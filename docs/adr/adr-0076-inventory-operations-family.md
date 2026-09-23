---
title: "ADR-0076: Inventory Operations Family"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "inventory", "definition", "compiler"]
supersedes: ""
superseded_by: ""
---

# ADR-0076: Inventory Operations Family

## Status and recommendation

**Proposed.** Recommendation: **experiment** with one reusable Inventory
Operations family and one `supplies-stockroom@1.0.0` definition. A stockkeeper
creates items, receives stock, issues it and records justified corrections;
each action updates an authoritative balance and immutable movement history.
Desktop serves receiving, correction and history. Mobile web serves stock
lookup and issue against the same records. One indivisible unit, `each`, and
one shared local stock pool bound this first experiment.

Keep the accepted Golden profile, Graph serialization, existing physical
capability packages and historical generated outputs. Reuse the existing
compiler mutation protection and transaction architecture. Do not activate
Restaurant's order-coupled inventory packages for a standalone stockroom or
rewrite its runtime to extract a new universal engine in this wave.

This proposal grants no implementation authority. Implementation waits for
Resource Directory completion, PM's source freeze and exact ADR acceptance.
PM must record direct founder acceptance or the separate qualified reviewer's
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 `0/0`, exact ADR SHA-256,
reviewer identity, evidence and bounded ownership under
`docs/tech-governance.md`. The proposer cannot supply that review. Repository
release, Product Publish against a user's application, provider calls, paid
resources, credentials, cloud execution and deployment remain separately governed.

## Context and current accepted profile

- **CTX-001**: Investigation is read-only in the existing
  `codex/definition-regression-entry` worktree while Directory's actual
  acceptance is active. The PM ledger, not this proposal, determines whether
  Directory or any product has completed acceptance. The next-wave plan
  requires receiving, issue, justified adjustment, concurrency, history and
  reload. Registering a family or changing a label does not satisfy that job.
- **CTX-002**: `commerce.inventory@1.1.1`'s actual
  `templates/api/capability-module.ts.tpl` obtains cart items, reserves/releases
  each line with compensating calls, and treats `decrement` as a no-op after
  reservation. It supplies no standalone receiving/issue API or movement
  history contract. Its current semantics and bytes must remain unchanged.
- **CTX-003**: `commerce.inventory-ledger@1.0.0` declares mandatory catalog,
  movement, order and location bindings and requires `commerce.order-event`.
  Its `inventory-ledger.handler.ts.tpl` exports metadata, not a transaction
  implementation. Selecting this package would not implement the proposed job;
  fake orders or locations would misrepresent the Graph.
- **CTX-004**: Actual `adjustMenuItemStock` in
  `packages/compiler/src/restaurant-runtime.ts` checks a manager, expected
  resource version and nonnegative stock, conditionally updates a menu item,
  and writes ledger/audit/capability/outbox records inside `executeCommand`.
  This is useful first-party semantic precedent, but its entities, role,
  location lookup, receipt scope and Restaurant outbox are coupled. Its
  integer check alone is not this proposal's full numeric validation contract.
- **CTX-005**: Existing `mutation-write-protection.ts`, Task/Appointment and
  Directory emitters already supply receipt hashing, scope, conditional writes
  and serializable persistence patterns. Directory's persisted-input failure
  additionally demonstrates why admission must test a real JSON round trip:
  null-prototype dictionaries become ordinary objects without changing JSON
  meaning. Preserve strict own-data validation before semantic comparison.
- **CUR-001**: Keep Node `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript
  `^5.7.2` resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`,
  Prisma/client `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved
  `5.81.2`, and ioredis `^5.4.2` resolved `5.11.1`. Tracked root/package
  manifests, `pnpm-lock.yaml` and the governance Golden table govern these
  versions. Keep `node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`
  as floating-major image tags. No package, supported range, lock resolution,
  runtime, database technology, queue, service, port or Compose change.
- **CUR-002**: Preserve `factory.application-graph/v1`,
  `factory.product-blueprint/v1`, `factory.product-definition-data/v1`,
  `factory.product-definition-catalogue/v1`, `factory.numeric-field-domain/v1`,
  `factory.capability/v1`, `factory.capability-binding/v1`, composition-lock
  and immutable Published/Compilation formats. Draft remains mutable by new
  revision; Publish produces a separate immutable input. Compilers never
  consume mutable Drafts or rewrite old Published records, locks or hashes.

## Decision

### Reuse and extraction boundary

| Search order        | Source and exact assets                                                                                                                                                                                                                                          | Reuse or gap                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approved registries | `packages/ui-primitives/src/index.ts`: `button`, `input`, `label`, `select`, `card`, `badge`, `dialog`; `packages/ui-patterns/src/index.ts`: `form-field`, `data-table`, `compact-sidebar-navigation`, loading/empty/validation/error/confirmation/denial states | Compose quantity forms, stock rows and recovery states; add no style-only primitive.                                                                                                  |
| Recipes             | `packages/generated-ui/src/index.ts`: `mobile-product-shell`, `merchant-workspace-shell`; `packages/screen-recipes/src/index.ts`: `merchant-menu-management`, `menu-management-table`, `availability-toggle`; existing Restaurant product/experience recipes     | Reuse shell, table and form conventions. Existing menu bindings require price, preparation and Restaurant flow semantics; do not fake their ports or mutate frozen descriptors.       |
| Workbench           | `apps/workbench/components/shell/workbench-shell.tsx` and journey summary assets                                                                                                                                                                                 | Reuse labelled navigation, landmarks, safe summaries and focus conventions. No Workbench runtime import into generated code.                                                          |
| Generated templates | `mutation-write-protection.ts`, `task-mutation-contract.ts`, `content-directory-runtime.ts`, `content-directory-presentation.ts`, `page-runtime-projection.ts`, `restaurant-runtime.ts`                                                                          | Compose existing receipt/CAS/query/safe-rendering mechanisms. New semantic gap is item balance plus atomic immutable movements and stock-specific forms, not Approval decision cards. |
| Pinned studies      | `docs/ecosystem/source-studies/README.md`; `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`                                                                                                                                                   | These are provenance/reuse authorities, not a stockroom implementation. Copy no third-party or Base44 source.                                                                         |

- **REU-001**: Add private compiler composition
  `inventory-operations-presentation@1.0.0` with first-party `UNLICENSED`
  provenance, the above reuse keys and emitted-UI tests. No new physical UI
  package or public general-purpose rules engine. Existing allowlisted local
  icons may use `lucide-static@0.468.0` with its retained notice; no new binary,
  remote image, URL field, upload, icon dependency or source-copy admission.
- **REU-002**: Reuse `writeProtectionFragments` through a private Inventory
  adapter, as Directory does, or an additive fixed-profile parameterization
  whose old output bytes are proven equal. Business authorization and balance
  arithmetic stay explicit in the Inventory contract. Preserve Restaurant
  emitter and commerce package bytes; extraction of a common Restaurant engine
  is deferred until a second actual consumer justifies that migration.
- **REU-003**: Keep exactly six existing locks and their unchanged physical
  manifest digests from `definition-family-registry.ts`'s `fixedLocks`:
  `core.crud@1.0.1`, `core.workflow@1.0.1`, `core.identity-policy@1.0.0`,
  `core.policy-declarations@1.0.0`, `core.audit@1.0.2`,
  `core.notification@1.1.1`. Preserve owner-aware binding and dependency
  closure. Notification remains local infrastructure; no delivered message
  is promised. Do not invent `inventory.*` package effects that those six
  packages do not implement. Record the supported core audit/workflow effects
  and new business movement rows instead.

### Fixed family and Graph contract

- **FAM-001**: Add registry key `inventory-operations`, family version
  `inventory-operations/v1`, parameter policy `none/v1`, presentation
  `{ key: "inventory-operations-presentation", version: "1.0.0" }` and
  compiler profile `inventory-operations@1.0.0`. Initial definition is
  `supplies-stockroom@1.0.0`. Labels and safe identifiers are reviewed data;
  runtime selection cannot depend on a title, definition name or package
  presence alone. Requirements needing excluded behavior become material
  clarification, not a silently reduced product.
- **FAM-002**: Exactly two business entities exist. The item has reserved
  required fields `sku` (text/string), `name` (text/string), `unit`
  (text/string, runtime constant `each`), and `quantity` (number/integer,
  inclusive domain `0..1000000000`). The movement has required `stockItem`
  (reference to item), `kind` (enum exactly `receive,issue,adjust`), `delta`
  (number/integer, inclusive `-1000000000..1000000000`), `beforeQuantity`
  and `afterQuantity` (number/integer, inclusive `0..1000000000`),
  `itemVersion` (number/integer, inclusive `1..2147483647`), `reason`
  (long-text/text), `actorRole` (text/string), `recordedAt` (datetime),
  and optional `correctionOf` (text/string containing a movement ID).
  No extra fields, calculated fields or relations are admitted. Item IDs,
  record versions and movement IDs are factory-owned; clients cannot supply
  balances, deltas derived from receive/issue quantities, provenance or times.
  The reference has exactly three coordinates: Blueprint `stockItem` is a
  required reference with `referenceTo` equal to the item entity key; existing
  `referenceScalarKey` projects it to required Graph string field
  `stockItemId`, with exactly the business relation
  `{ from: movementEntityKey, to: itemEntityKey, kind: "many-to-one", field: "stockItemId" }`;
  the response projection exposes that scalar ID as API `stockItem`.
  The relation targets the item's factory-injected `id` under the existing
  `*Id` rule, not SKU or a nested object. Published storage and Prisma use
  `stockItemId`; API response construction alone renames it to `stockItem`.
  Do not add a second stored `stockItem` field or a new Graph target-field rule.
  In the Published Graph, the item's `sku` field carries `unique: true` and
  its indexes are `[]`; the movement indexes are exactly
  `[{ fields: ["status"] }, { fields: ["stockItemId", "itemVersion"], unique: true }]`.
  These uniqueness declarations derive before Publish and are checked against
  the emitted schema, never inferred only inside the compiler. Existing
  factory principal/session entities and their relation/indexes remain intact.
- **FAM-003**: Exactly one movement workflow has `draft` and `recorded`
  states, initial `draft`, and `draft --submit--> recorded` assigned to the
  stockkeeper. Composer adds the required status field. A movement command
  creates and submits the movement within one transaction; no incomplete
  draft is committed or offered as a separate user step. Recorded movements
  have no outgoing transition. Item creation does not create a fake workflow.
  Primary job is stockkeeper submission of a real movement to `recorded`.
  The sole movement transition declares exactly
  `effects: [{ capability: "audit.record", operation: "record" }]`, supplied
  by the existing locked `core.audit` package. Derive the corresponding
  `integration.capabilities` entry
  `{ key: "audit.record", providerId: "factory", operation: "record" }`
  alongside the unchanged identity/authorization entries. Execute this declared
  effect atomically with the movement and record its audit evidence once;
  no notification effect or invented inventory capability is declared.
- **FAM-004**: Exactly two demo actors: stockkeeper grants item
  `create,read,update` and movement `create,read,submit,audit`; observer grants
  item `read` only. One stockkeeper performs both desktop and mobile jobs.
  Observer cannot read movement history, receipts or audit evidence. Exactly
  three page intents bind to the item: list, form and detail; detail composes
  the authorized movement history and action forms. No delete, arbitrary
  record update, generic ledger edit or additional role is admitted.
- **FAM-005**: Extend only the exact Inventory-family derivation in
  `packages/capabilities/src/product-composer.ts` and the adapter family
  validator/projector: numeric allowance, the SKU unique flag and movement
  indexes in FAM-002, the audit effect/declaration in FAM-003, and empty seed
  derivation below. Its current numeric gate admits Approval/Appointment;
  permit this exact Inventory shape without widening arbitrary Blueprint
  numeric use, changing action vocabulary or Graph schemas. Existing `number`
  already maps to Graph `integer`; preserve the existing reference projection.
  Inventory `domain.seedData` is required and exactly `[]` at derivation,
  plan/projection and Published admission. The existing generic seed generator
  would fabricate a quantity-12 item and an unlinked draft movement; bypass
  that generator only for the complete Inventory witness. Do not seed business
  items or movements through Graph, generated bootstrap, compiler fixtures
  used as product data, or fallback defaults. Existing local demo identity
  bootstrap remains unchanged. Enforce the same complete shape at plan
  derivation, composition, definition projection and compiler admission;
  preserve all non-Inventory derivation output bytes.
- **FAM-006**: Extend checked-in `definitions/product-definitions.v1.json`
  and strict family schema/catalogue integration. Keep unknown-key/version
  rejection, raw JSON bounds, semantic fingerprints, journey and lock checks.
  Keep the existing `provenance.decision: "ADR-0065"` authoring-format literal;
  record this family's separate authority in acceptance evidence. One canonical
  definition is the experiment; 3-5 later domain briefs receive fit assessment
  only. Labels, SKUs and seed text alone do not count as distinct products.
- **FAM-007**: One authoritative selector in compiler-private
  `inventory-operations-contract.ts` validates the actual immutable Published
  Graph and separate composition lock together: hash, exact package versions/
  digests/bindings, both entities, numeric bounds, the three-coordinate
  reference mapping, SKU unique flag, exact movement indexes, fields, grants,
  workflow/audit declaration, required empty `domain.seedData`, pages and
  absence of extra behavior. Missing or nonempty seed data, altered uniqueness
  or an ambiguous reference fails admission. It returns a detached deeply
  frozen readonly `InventoryOperationsProfile`. Unrelated input returns
  `undefined`; an Inventory candidate with any malformed witness fails closed
  before artifact acceptance, never generic CRUD fallback. Test normal compiler,
  emitted-page and JSON-persisted lifecycle inputs.
- **FAM-008**: Permit exactly two additive compiler-root exports:
  `selectInventoryOperationsProfile` and type `InventoryOperationsProfile`.
  Signature is `(graph: ApplicationGraphV1, compositionLock?:
CapabilityCompositionLockV1) => InventoryOperationsProfile | undefined`;
  the optional argument never permits lock-free Inventory selection. Worker
  consumes these through `@factory/compiler`, not `src`, `dist`, a new
  subpath, duplicated heuristic or caller-supplied witness. Keep the existing
  root-only package export map. This selector does not replace authenticated
  queue, Published identity or artifact-containment checks.

### Generated API and numeric semantics

- **API-001**: Retain existing entity route grammar. Item list
  `GET /api/:itemEntity` accepts only optional `q`, `offset`, `limit`:
  trimmed literal query 0..120 characters, offset integer 0..10000 default 0,
  limit integer 1..50 default 20. Reject duplicate/unknown keys, invalid percent
  encoding and malformed numeric syntax. Parameterized, escaped literal
  case-insensitive substring search covers SKU/name, ordered SKU then ID.
  Read at most limit+1 rows; no full-table fetch followed by browser filtering.
  Response is `{ apiVersion: "factory.generated.inventory-list/v1", records,
offset, limit, hasMore }`. Item records expose only
  `{ id, sku, name, unit, quantity, version }`. Detail
  `GET /api/:itemEntity/:id` returns that same shape.
- **API-002**: `POST /api/:itemEntity` accepts exactly
  `{ values: { sku: string, name: string } }`, creates quantity 0, unit `each`
  and version 0, and returns the item with status 201. SKU is trimmed,
  ASCII uppercased, matches `[A-Z0-9][A-Z0-9._-]{0,39}` and is unique in this
  application's stock pool. Name is trimmed plain text 1..120 characters.
  `PATCH /api/:itemEntity/:id` accepts exactly
  `{ expectedVersion: number, values: { name: string } }`; SKU/unit are
  immutable. Name correction increments item version once, returns status
  200 and records a safe audit event; it does not change balance/history.
- **API-003**: Three explicit command endpoints are
  `POST /api/:itemEntity/:id/movements/receive`, `/movements/issue`, and
  `/movements/adjust`. Versioned identifier is
  `factory.generated.inventory-command/v1`. Bodies are exactly:

  ```ts
  type ReceiveOrIssue = {
    expectedVersion: number;
    quantity: number;
    reason: string;
  };
  type Adjust = {
    expectedVersion: number;
    delta: number;
    reason: string;
    correctionOf: string | null;
  };
  ```

  Receive adds positive quantity; issue subtracts it; adjustment adds a signed
  nonzero delta. Reason is required trimmed plain text 1..280 characters for
  all three, so history explains each movement. No controls except newlines
  and tabs in reason; names contain no controls. Optional correction linkage
  is explicit `null` or an existing recorded movement ID for the same item,
  authorized before disclosure. It documents a compensating correction; it
  does not automatically negate, modify or delete the original. Further
  corrections may reference prior recorded corrections. No client-selected
  actor, time, kind, balance, item ID in values or raw idempotency field.

- **API-004**: Accept finite number primitives only, with
  `Number.isSafeInteger`; reject strings, booleans, null, fractions, infinities,
  NaN, negative zero, zero quantities/deltas and coercion. Receive/issue
  quantity is `1..1000000000`; delta is
  `-1000000000..1000000000` excluding zero. Expected item version is
  `0..2147483646`; no increment may overflow PostgreSQL Int. Check stored
  quantity/version invariants and compute next balance in exact integer
  arithmetic before writing. Result must be `0..1000000000`; reject an
  over-issue or overflow with no partial effects. Unknown/inherited members,
  accessors, arrays and missing required members fail strict own-data parsing.
  Numeric text inputs may parse a full decimal integer string for transport;
  server enforcement is authoritative. No decimal stock, measurement
  conversion, packs, monetary valuation or floating-point rounding.
- **API-005**: Success status 201 returns
  `{ apiVersion: "factory.generated.inventory-command-result/v1", item,
movement }`. Movement is immutable
  `{ id, stockItem, kind, delta, beforeQuantity, afterQuantity, itemVersion,
reason, correctionOf, actorRole, recordedAt, status: "recorded" }`.
  Timestamp is server UTC ISO text; actorRole is the resolved local demo role,
  not proof of a person's identity. Stockkeeper-only
  `GET /api/:itemEntity/:id/movements` accepts only `offset,limit` with the
  same bounds, orders itemVersion descending then ID descending and reads
  limit+1 rows. Response uses
  `factory.generated.inventory-history/v1` with
  `{ records, offset, limit, hasMore }`. No session IDs, key digests, receipts
  or private authentication inputs are exposed. Offset paging may shift when
  movements arrive; refresh is explicit, not a snapshot-history promise.
- **API-006**: Every mutation requires existing
  `x-factory-idempotency-key` matching `[A-Za-z0-9._:-]{1,128}`. Persist
  only its digest in `factory.generated.inventory-receipt/v1` storage. Scope
  by length-delimited Published checksum, server-resolved actor scope, role,
  entity, item ID or `$create`, and operation; hash canonical validated body.
  Authorize before receipt or record lookup. Identical replay returns original
  HTTP status and complete body after process restart, without duplicate
  stock, movement, audit or effects. Same key/body mismatch is 409
  `inventory.idempotency_conflict`. Revision-scoped receipts do not promise
  cross-revision exactly-once delivery.
- **API-007**: Within one serializable Prisma transaction: check receipt,
  load authorized item, validate current quantity/version and correction
  target, compare-and-swap expected version plus current quantity, increment
  version once, insert recorded movement, execute its declared core audit
  effect once and retain safe workflow evidence, save receipt. Published
  uniqueness `(stockItemId,itemVersion)` and the item-ID foreign key protect
  movement association; database checks enforce quantity/delta
  bounds and nonzero delta. Receipt uniqueness is `(scope,keyDigest)` and
  item SKU has a unique index. Name correction and item creation use the same
  atomic receipt/audit protection. No partial transaction or process-memory
  authority in actual generated apps. Bounded retry is three retries after
  the initial attempt for serialization/receipt races, then safe 409
  `inventory.retry_required`; distinguish SKU conflicts from receipt races.
  Same-key races converge on one committed receipt; different-key same-version
  writes yield exactly one success and one version conflict.
- **API-008**: Errors are bounded 400 `inventory.invalid_request`, 403
  `inventory.forbidden`, 404 `inventory.not_found`, 409
  `inventory.version_conflict`, `inventory.insufficient_stock`,
  `inventory.quantity_limit`, `inventory.sku_conflict`,
  `inventory.idempotency_conflict`, `inventory.retry_required`, or
  `inventory.version_limit`; unexpected errors are safe 500 with no SQL,
  request body, internals or credentials. Authorization precedes existence
  disclosure. A stockkeeper conflict may include current item balance/version
  for explicit refresh. Missing/cross-item correction links return a safe
  not-found result without exposing the other movement. Generic CRUD, generic
  event, audit and capability routes must not bypass these family guards.
  In particular no direct movement create/update/delete/submit route may
  commit an unbalanced ledger row or replay a recorded workflow transition.

### User journey, security and operational boundary

- **UXP-001**: Initial screen provides working search and an honest empty
  stockroom with `Add item`. Keeper adds a named SKU once, then receives stock;
  no technical key, Graph field, package, idempotency token or workflow setup
  appears in the product flow. Item detail shows available quantity and unit,
  a clear `Issue stock` action and authorized history. Desktop also offers
  `Receive stock`, `Adjust stock` and name correction. Mobile keeper receives
  the same valid actions without a dense management table becoming the only
  way to issue. Observer receives lookup/detail only.
- **UXP-002**: Corrections are visible additions, with reason, signed change,
  before/after quantity and linked original when supplied. The form previews
  the proposed result from the last fetched balance but never treats that
  preview as authority. On stale conflict, show current balance, preserve
  entered intent and require explicit review/resubmit with a new key/version;
  do not silently apply an old quantity. On uncertain network outcome, retry
  the exact body/key; receipt response precedes a fresh detail/history fetch.
- **UXP-003**: Compose loading, no stock, no results with clear search,
  validation, insufficient stock, permission denial, stale conflict, retry,
  pending and success states from existing patterns. Render business content
  as plain text. Accessible names, keyboard focus, 44 px touch targets,
  wrapped long names, labelled units and text accompanying signed/color
  changes are required. Inspect actual emitted 390/768/1440 layouts, declared
  dark mode and reduced motion. No photo is required for a stock quantity job;
  absent decorative assets cannot hide content/actions.
- **SEC-001**: Keep existing server-resolved local demo principal/session
  semantics, deny unknown roles and enforce policy before every list, detail,
  history, command, replay and audit read. Client role text is not a new
  authentication authority. Local demo role switching remains explicitly a
  prototype affordance; there is no private-user, multi-tenant or production
  authentication claim. One shared pool per generated local application is
  the scope, not a cross-tenant stock service. Security and PM retain current
  threat-model residual-risk ownership.
- **OPS-001**: No multi-location transfer, reservation, order fulfillment,
  barcode hardware, serial/batch/expiry tracking, purchasing, supplier records,
  valuation, payment, outbound notification, offline mutation/sync, external
  integration or production access is admitted. No new credential boundary.
  No raw model input, response, secret or sensitive request-body logging.
  Retained business reasons are product data; evidence uses synthetic reasons
  and safe summaries rather than private stockroom content.
- **OPS-002**: This experiment produces fresh isolated generated schemas;
  it migrates no existing application database. ADR-0075's Team Task compatible
  local rehearsal is not evidence for Inventory upgrades or cross-revision
  command retries. Keep Preview cleanup separate from durable product storage.
  Hosted release/environment selection and durable migration support remain
  separate accepted work. Do not advertise continuous hosted delivery from
  this local family acceptance.

## Proposed Graph numeric-witness amendment — 2026-09-24

- **AMN-001 — Status and changed authority**: **Proposed**; recommendation:
  **experiment** with an exact Inventory-only alternative to the persisted
  numeric seed witness. Keep all other accepted contracts in this ADR. The
  previous accepted ADR bytes have SHA-256
  `788b183d5d9a62439566b29a8824a085060f32b3abad59d04c99109ecbccfe24`
  and are preserved in commit `e97ad46d611f754c063820ba1aae353d84d601b9`.
  This amendment explicitly changes Graph V1 semantic admission, though not
  its serialized schema or version. It narrowly overrides ADR-0069 AUT-006's
  requirement for a usable persisted seed on the exact Inventory shape below;
  it does not silently reinterpret that rule as optional for other domains.
  The prior accepted FAM-005 empty-seed derivation is insufficient authority
  to change Graph semantics. PM must record separate acceptance of this new
  ADR hash and new Graph ownership through the same qualified independent
  standing-review gate before the paused source owner resumes. No external
  action, Product Publish, repository release or deployment is authorized.
- **AMN-002 — Observed failure and witness purpose**: In
  `packages/graph/src/model.ts`, `numericFieldDomainIssues` runs from both
  `parseApplicationGraph` and `validateApplicationGraph`. It validates each
  policy's mathematical/type domain, validates any supplied seeds, and then
  requires an actual satisfying seed per constrained field. Inventory with
  `domain.seedData: []` consequently reports five
  `domain.field.numeric_domain_witness_missing` issues during
  `applyGraphDiffToDraft`, before the compiler selector can run. ADR-0069
  AUT-006 deliberately uses real seed values for worker create/update probes;
  domain nonemptiness alone is not its operational verification guarantee.
  In Inventory, inserting a seed balance or draft movement to satisfy that
  guarantee would contradict the empty stockroom and immutable ledger. The
  replacement must therefore include actual command-based verification,
  not just suppress an error or pretend that test values are business seeds.
- **AMN-003 — One shared structural check**: Add browser-safe leaf module
  `packages/graph/src/inventory-operations-graph-witness.ts`. Move the full
  Inventory Graph-only structural check out of compiler-private
  `inventory-operations-contract.ts` into this one leaf; model semantics and
  compiler admission use the same implementation. It checks the complete
  FAM-002/003/004 shape: exactly the two business entities plus existing
  factory principal/session entities, exact fields/types/requiredness/domains,
  SKU uniqueness and indexes, both exact relations and reference coordinates,
  role order and grants including identity infrastructure, movement workflow
  and sole audit effect, exact non-selection integration declarations, three
  page blocks/routes and navigation, and own required empty `domain.seedData`.
  Extra/missing business or identity fields, numeric policies or calculations,
  widened roles, altered units/coordinates, extra flows/pages or other known
  Graph behavior cannot match. Safe labels, application/entity/actor/workflow/
  page identifiers and the already permitted experience data remain data;
  no title, family label, package presence or marker alone establishes a match.
- **AMN-004 — Root export and signature**: Authorize exactly two additive
  exports from the existing `@factory/graph` root via `src/index.ts`:
  value `matchInventoryOperationsGraphV1` and type
  `InventoryOperationsGraphWitnessV1`. The value signature is
  `(graph: ApplicationGraphV1) => InventoryOperationsGraphWitnessV1 | undefined`.
  It consumes an already schema-parsed Graph, returns `undefined` for a
  structural mismatch, and never mutates its input. Its detached deeply frozen
  readonly result contains exactly `apiVersion:
"factory.inventory-operations-graph-witness/v1"`, `itemEntity`,
  `movementEntity`, `workflow`, `roles: { stockkeeper, observer }`,
  `pages: { list, form, detail }`, and `numericFields`, a readonly array of
  readonly `{ entityKey, fieldKey }` pairs for the five coordinates in AMN-006,
  in that order. This computed witness is never serialized into a Graph, lock,
  request, provider schema or artifact as admission authority. No existing
  parse/validate/compiler signature gains a supplied witness, callback,
  skip-validation flag or seed exemption option. Existing compiler exports
  remain exactly the two in FAM-008; the Graph helper grants no compilation.
- **AMN-005 — Dependency and lifecycle separation**: The leaf uses only
  browser-safe local primitives and, if required, a type-only import from
  `model.ts`; no runtime import of `model.ts`, the Graph root, capabilities,
  adapters or compiler, and no Node API, filesystem, crypto, parser, semantic
  validator or hash invocation. This avoids a dependency cycle or recursive
  `model -> matcher -> parse/hash -> model`. `model.ts` imports the leaf
  directly. Compiler imports the matcher through `@factory/graph`, retaining
  its current own-JSON guard, lossless schema check, complete semantic
  validation, Published hash and separately resolved exact package lock with
  versions, manifest digests, dependency closure and bindings. Remove the
  duplicated Graph-shape predicate; do not substitute the new matcher for any
  of those independent authorities. Neither a returned witness nor Graph
  validity proves a valid lock. Package export-map keys, browser entrypoint
  exports, versions, dependencies and lockfiles stay unchanged; the Graph
  browser entrypoint can still transitively execute model validation without
  importing Node-only code.
- **AMN-006 — Exact exemption condition**: Inside the existing numeric issue
  calculation, compute the shared structural match from the schema-parsed
  Graph. Suppress only `numeric_domain_witness_missing`, and only for these
  five required integer fields of a successful match with own
  `domain.seedData` equal to an actual empty array:
  item `quantity` (`0..1000000000`); movement `delta`
  (`-1000000000..1000000000`), `beforeQuantity` and `afterQuantity`
  (`0..1000000000`), and `itemVersion` (`1..2147483647`), all inclusive and
  using the exact `factory.numeric-field-domain/v1` object. Run all existing
  numeric type/domain checks, supplied-seed checks and other semantic checks
  unchanged; never return early from numeric validation or filter unrelated
  errors. No omitted/undefined/null seeds, nonempty seeds, partial Inventory
  shape, sixth constrained field, different bound or other family receives
  this exemption. A seeded candidate may still satisfy the ordinary numeric
  rule if its seeds are valid, but must fail Inventory admission under FAM-007;
  the amendment does not globally prohibit otherwise valid seeded Graphs.
- **AMN-007 — Composition selections versus Published input**: During Draft
  derivation the Graph may contain own `integration.compositionSelections`;
  the immutable compiler-facing Published Graph instead omits that property
  and supplies its separate lock. The shared matcher treats this one declared
  property as optional composition metadata and compares all other integration
  members exactly. Its presence never supplies family authority or substitutes
  for a lock. Existing Graph schema/symbol validation still validates its shape
  and references; the accepted plan and composer still enforce exact six-lock
  selection, digests and bindings before the Draft mutation. This helper does
  not re-resolve packages in Graph or invent a second capability resolver.
  Compiler admission still requires the Published integration representation
  without composition selections and the separate exact digest-bound lock;
  embedded selections are not a Published bypass. Test both lifecycle forms
  against the same structural matcher. Do not rely on generic unknown-key
  stripping to grant compilation: existing Graph parsing behavior is preserved,
  while compiler own-JSON/lossless validation still rejects unknown input.
- **AMN-008 — Operational replacement for seed coverage**: A pure test tuple
  establishes the fixed domains' representable values: item quantity `0`,
  movement delta `1`, before `0`, after `1`, item version `1`. It is a
  mathematical/test witness only and must never enter `domain.seedData`,
  bootstrap or product records implicitly. The actual worker Inventory
  verification profile must first use the exact FAM-007/008 compiler selector
  and then create an item through the authorized API, verifying created item
  quantity `0` and version `0`. Receive one unit through the real movement
  command. Fresh reads must show the same item ID with quantity `1` and
  version `1`, and its movement with delta `1`, beforeQuantity `0`,
  afterQuantity `1`, itemVersion `1` and the same associated item ID. Verify
  the required fields, recorded status, audit effect and persisted history.
  Continue with the
  accepted issue/correction/retry/denial journeys. Test inputs are fixed,
  synthetic and confined to existing owned verification resources, not
  synthesized from arbitrary bounds or imported into ordinary product
  bootstrap. Generic numeric probes retain their seed requirements for other
  families. A helper test, absent probe or skipped suite cannot replace actual
  worker/API/PostgreSQL evidence, and new-family acceptance stays open until it
  exists. No general configurable witness generator is introduced.
- **AMN-009 — Alternatives and tradeoffs**: **Reject** removing the global
  seed requirement or allowing every mathematically valid empty domain: that
  widens ADR-0069 admission and leaves existing seed-driven verifier paths
  without executable inputs. **Reject** fake business seeds, stripping numeric
  policies, compiler-only bypasses, caller-controlled exemption flags and
  Graph imports of compiler/capability code. **Keep** all non-Inventory rules.
  The selected experiment introduces a small Graph-owned family semantic
  contract and two root exports to keep one exact check across layers; this
  is a maintenance commitment and explicit semantic change, not a schema-only
  fix. Positive consequence is honest empty business state with stronger
  end-to-end command evidence. Negative consequence is that a future change
  to this family shape must update the shared governed witness and its callers
  together, and Graph acceptance alone no longer demonstrates persisted seed
  coverage for these five fields. It still establishes the fixed representable
  domains; runtime enforcement and actual verification establish operations.
- **AMN-010 — Effects and ownership**: CUR-001/002 versions and serialization,
  all generated API/storage/UI contracts, catalog admission, licenses,
  supply-chain, credentials, tenant boundaries and local-only operability stay
  unchanged. PM extends the paused single contract owner's scope only after
  new exact-hash acceptance to Graph `src/model.ts`, new
  `src/inventory-operations-graph-witness.ts`, root `src/index.ts`, and focused
  Graph tests; the already assigned compiler contract consumes the helper and
  retains separate lock/hash checks. Add tests at
  `packages/graph/test/inventory-operations-graph-witness.test.ts` and
  `application-graph.test.ts`; existing composer/adapter/compiler tests cover
  actual lifecycle integration. Worker replacement probes remain the later
  assigned verifier slice in IMP-004, not concurrent implicit Graph ownership.
  This explicitly extends IMP-002's path boundary for semantic code; no Graph
  schema edit, package export-map change or change to another accepted family
  is authorized. The Tech Lead changes only this proposed ADR.
- **AMN-011 — Verification and evidence**: Start with the actual five-issue
  failure through `composeProductDraft -> applyGraphDiffToDraft`; preserve its
  failing result before the change. After acceptance, execute
  `pnpm --filter @factory/graph test -- inventory-operations-graph-witness.test.ts application-graph.test.ts application-graph-adapter.test.ts`,
  `pnpm --filter @factory/capabilities test -- inventory-operations-composition.test.ts product-composer.test.ts`,
  `pnpm --filter @factory/compiler test -- inventory-operations-contract.test.ts definition-data-compatibility.test.ts`,
  and the existing adapter Inventory/definition tests. Exercise every negative
  in AMN-003/006, required empty versus absent/null/nonempty seeds, altered
  SKU/movement indexes and relation targets, foreign seed entities, wrong
  bounds/type, extra fields/policies, forged roles/effects/pages, and the
  unchanged Approval/Appointment missing-witness and optional-null rules.
  For every nonmatching graph, the numeric issue result must equal its previous
  behavior; do not weaken existing assertions to make tests pass. Both
  parse/validate entrypoints and actual Draft/apply/Publish/JSON-round-trip/
  compiler paths must agree. Missing/wrong/stale separate locks and embedded
  selections must still fail compiler admission. Assert the built root
  exports/signature/readonly result, deep-freeze behavior, and browser import
  viability with no upward/runtime cycle. Build dependencies in order, run
  affected typechecks and `pnpm regression definitions`, and compare all nine
  captured historical inputs, hashes and generated files without refreshing
  expectations. Later run actual AMN-008 worker probes under existing owned
  runtime acceptance. Record exact hashes, commands, failures, review and phase
  distinctions in the existing Inventory acceptance/evidence paths and ledger;
  no implementation or runtime success is claimed by this amendment.
- **AMN-012 — Rollback and abort**: Before any new immutable Inventory
  publication, stop admission and revert only the amendment's helper, exports,
  call sites and tests together; do not touch other families or their fixtures.
  After immutable Inventory publication, retain the accepted semantic reader
  needed to inspect those artifacts and stop new admission/compilation rather
  than making historical Graphs unreadable. Never rewrite published bytes,
  remove user data or apply a database migration. Abort on a broader exemption,
  duplicate divergent structural predicates, any skipped domain/seed/type
  validation, a circular/upward dependency, lock bypass, old-nine output drift,
  persisted synthetic business seeds or inability to provide actual command
  verification. No irreversible step is introduced; an unresolved wider
  semantic change returns to a new decision, not an implementation exception.

## Alternatives and consequences

- **ALT-001**: **Keep only current packages**: rejected as the answer to this
  job. Cart reservation and ledger metadata do not implement standalone issue,
  receiving, correction or mobile stockroom use.
- **ALT-002**: **Bind fake orders/locations to the existing ledger**: rejected.
  It misstates the business model and carries Restaurant-specific obligations
  without actual need or corresponding experience.
- **ALT-003**: **Extract and migrate Restaurant into a universal inventory
  engine now**: deferred. It expands historical behavior risk, scope and proof
  cost. Keep its source unchanged; reuse first-party transaction semantics and
  shared protection fragments in the narrow new family. Future extraction
  requires evidence and a separately accepted migration decision.
- **ALT-004**: **General configurable warehouse/unit engine**: rejected for
  this experiment. Conversion, locations and valuations create material
  numeric, data and workflow choices that must not be selected by inference.
- **POS-001**: One real family closes an ordinary stockroom job with explicit
  units, persistent correction and authoritative quantities while reusing the
  accepted stack and strict definition pipeline.
- **POS-002**: Additive profile admission and new-app-only schemas make the
  experiment reversible without altering historical outputs or user data.
- **NEG-001**: Fixed whole-item units and a shared pool exclude genuine
  inventory domains. Unsupported requests must be surfaced and assessed, not
  counted as delivered definitions. This is a deliberate bounded experiment,
  not a claim of a complete warehouse product.
- **NEG-002**: New profile-specific transaction, movement storage and
  presentation code incur maintenance and real database/browser testing.
  Referencing Restaurant semantics is not source extraction; record actual
  handwritten changes and reuse in acceptance, without calling this data-only.

## Implementation boundaries, migration and rollback

- **IMP-001**: PM waits for Directory completion, then records exact accepted
  ADR/source identity, the nine-existing-definition immutable projection and
  full-bundle baseline, contract owner, versioned shapes, errors, actor
  semantics, compatibility rule, artifact paths and `frozen` status in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  The proposer writes only this ADR. No implementation or tests are executed
  or claimed by this proposal.
- **IMP-002**: Serialized contract/admission slice owns adapter
  `definition-family-registry.ts`, definition data/catalogue integration,
  `packages/capabilities/src/product-composer.ts`, compiler-private
  `inventory-operations-contract.ts`, root exports and their focused tests.
  Fail-first tests cover the complete witness, numeric gate, reference mapping,
  unique-field/index projection, empty seeds, audit declaration and own-JSON
  persistence. No package manifest/lock, commerce asset, Graph schema,
  Restaurant runtime or historical fixture mutation is authorized.
- **IMP-003**: Serialized runtime slice owns new
  `packages/compiler/src/inventory-operations-runtime.ts`, fresh profile-only
  Prisma schema/migration/receipt emission and narrow `src/index.ts` seams:
  `generateApplicationBundle`, `renderApplicationRuntime`,
  `renderPrismaRecordStore`, `renderApiMain`, `renderWebProxyRoute`.
  Generic paths must be blocked where this witness applies. Database schema,
  generated templates and mutation protection remain single-owner integration.
- **IMP-004**: Once the contract is frozen, presentation may own only new
  `inventory-operations-presentation.ts` and its tests; worker verification
  may own `apps/compiler-worker/src/verifier/verification-graph-plan.ts`,
  `verification-profiles.ts`, `role-journey.ts`, `probes.ts` and their tests.
  Root alone integrates common compiler facades/style/page wiring. Parallel
  writers require ledger-assigned disjoint paths; shared-contract changes
  stop the wave. Strongest assigned owner handles balance/lifecycle/security;
  bounded UI/test details follow the repository's model dispatch policy.
- **IMP-005**: One acceptance owner adds `e2e/inventory-operations.spec.ts`,
  a derived definition-case binding and evidence, reusing the current local
  acceptance harness. Root controls exact fixture resource creation, lifecycle
  execution, cleanup and delivery. No independent deployment harness or
  per-definition approval process is introduced.
- **MIG-001**: Migration is additive source/data registration and fresh
  generated schemas only. There is no destructive migration, conversion,
  dual write, data deletion or irreversible action. Never apply this schema
  to Restaurant, Directory, prior definitions or a durable user database.
- **ROL-001**: Disable new admission and revert only Inventory additions
  through normal reviewed delivery. Preserve immutable Published inputs,
  Compilations, accepted fixtures, evidence and application data. Only root
  may clean explicitly owned synthetic resources; rollback does not authorize
  volume deletion or user-record removal.
- **ABT-001**: Stop on old-nine output drift, negative/overflow balance,
  lost/duplicate movement, non-atomic receipt/audit, forged-role/history leak,
  generic mutation bypass, mutable compiler input, unsupported family fallback,
  secret/raw-model exposure, package/profile change, real identity claim or
  need for live-data migration. Missing exact semantic fit or a material
  product choice requires revised governance; no founder acceptance by silence.

## Verification and evidence gate

- **VER-001**: Before implementation, capture the completed Directory plus
  existing eight definitions as immutable Published Graph + separate lock
  inputs and complete generated file hashes. Preserve prior fixture bytes;
  add the ninth baseline from the accepted pre-Inventory source, never by
  refreshing expected output after modifications. Every historical file,
  projection, lock and bundle hash must remain identical, including Restaurant.
- **VER-002**: Proposed focused commands after tests exist:
  `pnpm --filter @factory/adapters test -- inventory-operations-definition.test.ts product-definition-data.test.ts`;
  `pnpm --filter @factory/capabilities test -- inventory-operations-composition.test.ts`;
  `pnpm --filter @factory/compiler test -- inventory-operations-contract.test.ts inventory-operations-runtime.test.ts inventory-operations-presentation.test.ts definition-data-compatibility.test.ts`;
  `pnpm --filter @factory/compiler-worker test -- verification-graph-plan.test.ts`.
  Exercise wrong/missing/stale locks and digests, owner bindings, extra grants,
  numeric domain widening, missing/nonempty seeds, missing/wrong SKU uniqueness
  and movement indexes, reference renaming or wrong relation targets,
  absent/extra audit effects, forged system fields, plain/null-prototype round
  trips, hostile own-property shapes, HTML text, generic route bypass and
  actual root selector use. These are planned suites, not present test results.
- **VER-003**: On an explicitly root-owned loopback PostgreSQL fixture, run
  proposed `pnpm --filter @factory/compiler exec vitest run test/inventory-operations-postgres.test.ts`
  with `FACTORY_INVENTORY_PG_ENV_FILE` naming an ignored local environment file.
  The test must validate loopback/owned database and work-directory identity,
  use the actual emitted schema/runtime and report skip distinctly from pass.
  Prove same-key and same-version races, two issues racing for the last units,
  upper/lower bounds, SKU race, authorized restart replay, role/history denial,
  and injected movement/audit/receipt failure rolling back every effect.
  Check zero-to-receive-to-issue-to-adjust balances and signed history sum;
  corrections and metadata updates retain IDs and original history. No mocked
  store is accepted as transactional evidence.
- **VER-004**: Build changed dependencies in order, then run affected package
  typecheck/lint, `pnpm regression definitions`,
  `node scripts/definition-case-index.mjs --check`, and
  `pnpm exec playwright test e2e/inventory-operations.spec.ts` under the
  existing root-owned local acceptance configuration. Use a real persisted
  Draft -> Publish -> Compilation -> generated PostgreSQL-backed API and web;
  inspect actual worker probes and fail compilation promptly on terminal
  failure. Fixture route selection alone is not family acceptance.
- **VER-005**: First assert the actual generated stockroom and movement store
  are empty, with Published `domain.seedData: []` and no bootstrap fallback.
  The journey then creates two different SKUs; receives 10 units
  on one; finds it on mobile; issues 3; desktop records a reasoned adjustment
  of -1 linked to a prior movement; fresh detail/history show 6 and retain all
  three movements. Correct the same item's name; reload both surfaces and
  restart the API while retaining PostgreSQL; replay an original key and
  assert the original response with no new movement. Verify the second SKU
  remains unchanged. Over-issue, stale issue, duplicate/replayed request,
  observer mutation/history denial, no results and recovery must be visible
  and leave correct persistent state. A process restart is not a database
  restart; report only what was actually tested.
- **VER-006**: Record source/ADR/Published/Compilation identities, semantic
  assertions, generated hashes, command results, actual 390/768/1440 images,
  core write/audit counts, measured ready/first-action time, reused asset keys,
  handwritten changes, limitation assessment and exact cleanup proof in
  `docs/acceptance/inventory-operations.md` and
  `docs/acceptance/evidence/inventory-operations/`, linked from the active PM
  ledger. Preserve failed attempts. One ordinary independent task review and
  relevant functional/visual evidence close the slice; no gate per viewport
  or definition. Unit success does not claim ordinary-user or hosted success.
- **VER-007**: Prepared-local useful-app target is five minutes with no
  technical handoff or manual rescue, measured rather than assumed. Consented
  ordinary-user sessions and real-model requirement retention are separate
  evidence when available. Count one family/definition only after its actual
  journey and recovery close; assess the next briefs without inventing
  accepted products or broadening the arithmetic contract.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`.
- **REF-002**: `docs/adr/adr-0074-content-directory-family.md`,
  `docs/adr/adr-0075-local-durable-delivery-rehearsal.md`, and their exact
  acceptance records in the active consumer delivery ledger.
- **REF-003**: `docs/superpowers/plans/2026-09-24-family-expansion-and-delivery.md`;
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **REF-004**: Source paths in CTX/REU/IMP above; Graph
  `product-blueprint.ts` and `numeric-field-domain.ts`; compiler
  `content-directory-contract.ts`; worker
  `verifier/verification-graph-plan.ts`.

No material product decision is delegated to an implementer: the proposed
unit, pool, role, arithmetic, correction and delivery limits are explicit.
Whether this bounded experiment is accepted remains the independent decision
gate. If a concrete requested stockroom cannot fit these limits, do not admit
it under this family or treat that mismatch as a routine implementation choice.
