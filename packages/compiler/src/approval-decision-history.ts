/** Private read-only interaction; server audit/read permissions remain authoritative. */
export const approvalDecisionHistory = {
  key: "approval-decision-history",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: [
    "button",
    "card",
    "badge",
    "loading-state",
    "empty-state",
    "error-state",
  ],
  icons: ["receipt-text", "refresh-cw", "circle-check", "circle-x"],
} as const;

export function renderApprovalDecisionHistory(
  entityKey: string,
  correction = false,
): string {
  return `
type DecisionEvent = { actor: string; action: string; entity: string; recordId: string;${correction ? " reason: string | null;" : ""} at: string };
type DecisionHistoryState = { scope: string; open: boolean; phase: 'idle' | 'loading' | 'success' | 'error'; events: readonly DecisionEvent[]; records: readonly JsonRecord[] };
function decisionHistoryPayload(audit: unknown, records: unknown, entity: string) {
  const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
  if (!Array.isArray(audit) || !Array.isArray(records)) throw new SafeUiError('Decision history is unavailable. Try again.');
  const events = audit.map((item: unknown): DecisionEvent => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new SafeUiError('Decision history is unavailable. Try again.');
    const value = item as Record<string, unknown>;
    if (!nonempty(value.actor) || !nonempty(value.action) || !nonempty(value.entity) || !nonempty(value.recordId) || !nonempty(value.at) || !Number.isFinite(new Date(value.at).getTime())) throw new SafeUiError('Decision history is unavailable. Try again.');
    return { actor: value.actor, action: value.action, entity: value.entity, recordId: value.recordId,${correction ? " reason: typeof value.reason === 'string' ? value.reason : null," : ""} at: value.at };
  });
  if (records.some((record: unknown) => !record || typeof record !== 'object' || Array.isArray(record) || !nonempty((record as JsonRecord).id))) throw new SafeUiError('Decision history is unavailable. Try again.');
  return { events: events.filter((event) => event.entity === entity && (event.action === 'approve' || event.action === 'reject')), records: records as JsonRecord[] };
}
function decisionIdentityFields(entity: RuntimeEntity, record: JsonRecord | undefined): readonly RuntimeField[] {
  if (!record) return [];
  const item = entity.fields.filter((field) => field.key === 'item' && field.type === 'string');
  if (item.length === 1 && typeof record.item === 'string' && record.item.trim()) return item;
  return selectSummaryFields(entity.fields).flatMap((key) => {
    const field = entity.fields.find((candidate) => candidate.key === key);
    const value = key ? record[key] : undefined;
    return field && value !== null && value !== undefined && value !== '' && (typeof value !== 'string' || value.trim()) ? [field] : [];
  }).slice(0, 2);
}
function DecisionHistoryRow({ event, entity, record }: { readonly event: DecisionEvent; readonly entity: RuntimeEntity; readonly record: JsonRecord | undefined }) {
  const identity = decisionIdentityFields(entity, record);
  const safeValue = (field: RuntimeField, value: unknown) => value && typeof value === 'object' ? 'Structured value' : formatValue(field, value);
  return <li className={'approval-history-row approval-tone-' + (event.action === 'approve' ? 'positive' : 'negative')}>
    <h3>{identity.length ? identity.map((field, index) => <span key={field.key}>{index ? ' · ' : ''}{field.key === 'item' ? null : fieldLabel(field.key) + ': '}{safeValue(field, record![field.key])}</span>) : entity.label + ' decision'}</h3>
    <div className='approval-history-outcome'><span className='approval-badge'><ApprovalIcon name={event.action === 'approve' ? 'circle-check' : 'circle-x'} />{${correction ? "event.action === 'reject' ? 'Return' : fieldLabel(event.action)" : "fieldLabel(event.action)"}}</span><span>Demo role: {fieldLabel(event.actor)}</span>{formatValue({ type: 'datetime' }, event.at)}</div>
${correction ? "    {event.reason ? <p className='approval-return-reason'>{event.reason}</p> : null}\n" : ""}    {!identity.length ? <p className='approval-history-reference'>Record ID: {event.recordId}</p> : null}
    {record ? <details><summary>Details</summary><dl className='approval-details-values'><div><dt>ID</dt><dd>{event.recordId}</dd></div>{entity.fields.filter((field) => !identity.includes(field)).map((field) => <div key={field.key}><dt>{fieldLabel(field.key)}</dt><dd>{safeValue(field, record[field.key])}</dd></div>)}</dl></details> : null}
  </li>;
}
function ApprovalDecisionHistory({ role }: { readonly role: string }) {
  const entity = entityFor(${JSON.stringify(entityKey)});
  const allowed = Boolean(entity && can(role, entity.key, 'read') && can(role, entity.key, 'audit'));
  const scope = JSON.stringify([role, entity?.key]);
  const empty = (): DecisionHistoryState => ({ scope, open: false, phase: 'idle', events: [], records: [] });
  const [state, setState] = useState<DecisionHistoryState>(empty);
  const generation = useRef({ scope, version: 0, pending: false });
  const mounted = useRef(true);
  if (generation.current.scope !== scope) {
    generation.current = { scope, version: generation.current.version + 1, pending: false };
    setState(empty());
  }
  const current = state.scope === scope ? state : empty();
  const token = generation.current;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = async () => {
    if (!allowed || !entity || !mounted.current || generation.current !== token || token.pending) return;
    token.pending = true;
    setState((previous) => ({ ...previous, phase: 'loading', events: [], records: [] }));
    try {
      const [auditResponse, recordsResponse] = await Promise.all([
        fetch('/api/audit', { headers: requestHeaders(role) }),
        fetch('/api/' + entity.key, { headers: requestHeaders(role) }),
      ]);
      if (!auditResponse.ok || !recordsResponse.ok) throw new SafeUiError('Decision history is unavailable. Try again.');
      const [audit, records] = await Promise.all([auditResponse.json(), recordsResponse.json()]);
      const result = decisionHistoryPayload(audit, records, entity.key);
      if (mounted.current && generation.current === token) setState((previous) => ({ ...previous, ...result, phase: 'success' }));
    } catch {
      if (mounted.current && generation.current === token) setState((previous) => ({ ...previous, events: [], records: [], phase: 'error' }));
    } finally {
      if (generation.current === token) token.pending = false;
    }
  };
  if (!allowed || !entity) return null;
  return <details key={scope} className='approval-decision-history' open={current.open} onToggle={(event) => {
    if (generation.current !== token) return;
    const open = event.currentTarget.open;
    setState((previous) => previous.open === open ? previous : { ...previous, open });
    if (open && current.phase === 'idle') void load();
  }}>
    <summary><ApprovalIcon name='receipt-text' />Decision history</summary>
    {current.open ? <div className='approval-history-content' aria-busy={current.phase === 'loading'}>
      {current.phase === 'loading' ? <p role='status'>Loading decisions…</p> : null}
      {current.phase === 'error' ? <div><p role='alert'>Decision history is unavailable. Try again.</p><button type='button' onClick={() => void load()}>Retry</button></div> : null}
      {current.phase === 'success' ? <><div className='approval-history-toolbar'><button type='button' className='approval-refresh' aria-label='Refresh' title='Refresh' onClick={() => void load()}><ApprovalIcon name='refresh-cw' /></button></div>{current.events.length === 0 ? <p role='status'>No decisions yet.</p> : <ol className='approval-history-list'>{current.events.map((event, index) => <DecisionHistoryRow key={index} event={event} entity={entity} record={current.records.find((record) => record.id === event.recordId)} />)}</ol>}</> : null}
    </div> : null}
  </details>;
}
`;
}

export const approvalDecisionHistoryStyles = `
.approval-v1 .approval-decision-history { --approval-decision-history-version: 1; grid-column: 1 / -1; min-width: 0; border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); background: var(--factory-surface); }
.approval-v1 .approval-decision-history > summary { min-height: 44px; padding: var(--factory-spacing-space-3); cursor: pointer; color: var(--factory-accent); }
.approval-v1 .approval-decision-history > summary .approval-icon { margin-inline-end: var(--factory-spacing-space-2); }
.approval-v1 .approval-history-content { padding: 0 var(--factory-spacing-space-4) var(--factory-spacing-space-4); }
.approval-v1 .approval-history-content button { min-height: 44px; }
.approval-v1 .approval-history-toolbar { display: flex; justify-content: flex-end; }
.approval-v1 .approval-history-list { list-style: none; padding: 0; margin: 0; }
.approval-v1 .approval-history-row { min-width: 0; padding-block: var(--factory-spacing-space-4); background: var(--factory-surface); border-block-start: 1px solid var(--factory-border); overflow-wrap: anywhere; }
.approval-v1 .approval-history-row h3 { font-size: var(--factory-typography-font-size-base); font-weight: var(--factory-typography-font-weight-bold); }
.approval-v1 .approval-history-outcome { display: flex; flex-wrap: wrap; align-items: center; gap: var(--factory-spacing-space-3); padding-block: var(--factory-spacing-space-2); font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-history-row details > summary { min-height: 44px; padding-block: var(--factory-spacing-space-3); cursor: pointer; }
.approval-v1 .approval-history-reference { color: var(--factory-muted); font-size: var(--factory-typography-font-size-sm); }
`;
