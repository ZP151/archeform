# Task correction implementation evidence

Baseline: 5b65169e. Implementation authorized under frozen ADR-0064.

Focused red: `pnpm --filter @factory/compiler exec vitest run test/task-mutation-runtime.test.ts -t "same-record Task correction"`: five failures at the unsupported Task contract selector, before production changes.
Focused green after runtime implementation: the same command passed five tests (memory and Prisma replacement, reconstruction replay, changed-body rejection, authorization, version race, state policy and three Prisma rollback boundaries).

Canonical producer red: `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts -t "canonical Team Task"`: one failure because the expected update grant was absent, seven passed.

Worker red: focused v2 correction-chain test failed because task.update was absent. Worker focused green: 30 tests passed, including explicit correction chain versions and old v1 journeys. Direct pure-function comparison with the authentic baseline source from git and the frozen legacy Task input confirms unchanged legacy verifier plan SHA-256 `d7de60d2467edeb4d6ba92436df319553744ef86fc4fc079bc97f9c57a6cd71b`.

Expanded focused checks: Graph product-blueprint 24 passed; adapter requirement-interpreter 148 passed; Workbench generation/home 60 passed; capabilities alternatives/composer 20 passed after updating the old canonical grant assertion (the expected update addition was first observed as a focused failure). Compiler database parity 60, compilation plan 55 and composition runtime 39 passed. Both emitted Task profiles passed strict API/store/React typechecking. Additional correction tests cover all missing/invalid field keys, Factory-owned values, malformed bodies/keys, incoming date representation hash identity, authorization precedence, memory rollback and malformed structural selection. Test fixture setup errors were corrected without changing expected business outcomes.

Legacy bundle checks: old Task 63-file compatibility and permanent non-Task compatibility passed. No baseline files regenerated. Compiler build and compiler-worker typecheck passed. Browser acceptance remains independently owned.

## Finished package boundary

- Workbench: complete test (49 files, 619 tests), typecheck, build and lint passed. Existing React act/Happy DOM teardown and Next workspace-root warnings were emitted, with successful exit status.
- Adapters: complete test (11 files, 195 tests), typecheck, build and lint passed.
- Capabilities: complete test (33 files, 405 tests), typecheck, build and lint passed. Only the approved canonical Member-grant assertion changed.
- Compiler-worker: complete test (20 files, 315 tests), typecheck, build and lint passed. After the mirrored missing-list guard fix, focused verifier tests passed 31/31 and typecheck/build/lint passed again.
- Compiler: full inventory ran 45 files and 762 tests; 761 passed and the single new missing-list regression failed against the pre-fix module loaded when the suite started. The failure was fixed in both private selectors. On the final source, task-mutation-runtime plus both compatibility suites passed 51/51, including all 49 Task tests and strict v1/v2 generated API/store/React checks. Compiler typecheck, build and lint then passed. Unaffected full-suite evidence was retained rather than rerunning the entire compiler inventory.
- Browser acceptance owner reported two fast emitted-UI tests green and inspected the corrected 390px editor: no overflow, 44px controls, first-field focus, correct title/state context and no replacement glyphs. Actual runtime acceptance remains separately owned and is not claimed here.

The independent reviewer and implementation tests initially shared test/.typecheck/task, causing one independent missing-file typecheck failure during concurrent cleanup. The harness now uses mkdtempSync beneath the existing validated test/.typecheck root, with unchanged contained cleanup. Production code was unaffected by this harness isolation.

## Scope and handoff

Production source: packages/adapters/src/requirements/task-definition-selection.ts; apps/workbench/lib/product-journey/consumer-family.ts; apps/workbench/components/workbench-home.tsx; packages/compiler/src/task-mutation-contract.ts; packages/compiler/src/task-workspace-presentation.ts; packages/compiler/src/index.ts; apps/compiler-worker/src/verifier/verification-graph-plan.ts.

No Graph or capability production change, shared write-protection change, new dependency, schema/storage migration, provider/service operation, Git mutation or deployment was performed. Root retains Git and acceptance orchestration. Current definition/family counts remain four/three. Local demo roles and display-only assignee remain the identity limits.

Final isolated strict-harness verification: both emitted v1/v2 typechecks passed (2/2); compiler lint and git diff --check passed. All implementation-owned test sessions stopped.

## Actual verifier repair after attempt 2

The failed task-recomplete probe reproduced through the real VerificationEnvironment: the v2 planner supplied description:null but the established bounded fixture validator admits primitive strings/numbers/booleans only. That threw invalid_request_body before fetch. The next update probe had a separate latent integration failure: its declared fresh-record chain was validated but never executed by runIdempotencyProbe, leaving the record route unresolved and throwing invalid_request_path. The observed top-level step order matched the current planner, which overrides task-recomplete while appending update and denial probes; it was not evidence of a stale v1 plan.

Authorized bounded repair: use a synthetic description string in the Task-only fixture; execute the already-declared idempotency chain through existing runChainPrologue, stop on prerequisite failure, and substitute the captured record ID into both first and replay requests. No request-body, header, authorization or route limits changed.

Focused red: generated recomplete/update/denied-update through actual bounds and probes failed 3/3 with the exact body/path errors. After fixture-only repair recomplete and denied-update passed while update and a new failed-create short-circuit regression still failed on unresolved paths. After the probe repair, four focused suites passed 134/134 (probes53, graph-plan31, environment21, lifecycle29). Tests drive emitted Task commands through a real VerificationEnvironment and actual probe executor: recompletion reaches version6 with one completed-edit403, fresh update replays exactly with one audit/version increment, Viewer update is403, and a failed create prevents every PATCH/replay. Existing no-chain replay cases remain green. The legacy Task verifier plan SHA-256 remains d7de60d2467edeb4d6ba92436df319553744ef86fc4fc079bc97f9c57a6cd71b.

Repair source SHA-256: verification-graph-plan.ts 355926e5307ef2266e85c6460731e217e8504520bb780d2037a1f62412d793b4; probes.ts 9480cf6d66f2808348d5d2a982aebf1af605a7cb1cee48207c048eef19b37374; verification-probes.test.ts 3c8362ad2d5f025857d18f18c2311f931347dc471bbd9cb44b9db0b38e9215ad.

Final repaired worker package: 20 files / 319 tests passed; typecheck and lint
passed. The root's isolated worker image rebuild also passed, using final
planner/probe source hashes. Actual attempt 4 subsequently passed the complete
generated runtime lane; see the root acceptance record for runtime outcomes.
