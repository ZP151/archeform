# External Capability Intake — Task 6 evidence record

Updated: 2026-07-31

Status: Task 6 is `accepted` after independent release review and fresh root
verification at `a743652` passed with no P0/P1/P2 and the PM atomically
reconciled this record, project status, and the ledger. Acceptance remains
fixture-only; it is not public-network or live-service evidence and grants no
new authority.

## Scope

This record covers the fixture-only Task 6 dispatch. It did not resolve,
download, inspect, execute, or contact any public source, vendor, provider, or
service. It used no credentials and records no raw source, finding, prompt, or
response data.

The product portfolio was loaded as local metadata only: 43 fixed-reference
source records and 108 scenario demand signals. The CLI preflight submitted the
19 intake-eligible records and independently blocked the 24 policy-only
records. Scenario demand signals did not become Candidates.

## RED to GREEN evidence

The focused RED commands were run before the assigned test files existed. Both
exited with status 1 and reported `No test files found`:

```text
pnpm --filter @factory/intake-cli test -- --run test/bulk-intake.test.ts
pnpm --filter @factory/external-intake test -- --run test/release-boundary.test.ts
```

After the focused deterministic tests were added, the same commands passed on
Node `v22.11.0`:

```text
pnpm --filter @factory/intake-cli test -- --run test/bulk-intake.test.ts
# 1 test passed

pnpm --filter @factory/external-intake test -- --run test/release-boundary.test.ts
# 3 tests passed
```

The first release-boundary GREEN attempt exposed an over-constrained test
assertion: invalid promotion packets correctly returned `valid: false` plus
sanitized validation issues. The assertion was narrowed to the contractual
boolean; no production behavior changed.

Task review then required a structurally valid canonical
`decision: "pending-review"` packet as the release-boundary input. The focused
test first ran RED with an incomplete packet (`valid: false`), then ran GREEN
after a local canonical fixture was supplied (`3/3` focused release-boundary
tests). That same verified packet was rejected without mutation by Golden lock,
Graph, compiler/generated-runtime, promotion-decision, batch, and Candidate
creation entry points. Its fixed prohibitions include provider activation,
approval, and source-copy execution.

## Demonstrated postconditions

- The local fixture portfolio preflight processed exactly 43 source entries and
  retained exactly 108 demand signals as metadata.
- It produced 19 independent `requested` results and 24 independent `blocked`
  policy-only results. Repeating the identical local request produced identical
  redacted CLI output.
- The fixture run created no Candidate record or Candidate locator. Its output
  contained no repository URL, requested reference, expected commit, source
  body, or finding field.
- Cleanup removed only the exact run-owned temporary directory. A sibling
  directory created outside that run remained unchanged after cleanup.
- Candidate artifacts were rejected by the Application Graph parser, Golden
  capability-lock resolver, and compiler generation entry point. Candidate
  records reject Golden, Graph, compiler, generated/runtime, provider,
  approval, and copy-execution fields.
- Pending-review input cannot be represented as an approved promotion packet;
  the intake API surface exposes no approval, Golden registration, provider
  authority, or copy-execution operation.
- Runtime importer isolation permits `@factory/external-intake` only in its
  own package manifest and the repository-local Intake CLI manifest. No
  Candidate asset directory exists under the Golden capability assets root.

## Complete executed verification

The following are historical writer and task-review results on Node
`v22.11.0`; they do not replace the active release-repair verification:

```text
pnpm --filter @factory/external-intake test
# 14 files, 392 tests passed

pnpm --filter @factory/intake-cli test
# 2 files, 56 tests passed

pnpm --filter @factory/graph test
# 2 files, 28 tests passed

pnpm --filter @factory/capabilities test
# 4 files, 123 tests passed

pnpm --filter @factory/compiler test
# 7 files, 180 tests passed

pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/graph typecheck
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/compiler typecheck

pnpm --filter @factory/external-intake lint
pnpm --filter @factory/intake-cli lint
pnpm --filter @factory/graph lint
pnpm --filter @factory/capabilities lint
pnpm --filter @factory/compiler lint

pnpm exec prettier --check packages/external-intake apps/intake-cli ecosystem/portfolio/2026-07-30-external-business-logic.json docs/acceptance/external-capability-intake.md docs/project-status.md
git diff --check
```

## Truthful chronology and active documentation repair

Independent re-QA after document repair `0b558fc` passed. PM ledger commit
`77b4062` reconciled that evidence and moved Task 6 from `ready_for_qa` to
`reviewed`. The subsequent release review against `77b4062` failed the slice
with two P2 findings and no P0/P1 finding:

- The directory-replacement race uses a real child process whose fail-closed
  path allows up to 10 seconds for a signal. Vitest's default 5-second outer
  timeout made the mandated concurrent five-suite run unreliable.
- The status documentation incorrectly remained at `ready_for_qa` after the
  QA transition to `reviewed`.

The release-repair RED was reproduced on Node `v22.11.0` by running the five
full suites concurrently: External Intake passed 392/392, Graph passed 28/28,
Capabilities passed 123/123, and Compiler passed 180/180. Intake CLI failed
55/56 because the real directory-replacement child-process test timed out at
5,061 ms; the real junction-race test passed. The repair keeps both races as
real child processes and applies a bounded 20-second outer timeout, a documented
10-second scheduling margin beyond their internal fail-closed wait. No
production behavior, dependency, mock, skip, or error-path weakening is in
scope.

The corresponding GREEN reran the same five full suites concurrently on Node
`v22.11.0`: External Intake 392/392, Intake CLI 56/56, Graph 28/28,
Capabilities 123/123, and Compiler 180/180 all passed. The directory race
completed in 6,141 ms, demonstrating the needed margin under concurrency. A
separate serial Intake CLI run also passed 56/56, including both real races.

The Controller authorized that bounded repair at `a9867b8`. Implementation
commits `4924ec0` and `dc6ca19` retained the real fail-closed child-process
races, corrected the historical transition attribution, and passed independent
task review with no P0/P1/P2. PM ledger commit `43913ae` then moved Task 6
`implementing -> ready_for_qa`.

Independent re-QA at `43913ae` passed every behavioral and quality gate:

- Concurrent Node `v22.11.0` suites passed External Intake 392/392, Intake CLI
  56/56, Graph 28/28, Capabilities 123/123, and Compiler 180/180. The real
  directory-replacement race completed in 6,361 ms and the real junction race
  in 3,688 ms.
- A separate serial Intake CLI run passed 56/56; the directory-replacement and
  junction races completed in 1,941 ms and 1,858 ms respectively.
- Focused release-boundary and bulk-intake tests passed 3/3 and 1/1. All five
  affected typecheck and lint gates, targeted Prettier, `git diff --check`, and
  clean-worktree verification passed.

That re-QA found no behavioral defect, P0, or P1, but failed overall with one
P2: this record and project status still stated the prior `implementing` state
at `a9867b8` instead of the then-current `ready_for_qa` state at `43913ae`.
Those were present-tense claims, not historical evidence. PM ledger `f1f1a04`
therefore returned Task 6 `ready_for_qa -> implementing` for this exact
two-document repair. No code, test, dependency, fixture, network boundary,
public surface, authority, or product behavior is authorized to change.

Documentation repair `409d545` then passed independent task review with no
P0/P1/P2. The PM atomically moved Task 6
`implementing -> ready_for_qa` across the ledger, this acceptance record, and
project status. No historical evidence, count, timing, limitation, or
prohibition changed in that transition.

Fresh independent re-QA at `6ee338f` then passed with no P0/P1/P2. It
reproduced every required concurrent, serial, focused, safety, cleanup,
quality, and synchronized-status gate. The PM atomically moved Task 6
`ready_for_qa -> reviewed` across the ledger, this acceptance record, and
project status.

Independent release review and fresh root verification at `a743652` then passed
with no P0/P1/P2. The fresh concurrent suites passed 392/392, 56/56, 28/28,
123/123, and 180/180; the concurrent races completed in 5,303 ms and 3,539 ms.
Serial Intake CLI passed 56/56 with races at 2,089 ms and 2,052 ms. All five
typecheck/lint gates, targeted Prettier, commit/diff checks, and clean-worktree
verification passed. The PM atomically moved Task 6 `reviewed -> accepted`
across all three state documents.

## Limitations and remaining gates

- Evidence is deterministic and fixture-only. It is not public-source,
  repository-resolution, archive, scanner-tool, vendor, runtime-provider, or
  live-service evidence.
- The accepted CLI limitation remains: the single-purpose promotion-packet
  writer temporarily changes the process working directory and restores it;
  this Task 6 evidence did not broaden that behavior.
- Preflight proves intake request isolation and resume-stable CLI output. It
  does not make a licence decision, approve a packet, create a Golden asset, or
  authorize source copying.
- This slice remains fixture-only and supplies no public-network or
  live-service evidence. Its accepted evidence and exact five-path contract are
  frozen; acceptance grants no promotion, approval, Golden, Graph, compiler,
  runtime, provider, dependency, or source-copy authority.
