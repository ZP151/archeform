# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

External Capability Intake Task 6, **Bulk acceptance and release evidence**, is
in `implementing` under the Controller-authorized release repair at PM ledger
commit `a9867b8`. Historical independent behavioral QA moved the slice from
`ready_for_qa` to `reviewed`; the subsequent release review failed with two P2
findings and no P0/P1 finding. Only the PM changes the ledger state.

The Application Graph remains the source of truth. External intake artifacts
remain quarantined Candidate evidence or pending-review packets; they are not
Golden capabilities, Graph input, compiler input, generated runtime authority,
provider authority, approval, or source-copy execution.

## Completed evidence

The Task 6 writer record is
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
- Historical complete suites: External Intake 392/392, Intake CLI 56/56, Graph
  28/28, Capabilities 123/123, and Compiler 180/180.
- Relevant typechecks and Prettier-based lint checks for External Intake, Intake
  CLI, Graph, Capabilities, and Compiler.

## Active work

- The release repair addresses the P2 directory-replacement child-process test:
  its internal fail-closed wait is bounded at 10 seconds while the prior
  default 5-second Vitest outer timeout failed during the required concurrent
  five-suite run. The repair gives both real child-process race cases a bounded
  20-second outer timeout, retaining a 10-second scheduling margin without
  skipping, mocking, or weakening either error path.
- The release review also found this status document stale at `ready_for_qa`.
  This record now preserves the historical `ready_for_qa -> reviewed` QA PASS,
  the P2/no-P0-P1 release-review failure, and the active `implementing` repair
  state.
- The mandatory repair evidence is a fresh concurrent Node 22 five-suite run,
  a serial Intake CLI 56/56 run including both races, targeted quality gates,
  and independent re-QA/release review afterward.
- The fresh concurrent Node `v22.11.0` run passed External Intake 392/392,
  Intake CLI 56/56, Graph 28/28, Capabilities 123/123, and Compiler 180/180.
  The directory race took 6,141 ms without timing out; a separate serial Intake
  CLI run also passed 56/56 including both races.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- This repair is fixture-only and provides no acceptance or live-service
  evidence. Fresh independent behavioral QA, release review, final
  verification, and PM acceptance remain required before acceptance.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.

## Next slice

Complete the bounded repair verification, then run independent Task 6
behavioral re-QA, release review, and fresh final verification required by the
External Capability Intake ledger before PM acceptance.
