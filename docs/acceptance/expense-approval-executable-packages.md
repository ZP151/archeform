# Expense Approval executable package acceptance

## Scope and revision

This record refreshes the Expense Approval acceptance evidence after compiler
compatibility commit `4e0ef5c`. It validates only published, immutable Graph
input and Factory Golden assets. No AI model, credential, raw prompt, or raw
model response was used or retained.

## Current 1.0.1 Expense materialization

On 2026-07-29, the production compiler and compiler worker materialized a new
Expense Approval Graph composed with the `expense-approval` profile. The
result contained `50` artifacts. The generated API completed all of these
commands successfully:

```text
pnpm install
pnpm --filter generated-api exec prisma generate --schema prisma/schema.prisma
pnpm --filter generated-api build
pnpm --filter generated-api test
```

The generated API journey reported `1 passed`. It exercises the generated
Expense API rather than a source-level mock.

The materialized Graph used the current exact Golden manifest locks:

| Package | Version | Manifest digest |
| --- | --- | --- |
| `core.crud` | `1.0.1` | `sha256:3bdeb98b04633b531d4f43a82caff8027b247b54bbb2b43a00874d52bb79e714` |
| `core.workflow` | `1.0.1` | `sha256:04ecbfceff872ed4c4f73467568bce657ad326faaa0546b09c1bbe1f7860cb44` |
| `core.audit` | `1.0.1` | `sha256:54da93b37e3a2140d4de14b7acd0579d60b35d6f8a7cb258c1c0f8aef6c27694` |
| `core.notification` | `1.0.1` | `sha256:9ff11a37cbc2255d0efe5586ffc1a25bbd879dcef3af76e6854f15f83a30a489` |

Its immutable `capability-template-lock.json` has schema
`factory.capability-template-lock/v1` and exactly these API module entries:

| Locked Golden package | Version | Template digest | Generated target |
| --- | --- | --- | --- |
| `core.crud` | `1.0.1` | `sha256:5e1bcc06560ccdd1062c786618a883de6df9234d2134c89361b3adaab0700955` | `api/src/capabilities/core.crud.ts` |
| `core.workflow` | `1.0.1` | `sha256:209d5d649840437f334ac53aa593634c9cdb8fbfe5cc7525ed96f80ac91947bb` | `api/src/capabilities/core.workflow.ts` |
| `core.audit` | `1.0.1` | `sha256:9bb2507b6d1e72605a9782257a6dd3e2cee130273391b331534005bb78c3a71f` | `api/src/capabilities/core.audit.ts` |
| `core.notification` | `1.0.1` | `sha256:b9a745255d242339486fff29d6f7abd3f751e36df3e348f896956a31c6b53266` | `api/src/capabilities/core.notification.ts` |

The generated `1.0.1` API is in `package-handlers-v1` mode: it imports and
dispatches to package-local record, workflow, and effect handlers. The exact
lock equality assertion in `e2e/workbench.spec.ts` verifies the same four
template entries in the published compilation artifact.

## Compatibility boundary

`4e0ef5c` deliberately preserves a different historical runtime family. A
uniform historical handler-backed `1.0.0` lock set compiles in
`metadata-v1`: the compiler owns its direct persistence, workflow, audit, and
inventory behavior. That path is not a current Expense materialization and
does not change the current `1.0.1` package templates or digests above.

Compiler regressions cover the boundary: mixed handler-backed `1.0.0` and
`1.0.1` locks are rejected before output, while unchanged metadata-only
`catalog`, `cart`, and `order` `1.0.0` assets may coexist with current
`1.0.1` handler packages. The current compiler suite total is `39 passed`.

## Isolated Workbench E2E

A fresh named Docker Compose project,
`factory-pilot-executable-expense-e2e`, used only these dedicated ports:

| Service | Port |
| --- | --- |
| PostgreSQL | `15434` |
| Redis | `16381` |
| Control Plane | `15302` |
| Workbench | `15179` |

The final readiness protocol required both `http://127.0.0.1:15179` and
`http://127.0.0.1:15302/health` to return `200` before executing:

```text
FACTORY_E2E_BASE_URL=http://127.0.0.1:15179 \
  pnpm exec playwright test e2e/workbench.spec.ts --reporter=line

3 passed
```

The three passing journeys create a guided Draft, create an audit-free Expense
Draft from the capability picker, and edit, save, publish, and compile an
Expense Draft. The compile journey waits for `Compile succeeded`, retrieves
`capability-template-lock.json`, and requires exact equality with the current
`1.0.1` template locks above.

During first-stack diagnosis, Workbench became reachable before Control Plane
readiness; that intentionally premature run left the creation drawer open and
timed out waiting for draft persistence. Once Control Plane health was `200`,
the two previously affected journeys passed unchanged, followed by the final
`3 passed` run. This is an acceptance sequencing observation; no product or
contract source was modified.

## Repository gates

All final gates completed successfully on 2026-07-29:

```text
pnpm test                                     # 11 Turbo tasks successful; compiler 39 passed
pnpm typecheck                                # 11 Turbo tasks successful
pnpm build                                    # 7 Turbo tasks successful
pnpm verify:third-party                       # 5 direct ecosystem notices verified
pnpm verify:source-studies                    # 2 immutable reference-only source studies verified
git diff --check                              # passed
```

## Cleanup

The named E2E project was removed with:

```text
docker compose -p factory-pilot-executable-expense-e2e \
  -f infra/docker-compose.yml down -v
```

Follow-up project inspection returned no rows and all four dedicated ports
were released. The one scoped temporary directory used for current generated
API materialization was validated beneath the system temporary directory and
removed after its evidence was recorded. No user services, unrelated ports,
or unrelated temporary data were modified.
