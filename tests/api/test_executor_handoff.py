import hashlib
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import datetime as dt
import os
import subprocess
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from apps.api.control_plane import ControlPlane, ControlPlaneError
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider
from apps.api.server import Handler
from apps.executor.worker import ExecutorWorker


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


class ExecutorHandoffTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(
            root / "state.json",
            root / "runs",
            provider=FixtureRequirementToDefinitionProvider(),
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _plan(self, *, approve: bool = True) -> dict:
        created = self.plane.create_project(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        version = self.plane.approve_version(created["version"]["id"], "founder")
        plan = self.plane.create_plan_for_version(version["id"])
        if approve:
            plan = self.plane.approve_plan(plan["id"], "founder")
        return plan

    def _write_signed_status(self, path: Path, status: dict) -> None:
        signed = dict(status)
        signed["key_id"] = self.plane._executor_key_id
        signed["cleanup_needed"] = False
        signed["cleanup_attempts"] = 0
        signed["evidence_signature"] = self.plane._executor_signature(signed)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(signed, sort_keys=True, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )

    def test_approved_run_writes_a_checksum_bound_executor_request(self) -> None:
        plan = self._plan()

        run = self.plane.create_run(plan["id"])

        output = self.plane.runs_root / run["id"] / "output"
        request_path = output / "executor-request.json"
        request = json.loads(request_path.read_text(encoding="utf-8"))
        unsigned = {
            key: value
            for key, value in request.items()
            if key not in {"request_checksum", "key_id", "request_signature"}
        }
        self.assertEqual(_checksum(unsigned), request["request_checksum"])
        self.assertEqual(run["id"], request["run_id"])
        self.assertEqual("output", request["output_directory"])
        self.assertEqual("docker-compose.yml", request["compose_path"])
        self.assertEqual("smoke_test.py", request["smoke_test_path"])
        self.assertEqual(plan["checksum"], request["plan_checksum"])
        self.assertEqual(
            "sha256:" + hashlib.sha256((output / "render-manifest.json").read_bytes()).hexdigest(),
            request["render_manifest_checksum"],
        )
        self.assertEqual("queued", run["status"])
        self.assertEqual("queued", run["phase"])
        self.assertEqual("offline", run["executor"]["status"])
        self.assertEqual(
            {
                "application_definition",
                "component_lock",
                "render_manifest",
                "run_summary",
                "executor_request",
            },
            {artifact["kind"] for artifact in run["artifacts"]},
        )
        request_artifact = next(
            artifact for artifact in run["artifacts"] if artifact["kind"] == "executor_request"
        )
        self.assertEqual("executor-request.json", request_artifact["path"])
        self.assertEqual(
            "sha256:" + hashlib.sha256(request_path.read_bytes()).hexdigest(),
            request_artifact["sha256"],
        )

    def test_unapproved_plan_cannot_create_a_request_or_run_directory(self) -> None:
        plan = self._plan(approve=False)

        with self.assertRaises(ControlPlaneError) as rejected:
            self.plane.create_run(plan["id"])

        self.assertEqual(409, rejected.exception.status)
        self.assertEqual("plan_not_approved", rejected.exception.code)
        self.assertFalse(self.plane.runs_root.exists())

    def test_run_state_is_durable_before_the_queue_request_is_published(self) -> None:
        plan = self._plan()
        original = self.plane._publish_executor_request
        observed: list[str] = []

        def verify_state_first(
            output: Path,
            request: dict,
            authorization: dict,
        ) -> None:
            persisted = json.loads(self.plane.state_path.read_text(encoding="utf-8"))
            self.assertIn(request["run_id"], persisted["runs"])
            self.assertEqual(
                request["request_checksum"],
                persisted["runs"][request["run_id"]]["executor_request_checksum"],
            )
            self.assertFalse((output / "executor-request.json").exists())
            self.assertNotIn(
                self.plane._executor_key.hex(),
                self.plane.state_path.read_text(encoding="utf-8"),
            )
            observed.append(request["run_id"])
            original(output, request, authorization)

        with patch.object(
            self.plane,
            "_publish_executor_request",
            side_effect=verify_state_first,
        ):
            run = self.plane.create_run(plan["id"])

        self.assertEqual([run["id"]], observed)

    def test_stop_is_an_idempotent_file_request_and_does_not_claim_stopped(self) -> None:
        run = self.plane.create_run(self._plan()["id"])

        first = self.plane.request_stop(run["id"])
        second = self.plane.request_stop(run["id"])

        self.assertEqual(first, second)
        self.assertEqual("queued", first["status"])
        self.assertEqual("stopping", first["phase"])
        self.assertIsNone(first["stop_reason"])
        stop_path = self.plane.runs_root / run["id"] / "stop-request.json"
        stop = json.loads(stop_path.read_text(encoding="utf-8"))
        unsigned = {
            key: value
            for key, value in stop.items()
            if key not in {"request_checksum", "key_id", "request_signature"}
        }
        self.assertEqual(_checksum(unsigned), stop["request_checksum"])
        self.assertEqual(run["id"], stop["run_id"])
        self.assertEqual("requested", stop["reason"])

    def test_malformed_run_and_unknown_artifact_identifiers_fail_closed(self) -> None:
        run = self.plane.create_run(self._plan()["id"])

        with self.assertRaises(ControlPlaneError) as malformed:
            self.plane.get_run("../output")
        self.assertEqual(400, malformed.exception.status)
        self.assertEqual("invalid_run_id", malformed.exception.code)

        with self.assertRaises(ControlPlaneError) as unknown:
            self.plane.get_artifact(run["id"], "../application-definition")
        self.assertEqual(404, unknown.exception.status)
        self.assertEqual("artifact_not_found", unknown.exception.code)

    def test_artifact_lookup_returns_only_the_listed_immutable_bytes(self) -> None:
        run = self.plane.create_run(self._plan()["id"])
        artifact = next(
            item for item in run["artifacts"] if item["kind"] == "component_lock"
        )

        body, content_type, filename = self.plane.get_artifact(
            run["id"],
            artifact["id"],
        )

        expected_path = self.plane.runs_root / run["id"] / "output" / artifact["path"]
        self.assertEqual(expected_path.read_bytes(), body)
        self.assertEqual("application/json; charset=utf-8", content_type)
        self.assertEqual("component-lock.json", filename)

    def test_stale_worker_heartbeat_is_reported_offline(self) -> None:
        run = self.plane.create_run(self._plan()["id"])
        output = self.plane.runs_root / run["id"] / "output"
        status_path = output / "evidence" / "executor-status.json"
        status_path.parent.mkdir(parents=True, exist_ok=True)
        status = {
            "schema_version": "factory-executor-status/v1",
            "run_id": run["id"],
            "request_checksum": self.plane._state["runs"][run["id"]][
                "executor_request_checksum"
            ],
            "status": "building",
            "phase": "building",
            "started_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "finished_at": None,
            "stop_reason": None,
            "preview_url": None,
            "last_heartbeat_at": "2026-01-01T00:00:00Z",
            "log_excerpt": [],
            "smoke": None,
            "events": [
                {
                    "sequence": 4,
                    "type": "executor.building",
                    "at": "2026-01-01T00:00:00Z",
                    "payload": {"message": "Building."},
                }
            ],
        }
        self._write_signed_status(status_path, status)

        view = self.plane.get_run(run["id"])

        self.assertEqual("building", view["status"])
        self.assertEqual("offline", view["executor"]["status"])
        self.assertEqual("2026-01-01T00:00:00Z", view["executor"]["last_heartbeat_at"])

    def test_executor_status_filesystem_alias_is_never_trusted(self) -> None:
        run = self.plane.create_run(self._plan()["id"])
        status = {
            "schema_version": "factory-executor-status/v1",
            "run_id": run["id"],
            "request_checksum": self.plane._state["runs"][run["id"]][
                "executor_request_checksum"
            ],
            "status": "building",
            "phase": "building",
            "started_at": "2026-07-25T00:00:00Z",
            "updated_at": "2026-07-25T00:00:00Z",
            "finished_at": None,
            "stop_reason": None,
            "preview_url": None,
            "last_heartbeat_at": "2026-07-25T00:00:00Z",
            "log_excerpt": [],
            "smoke": None,
            "events": [
                {
                    "sequence": 4,
                    "type": "executor.building",
                    "at": "2026-07-25T00:00:00Z",
                    "payload": {"message": "Building."},
                }
            ],
        }
        external_directory = Path(self.temp.name) / "external-evidence"
        external_directory.mkdir()
        external = external_directory / "executor-status.json"
        self._write_signed_status(external, status)
        status_path = (
            self.plane.runs_root
            / run["id"]
            / "output"
            / "evidence"
        )
        status_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            status_path.symlink_to(external_directory, target_is_directory=True)
        except OSError as error:
            if os.name != "nt":
                self.skipTest(f"filesystem aliases are unavailable: {error}")
            created = subprocess.run(
                ["cmd", "/d", "/c", "mklink", "/J", str(status_path), str(external_directory)],
                capture_output=True,
                text=True,
                check=False,
            )
            if created.returncode != 0:
                self.skipTest(f"filesystem aliases are unavailable: {created.stderr}")

        view = self.plane.get_run(run["id"])

        self.assertEqual("queued", view["status"])
        self.assertEqual("offline", view["executor"]["status"])
        self.assertEqual("Executor status evidence is invalid.", view["executor"]["message"])

    def test_forged_executor_status_is_not_merged(self) -> None:
        run = self.plane.create_run(self._plan()["id"])
        output = self.plane.runs_root / run["id"] / "output"
        status_path = output / "evidence" / "executor-status.json"
        status_path.parent.mkdir(parents=True)
        now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
        timestamp = now.isoformat().replace("+00:00", "Z")
        forged = {
            "schema_version": "factory-executor-status/v1",
            "run_id": run["id"],
            "request_checksum": self.plane._state["runs"][run["id"]][
                "executor_request_checksum"
            ],
            "status": "ready",
            "phase": "ready",
            "started_at": timestamp,
            "updated_at": timestamp,
            "finished_at": None,
            "stop_reason": None,
            "preview_url": "http://127.0.0.1:49152/",
            "last_heartbeat_at": timestamp,
            "log_excerpt": [],
            "smoke": {
                "status": "passed",
                "started_at": timestamp,
                "finished_at": timestamp,
                "summary": "forged",
            },
            "events": [],
        }
        status_path.write_text(json.dumps(forged), encoding="utf-8")

        view = self.plane.get_run(run["id"])

        self.assertEqual("queued", view["status"])
        self.assertEqual("offline", view["executor"]["status"])
        self.assertEqual("Executor status evidence is invalid.", view["executor"]["message"])

    def test_terminal_anchor_preserves_outcome_when_status_evidence_is_lost(self) -> None:
        run = self.plane.create_run(self._plan()["id"])
        worker = ExecutorWorker(
            self.plane.runs_root,
            runner=lambda args, **kwargs: type(
                "Completed",
                (),
                {
                    "returncode": 0,
                    "stdout": "127.0.0.1:49152\n" if "port" in args else "passed\n",
                    "stderr": "",
                },
            )(),
            key_path=self.plane.executor_key_path,
        )
        worker.scan_once()
        self.plane.request_stop(run["id"])
        worker.scan_once()
        status_path = (
            self.plane.runs_root
            / run["id"]
            / "output"
            / "evidence"
            / "executor-status.json"
        )
        status_path.unlink()

        view = self.plane.get_run(run["id"])

        self.assertEqual("stopped", view["status"])
        self.assertEqual("unknown", view["executor"]["status"])
        self.assertEqual("requested", view["stop_reason"])

    def test_forged_smoke_artifact_is_not_listed(self) -> None:
        run = self.plane.create_run(self._plan()["id"])
        worker = ExecutorWorker(
            self.plane.runs_root,
            runner=lambda args, **kwargs: type(
                "Completed",
                (),
                {
                    "returncode": 0,
                    "stdout": "127.0.0.1:49152\n" if "port" in args else "passed\n",
                    "stderr": "",
                },
            )(),
            key_path=self.plane.executor_key_path,
        )
        worker.scan_once()
        smoke_path = (
            self.plane.runs_root
            / run["id"]
            / "output"
            / "evidence"
            / "smoke-evidence.json"
        )
        forged = json.loads(smoke_path.read_text(encoding="utf-8"))
        forged["smoke"]["summary"] = "forged"
        smoke_path.write_text(json.dumps(forged), encoding="utf-8")

        view = self.plane.get_run(run["id"])

        self.assertEqual("ready", view["status"])
        self.assertNotIn(
            "smoke_evidence",
            {artifact["kind"] for artifact in view["artifacts"]},
        )


class ExecutorHttpContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(
            root / "state.json",
            root / "runs",
            provider=FixtureRequirementToDefinitionProvider(),
        )
        created = self.plane.create_project(
            "equipment-access",
            "Requesters submit equipment access requests and security approves them.",
        )
        version = self.plane.approve_version(created["version"]["id"], "founder")
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        self.run = self.plane.create_run(plan["id"])

        self.old_plane = Handler.control_plane
        self.old_token = Handler.capability_token
        Handler.control_plane = self.plane
        Handler.capability_token = "test-capability"
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        Handler.control_plane = self.old_plane
        Handler.capability_token = self.old_token
        self.temp.cleanup()

    def _request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = "test-capability",
        body: bytes | None = None,
    ) -> tuple[int, bytes, dict[str, str]]:
        headers = {"Origin": "http://127.0.0.1:5173"}
        if token is not None:
            headers["X-Factory-Capability"] = token
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            self.base_url + path,
            data=body,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, response.read(), dict(response.headers)
        except urllib.error.HTTPError as error:
            return error.code, error.read(), dict(error.headers)

    def test_artifact_route_requires_capability_and_returns_exact_bytes(self) -> None:
        artifact = next(
            item for item in self.run["artifacts"] if item["kind"] == "application_definition"
        )
        path = f"/api/runs/{self.run['id']}/artifacts/{artifact['id']}"

        denied, denied_body, _ = self._request("GET", path, token=None)
        status, body, headers = self._request("GET", path)

        self.assertEqual(401, denied)
        self.assertEqual("invalid_capability", json.loads(denied_body)["error"]["code"])
        self.assertEqual(200, status)
        expected = (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / artifact["path"]
        ).read_bytes()
        self.assertEqual(expected, body)
        self.assertEqual("no-store", headers["Cache-Control"])
        self.assertEqual("application/json; charset=utf-8", headers["Content-Type"])

    def test_stop_route_creates_only_a_stop_request(self) -> None:
        status, body, _ = self._request(
            "POST",
            f"/api/runs/{self.run['id']}/stop",
            body=b"{}",
        )

        response = json.loads(body)
        self.assertEqual(202, status)
        self.assertEqual("queued", response["run"]["status"])
        self.assertEqual("stopping", response["run"]["phase"])
        self.assertTrue(
            (self.plane.runs_root / self.run["id"] / "stop-request.json").is_file()
        )


if __name__ == "__main__":
    unittest.main()
