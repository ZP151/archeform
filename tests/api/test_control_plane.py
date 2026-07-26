from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from apps.api.control_plane import ControlPlane, ControlPlaneError, load_golden_catalog
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider, GeneratedDefinition, ProviderUnavailableError
from apps.api.server import Handler


class VNextControlPlaneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(root / "state.json", root / "runs", provider=FixtureRequirementToDefinitionProvider())

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_creates_versioned_project_without_persisting_raw_brief_and_enforces_plan_gate(self) -> None:
        brief = "Employees submit expense claims and managers approve them."
        created = self.plane.create_project("expense-approval", brief)
        project = created["project"]
        version = created["version"]
        self.assertEqual("draft", version["status"])
        self.assertEqual("expense_claim", version["definition"]["primary_record"]["id"])
        stored = self.plane._state["projects"][project["id"]]
        self.assertNotIn("brief", stored)
        self.assertNotIn(brief, json.dumps(self.plane._state))
        with self.assertRaises(ControlPlaneError) as blocked:
            self.plane.create_plan(version["id"])
        self.assertEqual((409, "version_not_approved"), (blocked.exception.status, blocked.exception.code))
        approved = self.plane.approve_version(version["id"], "founder")
        self.assertEqual("approved", approved["status"])
        plan = self.plane.create_plan(version["id"])
        self.assertEqual(version["id"], plan["version_id"])

    def test_child_version_has_lineage_and_invalid_model_output_leaves_no_project(self) -> None:
        created = self.plane.create_project("leave-approval", "Employees submit leave requests and managers approve them.")
        base = created["version"]
        definition = json.loads(json.dumps(base["definition"]))
        definition["metadata"]["version"] = "2"
        child = self.plane.create_version(created["project"]["id"], base["id"], definition)
        self.assertEqual(base["id"], child["parent_version_id"])
        self.assertEqual("draft", child["status"])

        class FailingProvider:
            def generate(self, name: str, brief: str) -> object:
                raise ProviderUnavailableError("no model")

        failing = ControlPlane(Path(self.temp.name) / "failed-state.json", Path(self.temp.name) / "failed-runs", provider=FailingProvider())
        with self.assertRaises(ControlPlaneError) as unavailable:
            failing.create_project("equipment-access", "Staff request equipment access.")
        self.assertEqual((503, "model_unavailable"), (unavailable.exception.status, unavailable.exception.code))
        self.assertEqual({}, failing._state["projects"])

    def test_invalid_provider_candidate_does_not_create_or_change_disk_state(self) -> None:
        class InvalidProvider:
            def generate(self, name: str, brief: str) -> GeneratedDefinition:
                return GeneratedDefinition(
                    candidate={"not": "an application definition"}, model="fixture-invalid", reasoning_effort=None,
                    response_id=None, input_tokens=None, output_tokens=None, elapsed_ms=0, provider="fixture",
                )

        state_path = Path(self.temp.name) / "invalid-provider-state.json"
        failing = ControlPlane(state_path, Path(self.temp.name) / "invalid-provider-runs", provider=InvalidProvider())
        with self.assertRaises(ControlPlaneError) as unavailable:
            failing.create_project("equipment-access", "Staff request equipment access.")
        self.assertEqual((503, "model_unavailable"), (unavailable.exception.status, unavailable.exception.code))
        self.assertEqual({}, failing._state["projects"])
        self.assertFalse(state_path.exists())

    def test_successful_project_persists_only_safe_definition_provenance(self) -> None:
        brief = "UNIQUE RAW BRIEF: Employees submit equipment access requests and security approves them."
        api_key = "sk-test-raw-key-must-not-persist"
        prompt_text = "UNIQUE PROMPT TEXT: interpret only the bounded approval profile"
        response_marker = "UNIQUE FULL PROVIDER RESPONSE: do-not-persist"

        class RecordingProvider:
            def generate(self, name: str, supplied_brief: str) -> GeneratedDefinition:
                self.api_key = api_key
                self.prompt = prompt_text
                self.full_response = response_marker
                candidate = FixtureRequirementToDefinitionProvider().generate(name, supplied_brief).candidate
                return GeneratedDefinition(
                    candidate=candidate, model="fixture-safe", reasoning_effort=None, response_id="resp_safe_only",
                    input_tokens=5, output_tokens=7, elapsed_ms=1, provider="fixture",
                )

        state_path = Path(self.temp.name) / "safe-success-state.json"
        plane = ControlPlane(state_path, Path(self.temp.name) / "safe-success-runs", provider=RecordingProvider())
        created = plane.create_project("equipment-access", brief)
        persisted = state_path.read_text(encoding="utf-8")
        for forbidden in (brief, api_key, prompt_text, response_marker):
            self.assertNotIn(forbidden, persisted)
        stored_version = json.loads(persisted)["versions"][created["version"]["id"]]
        self.assertEqual(created["version"]["definition"], stored_version["definition"])
        self.assertEqual(created["version"]["definition_checksum"], stored_version["definition_checksum"])
        self.assertEqual({
            "provider": "fixture", "model": "fixture-safe", "reasoning_effort": None, "response_id": "resp_safe_only",
            "input_tokens": 5, "output_tokens": 7, "elapsed_ms": 1,
        }, stored_version["provenance"])


class ControlPlaneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(root / "state.json", root / "runs")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _project(self) -> dict:
        return self.plane.create_legacy_project("leave-management", "Employees submit leave requests, managers approve them, and HR views all leave records")

    def _approved_run(self) -> dict:
        project = self._project()
        self.plane.approve_ir(project["id"], "reviewer")
        plan = self.plane.create_plan(project["id"])
        self.plane.approve_plan(plan["id"], "reviewer")
        return self.plane.create_run(plan["id"])

    def _output(self, run: dict) -> Path:
        return Path(self.temp.name) / "runs" / run["id"] / "output"

    def test_approved_run_copies_the_owned_leave_template(self) -> None:
        run = self._approved_run()
        output = self._output(run)
        self.assertTrue((output / "docker-compose.yml").is_file())
        self.assertTrue((output / "backend" / "app" / "main.py").is_file())
        self.assertTrue((output / "frontend" / "app" / "page.tsx").is_file())

    def test_approved_run_includes_the_leave_api_runtime_contract(self) -> None:
        """A rendered run must include every file needed to test the API workflow."""
        run = self._approved_run()
        backend = self._output(run) / "backend"
        self.assertTrue((backend / "Dockerfile").is_file())
        self.assertTrue((backend / "requirements.txt").is_file())
        self.assertTrue((backend / "app" / "schema.sql").is_file())
        self.assertTrue((backend / "app" / "test_api.py").is_file())

    def test_rendered_template_declares_three_services_and_locked_frontend(self) -> None:
        """A rendered run must contain the reproducible three-service browser application."""
        output = self._output(self._approved_run())
        compose = (output / "docker-compose.yml").read_text(encoding="utf-8")
        self.assertIn("  db:", compose)
        self.assertIn("  api:", compose)
        self.assertIn("  web:", compose)
        self.assertIn("NEXT_PUBLIC_API_BASE_URL: http://localhost:8000", compose)
        frontend = output / "frontend"
        for relative in (
            "Dockerfile",
            "package.json",
            "package-lock.json",
            "next.config.mjs",
            "next-env.d.ts",
            "tsconfig.json",
            "app/layout.tsx",
            "app/page.tsx",
            "app/globals.css",
        ):
            with self.subTest(relative=relative):
                self.assertTrue((frontend / relative).is_file())
        package = json.loads((frontend / "package.json").read_text(encoding="utf-8"))
        self.assertEqual("15.5.21", package["dependencies"]["next"])
        self.assertEqual("19.2.7", package["dependencies"]["react"])
        self.assertEqual("19.2.7", package["dependencies"]["react-dom"])
        self.assertEqual("5.9.3", package["devDependencies"]["typescript"])

    def test_rendered_smoke_test_completes_the_role_aware_workflow(self) -> None:
        """The rendered smoke artifact must exercise each public runtime boundary."""
        events: list[tuple[str, str, str | None, dict | None]] = []

        class SmokeContractHandler(BaseHTTPRequestHandler):
            def _respond(self, status: int, body: object, content_type: str = "application/json") -> None:
                encoded = json.dumps(body).encode("utf-8") if content_type == "application/json" else str(body).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)

            def do_GET(self) -> None:
                actor = self.headers.get("X-Demo-Actor")
                events.append(("GET", self.path, actor, None))
                if self.path == "/health":
                    self._respond(200, {"status": "ok"})
                elif self.path == "/":
                    self._respond(200, "<!doctype html><title>Leave approval</title>", "text/html")
                elif self.path == "/audit-events":
                    self._respond(200, [
                        {"leave_request_id": "request-1", "action": "leave_request.submitted", "actor": "employee"},
                        {"leave_request_id": "request-1", "action": "leave_request.approved", "actor": "manager"},
                    ])
                else:
                    self._respond(404, {"detail": "not found"})

            def do_POST(self) -> None:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length)) if length else None
                actor = self.headers.get("X-Demo-Actor")
                events.append(("POST", self.path, actor, payload))
                if self.path == "/leave-requests":
                    self._respond(201, {"id": "request-1", "status": "pending"})
                elif self.path == "/leave-requests/request-1/decision":
                    self._respond(200, {"id": "request-1", "status": "approved"})
                else:
                    self._respond(404, {"detail": "not found"})

            def log_message(self, format: str, *args: object) -> None:
                return

        output = self._output(self._approved_run())
        server = ThreadingHTTPServer(("127.0.0.1", 0), SmokeContractHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base_url = f"http://127.0.0.1:{server.server_port}"
        environment = dict(os.environ)
        environment["LEAVE_API_BASE_URL"] = base_url
        environment["LEAVE_WEB_BASE_URL"] = base_url
        try:
            completed = subprocess.run(
                [sys.executable, "smoke_test.py"],
                cwd=output,
                capture_output=True,
                check=False,
                env=environment,
                text=True,
                timeout=10,
            )
        finally:
            server.shutdown()
            thread.join()
            server.server_close()

        self.assertEqual(0, completed.returncode, completed.stdout + completed.stderr)
        self.assertIn("Smoke test passed", completed.stdout)
        self.assertIn(("GET", "/health", None, None), events)
        self.assertIn(("GET", "/", None, None), events)
        self.assertIn(("POST", "/leave-requests", "employee", {
            "start_date": "2026-08-03",
            "end_date": "2026-08-05",
            "reason": "Factory Pilot smoke test",
        }), events)
        self.assertIn(("POST", "/leave-requests/request-1/decision", "manager", {"decision": "approved"}), events)
        self.assertIn(("GET", "/audit-events", "hr_admin", None), events)

    def test_owned_smoke_script_exposes_offline_help(self) -> None:
        environment = dict(os.environ)
        environment["LEAVE_API_BASE_URL"] = "http://127.0.0.1:1"
        environment["LEAVE_WEB_BASE_URL"] = "http://127.0.0.1:1"
        result = subprocess.run(
            [sys.executable, str(self.plane.template_root / "smoke_test.py"), "--help"],
            capture_output=True,
            env=environment,
            text=True,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("generated approval application", result.stdout.lower())

    def test_rendered_smoke_startup_budget_caps_probes_and_sleep(self) -> None:
        """Startup probing must not schedule network or sleep work beyond its deadline."""
        smoke_path = self._output(self._approved_run()) / "smoke_test.py"
        spec = importlib.util.spec_from_file_location("rendered_leave_smoke_deadline", smoke_path)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        smoke = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(smoke)

        now = [100.0]
        probe_timeouts: list[float] = []
        sleep_durations: list[float] = []

        def failing_probe(timeout: float) -> None:
            probe_timeouts.append(timeout)
            raise OSError("not ready")

        def advance(duration: float) -> None:
            sleep_durations.append(duration)
            now[0] += duration

        with patch.object(smoke.time, "monotonic", side_effect=lambda: now[0]), patch.object(smoke.time, "sleep", side_effect=advance):
            with self.assertRaisesRegex(RuntimeError, "did not become ready"):
                smoke._wait_for("API", failing_probe, 100.6)

        self.assertEqual(3, len(probe_timeouts))
        for actual, expected in zip(probe_timeouts, (0.6, 0.35, 0.1)):
            self.assertAlmostEqual(expected, actual)
        self.assertEqual(3, len(sleep_durations))
        for actual, expected in zip(sleep_durations, (0.25, 0.25, 0.1)):
            self.assertAlmostEqual(expected, actual)
        self.assertAlmostEqual(100.6, now[0])

        class Response:
            status = 200

            def __init__(self, body: bytes) -> None:
                self.body = body

            def __enter__(self) -> "Response":
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return self.body

        urlopen_timeouts: list[float] = []
        bodies = iter((b'{"status":"ok"}', b"<html>ready</html>"))

        def open_with_timeout(request: object, timeout: float) -> Response:
            urlopen_timeouts.append(timeout)
            return Response(next(bodies))

        with patch.object(smoke.urllib.request, "urlopen", side_effect=open_with_timeout):
            smoke._probe_api(0.125)
            smoke._probe_web(0.0625)
        self.assertEqual([0.125, 0.0625], urlopen_timeouts)

    def test_generated_api_contract_lists_every_leave_api_route(self) -> None:
        """The generated contract must exactly match the FastAPI public route surface."""
        output = self._output(self._approved_run())
        contract = json.loads((output / "backend" / "api-contract.json").read_text(encoding="utf-8"))
        source = ast.parse((output / "backend" / "app" / "main.py").read_text(encoding="utf-8"))
        runtime_paths: dict[str, set[str]] = {}
        for definition in source.body:
            if not isinstance(definition, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for decorator in definition.decorator_list:
                if (
                    isinstance(decorator, ast.Call)
                    and isinstance(decorator.func, ast.Attribute)
                    and isinstance(decorator.func.value, ast.Name)
                    and decorator.func.value.id == "app"
                    and decorator.func.attr in {"get", "post"}
                    and decorator.args
                    and isinstance(decorator.args[0], ast.Constant)
                    and isinstance(decorator.args[0].value, str)
                ):
                    runtime_paths.setdefault(decorator.args[0].value, set()).add(decorator.func.attr)

        contract_paths = {path: set(operations) for path, operations in contract["paths"].items()}
        expected_paths = {
            "/health": {"get"},
            "/leave-requests": {"get", "post"},
            "/leave-requests/{leave_request_id}/decision": {"post"},
            "/audit-events": {"get"},
        }
        self.assertEqual(expected_paths, runtime_paths)
        self.assertEqual(
            runtime_paths,
            contract_paths,
        )

    def test_blueprint_rendering_records_each_copied_template_file(self) -> None:
        run = self._approved_run()
        rendered = next(event for event in run["events"] if event["type"] == "blueprint.rendered")
        self.assertTrue({
            ".env.example",
            "README.md",
            "docker-compose.yml",
            "backend/app/main.py",
            "frontend/app/page.tsx",
        }.issubset(rendered["payload"]["files"]))

    def test_template_copy_rejects_a_path_outside_the_template_root(self) -> None:
        unowned_root = Path(self.temp.name) / "template"
        output = Path(self.temp.name) / "output"
        with self.assertRaises(ControlPlaneError) as error:
            self.plane._copy_template(unowned_root, output)
        self.assertEqual("invalid_template", error.exception.code)

    def test_template_copy_rejects_a_junction_alias_to_the_owned_root(self) -> None:
        alias = Path(self.temp.name) / "owned-template-junction"
        created = subprocess.run(
            ["cmd", "/d", "/c", "mklink", "/J", str(alias), str(self.plane.template_root)],
            capture_output=True,
            check=False,
            text=True,
        )
        if created.returncode != 0:
            self.skipTest(f"filesystem cannot create a junction: {created.stderr.strip()}")
        try:
            with self.assertRaises(ControlPlaneError) as error:
                self.plane._copy_template(alias, Path(self.temp.name) / "output")
            self.assertEqual("invalid_template", error.exception.code)
        finally:
            alias.rmdir()

    def test_template_copy_rejects_a_directory_symlink_inside_the_owned_root(self) -> None:
        candidate = self.plane.template_root / "test-template-directory-link"
        candidate.mkdir()
        original_is_symlink = Path.is_symlink
        try:
            with patch.object(Path, "is_symlink", autospec=True, side_effect=lambda path: path == candidate or original_is_symlink(path)):
                with self.assertRaises(ControlPlaneError) as error:
                    self.plane._copy_template(self.plane.template_root, Path(self.temp.name) / "output")
                self.assertEqual("unsafe_template_path", error.exception.code)
        finally:
            candidate.rmdir()

    def test_template_copy_rejects_a_nested_windows_junction_before_traversal(self) -> None:
        """A nested reparse directory must never become a readable template source."""
        outside = Path(self.temp.name) / "outside-template-content"
        outside.mkdir()
        (outside / "should-not-copy.txt").write_text("unowned", encoding="utf-8")
        junction = self.plane.template_root / "test-nested-template-junction"
        created = subprocess.run(
            ["cmd", "/d", "/c", "mklink", "/J", str(junction), str(outside)],
            capture_output=True,
            check=False,
            text=True,
        )
        if created.returncode != 0:
            self.skipTest(f"filesystem cannot create a junction: {created.stderr.strip()}")
        try:
            with self.assertRaises(ControlPlaneError) as error:
                self.plane._copy_template(self.plane.template_root, Path(self.temp.name) / "output")
            self.assertEqual("unsafe_template_path", error.exception.code)
            self.assertFalse((Path(self.temp.name) / "output" / junction.name / "should-not-copy.txt").exists())
        finally:
            junction.rmdir()

    def test_template_copy_rejects_an_output_directory_symlink_escape(self) -> None:
        output = Path(self.temp.name) / "output"
        outside = Path(self.temp.name) / "outside"
        output.mkdir()
        outside.mkdir()
        expected_target = output / "backend" / "app" / "main.py"
        original_resolve = Path.resolve
        with patch.object(Path, "resolve", autospec=True, side_effect=lambda path, strict=False: outside / "main.py" if path == expected_target else original_resolve(path, strict=strict)):
            with self.assertRaises(ControlPlaneError) as error:
                self.plane._copy_template(self.plane.template_root, output)
            self.assertEqual("unsafe_template_path", error.exception.code)

    def test_full_approved_flow_renders_static_blueprint(self) -> None:
        project = self._project()
        self.assertRegex(project["requirement_id"], r"^req_[A-Za-z0-9_-]{32}$")
        self.assertRegex(project["ir_id"], r"^ir_[A-Za-z0-9_-]{32}$")
        self.assertEqual("ir_pending_approval", project["status"])
        self.assertEqual("internal-workflow-app", project["ir"]["profile"])
        with self.assertRaises(ControlPlaneError) as blocked:
            self.plane.create_plan(project["id"])
        self.assertEqual("ir_not_approved", blocked.exception.code)

        self.plane.approve_ir(project["id"], "reviewer")
        plan = self.plane.create_plan(project["id"])
        self.assertEqual("pending_approval", plan["status"])
        self.assertEqual(6, len(plan["body"]["components"]))
        with self.assertRaises(ControlPlaneError) as blocked:
            self.plane.create_run(plan["id"])
        self.assertEqual("plan_not_approved", blocked.exception.code)

        self.plane.approve_plan(plan["id"], "reviewer")
        run = self.plane.create_run(plan["id"])
        self.assertEqual("succeeded", run["status"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        self.assertTrue((output / "application.ir.json").is_file())
        self.assertTrue((output / "component-lock.json").is_file())
        summary = json.loads((output / "run-summary.json").read_text(encoding="utf-8"))
        self.assertFalse(summary["safety"]["executed_shell"])
        self.assertEqual(["run.started", "blueprint.rendered", "run.succeeded"], [event["type"] for event in run["events"]])

    def test_rejects_non_leave_and_invalid_actor(self) -> None:
        with self.assertRaises(ControlPlaneError) as unsupported:
            self.plane.create_legacy_project("storefront", "Generate an e-commerce storefront")
        self.assertEqual("unsupported_profile", unsupported.exception.code)
        project = self._project()
        with self.assertRaises(ControlPlaneError) as actor:
            self.plane.approve_ir(project["id"], "bad actor; rm")
        self.assertEqual("invalid_actor", actor.exception.code)

    def test_does_not_persist_raw_requirements_and_rejects_common_credentials(self) -> None:
        requirement = "Employees submit leave requests and managers approve them"
        project = self.plane.create_legacy_project("leave-management", requirement)
        stored = self.plane._state["projects"][project["id"]]
        self.assertNotIn("requirement", stored)
        self.assertIn("requirement_checksum", stored)
        with self.assertRaises(ControlPlaneError) as secret:
            self.plane.create_legacy_project("leave-management", "Leave request integration uses api_key=super-secret-value")
        self.assertEqual("secret_detected", secret.exception.code)

    def test_ir_id_can_drive_ui_contract_workflow(self) -> None:
        project = self._project()
        self.plane.approve_ir_by_id(project["ir_id"], "static-ui")
        plan = self.plane.create_plan_for_ir(project["ir_id"])
        self.assertEqual(project["id"], plan["project_id"])

    def test_catalog_is_golden_and_plan_checksum_is_reproducible(self) -> None:
        catalog = self.plane.catalog()
        self.assertTrue(all(component["trust_level"] == "golden" for component in catalog))
        first = self._project()
        second = self.plane.create_legacy_project("leave-management", "leave request with manager approval")
        self.plane.approve_ir(first["id"], "a")
        self.plane.approve_ir(second["id"], "a")
        one = self.plane.create_plan(first["id"])
        two = self.plane.create_plan(second["id"])
        # Project IDs differ by design, but component resolution is fixed and stable.
        self.assertEqual(one["body"]["components"], two["body"]["components"])
        self.assertTrue(one["checksum"].startswith("sha256:"))

    def test_manifest_loader_fails_closed_for_an_invalid_digest(self) -> None:
        bad_manifest = Path(self.temp.name) / "components.json"
        manifest = self.plane.catalog()
        manifest[0]["artifact_digest"] = "sha256:not-hex"
        bad_manifest.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "invalid sha256 digest"):
            load_golden_catalog(bad_manifest)

    def test_manifest_loader_fails_closed_for_a_non_golden_component(self) -> None:
        non_golden_manifest = Path(self.temp.name) / "components.json"
        manifest = self.plane.catalog()
        manifest[0]["trust_level"] = "discovered"
        non_golden_manifest.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "is not golden"):
            load_golden_catalog(non_golden_manifest)

    def test_ir_assumptions_and_run_evidence_are_traceable(self) -> None:
        requirement = "Employees submit leave requests, managers approve them, and HR views all leave records"
        project = self.plane.create_legacy_project("leave-management", requirement)
        self.assertTrue(project["ir"]["assumptions"])
        approved_project = self.plane.approve_ir(project["id"], "ir-reviewer")
        plan = self.plane.create_plan(project["id"])
        approved_plan = self.plane.approve_plan(plan["id"], "plan-reviewer")
        run = self.plane.create_run(plan["id"])

        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        summary = json.loads((output / "run-summary.json").read_text(encoding="utf-8"))
        component_lock = json.loads((output / "component-lock.json").read_text(encoding="utf-8"))
        canonical_requirement = json.dumps(requirement, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        expected_requirement_checksum = "sha256:" + hashlib.sha256(canonical_requirement.encode("utf-8")).hexdigest()

        self.assertEqual(expected_requirement_checksum, summary["requirement_checksum"])
        self.assertEqual(project["ir_checksum"], summary["application_ir_checksum"])
        self.assertEqual(plan["checksum"], summary["component_plan_checksum"])
        self.assertEqual({"actor": "ir-reviewer", "at": approved_project["ir_approved_at"]}, summary["approvals"]["ir"])
        self.assertEqual({"actor": "plan-reviewer", "at": approved_plan["approved_at"]}, summary["approvals"]["plan"])
        self.assertEqual(plan["body"]["components"], component_lock["components"])



if __name__ == "__main__":
    unittest.main()


class StaticUiHttpContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.previous_plane = Handler.control_plane
        self.previous_token = Handler.capability_token
        self.previous_actor = Handler.authenticated_actor
        Handler.control_plane = ControlPlane(root / "state.json", root / "runs")
        Handler.capability_token = "test-capability-token"
        Handler.authenticated_actor = "test-local-user"
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.httpd.server_port}"

    def tearDown(self) -> None:
        self.httpd.shutdown()
        self.thread.join()
        self.httpd.server_close()
        Handler.control_plane = self.previous_plane
        Handler.capability_token = self.previous_token
        Handler.authenticated_actor = self.previous_actor
        self.temp.cleanup()

    def _request(self, method: str, path: str, body: dict | None = None, *, token: str | None = "test-capability-token", origin: str | None = "http://127.0.0.1:5173", content_type: str | None = "application/json") -> tuple[int, dict, object]:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        request = Request(self.base + path, data=encoded, method=method)
        if content_type:
            request.add_header("Content-Type", content_type)
        if origin:
            request.add_header("Origin", origin)
        if token:
            request.add_header("X-Factory-Capability", token)
        with urlopen(request, timeout=2) as response:
            return response.status, json.loads(response.read()), response.headers

    def test_static_ui_contract_and_cors(self) -> None:
        status, catalog, headers = self._request("GET", "/api/catalog")
        self.assertEqual(200, status)
        self.assertEqual("http://127.0.0.1:5173", headers["Access-Control-Allow-Origin"])
        self.assertEqual(6, len(catalog["components"]))
        _, created, _ = self._request("POST", "/api/requirements", {"name": "leave-management", "requirement": "Employees submit leave requests and managers approve them"})
        self.assertIn("ir_id", created)
        _, approval, _ = self._request("POST", f"/api/irs/{created['ir_id']}/approve", {})
        self.assertEqual("test-local-user", approval["approved_by"])
        _, plan, _ = self._request("POST", f"/api/irs/{created['ir_id']}/plans", {})
        self._request("POST", f"/api/plans/{plan['id']}/approve", {})
        _, run, _ = self._request("POST", f"/api/plans/{plan['id']}/runs", {})
        self.assertEqual("succeeded", run["status"])
        _, fetched, _ = self._request("GET", f"/api/runs/{run['id']}")
        self.assertEqual(run["id"], fetched["id"])

    def test_writes_reject_missing_token_wrong_origin_and_non_json(self) -> None:
        request_body = {"name": "leave", "requirement": "leave request"}
        for kwargs, expected in (({"token": None}, 401), ({"origin": "http://evil.invalid"}, 403), ({"content_type": "text/plain"}, 415)):
            with self.subTest(kwargs=kwargs), self.assertRaises(HTTPError) as response:
                self._request("POST", "/api/requirements", request_body, **kwargs)
            self.assertEqual(expected, response.exception.code)

    def test_body_bearing_missing_token_requests_return_401_without_connection_abort(self) -> None:
        request_body = {"name": "leave", "requirement": "leave " + "x" * 90_000}
        for attempt in range(20):
            with self.subTest(attempt=attempt):
                try:
                    self._request("POST", "/api/requirements", request_body, token=None)
                except HTTPError as response:
                    self.assertEqual(401, response.code)
                else:
                    self.fail("missing capability token did not return HTTP 401")


class VNextHttpContractTests(StaticUiHttpContractTests):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.previous_plane = Handler.control_plane
        self.previous_token = Handler.capability_token
        self.previous_actor = Handler.authenticated_actor
        Handler.control_plane = ControlPlane(root / "state.json", root / "runs", provider=FixtureRequirementToDefinitionProvider())
        Handler.capability_token = "test-capability-token"
        Handler.authenticated_actor = "test-local-user"
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.httpd.server_port}"

    def test_vnext_project_version_and_approval_routes(self) -> None:
        brief = "Employees submit expense claims and managers approve them."
        _, created, _ = self._request("POST", "/api/projects", {"name": "expense-approval", "brief": brief})
        version = created["version"]
        self.assertNotIn(brief, json.dumps(created))
        with self.assertRaises(HTTPError) as blocked:
            self._request("POST", f"/api/versions/{version['id']}/plans", {})
        self.assertEqual(409, blocked.exception.code)
        _, approved, _ = self._request("POST", f"/api/versions/{version['id']}/approve", {})
        self.assertEqual("approved", approved["version"]["status"])
        _, plan, _ = self._request("POST", f"/api/versions/{version['id']}/plans", {})
        self.assertEqual(version["id"], plan["plan"]["version_id"])

    def test_vnext_plan_approval_and_run_are_wrapped_and_queued(self) -> None:
        _, created, _ = self._request("POST", "/api/projects", {"name": "expense-approval", "brief": "Employees submit expense claims and managers approve them."})
        version_id = created["version"]["id"]
        self._request("POST", f"/api/versions/{version_id}/approve", {})
        _, planned, _ = self._request("POST", f"/api/versions/{version_id}/plans", {})
        plan_id = planned["plan"]["id"]
        _, approved, _ = self._request("POST", f"/api/plans/{plan_id}/approve", {})
        self.assertEqual("approved", approved["plan"]["status"])
        _, queued, _ = self._request("POST", f"/api/plans/{plan_id}/runs", {})
        self.assertEqual("queued", queued["run"]["status"])
        self.assertEqual("queued", queued["run"]["phase"])
        self.assertIsNone(queued["run"]["preview_url"])

    def test_vnext_child_rejects_non_string_base_id_without_connection_abort(self) -> None:
        _, created, _ = self._request("POST", "/api/projects", {"name": "expense-approval", "brief": "Employees submit expense claims and managers approve them."})
        definition = created["version"]["definition"]
        with self.assertRaises(HTTPError) as response:
            self._request("POST", f"/api/projects/{created['project']['id']}/versions", {"base_version_id": ["not-a-string"], "definition": definition})
        self.assertEqual(422, response.exception.code)
        payload = json.loads(response.exception.read())
        self.assertEqual("invalid_base_version_id", payload["error"]["code"])
