# External Capability Intake — Task 6 evidence record

Updated: 2026-07-31

Status: Task 6 is `implementing` under the Controller-authorized release repair
at PM ledger commit `a9867b8`. Historical independent behavioral QA moved the
slice from `ready_for_qa` to `reviewed`; release review then found two P2
defects and no P0/P1 defect. This repair is not acceptance: a fresh independent
QA, release review, final verification, and PM acceptance remain required
before `accepted`.

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

## Historical QA and active release repair

Independent behavioral QA documented at `0b558fc` passed and moved Task 6 from
`ready_for_qa` to `reviewed`. The subsequent release review at ledger commit
`77b4062` failed the slice with two P2 findings and no P0/P1 finding:

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
- This repair remains fixture-only and supplies no acceptance or live-service
  evidence. Fresh independent behavioral QA, release review, final
  verification, and PM acceptance remain required before `accepted`.
