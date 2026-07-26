'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Definition, FieldType, RoleKind } from '@/lib/types';

const roleKinds: RoleKind[] = ['submitter', 'approver', 'auditor', 'observer'];
const fieldTypes: FieldType[] = ['string', 'number', 'date', 'enum'];
const identifiers = /^[a-z][a-z0-9_]{1,62}$/;
const credential = /(?:api[_ -]?key|secret|password|token|private[_ -]?key)\s*[:=]/i;

export function validateDefinition(value: Definition): string | null {
  if (value.roles.length < 2 || value.roles.length > 5) return 'Use between two and five roles.';
  if (value.roles.filter((role) => role.kind === 'submitter').length !== 1 || value.roles.filter((role) => role.kind === 'approver').length !== 1) return 'Use exactly one submitter and one approver.';
  if (value.roles.some((role) => !identifiers.test(role.id) || !role.label.trim()) || new Set(value.roles.map((role) => role.id)).size !== value.roles.length) return 'Every role needs a unique valid ID and label.';
  const record = value.primary_record;
  if (!identifiers.test(record.id) || !record.label.trim()) return 'The primary record needs a valid ID and label.';
  if (record.fields.length < 1 || record.fields.length > 8) return 'Use between one and eight fields.';
  if (record.fields.some((field) => !identifiers.test(field.id) || !field.label.trim()) || new Set(record.fields.map((field) => field.id)).size !== record.fields.length) return 'Every field needs a unique valid ID and label.';
  if (record.fields.some((field) => field.type === 'enum' && (!field.options?.length || field.options.length > 12 || new Set(field.options).size !== field.options.length))) return 'Every enum field needs one to twelve unique options.';
  if (value.pages.length !== 4 || value.pages.some((page) => !page.label.trim())) return 'The four Golden page responsibilities need labels.';
  if (value.assumptions.length > 12 || value.open_questions.length > 12 || [...value.assumptions, ...value.open_questions].some((line) => !line.trim() || line.length > 300)) return 'Use at most twelve plain-text assumptions and questions.';
  const text = [record.label, ...value.roles.map((role) => role.label), ...record.fields.flatMap((field) => [field.label, ...(field.options || [])]), ...value.pages.map((page) => page.label), ...value.assumptions, ...value.open_questions];
  if (text.some((item) => credential.test(item))) return 'Definition text cannot contain credential assignments.';
  return null;
}

function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }

export function DefinitionEditor({ value, onChange }: { value: Definition; onChange: (value: Definition) => void }) {
  const update = (recipe: (draft: Definition) => void) => { const next = structuredClone(value); recipe(next); onChange(next); };
  return <div className="definition-editor">
    <section><h3>Roles</h3><p>Two to five roles with one submitter and one approver.</p>{value.roles.map((role, index) => <div className="editor-row" key={`${role.id}-${index}`}><Label htmlFor={`role-${index}-id`}>Role {index + 1} ID</Label><Input id={`role-${index}-id`} value={role.id} onChange={(event) => update((draft) => { draft.roles[index].id = event.target.value; })} /><Label htmlFor={`role-${index}-label`}>Role {index + 1} label</Label><Input id={`role-${index}-label`} value={role.label} onChange={(event) => update((draft) => { draft.roles[index].label = event.target.value; })} /><Label htmlFor={`role-${index}-kind`}>Role {index + 1} responsibility</Label><select id={`role-${index}-kind`} value={role.kind} onChange={(event) => update((draft) => { draft.roles[index].kind = event.target.value as RoleKind; })}>{roleKinds.map((kind) => <option value={kind} key={kind}>{kind}</option>)}</select></div>)}<Button type="button" variant="outline" disabled={value.roles.length >= 5} onClick={() => update((draft) => { draft.roles.push({ id: `observer_${draft.roles.length + 1}`, label: `Observer ${draft.roles.length + 1}`, kind: 'observer' }); })}>Add role</Button></section>
    <section><h3>Primary record</h3><div className="editor-row"><Label htmlFor="record-id">Record ID</Label><Input id="record-id" value={value.primary_record.id} onChange={(event) => update((draft) => { draft.primary_record.id = event.target.value; })} /><Label htmlFor="record-label">Primary record label</Label><Input id="record-label" value={value.primary_record.label} onChange={(event) => update((draft) => { draft.primary_record.label = event.target.value; })} /></div></section>
    <section><h3>Fields</h3>{value.primary_record.fields.map((field, index) => <div className="editor-row" key={`${field.id}-${index}`}><Label htmlFor={`field-${index}-id`}>Field {index + 1} ID</Label><Input id={`field-${index}-id`} value={field.id} onChange={(event) => update((draft) => { draft.primary_record.fields[index].id = event.target.value; })} /><Label htmlFor={`field-${index}-label`}>Field {index + 1} label</Label><Input id={`field-${index}-label`} value={field.label} onChange={(event) => update((draft) => { draft.primary_record.fields[index].label = event.target.value; })} /><Label htmlFor={`field-${index}-type`}>Field {index + 1} type</Label><select id={`field-${index}-type`} value={field.type} onChange={(event) => update((draft) => { const current = draft.primary_record.fields[index]; current.type = event.target.value as FieldType; if (current.type !== 'enum') delete current.options; else current.options ||= ['Option']; })}>{fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>{field.type === 'enum' && <><Label htmlFor={`field-${index}-options`}>Field {index + 1} options</Label><Input id={`field-${index}-options`} value={(field.options || []).join(', ')} onChange={(event) => update((draft) => { draft.primary_record.fields[index].options = event.target.value.split(',').map((item) => item.trim()).filter(Boolean); })} /></>}</div>)}<Button type="button" variant="outline" disabled={value.primary_record.fields.length >= 8} onClick={() => update((draft) => { draft.primary_record.fields.push({ id: `field_${draft.primary_record.fields.length + 1}`, label: `Field ${draft.primary_record.fields.length + 1}`, type: 'string', required: false }); })}>Add field</Button></section>
    <section><h3>Pages</h3>{value.pages.map((page, index) => <div className="editor-row" key={page.id}><Label htmlFor={`page-${page.id}`}>{page.id} page label</Label><Input id={`page-${page.id}`} value={page.label} onChange={(event) => update((draft) => { draft.pages[index].label = event.target.value; })} /></div>)}</section>
    <section className="editor-row"><Label htmlFor="assumptions">Assumptions</Label><Textarea id="assumptions" value={value.assumptions.join('\n')} onChange={(event) => update((draft) => { draft.assumptions = lines(event.target.value); })} /><Label htmlFor="open-questions">Open questions</Label><Textarea id="open-questions" value={value.open_questions.join('\n')} onChange={(event) => update((draft) => { draft.open_questions = lines(event.target.value); })} /></section>
  </div>;
}
