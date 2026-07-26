# Task Ledger: tech-governance-v1

- **State:** accepted
- **Owner:** pm
- **Single write owner:** engineer
- **Specialization:** integration
- **Contract owner:** not applicable
- **Contract status:** not applicable
- **Allowed write paths:** `.agents/skills/create-architectural-decision-record/**`, `.codex/agents/tech_lead.toml`, `.codex/agents/pm.toml`, `.codex/agents/engineer.toml`, `.codex/README.md`, `AGENTS.md`, `docs/adr/**`, `docs/agent-sources/**`, `docs/agent-workflows.md`, `docs/tech-governance.md`, `docs/superpowers/ledgers/TEMPLATE.md`, `THIRD_PARTY_NOTICES.md`, `tests/agents/test_agent_workflow_contract.py`
- **Read-only parallel work:** source/license audit only
- **Plan:** `docs/superpowers/plans/2026-07-25-tech-governance-v1.md`

## Acceptance criteria

1. Tech Lead has a bounded decision role, cannot select a runtime stack from raw requirements, and writes only proposed ADRs.
2. ADR and Spec Kit source artifacts are direct, pinned, MIT-attributed copies.
3. Every future multi-agent ledger can declare specialization and API contract ownership, preventing frontend/backend write conflicts.
4. The agent-workflow regression suite proves the required integration artifacts exist.

## Evidence and findings

- 2026-07-25: PM assigned the governed configuration/documentation plan to one engineer. Its allowed paths are disjoint from the active generated-application Task 4 paths.
- 2026-07-25: Task review approved the implementation with no P0/P1. QA passed the Python 3.10 governance contract (4/4), required repository checks, provenance hashes, Tech Lead boundary, and specialization/contract-owner ledger requirements. PM accepted the task.
