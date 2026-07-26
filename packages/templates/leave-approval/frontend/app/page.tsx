"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Actor = "employee" | "manager" | "hr_admin";

type LeaveRequest = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null;
};

type AuditEvent = {
  id: string;
  leave_request_id: string;
  action: string;
  actor: string;
  created_at: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function apiRequest<T>(path: string, actor: Actor, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Demo-Actor": actor,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(failure?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function LeaveApprovalPage() {
  const [actor, setActor] = useState<Actor>("employee");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const nextRequests = await apiRequest<LeaveRequest[]>("/leave-requests", actor);
      setRequests(nextRequests);
      if (actor === "hr_admin") {
        setAuditEvents(await apiRequest<AuditEvent[]>("/audit-events", actor));
      } else {
        setAuditEvents([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load application data");
    }
  }, [actor]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    try {
      await apiRequest<LeaveRequest>("/leave-requests", actor, {
        method: "POST",
        body: JSON.stringify({
          start_date: form.get("start_date"),
          end_date: form.get("end_date"),
          reason: form.get("reason"),
        }),
      });
      formElement.reset();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit leave request");
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: string, decision: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await apiRequest<LeaveRequest>(`/leave-requests/${requestId}/decision`, actor, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record decision");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Factory Pilot · generated application</p>
          <h1>Leave approval</h1>
          <p className="subtitle">Submit requests, make manager decisions, and inspect the audit trail.</p>
        </div>
        <label className="actor">
          Demo actor
          <select value={actor} onChange={(event) => setActor(event.target.value as Actor)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr_admin">HR administrator</option>
          </select>
        </label>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {actor === "employee" && (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Employee workspace</p>
            <h2>Request leave</h2>
          </div>
          <form className="request-form" onSubmit={submitRequest}>
            <label>
              Start date
              <input name="start_date" type="date" required />
            </label>
            <label>
              End date
              <input name="end_date" type="date" required />
            </label>
            <label className="reason">
              Reason
              <textarea name="reason" maxLength={500} required />
            </label>
            <button disabled={busy} type="submit">{busy ? "Submitting…" : "Submit request"}</button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">{actor === "manager" ? "Decision queue" : "Request register"}</p>
          <h2>{actor === "manager" ? "Pending requests" : "Leave requests"}</h2>
        </div>
        <div className="request-list">
          {requests.filter((request) => actor !== "manager" || request.status === "pending").map((request) => (
            <article className="request-card" key={request.id}>
              <div>
                <span className={`status ${request.status}`}>{request.status}</span>
                <h3>{request.start_date} → {request.end_date}</h3>
                <p>{request.reason}</p>
                <small>Requested by {request.employee_id}</small>
              </div>
              {actor === "manager" && request.status === "pending" && (
                <div className="decision-actions">
                  <button disabled={busy} onClick={() => void decide(request.id, "approved")}>Approve</button>
                  <button className="secondary" disabled={busy} onClick={() => void decide(request.id, "rejected")}>Reject</button>
                </div>
              )}
            </article>
          ))}
          {requests.filter((request) => actor !== "manager" || request.status === "pending").length === 0 && (
            <p className="empty">No requests are available for this role.</p>
          )}
        </div>
      </section>

      {actor === "hr_admin" && (
        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Governance</p>
            <h2>Append-only audit trail</h2>
          </div>
          <ol className="audit-list">
            {auditEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.action}</strong>
                <span>{event.actor} · {new Date(event.created_at).toLocaleString()}</span>
              </li>
            ))}
            {auditEvents.length === 0 && <li className="empty">No audit events yet.</li>}
          </ol>
        </section>
      )}
    </main>
  );
}
