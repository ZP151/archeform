# Agent Collaboration Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` task-by-task. The project overlay in `factory-agent-orchestration` resolves source-skill conflicts.

**Goal:** Make the project-local Superpowers skills and Codex roles safe, deterministic, and auditable for supervised production development.

**Architecture:** Keep all 14 copied Superpowers directories byte-for-byte unchanged. Add a small Factory Pilot orchestration overlay, a task-scoped read-only reviewer, a durable task ledger contract, and static regression checks for the integration surface.

**Constraints:** `AGENTS.md`, `docs/mvp.md`, and `docs/threat-model.md` override copied source workflow instructions. No automatic branch, merge, release, deployment, or external action is authorized.

## Task 1: Add a failing workflow-contract test

**Files:** Create `tests/agents/test_agent_workflow_contract.py`.

- [ ] Assert the 14 direct-copy Superpowers skills and their `SKILL.md` files exist.
- [ ] Assert the project orchestration overlay, task reviewer, explicit task states, and conflict-resolution rule exist.
- [ ] Run `python -m unittest discover -s tests/agents -v` and observe the expected failure before adding the implementation.

## Task 2: Define the orchestration overlay and task reviewer

**Files:** Create `.agents/skills/factory-agent-orchestration/SKILL.md`, `.agents/skills/factory-agent-orchestration/agents/openai.yaml`, `.codex/agents/task_reviewer.toml`.

- [ ] Define skill priority, routing, one-writer isolation, ledger states, review gates, and failure escalation.
- [ ] Make the reviewer read-only and limited to one task’s brief, diff, ledger, and evidence.

## Task 3: Bind roles and repository policy to the overlay

**Files:** Modify `AGENTS.md`, `.codex/agents/pm.toml`, `.codex/agents/engineer.toml`, `.codex/agents/qa.toml`, `.codex/agents/reviewer.toml`, `.codex/README.md`, `docs/agent-workflows.md`.

- [ ] Route ambiguous design work, planned delivery, debugging, and release review deterministically.
- [ ] Make PM own state transitions; require a task ledger before writes; serialize code and test writers; separate task review from release review.
- [ ] Preserve direct source skills unchanged and state the project-specific override explicitly.

## Task 4: Verify the contract

- [ ] Re-run `python -m unittest discover -s tests/agents -v`.
- [ ] Run `python -m unittest discover -s tests/api -v`, `node --check apps/web/app.js`, and `git diff --check`.
- [ ] Verify each copied source-skill directory still matches the pinned source checkout byte-for-byte.
