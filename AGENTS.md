# Factory Pilot collaboration rules

## Source of truth

- `docs/project-status.md` is the live delivery summary.
- `docs/mvp.md` defines the current product boundary and acceptance criteria.
- `docs/threat-model.md` defines security invariants that implementation may not bypass.
- `docs/market-validation.md` records source-backed public market evidence.

## Role workflow

For a bounded product slice, use this order:

1. `pm` writes the outcome, non-goals, acceptance criteria, and a bounded task card, then checks the technology-governance triggers.
2. `tech_lead` writes a proposed ADR when a trigger applies; the founder accepts or rejects it before implementation planning continues.
3. `pm` uses the copied `writing-plans` skill for multi-step or cross-cutting work, saves the plan under `docs/superpowers/plans/`, and creates the task ledger.
4. Use `explorer` for read-only code-path and test mapping when the slice is unfamiliar or crosses modules.
5. `engineer` implements one task at a time using `.agents/skills/test-driven-development`; use `.agents/skills/systematic-debugging` for every unexpected failure. The engineer runs local checks before hand-off.
6. `task_reviewer` performs a read-only specification-and-quality review for that task. P0 or P1 findings return to the same engineer.
7. `qa` validates behavior and adds focused regressions where evidence shows a gap, after the implementation writer has finished.
8. `reviewer` performs one independent, read-only release review after all tasks in the slice are reviewed.
9. `pm` reconciles results and updates `docs/project-status.md`.

Use the copied `subagent-driven-development` skill to coordinate independently reviewable tasks in steps 4 through 7. Run read-only research, exploration, and review in parallel only when they do not overlap with file edits. Do not let two agents modify the same paths at once; serialize implementation, test, and documentation writers.

## Agent skills

This repository directly reuses the complete MIT-licensed `obra/superpowers` skill set at commit `3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9`. The original directories are in `.agents/skills/`; use their original names (for example `writing-plans`, `subagent-driven-development`, `test-driven-development`, `systematic-debugging`, and `verification-before-completion`).

Within this project, references in the copied files written as `superpowers:<skill-name>` mean the project-local skill `<skill-name>` in `.agents/skills/<skill-name>/`. The Factory Pilot rules in this file, `docs/mvp.md`, and `docs/threat-model.md` take precedence if a copied workflow conflicts with them.

## Factory-agent orchestration

This section is the project-specific overlay for the copied skills. It resolves their conflicts without modifying the source directories. Priority is: direct founder instruction; this `AGENTS.md` and product/security contracts; then copied skills.

Routing rules:

- Use `brainstorming` only when user outcomes, architecture, or user-visible behavior remain materially ambiguous. A founder-approved task card or a deterministic regression does not require a second design approval.
- Use `writing-plans` for approved multi-step work. Use `systematic-debugging` before fixing an unexpected result, then `test-driven-development` for the fix.
- Use `subagent-driven-development` only for independently reviewable tasks. Use `executing-plans` for tightly coupled work. Use `dispatching-parallel-agents` only for independent read-only investigation.
- Use `using-git-worktrees` only when the founder has authorized isolation. Never create a branch, worktree, commit, merge, push, release, or deployment merely because a copied skill suggests it.

Every multi-agent slice has a ledger at `docs/superpowers/ledgers/<task-id>.md`. The PM creates it before dispatch and is the only role that changes its state:

```text
planned → implementing → ready_for_qa → reviewed → accepted
                 ↘ blocked ↗
```

Each ledger records the acceptance criteria, owner, single write owner, specialization, contract owner, contract status and artifact, allowed write paths, dependencies, commands and fresh output, task-review findings, QA findings, release-review result, and final PM decision. A task without a ledger remains `planned` and has no writer.

Only the single write owner may modify production paths while a task is `implementing`. QA may write an explicitly assigned test path only after the implementation hand-off; documentation changes are serialized with other writers. After a P0 or P1 task-review finding, resume the same engineer with the finding and re-review the affected task. After three failed repair/review cycles, or if the required path/scope changes, the PM sets `blocked` and asks the founder for a decision.

## Technology governance

Use the copied `create-architectural-decision-record` skill and `tech_lead` before planning when a change adds or replaces a framework, language, database, cloud/runtime dependency, major version, shared API/data contract, or deployment topology. The Tech Lead may recommend `keep`, `experiment`, `migrate`, or `reject`; it never selects a runtime stack from raw requirement text, modifies product code, or accepts its own ADR. The founder must accept a proposed ADR before a Golden technology profile changes.

Tech Lead ADRs are written only under `docs/adr/`. Each ADR names the existing and proposed profiles, exact versions, compatibility impact, component-catalog impact, migration and rollback plan, security/operability impact, and verification gate. See `docs/tech-governance.md` and the pinned Spec Kit source templates in `docs/agent-sources/spec-kit/`.

Task specialization is assigned by the PM, not by a permanent role: `frontend`, `backend`, `platform`, or `integration`. Frontend and backend tasks may run in parallel only after the ledger identifies a frozen, versioned API/data contract artifact and a contract owner, with disjoint allowed write paths. A contract change stops parallel work and returns ownership to `integration`. `integration` owns shared contracts, generated templates, Compose topology, and cross-stack smoke evidence; it is always serialized.

## Development discipline

- Before a completion claim, use `verification-before-completion` and retain the exact command evidence in the hand-off.
- A task is ready for QA only after its stated acceptance criteria, changed paths, test evidence, and residual risks are recorded.
- A task is ready for the PM to close only after QA and reviewer results are reconciled. A passing unit suite alone is not acceptance evidence.
- Do not create worktrees, branches, external accounts, releases, deployments, or network-side changes unless the parent task explicitly authorizes them.

## PM status contract

When a user asks for project progress, route the request to `pm`. Before answering, PM must inspect the working tree, current test results, and `docs/project-status.md`. PM reports:

- Current milestone and its acceptance criteria.
- Completed work backed by files or test output.
- Active work and unresolved risks.
- The next smallest valuable slice and its completion gate.

## Safety boundaries

- Generated applications must preserve role-based multi-user workflows.
- Do not execute arbitrary commands, download unapproved components, or bypass IR/plan approval gates.
- Do not publish, deploy, purchase, message external parties, or use real credentials without explicit founder authorization.
- Market research uses public sources only and must not create a founder outreach task.

## Required checks

```powershell
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
node --check apps/web/app.js
git diff --check
```
