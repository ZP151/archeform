---
title: "ADR-0045: Restaurant Menu Parameter Binding"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags: ["architecture", "decision", "restaurant", "parameters", "compiler"]
supersedes: ""
superseded_by: ""
---

# ADR-0045: Restaurant Menu Parameter Binding

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This proposal grants no implementation, Product Publish, repository release,
provider call, cloud action, or deployment authority. Founder acceptance,
directly or through the standing independent-review policy in
`docs/tech-governance.md`, and a PM-recorded assignment must come first. D1.9
cannot start until the accepted D1.8 name-binding slice is delivered.

## Recommendation

**Migrate** the requirement-to-Graph contract with one versioned Restaurant
menu parameter record. A complete supplied USD menu becomes validated business
data, is persisted with an authoritative checksum, and is atomically applied
to the Restaurant Draft during the existing product-apply transaction. The
resulting Graph seed and its scenario mirror are the source of truth consumed
by Publish and Compilation; no downstream component parses the raw brief.

Persist the request's parameter presence separately as nullable
`businessParametersProvided`. For newly created Restaurant reviews, `false`
means the property was omitted and the stored canonical-default parameters were
inferred; `true` means the caller explicitly supplied a valid parameter object.
This bit is part of the idempotency identity even when an explicit
canonical-default object has the same parameter checksum as an omitted value.

Support one to one hundred supplied items. This capacity comes from the
existing generated runtime's maximum array length of 100, not from an invented
two-item product rule. Keep currency fixed to the accepted USD profile. An
explicit non-USD requirement remains clarification or fails closed; it is not
silently relabeled as USD.

## Context

- **CTX-001**: The canonical Restaurant Graph already models menu-item name,
  description, decimal price, availability, stock, preparation time, image URL,
  and category relation. Customer, cart, checkout, order, and merchant update
  paths already consume runtime catalog records by ID.
- **CTX-002**: `normalizeAllowedRestaurantValues` currently permits only the
  canonical two item IDs and normalizes one editable item name before comparing
  the canonical Graph hash. `restaurantRuntimeCatalog` independently requires
  those same two IDs. This is a compiler admission limit, not a runtime CRUD or
  user requirement.
- **CTX-003**: Generated runtime catalog reads and updates any existing item,
  and its state validator already caps arrays at 100. It has PATCH for an
  existing menu item but no runtime create/delete endpoint. D1.9 therefore
  configures the initial menu; it does not claim post-generation item creation
  or deletion.
- **CTX-004**: The current interpretation envelope has no structured data
  carrier. Workbench sends only RequirementSpec, ProductBlueprint, and a name;
  `CompositionReview` has no business-parameter field. Free-text title,
  outcome, constraints, and raw-brief reparsing are not valid substitutes.
- **CTX-005**: The default seed includes pizza-specific option records. A
  provided menu cannot retain those records against unrelated items without a
  false or dangling relationship. Options need their own future parameter
  contract.
- **CTX-006**: Two nullable parameter/checksum columns cannot preserve the
  distinction required by request idempotency: an omitted Restaurant property
  and an explicitly supplied canonical-default object canonicalize to identical
  bytes and checksum. Existing `CompositionReview` fields describe other
  contracts and cannot safely carry this presence state.

## Current and Proposed Golden Profiles

### Current accepted profile

- **CUR-001**: Node `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, and tracked `node:22-alpine` images.
- **CUR-002**: Next.js `15.5.22`, React/React DOM `19.2.8`, Puck `0.22.3`,
  XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, PostgreSQL `16`,
  BullMQ `5.81.2`, Redis `7`, and Docker Compose.
- **CUR-003**: Implemented Graph serialization remains
  `factory.application-graph/v1`; Restaurant composes and publishes V3 Graphs,
  then plans `factory.restaurant-product-plan/v1` from an immutable Published
  Graph. Draft -> Published -> Compilation remains unchanged.
- **CUR-004**: `RequirementInterpretationV1` contains only the existing spec,
  blueprint, and clarifications. Restaurant definition selection contains no
  structured menu. `CompositionReview` persists no parameter/checksum pair.
- **CUR-005**: Restaurant compilation admits the canonical two menu records in
  order, with only the existing narrow allowed-value edits. Runtime manager
  catalog behavior updates existing records only.

### Proposed profile

- **PRO-001**: Keep **CUR-001** through **CUR-003** and all manifests,
  dependencies, images, services, ports, providers, queues, authentication,
  and deployment topology unchanged. Add no package or external asset.
- **PRO-002**: Add this exact shared contract, owned by
  `@factory/capabilities`:

  ```ts
  type RestaurantMenuParametersV1 = {
    apiVersion: "factory.restaurant-menu-parameters/v1";
    mode: "canonical-default" | "provided";
    currency: "USD";
    items: readonly {
      name: string;
      description: string | null;
      priceMinor: number;
    }[];
  };
  ```

- **PRO-003**: Canonicalize strings to Unicode NFC and require trimmed safe
  business text: name length 1..120; non-null description length 1..1000.
  Require `priceMinor` to be a JSON integer from 0 through 10,000,000. Preserve
  item order and permit duplicate display names because display text is not
  record identity. Reject unknown keys, accessors, non-plain values, sparse
  arrays, non-finite numbers, and unsafe material.
- **PRO-004**: `canonical-default` requires zero items and applies the current
  two-item sample unchanged. `provided` requires 1..100 complete items. An
  omitted menu becomes `canonical-default` without a question. A supplied item
  missing a name or price is one consolidated material `data` clarification;
  it never receives an invented price. A null description receives the exact
  visible default `Description not provided.` without a question.
- **PRO-005**: Fixed noncritical provided-item defaults are category `mains`,
  available `true`, stock `100`, preparation time `15` minutes, and image URL
  sentinel `#`. The generated customer target renders the existing local
  utensils icon for that sentinel and issues no image request. Explicit stock,
  availability, preparation, image, category, option, tax, service-charge, or
  currency requirements remain unsupported clarification rather than being
  discarded.
- **PRO-006**: The interpreter result becomes an exact versioned
  `factory.requirement-interpretation-result/v1` object containing the existing
  `RequirementInterpretationV1` plus
  `businessParameters: RestaurantMenuParametersV1 | null`. Restaurant results
  always carry a complete parameter value once all material questions close;
  non-Restaurant results carry null. The prior-result clarification request
  carries the same validated wrapper so complete menu data survives unrelated
  questions without raw response persistence.
- **PRO-007**: Add optional `businessParameters` to the existing Product
  requirement DTO. For Restaurant requests, omission is valid and resolves to
  the canonical-default value; an explicitly present `null` is invalid rather
  than being coerced to omission. An explicitly present valid canonical-default
  or provided object remains explicit. For non-Restaurant requests, omission or
  explicit `null` is the same permitted null semantic value; a non-null object
  is rejected.
- **PRO-008**: Add nullable `businessParameters Json?`,
  `businessParametersChecksum String?`, and
  `businessParametersProvided Boolean?` columns to `CompositionReview`. New
  Restaurant rows always persist parsed canonical parameters, their `sha256:`
  canonical-JSON digest, and `false` for an omitted property or `true` for an
  explicitly supplied valid object. New non-Restaurant rows persist null in all
  three columns. Persist no raw brief or provider material, and do not reuse a
  requirement, blueprint, clarification, or lifecycle field for presence.
- **PRO-009**: Request idempotency binds parameter presence and checksum with
  requirement, blueprint, and application name. For a new Restaurant row,
  replay matches only when both the incoming property presence and recomputed
  canonical parameter checksum match the stored Boolean and checksum. Thus an
  omitted property conflicts with an explicit canonical-default object despite
  identical parameter bytes. A legacy Restaurant row whose three fields are
  null reconciles only with an omitted property, interpreted in memory as the
  canonical default; an explicit object conflicts because original presence
  cannot be proven. Non-Restaurant omission and explicit null reconcile as the
  same null value. The same request ID with any other difference returns the
  current bounded conflict and cannot overwrite the first request.
- **PRO-010**: Before Restaurant replay or apply, validate the persisted state
  as one of: legacy `(null, null, null)`; inferred
  `(canonical-default object, matching checksum, false)`; or explicit
  `(valid canonical-default or provided object, matching checksum, true)`.
  Any half-populated triple, any non-null Boolean with a missing parameter or
  checksum, `false` with noncanonical parameters, invalid object, or checksum
  mismatch is corrupt and fails closed before a Draft/review transition.
  Non-Restaurant rows require `(null, null, null)`. Application code creates no
  new legacy Restaurant triples after the migration lands.
- **PRO-011**: During the existing serializable Restaurant apply transaction,
  reparse the stored record, recompute its checksum, and bind before creating
  the Draft revision. A legacy null triple supplies canonical-default parameters
  in memory without mutating or backfilling the row. For provided mode, replace
  canonical menu-item seeds with IDs `menu-item-001` through
  `menu-item-100` derived solely from array ordinal, never from model text. Set
  each `categoryKey` to `mains`; remove the canonical `menu-option-group` and
  `menu-option` seed records. Rebuild the single `fine-dining-service` records
  in the identical order and with values equal to `domain.seedData`. Preserve
  every entity definition, page, binding, role, permission, flow, journey,
  location, table, and unrelated seed byte.
- **PRO-012**: Expand Restaurant compiler admission to two modes: the existing
  canonical/default seed form, or 1..100 contiguous ordinal item IDs with no
  option seed records. Validate exact item keys, category references, values,
  price conversion, mirror equality, unique IDs, and absence of dangling
  option references. Normalize only this validated menu region back to the
  canonical region for the existing canonical-contract comparison. Graph hash,
  composition lock, Published identity, and plan bytes still cover the actual
  customized Graph.
- **PRO-013**: Relax `restaurantRuntimeCatalog` from the exact two IDs to the
  union of the unchanged canonical/default two-ID set and the validated 1..100
  contiguous ordinal set. Convert `priceMinor / 100` into Graph decimal during
  binding and back to exact integer minor units during runtime generation.
  Generated catalog, customer menu/detail/cart/order, and merchant list/PATCH
  paths continue using those IDs and prices without new APIs.

The current accepted profile remains distinct. The proposed business contract,
database fields, and expanded compiler admission do not exist until this ADR is
accepted and implemented.

## Contract, Catalog, Security, and Operability

- **CON-001**: `packages/capabilities/src/restaurant/menu-parameters.ts` is the
  frozen contract owner for parsing, canonicalization, checksum, defaults, and
  Graph binding. `factory.restaurant-menu-parameters/v1` is additive; existing
  RequirementSpec, ProductBlueprint, Graph, Restaurant plan, runtime API, and
  generated state schema identifiers do not change. Control Plane owns the
  persistence-only `businessParametersProvided` tri-state; it is not exposed to
  the provider, browser, Graph, generated runtime, or public response.
- **CON-002**: The interpretation response wrapper and Product request DTO are
  coordinated shared API changes. Workbench, adapter, and Control Plane must
  migrate together. Generated templates, compiler admission, Prisma migration,
  and E2E remain serialized integration work; the contract is not frozen for
  parallel frontend/backend writers.
- **CON-003**: Catalog impact is zero. No capability, profile recipe, screen
  recipe, UI registry key/digest, role, permission, action port, or asset is
  added. The existing target-local Lucide utensil icon supplies the no-photo
  placeholder.
- **SEC-001**: The provider supplies only bounded names, descriptions, integer
  prices, and order. It cannot supply IDs, Graph paths, code, HTML, URLs,
  options, authorities, packages, credentials, or deployment choices.
- **SEC-002**: Control Plane validates again before persistence and apply.
  Generated JavaScript uses data serialization; customer and merchant HTML use
  existing escaping/sanitization. Parameter and Graph checksums expose drift
  without logging raw provider material.
- **SEC-003**: Existing customer read/cart/order permissions and manager update
  authorization remain unchanged. D1.9 does not add runtime create/delete,
  weaken field authority, or grant the interpreter a Graph mutation path.
- **OPS-001**: One additive migration containing three nullable columns is
  required, with no default or backfill. No process, port,
  service, queue, network request, startup entry, Compose topology, or cleanup
  duty changes. Up to 100 catalog records stay inside the existing bounded
  runtime state envelope.

## Consequences

- **POS-001**: A normal user can name and price a useful initial menu in the
  same requirement flow, without technical IDs or a second editing workflow.
- **POS-002**: Persisted parameter checksum, atomic binding, Graph mirror, hash,
  and lock make the path deterministic and reviewable.
- **NEG-001**: The shared interpretation/API/persistence path and compiler
  admission become more complex and require one serialized cross-package wave.
- **NEG-002**: USD, one category, generated stock/preparation defaults, and no
  supplied options remain visible limitations. Runtime item creation/deletion
  also remains unavailable.
- **NEG-003**: A parameterized Published Graph will not compile on a pre-D1.9
  compiler. Rollback must retain the new compiler or publish a new canonical
  default Draft; immutable historical revisions are never rewritten.

## Alternatives Considered

- **ALT-001 — Reuse two named slots**: rejected because the two-ID guard is an
  implementation restriction and would impose an arbitrary product limit.
- **ALT-002 — Encode JSON in title, outcome, or constraints**: rejected because
  free text is not a versioned business-data contract and would corrupt the
  meaning of existing public fields.
- **ALT-003 — Reparse the raw brief in Control Plane/compiler**: rejected
  because raw prompts are transient and untrusted, downstream parsing is
  nondeterministic, and compilers consume Published Graphs only.
- **ALT-004 — Add runtime menu create/delete first**: deferred because initial
  generation already serves the user outcome and new runtime CRUD needs its own
  authorization, idempotency, UI, and regression contract.
- **ALT-005 — Support arbitrary currency now**: deferred because current
  Restaurant compiler authority rejects location-currency variation. D1.9 uses
  explicit USD minor units and refuses conflicting currency requirements.
- **ALT-006 — Infer presence from the two parameter columns**: rejected because
  omitted and explicit canonical-default inputs produce identical objects and
  checksums, so replay could not enforce the accepted idempotency contract.
- **ALT-007 — Store presence in an existing review field**: rejected because
  requirement, blueprint, clarification, status, and lifecycle fields already
  have independent stable meanings. Overloading one would create an implicit
  compatibility contract and corrupt review semantics.
- **ALT-008 — Treat explicit Restaurant null as omission**: rejected because it
  erases caller intent and makes presence-sensitive replay ambiguous. Explicit
  null remains invalid for Restaurant while non-Restaurant null remains its
  existing permitted semantic value.

## Migration, Rollback, and Ownership

- **MIG-001**: After acceptance, one integration owner first lands the contract
  and focused tests in `packages/capabilities/src/restaurant/menu-parameters.ts`
  plus its public export. The same serialized wave updates adapter result and
  selection parsing, Workbench interpretation/journey/client DTOs, Control
  Plane composition service/tests, Prisma schema and one additive migration,
  Restaurant compiler contract/runtime/customer targets, and focused tests.
- **MIG-002**: The additive Prisma migration creates the three nullable columns
  together with no database default or data update. Existing rows remain
  `(null, null, null)`. On read, an existing Restaurant triple-null row means a
  legacy omitted canonical default; a non-Restaurant triple-null row remains no
  business parameters. New Restaurant requests persist a complete triple with
  `false` for omission or `true` for an explicit valid object. New
  non-Restaurant requests persist a null triple. No Graph or existing row is
  backfilled.
- **MIG-003**: Root owns provider-free `e2e/restaurant-orders.spec.ts`, the
  D1.8 `e2e/restaurant-business-binding.spec.ts` regression update, new
  provider-driven `e2e/restaurant-menu-binding.spec.ts`, and PM documents.
  No product writer owns those paths.
- **ROL-001**: Before any release, revert the full serialized wave and leave the
  three nullable columns dormant; a later separately reviewed cleanup migration
  may drop them. No destructive rollback is required.
- **ROL-002**: If a parameterized Graph was already published locally, retain
  the D1.9 compiler or create and publish a new canonical-default Draft before
  reverting. Never mutate or delete the immutable Published revision.
- **ABT-001**: Abort on non-atomic apply, checksum mismatch acceptance,
  unbounded items, model-selected IDs/paths, raw-brief parsing or persistence,
  silent non-USD conversion, dangling option records, permission drift,
  generated external requests, new package, or mutable Draft compilation.
- **ABT-002**: Abort if any implementation needs new Graph fields, catalog
  entries, runtime create/delete, options, multiple categories, inventory
  semantics, tax, payments, or deployment. Those require separate decisions.
  There are no irreversible steps in this proposal.

## Measurable Verification

- **VER-001**: Contract tests cover exact keys/version, NFC/trim/text limits,
  modes, 0/1/3/100/101 items, integer price bounds, description default,
  ordinal IDs, USD, sparse/accessor/prototype/unknown-key refusal, deterministic
  hash, seed/scenario equality, option-seed removal, and preservation of every
  unrelated Graph path.
- **VER-002**: Adapter tests prove omitted menu -> canonical default, complete
  one/three-item known outputs -> provided parameters, incomplete price -> one
  data question, explicit non-USD or unsupported menu detail -> clarification,
  prior-result preservation, and fail-closed invalid output. Mocks do not prove
  live semantic extraction.
- **VER-003**: Control Plane tests prove the exact new-row triples for omitted
  Restaurant (`object/checksum/false`), explicit canonical-default and provided
  Restaurant (`object/checksum/true`), and non-Restaurant
  (`null/null/null`). Tests reject explicit Restaurant null and non-null
  non-Restaurant parameters, while non-Restaurant omission and explicit null
  reconcile.
- **VER-004**: Replay tests prove omitted-to-omitted and explicit-to-identical
  retries reconcile; omitted versus explicit canonical-default conflicts even
  when checksums match; changed explicit menu conflicts; and legacy Restaurant
  triple-null reconciles only with omission. Corruption tests reject every
  half-populated triple, a missing value with either Boolean, `false` with
  noncanonical parameters, invalid stored parameters, checksum mismatch, and a
  non-Restaurant non-null triple. Every refusal leaves Draft and review state
  unchanged.
- **VER-005**: Compiler tests accept valid 1/3/100-item Published Graphs and
  reject zero/101, gaps/duplicates/reordering, unsafe fields, malformed prices,
  wrong category, mismatched mirror, dangling options, unrelated Graph drift,
  stale Graph hash, or stale composition lock. Runtime tests exercise a third
  item through catalog, cart, checkout, order, and authorized merchant PATCH.
- **VER-006**: Target/browser tests show supplied names and exact USD prices on
  customer and merchant surfaces, use the local placeholder without network or
  broken images, preserve escaping, and complete the existing order journey.
  Default mode must retain the existing sample menu byte-for-byte.
- **VER-007**: Run focused capabilities, adapters, Workbench, Control Plane,
  Prisma, and compiler tests/typechecks, then
  `node scripts/regression.mjs product`. Record commands, exits, durations, and
  counts in the active consumer-delivery ledger. Because this is a serialized
  shared API, Prisma, and compiler-contract change, run the applicable
  `docs/delivery-policy.md` sequence once: task review, independent QA,
  release review, then PM acceptance. Each gate consumes the same focused
  contract, migration, regression, and E2E evidence; do not duplicate cosmetic
  audits or repeat passing lanes without a relevant change.
- **VER-008**: Run provider-free `e2e/restaurant-orders.spec.ts` with one worker
  and zero retries for 1/3/100 item boundaries and runnable third-item ordering.
  Update the D1.8 business-binding negative so it no longer asserts that every
  detailed menu is unsupported.
- **VER-009**: Run provider-driven `e2e/restaurant-menu-binding.spec.ts` with
  fixture mode off, one worker, and zero retries. One authored three-item USD
  case must prove interpretation result -> persisted checksum -> Draft/Published
  Graph seed and mirror -> Compilation -> customer/merchant menu -> completed
  order at the supplied price. One distinct non-USD case must remain
  clarification or fail closed and create no claimed application.
- **VER-010**: Reuse current successful coarse-default, D1.8 display-name, and
  D1.7 live-payment evidence when their concrete instructions are unchanged.
  Run fresh provider cases only for relevant changed semantics; never repeat an
  unchanged call to turn a failed result into a pass. Evidence records only
  safe status/count/boolean/identifier/timing values and exact cleanup.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, ADR-0040, and ADR-0044.
- **REF-002**: `packages/capabilities/src/index.ts` and
  `packages/capabilities/src/restaurant/product-graph.ts`.
- **REF-003**: `packages/compiler/src/targets/restaurant-v3/contracts.ts`,
  `runtime-api.ts`, `customer-target.ts`, and `merchant-target.ts`.
- **REF-004**: `apps/control-plane/src/composition/product-composition.service.ts`
  and `apps/control-plane/prisma/schema.prisma`.
- **REF-005**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
