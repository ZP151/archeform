# Tech Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` for this tightly coupled configuration and documentation change. Source skills remain direct copies.

**Goal:** Add a controlled Tech Lead decision gate and task-level frontend/backend specialization without allowing free runtime stack selection.

**Architecture:** Reuse GitHub Spec Kit's constitution and technical-plan templates as pinned reference artifacts. Reuse Awesome Copilot's ADR skill as a direct project-local skill. The `tech_lead` owns ADR documentation only; PM owns scope, approval, and the task ledger. The existing engineer remains the default writer, with specialization assigned per ledger task instead of creating permanent frontend/backend agents.

**Tech Stack:** Project-local Codex TOML agents; Markdown workflow documents; Python `unittest` configuration-contract tests.

## Global Constraints

- Direct third-party source artifacts must remain byte-for-byte copies and retain MIT notices.
- Tech Lead cannot choose a stack from requirement text at runtime, change product code, or approve its own decision.
- A stack/profile change requires a proposed ADR, founder approval, a migration/rollback plan, exact versions, and a verification plan.
- Frontend/backend work may run in parallel only when paths are disjoint and the API contract owner has frozen the contract in the ledger.

### Task 1: Add a failing governance contract

**Files:** Modify `tests/agents/test_agent_workflow_contract.py`.

- [ ] Require `tech_lead`, the copied ADR skill, Spec Kit reference templates, tech governance, and ledger specialization fields.
- [ ] Run `python -m unittest discover -s tests/agents -v` and confirm it fails before configuration is added.

### Task 2: Copy audited open-source methods and record provenance

**Files:** Create `.agents/skills/create-architectural-decision-record/**`; create `docs/agent-sources/spec-kit/constitution-template.md`; create `docs/agent-sources/spec-kit/plan-template.md`; modify `THIRD_PARTY_NOTICES.md`, `docs/agent-sources.md`.

- [ ] Copy the Awesome Copilot ADR skill unchanged from `github/awesome-copilot` commit `aa280f28b1b73f9b6e6917b607eb92127b67b419`.
- [ ] Copy Spec Kit templates unchanged from `github/spec-kit` commit `c0fe0e43cd728ebc3dd1f714343f3921510a157f`.
- [ ] Preserve the upstream MIT notices and cite both source commits.

### Task 3: Add Tech Lead and specialization governance

**Files:** Create `.codex/agents/tech_lead.toml`, `docs/tech-governance.md`, `docs/superpowers/ledgers/TEMPLATE.md`; modify `AGENTS.md`, `.codex/agents/pm.toml`, `.codex/agents/engineer.toml`, `.codex/README.md`, `docs/agent-workflows.md`.

- [ ] Make Tech Lead write only proposed ADRs under `docs/adr/` and return a stack/profile verdict to PM.
- [ ] Define decision triggers, founder approval, profile/version pinning, migration/rollback, and verification requirements.
- [ ] Define `frontend`, `backend`, `platform`, and `integration` task specializations plus a contract owner; allow parallelism only for frozen, disjoint paths.

### Task 4: Verify source integrity and workflow contract

- [ ] Run the agent-workflow tests, API tests, JS syntax check, and `git diff --check`.
- [ ] Verify copied source artifacts byte-for-byte against the pinned temporary source checkouts.
