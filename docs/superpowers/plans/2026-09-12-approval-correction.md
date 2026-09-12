# Approval Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans. Steps use checkboxes for tracking. Controller owns Git actions after the complete slice is accepted.

**Goal:** Let an ordinary requester correct and resubmit the same Expense or Purchase record, understand a return reason, and safely recover an interrupted operation without duplicating or overwriting work.

**Architecture:** Execute accepted ADR-0060 against founder-approved UI baseline `92f21089beeb184a236a1512cb4c1866f158e903`. One serialized compiler/adapter owner implements the exact definition, mutation, storage and interaction contracts. Root owns disjoint actual acceptance fixtures, evidence and delivery documentation. Preserve old immutable compilation bytes using frozen pre-change inputs and hashes.

**Tech Stack:** Existing approved TypeScript, Graph V1, Next/React, generated NestJS API, Prisma/PostgreSQL and local Compose. No dependency, provider, topology or public Graph version change.

## Global constraints

- ADR-0060 SHA-256 `b47961bec46af1757087e3c067ff6c1e35556aae2b07e9de01e0dbc16f122107` freezes all API, entity, reason, idempotency, concurrency and storage semantics. ADR-0062 advances the correction workspace to `2.1.0`, preserving the founder-approved ADR-0061 legacy `2.0.0` output.
- Preserve Draft -> Publish -> immutable Compilation. Never rewrite a historical artifact or derive compilation from mutable Draft.
- Write code, tests, UI text, and documentation in English. Keep credentials local and never report raw model payloads or secrets.
- Approved color, media, icons, compact navigation and responsive hierarchy remain the visual baseline. Reuse existing form controls, history, finder, phase/scope guards and first-party transaction primitives.
- Selector support and private component integration must be frozen in the Tech Lead compatibility decision before production changes. No frontend/backend parallel writers across emitted contracts.
- Counts remain three definitions/two demonstrated runtime families. Local role identity and role-wide reads are not verified identity, tenant isolation or owner privacy.
- Apply one complete task review, independent QA and release review for this shared API/data slice. No per-button or per-screen approval gates. Root alone commits/pushes the accepted branch; main/release/cloud are outside this task.

## Task 1: Deliver the same-record correction and safe mutation slice

**Integration owner files:** ADR-0060 MIG-001 adapter/compiler source and focused test manifest, plus only the accepted compatibility addendum's private presentation/test support paths. The owner must read the full accepted ADR because its numbered clauses are the exact implementation requirements.

The recorded Tech Lead keep assessment also admits the same owner's existing
worker files `apps/compiler-worker/src/verifier/{verification-graph-plan,role-journey,probes}.ts`
and tests `apps/compiler-worker/test/{verification-graph-plan,verification-probes}.test.ts`
to consume the already accepted correction request/replay contract. No new ADR,
technology, public API, evidence schema or concurrent writer is introduced.
The traced final request adapter adds existing
`apps/compiler-worker/src/verifier/verification-environment.ts` and new
`apps/compiler-worker/test/verification-environment.test.ts` to that ownership,
admitting only the exact accepted values envelopes within every existing bound.

**Root files:** `apps/workbench/test/consumer-generation-fixture.ts`, `e2e/approval-presentation.ts`, `e2e/consumer-approval.spec.ts`, `e2e/consumer-purchase-request.spec.ts`, `packages/compiler/DESIGN.md`, `docs/acceptance/approval-correction.md`, this plan, active ledger/status and frozen test inputs when admitted by the addendum. Root and integration owner agree fixture ownership before source writes.

**Interfaces:** Canonical requester actions `create, read, update, submit`; states `draft, submitted, approved, returned`; `submit`, `approve`, `reject` (Return), `update` (Revise) transitions exactly as ADR-0060 DEF-001. Only the selected approval entity receives `version`, PATCH, receipts and `/decision-events`. Commands carry `x-factory-idempotency-key`; create uses `{ values }`, PATCH `{ expectedVersion, values }`, submit/approve `{ expectedVersion }`, Return `{ expectedVersion, reason }`. Successful mutations return the stored record. Every error and precedence follows API-001..007 verbatim.

- [x] Record founder UI acceptance and capture old Expense, Purchase and Booking immutable inputs and per-file SHA-256 values before any source change. Stage under `.superpowers/sdd/2026-09-12-approval-correction`; never regenerate expected hashes from new code.
- [x] Freeze the minimum compatibility addendum for corrected `returned` flows to retain the accepted media/progress without changing old bytes. ADR-0062 and independent standing acceptance are recorded in the ledger.
- [x] RED: add adapter cases for four states, four transitions, requester update, truthful correction guidance and unchanged material clarification boundaries. Add compiler selection positives with reordered IDs and negatives for extra/missing/duplicate states, transitions, grants, pages, locks and bindings. Run the focused tests and save the expected failure result.
- [x] GREEN: project the canonical definition through existing composer primitives. Select the correction shape structurally and atomically; keep old and nonmatching emission byte identical.
- [x] RED/GREEN: implement the private mutation contract and generated storage/API. Test strict bodies, typed partial field updates, required plain-text reasons, entity confinement, current authorization before receipt access, receipt replay, canonical hashes, version precedence and atomic writes. Reuse transactions and conditional updates; do not expose the generic store update method directly.
- [x] Exercise each of create, draft PATCH, returned PATCH, submit, approve and Return with lost response plus runtime reconstruction. Verify one committed record/version/event/effect/receipt, identical replay, different-payload conflict and rollback at each persistence boundary. Two distinct keys at one version must produce one success and one authoritative conflict.
- [x] Implement prefilled Edit/Save, required Return reason, record-scoped reasons/history and safe client activation state. Keep payload/key after uncertain failure, disable duplicate activation, and refresh on conflicts without automatic overwrite. Test delayed cross-role responses and editing a retained payload.
- [x] Run affected adapter/compiler tests, builds, typechecks and lint. Compare every frozen legacy generated-file hash. Inspect generated Prisma and initial SQL parity with selected entity boundaries.
- [x] Adapt the exact correction worker HTTP probe branch to the accepted command bodies, versions, header keys, PATCH and stored-success replay. Keep legacy and nonmatching probes exact; run worker graph-plan/probe regressions and affected package checks.
- [x] Root extends both actual immutable Expense/Purchase acceptance lanes: create incorrect draft -> edit -> submit -> deny submitted edit -> Return -> reload requester -> revise same ID -> reload -> resubmit -> approve -> reload history. Include actual HTTP lost-response and stale-write cases, exact versions/decision counts, untouched Published/Compilation identity and cleanup.
- [x] At 390, 768 and 1440 capture and inspect edit, return reason, returned record/history, pending, retry and conflict. Assert preserved decoded materials/colors/icons, no overflow, keyboard operability, 44 px controls and zero axe violations. Preserve valid unchanged baseline evidence.
- [x] Freeze final source, run the required single task review and independent QA/release review, repair concrete findings, and record final evidence and residual limitations.
- [x] Root accepts the verified slice with no open findings and exact local resource cleanup.

Controller delivery: create the bounded commit, push the isolated branch, verify
remote tip equality, and then complete the long goal. The final task result and
Git history record these delivery outcomes; implementation checkboxes do not
substitute for the actual Git and goal-tool results.

### Reproducible commands and evidence

Run from the `consumer-delivery` worktree:

```powershell
pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts
pnpm --filter @factory/compiler test -- approval-correction-runtime.test.ts composition-page-runtime.test.ts compilation-plan.test.ts database-target-parity.test.ts
pnpm --filter @factory/adapters build
pnpm --filter @factory/compiler build
pnpm --filter @factory/adapters typecheck
pnpm --filter @factory/compiler typecheck
pnpm --filter @factory/adapters lint
pnpm --filter @factory/compiler lint
pnpm exec playwright test e2e/consumer-approval.spec.ts e2e/consumer-purchase-request.spec.ts --workers=1 --retries=0
```

The actual lane requires a separately recorded exact local Compose project and final-source image digests; local environment contents never enter evidence. Root records commands, results, actual source hashes, screenshots and exact resource cleanup in `docs/acceptance/approval-correction.md`. Runtime acceptance cannot substitute fixture-only test success.

## Product tracking after this milestone

Track successful first generated application, time to first useful action, complete business journey, user recovery effort and reuse of proven components. This milestone removes duplicate request creation and uncertain-write recovery effort. The next bounded product expansion is Task completion/reopen integration from the accepted roadmap, followed by validated Appointment, Inventory and Content slices. Admit each family only after its real business invariants and presentation pass; raw template counts are not delivered product capability.
