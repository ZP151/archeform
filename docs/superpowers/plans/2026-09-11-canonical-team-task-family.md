# Canonical Team Task Family Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the one serialized integration task below. Root owns disjoint runtime acceptance and Git.

**Scheduling correction (2026-09-12):** Production is held for the approval correction/decision-closure priority. The dispatched agent failed before writing code. Preserve this frozen experiment as planned scope, not delivered capability. Its non-Task byte baseline must be explicitly rebased after any accepted shared UI refinement.

**Goal:** An ordinary user can generate a shared team task application in minutes and complete a create/start/complete/reopen journey through reusable assembly.

**Architecture:** A reviewed private `team-task-tracking` definition supplies the immutable Graph composition; the model selects the definition rather than writing an app. Structural family recognition connects the existing consumer delivery flow to a task presentation composed from the repaired workspace and existing CRUD/workflow/finder behavior.

**Tech Stack:** Current accepted TypeScript, Zod, React, Next.js, NestJS, Prisma, XState, Casbin and existing local SVG assets. No package, runtime or topology change.

## Global constraints and decision

- Base: shared workspace repair commit `2d15323977df174f2d86780f369c0c303cbc6957`, already pushed and remote-equal.
- ADR-0057 is standing-accepted in the ledger at SHA-256 `8ee8ff2870369bed43d076ab8ff8d63653138d761c9970ace9358dd9d5465017`; implementation follows the recorded serialized ownership.
- Exact canonical fields, states, roles, pages, unsupported semantics and reuse manifest come from ADR-0057 TSK-001 through UI-002. No inferred identity or owner/assignee restrictions.
- Add only `start`, `complete`, `reopen` to the Blueprint V1 vocabulary and synchronize all strict consumers atomically. Unknown verbs remain invalid.
- Draft -> Publish -> immutable Compilation, server role/state authorization, current Graph/API identifiers and historical outputs remain intact.
- All source/tests/UI/docs are English. Retain license notices. No raw model messages or credentials in evidence.
- No new dependency/public registry/export, dynamic plugin, notification claim or managed deployment.
- Preserve exact legacy, Restaurant and approval emitted bundle bytes. Approval final digest is `0d88224154e7f9cbc9fe884b93a217c727ff589f7acf0514c35d8ed755e7b573`.
- Counts stay three definitions/two runtime families until the entire Task journey passes acceptance; then four/three. Style variations do not increase business-definition counts.

## Reuse and visual direction

Follow the ordered lookup recorded in ADR-0057: native primitive controls, state/navigation patterns, existing recipes, repaired compiler workspace and pinned studies. Existing approval workflow copy cannot express Task semantics; no upstream study adds the required business contract. The only new private asset is `task-workspace-presentation@1.0.0` with factory provenance and exact tests.

Keep the repaired compact sidebar/mobile disclosure, record finder, restrained row separators, typed form and status-only badge accents. Adapt record information to the task: title first, priority, due date, assignee and status visible. Long description and ID live in Details. Use Graph labels without approval-specific copy. Do not decorate a working task list with unrelated photography or introduce another UI framework.

## Task B3: One serialized integration slice

The integration writer owns only:

- `packages/graph/src/product-blueprint.ts` and `packages/graph/test/product-blueprint.test.ts`: bounded additive action vocabulary.
- `packages/adapters/src/requirements/task-definition-selection.ts` (new): canonical definition, exact schema, guide and projection.
- `packages/adapters/src/requirements/definition-selection-catalogue.ts`, `packages/adapters/src/requirements/openai-interpreter.ts`, `packages/adapters/test/requirement-interpreter.test.ts`: registration, strict provider grammar/instructions and unsupported semantic cases.
- `packages/capabilities/test/plan-alternatives.test.ts`, `packages/capabilities/test/product-composer.test.ts`: prove existing composer handles exact Task fields/grants/pages/flows with the same six locks; no planner rewrite authorized.
- `apps/workbench/lib/product-journey/consumer-family.ts`, `apps/workbench/lib/product-journey/use-consumer-generation.ts`, `apps/workbench/lib/product-journey/use-consumer-generation.test.tsx`, `apps/workbench/components/workbench-home.tsx`, `apps/workbench/components/workbench-home.test.tsx`: checksum-bound structural recognition, truthful Task delivery labels and zero technical handoffs.
- `packages/compiler/src/approval-workspace-presentation.ts`, `packages/compiler/src/task-workspace-presentation.ts` (new), `packages/compiler/src/index.ts`, `packages/compiler/test/composition-page-runtime.test.ts`: private reusable helpers, truthful task output and exact non-Task preservation.

Root owns the new `e2e/consumer-task.spec.ts`, new `e2e/consumer-task-fixture.ts`, new `e2e/task-presentation.ts`, acceptance evidence/docs, plan, ledger/status and Git. No production writer edits these. Frozen contract changes stop the writer and return to Tech Lead; routine internal implementation choices remain autonomous.

Interfaces: adapter exports its canonical interpretation and definition entry only through its private module. Public adapter API remains the existing interpreter. Task E2E requests `team-task-tracking` through that public interpreter using a deterministic provider fixture. Consumer family adds `task` after existing checksum/lock validation. Compiler emits `task-v1` only for the frozen lifecycle/grant shape. Existing generic CRUD/event routes and response/error formats do not change.

- [x] Record exact independent ADR acceptance and production ownership in the ledger.
- [ ] Add focused RED tests for the three new verbs, canonical structure, strict unknown/non-null/mixed selection rejection, and all unsupported assignment/private-account requirements.
- [ ] Implement synchronized Graph/provider enums, exact Task projection and static family registration. Retain byte checks for all existing definitions.
- [ ] Run Graph and adapter focused tests; fix actual failures before continuing.
- [ ] Add and run RED capability and Workbench tests for six exact locks, bindings, permissions and checksum-bound structural selection, including renamed keys and falsified grants/transitions.
- [ ] Implement structural consumer recognition using existing delivery state flow; generic composer must prove Task works without hidden approval aliases.
- [ ] Add compiler RED tests for title/priority/due/assignee summaries, all three event buttons/icons and safe long/empty values; preserve finding, pending/race/error/role behavior.
- [ ] Extract minimal presentation-neutral helpers, keep approval bytes, and assemble Task output from the frozen contract. Run final emitted TSX/CSS diagnostics before actual runtime. Reject clipped navigation, overlap, sparse oversized rows or approval copy.
- [ ] Run affected package checks and focused suites; run complete suites for changed shared contracts/packages once. Reuse valid unaffected evidence for later small corrections.
- [ ] Independent task review checks specification and implementation. Fix concrete issues within frozen ownership.
- [ ] Root authorizes one provider-free actual runtime after source freeze, with current topology and exact project/image identities. Run business and actual visual cases below, retain failure/repair attempts honestly and clean only exact resources.
- [ ] Independent QA evaluates actual business/regression/adversarial evidence; independent release review follows at this shared-contract boundary. These are the delivery-policy gates for this cross-package slice, not per-component reviews. No extra cosmetic gates.
- [ ] Root records bounded acceptance, product metrics and source/evidence/cleanup identities; commit and normally push the active branch and verify equality. No main, repository release or cloud deployment.

## Verification commands

Use the existing package scripts and frozen dependency installation. In the worktree:

- `pnpm --filter @factory/graph exec vitest run test/product-blueprint.test.ts`
- `pnpm --filter @factory/adapters exec vitest run test/requirement-interpreter.test.ts`
- `pnpm --filter @factory/capabilities exec vitest run test/plan-alternatives.test.ts test/product-composer.test.ts`
- `pnpm --filter @factory/workbench exec vitest run lib/product-journey/use-consumer-generation.test.tsx`
- `pnpm --filter @factory/compiler exec vitest run test/composition-page-runtime.test.ts`
- Run package typecheck/build/lint where defined; full Graph/adapter/Workbench/compiler suites cover shared consumer changes. Inspect every result and avoid duplicate reruns without a new failure/change.
- After separate runtime authority: `pnpm exec playwright test e2e/consumer-task.spec.ts --workers=1 --retries=0` with exact isolated loopback settings and empty model keys.

## Predeclared business, effort and presentation acceptance

| Dimension         | Task-specific case                                                                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Need fidelity     | Canonical shared board selected from reviewed definition; identity/private access/integrations/custom workflow demands yield material clarification, never silently infer accounts from assignee text.                                                |
| User effort       | Prepared local fixture ready within 5 minutes, zero technical handoffs and no in-run rescue; measure interpretation count, questions, ready and task-completion times separately.                                                                     |
| Main journey      | Create two tasks with distinct titles/assignees/dates/priorities; start and complete one, filter completed, reopen it so it leaves the filter with retained success feedback, complete again, reload exact values/status.                             |
| Finding/recovery  | Search plus status, one-action clear, no-match distinct from empty database, safe service failure and recovery, pending protection and stale role callbacks.                                                                                          |
| Access            | Viewer can read, cannot create/start/complete/reopen; direct real API 403 for each prohibited action. Invalid member state transitions also fail. No authentication/tenant claim.                                                                     |
| Visual            | Actual phone/tablet/desktop results and phone/desktop form plus filtered/no-match states. Readable title, due date, priority, assignee and status; useful approved icons; no approval labels or technical footer.                                     |
| Responsive        | 390/768/1440, full route labels in one mobile disclosure activation, current-page accessible name, first permitted action by 650 px and two ordinary identifying summaries in 390 x 900, no overlap/overflow, 44 px controls and zero axe violations. |
| Loading integrity | Actual stylesheet HTTP/content type, computed task recipe/grid, resolved tokens and visible icon geometry. Negative CSS/icon controls must detect broken presentation.                                                                                |
| Delivery          | Published revision and immutable Compilation identities, real persisted runtime, exact source/image hashes, all Preview/Factory resources removed by exact label.                                                                                     |
| Regression        | All three existing definitions retain canonical bytes, and all non-Task emitted bundles remain byte-identical. Shared workspace quality criteria still apply.                                                                                         |

## Product-goal tracking and next priorities

This milestone tests whether a genuinely different workflow can reuse the same
assembly foundation. Track delivered business definitions, tested runtime families,
reuse provenance, ready time, first-task success and technical handoffs separately.
The larger supply roadmap remains 30 reviewed definitions, then 100, then hundreds
or thousands through proven family composition and bounded retrieval. This Task
experiment alone does not establish that breadth.

Next prioritize Appointment only after slot/conflict semantics, Inventory only
after stock invariants, and Content/Directory with reviewed useful media. Ordinary
user and real-model selection trials, production identity/access and managed
hosting remain major maturity work; they are not implied by local runtime success.
