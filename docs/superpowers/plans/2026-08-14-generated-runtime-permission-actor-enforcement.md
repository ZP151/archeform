# Generated Runtime Graph-Valid Permission and Actor Enforcement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:test-driven-development for every behavior change and
> superpowers:verification-before-completion before handoff.

**Goal:** Replace the generated Restaurant runtime's fixed capability-flag
authorization with generic Graph-driven permission, transition, and writable-
field evaluation, so any Graph-valid permission or actor addition is enforced.

**Architecture:** Emit the frozen `plan.policy.permissions`, `plan.flows`,
`plan.fieldAuthorities`, and `plan.bindingPolicies` as runtime data plus the
generic `permission`/`transition`/`writableField` predicates, and switch every
state-changing endpoint to those predicates.

**Base and upstream:** `a513618287c1c45816c90f61836d96a39b45baed`.

## Exact implementation manifest

1. `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
2. `packages/compiler/test/restaurant-customer-runtime.test.ts`
3. `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`

The cross-surface target tests are unchanged and covered by the full-suite gate.

## Task 1: Emit authorization data and generic predicates

**Files:** 1.

- [ ] **RED** the generated API module exposes `permissions`, `roles`,
      `flows`, `fieldAuthorities`, and `bindingPolicies` as frozen data and the
      generic `permission`/`transition`/`writableField` predicates.
- [ ] **GREEN** each state-changing endpoint switches from hard-coded role/flag
      checks to the generic predicates.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/restaurant-customer-runtime.test.ts test/restaurant-merchant-v3-runtime.test.ts`.

## Task 2: Prove added and removed authority

**Files:** 2, 3.

- [ ] **RED** an added Graph permission or actor becomes enforceable; a removed
      one fails closed; an unknown role/resource/action rejects with the fixed
      error; role spoofing is rejected.
- [ ] **GREEN** canonical and r.6 customer and merchant journeys still pass,
      including denials, idempotency, and shared-state catalog behavior.
- [ ] Run the focused runtime suites.

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
      `feat(compiler): enforce graph-valid runtime permissions and actors`,
      push without force, prove local `HEAD` equals upstream with a clean tree.

## Exact governance manifest

1. `docs/adr/adr-0021-generated-runtime-permission-actor-enforcement.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-generated-runtime-permission-actor-enforcement.md`
6. `docs/superpowers/specs/2026-08-14-generated-runtime-permission-actor-enforcement-design.md`

## Stop conditions

STOP for a fourth implementation path; a Graph/Capability/Recipe/schema/endpoint/
state-version change; a new dependency/provider/network/service/Docker/Compose/
deployment step; any operation that can succeed without an exact Graph
permission or transition; role spoofing; or a secret or raw-model leak.
