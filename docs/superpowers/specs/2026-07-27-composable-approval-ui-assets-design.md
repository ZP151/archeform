# Composable Approval UI Assets Design

## Decision

Factory Pilot will replace the active approval-preview frontend path with the
existing declarative `ComponentComposer`. The new path composes immutable UI
packages; it does not call the legacy `ControlPlane._render_frontend` method.
The work proves that an expense approval and a leave approval application use
the same locked package versions while their labels, fields, and workflows are
different only through validated inputs.

## Scope

The first slice has one product profile: `internal-approval-app`. It provides
an application shell, role switcher, submit form, request list, approval
queue, audit view, responsive layout, and accessible state feedback. It keeps
the existing local PostgreSQL, FastAPI, Docker Compose, Executor, approval,
and audit contracts unchanged.

## Package Topology

`ui.app-shell@2.0.0` owns the fixed generated-app design system source:
tokens, global stylesheet, controlled React primitives, shell, navigation,
role switcher, page assembly boundary, and visual status vocabulary.

The remaining UI packages are independent immutable feature templates and
contribute only their frozen slots:

| Package | Slot | Product responsibility |
| --- | --- | --- |
| `ui.approval-form@2.0.0` | `frontend/features/approval-form` | Typed responsive form and submit feedback |
| `ui.my-requests@2.0.0` | `frontend/features/my-requests` | Role-aware personal-record list |
| `ui.approval-queue@2.0.0` | `frontend/features/approval-queue` | Approve/reject queue with pending state |
| `ui.login-page@2.0.0` | `frontend/routes/login` | Local session entry surface |
| `ui.home-page@2.0.0` | `frontend/routes/home` | Product overview cards |
| `ui.profile-page@2.0.0` | `frontend/routes/profile` | Local profile surface |
| `ui.system-settings-page@2.0.0` | `frontend/routes/settings` | Bounded configuration surface |

Every package retains its own manifest, adapter, inputs fixture, package test,
inventory digests, and candidate trust sidecar. No package may write shared
assembly files, select dependencies, or execute source.

## Composer Boundary

The Composer validates exact package identity and inputs, renders only
declared templates into declared slots, verifies output containment and
checksums, and creates the component lock and composition manifest. A
Composer-owned assembly template imports the selected feature outputs and
connects them to the existing generated API contract. It contains no business
labels, roles, fields, or package-selection logic.

The legacy renderer remains available only for locked historical output. New
approval-suite plans cannot silently mix v1 and v2 UI package versions.

## Visual Direction

Generated applications use the same design language as the accepted Factory
console: light default, equal dark mode, graphite surfaces, restrained
emerald health/approval state, compact typography, icon-first secondary
actions, and progressive disclosure. The application is a focused task
workspace, not a landing page and not an unstructured admin template.

The first screen exposes product title, active actor, concise navigation, a
single high-priority action, and a compact activity/status region. Evidence
and audit details appear on demand. Every interactive control has a visible
keyboard focus state and an accessible label.

## Verification

- Package contracts reject missing, changed, mixed-version, unsigned, or
  out-of-slot UI assets.
- Composer tests prove both profiles use the same v2 UI locks and produce
  different validated inputs and rendered product labels.
- Browser tests prove light/dark rendering, actor switching, submit, approve,
  reject, audit visibility, responsive navigation, and error feedback.
- One guarded real model run completes Brief -> Definition -> Plan ->
  composed application -> Executor READY -> generated-app smoke -> explicit
  stop, without persisting a raw brief, credential, or model reply.

## Non-goals

Cloud deployment, external candidate acquisition, multi-profile application
generation, arbitrary custom code, and candidate-to-Golden promotion are not
part of this implementation slice. Candidate packages remain non-selectable
until their existing trust-promotion gate is accepted.
