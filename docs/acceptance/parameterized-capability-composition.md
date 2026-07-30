# Parameterized Capability Composition — Task 5 release-gate evidence

Date: 2026-07-30

## Decision boundary

Task 5 implementation evidence is ready for independent task review and QA.
This record does not mark the project ledger `accepted`; review, QA, release
review, and fresh root verification remain separate gates.

The proof uses two immutable Published inputs produced from the generic
composition path. Restaurant Ordering and Simple Ecommerce lock the same nine
shared package identities while retaining different canonical Graph-symbol
bindings and generated application output.

## Migrated dispatch retirement

The compiler no longer selects shared core/commerce runtime behavior from a
package-key allowlist or a package-version switch. Generic runtime handler use
is derived from the canonical composition lock's resolved contribution list.
The existing Restaurant-only runtime branch remains for behavior that has not
yet migrated into parameterized packages.

The release run also exposed incorrect handling of Graph-declared relation
scalars in the generic Prisma schema and initial migration. Focused regression
coverage now proves both artifacts reuse `relation.field`, resolve
`tableCode` to the target's unique `code`, resolve `categoryKey` to the target
ID, omit unrelated synthetic columns, and fail closed when no unique target
can be determined.

## Immutable inputs

| Evidence                | Restaurant Ordering              | Simple Ecommerce                |
| ----------------------- | -------------------------------- | ------------------------------- |
| Published revision      | `<redacted-restaurant-revision>` | `<redacted-ecommerce-revision>` |
| Published Graph digest  | `sha256:<redacted>`              | `sha256:<redacted>`             |
| Composition-lock digest | `sha256:<redacted>`              | `sha256:<redacted>`             |
| Generated artifacts     | 58                               | 58                              |
| Generated runtime       | Node v22.23.1                    | Node v22.23.1                   |
| Generated role journey  | 1/1 passed                       | 1/1 passed                      |
| Final preview state     | stopped                          | stopped                         |

Both locks contain these exact shared identities:

- `commerce.cart@1.0.0`
- `commerce.catalog@1.0.0`
- `commerce.inventory@1.0.1`
- `commerce.order@1.0.0`
- `commerce.simulated-payment@1.0.1`
- `core.audit@1.0.1`
- `core.crud@1.0.1`
- `core.notification@1.0.1`
- `core.workflow@1.0.1`

## Deterministic verification

```sh
pnpm --filter @factory/compiler test -- --run \
  test/composition-compilation.test.ts test/compilation-plan.test.ts
```

Result: 54/54 passed. This includes same-identity/different-binding output,
the migrated-dispatch negative, and deterministic Prisma/schema migration
coverage.

```sh
pnpm --filter @factory/compiler-worker test -- --run \
  test/compilation-executor.test.ts
```

Result: 3/3 passed, including fail-closed persisted composition-lock digest
verification.

The host test runner was Node 24.18.0 and emitted the expected engine warning.
It is development evidence only; the generated applications below ran inside
Node 22 containers.

## Isolated Node 22 lifecycles

The projects were unique and absent before launch:

| Profile             | Exact Compose project                 | Web port                   | API port                   |
| ------------------- | ------------------------------------- | -------------------------- | -------------------------- |
| Restaurant Ordering | `factory-task5-restaurant-20260730-b` | `<redacted-loopback-port>` | `<redacted-loopback-port>` |
| Simple Ecommerce    | `factory-task5-ecommerce-20260730-b`  | `<redacted-loopback-port>` | `<redacted-loopback-port>` |

Each generated Compose file bound Web and API only to `127.0.0.1`. For each
profile, the database migration and seed completed, API health returned `ok`,
Web returned HTTP 200, and both API and Web reported Node v22.23.1. The
generated `api/test` directory was copied into the exact label-validated API
container because the production API Dockerfile intentionally excludes test
source. The following journey command then passed 1/1:

```sh
docker compose --file docker-compose.yml --project-name <exact-project> \
  exec -T api pnpm test
```

No OpenAI call, model credential, external provider credential, raw prompt, or
raw model response was used or persisted.

## Stopped state and scoped cleanup

Before cleanup, each exact project had four exited containers, one project
network, and one anonymous PostgreSQL volume resolved from the exact labeled
PostgreSQL container. Every container and network matched the intended
`com.docker.compose.project` label. Cleanup used only:

```sh
docker compose --file docker-compose.yml --project-name <exact-project> \
  down --volumes --remove-orphans
```

Postconditions for both exact projects were zero labeled containers, zero
labeled networks, zero labeled volumes, and absence of each previously resolved
anonymous volume. No user-owned or foreign Docker project was stopped or
removed.

Before recursive cleanup, resolved-path containment checks proved that the two
runtime directories were the only direct children of one Task 5-owned system
temporary root. Cleanup removed only those exact directories and their empty
parent, then confirmed the parent was absent. No foreign Docker resource or
runtime path was touched.

## Residual scope

This evidence proves local immutable shared-package composition, generated
Node 22 runtime behavior, stopped state, and exact Docker cleanup. It does not
remove unmigrated Restaurant runtime modules, add Restaurant-only behavior,
validate cloud deployment, enable real payment, or introduce external identity
or AI providers.
