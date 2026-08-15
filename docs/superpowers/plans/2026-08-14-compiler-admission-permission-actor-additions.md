# Compiler Admission of Restaurant Permission and Actor Additions Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:test-driven-development for every behavior change and
> superpowers:verification-before-completion before handoff.

**Goal:** Admit bounded Graph-valid additions to roles and permissions at the
Restaurant compiler boundary while keeping the canonical-hash negative space for
flows, journeys, and every non-authority location. Flow and journey admission is
deferred to the Workflow editor slice.

**Base and upstream:** `e434ecac` (docs: record compiler permission admission
blocker).

## Exact implementation manifest

1. `packages/capabilities/src/restaurant/canonical-restaurant.ts`
2. `packages/capabilities/src/index.ts`
3. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
4. `packages/compiler/test/restaurant-v3-contract.test.ts`

## Task 1: Extract canonical authority and admit the bounded delta

**Files:** 1, 2, 3, 4.

- [ ] **RED** a bounded role/permission addition is admitted; an unknown,
      undeclared, malformed, or missing-canonical role fails closed.
- [ ] **GREEN** `getCanonicalRestaurantAuthority()` composes once and
      `normalizeAllowedRestaurantValues` restores the canonical roles and
      permissions so the normalized Graph still hashes to the canonical hash,
      and the admitted candidate is returned unnormalized.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts`.

## Task 2: Canonical and r.6 parity

**Files:** 3, 4.

- [ ] **GREEN** canonical and r.6 compilation remain byte-identical; flows,
      journeys, and the non-authority negative space still reject drift.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/restaurant-v3-contract.test.ts`.

## Task 3: Compatibility, review, and delivery

**Files:** exact implementation manifest only.

- [ ] Run full Compiler, Graph, and Capabilities suites.
- [ ] Run no-emit and build gates for Compiler, Graph, and Capabilities.
- [ ] Run direct Prettier on the manifest, `git diff --check`, exact-path
      containment, banned-import/dependency/lock scans, and secret/raw-model
      scans.
- [ ] One independent Sol intended-vs-implemented review. Terra and a separate
      final Sol are not required unless review finds a stable-boundary/security
      P0/P1 or the repair changes this contract.
- [ ] Controller-only delivery: commit
      `feat(compiler): admit graph-valid permission and actor additions`,
      push without force, prove local `HEAD` equals upstream with a clean tree.

## Exact governance manifest

1. `docs/adr/adr-0022-compiler-admission-permission-actor-additions.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-compiler-admission-permission-actor-additions.md`
6. `docs/superpowers/specs/2026-08-14-compiler-admission-permission-actor-additions-design.md`

## Stop conditions

STOP for a fifth implementation path; a Graph/Capability/Recipe/schema change; a
new dependency/provider/network/service/Docker/Compose/deployment step; any
undeclared or unbounded admission; any flow, journey, or non-authority
negative-space drift; or a secret or raw-model leak.
