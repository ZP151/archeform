"""Bounded requirement-to-definition providers.

Providers return only a schema-valid ApplicationDefinition candidate and safe
provenance. They neither select components nor write project artifacts.
"""

from __future__ import annotations

import copy
import hashlib
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Protocol

from .application_definition import DefinitionValidationError, validate_definition


class ProviderError(RuntimeError):
    """Base class for failures that are safe to report as model_unavailable."""


class ProviderUnavailableError(ProviderError):
    """The configured local provider cannot make a request."""


class ProviderResponseError(ProviderError):
    """The provider returned a refusal or a response outside the contract."""


@dataclass(frozen=True)
class GeneratedDefinition:
    candidate: dict[str, Any]
    model: str
    reasoning_effort: str | None
    response_id: str | None
    input_tokens: int | None
    output_tokens: int | None
    elapsed_ms: int
    provider: str = "openai"

    @property
    def provenance(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "reasoning_effort": self.reasoning_effort,
            "response_id": self.response_id,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "elapsed_ms": self.elapsed_ms,
        }


class RequirementToDefinitionProvider(Protocol):
    def generate(self, name: str, brief: str) -> GeneratedDefinition:
        """Generate a locally validated definition without retaining the brief."""


def _schema() -> dict[str, Any]:
    schema_path = Path(__file__).resolve().parents[2] / "docs" / "contracts" / "application-definition-v1.schema.json"
    try:
        return json.loads(schema_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ProviderUnavailableError("the frozen application-definition schema is unavailable") from error


_OPENAI_UNSUPPORTED_SCHEMA_KEYWORDS = frozenset({
    "$id",
    "$schema",
    "allOf",
    "dependentRequired",
    "dependentSchemas",
    "else",
    "if",
    "not",
    "then",
    "uniqueItems",
})


def _nullable_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Make an optional local property required-but-nullable for generation."""
    result = copy.deepcopy(schema)
    schema_type = result.get("type")
    if isinstance(schema_type, str):
        result["type"] = [schema_type, "null"]
        return result
    if isinstance(schema_type, list):
        if "null" not in schema_type:
            result["type"] = [*schema_type, "null"]
        return result
    return {"anyOf": [result, {"type": "null"}]}


def _json_type_for_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    if isinstance(value, (int, float)):
        return "number"
    raise ProviderUnavailableError("the frozen application-definition schema contains an unsupported literal")


def _transport_schema_for_literal(value: Any) -> dict[str, Any]:
    literal_type = _json_type_for_literal(value)
    if literal_type == "array":
        items = value
        if not items:
            return {"type": "array", "items": {"type": "string"}}
        item_types = {_json_type_for_literal(item) for item in items}
        if len(item_types) != 1:
            raise ProviderUnavailableError("the frozen application-definition schema contains mixed literal array types")
        return {"type": "array", "items": _transport_schema_for_literal(items[0])}
    if literal_type == "object":
        return {
            "type": "object",
            "properties": {key: _transport_schema_for_literal(item) for key, item in value.items()},
            "required": list(value),
            "additionalProperties": False,
        }
    return {"type": literal_type}


def _project_openai_schema(node: Any) -> Any:
    if isinstance(node, list):
        return [_project_openai_schema(item) for item in node]
    if not isinstance(node, dict):
        return copy.deepcopy(node)

    projected = {
        key: _project_openai_schema(value)
        for key, value in node.items()
        if key not in _OPENAI_UNSUPPORTED_SCHEMA_KEYWORDS
    }
    if "const" in projected and isinstance(projected["const"], (list, dict)):
        projected = _transport_schema_for_literal(projected["const"])
    if "type" not in projected and "const" in projected:
        projected["type"] = _json_type_for_literal(projected["const"])
    if "type" not in projected and isinstance(projected.get("enum"), list) and projected["enum"]:
        enum_types = {_json_type_for_literal(value) for value in projected["enum"]}
        if len(enum_types) == 1:
            projected["type"] = enum_types.pop()
    if node.get("type") == "object" and isinstance(node.get("properties"), dict):
        locally_required = set(node.get("required", []))
        properties = projected["properties"]
        for name in properties:
            if name not in locally_required:
                properties[name] = _nullable_schema(properties[name])
        projected["required"] = list(properties)
        projected["additionalProperties"] = False
    return projected


def _openai_generation_schema() -> dict[str, Any]:
    """Derive the strict Structured Outputs transport schema from local policy."""
    return _project_openai_schema(_schema())


def _normalize_openai_candidate(value: Any) -> Any:
    """Remove transport-only null placeholders before frozen policy validation."""
    candidate = copy.deepcopy(value)
    if not isinstance(candidate, dict):
        return candidate
    primary_record = candidate.get("primary_record")
    if not isinstance(primary_record, dict):
        return candidate
    fields = primary_record.get("fields")
    if not isinstance(fields, list):
        return candidate
    for field in fields:
        if isinstance(field, dict) and field.get("options") is None:
            field.pop("options", None)
    return candidate


def _record_for_brief(name: str, brief: str) -> tuple[str, str, list[dict[str, Any]], str, str]:
    text = brief.lower()
    if "expense" in text:
        return (
            "expense_claim", "Expense claim",
            [{"id": "amount", "label": "Amount", "type": "number", "required": True}, {"id": "description", "label": "Description", "type": "string", "required": True}],
            "Employee", "Manager",
        )
    if "equipment" in text or "access" in text:
        return (
            "equipment_access_request", "Equipment access request",
            [{"id": "equipment_name", "label": "Equipment name", "type": "string", "required": True}, {"id": "access_date", "label": "Access date", "type": "date", "required": True}],
            "Requester", "Security approver",
        )
    return (
        "leave_request", "Leave request",
        [{"id": "start_date", "label": "Start date", "type": "date", "required": True}, {"id": "end_date", "label": "End date", "type": "date", "required": True}, {"id": "reason", "label": "Reason", "type": "string", "required": True}],
        "Employee", "Manager",
    )


def _fixture_definition(name: str, brief: str) -> dict[str, Any]:
    record_id, record_label, fields, submitter_label, approver_label = _record_for_brief(name, brief)
    return {
        "apiVersion": "factory/v1",
        "kind": "ApplicationDefinition",
        "metadata": {"name": name, "version": "1"},
        "profile": "internal-approval-app",
        "roles": [
            {"id": "requester", "label": submitter_label, "kind": "submitter"},
            {"id": "approver", "label": approver_label, "kind": "approver"},
            {"id": "auditor", "label": "Auditor", "kind": "auditor"},
        ],
        "primary_record": {"id": record_id, "label": record_label, "fields": fields},
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
            {"id": "submit", "label": f"Submit {record_label.lower()}", "kind": "form", "actor_kinds": ["submitter"]},
            {"id": "my_records", "label": f"My {record_label.lower()}s", "kind": "list", "actor_kinds": ["submitter"]},
            {"id": "approval_queue", "label": "Approval queue", "kind": "queue", "actor_kinds": ["approver"]},
            {"id": "audit", "label": "Audit history", "kind": "audit", "actor_kinds": ["auditor"]},
        ],
        "non_functional": {"audit_log": True, "persistence": "postgresql", "ui": "responsive_web"},
        "assumptions": ["Approver assignment is static in the local preview."],
        "open_questions": [],
    }


class FixtureRequirementToDefinitionProvider:
    """Deterministic test double; production wiring never selects it implicitly."""

    def generate(self, name: str, brief: str) -> GeneratedDefinition:
        started = time.perf_counter()
        candidate = validate_definition(_fixture_definition(name, brief))
        response_id = "fixture_" + hashlib.sha256((name + "\0" + brief).encode("utf-8")).hexdigest()[:32]
        return GeneratedDefinition(
            candidate=candidate,
            model="fixture-v1",
            reasoning_effort=None,
            response_id=response_id,
            input_tokens=None,
            output_tokens=None,
            elapsed_ms=max(0, round((time.perf_counter() - started) * 1000)),
            provider="fixture",
        )


class OpenAIRequirementToDefinitionProvider:
    """OpenAI Responses API adapter constrained to the frozen JSON schema."""

    def __init__(self, *, api_key: str | None = None, client_factory: Callable[..., Any] | None = None) -> None:
        self._api_key = api_key if api_key is not None else os.environ.get("OPENAI_API_KEY")
        self.model = os.environ.get("FACTORY_OPENAI_MODEL", "gpt-5.6-terra")
        self._client_factory = client_factory

    def _client(self) -> Any:
        if not self._api_key:
            raise ProviderUnavailableError("OPENAI_API_KEY is not configured")
        if self._client_factory is not None:
            return self._client_factory(api_key=self._api_key)
        try:
            from openai import OpenAI
        except ImportError as error:
            raise ProviderUnavailableError("the OpenAI client dependency is unavailable") from error
        return OpenAI(api_key=self._api_key)

    @staticmethod
    def _instructions() -> str:
        return (
            "Convert the English brief into exactly one Factory Pilot internal approval application definition. "
            "Return only JSON matching the supplied schema. Support one submitter, one approver, optional auditor or observer roles, "
            "one primary record, and the fixed submit/approve/reject lifecycle. Do not write code, select a technology stack, call tools, "
            "or choose components. Use English labels and assumptions. Put unmet business details in open_questions."
        )

    def generate(self, name: str, brief: str) -> GeneratedDefinition:
        started = time.perf_counter()
        try:
            response = self._client().responses.create(
                model=self.model,
                instructions=self._instructions(),
                input=f"Project name: {name}\nBrief:\n{brief}",
                reasoning={"effort": "medium"},
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "application_definition",
                        "strict": True,
                        "schema": _openai_generation_schema(),
                    }
                },
            )
            if getattr(response, "refusal", None):
                raise ProviderResponseError("the model refused to produce an application definition")
            output_text = getattr(response, "output_text", None)
            if not isinstance(output_text, str) or not output_text.strip():
                raise ProviderResponseError("the model returned no structured definition")
            candidate = _normalize_openai_candidate(json.loads(output_text))
            candidate = validate_definition(candidate)
        except ProviderError:
            raise
        except (json.JSONDecodeError, DefinitionValidationError) as error:
            raise ProviderResponseError("the model returned an invalid application definition") from error
        except Exception as error:  # SDK exposes multiple transport/refusal exception types.
            raise ProviderUnavailableError("the model provider is unavailable") from error

        usage = getattr(response, "usage", None)
        return GeneratedDefinition(
            candidate=candidate,
            model=self.model,
            reasoning_effort="medium",
            response_id=getattr(response, "id", None),
            input_tokens=getattr(usage, "input_tokens", None),
            output_tokens=getattr(usage, "output_tokens", None),
            elapsed_ms=max(0, round((time.perf_counter() - started) * 1000)),
        )
