# Agent Allocation Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce unnecessary high-cost model use in the Archeform multi-agent workflow while preserving the existing risk gates, reviewer independence, and maximum concurrency of three subagents.

**Architecture:** Keep the role graph and parallelism policy unchanged. Route routine implementation and task-level review to Terra, reserve Sol for PM/technology governance, cross-package integration, hard debugging, security/lifecycle adjudication, and final release judgment, and keep Spark for bounded read-only or mechanical work. Make the route and escalation policy consistent in the executable TOML role definitions, the Codex README, and the active long-run workstream.

**Tech Stack:** Codex project-scoped TOML agents, Markdown governance documentation, PowerShell validation, Prettier.

## Global Constraints

- Keep the project limit at up to three subagents beside the controller.
- Parallel writers still require a frozen shared contract and disjoint paths.
- Keep Draft -> Publish -> immutable Compilation and all existing security, provenance, credential, and ledger rules unchanged.
- Use English for code, configuration, and documentation.
- Do not change product code, package versions, runtime topology, Graph/API identifiers, or deployment behavior.
- PM uses `gpt-5.6-sol` with `high` by default; `xhigh` is reserved for explicitly identified major planning or irreversible scope decisions.
- Engineer and task reviewer use `gpt-5.6-terra` with `high` for ordinary accepted-scope work.
- Tech Lead uses `gpt-5.6-sol` with `high`; escalation remains available for architecture, contracts, security, lifecycle, and hard debugging.
- Final reviewer remains `gpt-5.6-sol` with `high`; QA remains `gpt-5.6-terra` with `high`; Spark roles remain `gpt-5.3-codex-spark`.

---

### Task 1: Record the executable model-routing policy

**Files:**

- Modify: `.codex/agents/pm.toml`
- Modify: `.codex/agents/engineer.toml`
- Modify: `.codex/agents/task_reviewer.toml`
- Modify: `.codex/agents/tech_lead.toml`
- Modify: `.codex/agents/reviewer.toml`

**Interfaces:**

- Consumes: Existing role responsibilities, PM-ledger gates, and current three-subagent limit.
- Produces: Role TOMLs whose model and reasoning-effort fields implement the cost-aware routing policy without weakening any role boundary.

- [x] **Step 1: Change PM's default reasoning effort from `xhigh` to `high` and document that major planning may explicitly request `xhigh` in its instructions.**
- [x] **Step 2: Change `engineer` and `task_reviewer` from `gpt-5.6-sol` to `gpt-5.6-terra`, retaining `high` reasoning effort and all existing scope, ledger, and review boundaries.**
- [x] **Step 3: Change `tech_lead` from `xhigh` to `high`, retaining Sol and its escalation-only governance role.**
- [x] **Step 4: Add explicit escalation language to the Engineer and Task Reviewer instructions for Graph/lifecycle contracts, security, cross-package signatures, hard debugging, or repeated repair failures.**
- [x] **Step 5: Verify all changed TOML files have the intended model fields and no role loses its sandbox or write boundary.**

### Task 2: Synchronize the human-readable allocation contract

**Files:**

- Modify: `.codex/README.md`
- Modify: `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`

**Interfaces:**

- Consumes: Task 1's executable model-routing policy.
- Produces: Documentation that gives the controller one consistent allocation table and explicit consumption guardrails.

- [x] **Step 1: Replace the README model-allocation prose with a role matrix covering PM, Tech Lead, Engineer, Task Reviewer, QA, Final Reviewer, Explorer, Spark Worker, Spark Reviewer, and Market Researcher.**
- [x] **Step 2: Add the cost controls: three-subagent ceiling, least-expensive-capable dispatch, no automatic xhigh, and escalation after contract/security/lifecycle uncertainty or the third failed repair.**
- [x] **Step 3: Update the long-run workstream's model-routing table so ordinary implementation and task review use Terra, while Sol remains on governance, integration, hard debugging, security/lifecycle, and final release judgment.**
- [x] **Step 4: Keep the workstream's approved waves and path-disjointness rules unchanged, and state that model optimization does not authorize new parallel writers.**

### Task 3: Validate the workspace change

**Files:**

- Test: `.codex/config.toml`, `.codex/agents/*.toml`, `.codex/README.md`, `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`

**Interfaces:**

- Consumes: Updated role definitions and documentation from Tasks 1–2.
- Produces: Fresh evidence that the executable configs, documentation, formatting, and repository state agree.

- [x] **Step 1: Parse `.codex/config.toml` and every `.codex/agents/*.toml` file with a TOML parser available in the workspace and inspect the expected concurrency/default/model mapping.**
- [x] **Step 2: Run targeted searches proving no ordinary Engineer or Task Reviewer route still points to Sol and no stale workstream route remains.**
- [x] **Step 3: Run `pnpm exec prettier --check .codex/README.md docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`; when the local pnpm wrapper is blocked by its environment install guard, run the equivalent direct installed Prettier binary and report the exact result.**
- [x] **Step 4: Inspect `git diff --check`, `git diff --stat`, and `git status --short`; confirm only the plan and intended agent allocation files changed.**
