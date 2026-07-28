# Governed Factory Console Design

> **Visual-composition update:** ADR-010 supersedes this document's Primer
> foundation and permanent three-region layout decisions. This document remains
> authoritative for Factory workflow semantics, containment, and the read-only
> lineage boundary. The current visual specification is
> `docs/superpowers/specs/2026-07-27-light-default-developer-console.md`.

## Decision

Factory Pilot will use a developer-control-console visual language rather than
the current marketing-like green card layout. The Console remains the control
plane for an immutable Requirement -> Definition -> Plan -> Run -> Evidence
workflow; it is not a generated application and must not become a generic
dashboard or a visual workflow editor.

## Design Read

This is a high-information B2B developer console for a founder operating an
application factory. It should feel closer to a precise source-control and
workflow-inspection product than to a low-code landing page. The interface is
light, restrained, keyboard-friendly, and evidence-led. Its density is
deliberately higher than a marketing page, but each page has one clear action.

## Product Layout

Desktop uses three stable regions:

1. A narrow project rail for projects, versions, and lifecycle state.
2. A primary workspace for the current workflow step and decision.
3. A contextual inspector for package locks, validation failures, run
   evidence, and lineage selection.

The product header contains only the Factory Pilot identity and account or
workspace actions. It must not show "Local connection", "Loopback", a raw
capability token, or an environment badge. Local-only transport is an internal
operability constraint, not a product-facing concept.

## Workflow

The main navigation is a persistent lifecycle rail:

```text
Brief -> Definition -> Component plan -> Build run -> Evidence
```

Each stage shows its immutable input, current validation state, the one
allowed transition, and the downstream consequence. Approval is a deliberate
decision panel, not a button mixed into a generic card.

## Visual System

- Background: neutral paper and cool graphite, not pure white and not a green
  field.
- Accent: a single operational teal for selected/focused/approved actions;
  amber for attention; red only for blocked or destructive state.
- Typography: system sans for readable product work; tabular monospace only
  for package IDs, digests, state transitions, and timestamps.
- Surfaces: low-radius panels, thin neutral dividers, strong whitespace and
  hierarchy. Avoid stacked rounded cards, oversized hero headlines, decorative
  eyebrow labels, and status pills used as decoration.
- Interaction: native-feeling focus, visible selected rows, compact menus,
  keyboard-reachable inspector, and motion limited to meaningful state
  transitions. Respect reduced motion.

## Governed Source Strategy

The Console has three bounded external inputs:

| Source | Role | Integration boundary |
| --- | --- | --- |
| `@primer/react@38.34.0` | Presentational React primitives and developer-tool layout patterns | Installed as an exact locked runtime dependency for Console only. |
| `@xyflow/react@12.11.2` | Read-only lineage canvas | Governed by ADR-008 and receives a Factory-owned wrapper. |
| `temporalio/ui@99a9ff718c09ec9574f35067bc14d960ed4ff5bb` | Reference for run-history/evidence patterns | Quarantined design/reference evidence only. The snapshot is Svelte and is not copied into the React runtime. |

No external package or copied source can appear in generated applications by
virtue of appearing in the Console. Generated-app candidate packages continue
to derive only from the canonical Factory UI Kit under ADR-007.

## Acceptance Signals

- Console uses the canonical Factory UI Kit distribution, with Primer as the
  governed foundation rather than ad-hoc shadcn copies.
- The header no longer contains the rejected local-connection presentation.
- A project can be created, its definition reviewed and approved, its plan
  inspected, a run queued/stopped, and evidence explored without leaving the
  product shell.
- A read-only DAG exposes only sanitized Definition, Plan, Run, Evidence, and
  Component identifiers. It has no model, URL, path, or lifecycle mutation.
- Console visual acceptance is evaluated from a production `next start`
  render, not the Next.js development overlay.
- The final end-to-end acceptance includes a guarded real OpenAI call after
  fixture, accessibility, dependency, and product-shell gates pass.
