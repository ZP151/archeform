export function LoginPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main aria-labelledby="login-title">
      <p>Secure approval workspace</p>
      <h1 id="login-title">{{tsx_text:product_name}}</h1>
      <button type="button" onClick={onSignIn}>{{tsx_text:sign_in_label}}</button>
    </main>
  );
}
