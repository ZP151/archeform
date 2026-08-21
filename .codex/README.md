# Archeform agent configuration

This folder defines project-scoped Codex custom agents. Codex loads one TOML file per role when that role is spawned. The repository-level `AGENTS.md` defines how the roles cooperate.

## Roles

| Agent               | Owns                                                          | Default use                                                                           |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pm`                | Scope, acceptance criteria, and `docs/project-status.md`      | Ask for current project progress or the next priority                                 |
| `tech_lead`         | Technology profiles, stack evolution, and interface decisions | Request an ADR before changing framework, runtime, or shared contract                 |
| `explorer`          | Read-only code-path and test mapping                          | Map an unfamiliar or cross-cutting slice before implementation                        |
| `engineer`          | One bounded implementation slice                              | Build or fix a vertical slice                                                         |
| `task_reviewer`     | One task's specification and quality gate                     | Review an engineer hand-off before QA begins                                          |
| `qa`                | Executable verification and focused regressions               | Validate a completed slice                                                            |
| `reviewer`          | Independent risk review                                       | Check a diff or release candidate                                                     |
| `market_researcher` | Public market and ecosystem evidence                          | Update positioning without founder outreach                                           |
| `spark_worker`      | Small frozen-contract implementation slices                   | Accelerate component/CSS extraction, focused tests, fixtures, and mechanical adapters |
| `spark_reviewer`    | Small-diff and fix-round review                               | Fast local review before the full task/release gate                                   |

## Model allocation

Dispatch the least expensive model that can safely own the work. The current
risk-based allocation is:

| Role/work                                                                                            | Model                 | Reasoning       | Allocation boundary                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PM and scope/status coordination                                                                     | `gpt-5.6-sol`         | `high`          | Use `xhigh` only when the controller explicitly identifies major planning, an irreversible scope decision, or equivalent load-bearing judgment.                   |
| Tech Lead and technology-governance proposals                                                        | `gpt-5.6-sol`         | `high`          | Sol stays on profile, contract, security, lifecycle, and architecture decisions; it proposes ADRs but does not approve them.                                      |
| Ordinary bounded implementation                                                                      | `gpt-5.6-terra`       | `high`          | Engineer owns one PM-assigned slice; re-route to Sol for Graph/lifecycle, security, cross-package contracts, hard debugging, or downstream-affecting uncertainty. |
| Ordinary task specification and quality review                                                       | `gpt-5.6-terra`       | `high`          | Task Reviewer remains independent and escalates contract, security, lifecycle, or hard-debugging findings to the Sol gate.                                        |
| QA and adversarial verification                                                                      | `gpt-5.6-terra`       | `high`          | Starts only at the ledger QA gate and edits only explicitly assigned test paths.                                                                                  |
| Final risk/release review                                                                            | `gpt-5.6-sol`         | `high`          | Reserved for security, lifecycle, cross-package, and release judgment after task review and QA.                                                                   |
| Exploration, mechanical edits, UI details, fixtures, focused tests, formatting, and scoped re-review | `gpt-5.3-codex-spark` | `medium`/`high` | Read-only or frozen-contract work with explicit allowed paths; normally 1–3 files.                                                                                |
| Public ecosystem research                                                                            | `gpt-5.6-terra`       | `high`          | Public evidence only, without founder outreach or external commitments.                                                                                           |

The controller must specify the model and allowed paths for every dispatch.
Spark never owns Graph/lifecycle contract changes, shared API/Prisma/Compose
changes, security adjudication, ledger transitions, real-model acceptance, or
the final release decision. Any worker escalates rather than switching itself
to a stronger model when it encounters a contract question, a security or
lifecycle boundary, hard debugging, or a third failed repair cycle.

The project permits up to three subagents beside the controller. Parallel
writers are allowed only when the active plan explicitly names the wave, the
shared contract is frozen, and paths are disjoint. Model-cost optimization
does not authorize additional writers or weaken the existing review gates;
read-only exploration and review may fill unused slots.

## UI reuse and delivery

Every UI task begins with the reuse inventory in `docs/delivery-policy.md`.
The assigned agent must name the existing primitives, patterns, blocks, screen
recipes, experience recipes, product templates, or legacy Workbench assets it
will reuse. New UI source needs a recorded functional gap and must enter the
appropriate registry with provenance and focused evidence; visual variation
alone is normally a token or recipe parameter, not a new component.

The controller owns the Git cadence. Reviewed tasks receive one bounded commit
and a push to the active iteration branch. Only an accepted iteration may be
integrated into `main`, and only an accepted main commit may become a repository
release. Product Publish and repository release are separate lifecycle events;
neither implies cloud deployment.

## Engineering workflow skills

The complete project-scoped `obra/superpowers` skill set in `.agents/skills/` is available to Codex in this repository:

- `writing-plans`: make a file-level task plan for a multi-step slice.
- `subagent-driven-development` and `dispatching-parallel-agents`: assign bounded work and coordinate safe parallel investigation.
- `test-driven-development`, `systematic-debugging`, and `verification-before-completion`: enforce red-green evidence, root-cause diagnosis, and fresh completion checks.
- `create-architectural-decision-record`: create a proposed, versioned technical decision for `tech_lead`; source is copied unchanged from Awesome Copilot.
- `brainstorming`, `executing-plans`, `requesting-code-review`, `receiving-code-review`, `using-git-worktrees`, and the other original source skills are retained unchanged for their documented triggers.

The 14 named Superpowers directories are direct copies of the MIT-licensed
`obra/superpowers` workflow library at tag `v6.2.0` and its peeled commit; the
ADR skill is an unchanged copy from one exact GitHub Awesome Copilot commit
(with no tag claim). Exact repositories, source paths, commits, blob/content
hashes, CRLF-only working-tree divergence, and license sources are recorded in
`.agents/skills/UPSTREAM_PROVENANCE.md`; the full retained notices are in
`THIRD_PARTY_NOTICES.md`. These skills supplement rather than replace
`docs/tech-governance.md`, `docs/threat-model.md`, or Archeform approval and
catalog rules.

## Usage

Ask the main Codex chat: `Ask the pm agent for the current project status.` The PM must inspect repository evidence and return the current milestone, test state, risks, and next slice.

For a normal feature cycle, ask: `Have pm check whether tech_lead needs an ADR, plan the slice and create a specialized task ledger, use explorer to map affected paths, have engineer implement it test-first, task_reviewer gate the hand-off, qa validate it, reviewer review the slice, then have pm update status.`

For the active long iteration, use
`docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md` as the
controller contract. The controller must use its ledger-state-driven recovery
rule, skip accepted work and consumed live gates, and then follow the
Graph-freeze and explicitly approved parallel waves recorded in the plan.
