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
