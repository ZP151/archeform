# Factory Pilot agent configuration

This folder defines project-scoped Codex custom agents. Codex loads one TOML file per role when that role is spawned. The repository-level `AGENTS.md` defines how the roles cooperate.

## Roles

| Agent | Owns | Default use |
|---|---|---|
| `pm` | Scope, acceptance criteria, and `docs/project-status.md` | Ask for current project progress or the next priority |
| `tech_lead` | Technology profiles, stack evolution, and interface decisions | Request an ADR before changing framework, runtime, or shared contract |
| `explorer` | Read-only code-path and test mapping | Map an unfamiliar or cross-cutting slice before implementation |
| `engineer` | One bounded implementation slice | Build or fix a vertical slice |
| `task_reviewer` | One task's specification and quality gate | Review an engineer hand-off before QA begins |
| `qa` | Executable verification and focused regressions | Validate a completed slice |
| `reviewer` | Independent risk review | Check a diff or release candidate |
| `market_researcher` | Public market and ecosystem evidence | Update positioning without founder outreach |

## Engineering workflow skills

The complete project-scoped `obra/superpowers` skill set in `.agents/skills/` is available to Codex in this repository:

- `writing-plans`: make a file-level task plan for a multi-step slice.
- `subagent-driven-development` and `dispatching-parallel-agents`: assign bounded work and coordinate safe parallel investigation.
- `test-driven-development`, `systematic-debugging`, and `verification-before-completion`: enforce red-green evidence, root-cause diagnosis, and fresh completion checks.
- `create-architectural-decision-record`: create a proposed, versioned technical decision for `tech_lead`; source is copied unchanged from Awesome Copilot.
- `brainstorming`, `executing-plans`, `requesting-code-review`, `receiving-code-review`, `using-git-worktrees`, and the other original source skills are retained unchanged for their documented triggers.

The Superpowers directories are direct copies of the MIT-licensed `obra/superpowers` workflow library, and the ADR skill is a direct copy from MIT-licensed GitHub Awesome Copilot. Both are pinned to source commits; see `THIRD_PARTY_NOTICES.md`. They supplement rather than replace the Factory Pilot approval, catalog, and threat-model rules.

## Usage

Ask the main Codex chat: `Ask the pm agent for the current project status.` The PM must inspect repository evidence and return the current milestone, test state, risks, and next slice.

For a normal feature cycle, ask: `Have pm check whether tech_lead needs an ADR, plan the slice and create a specialized task ledger, use explorer to map affected paths, have engineer implement it test-first, task_reviewer gate the hand-off, qa validate it, reviewer review the slice, then have pm update status.`
