"""Contract checks for the ui.system-settings-page asset package."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))

from apps.api.component_contract import render_adapter_template_text, validate_component_package


class SystemSettingsPagePackageTests(unittest.TestCase):
    def test_adapter_bindings_are_consumed_by_typed_placeholders(self) -> None:
        package = Path(__file__).resolve().parents[1]
        fixture = json.loads((package / "fixtures" / "valid-input.json").read_text(encoding="utf-8"))
        adapter = json.loads((package / "adapter.json").read_text(encoding="utf-8"))
        for contribution in adapter["contributions"]:
            template = (package / contribution["source"]).read_text(encoding="utf-8")
            rendered = render_adapter_template_text(template, contribution, fixture)
            self.assertNotIn("{{", rendered)
            self.assertNotIn("}}", rendered)

    def test_package_is_a_candidate_settings_route_with_valid_fixture(self) -> None:
        package = Path(__file__).resolve().parents[1]
        manifest = validate_component_package(
            package,
available_identities={("ui.system-settings-page", "2.2.0"), ("ui.app-shell", "2.2.0")},
            approved_package_root=ROOT / "packages" / "components",
        )
        fixture = json.loads((package / "fixtures" / "valid-input.json").read_text(encoding="utf-8"))

        self.assertEqual("frontend/routes/system-settings", manifest["output_slots"][0])
        self.assertEqual([], list(Draft202012Validator(manifest["input_schema"]).iter_errors(fixture)))


if __name__ == "__main__":
    unittest.main()
