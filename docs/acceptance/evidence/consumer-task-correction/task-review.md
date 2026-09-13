# Task Correction Independent Implementation Review

Date: 2026-09-13. Reviewer: `/root/task_correction_task_review`.

`TASK_REVIEW_PASS: yes`

Open P0/P1/P2 findings: **0/0/0**.

This is the integrated implementation task gate before actual generated-runtime acceptance. It does not claim actual PostgreSQL/browser acceptance, independent QA, release approval, production identity, hosted readiness, or deployment authority.

Reviewed the diff from `5b65169e56c834f2a466539ee81ec020e76541c3`, AGENTS, technology governance, threat model, delivery policy, implementation plan, standing-acceptance receipt, and frozen ADR-0064. The ADR SHA-256 independently matches `84d6d8d3adae7ad6c712674961523154e1c0a354b2b3a2a796dba2d8221009a0`.

The review covered canonical adapter output, Workbench recognition/copy, compiler selection and API/proxy/runtime/store emission, generated Task presentation, immutable worker verification plans, package tests, compatibility fixtures, and the final Task E2E/helper diff. No production, test, Git, provider, or service mutation was made by this reviewer; only this report was written.

## Contract and security assessment

- The exact Member update grant activates the private correction profile. Compiler and worker selectors mirror the corrected malformed-candidate guard; complete field/state/role/grant/page/binding/lock validation remains mandatory. Existing generic overlap is retained outside the lock-bound Task candidate, with dedicated compatibility coverage.
- PATCH validates the complete five-field envelope, including nullable description, before replay. Authorization precedes replay; incoming representation hashing remains distinct from normalized stored values. Existing hashed-key, scoped receipt, conditional record update, audit, and serializable transaction mechanics remain unchanged. Completed correction and the event-route update alias are denied.
- Correction preserves record ID and status, advances version exactly once, and has no workflow effects. Memory and Prisma tests cover replay, changed bodies, races, authorization, strict values, and rollback boundaries.
- The editor owns its draft above version-keyed rows. Refresh/filter changes retain intended values; unknown outcomes retain the command; conflicts require an explicit choice before another Save. Role/page remounts invalidate callbacks. The existing shell, controls, icons, and styles are reused.
- Worker correction requests use the accepted committed-version chain and distinct deterministic keys. Delivered Task verifier bytes remain covered by their baseline digest.

## Evidence reviewed

Independent compiler runtime plus both compatibility suites passed 50 of 51 cases; the sole failure was a concurrent cleanup collision in the shared temporary strict-typecheck directory. A serialized independent rerun passed both emitted v1/v2 strict API/store/React checks. The owner then replaced the fixed temporary directory with a contained unique directory and passed both checks again. The owner also completed the final Task/runtime/compatibility run with **51/51 passing**.

Both complete compatibility baselines passed independently. The delivered Task remains 63 files with ordered bundle SHA-256 `3d7ce570279b2caa501a3b458e6f4503ef13f1efa76b308640ad52da01bf4bac`; non-Task definition and bundle anchors remain unchanged.

The finished implementation report records Workbench 619, adapters 195, capabilities 405, and compiler-worker 315 passing tests, plus package typecheck/build/lint. The full compiler inventory ran 762 tests: its sole failure used the selector module loaded before the missing-list fix. The complete affected suite passed on final source; unrelated passing evidence was retained. Final worker focused checks passed 31/31.

The browser owner reported the emitted UI suite **2/2 passing**, followed by final scoped E2E TypeScript, Prettier, and diff checks passing. This reviewer inspected the 390px editor screenshot: readable title/state context, visible focus, labelled fields, reachable Save/Cancel, and no visible horizontal overflow or replacement glyphs.

Final actual-lane source includes browser Edit/Save in both editable states, a stale browser draft against an external winner, terminal denial/reopen, and a committed PATCH response dropped with `route.fetch()` then abort. It requires unknown-result UI, API restart, exact key/body retry, exact replay-response equality, changed-body denial, authoritative reload, immutable identity, and fixed audit/receipt cardinalities. These runtime assertions are prepared, not yet executed at this gate.

## Findings closed during review

- Mirrored the missing-list-page candidate guard and confirmed its focused regression passes.
- Added controlled pending correction assertions for locked fields/Save/Cancel/workflow commands and ignored repeat activation; added exact lost-response replay equality.
- Refreshed the browser after an API-driven Start before opening the next editor, removing a stale-view race in acceptance.
- Removed invalid `APIResponse.request()` use and corrected the shared response/key/DOM helper types; final scoped TypeScript check passes.
- Added an actual member `/events/update` denial assertion before the valid v0 PATCH, with final persistence counts detecting any unwanted write.
- Isolated strict-typecheck temporary directories after the demonstrated concurrent-run collision.

Reviewed final critical source SHA-256 anchors: Task mutation `22f9b217eed8d1345e9d3aebbfbd2cc6ec58dc2bc69f06cdacb6ec244401c8c5`; Task presentation `799efb4fb18f91c008cec92718b5253c89913e8c018dd8d9039ae01a1bf3f1cf`; worker verifier `3b122653d693552a357b6b6301e489aa8acfe4f90673750406eab47d4dc4cccf`; actual E2E `0c60b5e029fa8be7921912fa0363dc7f70ff016643e0b85e07bf28d22ad6ecb0`.

Proceed to the already planned isolated actual acceptance, independent QA, release review, PM reconciliation, and controller delivery. No new component-specific gate is introduced.
