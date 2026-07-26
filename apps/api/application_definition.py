"""Validation and stable helpers for the frozen ApplicationDefinition contract."""

from __future__ import annotations

import copy
import hashlib
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


RESERVED_IDENTIFIERS = frozenset({
    "id", "status", "created_at", "updated_at", "deleted_at", "actor", "role",
    "admin", "root", "system", "api", "metadata", "workflow", "page", "plan", "run",
})
CREDENTIAL_ASSIGNMENT_PATTERN = re.compile(
    r"(?:api[_ -]?key|secret|password|token|private[_ -]?key)\s*[:=]", re.IGNORECASE
)


class DefinitionValidationError(ValueError):
    """Raised when a value does not meet the frozen application-definition contract."""


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


@lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    schema_path = Path(__file__).resolve().parents[2] / "docs" / "contracts" / "application-definition-v1.schema.json"
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("the frozen application-definition schema is unavailable") from error
    return Draft202012Validator(schema)


def _reject_schema(value: Any) -> None:
    errors = sorted(_validator().iter_errors(value), key=lambda error: list(error.absolute_path))
    if errors:
        error = errors[0]
        path = ".".join(str(part) for part in error.absolute_path) or "definition"
        raise DefinitionValidationError(f"{path}: {error.message}")


def _reject_duplicate_or_reserved_ids(value: dict[str, Any]) -> None:
    id_groups = (value["roles"], value["primary_record"]["fields"])
    for records in id_groups:
        identifiers = [record["id"] for record in records]
        if len(identifiers) != len(set(identifiers)):
            raise DefinitionValidationError("role and field identifiers must be unique within their collections")
        if any(identifier in RESERVED_IDENTIFIERS for identifier in identifiers):
            raise DefinitionValidationError("role and field identifiers must not use reserved identifiers")
    if value["primary_record"]["id"] in RESERVED_IDENTIFIERS:
        raise DefinitionValidationError("primary-record identifier must not use a reserved identifier")


def _reject_credential_like_text(value: dict[str, Any]) -> None:
    strings: list[str] = []
    strings.extend(role["label"] for role in value["roles"])
    strings.append(value["primary_record"]["label"])
    for field in value["primary_record"]["fields"]:
        strings.append(field["label"])
        strings.extend(field.get("options", []))
    strings.extend(page["label"] for page in value["pages"])
    strings.extend(value["assumptions"])
    strings.extend(value["open_questions"])
    if any(CREDENTIAL_ASSIGNMENT_PATTERN.search(text) for text in strings):
        raise DefinitionValidationError("labels, statements, and enum options must not contain credential assignments")


def _reject_invalid_page_coverage(value: dict[str, Any]) -> None:
    page_by_id = {page["id"]: page for page in value["pages"]}
    expected = {
        "submit": ["submitter"],
        "my_records": ["submitter"],
        "approval_queue": ["approver"],
    }
    for page_id, actor_kinds in expected.items():
        if page_by_id[page_id]["actor_kinds"] != actor_kinds:
            raise DefinitionValidationError(f"{page_id} page has invalid actor coverage")

    role_kinds = [role["kind"] for role in value["roles"]]
    audit_kinds = [kind for kind in ("auditor", "observer") if kind in role_kinds] or ["approver"]
    if page_by_id["audit"]["actor_kinds"] != audit_kinds:
        raise DefinitionValidationError("audit page has invalid actor coverage")
    for actor_kind in page_by_id["audit"]["actor_kinds"]:
        if actor_kind not in role_kinds:
            raise DefinitionValidationError("every page actor kind must be represented by a role")


def validate_definition(value: dict[str, Any]) -> dict[str, Any]:
    """Validate and return an independent, canonical application-definition value."""
    _reject_schema(value)
    copied = copy.deepcopy(value)
    _reject_duplicate_or_reserved_ids(copied)
    _reject_credential_like_text(copied)
    _reject_invalid_page_coverage(copied)
    return copied


def definition_checksum(value: dict[str, Any]) -> str:
    """Return the SHA-256 of canonical JSON for an already validated definition."""
    return "sha256:" + hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def definition_summary(value: dict[str, Any]) -> dict[str, Any]:
    """Return a compact display-safe summary without copying the definition body."""
    return {
        "name": value["metadata"]["name"],
        "version": value["metadata"]["version"],
        "roles": len(value["roles"]),
        "fields": len(value["primary_record"]["fields"]),
        "pages": len(value["pages"]),
    }
