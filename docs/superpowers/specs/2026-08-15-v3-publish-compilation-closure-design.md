# Restaurant V3 Publish/Compilation/Launch Closure Design

**Date:** 2026-08-15
**State:** Accepted; ready for writer; not implemented or delivered
**Decision:** [ADR-0023](../../adr/adr-0023-v3-publish-compilation-launch-closure.md)
**Base:** `22318e329bfd1a2fc033b3d0a48f3cf867713fdc`

## Outcome

A Restaurant Graph V3 Draft publishes to an immutable
`factory.application-graph/v3` Published Revision and compiles through the
delivered Restaurant V3 target to its deterministic generated bundle. This is
the missing prerequisite for Task 9's guarded real-model acceptance.

## Existing architecture and gap

The Restaurant product is a Graph V3 Draft (the curated
`restaurant-dual-surface` template plus appended Draft revisions). Its
contextual editors already produce Draft revisions and preview Snapshots, but:

- `apps/control-plane/src/lifecycle.service.ts` `validatedGraph` (line 571)
  parses only `ApplicationGraphV1`; `publishDraft`/`createCompilation` reject a
  V3 Draft.
- The Compiler Worker's `executeCompilation` consumes the V1
  `PublishedGraphInput`.
- `packages/compiler/src/targets/restaurant-v3/contracts.ts`
  `assertRestaurantProductCompilationInput` pins `revisionId` to
  `restaurant-product-v3-published-1` and `revisionNumber` to `1`, so a real
  Workbench publish cannot pass the admission.

## Frozen contracts

### Admitted locations

Only these may change in this slice:

- `apps/control-plane/src/lifecycle.service.ts`: `publishDraft` admits a V3
  Restaurant Draft and stores an immutable V3 Published Revision; a new
  versioned validation dispatches V1/V2/V3.
- `apps/control-plane/src/lifecycle.controller.ts`: unchanged routes (no new
  endpoint).
- `apps/compiler-worker/src/compilation-executor.ts` (+ its queue input type):
  dispatch a V3 Published Graph through `assertRestaurantProductCompilationInput`
  to the Restaurant V3 target.
- `packages/compiler/src/targets/restaurant-v3/contracts.ts`: relax the
  revision-id/number pin to accept a valid Restaurant V3 published revision
  while keeping the graph hash, composition lock, canonical hash, and authority
  checks exact.

### Negative space

V1/V2 publish/compile remain byte-identical. The Graph, Capability, Recipe, and
schema contracts are unchanged; no new endpoint, dependency, provider, service,
Docker, Compose, or deployment path is writable.

### Publish semantics

A V3 Draft publishes as:

```text
{ kind: "published-application-graph", status: "published",
  graphVersion: "factory.application-graph/v3", revisionId, revisionNumber,
  graphHash: hashApplicationGraphV3(graph), graph }
```

with the composition lock from `createCapabilityCompositionLock` over the V3
selection locks. The Draft is never mutated; the Published Revision and
Compilation rows are reused.

## Security boundary

- The Published Graph remains the sole authority; the Worker compiles only the
  immutable V3 Published Revision + validated composition lock.
- A drift-mismatched, non-V3, or non-Restaurant input fails closed with the
  fixed redacted error. No credential, raw prompt, raw response, or request
  body is logged or echoed.

## Exact implementation manifest (slice 1 — lifecycle + compiler routing)

1. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
2. `apps/control-plane/src/lifecycle.service.ts`
3. `apps/control-plane/src/compilation-queue.ts`
4. `apps/compiler-worker/src/compilation-executor.ts`
5. `apps/compiler-worker/src/queued-compilation.ts`
6. `packages/compiler/test/restaurant-v3-contract.test.ts`
7. `apps/control-plane/test/lifecycle.service.test.ts`
8. `apps/compiler-worker/test/compilation-executor.test.ts`

Slice 2 (Workbench `Publish draft` + Release surface wiring) follows after this
slice is reviewed and delivered.

## Verification and delivery

Focused TDD RED/GREEN: a V3 Restaurant Draft publishes to an immutable V3
Published Revision and compiles to the deterministic V3 bundle; a
drift-mismatched, non-V3, or non-Restaurant input fails closed. Full Control
Plane, Worker, Compiler, Graph, and Capabilities suites; no-emit and build
gates; direct Prettier and `git diff --check`; containment and static scans.
One independent Sol review. The exact delivery subject and governance manifest
are frozen in the executable plan.
