# Service Work Orders Implementation Plan

> Use the existing subagent-driven development or executing-plans workflow.
> Root assigns exact source ownership before each task. Follow the current PM
> ledger; this plan does not authorize a second writer on an owned path.

**Goal:** A dispatcher and technicians finish the same persisted work order
across desktop and mobile, including ordinary correction, reassignment, resolution,
reopen and reasoned cancellation of a mistaken order.

**Architecture:** Reuse current stores, transaction protection, approved UI assets
and lifecycle orchestration. Add the exact Work Orders witnesses, private compiler
profile and family rules from accepted ADR-0080. Synthetic staff demonstrate local
assignment rules; they do not satisfy the separate hosted/private identity goal.

**Tech stack:** Keep the accepted Golden profile, package assets and lockfile.

## Authority and sequencing

ADR-0080 is accepted at SHA-256
`e35fa837394b66909af0063ab29714a0f9bcd800d06ad677a1d78bc761e093b6`.
Independent `work_orders_decision_review` returns standing acceptance yes and
P0/P1/P2 0/0/0 after the correction/numeric-domain repair. The PM ledger records
acceptance before implementation. Use its FAM/API/SEC/VER requirements verbatim;
this plan does not widen them. ADR-0078/0079 shared source and the Appointment
default-selection/case-source repair remain preceding work. Once their source
checks and existing reviews close, PM may assign Work Orders source serially even
if the separately recorded actual-run startup restriction persists. Actual
runtime/visual/consumer acceptance is still required before family delivery or
count promotion. Appointment default and case-source review are now closed.
Task 1's source implementation is accepted after independent review and
deterministic QA. Tasks 2 and 3 now have accepted runtime, presentation and worker
source evidence. Task 4's canonical definition and automatic-entry extension pass
independent review and QA. The integrated definition lane passes all eight steps;
case-source review and final QA are accepted with 18 pure helper checks and
tracked no-emit types. Actual acceptance
remains open. Working source registration does not establish family delivery.

ADR-0083 is now accepted at SHA-256
`e4932b817715d45a1df0bc7c7f03891752df797d9f1e22485482df8e5d712e5d`
through the standing independent review recorded in the active ledger. Its
serialized correction replaces role-derived fixture IDs with the fixed family
slots while preserving actual Graph roles. The correction is accepted after
independent review and QA, including 175 worker checks, nine identity variants
and 189 derived journeys. The subsequent runtime and presentation corrections
are accepted within their source scope. Actual product acceptance remains open.

- Keep historical Task and all ten accepted products byte-compatible; never
  regenerate protected expectations to hide a changed historical output.
- Preserve immutable Published input, exact locks and Compilation identity.
- No new dependency, capability-package bytes, provider, identity service, cloud,
  existing-database migration or destructive rollback.
- Follow the consumer acceptance checklist, including useful visual composition,
  real correction/recovery and actual 390/768/1440 evidence.
- Do not retry policy-blocked startup or cleanup through another command or tool.
  A skipped browser/PostgreSQL run remains missing evidence.

## Task 1: exact admission and reusable compilation contract

One serialized strongest-model owner; no runtime or presentation writer yet.
Files: Graph `product-blueprint.ts`, `model.ts`, `index.ts`, new
`service-work-orders-blueprint-witness.ts` and `service-work-orders-graph-witness.ts`;
capabilities `product-composer.ts`; compiler `service-work-orders-contract.ts` and
minimal `index.ts` integration; corresponding focused witness/composition/contract
tests. Shared paths wait for the existing ADR-0079 writer to finish.

- [x] Capture the ten-definition immutable input/output baseline before changes.
      The capture also preserves the V2 Appointment replacement: eleven physical
      rows, ten logical definitions. Root records the original capture SHA-256
      in `generated/.work-orders-task1-preparation/historical-source-proof.json`;
      final unchanged-output comparison remains part of the last item below.
- [x] RED exact full-shape admission, JSON persistence round trip, malformed
      near-matches and old-family rejection of new action verbs.
- [x] Admit only the exact two-source `cancel` pair in the complete Blueprint
      witness, retaining ordinary state/actor/grant and duplicate checks.
- [x] Preserve the explicit empty business seed set; permit the numeric seed
      exception only at the witnessed history `orderVersion` coordinate and bounds.
- [x] Implement the private exact profile, with one readonly
      `selectServiceWorkOrdersProfile(graph, compositionLock)` selector and
      `ServiceWorkOrdersProfile` compiler-root export for runtime and verifier reuse.
      Freeze its concrete readonly interface before subsequent owners consume it.
- [x] Run focused Graph/capability/compiler checks and prove historical output
      equality. No Work Orders definition is counted or admitted to consumers yet.

The frozen implementation passes 352 writer checks plus 69 adjacent checks for
root's assertion correction. Independent integrated source review closes 0/0/0;
independent deterministic QA passes all 421 selected cases and three package
typechecks at 0/0/0. Task 2's five-path serialized runtime ownership is assigned
in the active ledger. See the
[source evidence](../../acceptance/evidence/service-work-orders/task-1-source.md).

## Task 2: transactional assignment and recovery

One serialized runtime owner. Files: new compiler
`service-work-orders-runtime.ts`, narrow `index.ts` integration and its focused
emitted-runtime tests; change shared write-protection helpers only when required
and with unchanged old-output evidence. Root owns any real database fixture.

- [x] RED/GREEN create, correction, assign, reassign, start, resolve, reopen and
      cancel using ADR-exact payloads, state rules, bounds and denial codes.
- [x] Emit only this family's compiler-owned dispatcher/two-technician fixtures.
      Resolve server-side principal context; never trust browser role/identity.
- [x] Check current assignment before receipt replay, then atomically commit CAS,
      metadata/state, attributed immutable history, audit and scoped receipt.
- [x] Prove correction snapshots, retained reports, no-op/terminal denial,
      version exhaustion, cancellation without fake resolution and hostile text.

These four items have accepted emitted-module source evidence: 137 runtime/
contract tests, independent source review and Terra QA. Database delegate doubles
do not satisfy the following actual PostgreSQL item. See the
[runtime/presentation source checkpoint](../../acceptance/evidence/service-work-orders/runtime-presentation-source.md).

- [ ] Run emitted PostgreSQL races and rollback: reassign versus resolve,
      update versus cancel, one-winner writes, lost-response retry and former
      assignee denial on list/detail/history/replay. Record skipped prerequisites.

## Task 3: scenario surfaces and bounded worker verification

After Task 1 interfaces freeze, PM may assign disjoint presentation and worker
paths. Root keeps compiler-facade integration serialized.

Presentation: `packages/compiler/src/service-work-orders-presentation.ts` and
focused tests. Search assets in the mandated order and reuse current tokens,
local icons, controls and recovery states. Register only the ADR's distinct
first-party presentation key with its provenance.

Root's [ordered reuse handoff](../../acceptance/evidence/service-work-orders/reuse-handoff.md)
records concrete inspected seams, including the existing role-only shell/header
limitation and the required three-principal interaction. It is preparation, not
permission to start a second shared-source writer or runtime acceptance.

- [x] Desktop first viewport presents dispatch queue, meaningful priority/status,
      assignee, location and a clear create action; detail exposes history and
      permitted correction/reassignment/cancellation. Avoid a generic field dump.
- [x] Mobile first viewport presents the current technician's useful assigned
      work and location, with a reachable Start/Resolve action. Preserve compact
      icon-only repeat actions with accessible names and 44 px targets.
- [x] Keep typed edits through validation/conflict, show fresh values before
      reapply, retain exact uncertain commands and refresh after historical replay.
      Show cancellation distinctly and clear obsolete detail after reassignment.
- [x] Inspect complete emitted workspaces and relevant empty/error/denied/stale
      states at 390/768/1440, including loaded styles/icons and keyboard use.

These presentation items pass 30 focused and seven public-bundle component checks
with independent review/QA and inspected captures. Requests are fully intercepted;
Task 4's actual generated application acceptance remains separate and open.

Worker: `apps/compiler-worker/src/verifier/verification-graph-plan.ts`, new
`service-work-orders-verification.ts`, `verification-environment.ts`; focused
`verification-graph-plan.test.ts`, `verification-environment.test.ts` and new
`service-work-orders-verification.test.ts` in its test directory.

Tech Lead's read-only seam check confirms this is verification implementation
under ADR-0080, not a new serialized interface: current chain journeys support
fresh IDs, per-step sessions and idempotency. PM must explicitly assign these paths.

The six-path worker portion is active with disjoint ownership: the verifier owner
implements the graph-plan/new journey module and their tests; root's exact
correction-envelope validator and test pass 44 cases/types and are frozen for
the same integrated review. Source/fixture IDs are recorded in the active ledger.
The integrated worker slice now passes independent review and Terra QA at 0/0/0,
with 164 tests and worker typecheck. Presentation acceptance remains separate.

- [x] Dispatch through the exact compiler selector before generic derivation;
      reuse existing journey kinds and bounded chains of at most eight steps.
- [x] Admit only the accepted update envelope and nullable cleared fields in
      request validation, retaining size/depth limits and other rejection cases.
- [x] Cover create/correct/assign/work/resolve/cancel and denied former assignee
      using bounded probes. Do not infer history-content correctness from status
      codes; retain Task 2 and actual product assertions for those contents.
- [x] Keep serialized verification evidence, lifecycle kinds, `role-journey.ts`
      and `probes.ts` unchanged. A new observation interface needs a separate
      frozen decision; do not invent one within this task.

## Task 4: definition, automatic consumer entry and actual closure

One definition/consumer owner uses the exact accepted family and existing
ADR-0079 matcher/orchestrator pattern. Files:
`packages/adapters/src/requirements/definitions/product-definitions.v1.json`,
`definition-family-registry.ts`, affected definition data/selection modules and
`packages/adapters/test/service-work-orders-definition.test.ts`;
`apps/workbench/lib/product-journey/consumer-family.ts`, its focused test and
existing consumer/home labels/tests. Root freezes any additional existing-module
ownership before dispatch. Case paths are `scripts/definition-case-bindings.mjs`,
`e2e/service-work-orders.spec.ts` and `e2e/helpers/service-work-orders.ts`, reusing
the existing lifecycle helper and cleanup rather than another lifecycle runner.

- [x] Admit `facilities-service-desk` with exact source/bindings and coarse-intent
      tests. Retain material demands for private accounts, uploads, notifications
      or other unsupported behavior; never silently replace them with fixtures.
- [ ] From ordinary Create/final business answer, require zero technical lifecycle
      actions. Retain manual opt-out, bounded failure/retry and actual readiness.
- [ ] Run the actual persisted desktop/mobile sequence from ADR VER-003: saved
      mistake -> correction -> assign A -> mobile start -> correction -> reassign
      B -> deny A -> resolve -> reopen -> resolve again. Cancel a mistaken duplicate.
      Verify both reports, correction/assignment history and interrupted retry.
- [ ] Run focused checks first, then `pnpm regression definitions`, affected
      package checks, actual generated app and immutable lifecycle evidence.
      Preserve failures, questions, technical actions, timings and cleanup facts.
- [ ] Use the existing contract review/QA/final judgment, reusing unchanged
      evidence. Root accepts, commits and pushes only verified delivery; count
      registration, demonstrated runtime and complete local journey separately.

Source checkpoint: the definition/matcher/consumer implementation passes 513
focused cases and eight shared observer cases with independent review/QA at
0/0/0. Eleven pre-existing physical definitions retain fresh and immutable output
equality. The actual case is implemented and bound to the catalogue; discovery,
source review and pure helper checks are not execution. The integrated definition
regression passes all eight steps and full formatting passes. The remaining
checkboxes deliberately retain actual consumer, persistence and delivery outcomes.

After closure, assess 3–5 genuine domain briefs for data-based reuse. Do not add
renamed templates to inflate totals. Durable hosted delivery, real identity and
ordinary-user validation stay separate open outcomes of the full Goal.
