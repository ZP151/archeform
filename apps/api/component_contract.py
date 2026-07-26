"""Validation helpers for the frozen first-party component contracts.

This module validates only local contract artifacts. It does not discover
packages, select components, render templates, or write generated output.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import stat
from functools import lru_cache
from pathlib import Path, PurePosixPath
from typing import Any, Iterable

from jsonschema import Draft202012Validator, SchemaError


ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = ROOT / "docs" / "contracts"
EXCLUSIVE_SLOT_OWNER = {
    "frontend/features/audit": "ui.app-shell",
    "backend/audit": "ops.audit-log",
    "data/audit-schema": "ops.audit-log",
}
WINDOWS_RESERVED_BASENAMES = frozenset({
    "con", "prn", "aux", "nul",
    *(f"com{number}" for number in range(1, 10)),
    *(f"lpt{number}" for number in range(1, 10)),
})
PLACEHOLDER_PATTERN = re.compile(
    r"\{\{(python_string|json_value|typescript_string|tsx_text):([a-z][a-z0-9_]{0,62})\}\}"
)


class ComponentContractError(ValueError):
    """Raised when a component package or composition plan violates v1."""


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


@lru_cache(maxsize=None)
def _schema(name: str) -> dict[str, Any]:
    try:
        return json.loads((CONTRACTS / name).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"the frozen component contract schema {name} is unavailable") from error


@lru_cache(maxsize=None)
def _validator(name: str) -> Draft202012Validator:
    schema = _schema(name)
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError as error:
        raise RuntimeError(f"the frozen component contract schema {name} is invalid") from error
    return Draft202012Validator(schema)


def _reject_schema(value: Any, schema_name: str) -> None:
    errors = sorted(_validator(schema_name).iter_errors(value), key=lambda error: list(error.absolute_path))
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.absolute_path) or "document"
        raise ComponentContractError(f"{location}: {error.message}")


def _read_json(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ComponentContractError(f"{label} is unavailable or invalid JSON") from error
    if not isinstance(value, dict):
        raise ComponentContractError(f"{label} must be a JSON object")
    return value


def _is_reparse_point(path: Path) -> bool:
    if path.is_symlink() or getattr(os.path, "isjunction", lambda _: False)(str(path)):
        return True
    try:
        attributes = path.stat(follow_symlinks=False).st_file_attributes
    except (AttributeError, OSError):
        return False
    return bool(attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def _relative_path(value: str, label: str) -> PurePosixPath:
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise ComponentContractError(f"{label} must be a normalized relative POSIX path")
    candidate = PurePosixPath(value)
    raw_parts = value.split("/")
    if candidate.is_absolute() or any(part in {"", ".", ".."} for part in raw_parts):
        raise ComponentContractError(f"{label} escapes its declared root")
    for part in raw_parts:
        if part != part.rstrip(". "):
            raise ComponentContractError(f"{label} contains a trailing Windows-unsafe path segment")
        basename = part.split(".", 1)[0].rstrip(". ").casefold()
        if basename in WINDOWS_RESERVED_BASENAMES:
            raise ComponentContractError(f"{label} contains a reserved Windows device basename")
    return candidate


def _contained_path(root: Path, relative: str, label: str) -> Path:
    rel = _relative_path(relative, label)
    try:
        root_resolved = root.resolve(strict=True)
        candidate = (root / Path(*rel.parts)).resolve(strict=True)
        candidate.relative_to(root_resolved)
    except (OSError, ValueError) as error:
        raise ComponentContractError(f"{label} escapes its declared root") from error
    if _is_reparse_point(candidate):
        raise ComponentContractError(f"{label} may not reference a symlink or junction")
    return candidate


def _package_files(root: Path) -> set[str]:
    if not root.is_dir() or _is_reparse_point(root):
        raise ComponentContractError("package root must be a contained non-link directory")
    files: set[str] = set()
    for current, directories, filenames in os.walk(root, followlinks=False):
        current_path = Path(current)
        for directory in list(directories):
            path = current_path / directory
            if _is_reparse_point(path):
                raise ComponentContractError("package inventory may not traverse a symlink or junction")
        for filename in filenames:
            path = current_path / filename
            if _is_reparse_point(path):
                raise ComponentContractError("package inventory may not include a symlink or junction")
            if not path.is_file():
                raise ComponentContractError("package inventory contains a non-regular file")
            relative = path.relative_to(root).as_posix()
            if relative != "component.json":
                files.add(relative)
    return files


def _manifest_projection(manifest: dict[str, Any]) -> bytes:
    """Return the canonical self-description that a package digest binds."""
    projection = {key: value for key, value in manifest.items() if key != "digest"}
    return _canonical(projection).encode("utf-8")


def _digest_bytes(root: Path, manifest: dict[str, Any]) -> str:
    digest = hashlib.sha256()
    digest.update(b"factory-component-digest/v1\0")
    projection = _manifest_projection(manifest)
    digest.update(b"component.json")
    digest.update(b"\0")
    digest.update(len(projection).to_bytes(8, "big"))
    digest.update(projection)
    for item in sorted(manifest["inventory"], key=lambda entry: entry["path"]):
        path = _contained_path(root, item["path"], f"inventory path {item['path']}")
        data = path.read_bytes()
        encoded_path = item["path"].encode("utf-8")
        digest.update(encoded_path)
        digest.update(b"\0")
        digest.update(len(data).to_bytes(8, "big"))
        digest.update(data)
    return "sha256:" + digest.hexdigest()


def calculate_package_digest(package_root: Path, manifest: dict[str, Any]) -> str:
    """Return the v1 digest over a manifest projection and its package inventory."""
    return _digest_bytes(package_root, manifest)


def _reject_inventory(root: Path, manifest: dict[str, Any]) -> None:
    inventory = manifest["inventory"]
    paths = [item["path"] for item in inventory]
    for path in paths:
        _relative_path(path, f"inventory path {path}")
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        raise ComponentContractError("inventory paths must be unique and lexicographically sorted")
    if "component.json" in paths:
        raise ComponentContractError("component.json must not be included in its self-describing inventory")
    actual_paths = _package_files(root)
    if set(paths) != actual_paths:
        raise ComponentContractError("inventory must contain every and only package file except component.json")
    for item in inventory:
        path = _contained_path(root, item["path"], f"inventory path {item['path']}")
        file_digest = "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()
        if item["sha256"] != file_digest:
            raise ComponentContractError(f"inventory hash mismatch for {item['path']}")
    calculated = _digest_bytes(root, manifest)
    if manifest["digest"] != calculated:
        raise ComponentContractError("component digest is noncanonical or does not match the declared inventory")


def _reject_dependencies(manifest: dict[str, Any], available_identities: set[tuple[str, str]] | None) -> None:
    identities = [(entry["key"], entry["version"]) for entry in manifest["requires"]]
    if len(identities) != len(set(identities)):
        raise ComponentContractError("component dependencies must be unique by key and version")
    if (manifest["key"], manifest["version"]) in identities:
        raise ComponentContractError("a component may not depend on itself")
    if available_identities is not None:
        missing = [identity for identity in identities if identity not in available_identities]
        if missing:
            raise ComponentContractError("component declares an unavailable dependency")


def _reject_unverified_golden_component(manifest: dict[str, Any]) -> None:
    if manifest["lifecycle"] == "golden" and manifest["verification"]["status"] != "passed":
        raise ComponentContractError("a golden component must have passing verification evidence")


def _reject_package_directory_identity(root: Path, manifest: dict[str, Any], approved_package_root: Path | None) -> None:
    if approved_package_root is None:
        return
    try:
        approved_path = Path(approved_package_root).absolute()
        package_path = Path(root).absolute()
        lexical_relative = package_path.relative_to(approved_path)
        if lexical_relative.parts != (manifest["key"], manifest["version"]):
            raise ComponentContractError("package directory identity must match its manifest key and version")
        approved_segments = [approved_path]
        current = approved_path
        for part in lexical_relative.parts:
            current = current / part
            approved_segments.append(current)
        if any(_is_reparse_point(segment) for segment in approved_segments):
            raise ComponentContractError("approved package root path may not contain a symlink or junction")
        approved_root = approved_path.resolve(strict=True)
        actual_root = package_path.resolve(strict=True)
        actual_root.relative_to(approved_root)
    except (OSError, ValueError) as error:
        raise ComponentContractError("package directory escapes the approved package root") from error
    except ComponentContractError:
        raise


def _reject_adapter(root: Path, manifest: dict[str, Any], adapter: dict[str, Any]) -> None:
    _reject_schema(adapter, "factory-component-adapter-v1.schema.json")
    if (adapter["component_key"], adapter["component_version"]) != (manifest["key"], manifest["version"]):
        raise ComponentContractError("adapter identity must match component identity")
    for slot in manifest["output_slots"]:
        if slot in EXCLUSIVE_SLOT_OWNER and manifest["key"] != EXCLUSIVE_SLOT_OWNER[slot]:
            raise ComponentContractError("component declares an output slot reserved for another component")
    input_properties = manifest["input_schema"].get("properties", {})
    destinations: set[tuple[str, str]] = set()
    for contribution in adapter["contributions"]:
        slot = contribution["slot"]
        if slot not in manifest["output_slots"]:
            raise ComponentContractError("adapter contribution targets an undeclared output slot")
        if slot in EXCLUSIVE_SLOT_OWNER and manifest["key"] != EXCLUSIVE_SLOT_OWNER[slot]:
            raise ComponentContractError("adapter contribution violates the frozen output-slot ownership policy")
        target = str(_relative_path(contribution["target"], "adapter target"))
        destination = (slot, target.casefold())
        if destination in destinations:
            raise ComponentContractError("adapter contributions may not overwrite one another")
        destinations.add(destination)
        source = _contained_path(root, contribution["source"], "adapter source")
        templates_root = _contained_path(root, "templates", "templates root")
        try:
            source.relative_to(templates_root)
        except ValueError as error:
            raise ComponentContractError("adapter source must be contained in templates") from error
        if not source.is_file():
            raise ComponentContractError("adapter source must be a regular template file")
        try:
            template_text = source.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as error:
            raise ComponentContractError("adapter source must be UTF-8 text") from error
        _validate_template_placeholders(template_text, contribution["bindings"])
        for binding in contribution["bindings"].values():
            input_name = binding["source"].removeprefix("input.")
            if input_name not in input_properties:
                raise ComponentContractError("adapter binding references an undeclared input")


def _validate_template_placeholders(template_text: str, bindings: dict[str, Any]) -> list[tuple[re.Match[str], str, str]]:
    if not isinstance(template_text, str) or not isinstance(bindings, dict):
        raise ComponentContractError("template text and bindings must be declarative values")
    placeholders = list(PLACEHOLDER_PATTERN.finditer(template_text))
    without_valid = PLACEHOLDER_PATTERN.sub("", template_text)
    if "{{" in without_valid or "}}" in without_valid:
        raise ComponentContractError("template contains an unmarked or malformed placeholder")
    used_names = {match.group(2) for match in placeholders}
    if used_names != set(bindings):
        raise ComponentContractError("template placeholders and adapter bindings must match exactly")
    result: list[tuple[re.Match[str], str, str]] = []
    for match in placeholders:
        context, name = match.group(1), match.group(2)
        binding = bindings[name]
        if not isinstance(binding, dict) or binding.get("context") != context:
            raise ComponentContractError("template placeholder context must match its declared binding context")
        result.append((match, context, name))
    return result


def _encode_template_value(context: str, value: Any) -> str:
    if context in {"python_string", "typescript_string"}:
        if not isinstance(value, str):
            raise ComponentContractError(f"{context} requires a string input value")
        return json.dumps(value, ensure_ascii=True)
    if context == "json_value":
        try:
            return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False)
        except (TypeError, ValueError) as error:
            raise ComponentContractError("json_value requires a JSON-serializable input value") from error
    if context == "tsx_text":
        if not isinstance(value, str):
            raise ComponentContractError("tsx_text requires a string input value")
        return (
            value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("{", "&#123;")
            .replace("}", "&#125;")
            .replace("\r", "&#13;")
            .replace("\n", "&#10;")
        )
    raise ComponentContractError("template uses an unsupported substitution context")


def render_adapter_template_text(
    template_text: str,
    contribution: dict[str, Any],
    validated_input: dict[str, Any],
) -> str:
    """Render one declared template using only fixed context encoders.

    This helper is deterministic data transformation: it evaluates no template
    expressions, code, shell, network, paths, or model output.
    """
    if not isinstance(contribution, dict) or not isinstance(validated_input, dict):
        raise ComponentContractError("adapter contribution and validated input must be JSON objects")
    bindings = contribution.get("bindings")
    placeholders = _validate_template_placeholders(template_text, bindings)
    replacements: dict[tuple[int, int], str] = {}
    for match, context, name in placeholders:
        binding = bindings[name]
        source = binding.get("source")
        if not isinstance(source, str) or not source.startswith("input."):
            raise ComponentContractError("template binding must use a flat input property source")
        property_name = source.removeprefix("input.")
        if property_name not in validated_input:
            raise ComponentContractError("template binding references an absent validated input property")
        replacements[match.span()] = _encode_template_value(context, validated_input[property_name])
    rendered: list[str] = []
    position = 0
    for (start, end), replacement in sorted(replacements.items()):
        rendered.append(template_text[position:start])
        rendered.append(replacement)
        position = end
    rendered.append(template_text[position:])
    return "".join(rendered)


def validate_component_package(
    package_root: Path,
    *,
    available_identities: set[tuple[str, str]] | None = None,
    approved_package_root: Path | None = None,
) -> dict[str, Any]:
    """Validate one first-party package directory against frozen v1 contracts."""
    root = Path(package_root)
    manifest = _read_json(root / "component.json", "component manifest")
    _reject_schema(manifest, "factory-component-v1.schema.json")
    _reject_package_directory_identity(root, manifest, approved_package_root)
    _reject_inventory(root, manifest)
    _reject_dependencies(manifest, available_identities)
    _reject_unverified_golden_component(manifest)
    try:
        Draft202012Validator.check_schema(manifest["input_schema"])
    except SchemaError as error:
        raise ComponentContractError("component input_schema is not valid JSON Schema") from error
    adapter = _read_json(root / "adapter.json", "adapter manifest")
    _reject_adapter(root, manifest, adapter)
    return json.loads(_canonical(manifest))


def validate_composition_plan(value: dict[str, Any]) -> dict[str, Any]:
    """Validate a data-only composition plan independent of Registry/Composer."""
    _reject_schema(value, "factory-composition-v1.schema.json")
    locks = value["component_locks"]
    keys = [lock["key"] for lock in locks]
    if len(keys) != len(set(keys)):
        raise ComponentContractError("composition plan may select each component key only once")
    lock_by_key = {lock["key"]: lock for lock in locks}
    validated_inputs = value["validated_inputs"]
    if set(validated_inputs) != set(lock_by_key):
        raise ComponentContractError("validated inputs must be keyed by exactly the selected component keys")
    if any(not isinstance(component_input, dict) for component_input in validated_inputs.values()):
        raise ComponentContractError("each component's validated input must be a JSON object")
    adapter_keys = [lock["key"] for lock in value["adapter_order"]]
    if len(adapter_keys) != len(set(adapter_keys)) or set(adapter_keys) != set(lock_by_key):
        raise ComponentContractError("adapter order must contain each selected component exactly once")
    for lock in value["adapter_order"]:
        if lock != lock_by_key[lock["key"]]:
            raise ComponentContractError("adapter order lock must exactly match the selected component lock")
    edges = {(edge["from"], edge["to"]) for edge in value["dependency_graph"]}
    if len(edges) != len(value["dependency_graph"]):
        raise ComponentContractError("dependency graph edges must be unique")
    for source, target in edges:
        if source == target or source not in lock_by_key or target not in lock_by_key:
            raise ComponentContractError("dependency graph references an unselected or self dependency")
    output_paths = [item["path"] for item in value["output_manifest"]["files"]]
    if len(output_paths) != len(set(output_paths)):
        raise ComponentContractError("output manifest paths must be unique")
    normalized_paths = [_relative_path(path, "output manifest path") for path in output_paths]
    if len({str(path).casefold() for path in normalized_paths}) != len(normalized_paths):
        raise ComponentContractError("output manifest paths may not case-fold to the same location")
    return json.loads(_canonical(value))


def validate_resolved_composition_inputs(
    composition_plan: dict[str, Any],
    resolved_manifests: Iterable[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Validate component-keyed inputs after Registry has resolved exact manifests.

    ``validate_composition_plan`` is deliberately structural. Call this
    function only with the manifests selected by the exact plan locks to claim
    that per-component input contracts have been checked.
    """
    plan = validate_composition_plan(composition_plan)
    manifest_by_key: dict[str, dict[str, Any]] = {}
    for manifest in resolved_manifests:
        if not isinstance(manifest, dict):
            raise ComponentContractError("resolved manifests must be component manifest objects")
        identity = (manifest.get("key"), manifest.get("version"), manifest.get("digest"))
        if not all(isinstance(value, str) for value in identity):
            raise ComponentContractError("resolved manifest is missing an exact identity")
        key = identity[0]
        if key in manifest_by_key:
            raise ComponentContractError("resolved manifests may contain each component key only once")
        try:
            Draft202012Validator.check_schema(manifest["input_schema"])
        except (KeyError, SchemaError) as error:
            raise ComponentContractError("resolved manifest has an invalid input schema") from error
        manifest_by_key[key] = manifest
    locks_by_key = {lock["key"]: lock for lock in plan["component_locks"]}
    if set(manifest_by_key) != set(locks_by_key):
        raise ComponentContractError("resolved manifests must exactly match the selected component locks")
    validated_inputs: dict[str, dict[str, Any]] = {}
    for key, lock in locks_by_key.items():
        manifest = manifest_by_key[key]
        if (manifest["key"], manifest["version"], manifest["digest"]) != (lock["key"], lock["version"], lock["digest"]):
            raise ComponentContractError("resolved manifest identity does not match its component lock")
        component_input = plan["validated_inputs"][key]
        errors = sorted(Draft202012Validator(manifest["input_schema"]).iter_errors(component_input), key=lambda error: list(error.absolute_path))
        if errors:
            error = errors[0]
            location = ".".join(str(part) for part in error.absolute_path) or key
            raise ComponentContractError(f"component input {key}.{location}: {error.message}")
        validated_inputs[key] = json.loads(_canonical(component_input))
    return validated_inputs
