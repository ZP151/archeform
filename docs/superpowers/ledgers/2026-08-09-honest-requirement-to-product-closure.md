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
