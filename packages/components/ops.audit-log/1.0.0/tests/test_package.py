from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))
from apps.api.component_contract import validate_component_package


class PackageTest(unittest.TestCase):
    def test_fixture_satisfies_the_component_input_contract(self) -> None:
        package = Path(__file__).resolve().parents[1]
        available = {(path.name, "1.0.0") for path in (ROOT / "packages" / "components").iterdir() if path.is_dir()}
        manifest = validate_component_package(package, available_identities=available, approved_package_root=ROOT / "packages" / "components")
        fixture = json.loads((package / "fixtures" / "inputs.json").read_text(encoding="utf-8"))
        self.assertFalse(list(Draft202012Validator(manifest["input_schema"]).iter_errors(fixture)))

    def test_audit_schema_keeps_row_mutations_and_truncate_as_separate_trigger_forms(self) -> None:
        package = Path(__file__).resolve().parents[1]
        schema = (package / "templates" / "audit_schema.sql.tmpl").read_text(encoding="utf-8")
        self.assertIn("BEFORE UPDATE OR DELETE ON audit_events", schema)
        self.assertIn("FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();", schema)
        self.assertIn("BEFORE TRUNCATE ON audit_events", schema)
        self.assertIn("FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_event_mutation();", schema)


if __name__ == "__main__":
    unittest.main()
