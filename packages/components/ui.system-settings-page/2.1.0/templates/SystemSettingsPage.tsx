export type Setting = { key: string; label: string };

const settings: Setting[] = {{json_value:settings}};

export function SystemSettingsPage() {
  return <section className="fp-card" data-factory-component="ui.system-settings-page@2.1.0"><div className="fp-card-header"><div><p className="fp-card-meta">Governance</p><h2>{{tsx_text:heading}}</h2></div><span className="fp-status-chip">Protected</span></div><div className="fp-card-body"><dl>{settings.map((setting) => <div className="fp-row" key={setting.key}><dt className="fp-row-title">{setting.label}</dt><dd>{setting.key}</dd></div>)}</dl></div></section>;
}
