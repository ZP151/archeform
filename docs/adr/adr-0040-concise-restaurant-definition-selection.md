---
title: "ADR-0040: Concise Restaurant Definition Selection"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags: ["architecture", "decision", "requirements", "restaurant"]
supersedes: ""
superseded_by: ""
---

# ADR-0040: Concise Restaurant Definition Selection

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It is not implementation authority,
founder acceptance, Product Publish, a provider call, repository release, or
deployment authority. Founder acceptance and PM assignment remain separate.

## Recommendation

**Experiment** with a bounded internal provider representation for canonical
Restaurant selection while keeping the current accepted Golden profile and
the public `RequirementInterpretationV1` envelope unchanged.

The model selects either the existing `restaurant-ordering` definition with a
small fit result or the existing full generated-spec/blueprint path. A
first-party adapter projector turns a valid Restaurant selection into the
existing complete `RequirementInterpretationV1`. The projection contains only
a minimal, representable core-order semantic slice used by the existing
planner; the canonical intent, experience, Product Recipe, and Restaurant V3
composer remain the delivered-product authority.

This experiment removes model generation and repeated repair of a generic
Restaurant blueprint whose detailed entities, pages, and workflows are not
used by the Restaurant apply path. It does not turn invalid model output into
success, use a test fixture, classify by keywords, suppress material questions,
or claim that unsupported customization was bound to the canonical product.

## Context

- **CTX-001**: Four unchanged coarse Restaurant attempts failed before a
  usable application. The latest returned HTTP 422
  `requirement.output_invalid` after 349,123 ms; no review, Compilation, or
  verified app existed. A distinct detailed manual Restaurant case passed.
- **CTX-002**: The provider currently generates a full RequirementSpec and
  generic ProductBlueprint. Syntactically valid output can still need complete
  repair rounds for semantic cross-reference and permission invariants.
- **CTX-003**: Control Plane validates and generically plans that blueprint,
  but `chooseRestaurantProductPlan` records `restaurant-v3` with no Diff and
  `applyRestaurantProductTransaction` composes
  `restaurantOrderingProductIntent()` and
  `restaurantOrderingExperienceBrief()` through `composeProductRecipe()`.
  Model-authored Restaurant blueprint detail is not the delivered Graph.
- **CTX-004**: Canonical Graph events are richer than the bounded generic
  blueprint action vocabulary. A full mechanical Graph-to-blueprint copy would
  therefore be misleading. The public projection must be explicitly limited
  to a valid core-order planning slice.
- **CTX-005**: Provider input remains untrusted. Only validated business
  semantics may cross the boundary; the provider cannot choose packages,
  versions, routes, code, credentials, runtime, access grants, or deployment.
- **CTX-006**: The current first `customer-place-order` journey step is the
  canonical `restaurant-order` transition `cart -> submit -> submitted` by
  `customer`. `submit` is already in `blueprintActionVerbs`, so the proposed
  three-file projector has one real representable source step and needs no
  Graph, capability, or Control Plane change.

## Current and Proposed Profiles

### Current accepted Golden profile

- **CUR-001**: Node `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, and tracked `node:22-alpine` images.
- **CUR-002**: Next.js `15.5.22`, React/React DOM `19.2.8`, Puck `0.22.3`,
  XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, PostgreSQL `16`,
  BullMQ `5.81.2`, Redis `7`, and Docker Compose.
- **CUR-003**: Private `@factory/adapters` and `@factory/capabilities` remain
  `0.1.0`; OpenAI SDK `^4.77.0` resolves `4.104.0`; Zod `^3.24.1` resolves
  `3.25.76`.
- **CUR-004**: Implemented Graph serialization remains
  `factory.application-graph/v1`; accepted Restaurant composition emits V3
  Drafts. Draft -> immutable Published Graph -> immutable Compilation remains
  unchanged.
- **CUR-005**: Public interpretation remains the exact
  `RequirementInterpretationV1` object containing
  `factory.requirement-spec/v1`, `factory.product-blueprint/v1`, and
  `factory.composition-clarification/v1` values.
- **CUR-006**: The internal provider returns one complete generated spec and
  blueprint for every product family, followed by strict parsing, semantic
  validation, and at most two full repair rounds.

### Proposed experimental profile

- **PRO-001**: Keep **CUR-001** through **CUR-005** byte-compatible. Add no
  package, model, image, service, API route, status, database field, Graph
  field, lifecycle transition, or runtime provider.
- **PRO-002**: Replace only the private provider-output schema with an exact
  two-branch object. Both nullable branch properties are always present so the
  OpenAI strict-JSON shape remains deterministic:

  ```ts
  type ProviderInterpretationResultV1 = {
    resultKind: "definition-selection" | "generated-blueprint";
    definitionSelection: {
      definitionKey: "restaurant-ordering";
      disposition: "supported-default" | "needs-clarification";
      requirementId: string;
      title: string;
      outcome: string;
      materialQuestions: Array<{
        category:
          | "authorization"
          | "visibility"
          | "role"
          | "business-rule"
          | "data"
          | "integration";
        question: string;
      }>;
    } | null;
    generatedInterpretation: {
      spec: ModelRequirement;
      blueprint: ModelBlueprint;
    } | null;
  };
  ```

- **PRO-003**: Enforce exact branch exclusivity. `supported-default` requires
  zero material questions. `needs-clarification` requires one to thirty,
  preserving the existing RequirementSpec capacity. Questions are never
  truncated or discarded to meet the product target. An
  unknown definition, mismatched result kind, invalid field, or inconsistent
  disposition fails or enters the existing bounded repair loop; it never
  falls back to a guessed product or fixture. Reject a `generated-blueprint`
  branch whose spec declares `productType: restaurant-ordering`; every
  Restaurant result must use the definition branch so custom or live behavior
  cannot reach the canonical apply path through a generic blueprint.
- **PRO-004**: Select `definition-selection` only when the brief fits the
  canonical Restaurant default. Explicit live payment, another external
  integration, access/privacy ambiguity, material business-rule change, or
  data/compliance deviation is instructed to require `needs-clarification`.
  An answer that continues to require unsupported behavior is instructed to
  remain `needs-clarification`; the existing bounded clarification path then
  fails closed rather than delivering an app.
- **PRO-005**: Use `generated-blueprint` for Expense, Appointment, workflow,
  commerce, custom, and every unselected product. Its current schemas,
  validation, answer reconciliation, and repair behavior remain unchanged.
- **PRO-006**: A private adapter helper constructs the Restaurant public
  envelope from the selection and current production exports:
  `restaurantOrderingProductIntent`,
  `restaurantOrderingExperienceBrief`,
  `restaurantOrderingProductRecipe`, and
  `getCanonicalRestaurantAuthority`.
- **PRO-007**: The RequirementSpec fixes `productType` to
  `restaurant-ordering`, uses the validated selected identity/title/outcome,
  canonical actor definitions, and the validated material questions. It does
  not invent custom capability binding or integration support.
- **PRO-008**: The ProductBlueprint is a deterministic core-order planning
  projection: derive the first canonical `customer-place-order` step, its
  flow/entity/from/event/to/actor and permission. Emit one matching entity,
  workflow transition, and one-step acceptance journey. Select the existing
  `customer-orders` Product Recipe screen only after confirming that it targets
  the same order entity and journey, and represent it through the bounded
  blueprint `list` page intent. The local projection's `status` enum is an
  explicit carrier constructed from the selected transition's `from` and `to`
  states; it is not claimed to validate or reproduce an unavailable canonical
  domain-field definition. The event must belong to `blueprintActionVerbs`,
  and every selected journey, flow, role, permission, entity reference, and
  screen source must still exist in the canonical authority or recipe. Any
  drift fails closed.
- **PRO-009**: The projection is deliberately a planning/interpretation subset,
  not a copy or replacement of the canonical Restaurant Graph. The existing
  Restaurant planner/choice/apply seams and canonical composer continue to
  determine all screens, roles, permissions, flows, capabilities, and runtime
  behavior.
- **PRO-010**: Continue `store: false`, no transport retry, existing timeouts,
  bounded semantic repair, authoritative validation/checksums, and safe error
  categories. Do not persist or report the brief, provider payload/response,
  credentials, or hidden reasoning.

`ProviderInterpretationResultV1` is a private TypeScript/provider-schema name,
not a public serialization identifier. The current Golden profile remains
accepted; this proposed experiment is distinct until accepted and verified.

## Contract, Catalog, and Operational Effects

- **CON-001**: Browser request/response, Workbench parsing, Control Plane
  request, persisted RequirementSpec/ProductBlueprint, Graph bytes, Published
  identity, Compilation identity, and error HTTP statuses are unchanged.
- **CON-002**: The adapter is contract owner for the private provider result and
  deterministic projection. Existing public API/data contracts are frozen
  enough that no frontend/backend writer is needed. The two adapter files and
  new private helper remain one serialized work item.
- **CON-003**: Catalog impact is zero. No capability, product/screen recipe,
  UI registry entry, digest, version, or lifecycle changes.
- **CON-004**: License and supply-chain impact is zero. Only existing workspace
  exports are reused; no source is copied and no dependency is added.
- **OPS-001**: Supported Restaurant uses one concise provider result rather
  than a full generic blueprint. Generic products retain one full result.
  Existing repair rounds remain bounded and never become retries on transport
  failure.
- **OPS-002**: Generated templates, Compose, shared API/Graph artifacts, and
  end-to-end acceptance remain serialized integration evidence and are not
  implementation paths in this experiment.

## Security Effects

### Positive

- **POS-001**: The model selects a reviewed definition but cannot select its
  packages, routes, source, runtime, or access grants.
- **POS-002**: The first-party projector validates every selected canonical
  key and creates checksums locally; provider output never becomes a Graph.
- **POS-003**: Material authorization, privacy, business, data, and integration
  decisions remain visible questions. Simulated payment cannot satisfy an
  explicit live-payment request.

### Negative

- **NEG-001**: Definition fit is still model-derived and must be tested with
  supported, ambiguous, and contradictory cases. Shape validation cannot prove
  that a model correctly classified an unsupported brief. A model may still
  incorrectly return `supported-default`; this residual semantic risk requires
  a distinct real negative probe and cannot be closed by a keyword scanner.
- **NEG-002**: The public blueprint is a documented representable subset of the
  canonical product, because the current generic vocabulary cannot faithfully
  encode every Restaurant transition. Consumers must continue to treat
  `productType` and the canonical recipe as Restaurant delivery authority.
- **NEG-003**: The private union enlarges adapter branching. Exact exclusivity,
  generic-path regression, and repair-bound tests are required.

## Alternatives Considered

### Continue instruction and mirror-schema repairs

- **ALT-001**: **Description**: Keep requesting a full Restaurant blueprint and
  add more prompt rules or mirror constraints.
- **ALT-002**: **Rejection Reason**: The unchanged coarse case still exhausted
  model repairs with HTTP 422 after both corrections, while downstream ignores
  its detailed blueprint.

### Add a keyword-only Restaurant shortcut or production fixture

- **ALT-003**: **Description**: Match words such as “restaurant” locally and
  return test-fixture data.
- **ALT-004**: **Rejection Reason**: Hostile or ambiguous briefs would bypass
  interpretation, fixtures are not production authority, and custom/live
  requirements could be falsely reported as supported.

### Version the public interpretation API with nullable blueprint

- **ALT-005**: **Description**: Add a public definition-selection branch and
  allow `blueprint: null`.
- **ALT-006**: **Rejection Reason**: It is more honest for future multi-recipe
  selection but requires coordinated browser, HTTP, Control Plane, persistence,
  and planner migration. The private union plus validated existing envelope is
  the smallest reversible D1 experiment.

### Convert the full canonical Graph to ProductBlueprint

- **ALT-007**: **Description**: Project every canonical entity, page, role,
  flow, and journey into the generic blueprint.
- **ALT-008**: **Rejection Reason**: Canonical events exceed the bounded generic
  action vocabulary, so the conversion would either be lossy while claiming
  completeness or expand a stable shared contract.

## Implementation, Migration, and Rollback

- **IMP-001**: After acceptance, PM assigns one writer exactly:
  `packages/adapters/src/requirements/openai-interpreter.ts`, new private
  `packages/adapters/src/requirements/restaurant-definition-selection.ts`, and
  `packages/adapters/test/requirement-interpreter.test.ts`.
- **IMP-002**: Start with focused failing tests for compact selection,
  deterministic projection, material questions, branch exclusivity, canonical
  drift, generic Expense/Appointment behavior, and bounded failure. Tests must
  preserve all validated material questions up to the existing capacity and
  preserve `needs-clarification` after answers when the provider still reports
  an unresolved issue. Do not edit Workbench, Control Plane, Graph,
  capabilities, recipes, compiler, E2E, or manifests under this assignment.
- **MIG-001**: No data migration exists. Only new transient provider calls use
  the private result; public and stored records remain current versions.
- **MIG-002**: Roll back the three assigned adapter files. No database, queue,
  Graph, artifact, catalog, environment, or preview cleanup is required.
- **MIG-003**: Abort if implementation needs a public schema/API change, new
  dependency/model/provider, second classification call, copied fixture,
  keyword shortcut, access default, question deletion, catalog/template edit,
  or raw provider evidence.
- **MIG-004**: Abort acceptance if a generic fixture regresses, a contradictory
  Restaurant becomes supported-default, canonical drift does not fail closed,
  or the unchanged coarse case does not complete the real business journey.
- **MIG-005**: There are no irreversible steps. This ADR grants no provider
  execution, commit, push, Publish, paid resource, release, or deployment.

## Verification Plan

- **VER-001**: Run
  `pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts` and
  `pnpm --filter @factory/adapters typecheck`; require exit zero and report
  test counts.
- **VER-002**: Negative tests must reject unknown/mixed branches, more than
  thirty material questions, supported-default with questions,
  needs-clarification without questions, canonical-key or action drift, unsafe
  business text, and a generated blueprint labeled `restaurant-ordering`.
  Tests also prove that material questions are preserved without truncation and
  continued provider-reported need after answers cannot become success.
  Existing provider rejection, timeout, no-retry, repair, and secret-safe tests
  remain unchanged. A mock cannot prove semantic classification of an
  unsupported brief, so no keyword assertion substitutes for real evidence.
- **VER-003**: Existing fixture interpretation for Expense and Appointment and
  full generated-blueprint mock cases must still produce their prior exact
  public shapes through the generic branch.
- **VER-004**: Run `node scripts/regression.mjs product`; record exit, duration,
  and test/file counts in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-005**: One independent scoped implementation review verifies the
  frozen three-file assignment, public compatibility, fail-closed semantics,
  and absence of raw model material. Do not add a duplicate audit gate.
- **VER-006**: Controller rebuilds the existing isolated local image and runs
  the unchanged coarse Restaurant positive acceptance plus one distinct,
  authored live-payment negative probe, each with fixture mode off and zero
  retries. Record only safe status/count/boolean/identifier/time evidence; do
  not persist or publish provider material or a negative-probe result app.
- **VER-007**: Positive acceptance requires at most three business questions,
  zero technical/manual lifecycle choices, non-empty authoritative
  verification, a credential-free loopback preview, complete
  customer/merchant/kitchen order, denial and replay checks, and exact cleanup.
  The live-payment probe must remain `needs-clarification` or fail closed and
  must not claim the simulated-payment default satisfies it. A failed first
  result remains a failure and cannot be retried into the score.

## References

- **REF-001**: `docs/tech-governance.md`; `docs/threat-model.md`
- **REF-002**: `docs/adr/adr-0038-consumer-generation-orchestration.md`
- **REF-003**: `docs/adr/adr-0039-definition-aware-restaurant-interpretation.md`
- **REF-004**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
- **REF-005**: `packages/adapters/src/requirements/openai-interpreter.ts`
- **REF-006**: `packages/capabilities/src/restaurant/canonical-restaurant.ts`
- **REF-007**: `packages/capabilities/src/restaurant/product-recipe.ts`
- **REF-008**:
  `apps/control-plane/src/composition/product-composition.service.ts`
