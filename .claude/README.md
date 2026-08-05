# Claude Code goal runner

Factory Pilot uses a repository-owned Claude Code Skill for the bounded P0
compiler target plugin goal. The configuration is intentionally autonomous:
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
3. Invoke:

   ```text
   /factory-p0-compiler
   ```

The Skill creates or refreshes the detailed plan and ledger, executes tasks,
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

## Long-running Goal prompt

Paste the following into a new Claude Code Goal after selecting the configured
model:

```text
/factory-p0-compiler

Pursue the approved Factory Pilot P0 Compiler Target Plugin Goal autonomously
until GOAL_COMPLETE.

Treat CLAUDE.md, AGENTS.md, the founder-approved Goal design, the project Skill,
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
