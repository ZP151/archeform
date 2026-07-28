from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from apps.api.control_plane import ControlPlane, ControlPlaneError
from apps.api.component_composer import ComponentComposer, ComponentRegistry, CompositionError
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider
from apps.executor.worker import ExecutorWorker


ROOT = Path(__file__).resolve().parents[2]
EXPECTED_PACKAGE_KEYS = {
    "backend.rbac",
    "backend.record-api",
    "backend.session-auth",
    "data.postgres-runtime",
    "ops.audit-log",
    "ui.app-shell",
    "ui.approval-form",
    "ui.approval-queue",
    "ui.home-page",
    "ui.login-page",
    "ui.my-requests",
    "ui.profile-page",
    "ui.system-settings-page",
    "workflow.single-level-approval",
}


class ComposableControlPlaneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(
            root / "state.json",
            root / "runs",
            provider=FixtureRequirementToDefinitionProvider(),
            composable_enabled=True,
            component_package_root=ROOT / "packages" / "components",
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_local_server_enables_the_composable_planning_path(self) -> None:
        """The user-facing local server must not silently fall back to the old renderer."""
        source = (ROOT / "apps" / "api" / "server.py").read_text(encoding="utf-8")
        self.assertIn("control_plane = ControlPlane(composable_enabled=True)", source)

    def _approved_plan(self, name: str, brief: str) -> tuple[dict, dict]:
        created = self.plane.create_project(name, brief)
        version = self.plane.approve_version(created["version"]["id"], "founder")
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        return version, plan

    def test_composable_route_has_no_control_plane_runtime_materializer(self) -> None:
        """ComponentComposer is the sole composable application materializer."""
        self.assertFalse(hasattr(ControlPlane, "_materialize_composer_runtime"))
        self.assertFalse(hasattr(ControlPlane, "_materialize_component_runtime_scaffold"))

    def test_approved_leave_and_expense_definitions_share_locks_but_have_distinct_validated_inputs(self) -> None:
        _, leave = self._approved_plan(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )
        _, expense = self._approved_plan(
            "expense-approval", "Employees submit expense claims and managers approve them."
        )

        self.assertEqual(EXPECTED_PACKAGE_KEYS, {lock["key"] for lock in leave["composition"]["component_locks"]})
        self.assertEqual(leave["composition"]["component_locks"], expense["composition"]["component_locks"])
        self.assertNotEqual(leave["composition"]["validated_inputs"], expense["composition"]["validated_inputs"])
        self.assertEqual(
            "Leave request",
            leave["composition"]["validated_inputs"]["ui.approval-form"]["record_label"],
        )
        self.assertEqual(
            "Expense claim",
            expense["composition"]["validated_inputs"]["ui.approval-form"]["record_label"],
        )

    def test_shell_navigation_exposes_home_account_and_settings_as_declared_component_inputs(self) -> None:
        """The Composer may render only views that the approved shell input declares."""
        _, plan = self._approved_plan(
            "expense-approval-navigation", "Employees submit expense claims and managers approve them."
        )

        navigation = plan["composition"]["validated_inputs"]["ui.app-shell"]["navigation"]
        self.assertEqual(
            ["/", "/submit", "/my-records", "/approval-queue", "/audit", "/profile", "/settings"],
            [item["href"] for item in navigation],
        )

    def test_promoted_v2_1_ui_assets_are_selected_for_new_composable_plans(self) -> None:
        """New plans must select the canonical 2.1 suite, never the historical held assets."""
        _, plan = self._approved_plan(
            "leave-approval-v2", "Employees submit leave requests and managers approve them."
        )

        ui_locks = {
            lock["key"]: lock["version"]
            for lock in plan["composition"]["component_locks"]
            if lock["key"].startswith("ui.")
        }
        self.assertEqual(
            {
                "ui.app-shell": "2.1.0",
                "ui.approval-form": "2.1.0",
                "ui.approval-queue": "2.1.0",
                "ui.home-page": "2.1.0",
                "ui.login-page": "2.1.0",
                "ui.my-requests": "2.1.0",
                "ui.profile-page": "2.1.0",
                "ui.system-settings-page": "2.1.0",
            },
            ui_locks,
        )

    def test_run_materializes_only_locked_component_contributions_and_composition_evidence(self) -> None:
        version, plan = self._approved_plan(
            "expense-approval", "Employees submit expense claims and managers approve them."
        )

        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        lock = json.loads((output / "component-lock.json").read_text(encoding="utf-8"))
        composition = json.loads((output / "composition-manifest.json").read_text(encoding="utf-8"))

        self.assertEqual("factory-component-lock/v1", lock["schema_version"])
        self.assertEqual(version["definition_checksum"], composition["application_definition_checksum"])
        self.assertEqual(plan["composition"]["component_locks"], lock["component_locks"])
        self.assertEqual(plan["composition"]["output_manifest"], composition["output_manifest"])
        self.assertIn("backend/auth/session_auth.py", {item["path"] for item in composition["output_manifest"]["files"]})
        self.assertIn("frontend/features/approval-form/ApprovalForm.tsx", {item["path"] for item in composition["output_manifest"]["files"]})
        self.assertIn("Expense claim", (output / "frontend/features/approval-form/ApprovalForm.tsx").read_text(encoding="utf-8"))
        self.assertTrue((output / "backend/auth/session_auth.py").is_file())

    def test_composer_declares_runtime_scaffold_before_materialization(self) -> None:
        """Runtime glue is Composer output, never a post-materialization ControlPlane write."""
        _, plan = self._approved_plan(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )

        planned_paths = {
            item["path"] for item in plan["composition"]["output_manifest"]["files"]
        }
        self.assertTrue({
            "backend/app/__init__.py",
            "backend/app/main.py",
            "backend/app/runtime.py",
            "backend/Dockerfile",
            "backend/requirements.txt",
            "docker-compose.yml",
            "frontend/.dockerignore",
            "frontend/app/layout.tsx",
            "frontend/app/page.tsx",
            "frontend/package.json",
            "smoke_test.py",
        }.issubset(planned_paths))

        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        materialized_paths = {
            path.relative_to(output).as_posix()
            for path in output.rglob("*")
            if path.is_file()
        }
        evidence_paths = {
            "application-definition.json",
            "component-lock.json",
            "composition-manifest.json",
            "render-manifest.json",
            "run-summary.json",
            "executor-request.json",
            "executor-request.sig",
        }
        self.assertEqual(planned_paths, materialized_paths - evidence_paths)

    def test_composer_rejects_tampered_or_conflicting_runtime_scaffold_before_output(self) -> None:
        """A fixed scaffold is integrity-bound and cannot claim a package output path."""
        version, plan = self._approved_plan(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )
        scaffold = Path(self.temp.name) / "scaffold"
        shutil.copytree(ROOT / "packages" / "composer-scaffold" / "1.0.0", scaffold)
        composer = ComponentComposer(
            ComponentRegistry(ROOT / "packages" / "components"), scaffold_root=scaffold
        )
        custom_plan = composer.create_plan_from_locks(
            application_definition_checksum=version["definition_checksum"],
            component_locks=plan["composition"]["component_locks"],
            component_inputs=plan["composition"]["validated_inputs"],
            include_runtime_scaffold=True,
        )
        (scaffold / "frontend" / "package.json").write_text("{}\n", encoding="utf-8")

        output = Path(self.temp.name) / "tampered-output"
        with self.assertRaisesRegex(CompositionError, "scaffold file digest changed"):
            composer.materialize(plan=custom_plan, output_root=output)
        self.assertFalse(output.exists())

        shutil.rmtree(scaffold)
        shutil.copytree(ROOT / "packages" / "composer-scaffold" / "1.0.0", scaffold)
        collision = scaffold / "frontend" / "app-shell" / "ApplicationShell.tsx"
        collision.parent.mkdir(parents=True, exist_ok=True)
        collision.write_text("export const collision = true;\n", encoding="utf-8")
        manifest_path = scaffold / "scaffold.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["files"].append({
            "path": "frontend/app-shell/ApplicationShell.tsx",
            "sha256": "sha256:" + hashlib.sha256(collision.read_bytes()).hexdigest(),
        })
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        conflicting_composer = ComponentComposer(
            ComponentRegistry(ROOT / "packages" / "components"), scaffold_root=scaffold
        )
        with self.assertRaisesRegex(CompositionError, "conflicts"):
            conflicting_composer.create_plan_from_locks(
                application_definition_checksum=version["definition_checksum"],
                component_locks=plan["composition"]["component_locks"],
                component_inputs=plan["composition"]["validated_inputs"],
                include_runtime_scaffold=True,
            )

    def test_missing_required_component_package_blocks_composable_planning(self) -> None:
        """The Composer must fail closed instead of recreating removed CRUD behavior."""
        isolated_components = Path(self.temp.name) / "isolated-components"
        shutil.copytree(ROOT / "packages" / "components", isolated_components)
        shutil.rmtree(isolated_components / "backend.record-api")
        plane = ControlPlane(
            Path(self.temp.name) / "isolated-state.json",
            Path(self.temp.name) / "isolated-runs",
            provider=FixtureRequirementToDefinitionProvider(),
            composable_enabled=True,
            component_package_root=isolated_components,
        )
        created = plane.create_project(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )
        version = plane.approve_version(created["version"]["id"], "founder")

        with self.assertRaises(ControlPlaneError) as captured:
            plane.create_plan_for_version(version["id"])
        self.assertEqual("component_incompatible", captured.exception.code)

    def test_composed_runtime_uses_the_session_router_and_only_controlled_local_files(self) -> None:
        _, plan = self._approved_plan(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )

        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        main = (output / "backend/app/main.py").read_text(encoding="utf-8")
        compose = (output / "docker-compose.yml").read_text(encoding="utf-8")
        smoke = (output / "smoke_test.py").read_text(encoding="utf-8")

        self.assertIn("app.include_router(session_router)", main)
        compile(main, "generated-composed-main.py", "exec")
        self.assertIn("app.include_router(record_router)", main)
        self.assertIn("app.include_router(audit_router)", main)
        self.assertIn(
            'allow_origin_regex=r"^http://(?:localhost|127\\.0\\.0\\.1):[0-9]{1,5}$"',
            main,
        )
        self.assertNotIn("require_pending_record", main)
        self.assertNotIn("INSERT INTO", main)
        self.assertIn("127.0.0.1:${FACTORY_API_HOST_PORT:-8000}:8000", compose)
        self.assertIn(
            "NEXT_PUBLIC_API_BASE_URL: http://127.0.0.1:${FACTORY_API_HOST_PORT:-8000}",
            compose,
        )
        self.assertIn("127.0.0.1::3000", compose)
        self.assertIn("/session/sign-in", smoke)
        self.assertNotIn("OPENAI_API_KEY", "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in output.rglob("*") if path.is_file()))

    def test_composed_backend_behavior_is_materialized_from_owned_component_slots(self) -> None:
        """CRUD, workflow, and audit behavior must not remain in Composer glue."""
        _, plan = self._approved_plan(
            "expense-approval", "Employees submit expense claims and managers approve them."
        )

        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        main = (output / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        record_api = (output / "backend" / "api" / "records" / "record_api.py").read_text(encoding="utf-8")
        workflow = (output / "backend" / "workflow" / "approval" / "single_level.py").read_text(encoding="utf-8")
        audit = (output / "backend" / "audit" / "audit_log.py").read_text(encoding="utf-8")
        record_schema = (output / "data" / "record-schema" / "records.sql").read_text(encoding="utf-8")
        audit_schema = (output / "data" / "audit-schema" / "audit_events.sql").read_text(encoding="utf-8")

        self.assertIn("app.include_router(record_router)", main)
        self.assertIn("app.include_router(audit_router)", main)
        self.assertNotIn("INSERT INTO", main)
        self.assertNotIn("UPDATE {RECORD_TABLE}", main)
        self.assertNotIn('"/audit-events"', main)
        self.assertIn("@router.post(RECORD_PATH", record_api)
        self.assertIn("@router.get(RECORD_PATH", record_api)
        self.assertIn("append_audit_event", record_api)
        self.assertIn("require_approver", workflow)
        self.assertIn("@router.get(\"/audit-events\")", audit)
        self.assertIn("INSERT INTO audit_events", audit)
        self.assertIn('CREATE TABLE IF NOT EXISTS "expense_claims"', record_schema)
        self.assertIn("BEFORE UPDATE OR DELETE ON audit_events", audit_schema)
        for name, source in (("record_api.py", record_api), ("single_level.py", workflow), ("audit_log.py", audit)):
            with self.subTest(source=name):
                compile(source, name, "exec")

    def test_composed_run_bundles_the_materialized_react_component_assets(self) -> None:
        """The local preview must build the approved UI assets, not serve the API shell as web."""
        _, plan = self._approved_plan(
            "expense-approval", "Employees submit expense claims and managers approve them."
        )

        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        frontend = output / "frontend"
        page = (frontend / "app" / "page.tsx").read_text(encoding="utf-8")
        compose = (output / "docker-compose.yml").read_text(encoding="utf-8")

        for relative in (
            "package.json",
            "package-lock.json",
            ".dockerignore",
            "Dockerfile",
            "next.config.mjs",
            "next-env.d.ts",
            "tsconfig.json",
            "app/layout.tsx",
            "app/globals.css",
            "app/page.tsx",
            "app-shell/ApplicationShell.tsx",
            "features/approval-form/ApprovalForm.tsx",
            "features/my-requests/MyRequests.tsx",
            "features/approval-queue/ApprovalQueue.tsx",
            "features/audit/AuditLog.tsx",
        ):
            with self.subTest(relative=relative):
                self.assertTrue((frontend / relative).is_file())
        self.assertIn('from "../features/approval-form/ApprovalForm"', page)
        self.assertIn('from "../features/approval-queue/ApprovalQueue"', page)
        self.assertIn('from "../features/audit/AuditLog"', page)
        self.assertIn('credentials: "include"', page)
        self.assertIn('"/session/sign-in"', page)
        self.assertIn("<ApprovalForm", page)
        self.assertIn("<MyRequests", page)
        self.assertIn("<ProfilePage", page)
        self.assertIn("<SystemSettingsPage", page)
        self.assertIn('activeView === "/audit"', page)
        self.assertIn('aria-label="Primary navigation"', page)
        self.assertIn('aria-current={activeView === route.href ? "page" : undefined}', page)
        self.assertIn('data-theme={theme}', page)
        self.assertIn("Expense claim", (frontend / "features" / "approval-form" / "ApprovalForm.tsx").read_text(encoding="utf-8"))
        self.assertIn("context: ./frontend", compose)
        self.assertIn(
            "NEXT_PUBLIC_API_BASE_URL: http://127.0.0.1:${FACTORY_API_HOST_PORT:-8000}",
            compose,
        )

    def test_leave_and_expense_materialize_same_frontend_packages_with_distinct_validated_ui(self) -> None:
        """Both proof applications must use one package set and only definition-driven UI variation."""
        outputs: dict[str, tuple[dict, Path]] = {}
        for name, brief in (
            ("leave-approval", "Employees submit leave requests and managers approve them."),
            ("expense-approval", "Employees submit expense claims and managers approve them."),
        ):
            _, plan = self._approved_plan(name, brief)
            run = self.plane.create_run(plan["id"])
            outputs[name] = (plan, Path(self.temp.name) / "runs" / run["id"] / "output")

        leave_plan, leave_output = outputs["leave-approval"]
        expense_plan, expense_output = outputs["expense-approval"]
        self.assertEqual(
            leave_plan["composition"]["component_locks"],
            expense_plan["composition"]["component_locks"],
        )
        for output, label in ((leave_output, "Leave request"), (expense_output, "Expense claim")):
            with self.subTest(application=label):
                self.assertTrue((output / "frontend" / "app" / "page.tsx").is_file())
                self.assertIn(
                    label,
                    (output / "frontend" / "features" / "approval-form" / "ApprovalForm.tsx").read_text(encoding="utf-8"),
                )

    def test_executor_accepts_the_exact_composed_package_lock(self) -> None:
        _, plan = self._approved_plan(
            "expense-approval", "Employees submit expense claims and managers approve them."
        )
        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        worker = ExecutorWorker(
            self.plane.runs_root,
            key_path=self.plane.executor_key_path,
        )
        worker._validate_component_lock(
            json.loads((output / "component-lock.json").read_text(encoding="utf-8")),
            json.loads((output / "executor-request.json").read_text(encoding="utf-8")),
        )

    def test_executor_rejects_a_tampered_composed_lock_before_running_docker(self) -> None:
        """Composed package-lock evidence must stay bound to the signed Executor handoff."""
        _, plan = self._approved_plan(
            "expense-approval", "Employees submit expense claims and managers approve them."
        )
        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        lock_path = output / "component-lock.json"
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        lock["component_locks"][0]["digest"] = "sha256:" + "0" * 64
        lock_path.write_text(json.dumps(lock), encoding="utf-8")
        calls: list[list[str]] = []

        def runner(args: list[str], **_kwargs: object) -> SimpleNamespace:
            calls.append(args)
            return SimpleNamespace(returncode=0, stdout="", stderr="")

        worker = ExecutorWorker(
            self.plane.runs_root,
            key_path=self.plane.executor_key_path,
            runner=runner,
        )
        self.assertEqual(1, worker.scan_once())
        self.assertEqual("failed", self.plane.get_run(run["id"])["status"])
        self.assertEqual([], calls)

    def test_composed_run_reaches_executor_smoke_with_fixed_commands(self) -> None:
        _, plan = self._approved_plan(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )
        run = self.plane.create_run(plan["id"])
        calls: list[list[str]] = []
        command_options: list[dict[str, object]] = []

        def runner(args: list[str], **kwargs: object) -> SimpleNamespace:
            calls.append(args)
            command_options.append(kwargs)
            stdout = "127.0.0.1:49152\n" if "port" in args else "Smoke test passed\n"
            return SimpleNamespace(returncode=0, stdout=stdout, stderr="")

        worker = ExecutorWorker(
            self.plane.runs_root,
            key_path=self.plane.executor_key_path,
            runner=runner,
        )
        self.assertEqual(1, worker.scan_once())
        view = self.plane.get_run(run["id"])

        self.assertEqual("ready", view["status"])
        self.assertEqual("passed", view["smoke"]["status"])
        self.assertEqual(["up", "--build", "--detach"], calls[0][-3:])
        self.assertEqual(["port", "web", "3000"], calls[1][-3:])
        self.assertTrue(calls[2][-1].endswith("smoke_test.py"))
        self.assertTrue(all(options["encoding"] == "utf-8" and options["errors"] == "replace" for options in command_options))

    def test_composed_preview_stop_runs_the_fixed_cleanup_command(self) -> None:
        """A ready composable preview must be stopped by the Executor, never the control plane."""
        _, plan = self._approved_plan(
            "leave-approval", "Employees submit leave requests and managers approve them."
        )
        run = self.plane.create_run(plan["id"])
        calls: list[list[str]] = []

        def runner(args: list[str], **_kwargs: object) -> SimpleNamespace:
            calls.append(args)
            stdout = "127.0.0.1:49152\n" if "port" in args else "Smoke test passed\n"
            return SimpleNamespace(returncode=0, stdout=stdout, stderr="")

        worker = ExecutorWorker(
            self.plane.runs_root,
            key_path=self.plane.executor_key_path,
            runner=runner,
        )
        self.assertEqual(1, worker.scan_once())
        self.plane.request_stop(run["id"])
        self.assertEqual(1, worker.scan_once())

        view = self.plane.get_run(run["id"])
        self.assertEqual("stopped", view["status"])
        self.assertEqual("requested", view["stop_reason"])
        self.assertEqual(["down", "--volumes", "--remove-orphans"], calls[-1][-3:])


if __name__ == "__main__":
    unittest.main()
