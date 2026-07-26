# Agent configuration sources

The project adopts patterns from the following reviewed sources. Directly copied third-party skill code is listed with its reviewed license and pinned source; all other entries are design input only.

| Source | Why it is used |
|---|---|
| [OpenAI Codex custom subagents](https://developers.openai.com/codex/guides/subagents) and [agent-role loader](https://github.com/openai/codex/blob/main/codex-rs/core/src/config/agent_roles.rs) | Native `.codex/agents/*.toml` roles, model selection, sandbox configuration, and project-level discovery. Apache-2.0. |
| [OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md) | Concise repository instructions, scoped rules, and validation commands. |
| [OpenAI review-agent sample](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/review-agent/SKILL.md) | Defect-first, evidence-based review protocol. Apache-2.0. |
| [Anthropic skills](https://github.com/anthropics/skills) and [Agent Skills specification](https://agentskills.io/specification) | Small frontmatter-led skills with progressive disclosure. Patterns only; license review is required before vendoring individual artifacts. |
| [Vercel skills](https://github.com/vercel-labs/skills) | Portable project-local `SKILL.md` conventions and provenance hygiene. MIT. |
| [Microsoft Conductor](https://github.com/microsoft/conductor) | Version-controlled routing and explicit workflow gates. Used as an orchestration pattern, not as a runtime dependency. MIT. |
| [obra/superpowers](https://github.com/obra/superpowers) | The complete skill directories are copied unchanged at commit `3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9`; MIT notice is in `THIRD_PARTY_NOTICES.md`. Project-specific routing lives in `AGENTS.md`. |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | `constitution-template.md` and `plan-template.md` are direct, unmodified copies from commit `c0fe0e43cd728ebc3dd1f714343f3921510a157f`, retained under `docs/agent-sources/spec-kit/`. MIT notice is in `THIRD_PARTY_NOTICES.md`. |
| [GitHub Awesome Copilot](https://github.com/github/awesome-copilot) | `create-architectural-decision-record/SKILL.md` is a direct, unmodified copy from commit `aa280f28b1b73f9b6e6917b607eb92127b67b419`, retained under `.agents/skills/`. MIT notice is in `THIRD_PARTY_NOTICES.md`. |
| [agents.md](https://github.com/agentsmd/agents.md) | Cross-tool repository guidance conventions. MIT. |
