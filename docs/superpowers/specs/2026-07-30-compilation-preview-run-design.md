# Compilation Preview Run Design

## Goal

Close the local business-user loop by allowing a succeeded immutable
Compilation to start, open, and stop its own isolated generated application
from Factory Pilot. A preview always serves generated Web and API artifacts;
it never serves the Workbench, Puck, a Draft, or editor state.

## Scope

The slice adds a local-only Preview Run lifecycle:

```text
Succeeded Compilation
  -> PreviewRun requested
  -> Worker starts generated Docker Compose project
  -> Workbench opens the generated Web URL
  -> PreviewRun stopped and isolated resources removed
```

It does not introduce cloud deployment, public ingress, user-supplied Compose
files, arbitrary command execution, draft preview, or retained runtime
credentials.

## Ownership and Lifecycle

`PreviewRun` is a persistent Control Plane record linked to exactly one
immutable Compilation. It contains only Factory-generated identifiers,
allocated loopback ports, lifecycle state, timestamps, and a safe generated
Web URL. It does not persist Graph data, artifact file contents, credentials,
commands, model inputs, or model responses.

Preview states are `starting`, `ready`, `stopping`, `stopped`, and `failed`.
Only a compilation whose result status is `succeeded` can create a Preview
Run. A Preview Run cannot change its compilation, ports, or Compose project
identity after creation. Start and stop requests are idempotent for the
current run state.

## Worker Boundary

The Worker owns the only executable boundary. It resolves the generated
artifact directory from the immutable compilation record, validates that the
directory remains below `FACTORY_ARTIFACT_ROOT`, and invokes Docker Compose
with an argument array rather than a shell. The Worker derives:

- a deterministic Factory-only Compose project name from the PreviewRun ID;
- two allocated loopback host ports for Web and API;
- an environment allowlist containing only the generated Compose port and
  project variables.

The generated `docker-compose.yml` remains compiler-owned. The Graph cannot
provide a Compose filename, command, project name, hostname, URL, or port.
Stopping uses the same recorded project and directory with `down --volumes
--remove-orphans`, then removes only the PreviewRun directory. It must not
inspect or stop unrelated Docker projects, volumes, or networks.

The local Worker image receives Docker Compose capability through a narrowly
declared local Docker socket mount. This is a local single-tenant v1 runtime
boundary, not a cloud deployment mechanism.

## Control Plane API

The Control Plane exposes compilation-scoped operations:

```text
POST /compilations/:compilationId/preview-runs
GET  /compilations/:compilationId/preview-runs/current
POST /preview-runs/:previewRunId/stop
```

The start endpoint rejects unknown, queued, running, failed, and Draft-only
inputs. It creates a `starting` PreviewRun and emits a Worker job. The Worker
reports only safe lifecycle changes and the loopback URL. If Docker build,
health, or startup fails, the state becomes `failed` with a bounded safe
diagnostic; no raw subprocess environment or generated source is retained in
the record.

## Workbench Experience

Code Studio gains a compact Generated preview card for a succeeded
Compilation. It exposes a state indicator, **Open preview**, **Stop preview**,
and an explicit cleanup confirmation. It uses the Control Plane preview URL
and opens the generated Web application in a separate browser tab. It never
embeds a generated application inside the editor and never presents preview
controls for a mutable Draft or an unsuccessful Compilation.

## Verification

Focused tests prove:

- Prisma and lifecycle validation reject every non-succeeded Compilation.
- Worker command construction cannot escape the immutable artifact root,
  inject commands, reuse caller-supplied ports, or target another project.
- Start and stop report only valid PreviewRun transitions.
- Workbench exposes preview controls only for a succeeded Compilation.
- Browser E2E edits a Draft, saves it, publishes it, compiles it, starts a
  preview, visits a declared PageModel route in the generated app, exercises a
  role journey, stops it, and proves the named generated Compose resources and
  preview directory are absent.

Existing Factory services and unrelated Compose projects remain untouched.
