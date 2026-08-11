# Archeform Prompt-to-Polished Restaurant Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn one restaurant requirement into a polished, editable, runnable
customer mobile and merchant desktop product backed by one Application Graph,
then publish, compile, verify, preview, inspect, and export it.

**Architecture:** A transient interpreter emits `ProductIntentV1` and
`ExperienceBriefV1`; a deterministic planner selects an approved
`ProductRecipeV1`; a composer creates an Application Graph v2 Draft with
explicit surfaces and page recipes. Puck and business-facing editors change
only the Draft; compilers consume an immutable Published Graph and copy the
selected UI source into a standalone product. Source overlays are isolated
from generated files and survive recompilation only through declared slots.

**Tech Stack:** TypeScript, Zod, Next.js 15, React 19, Puck, XYFlow, pinned
shadcn/ui Radix source, Lucide, NestJS, Prisma/PostgreSQL, XState, Casbin,
BullMQ/Redis, Vitest, Playwright, Docker Compose, and the environment-only
OpenAI adapter.

## Authority map

<!-- d0-authority-map:start -->

- `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`: the reset records founder decisions.
- `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`: the design owns the product contract.
- `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`: the plan owns execution order.
- `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`: the ledger alone owns live task state.
- `docs/research/2026-08-10-product-builder-ui-ecosystem.md`: the research owns external evidence.

Product approval does not approve a proposed technology decision. A design,
plan, or ADR proposal is not founder approval; the explicit governance gate in
`docs/tech-governance.md` remains required.

<!-- d0-authority-map:end -->

## Global constraints

- Preserve mutable Draft -> immutable Published Graph -> immutable Compilation.
- Pre-Publish preview consumes an immutable `DraftPreviewSnapshotV1`, never a
  mutable Draft. Preview output is ephemeral, non-deployable, non-exportable,
  and cannot create a Compilation.
- Production compilers consume only immutable Published Graphs. Publish creates
  a Published Revision independently and never promotes a preview snapshot.
- Finish and push 2026-08-09 Task 9 before starting Graph v2 product code.
- Start each product behavior with a focused failing test.
- If proposed ADR-0009 receives explicit founder acceptance, new projects use
  `factory.application-graph/v2`; V1 Published content and hashes never change.
- The model proposes bounded business and experience semantics only. It cannot
  select packages, versions, paths, routes, URLs, providers, source, runtime
  destinations, credentials, or executable code.
- The deterministic planner selects approved recipes and immutable capability
  locks.
- Generated files are derived, visible, and read-only. Edits are limited to
  `src/extensions/**` and recipe-declared extension slots.
- Keep light theme as default and dark mode fully functional.
- Use Lucide icons; do not add emoji, handcrafted icon SVGs, copied brand
  assets, or Base44 material.
- Retain license and provenance records for every copied source file.
- No real payments, external money movement, cloud deployment, connector
  marketplace, fleet, or broad Profile expansion in this plan.
- Raw prompts, provider responses, hidden reasoning, credentials, and sensitive
  request bodies never enter persistence, logs, evidence, screenshots, source,
  or exports.
- Preserve unrelated and pre-existing work. Stage only the paths assigned in
  the PM ledger.
- Run the focused suite after every RED/GREEN cycle. Commit and push each
  reviewed green task before starting the next dependency layer.
- Apply the reuse-first UI and Git/release rules in `docs/delivery-policy.md`.
  Every UI task records what approved assets it searched and reused; a new
  registry item requires a functional gap, provenance, and focused evidence.
- Use **Archeform · 元象** for active public product identity as defined by
  `README.md`. Do not silently rename stable `@factory/*` packages,
  `factory.application-graph/*` protocol identifiers, Git paths, historical
  evidence, or immutable hashes.
- Do not add new Workbench behavior to monolithic `globals.css`,
  `use-workbench-controller.ts`, or `control-plane-client.ts`. Preserve behavior
  with characterization tests, then split by context and responsibility before
  adding the new journey.
- Treat 250 lines as the target for new UI files and 300 lines as the target for
  feature CSS, controllers, and clients. Files above 350 lines require a
  documented single-responsibility justification or a split in the same task.

## Founder-review input captured by this plan

The execution sequence incorporates every product correction agreed between
00:00 and this plan freeze:

- prior technical closure did not produce a visually or behaviorally complete
  product; CRUD breadth is not product acceptance;
- the primary path is one prompt, visible product-language building, useful
  live preview, optional contextual editing, and Publish;
- the Base44 reference is its progressive workflow and context organization,
  not code or visual copying;
- Workspace Home, Builder Workspace, and App Management must be distinct,
  coherent contexts with backed transitions between them;
- curated templates are an equal creation path and instantiate independent,
  immediately editable Drafts;
- all front-end page trees are visually editable; Data, Users, roles,
  permissions, Workflow, and Experience are business-facing editable models;
- full generated source is visible, searchable, diffable, downloadable, and
  Git-exportable while regeneration remains Graph-first;
- the first proof is a deep restaurant product with eight customer and seven
  merchant screens sharing real transaction and fulfillment semantics;
- shadcn/ui Radix and Lucide form the governed source foundation; Aceternity is
  quarantined and Figma/Stitch are deferred adapters;
- UI assembly uses primitives, patterns, business blocks, screen recipes,
  experience recipes, and product recipes with explicit contracts and evidence;
- active public identity migrates to Archeform without breaking internal
  compatibility identifiers;
- Workbench stylesheet, controller, and Control Plane client monoliths are
  decomposed as part of the product work, not postponed as cleanup;
- Task 2 semantics and Task 3 UI foundation are the only parallel writer lines
  after the Task 1 contract freeze.

## Dependency order

```text
D0 documentation and Archeform scope
  -> Task 0 closure
  -> Task 1 Graph contracts
  -> [Task 2 restaurant semantics || Task 3 UI Registry + source foundation]
  -> [Task 4 customer compiler || Task 5 merchant compiler]
  -> Task 6 Workbench journey
  -> Task 7 model editors
  -> Task 8 Source Mode
  -> Task 9 real-model acceptance
```

Tasks 2 and 3 start in parallel after Task 1 is reviewed and frozen. They are
the only two product-code writer lines in that wave and must not edit each
other's paths. Their hand-off contracts are the frozen Graph v2 interfaces,
semantic screen keys, binding keys, and registry keys. A contract mismatch is
reported to Task 1; neither writer locally expands the shared contract.
Tasks 4 and 5 may run in parallel only after Tasks 2 and 3 are ready for QA.
Any shared contract change stops parallel work and returns to the Task 1 owner.

## Codex multi-agent execution profile

The active controller contract is
`docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`. The controller
uses at most three subagents and always selects their models explicitly:

- GPT-5.6-Sol owns Graph/lifecycle contracts, cross-package integration, hard
  debugging, security-sensitive work, task gates, and final release judgment;
- GPT-5.6-Terra owns QA and broad verification/research;
- GPT-5.3-Codex-Spark owns read-only exploration, mechanical 1–3-file edits,
  component/CSS details, focused tests, fixtures, registry metadata,
  formatting, and scoped small-diff re-review.

Spark never changes shared contracts, Prisma/Compose topology, security or
lifecycle behavior, PM state, or real-model acceptance. Promote a Spark slice
to Sol on any cross-package ambiguity, load-bearing finding, or third failed
repair. Every implementation still receives the required Sol task review and
the iteration still receives Sol release review.

---

### D0: Record the product reset and freeze scope

**Files:**

- Create: `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`
- Create: `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`
- Create: `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`
- Create: `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
- Create: `docs/research/2026-08-10-product-builder-ui-ecosystem.md`
- Create: `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`
- Create: `.codex/agents/spark_worker.toml`
- Create: `.codex/agents/spark_reviewer.toml`
- Modify: `.codex/config.toml`
- Modify: `.codex/README.md`
- Modify: `.codex/agents/explorer.toml`
- Modify: `.codex/agents/engineer.toml`
- Modify: `.codex/agents/pm.toml`
- Modify: `AGENTS.md`

**Interfaces:**

- Produces: the approved product boundary, lifecycle contract, dependency order,
  PM task identities, ecosystem adoption record, and project-scoped Codex
  multi-agent controller/model-routing contract.
- Does not authorize: Restaurant Product code before Tasks 0 and 1 gates.

- [ ] Record the prompt-first outcome, two surfaces, fifteen required screens,
      Graph-hidden default, generated-source boundary, and deferred breadth.
- [ ] Record the complete 00:00-to-freeze founder decision chronicle,
      Archeform public-brand boundary, template-clone decision, layered UI
      registry, large-file decomposition, and locked Task 2/Task 3 parallel
      wave.
- [ ] Define `DraftPreviewSnapshotV1` as immutable, preview-only,
      non-deployable, and non-exportable; keep production compilation
      Published-Graph-only.
- [ ] Make D0 and Task 0–9 names and order identical in plan and ledger.
- [ ] Configure GPT-5.3-Codex-Spark as the default bounded subagent and Explorer,
      add Spark worker/reviewer roles, retain Sol for load-bearing engineering
      and review, retain Terra for QA, and record the approved writer waves.
- [ ] Run the documentation contract gate and Prettier.

**Verification:**

```powershell
pnpm exec prettier --check docs/iterations/2026-08-10-prompt-to-polished-product-reset.md docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md docs/research/2026-08-10-product-builder-ui-ecosystem.md
python -c "import tomllib, pathlib; [tomllib.loads(p.read_text(encoding='utf-8')) for p in list(pathlib.Path('.codex').glob('*.toml')) + list(pathlib.Path('.codex/agents').glob('*.toml'))]"
codex debug models
```

Expected: the authoritative documents are formatted and carry matching
lifecycle, screen, task, and multi-agent identities; all TOML parses; the local
catalog contains `gpt-5.3-codex-spark`.

---

### Task 0: Seal Honest Requirement-to-Product Closure

**Current state:** `implementing`. It is unblocked: resume from the
paused-session handoff. Independent review, ledger closure, commit, and push are
Task 0 exit gates, not start blockers.

The paused handoff already contains deterministic fixes and green focused/full
evidence for clarification policy, phase deadlines, idempotent composition
reconciliation, preview cleanup recovery, theme/focus behavior, Compose/schema
readiness, and clean-checkout prerequisites. The remaining live-path defect is
the real-model Appointment journey's generic HTTP 400 while creating the
composition Review; no Graph or Review row persisted. The next change must add
safe stable rejection codes, reproduce and fix that exact boundary with a
focused test, and avoid spending another real-model call before deterministic
review passes.

**Files:** Use only the paths assigned by
`docs/superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md`.

**Interfaces:**

- Produces: a closed regression baseline for Expense Approval and Appointment
  Booking.
- Produces: bounded clarification and phase-timeout behavior inherited by the
  restaurant journey.
- Does not produce: Restaurant Product code.

- [ ] Add focused tests proving clarification defaults to one round, never
      exceeds two, aggregates prior answers, rejects semantic repeats, and
      applies declared defaults to non-critical questions.
- [ ] Run the focused interpreter and Workbench journey tests and observe RED
      against the current unbounded clarification loop.
- [ ] Implement independent interpretation, clarification, composition,
      compilation, and verification timeouts with bounded recoverable states.
- [ ] Rerun focused suites, then run the guarded Expense and Appointment real
      model E2E without fixture mode.
- [ ] Record material difference, axe/themes, action inventory, clean-checkout,
      and preview cleanup evidence without raw model material.
- [ ] Complete independent review, update the closure ledger, commit, and push.

**Verification:** Use the commands and gates already frozen in the 2026-08-09
closure plan. Expected result: both products complete inside the clarification
limit; no preview container, network, volume, or `.preview-runs` directory
remains.

---

### Task 1: Freeze Product Intent and Application Graph v2

**Files:**

- Create: `packages/graph/src/product-intent.ts`
- Create: `packages/graph/src/product-recipe.ts`
- Create: `packages/graph/src/application-graph-v2.ts`
- Create: `packages/graph/src/source-overlay.ts`
- Create: `packages/graph/src/draft-preview-snapshot.ts`
- Create: `packages/graph/src/application-graph-adapter.ts`
- Modify: `packages/graph/src/index.ts`
- Modify: `packages/graph/src/browser.ts`
- Test: `packages/graph/test/product-intent.test.ts`
- Test: `packages/graph/test/product-recipe.test.ts`
- Test: `packages/graph/test/application-graph-v2.test.ts`
- Test: `packages/graph/test/source-overlay.test.ts`
- Test: `packages/graph/test/draft-preview-snapshot.test.ts`
- Test: `packages/graph/test/application-graph-adapter.test.ts`

**Interfaces:**

- Produces: the exact interfaces defined in the approved design specification:
  `ProductIntentV1`, `ExperienceBriefV1`, `ScreenIntentV1`,
  `ApplicationSurfaceV1`, `ProductRecipeV1`, `SourceOverlayV1`, and
  `ApplicationGraphV2`.
- Produces: `assertProductIntent`, `assertExperienceBrief`,
  `assertProductRecipe`, `assertApplicationGraphV2`, `hashApplicationGraphV2`,
  `assertSourceOverlay`, `assertDraftPreviewSnapshot`,
  `hashDraftPreviewSnapshot`, `transitionDraftPreviewSnapshot`,
  `upgradeApplicationGraphV1ToV2Draft`, and `adaptPublishedApplicationGraph`.
- Consumes: existing V1 parsers and `hashApplicationGraph` unchanged.
- Preserves: `factory.application-graph/v1|v2` as serialized protocol names and
  `@factory/*` as the current package namespace; Archeform is the public product
  identity, not an unversioned protocol rename.

- [ ] Write schema tests that accept the approved restaurant contract and reject
      extra keys, package/source/provider material, duplicate surface keys,
      cross-surface navigation, missing recipes, unresolved roles/entities,
      unsafe overlay roots, and server-authoritative fields bound as client
      writable.
- [ ] Write Draft Preview Snapshot tests for immutable Draft revision/checksum
      binding, append-only `ready -> rendering -> active -> disposed|expired`
      transitions, stale-Draft rejection, checksum rejection, and explicit
      deploy/export/Compilation rejection.
- [ ] Write immutable upgrade tests that snapshot a V1 hash, upgrade to a new V2
      Draft, and assert the V1 value and hash are byte-for-byte unchanged.
- [ ] Write adapter tests that require the explicit `apiVersion` discriminator;
      missing and unknown versions must fail closed.
- [ ] Run `pnpm --filter @factory/graph test` and confirm the new tests fail
      because the contracts do not exist.
- [ ] Implement strict Zod schemas, semantic cross-reference validation,
      canonical hashing, immutable upgrade, and explicit version adapters.
- [ ] Export node and browser-safe contract surfaces; never export a runtime-only
      dependency through `browser.ts`.
- [ ] Run Graph tests, typecheck, and formatting. Freeze the contract only after
      task review.

**Verification:**

```powershell
pnpm --filter @factory/graph test
pnpm --filter @factory/graph typecheck
pnpm exec prettier --check packages/graph/src packages/graph/test
```

Expected: all Graph tests pass; repeated restaurant V2 hashing is stable; V1
fixture hashes are unchanged; Draft Preview Snapshot transitions are
deterministic and cannot enter a production lifecycle.

---

### Task 2: Compose one deterministic Restaurant Product Recipe

**Files:**

- Create: `packages/capabilities/src/commerce/product-recipe.ts`
- Create: `packages/capabilities/src/restaurant/product-recipe.ts`
- Create: `packages/capabilities/src/restaurant/product-graph.ts`
- Modify: `packages/capabilities/src/capability-catalogue.ts`
- Modify: `packages/capabilities/src/plan-alternatives.ts`
- Modify: `packages/capabilities/src/product-composer.ts`
- Modify: `packages/capabilities/src/index.ts`
- Test: `packages/capabilities/test/restaurant-product-recipe.test.ts`
- Test: `packages/capabilities/test/restaurant-product-composition.test.ts`
- Test: `packages/capabilities/test/product-composer.test.ts`
- Fixture: `packages/capabilities/test/restaurant-product-fixture.ts`

**Interfaces:**

- Consumes: frozen Task 1 contracts.
- Produces: `restaurantOrderingRecipeV1` and
  `composeRestaurantProductGraph({intent, experience, baseDraft})`.
- Produces: one deterministic two-surface Graph and acceptance journeys; does
  not select UI source files.

- [ ] Add a fixture brief for a refined private-dining restaurant and assert two
      surfaces and these fifteen distinct page keys: customer Home, Menu, Dish
      Detail, Cart, Checkout, Orders, Order Detail, Profile; merchant Dashboard,
      Menu Management, Orders, Kitchen Queue, Tables, Users/Roles, Settings.
      Also assert shared entities, restaurant flows, seed scenarios, and locks.
- [ ] Assert repeated composition yields identical Graph hashes and that changing
      a meaningful modifier, table, or kitchen requirement changes the hash.
- [ ] Assert the model-facing records contain no package versions or paths and
      that only the deterministic recipe owns capability locks.
- [ ] Assert customer and merchant permissions deny cross-surface operations and
      every transition is granted to its declared actor.
- [ ] Run `pnpm --filter @factory/capabilities test` and observe focused RED.
- [ ] Implement catalog/category/modifier/pricing, cart/server totals,
      order/idempotency/inventory/audit, simulated payment/receipt, identity,
      table, availability, kitchen, fulfillment, and reporting composition by
      reusing the existing approved capability assets.
- [ ] Remove any restaurant-only shortcut that bypasses Graph bindings or
      creates a shadow domain model.
- [ ] Run capabilities tests, Graph tests, typecheck, and formatting.

**Verification:**

```powershell
pnpm --filter @factory/capabilities test
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/graph test
```

Expected: the fixture Graph contains customer-mobile and merchant-desktop
surfaces, deep commerce semantics, resolved bindings, and a stable hash.

---

### Task 3: Establish the UI Registry and shared source foundation

**Files:**

- Create: `packages/ui-primitives/package.json`
- Create: `packages/ui-primitives/src/index.ts`
- Create: `packages/ui-primitives/src/components/**`
- Create: `packages/ui-primitives/THIRD_PARTY_NOTICES.md`
- Create: `packages/ui-patterns/package.json`
- Create: `packages/ui-patterns/src/index.ts`
- Create: `packages/ui-patterns/src/navigation/**`
- Create: `packages/ui-patterns/src/forms/**`
- Create: `packages/ui-patterns/src/feedback/**`
- Create: `packages/workbench-ui/package.json`
- Create: `packages/workbench-ui/src/index.ts`
- Create: `packages/generated-ui/package.json`
- Create: `packages/generated-ui/src/customer/**`
- Create: `packages/generated-ui/src/merchant/**`
- Create: `packages/generated-ui/src/states/**`
- Create: `packages/screen-recipes/package.json`
- Create: `packages/screen-recipes/src/customer/**`
- Create: `packages/screen-recipes/src/merchant/**`
- Create: `packages/screen-recipes/src/index.ts`
- Create: `packages/experience-recipes/package.json`
- Create: `packages/experience-recipes/src/fine-dining.ts`
- Create: `packages/experience-recipes/src/index.ts`
- Create: `packages/product-recipes/package.json`
- Create: `packages/product-recipes/src/restaurant-ordering.ts`
- Create: `packages/product-recipes/src/index.ts`
- Test: `packages/ui-primitives/test/components.test.tsx`
- Test: `packages/ui-patterns/test/pattern-contracts.test.tsx`
- Test: `packages/generated-ui/test/restaurant-blocks.test.tsx`
- Test: `packages/screen-recipes/test/restaurant-screens.test.ts`
- Test: `packages/experience-recipes/test/fine-dining.test.ts`
- Test: `packages/product-recipes/test/restaurant-product.test.ts`
- Create: `docs/source-studies/2026-08-10-shadcn-ui-radix-intake.md`

**Interfaces:**

- Consumes: Task 1 page recipe and experience contracts.
- Produces: source-owned primitives, reusable interaction patterns, Workbench
  and generated business blocks, fifteen multi-block screen recipes,
  `fineDiningExperienceRecipe`, `restaurantProductRecipe`, and registry
  manifests mapping every key to source, schema, slots, bindings, variants,
  states, tests, provenance, and dependencies.

- [ ] Inventory and classify reusable source before writing new UI: approved
      Archeform registries and recipes first, then existing Workbench/Puck and
      compiler-template assets, then pinned shadcn source-study candidates.
      Record reused keys/paths, parameter changes, rejected candidates, and
      functional gaps in the task hand-off.
- [ ] Record the exact shadcn/ui source revision, MIT notice, selected files,
      transitive packages, local modifications, and removal path before copying
      source.
- [ ] Add tests for keyboard/focus behavior, reduced motion, block required
      props, token isolation, light/dark output, and registry-source parity.
- [ ] Add contract tests proving every registry entry declares version, source,
      license, input schema, named slots, allowed nesting, Domain/Flow/Policy
      bindings, loading/empty/error/success/denied states, responsive variants,
      token requirements, accessibility evidence, fixtures, interaction tests,
      and screenshots.
- [ ] Run the three focused package suites and observe RED.
- [ ] Intake only the required shadcn/ui Radix primitives and normalize them to
      Archeform Workbench tokens and Lucide icons.
- [ ] Compose shared navigation, form, feedback, command, and data-display
      patterns without adding business meaning or application-specific copy.
- [ ] Implement customer blocks: mobile shell, hero, category rail, menu card,
      dish configurator, cart line, order summary, payment state, and timeline.
- [ ] Implement merchant blocks: desktop shell, metric card, active order list,
      kitchen ticket, table map, menu table, availability toggle, and role
      matrix, plus shared empty/loading/error/denial states.
- [ ] Implement Fine Dining tokens with light default and equivalent dark,
      responsive typography, customer/merchant density, and reduced motion.
- [ ] Implement the fifteen screen recipes and one product recipe exclusively
      through registered keys and validated parameters; reject arbitrary source
      paths, missing states, invalid nesting, and unresolved bindings.
- [ ] Add duplicate-detection/reuse tests proving style changes resolve through
      tokens or recipe parameters and no near-equivalent registry item is added
      without a distinct semantic contract.
- [ ] Run focused suites, package typechecks, formatting, and the repository
      source-study verifier.

**Verification:**

```powershell
pnpm --filter @factory/ui-primitives test
pnpm --filter @factory/ui-patterns test
pnpm --filter @factory/generated-ui test
pnpm --filter @factory/screen-recipes test
pnpm --filter @factory/experience-recipes test
pnpm --filter @factory/product-recipes test
pnpm verify:source-studies
```

Expected: every registry item resolves to owned source and a notice; no
Aceternity source or Base44 asset is present.

---

### Task 4: Compile and run the customer mobile surface

**Files:**

- Create: `packages/compiler/src/targets/web/surface-target.ts`
- Create: `packages/compiler/src/targets/web/source-registry.ts`
- Create: `packages/compiler/src/targets/web/customer-surface.ts`
- Create: `packages/compiler/src/preview/draft-preview-renderer.ts`
- Modify: `packages/compiler/src/page-runtime-projection.ts`
- Modify: `packages/compiler/src/core/generated-files.ts`
- Modify: `packages/compiler/src/index.ts`
- Test: `packages/compiler/test/customer-surface-runtime.test.ts`
- Test: `packages/compiler/test/draft-preview-renderer.test.ts`
- Test: `packages/compiler/test/generated-ui-source.test.ts`
- Test: `packages/compiler/test/compilation-plan.test.ts`
- E2E: `e2e/generated-restaurant-customer.spec.ts`

**Interfaces:**

- Consumes for production: a Published Graph v2, Task 2 restaurant composition,
  and Task 3 UI registry.
- Consumes for pre-Publish preview: only a valid immutable
  `DraftPreviewSnapshotV1` through `renderDraftPreviewSurface`.
- Produces: standalone customer Next.js source plus manifest, source origins,
  API bindings, tests, and license notices.
- Produces for preview: ephemeral customer surface documents with a
  `preview-only` disposition and no Compilation or export manifest.

- [ ] Add a compilation test asserting Home, Menu, Dish Detail, Cart, Checkout,
      Orders, Order Detail, and Profile files, bottom navigation, copied source,
      manifest origins, and deterministic digests.
- [ ] Add a runtime test for browse -> configure required modifiers -> add line
      -> server totals -> simulated payment -> order timeline, including denial
      and duplicate idempotency-key rejection.
- [ ] Run focused compiler tests and observe RED.
- [ ] Add preview parity tests showing the snapshot renderer projects the same
      customer page semantics as the Published Graph compiler while rejecting
      stale, expired, disposed, checksum-mismatched, deploy, and export requests.
- [ ] Add production-entry tests proving a mutable Draft and
      `DraftPreviewSnapshotV1` are rejected; only an immutable Published Graph
      can create source artifacts or a Compilation.
- [ ] Implement explicit Graph v2 customer-surface projection and copy only the
      selected UI source into the generated application.
- [ ] Implement `renderDraftPreviewSurface` as a separate preview entry point;
      it may reuse pure projection functions but cannot invoke the production
      Compilation, deploy, source-export, ZIP, or Git paths.
- [ ] Bind UI blocks to generated APIs; keep totals, payment, inventory, order
      state, and authorization server-authoritative.
- [ ] Add Playwright at phone viewport for responsive layout, bottom navigation,
      light/dark, keyboard, and axe.
- [ ] Run compiler tests, generated customer E2E, typecheck, build, and cleanup.

**Verification:**

```powershell
pnpm --filter @factory/compiler test
pnpm --filter @factory/compiler typecheck
pnpm exec playwright test e2e/generated-restaurant-customer.spec.ts
```

Expected: customer surface is runnable and independent; no merchant operation
is visible or authorized.

---

### Task 5: Compile and run the merchant desktop surface

**Files:**

- Create: `packages/compiler/src/targets/web/merchant-surface.ts`
- Modify: `packages/compiler/src/targets/web/surface-target.ts`
- Modify: `packages/compiler/src/preview/draft-preview-renderer.ts`
- Modify: `packages/compiler/src/restaurant-merchant-runtime.ts`
- Test: `packages/compiler/test/merchant-surface-runtime.test.ts`
- Test: `packages/compiler/test/draft-preview-renderer.test.ts`
- Test: `packages/compiler/test/restaurant-merchant-runtime.test.ts`
- E2E: `e2e/generated-restaurant-merchant.spec.ts`

**Interfaces:**

- Consumes for production: the same Published Graph v2 and source registry as
  Task 4.
- Consumes for pre-Publish preview: only a valid immutable
  `DraftPreviewSnapshotV1` through the Task 4 renderer.
- Produces: standalone merchant routes and blocks in the same generated product
  with no duplicate domain or transaction implementation.
- Produces for preview: ephemeral merchant surface documents with no source,
  Compilation, deploy, or export eligibility.

- [ ] Add compilation assertions for Dashboard, Menu Management, Orders,
      Kitchen Queue, Tables, Users/Roles, and Settings with sidebar navigation.
- [ ] Add runtime tests for availability change -> customer order visibility ->
      kitchen accepted/preparing/ready -> table/order view -> audit event.
- [ ] Assert customer, kitchen, manager, and administrator denials for operations
      outside their grants.
- [ ] Run focused compiler tests and observe RED.
- [ ] Add merchant preview parity and lifecycle-rejection cases to the shared
      Draft Preview Snapshot renderer suite.
- [ ] Reassert in the merchant production path that Draft and preview-snapshot
      inputs cannot create source, export manifests, or Compilation records.
- [ ] Implement the merchant projection and bindings using Task 3 business
      blocks and Task 2 shared entities and flows.
- [ ] Add desktop Playwright for table map, order queue, permission matrix,
      light/dark, keyboard, and axe.
- [ ] Run compiler suites, both restaurant E2Es, typecheck, build, and cleanup.

**Verification:**

```powershell
pnpm --filter @factory/compiler test
pnpm exec playwright test e2e/generated-restaurant-customer.spec.ts e2e/generated-restaurant-merchant.spec.ts
```

Expected: customer-created state is visible in merchant operations and both
surfaces use one generated API/database.

---

### Task 6: Rebuild the Workbench prompt-to-live journey

**Files:**

- Create: `packages/workbench-ui/src/**`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/shell/workbench-shell.tsx`
- Modify: `apps/workbench/components/journey/requirement-composer.tsx`
- Create: `apps/workbench/components/journey/building-preview.tsx`
- Create: `apps/workbench/components/templates/template-gallery.tsx`
- Create: `apps/workbench/components/templates/template-details.tsx`
- Create: `apps/workbench/lib/templates/template-catalog.ts`
- Create: `apps/workbench/styles/tokens.css`
- Create: `apps/workbench/styles/base.css`
- Create: `apps/workbench/styles/utilities.css`
- Create: `apps/workbench/styles/workspace-home.css`
- Create: `apps/workbench/styles/builder-workspace.css`
- Create: `apps/workbench/styles/app-management.css`
- Create: `apps/workbench/hooks/workspace/use-workspace-home-controller.ts`
- Create: `apps/workbench/hooks/builder/use-builder-controller.ts`
- Create: `apps/workbench/hooks/management/use-app-management-controller.ts`
- Create: `apps/workbench/hooks/release/use-release-controller.ts`
- Create: `apps/workbench/state/workbench-shell-machine.ts`
- Create: `apps/workbench/lib/control-plane/applications-client.ts`
- Create: `apps/workbench/lib/control-plane/drafts-client.ts`
- Create: `apps/workbench/lib/control-plane/previews-client.ts`
- Create: `apps/workbench/lib/control-plane/releases-client.ts`
- Create: `apps/workbench/lib/control-plane/templates-client.ts`
- Modify: `apps/workbench/app/globals.css`
- Modify: `apps/workbench/hooks/use-workbench-controller.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Create: `apps/control-plane/src/preview/draft-preview.service.ts`
- Create: `apps/control-plane/src/preview/draft-preview.controller.ts`
- Create: `apps/control-plane/src/templates/template-instantiation.service.ts`
- Create: `apps/control-plane/src/templates/template-instantiation.controller.ts`
- Test: `apps/control-plane/test/draft-preview.test.ts`
- Test: `apps/control-plane/test/template-instantiation.test.ts`
- Modify: `apps/workbench/lib/product-journey/journey-model.ts`
- Modify: `apps/workbench/lib/product-journey/use-product-journey.ts`
- Test: adjacent `.test.tsx` and `.test.ts` files
- E2E: `e2e/prompt-to-restaurant-workbench.spec.ts`

**Interfaces:**

- Consumes: Task 2 fixture/real composition, Task 4/5 Draft Preview Snapshot
  renderer, existing Draft/Publish lifecycle APIs.
- Produces: `Apps -> Describe -> Building/Live Preview -> Edit -> Publish` as
  the primary prompt journey plus `Templates -> Instantiate -> Live Preview ->
Edit -> Publish` as the deterministic starter journey.
- Produces: Control Plane create/start/status/dispose endpoints whose responses
  carry snapshot ID, Draft revision, Graph checksum, state, and expiry only.
- Produces: a curated template catalogue whose descriptors bind a Published
  Graph revision, Product/Experience Recipes, capability locks, seed scenarios,
  preview assets, categories, and acceptance journeys.
- Produces: an idempotent instantiation result containing template origin and
  version, new application/Draft IDs, and Draft Preview Snapshot ID; it never
  copies secrets, provider accounts, or private evidence.

- [ ] Add journey-model and component tests proving Graph, plan, locks, lineage,
      evidence, and diagnostics are absent from the default frame and available
      under Advanced.
- [ ] Add characterization tests for current shell routing, state transitions,
      controller effects, Control Plane requests, and theme behavior before
      extracting the three monolithic files.
- [ ] Add information-architecture tests proving Workspace Home, Builder
      Workspace, and App Management are distinct contexts with one active
      navigation model at a time.
- [ ] Add template tests for search/category filtering, preview details,
      immutable version selection, independent Draft creation, retained origin,
      seed scenarios, no secret transfer, no update propagation, and immediate
      Draft Preview Snapshot creation.
- [ ] Add tests for bounded progress, one critical clarification, resume,
      recoverable phase failure, live preview, Edit, and Publish.
- [ ] Add Control Plane tests proving snapshot creation binds the current Draft
      revision immutably; edit makes it stale; start rejects stale/expired/
      disposed/checksum-mismatched snapshots; dispose cleans runtime resources;
      export/deploy/Compilation requests are impossible.
- [ ] Add Workbench tests proving Building/Live Preview displays snapshot
      revision/checksum state, creates a new snapshot after an edit, and invokes
      Publish independently against the current Draft rather than promoting the
      snapshot.
- [ ] Run Workbench tests and observe focused RED.
- [ ] Split `globals.css` into root imports/reset/tokens plus context-owned or
      colocated feature styles. Keep `globals.css` at or below 150 lines and
      each feature stylesheet at or below 300 lines unless the review records a
      single-responsibility exception.
- [ ] Split `use-workbench-controller.ts` into Workspace Home, Builder,
      Management, and Release controllers coordinated by a shell state machine;
      keep each controller at or below 300 lines and preserve characterized
      behavior.
- [ ] Split `control-plane-client.ts` into application, Draft, preview, release,
      and template clients with one bounded transport/error mapper; keep each
      responsibility at or below 300 lines.
- [ ] Replace active Workbench product copy, document title, metadata, and brand
      mark with Archeform/元象 while leaving internal package and protocol names
      unchanged. Generated products retain their own brand recipes.
- [ ] Implement the compact warm-neutral shell and building preview with concise
      product-language status and real actions for every visible control.
- [ ] Implement Workspace Home with equal `Describe a product` and `Start from
a template` entry points, application resume cards, and a curated template
      gallery; do not expose community publishing or template commerce.
- [ ] Implement the Builder as a persistent conversation/live-preview workspace
      with contextual Visual Edit and a compact top bar for Preview, Management,
      Code, test role/device, and Publish.
- [ ] Implement App Management with only backed Overview, Data, Users,
      Workflows, Integrations, Security, Code, Logs, and Settings destinations;
      do not render inactive Analytics, SEO, Domains, Agents, MCP, cloud, or
      Fleet controls.
- [ ] Verify no user-facing `Factory Pilot` remains in active Workbench routes,
      metadata, or new documentation; allow only historical, legal, package,
      and serialized protocol occurrences identified by an explicit scan.
- [ ] Remove decorative or redundant controls and move technical evidence to
      Advanced sheets.
- [ ] Run Workbench tests, typecheck, production build, viewport checks, and the
      prompt-to-restaurant fixture E2E.

**Verification:**

```powershell
pnpm --filter @factory/workbench test
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench build
pnpm exec playwright test e2e/prompt-to-restaurant-workbench.spec.ts
```

Expected: a non-technical user reaches the live dual-surface preview without
viewing or configuring Graph, database, capability, or runtime internals. The
preview is traceable to one immutable Draft Preview Snapshot and is never shown
as published, deployed, or exportable. A curated template reaches an editable
Draft preview within 30 seconds on the supported local acceptance environment.

---

### Task 7: Make Page, Data, Users, Workflow, and Experience contextual editors

**Files:**

- Modify: `apps/workbench/components/page-studio.tsx`
- Modify: `apps/workbench/components/journey/product-studio.tsx`
- Modify: `apps/workbench/lib/puck-page-model.ts`
- Modify: `apps/workbench/lib/product-journey/page-bindings.ts`
- Modify: `apps/workbench/components/canvases/domain-canvas.tsx`
- Modify: `apps/workbench/components/canvases/policy-canvas.tsx`
- Modify: `apps/workbench/components/flow-studio.tsx`
- Create: `apps/workbench/components/canvases/experience-canvas.tsx`
- Test: adjacent editor tests
- E2E: `e2e/restaurant-product-editing.spec.ts`

**Interfaces:**

- Consumes: Graph v2 Draft and Task 3 page recipes.
- Produces: constrained Graph operations and a selection context containing
  `surfaceKey`, `pageKey`, `blockId`, related entities, flows, and source files.

- [ ] Add Puck round-trip tests for a multi-region Menu page and merchant
      Dashboard, including nesting, bindings, variants, and responsive settings.
- [ ] Add context tests showing page selection synchronizes preview, block,
      related Data, Workflow, and source locations.
- [ ] Add mutation tests proving Data, Users, Workflow, and Experience edits
      append a Draft revision and never mutate a Published Graph.
- [ ] Run Workbench tests and observe RED.
- [ ] Implement page-recipe adapters and business-language model editors;
      Prisma, SQL, and Casbin previews remain Advanced.
- [ ] Run focused tests and an E2E that edits one menu card, one role grant, one
      order transition, and Fine Dining tokens, then republishes and recompiles.

**Verification:**

```powershell
pnpm --filter @factory/workbench test
pnpm exec playwright test e2e/restaurant-product-editing.spec.ts
```

Expected: all edits survive Puck/Graph round trips and produce a new Published
revision and Compilation without manual source repair.

---

### Task 8: Add Source Mode, controlled overlays, ZIP, and Git export

**Files:**

- Create: `packages/compiler/src/targets/source/source-manifest.ts`
- Create: `packages/compiler/src/targets/source/overlay.ts`
- Modify: `packages/compiler/src/core/generated-files.ts`
- Modify: `apps/workbench/components/canvases/code-canvas.tsx`
- Modify: `apps/workbench/lib/graph-exchange.ts`
- Modify: `packages/adapters/src/git/**`
- Test: `packages/compiler/test/source-overlay.test.ts`
- Test: `apps/workbench/components/canvases/code-canvas.test.tsx`
- Test: `apps/workbench/lib/graph-exchange.test.ts`
- E2E: `e2e/restaurant-source-export.spec.ts`

**Interfaces:**

- Consumes: Compilation artifacts and `SourceOverlayV1`.
- Produces: deterministic file/source manifest, generated-file diff, safe overlay
  merge, ZIP export, and Graph-first Git export.

- [ ] Add tests for complete file tree, page-to-file selection, search, source
      origin, deterministic ZIP/Git manifests, and secret/raw-model exclusion.
- [ ] Add adversarial tests rejecting path traversal, symlinks, absolute paths,
      generated-file writes, package files, stale baselines, and removed slots.
- [ ] Run focused compiler and Workbench tests and observe RED.
- [ ] Implement read-only generated files and writable
      `src/extensions/**`/declared slots with digest-bound conflict handling.
- [ ] Implement ZIP and Git export from the same checked manifest.
- [ ] Run focused suites and clean-checkout export acceptance.

**Verification:**

```powershell
pnpm --filter @factory/compiler test
pnpm --filter @factory/workbench test
pnpm exec playwright test e2e/restaurant-source-export.spec.ts
```

Expected: source is complete, inspectable, portable, and safe to recompile;
unsafe or stale overlay content fails closed.

---

### Task 9: Close the Restaurant Product with guarded real-model acceptance

**Files:**

- Create: `e2e/real-restaurant-product.spec.ts`
- Create: `docs/acceptance/prompt-to-polished-restaurant-product.md`
- Modify: `docs/acceptance/workbench-action-inventory.md`
- Modify: `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
- Modify: `docs/project-status.md`

**Interfaces:**

- Consumes: Tasks 1–8 from a clean checkout and an environment-only real-model
  key.
- Produces: bounded release evidence and an independent release decision.

- [ ] Start from an empty workspace and submit the canonical high-end restaurant
      prompt without fixture mode or Profile selection.
- [ ] Assert no more than one user-visible critical clarification and record
      phase durations; the entire prompt-to-runnable product must finish within
      30 minutes.
- [ ] Assert two surfaces and all fifteen required screens: customer Home, Menu,
      Dish Detail, Cart, Checkout, Orders, Order Detail, Profile; merchant
      Dashboard, Menu Management, Orders, Kitchen Queue, Tables, Users/Roles,
      Settings. Assert multi-block Puck trees, shared domain/policy/flow state,
      and materially non-CRUD customer and merchant journeys.
- [ ] Assert pre-Publish preview binds an immutable Draft Preview Snapshot;
      deploy/export/Compilation are rejected; Publish creates a distinct
      Published Revision; production compilation consumes that revision only.
- [ ] Run customer and merchant journeys, denials, idempotency, migration,
      health, audit, light/dark, keyboard, axe, contextual editing, republish,
      recompilation, preview, source lookup, ZIP/Git export, and cleanup.
- [ ] Inspect persisted state, evidence, generated files, screenshots, and logs
      for credentials and raw model material without printing any secret.
- [ ] Reproduce the fixture acceptance and all required suites from a frozen
      lockfile and clean checkout.
- [ ] Obtain task review, QA, and independent release review. Resolve every P0
      and P1 finding before PM changes the ledger to `accepted`.
- [ ] Commit and push the accepted slice; do not start deferred breadth work in
      the same change.
- [ ] Integrate the fully accepted iteration into `main` using the non-force
      process in `docs/delivery-policy.md`, rerun the release gate at the exact
      main commit, push `main`, push the planned annotated release tag, and
      create the GitHub Release when authenticated tooling is available. Do not
      represent this as a cloud deployment.

**Verification:**

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm format:check
pnpm exec playwright test e2e/real-restaurant-product.spec.ts
docker ps --filter "name=factory-preview-"
docker network ls --filter "name=factory-preview-"
docker volume ls --filter "name=factory-preview-"
```

Expected: all tests pass; preview resource listings are empty after cleanup;
acceptance evidence contains safe summaries and digests only.

## Final acceptance checklist

- [ ] The prompt-first happy path hides Graph and infrastructure mechanics.
- [ ] Active Workbench identity is Archeform · 元象; stable internal package,
      protocol, remote, history, and hash identifiers remain unchanged.
- [ ] The Workbench CSS, controller, and Control Plane client monoliths have
      been decomposed with characterization coverage and responsibility limits.
- [ ] Registry-backed primitives, patterns, blocks, screen recipes, experience
      recipes, and product recipes all carry complete contracts and evidence.
- [ ] One Graph drives customer mobile and merchant desktop surfaces.
- [ ] The product contains all fifteen required, separately surface-owned
      screens.
- [ ] Pre-Publish preview is bound to an immutable Draft Preview Snapshot and
      cannot be deployed, exported, or promoted into a Compilation.
- [ ] Production compilers consume only immutable Published Graphs.
- [ ] The restaurant product is deep enough to prove transactions, fulfillment,
      roles, and operations—not only CRUD.
- [ ] Page, Data, Users, Workflow, and Experience are editable as Draft changes.
- [ ] Generated source is complete, visible, deterministic, and exportable.
- [ ] Controlled overlays are conflict-aware and cannot mutate generated files.
- [ ] The final real-model run meets the clarification and 30-minute limits.
- [ ] Runtime, accessibility, security, deterministic, clean-checkout, and
      cleanup gates pass.
- [ ] PM ledger is `accepted` only after QA and independent release review.
