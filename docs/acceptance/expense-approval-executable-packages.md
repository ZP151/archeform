# Expense Approval executable package acceptance

## Scope

This acceptance record verifies deterministic, independently generated Expense
Approval API output. It uses only a published Graph composed from Factory
Golden assets; no AI model, credential, raw prompt, or raw model response was
used or retained.

## RED / GREEN record

The Task 4 generated-source assertion was added after Tasks 1–3 had already
landed the capability handlers, so it was immediately green. The independent
generated API gate then found two real predecessor defects: generated module
identity fields were absent from the runtime contract, and notification
journeys omitted the package-local delivery event. They were fixed before this
acceptance was recorded by `7c9d563` and `776420f`, respectively. The final
focused Compiler assertion, default Expense API journey, and
notification-enabled Expense API journey are green.

## Generated application evidence

Two fresh immutable Expense revisions were written only beneath
`%LOCALAPPDATA%\Temp` and removed during cleanup:

- the default Expense profile proves submit and approve transitions plus audit
  handling;
- a second published Expense Graph adds the selected optional
  `notification.send` effect to submit, proving both package-local delivery
  evidence and Compiler-owned generic capability evidence.

For each revision the following commands succeeded:

```text
pnpm install
pnpm --filter generated-api exec prisma generate --schema prisma/schema.prisma
pnpm --filter generated-api build
pnpm --filter generated-api test
```

Both generated API suites reported one passing journey test. The default
journey covers create, submit, approve, and two declared `audit.record`
effects. The notification-enabled journey additionally verifies the two
expected `notification.send` evidence records.

The default revision's `capability-template-lock.json` contains
`factory.capability-template-lock/v1` and exactly these generated API modules:

| Locked Golden package | Version | Generated target                            |
| --------------------- | ------- | ------------------------------------------- |
| `core.crud`           | `1.0.0` | `api/src/capabilities/core.crud.ts`         |
| `core.workflow`       | `1.0.0` | `api/src/capabilities/core.workflow.ts`     |
| `core.audit`          | `1.0.0` | `api/src/capabilities/core.audit.ts`        |
| `core.notification`   | `1.0.0` | `api/src/capabilities/core.notification.ts` |

## Isolated Workbench evidence

An isolated Docker Compose project named
`factory-pilot-executable-expense-e2e` ran on these exact ports:

| Service       | Port    |
| ------------- | ------- |
| PostgreSQL    | `15434` |
| Redis         | `16381` |
| Control Plane | `15302` |
| Workbench     | `15179` |

`OPENAI_API_KEY` was blank. The isolated browser command completed with three
passing tests:

```text
FACTORY_E2E_BASE_URL=http://127.0.0.1:15179 \
  pnpm exec playwright test e2e/workbench.spec.ts --reporter=line

3 passed
```

The browser proof creates and publishes an Expense Draft, waits for
`Compile succeeded`, opens `capability-template-lock.json`, and displays
`factory.capability-template-lock/v1` from the immutable compilation artifact.

## Repository gates

All final gates completed successfully on 2026-07-29:

```text
pnpm --filter @factory/capabilities test      # 25 passed
pnpm --filter @factory/compiler test          # 28 passed
pnpm test                                     # 11 Turbo tasks successful
pnpm typecheck                                # 11 Turbo tasks successful
pnpm build                                    # 7 Turbo tasks successful
pnpm verify:third-party                       # 5 notices verified
pnpm verify:source-studies                    # 2 source studies verified
pnpm exec playwright test e2e/workbench.spec.ts --reporter=line  # 3 passed
git diff --check
```

## Cleanup

After verification, only the named Compose project is removed with its
containers, volumes, and network. Only Task 4 temporary output directories
beginning `factory-pilot-executable-expense-` beneath
`%LOCALAPPDATA%\Temp` are removed; no user services or unrelated temporary
data are affected.
