# Preview Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local generated-application previews safe to release by enforcing the Worker boundary, reconstructing previews only from verified immutable artifacts, and bounding/cancelling Docker execution.

**Architecture:** The Control Plane becomes the sole authority for a minimal, authenticated preview dispatch record. The Worker consumes an authenticated queue, resolves that record from the Control Plane, reconstructs a new runtime directory from the registered artifact manifest, and uses an explicit Compose file. Preview start operations are cancellable and deadline-bound; stopping a `starting` preview aborts only that preview's derived runtime project.

**Tech Stack:** NestJS, Prisma/PostgreSQL, BullMQ/Redis, Node crypto and child processes, Docker Compose, Next.js, Vitest, Playwright.

## Global Constraints

- Code, tests, UI text, and documentation are English.
- Keep `FACTORY_REDIS_PASSWORD` and `FACTORY_INTERNAL_WORKER_TOKEN` only in the local `.env`; never commit, log, expose, or include their values in reports.
- Redis has no host-published port and requires its local environment password. Only Control Plane and Compiler Worker receive its host-only URL and a separate password connection option; password values must not be interpolated into a URI.
- All `/internal/*` callbacks and dispatch reads require the Worker token using a constant-time comparison.
- A BullMQ preview payload contains only `{ action, previewRunId }`; Worker runtime paths, project names, and artifact manifests are resolved from the authenticated Control Plane dispatch endpoint.
- A preview is reconstructed from every registered artifact's safe relative path, SHA-256 digest, and exact byte size. Unexpected, missing, changed, or symlinked source files fail closed.
- Docker Compose always receives the explicit verified `docker-compose.yml`; no implicit override or discovery is allowed.
- Start, port discovery, readiness, and cleanup calls have deadlines. A stop requested while `starting` cancels only the named preview's current process/project and releases `activeKey` only after verified stop evidence.
- Do not record credentials, raw Graphs, raw prompts/responses, generated source, shell commands, or raw subprocess output in persisted state or reports.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `apps/control-plane/src/internal-worker-auth.ts` | Validate Worker token for internal HTTP boundaries. |
| `apps/control-plane/src/preview-run-queue.ts` | Dispatch only preview ID and action. |
| `apps/control-plane/src/lifecycle.service.ts` | Produce an authority-checked preview dispatch with registered artifact evidence. |
| `apps/control-plane/src/lifecycle.controller.ts` | Guard internal callbacks/dispatch and permit cancelling `starting` previews. |
| `apps/compiler-worker/src/config.ts` | Require Worker token and bounded preview operation timeout. |
| `apps/compiler-worker/src/preview-dispatch-client.ts` | Fetch a minimal authenticated dispatch record. |
| `apps/compiler-worker/src/preview-runner.ts` | Verify/reconstruct artifact manifests, run explicit Compose with deadlines, cancel exact projects. |
| `apps/compiler-worker/src/queued-preview-run.ts` | Resolve an authoritative dispatch before privileged runtime work. |
| `apps/compiler-worker/src/*-reporter.ts` | Authenticate Worker evidence callbacks. |
| `infra/docker-compose.yml` | Restrict Redis and inject local-only service secrets into exactly the services that need them. |
| `apps/workbench/lib/workbench-model.ts` | Present failed previews as stop/recovery-only. |

### Task 1: Authenticate Worker transport and authoritative preview dispatch

**Files:**

- Create: `apps/control-plane/src/internal-worker-auth.ts`
- Modify: `apps/control-plane/src/lifecycle.controller.ts`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/src/preview-run-queue.ts`
- Modify: `apps/control-plane/src/compilation-queue.ts`
- Modify: `apps/control-plane/test/lifecycle.controller.test.ts`
- Modify: `apps/control-plane/test/lifecycle.service.test.ts`
- Modify: `apps/control-plane/test/preview-run-queue.test.ts`
- Modify: `apps/control-plane/test/compilation-queue.test.ts`
- Create: `apps/control-plane/test/internal-worker-auth.test.ts`
- Create: `apps/compiler-worker/src/preview-dispatch-client.ts`
- Modify: `apps/compiler-worker/src/config.ts`
- Modify: `apps/compiler-worker/src/main.ts`
- Modify: `apps/compiler-worker/src/queued-preview-run.ts`
- Modify: `apps/compiler-worker/src/control-plane-reporter.ts`
- Modify: `apps/compiler-worker/src/preview-reporter.ts`
- Modify: `apps/compiler-worker/test/config.test.ts`
- Modify: `apps/compiler-worker/test/queued-preview-run.test.ts`
- Modify: `apps/compiler-worker/test/control-plane-reporter.test.ts`
- Create: `apps/compiler-worker/test/preview-dispatch-client.test.ts`
- Modify: `infra/docker-compose.yml`

**Consumes:** Existing `Compilation`, `PreviewRun`, and per-file `Artifact` evidence.

**Produces:** `PreviewRunJob = { action: "start" | "stop"; previewRunId: string }` and an authenticated Worker-only dispatch record:

```ts
type PreviewDispatch = {
  readonly action: "start" | "stop";
  readonly previewRunId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
  readonly artifacts: readonly {
    readonly path: string;
    readonly digest: string;
    readonly sizeBytes: number;
  }[];
};
```

- [ ] **Step 1: Write failing transport tests**

Add HTTP tests proving that each `/internal/*` endpoint returns `401` without
the Worker header and without a matching token, and invokes the lifecycle
method only for a valid header. Add service tests proving a `start` dispatch
is available only while a PreviewRun is `starting`, a `stop` dispatch only
while it is `stopping`, and a dispatch returns the compilation's registered
artifact evidence. Add queue tests proving no root path, Compose project, or
Compilation ID appears in a Redis job. Add Worker tests proving an unsigned
or malformed job cannot invoke the runtime and that the Worker fetches the
dispatch before it starts or stops Docker.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
pnpm --filter @factory/control-plane test -- internal-worker-auth.test.ts lifecycle.controller.test.ts lifecycle.service.test.ts preview-run-queue.test.ts
pnpm --filter @factory/compiler-worker test -- config.test.ts preview-dispatch-client.test.ts queued-preview-run.test.ts control-plane-reporter.test.ts preview-reporter.test.ts
```

Expected: FAIL because internal routes accept unauthenticated callers and the
queue currently transports privileged runtime values.

- [ ] **Step 3: Implement authenticated transport and dispatch authority**

Create a constant-time `x-factory-internal-token` validator. Guard the
compilation callback, all preview evidence callbacks, and a new Worker-only
dispatch endpoint. The endpoint validates a requested action, reads the
PreviewRun plus immutable Compilation artifacts from Prisma, checks the state
transition, validates every artifact path/digest/size, and returns only the
dispatch shape above.

Change public preview queue jobs to ID/action only. Change Worker execution
to verify the queue record is structurally exact, fetch the authenticated
dispatch, verify action/id equality, then invoke the runtime. Callback
reporters attach the token but never serialize it into their payload.

Configure Redis with `requirepass`, remove its `ports` section, pass its
host-only URL and a separate password option only to Control Plane and Worker,
and require the distinct Worker callback token for both services. Do not
interpolate the password into a URI, add a default token, or add a default
password. Compose must fail closed when either local environment value is
absent.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run the two focused commands above plus:

```bash
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/compiler-worker typecheck
```

Expected: PASS; an external HTTP caller and a queue payload containing a path
cannot reach the Docker runtime.

- [ ] **Step 5: Commit Task 1**

```bash
git add apps/control-plane apps/compiler-worker infra/docker-compose.yml
git commit -m "fix: authenticate preview worker dispatch"
```

### Task 2: Reconstruct previews exclusively from verified artifact manifests

**Files:**

- Modify: `apps/compiler-worker/src/preview-runner.ts`
- Modify: `apps/compiler-worker/test/preview-runner.test.ts`
- Modify: `apps/compiler-worker/src/queued-preview-run.ts`
- Modify: `apps/compiler-worker/test/queued-preview-run.test.ts`

**Consumes:** Task 1 `PreviewDispatch` with safe artifact evidence.

**Produces:** A runtime request that has an artifact manifest and only
materializes verified regular files into `.preview-runs/<previewRunId>`.

- [ ] **Step 1: Write failing immutable-artifact tests**

Create a source directory containing registered `docker-compose.yml` and
application files. Assert start copies only the registered files, preserving
their content. Add individual tests where a registered file has a changed
digest, changed byte size, is missing, source contains an extra file such as
`docker-compose.override.yml`, or a source entry is a symlink. Each case must
reject before an `up` command is issued. Assert every Compose command includes
the copied explicit `--file <preview>/docker-compose.yml` argument.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
pnpm --filter @factory/compiler-worker test -- preview-runner.test.ts queued-preview-run.test.ts
```

Expected: FAIL because the current implementation recursively copies the
entire source directory and lets Compose discover files implicitly.

- [ ] **Step 3: Implement manifest verification and explicit Compose**

Validate every manifest entry as a safe POSIX relative path and SHA-256 digest
with a non-negative exact size. Walk the source tree without following
symlinks; its regular-file set must exactly equal the manifest's path set.
Read each registered source file as bytes, compare byte length and SHA-256,
then write those bytes to the derived PreviewRun directory. Reject absent,
extra, altered, duplicate, or symlinked artifacts before any Docker call.

Require a registered `docker-compose.yml`, resolve it inside the derived
directory, and include it with `docker compose --file` for `up`, `port`,
`exec`, and `down` operations. Preserve source immutability and exact-project
cleanup behavior.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
pnpm --filter @factory/compiler-worker test -- preview-runner.test.ts queued-preview-run.test.ts
pnpm --filter @factory/compiler-worker typecheck
```

Expected: PASS; an unregistered Compose override can never be executed by the
Docker-socket Worker.

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/compiler-worker
git commit -m "fix: verify preview artifact manifests"
```

### Task 3: Bound and cancel preview Docker operations

**Files:**

- Modify: `apps/compiler-worker/src/preview-runner.ts`
- Modify: `apps/compiler-worker/src/queued-preview-run.ts`
- Modify: `apps/compiler-worker/src/main.ts`
- Modify: `apps/compiler-worker/src/config.ts`
- Modify: `apps/compiler-worker/test/preview-runner.test.ts`
- Modify: `apps/compiler-worker/test/queued-preview-run.test.ts`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/test/lifecycle.service.test.ts`
- Modify: `apps/workbench/lib/workbench-model.ts`
- Modify: `apps/workbench/lib/workbench-model.test.ts`

**Consumes:** Task 1 authority dispatch and Task 2 deterministic runtime
directory.

**Produces:** Deadline-bound Docker process execution, `starting` cancellation,
and a UI that treats failure as a cleanup/recovery state.

- [ ] **Step 1: Write failing cancellation and deadline tests**

Add a process-runner test whose promise does not resolve. With a short
injected operation deadline, start must reject with only
`preview_start_timeout`, call exact-project Docker cleanup, and leave no
active Docker runtime. Retain only the already verified per-run directory so a
later failed-state Stop can re-verify and remove it before releasing
`activeKey`. Add a runtime test that starts a cancellable command then
calls stop: the start resolves as cancellation without publishing ready/failed
evidence, the stop completes with stopped evidence, and only that derived
project is removed. Add lifecycle coverage that `stopPreviewRun` transitions
from `starting` to `stopping`, and Workbench coverage that `failed` disables
Start while retaining Stop.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
pnpm --filter @factory/compiler-worker test -- preview-runner.test.ts queued-preview-run.test.ts config.test.ts
pnpm --filter @factory/control-plane test -- lifecycle.service.test.ts
pnpm --filter @factory/workbench test -- workbench-model.test.ts
```

Expected: FAIL because a non-resolving process blocks the single Worker and
the Control Plane rejects stopping a `starting` preview.

- [ ] **Step 3: Implement bounded process and cancellation lifecycle**

Add a bounded operation timeout configuration with a safe positive range and
a default appropriate for local Compose builds. `runDockerCompose` accepts an
`AbortSignal`, terminates its child on timeout/cancellation, waits for process
exit, and exposes only allowlisted timeout/cancellation errors. The runtime
tracks active starts by PreviewRun ID; a stop aborts that ID's start signal,
runs exact-project `down`, and deletes only its derived directory. Use preview
queue concurrency of at least two solely so its stop can be processed while a
start is pending. A cancelled start does not publish ready or failure evidence;
the stop action owns the stopped transition. Any ordinary timeout publishes the
allowlisted timeout diagnostic, stops the exact Docker project, and retains
only its verified per-run directory for failed-state Stop recovery.

Allow Control Plane stop from `starting`, `ready`, and `failed`. Preserve
`activeKey` until the Worker reports stopped. A failed run remains stop-only in
the Workbench, preventing a Start action that would conflict with the active
key.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run the three focused commands above plus:

```bash
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/workbench typecheck
```

Expected: PASS; an indefinitely pending Docker action no longer blocks all
preview recovery.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/compiler-worker apps/control-plane apps/workbench
git commit -m "fix: bound and cancel preview operations"
```

### Task 4: Re-run independent preview acceptance and correct release record

**Files:**

- Modify: `e2e/workbench.spec.ts` only when a focused regression test is required
- Modify: `docs/acceptance/compilation-preview-run.md`
- Modify: `docs/roadmap.md`

**Consumes:** Tasks 1–3.

**Produces:** Evidence that the released PreviewRun uses authenticated Worker
transport, verified artifacts, and bounded cleanup without touching user
containers.

- [ ] **Step 1: Add a focused browser/state regression if absent**

Ensure the generated preview journey waits for `Preview ready`, opens the
separate generated application, submits the Expense as Employee, approves as
Manager, stops the exact PreviewRun, and asserts the derived resources are
gone. Keep test evidence bounded to IDs, routes, status codes, and visible
categories; do not write Graph/source/prompt/credential data.

- [ ] **Step 2: Verify a dedicated local Compose project**

Set non-secret isolated service ports and both required local-only secrets in
the test process environment. Start a unique Factory project, run:

```bash
pnpm exec playwright test e2e/workbench.spec.ts -g "isolated generated preview employee and manager journey" --reporter=line
```

Then stop only that project and confirm no containers, networks, volumes, or
`.preview-runs/<id>` directory for that test remain. Existing user services
must remain untouched.

- [ ] **Step 3: Run release gates**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm verify:third-party
pnpm verify:source-studies
pnpm exec prettier --check docs/acceptance/compilation-preview-run.md docs/roadmap.md
git diff --check
```

Record the passed focused browser journey and all release-gate results. Replace
the prior accepted/release-ready wording with the corrected evidence only after
all gates are green. Preserve the known unrelated Workbench timing debt as
explicitly outside this PreviewRun acceptance.

- [ ] **Step 4: Commit Task 4**

```bash
git add e2e docs
git commit -m "test: harden preview release acceptance"
```

## Self-review

- Task 1 eliminates direct external Redis injection, protects callbacks, and
  makes Control Plane the authority for all privileged runtime inputs.
- Task 2 verifies the complete immutable artifact set before any Docker
  execution and removes implicit Compose configuration discovery.
- Task 3 prevents indefinite queue starvation, permits cancellation while
  starting, and removes the contradictory failed-preview Start affordance.
- Task 4 validates the actual generated application journey and exact cleanup
  in an isolated environment, then records the result accurately.
