"""Explicit queue-file worker for approved local Factory Pilot previews.

Run with:

    python -m apps.executor.worker

The worker has no API server. It polls one contained runs directory, verifies
the control-plane handoff, and invokes only fixed argument-array commands for
the repository-owned Docker Compose application and its smoke script.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import socket
import stat
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable


RUN_ID_PATTERN = re.compile(r"run_[A-Za-z0-9_-]{32}\Z")
DIGEST_PATTERN = re.compile(r"sha256:[0-9a-f]{64}\Z")
LOOPBACK_PORT_PATTERN = re.compile(r"127\.0\.0\.1:([1-9]\d{0,4})\Z")
SECRET_LOG_PATTERN = re.compile(
    r"(?i)\b(api[_-]?key|password|secret|token|private[_-]?key)"
    r"(\s*[:=]\s*)([^\s,;]+)"
)
TOKEN_LOG_PATTERN = re.compile(r"\bsk-[A-Za-z0-9_-]{8,}\b")
MAX_JSON_BYTES = 2_000_000
MAX_LOG_LINES = 50
MAX_LOG_LINE_LENGTH = 500
SMOKE_TIMEOUT_SECONDS = 60
READY_TTL_MINUTES = 30
HEARTBEAT_INTERVAL_SECONDS = 3
EXPECTED_COMPONENT_KEYS = [
    "frontend.admin-shell",
    "backend.fastapi-crud",
    "auth.rbac-local",
    "workflow.single-level-approval",
    "ops.audit-log",
    "data.postgres-compose",
]
COMPOSABLE_COMPONENT_KEYS = [
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
]
STATUS_RELATIVE_PATH = "evidence/executor-status.json"
SMOKE_RELATIVE_PATH = "evidence/smoke-evidence.json"
TERMINAL_RELATIVE_PATH = "executor-terminal.json"
CLAIM_RELATIVE_PATH = "executor-claim.json"
CLAIM_LEASE_SECONDS = 15
REQUEST_KEYS = {
    "schema_version",
    "run_id",
    "plan_id",
    "plan_checksum",
    "definition_checksum",
    "output_directory",
    "definition_path",
    "definition_file_checksum",
    "component_lock_path",
    "component_lock_checksum",
    "render_manifest_path",
    "render_manifest_checksum",
    "run_summary_path",
    "run_summary_checksum",
    "compose_path",
    "smoke_test_path",
    "created_at",
    "expires_at",
    "event_sequence_start",
    "request_checksum",
    "key_id",
    "request_signature",
}


class HandoffError(RuntimeError):
    """The queued evidence cannot safely authorize execution."""


class CommandError(RuntimeError):
    """A fixed Executor command failed or timed out."""


class ExpiryReached(RuntimeError):
    """The fixed local preview lifetime ended during execution."""


@dataclass(frozen=True)
class Handoff:
    run_id: str
    run_dir: Path
    output: Path
    request: dict[str, Any]
    compose_path: Path
    smoke_path: Path
    expires_at: datetime
    project_name: str


def _canonical(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def _checksum(value: Any) -> str:
    return "sha256:" + hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _file_checksum(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00",
        "Z",
    )


def _parse_timestamp(value: object) -> datetime:
    if not isinstance(value, str):
        raise HandoffError("timestamp is missing")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise HandoffError("timestamp is invalid") from error
    if parsed.tzinfo is None:
        raise HandoffError("timestamp must include a timezone")
    return parsed.astimezone(timezone.utc)


def _redact(value: object) -> str:
    text = str(value)
    text = SECRET_LOG_PATTERN.sub(r"\1\2[REDACTED]", text)
    return TOKEN_LOG_PATTERN.sub("[REDACTED]", text)


def _is_alias(path: Path) -> bool:
    metadata = path.lstat()
    attributes = getattr(metadata, "st_file_attributes", 0)
    return path.is_symlink() or bool(
        attributes & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    )


class ExecutorWorker:
    """Poll and execute only verified queue files below one runs root."""

    def __init__(
        self,
        runs_root: str | Path,
        *,
        runner: Callable[..., Any] = subprocess.run,
        now: Callable[[], datetime] = _utc_now,
        key_path: str | Path | None = None,
    ) -> None:
        self.runs_root = Path(runs_root).resolve()
        self.runner = runner
        self.now = now
        self.key_path = Path(key_path or default_executor_key_path()).resolve()
        self._key = self._load_key()
        self._key_id = hashlib.sha256(self._key).hexdigest()[:16]
        self.worker_id = secrets.token_urlsafe(18)
        self._status_lock = threading.Lock()

    def _load_key(self) -> bytes:
        if not self.key_path.is_file() or _is_alias(self.key_path):
            raise HandoffError("Executor key is unavailable or unsafe")
        key = self.key_path.read_bytes()
        if len(key) != 32:
            raise HandoffError("Executor key has an invalid length")
        return key

    def _signature(self, value: Any) -> str:
        return "hmac-sha256:" + hmac.new(
            self._key,
            _canonical(value).encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _valid_signature(self, value: Any, signature: object) -> bool:
        return isinstance(signature, str) and hmac.compare_digest(
            self._signature(value),
            signature,
        )

    def scan_once(self) -> int:
        if not self.runs_root.exists():
            return 0
        processed = 0
        for candidate in sorted(self.runs_root.iterdir(), key=lambda path: path.name):
            if (
                not candidate.is_dir()
                or _is_alias(candidate)
                or not RUN_ID_PATTERN.fullmatch(candidate.name)
            ):
                continue
            request_path = candidate / "output" / "executor-request.json"
            if not request_path.is_file() or _is_alias(request_path):
                continue
            if self._process(candidate):
                processed += 1
        return processed

    def run_forever(self, poll_interval: float = 1.0) -> None:
        if poll_interval <= 0 or poll_interval > 10:
            raise ValueError("poll interval must be greater than 0 and at most 10 seconds")
        while True:
            self.scan_once()
            time.sleep(poll_interval)

    def _process(self, run_dir: Path) -> bool:
        claim = self._acquire_claim(run_dir)
        if claim is None:
            return False
        try:
            return self._process_claimed(run_dir)
        finally:
            self._release_claim(run_dir, claim)

    def _acquire_claim(self, run_dir: Path) -> dict[str, Any] | None:
        path = run_dir / CLAIM_RELATIVE_PATH
        now = self.now()
        if path.exists():
            try:
                current = self._read_json(self._contained_file(run_dir, CLAIM_RELATIVE_PATH))
                signature = current.pop("claim_signature")
                if (
                    set(current)
                    != {"schema_version", "run_id", "worker_id", "claimed_at", "expires_at", "key_id"}
                    or current["schema_version"] != "factory-executor-claim/v1"
                    or current["run_id"] != run_dir.name
                    or current["key_id"] != self._key_id
                    or not self._valid_signature(current, signature)
                ):
                    return None
                if _parse_timestamp(current["expires_at"]) > now:
                    return None
                path.unlink()
            except (HandoffError, OSError, KeyError, json.JSONDecodeError):
                return None
        claim = {
            "schema_version": "factory-executor-claim/v1",
            "run_id": run_dir.name,
            "worker_id": self.worker_id,
            "claimed_at": _timestamp(now),
            "expires_at": _timestamp(now + timedelta(seconds=CLAIM_LEASE_SECONDS)),
            "key_id": self._key_id,
        }
        signed = dict(claim)
        signed["claim_signature"] = self._signature(claim)
        try:
            with path.open("x", encoding="utf-8", newline="\n") as handle:
                handle.write(_canonical(signed) + "\n")
        except FileExistsError:
            return None
        return signed

    def _release_claim(self, run_dir: Path, claim: dict[str, Any] | None) -> None:
        if claim is None:
            return
        path = run_dir / CLAIM_RELATIVE_PATH
        try:
            current = self._read_json(self._contained_file(run_dir, CLAIM_RELATIVE_PATH))
            signature = current.pop("claim_signature")
            if current.get("worker_id") == self.worker_id and self._valid_signature(
                current,
                signature,
            ):
                path.unlink()
        except (HandoffError, OSError, KeyError, json.JSONDecodeError):
            return

    def _refresh_claim(self, run_dir: Path) -> None:
        path = self._contained_file(run_dir, CLAIM_RELATIVE_PATH)
        current = self._read_json(path)
        if not isinstance(current, dict):
            raise HandoffError("Executor claim is invalid")
        signature = current.pop("claim_signature", None)
        if (
            set(current)
            != {
                "schema_version",
                "run_id",
                "worker_id",
                "claimed_at",
                "expires_at",
                "key_id",
            }
            or current.get("schema_version") != "factory-executor-claim/v1"
            or current.get("run_id") != run_dir.name
            or current.get("worker_id") != self.worker_id
            or current.get("key_id") != self._key_id
            or not self._valid_signature(current, signature)
        ):
            raise HandoffError("Executor claim ownership was lost")
        now = self.now()
        body = {
            "schema_version": "factory-executor-claim/v1",
            "run_id": run_dir.name,
            "worker_id": self.worker_id,
            "claimed_at": current["claimed_at"],
            "expires_at": _timestamp(now + timedelta(seconds=CLAIM_LEASE_SECONDS)),
            "key_id": self._key_id,
        }
        signed = dict(body)
        signed["claim_signature"] = self._signature(body)
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        temporary.write_text(_canonical(signed) + "\n", encoding="utf-8")
        temporary.replace(path)

    def _process_claimed(self, run_dir: Path) -> bool:
        try:
            expected_checksum = self._authorization_checksum(run_dir)
        except (HandoffError, OSError, json.JSONDecodeError):
            # Without the control-plane authorization checksum there is no
            # trusted value with which to sign status evidence. Fail closed
            # and leave the run queued/offline for operator inspection.
            return True
        status_path = run_dir / "output" / STATUS_RELATIVE_PATH
        existing: dict[str, Any] | None = None
        status_was_present = status_path.exists()
        if status_was_present:
            try:
                existing = self._load_status(
                    status_path,
                    expected_checksum,
                    run_dir.name,
                )
            except (HandoffError, OSError, json.JSONDecodeError):
                existing = None
        elif (run_dir / TERMINAL_RELATIVE_PATH).exists():
            try:
                existing = self._load_status(
                    self._contained_file(run_dir, TERMINAL_RELATIVE_PATH),
                    expected_checksum,
                    run_dir.name,
                )
            except (HandoffError, OSError, json.JSONDecodeError):
                # A terminal anchor is authoritative evidence. Never restart a
                # run when that evidence exists but cannot be authenticated.
                return True

        if existing is not None and existing["status"] in {"failed", "stopped"}:
            if not existing["cleanup_needed"]:
                return False
            try:
                cleanup_handoff = self._validate_cleanup_handoff(
                    run_dir,
                    expected_checksum,
                )
                cleaned = self._cleanup(
                    cleanup_handoff,
                    existing,
                    status_path,
                )
            except (HandoffError, OSError, json.JSONDecodeError):
                return False
            if cleaned:
                self._write_status(status_path, existing)
                self._write_terminal(run_dir, existing)
            return True

        try:
            handoff = self._validate_handoff(run_dir, expected_checksum)
        except (HandoffError, OSError, json.JSONDecodeError) as error:
            status = existing or self._new_status(
                run_dir.name,
                expected_checksum,
                event_sequence_start=4,
            )
            self._append_log(status, f"Handoff rejected: {_redact(error)}")
            if existing is not None and existing["status"] == "ready":
                try:
                    cleanup_handoff = self._validate_cleanup_handoff(
                        run_dir,
                        expected_checksum,
                    )
                    self._cleanup(
                        cleanup_handoff,
                        status,
                        status_path,
                    )
                except (HandoffError, OSError, json.JSONDecodeError) as cleanup_error:
                    self._append_log(
                        status,
                        f"Safe cleanup was unavailable: {_redact(cleanup_error)}",
                    )
                status["preview_url"] = None
            self._transition(
                status,
                status_path,
                "failed",
                "failed",
                "executor.failed",
                "Executor handoff validation failed.",
                finished=True,
            )
            return True

        if existing is None and status_was_present:
            status = self._new_status(
                handoff.run_id,
                expected_checksum,
                event_sequence_start=handoff.request["event_sequence_start"],
            )
            self._append_log(
                status,
                "Existing Executor status evidence was rejected.",
            )
            self._cleanup(handoff, status, status_path)
            self._transition(
                status,
                status_path,
                "failed",
                "failed",
                "executor.failed",
                "Invalid Executor status forced preview cleanup.",
                finished=True,
            )
            return True

        if existing is None:
            status = self._new_status(
                handoff.run_id,
                expected_checksum,
                event_sequence_start=handoff.request["event_sequence_start"],
            )
            try:
                stop_reason = self._requested_stop_reason(handoff)
            except HandoffError as error:
                self._append_log(
                    status,
                    f"Stop request rejected: {_redact(error)}",
                )
                self._transition(
                    status,
                    status_path,
                    "failed",
                    "failed",
                    "executor.failed",
                    "Invalid stop evidence blocked preview startup.",
                    finished=True,
                )
                return True
            if stop_reason is not None or self.now() >= handoff.expires_at:
                reason = stop_reason or "expired"
                self._transition(
                    status,
                    status_path,
                    "stopped",
                    "stopped",
                    "executor.stopped",
                    "Queued preview was stopped before startup.",
                    stop_reason=reason,
                    finished=True,
                )
                return True
            self._execute_new(handoff, status, status_path)
            return True

        if existing["status"] == "ready":
            try:
                reason = self._requested_stop_reason(handoff)
            except HandoffError as error:
                self._append_log(
                    existing,
                    f"Stop request rejected: {_redact(error)}",
                )
                self._cleanup(handoff, existing, status_path)
                existing["preview_url"] = None
                self._transition(
                    existing,
                    status_path,
                    "failed",
                    "failed",
                    "executor.failed",
                    "Invalid stop evidence forced preview cleanup.",
                    finished=True,
                )
                return True
            if reason is None and self.now() >= handoff.expires_at:
                reason = "expired"
            if reason is not None:
                self._stop_ready(handoff, existing, status_path, reason)
            else:
                self._heartbeat(existing, status_path)
            return True

        # A worker crash may leave an in-progress status. Do not duplicate the
        # build. Attempt one fixed teardown, then record a terminal failure.
        self._append_log(existing, "Interrupted Executor work was detected.")
        self._cleanup(handoff, existing, status_path)
        self._transition(
            existing,
            status_path,
            "failed",
            "failed",
            "executor.failed",
            "Interrupted Executor work was cleaned up.",
            finished=True,
        )
        return True

    def _execute_new(
        self,
        handoff: Handoff,
        status: dict[str, Any],
        status_path: Path,
    ) -> None:
        compose_prefix = self._compose_prefix(handoff)
        api_port = self._available_loopback_port()
        environment: dict[str, str] | None = None
        compose_started = False
        smoke_started_at: str | None = None
        try:
            self._ensure_not_expired(handoff)
            environment = self._docker_environment(
                handoff,
                {
                    "FACTORY_API_HOST_PORT": str(api_port),
                    "FACTORY_API_BASE_URL": f"http://127.0.0.1:{api_port}",
                },
            )
            self._transition(
                status,
                status_path,
                "building",
                "building",
                "executor.building",
                "Building and starting the approved local application.",
                expires_at=handoff.expires_at,
            )
            status["cleanup_needed"] = True
            self._write_status(status_path, status)
            compose_started = True
            remaining = max(
                1,
                int((handoff.expires_at - self.now()).total_seconds()),
            )
            self._ensure_not_expired(handoff)
            self._run_command(
                compose_prefix + ["up", "--build", "--detach"],
                cwd=handoff.output,
                env=environment,
                timeout=remaining,
                status=status,
                status_path=status_path,
            )
            self._ensure_not_expired(handoff)
            self._ensure_not_expired(handoff)
            port_result = self._run_command(
                compose_prefix + ["port", "web", "3000"],
                cwd=handoff.output,
                env=environment,
                timeout=15,
                status=status,
                status_path=status_path,
            )
            self._ensure_not_expired(handoff)
            preview_url = self._preview_url(port_result.stdout)

            self._ensure_not_expired(handoff)
            self._transition(
                status,
                status_path,
                "smoke_testing",
                "smoke_testing",
                "executor.smoke_testing",
                "Running the bounded submit, approve, and audit smoke test.",
                expires_at=handoff.expires_at,
            )
            smoke_started_at = _timestamp(self.now())
            smoke_environment = self._command_environment(
                {
                    "APP_API_BASE_URL": f"http://127.0.0.1:{api_port}",
                    "APP_WEB_BASE_URL": preview_url.rstrip("/"),
                }
            )
            self._ensure_not_expired(handoff)
            smoke_result = self._run_command(
                [sys.executable, str(handoff.smoke_path)],
                cwd=handoff.output,
                env=smoke_environment,
                timeout=max(
                    1,
                    min(
                        SMOKE_TIMEOUT_SECONDS,
                        int((handoff.expires_at - self.now()).total_seconds()),
                    ),
                ),
                status=status,
                status_path=status_path,
            )
            self._ensure_not_expired(handoff)
            smoke = {
                "status": "passed",
                "started_at": smoke_started_at,
                "finished_at": _timestamp(self.now()),
                "summary": self._summary(smoke_result.stdout, "Smoke test passed."),
            }
            status["smoke"] = smoke
            self._write_smoke(handoff, smoke)
            status["preview_url"] = preview_url
            self._ensure_not_expired(handoff)
            self._transition(
                status,
                status_path,
                "ready",
                "ready",
                "executor.ready",
                "Local preview is ready and smoke evidence passed.",
                expires_at=handoff.expires_at,
            )
        except ExpiryReached:
            self._append_log(status, "Executor preview lifetime expired.")
            cleaned = True
            if compose_started and environment is not None:
                cleaned = self._cleanup(
                    handoff,
                    status,
                    status_path,
                    environment,
                )
            status["preview_url"] = None
            self._transition(
                status,
                status_path,
                "stopped" if cleaned else "failed",
                "stopped" if cleaned else "failed",
                "executor.stopped" if cleaned else "executor.failed",
                (
                    "Local preview expired and was torn down."
                    if cleaned
                    else "Local preview expired but teardown could not be verified."
                ),
                stop_reason="expired" if cleaned else None,
                finished=True,
            )
        except (
            CommandError,
            HandoffError,
            OSError,
            subprocess.TimeoutExpired,
        ) as error:
            if smoke_started_at is not None:
                smoke = {
                    "status": "failed",
                    "started_at": smoke_started_at,
                    "finished_at": _timestamp(self.now()),
                    "summary": "The bounded generated-application smoke test failed.",
                }
                status["smoke"] = smoke
                self._write_smoke(handoff, smoke)
            self._append_log(status, f"Executor failure: {_redact(error)}")
            if compose_started and environment is not None:
                self._cleanup(handoff, status, status_path, environment)
            status["preview_url"] = None
            self._transition(
                status,
                status_path,
                "failed",
                "failed",
                "executor.failed",
                "Local preview execution failed and cleanup was attempted.",
                finished=True,
            )

    def _ensure_not_expired(self, handoff: Handoff) -> None:
        if self.now() >= handoff.expires_at:
            raise ExpiryReached("Executor request expired")

    def _stop_ready(
        self,
        handoff: Handoff,
        status: dict[str, Any],
        status_path: Path,
        reason: str,
    ) -> None:
        self._transition(
            status,
            status_path,
            status["status"],
            "stopping",
            "executor.stopping",
            "Tearing down the local preview.",
        )
        cleaned = self._cleanup(handoff, status, status_path)
        status["preview_url"] = None
        if not cleaned:
            self._transition(
                status,
                status_path,
                "failed",
                "failed",
                "executor.failed",
                "Local preview teardown could not be verified.",
                finished=True,
            )
            return
        self._transition(
            status,
            status_path,
            "stopped",
            "stopped",
            "executor.stopped",
            "Local preview was torn down.",
            stop_reason=reason,
            finished=True,
        )

    def _cleanup(
        self,
        handoff: Handoff,
        status: dict[str, Any],
        status_path: Path,
        environment: dict[str, str] | None = None,
    ) -> bool:
        status["cleanup_needed"] = True
        status["cleanup_attempts"] += 1
        self._write_status(status_path, status)
        try:
            self._run_command(
                self._compose_prefix(handoff)
                + ["down", "--volumes", "--remove-orphans"],
                cwd=handoff.output,
                env=environment or self._docker_environment(handoff),
                timeout=60,
                status=status,
                status_path=status_path,
            )
        except (
            CommandError,
            HandoffError,
            OSError,
            subprocess.TimeoutExpired,
        ) as error:
            self._append_log(status, f"Cleanup failed: {_redact(error)}")
            self._write_status(status_path, status)
            return False
        status["cleanup_needed"] = False
        self._write_status(status_path, status)
        return True

    def _run_command(
        self,
        args: list[str],
        *,
        cwd: Path,
        env: dict[str, str],
        timeout: int,
        status: dict[str, Any],
        status_path: Path,
        require_success: bool = True,
    ) -> Any:
        heartbeat_stop = threading.Event()
        heartbeat_thread = threading.Thread(
            target=self._heartbeat_during_command,
            args=(status, status_path, heartbeat_stop),
            daemon=True,
        )
        heartbeat_thread.start()
        try:
            result = self.runner(
                list(args),
                cwd=str(cwd),
                env=dict(env),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
                check=False,
            )
        finally:
            heartbeat_stop.set()
            heartbeat_thread.join(timeout=1)
        self._append_output(status, getattr(result, "stdout", ""))
        self._append_output(status, getattr(result, "stderr", ""))
        self._heartbeat(status, status_path)
        if require_success and getattr(result, "returncode", 1) != 0:
            raise CommandError(
                f"fixed Executor command exited with status {result.returncode}"
            )
        return result

    def _heartbeat_during_command(
        self,
        status: dict[str, Any],
        status_path: Path,
        stop: threading.Event,
    ) -> None:
        while not stop.wait(HEARTBEAT_INTERVAL_SECONDS):
            self._heartbeat(status, status_path)

    def _heartbeat(self, status: dict[str, Any], status_path: Path) -> None:
        status["last_heartbeat_at"] = _timestamp(self.now())
        self._refresh_claim(status_path.parents[2])
        self._write_status(status_path, status)

    def _transition(
        self,
        status: dict[str, Any],
        status_path: Path,
        state: str,
        phase: str,
        event_type: str,
        message: str,
        *,
        stop_reason: str | None = None,
        finished: bool = False,
        expires_at: datetime | None = None,
    ) -> None:
        observed_now = self.now()
        if expires_at is not None and observed_now >= expires_at:
            raise ExpiryReached("Executor request expired during phase transition")
        now = _timestamp(observed_now)
        status["status"] = state
        status["phase"] = phase
        status["updated_at"] = now
        status["last_heartbeat_at"] = now
        status["stop_reason"] = stop_reason
        if finished:
            status["finished_at"] = now
        status["events"].append(
            {
                "sequence": status["_next_sequence"],
                "type": event_type,
                "at": now,
                "payload": {"message": message},
            }
        )
        status["_next_sequence"] += 1
        self._write_status(status_path, status)
        if finished and not status["cleanup_needed"]:
            self._write_terminal(status_path.parents[2], status)

    def _new_status(
        self,
        run_id: str,
        request_checksum: str,
        *,
        event_sequence_start: int,
    ) -> dict[str, Any]:
        now = _timestamp(self.now())
        return {
            "schema_version": "factory-executor-status/v1",
            "run_id": run_id,
            "request_checksum": request_checksum,
            "status": "queued",
            "phase": "queued",
            "started_at": now,
            "updated_at": now,
            "finished_at": None,
            "stop_reason": None,
            "preview_url": None,
            "last_heartbeat_at": now,
            "log_excerpt": [],
            "smoke": None,
            "events": [],
            "key_id": self._key_id,
            "cleanup_needed": False,
            "cleanup_attempts": 0,
            "_next_sequence": event_sequence_start,
        }

    def _write_status(self, path: Path, status: dict[str, Any]) -> None:
        persisted = {
            key: value for key, value in status.items() if key != "_next_sequence"
        }
        persisted.pop("evidence_signature", None)
        persisted["evidence_signature"] = self._signature(persisted)
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._status_lock:
            temporary = path.with_name(
                f".{path.name}.{os.getpid()}.{threading.get_ident()}.tmp"
            )
            temporary.write_text(_canonical(persisted) + "\n", encoding="utf-8")
            temporary.replace(path)

    def _write_smoke(self, handoff: Handoff, smoke: dict[str, Any]) -> None:
        path = handoff.output / SMOKE_RELATIVE_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        envelope = {
            "schema_version": "factory-smoke-evidence/v1",
            "run_id": handoff.run_id,
            "request_checksum": handoff.request["request_checksum"],
            "key_id": self._key_id,
            "smoke": smoke,
        }
        envelope["evidence_signature"] = self._signature(envelope)
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        temporary.write_text(_canonical(envelope) + "\n", encoding="utf-8")
        temporary.replace(path)

    def _write_terminal(self, run_dir: Path, status: dict[str, Any]) -> None:
        path = run_dir / TERMINAL_RELATIVE_PATH
        persisted = {
            key: value for key, value in status.items() if key != "_next_sequence"
        }
        persisted.pop("evidence_signature", None)
        persisted["evidence_signature"] = self._signature(persisted)
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        temporary.write_text(_canonical(persisted) + "\n", encoding="utf-8")
        temporary.replace(path)

    def _append_output(self, status: dict[str, Any], output: object) -> None:
        if not isinstance(output, str):
            return
        for line in output.splitlines():
            self._append_log(status, line)

    @staticmethod
    def _append_log(status: dict[str, Any], line: str) -> None:
        cleaned = _redact(line).replace("\r", " ").replace("\n", " ").strip()
        if not cleaned:
            return
        status["log_excerpt"].append(cleaned[:MAX_LOG_LINE_LENGTH])
        status["log_excerpt"] = status["log_excerpt"][-MAX_LOG_LINES:]

    @staticmethod
    def _summary(output: object, fallback: str) -> str:
        if isinstance(output, str):
            lines = [_redact(line).strip() for line in output.splitlines() if line.strip()]
            if lines:
                return lines[-1][:MAX_LOG_LINE_LENGTH]
        return fallback

    def _authorization_checksum(self, run_dir: Path) -> str:
        authorization_path = self._contained_file(
            run_dir,
            "executor-authorization.json",
        )
        authorization = self._read_json(authorization_path)
        if not isinstance(authorization, dict) or set(authorization) != {
            "schema_version",
            "run_id",
            "request_checksum",
            "request_signature",
            "key_id",
            "authorization_checksum",
            "authorization_signature",
        }:
            raise HandoffError("Executor authorization schema is invalid")
        unsigned_checksum = {
            key: value
            for key, value in authorization.items()
            if key not in {"authorization_checksum", "authorization_signature"}
        }
        signed = {
            key: value
            for key, value in authorization.items()
            if key != "authorization_signature"
        }
        if (
            authorization["schema_version"]
            != "factory-executor-authorization/v1"
            or authorization["run_id"] != run_dir.name
            or authorization["key_id"] != self._key_id
            or authorization["authorization_checksum"] != _checksum(unsigned_checksum)
            or not self._valid_signature(
                signed,
                authorization["authorization_signature"],
            )
            or not DIGEST_PATTERN.fullmatch(
                str(authorization["request_checksum"])
            )
            or not isinstance(authorization["request_signature"], str)
        ):
            raise HandoffError("Executor authorization signature is invalid")
        return authorization["request_checksum"]

    def _validate_handoff(
        self,
        run_dir: Path,
        expected_checksum: str,
    ) -> Handoff:
        if run_dir.parent.resolve() != self.runs_root or not RUN_ID_PATTERN.fullmatch(
            run_dir.name
        ):
            raise HandoffError("run path is outside the configured runs root")
        output = self._contained_directory(run_dir, "output")
        request_path = self._contained_file(output, "executor-request.json")
        request = self._read_json(request_path)
        if not isinstance(request, dict) or set(request) != REQUEST_KEYS:
            raise HandoffError("Executor request schema is invalid")
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
            request["schema_version"] != "factory-executor-request/v1"
            or request["request_checksum"] != expected_checksum
            or request["request_checksum"] != _checksum(unsigned)
            or request["key_id"] != self._key_id
            or not self._valid_signature(signed, request["request_signature"])
        ):
            raise HandoffError("Executor request signature does not match authorization")
        authorization = self._read_json(
            self._contained_file(run_dir, "executor-authorization.json")
        )
        if authorization.get("request_signature") != request["request_signature"]:
            raise HandoffError("Executor request signature is not authorized")
        if (
            request["run_id"] != run_dir.name
            or request["output_directory"] != "output"
            or not isinstance(request["event_sequence_start"], int)
            or request["event_sequence_start"] < 1
            or not DIGEST_PATTERN.fullmatch(str(request["plan_checksum"]))
            or not DIGEST_PATTERN.fullmatch(str(request["definition_checksum"]))
        ):
            raise HandoffError("Executor request identifiers are invalid")
        created_at = _parse_timestamp(request["created_at"])
        expires_at = _parse_timestamp(request["expires_at"])
        if expires_at - created_at != timedelta(minutes=READY_TTL_MINUTES):
            raise HandoffError("Executor request expiry must be exactly 30 minutes")

        definition_path = self._verified_requested_file(
            output,
            request["definition_path"],
            request["definition_file_checksum"],
        )
        lock_path = self._verified_requested_file(
            output,
            request["component_lock_path"],
            request["component_lock_checksum"],
        )
        manifest_path = self._verified_requested_file(
            output,
            request["render_manifest_path"],
            request["render_manifest_checksum"],
        )
        summary_path = self._verified_requested_file(
            output,
            request["run_summary_path"],
            request["run_summary_checksum"],
        )
        compose_path = self._contained_file(output, request["compose_path"])
        smoke_path = self._contained_file(output, request["smoke_test_path"])

        definition = self._read_json(definition_path)
        if _checksum(definition) != request["definition_checksum"]:
            raise HandoffError("application definition checksum is invalid")
        component_lock = self._read_json(lock_path)
        self._validate_component_lock(component_lock, request)
        summary = self._read_json(summary_path)
        self._validate_run_summary(summary, request)
        manifest = self._read_json(manifest_path)
        self._validate_manifest(
            output,
            manifest,
            request,
            required_paths={
                request["compose_path"],
                request["smoke_test_path"],
                request["definition_path"],
                request["component_lock_path"],
                request["run_summary_path"],
            },
        )
        return Handoff(
            run_id=run_dir.name,
            run_dir=run_dir,
            output=output,
            request=request,
            compose_path=compose_path,
            smoke_path=smoke_path,
            expires_at=expires_at,
            project_name=(
                "factory_" + run_dir.name.removeprefix("run_").lower()
            ),
        )

    def _validate_cleanup_handoff(
        self,
        run_dir: Path,
        expected_checksum: str,
    ) -> Handoff:
        """Validate the minimum immutable inputs needed for safe teardown."""
        output = self._contained_directory(run_dir, "output")
        request_path = self._contained_file(output, "executor-request.json")
        request = self._read_json(request_path)
        if not isinstance(request, dict) or set(request) != REQUEST_KEYS:
            raise HandoffError("cleanup request schema is invalid")
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
            request["request_checksum"] != expected_checksum
            or request["request_checksum"] != _checksum(unsigned)
            or request["key_id"] != self._key_id
            or not self._valid_signature(signed, request["request_signature"])
            or request["run_id"] != run_dir.name
            or request["output_directory"] != "output"
        ):
            raise HandoffError("cleanup request signature is invalid")
        manifest_path = self._verified_requested_file(
            output,
            request["render_manifest_path"],
            request["render_manifest_checksum"],
        )
        manifest = self._read_json(manifest_path)
        if not isinstance(manifest, dict) or not isinstance(
            manifest.get("files"),
            list,
        ):
            raise HandoffError("cleanup render manifest is invalid")
        compose_entry = next(
            (
                item
                for item in manifest["files"]
                if isinstance(item, dict)
                and item.get("path") == request["compose_path"]
            ),
            None,
        )
        if (
            not isinstance(compose_entry, dict)
            or not DIGEST_PATTERN.fullmatch(str(compose_entry.get("sha256")))
        ):
            raise HandoffError("cleanup Compose evidence is missing")
        compose_path = self._contained_file(output, request["compose_path"])
        if _file_checksum(compose_path) != compose_entry["sha256"]:
            raise HandoffError("cleanup Compose checksum is invalid")
        return Handoff(
            run_id=run_dir.name,
            run_dir=run_dir,
            output=output,
            request=request,
            compose_path=compose_path,
            smoke_path=compose_path,
            expires_at=_parse_timestamp(request["expires_at"]),
            project_name=(
                "factory_" + run_dir.name.removeprefix("run_").lower()
            ),
        )

    def _validate_component_lock(
        self,
        component_lock: object,
        request: dict[str, Any],
    ) -> None:
        if (
            not isinstance(component_lock, dict)
            or component_lock.get("schema_version")
            != "factory-component-lock/v1"
            or component_lock.get("plan_id") != request["plan_id"]
            or component_lock.get("plan_checksum") != request["plan_checksum"]
            or component_lock.get("definition_checksum")
            != request["definition_checksum"]
        ):
            raise HandoffError("component lock does not match the approved request")
        if "component_locks" in component_lock:
            if set(component_lock) != {
                "schema_version", "plan_id", "plan_checksum", "definition_checksum", "component_locks"
            }:
                raise HandoffError("composed component lock has an invalid schema")
            locks = component_lock["component_locks"]
            if not isinstance(locks, list) or [
                item.get("key") if isinstance(item, dict) else None
                for item in locks
            ] != COMPOSABLE_COMPONENT_KEYS:
                raise HandoffError("component lock does not contain the Golden composed profile")
            for lock in locks:
                if (
                    not isinstance(lock, dict)
                    or set(lock) != {"key", "version", "digest"}
                    or lock.get("version") != "1.0.0"
                    or not DIGEST_PATTERN.fullmatch(str(lock.get("digest")))
                ):
                    raise HandoffError("component lock contains an untrusted composed component")
            return
        components = component_lock.get("components")
        if not isinstance(components, list) or [
            item.get("key") if isinstance(item, dict) else None
            for item in components
        ] != EXPECTED_COMPONENT_KEYS:
            raise HandoffError("component lock does not contain the Golden profile")
        for component in components:
            if (
                component.get("trust_level") != "golden"
                or not DIGEST_PATTERN.fullmatch(
                    str(component.get("artifact_digest"))
                )
            ):
                raise HandoffError("component lock contains an untrusted component")

    @staticmethod
    def _validate_run_summary(
        summary: object,
        request: dict[str, Any],
    ) -> None:
        if (
            not isinstance(summary, dict)
            or summary.get("schema_version") != "factory-run-summary/v1"
            or summary.get("run_id") != request["run_id"]
            or summary.get("plan_id") != request["plan_id"]
            or summary.get("definition_checksum")
            != request["definition_checksum"]
            or summary.get("component_plan_checksum")
            != request["plan_checksum"]
        ):
            raise HandoffError("run summary does not match the approved request")
        approvals = summary.get("approvals")
        if not isinstance(approvals, dict):
            raise HandoffError("run summary approvals are missing")
        for gate in ("definition", "plan"):
            approval = approvals.get(gate)
            if (
                not isinstance(approval, dict)
                or not isinstance(approval.get("actor"), str)
                or not approval["actor"]
                or not isinstance(approval.get("at"), str)
                or not approval["at"]
            ):
                raise HandoffError("run summary approval evidence is incomplete")

    def _validate_manifest(
        self,
        output: Path,
        manifest: object,
        request: dict[str, Any],
        *,
        required_paths: set[str],
    ) -> None:
        if (
            not isinstance(manifest, dict)
            or set(manifest)
            != {
                "schema_version",
                "definition_checksum",
                "plan_checksum",
                "manifest_path",
                "files",
            }
            or manifest["schema_version"] != "factory-render-manifest/v1"
            or manifest["definition_checksum"] != request["definition_checksum"]
            or manifest["plan_checksum"] != request["plan_checksum"]
            or manifest["manifest_path"] != request["render_manifest_path"]
            or not isinstance(manifest["files"], list)
        ):
            raise HandoffError("render manifest does not match the approved request")
        recorded: set[str] = set()
        for item in manifest["files"]:
            if (
                not isinstance(item, dict)
                or set(item) != {"path", "sha256"}
                or item["path"] in recorded
                or not DIGEST_PATTERN.fullmatch(str(item["sha256"]))
            ):
                raise HandoffError("render manifest file entry is invalid")
            path = self._contained_file(output, item["path"])
            if _file_checksum(path) != item["sha256"]:
                raise HandoffError(
                    f"render manifest checksum failed for path {item['path']}"
                )
            recorded.add(item["path"])
        if not required_paths.issubset(recorded):
            raise HandoffError("render manifest omits an executable input path")

        allowed_unlisted = {
            request["render_manifest_path"],
            "executor-request.json",
            STATUS_RELATIVE_PATH,
            SMOKE_RELATIVE_PATH,
        }
        actual = {
            path.relative_to(output).as_posix()
            for path in self._regular_files(output)
            if path.relative_to(output).as_posix() not in allowed_unlisted
        }
        if actual != recorded:
            raise HandoffError("rendered output contains unrecorded or missing paths")

    def _verified_requested_file(
        self,
        output: Path,
        relative: object,
        checksum: object,
    ) -> Path:
        if not isinstance(relative, str) or not DIGEST_PATTERN.fullmatch(
            str(checksum)
        ):
            raise HandoffError("requested path or checksum is invalid")
        path = self._contained_file(output, relative)
        if _file_checksum(path) != checksum:
            raise HandoffError(f"requested file checksum failed for path {relative}")
        return path

    def _requested_stop_reason(self, handoff: Handoff) -> str | None:
        stop_path = handoff.run_dir / "stop-request.json"
        if not stop_path.exists():
            return None
        stop_path = self._contained_file(handoff.run_dir, "stop-request.json")
        request = self._read_json(stop_path)
        if not isinstance(request, dict) or set(request) != {
            "schema_version",
            "run_id",
            "reason",
            "requested_at",
            "request_checksum",
            "key_id",
            "request_signature",
        }:
            raise HandoffError("stop request schema is invalid")
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
            request["schema_version"] != "factory-executor-stop/v1"
            or request["run_id"] != handoff.run_id
            or request["reason"] != "requested"
            or request["request_checksum"] != _checksum(unsigned)
            or request["key_id"] != self._key_id
            or not self._valid_signature(signed, request["request_signature"])
        ):
            raise HandoffError("stop request signature is invalid")
        _parse_timestamp(request["requested_at"])
        return "requested"

    def _load_status(
        self,
        path: Path,
        expected_checksum: str,
        expected_run_id: str,
    ) -> dict[str, Any]:
        status = self._read_json(path)
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
        if (
            not isinstance(status, dict)
            or set(status) != required
            or status.get("schema_version") != "factory-executor-status/v1"
            or status.get("run_id") != expected_run_id
            or status.get("request_checksum") != expected_checksum
            or status.get("key_id") != self._key_id
            or status.get("status")
            not in {
                "queued",
                "building",
                "smoke_testing",
                "ready",
                "failed",
                "stopped",
            }
            or not isinstance(status.get("events"), list)
        ):
            raise HandoffError("Executor status is invalid")
        signature = status.pop("evidence_signature")
        if not self._valid_signature(status, signature):
            raise HandoffError("Executor status signature is invalid")
        status["evidence_signature"] = signature
        if (
            not isinstance(status["cleanup_needed"], bool)
            or not isinstance(status["cleanup_attempts"], int)
            or status["cleanup_attempts"] < 0
        ):
            raise HandoffError("Executor cleanup state is invalid")
        if status["phase"] not in {
            "queued",
            "building",
            "smoke_testing",
            "ready",
            "failed",
            "stopping",
            "stopped",
        }:
            raise HandoffError("Executor phase is invalid")
        for key in ("started_at", "updated_at", "last_heartbeat_at"):
            _parse_timestamp(status[key])
        if status["finished_at"] is not None:
            _parse_timestamp(status["finished_at"])
        if status["status"] == "ready":
            preview = status["preview_url"]
            if (
                not isinstance(preview, str)
                or not re.fullmatch(
                    r"http://127\.0\.0\.1:[1-9]\d{0,4}/",
                    preview,
                )
                or int(preview.rsplit(":", 1)[1][:-1]) > 65535
            ):
                raise HandoffError("Executor preview URL is invalid")
        elif status["preview_url"] is not None:
            raise HandoffError("Executor preview URL is unexpected")
        if status["status"] == "stopped":
            if status["stop_reason"] not in {"requested", "expired"}:
                raise HandoffError("Executor stop reason is invalid")
        elif status["stop_reason"] is not None:
            raise HandoffError("Executor stop reason is unexpected")
        logs = status["log_excerpt"]
        if (
            not isinstance(logs, list)
            or len(logs) > MAX_LOG_LINES
            or not all(
                isinstance(line, str) and len(line) <= MAX_LOG_LINE_LENGTH
                for line in logs
            )
        ):
            raise HandoffError("Executor log excerpt is invalid")
        smoke = status["smoke"]
        if smoke is not None:
            if (
                not isinstance(smoke, dict)
                or set(smoke)
                != {"status", "started_at", "finished_at", "summary"}
                or smoke["status"] not in {"passed", "failed"}
                or not isinstance(smoke["summary"], str)
                or len(smoke["summary"]) > MAX_LOG_LINE_LENGTH
            ):
                raise HandoffError("Executor smoke evidence is invalid")
            _parse_timestamp(smoke["started_at"])
            _parse_timestamp(smoke["finished_at"])
        next_sequence = 4
        for event in status["events"]:
            if (
                not isinstance(event, dict)
                or set(event) != {"sequence", "type", "at", "payload"}
                or event["sequence"] != next_sequence
                or not isinstance(event["type"], str)
                or not isinstance(event["payload"], dict)
            ):
                raise HandoffError("Executor events are invalid")
            _parse_timestamp(event["at"])
            next_sequence += 1
        status["_next_sequence"] = next_sequence
        status.pop("evidence_signature", None)
        return status

    @staticmethod
    def _compose_prefix(handoff: Handoff) -> list[str]:
        return [
            "docker",
            "compose",
            "--project-name",
            handoff.project_name,
            "--file",
            str(handoff.compose_path),
        ]

    @staticmethod
    def _preview_url(output: object) -> str:
        if not isinstance(output, str):
            raise HandoffError("Docker did not report a preview port")
        match = LOOPBACK_PORT_PATTERN.fullmatch(output.strip())
        if match is None:
            raise HandoffError("Docker preview port is not loopback-only")
        port = int(match.group(1))
        if port > 65535:
            raise HandoffError("Docker preview port is invalid")
        return f"http://127.0.0.1:{port}/"

    @staticmethod
    def _available_loopback_port() -> int:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(("127.0.0.1", 0))
            return int(listener.getsockname()[1])

    @staticmethod
    def _command_environment(
        additions: dict[str, str] | None = None,
    ) -> dict[str, str]:
        remote_authority = next(
            (
                name
                for name in ("DOCKER_HOST", "DOCKER_CONTEXT")
                if os.environ.get(name)
            ),
            None,
        )
        if remote_authority is not None:
            raise HandoffError(
                f"{remote_authority} is not permitted for the local Executor"
            )
        allowed = {
            "PATH",
            "PATHEXT",
            "SYSTEMROOT",
            "WINDIR",
            "COMSPEC",
            "PROGRAMFILES",
            "TEMP",
            "TMP",
        }
        environment = {
            key: value
            for key, value in os.environ.items()
            if key.upper() in allowed
        }
        if additions:
            environment.update(additions)
        return environment

    def _docker_environment(
        self,
        handoff: Handoff,
        additions: dict[str, str] | None = None,
    ) -> dict[str, str]:
        """Keep Docker CLI state outside the immutable rendered output."""
        config = handoff.run_dir / "executor-docker-config"
        if config.exists() and (_is_alias(config) or not config.is_dir()):
            raise HandoffError("Executor Docker config path is unsafe")
        config.mkdir(exist_ok=True)
        environment = self._command_environment(
            {"DOCKER_CONFIG": str(config.resolve())}
        )
        if additions:
            environment.update(additions)
        return environment

    @staticmethod
    def _read_json(path: Path) -> Any:
        if path.stat().st_size > MAX_JSON_BYTES:
            raise HandoffError(f"JSON evidence is too large: {path.name}")
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _contained_directory(root: Path, relative: object) -> Path:
        path = ExecutorWorker._contained_path(root, relative)
        if not path.is_dir():
            raise HandoffError("contained path is not a directory")
        return path

    @staticmethod
    def _contained_file(root: Path, relative: object) -> Path:
        path = ExecutorWorker._contained_path(root, relative)
        if not path.is_file():
            raise HandoffError("contained path is not a regular file")
        return path

    @staticmethod
    def _contained_path(root: Path, relative: object) -> Path:
        if (
            not isinstance(relative, str)
            or not relative
            or "\\" in relative
            or Path(relative).is_absolute()
            or ".." in Path(relative).parts
        ):
            raise HandoffError("requested path is not safely contained")
        root = root.resolve()
        candidate = root / relative
        try:
            resolved = candidate.resolve(strict=True)
        except OSError as error:
            raise HandoffError("requested path does not exist") from error
        if root not in resolved.parents:
            raise HandoffError("requested path escapes its contained root")
        current = candidate
        while current != root:
            if _is_alias(current):
                raise HandoffError("requested path contains a filesystem alias")
            current = current.parent
        return resolved

    @staticmethod
    def _regular_files(root: Path) -> list[Path]:
        files: list[Path] = []
        pending = [root]
        while pending:
            directory = pending.pop()
            for item in directory.iterdir():
                if _is_alias(item):
                    raise HandoffError("rendered output contains a filesystem alias")
                metadata = item.lstat()
                if item.is_dir():
                    pending.append(item)
                elif stat.S_ISREG(metadata.st_mode):
                    files.append(item)
                else:
                    raise HandoffError("rendered output contains a non-regular path")
        return files


def default_runs_root() -> Path:
    return Path(__file__).resolve().parents[1] / "api" / "runs"


def default_executor_key_path() -> Path:
    return Path(__file__).resolve().parents[1] / "api" / "state" / "executor.key"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the constrained local Factory Pilot Executor.",
    )
    parser.add_argument(
        "--runs-root",
        default=str(default_runs_root()),
        help="Contained control-plane runs directory to poll.",
    )
    parser.add_argument(
        "--key-file",
        default=str(default_executor_key_path()),
        help="Local Executor authentication key created by the control plane.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Scan once and exit instead of polling continuously.",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=1.0,
        help="Polling interval in seconds (greater than 0 and at most 10).",
    )
    arguments = parser.parse_args(argv)
    worker = ExecutorWorker(arguments.runs_root, key_path=arguments.key_file)
    if arguments.once:
        worker.scan_once()
        return 0
    try:
        worker.run_forever(arguments.poll_interval)
    except KeyboardInterrupt:
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
