from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools.factory_ui_kit import CONSOLE_COPY_MAP, FactoryUiKitError, verify_factory_ui_kit, verify_generated_ui_distribution


ROOT = Path(__file__).resolve().parents[2]
GENERATED_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui" / "1.0.0"
GENERATED_CANDIDATE_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui" / "1.3.0"
GENERATED_SUCCESSOR_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui" / "1.4.0"
GENERATED_SCAFFOLD = ROOT / "packages" / "composer-scaffold" / "1.0.0" / "frontend"
CONSOLE_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui" / "1.2.0"
CONSOLE_ROLLBACK_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui" / "1.1.0"
CONSOLE_SUCCESSOR_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui-console" / "1.3.0"
CONSOLE_ACTION_CANVAS_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui-console" / "1.4.0"
CONSOLE_LINEAGE_CANDIDATE_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui-console" / "1.5.0"
CONSOLE_TOPOLOGY_CANDIDATE_CANONICAL = ROOT / "packages" / "ui-kit" / "factory-ui-console" / "1.6.0"
CONSOLE = ROOT / "apps" / "console-next" / "components" / "factory-ui"
GENERATED_UI_ROOTS = tuple(
    ROOT / "packages" / "components" / key / "2.1.0"
    for key in (
        "ui.app-shell",
        "ui.login-page",
        "ui.home-page",
        "ui.profile-page",
        "ui.system-settings-page",
        "ui.approval-form",
        "ui.my-requests",
        "ui.approval-queue",
    )
)
GENERATED_UI_CANDIDATE_ROOTS = tuple(
    ROOT / "packages" / "components" / key / "2.2.0"
    for key in (
        "ui.app-shell",
        "ui.login-page",
        "ui.home-page",
        "ui.profile-page",
        "ui.system-settings-page",
        "ui.approval-form",
        "ui.my-requests",
        "ui.approval-queue",
    )
)
GENERATED_UI_SUCCESSOR_ROOTS = tuple(
    ROOT / "packages" / "components" / key / "2.3.0"
    for key in (
        "ui.app-shell",
        "ui.login-page",
        "ui.home-page",
        "ui.profile-page",
        "ui.system-settings-page",
        "ui.approval-form",
        "ui.my-requests",
        "ui.approval-queue",
    )
)
GENERATED_UI_AUTH_NAVIGATION_CANDIDATE_ROOTS = tuple(
    ROOT / "packages" / "components" / key / "2.4.0"
    for key in (
        "ui.app-shell",
        "ui.login-page",
        "ui.home-page",
        "ui.profile-page",
        "ui.system-settings-page",
        "ui.approval-form",
        "ui.my-requests",
        "ui.approval-queue",
    )
)


def _copy_console_asset(canonical_root: Path, destination_root: Path) -> None:
    for canonical_relative, console_relative in CONSOLE_COPY_MAP.items():
        destination = destination_root / console_relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes((canonical_root / canonical_relative).read_bytes())


class FactoryUiKitTests(unittest.TestCase):
    def test_canonical_kit_and_console_distribution_are_digest_locked(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            console_copy = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_CANONICAL, console_copy)
            verified = verify_factory_ui_kit(CONSOLE_CANONICAL, console_copy, expected_version="1.2.0")

        self.assertEqual("factory-ui", verified["key"])
        self.assertEqual("1.2.0", verified["version"])
        self.assertEqual(
            {"app-shell", "button", "input", "textarea", "select", "label", "badge", "card", "tabs", "table", "dialog", "accordion", "notice", "empty-state", "shell", "action", "panel", "inspector", "stage-rail", "status", "theme", "icon-action", "tooltip", "sheet", "command-trigger", "theme-control"},
            set(verified["components"]),
        )
        self.assertTrue(all(item["console_digest"] == item["canonical_digest"] for item in verified["files"]))

    def test_canonical_kit_declares_console_semantic_wrappers(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            console_copy = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_CANONICAL, console_copy)
            verified = verify_factory_ui_kit(CONSOLE_CANONICAL, console_copy, expected_version="1.2.0")

        self.assertTrue(
            {"shell", "action", "panel", "inspector", "stage-rail", "status", "theme", "icon-action", "tooltip", "sheet", "command-trigger", "theme-control"}
            <= set(verified["components"])
        )

    def test_theme_tokens_define_light_default_and_dark_override(self) -> None:
        tokens = (CONSOLE_CANONICAL / "tokens.css").read_text(encoding="utf-8")

        self.assertIn(":root", tokens)
        self.assertIn(".dark", tokens)
        self.assertIn("--fui-canvas", tokens)
        self.assertIn("--fui-surface", tokens)

    def test_console_successor_css_scopes_interactions_to_its_own_marker(self) -> None:
        stylesheet = (CONSOLE_CANONICAL / "factory-ui.css").read_text(encoding="utf-8")

        self.assertIn('[data-factory-ui="1.2.0"] :focus-visible', stylesheet)
        self.assertNotIn('[data-factory-ui="1.0.0"]', stylesheet)
        self.assertNotIn('[data-factory-ui="1.1.0"]', stylesheet)
        self.assertIn('prefers-reduced-motion: reduce', stylesheet)

    def test_console_lineage_marks_its_rendered_console_successor_version(self) -> None:
        lineage = (CONSOLE / "lineage-dag.tsx").read_text(encoding="utf-8")

        self.assertIn('data-factory-ui="1.5.0"', lineage)
        self.assertNotIn('data-factory-ui="1.0.0"', lineage)
        self.assertNotIn('data-factory-ui="1.1.0"', lineage)
        self.assertNotIn('data-factory-ui="1.2.0"', lineage)

    def test_console_copy_drift_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            shutil.copytree(CONSOLE, copied)
            stylesheet = copied / "factory-ui.css"
            stylesheet.write_text(stylesheet.read_text(encoding="utf-8") + "\n/* drift */\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "console_copy_digest_mismatch"):
                verify_factory_ui_kit(CONSOLE_CANONICAL, copied, expected_version="1.2.0")

    def test_console_successor_uses_its_own_immutable_identity(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            console_copy = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_SUCCESSOR_CANONICAL, console_copy)
            verified = verify_factory_ui_kit(
                CONSOLE_SUCCESSOR_CANONICAL,
                console_copy,
                expected_key="factory-ui-console",
                expected_version="1.3.0",
            )

        self.assertEqual("factory-ui-console", verified["key"])
        self.assertEqual("1.3.0", verified["version"])

    def test_generated_ui_canonical_cannot_satisfy_console_successor_identity(self) -> None:
        with self.assertRaisesRegex(FactoryUiKitError, "canonical_identity_invalid"):
            verify_factory_ui_kit(
                GENERATED_CANDIDATE_CANONICAL,
                CONSOLE,
                expected_key="factory-ui-console",
                expected_version="1.3.0",
            )

    def test_console_successor_copy_drift_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_SUCCESSOR_CANONICAL, copied)
            stylesheet = copied / "factory-ui.css"
            stylesheet.write_text(stylesheet.read_text(encoding="utf-8") + "\n/* successor drift */\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "console_copy_digest_mismatch"):
                verify_factory_ui_kit(
                    CONSOLE_SUCCESSOR_CANONICAL,
                    copied,
                    expected_key="factory-ui-console",
                    expected_version="1.3.0",
                )

    def test_console_action_canvas_has_its_own_immutable_identity_and_rejects_copy_drift(self) -> None:
        """Changing the 1.4 package identity or live primitives must fail closed."""
        with tempfile.TemporaryDirectory() as temporary:
            historic_copy = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_ACTION_CANVAS_CANONICAL, historic_copy)
            verified = verify_factory_ui_kit(
                CONSOLE_ACTION_CANVAS_CANONICAL,
                historic_copy,
                expected_key="factory-ui-console",
                expected_version="1.4.0",
            )

        self.assertEqual("factory-ui-console", verified["key"])
        self.assertEqual("1.4.0", verified["version"])

    def test_console_action_canvas_canonical_owns_the_connected_compact_stage_rail(self) -> None:
        """Removing the primitive rail contract must fail before Console overrides can mask it."""
        stylesheet = (CONSOLE_ACTION_CANVAS_CANONICAL / "factory-ui.css").read_text(encoding="utf-8")

        self.assertIn('.factory-stage-rail { position: relative; display: flex; align-items: stretch; gap: 0;', stylesheet)
        self.assertIn('.factory-stage-rail::before', stylesheet)
        self.assertIn('.factory-stage { position: relative; z-index: 1;', stylesheet)
        self.assertIn('min-height: 56px;', stylesheet)
        self.assertIn('@media (max-width: 780px) { .factory-stage-rail { flex-wrap: nowrap; overflow-x: auto;', stylesheet)
        self.assertIn('.factory-stage { flex: 0 0 148px; min-width: 148px;', stylesheet)

    def test_console_lineage_candidate_has_its_own_immutable_identity_and_preserves_1_4(self) -> None:
        """The responsive Lineage candidate may not relabel or replace accepted 1.4."""
        before = {
            relative: (CONSOLE_ACTION_CANVAS_CANONICAL / relative).read_bytes()
            for relative in CONSOLE_COPY_MAP
        }
        with tempfile.TemporaryDirectory() as temporary:
            historic_copy = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_LINEAGE_CANDIDATE_CANONICAL, historic_copy)
            verified = verify_factory_ui_kit(
                CONSOLE_LINEAGE_CANDIDATE_CANONICAL,
                historic_copy,
                expected_key="factory-ui-console",
                expected_version="1.5.0",
            )

        self.assertEqual("factory-ui-console", verified["key"])
        self.assertEqual("1.5.0", verified["version"])
        self.assertEqual(
            before,
            {relative: (CONSOLE_ACTION_CANVAS_CANONICAL / relative).read_bytes() for relative in CONSOLE_COPY_MAP},
        )

    def test_console_lineage_candidate_copy_drift_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_LINEAGE_CANDIDATE_CANONICAL, copied)
            stylesheet = copied / "factory-ui.css"
            stylesheet.write_text(stylesheet.read_text(encoding="utf-8") + "\n/* lineage candidate drift */\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "console_copy_digest_mismatch"):
                verify_factory_ui_kit(
                    CONSOLE_LINEAGE_CANDIDATE_CANONICAL,
                    copied,
                    expected_key="factory-ui-console",
                    expected_version="1.5.0",
                )

    def test_console_topology_candidate_has_a_distinct_identity_without_mutating_historic_candidates(self) -> None:
        """Console 1.6 must be a new exact live map, never a relabel of 1.4 or 1.5."""
        historic_before = {
            root: {relative: (root / relative).read_bytes() for relative in CONSOLE_COPY_MAP}
            for root in (CONSOLE_ACTION_CANVAS_CANONICAL, CONSOLE_LINEAGE_CANDIDATE_CANONICAL)
        }

        verified = verify_factory_ui_kit(
            CONSOLE_TOPOLOGY_CANDIDATE_CANONICAL,
            CONSOLE,
            expected_key="factory-ui-console",
            expected_version="1.6.0",
        )

        self.assertEqual("factory-ui-console", verified["key"])
        self.assertEqual("1.6.0", verified["version"])
        self.assertTrue(all(item["console_digest"] == item["canonical_digest"] for item in verified["files"]))
        self.assertEqual(
            historic_before,
            {
                root: {relative: (root / relative).read_bytes() for relative in CONSOLE_COPY_MAP}
                for root in (CONSOLE_ACTION_CANVAS_CANONICAL, CONSOLE_LINEAGE_CANDIDATE_CANONICAL)
            },
        )

    def test_console_topology_candidate_copy_drift_fails_with_its_stable_rejection_id(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            _copy_console_asset(CONSOLE_TOPOLOGY_CANDIDATE_CANONICAL, copied)
            stylesheet = copied / "factory-ui.css"
            stylesheet.write_text(stylesheet.read_text(encoding="utf-8") + "\n/* topology drift */\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "console_candidate_copy_digest_mismatch"):
                verify_factory_ui_kit(
                    CONSOLE_TOPOLOGY_CANDIDATE_CANONICAL,
                    copied,
                    expected_key="factory-ui-console",
                    expected_version="1.6.0",
                )

    def test_generated_golden_distribution_is_locked_to_canonical_css_and_tokens(self) -> None:
        verified = verify_generated_ui_distribution(GENERATED_CANONICAL, GENERATED_UI_ROOTS)

        self.assertEqual("factory-ui", verified["key"])
        self.assertEqual("1.0.0", verified["version"])
        self.assertEqual(8, len(verified["packages"]))
        self.assertTrue(all(item["lifecycle"] == "golden" for item in verified["packages"]))
        self.assertTrue(all(item["canonical_css_digest"] == verified["canonical_css_digest"] for item in verified["packages"]))

    def test_generated_distribution_rejects_a_missing_canonical_evidence_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "ui.app-shell" / "2.1.0"
            copied.parent.mkdir(parents=True)
            shutil.copytree(GENERATED_UI_ROOTS[0], copied)
            (copied / "canonical-ui.json").unlink()

            with self.assertRaisesRegex(FactoryUiKitError, "generated_canonical_evidence_unavailable"):
                verify_generated_ui_distribution(GENERATED_CANONICAL, (copied,))

    def test_generated_ui_2_1_remains_bound_to_canonical_1_0(self) -> None:
        for package_root in GENERATED_UI_ROOTS:
            sidecar = (package_root / "canonical-ui.json").read_text(encoding="utf-8")
            self.assertIn('"version":"1.0.0"', sidecar)
            self.assertNotIn('"version":"1.1.0"', sidecar)

    def test_generated_ui_2_2_candidate_family_has_its_own_canonical_identity(self) -> None:
        self.assertTrue(GENERATED_CANDIDATE_CANONICAL.is_dir())
        self.assertTrue(all(root.is_dir() for root in GENERATED_UI_CANDIDATE_ROOTS))
        verified = verify_generated_ui_distribution(
            GENERATED_CANDIDATE_CANONICAL,
            GENERATED_UI_CANDIDATE_ROOTS,
            expected_version="2.2.0",
            expected_lifecycle="candidate",
        )
        self.assertEqual("1.3.0", verified["version"])
        self.assertEqual(8, len(verified["packages"]))
        self.assertTrue(all(item["lifecycle"] == "candidate" for item in verified["packages"]))

    def test_generated_ui_2_2_rejects_tampered_canonical_source_assets(self) -> None:
        """Candidate sidecars cannot substitute for the canonical source bytes."""
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            shutil.copytree(GENERATED_CANDIDATE_CANONICAL, copied)
            (copied / "tokens.css").write_text("/* tampered */\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "canonical_inventory_digest_mismatch"):
                verify_generated_ui_distribution(
                    copied,
                    GENERATED_UI_CANDIDATE_ROOTS,
                    expected_version="2.2.0",
                    expected_lifecycle="candidate",
                )

    def test_generated_ui_2_2_rejects_tampered_canonical_react_asset(self) -> None:
        """The candidate mapping binds canonical React, not only CSS and tokens."""
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            shutil.copytree(GENERATED_CANDIDATE_CANONICAL, copied)
            react_source = copied / "react" / "factory-ui.tsx"
            react_source.write_text("export const compromised = true;\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "canonical_inventory_digest_mismatch"):
                verify_generated_ui_distribution(
                    copied,
                    GENERATED_UI_CANDIDATE_ROOTS,
                    expected_version="2.2.0",
                    expected_lifecycle="candidate",
                )

    def test_generated_ui_2_3_has_a_pinned_lucide_closure(self) -> None:
        """The successor cannot inherit the Console icon dependency implicitly."""
        canonical_manifest = json.loads((GENERATED_SUCCESSOR_CANONICAL / "factory-ui.manifest.json").read_text(encoding="utf-8"))
        closure = json.loads((GENERATED_SUCCESSOR_CANONICAL / "dependency-closure.json").read_text(encoding="utf-8"))
        scaffold_manifest = json.loads((GENERATED_SCAFFOLD / "package.json").read_text(encoding="utf-8"))
        lockfile = json.loads((GENERATED_SCAFFOLD / "package-lock.json").read_text(encoding="utf-8"))

        self.assertEqual("1.4.0", canonical_manifest["version"])
        self.assertEqual("0.474.0", scaffold_manifest["dependencies"]["lucide-react"])
        locked = lockfile["packages"]["node_modules/lucide-react"]
        self.assertEqual("0.474.0", locked["version"])
        self.assertEqual("ISC", locked["license"])
        self.assertEqual("lucide-react", closure["package"]["name"])
        self.assertEqual("0.474.0", closure["package"]["version"])
        self.assertEqual("ISC", closure["package"]["license"])
        self.assertIn("react/factory-ui.tsx", {item["path"] for item in canonical_manifest["inventory"]})

    def test_generated_ui_2_3_rejects_a_tampered_lucide_closure_even_if_its_manifest_hash_is_refreshed(self) -> None:
        """An inventory lock alone is insufficient: the closure must match the local scaffold and notice."""
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            shutil.copytree(GENERATED_SUCCESSOR_CANONICAL, copied)
            closure_path = copied / "dependency-closure.json"
            closure = json.loads(closure_path.read_text(encoding="utf-8"))
            closure["package"]["version"] = "0.0.0"
            closure_path.write_text(json.dumps(closure, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
            manifest_path = copied / "factory-ui.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            for item in manifest["inventory"]:
                if item["path"] == "dependency-closure.json":
                    item["sha256"] = "sha256:" + hashlib.sha256(closure_path.read_bytes()).hexdigest()
            manifest_path.write_text(json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "lucide_closure_package_invalid"):
                verify_generated_ui_distribution(
                    copied,
                    GENERATED_UI_SUCCESSOR_ROOTS,
                    expected_version="2.3.0",
                    expected_lifecycle="candidate",
                )

    def test_generated_ui_2_3_is_a_complete_candidate_family_with_a_truthful_audit_marker(self) -> None:
        verified = verify_generated_ui_distribution(
            GENERATED_SUCCESSOR_CANONICAL,
            GENERATED_UI_SUCCESSOR_ROOTS,
            expected_version="2.3.0",
            expected_lifecycle="candidate",
        )

        self.assertEqual("1.4.0", verified["version"])
        self.assertEqual(8, len(verified["packages"]))
        self.assertTrue(all(item["lifecycle"] == "candidate" for item in verified["packages"]))
        for root in GENERATED_UI_SUCCESSOR_ROOTS:
            manifest = json.loads((root / "component.json").read_text(encoding="utf-8"))
            template_source = "\n".join(path.read_text(encoding="utf-8") for path in (root / "templates").rglob("*.tsx"))
            self.assertNotIn("@2.2.0", template_source)
            if manifest["key"] == "ui.app-shell":
                audit_template = (root / "templates" / "AuditLog.tsx").read_text(encoding="utf-8")
                self.assertIn('data-factory-component="ui.app-shell.audit@2.3.0"', audit_template)
            else:
                self.assertEqual([{"key": "ui.app-shell", "version": "2.3.0"}], manifest["requires"])

    def test_generated_ui_2_4_is_a_complete_auth_navigation_candidate_family(self) -> None:
        """The auth repair is a complete new candidate, never a relabelled 2.3 package."""
        verified = verify_generated_ui_distribution(
            GENERATED_SUCCESSOR_CANONICAL,
            GENERATED_UI_AUTH_NAVIGATION_CANDIDATE_ROOTS,
            expected_version="2.4.0",
            expected_lifecycle="candidate",
        )

        self.assertEqual("1.4.0", verified["version"])
        self.assertEqual(8, len(verified["packages"]))
        for root in GENERATED_UI_AUTH_NAVIGATION_CANDIDATE_ROOTS:
            manifest = json.loads((root / "component.json").read_text(encoding="utf-8"))
            template_source = "\n".join(path.read_text(encoding="utf-8") for path in (root / "templates").rglob("*.tsx"))
            self.assertNotIn("@2.3.0", template_source)
            if manifest["key"] == "ui.app-shell":
                self.assertIn('data-factory-component="ui.app-shell@2.4.0"', template_source)
                self.assertIn('data-factory-component="ui.app-shell.audit@2.4.0"', template_source)
            else:
                self.assertEqual([{"key": "ui.app-shell", "version": "2.4.0"}], manifest["requires"])

    def test_generated_ui_2_4_rejects_tampered_lucide_closure(self) -> None:
        """The new family must retain the canonical 1.4 dependency-closure gate."""
        with tempfile.TemporaryDirectory() as temporary:
            copied = Path(temporary) / "factory-ui"
            shutil.copytree(GENERATED_SUCCESSOR_CANONICAL, copied)
            closure_path = copied / "dependency-closure.json"
            closure = json.loads(closure_path.read_text(encoding="utf-8"))
            closure["package"]["version"] = "0.0.0"
            closure_path.write_text(json.dumps(closure, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
            manifest_path = copied / "factory-ui.manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            for item in manifest["inventory"]:
                if item["path"] == "dependency-closure.json":
                    item["sha256"] = "sha256:" + hashlib.sha256(closure_path.read_bytes()).hexdigest()
            manifest_path.write_text(json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")

            with self.assertRaisesRegex(FactoryUiKitError, "lucide_closure_package_invalid"):
                verify_generated_ui_distribution(
                    copied,
                    GENERATED_UI_AUTH_NAVIGATION_CANDIDATE_ROOTS,
                    expected_version="2.4.0",
                    expected_lifecycle="candidate",
                )

    def test_generated_ui_2_3_shell_has_static_icon_navigation_and_a_centered_dialog_surface(self) -> None:
        """The successor asset owns its icon rail and modal, never Console-only chrome."""
        shell = (ROOT / "packages" / "components" / "ui.app-shell" / "2.3.0" / "templates" / "ApplicationShell.tsx").read_text(encoding="utf-8")
        css = (ROOT / "packages" / "components" / "ui.app-shell" / "2.3.0" / "templates" / "factory-ui.css").read_text(encoding="utf-8")

        self.assertIn('from "lucide-react"', shell)
        self.assertIn('data-factory-ui="1.4.0"', shell)
        self.assertIn('data-factory-component="ui.app-shell@2.3.0"', shell)
        self.assertIn('aria-label={item.label}', shell)
        self.assertIn('fp-rail-tooltip', shell)
        self.assertNotIn('iconMap[', shell)
        self.assertIn('.fp-confirmation-backdrop', css)
        self.assertIn('place-items: center', css)
        self.assertNotIn('data-factory-ui="1.3.0"', css)

    def test_temporary_console_1_0_rollback_remains_verifiable_without_touching_generated_ui(self) -> None:
        sidecars_before = {
            package_root: (package_root / "canonical-ui.json").read_bytes()
            for package_root in GENERATED_UI_ROOTS
        }
        with tempfile.TemporaryDirectory() as temporary:
            rollback_console = Path(temporary) / "factory-ui"
            rollback_console.mkdir()
            for canonical_relative, console_relative in CONSOLE_COPY_MAP.items():
                source = GENERATED_CANONICAL / canonical_relative
                destination = rollback_console / console_relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(source.read_bytes())

            verified = verify_factory_ui_kit(
                GENERATED_CANONICAL, rollback_console, expected_version="1.0.0"
            )

        self.assertEqual("1.0.0", verified["version"])
        self.assertEqual(
            sidecars_before,
            {package_root: (package_root / "canonical-ui.json").read_bytes() for package_root in GENERATED_UI_ROOTS},
        )

    def test_temporary_console_1_1_rollback_remains_verifiable_without_touching_generated_ui(self) -> None:
        sidecars_before = {
            package_root: (package_root / "canonical-ui.json").read_bytes()
            for package_root in GENERATED_UI_ROOTS
        }
        with tempfile.TemporaryDirectory() as temporary:
            rollback_console = Path(temporary) / "factory-ui"
            rollback_console.mkdir()
            for canonical_relative, console_relative in CONSOLE_COPY_MAP.items():
                source = CONSOLE_ROLLBACK_CANONICAL / canonical_relative
                destination = rollback_console / console_relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(source.read_bytes())

            verified = verify_factory_ui_kit(
                CONSOLE_ROLLBACK_CANONICAL, rollback_console, expected_version="1.1.0"
            )

        self.assertEqual("1.1.0", verified["version"])
        self.assertEqual(
            sidecars_before,
            {package_root: (package_root / "canonical-ui.json").read_bytes() for package_root in GENERATED_UI_ROOTS},
        )


if __name__ == "__main__":
    unittest.main()
