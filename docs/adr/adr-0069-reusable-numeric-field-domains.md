---
title: "ADR-0069: Reusable Numeric Field Domains"
status: "Proposed"
date: "2026-09-17"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "graph",
    "numeric-validation",
    "compiler",
    "approval",
    "generated-ui",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0069: Reusable Numeric Field Domains

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **migrate** future eligible V1 Approval definitions to an
optional, explicitly versioned numeric-domain policy and a conditional generated
Approval presentation profile. Keep the accepted Golden technology profile,
outer Product Blueprint V1 and Application Graph V1 discriminators, all existing
field behavior when the policy is absent, and every historical Published Graph
and Compilation byte. The first intended use is a required Training fee greater
than zero. Currency does not acquire a default lower bound.

This proposal is not accepted and authorizes no implementation, Product Publish,
Compilation, provider call, deployment, external resource, Git action or release.
The founder must explicitly accept or reject the exact proposed ADR. PM then
records the decision and creates bounded implementation work. The proposing Tech
Lead cannot accept, implement or deploy it.

## Context

- **CTX-001 — Capability gap**: Product Blueprint V1 expresses `number` and
  `currency`; Application Graph V1 expresses `integer` and `decimal`. Both can
  require a value, but neither can express an executable lower or upper bound.
  The generated Approval API currently rejects non-finite decimals and
  non-safe-integer integers, yet accepts zero and negative currency values.
- **CTX-002 — Product trigger**: Training Funding requires course identity,
  session date, justification, a required fee greater than zero and the generic
  return/correct/resubmit/decision workflow. Treating every currency as positive
  would silently change existing Expense and Purchase semantics. A field-specific
  policy is therefore required before Training can be admitted.
- **CTX-003 — Current path**: A reviewed
  `factory.product-definition-data/v1` record contains Product Blueprint V1.
  The Approval family composer maps Blueprint `number` to Graph V1 `integer` and
  `currency` to Graph V1 `decimal`, derives seed data, and produces a V1 draft.
  Publish validates and hashes that Graph. The compiler consumes only that
  immutable Published Graph, emits the generic Approval application, and the
  generated server validates create/update mutations. Submit currently validates
  workflow state but does not revalidate the complete stored business record.
- **CTX-004 — Conversion boundary**: Graph V2 and V3 are separate strict schemas.
  V3 is selected only by the Restaurant capability and retains V2 semantics.
  The current V1-to-V2 adapter copies the V1 domain object and validates it as
  V2. Silently dropping a future V1 numeric policy would make a constraint
  appear accepted while producing an unconstrained target.
- **CTX-005 — Presentation gap**: The current generic Approval record identity
  profile selects a unique required short string as title and only enum fields as
  compact summaries. Training has a suitable course identity but its meaningful
  fee and session date would appear only in Details. Inventing a category enum
  solely to satisfy that profile would corrupt the product model.
- **CTX-006 — Compatibility evidence**: The checked-in five-definition baseline
  at `packages/compiler/test/fixtures/five-definition-baseline.json` has SHA-256
  `421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5` and
  freezes each canonical definition, provider schema projection and ordered whole
  generated bundle. Numeric-domain absence must preserve that fixture exactly.
- **CTX-007 — Governance trigger**: This change affects stable Blueprint/Graph
  serialization, provider schemas, compiler output and a frontend/backend
  validation contract. AGENTS.md and `docs/tech-governance.md` require a proposed
  ADR before implementation. `docs/threat-model.md` requires untrusted input to
  fail closed and historical Published bytes and hashes to remain immutable.

## Current accepted and proposed profiles

- **CUR-001 — Current accepted Golden technology profile**: Node
  `>=22.11.0 <23`, root package manager `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React and React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`, Prisma
  and `@prisma/client` `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved
  `5.81.2`, compiler-worker ioredis `^5.4.2` resolved `5.11.1`, PostgreSQL
  `16-alpine`, Redis `7-alpine`, and Dockerfiles on floating-major
  `node:22-alpine`. Manifests, `pnpm-lock.yaml`, Dockerfiles and Compose remain
  executable authorities. The lifecycle remains mutable Draft -> immutable
  Published Graph -> immutable Compilation.
- **CUR-002 — Current contract profile**: Reviewed definitions use
  `factory.product-definition-data/v1`, Product Blueprint V1 and the fixed
  family contracts. Generic Approval is compiled from
  `factory.application-graph/v1` and uses
  `factory.generated.approval-mutation/v1`. Eligible generic identity output
  uses `approval-workspace-presentation@2.2.0`,
  `approval-record-identity/v1`, `approval-decision-history@1.1.0`,
  `approval-presentation-components@1.1.0` and
  `approval-visual-assets@1.1.0`.
- **PRO-001 — Proposed additive contract profile**: Keep every CUR-001 runtime,
  package and image coordinate. Extend the strict Product Blueprint V1 field
  schema and the Application Graph V1 domain-field parser with one optional
  property, `numericDomain`, whose nested `apiVersion` is
  `factory.numeric-field-domain/v1`. Keep Graph V1's existing Zod behavior of
  stripping unrelated unknown outer and field keys. Only `numericDomain` and
  its `minimum`/`maximum` objects are new strict closed-key objects. Propagate
  the policy only for Blueprint `number` and `currency` fields compiled by the
  exact V1 Approval family.
- **PRO-002 — Proposed conditional generated profile**: A numeric-enabled
  eligible Approval bundle uses `approval-workspace-presentation@2.3.0`,
  `approval-record-identity/v2`, and a private emitted marker
  `factory.generated.approval-numeric-domain/v1`. It retains
  `factory.generated.approval-mutation/v1`,
  `approval-decision-history@1.1.0`,
  `approval-presentation-components@1.1.0` and
  `approval-visual-assets@1.1.0`. The route shapes, mutation response shapes,
  component registry, visual assets and CSS remain unchanged.
- **PRO-003 — Profile separation**: PRO-001 and PRO-002 are proposed and are not
  the accepted Golden profile. They select only when the policy is present and
  passes the structural gates below. An absent property emits the exact CUR-002
  path without a new key, helper, comment, whitespace or serialized `undefined`.

## Decision

### Versioned numeric-domain primitive

- **NUM-001 — Exact shape**: Admit only this strict nested object:

  ```ts
  type NumericFieldDomainV1 = {
    apiVersion: "factory.numeric-field-domain/v1";
    minimum?: { value: number; inclusive: boolean };
    maximum?: { value: number; inclusive: boolean };
  };
  ```

  At least one of `minimum` or `maximum` is required. Extra keys, missing
  `inclusive`, non-number values, `NaN`, positive or negative infinity, and
  values outside the supported field representation fail validation. JSON
  cannot encode non-finite numbers; in-memory inputs must still reject them
  explicitly.

- **NUM-002 — Field compatibility**: In Product Blueprint V1 the property is
  legal only on `number` and `currency`. In Graph V1 it is legal only on
  `integer` and `decimal`. It is forbidden on every other type. A policy-bearing
  Blueprint `number` or Graph `integer` bound must be an integer in PostgreSQL
  `INTEGER`/Prisma `Int` range `-2147483648` through `2147483647`, inclusive.
  Policy-bearing integer seed, request and persisted values use the same Int32
  range. Decimal bounds must be finite JavaScript numbers supported by the
  existing Graph/compiler numeric boundary.
- **NUM-003 — Range semantics**: A value satisfies a minimum when it is greater
  than the boundary, or equal when `inclusive` is true. Maximum is symmetric.
  When both bounds exist, ordering must leave a mathematically non-empty
  interval. Integer validation also accounts for discreteness: for example
  `(0, 1)` is empty, while `(0, 1]` admits `1`. Decimal equal bounds are admitted
  only when both ends are inclusive. Empty or inverted ranges fail
  definition/Graph validation; AUT-006 separately proves an operational value.
- **NUM-004 — Existing integer semantics**: Integer-only behavior derives from
  the existing mapping `number` -> `integer`; the policy adds no redundant
  `integer` flag. A required positive integer uses minimum `0`, inclusive
  `false`. A required positive decimal uses the same policy. A non-negative
  field uses minimum `0`, inclusive `true`.
- **NUM-005 — Absence means legacy behavior**: No policy means exactly the
  existing finite/safe-integer checks. There is no implicit minimum, maximum or
  positivity by numeric type, label, field key, product key, currency display,
  provider prose or family. Existing currency fields continue allowing zero and
  negative values unless a future reviewed definition carries an explicit
  policy. Unconstrained Graph integers retain the current JavaScript safe-integer
  API behavior, including its existing wider-than-Int32 edge; this ADR does not
  change legacy bytes or behavior while closing that mismatch for new
  policy-bearing fields.
- **NUM-006 — Training use**: A future reviewed Training fee may declare
  `numericDomain: { apiVersion: "factory.numeric-field-domain/v1", minimum:
{ value: 0, inclusive: false } }`. This ADR does not admit Training, calculate
  a total, define currency codes, create payment/budget/inventory behavior or
  decide Equipment arithmetic.

### Authoring, conversion and provider boundaries

- **AUT-001 — Canonical authoring**: The reviewed definition is the source of
  the policy. Canonical serialization includes `numericDomain` only when present
  and preserves field declaration order. Definition-family semantic
  fingerprints include the complete policy so definitions that differ only by
  bounds cannot collide or be treated as equivalent.
- **AUT-002 — Provider schema protection**: Strict provider JSON schemas and
  local model-field schemas mirror the exact nested discriminator, type gates,
  finite values and closed keys. Guidance says to emit a domain only when the
  requirement explicitly states the bound and never infer positivity from
  `currency`. Registered-definition selection returns only a catalogue choice;
  it cannot rewrite the reviewed policy. The generic Graph-diff provider path
  remains closed to this property until a separately reviewed authoring contract
  supports it.
- **AUT-003 — V1 composition**: The Approval composer copies a present policy
  without changing boundary values while mapping `number` to `integer` and
  `currency` to `decimal`. It validates the resulting Graph and all seed values
  against requiredness, primitive numeric type, finite/safe-integer rules and
  bounds before Publish.
- **AUT-004 — Unsupported targets fail closed**: The numeric policy is initially
  approved only for the exact `approval-correction/v1` composer and V1 Approval
  compiler target. A task, restaurant, unknown family or compiler target that
  encounters it returns a deterministic unsupported-capability error. It must
  never remove, ignore or downgrade the policy.
- **AUT-005 — Graph conversion boundary**: Application Graph V2 and V3 schemas,
  versions and semantics do not change under this ADR. A V1 Graph containing
  `numericDomain` cannot be upgraded by the current V1-to-V2 adapter and must
  fail closed with an explicit unsupported numeric-domain conversion error. A
  V1 Graph without it converts byte-for-byte as before. A later need in V2/V3
  requires a separate versioned decision; no Graph V4 is justified here.
- **AUT-006 — Deterministic verification witness**: Product Blueprint V1 has no
  author-supplied seed field. Keep the Approval composer's current deterministic
  values: `12` for Blueprint `number` and `125.5` for `currency`. Composition
  validates that fixed value against the new domain and Int32/finite rules and
  fails deterministically when it is not a witness. This intentionally limits
  the first profile to domains containing the existing fixed seed; positive
  Training fee and positive-integer domains are supported. Do not add a Blueprint
  seed property or invent an epsilon, midpoint or policy-specific witness.
  Separately, an explicitly authored V1 Graph may supply its own satisfying
  `seedData` value. The compiler worker uses the validated composed or explicit
  seed value for its create/update verification request. A constrained Graph
  without a usable witness fails before artifact acceptance. None of these rules
  apply when `numericDomain` is absent.

### Runtime validation and persistence

- **VAL-001 — Untrusted mutation input**: Create and update accept numeric
  values only as JSON number primitives. They reject strings including trimmed
  or whitespace forms, booleans, arrays, objects, `null` for required fields,
  non-finite in-memory values, unsafe integers, fractions for integer fields and
  values outside the declared domain. A policy-bearing integer additionally
  rejects values outside Int32 even when they are JavaScript safe integers.
  There is no `Number(value)` or equivalent coercion at the API boundary. Errors
  use the existing bounded field-error envelope and safe field label; they do not
  echo raw values.
- **VAL-002 — Complete-record submit check**: Before every submit or resubmit
  transition, the generated server loads the authoritative record and validates
  every required and numeric-domain field as a complete record. A partial update
  cannot preserve an invalid legacy/tampered value and then submit it. Retry and
  idempotency paths repeat or replay the same authoritative validation result;
  they cannot bypass it.
- **VAL-003 — Trusted persistence normalization**: Prisma may return an `Int` as
  a number and a `Decimal` as a Prisma Decimal/string-like serialized value.
  The generated store boundary may deliberately normalize those trusted read
  representations using a strict canonical decimal grammar and an explicit
  finite/range check. It rejects leading/trailing whitespace, empty strings,
  booleans, nulls and malformed/non-finite spellings. Create/update validate the
  trusted value returned by the persistence write before their transaction can
  succeed, so the domain holds for the stored representation as well as the
  request. Submit/resubmit validate the fresh trusted read. This adapter is
  separate from VAL-001 and is never applied to request payloads.
- **VAL-004 — Database behavior**: Keep existing Prisma `Int`/`Decimal` columns,
  SQL schema and migrations. Generated PostgreSQL uses `INTEGER` for Graph
  integer and unqualified `DECIMAL` for Graph decimal; it declares no decimal
  scale that would round a small positive request to zero. This ADR adds no
  `@db.Decimal(p,s)`, minor-unit inference, arbitrary-precision API, database
  `CHECK`, trigger, column or row rewrite. A future storage target that applies
  scale/rounding must stop rather than claim this profile. Generated API and
  post-write/read validation are authoritative for ordinary writes. A privileged
  direct database mutation remains outside that boundary; if it creates an
  invalid value, submit/resubmit fails safely until an authorized correction
  supplies a valid value.
- **VAL-005 — Concurrent correction**: Existing optimistic version checks,
  authorization, state transition, transaction, idempotency and decision-event
  rules stay decisive. Domain validation happens after authentication and
  authorization and before persistence or transition; it does not reveal record
  existence or values to an unauthorized actor.

### Generated form and primary-screen semantics

- **UIX-001 — Input control**: The existing generated numeric control receives
  conditional `min`/`max` attributes for inclusive boundaries and keeps `step=1`
  for integer and `step=any` for decimal. For an exclusive integer boundary,
  use the next or previous Int32 value as the native limit when representable.
  For an exclusive decimal boundary, use the boundary as a browser hint and
  enforce strict exclusion in shared client validation. The server remains
  authoritative in all cases.
- **UIX-002 — Feedback**: Client submission rejects blank required values,
  malformed numbers, non-finite values, fractional integers and failed bounds
  before `fetch`, with a field-labelled message that states greater-than,
  at-least, less-than or at-most semantics. The same domain descriptor drives
  client and generated server code; it is not reconstructed from HTML
  attributes or labels.
- **UIX-003 — Numeric-enabled identity eligibility**: Begin only after the exact
  Approval selector and existing generic identity rule prove one unique required
  short-string business title. Excluding system fields and status, require
  exactly one numeric business field carrying a valid `numericDomain` and
  exactly one required `date` or `datetime` business field. Ambiguous or missing
  candidates fail numeric-enabled presentation compilation; they do not select
  arbitrary fields or silently fall back to a summary that hides the policy.
- **UIX-004 — Shared structural summary**: `approval-record-identity/v2`
  deterministically emits the constrained numeric field first and required
  temporal field second as `summaryFieldKeys`. Record cards and matched Decision
  history consume the same immutable projection and existing safe label/value
  formatter. For Training this yields course identity as title, fee and session
  date as visible summaries, plus the existing status badge and actions.
- **UIX-005 — No invented product semantics**: The selector cannot inspect a
  Training/product/entity/field key, label, raw value or provider prose. It adds
  no enum, currency symbol, formatting locale, calculation, component, registry
  entry, visual asset or CSS. Justification and remaining fields stay in the
  existing Details disclosure. If several numeric or required temporal fields
  are meaningful, the definition needs an explicit future presentation contract
  rather than declaration-order guessing.
- **UIX-006 — Conditional bytes**: Runtime field metadata, validation helpers,
  private markers and identity v2 source are emitted only for a policy-bearing
  eligible Approval Graph. Every unconstrained bundle uses the current literal
  strings, ordering and source fragments. Conditional branching may occur while
  assembling source, but cannot alter old output through global formatting.

## Compatibility, catalog, security and operability effects

- **API-001 — Outer versions**: Product Blueprint remains V1 and Application
  Graph remains `factory.application-graph/v1` because the optional nested
  object is absence-preserving and self-versioned. Generated HTTP route, request,
  response, error and event envelopes remain V1. This deliberate additive
  evolution keeps the existing Graph V1 unknown-key stripping behavior. The
  recognized nested policy objects are strict, and in-repository schemas and
  compiler targets are updated atomically after acceptance.
- **API-002 — Historical immutability**: Existing Published JSON bytes, hashes,
  locks, queued Compilation inputs and generated artifact hashes are never
  rewritten. Republishing an unchanged unconstrained definition produces the
  same canonical Graph and generated bundle. A policy-bearing definition creates
  new Published and Compilation identities through the normal lifecycle.
- **CAT-001 — Catalog impact**: Acceptance adds no product definition, family,
  capability, package, provider, UI primitive, component, screen recipe, visual
  asset or source-study entry. The nested public contract and compiler-private
  profile identifiers are recorded in the existing contract documentation.
  Training enters the product-definition catalogue only through later PM-owned
  work after all business and presentation acceptance gates pass.
- **LIC-001 — Supply chain**: No dependency, package version, lockfile, base
  image, copied source, font, icon, raster byte, license or notice changes.
- **SEC-001 — Boundary safety**: Provider output, definition data, Graph JSON,
  browser input and direct HTTP input remain untrusted. Strict Blueprint and
  provider schemas reject unknown policy keys; Graph V1 deliberately retains
  its established stripping of unrelated unknown outer/field keys while the
  recognized `numericDomain`, `minimum` and `maximum` objects reject unknown
  nested keys and malformed values. Only a validated immutable Published Graph
  selects emitted validation code. Browser checks improve feedback and never
  grant authority.
- **SEC-002 — Data handling**: Validation errors and evidence contain safe
  authored field labels and bounded codes, not raw values, prompts, provider
  responses, credentials or tenant data. Existing tenant/role/state enforcement
  and content escaping remain unchanged.
- **OPS-001 — Operability**: Compose topology, services, queues, ports,
  readiness, cleanup and persistence remain unchanged. Definition/Graph errors
  fail before Publish; unsupported target errors fail before artifact emission;
  API domain errors are deterministic client errors and are not retried as
  infrastructure failures. Existing structured request correlation remains.

## Consequences

### Positive

- **POS-001**: Training can express fee greater than zero as reviewed data and
  enforce it consistently at authoring, seed, compile, create, update and
  submit/resubmit boundaries.
- **POS-002**: The same primitive supports bounded decimal and integer fields
  without product branches and without conflating currency with positivity.
- **POS-003**: A structurally eligible numeric Approval makes its constrained
  amount and required date visible beside business identity, status and actions
  without a fake enum or new UI asset.
- **POS-004**: Nested versioning and absence-preserving emission protect the
  original five bundles and historical immutable artifacts.

### Negative

- **NEG-001**: Product Blueprint V1 and Graph V1 gain an optional property in
  place; every in-repository schema consumer must update atomically even though
  the outer discriminator is unchanged. Graph V1's established unknown-key
  stripping must remain separately regression-tested.
- **NEG-002**: V1 Graphs with numeric domains cannot use V2/V3 conversion until
  a later explicit contract decision. This is a visible fail-closed limitation.
- **NEG-003**: Validation exists at several boundaries and needs shared semantic
  fixtures to prevent drift. PostgreSQL does not independently enforce the
  bounds against privileged direct writes.
- **NEG-004**: The numeric-enabled summary deliberately supports only one
  constrained numeric field and one required temporal field. More complex
  Approval layouts remain unadmitted.
- **NEG-005**: JavaScript-number bounds do not introduce arbitrary precision or
  currency minor-unit scale. Products needing those semantics require another
  decision.
- **NEG-006**: The initial Product Blueprint composer accepts only numeric
  domains containing its existing deterministic seed (`12` or `125.5`). Domains
  outside those witnesses require a later explicit seed-authoring decision even
  when the interval itself is otherwise valid.

## Alternatives considered

### Keep required and finite checks only

- **ALT-001 — Description**: Accept any finite fee and rely on author guidance.
- **ALT-002 — Rejection reason**: Zero and negative fees remain valid through
  the generated API, so the Training requirement is unenforced.

### Make every currency positive

- **ALT-003 — Description**: Add an implicit `> 0` rule to the currency type.
- **ALT-004 — Rejection reason**: This changes existing fields, prevents valid
  credit/refund-like values and breaks absence-preserving compatibility.

### Add only `minimum: number`

- **ALT-005 — Description**: Treat all bounds as inclusive and encode positive
  fee with the smallest positive decimal.
- **ALT-006 — Rejection reason**: JavaScript has no business-safe universal
  smallest decimal, and integer/decimal exclusivity would be inconsistent.

### Add integer flags, multiple-of, precision and scale

- **ALT-007 — Description**: Create a broad JSON-Schema-like numeric vocabulary.
- **ALT-008 — Rejection reason**: Existing field types already distinguish
  integer/decimal. Precision, scale and multiples are not required for Training
  and would enlarge database, provider and UI decisions without evidence.

### Introduce Product Blueprint V2 and Application Graph V4

- **ALT-009 — Description**: Put the optional policy behind new outer contract
  versions and upgrade every family and compiler target.
- **ALT-010 — Rejection reason**: It creates conversion and migration surface
  across unrelated Task and Restaurant paths for one absence-preserving nested
  capability. The nested discriminator provides an explicit future extension
  point while unsupported strict targets fail closed.

### Enforce bounds with database checks

- **ALT-011 — Description**: Generate per-field SQL `CHECK` constraints.
- **ALT-012 — Rejection reason**: It adds migration ordering and direct schema
  coupling for a reversible generated-runtime capability. Complete-record submit
  validation closes the ordinary lifecycle gap without a database migration.

### Add Training-specific code or an artificial category

- **ALT-013 — Description**: Branch on Training/fee/session keys or add an enum
  so the existing summary profile displays something.
- **ALT-014 — Rejection reason**: Either choice makes catalogue growth require
  product code or distorts the business model. Structural v2 eligibility is
  reusable and fails on ambiguity.

## Ownership and implementation boundary

- **OWN-001 — Contract owner**: The Graph/platform owner owns
  `factory.numeric-field-domain/v1`, its Product Blueprint/Graph validation,
  canonical serialization and conversion failure semantics. The compiler owner
  owns generated server enforcement and the conditional presentation profile.
  Control-plane lifecycle behavior remains owned by the lifecycle owner.
- **OWN-002 — Frozen status**: This proposed document is not an implementation
  contract until founder acceptance. After acceptance, the exact NUM/AUT/VAL/UIX
  rules are frozen enough to split focused Graph/provider-schema work from
  compiler runtime/UI work only when PM assigns disjoint paths. Any discriminator,
  shape, validation-order, profile-version or conversion-boundary change stops
  that parallel wave and returns to Tech Lead review.
- **OWN-003 — Serialized integration**: Product composer propagation, generated
  templates, shared API contracts, complete bundle fixtures, compiler-worker
  verification and end-to-end smoke tests remain serialized integration work.
  Training catalogue admission starts only after the integrated capability is
  accepted; it cannot be used as the contract definition itself.

## Migration, rollback and abort criteria

- **MIG-001 — Stage 1, contract**: After founder acceptance, add the optional
  nested schema and semantic validation in Product Blueprint V1 and Graph V1;
  mirror it in canonical definition/provider schema projections and fingerprint
  logic. Add negative fixtures before allowing composition.
- **MIG-002 — Stage 2, propagation**: Propagate the policy through only the V1
  Approval composer, validate seed data, and make unsupported families, compiler
  targets and V1-to-V2 conversion fail with stable errors.
- **MIG-003 — Stage 3, generated runtime**: Conditionally emit the descriptor,
  create/update/full-submit validation, trusted Prisma read normalization and
  client constraints. Then enable the structural identity v2 profile and its
  shared fee/date list/history projection.
- **MIG-004 — Stage 4, admission**: Prove old-bundle byte equality and new-domain
  evidence before PM may create separate Training definition work. Training is
  not part of this migration and remains blocked if any required journey is
  missing.
- **ROL-001 — Rollback**: Before any policy-bearing Product Publish, revert the
  conditional implementation and fixtures; unconstrained bytes remain unchanged.
  After such a Publish, never rewrite or delete its bytes. Roll back by stopping
  new policy authoring/compilation while retaining the accepted reader and
  validator for the immutable historical artifact.
- **ABT-001 — Abort**: Stop rollout on any change to the five-definition baseline
  hash, any accepted `numericDomain` that a target drops or ignores, provider
  inference of currency positivity, browser/server semantic disagreement,
  submit bypass, unauthorized information disclosure, non-deterministic bundle
  output, or a need for a database/Graph V2/V3 migration outside this ADR.

## Exact prospective impact paths

- **IMP-001 — Graph and adapters**: `packages/graph/src/product-blueprint.ts`,
  `packages/graph/src/model.ts`, Graph exports and focused schema/semantic tests;
  `packages/adapters/src/requirements/product-definition-data.ts`,
  `packages/adapters/src/requirements/definition-family-registry.ts`,
  `packages/adapters/src/requirements/openai-interpreter.ts` and their focused
  tests.
- **IMP-002 — Composition**: `packages/capabilities/src/product-composer.ts` and
  Approval composition/seed tests. V2/V3 schema files remain unchanged; the
  existing V1-to-V2 adapter gains only the explicit rejection and its test.
- **IMP-003 — Compiler**: `packages/compiler/src/index.ts`,
  `packages/compiler/src/approval-mutation-contract.ts`,
  `packages/compiler/src/approval-workspace-presentation.ts` and focused
  compiler/generated-runtime tests. Reuse existing Decision history,
  presentation-component and asset sources.
- **IMP-004 — Verification/integration**:
  `apps/compiler-worker/src/verifier/verification-graph-plan.ts`, verifier tests,
  `packages/compiler/test/fixtures/five-definition-baseline.json`, existing
  product-definition contract tests and the generic Approval browser helper.
  No Prisma schema, SQL migration, Compose, package, lockfile, catalogue or asset
  path is changed by the capability implementation.

## Measurable verification plan

- **VER-001 — Schema matrix**: Focused tests accept inclusive/exclusive min/max,
  one-sided and two-sided domains on the correct numeric types. They reject extra
  keys inside `numericDomain` or its bound objects, no bounds, inverted/empty
  intervals, fractional/out-of-Int32 policy integer bounds, wrong field types,
  `NaN`/infinities in memory and malformed provider JSON. A legacy V1 Graph with
  no policy and unrelated unknown outer/field keys must still parse by stripping
  those keys exactly as the current Zod object parser does.
- **VER-002 — Semantics matrix**: For integer and decimal fields, exercise below,
  equal and above each boundary; zero, negative, positive and fractional values;
  inclusive/exclusive pairs; optional null and required null. Demonstrate that
  a policy-bearing integer accepts Int32 endpoints when its bound permits and
  rejects `-2147483649`, `2147483648` and `3000000000`. Demonstrate separately
  that an unconstrained currency still accepts a finite negative value and an
  unconstrained legacy integer retains its existing safe-integer behavior.
- **VER-003 — API matrix**: Against generated InMemory and Prisma-backed stores,
  create/update reject string, whitespace, boolean, null, object, non-finite,
  fractional, out-of-Int32 policy integer and out-of-domain request values.
  Validate the Prisma value returned after each write and prove unqualified
  PostgreSQL `DECIMAL` preserves a supported small positive policy value without
  rounding it to zero. Submit/resubmit reject a complete stored invalid record,
  including a deliberately tampered Decimal string, and accept a corrected valid
  one. Prove retry/idempotency and optimistic concurrency cannot bypass
  validation.
- **VER-004 — UI matrix**: Browser evidence proves native attributes, exclusive
  boundary feedback, no request on client-invalid input, authoritative server
  error handling, correction and resubmission. The Training fixture shows course
  identity, fee, session date, status and the correct action without opening
  Details; list and matched history use the same two summary fields.
- **VER-005 — Determinism and compatibility**: Two independent compilations of
  one policy-bearing Published Graph produce identical ordered files and hashes.
  The five-definition baseline remains byte-identical with SHA-256
  `421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5`.
  Historical Published JSON/hash fixtures and current unconstrained mutation,
  presentation and decision-history markers remain exact. The absence-policy
  regression also pins Graph V1 unknown-key stripping; only unknown keys inside
  a recognized numeric-domain object produce a closed-schema error.
- **VER-006 — Fail-closed targets**: Tests prove constrained V1-to-V2 conversion,
  V2/V3/Restaurant compilation, Task composition and unknown targets fail with
  stable safe errors, while unconstrained conversion remains unchanged.
- **VER-007 — Executable required gates**: After implementation and before
  Training admission, run these commands from the repository root. The browser
  command runs only under PM-authorized local runtime ownership after the shared
  fixture includes Training.

  ```text
  pnpm --filter @factory/graph test -- product-blueprint.test.ts application-graph.test.ts application-graph-adapter.test.ts
  pnpm --filter @factory/adapters test -- product-definition-data.test.ts requirement-interpreter.test.ts provider-contract.test.ts
  pnpm --filter @factory/capabilities test -- product-composer.test.ts
  pnpm --filter @factory/compiler test -- approval-correction-runtime.test.ts generic-approval-identity.test.ts definition-data-compatibility.test.ts database-target-parity.test.ts
  pnpm --filter @factory/compiler-worker test -- verification-graph-plan.test.ts
  pnpm --filter @factory/graph --filter @factory/adapters --filter @factory/capabilities --filter @factory/compiler --filter @factory/compiler-worker typecheck
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  pnpm exec playwright test e2e/approval-definition-batch.spec.ts
  node -e "const c=require('node:crypto'),f=require('node:fs');console.log(c.createHash('sha256').update(f.readFileSync('packages/compiler/test/fixtures/five-definition-baseline.json')).digest('hex'))"
  ```

- **VER-008 — Evidence locations**: PM records acceptance, ownership, exact
  source/fixture hashes, command results, review verdict and cleanup in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`. Store
  bounded capability evidence under
  `docs/acceptance/evidence/numeric-field-domains/`; store the later actual
  Training business/browser evidence under
  `docs/acceptance/evidence/consumer-training-funding/`. Evidence excludes
  credentials, raw provider prompts/responses and tenant record payloads.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md` and
  `docs/threat-model.md`.
- **REF-002**: `docs/product-definition-authoring.md` and
  `docs/superpowers/plans/2026-09-13-product-definition-scale.md`.
- **REF-003**: ADR-0010 (Application Graph V1 compatibility), ADR-0048
  (versioned product-definition data), ADR-0065 (Publication definition) and
  ADR-0066 (generic Approval record identity and summary).
- **REF-004**: `packages/compiler/test/fixtures/five-definition-baseline.json`.
