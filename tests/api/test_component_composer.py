from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from apps.api.component_contract import calculate_package_digest, validate_composition_plan
from apps.api.component_composer import ComponentComposer, ComponentRegistry, CompositionError


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests" / "fixtures" / "component-contract" / "valid-ui-login" / "1.0.0"
CHECKSUM = "sha256:" + "a" * 64


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


class ComponentComposerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.components = Path(self.temp.name) / "packages" / "components"
        self._copy_package("ui.login-page")

    def _copy_package(
        self,
        key: str,
        *,
        slot: str = "frontend/routes/login",
        requires: list[dict[str, str]] | None = None,
        lifecycle: str = "golden",
        target: str = "page.tsx",
        version: str = "1.0.0",
    ) -> Path:
        destination = self.components / key / version
        shutil.copytree(FIXTURE, destination)
        manifest_path = destination / "component.json"
        adapter_path = destination / "adapter.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
        manifest.update({
            "key": key,
            "version": version,
            "category": "ui",
            "provides": [f"{key}.capability"],
            "requires": requires or [],
            "output_slots": [slot],
            "lifecycle": lifecycle,
        })
        adapter["component_key"] = key
        adapter["component_version"] = version
        adapter["contributions"][0]["slot"] = slot
        adapter["contributions"][0]["target"] = target
        adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
        (destination / "trust.json").write_text(_canonical({
            "schema_version": "factory-component-trust/v1",
            "lifecycle": lifecycle,
            "status": "promoted" if lifecycle == "golden" else "candidate",
            "subject": {"key": key, "version": version},
        }) + "\n", encoding="utf-8")
        manifest["inventory"] = [
            {"path": path.relative_to(destination).as_posix(), "sha256": _sha256(path)}
            for path in sorted(destination.rglob("*"))
            if path.is_file() and path.name != "component.json"
        ]
        manifest["digest"] = calculate_package_digest(destination, manifest)
        manifest_path.write_text(_canonical(manifest) + "\n", encoding="utf-8")
        return destination

    def _composer(self) -> ComponentComposer:
        return ComponentComposer(ComponentRegistry(self.components))

    def test_creates_a_deterministic_dependency_first_plan_from_golden_packages(self) -> None:
        self._copy_package(
            "ui.home-page",
            slot="frontend/routes/home",
            requires=[{"key": "ui.login-page", "version": "1.0.0"}],
        )

        plan = self._composer().create_plan(
            application_definition_checksum=CHECKSUM,
            component_keys=["ui.home-page"],
            component_inputs={
                "ui.login-page": {"title": "Sign in"},
                "ui.home-page": {"title": "Leave home"},
            },
        )

        self.assertEqual(
            ["ui.home-page", "ui.login-page"],
            [lock["key"] for lock in plan["component_locks"]],
        )
        self.assertEqual(
            ["ui.login-page", "ui.home-page"],
            [lock["key"] for lock in plan["adapter_order"]],
        )
        self.assertEqual(
            [{"from": "ui.home-page", "to": "ui.login-page"}],
            plan["dependency_graph"],
        )
        self.assertEqual(
            ["frontend/routes/home/page.tsx", "frontend/routes/login/page.tsx"],
            [item["path"] for item in plan["output_manifest"]["files"]],
        )
        self.assertEqual(plan, self._composer().create_plan(
            application_definition_checksum=CHECKSUM,
            component_keys=["ui.home-page"],
            component_inputs={
                "ui.login-page": {"title": "Sign in"},
                "ui.home-page": {"title": "Leave home"},
            },
        ))
        self.assertEqual(plan, validate_composition_plan(plan))

    def test_rejects_non_golden_and_digest_tampered_packages_before_planning(self) -> None:
        candidate = self._copy_package("ui.candidate", lifecycle="candidate")
        with self.assertRaisesRegex(CompositionError, "Golden"):
            ComponentRegistry(self.components).resolve(["ui.candidate"])

        manifest_path = candidate / "component.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["digest"] = "sha256:" + "0" * 64
        manifest_path.write_text(_canonical(manifest) + "\n", encoding="utf-8")
        with self.assertRaises(CompositionError):
            ComponentRegistry(self.components).discover()

    def test_registry_rejects_the_actual_candidate_ui_2_2_family_before_lock_creation(self) -> None:
        components = ROOT / "packages" / "components"
        candidate_keys = (
            "ui.app-shell", "ui.login-page", "ui.home-page", "ui.profile-page",
            "ui.system-settings-page", "ui.approval-form", "ui.my-requests", "ui.approval-queue",
        )
        locks = []
        for key in candidate_keys:
            manifest = json.loads((components / key / "2.2.0" / "component.json").read_text(encoding="utf-8"))
            locks.append({field: manifest[field] for field in ("key", "version", "digest")})

        with self.assertRaisesRegex(CompositionError, "ui.app-shell@2.2.0 is not Golden"):
            ComponentRegistry(components).resolve_locks(locks)

    def test_candidate_browser_harness_uses_composer_materialization_not_a_ui_overlay(self) -> None:
        """Candidate evidence must have one matching lock family and output manifest."""
        harness = (ROOT / "tests" / "web" / "generated-composable-preview-e2e.mjs").read_text(encoding="utf-8")

        self.assertIn("class CandidateVerificationRegistry", harness)
        self.assertIn("composer.create_plan_from_locks", harness)
        self.assertIn("composer.materialize", harness)
        self.assertNotIn("def materialize_candidate_ui_preview", harness)
        self.assertNotIn("render_adapter_template_text", harness)

    def test_new_plan_selection_rejects_a_held_ui_v2_generation(self) -> None:
        held = self._copy_package("ui.app-shell", version="2.0.0")

        with self.assertRaisesRegex(CompositionError, "historical_ui_generation_not_selectable"):
            ComponentRegistry(self.components).resolve(["ui.app-shell"])
        manifest = json.loads((held / "component.json").read_text(encoding="utf-8"))
        lock = {field: manifest[field] for field in ("key", "version", "digest")}
        with self.assertRaisesRegex(CompositionError, "historical_ui_generation_not_selectable"):
            ComponentRegistry(self.components).resolve_locks([lock])
        self.assertEqual(
            ("ui.app-shell", "2.0.0"),
            ComponentRegistry(self.components).resolve_locks([lock], allow_historical_replay=True)[0].identity,
        )

    def test_registry_rejects_non_promoted_trust_even_with_a_valid_golden_manifest(self) -> None:
        package = self._copy_package("ui.app-shell", version="2.1.0")
        trust_path = package / "trust.json"
        for status in ("revoked", "unsigned", "stale"):
            with self.subTest(status=status):
                trust = json.loads(trust_path.read_text(encoding="utf-8"))
                trust["status"] = status
                trust_path.write_text(_canonical(trust) + "\n", encoding="utf-8")
                manifest_path = package / "component.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["inventory"] = [
                    {"path": path.relative_to(package).as_posix(), "sha256": _sha256(path)}
                    for path in sorted(package.rglob("*"))
                    if path.is_file() and path.name != "component.json"
                ]
                manifest["digest"] = calculate_package_digest(package, manifest)
                manifest_path.write_text(_canonical(manifest) + "\n", encoding="utf-8")
                with self.assertRaisesRegex(CompositionError, "not trusted"):
                    ComponentRegistry(self.components).resolve(["ui.app-shell"])

    def test_materializes_typed_template_bindings_into_output_checksums(self) -> None:
        plan = self._composer().create_plan(
            application_definition_checksum=CHECKSUM,
            component_keys=["ui.login-page"],
            component_inputs={"ui.login-page": {"title": "A \"safe\" title"}},
        )

        expected = b'export const title = "A \\"safe\\" title";\n'
        self.assertEqual(
            "sha256:" + hashlib.sha256(expected).hexdigest(),
            plan["output_manifest"]["files"][0]["sha256"],
        )

    def test_materializes_only_approved_plan_contributions_with_matching_evidence(self) -> None:
        composer = self._composer()
        plan = composer.create_plan(
            application_definition_checksum=CHECKSUM,
            component_keys=["ui.login-page"],
            component_inputs={"ui.login-page": {"title": "Sign in"}},
        )
        output = Path(self.temp.name) / "generated"

        manifest = composer.materialize(plan=plan, output_root=output)

        rendered = output / "frontend" / "routes" / "login" / "page.tsx"
        self.assertEqual('export const title = "Sign in";\n', rendered.read_text(encoding="utf-8"))
        self.assertEqual(plan["output_manifest"], manifest)
        self.assertEqual(
            "sha256:" + hashlib.sha256(rendered.read_bytes()).hexdigest(),
            manifest["files"][0]["sha256"],
        )
        with self.assertRaisesRegex(CompositionError, "must not already exist"):
            composer.materialize(plan=plan, output_root=output)

    def test_rejects_package_changes_between_discovery_and_planning(self) -> None:
        registry = ComponentRegistry(self.components)

        class MutatingRegistry:
            def __init__(self, mutation: callable) -> None:
                self.mutation = mutation

            def resolve(self, keys: list[str]) -> tuple:
                packages = registry.resolve(keys)
                self.mutation()
                return packages

        adapter_path = self.components / "ui.login-page" / "1.0.0" / "adapter.json"
        with self.assertRaisesRegex(CompositionError, "changed"):
            ComponentComposer(MutatingRegistry(lambda: adapter_path.write_text("{}\n", encoding="utf-8"))).create_plan(
                application_definition_checksum=CHECKSUM,
                component_keys=["ui.login-page"],
                component_inputs={"ui.login-page": {"title": "Sign in"}},
            )

        shutil.rmtree(self.components / "ui.login-page")
        self._copy_package("ui.login-page")
        template_path = self.components / "ui.login-page" / "1.0.0" / "templates" / "login.tsx"
        with self.assertRaisesRegex(CompositionError, "changed"):
            ComponentComposer(MutatingRegistry(lambda: template_path.write_text("changed\n", encoding="utf-8"))).create_plan(
                application_definition_checksum=CHECKSUM,
                component_keys=["ui.login-page"],
                component_inputs={"ui.login-page": {"title": "Sign in"}},
            )

    def test_replays_exact_locks_in_canonical_order_and_rejects_invalid_lock_sets(self) -> None:
        self._copy_package(
            "ui.home-page",
            slot="frontend/routes/home",
            requires=[{"key": "ui.login-page", "version": "1.0.0"}],
        )
        inputs = {
            "ui.login-page": {"title": "Sign in"},
            "ui.home-page": {"title": "Home"},
        }
        composer = self._composer()
        first = composer.create_plan(
            application_definition_checksum=CHECKSUM,
            component_keys=["ui.home-page"],
            component_inputs=inputs,
        )
        self.assertEqual(first, composer.create_plan_from_locks(
            application_definition_checksum=CHECKSUM,
            component_locks=list(reversed(first["component_locks"])),
            component_inputs=inputs,
        ))

        home_lock = next(lock for lock in first["component_locks"] if lock["key"] == "ui.home-page")
        login_lock = next(lock for lock in first["component_locks"] if lock["key"] == "ui.login-page")
        cases = (
            ([{**home_lock, "version": "9.9.9"}, login_lock], "unavailable"),
            ([{**home_lock, "digest": "sha256:" + "0" * 64}, login_lock], "digest"),
            ([home_lock], "unresolved"),
            ([home_lock, login_lock, dict(login_lock)], "duplicate"),
        )
        for locks, message in cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(CompositionError, message):
                    composer.create_plan_from_locks(
                        application_definition_checksum=CHECKSUM,
                        component_locks=locks,
                        component_inputs=inputs,
                    )

        candidate_root = self._copy_package("ui.candidate", lifecycle="candidate")
        candidate_manifest = json.loads((candidate_root / "component.json").read_text(encoding="utf-8"))
        with self.assertRaisesRegex(CompositionError, "Golden"):
            composer.create_plan_from_locks(
                application_definition_checksum=CHECKSUM,
                component_locks=[{field: candidate_manifest[field] for field in ("key", "version", "digest")}],
                component_inputs={"ui.candidate": {"title": "Candidate"}},
            )

    def test_rejects_missing_inputs_cycles_and_conflicting_targets_without_writing_output(self) -> None:
        self._copy_package(
            "ui.home-page",
            slot="frontend/routes/home",
            requires=[{"key": "ui.login-page", "version": "1.0.0"}],
        )
        with self.assertRaisesRegex(CompositionError, "input"):
            self._composer().create_plan(
                application_definition_checksum=CHECKSUM,
                component_keys=["ui.home-page"],
                component_inputs={"ui.home-page": {"title": "Home"}},
            )

        login_manifest_path = self.components / "ui.login-page" / "1.0.0" / "component.json"
        login_manifest = json.loads(login_manifest_path.read_text(encoding="utf-8"))
        login_manifest["requires"] = [{"key": "ui.home-page", "version": "1.0.0"}]
        login_manifest["digest"] = calculate_package_digest(login_manifest_path.parent, login_manifest)
        login_manifest_path.write_text(_canonical(login_manifest) + "\n", encoding="utf-8")
        with self.assertRaisesRegex(CompositionError, "cycle"):
            self._composer().create_plan(
                application_definition_checksum=CHECKSUM,
                component_keys=["ui.home-page"],
                component_inputs={
                    "ui.login-page": {"title": "Sign in"},
                    "ui.home-page": {"title": "Home"},
                },
            )

        login_manifest["requires"] = []
        login_manifest["digest"] = calculate_package_digest(login_manifest_path.parent, login_manifest)
        login_manifest_path.write_text(_canonical(login_manifest) + "\n", encoding="utf-8")
        shutil.rmtree(self.components / "ui.home-page")
        self._copy_package("ui.other-login", slot="frontend/routes/login")
        with self.assertRaisesRegex(CompositionError, "conflict"):
            self._composer().create_plan(
                application_definition_checksum=CHECKSUM,
                component_keys=["ui.login-page", "ui.other-login"],
                component_inputs={
                    "ui.login-page": {"title": "Sign in"},
                    "ui.other-login": {"title": "Other"},
                },
            )

    def test_runtime_scaffold_uses_validated_session_environment_and_switches_roles_safely(self) -> None:
        """The Composer glue must not hard-code session names or split loopback hosts."""
        composer = self._composer()
        auth = {
            "signing_key_env": "APP_SESSION_SIGNING_KEY",
            "local_users_env": "APP_LOCAL_USERS_JSON",
        }
        users = {"employee": {"role": "employee", "password_sha256": "digest"}}
        compose = composer._compose_file(auth, users)
        page = composer._frontend_page(
            "/leave-requests",
            [{"id": "employee", "label": "Employee", "kind": "submitter"}],
            "employee",
            {"leave_type": "Leave type"},
        )

        self.assertIn("APP_SESSION_SIGNING_KEY: local-composed-preview-key", compose)
        self.assertIn("APP_LOCAL_USERS_JSON:", compose)
        self.assertNotIn("FACTORY_SESSION_SIGNING_KEY", compose)
        self.assertNotIn("FACTORY_LOCAL_USERS", compose)
        self.assertIn("NEXT_PUBLIC_API_BASE_URL: http://127.0.0.1:${FACTORY_API_HOST_PORT:-8000}", compose)
        self.assertIn('?? "http://127.0.0.1:8000"', page)
        self.assertIn("function switchRole()", page)
        self.assertIn("setRecords([])", page)
        self.assertIn("setAuditEvents([])", page)
        self.assertIn('aria-label="Switch role"', page)
        self.assertIn('className="fp-app-content"', page)
        self.assertNotIn('className="fp-side"', page)
        self.assertIn('if (!signedIn) return <main className="fp-login"', page)
        self.assertIn('activeView === "/my-records"', page)
        self.assertIn("function summaryFor", page)
        self.assertNotIn("summary: JSON.stringify(record.payload)", page)

    def test_generated_browser_title_preserves_the_product_name_without_duplicate_suffixes(self) -> None:
        layout = self._composer()._frontend_layout("Expense Claim approval")

        self.assertIn('title: "Expense Claim approval"', layout)
        self.assertNotIn("approval approval", layout)

    def test_generated_application_uses_the_shell_owned_theme_navigation_and_error_boundary(self) -> None:
        """Composer glue must consume the approved shell rather than recreate its visual system."""
        composer = self._composer()
        layout = composer._frontend_layout("Expense Claim approval")
        page = composer._frontend_page(
            "/expense-claims",
            [
                {"id": "employee", "label": "Employee", "kind": "submitter"},
                {"id": "manager", "label": "Manager", "kind": "approver"},
            ],
            "employee",
            {"amount": "Amount"},
        )

        self.assertIn('import "../app-shell/factory-ui.css";', layout)
        self.assertIn('const [activeView, setActiveView] = useState("/");', page)
        self.assertIn('const [theme, setTheme] = useState<"light" | "dark">("light");', page)
        self.assertIn('const [feedback, setFeedback] = useState<Feedback | null>(null);', page)
        self.assertIn('aria-label="Primary navigation"', page)
        self.assertIn('aria-current={activeView === route.href ? "page" : undefined}', page)
        self.assertIn('data-theme={theme}', page)
        self.assertIn('role="alert"', page)
        self.assertIn('activeView === "/profile"', page)
        self.assertIn('activeView === "/settings"', page)

    def test_generated_application_keeps_signed_out_state_and_decisions_governed(self) -> None:
        """2.2 glue must not mount protected UI or issue a decision before confirmation."""
        page = self._composer()._frontend_page(
            "/expense-claims",
            [
                {"id": "employee", "label": "Employee", "kind": "submitter"},
                {"id": "manager", "label": "Manager", "kind": "approver"},
                {"id": "finance", "label": "Finance", "kind": "auditor"},
            ],
            "employee",
            {"amount": "Amount"},
        )

        self.assertIn('const [confirmation, setConfirmation] = useState', page)
        self.assertIn('const [decisionPending, setDecisionPending] = useState(false);', page)
        self.assertIn('role="status" aria-live="polite"', page)
        self.assertIn('if (!signedIn) return <main className="fp-login"', page)
        self.assertIn('onDecision={(id, decision) => requestDecision(id, decision)}', page)
        self.assertIn('await api(`${RECORD_PATH}/${confirmation.id}/decision`', page)
        self.assertIn('disabled={decisionPending}', page)
        self.assertIn('const allowedRoutes = routesFor(activeActor?.kind);', page)

    def test_generated_candidate_shell_uses_its_own_canonical_marker(self) -> None:
        page = self._composer()._frontend_page(
            "/leave-requests",
            [{"id": "employee", "label": "Employee", "kind": "submitter"}],
            "employee",
            {"leave_type": "Leave type"},
            factory_ui_version="1.3.0",
        )

        self.assertIn('data-factory-ui="1.3.0"', page)

    def test_generated_application_filters_routes_to_assembled_destinations(self) -> None:
        page = self._composer()._frontend_page(
            "/expense-claims",
            [{"id": "employee", "label": "Employee", "kind": "submitter"}],
            "employee",
            {"amount": "Amount"},
            navigation=[
                {"href": "/", "label": "Home"},
                {"href": "/submit", "label": "Submit"},
                {"href": "/profile", "label": "Profile"},
            ],
            available_routes={"/", "/profile"},
            filter_available_routes=True,
        )

        self.assertIn('const AVAILABLE_ROUTES = ["/","/profile"];', page)
        self.assertIn('filter((route) => AVAILABLE_ROUTES.includes(route.href))', page)

    def test_historical_2_1_runtime_scaffold_does_not_gain_candidate_route_filtering(self) -> None:
        """A 2.2 route safety change must not rewrite an exact 2.1 replay."""
        inputs = {
            "backend.session-auth": {"allowed_roles": ["employee", "manager", "auditor"], "cookie_name": "factory_session", "local_users_env": "FACTORY_LOCAL_USERS", "signing_key_env": "FACTORY_SESSION_SIGNING_KEY", "session_ttl_seconds": 3600},
            "backend.record-api": {"record_label": "Leave request", "record_path": "/leave-requests", "record_table": "leave_requests", "submitter_role": "employee"},
            "workflow.single-level-approval": {"approver_role": "manager", "workflow_name": "leave_approval"},
            "ops.audit-log": {"event_prefix": "leave_request", "record_table": "leave_requests", "auditor_role": "auditor"},
            "data.postgres-runtime": {},
            "ui.app-shell": {"product_name": "Leave approval", "audit_heading": "Audit", "navigation": [{"href": "/", "label": "Home"}]},
            "ui.approval-form": {"record_label": "Leave request", "submit_label": "Submit", "fields": [{"id": "reason", "label": "Reason", "type": "string", "required": True}]},
        }

        files = dict(self._composer()._runtime_scaffold_files(inputs, "2.1.0"))

        self.assertNotIn(b"AVAILABLE_ROUTES", files["frontend/app/page.tsx"])
        self.assertNotIn(b"filter((route) => AVAILABLE_ROUTES.includes(route.href))", files["frontend/app/page.tsx"])

    def test_generated_candidate_moves_focus_into_confirmation_and_to_failure_feedback(self) -> None:
        page = self._composer()._frontend_page(
            "/expense-claims",
            [{"id": "manager", "label": "Manager", "kind": "approver"}],
            "manager",
            {"amount": "Amount"},
        )

        self.assertIn('const confirmationDialog = useRef<HTMLDivElement>(null);', page)
        self.assertIn('confirmationDialog.current?.focus()', page)
        self.assertIn('feedbackTarget.current?.focus()', page)
        self.assertIn('ref={confirmationDialog}', page)
        self.assertIn('tabIndex={-1}', page)

    def test_generated_candidate_passes_pending_record_to_the_queue_asset(self) -> None:
        page = self._composer()._frontend_page(
            "/expense-claims",
            [{"id": "manager", "label": "Manager", "kind": "approver"}],
            "manager",
            {"amount": "Amount"},
            supports_pending_decision=True,
        )

        self.assertIn('pendingDecisionId={decisionPending ? confirmation?.id : undefined}', page)

    def test_generated_candidate_uses_the_assembled_app_shell_with_filtered_navigation(self) -> None:
        page = self._composer()._frontend_page(
            "/expense-claims",
            [{"id": "manager", "label": "Manager", "kind": "approver"}],
            "manager",
            {"amount": "Amount"},
            navigation=[
                {"href": "/", "label": "Home"},
                {"href": "/approval-queue", "label": "Approval queue"},
                {"href": "/profile", "label": "Profile"},
            ],
            available_routes={"/", "/approval-queue", "/profile"},
            factory_ui_version="1.3.0",
            use_application_shell=True,
        )

        self.assertIn('import { ApplicationShell } from "../app-shell/ApplicationShell";', page)
        self.assertIn('return <ApplicationShell activeView={activeView} navigation={allowedRoutes}', page)
        self.assertNotIn('return <div className="fp-app" data-factory-ui="1.3.0"', page)

    def test_generated_successor_uses_a_centered_focus_trapped_decision_dialog(self) -> None:
        """The 2.3 product must not reuse the old bottom-right confirmation toast."""
        page = self._composer()._frontend_page(
            "/expense-claims",
            [{"id": "manager", "label": "Manager", "kind": "approver"}],
            "manager",
            {"amount": "Amount"},
            factory_ui_version="1.4.0",
            use_application_shell=True,
            compact_workspace=True,
        )

        self.assertIn('onSignOut={switchRole}', page)
        self.assertIn('className="fp-confirmation-backdrop"', page)
        self.assertIn('className="fp-confirmation"', page)
        self.assertIn('function trapConfirmationFocus(event', page)
        self.assertIn('onKeyDown={trapConfirmationFocus}', page)
        self.assertNotIn('aria-label="Switch role"', page)

    def test_auth_navigation_candidate_uses_role_neutral_signed_out_account_options(self) -> None:
        """A signed-out candidate must not disclose actor roles before session authorization."""
        page = self._composer()._frontend_page(
            "/expense-claims",
            [
                {"id": "employee", "label": "Employee", "kind": "submitter"},
                {"id": "manager", "label": "Manager", "kind": "approver"},
                {"id": "finance", "label": "Finance", "kind": "auditor"},
            ],
            "employee",
            {"amount": "Amount"},
            factory_ui_version="1.4.0",
            available_routes={"/", "/submit", "/my-records", "/profile", "/settings"},
            filter_available_routes=True,
            use_application_shell=True,
            compact_workspace=True,
            auth_safe_candidate=True,
        )

        signed_out_branch = page.partition('if (!signedIn) return')[2].partition('const requests =')[0]
        self.assertIn('const signedOutAccountLabel = (index: number) => `Local account ${index + 1}`;', page)
        self.assertIn('<option key={candidate.id} value={candidate.id}>{signedOutAccountLabel(index)}</option>', signed_out_branch)
        self.assertNotIn('<option key={candidate.id} value={candidate.id}>{candidate.label}</option>', signed_out_branch)
        self.assertIn('return <ApplicationShell activeView={resolvedActiveView} navigation={allowedRoutes}', page)

    def test_auth_navigation_candidate_invalidates_stale_async_session_writes(self) -> None:
        """Only the 2.4 client may abort and reject stale session-bound completions."""
        composer = self._composer()
        page = composer._frontend_page(
            "/expense-claims",
            [
                {"id": "employee", "label": "Employee", "kind": "submitter"},
                {"id": "manager", "label": "Manager", "kind": "approver"},
                {"id": "finance", "label": "Finance", "kind": "auditor"},
            ],
            "employee",
            {"amount": "Amount"},
            factory_ui_version="1.4.0",
            available_routes={"/", "/submit", "/my-records", "/profile", "/settings"},
            filter_available_routes=True,
            use_application_shell=True,
            compact_workspace=True,
            auth_safe_candidate=True,
        )
        historic_page = composer._frontend_page(
            "/expense-claims",
            [{"id": "employee", "label": "Employee", "kind": "submitter"}],
            "employee",
            {"amount": "Amount"},
        )

        self.assertIn('const sessionGeneration = useRef(0);', page)
        self.assertIn('const requestAbortController = useRef<AbortController | null>(null);', page)
        self.assertIn('function sessionIsCurrent(generation: number, sessionActor: string)', page)
        self.assertIn('function invalidateSession()', page)
        self.assertIn('requestAbortController.current?.abort();', page)
        self.assertIn('if (!sessionIsCurrent(generation, sessionActor)) return false;', page)
        self.assertIn('if (sessionIsCurrent(generation, sessionActor)) setDecisionPending(false);', page)
        self.assertIn('function switchRole() { invalidateSession(); setSignedIn(false); setRecords([]); setAuditEvents([]); setFeedback(null); setConfirmation(null); setDecisionPending(false); setActiveView("/"); }', page)
        self.assertNotIn('const sessionGeneration = useRef(0);', historic_page)
        self.assertNotIn('requestAbortController', historic_page)

    def test_scaffold_css_only_resets_the_document_and_defers_visual_rules_to_the_shell_asset(self) -> None:
        """The scaffold must not reintroduce a second generated-application design system."""
        css = (ROOT / "packages" / "composer-scaffold" / "1.0.0" / "frontend" / "app" / "globals.css").read_text(encoding="utf-8")

        self.assertIn('box-sizing: border-box', css)
        self.assertIn('button,\ninput,\nselect,\ntextarea', css)
        self.assertNotIn('.hero', css)
        self.assertNotIn('.request-form', css)
        self.assertNotIn('radial-gradient', css)

    def test_historical_v2_shell_replay_uses_the_historical_page_contract_without_the_new_stylesheet(self) -> None:
        """Exact 2.0 locks remain renderable while new plans consume 2.1 assets."""
        composer = self._composer()
        historical_layout = composer._frontend_layout("Leave approval", include_component_stylesheet=False)

        self.assertNotIn('import "../app-shell/factory-ui.css";', historical_layout)
        self.assertIn('if (!signedIn) return <ApplicationShell>', composer._legacy_frontend_page(
            "/leave-requests",
            [{"id": "employee", "label": "Employee", "kind": "submitter"}],
            "employee",
            {"leave_type": "Leave type"},
        ))


if __name__ == "__main__":
    unittest.main()
