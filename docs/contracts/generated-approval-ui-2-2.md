# Generated Approval UI 2.2 Behavior Contract

- **Contract version:** `generated-approval-ui/v2.2`
- **Status:** frozen
- **Owner:** integration
- **Decision:** `docs/adr/015-generated-approval-ui-2-2-role-aware-workflow-safety.md`
- **Applies to:** canonical generated asset `factory-ui@1.3.0` and the complete
  `ui.*@2.2.0` internal-approval UI family only.

## Identity and immutability boundary

The following eight packages are one coherent family; a 2.2 lock includes all
eight at exactly `2.2.0`:

```text
ui.app-shell
ui.login-page
ui.home-page
ui.profile-page
ui.system-settings-page
ui.approval-form
ui.my-requests
ui.approval-queue
```

- `ui.app-shell@2.2.0` requires and traces canonical
  `factory-ui@1.3.0`; every dependent package requires exactly
  `ui.app-shell@2.2.0`.
- Every package has a new manifest, inventory/digest, declarative adapter,
  fixture, package test, canonical-asset sidecar, and trust record. Existing
  `factory-ui@1.0.0`, Console-only `1.1.0`/`1.2.0`, and all `ui.*@2.1.0`
  paths are immutable historical identities.
- 2.2 packages are candidates until the existing ADR-004 promotion gate has
  verified exact canonical mapping, evidence, and trust policy. New plans must
  reject candidate, unsigned, stale, revoked, altered, incompatible, non-Golden,
  and mixed 2.1/2.2 families. Historical 2.1 locks remain exact replay only.
- The existing component, adapter, output-slot, API/data, Docker Compose, and
  runtime contracts are unchanged. The Composer remains the only assembly
  authority.

## Signed-out identity boundary

Before a local session is established, generated output renders only:

1. product identity;
2. the supported light/dark theme control;
3. local role/session selection; and
4. the sign-in action.

The signed-out DOM must not render or expose keyboard focus to application
navigation, Home, Submit, My requests, Approval queue, Audit, Profile,
Settings, request records, audit data, decision controls, or action feedback
about protected data. Hiding these controls does not replace existing API
authentication/authorization.

## Signed-in role-to-route eligibility

Navigation is application navigation under a labelled `nav`. It uses normal
navigation controls and `aria-current="page"`; it must not use `role="tab"`,
`aria-controls`, or partial ARIA Tabs semantics.

| Actor kind | Allowed destinations |
| --- | --- |
| `submitter` | `/`, `/submit`, `/my-records`, `/profile`, `/settings` |
| `approver` | `/`, `/approval-queue`, `/profile`, `/settings` |
| `auditor` | `/`, `/audit`, `/profile`, `/settings` |
| `observer` | `/`, `/audit`, `/profile`, `/settings` |

- A destination appears only when its package output is assembled and the
  current validated actor kind is eligible. It is otherwise absent from the
  DOM and cannot receive focus.
- Every displayed destination renders exactly one labelled landmark or
  focusable heading. A stale/programmatic selection falls back to the first
  allowed destination deterministically.
- Profile and Settings are visible only with explicit read-only labels/copy;
  they contain no editable or fake-save control. New persistence or an edit API
  requires a separate accepted backend/data-contract ADR.

## Submit, decision, feedback, and focus

- A submission, approval, or rejection never surfaces raw backend/provider
  exceptions. Feedback contains only governed, bounded user-safe messages.
- Approve/Reject first opens a single local confirmation state with the
  intended decision and a non-sensitive request summary. Opening it sends no
  API decision request.
- Confirm is the sole decision request path. During the request, affected
  decision controls are natively disabled, expose busy state, and cannot issue
  a duplicate request. Cancel and Escape issue no decision request and restore
  focus to the originating decision action.
- After success or failure, the governed feedback boundary announces the
  outcome and focus lands on the meaningful queue/record result while immutable
  audit evidence remains visible.
- Success/neutral feedback uses `role="status"` and `aria-live="polite"`;
  failures use `role="alert"`. Submit and decision paths share this one styled
  feedback boundary.
- Raw briefs, model request/responses, credentials, capability tokens, signing
  material, URLs, paths, arbitrary code, and secrets are forbidden from the
  generated DOM, logs, evidence, package templates, and feedback text.

## Visual and accessibility invariants

- Light is the default theme; dark remains functional. Generated asset tokens
  provide readable text, focus, pending, disabled, success, and failure states
  in both themes.
- `factory-ui@1.3.0` suppresses non-essential transitions, animations,
  transforms, and smooth scrolling under `prefers-reduced-motion: reduce`.
  Keyboard-visible focus, semantic state updates, manual navigation, and
  feedback remain usable.
- Generated leave and expense previews pass at 390 px and desktop without page
  horizontal overflow. Keyboard navigation, focus restoration, confirmation,
  role switching, feedback, and all allowed routes remain usable.

## Required evidence and stop conditions

Before a 2.2 promotion decision, evidence proves package identity/digests,
canonical mapping, adapter-slot containment, mixed-family rejection, signed-out
isolation, role-to-route filtering, confirm-before-request, pending duplicate
prevention, focus restoration, feedback/contrast/motion behavior, leave and
expense browser flows, API smoke, Docker cleanup, and no-secret/no-raw-brief
inspection.

Stop implementation and return to PM if an existing identity/lock/trust record
needs mutation, a new API/data/slot/dependency/topology is needed, an ineligible
route remains focusable, a decision can send before confirmation or twice while
pending, feedback leaks protected material, or any P0/P1 security/privacy/
accessibility issue remains.
