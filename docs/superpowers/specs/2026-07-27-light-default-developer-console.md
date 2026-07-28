# Light-Default Developer Console

## Outcome

Factory Pilot becomes a sparse, keyboard-first control console for one active
Requirement -> Definition -> Component Plan -> Build -> Evidence decision.
Light theme is the default. Dark theme is available without changing workflow
semantics or feature coverage.

## First Frame

- A 56px icon rail contains global product, lineage, runs, evidence, settings,
  and account access. Tooltips provide names.
- A compact top bar contains the project switcher, health signal, command
  trigger, theme control, notifications, and account menu.
- A compact lifecycle rail shows the current state and permits only valid
  stage navigation.
- The selected state owns the central workspace. It exposes one textual
  primary action and concise icon-first secondary actions.
- Evidence, diagnostics, and version details are closed by default in a
  right-hand Sheet. The trigger shows a count and status.
- Lineage is a focused, read-only canvas with fit, maximize, and node-detail
  controls. It is not an always-visible lower-page diagram.

## Theme Contract

- `light` is the default when no persisted preference exists.
- `dark` uses the same Factory UI Kit tokens, component inventory, states,
  keyboard paths, and content hierarchy.
- Theme control is accessible by keyboard and announces the resulting mode.
- Color never supplies the only state signal.

## Content Contract

- The header has no local transport, capability token, raw brief, loopback,
  or connection presentation.
- Explain only the selected decision; do not repeat state in badges, titles,
  inspectors, and status strips.
- Artifact filename rows have download/open icon buttons with accessible names.
- Destructive stop requires a dialog; initial focus is Cancel and Escape
  restores focus to the trigger.

## Scope Boundaries

- Keep API routes, approval semantics, Executor behavior, and generated
  application composition unchanged.
- Preserve `@xyflow/react` as a read-only, sanitized lineage renderer.
- Use only verified existing shadcn/Radix/Lucide dependencies. Do not copy a
  whole dashboard template or brand identity.

## Acceptance

- Production light render is visually sparse and free of the current permanent
  project/evidence inspector columns.
- Production dark render is operationally identical and visually coherent.
- Command trigger, theme control, sheets, dialogs, and tooltips have keyboard
  coverage.
- Fixture workflow, accessibility suite, source verifier, Factory UI Kit
  verifier, production build, and guarded real-model E2E pass.
