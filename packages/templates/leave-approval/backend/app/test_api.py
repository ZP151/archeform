import os

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import errors

from app.main import app


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _submit_leave_request(client: TestClient) -> dict:
    response = client.post(
        "/leave-requests",
        headers={"X-Demo-Actor": "employee"},
        json={"start_date": "2026-08-03", "end_date": "2026-08-05", "reason": "Vacation"},
    )
    assert response.status_code == 201
    return response.json()


def _audit_actions_for_request(client: TestClient, leave_request_id: str) -> list[str]:
    response = client.get("/audit-events", headers={"X-Demo-Actor": "hr_admin"})
    assert response.status_code == 200
    return [
        item["action"]
        for item in response.json()
        if item["leave_request_id"] == leave_request_id
    ]


def test_employee_submit_manager_decision_and_hr_audit(client: TestClient) -> None:
    request = _submit_leave_request(client)
    assert request["status"] == "pending"

    decision = client.post(
        f"/leave-requests/{request['id']}/decision",
        headers={"X-Demo-Actor": "manager"},
        json={"decision": "approved"},
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "approved"

    assert _audit_actions_for_request(client, request["id"]) == [
        "leave_request.submitted",
        "leave_request.approved",
    ]


def test_employee_cannot_decide_a_leave_request(client: TestClient) -> None:
    request = _submit_leave_request(client)

    decision = client.post(
        f"/leave-requests/{request['id']}/decision",
        headers={"X-Demo-Actor": "employee"},
        json={"decision": "approved"},
    )
    assert decision.status_code == 403


def test_non_hr_actor_cannot_read_audit_events(client: TestClient) -> None:
    response = client.get("/audit-events", headers={"X-Demo-Actor": "manager"})
    assert response.status_code == 403


def test_manager_can_reject_a_leave_request(client: TestClient) -> None:
    request = _submit_leave_request(client)

    response = client.post(
        f"/leave-requests/{request['id']}/decision",
        headers={"X-Demo-Actor": "manager"},
        json={"decision": "rejected"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert _audit_actions_for_request(client, request["id"]) == [
        "leave_request.submitted",
        "leave_request.rejected",
    ]


def test_invalid_actor_is_rejected(client: TestClient) -> None:
    response = client.get("/leave-requests", headers={"X-Demo-Actor": "contractor"})
    assert response.status_code == 403


@pytest.mark.parametrize("origin", ["http://localhost:3000", "http://127.0.0.1:3000"])
def test_local_browser_origins_receive_narrow_cors_preflight(client: TestClient, origin: str) -> None:
    response = client.options(
        "/leave-requests",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, X-Demo-Actor",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-methods"] == "GET, POST, OPTIONS"
    allowed_headers = {
        header.strip().lower()
        for header in response.headers["access-control-allow-headers"].split(",")
    }
    assert allowed_headers == {
        "accept",
        "accept-language",
        "content-language",
        "content-type",
        "x-demo-actor",
    }
    assert "*" not in response.headers["access-control-allow-origin"]


def test_foreign_browser_origin_is_rejected_by_cors_preflight(client: TestClient) -> None:
    response = client.options(
        "/leave-requests",
        headers={
            "Origin": "https://attacker.invalid",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, X-Demo-Actor",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_repeated_decision_does_not_create_a_second_audit_event(client: TestClient) -> None:
    request = _submit_leave_request(client)
    first_decision = client.post(
        f"/leave-requests/{request['id']}/decision",
        headers={"X-Demo-Actor": "manager"},
        json={"decision": "approved"},
    )
    assert first_decision.status_code == 200

    repeated_decision = client.post(
        f"/leave-requests/{request['id']}/decision",
        headers={"X-Demo-Actor": "manager"},
        json={"decision": "rejected"},
    )
    assert repeated_decision.status_code == 409
    assert _audit_actions_for_request(client, request["id"]) == [
        "leave_request.submitted",
        "leave_request.approved",
    ]


def test_runtime_api_credential_cannot_mutate_or_truncate_audit_events(client: TestClient) -> None:
    request = _submit_leave_request(client)
    destructive_operations = (
        ("DROP TRIGGER audit_events_append_only ON audit_events", ()),
        ("UPDATE audit_events SET action = 'leave_request.approved' WHERE leave_request_id = %s", (request["id"],)),
        ("DELETE FROM audit_events WHERE leave_request_id = %s", (request["id"],)),
        ("TRUNCATE audit_events", ()),
    )
    for statement, parameters in destructive_operations:
        with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
            with pytest.raises(errors.InsufficientPrivilege):
                connection.execute(statement, parameters)
    assert _audit_actions_for_request(client, request["id"]) == ["leave_request.submitted"]
