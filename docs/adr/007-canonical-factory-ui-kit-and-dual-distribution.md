---
title: "ADR-007: Canonical Factory UI Kit and Dual Distribution"
status: "Accepted"
date: "2026-07-27"
authors: "Tech Lead; Founder-delegated Controller"
tags: ["architecture", "ui", "components", "composition"]
supersedes: ""
superseded_by: ""
---

# ADR-007: Canonical Factory UI Kit and Dual Distribution

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The founder-directed correction on 2026-07-27 accepts this architecture.
It supersedes the Console-only styling approach in ADR-006; ADR-006's local
proxy and credential boundary remain accepted and unchanged.

## Context

- **CTX-001**: The Console needs a consistent product UI, but a local CSS
  layer over copied primitive markup is not itself a reusable component asset.
- **CTX-002**: A future generated application must select real, versioned UI
  packages rather than imitate the Console with independently authored CSS.
- **CTX-003**: The repository already has frozen component, adapter, Registry,
  Composer, trust, and candidate-to-Golden contracts. A new UI source cannot
  bypass those contracts by becoming an implicit renderer fallback.
- **CTX-004**: The current `apps/console-next/components/ui` primitive copies
  are an ADR-005 preview closure. They remain historical source evidence but
  are not the canonical Factory UI Kit.

## Decision

- **DEC-001**: Create one repository-owned canonical asset at
  `packages/ui-kit/factory-ui/1.0.0/`. It contains design tokens, CSS,
  React primitive source, component examples, fixtures, tests, manifest, and
  an exact digest. Each primitive exposes stable semantic props and required
  `data-factory-ui` markers; styles are included in the asset, not inferred
  from an uninstalled utility framework.
- **DEC-002**: Materialize two verified distributions from that canonical
  asset only:

  1. `apps/console-next/components/factory-ui/` and its stylesheet are the
     **Console distribution**. A verifier proves every copied file and style
     asset maps to the canonical version/digest and rejects local drift.
  2. `packages/components/ui.* /2.0.0/` are the **generated-app candidate
     distribution**. Each package has a manifest, declarative adapter,
     fixture, tests, and trust sidecar pointing to the same canonical asset.
     They start as `candidate`, never as Golden, and cannot be selected by a
     composition plan until the Trusted Registry promotion gate passes.

- **DEC-003**: Component responsibilities are explicit: `ui.app-shell` owns
  layout, navigation, tokens, and primitives; `ui.login-page`,
  `ui.home-page`, `ui.profile-page`, `ui.system-settings-page`,
  `ui.approval-form`, `ui.my-requests`, and `ui.approval-queue` own only their
  declared content slots. The Composer remains the sole assembly authority.
- **DEC-004**: Console migration removes direct dependence on the old preview
  primitive imports. `apps/web` remains an operational rollback path; the
  old Console Next primitive closure is retained only for evidence until a
  later deprecation decision.
- **DEC-005**: The first visual acceptance is not a screenshot. The Console
  and a generated-app fixture must both render the same component markers,
  tokens, states, focus behavior, and responsive rules from matching
  canonical file digests.

## Consequences

### Positive

- **POS-001**: Console UX and generated-app UX share a governed, testable
  design-system source instead of merely resembling each other.
- **POS-002**: The Registry can reason about real UI assets with version,
  digest, inputs, outputs, fixtures, and verification evidence.
- **POS-003**: Candidate UI packages can evolve under the existing supply
  chain and promotion rules without contaminating current Golden plans.

### Negative

- **NEG-001**: Migration is larger than a CSS repair and must not be accepted
  until copy verification and two-surface evidence pass.
- **NEG-002**: The repository temporarily retains the old preview primitive
  closure and the new canonical asset to preserve historical evidence and
  rollback capability.
- **NEG-003**: Generated applications do not immediately receive the new UI;
  candidate-to-Golden promotion remains a separate Stage 2 gate.

## Alternatives Considered

### Keep Console-only CSS

- **ALT-001**: Continue styling `apps/console-next` independently.
- **ALT-002**: **Rejection Reason**: It creates two ungoverned UI systems and
  cannot prove that generated applications use the same component asset.

### Use the old preview primitive copies as generated components

- **ALT-003**: Promote the ADR-005 Console primitive closure directly.
- **ALT-004**: **Rejection Reason**: It has no Factory UI Kit manifest,
  semantic contract, generated-app fixture, candidate lifecycle, or per-
  component verification evidence.

### Make generated applications import the Console source directory

- **ALT-005**: Let generated output import from `apps/console-next`.
- **ALT-006**: **Rejection Reason**: Generated products must be independently
  materialized, version-locked artifacts and cannot depend on Console source.

## Migration and Rollback

- **MIG-001**: Freeze `factory-ui-kit/v1` before any Console or candidate
  package writer starts. Integration owns the contract and copy verifier.
- **MIG-002**: Implement and test the canonical asset, then materialize the
  Console distribution and migrate the Console to it.
- **MIG-003**: Materialize candidate `ui.*@2.0.0` packages only after the
  canonical asset and Console copy verifier are green. They remain unselectable
  candidates until Stage 2 promotion.
- **RBK-001**: If migration fails, restore the previous Console Next source or
  start `apps/web`; no generated application lock changes and no candidate is
  promoted or selected.
- **ABT-001**: Abort on copy/digest mismatch, a Console-only component change,
  a candidate selected as Golden, an adapter slot violation, or an unresolved
  P0/P1 accessibility/security finding.

## Verification Gate

- **VRF-001**: Canonical asset tests cover primitive behavior, tokens, focus,
  disabled states, responsive layout, and accessible names.
- **VRF-002**: Copy verification fails on any changed Console or candidate
  file, missing manifest, missing stylesheet, or incorrect digest.
- **VRF-003**: Console and generated-app fixture browser tests assert the
  same `data-factory-ui` version marker and selected component markers.
- **VRF-004**: Registry/Composer tests reject candidate UI packages from new
  plans until valid Golden trust evidence is present.
- **VRF-005**: The real-model requirement-to-product E2E resumes only after
  the new Console path passes its fixture and visual acceptance gates.

## References

- **REF-001**: `docs/adr/003-first-party-component-packages-registry-and-declarative-composer.md`
- **REF-002**: `docs/adr/004-trusted-registry-and-local-supply-chain.md`
- **REF-003**: `docs/adr/005-quarantined-third-party-source-intake-and-shadcn-ui-v2.md`
- **REF-004**: `docs/adr/006-console-next-product-shell-and-local-proxy.md`
- **REF-005**: `docs/contracts/factory-ui-kit-v1.md`
