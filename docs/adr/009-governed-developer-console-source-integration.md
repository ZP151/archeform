---
title: "ADR-009: Governed Developer Console Source Integration"
status: "Accepted"
date: "2026-07-27"
authors: "Tech Lead; Founder-delegated Controller"
tags: ["architecture", "ui", "supply-chain", "console"]
supersedes: ""
superseded_by: ""
---

# ADR-009: Governed Developer Console Source Integration

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The founder authorized discovering and integrating suitable open-source
control-console code on 2026-07-27. This decision bounds that authorization.

## Context

- **CTX-001**: The existing Console Next surface imports quarantined shadcn
  primitive copies but has no coherent product visual system. The founder
  rejected the resulting card-heavy interface.
- **CTX-002**: ADR-007 requires one canonical Factory UI Kit, a verified
  Console distribution, and a distinct generated-app candidate distribution.
- **CTX-003**: ADR-008 accepts `@xyflow/react@12.11.2` for a Factory-owned,
  read-only lineage DAG once dependency evidence is captured.
- **CTX-004**: Public source review on 2026-07-27 found: Primer React's
  compatible `@primer/react@38.34.0` and `@primer/primitives@11.9.0` packages
  are MIT licensed; Temporal UI is MIT licensed and its `main` resolved to
  `99a9ff718c09ec9574f35067bc14d960ed4ff5bb`; Backstage and Appsmith are
  Apache-2.0 but are framework-scale alternatives rather than small Console
  dependencies.

## Decision

- **DEC-001**: Console Next receives exact locked dependencies
  `@primer/react@38.34.0`, `@primer/primitives@11.9.0`, and the already
  accepted `@xyflow/react@12.11.2`. The lockfile is the authority for their
  resolved transitive closure.
- **DEC-002**: Factory-owned semantic wrappers remain the only Console UI
  imports used by product pages. Primer and React Flow are implementation
  details behind the canonical Factory UI Kit; generated applications do not
  receive either dependency under this decision.
- **DEC-003**: A Temporal UI source snapshot is quarantined at its exact SHA
  as a design/reference record, not a runtime dependency. Inspection confirms
  that this source is Svelte; no Temporal source code is copied into the React
  Console. The source ledger records the SHA, license, inspected paths, and
  this compatibility decision.
- **DEC-004**: Temporal's event-timeline, run-state, and evidence-inspector
  interaction patterns may inform Factory-owned implementations. API clients,
  routing, authentication, global styles, build tooling, runtime
  configuration, Temporal-domain behavior, and direct source copying are
  excluded.
- **DEC-005**: Backstage and Appsmith may inform information architecture but
  no source code, dependency, branding, or trademark is imported from either.
- **DEC-006**: The Console header removes environment/local-connection
  presentation. Loopback binding and server-side capability handling remain
  internal implementation details protected by ADR-006.

## Consequences

### Positive

- **POS-001**: The Console gains mature, accessible developer-tool primitives
  without adopting another product's full framework or domain model.
- **POS-002**: Every external source and runtime dependency has an exact,
  auditable identity and a rollback path.
- **POS-003**: The Factory UI Kit remains the cross-surface contract while the
  Console can become a credible product control plane.

### Negative

- **NEG-001**: The Console dependency closure and source notices add supply
  chain review work.
- **NEG-002**: Source adaptation requires maintenance when the selected
  upstream commit is later replaced.
- **NEG-003**: This does not promote UI candidate packages or broaden the
  generated application runtime.

## Alternatives Considered

### Adopt Backstage as the Console runtime

- **ALT-001**: Replace Console Next with Backstage and its plugin framework.
- **ALT-002**: **Rejection Reason**: It changes the application architecture,
  introduces a portal runtime that exceeds the bounded Factory control plane,
  and delays product validation.

### Copy a full Temporal UI application or component

- **ALT-003**: Fork Temporal UI or adapt isolated components into Console.
- **ALT-004**: **Rejection Reason**: Its Svelte component format is not a
  compatible React runtime boundary and importing it would require unrelated
  routing, workflow APIs, and build assumptions.

### Keep the existing shadcn copy and restyle it

- **ALT-005**: Continue Console-only CSS repairs over old primitive copies.
- **ALT-006**: **Rejection Reason**: The founder rejected the outcome and it
  violates ADR-007's shared asset objective.

## Implementation Notes

- **IMP-001**: Install exact packages with a checked-in lockfile, generate a
  third-party notice, inspect license and vulnerability output, and fail the
  Console intake verifier on drift.
- **IMP-002**: Record the Temporal snapshot only as a quarantined reference
  with its MIT notice. Recreate no source file verbatim; Factory-owned React
  wrappers implement the approved interaction model.
- **IMP-003**: Replace direct `components/ui/*` imports in Console pages with
  Factory UI Kit wrappers, then prove production render, keyboard flow,
  responsive behavior, and a sanitized read-only DAG.
- **IMP-004**: Rollback removes the new Console integration path and restores
  the last verified Console distribution; it does not alter generated locks,
  historical artifacts, or control-plane contracts.

## Verification Gate

- **VRF-001**: Package-lock, license notices, dependency audit, source SHA,
  copied-file ledger, and `git diff --check` are recorded.
- **VRF-002**: Tests prove product pages import Factory wrappers, the local
  connection copy is absent, and the source ledger rejects a missing notice or
  altered copied file.
- **VRF-003**: Browser acceptance proves the lifecycle, inspector, and
  read-only DAG are accessible and never expose raw briefs, credentials,
  arbitrary paths, URLs, or model output.
- **VRF-004**: A production Console render is reviewed before a guarded live
  model end-to-end run is permitted.

## References

- **REF-001**: `docs/adr/006-console-next-product-shell-and-local-proxy.md`
- **REF-002**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-003**: `docs/adr/008-read-only-factory-lineage-dag-with-react-flow.md`
- **REF-004**: `docs/superpowers/specs/2026-07-27-governed-factory-console-design.md`
- **REF-005**: https://github.com/primer/react
- **REF-006**: https://github.com/temporalio/ui
- **REF-007**: https://github.com/xyflow/xyflow
