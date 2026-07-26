"""Offline, deterministic verification for the quarantined Console Next input.

This module deliberately uses only repository-contained files.  It is an
intake verifier, not an acquisition mechanism: it has no HTTP, process,
package-manager, or version-control integration.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, Iterable


SOURCE_COMMIT_FILE = "SOURCE_COMMIT"
CANDIDATE_INDEX_FILE = "candidate-index.json"
CLOSURE_FILE = "console-next-closure.json"
_GENERATED_FILES = frozenset({SOURCE_COMMIT_FILE, CANDIDATE_INDEX_FILE, CLOSURE_FILE})
_EXPECTED_LICENSE_SHA256 = "1564074e13439397221ffd522e2e504d56561994a23d371aa5e3ad43e4f5423f"
_PINNED_SNAPSHOT_DIGESTS = {
    "7774cd7dcee1e98d0815aa6e829f33a7fc952fdf": "sha256:df12b78e24e409519461ce7be8cb5fb776223759fd079cb0618f3feb607460e0",
}
MIT_LICENSE_BYTES = b"""MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the \"Software\"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""
APPROVED_PRIMITIVES = (
    "accordion",
    "alert-dialog",
    "badge",
    "button",
    "card",
    "dialog",
    "dropdown-menu",
    "input",
    "label",
    "select",
    "separator",
    "sheet",
    "skeleton",
    "table",
    "tabs",
    "textarea",
    "sonner",
    "tooltip",
)


class SnapshotError(ValueError):
    """A stable, non-secret offline intake denial."""

    def __init__(self, code: str, detail: str = "") -> None:
        self.code = code
        super().__init__(f"{code}: {detail}" if detail else code)


def _fail(code: str, detail: str = "") -> None:
    raise SnapshotError(code, detail)


def canonical_json_bytes(value: Any) -> bytes:
    """Encode a manifest as canonical UTF-8 JSON."""
    try:
        return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    except (TypeError, ValueError) as error:
        _fail("noncanonical_json", str(error))


def _sha256(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class FileDigest:
    path: str
    sha256: str

    def as_dict(self) -> dict[str, str]:
        return {"path": self.path, "sha256": self.sha256}


@dataclass(frozen=True)
class RegistryUiItem:
    name: str
    dependencies: tuple[str, ...]
    registry_dependencies: tuple[str, ...]
    files: tuple[FileDigest, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "dependencies": list(self.dependencies),
            "files": [item.as_dict() for item in self.files],
            "name": self.name,
            "registry_dependencies": list(self.registry_dependencies),
        }


@dataclass(frozen=True)
class SnapshotIndex:
    commit: str
    license_sha256: str
    files: tuple[FileDigest, ...]
    registry_ui: tuple[RegistryUiItem, ...]

    @property
    def digest(self) -> str:
        return _sha256(self.canonical_bytes())

    def as_dict(self) -> dict[str, Any]:
        return {
            "files": [item.as_dict() for item in self.files],
            "license_sha256": self.license_sha256,
            "registry_ui": [item.as_dict() for item in self.registry_ui],
            "schema_version": "factory-console-next-snapshot/v1",
            "source_commit": self.commit,
        }

    def canonical_bytes(self) -> bytes:
        return canonical_json_bytes(self.as_dict()) + b"\n"


def _absolute_root(root: Path) -> Path:
    candidate = Path(root).absolute()
    if candidate.is_symlink() or not candidate.is_dir():
        _fail("invalid_root")
    try:
        return candidate.resolve(strict=True)
    except OSError as error:
        _fail("invalid_root", str(error))


def _contained(root: Path, candidate: Path, *, code: str = "path_escape") -> Path:
    """Resolve a local path only when every location stays below ``root``."""
    try:
        absolute = candidate.absolute()
        absolute.relative_to(root)
        current = root
        for part in absolute.relative_to(root).parts:
            current = current / part
            if current.is_symlink():
                _fail(code, "symlink")
        resolved = absolute.resolve(strict=True)
        resolved.relative_to(root)
        return resolved
    except SnapshotError:
        raise
    except (OSError, ValueError) as error:
        _fail(code, str(error))


def _relative_path(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def _source_files(root: Path) -> tuple[FileDigest, ...]:
    values: list[FileDigest] = []
    try:
        paths = sorted(root.rglob("*"), key=lambda item: item.as_posix())
    except OSError as error:
        _fail("invalid_root", str(error))
    for path in paths:
        relative = _relative_path(root, path)
        if path.is_symlink():
            _fail("non_regular_file", relative)
        if path.is_dir():
            continue
        if not path.is_file():
            _fail("non_regular_file", relative)
        contained = _contained(root, path, code="non_regular_file")
        if relative in _GENERATED_FILES:
            continue
        try:
            values.append(FileDigest(relative, _sha256(contained.read_bytes())))
        except OSError as error:
            _fail("non_regular_file", str(error))
    return tuple(values)


def _read_json(path: Path, root: Path) -> Any:
    contained = _contained(root, path)
    if not contained.is_file():
        _fail("invalid_registry", _relative_path(root, contained))
    try:
        return json.loads(contained.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("invalid_registry", str(error))


def _item_objects(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        if value.get("type") == "registry:ui" and isinstance(value.get("name"), str):
            yield value
        for nested in value.values():
            yield from _item_objects(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _item_objects(nested)


def _safe_registry_path(raw: Any, source: Path, root: Path) -> Path:
    if not isinstance(raw, str) or not raw:
        _fail("invalid_registry", "registry file path")
    posix = PurePosixPath(raw)
    windows = PureWindowsPath(raw)
    if posix.is_absolute() or windows.is_absolute() or ".." in posix.parts or ".." in windows.parts:
        _fail("path_escape", raw)
    candidates = (root / Path(*posix.parts), source.parent / Path(*posix.parts))
    for candidate in candidates:
        try:
            contained = _contained(root, candidate)
        except SnapshotError as error:
            if error.code == "path_escape":
                continue
            raise
        if contained.is_file() and not contained.is_symlink():
            return contained
    _fail("invalid_registry", raw)


def _registry_sources(root: Path) -> tuple[Path, ...]:
    canonical = root / "apps" / "v4" / "registry.json"
    if canonical.is_file():
        return (_contained(root, canonical),)
    values: list[Path] = []
    for path in sorted(root.rglob("*.json"), key=lambda item: item.as_posix()):
        relative = _relative_path(root, path)
        if relative in _GENERATED_FILES:
            continue
        if path.is_symlink():
            _fail("non_regular_file", relative)
        values.append(_contained(root, path))
    return tuple(values)


def _string_list(value: Any, field: str) -> tuple[str, ...]:
    if value is None:
        return ()
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        _fail("invalid_registry", field)
    return tuple(sorted(set(value)))


def _registry_ui(root: Path) -> tuple[RegistryUiItem, ...]:
    items: dict[str, RegistryUiItem] = {}
    for source in _registry_sources(root):
        for raw in _item_objects(_read_json(source, root)):
            name = raw["name"]
            files_value = raw.get("files")
            if not isinstance(files_value, list) or not files_value:
                _fail("invalid_registry", name)
            files: list[FileDigest] = []
            for value in files_value:
                if not isinstance(value, dict):
                    _fail("invalid_registry", name)
                file_path = _safe_registry_path(value.get("path"), source, root)
                try:
                    files.append(FileDigest(_relative_path(root, file_path), _sha256(file_path.read_bytes())))
                except OSError as error:
                    _fail("invalid_registry", str(error))
            item = RegistryUiItem(
                name=name,
                dependencies=_string_list(raw.get("dependencies"), "dependencies"),
                registry_dependencies=_string_list(raw.get("registryDependencies"), "registryDependencies"),
                files=tuple(sorted(files, key=lambda entry: entry.path)),
            )
            if name in items:
                _fail("duplicate_registry_item", name)
            items[name] = item
    if not items:
        _fail("invalid_registry", "registry:ui inventory is empty")
    return tuple(items[name] for name in sorted(items))


def _validate_candidate_index(root: Path, index: SnapshotIndex) -> None:
    candidate = root / CANDIDATE_INDEX_FILE
    if not candidate.exists():
        return
    if candidate.is_symlink() or not candidate.is_file():
        _fail("non_regular_file", CANDIDATE_INDEX_FILE)
    value = _read_json(candidate, root)
    if value != index.as_dict():
        _fail("incomplete_registry_index")
    try:
        raw = candidate.read_bytes()
    except OSError as error:
        _fail("incomplete_registry_index", str(error))
    if raw != index.canonical_bytes():
        _fail("incomplete_registry_index")


def verify_snapshot(root: Path, expected_commit: str) -> SnapshotIndex:
    """Verify an immutable source tree and return its canonical local index."""
    snapshot = _absolute_root(Path(root))
    license_path = snapshot / "LICENSE.md"
    if not license_path.exists():
        _fail("missing_license")
    if license_path.is_symlink() or not license_path.is_file():
        _fail("non_regular_file", "LICENSE.md")
    license_bytes = _contained(snapshot, license_path, code="non_regular_file").read_bytes()
    if license_bytes != MIT_LICENSE_BYTES or hashlib.sha256(license_bytes).hexdigest() != _EXPECTED_LICENSE_SHA256:
        _fail("invalid_license")
    marker = snapshot / SOURCE_COMMIT_FILE
    if marker.is_symlink() or not marker.is_file():
        _fail("wrong_commit")
    try:
        actual_commit = _contained(snapshot, marker, code="wrong_commit").read_text(encoding="ascii").strip()
    except (OSError, UnicodeDecodeError) as error:
        _fail("wrong_commit", str(error))
    if actual_commit != expected_commit:
        _fail("wrong_commit")
    files = _source_files(snapshot)
    index = SnapshotIndex(actual_commit, _sha256(license_bytes), files, _registry_ui(snapshot))
    pinned_digest = _PINNED_SNAPSHOT_DIGESTS.get(expected_commit)
    if pinned_digest is not None and index.digest != pinned_digest:
        _fail("snapshot_digest_mismatch")
    _validate_candidate_index(snapshot, index)
    return index


def write_candidate_index(root: Path, index: SnapshotIndex) -> Path:
    """Persist exactly the canonical index returned by ``verify_snapshot``."""
    snapshot = _absolute_root(Path(root))
    target = snapshot / CANDIDATE_INDEX_FILE
    if target.exists() and (target.is_symlink() or not target.is_file()):
        _fail("non_regular_file", CANDIDATE_INDEX_FILE)
    try:
        target.write_bytes(index.canonical_bytes())
    except OSError as error:
        _fail("write_failed", str(error))
    return target


def _lock_inventory(lockfile: Path | None) -> dict[str, Any]:
    if lockfile is None or not lockfile.is_file():
        return {
            "consoleNextLockDigest": None,
            "packages": [],
            "path": "apps/console-next/package-lock.json",
            "status": "pending_task_2",
        }
    try:
        raw = lockfile.read_bytes()
        value = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("invalid_lockfile", str(error))
    packages = value.get("packages") if isinstance(value, dict) else None
    if not isinstance(packages, dict):
        _fail("invalid_lockfile")
    entries: list[dict[str, str]] = []
    for location, package in packages.items():
        if not isinstance(location, str) or not isinstance(package, dict) or not location.startswith("node_modules/"):
            continue
        name = location.removeprefix("node_modules/")
        version = package.get("version")
        integrity = package.get("integrity", "")
        if not isinstance(version, str) or not version or not isinstance(integrity, str):
            _fail("invalid_lockfile", name)
        entries.append({"integrity": integrity, "name": name, "version": version})
    return {
        "consoleNextLockDigest": _sha256(raw),
        "packages": sorted(entries, key=lambda item: item["name"]),
        "path": "apps/console-next/package-lock.json",
        "status": "captured",
    }


def console_next_closure(index: SnapshotIndex, lockfile: Path | None = None) -> dict[str, Any]:
    """Build the approved primitive-only closure from verified registry data."""
    by_name = {item.name: item for item in index.registry_ui}
    missing = [name for name in APPROVED_PRIMITIVES if name not in by_name]
    if missing:
        _fail("missing_approved_primitive", ",".join(missing))
    primitives = [by_name[name].as_dict() for name in APPROVED_PRIMITIVES]
    direct_dependencies = sorted({dependency for item in primitives for dependency in item["dependencies"]})
    return {
        "license": {"expression": "MIT", "sha256": index.license_sha256},
        "lockfile": _lock_inventory(lockfile),
        "primitives": primitives,
        "schema_version": "factory-console-next-closure/v1",
        "snapshot_digest": index.digest,
        "source_commit": index.commit,
        "third_party_dependency_requests": direct_dependencies,
    }


def write_console_next_closure(root: Path, index: SnapshotIndex, lockfile: Path | None = None) -> Path:
    """Persist the canonical approved primitive closure, never acquiring dependencies."""
    snapshot = _absolute_root(Path(root))
    target = snapshot / CLOSURE_FILE
    if target.exists() and (target.is_symlink() or not target.is_file()):
        _fail("non_regular_file", CLOSURE_FILE)
    try:
        target.write_bytes(canonical_json_bytes(console_next_closure(index, lockfile)) + b"\n")
    except OSError as error:
        _fail("write_failed", str(error))
    return target
