# Restaurant Ordering MVP — Task 7 final acceptance evidence

Date: 2026-07-30

## Decision

**ACCEPTED.** This document supersedes all earlier direct-runtime, stale-stack,
and failed-retry notes. It records one fresh, current-source Workbench
lifecycle and its project-scoped cleanup.

## Isolated Factory run

- Docker Engine: `29.6.2`.
- Factory Compose project: `factory-task7-evidence`.
- Loopback-only endpoints: Workbench `http://127.0.0.1:62040`; Control Plane
  `http://127.0.0.1:62039`.
- Redis, internal-worker, and Restaurant bootstrap inputs were generated or
  supplied only in the launch process. Their values are neither recorded nor
  persisted here.
- Factory image digests: Control Plane
  `sha256:54a6624dba8d803799db7a5de3753922e6455dfd396fff787805c89786974ceb`;
  compiler worker
  `sha256:764e908ef1eb4cace6e035beead6523290f5cea5574199c520293711f83e67a2`;
  Workbench
  `sha256:6abcd2c2200eb9d9739a9fe6efe36dd98238c434559470860f4b0f317e2cfcb9`.

## Published-graph and preview evidence

The bounded browser test created the Restaurant app in Workbench, saved its
Draft, published its immutable revision, compiled it, started a preview, and
completed the generated Customer and Merchant journey.

- Compilation ID: `cms79h3f0000dp74tp7e012sj`.
- Compilation status: `succeeded`; 65 artifacts; completed
  `2026-07-30T08:38:13.055Z`.
- Generated root directory:
  `home-restaurant-1785400687994-baf3b5c6-60f4-4584-a39b-7e19642a9a94-cms79h386000bp74t6rvtciix`.
- Generated Compose artifact digest:
  `sha256:73d3d73e7fa91365fa193668a0d89c626685a5b584025429dbc4c63469a86e80`.
- Preview run: `preview-b967199d-8333-470f-9462-9576579e0cb6`; terminal
  status: `stopped`.

Command and result:

```powershell
$env:FACTORY_E2E_BASE_URL = 'http://127.0.0.1:62040'
$env:FACTORY_E2E_FACTORY_PROJECT = 'factory-task7-evidence'
# Restaurant bootstrap input is process-local and intentionally omitted.
pnpm exec playwright test e2e/workbench.spec.ts --grep 'Home creates, publishes, compiles, previews, and operates a Restaurant application'
```

Result: **1 passed (1.5m)**. It verifies Customer table session, menu/cart,
payment and receipt; Merchant availability/stock, cashier, kitchen, serving,
reporting, cancellation and audit evidence; then Workbench Preview Stop.

## Cleanup

The test asserts removal of its exact preview run's runtime directory and
Compose containers, network, and volumes. Afterwards, only the exact Factory
project was stopped with:

```powershell
docker compose --file infra/docker-compose.yml --project-name factory-task7-evidence down --volumes --remove-orphans
```

Label-scoped postconditions were zero containers, networks, and volumes for
`factory-task7-evidence`. No unrelated Docker resource was touched.

## Supporting regression evidence

`pnpm --filter @factory/compiler-worker test -- --run test/preview-runner.test.ts`
passed **30/30**. This includes the transient generated-Web readiness retry
without weakening cancellation, timeout, or missing-bootstrap fail-closed
behavior.
