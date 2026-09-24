# Unresolved requirement recovery evidence

Status: source review and deterministic QA pass; actual browser acceptance pending.
Date: 2026-09-24. Source base: `7a85d6efd946ffd9d1a826771e0e12a187a85b92`.
Decision: accepted ADR-0078, SHA-256
`d607d8a57b9a90625d339fe17d141b8363bab2b07279ac47af047bcf9db0f6d6`.

## Implementation checks

The assigned writer reports focused RED/GREEN evidence for typed refusal, closed
V2 parsing, retained submitted context and the Home recovery controls. Its final
handoff reports 164 Workbench tests passing across eight files, adapter suites
187 passing before the later 10-case first-valid/malformed-first matrix, and
passing adapter/Workbench typechecks and builds. These counts are overlapping
checks, not a combined unique-test total.

The authored provider-free E2E case is
`e2e/unresolved-requirement-follow-up.spec.ts`, SHA-256
`6ceb60bdb94df6a17c3fd227c8cecafc7461249a5751034ea3c6907d879e00d0`.
Playwright discovery lists the 390x844 and 1440x900 cases. Discovery and unit
tests do not prove browser usability, rendered appearance or model quality.

## Pending actual Home evidence

Root prepared the ignored owner record
`generated/.scope-recovery-468bf3f95cdc/owner.json`. The production build uses a
dummy backend origin; the authored case intercepts its known routes and aborts
unknown backend/API traffic. No provider calls or real Control Plane are needed.

The automatic approval review rejected the command to check the reserved ports
and start local Workbench on `127.0.0.1:64087`: `blocked by policy`. The command
did not run. No server was started and no alternative startup or bypass was
attempted. Therefore there are no actual browser screenshots, timings or accepted
390/1440 outcomes for this slice yet. The earlier inventory screenshots describe
that earlier product and cannot fill this gap.

Root ran `pnpm regression definitions`: exit 0, all eight steps passed
(build, tool tests, validation, case index, adapter tests, Prisma generation,
emitted control tests and compatibility tests). `git diff --check` also passes.
Independent `scope_recovery_task_review` closes P0/P1/P2 at 0/0/0: code is
ready for independent QA, without claiming actual browser acceptance. It
confirms the accepted ADR digest, full-validation-before-refusal ordering,
closed V1/V2 mapping, retained context, revision admission and current lifecycle
callers. Independent Terra `scope_recovery_qa` closes deterministic findings at
P0/P1/P2 0/0/0 with these independently executed commands:

```powershell
pnpm --filter @factory/adapters test -- requirement-interpreter.test.ts supplies-stockroom-definition.test.ts
pnpm --filter @factory/workbench test -- interpret-contract.test.ts route.test.ts journey-model.test.ts use-product-journey.test.tsx workbench-home.test.tsx requirement-composer.test.tsx clarification-panel.test.tsx
git diff --check
```

Results: adapter 192/192 and Workbench 129/129 pass, each command exits 0.
QA confirms exact accepted ADR and E2E hashes, refusal/repair compatibility,
closed errors, retained independent needs, pending-edit/stale response safety,
and zero lifecycle entry while unresolved. Its narrow judgment explicitly
excludes the unexecuted actual browser case. The frozen source identities are
recorded in [source-manifest.json](source-manifest.json).
Do not mark ADR-0078 accepted, commit its implementation as delivered, or expand
automatic consumer coverage from these incomplete checks. Product counts remain
10 registered / 10 locally accepted definitions / 6 runtime families; automatic
consumer entry for Appointment, Directory and Inventory remains the ADR-0079
next slice.

After review/QA, the implementer finished and root verified all 21 source hashes.
PM then handed the overlapping Workbench files to ADR-0079 Task 2 serially, with
an exact pre-edit snapshot in `generated/.consumer-family-task2-base-7a85d6ef/`.
The original manifest remains the identity of this reviewed implementation;
subsequent shared-file changes must preserve recovery and receive focused review.
Final actual browser acceptance must exercise recovery against the combined
source. This handoff does not mark either slice accepted or retry blocked startup.

## UI reuse record

The writer's pre-implementation search, preserved from its dispatch handoff,
followed the required order: approved primitive/pattern/Workbench/generated UI
registries; screen/experience/product recipes; existing Workbench components and
compiler templates; then the pinned source-study README and candidates.

Existing `RequirementSummary`, `ClarificationPanel` and `RequirementComposer`
satisfy the recovery contract. The changes add submitted-answer labels and a
revision mode to these controls, with one scoped explanation and primary action.
No candidate requires copying, no new registry key or package is introduced,
and no separate recovery screen asset is needed. Focused interaction tests cover
these parameters; rendered visual acceptance remains pending as stated above.
