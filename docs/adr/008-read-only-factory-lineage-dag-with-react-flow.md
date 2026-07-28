---
title: "ADR-008: Read-Only Factory Lineage DAG with React Flow"
status: "Accepted"
date: "2026-07-27"
authors: "Tech Lead; Founder-delegated Controller"
tags: ["architecture", "ui", "visualization", "dependency"]
supersedes: ""
superseded_by: ""
---

# ADR-008: Read-Only Factory Lineage DAG with React Flow

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The founder requested this bounded visualization capability on 2026-07-27.

## Context

- **CTX-001**: Factory Pilot needs a legible representation of the immutable
  Requirement -> Definition -> Plan -> Run -> Evidence lineage and component
  dependencies. A tabular view alone obscures relationships and branching.
- **CTX-002**: The Next.js developer overlay is not a stable product UI
  dependency. Its interaction language can inform the product, but its source
  and runtime must not be embedded into Factory Pilot.
- **CTX-003**: npm metadata queried on 2026-07-27 identifies
  `@xyflow/react@12.11.2` as MIT licensed with direct dependencies
  `@xyflow/system@0.0.79`, `classcat@^5.0.3`, and `zustand@^4.4.0`.

## Decision

- **DEC-001**: Add exactly `@xyflow/react@12.11.2` to the Console Next locked
  dependency closure only after the package lock, source notice, license,
  vulnerability review, and build evidence are captured.
- **DEC-002**: Introduce the Factory UI Kit `lineage-dag` component. It owns
  Factory-styled node rendering, edge styles, minimap/controls policy, focus
  states, empty state, and evidence selection drawer. React Flow is a canvas
  implementation detail, not a Factory component identity.
- **DEC-003**: Version, Definition, Plan, Run, Evidence, and Component nodes
  are derived only from already-returned Factory state. The DAG is read-only:
  no node/edge creation, deletion, drag persistence, route selection, plan
  mutation, URL loading, custom tool invocation, or model call is permitted.
- **DEC-004**: The first slice visualizes a single project lineage and its
  approved component-plan dependencies. It does not attempt a global fleet
  graph, a visual workflow editor, or an alternative approval mechanism.

## Consequences

### Positive

- **POS-001**: Factory state becomes inspectable as a product lineage rather
  than a sequence of disconnected pages.
- **POS-002**: The visualizer stays bounded: it renders approved state but
  cannot alter the Factory lifecycle.
- **POS-003**: React Flow capability is encapsulated in the canonical Factory
  UI Kit and can later be included in generated-app candidates only through a
  separate package/profile decision.

### Negative

- **NEG-001**: The Console dependency closure grows and requires supply-chain
  evidence before release.
- **NEG-002**: Large project histories need bounded layout and node-count
  handling; the first slice must not render unbounded raw state.

## Alternatives Considered

### Copy the Next.js developer overlay

- **ALT-001**: Reuse the development overlay's source and behavior.
- **ALT-002**: **Rejection Reason**: It is not a supported Factory product
  component or a stable, governed domain visualization dependency.

### Hand-build a canvas with SVG

- **ALT-003**: Implement pan/zoom/layout and interaction from scratch.
- **ALT-004**: **Rejection Reason**: It duplicates mature canvas behavior and
  delays validation of the actual product lineage value.

## Migration and Rollback

- **MIG-001**: Capture the exact npm lock closure and third-party notice in
  the Console intake evidence before the component is imported at runtime.
- **MIG-002**: Add a read-only `lineage-dag` Factory UI Kit component and a
  fixture-driven browser test before connecting real project state.
- **RBK-001**: If dependency review or visualization verification fails, omit
  the DAG route/component and retain the existing inspected state panels. No
  Factory lifecycle or generated output is changed.

## Verification Gate

- **VRF-001**: Dependency lock, notice, license, and vulnerability evidence
  match the exact approved package closure.
- **VRF-002**: Browser tests prove all graph nodes derive from supplied state,
  are keyboard reachable, expose accessible labels, and cannot mutate it.
- **VRF-003**: Tests reject raw brief text, credentials, arbitrary URLs, and
  unsupported node kinds from the graph model.
- **VRF-004**: The Console and generated-app candidate asset boundary remains
  unchanged; React Flow is not silently selected for generated applications.

## References

- **REF-001**: [xyflow/xyflow](https://github.com/xyflow/xyflow)
- **REF-002**: [React Flow documentation](https://reactflow.dev/)
- **REF-003**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-004**: `docs/tech-governance.md`
