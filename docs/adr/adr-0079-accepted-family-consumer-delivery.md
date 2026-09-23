---
title: "ADR-0079: Accepted Family Consumer Delivery"
status: "Proposed"
date: "2026-09-24"
authors: "Tech Lead"
tags: ["architecture", "decision", "consumer-generation", "workbench"]
supersedes: ""
superseded_by: ""
---

# ADR-0079: Accepted Family Consumer Delivery

## Status and recommendation

**Proposed.** Recommendation: **keep** the accepted Golden profile and extend
the current automatic `useConsumerGeneration` path to the already accepted
Appointment, Content Directory, and Inventory Operations families. Admission
must reuse their exact structural predicates and the current standard-plan
lock/binding checks. The existing Draft -> Publish -> immutable Compilation ->
Verify -> loopback Preview path, one-execution latches, manual opt-out, failure
recovery, and cleanup authority remain unchanged.

This is a Tech Lead proposal only. It is not founder acceptance,
implementation authority, consumer closure, a count increase, Product Publish,
repository release, cloud action, or deployment authority. Founder acceptance,
directly or through the exact standing independent-review authorization in
`docs/tech-governance.md`, and a PM-recorded implementation assignment are
required before source work.

## Context

- **CTX-001**: At investigation base
  `63c7b12c4e17398d20f1a3f21964a1456bde17bb`,
  `apps/workbench/lib/product-journey/consumer-family.ts` admits only
  Restaurant, Approval, and Task. `useConsumerGeneration` already chooses the
  exact `standard` alternative, applies the fresh Draft, and advances Publish,
  Compile, Verify, and Preview once per bound session/phase.
- **CTX-002**: Appointment Booking V1, Knowledge Resource Directory, and
  Supplies Stockroom are already accepted local product definitions and
  demonstrated runtime families. Counts remain ten registered, ten locally
  accepted definitions, and six demonstrated runtime families. Those counts
  prove family delivery, not automatic consumer entry.
- **CTX-003**: The actual Directory path in
  `e2e/helpers/content-directory.ts`, reused by Inventory, performs six
  technical product/lifecycle actions after the business submission:
  `Choose`, `Apply to Draft`, `Publish Draft`, `Compile Published Graph`,
  `Run Isolated Verification`, and `Start Preview`. Entering the Publish view
  is navigation and must be recorded separately. An authored
  `technicalHandoffs: 0` field is not evidence that these visible actions were
  removed.
- **CTX-004**: The transient browser interpretation contains validated
  RequirementSpec, ProductBlueprint, clarifications, and bounded Restaurant
  parameters. It intentionally does not carry trusted definition provenance or
  a definition-family label. A definition key, title, or provider claim alone
  therefore cannot authorize automatic delivery.
- **CTX-005**: Existing accepted witnesses already provide the semantic
  authority: `isAppointmentBookingBlueprint` and
  `isInventoryOperationsBlueprint` in
  `packages/capabilities/src/product-composer.ts`, and the exact Directory
  planning predicate currently used by
  `packages/adapters/src/requirements/definition-family-registry.ts`. The
  current planner owns exact capability lock references and graph bindings.
  Only a browser-safe public export seam and consumer use are missing.
- **CTX-006**: The test named `keeps the complete appointment fixture in manual
review` uses the older broad `FixtureRequirementInterpreter` output. It is
  not the accepted `appointment-booking-v1` definition witness and must remain
  a negative case.

## Current accepted profile and proposed contract

- **CUR-001**: Keep Node.js `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript
  `^5.7.2` / `5.9.3`, Next.js `^15.1.0` / `15.5.22`, React and React DOM
  `^19.0.0` / `19.2.8`, Puck `^0.22.3` / `0.22.3`, and XYFlow `^12.3.6` /
  `12.11.2` exactly as governed by `package.json`, package manifests, and
  `pnpm-lock.yaml`.
- **CUR-002**: Keep NestJS `^10.4.15` / `10.4.22`, Prisma `^6.1.0` /
  `6.19.3`, BullMQ `^5.34.10` / `5.81.2`, ioredis `^5.4.2` / `5.11.1`,
  PostgreSQL `postgres:16-alpine`, Redis `redis:7-alpine`, and all tracked
  `node:22-alpine` Docker stages unchanged. No manifest, lockfile, image,
  package, provider, database, queue, or Compose change is proposed.
- **CUR-003**: Keep `factory.application-graph/v1`,
  `factory.requirement-interpretation-result/v1`,
  `factory.product-blueprint/v1`, and `factory.composition-plan/v1` unchanged.
  Accepted family-specific Graph, compiler profile, presentation, and
  definition identifiers remain those recorded by ADR-0072, ADR-0074, and
  ADR-0076.
- **PRO-001**: Add exactly three `ConsumerFamily` values:
  `appointment`, `content-directory`, and `inventory-operations`. Do not add a
  generic registered-definition fallback.
- **PRO-002**: The browser-safe `@factory/capabilities` root shall publicly
  export the existing exact Appointment and Inventory predicates. Extract the
  existing Directory blueprint predicate into one browser-safe
  `isContentDirectoryBlueprint` export in
  `packages/capabilities/src/product-composer.ts`; the definition-family
  validator and Workbench plan matcher must both consume that one semantic
  predicate. The validator retains its existing definition provenance,
  primary-job, and journey checks around the shared predicate. Do not retain a
  second Directory blueprint predicate.
- **PRO-003**: Add one bounded browser-safe
  `matchExactConsumerFamilyPlan(blueprint, applicationId, plan)` export in
  `packages/capabilities/src/plan-alternatives.ts` and the existing package
  root. It returns only `appointment`, `content-directory`,
  `inventory-operations`, or `null`. Internally it uses the three exact shared
  predicates, the same current capability catalogue and `locksForKeys` logic
  that create lock key/version/manifest-digest references, and the same
  private `bindingsForKeys` derivation that creates planner bindings. It
  compares complete arrays exactly and fails closed; it does not reimplement
  expected locks or bindings in Workbench.
- **PUB-001**: These additive exports become part of the stable
  `@factory/capabilities` package contract. They accept only parsed
  `ProductBlueprintV1`, requirement identity, and parsed `CompositionPlanV1`.
  They expose no definition catalogue, Node API, provider material, provenance
  document, mutable Draft, execution channel, or release authority. The
  package root must remain browser-safe.
- **PRO-004**: `consumerFamilyFor` must first preserve all current gates: zero
  open questions, one well-formed exact `standard` alternative among at most
  the supported standard/minimal pair, parsed spec/blueprint/plan, matching
  RequirementSpec checksum on blueprint and plan, and
  `plan.compatibility.result === "compatible"`.
- **PRO-005**: For each new family, `consumerFamilyFor` calls only the shared
  PRO-003 matcher after PRO-004 succeeds. Admission therefore requires the
  exact shared blueprint predicate, current complete capability lock
  key/version/manifest-digest array, and exact planner-owned graph-binding
  array for that blueprint and requirement identity. Extra, missing, stale,
  reordered, duplicate, or rebound locks/bindings fail closed. Labels, prose,
  `definitionKey`, and `planId` never decide family membership.
- **PRO-006**: Material clarification remains authoritative. Any unresolved
  authorization, visibility, role, business-rule, data, or integration
  question keeps the journey manual. The consumer path may begin only after
  the user has answered the minimum material business questions and the server
  has returned the exact supported accepted witness. Appearance and optional
  non-material content retain current safe defaults.
- **PRO-007**: The outdated full Appointment fixture remains manual. The
  positive Appointment case must enter through the actual accepted
  `appointment-booking-v1` definition projection and its exact current plan.
  Directory and Inventory positives similarly use the actual accepted
  `knowledge-resource-directory` and `supplies-stockroom` projections; the
  browser still admits them by semantics, locks, bindings, and checksum rather
  than by those keys.
- **PRO-008**: After admission, reuse `useConsumerGeneration` unchanged in
  lifecycle meaning: choose exact `standard`; apply the fresh target; bind
  `applicationGraphId@draftRevisionId`; Publish, Compile, Verify, and Preview
  only after each authoritative preceding phase; require non-empty successful
  verification and a credential-free loopback URL for readiness.
- **PRO-009**: Existing selection, application, phase, stale-response,
  unmount, StrictMode, target-change, retry, and start-over latches apply to all
  six consumer families. One accepted Describe session may cause at most one
  choice, one apply, and one call for each lifecycle phase.
- **PRO-010**: Keep the current manual-review opt-out available before Describe.
  It prevents automatic choice, apply, and release. Reuse the current family
  presentation and status surfaces in `workbench-home.tsx`; add only truthful
  Appointment, Directory, and Inventory labels/descriptions. Do not create a
  new component, registry, orchestrator endpoint, or release harness.

## Effects and consequences

### Positive

- **POS-001**: Each already accepted family can reach its useful local app
  after business input without exposing six technical lifecycle decisions to
  the ordinary user.
- **POS-002**: One exact predicate per family prevents provider labels or
  display text from becoming execution authority and keeps definition
  validation and consumer admission aligned.
- **POS-003**: The change reuses checksum-bound planning, immutable lifecycle,
  idempotent phase transitions, safe failure states, verified loopback
  readiness, and existing generated presentation assets.

### Negative

- **NEG-001**: The Workbench gains three explicit family branches and labels;
  each future accepted family still needs an explicit reviewed admission.
- **NEG-002**: The Directory predicate moves to a public browser-safe package
  seam, so its additive export becomes a stable `@factory/capabilities`
  contract and must remain synchronized with definition validation.
- **NEG-003**: Automatic delivery creates immutable Published and Compilation
  records sooner. They remain inspectable after UI rollback and cannot be
  deleted merely to simplify rollback.

## API, data, security, and operability effects

- **EFF-001**: HTTP API, Graph/schema/serialization, persisted data, catalogue
  rows, family versions, compiler targets, generated templates, database, and
  queue contracts do not change. No migration or compatibility adapter exists.
- **EFF-002**: Adapter definition provenance remains first-party,
  `UNLICENSED`, and validated server-side under the existing definition data
  contract. No raw catalogue document or provider response enters the browser.
- **EFF-003**: Dependency, license, and supply-chain impact is zero. No package,
  copied source, asset, notice, manifest, or lockfile changes.
- **EFF-004**: The browser remains untrusted. It cannot assert family,
  Published identity, Compilation identity, tenant, or role. Server lifecycle
  checks, immutable hashes, authorization, idempotency, worker verification,
  and secret boundaries remain authoritative.
- **EFF-005**: Preview remains isolated, loopback-only, quota/expiry bounded,
  and non-deployable. Every actual case must stop its owned preview and prove
  the owned container, network, volume, and artifact inventory is empty.

## Alternatives considered

### Admit by definition key, family label, title, or provider selection

- **ALT-001**: Carry or inspect a business label and auto-deliver when it names
  an accepted definition.
- **ALT-002**: **Rejected.** Browser/provider labels are untrusted and do not
  prove checksum-bound structure, current locks, bindings, or compatibility.

### Duplicate family predicates in Workbench

- **ALT-003**: Copy Appointment, Directory, and Inventory shapes into
  `consumer-family.ts`.
- **ALT-004**: **Rejected.** Two predicates can drift and admit a shape that the
  planner, definition validator, or compiler rejects. One shared browser-safe
  predicate per family is the bounded seam.

### Add a backend orchestration endpoint or generic family registry

- **ALT-005**: Create a new API/job that selects, applies, publishes, compiles,
  verifies, and previews any registered definition.
- **ALT-006**: **Rejected.** It adds a shared API and long-running operability
  contract while the current phase endpoints and Workbench latches already
  provide the required bounded behavior.

### Count accepted runtime delivery as consumer closure

- **ALT-007**: Treat 10/10/6 or authored `technicalHandoffs: 0` as proof of
  one-step delivery.
- **ALT-008**: **Rejected.** The actual accepted Directory and Inventory helper
  clicks six technical actions. Consumer closure requires observed entry
  evidence and an actual useful app.

## Implementation boundary and ownership

- **IMP-001**: Implementation is serialized after ADR-0078 wherever shared
  Workbench paths overlap. PM records the accepted exact ADR hash and assigns
  one shared-contract owner before changes. A contract change stops concurrent
  writers.
- **IMP-002**: The shared predicate/export owner may change only
  `packages/capabilities/src/product-composer.ts`,
  `packages/capabilities/src/plan-alternatives.ts`,
  `packages/capabilities/src/index.ts`, focused existing capability
  predicate/plan/export tests,
  `packages/adapters/src/requirements/definition-family-registry.ts`, and the
  focused Appointment/Directory/Inventory definition tests needed to prove the
  validator consumes the same predicates.
- **IMP-003**: The serialized Workbench owner may change only
  `apps/workbench/lib/product-journey/consumer-family.ts`,
  `apps/workbench/lib/product-journey/use-consumer-generation.ts`, their
  focused test, `apps/workbench/components/workbench-home.tsx`, and its focused
  test. Reuse the existing manual-review control and status/result component.
- **IMP-004**: The acceptance owner may make the smallest changes to the
  existing Appointment, Directory, and Inventory E2E specs/helpers required to
  enter through the consumer path, record actions, reuse their accepted
  business assertions, and preserve their `finally` cleanup. No new harness,
  fixture-only success record, or weakened manual family acceptance is allowed.
- **IMP-005**: Explicitly unchanged paths include `packages/graph/`,
  `apps/control-plane/`, `apps/compiler-worker/`, compiler targets and generated
  templates, definition JSON, manifests, `pnpm-lock.yaml`, `infra/`, providers,
  credentials, Docker topology, and deployment code.

## Acceptance and verification

- **TST-001**: Start with focused failing Workbench cases for the three actual
  accepted definition projections. Each must classify to its exact new family,
  choose `standard` once, apply once, retain its family across journey reset,
  use the right existing presentation/status copy, and advance each release
  phase once under StrictMode and repeated renders.
- **TST-002**: Preserve current Restaurant, Approval, Task, manual opt-out,
  stale/unmounted response, failed adoption, retry/start-over, non-empty
  verification, and loopback readiness cases.
- **TST-003**: Negative cases cover the outdated full Appointment fixture;
  unresolved material questions; label/key/title-only matches; checksum drift;
  incompatible, missing, duplicate, malformed, or non-standard plans; and each
  extra/missing/stale/reordered-when-ordered lock, digest, or binding. Mutating
  one accepted family toward another or toward a near-match must remain manual.
- **TST-004**: Focused capability plan tests prove the public matcher returns
  each exact family and rejects every lock key/version/digest and binding
  mutation while using the planner's shared derivation. Focused export tests
  import the matcher only through `@factory/capabilities`. Run focused adapter
  definition tests, Workbench consumer/home tests, affected package
  typechecks, formatting for all changed paths, and a production
  `@factory/workbench` build proving the client import graph contains no Node
  built-in or server-only adapter/data path. Run `node scripts/regression.mjs
product` after focused tests pass.
- **TST-005**: Run one actual consumer-entry case for each of Appointment,
  Directory, and Inventory in the prepared isolated local environment. Use the
  actual accepted definition projection and existing generated runtime. From
  `Create product` after the final material answer to verified ready link, the
  observed technical-action count must be exactly zero. Record the initial
  business submit, every clarification answer, Publish-view navigation, and
  any retry separately; none may be hidden inside `technicalHandoffs`.
- **TST-006**: Each actual case must open the verified loopback app and complete
  the existing family's primary useful business operation plus its existing
  authorization/idempotency or recovery assertion. A ready URL alone is not
  acceptance. Verification evidence must be non-empty and cleanup must prove
  no owned preview resources remain on success or failure.
- **TST-007**: Record base/source identities, exact ADR SHA-256, commands,
  question count, user business actions, user technical actions (baseline six,
  target zero), navigation actions, retries, machine wait, useful-app result,
  verification count, cleanup inventory, and failures under
  `docs/acceptance/evidence/accepted-family-consumer-delivery/`. PM records the
  decision and outcome in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

## Migration, rollback, and abort conditions

- **MIG-001**: This is an additive behavior migration for fresh eligible
  Describe sessions only. Existing applications, page refresh reconstruction,
  manually opened or edited Drafts, and manual opt-out stay outside automatic
  entry.
- **ROL-001**: Roll back the Workbench family branches/status copy and the
  additive public predicate exports, restoring manual entry for these three
  families. Revert the Directory predicate move together so the validator has
  exactly one predicate. No stored Graph or data migration is reversed.
- **ROL-002**: Stop every owned Preview through the existing cleanup path.
  Retain immutable Published revisions and Compilations created before rollback
  as lifecycle evidence; do not rewrite or delete them.
- **ABT-001**: Abort on any need for a Graph/API/schema/identifier change,
  definition JSON change, compiler/template change, package/dependency change,
  provider or credential change, database/queue/Compose change, cloud action,
  or weakened authorization/clarification boundary and return to Tech Lead/PM.
- **ABT-002**: Abort if one shared blueprint predicate cannot serve definition
  validation and the planner matcher, if the matcher cannot reuse the exact
  current planner lock/binding derivation without a Node/server-only browser
  import, if any pre-existing family output changes, any phase duplicates,
  useful app behavior fails, or owned preview cleanup is incomplete.
- **IRR-001**: No destructive or irreversible migration is proposed. The only
  durable effects are the already governed immutable Published and Compilation
  records created by an authorized local run.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: ADR-0038 Consumer Generation Orchestration; ADR-0072 Appointment
  Definition Composition Admission; ADR-0074 Content Directory Family; and
  ADR-0076 Inventory Operations Family.
- **REF-003**: `apps/workbench/lib/product-journey/consumer-family.ts`,
  `apps/workbench/lib/product-journey/use-consumer-generation.ts`, and their
  focused tests at investigation base `63c7b12c4e17398d20f1a3f21964a1456bde17bb`.
- **REF-004**: `e2e/helpers/content-directory.ts`,
  `e2e/appointment-booking.spec.ts`, `e2e/content-directory.spec.ts`, and
  `e2e/inventory-operations.spec.ts`.
- **REF-005**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`,
  2026-09-24 ordinary-user delivery gap entry.
