# Customer Requests Implementation Plan

> Use subagent-driven development for bounded tasks. Root records exact ownership
> in the active consumer ledger before each handoff. Shared integration stays
> serial; unchanged evidence is reused instead of restarting reviews.

**Goal:** A customer on mobile and staff on desktop complete one persisted request,
including replies, correction, resolution, reopen and cancellation.

**Architecture:** Implement accepted `customer-requests/v1` through exact Graph
witnesses, existing transaction/receipt and identity seams, shared UI assets and
definition data. Preserve immutable compilation and all historical outputs.

**Tech stack:** Existing accepted Node/TypeScript/React/Next/PostgreSQL profile;
no dependency, capability asset, lockfile, provider or topology change.

## Authority and global constraints

ADR-0084 is accepted at SHA-256
`8a78888dd9f1996588f475188b4645664c06bf9e1a49561112cdfa89c6f954c6`.
Separate reviewer `work_orders_integrated_review` returns
`APPROVED_FOR_STANDING_ACCEPTANCE: yes`, P0/P1/P2 0/0/0. The active ledger
records the exact standing founder acceptance before implementation. The ADR's
FAM/API/SEC/RDS/UXR/VER rules are the complete contract; this plan does not amend it.

- English code, UI, tests and documentation. Synthetic authored fixtures only.
- Same-role ownership must be enforced on the server before receipt replay.
- The fixed three-principal demo is not real authentication or private hosting.
- Reuse executable helpers and record new code paths; do not clone Work Orders.
- Keep twelve historical physical definition rows and their compiled output
  unchanged. No protected-baseline recapture to hide drift.
- Source checks do not establish actual PostgreSQL or product acceptance.
- No service/database/provider/cloud/cleanup operation is authorized here.
  Do not retry the rejected Workbench startup through another route.
- Controller owns commits/pushes after applicable review. Main/release gates stay
  open. One source task does not increase delivered product counts.

## Task 1: exact family admission and compilation profile

One serialized strongest-model contract owner. Create Graph
`src/customer-requests-blueprint-witness.ts` and
`src/customer-requests-graph-witness.ts`, matching focused tests and an authored
fixture; modify `src/product-blueprint.ts`, `src/model.ts`, `src/index.ts`.
Modify capabilities `src/product-composer.ts` and add
`test/customer-requests-composition.test.ts`. Create compiler
`src/customer-requests-contract.ts`, `test/customer-requests-contract.test.ts`
and minimal `src/index.ts` facade wiring; update the existing exact export test.
No runtime, presentation, worker, adapter or Workbench writes in this task.

**Interfaces:** `matchCustomerRequestsBlueprintV1` and
`matchCustomerRequestsGraphV1` are pure computed witnesses following the existing
typed matcher convention. `selectCustomerRequestsProfile(graph, compositionLock)`
returns the immutable `CustomerRequestsProfile` from ADR IMP-001 or rejects the
malformed family candidate. Only that selector and type are compiler root exports.
Freeze concrete signatures, fixture coordinates and final source identities for
the next owner; no caller-supplied witness becomes authority.

- [x] Capture current historical Published inputs, physical locks and emitted
      file digests before changing shared source.
- [x] RED a schema-parsed canonical fixture after JSON round trip; malformed
      owner/history/grants/roles/pages/numeric bounds/locks must reject. For example:

```ts
expect(
  matchCustomerRequestsGraphV1(JSON.parse(JSON.stringify(graph))),
).toBeDefined();
expect(matchCustomerRequestsGraphV1(overgrantedGraph)).toBeUndefined();
```

- [x] Add only the `reply` action vocabulary, exact two-entity witness and two
      witnessed seedless numeric coordinates. Prove old-family rejection of reply
      and preserve unrelated seed/numeric/action validation.
- [x] Implement strict profile selection with physical six-lock verification,
      detached immutable bindings and fail-closed malformed-candidate behavior.
- [x] Run the ADR VER-004 Graph/capability/contract tests, affected types/builds
      and compiler `test/index-exports.test.ts`; compare old emitted bytes without
      modifying expectations. Test renamed/swapped/max-length roles.
- [x] Obtain applicable shared-contract review/QA and record the frozen handoff.
      Controller delivers the accepted source checkpoint.

## Task 2: persisted conversation and isolation

Serialized compiler owner creates `src/customer-requests-runtime.ts`,
`test/customer-requests-runtime.test.ts`,
`test/customer-requests-compilation.test.ts`; owns narrow `src/index.ts` storage,
route and emitter integration. Any private helper extraction requires unchanged
historical bytes and explicit root ownership first.

**Consumes:** Task 1 profile and the ADR-exact commands/response schemas.
**Produces:** Generated request/history/receipt store and transport methods;
immutable roster/role mapping, mutation and bounded read interfaces frozen before
presentation or worker consumers start. No generic history write or owner update.

- [ ] RED emitted-runtime tests for two customers of the same role: A creates,
      B cannot list/read/reply/correct/replay A's record, staff replies, A reads it.
- [ ] Compose existing write protection and store transactions; add owner-aware
      CAS and atomic request/event/audit/receipt commits. Implement all six commands
      with exact bounds, linked corrections and authorization before replay.
- [ ] Implement serializable bounded reads, pagination and nextActor projection;
      reject corrupt event evidence and unknown query keys. Walk more than 50
      requests/events and prove owner filters apply before limits.
- [ ] Test emitted code for stale writes, same-key replay, changed-body conflict,
      terminal states, version exhaustion, fault rollback and historical replies.
      Memory witnesses remain source evidence only.
- [ ] Freeze generated store/route signatures; run focused tests/types/build and
      historical parity, then applicable contract review/QA and source delivery.

## Task 3: responsive customer/staff workspace and verification

Use the [workspace handoff](../../design/customer-requests-workspace.md) for
inspected reuse sources, role-specific composition and the single visual/state
acceptance batch. It maps the accepted contract without changing its scope.

After Task 2 freezes, presentation owner creates compiler
`src/customer-requests-presentation.ts` and its focused interaction test. Worker
owner creates `apps/compiler-worker/src/verifier/customer-requests-verification.ts`
and its tests. Root serially owns shared style/emitter/verifier routing. Parallel
writers require an enumerated disjoint handoff, otherwise run serially.

**Consumes:** Exact profile, roster, commands, read projection and error codes.
**Produces:** Customer list/form/conversation at 390px, staff triage/conversation
at 1440px, usable 768px; executable verification scenarios using the same IDs.

- [ ] Record ordered reuse search and compose workspace styles, icon assets,
      page projection, native controls and existing recovery patterns.
- [ ] RED role-appropriate actions and principal-switch late-response isolation.
      Keep an uncertain command's actor/body/version/key frozen; restore current
      authoritative state before consciously reapplying stale text.
- [ ] Implement attributed transcript, linked corrections, status/next actor,
      pagination and clear local-demo label. Avoid duplicate icon/text controls
      where the icon's accessible name suffices; retain meaningful visual hierarchy.
- [ ] Exercise emitted UI with loading/empty/error/denial/confirmation/recovery,
      keyboard/touch, long text and 390/768/1440 layouts using allowed isolated
      component harnesses. Do not substitute this for actual generated-app images.
- [ ] Add worker scenarios for the exact contract; run focused checks and ordinary
      presentation review, preserving full contract gates where applicable.

## Task 4: definition, consumer entry and actual delivery evidence

Adapter owner adds the canonical `customer-support-desk@1.0.0` through existing
definition admission/data tooling, family registry/matcher and focused tests.
Root serially assigns Workbench `consumer-family`/`use-consumer-generation`
integration, case binding/index/types, `e2e/customer-requests.spec.ts` and helpers.
Freeze the concrete data and test path manifest before assigning writers.

- [ ] RED canonical admission, semantic deduplication and retained unsupported
      requirements. Connect exact witness admission to existing automatic immutable
      delivery; a name or provider match is never sufficient.
- [ ] Author the complete ADR VER-005 consumer journey and pure ownership/evidence
      helpers. Discovery/types/helpers run without starting the actual application.
- [ ] Run existing definition regression and affected consumer/worker checks;
      retain immutable source identities and focused review evidence.
- [ ] Once the blocked execution boundary is independently cleared, root runs the
      actual Home-to-application journey, PostgreSQL races/rollback/restart and
      cross-role responsive visual checks with exact resource ownership. Record
      failures, time to first useful action and technical handoffs; never mark a
      skipped case passed.
- [ ] Evaluate 3-5 domain briefs only after canonical acceptance. Each admission
      requires zero runtime/UI diff and meaningful semantic distinction. Report
      label duplicates and unsupported rules instead of inflating product counts.

## Continuous delivery and acceptance scorecard

This family consumes the existing continuous-delivery roadmap; it does not pick
a cloud provider. Track registered definition, source checks, actual local journey,
hosted URL, retained-data upgrade and verified recovery separately. Before a hosted
pilot, resolve its authorized environment, audience/access, data and operator,
then accept the adapter decision. Require stable HTTPS, immutable promotion,
failed-readiness retention, compatible rollback with post-update writes and a
separate restore witness. The Task rehearsal is not proof for this new data model.

Store accepted evidence under `docs/acceptance/evidence/customer-requests/` and
keep live state in the existing consumer ledger. No additional audit hierarchy.
