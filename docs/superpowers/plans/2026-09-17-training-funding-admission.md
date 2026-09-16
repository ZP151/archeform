# Training Funding definition admission

**Goal:** Add one distinct usable local product through definition data and shared
Approval capability, after numeric-domain capability acceptance. Coverage moves
from five to six only after the actual consumer journey passes.

## Frozen scope

- Follow accepted ADR-0069 and the existing Approval correction family. No new
  Graph/schema/API/package, per-product runtime branch, material or renderer.
- Write only in the consumer-delivery worktree. Root owns all Git, runtime,
  E2E helpers/evidence and acceptance. One data owner may edit the catalogue JSON
  and its directly affected admission tests after root dispatch.
- Preserve the five original canonical/provider/projection baselines. New lookup
  expectations may include Training; never recapture original fixture digests.
- The product is local funding approval, not payment, reimbursement execution,
  course enrollment, entitlement verification or calendar delivery. Material
  requirements for those jobs remain explicit clarification, not hidden defaults.

## Product data

Use key `training-funding-approval`, primary entity `training-request`, and the
existing requester/reviewer/auditor permission structure with employee, manager
and finance labels. Required fields are courseTitle (short text), fee (currency,
explicit factory.numeric-field-domain/v1 minimum 0 exclusive), sessionDate (date)
and justification (long text). There is exactly one eligible required short-text
title candidate; no database uniqueness or currency unit is inferred. The
existing deterministic fee witness 125.5 remains valid.

Reuse the approved Approval workspace, local photo fallback, Lucide icons,
required controls, numeric/date summaries and matched decision history. No enum
may be invented to satisfy an older presentation selector. Unsupported external
or identity requirements retain material questions in selection/follow-up tests.

## Task 1: Data admission

- Add the reviewed row to
  `packages/adapters/src/requirements/definitions/product-definitions.v1.json`,
  including canonical business semantics, matching provider guide, bounded
  selection rules, correction/failure journeys, existing capability locks and
  truthful first-party provenance using the existing ADR-0065 catalogue authority;
  accepted ADR-0069 supplies the shared numeric capability.
- Begin with a focused failing selection/admission test. Check deterministic
  canonical selection and repeat composition, preserved positive fee policy,
  required fields, full lifecycle, denial, exact numeric profile, distinct key,
  and exclusion questions. No source special-case may name this product.
- Run affected adapters/data CLI tests and all-five compatibility. Report exact
  catalogue count separately from actual accepted definition count.

## Task 2: Actual consumer and UI acceptance

Root parameterizes the existing Approval definition E2E helper: optional enum,
explicit summary expectations and retained detail fields. Preserve the Publication
case, its long-ID regression, and the shared correction journey. An optional
additional final-edit field lets fee and justification change in the same existing
mutation; it must not change legacy expected versions or audits.

Exercise one authored registered selection through real Publish/Compilation,
verification and preview. Target prepared-local ready time <=300000 ms, one
selection and no technical handoff in a passing run; separate this fixture result
from real-model or ordinary-user evidence. Check primary actions above the fold,
invalid zero/negative/wrong-type fee denial, client no-fetch feedback, same-record
return/edit-fee-and-justification/resubmit/approve, persisted dates/reasons,
role/state denial, retry and API restart. Create a second materially different
course; cards and history must visibly distinguish title, fee and date without
opening Details. Inspect actual primary/form/outcome images at390/768/1440 plus
existing dark/media-failure cases.

## Task 3: Delivery and next route

One independent ordinary data-admission review reuses accepted numeric-family
QA/release evidence; no repeat full shared-contract ceremony. Record exact source,
fixture scope, failures, actual times, reusable capability vs per-product edits,
UI reuse and cleanup. Root accepts the sixth local definition only when all
applicable results pass, then normal commit/push and remote equality. Update
status and the scale scorecard. Next capability remains calculated totals before
Equipment, then interval/capacity/conflict semantics before Appointment; real-model
selection and consented ordinary-user effort remain explicit parallel evidence
work, not inferred from synthetic acceptance.

## Completion evidence

Tasks 1 and 2 are complete. The registered catalogue contains6 distinct entries;
actual attempt2 passes with ready180306ms and acceptance218198ms. The independent
ordinary review has P0/P1/P2 0/0/0, and PM accepts the sixth local product. All3
exact runtime projects are clean. Root owns final commit/push and equality checks;
see docs/acceptance/training-funding.md for scope and retained attempt1 failure.
The next business route is recorded in the scale roadmap, with no additional
technology or hosting implementation authorized by this admission record.
