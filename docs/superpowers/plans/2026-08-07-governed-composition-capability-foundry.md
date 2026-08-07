# P1 Governed Composition & Capability Foundry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the governed requirement-to-composition path and scale Factory Pilot to 25–35 verified capability families supporting a 100+ representative Profile recipe catalogue.

**Architecture:** `packages/graph` owns requirement, plan, decision, and catalog schemas. `packages/capabilities` owns immutable asset manifests, compatibility, binding and contribution validation. `packages/adapters` owns deterministic and optional AI planners. The Control Plane persists Draft-scoped decisions; the Workbench displays Factory-owned requirement/plan/diff projections. Each promoted capability is proven through two Graph Profiles and the existing compiler/verifier path.

**Tech Stack:** TypeScript, Zod, NestJS, Prisma/PostgreSQL, Next.js, existing Puck/XYFlow wrappers, BullMQ, Docker Compose, Vitest, Playwright, OpenAI environment-only adapter.

## Global Constraints

- The Application Graph is the sole business source of truth.
- Preserve Draft -> Publish -> immutable Compilation and the accepted isolated verifier.
- Start behavior changes with focused failing tests and record the RED result.
- Only approved immutable capability locks may enter a Composition Plan.
- No raw prompts/responses, credentials, arbitrary source, URLs, package paths, provider controls, or executable code may enter Graph, plan, evidence, or UI state.
- Count a Foundry family only after two independently generated Profile Graphs prove the current locked version.
- Keep source-study, licence, provenance, and third-party notices separate from runtime packages.
- Each green task must be committed and pushed before independent review.

---

### Task 1: Establish composition schemas and semantic validation

**Files:**

- Create: `packages/graph/src/requirement-spec.ts`
- Create: `packages/graph/src/composition-plan.ts`
- Create: `packages/graph/src/profile-recipe-catalog.ts`
- Modify: `packages/graph/src/index.ts`
- Test: `packages/graph/test/requirement-spec.test.ts`
- Test: `packages/graph/test/composition-plan.test.ts`
- Test: `packages/graph/test/profile-recipe-catalog.test.ts`

**Interfaces:**

- Produce `RequirementSpecV1`, `CompositionPlanV1`, `CompositionDecisionV1`,
  `ProfileRecipeV1`, and `ProfileRecipeCatalogV1` parse/assert/hash helpers.
- `CompositionPlanV1` binds a Requirement checksum to immutable capability locks,
  Graph symbols, compiler slots, risks, acceptance journeys, and a Draft base
  checksum.
- `CompositionDecisionV1` may approve only a constrained Graph Diff whose base
  Draft checksum and plan checksum match.

- [x] Write failing tests rejecting raw model material, unknown keys, package paths, URLs, mutable asset locks, non-Draft base revisions, stale checksums, duplicate bindings, undeclared output slots, unsafe Graph operations, and recipes without required capability evidence.
- [x] Run the three focused suites and record RED (9 failed | 114 passed; later corrections: stale-checksum at binding time, catalog anchor/composable acceptance, graph-symbol existence).
- [x] Implement exact-key Zod schemas, canonical hashes, graph-symbol existence checks, capability-lock verification hooks, and bounded explainability fields.
- [x] Run `pnpm --filter @factory/graph test` (141 passed), typecheck, lint, and build — all green at commit f97eafa.
- [x] Commit `feat(graph): define governed composition contracts` (f97eafa, pushed; tree clean).

### Task 2: Build deterministic composition resolution and fail-closed admission

**Files:**

- Create: `packages/capabilities/src/composition-planner.ts`
- Create: `packages/capabilities/src/foundry-admission.ts`
- Modify: `packages/capabilities/src/index.ts`
- Test: `packages/capabilities/test/composition-planner.test.ts`
- Test: `packages/capabilities/test/foundry-admission.test.ts`

**Interfaces:**

- `planComposition(requirement, catalog, baseDraft)` returns an immutable,
  deterministic `CompositionPlanV1` or a bounded clarification set.
- `evaluateFoundryAdmission(asset, evidence)` returns `eligible`, `partial`,
  `quarantined`, or `rejected` with stable reason codes.

- [x] Write failing tests for deterministic plan ordering, incompatible locks,
      missing dependency/binding/slot, lifecycle rejection, source/provenance
      omission, and a candidate with fewer than two verified Profiles.
- [x] Run focused tests and confirm RED.
- [x] Implement resolver scoring only over approved current assets, stable tie
      breaking, and strict admission evidence checks.
- [x] Run full `@factory/capabilities` tests, typecheck, lint, and build.
- [x] Commit `feat(capabilities): add governed composition planner`
      (`3c1848c`, with F1/F2 hardening at `e13bef1`).

### Task 3: Persist plan review and Draft-only application in the Control Plane

**Files:**

- Modify: `apps/control-plane/prisma/schema.prisma`
- Create: `apps/control-plane/src/composition/composition.service.ts`
- Create: `apps/control-plane/src/composition/composition.controller.ts`
- Modify: `apps/control-plane/src/app.module.ts`
- Test: `apps/control-plane/test/composition.service.test.ts`
- Test: `apps/control-plane/test/composition.controller.test.ts`

**Interfaces:**

- Persist RequirementSpec, CompositionPlan, reviewer decision, safe plan summary,
  and constrained Draft Diff checksum without sensitive model material.
- Routes create a Draft-scoped requirement, request/inspect a plan, approve or
  reject the plan, and apply only the approved Diff through the existing Draft
  lifecycle service.

- [x] Write failing tests for published-graph refusal, stale Draft refusal,
      unapproved-plan refusal, altered plan/diff checksum refusal, idempotent
      decisions, and persisted-key redaction.
- [x] Run focused Control Plane suites and confirm RED.
- [x] Add the Prisma migration and service/controller; no background queue was
      needed — the deterministic planner answers synchronously and the review
      boundary is request-scoped.
- [x] Run Control Plane tests, typecheck, lint, and build (174/174, 16 files;
      migration DDL verified against Prisma-generated schema).
- [x] Commit `feat(control-plane): review governed composition plans`
      (`74e918d`).

### Task 4: Add deterministic and guarded AI planning adapters

**Files:**

- Create: `packages/adapters/src/composition/deterministic-planner.ts`
- Create: `packages/adapters/src/composition/openai-planner.ts`
- Modify: `packages/adapters/src/index.ts`
- Test: `packages/adapters/test/composition-planner.test.ts`
- Test: `apps/control-plane/test/composition-ai-boundary.test.ts`

**Interfaces:**

- `CompositionPlannerAdapterV1.propose(input)` returns only a parsed
  `RequirementSpecV1` and `CompositionPlanV1` candidate.
- The OpenAI adapter reads a key only from environment at call time and returns
  a bounded validation failure for malformed/unavailable provider output.

- [ ] Write failing tests for output with Graph operations, package paths, URLs,
      unknown capability versions, raw prompt persistence, and model/provider
      transport errors.
- [ ] Run deterministic adapter tests in fixture mode and confirm RED.
- [ ] Implement deterministic planning first, then the optional provider adapter
      behind the same schema gate and safe diagnostic boundary.
- [ ] Run adapter, Graph, and Control Plane regression suites; run a guarded
      real-provider check only when the local environment is configured.
- [ ] Commit `feat(adapters): add constrained composition planners`.

### Task 5: Implement the Foundry evidence matrix and promotion workflow

**Files:**

- Create: `packages/capabilities/src/foundry-evidence.ts`
- Create: `packages/capabilities/src/foundry-matrix.ts`
- Create: `docs/foundry/capability-matrix.md`
- Create: `docs/foundry/promotion-policy.md`
- Test: `packages/capabilities/test/foundry-evidence.test.ts`
- Test: `packages/capabilities/test/foundry-matrix.test.ts`

**Interfaces:**

- `FoundryEvidenceV1` binds asset digest/version to fixtures, negative tests,
  compiler slots, Profile locks, verifier evidence, and provenance state.
- `buildFoundryMatrix()` reports only current eligible families and never counts
  aliases, historical versions, or partial/candidate assets.

- [ ] Write failing tests for duplicate family aliases, historical-version
      inflation, missing licence/source-study evidence, missing two-Profile proof,
      and stale verifier evidence.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the matrix, promotion policy, and a source-free public summary.
- [ ] Run capabilities and relevant compiler/verifier regression suites.
- [ ] Commit `feat(foundry): enforce capability promotion evidence`.

### Task 6: Expand shared capability families in independently accepted batches

**Files:**

- Create: `packages/capabilities/src/assets/<category>/<family>-v<version>.ts`
- Create: `packages/capabilities/assets/<family>/<version>/` manifests,
  templates, fixtures, tests, and evidence metadata
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/composition.ts` only for generic binding
  interpretation
- Test: focused asset, binding, compiler contribution, and two-Profile tests

**Interfaces:**

- Every family exposes the existing `factory.capability/v1` manifest, declared
  dependencies, compatibility, binding contract, output slots, fixture, and
  validation evidence.
- Batches use the ordered Foundation, Operational workflows, Commercial
  operations, and Experience/data sequence from the Goal design.

- [ ] For each family, write a failing manifest/admission test and a failing
      negative binding or compatibility test before adding an asset.
- [ ] Implement only one coherent family or tightly coupled pair per commit;
      avoid profile-name branches and generic catch-all modules.
- [ ] Add each family to two independently generated anchor Profiles and run
      compiler plus isolated verifier evidence for both before promotion.
- [ ] Update the Foundry matrix and profile recipe catalogue after each accepted
      batch; stop counting a family if current evidence becomes stale.
- [ ] Repeat until 25–35 families are eligible; commit each green batch as
      `feat(capabilities): add <family> capability family`.

### Task 7: Build the 100+ recipe catalogue and twelve anchor Profiles

**Files:**

- Create: `packages/capabilities/src/profile-recipes.ts`
- Create: `packages/capabilities/test/profile-recipes.test.ts`
- Create: `docs/foundry/profile-recipe-catalog.md`
- Create: fixture and acceptance files under `docs/acceptance/` for each anchor
  profile

**Interfaces:**

- `ProfileRecipeCatalogV1` contains 100+ declarative recipes and marks each as
  `anchor`, `composable`, or `unsupported` with reason codes.
- Twelve anchors compile from Published Graphs and cover each promoted family in
  at least two Profiles.

- [ ] Write failing tests for duplicate recipe IDs, unverified capability
      references, missing binding requirements, invalid target claims, and an
      unsupported recipe presented as composable.
- [ ] Build the catalogue from declared capability contracts, not free-form AI
      descriptions.
- [ ] Implement and verify anchors in domain batches; every anchor needs an
      immutable lock, deterministic fixture, role journey, and compiler evidence.
- [ ] Run cross-profile evidence checks and selected isolated Docker journeys.
- [ ] Commit each anchor batch and the final catalogue separately.

### Task 8: Deliver the guided Workbench composition flow

**Files:**

- Create: `apps/workbench/components/composition/requirement-editor.tsx`
- Create: `apps/workbench/components/composition/plan-review.tsx`
- Create: `apps/workbench/components/composition/diff-review.tsx`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Test: `apps/workbench/components/composition/*.test.tsx`
- Test: `apps/workbench/e2e/composition-flow.spec.ts`

**Interfaces:**

- Workbench renders Factory-owned requirement/plan/diff projections and only
  enables publish after a Draft change is independently approved.
- UI displays capability locks, compatibility, risks, assumptions, and
  acceptance journeys; it never displays raw prompts/responses or source.

- [ ] Write failing component and browser tests for requirement entry, plan
      clarification, rejected incompatible plan, approved Draft-only Diff, editable
      Draft, publish, simulation, and local prototype handoff.
- [ ] Implement compact, icon-led wrappers using the existing design system;
      retain light and dark themes.
- [ ] Run Workbench unit, typecheck, lint, build, and Playwright flow tests.
- [ ] Commit `feat(workbench): guide governed composition review`.

### Task 9: Final portfolio and release acceptance

**Files:**

- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/ledgers/2026-08-07-governed-composition-capability-foundry.md`
- Create: `docs/acceptance/governed-composition-capability-foundry.md`

**Interfaces:**

- The release record maps every macro Goal criterion to a commit, exact command,
  evidence path, and owner; only eligible Foundry families count.

- [ ] Run repository quality gates, Graph/Capabilities/Adapters/Control
      Plane/Compiler/Worker/Workbench suites, candidate-intake checks, and selected
      Docker anchor verifications.
- [ ] Run one guarded real-model proposal using an environment-only key; prove
      that only parsed plan/Diff artifacts persist.
- [ ] Obtain independent task review, QA, release review, and PM acceptance for
      each delivery train; reopen any P0/P1/P2 finding.
- [ ] Verify 25–35 eligible families, 100+ recipes, 12 anchors, a clean
      worktree, and remote reachability before writing `GOAL_COMPLETE`.
- [ ] Commit `docs: accept governed composition capability foundry`.
