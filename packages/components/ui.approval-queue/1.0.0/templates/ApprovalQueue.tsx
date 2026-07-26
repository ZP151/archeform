"use client";

export type PendingApproval = { id: string; summary: string };

export function ApprovalQueue({ requests, onDecision }: { requests: PendingApproval[]; onDecision: (id: string, decision: "approved" | "rejected") => void }) {
  return <section aria-labelledby="approval-queue-heading"><h2 id="approval-queue-heading">{{tsx_text:heading}}</h2><ul>{requests.map((request) => <li key={request.id}>{request.summary}<button type="button" onClick={() => onDecision(request.id, "approved")}>{{tsx_text:approve_label}}</button><button type="button" onClick={() => onDecision(request.id, "rejected")}>{{tsx_text:reject_label}}</button></li>)}</ul></section>;
}
