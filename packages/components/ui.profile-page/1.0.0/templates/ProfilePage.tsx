const editableFields: string[] = {{json_value:editable_fields}};

export function ProfilePage() {
  return <section aria-labelledby="profile-heading"><h1 id="profile-heading">{{tsx_text:heading}}</h1><ul>{editableFields.map((field) => <li key={field}>{field}</li>)}</ul></section>;
}
