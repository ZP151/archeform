---
title: "ADR-0039: Definition-Aware Restaurant Interpretation"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags: ["architecture", "decision", "requirements", "restaurant"]
supersedes: ""
superseded_by: ""
---

# ADR-0039: Definition-Aware Restaurant Interpretation

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It is not founder acceptance,
implementation authority, product acceptance, a repository-release decision,
or deployment authority. The founder must accept or reject it, directly or
through the exact standing independent-review policy in
`docs/tech-governance.md`; PM then records the decision and assigns the one
bounded implementation path.

## Recommendation

**Keep** the current accepted Golden technology profile and all existing
versioned Graph, requirement, blueprint, clarification, HTTP, lifecycle,
compiler, generated-template, provider, and local-runtime contracts.

Add one internal, server-side interpretation policy to the existing OpenAI
requirement adapter. Its first response receives a compact supported-default
guide projected from the existing canonical Restaurant definition. Details
already fixed by that definition are treated as resolved defaults when the
brief does not contradict them. The provider may leave an open question only
for a decision that materially changes access or privacy, a business rule,
data or compliance handling, or an integration. Explicit live or external
integration requests and contradictions remain unresolved and must not be
represented as the canonical simulated/local behavior.

This correction does not filter, cap, auto-answer, or relabel provider
questions after the response. In particular, it does not infer public access,
discard an authorization or visibility question, increase the three-question
product target, or enrich the acceptance brief. A clear supported Restaurant
request should need fewer questions because the provider is given the Factory
definition before its first response.

## Context

- **CTX-001**: D1 targets an ordinary user receiving a working supported
  Restaurant application without planning, Graph, Publish, Compile, or Verify
  handoffs and with at most three business questions.
- **CTX-002**: Two real-provider attempts produced no application. The first
  exceeded the three-question limit after 244.76 seconds. The second exposed
  four questions in its first response after about 171 seconds. These remain
  failed product attempts even if a later correction succeeds.
- **CTX-003**: The adapter currently tells the provider to ask whenever the
  brief is ambiguous. Guidance to use conventional defaults is expressed only
  for a follow-up after answers are supplied. The first response does not
  identify which decisions the existing Restaurant product already fixes.
- **CTX-004**: The canonical Restaurant implementation already declares
  `restaurant-ordering`, customer, cashier, kitchen, and manager actors,
  simulated money movement, no external side effects, customer-mobile and
  merchant-desktop surfaces, their audiences and navigation patterns, and the
  accepted Restaurant journeys. The Restaurant apply path composes this
  canonical product. A detailed provider blueprint remains required by the
  existing schema, but its presence does not prove that arbitrary prompt
  details are implemented by that canonical product.
- **CTX-005**: Requirement and provider input are untrusted. The model may
  propose bounded business and experience semantics only. It cannot choose
  packages, routes, providers, code, credentials, runtime targets, access
  grants, or deployment.

## Current Accepted Golden Profile

- **CUR-001**: Node.js `>=22.11.0 <23`, pnpm `9.0.0`, and TypeScript `^5.7.2`
  resolved to `5.9.3`; tracked runtime images remain `node:22-alpine`.
- **CUR-002**: Workbench remains Next.js `^15.1.0` resolved to `15.5.22`, React
  and React DOM `^19.0.0` resolved to `19.2.8`, Puck `^0.22.3` resolved to
  `0.22.3`, and XYFlow `^12.3.6` resolved to `12.11.2`.
- **CUR-003**: Control Plane remains NestJS `^10.4.15` resolved to `10.4.22`,
  Prisma `^6.1.0` resolved to `6.19.3`, PostgreSQL `16`, BullMQ `^5.34.10`
  resolved to `5.81.2`, Redis `7`, and Docker Compose.
- **CUR-004**: `@factory/adapters` and `@factory/capabilities` remain private
  workspace packages at `0.1.0`. The adapter's OpenAI SDK stays `^4.77.0`
  resolved to `4.104.0`; Zod stays `^3.24.1` resolved to `3.25.76`.
- **CUR-005**: The implemented serialized Golden Graph contract remains
  `factory.application-graph/v1`, with the accepted immutable Draft -> Publish
  -> Compilation lifecycle. Existing Restaurant V3 composition and preview
  behavior remains governed by its already accepted contracts.
- **CUR-006**: The current requirement seam remains
  `factory.requirement-spec/v1`, `factory.product-blueprint/v1`, and
  `factory.composition-clarification/v1`. The model receives generic
  interpretation instructions and returns the complete strict schema.

The manifests, `pnpm-lock.yaml`, Dockerfiles, and
`docs/tech-governance.md` remain authoritative for these facts.

## Proposed Profile

- **PRO-001**: Keep every runtime, dependency, package version, image,
  provider, model selection, and Compose service in **CUR-001** through
  **CUR-004** unchanged.
- **PRO-002**: Keep every serialized identifier and lifecycle in **CUR-005**
  and **CUR-006** unchanged. No field, enum, request, response, status, or
  persistence shape is added.
- **PRO-003**: In
  `packages/adapters/src/requirements/openai-interpreter.ts`, build a bounded
  Restaurant guide from existing exported canonical functions
  `restaurantOrderingProductIntent`, `restaurantOrderingExperienceBrief`, and
  `restaurantOrderingProductRecipe`. Project only safe business/experience
  facts: product type, actor keys, accepted journey keys, money-movement and
  external-side-effect constraints, and surface device, audience, and
  navigation semantics.
- **PRO-004**: Never project routes, paths, package or capability selections,
  source text, generated code, providers, credentials, tenant data, seed data,
  or runtime/deployment settings into that guide.
- **PRO-005**: Include the guide and its defaulting rule in the first provider
  instruction. Missing details that equal the guide do not create questions.
  An explicit contradiction or a material access/privacy, business-rule,
  data/compliance, or integration decision can create a question.
- **PRO-006**: Explicit live payment or another external integration remains
  a material integration issue. The adapter must not silently claim that the
  canonical `moneyMovement: simulated` and `externalSideEffects: false`
  satisfy it.
- **PRO-007**: Keep strict output validation, clarification derivation,
  clarification-answer reconciliation, provider timeouts, `store: false`,
  zero transport retries, repair bounds, and safe error categories unchanged.
- **PRO-008**: The schema-required detailed blueprint remains transient input
  to review/planning. This ADR does not claim that its arbitrary detail is
  applied to the canonical Restaurant product and does not authorize a new
  blueprint or definition contract.

The proposed profile is an internal adapter-policy correction named here for
traceability as `definition-aware-restaurant-interpretation/v1`. That name is
not a new serialized API identifier and must not appear in persisted data.

## Contract and Compatibility Effects

- **CON-001**: API and data compatibility is exact. The browser request,
  Control Plane route, provider strict-JSON schema, response envelope, error
  statuses, requirement checksums, Graph bytes, Published identity, and
  Compilation identity do not change.
- **CON-002**: The canonical Restaurant definitions remain the source of
  truth. The adapter projects a non-authoritative guide and still validates
  the provider result at the existing boundary.
- **CON-003**: Existing generic, workflow, commerce, and custom interpretation
  behavior is unchanged. The guide describes the supported Restaurant default;
  it does not classify unrelated briefs as Restaurant.
- **CON-004**: Catalog impact is zero. No capability, product recipe, screen
  recipe, UI registry entry, version, lifecycle, digest, or admission state is
  created or changed.
- **CON-005**: License and supply-chain impact is zero. No dependency or copied
  source is introduced; the implementation calls existing workspace exports.
- **CON-006**: The requirement-interpreter adapter owner is the contract owner
  for this slice. Existing versioned API/data artifacts are frozen enough to
  remain unchanged, but implementation is one serialized adapter task rather
  than disjoint frontend/backend work. Generated templates, shared contracts,
  Compose, and end-to-end acceptance remain serialized integration surfaces.

## Security and Operability Effects

### Positive

- **POS-001**: Safe defaults come from reviewed repository definitions rather
  than a new user-visible technical choice or a client-side guess.
- **POS-002**: The explicit integration exception prevents a request for live
  payment from being counted as fulfilled by simulated money movement.
- **POS-003**: The provider receives no credential, route, package, source, or
  execution authority. Existing validation and immutable lifecycle boundaries
  remain fail closed.
- **POS-004**: Provider calls, retry count, deadlines, persistence, and local
  resources remain unchanged, so rollback is a two-file code reversal with no
  data or infrastructure migration.

### Negative

- **NEG-001**: A prompt-guidance correction cannot guarantee provider
  compliance. Real acceptance must still measure question count and complete
  business behavior.
- **NEG-002**: The provider still emits a detailed blueprint required by the
  current contract even though canonical Restaurant apply does not configure
  arbitrary blueprint detail. This inefficiency remains for a separate
  contract decision.
- **NEG-003**: Repository definitions can evolve. The projection and focused
  test must fail when their supported facts drift instead of keeping a copied
  prose snapshot silently.
- **NEG-004**: The guide adds bounded instruction tokens to each provider call,
  which may add small latency and cost; actual elapsed time remains a measured
  result.

## Alternatives Considered

### Keep generic first-response instructions

- **ALT-001**: **Description**: Make no adapter change and continue answering
  every provider-generated question.
- **ALT-002**: **Rejection Reason**: Two real attempts already failed before
  composition, while the missing decisions are largely fixed by an existing
  supported definition.

### Increase the question or clarification limit

- **ALT-003**: **Description**: Permit more than three questions or more
  clarification cycles.
- **ALT-004**: **Rejection Reason**: This weakens the product target and adds
  user effort without correcting the interpreter's missing definition context.

### Filter or auto-answer questions after provider output

- **ALT-005**: **Description**: Remove questions by category or apply answers
  in Workbench after interpretation.
- **ALT-006**: **Rejection Reason**: Categories do not carry enough semantics
  to distinguish safe defaults from access, visibility, role, data, or
  integration decisions. This could silently broaden access or misrepresent an
  unsupported requirement.

### Enrich only the acceptance brief

- **ALT-007**: **Description**: Add canonical details to the real E2E prompt so
  the provider asks fewer questions.
- **ALT-008**: **Rejection Reason**: This would improve the test case while
  leaving the ordinary user's coarse prompt broken and would erase the product
  behavior being measured.

### Replace Restaurant interpretation with a deterministic blueprint

- **ALT-009**: **Description**: Classify the brief, bypass detailed model
  generation, and synthesize an exact canonical requirement and blueprint.
- **ALT-010**: **Rejection Reason**: This could reduce latency, but it changes
  requirement/blueprint semantics and needs explicit handling of requested
  variations and unsupported requirements. It is broader than the smallest
  correction and requires a separate proposal if prompt grounding fails.

## Implementation and Ownership

- **IMP-001**: After acceptance, PM assigns one writer exactly
  `packages/adapters/src/requirements/openai-interpreter.ts` and
  `packages/adapters/test/requirement-interpreter.test.ts`. No other product,
  package, contract, manifest, lockfile, Compose, compiler, template, or E2E
  file is part of this implementation assignment.
- **IMP-002**: Build the guide from existing functions and project an explicit
  allowlist of safe fields. Do not serialize the full canonical objects or use
  free-form object spreading into provider instructions.
- **IMP-003**: Keep one provider request per interpretation attempt and the
  current bounded schema-repair behavior. Do not add background retries or
  retry the real acceptance until deterministic verification passes.
- **IMP-004**: The existing real E2E is integration evidence owned by the
  controller/PM. It stays unchanged for the acceptance run: same coarse brief,
  maximum three questions, maximum two cycles, and no manual lifecycle handoff.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: Migration requires no stored-data rewrite. Deploying the code
  would affect only new transient interpretation calls; existing Draft,
  Published, Compilation, and review records remain byte-for-byte compatible.
- **MIG-002**: Roll back by reverting the two assigned adapter files. No
  database, queue, artifact, catalog, environment, or preview cleanup is
  introduced by the change.
- **MIG-003**: There are no irreversible steps. This ADR authorizes no provider
  call, paid resource, deployment, publication, commit, push, or release.
- **MIG-004**: Abort implementation if it requires a schema/HTTP change, a new
  dependency, a model change, a second provider call, a copied definition,
  client-side question deletion, access defaulting, catalog/template changes,
  or raw prompt/response evidence.
- **MIG-005**: Treat the bounded correction as unsuccessful if the unchanged
  real Restaurant case still exceeds three questions, represents an explicit
  live integration as simulated/local completion, or does not reach a verified
  usable app. Preserve that failure and return any broader deterministic
  definition path to governance.

## Verification Plan

- **VER-001**: Add a focused failing test proving the first provider request
  contains the projected canonical Restaurant actors, journeys, constraints,
  and surface semantics and contains no route, package/capability selection,
  provider, credential, code, or deployment material.
- **VER-002**: Add a focused test proving the instruction treats omitted
  canonical details as resolved while retaining material access/privacy,
  business-rule, data/compliance, and integration questions, including the
  explicit live-payment exception.
- **VER-003**: Run
  `pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts` and
  `pnpm --filter @factory/adapters typecheck`; both must exit zero.
- **VER-004**: Run `node scripts/regression.mjs product`; record exit status,
  elapsed time, and test/file counts in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **VER-005**: After deterministic checks and the normal one independent task
  review, run one unchanged real-provider Restaurant acceptance with fixture
  mode disabled and zero retries. Record only safe counts, booleans, statuses,
  identifiers, and elapsed time. Do not store or report raw prompt/response
  material or credentials.
- **VER-006**: Acceptance requires at most three business questions, zero
  technical choices and manual lifecycle handoffs, non-empty authoritative
  verification, a credential-free loopback preview URL, the complete customer
  and merchant order journey with denial and replay checks, and exact preview
  cleanup. A failed first result remains a failure.

## References

- **REF-001**: `docs/tech-governance.md`
- **REF-002**: `docs/threat-model.md`
- **REF-003**: `docs/adr/adr-0038-consumer-generation-orchestration.md`
- **REF-004**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
- **REF-005**:
  `docs/superpowers/plans/2026-09-07-consumer-generation-delivery.md`
- **REF-006**: `packages/capabilities/src/restaurant/canonical-restaurant.ts`
- **REF-007**: `packages/capabilities/src/restaurant/product-recipe.ts`
- **REF-008**: `packages/adapters/src/requirements/openai-interpreter.ts`
