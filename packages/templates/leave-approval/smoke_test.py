"""Deterministic end-to-end smoke test for the generated leave application."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from typing import Any, Callable


API_BASE_URL = os.environ.get("LEAVE_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
WEB_BASE_URL = os.environ.get("LEAVE_WEB_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
STARTUP_TIMEOUT_SECONDS = 60


def _request(
    url: str,
    *,
    method: str = "GET",
    actor: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 5,
) -> tuple[int, bytes]:
    encoded = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers: dict[str, str] = {}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if actor is not None:
        headers["X-Demo-Actor"] = actor
    request = urllib.request.Request(url, data=encoded, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.status, response.read()


def _json_request(
    path: str,
    *,
    expected_status: int,
    method: str = "GET",
    actor: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 5,
) -> Any:
    status, body = _request(
        f"{API_BASE_URL}{path}",
        method=method,
        actor=actor,
        payload=payload,
        timeout=timeout,
    )
    if status != expected_status:
        raise RuntimeError(f"{method} {path} returned HTTP {status}; expected {expected_status}")
    try:
        return json.loads(body)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"{method} {path} returned invalid JSON") from error


def _wait_for(
    name: str,
    probe: Callable[[float], None],
    deadline: float,
) -> None:
    last_error: Exception | None = None
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            probe(remaining)
            print(f"{name}: ready")
            return
        except Exception as error:
            last_error = error
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        time.sleep(min(0.25, remaining))
    detail = f": {last_error}" if last_error is not None else ""
    raise RuntimeError(f"{name} did not become ready within {STARTUP_TIMEOUT_SECONDS} seconds{detail}")


def _probe_api(timeout: float) -> None:
    health = _json_request("/health", expected_status=200, timeout=timeout)
    if health != {"status": "ok"}:
        raise RuntimeError(f"API health returned unexpected payload: {health!r}")


def _probe_web(timeout: float) -> None:
    status, body = _request(f"{WEB_BASE_URL}/", timeout=timeout)
    if status != 200 or not body:
        raise RuntimeError(f"web root returned HTTP {status} with an empty body")


def run() -> None:
    startup_deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    _wait_for("API", _probe_api, startup_deadline)
    _wait_for("Web", _probe_web, startup_deadline)

    submitted = _json_request(
        "/leave-requests",
        expected_status=201,
        method="POST",
        actor="employee",
        payload={
            "start_date": "2026-08-03",
            "end_date": "2026-08-05",
            "reason": "Factory Pilot smoke test",
        },
    )
    request_id = submitted.get("id") if isinstance(submitted, dict) else None
    if not request_id or submitted.get("status") != "pending":
        raise RuntimeError(f"employee submission returned unexpected payload: {submitted!r}")
    print(f"Employee submission: pending request {request_id}")

    decided = _json_request(
        f"/leave-requests/{request_id}/decision",
        expected_status=200,
        method="POST",
        actor="manager",
        payload={"decision": "approved"},
    )
    if not isinstance(decided, dict) or decided.get("id") != request_id or decided.get("status") != "approved":
        raise RuntimeError(f"manager decision returned unexpected payload: {decided!r}")
    print(f"Manager decision: approved request {request_id}")

    audit = _json_request("/audit-events", expected_status=200, actor="hr_admin")
    if not isinstance(audit, list):
        raise RuntimeError(f"HR audit returned unexpected payload: {audit!r}")
    matching = [event for event in audit if event.get("leave_request_id") == request_id]
    expected = [
        ("leave_request.submitted", "employee"),
        ("leave_request.approved", "manager"),
    ]
    actual = [(event.get("action"), event.get("actor")) for event in matching]
    if actual != expected:
        raise RuntimeError(f"HR audit sequence was {actual!r}; expected {expected!r}")

    print("HR audit: submission and approval events verified")
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
