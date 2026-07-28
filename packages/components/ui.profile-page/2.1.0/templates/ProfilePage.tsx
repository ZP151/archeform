const profileFields: string[] = {{json_value:editable_fields}};

export function ProfilePage() {
  return <section className="fp-card" data-factory-component="ui.profile-page@2.1.0"><div className="fp-card-header"><div><p className="fp-card-meta">Account</p><h2>{{tsx_text:heading}}</h2></div><span className="fp-status-chip">Local preview</span></div><div className="fp-card-body"><ul className="fp-list">{profileFields.map((field) => <li className="fp-row" key={field}><span className="fp-row-title">{field}</span><span className="fp-card-meta">Available</span></li>)}</ul></div></section>;
}
