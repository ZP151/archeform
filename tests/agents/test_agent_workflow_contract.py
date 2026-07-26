from __future__ import annotations

import hashlib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SKILLS = ROOT / ".agents" / "skills"
AGENTS = ROOT / ".codex" / "agents"


class AgentWorkflowContractTests(unittest.TestCase):
    def _read_agent(self, name: str) -> str:
        return (AGENTS / f"{name}.toml").read_text(encoding="utf-8")

    def test_direct_source_skills_exist(self) -> None:
        direct_source_skills = {
            "brainstorming",
            "create-architectural-decision-record",
            "dispatching-parallel-agents",
            "executing-plans",
            "finishing-a-development-branch",
            "receiving-code-review",
            "requesting-code-review",
            "subagent-driven-development",
            "systematic-debugging",
            "test-driven-development",
            "using-git-worktrees",
            "using-superpowers",
            "verification-before-completion",
            "writing-plans",
            "writing-skills",
        }
        for name in direct_source_skills:
            self.assertTrue((SKILLS / name / "SKILL.md").is_file(), name)

    def test_roles_and_root_policy_define_a_closed_delivery_loop(self) -> None:
        task_reviewer = AGENTS / "task_reviewer.toml"
        self.assertTrue(task_reviewer.is_file())
        self.assertIn('sandbox_mode = "read-only"', task_reviewer.read_text(encoding="utf-8"))

        root_policy = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        for token in (
            "Factory-agent orchestration",
            "planned → implementing → ready_for_qa → reviewed → accepted",
            "single write owner",
            "task_reviewer",
        ):
            self.assertIn(token, root_policy)

        workflow = (ROOT / "docs" / "agent-workflows.md").read_text(encoding="utf-8")
        for token in ("Task ledger", "ready_for_qa", "task_reviewer", "blocked"):
            self.assertIn(token, workflow)

    def test_technology_governance_is_pinned_and_specialized(self) -> None:
        tech_lead_instructions = self._read_agent("tech_lead")
        self.assertIn('name = "tech_lead"', tech_lead_instructions)
        for boundary in (
            "proposed ADR only under docs/adr/",
            "keep, experiment, migrate, or reject",
            "Do not select a runtime stack from raw requirements",
            "The founder accepts or rejects ADRs",
        ):
            self.assertIn(boundary, tech_lead_instructions)

        governance = (ROOT / "docs" / "tech-governance.md").read_text(encoding="utf-8")
        for gate in (
            "Founder approval",
            "Exact versions",
            "Migration and rollback",
            "Verification plan",
            "Frozen API contract",
        ):
            self.assertIn(gate, governance)

        ledger_template = ROOT / "docs" / "superpowers" / "ledgers" / "TEMPLATE.md"
        ledger_text = ledger_template.read_text(encoding="utf-8")
        for token in (
            "Specialization",
            "Contract owner",
            "Contract status",
            "Allowed write paths",
            "frontend",
            "backend",
            "platform",
            "integration",
        ):
            self.assertIn(token, ledger_text)
        self.assertIn("frozen", ledger_text)
        self.assertIn("disjoint", ledger_text)

        pm = self._read_agent("pm")
        engineer = self._read_agent("engineer")
        self.assertIn("founder-accepted ADR", pm)
        self.assertIn("specialization and contract owner", pm)
        self.assertIn("`frontend`, `backend`, `platform`, or `integration`", engineer)

    def test_pinned_technology_sources_are_byte_identical(self) -> None:
        expected_sha256 = {
            ROOT / ".agents" / "skills" / "create-architectural-decision-record" / "SKILL.md":
                "c11af0c34fa034e36e622ad97f1194824c3cbbe675a8b17cdc0bedc91b188a72",
            ROOT / "docs" / "agent-sources" / "spec-kit" / "constitution-template.md":
                "ce7549540fa45543cca797a150201d868e64495fdff39dc38246fb17bd4024b3",
            ROOT / "docs" / "agent-sources" / "spec-kit" / "plan-template.md":
                "dfba43da2b2a207ff8c177a0fba03af074fd45e261696b4b64172041fad2e992",
        }
        for path, expected in expected_sha256.items():
            self.assertEqual(expected, hashlib.sha256(path.read_bytes()).hexdigest(), path)

        sources = (ROOT / "docs" / "agent-sources.md").read_text(encoding="utf-8")
        notices = (ROOT / "THIRD_PARTY_NOTICES.md").read_text(encoding="utf-8")
        for commit in (
            "aa280f28b1b73f9b6e6917b607eb92127b67b419",
            "c0fe0e43cd728ebc3dd1f714343f3921510a157f",
        ):
            self.assertIn(commit, sources)
            self.assertIn(commit, notices)


if __name__ == "__main__":
    unittest.main()
