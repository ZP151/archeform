---
title: "ADR-010: Light-Default Shadcn Console Composition"
status: "Accepted"
date: "2026-07-27"
authors: "Founder-delegated Controller"
tags: ["architecture", "ui", "supply-chain", "console"]
supersedes: "ADR-009 DEC-001 and DEC-002 for Console visual composition only"
superseded_by: ""
---

# ADR-010: Light-Default Shadcn Console Composition

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

## Context

- **CTX-001**: The founder selected the developer-console interaction model
  and rejected the current text-heavy, permanent-three-column composition.
- **CTX-002**: The founder requires light mode as the default and a complete
  dark mode for active development work.
- **CTX-003**: The Console already has a fixed, verified shadcn primitive
  snapshot and exact runtime packages `radix-ui@1.4.3`,
  `lucide-react@0.474.0`, `next-themes@0.4.6`, and `sonner@2.0.7`.
- **CTX-004**: ADR-007 still requires Factory-owned semantic wrappers and a
  separate generated-application candidate distribution.

## Decision

- **DEC-001**: Factory UI Kit wrappers for the Console use the verified
  shadcn/Radix primitive distribution and Lucide icons. Primer remains locked
  only as historical Console source evidence and is not the visual-composition
  foundation for new Console work.
- **DEC-002**: The Console defaults to `light`; `dark` is a first-class
  persisted user preference using the same semantic component contract.
- **DEC-003**: The active decision is the primary surface. Project switching,
  command access, evidence, diagnostics, and lineage selection use compact
  navigation, sheets, dialogs, popovers, and a focused canvas rather than
  permanent text-heavy columns.
- **DEC-004**: Icon-only controls use Lucide with an accessible name and a
  tooltip. Text remains on primary/destructive actions and where an icon alone
  is ambiguous.
- **DEC-005**: The `awesome-design-md` MIT collection is a design-language
  reference only. It grants no right to copy third-party brand assets, logos,
  fonts, screenshots, or product code.

## Consequences

### Positive

- **POS-001**: The Console uses the component system the founder expects and
  gains high-quality Sheet, Dialog, Tooltip, Dropdown Menu, Tabs, and Toast
  behavior without a framework rewrite.
- **POS-002**: Light mode improves long-form inspection, while dark mode keeps
  a credible developer-tool operating environment.
- **POS-003**: Progressive disclosure reduces repeated status copy and lets
  the active build decision own the first frame.

### Negative

- **NEG-001**: The previous Primer-backed wrapper implementation must be
  migrated and its visual CSS replaced.
- **NEG-002**: Theme parity, focus containment, and responsive sheet behavior
  add explicit acceptance work.
- **NEG-003**: No copied full dashboard template is permitted; Factory-owned
  composition remains necessary.

## Alternatives Considered

### Keep the Primer visual composition

- **ALT-001**: Retain the current wrapper implementation and restyle it.
- **ALT-002**: **Rejection Reason**: It does not meet the founder's requested
  shadcn-like component language or the selected console interaction model.

### Copy a full public dashboard template

- **ALT-003**: Fork an entire dashboard repository into Console Next.
- **ALT-004**: **Rejection Reason**: It imports unrelated routing, state,
  domain copy, and design debt, and violates Factory asset governance.

### Light-only Console

- **ALT-005**: Remove the dark theme to minimize implementation work.
- **ALT-006**: **Rejection Reason**: The founder explicitly requires dark mode
  to remain available during active development.

## Implementation Notes

- **IMP-001**: Preserve exact package pins and the source verifier. New
  runtime packages require a separate accepted ADR.
- **IMP-002**: Add semantic wrappers for icon action, tooltip, sheet, command
  trigger, and theme control before product pages use them.
- **IMP-003**: Move evidence and diagnostics into a closed-by-default sheet;
  make the lineage canvas expandable and selection-driven.
- **IMP-004**: Verify light and dark production renders plus keyboard focus,
  Escape dismissal, focus restoration, and server-state action gating.

## References

- **REF-001**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-002**: `docs/adr/008-read-only-factory-lineage-dag-with-react-flow.md`
- **REF-003**: `docs/adr/009-governed-developer-console-source-integration.md`
- **REF-004**: `https://ui.shadcn.com/blocks?category=dashboard`
- **REF-005**: `https://github.com/VoltAgent/awesome-design-md/tree/664b3e78fd1a298ba11973822da988483256d4b4`
