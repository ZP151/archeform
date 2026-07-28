"use client";

export type PendingApproval = { id: string; summary: string };

export function ApprovalQueue({ requests, onDecision, pendingDecisionId }: { requests: PendingApproval[]; onDecision: (id: string, decision: "approved" | "rejected") => void; pendingDecisionId?: string }) {
  return <section className="fp-card" data-factory-component="ui.approval-queue@2.2.0"><div className="fp-card-header"><div><p className="fp-card-meta">Action required</p><h2>{{tsx_text:heading}}</h2></div><span className="fp-card-meta">{requests.length} open</span></div><div className="fp-card-body">{requests.length === 0 ? <p className="fp-empty">No requests need a decision.</p> : <ul className="fp-list">{requests.map((request) => <li className="fp-row" key={request.id}><div><strong className="fp-row-title">Pending review</strong><span className="fp-row-copy">{request.summary}</span></div><div className="fp-actions"><button className="fp-secondary" type="button" onClick={() => onDecision(request.id, "rejected")} disabled={pendingDecisionId === request.id} aria-busy={pendingDecisionId === request.id}>{{tsx_text:reject_label}}</button><button className="fp-primary" type="button" onClick={() => onDecision(request.id, "approved")} disabled={pendingDecisionId === request.id} aria-busy={pendingDecisionId === request.id}>{{tsx_text:approve_label}}</button></div></li>)}</ul>}</div></section>;
}
