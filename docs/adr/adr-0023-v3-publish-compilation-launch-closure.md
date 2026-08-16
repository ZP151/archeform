---
title: "ADR-0023: Restaurant V3 Publish/Compilation/Launch Closure"
status: "Accepted"
date: "2026-08-15"
authors: "Archeform Tech Lead"
tags: ["lifecycle", "compiler", "graph-v3", "publish", "compilation"]
supersedes: ""
superseded_by: ""
---

# ADR-0023: Restaurant V3 Publish/Compilation/Launch Closure

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate additively** — extend the Control Plane lifecycle and
the Compiler Worker so a Restaurant Graph V3 Draft publishes to an immutable
Published Revision and compiles through the delivered Restaurant V3 target,
which is the missing prerequisite for Task 9's guarded real-model acceptance.

**Accepted on 2026-08-15** by the founder's verbatim response `accept and
continue`.

## Context

The Restaurant product is a Graph V3 Draft (the curated `restaurant-dual-surface`
template plus its appended Draft revisions). Its contextual editors (Page, Data,
Experience, Access) produce Draft revisions and preview Snapshots, but the
Publish/Compilation path is V1-only:

- `apps/control-plane/src/lifecycle.service.ts` `validatedGraph` (line 571)
  returns `ApplicationGraphV1` via `parseApplicationGraph`; `publishDraft` and
  `createCompilation` therefore cannot publish or compile a V3 Graph.
- The Compiler Worker's `executeCompilation` consumes
  `PublishedGraphInput.graph: ApplicationGraphV1` through the generic
  `generateApplicationBundle` facade.
- The Workbench disables `Publish draft` for a V3 template Draft by contract.

The Restaurant V3 compiler target (`assertRestaurantProductCompilationInput`)
and its deterministic generated application are delivered; only the lifecycle
routing to that target is missing.

## Decision

- **DEC-001 — Keep** the V1/V2 lifecycle unchanged; existing Published Revisions
  and Compilations remain byte-identical.
- **DEC-002 — Migrate additively** a V3 publish/compile path. A Restaurant V3
  Draft publishes to an immutable `factory.application-graph/v3` Published
  Revision (hash via `hashApplicationGraphV3`, composition lock via
  `createCapabilityCompositionLock` over the V3 selection locks), and compiles
  through `assertRestaurantProductCompilationInput` to the deterministic
  Restaurant V3 bundle. No V3 Draft, Snapshot, or mutable input ever enters the
  compiler.
- **DEC-003 — Deny by default.** A V3 publish rejects a drift-mismatched Graph,
  an unbound origin, or a non-canonical selection lock; a V3 compile rejects any
  non-V3 or non-Restaurant input.
- **DEC-004 — Reject** a new endpoint/schema beyond the V3 publish/compile
  routing, and any Graph/Capability/Recipe/schema/dependency/provider/Docker
  change beyond wiring the existing Restaurant V3 target.

## Security boundary

- The Published Graph remains the sole authority; the Worker compiles only the
  immutable V3 Published Revision + validated composition lock.
- No credential, raw prompt, raw response, or request body is logged or echoed.

## API, data, adapter, and operability effects

- **API-001**: `POST /application-graphs/:id/published-revisions` and
  `POST /compilations` admit a V3 Restaurant graph additively; no new endpoint.
- **DAT-001**: No durable migration; the Published Revision and Compilation
  rows are reused.
- **OPS-001**: No new service, queue, provider, or deployment step.

## Alternatives considered

1. **V3 publish/compile routing through the delivered Restaurant V3 target —
   selected.** It reuses the existing deterministic target and isolated verifier.
2. **Down-convert V3 to V1 for publishing — rejected.** It would violate the
   immutable V3 Graph authority and lose step-scoped journeys.
3. **Skip the closure and run Task 9 on the V1 harness — rejected.** The
   V1 Expense/Appointment harness is stale and does not exercise the Restaurant
   V3 product.

## Verification and evidence

- Focused TDD RED/GREEN: a Restaurant V3 Draft publishes to an immutable V3
  Published Revision and compiles to the deterministic V3 bundle; a
  drift-mismatched, non-V3, or non-Restaurant input fails closed.
- Full Control Plane, Worker, Compiler, Graph, and Capabilities suites; no-emit
  and build gates; direct Prettier and `git diff --check`; containment and
  static scans.
- One independent Sol review; Terra and a separate final Sol release review are
  not required unless review finds a stable-boundary/security P0/P1 or the
  repair changes this contract.

## Implementation and delivery authority

The exact implementation manifest is frozen in the V3 Publish/Compilation
closure design and executable plan. One Sol writer owns the paths; parallel
writers are not authorized because the lifecycle is a shared security boundary.
Only the controller may stage, commit, push without force, and prove local
`HEAD` equals upstream with a clean tree.
