import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from apps.api.control_plane import ControlPlane
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider
from apps.executor.worker import ExecutorWorker, HandoffError


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


class Completed:
    def __init__(
        self,
        returncode: int = 0,
        stdout: str = "",
        stderr: str = "",
    ) -> None:
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


class FakeRunner:
    def __init__(
        self,
        *,
        port_output: str = "127.0.0.1:49152\n",
        smoke_error: Exception | None = None,
        smoke_returncode: int = 0,
        down_returncode: int = 0,
        down_returncodes: list[int] | None = None,
        on_call: object | None = None,
    ) -> None:
        self.port_output = port_output
        self.smoke_error = smoke_error
        self.smoke_returncode = smoke_returncode
        self.down_returncode = down_returncode
        self.down_returncodes = list(down_returncodes or [])
        self.on_call = on_call
        self.calls: list[tuple[list[str], dict]] = []

    def __call__(self, args: list[str], **kwargs: object) -> Completed:
        self.calls.append((list(args), dict(kwargs)))
        if callable(self.on_call):
            self.on_call(args)
        if args[0] == sys.executable:
            if self.smoke_error is not None:
                raise self.smoke_error
            return Completed(
                self.smoke_returncode,
                "Smoke test passed\n" if self.smoke_returncode == 0 else "",
                "" if self.smoke_returncode == 0 else "API_KEY=do-not-expose\nsmoke failed",
            )
        if "port" in args:
            return Completed(0, self.port_output)
        if "up" in args:
            return Completed(0, "build ready\nAPI_KEY=do-not-expose")
        if "down" in args:
            return Completed(
                self.down_returncodes.pop(0)
                if self.down_returncodes
                else self.down_returncode,
                "removed",
            )
        return Completed(0, "removed")


class MutableClock:
    def __init__(self, value: dt.datetime) -> None:
        self.value = value

    def __call__(self) -> dt.datetime:
        return self.value


class ExecutorWorkerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.plane = ControlPlane(
            root / "state.json",
            root / "runs",
            provider=FixtureRequirementToDefinitionProvider(),
        )
        created = self.plane.create_project(
            "expense-approval",
            "Employees submit expense claims and managers approve them.",
        )
        version = self.plane.approve_version(created["version"]["id"], "founder")
        plan = self.plane.create_plan_for_version(version["id"])
        self.plane.approve_plan(plan["id"], "founder")
        self.run = self.plane.create_run(plan["id"])
        created_at = dt.datetime.fromisoformat(
            self.run["created_at"].replace("Z", "+00:00")
        )
        self.clock = MutableClock(created_at + dt.timedelta(seconds=1))

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _worker(self, runner: FakeRunner) -> ExecutorWorker:
        return ExecutorWorker(
            self.plane.runs_root,
            runner=runner,
            now=self.clock,
            key_path=self.plane.executor_key_path,
        )

    def _request_path(self) -> Path:
        return (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / "executor-request.json"
        )

    def test_command_environment_keeps_windows_docker_plugin_discovery_without_secrets(
        self,
    ) -> None:
        if "PROGRAMFILES" not in os.environ:
            self.skipTest("Windows Docker plugin discovery is not applicable")

        environment = ExecutorWorker._command_environment()

        self.assertEqual(os.environ["PROGRAMFILES"], environment["PROGRAMFILES"])
        for name in ("OPENAI_API_KEY", "AWS_SECRET_ACCESS_KEY", "AZURE_CLIENT_SECRET"):
            self.assertNotIn(name, environment)

    def test_worker_runs_only_fixed_array_commands_and_reports_ready(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)

        self.assertEqual(1, worker.scan_once())

        view = self.plane.get_run(self.run["id"])
        output = (self.plane.runs_root / self.run["id"] / "output").resolve()
        project_name = "factory_" + self.run["id"].removeprefix("run_").lower()
        compose_prefix = [
            "docker",
            "compose",
            "--project-name",
            project_name,
            "--file",
            str(output / "docker-compose.yml"),
        ]
        self.assertEqual(
            compose_prefix + ["up", "--build", "--detach"],
            runner.calls[0][0],
        )
        docker_config = Path(runner.calls[0][1]["env"]["DOCKER_CONFIG"])
        self.assertEqual(
            (self.plane.runs_root / self.run["id"] / "executor-docker-config").resolve(),
            docker_config.resolve(),
        )
        self.assertTrue(docker_config.is_dir())
        self.assertNotIn(
            (output / ".docker").resolve(),
            list(docker_config.resolve().parents),
        )
        self.assertEqual(
            compose_prefix + ["port", "web", "3000"],
            runner.calls[1][0],
        )
        self.assertEqual(
            [sys.executable, str(output / "smoke_test.py")],
            runner.calls[2][0],
        )
        smoke_environment = runner.calls[2][1]["env"]
        self.assertEqual("http://127.0.0.1:49152", smoke_environment["APP_WEB_BASE_URL"])
        self.assertRegex(
            smoke_environment["APP_API_BASE_URL"],
            r"^http://127\.0\.0\.1:\d+$",
        )
        self.assertNotIn("OPENAI_API_KEY", smoke_environment)
        self.assertEqual("ready", view["status"])
        self.assertEqual("ready", view["phase"])
        self.assertEqual("http://127.0.0.1:49152/", view["preview_url"])
        self.assertEqual("online", view["executor"]["status"])
        self.assertEqual("passed", view["smoke"]["status"])
        self.assertNotIn("do-not-expose", "\n".join(view["log_excerpt"]))
        self.assertEqual(
            {"executor_status", "smoke_evidence"},
            {
                artifact["kind"]
                for artifact in view["artifacts"]
                if artifact["kind"] in {"executor_status", "smoke_evidence"}
            },
        )

    def test_worker_rejects_request_tampering_without_invoking_docker(self) -> None:
        request = json.loads(self._request_path().read_text(encoding="utf-8"))
        request["expires_at"] = "2099-01-01T00:00:00Z"
        self._request_path().write_text(json.dumps(request), encoding="utf-8")
        runner = FakeRunner()

        self._worker(runner).scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertIn("request signature", "\n".join(view["log_excerpt"]).lower())
        self.assertEqual([], runner.calls)

    def test_tampered_authorization_is_ignored_without_stopping_the_worker(self) -> None:
        authorization_path = (
            self.plane.runs_root
            / self.run["id"]
            / "executor-authorization.json"
        )
        authorization = json.loads(
            authorization_path.read_text(encoding="utf-8")
        )
        authorization["request_checksum"] = "sha256:" + "0" * 64
        authorization_path.write_text(json.dumps(authorization), encoding="utf-8")
        runner = FakeRunner()

        self.assertEqual(1, self._worker(runner).scan_once())

        self.assertEqual("queued", self.plane.get_run(self.run["id"])["status"])
        self.assertEqual([], runner.calls)

    def test_tampered_existing_status_is_cleaned_up_without_restarting_compose(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)
        worker.scan_once()
        status_path = (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / "evidence"
            / "executor-status.json"
        )
        status = json.loads(status_path.read_text(encoding="utf-8"))
        status["preview_url"] = "http://0.0.0.0:1/"
        status_path.write_text(json.dumps(status), encoding="utf-8")
        calls_before = len(runner.calls)

        self.assertEqual(1, worker.scan_once())

        new_calls = runner.calls[calls_before:]
        self.assertEqual(1, len(new_calls))
        self.assertEqual(
            ["down", "--volumes", "--remove-orphans"],
            new_calls[0][0][-3:],
        )
        self.assertEqual("failed", self.plane.get_run(self.run["id"])["status"])

    def test_unsafe_executor_docker_config_path_fails_without_running_commands(self) -> None:
        docker_config = (
            self.plane.runs_root
            / self.run["id"]
            / "executor-docker-config"
        )
        docker_config.write_text("not a directory", encoding="utf-8")
        runner = FakeRunner()

        self.assertEqual(1, self._worker(runner).scan_once())

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertIn("docker config path", "\n".join(view["log_excerpt"]).lower())
        self.assertEqual([], runner.calls)

    def test_worker_rejects_manifest_file_tampering_without_invoking_docker(self) -> None:
        dockerfile = (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / "backend"
            / "Dockerfile"
        )
        dockerfile.write_text(
            dockerfile.read_text(encoding="utf-8") + "\nRUN unexpected\n",
            encoding="utf-8",
        )
        runner = FakeRunner()

        self._worker(runner).scan_once()

        self.assertEqual("failed", self.plane.get_run(self.run["id"])["status"])
        self.assertEqual([], runner.calls)

    def test_rendered_file_tampering_after_ready_triggers_fixed_cleanup(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)
        worker.scan_once()
        dockerfile = (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / "backend"
            / "Dockerfile"
        )
        dockerfile.write_text(
            dockerfile.read_text(encoding="utf-8") + "\nRUN unexpected\n",
            encoding="utf-8",
        )
        calls_before = len(runner.calls)

        self.assertEqual(1, worker.scan_once())

        new_calls = runner.calls[calls_before:]
        self.assertEqual(1, len(new_calls))
        self.assertEqual(
            ["down", "--volumes", "--remove-orphans"],
            new_calls[0][0][-3:],
        )
        self.assertEqual("failed", self.plane.get_run(self.run["id"])["status"])

    def test_worker_rejects_a_rechecksummed_path_escape(self) -> None:
        request = json.loads(self._request_path().read_text(encoding="utf-8"))
        request["compose_path"] = "../docker-compose.yml"
        unsigned = {key: value for key, value in request.items() if key != "request_checksum"}
        request["request_checksum"] = _checksum(unsigned)
        self._request_path().write_text(
            json.dumps(request, sort_keys=True, separators=(",", ":")),
            encoding="utf-8",
        )
        runner = FakeRunner()

        self._worker(runner).scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertIn("handoff rejected", "\n".join(view["log_excerpt"]).lower())
        self.assertEqual([], runner.calls)

    def test_worker_rejects_forged_rechecksummed_render_and_authorization(self) -> None:
        output = self._request_path().parent
        readme = output / "README.md"
        readme.write_text(
            readme.read_text(encoding="utf-8") + "\nforged\n",
            encoding="utf-8",
        )
        manifest_path = output / "render-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        entry = next(item for item in manifest["files"] if item["path"] == "README.md")
        entry["sha256"] = "sha256:" + hashlib.sha256(readme.read_bytes()).hexdigest()
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

        request = json.loads(self._request_path().read_text(encoding="utf-8"))
        request["render_manifest_checksum"] = (
            "sha256:" + hashlib.sha256(manifest_path.read_bytes()).hexdigest()
        )
        request_unsigned = {
            key: value for key, value in request.items() if key != "request_checksum"
        }
        request["request_checksum"] = _checksum(request_unsigned)
        self._request_path().write_text(json.dumps(request), encoding="utf-8")

        authorization_path = (
            self.plane.runs_root
            / self.run["id"]
            / "executor-authorization.json"
        )
        authorization = json.loads(authorization_path.read_text(encoding="utf-8"))
        authorization["request_checksum"] = request["request_checksum"]
        authorization_unsigned = {
            key: value
            for key, value in authorization.items()
            if key != "authorization_checksum"
        }
        authorization["authorization_checksum"] = _checksum(authorization_unsigned)
        authorization_path.write_text(json.dumps(authorization), encoding="utf-8")
        runner = FakeRunner()

        self._worker(runner).scan_once()

        self.assertEqual([], runner.calls)
        self.assertEqual("queued", self.plane.get_run(self.run["id"])["status"])

    def test_remote_docker_authority_is_rejected_before_any_command(self) -> None:
        for variable, value in (
            ("DOCKER_HOST", "tcp://example.invalid:2375"),
            ("DOCKER_CONTEXT", "remote-context"),
        ):
            with self.subTest(variable=variable):
                with patch.dict(os.environ, {variable: value}, clear=False):
                    with self.assertRaisesRegex(
                        HandoffError,
                        f"{variable} is not permitted",
                    ):
                        ExecutorWorker._command_environment()

        runner = FakeRunner()
        with patch.dict(
            os.environ,
            {"DOCKER_HOST": "tcp://example.invalid:2375"},
            clear=False,
        ):
            self._worker(runner).scan_once()
        self.assertEqual([], runner.calls)
        self.assertEqual("failed", self.plane.get_run(self.run["id"])["status"])

    def test_expiry_after_compose_up_never_reports_ready_and_cleans_up(self) -> None:
        expires = dt.datetime.fromisoformat(
            self.run["expires_at"].replace("Z", "+00:00")
        )

        def expire_after_up(args: list[str]) -> None:
            if "up" in args:
                self.clock.value = expires + dt.timedelta(seconds=1)

        runner = FakeRunner(on_call=expire_after_up)

        self._worker(runner).scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertNotEqual("ready", view["status"])
        self.assertEqual("stopped", view["status"])
        self.assertEqual("expired", view["stop_reason"])
        self.assertEqual(
            ["down", "--volumes", "--remove-orphans"],
            runner.calls[-1][0][-3:],
        )

    def test_failed_cleanup_is_retried_without_restarting_compose(self) -> None:
        runner = FakeRunner(down_returncodes=[1, 0])
        worker = self._worker(runner)
        worker.scan_once()
        self.plane.request_stop(self.run["id"])
        worker.scan_once()
        calls_after_failure = len(runner.calls)

        self.assertEqual(1, worker.scan_once())

        retry_calls = runner.calls[calls_after_failure:]
        self.assertEqual(1, len(retry_calls))
        self.assertEqual(
            ["down", "--volumes", "--remove-orphans"],
            retry_calls[0][0][-3:],
        )
        status_path = (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / "evidence"
            / "executor-status.json"
        )
        persisted = json.loads(status_path.read_text(encoding="utf-8"))
        self.assertFalse(persisted["cleanup_needed"])

    def test_active_exclusive_claim_prevents_a_second_worker(self) -> None:
        runner = FakeRunner()
        first = self._worker(runner)
        second = self._worker(runner)
        run_dir = self.plane.runs_root / self.run["id"]
        claim = first._acquire_claim(run_dir)
        self.assertIsNotNone(claim)
        try:
            self.assertEqual(0, second.scan_once())
            self.assertEqual([], runner.calls)
        finally:
            first._release_claim(run_dir, claim)

    def test_terminal_anchor_prevents_restart_when_status_file_is_lost(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)
        worker.scan_once()
        self.plane.request_stop(self.run["id"])
        worker.scan_once()
        status_path = (
            self.plane.runs_root
            / self.run["id"]
            / "output"
            / "evidence"
            / "executor-status.json"
        )
        status_path.unlink()
        calls_before = len(runner.calls)

        self.assertEqual(0, worker.scan_once())

        self.assertEqual(calls_before, len(runner.calls))

    def test_refreshed_claim_is_released_after_a_long_command(self) -> None:
        def advance_during_up(args: list[str]) -> None:
            if "up" in args:
                self.clock.value += dt.timedelta(seconds=5)

        runner = FakeRunner(on_call=advance_during_up)
        worker = self._worker(runner)

        worker.scan_once()

        claim_path = (
            self.plane.runs_root / self.run["id"] / "executor-claim.json"
        )
        self.assertFalse(claim_path.exists())
        self.plane.request_stop(self.run["id"])
        self.assertEqual(1, worker.scan_once())
        self.assertEqual("stopped", self.plane.get_run(self.run["id"])["status"])

    def test_non_loopback_preview_is_rejected_and_torn_down(self) -> None:
        runner = FakeRunner(port_output="0.0.0.0:49152\n")

        self._worker(runner).scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertIsNone(view["preview_url"])
        self.assertEqual("down", runner.calls[-1][0][-3])
        self.assertEqual(["down", "--volumes", "--remove-orphans"], runner.calls[-1][0][-3:])

    def test_smoke_timeout_is_bounded_and_torn_down(self) -> None:
        runner = FakeRunner(
            smoke_error=subprocess.TimeoutExpired(["python", "smoke_test.py"], 60)
        )

        self._worker(runner).scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertEqual("failed", view["smoke"]["status"])
        self.assertEqual(60, runner.calls[2][1]["timeout"])
        self.assertEqual(["down", "--volumes", "--remove-orphans"], runner.calls[-1][0][-3:])

    def test_explicit_stop_tears_down_a_ready_preview(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)
        worker.scan_once()
        self.plane.request_stop(self.run["id"])

        self.assertEqual(1, worker.scan_once())

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("stopped", view["status"])
        self.assertEqual("stopped", view["phase"])
        self.assertEqual("requested", view["stop_reason"])
        self.assertIsNone(view["preview_url"])
        self.assertEqual(["down", "--volumes", "--remove-orphans"], runner.calls[-1][0][-3:])

    def test_tampered_stop_request_fails_and_cleans_up_the_ready_preview(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)
        worker.scan_once()
        self.plane.request_stop(self.run["id"])
        stop_path = self.plane.runs_root / self.run["id"] / "stop-request.json"
        stop = json.loads(stop_path.read_text(encoding="utf-8"))
        stop["requested_at"] = "2099-01-01T00:00:00Z"
        stop_path.write_text(json.dumps(stop), encoding="utf-8")

        self.assertEqual(1, worker.scan_once())

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertIsNone(view["stop_reason"])
        self.assertEqual(["down", "--volumes", "--remove-orphans"], runner.calls[-1][0][-3:])

    def test_tampered_queued_stop_request_fails_without_starting_compose(self) -> None:
        self.plane.request_stop(self.run["id"])
        stop_path = self.plane.runs_root / self.run["id"] / "stop-request.json"
        stop = json.loads(stop_path.read_text(encoding="utf-8"))
        stop["reason"] = "expired"
        stop_path.write_text(json.dumps(stop), encoding="utf-8")
        runner = FakeRunner()

        self.assertEqual(1, self._worker(runner).scan_once())

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertEqual([], runner.calls)

    def test_failed_teardown_does_not_claim_the_preview_was_stopped(self) -> None:
        runner = FakeRunner(down_returncode=1)
        worker = self._worker(runner)
        worker.scan_once()
        self.plane.request_stop(self.run["id"])

        worker.scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("failed", view["status"])
        self.assertIsNone(view["stop_reason"])
        self.assertIn("cleanup failed", "\n".join(view["log_excerpt"]).lower())

    def test_expiry_tears_down_a_ready_preview(self) -> None:
        runner = FakeRunner()
        worker = self._worker(runner)
        worker.scan_once()
        self.clock.value = dt.datetime.fromisoformat(
            self.run["expires_at"].replace("Z", "+00:00")
        ) + dt.timedelta(seconds=1)

        self.assertEqual(1, worker.scan_once())

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("stopped", view["status"])
        self.assertEqual("expired", view["stop_reason"])
        self.assertIsNone(view["preview_url"])
        self.assertEqual(["down", "--volumes", "--remove-orphans"], runner.calls[-1][0][-3:])

    def test_expired_queued_request_never_invokes_docker(self) -> None:
        self.clock.value = dt.datetime.fromisoformat(
            self.run["expires_at"].replace("Z", "+00:00")
        ) + dt.timedelta(seconds=1)
        runner = FakeRunner()

        self._worker(runner).scan_once()

        view = self.plane.get_run(self.run["id"])
        self.assertEqual("stopped", view["status"])
        self.assertEqual("expired", view["stop_reason"])
        self.assertEqual([], runner.calls)


if __name__ == "__main__":
    unittest.main()
