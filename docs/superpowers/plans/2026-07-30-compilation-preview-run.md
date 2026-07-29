# Compilation Preview Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a business user start, open, and stop a locally isolated generated application from a succeeded immutable Compilation.

**Architecture:** The Control Plane persists a compilation-bound `PreviewRun` and emits only Factory-controlled start or stop jobs. The Worker resolves the recorded immutable artifact root, invokes Docker Compose with an argument array and allowlisted environment, and reports safe status evidence. Workbench Code Studio polls and controls that record but never embeds or substitutes the generated application.

**Tech Stack:** NestJS, Prisma/PostgreSQL, BullMQ, Node child processes, Docker Compose, Next.js, Playwright, Vitest.

## Global Constraints

- Code, tests, UI text, and documentation are English.
- Only `Compilation.result.status === "succeeded"` can create a PreviewRun.
- A PreviewRun references an immutable Compilation and must never compile or serve a Draft.
- Preview commands, paths, Compose project names, ports, hosts, and URLs are Factory-controlled; Graphs and callers cannot provide them.
- Worker subprocesses use argument arrays, never a shell. Docker Compose receives only a generated artifact directory below `FACTORY_ARTIFACT_ROOT` and an allowlisted environment.
- Each PreviewRun has an isolated Compose project and loopback Web/API ports. Stop removes only that named project's containers, volumes, networks, and preview directory.
- Do not record credentials, raw prompts, raw model responses, raw Graph data, shell commands, or generated source in PreviewRun records or reports.
- The local Docker socket capability belongs only to the Worker service. It is not a cloud runtime or a generic code-execution API.
- Existing Factory services and unrelated Docker projects are never stopped or removed.

---

## File Structure

| Path                                                             | Responsibility                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/control-plane/prisma/schema.prisma`                        | Persist PreviewRun state linked to immutable Compilation.                           |
| `apps/control-plane/src/preview-run-queue.ts`                    | Define and enqueue restricted start/stop Worker jobs.                               |
| `apps/control-plane/src/lifecycle.service.ts`                    | Validate lifecycle, create/read/stop PreviewRuns, accept internal safe evidence.    |
| `apps/control-plane/src/lifecycle.controller.ts`                 | Expose compilation-scoped preview endpoints and Worker callbacks.                   |
| `apps/compiler-worker/src/preview-runner.ts`                     | Validate artifact roots, allocate loopback ports, and invoke Docker Compose safely. |
| `apps/compiler-worker/src/queued-preview-run.ts`                 | Dispatch start/stop jobs and report safe preview evidence.                          |
| `apps/compiler-worker/src/preview-reporter.ts`                   | Send Worker evidence to the Control Plane.                                          |
| `apps/compiler-worker/src/main.ts`                               | Consume the preview queue in addition to the compilation queue.                     |
| `apps/compiler-worker/src/config.ts`                             | Read the preview queue and runtime-root configuration.                              |
| `apps/compiler-worker/Dockerfile` and `infra/docker-compose.yml` | Install Docker Compose client and grant the Worker-only local socket mount.         |
| `apps/workbench/lib/control-plane-client.ts`                     | Serialize preview API requests and safe response records.                           |
| `apps/workbench/components/workbench.tsx`                        | Render and poll a compact generated-preview control card in Code Studio.            |
| `e2e/workbench.spec.ts`                                          | Prove the user journey into a generated Web preview and its cleanup.                |
| `docs/acceptance/compilation-preview-run.md`                     | Record isolated runtime evidence and cleanup result.                                |

### Task 1: Persist and govern PreviewRuns in the Control Plane

**Files:**

- Modify: `apps/control-plane/prisma/schema.prisma`
- Create: `apps/control-plane/src/preview-run-queue.ts`
- Modify: `apps/control-plane/src/app.module.ts`
- Modify: `apps/control-plane/src/lifecycle.service.ts`
- Modify: `apps/control-plane/src/lifecycle.controller.ts`
- Modify: `apps/control-plane/test/prisma-schema.test.ts`
- Modify: `apps/control-plane/test/lifecycle.service.test.ts`
- Modify: `apps/control-plane/test/lifecycle.controller.test.ts`

**Consumes:** Existing succeeded `Compilation`, artifact root metadata, and BullMQ connection convention.

**Produces:** `PreviewRun`, `PreviewRunQueue`, public start/current/stop operations, and internal Worker evidence operations used by Task 2.

- [ ] **Step 1: Write failing persistence and lifecycle tests**

Add a schema test requiring a `PreviewRun` relation from `Compilation` and a
service test with a fake `PreviewRunQueue`:

```ts
await expect(service.createPreviewRun(queuedCompilation.id)).rejects.toThrow(
  "Compilation must succeed before a preview can start.",
);

const preview = await service.createPreviewRun(succeededCompilation.id);
expect(preview.status).toBe("starting");
expect(enqueued).toEqual([
  expect.objectContaining({ action: "start", previewRunId: preview.id }),
]);
```

Add controller tests for `POST /compilations/:id/preview-runs`, `GET
/compilations/:id/preview-runs/current`, and `POST /preview-runs/:id/stop`.

- [ ] **Step 2: Run the focused tests to verify RED**

Run:

```bash
pnpm --filter @factory/control-plane test -- lifecycle.service.test.ts lifecycle.controller.test.ts prisma-schema.test.ts
```

Expected: FAIL because PreviewRun types, endpoints, and queue contract do not
exist.

- [ ] **Step 3: Add the immutable PreviewRun schema and queue boundary**

Add a `PreviewRun` model with `compilationId`, per-compilation `sequence`,
Factory-generated `composeProjectName`, nullable Worker-assigned `webPort` and
`apiPort`, lifecycle `status`, nullable safe `previewUrl`, bounded safe
`diagnostic`, and timestamps. Add `previewRuns` to `Compilation`.

Create the exact job contract:

```ts
export type PreviewRunJob = {
  readonly action: "start" | "stop";
  readonly previewRunId: string;
  readonly compilationId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
};

export interface PreviewRunQueue {
  enqueue(job: PreviewRunJob): Promise<void>;
}
```

Use a dedicated `factory-preview-runs` BullMQ queue with bounded completed and
failed jobs. Register it in `AppModule`.

- [ ] **Step 4: Implement fail-closed lifecycle operations**

In `LifecycleService`, resolve the generated root directory only from the
succeeded compilation's registered artifact metadata. `createPreviewRun` must
reject non-succeeded compilations, create a Factory-only project name such as
`factory-preview-<previewRunId>`, persist `starting`, and enqueue a `start`
job. `getCurrentPreviewRun` returns the most recent run for the compilation.
`stopPreviewRun` accepts only `ready` or `failed`, transitions it to
`stopping`, resolves its immutable root, and enqueues `stop`.

Implement internal Worker-only evidence methods that permit only:

```ts
reportPreviewReady(previewRunId, { webPort, apiPort, previewUrl });
reportPreviewFailed(previewRunId, { diagnostic });
reportPreviewStopped(previewRunId);
```

They validate status transitions, require loopback URLs, retain no commands or
source content, and reject a mismatched compilation/root/project identity.

- [ ] **Step 5: Add controller routes and verify GREEN**

Expose the three public routes and three internal evidence routes. Use the
existing exact-body validation pattern so callers cannot attach paths, ports,
URLs, environment variables, or commands.

Run:

```bash
pnpm --filter @factory/control-plane test -- lifecycle.service.test.ts lifecycle.controller.test.ts prisma-schema.test.ts
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/control-plane lint
```

Expected: PASS, including failed status/transition tests.

- [ ] **Step 6: Commit Task 1**

```bash
git add apps/control-plane
git commit -m "feat: govern compilation preview runs"
```

### Task 2: Run and clean generated Compose projects from the Worker

**Files:**

- Create: `apps/compiler-worker/src/preview-runner.ts`
- Create: `apps/compiler-worker/src/queued-preview-run.ts`
- Create: `apps/compiler-worker/src/preview-reporter.ts`
- Modify: `apps/compiler-worker/src/config.ts`
- Modify: `apps/compiler-worker/src/main.ts`
- Modify: `apps/compiler-worker/Dockerfile`
- Modify: `infra/docker-compose.yml`
- Modify: `packages/compiler/src/index.ts`
- Create: `apps/compiler-worker/test/preview-runner.test.ts`
- Create: `apps/compiler-worker/test/queued-preview-run.test.ts`
- Modify: `apps/compiler-worker/test/worker-config.test.ts`
- Modify: `apps/compiler-worker/test/dockerfile.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** Task 1 `PreviewRunJob` and safe Worker reporting endpoints.

**Produces:** Worker-owned local Compose start/stop behavior and Worker-only
Docker socket wiring used by Task 4.

- [ ] **Step 1: Write failing Worker isolation tests**

Write direct tests against a dependency-injected process runner and port
allocator:

```ts
await expect(
  startPreview({ rootDirectory: "../outside", composeProjectName: "bad" }),
).rejects.toThrow("outside the Factory artifact root");

expect(spawned).toEqual([
  expect.objectContaining({
    file: "docker",
    args: expect.arrayContaining([
      "compose",
      "up",
      "--build",
      "--detach",
      "--wait",
    ]),
  }),
]);
expect(spawned[0].environment).toMatchObject({
  FACTORY_COMPOSE_PROJECT_NAME: expect.stringMatching(/^factory-preview-/),
  FACTORY_WEB_PORT: expect.any(String),
  FACTORY_API_PORT: expect.any(String),
});
```

Also assert that stop uses the same project directory and `down --volumes
--remove-orphans`, that no shell is invoked, and that no unrelated path can
be removed.

- [ ] **Step 2: Run Worker tests to verify RED**

Run:

```bash
pnpm --filter @factory/compiler-worker test -- preview-runner.test.ts queued-preview-run.test.ts worker-config.test.ts dockerfile.test.ts
```

Expected: FAIL because preview runner and queue processing do not exist.

- [ ] **Step 3: Implement the dependency-injected preview runner**

Implement `startPreviewRun` and `stopPreviewRun` with these invariants:

```ts
type PreviewRuntimeRequest = {
  readonly previewRunId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
};

type StartedPreview = {
  readonly webPort: number;
  readonly apiPort: number;
  readonly previewUrl: string;
};
```

Resolve the immutable generated source root from `FACTORY_ARTIFACT_ROOT` with
the same non-escaping semantics as the artifact writer. Copy it into a
PreviewRun-specific directory below that root before Compose starts; never
delete or mutate the immutable compilation directory. Ask Docker Compose to
choose loopback host ports, obtain those ports with `docker compose port`, and
report the browser-safe `127.0.0.1` URL. Readiness must execute from the Docker
daemon namespace (for example with `docker compose exec` against the generated
Web service), not against the Worker container's own loopback namespace.
Invoke `docker compose` as an argument array with `--project-name`,
`--project-directory`, `up --build --detach --wait`, and only generated
project/port environment values. On failure, clean up only that named project
and PreviewRun directory, then return a bounded allowlisted failure code.

- [ ] **Step 4: Add preview queue dispatch and reporting**

Extend Worker config with `FACTORY_PREVIEW_QUEUE` defaulting to
`factory-preview-runs`. Start a second BullMQ Worker in `main.ts`. Its start
job invokes `startPreviewRun`, then sends only `webPort`, `apiPort`, and the
loopback URL to `POST /internal/preview-runs/:id/ready`. Its stop job calls
`stopPreviewRun`, removes the named PreviewRun directory below the artifact
root, and reports stopped. Failure reports only a bounded safe diagnostic.

- [ ] **Step 5: Wire the Worker-only Docker client**

Install `docker-cli` and Docker Compose plugin in the Worker runtime image.
In Factory's local Compose file mount the Docker socket only into
`compiler-worker`; do not mount it into Control Plane or Workbench. Extend
Dockerfile/config tests to prove the mount and client belong solely to the
Worker service.

Update the generated Compose contract so Web and API port mappings bind only
to `127.0.0.1` and accept Docker-selected ephemeral ports for Factory-run
previews. Keep explicit environment port values usable for the generated
application's documented manual run. Add a compiler assertion for both
loopback mappings.

- [ ] **Step 6: Verify GREEN and materialize a generated runtime**

Run:

```bash
pnpm --filter @factory/compiler-worker test -- preview-runner.test.ts queued-preview-run.test.ts worker-config.test.ts dockerfile.test.ts
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/compiler-worker lint
```

Then use a uniquely named temporary generated project to start a valid
published Expense bundle, request its declared route over loopback, stop it,
and prove its specific containers, volumes, networks, and preview directory
are gone. Do not touch existing services.

- [ ] **Step 7: Commit Task 2**

```bash
git add apps/compiler-worker infra/docker-compose.yml
git commit -m "feat: run isolated generated previews"
```

### Task 3: Expose generated preview controls in Workbench

**Files:**

- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/components/workbench.tsx`
- Modify: `apps/workbench/lib/workbench-model.ts`
- Modify: `apps/workbench/lib/workbench-model.test.ts`
- Modify: `apps/workbench/app/globals.css`

**Consumes:** Task 1 preview REST records and Task 2 Worker status lifecycle.

**Produces:** A concise Code Studio generated-preview card used by Task 4
browser evidence.

- [ ] **Step 1: Write failing client and UI-state tests**

Add client tests asserting that only a compilation ID can start/read a preview
and only a preview-run ID can stop one. Add Workbench-model tests for
`starting`, `ready`, `stopping`, `stopped`, and `failed` labels, plus a test
that preview controls are unavailable before a succeeded Compilation.

- [ ] **Step 2: Run focused Workbench tests to verify RED**

Run:

```bash
pnpm --filter @factory/workbench test -- control-plane-client.test.ts workbench-model.test.ts
```

Expected: FAIL because client preview operations and UI state do not exist.

- [ ] **Step 3: Add safe client record types and methods**

Add an exported `WorkbenchPreviewRun` containing only ID, compilation ID,
status, nullable safe URL, nullable ports, timestamps, and safe diagnostic.
Add:

```ts
startPreviewRun(compilationId: string): Promise<WorkbenchPreviewRun>
getCurrentPreviewRun(compilationId: string): Promise<WorkbenchPreviewRun | null>
stopPreviewRun(previewRunId: string): Promise<WorkbenchPreviewRun>
```

Do not accept a URL, directory, Compose project name, Graph, or any runtime
configuration from the UI.

- [ ] **Step 4: Render and poll the Generated preview card**

In Code Studio, fetch the current preview after a compilation succeeds and
poll while its status is `starting` or `stopping`. Render the card only for a
succeeded Compilation. It contains status, **Open preview** enabled only in
`ready`, **Start preview** enabled only when no preview is active, and **Stop
preview** enabled only in `ready` or `failed`. Opening uses the safe returned
loopback URL in a separate tab. Keep the artifact manifest and source
inspection behavior unchanged.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter @factory/workbench test -- control-plane-client.test.ts workbench-model.test.ts
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench lint
pnpm --filter @factory/workbench build
```

Expected: PASS with no preview controls rendered for a Draft, queued
Compilation, or failed Compilation.

- [ ] **Step 6: Commit Task 3**

```bash
git add apps/workbench
git commit -m "feat: control generated application previews"
```

### Task 4: Prove the end-to-end generated preview lifecycle

**Files:**

- Modify: `e2e/workbench.spec.ts`
- Create: `docs/acceptance/compilation-preview-run.md`
- Modify: `docs/roadmap.md`

**Consumes:** Tasks 1–3.

**Produces:** Reproducible evidence for design-to-generated-app-preview and
safe cleanup.

- [ ] **Step 1: Write the failing browser journey**

Extend the Workbench E2E after its successful Compilation assertion:

```ts
await page.getByRole("button", { name: "Start preview" }).click();
await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({
  timeout: 120_000,
});
const preview = await context.waitForEvent("page");
await page.getByRole("button", { name: "Open preview" }).click();
await expect(preview).toHaveURL(/127\.0\.0\.1/);
await expect(preview.getByRole("link", { name: "New expense" })).toBeVisible();
await page.getByRole("button", { name: "Stop preview" }).click();
await expect(page.getByText("Preview stopped", { exact: true })).toBeVisible({
  timeout: 60_000,
});
```

Use the named PreviewRun ID/project from the Control Plane test response to
assert only its containers, volumes, networks, and directory are absent.

- [ ] **Step 2: Run the E2E to verify RED**

Run the Workbench against an isolated Factory Compose project and its own
ports:

```bash
pnpm exec playwright test e2e/workbench.spec.ts --reporter=line
```

Expected: FAIL because no generated-preview controls or preview API exist.

- [ ] **Step 3: Run the isolated browser proof and cleanup check**

Bring up a dedicated Factory Compose project with dedicated Control Plane,
Workbench, PostgreSQL, and Redis ports. Execute the journey. Verify the
opened page is the generated application, visit one declared PageModel route,
complete the profile's existing role journey, stop the preview, and prove the
specific PreviewRun resources are absent. Bring down only the named Factory
test project after evidence is collected.

- [ ] **Step 4: Record acceptance evidence**

Write the generated application route, role journey, exact isolated Factory
and PreviewRun project names, port ranges, browser total, cleanup commands,
and the statement that existing services were untouched. Exclude credentials,
raw Graphs, raw prompts, raw model responses, source snapshots, and raw
subprocess commands.

- [ ] **Step 5: Run release gates**

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

Expected: PASS. If the host Node version is outside the declared range, record
the warning as environment evidence without claiming supported-host success;
the Docker runtime must remain Node 22.

- [ ] **Step 6: Commit Task 4**

```bash
git add e2e docs
git commit -m "test: prove generated compilation preview"
```

## Self-review

- Task 1 creates a persistent safe lifecycle and rejects uncompiled inputs.
- Task 2 is the only Docker execution boundary and cannot receive Graph- or
  caller-controlled commands, paths, URLs, or ports.
- Task 3 only controls recorded immutable preview state and cannot preview a
  Draft.
- Task 4 proves the generated app, not Workbench, opens and cleans up without
  affecting other local services.
