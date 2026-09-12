# Approval correction acceptance

Date: 2026-09-13. Base: `92f21089beeb184a236a1512cb4c1866f158e903`.
Status: accepted for controller delivery. Both actual business lanes, task review,
independent QA and final slice review pass with P0/P1/P2 findings 0/0/0. The
controller's final task result and Git history record the commit and verified
remote branch tip.

## User outcome and scope

Expense and Purchase requesters can edit a draft, read a required Return reason,
revise and resubmit the same record, and retain the earlier decision after final
approval. Lost responses can be retried without duplicate results; concurrent
changes produce a visible conflict instead of overwriting another writer.

This implements accepted ADR-0060 and ADR-0062 with the founder-approved
ADR-0061 visual baseline. The same versioned components, original local media,
icons and typed fields serve both families. No new dependency, provider, public
Graph version, template count or deployment capability is introduced. Draft ->
Publish -> immutable Compilation and all frozen legacy artifacts are preserved.

## Actual persisted acceptance

The final command ran the two existing Playwright lanes with one worker and
zero retries:

```powershell
pnpm exec playwright test e2e/consumer-approval.spec.ts e2e/consumer-purchase-request.spec.ts --workers=1 --retries=0
```

Result: **2 passed (8.0 minutes)**. Interpretation is an authored
fixture; compilation, verification, generated HTTP APIs, PostgreSQL, browser
interactions and process restart are real. No model call or cloud deployment is
represented by this evidence.

| Measure                                                             | Expense                      | Purchase                     |
| ------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| Time to ready in the prepared local fixture                         | 182.054 seconds              | 178.884 seconds              |
| Complete automated lane including business checks                   | 224.133 seconds              | 226.775 seconds              |
| Interpretation selections / business questions / technical handoffs | 1 / 0 / 0                    | 1 / 0 / 0                    |
| Final correction record                                             | Same ID, approved, version 7 | Same ID, approved, version 7 |
| Retained decisions / audit events                                   | 2 / 8                        | 2 / 8                        |
| Responsive widths                                                   | 390 / 768 / 1440             | 390 / 768 / 1440             |

Both lanes prove:

- Create -> draft edit -> submit -> Return with required reason -> reload ->
  revise to draft -> resubmit -> approve -> reload, using the same record ID.
- A committed Create followed by lost browser delivery survives an actual API
  container restart; the retained request key replays the identical result.
- A committed Return followed by lost delivery retains the reason and request
  identity even after filtering the row out and back; replay creates no event.
- A held Save retains values and disables duplicate activation across a filtered
  row remount. Two real API writers at one version produce exactly 200 and 409.
  A stale UI Save reports the refreshed conflict without overwriting the record.
- Submitted and approved edits are denied. Empty/whitespace Return reasons fail.
  Current role authorization, scoped history and late role responses are checked.
- The final record reaches version 7, with eight audit events and two decisions.
  The earlier Return reason is readable after reload and eventual approval.
- The complete immutable Compilation metadata fingerprint remains unchanged.

Safe record-level evidence is in
[Expense](evidence/consumer-approval-correction/expense/correction-journey.json)
and [Purchase](evidence/consumer-approval-correction/purchase/correction-journey.json).
The prepared-fixture timings do not measure real-model classification or
ordinary-user success rates.

## Presentation and regression

Both actual lanes pass loaded stylesheet/icon/media checks, resolved theme
variables, no horizontal overflow, keyboard Details operation and zero applicable
axe violations. All correction-state controls retain 44 px touch height. The
first Submit ends at approximately 616 px on mobile/tablet and 478 px on desktop,
within the unchanged 650 px requirement. Dark presentation and local-media
fallback also pass the existing responsive checks.

There are 48 new correction-state screenshots across both families: draft edit,
required reason, returned record, approved history, pending, conflict, Create
retry and Return retry at three widths. Another 29 screenshots retain baseline
presentation/history/form/recovery coverage. Root inspected 12 key final images;
[the image hashes and observations](evidence/consumer-approval-correction/root-visual-review.json)
record that allocation. Independent QA inspected the remaining 36 new state
images and baseline samples, with no qualitative findings.
Failed-attempt screenshots are preserved separately in local staging and are not
presented as accepted UI.

| Actual state           | Expense                                                                                       | Purchase                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Edit on phone          | [390 px](evidence/consumer-approval-correction/expense/correction-draft-edit-390.png)         | [390 px](evidence/consumer-approval-correction/purchase/correction-draft-edit-390.png)         |
| Returned with reason   | [390 px](evidence/consumer-approval-correction/expense/correction-returned-390.png)           | [390 px](evidence/consumer-approval-correction/purchase/correction-returned-390.png)           |
| Final retained history | [1440 px](evidence/consumer-approval-correction/expense/correction-approved-history-1440.png) | [1440 px](evidence/consumer-approval-correction/purchase/correction-approved-history-1440.png) |

Initial implementation suites passed compiler 693, worker 301 and adapters 185.
Final affected compiler presentation/correction checks pass 70; worker checks
pass 96. Earlier Published-lock/database checks pass 128 and remain valid for
unchanged paths. Affected builds, typechecks and lint pass. Root's two authored
family fixtures and 14 generation-hook tests pass. Exact pre-change Expense,
Purchase and Booking artifact hashes remain unchanged. These overlapping focused
counts supplement the full-suite evidence; they are not additive totals.

The actual-runtime fixes exposed and repaired: Published Graph selection via its
separate immutable lock, lost idempotency headers in the verifier session branch,
filtered-row command state and feedback, and correction wrappers missing compact
layout/accent CSS. Emitted Chromium regressions now exercise real component
nesting before the full runtime lane. Test-only repairs preserve canonical hash
format, distinguish product alerts/Details from other elements, and compare GET
Decimal amounts numerically while keeping exact mutation response contracts.
The detailed chronology remains in the active PM ledger and implementation/QA
reports; earlier failed attempts are not relabeled as passes.

## Runtime identity and cleanup

The exact Factory project was `factory-t9-correction-20260912`. Root matched
changed production hashes inside the actual worker, Control Plane and Workbench
images using their dependency boundaries. Unchanged images were reused for
fixture-only repairs. Independent QA verified both final PreviewRuns persisted
as stopped before Factory shutdown. Root then verified zero containers (including
stopped containers), networks and volumes across all 11 exact owned projects.
See [cleanup evidence](evidence/consumer-approval-correction/cleanup.json).
No unrelated project was changed or removed.

The durable evidence includes the
[implementation report](evidence/consumer-approval-correction/implementation-report.md),
[task review](evidence/consumer-approval-correction/task-review.md),
[independent QA report](evidence/consumer-approval-correction/qa-report.md),
[final slice review](evidence/consumer-approval-correction/release-review.md),
[passing runtime log](evidence/consumer-approval-correction/actual-runtime.log),
[source identity](evidence/consumer-approval-correction/source-identity.json),
[running-image identity](evidence/consumer-approval-correction/runtime-identity.json)
and [safe local Compose override](evidence/consumer-approval-correction/acceptance.compose.yml).
Reports preserve their historical handoff status; final controller acceptance is
recorded at the top of this document and in the active PM ledger.

## Product tracking and next milestone

Counts remain three definitions and two demonstrated runtime families. This
milestone closes correction/recovery effort within those families; it does not
claim hundreds of verified templates. The next bounded expansion is the
[Task create/start/complete/reopen plan](../superpowers/plans/2026-09-11-canonical-team-task-family.md),
which inherits the approved visual hierarchy and the focused emitted-DOM checks.
Capture its non-Task byte baseline from this accepted delivery before writing
Task source. Appointment, Inventory and Content follow proven family closure.

Verified identity, requester ownership, tenant isolation, multi-stage approval,
attachments, external-provider reconciliation and managed hosting remain outside
this local slice. Track first useful application time, complete business outcome,
recovery effort and reused assemblies alongside eventual real-user validation.
