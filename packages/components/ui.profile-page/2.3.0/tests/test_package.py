"""Contract checks for the ui.profile-page asset package."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))

from apps.api.component_contract import render_adapter_template_text, validate_component_package


class ProfilePagePackageTests(unittest.TestCase):
    def test_template_has_no_nonfunctional_profile_edit_control(self) -> None:
        package = Path(__file__).resolve().parents[1]
        template = (package / "templates" / "ProfilePage.tsx").read_text(encoding="utf-8")

        self.assertNotIn("fp-icon-button", template)
        self.assertIn("Read only", template)

    def test_package_is_a_candidate_profile_route_with_valid_fixture(self) -> None:
        package = Path(__file__).resolve().parents[1]
        manifest = validate_component_package(
            package,
            available_identities={("ui.profile-page", "2.3.0"), ("ui.app-shell", "2.3.0")},
            approved_package_root=ROOT / "packages" / "components",
        )
        fixture = json.loads((package / "fixtures" / "valid-input.json").read_text(encoding="utf-8"))

        self.assertEqual("frontend/routes/profile", manifest["output_slots"][0])
        self.assertEqual([], list(Draft202012Validator(manifest["input_schema"]).iter_errors(fixture)))


if __name__ == "__main__":
    unittest.main()
