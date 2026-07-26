from __future__ import annotations

import copy
import unittest

from apps.api.application_definition import DefinitionValidationError, definition_checksum, definition_summary, validate_definition


def valid_definition(name: str = "expense-approval") -> dict:
    return {
        "apiVersion": "factory/v1",
        "kind": "ApplicationDefinition",
        "metadata": {"name": name, "version": "1"},
        "profile": "internal-approval-app",
        "roles": [
            {"id": "employee", "label": "Employee", "kind": "submitter"},
            {"id": "manager", "label": "Manager", "kind": "approver"},
            {"id": "finance", "label": "Finance", "kind": "auditor"},
        ],
        "primary_record": {
            "id": "expense_claim",
            "label": "Expense claim",
            "fields": [
                {"id": "amount", "label": "Amount", "type": "number", "required": True},
                {"id": "description", "label": "Description", "type": "string", "required": True},
            ],
        },
        "workflow": {
            "id": "approval",
            "states": ["draft", "submitted", "approved", "rejected"],
            "transitions": [
                {"from": "draft", "to": "submitted", "action": "submit", "actor_kind": "submitter"},
                {"from": "submitted", "to": "approved", "action": "approve", "actor_kind": "approver"},
                {"from": "submitted", "to": "rejected", "action": "reject", "actor_kind": "approver"},
            ],
        },
        "pages": [
            {"id": "submit", "label": "Submit expense", "kind": "form", "actor_kinds": ["submitter"]},
            {"id": "my_records", "label": "My expenses", "kind": "list", "actor_kinds": ["submitter"]},
            {"id": "approval_queue", "label": "Approval queue", "kind": "queue", "actor_kinds": ["approver"]},
            {"id": "audit", "label": "Audit history", "kind": "audit", "actor_kinds": ["auditor"]},
        ],
        "non_functional": {"audit_log": True, "persistence": "postgresql", "ui": "responsive_web"},
        "assumptions": ["Approver assignment is static in the local preview."],
        "open_questions": [],
    }


class ApplicationDefinitionTests(unittest.TestCase):
    def test_valid_definition_is_deep_copied_and_summarized(self) -> None:
        candidate = valid_definition()
        validated = validate_definition(candidate)
        self.assertEqual(candidate, validated)
        self.assertIsNot(candidate, validated)
        candidate["roles"][0]["label"] = "Changed"
        self.assertEqual("Employee", validated["roles"][0]["label"])
        self.assertTrue(definition_checksum(validated).startswith("sha256:"))
        self.assertEqual(
            {"name": "expense-approval", "version": "1", "roles": 3, "fields": 2, "pages": 4},
            definition_summary(validated),
        )

    def test_rejects_semantic_profile_violations(self) -> None:
        cases = []
        duplicate_role = valid_definition()
        duplicate_role["roles"][1]["id"] = "employee"
        cases.append(duplicate_role)
        reserved_id = valid_definition()
        reserved_id["primary_record"]["id"] = "system"
        cases.append(reserved_id)
        credential = valid_definition()
        credential["primary_record"]["fields"][0]["label"] = "API key: please supply"
        cases.append(credential)
        wrong_coverage = valid_definition()
        wrong_coverage["pages"][0]["actor_kinds"] = ["approver"]
        cases.append(wrong_coverage)
        for candidate in cases:
            with self.subTest(candidate=candidate), self.assertRaises(DefinitionValidationError):
                validate_definition(copy.deepcopy(candidate))

    def test_schema_enforces_profile_bounds_and_fixed_lifecycle(self) -> None:
        cases = []
        too_few_roles = valid_definition()
        too_few_roles["roles"] = too_few_roles["roles"][:1]
        cases.append(too_few_roles)
        too_many_fields = valid_definition()
        too_many_fields["primary_record"]["fields"] *= 5
        cases.append(too_many_fields)
        invalid_lifecycle = valid_definition()
        invalid_lifecycle["workflow"]["states"][-1] = "cancelled"
        cases.append(invalid_lifecycle)
        invalid_page_kind = valid_definition()
        invalid_page_kind["pages"][0]["kind"] = "list"
        cases.append(invalid_page_kind)
        additional_property = valid_definition()
        additional_property["roles"][0]["extra"] = True
        cases.append(additional_property)
        for candidate in cases:
            with self.subTest(candidate=candidate), self.assertRaises(DefinitionValidationError):
                validate_definition(candidate)

    def test_rejects_named_semantic_edges_for_fields_credentials_and_audit_coverage(self) -> None:
        duplicate_field = valid_definition()
        duplicate_field["primary_record"]["fields"].append({"id": "amount", "label": "Second amount", "type": "number", "required": False})
        reserved_field = valid_definition()
        reserved_field["primary_record"]["fields"][0]["id"] = "run"
        enum_credential = valid_definition()
        enum_credential["primary_record"]["fields"][0] = {"id": "category", "label": "Category", "type": "enum", "required": True, "options": ["Token = hidden"]}
        observer_without_coverage = valid_definition()
        observer_without_coverage["roles"].append({"id": "observer", "label": "Observer", "kind": "observer"})
        for candidate in (duplicate_field, reserved_field, enum_credential, observer_without_coverage):
            with self.subTest(candidate=candidate), self.assertRaises(DefinitionValidationError):
                validate_definition(candidate)

    def test_rejects_every_frozen_schema_boundary_and_conditional_shape(self) -> None:
        cases: dict[str, dict] = {}

        roles_too_many = valid_definition()
        roles_too_many["roles"].extend([
            {"id": "observer", "label": "Observer", "kind": "observer"},
            {"id": "auditor_two", "label": "Second auditor", "kind": "auditor"},
            {"id": "observer_two", "label": "Second observer", "kind": "observer"},
        ])
        cases["roles_max"] = roles_too_many
        duplicate_submitter = valid_definition()
        duplicate_submitter["roles"][1]["kind"] = "submitter"
        cases["submitter_cardinality"] = duplicate_submitter

        no_fields = valid_definition()
        no_fields["primary_record"]["fields"] = []
        cases["fields_min"] = no_fields
        nine_fields = valid_definition()
        nine_fields["primary_record"]["fields"] = [
            {"id": f"field_{index}", "label": f"Field {index}", "type": "string", "required": True}
            for index in range(1, 10)
        ]
        cases["fields_max"] = nine_fields

        three_pages = valid_definition()
        three_pages["pages"] = three_pages["pages"][:3]
        cases["pages_min"] = three_pages
        five_pages = valid_definition()
        five_pages["pages"].append({"id": "submit", "label": "Second submit", "kind": "form", "actor_kinds": ["submitter"]})
        cases["pages_max_and_duplicate_id"] = five_pages
        missing_required_page = valid_definition()
        missing_required_page["pages"][3]["id"] = "submit"
        missing_required_page["pages"][3]["kind"] = "form"
        missing_required_page["pages"][3]["actor_kinds"] = ["submitter"]
        cases["pages_required_ids"] = missing_required_page
        too_many_page_actors = valid_definition()
        too_many_page_actors["pages"][3]["actor_kinds"] = ["auditor", "observer", "approver"]
        cases["page_actor_max"] = too_many_page_actors
        no_page_actors = valid_definition()
        no_page_actors["pages"][0]["actor_kinds"] = []
        cases["page_actor_min"] = no_page_actors
        duplicate_page_actors = valid_definition()
        duplicate_page_actors["pages"][3]["actor_kinds"] = ["auditor", "auditor"]
        cases["page_actor_unique"] = duplicate_page_actors

        too_many_assumptions = valid_definition()
        too_many_assumptions["assumptions"] = [f"Assumption {index}" for index in range(13)]
        cases["assumptions_max"] = too_many_assumptions
        too_many_questions = valid_definition()
        too_many_questions["open_questions"] = [f"Question {index}" for index in range(13)]
        cases["open_questions_max"] = too_many_questions

        enum_without_options = valid_definition()
        enum_without_options["primary_record"]["fields"][0]["type"] = "enum"
        cases["enum_options_required"] = enum_without_options
        enum_empty_options = valid_definition()
        enum_empty_options["primary_record"]["fields"][0] = {"id": "category", "label": "Category", "type": "enum", "required": True, "options": []}
        cases["enum_options_min"] = enum_empty_options
        enum_too_many_options = valid_definition()
        enum_too_many_options["primary_record"]["fields"][0] = {"id": "category", "label": "Category", "type": "enum", "required": True, "options": [f"Option {index}" for index in range(13)]}
        cases["enum_options_max"] = enum_too_many_options
        enum_duplicate_options = valid_definition()
        enum_duplicate_options["primary_record"]["fields"][0] = {"id": "category", "label": "Category", "type": "enum", "required": True, "options": ["Duplicate", "Duplicate"]}
        cases["enum_options_unique"] = enum_duplicate_options
        options_on_string = valid_definition()
        options_on_string["primary_record"]["fields"][0]["options"] = ["Not permitted"]
        cases["non_enum_options_forbidden"] = options_on_string

        long_label = valid_definition()
        long_label["primary_record"]["label"] = "x" * 81
        cases["label_max"] = long_label
        empty_label = valid_definition()
        empty_label["primary_record"]["label"] = ""
        cases["label_min"] = empty_label
        long_statement = valid_definition()
        long_statement["assumptions"] = ["x" * 301]
        cases["statement_max"] = long_statement
        empty_statement = valid_definition()
        empty_statement["open_questions"] = [""]
        cases["statement_min"] = empty_statement
        invalid_name = valid_definition("ab")
        cases["metadata_name_pattern"] = invalid_name
        long_name = valid_definition("a" * 64)
        cases["metadata_name_max"] = long_name
        short_role_id = valid_definition()
        short_role_id["roles"][0]["id"] = "a"
        cases["id_min"] = short_role_id
        long_field_id = valid_definition()
        long_field_id["primary_record"]["fields"][0]["id"] = "a" * 64
        cases["id_max"] = long_field_id
        invalid_version = valid_definition()
        invalid_version["metadata"]["version"] = "0"
        cases["metadata_version_pattern"] = invalid_version

        for name, candidate in cases.items():
            with self.subTest(name=name), self.assertRaises(DefinitionValidationError):
                validate_definition(candidate)


if __name__ == "__main__":
    unittest.main()
