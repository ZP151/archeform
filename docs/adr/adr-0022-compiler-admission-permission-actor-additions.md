---
title: "ADR-0022: Compiler Admission of Restaurant Permission and Actor Additions"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "compiler", "graph", "permissions", "actors", "admission"]
supersedes: ""
superseded_by: ""
---

# ADR-0022: Compiler Admission of Restaurant Permission and Actor Additions

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** additively — extend the Restaurant V3 compiler's
allowed-delta admission so it admits Graph-valid additions to
`policy.roles`, `policy.permissions`, `flows`, and `journeys` (bounded, deny-
by-default, and hash-pinned elsewhere), which is the remaining prerequisite for
the Workbench Access and Workflow contextual editors.

**Accepted on 2026-08-14** under the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。`.

PM/controller confirms the condition is met. The slice is bounded, additive,
reversible, and inside the accepted Restaurant scope. It changes no Graph,
Capability, Recipe, schema, dependency, provider, network, service, Docker,
Compose, or deployment contract. No new founder prompt is required.

## Founder Decision Record

- **Decision:** Accepted
- **Date:** 2026-08-14
- **Source:** founder standing instruction
- **Exact response:** `参考以下总结，若符合项目目标，则持续接受而迭代。`
- **PM reconciliation:** ADR-0021 made the runtime enforce any Graph-valid
  permission or actor, but the compiler still rejects such additions through
  its canonical-hash negative-space proof. This response accepts ADR-0022,
  which admits bounded Graph-valid permission/actor additions at the compiler
  boundary, the remaining prerequisite for the Access and Workflow editors. It
  does not authorize Publish, Compilation lifecycle change, or any Task 9
  action.

## Context

ADR-0021 delivered generic runtime authorization over the exact Published
Graph `policy.permissions`, `flows`, `fieldAuthorities`, and `bindingPolicies`.
But the Restaurant compiler's `assertExactRestaurantGraph` and the r.6
normalize-to-canonical-hash proof still pin the exact four roles, the exact
seven journeys, the exact 135 binding policies, and the exact permission set.
A Graph with an added role, permission, flow transition, or journey actor is
therefore rejected before the runtime can ever enforce it.

Consequence: the Access and Workflow editors, which append Draft revisions that
add or remove such Graph facts, still have no compiler admission path.

## Decision

- **DEC-001 — Keep** the canonical and r.6 value-family admission unchanged;
  canonical input stays byte/digest deterministic and the r.6 normalization
  still reproduces the canonical hash.
- **DEC-002 — Migrate additively** a bounded permission/actor admission family.
  A candidate may add or remove entries in `policy.roles`,
  `policy.permissions`, `flows.transitions`, and `journeys` steps subject to:
  role keys are existing Graph keys 1..128; every permission references a
  declared role and a declared resource with a known action; every transition
  references a declared flow and declared from/to states with a declared event
  and declared roles; every journey step references a declared flow and a
  declared actor role. Unknown, duplicate, cross-tenant, or undeclared
  references fail closed.
- **DEC-003 — Keep the negative-space oracle.** The candidate's non-permission
  and non-actor locations (metadata, pages, surfaces, navigation, entities,
  relations, seed, scenarios, theme, integration, envelope, Composition Lock)
  remain canonical; they are normalized back to canonical and must reproduce the
  existing canonical hash. The permission/actor delta is the only admitted
  divergence.
- **DEC-004 — Deny by default.** An added permission or actor grants no
  authority beyond what the generated runtime's generic predicates read; a
  removed permission or actor fails closed in that runtime. No compiler or
  Workbench path infers authority from naming.
- **DEC-005 — Reject** a mutable Draft or Snapshot as the compilation input, a
  new endpoint or state schema version, and any Graph, Capability, Recipe,
  schema, dependency, provider, network, service, Docker, Compose, or deployment
  change.

## Security boundary

- The Published Graph remains the sole authority; the compiler validates the
  delta and the runtime enforces it.
- Every new role/permission/transition/actor is bounded and reference-checked
  before the canonical-hash negative-space proof.
- No credential, raw prompt, raw response, or request body is logged or echoed.

## API, data, adapter, and operability effects

- **API-001**: No endpoint, Graph, Capability, Recipe, schema, or serialization
  contract changes. The compiler admission surface is widened additively.
- **ADP-001**: No new adapter, provider, or remote authority.
- **DAT-001**: No durable migration.
- **LIC-001**: No dependency, copied source, or supply-chain coordinate change.
- **OPS-001**: No service, queue, Docker, Compose, or deployment step.

## Alternatives considered

1. **Bounded permission/actor admission plus hash negative-space — selected.**
   It preserves one exact oracle while admitting only the declared divergence.
2. **Accept any structurally valid Restaurant V3 Graph — rejected.** It widens
   policy, journey, seed, and generated-runtime authority silently.
3. **Keep the exact hash pin and skip Access/Workflow — rejected.** The editors
   are the accepted product path, and the runtime is already generic.

## Migration, rollback, and abort conditions

- **MIG-001**: Additive only; canonical and r.6 compilation remain byte-identical.
- **ROL-001**: Rollback is deletion of the admission predicate and its tests.
- **ABT-001**: Stop if a Graph/Capability/Recipe/schema/endpoint/state-version
  change, a dependency, or a provider/service/Docker/deployment step is needed.
- **ABT-002**: Stop if an undeclared or unbounded role, permission, transition,
  actor, or journey step can be admitted, or if the non-permission/actor
  negative space can drift.
- **IRR-001**: No irreversible step is authorized. Commit, push, Publish,
  release, and deployment remain separate gated actions.

## Verification and evidence

- Focused TDD RED/GREEN: a bounded role/permission/transition/actor addition is
  admitted and enforced; an unknown, duplicate, cross-referencing, or unbounded
  entry fails closed; the non-permission/actor negative space still reproduces
  the canonical hash; canonical and r.6 remain byte-identical.
- Full Compiler, Graph, and Capabilities suites; no-emit and build gates; direct
  Prettier and `git diff --check`; containment and static scans.
- One independent Sol review. Terra and a separate final Sol release review are
  not required unless review finds a stable-boundary/security P0/P1 or the
  repair changes this contract.
- Evidence is recorded in the active PM ledger and `docs/project-status.md`.

## Implementation and delivery authority

The exact implementation manifest (the Restaurant V3 contract and its tests) is
frozen in the Access/Workflow compiler-admission design and executable plan. One
Sol writer owns the paths; parallel writers are not authorized because admission
is a shared security boundary.

Only the controller may stage the frozen paths, commit the accepted slice with a
single bounded subject, push without force, and prove local `HEAD` equals
upstream with a clean tree.

## References

- `docs/tech-governance.md`
- `docs/threat-model.md`
- `docs/adr/adr-0021-generated-runtime-permission-actor-enforcement.md`
- `packages/compiler/src/targets/restaurant-v3/contracts.ts`
- `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
