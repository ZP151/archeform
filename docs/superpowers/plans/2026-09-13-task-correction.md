# Same-Task Correction Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` to execute the integrated task below. Root owns Git; no worker stages or commits.

**Goal:** A member corrects the existing task and continues its workflow without recreating it, losing entered values on a recoverable error, or overwriting concurrent work.

**Architecture:** Extend the exact canonical Task family through a separately accepted private correction contract. Reuse its existing mutation protection and workspace presentation; preserve compilation of previously published Task Graphs byte for byte. The ordinary user sees business actions, while immutable publication and assembly remain platform responsibilities.

**Tech Stack:** Existing TypeScript, Application Graph V1, React, Prisma/PostgreSQL, native form controls and approved Lucide assets. No dependency or service change.

## Global constraints and authority

- Baseline: clean `5b65169e56c834f2a466539ee81ec020e76541c3` in the existing consumer-delivery worktree.
- English code, tests, documentation and UI; no credentials or raw model material in evidence.
- Root's active goal includes implementation, actual local acceptance, exact cleanup, normal branch delivery and definition-scale handoff.
- Tech Lead owns a proposed ADR; a qualified independent reviewer and PM's recorded standing acceptance precede production writes. The accepted ADR governs exact routes, fields, selectors and responses.
- One serialized production owner handles all shared compiler/Graph/adapter/Workbench/worker contracts. An acceptance owner may write disjoint E2E paths after that contract is frozen.
- One full review boundary for this integrated contract; ordinary fixes reuse valid evidence. No main integration, repository release, live model call or cloud deployment.

## Product design and reuse decision

The primary user is a member maintaining a shared local task board. Assignee is display text, not verified identity or private ownership. Viewer remains read-only. Correction concerns title, optional description, assignee, due date and priority on the same ID. A completed task is reopened before correction; correction does not itself complete or reopen work.

Use the current task workspace, list summaries, native labelled inputs, cobalt tokens and accessible icon controls. Registry and recipe searches found the existing generated workspace and form ports suitable; `task-workspace-presentation.ts` already composes `approval-workspace-presentation.ts`. Reuse `mutation-write-protection.ts` through the Task adapter. No new visual asset or registry key is needed for styling. Approval's correction mechanics are a reference for recovery, not a reason to duplicate its entire runtime.

An inline prefilled editor keeps record identity and surrounding business context visible. Save and Cancel are explicit business controls; routine Refresh and Clear remain icon-only. Keep pending/unknown actions mutually exclusive with other writes on that record. Invalid input and recoverable service failure retain values; a conflict retains the user's intended correction but requires deliberate review of the latest version before a fresh activation. Never automatically overwrite using a newly fetched version.

Rejected alternatives: creating a replacement task loses continuity; silently updating existing published semantics violates immutability; redesigning the board or adding a UI package does not close the business gap. The current approved layout remains the visual target.

## Integrated task: correction with compatibility and actual acceptance

The exact proposed contract is
`docs/adr/adr-0064-team-task-same-record-field-correction.md`, frozen SHA-256
`84d6d8d3adae7ad6c712674961523154e1c0a354b2b3a2a796dba2d8221009a0`.
PM records acceptance separately before implementation. The unique Member Task
grant gains `update`; this selects private `factory.generated.task-mutation/v2`
and presentation `1.1.0`. Old grants retain their exact v1 output.

The generated API adds only `PATCH /api/:taskEntity/:recordId`, requiring the
existing actor/session headers and one bounded idempotency key. Its body is:

```ts
type TaskCorrectionRequest = {
  expectedVersion: number; // Nonnegative safe integer, displayed base version.
  values: {
    title: string;
    description: string | null;
    assignee: string;
    dueDate: string;
    priority: "low" | "medium" | "high";
  };
};
```

All five keys are required; no other keys are accepted. Existing validation
governs required text and dates. `200` returns the exact current eight-field
Task command response with same ID/status and version incremented once. Error
codes remain `task.invalid_request`, `task.denied`, `task.not_found`,
`task.version_conflict` and `task.idempotency_conflict` with their existing safe
shapes. The `/events/update` alias remains denied. No database shape changes.

A focused contract case must assert the independent expected outcome directly:

```ts
expect(updated).toMatchObject({
  id: created.id,
  status: "not-started",
  version: 1,
  title: "Review the launch checklist",
  description: null,
  assignee: "Riley",
  priority: "high",
});
expect(replayed).toEqual(updated);
expect(audits.filter((event) => event.action === "update")).toHaveLength(1);
```

Here `created`, `updated`, `replayed` and `audits` are outcomes from the existing
generated runtime harness, not a new production API. Preserve explicit expected
business versions and counts in acceptance; do not derive expected values from
the implementation's own mutation log.

**Source responsibilities:** Task definition projection in `packages/adapters/src/requirements/task-definition-selection.ts`; exact family recognition in Graph/capability/Workbench paths identified by the ADR; generated routing/runtime and Task contract/presentation in `packages/compiler/src`; immutable graph-derived journeys in `apps/compiler-worker/src/verifier/verification-graph-plan.ts`. The ADR and ledger freeze the final exact write manifest before implementation.

**Existing test assets:** `packages/compiler/test/task-mutation-runtime.test.ts`, Task compatibility tests, adapter/Graph/capability/Workbench/worker focused suites, `e2e/consumer-task.spec.ts`, `e2e/consumer-task-ui.spec.ts`, `e2e/task-presentation.ts`, and `scripts/emit-composed-ui.mjs`.

- [x] Build unchanged compiler dependencies and capture the delivered Published Task Graph and lock in `task-correction-legacy-baseline.json`. Its 63-file ordered bundle digest is `3d7ce570279b2caa501a3b458e6f4503ef13f1efa76b308640ad52da01bf4bac`.
- [x] Run the new compatibility test and unchanged non-Task compatibility test against the baseline: two files/two tests pass. Do not regenerate either baseline after production changes.
- [x] Freeze and independently accept the bounded correction ADR; append exact SHA, reviewer identity, verdict and authority to the ledger.
- [x] Write focused failing tests for new canonical activation, strict correction validation, authorized editable states, exact unchanged-status/same-ID response, version increment and audit/receipt atomicity before implementing each behavior.
- [x] Extend the existing shared runtime and UI within that contract. Old Graph selectors retain their old generated bytes. Keep received payload hashing distinct from normalized stored values.
- [x] Prove replay after reconstruction, changed-body conflict, same-version race, authorization before replay, rollback at persistence boundaries, missing record, invalid/completed-state denial and generated API/store parity.
- [x] Run affected package tests/typecheck/build/lint once integrated. Retain the original non-Task and newly captured old-Task bundle hashes.
- [x] Exercise actual emitted React/CSS first, using the existing ephemeral local HTTP helper. Test Save/Cancel, pending lock, validation/service failure, unknown retry, conflict/draft continuity, role changes and filter/result continuity before an expensive generated-runtime run.
- [x] Complete independent task review, then authorize one isolated local Factory acceptance lane tied to source/image identities. Reuse the actual Task lane and extend correction cases rather than duplicating lifecycle orchestration.
- [x] Prove actual persisted correction and recovery; inspect phone/tablet/desktop screenshots and record all relevant outcomes in the acceptance evidence.
- [x] Clean exact Factory and Preview projects, verify resource zero, complete independent Terra QA and Sol release review, reconcile PM acceptance and product scorecard.
- [ ] Root creates a bounded English commit, pushes the iteration branch normally and verifies local/remote equality and clean status before closing the goal.

## Predeclared acceptance matrix

| Dimension              | Concrete outcome and method                                                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fidelity               | Canonical Task includes the accepted correction behavior; unsupported identity/private assignment and unrelated features remain material exclusions. Keep semantic Graph identity separate from database lifecycle IDs.                                                                                                     |
| Effort                 | Prepared local authored fixture reaches a usable app within five minutes, with zero technical handoffs or in-run manual rescue. Report attempts independently; fixture performance is not real-model or ordinary-user evidence.                                                                                             |
| Business               | Create, correct all five business fields on the same ID, start, correct while active, complete, deny terminal correction, reopen and correct again; reload authoritative results.                                                                                                                                           |
| Access and concurrency | Viewer cannot write; stale version yields safe conflict without overwrite; one successful correction yields exactly one version increment, audit and receipt; changed-payload replay cannot mutate.                                                                                                                         |
| Recovery               | Cancel writes nothing; invalid/service-error form keeps inputs; dropped committed response retries the same payload/key after API restart; no duplicate outcome. Conflict does not auto-save, erase the intended values or disappear after refresh/filter changes.                                                          |
| UI and assets          | At 390/768/1440 inspect actual list, prefilled edit, saved result, pending, conflict and retry states. Preserve deliberate cobalt hierarchy, readable task summaries, reachable primary action, no document overflow, 44 px controls and valid focus/labels. Run loaded CSS/icon checks plus their negative asset detector. |
| Compatibility          | Full old Task ordered bundle hash and all delivered non-Task hashes remain unchanged. Compiler input remains immutable Published Graph plus digest-bound lock.                                                                                                                                                              |
| Delivery               | Real generated PostgreSQL/API/browser results, source and runtime identities, safe aggregate persistence evidence and exact cleanup; no hosted or authenticated identity claim.                                                                                                                                             |

## Product tracking and next executable slice

Correction does not add a product definition: count remains four definitions / three demonstrated families. Report completion of the Task journey separately from product maturity, selection quality and hosted readiness.

Next: propose a data-based definition format and batch validator within proven family boundaries. Begin with the four current definitions as round-trip fixtures and a deliberately small representative batch. A definition must declare its distinct user job, semantic fields, roles, rules, exceptions, correction journey, presentation bindings, locked capabilities and provenance. Reject cosmetic duplicates and unsupported semantic variation. Track new definitions admitted without handwritten runtime/UI as the scale metric; only then grow toward 30, 100 and hundreds. This next contract needs its own bounded decision and does not become implemented through roadmap prose.
