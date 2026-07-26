# Agent workflows

## Delivery contract

```text
PM task card + ledger → tech_lead ADR (only when a decision trigger applies) → explorer (optional, read-only) → engineer (single writer)
→ task_reviewer (read-only) → QA (test path only) → reviewer (release, read-only) → PM decision
```

Use the copied Superpowers skills through the project overlay in `AGENTS.md`. The overlay, product contract, and threat model take precedence over source-skill instructions.

## Task ledger

PM creates `docs/superpowers/ledgers/<task-id>.md` before dispatch. It must contain:

- Outcome, non-goals, acceptance criteria, safety invariants, and dependencies.
- Task owner, single write owner, specialization, API/data contract owner, contract status, versioned contract artifact, allowed write paths, and read-only parallel work.
- Fresh TDD, quality-gate, and behavior-specific command output.
- Task-review, QA, and release-review findings with remediation decisions.
- Current state and the PM's dated final decision.

Only PM changes state:

```text
planned → implementing → ready_for_qa → reviewed → accepted
                 ↘ blocked ↗
```

`ready_for_qa` requires an engineer hand-off and no unresolved P0/P1 task-review finding. `reviewed` requires QA evidence and a release-review result. `accepted` requires fresh verification and an explicit PM decision. `blocked` requires a concrete missing decision, dependency, or three failed repair/review cycles.

## Routing and isolation

| Situation | Required route |
|---|---|
| Ambiguous outcome, UX, or architecture | `brainstorming` → founder-approved task card → `writing-plans` |
| Approved multi-step work with independent tasks | `subagent-driven-development` with engineer and `task_reviewer` gates |
| Tightly coupled work | `executing-plans`, one writer at a time |
| Unexpected result or failure | `systematic-debugging` → `test-driven-development` |
| Independent read-only investigations | `dispatching-parallel-agents` |
| Completion claim | `verification-before-completion` |
| Framework, runtime, database, major dependency, deployment topology, or shared API/data-contract change | `tech_lead` → proposed ADR → founder acceptance → PM plan |

No task begins without a ledger. Only one agent writes production paths at a time. QA may add focused tests only after the engineer hand-off and only in its assigned test path. Explorer, task_reviewer, reviewer, and market researcher remain read-only.

## Review responsibilities

`task_reviewer` reviews one hand-off for specification compliance, code quality, and test evidence. P0/P1 findings return to the same engineer and require re-review. `reviewer` performs the later, broad release review; it does not replace the task gate.

No role creates a branch, worktree, commit, merge, release, deployment, external account, or network-side change unless the founder explicitly authorizes it.

## Technology governance and specialization

The `tech_lead` role uses the directly copied `create-architectural-decision-record` skill to analyze a concrete decision and write a proposed ADR under `docs/adr/`. It does not implement, change the Golden Profile, or choose a stack from raw requirements. The founder accepts an ADR before PM treats a material technology change as approved.

| Specialization | Owns | Coordination rule |
|---|---|---|
| `frontend` | User-interface and browser paths | May work in parallel with backend only after the contract is frozen; never edits backend or shared-contract paths. |
| `backend` | API, domain, persistence, and backend tests | May work in parallel with frontend only after the contract is frozen; never edits frontend or shared-contract paths. |
| `platform` | Container, CI, runtime, and deployment topology | Serializes changes to shared topology, dependency locks, and runtime configuration. |
| `integration` | Shared contracts, templates, Compose wiring, and end-to-end paths | Is serialized after specialist hand-offs; resolves cross-boundary conflicts. |

The ledger names one specialization, one contract owner, a contract status (`not applicable`, `unfrozen`, or `frozen`), and a versioned contract artifact before implementation. The `integration` owner is the only writer for an unfrozen shared contract. Frontend/backend parallel work stops if the contract changes.
