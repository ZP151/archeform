# Restaurant Ordering MVP — Task 7 final acceptance evidence

Date: 2026-07-30

## Decision

**ACCEPTED for Task 7 runtime evidence.** This record supersedes the earlier
direct-runtime, stale-stack, and intermediate preview attempts. Only the final
`factory-task7-evidence3` lifecycle below is acceptance evidence.

## Exact source and isolated Factory stack

- Factory runtime source commit:
  `5e4c6e15cb7a04160968e8446e18c3c35065bc5f`
  (`docs: record final restaurant acceptance evidence`).
- Docker Engine: `29.6.2`.
- Factory Compose project: `factory-task7-evidence3`.
- Loopback-only Factory endpoints: Workbench `http://127.0.0.1:62053` and
  Control Plane `http://127.0.0.1:62051`.
- The Redis password, internal Worker token, and Restaurant bootstrap input
  were derived and supplied only in the launch and test processes. Their raw
  values were not printed, persisted, or included in this document.

The stack was launched with this redacted command shape; all omitted values
were process-local:

```sh
FACTORY_REDIS_PASSWORD=<redacted> \
FACTORY_INTERNAL_WORKER_TOKEN=<redacted> \
RESTAURANT_DEMO_TABLE_TOKEN=<redacted> \
FACTORY_CONTROL_PLANE_PORT=62051 \
FACTORY_WORKBENCH_PORT=62053 \
FACTORY_POSTGRES_PORT=62054 \
docker compose --file infra/docker-compose.yml \
  --project-name factory-task7-evidence3 up --build --quiet-build --detach
```

## Immutable lifecycle evidence

The bounded Workbench test created a Restaurant Draft, saved it, published an
immutable revision, compiled it, started the generated preview, completed the
Customer and Merchant journeys, and stopped the same preview.

| Evidence                                     | Final value                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Published revision                           | `cms7a6zr8004hlf4t9dpt2s27`                                                                    |
| Published Graph digest                       | `sha256:4e8c6b0462d5c1c924165357c3f60adfabd5d809cb146b7a95489eb22f95b906`                      |
| Compilation                                  | `cms7a6zxt004jlf4tpp2uxzy6` (`succeeded`, 65 artifacts)                                        |
| Generated root directory                     | `home-restaurant-1785401899611-e17998e9-bb87-4d8c-9d38-66cb33de4e28-cms7a6zr8004hlf4t9dpt2s27` |
| Registered generated Compose artifact digest | `sha256:1b770f5cbdd1c3eb480d134f9adf3a0ccfbff889910ca29d3a3281021ae39386`                      |
| Preview run                                  | `preview-89ce3656-a709-41d5-bbb1-21598aeed4e4` (`stopped`)                                     |
| Generated Compose project                    | `factory-preview-preview-89ce3656-a709-41d5-bbb1-21598aeed4e4`                                 |
| Generated loopback ports                     | Web `32791`; API `32790`                                                                       |
| Generated Web image ID                       | `sha256:6b6ad6d25ded4aebcf95cd145f644c0e1111e4dc16c2ecb1ecd65ce22e9d892d`                      |
| Generated API image ID                       | `sha256:9a258844c21d70fc035d149e433b255293bf5ac5e02d29b3f9c1658b6390f268`                      |
| Generated migration image ID                 | `sha256:8ff603e21f75d2227e997aa73a708279e83cccaf20a072d2cd445973da20ca3b`                      |

## Executable acceptance

```sh
FACTORY_E2E_BASE_URL=http://127.0.0.1:62053 \
FACTORY_E2E_CONTROL_PLANE_URL=http://127.0.0.1:62051 \
FACTORY_E2E_FACTORY_PROJECT=factory-task7-evidence3 \
RESTAURANT_DEMO_TABLE_TOKEN=<redacted> \
pnpm exec playwright test e2e/workbench.spec.ts \
  --grep 'Home creates, publishes, compiles, previews, and operates a Restaurant application' \
  --reporter=dot
```

Result: one isolated lifecycle completed from Workbench through stopped preview.
The test verifies the Customer table session, menu search, cart line and order
notes, simulated payment, order history, and receipt. It then verifies Merchant
menu availability and stock adjustment, cashier capture and browser receipt,
kitchen transitions, serving, reporting, cancellation, inventory release, and
audit evidence. The test's postconditions are the immutable published/compiled
records above and the stopped preview below.

The E2E harness also asserts that a generated preview exposes a generated
application rather than the Workbench Page Studio, and that the Worker has
removed the preview runtime directory after stop.

## Scoped cleanup

The generated project was checked by its exact Compose label after the preview
stop: zero containers, networks, and volumes. The Worker check confirmed that
`/artifacts/.preview-runs/preview-89ce3656-a709-41d5-bbb1-21598aeed4e4`
was absent.

The exact Factory project was then removed with the redacted, project-scoped
command below. It does not target any user-owned Compose project:

```sh
FACTORY_REDIS_PASSWORD=<redacted> \
FACTORY_INTERNAL_WORKER_TOKEN=<redacted> \
RESTAURANT_DEMO_TABLE_TOKEN=<redacted> \
docker compose --file infra/docker-compose.yml \
  --project-name factory-task7-evidence3 down --volumes --remove-orphans
```

The final label-scoped postcondition is zero containers, networks, and volumes
for `factory-task7-evidence3`.

## Residual risk

This acceptance proves local Node 22 generated runtime behavior and scoped
cleanup. It does not validate cloud deployment, real payment providers, or
external identity providers.

## Parameterized shared-commerce follow-up

Task 5 of Parameterized Capability Composition re-ran Restaurant Ordering from
an immutable generic nine-package composition alongside Simple Ecommerce. The
Restaurant bundle produced 58 artifacts, ran API and Web on Node v22.23.1 over
loopback-only ports, returned healthy API/Web responses, passed its generated
role journey 1/1, reached an explicit stopped state, and removed only the exact
run-owned four containers, one network, and one anonymous PostgreSQL volume.
The same rerun proved that `tableCode` owns the RestaurantTable relation through
its unique `code`; no unrelated `restaurantTableId` column was generated.

The shared package identities, redacted immutable input evidence, deterministic
commands, separate Ecommerce lifecycle, and remaining review gates are recorded
in
[`parameterized-capability-composition.md`](parameterized-capability-composition.md).
