# Work Orders bounded verifier source acceptance

Status: bounded source acceptance restored after the ADR-0083 identity repair,
independent source review, Terra QA and final judgment at 0/0/0. The final worker
selection passes 175 cases; all nine role variants validate and probe 21 journeys
each. Compiler identity checks pass 27 cases, with canonical and historical output
parity. Exact hashes and source ownership are in the active ledger. This is
injected-transport and emitted-runtime evidence, not actual
PostgreSQL, generated UI, consumer-entry or hosted acceptance.

## Behavior

Root's additional check renames the technician role to a valid 64-character key.
Compiler admission succeeds, but sixteen derived journeys reject their overlong
session IDs. Existing prefix-based fixture IDs exceed the fixed transport limit.
ADR-0083 repairs that derivation with fixed family-owned fixture slots and retains
Graph-bound authorization roles. The reproduction now rejects zero journeys;
renamed, swapped and independently/jointly 64/128-character roles are covered.
The initial clean verdict did not cover those cases. Runtime and presentation
owners now resume their separate remaining work against the corrected handoff.

The worker selects the exact immutable Work Orders compiler profile before generic
derivation. It builds 21 independent journeys using existing chain/probe contracts:
14 stored-success command scenarios, five former-assignee 404 scenarios and two
role-level 403 denials. The longest prologue is six steps, below the unchanged
eight-step limit. Fresh created IDs, distinct technician sessions, committed
versions and exact idempotency bytes drive correction, assignment, work,
reassignment, resolution, reopen and cancellation. Former-assignee denial includes
replaying the exact earlier successful start command after reassignment.

The environment accepts the precise three-key correction envelope with all five
replacement fields; only description and dueDate may be null. Existing generic
payloads, routes, headers and body bounds retain their restrictions. Extra fields,
partial metadata, invalid dates/versions, nested data and assignment/state
injection reject before fetch. No serialized lifecycle/evidence or observation
interface was added. HTTP outcome checks do not prove persisted report/history
contents; runtime and actual product assertions retain that responsibility.

## Scope and verification

Four implementation paths belong to the verifier writer; root owns the
environment validator and its test. Six source hashes and four original baseline
hashes remain stable before/after both independent stages. Accepted ADR-0080 is
unchanged. The historical Task verifier-plan hash remains asserted.

Focused RED demonstrated missing family registration/near-match rejection and
two valid correction envelopes being refused. The complete targeted command
passes 164/164 across four files in both implementation and independent QA:

```text
pnpm --filter @factory/compiler-worker exec vitest run test/service-work-orders-verification.test.ts test/verification-graph-plan.test.ts test/verification-probes.test.ts test/verification-environment.test.ts
pnpm --filter @factory/compiler-worker typecheck
```

Both commands exit 0. Scoped formatting/whitespace pass. Independent strongest
source review and Terra QA each return P0/P1/P2 0/0/0. Recovery artifacts are
`generated/.work-orders-task3-worker/review-manifest.json` and `qa-report.json`;
the QA report SHA-256 is
`24b942a7d319dfce237037663d7b0652e869817b19858f07f1f26d21f633de4d`.

Runtime and presentation implementation continue separately. No services, Docker,
Preview, actual E2E, network/provider, cleanup or Git delivery were performed by
this slice. No new product or runtime count is promoted. The existing actual-run
startup restriction remains in force.
