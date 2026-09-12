/** Private emitted components for the accepted approval presentation. */
import {
  approvalVisualAssets,
  approvalVisualDataUrl,
  selectApprovalRecordMaterial,
} from "./approval-visual-assets.js";

export const approvalPresentationComponents = {
  key: "approval-presentation-components",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: ["card", "badge", "separator", "compact-sidebar-navigation"],
} as const;

export function renderApprovalPresentationComponents(
  entityKey: string | undefined,
  fields: Parameters<typeof selectApprovalRecordMaterial>[0],
): string {
  const materialKey = entityKey
    ? selectApprovalRecordMaterial(fields)
    : undefined;
  const includeExpenseMaterial = materialKey === "approval-expense-material";
  const selection = materialKey
    ? {
        entityKey,
        key: materialKey,
        fields: fields.map((field) => ({
          ...field,
          required: Boolean(field.required),
        })),
      }
    : null;
  const materials = Object.fromEntries(
    Object.values(approvalVisualAssets)
      .filter(
        (asset) =>
          asset.key === "approval-workspace-material" || includeExpenseMaterial,
      )
      .map((asset) => [
        asset.key,
        {
          key: asset.key,
          src: approvalVisualDataUrl(asset),
          width: asset.width,
          height: asset.height,
        },
      ]),
  );

  return `
const approvalMaterials: Readonly<Record<string, { readonly key: string; readonly src: string; readonly width: number; readonly height: number }>> = ${JSON.stringify(materials).replaceAll("<", "\\u003c")};
type ApprovalMaterialKey = string;
function approvalFieldMatches(field: RuntimeField, expected: { readonly key: string; readonly type: string; readonly required: boolean; readonly values?: readonly string[] }) {
  return field.key === expected.key && field.type === expected.type && field.required === expected.required && JSON.stringify(field.values ?? []) === JSON.stringify(expected.values ?? []);
}
const approvalRecordMaterialSelection = ${JSON.stringify(selection).replaceAll("<", "\\u003c")};
function approvalMaterialKey(fields: readonly RuntimeField[], entityKey: string): ApprovalMaterialKey | undefined {
  const selection = approvalRecordMaterialSelection as { readonly entityKey: string; readonly key: string; readonly fields: readonly RuntimeField[] } | null;
  if (!selection || selection.entityKey !== entityKey) return undefined;
  return selection.fields.length === fields.length && selection.fields.every((expected) => fields.filter((field) => approvalFieldMatches(field, expected)).length === 1) ? selection.key : undefined;
}
function ApprovalMaterial({ materialKey, className = '' }: { readonly materialKey: ApprovalMaterialKey; readonly className?: string }) {
  const [failed, setFailed] = useState(false);
  const asset = approvalMaterials[materialKey];
  if (!asset) return null;
  return <div className={'approval-material ' + className} style={{ aspectRatio: asset.width + ' / ' + asset.height }} aria-hidden={true}>{failed ? <span className='approval-material-fallback' /> : <img data-approval-material={asset.key} src={asset.src} width={asset.width} height={asset.height} alt='' onError={() => setFailed(true)} />}<span className='approval-material-caption'>Illustration</span></div>;
}
function approvalHeroEntity(page: PageRuntimeProjection['pages'][number]): RuntimeEntity | undefined {
  if (!page.blocks.some((block) => ['stats', 'list', 'queue', 'collection'].includes(block.type)) || page.blocks.some((block) => ['form', 'detail'].includes(block.type))) return undefined;
  const keys = [...new Set(page.blocks.filter((block) => ['list', 'queue', 'collection'].includes(block.type)).map((block) => block.entity).filter(Boolean))];
  const candidates = keys.length ? definition.entities.filter((entity) => keys.includes(entity.key)) : definition.entities.filter((entity) => approvalProgressSteps(entity, 'draft'));
  return candidates.length === 1 ? candidates[0] : undefined;
}
function ApprovalPageHero({ page, role, formRoutes }: { readonly page: PageRuntimeProjection['pages'][number]; readonly role: string; readonly formRoutes: Readonly<Record<string, string>> }) {
  const entity = approvalHeroEntity(page);
  return entity ? <ApprovalFamilyHero title={page.title} entity={entity} role={role} formRoute={formRoutes[entity.key]} /> : null;
}
function ApprovalFamilyHero({ title, entity, role, formRoute }: { readonly title: string; readonly entity: RuntimeEntity; readonly role: string; readonly formRoute?: string }) {
  return <section className='approval-family-hero'><div className='approval-family-hero-copy'><h2>{title}</h2>{formRoute && can(role, entity.key, 'create') ? <a className='generated-primary' href={formRoute}>New {entity.label.toLowerCase()}</a> : null}</div><ApprovalMaterial materialKey='approval-workspace-material' className='approval-family-hero-media' /></section>;
}
function approvalProgressSteps(entity: RuntimeEntity, status: unknown): readonly { readonly state: string; readonly label: string; readonly phase: 'complete' | 'current' | 'pending' }[] | undefined {
  if (typeof status !== 'string') return undefined;
  const flows = definition.flow.flows.filter((flow) => flow.entity === entity.key);
  if (flows.length !== 1) return undefined;
  const flow = flows[0]!;
  if (!Array.isArray(flow.states) || flow.initialState !== 'draft' || flow.states.length !== 4 || !['draft', 'submitted', 'approved', 'rejected'].every((state) => flow.states!.includes(state))) return undefined;
  const transitions = flow.transitions;
  if (transitions.length !== 3 || !transitions.some((transition) => transition.event === 'submit' && transition.from === 'draft' && transition.to === 'submitted') || !transitions.some((transition) => transition.event === 'approve' && transition.from === 'submitted' && transition.to === 'approved') || !transitions.some((transition) => transition.event === 'reject' && transition.from === 'submitted' && transition.to === 'rejected')) return undefined;
  if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) return undefined;
  const states = status === 'draft' ? ['draft', 'submitted', 'decision'] : status === 'submitted' ? ['draft', 'submitted', 'decision'] : ['draft', 'submitted', status];
  const current = status === 'approved' || status === 'rejected' ? 2 : status === 'submitted' ? 1 : 0;
  return states.map((state, index) => ({ state, label: fieldLabel(state), phase: index < current ? 'complete' : index === current ? 'current' : 'pending' }));
}
function ApprovalProgress({ entity, status }: { readonly entity: RuntimeEntity; readonly status: unknown }) {
  const steps = approvalProgressSteps(entity, status);
  return !steps ? null : <div className='approval-progress'><ol>{steps.map((step) => <li className={'approval-progress-' + step.phase} key={step.state} aria-current={step.phase === 'current' ? 'step' : undefined}><span className='approval-progress-marker'>{step.phase === 'complete' ? <ApprovalIcon name='circle-check' /> : step.phase === 'current' ? <ApprovalIcon name={step.state === 'rejected' ? 'circle-x' : step.state === 'approved' ? 'circle-check' : 'clock'} /> : null}</span><span>{step.label}</span></li>)}</ol></div>;
}
`;
}

export const approvalPresentationComponentStyles = `
.approval-v1 .approval-workspace-canvas { gap: 1rem; }
.approval-v1 .generated-page { gap: var(--factory-spacing-space-3); }
.approval-v1 .approval-workspace-heading h1 { font-size: var(--factory-typography-font-size-xl); }
.approval-v1 .approval-records-section { display: block; }
.approval-v1 .approval-records-section > .generated-section-heading { margin: 0; }
.approval-v1 .approval-family-hero { --approval-hero-brand: var(--factory-accent); display: grid; grid-template-columns: minmax(0,1.2fr) minmax(0,.8fr); height: 10rem; margin-bottom: 1rem; overflow: hidden; border-radius: var(--factory-radius-radius-lg); background: var(--approval-hero-brand); color: var(--factory-accent-text); }
.approval-v1 .approval-family-hero-copy { display: grid; align-content: center; justify-items: start; gap: .65rem; min-width: 0; padding: 1.25rem; }
.approval-v1 .approval-family-hero-copy p { display: none; }
.approval-v1 .approval-family-hero-copy h2 { font-size: calc(var(--factory-typography-font-size-xl) * 1.1); line-height: 1.2; letter-spacing: -.025em; overflow-wrap: anywhere; }
.approval-v1 .approval-family-hero-copy > span { display: none; color: inherit; font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-family-hero-copy .generated-primary { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: .65rem .85rem; background: var(--factory-accent-text) !important; color: var(--factory-accent) !important; border-color: var(--factory-accent-text) !important; font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-material { position: relative; min-width: 0; overflow: hidden; background: var(--factory-surface-muted); }
.approval-v1 .approval-material img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
.approval-v1 .approval-family-hero-media { width: 100%; height: 100%; }
.approval-v1 .approval-material-fallback { display: block; width: 100%; height: 100%; background: color-mix(in srgb,var(--factory-accent) 14%,var(--factory-surface)); }
.approval-v1 .approval-material-caption { position: absolute; right: .4rem; bottom: .4rem; padding: .15rem .35rem; border-radius: .25rem; background: var(--factory-surface); color: var(--factory-text); font-size: calc(var(--factory-typography-font-size-sm) * .75); line-height: 1.4; }
.approval-v1 .approval-record-media .approval-material-caption { display: none; }
.approval-v1 .approval-record-finder { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: .5rem; align-items: center; }
.approval-v1 .approval-record-finder > div { display: grid; grid-template-columns: minmax(8rem,12rem) 44px 44px; gap: .5rem; }
.approval-v1 .approval-record-finder button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; }
.approval-v1 .approval-result-count { padding: .6rem 0; font-size: calc(var(--factory-typography-font-size-sm) * .93); }
.approval-v1 .generated-records { border: 0; background: transparent; gap: .75rem; }
.approval-v1 .approval-record { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: .5rem 1rem; padding: 1rem; border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); background: var(--factory-surface); }
.approval-v1 .approval-record + .approval-record { border-top: 1px solid var(--factory-border); }
.approval-v1 .approval-record:has(.approval-record-media) { grid-template-columns: 7rem minmax(0,1fr) auto; }
.approval-v1 .approval-record-media { grid-column: 1; grid-row: 1 / 4; width: 7rem; height: 7rem; border-radius: var(--factory-radius-radius-base); }
.approval-v1 .approval-record .approval-record-title { grid-column: 1 / -1; grid-row: 1; font-size: var(--factory-typography-font-size-base); line-height: 1.4; }
.approval-v1 .approval-record:has(.approval-record-media) .approval-record-title { grid-column: 2 / -1; }
.approval-v1 .approval-record .approval-summary { grid-column: 1 / -1; grid-row: 2; display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .5rem 1rem; }
.approval-v1 .approval-record:has(.approval-record-media) .approval-summary { grid-column: 2 / -1; }
.approval-v1 .approval-summary dt { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.approval-v1 .approval-summary dd { margin: 0; }
.approval-v1 .approval-summary-amount dd { font-size: calc(var(--factory-typography-font-size-base) * 1.2); font-weight: var(--factory-typography-font-weight-bold); }
.approval-v1 .approval-summary-support { color: var(--factory-muted); font-size: var(--factory-typography-font-size-sm); align-self: center; }
.approval-v1 .approval-record > .approval-actions { grid-column: 1 / -1; grid-row: 3; padding-right: 6rem; }
.approval-v1 .approval-record:has(.approval-record-media) > .approval-actions { grid-column: 2 / -1; }
.approval-v1 .approval-record > details { grid-column: -2 / -1; grid-row: 3; justify-self: end; }
.approval-v1 .approval-record > details[open] { grid-column: 1 / -1; grid-row: 5; justify-self: stretch; }
.approval-v1 .approval-record > p { grid-column: 1 / -1; grid-row: auto; }
.approval-v1 .approval-progress { grid-column: 1 / -1; grid-row: 4; border-top: 1px solid var(--factory-border); padding-top: .65rem; min-width: 0; }
.approval-v1 .approval-progress > ol { display: flex; gap: .5rem; padding: 0; margin: 0; list-style: none; }
.approval-v1 .approval-progress li { display: flex; justify-content: flex-start; flex-wrap: nowrap; align-items: center; flex: 1 1 0; gap: .3rem; min-width: 0; padding: 0; margin: 0; background: transparent; border: 0; border-radius: 0; font-size: calc(var(--factory-typography-font-size-sm) * .86); line-height: 1.4; color: var(--factory-muted); }
.approval-v1 .approval-progress li:not(:last-child)::after { content: ''; height: 1px; background: var(--factory-border); flex: 1 1 0; margin-left: .25rem; }
.approval-v1 .approval-progress-marker { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 18px; width: 18px; height: 18px; border: 1px solid var(--factory-border); border-radius: 50%; color: var(--factory-accent); }
.approval-v1 .approval-progress-marker:has(.approval-icon) { border: 0; }
.approval-v1 .approval-progress-marker .approval-icon { width: 18px; height: 18px; color: inherit; }
.approval-v1 .approval-progress .approval-progress-current { color: var(--factory-text); font-weight: var(--factory-typography-font-weight-medium); }
.approval-v1 .approval-tone-positive .approval-progress-current .approval-progress-marker { color: var(--factory-colour-success); }
.approval-v1 .approval-tone-negative .approval-progress-current .approval-progress-marker { color: var(--factory-colour-danger); }
@media (max-width:899px) {
  .approval-v1 .approval-workspace-canvas { grid-template-columns: minmax(0,1fr) 44px; gap: .75rem .5rem; padding: .75rem 1rem 1.5rem; }
  .approval-v1 .approval-workspace-heading { align-self: center; }
  .approval-v1 .approval-workspace-heading h1 { font-size: calc(var(--factory-typography-font-size-base) * 1.125); line-height: 1.35; }
  .approval-v1 .approval-workspace-mobile-nav { width: 44px; justify-self: end; }
  .approval-v1 .approval-workspace-mobile-nav > summary { display: grid; place-items: center; width: 44px; padding: 0; list-style: none; }
  .approval-v1 .approval-workspace-mobile-nav > summary::-webkit-details-marker { display: none; }
  .approval-v1 .approval-family-hero { height: 9rem; grid-template-columns: minmax(0,1.35fr) minmax(0,.85fr); margin-bottom: 0; }
  .approval-v1 .approval-family-hero-copy { padding: .875rem; gap: .6rem; }
  .approval-v1 .approval-family-hero-copy h2 { font-size: calc(var(--factory-typography-font-size-base) * 1.125); }
  .approval-v1 .approval-family-hero-copy > span { display: none; }
  .approval-v1 .approval-family-hero-copy .generated-primary { padding-inline: .55rem; font-size: calc(var(--factory-typography-font-size-sm) * .93); }
  .approval-v1 .approval-record-finder { grid-template-columns: minmax(0,1fr); }
  .approval-v1 .approval-record-finder > div { grid-template-columns: minmax(0,1fr) 44px 44px; }
  .approval-v1 .approval-record { grid-template-columns: minmax(0,1fr) auto; gap: .5rem; padding: .875rem; }
  .approval-v1 .approval-record:has(.approval-record-media) { grid-template-columns: 5rem minmax(0,1fr); }
  .approval-v1 .approval-record-media { grid-column: 1; grid-row: 1 / 3; width: 5rem; height: 6rem; }
  .approval-v1 .approval-record:has(.approval-record-media) .approval-record-title { grid-column: 2; }
  .approval-v1 .approval-record .approval-summary { grid-template-columns: minmax(0,1fr) auto; gap: .4rem .5rem; }
  .approval-v1 .approval-record:has(.approval-record-media) .approval-summary { grid-column: 2; }
  .approval-v1 .approval-summary-amount { grid-column: 1; grid-row: 1; }
  .approval-v1 .approval-summary-status { grid-column: 2; grid-row: 1; }
  .approval-v1 .approval-summary-support { font-size: calc(var(--factory-typography-font-size-sm) * .93); }
  .approval-v1 .approval-record > .approval-actions, .approval-v1 .approval-record:has(.approval-record-media) > .approval-actions { grid-column: 1 / -1; grid-row: 3; }
  .approval-v1 .approval-record > details { grid-column: 2; grid-row: 3; }
  .approval-v1 .approval-record > details[open] { grid-column: 1 / -1; grid-row: 5; }
  .approval-v1 .approval-form-card { padding: 1rem; }
  .approval-v1 .approval-form-card form { gap: 1rem; }
}
`;
