---
title: "ADR-0078: Unresolved Requirement Follow-up"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "requirements", "workbench"]
supersedes: ""
superseded_by: ""
---

# ADR-0078: Unresolved Requirement Follow-up

## Status

**Proposed.** Recommend **migrate** the registered-definition follow-up refusal
to a distinct, immediate, code-only error and a context-preserving revision
flow. This narrowly changes ADR-0065 REG-006's historical error/retry behavior;
it preserves refusal to construct an app while material requirements remain.

Implementation requires a separate qualified read-only reviewer to approve this
exact file hash under `docs/tech-governance.md`, report
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1 `0/0`, and find no unresolved
material choice. PM must record the hash, reviewer and standing authorization
before assigning a writer. This proposal grants no provider call, runtime,
Publish, deployment, Git, release or external-resource authority.

## Context

- **CTX-001**: At source baseline `63c7b12c4e17398d20f1a3f21964a1456bde17bb`,
  `openai-interpreter.ts` rejects a registered definition's remaining
  clarifications when answered clarification context is present. A fully valid
  unresolved selection can consume all three total provider attempts before
  returning `output_invalid`. Expense and Restaurant tests explicitly require
  that behavior. The generated-blueprint branch has its own repair behavior.
- **CTX-002**: Remaining material questions are a valid business refusal, not
  necessarily malformed provider output. Provider guidance already requires
  their retention. Silently selecting a narrower supported app would lose the
  user's requirement; returning successful clarification after exhaustion
  would not solve the two-cycle constraint.
- **CTX-003**: The failed journey retains its brief, answers and previous
  validated interpretation in memory. `ProductConversation` displays only the
  composer, hiding prior questions. `submitBrief` resets that state and sends
  empty answers. A better error sentence alone would still lose useful context
  on the next submission.
- **CTX-004**: The ordinary-user objective is few questions followed by a useful
  complete app. This decision addresses an honest recovery step only. It does
  not add missing capabilities, prove natural-language understanding, complete
  the entire objective, or authorize ADR-0079's separate automatic-delivery work.

## Current and proposed contract

- **CUR-001**: Keep the exact Golden table in `docs/tech-governance.md`, governed
  by tracked manifests, `pnpm-lock.yaml`, Dockerfiles and Compose. Relevant
  coordinates remain Node `>=22.11.0 <23`, `pnpm@9.0.0`, TypeScript `^5.7.2`
  resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React `^19.0.0` resolved
  `19.2.8`, OpenAI `^4.77.0` resolved `4.104.0`, and Zod `^3.24.1` resolved
  `3.25.76`. No dependency or supported-version change.
- **CUR-002**: Keep `factory.requirement-interpretation-result/v1`, Requirement
  and Blueprint V1, definition-selection schemas, Graph contracts, canonical
  projections, family admission, business-parameter checks and immutable
  Draft -> Publish -> Compilation behavior. Keep existing request fields
  `brief`, `answers`, `clarificationContext`, and `priorInterpretation`, with
  their current validators and bounds. No new request field or persistence.
- **DEC-001**: Add adapter error code `definition_scope_unresolved` to
  `RequirementInterpreterErrorCode`. Emit it only after strict provider parsing,
  existing prior-business-parameter checks, registered-definition projection,
  and full `assertRequirementInterpretationResult` validation succeed, when
  nonempty answered `clarificationContext` and remaining clarifications coexist.
  Stop on that first fully validated unresolved selection; do not spend another
  repair attempt. The thrown error contains fixed text and its code only, with
  no candidate, questions, answer, provider material or cause attached.
- **DEC-002**: Malformed JSON/schema, invalid projection, invalid final result,
  unknown definition and changed prior Restaurant parameters retain existing
  repair/output-invalid behavior. Initial registered questions remain valid
  results. A resolved registered follow-up remains a normal V1 success. The
  generated-blueprint branch, timeout/cancellation, total deadline and maximum
  repair budget remain unchanged. An earlier malformed attempt may precede the
  typed refusal; only an initially valid unresolved selection guarantees one
  provider attempt rather than three.
- **API-001**: At `POST /api/requirements/interpret`, the new error is HTTP 422
  with exactly
  `{ "error": { "apiVersion": "factory.requirement-interpretation-error/v2", "code": "requirement.definition_scope_unresolved" } }`.
  V2 in this slice admits exactly that code/status pair. Every existing error
  keeps its existing V1 envelope, code and status. The parser accepts the closed
  union of those two contracts; unknown versions/codes, extra keys, mismatched
  version/code or status, and message/details fields fail closed to the existing
  generic failure. No raw text is returned on either error contract.
- **API-002**: A version change is required because V1's enum and exact-key/status
  parser are closed. Adding a code under V1 would silently redefine the claimed
  contract. The narrow V2 branch avoids migrating unrelated errors, success,
  requests, Graphs or stored data. Deploy producer and parser in one Workbench
  change. An older loaded client safely renders its existing generic failure
  for V2; it cannot interpret it as success. New clients continue to parse all
  existing V1 errors. No negotiation or broad compatibility layer is added.

## User recovery contract

- **UXR-001**: Only this typed failure activates recovery. Render fixed copy:
  "Some requirements are still outside the supported scope. Review your earlier
  questions and answers, then revise the requirement or an answer to start a
  new request. No app has been created." Show the previous validated requirement
  summary and every previous clarification question with its submitted answer,
  including unanswered questions. Label these "Previous questions and answers",
  not an authoritative list of newly unresolved items. The refused provider
  result is not returned; the client cannot know which new questions it held.
- **UXR-002**: Preserve an in-memory snapshot of the failed attempt's submitted
  brief, validated prior interpretation and cumulative answers. Keep that
  snapshot visible while offering the existing brief and answer controls for
  editing. A separate `submitRevisedRequirement()` controller action is enabled
  only for this failure, with valid bounded inputs and a changed trimmed brief
  or changed answer value. Its single primary label is "Start revised request".
  Explain that earlier answers will be included. Do not invoke the ordinary
  `submitBrief` clearing path or offer a second indistinguishable Create action.
- **UXR-003**: The explicit revision submits the edited brief, the cumulative
  answer map (edited keys replace only themselves), matching nonempty answered
  question context, and the same validated prior interpretation through the
  existing request parser. It retains unanswered material questions in that
  prior interpretation. Clearing an answer supplies no acceptance of that
  question. Keep submitted and editing values separate so stale responses,
  pending edits and failed requests cannot overwrite the last submitted context.
  All values remain transient; reset/navigation follows existing memory-only
  behavior and does not create local storage, logs, telemetry or evidence text.
- **UXR-004**: A deliberate changed submission begins a new bounded journey
  attempt; it is not an automatic third cycle of the failed attempt. Preserve
  the existing maximum two interpretation cycles per attempt, three-question
  policy, busy guard, cancellation and stale-result suppression. No timer,
  unchanged retry, automatic rewording or silent counter reset starts a request.
  Repeated refusal keeps context available and triggers zero product-review,
  plan, Draft, Publish, Compilation or Preview operations.
  Starting an unrelated, empty-context request uses the existing explicit
  start-over/reset action; recovery never silently becomes that action.
- **UXR-005**: Explicit supported-scope acceptance concerns only the identified
  difference. Changing the live-payment answer to accept simulated payment must
  not clear another privacy, integration or data requirement. Preserve provider
  guidance requiring reevaluation of every material difference; keep all prior
  context in the request. Supported success still requires the existing strict
  result checks. The UI cannot infer acceptance from a generic yes, blank answer,
  the revision button, or editing the brief. No deterministic natural-language
  understanding guarantee is claimed by these structural controls.
- **UXR-006**: Reuse `RequirementSummary`, `ClarificationPanel` and
  `RequirementComposer` through bounded recovery props/composition. Before UI
  edits, record the required search of current approved registries, recipes,
  Workbench assets, generated templates and pinned source studies in that order.
  This proposal selects existing Workbench assets; it authorizes no new registry
  entry, copied source, visual redesign, asset, package or template.

## Effects and consequences

- **POS-001**: An already valid refusal stops unnecessary repair attempts and
  gives the user their actual earlier decisions to revise without retyping or
  losing independent material needs.
- **POS-002**: Fail-closed scope handling remains explicit. The API exposes only
  a bounded code, while the UI derives context from its already validated state.
- **NEG-001**: Recovery still needs a deliberate user revision and may end in
  another refusal. This is not a claim of fewer user iterations or completed app
  coverage. The new code does not identify newly introduced material questions.
- **NEG-002**: Two error versions and an explicit in-memory revision transition
  add bounded complexity. Old tabs retain the generic message until refreshed.
- **SEC-001**: Browser and provider data remain untrusted. Revalidate the carried
  request and result; prior context grants no authorization or lifecycle power.
  Retain no raw prompts/responses or credentials in persistence, diagnostics,
  screenshots or reports. Synthetic UI fixtures only may appear in evidence.
  Identity/tenant/security controls and `docs/threat-model.md` remain unchanged.
- **OPS-001**: No database, queue, provider, Compose, compiler, catalogue,
  capability, license, supply-chain, generated-output or production boundary
  changes. No provider experiment is authorized. Operational evidence records
  only outcome codes, request counts, timings and synthetic UI assertions.

## Alternatives considered

- **ALT-001**: **Keep** the generic three-attempt refusal. Rejected because it
  treats a valid business outcome as a format repair and hides retained context.
- **ALT-002**: Add the new code to V1. Rejected because its closed enum is a
  stable contract; old strict readers cannot accept the supposed extension.
- **ALT-003**: Return remaining questions as success, extend the two-cycle loop,
  or auto-accept canonical scope. Rejected because these evade exhaustion or
  discard material requirements. Returning new provider-derived error details
  would also widen the response/data boundary beyond this recovery.
- **ALT-004**: Keep only a friendly message plus the existing Create action.
  Rejected because the next submission silently drops earlier answers. A new
  capability or broad requirement-negotiation system is a separate decision.

## Implementation, verification and rollback

- **IMP-001**: PM assigns one serialized contract owner across
  `packages/adapters/src/requirements/{requirement-interpreter,openai-interpreter}.ts`,
  `apps/workbench/lib/product-journey/{interpret-contract,interpret-payload,journey-model,use-product-journey}.ts`,
  `apps/workbench/components/{workbench,workbench-home}.tsx`, and the existing
  `components/journey` composer/clarification components. Matching existing
  tests and new `e2e/unresolved-requirement-follow-up.spec.ts` are included.
  ADR-0079 is excluded; overlapping implementation must be serialized. Any
  shared-contract change returns to PM before writers proceed.
- **VER-001**: Begin with failing focused tests. Adapter cases cover Expense,
  Restaurant, Purchase, Task and Inventory valid unresolved follow-ups, exact
  typed code and first-valid-candidate stop; independent questions and original
  prior input remain intact. Preserve initial questions, supported-scope success,
  invalid/unknown selections, prior parameter drift, timeout/abort and generated
  branch repair cases. Historical refusal tests change only their expected code
  and call count for DEC-001, never to successful unsupported approximation.
- **VER-002**: Contract/route tests prove the exact V2 body and 422, every old V1
  pair, mixed-version rejection, extra-key/status rejection, and exclusion of
  provider text. Reducer/hook/UI tests prove failed-state snapshot visibility,
  cumulative answer carry-forward, independently retained material needs,
  empty-answer nonacceptance, unchanged-submit prevention, invalid-input bounds,
  one explicit revision request, two-cycle bound, stale-response/busy guards,
  repeat refusal and zero downstream mutation on failure. Include a two-question
  case accepting only one difference; the other remains required and refused.
- **VER-003**: Run
  `pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts`,
  `pnpm --filter @factory/workbench test -- interpret-contract.test.ts route.test.ts journey-model.test.ts use-product-journey.test.tsx workbench-home.test.tsx requirement-composer.test.tsx clarification-panel.test.tsx`,
  both package typechecks/builds, and `pnpm regression definitions`. Use existing
  package scripts and Node 22; do not regenerate historical baselines. Add the
  matching recovery component cases to the named suites if a suite is absent.
- **VER-004**: Against a root-authorized local Workbench, run
  `pnpm exec playwright test e2e/unresolved-requirement-follow-up.spec.ts`.
  Exercise the real Home, hook and parser with explicitly authored bounded route
  fixtures; record that this is provider-free UI evidence. At desktop 1440x900
  and mobile 390x844, verify visible earlier questions/answers and material
  needs, editable controls, keyboard focus, one clearly named revision action,
  no overflow and no lifecycle action after refusal. Revise only one answer,
  assert the complete carried request without printing it, refuse while another
  need remains, then explicitly accept that difference and reach existing
  planning behavior. Count actual clicks, questions, requests and elapsed time;
  do not infer automatic delivery or model quality from this fixture.
- **IMP-002**: Root owns evidence and acceptance in
  `docs/acceptance/evidence/unresolved-requirement-follow-up/` and
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
  Record red/green tests, exact source hashes, independent task review, QA/UI
  judgment and final scoped release judgment. Compare authored first-valid
  refusal calls 3 -> 1; report user-iteration measurements separately without
  an unearned improvement claim. This document contains a plan, no executed
  implementation or acceptance evidence.
- **ROL-001**: Roll back adapter and Workbench changes together to the prior
  code-only V1 generic refusal and existing UI. No data migration or irreversible
  step exists; immutable history and catalogue baselines remain untouched.
- **ABT-001**: Stop for context loss, newly returned provider content, altered
  generated-branch behavior, weakened validation, accepted unsupported scope,
  automatic retries/counter resets, historical output drift, new persistence,
  dependencies or security/Graph/lifecycle changes. Return any need for richer
  unresolved-result details or broader acceptance semantics to Tech Lead/PM.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`.
- **REF-002**: `docs/adr/adr-0065-product-definition-data-and-validation.md`,
  REG-006; active consumer delivery ledger, 2026-09-24 follow-up discrepancy.
- **REF-003**: `packages/adapters/test/requirement-interpreter.test.ts` and
  `apps/workbench/lib/product-journey/interpret-contract.ts` establish the
  historical refusal and strict V1 reader addressed here.
