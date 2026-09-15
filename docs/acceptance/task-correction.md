# Team Task Correction Acceptance

Status: accepted for bounded local Task correction delivery. Task review,
independent Terra QA and independent Sol release review passed with no open
P0/P1/P2 findings. Root accepted the slice on 2026-09-13.

## User outcome and boundary

A Member can correct the title, description, assignee, due date and priority of
the same not-started or in-progress task. Completed work must be reopened before
editing. Save preserves identity and status, increments its version once and
retains one audit event and replay receipt. Conflict recovery preserves intended
values and requires deliberate review; an interrupted Save retries its original
request safely. Viewer access remains read-only.

Base: `5b65169e56c834f2a466539ee81ec020e76541c3`. The frozen ADR-0064 and its
independent standing-acceptance receipt define the bounded contract. Existing
Published Task grants retain v1; the new exact Member grant selects v2. No
database schema, package, service, identity or hosted deployment is introduced.

## Acceptance evidence

- The old Task's 63 ordered files and the existing ten non-Task bundles remain
  byte-identical. Baselines were captured before implementation and not updated
  to accommodate new code.
- Focused runtime tests cover strict request validation, editable-state and
  role authorization, same-ID/status correction, replay, conflicting payloads,
  concurrent writes, persistence rollback and generated-store parity.
- Emitted React/CSS acceptance covers Save/Cancel, prefilled values, pending
  lock, unknown-response retry, draft retention, explicit stale-version review,
  result continuity, keyboard focus and late role callbacks at three widths.
  This fast lane uses authored transport and is not PostgreSQL evidence.
- Full affected package and focused compiler results, identities and the initial
  independent task review are recorded in `evidence/consumer-task-correction`.
- Actual attempt 1 stopped before Publish at the existing isolated-project name
  guard. Attempt 2 reached immutable Compilation, then its verifier failed at
  `task-recomplete` before delivered Preview. Earlier lifecycle probes passed;
  correction probes were skipped. Both attempts remain recorded as failures.
- Actual attempt 3 passed all twelve verifier steps and exercised browser
  correction through conflict, completed-state denial, Reopen and committed
  response loss. Its test incorrectly expected Start on the in-progress task;
  the screenshot confirms the correct Complete action was disabled. Fourteen
  actual images are preserved. The assertion now follows the explicit Reopen
  state; it retains the same business expectations and pending-write lock.

Actual attempt 4 passed the complete generated PostgreSQL/API/browser lane in
4.0 minutes. The local app was ready in 196,950 ms; the business/evidence sequence
completed in 224,503 ms. Browser field correction before and after Start,
explicit stale-editor conflict, terminal edit denial, Reopen, committed-response
loss and exact UI retry after API restart passed. The four audited records have
audit and receipt counts `[5, 2, 1, 8]`; denied, cancelled and replayed actions
add no successful write. The correction record persists versions 0 through 7.
Only digest-form receipt keys are retained.

The lane verified immutable inputs and artifacts, actual CSS/icons including
negative asset controls, and responsive presentation. Twenty-four final actual
PNGs have recorded hashes and filename-matching widths. The exact seven
Factory/verifier/Preview projects have zero containers, networks and volumes,
including stopped containers. Post-run service source checks match 10
control-plane, 10 worker and five Workbench files; both local frozen manifests
match. Earlier failed attempts remain preserved separately.

This is one passing prepared-local authored-selection sample after three
recorded failures, with one interpretation and zero live model calls in the
passing run. It establishes neither model accuracy nor measured ordinary-user
success. There was no manual rescue inside the passing run; prior development
repairs are not hidden by that narrower measure.

Evidence: [actual pass](evidence/consumer-task-correction/actual-runtime-attempt-4.log),
[implementation](evidence/consumer-task-correction/implementation-report.md),
[full task review](evidence/consumer-task-correction/task-review.md),
[scoped repair review](evidence/consumer-task-correction/task-review-repair.md),
[QA](evidence/consumer-task-correction/qa-report.md),
[final review](evidence/consumer-task-correction/release-review.md),
[runtime facts](evidence/consumer-task-correction/runtime-facts.json),
[source identity](evidence/consumer-task-correction/runtime-identity.json),
[cleanup](evidence/consumer-task-correction/cleanup.json),
[actual screenshots](evidence/consumer-task-correction/screenshot-inventory.json).

## Product scorecard and next slice

Coverage remains four canonical definitions and three demonstrated local
runtime families. Correction closes a basic Task journey gap; it does not
establish mature task management, model-selection accuracy, real identity or
ordinary-user effort measurements.

The next core delivery is data-based definition authoring and batch validation,
starting with the four current definitions as round-trip fixtures. Measure
distinct definitions admitted without handwritten runtime or UI. A small
semantic batch precedes 30, 100 and hundreds of definitions. Cosmetic variants
do not count as new product coverage. See the
[executable scale handoff](../superpowers/plans/2026-09-13-product-definition-scale.md).
