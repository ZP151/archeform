from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

from apps.api.application_definition import DefinitionValidationError, validate_definition
from apps.api.control_plane import ControlPlane, ControlPlaneError
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider


EVAL_CORPUS = Path(__file__).resolve().parents[1] / "evals" / "approval_app_briefs.json"


def _mutate(candidate: dict, mutation: dict[str, object]) -> dict:
    value = copy.deepcopy(candidate)
    kind = mutation["kind"]
    if kind == "unsupported_profile":
        value["profile"] = "arbitrary-software-platform"
    elif kind == "credential_assignment":
        value["primary_record"]["fields"][0]["label"] = "API key=do-not-store"
    elif kind == "extra_workflow_state":
        value["workflow"]["states"].append("escalated")
    elif kind == "reserved_field_identifier":
        value["primary_record"]["fields"][0]["id"] = "system"
    elif kind == "invalid_audit_coverage":
        value["pages"][3]["actor_kinds"] = ["submitter"]
    elif kind == "missing_required_field":
        value["primary_record"]["fields"] = []
    else:
        raise AssertionError(f"unknown evaluation mutation: {kind}")
    return value


class ApprovalAppBriefEvaluationTests(unittest.TestCase):
    def test_valid_cases_create_approved_definitions_and_exact_golden_component_plans(self) -> None:
        corpus = json.loads(EVAL_CORPUS.read_text(encoding="utf-8"))
        self.assertEqual(1, corpus["fixture_version"])
        cases = corpus["cases"]
        self.assertGreaterEqual(len(cases), 10)

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            plane = ControlPlane(
                root / "state.json",
                root / "runs",
                provider=FixtureRequirementToDefinitionProvider(),
            )
            for case in cases:
                if case["expected"]["semantic_outcome"] != "valid":
                    continue
                with self.subTest(case=case["id"]):
                    expected = case["expected"]
                    created = plane.create_project(case["project_name"], case["brief"])
                    definition = created["version"]["definition"]
                    self.assertEqual(expected["profile"], definition["profile"])
                    self.assertEqual(expected["definition"], {
                        "role_kinds": [role["kind"] for role in definition["roles"]],
                        "primary_record": {
                            "id": definition["primary_record"]["id"],
                            "label": definition["primary_record"]["label"],
                            "fields": [
                                {key: field[key] for key in ("id", "type", "required")}
                                for field in definition["primary_record"]["fields"]
                            ],
                        },
                        "page_kinds": [page["kind"] for page in definition["pages"]],
                    })
                    self.assertNotIn(case["brief"], json.dumps(plane._state))
                    approved = plane.approve_version(created["version"]["id"], "founder")
                    plan = plane.create_plan_for_version(approved["id"])
                    self.assertEqual(expected["component_keys"], [component["key"] for component in plan["components"]])

    def test_invalid_cases_are_rejected_without_creating_a_plan(self) -> None:
        corpus = json.loads(EVAL_CORPUS.read_text(encoding="utf-8"))
        invalid_cases = [case for case in corpus["cases"] if case["expected"]["semantic_outcome"] != "valid"]
        self.assertGreaterEqual(len(invalid_cases), 2)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            plane = ControlPlane(
                root / "state.json",
                root / "runs",
                provider=FixtureRequirementToDefinitionProvider(),
            )
            for case in invalid_cases:
                with self.subTest(case=case["id"]):
                    expected = case["expected"]
                    if expected["semantic_outcome"] == "credential_like_text_rejected":
                        projects_before = json.loads(json.dumps(plane._state["projects"]))
                        plans_before = json.loads(json.dumps(plane._state["plans"]))
                        with self.assertRaises(ControlPlaneError) as rejected:
                            plane.create_project(case["project_name"], case["brief"])
                        self.assertEqual((422, "invalid_brief"), (rejected.exception.status, rejected.exception.code))
                        self.assertEqual(projects_before, plane._state["projects"])
                        self.assertEqual(plans_before, plane._state["plans"])
                        continue

                    created = plane.create_project("evaluation-baseline", "Employees submit leave requests and managers approve them.")
                    candidate = _mutate(created["version"]["definition"], case["definition_mutation"])
                    with self.assertRaises(ControlPlaneError) as rejected:
                        plane.create_version(created["project"]["id"], created["version"]["id"], candidate)
                    self.assertEqual((422, "invalid_definition"), (rejected.exception.status, rejected.exception.code))
                    self.assertEqual([], plane.get_project(created["project"]["id"])["plans"])


if __name__ == "__main__":
    unittest.main()
