---
name: evidence-testing
description: Validate a Factory Pilot product slice with reproducible functional, regression, and adversarial evidence. Use after implementation, before a milestone gate, or when investigating a suspected behavior gap.
---

# Evidence testing

Read the slice acceptance criteria and the safety invariants before testing.

## Workflow

1. Run the repository quality gates in `AGENTS.md`.
2. Exercise both the approved happy path and the relevant rejected path.
3. Add a focused deterministic regression only when a concrete gap is demonstrated.
4. Report exact commands, results, uncovered risks, and whether the acceptance criteria are met.

Do not convert a test failure into a product-code change unless assigned as the engineer.
