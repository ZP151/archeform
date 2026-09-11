/** Private, factory-authored composition of existing approval runtime ports. */
export const approvalWorkspacePresentation = {
  key: "approval-workspace-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: [
    "button",
    "input",
    "label",
    "select",
    "card",
    "badge",
    "compact-sidebar-navigation",
    "form-field",
    "loading-state",
    "empty-state",
    "error-state",
    "confirmation-state",
    "denial-state",
  ],
  icons: [
    "house",
    "receipt-text",
    "user-round",
    "refresh-cw",
    "clock",
    "circle-check",
    "circle-x",
  ],
} as const;

export function renderApprovalWorkspaceShell(): string {
  return "  return <main className='generated-app approval-v1' data-theme={definition.themeMode}><aside className='approval-workspace-sidebar'><div className='approval-workspace-brand'><div className='approval-workspace-mark'><ApprovalIcon name='receipt-text' /></div><div><p>{definition.applicationName}</p><span>Requests and approvals</span></div></div><nav aria-label='Application routes'>{projection.navigation.map((item) => <a aria-current={item.route === requestedRoute ? 'page' : undefined} href={item.route} key={item.id}><ApprovalIcon name={item.route === projection.routeFallback.rootRoute ? 'house' : 'receipt-text'} /><span>{item.label}</span></a>)}</nav><div className='approval-workspace-role'><label htmlFor='demo-role'><ApprovalIcon name='user-round' />Demo role</label><select id='demo-role' value={role} onChange={(event) => setRole(event.target.value)}>{definition.policy.roles.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}</select></div></aside><div className='approval-workspace-canvas'><header className='generated-header approval-workspace-heading'><h1>{activePage.title}</h1></header><details className='approval-workspace-mobile-nav'><summary aria-label={'Navigation: ' + activePage.title}>Navigation</summary><nav aria-label='Application routes'>{projection.navigation.map((item) => <a aria-current={item.route === requestedRoute ? 'page' : undefined} href={item.route} key={item.id}><ApprovalIcon name={item.route === projection.routeFallback.rootRoute ? 'house' : 'receipt-text'} /><span>{item.label}</span></a>)}</nav></details>{error ? <p className='generated-error' role='alert'>{error}</p> : null}<section className='generated-page'>{activePage.blocks.map((block) => <BlockRenderer key={block.id} block={block} context={context} />)}</section></div></main>;";
}

// This profile has one stylesheet owner; older approval grid rules must not be layered underneath.
export const approvalWorkspaceStyles = [
  `
.approval-v1.generated-app { --approval-workspace-version: 1; display: grid; grid-template-columns: 15.5rem minmax(0,1fr); min-height: 100vh; margin: 0; padding: 0; background: var(--factory-bg); line-height: var(--factory-typography-line-height-base); }
.approval-v1 .approval-icon { display: inline-flex !important; flex: 0 0 auto; width: 1.125rem; height: 1.125rem; margin: 0; vertical-align: middle; }
.approval-v1 .approval-icon svg { width: 100%; height: 100%; }
.approval-v1 .approval-workspace-sidebar { display: flex; flex-direction: column; gap: var(--factory-spacing-space-6); padding: var(--factory-spacing-space-6) var(--factory-spacing-space-4); min-width: 0; border-inline-end: 1px solid var(--factory-border); background: color-mix(in srgb,var(--factory-accent) 8%,var(--factory-surface)); }
.approval-v1 .approval-workspace-brand { display: flex; align-items: center; gap: var(--factory-spacing-space-3); min-width: 0; }
.approval-v1 .approval-workspace-brand > div:last-child { min-width: 0; }
.approval-v1 .approval-workspace-brand p { color: var(--factory-text); font-size: var(--factory-typography-font-size-base); font-weight: var(--factory-typography-font-weight-bold); line-height: 1.3; overflow-wrap: anywhere; }
.approval-v1 .approval-workspace-brand span { color: var(--factory-muted); font-size: calc(var(--factory-typography-font-size-sm) * .9); line-height: 1.4; }
.approval-v1 .approval-workspace-mark { display: grid; place-items: center; flex: 0 0 auto; width: 2.25rem; height: 2.5rem; border-radius: var(--factory-radius-radius-base); background: var(--factory-accent); color: var(--factory-accent-text); }
.approval-v1 .approval-workspace-mark .approval-icon { width: 1.25rem; height: 1.25rem; color: inherit; }
.approval-v1 .approval-workspace-sidebar nav { display: grid; align-content: start; gap: var(--factory-spacing-space-1); margin: 0; flex: 1; }
.approval-v1 nav a { display: flex; align-items: center; gap: var(--factory-spacing-space-3); min-height: 44px; padding: var(--factory-spacing-space-3); border-color: transparent; background: transparent; line-height: 1.4; min-width: 0; }
.approval-v1 nav a span:last-child { min-width: 0; overflow-wrap: anywhere; }
.approval-v1 nav a[aria-current='page'] { background: var(--factory-surface); color: var(--factory-accent); font-weight: var(--factory-typography-font-weight-medium); border-color: var(--factory-border); }
.approval-v1 nav a:hover { background: var(--factory-surface); }
.approval-v1 .approval-workspace-role { display: grid; gap: var(--factory-spacing-space-1); border-block-start: 1px solid var(--factory-border); padding-block-start: var(--factory-spacing-space-4); }
.approval-v1 .approval-workspace-role label { display: flex; align-items: center; gap: var(--factory-spacing-space-2); color: var(--factory-muted); font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-workspace-role select { width: 100%; min-width: 0; min-height: 44px; padding: var(--factory-spacing-space-2); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); background: var(--factory-surface); color: var(--factory-text); }
.approval-v1 .approval-workspace-canvas { min-width: 0; width: 100%; max-width: 90rem; margin: 0 auto; padding: var(--factory-spacing-space-8); display: grid; grid-template-columns: minmax(0,1fr); align-content: start; gap: var(--factory-spacing-space-6); }
.approval-v1 .approval-workspace-heading { padding: 0; min-width: 0; }
.approval-v1 .approval-workspace-heading h1 { font-size: calc(var(--factory-typography-font-size-xl) * 1.15); font-weight: var(--factory-typography-font-weight-bold); line-height: 1.25; letter-spacing: -.02em; overflow-wrap: anywhere; }
.approval-v1 .approval-workspace-mobile-nav { display: none; }
.approval-v1 .generated-page { min-width: 0; gap: var(--factory-spacing-space-6); }
.approval-v1 .generated-card { min-width: 0; }
.approval-v1 .approval-records-section { background: transparent; border: 0; box-shadow: none; padding: 0; gap: 0; }
.approval-v1 .approval-records-section > .generated-section-heading { display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: var(--factory-spacing-space-3); margin-block-end: var(--factory-spacing-space-4); }
.approval-v1 .approval-records-section > .generated-section-heading h2 { font-size: var(--factory-typography-font-size-lg); }
.approval-v1 .approval-default-block-title, .approval-v1 .approval-finder-label, .approval-v1 .approval-record-title > span { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.approval-v1 .approval-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--factory-spacing-space-2); }
.approval-v1 .approval-actions :is(a,button) { display: inline-flex; align-items: center; justify-content: center; gap: var(--factory-spacing-space-2); min-height: 44px; }
.approval-v1 .approval-record-finder { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: var(--factory-spacing-space-2); align-items: center; }
.approval-v1 .approval-record-finder label { display: grid; min-width: 0; }
.approval-v1 .approval-record-finder > div { display: grid; grid-template-columns: minmax(9rem,12rem) auto; gap: var(--factory-spacing-space-2); }
.approval-v1 .approval-record-finder :is(input,select,button) { min-height: 44px; }
.approval-v1 .approval-record-finder button { white-space: nowrap; }
.approval-v1 .approval-result-count { padding-block: var(--factory-spacing-space-3); font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-list-mutation { padding: var(--factory-spacing-space-3) 0; font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .generated-records { display: grid; grid-template-columns: minmax(0,1fr); gap: 0; padding: 0; margin: 0; border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); background: var(--factory-surface); list-style: none; }
.approval-v1 .generated-records:empty { display: none; }
.approval-v1 .approval-record { display: grid; grid-template-columns: minmax(11rem,1fr) minmax(25rem,1.6fr); align-content: start; align-items: start; gap: var(--factory-spacing-space-2) var(--factory-spacing-space-6); min-width: 0; padding: var(--factory-spacing-space-4) var(--factory-spacing-space-6); background: var(--factory-surface); border: 0; border-radius: 0; }
.approval-v1 .approval-record:first-child { border-start-start-radius: var(--factory-radius-radius-lg); border-start-end-radius: var(--factory-radius-radius-lg); }
.approval-v1 .approval-record:last-child { border-end-start-radius: var(--factory-radius-radius-lg); border-end-end-radius: var(--factory-radius-radius-lg); }
.approval-v1 .approval-record + .approval-record { border-block-start: 1px solid var(--factory-border); }
.approval-v1 .approval-record-title { grid-column: 1; grid-row: 1; margin: 0; font-size: var(--factory-typography-font-size-base); line-height: 1.45; min-width: 0; overflow-wrap: anywhere; }
.approval-v1 .approval-summary { display: grid; grid-column: 2; grid-row: 1; grid-template-columns: minmax(4rem,.7fr) minmax(4rem,1fr) minmax(6rem,1fr) minmax(6rem,1fr); gap: var(--factory-spacing-space-3); min-width: 0; width: 100%; margin: 0; }
.approval-v1 .approval-summary > div { min-width: 0; }
.approval-v1 .approval-summary dt, .approval-v1 .approval-details-values dt { color: var(--factory-muted); font-size: calc(var(--factory-typography-font-size-sm) * .9); font-weight: var(--factory-typography-font-weight-medium); }
.approval-v1 .approval-summary dd, .approval-v1 .approval-details-values dd { margin: var(--factory-spacing-space-1) 0 0; overflow-wrap: anywhere; }
.approval-v1 .approval-summary-amount dd { font-size: var(--factory-typography-font-size-base); font-weight: var(--factory-typography-font-weight-bold); font-variant-numeric: tabular-nums; }
.approval-v1 .approval-summary-status { text-align: end; }
.approval-v1 .approval-badge { display: inline-flex !important; align-items: center; gap: var(--factory-spacing-space-1); width: fit-content; min-height: 1.75rem; padding: .15rem var(--factory-spacing-space-2); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-full); font-size: var(--factory-typography-font-size-sm); background: var(--factory-surface); color: var(--factory-text); white-space: nowrap; }
.approval-v1 .approval-tone-positive .approval-badge { border-color: color-mix(in srgb,var(--factory-colour-success) 25%,var(--factory-border)); background: color-mix(in srgb,var(--factory-colour-success) 8%,var(--factory-surface)); color: color-mix(in srgb,var(--factory-text) 85%,var(--factory-colour-success)); }
.approval-v1 .approval-tone-pending .approval-badge { border-color: color-mix(in srgb,var(--factory-colour-warning) 30%,var(--factory-border)); background: color-mix(in srgb,var(--factory-colour-warning) 12%,var(--factory-surface)); color: color-mix(in srgb,var(--factory-text) 85%,var(--factory-colour-warning)); }
.approval-v1 .approval-tone-negative .approval-badge { border-color: color-mix(in srgb,var(--factory-colour-danger) 25%,var(--factory-border)); background: color-mix(in srgb,var(--factory-colour-danger) 8%,var(--factory-surface)); color: color-mix(in srgb,var(--factory-text) 85%,var(--factory-colour-danger)); }
.approval-v1 .approval-record > .approval-actions { grid-column: 1; grid-row: 2; }
.approval-v1 .approval-record > .approval-actions:empty { display: none; }
.approval-v1 .approval-record details { grid-column: 2; grid-row: 2; justify-self: end; min-width: 0; }
.approval-v1 .approval-record summary { display: list-item; min-height: 44px; min-width: 5rem; padding: var(--factory-spacing-space-2); color: var(--factory-muted); cursor: pointer; font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-record details[open] { grid-column: 1 / -1; grid-row: auto; justify-self: stretch; border-block-start: 1px solid var(--factory-border); }
.approval-v1 .approval-details-values { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,12rem),1fr)); gap: var(--factory-spacing-space-4); margin: 0; padding: var(--factory-spacing-space-2) 0; }
.approval-v1 .approval-record > p { grid-column: 1 / -1; width: 100%; overflow-wrap: anywhere; }
.approval-v1 .approval-record:not(:has(.approval-record-title)) > .approval-summary { grid-column: 1 / -1; }
.approval-v1 .approval-empty { display: grid; justify-items: center; gap: var(--factory-spacing-space-3); padding: var(--factory-spacing-space-8); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); background: var(--factory-surface); text-align: center; }
.approval-v1 .approval-empty > .approval-icon { width: 2rem; height: 2rem; color: var(--factory-muted); }
.approval-v1 .approval-form-card { width: min(100%,58rem); padding: var(--factory-spacing-space-6); gap: var(--factory-spacing-space-6); box-shadow: none; }
.approval-v1 .approval-form-card h2 { font-size: var(--factory-typography-font-size-lg); }
.approval-v1 .approval-form-card form { gap: var(--factory-spacing-space-6); }
.approval-v1 .approval-form-card fieldset { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--factory-spacing-space-4) var(--factory-spacing-space-6); border: 0; margin: 0; padding: 0; min-width: 0; }
.approval-v1 .approval-field { display: grid; gap: var(--factory-spacing-space-2); min-width: 0; }
.approval-v1 .approval-field label { font-size: var(--factory-typography-font-size-sm); font-weight: var(--factory-typography-font-weight-medium); }
.approval-v1 .approval-field :is(input,select,textarea) { min-height: 44px; min-width: 0; }
.approval-v1 .approval-field:has(textarea) { grid-column: 1 / -1; }
.approval-v1 .approval-field textarea { font: inherit; resize: vertical; width: 100%; padding: var(--factory-spacing-space-3); background: var(--factory-surface); color: inherit; border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); }
.approval-v1 .approval-field input[type='checkbox'] { width: 1.5rem; height: 1.5rem; }
.approval-v1 .approval-form-footer { display: flex; justify-content: flex-end; border-block-start: 1px solid var(--factory-border); padding-block-start: var(--factory-spacing-space-4); }
.approval-v1 .approval-form-footer button { min-height: 44px; }
.approval-v1 :is(a,button,input,select,textarea,summary):focus-visible { outline: 3px solid var(--factory-accent); outline-offset: 3px; }
.approval-v1 input:is([type='date'],[type='datetime-local']):focus-within { outline: 3px solid var(--factory-accent); outline-offset: 3px; }
.approval-v1 ::selection { background: color-mix(in srgb,var(--factory-accent) 22%,var(--factory-surface)); color: var(--factory-text); }
.approval-v1 :is(input,textarea) { caret-color: var(--factory-accent); }
@media (max-width:1199px) and (min-width:900px) {
.approval-v1.generated-app { grid-template-columns: 13rem minmax(0,1fr); }
.approval-v1 .approval-workspace-canvas { padding: var(--factory-spacing-space-6); }
.approval-v1 .approval-record { grid-template-columns: minmax(0,1fr) auto; }
.approval-v1 .approval-record-title { grid-column: 1 / -1; }
.approval-v1 .approval-summary { grid-column: 1 / -1; grid-row: auto; }
.approval-v1 .approval-record > .approval-actions, .approval-v1 .approval-record details { grid-row: auto; }
}
@media (max-width:899px) {
.approval-v1.generated-app { grid-template-columns: minmax(0,1fr); grid-template-rows: auto minmax(0,1fr); }
.approval-v1 .approval-workspace-sidebar { display: grid; grid-template-columns: minmax(0,1fr) 9rem; align-items: center; gap: var(--factory-spacing-space-3); padding: var(--factory-spacing-space-3) var(--factory-spacing-space-4); border-inline-end: 0; border-block-end: 1px solid var(--factory-border); }
.approval-v1 .approval-workspace-sidebar > nav { display: none; }
.approval-v1 .approval-workspace-role { padding: 0; border: 0; }
.approval-v1 .approval-workspace-role label { gap: var(--factory-spacing-space-1); font-size: calc(var(--factory-typography-font-size-sm) * .9); white-space: nowrap; }
.approval-v1 .approval-workspace-role select { font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-workspace-brand { gap: var(--factory-spacing-space-2); }
.approval-v1 .approval-workspace-mark { width: 1.75rem; height: 2rem; }
.approval-v1 .approval-workspace-brand p { font-size: var(--factory-typography-font-size-sm); }
.approval-v1 .approval-workspace-canvas { grid-template-columns: minmax(0,1fr) auto; padding: var(--factory-spacing-space-4); gap: var(--factory-spacing-space-4) var(--factory-spacing-space-2); }
.approval-v1 .approval-workspace-heading { min-height: 44px; justify-content: center; }
.approval-v1 .approval-workspace-heading h1 { font-size: var(--factory-typography-font-size-lg); line-height: 1.25; }
.approval-v1 .approval-workspace-mobile-nav { display: block; position: relative; align-self: start; background: var(--factory-surface); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); z-index: 2; }
.approval-v1 .approval-workspace-mobile-nav > summary { min-height: 44px; padding: var(--factory-spacing-space-2); font-size: var(--factory-typography-font-size-sm); cursor: pointer; }
.approval-v1 .approval-workspace-mobile-nav nav { position: absolute; inset-inline-end: 0; top: calc(100% + var(--factory-spacing-space-2)); width: min(22rem,calc(100vw - 2rem)); display: grid; gap: var(--factory-spacing-space-1); margin: 0; padding: var(--factory-spacing-space-2); background: var(--factory-surface); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); box-shadow: var(--factory-elevation-elevation-md); }
.approval-v1 .generated-page, .approval-v1 .approval-workspace-canvas > .generated-error { grid-column: 1 / -1; }
.approval-v1 .approval-records-section > .generated-section-heading { flex-direction: row; flex-wrap: wrap; margin-block-end: var(--factory-spacing-space-3); }
.approval-v1 .approval-record-finder { grid-template-columns: minmax(0,1fr); }
.approval-v1 .approval-record-finder > div { grid-template-columns: minmax(0,1fr) auto; }
.approval-v1 .approval-record { grid-template-columns: minmax(0,1fr) auto; padding: var(--factory-spacing-space-4); gap: var(--factory-spacing-space-2); }
.approval-v1 .approval-record-title { grid-column: 1 / -1; grid-row: 1; }
.approval-v1 .approval-summary { display: grid; grid-column: 1 / -1; grid-row: 2; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: var(--factory-spacing-space-2) var(--factory-spacing-space-3); }
.approval-v1 .approval-summary-amount { grid-column: 1; grid-row: 1; }
.approval-v1 .approval-summary > div:nth-child(2) { grid-column: 1; grid-row: 2; }
.approval-v1 .approval-summary > div:nth-child(3) { grid-column: 2; grid-row: 2; text-align: end; }
.approval-v1 .approval-summary-status { grid-column: 2; grid-row: 1; text-align: end; }
.approval-v1 .approval-record > .approval-actions { grid-column: 1; grid-row: 3; }
.approval-v1 .approval-record details { grid-column: 2; grid-row: 3; }
.approval-v1 .approval-record details[open] { grid-column: 1 / -1; grid-row: 4; }
.approval-v1 .approval-form-card { padding: var(--factory-spacing-space-4); gap: var(--factory-spacing-space-4); }
.approval-v1 .approval-form-card fieldset { grid-template-columns: minmax(0,1fr); gap: var(--factory-spacing-space-4); }
.approval-v1 .approval-form-footer button { width: 100%; }
.approval-v1 :is(a,button,input,select,summary) { min-height: 44px; min-width: 44px; }
.approval-v1 .approval-field input[type='checkbox'] { width: 44px; height: 44px; }
}
@media (prefers-reduced-motion:reduce) { .approval-v1 :is(a,button) { transition: none; } }
`,
] as const;
