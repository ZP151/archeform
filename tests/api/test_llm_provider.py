from __future__ import annotations

import json
import os
import unittest
from unittest.mock import patch

from jsonschema import Draft202012Validator

from apps.api.llm_provider import (
    FixtureRequirementToDefinitionProvider,
    OpenAIRequirementToDefinitionProvider,
    ProviderResponseError,
    ProviderUnavailableError,
    _openai_generation_schema,
    _schema,
)


class RequirementToDefinitionProviderTests(unittest.TestCase):
    def test_openai_generation_schema_is_a_deterministic_strict_compatible_projection(self) -> None:
        frozen_before = _schema()
        first = _openai_generation_schema()
        second = _openai_generation_schema()

        self.assertEqual(first, second)
        self.assertEqual(frozen_before, _schema())
        self.assertIn("allOf", frozen_before["properties"]["roles"])

        unsupported = {"allOf", "if", "then", "else", "not"}

        def assert_compatible(node: object, path: str = "schema") -> None:
            if isinstance(node, dict):
                self.assertFalse(unsupported.intersection(node), path)
                if node.get("type") == "object":
                    properties = node.get("properties")
                    self.assertIsInstance(properties, dict, path)
                    self.assertEqual(False, node.get("additionalProperties"), path)
                    self.assertEqual(set(properties), set(node.get("required", [])), path)
                for key, value in node.items():
                    assert_compatible(value, f"{path}.{key}")
            elif isinstance(node, list):
                for index, value in enumerate(node):
                    assert_compatible(value, f"{path}[{index}]")

        assert_compatible(first)
        self.assertEqual(
            ["array", "null"],
            first["$defs"]["field"]["properties"]["options"]["type"],
        )
        self.assertEqual("string", first["properties"]["apiVersion"]["type"])
        self.assertEqual("string", first["properties"]["kind"]["type"])
        self.assertEqual("string", first["properties"]["profile"]["type"])
        self.assertEqual("string", first["properties"]["workflow"]["properties"]["id"]["type"])
        states = first["properties"]["workflow"]["properties"]["states"]
        self.assertEqual("array", states["type"])
        self.assertNotIn("const", states)
        self.assertEqual("string", states["items"]["type"])
        transitions = first["properties"]["workflow"]["properties"]["transitions"]
        self.assertEqual("array", transitions["type"])
        self.assertNotIn("const", transitions)
        self.assertEqual("object", transitions["items"]["type"])
        self.assertEqual(
            {"from", "to", "action", "actor_kind"},
            set(transitions["items"]["required"]),
        )
        self.assertEqual("boolean", first["properties"]["non_functional"]["properties"]["audit_log"]["type"])

    def test_fixture_provider_generates_distinct_valid_approval_definitions(self) -> None:
        provider = FixtureRequirementToDefinitionProvider()
        generated = [
            provider.generate("leave-approval", "Employees submit leave requests and managers approve them."),
            provider.generate("expense-approval", "Employees submit expense claims and managers approve them."),
            provider.generate("equipment-access", "Staff request access to equipment and security approves it."),
        ]
        self.assertEqual(["leave_request", "expense_claim", "equipment_access_request"], [item.candidate["primary_record"]["id"] for item in generated])
        self.assertTrue(all(item.provenance["provider"] == "fixture" for item in generated))
        self.assertTrue(all("brief" not in item.provenance for item in generated))

    def test_openai_provider_without_local_key_is_typed_unavailable_failure(self) -> None:
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
            provider = OpenAIRequirementToDefinitionProvider()
            with self.assertRaises(ProviderUnavailableError):
                provider.generate("expense-approval", "Employees submit expense claims.")

    def test_openai_adapter_uses_strict_schema_and_rejects_invalid_output_without_network(self) -> None:
        class Response:
            id = "resp_fixture"
            output_text = '{"not":"a definition"}'
            usage = type("Usage", (), {"input_tokens": 3, "output_tokens": 4})()

        class Responses:
            def __init__(self) -> None:
                self.kwargs = None

            def create(self, **kwargs: object) -> Response:
                self.kwargs = kwargs
                return Response()

        responses = Responses()
        client = type("Client", (), {"responses": responses})()
        provider = OpenAIRequirementToDefinitionProvider(api_key="test-only", client_factory=lambda **_kwargs: client)
        with self.assertRaises(ProviderResponseError):
            provider.generate("expense-approval", "Employees submit expense claims.")
        self.assertEqual("gpt-5.6-terra", responses.kwargs["model"])
        self.assertEqual({"effort": "medium"}, responses.kwargs["reasoning"])
        self.assertTrue(responses.kwargs["text"]["format"]["strict"])
        self.assertEqual(_openai_generation_schema(), responses.kwargs["text"]["format"]["schema"])

    def test_openai_adapter_removes_nullable_transport_placeholders_before_local_validation(self) -> None:
        expected = FixtureRequirementToDefinitionProvider().generate(
            "expense-approval",
            "Employees submit expense claims.",
        ).candidate
        transport_candidate = json.loads(json.dumps(expected))
        for field in transport_candidate["primary_record"]["fields"]:
            field["options"] = None

        class Response:
            id = "resp_nullable"
            output_text = json.dumps(transport_candidate)
            usage = None

        class Responses:
            def create(self, **_kwargs: object) -> Response:
                return Response()

        client = type("Client", (), {"responses": Responses()})()
        generated = OpenAIRequirementToDefinitionProvider(
            api_key="test-only",
            client_factory=lambda **_kwargs: client,
        ).generate("expense-approval", "Employees submit expense claims.")

        self.assertEqual(expected, generated.candidate)
        self.assertTrue(all("options" not in field for field in generated.candidate["primary_record"]["fields"]))

    def test_openai_adapter_applies_frozen_policy_after_transport_schema_accepts_candidate(self) -> None:
        candidate = FixtureRequirementToDefinitionProvider().generate(
            "expense-approval",
            "Employees submit expense claims.",
        ).candidate
        candidate["roles"][1]["kind"] = "submitter"
        for field in candidate["primary_record"]["fields"]:
            field["options"] = None

        self.assertEqual([], list(Draft202012Validator(_openai_generation_schema()).iter_errors(candidate)))

        class Response:
            id = "resp_policy_violation"
            output_text = json.dumps(candidate)
            usage = None

        class Responses:
            def create(self, **_kwargs: object) -> Response:
                return Response()

        client = type("Client", (), {"responses": Responses()})()
        with self.assertRaises(ProviderResponseError):
            OpenAIRequirementToDefinitionProvider(
                api_key="test-only",
                client_factory=lambda **_kwargs: client,
            ).generate("expense-approval", "Employees submit expense claims.")

    def test_openai_provider_maps_timeout_to_unavailable(self) -> None:
        class Responses:
            def create(self, **_kwargs: object) -> object:
                raise TimeoutError("timed out")

        client = type("Client", (), {"responses": Responses()})()
        provider = OpenAIRequirementToDefinitionProvider(api_key="test-only", client_factory=lambda **_kwargs: client)
        with self.assertRaises(ProviderUnavailableError):
            provider.generate("expense-approval", "Employees submit expense claims.")

    def test_openai_provider_rejects_empty_malformed_and_semantically_invalid_output(self) -> None:
        class Response:
            id = "resp_fixture"
            usage = None

            def __init__(self, output_text: str) -> None:
                self.output_text = output_text

        class Responses:
            def __init__(self, output_text: str) -> None:
                self.output_text = output_text

            def create(self, **_kwargs: object) -> Response:
                return Response(self.output_text)

        fixture = FixtureRequirementToDefinitionProvider().generate("expense-approval", "Employees submit expense claims.").candidate
        invalid_semantic = json.loads(json.dumps(fixture))
        invalid_semantic["roles"][0]["id"] = "system"
        for output_text in ("", "not-json", json.dumps(invalid_semantic)):
            with self.subTest(output_text=output_text), self.assertRaises(ProviderResponseError):
                client = type("Client", (), {"responses": Responses(output_text)})()
                OpenAIRequirementToDefinitionProvider(api_key="test-only", client_factory=lambda **_kwargs: client).generate("expense-approval", "Employees submit expense claims.")

    def test_openai_provider_rejects_explicit_refusal_even_when_output_text_exists(self) -> None:
        candidate = FixtureRequirementToDefinitionProvider().generate("expense-approval", "Employees submit expense claims.").candidate

        class Response:
            id = "resp_refusal"
            output_text = json.dumps(candidate)
            refusal = "I cannot provide that."
            usage = None

        class Responses:
            def create(self, **_kwargs: object) -> Response:
                return Response()

        client = type("Client", (), {"responses": Responses()})()
        with self.assertRaises(ProviderResponseError):
            OpenAIRequirementToDefinitionProvider(api_key="test-only", client_factory=lambda **_kwargs: client).generate("expense-approval", "Employees submit expense claims.")

    def test_openai_provider_returns_safe_provenance_for_valid_structured_response(self) -> None:
        candidate = FixtureRequirementToDefinitionProvider().generate("expense-approval", "Employees submit expense claims.").candidate

        class Response:
            id = "resp_safe"
            output_text = json.dumps(candidate)
            usage = type("Usage", (), {"input_tokens": 7, "output_tokens": 11})()

        class Responses:
            def create(self, **_kwargs: object) -> Response:
                return Response()

        client = type("Client", (), {"responses": Responses()})()
        generated = OpenAIRequirementToDefinitionProvider(api_key="test-only", client_factory=lambda **_kwargs: client).generate("expense-approval", "Employees submit expense claims.")
        self.assertEqual({
            "provider": "openai", "model": "gpt-5.6-terra", "reasoning_effort": "medium", "response_id": "resp_safe",
            "input_tokens": 7, "output_tokens": 11, "elapsed_ms": generated.elapsed_ms,
        }, generated.provenance)
        self.assertNotIn("brief", generated.provenance)


if __name__ == "__main__":
    unittest.main()
