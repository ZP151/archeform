"""HTTP wrapper for the local control plane. Run: python -m apps.api.server"""

from __future__ import annotations

import json
import hmac
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from .control_plane import ControlPlane, ControlPlaneError


MAX_BODY_BYTES = 100_000


class Handler(BaseHTTPRequestHandler):
    control_plane = ControlPlane(composable_enabled=True)
    capability_token = os.environ.get("FACTORY_API_TOKEN")
    authenticated_actor = os.environ.get("FACTORY_API_ACTOR", "local-ui-user")
    allowed_origin = "http://127.0.0.1:5173"
    server_version = "FactoryControlPlane/0.1"

    def log_message(self, _format: str, *_args: object) -> None:
        """Avoid writing request contents into logs in this MVP."""

    def _json(self, status: int, body: object) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        if self.headers.get("Origin") == self.allowed_origin:
            self.send_header("Access-Control-Allow-Origin", self.allowed_origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Factory-Capability")
        self.end_headers()
        self.wfile.write(encoded)

    def _bytes(
        self,
        status: int,
        body: bytes,
        *,
        content_type: str,
        filename: str,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        if self.headers.get("Origin") == self.allowed_origin:
            self.send_header("Access-Control-Allow-Origin", self.allowed_origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def _require_json_content_type(self) -> None:
        content_type = self.headers.get("Content-Type", "")
        if content_type.split(";", 1)[0].strip().lower() != "application/json":
            raise ControlPlaneError(415, "unsupported_media_type", "Content-Type must be application/json")

    def _body(self) -> dict[str, object]:
        self._require_json_content_type()
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY_BYTES:
            raise ControlPlaneError(400, "invalid_body", "body must be JSON and at most 100KB")
        try:
            raw_body = self.rfile.read(length)
            self._request_body_consumed = True
            value = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ControlPlaneError(400, "invalid_json", "request body must be a JSON object") from None
        if not isinstance(value, dict):
            raise ControlPlaneError(400, "invalid_json", "request body must be a JSON object")
        return value

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._request_body_consumed = False
        self._dispatch("POST")

    def do_OPTIONS(self) -> None:
        # Preflight is only valid for the one local UI origin.
        if self.headers.get("Origin") != self.allowed_origin:
            return self._json(403, {"error": {"code": "invalid_origin", "message": "origin is not allowed"}})
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", self.allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Factory-Capability")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _require_api_origin(self) -> None:
        if self.headers.get("Origin") != self.allowed_origin:
            raise ControlPlaneError(403, "invalid_origin", "origin is not allowed")

    def _authenticate_write(self) -> str:
        """Authenticate one local capability, never accept actor identity from JSON."""
        self._require_api_origin()
        self._require_json_content_type()
        self._authenticate_capability()
        return self.authenticated_actor

    def _authenticate_capability(self) -> None:
        presented = self.headers.get("X-Factory-Capability")
        expected = self.capability_token
        if not expected or not presented or not hmac.compare_digest(presented, expected):
            raise ControlPlaneError(401, "invalid_capability", "a valid local capability token is required")

    def _drain_unconsumed_bounded_body(self, method: str) -> None:
        if method != "POST" or getattr(self, "_request_body_consumed", False):
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            return
        try:
            self.rfile.read(length)
        except OSError:
            return

    def _dispatch(self, method: str) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        try:
            if path.startswith("/api/"):
                self._require_api_origin()
            if method == "GET" and path == "/health":
                return self._json(200, {"status": "ok", "mode": "local-static-blueprint"})
            # VNext requirement-to-product API. The legacy routes below remain
            # deprecated compatibility shims while the static console migrates.
            if method == "GET" and path == "/api/projects":
                return self._json(200, {"projects": self.control_plane.projects()})
            if method == "POST" and path == "/api/projects":
                self._authenticate_write()
                body = self._body()
                created = self.control_plane.create_project(body.get("name"), body.get("brief"))
                return self._json(HTTPStatus.CREATED, created)
            if len(parts := path.strip("/").split("/")) == 3 and parts[:2] == ["api", "projects"] and method == "GET":
                return self._json(200, {"project": self.control_plane.get_project(parts[2])})
            if len(parts) == 4 and parts[:2] == ["api", "projects"] and parts[3] == "versions" and method == "POST":
                self._authenticate_write()
                body = self._body()
                version = self.control_plane.create_version(parts[2], body.get("base_version_id"), body.get("definition"))
                return self._json(HTTPStatus.CREATED, {"version": version})
            if len(parts) == 4 and parts[:2] == ["api", "versions"] and parts[3] == "approve" and method == "POST":
                actor = self._authenticate_write()
                self._body()
                return self._json(200, {"version": self.control_plane.approve_version(parts[2], actor)})
            if len(parts) == 4 and parts[:2] == ["api", "versions"] and parts[3] == "plans" and method == "POST":
                self._authenticate_write()
                self._body()
                return self._json(HTTPStatus.CREATED, {"plan": self.control_plane.create_plan_for_version(parts[2])})
            if (
                len(parts) == 5
                and parts[:2] == ["api", "runs"]
                and parts[3] == "artifacts"
                and method == "GET"
            ):
                self._authenticate_capability()
                body, content_type, filename = self.control_plane.get_artifact(
                    parts[2],
                    parts[4],
                )
                return self._bytes(
                    200,
                    body,
                    content_type=content_type,
                    filename=filename,
                )
            # Static UI contract. These endpoints intentionally do not expose
            # project internals or arbitrary executor inputs.
            if method == "GET" and path == "/api/catalog":
                return self._json(200, {"components": self.control_plane.catalog()})
            if method == "POST" and path == "/api/requirements":
                self._authenticate_write()
                body = self._body()
                project = self.control_plane.create_legacy_project(body.get("name", "leave-management"), body.get("requirement"))
                return self._json(HTTPStatus.CREATED, {"requirement_id": project["requirement_id"], "ir_id": project["ir_id"], "ir": project["ir"], "ir_checksum": project["ir_checksum"], "status": project["status"]})
            if len(parts := path.strip("/").split("/")) == 4 and parts[0] == "api" and parts[1] == "irs" and parts[3] == "approve" and method == "POST":
                project = self.control_plane.approve_ir_by_id(parts[2], self._authenticate_write())
                return self._json(200, {"ir_id": project["ir_id"], "status": project["status"], "approved_at": project["ir_approved_at"], "approved_by": project["ir_approved_by"]})
            if len(parts) == 4 and parts[0] == "api" and parts[1] == "irs" and parts[3] == "plans" and method == "POST":
                self._authenticate_write()
                return self._json(HTTPStatus.CREATED, self.control_plane.create_plan_for_ir(parts[2]))
            if len(parts) == 4 and parts[0] == "api" and parts[1] == "plans" and parts[3] == "approve" and method == "POST":
                actor = self._authenticate_write()
                self._body()
                plan = self.control_plane.approve_plan(parts[2], actor)
                return self._json(200, {"plan": plan} if "version_id" in plan else plan)
            if len(parts) == 4 and parts[0] == "api" and parts[1] == "plans" and parts[3] == "runs" and method == "POST":
                self._authenticate_write()
                self._body()
                run = self.control_plane.create_run(parts[2])
                return self._json(HTTPStatus.CREATED, {"run": run} if "phase" in run else run)
            if (
                len(parts) == 4
                and parts[:2] == ["api", "runs"]
                and parts[3] == "stop"
                and method == "POST"
            ):
                self._authenticate_write()
                self._body()
                return self._json(
                    HTTPStatus.ACCEPTED,
                    {"run": self.control_plane.request_stop(parts[2])},
                )
            if len(parts) == 3 and parts[0] == "api" and parts[1] == "runs" and method == "GET":
                run = self.control_plane.get_run(parts[2])
                return self._json(200, {"run": run} if "phase" in run else run)
            self._json(404, {"error": {"code": "not_found", "message": "route was not found"}})
        except ControlPlaneError as error:
            self._drain_unconsumed_bounded_body(method)
            self._json(error.status, {"error": {"code": error.code, "message": error.message}})
        except ValueError:
            self._json(400, {"error": {"code": "invalid_body", "message": "invalid request body"}})


def serve(host: str = "127.0.0.1", port: int = 8080) -> None:
    if not Handler.capability_token:
        raise SystemExit("FACTORY_API_TOKEN must be set to start the API server")
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Factory control plane listening on http://{host}:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    serve()
