# VNext Requirement-to-Product Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `.agents/skills/subagent-driven-development` or `.agents/skills/executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a founder-approved internal approval-app requirement into an editable, versioned application definition, an explainable Golden component plan, and a locally runnable preview with evidence.

**Architecture:** The control plane remains the only authority for requirement normalization, application-definition validation, approval state, catalog resolution, and artifact lineage. A schema-bound OpenAI adapter produces an initial `ApplicationDefinition` only; it never writes source files, selects a runtime, or calls tools. The control plane renders repository-owned files after both approvals, while a separate local Executor consumes an immutable queued-build artifact, runs the approved Compose application, records smoke evidence, and exposes a localhost-only preview URL.

**Tech Stack:** Python 3.12, `openai==2.48.0`, OpenAI Responses API, `gpt-5.6-terra` with `reasoning.effort="medium"`, JSON Schema, the existing FastAPI/Next.js/PostgreSQL/Docker Compose Golden profile, and the existing static local web console.

## Global Constraints

- VNext supports only a single-workflow internal approval application: one submitter role, one approver role, zero or more observer/auditor roles, one primary business record, one submit-to-approve-or-reject lifecycle, responsive web UI, PostgreSQL persistence, and append-only audit history.
- The OpenAI API key is read only from the local `OPENAI_API_KEY` environment variable. It is never accepted over HTTP, written to state, copied into output, or included in logs or evidence.
- Default model configuration is `gpt-5.6-terra` and `medium` reasoning. It is an explicit server environment override, not requirement text and not a UI choice in VNext.
- Raw requirement text remains browser-session-only. Persistent state contains a checksum, model provenance, validated structured definition versions, approvals, plans, runs, and evidence only.
- The model must return a strict structured definition and may not call tools, execute code, choose a stack, download components, or bypass validation. Invalid, unsafe, unavailable, or schema-incompatible responses produce no version, plan, or run.
- Every generated source file comes from a repository-owned template or deterministic renderer. A run may reference only Golden catalog entries pinned by key, version, and digest.
- Definition approval and build-plan approval are separate founder gates. A plan cannot queue a build until its definition and plan are approved.
- The Executor is a distinct local process with no cloud or production credentials. It executes only an immutable request below `apps/api/runs/<run-id>/`, only with fixed Docker Compose argument arrays, and binds preview ports to `127.0.0.1`.
- A preview has a 30-minute maximum lifetime, can be stopped explicitly, and must be torn down after smoke failure. VNext has no cloud deployment, Git publication, external component installation, multi-level approval, arbitrary workflows, or direct code editing.
- Existing path-containment, approved-catalog, capability-token, CORS, audit, and two-approval controls remain regression requirements.

---

## Product Contract

### Workspace flow

1. **Brief:** The founder enters a project name and English requirement. The UI sends it to the model adapter and displays a normal user-facing failure when the local API key is unavailable or the model cannot return a valid definition.
2. **Application definition:** The UI presents editable roles, primary-record fields, pages, lifecycle, assumptions, and open questions as forms and summary cards; it does not present raw JSON as the primary interface. Saving edits creates a new structured version whose parent is the version being edited. The founder approves one version explicitly.
3. **Build plan:** The control plane resolves the approved version to a component plan. Each component includes its Golden status, version, digest, dependency relationships, configured inputs, and a plain-English `selected_for` explanation. The founder approves one immutable plan explicitly.
4. **Build and preview:** The control plane creates the deterministic output and queues an immutable executor request. The Executor builds, starts, smoke-tests, reports phases/log excerpts, returns a localhost preview URL when ready, and accepts a control-plane stop request. The workspace shows artifacts and evidence alongside the preview state.
5. **Iteration:** The founder selects a prior structured version, edits it, and creates the next version. Previous approved plans, runs, and evidence remain immutable and browsable.

### Frozen public contract: `docs/contracts/application-definition-v1.schema.json`

The integration owner creates and freezes this schema before frontend and backend work run in parallel. It accepts exactly this normalized business shape:

```json
{
  "apiVersion": "factory/v1",
  "kind": "ApplicationDefinition",
  "metadata": { "name": "expense-approval", "version": "1" },
  "profile": "internal-approval-app",
  "roles": [
    { "id": "employee", "label": "Employee", "kind": "submitter" },
    { "id": "manager", "label": "Manager", "kind": "approver" },
    { "id": "hr", "label": "HR", "kind": "auditor" }
  ],
  "primary_record": {
    "id": "expense_claim",
    "label": "Expense claim",
    "fields": [
      { "id": "amount", "label": "Amount", "type": "number", "required": true },
      { "id": "description", "label": "Description", "type": "string", "required": true }
    ]
  },
  "workflow": {
    "id": "approval",
    "states": ["draft", "submitted", "approved", "rejected"],
    "transitions": [
      { "from": "draft", "to": "submitted", "action": "submit", "actor_kind": "submitter" },
      { "from": "submitted", "to": "approved", "action": "approve", "actor_kind": "approver" },
      { "from": "submitted", "to": "rejected", "action": "reject", "actor_kind": "approver" }
    ]
  },
  "pages": [
    { "id": "submit", "label": "Submit request", "kind": "form", "actor_kinds": ["submitter"] },
    { "id": "my_records", "label": "My requests", "kind": "list", "actor_kinds": ["submitter"] },
    { "id": "approval_queue", "label": "Approval queue", "kind": "queue", "actor_kinds": ["approver"] },
    { "id": "audit", "label": "Audit history", "kind": "audit", "actor_kinds": ["auditor"] }
  ],
  "non_functional": { "audit_log": true, "persistence": "postgresql", "ui": "responsive_web" },
  "assumptions": ["Approver assignment is static in the local preview."],
  "open_questions": []
}
```

Schema limits are: 2-5 unique roles; exactly one `submitter` and one `approver`; 0-3 `auditor`/`observer` roles; one primary record; 1-8 unique fields of type `string`, `number`, `date`, or `enum`; the four stated lifecycle states and three stated transitions; and the four stated page kinds. `additionalProperties` is false at every object level. The server additionally rejects reserved identifiers, duplicate IDs, invalid labels, missing actor/page coverage, credential-like text, and any definition that does not meet this workflow invariant.

### Versioned HTTP contract: `docs/contracts/control-plane-vnext-api.md`

The frozen contract defines JSON responses and error payloads for these routes. All mutating calls retain the existing local-origin and `X-Factory-Capability` checks; actor identity continues to come from the server environment.

| Route | Request | Result |
|---|---|---|
| `GET /api/projects` | none | Project summaries and their latest version/run status. |
| `POST /api/projects` | `{ "name": string, "brief": string }` | Creates a project and first generated definition version; raw `brief` is discarded after its checksum and model call. |
| `GET /api/projects/{project_id}` | none | Project lineage, structured versions, plan summaries, and run summaries. |
| `POST /api/projects/{project_id}/versions` | `{ "base_version_id": string, "definition": ApplicationDefinition }` | Validates and persists a child draft version; no model call and no raw brief. |
| `POST /api/versions/{version_id}/approve` | `{}` | Locks that structured version for planning. |
| `POST /api/versions/{version_id}/plans` | `{}` | Resolves the approved definition into an explainable Golden component plan. |
| `POST /api/plans/{plan_id}/approve` | `{}` | Locks the component plan. |
| `POST /api/plans/{plan_id}/runs` | `{}` | Renders deterministic output and creates a queued Executor request. |
| `GET /api/runs/{run_id}` | none | Run status, phase, preview URL, bounded log excerpt, artifact list, and smoke evidence. |
| `POST /api/runs/{run_id}/stop` | `{}` | Writes an immutable stop request for the Executor; it does not invoke Docker from the control plane. |

Error bodies remain `{ "error": { "code": string, "message": string } }`. Use `409` for state-gate violations, `422` for schema/profile violations, `503` for model or Executor unavailability, and retain existing `401`/`403` behavior. `GET` responses never expose the raw brief, API key, provider request contents, or complete local command lines.

## Delivery Sequence

### Task 1: Governance, contract freeze, and task routing

**Files:**
- Create: `docs/adr/002-vnext-model-adapter-and-local-executor.md`
- Create: `docs/contracts/application-definition-v1.schema.json`
- Create: `docs/contracts/control-plane-vnext-api.md`
- Create: `docs/superpowers/ledgers/vnext-requirement-to-product-workspace.md`
- Modify: `docs/architecture.md`, `docs/threat-model.md`, `docs/mvp.md`

**Owner:** `tech_lead` writes the proposed ADR; `pm` owns the ledger and contract-freeze record. **Specialization:** `integration`. **Dependency:** founder acceptance of ADR 002 before any implementation writer is dispatched.

- [ ] The Tech Lead writes ADR 002 as an `experiment` with exact proposed dependencies: Python 3.12, `openai==2.48.0`, Responses API, `gpt-5.6-terra`, `reasoning.effort="medium"`, repository JSON Schema validation, and a localhost Docker Compose Executor. It records the existing no-Docker control-plane boundary, the new queue-file handoff, 30-minute preview TTL, no-cloud-credential policy, rollback as disabling the Executor and retaining v0 rendering, and the verification commands in this plan.
- [ ] The founder records acceptance or rejection in ADR 002. Rejection leaves MVP behavior unchanged and closes this VNext plan without implementation.
- [ ] PM creates the VNext ledger in `planned` state, sets `integration` as contract owner, sets contract status to `unfrozen`, and copies the public contract above without adding implementation tasks.
- [ ] The integration owner creates the schema and HTTP-contract files, validates all supplied example objects against the schema, and marks the ledger contract `frozen` only after the frontend and backend reviewers confirm the exact route and JSON names.
- [ ] PM revises the three product/security documents to call V0 a historical MVP and define VNext’s bounded approval-app scope, model boundary, separate Executor, preview TTL, and explicit non-goals. PM does not claim VNext delivery in `docs/project-status.md` yet.

**Acceptance:** ADR approval and a frozen contract are present before any shared API, renderer, or UI implementation begins. The contract is the only permitted source for VNext endpoints and schema names.

### Task 2: Versioned definition domain and model adapter

**Files:**
- Create: `apps/api/application_definition.py`
- Create: `apps/api/llm_provider.py`
- Create: `apps/api/requirements-control-plane.txt`
- Modify: `apps/api/control_plane.py`, `apps/api/server.py`
- Modify: `tests/api/test_control_plane.py`
- Create: `tests/api/test_application_definition.py`, `tests/api/test_llm_provider.py`

**Owner:** one `engineer` with `backend` specialization. **Consumes:** frozen schema and HTTP contract. **Produces:** versioned project state and a `RequirementToDefinitionProvider` interface for later planner/UI work.

- [ ] Write failing tests for a valid structured definition, each schema limit, duplicate IDs, invalid lifecycle, reserved identifiers, no raw-brief persistence, a parent-to-child version lineage, and rejection of attempts to create a plan from an unapproved version.
- [ ] Add `application_definition.py` with `validate_definition(value: dict[str, Any]) -> dict[str, Any]`, `definition_checksum(value) -> str`, and `definition_summary(value) -> dict[str, Any]`. Validation first loads `docs/contracts/application-definition-v1.schema.json`, then applies exactly the semantic rules in `docs/contracts/control-plane-vnext-api.md#definition-semantic-validation`: unique role/field IDs, named reserved-identifier rejection, named credential-assignment rejection, and the fixed page-coverage matrix. It canonicalizes JSON before checksumming and returns a deep-copied validated value.
- [ ] Define `RequirementToDefinitionProvider.generate(name: str, brief: str) -> GeneratedDefinition` and a deterministic fixture provider. `GeneratedDefinition` contains the validated candidate plus `model`, `reasoning_effort`, `response_id`, token counts, and elapsed milliseconds; it contains neither prompt text nor API credentials.
- [ ] Implement `OpenAIRequirementToDefinitionProvider` using `OPENAI_API_KEY`, `FACTORY_OPENAI_MODEL` defaulting to `gpt-5.6-terra`, `reasoning.effort="medium"`, and a strict structured response matching the frozen schema. The prompt names the profile limits once, directs unsatisfied requests into `open_questions`, prohibits code/tool/stack decisions, and asks for English labels and assumptions. Validate the parsed response again locally before it reaches state.
- [ ] Map no key, timeout, provider refusal, malformed output, and local schema failure to explicit typed provider failures. `create_project` returns `503 model_unavailable` for unavailable provider states and writes no new persisted project/version; it never silently falls back to the old leave-only parser.
- [ ] Replace the fixed leave-only `create_project` path with project/version records. The initial version persists the validated definition, its checksum, checksum of the raw brief, provenance, timestamps, and `draft` status. `create_version` copies only submitted structured JSON, sets `parent_version_id`, and makes a new `draft`; it never reads or retains a raw brief.
- [ ] Implement the project/version routes exactly as frozen; preserve the legacy MVP endpoints only as documented deprecated shims for the duration of this VNext release, with no VNext UI dependency on them.
- [ ] Pin `openai==2.48.0` in the new control-plane requirements file and document `OPENAI_API_KEY` and optional `FACTORY_OPENAI_MODEL` in `apps/api/README.md` without including a key value or an automatic `.env` loader.

**Acceptance:** Fixture tests prove that a leave, expense, and equipment-access brief can each yield a different valid approval-app definition. Tests prove a missing key cannot create a project, raw brief text is absent from persisted state, invalid model output cannot create a version, and the approval gate prevents plan creation.

### Task 3: Explainable Golden component planning and definition-driven rendering

**Files:**
- Modify: `packages/catalog/components.json`, `apps/api/control_plane.py`
- Modify: `packages/templates/leave-approval/**`
- Modify: `tests/api/test_control_plane.py`
- Create: `tests/api/test_component_planner.py`

**Owner:** one `engineer` with `integration` specialization. **Consumes:** approved structured version. **Produces:** immutable component plans and a rendered generic approval application.

- [ ] Write failing planner tests showing that every required capability resolves to one Golden component, every selected item carries `key`, `version`, `artifact_digest`, `trust_level`, `requires`, `selected_for`, and definition-derived `inputs`, and no response field used by the UI is undefined.
- [ ] Extend each existing Golden manifest with deterministic `provides`, `input_contract`, and `selection_explanation` metadata. Do not add public components or dynamic registry fetching. The required VNext set remains the six existing approved components: web shell, CRUD API, local RBAC, single-level approval workflow, audit log, and local PostgreSQL.
- [ ] Implement `create_plan_for_version(version_id)` so it reads only a locked definition and builds a stable, checksum-pinned `ComponentPlan`. It maps the primary record, fields, role IDs, page labels, and workflow labels into component inputs; it records all six components as required for the constrained profile and tells the UI why each is mandatory. The plan refuses non-Golden, missing, digest-mismatched, or incompatible entries.
- [ ] Replace hard-coded leave labels in the renderer with deterministic template variables sourced only from the validated definition/locked plan. The generated API, PostgreSQL schema, forms, queues, list headings, audit view, README, OpenAPI title, and smoke fixture use the chosen primary-record label and fields.
- [ ] Preserve one generic workflow implementation: submitter creates its own record, approver approves or rejects submitted records, auditor reads audit history, and every state change adds one immutable audit event. Supporting arbitrary extra endpoints, custom formulas, arbitrary SQL, additional workflow states, and arbitrary page types are rejected by the definition validator rather than approximated.
- [ ] Emit `application-definition.json`, `component-lock.json`, `render-manifest.json`, and `run-summary.json` below the contained run output. The render manifest lists every generated file with SHA-256 and records definition/plan checksums, but never raw briefs or API credentials.

**Acceptance:** Rendering three approved definitions produces different application labels/forms/schema fields while retaining the same protected lifecycle and audit behavior. Planner tests prove deterministic output and explanation completeness; existing catalog/path-containment tests remain green.

### Task 4: Separate local Executor and preview evidence

**Files:**
- Create: `apps/executor/__init__.py`, `apps/executor/worker.py`, `apps/executor/README.md`
- Modify: `apps/api/control_plane.py`, `apps/api/server.py`
- Modify: `packages/templates/leave-approval/docker-compose.yml`, `packages/templates/leave-approval/smoke_test.py`, `packages/templates/leave-approval/README.md`
- Create: `tests/api/test_executor_handoff.py`, `tests/executor/test_worker.py`
- Modify: `tests/api/test_component_planner.py` (replace the Task 3 pre-Executor artifact assertion with the approved-run Executor-request evidence assertion)

**Owner:** one `engineer` with `platform` specialization; the integration owner serializes changes to the shared renderer/Compose files. **Consumes:** an approved component plan and rendered artifacts. **Produces:** queued/building/smoke-testing/ready/failed/stopped run states and local preview evidence.

- [ ] Write failing tests for a queued request whose checksums match its rendered manifest, a tampered request/lock/output rejection, an unapproved plan rejection, a malformed run ID/path rejection, fixed Compose argument construction, localhost-only preview URL validation, timeout cleanup, explicit stop, and TTL stop.
- [ ] Change `create_run` to render immutable output and write `executor-request.json` with run ID, output-relative paths, definition/plan/render-manifest checksums, creation time, and a 30-minute expiry. It sets `queued`; the control plane never imports `subprocess`, calls Docker, or sends network requests to the Executor.
- [ ] Implement `python -m apps.executor.worker` as an explicit local worker that polls only the configured runs root. It verifies the request and all lock/manifest checksums before performing any action, writes phase/status files atomically under the same run, updates a bounded heartbeat, and ignores expired, stopped, malformed, duplicate, or already-terminal requests. The control plane reports `ExecutorView.status` as `online` when the heartbeat is at most 10 seconds old, `offline` when it is older or absent during a non-terminal run, and `unknown` for a terminal run without a worker status file.
- [ ] Invoke Docker only with a fixed argument array equivalent to `docker compose --project-name factory_<safe-run-suffix> --file <validated-output>/docker-compose.yml up --build --detach`; do not interpolate a requirement, label, ID, path, or UI value into a shell string. Compose publishes the web service on a Docker-selected host port bound to `127.0.0.1`; the worker derives the preview URL only through fixed `docker compose port web 3000` inspection and rejects non-loopback results.
- [ ] Run the output’s smoke test against the discovered URL with a 60-second bounded readiness deadline. Persist a bounded, credential-redacted log excerpt, exact phase timestamps, preview URL, smoke result, and artifact paths. On build/start/smoke failure, run fixed `docker compose ... down --volumes --remove-orphans` cleanup and mark the run `failed`.
- [ ] Implement control-plane stop handling as `stop-request.json`; the worker detects it, runs the same fixed teardown, and marks `stopped`. The worker also stops ready previews when their expiry passes. `GET /api/runs/{id}` merges the worker’s allowed status fields without exposing command lines.
- [ ] Update template docs so the generated application can still be manually run, but VNext workspace evidence identifies whether it was rendered-only, queued, building, smoke-testing, ready, failed, or stopped.

**Acceptance:** A real Docker-enabled local test queues an approved dynamic application, the separate worker produces a reachable `127.0.0.1` preview, and the browser/API smoke proves submit, approve, and audit paths. Tampering, missing approvals, expiry, and smoke failure leave no running Compose project. The control-plane source has no Docker or shell invocation.

### Task 5: Iterative product workspace UI

**Files:**
- Modify: `apps/web/index.html`, `apps/web/app.js`, `apps/web/styles.css`, `apps/web/README.md`
- Create: `tests/web/workspace-e2e.mjs`

**Owner:** one `engineer` with `frontend` specialization. **Consumes:** the frozen HTTP contract and a fixture-backed control plane. **Produces:** a founder-facing workspace that does not require raw JSON to operate.

- [ ] Write a browser test that creates a fixture-backed project, edits the primary record and a field, saves a child version, approves its definition, inspects the explained component plan, approves it, queues a build, observes a mocked ready preview, opens its localhost URL, and stops it.
- [ ] Replace the current three-step blueprint console with four persistent workspace stages: `Brief`, `Application definition`, `Build plan`, and `Build & preview`. Add a project/version sidebar showing lineage, statuses, timestamps, and the selected version after page reload.
- [ ] Render definition fields with DOM creation and `textContent`, never model-controlled `innerHTML`. Provide structured controls for roles, primary-record label, field list/type/required flag, page labels, assumptions, and open questions. The form must enforce the same visible profile limits before submit and show server validation messages beside the relevant stage.
- [ ] Make definition approval a deliberate action labelled `Approve application definition`; make component-plan approval labelled `Approve build plan`. Show the component explanation, dependency list, version/digest/Golden status, configured inputs, known profile limit, and artifact checklist before the second approval.
- [ ] After the second approval, use `Queue local build` and poll `GET /api/runs/{id}` with a bounded interval while status is non-terminal. Show phase, elapsed time, redacted log excerpt, smoke outcome, artifact links/list, a disabled `Open preview` action until `ready`, and a `Stop preview` action only while queued/building/ready.
- [ ] Add `Create next version` from any stored definition. It uses the structured current definition as the parent; it never attempts to reconstruct or display the discarded raw brief. Keep the local capability token only in the live browser tab and label it `Local session capability` in an expandable connection panel.
- [ ] Eliminate all `undefined` component metadata, raw IR JSON as the default review surface, and all user-facing “blueprint generated” wording from the primary success path. Keep JSON only in an explicit Evidence/details panel for diagnosis.

**Acceptance:** A founder can complete the full flow without reading JSON: brief → editable definition → first approval → explainable plan → second approval → queue → ready preview → stop → child version. The page is safe against a label containing HTML and accurately reflects failed/expired/offline Executor states.

### Task 6: Evaluation, release evidence, and PM handoff

**Files:**
- Create: `tests/evals/approval_app_briefs.json`
- Modify: `tests/api/test_control_plane.py`, `tests/agents/test_agent_workflow_contract.py`
- Modify: `docs/project-status.md`, `docs/architecture.md`, `docs/threat-model.md`, `docs/mvp.md`
- Modify: `docs/superpowers/ledgers/vnext-requirement-to-product-workspace.md`

**Owner:** `qa` may add only explicitly assigned test paths after engineering hand-off; `reviewer` is read-only; `pm` is the only writer of ledger state and final status. **Specialization:** `integration`.

- [x] Create three versioned fixture briefs—leave request, expense claim, and equipment access—and their expected structured definitions/component plans. The fixture provider must make these deterministic; no required test performs a paid live model call.
- [x] Add a guarded manual OpenAI smoke command documented in `apps/api/README.md`. It runs only when `OPENAI_API_KEY` is intentionally set, creates no persistent project, redacts identifiers from output, and verifies model output against the same schema; it is not part of CI or the required check list.
- [x] Run unit/domain, API, agent-governance, JavaScript syntax, rendering, Executor fake-Docker, real Docker generated-app, and browser workspace checks. Retain exact commands and fresh outputs in the ledger.
- [x] QA specifically verifies: raw brief/key absence from JSON state and output; prompt-injection text cannot alter Docker arguments; the worker rejects tampered evidence; a definition/plan cannot be skipped; different approved definitions create materially different UI/schema labels; preview is loopback-only; expiration/stop tear down the Compose project; and a failed model/worker leaves a usable editable draft or clear retry path without a partial run.
- [x] Task reviewer reviews each engineering task against this plan. Release reviewer independently checks no P0/P1 findings, confirmation of the golden component lock, UI flow correctness, executor isolation, and evidence completeness. P0/P1 findings return to the originating writer under the existing repair-cycle rule.
- [x] PM changes the VNext ledger only through `planned → implementing → ready_for_qa → reviewed → accepted`, updates `docs/project-status.md` only after QA and release review pass, and reports to the founder: current milestone, completed evidence, unresolved risks, preview status, and the next smallest slice.

**Acceptance:** The release evidence demonstrates three distinct approval-app definitions, one real locally runnable preview, preservation of every existing MVP safety regression, and no required test that needs a live model key or external account.

## Required Verification Commands

```powershell
python -m unittest discover -s tests/agents -v
python -m unittest discover -s tests/api -v
python -m unittest discover -s tests/executor -v
node --check apps/web/app.js
node tests/web/workspace-e2e.mjs
python packages/templates/leave-approval/smoke_test.py --help
git diff --check
```

The real Docker Executor/browser test is run only after Docker Desktop is available and the local worker is started explicitly. The final ledger records the exact command, run ID, preview URL redacted to localhost, test output, and teardown result.

## PM Dispatch Order

1. PM asks Tech Lead for ADR 002 and waits for founder acceptance.
2. PM freezes the contract and creates the VNext ledger.
3. Backend Task 2 runs first; the contract owner re-confirms the frozen API artifact.
4. After Task 2, Task 3 and Task 5 may proceed only if their allowed paths are disjoint. Task 3 owns the shared template root, and Task 5 owns only `apps/web/**`.
5. Task 4 is serialized after Task 3 because it changes the renderer/Compose topology.
6. QA, task reviews, and release review run after the corresponding writer hand-offs; PM alone updates state and founder-facing project status.

## Explicit Decisions

- **Scope:** deepen the internal single-level approval-app Golden Path; do not claim arbitrary-app generation.
- **Review gates:** approve an editable application definition, then approve an explainable build plan.
- **Model:** OpenAI Responses API with `gpt-5.6-terra` and `medium` reasoning; OpenAI’s current model guidance positions Terra as the intelligence/cost balance and recommends Responses API for reasoning workflows. [Model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- **Privacy:** persist structured definition history and a checksum only; leave raw requirement text in the browser session.
- **Runtime:** separate queue-file local Executor; no control-plane Docker, shell, cloud, or production credentials.
- **Iteration:** founder edits structured versions; VNext intentionally omits free-form change-chat and source-code editing.
