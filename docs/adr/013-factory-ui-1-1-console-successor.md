---
title: "ADR-013: Factory UI 1.1 Console Successor"
status: "Accepted"
date: "2026-07-28"
authors: "Tech Lead"
tags: ["architecture", "ui", "components", "console", "compatibility"]
supersedes: ""
superseded_by: ""
---

# ADR-013: Factory UI 1.1 Console Successor

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Founder-delegated Controller accepted this decision on 2026-07-28. It
authorizes only the bounded Console successor described below; it does not
authorize a generated-package change or a Registry promotion.

## Context

- **CTX-001**: `factory-ui@1.0.0` is a frozen canonical asset under
  `docs/contracts/factory-ui-kit-v1.md`. Its controlled Console copy must be
  byte-for-byte digest-equivalent to the canonical source.
- **CTX-002**: The controlled Console needs `FactorySheet` behavior that the
  frozen `1.0.0` source does not provide: explicit modal control,
  `overlay: "none"`, and deterministic close-focus restoration.
- **CTX-003**: The current Console source has those changes and consequently
  fails closed with `console_copy_digest_mismatch`. Mutating `1.0.0` would
  rewrite the canonical identity used as evidence by existing generated
  `ui.*@2.1.0` packages.
- **CTX-004**: ADR-012 preserves the immutable `ui.*@2.1.0` package family,
  its component locks, generated output, and canonical-ui sidecars as
  historical evidence. They identify `factory-ui@1.0.0` and must not be
  silently upgraded.
- **CTX-005**: The CUI-01 floating Lineage surface must be visually floating
  while retaining a modal keyboard boundary. This is Console behavior, not an
  authorization to alter generated application templates or component slots.

## Decision

- **DEC-001**: Create a new immutable canonical asset at
  `packages/ui-kit/factory-ui/1.1.0/`. It has its own manifest, file
  inventory, digests, fixtures, tests, and verification evidence. The
  `factory-ui-kit/v1` manifest schema may remain unchanged; this decision
  versions the asset identity, not the component/Composer contract.
- **DEC-002**: Materialize the controlled Console distribution only from
  `factory-ui@1.1.0` after an integration-owned migration. The verifier must
  take or record the expected canonical identity explicitly; it must not
  assume a `1.0.0` root or infer an asset version from a mutable Console file.
- **DEC-003**: `FactorySheet` remains backward-compatible in `1.1.0`. Its
  effective modality is exactly:

  ```ts
  const effectiveModal = modal ?? side !== 'floating';
  ```

  The optional `modal` prop, `overlay: 'none'`, and close-focus handling are
  additive. Existing callers that use `side="floating"` without a `modal`
  prop retain the `1.0.0` non-modal default. Only the Console Product Lineage
  caller passes `modal` explicitly, together with `overlay="clear"`, to opt
  into a keyboard-contained floating window. If an implementation instead
  changes the default to `modal: true`, it is a breaking change and requires a
  separate `factory-ui@2.0.0` decision.
- **DEC-004**: Preserve `packages/ui-kit/factory-ui/1.0.0/` unchanged.
  Existing generated `ui.*@2.1.0` locks, `canonical-ui.json` sidecars,
  inventories, CSS/token digests, Registry lifecycle evidence, generated
  output, and replay behavior remain tied to exact `factory-ui@1.0.0`.
- **DEC-005**: This ADR does not create a generated-app UI successor. A future
  generated package generation may adopt `factory-ui@1.1.0` only through a
  separately versioned package suite, its own immutable locks and evidence,
  and the accepted Registry promotion process.
- **DEC-006**: No component slot, adapter authority, Composer ownership,
  runtime dependency, API/data contract, Registry selection policy, or
  generated-product topology changes in this migration.

## Compatibility

| Consumer | Canonical identity after migration | Rule |
| --- | --- | --- |
| Controlled Console | `factory-ui@1.1.0` | Exact verified distribution copy |
| Existing generated output | Existing exact locks | No substitution or upgrade |
| `ui.*@2.1.0` Golden evidence | `factory-ui@1.0.0` | Remains unchanged and verifiable |
| Future generated UI successor | Not selected by this ADR | Requires new package/lifecycle evidence |

- **COM-001**: The `1.1.0` primitive inventory and stable semantic props are
  a compatible extension of `1.0.0`; all previous default behavior is
  retained by `effectiveModal`.
- **COM-002**: `data-factory-ui` identifies the exact asset version on its
  rendered roots. Tests must therefore assert the correct surface-specific
  identity rather than falsely require the Console and generated UI to report
  the same marker after this migration.
- **COM-003**: A Console `1.1.0` copy may not be used as a source fallback for
  generated output. Generated applications never import the Console.

## Migration and Rollback

- **MIG-001**: PM creates an integration-owned ledger and freezes the
  `factory-ui@1.1.0` asset contract before a writer starts. The ledger lists
  the canonical root, Console copy paths, verifier changes, evidence, and
  residual-risk ownership.
- **MIG-002**: Integration copies the full `1.0.0` asset to the new `1.1.0`
  root, applies only the additive sheet semantics, increments the asset
  version and rendered marker, and regenerates its inventory and digest.
- **MIG-003**: Integration materializes the Console copy from `1.1.0` and
  updates the verifier/tests to validate both identities explicitly: Console
  against `1.1.0`; generated `ui.*@2.1.0` evidence against `1.0.0`.
- **MIG-004**: Update the Lineage Console call site to pass `modal` explicitly
  and `overlay="clear"`. Other existing sheet callers retain implicit
  compatibility defaults unless an independently reviewed requirement changes
  them.
- **MIG-005**: Do not edit `1.0.0`, `ui.*@2.1.0`, prior locks, trust sidecars,
  generated output, or historical run evidence.
- **RBK-001**: Before a future generated-ui adoption, rollback restores the
  exact verified `1.0.0` Console copy and its verifier mapping. Retain the
  `1.1.0` asset as immutable evidence; do not relabel or overwrite it.
- **RBK-002**: A failure never substitutes `1.1.0` for an existing generated
  `1.0.0` lock or changes a replayed application.
- **ABT-001**: Abort on a `1.0.0` mutation, digest/inventory mismatch,
  generated `2.1.0` reference to `1.1.0`, default-modal behavior change,
  out-of-slot write, or unresolved P0/P1 security or accessibility finding.

## Consequences

### Positive

- **POS-001**: The Console gains the required overlay and focus semantics
  without making historical generated-product evidence dishonest.
- **POS-002**: Verifiers make asset identity explicit and fail closed instead
  of treating a local Console edit as an implicit canonical upgrade.
- **POS-003**: A future generated UI adoption can be deliberate, versioned,
  and independently promoted.

### Negative

- **NEG-001**: The repository carries two immutable Factory UI assets and
  their verification paths until a later retirement decision.
- **NEG-002**: The Console and generated applications intentionally do not
  claim exact visual/behavioral parity after the Console moves to `1.1.0`.
- **NEG-003**: Maintaining backward-compatible modal defaults constrains
  future generic floating-sheet behavior; a breaking default needs a major
  successor decision.

## Alternatives Considered

### Mutate the frozen `1.0.0` canonical asset

- **ALT-001**: Copy the changed Console sheet source into `1.0.0` and rehash
  its manifest.
- **ALT-002**: **Rejection Reason**: It changes the canonical identity
  referenced by immutable generated `ui.*@2.1.0` evidence and makes prior
  locks/replay claims inaccurate.

### Keep the Console source as an unverified local exception

- **ALT-003**: Suppress or remove the Console copy verifier.
- **ALT-004**: **Rejection Reason**: It violates ADR-007's dual-distribution
  requirement and permits unaudited drift.

### Make all floating sheets modal by default in `1.1.0`

- **ALT-005**: Set the default `modal` value to `true`.
- **ALT-006**: **Rejection Reason**: Existing `side="floating"` callers
  change behavior. That is a major-version semantic change, not a `1.1.0`
  extension.

### Upgrade generated packages together with the Console

- **ALT-007**: Rewrite `ui.*@2.1.0` sidecars or create a new generated
  package suite in this work item.
- **ALT-008**: **Rejection Reason**: It expands the bounded Console recovery
  into Registry, Composer, and generated-product migration work without the
  required separate lifecycle and promotion evidence.

## Verification Gate

- **VRF-001**: `factory-ui@1.0.0` continues to verify every existing
  `ui.*@2.1.0` package and its exact canonical CSS/token evidence unchanged.
- **VRF-002**: Console verification passes only when every controlled file
  equals the `1.1.0` manifest inventory and fails on a changed file, a mixed
  `1.0.0`/`1.1.0` copy, an absent manifest, or an inferred/wrong identity.
- **VRF-003**: Focused component tests prove `modal ?? side !== 'floating'`:
  legacy floating calls remain non-modal, while the explicit Lineage call is
  modal, clear-overlay, focus-contained, and restores its opener focus on
  Escape and Close.
- **VRF-004**: Console workflow/accessibility browser tests prove the full
  overlay matrix: Products left, Command and Stop centered, Evidence right,
  and Lineage floating inside the viewport with no background Tab access.
- **VRF-005**: Required fresh evidence includes:

  ```powershell
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node --check apps/web/app.js
  git diff --check
  ```

- **VRF-006**: Task review, QA, release review, and PM reconciliation find no
  unresolved P0/P1. Acceptance of this ADR authorizes a bounded migration
  ledger only; it does not itself promote a generated package or change an
  existing application lock.

## References

- **REF-001**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-002**: `docs/adr/010-light-default-shadcn-console-composition.md`
- **REF-003**: `docs/adr/012-generated-ui-v2-lifecycle-reconciliation.md`
- **REF-004**: `docs/contracts/factory-ui-kit-v1.md`
- **REF-005**: `docs/superpowers/ledgers/console-lifecycle-overlay-refinement.md`
- **REF-006**: `tools/factory_ui_kit.py`
