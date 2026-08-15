# Workbench Source Export Route and Diff Surface Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:test-driven-development for every behavior change and
> superpowers:verification-before-completion before handoff.

**Goal:** Complete the deferred Task 8 source-export surface: re-export the
compiler source target, add a read-only tenant- and digest-scoped
`source-archive` route, and expose ZIP/Git download plus a bounded diff view in
the Workbench.

**Architecture:** Reuse the delivered `buildSourceZip`/`buildGitExport`/
`diffGeneratedFiles` and `GeneratedArtifactReader`. No new dependency, provider,
network, service, Docker, Compose, or deployment.

**Base and upstream:** `3174b70f440e80d414e7f6b65775a9c90a60be48`.

## Exact implementation manifest

1. `packages/compiler/src/index.ts`
2. `apps/control-plane/src/lifecycle.controller.ts`
3. `apps/control-plane/src/lifecycle.service.ts`
4. `apps/workbench/components/canvases/code-canvas.tsx`
5. `apps/workbench/hooks/use-workbench-controller.ts`
6. `apps/workbench/components/workbench.tsx`
7. `apps/workbench/lib/control-plane-client.ts`
8. `packages/compiler/test/index-exports.test.ts`
9. `apps/control-plane/test/source-archive.test.ts`
10. `apps/workbench/components/canvases/code-canvas.test.tsx`
11. `apps/workbench/lib/control-plane-client.test.ts`

The `e2e/restaurant-source-export.spec.ts` journey is deferred to Task 9's
full-stack acceptance, which already runs the complete Playwright suite over a
succeeded Compilation; the route and download surface are covered by the unit
and component tests here.

## Task 1: Compiler facade re-export

**Files:** 1, 8.

- [ ] **RED** public exports expose the source target functions and types.
- [ ] **GREEN** index re-exports compile and the export test passes.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/index-exports.test.ts`.

## Task 2: Control Plane source-archive route

**Files:** 2, 3, 9.

- [ ] **RED** unknown `format`, non-succeeded Compilation, altered artifact
      digest, and missing Compilation fail closed with one redacted error.
- [ ] **GREEN** `format=zip` returns a deterministic ZIP; `format=git` returns
      deterministic git object bytes plus a safe filename; both rehash every
      artifact through `GeneratedArtifactReader`.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/source-archive.test.ts`.

## Task 3: Workbench download surface

**Files:** 4, 5, 6, 7, 10, 11.

- [ ] **RED** Code canvas exposes ZIP/Git download only for a succeeded
      Compilation; the client admits export responses with strict own-data
      rules.
- [ ] **GREEN** the download buttons call the controller callback with the
      exact format; the client returns filename, content type, and bytes.
- [ ] Run focused Workbench component and client tests.

## Task 4: Compatibility, review, and delivery

**Files:** exact implementation manifest only.

- [ ] Run full Compiler, Control Plane, and Workbench suites.
- [ ] Run no-emit and build gates for Compiler, Control Plane, and Workbench.
- [ ] Run direct Prettier on the manifest, `git diff --check`, exact-path
      containment, banned-import/dependency/lock scans, and secret/raw-model
      scans.
- [ ] One independent Sol intended-vs-implemented review. Terra and a separate
      final Sol are not required unless review finds a stable-boundary/security
      P0/P1 or the repair changes this contract.
- [ ] Controller-only delivery: commit
      `feat(control-plane): add source archive export`, push without force,
      prove local `HEAD` equals upstream with a clean tree.

## Exact governance manifest

1. `docs/adr/adr-0020-workbench-source-export-route.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-workbench-source-export-route.md`
6. `docs/superpowers/specs/2026-08-14-workbench-source-export-route-design.md`

## Stop conditions

STOP for an eleventh implementation path; a Graph/Capability/Recipe/schema/
Prisma change; a new dependency/provider/network/service/Docker/Compose/
deployment step; a mutable route; cross-tenant access; a secret or raw-model
leak; or non-deterministic ZIP/Git output.
