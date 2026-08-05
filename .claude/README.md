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
