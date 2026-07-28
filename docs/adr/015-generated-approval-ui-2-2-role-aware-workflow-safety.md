---
title: "ADR-015: Generated Approval UI 2.2 Role-Aware Workflow Safety"
status: "Accepted"
date: "2026-07-28"
authors: "Tech Lead"
tags: ["architecture", "generated-ui", "accessibility", "workflow-safety"]
supersedes: ""
superseded_by: ""
---

# ADR-015: Generated Approval UI 2.2 Role-Aware Workflow Safety

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

**Decision:** accepted by the Founder-delegated Controller on 2026-07-28.
Implementation is authorized only through a new frozen task ledger and the
existing candidate-to-Golden promotion process. It does not authorize altering
an existing lock, package, trust record, generated output, API, or data
contract.

## Context

- **CTX-001**: The accepted generated approval distribution is the coherent
  `ui.*@2.1.0` family governed by ADR-012. Its canonical evidence points to
  `factory-ui@1.0.0`; the separate Console assets at `factory-ui@1.1.0` and
  `1.2.0` are not generated-product dependencies.
- **CTX-002**: Current planner output can include Submit, My records,
  Approval queue, Audit, Profile, and Settings for an actor whose assembled
  package output does not render every destination. A route can therefore be
  keyboard-focusable and selected without a corresponding panel. This breaks
  the role boundary and the tab/`aria-controls` relationship.
- **CTX-003**: The signed-out generated product currently mounts the complete
  workflow shell. A visitor can inspect and focus workflow navigation before
  establishing a local session, even though no protected data action should be
  available.
- **CTX-004**: Approve and reject currently call the decision handler directly.
  There is no confirmation step, in-flight state, duplicate-action prevention,
  result announcement, or reliable focus return. Approval decisions are
  consequential and must not be accidentally or repeatedly invoked.
- **CTX-005**: Generated 2.1 CSS has motion but no
  `prefers-reduced-motion: reduce` treatment. Its failure/status treatment is
  semantically present but the `.fp-error` class has no governed visual rule.
  Submit and decision outcomes lack a single accessible feedback boundary.
- **CTX-006**: Profile and Settings are read-only package outputs. Their labels
  presently imply editable capabilities even though no frozen backend,
  persistence, or authorization contract permits edit operations.
- **CTX-007**: `factory-component/v1`,
  `factory-component-adapter/v1`, `factory-composition/v1`, the declared UI
  slots, the Python 3.12/FastAPI, PostgreSQL 16, Next.js 15/React 19, and
  Docker Compose Golden profile remain frozen. This decision must not add a
  frontend dependency, a new slot, executable adapter semantics, a network
  resource, a URL/path/code input, or a model-controlled component choice.
- **CTX-008**: Mutable repair of `factory-ui@1.0.0` or any
  `ui.*@2.1.0` package would invalidate their inventories, digests, locks,
  trust evidence, generated outputs, and historical replay claims. The remedy
  must be an independently versioned successor distribution.

## Decision

- **DEC-001**: Materialize a repository-owned canonical generated-product
  asset at exact `factory-ui@1.3.0`. It is a new immutable identity with its
  own manifest, token/CSS/React asset digests, fixtures, tests, and verification
  evidence. It is not a copy-import of the Console source and it adds no third
  party runtime dependency. `factory-ui@1.0.0` remains the exact historical
  generated identity; `1.1.0` and `1.2.0` remain Console-only identities.
- **DEC-002**: Materialize a coherent, exact `2.2.0` successor for every
  generated approval UI component:

  ```text
  ui.app-shell@2.2.0
  ui.login-page@2.2.0
  ui.home-page@2.2.0
  ui.profile-page@2.2.0
  ui.system-settings-page@2.2.0
  ui.approval-form@2.2.0
  ui.my-requests@2.2.0
  ui.approval-queue@2.2.0
  ```

  Every successor package has a fresh manifest, inventory/digest, declarative
  adapter, fixture, package test, canonical-asset sidecar, and trust record.
  Dependent UI packages require exact `ui.app-shell@2.2.0`; a new plan rejects
  mixed `2.1.0`/`2.2.0` UI locks. Existing `2.1.0` locks remain exact replay
  only under the existing trust and revocation policy.
- **DEC-003**: A signed-out product renders only the identity boundary:
  product identity, supported theme control, local role/session selection, and
  sign-in. It renders no protected workflow navigation, task panel, audit,
  records, or decision action. Authentication and authorization remain
  enforced by the existing generated API; hiding navigation is an additional
  product and accessibility boundary, not authorization by presentation.
- **DEC-004**: Signed-in navigation is derived from the validated actor role
  and only renders a route whose destination is assembled and authorized for
  that role. Navigation uses application-navigation semantics with
  `aria-current="page"`, rather than partial ARIA tab semantics. Unavailable
  routes are absent from the DOM and cannot receive focus; a programmatic or
  stale selection falls back deterministically to the first allowed route.
  The visible destination exposes a labelled landmark or focusable heading.
- **DEC-005**: Approve and reject become a two-step, locally controlled
  interaction. Selecting either opens an inline confirmation state containing
  a non-sensitive record summary and the intended decision. Only explicit
  confirmation invokes the existing API. While pending, affected decision
  controls are disabled, expose busy state, and cannot issue a duplicate
  request. Cancel and Escape close the confirmation without an API request and
  restore focus to the originating action. The final result moves focus to the
  meaningful queue/record outcome without hiding the immutable audit result.
- **DEC-006**: The 2.2 asset provides one styled feedback boundary: success and
  neutral operation outcomes use `role="status"` with `aria-live="polite"`;
  failures use `role="alert"`. Submit and decision outcomes must announce an
  outcome, render a governed visual state in light and dark themes, and provide
  a meaningful post-action focus target. No raw API exception, raw brief,
  model request/response, credential, capability token, or secret may enter
  the feedback content, DOM, logs, output, or evidence.
- **DEC-007**: `factory-ui@1.3.0` includes a complete
  `prefers-reduced-motion: reduce` policy for generated-product transitions,
  animations, transforms, and scrolling. It includes governed visual styles
  for errors, pending/busy controls, confirmation, and disabled states while
  preserving keyboard-visible focus and readable contrast in both themes.
- **DEC-008**: Profile and Settings remain explicitly read-only in 2.2. Their
  copy and navigation labels must state that scope and must not contain
  nonfunctional edit controls. Persisted profile/settings changes, new API
  operations, and authorization rules require a separately proposed and
  accepted backend/data-contract ADR and an integration-owned frozen contract.
- **DEC-009**: The Composer remains the sole assembly authority. 2.2 adapters
  bind only the existing validated component inputs to existing declared slots.
  They cannot select components, choose routes, URLs, filesystem paths,
  primitives, package versions, arbitrary code, output topology, or model
  behavior. Role-derived route filtering and decision-state wiring are
  Composer-owned generated assembly logic and are validated against the
  existing actor/authentication semantics.
- **DEC-010**: `2.2.0` begins as candidate and is not selected for a new plan
  until the accepted ADR-004 trust/promotion procedure verifies its exact
  immutable packages, canonical asset mapping, and evidence. A UI screenshot,
  a local digest, or a metadata lifecycle label does not substitute for that
  promotion decision.

## Proposed Profile and Compatibility

| Aspect | Existing historical/generated profile | Proposed 2.2 profile |
| --- | --- | --- |
| Canonical generated UI asset | `factory-ui@1.0.0` | `factory-ui@1.3.0` |
| Console assets | `1.1.0`/`1.2.0`, Console-only | Unchanged; not imported by generated output |
| UI component family | Exact `ui.*@2.1.0` | Exact `ui.*@2.2.0`, coherent family only |
| New-plan eligibility | Existing accepted 2.1 policy | Candidate until exact 2.2 trust promotion |
| Historical replay | Exact 2.1 lock under trust/revocation policy | Exact 2.2 lock under the same policy after promotion |
| Runtime profile | Python 3.12/FastAPI, PostgreSQL 16, Next.js 15/React 19, Docker Compose | Unchanged |
| Component/adapter/slot contracts | Frozen v1 | Unchanged |
| API/data contract | Existing role, session, submit, approval, audit contract | Unchanged; no profile/settings write API |

- **COM-001**: New leave and expense products lock the same eight exact 2.2 UI
  package versions. Their role names, labels, fields, schemas, and UI wording
  may differ only through already validated application/component inputs and
  documented template extension points.
- **COM-002**: 2.1 generated products retain their current behavior and exact
  rendered source. No migration rewrites an existing definition, plan, lock,
  run, package, trust record, evidence, or generated output in place.
- **COM-003**: This decision deliberately distinguishes product safety from
  API authorization. A malformed client cannot gain a forbidden action merely
  because a navigation control is hidden; the backend remains authoritative.

## Migration and Rollback

- **MIG-001**: After founder acceptance, PM creates one serialized
  integration-owned ledger and freezes a 2.2 UI behavior contract naming
  role-to-route eligibility, confirmation/pending/focus semantics, feedback
  text boundary, canonical asset identity, and required evidence.
- **MIG-002**: Integration creates the canonical 1.3 asset and verifier proof,
  then materializes every 2.2 package from it with only existing slots and
  declarative adapters. Existing 1.0/2.1 and Console 1.1/1.2 paths are
  read-only.
- **MIG-003**: Integration implements the signed-out boundary, role-aware
  application navigation, read-only profile/settings copy, confirmation,
  pending/duplicate prevention, feedback, focus restoration, error states,
  and reduced-motion behavior in the 2.2 generated assembly. It does not add
  persistence or backend endpoints.
- **MIG-004**: QA records package/Composer rejection evidence, generated leave
  and expense browser evidence, accessibility/responsive proof, API-smoke and
  Docker cleanup evidence, and the no-secret/no-raw-brief inspection. The
  Trusted Registry promotion remains an explicit PM/controller decision after
  all required evidence is green.
- **MIG-005**: Only after promotion may new leave and expense plans select the
  coherent 2.2 package family. Existing products remain pinned to their exact
  family until a separately approved application version is generated.
- **RBK-001**: Before promotion, stop candidate selection and retain existing
  2.1 plan resolution/replay. Preserve all immutable candidate artifacts and
  evidence; do not delete or relabel them.
- **RBK-002**: After promotion, revoke the 2.2 trust-policy mapping to stop
  future selection and materialization if a safety gate fails. Preserve all
  locks and evidence. Do not silently fall back, upgrade, or substitute a 2.1
  package for a 2.2 lock.
- **ABT-001**: Abort promotion on an incomplete role/destination mapping, a
  signed-out workflow control, a decision request before confirmation, repeat
  decision invocation while pending, focus loss, a raw error/secret exposure,
  canonical digest/marker mismatch, mixed UI family, out-of-slot adapter write,
  unresolved P0/P1 accessibility/security/privacy issue, or failed cleanup.

## Consequences

### Positive

- **POS-001**: Generated products acquire a coherent, role-aware interaction
  model in which visible routes always work and signed-out users do not see a
  misleading workflow preview.
- **POS-002**: Approval/rejection obtains deliberate confirmation, pending
  safety, accessible feedback, and focus behavior without expanding backend
  authority or template execution power.
- **POS-003**: Motion, error, and status behavior become governed immutable
  component assets rather than per-product CSS drift.
- **POS-004**: Historical locks and Console identity remain truthful and
  independently replayable while future generated UI evolution is auditable.

### Negative

- **NEG-001**: The repository temporarily carries another canonical asset and
  a full eight-package UI family with corresponding fixtures and evidence.
- **NEG-002**: Candidate 2.2 cannot be used for new plans until the existing
  trust promotion gate is satisfied, even if its fixture visibly works.
- **NEG-003**: Read-only Profile and Settings do not satisfy users who need
  persistence; those capabilities require a later API/data slice rather than
  deceptive controls.
- **NEG-004**: Confirmation adds one interaction step for decisions, trading a
  small amount of speed for protection against accidental or duplicate action.

## Alternatives Considered

### Patch `ui.*@2.1.0` and `factory-ui@1.0.0` in place

- **ALT-001**: Add route filtering, CSS, confirmation, and feedback directly
  to the selected historical package family.
- **ALT-002**: **Rejection Reason**: It changes digests and invalidates exact
  packages, locks, canonical evidence, generated output, and replay claims.

### Reuse the Console `factory-ui@1.2.0` distribution

- **ALT-003**: Make generated applications import or copy the Console asset.
- **ALT-004**: **Rejection Reason**: Console and generated product have
  separate version/lifecycle evidence and interaction requirements; importing
  a Console runtime path violates ADR-007 and creates hidden coupling.

### Leave all routes visible and render placeholders

- **ALT-005**: Retain generic route navigation, but add an unavailable-panel
  placeholder for unauthorized users.
- **ALT-006**: **Rejection Reason**: It retains a misleading focusable
  workflow path and weakens the role-aware product boundary. A route neither
  assembled nor authorized must be absent.

### Call approve/reject immediately and rely on backend idempotency

- **ALT-007**: Keep one-click decision buttons and let the API absorb repeats.
- **ALT-008**: **Rejection Reason**: Backend safety is necessary but does not
  provide deliberate user confirmation, local pending feedback, focus
  restoration, or prevention of accidental invocation.

### Add editable profile/settings controls without new APIs

- **ALT-009**: Add client-only save affordances to make the pages feel active.
- **ALT-010**: **Rejection Reason**: Nonpersistent controls misrepresent
  capability and violate the frozen API/authz contract.

## Implementation Notes

- **IMP-001**: Integration owns the new canonical asset, 2.2 component family,
  Composer assembly, role-route mapping, and end-to-end evidence. This is
  serialized because generated templates and shared assembly are cross-cutting.
- **IMP-002**: Navigation must not use `role="tab"`/`aria-controls` unless all
  ARIA Tabs keyboard semantics and rendered controls are guaranteed. For this
  application, semantic navigation links/buttons with `aria-current="page"`
  are the chosen bounded implementation.
- **IMP-003**: Confirmation can be inline or an accessible modal only if it
  meets the named focus, Escape, cancellation, and pending requirements. It
  must show only already-authorized, non-sensitive record summary fields.
- **IMP-004**: The 2.2 asset must preserve light default and dark theme, use
  canonical token contrast checks, and prefer semantic icons/status text over
  text-only decorative controls without making accessible names ambiguous.
- **IMP-005**: No real model call is required to verify this fixture safety
  slice. If later requirement-to-product real-model validation is explicitly
  run, it is a bounded manual acceptance gate: at most five calls, key only
  from local process environment, and no key/raw prompt/raw response in any
  retained artifact.

## Verification Gate

- **VRF-001**: Package/canonical tests prove exact `factory-ui@1.3.0` identity,
  CSS/token/React digest mapping, markers, 2.2 package inventories, exact
  dependencies, no mixed 2.1/2.2 lock family, adapter slot containment, and
  unchanged historical 1.0/2.1/Console 1.1/1.2 assets.
- **VRF-002**: Registry/Composer tests prove a candidate, unsigned, stale,
  incompatible, altered, revoked, or non-Golden 2.2 package fails closed
  before lock/output creation; exact historical locks remain governed replay
  only. Model output cannot select component identity, package versions, URLs,
  paths, arbitrary code, or route topology.
- **VRF-003**: Leave and expense browser evidence proves signed-out users
  cannot focus or invoke protected navigation/actions; each actor sees only
  permitted routes; each displayed route renders one destination; unavailable
  routes are absent rather than blank; and role-aware submit, personal record,
  approve, reject, and audit flows still work through the generated API.
- **VRF-004**: Browser evidence proves approve/reject sends no decision request
  until confirm; confirmation cancel/Escape restores trigger focus; confirm
  disables duplicate controls and exposes busy state; success/failure
  announcements use the feedback boundary; and focus reaches the meaningful
  result after submit/decision.
- **VRF-005**: Generated browser/accessibility tests prove light/dark contrast,
  visible focus, governed error/pending/disabled state, reduced-motion
  computed style, 390px and desktop layouts with no horizontal page overflow,
  keyboard navigation, and retained Docker cleanup.
- **VRF-006**: Fresh evidence in the implementation ledger includes at least:

  ```powershell
  py -3.12 -m unittest tests.api.test_component_contract -v
  py -3.12 -m unittest tests.api.test_component_composer -v
  py -3.12 -m unittest tests.api.test_component_planner -v
  py -3.12 -m unittest tests.api.test_composable_control_plane -v
  node tests/web/generated-approval-app-e2e.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  node --check apps/web/app.js
  git diff --check
  ```

## References

- **REF-001**: `docs/adr/003-first-party-component-packages-registry-and-declarative-composer.md`
- **REF-002**: `docs/adr/004-trusted-registry-and-local-supply-chain.md`
- **REF-003**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-004**: `docs/adr/012-generated-ui-v2-lifecycle-reconciliation.md`
- **REF-005**: `docs/contracts/factory-ui-kit-v1.md`
- **REF-006**: `docs/contracts/factory-component-composition-v1.md`
- **REF-007**: `docs/tech-governance.md`
- **REF-008**: Generated approval UI 2.2 read-only audit, 2026-07-28.
