# P1 Governed Composition & Capability Foundry Ledger

**Goal:** Create a governed requirement-to-composition path and scale to 25–35
Foundry-verified capability families with a 100+ representative Profile recipe
catalogue.

**Design:** `docs/superpowers/specs/2026-08-07-governed-composition-capability-foundry-goal-design.md`

**Plan:** `docs/superpowers/plans/2026-08-07-governed-composition-capability-foundry.md`

## State vocabulary

```text
planned -> implementing -> ready_for_qa -> reviewed -> accepted
```

The PM alone advances a state. Any P0/P1/P2 finding, unexplained output drift,
unsafe proposal, missing two-Profile evidence, provenance gap, or secret
boundary violation returns the owning item to `implementing`.

## Baseline at dispatch

- P0 Compiler Target Plugin Kernel and P0 Isolated Verifier are accepted.
- Current source catalogue: 23 current capability families and 50 physical
  version directories. These are inventory counts, not Foundry-verified counts.
- Five starter Profiles are available. The profile recipe taxonomy has prior
  research but no authoritative `ProfileRecipeCatalogV1` yet.
- The active branch is `feat/governed-composition-capability-foundry`.

## Delivery trains

Train shape follows the Goal Design spec (six trains; Train B's completion
gate is "Control Plane APIs, Workbench review, fixture planner, guarded model
adapter").

| Train                     | Tasks                    | State        | Latest commit | Evidence                                             |
| ------------------------- | ------------------------ | ------------ | ------------- | ---------------------------------------------------- |
| A. Composition contracts  | 1                        | reviewed     | e13bef1       | RequirementSpec, plan, decision, recipe schema tests |
| B. Planner and review     | 2, 3, 4, 8               | ready_for_qa | 74e918d       | deterministic plan, Draft-only review tests, Control Plane APIs |
| C. Foundry quality system | 5                        | planned      | —             | family manifest, provenance, matrix, promotion tests |
| D. Capability batches     | 6                        | planned      | —             | 25–35 eligible families, two Profiles each           |
| E. Portfolio proof        | 7                        | planned      | —             | 100+ recipes, 12 compiled anchors                    |
| F. Release                | 9                        | planned      | —             | independent gates and final record                   |

## Iteration record

### 2026-08-08 — Task 1 (Train A) implemented: composition contracts

- New Graph contracts: `RequirementSpecV1`, `CompositionPlanV1`,
  `CompositionDecisionV1`, `CompositionClarificationV1`, `ProfileRecipeV1`,
  `ProfileRecipeCatalogV1`, plus shared fail-closed helpers
  (`composition-shared.ts`).
- RED: 9 failed | 114 passed on the three new suites; three test corrections
  recorded (stale-checksum bound at `assertPlanAgainstRequirement` time,
  catalog anchor/composable acceptance, graph-symbol existence).
- GREEN: `pnpm --filter @factory/graph test` — 141 passed (7 files);
  typecheck, prettier lint, and build all green.
- Commit `f97eafa` `feat(graph): define governed composition contracts`
  pushed to `feat/governed-composition-capability-foundry`; worktree clean.
- State: Train A `ready_for_qa`, awaiting independent task review and QA
  verdicts before `reviewed`.

### 2026-08-08 — Train A gate findings returned to `implementing`; repair committed

Independent task review (`TASK_REVIEW_PASS` at f97eafa) and behavioral QA
(`QA_FAIL` at f97eafa) surfaced six findings. Per the state vocabulary, any
P0/P1/P2 finding returns the owning item to `implementing`.

| ID | Severity | Finding | Repair |
| -- | -------- | ------- | ------ |
| QA-1 | P1 | Root-level `/integration` replace bypassed the second-segment guard and rewrote `assetLocks`/`compositionProfile` | Both guard mirrors now block whole-subtree `integration` operations (composition-plan.ts, index.ts) |
| QA-2 | P2 | `~1`-escaped prototype-key `add` path (`/page/~1__proto__`) evaded the literal segment check | Prototype check runs on decoded segments; any decoded segment containing `__proto__` is rejected |
| QA-3 | P2 | Prototype-key strings (`__proto__`, `constructor`, `prototype`) accepted as business text | Pattern rejects `__proto__` anywhere and full-string `constructor`/`prototype`; natural prose (e.g. "the prototype journey") still passes |
| TR-1 | P2 | Four nested requirement-spec item schemas were not `.strict()`; nested `rawModelResponse`/`prompts` were silently stripped | All nested item schemas are now exact-key |
| TR-2 | P2 | Scheme-less `www.`-prefixed domains accepted | Pattern now rejects `www.`-prefixed hosts; scheme-less bare placeholder domains remain allowed (documented boundary — inert text, and domain-qualified identifiers like `graph.domain.expense` must keep working) |
| TR-3 | P2 | Recipe binding rule was one-directional: a locked capability could have no binding requirement | Every locked capability must now declare at least one binding requirement |

Repair commit `67cf682` (`fix(graph): close composition fail-closed boundary
gaps`) adds 10 regression tests: graph `pnpm --filter @factory/graph test` —
151 passed (7 files), typecheck/lint/build green; proportional regression
`pnpm --filter @factory/capabilities test` — 282 passed, typecheck green.
Pushed; worktree clean. State: Train A `ready_for_qa`, pending re-verification
gates on `67cf682` before `reviewed`.

### 2026-08-08 — Train A re-verification P2 notes repaired at `7524e6b`

Re-verification on `67cf682` passed (`TASK_REVIEW_PASS`, `QA_PASS`) with P2
notes. Per the state vocabulary, any P2 finding returns the owning item to
`implementing`; the repair was committed.

| ID | Severity | Finding | Repair |
| -- | -------- | ------- | ------ |
| TR-4 | P2 | Plan-level guard tests passed for the wrong reason: the approved-decision fixture bound the safe Diff's checksum, so the checksum check fired before the path guard | The bad operations now ride inside the plan's own `proposedOperations`, so `parseCompositionPlan` exercises the guard directly at parse (composition-plan.test.ts) |
| QA-4 | P2 | Integration-root alias `add` paths (`/integration/`, `/integration/.`, `/integration/..`) passed the second-segment guard and were silently absorbed | Root checks now run over segments normalized by dropping empty/`.`/`..` segments (no validated Graph key can be one); aliases throw in both guard mirrors |
| QA-5 | P2 | `~1`-escaped prototype tokens (`/page/~1constructor`, `/page/~1prototype`) decoded to literal keys that passed the whole-segment check | The guard inspects every slash-decoded token, not only whole segments |
| QA-6 | P2 | Business-text case/whitespace variants (`Constructor`, `"constructor "`, `" prototype"`, `WWW.example.com`) parsed as inert text | Pattern is case-insensitive; full-string `constructor`/`prototype` rejections tolerate surrounding whitespace; natural prose still passes |

Repair commit `7524e6b` (`fix(graph): close composition guard alias, token,
and case gaps`) — graph `pnpm --filter @factory/graph test` 152 passed (7
files), typecheck/lint/build green; proportional regression
`pnpm --filter @factory/capabilities test` — 282 passed. Pushed; worktree
clean. State: Train A `ready_for_qa`, pending re-verification gates on
`7524e6b` before `reviewed`.

### 2026-08-08 — Task 2 (Train B) implemented: planner and admission

- New `composition-planner.ts`: `planComposition(requirement, catalog,
  baseDraft, repositoryRoot, assets)` deterministically resolves recipes
  against approved current assets — recipe scoring (2× scenario journeys +
  1× workflow journeys, stable catalog-order ties), golden-lifecycle locks,
  structural Graph-symbol bindings (requirement-named keys preferred),
  prefix-mapped output slots filtered to recipe surfaces, fixture-fragment
  operations (skip if the transition already exists), and dependency
  closure via the deterministic resolver. Unresolvable candidates return a
  bounded `CompositionClarificationV1` (no-provider, missing binding,
  no output slots, non-golden lifecycle, unknown version, no Graph change,
  duplicate questions capped at 30). Non-Draft bases throw.
- New `foundry-admission.ts`: pure browser-safe
  `evaluateFoundryAdmission(asset, evidence)` buckets
  `eligible/partial/quarantined/rejected` with sorted reason codes
  (rejected wins over quarantined over partial); `expectedFoundryLockDigest`
  hashes the canonical key-sorted lock identity with a self-contained
  FIPS 180-4 SHA-256, locked by a node:crypto known-answer test.
- RED: focused suites written first. GREEN: `pnpm --filter
  @factory/capabilities test` — 310 passed (22 files; 282 prior + 11
  planner + 17 admission); typecheck, prettier lint, and build green.
- Commit `3c1848c` `feat(capabilities): add governed composition planner`
  pushed; worktree clean apart from gate scratch probes.
- State: Train B `ready_for_qa`, awaiting independent gates before
  `reviewed`.

### 2026-08-08 — Train A re-verification P2 hardening notes repaired at `e13bef1`

Re-verification task review on `7524e6b` returned `TASK_REVIEW_PASS`
(SPEC PASS, QUALITY PASS) with three P2 hardening notes; the two
code-level ones were repaired, the third is an orchestration note.

| ID | Severity | Finding | Repair |
| -- | -------- | ------- | ------ |
| F1 | P2 | Path-guard exact-token list was case-sensitive while the business-text guard is case-insensitive: `/page/Constructor`, `/page/PROTOTYPE` passed | Token predicate lowercases before comparing in both guard mirrors; case variants now throw at plan parse and apply |
| F2 | P2 | `www.` boundary was `(^|\s)` so punctuation-adjacent hosts (`(www.example.com)`, `;www.x.com`) passed business-text validation | Boundary is now `(^|[^a-z0-9-])`; suffix words (`bwww.example.com`) still pass |
| F3 | P2 | Worktree hygiene: parallel gate scratch probes in the shared tree make suite counts vary run-to-run | Orchestration note, not a code defect; committed-state counts exclude probe files |

Repair commit `e13bef1` (`fix(graph): harden path-guard case handling and
www boundaries`) — graph `pnpm --filter @factory/graph test` 153 passed (7
files, probes excluded), typecheck/lint/build green; proportional
regression `pnpm --filter @factory/capabilities test` — 310 passed. Pushed.
State: Train A `ready_for_qa`, pending re-verification gates on `e13bef1`
before `reviewed`.

### 2026-08-08 — Train A release and PM gates PASS; Train B gate findings repaired at `64e954b1`

Train A closed its gate rounds at `e13bef1`:

- Independent task review: `TASK_REVIEW_PASS` at `e13bef1` (SPEC PASS,
  QUALITY PASS, no P0/P1/P2).
- Independent behavioral QA: `QA_PASS` at `e13bef1` — 153/153 graph tests,
  313/313 capabilities tests at head, typecheck and Prettier lint green.
- Independent release review: `RELEASE_REVIEW_PASS` at `e13bef1` — all six
  contracts export from the `@factory/graph` main entry and bind
  decision→plan→Diff→Draft by canonical SHA-256; the Application Graph
  remains the sole business authority (`/integration` whole-subtree and
  non-mutable roots blocked in both guard mirrors, Draft-only application);
  no AI, credential, or URL material in the range; regression green at head.
- PM gate: `PM_GATE_PASS` — Train A advances `ready_for_qa -> reviewed` at
  `e13bef1` and holds at `reviewed` (`accepted` awaits every delivery train).
- The P2 observation (committed graph `dist/` predating the `e13bef1`
  hardening) is addressed: a fresh build from committed source is green and
  the release train rebuilds both packages.

Train B gates at `3c1848c` independently failed on the same two P1
implementation defects (task review TRB-1/TRB-2; behavioral QA F1/F2).
Per the state vocabulary, the item returned to `implementing`.

| ID | Severity | Finding | Repair |
| -- | -------- | ------- | ------ |
| TRB-1 / F1 | P1 | `operationsFor` wrapped the fixture `readFileSync` in try/catch but called `JSON.parse(raw)` outside it — a malformed golden-asset fixture threw a raw `SyntaxError` instead of a bounded clarification | The parse and `transitionFragment` conversion now run inside the try; unreadable or malformed fixtures yield no fragment and the planner returns a schema-valid clarification |
| TRB-2 / F2 | P1 | `dependencyEdges` used a last-write-wins `Map<string, string>` — a `multiProvider` requirement silently dropped all but one provider edge from `dependencyGraph` | `Map<string, string[]>` collects every provider per interface identity; the plan artifact reports all of them, matching the resolver's dependency closure |

Repair commit `64e954b1` (`fix(capabilities): close planner fail-closed
fixture and multi-provider gaps`) also relaxes
`profileRecipeCatalogSchema.recipes` from `min(1)` to `max(500)` (empty
staged catalogues are legitimate: the planner answers them with a
schema-valid clarification instead of guessing). Fresh verification:
`@factory/capabilities` 313/313 (22 files; 310 + 3 regression tests),
`@factory/graph` 153/153 (7 files), typecheck, Prettier lint, and build
green. Pushed to `feat/governed-composition-capability-foundry`.
Behavioral QA re-verification at `64e954b1`: 35/35 behavior probes pass
(cross-process byte-identical determinism, plan validity and deep-freeze,
Draft-only boundary, clarification bounds at 30, fail-closed bindings,
fixture operations, multi-provider dependency closure, admission priority,
digest known-answer). State: Train B `ready_for_qa` at `64e954b1`, pending
re-verification task review before `reviewed`.

### 2026-08-08 — Task 3 (Train B) implemented: Control Plane plan review

`CompositionReview` persistence (schema + handwritten migration), the
deterministic planning seam (`COMPOSITION_PLANNER` backed by
`planComposition` with the staged empty catalogue), and the
`CompositionService`/`CompositionController` review boundary:
requirement creation (persisted-key redaction via strict
`parseRequirementSpec`), idempotent Draft-bound planning, clarification
storage, checksum-bound reviewer decisions, and application of only the
approved constrained Diff through the existing Draft lifecycle. Control
Plane suite 174/174 (16 files; +23 composition tests), typecheck, Prettier
lint, and build green. Commit `74e918d`
(`feat(control-plane): review governed composition plans`) pushed; worktree
clean. State: Train B `ready_for_qa` (Tasks 2–3), awaiting independent gates
on `74e918d` before `reviewed`.

## Required evidence per promoted family

| Evidence    | Required form                                                       |
| ----------- | ------------------------------------------------------------------- |
| Identity    | key, version, digest, owner, lifecycle, compatibility, deprecation  |
| Trust       | licence/provenance/source-study disposition                         |
| Composition | dependencies, binding schema, output slots, compatibility result    |
| Quality     | deterministic fixture, positive test, negative fail-closed test     |
| Generation  | declared compiler surfaces and exact generated outputs              |
| Reuse       | two immutable Profile locks plus two generated verification records |
| Portfolio   | one or more recipe-catalogue entries                                |

## Completion marker

`GOAL_COMPLETE` requires every delivery train accepted, 25–35 eligible families
with two-Profile evidence, at least 100 recipes, twelve compiled anchors, a
guarded real-model plan check, independent task review/QA/release/PM records,
a clean worktree, and remote-reachable commits.
