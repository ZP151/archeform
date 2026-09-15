# Team Task Runtime Test Report

## Scope

This report covers the provider-free Task runtime acceptance lane authored in:

- `e2e/consumer-task-fixture.ts`
- `e2e/consumer-task.spec.ts`
- `e2e/task-presentation.ts`

The fixture invokes the public `OpenAIRequirementInterpreterAdapter` with a
local deterministic transport that selects `team-task-tracking`. It never
makes a provider request and does not log or persist a prompt or provider
response.

## Covered acceptance

The single E2E lane drives the real Workbench automatic Publish, compile,
verify, and Preview path. It records the immutable compilation fingerprint and
requires the exact Preview resource cleanup by compose-project label.

It exercises two meaningful tasks with different titles, assignees, due dates,
and priorities. It verifies create, start, complete, completed filtering,
reopen with retained success feedback, second completion, reload persistence,
search, status filtering, no-match, one-action clear, a recoverable list
failure, stale-role callback rejection, and Viewer reads.

The lane applies ADR-0063's exact protected command contract: a valid key
header, exact Create `{ values }` and event `{ expectedVersion }` bodies,
stored `201`/`200` record envelopes, `403 task.denied`, `400
task.invalid_request`, `409 task.idempotency_conflict`, and `409
task.version_conflict` envelopes. It proves lost-response Create recovery after
an API restart, lost-response Start recovery, retained same-key retries,
pending duplicate activation suppression, same-key/different-body conflict,
and competing event writers that yield one success and one version conflict.
Before exact Preview cleanup, the lane queries only its generated API container
through Prisma and returns sanitized receipt/audit cardinalities and booleans.
It requires five audit events and five receipts for the full first-task
lifecycle, two of each for the replay/race task, and one of each for the
lost-Create retry task. Every stored receipt key must match the persisted
`sha256:` digest form; the query neither emits record IDs nor any raw key,
command body, credential, or task value.

The direct Viewer read retains the existing generated read shape, including
verified `createdAt` and `updatedAt`, while protected command and replay
responses retain their exact eight-key ADR-0063 envelopes.

The lane also requires server-side Viewer `403` denials for create, start,
complete, and reopen; a Member invalid-state denial; idempotent create replay;
and a stale-version transition conflict. It asserts 390, 768, and 1440 pixel
presentation, including the mobile disclosure, first action within 650 pixels,
two identifying summaries at 390 by 900, 44 pixel touch targets, no overflow
or overlap, stylesheet/token/icon geometry, and axe WCAG 2 A/AA checks. Its
unfiltered mobile check tolerates canonical seed data by checking the first
permitted Start and first two visible rows without assuming authored records
are first. A `Synthetic` search then isolates the two authored records for the
390/768/1440 visual cohort. The evidence captures the initial home,
unfiltered and filtered lists, forms, pending Start, unknown Create retry,
filtered reopen feedback, Viewer read, recoverable 503 alert, no-match, and
final results. Its negative asset probe confirms that a hidden required icon
is detected.

The presentation checks require stylesheet HTTP/content type, resolved Task
grid/accent tokens, and visible current-state interactive icon geometry. The
emitted Task source supplies all seven approved icon names without requiring
irrelevant icons to be visible in every state. The negative asset probe invokes
the same asset checker against disabled generated stylesheet links and a
deliberately hidden visible icon, observes each failure, restores prior asset
state, and then passes it again.

## Static evidence

- `pnpm exec prettier --check e2e/consumer-task.spec.ts e2e/consumer-task-fixture.ts e2e/task-presentation.ts` passed.
- `pnpm exec playwright test e2e/consumer-task.spec.ts --list` found one Task E2E test.
- `git diff --check -- e2e/consumer-task.spec.ts e2e/consumer-task-fixture.ts e2e/task-presentation.ts` passed with no output.

No services, Docker builds, generated preview, or live E2E command were run.
The runtime lane remains intentionally unexecuted until the shared source is
frozen and root grants separate runtime authority.

## Integration assumptions

The suite uses the accepted Task labels and these narrow generated-UI hooks:
`main.task-v1`, `--task-workspace-version: 1.0.0`, `.task-records`,
`.task-summary`, the existing `Application routes` navigation landmark,
`Demo role`, `Search records`, `Status filter`, `Clear filters`, `Refresh`, and
an explicit `Retry` action. It expects the seven approved Lucide class names
from ADR-0057 in emitted Task source and checks only currently visible icons.
Canonical generated navigation contains the three actual Graph navigation
entries: `Task overview`, `All tasks`, and `Task workflow`; form and detail page
intents remain reachable from their local UI flows rather than being invented
as navigation entries.

The source owner confirmed these DOM hooks and the fixed unknown-result Retry
message. The lane also uses emitted `No task records yet.` / `No matching
records.` finder copy and scopes the reopen result to `.task-list-mutation` as
`Task: In progress.`. The protected API shape is frozen by ADR-0063 and is
asserted exactly by this lane.
