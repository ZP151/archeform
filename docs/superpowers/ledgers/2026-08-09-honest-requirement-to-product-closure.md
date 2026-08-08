# PM ledger — Honest Requirement-to-Product Closure

Goal authority: `docs/superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md`.
Branch: `feat/governed-composition-capability-foundry`. Iteration states use
`planned -> implementing -> ready_for_qa -> reviewed -> accepted`.

## 2026-08-09 — Task 1: Reopen product closure and pin the honest acceptance boundary

State: `implementing` (Task 1 RED record landed).

- The prior Base44-inspired Golden Path S8 evidence is retained as **fixed
  Expense replay evidence**; P1 Product Closure is **reopened** because the
  replay does not prove requirement-to-product generation (see
  `docs/acceptance/requirement-to-product-closure.md`, status correction).
- `e2e/golden-path.spec.ts` no longer clicks
  `guided-template-expense-approval`. It now pins two prompt-driven scenarios
  from an empty workspace:
  - **Prompt A — Expense Approval**: free-form brief -> `Requirement summary`
    containing expense/manager/finance; no template selection.
  - **Prompt B — Appointment Booking**: free-form brief -> `Requirement
    summary` containing appointment/service; no Profile/template UI on the
    primary frame at any point.
- RED evidence (2026-08-09, compose stack `factory-pilot` up):
  `pnpm exec playwright test e2e/golden-path.spec.ts --list` lists both
  scenarios; the focused browser run reports **2 failed** — both tests time
  out at `getByLabel('Requirement brief')` (element not found) because the
  empty-workspace requirement composer does not exist yet.
- Commit: `test(product): reopen requirement-to-product closure` (feee96bc).

## 2026-08-09 — Task 2: Transient requirement interpretation into bounded blueprints

State: `ready_for_qa` (unit suites green, browser acceptance pending).

- `ProductBlueprintV1` lands in `@factory/graph`
  (`packages/graph/src/product-blueprint.ts`): exact-key strict schemas for
  actors/permissions, entities/fields, page intents, workflows, and
  acceptance journeys; cross-reference validation; enum/reference shape
  pairing; checksum binding via `hashProductBlueprint`. Blueprint material
  may never carry routes, URLs, package keys, or providers — the schema
  rejects them (test-pinned).
- `RequirementInterpretationV1` contract in `@factory/adapters`
  (`requirements/requirement-interpreter.ts`): `{spec, blueprint,
  clarifications}`; `assertRequirementInterpretation` re-validates every
  adapter output and binds blueprint + clarifications to the exact
  `hashRequirementSpec`; `deriveClarifications` projects unanswered
  open questions into bounded clarification records.
- Two interpreters, same contract:
  - `FixtureRequirementInterpreter` — deterministic test authority for the
    two canonical acceptance briefs (Prompt A Expense Approval, Prompt B
    Appointment Booking) plus one vague brief exercising clarifications;
    unknown briefs fail closed `brief_invalid`. Nothing persisted.
  - `OpenAIRequirementInterpreterAdapter` — real provider path: strict
    JSON-mode response API, API key read from the local environment at call
    time, `store:false`, checksum always computed from the validated spec,
    every failure surfaced as a bounded `RequirementInterpreterError`.
- Evidence: `pnpm --filter @factory/graph test` 200/200 (10 new blueprint
  tests), `pnpm --filter @factory/adapters test` 44/44 (10 interpreter
  tests), adapters `tsc --noEmit` exit 0, prettier clean on all touched
  files. Blueprint hashes for Prompt A and Prompt B differ (material
  difference pinned in tests).
- Commit: `feat(requirements): interpret briefs into bounded product
  blueprints` (63ddc78c).

## 2026-08-09 — Task 3: Generic blank-Draft planning and Graph composition

State: `implementing` (deterministic planner + product closure service green;
workbench primary journey is Task 4).

- `createBlankApplicationDraft` in `@factory/graph`
  (`packages/graph/src/blank-application.ts`): a true blank Draft with no
  pages, entities, roles, flows, or composition selections — test-pinned.
  `hashProductCompositionDiff` in `composition-plan.ts`: scan-free canonical
  digest for composer-derived diffs (plans cannot carry route strings, so
  proposed operations never include `/page/pages/` ops).
- Deterministic product planner in `@factory/capabilities`:
  - `capability-catalogue.ts` — the approved capability catalogue: required
    crud/workflow/identity-policy/policy-declarations, optional
    audit/notification bound to approval decisions and workflow-driven
    effects. Only this catalogue may be selected; the model never chooses
    package paths or versions.
  - `plan-alternatives.ts` — `planProductAlternatives({requirement,
    blueprint, baseDraft})` derives `standard` and `minimal` alternatives
    over the blank Draft from the blueprint alone.
  - `product-composer.ts` — `composeProductDraft` produces the full
    GraphDiffV1 (routes `/page.key`, CRUD bound to first entity + primary
    list page, identity entities, status enums, audit/notification effects,
    seed data) plus `integration.compositionSelections`.
- `ProductCompositionService` in the control plane binds the honest flow:
  `createProductRequirement` (blank Graph + first revision + planning
  review, P2002 conflict), `requestProductPlan` (seam re-assertion, moved
  Draft guard, idempotent), `chooseProductPlan` (re-derives the full Diff
  via `composeProductDraft`; the approved decision binds
  `hashProductCompositionDiff`, never a plan carrier), `applyProduct`
  (re-derives at apply time, checksum must equal the approved decision,
  `assertPlanBindingsResolve` before `appendDraftRevision`). Raw model
  material never enters the store.
- Evidence: graph 205/205, capabilities 369/369 (13 new tests: 6
  plan-alternatives + 7 product-composer), control-plane 207/207 (18 new
  product composition tests), builds + typechecks exit 0, prettier clean on
  all touched files. `createExpenseApprovalPlanningBase` is absent from the
  product path.
- Commit: `feat(composition): compose product graphs from accepted
  requirements` (d517513).

## 2026-08-09 — Task 4: Make requirement creation the primary Workbench journey

State: `implementing` (journey green in unit/integration; browser acceptance
waits on Task 8 e2e replacement).

- The Workbench Home is now a requirement composer: free-form brief
  (textarea `Requirement brief`, 12 000 char bound) -> Interpret requirement
  -> clarifying questions -> deterministic plan alternatives -> Diff review
  (checksum-bound) -> Apply to Draft -> the composed product opens in the
  Page surface. `applyProduct` returns the composed Graph and the workbench
  adopts it through the same bootstrap path the portfolio uses (GET by key
  in `local-workspace`), so no duplicate application records are created.
- Journey state machine (`lib/product-journey/journey-model.ts`):
  `brief -> clarifying -> planning -> reviewing -> applied`, plus `failed`
  with bounded retryable errors; new guarded `reset` action (brief/applied/
  failed only) so the next product starts from a clean workspace. Open
  questions come from `interpretation.clarifications[].questions`; answers
  are transient, bounded to 64 chars each, pruned to the keys the current
  interpretation still asks about.
- Hook (`lib/product-journey/use-product-journey.ts`) owns the transient
  buffers (brief draft, answers) and every transition: submitBrief,
  answerQuestions (whole buffer re-interpret), createProduct, chooseAlternative
  (plan alternative key typed `ProductPlanAlternativeKey`), applyProduct,
  reset. Failures close with a bounded message; raw provider material never
  reaches the UI.
- Interpret route (`app/api/requirements/interpret/route.ts`): bounded
  request envelope (brief + optional answers, counts and lengths enforced),
  fixture interpreter under test, real `OpenAIRequirementInterpreterAdapter`
  otherwise with 503 fail-closed without a configured key. Fixed a latent
  wrong-subpath dynamic import (the `@factory/adapters/ai` subpath is the
  graph-proposal module and never exported the requirement adapter) — the
  route now imports the adapter statically from `@factory/adapters`.
- Removed the fixed Golden Path and guided-creation machinery from the
  workbench: `components/golden-path/` (build/discuss/plan/release/simulate/
  lineage panels, mode shell), `app/api/golden-path/plan/route.ts`,
  `components/guided-creation-drawer.tsx`, `lib/guided-application.ts`,
  `lib/profile-starters.ts`, `lib/guided-creation-model.ts` and their tests.
  Kept `lib/golden-path/timeline.ts` and `release-model.ts` for Task 8.
- Evidence: workbench 157/157 (21 journey-model + 11 interpret route + 10
  hook + 19 journey components + 13 home incl. full-`<Workbench>` tests),
  `tsc --noEmit` exit 0, prettier clean on `app components lib`.
  Control plane untouched this task: 207/207.
- Note: `e2e/workbench.spec.ts` and `e2e/generated-retail-grocery.spec.ts`
  still reference the removed guided-template flow; they are replaced under
  Task 8, and `e2e/golden-path.spec.ts` (Prompt A/B) is the live browser
  authority meanwhile.
- Commit: `feat(workbench): make requirement creation the primary journey`.

## 2026-08-09 — Task 5: Edit generated multi-page products through Puck

State: `done` (unit/integration green; production build green; browser
acceptance continues under Task 9).

- Compiler side: the composition page runtime round trip now emits the full
  edited page tree (projection of navigation + blocks), responsive theme
  tokens, and runtime renderers for every declared block type; the composer
  no longer emits undefined-entity bindings or closures that break the
  runtime projection. Prompt A and Prompt B each round-trip with edited
  headline, navigation, and layout in the generated bundle.
- The constrained studio edit layer (`lib/product-journey/page-bindings.ts`,
  14 tests): a pure, schema-validated op surface over a composed Draft —
  reorder/insert/delete/copy blocks (approved `insertableBlockTypes` only),
  bounded text props, entity binding to declared entities, page layout,
  design tokens (validated through `assertExperienceDesignSystem`, rejected
  values never echo), approved component variants, density, shell. No op can
  introduce routes, arbitrary components, CSS, scripts, packages, or source:
  the Graph schema and the approved catalogues close those doors.
- Studio UI: `page-tree.tsx` (tree + reorder + add page, 4 tests),
  `responsive-preview.tsx` (viewport preview that mirrors the compiler's
  `--factory-*` token emission, 3 tests), `page-studio.tsx` rewritten to a
  multi-page Puck canvas (per-page route/title, block select, entity binding,
  block actions, design panel), `product-studio.tsx` (tree | Puck | preview
  grid, 4 tests), and workbench wiring with `changeExperienceModel` so the
  Draft's declared design system is editable alongside its pages. New pages
  go through the constrained `addPage` op with forced navigation; there is
  deliberately no page-delete op (dangling navigation targets are out of
  scope for this task).
- Fixed a pre-existing production-build failure: the Task 2 interpret route
  exported helper functions Next's route validator rejects. The bounded
  envelope (`parseInterpretPayload`, `classifyInterpretationError`,
  `InterpretPayload`) moved to `lib/product-journey/interpret-payload.ts`;
  the route file now exports only its HTTP handler.
- Evidence: workbench 27 files/182 tests, workspace typecheck 16/16, prettier
  clean, `next build` green, full workspace suite 16/16 tasks (compiler
  342/342). No credential, prompt, or provider material touched this task.
- Commit: `feat(studio): edit generated multi-page products through Puck`.

## 2026-08-09 — Task 6: Generalize simulation and generated role journeys

State: `done` (unit/integration green; browser acceptance continues under
Task 9).

- The graph-driven simulator (`lib/product-journey/graph-simulator.ts`, 8
  tests): a pure walker over a composed Graph's declared flow scenarios.
  `startGraphSimulation(graph, scenarioKey)` snapshots the declared flow,
  its transitions (event/from/to/roles/effects), the policy roles and
  permissions, and seeds records from the Graph's own seed data at their
  declared stages; `dispatchGraphSimulationEvent` validates the event
  against the record's current stage, the firing role against the
  transition's declared roles (falling back to the declared policy
  permissions), records denials without moving the record, and captures the
  transition's declared capability effects in the journey history.
- The tests execute both acceptance journeys entirely from declared
  scenarios: Expense submit/approve (with the audit.record and
  notification.send effects the approval transition declares) and
  Appointment book/confirm/reschedule/cancel-requested/cancel, plus denials
  (manager cannot submit), the policy fallback for role-less transitions,
  and invalid event/stage and unknown record/scenario failures. A source
  test proves neither `graph-simulator.ts` nor `role-simulator.tsx`
  contains product identifiers or scenario switches of any kind.
- The role simulator panel (`components/journey/role-simulator.tsx`, 5
  tests): scenario select over the declared flows, seeded record with
  stage, only the events valid from the current stage (labelled with their
  declared roles), a fire-as-role select that surfaces denials, journey
  history with declared effects, and a reset. Mounted into the shell under
  Task 7.
- Generated role journeys: `renderJourneyTest` (extracted to
  `packages/compiler/src/journey-test-renderer.ts`) now also emits a
  denied-action test derived from the same declared scenario — the first
  event from the initial stage fired by a role the transition does not
  declare, asserting `cannot trigger` and that the record stays at the
  initial stage. The plan's `packages/compiler/src/targets/tests/*`
  location does not exist (runtime tests live in `packages/compiler/test/`);
  the generated file is `api/test/journey.generated.test.ts` in the bundle.
- Evidence: workbench 29 files/195 tests, compiler 21 files/346 tests
  (incl. new `test/role-journey-runtime.test.ts` proving Expense
  submit/approve/audit and Appointment book/reschedule journeys plus the
  denial tests derive from the composed Graphs and stay materially
  different), workspace typecheck 16/16, prettier clean. No credential,
  prompt, or provider material touched this task.
- Commit: `feat(simulation): execute role journeys from application graphs`.
