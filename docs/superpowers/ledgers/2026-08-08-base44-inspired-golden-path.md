# P1 Base44-Inspired Golden Path Ledger

**Goal:** Complete one low-friction, evidence-backed path from a business
requirement to a runnable local preview for the Expense Approval profile,
without editing source and without manually assembling capability locks.
Pause new capability families and vertical Profiles until the Golden Path
acceptance gate is green.

**Design:** `docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md`

**Plan:** `docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md`

## State vocabulary

```text
planned -> implementing -> ready_for_qa -> reviewed -> accepted
```

The PM alone advances a state. Any P0/P1/P2 finding, unexplained output drift,
unsafe proposal, provenance gap, or secret boundary violation returns the
owning slice to `implementing`.

## Baseline at dispatch

- Foundry P1 contracts and evidence are retained: 27 current capability
  families, 16 eligible, matrix `16/0/11/0`, three verified Profiles
  (expense-approval, simple-ecommerce, restaurant-ordering) with isolated
  verifier evidence. Batch 5 closed at `75d78da5`.
- Platform backbone in place: `RequirementSpecV1`, `CompositionPlanV1`,
  `CompositionClarificationV1`, `CompositionDecisionV1`, deterministic
  `planComposition`, Control Plane lifecycle + composition review + preview
  run APIs, Workbench Graph Studio with guided-creation drawer and
  scope-level Graph Diff.
- The active branch is `feat/governed-composition-capability-foundry`.

## Delivery slices

| Slice | Scope                                              | State | Latest commit | Evidence |
| ----- | -------------------------------------------------- | ----- | ------------- | -------- |
| S1    | Discuss mode: RequirementSpec brief + clarifications | planned | — | — |

## Slice records

### 2026-08-08 — Plan and roadmap

The approved design's `Required-Plan: pending design review` is satisfied:
`docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md` defines
eight test-first slices (S1-S8) over the verified existing surface; the
roadmap gains the **P1 Product Closure gate** ahead of the Foundry breadth
gates. S1 begins now.

## Completion marker

`GOAL_COMPLETE` requires the complete Expense Approval browser journey and the
generated application to pass acceptance: Discuss -> RequirementSpec -> plan
alternatives -> visual Graph Diff -> Draft -> role/data simulation -> Publish
-> Compile -> isolated verification -> preview and cleanup, with the
Workbench build, focused component tests, control-plane composition tests,
compiler tests, and Expense browser E2E green from a clean checkout, and all
slices committed and pushed.
