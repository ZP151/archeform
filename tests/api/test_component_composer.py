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
    ) -> Path:
        destination = self.components / key / "1.0.0"
        shutil.copytree(FIXTURE, destination)
        manifest_path = destination / "component.json"
        adapter_path = destination / "adapter.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        adapter = json.loads(adapter_path.read_text(encoding="utf-8"))
        manifest.update({
            "key": key,
            "category": "ui",
            "provides": [f"{key}.capability"],
            "requires": requires or [],
            "output_slots": [slot],
            "lifecycle": lifecycle,
        })
        adapter["component_key"] = key
        adapter["contributions"][0]["slot"] = slot
        adapter["contributions"][0]["target"] = target
        adapter_path.write_text(_canonical(adapter) + "\n", encoding="utf-8")
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
        self.assertIn('aria-label="Switch role or sign out"', page)


if __name__ == "__main__":
    unittest.main()
