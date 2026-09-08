---
title: "ADR-0044: Restaurant Business Parameter Binding"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags: ["architecture", "decision", "restaurant", "compiler", "data-binding"]
supersedes: ""
superseded_by: ""
---

# ADR-0044: Restaurant Business Parameter Binding

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. Founder acceptance, directly or through the
standing independent-review policy in `docs/tech-governance.md`, and a
PM-recorded assignment must precede implementation. It grants no Product
Publish, repository release, provider call, cloud action, or deployment.

## Recommendation

**Keep** the accepted Golden profile and existing Graph/API versions. Complete
the already-defined Restaurant application-display-name path so one validated
`title` reaches the generated runtime, customer surface, and merchant settings
through the immutable Published Graph. Keep the accepted initial `USD` currency
and existing merchant runtime currency-edit behavior unchanged.

This slice binds an application display name. It does not claim to extract or
verify a legal business name. It does not bind custom menu items or prices.
When a brief explicitly requires menu content that the fixed canonical seed
cannot represent, interpretation must keep that data difference visible as one
material clarification or fail closed; it must not silently report the menu as
implemented.

## Context

- **CTX-001**: `RestaurantDefinitionSelectionV1.title` is projected to
  `ProductBlueprintV1.title`; Workbench sends that value as `name` to
  `POST /product/requirements`; Control Plane stores it on the application
  aggregate and writes it to Restaurant V3 `metadata.name` during apply.
- **CTX-002**: `factory.restaurant-product-plan/v1` already carries the exact
  Published `metadata` as `plan.application`, and generated READMEs already use
  `plan.application.name`. No new Graph field or transport is needed.
- **CTX-003**: The generated runtime seed and customer HTML instead contain the
  compiler literal `Maison Aurelia`. A supplied title therefore stops before
  the visible application even though its authoritative value is present.
- **CTX-004**: Restaurant menu names, descriptions, and prices already compile
  from `domain.seedData`, but composition currently supplies exactly two
  canonical records. Adding arbitrary menu parameters needs a separate
  cardinality and persistence decision and is outside this timeboxed slice.
- **CTX-005**: A browser RED proved the existing compiler contract admits an
  authored `metadata.name` but rejects a mirrored
  `restaurant-location/main-location.values.currency` override such as `SGD`,
  even with a fresh Graph hash and composition lock. Currency override is a
  separate canonical-contract decision, not an implementation defect in this
  name-binding slice.
- **CTX-006**: Production review found a second boundary mismatch: the private
  Restaurant selection currently permits `title` through 200 characters while
  the accepted Restaurant compiler admits `metadata.name` only from 2 through
  80 characters. A title of 81..200 characters can therefore pass
  interpretation and fail only at Compilation.

## Current and Proposed Golden Profiles

### Current accepted profile

- **CUR-001**: Node `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, and tracked `node:22-alpine` images.
- **CUR-002**: Next.js `15.5.22`, React/React DOM `19.2.8`, Puck `0.22.3`,
  XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, PostgreSQL `16`,
  BullMQ `5.81.2`, Redis `7`, and Docker Compose.
- **CUR-003**: Implemented serialization remains
  `factory.application-graph/v1`; the Restaurant path validates and adapts a
  Published Restaurant V3 Graph into `factory.restaurant-product-plan/v1`.
- **CUR-004**: Draft -> immutable Published Graph -> immutable Compilation is
  unchanged. Compilers never consume mutable Drafts.
- **CUR-005**: Initial generated `settings.name`, customer document title,
  customer shell title, and home hero use `Maison Aurelia`; initial currency
  uses the accepted `USD` default. Merchant runtime settings may subsequently
  update currency through the existing authorized behavior.

### Proposed kept profile

- **PRO-001**: Keep **CUR-001** through **CUR-004**, all package versions,
  manifests, lock entries, images, services, ports, providers, and lifecycle
  transitions unchanged. Add no dependency, migration, or environment value.
- **PRO-002**: Preserve the existing display-name chain exactly:
  `RestaurantDefinitionSelectionV1.title` -> `ProductBlueprintV1.title` ->
  product request `name` -> application aggregate `name` and Restaurant V3
  `metadata.name` -> immutable Published Graph ->
  `factory.restaurant-product-plan/v1.application.name`.
- **PRO-003**: Seed generated runtime `settings.name` from
  `plan.application.name`. Preserve initial `settings.currency: "USD"`, the
  existing authorized merchant currency update, tax, service charge, timezone,
  logo, service-open, menu, and every other runtime seed value.
- **PRO-004**: Render the current escaped `state.settings.name` in the customer
  document title, shell brand, and home hero. Merchant settings already read
  and update the shared runtime settings object; its initial visible value must
  therefore match the customer brand. A later authorized merchant update
  remains runtime state and does not rewrite the immutable Published Graph.
- **PRO-005**: For an explicit phrase such as “a restaurant app named Saffron
  Table,” instruct the existing private Restaurant selection to put `Saffron
  Table` in its `title`. Tighten only the private
  `RestaurantDefinitionSelectionV1.title` boundary to trimmed safe business
  text of 2..80 characters, matching the already-accepted compiler admission.
  If an explicit name is longer, return one material clarification requesting
  a shorter display name or fail closed after the bounded answer cycle; never
  truncate it. If no display name is explicit, keep a valid 2..80-character
  provider title and add no naming question. Ambiguous corporate/legal identity
  is never inferred from this field.
- **PRO-006**: Keep the private selection shape, public
  `RequirementInterpretationV1`, `factory.requirement-spec/v1`,
  `factory.product-blueprint/v1`, Product request/response, Prisma schema,
  Graph schema, and Restaurant plan shape byte-compatible.
- **PRO-007**: Add an explicit private instruction that supplied menu items or
  prices are outside the current canonical binding. Such a requirement stays
  `needs-clarification` with one consolidated `data` scope question, or fails
  closed if retained after an answer. Acceptance of canonical defaults may
  proceed; custom values may not be dropped, invented, or encoded in `title`.

The proposed profile remains distinct and unaccepted until the decision gate
completes, even though it keeps the same technology coordinates.

## Contract, Ownership, and Compatibility

- **CON-001**: `packages/compiler/src/targets/restaurant-v3/plan.ts` remains
  contract owner for `factory.restaurant-product-plan/v1`. Its current shape is
  frozen enough for this change because the compiler only consumes existing
  `application.name`; no domain seed or seed-scenario contract changes.
- **CON-002**: API and data compatibility is additive behavior over existing
  values: no request/response key, error status, database column, Graph field,
  serialized identifier, route, actor, authentication rule, or checksum
  algorithm changes. Existing Published Graphs compile with their recorded
  application names under the existing canonical contract; prior immutable
  Compilations remain unchanged.
- **CON-003**: Catalog impact is zero. Capability locks, canonical product and
  screen recipes, UI registry keys/digests, Lucide inputs, and source-study
  records remain unchanged.
- **CON-004**: The adapter owns only the private semantic instruction and
  2..80 boundary for the existing `title`. The exact boundary owner is
  `packages/adapters/src/requirements/restaurant-definition-selection.ts` with
  `packages/adapters/test/requirement-interpreter.test.ts` as focused evidence;
  Control Plane ownership and application-name equality checks remain
  unchanged. Generated template integration and root E2E remain serialized.
  This is not a frontend/backend parallel wave.
- **CON-005**: D1.8 implementation must start only after the overlapping D1.7
  adapter writer has completed and PM has reassigned the final adapter files.
  A D1.7 contract change returns this proposal to Tech Lead review.
- **CON-006**: License and supply-chain impact is zero. No package, remote
  asset, source copy, notice, or generated runtime dependency is added.

## Security and Operability Effects

- **SEC-001**: Untrusted brief text still crosses only the existing provider
  adapter and strict safe-business-text validation. The provider cannot select
  Graph keys, routes, code, packages, runtime, credentials, or deployment.
- **SEC-002**: Embed the name into generated JavaScript via deterministic data
  serialization and into HTML through escaping. Quotes, angle brackets, and
  Unicode must remain data and cannot create markup or executable source.
- **SEC-003**: Briefs, answers, provider payloads/responses, credentials, and
  hidden reasoning remain transient and absent from Graphs, persistence,
  generated artifacts, logs, screenshots, and ledger evidence.
- **OPS-001**: No process, port, service, network request, cache, queue,
  topology, startup entry, cleanup duty, or deployment contract changes.
- **POS-001**: A user-supplied display name becomes visible throughout the
  generated application without an extra editing step.
- **POS-002**: Runtime branding begins from the immutable application metadata
  already checked by the compiler rather than a stale literal.
- **NEG-001**: Name extraction remains model-derived; schema tests alone cannot
  prove semantic fidelity, so one real authored named-Restaurant probe is
  required.
- **NEG-002**: Menu and price personalization remains unavailable. The product
  must say so through bounded clarification instead of implying completion.

## Alternatives Considered

- **ALT-001 — Add a Restaurant parameter sidecar and Prisma columns**:
  rejected for this slice because it changes public interpretation,
  persistence, reconciliation, and apply contracts before menu cardinality is
  defined. It belongs in a later menu-binding ADR.
- **ALT-002 — Parse the raw brief in Control Plane or compiler**: rejected
  because raw prompts are transient, untrusted, and not an immutable source of
  truth; downstream reparsing would be nondeterministic and violate the
  adapter boundary.
- **ALT-003 — Keep the generated literals**: rejected because it discards the
  authoritative name already present in every Restaurant plan and directly
  causes the visible product mismatch.
- **ALT-004 — Treat `restaurant-location.name` as a new prompt parameter**:
  deferred because application branding and an operational location name are
  distinct concepts. This slice uses existing `metadata.name` for branding
  and does not silently redefine the location contract.
- **ALT-005 — Bind a prompt or location currency into initial runtime state**:
  deferred because the accepted canonical compiler contract rejects authored
  location-currency variation. Supporting it requires a separate contract
  decision and regression scope; this proposal preserves initial `USD` and the
  existing post-start merchant setting behavior.

## Implementation, Migration, and Rollback

- **IMP-001**: After acceptance and D1.7 closure, PM assigns one serialized
  implementation over
  `packages/adapters/src/requirements/openai-interpreter.ts`, its focused test,
  `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`,
  `customer-target.ts`, and their existing focused tests. Root owns
  provider-free fixture coverage in `e2e/restaurant-orders.spec.ts`, a new
  provider-driven `e2e/restaurant-business-binding.spec.ts` for the named
  positive and detailed-menu negative, and PM plan/ledger updates. The new live
  file reuses the existing consumer-Restaurant journey conventions and
  `e2e/helpers/interpretation-diagnostics.ts`; it does not modify the authored
  coarse Restaurant acceptance case.
- **IMP-002**: Start with failing focused tests for a non-default application
  name, escaped rendering, omitted-name behavior, and custom-menu refusal. Then
  change only private instructions and target-local projection/rendering.
- **MIG-001**: New Compilations use the Published application name. No stored
  row or Graph is rewritten and no database migration or backfill runs;
  currency behavior is unchanged.
- **ROL-001**: Revert the assigned adapter/compiler/tests/E2E changes. New
  local preview outputs can be removed by the existing cleanup; immutable prior
  Compilations need no action.
- **ABT-001**: Abort on a new public schema/property/version, database migration,
  Graph or recipe edit, raw-brief persistence/reparse, menu mutation, provider
  retry, new dependency, external request, shared registry drift, mutable Draft
  compilation, or security-boundary change.
- **ABT-002**: Abort if unsafe names can become markup/source, if a custom menu
  request is reported as delivered, or if implementation changes initial or
  merchant-editable currency behavior. There are no irreversible steps.

## Measurable Verification

- **VER-001**: Adapter focused tests prove the instruction requires an explicit
  Restaurant display name to occupy the existing `title`, the projector
  preserves a validated 2..80-character `title`, and 1-, 81-, and
  200-character Restaurant titles cannot enter the product path. An explicit
  overlong name remains one clarification or fails closed after an unresolved
  answer, without truncation. Omitted naming adds no material question, and the
  instruction identifies unbound menu names/prices as material data. Known-
  output tests prove that `needs-clarification` remains fail closed after
  projection and answers. Mocks do not prove that a live model extracts a name
  or classifies a menu correctly. Existing D1.7 question-count, repair-bound,
  no-retry, and safe-error tests must remain green.
- **VER-002**: Compiler runtime tests mutate only valid fixture
  `metadata.name`, then require generated initial `settings.name` to equal that
  value. Initial currency remains `USD`, and the existing authorized merchant
  settings test must continue to prove a valid runtime currency update without
  changing the Published Graph.
- **VER-003**: Customer target tests require escaped current
  `state.settings.name` in document title, shell, and hero; no generated
  customer/runtime source may contain a hardcoded `Maison Aurelia` brand.
  Product-target tests prove customer HTML and merchant settings API expose the
  same initial non-default name while existing runtime name updates still work.
- **VER-004**: Run adapter focused tests/typecheck; compiler customer-runtime,
  customer-target, and product-target tests/typecheck; then
  `node scripts/regression.mjs product`. Record commands, exits, durations, and
  test/file counts in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-005**: One independent scoped implementation review checks the frozen
  paths, immutable source chain, escaping, menu refusal, and absence of schema,
  catalog, dependency, or lifecycle drift. Do not add a duplicate audit wave.
- **VER-006**: Run `e2e/restaurant-orders.spec.ts` with one worker and zero
  retries as provider-free fixture evidence. Require a non-default Graph name
  in initial runtime state, escaped name rendering in customer title/shell/hero,
  the same initial name in merchant settings, unchanged initial `USD` currency,
  zero external asset failures/page errors, and exact cleanup. This test does
  not claim a provider extracted or classified any business input.
- **VER-007**: Run the root-owned provider-driven
  `e2e/restaurant-business-binding.spec.ts` with fixture mode off, one worker,
  and zero retries. Its named positive supplies one unique safe display name
  and must prove the real interpretation -> Product request -> Published Graph
  -> Compilation -> customer/merchant preview path retains that name. Its
  distinct detailed-menu negative supplies concrete menu names and prices and
  must remain clarification or fail closed, with no claimed custom-menu
  application. Record only safe booleans, identifiers, counts, status, and
  timing, never the raw prompt/provider data.
- **VER-008**: The most recent successful authored coarse-default evidence from
  `e2e/consumer-restaurant.spec.ts` and D1.7 live-payment refusal evidence from
  `e2e/restaurant-definition-selection.spec.ts` are prerequisites and
  regressions. Reuse current ledger evidence when D1.8 does not change their
  concrete decision instructions. Run a fresh case only when a relevant
  instruction changed or focused evidence shows drift; never repeat an
  unchanged provider call to turn a failed sample into a pass.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`,
  `docs/threat-model.md`, and ADR-0040.
- **REF-002**: `packages/adapters/src/requirements/restaurant-definition-selection.ts`
  and `packages/adapters/src/requirements/openai-interpreter.ts`.
- **REF-003**: `apps/workbench/lib/product-journey/use-product-journey.ts` and
  `apps/control-plane/src/composition/product-composition.service.ts`.
- **REF-004**: `packages/compiler/src/targets/restaurant-v3/plan.ts`,
  `runtime-api.ts`, and `customer-target.ts`.
- **REF-005**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
