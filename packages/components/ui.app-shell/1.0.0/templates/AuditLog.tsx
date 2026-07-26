export type AuditEvent = { id: string; action: string; actor: string; occurredAt: string };

export function AuditLog({ events }: { events: AuditEvent[] }) {
  return <section aria-labelledby="audit-heading"><h2 id="audit-heading">{{tsx_text:audit_heading}}</h2><ol>{events.map((event) => <li key={event.id}><strong>{event.action}</strong> by {event.actor} at {event.occurredAt}</li>)}</ol></section>;
}
