---
title: "ADR-0019: Generated Source Diff, Export, and Controlled Overlay"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags:
  [
    "architecture",
    "compiler",
    "workbench",
    "source",
    "export",
    "overlay",
    "git",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0019: Generated Source Diff, Export, and Controlled Overlay

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** additively — implement the remaining accepted
Task 8 source breadth (deterministic source manifest, controlled overlay apply,
generated-file diff, ZIP export, and Graph-first Git export) on top of the
already-frozen `factory.source-overlay/v1` contract and the existing generated-
files foundation. **Keep** the accepted Golden profile and **reject** any new
dependency, provider, network, service, or lifecycle change.

**Accepted on 2026-08-14** under the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。`.

PM/controller confirms the condition is met. Task 8 source breadth is bounded,
additive, reversible, and inside the accepted Restaurant Task 8 scope. It adds
no Graph, Capability, Recipe, schema, dependency, provider, network, service,
credential, Docker, Compose, or deployment change. The new Git export is a
local deterministic object serializer in the compiler source target, not a
network or provider adapter, and its path is already present in the accepted
plan. No new founder prompt is required.

## Founder Decision Record

- **Decision:** Accepted
- **Date:** 2026-08-14
- **Source:** founder standing instruction
- **Exact response:** `参考以下总结，若符合项目目标，则持续接受而迭代。`
- **PM reconciliation:** The work matches the repository evidence and the
  accepted Restaurant goal: it completes the already-planned Task 8 source
  breadth on the frozen `factory.source-overlay/v1` contract with no new
  dependency, provider, network, or lifecycle change. This response therefore
  accepts ADR-0019 and authorizes the ordinary in-scope Task 8 source-breadth
  slice. It does not authorize Publish, Compilation lifecycle change, Access or
  Workflow authority additions, or any Task 9 action.

## Context

Task 8 ("Source Mode") is partially delivered:

- **ADR-0017 / Task 8A** delivered the read-only Source explorer: the complete
  registered artifact tree, strict descriptor-bound content admission, and the
  server-side digest-verifying `GeneratedArtifactReader`.
- **Task 8B** delivered local manifest-path filtering and bounded inert
  find-in-file highlighting.
- **Task 8C** delivered verified copy/download of the single currently verified
  file.

The following accepted Task 8 outcomes remain unimplemented:

1. a deterministic **source manifest** (complete file tree, page-to-file
   selection, source origin) derived from the immutable Compilation artifact
   manifest;
2. **controlled overlay apply** — read-only generated files plus writable
   `src/extensions/**` and recipe-declared slots, digest-bound to a baseline;
3. **generated-file diff**;
4. deterministic **ZIP export**;
5. **Graph-first Git export**.

The enabling contract `factory.source-overlay/v1` is already delivered in
`packages/graph/src/source-overlay.ts` with `assertSourceOverlay` and a full
adversarial test matrix. The generated-file foundation
(`packages/compiler/src/core/generated-files.ts`) already provides
`GeneratedFile`, `assertSafeGeneratedFilePath`, `assertSafeGeneratedFileSet`,
`sameGeneratedFileSet`, and `sha256Digest`. No new serialized Graph contract is
required; the remaining work is applying these frozen facts and serializing
deterministic derived artifacts.

## Decision

- **DEC-001 — Keep** the accepted Golden profile, the immutable
  Draft -> Published Graph -> Compilation lifecycle, the frozen
  `factory.source-overlay/v1` schema and `assertSourceOverlay` boundary, the
  generated-files path rules, and the existing read-only
  `GET /compilations/:id/artifact-content` route.
- **DEC-002 — Migrate additively** the remaining Task 8 source breadth as
  pure, local, deterministic compiler work. No Graph, Capability, Recipe,
  schema, lifecycle, database, dependency, provider, network, service, Docker,
  Compose, or deployment change.
- **DEC-003 — Reject** any new package dependency for ZIP or Git. ZIP entries
  are produced with a bounded local writer over `node:zlib` raw deflate and a
  small hand-rolled CRC-32; Git blobs/trees/commits are produced with
  `node:crypto` SHA-1 and `node:zlib` deflate. A new archive or Git dependency
  is an eleventh change and returns to Tech Lead.
- **DEC-004 — Source manifest** is derived only from an immutable Compilation's
  registered artifact manifest (path, media type, optional size, digest) plus
  the rendered `GeneratedFile` set. It is ordered by path, includes per-file
  source origin (generated vs. overlay), page-to-file selection metadata when
  the recipe declares it, and never reads the caller's filesystem, environment,
  or credentials.
- **DEC-005 — Overlay apply** consumes only a validated
  `factory.source-overlay/v1`. It requires the overlay `compilationChecksum` to
  equal the Compilation digest and `baselineDigest` to equal the current
  baseline; a mismatch yields the fixed `stale-baseline` conflict state and
  fails closed. Files apply only under the single writable root
  `src/extensions/**`; every path is re-checked against the frozen safe
  relative-path, reserved-file, and device-name rules. A removed or missing
  declared slot yields `slot-removed` and fails closed. Generated files remain
  read-only; an overlay cannot overwrite them.
- **DEC-006 — Diff** is a deterministic, dependency-free line/byte diff between
  two `GeneratedFile` sets (baseline vs. current, or overlay vs. baseline). It
  never emits credentials, raw model material, or content outside the admitted
  manifest.
- **DEC-007 — ZIP export** serializes the checked manifest into a deterministic
  archive: fixed DOS timestamps, path-sorted entries, stored or deflated
  entries, and a reproducible byte stream for equal input. Symlinks, absolute
  paths, archive-path traversal, package/configuration/entry files, and content
  outside the manifest are rejected before serialization.
- **DEC-008 — Git export** is a Graph-first, dependency-free object writer in
  `packages/compiler/src/targets/source/export-git.ts`: it renders blobs,
  nested trees, and one commit from the checked manifest, using SHA-1 object
  ids and zlib object
  encoding. It produces no working-tree mutation, no remote, and no network
  action. The exported commit message and tree are deterministic for equal
  input. Secrets and raw model material never enter objects.
- **DEC-009 — Workbench surface (deferred)** exposes diff and export only for
  the current verified Source selection of a succeeded immutable Compilation.
  Export responses are read-only and digest-bound; the Workbench parser admits
  them through the same strict own-data rules as Task 8A/8C. This surface is
  deferred to a follow-up slice that adds a tenant- and digest-scoped
  read-only source-export route.

## Security boundary

Per `docs/threat-model.md`, this decision implements "generated files are
read-only; writable overlays are contained to declared extension slots and
digest-bound to a baseline" and "reject path traversal, absolute paths,
symlinks, unsafe archive entries, package-file writes, stale overlays, and
removed slots."

- The immutable Compilation artifact manifest remains the tree authority; the
  `GeneratedArtifactReader` remains the byte authority.
- Overlay apply, ZIP, and Git serialization operate only on already-admitted
  plain data and never invoke caller accessors, conversion hooks, iterators, or
  `toJSON`; a reflection failure yields one fixed redacted error.
- Export excludes `package.json`, lockfiles, `tsconfig*`/`jsconfig*`, dotfiles
  configuration, entry files, credentials, `.env*`, raw prompts, and raw model
  responses.
- No new endpoint is required beyond reuse of the existing artifact-content
  route; any added read-only export route is tenant- and digest-scoped and
  records no request bodies.

## API, data, adapter, and operability effects

- **API-001**: No Control Plane route, Graph, Capability, Recipe, schema, or
  serialization contract changes. SourceOverlayV1 remains the only overlay
  contract.
- **ADP-001**: A new local `packages/compiler/src/targets/source/export-git.ts`
  is added; it is a deterministic object serializer, not a network or provider
  adapter. No
  provider, credential, or remote authority is added.
- **DAT-001**: No durable migration. Exports are derived, non-persisted
  artifacts. Overlay apply is in-memory (plan/source assembly) and never writes
  outside the controlled compiler output root.
- **LIC-001**: No copied source, dependency, or supply-chain coordinate change.
- **OPS-001**: No service, queue, Docker, Compose, or deployment step.

## Alternatives considered

1. **Hand-rolled deterministic ZIP and Git objects — selected.** Zero new
   dependencies, reproducible output, and a fully testable serialization
   boundary.
2. **Add an archive/Git dependency (e.g. jszip, adm-zip, isomorphic-git) —
   rejected.** It widens the supply-chain surface and contradicts the accepted
   no-new-dependency boundary for this iteration.
3. **Shell out to the system `git` or `zip` binary — rejected.** It introduces
   non-deterministic environment coupling, breaks the loopback/containment
   boundary, and cannot be unit-verified deterministically.
4. **Skip ZIP/Git until after Task 9 — rejected.** Task 9 acceptance requires
   ZIP/Git export and source-lookup evidence, so they must land before the
   final real-model gate.
5. **Widen the writable overlay root or allow generated-file edits — rejected.**
   It violates the frozen single-root, digest-bound overlay policy and the
   immutable Compilation boundary.

## Migration, rollback, and abort conditions

- **MIG-001**: Additive only. Existing Source explorer/search/transfer behavior
  is unchanged. Overlay apply and export are new read-only/derived surfaces.
- **ROL-001**: Rollback is deletion of the new source-manifest, overlay, diff,
  ZIP, Git export, and Workbench export paths. No stored record changes.
- **ABT-001**: Stop if any serialized Graph/Recipe/Capability/schema/identifier
  must change, if a dependency or lockfile change becomes necessary, or if a
  new provider/network/service/credential/Docker/deployment action is needed.
- **ABT-002**: Stop if overlay apply, ZIP, or Git serialization can escape the
  safe root, overwrite a generated file, emit a package/configuration/entry
  file, leak a secret or raw model material, or produce non-deterministic
  output.
- **ABT-003**: Stop if the Workbench export surface would imply Draft source
  authority, Publish, Compilation creation, or a new Control Plane mutation.
- **IRR-001**: No irreversible step is authorized. Commit, push, Publish,
  release, and deployment remain separate gated actions.

## Verification and evidence

- Focused TDD RED/GREEN across the compiler source-manifest/overlay/diff/export
  paths and the Git export.
- Full Compiler, Graph, and Capabilities suites; no-emit and build gates;
  direct Prettier and `git diff --check` on the frozen paths.
- Adversarial matrix: path traversal, symlink, absolute path, archive-entry
  traversal, package/configuration/entry file, stale baseline, removed slot,
  hostile objects, and secret/raw-model exclusion.
- Determinism: byte-identical ZIP and Git object output for equal input; ZIP
  re-read round-trip.
- One independent Sol review. Terra and a separate final Sol release review are
  not required unless review finds a stable-boundary/security P0/P1 or the
  repair changes this contract.
- Evidence is recorded in the active PM ledger
  `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
  and `docs/project-status.md`.

## Implementation and delivery authority

The exact implementation manifest (compiler `targets/source/**`, the Workbench
`code-canvas`/`graph-exchange` surfaces, tests, and the
`e2e/restaurant-source-export.spec.ts` acceptance) is frozen in the Task 8
source-breadth design and executable plan. One Sol writer owns the paths;
parallel writers are not authorized because the manifest and export formats are
shared integration contracts.

Only the controller may stage the frozen paths, commit the accepted slice with a
single bounded subject, push without force, and prove local `HEAD` equals
upstream with a clean tree. This ADR does not authorize implementation before
founder acceptance.

## References

- `docs/tech-governance.md`
- `docs/threat-model.md`
- `docs/adr/adr-0017-workbench-source-explorer.md`
- `docs/adr/adr-0018-restaurant-v3-runtime-catalog-parity.md`
- `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`
  (Task 8)
- `packages/graph/src/source-overlay.ts`
- `packages/compiler/src/core/generated-files.ts`
- `apps/control-plane/src/artifact-content.ts`
