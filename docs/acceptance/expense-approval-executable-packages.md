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

Two earlier fresh immutable Expense revisions were written only beneath
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

The current default Expense composition has a
`capability-template-lock.json` containing
`factory.capability-template-lock/v1` and exactly these generated API modules:

| Locked Golden package | Version | Template digest                                                           | Generated target                            |
| --------------------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `core.crud`           | `1.0.1` | `sha256:5e1bcc06560ccdd1062c786618a883de6df9234d2134c89361b3adaab0700955` | `api/src/capabilities/core.crud.ts`         |
| `core.workflow`       | `1.0.1` | `sha256:209d5d649840437f334ac53aa593634c9cdb8fbfe5cc7525ed96f80ac91947bb` | `api/src/capabilities/core.workflow.ts`     |
| `core.audit`          | `1.0.1` | `sha256:9bb2507b6d1e72605a9782257a6dd3e2cee130273391b331534005bb78c3a71f` | `api/src/capabilities/core.audit.ts`        |
| `core.notification`   | `1.0.1` | `sha256:b9a745255d242339486fff29d6f7abd3f751e36df3e348f896956a31c6b53266` | `api/src/capabilities/core.notification.ts` |

The current refresh materialises a fresh default Expense workspace and runs
the same install, Prisma generation, build, and generated API journey gates.
The immutable-lock browser assertion verifies the table's full entries by
exact equality; it does not infer versions from the generated source files.

Task 2 separately recorded fresh generated API proof for Restaurant Ordering
and Simple Ecommerce after `a112482` and `87e40cb`: each profile completed
`pnpm install`, Prisma generation, build, and its generated API journey test
(`1/1`). This Task 4 refresh cites that cross-profile evidence and does not
claim to have rerun those two workspaces.

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

The compile journey creates a guided Expense Approval Draft, edits Page, Flow,
and Domain state, saves, publishes, and compiles it. It then waits for
`Compile succeeded`, opens `capability-template-lock.json`, parses the
immutable artifact, and requires exactly the four package identities, versions,
template digests, and generated targets recorded above. The separate guided
creation journey verifies Draft creation without publishing it.

## Repository gates

All final gates completed successfully on 2026-07-29:

```text
pnpm --filter @factory/capabilities test      # 26 passed
pnpm --filter @factory/compiler test          # 35 passed
pnpm test                                     # 11 Turbo tasks successful
pnpm typecheck                                # 11 Turbo tasks successful
pnpm build                                    # 7 Turbo tasks successful
pnpm verify:third-party                       # 5 notices verified
pnpm verify:source-studies                    # 2 source studies verified
pnpm exec playwright test e2e/workbench.spec.ts --reporter=line  # 3 passed
git diff --check
```

## Cleanup

The following exact teardown command removed only the named project:

```text
docker compose -p factory-pilot-executable-expense-e2e \
  -f infra/docker-compose.yml down -v
```

It removed that project's five containers, two named volumes, and one network;
a follow-up `docker compose -p factory-pilot-executable-expense-e2e -f
infra/docker-compose.yml ps --format json` returned no rows.

The current refresh created only the following two task-specific temporary
directories. This scoped PowerShell cleanup removed both after their evidence
was recorded:

```powershell
$task4RefreshDirectories = @(
  Join-Path $env:LOCALAPPDATA 'Temp\factory-pilot-executable-expense-20260729-refresh'
  Join-Path $env:LOCALAPPDATA 'Temp\factory-pilot-executable-expense-20260729-refresh-api'
)
foreach ($directory in $task4RefreshDirectories) {
  $resolved = (Resolve-Path -LiteralPath $directory).Path
  if ($resolved -notmatch '^[A-Za-z]:\\Users\\15492\\AppData\\Local\\Temp\\factory-pilot-executable-expense-[^\\]+$') { throw 'Unexpected temporary target' }
  Remove-Item -LiteralPath $resolved -Recurse -Force
  Test-Path -LiteralPath $resolved
}
```

Both `Test-Path` results were `False`. No user services or unrelated temporary
data were modified.
