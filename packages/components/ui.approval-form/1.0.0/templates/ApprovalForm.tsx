"use client";

import type { FormEvent } from "react";

export type ApprovalField = { id: string; label: string; type: "string" | "number" | "date" | "enum"; required: boolean; options?: string[] };

const fields: ApprovalField[] = {{json_value:fields}};

export function ApprovalForm({ onSubmit }: { onSubmit: (values: FormData) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

  return <form aria-label="approval form" onSubmit={submit}><h2>{{tsx_text:record_label}}</h2>{fields.map((field) => <label key={field.id}>{field.label}{field.type === "enum" ? <select name={field.id} required={field.required}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input name={field.id} type={field.type === "string" ? "text" : field.type} required={field.required} />}</label>)}<button type="submit">{{tsx_text:submit_label}}</button></form>;
}
