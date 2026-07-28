export type Setting = { key: string; label: string };

const settings: Setting[] = {{json_value:settings}};

export function SystemSettingsPage() {
  return <section className="fp-card" data-factory-component="ui.system-settings-page@2.4.0"><div className="fp-card-header"><div><p className="fp-card-meta">Governance</p><h2>{{tsx_text:heading}}</h2></div><span className="fp-status-chip">Read only</span></div><div className="fp-card-body"><p className="fp-empty">Settings are read only in this local preview.</p><dl className="fp-settings-list">{settings.map((setting) => <div key={setting.key}><dt className="fp-row-title">{setting.label}</dt><dd>{setting.key}</dd></div>)}</dl></div></section>;
}
