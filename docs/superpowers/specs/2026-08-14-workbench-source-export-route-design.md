# Workbench Source Export Route and Diff Surface Design

**Date:** 2026-08-14
**State:** Accepted; ready for writer; not implemented or delivered
**Decision:** [ADR-0020](../../adr/adr-0020-workbench-source-export-route.md)
**Base:** `3174b70f440e80d414e7f6b65775a9c90a60be48`

## Outcome

Complete the deferred Task 8 source breadth surface: a read-only, tenant- and
digest-scoped source-export route that returns the deterministic ZIP or
Graph-first Git archive of a succeeded Compilation, plus the Workbench download
buttons and a bounded generated-file diff view. It reuses the delivered compiler
`buildSourceZip`/`buildGitExport`/`diffGeneratedFiles`.

## Existing architecture and gap

- `apps/control-plane/src/artifact-content.ts` (`GeneratedArtifactReader`) is the
  digest-verifying byte authority; `lifecycle.service.ts` already reads one
  artifact at a time through it.
- `apps/control-plane` already depends on `@factory/compiler`, which delivers the
  source target functions but does not yet re-export them from
  `packages/compiler/src/index.ts`.
- The Workbench Code canvas already lists the artifact manifest and inspects one
  verified file (`apps/workbench/components/canvases/code-canvas.tsx`); the
  client already has `getCompilationArtifact` but no whole-tree export call.

Gap: no route assembles the whole tree into a ZIP/Git archive, so Task 9's
required ZIP/Git export evidence cannot be produced.

## Frozen contracts

### Compiler facade re-export

`packages/compiler/src/index.ts` re-exports, unchanged:

- `buildSourceManifest`, `sourceBaselineDigest`, `SourceManifestV1`,
  `SourceManifestEntryV1`, `SourceManifestInputV1`, `SourceOriginV1`;
- `applySourceOverlay`, `SourceOverlayApplyInputV1`;
- `diffGeneratedFiles`, `GeneratedFileDiffV1`, `ChangedFileDiffV1`;
- `buildSourceZip`;
- `buildGitExport`, `GitExportV1`, `GitObjectV1`, `GitTreeEntryV1`,
  `GitCommitInputV1`, `GitExportInputV1`, `gitBlobObject`, `gitTreeObject`,
  `gitCommitObject`.

No function behavior changes; this only widens the public facade.

### Control Plane source-archive route

`GET /compilations/:compilationId/source-archive?format=zip|git`

The service method:

1. loads the succeeded Compilation with its artifacts ordered by path;
2. reads every artifact through `GeneratedArtifactReader`, collecting a
   path-ordered `GeneratedFile[]` of `{path, content}` (each rehashed);
3. validates `format` is exactly `zip` or `git` (default `zip`; unknown format
   fails closed);
4. calls `buildSourceZip(files)` or `buildGitExport(files, {message, author,
committer, timestampSeconds})`;
5. returns `application/zip` bytes for ZIP, or `application/octet-stream` bytes
   plus a deterministic `{id}.{format}` filename for Git.

Failure yields one fixed redacted error; no artifact content, path, secret, or
hostile material is logged or echoed. No request body is accepted. Tenant
scoping reuses the existing local-workspace compilation lookup; there is no
cross-tenant object access path in the current single-tenant control plane.

### Workbench surface

The Code canvas adds, only for a succeeded Compilation:

- `Download source ZIP` and `Download source Git export` actions that request the
  archive and download it with a scrubbed safe filename and Object URL cleanup;
- a bounded `diffGeneratedFiles` view between two admitted Compilation manifest
  snapshots (default: the current Compilation vs. the prior one), rendered as
  added/removed/changed path groups.

Export responses are admitted through the existing strict own-data rules used by
Task 8A/8C; no Draft source projection or Compilation creation is added.

## Security boundary

- The route re-reads and rehashes every registered artifact before serialization;
  an altered volume fails closed.
- The route is digest-bound to the immutable artifact manifest and read-only; it
  never accepts a caller path beyond the manifest.
- ZIP/Git serialization reuses the delivered path/digest/serialization guards.
- Package/configuration/entry/credential/raw-model exclusion is enforced at this
  admission layer for the export response.
- The Workbench parser rejects extra, inherited, symbol, non-enumerable, and
  accessor properties and returns only fresh frozen copies.

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
full-stack acceptance.

No fixture, Graph, Capability, Recipe, schema, Prisma, package, lockfile, worker,
Publish, provider, service, Docker, Compose, or deployment path is writable.

## Verification and delivery

Focused TDD RED/GREEN per component; full Compiler, Control Plane, and Workbench
suites; no-emit and build gates; direct Prettier and `git diff --check`;
adversarial matrix (cross-tenant/invalid format/altered artifact/unknown
Compilation/path traversal/secret exclusion); ZIP round-trip and Git `fsck`
determinism. One independent Sol review; Terra and a separate final Sol release
review are not required unless review finds a stable-boundary/security P0/P1 or
the repair changes this contract. The exact delivery subject and governance
manifest are frozen in the executable plan.
