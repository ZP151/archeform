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

| Train                     | State        | Target commit | Evidence                                             |
| ------------------------- | ------------ | ------------- | ---------------------------------------------------- |
| A. Composition contracts  | ready_for_qa | f97eafa       | RequirementSpec, plan, decision, recipe schema tests |
| B. Planner and review     | planned      | —             | deterministic plan and Draft-only review tests       |
| C. Foundry quality system | planned      | —             | promotion matrix and rejection evidence              |
| D. Capability batches     | planned      | —             | 25–35 eligible families, two Profiles each           |
| E. Portfolio proof        | planned      | —             | 100+ recipes, 12 compiled anchors                    |
| F. Guided Workbench flow  | planned      | —             | browser flow and role simulation evidence            |
| G. Release                | planned      | —             | independent gates and final record                   |

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
