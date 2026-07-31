# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

External Capability Intake Task 6, **Bulk acceptance and release evidence**, is
in `implementing`. The bounded writer has added fixture-only acceptance
regressions and a sanitized evidence record. Task 6 has not entered
`ready_for_qa`; only the PM may reconcile the writer commit and change its
ledger state.

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
- Complete relevant suites: External Intake 392/392, Intake CLI 56/56, Graph
  28/28, Capabilities 123/123, and Compiler 180/180.
- Relevant typechecks and Prettier-based lint checks for External Intake, Intake
  CLI, Graph, Capabilities, and Compiler.

## Active work

- Task 6 remains `implementing` until the PM reconciles the bounded writer
  commit and independent task review.
- Task 6 formatting and diff checks are recorded in the writer evidence; task
  review and subsequent independent gates remain pending.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- PM reconciliation, independent behavioral QA, release review, and fresh final
  verification remain required before acceptance.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.

## Next slice

Complete Task 6 task review and PM reconciliation, then run the independent
behavioral QA, release review, and fresh final verification required by the
External Capability Intake ledger.
