# Service Work Orders Task 1 source evidence

Status: implementation frozen; independent source review closes P0/P1/P2 0/0/0.
Independent deterministic QA also closes P0/P1/P2 0/0/0; bounded source accepted.
This records admission and compilation-contract evidence, not a usable generated
Work Orders application, actual database acceptance or hosted delivery.

## Scope and authority

Accepted ADR-0080 SHA-256:
`e35fa837394b66909af0063ab29714a0f9bcd800d06ad677a1d78bc761e093b6`.
The serialized owner changes sixteen assigned Graph/capability/compiler paths.
Root includes one separate Appointment assertion correction in the same review.
Source manifest SHA-256:
`ff7f13f3611bc7bb1210501cc8a7278ce6098ff71f0292369d8d4f1d5b3f618b`.
Writer completion report SHA-256:
`8a0f855ec16bb46db993eab086456dfc423d802e708e2da667c98078a968574c`.
Original baselines preserve the earlier in-flight accepted source, rather than
using HEAD to mix unrelated changes into this slice.

The browser-safe Blueprint/Graph witnesses check the complete accepted family,
its exact cancel exception and its bounded history version field with explicit
empty seeds. Composition retains the six existing packages and physical assets.
The compiler exports a detached frozen `ServiceWorkOrdersProfile` through
`selectServiceWorkOrdersProfile`; it validates persisted input, semantic shape,
exact bindings, Graph/lock hashes and physical package bytes. Public compilation
intentionally rejects this family until Task 2 supplies its transactional runtime.
No consumer definition, presentation or product coverage is added here.

## Reproducible checks

Run these from the active isolated worktree. None starts a service or provider.

| Command                                                                                                                                                                                                                                                           | Result                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `pnpm --filter @factory/graph exec vitest run test/service-work-orders-blueprint-witness.test.ts test/service-work-orders-graph-witness.test.ts test/product-blueprint.test.ts test/numeric-field-domain.test.ts test/inventory-operations-graph-witness.test.ts` | 199 passed                 |
| `pnpm --filter @factory/capabilities exec vitest run test/service-work-orders-composition.test.ts test/product-composer.test.ts test/inventory-operations-composition.test.ts`                                                                                    | 43 passed                  |
| `pnpm --filter @factory/compiler exec vitest run test/service-work-orders-contract.test.ts test/task-compatibility.test.ts test/task-correction-compatibility.test.ts test/definition-data-compatibility.test.ts`                                                 | 110 passed                 |
| `pnpm --filter @factory/capabilities exec vitest run test/appointment-consumer-workspace.test.ts test/plan-alternatives.test.ts`                                                                                                                                  | Root correction: 69 passed |
| Each of `@factory/graph`, `@factory/capabilities`, `@factory/compiler`: `typecheck` and `build`                                                                                                                                                                   | All exit 0                 |
| Prettier on the sixteen writer paths; scoped `git diff --check`                                                                                                                                                                                                   | Passed                     |

Keep the original failures: Graph admission initially fails 17 cases and compiler
admission initially fails 28. Expanded checks expose an obsolete global `assign`
rejection; its correction retains unknown-verb and non-family semantic rejection.
The reserved roster route mismatch is corrected to `work-order-assignees` with
consistent-renaming collision coverage.

The preceding Appointment V2 test also still expects the old `null` matcher result.
Root reproduces 30 passes/one failure, checks the already accepted Task 4 source
and changes only that expectation to `appointment`. The 69-case result above
supersedes this failure without changing production behavior. Do not interpret
earlier focused Task 4 evidence as a prior pass of this omitted suite.

## Historical output protection

Before and after captures both hash to
`6a2b1429f43ec358eea69e43085386ea0925f731be3b8fbe1e174afcc63b3b81`.
Eleven physical definitions represent ten accepted logical definitions plus the
Appointment V2 replacement. Fresh composition matches the original data, and
generation from each stored immutable Published Graph and separate lock preserves
every ordered output file digest and bundle digest. Root rechecks the original
capture hash and inspects the comparison. No protected baseline is regenerated.

Local raw reports remain in `generated/.work-orders-task1-completion`; review
snapshot is `generated/.work-orders-task1-review`. The capture script writes the
original baseline and must not be rerun as a verification command. The distinct
comparison script writes only the after/equality reports.

## Remaining outcomes

Independent review verifies all seventeen source/original baseline hashes and
ten handoff snapshots before/after, with no actionable finding. Independent Terra
QA reruns 199 Graph, 112 capability and 110 compiler cases plus the three package
typechecks, all passing; seventeen source and eight original baseline hashes
remain unchanged. Root assigns the prepared Task 2 runtime slice to
implement transactional assignment, correction, history and recovery using the
frozen selector; compose desktop dispatcher and mobile technician surfaces from
the [inspected existing assets](reuse-handoff.md). Actual PostgreSQL races,
consumer entry, responsive product evidence and owned runtime cleanup remain
required before Work Orders acceptance. The recorded local-startup rejection
remains in force and must not be bypassed.

Continuous delivery evidence remains narrower: compatible local upgrade, retained
data, rollback and backup/restore are already demonstrated separately. No stable
hosted endpoint, production identity, provider deployment or availability promise
is established by this source work. Preview is disposable.
