# Control Plane VNext API Contract

**Version:** `factory-control/vnext-1`
**Owner:** integration
**Status:** frozen
**Authentication:** every `POST` requires the existing local `Origin: http://127.0.0.1:5173`, JSON content type, and `X-Factory-Capability`. The server supplies the actor identity; clients cannot submit an actor value.

## Shared rules

- Responses are JSON and use `Cache-Control: no-store`.
- Error responses are `{ "error": { "code": string, "message": string } }`.
- `409` means a state transition is not allowed; `422` means a schema/profile violation; `503` means the configured model or local Executor is unavailable.
- Responses omit raw briefs, API credentials, provider prompt/response content, and complete command lines.
- `ApplicationDefinition` is the exact JSON object validated by `application-definition-v1.schema.json`.
- IDs are opaque strings matching `^(prj|ver|plan|run)_[A-Za-z0-9_-]{32}$`; timestamps are UTC RFC 3339 strings; SHA-256 values are `sha256:` followed by 64 lowercase hex digits.
- Approval is idempotent: approving an already-approved version or plan returns its current object. Planning is idempotent per approved version: a later identical request returns its existing plan. A run request always creates one new run. Stop is idempotent for `stopped` runs and returns `409 terminal_run` for `failed` runs.

## Definition semantic validation

Schema validation always runs first. The server then applies these deterministic semantic rules; violation returns `422 invalid_definition`.

- IDs in `roles` and `primary_record.fields` must each be unique. A role, primary-record, or field ID cannot be one of `id`, `status`, `created_at`, `updated_at`, `deleted_at`, `actor`, `role`, `admin`, `root`, `system`, `api`, `metadata`, `workflow`, `page`, `plan`, or `run`.
- Any label, statement, or enum option is rejected when it case-insensitively matches `(?:api[_ -]?key|secret|password|token|private[_ -]?key)\s*[:=]`.
- The `submit` and `my_records` pages have exactly `["submitter"]`; `approval_queue` has exactly `["approver"]`. The `audit` page has the ordered present subset of `["auditor", "observer"]`; when that subset is empty, it has `["approver"]`.
- Every actor kind named by a page must exist in `roles`. Every auditor/observer role must appear on the audit page. A submitted version cannot add a second primary record, transition, page, page kind, or role kind outside the schema profile.

## Version state machine and request validation

- A project `name` must match `^[a-z][a-z0-9-]{2,62}$`; a `brief` must be a trimmed UTF-8 string from 1 to 12,000 characters. Violations return `422 invalid_project_name` or `422 invalid_brief`.
- A version child request requires a supplied `base_version_id` that exists in the same project. Unknown base returns `404 version_not_found`; a version belonging to another project returns `409 base_version_wrong_project`. Either a draft or approved version may be a parent; a child is always a new immutable draft.
- A version transitions only `draft → approved`. Its definition cannot be replaced. A request to approve an approved version returns it unchanged. Creating a plan for a draft returns `409 version_not_approved`; creating a plan for an approved version returns the unique existing plan or creates exactly one pending plan.
- A plan transitions only `pending_approval → approved`; reapproval is idempotent. Queuing a run for a non-approved plan returns `409 plan_not_approved`.

## Shared object shapes

`ProjectSummary` is `{ id, name, created_at, latest_version_id|null, latest_version_status|null, latest_run_status|null }`.

`ModelProvenance` is `{ provider: "openai"|"fixture", model, reasoning_effort|null, response_id|null, input_tokens|null, output_tokens|null, elapsed_ms }`. It never includes a raw prompt or provider output.

`DefinitionVersion` is `{ id, project_id, parent_version_id|null, definition: ApplicationDefinition, definition_checksum, brief_checksum|null, provenance: ModelProvenance|null, status: "draft"|"approved", created_at, approved_at|null, approved_by|null }`.

`ComponentInputs` is `{ roles: string[], primary_record: { id, label, field_ids: string[] }, pages: string[], workflow: "approval" }`.

`Component` is `{ key, version, artifact_digest, category, trust_level: "golden", requires: string[], selected_for: string, inputs: ComponentInputs }`. `selected_for` is an English 1-300-character explanation without markup.

`ComponentPlan` is `{ id, project_id, version_id, status: "pending_approval"|"approved", checksum, components: Component[], known_profile_limit: string, artifact_checklist: string[], created_at, approved_at|null, approved_by|null }`. `artifact_checklist` is exactly `["application-definition.json", "component-lock.json", "render-manifest.json", "run-summary.json", "executor-request.json"]`.

`RunEvent` is `{ sequence, type, at, payload }`, where `sequence` starts at `1` and `payload` contains only JSON-safe identifiers, phase messages, and artifact references.

`Artifact` is `{ id, path, sha256, kind, url }`; `id` is an opaque artifact identifier, `path` is relative to the contained run output, `url` is the matching controlled artifact endpoint, and `kind` is one of `application_definition`, `component_lock`, `render_manifest`, `run_summary`, `executor_request`, `executor_status`, or `smoke_evidence`.

`SmokeEvidence` is `null` or `{ status: "passed"|"failed", started_at, finished_at, summary }`.

`ExecutorView` is `{ status: "online"|"offline"|"unknown", message: string|null, last_heartbeat_at: string|null }`.

`RunView` is `{ id, plan_id, status: "queued"|"building"|"smoke_testing"|"ready"|"failed"|"stopped", created_at, finished_at|null, expires_at, phase: "rendering"|"queued"|"building"|"smoke_testing"|"ready"|"failed"|"stopping"|"stopped", stop_reason: null|"requested"|"expired", preview_url|null, executor: ExecutorView, log_excerpt: string[], smoke: SmokeEvidence, artifacts: Artifact[], events: RunEvent[] }`. `stop_reason` is `"requested"` or `"expired"` only when status is `stopped`; it is `null` in all other states.

`ProjectDetail` is `{ id, name, created_at, versions: DefinitionVersion[], plans: ComponentPlan[], runs: RunView[] }`.

## Endpoints

### `GET /api/projects`

Returns `{ "projects": [ProjectSummary] }`. `ProjectSummary` contains `id`, `name`, `created_at`, `latest_version_id`, `latest_version_status`, and `latest_run_status`.

### `POST /api/projects`

Request: `{ "name": string, "brief": string }`.

Success `201`: `{ "project": ProjectDetail, "version": DefinitionVersion }`. The server sends `brief` only to the configured provider, persists its SHA-256 checksum, and never returns or stores the raw text. A provider failure returns `503 model_unavailable` and creates no project.

### `GET /api/projects/{project_id}`

Returns `{ "project": ProjectDetail }`. `versions` are ordered oldest-first and contain no raw brief; `plans` and `runs` are ordered oldest-first.

### `POST /api/projects/{project_id}/versions`

Request: `{ "base_version_id": string, "definition": ApplicationDefinition }`.

Success `201`: `{ "version": DefinitionVersion }`. The supplied base must belong to the project. The new version is a `draft`, stores `parent_version_id`, and is locally validated before persistence.

### `POST /api/versions/{version_id}/approve`

Request: `{}`. Success `200`: `{ "version": DefinitionVersion }` with `status: "approved"`, `approved_at`, and `approved_by`.

### `POST /api/versions/{version_id}/plans`

Request: `{}`. Success `201`: `{ "plan": ComponentPlan }`. The version must be approved.

`ComponentPlan` contains `id`, `version_id`, `status`, `checksum`, timestamps, and `components`. Each component has `key`, `version`, `artifact_digest`, `category`, `trust_level`, `requires`, `selected_for`, and `inputs`.

### `POST /api/plans/{plan_id}/approve`

Request: `{}`. Success `200`: `{ "plan": ComponentPlan }` with `status: "approved"`, `approved_at`, and `approved_by`.

### `POST /api/plans/{plan_id}/runs`

Request: `{}`. Success `201`: `{ "run": RunView }`. The plan must be approved. The result is initially `queued`; this route renders owned artifacts and writes an Executor request but never starts Docker.

### `GET /api/runs/{run_id}`

Returns `{ "run": RunView }`. `preview_url` is `null` unless `status` is `ready`, and when set it is `http://127.0.0.1:<port>/`.

### `GET /api/runs/{run_id}/artifacts/{artifact_id}`

Returns the exact listed artifact bytes with a safe content type and `Cache-Control: no-store`. The route rejects artifact IDs not listed by that run with `404 artifact_not_found`, and never accepts a caller-provided filesystem path. The workspace fetches this endpoint with the local capability header before creating a browser download.

### `POST /api/runs/{run_id}/stop`

Request: `{}`. Success `202`: `{ "run": RunView }`. It creates a stop-request artifact only. The Executor performs teardown and eventually exposes `stopped` through `GET /api/runs/{run_id}`.
