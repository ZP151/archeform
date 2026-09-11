# Approval Correction and Decision Closure

Date: 2026-09-12. Priority: next product milestone, before Task-family expansion.
Status: slice A accepted under ADR-0059 with 34 focused tests and both real runtime lanes passing;
the combined B/C mutation contract is accepted under ADR-0060, not implemented.

## Goal and reason

An ordinary requester can correct a mistake, obtain a decision, understand the
result and continue after a return or interrupted operation in the same app.
The current create/submit/approve/reject demonstration cannot meet this outcome.
Registered definitions and runtime families remain useful coverage measures, but
are not a count of mature products.

The existing B3 Task scope repeats a basic form/list/state flow. Hold its production
wave until the shared application foundation supports the following outcomes.
Keep frozen ADR-0057 as a historical accepted experiment; do not silently change
its semantics, byte baseline or implementation status.

## Confirmed implementation gaps

1. The generated record store has update, but ApplicationRuntime, HTTP routes and
   the approval form do not expose a governed update. Requester has no update
   grant on the request; rejected is terminal in the shared approval definition.
2. Audit storage/authorization/GET API exist, but generated pages never request
   or display decision history. The browser test checks the API out of band.
3. Approval mutations have no idempotency/version support. A lost response after
   commit can lead to a duplicate Create or a misleading retry failure. GET
   error recovery does not test uncertain writes.

Evidence: `packages/adapters/src/requirements/approval-definition-template.ts`,
`packages/compiler/src/index.ts` (ApplicationRuntime, GeneratedController,
transitionBody, RecordForm, EntityRecords), and `e2e/consumer-purchase-request.spec.ts`.

## Ordered delivery slices

### A. Useful decision outcomes with current authority

Expose the existing audit capability through a useful product surface for roles
already allowed to audit. Show record identity, action, actor and time; relate the
history to the business record instead of dumping raw JSON. Differentiate the
reviewer's queue from requester results where existing Graph bindings permit it.
Do not grant audit visibility to another role as a presentation shortcut.

ADR-0059 implements the bounded history panel; queue-specific contents remain a
later refinement, not part of its completion claim.

Acceptance: the declared auditor sees both real decisions after reload through
UI; unauthorized roles cannot fetch or display the history; empty/error/retry and
role changes cannot leave stale privileged data. This is a partial product gain,
not completion of the full correction journey.

### B/C. Correct, resubmit and safely recover the same request

Add a governed correction path: edit a draft; preserve values and record identity;
lock direct editing while awaiting a decision; return with an understandable
reason; revise and resubmit; retain the earlier decision and later result.
The UI must expose the next action without asking the model to rebuild the app.

Acceptance: enter an incorrect value, correct it, submit, attempt forbidden edit,
return, revise, resubmit and approve in the real persisted application. Reload
at meaningful boundaries and verify no duplicate record or lost explanation.
Graph workflow/permissions, field changes, server guards and their tests require
a frozen Tech Lead contract before production implementation. Earlier immutable
Compilations remain immutable.

The first ADR-0060 proposal deferred replay/concurrency to C. Independent review
rejected that split because the threat model requires new state-changing requests
to bind replay and a record version or equivalent immutable revision. A lost
returned-record PATCH response could otherwise be retried as a second draft
update, and stale edits could overwrite newer data. Revise the proposal to deliver
B and its required C controls together; do not seek a weaker-control exception.
The final ADR-0060 at SHA-256
`b47961bec46af1757087e3c067ff6c1e35556aae2b07e9de01e0dbc16f122107`
passes the standing independent review (0/0/0) and is accepted in the ledger.
It freezes primary-entity scope and exact authorization/replay/version/state
precedence. Root owns its serialized implementation under the active next goal.

#### Recover uncertain writes in the same delivery boundary

Use the accepted server design to reconcile an operation whose response was lost.
A retry must not create another request or apply a decision twice. Distinguish a
business denial from a temporary service failure in visible feedback.

Acceptance: let a real Create/decision commit, discard its response in the test,
then recover/retry and verify one record, one transition, one audit result and the
correct visible outcome. Add concurrent/stale decision cases at the shared server
boundary. Preserve user input on pre-commit failure.

Acceptance must cover create, correction and decision writes consistently:
persist the operation identity, bind the expected version where a record exists,
commit mutation and evidence atomically, return a stable replay result, and expose
conflicts without silently overwriting newer values. The final exact contract is
owned by ADR-0060 after acceptance. Use one serialized implementation and one
required full contract review/QA/release sequence for the combined business slice;
do not repeat that sequence for each form or control.

## Acceptance changes

- Define scenarios from the user's job before inspecting current implementation.
- Evaluate the journey after an error or rejection, not only its happy path.
- Trace visible evidence; an API-only assertion cannot pass a promised UI feature.
- Report automation, reviewer observations and actual ordinary-user findings
  separately. Explicit rejection overrides earlier internal visual approval.
- Cover useful color hierarchy and concise icon actions, actual resource loading,
  mobile/tablet/desktop behavior and the unchanged server authority together.
- Use the existing review and run checks affected by each slice. Keep full gates
  only where shared contracts, security or repository release actually require
  them; add no per-screen audit or separate product approval stage.

## Product-goal measures

Track first useful app time, first complete business outcome, technical handoffs,
manual rescue, incorrect-input recovery, uncertain-write recovery and request
continuity separately. Current local fixture times do not establish real-model
classification or ordinary-user success. Claim a complete approval journey only
when A/B/C pass, and mature hosted/private usage only after identity/access and
operability evidence exist.

After the shared closure milestone, resume Task using the same correction,
results/history and recovery patterns. Then expand Appointment, Inventory and
Content with each family's real invariants and relevant reviewed assets. Reuse
proven journeys before accelerating toward hundreds or thousands of definitions.
