# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

External Capability Intake Task 6, **Bulk acceptance and release evidence**, is
in `ready_for_qa` after documentation repair `409d545` passed independent
review and the PM atomically reconciled this status, the acceptance record, and
the ledger. Fresh independent re-QA is the next gate. Only the PM changes the
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

- The earlier bounded release repair (`a9867b8`) kept both real child-process
  races fail-closed with a 20-second outer timeout, then passed independent
  task review. PM ledger `43913ae` moved Task 6 to `ready_for_qa`.
- Independent re-QA at `43913ae` confirmed all behavioral and quality evidence
  above, but the acceptance record and this document still claimed the prior
  `implementing` state at `a9867b8`. Re-QA therefore failed overall solely with
  one stale-status P2 and no P0/P1.
- PM ledger `f1f1a04` returned Task 6 `ready_for_qa -> implementing` for this
  exact two-document status repair. No test, code, dependency, fixture,
  network boundary, public surface, authority, or product behavior may change.
- Documentation repair `409d545` then passed independent task review with no
  P0/P1/P2. The PM atomically moved Task 6
  `implementing -> ready_for_qa` across the ledger, acceptance record, and this
  status. Fresh independent re-QA is now active.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- This slice is fixture-only and provides no public-network, acceptance, or
  live-service evidence. It grants no promotion, approval, Golden, Graph,
  compiler, generated-runtime, provider, or source-copy authority.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.

## Next slice

Run fresh independent Task 6 behavioral re-QA against the synchronized
`ready_for_qa` state. Release review, final verification, and PM acceptance
remain required afterward.
