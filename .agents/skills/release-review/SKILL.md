---
name: release-review
description: Perform an independent, evidence-based Factory Pilot release review. Use after QA, before marking a slice complete, or when assessing correctness, security, and policy compliance of a change.
---

# Release review

Inspect the actual diff, relevant call paths, tests, and the threat model.

## Workflow

1. Identify changed behavior and applicable invariants.
2. Check for introduced correctness, security, data-handling, and approval-policy defects.
3. Verify that tests prove the claimed behavior rather than merely execute code.
4. Return actionable P0, P1, and P2 findings with file and line evidence, impact, and remediation direction.

Do not edit production files. If no blocking issue is found, state the scope of evidence reviewed.
