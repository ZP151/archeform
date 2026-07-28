"""Fail-closed discovery and planning for frozen first-party component packages.

This module consumes ``factory-component/v1`` and ``factory-composition/v1``.
It never downloads packages, executes adapters, renders an application to disk,
or invokes the legacy centralized renderer.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
import re
import stat
import shutil
import tempfile
import textwrap
from pathlib import Path
from typing import Any, Iterable

from apps.api.component_contract import (
    ComponentContractError,
    render_adapter_template_text,
    validate_component_package,
    validate_composition_plan,
    validate_resolved_composition_inputs,
)


SLOT_ROOTS = {
    "frontend/app-shell": "frontend/app-shell",
    "frontend/routes/login": "frontend/routes/login",
    "frontend/routes/home": "frontend/routes/home",
    "frontend/routes/profile": "frontend/routes/profile",
    "frontend/routes/system-settings": "frontend/routes/system-settings",
    "frontend/features/approval-form": "frontend/features/approval-form",
    "frontend/features/my-requests": "frontend/features/my-requests",
    "frontend/features/approval-queue": "frontend/features/approval-queue",
    "frontend/features/audit": "frontend/features/audit",
    "backend/auth": "backend/auth",
    "backend/authz": "backend/authz",
    "backend/api/records": "backend/api/records",
    "backend/workflow/approval": "backend/workflow/approval",
    "backend/audit": "backend/audit",
    "data/record-schema": "data/record-schema",
    "data/audit-schema": "data/audit-schema",
    "runtime/postgres": "runtime/postgres",
    "tests/fixtures": "tests/fixtures",
}
_DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
_SCAFFOLD_SCHEMA = "factory-composer-scaffold/v1"
_SCAFFOLD_VERSION = "1.0.0"


class CompositionError(ValueError):
    """Raised when local component discovery or composition fails closed."""


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _copy_json(value: Any) -> Any:
    return json.loads(_canonical(value))


def _is_historical_held_ui_generation(manifest: dict[str, Any]) -> bool:
    """Keep the immutable v2.0 UI family available only to exact replay."""
    return (
        isinstance(manifest.get("key"), str)
        and manifest["key"].startswith("ui.")
        and isinstance(manifest.get("version"), str)
        and manifest["version"].startswith("2.0.")
    )


def _is_reparse_point(path: Path) -> bool:
    if path.is_symlink() or getattr(os.path, "isjunction", lambda _: False)(str(path)):
        return True
    try:
        attributes = path.stat(follow_symlinks=False).st_file_attributes
    except (AttributeError, OSError):
        return False
    return bool(attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)


@dataclass(frozen=True)
class RegisteredComponent:
    """One contract-validated local package, without execution capability."""

    root: Path
    manifest: dict[str, Any]
    adapter: dict[str, Any]
    trust: dict[str, Any]
    template_bytes: dict[str, bytes]
    approved_package_root: Path
    available_identities: frozenset[tuple[str, str]]

    @property
    def identity(self) -> tuple[str, str]:
        return self.manifest["key"], self.manifest["version"]

    @property
    def lock(self) -> dict[str, str]:
        return {field: self.manifest[field] for field in ("key", "version", "digest")}

    def assert_unchanged(self) -> None:
        """Reject a package changed after Registry validation and snapshotting."""
        try:
            manifest = validate_component_package(
                self.root,
                available_identities=set(self.available_identities),
                approved_package_root=self.approved_package_root,
            )
            adapter = ComponentRegistry._read_adapter(self.root)
            trust = ComponentRegistry._read_trust(self.root, manifest)
            templates = ComponentRegistry._snapshot_templates(self.root, adapter)
        except (ComponentContractError, CompositionError) as error:
            raise CompositionError(f"component package {self.manifest['key']} changed or became invalid after discovery") from error
        if manifest != self.manifest or adapter != self.adapter or trust != self.trust or templates != self.template_bytes:
            raise CompositionError(f"component package {self.manifest['key']} changed after discovery")


class ComponentRegistry:
    """Discover and resolve only locally contained, verified Golden packages."""

    def __init__(self, approved_package_root: Path) -> None:
        self._root = Path(approved_package_root)

    def discover(self) -> tuple[RegisteredComponent, ...]:
        """Return all valid local packages in deterministic identity order.

        Discovery validates the entire approved root before returning any package;
        a malformed or path-escaping package cannot be silently skipped.
        """
        roots = self._package_roots()
        first_pass: list[tuple[Path, dict[str, Any]]] = []
        try:
            for root in roots:
                first_pass.append((root, validate_component_package(root, approved_package_root=self._root)))
            identities = {(manifest["key"], manifest["version"]) for _, manifest in first_pass}
            if len(identities) != len(first_pass):
                raise CompositionError("approved package root contains duplicate component identities")
            packages: list[RegisteredComponent] = []
            for root, _ in first_pass:
                manifest = validate_component_package(
                    root,
                    available_identities=identities,
                    approved_package_root=self._root,
                )
                adapter = self._read_adapter(root)
                trust = self._read_trust(root, manifest)
                package = RegisteredComponent(
                    root=root,
                    manifest=manifest,
                    adapter=adapter,
                    trust=trust,
                    template_bytes=self._snapshot_templates(root, adapter),
                    approved_package_root=self._root,
                    available_identities=frozenset(identities),
                )
                package.assert_unchanged()
                packages.append(package)
        except ComponentContractError as error:
            raise CompositionError(f"component package validation failed: {error}") from error
        return tuple(sorted(packages, key=lambda package: package.identity))

    def resolve(self, component_keys: Iterable[str]) -> tuple[RegisteredComponent, ...]:
        """Resolve named Golden packages and their exact Golden dependencies."""
        requested = tuple(component_keys)
        if not requested or len(requested) != len(set(requested)) or not all(isinstance(key, str) and key for key in requested):
            raise CompositionError("component selection must contain unique non-empty component keys")
        packages = self.discover()
        by_identity = {package.identity: package for package in packages}
        golden_by_key: dict[str, list[RegisteredComponent]] = {}
        for package in packages:
            if self._is_selectable_trust(package) and not _is_historical_held_ui_generation(package.manifest):
                golden_by_key.setdefault(package.manifest["key"], []).append(package)
        selected: dict[tuple[str, str], RegisteredComponent] = {}

        def add(package: RegisteredComponent) -> None:
            if _is_historical_held_ui_generation(package.manifest):
                raise CompositionError("historical_ui_generation_not_selectable")
            if not self._is_selectable_trust(package):
                raise CompositionError(f"component {package.manifest['key']} is not Golden")
            if package.manifest["compatibility"] != {
                "profile": "internal-approval-app",
                "application_definition": "factory/v1",
            }:
                raise CompositionError(f"component {package.manifest['key']} is incompatible with the approval profile")
            if package.identity in selected:
                return
            selected[package.identity] = package
            for requirement in package.manifest["requires"]:
                dependency = by_identity.get((requirement["key"], requirement["version"]))
                if dependency is None:
                    raise CompositionError(
                        f"component {package.manifest['key']} has an unavailable dependency {requirement['key']}@{requirement['version']}"
                    )
                add(dependency)

        for key in sorted(requested):
            candidates = golden_by_key.get(key, [])
            if not candidates:
                if any(
                    package.manifest["key"] == key
                    and package.manifest["lifecycle"] == "golden"
                    and _is_historical_held_ui_generation(package.manifest)
                    for package in packages
                ):
                    raise CompositionError("historical_ui_generation_not_selectable")
                if any(
                    package.manifest["key"] == key
                    and package.manifest["lifecycle"] == "golden"
                    and not self._is_selectable_trust(package)
                    for package in packages
                ):
                    raise CompositionError(f"component {key} is not trusted for selection")
                raise CompositionError(f"no Golden component is available for {key}")
            # Existing plans retain exact locks. New plans select the highest
            # validated semantic version, allowing a promoted asset suite to
            # replace an older Golden implementation without rewriting history.
            add(max(candidates, key=lambda package: tuple(int(part) for part in package.manifest["version"].split("."))))
        return tuple(sorted(selected.values(), key=lambda package: package.identity))

    def resolve_locks(
        self,
        locks: Iterable[dict[str, str]],
        *,
        allow_historical_replay: bool = False,
    ) -> tuple[RegisteredComponent, ...]:
        """Resolve exact Golden locks without accepting any unpinned version."""
        requested = tuple(_copy_json(list(locks)))
        if not requested:
            raise CompositionError("component lock selection must not be empty")
        packages = {package.identity: package for package in self.discover()}
        resolved: list[RegisteredComponent] = []
        seen: set[str] = set()
        for lock in requested:
            if not isinstance(lock, dict) or set(lock) != {"key", "version", "digest"}:
                raise CompositionError("component lock must contain only key, version, and digest")
            key, version, digest = lock["key"], lock["version"], lock["digest"]
            if not all(isinstance(value, str) for value in (key, version, digest)) or not _DIGEST.fullmatch(digest):
                raise CompositionError("component lock identity is invalid")
            if key in seen:
                raise CompositionError("component lock selection contains a duplicate key")
            seen.add(key)
            package = packages.get((key, version))
            if package is None or package.manifest["digest"] != digest:
                raise CompositionError(f"component lock {key}@{version} is unavailable or digest-mismatched")
            if package.manifest["lifecycle"] != "golden":
                raise CompositionError(f"component lock {key}@{version} is not Golden")
            if not self._is_selectable_trust(package):
                raise CompositionError(f"component lock {key}@{version} is not trusted for selection")
            if _is_historical_held_ui_generation(package.manifest) and not allow_historical_replay:
                raise CompositionError("historical_ui_generation_not_selectable")
            resolved.append(package)
        return tuple(sorted(resolved, key=lambda package: package.identity))

    @staticmethod
    def _read_trust(root: Path, manifest: dict[str, Any]) -> dict[str, Any]:
        requires_trust = (
            isinstance(manifest.get("key"), str)
            and manifest["key"].startswith("ui.")
            and isinstance(manifest.get("version"), str)
            and manifest["version"].startswith("2.")
        )
        try:
            trust = json.loads((root / "trust.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            if not requires_trust:
                return {
                    "schema_version": "factory-component-trust/v1",
                    "lifecycle": manifest["lifecycle"],
                    "status": "promoted",
                    "subject": {"key": manifest["key"], "version": manifest["version"]},
                }
            raise CompositionError("component trust evidence is unavailable or invalid") from error
        if (
            not isinstance(trust, dict)
            or trust.get("schema_version") != "factory-component-trust/v1"
            or trust.get("lifecycle") != manifest["lifecycle"]
            or trust.get("subject") != {"key": manifest["key"], "version": manifest["version"]}
            or trust.get("status") not in {"promoted", "candidate", "revoked", "unsigned", "stale"}
        ):
            raise CompositionError("component trust evidence is invalid")
        return _copy_json(trust)

    @staticmethod
    def _is_selectable_trust(package: RegisteredComponent) -> bool:
        return package.manifest["lifecycle"] == "golden" and package.trust["status"] == "promoted"

    def _package_roots(self) -> tuple[Path, ...]:
        if not self._root.is_dir() or _is_reparse_point(self._root):
            raise CompositionError("approved component package root must be a contained non-link directory")
        package_roots: list[Path] = []
        for key_directory in sorted(self._root.iterdir(), key=lambda path: path.name):
            if _is_reparse_point(key_directory) or not key_directory.is_dir():
                raise CompositionError("approved component package root may contain only non-link key directories")
            for version_directory in sorted(key_directory.iterdir(), key=lambda path: path.name):
                if _is_reparse_point(version_directory) or not version_directory.is_dir():
                    raise CompositionError("component key directories may contain only non-link version directories")
                package_roots.append(version_directory)
        if not package_roots:
            raise CompositionError("approved component package root contains no packages")
        return tuple(package_roots)

    @staticmethod
    def _read_adapter(package_root: Path) -> dict[str, Any]:
        try:
            adapter = json.loads((package_root / "adapter.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise CompositionError("validated component adapter is unavailable") from error
        if not isinstance(adapter, dict):
            raise CompositionError("validated component adapter must be an object")
        return _copy_json(adapter)

    @staticmethod
    def _snapshot_templates(package_root: Path, adapter: dict[str, Any]) -> dict[str, bytes]:
        snapshots: dict[str, bytes] = {}
        try:
            root = package_root.resolve(strict=True)
            contributions = adapter["contributions"]
            for contribution in contributions:
                source = contribution["source"]
                if (
                    not isinstance(source, str)
                    or not source.startswith("templates/")
                    or "\\" in source
                    or ":" in source
                    or any(part in {"", ".", ".."} for part in source.split("/"))
                ):
                    raise CompositionError("validated adapter template path is not contained")
                path = (package_root / Path(*source.split("/"))).resolve(strict=True)
                path.relative_to(root)
                if _is_reparse_point(path) or not path.is_file():
                    raise CompositionError("validated adapter template is no longer a contained regular file")
                snapshots[source] = path.read_bytes()
        except (KeyError, OSError, TypeError, ValueError) as error:
            raise CompositionError("validated adapter template is unavailable") from error
        return snapshots


class ComponentComposer:
    """Build a deterministic, data-only composition plan from Golden packages."""

    def __init__(self, registry: ComponentRegistry, *, scaffold_root: Path | None = None) -> None:
        self._registry = registry
        self._scaffold_root = (
            Path(scaffold_root)
            if scaffold_root is not None
            else Path(__file__).resolve().parents[2] / "packages" / "composer-scaffold" / _SCAFFOLD_VERSION
        )

    def create_plan(
        self,
        *,
        application_definition_checksum: str,
        component_keys: Iterable[str],
        component_inputs: dict[str, dict[str, Any]],
        include_runtime_scaffold: bool = False,
    ) -> dict[str, Any]:
        """Resolve selected keys and return an immutable-by-value plan; never write output."""
        return self._create_plan(
            application_definition_checksum=application_definition_checksum,
            packages=self._registry.resolve(component_keys),
            component_inputs=component_inputs,
            include_runtime_scaffold=include_runtime_scaffold,
        )

    def create_plan_from_locks(
        self,
        *,
        application_definition_checksum: str,
        component_locks: Iterable[dict[str, str]],
        component_inputs: dict[str, dict[str, Any]],
        include_runtime_scaffold: bool = False,
    ) -> dict[str, Any]:
        """Build a plan only when every supplied lock is exact and Golden."""
        return self._create_plan(
            application_definition_checksum=application_definition_checksum,
            packages=self._registry.resolve_locks(component_locks),
            component_inputs=component_inputs,
            include_runtime_scaffold=include_runtime_scaffold,
        )

    def materialize(self, *, plan: dict[str, Any], output_root: Path) -> dict[str, list[dict[str, str]]]:
        """Atomically write exactly the files approved by a composition plan.

        Materialization re-resolves exact Golden locks and recomputes the plan
        before creating the destination.  It is deliberately limited to the
        frozen adapter ``render_template`` operation; it does not copy an
        application skeleton, execute a package, or read runtime configuration.
        """
        try:
            validated_plan = validate_composition_plan(plan)
        except ComponentContractError as error:
            raise CompositionError(f"composition plan validation failed: {error}") from error
        expected = self._create_plan(
            application_definition_checksum=validated_plan["application_definition_checksum"],
            packages=self._registry.resolve_locks(
                validated_plan["component_locks"],
                allow_historical_replay=True,
            ),
            component_inputs=validated_plan["validated_inputs"],
            include_runtime_scaffold=self._plan_includes_runtime_scaffold(validated_plan),
        )
        if _canonical(validated_plan) != _canonical(expected):
            raise CompositionError("composition plan no longer matches its exact Golden package locks")

        destination = Path(output_root)
        if destination.exists():
            raise CompositionError("composition output directory must not already exist")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = Path(tempfile.mkdtemp(prefix=f".{destination.name}.", dir=destination.parent))
        try:
            packages = {
                package.manifest["key"]: package
                for package in self._registry.resolve_locks(
                    expected["component_locks"],
                    allow_historical_replay=True,
                )
            }
            rendered_files: list[tuple[str, bytes]] = []
            for lock in expected["adapter_order"]:
                package = packages[lock["key"]]
                package.assert_unchanged()
                for contribution in package.adapter["contributions"]:
                    slot_root = SLOT_ROOTS[contribution["slot"]]
                    relative = f"{slot_root}/{contribution['target']}"
                    contents = self._render_contribution(
                        package=package,
                        contribution=contribution,
                        component_input=expected["validated_inputs"][package.manifest["key"]],
                    )
                    rendered_files.append((relative, contents))
            if self._plan_includes_runtime_scaffold(expected):
                rendered_files.extend(
                    self._runtime_scaffold_files(
                        expected["validated_inputs"],
                        packages["ui.app-shell"].manifest["version"],
                    )
                )
            self._reject_duplicate_output_paths(rendered_files)
            observed = {
                "files": [
                    {"path": relative, "sha256": "sha256:" + hashlib.sha256(contents).hexdigest()}
                    for relative, contents in sorted(rendered_files)
                ]
            }
            if observed != expected["output_manifest"]:
                raise CompositionError("composition output no longer matches the approved output manifest")
            for relative, contents in rendered_files:
                target = (temporary / Path(*relative.split("/"))).resolve()
                if temporary.resolve() not in target.parents:
                    raise CompositionError("composition output path escapes its contained destination")
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(contents)
            if destination.exists():
                raise CompositionError("composition output directory must not already exist")
            os.rename(temporary, destination)
            return _copy_json(observed)
        except Exception:
            shutil.rmtree(temporary, ignore_errors=True)
            raise

    def _create_plan(
        self,
        *,
        application_definition_checksum: str,
        packages: Iterable[RegisteredComponent],
        component_inputs: dict[str, dict[str, Any]],
        include_runtime_scaffold: bool,
    ) -> dict[str, Any]:
        if not isinstance(application_definition_checksum, str) or not _DIGEST.fullmatch(application_definition_checksum):
            raise CompositionError("application definition checksum must be a sha256 digest")
        selected = tuple(packages)
        by_key = {package.manifest["key"]: package for package in selected}
        if len(by_key) != len(selected):
            raise CompositionError("resolved selection contains duplicate component keys")
        edges = self._dependency_graph(by_key)
        adapter_order_keys = self._adapter_order(by_key)
        locks = [by_key[key].lock for key in sorted(by_key)]
        adapter_order = [by_key[key].lock for key in adapter_order_keys]
        skeleton = {
            "schema_version": "factory-composition/v1",
            "application_definition_checksum": application_definition_checksum,
            "component_locks": locks,
            "validated_inputs": _copy_json(component_inputs),
            "dependency_graph": edges,
            "adapter_order": adapter_order,
            "output_manifest": {"files": []},
        }
        try:
            validated_inputs = validate_resolved_composition_inputs(
                skeleton,
                [package.manifest for package in selected],
            )
        except ComponentContractError as error:
            raise CompositionError(f"component input validation failed: {error}") from error
        output_manifest = self._output_manifest(
            by_key=by_key,
            adapter_order=adapter_order_keys,
            validated_inputs=validated_inputs,
        )
        if include_runtime_scaffold:
            output_manifest = self._merge_output_manifest(
                output_manifest,
                self._runtime_scaffold_files(
                    validated_inputs,
                    by_key["ui.app-shell"].manifest["version"],
                ),
            )
        plan = {**skeleton, "validated_inputs": validated_inputs, "output_manifest": output_manifest}
        try:
            return validate_composition_plan(plan)
        except ComponentContractError as error:
            raise CompositionError(f"composition plan validation failed: {error}") from error

    @staticmethod
    def _dependency_graph(by_key: dict[str, RegisteredComponent]) -> list[dict[str, str]]:
        edges: list[dict[str, str]] = []
        for key in sorted(by_key):
            for requirement in by_key[key].manifest["requires"]:
                dependency = by_key.get(requirement["key"])
                if dependency is None or dependency.manifest["version"] != requirement["version"]:
                    raise CompositionError(f"component {key} requires an unresolved dependency")
                edges.append({"from": key, "to": requirement["key"]})
        return sorted(edges, key=lambda edge: (edge["from"], edge["to"]))

    @staticmethod
    def _adapter_order(by_key: dict[str, RegisteredComponent]) -> list[str]:
        ordered: list[str] = []
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(key: str) -> None:
            if key in visited:
                return
            if key in visiting:
                raise CompositionError("component dependency graph contains a cycle")
            visiting.add(key)
            for requirement in sorted(by_key[key].manifest["requires"], key=lambda item: item["key"]):
                if requirement["key"] not in by_key:
                    raise CompositionError(f"component {key} requires an unresolved dependency")
                visit(requirement["key"])
            visiting.remove(key)
            visited.add(key)
            ordered.append(key)

        for key in sorted(by_key):
            visit(key)
        return ordered

    @staticmethod
    def _output_manifest(
        *,
        by_key: dict[str, RegisteredComponent],
        adapter_order: Iterable[str],
        validated_inputs: dict[str, dict[str, Any]],
    ) -> dict[str, list[dict[str, str]]]:
        files: list[dict[str, str]] = []
        destinations: set[str] = set()
        for key in adapter_order:
            package = by_key[key]
            package.assert_unchanged()
            for contribution in package.adapter["contributions"]:
                slot = contribution["slot"]
                root = SLOT_ROOTS.get(slot)
                if root is None:
                    raise CompositionError(f"adapter contribution uses unknown output slot {slot}")
                output_path = f"{root}/{contribution['target']}"
                folded = output_path.casefold()
                if folded in destinations:
                    raise CompositionError(f"adapter contribution conflict at output path {output_path}")
                destinations.add(folded)
                rendered_bytes = ComponentComposer._render_contribution(
                    package=package,
                    contribution=contribution,
                    component_input=validated_inputs[key],
                )
                files.append({
                    "path": output_path,
                    "sha256": "sha256:" + hashlib.sha256(rendered_bytes).hexdigest(),
                })
        return {"files": sorted(files, key=lambda item: item["path"])}

    @staticmethod
    def _reject_duplicate_output_paths(files: Iterable[tuple[str, bytes]]) -> None:
        seen: set[str] = set()
        for path, _contents in files:
            folded = path.casefold()
            if folded in seen:
                raise CompositionError(f"composition output conflict at path {path}")
            seen.add(folded)

    @staticmethod
    def _merge_output_manifest(
        output_manifest: dict[str, list[dict[str, str]]],
        scaffold_files: Iterable[tuple[str, bytes]],
    ) -> dict[str, list[dict[str, str]]]:
        entries = list(output_manifest["files"])
        entries.extend(
            {"path": path, "sha256": "sha256:" + hashlib.sha256(contents).hexdigest()}
            for path, contents in scaffold_files
        )
        folded = [entry["path"].casefold() for entry in entries]
        if len(folded) != len(set(folded)):
            raise CompositionError("runtime scaffold conflicts with a declared component output")
        return {"files": sorted(entries, key=lambda item: item["path"])}

    def _plan_includes_runtime_scaffold(self, plan: dict[str, Any]) -> bool:
        return any(
            item["path"] == "docker-compose.yml"
            for item in plan["output_manifest"]["files"]
        )

    def _runtime_scaffold_files(
        self, inputs: dict[str, dict[str, Any]], shell_version: str
    ) -> list[tuple[str, bytes]]:
        """Build the fixed Composer-owned local application boundary.

        This is intentionally not a component adapter.  It is a versioned
        first-party assembly asset which has no package-selection, shell, or
        network authority.  It derives only from already schema-validated
        component inputs and writes through the same output-manifest path as
        all component contributions.
        """
        static = self._verified_static_scaffold()
        try:
            auth = inputs["backend.session-auth"]
            records = inputs["backend.record-api"]
            workflow = inputs["workflow.single-level-approval"]
            audit = inputs["ops.audit-log"]
            shell = inputs["ui.app-shell"]
            form = inputs["ui.approval-form"]
        except KeyError as error:
            raise CompositionError("runtime scaffold requires the approval Golden package inputs") from error
        roles = list(auth["allowed_roles"])
        submitter = records["submitter_role"]
        approver = workflow["approver_role"]
        auditor = audit["auditor_role"]
        record_path = records["record_path"]
        users = {
            role: {
                "role": role,
                "password_sha256": hashlib.sha256(("demo-" + role).encode("utf-8")).hexdigest(),
            }
            for role in roles
        }
        actor_items = [
            {"id": role, "label": role.replace("_", " ").title(), "kind": (
                "submitter" if role == submitter else "approver" if role == approver else "auditor" if role == auditor else "observer"
            )}
            for role in roles
        ]
        assembled_route_packages = {
            "/": "ui.home-page",
            "/submit": "ui.approval-form",
            "/my-records": "ui.my-requests",
            "/approval-queue": "ui.approval-queue",
            "/audit": "ui.app-shell",
            "/profile": "ui.profile-page",
            "/settings": "ui.system-settings-page",
        }
        candidate_ui = shell_version in {"2.2.0", "2.3.0", "2.4.0"}
        compact_workspace = shell_version in {"2.3.0", "2.4.0"}
        auth_safe_candidate = shell_version == "2.4.0"
        declared_navigation = {item["href"] for item in shell["navigation"]}
        available_routes = (
            {
                href for href, component_key in assembled_route_packages.items()
                if href in declared_navigation and component_key in inputs
            }
            if candidate_ui
            else None
        )
        files: dict[str, str] = {
            "backend/app/__init__.py": "",
            "backend/app/runtime.py": textwrap.dedent('''\
                """Composer-owned framework access for packaged routes."""
                import os
                import psycopg
                from psycopg.rows import dict_row
                DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://approval_runtime:approval_runtime@db:5432/approval_app")
                def connect() -> psycopg.Connection:
                    return psycopg.connect(DATABASE_URL, row_factory=dict_row)
                '''),
            "backend/app/main.py": textwrap.dedent('''\
                """Composer-owned router assembly for a bounded local approval preview."""
                from fastapi import FastAPI
                from fastapi.middleware.cors import CORSMiddleware
                from fastapi.responses import HTMLResponse
                from api.records.record_api import router as record_router
                from app.runtime import connect
                from audit.audit_log import router as audit_router
                from auth.session_auth import router as session_router
                app = FastAPI(title="Factory Pilot composed approval API")
                app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_origin_regex=r"^http://(?:localhost|127\\.0\\.0\\.1):[0-9]{1,5}$", allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"], allow_credentials=True)
                app.include_router(session_router)
                app.include_router(record_router)
                app.include_router(audit_router)
                @app.get("/", response_class=HTMLResponse)
                def home() -> str:
                    return "<main><h1>Factory Pilot approval preview</h1></main>"
                @app.get("/health")
                def health() -> dict[str, str]:
                    with connect() as connection:
                        connection.execute("SELECT 1")
                    return {"status": "ok"}
                '''),
            "backend/requirements.txt": "fastapi==0.115.8\npsycopg[binary]==3.2.4\nuvicorn[standard]==0.34.0\n",
            "backend/Dockerfile": "FROM python:3.12.8-slim\nWORKDIR /app\nENV PYTHONPATH=/app\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n",
            "docker-compose.yml": self._compose_file(auth, users),
            "smoke_test.py": self._smoke_test(record_path, submitter, approver, auditor, form["fields"]),
            "frontend/app/page.tsx": (
                self._frontend_page if shell_version in {"2.1.0", "2.2.0", "2.3.0", "2.4.0"} else self._legacy_frontend_page
            )(
                record_path,
                actor_items,
                submitter,
                {field["id"]: field["label"] for field in form["fields"]},
                navigation=shell["navigation"],
                available_routes=available_routes,
                filter_available_routes=candidate_ui,
                supports_pending_decision=candidate_ui,
                use_application_shell=candidate_ui,
                compact_workspace=compact_workspace,
                auth_safe_candidate=auth_safe_candidate,
                **({"factory_ui_version": "1.4.0" if compact_workspace else "1.3.0"} if candidate_ui else {}),
            ),
            "frontend/app/layout.tsx": self._frontend_layout(
                shell["product_name"],
                include_component_stylesheet=shell_version in {"2.1.0", "2.2.0", "2.3.0", "2.4.0"},
            ),
        }
        files.update(static)
        return [(path, contents.encode("utf-8")) for path, contents in sorted(files.items())]

    def _verified_static_scaffold(self) -> dict[str, str]:
        root = self._scaffold_root.resolve()
        manifest_path = root / "scaffold.json"
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise CompositionError("Composer runtime scaffold is unavailable") from error
        if (
            not isinstance(manifest, dict)
            or manifest.get("schema_version") != _SCAFFOLD_SCHEMA
            or manifest.get("version") != _SCAFFOLD_VERSION
            or not isinstance(manifest.get("files"), list)
        ):
            raise CompositionError("Composer runtime scaffold manifest is invalid")
        files: dict[str, str] = {}
        for entry in manifest["files"]:
            if not isinstance(entry, dict) or set(entry) != {"path", "sha256"}:
                raise CompositionError("Composer runtime scaffold manifest entry is invalid")
            relative, expected_digest = entry["path"], entry["sha256"]
            if not isinstance(relative, str) or not isinstance(expected_digest, str) or not _DIGEST.fullmatch(expected_digest):
                raise CompositionError("Composer runtime scaffold manifest entry is invalid")
            candidate = (root / Path(*relative.split("/"))).resolve()
            if root not in candidate.parents or not candidate.is_file() or _is_reparse_point(candidate):
                raise CompositionError("Composer runtime scaffold path is not contained")
            contents = candidate.read_bytes()
            if "sha256:" + hashlib.sha256(contents).hexdigest() != expected_digest:
                raise CompositionError("Composer runtime scaffold file digest changed")
            files[relative] = contents.decode("utf-8")
        if len(files) != len(manifest["files"]):
            raise CompositionError("Composer runtime scaffold manifest contains duplicate files")
        return files

    @staticmethod
    def _compose_file(auth: dict[str, Any], users: dict[str, dict[str, str]]) -> str:
        """Render a local runtime using the selected session package inputs only."""
        signing_key_env = auth["signing_key_env"]
        local_users_env = auth["local_users_env"]
        return '''name: factory-composed-approval

services:
  db:
    image: postgres:16.4-alpine
    environment:
      POSTGRES_DB: approval_app
      POSTGRES_USER: approval_runtime
      POSTGRES_PASSWORD: approval_runtime
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U approval_runtime -d approval_app"]
      interval: 2s
      timeout: 3s
      retries: 30
    volumes:
      - ./runtime/postgres/001-runtime-role.sql:/docker-entrypoint-initdb.d/001-runtime-role.sql:ro
      - ./data/record-schema/records.sql:/docker-entrypoint-initdb.d/002-record-schema.sql:ro
      - ./data/audit-schema/audit_events.sql:/docker-entrypoint-initdb.d/003-audit-schema.sql:ro
  api:
    build:
      context: ./backend
    environment:
      DATABASE_URL: postgresql://approval_runtime:approval_runtime@db:5432/approval_app
      ''' + signing_key_env + ''': local-composed-preview-key
      ''' + local_users_env + ''': ''' + "'" + _canonical(users) + "'" + '''
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"]
      interval: 2s
      timeout: 3s
      retries: 30
    ports:
      - "127.0.0.1:${FACTORY_API_HOST_PORT:-8000}:8000"
  web:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_BASE_URL: http://127.0.0.1:${FACTORY_API_HOST_PORT:-8000}
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]
      interval: 2s
      timeout: 3s
      retries: 30
    ports:
      - "127.0.0.1::3000"
'''

    @staticmethod
    def _smoke_test(record_path: str, submitter: str, approver: str, auditor: str, fields: list[dict[str, Any]]) -> str:
        return f'''"""Bounded role-aware smoke test for the composed local application."""
from __future__ import annotations
import json
import os
import urllib.request
API = os.environ.get("APP_API_BASE_URL", "http://127.0.0.1:8000")
RECORD_PATH = {record_path!r}
SUBMITTER = {submitter!r}
APPROVER = {approver!r}
AUDITOR = {auditor!r}
PAYLOAD = {{field["id"]: "sample" for field in {fields!r}}}
def request(path: str, *, method: str = "GET", payload: object | None = None, cookie: str | None = None) -> tuple[object, str | None]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {{"Content-Type": "application/json"}} if data is not None else {{}}
    if cookie: headers["Cookie"] = cookie
    response = urllib.request.urlopen(urllib.request.Request(API + path, data=data, headers=headers, method=method), timeout=15)
    return json.loads(response.read().decode("utf-8")), response.headers.get("Set-Cookie")
def session(role: str) -> str:
    _body, cookie = request("/session/sign-in", method="POST", payload={{"username": role, "password": "demo-" + role}})
    if not cookie: raise RuntimeError("sign-in did not issue a local session")
    return cookie.split(";", 1)[0]
def run() -> None:
    record, _ = request(RECORD_PATH, method="POST", payload=PAYLOAD, cookie=session(SUBMITTER))
    decided, _ = request(RECORD_PATH + "/" + record["id"] + "/decision", method="POST", payload={{"decision": "approved"}}, cookie=session(APPROVER))
    if decided.get("status") != "approved": raise RuntimeError("approval transition did not complete")
    audit, _ = request("/audit-events", cookie=session(AUDITOR))
    if len(audit) < 2: raise RuntimeError("append-only audit evidence is incomplete")
    print("Smoke test passed")
if __name__ == "__main__": run()
'''

    @staticmethod
    def _frontend_layout(product_name: str, include_component_stylesheet: bool = True) -> str:
        stylesheet = 'import "../app-shell/factory-ui.css";' if include_component_stylesheet else ""
        return textwrap.dedent(f'''\
            import type {{ Metadata }} from "next";
            import type {{ ReactNode }} from "react";
            import "./globals.css";
            {stylesheet}
            export const metadata: Metadata = {{ title: {json.dumps(product_name)}, description: "A bounded local Factory Pilot preview" }};
            export default function RootLayout({{ children }}: Readonly<{{ children: ReactNode }}>) {{ return <html lang="en"><body>{{children}}</body></html>; }}
            ''')

    @staticmethod
    def _frontend_page(
        record_path: str,
        actors: list[dict[str, str]],
        submitter: str,
        field_labels: dict[str, str],
        factory_ui_version: str = "1.0.0",
        navigation: list[dict[str, str]] | None = None,
        available_routes: set[str] | None = None,
        filter_available_routes: bool = False,
        supports_pending_decision: bool = False,
        use_application_shell: bool = False,
        compact_workspace: bool = False,
        auth_safe_candidate: bool = False,
    ) -> str:
        approval_queue_pending_prop = (
            " pendingDecisionId={decisionPending ? confirmation?.id : undefined}"
            if supports_pending_decision else ""
        )
        application_shell_import = (
            'import { ApplicationShell } from "../app-shell/ApplicationShell";'
            if use_application_shell else ""
        )
        route_filter_declaration = (
            f'const AVAILABLE_ROUTES = {_canonical(sorted(available_routes or set()))};'
            if filter_available_routes
            else ""
        )
        routes_for_body = (
            '(ROUTES[kind ?? ""] ?? []).filter((route) => AVAILABLE_ROUTES.includes(route.href))'
            if filter_available_routes
            else 'ROUTES[kind ?? ""] ?? []'
        )
        active_view_expression = "resolvedActiveView" if filter_available_routes else "activeView"
        active_view_declaration = (
            'const resolvedActiveView = allowedRoutes.some((route) => route.href === activeView) ? activeView : (allowedRoutes[0]?.href ?? "/");'
            if filter_available_routes
            else ""
        )
        route_fallback_effect = (
            'useEffect(() => { if (signedIn && !allowedRoutes.some((route) => route.href === activeView)) setActiveView(allowedRoutes[0]?.href ?? "/"); }, [signedIn, activeActor?.kind, activeView]);'
            if filter_available_routes
            else ""
        )
        application_shell_sign_out_prop = " onSignOut={switchRole}" if compact_workspace else ""
        signed_out_account_label_declaration = (
            'const signedOutAccountLabel = (index: number) => `Local account ${index + 1}`;'
            if auth_safe_candidate
            else ""
        )
        signed_out_actor_options = (
            '{ACTORS.map((candidate, index) => <option key={candidate.id} value={candidate.id}>{signedOutAccountLabel(index)}</option>)}'
            if auth_safe_candidate
            else '{ACTORS.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}'
        )
        signed_out_account_control = (
            '<label className="fp-field">Local account<select value={actor} onChange={(event) => setActor(event.target.value)}>'
            f'{signed_out_actor_options}</select></label>'
            if auth_safe_candidate
            else '<label className="fp-field">Preview role<select value={actor} onChange={(event) => setActor(event.target.value)}>'
            f'{signed_out_actor_options}</select></label>'
        )
        signed_in_shell_open = (
            f'return <ApplicationShell activeView={{{active_view_expression}}} navigation={{allowedRoutes}} onNavigate={{(href) => setActiveView(href)}} onThemeChange={{() => setTheme((current) => current === "light" ? "dark" : "light")}} theme={{theme}}{application_shell_sign_out_prop}>'
            if use_application_shell else
            f'<div className="fp-app" data-factory-ui={json.dumps(factory_ui_version)} data-theme={{theme}}><div className="fp-frame"><header className="fp-topbar"><div className="fp-identity"><strong>{{activeActor?.label ?? "Local preview"}}</strong><small>Local preview</small></div><button className="fp-secondary" type="button" aria-label={{theme === "light" ? "Switch to dark theme" : "Switch to light theme"}} onClick={{() => setTheme((current) => current === "light" ? "dark" : "light")}}>{{theme === "light" ? "Dark" : "Light"}}</button></header><main className="fp-workspace"><nav className="fp-nav" aria-label="Primary navigation">{{allowedRoutes.map((route) => <button aria-current={{activeView === route.href ? "page" : undefined}} key={{route.href}} onClick={{() => setActiveView(route.href)}} type="button">{{route.label}}</button>)}}</nav>'
        )
        signed_in_shell_close = "</ApplicationShell>" if use_application_shell else "</main></div></div>"
        page = textwrap.dedent(f'''
            "use client";
            import {{ useEffect, useRef, useState }} from "react";
            import {{ ApprovalForm }} from "../features/approval-form/ApprovalForm";
            import {{ ApprovalQueue }} from "../features/approval-queue/ApprovalQueue";
            import {{ AuditLog }} from "../features/audit/AuditLog";
            import {{ MyRequests }} from "../features/my-requests/MyRequests";
            import {{ HomePage }} from "../routes/home/HomePage";
            import {{ LoginPage }} from "../routes/login/LoginPage";
            import {{ ProfilePage }} from "../routes/profile/ProfilePage";
            import {{ SystemSettingsPage }} from "../routes/system-settings/SystemSettingsPage";
            {application_shell_import}
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
            const RECORD_PATH = {json.dumps(record_path)};
            const ACTORS = {_canonical(actors)};
            const INITIAL_ACTOR = {json.dumps(submitter)};
            const FIELD_LABELS: Record<string, string> = {_canonical(field_labels)};
            const ROUTE_LABELS: Record<string, string> = {_canonical({item["href"]: item["label"] for item in navigation or []})};
            {signed_out_account_label_declaration}
            {route_filter_declaration}
            const ROUTES: Record<string, Array<{{href: string; label: string}}>> = {{
              submitter: [{{href: "/", label: ROUTE_LABELS["/"] ?? "Home"}}, {{href: "/submit", label: ROUTE_LABELS["/submit"] ?? "Submit"}}, {{href: "/my-records", label: ROUTE_LABELS["/my-records"] ?? "My requests"}}, {{href: "/profile", label: ROUTE_LABELS["/profile"] ?? "Profile"}}, {{href: "/settings", label: ROUTE_LABELS["/settings"] ?? "Settings"}}],
              approver: [{{href: "/", label: ROUTE_LABELS["/"] ?? "Home"}}, {{href: "/approval-queue", label: ROUTE_LABELS["/approval-queue"] ?? "Approval queue"}}, {{href: "/profile", label: ROUTE_LABELS["/profile"] ?? "Profile"}}, {{href: "/settings", label: ROUTE_LABELS["/settings"] ?? "Settings"}}],
              auditor: [{{href: "/", label: ROUTE_LABELS["/"] ?? "Home"}}, {{href: "/audit", label: ROUTE_LABELS["/audit"] ?? "Audit"}}, {{href: "/profile", label: ROUTE_LABELS["/profile"] ?? "Profile"}}, {{href: "/settings", label: ROUTE_LABELS["/settings"] ?? "Settings"}}],
              observer: [{{href: "/", label: ROUTE_LABELS["/"] ?? "Home"}}, {{href: "/audit", label: ROUTE_LABELS["/audit"] ?? "Audit"}}, {{href: "/profile", label: ROUTE_LABELS["/profile"] ?? "Profile"}}, {{href: "/settings", label: ROUTE_LABELS["/settings"] ?? "Settings"}}],
            }};
            function routesFor(kind?: string) {{ return {routes_for_body}; }}
            function summaryFor(payload: Record<string, unknown>) {{ return Object.entries(payload).map(([key, value]) => `${{FIELD_LABELS[key] ?? key}}: ${{String(value)}}`).join(" · "); }}
            async function api(path: string, init?: RequestInit) {{ const response = await fetch(`${{API_BASE_URL}}${{path}}`, {{...init, credentials: "include", headers: {{"Content-Type": "application/json", ...init?.headers}}}}); if (!response.ok) throw new Error(`Request failed with status ${{response.status}}`); return response.json(); }}
            type Feedback = {{ tone: "success" | "error"; message: string }};
            type Confirmation = {{ id: string; decision: "approved" | "rejected"; summary: string }};
            function GovernedFeedback({{ feedback, target }}: {{ feedback: Feedback | null; target: React.RefObject<HTMLParagraphElement | null> }}) {{
              if (!feedback) return null;
              return feedback.tone === "error"
                ? <p className="fp-feedback fp-feedback-error" ref={{target}} role="alert" tabIndex={{-1}}>{{feedback.message}}</p>
                : <p className="fp-feedback" ref={{target}} role="status" aria-live="polite" tabIndex={{-1}}>{{feedback.message}}</p>;
            }}
            export default function ComposedApprovalApplication() {{
              const [actor, setActor] = useState(INITIAL_ACTOR);
              const [signedIn, setSignedIn] = useState(false);
              const [records, setRecords] = useState<any[]>([]);
              const [auditEvents, setAuditEvents] = useState<any[]>([]);
              const [activeView, setActiveView] = useState("/");
              const [theme, setTheme] = useState<"light" | "dark">("light");
              const [feedback, setFeedback] = useState<Feedback | null>(null);
              const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
              const [decisionPending, setDecisionPending] = useState(false);
              const feedbackTarget = useRef<HTMLParagraphElement>(null);
              const confirmationDialog = useRef<HTMLDivElement>(null);
              const decisionOrigin = useRef<HTMLElement | null>(null);
              const activeActor = ACTORS.find((candidate) => candidate.id === actor);
              const allowedRoutes = routesFor(activeActor?.kind);
              {active_view_declaration}
              function reportError() {{ setFeedback({{tone: "error", message: "We could not complete that request. Try again."}}); }}
              async function load() {{
                if (!signedIn) return;
                try {{
                  setRecords(await api(RECORD_PATH));
                  if (activeActor?.kind === "auditor" || activeActor?.kind === "observer") setAuditEvents(await api("/audit-events"));
                }} catch {{ reportError(); }}
              }}
              useEffect(() => {{ void load(); }}, [signedIn, actor]);
              useEffect(() => {{ if (confirmation) window.requestAnimationFrame(() => confirmationDialog.current?.focus()); }}, [confirmation]);
              useEffect(() => {{ if (feedback?.tone === "error") window.requestAnimationFrame(() => feedbackTarget.current?.focus()); }}, [feedback]);
              {route_fallback_effect}
              async function signIn() {{
                try {{
                  setFeedback(null);
                  await api("/session/sign-in", {{method: "POST", body: JSON.stringify({{username: actor, password: `demo-${{actor}}`}})}});
                  setSignedIn(true);
                  setActiveView("/");
                }} catch {{ reportError(); }}
              }}
              function switchRole() {{ setSignedIn(false); setRecords([]); setAuditEvents([]); setFeedback(null); setConfirmation(null); setActiveView("/"); }}
              async function submit(form: FormData) {{
                try {{ setFeedback(null); await api(RECORD_PATH, {{method: "POST", body: JSON.stringify(Object.fromEntries(form.entries()))}}); await load(); setActiveView("/my-records"); setFeedback({{tone: "success", message: "Request submitted."}}); }} catch {{ reportError(); }}
              }}
              function requestDecision(id: string, decision: "approved" | "rejected") {{
                decisionOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                const request = pending.find((candidate) => candidate.id === id);
                setConfirmation({{id, decision, summary: request?.summary ?? "Pending request"}});
              }}
              function cancelDecision() {{
                setConfirmation(null);
                window.requestAnimationFrame(() => decisionOrigin.current?.focus());
              }}
              async function confirmDecision() {{
                if (!confirmation || decisionPending) return;
                setDecisionPending(true);
                try {{
                  setFeedback(null);
                  await api(`${{RECORD_PATH}}/${{confirmation.id}}/decision`, {{method: "POST", body: JSON.stringify({{decision: confirmation.decision}})}});
                  setConfirmation(null);
                  await load();
                  setFeedback({{tone: "success", message: confirmation.decision === "approved" ? "Request approved." : "Request rejected."}});
                  window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Approval queue"]')?.focus());
                }} catch {{ setConfirmation(null); reportError(); }} finally {{ setDecisionPending(false); }}
              }}
              if (!signedIn) return <main className="fp-login" data-factory-ui={json.dumps(factory_ui_version)} data-theme={{theme}}><header className="fp-topbar"><div className="fp-identity"><strong>Local preview</strong><small>Sign in to continue</small></div><button className="fp-secondary" type="button" aria-label={{theme === "light" ? "Switch to dark theme" : "Switch to light theme"}} onClick={{() => setTheme((current) => current === "light" ? "dark" : "light")}}>{{theme === "light" ? "Dark" : "Light"}}</button></header><section className="fp-card"><div className="fp-card-body">{signed_out_account_control}</div></section><GovernedFeedback feedback={{feedback}} target={{feedbackTarget}} /><LoginPage onSignIn={{() => void signIn()}} /></main>;
              const requests = records.map((record) => ({{id: record.id, status: record.status, summary: summaryFor(record.payload)}}));
              const pending = records.filter((record) => record.status === "pending").map((record) => ({{id: record.id, summary: summaryFor(record.payload)}}));
              return <div className="fp-app" data-factory-ui={json.dumps(factory_ui_version)} data-theme={{theme}}><div className="fp-frame"><header className="fp-topbar"><div className="fp-identity"><strong>{{activeActor?.label ?? "Local preview"}}</strong><small>Local preview</small></div><button className="fp-secondary" type="button" aria-label={{theme === "light" ? "Switch to dark theme" : "Switch to light theme"}} onClick={{() => setTheme((current) => current === "light" ? "dark" : "light")}}>{{theme === "light" ? "Dark" : "Light"}}</button></header><main className="fp-workspace"><nav className="fp-nav" aria-label="Primary navigation">{{allowedRoutes.map((route) => <button aria-current={{activeView === route.href ? "page" : undefined}} key={{route.href}} onClick={{() => setActiveView(route.href)}} type="button">{{route.label}}</button>)}}</nav><div className="fp-rolebar"><label>Signed in as<select value={{actor}} onChange={{(event) => (setActor(event.target.value), switchRole())}}>{{ACTORS.map((candidate) => <option key={{candidate.id}} value={{candidate.id}}>{{candidate.label}}</option>)}}</select></label><button className="fp-icon-button" type="button" aria-label="Switch role" onClick={{switchRole}}>Sign out</button></div><GovernedFeedback feedback={{feedback}} target={{feedbackTarget}} /><div className="fp-app-content">{{activeView === "/" && <section aria-label="Home"><HomePage /></section>}}{{activeView === "/submit" && <section aria-label="Submit request"><ApprovalForm onSubmit={{(form) => void submit(form)}} /></section>}}{{activeView === "/my-records" && <section aria-label="My requests"><MyRequests requests={{requests}} /></section>}}{{activeView === "/approval-queue" && <section aria-label="Approval queue" tabIndex={{-1}}><ApprovalQueue requests={{pending}} onDecision={{(id, decision) => requestDecision(id, decision)}}{approval_queue_pending_prop} /></section>}}{{activeView === "/audit" && <section aria-label="Audit"><AuditLog events={{auditEvents.map((event) => ({{id: event.id, action: event.action, actor: event.actor, occurredAt: event.created_at}}))}} /></section>}}{{activeView === "/profile" && <section aria-label="Profile"><p className="fp-card-meta">Read only</p><ProfilePage /></section>}}{{activeView === "/settings" && <section aria-label="Settings"><p className="fp-card-meta">Read only</p><SystemSettingsPage /></section>}}</div>{{confirmation && <div className="fp-confirmation" ref={{confirmationDialog}} role="dialog" aria-labelledby="decision-title" aria-modal="true" tabIndex={{-1}} onKeyDown={{(event) => {{ if (event.key === "Escape") cancelDecision(); }}}}><h2 id="decision-title">Confirm {{confirmation.decision}}</h2><p>{{confirmation.summary}}</p><div className="fp-actions"><button className="fp-secondary" type="button" onClick={{cancelDecision}} disabled={{decisionPending}}>Cancel</button><button className="fp-primary" type="button" onClick={{() => void confirmDecision()}} disabled={{decisionPending}} aria-busy={{decisionPending}}>Confirm</button></div></div>}}</main></div></div>;
            }}
            ''')
        if use_application_shell:
            page = re.sub(
                rf'return <div className="fp-app" data-factory-ui="{re.escape(factory_ui_version)}" data-theme=\{{theme\}}><div className="fp-frame"><header.*?</nav>',
                signed_in_shell_open,
                page,
                count=1,
                flags=re.DOTALL,
            ).replace("</main></div></div>;\n}", f"{signed_in_shell_close};\n}}", 1)
        if compact_workspace:
            page = page.replace(
                "const confirmationDialog = useRef<HTMLDivElement>(null);",
                "const confirmationDialog = useRef<HTMLDivElement>(null);\n  const confirmationCancel = useRef<HTMLButtonElement>(null);",
            ).replace(
                "confirmationDialog.current?.focus()",
                "confirmationCancel.current?.focus()",
            ).replace(
                "\n  if (!signedIn) return <main",
                """
  function trapConfirmationFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); if (!decisionPending) cancelDecision(); return; }
    if (event.key !== "Tab") return;
    const controls = confirmationDialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], select:not([disabled]), input:not([disabled])') ?? [];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  if (!signedIn) return <main""",
                1,
            ).replace(
                '<div className="fp-confirmation" ref={confirmationDialog}',
                '<div className="fp-confirmation-backdrop" role="presentation"><div className="fp-confirmation" ref={confirmationDialog}',
            ).replace(
                'tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") cancelDecision(); }}>',
                'tabIndex={-1} onKeyDown={trapConfirmationFocus}>',
            ).replace(
                '<button className="fp-secondary" type="button" onClick={cancelDecision}',
                '<button className="fp-secondary" type="button" ref={confirmationCancel} onClick={cancelDecision}',
            ).replace(
                '</div>}</ApplicationShell>',
                '</div></div>}</ApplicationShell>',
                1,
            )
            page = page.replace(
                '<button className="fp-icon-button" type="button" aria-label="Switch role" onClick={switchRole}>Sign out</button>',
                "",
            )
        if auth_safe_candidate:
            # This source transformation is intentionally applied only after the
            # common page has been rendered.  The historic branch therefore keeps
            # its exact emitted client source while 2.4 receives the session epoch.
            page = page.replace(
                'async function api(path: string, init?: RequestInit) { const response = await fetch(`${API_BASE_URL}${path}`, {...init, credentials: "include", headers: {"Content-Type": "application/json", ...init?.headers}}); if (!response.ok) throw new Error(`Request failed with status ${response.status}`); return response.json(); }',
                'async function api(path: string, init?: RequestInit, signal?: AbortSignal) { const response = await fetch(`${API_BASE_URL}${path}`, {...init, signal, credentials: "include", headers: {"Content-Type": "application/json", ...init?.headers}}); if (!response.ok) throw new Error(`Request failed with status ${response.status}`); return response.json(); }',
            ).replace(
                '  const decisionOrigin = useRef<HTMLElement | null>(null);\n  const activeActor',
                '''  const decisionOrigin = useRef<HTMLElement | null>(null);
  const sessionGeneration = useRef(0);
  const requestAbortController = useRef<AbortController | null>(null);
  const activeActor''',
            )
            page = re.sub(
                r'  function reportError\(\) \{.*?\n  useEffect\(\(\) => \{ void load\(\); \}, \[signedIn, actor\]\);',
                '''  function reportError() { setFeedback({tone: "error", message: "We could not complete that request. Try again."}); }
  function generationMatches(generation: number, sessionActor: string) { return sessionGeneration.current === generation && actor === sessionActor; }
  function sessionIsCurrent(generation: number, sessionActor: string) { return signedIn && generationMatches(generation, sessionActor); }
  function beginRequest() { requestAbortController.current?.abort(); const controller = new AbortController(); requestAbortController.current = controller; return controller; }
  function invalidateSession() { sessionGeneration.current += 1; requestAbortController.current?.abort(); requestAbortController.current = null; }
  async function load(generation = sessionGeneration.current, sessionActor = actor) {
    if (!signedIn || !sessionIsCurrent(generation, sessionActor)) return false;
    const controller = beginRequest();
    const sessionKind = ACTORS.find((candidate) => candidate.id === sessionActor)?.kind;
    try {
      const nextRecords = await api(RECORD_PATH, undefined, controller.signal);
      if (!sessionIsCurrent(generation, sessionActor)) return false;
      setRecords(nextRecords);
      if (sessionKind === "auditor" || sessionKind === "observer") {
        const nextAuditEvents = await api("/audit-events", undefined, controller.signal);
        if (!sessionIsCurrent(generation, sessionActor)) return false;
        setAuditEvents(nextAuditEvents);
      }
      return true;
    } catch {
      if (sessionIsCurrent(generation, sessionActor)) reportError();
      return false;
    }
  }
  useEffect(() => { void load(sessionGeneration.current, actor); }, [signedIn, actor]);''',
                page,
                count=1,
                flags=re.DOTALL,
            )
            page = re.sub(
                r'  async function signIn\(\) \{.*?\n  function requestDecision',
                '''  async function signIn() {
    const generation = sessionGeneration.current + 1;
    const sessionActor = actor;
    sessionGeneration.current = generation;
    const controller = beginRequest();
    try {
      setFeedback(null);
      await api("/session/sign-in", {method: "POST", body: JSON.stringify({username: actor, password: `demo-${actor}`})}, controller.signal);
      if (!generationMatches(generation, sessionActor)) return;
      setSignedIn(true);
      setActiveView("/");
    } catch { if (generationMatches(generation, sessionActor)) reportError(); }
  }
  function switchRole() { invalidateSession(); setSignedIn(false); setRecords([]); setAuditEvents([]); setFeedback(null); setConfirmation(null); setDecisionPending(false); setActiveView("/"); }
  async function submit(form: FormData) {
    const generation = sessionGeneration.current;
    const sessionActor = actor;
    const controller = beginRequest();
    try {
      setFeedback(null);
      await api(RECORD_PATH, {method: "POST", body: JSON.stringify(Object.fromEntries(form.entries()))}, controller.signal);
      if (!sessionIsCurrent(generation, sessionActor)) return;
      const refreshed = await load(generation, sessionActor);
      if (!refreshed || !sessionIsCurrent(generation, sessionActor)) return;
      setActiveView("/my-records");
      setFeedback({tone: "success", message: "Request submitted."});
    } catch { if (sessionIsCurrent(generation, sessionActor)) reportError(); }
  }
  function requestDecision''',
                page,
                count=1,
                flags=re.DOTALL,
            )
            page = re.sub(
                r'  async function confirmDecision\(\) \{.*?\n  \}\n  function trapConfirmationFocus',
                '''  async function confirmDecision() {
    if (!confirmation || decisionPending) return;
    const decision = confirmation;
    const generation = sessionGeneration.current;
    const sessionActor = actor;
    const controller = beginRequest();
    setDecisionPending(true);
    try {
      setFeedback(null);
      await api(`${RECORD_PATH}/${decision.id}/decision`, {method: "POST", body: JSON.stringify({decision: decision.decision})}, controller.signal);
      if (!sessionIsCurrent(generation, sessionActor)) return;
      setConfirmation(null);
      const refreshed = await load(generation, sessionActor);
      if (!refreshed || !sessionIsCurrent(generation, sessionActor)) return;
      setFeedback({tone: "success", message: decision.decision === "approved" ? "Request approved." : "Request rejected."});
      window.requestAnimationFrame(() => { if (sessionIsCurrent(generation, sessionActor)) document.querySelector<HTMLElement>('[aria-label="Approval queue"]')?.focus(); });
    } catch {
      if (sessionIsCurrent(generation, sessionActor)) { setConfirmation(null); reportError(); }
    } finally { if (sessionIsCurrent(generation, sessionActor)) setDecisionPending(false); }
  }
  function trapConfirmationFocus''',
                page,
                count=1,
                flags=re.DOTALL,
            )
        if filter_available_routes:
            page = page.replace("activeView ===", "resolvedActiveView ===")
        return page

    @staticmethod
    def _legacy_frontend_page(
        record_path: str,
        actors: list[dict[str, str]],
        submitter: str,
        field_labels: dict[str, str],
    ) -> str:
        return textwrap.dedent(f'''\
            "use client";
            import {{ useEffect, useState }} from "react";
            import {{ ApplicationShell }} from "../app-shell/ApplicationShell";
            import {{ ApprovalForm }} from "../features/approval-form/ApprovalForm";
            import {{ ApprovalQueue }} from "../features/approval-queue/ApprovalQueue";
            import {{ AuditLog }} from "../features/audit/AuditLog";
            import {{ MyRequests }} from "../features/my-requests/MyRequests";
            import {{ HomePage }} from "../routes/home/HomePage";
            import {{ LoginPage }} from "../routes/login/LoginPage";
            import {{ ProfilePage }} from "../routes/profile/ProfilePage";
            import {{ SystemSettingsPage }} from "../routes/system-settings/SystemSettingsPage";
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
            const RECORD_PATH = {json.dumps(record_path)};
            const ACTORS = {_canonical(actors)};
            const INITIAL_ACTOR = {json.dumps(submitter)};
            const FIELD_LABELS: Record<string, string> = {_canonical(field_labels)};
            function summaryFor(payload: Record<string, unknown>) {{ return Object.entries(payload).map(([key, value]) => `${{FIELD_LABELS[key] ?? key}}: ${{String(value)}}`).join(" · "); }}
            async function api(path: string, init?: RequestInit) {{ const response = await fetch(`${{API_BASE_URL}}${{path}}`, {{...init, credentials: "include", headers: {{"Content-Type": "application/json", ...init?.headers}}}}); if (!response.ok) throw new Error(`Request failed with status ${{response.status}}`); return response.json(); }}
            export default function ComposedApprovalApplication() {{
              const [actor, setActor] = useState(INITIAL_ACTOR); const [signedIn, setSignedIn] = useState(false); const [records, setRecords] = useState<any[]>([]); const [auditEvents, setAuditEvents] = useState<any[]>([]); const activeActor = ACTORS.find((candidate) => candidate.id === actor);
              async function load() {{ if (!signedIn) return; setRecords(await api(RECORD_PATH)); if (activeActor?.kind === "auditor" || activeActor?.kind === "observer") setAuditEvents(await api("/audit-events")); }}
              useEffect(() => {{ void load(); }}, [signedIn, actor]);
              async function signIn() {{ await api("/session/sign-in", {{method: "POST", body: JSON.stringify({{username: actor, password: `demo-${{actor}}`}})}}); setSignedIn(true); }}
              function switchRole() {{ setSignedIn(false); setRecords([]); setAuditEvents([]); }}
              async function submit(form: FormData) {{ await api(RECORD_PATH, {{method: "POST", body: JSON.stringify(Object.fromEntries(form.entries()))}}); await load(); }}
              async function decide(id: string, decision: "approved" | "rejected") {{ await api(`${{RECORD_PATH}}/${{id}}/decision`, {{method: "POST", body: JSON.stringify({{decision}})}}); await load(); }}
              if (!signedIn) return <ApplicationShell><main className="fp-login"><div className="fp-card"><div className="fp-card-body"><label className="fp-field">Preview role<select value={{actor}} onChange={{(event) => setActor(event.target.value)}}>{{ACTORS.map((candidate) => <option key={{candidate.id}} value={{candidate.id}}>{{candidate.label}}</option>)}}</select></label></div></div><LoginPage onSignIn={{() => void signIn()}} /></main></ApplicationShell>;
              const requests = records.map((record) => ({{id: record.id, status: record.status, summary: summaryFor(record.payload)}})); const pending = records.filter((record) => record.status === "pending").map((record) => ({{id: record.id, summary: summaryFor(record.payload)}}));
              return <ApplicationShell><HomePage /><div className="fp-rolebar"><label>Signed in as<select value={{actor}} onChange={{(event) => (setActor(event.target.value), switchRole())}}>{{ACTORS.map((candidate) => <option key={{candidate.id}} value={{candidate.id}}>{{candidate.label}}</option>)}}</select></label><button className="fp-icon-button" type="button" aria-label="Switch role or sign out" onClick={{switchRole}}>×</button></div><div className="fp-app-content"><div className="fp-main">{{activeActor?.kind === "submitter" && <section id="submit"><ApprovalForm onSubmit={{(form) => void submit(form)}} /></section>}}<section id="my-records"><MyRequests requests={{requests}} /></section>{{activeActor?.kind === "approver" && <section id="approval-queue"><ApprovalQueue requests={{pending}} onDecision={{(id, decision) => void decide(id, decision)}} /></section>}}{{(activeActor?.kind === "auditor" || activeActor?.kind === "observer") && <section id="audit"><AuditLog events={{auditEvents.map((event) => ({{id: event.id, action: event.action, actor: event.actor, occurredAt: event.created_at}}))}} /></section>}}</div><aside className="fp-side"><ProfilePage /><SystemSettingsPage /></aside></div></ApplicationShell>;
            }}
            ''')

    @staticmethod
    def _render_contribution(
        *,
        package: RegisteredComponent,
        contribution: dict[str, Any],
        component_input: dict[str, Any],
    ) -> bytes:
        try:
            template = package.template_bytes[contribution["source"]].decode("utf-8")
            rendered = render_adapter_template_text(template, contribution, component_input)
        except (KeyError, UnicodeDecodeError, ComponentContractError) as error:
            raise CompositionError("validated adapter template could not be safely materialized") from error
        return rendered.encode("utf-8")
