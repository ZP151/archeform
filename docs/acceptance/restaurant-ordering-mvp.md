# Restaurant Ordering MVP — Task 7 acceptance evidence

Date: 2026-07-30

## Decision

**NOT ACCEPTED.** The generated Node 22 Compose stack starts and its Merchant
journey passes, but the required Customer journey cannot pay after adding a
line. Release acceptance remains blocked until the generated Customer renderer
is corrected and this evidence is rerun.

## Environment and deterministic compilation

- Docker Engine `29.0.1`, Docker Compose `v2.40.3-desktop.1`, Linux daemon.
- Host Node was `v24.18.0`; it was used only for orchestration. Generated API,
  migration, and Web images are based on `node:22-alpine`.
- A Restaurant `PublishedGraphInput` compiled through the worker executor to
  65 artifacts with graph digest
  `sha256:cab4c371818a32a2bea08819e12f80b0bed2583953a5b86887f4eb99b5ee6e24`.
- `docker compose config --quiet` rejected an absent process-only bootstrap
  input and succeeded when it was supplied only to the current process. No
  bootstrap token value was logged or persisted.

## Node 22 Docker evidence

Using unique projects with `FACTORY_WEB_PORT=0` and `FACTORY_API_PORT=0`:

- `factory-restaurant-task7-3674e371` and
  `factory-restaurant-task7-2cfc178f` proved the sequence Postgres healthy →
  migration exit `0` → API healthy → Web healthy, with loopback-only dynamic
  ports.
- Image IDs from the final isolated build were API
  `sha256:5d9f22aa809ebaa8a62bd64d6d50950042d3ed5fd3f41ac83f6b68762c2efb80`,
  Web `sha256:25d95d0ceef11bc45d24f5c23ba89b0087bd6850adb366744d12f73ef0e64ac2`,
  and migration
  `sha256:88cf0e76199543dc97f849472f719f95f91afe42485d819ed78cd432f8e5ab07`.
- The Merchant browser journey passed against the generated Web application:
  availability and stock adjustment, simulated payment, receipt, kitchen
  transition, serve, reporting, cancellation/audit evidence, and table
  lifecycle.
- Each run used `docker compose down --volumes --remove-orphans`. Checks after
  teardown found no containers, networks, or volumes labelled with the named
  run projects. The QA-created `.task7-artifacts` runtime directory was then
  removed.

## Blocking findings

1. **P1 — Customer cart state is not committed after an accepted line add.**
   In a live Node 22 generated stack, the line-add response was successful,
   then `/cart` displayed a disabled `Pay simulated payment` button. The
   generated `cartLine` parser accepts `unitPrice` only when it is a JavaScript
   number, while the Prisma-backed line response uses a decimal representation
   outside that check. The async handler reports the parsing error and does not
   commit the line to session state. This is in the compiler Customer renderer,
   outside Task 7 ownership.
2. **P1 — Full compiler-worker lint is not clean.**
   `pnpm --filter @factory/compiler-worker lint` fails only on the pre-existing,
   out-of-scope `apps/compiler-worker/src/artifact-writer.ts` formatting.

## Task 7 regression and gate evidence

- `pnpm --filter @factory/compiler-worker test` — PASS, 68/68.
- `pnpm --filter @factory/compiler-worker typecheck` — PASS.
- `pnpm --filter @factory/compiler-worker lint` — FAIL only on the out-of-scope
  `src/artifact-writer.ts` formatting finding.
- `git diff --check` — PASS at the latest QA verification.

The new preview-runner tests prove that a Restaurant preview without the
required process-only bootstrap input fails before Docker is invoked, and that
the Docker child environment contains only the derived project name, dynamic
loopback ports, and that required input. Generic previews retain their existing
narrow environment. The value is neither logged nor written to the generated
runtime directory.

## Coverage gap

The full Workbench-driven Published revision → Control Plane queue → worker
preview browser journey remains unaccepted because the Customer runtime blocker
prevents the required end-to-end path. It must be repeated after the renderer
fix, including the run-scoped worker start/stop callback path.
