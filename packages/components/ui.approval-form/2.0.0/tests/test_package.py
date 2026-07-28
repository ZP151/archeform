"""Contract checks for the ui.approval-form asset package."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))

from apps.api.component_contract import render_adapter_template_text, validate_component_package


class ApprovalFormPackageTests(unittest.TestCase):
    def test_adapter_bindings_render_enum_options_as_select_input_data(self) -> None:
        package = Path(__file__).resolve().parents[1]
        fixture = json.loads((package / "fixtures" / "valid-input.json").read_text(encoding="utf-8"))
        adapter = json.loads((package / "adapter.json").read_text(encoding="utf-8"))
        template = (package / adapter["contributions"][0]["source"]).read_text(encoding="utf-8")
        rendered = render_adapter_template_text(template, adapter["contributions"][0], fixture)

        self.assertIn('"type":"enum"', rendered)
        self.assertIn('"options":["Annual","Sick"]', rendered)
        self.assertIn('field.type === "enum" ? <select', rendered)
        self.assertNotIn("{{", rendered)

    def test_package_accepts_a_typed_approval_form_fixture(self) -> None:
        package = Path(__file__).resolve().parents[1]
        manifest = validate_component_package(
            package,
available_identities={("ui.approval-form", "2.0.0"), ("ui.app-shell", "2.0.0")},
            approved_package_root=ROOT / "packages" / "components",
        )
        fixture = json.loads((package / "fixtures" / "valid-input.json").read_text(encoding="utf-8"))

        self.assertEqual("frontend/features/approval-form", manifest["output_slots"][0])
        self.assertEqual([], list(Draft202012Validator(manifest["input_schema"]).iter_errors(fixture)))


if __name__ == "__main__":
    unittest.main()
