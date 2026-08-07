# Claude Code goal runner

Factory Pilot uses repository-owned Goal documents for bounded autonomous work.
The configuration is intentionally autonomous:
the implementation context may inspect source, edit owned paths, split modules,
run tests, repair findings, and continue through the agent-maintained plan
without routine founder confirmation.

## One-time activation sequence

1. Review and approve the Goal design:
   `docs/superpowers/specs/2026-08-06-compiler-target-plugin-kernel-goal-design.md`.
2. Start Claude Code on a suitable feature branch or isolated worktree and
   select the locally configured
   DeepSeek V4 Flash provider/model. Provider configuration and credentials are
   local-only and never enter this repository.
3. Paste the applicable Long-running Goal prompt below into Claude Code.

The Goal creates or refreshes the detailed plan and ledger, executes tasks,
invokes the independent task reviewer, QA, release reviewer, and PM contexts,
commits and pushes green iterations, reconciles evidence, and continues until
`GOAL_COMPLETE` or a declared stop condition. The founder does not manually
relay work between agents.

## Hard boundaries

The project keeps only narrow hard guards:

- no credential or raw model material access or persistence;
- no destructive Git history rewrite or known-failing push;
- no silent change to the Application Graph, immutable lifecycle, dependency
  set, external systems, or accepted contract scope.

The sensitive-access hook prevents common accidental disclosure. It is not a
hostile subprocess or operating-system sandbox. All normal development,
package-manager, test, and Git commands remain available.

## Previous compiler Goal prompt

Paste the following into a new Claude Code Goal after selecting the configured
model:

```text
Pursue the approved Factory Pilot P0 Compiler Target Plugin Goal autonomously
until GOAL_COMPLETE.

Treat CLAUDE.md, AGENTS.md, the founder-approved Goal design, the project Goal files,
the current project status, roadmap, ADRs, and ledgers as durable authority.
Create and maintain the detailed implementation plan and Goal ledger yourself.
Do not wait for routine confirmation and do not stop merely to report progress.

First reconcile Typed Capability Binding Task 2 with accepted Task 2A through
fresh evidence and the existing governance state machine. Then implement the
CompilerTargetPluginV1 kernel and serially migrate documentation, policy, and
database target ownership with exact file, byte, and SHA-256 parity across all
five accepted Profiles.

Use test-driven development when practical. Split large source files by stable
business or compiler responsibility. Keep packages/compiler/src/index.ts as a
thin public facade, keep target behavior with focused tests, and preserve the
immutable Draft -> Publish -> Compilation lifecycle.

For each green iteration, run proportional focused and regression checks,
update the plan, ledger, project status, and roadmap from observed evidence,
create a conventional commit, and push it to the selected remote feature
branch. Never force-push, rewrite pushed history, expose credentials, or persist
raw model prompts or responses.

Automatically invoke the configured factory-task-reviewer, factory-pm,
factory-qa, and factory-release-reviewer agents at the gates defined by the
Skill. Repair findings and repeat invalidated gates without asking me to relay
messages between agents.

Continue across context compaction by re-reading the durable Goal files. Ask me
only when a declared GOAL_NEEDS_DECISION condition requires changing approved
scope, public contracts, dependencies, external systems, credential handling,
or the immutable lifecycle.

Mark the persistent Goal complete only after all design and plan acceptance
criteria pass, independent evidence is current, documentation matches the
implementation, the worktree is clean, and every Goal commit has been pushed.
Return GOAL_COMPLETE with commit hashes, exact verification commands and test
totals, remaining product gaps, and the next recommended Goal.
```

## Next long-running Goal prompt: P0 Isolated Verifier

Paste the following into a new Claude Code Goal after selecting the configured
DeepSeek V4 Flash provider/model:

```text
Pursue the approved Factory Pilot P0 Isolated Verifier Goal autonomously until
GOAL_COMPLETE. Read CLAUDE.md, AGENTS.md, docs/project-status.md,
docs/roadmap.md, docs/superpowers/specs/2026-08-06-isolated-verifier-goal-design.md,
docs/superpowers/plans/2026-08-06-isolated-verifier.md, and
docs/superpowers/ledgers/2026-08-06-isolated-verifier.md before editing.

Treat those files, the immutable Graph lifecycle, accepted ADRs, and current
repository evidence as durable authority. Work continuously without waiting
for routine founder confirmation. Maintain the plan and PM ledger yourself;
invoke the configured task reviewer, PM, QA, and release-reviewer contexts at
their gates, and repair findings until each gate is green.

Implement the next P0 boundary: compile only an immutable Published
Compilation, boot it in a Factory-derived isolated environment, run migration,
health, API, role journeys, authorization denial, and idempotency probes,
clean up every resource, then emit bounded evidence and deterministic safe
diagnosis. A diagnosis may propose a schema-valid, reviewable Draft Diff only;
it must never patch generated source, runtime state, a Published Graph, or a
Compilation. Use the existing compiler executor, artifact writer, and preview
runner rather than duplicating their guards.

Use TDD and split large files by stable responsibility. Keep all evidence
allowlisted and redacted: never persist credentials, raw prompts, raw model
responses, headers, cookies, unrestricted process output, or arbitrary URLs.
Reject mutable Draft input, untrusted paths, mismatched compilation digests,
unknown routes, hostile evidence, conflicting retries, and arbitrary job keys
fail closed. Deterministic fixtures are the default; a real OpenAI call is not
a substitute for runtime verification and may be used only through the existing
local environment-only credential boundary.

For every green task, run focused tests first, then proportional package and
Docker-backed regression checks. Update the plan, ledger, project status,
roadmap, and acceptance evidence from observed results. Make a conventional
commit and push each green iteration to the selected remote feature branch;
never force-push or rewrite pushed history. Do not stop merely to report
progress and do not ask me to relay messages between agents.

The Goal is complete only after one accepted Expense Approval or Simple
Ecommerce profile proves compile -> isolated boot -> migration -> health -> API
-> role journeys -> denial -> idempotency -> cleanup -> diagnosis -> Draft Diff,
immutable-state snapshots pass, and fresh independent task review, QA, release
review, and PM acceptance cite the same remote-reachable commit. Return
GOAL_COMPLETE with commit hashes, exact commands and test totals, evidence
paths, remaining product gaps, and the next recommended Goal. If approved
scope, public contracts, dependencies, external systems, credentials, or the
immutable lifecycle would change, return GOAL_NEEDS_DECISION with evidence.
```

## Current continuation Goal: finish interrupted Task 6

The current worktree already contains uncommitted Task 6 implementation. Paste
this prompt into Claude Code to resume that exact work without losing it:

```text
Resume and complete the approved Factory Pilot P0 Isolated Verifier
Finalization Goal. First read CLAUDE.md, AGENTS.md, docs/project-status.md,
docs/roadmap.md, the accepted 2026-08-06 isolated-verifier ledger, and the
2026-08-07 finalization spec, plan, and ledger. Inspect the current dirty tree
before editing; preserve relevant Task 6 changes and do not reset, clean, amend,
force-push, or discard user/agent work.

The current focused evidence is green (compiler-worker 153/153, control-plane
149/149, graph 102/102, plus both app typechecks), but the real Docker
acceptance has not passed and the worktree is uncommitted. Finish Task 6 and
Task 7 only: review the existing worker job, verification queue, profile
fixtures, Control Plane enqueue path, reporter, and
scripts/verify-isolated-verifier-expense.mjs; close the recorded pending-run
failure boundary with a focused RED test and the smallest safe terminal-status
repair; then commit the implementation.

Run pnpm verify:isolated-verifier-expense against real Docker Desktop. It must
prove immutable Compilation input, isolated boot, migration, health, API, role
journeys, authorization denial, idempotency, cleanup, generated journey tests,
and one safe evidence bundle. Do not replace Docker with mocks. If Docker is
unavailable, record the exact daemon error and keep the Goal open; never claim
acceptance. Repair only failures reproduced by bounded evidence, and keep
credentials, raw prompts/responses, raw HTTP bodies, unrestricted logs, and
untrusted paths out of state and reports.

Use the existing independent task-reviewer, QA, release-reviewer, and PM gates.
Update both ledgers, project status, roadmap, and acceptance evidence from
observed commands. Commit and push each green iteration to the current remote
feature branch. Mark GOAL_COMPLETE only after the Docker command exits 0,
terminal failure behavior is tested, all gates cite one remote-reachable commit,
and git status is clean. Otherwise return GOAL_NEEDS_DECISION only for a real
scope, contract, dependency, credential, lifecycle, or destructive-history
decision; ordinary failures must be repaired autonomously.
```
