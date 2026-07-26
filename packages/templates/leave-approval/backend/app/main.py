"""Role-aware leave approval API for the generated local demonstration."""

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


DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://leave:leave@db:5432/leave_approval")
DEMO_ROLES = frozenset({"employee", "manager", "hr_admin"})


class LeaveRequestInput(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(min_length=1, max_length=500)


class LeaveDecisionInput(BaseModel):
    decision: Literal["approved", "rejected"]


def _connect() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


app = FastAPI(title="Leave Approval API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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


def _leave_request_response(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "employee_id": row["employee_id"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "reason": row["reason"],
        "status": row["status"],
        "created_at": row["created_at"],
        "decided_at": row["decided_at"],
        "decided_by": row["decided_by"],
    }


def _audit_response(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "leave_request_id": str(row["leave_request_id"]),
        "action": row["action"],
        "actor": row["actor"],
        "created_at": row["created_at"],
    }


@app.get("/health")
def health() -> dict[str, str]:
    with _connect() as connection:
        connection.execute("SELECT 1")
    return {"status": "ok"}


@app.post("/leave-requests", status_code=status.HTTP_201_CREATED)
def submit_leave_request(payload: LeaveRequestInput, actor: str = Depends(get_actor)) -> dict:
    require_role(actor, "employee")
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_date must not precede start_date")
    if not payload.reason.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="reason must not be blank")

    leave_request_id = uuid4()
    with _connect() as connection, connection.transaction():
        row = connection.execute(
            """
            INSERT INTO leave_requests (id, employee_id, start_date, end_date, reason, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
            RETURNING id, employee_id, start_date, end_date, reason, status, created_at, decided_at, decided_by
            """,
            (leave_request_id, actor, payload.start_date, payload.end_date, payload.reason.strip()),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO audit_events (id, leave_request_id, action, actor)
            VALUES (%s, %s, 'leave_request.submitted', %s)
            """,
            (uuid4(), leave_request_id, actor),
        )
    return _leave_request_response(row)


@app.get("/leave-requests")
def list_leave_requests(actor: str = Depends(get_actor)) -> list[dict]:
    with _connect() as connection:
        if actor == "employee":
            rows = connection.execute(
                """
                SELECT id, employee_id, start_date, end_date, reason, status, created_at, decided_at, decided_by
                FROM leave_requests WHERE employee_id = %s ORDER BY created_at, id
                """,
                (actor,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id, employee_id, start_date, end_date, reason, status, created_at, decided_at, decided_by
                FROM leave_requests ORDER BY created_at, id
                """
            ).fetchall()
    return [_leave_request_response(row) for row in rows]


@app.post("/leave-requests/{leave_request_id}/decision")
def decide_leave_request(
    leave_request_id: UUID,
    payload: LeaveDecisionInput,
    actor: str = Depends(get_actor),
) -> dict:
    require_role(actor, "manager")
    action = {
        "approved": "leave_request.approved",
        "rejected": "leave_request.rejected",
    }[payload.decision]
    with _connect() as connection, connection.transaction():
        row = connection.execute(
            """
            UPDATE leave_requests
            SET status = %s, decided_at = CURRENT_TIMESTAMP, decided_by = %s
            WHERE id = %s AND status = 'pending'
            RETURNING id, employee_id, start_date, end_date, reason, status, created_at, decided_at, decided_by
            """,
            (payload.decision, actor, leave_request_id),
        ).fetchone()
        if row is None:
            exists = connection.execute("SELECT status FROM leave_requests WHERE id = %s", (leave_request_id,)).fetchone()
            if exists is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request was not found")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Leave request has already been decided")
        connection.execute(
            """
            INSERT INTO audit_events (id, leave_request_id, action, actor)
            VALUES (%s, %s, %s, %s)
            """,
            (uuid4(), leave_request_id, action, actor),
        )
    return _leave_request_response(row)


@app.get("/audit-events")
def list_audit_events(actor: str = Depends(get_actor)) -> list[dict]:
    require_role(actor, "hr_admin")
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT id, leave_request_id, action, actor, created_at
            FROM audit_events ORDER BY created_at, id
            """
        ).fetchall()
    return [_audit_response(row) for row in rows]
