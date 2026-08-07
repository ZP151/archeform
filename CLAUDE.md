@AGENTS.md

# Claude Code instructions

Factory Pilot uses repository-owned goals, specifications, plans, and evidence.
Do not infer the active implementation scope from chat history alone.

## Required orientation

Before changing files, read in this order:

1. `docs/strategy/2026-08-02-graph-first-verified-application-factory.md`
2. `docs/roadmap.md`
3. `docs/project-status.md`
4. the active goal specification and implementation plan
5. every active ledger or ADR named by that goal
6. tests and source files explicitly owned by the next incomplete task

The active execution contract is the latest approved Goal Design, plan, and
ledger named in `docs/project-status.md`. Long-term portfolio targets are
product direction, not permission to expand the active Goal beyond its stated
completion gates.

## Execution discipline

- Start behavior changes with a focused failing test and record the RED reason.
- Work autonomously inside an approved Goal. Do not request routine approval
  for code reading, responsibility-based refactoring, tests, or bounded repairs.
- Prefer an isolated feature branch or worktree for a multi-iteration Goal.
  Confirm the current branch, remote, and intended diff before each push.
- Preserve unrelated user or agent changes. Stop if they overlap a path owned
  by the current task.
- Split large files by stable business or compiler responsibility, not by line
  count alone. Keep public facades thin and keep target behavior with its tests.
- Treat the Application Graph, capability locks, output slots, and lifecycle as
  shared contracts. Stop before changing one unless the active plan owns it.
- Update status and iteration records only from observed command evidence.
- Use separate Claude contexts for implementation, task review, QA, release
  review, and PM state transitions. An implementing context cannot certify its
  own gate or move a ledger state.
- Commit and push one green implementation iteration at a time with normal Git
  commands. Independent gates review a concrete commit. Record safe evidence,
  residual risk, and the next task in the iteration ledger.
- Never force-push, amend a pushed commit, rewrite history, or push a failing
  iteration.
- Never claim completion with uncommitted Goal changes, unpushed commits, a
  dirty worktree, or incomplete independent gates.

## Sensitive data

Do not read, print, persist, commit, screenshot, or summarize local environment
files, credentials, raw model prompts, or raw model responses. Tests that need
credentials receive them only through the process environment and record only
bounded pass/fail evidence. The tracked `.env.example` is safe to inspect.
Project permission rules and the sensitive-access hook prevent common
accidental disclosure without restricting normal repository development.
