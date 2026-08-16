# Workbench Source Diff, Export, and Controlled Overlay Design

**Date:** 2026-08-14
**State:** Accepted; ready for writer; not implemented or delivered
**Decision:** [ADR-0019](../../adr/adr-0019-workbench-source-diff-export-overlay.md)
**Base:** `74c68a132f48b3230992fad2f3fa80abfb066b84`

## Outcome

Task 8 source breadth completes the accepted Source Mode promise: generated
source is not only visible (8A), searchable (8B), and transferable (8C), but
also diffable, exportable as a deterministic ZIP, exportable as a Graph-first
Git repository, and editable only through digest-bound `src/extensions/**`
overlay slots. All of it is derived from an immutable succeeded Compilation;
no Draft source projection, Publish, or Compilation creation is added.

## Existing architecture and gap

- `assertSourceOverlay` (`factory.source-overlay/v1`) already validates the
  overlay envelope: `compilationChecksum`, `baselineDigest`, the single
  writable root `src/extensions`, declared slots `{key,file,exportName}`, files
  `{path,baseDigest,contentDigest}`, `conflictState`, safe relative paths,
  reserved-file rejection, and device-name rejection.
- `packages/compiler/src/core/generated-files.ts` already provides
  `GeneratedFile`, `assertSafeGeneratedFilePath`, `assertSafeGeneratedFileSet`,
  `sameGeneratedFileSet`, and `sha256Digest`.
- The immutable Compilation artifact manifest records `{path,digest,sizeBytes}`
  in path order, and `apps/control-plane/src/artifact-content.ts`
  (`GeneratedArtifactReader`) is the digest-verifying byte authority.
- `apps/workbench/lib/control-plane-client.ts` already carries
  `WorkbenchCompilationArtifact {path,digest,mediaType,sizeBytes?}` and strict
  descriptor-bound content admission.
- Task 8A/8B/8C delivered the Source explorer/search/transfer surfaces in
  `apps/workbench/components/canvases/code-canvas.tsx`.

Missing: a deterministic source manifest, overlay apply, diff, ZIP export, and
Git export. Nothing in the frozen `factory.source-overlay/v1` schema carries
file content, so overlay content is supplied separately and bound by digest.

## Frozen contracts

### Source manifest

A `SourceManifestV1` is derived only from the immutable Compilation artifact
manifest plus the rendered `GeneratedFile` set:

```ts
type SourceOriginV1 = "generated" | "overlay";

type SourceManifestEntryV1 = {
  readonly path: string;
  readonly mediaType: string;
  readonly digest: string; // sha256:<hex> of exact UTF-8 content
  readonly sizeBytes: number;
  readonly origin: SourceOriginV1;
  readonly pageKey?: string; // present only when a screen recipe declares it
};

type SourceManifestV1 = {
  readonly compilationId: string;
  readonly graphHash: string;
  readonly baselineDigest: string; // sha256 over the canonical path-ordered entry list
  readonly entries: readonly SourceManifestEntryV1[]; // path-ordered
};
```

The manifest is produced by `buildSourceManifest` in
`packages/compiler/src/targets/source/source-manifest.ts`. It reads only the
caller-supplied plain artifact rows and file set, never the filesystem,
environment, or credentials. Page-to-file selection is derived only from a
recipe-declared mapping, not from path conventions.

### Overlay apply

`applySourceOverlay` in `packages/compiler/src/targets/source/overlay.ts`
consumes an `assertSourceOverlay`-validated overlay, a baseline
`GeneratedFile` set, and a `ReadonlyMap<string,string>` of content keyed by
overlay path. It requires, in order:

1. `overlay.compilationChecksum === compilationDigest`;
2. `overlay.baselineDigest === sha256(baseline)` where the baseline is the
   canonical path-ordered generated set (overlay files excluded);
3. every declared slot and overlay file path is under `src/extensions/` (re-
   checked locally, not trusted from the schema);
4. every supplied content byte string hashes to its `contentDigest`, and a
   missing or extra content entry fails;
5. generated files remain read-only: an overlay path equal to an existing
   generated path is rejected (overlays only add new extension files).

A stale baseline yields `conflictState: "stale-baseline"`; a missing declared
slot file yields `"slot-removed"`; both fail closed with one fixed redacted
error. Success returns the path-ordered union of generated files plus overlay
files, each overlay entry marked `origin: "overlay"`.

### Diff

`diffGeneratedFiles` in `packages/compiler/src/targets/source/diff.ts`
produces a deterministic, dependency-free diff between two
`GeneratedFile` sets (or one file): added, removed, and changed paths plus, for
a changed file, a line-level diff (add/remove/context). Diff output never
contains credentials, raw model material, or bytes outside the admitted sets.

### ZIP export

`buildSourceZip` in `packages/compiler/src/targets/source/export-zip.ts`
serializes a checked source manifest into a deterministic archive: path-sorted
entries, fixed DOS timestamps, stored or `node:zlib` raw-deflated entries, and a
hand-rolled CRC-32. Symlink, absolute, traversal, package/configuration/entry,
and reserved paths are rejected before serialization. Equal input always
produces byte-identical output.

### Git export

`buildGitExport` in `packages/compiler/src/targets/source/export-git.ts`
renders blobs, nested trees, and one commit from a checked file set using
`node:crypto` SHA-1 object ids and `node:zlib` deflate object encoding. It
produces no working-tree mutation, no remote, and no network action. The commit
message and tree are deterministic for equal input. Secrets and raw model
material never enter objects.

## Security boundary

- The immutable Compilation artifact manifest remains the tree authority; the
  `GeneratedArtifactReader` remains the byte authority.
- Overlay apply, ZIP, and Git serialization operate only on already-admitted
  plain data; caller accessors, conversion hooks, iterators, and `toJSON` are
  never invoked; reflection failures yield one fixed redacted error.
- Exports exclude `package.json`, lockfiles, `tsconfig*`/`jsconfig*`,
  dotfile configuration, entry files, credentials, `.env*`, raw prompts, and
  raw model responses.
- No new Control Plane route is required; export responses reuse the existing
  tenant- and digest-scoped read-only artifact route and record no bodies.

## Exact implementation manifest

Compiler source target (new):

1. `packages/compiler/src/targets/source/source-manifest.ts`
2. `packages/compiler/src/targets/source/overlay.ts`
3. `packages/compiler/src/targets/source/diff.ts`
4. `packages/compiler/src/targets/source/export-zip.ts`
5. `packages/compiler/src/targets/source/export-git.ts`

Tests:

6. `packages/compiler/test/source-manifest.test.ts`
7. `packages/compiler/test/source-overlay-apply.test.ts`
8. `packages/compiler/test/source-diff.test.ts`
9. `packages/compiler/test/source-export-zip.test.ts`
10. `packages/compiler/test/source-export-git.test.ts`

The Workbench download/diff surface and its E2E journey are deferred to a
follow-up slice that adds a tenant- and digest-scoped read-only source-export
route; this slice's frozen "no new Control Plane route" boundary excludes that
transport.

No fixture, Graph, Capability, Recipe, schema, facade, package, lockfile,
worker, Control Plane route, Publish, provider, service, Docker, or Compose
path is writable. Any path outside this manifest is a PM STOP.

## Verification and delivery

Focused TDD RED/GREEN per component; full Compiler, Graph, and Capabilities
suites; no-emit and build gates; direct Prettier and
`git diff --check` on the manifest; adversarial matrix (traversal, symlink,
absolute, archive-entry, package/config/entry, stale baseline, removed slot,
hostile objects, secret/raw-model exclusion); ZIP round-trip re-read; and
byte-identical ZIP/Git determinism.

One independent Sol review is mandatory. Terra and a separate final Sol release
review are not required unless review finds a stable-boundary/security P0/P1 or
the repair changes this contract. The exact delivery subject and governance
manifest are frozen in the executable plan.
