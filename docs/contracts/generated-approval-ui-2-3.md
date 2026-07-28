# Generated Approval UI 2.3 Visual Convergence Contract

## Status

Frozen on 2026-07-28. Contract owner: `integration`. Derived from accepted
ADR-016. It applies only to candidate `factory-ui@1.4.0` plus the complete
candidate `ui.*@2.3.0` approval family.

## Immutable family

The eight UI keys are one exact 2.3 family: `ui.app-shell`, `ui.login-page`,
`ui.home-page`, `ui.profile-page`, `ui.system-settings-page`,
`ui.approval-form`, `ui.my-requests`, and `ui.approval-queue`.

- `ui.app-shell@2.3.0` maps to canonical `factory-ui@1.4.0`; every other UI
  package requires exact `ui.app-shell@2.3.0`.
- Each package has a fresh manifest, inventory/digest, adapter, fixture,
  package test, canonical sidecar, trust record, and candidate status.
- Existing generated 1.0/1.3 assets and UI 2.1/2.2 packages, locks, output,
  and replay remain unchanged. New-plan resolution continues to reject all
  candidates until an explicit promotion decision.

## Visual and interaction behavior

- The signed-in active decision uses one responsive content column. It must
  not reserve an unused inspector/sidebar column.
- The rail contains actual labelled icon navigation; the top utility area
  contains labelled compact theme and sign-out controls. Primary actions and
  form labels remain textual. Icon controls use static named imports from
  exact `lucide-react@0.474.0`, with visible tooltips and accessible names.
- Approve/reject confirmation is a centered modal with backdrop, focus trap,
  initial focus on Cancel, Escape/Cancel request suppression, origin focus
  return, and existing confirm/pending/feedback behavior.
- `ui.app-shell.audit@2.3.0` is the only audit component marker emitted by the
  2.3 package. It remains a non-sensitive immutable-audit view.
- Profile and Settings remain read-only, while Settings definition-list
  styling is scoped to its actual rendered card rather than an obsolete side
  layout.
- Light remains default, dark and reduced motion remain functional. Desktop
  and 390px layouts must not overflow.

## Supply-chain boundary

- The generated scaffold pins only `lucide-react@0.474.0` in addition to its
  existing direct dependencies. Record its exact lock/integrity, ISC license
  text/notice, source URL, closure digest, SBOM/closure evidence, and named
  import inventory.
- Dynamic icon lookup, remote icon/registry retrieval, arbitrary SVG markup,
  copied brand marks, and brief/model-controlled icon names are forbidden.

## Explicit exclusions

No generated Lineage/provenance graph, new API/data field, route, slot,
permission, model behavior, Compose change, or candidate promotion belongs to
this contract.
