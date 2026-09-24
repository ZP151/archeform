# Event Registration Implementation Plan

> **For agentic workers:** Use subagent-driven-development for bounded tasks.
> Root assigns paths in the active ledger before each handoff. Shared contracts
> and integration remain serialized; reuse unchanged evidence between tasks.

**Goal:** Ordinary users obtain a responsive event application where attendees
reserve or cancel places and organizers manage capacity, attendance and event
cancellation, with retained history and useful recovery.

**Architecture:** Compose one reusable `event-registration/v1` family from exact
Blueprint/Graph witnesses, existing capability locks, transactional stores,
generated UI assets and the automatic consumer lifecycle. Domain definitions
use data bindings instead of separate runtime or UI implementations.

**Tech Stack:** Retain the accepted Node 22, pnpm 9, TypeScript, Next/React and
PostgreSQL profile. No dependency, provider, capability asset or topology change.

## Authority and global constraints

ADR-0086 is accepted through the standing founder authorization at SHA-256
`64fcfd08b629355662ba8ff733bbe46874a9a595fbeb2695d12eed3d377dbdbd`.
Independent reviewer `customer_requests_verifier_judgment` returns
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1/P2 0/0/0. Root records exact
acceptance and Task 1 ownership in the active ledger before implementation.
ADR FAM/BUS/SEC/API/TXN/RDS/UXR/VER requirements apply to every task.

- Keep Draft -> Publish -> immutable Compilation and physical lock validation.
- English code, authored fixture data, tests, documentation and UI copy.
- One place per attendee per event; free local synthetic demo. Unsupported paid
  tickets, notifications, real private accounts and group policies remain visible
  requirements rather than silently disappearing during generation.
- Whole-event cancellation is included. Retain historical attendance and show
  the cancellation reason; never present a cancelled event as usable admission.
- Frozen identity slots are organizer, attendee A and attendee B, independent of
  role labels. Same-role ownership is enforced before reads and receipt replay.
- New business verbs are only `check-in` and `undo-check-in`, structurally gated.
- Reuse existing transactions, identity, write protection, styles and pinned
  Lucide assets. No wholesale runtime/UI clone or new dependency is authorized.
- Preserve thirteen pre-Event physical catalogue rows and immutable emitted
  bundles. Baseline `generated/.event-registration-task1/before.json`, captured
  at `3d9c101c`, has SHA-256
  `ea8273865f03f9dcb80779552badfb4b324d3021066a85e144fd5f6fce03664a`.
  Never overwrite it or earlier protected Customer Requests baselines.
- Startup, services, database, Docker, provider, cloud and cleanup remain outside
  the current execution boundary. Do not retry rejected startup by another route.
- Source tests, emitted component harnesses and discovered E2E cases do not
  establish actual product, PostgreSQL, hosted or ordinary-user acceptance.
- Root owns Git and evidence/ledger reconciliation. Shared-contract changes use
  required independent contract review/QA; ordinary UI fixes use one scoped review.

## Task 1: exact admission and frozen compiler profile

One strongest-model serialized owner. Create Graph
`src/event-registration-blueprint-witness.ts`,
`src/event-registration-graph-witness.ts`, their matching tests and
`test/fixtures/event-registration-blueprint.json`; modify only Graph
`src/product-blueprint.ts`, `src/model.ts`, `src/index.ts` for admission/export.
Modify capabilities `src/product-composer.ts`; create
`test/event-registration-composition.test.ts`. Create compiler
`src/event-registration-contract.ts`, `test/event-registration-contract.test.ts`
and `test/fixtures/event-registration.ts`; modify its `src/index.ts` public
profile facade and `test/index-exports.test.ts`. Runtime generation stays closed:
the existing `buildCompilationPlan`, `buildCompilationInput` and
`generateApplicationBundle` boundaries explicitly reject the newly admitted
family until Task 2 supplies its runtime. This narrow guard is within assigned
`src/index.ts` ownership, following the earlier Customer Requests Task 1 pattern.

**Consumes:** ADR FAM-001..008, REU-003 and IMP-002, existing physical manifests.
**Produces:** Pure `matchEventRegistrationBlueprintV1` and
`matchEventRegistrationGraphV1` witnesses plus
`selectEventRegistrationProfile(graph, compositionLock)` returning a detached,
immutable `EventRegistrationProfile`. Export only the selector and profile type
from the compiler facade. Fixture `eventRegistrationInput()` supplies immutable
Graph/lock pairs for subsequent tests; it must use real composition and locks.

- [x] RED the exact four business entities, two workflows, five pages, role
      grants, numeric bounds, unique indexes, physical locks and JSON persistence.
      Include both whole-event cancellation transitions and the two-role
      registration cancellation projection without general duplicate relaxation.

```ts
const input = eventRegistrationInput();
const profile = selectEventRegistrationProfile(
  input.graph,
  input.compositionLock,
);
expect(profile.key).toBe("event-registration");
expect(Object.isFrozen(profile)).toBe(true);
const malformed = structuredClone(input.graph);
malformed.entities.reverse();
expect(() =>
  selectEventRegistrationProfile(malformed, input.compositionLock),
).toThrow();
```

- [x] Run the new Graph/composition/contract suites before implementation; retain
      the failure. Add complete structural matching and fail-closed near-match
      detection; labels cannot admit an Event family.
- [x] Reject missing cancellation fields, widened ownership/grants, wrong index,
      extra effects, changed bindings/locks, seed data and old-family lookalikes.
      Exercise renamed/swapped/maximum-length roles and detached immutable output.
      Test all three public compilation boundaries against the real Event fixture:
      rejection must name the unavailable Event runtime, not depend on an unrelated
      numeric validation failure or emit a generic CRUD application.
- [x] Run affected package types/build and thirteen-row derivation plus immutable
      bundle parity. Freeze all profile fields and fixture coordinates for Task 2.
- [x] Applicable contract review/QA and root source acceptance. Controller delivery
      follows this checkpoint; the final handoff records the revision and CI.

The founder requested completion of this task, push and a wait for acceptance.
Tasks 2-5 remain unstarted; no next-task dispatch occurs before the user resumes.

Focused commands:

```text
pnpm --filter @factory/graph exec vitest run test/event-registration-blueprint-witness.test.ts test/event-registration-graph-witness.test.ts
pnpm --filter @factory/capabilities exec vitest run test/event-registration-composition.test.ts
pnpm --filter @factory/compiler exec vitest run test/event-registration-contract.test.ts test/index-exports.test.ts
```

## Task 2: persisted reservation, attendance and cancellation

Serialized compiler owner creates `src/event-registration-runtime.ts`,
`test/event-registration-runtime.test.ts`,
`test/event-registration-compilation.test.ts` and owns narrow store, route and
emitter integration in `src/index.ts`. Freeze generated store/transport signatures
before assigning presentation or worker writers. Root explicitly assigns any
helper extraction before edits; historical emitted bytes must remain equal.

**Consumes:** Task 1 profile and exact ADR API/TXN/RDS contracts.
**Produces:** Existing generated route integration with bounded reads and atomic
event/registration/history/audit/receipt commands, sharing one event-first lock.

- [ ] RED emitted-runtime operations: create/open event; A reserves final place;
      B fails full; A cancels; B reserves; organizer checks in, undoes with reason,
      checks in again; organizer cancels the whole event; B sees cancellation
      reason and retained attendance. A cannot inspect B's record or history.
- [ ] Implement the parent lock, metadata version distinct from seat counters,
      one lifetime row per event/principal, guarded counters and registration CAS.
      Reuse serializable transactions and bounded conflict retries. No generic
      write route may bypass history, scope or cancellation rules.
- [ ] Test exact retry after closing/cancellation/time changes, changed-body keys,
      owner/session changes, stale event/record versions, version exhaustion,
      invalid UTC/zone/offset input, no-op edits and time edits after any booking.
- [ ] Test rollback on history/audit/receipt failure, capacity reduction, concurrent
      final seats, cancellation/check-in ordering and retained counter invariants
      in the source harness. These tests do not substitute for PostgreSQL races.
- [ ] Implement limit/cursor/owner predicates before retrieval and cancellation
      projections on every read surface. Walk more than 50 records and histories.
- [ ] Focused runtime/compilation tests, types/build, historical parity, required
      review/QA and source delivery; publish the precise frozen handoff.

```text
pnpm --filter @factory/compiler exec vitest run test/event-registration-runtime.test.ts test/event-registration-compilation.test.ts test/event-registration-contract.test.ts
```

## Task 3: responsive business workspace and worker verification

Use `docs/design/event-registration-workspace.md` as the composition and visual
handoff within the accepted ADR. It reuses the approved system and adds no gate.

After Task 2 handoff, disjoint writers may own (a) compiler
`src/event-registration-presentation.ts` and its emitted-component test and (b)
worker `src/verifier/event-registration-verification.ts` and its focused test.
Root serially owns shared compiler styles/emitter routing and worker
`verification-graph-plan.ts`, `role-journey.ts`, `probes.ts`,
`verification-environment.ts`; freeze any required shared change before the wave.

**Consumes:** Frozen profile, generated read/mutation transport and fixed fixtures.
**Produces:** `event-registration-presentation@1.0.0` private composition plus an
exact family verifier scenario through existing probe/transport infrastructure.

- [ ] Record approved registry/recipe/template search and actual helper reuse.
      Reuse pinned icons, color tokens, mobile and desktop shell conventions.
- [ ] RED mobile discovery/detail/My places and desktop event/roster operations.
      Test every Task 2 action through emitted controls, focus and touch access.
- [ ] Implement warm event/date identity, clear primary actions, compact icon
      utilities, readable capacity and retained history. Include empty, loading,
      full, past, cancelled, denied, validation, failure, stale and uncertain states.
      Principal switching aborts reads and clears records/editors/pending commands.
- [ ] Preserve exact-command retry for uncertain writes; stale edits refresh and
      require an explicit new submission. Do not silently discard entered work.
- [ ] Inspect emitted workspace images at 390/768/1440, dark mode and long text.
      Verify actual CSS/icon geometry and intentionally missing-asset detection.
      Label intercepted harness images as source evidence, not actual app images.
- [ ] Verifier checks real typed effects, principal ownership, capacity and
      cancellation/history through existing bounded response and digest rules.
      If existing verifier contracts cannot express this, obtain a separate exact
      decision before broadening them; never weaken generic parsers.
- [ ] Run focused checks and reuse valid contract evidence. Deliver reviewed source
      with actual browser/DB/hosted outcomes still recorded separately.

## Task 4: canonical definition and automatic consumer entry

Assign adapter `src/requirements/definition-family-registry.ts`,
`definition-selection-catalogue.ts`, `definitions/product-definitions.v1.json`
and focused `test/event-registration-definition.test.ts`. Root serially integrates
capabilities `src/plan-alternatives.ts`, its tests, Workbench consumer-family and
automatic-generation tests, and existing definition case bindings/regression lane.
Do not change lifecycle hook implementation unless a failing test proves a gap.

**Consumes:** Accepted family contract, runtime/presentation and verifier handoff.
**Produces:** Canonical `community-event-registration@1.0.0` selected from a rough
brief, with material unsupported requirements retained and automatic immutable
delivery. This is one logical definition, not multiple names counted separately.

- [ ] RED rough event brief -> exact definition -> composition -> family selector.
      Paid tickets, group places, outbound notifications and private accounts
      produce useful material clarification or explicit unsupported outcomes.
- [ ] Add one canonical data row and exact family admission; preserve old rows.
      Exercise fresh business answers and zero technical lifecycle handoffs.
- [ ] Add Graph witness suites to the existing quick lane, preserving failure-stop
      tests, and bind the actual E2E case. Test all catalogue rows by real family.
- [ ] Focused adapter/planning/consumer tests, definition validation, case-index,
      types/build and real definitions lane. Existing accepted rows remain equal.
- [ ] Review applicable cross-package changes, source acceptance and delivery.

## Task 5: actual product, delivery and meaningful variants

Root owns `e2e/event-registration.spec.ts`,
`e2e/helpers/event-registration.ts`, its pure tests and acceptance evidence.
Author the case now; actual execution waits for a genuinely authorized boundary.
An environment flag or new launcher never overrides the startup rejection.

- [ ] Case starts from ordinary-user Home and the rough brief, reaches immutable
      application automatically, and measures readiness/first useful action,
      material questions, manual rescues and technical handoffs.
- [ ] Perform Task 2's complete journey on coordinated phone/desktop views of the
      same persisted records, including whole-event cancellation reason everywhere,
      historical check-in correction, unknown writes and stale recovery.
- [ ] Once execution is authorized, prove actual PostgreSQL final-seat and
      cancellation/check-in races, rollback atomicity, restart persistence and
      capacity equality against stored rows. Inspect real 390/768/1440 imagery.
- [ ] Keep deployment on the shared roadmap: one authorized hosted pilot, stable
      HTTPS, persistent storage, compatible upgrade, failed-readiness retention,
      rollback and separate backup restore. Do not use Preview cleanup on durable
      storage. No new provider or rollout is authorized by this family plan.
- [ ] After canonical actual acceptance, evaluate 3-5 distinct domain briefs.
      Admit supported jobs through data only, reject label duplicates, and queue
      unsupported semantics explicitly. Record source/local/hosted counts separately.

Acceptance follows the existing consumer product checklist. Prepared-local first
useful action within five minutes and zero technical handoffs are measured targets,
not an unverified SLA. Missing actual or hosted evidence leaves those outcomes open.
