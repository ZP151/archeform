/** Private, factory-authored composition of existing approval runtime ports. */
export const approvalWorkspacePresentation = {
  key: "approval-workspace-presentation",
  version: "2.0.0",
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
  return renderWorkspaceShell("approval");
}

/** Shared native shell; business content remains in the selected presentation. */
export function renderWorkspaceShell(profile: "approval" | "task"): string {
  const prefix = String(profile);
  const icon = prefix === "approval" ? "ApprovalIcon" : "TaskIcon";
  const subtitle =
    prefix === "approval" ? "Requests and approvals" : "Shared team board";
  const history =
    prefix === "approval" ? "<ApprovalDecisionHistory role={role} />" : "";
  const hero =
    prefix === "approval"
      ? "<ApprovalPageHero page={activePage} role={role} formRoutes={formRouteByEntity} />"
      : "";
  return `  return <main className='generated-app ${prefix}-v1' data-theme={definition.themeMode}><aside className='${prefix}-workspace-sidebar'><div className='${prefix}-workspace-brand'><div className='${prefix}-workspace-mark'><${icon} name='receipt-text' /></div><div><p>{definition.applicationName}</p><span>${subtitle}</span></div></div><nav aria-label='Application routes'>{projection.navigation.map((item) => <a aria-current={item.route === requestedRoute ? 'page' : undefined} href={item.route} key={item.id}><${icon} name={item.route === projection.routeFallback.rootRoute ? 'house' : 'receipt-text'} /><span>{item.label}</span></a>)}</nav><div className='${prefix}-workspace-role'><label htmlFor='demo-role'><${icon} name='user-round' />Demo role</label><select id='demo-role' value={role} onChange={(event) => setRole(event.target.value)}>{definition.policy.roles.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}</select></div></aside><div className='${prefix}-workspace-canvas'><header className='generated-header ${prefix}-workspace-heading'><h1>{activePage.title}</h1></header><details className='${prefix}-workspace-mobile-nav'><summary aria-label={'Navigation: ' + activePage.title} title='Navigation'><${icon} name='receipt-text' /></summary><nav aria-label='Application routes'>{projection.navigation.map((item) => <a aria-current={item.route === requestedRoute ? 'page' : undefined} href={item.route} key={item.id}><${icon} name={item.route === projection.routeFallback.rootRoute ? 'house' : 'receipt-text'} /><span>{item.label}</span></a>)}</nav></details>${history}{error ? <p className='generated-error' role='alert'>{error}</p> : null}<section className='generated-page'>${hero}{activePage.blocks.map((block) => <BlockRenderer key={block.id} block={block} context={context} />)}</section></div></main>;`;
}

// This profile has one stylesheet owner; older approval grid rules must not be layered underneath.
export function renderWorkspaceStyles(
  profile: "approval" | "task",
): readonly string[] {
  const prefix = String(profile);
  return [
    `
.${prefix}-v1.generated-app { --${prefix}-workspace-version: ${prefix === "approval" ? "4" : "1.0.0"}; display: grid; grid-template-columns: 15.5rem minmax(0,1fr); min-height: 100vh; margin: 0; padding: 0; background: var(--factory-bg); line-height: var(--factory-typography-line-height-base); }
.${prefix}-v1 .${prefix}-icon { display: inline-flex !important; flex: 0 0 auto; width: 1.125rem; height: 1.125rem; margin: 0; vertical-align: middle; }
.${prefix}-v1 .${prefix}-icon svg { width: 100%; height: 100%; }
.${prefix}-v1 .${prefix}-workspace-sidebar { display: flex; flex-direction: column; gap: var(--factory-spacing-space-6); padding: var(--factory-spacing-space-6) var(--factory-spacing-space-4); min-width: 0; border-inline-end: 1px solid var(--factory-border); background: var(--factory-accent); color: var(--factory-accent-text); }
.${prefix}-v1 .${prefix}-workspace-brand { display: flex; align-items: center; gap: var(--factory-spacing-space-3); min-width: 0; }
.${prefix}-v1 .${prefix}-workspace-brand > div:last-child { min-width: 0; }
.${prefix}-v1 .${prefix}-workspace-brand p { color: inherit; font-size: var(--factory-typography-font-size-base); font-weight: var(--factory-typography-font-weight-bold); line-height: 1.3; overflow-wrap: anywhere; }
.${prefix}-v1 .${prefix}-workspace-brand span { color: inherit; font-size: calc(var(--factory-typography-font-size-sm) * .9); line-height: 1.4; }
.${prefix}-v1 .${prefix}-workspace-mark { display: grid; place-items: center; flex: 0 0 auto; width: 2.25rem; height: 2.5rem; border-radius: var(--factory-radius-radius-base); background: var(--factory-accent); color: var(--factory-accent-text); }
.${prefix}-v1 .${prefix}-workspace-mark .${prefix}-icon { width: 1.25rem; height: 1.25rem; color: inherit; }
.${prefix}-v1 .${prefix}-workspace-sidebar nav { display: grid; align-content: start; gap: var(--factory-spacing-space-1); margin: 0; flex: 1; }
.${prefix}-v1 nav a { display: flex; align-items: center; gap: var(--factory-spacing-space-3); min-height: 44px; padding: var(--factory-spacing-space-3); border-color: transparent; background: transparent; line-height: 1.4; min-width: 0; }
.${prefix}-v1 nav a span:last-child { min-width: 0; overflow-wrap: anywhere; }
.${prefix}-v1 nav a[aria-current='page'] { background: var(--factory-surface); color: var(--factory-accent); font-weight: var(--factory-typography-font-weight-medium); border-color: var(--factory-border); }
.${prefix}-v1 nav a { color: var(--factory-text); }
.${prefix}-v1 nav a:is(:hover,:focus-visible) { background: var(--factory-surface); color: var(--factory-text); }
.${prefix}-v1 .${prefix}-workspace-sidebar nav a { color: var(--factory-accent-text); }
.${prefix}-v1 .${prefix}-workspace-sidebar nav a:is([aria-current='page'],:hover,:focus-visible) { background: var(--factory-surface); border-color: var(--factory-surface); color: var(--factory-accent); }
.${prefix}-v1 .${prefix}-workspace-mobile-nav nav a[aria-current='page'] { background: var(--factory-accent); border-color: var(--factory-accent); color: var(--factory-accent-text); }
.${prefix}-v1 .${prefix}-workspace-role { display: grid; gap: var(--factory-spacing-space-1); border-block-start: 1px solid var(--factory-border); padding-block-start: var(--factory-spacing-space-4); }
.${prefix}-v1 .${prefix}-workspace-role label { display: flex; align-items: center; gap: var(--factory-spacing-space-2); color: inherit; font-size: var(--factory-typography-font-size-sm); }
.${prefix}-v1 .${prefix}-workspace-role select { width: 100%; min-width: 0; min-height: 44px; padding: var(--factory-spacing-space-2); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); background: var(--factory-surface); color: var(--factory-text); }
.${prefix}-v1 .${prefix}-workspace-canvas { min-width: 0; width: 100%; max-width: 90rem; margin: 0 auto; padding: var(--factory-spacing-space-8); display: grid; grid-template-columns: minmax(0,1fr); align-content: start; gap: var(--factory-spacing-space-6); }
.${prefix}-v1 .${prefix}-workspace-heading { padding: 0; min-width: 0; }
.${prefix}-v1 .${prefix}-workspace-heading h1 { font-size: calc(var(--factory-typography-font-size-xl) * 1.15); font-weight: var(--factory-typography-font-weight-bold); line-height: 1.25; letter-spacing: -.02em; overflow-wrap: anywhere; }
.${prefix}-v1 .${prefix}-workspace-mobile-nav { display: none; }
.${prefix}-v1 .generated-page { min-width: 0; gap: var(--factory-spacing-space-6); }
.${prefix}-v1 .generated-card { min-width: 0; }
.${prefix}-v1 .${prefix}-records-section { background: transparent; border: 0; box-shadow: none; padding: 0; gap: 0; }
.${prefix}-v1 .${prefix}-records-section > .generated-section-heading { display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: var(--factory-spacing-space-3); margin-block-end: var(--factory-spacing-space-4); }
.${prefix}-v1 .${prefix}-records-section > .generated-section-heading h2 { font-size: var(--factory-typography-font-size-lg); }
.${prefix}-v1 .${prefix}-default-block-title, .${prefix}-v1 .${prefix}-finder-label, .${prefix}-v1 .${prefix}-record-title > span { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.${prefix}-v1 .${prefix}-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--factory-spacing-space-2); }
.${prefix}-v1 .${prefix}-actions :is(a,button) { display: inline-flex; align-items: center; justify-content: center; gap: var(--factory-spacing-space-2); min-height: 44px; }
.${prefix}-v1 .${prefix}-record-finder { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: var(--factory-spacing-space-2); align-items: center; }
.${prefix}-v1 .${prefix}-record-finder label { display: grid; min-width: 0; }
.${prefix}-v1 .${prefix}-record-finder > div { display: grid; grid-template-columns: minmax(9rem,12rem) auto; gap: var(--factory-spacing-space-2); }
.${prefix}-v1 .${prefix}-record-finder :is(input,select,button) { min-height: 44px; }
.${prefix}-v1 .${prefix}-record-finder button { white-space: nowrap; }
.${prefix}-v1 .${prefix}-result-count { padding-block: var(--factory-spacing-space-3); font-size: var(--factory-typography-font-size-sm); }
.${prefix}-v1 .${prefix}-list-mutation { padding: var(--factory-spacing-space-3) 0; font-size: var(--factory-typography-font-size-sm); }
.${prefix}-v1 .generated-records { display: grid; grid-template-columns: minmax(0,1fr); gap: 0; padding: 0; margin: 0; border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); background: var(--factory-surface); list-style: none; }
.${prefix}-v1 .generated-records:empty { display: none; }
.${prefix}-v1 .${prefix}-record { display: grid; grid-template-columns: minmax(11rem,1fr) minmax(25rem,1.6fr); align-content: start; align-items: start; gap: var(--factory-spacing-space-2) var(--factory-spacing-space-6); min-width: 0; padding: var(--factory-spacing-space-4) var(--factory-spacing-space-6); background: var(--factory-surface); border: 0; border-radius: 0; }
.${prefix}-v1 .${prefix}-record:first-child { border-start-start-radius: var(--factory-radius-radius-lg); border-start-end-radius: var(--factory-radius-radius-lg); }
.${prefix}-v1 .${prefix}-record:last-child { border-end-start-radius: var(--factory-radius-radius-lg); border-end-end-radius: var(--factory-radius-radius-lg); }
.${prefix}-v1 .${prefix}-record + .${prefix}-record { border-block-start: 1px solid var(--factory-border); }
.${prefix}-v1 .${prefix}-record-title { grid-column: 1; grid-row: 1; margin: 0; font-size: var(--factory-typography-font-size-base); line-height: 1.45; min-width: 0; overflow-wrap: anywhere; }
.${prefix}-v1 .${prefix}-summary { display: grid; grid-column: 2; grid-row: 1; grid-template-columns: minmax(4rem,.7fr) minmax(4rem,1fr) minmax(6rem,1fr) minmax(6rem,1fr); gap: var(--factory-spacing-space-3); min-width: 0; width: 100%; margin: 0; }
.${prefix}-v1 .${prefix}-summary > div { min-width: 0; }
.${prefix}-v1 .${prefix}-summary dt, .${prefix}-v1 .${prefix}-details-values dt { color: var(--factory-muted); font-size: calc(var(--factory-typography-font-size-sm) * .9); font-weight: var(--factory-typography-font-weight-medium); }
.${prefix}-v1 .${prefix}-summary dd, .${prefix}-v1 .${prefix}-details-values dd { margin: var(--factory-spacing-space-1) 0 0; overflow-wrap: anywhere; }
.${prefix}-v1 .${prefix}-summary-amount dd { font-size: var(--factory-typography-font-size-base); font-weight: var(--factory-typography-font-weight-bold); font-variant-numeric: tabular-nums; }
.${prefix}-v1 .${prefix}-summary-status { text-align: end; }
.${prefix}-v1 .${prefix}-badge { display: inline-flex !important; align-items: center; gap: var(--factory-spacing-space-1); width: fit-content; min-height: 1.75rem; padding: .15rem var(--factory-spacing-space-2); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-full); font-size: var(--factory-typography-font-size-sm); background: var(--factory-surface); color: var(--factory-text); white-space: nowrap; }
.${prefix}-v1 .${prefix}-tone-positive .${prefix}-badge { border-color: var(--factory-colour-success); background: color-mix(in srgb,var(--factory-colour-success) 18%,var(--factory-surface)); color: var(--factory-text); }
.${prefix}-v1 .${prefix}-tone-positive .${prefix}-badge .${prefix}-icon { color: var(--factory-colour-success); }
.${prefix}-v1 .${prefix}-tone-pending .${prefix}-badge { border-color: var(--factory-colour-warning); background: color-mix(in srgb,var(--factory-colour-warning) 18%,var(--factory-surface)); color: var(--factory-text); }
.${prefix}-v1 .${prefix}-tone-pending .${prefix}-badge .${prefix}-icon { color: var(--factory-colour-warning); }
.${prefix}-v1 .${prefix}-tone-negative .${prefix}-badge { border-color: var(--factory-colour-danger); background: color-mix(in srgb,var(--factory-colour-danger) 18%,var(--factory-surface)); color: var(--factory-text); }
.${prefix}-v1 .${prefix}-tone-negative .${prefix}-badge .${prefix}-icon { color: var(--factory-colour-danger); }
.${prefix}-v1 .${prefix}-record > .${prefix}-actions { grid-column: 1; grid-row: 2; }
.${prefix}-v1 .${prefix}-record > .${prefix}-actions:empty { display: none; }
.${prefix}-v1 .${prefix}-record details { grid-column: 2; grid-row: 2; justify-self: end; min-width: 0; }
.${prefix}-v1 .${prefix}-record summary { display: list-item; min-height: 44px; min-width: 5rem; padding: var(--factory-spacing-space-2); color: var(--factory-muted); cursor: pointer; font-size: var(--factory-typography-font-size-sm); }
.${prefix}-v1 .${prefix}-record details[open] { grid-column: 1 / -1; grid-row: auto; justify-self: stretch; border-block-start: 1px solid var(--factory-border); }
.${prefix}-v1 .${prefix}-details-values { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,12rem),1fr)); gap: var(--factory-spacing-space-4); margin: 0; padding: var(--factory-spacing-space-2) 0; }
.${prefix}-v1 .${prefix}-record > p { grid-column: 1 / -1; width: 100%; overflow-wrap: anywhere; }
.${prefix}-v1 .${prefix}-record:not(:has(.${prefix}-record-title)) > .${prefix}-summary { grid-column: 1 / -1; }
.${prefix}-v1 .${prefix}-empty { display: grid; justify-items: center; gap: var(--factory-spacing-space-3); padding: var(--factory-spacing-space-8); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); background: var(--factory-surface); text-align: center; }
.${prefix}-v1 .${prefix}-empty > .${prefix}-icon { width: 2rem; height: 2rem; color: var(--factory-muted); }
.${prefix}-v1 .${prefix}-form-card { width: min(100%,58rem); padding: var(--factory-spacing-space-6); gap: var(--factory-spacing-space-6); box-shadow: none; }
.${prefix}-v1 .${prefix}-form-card h2 { font-size: var(--factory-typography-font-size-lg); }
.${prefix}-v1 .${prefix}-form-card form { gap: var(--factory-spacing-space-6); }
.${prefix}-v1 .${prefix}-form-card fieldset { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--factory-spacing-space-4) var(--factory-spacing-space-6); border: 0; margin: 0; padding: 0; min-width: 0; }
.${prefix}-v1 .${prefix}-field { display: grid; gap: var(--factory-spacing-space-2); min-width: 0; }
.${prefix}-v1 .${prefix}-field label { font-size: var(--factory-typography-font-size-sm); font-weight: var(--factory-typography-font-weight-medium); }
.${prefix}-v1 .${prefix}-field :is(input,select,textarea) { min-height: 44px; min-width: 0; }
.${prefix}-v1 .${prefix}-field:has(textarea) { grid-column: 1 / -1; }
.${prefix}-v1 .${prefix}-field textarea { font: inherit; resize: vertical; width: 100%; padding: var(--factory-spacing-space-3); background: var(--factory-surface); color: inherit; border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); }
.${prefix}-v1 .${prefix}-field input[type='checkbox'] { width: 1.5rem; height: 1.5rem; }
.${prefix}-v1 .${prefix}-form-footer { display: flex; justify-content: flex-end; border-block-start: 1px solid var(--factory-border); padding-block-start: var(--factory-spacing-space-4); }
.${prefix}-v1 .${prefix}-form-footer button { min-height: 44px; }
.${prefix}-v1 .${prefix}-record > .${prefix}-actions button:not(:disabled) { background: var(--factory-accent); border-color: var(--factory-accent); color: var(--factory-accent-text); }
.${prefix}-v1 button.${prefix}-refresh { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 44px; width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; }
.${prefix}-v1 :is(a,button,input,select,textarea,summary):focus-visible { outline: 3px solid var(--factory-accent); outline-offset: 3px; }
.${prefix}-v1 .${prefix}-workspace-sidebar :is(a,select):focus-visible { outline-color: var(--factory-accent-text); }
.${prefix}-v1 input:is([type='date'],[type='datetime-local']):focus-within { outline: 3px solid var(--factory-accent); outline-offset: 3px; }
.${prefix}-v1 ::selection { background: color-mix(in srgb,var(--factory-accent) 22%,var(--factory-surface)); color: var(--factory-text); }
.${prefix}-v1 :is(input,textarea) { caret-color: var(--factory-accent); }
@media (max-width:1199px) and (min-width:900px) {
.${prefix}-v1.generated-app { grid-template-columns: 13rem minmax(0,1fr); }
.${prefix}-v1 .${prefix}-workspace-canvas { padding: var(--factory-spacing-space-6); }
.${prefix}-v1 .${prefix}-record { grid-template-columns: minmax(0,1fr) auto; }
.${prefix}-v1 .${prefix}-record-title { grid-column: 1 / -1; }
.${prefix}-v1 .${prefix}-summary { grid-column: 1 / -1; grid-row: auto; }
.${prefix}-v1 .${prefix}-record > .${prefix}-actions, .${prefix}-v1 .${prefix}-record details { grid-row: auto; }
}
@media (max-width:899px) {
.${prefix}-v1.generated-app { grid-template-columns: minmax(0,1fr); grid-template-rows: auto minmax(0,1fr); }
.${prefix}-v1 .${prefix}-workspace-sidebar { display: grid; grid-template-columns: minmax(0,1fr) 9rem; align-items: center; gap: var(--factory-spacing-space-3); padding: var(--factory-spacing-space-3) var(--factory-spacing-space-4); border-inline-end: 0; border-block-end: 1px solid var(--factory-border); background: var(--factory-surface); color: var(--factory-text); }
.${prefix}-v1 .${prefix}-workspace-sidebar > nav { display: none; }
.${prefix}-v1 .${prefix}-workspace-role { padding: 0; border: 0; }
.${prefix}-v1 .${prefix}-workspace-role label { gap: var(--factory-spacing-space-1); font-size: calc(var(--factory-typography-font-size-sm) * .9); white-space: nowrap; }
.${prefix}-v1 .${prefix}-workspace-mark { background: var(--factory-accent); color: var(--factory-accent-text); }
.${prefix}-v1 .${prefix}-workspace-role select { font-size: var(--factory-typography-font-size-sm); }
.${prefix}-v1 .${prefix}-workspace-brand { gap: var(--factory-spacing-space-2); }
.${prefix}-v1 .${prefix}-workspace-mark { width: 1.75rem; height: 2rem; }
.${prefix}-v1 .${prefix}-workspace-brand p { font-size: var(--factory-typography-font-size-sm); }
.${prefix}-v1 .${prefix}-workspace-canvas { grid-template-columns: minmax(0,1fr) auto; padding: var(--factory-spacing-space-4); gap: var(--factory-spacing-space-4) var(--factory-spacing-space-2); }
.${prefix}-v1 .${prefix}-workspace-heading { min-height: 44px; justify-content: center; }
.${prefix}-v1 .${prefix}-workspace-heading h1 { font-size: var(--factory-typography-font-size-lg); line-height: 1.25; }
.${prefix}-v1 .${prefix}-workspace-mobile-nav { display: block; position: relative; align-self: start; background: var(--factory-surface); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-base); z-index: 2; }
.${prefix}-v1 .${prefix}-workspace-mobile-nav > summary { min-height: 44px; padding: var(--factory-spacing-space-2); font-size: var(--factory-typography-font-size-sm); cursor: pointer; }
.${prefix}-v1 .${prefix}-workspace-mobile-nav nav { position: absolute; inset-inline-end: 0; top: calc(100% + var(--factory-spacing-space-2)); width: min(22rem,calc(100vw - 2rem)); display: grid; gap: var(--factory-spacing-space-1); margin: 0; padding: var(--factory-spacing-space-2); background: var(--factory-surface); border: 1px solid var(--factory-border); border-radius: var(--factory-radius-radius-lg); box-shadow: var(--factory-elevation-elevation-md); }
.${prefix}-v1 .generated-page, .${prefix}-v1 .${prefix}-workspace-canvas > .generated-error { grid-column: 1 / -1; }
.${prefix}-v1 .${prefix}-records-section > .generated-section-heading { flex-direction: row; flex-wrap: wrap; margin-block-end: var(--factory-spacing-space-3); }
.${prefix}-v1 .${prefix}-record-finder { grid-template-columns: minmax(0,1fr); }
.${prefix}-v1 .${prefix}-record-finder > div { grid-template-columns: minmax(0,1fr) auto; }
.${prefix}-v1 .${prefix}-record { grid-template-columns: minmax(0,1fr) auto; padding: var(--factory-spacing-space-4); gap: var(--factory-spacing-space-2); }
.${prefix}-v1 .${prefix}-record-title { grid-column: 1 / -1; grid-row: 1; }
.${prefix}-v1 .${prefix}-summary { display: grid; grid-column: 1 / -1; grid-row: 2; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: var(--factory-spacing-space-2) var(--factory-spacing-space-3); }
.${prefix}-v1 .${prefix}-summary-amount { grid-column: 1; grid-row: 1; }
.${prefix}-v1 .${prefix}-summary > div:nth-child(2) { grid-column: 1; grid-row: 2; }
.${prefix}-v1 .${prefix}-summary > div:nth-child(3) { grid-column: 2; grid-row: 2; text-align: end; }
.${prefix}-v1 .${prefix}-summary-status { grid-column: 2; grid-row: 1; text-align: end; }
.${prefix}-v1 .${prefix}-record > .${prefix}-actions { grid-column: 1; grid-row: 3; }
.${prefix}-v1 .${prefix}-record details { grid-column: 2; grid-row: 3; }
.${prefix}-v1 .${prefix}-record details[open] { grid-column: 1 / -1; grid-row: 4; }
.${prefix}-v1 .${prefix}-form-card { padding: var(--factory-spacing-space-4); gap: var(--factory-spacing-space-4); }
.${prefix}-v1 .${prefix}-form-card fieldset { grid-template-columns: minmax(0,1fr); gap: var(--factory-spacing-space-4); }
.${prefix}-v1 .${prefix}-form-footer button { width: 100%; }
.${prefix}-v1 :is(a,button,input,select,summary) { min-height: 44px; min-width: 44px; }
.${prefix}-v1 .${prefix}-field input[type='checkbox'] { width: 44px; height: 44px; }
}
@media (prefers-reduced-motion:reduce) { .${prefix}-v1 :is(a,button) { transition: none; } }
`,
  ];
}
export const approvalWorkspaceStyles = renderWorkspaceStyles("approval");

/** Selected only after the exact ADR-0060 correction selector. */
export const approvalWorkspacePresentationCorrection = {
  ...approvalWorkspacePresentation,
  version: "2.1.0",
} as const;

/** Shared finder, typed form, value formatting and native controls port. */
export function renderWorkspaceDataHelpers(): string {
  return [
    "function statusOptions(entityKey: string): readonly string[] {",
    "  const flows = definition.flow.flows.filter((flow) => flow.entity === entityKey && flow.states !== undefined);",
    "  if (flows.length !== 1) return [];",
    "  return Array.from(new Set(flows[0]!.states ?? []));",
    "}",
    "function filterRecords(fields: readonly RuntimeField[], records: readonly JsonRecord[], query: string, status: string): readonly JsonRecord[] {",
    "  const normalizedQuery = query.trim().toLowerCase();",
    "  return records.filter((record) => {",
    "    if (status && String(record.status ?? '') !== status) return false;",
    "    if (!normalizedQuery) return true;",
    "    return fields.some((field) => { const value = record[field.key]; return (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') && String(value).toLowerCase().includes(normalizedQuery); });",
    "  });",
    "}",
    "class SafeUiError extends Error {}",
    "function safeResponseMessage(status: number): string {",
    "  if (status === 400 || status === 409) return 'This record has changed or contains invalid values. Refresh and try again.';",
    "  if (status === 401 || status === 403) return 'This action is unavailable for your selected role or the current record state.';",
    "  if (status >= 500) return 'The service is unavailable. Please try again.';",
    "  return 'The request could not be completed. Please try again.';",
    "}",
    "function fieldLabel(key: string): string {",
    "  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').replace(/[_-]+/g, ' ');",
    "  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();",
    "}",
    "function calendarDateToPrisma(value: string): string {",
    "  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) throw new Error('Invalid date');",
    "  const candidate = value + 'T00:00:00.000Z';",
    "  const date = new Date(candidate);",
    "  if (!Number.isFinite(date.getTime()) || date.toISOString() !== candidate) throw new Error('Invalid date');",
    "  return candidate;",
    "}",
    "function formPayload(fields: readonly RuntimeField[], values: Readonly<Record<string, string | boolean>>): JsonRecord {",
    "  const payload: JsonRecord = {};",
    "  for (const field of fields) {",
    "    const raw = values[field.key] ?? (field.type === 'boolean' ? false : '');",
    "    if (field.type === 'boolean') { payload[field.key] = raw === true; continue; }",
    "    const value = String(raw);",
    "    if (value === '' && !field.required) continue;",
    "    try {",
    "      if (value === '' && field.required) throw new Error();",
    "      if (field.type === 'integer' || field.type === 'decimal') {",
    "        const number = Number(value);",
    "        if (!value.trim() || !Number.isFinite(number) || (field.type === 'integer' && !Number.isInteger(number))) throw new Error();",
    "        payload[field.key] = number;",
    "      } else if (field.type === 'json') payload[field.key] = JSON.parse(value) as unknown;",
    "      else if (field.type === 'date') payload[field.key] = calendarDateToPrisma(value);",
    "      else if (field.type === 'datetime') {",
    "        const date = new Date(value);",
    "        if (!Number.isFinite(date.getTime())) throw new Error();",
    "        payload[field.key] = date.toISOString();",
    "      } else if (field.type === 'enum') {",
    "        if (!field.values?.includes(value)) throw new Error();",
    "        payload[field.key] = value;",
    "      } else payload[field.key] = value;",
    "    } catch { throw new SafeUiError('Enter a valid value for ' + fieldLabel(field.key) + '.'); }",
    "  }",
    "  return payload;",
    "}",
    "function formatValue(field: Pick<RuntimeField, 'type'>, value: unknown) {",
    "  if (value === null || value === undefined || value === '') return 'Not provided';",
    "  if (field.type === 'boolean') return value === true ? 'Yes' : 'No';",
    "  if (field.type === 'date' || field.type === 'datetime') {",
    "    const text = String(value);",
    "    // A date-only business value must not shift to yesterday in western timezones.",
    "    return <time dateTime={text}>{field.type === 'date' ? text.slice(0, 10) : text.replace('T', ' ').replace(/\\.000Z$/, ' UTC')}</time>;",
    "  }",
    "  return typeof value === 'object' ? JSON.stringify(value) : String(value);",
    "}",
    "function FieldControl({ field, value, onChange, id }: { readonly field: RuntimeField; readonly value: string | boolean; readonly onChange: (value: string | boolean) => void; readonly id: string }) {",
    "  const common = { id, name: field.key, required: field.required, value: String(value), onChange: (event: { target: { value: string } }) => onChange(event.target.value) };",
    "  if (field.type === 'boolean') return <input id={id} name={field.key} type='checkbox' checked={value === true} onChange={(event) => onChange(event.target.checked)} />;",
    "  if (field.type === 'text' || field.type === 'json') return <textarea {...common} rows={3} />;",
    "  if (field.type === 'enum') return <select {...common}><option value=''>Choose {fieldLabel(field.key).toLowerCase()}</option>{field.values?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;",
    "  if (field.type === 'integer' || field.type === 'decimal') return <input {...common} type='number' step={field.type === 'integer' ? 1 : 'any'} />;",
    "  return <input {...common} type={field.type === 'datetime' ? 'datetime-local' : field.type === 'string' ? 'text' : field.type} />;",
    "}",
  ].join("\n");
}

/** Shared race-safe collection loading port. */
export function renderWorkspaceRecordHook(): string {
  return [
    "function useEntityRecords(entity: RuntimeEntity, role: string, allowed: boolean) {",
    "  const [records, setRecords] = useState<readonly JsonRecord[]>([]);",
    "  const [error, setError] = useState<string | null>(null);",
    "  const [loading, setLoading] = useState(true);",
    "  const request = useRef(0);",
    "  const refresh = useCallback(async (): Promise<readonly JsonRecord[]> => {",
    "    const current = ++request.current;",
    "    if (!allowed) { setRecords([]); setLoading(false); setError(null); return []; }",
    "    setLoading(true); setError(null);",
    "    try {",
    "      const response = await fetch(`/api/${entity.key}`, { headers: requestHeaders(role) });",
    "      if (!response.ok) throw new SafeUiError(safeResponseMessage(response.status));",
    "      const next = await response.json() as readonly JsonRecord[];",
    "      if (current === request.current) setRecords(next);",
    "      return next;",
    "    } catch (reason) {",
    "      const message = errorMessage(reason);",
    "      if (current === request.current) setError(message);",
    "      throw new SafeUiError(message);",
    "    } finally { if (current === request.current) setLoading(false); }",
    "  }, [entity.key, role, allowed]);",
    "  useEffect(() => {",
    "    setRecords([]);",
    "    void refresh().catch(() => undefined);",
    "    return () => { request.current++; };",
    "  }, [refresh]);",
    "  return { records, error, loading, refresh };",
    "}",
  ].join("\n");
}
