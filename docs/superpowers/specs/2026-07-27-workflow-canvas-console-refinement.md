# Workflow Canvas Console Refinement

## Outcome

The Factory Pilot control console uses the approved developer-console direction:
a compact, stateful workflow canvas rather than a large title followed by an
explanatory form card. Light remains the default; dark retains the same
information architecture and interaction paths.

## Interaction Model

- Four lifecycle stages are visible as connected decision objects. A valid
  stage can be selected without modifying control-plane state.
- The selected stage owns one focused canvas: Brief, Definition, Component
  Plan, or Build Run.
- Brief provides three local starter actions which only populate the editable
  brief. It does not call a model until the explicit generation action.
- Product switching hydrates every project summary first and fetches full
  project detail only after a selection.
- A `pending_approval` component plan is an eligible approval-gate state,
  alongside the legacy `draft` state. Only an approved plan may queue a run.

## Visual Constraints

- No hero-scale product heading or duplicated explanatory copy.
- Typography is compact: one 21px canvas title, 13px UI text, and mono only
  for metadata and state values.
- Evidence stays in an on-demand sheet. Stage cards, preset controls, and
  icon actions have visible hover and keyboard-focus treatment.
- The default light canvas uses the existing semantic emerald signal. Dark
  uses the same hierarchy, content budget, and controls.

## Acceptance

- A real model-backed Brief reaches an approved Application Definition.
- The Console accepts `pending_approval` at the component-plan approval gate.
- The switcher exposes every project returned by `GET /api/projects`.
- An approved plan reaches an Executor-ready preview, and the generated
  application completes submit, approve, and audit smoke before explicit stop.
