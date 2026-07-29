# Golden Capability Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the initial Factory capability suite independently versioned,
verified, lockable, and visible in generated application evidence.

**Architecture:** Canonical physical asset packages contain complete manifests,
declarative adapters, fixtures, and contract evidence. Browser-safe TypeScript
projections are checked for equivalent semantic content. The Graph stores only
exact locks; the Control Plane verifies package/profile/operation compatibility
and the compiler emits those locks.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS, Next.js, Prisma, pnpm.

## Global Constraints

- Graph remains the source of truth.
- Preserve Draft -> Publish -> immutable Compilation.
- Do not execute or download third-party code.
- Tests, documentation, and UI copy are English.
- Credentials never enter source, evidence, logs, or generated artifacts.

---

### Task 1: Define Graph asset locks

**Files:**

- Modify: `packages/graph/src/model.ts`
- Test: `packages/graph/test/application-graph.test.ts`

- [x] Add optional `integration.assetLocks` with exact version, package root,
      SHA-256 digest, and Golden lifecycle fields.
- [x] Add semantic rejection for duplicate lock keys.
- [x] Require a composition profile when asset locks are present and block AI
      Graph Diffs from changing either package locks or profile scope.
- [x] Verify schema parsing and semantic validation tests.

### Task 2: Build asset modules and package evidence

**Files:**

- Create: `packages/capabilities/src/assets/**`
- Create: `packages/capabilities/assets/**`
- Create: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/src/index.ts`
- Test: `packages/capabilities/test/capability-registry.test.ts`

- [x] Create one manifest-owning module for each core and commerce capability.
- [x] Move optional audit and notification removal into bounded asset adapters.
- [x] Create physical package evidence for every initial asset.
- [x] Verify canonical manifest digests and package evidence paths.
- [x] Require physical manifests to fully equal their Registry projections and
      reject adapters that reference an external source path.

### Task 3: Compose and enforce Golden locks

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/package.json`
- Test: `apps/control-plane/test/lifecycle.service.test.ts`

- [x] Compose selected assets into `ApplicationGraph.integration.assetLocks`.
- [x] Reject tampered locks before a Draft can be published.
- [x] Reject profile-incompatible assets and Graph operations without a locked
      asset provider before a Draft can be stored or published.
- [x] Keep unclaimed Graphs valid so external Graph authoring remains possible.

### Task 4: Emit provenance and show it before creation

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `apps/workbench/components/guided-creation-drawer.tsx`
- Test: `packages/compiler/test/compilation-plan.test.ts`
- Test: `apps/workbench/components/guided-creation-drawer.test.ts`

- [x] Emit `capability-lock.json` with Graph hash and selected locks.
- [x] Show selected Golden asset keys and versions in the guided Draft review.

### Task 5: Full verification and acceptance evidence

**Files:**

- Create: `docs/acceptance/golden-capability-assets.md`

- [x] Run workspace tests, type checks, production build, deterministic
      browser E2E, source-study checks, formatting checks, and diff checks.
- [x] Record exact commands and results.
