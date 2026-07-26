"""Local control-plane domain logic for VNext and legacy compatibility.

The VNext entry point delegates requirement interpretation to an injected,
schema-bound provider, then owns validation, approval state, and catalog
lineage. It never invokes shell or container commands; local execution remains
the responsibility of the separate Executor.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import textwrap
from stat import FILE_ATTRIBUTE_REPARSE_POINT, S_ISDIR, S_ISREG
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .application_definition import DefinitionValidationError, definition_checksum, validate_definition
from .component_composer import ComponentComposer, ComponentRegistry, CompositionError
from .llm_provider import OpenAIRequirementToDefinitionProvider, ProviderError, RequirementToDefinitionProvider


class ControlPlaneError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


DIGEST_PATTERN = re.compile(r"sha256:[0-9a-f]{64}\Z")
COMPONENT_KEY_PATTERN = re.compile(r"[a-z][a-z0-9.-]{1,127}\Z")
SEMVER_PATTERN = re.compile(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\Z")
SECRET_ASSIGNMENT_PATTERN = re.compile(r"\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+", re.IGNORECASE)
GOLDEN_COMPONENT_CAPABILITIES = (
    ("frontend.admin-shell", "responsive-web"),
    ("backend.fastapi-crud", "backend.rest-api"),
    ("auth.rbac-local", "auth.rbac-local"),
    ("workflow.single-level-approval", "approval.workflow"),
    ("ops.audit-log", "ops.audit-log"),
    ("data.postgres-compose", "data.postgresql"),
)
SUPPORTED_COMPONENT_FIELD_TYPES = frozenset({"string", "number", "date", "enum"})
SUPPORTED_COMPONENT_PAGE_KINDS = frozenset({"form", "list", "queue", "audit"})
ARTIFACT_CHECKLIST = [
    "application-definition.json",
    "component-lock.json",
    "render-manifest.json",
    "run-summary.json",
    "executor-request.json",
]
COMPOSABLE_ARTIFACT_CHECKLIST = [
    "application-definition.json",
    "component-lock.json",
    "composition-manifest.json",
    "render-manifest.json",
    "run-summary.json",
    "executor-request.json",
]
COMPOSABLE_APPROVAL_COMPONENT_KEYS = (
    "backend.rbac",
    "backend.record-api",
    "backend.session-auth",
    "data.postgres-runtime",
    "ops.audit-log",
    "ui.app-shell",
    "ui.approval-form",
    "ui.approval-queue",
    "ui.home-page",
    "ui.login-page",
    "ui.my-requests",
    "ui.profile-page",
    "ui.system-settings-page",
    "workflow.single-level-approval",
)
RUN_ID_PATTERN = re.compile(r"run_[A-Za-z0-9_-]{32}\Z")
EXECUTOR_HEARTBEAT_MAX_AGE_SECONDS = 10
EXECUTOR_STATUS_RELATIVE_PATH = "evidence/executor-status.json"
SMOKE_EVIDENCE_RELATIVE_PATH = "evidence/smoke-evidence.json"
EXECUTOR_TERMINAL_RELATIVE_PATH = "executor-terminal.json"
MAX_EXECUTOR_STATUS_BYTES = 100_000
EXECUTOR_KEY_BYTES = 32


def default_catalog_path() -> Path:
    """Return the one canonical catalog; no in-code fallback exists."""
    return Path(__file__).resolve().parents[2] / "packages" / "catalog" / "components.json"


def load_golden_catalog(path: str | Path | None = None) -> tuple[dict[str, Any], ...]:
    """Load and validate the sole supported component catalog source.

    Failing closed here is intentional: an invalid or absent manifest must never
    cause the planner to select an implicit built-in component.
    """
    catalog_path = Path(path or default_catalog_path()).resolve()
    try:
        manifest = json.loads(catalog_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"invalid component catalog at {catalog_path}: {error}") from error
    if not isinstance(manifest, list) or not manifest:
        raise RuntimeError("component catalog must be a non-empty JSON array")
    required = {
        "key",
        "version",
        "category",
        "trust_level",
        "capabilities",
        "provides",
        "requires",
        "input_contract",
        "selection_explanation",
        "artifact_digest",
    }
    keys: set[str] = set()
    capability_owners: dict[str, str] = {}
    validated: list[dict[str, Any]] = []
    for index, component in enumerate(manifest):
        if not isinstance(component, dict) or set(component) != required:
            raise RuntimeError(f"component catalog entry {index} has an invalid schema")
        key = component["key"]
        if not isinstance(key, str) or not COMPONENT_KEY_PATTERN.fullmatch(key) or key in keys:
            raise RuntimeError(f"component catalog entry {index} has an invalid or duplicate key")
        if not isinstance(component["version"], str) or not SEMVER_PATTERN.fullmatch(component["version"]):
            raise RuntimeError(f"component catalog entry {index} has an invalid version")
        if not isinstance(component["category"], str) or not component["category"]:
            raise RuntimeError(f"component catalog entry {index} has an invalid category")
        if component["trust_level"] != "golden":
            raise RuntimeError(f"component catalog entry {index} is not golden")
        for field in ("capabilities", "provides", "requires"):
            if not isinstance(component[field], list) or not all(isinstance(item, str) and item for item in component[field]):
                raise RuntimeError(f"component catalog entry {index} has invalid {field}")
        if not component["provides"] or len(component["provides"]) != len(set(component["provides"])):
            raise RuntimeError(f"component catalog entry {index} has invalid provides")
        for capability in component["provides"]:
            if capability in capability_owners:
                raise RuntimeError(
                    f"duplicate capability provider for {capability}: "
                    f"{capability_owners[capability]} and {key}"
                )
            capability_owners[capability] = key
        input_contract = component["input_contract"]
        if not isinstance(input_contract, dict) or set(input_contract) != {
            "profile",
            "workflow",
            "supported_field_types",
            "required_page_kinds",
        }:
            raise RuntimeError(f"component catalog entry {index} has an invalid input contract")
        if input_contract["profile"] != "internal-approval-app" or input_contract["workflow"] != "approval":
            raise RuntimeError(f"component catalog entry {index} has an incompatible profile contract")
        field_types = input_contract["supported_field_types"]
        page_kinds = input_contract["required_page_kinds"]
        if (
            not isinstance(field_types, list)
            or not field_types
            or len(field_types) != len(set(field_types))
            or not set(field_types).issubset(SUPPORTED_COMPONENT_FIELD_TYPES)
        ):
            raise RuntimeError(f"component catalog entry {index} has invalid supported field types")
        if (
            not isinstance(page_kinds, list)
            or not page_kinds
            or len(page_kinds) != len(set(page_kinds))
            or not set(page_kinds).issubset(SUPPORTED_COMPONENT_PAGE_KINDS)
        ):
            raise RuntimeError(f"component catalog entry {index} has invalid required page kinds")
        explanation = component["selection_explanation"]
        if (
            not isinstance(explanation, str)
            or not (1 <= len(explanation) <= 200)
            or explanation != explanation.strip()
            or any(markup in explanation for markup in ("<", ">", "\r", "\n"))
        ):
            raise RuntimeError(f"component catalog entry {index} has an invalid selection explanation")
        if not isinstance(component["artifact_digest"], str) or not DIGEST_PATTERN.fullmatch(component["artifact_digest"]):
            raise RuntimeError(f"component catalog entry {index} has an invalid sha256 digest")
        keys.add(key)
        validated.append(json.loads(_canonical(component)))
    expected_keys = [key for key, _ in GOLDEN_COMPONENT_CAPABILITIES]
    if [component["key"] for component in validated] != expected_keys:
        raise RuntimeError("component catalog must contain the six Golden components in canonical order")
    for expected_key, capability in GOLDEN_COMPONENT_CAPABILITIES:
        if capability_owners.get(capability) != expected_key:
            raise RuntimeError(f"missing required capability provider for {capability}")
    for component in validated:
        for requirement in component["requires"]:
            if requirement not in capability_owners:
                raise RuntimeError(f"component {component['key']} requires unavailable capability {requirement}")
    return tuple(validated)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _expires_at(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _checksum(value: Any) -> str:
    return "sha256:" + hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _safe_name(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip()).strip("-")
    return normalized.lower()[:50] or "leave-management"


class ControlPlane:
    """A JSON-file-backed, thread-safe MVP state machine."""

    def __init__(
        self,
        state_path: str | Path | None = None,
        runs_root: str | Path | None = None,
        catalog_path: str | Path | None = None,
        provider: RequirementToDefinitionProvider | None = None,
        executor_key_path: str | Path | None = None,
        composable_enabled: bool = False,
        component_package_root: str | Path | None = None,
    ) -> None:
        app_root = Path(__file__).resolve().parent
        self.state_path = Path(state_path or app_root / "state" / "control-plane.json").resolve()
        self.runs_root = Path(runs_root or app_root / "runs").resolve()
        self.executor_key_path = Path(
            executor_key_path or self.state_path.with_name("executor.key")
        ).resolve()
        self._executor_key = self._load_or_create_executor_key()
        self._executor_key_id = hashlib.sha256(self._executor_key).hexdigest()[:16]
        self.template_root = (Path(__file__).resolve().parents[2] / "packages" / "templates" / "leave-approval").resolve()
        self._catalog = load_golden_catalog(catalog_path)
        self.composable_enabled = composable_enabled
        self.component_package_root = Path(
            component_package_root or Path(__file__).resolve().parents[2] / "packages" / "components"
        ).resolve()
        self._component_composer = (
            ComponentComposer(ComponentRegistry(self.component_package_root))
            if self.composable_enabled
            else None
        )
        self.provider = provider or OpenAIRequirementToDefinitionProvider()
        self._lock = threading.RLock()
        self._state = self._load()

    def _load_or_create_executor_key(self) -> bytes:
        self.executor_key_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            metadata = self.executor_key_path.lstat()
        except FileNotFoundError:
            metadata = None
        if metadata is not None:
            attributes = getattr(metadata, "st_file_attributes", 0)
            if (
                self.executor_key_path.is_symlink()
                or bool(attributes & FILE_ATTRIBUTE_REPARSE_POINT)
                or not S_ISREG(metadata.st_mode)
            ):
                raise RuntimeError("Executor key path is unsafe")
            key = self.executor_key_path.read_bytes()
            if len(key) != EXECUTOR_KEY_BYTES:
                raise RuntimeError("Executor key has an invalid length")
            return key
        key = secrets.token_bytes(EXECUTOR_KEY_BYTES)
        try:
            descriptor = os.open(
                self.executor_key_path,
                os.O_WRONLY | os.O_CREAT | os.O_EXCL,
                0o600,
            )
        except FileExistsError:
            return self._load_or_create_executor_key()
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(key)
        return key

    def _executor_signature(self, value: Any) -> str:
        return "hmac-sha256:" + hmac.new(
            self._executor_key,
            _canonical(value).encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _valid_executor_signature(self, value: Any, signature: object) -> bool:
        return isinstance(signature, str) and hmac.compare_digest(
            self._executor_signature(value),
            signature,
        )

    def _load(self) -> dict[str, Any]:
        if self.state_path.exists():
            try:
                parsed = json.loads(self.state_path.read_text(encoding="utf-8"))
                if isinstance(parsed, dict) and "projects" in parsed:
                    parsed.setdefault("versions", {})
                    parsed.setdefault("plans", {})
                    parsed.setdefault("runs", {})
                    return parsed
            except (OSError, json.JSONDecodeError):
                pass
        return {"projects": {}, "versions": {}, "plans": {}, "runs": {}}

    def _save(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        temp = self.state_path.with_suffix(".tmp")
        temp.write_text(_canonical(self._state), encoding="utf-8")
        temp.replace(self.state_path)

    def _new_id(self, kind: str) -> str:
        """Opaque IDs prevent another local browser user from enumerating records."""
        prefixes = {"project": "prj", "requirement": "req", "ir": "ir", "version": "ver", "plan": "plan", "run": "run"}
        return f"{prefixes[kind]}_{secrets.token_urlsafe(24)}"

    def catalog(self) -> list[dict[str, Any]]:
        return [json.loads(_canonical(component)) for component in self._catalog]

    def create_project(self, name: str, brief: str) -> dict[str, Any]:
        """Create a VNext project and first draft definition through the configured provider."""
        if not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9-]{2,62}", name):
            raise ControlPlaneError(422, "invalid_project_name", "name must match ^[a-z][a-z0-9-]{2,62}$")
        if not isinstance(brief, str) or brief != brief.strip() or not (1 <= len(brief) <= 12_000):
            raise ControlPlaneError(422, "invalid_brief", "brief must be a trimmed string from 1 to 12000 characters")
        if SECRET_ASSIGNMENT_PATTERN.search(brief):
            raise ControlPlaneError(422, "invalid_brief", "remove credentials from the brief before submitting it")
        try:
            generated = self.provider.generate(name, brief)
            definition = validate_definition(generated.candidate)
        except (ProviderError, DefinitionValidationError) as error:
            raise ControlPlaneError(503, "model_unavailable", "the configured model could not produce a valid application definition") from error

        with self._lock:
            project_id = self._new_id("project")
            version_id = self._new_id("version")
            now = _now()
            version = {
                "id": version_id,
                "project_id": project_id,
                "parent_version_id": None,
                "definition": definition,
                "definition_checksum": definition_checksum(definition),
                "brief_checksum": _checksum(brief),
                "provenance": generated.provenance,
                "status": "draft",
                "created_at": now,
                "approved_at": None,
                "approved_by": None,
            }
            project = {
                "id": project_id,
                "name": name,
                "created_at": now,
                "version_ids": [version_id],
                "plan_ids": [],
                "run_ids": [],
            }
            self._state["projects"][project_id] = project
            self._state["versions"][version_id] = version
            self._save()
            return {"project": self._project_detail(project), "version": self._version_view(version)}

    def create_legacy_project(self, name: str, requirement: str) -> dict[str, Any]:
        """Deprecated MVP parser retained only for the legacy HTTP compatibility shim."""
        if not isinstance(name, str) or not name.strip() or len(name) > 100:
            raise ControlPlaneError(422, "invalid_name", "name must be a non-empty string of at most 100 characters")
        if not isinstance(requirement, str) or not requirement.strip() or len(requirement) > 10000:
            raise ControlPlaneError(422, "invalid_requirement", "requirement must be a non-empty string of at most 10000 characters")
        if SECRET_ASSIGNMENT_PATTERN.search(requirement):
            raise ControlPlaneError(422, "secret_detected", "remove credentials from the requirement before submitting it")
        if "leave" not in requirement.lower():
            raise ControlPlaneError(422, "unsupported_profile", "MVP currently supports English leave-approval requirements only")
        with self._lock:
            project_id = self._new_id("project")
            requirement_id = self._new_id("requirement")
            ir_id = self._new_id("ir")
            ir = self._leave_ir(_safe_name(name))
            project = {
                "id": project_id,
                "requirement_id": requirement_id,
                "ir_id": ir_id,
                "name": name.strip(),
                # Raw requirement text is intentionally not persisted. The IR and
                # checksum are sufficient for this deterministic MVP to plan and
                # render a blueprint, which limits accidental credential retention.
                "requirement_checksum": _checksum(requirement.strip()),
                "status": "ir_pending_approval",
                "created_at": _now(),
                "ir": ir,
                "ir_checksum": _checksum(ir),
                "ir_approved_at": None,
                "ir_approved_by": None,
                "plan_id": None,
            }
            self._state["projects"][project_id] = project
            self._save()
            return self._project_view(project)

    @staticmethod
    def _leave_ir(name: str) -> dict[str, Any]:
        """Strict IR v1: values are entirely deterministic and schema-shaped."""
        return {
            "apiVersion": "factory/v1alpha1",
            "kind": "Application",
            "metadata": {"name": name, "version": "0.1.0"},
            "profile": "internal-workflow-app",
            "actors": [{"id": "employee"}, {"id": "manager"}, {"id": "hr_admin"}],
            "entities": [{"id": "leave_request", "fields": [
                {"name": "start_date", "type": "date", "required": True},
                {"name": "end_date", "type": "date", "required": True},
                {"name": "reason", "type": "string", "required": False},
                {"name": "status", "type": "enum", "values": ["draft", "pending", "approved", "rejected"], "required": True},
            ]}],
            "workflows": [{"id": "leave_approval", "trigger": "leave_request.submit", "steps": ["validate", "manager.approve_or_reject", "notify_requester", "audit"]}],
            "assumptions": ["All users are demo accounts.", "The approval flow has exactly one manager decision.", "No cloud deployment is requested."],
            "requirements": {"auth": "rbac", "audit_log": "required", "persistence": "postgresql", "ui": "responsive_web"},
            "constraints": {"target": "local_blueprint", "data_classification": "demo", "auto_deploy": False},
        }

    @staticmethod
    def _project_view(project: dict[str, Any]) -> dict[str, Any]:
        return {key: project[key] for key in ("id", "requirement_id", "ir_id", "name", "status", "created_at", "ir", "ir_checksum", "ir_approved_at", "ir_approved_by", "plan_id")}

    @staticmethod
    def _version_view(version: dict[str, Any]) -> dict[str, Any]:
        keys = ("id", "project_id", "parent_version_id", "definition", "definition_checksum", "brief_checksum", "provenance", "status", "created_at", "approved_at", "approved_by")
        return {key: json.loads(_canonical(version[key])) if isinstance(version[key], (dict, list)) else version[key] for key in keys}

    def _project_detail(self, project: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": project["id"],
            "name": project["name"],
            "created_at": project["created_at"],
            "versions": [self._version_view(self._state["versions"][version_id]) for version_id in project["version_ids"]],
            "plans": [self._vnext_plan_view(self._state["plans"][plan_id]) for plan_id in project["plan_ids"]],
            "runs": [self._run_view(self._state["runs"][run_id]) for run_id in project["run_ids"]],
        }

    def projects(self) -> list[dict[str, Any]]:
        with self._lock:
            summaries: list[dict[str, Any]] = []
            for project in self._state["projects"].values():
                if "version_ids" not in project:
                    continue
                latest_version = self._state["versions"][project["version_ids"][-1]] if project["version_ids"] else None
                latest_run = self._state["runs"][project["run_ids"][-1]] if project["run_ids"] else None
                summaries.append({
                    "id": project["id"], "name": project["name"], "created_at": project["created_at"],
                    "latest_version_id": latest_version["id"] if latest_version else None,
                    "latest_version_status": latest_version["status"] if latest_version else None,
                    "latest_run_status": self._run_view(latest_run)["status"] if latest_run else None,
                })
            return summaries

    def get_project(self, project_id: str) -> dict[str, Any]:
        with self._lock:
            project = self._project(project_id)
            if "version_ids" in project:
                return self._project_detail(project)
            return self._project_view(project)

    def create_version(self, project_id: str, base_version_id: str, definition: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            project = self._project(project_id)
            if "version_ids" not in project:
                raise ControlPlaneError(409, "legacy_project", "legacy projects cannot create VNext definition versions")
            if not isinstance(base_version_id, str):
                raise ControlPlaneError(422, "invalid_base_version_id", "base_version_id must be a string")
            base = self._version(base_version_id)
            if base["project_id"] != project_id:
                raise ControlPlaneError(409, "base_version_wrong_project", "base version belongs to a different project")
            try:
                validated = validate_definition(definition)
            except DefinitionValidationError as error:
                raise ControlPlaneError(422, "invalid_definition", "definition does not meet the approval-app profile") from error
            version_id = self._new_id("version")
            version = {
                "id": version_id,
                "project_id": project_id,
                "parent_version_id": base_version_id,
                "definition": validated,
                "definition_checksum": definition_checksum(validated),
                "brief_checksum": None,
                "provenance": None,
                "status": "draft",
                "created_at": _now(),
                "approved_at": None,
                "approved_by": None,
            }
            self._state["versions"][version_id] = version
            project["version_ids"].append(version_id)
            self._save()
            return self._version_view(version)

    def approve_version(self, version_id: str, actor: str) -> dict[str, Any]:
        actor = self._actor(actor)
        with self._lock:
            version = self._version(version_id)
            if version["status"] == "draft":
                version["status"] = "approved"
                version["approved_at"] = _now()
                version["approved_by"] = actor
                self._save()
            return self._version_view(version)

    def approve_ir(self, project_id: str, actor: str) -> dict[str, Any]:
        actor = self._actor(actor)
        with self._lock:
            project = self._project(project_id)
            if project["ir_approved_at"] is None:
                project["ir_approved_at"] = _now()
                project["ir_approved_by"] = actor
                project["status"] = "ir_approved"
                self._save()
            return self._project_view(project)

    def approve_ir_by_id(self, ir_id: str, actor: str) -> dict[str, Any]:
        return self.approve_ir(self._project_by_ir(ir_id)["id"], actor)

    def create_plan(self, version_or_project_id: str) -> dict[str, Any]:
        """Resolve an approved VNext version, or dispatch the deprecated MVP shim."""
        if version_or_project_id.startswith("ver_"):
            return self.create_plan_for_version(version_or_project_id)
        return self._create_legacy_plan(version_or_project_id)

    def create_plan_for_version(self, version_id: str) -> dict[str, Any]:
        with self._lock:
            version = self._version(version_id)
            if version["status"] != "approved":
                raise ControlPlaneError(409, "version_not_approved", "approve the application definition before creating a component plan")
            definition, verified_definition_checksum = self._verified_definition(version)
            project = self._project(version["project_id"])
            for existing_id in project["plan_ids"]:
                existing = self._state["plans"][existing_id]
                if existing["version_id"] == version_id:
                    return self._vnext_plan_view(existing)
            if self.composable_enabled:
                return self._create_composable_plan_for_version(
                    project=project,
                    version=version,
                    definition=definition,
                    definition_checksum_value=verified_definition_checksum,
                )
            inputs = {
                "roles": [role["id"] for role in definition["roles"]],
                "primary_record": {"id": definition["primary_record"]["id"], "label": definition["primary_record"]["label"], "field_ids": [field["id"] for field in definition["primary_record"]["fields"]]},
                "pages": [page["label"] for page in definition["pages"]],
                "workflow": "approval",
            }
            components = self._resolve_components(definition, inputs)
            plan_id = self._new_id("plan")
            now = _now()
            plan = {
                "id": plan_id, "project_id": project["id"], "version_id": version_id,
                "status": "pending_approval", "components": components,
                "known_profile_limit": "VNext supports one submitter-to-approver approval workflow with append-only audit history.",
                "artifact_checklist": list(ARTIFACT_CHECKLIST),
                "created_at": now, "approved_at": None, "approved_by": None,
            }
            plan["checksum"] = _checksum({
                "definition_checksum": verified_definition_checksum,
                "components": components,
                "known_profile_limit": plan["known_profile_limit"],
                "artifact_checklist": plan["artifact_checklist"],
            })
            self._state["plans"][plan_id] = plan
            project["plan_ids"].append(plan_id)
            self._save()
            return self._vnext_plan_view(plan)

    def _create_composable_plan_for_version(
        self,
        *,
        project: dict[str, Any],
        version: dict[str, Any],
        definition: dict[str, Any],
        definition_checksum_value: str,
    ) -> dict[str, Any]:
        """Map the one approved profile to fixed Golden packages, never model output."""
        if self._component_composer is None:
            raise ControlPlaneError(500, "composable_unavailable", "the component Composer is unavailable")
        try:
            composition = self._component_composer.create_plan(
                application_definition_checksum=definition_checksum_value,
                component_keys=COMPOSABLE_APPROVAL_COMPONENT_KEYS,
                component_inputs=self._composable_component_inputs(definition),
                include_runtime_scaffold=True,
            )
        except CompositionError as error:
            raise ControlPlaneError(
                422,
                "component_incompatible",
                "the approved application definition is incompatible with the Golden component packages",
            ) from error
        plan = {
            "id": self._new_id("plan"),
            "project_id": project["id"],
            "version_id": version["id"],
            "status": "pending_approval",
            "components": composition["component_locks"],
            "composition": composition,
            "known_profile_limit": (
                "Composable Suite supports one submitter-to-approver approval workflow, "
                "append-only audit history, and local-only preview."
            ),
            "artifact_checklist": list(COMPOSABLE_ARTIFACT_CHECKLIST),
            "created_at": _now(),
            "approved_at": None,
            "approved_by": None,
        }
        plan["checksum"] = _checksum({
            "definition_checksum": definition_checksum_value,
            "composition": composition,
            "known_profile_limit": plan["known_profile_limit"],
            "artifact_checklist": plan["artifact_checklist"],
        })
        self._state["plans"][plan["id"]] = plan
        project["plan_ids"].append(plan["id"])
        self._save()
        return self._vnext_plan_view(plan)

    @staticmethod
    def _composable_component_inputs(definition: dict[str, Any]) -> dict[str, dict[str, Any]]:
        """Derive package inputs only from an already validated definition."""
        roles = definition["roles"]
        by_kind = {role["kind"]: role for role in roles}
        submitter = by_kind["submitter"]["id"]
        approver = by_kind["approver"]["id"]
        auditor = by_kind.get("auditor", by_kind.get("observer", by_kind["approver"]))["id"]
        record = definition["primary_record"]
        record_id = record["id"]
        record_label = record["label"]
        record_table = f"{record_id}s"
        record_path = "/" + record_table.replace("_", "-")
        pages = {page["id"]: page["label"] for page in definition["pages"]}
        field_inputs = [
            {
                "id": field["id"],
                "label": field["label"],
                "type": field["type"],
                "required": field["required"],
                **({"options": field["options"]} if field["type"] == "enum" else {}),
            }
            for field in record["fields"]
        ]
        return {
            "backend.session-auth": {
                "allowed_roles": [role["id"] for role in roles],
                "cookie_name": "factory_session",
                "local_users_env": "FACTORY_LOCAL_USERS",
                "signing_key_env": "FACTORY_SESSION_SIGNING_KEY",
                "session_ttl_seconds": 3600,
            },
            "backend.rbac": {"policy_name": "internal-approval"},
            "backend.record-api": {
                "record_label": record_label,
                "record_path": record_path,
                "record_table": record_table,
                "submitter_role": submitter,
            },
            "workflow.single-level-approval": {
                "approver_role": approver,
                "workflow_name": definition["workflow"]["id"],
            },
            "ops.audit-log": {
                "event_prefix": record_id,
                "record_table": record_table,
                "auditor_role": auditor,
            },
            "data.postgres-runtime": {},
            "ui.login-page": {"product_name": record_label + " approval", "sign_in_label": "Sign in"},
            "ui.app-shell": {
                "product_name": record_label + " approval",
                "audit_heading": pages["audit"],
                "navigation": [
                    {"label": pages[page_id], "href": "/" + page_id.replace("_", "-")}
                    for page_id in ("submit", "my_records", "approval_queue", "audit")
                ],
            },
            "ui.home-page": {
                "headline": record_label + " approval",
                "summary": "Submit, review, and audit " + record_label.lower() + " records.",
            },
            "ui.profile-page": {"heading": "My profile", "editable_fields": ["Display name", "Notification preference"]},
            "ui.system-settings-page": {
                "heading": "System settings",
                "settings": [{"key": "approval_workflow", "label": "Single-level approval"}],
            },
            "ui.approval-form": {
                "record_label": record_label,
                "submit_label": pages["submit"],
                "fields": field_inputs,
            },
            "ui.my-requests": {"heading": pages["my_records"], "empty_state": "No " + record_label.lower() + " records yet."},
            "ui.approval-queue": {
                "heading": pages["approval_queue"],
                "approve_label": "Approve",
                "reject_label": "Reject",
            },
        }

    @staticmethod
    def _verified_definition(version: dict[str, Any]) -> tuple[dict[str, Any], str]:
        """Revalidate an immutable version and prove its stored checksum still matches."""
        try:
            definition = validate_definition(version["definition"])
        except (DefinitionValidationError, KeyError, TypeError) as error:
            raise ControlPlaneError(
                409,
                "definition_tampered",
                "the approved application definition no longer matches its validated version",
            ) from error
        actual_checksum = definition_checksum(definition)
        if actual_checksum != version.get("definition_checksum"):
            raise ControlPlaneError(
                409,
                "definition_tampered",
                "the approved application definition no longer matches its recorded checksum",
            )
        return definition, actual_checksum

    def _resolve_components(
        self,
        definition: dict[str, Any],
        inputs: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Resolve the bounded profile to the six compatible Golden components."""
        catalog = self.catalog()
        by_capability = {
            capability: component
            for component in catalog
            for capability in component["provides"]
        }
        definition_field_types = {field["type"] for field in definition["primary_record"]["fields"]}
        definition_page_kinds = {page["kind"] for page in definition["pages"]}
        components: list[dict[str, Any]] = []
        for expected_key, capability in GOLDEN_COMPONENT_CAPABILITIES:
            item = by_capability.get(capability)
            if item is None or item["key"] != expected_key or item["trust_level"] != "golden":
                raise ControlPlaneError(
                    422,
                    "component_incompatible",
                    f"the approved Golden component for {capability} is unavailable",
                )
            contract = item["input_contract"]
            if (
                contract["profile"] != definition["profile"]
                or contract["workflow"] != definition["workflow"]["id"]
                or not definition_field_types.issubset(contract["supported_field_types"])
                or not definition_page_kinds.issubset(contract["required_page_kinds"])
            ):
                raise ControlPlaneError(
                    422,
                    "component_incompatible",
                    f"{item['key']} is incompatible with the approved application definition",
                )
            missing_requirements = [
                required for required in item["requires"] if required not in by_capability
            ]
            if missing_requirements:
                raise ControlPlaneError(
                    422,
                    "component_incompatible",
                    f"{item['key']} has unresolved Golden dependencies",
                )
            selected_for = (
                f"{item['selection_explanation']} "
                f"Configured for {definition['primary_record']['label']}."
            )
            if len(selected_for) > 300:
                raise ControlPlaneError(
                    422,
                    "component_incompatible",
                    f"{item['key']} has an invalid selection explanation",
                )
            components.append({
                "key": item["key"],
                "version": item["version"],
                "artifact_digest": item["artifact_digest"],
                "category": item["category"],
                "trust_level": item["trust_level"],
                "requires": list(item["requires"]),
                "selected_for": selected_for,
                "inputs": json.loads(_canonical(inputs)),
            })
        return components

    def _create_legacy_plan(self, project_id: str) -> dict[str, Any]:
        with self._lock:
            project = self._project(project_id)
            if project["ir_approved_at"] is None:
                raise ControlPlaneError(409, "ir_not_approved", "approve the Application IR before creating a component plan")
            if project["plan_id"]:
                return self._plan_view(self._state["plans"][project["plan_id"]])
            plan_id = self._new_id("plan")
            components = self.catalog()
            selection = [{"key": c["key"], "version": c["version"], "digest": c["artifact_digest"], "category": c["category"]} for c in components]
            steps = [
                {"id": "render-blueprint", "kind": "render", "risk": "low", "requires_approval": True, "expected_artifacts": ["README.md", "application.ir.json", "component-lock.json"]},
                {"id": "record-evidence", "kind": "audit", "risk": "low", "requires_approval": True, "expected_artifacts": ["run-summary.json"]},
            ]
            plan_body = {"schema_version": "factory-plan/v1alpha1", "project_id": project_id, "ir_checksum": project["ir_checksum"], "components": selection, "steps": steps}
            plan = {"id": plan_id, "project_id": project_id, "status": "pending_approval", "created_at": _now(), "approved_at": None, "approved_by": None, "body": plan_body, "checksum": _checksum(plan_body)}
            self._state["plans"][plan_id] = plan
            project["plan_id"] = plan_id
            project["status"] = "plan_pending_approval"
            self._save()
            return self._plan_view(plan)

    def create_plan_for_ir(self, ir_id: str) -> dict[str, Any]:
        return self.create_plan(self._project_by_ir(ir_id)["id"])

    def get_plan(self, plan_id: str) -> dict[str, Any]:
        with self._lock:
            plan = self._plan(plan_id)
            return self._vnext_plan_view(plan) if "version_id" in plan else self._plan_view(plan)

    @staticmethod
    def _plan_view(plan: dict[str, Any]) -> dict[str, Any]:
        return {key: plan[key] for key in ("id", "project_id", "status", "created_at", "approved_at", "approved_by", "body", "checksum")}

    @staticmethod
    def _vnext_plan_view(plan: dict[str, Any]) -> dict[str, Any]:
        keys = ("id", "project_id", "version_id", "status", "checksum", "components", "known_profile_limit", "artifact_checklist", "created_at", "approved_at", "approved_by")
        if "composition" in plan:
            keys = (*keys, "composition")
        return {key: json.loads(_canonical(plan[key])) if isinstance(plan[key], (dict, list)) else plan[key] for key in keys}

    def approve_plan(self, plan_id: str, actor: str) -> dict[str, Any]:
        actor = self._actor(actor)
        with self._lock:
            plan = self._plan(plan_id)
            if "version_id" in plan:
                if plan["status"] == "pending_approval":
                    plan["status"] = "approved"
                    plan["approved_at"] = _now()
                    plan["approved_by"] = actor
                    self._save()
                return self._vnext_plan_view(plan)
            if plan["approved_at"] is None:
                plan["status"] = "approved"
                plan["approved_at"] = _now()
                plan["approved_by"] = actor
                self._project(plan["project_id"])["status"] = "plan_approved"
                self._save()
            return self._plan_view(plan)

    def create_run(self, plan_id: str) -> dict[str, Any]:
        with self._lock:
            plan = self._plan(plan_id)
            if plan["status"] != "approved":
                raise ControlPlaneError(409, "plan_not_approved", "approve the component plan before creating a run")
            if "version_id" in plan:
                version = self._version(plan["version_id"])
                definition, verified_definition_checksum = self._verified_definition(version)
                self._validate_locked_plan(
                    plan,
                    definition,
                    verified_definition_checksum,
                )
                run_id = self._new_id("run")
                run = {
                    "id": run_id,
                    "plan_id": plan_id,
                    "status": "queued",
                    "created_at": _now(),
                    "finished_at": None,
                    "expires_at": _expires_at(30),
                    "phase": "rendering",
                    "stop_reason": None,
                    "preview_url": None,
                    "executor": {"status": "unknown", "message": None, "last_heartbeat_at": None},
                    "log_excerpt": [],
                    "smoke": None,
                    "artifacts": [],
                    "events": [],
                }
                self._event(run, "run.rendering", {"message": "Rendering approved repository-owned application files."})
                output = self._safe_output_path(run_id)
                if "composition" in plan:
                    self._render_composable_application(
                        output,
                        run,
                        plan,
                        version,
                        definition,
                        verified_definition_checksum,
                    )
                else:
                    self._render_vnext_application(
                        output,
                        run,
                        plan,
                        version,
                        definition,
                        verified_definition_checksum,
                    )
                run["phase"] = "queued"
                self._event(run, "run.queued", {"message": "Approved build artifacts are ready for the local Executor."})
                request, authorization = self._prepare_executor_request(
                    output,
                    run,
                    plan,
                    verified_definition_checksum,
                )
                self._state["runs"][run_id] = run
                self._project(plan["project_id"])["run_ids"].append(run_id)
                self._save()
                try:
                    self._publish_executor_request(
                        output,
                        request,
                        authorization,
                    )
                except OSError as error:
                    run["status"] = "failed"
                    run["phase"] = "failed"
                    run["finished_at"] = _now()
                    self._event(
                        run,
                        "run.failed",
                        {"message": "Executor request publication failed."},
                    )
                    self._save()
                    raise ControlPlaneError(
                        500,
                        "executor_request_failed",
                        "the Executor request could not be published",
                    ) from error
                return self._vnext_run_view(run)
            run_id = self._new_id("run")
            run = {"id": run_id, "plan_id": plan_id, "status": "running", "created_at": _now(), "finished_at": None, "events": []}
            self._event(run, "run.started", {"message": "Static blueprint rendering started; no commands are executed."})
            self._state["runs"][run_id] = run
            try:
                output = self._safe_output_path(run_id)
                self._render_blueprint(output, run, plan)
                run["status"] = "succeeded"
                run["finished_at"] = _now()
                self._event(run, "run.succeeded", {"output": str(output), "message": "Blueprint rendered without shell, network, or container execution."})
                self._project(plan["project_id"])["status"] = "blueprint_ready"
            except OSError as error:
                run["status"] = "failed"
                run["finished_at"] = _now()
                self._event(run, "run.failed", {"message": str(error)})
            self._save()
            return self._run_view(run)

    def _validate_locked_plan(
        self,
        plan: dict[str, Any],
        definition: dict[str, Any],
        verified_definition_checksum: str,
    ) -> None:
        if "composition" in plan:
            if self._component_composer is None:
                raise ControlPlaneError(409, "component_plan_incompatible", "the component Composer is unavailable")
            try:
                expected = self._component_composer.create_plan_from_locks(
                    application_definition_checksum=verified_definition_checksum,
                    component_locks=plan["composition"]["component_locks"],
                    component_inputs=self._composable_component_inputs(definition),
                    include_runtime_scaffold=True,
                )
            except (CompositionError, KeyError, TypeError) as error:
                raise ControlPlaneError(
                    409,
                    "component_plan_incompatible",
                    "the approved component plan no longer matches the Golden component packages and definition",
                ) from error
            expected_checksum = _checksum({
                "definition_checksum": verified_definition_checksum,
                "composition": expected,
                "known_profile_limit": plan["known_profile_limit"],
                "artifact_checklist": list(COMPOSABLE_ARTIFACT_CHECKLIST),
            })
            if (
                plan.get("components") != expected["component_locks"]
                or plan.get("composition") != expected
                or plan.get("artifact_checklist") != COMPOSABLE_ARTIFACT_CHECKLIST
                or plan.get("checksum") != expected_checksum
            ):
                raise ControlPlaneError(
                    409,
                    "component_plan_incompatible",
                    "the approved component plan no longer matches the Golden component packages and definition",
                )
            return
        inputs = {
            "roles": [role["id"] for role in definition["roles"]],
            "primary_record": {
                "id": definition["primary_record"]["id"],
                "label": definition["primary_record"]["label"],
                "field_ids": [field["id"] for field in definition["primary_record"]["fields"]],
            },
            "pages": [page["label"] for page in definition["pages"]],
            "workflow": "approval",
        }
        expected_components = self._resolve_components(definition, inputs)
        expected_checksum = _checksum({
            "definition_checksum": verified_definition_checksum,
            "components": expected_components,
            "known_profile_limit": plan["known_profile_limit"],
            "artifact_checklist": list(ARTIFACT_CHECKLIST),
        })
        if (
            plan["components"] != expected_components
            or plan["artifact_checklist"] != ARTIFACT_CHECKLIST
            or plan["checksum"] != expected_checksum
        ):
            raise ControlPlaneError(
                409,
                "component_plan_incompatible",
                "the approved component plan no longer matches the Golden catalog and definition",
            )

    def get_run(self, run_id: str) -> dict[str, Any]:
        with self._lock:
            return self._run_view(self._run(run_id))

    def get_events(self, run_id: str) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._run(run_id)["events"])

    def _run_view(self, run: dict[str, Any]) -> dict[str, Any]:
        if "phase" in run:
            return self._vnext_run_view(run)
        return {key: run[key] for key in ("id", "plan_id", "status", "created_at", "finished_at", "events")}

    def _vnext_run_view(self, run: dict[str, Any]) -> dict[str, Any]:
        merged = self._merge_executor_status(run)
        keys = ("id", "plan_id", "status", "created_at", "finished_at", "expires_at", "phase", "stop_reason", "preview_url", "executor", "log_excerpt", "smoke", "artifacts", "events")
        return {
            key: json.loads(_canonical(merged[key]))
            if isinstance(merged[key], (dict, list))
            else merged[key]
            for key in keys
        }

    def _safe_output_path(self, run_id: str) -> Path:
        if not isinstance(run_id, str) or not RUN_ID_PATTERN.fullmatch(run_id):
            raise ControlPlaneError(400, "invalid_run_id", "invalid run identifier")
        root = self.runs_root.resolve()
        output = (root / run_id / "output").resolve()
        if root != output and root not in output.parents:
            raise ControlPlaneError(400, "unsafe_output_path", "run output is outside the configured runs root")
        return output

    def _render_blueprint(self, output: Path, run: dict[str, Any], plan: dict[str, Any]) -> None:
        project = self._project(plan["project_id"])
        output.mkdir(parents=True, exist_ok=False)
        copied = self._copy_template(self.template_root, output)
        blueprint = {
            "run_id": run["id"],
            "project_id": project["id"],
            "requirement_checksum": project["requirement_checksum"],
            "application_ir_checksum": project["ir_checksum"],
            "component_plan_checksum": plan["checksum"],
            "approvals": {
                "ir": {"actor": project["ir_approved_by"], "at": project["ir_approved_at"]},
                "plan": {"actor": plan["approved_by"], "at": plan["approved_at"]},
            },
            "safety": {"executed_shell": False, "network_downloads": False, "external_components": False},
        }
        files = {
            "application.ir.json": _canonical(project["ir"]) + "\n",
            "component-lock.json": _canonical({"components": plan["body"]["components"], "plan_checksum": plan["checksum"]}) + "\n",
            "backend/api-contract.json": _canonical({
                "openapi": "3.1.0",
                "info": {"title": "Leave approval API", "version": "0.1.0"},
                "paths": {
                    "/health": {"get": {"summary": "Check API and database health"}},
                    "/leave-requests": {
                        "get": {"summary": "List requests visible to the demo actor"},
                        "post": {"summary": "Submit an employee leave request"},
                    },
                    "/leave-requests/{leave_request_id}/decision": {"post": {"summary": "Approve or reject a pending request"}},
                    "/audit-events": {"get": {"summary": "List the append-only audit history"}},
                },
            }) + "\n",
            "frontend/pages.txt": "employee: submit and track leave request\nmanager: approve or reject pending requests\nhr_admin: view all requests and audit history\n",
        }
        for relative, contents in files.items():
            target = (output / relative).resolve()
            if output not in target.parents:
                raise ControlPlaneError(400, "unsafe_blueprint_file", "blueprint file escapes output directory")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(contents, encoding="utf-8")
        (output / "run-summary.json").write_text(_canonical(blueprint) + "\n", encoding="utf-8")
        self._event(run, "blueprint.rendered", {"files": sorted(copied + list(files) + ["run-summary.json"])})

    def _render_composable_application(
        self,
        output: Path,
        run: dict[str, Any],
        plan: dict[str, Any],
        version: dict[str, Any],
        definition: dict[str, Any],
        verified_definition_checksum: str,
    ) -> None:
        """Materialize only the approved component-plan contributions.

        The composable route deliberately does not call the legacy template
        copier or centralized renderer.  Package files are emitted by the
        Registry/Composer under declared slots, then the control plane adds
        immutable lineage evidence needed by the unchanged Executor protocol.
        """
        if self._component_composer is None:
            raise ControlPlaneError(500, "composable_unavailable", "the component Composer is unavailable")
        try:
            observed_output_manifest = self._component_composer.materialize(
                plan=plan["composition"], output_root=output
            )
        except CompositionError as error:
            raise ControlPlaneError(
                409,
                "component_plan_incompatible",
                "the approved component plan could not be safely materialized",
            ) from error
        if observed_output_manifest != plan["composition"]["output_manifest"]:
            raise ControlPlaneError(
                409,
                "component_plan_incompatible",
                "the materialized component output does not match its approved manifest",
            )

        record = definition["primary_record"]
        project = self._project(plan["project_id"])
        self._write_output_file(output, "application-definition.json", _canonical(definition) + "\n")
        self._write_output_file(output, "component-lock.json", _canonical({
            "schema_version": "factory-component-lock/v1",
            "plan_id": plan["id"],
            "plan_checksum": plan["checksum"],
            "definition_checksum": verified_definition_checksum,
            "component_locks": plan["composition"]["component_locks"],
        }) + "\n")
        self._write_output_file(output, "composition-manifest.json", _canonical(plan["composition"]) + "\n")
        summary = {
            "schema_version": "factory-run-summary/v1",
            "run_id": run["id"],
            "project_id": project["id"],
            "version_id": version["id"],
            "plan_id": plan["id"],
            "definition_checksum": verified_definition_checksum,
            "component_plan_checksum": plan["checksum"],
            "composition_checksum": _checksum(plan["composition"]),
            "profile": definition["profile"],
            "primary_record": {
                "id": record["id"],
                "label": record["label"],
                "field_ids": [field["id"] for field in record["fields"]],
            },
            "approvals": {
                "definition": {"actor": version["approved_by"], "at": version["approved_at"]},
                "plan": {"actor": plan["approved_by"], "at": plan["approved_at"]},
            },
            "safety": {
                "executed_shell": False,
                "network_downloads": False,
                "external_components": False,
                "raw_brief_persisted": False,
                "model_selected_components": False,
            },
        }
        self._write_output_file(output, "run-summary.json", _canonical(summary) + "\n")
        manifest_files = [
            {"path": path.relative_to(output).as_posix(), "sha256": self._file_checksum(path)}
            for path in sorted(
                (candidate for candidate in output.rglob("*") if candidate.is_file()),
                key=lambda candidate: candidate.relative_to(output).as_posix(),
            )
        ]
        self._write_output_file(output, "render-manifest.json", _canonical({
            "schema_version": "factory-render-manifest/v1",
            "definition_checksum": verified_definition_checksum,
            "plan_checksum": plan["checksum"],
            "manifest_path": "render-manifest.json",
            "files": manifest_files,
        }) + "\n")
        artifacts = (
            ("application-definition", "application-definition.json", "application_definition"),
            ("component-lock", "component-lock.json", "component_lock"),
            ("composition-manifest", "composition-manifest.json", "composition_manifest"),
            ("render-manifest", "render-manifest.json", "render_manifest"),
            ("run-summary", "run-summary.json", "run_summary"),
        )
        run["artifacts"] = [
            {
                "id": artifact_id,
                "path": relative,
                "sha256": self._file_checksum(output / relative),
                "kind": kind,
                "url": f"/api/runs/{run['id']}/artifacts/{artifact_id}",
            }
            for artifact_id, relative, kind in artifacts
        ]
        self._event(run, "artifacts.composed", {
            "message": "Approved Golden component packages and checksum evidence materialized.",
            "artifacts": [artifact["id"] for artifact in run["artifacts"]],
        })

    def _render_vnext_application(
        self,
        output: Path,
        run: dict[str, Any],
        plan: dict[str, Any],
        version: dict[str, Any],
        definition: dict[str, Any],
        verified_definition_checksum: str,
    ) -> None:
        project = self._project(plan["project_id"])
        output.mkdir(parents=True, exist_ok=False)
        self._copy_template(self.template_root, output)

        record = definition["primary_record"]
        api_path = "/" + record["id"].replace("_", "-") + "s"
        dynamic_files = {
            "application-definition.json": _canonical(definition) + "\n",
            "component-lock.json": _canonical({
                "schema_version": "factory-component-lock/v1",
                "plan_id": plan["id"],
                "plan_checksum": plan["checksum"],
                "definition_checksum": verified_definition_checksum,
                "components": plan["components"],
            }) + "\n",
            "backend/app/main.py": self._render_backend(definition, api_path),
            "backend/app/schema.sql": self._render_schema(definition),
            "backend/app/test_api.py": self._render_backend_test(definition, api_path),
            "backend/api-contract.json": _canonical(self._render_api_contract(definition, api_path)) + "\n",
            "frontend/app/page.tsx": self._render_frontend(definition, api_path),
            "frontend/app/layout.tsx": self._render_layout(definition),
            "frontend/e2e/submit-flow.mjs": self._render_frontend_e2e(definition),
            "README.md": self._render_readme(definition, api_path),
            "smoke_test.py": self._render_smoke_test(definition, api_path),
        }
        for relative, contents in dynamic_files.items():
            self._write_output_file(output, relative, contents)

        summary = {
            "schema_version": "factory-run-summary/v1",
            "run_id": run["id"],
            "project_id": project["id"],
            "version_id": version["id"],
            "plan_id": plan["id"],
            "definition_checksum": verified_definition_checksum,
            "component_plan_checksum": plan["checksum"],
            "profile": definition["profile"],
            "primary_record": {
                "id": record["id"],
                "label": record["label"],
                "field_ids": [field["id"] for field in record["fields"]],
            },
            "approvals": {
                "definition": {
                    "actor": version["approved_by"],
                    "at": version["approved_at"],
                },
                "plan": {
                    "actor": plan["approved_by"],
                    "at": plan["approved_at"],
                },
            },
            "safety": {
                "executed_shell": False,
                "network_downloads": False,
                "external_components": False,
                "raw_brief_persisted": False,
            },
        }
        self._write_output_file(output, "run-summary.json", _canonical(summary) + "\n")

        manifest_files = []
        for path in sorted(
            (candidate for candidate in output.rglob("*") if candidate.is_file()),
            key=lambda candidate: candidate.relative_to(output).as_posix(),
        ):
            manifest_files.append({
                "path": path.relative_to(output).as_posix(),
                "sha256": self._file_checksum(path),
            })
        manifest = {
            "schema_version": "factory-render-manifest/v1",
            "definition_checksum": verified_definition_checksum,
            "plan_checksum": plan["checksum"],
            "manifest_path": "render-manifest.json",
            "files": manifest_files,
        }
        self._write_output_file(output, "render-manifest.json", _canonical(manifest) + "\n")

        artifacts = (
            ("application-definition", "application-definition.json", "application_definition"),
            ("component-lock", "component-lock.json", "component_lock"),
            ("render-manifest", "render-manifest.json", "render_manifest"),
            ("run-summary", "run-summary.json", "run_summary"),
        )
        run["artifacts"] = [
            {
                "id": artifact_id,
                "path": relative,
                "sha256": self._file_checksum(output / relative),
                "kind": kind,
                "url": f"/api/runs/{run['id']}/artifacts/{artifact_id}",
            }
            for artifact_id, relative, kind in artifacts
        ]
        self._event(
            run,
            "artifacts.rendered",
            {
                "message": "Definition-driven application and checksum evidence rendered.",
                "artifacts": [artifact["id"] for artifact in run["artifacts"]],
            },
        )

    def _prepare_executor_request(
        self,
        output: Path,
        run: dict[str, Any],
        plan: dict[str, Any],
        definition_checksum_value: str,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Prepare the signed queue handoff before durable run-state publication.

        The request contains only contained relative paths. A separate
        authorization record anchors the request checksum so the worker can
        reject a request that was rewritten after the control plane queued it.
        """
        request_body = {
            "schema_version": "factory-executor-request/v1",
            "run_id": run["id"],
            "plan_id": plan["id"],
            "plan_checksum": plan["checksum"],
            "definition_checksum": definition_checksum_value,
            "output_directory": "output",
            "definition_path": "application-definition.json",
            "definition_file_checksum": self._file_checksum(
                output / "application-definition.json"
            ),
            "component_lock_path": "component-lock.json",
            "component_lock_checksum": self._file_checksum(
                output / "component-lock.json"
            ),
            "render_manifest_path": "render-manifest.json",
            "render_manifest_checksum": self._file_checksum(
                output / "render-manifest.json"
            ),
            "run_summary_path": "run-summary.json",
            "run_summary_checksum": self._file_checksum(output / "run-summary.json"),
            "compose_path": "docker-compose.yml",
            "smoke_test_path": "smoke_test.py",
            "created_at": run["created_at"],
            "expires_at": run["expires_at"],
            "event_sequence_start": len(run["events"]) + 1,
        }
        request = dict(request_body)
        request["request_checksum"] = _checksum(request_body)
        request["key_id"] = self._executor_key_id
        request["request_signature"] = self._executor_signature(request)

        authorization_body = {
            "schema_version": "factory-executor-authorization/v1",
            "run_id": run["id"],
            "request_checksum": request["request_checksum"],
            "request_signature": request["request_signature"],
            "key_id": self._executor_key_id,
        }
        authorization = dict(authorization_body)
        authorization["authorization_checksum"] = _checksum(authorization_body)
        authorization["authorization_signature"] = self._executor_signature(
            authorization
        )

        run["executor_request_checksum"] = request["request_checksum"]
        run["executor_key_id"] = self._executor_key_id
        request_bytes = (_canonical(request) + "\n").encode("utf-8")
        run["artifacts"].append(
            {
                "id": "executor-request",
                "path": "executor-request.json",
                "sha256": "sha256:" + hashlib.sha256(request_bytes).hexdigest(),
                "kind": "executor_request",
                "url": (
                    f"/api/runs/{run['id']}/artifacts/executor-request"
                ),
            }
        )
        return request, authorization

    @staticmethod
    def _publish_executor_request(
        output: Path,
        request: dict[str, Any],
        authorization: dict[str, Any],
    ) -> None:
        authorization_path = output.parent / "executor-authorization.json"
        with authorization_path.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(_canonical(authorization) + "\n")
        # The request is the queue publication marker and is always written last.
        request_path = output / "executor-request.json"
        with request_path.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(_canonical(request) + "\n")

    def request_stop(self, run_id: str) -> dict[str, Any]:
        """Record a write-once stop request without invoking the Executor."""
        with self._lock:
            run = self._run(run_id)
            if "phase" not in run:
                raise ControlPlaneError(
                    409,
                    "legacy_run",
                    "legacy blueprint runs do not have an Executor preview",
                )
            current = self._vnext_run_view(run)
            if current["status"] == "failed":
                raise ControlPlaneError(
                    409,
                    "terminal_run",
                    "a failed run cannot be stopped",
                )
            if current["status"] == "stopped":
                return current

            stop_path = self.runs_root / run_id / "stop-request.json"
            if stop_path.exists():
                self._validate_stop_request(stop_path, run_id)
                return self._vnext_run_view(run)

            requested_at = _now()
            body = {
                "schema_version": "factory-executor-stop/v1",
                "run_id": run_id,
                "reason": "requested",
                "requested_at": requested_at,
            }
            request = dict(body)
            request["request_checksum"] = _checksum(body)
            request["key_id"] = self._executor_key_id
            request["request_signature"] = self._executor_signature(request)
            with stop_path.open("x", encoding="utf-8", newline="\n") as handle:
                handle.write(_canonical(request) + "\n")
            run["phase"] = "stopping"
            run["stop_requested_at"] = requested_at
            self._save()
            return self._vnext_run_view(run)

    def _validate_stop_request(self, path: Path, run_id: str) -> dict[str, Any]:
        try:
            request = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise ControlPlaneError(
                409,
                "stop_request_tampered",
                "the stop request is invalid",
            ) from error
        if not isinstance(request, dict):
            raise ControlPlaneError(
                409,
                "stop_request_tampered",
                "the stop request is invalid",
            )
        unsigned = {
            key: value
            for key, value in request.items()
            if key not in {"request_checksum", "key_id", "request_signature"}
        }
        signed = {
            key: value
            for key, value in request.items()
            if key != "request_signature"
        }
        if (
            request.get("run_id") != run_id
            or request.get("reason") != "requested"
            or request.get("request_checksum") != _checksum(unsigned)
            or request.get("key_id") != self._executor_key_id
            or not self._valid_executor_signature(
                signed,
                request.get("request_signature"),
            )
        ):
            raise ControlPlaneError(
                409,
                "stop_request_tampered",
                "the stop request is invalid",
            )
        return request

    def _merge_executor_status(self, run: dict[str, Any]) -> dict[str, Any]:
        merged = json.loads(_canonical(run))
        status_candidate = (
            self._safe_output_path(run["id"]) / EXECUTOR_STATUS_RELATIVE_PATH
        )
        status: dict[str, Any] | None = None
        invalid_status = False
        if status_candidate.exists():
            try:
                status_path = self._safe_artifact_path(
                    run["id"],
                    EXECUTOR_STATUS_RELATIVE_PATH,
                )
                status = self._load_executor_status(status_path, run)
            except (
                ControlPlaneError,
                OSError,
                ValueError,
                json.JSONDecodeError,
            ):
                invalid_status = True
                status = None

        if status is not None:
            for key in (
                "status",
                "phase",
                "finished_at",
                "stop_reason",
                "preview_url",
                "log_excerpt",
                "smoke",
            ):
                merged[key] = status[key]
            merged["events"] = list(run["events"]) + list(status["events"])
            heartbeat = _parse_timestamp(status["last_heartbeat_at"])
            now = datetime.now(timezone.utc)
            online = bool(
                heartbeat is not None
                and timedelta(seconds=-2)
                <= now - heartbeat
                <= timedelta(seconds=EXECUTOR_HEARTBEAT_MAX_AGE_SECONDS)
            )
            merged["executor"] = {
                "status": "online" if online else "offline",
                "message": None
                if online
                else "The local Executor heartbeat is unavailable or stale.",
                "last_heartbeat_at": status["last_heartbeat_at"],
            }
            merged["artifacts"] = list(run["artifacts"])
            merged["artifacts"].append(
                self._runtime_artifact(
                    run["id"],
                    "executor-status",
                    EXECUTOR_STATUS_RELATIVE_PATH,
                    "executor_status",
                )
            )
            smoke_path = (
                self._safe_output_path(run["id"]) / SMOKE_EVIDENCE_RELATIVE_PATH
            )
            if smoke_path.is_file():
                try:
                    self._load_smoke_evidence(smoke_path, run, status["smoke"])
                except (OSError, ValueError, json.JSONDecodeError):
                    pass
                else:
                    merged["artifacts"].append(
                        self._runtime_artifact(
                            run["id"],
                            "smoke-evidence",
                            SMOKE_EVIDENCE_RELATIVE_PATH,
                            "smoke_evidence",
                        )
                    )
        else:
            terminal_status = self._load_terminal_anchor(run)
            if terminal_status is not None:
                for key in (
                    "status",
                    "phase",
                    "finished_at",
                    "stop_reason",
                    "preview_url",
                    "log_excerpt",
                    "smoke",
                ):
                    merged[key] = terminal_status[key]
                merged["events"] = list(run["events"]) + list(
                    terminal_status["events"]
                )
            terminal = merged["status"] in {"failed", "stopped"}
            merged["executor"] = {
                "status": "unknown" if terminal else "offline",
                "message": (
                    "Executor status evidence is invalid."
                    if invalid_status
                    else (
                        None
                        if terminal
                        else "Start the local Executor to process this queued run."
                    )
                ),
                "last_heartbeat_at": None,
            }

        stop_path = self.runs_root / run["id"] / "stop-request.json"
        if stop_path.exists() and merged["status"] not in {"failed", "stopped"}:
            merged["phase"] = "stopping"
        if merged["status"] != "ready":
            merged["preview_url"] = None
        if merged["status"] != "stopped":
            merged["stop_reason"] = None
        return merged

    def _load_executor_status(
        self,
        status_path: Path,
        run: dict[str, Any],
    ) -> dict[str, Any]:
        if status_path.stat().st_size > MAX_EXECUTOR_STATUS_BYTES:
            raise ValueError("Executor status is too large")
        status = json.loads(status_path.read_text(encoding="utf-8"))
        required = {
            "schema_version",
            "run_id",
            "request_checksum",
            "status",
            "phase",
            "started_at",
            "updated_at",
            "finished_at",
            "stop_reason",
            "preview_url",
            "last_heartbeat_at",
            "log_excerpt",
            "smoke",
            "events",
            "key_id",
            "cleanup_needed",
            "cleanup_attempts",
            "evidence_signature",
        }
        if not isinstance(status, dict) or set(status) != required:
            raise ValueError("invalid Executor status schema")
        if (
            status["schema_version"] != "factory-executor-status/v1"
            or status["run_id"] != run["id"]
            or status["request_checksum"] != run.get("executor_request_checksum")
            or status["key_id"] != self._executor_key_id
        ):
            raise ValueError("Executor status does not match the queued run")
        signature = status["evidence_signature"]
        unsigned = {
            key: value for key, value in status.items() if key != "evidence_signature"
        }
        if not self._valid_executor_signature(unsigned, signature):
            raise ValueError("Executor status signature is invalid")
        if (
            not isinstance(status["cleanup_needed"], bool)
            or not isinstance(status["cleanup_attempts"], int)
            or status["cleanup_attempts"] < 0
        ):
            raise ValueError("invalid Executor cleanup state")
        allowed_statuses = {
            "queued",
            "building",
            "smoke_testing",
            "ready",
            "failed",
            "stopped",
        }
        allowed_phases = allowed_statuses | {"stopping"}
        if (
            status["status"] not in allowed_statuses
            or status["phase"] not in allowed_phases
        ):
            raise ValueError("invalid Executor state")
        for key in (
            "started_at",
            "updated_at",
            "last_heartbeat_at",
        ):
            if _parse_timestamp(status[key]) is None:
                raise ValueError("invalid Executor timestamp")
        if status["finished_at"] is not None and _parse_timestamp(
            status["finished_at"]
        ) is None:
            raise ValueError("invalid Executor finished timestamp")
        if status["status"] == "stopped":
            if status["stop_reason"] not in {"requested", "expired"}:
                raise ValueError("invalid stop reason")
        elif status["stop_reason"] is not None:
            raise ValueError("unexpected stop reason")
        if status["status"] == "ready":
            if not self._valid_preview_url(status["preview_url"]):
                raise ValueError("invalid preview URL")
        elif status["preview_url"] is not None:
            raise ValueError("unexpected preview URL")
        logs = status["log_excerpt"]
        if (
            not isinstance(logs, list)
            or len(logs) > 50
            or not all(isinstance(line, str) and len(line) <= 500 for line in logs)
        ):
            raise ValueError("invalid log excerpt")
        smoke = status["smoke"]
        if smoke is not None:
            if (
                not isinstance(smoke, dict)
                or set(smoke) != {
                    "status",
                    "started_at",
                    "finished_at",
                    "summary",
                }
                or smoke["status"] not in {"passed", "failed"}
                or _parse_timestamp(smoke["started_at"]) is None
                or _parse_timestamp(smoke["finished_at"]) is None
                or not isinstance(smoke["summary"], str)
                or len(smoke["summary"]) > 500
            ):
                raise ValueError("invalid smoke evidence")
        events = status["events"]
        if not isinstance(events, list):
            raise ValueError("invalid Executor events")
        expected_sequence = len(run["events"]) + 1
        for event in events:
            if (
                not isinstance(event, dict)
                or set(event) != {"sequence", "type", "at", "payload"}
                or event["sequence"] != expected_sequence
                or not isinstance(event["type"], str)
                or _parse_timestamp(event["at"]) is None
                or not isinstance(event["payload"], dict)
            ):
                raise ValueError("invalid Executor event")
            expected_sequence += 1
        return status

    def _load_smoke_evidence(
        self,
        path: Path,
        run: dict[str, Any],
        expected_smoke: object,
    ) -> dict[str, Any]:
        envelope = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(envelope, dict) or set(envelope) != {
            "schema_version",
            "run_id",
            "request_checksum",
            "key_id",
            "smoke",
            "evidence_signature",
        }:
            raise ValueError("invalid smoke evidence envelope")
        signature = envelope["evidence_signature"]
        unsigned = {
            key: value
            for key, value in envelope.items()
            if key != "evidence_signature"
        }
        if (
            envelope["schema_version"] != "factory-smoke-evidence/v1"
            or envelope["run_id"] != run["id"]
            or envelope["request_checksum"] != run.get("executor_request_checksum")
            or envelope["key_id"] != self._executor_key_id
            or envelope["smoke"] != expected_smoke
            or not self._valid_executor_signature(unsigned, signature)
        ):
            raise ValueError("invalid smoke evidence signature")
        return envelope

    def _load_terminal_anchor(
        self,
        run: dict[str, Any],
    ) -> dict[str, Any] | None:
        candidate = self.runs_root / run["id"] / EXECUTOR_TERMINAL_RELATIVE_PATH
        if not candidate.is_file():
            return None
        try:
            metadata = candidate.lstat()
            if candidate.is_symlink() or bool(
                getattr(metadata, "st_file_attributes", 0)
                & FILE_ATTRIBUTE_REPARSE_POINT
            ):
                return None
            status = self._load_executor_status(candidate, run)
        except (OSError, ValueError, json.JSONDecodeError):
            return None
        if (
            status["status"] not in {"failed", "stopped"}
            or status["cleanup_needed"]
        ):
            return None
        return status

    @staticmethod
    def _valid_preview_url(value: object) -> bool:
        return bool(
            isinstance(value, str)
            and re.fullmatch(r"http://127\.0\.0\.1:(?:[1-9]\d{0,4})/", value)
            and 1 <= int(value.rsplit(":", 1)[1][:-1]) <= 65535
        )

    def _runtime_artifact(
        self,
        run_id: str,
        artifact_id: str,
        relative: str,
        kind: str,
    ) -> dict[str, Any]:
        path = self._safe_artifact_path(run_id, relative)
        return {
            "id": artifact_id,
            "path": relative,
            "sha256": self._file_checksum(path),
            "kind": kind,
            "url": f"/api/runs/{run_id}/artifacts/{artifact_id}",
        }

    def get_artifact(
        self,
        run_id: str,
        artifact_id: str,
    ) -> tuple[bytes, str, str]:
        """Read only an artifact already listed by the current RunView."""
        with self._lock:
            run = self._run(run_id)
            if not isinstance(artifact_id, str):
                raise ControlPlaneError(
                    404,
                    "artifact_not_found",
                    "artifact was not found",
                )
            for _attempt in range(2):
                view = self._run_view(run)
                artifact = next(
                    (
                        item
                        for item in view.get("artifacts", [])
                        if item["id"] == artifact_id
                    ),
                    None,
                )
                if artifact is None:
                    raise ControlPlaneError(
                        404,
                        "artifact_not_found",
                        "artifact was not found",
                    )
                path = self._safe_artifact_path(run_id, artifact["path"])
                body = path.read_bytes()
                if (
                    "sha256:" + hashlib.sha256(body).hexdigest()
                    == artifact["sha256"]
                ):
                    return body, "application/json; charset=utf-8", path.name
            raise ControlPlaneError(
                409,
                "artifact_changed",
                "artifact changed while it was being read",
            )

    def _safe_artifact_path(self, run_id: str, relative: str) -> Path:
        output = self._safe_output_path(run_id)
        if (
            not isinstance(relative, str)
            or not relative
            or "\\" in relative
            or Path(relative).is_absolute()
            or ".." in Path(relative).parts
        ):
            raise ControlPlaneError(
                404,
                "artifact_not_found",
                "artifact was not found",
            )
        candidate = output / relative
        try:
            resolved = candidate.resolve(strict=True)
            metadata = candidate.lstat()
        except OSError as error:
            raise ControlPlaneError(
                404,
                "artifact_not_found",
                "artifact was not found",
            ) from error
        attributes = getattr(metadata, "st_file_attributes", 0)
        current = candidate
        contains_alias = False
        while current != output:
            try:
                current_attributes = getattr(
                    current.lstat(),
                    "st_file_attributes",
                    0,
                )
                if current.is_symlink() or (
                    current_attributes & FILE_ATTRIBUTE_REPARSE_POINT
                ):
                    contains_alias = True
                    break
            except OSError:
                contains_alias = True
                break
            current = current.parent
        if (
            output.resolve() not in resolved.parents
            or contains_alias
            or attributes & FILE_ATTRIBUTE_REPARSE_POINT
            or not S_ISREG(metadata.st_mode)
        ):
            raise ControlPlaneError(
                404,
                "artifact_not_found",
                "artifact was not found",
            )
        return resolved

    @staticmethod
    def _write_output_file(output: Path, relative: str, contents: str) -> None:
        target = (output / relative).resolve()
        if output.resolve() not in target.parents:
            raise ControlPlaneError(400, "unsafe_blueprint_file", "rendered file escapes output directory")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(contents, encoding="utf-8")

    @staticmethod
    def _file_checksum(path: Path) -> str:
        return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()

    @staticmethod
    def _definition_roles(definition: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
        submitter = next(role for role in definition["roles"] if role["kind"] == "submitter")
        approver = next(role for role in definition["roles"] if role["kind"] == "approver")
        audit_roles = [
            role for role in definition["roles"] if role["kind"] in {"auditor", "observer"}
        ] or [approver]
        return submitter, approver, audit_roles

    @staticmethod
    def _class_name(identifier: str) -> str:
        return "".join(part.capitalize() for part in identifier.split("_"))

    @staticmethod
    def _python_field_annotation(field: dict[str, Any]) -> str:
        base = {
            "string": "str",
            "number": "float",
            "date": "date",
            "enum": "Literal[" + ", ".join(repr(option) for option in field.get("options", [])) + "]",
        }[field["type"]]
        if field["required"]:
            if field["type"] == "string":
                return "str = Field(min_length=1, max_length=500)"
            return base
        if field["type"] == "string":
            return "str | None = Field(default=None, max_length=500)"
        return f"{base} | None = None"

    def _render_backend(self, definition: dict[str, Any], api_path: str) -> str:
        record = definition["primary_record"]
        record_id = record["id"]
        table = record_id + "s"
        class_name = self._class_name(record_id)
        submitter, approver, audit_roles = self._definition_roles(definition)
        roles = tuple(role["id"] for role in definition["roles"])
        audit_role_ids = tuple(role["id"] for role in audit_roles)
        field_ids = [field["id"] for field in record["fields"]]
        model_fields = "\n".join(
            f"    {field['id']}: {self._python_field_annotation(field)}"
            for field in record["fields"]
        )
        response_fields = "\n".join(
            f'        "{field_id}": row["{field_id}"],' for field_id in field_ids
        )
        return_fields = ", ".join(
            ["id", "submitted_by", *field_ids, "status", "created_at", "decided_at", "decided_by"]
        )
        insert_columns = ", ".join(["id", "submitted_by", *field_ids, "status"])
        value_placeholders = ", ".join(["%s"] * (2 + len(field_ids)) + ["'submitted'"])
        parameter_values = ", ".join(
            ["record_id", "actor", *[f'values["{field_id}"]' for field_id in field_ids]]
        )
        string_normalizers = "\n".join(
            textwrap.dedent(
                f"""
                if isinstance(values["{field['id']}"], str):
                    values["{field['id']}"] = values["{field['id']}"].strip()
                    if {field['required']!r} and not values["{field['id']}"]:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="{field['id']} must not be blank",
                        )
                """
            ).strip()
            for field in record["fields"]
            if field["type"] == "string"
        )
        if string_normalizers:
            string_normalizers = textwrap.indent(string_normalizers, "    ")
        selected_fields = ", ".join(
            ["id", "submitted_by", *field_ids, "status", "created_at", "decided_at", "decided_by"]
        )
        source = f'''
        """Role-aware approval API generated by Factory Pilot."""

        from __future__ import annotations

        import os
        from datetime import date
        from typing import Literal
        from uuid import UUID, uuid4

        import psycopg
        from fastapi import Depends, FastAPI, Header, HTTPException, status
        from fastapi.middleware.cors import CORSMiddleware
        from pydantic import BaseModel, Field
        from psycopg.rows import dict_row


        DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://leave_api:leave_api@db:5432/leave_approval")
        DEMO_ROLES = frozenset({roles!r})
        AUDIT_ROLES = {audit_role_ids!r}


        class {class_name}Input(BaseModel):
        __MODEL_FIELDS__


        class ApprovalDecisionInput(BaseModel):
            decision: Literal["approved", "rejected"]


        def _connect() -> psycopg.Connection:
            return psycopg.connect(DATABASE_URL, row_factory=dict_row)


        app = FastAPI(title={record["label"] + " Approval API"!r})
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=r"^http://127\\.0\\.0\\.1(?::\\d{{1,5}})?$",
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["Content-Type", "X-Demo-Actor"],
        )


        def get_actor(x_demo_actor: str | None = Header(default=None)) -> str:
            if x_demo_actor not in DEMO_ROLES:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A valid demo actor is required")
            return x_demo_actor


        def require_role(actor: str, *allowed_roles: str) -> None:
            if actor not in allowed_roles:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo actor is not authorized for this action")


        def _record_response(row: dict) -> dict:
            return {{
                "id": str(row["id"]),
                "submitted_by": row["submitted_by"],
        __RESPONSE_FIELDS__
                "status": row["status"],
                "created_at": row["created_at"],
                "decided_at": row["decided_at"],
                "decided_by": row["decided_by"],
            }}


        def _audit_response(row: dict) -> dict:
            return {{
                "id": str(row["id"]),
                "{record_id}_id": str(row["{record_id}_id"]),
                "action": row["action"],
                "actor": row["actor"],
                "created_at": row["created_at"],
            }}


        @app.get("/health")
        def health() -> dict[str, str]:
            with _connect() as connection:
                connection.execute("SELECT 1")
            return {{"status": "ok"}}


        @app.post("{api_path}", status_code=status.HTTP_201_CREATED)
        def submit_record(payload: {class_name}Input, actor: str = Depends(get_actor)) -> dict:
            require_role(actor, {submitter["id"]!r})
            values = payload.model_dump()
        __STRING_NORMALIZERS__
            record_id = uuid4()
            with _connect() as connection, connection.transaction():
                row = connection.execute(
                    """
                    INSERT INTO {table} ({insert_columns})
                    VALUES ({value_placeholders})
                    RETURNING {return_fields}
                    """,
                    ({parameter_values}),
                ).fetchone()
                connection.execute(
                    """
                    INSERT INTO audit_events (id, {record_id}_id, action, actor)
                    VALUES (%s, %s, '{record_id}.submitted', %s)
                    """,
                    (uuid4(), record_id, actor),
                )
            return _record_response(row)


        @app.get("{api_path}")
        def list_records(actor: str = Depends(get_actor)) -> list[dict]:
            require_role(actor, {submitter["id"]!r}, {approver["id"]!r})
            with _connect() as connection:
                if actor == {submitter["id"]!r}:
                    rows = connection.execute(
                        """
                        SELECT {selected_fields}
                        FROM {table} WHERE submitted_by = %s ORDER BY created_at, id
                        """,
                        (actor,),
                    ).fetchall()
                else:
                    rows = connection.execute(
                        """
                        SELECT {selected_fields}
                        FROM {table} WHERE status = 'submitted' ORDER BY created_at, id
                        """
                    ).fetchall()
            return [_record_response(row) for row in rows]


        @app.post("{api_path}/{{record_id}}/decision")
        def decide_record(
            record_id: UUID,
            payload: ApprovalDecisionInput,
            actor: str = Depends(get_actor),
        ) -> dict:
            require_role(actor, {approver["id"]!r})
            action = {{
                "approved": "{record_id}.approved",
                "rejected": "{record_id}.rejected",
            }}[payload.decision]
            with _connect() as connection, connection.transaction():
                row = connection.execute(
                    """
                    UPDATE {table}
                    SET status = %s, decided_at = CURRENT_TIMESTAMP, decided_by = %s
                    WHERE id = %s AND status = 'submitted'
                    RETURNING {return_fields}
                    """,
                    (payload.decision, actor, record_id),
                ).fetchone()
                if row is None:
                    exists = connection.execute("SELECT status FROM {table} WHERE id = %s", (record_id,)).fetchone()
                    if exists is None:
                        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={record["label"] + " was not found"!r})
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={record["label"] + " has already been decided"!r})
                connection.execute(
                    """
                    INSERT INTO audit_events (id, {record_id}_id, action, actor)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (uuid4(), record_id, action, actor),
                )
            return _record_response(row)


        @app.get("/audit-events")
        def list_audit_events(actor: str = Depends(get_actor)) -> list[dict]:
            require_role(actor, *AUDIT_ROLES)
            with _connect() as connection:
                rows = connection.execute(
                    """
                    SELECT id, {record_id}_id, action, actor, created_at
                    FROM audit_events ORDER BY created_at, id
                    """
                ).fetchall()
            return [_audit_response(row) for row in rows]
        '''
        return (
            textwrap.dedent(source)
            .replace("__MODEL_FIELDS__", model_fields)
            .replace("__RESPONSE_FIELDS__", response_fields)
            .replace("__STRING_NORMALIZERS__", string_normalizers)
            .lstrip()
        )

    def _render_schema(self, definition: dict[str, Any]) -> str:
        record = definition["primary_record"]
        record_id = record["id"]
        table = record_id + "s"
        sql_types = {
            "string": "TEXT",
            "number": "DOUBLE PRECISION",
            "date": "DATE",
            "enum": "TEXT",
        }
        columns: list[str] = []
        checks: list[str] = []
        for field in record["fields"]:
            nullability = " NOT NULL" if field["required"] else ""
            columns.append(f"    {field['id']} {sql_types[field['type']]}{nullability},")
            if field["type"] == "enum":
                options = ", ".join("'" + option.replace("'", "''") + "'" for option in field["options"])
                checks.append(f"    CHECK ({field['id']} IN ({options})),")
        action_values = ", ".join(
            f"'{record_id}.{action}'" for action in ("submitted", "approved", "rejected")
        )
        schema = f"""
        CREATE TABLE IF NOT EXISTS {table} (
            id UUID PRIMARY KEY,
            submitted_by TEXT NOT NULL,
        {chr(10).join(columns)}
            status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            decided_at TIMESTAMPTZ,
            decided_by TEXT,
        {chr(10).join(checks)}
            CHECK ((status = 'submitted' AND decided_at IS NULL AND decided_by IS NULL)
                OR (status IN ('approved', 'rejected') AND decided_at IS NOT NULL AND decided_by IS NOT NULL))
        );

        CREATE TABLE IF NOT EXISTS audit_events (
            id UUID PRIMARY KEY,
            {record_id}_id UUID NOT NULL REFERENCES {table}(id),
            action TEXT NOT NULL CHECK (action IN ({action_values})),
            actor TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE OR REPLACE FUNCTION reject_audit_event_mutation()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'audit_events are append-only';
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
        CREATE TRIGGER audit_events_append_only
            BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

        DROP TRIGGER IF EXISTS audit_events_append_only_truncate ON audit_events;
        CREATE TRIGGER audit_events_append_only_truncate
            BEFORE TRUNCATE ON audit_events
            FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_event_mutation();

        CREATE INDEX IF NOT EXISTS audit_events_record_created_at_idx
            ON audit_events ({record_id}_id, created_at);

        GRANT USAGE ON SCHEMA public TO leave_api;
        GRANT SELECT, INSERT, UPDATE ON TABLE {table} TO leave_api;
        GRANT SELECT, INSERT ON TABLE audit_events TO leave_api;
        """
        return textwrap.dedent(schema).lstrip()

    def _render_backend_test(self, definition: dict[str, Any], api_path: str) -> str:
        record = definition["primary_record"]
        submitter, approver, audit_roles = self._definition_roles(definition)
        payload = self._smoke_payload(record["fields"])
        record_id = record["id"]
        return textwrap.dedent(
            f'''
            """Generated integration checks for the protected approval lifecycle."""

            from fastapi.testclient import TestClient

            from app.main import app


            def test_submit_approve_and_audit() -> None:
                with TestClient(app) as client:
                    submitted = client.post(
                        {api_path!r},
                        headers={{"X-Demo-Actor": {submitter["id"]!r}}},
                        json={payload!r},
                    )
                    assert submitted.status_code == 201
                    record = submitted.json()
                    assert record["status"] == "submitted"

                    decided = client.post(
                        f"{api_path}/{{record['id']}}/decision",
                        headers={{"X-Demo-Actor": {approver["id"]!r}}},
                        json={{"decision": "approved"}},
                    )
                    assert decided.status_code == 200
                    assert decided.json()["status"] == "approved"

                    audit = client.get(
                        "/audit-events",
                        headers={{"X-Demo-Actor": {audit_roles[0]["id"]!r}}},
                    )
                    assert audit.status_code == 200
                    matching = [
                        item["action"]
                        for item in audit.json()
                        if item["{record_id}_id"] == record["id"]
                    ]
                    assert matching == [{record_id + ".submitted"!r}, {record_id + ".approved"!r}]


            def test_submitter_cannot_decide() -> None:
                with TestClient(app) as client:
                    response = client.post(
                        f"{api_path}/00000000-0000-0000-0000-000000000000/decision",
                        headers={{"X-Demo-Actor": {submitter["id"]!r}}},
                        json={{"decision": "approved"}},
                    )
                    assert response.status_code == 403
            '''
        ).lstrip()

    @staticmethod
    def _smoke_payload(fields: list[dict[str, Any]]) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        for field in fields:
            payload[field["id"]] = {
                "string": "Factory Pilot smoke test",
                "number": 125.5,
                "date": "2026-08-05",
                "enum": field.get("options", ["Smoke"])[0],
            }[field["type"]]
        return payload

    def _render_api_contract(self, definition: dict[str, Any], api_path: str) -> dict[str, Any]:
        record = definition["primary_record"]
        return {
            "openapi": "3.1.0",
            "info": {"title": f"{record['label']} Approval API", "version": "1.0.0"},
            "paths": {
                "/health": {"get": {"summary": "Check API and database health"}},
                api_path: {
                    "get": {"summary": f"List visible {record['label'].lower()} records"},
                    "post": {"summary": f"Submit {record['label'].lower()}"},
                },
                f"{api_path}/{{record_id}}/decision": {
                    "post": {"summary": f"Approve or reject a submitted {record['label'].lower()}"}
                },
                "/audit-events": {"get": {"summary": "List the append-only audit history"}},
            },
        }

    def _render_frontend(self, definition: dict[str, Any], api_path: str) -> str:
        record = definition["primary_record"]
        submitter, approver, audit_roles = self._definition_roles(definition)
        page_by_id = {page["id"]: page for page in definition["pages"]}
        actor_type = " | ".join(json.dumps(role["id"]) for role in definition["roles"])
        actor_options = "\n".join(
            f'            <option value={{{json.dumps(role["id"])}}}>'
            f'{{{json.dumps(role["label"])}}}</option>'
            for role in definition["roles"]
        )
        form_controls: list[str] = []
        request_fields: list[str] = []
        payload_fields: list[str] = []
        for field in record["fields"]:
            field_id = field["id"]
            label = json.dumps(field["label"])
            required = " required" if field["required"] else ""
            if field["type"] == "enum":
                blank_option = (
                    ""
                    if field["required"]
                    else '                <option value="">Select…</option>\n'
                )
                options = "\n".join(
                    f'                <option value={{{json.dumps(option)}}}>'
                    f'{{{json.dumps(option)}}}</option>'
                    for option in field["options"]
                )
                control = (
                    f"          <label>\n"
                    f"            {{{label}}}\n"
                    f'            <select name="{field_id}"{required}>\n'
                    f"{blank_option}{options}\n"
                    f"            </select>\n"
                    f"          </label>"
                )
            else:
                input_type = {"string": "text", "number": "number", "date": "date"}[field["type"]]
                step = ' step="any"' if field["type"] == "number" else ""
                control = (
                    f"          <label>\n"
                    f"            {{{label}}}\n"
                    f'            <input name="{field_id}" type="{input_type}"{step}{required} />\n'
                    f"          </label>"
                )
            form_controls.append(control)
            request_fields.append(
                f'              <p><strong>{{{label}}}:</strong> '
                f'{{String(request[{json.dumps(field_id)}] ?? "")}}</p>'
            )
            form_value = f'form.get("{field_id}")'
            if field["type"] == "number":
                form_value = (
                    f'Number(form.get("{field_id}"))'
                    if field["required"]
                    else f'form.get("{field_id}") === "" ? null : Number(form.get("{field_id}"))'
                )
            elif not field["required"]:
                form_value = f'form.get("{field_id}") || null'
            payload_fields.append(f"          {field_id}: {form_value},")

        template = r'''"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Actor = __ACTOR_TYPE__;
type ApprovalRecord = {
  id: string;
  submitted_by: string;
  status: "submitted" | "approved" | "rejected";
  decided_by: string | null;
  [key: string]: unknown;
};
type AuditEvent = { id: string; action: string; actor: string; created_at: string };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const AUDIT_ACTORS: Actor[] = __AUDIT_ACTORS__;

async function apiRequest<T>(path: string, actor: Actor, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Demo-Actor": actor, ...init?.headers },
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(failure?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function GeneratedApprovalPage() {
  const [actor, setActor] = useState<Actor>(__SUBMITTER__);
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    try {
      if (actor === __SUBMITTER__ || actor === __APPROVER__) {
        setRecords(await apiRequest<ApprovalRecord[]>("__API_PATH__", actor));
      } else {
        setRecords([]);
      }
      setAuditEvents(AUDIT_ACTORS.includes(actor)
        ? await apiRequest<AuditEvent[]>("/audit-events", actor)
        : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load application data");
    }
  }, [actor]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    try {
      await apiRequest<ApprovalRecord>("__API_PATH__", actor, {
        method: "POST",
        body: JSON.stringify({
__PAYLOAD_FIELDS__
        }),
      });
      formElement.reset();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the record");
    } finally {
      setBusy(false);
    }
  }

  async function decide(recordId: string, decision: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await apiRequest<ApprovalRecord>(`__API_PATH__/${recordId}/decision`, actor, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record the decision");
    } finally {
      setBusy(false);
    }
  }

  const visibleRecords = records.filter(
    (record) => actor !== __APPROVER__ || record.status === "submitted",
  );

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Factory Pilot · generated application</p>
          <h1>{__RECORD_TITLE__}</h1>
          <p className="subtitle">Submit records, make one approval decision, and inspect append-only history.</p>
        </div>
        <label className="actor">
          Demo actor
          <select value={actor} onChange={(event) => setActor(event.target.value as Actor)}>
__ACTOR_OPTIONS__
          </select>
        </label>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {actor === __SUBMITTER__ && (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">{__SUBMIT_PAGE__}</p>
            <h2>{__SUBMIT_PAGE__}</h2>
          </div>
          <form className="request-form" onSubmit={submitRecord}>
__FORM_CONTROLS__
            <button disabled={busy} type="submit">{busy ? "Submitting…" : "Submit"}</button>
          </form>
        </section>
      )}

      {(actor === __SUBMITTER__ || actor === __APPROVER__) && (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">{actor === __APPROVER__ ? __QUEUE_PAGE__ : __LIST_PAGE__}</p>
            <h2>{actor === __APPROVER__ ? __QUEUE_PAGE__ : __LIST_PAGE__}</h2>
          </div>
          <div className="request-list">
            {visibleRecords.map((request) => (
              <article className="request-card" key={request.id}>
                <div>
                  <span className={`status ${request.status}`}>{request.status}</span>
__REQUEST_FIELDS__
                  <small>Submitted by {request.submitted_by}</small>
                </div>
                {actor === __APPROVER__ && request.status === "submitted" && (
                  <div className="decision-actions">
                    <button disabled={busy} onClick={() => void decide(request.id, "approved")}>Approve</button>
                    <button className="secondary" disabled={busy} onClick={() => void decide(request.id, "rejected")}>Reject</button>
                  </div>
                )}
              </article>
            ))}
            {visibleRecords.length === 0 && <p className="empty">No records are available for this role.</p>}
          </div>
        </section>
      )}

      {AUDIT_ACTORS.includes(actor) && (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Governance</p>
            <h2>{__AUDIT_PAGE__}</h2>
          </div>
          <ol className="audit-list">
            {auditEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.action}</strong>
                <span>{event.actor} · {new Date(event.created_at).toLocaleString()}</span>
              </li>
            ))}
            {auditEvents.length === 0 && <li className="empty">No audit events yet.</li>}
          </ol>
        </section>
      )}
    </main>
  );
}
'''
        replacements = {
            "__ACTOR_TYPE__": actor_type,
            "__AUDIT_ACTORS__": json.dumps([role["id"] for role in audit_roles]),
            "__SUBMITTER__": json.dumps(submitter["id"]),
            "__APPROVER__": json.dumps(approver["id"]),
            "__API_PATH__": api_path,
            "__PAYLOAD_FIELDS__": "\n".join(payload_fields),
            "__RECORD_TITLE__": json.dumps(record["label"] + " approval"),
            "__ACTOR_OPTIONS__": actor_options,
            "__SUBMIT_PAGE__": json.dumps(page_by_id["submit"]["label"]),
            "__QUEUE_PAGE__": json.dumps(page_by_id["approval_queue"]["label"]),
            "__LIST_PAGE__": json.dumps(page_by_id["my_records"]["label"]),
            "__FORM_CONTROLS__": "\n".join(form_controls),
            "__REQUEST_FIELDS__": "\n".join(request_fields),
            "__AUDIT_PAGE__": json.dumps(page_by_id["audit"]["label"]),
        }
        for token, value in replacements.items():
            template = template.replace(token, value)
        return template

    @staticmethod
    def _render_layout(definition: dict[str, Any]) -> str:
        title = json.dumps(definition["primary_record"]["label"] + " approval console")
        return textwrap.dedent(
            f'''
            import type {{ Metadata }} from "next";
            import type {{ ReactNode }} from "react";

            import "./globals.css";

            export const metadata: Metadata = {{
              title: {title},
              description: "Role-aware approval demonstration generated by Factory Pilot",
            }};

            export default function RootLayout({{ children }}: Readonly<{{ children: ReactNode }}>) {{
              return (
                <html lang="en">
                  <body>{{children}}</body>
                </html>
              );
            }}
            '''
        ).lstrip()

    def _render_frontend_e2e(self, definition: dict[str, Any]) -> str:
        submitter, _, _ = self._definition_roles(definition)
        values = self._smoke_payload(definition["primary_record"]["fields"])
        return textwrap.dedent(
            f'''
            import {{ existsSync }} from "node:fs";

            const WEB_URL = process.env.APP_WEB_BASE_URL ?? "http://127.0.0.1:3000";
            const expectedActor = {submitter["id"]!r};
            const formValues = {json.dumps(values, ensure_ascii=False)};

            if (!existsSync(new URL("../app/page.tsx", import.meta.url))) {{
              throw new Error("generated application page is missing");
            }}
            const response = await fetch(WEB_URL);
            if (!response.ok) {{
              throw new Error(`generated web root returned HTTP ${{response.status}}`);
            }}
            const html = await response.text();
            if (!html || !expectedActor || Object.keys(formValues).length === 0) {{
              throw new Error("generated web smoke fixture is incomplete");
            }}
            console.log(JSON.stringify({{ status: "passed", actor: expectedActor, fields: Object.keys(formValues) }}));
            '''
        ).lstrip()

    def _render_readme(self, definition: dict[str, Any], api_path: str) -> str:
        record = definition["primary_record"]
        submitter, approver, audit_roles = self._definition_roles(definition)
        role_lines = "\n".join(
            f"- `{role['id']}` ({role['label']}) acts as the {role['kind']}."
            for role in definition["roles"]
        )
        field_lines = "\n".join(
            f"- `{field['id']}` — {field['label']} ({field['type']}, "
            f"{'required' if field['required'] else 'optional'})."
            for field in record["fields"]
        )
        return f"""# {record["label"]} Approval Application

This repository-owned application was rendered from an approved `ApplicationDefinition` and an approved six-component Golden plan. The renderer used no network downloads, shell commands, runtime credentials, or raw requirement text.

## Roles

{role_lines}

## Primary record

The `{record["id"]}` record is submitted through `{api_path}` with these fields:

{field_lines}

The protected lifecycle is `submitted → approved | rejected`. `{submitter["id"]}` can create and view its own records, `{approver["id"]}` can approve or reject a submitted record, and {", ".join(f"`{role['id']}`" for role in audit_roles)} can read append-only audit history.

## Local preview

The separate Factory Pilot Executor owns Compose startup, smoke validation,
the loopback preview URL, and teardown. Workspace evidence distinguishes
`queued`, `building`, `smoke_testing`, `ready`, `failed`, and `stopped`.
Ready previews expire after 30 minutes and can be stopped explicitly.

For a manual isolated check, start Compose, discover the Docker-selected web
port, and run the generated smoke script only after the services are ready:

```powershell
$env:FACTORY_API_HOST_PORT = "8000"
$env:FACTORY_API_BASE_URL = "http://127.0.0.1:8000"
docker compose up --build --detach
$webPort = (docker compose port web 3000).Split(":")[-1]
$env:APP_API_BASE_URL = $env:FACTORY_API_BASE_URL
$env:APP_WEB_BASE_URL = "http://127.0.0.1:$webPort"
python smoke_test.py
docker compose down --volumes --remove-orphans
```
"""

    def _render_smoke_test(self, definition: dict[str, Any], api_path: str) -> str:
        record = definition["primary_record"]
        submitter, approver, audit_roles = self._definition_roles(definition)
        payload = self._smoke_payload(record["fields"])
        record_id = record["id"]
        template = r'''"""Deterministic end-to-end smoke test for the generated approval application."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from typing import Any, Callable


API_BASE_URL = os.environ.get("APP_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
WEB_BASE_URL = os.environ.get("APP_WEB_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
STARTUP_TIMEOUT_SECONDS = 60


def _request(url: str, *, method: str = "GET", actor: str | None = None, payload: dict[str, Any] | None = None, timeout: float = 5) -> tuple[int, bytes]:
    encoded = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers: dict[str, str] = {}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if actor is not None:
        headers["X-Demo-Actor"] = actor
    request = urllib.request.Request(url, data=encoded, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.status, response.read()


def _json_request(path: str, *, expected_status: int, method: str = "GET", actor: str | None = None, payload: dict[str, Any] | None = None, timeout: float = 5) -> Any:
    status, body = _request(f"{API_BASE_URL}{path}", method=method, actor=actor, payload=payload, timeout=timeout)
    if status != expected_status:
        raise RuntimeError(f"{method} {path} returned HTTP {status}; expected {expected_status}")
    return json.loads(body)


def _wait_for(name: str, probe: Callable[[float], None], deadline: float) -> None:
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            probe(max(0.1, deadline - time.monotonic()))
            print(f"{name}: ready")
            return
        except Exception as error:
            last_error = error
        time.sleep(min(0.25, max(0, deadline - time.monotonic())))
    raise RuntimeError(f"{name} did not become ready: {last_error}")


def run() -> None:
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    _wait_for("API", lambda timeout: _json_request("/health", expected_status=200, timeout=timeout), deadline)
    _wait_for("Web", lambda timeout: _request(WEB_BASE_URL + "/", timeout=timeout), deadline)

    submitted = _json_request(
        "__API_PATH__",
        expected_status=201,
        method="POST",
        actor=__SUBMITTER__,
        payload=__PAYLOAD__,
    )
    record_id = submitted.get("id")
    if not record_id or submitted.get("status") != "submitted":
        raise RuntimeError(f"submission returned unexpected payload: {submitted!r}")

    decided = _json_request(
        f"__API_PATH__/{record_id}/decision",
        expected_status=200,
        method="POST",
        actor=__APPROVER__,
        payload={"decision": "approved"},
    )
    if decided.get("status") != "approved":
        raise RuntimeError(f"decision returned unexpected payload: {decided!r}")

    audit = _json_request("/audit-events", expected_status=200, actor=__AUDITOR__)
    matching = [event for event in audit if event.get("__RECORD_ID___id") == record_id]
    actual = [(event.get("action"), event.get("actor")) for event in matching]
    expected = [("__RECORD_ID__.submitted", __SUBMITTER__), ("__RECORD_ID__.approved", __APPROVER__)]
    if actual != expected:
        raise RuntimeError(f"audit sequence was {actual!r}; expected {expected!r}")
    print("Smoke test passed")


def main() -> int:
    if "--help" in sys.argv[1:]:
        print("Validate the generated approval application against local API and web endpoints.")
        print("Usage: python smoke_test.py")
        return 0
    try:
        run()
    except Exception as error:
        print(f"Smoke test failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''
        replacements = {
            "__API_PATH__": api_path,
            "__SUBMITTER__": repr(submitter["id"]),
            "__APPROVER__": repr(approver["id"]),
            "__AUDITOR__": repr(audit_roles[0]["id"]),
            "__PAYLOAD__": repr(payload),
            "__RECORD_ID__": record_id,
        }
        for token, value in replacements.items():
            template = template.replace(token, value)
        return template

    def _copy_template(self, template_root: Path, output: Path) -> list[str]:
        requested_root = Path(template_root)
        try:
            attributes = getattr(requested_root.lstat(), "st_file_attributes", 0)
        except OSError:
            attributes = FILE_ATTRIBUTE_REPARSE_POINT
        if requested_root.is_symlink() or attributes & FILE_ATTRIBUTE_REPARSE_POINT:
            raise ControlPlaneError(500, "invalid_template", "owned application template must not be a filesystem alias")
        root = requested_root.resolve()
        output_root = output.resolve()
        if not root.is_dir() or root != self.template_root:
            raise ControlPlaneError(500, "invalid_template", "owned application template is unavailable")
        copied: list[str] = []
        directories = [root]
        while directories:
            directory = directories.pop()
            try:
                entries = sorted(directory.iterdir(), key=lambda path: path.name)
            except OSError as error:
                raise ControlPlaneError(500, "unsafe_template_path", "template directory cannot be read safely") from error
            for source in entries:
                try:
                    metadata = source.lstat()
                except OSError as error:
                    raise ControlPlaneError(500, "unsafe_template_path", "template path cannot be inspected safely") from error
                attributes = getattr(metadata, "st_file_attributes", 0)
                if source.is_symlink() or attributes & FILE_ATTRIBUTE_REPARSE_POINT:
                    raise ControlPlaneError(500, "unsafe_template_path", "template must not contain filesystem aliases")
                if S_ISDIR(metadata.st_mode):
                    directories.append(source)
                    continue
                if not S_ISREG(metadata.st_mode):
                    raise ControlPlaneError(500, "unsafe_template_path", "template must contain only directories and regular files")
                relative = source.relative_to(root)
                target = (output_root / relative).resolve()
                if output_root not in target.parents:
                    raise ControlPlaneError(500, "unsafe_template_path", "template file escapes output directory")
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read_bytes())
                copied.append(relative.as_posix())
        return sorted(copied)

    @staticmethod
    def _actor(actor: str) -> str:
        if not isinstance(actor, str) or not re.fullmatch(r"[a-zA-Z0-9_.@-]{1,100}", actor):
            raise ControlPlaneError(422, "invalid_actor", "actor must match [a-zA-Z0-9_.@-]{1,100}")
        return actor

    @staticmethod
    def _event(run: dict[str, Any], event_type: str, payload: dict[str, Any]) -> None:
        run["events"].append({"sequence": len(run["events"]) + 1, "type": event_type, "at": _now(), "payload": payload})

    def _project(self, project_id: str) -> dict[str, Any]:
        try:
            return self._state["projects"][project_id]
        except KeyError:
            raise ControlPlaneError(404, "project_not_found", "project was not found") from None

    def _version(self, version_id: str) -> dict[str, Any]:
        try:
            return self._state["versions"][version_id]
        except KeyError:
            raise ControlPlaneError(404, "version_not_found", "version was not found") from None

    def _project_by_ir(self, ir_id: str) -> dict[str, Any]:
        for project in self._state["projects"].values():
            if project.get("ir_id") == ir_id:
                return project
        raise ControlPlaneError(404, "ir_not_found", "Application IR was not found")

    def _plan(self, plan_id: str) -> dict[str, Any]:
        try:
            return self._state["plans"][plan_id]
        except KeyError:
            raise ControlPlaneError(404, "plan_not_found", "plan was not found") from None

    def _run(self, run_id: str) -> dict[str, Any]:
        if not isinstance(run_id, str) or not RUN_ID_PATTERN.fullmatch(run_id):
            raise ControlPlaneError(400, "invalid_run_id", "invalid run identifier")
        try:
            return self._state["runs"][run_id]
        except KeyError:
            raise ControlPlaneError(404, "run_not_found", "run was not found") from None
