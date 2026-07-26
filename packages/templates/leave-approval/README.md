# Leave Approval Application Template

This repository-owned template is rendered only after the control plane has an approved Application IR and component plan.

The rendered directory includes the immutable application IR, component lock, and run summary beside this application skeleton. Rendering copies local files only: it does not run shell commands, start containers, download dependencies, or deploy resources.

The generated application models three demo roles:

- `employee` submits and tracks leave requests.
- `manager` approves or rejects pending leave requests.
- `hr_admin` views records and audit history.

Demo roles are not production authentication. The API accepts the role through `X-Demo-Actor` only so the complete multi-user workflow can be evaluated locally.

## Run the generated application

VNext runs are normally handled by the separately started Factory Pilot
Executor. The workspace reports `queued`, `building`, `smoke_testing`,
`ready`, `failed`, or `stopped`, together with bounded logs, smoke evidence,
and a loopback-only preview URL. The Executor automatically tears a preview
down after 30 minutes or an explicit stop request.

From the generated output directory, use PowerShell to guarantee that containers and the database volume are removed even if the build or smoke test fails:

```powershell
try {
    docker compose up --build -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

    $webPort = (docker compose port web 3000).Split(":")[-1]
    $env:LEAVE_WEB_BASE_URL = "http://127.0.0.1:$webPort"
    python smoke_test.py
    if ($LASTEXITCODE -ne 0) { throw "smoke test failed" }
}
finally {
    docker compose down --volumes --remove-orphans
}
```

The smoke test waits up to 60 seconds for the API and web console, submits leave as `employee`, approves it as `manager`, and verifies the matching append-only audit events as `hr_admin`.
