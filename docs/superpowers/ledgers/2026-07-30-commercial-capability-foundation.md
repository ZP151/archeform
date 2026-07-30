# Commercial Capability Foundation Project Ledger

Updated: 2026-07-30

Plan: `docs/superpowers/plans/2026-07-30-commercial-capability-foundation.md`

Design contract: `docs/superpowers/specs/2026-07-30-commercial-capability-foundation-design.md`

Execution record: `.superpowers/sdd/2026-07-30-commercial-capability-foundation/progress.md`

## Workflow

The only valid task states are:

`planned` -> `implementing` -> `ready_for_qa` -> `reviewed` -> `accepted`

- `planned`: specialization, contract owner, exact paths, dependencies,
  non-goals, and acceptance evidence are recorded.
- `implementing`: the assigned engineer owns the bounded change and its TDD
  evidence. A repair cycle returns to this state with the finding recorded.
- `ready_for_qa`: implementation, task review, and focused verification are
  complete; independent behavioral QA remains required.
- `reviewed`: task review and QA are reconciled with no open P0/P1 finding;
  release review and fresh verification remain required.
- `accepted`: task review, QA, release review, and fresh verification are
  reconciled. A commit or green development tests alone do not qualify.

Only the PM may change task state. A task may not skip a state. Any shared
contract change stops dependent implementation and returns the affected task
to `implementing` after its scope and ownership are re-recorded.

## Current milestone

The Commercial Capability Foundation is starting contract implementation. The
accepted design selects four reusable Golden packages:
`core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`. Task 1 is the
only active writer and owns their physical package and interface contract.
Tasks 2 through 5 remain `planned`. Tasks 3 and 4 may run in parallel only after
Task 2 is accepted because they consume the same frozen profile composition
metadata but write disjoint compiler and Workbench paths.

| Task                                          | State          | Specialization | Contract owner                  | Contract status                                                                                                                                          |
| --------------------------------------------- | -------------- | -------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Capability contracts and physical packages | `implementing` | `integration`  | Factory Capability Registry     | Accepted `factory.capability/v1` and `factory.composition/v1` are frozen inputs; the four Foundation package identities and interfaces are being frozen. |
| 2. Restaurant and Ecommerce profile recipes   | `planned`      | `integration`  | Profile Composition Integration | Blocked on accepted Task 1 package identities and interfaces.                                                                                            |
| 3. Generic commercial generated runtime       | `planned`      | `backend`      | Compiler Runtime                | Blocked on accepted Task 2 Published Graph recipes and immutable locks.                                                                                  |
| 4. Workbench profile composition visibility   | `planned`      | `frontend`     | Workbench Product Surface       | Blocked on accepted Task 2 profile composition metadata.                                                                                                 |
| 5. Cross-profile acceptance and evidence      | `planned`      | `qa`           | Factory Release Evidence        | Blocked on accepted Tasks 1 through 4.                                                                                                                   |

## Task 1: Freeze capability contracts and physical package verification

- **State:** `implementing`
- **Specialization:** `integration`
- **Contract owner:** Factory Capability Registry
- **Contract artifact:**
  `docs/superpowers/specs/2026-07-30-commercial-capability-foundation-design.md`
  capability contracts plus the accepted `factory.capability/v1` and
  `factory.composition/v1` schemas.
- **Dependencies:** accepted Parameterized Capability Composition project;
  current physical-package verifier and immutable composition resolver.
- **Produces:** four fixed `1.0.0` Golden assets with verified physical roots,
  exact `provides`/`requires`, safe output slots, fixtures, tests, and
  deterministic dependency resolution.

### Exact allowed paths

- `packages/capabilities/src/assets/core/identity-context-v1-0-0.ts`
- `packages/capabilities/src/assets/core/location-context-v1-0-0.ts`
- `packages/capabilities/src/assets/commerce/line-configuration-v1-0-0.ts`
- `packages/capabilities/src/assets/commerce/inventory-ledger-v1-0-0.ts`
- `packages/capabilities/assets/core.identity-context/1.0.0/**`
- `packages/capabilities/assets/core.location-context/1.0.0/**`
- `packages/capabilities/assets/commerce.line-configuration/1.0.0/**`
- `packages/capabilities/assets/commerce.inventory-ledger/1.0.0/**`
- `packages/capabilities/src/assets/contract.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/capabilities/test/commercial-capability-assets.test.ts`

### Non-goals

- No profile Graph recipe, compiler runtime, Workbench, lifecycle, payment,
  external identity provider, provider credential, or third-party source copy.
- No historical asset identity change and no compatibility or profile-name
  dispatch branch.
- No free-form string, source, URL, command, path, credential, or raw model
  material in a manifest, binding, fixture, artifact, log, or report.

### Acceptance evidence

- Focused RED proves the Foundation packages are not yet registered.
- Focused GREEN proves all four physical roots verify, dependencies resolve in
  deterministic order, missing providers and tampered content fail before lock
  creation, and every registration agrees with its physical manifest.
- Capability registry and composition-contract regressions plus Capabilities
  typecheck pass.
- Independent task review finds no open P0/P1/P2 before transition to
  `ready_for_qa`; later QA, release review, and fresh verification are required
  before `accepted`.

## Task 2: Compose Foundation Graph recipes for Restaurant and Ecommerce

- **State:** `planned`
- **Specialization:** `integration`
- **Contract owner:** Profile Composition Integration
- **Contract artifact:** accepted Task 1 package identities, interfaces, and
  the profile-recipe rules in the accepted design.
- **Dependencies:** Task 1 `accepted`.
- **Produces:** Restaurant and Ecommerce Draft recipes that select the same
  four Foundation identities with different exact Graph-symbol bindings,
  entities, pages, roles, labels, and fixtures.

### Exact allowed paths

- `packages/capabilities/src/index.ts`
- `packages/capabilities/src/restaurant/profile.ts`
- `packages/capabilities/test/restaurant-profile.test.ts`
- `packages/capabilities/test/commercial-profile-composition.test.ts`

### Non-goals

- No new package identity or Task 1 contract change.
- No compiler, Workbench, generated runtime, payment, identity-provider, or
  deployment behavior.
- No literal labels in composition bindings, legacy profile cloning in the
  active path, Graph `assetLocks` fallback, or Restaurant-only package fork.

### Acceptance evidence

- Focused RED proves Foundation bindings and Graph contributions are absent.
- Focused GREEN proves matching package identities, distinct validated Graph
  symbols and output semantics, canonical nonempty locks, deterministic
  dependency order, and fail-closed invalid symbols for both profiles.
- Restaurant profile, composition-contract, and Capabilities typecheck pass.
- Independent task review, QA, release review, and fresh verification are
  reconciled before acceptance.

## Task 3: Generate generic context, configured-line, and stock-ledger runtime

- **State:** `planned`
- **Specialization:** `backend`
- **Contract owner:** Compiler Runtime
- **Contract artifact:** accepted Task 2 Published Graph recipes and immutable
  `factory.composition/v1` locks.
- **Dependencies:** Task 2 `accepted`.
- **Produces:** generic, lock-derived API and Web contributions for context
  resolution, configured-line validation and pricing, and transactional stock
  movements for both profiles.

### Exact allowed paths

- `packages/compiler/src/commercial-runtime.ts`
- `packages/compiler/src/commercial-page-runtime.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/commercial-runtime.test.ts`
- `packages/compiler/test/composition-compilation.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`

### Non-goals

- No Task 1 or Task 2 contract change, Workbench edit, external provider,
  real payment, production identity, or legacy Restaurant migration beyond the
  explicitly generic Foundation contributions.
- No profile-name/version dispatch, Graph `assetLocks` fallback, arbitrary
  source/path/URL/script execution, or direct PageModel stock mutation.

### Acceptance evidence

- Focused RED proves no generic commercial runtime contribution exists.
- Focused GREEN proves principal/location validation, option ownership and
  cardinality, availability, decimal pricing, role gates, order version,
  idempotency, atomic reserve/release/decrement/adjustment, audit evidence, and
  no mutation on every rejected command.
- Compiler composition and plan regressions, typecheck, and lint pass for both
  profiles using only immutable lock contribution digests.
- Independent task review, QA, release review, and fresh verification are
  reconciled before acceptance.

## Task 4: Expose composition value on Workbench Home and creation review

- **State:** `planned`
- **Specialization:** `frontend`
- **Contract owner:** Workbench Product Surface
- **Contract artifact:** accepted Task 2 profile composition metadata.
- **Dependencies:** Task 2 `accepted`. May execute in parallel with Task 3 only
  while the accepted Task 2 contract remains unchanged.
- **Produces:** data-derived package version, lifecycle, dependency readiness,
  customer/merchant surface, and blocked-combination visibility before Draft
  creation.

### Exact allowed paths

- `apps/workbench/components/workbench-home.tsx`
- `apps/workbench/components/guided-creation-drawer.tsx`
- `apps/workbench/components/workbench-home.test.tsx`
- `apps/workbench/components/guided-creation-drawer.test.tsx`
- `apps/workbench/lib/commercial-foundation-summary.ts`
- `apps/workbench/lib/commercial-foundation-summary.test.ts`

### Non-goals

- No registry, Graph, profile recipe, compiler, lifecycle, provider, or
  publication-contract change.
- No external repository fetch, false installed status, implicit Draft
  mutation, auto-publish, auto-compile, or replacement of Draft -> Publish ->
  immutable Compilation.
- No unrelated visual redesign; use the existing accessible light/dark tokens.

### Acceptance evidence

- Focused RED proves Foundation surfaces and blocked dependency state are not
  visible.
- Focused GREEN proves registry-derived package/version/lifecycle/dependency
  and customer/merchant surfaces appear before Draft creation; invalid recipes
  disable creation with an actionable reason.
- Workbench focused tests, accessibility behavior, typecheck, and lint pass;
  existing guided profile creation remains intact.
- Independent task review, QA, release review, and fresh verification are
  reconciled before acceptance.

## Task 5: Prove end-to-end profile acceptance and evidence boundaries

- **State:** `planned`
- **Specialization:** `qa`
- **Contract owner:** Factory Release Evidence
- **Contract artifact:** accepted Tasks 1 through 4 and
  `docs/acceptance/commercial-capability-foundation.md`.
- **Dependencies:** Tasks 1, 2, 3, and 4 `accepted`.
- **Produces:** deterministic and isolated Node 22 Restaurant and Ecommerce
  generated journeys, exact cleanup evidence, guarded live-model evidence when
  configured, an updated requirements audit, and current project status.

### Exact allowed paths

- `docs/acceptance/commercial-capability-foundation.md`
- `docs/audits/restaurant-ordering-requirements-audit.md`
- `docs/project-status.md`
- `packages/compiler/test/commercial-generated-journey.test.ts`
- `apps/compiler-worker/test/commercial-foundation-lifecycle.test.ts`

### Non-goals

- No production source, package, profile, Workbench, contract, provider,
  deployment, real identity, or real payment change.
- No fixture is reported as a real provider test; absent local OpenAI
  credentials make the guarded gate unavailable, not passed.
- No raw key, prompt, response, identifier, source, path, URL, command, or
  screenshot enters evidence. No unrelated Docker project or filesystem path
  may be touched.

### Acceptance evidence

- Focused RED then GREEN cross-profile generated journey and Worker lifecycle
  tests cover customer context, configured ordering, merchant availability,
  immutable stock ledger, and the corresponding Ecommerce journey using the
  same Foundation package identities.
- Full Graph, Capabilities, Control Plane, compiler, Worker, and Workbench
  tests/typechecks plus affected lint/format/diff checks pass.
- Fresh isolated Node 22 Compose runs verify migrations, seed, API health, Web,
  customer and merchant journeys, immutable artifacts, stopped state, and
  exact label-scoped container/network/volume/runtime-directory cleanup.
- When a local key is configured, at most five calls cross the existing
  provider boundary and only redacted call count, model identifier, outcome,
  and immutable digests are recorded. Schema-invalid or boundary-breaking
  output cannot select package paths, URLs, source, or code.
- Independent task review, QA, release review, and fresh verification report
  no unresolved load-bearing finding before Task 5 and the milestone become
  `accepted`.

## Cross-task risks and stop conditions

- A Task 1 package identity, interface, binding grammar, target slot, or
  physical-verification change immediately stops Tasks 2 through 5.
- A Task 2 profile composition metadata or binding change immediately stops
  Tasks 3 and 4. The PM must record the repair scope before work resumes.
- A compiler decision based on profile name, Graph asset lock, package version
  switch, literal composition text, or mutable Draft state is a release blocker.
- TypeScript registration and physical package content can diverge if digests
  are manually edited or partial roots are staged; fresh physical verification
  is required after every owned asset change.
- The Foundation remains a reusable capability proof, not a completed POS.
  Payment, provider login, delivery, promotions, loyalty, reservation, queue,
  realtime, offline, printing, cloud deployment, and new vertical profiles
  remain explicit follow-up slices.

## Next smallest valuable slice

Complete Task 1 with independently reviewed evidence that all four physical
Golden packages and their dependency interfaces are frozen and fail closed.
Do not start profile recipe, compiler, or Workbench implementation until the PM
has advanced Task 1 through every required state to `accepted`.
