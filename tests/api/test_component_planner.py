import hashlib
import json
import copy
import tempfile
import unittest
from pathlib import Path

from apps.api.control_plane import ControlPlane, ControlPlaneError, load_golden_catalog
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider


EXPECTED_COMPONENT_KEYS = [
    "frontend.admin-shell",
    "backend.fastapi-crud",
    "auth.rbac-local",
    "workflow.single-level-approval",
    "ops.audit-log",
    "data.postgres-compose",
]
EXPECTED_ARTIFACT_CHECKLIST = [
    "application-definition.json",
    "component-lock.json",
    "render-manifest.json",
    "run-summary.json",
    "executor-request.json",
]


class ComponentPlannerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(
            root / "state.json",
            root / "runs",
            provider=FixtureRequirementToDefinitionProvider(),
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _approved_version(self, name: str, brief: str) -> dict:
        created = self.plane.create_project(name, brief)
        return self.plane.approve_version(created["version"]["id"], "founder")

    def test_catalog_exposes_the_six_extended_golden_manifests(self) -> None:
        catalog = self.plane.catalog()
        self.assertEqual(EXPECTED_COMPONENT_KEYS, [component["key"] for component in catalog])
        for component in catalog:
            with self.subTest(component=component["key"]):
                self.assertEqual(
                    {
                        "key",
                        "version",
                        "category",
                        "trust_level",
                        "capabilities",
                        "provides",
                        "requires",
                        "input_contract",
                        "selection_explanation",
                        "artifact_digest",
                    },
                    set(component),
                )
                self.assertEqual("golden", component["trust_level"])
                self.assertTrue(component["provides"])
                self.assertEqual("internal-approval-app", component["input_contract"]["profile"])
                self.assertEqual("approval", component["input_contract"]["workflow"])
                self.assertTrue(component["selection_explanation"])

    def test_plan_matches_the_frozen_contract_and_is_stable_for_the_same_definition(self) -> None:
        first_version = self._approved_version(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        first_plan = self.plane.create_plan_for_version(first_version["id"])
        repeated = self.plane.create_plan_for_version(first_version["id"])

        second_version = self._approved_version(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        second_plan = self.plane.create_plan_for_version(second_version["id"])

        self.assertEqual(first_plan, repeated)
        self.assertEqual(first_plan["checksum"], second_plan["checksum"])
        self.assertEqual(EXPECTED_ARTIFACT_CHECKLIST, first_plan["artifact_checklist"])
        self.assertGreater(len(first_plan["known_profile_limit"]), 20)
        self.assertEqual(EXPECTED_COMPONENT_KEYS, [component["key"] for component in first_plan["components"]])

        expected_inputs = {
            "roles": ["requester", "approver", "auditor"],
            "primary_record": {
                "id": "expense_claim",
                "label": "Expense claim",
                "field_ids": ["amount", "description"],
            },
            "pages": [
                "Submit expense claim",
                "My expense claims",
                "Approval queue",
                "Audit history",
            ],
            "workflow": "approval",
        }
        for component in first_plan["components"]:
            with self.subTest(component=component["key"]):
                self.assertEqual(
                    {
                        "key",
                        "version",
                        "artifact_digest",
                        "category",
                        "trust_level",
                        "requires",
                        "selected_for",
                        "inputs",
                    },
                    set(component),
                )
                self.assertEqual("golden", component["trust_level"])
                self.assertEqual(expected_inputs, component["inputs"])
                self.assertIn("Expense claim", component["selected_for"])
                self.assertLessEqual(len(component["selected_for"]), 300)
                self.assertNotIn("<", component["selected_for"])

    def test_planning_rejects_a_component_that_is_incompatible_with_definition_fields(self) -> None:
        manifest = json.loads(
            (Path(__file__).resolve().parents[2] / "packages" / "catalog" / "components.json").read_text(
                encoding="utf-8"
            )
        )
        manifest[1]["input_contract"]["supported_field_types"] = ["string", "date", "enum"]
        catalog_path = Path(self.temp.name) / "incompatible-components.json"
        catalog_path.write_text(json.dumps(manifest), encoding="utf-8")
        plane = ControlPlane(
            Path(self.temp.name) / "incompatible-state.json",
            Path(self.temp.name) / "incompatible-runs",
            catalog_path=catalog_path,
            provider=FixtureRequirementToDefinitionProvider(),
        )
        created = plane.create_project(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        version = plane.approve_version(created["version"]["id"], "founder")

        with self.assertRaises(ControlPlaneError) as rejected:
            plane.create_plan_for_version(version["id"])
        self.assertEqual("component_incompatible", rejected.exception.code)
        self.assertEqual([], plane.get_project(created["project"]["id"])["plans"])

    def test_rendering_rejects_a_tampered_component_digest_before_writing_output(self) -> None:
        version = self._approved_version(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        self.plane._state["plans"][plan["id"]]["components"][0]["artifact_digest"] = (
            "sha256:" + "0" * 64
        )

        with self.assertRaises(ControlPlaneError) as rejected:
            self.plane.create_run(plan["id"])
        self.assertEqual("component_plan_incompatible", rejected.exception.code)
        self.assertEqual([], self.plane.get_project(version["project_id"])["runs"])
        self.assertFalse(any(Path(self.temp.name, "runs").glob("run_*")))

    def test_generated_api_and_ui_enforce_the_definition_page_actor_matrix(self) -> None:
        version = self._approved_version(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"
        main_source = (output / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        page_source = (output / "frontend" / "app" / "page.tsx").read_text(encoding="utf-8")

        self.assertIn("require_role(actor, 'requester', 'approver')", main_source)
        self.assertIn("WHERE status = 'submitted' ORDER BY created_at, id", main_source)
        self.assertIn(
            '{(actor === "requester" || actor === "approver") && (',
            page_source,
        )

    def test_planning_and_rendering_reject_a_definition_changed_after_approval(self) -> None:
        created = self.plane.create_project(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        version = self.plane.approve_version(created["version"]["id"], "founder")
        self.plane._state["versions"][version["id"]]["definition"]["primary_record"]["label"] = (
            "Changed expense claim"
        )

        with self.assertRaises(ControlPlaneError) as planning:
            self.plane.create_plan_for_version(version["id"])
        self.assertEqual(409, planning.exception.status)
        self.assertEqual("definition_tampered", planning.exception.code)
        self.assertEqual([], self.plane.get_project(version["project_id"])["plans"])

        clean_created = self.plane.create_project(
            "equipment-access",
            "Requesters submit equipment access requests and security approves them.",
        )
        clean_version = self.plane.approve_version(clean_created["version"]["id"], "founder")
        plan = self.plane.create_plan_for_version(clean_version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        self.plane._state["versions"][clean_version["id"]]["definition"]["primary_record"]["label"] = (
            "Changed equipment access request"
        )

        with self.assertRaises(ControlPlaneError) as rendering:
            self.plane.create_run(plan["id"])
        self.assertEqual(409, rendering.exception.status)
        self.assertEqual("definition_tampered", rendering.exception.code)
        self.assertEqual([], self.plane.get_project(clean_version["project_id"])["runs"])

    def test_schema_valid_quotes_and_backslashes_render_compilable_python(self) -> None:
        created = self.plane.create_project(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        definition = copy.deepcopy(created["version"]["definition"])
        definition["metadata"]["version"] = "2"
        definition["primary_record"]["label"] = 'Expense """ claim \\\\ review\'s'
        version = self.plane.create_version(
            created["project"]["id"],
            created["version"]["id"],
            definition,
        )
        self.plane.approve_version(version["id"], "founder")
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"

        for relative in (
            "backend/app/main.py",
            "backend/app/test_api.py",
            "smoke_test.py",
        ):
            source = (output / relative).read_text(encoding="utf-8")
            compile(source, relative, "exec")

    def test_child_definition_drives_role_page_and_enum_configuration(self) -> None:
        created = self.plane.create_project(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        definition = copy.deepcopy(created["version"]["definition"])
        definition["metadata"]["version"] = "2"
        definition["roles"] = [
            {"id": "claimant", "label": "Claimant", "kind": "submitter"},
            {"id": "finance_reviewer", "label": "Finance reviewer", "kind": "approver"},
            {"id": "compliance_reviewer", "label": "Compliance reviewer", "kind": "auditor"},
        ]
        definition["primary_record"]["fields"][0]["required"] = False
        definition["primary_record"]["fields"].append({
            "id": "category",
            "label": "Expense category",
            "type": "enum",
            "required": False,
            "options": ["Travel", "Meals"],
        })
        definition["pages"] = [
            {"id": "submit", "label": "Create claim", "kind": "form", "actor_kinds": ["submitter"]},
            {"id": "my_records", "label": "Claim history", "kind": "list", "actor_kinds": ["submitter"]},
            {"id": "approval_queue", "label": "Finance inbox", "kind": "queue", "actor_kinds": ["approver"]},
            {"id": "audit", "label": "Compliance log", "kind": "audit", "actor_kinds": ["auditor"]},
        ]
        version = self.plane.create_version(
            created["project"]["id"],
            created["version"]["id"],
            definition,
        )
        self.plane.approve_version(version["id"], "founder")
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        run = self.plane.create_run(plan["id"])
        output = Path(self.temp.name) / "runs" / run["id"] / "output"

        expected_inputs = plan["components"][0]["inputs"]
        self.assertEqual(["claimant", "finance_reviewer", "compliance_reviewer"], expected_inputs["roles"])
        self.assertEqual(
            ["Create claim", "Claim history", "Finance inbox", "Compliance log"],
            expected_inputs["pages"],
        )
        main_source = (output / "backend" / "app" / "main.py").read_text(encoding="utf-8")
        schema = (output / "backend" / "app" / "schema.sql").read_text(encoding="utf-8")
        page = (output / "frontend" / "app" / "page.tsx").read_text(encoding="utf-8")
        smoke = (output / "smoke_test.py").read_text(encoding="utf-8")
        self.assertIn("claimant", main_source)
        self.assertIn("finance_reviewer", main_source)
        self.assertIn("compliance_reviewer", main_source)
        self.assertIn("amount DOUBLE PRECISION,", schema)
        self.assertIn("category TEXT,", schema)
        self.assertIn("CHECK (category IN ('Travel', 'Meals'))", schema)
        for label in ("Create claim", "Claim history", "Finance inbox", "Compliance log", "Expense category"):
            self.assertIn(label, page)
        self.assertIn(
            'amount: form.get("amount") === "" ? null : Number(form.get("amount"))',
            page,
        )
        self.assertIn('<option value="">Select…</option>', page)
        self.assertIn('category: form.get("category") || null', page)
        self.assertIn("'category': 'Travel'", smoke)

    def test_rendering_is_definition_driven_and_emits_checksummed_evidence(self) -> None:
        cases = [
            {
                "name": "leave-approval",
                "brief": "Employees submit leave requests and managers approve them.",
                "record_id": "leave_request",
                "record_label": "Leave request",
                "api_path": "/leave-requests",
                "schema_fields": ["start_date DATE NOT NULL", "end_date DATE NOT NULL", "reason TEXT NOT NULL"],
                "form_labels": ["Start date", "End date", "Reason"],
            },
            {
                "name": "expense-approval",
                "brief": "Employees submit expense claims and managers approve them.",
                "record_id": "expense_claim",
                "record_label": "Expense claim",
                "api_path": "/expense-claims",
                "schema_fields": ["amount DOUBLE PRECISION NOT NULL", "description TEXT NOT NULL"],
                "form_labels": ["Amount", "Description"],
            },
            {
                "name": "equipment-access",
                "brief": "Requesters submit equipment access requests and security approves them.",
                "record_id": "equipment_access_request",
                "record_label": "Equipment access request",
                "api_path": "/equipment-access-requests",
                "schema_fields": ["equipment_name TEXT NOT NULL", "access_date DATE NOT NULL"],
                "form_labels": ["Equipment name", "Access date"],
            },
        ]

        for case in cases:
            with self.subTest(application=case["name"]):
                version = self._approved_version(case["name"], case["brief"])
                plan = self.plane.create_plan_for_version(version["id"])
                self.plane.approve_plan(plan["id"], "founder")
                run = self.plane.create_run(plan["id"])
                output = Path(self.temp.name) / "runs" / run["id"] / "output"

                self.assertEqual("queued", run["status"])
                self.assertEqual("queued", run["phase"])
                self.assertTrue(output.is_dir())
                executor_request = json.loads(
                    (output / "executor-request.json").read_text(encoding="utf-8")
                )
                unsigned_request = {
                    key: value
                    for key, value in executor_request.items()
                    if key
                    not in {"request_checksum", "key_id", "request_signature"}
                }
                expected_request_checksum = "sha256:" + hashlib.sha256(
                    json.dumps(
                        unsigned_request,
                        ensure_ascii=False,
                        sort_keys=True,
                        separators=(",", ":"),
                    ).encode("utf-8")
                ).hexdigest()
                self.assertEqual(
                    expected_request_checksum,
                    executor_request["request_checksum"],
                )
                self.assertEqual(
                    {
                        "application_definition",
                        "component_lock",
                        "render_manifest",
                        "run_summary",
                        "executor_request",
                    },
                    {artifact["kind"] for artifact in run["artifacts"]},
                )

                definition = json.loads((output / "application-definition.json").read_text(encoding="utf-8"))
                component_lock = json.loads((output / "component-lock.json").read_text(encoding="utf-8"))
                manifest = json.loads((output / "render-manifest.json").read_text(encoding="utf-8"))
                summary = json.loads((output / "run-summary.json").read_text(encoding="utf-8"))
                main_source = (output / "backend" / "app" / "main.py").read_text(encoding="utf-8")
                backend_test_source = (output / "backend" / "app" / "test_api.py").read_text(encoding="utf-8")
                schema = (output / "backend" / "app" / "schema.sql").read_text(encoding="utf-8")
                page = (output / "frontend" / "app" / "page.tsx").read_text(encoding="utf-8")
                api_contract = json.loads((output / "backend" / "api-contract.json").read_text(encoding="utf-8"))
                smoke = (output / "smoke_test.py").read_text(encoding="utf-8")

                self.assertEqual(case["record_id"], definition["primary_record"]["id"])
                compile(main_source, "generated-main.py", "exec")
                compile(backend_test_source, "generated-test-api.py", "exec")
                compile(smoke, "generated-smoke-test.py", "exec")
                self.assertEqual(plan["components"], component_lock["components"])
                self.assertEqual(version["definition_checksum"], manifest["definition_checksum"])
                self.assertEqual(plan["checksum"], manifest["plan_checksum"])
                self.assertEqual(version["definition_checksum"], summary["definition_checksum"])
                expected_definition_checksum = "sha256:" + hashlib.sha256(
                    json.dumps(
                        definition,
                        ensure_ascii=False,
                        sort_keys=True,
                        separators=(",", ":"),
                    ).encode("utf-8")
                ).hexdigest()
                self.assertEqual(expected_definition_checksum, manifest["definition_checksum"])
                self.assertEqual(expected_definition_checksum, summary["definition_checksum"])
                self.assertEqual(plan["checksum"], summary["component_plan_checksum"])
                self.assertEqual(f"{case['record_label']} Approval API", api_contract["info"]["title"])
                self.assertIn(case["api_path"], api_contract["paths"])
                self.assertIn(case["api_path"], main_source)
                self.assertIn(case["api_path"], smoke)
                self.assertIn(case["record_label"], page)
                for expected in case["schema_fields"]:
                    self.assertIn(expected, schema)
                for expected in case["form_labels"]:
                    self.assertIn(expected, page)
                self.assertIn("'submitted', 'approved', 'rejected'", schema)
                self.assertIn("audit_events_append_only", schema)

                manifest_paths = {item["path"] for item in manifest["files"]}
                actual_paths = {
                    path.relative_to(output).as_posix()
                    for path in output.rglob("*")
                    if path.is_file()
                    and path.name not in {
                        "render-manifest.json",
                        "executor-request.json",
                    }
                }
                self.assertEqual(actual_paths, manifest_paths)
                for item in manifest["files"]:
                    digest = hashlib.sha256((output / item["path"]).read_bytes()).hexdigest()
                    self.assertEqual(f"sha256:{digest}", item["sha256"])
                for artifact in run["artifacts"]:
                    digest = hashlib.sha256((output / artifact["path"]).read_bytes()).hexdigest()
                    self.assertEqual(f"sha256:{digest}", artifact["sha256"])

                persisted_and_rendered = (
                    self.plane.state_path.read_text(encoding="utf-8")
                    + "\n"
                    + "\n".join(
                        path.read_text(encoding="utf-8", errors="ignore")
                        for path in output.rglob("*")
                        if path.is_file()
                    )
                )
                self.assertNotIn(case["brief"], persisted_and_rendered)
                self.assertNotIn("OPENAI_API_KEY", persisted_and_rendered)


class CatalogValidationTests(unittest.TestCase):
    def test_manifest_rejects_duplicate_required_capability_provider(self) -> None:
        source = Path(__file__).resolve().parents[2] / "packages" / "catalog" / "components.json"
        manifest = json.loads(source.read_text(encoding="utf-8"))
        manifest[1]["provides"] = list(manifest[0]["provides"])
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "components.json"
            target.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "duplicate capability provider"):
                load_golden_catalog(target)


if __name__ == "__main__":
    unittest.main()
