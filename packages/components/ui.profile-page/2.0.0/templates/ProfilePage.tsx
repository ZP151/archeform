const editableFields: string[] = {{json_value:editable_fields}};

export function ProfilePage() {
  return <section className="fp-card" data-factory-component="ui.profile-page@2.0.0"><div className="fp-card-header"><div><p className="fp-card-meta">Account</p><h2>{{tsx_text:heading}}</h2></div><button className="fp-icon-button" aria-label="Edit profile" type="button">↗</button></div><div className="fp-card-body"><ul className="fp-list">{editableFields.map((field) => <li className="fp-row" key={field}><span className="fp-row-title">{field}</span><span className="fp-card-meta">Editable</span></li>)}</ul></div></section>;
}
