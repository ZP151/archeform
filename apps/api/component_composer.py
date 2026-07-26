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
            templates = ComponentRegistry._snapshot_templates(self.root, adapter)
        except (ComponentContractError, CompositionError) as error:
            raise CompositionError(f"component package {self.manifest['key']} changed or became invalid after discovery") from error
        if manifest != self.manifest or adapter != self.adapter or templates != self.template_bytes:
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
                package = RegisteredComponent(
                    root=root,
                    manifest=manifest,
                    adapter=adapter,
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
            if package.manifest["lifecycle"] == "golden":
                golden_by_key.setdefault(package.manifest["key"], []).append(package)
        selected: dict[tuple[str, str], RegisteredComponent] = {}

        def add(package: RegisteredComponent) -> None:
            if package.manifest["lifecycle"] != "golden":
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
                raise CompositionError(f"no Golden component is available for {key}")
            if len(candidates) != 1:
                raise CompositionError(f"Golden component selection for {key} is ambiguous")
            add(candidates[0])
        return tuple(sorted(selected.values(), key=lambda package: package.identity))

    def resolve_locks(self, locks: Iterable[dict[str, str]]) -> tuple[RegisteredComponent, ...]:
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
            resolved.append(package)
        return tuple(sorted(resolved, key=lambda package: package.identity))

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
            packages=self._registry.resolve_locks(validated_plan["component_locks"]),
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
                for package in self._registry.resolve_locks(expected["component_locks"])
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
                rendered_files.extend(self._runtime_scaffold_files(expected["validated_inputs"]))
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
                self._runtime_scaffold_files(validated_inputs),
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
        self, inputs: dict[str, dict[str, Any]]
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
            "frontend/app/page.tsx": self._frontend_page(record_path, actor_items, submitter),
            "frontend/app/layout.tsx": self._frontend_layout(shell["product_name"]),
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
    def _frontend_layout(product_name: str) -> str:
        return textwrap.dedent(f'''\
            import type {{ Metadata }} from "next";
            import type {{ ReactNode }} from "react";
            import "./globals.css";
            export const metadata: Metadata = {{ title: {json.dumps(product_name + " approval")}, description: "A bounded local Factory Pilot preview" }};
            export default function RootLayout({{ children }}: Readonly<{{ children: ReactNode }}>) {{ return <html lang="en"><body>{{children}}</body></html>; }}
            ''')

    @staticmethod
    def _frontend_page(record_path: str, actors: list[dict[str, str]], submitter: str) -> str:
        return textwrap.dedent(f'''\
            "use client";
            import {{ FormEvent, useEffect, useState }} from "react";
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
            async function api(path: string, init?: RequestInit) {{ const response = await fetch(`${{API_BASE_URL}}${{path}}`, {{...init, credentials: "include", headers: {{"Content-Type": "application/json", ...init?.headers}}}}); if (!response.ok) throw new Error(`Request failed with status ${{response.status}}`); return response.json(); }}
            export default function ComposedApprovalApplication() {{
              const [actor, setActor] = useState(INITIAL_ACTOR); const [signedIn, setSignedIn] = useState(false); const [records, setRecords] = useState<any[]>([]); const [auditEvents, setAuditEvents] = useState<any[]>([]); const activeActor = ACTORS.find((candidate) => candidate.id === actor);
              async function load() {{ if (!signedIn) return; setRecords(await api(RECORD_PATH)); if (activeActor?.kind === "auditor" || activeActor?.kind === "observer") setAuditEvents(await api("/audit-events")); }}
              useEffect(() => {{ void load(); }}, [signedIn, actor]);
              async function signIn() {{ await api("/session/sign-in", {{method: "POST", body: JSON.stringify({{username: actor, password: `demo-${{actor}}`}})}}); setSignedIn(true); }}
              function switchRole() {{ setSignedIn(false); setRecords([]); setAuditEvents([]); }}
              async function submit(form: FormData) {{ await api(RECORD_PATH, {{method: "POST", body: JSON.stringify(Object.fromEntries(form.entries()))}}); await load(); }}
              async function decide(id: string, decision: "approved" | "rejected") {{ await api(`${{RECORD_PATH}}/${{id}}/decision`, {{method: "POST", body: JSON.stringify({{decision}})}}); await load(); }}
              if (!signedIn) return <div className="shell"><label>Demo role<select value={{actor}} onChange={{(event) => setActor(event.target.value)}}>{{ACTORS.map((candidate) => <option key={{candidate.id}} value={{candidate.id}}>{{candidate.label}}</option>)}}</select></label><LoginPage onSignIn={{() => void signIn()}} /></div>;
              const requests = records.map((record) => ({{id: record.id, status: record.status, summary: JSON.stringify(record.payload)}})); const pending = records.filter((record) => record.status === "pending").map((record) => ({{id: record.id, summary: JSON.stringify(record.payload)}}));
              return <ApplicationShell><div className="shell"><button type="button" className="secondary" aria-label="Switch role or sign out" onClick={{switchRole}}>Switch role</button><section id="home" className="panel"><HomePage /></section>{{activeActor?.kind === "submitter" && <section id="submit" className="panel"><ApprovalForm onSubmit={{(form) => void submit(form)}} /></section>}}<section id="my-records" className="panel"><MyRequests requests={{requests}} /></section>{{activeActor?.kind === "approver" && <section id="approval-queue" className="panel"><ApprovalQueue requests={{pending}} onDecision={{(id, decision) => void decide(id, decision)}} /></section>}}{{(activeActor?.kind === "auditor" || activeActor?.kind === "observer") && <section id="audit" className="panel"><AuditLog events={{auditEvents.map((event) => ({{id: event.id, action: event.action, actor: event.actor, occurredAt: event.created_at}}))}} /></section>}}<section id="profile" className="panel"><ProfilePage /></section><section id="system-settings" className="panel"><SystemSettingsPage /></section></div></ApplicationShell>;
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
