# Accepted-family consumer delivery evidence

Status: Task 1 source passes independent review and deterministic QA. Task 2
Workbench source is frozen with passing writer checks, independent source review
and Terra deterministic QA; final integration and
actual consumer-entry acceptance remain pending. No new delivered family claim.
Source base: `7a85d6efd946ffd9d1a826771e0e12a187a85b92`.
Accepted ADR-0079 SHA-256:
`c3977b14ba87e8134e75d50feda48496f2765778b6ea0bae579ebb54360e2460`.

## Shared predicates and exact plan matcher

The six-file Task 1 change exports the existing Appointment/Inventory predicates,
extracts Directory Blueprint semantics without moving definition provenance/spec/
job/journey checks, and reuses the planner's selected keys, locks and bindings in
`matchExactConsumerFamilyPlan`. Full ordered arrays use canonical comparison.

Writer `accepted_family_predicates` reports:

- Initial focused RED: 13 new failures for missing exports; 25 existing tests pass.
- Descriptive-field preservation RED: one new failure; extraction then preserves
  descriptive label/text flexibility while keeping semantic rejection.
- Final `pnpm --filter @factory/capabilities test`: 476/476, 36 files.
- Final `pnpm --filter @factory/adapters test`: 370/370, 19 files.
- Both packages' `typecheck` and `build` commands exit 0; changed-file format passes.

Tests use the actual accepted Appointment, Directory and Inventory definition
projections, including lock/version/digest/binding mutations, missing/extra/
duplicate/reordered entries, wrong composition identity, near-family structures
and old broad Appointment rejection. Adapter checks retain spec, primary-job,
journey, definition binding and provenance boundaries.

The raw property-order stress test exposed the pre-existing Appointment predicate's
numeric-domain `JSON.stringify` ordering. Task 1 does not change that predicate.
The final positive passes reordered Blueprint JSON through `assertProductBlueprint`,
the required parsed-input boundary; reordered plan properties compare equally.
This proves the declared call path, not arbitrary raw-object invariance. Task 2
must retain parsing, checksum, compatibility and clarification checks before this
matcher, using the requirement composition identity rather than a stored Graph ID.

## Static browser boundary proof

Root independently reproduced the four public exports' bundle using installed
`esbuild@0.21.5`, `bundle:true`, `platform:"browser"`, `format:"esm"`,
`write:false`, `metafile:true`, with the package directory as `resolveDir`.
Input exports are `isAppointmentBookingBlueprint`, `isContentDirectoryBlueprint`,
`isInventoryOperationsBlueprint` and `matchExactConsumerFamilyPlan` from
`@factory/capabilities`. Result: exit 0, 111 input modules, 465,788 bytes,
zero adapter/definition-data/Node inputs and zero external imports. No package,
service, environment, model call or generated file was added by this check.

This is a static dependency check, not a production Workbench build or a rendered
application. Task 2's production build now passes; actual three consumer cases
remain required.

## Workbench automatic-delivery integration

Writer `accepted_family_predicates` freezes the six assigned Workbench files
against the recorded pre-edit baseline. Accepted family matching follows parsed
spec/blueprint/plan, zero-question, checksum and compatibility gates and uses
`spec.requirementId` as composition identity. Existing delivery components share
family labels and describe local demo limitations. Lifecycle effects, latches,
release orchestration and earlier requirement-recovery controls are unchanged.

- Initial admission RED: 3 failed, 87 passed; hook/Home RED: 9 failed, 64 passed.
- Final seven consumer/Home/product/release/interpret/model suites: 274/274.
- Workbench typecheck and production build exit 0; changed-file format passes.
- Final admission-test rerun: 90/90. Task 1's six hashes remain unchanged.

The production build uses an empty provider key, dummy loopback control-plane
URL at port 64088 and disabled telemetry. It starts no server. Coverage includes
actual accepted projections, malformed/ambiguous plans, old broad Appointment
manual behavior, StrictMode, stale/unmounted/changed-target responses, failed
adoption/verification, invalid ready URLs, empty evidence, opt-out, retry and
start-over. The source-review delta is against the saved ADR-0078 snapshot,
not HEAD; this keeps the already reviewed recovery change distinguishable.

Independent `accepted_family_workbench_review` reports spec/quality PASS,
P0/P1/P2 0/0/0. Independent Terra `accepted_family_predicates_qa` reproduces
274/274 cases and Workbench typecheck, with six hashes unchanged before/after
QA and clean whitespace checks. Root independently runs
`node scripts/regression.mjs product`: the provider-free product lane succeeds
with `product-tests` exit 0 across Graph, adapters, capabilities, compiler and
Workbench. This covers the combined local source; it does not start or verify
the actual consumer browser journey.

The Appointment diagnosis confirms an existing P1 generated UI/API mismatch and
missing usable slot-selection/history controls. See the
[source findings and decision route](../appointment-booking/consumer-ui-gap.md).
Do not describe its API-driven case as ordinary-user booking completion.
Directory/Inventory Task 3 source preparation proceeds in their existing helper
and cases; actual execution and Appointment consumer closure remain pending.

## Directory/Inventory actual-case source

Task 3 writer `accepted_family_case_entry` freezes its five assigned files.
The existing helper now arms automatic phase observations before Create, binds
the applied Draft through Published/Compilation/verification/Preview, captures
cleanup ownership early, and opens the app through the consumer link. Inventory
reuses those captured identities instead of duplicating POST observation. Existing
business, denied-write, recovery, persistence, immutable identity and finally
cleanup assertions remain required.

Four new pure boundary tests initially fail; the existing safe failure assertion
passes. Final focused helper suite: 8 passing tests. Both actual cases are
discoverable with `--list`; changed-file formatting and whitespace checks pass.
Bounded category counters distinguish business, technical, navigation and retry
activity from machine wait and first useful action. No raw DOM text or business
payload is retained by telemetry. Static analysis with package aliases reports
zero changed-path diagnostics, but existing
`e2e/helpers/restaurant-delivery.ts:324` TS2367 prevents claiming a clean standalone
E2E typecheck. Independent `accepted_family_case_review` reports one P1:
failure cleanup can mistake a single empty current-run response for absence while
an automatic Preview creation is still in flight. The same writer is correcting
only that request-ownership/failure path, with a focused delayed-creation test.
The other scoped source checks have no actionable findings. The same writer's
two-test RED/GREEN correction now passes all 10 helper tests and both case
discovery checks. `accepted_family_case_review` verifies the P1 addressed and
reports 0/0/0, with the other three files unchanged. An attempted Preview creation
is observed before response headers; an empty lookup retains `cleanup-required`
until a validated owned run is reconciled. The current manifest records the
corrected source. This closes scoped source review only.

These are case-source checks only. No browser, backend, Docker or provider was
started; actual cases have not run and no measured zero-action consumer result
is claimed. Preserve the five-file source manifest and historical attempts
separately from the eventual real run.

## Subsequent source handoff

After Task 3's correction review closes, PM starts accepted ADR-0081 Task 1 in
Graph/capability paths. Some capability files therefore change after the Task 1
manifest above; that manifest records the reviewed historical snapshot, not a
claim that later working-tree bytes still match it. Root preserves the exact
pre-V2 files under `generated/.appointment-v2-task1-base-7a85d6ef/` for the next
delta review. Workbench and the actual-case source remain unchanged by that task.
Combined actual consumer acceptance is still required after the repair.

## Remaining acceptance

Independent `accepted_family_predicates_review` closes Task 1 source findings at
P0/P1/P2 0/0/0. Independent Terra `accepted_family_predicates_qa` reproduces full
capability 476/476 and adapter 370/370 suites and both package typechecks (exit 0).
It verifies the accepted ADR hash and all six source hashes before and after QA,
with clean scoped whitespace checks. This is deterministic Task 1 evidence only.

Root verified ADR-0078's 21 source hashes before the serial Workbench handoff.
Its actual browser acceptance remains pending the previously policy-rejected
startup; no alternate startup was attempted. After its implementer finished and
source review/QA passed, Task 2 starts serially in five existing Workbench files
plus a new focused family test. The pre-edit snapshot and absent-test record live
in ignored `generated/.consumer-family-task2-base-7a85d6ef/`. Preserve the earlier
recovery behavior and review the new delta against that snapshot; the original
ADR-0078 manifest is historical source evidence once shared files change.

No measured zero-technical-action journey exists yet for these three new consumer
entries. Preserve their previous manual-entry business evidence, but do not reuse
its script-driven lifecycle clicks as proof of automatic delivery. Final source,
real entry, useful business operation, responsive UI and exact cleanup checks must
close before increasing automatic consumer coverage or marking this slice delivered.
