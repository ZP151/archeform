export type Setting = { key: string; label: string };

const settings: Setting[] = {{json_value:settings}};

export function SystemSettingsPage() {
  return <section aria-labelledby="settings-heading"><h1 id="settings-heading">{{tsx_text:heading}}</h1><dl>{settings.map((setting) => <div key={setting.key}><dt>{setting.label}</dt><dd>{setting.key}</dd></div>)}</dl></section>;
}
