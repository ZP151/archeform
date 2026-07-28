"""Offline evidence verification for governed Factory Console UI sources."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


REQUIRED_RUNTIME = {
    "@primer/react": {"version": "38.34.0", "license": "MIT"},
    "@primer/primitives": {"version": "11.9.0", "license": "MIT"},
    "@xyflow/react": {"version": "12.11.2", "license": "MIT"},
}
TEMPORAL_UI_COMMIT = "99a9ff718c09ec9574f35067bc14d960ed4ff5bb"
NOTICE_PATH = Path("docs/third-party/console-ui-sources.md")


class ConsoleUiSourceError(ValueError):
    """Stable, non-secret evidence denial for Console UI source intake."""


def _fail(code: str) -> None:
    raise ConsoleUiSourceError(code)


def _read_lock(root: Path) -> dict[str, Any]:
    path = root / "apps" / "console-next" / "package-lock.json"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ConsoleUiSourceError("invalid_console_lockfile") from error
    if not isinstance(value, dict) or not isinstance(value.get("packages"), dict):
        _fail("invalid_console_lockfile")
    return value


def _runtime(lock: dict[str, Any]) -> dict[str, dict[str, str]]:
    packages = lock["packages"]
    verified: dict[str, dict[str, str]] = {}
    for name, expected in REQUIRED_RUNTIME.items():
        value = packages.get(f"node_modules/{name}")
        if not isinstance(value, dict):
            _fail(f"missing_runtime_package:{name}")
        version = value.get("version")
        integrity = value.get("integrity")
        license_name = value.get("license")
        if version != expected["version"]:
            _fail(f"runtime_version_mismatch:{name}")
        if not isinstance(integrity, str) or not integrity.startswith("sha512-"):
            _fail(f"runtime_integrity_missing:{name}")
        if license_name != expected["license"]:
            _fail(f"runtime_license_mismatch:{name}")
        verified[name] = {"integrity": integrity, "license": license_name, "version": version}
    return verified


def _verify_notice(root: Path, runtime: dict[str, dict[str, str]]) -> None:
    try:
        notice = (root / NOTICE_PATH).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as error:
        raise ConsoleUiSourceError("missing_console_ui_notice") from error
    required_text = (
        "Temporal UI source code is not copied into the Factory Console runtime.",
        TEMPORAL_UI_COMMIT,
        "https://github.com/primer/react",
        "https://github.com/xyflow/xyflow",
        "https://github.com/temporalio/ui",
    )
    for item in (*required_text, *runtime):
        if item not in notice:
            _fail("invalid_console_ui_notice")


def verify_console_ui_sources(root: Path) -> dict[str, object]:
    """Verify repository-contained UI dependency and reference-source evidence."""
    repository = Path(root).resolve()
    runtime = _runtime(_read_lock(repository))
    _verify_notice(repository, runtime)
    return {
        "references": {
            "temporal_ui": {
                "commit": TEMPORAL_UI_COMMIT,
                "license": "MIT",
                "runtime_import": False,
            }
        },
        "runtime": runtime,
        "schema_version": "factory-console-ui-sources/v1",
    }
