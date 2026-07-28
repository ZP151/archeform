export function LoginPage({ onSignIn }: { onSignIn: () => void }) {
  return <section className="fp-card" data-factory-component="ui.login-page@2.0.0"><div className="fp-card-body"><div><p className="fp-kicker">Secure local preview</p><h1>{{tsx_text:product_name}}</h1></div><button className="fp-primary" type="button" onClick={onSignIn}>{{tsx_text:sign_in_label}}</button></div></section>;
}
