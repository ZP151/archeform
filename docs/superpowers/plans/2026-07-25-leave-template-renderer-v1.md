# Leave Template Renderer v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a version-pinned, locally runnable leave-approval application from an approved Factory Pilot plan.

**Architecture:** Keep the control plane as a deterministic generator with no shell, Docker, or network execution. Add a repository-owned application template, copy it only into the isolated run output, and emit traceability files beside it. The generated application contains a FastAPI API, a minimal Next.js console, PostgreSQL, Docker Compose, and a standard-library smoke test that proves employee submission, manager decision, and audit history.

**Tech Stack:** Python 3.10 control plane and unit tests; generated Python 3.12/FastAPI service; generated Next.js 15/React console; PostgreSQL 16; Docker Compose; standard-library HTTP smoke test.

## Global Constraints

- Only the engineer assigned in `docs/superpowers/ledgers/leave-template-renderer-v1.md` may write production paths while the task is implementing.
- The control plane must not execute Docker, shell commands, network downloads, or unapproved artifacts.
- Generated application dependencies use exact versions; the template is repository-owned and copied only below an approved run output.
- Generated demo access is role-aware (`employee`, `manager`, `hr_admin`) and is not a substitute for production authentication.
- Preserve IR/plan approval gates, path containment checks, component lock, and evidence checksum behavior.
- Do not create branches, worktrees, commits, releases, deployments, or external accounts.

---

### Task 1: Render a repository-owned template into the approved output

**Files:**
- Create: `packages/templates/leave-approval/README.md`
- Create: `packages/templates/leave-approval/docker-compose.yml`
- Create: `packages/templates/leave-approval/.env.example`
- Modify: `apps/api/control_plane.py`
- Modify: `tests/api/test_control_plane.py`

**Interfaces:**
- Consumes: `ControlPlane._render_blueprint(output: Path, run: dict[str, Any], plan: dict[str, Any])`.
- Produces: `ControlPlane._copy_template(template_root: Path, output: Path) -> list[str]`; generated `docker-compose.yml`, `.env.example`, and application template files coexist with `application.ir.json`, `component-lock.json`, and `run-summary.json`.

- [ ] **Step 1: Write failing template-rendering tests**

```python
def test_approved_run_copies_the_owned_leave_template(self) -> None:
    run = self._approved_run()
    output = self._output(run)
    self.assertTrue((output / "docker-compose.yml").is_file())
    self.assertTrue((output / "backend" / "app" / "main.py").is_file())
    self.assertTrue((output / "frontend" / "app" / "page.tsx").is_file())

def test_template_copy_rejects_a_path_outside_the_template_root(self) -> None:
    with self.assertRaises(ControlPlaneError) as error:
        self.plane._copy_template(self.temp_path / "template", self.temp_path / "output")
    self.assertEqual("invalid_template", error.exception.code)
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `python -m unittest tests.api.test_control_plane.ControlPlaneTests.test_approved_run_copies_the_owned_leave_template -v`

Expected: FAIL because the generated output does not contain `docker-compose.yml` or application source.

- [ ] **Step 3: Add safe owned-template rendering**

```python
def _copy_template(self, template_root: Path, output: Path) -> list[str]:
    root = template_root.resolve()
    if not root.is_dir() or root != self.template_root.resolve():
        raise ControlPlaneError(500, "invalid_template", "owned application template is unavailable")
    copied: list[str] = []
    for source in root.rglob("*"):
        if source.is_dir():
            continue
        relative = source.relative_to(root)
        target = (output / relative).resolve()
        if output not in target.parents:
            raise ControlPlaneError(500, "unsafe_template_path", "template file escapes output directory")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
        copied.append(relative.as_posix())
    return sorted(copied)
```

Set `self.template_root` to `packages/templates/leave-approval`, invoke `_copy_template` from `_render_blueprint`, and add copied paths to `blueprint.rendered` evidence.

- [ ] **Step 4: Run focused and full control-plane tests**

Run: `python -m unittest discover -s tests/api -v`

Expected: PASS with template files and existing evidence assertions preserved.

### Task 2: Add the generated FastAPI leave workflow and PostgreSQL schema

**Files:**
- Create: `packages/templates/leave-approval/backend/Dockerfile`
- Create: `packages/templates/leave-approval/backend/requirements.txt`
- Create: `packages/templates/leave-approval/backend/app/main.py`
- Create: `packages/templates/leave-approval/backend/app/schema.sql`
- Create: `packages/templates/leave-approval/backend/app/test_api.py`

**Interfaces:**
- Consumes: `DATABASE_URL`, `X-Demo-Actor` request header, PostgreSQL service from Compose.
- Produces: `GET /health`, `POST /leave-requests`, `GET /leave-requests`, `POST /leave-requests/{id}/decision`, `GET /audit-events`.

- [ ] **Step 1: Write failing generated-application API tests**

```python
def test_employee_submit_manager_decision_and_hr_audit(client):
    request = client.post("/leave-requests", headers={"X-Demo-Actor": "employee"}, json={
        "start_date": "2026-08-03", "end_date": "2026-08-05", "reason": "Vacation"})
    assert request.status_code == 201
    decision = client.post(f"/leave-requests/{request.json()['id']}/decision", headers={"X-Demo-Actor": "manager"}, json={"decision": "approved"})
    assert decision.status_code == 200
    audit = client.get("/audit-events", headers={"X-Demo-Actor": "hr_admin"})
    assert [item["action"] for item in audit.json()] == ["leave_request.submitted", "leave_request.approved"]
```

- [ ] **Step 2: Run the generated backend test and verify RED**

Run after template render: `docker compose run --rm api pytest app/test_api.py -q`

Expected: FAIL because the API source and dependencies do not exist yet.

- [ ] **Step 3: Implement the minimal role-aware API**

Use FastAPI `HTTPException` for invalid roles and unauthorized actions. Initialize `leave_requests` and append-only `audit_events` with `schema.sql`. Use a transaction for every state mutation so each successful submission or decision creates exactly one corresponding audit event. Pin exact package versions in `requirements.txt`.

- [ ] **Step 4: Verify the generated backend test**

Run: `docker compose run --rm api pytest app/test_api.py -q`

Expected: PASS, including rejected employee decision and non-HR audit access tests.

### Task 3: Add the generated Next.js role-aware console and Compose topology

**Files:**
- Create: `packages/templates/leave-approval/frontend/Dockerfile`
- Create: `packages/templates/leave-approval/frontend/package.json`
- Create: `packages/templates/leave-approval/frontend/package-lock.json`
- Create: `packages/templates/leave-approval/frontend/next.config.mjs`
- Create: `packages/templates/leave-approval/frontend/next-env.d.ts`
- Create: `packages/templates/leave-approval/frontend/tsconfig.json`
- Create: `packages/templates/leave-approval/frontend/app/layout.tsx`
- Modify: `packages/templates/leave-approval/frontend/app/page.tsx`
- Create: `packages/templates/leave-approval/frontend/app/globals.css`
- Modify: `packages/templates/leave-approval/docker-compose.yml`
- Modify: `packages/templates/leave-approval/backend/app/main.py`
- Modify: `packages/templates/leave-approval/backend/app/test_api.py`
- Modify: `tests/api/test_control_plane.py`

**Interfaces:**
- Consumes: public API base URL `http://localhost:8000`; demo actor selected in the browser.
- Produces: web console on `http://localhost:3000`; API service on `http://localhost:8000`; database health gate.

**Additional constraints:**

- The API allows cross-origin browser requests only from `http://localhost:3000` and `http://127.0.0.1:3000`.
- CORS preflight permits `GET`, `POST`, and `OPTIONS` plus only `Content-Type` and `X-Demo-Actor`; no wildcard origin is allowed.
- The generated frontend has a committed lockfile and uses `npm ci`, with exact Next.js, React, React DOM, TypeScript, and type-package versions.
- Compose builds the browser bundle with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`; the browser must not be given the internal `api` hostname.

- [ ] **Step 1: Write failing rendered-file assertions**

```python
def test_rendered_template_declares_three_services_and_frontend_files(self) -> None:
    output = self._output(self._approved_run())
    compose = (output / "docker-compose.yml").read_text(encoding="utf-8")
    self.assertIn("api:", compose)
    self.assertIn("web:", compose)
    self.assertIn("db:", compose)
    self.assertTrue((output / "frontend" / "app" / "page.tsx").is_file())
    self.assertTrue((output / "frontend" / "package-lock.json").is_file())
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `python -m unittest tests.api.test_control_plane.ControlPlaneTests.test_rendered_template_declares_three_services_and_frontend_files -v`

Expected: FAIL because the rendered template has no frontend or Compose services.

- [ ] **Step 3: Implement the generated console and Compose file**

Add narrow FastAPI CORS middleware for the two specified local origins and cover both allowed preflight and rejected foreign-origin behavior in `backend/app/test_api.py`. Create a minimal responsive Next.js page with an actor selector, request form, pending-request list, manager decision controls, and audit list. Keep the actor header client-visible only for the demo. Define Compose services `db`, `api`, and `web`; make API wait for PostgreSQL health, make web wait for API health, and expose only ports `5432`, `8000`, and `3000` for local development. Use the configured Postgres user in the database health check.

- [ ] **Step 4: Validate Compose syntax**

Run from a freshly rendered output:

```powershell
docker compose config --quiet
docker compose build web
```

Expected: both commands exit 0; the rendered template contains a reproducibly installable frontend and a browser-safe local API boundary.

### Task 4: Prove a generated application starts and completes the workflow

**Files:**
- Create: `packages/templates/leave-approval/smoke_test.py`
- Modify: `packages/templates/leave-approval/README.md`
- Modify: `apps/api/control_plane.py`
- Modify: `tests/api/test_control_plane.py`

**Interfaces:**
- Consumes: generated Compose application running with API at `http://127.0.0.1:8000` and web at `http://127.0.0.1:3000`.
- Produces: exit-code-zero smoke evidence for API and web health, submit, decision, and audit sequence; a generated API contract that declares every implemented public route.

- [ ] **Step 1: Write the smoke script failure assertion**

```python
def test_rendered_template_includes_executable_smoke_test(self) -> None:
    output = self._output(self._approved_run())
    smoke = output / "smoke_test.py"
    self.assertTrue(smoke.is_file())
    self.assertIn("leave_request.approved", smoke.read_text(encoding="utf-8"))

def test_generated_api_contract_lists_every_leave_api_route(self) -> None:
    output = self._output(self._approved_run())
    contract = json.loads((output / "backend" / "api-contract.json").read_text(encoding="utf-8"))
    self.assertEqual(
        {"/health", "/leave-requests", "/leave-requests/{id}/decision", "/audit-events"},
        set(contract["paths"]),
    )
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `python -m unittest tests.api.test_control_plane.ControlPlaneTests.test_rendered_template_includes_executable_smoke_test -v`

Expected: FAIL because no smoke script is rendered.

- [ ] **Step 3: Implement deterministic smoke behavior and run instructions**

Update `ControlPlane._render_blueprint` so `backend/api-contract.json` includes `/health`, `/leave-requests`, `/leave-requests/{id}/decision`, and `/audit-events`. Use `urllib.request` only in the smoke script. Poll API `/health` and request the web root for at most 60 seconds, submit one request as employee, approve it as manager, fetch audit events as HR, and exit non-zero with a clear message on any mismatch. Document exact local commands:

```powershell
docker compose up --build -d
python smoke_test.py
docker compose down --volumes
```

- [ ] **Step 4: Run the generated end-to-end verification**

Run: `docker compose up --build -d; python smoke_test.py; docker compose down --volumes`

Expected: API health, web availability, submit, approval, and audit smoke checks pass; teardown completes even after a smoke failure.

## Plan self-review

- P0 criteria 1–6 remain covered by existing control-plane tests; template rendering adds a real controlled skeleton to criterion 4.
- The plan adds runtime evidence without permitting the control plane to invoke Docker, preserving the threat-model boundary.
- No task leaves an undefined integration point: the renderer, template paths, API routes, Compose services, and smoke command are named explicitly.
