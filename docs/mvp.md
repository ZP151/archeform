# MVP Contract: Trusted Component Compiler (V0)

## Hypothesis to prove

Enterprise delivery teams will allow a constrained system to turn a recurring internal-business requirement into an editable business model, a version-pinned list of approved components, replayable generation evidence, and a project blueprint.

The initial users are delivery teams with Git, cloud, and CI/CD assets, plus platform teams with template-governance needs. Factory Pilot does not compete to make arbitrary prompt-to-app output. It makes existing technical assets composable, governed, and reviewable.

## First Golden Path

Input: an English internal-workflow requirement.

Output: an `internal-workflow-app` Application IR, a component plan, a local project blueprint, and a validation record.

Reference requirement: an employee submits leave; a manager approves or rejects it; HR can view all records; every action creates an audit event. The generated target application is explicitly multi-user and role-based.

Next.js, FastAPI, PostgreSQL, and Docker Compose are declared target technologies only. The V0 control plane does not start the generated application.

## VNext successor

VNext is governed by ADR 002 and `docs/superpowers/plans/2026-07-25-vnext-requirement-to-product-workspace.md`. It replaces the fixed requirement normalizer with a schema-bound application-definition adapter, adds editable structured version history and explainable component-plan selection, and uses a separate local Executor for loopback preview evidence. V0 remains the compatibility baseline until VNext release evidence is accepted.

## P0 acceptance criteria

1. A standard leave requirement produces a valid `factory/v1alpha1` IR and stated assumptions.
2. An unapproved IR cannot create a plan, and an unapproved plan cannot create a run.
3. Every plan can reference only version-pinned internal manifests with `golden` status.
4. An approved plan creates an isolated directory containing IR, component BOM, README, and a controlled project skeleton.
5. Each run is traceable to its requirement, IR checksum, component versions, approvals, and events.
6. Path traversal, non-Golden components, and unapproved execution are rejected and covered by tests.

## Explicit non-goals

- Free technology-stack selection or direct execution of arbitrary text.
- Downloading or executing GitHub, npm, PyPI, container, or IaC content at runtime.
- Real OIDC, email, production CI/CD, cloud deployment, rollbacks, or AIOps.
- Multi-level or parallel approvals, legacy-system integration, multi-tenancy, or regulated workloads.

## Near-term deliverables

| Stage | Deliverable | Done when |
|---|---|---|
| Contract | IR, manifest, state machine, and security policy | Schema and rejection paths have tests |
| Control plane | Requirement, plan, approval, and run APIs | A fixed requirement creates a repeatable plan |
| Template | Leave-approval project blueprint | Output is readable and traces IR and BOM |
| Validation | Unit tests, API smoke checks, review checklist | Happy path and security regressions pass |
| Discovery | Autonomous desk research | A source-backed competitor map, buyer signals, and falsifiable positioning hypotheses are recorded |

## Success metrics

- Less than ten minutes from confirmed requirement to blueprint.
- 100% correct component selection on the standard path.
- 100% version pinning for Golden components in generated records.
- 100% traceability from every run to requirement, approval, and artifact.
