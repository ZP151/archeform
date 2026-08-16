---
title: "ADR-0021: Generated Runtime Graph-Valid Permission and Actor Enforcement"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "compiler",
    "runtime",
    "security",
    "authorization",
    "journeys",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0021: Generated Runtime Graph-Valid Permission and Actor Enforcement

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** additively — replace the generated Restaurant
runtime's fixed capability-flag authorization with generic, Graph-driven
evaluation of `policy.permissions` and `journeys`/`flows` step-scoped actors,
so the runtime enforces any Graph-valid permission or actor addition before the
Workbench Access and Workflow editors present it.

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
- **PM reconciliation:** The work matches the repository evidence and the
  accepted Restaurant goal: it makes the generated runtime authorize against
  the exact Graph `policy.permissions` and step-scoped journey actors, which is
  the missing prerequisite for the already-planned Access and Workflow
  contextual editors. This response therefore accepts ADR-0021 and authorizes
  the ordinary in-scope runtime-authorization slice. It does not authorize
  Publish, Compilation lifecycle change, or any Task 9 action.

## Context

The delivered Restaurant runtime (`runtime-api.ts`) already derives its
authorization from the plan, but into a **fixed set of named capability flags**
(`cart.add`, `cart.update`, `checkout`, `profile.update`, and the merchant
`cancel`/`pay`/`priority`/`table`/`settings`/`catalogFields` flags) plus a fixed
seven-journey key list. It does not generically evaluate an arbitrary
`policy.permissions` entry or an arbitrary `journeys`/`flows` actor.

Consequence: if a user adds a new Graph-valid permission or actor through the
future Access or Workflow editor, the generated runtime has no code path to
enforce it. Presenting those editors before the runtime enforces the Graph would
make Workbench product behavior dishonest. This is the recorded
`blocked_at_design` condition for Access and Workflow.

## Decision

- **DEC-001 — Keep** the nonspoofable startup-principal model, the immutable
  Draft -> Published Graph -> Compilation lifecycle, the Graph V3
  `policy.permissions` and step-scoped `journeys` contracts, and the existing
  generated endpoints and state schema version `1`.
- **DEC-002 — Migrate additively** the generated API handler so that every
  state-changing endpoint is authorized by the generic predicate
  `permission(principalRole, resource, action)` over the exact
  `plan.policy.permissions`, instead of a fixed boolean flag. The mapping from
  endpoint to `(resource, action)` is declared once in the generated source; the
  authority is the Graph permission set.
- **DEC-003 — Migrate additively** flow-transition and kitchen/table
  authorization to the generic `transition(flowKey, from, event, to, role)`
  predicate over the exact `plan.flows` and the journey step actors in
  `plan.journeys`, instead of the fixed journey-key list. A transition the Graph
  does not declare for the principal's role fails closed.
- **DEC-004 — Migrate additively** field-level writes to the generic
  `writableField(pageId, entityKey, fieldKey)` predicate over
  `plan.fieldAuthorities` + `plan.bindingPolicies`, replacing the fixed
  per-entity field name lists.
- **DEC-005 — Reject** role spoofing (a principal may only adopt a role the
  startup principal declares), unknown resources/actions, a mutable Draft or
  Snapshot as the authorization source, and any new endpoint, state schema
  version, package, dependency, provider, network, service, Docker, Compose, or
  deployment change.

## Security boundary

- The Published Graph remains the sole authority; the generated runtime
  evaluates only `plan.policy.permissions`, `plan.flows`, `plan.journeys`, and
  `plan.fieldAuthorities`/`plan.bindingPolicies` captured at compile time.
- Every endpoint denies by default: an operation without an exact Graph
  permission or transition fails closed with the fixed redacted error.
- The principal is nonspoofable (startup-bound); role adoption does not grant
  undeclared authority.
- No credential, raw prompt, raw response, or request body is logged or echoed.

## API, data, adapter, and operability effects

- **API-001**: No endpoint, Graph, Capability, Recipe, schema, or serialization
  contract changes. The generated runtime's exported handler signature and state
  schema remain unchanged.
- **ADP-001**: No new adapter, provider, or remote authority.
- **DAT-001**: No durable migration; generated runtime state files remain
  development artifacts.
- **LIC-001**: No dependency, copied source, or supply-chain coordinate change.
- **OPS-001**: No service, queue, Docker, Compose, or deployment step.

## Alternatives considered

1. **Generic Graph-driven authorization — selected.** It makes every Graph
   permission/actor authoritative and honest, and it is the prerequisite for
   Access/Workflow editors.
2. **Extend the fixed capability flags per new permission — rejected.** It
   bakes each permission into generated source and cannot track arbitrary Graph
   additions.
3. **Skip enforcement and present editors anyway — rejected.** It would show
   product behavior the runtime cannot honor, violating the threat model.
4. **Move authorization to a server-side policy engine — rejected.** It widens
   the platform topology; the generated loopback runtime must stay dependency
   free and locally verifiable.

## Migration, rollback, and abort conditions

- **MIG-001**: Additive only; canonical and r.6 compilation remain byte-
  identical where the Graph permission set is unchanged.
- **ROL-001**: Rollback is restoration of the prior fixed-flag generated source
  and tests; no stored record changes.
- **ABT-001**: Stop if a Graph/Capability/Recipe/schema/endpoint/state-version
  change, a dependency, or a provider/service/Docker/deployment step is needed.
- **ABT-002**: Stop if any operation can succeed without an exact Graph
  permission or transition, if a principal can adopt an undeclared role, or if
  a secret or raw-model material leaks.
- **IRR-001**: No irreversible step is authorized. Commit, push, Publish,
  release, and deployment remain separate gated actions.

## Verification and evidence

- Focused TDD RED/GREEN: an added Graph permission or actor becomes enforceable
  and a removed one fails closed; role spoofing and unknown resource/action
  reject; canonical and r.6 generated journeys still pass.
- Full Compiler, Graph, and Capabilities suites; no-emit and build gates; direct
  Prettier and `git diff --check`; generated Node journey execution; containment
  and static scans.
- One independent Sol review. Terra and a separate final Sol release review are
  not required unless review finds a stable-boundary/security P0/P1 or the
  repair changes this contract.
- Evidence is recorded in the active PM ledger and `docs/project-status.md`.

## Implementation and delivery authority

The exact implementation manifest (the Restaurant runtime API handler and the
customer/merchant/product targets and their tests) is frozen in the Access/
Workflow runtime-authorization design and executable plan. One Sol writer owns
the paths; parallel writers are not authorized because authorization is a shared
security boundary.

Only the controller may stage the frozen paths, commit the accepted slice with a
single bounded subject, push without force, and prove local `HEAD` equals
upstream with a clean tree.

## References

- `docs/tech-governance.md`
- `docs/threat-model.md`
- `docs/adr/adr-0018-restaurant-v3-runtime-catalog-parity.md`
- `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
- `packages/compiler/src/targets/restaurant-v3/plan.ts`
- `packages/compiler/src/targets/restaurant-v3/contracts.ts`
