export type Definition = Record<string, unknown> & { metadata?: { version?: string }; primary_record?: { label?: string; fields?: Array<{ id: string; label: string }> } };
export type Version = { id: string; status: string; created_at?: string; definition: Definition; parent_version_id?: string | null };
export type Plan = { id: string; version_id: string; status: string; components?: Array<{ key: string; version: string; trust_level?: string; selected_for?: string }> };
export type Run = { id: string; plan_id: string; status: string; phase?: string; preview_url?: string | null; artifacts?: Array<{ id: string; path: string; url: string }>; executor?: { status?: string; message?: string | null } };
export type Project = { id: string; name: string; versions: Version[]; plans: Plan[]; runs: Run[] };
