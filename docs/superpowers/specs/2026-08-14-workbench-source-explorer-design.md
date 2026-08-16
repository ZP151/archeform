# Workbench Source Explorer Design

**Date:** 2026-08-14
**Status:** Accepted; implementation complete, not delivered
**Decision:** [ADR-0017](../../adr/adr-0017-workbench-source-explorer.md)
**Base:** `35da63df867dc0271254b1cbad38e5613a27c348`

## Outcome

Task 8A adds one truthful read-only journey:

```text
Builder -> Code -> Source
```

When the current Compilation is immutable and `succeeded`, the Code surface
shows every registered artifact ordered by path. Each row exposes its path,
media type, optional byte size, and SHA-256 digest. Selecting a row clears stale
content, shows the selected path as pending, and uses the existing artifact-
content endpoint. Content appears only after strict client admission binds the
returned path and digest to that selected manifest row and the server has
rehashed the registered bytes.

Task 7D is delivered at the base commit. Access and Workflow remain stopped at
design: the current generated Restaurant runtime does not enforce proposed
Graph-only grants or actors, so Workbench must not claim those changes.

## Chosen approach

Extend the existing `CodeCanvas` and reuse the controller's Compilation and
artifact-loading state. This keeps Source next to existing Published Graph,
Compilation, and preview facts. A separate Source subsystem or Activity-sheet
promotion would duplicate state and obscure the selected Compilation.

No Control Plane code changes. The existing endpoints already provide the two
authorities:

- `GET /compilations/:compilationId` returns the Compilation and path-ordered
  registered artifact rows;
- `GET /compilations/:compilationId/artifact-content?path=...` scopes the row to
  the Compilation, rereads the registered file beneath its safe root, rejects
  files over 1,000,000 bytes, verifies SHA-256, and returns
  `{path,digest,content}`.

## Frozen client boundary

Add this exported descriptor type and parser:

```ts
export type WorkbenchCompilationArtifact = {
  readonly path: string;
  readonly digest: string;
  readonly mediaType: string;
  readonly sizeBytes?: number | null;
};

export function admitCompilationArtifactContent(
  input: unknown,
  selected: WorkbenchCompilationArtifact,
): WorkbenchArtifactContent;
```

`admitCompilationArtifactContent` accepts exactly three own enumerable data
properties in either JSON key order: `path`, `digest`, and `content`. It rejects
arrays, custom prototypes, inherited/extra/symbol/non-enumerable/accessor
properties, boxed primitives, invalid digest syntax, mismatched selection
path/digest, and non-string or over-bound content. Reflection is bounded and
caller behavior is never deliberately invoked. Success returns a new frozen
primitive object. Every failure throws only:

```text
Control Plane artifact response is invalid.
```

`ControlPlaneClient.getCompilationArtifact` changes to consume the complete
selected descriptor, not a free path, and applies this parser after the GET.
The request path is still the selected manifest path encoded as one query
value. The client never sends or logs content or digest material.

Compilation artifact parsing additionally requires nonempty safe relative
forward-slash paths, `sha256:` plus 64 lowercase hexadecimal characters,
nonempty media type, nonnegative safe optional byte size, and unique artifact
paths. The Source view sorts a copied list by UTF-16 code-unit path order; it
does not mutate the response.

## Controller state and races

The controller exposes:

```ts
readonly selectedArtifact: WorkbenchCompilationArtifact | null;
readonly artifactError: string | null;
readonly inspectArtifact: (artifactPath: string) => void;
```

The existing path callback remains compatible with the Activity sheet. The
controller resolves that path to exactly one descriptor in the current
Compilation manifest and ignores an absent/unregistered path; only the resolved
descriptor enters the strict client method. Selection synchronously stores a
frozen descriptor copy, clears `artifactSnapshot`, clears `artifactError`, and
enters loading before the request. A monotonically increasing request token
admits only the latest selection's completion. Changing or clearing the
Compilation invalidates the token and clears selection/content/artifact error.
A failure for the current token leaves the selected path visible, sets content
to null, and sets only:

```text
Generated artifact could not be inspected.
```

Late success or failure from an older selection changes nothing.
`operationError` remains unrelated Workbench operation state and is not Source
viewer authority; it cannot hide admitted content or substitute for the fixed
artifact failure.

## Source surface

`CodeCanvas` receives the current Compilation, selected descriptor, loading
state, admitted content, dedicated artifact error, and the existing path
selection callback.
The existing Graph facts, diff, adapters, exchange, and preview controls remain
available and unchanged.

Source is disabled unless `compilation.result.status === "succeeded"`. The
Source region has:

- a labelled tree/list of every registered artifact in path order;
- one keyboard-operable button per file with path, media type, formatted byte
  size when present, and full digest available to assistive technology;
- selected and focus-visible states;
- a labelled content viewer showing selected path and verified digest;
- an `aria-live` pending/failure status; and
- a 390px single-column layout with no fixed-width overflow.

Pending renders the selected path and no code. Failure renders the selected
path, fixed message, and no code. Success renders code only when the admitted
content path/digest equal the still-current selection.

## Scope and path manifest

Exactly nine implementation paths are authorized:

1. `apps/workbench/lib/control-plane-client.ts`
2. `apps/workbench/lib/control-plane-client.test.ts`
3. `apps/workbench/hooks/use-workbench-controller.ts`
4. `apps/workbench/components/workbench.tsx`
5. `apps/workbench/components/canvases/code-canvas.tsx`
6. `apps/workbench/components/canvases/code-canvas.test.tsx` (new)
7. `apps/workbench/app/globals.css`
8. `apps/workbench/e2e/source-explorer.pw.ts` (new)
9. `apps/workbench/components/shell/workbench-shell.test.tsx`

Existing Workbench components, CSS, and native controls satisfy the reuse-first
policy. A new component, registry key, package, asset, or stylesheet has no
distinct semantic need. The ninth path only replaces the malformed existing
mock digest `sha256:journey` with a valid 64-lowercase-hex fixture after the
strict client correctly rejects it; no production behavior may change. Any
tenth implementation path stops the writer.

## Verification

Focused TDD covers strict response admission, manifest descriptor validation,
latest-selection authority, dedicated error isolation, succeeded-only
visibility, complete ordered rows, pending/failure clearing, keyboard semantics,
and narrow layout. The real
browser covers a succeeded Compilation, two deliberately reordered manifest
rows, delayed selection A followed by selection B, rejected content, verified
success, reload, keyboard focus, and 390px overflow.

Run the full Workbench suite, repository-resolved no-emit check, direct Next
build, direct Prettier on the exact nine paths, `git diff --check`, browser-
import/static/sensitive scans, and exact containment. No package manager,
install, service, network, Docker, or Compose action is authorized.

After writer GREEN, one independent intended-vs-implemented review and one
targeted real-browser QA pass must be clean. One fresh final Sol review owns the
strict-response release judgment. PM/controller alone owns the exact 15-path
delivery commit and non-force push.

Final evidence is clean independent re-review, targeted Terra `PASS`, and final
Sol `RELEASE_ACCEPT` with actionable P0/P1/P2=0/0/0 after stale-failure and
valid-success A/B characterization. PM delivery authority is exact 15 only.

## Deferrals

Search, diff, edit, overlays, ZIP, Git, export, Draft Preview Snapshot content,
Draft-to-source claims, Compilation creation, Publish, reverse parsing,
Graph/Capabilities/recipes/Compiler/generated runtime, Control Plane, Prisma or
database changes, dependencies/locks, providers/network/services, Docker,
Compose, deployment, and Access/Workflow expansion remain out of scope.
