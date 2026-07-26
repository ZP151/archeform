from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from apps.api.component_contract import (
    ComponentContractError,
    _reject_package_directory_identity,
    calculate_package_digest,
    render_adapter_template_text,
    validate_component_package,
    validate_composition_plan,
    validate_resolved_composition_inputs,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PACKAGE = ROOT / "tests" / "fixtures" / "component-contract" / "valid-ui-login" / "1.0.0"


def _canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _valid_plan(package: dict) -> dict:
    lock = {key: package[key] for key in ("key", "version", "digest")}
    return {
        "schema_version": "factory-composition/v1",
        "application_definition_checksum": "sha256:" + "a" * 64,
        "component_locks": [lock],
        "validated_inputs": {"ui.login-page": {"title": "Leave approval"}},
        "dependency_graph": [],
        "adapter_order": [lock],
        "output_manifest": {"files": [{"path": "frontend/routes/login/page.tsx", "sha256": "sha256:" + "b" * 64}]},
    }


class ComponentContractTests(unittest.TestCase):
    def _copy_fixture(self) -> Path:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        destination = Path(directory.name) / "ui.login-page" / "1.0.0"
        shutil.copytree(FIXTURE_PACKAGE, destination)
        return destination

    def _load_manifest(self, package_root: Path) -> dict:
        return json.loads((package_root / "component.json").read_text(encoding="utf-8"))

    def _write_manifest(self, package_root: Path, manifest: dict) -> None:
        (package_root / "component.json").write_text(_canonical(manifest) + "\n", encoding="utf-8")

    def _refresh_manifest_digest(self, package_root: Path, manifest: dict) -> None:
        for item in manifest["inventory"]:
            item["sha256"] = _sha256_file(package_root / item["path"])
        manifest["digest"] = calculate_package_digest(package_root, manifest)

    def test_accepts_the_versioned_fixture_package_and_composition_plan(self) -> None:
        package_root = self._copy_fixture()
        package = validate_component_package(package_root)
        self.assertEqual("ui.login-page", package["key"])
        self.assertEqual("golden", package["lifecycle"])
        self.assertEqual(package["digest"], calculate_package_digest(package_root, package))
        plan = validate_composition_plan(_valid_plan(package))
        self.assertEqual(["ui.login-page"], [item["key"] for item in plan["component_locks"]])

    def test_rejects_unsupported_contract_versions_and_unknown_manifest_fields(self) -> None:
        for field, value in (("schema_version", "factory-component/v2"), ("unapproved", True)):
            with self.subTest(field=field):
                package_root = self._copy_fixture()
                manifest = self._load_manifest(package_root)
                manifest[field] = value
                self._write_manifest(package_root, manifest)
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)

    def test_rejects_noncanonical_or_mismatched_package_digests(self) -> None:
        for digest in ("SHA256:" + "a" * 64, "sha256:" + "A" * 64, "sha256:" + "0" * 64):
            with self.subTest(digest=digest):
                package_root = self._copy_fixture()
                manifest = self._load_manifest(package_root)
                manifest["digest"] = digest
                self._write_manifest(package_root, manifest)
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)

    def test_manifest_semantic_mutations_change_the_package_digest_and_fail_validation(self) -> None:
        mutations = {
            "key": lambda manifest: manifest.__setitem__("key", "ui.alternate-login"),
            "requires": lambda manifest: manifest.__setitem__("requires", [{"key": "backend.rbac", "version": "1.0.0"}]),
            "input_schema": lambda manifest: manifest["input_schema"]["properties"].__setitem__("subtitle", {"type": "string"}),
            "output_slots": lambda manifest: manifest["output_slots"].append("frontend/routes/home"),
            "lifecycle": lambda manifest: manifest.__setitem__("lifecycle", "candidate"),
            "verification": lambda manifest: manifest["verification"].__setitem__("source_revision", "abcdef0123456789"),
        }
        for name, mutate in mutations.items():
            with self.subTest(name=name):
                package_root = self._copy_fixture()
                manifest = self._load_manifest(package_root)
                original_digest = manifest["digest"]
                mutate(manifest)
                self.assertNotEqual(original_digest, calculate_package_digest(package_root, manifest))
                self._write_manifest(package_root, manifest)
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)

    def test_rejects_invalid_lifecycle_and_duplicate_component_dependencies(self) -> None:
        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["lifecycle"] = "approved"
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

    def test_rejects_a_golden_package_without_passing_verification_evidence(self) -> None:
        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["verification"]["status"] = "not_run"
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["requires"] = [
            {"key": "backend.rbac", "version": "1.0.0"},
            {"key": "backend.rbac", "version": "1.0.0"},
        ]
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

    def test_rejects_an_unavailable_declared_dependency(self) -> None:
        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["requires"] = [{"key": "backend.rbac", "version": "1.0.0"}]
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root, available_identities={("ui.login-page", "1.0.0")})

    def test_rejects_inventory_paths_outside_the_package_root(self) -> None:
        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["inventory"][0]["path"] = "../outside.txt"
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

    def test_rejects_a_symlinked_inventory_file_or_junction(self) -> None:
        package_root = self._copy_fixture()
        outside = package_root.parent / "outside.txt"
        outside.write_text("outside", encoding="utf-8")
        link = package_root / "templates" / "linked.txt"
        try:
            os.symlink(outside, link)
        except OSError:
            package_root = self._copy_fixture()
            candidate = package_root / "templates" / "login.tsx"
            original_is_symlink = Path.is_symlink
            with mock.patch.object(Path, "is_symlink", autospec=True, side_effect=lambda path: path == candidate or original_is_symlink(path)):
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)
            return
        manifest = self._load_manifest(package_root)
        manifest["inventory"].append({"path": "templates/linked.txt", "sha256": _sha256_file(outside)})
        manifest["inventory"].sort(key=lambda item: item["path"])
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

    def test_rejects_executable_or_undeclared_adapter_contributions(self) -> None:
        for mutation in (
            {"operation": "shell"},
            {"slot": "backend/auth"},
            {"target": "../escape.tsx"},
        ):
            with self.subTest(mutation=mutation):
                package_root = self._copy_fixture()
                adapter_path = package_root / "adapter.json"
                adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
                adapter["contributions"][0].update(mutation)
                adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
                manifest = self._load_manifest(package_root)
                for item in manifest["inventory"]:
                    if item["path"] == "adapter.json":
                        item["sha256"] = _sha256_file(adapter_path)
                self._refresh_manifest_digest(package_root, manifest)
                self._write_manifest(package_root, manifest)
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)

    def test_enforces_the_adr_audit_slot_ownership_policy(self) -> None:
        cases = (
            ("ops.audit-log", "frontend/features/audit"),
            ("ui.app-shell", "backend/audit"),
            ("ui.app-shell", "data/audit-schema"),
            ("backend.record-api", "frontend/features/audit"),
        )
        for component_key, slot in cases:
            with self.subTest(component_key=component_key, slot=slot):
                package_root = self._copy_fixture()
                manifest = self._load_manifest(package_root)
                manifest["key"] = component_key
                manifest["category"] = component_key.split(".", 1)[0]
                manifest["output_slots"] = [slot]
                self._write_manifest(package_root, manifest)
                adapter_path = package_root / "adapter.json"
                adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
                adapter["component_key"] = component_key
                adapter["contributions"][0]["slot"] = slot
                adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
                self._refresh_manifest_digest(package_root, manifest)
                self._write_manifest(package_root, manifest)
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)

    def test_allows_ui_app_shell_to_own_the_audit_presentation_slot(self) -> None:
        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["key"] = "ui.app-shell"
        manifest["output_slots"] = ["frontend/features/audit"]
        adapter_path = package_root / "adapter.json"
        adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
        adapter["component_key"] = "ui.app-shell"
        adapter["contributions"][0]["slot"] = "frontend/features/audit"
        adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
        self._refresh_manifest_digest(package_root, manifest)
        self._write_manifest(package_root, manifest)
        validated = validate_component_package(package_root)
        self.assertEqual("ui.app-shell", validated["key"])

    def test_rejects_an_exclusive_slot_declared_by_the_wrong_component_without_an_adapter_contribution(self) -> None:
        package_root = self._copy_fixture()
        manifest = self._load_manifest(package_root)
        manifest["output_slots"].append("frontend/features/audit")
        self._refresh_manifest_digest(package_root, manifest)
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

    def test_rejects_duplicate_locks_and_unknown_component_keyed_inputs_in_a_composition_plan(self) -> None:
        package = validate_component_package(self._copy_fixture())
        plan = _valid_plan(package)
        plan["component_locks"].append(dict(plan["component_locks"][0]))
        with self.assertRaises(ComponentContractError):
            validate_composition_plan(plan)

    def test_validates_component_keyed_inputs_against_resolved_package_manifests(self) -> None:
        package = validate_component_package(self._copy_fixture())
        plan = _valid_plan(package)
        validated = validate_resolved_composition_inputs(plan, [package])
        self.assertEqual("Leave approval", validated["ui.login-page"]["title"])

        plan = _valid_plan(package)
        plan["validated_inputs"]["ui.login-page"]["raw_brief"] = "Build an approval app"
        with self.assertRaises(ComponentContractError):
            validate_resolved_composition_inputs(plan, [package])

        plan = _valid_plan(package)
        plan["validated_inputs"]["ui.login-page"]["requirements"] = {"description": "Build an approval app"}
        with self.assertRaises(ComponentContractError):
            validate_resolved_composition_inputs(plan, [package])

        plan = _valid_plan(package)
        plan["validated_inputs"]["requirements"] = {"text": "Build an approval app"}
        with self.assertRaises(ComponentContractError):
            validate_composition_plan(plan)

        plan = _valid_plan(package)
        plan["validated_inputs"]["description"] = {"text": "Build an approval app"}
        with self.assertRaises(ComponentContractError):
            validate_composition_plan(plan)

    def test_rejects_non_normalized_or_case_colliding_output_manifest_paths(self) -> None:
        package = validate_component_package(self._copy_fixture())
        for paths in (("frontend//routes/login.tsx",), ("frontend/../escape.tsx",), ("frontend\\login.tsx",), ("Frontend/login.tsx", "frontend/LOGIN.tsx")):
            with self.subTest(paths=paths):
                plan = _valid_plan(package)
                plan["output_manifest"]["files"] = [
                    {"path": path, "sha256": "sha256:" + chr(97 + index) * 64}
                    for index, path in enumerate(paths)
                ]
                with self.assertRaises(ComponentContractError):
                    validate_composition_plan(plan)

    def test_rejects_package_directory_identity_mismatch_when_an_approved_base_is_supplied(self) -> None:
        package_root = self._copy_fixture()
        approved_base = package_root.parents[1]
        validate_component_package(package_root, approved_package_root=approved_base)
        mismatched_root = package_root.parent / "2.0.0"
        shutil.move(str(package_root), mismatched_root)
        with self.assertRaises(ComponentContractError):
            validate_component_package(mismatched_root, approved_package_root=approved_base)

    def test_rejects_an_approved_key_version_path_that_resolves_outside_its_base(self) -> None:
        package_root = self._copy_fixture()
        approved_base = package_root.parents[1]
        outside = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: shutil.rmtree(outside, ignore_errors=True))
        original_resolve = Path.resolve
        outside_resolved = outside.resolve()

        def resolve_alias(path: Path, *, strict: bool = False) -> Path:
            if path == package_root:
                return outside_resolved
            return original_resolve(path, strict=strict)

        with mock.patch.object(Path, "resolve", autospec=True, side_effect=resolve_alias):
            with self.assertRaises(ComponentContractError):
                _reject_package_directory_identity(
                    package_root,
                    self._load_manifest(package_root),
                    approved_base,
                )

    def test_rejects_windows_device_names_and_trailing_dot_space_path_segments(self) -> None:
        for forbidden in ("NUL", "con.txt", "AUX ", "PRN.", "COM1.tsx", "lpt9.JSON"):
            with self.subTest(forbidden=forbidden):
                package_root = self._copy_fixture()
                manifest = self._load_manifest(package_root)
                manifest["inventory"][1]["path"] = f"templates/{forbidden}"
                self._write_manifest(package_root, manifest)
                with self.assertRaises(ComponentContractError):
                    validate_component_package(package_root)

        package_root = self._copy_fixture()
        adapter_path = package_root / "adapter.json"
        adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
        adapter["contributions"][0]["source"] = "templates/NUL.tsx"
        adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
        manifest = self._load_manifest(package_root)
        self._refresh_manifest_digest(package_root, manifest)
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

        package_root = self._copy_fixture()
        adapter_path = package_root / "adapter.json"
        adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
        adapter["contributions"][0]["target"] = "LPT1.tsx"
        adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
        manifest = self._load_manifest(package_root)
        self._refresh_manifest_digest(package_root, manifest)
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

        package = validate_component_package(self._copy_fixture())
        plan = _valid_plan(package)
        plan["output_manifest"]["files"][0]["path"] = "frontend/COM2.tsx"
        with self.assertRaises(ComponentContractError):
            validate_composition_plan(plan)

    def test_rejects_case_fold_colliding_adapter_targets_in_the_same_slot(self) -> None:
        package_root = self._copy_fixture()
        adapter_path = package_root / "adapter.json"
        adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
        duplicate = dict(adapter["contributions"][0])
        duplicate["target"] = "PAGE.tsx"
        adapter["contributions"].append(duplicate)
        adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
        manifest = self._load_manifest(package_root)
        self._refresh_manifest_digest(package_root, manifest)
        self._write_manifest(package_root, manifest)
        with self.assertRaises(ComponentContractError):
            validate_component_package(package_root)

    def test_renders_adversarial_strings_as_safe_context_bound_literals(self) -> None:
        adversarial = 'quote " slash \\ newline\n<unsafe>{text}'
        contribution = {
            "bindings": {"title": {"source": "input.title", "context": "typescript_string"}},
        }
        rendered = render_adapter_template_text(
            "export const title = {{typescript_string:title}};\n",
            contribution,
            {"title": adversarial},
        )
        literal = rendered.removeprefix("export const title = ").removesuffix(";\n")
        self.assertEqual(adversarial, json.loads(literal))
        self.assertNotIn("\n<unsafe>", literal)

        python_rendered = render_adapter_template_text(
            "value = {{python_string:title}}\n",
            {"bindings": {"title": {"source": "input.title", "context": "python_string"}}},
            {"title": adversarial},
        )
        compile(python_rendered, "rendered.py", "exec")

        json_rendered = render_adapter_template_text(
            '{"title": {{json_value:title}}}',
            {"bindings": {"title": {"source": "input.title", "context": "json_value"}}},
            {"title": adversarial},
        )
        self.assertEqual(adversarial, json.loads(json_rendered)["title"])

        with self.assertRaises(ComponentContractError):
            render_adapter_template_text(
                '{"value": {{json_value:value}}}',
                {"bindings": {"value": {"source": "input.value", "context": "json_value"}}},
                {"value": float("nan")},
            )

        tsx_rendered = render_adapter_template_text(
            "<p>{{tsx_text:title}}</p>",
            {"bindings": {"title": {"source": "input.title", "context": "tsx_text"}}},
            {"title": adversarial},
        )
        self.assertIn("&lt;unsafe&gt;", tsx_rendered)
        self.assertNotIn("<unsafe>", tsx_rendered)

    def test_rejects_raw_unknown_unused_or_mismatched_template_placeholders(self) -> None:
        bindings = {"title": {"source": "input.title", "context": "typescript_string"}}
        for template in (
            "const title = {{title}};",
            "const title = {{typescript_string:unknown}};",
            "const title = {{python_string:title}};",
            "const title = {{typescript_string:title;",
            "const title = plain;",
        ):
            with self.subTest(template=template), self.assertRaises(ComponentContractError):
                render_adapter_template_text(template, {"bindings": bindings}, {"title": "safe"})


if __name__ == "__main__":
    unittest.main()
