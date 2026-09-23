# Automatic delivery for accepted business families

Decision: accepted ADR-0079, SHA-256
`c3977b14ba87e8134e75d50feda48496f2765778b6ea0bae579ebb54360e2460`.
Independent `scope_decision_review` approves standing acceptance at P0/P1/P2 0/0/0;
PM records it before implementation. Source work waits for closure of overlapping
ADR-0078 source work. Root owns this plan,
evidence, runtime processes and Git; source ownership is assigned after that point.

## Outcome

The accepted Appointment, Directory and Inventory definitions reach their useful
local apps from ordinary Describe/Create without six technical product actions.
Reuse existing lifecycle orchestration and generated business acceptance. Preserve
manual opt-out, uncertainty recovery, exact family admission and immutable history.
No new product definition, provider, cloud environment or generated template is
part of this slice. Six runtime families remain six; measure automatic entry
coverage separately.

## Task 1: share exact admission with the existing planner

One serialized strongest-model owner changes the ADR IMP-002 paths:
`packages/capabilities/src/product-composer.ts`, `plan-alternatives.ts`,
`index.ts`, their focused predicate/plan/export tests, and
`packages/adapters/src/requirements/definition-family-registry.ts` with affected
Appointment/Directory/Inventory definition tests.

Begin RED with actual accepted definition projections and current plans, imported
through the package root:

```ts
expect(matchExactConsumerFamilyPlan(blueprint, requirementId, plan)).toBe(
  family,
);
expect(
  matchExactConsumerFamilyPlan(blueprint, requirementId, changedPlan),
).toBeNull();
```

Implement exactly the ADR's three-result-or-null matcher. Share existing
`locksForKeys` and `bindingsForKeys` derivation; do not duplicate expected digests
or symbols in Workbench. Move only Directory blueprint semantics to its shared
predicate, preserving definition provenance, primary-job and journey guards in
the adapter wrapper. Re-export the existing exact Appointment/Inventory predicates.
Test every missing/extra/reordered/duplicate/rebound lock or binding and stale
digest/version, near-family mutations, and wrapper-specific rejection. Preserve
all accepted historical outputs. Prove the root import remains browser-safe.

## Task 2: extend the existing consumer path

The same owner changes only `apps/workbench/lib/product-journey/consumer-family.ts`,
`use-consumer-generation.ts`, their tests, `components/workbench-home.tsx` and
its tests. Wait for ADR-0078 to finish these shared files.

RED cases use accepted `appointment-booking-v1`, `knowledge-resource-directory`
and `supplies-stockroom` projections with real compatible standard plans. After
the existing spec/blueprint/plan checksum and no-question gates, call the shared
matcher. Keep old Restaurant/Approval/Task behavior; the old broad Appointment
fixture and all incomplete/materially ambiguous plans remain manual.

Add only family labels and descriptions to existing delivery components. Reuse
the same selection/apply/session/phase latches and actual target binding. Exercise
StrictMode, duplicate renders, stale/unmounted responses, changed targets, manual
opt-out, failed verification, non-loopback or empty-evidence readiness, explicit
retry and start-over cleanup. Expected automatic calls remain:

```ts
expect(chooseAlternative).toHaveBeenCalledTimes(1);
expect(applyComposedProduct).toHaveBeenCalledTimes(1);
expect(publishRelease).toHaveBeenCalledTimes(1);
```

Run affected capability, adapter and Workbench suites, typechecks, formatting and
production Workbench build. The build must not import Node/server-only data into
the client. Run `node scripts/regression.mjs product`; retain existing definition
and immutable-output regression where its paths are unchanged.

## Task 3: replace technical entry in the three actual cases

Use the existing Appointment, Directory and Inventory specs and their helpers;
no new lifecycle harness. Arm response/identity observations before the business
Create click. Observe automatic phases and authoritative results without clicking
Choose, Apply, Publish, Compile, Verify or Preview. Reuse existing business and
`finally` cleanup assertions. Keep explicit manual opt-out coverage separately.

For each actual accepted family, root prepares an isolated local environment,
runs the case, opens the generated app and completes its primary job plus existing
denial/retry coverage. Preserve every attempt. Record initial business submission,
material questions/answers, technical actions (baseline six, target zero), view
navigation, retries, machine wait and first useful action separately. A ready URL,
mocked lifecycle or zero human rescues does not prove consumer closure.

At relevant 390/1440 surfaces, inspect actual delivery and generated useful-result
images. Keep current five-minute prepared-local readiness target and distinguish
outer construction. Prove exact Preview artifact/container/network/volume cleanup
on success and failure, followed by root-owned outer cleanup. Historical blocked
resources remain outside this run.

## Acceptance and delivery

Use the existing shared-contract task review, independent QA and final scoped
judgment once for this slice. Reuse unchanged generated-business evidence and
review only affected corrections. Root writes bounded facts/source identities in
`docs/acceptance/evidence/accepted-family-consumer-delivery/`, updates the existing
scorecard and ledger, commits, pushes and verifies remote equality. No `main`,
release, real-model, ordinary-user, identity or hosted claim follows. Continue
Work Orders and the separate durable-hosting route after this consumer gap closes.
