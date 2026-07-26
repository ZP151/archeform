from __future__ import annotations

import json
import os
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT))

from apps.api.component_contract import render_adapter_template_text, validate_component_package


PACKAGE_BASE = ROOT / "packages" / "components"
EXPECTED = {
    "backend.session-auth",
    "backend.rbac",
    "backend.record-api",
    "workflow.single-level-approval",
    "ops.audit-log",
    "data.postgres-runtime",
}


class SessionAuthPackageTests(unittest.TestCase):
    def test_discoverable_backend_data_suite_validates_and_renders_every_declared_template(self) -> None:
        """CI entry point: python -B -m unittest discover -s packages/components/backend.session-auth/1.0.0/tests -v."""
        available = {(key, "1.0.0") for key in EXPECTED}
        for key in sorted(EXPECTED):
            with self.subTest(component=key):
                package = PACKAGE_BASE / key / "1.0.0"
                manifest = validate_component_package(
                    package,
                    available_identities=available,
                    approved_package_root=PACKAGE_BASE,
                )
                fixture = json.loads((package / "fixtures" / "inputs.json").read_text(encoding="utf-8"))
                self.assertFalse(list(Draft202012Validator(manifest["input_schema"]).iter_errors(fixture)))
                adapter = json.loads((package / "adapter.json").read_text(encoding="utf-8"))
                for contribution in adapter["contributions"]:
                    template = (package / contribution["source"]).read_text(encoding="utf-8")
                    rendered = render_adapter_template_text(template, contribution, fixture)
                    self.assertNotIn("{{", rendered)
                    self.assertNotIn("}}", rendered)
                    if contribution["source"].endswith(".py.tmpl"):
                        compile(rendered, contribution["source"], "exec")

    def _local_framework_modules(self) -> dict[str, types.ModuleType]:
        fastapi = types.ModuleType("fastapi")

        class APIRouter:
            def post(self, _path: str):
                return lambda handler: handler

        class HTTPException(Exception):
            def __init__(self, *, status_code: int, detail: str) -> None:
                super().__init__(detail)
                self.status_code = status_code

        class Response:
            def __init__(self) -> None:
                self.cookies: list[tuple[tuple[object, ...], dict[str, object]]] = []

            def set_cookie(self, *_args: object, **_kwargs: object) -> None:
                self.cookies.append((_args, _kwargs))

        fastapi.APIRouter = APIRouter
        fastapi.Cookie = lambda **_kwargs: None
        fastapi.HTTPException = HTTPException
        fastapi.Response = Response
        fastapi.status = types.SimpleNamespace(HTTP_403_FORBIDDEN=403)
        pydantic = types.ModuleType("pydantic")
        pydantic.BaseModel = type("BaseModel", (), {})
        return {"fastapi": fastapi, "pydantic": pydantic}

    def _session_module(self) -> dict[str, object]:
        package = PACKAGE_BASE / "backend.session-auth" / "1.0.0"
        manifest = validate_component_package(
            package,
            available_identities={(key, "1.0.0") for key in EXPECTED},
            approved_package_root=PACKAGE_BASE,
        )
        fixture = json.loads((package / "fixtures" / "inputs.json").read_text(encoding="utf-8"))
        self.assertFalse(list(Draft202012Validator(manifest["input_schema"]).iter_errors(fixture)))
        adapter = json.loads((package / "adapter.json").read_text(encoding="utf-8"))
        contribution = adapter["contributions"][0]
        template = (package / contribution["source"]).read_text(encoding="utf-8")
        rendered = render_adapter_template_text(template, contribution, fixture)
        self.assertNotIn("{{", rendered)
        namespace: dict[str, object] = {"__name__": "generated_session_auth"}
        with mock.patch.dict(sys.modules, self._local_framework_modules()):
            exec(compile(rendered, "session_auth.py", "exec"), namespace)
        return namespace

    def test_valid_signed_session_resolves_only_a_declared_role(self) -> None:
        session = self._session_module()
        with mock.patch.dict(os.environ, {"APP_SESSION_SIGNING_KEY": "test-signing-key"}, clear=False):
            token = session["issue_session"]("employee", now=1_000)
            self.assertEqual("employee", session["resolve_session_actor"](token, now=1_010))
            with self.assertRaises(ValueError):
                session["issue_session"]("attacker", now=1_000)

    def test_missing_tampered_or_expired_session_never_resolves_an_actor(self) -> None:
        session = self._session_module()
        with mock.patch.dict(os.environ, {"APP_SESSION_SIGNING_KEY": "test-signing-key"}, clear=False):
            token = session["issue_session"]("manager", now=1_000)
            self.assertIsNone(session["resolve_session_actor"](None, now=1_001))
            self.assertIsNone(session["resolve_session_actor"](token + "x", now=1_001))
            self.assertIsNone(session["resolve_session_actor"](token, now=9_000))

    def test_public_sign_in_assigns_only_the_server_mapped_role(self) -> None:
        session = self._session_module()
        directory = {
            "employee-alice": {
                "password_sha256": __import__("hashlib").sha256(b"employee-development-password").hexdigest(),
                "role": "employee",
            },
            "manager-morgan": {
                "password_sha256": __import__("hashlib").sha256(b"manager-development-password").hexdigest(),
                "role": "manager",
            },
        }
        environment = {
            "APP_SESSION_SIGNING_KEY": "test-signing-key",
            "APP_LOCAL_USERS_JSON": json.dumps(directory),
        }
        with mock.patch.dict(os.environ, environment, clear=False):
            response = session["Response"]()
            forged_role_payload = types.SimpleNamespace(
                username="employee-alice",
                password="employee-development-password",
                role="hr_admin",
            )
            result = session["sign_in"](forged_role_payload, response)
            self.assertEqual({"actor": "employee"}, result)
            token = response.cookies[0][0][1]
            self.assertEqual("employee", session["resolve_session_actor"](token))

            unauthorized = types.SimpleNamespace(
                username="employee-alice",
                password="wrong-password",
                role="manager",
            )
            with self.assertRaises(session["HTTPException"]):
                session["sign_in"](unauthorized, session["Response"]())

            manager = types.SimpleNamespace(
                username="manager-morgan",
                password="manager-development-password",
                role="hr_admin",
            )
            self.assertEqual({"actor": "manager"}, session["sign_in"](manager, session["Response"]()))

    def test_missing_signing_key_returns_a_bounded_denial_without_setting_a_cookie(self) -> None:
        session = self._session_module()
        directory = {
            "employee-alice": {
                "password_sha256": __import__("hashlib").sha256(b"employee-development-password").hexdigest(),
                "role": "employee",
            },
        }
        with mock.patch.dict(os.environ, {"APP_LOCAL_USERS_JSON": json.dumps(directory)}, clear=True):
            response = session["Response"]()
            payload = types.SimpleNamespace(username="employee-alice", password="employee-development-password")
            with self.assertRaises(session["HTTPException"]) as raised:
                session["sign_in"](payload, response)
            self.assertEqual(403, raised.exception.status_code)
            self.assertEqual("Local sign-in was not accepted", str(raised.exception))
            self.assertEqual([], response.cookies)


if __name__ == "__main__":
    unittest.main()
