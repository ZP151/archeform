# Team Task Integration Implementation Report

## Authority and ownership

- Base: `d28f1fedf4fa0aaefe3e81492cabd857db69d8cb`.
- ADR-0057 SHA-256: `8ee8ff2870369bed43d076ab8ff8d63653138d761c9970ace9358dd9d5465017`.
- Accepted ADR-0063 SHA-256 verified: `8d5b2042a798b98f130fe7265f6e1bc1389bd67f618cf1f35a9ce0d8b966ea68`.
- Root authorized serialized production and focused local checks. Only ADR-0057 MIG-001 and ADR-0063 MIG-002 paths. Root owns docs/Git/compatibility; runtime author owns Task E2E. No services, Docker, provider, Publish or Git mutations.

## Incremental evidence

1. Graph Task vocabulary RED: three missing verbs failed; unknown verbs stayed invalid. `pnpm --filter @factory/graph exec vitest run test/product-blueprint.test.ts` GREEN 24/24. Graph build passed.
2. Canonical adapter RED: unregistered Task projection and clarification cases failed. Focused `requirement-interpreter.test.ts -t 'canonical Team Task definition'` GREEN 8/8. Canonical Task normalizes through the existing parser before catalogue byte checks. Existing definitions unchanged.
3. Workbench structural family RED: exact and permuted Task returned null. Focused `use-consumer-generation.test.tsx -t 'Task'` GREEN 18/18, including independent field/type/requiredness/options/grant/actor/page/state/transition/checksum/lock/binding falsifications. Existing lifecycle hooks reused. Binding application identity comes from the review authority, because CompositionPlan contains no applicationId field.
4. Workbench Home Task scope RED captured (missing Task delivery); in-scope copy implemented, GREEN pending.
5. Compiler RED: Task presentation, Task command runtime and shared write-protection port absent.
6. Extracted common canonical hash, key validation, scope identity, replay, receipt-before-write transaction opening, conditional version write, receipt persistence, transaction retries, memory receipt methods and Prisma receipt/conditional methods to compiler-private `mutation-write-protection.ts`. Approval retains its call sites/business behavior; Task key storage is fixed sha256-v1.
7. `pnpm --filter @factory/compiler exec vitest run test/mutation-write-protection.test.ts test/task-compatibility.test.ts` GREEN 2/2. All three existing definition hashes and ten full ordered bundle hashes preserved after extraction.

8. Task definition/composition/immutable separate-lock compiler path, private Task UI, strict API/runtime/schema/Prisma adapter, shared workspace shell/styles/data controls/record hook implemented. Workbench Home focused Task GREEN; renamed/permuted Graph symbols GREEN after correcting test acceptance-journey actor references.
9. Task runtime focused GREEN includes complete versions 0 through 4, receipt reconstruction, exact audit counts, digest-only receipts, denied/malformed/stale/conflicting requests, concurrent creates and version races, and generated strict API/React/store typecheck.
10. Root independent actual-emitted Chromium initially passed phone/tablet/desktop plus axe. Its observed tablet summary gap received a focused RED assertion; Task-only medium-width CSS fix built for root recheck. Semantic DOM: `main.task-v1`, `.task-records > li.task-record`, `.task-summary`; Create Task, Created Task., explicit Retry and fixed unknown/conflict messages.
11. Tech Lead KEEP / PM authorized private worker extension in `role-journey.ts`, `probes.ts`, `verification-probes.test.ts`: optional `idempotencyKeyOverride`, existing regex, requires one declared parent key, replaces only that value after principal/session assembly; undefined retains exact old path. Focused RED 2 -> GREEN 2, no keys in evidence.
12. Worker Task request-plan RED -> GREEN: exact bodies/statuses, fixture identity, stored-success replay, five distinct deterministic activation keys through create/start/complete/reopen/final complete. Other entity writes excluded only for exact Task.
13. Exact incoming JSON request identity test RED exposed normalized absent/null description collision. Task hashes validated incoming body; object property ordering remains canonical. GREEN.
14. Memory rollback GREEN at create, conditional update, audit and receipt boundaries; retry same activation recovers once. Executed generated Prisma adapter GREEN for persisted reconstruction, serializable retry, conditional races, versions 0 through 4 with exact five audits/receipts and zero effects; transactional fake delegate rollback covered create/updateMany/audit/receipt. This is adapter evidence, not live PostgreSQL evidence.
15. Compiler selector GREEN for renamed/permuted composer output, bounded candidate shape conflicts, arbitrary event/mismatched binding non-candidates, and infrastructure mutation denial/read retention. Full affected package tests/build/typecheck/lint starting at completed implementation boundary.

## Reuse preparation

Ordered lookup inspected approved primitive/pattern/workbench/generated registries, screen/experience/product recipes, existing Workbench and compiler templates, and source-study index/inventory. Native controls, compact navigation, states, generated finder, tokens and seven approved Lucide assets apply. Restaurant recipes own commerce-specific bindings; Workbench source stays outside generated runtime. No copied upstream assets, dependencies or public registry keys. New Task private presentation owns task title/priority/assignee/due/status semantics.

## Remaining implementation

Full affected checks and resulting routine fixes; self-review; parent-owned independent browser/runtime/release gates. No live provider, database, Docker or service execution performed by this owner.

## Completed verification and source freeze

- Full Graph suite: 21 files, 667 tests passed.
- Full Capabilities suite: 33 files, 405 tests passed.
- Full Adapters suite: 194 passed, one old provider-schema branch-count assertion failed because Task adds a branch. Updated expected count from four to five; focused Restaurant/Task provider checks passed 2/2. The complete 148-test interpreter file had no other failure.
- Full Workbench suite: 616 passed, one pre-existing approval simulator expectation used rejected instead of accepted returned. Root owns the one-line correction; focused simulator suite passed 5/5. All touched Workbench tests passed in the full run.
- Full compiler suite: 43 files passed, 736 tests passed, two Task failures. One exposed an over-restrictive states[0] check despite Graph's explicit initialState; selector and worker mirror now ignore Graph state declaration order. The other exposed unreachable legacy method bodies after infrastructure write denial; exact Task emits fixed generic denial method bodies. Focused fixes and generated strict API/store/React tsc passed.
- Final compiler Task/port/non-Task compatibility run: 3 files, 28 tests passed; all three previous definition hashes and all ten complete ordered bundle hashes remain exact.
- Full worker suite: 20 files, 313 tests passed. Post-selector-change focused Task/header override probes passed 3/3.
- All six affected package typechecks and lint checks passed. Graph, Capabilities, Adapters, Compiler, Worker package builds and Workbench optimized production build passed. Final changed-file formatting and git diff whitespace check passed.
- Root independently reproduced and tested the P1 conflict-message loss on version remount/filter removal. TaskRecords now retains the conflict alert before refresh; local record feedback does not duplicate it. Root's permanent emitted UI lane passed with conflict/remount/filter continuity, 390/768/1440, axe, asset/style negative controls and explicit tablet positions. Latest tablet image inspected and accepted by root.
- Self-review found an event-route alias accepting operation create with a record ID. Focused RED reproduced the extra path; Task now denies create when recordId is supplied. Focused alias + emitted strict typecheck GREEN 2/2 and final compiler build passed. Existing canonical Create remains unchanged.

Source is frozen for independent task review and parent-owned actual runtime evidence. No live database/provider/Docker/service/Publish/Git mutation was performed by this implementation owner. Prisma evidence above executes the emitted adapter against a transactional delegate harness; it does not substitute for live PostgreSQL evidence. Full suites were run once; only failed/changed focused paths were rerun. Parent owns compatibility baseline, all policy/docs/Git and runtime acceptance artifacts; this owner did not edit them.

## Actual runtime attempt 1: Workbench identity correction

Root's first Factory run reached one interpreted response and one planned CompositionReview, with zero Publish/Compilation calls and no Task delivery region. Read-only narrow SQL inspected only review/Graph IDs, status and declared bindings. It confirmed `review.applicationGraphId` is a database CUID, while `draft.graph.metadata.id == requirement.requirementId`, and principal/session bindings use that Graph key. `ProductCompositionService.createProductRequirement` creates the blank Graph with applicationId=requirement.requirementId.

The Workbench selector incorrectly used the database row ID for semantic identity binding checks. The regression fixture previously hid this distinction. Updated it to a proper public interpreter envelope, a requirement-derived Graph identity and a separate database row ID; focused RED reproduced null family. Selector now uses checksum-validated spec.requirementId and retains all nine exact binding checks. Added negative coverage for identity bindings aimed at the database ID, and verified automatic standard selection. Entire consumer hook file GREEN34/34; Workbench typecheck passed. Local Workbench optimized production build passed (exit 0); changed-file formatting and diff whitespace checks passed. Root owns service rebuild and next actual run. No provider/service/database writes or new Publish run by this owner.
