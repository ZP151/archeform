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

| Train                     | Tasks      | State        | Latest commit | Evidence                                                                     |
| ------------------------- | ---------- | ------------ | ------------- | ---------------------------------------------------------------------------- |
| A. Composition contracts  | 1          | reviewed     | e13bef1       | RequirementSpec, plan, decision, recipe schema tests                         |
| B. Planner and review     | 2, 3, 4, 8 | ready_for_qa | 74e918d       | deterministic plan, Draft-only review tests, Control Plane APIs              |
| C. Foundry quality system | 5          | reviewed     | 0ce7899b      | declared evidence registry, honest matrix, promotion policy, promotion tests |
| D. Capability batches     | 6          | planned      | —             | 25–35 eligible families, two Profiles each                                   |
| E. Portfolio proof        | 7          | planned      | —             | 100+ recipes, 12 compiled anchors                                            |
| F. Release                | 9          | planned      | —             | independent gates and final record                                           |

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

| ID   | Severity | Finding                                                                                                                    | Repair                                                                                                                                                                                                            |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-1 | P1       | Root-level `/integration` replace bypassed the second-segment guard and rewrote `assetLocks`/`compositionProfile`          | Both guard mirrors now block whole-subtree `integration` operations (composition-plan.ts, index.ts)                                                                                                               |
| QA-2 | P2       | `~1`-escaped prototype-key `add` path (`/page/~1__proto__`) evaded the literal segment check                               | Prototype check runs on decoded segments; any decoded segment containing `__proto__` is rejected                                                                                                                  |
| QA-3 | P2       | Prototype-key strings (`__proto__`, `constructor`, `prototype`) accepted as business text                                  | Pattern rejects `__proto__` anywhere and full-string `constructor`/`prototype`; natural prose (e.g. "the prototype journey") still passes                                                                         |
| TR-1 | P2       | Four nested requirement-spec item schemas were not `.strict()`; nested `rawModelResponse`/`prompts` were silently stripped | All nested item schemas are now exact-key                                                                                                                                                                         |
| TR-2 | P2       | Scheme-less `www.`-prefixed domains accepted                                                                               | Pattern now rejects `www.`-prefixed hosts; scheme-less bare placeholder domains remain allowed (documented boundary — inert text, and domain-qualified identifiers like `graph.domain.expense` must keep working) |
| TR-3 | P2       | Recipe binding rule was one-directional: a locked capability could have no binding requirement                             | Every locked capability must now declare at least one binding requirement                                                                                                                                         |

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

| ID   | Severity | Finding                                                                                                                                                             | Repair                                                                                                                                                             |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TR-4 | P2       | Plan-level guard tests passed for the wrong reason: the approved-decision fixture bound the safe Diff's checksum, so the checksum check fired before the path guard | The bad operations now ride inside the plan's own `proposedOperations`, so `parseCompositionPlan` exercises the guard directly at parse (composition-plan.test.ts) |
| QA-4 | P2       | Integration-root alias `add` paths (`/integration/`, `/integration/.`, `/integration/..`) passed the second-segment guard and were silently absorbed                | Root checks now run over segments normalized by dropping empty/`.`/`..` segments (no validated Graph key can be one); aliases throw in both guard mirrors          |
| QA-5 | P2       | `~1`-escaped prototype tokens (`/page/~1constructor`, `/page/~1prototype`) decoded to literal keys that passed the whole-segment check                              | The guard inspects every slash-decoded token, not only whole segments                                                                                              |
| QA-6 | P2       | Business-text case/whitespace variants (`Constructor`, `"constructor "`, `" prototype"`, `WWW.example.com`) parsed as inert text                                    | Pattern is case-insensitive; full-string `constructor`/`prototype` rejections tolerate surrounding whitespace; natural prose still passes                          |

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

| ID  | Severity | Finding                                                                                                                                         | Repair                                                                                                             |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| F1  | P2       | Path-guard exact-token list was case-sensitive while the business-text guard is case-insensitive: `/page/Constructor`, `/page/PROTOTYPE` passed | Token predicate lowercases before comparing in both guard mirrors; case variants now throw at plan parse and apply |
| F2  | P2       | `www.` boundary was `(^                                                                                                                         | \s)` so punctuation-adjacent hosts (`(www.example.com)`, `;www.x.com`) passed business-text validation             | Boundary is now `(^ | [^a-z0-9-])`; suffix words (`bwww.example.com`) still pass |
| F3  | P2       | Worktree hygiene: parallel gate scratch probes in the shared tree make suite counts vary run-to-run                                             | Orchestration note, not a code defect; committed-state counts exclude probe files                                  |

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

| ID         | Severity | Finding                                                                                                                                                                                                 | Repair                                                                                                                                                                        |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TRB-1 / F1 | P1       | `operationsFor` wrapped the fixture `readFileSync` in try/catch but called `JSON.parse(raw)` outside it — a malformed golden-asset fixture threw a raw `SyntaxError` instead of a bounded clarification | The parse and `transitionFragment` conversion now run inside the try; unreadable or malformed fixtures yield no fragment and the planner returns a schema-valid clarification |
| TRB-2 / F2 | P1       | `dependencyEdges` used a last-write-wins `Map<string, string>` — a `multiProvider` requirement silently dropped all but one provider edge from `dependencyGraph`                                        | `Map<string, string[]>` collects every provider per interface identity; the plan artifact reports all of them, matching the resolver's dependency closure                     |

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

### 2026-08-08 — Train B re-verification task review: two P2 notes repaired at `8bd6ff1`

Re-verification task review at `64e954b1` confirmed both P1 repairs
behaviorally (malformed-fixture clarification; multi-provider edges) and
returned `TASK_REVIEW_FAIL` with two P2 notes. Per the state vocabulary,
any P2 finding returns the owning item to `implementing`.

| ID       | Severity | Finding                                                                                                                                               | Repair                                                                                                              |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| TRB-P2-1 | P2       | Plan Task 2 checkpoint misattributed Train B hardening to `e13bef1` (Train A's commit); the actual repair `64e954b1` was never referenced in the plan | Task 2 checkpoint now reads `3c1848c`, repaired at `64e954b1` — TRB-1/TRB-2 (QA F1/F2) closed; capabilities 313/313 |
| TRB-P2-2 | P2       | Dead duplicate guard in `operationsFor`: `if (fragment === null) continue;` appears twice consecutively; the second branch is unreachable             | Duplicate line deleted                                                                                              |

Repair commit `8bd6ff1` (`fix(capabilities): remove dead planner guard;
correct plan attribution`) — `@factory/capabilities` 313/313, Prettier
lint green. Pushed; worktree clean. State: Train B `ready_for_qa` at
`8bd6ff1`, pending re-verification gates before `reviewed`.

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

### 2026-08-08 — Task 3 gate round: P1/P2 findings repaired at `fbdd4ce` + `507feca`

Task 3's gate round completed (task review PASS with two P2 findings;
behavioral QA FAIL with F-1/F-2). Per the state vocabulary, any P0/P1/P2
finding returns the owning item to `implementing`; the repair batch was
committed.

| ID    | Severity | Finding                                                                                                                                                                                                      | Repair                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-1   | P1       | `requestPlan` persisted URL/secret material riding operation-`value` objects (schema-unknown `z.unknown`): a plan or Diff with a `callbackUrl: https://…` value passed hashing and reached the prisma update | Deep value scan at the schema gate: `assertSafeCompositionOperationValues` walks every string leaf of `proposedOperations`/`diff.operations` against `unsafeMaterialPattern` inside `parseCompositionPlan` and `hashCompositionDiff`, so the service, apply re-hash, and the future guarded model adapter all fail closed; the error never echoes the offending material. Commit `fbdd4ce` |
| F-2   | P2       | `plan.requirementChecksum` was never verified at the seam — a plan bound to a foreign requirement could be stored and decided                                                                                | `requestPlan` now runs `assertPlanAgainstRequirement` + `hashCompositionPlan` + `hashCompositionDiff` before the prisma update, mapping `CompositionError` to a bounded `ConflictException("Composition plan rejected: …")`; nothing unsafe or foreign is ever persisted. Commit `507feca`                                                                                                 |
| TR-5  | P2       | `apply()` let `GraphDiffError`/`GraphSemanticError` from `applyGraphDiffToDraft` escape as raw 500s (e.g. an approved Diff targeting an out-of-range flow container)                                         | `apply()` catch maps all three error classes to `ConflictException("Composition application refused: …")`. Commit `507feca`                                                                                                                                                                                                                                                                |
| TR-6  | P2       | Tamper tests fired on mismatch-vs-null: planned-review fixtures defaulted `planChecksum`/`diffChecksum` to null, so status-guard tests would pass even if their named guards were deleted                    | Planned-review fixtures now bind the real `hashCompositionPlan(plan)`/`hashCompositionDiff(diff)`, including a rejected decision in the unapproved-apply fixture, and the exact guard messages are asserted. Commit `507feca`                                                                                                                                                              |
| QA-R1 | P2       | Stale `packages/capabilities/dist` predating `8bd6ff1`                                                                                                                                                       | `dist/` is gitignored/untracked; repair is a local rebuild only — both packages rebuilt from committed source before the suite runs                                                                                                                                                                                                                                                        |

Three new service boundary tests (unsafe values never reach the prisma
update, foreign requirement checksum refused before persistence, unresolvable
Diff surfaces as a bounded conflict): control-plane 177/177 (16 files; 174 +
3), graph 156/156 (7 files), capabilities 313/313, typecheck and Prettier
lint green. Both commits pushed to
`feat/governed-composition-capability-foundry`; worktree clean. State: Train
B `ready_for_qa` at `507feca`, pending re-verification gates on `507feca`
before `reviewed`. Train A's reviewed record is re-confirmed at release
gates: the shared guard change (`fbdd4ce`) is additive to `e13bef1` and the
full graph suite at head is green.

### 2026-08-08 — Task 3 re-verification: RV-1/RV-2 repaired at `a8914d0`

Re-verification task review at `38618ad` returned `TASK_REVIEW_PASS` with
two new P2 findings in the shared scan boundary (both inside the repair
range); behavioral QA at `38618ad` returned `QA_PASS` (19/19 probes, no
findings) and explicitly deferred the in-flight boundary changes to this
round. Per the state vocabulary, the P2s return Train B to `implementing`;
the repair was committed at `a8914d0`.

| ID   | Severity | Finding                                                                                                                                                                                                                                                                                    | Repair                                                                                                                                          |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| RV-1 | P2       | `unsafeMaterialPattern`'s negative lookahead used `.*`, which cannot cross line terminators: a URL, `www` host, or `__proto__` token on any line after the first evaded both the operation-value scan and `safeBusinessTextSchema` (`"ok\ncallback https://evil.example.com"` tested safe) | Lookahead scan widened to `[\s\S]*` so every line of multi-line values and prose is covered; one-character pattern change closes both surfaces  |
| RV-2 | P2       | `walkUnsafeValue` scanned string leaves only; object keys inside an operation value were never tested, so `__proto__`, `constructor`, `prototype`, URL, or path material as a key passed (data-only impact — no prototype mutation, since mutation keys come from path-guarded pointers)   | The walker now tests every walked object key with the same pattern before descending; prototype-key, URL, and path keys fail closed like leaves |

Regression tests (RED confirmed by the gate's verified repros, GREEN at the
repair): multi-line URL/www/`__proto__` value leaves rejected while clean
multi-line prose parses; multi-line business text with a URL rejected;
`__proto__` (built via `JSON.parse`, since a literal would set the prototype
rather than an own key), `constructor`, nested `prototype`, and URL object
keys inside values rejected. graph 159/159 (156 + 3), capabilities 313/313,
control-plane 177/177 against the rebuilt dist, typecheck and Prettier lint
green. Commit `a8914d0`
(`fix(graph): close multi-line and value-key material gaps (RV-1/RV-2)`)
pushed; adapters package work (Task 4) remains uncommitted in the worktree
and is owned by its own train. State: Train B `ready_for_qa` at `a8914d0`,
pending re-verification gates on `a8914d0` before `reviewed`.

### 2026-08-08 — Task 3 re-verification round 2: NEW-1 repaired at `f337174`

Re-verification task review at `50b0e23` returned `TASK_REVIEW_PASS` with
one new P2: on an object-key failure the value walker passed
`[...keyPath, key]` to the fail callback, so the offending key itself
(`__proto__`, a full URL) was echoed verbatim in the rejection message and
its mapped 409 — the "error never echoes the offending material" property
(F-1/RV-2) held for leaves but not for the RV-2 key surface. No test
asserted non-echo for keys. Per the state vocabulary the P2 returns Train
B to `implementing`.

| ID    | Severity | Finding                                                                                                                        | Repair                                                                                                                                                                                                                                                                                                                                    |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEW-1 | P2       | Key failures joined the offending key into the message (`carries unsafe material in '__proto__'`; a URL key appeared verbatim) | The walker now fails with the container keyPath only — a failing key is itself the material, so only its location is named; safe leaf keys may still appear in the path. Regression test asserts both rejections match `/carries unsafe material/` and contain neither token verbatim. Commit `f337174` (+ `ed82b17` Prettier formatting) |

graph 160/160 (159 + 1), capabilities 313/313, control-plane 177/177
against the rebuilt dist, adapters 34/34, typecheck and Prettier lint
green. Pushed; worktree clean. State: Train B `ready_for_qa` at `ed82b17`
(Tasks 2–3 landed), pending re-verification gates on `ed82b17` before
`reviewed`.

### 2026-08-08 — Task 3 accepted: both re-verification gates pass at `342b19c`

Independent task review at `342b19c` returned `TASK_REVIEW_PASS` with no
findings: NEW-1 verified closed (walker fails key hits with the container
keyPath only — `composition-shared.ts:123`; regression test
`composition-plan.test.ts:659-698` would fail pre-repair); RV-1/RV-2 hold
at HEAD (`[\s\S]*` lookahead byte-verified against `38618ad..342b19c`,
anchored alternatives unchanged); F-1/F-2/TR-5/TR-6 hold; guard order
intact (decide idempotency → status → draftId → planChecksum →
diffChecksum); path-guard logic 0-line diff since `e13bef1`; Train A
additivity confirmed (all three repair commits strictly narrowing — no
previously-rejected input accepted); suites graph 160/160, capabilities
313/313, control-plane 177/177, adapters 34/34; worktree byte-clean, HEAD
unmoved.

Independent behavioral QA at `342b19c` returned `QA_PASS` (27/27 probes,
no findings): multi-line URL/www/`__proto__` leaves and business text
refused at requestPlan and at the stored-diff hash (no update, no
`appendDraftRevision`); `__proto__` (JSON.parse-built own key),
`constructor`, nested `prototype`, and URL object keys refused at both
surfaces; rejection messages match `/carries unsafe material/` and never
echo `__proto__`, the URL, or `www.` (container-only naming); F-1/F-2/TR-5
re-probed green; all six TR-6 guards fire by their exact messages;
redaction holds; clean E2E persists only safe material and applies through
`lifecycle.appendDraftRevision`.

Per the state vocabulary the PM alone advances a state: the PM records
Train B Task 3 `ready_for_qa -> reviewed` at `342b19c` (Tasks 2–3
reviewed; ledger sections above cite every repair round).

### 2026-08-08 — Task 4 (Train B) implemented: constrained planning adapters

`CompositionPlannerAdapterV1` seam over the existing deterministic
authority, delivered in two commits:

- `50b0e23` (`feat(adapters): add constrained composition planning
adapters`) — `DeterministicCompositionPlannerAdapter` (the structured
  brief must parse as an exact RequirementSpecV1; the plan then comes
  entirely from `planComposition` over the approved assets — it never
  invents selections, versions, bindings, paths, or operations) and
  `OpenAIConstrainedCompositionPlannerAdapter` (strict-JSON-schema model
  output; every authoritative part — locks, bindings, slots, operations,
  checksums, complexity — must equal the deterministic planner's
  resolution; lock versions must be approved assets; business text must
  pass the unsafe-material boundary; any divergence, unknown version,
  unsafe material, or transport failure returns a bounded
  `CompositionPlannerError` with a fixed error-code vocabulary; the API
  key is read from the environment at call time and never persisted).
  `@factory/capabilities` now type-exports `CapabilityAssetV1` from the
  node entry. 14 new tests (4 deterministic, 10 OpenAI); adapters 34/34,
  typecheck, Prettier lint, and build green.
- `34b81ed` (`feat(control-plane): bounded provider failures and AI
boundary tests`) — the `COMPOSITION_PLANNER` seam maps a provider's
  bounded `CompositionError` to `ConflictException("Composition planning
failed: …")` instead of a raw 500 (nothing persisted on the failure
  path); `composition-ai-boundary.test.ts` pins the AI boundary at the
  seam: only the constrained projection of a schema-valid proposal is
  persisted (safeSummary carries no free-form text; every stored key and
  leaf walks clean of raw prompt/response/credential keys and unsafe
  material), clarifications store without re-planning (idempotent), a
  throwing provider maps to the bounded conflict, and a provider plan
  carrying unsafe business text is refused before persistence.
  control-plane 181/181 (177 + 4).

State: Train B Task 4 `ready_for_qa` at `34b81ed`, pending independent
gates before `reviewed`.

### 2026-08-08 — Task 4 gate round: QA-1/QA-2 repaired at `52432a6b`

The independent task review returned TASK_REVIEW_PASS with no findings at
`57f68eb` (adapters 34/34, graph 160/160, capabilities 313/313, control-plane
181/181; every gate invariant cited). The sequential behavioral QA gate then
returned QA_PASS (28 probes, all deleted) with two P2 seam-hardening notes on
the Task 3-reviewed graph boundary — per the state vocabulary both findings
returned Task 4 to `implementing`:

- **QA-1 (P2)** — operation path strings were never scanned against the
  unsafe-material boundary: a provider plan with a URL embedded in a
  `proposedOperations` path (clean value) passed `parseCompositionPlan` and
  persisted through the seam (`assertSafeCompositionOperationValues` scans
  values only). Reachable only through a hypothetical non-deterministic
  provider at `COMPOSITION_PLANNER` (production wiring and both in-scope
  adapters take operations exclusively from `planComposition`).
- **QA-2 (P2)** — two rejection surfaces echoed offending material: zod
  strict's unrecognized-key message named each offending key verbatim, the
  invalid-enum message named the received value, and the mutable-root
  rejection quoted the whole path (breaking the F-1/NEW-1 non-echo property
  on the seam's 409 messages).

Repair at `52432a6b` (`fix(graph): scan Diff paths for material and never
echo rejected material`):

- `unsafeCompositionDiffPathPattern` — a pointer-specific scan
  (URL schemes, Windows drive roots, `__proto__`, `www` hosts; the
  business-text pattern cannot apply verbatim because every legitimate
  pointer starts with `/`, which the text pattern rejects; `..` traversal
  remains the structural alias handled by the pointer root guards). Applied
  on the raw string at the top of `assertSafeCompositionOperationPath` and
  added to `hashCompositionDiff` so a Diff clears the same path guards as a
  plan's proposed operations. The failure message is fixed and never echoes
  the path.
- `parseStrict` replaces `unrecognized_keys` and `invalid_enum_value`
  issue details with fixed failure-class text (the container path still
  names where); the mutable-root rejection no longer quotes the path.
- Seven new graph tests (RED: 5 failed | 33 passed) covering URL-in-path
  non-echo, Windows drive roots, Diff-hash path guarding, clean-pointer
  preservation (including `/metadata/name` and `/experience/theme/mode`),
  unknown-key/`__proto__`-key non-echo, enum-value non-echo, and the fixed
  outside-root message; one new seam test (RED: 1 failed | 4 passed)
  proving a URL-in-path provider plan is refused with nothing persisted.

Additivity vs the Task 3-reviewed boundary (`e13bef1`): the path scan is
monotone — it only fails paths that already carried material forbidden by
the Task 3 vocabulary — and the message changes only remove material from
error output; no message any test asserts changed (no test asserted the
previous strings; verified by grep). Fresh verification: graph 167/167,
control-plane 182/182 (177 + 4 + 1), adapters 34/34, capabilities 313/313,
typecheck, Prettier lint, and build green; graph `dist/` rebuilt so the
control plane resolves the repaired boundary.

State: Train B Task 4 `ready_for_qa` at `52432a6b`, pending re-verification
gates before `reviewed`.

### 2026-08-08 — Task 4 gate round: QA-4-1 repaired at `7ab4c5ed`, closed at `1d9865d`

The re-verification task review returned TASK_REVIEW_PASS with no findings
at `52432a6b`, but the sequential behavioral QA gate returned **QA_FAIL
with one P0 (QA-4-1)**: `~1`-escaped material decodes to a URL after the
raw-string scan — `/experience/theme/tokens/https:~1~1evil.example.com`
carries no literal `://`, yet its decoded segment is a URL. The QA proved
the whole chain: the plan parsed, the Diff hashed, the seam's `requestPlan`
**persisted** the escaped leaf, `applyApprovedComposition` **applied** it
into the `experience.theme.tokens` record surface (`{"https://evil.example
.com":"injected"}`), and the apply-time rejection echoed the decoded URL.
Percent-encoded schemes also passed parse and hash. The decode-then-scan
principle had been applied to prototype tokens only (`e13bef1`-era) — never
to URL/drive/host material.

Repair at `7ab4c5ed` (`fix(graph): scan decoded Diff path segments for
escaped material`): both path guards re-join the decoded segments (no
leading `/`) and scan them with the same `unsafeCompositionDiffPathPattern`
— `assertSafeCompositionOperationPath` (closes plan parse, Diff hash, the
seam's requestPlan, and decision application) and the raw-boundary mirror
`assertPermittedDiffPath` in `index.ts` (closes `applyGraphDiffToDraft`,
which previously applied both escaped AND unescaped URL paths). RED
evidence: graph 5 failed | 168 passed, seam 1 failed | 5 passed. Fresh
verification: graph 173/173, control-plane 183/183, adapters 34/34,
capabilities 313/313, typecheck, Prettier, build green; graph `dist/`
rebuilt.

Task review at `7ab4c5ed` returned TASK_REVIEW_PASS with one P2
(QA-4-1-R1): no committed test pinned the positive `~1`/`~0` decode case,
so a future decode regression or over-rejection would go uncaught.
Repaired at `1d9865d` (test-only): parse+hash pins for `a~1b` → `a/b` and
`a~0b~1c~0d` → `a~b/c~d`, and an apply pin asserting the decoded keys land
in the record surface. The closing task review TASK_REVIEW_PASS with no
findings verified the pins by mutation — removing the `~1`/`~0` replacement
makes the apply pin fail while the parse/hash pins still pass (catching a
broken decode), and an over-rejecting guard makes the parse/hash pins fail.

Final behavioral QA at `1d9865d`: **QA_PASS** — 24 probes (13 graph + 8
control-plane + 3 adapters), all green, all deleted. `~1`-escaped URLs,
scheme splits, multi-escapes, mixed raw+escaped, escaped drive roots, and
escaped URLs on a second line refused at every entry (parse, hash, seam,
decision apply, raw boundary) with the byte-exact fixed message and zero
echo; `~0`-split (`https:~0~0evil` → `https:~~evil`) and `www~1evil.com`
(→ `www/evil.com`) decode to inert forms the `e13bef1`/TR-2 boundary allows
— the real attack class is fully refused; positive escapes and clean
pointers apply end-to-end through a decision+plan+diff triple and the seam
E2E; non-echo byte-exact on all four rejection classes; tampered
material-path diffs can never match a decision checksum; the deterministic
adapter stays byte-identical across identical briefs. Suites at final HEAD:
graph 175/175, control-plane 183/183, adapters 34/34, capabilities 313/313.
Additivity vs `52432a6b` and `e13bef1`: strictly narrowing — the decoded
scan only rejects pointers whose decoded segments carry material the
vocabulary already forbids; diff 52432a6b..1d9865d touches only the two
guards plus tests and docs.

**The PM records Train B Task 4 `ready_for_qa -> reviewed` at `1d9865d`**:
both re-verification gates closed with no findings at final HEAD — task
review TASK_REVIEW_PASS (QA-1/QA-2/QA-4-1/QA-4-1-R1 all verified closed,
additivity confirmed) and behavioral QA QA_PASS (24 probes, no findings).
The guarded-AI boundary holds: schema-valid proposals only through the
environment-only credential boundary, deterministic authority intact,
nothing unsafe persists, applies, or is echoed. Train B Tasks 2–4 are
`reviewed`.

### 2026-08-08 — Task 5 implementation round: evidence registry and matrix

TDD run: RED before implementation (11 failed | 0 passed — the two new test
files could not even resolve the not-yet-written modules). Implemented at
`b59f8645`: `foundry-evidence.ts` (declared evidence registry: 23 literal
records, each
bound to the exact key/version/manifest-digest of a current family and
carrying the shared first-party policy fields — MIT licence, first-party
provenance, factory-platform owner, two-minor-version deprecation notice,
major-version compatibility declaration — with `profileLocks` starting
empty) and `foundry-matrix.ts` (`buildFoundryMatrix`: exactly one row per
current family; verdicts `eligible/partial/quarantined/rejected/
missing-evidence/stale-evidence/duplicate-evidence`; counts always sum to
rows; rows sorted stably by key; never counts aliases, historical versions,
or retired families). Docs `docs/foundry/capability-matrix.md` (source-free
public summary) and `docs/foundry/promotion-policy.md` written.

Honest matrix outcome, verified by a debug probe against the built dist
then pinned in the suite: all 23 declared digests match their current
assets, yet **zero families are eligible**. 9 families are quarantined for
`fewer-than-two-profiles` (they satisfy the manifest-side admission checks —
binding contract, verification, fixtures, contract tests, output slots —
but hold no verifier locks; commerce.money-pricing, commerce.order-operations,
core.identity-policy, core.policy-declarations, restaurant.cashier,
restaurant.kitchen, restaurant.ordering, restaurant.reporting,
restaurant.table-session). 14 families are **rejected for
`missing-binding-contract`**: their current manifests do not declare a
binding contract at all (core.audit, core.crud, core.notification,
core.workflow, core.identity-context, core.location-context, commerce.catalog,
commerce.cart, commerce.line-configuration, commerce.inventory,
commerce.inventory-ledger, commerce.order, commerce.simulated-payment,
restaurant.menu). The matrix surfaced a manifest-readiness gap that Train D
(Task 6) must repair before any promotion evidence can apply — this is the
honest state and the matrix's job.

Fixture lesson from the RED-to-GREEN round: evidence locks are bound to the
family identity digest, so a record fixture must compute lock digests per
target asset — a cross-bound lock is stale evidence and correctly
quarantines the family (the initial test asserted an inflated 2 eligible;
the honest verdict is the correct one). Suite at final state: capabilities
327/327 (24 files), graph 175/175, control-plane 183/183, typecheck and
Prettier green.

### 2026-08-08 — Task 5 gate round: QA_FAIL with two P2 immutability gaps, repaired

The task-review gate returned TASK_REVIEW_PASS with no findings (23/23
declared digests independently verified against the on-disk manifests and
the registry alignment test; honest 9/14 split reproduced from the
admission predicates; docs match the matrix; capabilities 327/327). One
doc-drift observation (plan Interfaces line named `FoundryEvidenceV1`;
implemented type is `FoundryFamilyEvidenceV1`) was aligned at `5473726`.
The sequential behavioral QA gate then returned **QA_FAIL with two P2
findings (QA-1, QA-2)**: the declared registry's array was frozen but its
record elements were mutable at runtime (`record.licence = …` succeeded),
and the matrix output (`rows`, every row, `reasonCodes`, `counts`) was not
runtime-frozen — strict-mode assignments silently rewrote verdicts. TS
`readonly` alone was compile-time-only. Repaired with the established
module-local `deepFreeze` idiom (already used in composition-planner.ts and
composition.ts): each declared record is deep-frozen in `declareFamily`,
and `buildFoundryMatrix` returns a deep-frozen result. Two new runtime pins
(after RED: 2 failed | 14 passed) assert `Object.isFrozen` on the registry,
every record and its profile-lock array, the matrix rows/counts/reason
codes, and that strict-mode assignment to `counts` throws. Suite at final
state: capabilities 329/329 (24 files; 327 + 2 pins), graph 175/175,
control-plane 183/183, typecheck, Prettier, and build green.

### 2026-08-08 — Task 5 gate round closed: PM records `ready_for_qa -> reviewed`

**The PM records Train C Task 5 `ready_for_qa -> reviewed` at `0ce7899b`**:
both independent gates closed with no findings at final HEAD. Task review
TASK_REVIEW_PASS (23/23 declared digests independently verified against the
on-disk manifests; honest 9-quarantined/14-rejected split reproduced from
the admission predicates; docs match the matrix exactly; one doc-drift
observation aligned at `5473726`). Behavioral QA re-verification QA_PASS —
35/35 probes (QA-1/QA-2 mutation attempts throw and leave state
byte-identical; honest counts exact; six synthetic boundaries; determinism;
suite 329/329, tsc clean; probe files deleted, worktree byte-clean). The
Foundry evidence matrix is the deterministic promotion authority: zero
families are claimed eligible until real two-Profile verifier evidence and
the Task 6 manifest repairs land. Train C is `reviewed`.

### 2026-08-08 — Task 6 Batch 0 implemented: manifest readiness repair

**The Task 6 Batch 0 manifest repair lands** (all 23 current families now
declare the strict `factory.capability-binding/v1` contract):

- **Contract extension (generic, capability-agnostic):** `composition.ts`
  gained one bounded value-selection input type (`message.template`),
  paired with manifest-declared enum parameters whose allowed values are
  bounded by the manifest itself — so no caller can inject an arbitrary
  selection. Graph-symbol parameters reject `message.template` pairing.
  Bounded enum parameters pair only with `message.template`.
- **Manifest conformance:** all 23 manifests satisfy the strict contract —
  parameters/inputSchema key-identity, `domain.field` owners with declared
  field types, and the declared `domain.entity`/`page.page`/`policy.role`/
  `flow.flow` shapes. Of the 14 families repaired: 10 were aligned 1:1
  (core.audit, core.crud, core.workflow, core.location-context,
  commerce.catalog, commerce.cart, commerce.inventory,
  commerce.inventory-ledger, commerce.order, commerce.simulated-payment);
  `core.notification` gained its `recipientRole` input alongside the
  bounded-enum `template` parameter; `restaurant.menu` gained its mirror
  graph-symbol parameters; and `core.identity-context` with
  `commerce.line-configuration` already satisfied the strict contract,
  receiving bindingContract declarations only.
- **Binding values:** profile bindings for `domain.field` parameters now
  carry the owning entity symbol plus `fieldKey` (`stock`/`code`), matching
  the shape the compiler renderer already substituted (`{{fieldKey}}`
  generated output is byte-identical).
- **Digests recomputed and re-synced:** all 23 `manifestDigest` values
  recomputed (canonical JSON minus digest) and re-pinned in the TS assets,
  on-disk `component.json` packages, and the 14 declared evidence records
  in `foundry-evidence.ts`. The package-local `restaurant.menu` adapter.json
  gained its parameters slice.

**Observed results:** capabilities suite repaired from 101 failed to
**329/329 passing**; the five remaining failures after the binding repair
were all honest pin updates (composition-planner digest, foundry-matrix
quarantine split 9+14 → 23+0, overlap test supplied valid menu bindings so
the undeclared-provider overlap — `inventory.adjust` — remains the reason
for rejection, and the menu adapter parameters slice). Foundry matrix now
reports the honest post-repair state: **zero eligible, 23 quarantined
(`fewer-than-two-profiles`), 0 rejected** — no family claims two-Profile
proof until real verifier evidence lands (Batch 2).

**Workspace regression:** graph, capabilities, compiler, compiler-worker
(163/163 incl. the four published order-operations compilations),
control-plane, adapters, external-intake, intake-cli, and portfolio-public
build and test green (7 test tasks replayed from turbo cache — inputs
unchanged); the generated-notification-outbox runtime verification passes
(1 pending drained, 1 delivered — `bindings.template` runtime consumption
intact). Two workbench issues are verified **pre-existing** (both
reproduced in a scratch worktree at the accepted Task 5 HEAD `e9a09241`
with zero Batch 0 changes): the Next.js production build fails on this
machine with `UnhandledSchemeError: node:crypto`, and one workbench Home
test (fetch-mocked, no capabilities dependency) timed out at 5 s under the
10-package concurrent suite with a Windows tinypool `kill EPERM` teardown
crash — the workbench suite passes 73/73 when run alone. Repo-wide
`format:check` reports 110 pre-existing prettier drift files (tooling
under `.agents/`); the 47-file Batch 0 change set is prettier-clean with
zero overlap. The isolated-verifier expense record pins pre-repair digests
by design; Batch 2 re-runs the Docker verifier loop and regenerates the
evidence records.

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
