"""Verify the canonical Factory UI Kit and its controlled Console copy."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


REQUIRED_COMPONENTS = frozenset({
    "app-shell", "button", "input", "textarea", "select", "label", "badge",
    "card", "tabs", "table", "dialog", "accordion", "notice", "empty-state",
    "shell", "action", "panel", "inspector", "stage-rail", "status", "theme",
    "icon-action", "tooltip", "sheet", "command-trigger", "theme-control",
})
CONSOLE_COPY_MAP = {
    "factory-ui.css": "factory-ui.css",
    "tokens.css": "tokens.css",
    "react/factory-ui.tsx": "factory-ui.tsx",
}
WORKSPACE_ROOT = Path(__file__).resolve().parents[1]


class FactoryUiKitError(ValueError):
    """Raised when a canonical asset or its Console distribution is invalid."""


def _sha256(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _load_manifest(root: Path) -> dict[str, Any]:
    try:
        value = json.loads((root / "factory-ui.manifest.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise FactoryUiKitError("canonical_manifest_unavailable") from error
    if not isinstance(value, dict):
        raise FactoryUiKitError("canonical_manifest_invalid")
    return value


def _verify_lucide_closure(canonical_root: Path, indexed: dict[str, Any]) -> None:
    """Verify generated 1.4's reviewed icon closure without network resolution."""
    closure_digest = indexed.get("dependency-closure.json")
    closure_path = canonical_root / "dependency-closure.json"
    if not isinstance(closure_digest, str) or not closure_path.is_file():
        raise FactoryUiKitError("lucide_closure_unavailable")
    if _sha256(closure_path) != closure_digest:
        raise FactoryUiKitError("lucide_closure_digest_mismatch")
    try:
        closure = json.loads(closure_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise FactoryUiKitError("lucide_closure_invalid") from error
    if not isinstance(closure, dict) or closure.get("schema_version") != "factory-ui-dependency-closure/v1":
        raise FactoryUiKitError("lucide_closure_invalid")

    lock_record = closure.get("lockfile")
    package_record = closure.get("package")
    if not isinstance(lock_record, dict) or not isinstance(package_record, dict):
        raise FactoryUiKitError("lucide_closure_invalid")
    lock_relative = lock_record.get("path")
    if not isinstance(lock_relative, str) or not lock_relative.startswith("packages/composer-scaffold/") or ".." in Path(lock_relative).parts:
        raise FactoryUiKitError("lucide_closure_lockfile_invalid")
    lockfile_path = WORKSPACE_ROOT / lock_relative
    if not lockfile_path.is_file() or lock_record.get("sha256") != _sha256(lockfile_path):
        raise FactoryUiKitError("lucide_closure_lockfile_invalid")
    try:
        lockfile = json.loads(lockfile_path.read_text(encoding="utf-8"))
        scaffold_manifest = json.loads((lockfile_path.parent / "package.json").read_text(encoding="utf-8"))
        locked = lockfile["packages"]["node_modules/lucide-react"]
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        raise FactoryUiKitError("lucide_closure_lockfile_invalid") from error
    if (
        scaffold_manifest.get("dependencies", {}).get("lucide-react") != "0.474.0"
        or package_record != {
            "name": "lucide-react",
            "version": locked.get("version"),
            "integrity": locked.get("integrity"),
            "license": locked.get("license"),
            "resolved": locked.get("resolved"),
        }
        or package_record.get("version") != "0.474.0"
        or package_record.get("license") != "ISC"
    ):
        raise FactoryUiKitError("lucide_closure_package_invalid")

    for field, marker, error_name in (
        ("notice", "ISC License", "lucide_closure_notice_invalid"),
        ("sbom", "", "lucide_closure_sbom_invalid"),
    ):
        record = closure.get(field)
        relative = record.get("path") if isinstance(record, dict) else None
        path = canonical_root / relative if isinstance(relative, str) and ".." not in Path(relative).parts else None
        if not isinstance(record, dict) or path is None or not path.is_file() or record.get("sha256") != _sha256(path):
            raise FactoryUiKitError(error_name)
        if marker and marker not in path.read_text(encoding="utf-8"):
            raise FactoryUiKitError(error_name)
    try:
        sbom = json.loads((canonical_root / closure["sbom"]["path"]).read_text(encoding="utf-8"))
        component = next(item for item in sbom["components"] if item.get("name") == "lucide-react")
        license_id = component["licenses"][0]["license"]["id"]
        source_url = component["externalReferences"][0]["url"]
    except (KeyError, StopIteration, TypeError, json.JSONDecodeError) as error:
        raise FactoryUiKitError("lucide_closure_sbom_invalid") from error
    if component.get("version") != package_record["version"] or license_id != package_record["license"] or source_url != package_record["resolved"]:
        raise FactoryUiKitError("lucide_closure_sbom_invalid")


def verify_factory_ui_kit(
    canonical_root: Path,
    console_root: Path,
    *,
    expected_version: str,
    expected_key: str = "factory-ui",
) -> dict[str, Any]:
    """Return copy evidence or fail closed on any source or distribution drift."""
    manifest = _load_manifest(canonical_root)
    if manifest.get("schema_version") != "factory-ui-kit/v1":
        raise FactoryUiKitError("canonical_manifest_schema_invalid")
    if manifest.get("key") != expected_key or manifest.get("version") != expected_version:
        raise FactoryUiKitError("canonical_identity_invalid")
    components = manifest.get("components")
    if not isinstance(components, list) or set(components) != REQUIRED_COMPONENTS or len(components) != len(REQUIRED_COMPONENTS):
        raise FactoryUiKitError("canonical_component_inventory_invalid")
    inventory = manifest.get("inventory")
    if not isinstance(inventory, list):
        raise FactoryUiKitError("canonical_inventory_invalid")
    indexed = {item.get("path"): item.get("sha256") for item in inventory if isinstance(item, dict)}
    if set(indexed) != set(CONSOLE_COPY_MAP):
        raise FactoryUiKitError("canonical_inventory_invalid")
    evidence = []
    for canonical_relative, console_relative in sorted(CONSOLE_COPY_MAP.items()):
        canonical_path = canonical_root / canonical_relative
        console_path = console_root / console_relative
        if not canonical_path.is_file() or not console_path.is_file():
            raise FactoryUiKitError("canonical_or_console_copy_unavailable")
        canonical_digest = _sha256(canonical_path)
        if indexed[canonical_relative] != canonical_digest:
            raise FactoryUiKitError("canonical_inventory_digest_mismatch")
        console_digest = _sha256(console_path)
        if canonical_digest != console_digest:
            if expected_key == "factory-ui-console" and expected_version == "1.6.0":
                raise FactoryUiKitError("console_candidate_copy_digest_mismatch")
            raise FactoryUiKitError("console_copy_digest_mismatch")
        evidence.append({"canonical_path": canonical_relative, "console_path": console_relative, "canonical_digest": canonical_digest, "console_digest": console_digest})
    return {"key": manifest["key"], "version": manifest["version"], "components": sorted(components), "files": evidence}


def verify_generated_ui_distribution(
    canonical_root: Path,
    package_roots: tuple[Path, ...],
    *,
    expected_version: str = "2.1.0",
    expected_lifecycle: str = "golden",
) -> dict[str, Any]:
    """Verify one immutable generated-app family against a local canonical kit.

    The component and adapter contracts intentionally remain frozen.  The
    package-local ``canonical-ui.json`` sidecar is therefore inventory-locked
    evidence, not executable component configuration.
    """
    manifest = _load_manifest(canonical_root)
    indexed = {item.get("path"): item.get("sha256") for item in manifest.get("inventory", []) if isinstance(item, dict)}
    css_digest = indexed.get("factory-ui.css")
    tokens_digest = indexed.get("tokens.css")
    react_digest = indexed.get("react/factory-ui.tsx")
    requires_react_binding = expected_version != "2.1.0"
    if not css_digest or not tokens_digest or (requires_react_binding and not react_digest):
        raise FactoryUiKitError("canonical_inventory_invalid")
    canonical_files = [
        ("factory-ui.css", css_digest),
        ("tokens.css", tokens_digest),
    ]
    if requires_react_binding:
        canonical_files.append(("react/factory-ui.tsx", react_digest))
    for relative_path, expected_digest in canonical_files:
        source_path = canonical_root / relative_path
        if not source_path.is_file() or _sha256(source_path) != expected_digest:
            raise FactoryUiKitError("canonical_inventory_digest_mismatch")
    if expected_version in {"2.3.0", "2.4.0"}:
        _verify_lucide_closure(canonical_root, indexed)
    if not package_roots:
        raise FactoryUiKitError("generated_distribution_unavailable")

    evidence: list[dict[str, Any]] = []
    for package_root in package_roots:
        try:
            package = json.loads((package_root / "component.json").read_text(encoding="utf-8"))
            sidecar_path = package_root / "canonical-ui.json"
            sidecar = json.loads(sidecar_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise FactoryUiKitError("generated_canonical_evidence_unavailable") from error
        if package.get("version") != expected_version or package.get("lifecycle") != expected_lifecycle:
            raise FactoryUiKitError("generated_golden_identity_invalid")
        sidecar_files = sidecar.get("files") if isinstance(sidecar, dict) else None
        sidecar_valid = (
            sidecar.get("schema_version") != "factory-canonical-ui-evidence/v1"
            or sidecar.get("canonical") != {"key": manifest.get("key"), "version": manifest.get("version")}
            or not isinstance(sidecar_files, dict)
            or sidecar_files.get("factory-ui.css") != css_digest
            or sidecar_files.get("tokens.css") != tokens_digest
        )
        if requires_react_binding:
            sidecar_valid = sidecar_valid or sidecar_files.get("react/factory-ui.tsx") != react_digest
        if sidecar_valid:
            raise FactoryUiKitError("generated_canonical_evidence_invalid")
        inventory = {item.get("path"): item.get("sha256") for item in package.get("inventory", []) if isinstance(item, dict)}
        if inventory.get("canonical-ui.json") != _sha256(sidecar_path):
            raise FactoryUiKitError("generated_canonical_evidence_not_inventory_locked")
        if package.get("key") == "ui.app-shell":
            stylesheet = package_root / "templates" / "factory-ui.css"
            if not stylesheet.is_file() or _sha256(stylesheet) != css_digest:
                raise FactoryUiKitError("generated_shell_stylesheet_digest_mismatch")
            if inventory.get("templates/factory-ui.css") != css_digest:
                raise FactoryUiKitError("generated_shell_stylesheet_not_inventory_locked")
        else:
            if package.get("requires") != [{"key": "ui.app-shell", "version": expected_version}]:
                raise FactoryUiKitError("generated_shell_dependency_invalid")
        evidence.append({
            "key": package.get("key"),
            "version": package.get("version"),
            "lifecycle": package.get("lifecycle"),
            "canonical_css_digest": css_digest,
            "canonical_tokens_digest": tokens_digest,
        })
        if requires_react_binding:
            evidence[-1]["canonical_react_digest"] = react_digest
    result = {"key": manifest["key"], "version": manifest["version"], "canonical_css_digest": css_digest, "canonical_tokens_digest": tokens_digest, "packages": sorted(evidence, key=lambda item: item["key"])}
    if requires_react_binding:
        result["canonical_react_digest"] = react_digest
    return result
