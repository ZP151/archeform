"use client";

import type { FormEvent } from "react";

export type ApprovalField = { id: string; label: string; type: "string" | "number" | "date" | "enum"; required: boolean; options?: string[] };

const fields: ApprovalField[] = {{json_value:fields}};

export function ApprovalForm({ onSubmit }: { onSubmit: (values: FormData) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); };
  return <section className="fp-card" data-factory-component="ui.approval-form@2.0.1"><div className="fp-card-header"><div><p className="fp-card-meta">New request</p><h2>{{tsx_text:record_label}}</h2></div><span className="fp-status-chip">Draft</span></div><form className="fp-card-body fp-form-grid" aria-label="approval form" onSubmit={submit}>{fields.map((field) => <label className="fp-field" key={field.id}>{field.label}{field.type === "enum" ? <select name={field.id} required={field.required}><option value="">Select</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input name={field.id} type={field.type === "string" ? "text" : field.type} step={field.type === "number" ? "any" : undefined} required={field.required} />}</label>)}<div className="fp-form-actions"><button className="fp-primary" type="submit">{{tsx_text:submit_label}}</button></div></form></section>;
}
