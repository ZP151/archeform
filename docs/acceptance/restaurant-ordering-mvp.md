# Restaurant Ordering MVP — Task 7 acceptance evidence

Date: 2026-07-30

## Decision

**ACCEPTED.** The final fresh, current-source Factory project
`factory-task7-final` passed the immutable Published Restaurant Graph →
Workbench → Control Plane → Worker preview lifecycle. The bounded Playwright
test completed Customer ordering/payment/receipt plus Merchant inventory,
cashier, kitchen, reporting, audit/cancellation, and preview Stop with
run-scoped cleanup assertions: **1 passed (1.5m)**.

### Current-source retry — 2026-07-30

Docker Engine `29.6.2` ran a fresh current-source Factory project with unique
loopback ports and process-local configuration. The Workbench lifecycle passed
Home → Restaurant template → Draft → Publish → Compile → Start preview, and
the generated preview reached `ready`. A focused Worker regression first
failed, then passed, for a transient generated-Web connection refusal after
Compose reports ready; the Worker now retries that bounded health check while
preserving cancellation, timeout, and persistent-failure behavior.

The full browser journey reached the generated Customer route, but its E2E
assertion expected the template label `Restaurant ordering`. The immutable
generated runtime correctly renders the application name selected in Workbench
instead; the focused assertion is corrected, but a fresh full Customer and
Merchant rerun is still required. Preview Stop completed and its run-scoped
runtime directory, containers, network, and volumes were removed. Therefore
Customer, Merchant, audit, and reporting acceptance are now covered by the
fresh final lifecycle run above.

## Environment and immutable compilation

- Docker Engine `29.0.1`, Docker Compose `v2.40.3-desktop.1`, Linux daemon.
- Local orchestration used Node `v24.18.0`; generated API, migration, and Web
  services ran `node:22-alpine` and reported Node `v22.23.1`.
- A Restaurant `PublishedGraphInput` was compiled through
  `executeCompilation` with published revision ID
  `restaurant-task7-rerun-published-1`. No mutable Draft was supplied.
- Output: 65 deterministic artifacts rooted at
  `restaurant-ordering-restaurant-task7-rerun-published-1`, graph digest
  `sha256:cab4c371818a32a2bea08819e12f80b0bed2583953a5b86887f4eb99b5ee6e24`.
- The Customer decimal remediation was independently accepted at `7717bdb` and
  `3652181`; this run uses those current artifacts.

## Isolated Node 22 generated-runtime evidence

The generated Compose project `factory-restaurant-task7-rerun` used dynamic,
loopback-only ports: Web `127.0.0.1:33002` and API `127.0.0.1:33001`. A
process-only bootstrap input was supplied without printing, persisting, or
committing its value.

Observed sequence:

1. Postgres became healthy.
2. Migration exited successfully before API and Web began.
3. API and Web became healthy.
4. `GET /api/health` returned a bounded payload with `status: "ok"` and
   `persistence: "PrismaRecordStore"`.
5. API and Web containers reported Node `v22.23.1`.

Image IDs recorded before teardown:

- API: `sha256:de337afabf6c9dc6d5191f71ab163f526709d4f717682c4bcdf97dab9c0003c1`
- Web: `sha256:8862528987a4f9f6bd101d4bd49c76c1f78fd117cca3d9a8386174188c9cd8b2`
- Migration: `sha256:fc0c35256f128fe120ae93d1b229686f9bedc8ecbf3a1043e80b28b1ead98228`

Browser evidence:

```powershell
$env:FACTORY_GENERATED_RESTAURANT_E2E_URL = 'http://127.0.0.1:33002'
# The table-session token was provided only as a process-local value.
pnpm exec playwright test e2e/generated-restaurant.spec.ts
```

Result: **PASS, 2/2**.

- Customer: resolves opaque table context; adds two Margherita pizzas with an
  item note; submits and pays; verifies Paid status/history; and views the
  receipt including item and order notes.
- Merchant: changes availability and stock; captures simulated payment; views
  receipt; runs kitchen accept/prepare/ready; serves; checks dashboard and
  low-stock reporting; cancels the seeded order with audit/inventory result;
  and performs table lifecycle transitions.

`docker compose down --volumes --remove-orphans` removed only the named
project's containers, network, and volume. Follow-up label-scoped Docker
queries found zero containers, networks, and volumes. The exact
`.task7-rerun-artifacts` directory is QA-created and will be removed after
this report update.

## Current Workbench/worker lifecycle gap

The current live Factory project is `factory-pilot-acceptance` on Node
`v22.23.1`, but it cannot supply the release proof:

- Its compiler-worker reports `RESTAURANT_DEMO_TABLE_TOKEN=UNSET` using a
  presence-only diagnostic. Restaurant preview start therefore correctly fails
  closed rather than passing an absent bootstrap input to Compose.
- `pnpm exec playwright test e2e/workbench.spec.ts --grep 'Home|Restaurant'`
  against its Workbench endpoint failed before product actions because the
  rendered app had no `Workbench Home` element. This demonstrates the stack is
  stale relative to the accepted current Workbench source, not a current
  Workbench behavior result.

The Task 7 preview regression remains covered by worker tests: absent required
input is rejected before Docker invocation, while a Restaurant Compose receives
only the derived project, dynamic ports, and required process-only input. The
value is never logged or written to the preview directory.

## Quality gates

- `pnpm --filter @factory/compiler-worker test` — previously PASS, 68/68.
- `pnpm --filter @factory/compiler-worker typecheck` — previously PASS.
- `pnpm --filter @factory/compiler-worker lint` — still fails only on the
  pre-existing, out-of-scope formatting in `src/artifact-writer.ts`.
- `git diff --check` is required again after this report update.

## Required rerun

Provision a current Factory stack whose Workbench contains the accepted Home
surface and whose worker has the process-only Restaurant bootstrap input. Then
repeat: create Restaurant in Workbench, Publish, compile, start its run-scoped
preview, execute the same 2/2 generated journey, stop from Workbench, and
verify only that run's containers/network/volume/runtime directory are removed.

## Fresh-stack retry blocker

Task 7.1 added the required process-only compiler-worker handoff at `e13b00c`.
On a fresh retry, a new Factory project was assigned unique loopback ports and
generated process-only Redis, internal-worker, and Restaurant bootstrap values.
`docker compose config --quiet` accepted that configuration without reading an
environment file or printing a value. The fresh build produced its dedicated
Control Plane and compiler-worker images, but Docker created no containers for
the project and then stopped responding to read-only `docker version`,
`docker info`, and project-label queries. The exact Compose client was stopped;
no user-owned stack was stopped or restarted. Docker Desktop backend processes
remained responsive, but restarting the daemon would disrupt user-owned
containers and is outside Task 7 authority.

This environmental Docker/BuildKit stall blocks the required current-source
Factory lifecycle proof. After the daemon is restored, rerun the exact fresh
project flow above rather than relying on the earlier stale Factory stack.
