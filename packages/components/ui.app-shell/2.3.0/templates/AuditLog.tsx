export type AuditEvent = { id: string; action: string; actor: string; occurredAt: string };

export function AuditLog({ events }: { events: AuditEvent[] }) {
  return <section className="fp-card" data-factory-component="ui.app-shell.audit@2.3.0"><div className="fp-card-header"><div><p className="fp-card-meta">Immutable evidence</p><h2>{{tsx_text:audit_heading}}</h2></div><span className="fp-card-meta">{events.length} events</span></div><div className="fp-card-body">{events.length === 0 ? <p className="fp-empty">No audit events available.</p> : <ol className="fp-list">{events.map((event) => <li className="fp-row" key={event.id}><div><strong className="fp-row-title">{event.action}</strong><span className="fp-row-copy">{event.actor} · {event.occurredAt}</span></div><span className="fp-status-chip">Logged</span></li>)}</ol>}</div></section>;
}
