# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

Commercial Capability Foundation Task 2, **Restaurant and Ecommerce profile
recipes**, is `implementing`. Its contract owner is Profile Composition
Integration; its dependency, Task 1 capability contracts and physical
packages, is `accepted` and frozen. Task 2 is limited to composing Restaurant
and Ecommerce Draft recipes from the same four accepted Foundation identities
with distinct exact Graph-symbol bindings, entities, pages, roles, labels, and
fixtures. Foundation Tasks 3 and 4 remain `planned`.

The Application Graph remains the source of truth. External intake artifacts
remain quarantined Candidate evidence or pending-review packets; they are not
Golden capabilities, Graph input, compiler input, generated runtime authority,
provider authority, approval, or source-copy execution.

## Completed evidence

Commercial Capability Foundation Task 1 is accepted and frozen. Its verified
`1.0.0` identities are `core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`; their physical
package, evidence-digest, verified-lock, and Publish-boundary contracts remain
unchanged.

The complete External Capability Intake project is accepted and frozen. Its
Task 6 writer record is
[`acceptance/external-capability-intake.md`](acceptance/external-capability-intake.md).
On Node `v22.11.0`, it records:

- A fixture-only CLI preflight of exactly 43 portfolio sources and 108 demand
  signals: 19 independent requested results, 24 independent policy-only
  blocks, stable redacted repeat output, no Candidate creation, and exact
  run-owned cleanup.
- Release-boundary regressions that reject Candidate artifacts at Golden,
  Graph, and compiler entry points; reject Golden/Graph/compiler/generated/
  runtime/provider/approval/copy-execution fields; and preserve package-root
  importer isolation.
- Independent re-QA after document repair `0b558fc` passed; PM ledger
  `77b4062` moved Task 6 `ready_for_qa -> reviewed`. Release review against
  `77b4062` then found two P2/no-P0/P1: the concurrent real
  directory-replacement race exceeded Vitest's 5-second default, and the prior
  documents were stale at `ready_for_qa`.
- Controller repair authorization `a9867b8` led to implementation commits
  `4924ec0 + dc6ca19`, which passed independent task review with no P0/P1/P2.
  PM ledger `43913ae` then moved Task 6 `implementing -> ready_for_qa`.
- Fresh re-QA at `43913ae` concurrently passed External Intake 392/392, Intake
  CLI 56/56, Graph 28/28, Capabilities 123/123, and Compiler 180/180. The
  directory and junction races completed in 6,361 ms and 3,688 ms.
- A serial Intake CLI run passed 56/56 with those races at 1,941 ms and 1,858
  ms; focused release-boundary and bulk-intake tests passed 3/3 and 1/1. All
  five affected typecheck/lint gates, targeted Prettier, `git diff --check`,
  and clean-worktree verification passed.

## Active work

- One bounded `integration` writer owns Task 2's exact five paths:
  `packages/capabilities/src/index.ts`,
  `packages/capabilities/src/restaurant/profile.ts`,
  `packages/capabilities/test/restaurant-profile.test.ts`, and
  `packages/capabilities/test/commercial-profile-composition.test.ts`, plus
  `packages/capabilities/test/capability-registry.test.ts` only for canonical
  Restaurant and Simple Ecommerce expected-input corrections for Task 2's four
  Foundation locks and the exact provider-uniqueness regressions below.
- Independent task review of implementation commit `35aa96e` is FAIL with two
  P1 findings and one P2 finding. The P1 findings are missing configurable-line
  PolicyModel permissions and an unauthorized, weakened provider-uniqueness
  regression. The P2 finding is under-specified cross-profile proof. The
  production fix is not approved, the commit is not accepted, and Task 2
  remains `implementing`.
- The fifth-path amendment is a test-scope correction only. It may update
  Simple Ecommerce's canonical expected input only for Task 2's four accepted
  Foundation locks. Provider-uniqueness regressions must assert exactly one
  provider for every non-overlapping effect and, for each intentionally
  overlapping inventory effect, the exact provider set
  `{commerce.inventory, commerce.inventory-ledger}`. It changes no shared
  contract, physical asset, package identity, interface, dependency, recipe
  scope, lifecycle or Publish behavior, production behavior, non-goal, or Task
  2 state.
- The slice must produce Restaurant and Ecommerce recipes selecting the same
  four accepted identities with distinct validated Graph symbols and output
  semantics, canonical nonempty locks, deterministic dependency order, and
  fail-closed invalid-symbol behavior.
- No new package identity, Task 1 contract change, compiler, Workbench,
  generated runtime, payment, identity-provider, deployment behavior, profile
  cloning, Graph `assetLocks` fallback, or Restaurant-only package fork is in
  scope.
- Foundation Tasks 3 and 4 remain `planned` until Task 2 is accepted. External
  Capability Intake remains accepted and frozen.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- This slice is fixture-only and provides no public-network or live-service
  evidence. Acceptance grants no promotion, approval, Golden, Graph, compiler,
  generated-runtime, provider, or source-copy authority.
- Foundation Tasks 3 and 4 are blocked on accepted Task 2 profile composition
  metadata. Neither downstream task is dispatched by this update.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.
- Task 2 must not confuse accepted physical Foundation contracts with completed
  Restaurant or Ecommerce product behavior. Cross-profile bindings and
  deterministic recipe evidence are the gate.

## Next slice

Repair Commercial Capability Foundation Task 2's independent-review findings
within its exact five paths, beginning with focused failing permission,
cross-profile, and exact provider-uniqueness regressions. Prove both profiles
select the same accepted identities with distinct validated symbols and
deterministic locks. The production repair requires fresh review; keep Tasks 3
and 4 planned until Task 2 is accepted.
