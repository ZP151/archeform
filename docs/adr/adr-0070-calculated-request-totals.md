---
title: "ADR-0070: Calculated Request Totals"
status: "Proposed"
date: "2026-09-17"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "decision", "graph", "calculation", "approval", "compiler"]
supersedes: ""
superseded_by: ""
---

# ADR-0070: Calculated Request Totals

## Status and recommendation

**Proposed.** Recommendation: **migrate** future eligible Approval definitions
to an optional versioned quantity-times-unit-price calculation, with exact
decimal arithmetic and a conditional read-only total presentation. Keep the
accepted technology profile, existing numeric-domain semantics, six delivered
definitions, and immutable historical artifacts unchanged.

This proposal grants no implementation, Product Publish, Compilation, provider
call, paid resource, deployment, cloud action, Git mutation or release authority.
PM must record separate founder acceptance or the standing policy's independent
read-only review of the exact ADR SHA-256, reviewer identity,
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 0/0, evidence and authorization
before assigning implementation. The proposer cannot supply that review.

## Context and source evidence

- **CTX-001**: At base `436484fc71f63adf11e8f48938bc5983ac42ca41`, six local
  definitions and three families are accepted. The roadmap keeps Equipment
  pending until quantity, unit price, derived total, correction and presentation
  are executable. Equipment cannot count merely by renaming Purchase Request.
- **CTX-002**: ADR-0069 is accepted through the PM ledger although its original
  proposal retains Proposed front matter. `numeric-field-domain.ts` supplies
  field-specific bounds; `approval-numeric-domain.ts` requires exactly one
  constrained numeric field and one required temporal field. That selector
  cannot present the proposed three-field arithmetic contract.
- **CTX-003**: `approval-mutation-contract.ts` already validates primitive
  request numbers, uses the transactional receipt/version protection, and
  validates trusted records after writes and before submit. Its trusted Decimal
  helper compares bounds exactly before converting to Number; that conversion
  does not prove arithmetic equality or lossless decimal representation.
- **CTX-004**: The Approval composer uses fixed witnesses `12` and `125.5`.
  The compiler worker independently picks numeric witnesses per field and sends
  required fields in create bodies. A derived required total must instead be
  omitted from requests, and operands must come from one coherent seed row.
- **CTX-005**: The Purchase definition has a caller-entered amount, category,
  needed-by date, item, supplier and justification. It has no quantity-times-cost
  invariant. A new Equipment job is distinct only if its total is derived from
  editable quantity/cost and preserved through the real correction journey.
- **CTX-006**: Read authorities are `AGENTS.md`, the complete current
  `docs/tech-governance.md`, `docs/threat-model.md`, `docs/delivery-policy.md`,
  ADR-0069 and the product-definition scale roadmap. This is a stable
  Graph/Blueprint, compiler-template and server authority contract trigger.

## Current and proposed profiles

- **CUR-001**: Keep Node `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/React DOM
  `^19.0.0` resolved `19.2.8`, Puck `^0.22.3` resolved `0.22.3`, XYFlow
  `^12.3.6` resolved `12.11.2`, NestJS `^10.4.15` resolved `10.4.22`,
  Prisma/client `^6.1.0` resolved `6.19.3`, BullMQ `^5.34.10` resolved
  `5.81.2`, ioredis `^5.4.2` resolved `5.11.1`, and the floating-major
  `node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine` images. Tracked
  manifests, `pnpm-lock.yaml`, Dockerfiles and Compose govern these coordinates.
  No dependency, supported range, database type, schema default or topology
  changes are proposed.
- **CUR-002**: Keep outer `factory.product-definition-data/v1`,
  `factory.product-blueprint/v1`, `factory.application-graph/v1`, the fixed
  Approval family binding, and `factory.generated.approval-mutation/v1` HTTP
  envelopes. Keep `factory.numeric-field-domain/v1` unchanged. V2/V3 and
  Restaurant semantics remain separate. Draft -> Publish -> immutable
  Compilation remains decisive; compilation never reads a mutable Draft.
- **PRO-001**: Recognize optional field property `calculation` with strict
  nested version `factory.quantity-unit-price-total/v1`. An eligible calculated
  Approval emits `factory.generated.approval-calculated-total/v1`,
  `approval-workspace-presentation@2.4.0` and `approval-record-identity/v3`.
  It retains `approval-decision-history@1.1.0`,
  `approval-presentation-components@1.1.0`, `approval-visual-assets@1.1.0`
  and the current numeric-domain marker. These are compiler-private conditional
  profiles, not new shared UI registry assets or package versions.
- **PRO-002**: Absence of `calculation` selects the current exact output path,
  including Training's presentation 2.3.0 and identity v2. No added metadata,
  helper, comment, whitespace or default is emitted in the six old bundles.
  In-repository consumers update atomically after acceptance; old binaries that
  strip a newly recognized V1 property are not approved readers for this profile.

## Decision

### Closed calculation and authoring contract

- **CAL-001**: The only admitted shape is:

  ```ts
  type QuantityUnitPriceTotalV1 = {
    apiVersion: "factory.quantity-unit-price-total/v1";
    quantityFieldKey: string; // existing graphFieldKeySchema
    unitPriceFieldKey: string; // existing graphFieldKeySchema
  };
  ```

  Place it on the output field, whose key is thereby the total destination.
  All three fields belong to the same entity and have distinct keys. Reject
  extra nested keys, unsupported versions, missing references, self references,
  cycles, chained calculations, literal operands, paths, functions and code.
  There is no expression string, operator registry or evaluation language.

- **CAL-002**: Quantity is required Blueprint `number` / Graph `integer`;
  unit price and output are required Blueprint `currency` / Graph `decimal`.
  Both operands carry valid explicit numeric domains; the output carries no
  numeric domain, options, reference, uniqueness or independent input/default.
  Operands cannot themselves be calculated. System/status/version fields and
  relation foreign keys cannot participate. The first supported profile has
  exactly one calculation in the primary Approval entity and no calculations
  or numeric domains in its secondary identity entity. Other numeric business
  fields in the primary entity are unsupported in this first profile.
- **CAL-003**: Bounds remain declarations, not consequences of a field name or
  `currency` type. The primitive imposes no hidden positive/nonnegative policy.
  The PM-owned product design explicitly scopes the Equipment admission to
  positive integer quantity and positive estimated unit price (each minimum
  zero, exclusive). Zero-cost/free-equipment demands require material selection
  clarification; that product-specific supported scope is not a global default
  of the primitive. No unresolved unit-cost choice is delegated to an engineer.
- **CAL-004**: Blueprint remains strict. Graph V1 retains existing stripping of
  unrelated unknown outer/field keys, but a recognized malformed `calculation`
  fails and its nested object is strict. Validate cross-field semantics in both
  Blueprint and Graph, not only in the compiler. Canonical serialization
  includes the property only when present, preserving field order. Definition
  semantic fingerprints include its version and operand relationships with the
  existing role/entity/field-slot normalization; renamed equivalent calculations
  remain duplicates, while caller-entered amount and derived amount differ.
- **CAL-005**: Strict provider field schemas use their existing null-for-absent
  optional convention for `calculation`; only currency variants can carry the
  closed object, and local cross-reference validation repeats CAL-001/002.
  Normalize null to absence before Blueprint serialization. Guidance emits a
  calculation only for explicitly requested quantity-times-unit-price semantics,
  never inferred from `total`, money labels or product names. Registered
  definition selection chooses reviewed data and cannot rewrite its rule.
  Existing per-definition provider-guide projections remain byte-identical.
- **CAL-006**: The trusted composer copies the descriptor and numeric domains
  verbatim into V1 Graph fields. Only the existing exact Approval correction
  family and its complete V1 compile pipeline support it. Task, Restaurant,
  unknown families/targets and unsupported structural Approval profiles fail
  with bounded unsupported-capability errors before artifact acceptance. The
  ordinary generated database/API/frontend subtargets of that complete pipeline
  are allowed; an alternative target may not silently drop the property.
  V1-to-V2 conversion explicitly rejects calculated fields. V2/V3 schemas stay
  unchanged. The untrusted AI Graph-diff authoring path rejects this property;
  trusted composer-generated Graph diffs alone may carry the validated rule.

### Exact decimal and unit semantics

- **DEC-001**: Untrusted create/update operands are finite JSON number
  primitives only. Quantity additionally satisfies Int32 and its explicit
  domain. Reject strings, whitespace, booleans, arrays, objects, required null,
  non-finite in-memory values and fractions for quantity. Numeric wire semantics
  start at the decoded number's canonical `String(number)` decimal spelling;
  the API does not recover precision already lost when a client encoded JSON.
  Normalize negative zero to zero. This is unchanged request representation.
- **DEC-002**: Compute the exact finite base-10 product of the canonical operand
  spellings. A first-party bounded coefficient/exponent helper using built-in
  BigInt performs integer coefficient multiplication and decimal exponent
  adjustment; it does not multiply JavaScript Numbers or depend on a Decimal
  library's implicit precision setting. Normalize zero, signs and trailing
  coefficient zeros. Support scientific notation without expanding unbounded
  zero strings. No division, sum, percentage, tax, discount or rounding exists.
- **DEC-003**: The output must survive the existing API losslessly: parse the
  exact product to a finite Number, parse `String(thatNumber)` back into exact
  decimal parts, and require decimal equality with the product. Reject overflow,
  underflow-to-zero and changed values. This means decimal round-trip equality,
  not binary IEEE-754 exactness: `3 * 0.1` returns `0.3`; `3 * 0.07` returns
  `0.21`; `3 * 0.10000000000000002` is rejected because its exact product
  `0.30000000000000006` does not survive that round trip. Never round a total to
  cents or accept a tolerance. The same representability test applies to trusted
  persisted operands and output before Number conversion.
- **DEC-004**: A trusted store adapter accepts finite primitive numbers and
  actual Prisma Decimal values or their strict string serialization. Reuse the
  existing decimal grammar, rejecting whitespace, leading plus, malformed and
  non-finite spellings. Bound text to 1,024 characters and exponent magnitude
  to 1,024 before BigInt/exponent processing; reject larger encodings. These
  conditional runtime parsing limits admit every canonical finite Number and
  bound privileged-corruption inputs; they add no database precision/scale.
  Check exponent magnitude through bounded decimal digits before constructing
  exponent-dependent buffers or powers. Operand round-trip validation precedes
  multiplication, bounding the product to canonical finite-number coefficients
  and an Int32 multiplier even when a trusted encoding has redundant zeros.
  Check exact domain comparisons and exact round-trip equality before any
  lossy conversion. Never apply this trusted normalization to HTTP bodies.
- **DEC-005**: Quantity is a dimensionless count; unit price is an amount per
  counted item; output is an amount in exactly the same unspecified units.
  There is no currency code, currency symbol, exchange, locale-dependent
  numeric reinterpretation, currency minor-unit scale, financial settlement or
  unit conversion. Display canonical decimal values without implicit two-place
  rounding. An explicit demand for those business semantics requires a separate
  decision/clarification, not an invented default.
- **DEC-006**: Keep generated Prisma `Int`/`Decimal`, PostgreSQL `INTEGER` and
  unqualified `DECIMAL`, existing transactions and schema emission. New product
  fields naturally produce columns through existing generation; this is not a
  migration of any existing application or a new database type/default. A
  future target with rounding or scale truncation cannot claim this profile.
  No database trigger, generated column, CHECK or general arithmetic service is
  introduced. Direct privileged writes remain outside ordinary API authority;
  invalid stored triples fail subsequent validation rather than being laundered.

### Seed and verifier contract

- **SED-001**: Blueprint authoring gets no new seed property. Retain the fixed
  operand witnesses quantity `12` and price `125.5`; both must satisfy their
  domains. Derive output `1506` using DEC-002/003 instead of the generic decimal
  seed. A domain excluding either fixed operand fails composition explicitly;
  no epsilon, midpoint, arbitrary search or fallback witness is allowed.
- **SED-002**: An explicitly authored Graph may provide another coherent seed
  row. Every calculation-bearing seed row must contain all three numeric
  primitives, valid operands and the exact representable derived total; a
  supplied mismatch is rejected, never silently repaired. Compilation requires
  at least one complete valid row. The compiler-generated business tests and
  compiler-worker verifier choose the first complete valid row in declaration
  order and use both operands from that same row. They omit the output from
  create/update bodies despite its stored requiredness.
- **SED-003**: Keep existing versioned verification plan/probe schemas and
  immutable Graph/lock inputs. Derive create/correction requests with writable
  fields only. Execute their prerequisite transitions through the real bounded
  probe executor and generated runtime; verify persisted/response total against
  the exact expected value in focused runtime tests and actual acceptance.
  A plan-shape assertion alone is insufficient. No missing-witness downgrade,
  invented successful response or fixture fallback can accept a Compilation.

### Server authority, transactions and reads

- **RUN-001**: Keep route/method, role/actor scope, authorization, idempotency
  header, expected-version and response envelope contracts. Reject any output
  key in caller `values`, including a correct, null or unchanged total. Required
  output is exempt only from caller-input requiredness; it remains required in
  storage and validated full records. Unknown fields retain existing rejection.
  Errors use HTTP 400 `approval.invalid_request` with safe field-error messages
  where applicable; no raw values or sensitive request bodies are echoed.
- **RUN-002**: Authorization and body shape checks precede record disclosure.
  For a fresh create, validate writable values, derive output and write the
  complete row inside the existing transaction. For a fresh partial update,
  first check authoritative current status/version, merge writable changes with
  trusted current values, validate every required/domain field, calculate from
  the merged operands and conditionally write operands plus output together.
  A nonnumeric edit also recalculates. Draft and returned correction rules stay
  unchanged; submitted/approved editing remains denied. An invalid old total
  can be repaired by an authorized valid correction; an invalid retained operand
  must be replaced, never coerced into a valid value.
- **RUN-003**: Validate the actual store-returned row after create/update and
  before any commit: exact domains, representable operands/output and equality
  to their product. Persisted failure rolls back record, version, receipt, audit,
  capability effects and outbox as one unit in both Prisma and InMemory stores.
  State transitions, including submit/resubmit and reviewer decisions, validate
  the complete authoritative triple before transition/effects. Invalid persisted
  data returns HTTP 409 `approval.calculation_invalid_record` without raw values.
- **RUN-004**: Idempotency hashes contain caller writable values and existing
  operation/version/actor scope, never browser output or a product guessed from
  labels. Preserve graph-digest binding, same-key/different-body conflict and
  serializable retry behavior. An exact retry replays its original validated
  receipt without adding an audit/event/version; do not recompute that historical
  response from a later edit. Validate a calculated receipt's own triple before
  replay. Submit/decision replay also checks the fresh authoritative triple,
  preserving the numeric-domain submit protection. No receipt may bypass forged
  output rejection or the request-shape checks.
- **RUN-005**: Race two edits from one version: one commits a coherent triple;
  the other returns the existing version conflict. A losing or aborted
  transaction leaves no partial total, receipt or effects. Retry after process
  restart returns the same coherent original response. Existing tenant/demo-role
  limitations do not improve merely because totals are now authoritative.
- **RUN-006**: Conditionally validate calculated triples before list/detail,
  matched decision-history record projections and numeric response conversion.
  This prevents a trusted high-precision Decimal from appearing valid only after
  Number rounding. Reads do not repair data or recalculate stored totals in
  place. Invalid data produces the safe conflict/error state. Audit-history
  semantics stay unchanged: matched history shows the current record projection,
  not a newly promised historical price snapshot.

### Structural presentation and UI reuse

- **UIX-001**: Select calculated identity v3 before the existing numeric v2
  selector. Require the exact Approval correction profile, one unique required
  short-string business identity and the CAL-002 triple. Resolve all slots by
  types and validated references, never Equipment keys, labels or provider prose.
  No date or enum is required to satisfy this profile. Other supported
  nonnumeric fields, including optional dates and long-text justification, use
  existing Details. Ambiguous titles or unsupported extra numeric fields fail
  closed rather than falling back to an incomplete presentation.
- **UIX-002**: Use the existing immutable record-identity projection shape with
  `titleFieldKey` and `summaryFieldKeys` in exact order
  `[quantityFieldKey, unitPriceFieldKey, outputFieldKey]`, versioned as v3.
  Lists, queue, detail and matched Decision history use those bindings and show
  identity, quantity, unit cost, total, status and allowed actions. Reuse existing
  summary wrapping, labels, cards, color tokens and 44 px action controls.
- **UIX-003**: Existing numeric input controls and numeric-domain feedback
  remain for both operands. Render the derived field as a labelled native
  `output` inside the existing form-field layout, never an editable or hidden
  submitted input. Before save, show a clearly labelled calculated preview from
  the same exact helper; blank/invalid/unrepresentable operands show a useful
  field error and no misleading stale total. Omit output from serialized
  requests. After save/reload/conflict recovery the authoritative response owns
  the displayed total. Preview logic cannot grant server authority.
- **UIX-004**: Reuse search order was registries (`ui-primitives`, `ui-patterns`,
  `workbench-ui`, `generated-ui`), recipe registries, then existing Approval
  generated templates. Existing `input`, `label`, `card`, `badge`, `form-field`,
  state patterns and Approval summary/history satisfy this contract. Restaurant
  `cart-line`/`order-summary` were inspected but rejected as whole assets because
  their order/fulfilment semantics differ. Workbench editing is not the generated
  request surface. Source-study policy was checked; external copying is
  unnecessary. No new shared registry key, asset, font, icon, stylesheet or
  third-party source is proposed. The conditional native output composes the
  existing form rather than duplicating a component for styling.

## Effects and consequences

- **API-001**: This is an additive recognized nested V1 contract and a new
  conditional compiler profile, requiring atomic schema/adapter/compiler
  integration. Existing routes/envelopes stay V1; calculated fields alter only
  eligible new records' writable-field set. Graph conversion/AI-diff limitations
  are explicit rather than silent semantic loss.
- **CAT-001**: Capability implementation adds no definition or demonstrated
  family. Equipment can become the seventh reviewed local definition only in a
  separate PM-owned admission after shared capability acceptance. Its distinct
  job is approval of a counted item's calculated estimated total, including
  changing quantity and unit cost during correction. It is not stock control,
  procurement execution, invoice, payment or asset assignment. The current six
  catalogue rows and selection behavior remain unchanged.
- **SEC-001**: Browser/model/definition/Graph inputs remain untrusted, numeric
  coercion is prohibited, expression execution is absent, and bounded parsers
  control malformed-input resource cost. Role checks, immutable locks, contained
  generated artifacts, safe errors, credential exclusion and local-only preview
  boundaries remain. Privileged database writes and existing demo-role identity
  remain documented residual risks owned by capability/compiler owners and PM.
- **LIC-001**: No package, lockfile, image, copied source, license or notice
  change. Built-in BigInt and existing first-party decimal parsing suffice.
- **OPS-001**: No service, port, queue, Compose or deployment change. Unsupported
  authoring/target/seed cases fail before acceptance; invalid client arithmetic is
  not retried as an infrastructure failure. Exact owned runtime cleanup and
  privacy scans remain mandatory for local acceptance.
- **POS-001**: One reusable rule establishes arithmetic consistency across
  authoring, seeds, runtime, correction, persisted reads and presentation without
  per-product execution code or material currency assumptions.
- **POS-002**: Conditional output preserves six delivered products and historical
  artifacts; fixed operand references keep the new surface small and inspectable.
- **NEG-001**: Some otherwise finite Number inputs have products that cannot
  round-trip and are rejected. This is an intentional visible supported-domain
  limit, not money rounding. Currency-specific or arbitrary-precision workflows
  need a later decision.
- **NEG-002**: The initial profile supports one triple, one identity and no extra
  numeric business fields; composition witnesses constrain admissible domains.
  V2/V3 conversion and generic AI Graph-diff authoring remain unavailable.
- **NEG-003**: Additional trusted read and receipt checks must be tested across
  stores. Database constraints do not independently prevent privileged corruption.
  No claim of immutable historical business-price snapshots is introduced.

## Alternatives considered

- **ALT-001 — Keep manual amount**: Reject for the requested calculated job:
  amount can disagree with quantity/cost and Equipment remains an unenforced
  variation of Purchase.
- **ALT-002 — JavaScript multiplication with tolerance**: Reject: floating-point
  artifacts and comparison tolerances weaken a persisted business invariant.
- **ALT-003 — Round to two decimal places or use minor units**: Reject for this
  slice: this invents a currency scale and rounding policy absent from the brief,
  and changes data/API representation or silently discards precision.
- **ALT-004 — Arbitrary precision strings or new Decimal package**: Defer:
  potentially useful for actual financial semantics, but changes API/schema or
  supply-chain contracts unnecessarily for the bounded local request job.
- **ALT-005 — General expressions or computed-column framework**: Reject:
  introduces operators, dependency graphs, execution/security and migration
  decisions unsupported by one observed multiplication requirement.
- **ALT-006 — Equipment-specific form/runtime or fake date/category**: Reject:
  prevents data-only admission and distorts the job. Typed reference-driven
  summaries reuse current assets without artificial business fields.

## Ownership, migration, rollback and abort

- **OWN-001**: PM owns exact-hash acceptance, freeze, assignments and ledger.
  The Graph/platform owner owns CAL/DEC representation semantics; the compiler
  owner owns emitted runtime/UI and verifier integration. The controller owns
  later Git/delivery operations. Strongest assigned models retain shared Graph,
  lifecycle, security and final release judgment; bounded mechanical tasks may
  use the AGENTS.md Spark role after contracts freeze.
- **OWN-002**: Prospective paths: new shared calculation schema/helper and tests
  in `packages/graph`; `product-blueprint.ts`, `model.ts`, exports and
  `application-graph-adapter.ts`; adapter `openai-interpreter.ts`,
  `definition-family-registry.ts` and associated data/provider tests; capability
  `product-composer.ts`; compiler conditional helper, `index.ts`,
  `approval-numeric-domain.ts`, `approval-mutation-contract.ts`,
  `approval-workspace-presentation.ts`, generated runtime/compatibility tests;
  worker `verifier/verification-graph-plan.ts` and probe execution tests.
  PM assigns exact files before work. Catalogue/evidence/browser admission work
  follows shared acceptance. This proposal changes only its own ADR file.
- **OWN-003**: Shared schemas, composition, templates, fixtures and end-to-end
  integration remain serialized. Parallel work requires a PM-recorded frozen
  contract, actor/error/compatibility semantics and disjoint paths. Any shape,
  identifier, arithmetic, validation-order or supported-profile change stops
  affected writers and returns to contract review. Do not combine this work with
  the subsequent engineering-optimization refactors.
- **MIG-001**: First capture a new six-definition canonical/provider-guide/whole
  ordered bundle baseline at the stated source base, including Training and the
  already accepted database-identifier fixes. Preserve the old five-definition
  fixture SHA-256 `421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5`
  and its explicit accepted identifier comparison. Never regenerate expectations
  from changed code to hide drift. Then add failing focused tests, implement
  schemas and helpers, integrate conditional composition/runtime/UI/verifier,
  and run the shared-contract task-review/QA/release-review/PM gate once.
- **MIG-002**: Equipment admission is later data and bindings work only; no
  production source change may be disguised as a catalogue row. Carry the design's
  positive unit-cost domain and exclusions into that brief, prove distinctness,
  execute actual local correction/approval and inspect responsive state evidence
  before changing counts. Reuse unchanged shared gate evidence.
- **ROL-001**: Before any new calculated Publish, disable/revert new authoring
  and conditional emission with the six old outputs intact. After a calculated
  Publish, retain its exact bytes, hashes, locks and accepted reader/validator;
  stop new calculated authoring/compilation if needed. Do not rewrite historical
  rows or immutable artifacts. Recompilation follows ordinary new immutable
  identities. There is no destructive migration or irreversible step here.
- **ABT-001**: Stop on six-output drift, silently dropped descriptors,
  binary/tolerance arithmetic, implied currency rounding, forged output accepted,
  lost trusted Decimal precision, partial transactional effects, replay/version
  bypass, misleading editable total, unsupported profile fallback, or necessary
  runtime/database/security expansion. A material business choice or independent
  reviewer uncertainty cannot pass standing acceptance by silence.

## Acceptance tests and measurable verification

- **VER-001**: Schema/provider tests accept the exact shape and valid reference
  triple; reject extra keys, versions, wrong/optional field types, unresolved or
  cross-entity references, self/chained/cyclic rules, duplicated outputs,
  output domains/uniqueness, system/relation operands and unsupported families.
  Test original Graph unknown-key stripping separately. Provider null omission,
  explicit-only guidance, registered selection immutability and AI-diff rejection
  have focused cases. Renaming slots preserves semantic deduplication.
- **VER-002**: Exact helper cases include `12 * 125.5 = 1506`, `3 * 0.1 = 0.3`,
  `3 * 0.07 = 0.21`, scientific notation, zero and negatives when explicitly
  admitted by domains, Int32 endpoints when admitted, the DEC-003 rejected
  product, and `2147483647 * 1e308` overflow. Test exponent/text resource caps,
  malformed strings, nonfinite values and trusted decimal just outside a bound
  or round-trip representation. Test against exact expected strings, not the
  implementation's Number multiplication.
- **VER-003**: Seed tests prove coherent fixed witness total, invalid-domain
  failure, explicit valid alternative row, missing/mismatched output failure
  and no mixing operands from different rows. Verifier-generated create/update
  bodies exclude total and execute the actual Published Graph's prerequisite,
  correction and retry chain through the emitted runtime.
- **VER-004**: Against emitted InMemory and real PostgreSQL/Prisma stores,
  exercise valid create, quantity-only update, price-only update, nonnumeric
  correction and return/resubmit/approve. Reject forged total even when correct,
  invalid primitive inputs, invalid domains and unrepresentable products. Assert
  every rejected write leaves record/version/receipt/audit/outbox unchanged.
  Inject a post-write invalid Decimal in a rollback-capable store test; prove
  transaction rollback. Read/submit/decision reject a deliberately inconsistent
  persisted total and an operand such as `0.10000000000000000001` that would
  otherwise round to `0.1`. An authorized correction repairs an invalid total.
- **VER-005**: Prove authorization denial before disclosure, stale update,
  simultaneous edits, exact retry, changed-payload key conflict, interrupted
  response and process restart. Verify receipt snapshots remain their original
  coherent response after later edits; fresh invalid triples cannot pass
  submit/decision replay. InMemory rollback and Prisma serializable behavior
  must agree on externally observable effects.
- **VER-006**: Actual browser evidence at 390/768/1440 verifies two distinct
  items, visible identity/quantity/unit-cost/total, read-only create/edit output,
  exact preview, no request on client-invalid values, useful server rejection,
  pending/retry/conflict recovery, correction changing both operands, matching
  history, reload/restart persistence, approved actions, theme/media fallback,
  focus/labels and the consumer-product checklist. No fake date/category or
  invented currency symbol may appear. Equipment counts only after this passes.
- **VER-007**: Freeze six canonical/guide/whole-bundle projections before code
  changes and assert zero drift afterward. Retain original historical fixtures
  and their already accepted comparisons. Compile the new Published Graph twice
  to identical ordered files and hashes; prove its Published bytes/hash never
  change. Unsupported V2 conversion/targets fail deterministically.
- **VER-008**: Prospective command gate (focused new files are implementation
  deliverables, not claims that they exist today):

  ```text
  pnpm --filter @factory/graph test -- calculated-request-total.test.ts numeric-field-domain.test.ts product-blueprint.test.ts application-graph-adapter.test.ts
  pnpm --filter @factory/adapters test -- calculated-request-provider.test.ts product-definition-data.test.ts requirement-interpreter.test.ts
  pnpm --filter @factory/capabilities test -- product-composer.test.ts
  pnpm --filter @factory/compiler test -- calculated-request-total.test.ts approval-correction-runtime.test.ts approval-numeric-domain.test.ts generic-approval-identity.test.ts definition-data-compatibility.test.ts database-target-parity.test.ts
  pnpm --filter @factory/compiler-worker test -- verification-graph-plan.test.ts
  pnpm --filter @factory/graph --filter @factory/adapters --filter @factory/capabilities --filter @factory/compiler --filter @factory/compiler-worker typecheck
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm build
  pnpm exec playwright test e2e/approval-definition-batch.spec.ts
  ```

  PM runs local-service/browser commands only under recorded runtime ownership,
  with the actual calculated fixture/Equipment lane selected and cleanup proven.
  The existing full shared-contract gate is applied at integrated completion;
  ordinary data admission reuses unchanged evidence. Broader tests are not a
  substitute for the explicit arithmetic, database and rendered product cases.

- **VER-009**: PM records exact ADR/source/baseline hashes, command counts,
  failures/repairs, independent verdicts, actual runtime timings and cleanup in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Proposed capability evidence home is
  `docs/acceptance/evidence/calculated-request-totals/`; later business evidence
  is `docs/acceptance/evidence/consumer-equipment-requisition/`. Evidence contains
  bounded safe summaries/digests and privacy-checked screenshots, never raw
  prompts/responses, credentials or sensitive request bodies. Report registered
  definitions, families and accepted actual journeys separately.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`,
  `docs/delivery-policy.md`, `docs/acceptance/consumer-product-checklist.md`.
- **REF-002**: `docs/adr/adr-0069-reusable-numeric-field-domains.md`,
  `docs/superpowers/plans/2026-09-13-product-definition-scale.md`,
  `docs/superpowers/specs/2026-09-17-calculated-requests-design.md`,
  `docs/product-definition-authoring.md`.
- **REF-003**: `packages/graph/src/numeric-field-domain.ts`,
  `packages/compiler/src/approval-numeric-domain.ts`,
  `packages/compiler/src/approval-mutation-contract.ts`,
  `packages/compiler/src/approval-workspace-presentation.ts`,
  `packages/capabilities/src/product-composer.ts`,
  `apps/compiler-worker/src/verifier/verification-graph-plan.ts`.
- **REF-004**: `packages/adapters/src/requirements/definitions/product-definitions.v1.json`,
  `packages/compiler/test/definition-data-compatibility.test.ts`,
  approved UI/recipe registries and `docs/ecosystem/source-studies/README.md`.
