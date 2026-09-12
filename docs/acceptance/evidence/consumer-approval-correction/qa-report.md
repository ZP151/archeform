# Approval correction independent QA — attempt 1

**QA_PASS: no**

## Scope and runtime identity

This was the first provider-free execution of the two required actual local
browser lanes against Factory project `factory-t9-correction-20260912`:

- Workbench: `http://127.0.0.1:15180`
- Control Plane: `http://127.0.0.1:13020`
- Runtime identity: `.superpowers/sdd/2026-09-12-approval-correction/runtime-identity.json`
- Runtime record: the three final-source image IDs and all 14 production-source
  hashes matched at startup. Both HTTP health probes returned `200`.
- Provider/model acceptance was disabled. The lanes used their authored fixture
  interpretation and an actual local PostgreSQL/generated HTTP/browser runtime.

## Command and result

```powershell
$env:FACTORY_E2E_BASE_URL = 'http://127.0.0.1:15180'
$env:FACTORY_E2E_CONTROL_PLANE_URL = 'http://127.0.0.1:13020'
$env:FACTORY_E2E_ISOLATED = '1'
$env:FACTORY_E2E_FACTORY_PROJECT = 'factory-t9-correction-20260912'
$env:FACTORY_APPROVAL_REAL_ACCEPTANCE = '0'
$env:FACTORY_APPROVAL_PRIVACY_ACCEPTANCE = '0'
pnpm exec playwright test e2e/consumer-approval.spec.ts e2e/consumer-purchase-request.spec.ts --workers=1 --retries=0
```

Exit code: `1`; Playwright result: `2 failed` of `2`.

Complete safe reporter output is retained in
`.superpowers/sdd/2026-09-12-approval-correction/qa-e2e.log`. It must not be
overwritten; the next authorized run will use `qa-e2e-attempt2.log`.

## Demonstrated findings

### P1 — Expense lane cannot obtain its authored fixture interpretation

The lane failed before the approval journey at
`e2e/consumer-approval.spec.ts:342`. `approvalInterpretationFixture` supplied
the changed correction brief, while `FixtureRequirementInterpreter` only
registered the former submit/reject brief. Its normalized input differs from
the registered key (lengths `257` and `183` respectively), yielding
`RequirementInterpreterError: No fixture interpretation exists for this brief.`

The root owner has reported a scoped fixture-bridge correction and focused
source checks, but attempt 1 cannot validate that later source state or runtime
image.

### P1 — Purchase compilation failed before verification or preview

The Purchase lane created compilation `cmtyhteol000dp84tjghvrs46`, then reported
delivery stage with lifecycle `publish, compile` only. Safe persisted inspection
showed `result.status: failed`, `failureCode: compilation.failed`, zero
artifacts, and no verification or preview request. The factory containers and
health endpoints remained healthy.

The safe current-preview query returned HTTP `200` with an empty body because
no preview existed. The Purchase cleanup helper attempted JSON parsing despite
that valid no-preview response, which produced the reported `Unexpected end of
JSON input` and masked the primary delivery failure. This cleanup issue is
secondary; it does not explain the failed compilation.

The persisted safe status contains no more specific failure code. The exact
compiler failure cause remains unresolved pending the implementation owner's
bounded diagnostic and final-image verification. No raw logs, credentials, or
model payloads were inspected or recorded.

## Acceptance coverage and visual evidence

No acceptance screenshot may be treated as current evidence: both lanes stopped
before the required correction journey and state captures. Consequently the
business journey, mutation recovery/concurrency, exact version/event counts,
responsive state captures, accessibility, loaded visual assets, and Preview
cleanup remain unverified for this attempt.

P0/P1/P2: `0/2/0`.

## QA actions and limits

QA made no production or test edits, Git changes, dependency/environment-file
changes, service cleanup, retries, or broad-package reruns. The failures were
reported to the PM/root immediately. Existing test finalization was allowed to
run; precise Preview cleanup remains unproven because no Purchase preview was
created and the helper threw while recognizing that state.

## Attempt 2 — rebuilt frozen runtime

**QA_PASS: no**

After the scoped repair/review and runtime rebuild, QA ran the same prescribed
two-lane command once more with `--workers=1 --retries=0`. Exit code was `1`;
Playwright reported `2 failed` of `2`. Complete safe output is retained in
`.superpowers/sdd/2026-09-12-approval-correction/qa-e2e-attempt2.log`.
Attempt-1 output remains unchanged in `qa-e2e.log`.

The rebuilt runtime had refreshed image identity, matching frozen source hashes,
and `200` responses from both local health endpoints before execution. The
Expense fixture interpretation reached its HTTP success checkpoint, proving the
attempt-1 fixture bridge was no longer the immediate blocker. Both lanes then
published and compiled successfully but reached terminal automatic-delivery
outcome `failed` instead of `ready` before Preview creation:

| Lane | Compilation | Verification | Safe persisted result |
| --- | --- | --- | --- |
| Expense | `cmtyij0ja0009o54twcmsym0f` | `cmtyij1qo0022o54tnr1mnrbl` | `failed`, `binding.status_mismatch` (`binding`) |
| Purchase | `cmtyimlrs002co54t9jboi55s` | `cmtyimmyv0045o54t6gsbihq0` | `failed`, `binding.status_mismatch` (`binding`) |

This is one shared P1 acceptance blocker: the generated correction
interpretations compile, but the actual verifier rejects their status binding.
Both failures occurred at local delivery after `publish, compile, verify`, with
no PreviewRun rows and no `factory-preview-*` containers, networks, or volumes
to clean. Therefore there are no exact Preview project IDs for attempt 2 and no
browser screenshots or state captures that could qualify as visual evidence.

The exact field-level reason for `binding.status_mismatch` is not exposed by the
safe persisted code/category fields. It remains for the assigned implementation
owner to diagnose; QA made no diagnostic source or service changes and did not
run another attempt.

Current result: **QA_PASS: no; P0/P1/P2: `0/1/0`**. The complete business
journey, post-commit restart/replay, competing writes, version/event counts,
responsive and accessibility state captures, visual inspection, and exact
Preview cleanup are still unverified because automatic delivery never produced
a Preview.

## Attempt 3 — verifier repair runtime

**QA_PASS: no**

After the verifier-header repair, recheck, and rebuilt worker image, QA ran the
same two-lane command once with the required single worker and zero retries.
Exit code was `1`; Playwright reported `2 failed` of `2`. The complete safe
output is retained in
`.superpowers/sdd/2026-09-12-approval-correction/qa-e2e-attempt3.log`.

This attempt closed the preceding delivery-stage blocker as an observed runtime
fact. Both exact generated applications reached `publish, compile, verify,
preview`, and their compiled/verifier records succeeded. Both lanes then stopped
at the shared pre-UI `immutableApprovalFingerprint` assertion in
`e2e/approval-presentation.ts:16`. The actual Control Plane returns its valid
input graph digest as `sha256:` plus 64 hexadecimal characters (71 characters
total), while the helper required a bare 64-character hexadecimal string. The
runner recorded this same mismatch for Expense and Purchase. The defect is in
the acceptance helper assertion; it is not evidence of a product hash failure.

| Lane | Compilation | Verification | Preview |
| --- | --- | --- | --- |
| Expense | `cmtyj1swf004fo54thl7pafhx` | `cmtyj1u3n0068o54t8ch0jrl7` succeeded | `preview-f00a9781-e3e4-4232-ba7d-10897ee9a901` stopped |
| Purchase | `cmtyj67g7006io54tamh0v2nd` | verification succeeded | `preview-af7f12e0-5b0c-4365-86d9-3bf011b7866f` stopped |

The exact Preview projects were
`factory-preview-preview-f00a9781-e3e4-4232-ba7d-10897ee9a901` (Expense) and
`factory-preview-preview-af7f12e0-5b0c-4365-86d9-3bf011b7866f` (Purchase).
Independent post-finalization checks used `docker container ls --all` and the
exact Compose-project labels. Each project had zero containers, networks, and
volumes; both persisted PreviewRun records had status `stopped`. This proves
attempt-3 Preview cleanup despite the later assertion failure.

No actual application page was opened after Preview because the helper failed
before its first browser navigation. Thus no correction screenshots were
generated for root's allocated visual inspection, and all business, interaction,
restart/replay, concurrent-write, responsive, accessibility, and qualitative
visual evidence remains unverified.

Current result: **QA_PASS: no; P0/P1/P2: `0/1/0`**. The single P1 is the shared
acceptance-helper digest-format mismatch. QA made no source/test/service change
and will wait for an owner repair, fresh recheck, runtime validation, and an
authorized next attempt.

## Attempt 4 — corrected immutable fingerprint check

**QA_PASS: no**

After the focused helper correction, QA ran the prescribed lanes once more with
one worker and zero retries. Exit code was `1`; both lanes failed. Complete safe
output is retained in
`.superpowers/sdd/2026-09-12-approval-correction/qa-e2e-attempt4.log`.

This attempt demonstrated the previously blocked end-to-end delivery path:
both lanes reached real generated apps after `publish, compile, verify, preview`.
Their loaded-asset facts were `stylesheetLoaded: true`, workspace version `5`,
visible icons, grid application display, no unresolved CSS tokens, and no body
overflow. The immutable fingerprint assertion therefore no longer blocked the
browser path.

### P1 — First draft action is below the required 390 px viewport fold

Both actual product families fail the same executable effort criterion at
`390 x 900`: the first `Submit` action bottom is `704.984375 px`, exceeding the
required maximum `650 px`. Expense failed at
`e2e/consumer-approval.spec.ts:194`; Purchase failed at
`e2e/consumer-purchase-request.spec.ts:620`.

This is a demonstrated responsive product usability defect. It prevents the
requested first-action effort check, and execution consequently did not reach
the correction, recovery, concurrency, history, or restart/replay journey.

### Cleanup and evidence state

The exact attempt-4 Preview projects were
`factory-preview-preview-f10fe055-79bf-452a-9be6-1d67119706a4` (Expense) and
`factory-preview-preview-657825b5-b909-47c1-ad5b-19870bc2eb5b` (Purchase).
Both persisted PreviewRuns are `stopped`. Independent exact-project checks with
`docker container ls --all` and Compose labels found zero containers, networks,
and volumes for each.

Business evidence: delivery and asset loading reached the actual products, but
the business correction journey is unverified.

Mechanical visual/accessibility evidence: stylesheet/icons/grid/no-overflow
checks passed; the first-action placement failed. No complete responsive or axe
acceptance claim is possible.

Qualitative visual evidence: no correction-state screenshot set was produced,
so the allocated visual review remains pending.

Current result: **QA_PASS: no; P0/P1/P2: `0/1/0`**. QA made no source/test
changes, no retries, and no service cleanup beyond test-owned finalization.

## Attempt 5 — responsive repair runtime

**QA_PASS: no**

The final frozen runtime attempt ran both lanes once with the prescribed list
and safe failure-location reporters. Exit code was `1`; the complete safe output
is retained in
`.superpowers/sdd/2026-09-12-approval-correction/qa-e2e-attempt5.log`.

This is substantial executable evidence for the repaired generated products:

- Both lanes passed local interpretation, immutable publish/compile/verify/
  Preview, loaded CSS/icons/media, no unresolved tokens or body overflow, and
  workspace version `5`.
- The first Submit action bottoms were `616 px` at 390/768 and `478 px` at
  1440, satisfying the 650 px effort bound.
- Expense passed empty decision history/access guards and visible two-decision
  history with reload, safe retry, late-role isolation, and 390/768/1440
  responsive evidence.
- Expense passed no-overflow, zero axe violations, keyboard details, local-media
  fallback/reload, and dark-mode evidence at all three widths before entering
  correction recovery.
- Purchase passed first-action, layout/text fit, no-overflow, and zero-violation
  presentation evidence at 390/768/1440, plus the analogous history evidence.

Two strict-locator failures stopped the remaining correction verification. They
are P1 acceptance-evidence blockers, not demonstrated product defects:

1. Expense at `e2e/approval-presentation.ts:895` matched both the displayed
   generated unknown-result alert and Next.js's empty route announcer through an
   unscoped `getByRole('alert')`. The displayed product alert contained the
   expected recovery copy and retained form values.
2. Purchase at `e2e/consumer-purchase-request.spec.ts:137` targeted
   `details > summary` after correction-aware decision history added a second
   details element. The unscoped locator matched both `Decision history` and
   `Details`.

The safe location reporter recorded the Expense location
`approval-presentation.ts:895:43` and the Purchase location
`consumer-purchase-request.spec.ts:137:17`. The source owner must scope these
assertions, then provide the normal focused recheck and fresh authorized
acceptance attempt. QA did not alter them.

Attempt-5 cleanup is proven for Expense Preview
`preview-86c8d1cf-316e-4b51-99bd-ab62f2eeb8ec` / project
`factory-preview-preview-86c8d1cf-316e-4b51-99bd-ab62f2eeb8ec` and Purchase
Preview `preview-7f2415b4-110e-495d-8435-ae7172ddfb6e` / project
`factory-preview-preview-7f2415b4-110e-495d-8435-ae7172ddfb6e`. Both persisted
PreviewRuns are stopped; independently, both exact projects have zero
containers (`docker container ls --all`), networks, and volumes.

No correction-state screenshot set is accepted yet because the shared helper
stopped at Create recovery and Purchase stopped before the correction helper.
The remaining correction/restart/replay/race/version/audit/decision and
qualitative visual evidence is still open.

Current result: **QA_PASS: no; P0/P1/P2: `0/1/0`**.

## Attempt 6 — scoped Create-alert and Details selectors

**QA_PASS: no**

After the two mechanical locator corrections, QA ran the required two actual
lanes once with one worker, zero retries, and the safe location reporter. Exit
code was `1`; both lanes failed at the same later correction assertion.
Complete safe output is retained in
`.superpowers/sdd/2026-09-12-approval-correction/qa-e2e-attempt6.log`.

The prior locator blockers are closed in executable flow: both products passed
all previously recorded delivery, asset, first-action, responsive, history,
accessibility, and material checkpoints, then passed Create unknown-result
recovery and proceeded through the actual stale-write conflict. Both received
the expected real HTTP `409` and rendered the refreshed plain conflict feedback.

### P1 — Numeric business value is returned as a string after conflict refresh

At `e2e/approval-presentation.ts:1061:32`, both provider-free actual products
returned the same record ID and `version: 2`, but `amount` was the string
`"91.5"` where the persisted typed-record contract requires numeric `91.5`.
Expense and Purchase failed identically. This is executable cross-family
evidence of a possible generated value-type/API serialization defect, not a
locator ambiguity. It blocks the remaining correction, return/revision,
restart/replay, race, decision-count, and final reload assertions.

Attempt-6 exact cleanup is proven for Expense Preview
`preview-c539cf07-9bba-4c66-aec4-6509f3477cfc` / project
`factory-preview-preview-c539cf07-9bba-4c66-aec4-6509f3477cfc` and Purchase
Preview `preview-bc109711-7adb-4fa6-b434-ce1e9a047ed5` / project
`factory-preview-preview-bc109711-7adb-4fa6-b434-ce1e9a047ed5`. Both persisted
PreviewRuns are stopped; independent exact-project checks found zero containers,
networks, and volumes for each.

Current result: **QA_PASS: no; P0/P1/P2: `0/1/0`**. No QA source/test/service
change or retry occurred.

## Attempt 7 — final frozen runtime

**QA_PASS: yes**

After the approved fixture-only persisted-GET expectation correction, QA ran the
two actual E2E lanes exactly once against the final frozen Factory runtime:

```powershell
pnpm exec playwright test e2e/consumer-approval.spec.ts e2e/consumer-purchase-request.spec.ts --workers=1 --retries=0 ''--reporter=list,.superpowers/sdd/2026-09-12-approval-correction/qa-location-reporter.mjs''
```

The command exited `0`: **2 passed (8.0m)**. Its full safe output is retained
in `.superpowers/sdd/2026-09-12-approval-correction/qa-e2e-attempt7.log`.
The final runtime identity records the frozen worker image
`sha256:79f2c1201b55792d9ff094907bf9e3b8a611f70bc3643036844b271a7807af1c`,
control-plane image
`sha256:c85f0ab84022ccef1432cfa6ae624fc10d868f218c83be52e29c210aaa158342`,
and workbench image
`sha256:e243fcd2808322c30d342715c4781fb910ab39e1a2b1902f58ddbefe8a5d7cac`;
the applicable runtime source hashes matched the final freeze before this run.

### Executed acceptance evidence

Both actual generated applications completed the correction journey and reported
`finalVersion: 7`, `finalStatus: "approved"`,
`sameRecordCorrection: true`, `returnedReasonSurvivesReload: true`,
`retainedDecisions: 2`, and `auditEvents: 8`. Each also proved Create
lost-response replay after an API restart, Return lost-response replay, stale
concurrent edit rejection, concurrent API writes committing once, duplicate
activation suppression, and submitted-record edit denial. The evidence covered
390, 768, and 1440 px. No provider model was called.

The two lanes also passed local assets and presentation checks at every width:
stylesheet/version/icon evidence, no body overflow, role text and summary
fitting, zero axe violations, keyboard Details operation, local media
fallback/reload, dark-mode evidence, decision-history behavior, and the first
Submit control at 616 px (390/768) and 478 px (1440), under the 650 px bound.
The persisted GET amount is intentionally accepted as `number|string` for
the existing Prisma Decimal serialization contract; strict numeric assertions
remain on mutation/replay responses.

### Qualitative screenshot review

The root review manifest
`docs/acceptance/evidence/consumer-approval-correction/root-visual-review.json`
records a pass with no findings for the assigned twelve primary correction PNGs.
Independent QA reviewed the remaining responsive correction states with no
clipped text, overlap, inaccessible controls, or unclear recovery/lock/history
state:

- Expense: `correction-approved-history-390.png`,
  `correction-approved-history-768.png`, `correction-conflict-768.png`,
  `correction-conflict-1440.png`, `correction-create-retry-390.png`,
  `correction-create-retry-768.png`, `correction-create-retry-1440.png`,
  `correction-draft-edit-768.png`, `correction-draft-edit-1440.png`,
  `correction-pending-390.png`, `correction-pending-768.png`,
  `correction-pending-1440.png`, `correction-return-reason-390.png`,
  `correction-return-reason-768.png`, `correction-return-retry-768.png`,
  `correction-return-retry-1440.png`, `correction-returned-768.png`, and
  `correction-returned-1440.png`; baseline
  `d24-results-768.png`.
- Purchase: `correction-approved-history-390.png`,
  `correction-approved-history-768.png`, `correction-conflict-768.png`,
  `correction-conflict-1440.png`, `correction-create-retry-390.png`,
  `correction-create-retry-768.png`, `correction-create-retry-1440.png`,
  `correction-draft-edit-768.png`, `correction-draft-edit-1440.png`,
  `correction-pending-390.png`, `correction-pending-768.png`,
  `correction-pending-1440.png`, `correction-return-reason-390.png`,
  `correction-return-reason-768.png`, `correction-return-retry-768.png`,
  `correction-return-retry-1440.png`, `correction-returned-768.png`, and
  `correction-returned-1440.png`; baselines
  `workspace-results-768.png` and `workspace-dark-768.png`.

These files are under
`docs/acceptance/evidence/consumer-approval-correction/{expense,purchase}/`.
The retained screenshots show readable labels/values/reasons, visible unknown
and pending states, clear disabled commands during in-flight work, coherent
wrap at narrow widths, and no control collision.

### Cleanup and residual scope

Before shutdown, independent QA verified the final Expense compilation
`cmtyks337008lrv4t9w73i256` / Preview
`preview-db414e1e-a322-4b79-9bd8-ebfce706a7c6` and Purchase compilation
`cmtykx67f00aorv4tz904zjyo` / Preview
`preview-23766852-2594-4fde-af8b-a53b59c81753` were persisted as
`stopped`, with each exact Compose project having zero containers including
stopped, networks, and volumes. After Factory shutdown,
`docs/acceptance/evidence/consumer-approval-correction/cleanup.json`
independently records zero containers/networks/volumes for the Factory project
and all ten historical/final Preview projects.

This is local, provider-free acceptance evidence against actual PostgreSQL,
generated HTTP, and browser runtime. It does not claim real provider or cloud
coverage; the test run deliberately recorded `modelCalls: 0`.

Current result: **QA_PASS: yes; P0/P1/P2: `0/0/0`**. QA made no production,
test, service, dependency, environment, or Git changes.


### Resolution of the historical Attempt-6 Decimal observation

The Attempt-6 “P1” was a provisional test-expectation finding. Read-only owner
trace established that the frozen existing GET/list contract serializes Prisma
Decimal values such as `91.5` as strings, while the mutation/replay contract
continues to Number-normalize its responses. The focused test adjustment accepts
only the persisted GET `number|string` representation and preserves strict ID,
version, status, immutable metadata, and numeric mutation/replay checks.
Attempt 7 executed that correction through both complete real journeys; it is
therefore closed as an assertion/contract interpretation, not an unresolved P1
or a production defect.
