# Appointment Booking v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Deliver the eighth locally accepted product, Appointment Booking v1,
with a reusable server-authoritative slot capability and a complete customer /
staff / administrator journey.

**Architecture:** Keep the existing `factory.application-graph/v1` lifecycle and
the accepted `core.scheduling@1.0.0` asset unchanged. Add one versioned
`scheduling.appointment@1.0.0` capability whose generated API owns atomic slot
claim, release, and move operations; compose it from a reviewed definition rather
than adding a product-name branch. Reuse existing Graph flows, persistence,
audit/receipt, generated controls, icons, responsive tokens, and owned acceptance
runner.

**Tech Stack:** TypeScript, Zod Graph validation, capability manifests/templates,
generated NestJS/Prisma runtime, React/Next generated UI, PostgreSQL 16,
Vitest, Playwright, Docker Compose, pnpm 9.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation; compilers consume only the exact Published Graph and composition lock.
- Existing seven definitions and frozen historical generated outputs remain byte-identical.
- Keep `core.scheduling@1.0.0` unchanged; the new capability is versioned and digest-locked.
- Do not add a calendar dependency, identity provider, payment provider, notification provider, or cloud deployment.
- Server owns slot capacity, interval validation, timezone validation, and all booking mutations; the browser submits no availability result.
- Use English in code, tests, generated UI text, and documentation; never persist raw prompts, provider responses, credentials, or secrets.
- Reuse approved UI registry/recipes and existing icons/tokens before adding an asset; a new asset needs provenance and a focused gap test.
- New stable Graph/API/capability/security contracts stop for the proposed ADR and its required founder/standing-review acceptance.
- Count Appointment as locally accepted only after the complete actual PostgreSQL/API/browser journey and one independent ordinary review pass with P0/P1/P2 `0/0/0`.

---

### Task 0: Accept the appointment capability boundary

**Files:**
- Create: `docs/adr/adr-0071-atomic-appointment-booking.md`
- Modify: `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
- Test: `docs/adr/adr-0071-atomic-appointment-booking.md` review checklist

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-09-18-appointment-booking-v1-design.md`, `docs/tech-governance.md`, `docs/threat-model.md`.
- Produces: an accepted or rejected decision for `scheduling.appointment@1.0.0`, its effect name, bindings, transaction boundary, and rollback rule.

- [ ] **Step 1: Write the proposed ADR before code.** Record `keep`,
  `experiment`, `migrate`, or `reject`; name the exact capability key/version,
  effect operations, supported bindings, generated output slots, authorization
  boundary, PostgreSQL transaction behavior, digest/provenance rules, and
  compatibility test obligations. State that the existing seven products are
  unchanged and that no Graph schema change is allowed without a separate ADR.
- [ ] **Step 2: Run the governance checks.** Read the Tech Governance and Threat
  Model authorities, have the dispatched Tech Lead issue a read-only verdict,
  and record the exact verdict and evidence in the PM ledger. If the decision is
  rejected or materially ambiguous, stop Appointment implementation and execute
  Task 8 instead.
- [ ] **Step 3: Verify the accepted decision.** Confirm the ADR has no unresolved
  P0/P1 finding, no hidden dependency/version change, and a reversible rollback.
  Do not modify runtime or catalogue files until this step is green.

Run: `rg -n "status|Decision|scheduling.appointment|P0|P1|rollback" docs/adr/adr-0071-atomic-appointment-booking.md docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`

### Task 1: Freeze the appointment definition contract with RED tests

**Files:**
- Create: `packages/adapters/test/appointment-definition-admission.test.ts`
- Modify: `packages/adapters/test/product-definition-data.test.ts`
- Modify: `packages/adapters/test/requirement-interpreter.test.ts`
- Modify: `scripts/verify-product-definition-data.mjs`
- Test: `packages/adapters/test/appointment-definition-admission.test.ts`

**Interfaces:**
- Consumes: the reviewed Appointment definition shape in the design spec and
  the accepted definition loader/interpreter APIs.
- Produces: a frozen definition key, canonical fields/roles/workflow/pages,
  material clarification boundaries, deterministic composition selection, and a
  failing admission test before catalogue registration.

The generic Product Blueprint keeps one unique `cancel` transition
(`requested -> cancelled`, `customer`) because `factory.product-blueprint/v1`
allows one actor per transition key. Customer/staff/administrator cancellation
authorization across active states is asserted separately as part of the
Appointment capability command contract; do not introduce duplicate Graph
transition keys or a Graph schema migration for this slice.

- [ ] **Step 1: Add the missing-registration RED fixture.** Assert that
  `appointment-booking-v1` is invalid for admission until it is registered;
  assert the canonical fields `service`, `schedule`, and `appointment`, the
  positive capacity rule, UTC datetime plus IANA timezone fields, cancellation
  reason, and requested/confirmed/cancelled workflow.
- [ ] **Step 2: Add adversarial RED cases.** Reject arbitrary client start/end
  values, free-form timezone text that is not a supported IANA zone, zero or
  negative capacity, an end instant not after start, a closed schedule,
  unsupported recurring/external-calendar/payment requirements, and provider
  attempts to add an unreviewed entity, route, capability, or role grant.
- [ ] **Step 3: Run the focused RED suite.** Verify the new row is the only
  missing-registration failure and that the existing seven catalogue values and
  historical snapshots are still loaded from independent constants.

Run: `pnpm --filter @factory/adapters exec vitest run test/appointment-definition-admission.test.ts test/product-definition-data.test.ts test/requirement-interpreter.test.ts`
Expected: the new registration assertion fails while the unchanged existing tests pass.

### Task 2: Add the versioned atomic appointment capability

**Files:**
- Create: `packages/capabilities/assets/scheduling.appointment/1.0.0/component.json`
- Create: `packages/capabilities/assets/scheduling.appointment/1.0.0/adapter.json`
- Create: `packages/capabilities/assets/scheduling.appointment/1.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/scheduling.appointment/1.0.0/tests/contract.json`
- Create: `packages/capabilities/assets/scheduling.appointment/1.0.0/templates/api/capability-module.ts.tpl`
- Modify: `packages/capabilities/src/assets/index.ts`
- Create: `packages/capabilities/test/appointment-scheduling.test.ts`
- Modify: `packages/capabilities/src/composition.ts`
- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Test: `packages/capabilities/test/appointment-scheduling.test.ts`

**Interfaces:**
- Consumes: the accepted ADR and the existing `CapabilityRuntimeModule`,
  `RecordStore.inTransaction`, `StoredRecord`, and capability template-lock
  contracts.
- Produces: typed `appointment.booking` operations for `claim`, `release`, and
  `move`, with declared entity/field bindings and verified package digests.

- [ ] **Step 1: Write the capability RED tests.** Assert the exact manifest key,
  version, effect, input binding names, output slots, template target, fixture,
  and contract checks. Assert missing owners, wrong field types, missing timezone,
  capacity, or status bindings fail closed.
- [ ] **Step 2: Implement the manifest, Graph eligibility, and template.** The
  generated module must expose only declared effects, validate the bound fields
  from the immutable Published Graph, and call one transaction for each
  claim/release/move. It must reject forged availability fields and append one
  capability event inside the same transaction as the receipt and record
  mutation. Use canonical UTC ISO strings and validate timezone names with the
  platform runtime; do not add a package.
- [ ] **Step 3: Add the contract fixture.** Cover a capacity-one claim, a full
  schedule denial with unchanged records, cancellation release, same-record
  move, stale version, duplicate idempotency key, invalid interval/timezone,
  and a failed transaction with no capability receipt.
- [ ] **Step 4: Run capability tests and package build.** Confirm all existing
  capability registry and digest tests pass; do not update old manifest digests.

Run: `pnpm --filter @factory/capabilities exec vitest run test/appointment-scheduling.test.ts test/capability-registry.test.ts && pnpm --filter @factory/capabilities build`

### Task 3: Integrate generated runtime mutation and history safely

**Files:**
- Create: `packages/compiler/src/appointment-mutation-contract.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/page-runtime-projection.ts`
- Create: `packages/compiler/test/appointment-booking-runtime.test.ts`
- Modify: `packages/compiler/test/definition-data-compatibility.test.ts`
- Test: `packages/compiler/test/appointment-booking-runtime.test.ts`

**Interfaces:**
- Consumes: the immutable capability lock, the appointment definition profile,
  generated `RecordStore`/Prisma transaction methods, and generic Graph flow
  transitions.
- Produces: server-only request/confirm/reschedule/cancel commands, persisted
  appointment history, safe receipts/replay behavior, and a generated runtime
  that does not expose availability or capacity writes to the browser.

- [ ] **Step 1: Write runtime RED tests.** Cover requested creation, staff
  confirmation, capacity-one second claim denial, same-record reschedule with
  old-slot release/new-slot claim, cancellation reason persistence, repeat
  command replay, stale version, forbidden role/state, invalid interval/timezone,
  and forged slot/capacity fields. Assert every failed operation leaves records,
  history, capability events, and versions unchanged.
- [ ] **Step 2: Implement the private mutation module.** Keep appointment logic
  behind a capability/profile interface keyed by the composition lock, not by a
  product name. Perform claim/release/move inside `store.inTransaction`, use
  conditional version checks, and derive slot occupancy from persisted records.
  Return safe domain errors with stable codes and no raw database/provider text.
- [ ] **Step 3: Integrate generic flow dispatch.** Add the smallest profile
  selection/projection hooks needed for appointment transitions. Preserve all
  existing generated output strings and ordering for the seven accepted
  definitions; add exact output assertions for the new profile only.
- [ ] **Step 4: Run the focused compiler suite and compatibility tests.** Verify
  generated API types compile, immutable Published input is required, and the
  old six-definition fixture remains byte-identical.

Run: `pnpm --filter @factory/compiler exec vitest run test/appointment-booking-runtime.test.ts test/definition-data-compatibility.test.ts && pnpm --filter @factory/compiler build`

### Task 4: Register the definition and compose appointment screens

**Files:**
- Modify: `packages/adapters/src/requirements/definitions/product-definitions.v1.json`
- Modify: `packages/adapters/test/appointment-definition-admission.test.ts`
- Modify: `packages/adapters/test/product-definition-data.test.ts`
- Modify: `packages/adapters/test/requirement-interpreter.test.ts`
- Modify: `scripts/verify-product-definition-data.mjs`
- Modify: `packages/compiler/src/appointment-presentation-components.ts` (create only if registry/recipe search proves a distinct gap)
- Modify: `packages/compiler/src/index.ts`
- Test: `packages/adapters/test/appointment-definition-admission.test.ts`

**Interfaces:**
- Consumes: Tasks 0–3's capability lock, Graph profile, and existing UI registry
  assets.
- Produces: one append-only reviewed catalogue row and customer/staff/admin
  pages with visible service, local time, timezone, status, next action, and
  history.

- [ ] **Step 1: Prove reuse before adding UI source.** Search the approved UI
  registry, screen/experience recipes, generated templates, and existing Workbench
  assets. Record the reused keys and any distinct schedule-picker gap in the
  authoring guide. Do not copy an external calendar library.
- [ ] **Step 2: Register the row append-only.** Keep all seven prior entries and
  their order/bytes unchanged. Declare services, schedules, appointments, roles,
  permissions, routes, transitions, seeds, unsupported boundaries, capability
  lock, and visible summaries exactly as the design requires.
- [ ] **Step 3: Implement only the missing presentation composition.** Render
  open slots and appointment summaries from Graph bindings. Keep derived
  availability read-only, preserve icons and 44px controls, show timezone labels,
  and provide explicit empty/loading/conflict/error/retry states. No family-wide
  generic CSS relaxation is allowed.
- [ ] **Step 4: Run admission and deterministic composition checks.** Confirm
  valid/distinct/admitted counts move from 7 to 8, the new row composes twice with
  identical hashes, and old six values plus all protected outputs are unchanged.

Run: `pnpm --filter @factory/adapters exec vitest run test/appointment-definition-admission.test.ts test/product-definition-data.test.ts test/requirement-interpreter.test.ts && node scripts/verify-product-definition-data.mjs`

### Task 5: Add the provider-free complete-workspace regression

**Files:**
- Create: `e2e/appointment-booking.spec.ts`
- Modify: `e2e/helpers/approval-definition-batch.ts` only for shared bindings if required
- Create: `packages/compiler/test/appointment-presentation.test.ts`
- Create: `docs/acceptance/evidence/appointment-booking/README.md`
- Test: `packages/compiler/test/appointment-presentation.test.ts`

**Interfaces:**
- Consumes: the emitted appointment bundle and the existing browser helper
  conventions; it must not start Docker or call a model provider.
- Produces: cheap RED/GREEN evidence for three records, long service text,
  cancelled history, closed history, role-dependent chrome, timezone labels,
  390/768/1440 layout, dark mode, media fallback, error/retry and no overflow.

- [ ] **Step 1: Write the browser RED test.** Render the full generated
  application with two open slots, one confirmed booking, and one cancelled
  record. Assert the first useful action, three visible identity summaries,
  timezone text, 44px controls, no overlap/overflow, and cancelled reason.
- [ ] **Step 2: Make the smallest shared/profile presentation fix.** Preserve
  labels and values; do not relax viewport thresholds or hide records. Add a
  profile-specific layout only when existing recipes cannot express the job.
- [ ] **Step 3: Run the provider-free regression.** Record RED root cause and
  final GREEN counts before any image build; regenerate a manifest to prove old
  outputs are unchanged.

Run: `pnpm --filter @factory/compiler exec vitest run test/appointment-presentation.test.ts`

### Task 6: Execute the actual local product journey

**Files:**
- Modify: `e2e/appointment-booking.spec.ts`
- Create: `docs/acceptance/appointment-booking.md`
- Create: `docs/acceptance/evidence/appointment-booking/delivery-journey.json`
- Create: `docs/acceptance/evidence/appointment-booking/correction-journey.json`
- Create: `docs/acceptance/evidence/appointment-booking/source-identity.json`
- Create: `docs/acceptance/evidence/appointment-booking/runtime-cleanup.json`
- Create: `docs/acceptance/evidence/appointment-booking/*.png`

**Interfaces:**
- Consumes: the reviewed definition, immutable compilation, current Factory
  Compose stack, and the provider-free test results.
- Produces: one complete actual local evidence set and a truthful accepted or
  rejected product outcome.

- [ ] **Step 1: Drive the lifecycle.** Run Describe -> Publish -> immutable
  Compilation -> verification -> Preview with one authored selection and no raw
  prompt/provider material in logs or evidence. Assert source/lock identity.
- [ ] **Step 2: Run the business journey.** Customer requests an open slot;
  staff confirms; a second customer receives a capacity conflict; staff moves
  the original booking to another timezone-labelled slot; customer cancels with
  a reason; reload and retry preserve the result. Capture exact versions,
  history, events, receipt/replay, denial and recovery facts.
- [ ] **Step 3: Run the visual batch.** Capture 390/768/1440, dark, form, list,
  history, closed-slot/error, retry, and media-failure states. Inspect the phone
  and desktop screenshots for task hierarchy, useful imagery/icons, visible
  timezone, no duplicate heading/banner overhead, and reachable actions.
- [ ] **Step 4: Clean owned resources.** Stop the exact preview, remove only the
  owned Factory Compose resources, and assert zero containers/networks/volumes/
  artifact directories for every project created by this attempt.
- [ ] **Step 5: Retain failures.** If the run fails, archive the exact safe
  receipt and screenshot under a numbered attempt directory, fix the smallest
  reproducible cause, and rerun only within the accepted local repair cap.

Run: `$env:FACTORY_E2E_ISOLATED='1'; $env:FACTORY_E2E_FACTORY_PROJECT='factory-t10-appointment-20260918'; $env:FACTORY_E2E_BASE_URL='http://127.0.0.1:15180'; $env:FACTORY_E2E_CONTROL_PLANE_URL='http://127.0.0.1:13020'; pnpm exec playwright test e2e/appointment-booking.spec.ts --workers=1`

### Task 7: Review, reconcile, and deliver the accepted slice

**Files:**
- Modify: `docs/acceptance/appointment-booking.md`
- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/product-definition-authoring.md`
- Modify: `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
- Modify: `docs/superpowers/plans/2026-09-13-product-definition-scale.md`
- Test: focused checks from Tasks 1–6 and the independent review report

**Interfaces:**
- Consumes: all implementation and actual evidence, ADR verdict, source
  identity, cleanup receipt, and one independent ordinary review.
- Produces: reconciled registered/local/family counts, honest limits, next
  small goal, a normal commit, pushed branch, remote equality, and clean tree.

- [ ] **Step 1: Request one proportionate ordinary review.** Ask for P0/P1/P2
  findings over the definition, reusable capability, actual journey, UI batch,
  compatibility evidence, and this plan. Reuse the accepted shared QA/release
  evidence; do not repeat a full shared audit unless a contract changed.
- [ ] **Step 2: Reconcile status.** Count Appointment as locally accepted only
  if the actual receipt and reviewer are green; otherwise keep seven accepted
  products and record the precise gap. Update the roadmap to the next family
  goal and keep real-model/user/cloud limits visible.
- [ ] **Step 3: Run final scoped verification.** Execute `git diff --check`,
  affected package checks, protected compatibility tests, source identity and
  cleanup assertions. Do not claim cache/refactor/retrieval work that remains
  planned.
- [ ] **Step 4: Commit and push.** Create one bounded English commit, push
  `codex/consumer-delivery-roadmap`, verify `git rev-parse HEAD` equals the
  remote branch tip, and require a clean consumer worktree.

### Task 8: Fallback short admission lane if the Appointment contract is rejected

**Files:**
- Modify: `scripts/regression.mjs`
- Create: `scripts/definition-admission-lane.mjs`
- Create: `scripts/definition-admission-lane.test.mjs`
- Modify: `docs/product-definition-authoring.md`
- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: the current reviewed seven-row catalogue and fixed checked-in case
  bindings.
- Produces: a provider-free, non-authoritative current index that validates
  definition registration, case coverage, control types, read-only outputs,
  summary placement, stable invalid-input meaning, and complete-workspace density
  before expensive image construction.

- [ ] **Step 1: Write RED lane tests.** A missing case, duplicate binding, stale
  CLI key, unsupported semantic row, editable calculated output, or isolated-card
  density check fails with a concise safe message.
- [ ] **Step 2: Implement the lane.** Derive the current index from the reviewed
  catalogue and fixed case bindings; never let it register, promote acceptance,
  or execute arbitrary commands. Keep historical snapshots as independent
  constants and retain existing direct commands.
- [ ] **Step 3: Measure three warm provider-free runs.** Record stage timings and
  verify the proposed two-minute target; do not claim cache savings before a
  measured cold/warm comparison.
- [ ] **Step 4: Review and deliver the lane.** Use one focused review and update
  the optimization plan with the result; keep the seven-product acceptance
  count unchanged.

## Verification matrix

| Boundary | Required evidence | Failure response |
| --- | --- | --- |
| Graph/lifecycle | immutable Published hash and lock; old snapshots unchanged | stop and return to Task 0 |
| Capability package | digest, typed bindings, contract fixture, rollback | reject capability; do not register definition |
| Runtime | actual transaction conflict/release/move, idempotency, denial | keep product pending and retain receipt |
| Definition | append-only row, deterministic composition, exact unsupported scope | fix data only; no runtime shortcut |
| UI | complete multi-record workspace at 390/768/1440, dark/error/fallback | repair shared/profile presentation before Factory |
| Actual delivery | local DB/API/browser, cleanup, source identity, timing | retain attempt and rerun bounded fix |
| Product maturity | ordinary-user evidence and real-model/identity/cloud claims separated | record the missing evidence; do not inflate maturity |

## Rollback

Before product acceptance, remove only the unaccepted Appointment definition,
capability lock, generated template, and its bounded test/evidence artifacts.
Never rewrite old Graphs, generated manifests, acceptance evidence, or remote
history. If the capability contract is rejected, leave the seven accepted
products untouched and execute Task 8. If the actual journey fails, retain the
failure and keep the product registered-only until the evidence passes.
