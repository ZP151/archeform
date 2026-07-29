# Capability-composed guided creation design

## Purpose

The current guided creation flow starts a named Draft from one complete profile.
This slice makes its first business-level composition decision explicit: a user
can choose only verified optional capabilities supported by the selected
profile. The result remains a valid Factory Application Graph and is created
as a mutable Draft through the Control Plane.

## Boundary

The slice does not introduce arbitrary Graph generation, unverified third-party
components, direct source mutation, automatic publishing, or automatic
compilation. It does not change the immutable lifecycle:

```text
Guided input -> profile starter + declared recipe -> validated Draft -> Publish -> Compilation
```

## Capability composition contract

`@factory/capabilities` owns a typed recipe for each profile. A recipe declares:

- supported optional capability keys;
- the default selection;
- a deterministic Graph transformation for each optional key;
- the exact Graph surfaces that transformation is permitted to change.

v1 supports only the optional capability projections already declared by each
profile starter:

| Selection                                    | Graph contribution when enabled                                              | Graph removal when disabled                              |
| -------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `core.audit` (Expense and Ecommerce)         | `audit.record` integration capability, flow audit effects, audit permissions | the integration key, matching effects, and audit actions |
| `core.notification` (Expense and Restaurant) | `notification.send` integration capability and declared notification effects | the integration key and matching effects                 |

`core.audit` is a locked requirement for Restaurant Ordering and
`core.notification` is a locked requirement for Simple Ecommerce. All other
catalog entries applicable to the selected profile are likewise required in
this slice. They are shown in review but cannot be toggled. This avoids an
invalid commerce application with a cart but no order lifecycle, or a Flow
that references an absent capability.

The recipe function returns a structured composition summary containing the
base profile, selected option keys, enabled capability effects, and a
deterministic Graph. It validates that Graph through the browser-safe
`@factory/graph/browser` semantic entrypoint before returning it. The Control
Plane repeats validation as the final server-side boundary before persistence.
The browser entry intentionally excludes Node-only Graph hashing.

## Workbench journey

The left-side creation drawer becomes four concise stages:

1. **Outcome** — choose Expense Approval, Restaurant Ordering, or Simple
   Ecommerce.
2. **Capabilities** — toggle only supported optional capabilities. Required
   capabilities are visible but locked.
3. **Details** — enter an application name and choose light or dark mode.
4. **Review** — see the selected capability set and resulting pages, entities,
   roles, and flows before creating the Draft.

Changing profile resets selections to the recipe defaults. A failed create
keeps all user input in the drawer. Creation continues to make no model call,
no publish, and no compilation.

## Failure behavior

`composeProfileDraft` fails closed when a profile is unknown, an optional key is
not declared for that profile, a required key is disabled, or the composed
Graph violates Application Graph semantics. The Workbench presents the safe
error and never posts an invalid Graph.

## Verification

- Capability package tests prove enabled and disabled audit/notification
  variants are independently valid, deterministic, and reject unsupported
  selections.
- Workbench unit tests prove stage transitions, reset behavior, and that the
  guided helper carries composition options into the Draft without mutating
  profile starters.
- Browser E2E creates a named audit-free Expense Draft and proves it reaches
  Draft state with no audit capability or flow effect.
- Existing compiler tests compile all three default profile Graphs unchanged;
  an audit-free Expense Graph also compiles deterministically.

## Deferred work

Per-capability template packages, arbitrary Domain/Flow construction, external
component acquisition, multi-profile composition, and generated application
customization are later slices. This slice creates the stable constrained
composition boundary those extensions require.
