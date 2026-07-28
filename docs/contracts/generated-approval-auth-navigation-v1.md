# Generated Approval Auth/Navigation v1

## Candidate identity

`ui.*@2.4.0`; canonical `factory-ui@1.4.0`; candidate-only.

The complete eight-package candidate family is required. It is not Golden,
normally selectable, releasable, or deployable.

## Signed-out allowlist

Before a local session is established, the generated application may expose
only a role-neutral local account selector, a theme control, non-sensitive
feedback, and the Sign in action. The selector submits the existing actor ID
unchanged, but labels accounts `Local account N` rather than identifying a
role or destination.

## Signed-out denylist

Before a local session is established, the generated application must not
render a Primary navigation landmark, protected route or action, Sign out,
role-derived privileged label, approval decision, audit destination, or
authenticated application shell.

## Signed-in invariant

After the existing session endpoint succeeds, navigation equals
`allowedRoutes` for the current session actor. Backend session and RBAC
authorization remain authoritative. Sign-out clears session-bound records,
audit state, feedback, confirmation state, and active route before returning
to the signed-out allowlist.

## Historic isolation

`ui.*@2.1.0`, `2.2.0`, and `2.3.0`, their outputs and locks, and canonical
`factory-ui` roots are immutable. Only a complete explicit 2.4 family may
select the 2.4 Composer emission path.

## Fail-closed identifiers

- `signed_out_protected_focusable_exposed`
- `signed_out_privileged_label_exposed`
- `generated_auth_candidate_family_mixed`
- `historic_generated_family_mutated`
