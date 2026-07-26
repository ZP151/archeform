# Composable Internal Approval Suite workstreams

## Purpose

This document is the required operating guide for agents working on the
Composable Internal Approval Suite. It does not replace `AGENTS.md`; when
they conflict, `AGENTS.md`, the current ledger, and an accepted ADR govern.

The target architecture has three planes:

| Plane | Responsibility |
| --- | --- |
| Factory Platform | Requirement normalization, component Registry, Composer, approvals, evidence, and application lifecycle control. |
| Component Assets | Independently versioned first-party UI, backend, workflow, data, and runtime packages with templates, contracts, fixtures, and tests. |
| Generated Applications and Fleet | The assembled business applications and their local or future managed runtime lifecycle. |

## Default operating model: autonomous Controller

The active Controller task is the default coordinator for this programme. The
founder delegated authority on 2026-07-26 for the Controller to accept or
revise ADRs and shared contracts, make bounded live-model decisions, progress
local and future cloud stages within the approved roadmap, and make release
decisions. That delegation remains bounded by repository safety rules:
credentials stay local and redacted, the five-live-call limit remains in force
unless a later written decision changes it, and no work silently expands beyond
the documented product scope.

The Controller—not the founder—must reconcile agent hand-offs in the ledger,
record and act on evidence gates, dispatch only unblocked work, enforce the
three-writer limit, pause work on shared-contract changes, and run review, QA,
repair, and release loops until the active Goal reaches its recorded terminal
state. The founder may ask the Controller or PM for status at any time.

Manual windows are an optional observability or recovery mechanism. They are
not the normal hand-off path and the founder is not expected to copy reports
between tasks.

## Founder manual window launch checklist

Use this section only when the founder wants an independently visible task or
when the Controller is unavailable. These are **separate Codex desktop
windows**, not the default coordination mechanism. Create them in order, paste
the matching bootstrap prompt into each new window, and let the window read
this document before it edits anything.

### Wave 0: open these three windows now

1. Open a new window named **Composable Suite PM**. Paste the **PM** prompt.
   It may write only the task card, this plan, the roadmap, the ledger, and
   project status. Wait for its hand-off before opening Tech Lead.
2. Open a new window named **Composable Suite Explorer**. Paste the
   **Explorer** prompt. It is read-only and reports the migration map to you
   or to the PM window.
3. Open a new window named **Composable Suite Market Research**. Paste the
   **Market researcher** prompt. It is read-only and reports public-source
   findings to you or to the PM window.

After PM, Explorer, and Market Research have handed off, open one new window
named **Composable Suite Tech Lead** and paste the **Tech Lead** prompt. It
writes a *proposed* ADR only. Review the ADR yourself and explicitly state
that you accept it before anyone starts Wave 1.

### Wave 1: open only after founder ADR acceptance

4. Open **Composable Suite Integration Contract**. Paste the **Integration
Contract** prompt. This is the sole writer for the shared component and
composition contracts. When it freezes the contract and PM records the
`implementing` state, Wave 2 may begin.

### Wave 2: open these three windows together, and no more writers

5. Open **Composable Suite Frontend Assets**. Paste the **Frontend assets**
   prompt.
6. Open **Composable Suite Backend and Data Assets**. Paste the **Backend and
   data assets** prompt.
7. Open **Composable Suite Composer and Registry**. Paste the **Composer and
   Registry** prompt.

There must never be more than these three engineering writers at once. If a
writer needs a change to a manifest, adapter, output slot, Compose topology,
or Composition Plan field, stop all three writers. Re-open or return to the
Integration Contract window, amend the contract, re-freeze it, and only then
resume the three engineering windows.

### Wave 3: open serially after all three engineering hand-offs

8. Open **Composable Suite Task Reviewer** for each completed engineering
   task; it is read-only.
9. Re-open only the original engineering window for P0 or P1 repairs, then
   request another review.
10. Open **Composable Suite QA** after all task reviews pass.
11. Open **Composable Suite Release Review** after QA passes.
12. Re-open **Composable Suite PM** to update the ledger and identify the
    next stage.

Use a distinct Codex task for each window. Do not ask a new window to infer a
role from chat history: always paste its matching prompt below.

## Starting Goal mode in every manual window

Goal mode is the **Goal control in the Codex task UI**, not a normal message
asking the agent to create a goal. For each new task window:

1. Click **+**, choose **Goal**, or type `/goal` in the composer.
2. Paste a focused goal using the matching row below. The goal text becomes
   both the initial task prompt and the completion criteria.
3. Send the detailed role bootstrap prompt from the previous section as the
   next message if the goal text does not already include every constraint.
4. Leave the Goal progress row active while the task works. Use **Pause** to
   stop work temporarily, **Edit** to revise the target, and **Resume** to
   continue. Do not use **Clear** as proof of success; it removes the goal
   record.
5. The task marks its Goal complete only after it has met the completion
   condition and returned the required evidence/hand-off. A true dependency or
   founder-decision block remains reported as a blocker; it is not completion.

A goal is a bounded task contract, not permission to bypass a dependency,
expand write scope, or make an acceptance decision on behalf of the founder.

Use these role-specific objective and completion values:

| Window | Goal text to paste into the Goal control | Completion condition |
| --- | --- | --- |
| PM | Create or reconcile CIS task governance. Read the required files and modify only PM-owned documentation and ledger paths. | Ledger and task artifacts identify scope, non-goals, owners, dependencies, acceptance gates, and the next hand-off; no product code changed. |
| Explorer | Produce the central-renderer migration map. Read-only: do not edit files or use credentials. | Read-only report maps every current renderer responsibility to a package, Composer slot, migration order, and regression test with paths. |
| Market Researcher | Produce source-backed ecosystem findings. Use public sources only; do not edit files or contact people. | Read-only report supplies direct public sources and contract-relevant findings on packages, provenance, composition, and licensing. |
| Tech Lead | Produce ADR 003 proposal only. Do not modify production code or accept the ADR. | Proposed ADR covers package boundary, adapter constraints, Registry/Composer ownership, migration, rollback, and founder decisions; it is not accepted. |
| Integration Contract | Freeze the shared component and composition contracts after the founder has accepted ADR 003. Modify only assigned contract paths. | Schemas, fixtures, and contract tests pass; contract version and hand-off are recorded. |
| Frontend Assets | Deliver assigned UI packages under the frozen contract and assigned paths only. | Assigned packages and focused tests pass with a complete writer hand-off. |
| Backend and Data Assets | Deliver assigned backend/data packages under the frozen contract and assigned paths only. | Assigned packages and focused tests pass with a complete writer hand-off. |
| Composer and Registry | Deliver frozen-contract Registry and Composer work under assigned paths only. | Composition, locking, containment, and rejection tests pass with a complete writer hand-off. |
| Task Reviewer | Independently assess one assigned hand-off. Read-only; do not edit files. | Actionable findings and a pass/rework recommendation are returned without edits. |
| QA | Validate the two generated approval products without changing production code or contracts. | Required safety, two-product, Executor, and role-aware smoke evidence is recorded. |
| Release Reviewer | Independently assess release readiness. Read-only; do not edit files. | Release recommendation, blockers, residual risks, and evidence gaps are returned without edits. |

## Mandatory reading order

No agent may edit a file until it has read these items in order:

1. `AGENTS.md`
2. `.codex/README.md`
3. `docs/project-status.md`
4. `docs/agent-workflows.md`
5. This document
6. `docs/superpowers/ledgers/composable-internal-approval-suite.md`
7. The assigned task card, accepted ADR, and frozen contract artifacts
8. The task's explicitly allowed write paths

The first response from every agent must contain:

```text
Role:
Task:
Read-only or writer:
Allowed paths:
Dependencies:
Acceptance evidence:
Blocked by:
```

## Global safety rules

- A component package is an executable asset, not a catalog label. It must
  have a version, digest, input contract, declared dependencies, fixture,
  tests, and verification evidence.
- The model may produce only a bounded Application Definition. It cannot
  select file paths, adapters, packages, URLs, code, dependencies, runtime
  topology, or deployment targets.
- Composer accepts only Golden first-party packages locked by digest. It
  applies only declared adapters to declared output slots and fails closed on
  conflicts, containment failures, missing dependencies, or incompatibility.
- Raw briefs, `OPENAI_API_KEY`, capability tokens, and complete model
  responses must never enter source control, logs, state, generated output,
  screenshots, or task reports.
- A task may make at most five live model calls. The key may only enter the
  local process environment through `.env`; fixture tests are the default.
- Every shared contract change pauses concurrent writers and returns ownership
  to the `integration` specialization.

## Component package target

Each first-party package will use this layout after the component contract is
accepted:

```text
packages/components/<component-key>/<version>/
  component.json
  adapter.json
  templates/
  fixtures/
  tests/
```

`component.json` declares identity, version, package digest, capabilities,
dependencies, compatibility, input schema, output slots, lifecycle state, and
verification evidence. `adapter.json` is declarative; it never contains model
generated executable code. Composer owns ordering, containment, merge policy,
and output manifest generation.

## Work waves

### Wave 0: governance and discovery

| Window | Role | Access | Deliverable |
| --- | --- | --- | --- |
| PM | `pm` | Documentation and ledger only | Task card, ledger, plan, workstream guide, and state reconciliation. |
| Explorer | `explorer` | Read-only | Renderer-to-package migration map and regression map. |
| Market researcher | `market_researcher` | Read-only | Public source-backed package, registry, provenance, and license findings. |
| Tech Lead | `tech_lead` | ADR only, after PM hand-off | Proposed component package/Registry/Composer ADR. |

Documentation writers are serialized. No production implementation begins
until the founder accepts the ADR and the integration owner freezes the
component and composition contracts.

### Wave 1: contract freeze

The `integration` engineer is the only writer. It creates the versioned
component manifest, declarative adapter, and composition-plan contracts plus
their contract tests. The Explorer may check compatibility read-only. PM only
updates the ledger.

### Wave 2: three concurrent implementation lines

| Window | Specialization | Owned packages and paths |
| --- | --- | --- |
| Frontend assets | `frontend` | `ui.login-page`, `ui.app-shell`, `ui.home-page`, `ui.profile-page`, `ui.system-settings-page`, `ui.approval-form`, `ui.my-requests`, and `ui.approval-queue` under the assigned `packages/components/ui/**` and focused tests. |
| Backend and data assets | `backend` / `platform` | `backend.session-auth`, `backend.rbac`, `backend.record-api`, `workflow.single-level-approval`, `ops.audit-log`, and `data.postgres-runtime` under assigned package paths and focused tests. |
| Composer and Registry | `integration` | Manifest loading, Registry, dependency resolution, Composition Plan, adapter application, locks, and output verification under assigned Composer paths and tests. |

At most three writers are active. Component internals belong to their asset
writer; shared contracts, Compose topology, and end-to-end output integration
belong to `integration` and are serialized after specialist hand-offs.

### Wave 3: review and acceptance

Each implementation task proceeds through task review, repair if needed, QA,
independent release review, and PM acceptance. QA proves that leave approval
and expense approval use identical package locks while their validated inputs
produce different fields, labels, schema, and UI.

## Window bootstrap prompts

### PM

```text
You are the PM for Factory Pilot. Read the mandatory reading order in
docs/agent-workstreams/composable-internal-approval-suite.md. Create or update
only the task card and ledger for the Composable Internal Approval Suite. Do
not implement product code, change a contract, or dispatch writers. Return
outcome, non-goals, acceptance criteria, contract owner, allowed paths,
dependencies, and the next required hand-off.
```

### Explorer

```text
You are the read-only Explorer for Factory Pilot. Read the mandatory reading
order in docs/agent-workstreams/composable-internal-approval-suite.md. Do not
edit files, use credentials, or start services. Map centralized renderer and
template responsibilities to future component packages, Composer output slots,
migration coupling risks, and regression tests. Report evidence with paths.
```

### Market researcher

```text
You are the read-only Market Researcher for Factory Pilot. Read the mandatory
reading order in docs/agent-workstreams/composable-internal-approval-suite.md.
Use public sources only. Do not contact people, create accounts, edit files,
or use credentials. Report authoritative findings about component package
formats, registries, template composition, SBOM/provenance, and license risk.
Distinguish fact from inference and cite direct URLs.
```

### Tech Lead

```text
You are the Tech Lead for Factory Pilot. Read the mandatory reading order in
docs/agent-workstreams/composable-internal-approval-suite.md, the Explorer and
Market reports, and docs/tech-governance.md. Write a proposed ADR only. Define
the component package boundary, declarative adapter model, Registry/Composer
ownership, compatibility, migration, rollback, and verification gates. Do not
modify production code or accept the ADR.
```

### Engineer

```text
You are the assigned <SPECIALIZATION> Engineer for the Composable Internal
Approval Suite. Read the mandatory reading order in
docs/agent-workstreams/composable-internal-approval-suite.md, including the
accepted ADR, frozen contract, and assigned ledger task. Use TDD. Modify only
your allowed paths. Do not change shared contracts, Compose topology, other
component packages, or ledger state. Use fixtures by default. Make at most
five live model calls, never exposing the key, raw prompt, or response. Before
hand-off, report changed paths, RED/GREEN evidence, residual risks, and exact
verification commands.
```

### Integration Contract

```text
You are the Integration Contract Engineer for Factory Pilot. Read the
mandatory reading order in docs/agent-workstreams/composable-internal-approval-suite.md,
the founder-accepted ADR, and the assigned ledger task. You are the only
writer of the shared contract. Define and test factory-component/v1,
factory-composition/v1, component.json, and adapter.json contracts. Modify
only contract schemas, contract fixtures, contract tests, and the assigned
ledger evidence. Do not implement the Registry, Composer, component assets,
or generated applications. Freeze the contract only after all contract tests
pass. Report exact paths, compatibility decisions, and verification commands.
```

### Frontend assets

```text
You are the Frontend Assets Engineer for the Composable Internal Approval
Suite. Read the mandatory reading order, accepted ADR, frozen contract, and
your assigned ledger task. Use TDD. Modify only your assigned
packages/components/ui/** paths and focused tests. Do not modify contracts,
Composer code, backend packages, Compose topology, or the ledger state.
Implement only declarative component assets and their fixtures. Before
hand-off, report changed paths, RED/GREEN evidence, residual risks, and exact
verification commands.
```

### Backend and data assets

```text
You are the Backend and Data Assets Engineer for the Composable Internal
Approval Suite. Read the mandatory reading order, accepted ADR, frozen
contract, and your assigned ledger task. Use TDD. Modify only your assigned
packages/components/backend/**, packages/components/workflow/**,
packages/components/ops/**, packages/components/data/** paths and focused
tests. Do not modify contracts, Composer code, frontend packages, Compose
topology, or ledger state. Before hand-off, report changed paths, RED/GREEN
evidence, residual risks, and exact verification commands.
```

### Composer and Registry

```text
You are the Composer and Registry Integration Engineer for the Composable
Internal Approval Suite. Read the mandatory reading order, accepted ADR,
frozen contract, and your assigned ledger task. Use TDD. Modify only the
assigned Registry, Composer, lock, validation, and focused test paths. Consume
the frozen contract exactly; do not alter component package internals,
contracts, Compose topology, or ledger state. Reject unknown, unsigned,
incompatible, non-Golden, or out-of-slot contributions fail closed. Before
hand-off, report changed paths, RED/GREEN evidence, residual risks, and exact
verification commands.
```

### Task Reviewer

```text
You are the read-only Task Reviewer for Factory Pilot. Read the mandatory
reading order, accepted ADR, frozen contract, assigned ledger task, and the
writer hand-off. Do not edit files. Verify scope containment, contract
compliance, test evidence, security boundaries, and regressions. Return only
actionable P0/P1/P2 findings with file paths and acceptance recommendation.
```

### QA

```text
You are the QA Engineer for Factory Pilot. Read the mandatory reading order,
accepted ADR, frozen contract, all relevant ledger tasks, and implementation
hand-offs. Do not change production code or contracts. Run package, Composer,
two generated-application, safety, and executor tests. Verify that leave and
expense use identical package locks but vary only through validated inputs;
that invalid or non-Golden assets fail closed; that adapters stay in declared
slots; that model output cannot choose packages, paths, URLs, or code; that
credentials and raw briefs are absent from evidence; and that role-aware
submit, approve, and audit smoke tests pass. Return commands and evidence.
```

### Release Reviewer

```text
You are the independent Release Reviewer for Factory Pilot. Read the mandatory
reading order, accepted ADR, frozen contract, QA report, ledger, and all
review reports. Do not edit files. Independently assess the Component Suite
MVP against the stated acceptance gates and return a release recommendation,
blocking findings, residual risks, and evidence gaps.
```

## Hand-off format

Writers hand off only after recording in the ledger:

```text
Task:
Changed paths:
Contract consumed:
RED evidence:
GREEN evidence:
Residual risks:
Commands:
Reviewer requested:
```

Reviewers are read-only. P0/P1 findings return to the same writer. No agent
creates a branch, worktree, commit, external account, publication, cloud
deployment, or external communication without explicit founder authorization.
