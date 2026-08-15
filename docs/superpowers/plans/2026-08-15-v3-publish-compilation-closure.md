# Restaurant V3 Publish/Compilation/Launch Closure Plan

**Date:** 2026-08-15
**State:** Ready for writer
**Design:** [2026-08-15-v3-publish-compilation-closure-design.md](../specs/2026-08-15-v3-publish-compilation-closure-design.md)
**Decision:** [ADR-0023](../../adr/adr-0023-v3-publish-compilation-launch-closure.md)
**Base:** `22318e329bfd1a2fc033b3d0a48f3cf867713fdc`

## Objective

Deliver slice 1 of the V3 closure: a Restaurant Graph V3 Draft publishes to an
immutable V3 Published Revision and compiles through the Restaurant V3 target.

## Writer authority

One Sol writer owns every path below. Parallel writers are not authorized: the
lifecycle and compiler admission are shared security boundaries. The writer may
only change the exact implementation manifest; governance records are
controller-owned at delivery.

## Exact implementation manifest (slice 1)

1. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
2. `apps/control-plane/src/lifecycle.service.ts`
3. `apps/control-plane/src/compilation-queue.ts`
4. `apps/compiler-worker/src/compilation-executor.ts`
5. `apps/compiler-worker/src/queued-compilation.ts`
6. `packages/compiler/test/restaurant-v3-contract.test.ts`
7. `apps/control-plane/test/lifecycle.service.test.ts`
8. `apps/compiler-worker/test/compilation-executor.test.ts`

## Delivery subject

`feat(lifecycle): publish and compile a restaurant v3 draft`

## RED criteria

- Compiler: a non-canonical `revisionId`/`revisionNumber` (but valid Graph hash,
  composition lock, and canonical-hash negative space) is rejected today;
  malformed revision metadata stays rejected.
- Lifecycle: a V3 Draft is rejected by `publishDraft` today; a V1 Draft still
  publishes byte-identically.

## GREEN criteria

- A Restaurant V3 Draft publishes to an immutable V3 Published Revision with the
  V3 hash and composition lock; a drift-mismatched or non-V3 Draft fails closed.
- The Worker dispatches a V3 Published Revision through the Restaurant V3 target
  and returns the deterministic bundle; a non-V3 or non-Restaurant input fails
  closed.
- Full Control Plane, Worker, Compiler, Graph, and Capabilities suites pass;
  no-emit and build gates pass; direct Prettier and `git diff --check` clean.

## Delivery authority

Only the controller may stage the frozen paths, commit with the exact subject,
push without force, and prove local `HEAD` equals upstream with a clean tree.
