# Factory control plane

Local Python 3.12+ control plane for Factory Pilot's bounded approval-app profile. VNext sends a brief to a schema-bound OpenAI Responses API adapter, stores only its checksum and a validated structured application definition, and retains the former leave-blueprint API as a deprecated compatibility shim.

Install the control-plane dependencies before using VNext routes:

```powershell
python -m pip install -r apps/api/requirements-control-plane.txt
```

Set the local OpenAI credential in the process environment. It is read only by the server process; the API never accepts, stores, logs, or copies it into generated output. `FACTORY_OPENAI_MODEL` is optional and defaults to `gpt-5.6-terra`.

Set `OPENAI_API_KEY` through your local shell or secret configuration before starting the server. To override the default model, set `FACTORY_OPENAI_MODEL` to an approved model identifier; VNext does not load a `.env` file automatically.

## Deterministic fixture mode

Tests and local UI exploration can use the deterministic fixture provider instead of calling a model. It recognizes the bounded leave, expense, and equipment/access examples in `tests/evals/approval_app_briefs.json`; it is not a production model fallback and must be selected deliberately.

From the repository root, start the HTTP server in fixture mode with an explicit local capability. This process uses the normal local state and runs until interrupted. It does not need `OPENAI_API_KEY`.

```powershell
$env:FACTORY_API_TOKEN = [guid]::NewGuid().ToString('N')
$env:FACTORY_API_ACTOR = 'local-founder'
$fixtureServer = "from apps.api.control_plane import ControlPlane; from apps.api.llm_provider import FixtureRequirementToDefinitionProvider; from apps.api.server import Handler, serve; Handler.control_plane = ControlPlane(provider=FixtureRequirementToDefinitionProvider()); serve()"
python -c $fixtureServer
```

## Guarded live structured-schema smoke

This manual check is intentionally outside CI. Run it only after intentionally setting `OPENAI_API_KEY` in the current shell and installing `apps/api/requirements-control-plane.txt`. It calls the provider directly, so it creates no project, version, plan, run, or persistent state. It prints neither the brief, the API key, the model response, nor a provider response identifier; the output is limited to the configured model, a local checksum, and elapsed time.

```powershell
if (-not $env:OPENAI_API_KEY) { throw 'Set OPENAI_API_KEY in this shell before running the live schema smoke.' }
@'
from apps.api.application_definition import definition_checksum
from apps.api.llm_provider import OpenAIRequirementToDefinitionProvider, ProviderError

try:
    generated = OpenAIRequirementToDefinitionProvider().generate(
        "expense-approval",
        "Employees submit expense claims and managers approve or reject them.",
    )
except ProviderError:
    print("Live structured-schema smoke failed without persisting a project.")
    raise SystemExit(1)

print(
    "Live structured-schema smoke passed: "
    f"model={generated.model}; "
    f"definition_checksum={definition_checksum(generated.candidate)}; "
    f"elapsed_ms={generated.elapsed_ms}"
)
'@ | python -
```

Set a random local development capability before starting the server. The static UI asks for this value in the browser tab and the server derives the control-plane approver identity from its environment, not request JSON. This protects the local development console only; it is not the authentication model for the multi-user applications that Factory Pilot will generate.

```powershell
$env:FACTORY_API_TOKEN = [guid]::NewGuid().ToString('N')
$env:FACTORY_API_ACTOR = 'local-founder'
python -m apps.api.server
```

The server listens only on `127.0.0.1:8080`. Example flow:

```powershell
Use the browser console at `http://127.0.0.1:5173` for the supported API workflow. The capability is deliberately not included in command examples or source control.
```

## Static UI API and CORS

The server permits API browser requests only from `http://127.0.0.1:5173` (including `OPTIONS` preflight). Every state-changing endpoint requires both `Content-Type: application/json` and `X-Factory-Capability: <FACTORY_API_TOKEN>`; the actor is derived from `FACTORY_API_ACTOR` on the server. A static UI should use these endpoints:

VNext routes are defined by `docs/contracts/control-plane-vnext-api.md`. They create and approve versioned `ApplicationDefinition` records; a missing model credential or invalid model response returns `503 model_unavailable` and creates no project. The brief is not retained after its checksum and model call.

| Method | Path | Body | Response / gate |
| --- | --- | --- | --- |
| `GET` | `/api/projects` | — | VNext project summaries |
| `POST` | `/api/projects` | `{ "name", "brief" }` | `201 { project, version }`; model-backed first definition |
| `GET` | `/api/projects/{project_id}` | — | Version, plan, and run lineage |
| `POST` | `/api/projects/{project_id}/versions` | `{ "base_version_id", "definition" }` | `201 { version }`; local schema/profile validation |
| `POST` | `/api/versions/{version_id}/approve` | `{}` | Approves one immutable definition version |
| `POST` | `/api/versions/{version_id}/plans` | `{}` | `201 { plan }`; requires definition approval |
| `POST` | `/api/plans/{plan_id}/approve` | `{}` | `200 { plan }`; approves one immutable VNext plan |
| `POST` | `/api/plans/{plan_id}/runs` | `{}` | `201 { run }`; queues an approved VNext plan for the local Executor |
| `GET` | `/api/runs/{run_id}` | — | `200 { run }` for VNext runs; legacy runs keep their compatibility shape |

The following MVP routes are deprecated compatibility shims during VNext migration:

| Method | Path | Body | Response / gate |
| --- | --- | --- | --- |
| `GET` | `/api/catalog` | — | Golden component catalog |
| `POST` | `/api/requirements` | `{ "requirement": "Employees request leave...", "name": "optional" }` | `201 { requirement_id, ir_id, ir, ir_checksum, status }` |
| `POST` | `/api/irs/{ir_id}/approve` | `{}` | Approves the IR as the configured local actor |
| `POST` | `/api/irs/{ir_id}/plans` | — | `201` deterministic, pending-approval plan; requires IR approval |
| `POST` | `/api/plans/{plan_id}/approve` | `{}` | Approves the plan as the configured local actor |
| `POST` | `/api/plans/{plan_id}/runs` | — | `201` static blueprint run; requires plan approval |
| `GET` | `/api/runs/{run_id}` | — | Status plus ordered events |

Errors use `{ "error": { "code": "...", "message": "..." } }`. The `/api/*` surface is the only supported HTTP workflow.

Legacy blueprints are written below `apps/api/runs/<run-id>/output`; VNext approved builds are recorded as queued local-Executor handoffs. The control plane never accepts shell commands, arbitrary file paths, Git URLs, Docker images, or cloud credentials, and it never runs a shell command, starts a container, or deploys anything. State is local JSON under `apps/api/state/` (runtime data, not source).

Tests use `unittest` and need no install:

```powershell
python -m unittest discover -s tests/api -v
```
