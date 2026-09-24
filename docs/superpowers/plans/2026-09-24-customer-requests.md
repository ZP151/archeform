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

- [x] RED emitted-runtime tests for two customers of the same role: A creates,
      B cannot list/read/reply/correct/replay A's record, staff replies, A reads it.
- [x] Compose existing write protection and store transactions; add owner-aware
      CAS and atomic request/event/audit/receipt commits. Implement all six commands
      with exact bounds, linked corrections and authorization before replay.
- [x] Implement serializable bounded reads, pagination and nextActor projection;
      reject corrupt event evidence and unknown query keys. Walk more than 50
      requests/events and prove owner filters apply before limits.
- [x] Test emitted code for stale writes, same-key replay, changed-body conflict,
      terminal states, version exhaustion, fault rollback and historical replies.
      Memory witnesses remain source evidence only.
- [x] Freeze generated store/route signatures; run focused tests/types/build and
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

The executable verifier consumes accepted
[ADR-0085](../../adr/adr-0085-customer-requests-verifier-adaptation.md), exact
SHA-256 `bcf5e50e79dce5c80a270fda6dc2bf7ca0399211d63bfaf4ed3a059b37224464`.
Its private exact-profile journey handles the accepted nested request response
and command bodies without widening generic probes. The active ledger records
independent standing acceptance and the disjoint implementation assignment.

**Consumes:** Exact profile, roster, commands, read projection and error codes.
**Produces:** Customer list/form/conversation at 390px, staff triage/conversation
at 1440px, usable 768px; executable verification scenarios using the same IDs.

- [x] Record ordered reuse search and compose workspace styles, icon assets,
      page projection, native controls and existing recovery patterns.
- [x] RED role-appropriate actions and principal-switch late-response isolation.
      Keep an uncertain command's actor/body/version/key frozen; restore current
      authoritative state before consciously reapplying stale text.
- [x] Implement attributed transcript, linked corrections, status/next actor,
      pagination and clear local-demo label. Avoid duplicate icon/text controls
      where the icon's accessible name suffices; retain meaningful visual hierarchy.
- [x] Exercise emitted UI with loading/empty/error/denial/confirmation/recovery,
      keyboard/touch, long text and 390/768/1440 layouts using allowed isolated
      component harnesses. Do not substitute this for actual generated-app images.
- [x] Add worker scenarios for the exact contract; run focused checks and ordinary
      presentation review, preserving full contract gates where applicable.

## Task 4: definition, consumer entry and actual delivery evidence

Adapter owner adds the canonical `customer-support-desk@1.0.0` through existing
definition admission/data tooling, family registry/matcher and focused tests.
Root serially assigns Workbench `consumer-family`/`use-consumer-generation`
integration, case binding/index/types, `e2e/customer-requests.spec.ts` and helpers.
Freeze the concrete data and test path manifest before assigning writers.

### Source execution batches

The accepted runtime, UI and verifier contracts remain frozen. Task 4 changes
selection, exact admission and consumer routing only; it introduces no new API,
identity, runtime or presentation behavior.

1. **Definition owner:** `packages/adapters/src/requirements/definition-family-registry.ts`,
   `definition-selection-catalogue.ts`, `definitions/product-definitions.v1.json`;
   new `packages/adapters/test/customer-requests-definition.test.ts`; existing
   `product-definition-data.test.ts`, `requirement-interpreter.test.ts` and
   `service-work-orders-definition.test.ts` for additive catalogue expectations.
   The recorded ownership extension also includes additive catalogue totals in
   `inventory-operations-definition.test.ts`, `supplies-stockroom-definition.test.ts`
   and `appointment-consumer-definition.test.ts`; historical semantics stay fixed.
   Register `customer-support-desk@1.0.0`, family `customer-requests/v1`,
   `none/v1`, compiler `customer-requests@1.0.0` and presentation
   `customer-requests-presentation@1.0.0`. Use the accepted canonical fixture,
   exact Blueprint/Graph witnesses and six physical capability locks. Primary
   job is staff `complete` on the request, reaching `resolved`; customer creation,
   follow-up, correction and reopen remain required journeys. Preserve all twelve
   prior rows and semantics; reject label-only duplicates, malformed ownership
   and materially unsupported private accounts, uploads, notifications, external
   intake, assignment, internal notes and SLA requirements. No runtime/UI copies.
2. **Root serialized consumer integration:** `packages/capabilities/src/plan-alternatives.ts`
   and its test; `apps/workbench/lib/product-journey/consumer-family.ts` and test,
   `use-consumer-generation.ts` and test. Extend the existing exact matcher and
   phase latches only after focused RED. No definition-name shortcut may trigger
   automatic application creation, Publish, compilation or navigation.
3. **Case owner after explicit assignment:** new `e2e/customer-requests.spec.ts`,
   `e2e/helpers/customer-requests.ts` and test. Root owns shared case binding/index,
   `e2e/tsconfig.consumer-delivery.json`, existing family-label helper/test and
   regression-lane/CI selections. Freeze the complete actual journey in VER-005;
   run only no-listener helpers, discovery and types until execution is cleared.

The data owner may work independently of verifier QA on these disjoint files.
Root records assignments in the active ledger before each batch. Retain the raw
pre-edit catalogue at `generated/.customer-requests-task4/catalogue-before.json`,
SHA-256 `b05298aa6de6390910239edf6147af657f792142d37f275576f0c4d7982d4ebf`;
the older immutable compiler and worker baselines remain untouched. A new row is
source registration only; actual acceptance and hosted counts stay unchanged.

- [x] RED canonical admission, semantic deduplication and retained unsupported
      requirements. Connect exact witness admission to existing automatic immutable
      delivery; a name or provider match is never sufficient.
- [x] Author the complete ADR VER-005 consumer journey and pure ownership/evidence
      helpers. Discovery/types/helpers run without starting the actual application.
- [x] Run existing definition regression and affected consumer/worker checks;
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
