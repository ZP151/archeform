# Upstream provenance for copied skills

This record covers only direct copies retained in `.agents/skills/`. Archeform
project-authored skills outside the tables below are not attributed to these
upstreams. License text is retained in `THIRD_PARTY_NOTICES.md`.

## obra/superpowers

- Repository: https://github.com/obra/superpowers
- Upstream reference: tag `v6.2.0`
- Peeled commit: `3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9`
- License: MIT, Copyright (c) 2025 Jesse Vincent
- License source: upstream `LICENSE` at the peeled commit
- License SHA-256:
  `A37E0E9697144819E1D965176AC4AE5BC3FA02D11E7812036BBCADF6DAFE2400`
- Retained notice: `THIRD_PARTY_NOTICES.md`

The exact copied scope is the following 14 upstream directories. Local paths
preserve each upstream-relative path beneath `.agents/skills/`.

| Upstream source path                       | Local path                                         | Files | Content/divergence                                                      |
| ------------------------------------------ | -------------------------------------------------- | ----: | ----------------------------------------------------------------------- |
| `skills/brainstorming/**`                  | `.agents/skills/brainstorming/**`                  |     8 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/dispatching-parallel-agents/**`    | `.agents/skills/dispatching-parallel-agents/**`    |     1 | Exact committed Git blob; working-tree byte differences are CRLF-only.  |
| `skills/executing-plans/**`                | `.agents/skills/executing-plans/**`                |     1 | Exact committed Git blob; working-tree byte differences are CRLF-only.  |
| `skills/finishing-a-development-branch/**` | `.agents/skills/finishing-a-development-branch/**` |     1 | Exact committed Git blob; working-tree byte differences are CRLF-only.  |
| `skills/receiving-code-review/**`          | `.agents/skills/receiving-code-review/**`          |     1 | Exact committed Git blob; working-tree byte differences are CRLF-only.  |
| `skills/requesting-code-review/**`         | `.agents/skills/requesting-code-review/**`         |     2 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/subagent-driven-development/**`    | `.agents/skills/subagent-driven-development/**`    |     7 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/systematic-debugging/**`           | `.agents/skills/systematic-debugging/**`           |    11 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/test-driven-development/**`        | `.agents/skills/test-driven-development/**`        |     2 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/using-git-worktrees/**`            | `.agents/skills/using-git-worktrees/**`            |     1 | Exact committed Git blob; working-tree byte differences are CRLF-only.  |
| `skills/using-superpowers/**`              | `.agents/skills/using-superpowers/**`              |     5 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/verification-before-completion/**` | `.agents/skills/verification-before-completion/**` |     1 | Exact committed Git blob; working-tree byte differences are CRLF-only.  |
| `skills/writing-plans/**`                  | `.agents/skills/writing-plans/**`                  |     2 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |
| `skills/writing-skills/**`                 | `.agents/skills/writing-skills/**`                 |     7 | Exact committed Git blobs; working-tree byte differences are CRLF-only. |

Audit result: 50/50 committed local Git blobs match the same upstream paths at
the peeled commit. The SHA-256 of the sorted
`local-path + NUL + committed-Git-blob` manifest is
`9926A440660D3A64B0CB2D4B8E2F93048C93ED9ED62B4AC3D2CE42BAA4BD4193`.
The executable D0 verifier checks the exact 14-directory scope, 50-file count,
committed manifest hash, and that normalized working content still produces
the committed blobs; this makes CRLF-only divergence explicit without claiming
byte identity in the Windows working tree.

## github/awesome-copilot

- Repository: https://github.com/github/awesome-copilot
- Upstream commit: `aa280f28b1b73f9b6e6917b607eb92127b67b419`
- Tag: no tag claim
- Exact upstream source path:
  `skills/create-architectural-decision-record/SKILL.md`
- Exact local path:
  `.agents/skills/create-architectural-decision-record/SKILL.md`
- Upstream and local Git blob:
  `be10104faded844c01d0f5b1f82e8c9fca15ba20`
- Normalized LF-content SHA-256:
  `C11AF0C34FA034E36E622AD97F1194824C3CBBE675A8B17CDC0BEDC91B188A72`
- Divergence: none in the committed Git blob; the working tree is accepted
  only when line-ending normalization yields the recorded SHA-256.
- License: MIT, Copyright GitHub, Inc.
- License source: upstream `LICENSE` at the recorded commit
- License SHA-256:
  `E32449D23085399ADC1222F7A17408B730550258E51627C153CB108CA9955823`
- Retained notice: `THIRD_PARTY_NOTICES.md`

No broader Awesome Copilot directory is claimed or copied by this record.
