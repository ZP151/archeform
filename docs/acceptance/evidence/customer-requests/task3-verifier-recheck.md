# Customer Requests verifier repair 1 scoped closure

Verdict: **APPROVED for scoped task-review closure**. Open P0/P1/P2: **0/0/0**. **CR-V-P2-001 and CR-V-P2-002 are closed.** Independent QA, final judgment and PM acceptance remain outstanding.

This review covers only the two original findings, the three changed source/test files, their retained before copies and the focused repair evidence. The prior source review and unaffected evidence remain valid. This is not a new broad review or product acceptance gate.

## Identity verification

The repair manifest is `generated/.customer-requests-task3/verification/repair-1/implementation/source-manifest.json`, SHA-256 `28e2629bb4449612476513fe08e69bff3056e1a4e12413af12994bb9730a0d0e`.

All six current hashes match that manifest. Its six previous hashes match the original freeze; all changed flags are correct. Exactly these three sources changed:

| Source                                                                | Current SHA-256                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/compiler-worker/src/verifier/role-journey.ts`                   | `d43f87d1f86ad5b54adb4c0cb5b9d88f0814f08a25a8e3c9a9239a83aa8593e2` |
| `apps/compiler-worker/src/verifier/customer-requests-verification.ts` | `c2c641eaff03c8655b330d9f2ef7438efc951ed9df8a73c8e604a356b1c3fbca` |
| `apps/compiler-worker/test/customer-requests-verification.test.ts`    | `fda7f4106287fa4b3f90bdb96ce1378ab688471924c62fcfaf999c7c0c031d3c` |

The three retained `repair-1/before/` files match their original frozen hashes. `verification-graph-plan.ts`, `probes.ts` and `verification-environment.ts` remain byte-identical to the original freeze. The original six-source manifest remains `45e7f196cf8c944432b2bf35fe6e737b828f7eb43fb7def84c912cc703ac237d`. Accepted ADR-0085 remains `bcf5e50e79dce5c80a270fda6dc2bf7ca0399211d63bfaf4ed3a059b37224464`.

## Findings closed

**CR-V-P2-001 — closed.** At `role-journey.ts:402`, the private branch now precedes the historical generic property reads. It inspects the own Customer Requests descriptor, requires Object.prototype or null as the prototype, validates the exact four own data descriptors before reading values, validates the fixed action/session/registry binding, and returns the action immediately. An inherited private witness or custom prototype cannot pass; private own accessors are rejected without invocation; inherited generic payload/getter fields cannot reach the generic reader. The generic validation path itself remains unchanged. The code diff is confined to this branch reordering, prototype check and early return.

The 19 guard cases independently exercise all four own accessors with zero getter/fetch calls; seven inherited-field/custom-prototype forms; six inherited getters with zero calls; and positive plain/null-prototype own-data fixtures. Both direct validation and the actual role-journey dispatch seam are checked for negative fixtures.

**CR-V-P2-002 — closed.** At `customer-requests-verification.ts:274`, scalar equality now uses Object.is. Thus negative zero no longer equals the expected zero, and the existing recursive comparator rejects it before successful capture/digest return. No new response normalization is introduced. The production change is the equality operation plus its explanatory comment.

The seven new numeric cases use the real emitted ApplicationRuntime and InMemoryRecordStore, first prove valid responses match, then edit raw wire JSON text to preserve negative zero. They cover mutation request/event versions, detail request/activity versions, list request/activity versions, and history event versions. Each malformed result must have false comparison and no request ID, event ID or response digest. Canonical mutation digest equality is positively checked. These tests directly cover the original failure and its shared read call paths.

## Exact retained repair evidence

All paths below are under `generated/.customer-requests-task3/verification/repair-1/implementation/`.

| Evidence            | Result                                                                  | SHA-256                                                            |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `red.log`           | 26 new cases: 22 failed, 4 passed; 115 skipped; exit 1 recorded         | `22aba08a52141f4553dc390875603aa45873f33c18f9ae09ba2ae370d6790b87` |
| `focused-green.log` | 31 passed, 110 skipped; 14.26 seconds; exit 0 recorded                  | `cb8fad4293b61fb1ec59f5198c748be44ba5413160d08bf29112a75047bed925` |
| `typecheck.log`     | Worker tsc --noEmit; exit 0 recorded                                    | `f5c1091850bd703e23249632cbdcf80ac5d06ce3a128272ffcd2895adb6fc9f4` |
| `format.log`        | Assigned private comparator/test files pass formatting; exit 0 recorded | `f20510a9da4717c51c4cffee6d0dd88d6c9a723d0a83711d01216f5b48961283` |
| `handoff.md`        | Frozen scope, commands, outcomes and limitations                        | `eb1a62ffaf929ded7567fc0f5e663a462e55720ea1b58c6ef5dad31615208d7b` |

The GREEN selection is `review repair|verifies all commands|preserves generic`: 26 repair cases, four complete emitted in-memory lifecycle variants (canonical, renamed, swapped, maximum-length roles) and the existing generic update/null/nested-ID rejection witness. It is **31 passing selected tests**, not a claim that all 141 cases were rerun. The RED log contains actual Vitest assertion failures and its final 22-failed summary; the pnpm wrapper also prints a trailing command-not-found message after that failed run, which does not replace or invalidate those observed assertions.

Original 115-case focused, 274-case historical, twelve-plan equality and build receipts remain retained and are reused for unaffected behavior. No broad test, historical recapture, new probe, service execution or additional gate was performed for this closure. Read-only diff/hash inspection was sufficient because the focused tests reproduce both exact concerns and cover the repaired call paths.

The reviewer changed only this new report. No source/documentation/Git mutation, listener, startup, service, database, Docker, provider, network, cloud or cleanup operation occurred. The prior automatic startup restriction was not retried or bypassed. Evidence remains source-only; no PostgreSQL, concurrency, restart, browser, actual-local product, hosted product, deployment or release acceptance follows.
