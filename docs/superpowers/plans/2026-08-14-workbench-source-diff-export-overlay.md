# Workbench Source Diff, Export, and Controlled Overlay Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:test-driven-development for every behavior change and
> superpowers:verification-before-completion before handoff. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Complete the accepted Task 8 source breadth on the frozen
`factory.source-overlay/v1` contract: deterministic source manifest, controlled
overlay apply, generated-file diff, deterministic ZIP export, and Graph-first
Git export, surfaced through the Workbench Source canvas.

**Architecture:** Keep the accepted Golden profile, immutable
Draft -> Published Graph -> Compilation lifecycle, frozen overlay schema, and
generated-file path rules. Add only local, dependency-free compiler/adapter/
Workbench paths. No new dependency, provider, network, service, Docker, Compose,
or deployment.

**Tech Stack:** Node.js 22, TypeScript, Vitest, `node:zlib`, `node:crypto`,
existing `@factory/graph` (`assertSourceOverlay`), `@factory/compiler`, and
`@factory/adapters`.

## Global constraints

- Base and upstream are exactly `74c68a132f48b3230992fad2f3fa80abfb066b84`;
  D0 is delivered there.
- [ADR-0019](../../adr/adr-0019-workbench-source-diff-export-overlay.md) is
  Accepted under the founder standing instruction
  `参考以下总结，若符合项目目标，则持续接受而迭代。`; the design is frozen in
  [specs/2026-08-14-workbench-source-diff-export-overlay-design.md](../specs/2026-08-14-workbench-source-diff-export-overlay-design.md).
- ZIP uses a hand-rolled CRC-32 plus `node:zlib` raw deflate; Git uses
  `node:crypto` SHA-1 plus `node:zlib` deflate. No archive/Git dependency.
- Every public boundary strict-copies hostile input and returns one fixed
  redacted error; caller accessors, conversion hooks, iterators, and `toJSON`
  are never invoked.
- Generated files stay read-only. Overlay writes are contained to
  `src/extensions/**` and digest-bound to a baseline. Exports exclude package,
  lock, configuration, entry, credential, and raw-model files.
- One Sol writer owns the exact implementation manifest. Any path outside it is
  a PM STOP.

## Exact implementation manifest

1. `packages/compiler/src/targets/source/source-manifest.ts`
2. `packages/compiler/src/targets/source/overlay.ts`
3. `packages/compiler/src/targets/source/diff.ts`
4. `packages/compiler/src/targets/source/export-zip.ts`
5. `packages/compiler/src/targets/source/export-git.ts`
6. `packages/compiler/test/source-manifest.test.ts`
7. `packages/compiler/test/source-overlay-apply.test.ts`
8. `packages/compiler/test/source-diff.test.ts`
9. `packages/compiler/test/source-export-zip.test.ts`
10. `packages/compiler/test/source-export-git.test.ts`

## Task 1: Deterministic source manifest

**Files:** 1, 8.

- [ ] **RED** `buildSourceManifest` rejects unsafe/duplicate paths and hostile
      rows, and emits path-ordered entries with media type, digest, size, and
      `origin: "generated"`.
- [ ] **GREEN** derive entries only from the supplied plain artifact rows plus
      the rendered `GeneratedFile` set; compute `baselineDigest`; attach
      `pageKey` only from the recipe-declared mapping.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/source-manifest.test.ts`.

## Task 2: Controlled overlay apply

**Files:** 2, 9.

- [ ] **RED** reject stale `baselineDigest`, `slot-removed`, missing/extra
      content, content that fails `contentDigest`, and overlay paths that
      collide with a generated path or fall outside `src/extensions/`.
- [ ] **GREEN** apply `assertSourceOverlay`-validated files as
      `origin: "overlay"`, re-checking paths locally and never invoking caller
      accessors.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/source-overlay-apply.test.ts`.

## Task 3: Generated-file diff

**Files:** 3, 10.

- [ ] **RED** produce added/removed/changed path classification and a
      deterministic line diff; reject hostile/non-plain input; never emit
      credential or raw-model material.
- [ ] **GREEN** byte-identical output for equal input; empty and equal sets.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/source-diff.test.ts`.

## Task 4: Deterministic ZIP export

**Files:** 4, 11.

- [ ] **RED** reject traversal/symlink/absolute/package/config/entry entries and
      hostile objects; produce byte-identical output for equal input.
- [ ] **GREEN** round-trip re-read of the produced archive; fixed timestamps;
      CRC-32 correctness.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/source-export-zip.test.ts`.

## Task 5: Graph-first Git export

**Files:** 5, 12.

- [ ] **RED** render blobs/tree/commit with SHA-1 ids and zlib encoding; reject
      unsafe paths and secrets; deterministic for equal input.
- [ ] **GREEN** deterministic blob/tree/commit ids and content with a verified
      inflate round-trip; nested directory trees.
- [ ] Run `node node_modules/vitest/vitest.mjs run test/source-export-git.test.ts`.

## Task 6: Workbench surface (deferred)

The Workbench download/diff UI and the `e2e/restaurant-source-export.spec.ts`
journey are deferred to a follow-up slice. They require a tenant- and
digest-scoped read-only source-export route (ZIP/Git), which this slice's
frozen "no new Control Plane route" boundary excludes. The compiler
`buildSourceZip`/`buildGitExport` functions delivered here are the reusable
server-side core for that follow-up.

## Task 7: Compatibility, review, and delivery

**Files:** exact implementation manifest only.

- [ ] Run full Compiler, Graph, and Capabilities suites.
- [ ] Run no-emit and build gates for Compiler, Graph, and Capabilities.
- [ ] Run direct Prettier on the manifest, `git diff --check`, exact-path
      containment, banned-import/dependency/lock scans, and secret/raw-model
      scans.
- [ ] One independent Sol intended-vs-implemented review. Terra and a separate
      final Sol are not required unless review finds a stable-boundary/security
      P0/P1 or the repair changes this contract.
- [ ] Controller-only delivery: stage the exact implementation plus governance
      paths, commit `feat(source): add diff, export, and controlled overlay`,
      push without force, and prove local `HEAD` equals upstream with a clean
      tree.

## Exact governance manifest

1. `docs/adr/adr-0019-workbench-source-diff-export-overlay.md`
2. `docs/project-status.md`
3. `docs/roadmap.md`
4. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
5. `docs/superpowers/plans/2026-08-14-workbench-source-diff-export-overlay.md`
6. `docs/superpowers/specs/2026-08-14-workbench-source-diff-export-overlay-design.md`

## Stop conditions

STOP for an eleventh implementation path; a new archive/Git dependency; a
Graph/Capability/Recipe/schema change; generated-file writes outside
`src/extensions/**`; non-deterministic ZIP/Git output; a secret or raw-model
leak; a new Control Plane route, provider, network, service, Docker, Compose,
or deployment step; or any Draft/Publish/Compilation-lifecycle change.
