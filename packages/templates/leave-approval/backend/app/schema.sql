CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY,
    employee_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    decided_by TEXT,
    CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY,
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id),
    action TEXT NOT NULL CHECK (action IN ('leave_request.submitted', 'leave_request.approved', 'leave_request.rejected')),
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION reject_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_events are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
CREATE TRIGGER audit_events_append_only
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

CREATE TRIGGER audit_events_append_only_truncate
    BEFORE TRUNCATE ON audit_events
    FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_event_mutation();

CREATE INDEX IF NOT EXISTS audit_events_leave_request_id_created_at_idx
    ON audit_events (leave_request_id, created_at);

GRANT USAGE ON SCHEMA public TO leave_api;
GRANT SELECT, INSERT, UPDATE ON TABLE leave_requests TO leave_api;
GRANT SELECT, INSERT ON TABLE audit_events TO leave_api;
