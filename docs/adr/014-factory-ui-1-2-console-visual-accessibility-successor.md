---
title: "ADR-014: Factory UI 1.2 Console Visual Accessibility Successor"
status: "Accepted"
date: "2026-07-28"
authors: "Tech Lead"
tags: ["architecture", "ui", "console", "accessibility", "compatibility"]
supersedes: ""
superseded_by: ""
---

# ADR-014: Factory UI 1.2 Console Visual Accessibility Successor

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Founder-delegated Controller acceptance authorizes the bounded implementation
ledger for migration of the controlled Console from
`factory-ui@1.1.0` to a new immutable `factory-ui@1.2.0`. It is not an
approval to change generated applications, their component packages, or their
Registry selection.

## Context

- **CTX-001**: ADR-013 and `factory-ui-kit/v1.1` deliberately separated the
  controlled Console from the frozen generated-application UI distribution.
  The Console now verifies against `factory-ui@1.1.0`; all generated
  `ui.*@2.1.0` locks and canonical sidecars remain tied to `factory-ui@1.0.0`.
- **CTX-002**: The latest read-only visual/accessibility audit identifies a
  second, bounded Console concern: the current visual result lacks an explicit
  reduced-motion policy, has unproven computed-style parity in light and dark
  modes, and leaves Lineage difficult to use at 390 px and 560 px viewports.
- **CTX-003**: CUI-01 intentionally changed Build evidence from a persistent
  panel to a closed, count-first right sheet. `apps/console-next/app/globals.css`
  still contains obsolete `.build-evidence-peek` rules from the superseded
  presentation, which increases drift risk and obscures the active visual
  system.
- **CTX-004**: The Console icon rail currently renders disabled Settings and
  Help controls. In an operational console, a disabled action without an
  available recovery path reads as a broken affordance; it should not be
  presented as navigation.
- **CTX-005**: Secondary evidence and copy actions currently expose verbose
  labels in constrained surfaces. Their information architecture needs compact,
  icon-first, labelled controls that retain an accessible name and do not hide
  audit evidence.
- **CTX-006**: Existing approved topology and dependencies remain sufficient:
  Next.js `15.5.21`, React and React DOM `19.2.7`, Radix UI `1.4.3`,
  `@xyflow/react` `12.11.2`, `lucide-react` `0.474.0`, and the local Factory UI
  Kit. No new framework, third-party source, package, build tool, runtime,
  API, data model, component slot, Registry rule, Composer rule, or deployment
  topology is required.

## Decision

- **DEC-001**: Recommend creating immutable `factory-ui@1.2.0` under
  `packages/ui-kit/factory-ui/1.2.0/`, with a full manifest, exact inventory,
  digests, fixtures, tests, SPDX/license evidence, and a complete byte-for-byte
  controlled Console distribution. The v1 manifest schema remains unchanged;
  the asset identity advances from `1.1.0` to `1.2.0`.
- **DEC-002**: Keep the Console visual system light by default and preserve
  its currently supported dark mode. `1.2.0` must define a token-based,
  computed-style verification matrix for both themes at desktop width. It must
  test foreground/background contrast, focus visibility, surface/border
  visibility, status-state distinction, and absence of unintentional
  `color-scheme`/token fallback. A screenshot alone is not acceptance evidence.
- **DEC-003**: Add an explicit `prefers-reduced-motion: reduce` policy to the
  Console-owned 1.2 assets and Console CSS. It must suppress non-essential
  transform, transition, animation, smooth-scrolling, and canvas-fit movement
  while retaining instantaneous state, focus, and modal feedback. This is a
  compatibility-preserving presentation policy, not a generated-app change.
- **DEC-004**: Keep the CUI-01 overlay matrix unchanged: Products opens from
  the left; Command and Stop are centered modal dialogs; Evidence opens from
  the right; and Product Lineage is an explicit modal, clear-overlay floating
  work window. The 1.1 Sheet semantic defaults remain exactly
  `modal ?? side !== 'floating'`; no new default-modal behavior is introduced.
- **DEC-005**: Define Lineage responsive usability as a constrained product
  requirement rather than an incidental CSS outcome. At viewport widths 390 px
  and 560 px, the open modal must stay wholly inside the viewport, retain a
  reachable close control and at least one usable graph navigation path,
  avoid horizontal document overflow, preserve keyboard focus containment and
  opener restoration, and keep graph controls from covering the selected-node
  context. At desktop width, the floating panel must remain ordered below the
  Console chrome and must not obscure the lifecycle rail's primary action.
- **DEC-006**: Remove dead Console presentation rules only after source and
  browser regressions prove they have no active owner. This explicitly includes
  stale `.build-evidence-peek` rules left by the closed/count-first Evidence
  migration. Do not remove evidence behavior, artifact downloads, diagnostics,
  or any selector still used by the compact evidence trigger/sheet.
- **DEC-007**: Replace eligible secondary textual copy/evidence affordances
  with compact icon-first actions only when each has a visible contextual label
  or tooltip, an `aria-label`, a keyboard target, focus styling, and a stable
  test selector. Destructive or primary lifecycle actions retain clear text;
  concise action labels are preferred over icon-only ambiguity where the
  meaning is not universally recognizable.
- **DEC-008**: Omit disabled icon-rail actions from the rendered navigation
  until their underlying product capability exists. This applies to currently
  disabled Settings and Help entries; it does not authorize implementing
  settings/help, changing command availability, or hiding disabled actions in
  a form where disabled state is an explicit safety explanation.
- **DEC-009**: Preserve `factory-ui@1.0.0` and every generated
  `ui.*@2.1.0` asset, lock, canonical sidecar, manifest, output, replay, and
  Registry selection rule byte-for-byte. They must never import or declare
  `factory-ui@1.2.0`. `factory-ui@1.1.0` remains the verified Console rollback
  identity.

## Compatibility

| Consumer | Canonical identity after migration | Compatibility rule |
| --- | --- | --- |
| Controlled Console | `factory-ui@1.2.0` | Exact verified complete distribution copy only |
| Console rollback | `factory-ui@1.1.0` | Existing verified copy and behavior remain selectable |
| Existing generated output | Existing exact locks | No substitution, rehash, or visual migration |
| `ui.*@2.1.0` Golden evidence | `factory-ui@1.0.0` | Remains immutable and independently verifiable |
| Future generated UI successor | Not selected by this ADR | Needs its own versioned suite, lifecycle evidence, and promotion |

- **COM-001**: The `FactorySheet` API and its `effectiveModal` compatibility
  rule remain unchanged from 1.1.0. `1.2.0` is visual/accessibility and
  Console-interaction refinement, not a public primitive API expansion.
- **COM-002**: Existing Console content and lifecycle API requests retain the
  same semantics. Stable accessible names may become shorter but must stay
  discoverable by visible label, tooltip, or screen-reader label; test updates
  must assert the product meaning rather than old presentation text.
- **COM-003**: Reduced-motion users receive the same state transitions and
  results without decorative motion. The change must not make keyboard focus,
  Lineage pan/zoom controls, an error state, a running state, or a destructive
  confirmation visually ambiguous.

## Migration and Rollback

- **MIG-001**: After acceptance, PM creates an integration-owned ledger and
  freezes a `factory-ui-kit/v1.2` contract. The ledger names the canonical
  asset root, Console distribution paths, deletion candidates, visual test
  fixtures, expected viewport/theme matrix, and rollback owner.
- **MIG-002**: The integration writer clones `1.1.0` into the new `1.2.0`
  canonical root, applies only the accepted visual/accessibility changes,
  updates the exact asset version and marker, regenerates the manifest digest
  inventory, and then materializes the complete controlled Console copy from
  that root.
- **MIG-003**: Add focused source-contract tests before removal of dead CSS;
  prove that no remaining Console source references deleted selectors and that
  the current Evidence trigger and sheet still expose bounded artifacts and
  diagnostics on demand.
- **MIG-004**: Add browser evidence for desktop light and dark computed
  styles, reduced-motion behavior, and Lineage at 390 px and 560 px. The test
  harness must use an isolated owned Next output directory and must not stop a
  founder process or mutate generated output.
- **MIG-005**: Update the Console copy verifier to bind explicitly to 1.2.0
  while retaining explicit verifiers/proofs for Console 1.1 rollback and
  generated 1.0 assets. Reject an absent, altered, or mixed-version Console
  distribution.
- **RBK-001**: Roll back the Console only by selecting a verified complete
  `factory-ui@1.1.0` distribution and verifier identity. Preserve 1.2.0 as
  immutable evidence; do not relabel, overwrite, or partially copy it.
- **RBK-002**: If a visual/accessibility gate fails, revert the controlled
  Console distribution to verified 1.1, then correct the 1.2 candidate in its
  own canonical directory. Never fall back to `1.0.0` by changing generated
  locks or replay evidence.
- **ABT-001**: Abort implementation on a mutation of 1.0.0, a generated 2.1
  reference to 1.1/1.2, missing complete-copy verification, dark/light token
  ambiguity, reduced-motion animation that continues non-essential movement,
  Lineage viewport clipping/focus escape at 390/560 px, out-of-slot write, or
  an unresolved P0/P1 accessibility/security finding.

## Consequences

### Positive

- **POS-001**: The Console has an explicit, testable visual accessibility
  policy rather than an unverified collection of transitions and theme styles.
- **POS-002**: Lineage becomes usable at narrow widths without weakening its
  modal focus boundary or converting it into an unrelated right-side drawer.
- **POS-003**: Removing superseded CSS and unavailable rail controls reduces
  visual noise and false affordances while retaining evidence integrity.
- **POS-004**: The three asset identities make current Console behavior,
  Console rollback, and generated-app replay truthful and independently
  verifiable.

### Negative

- **NEG-001**: The repository retains a third immutable Factory UI asset and
  corresponding verification paths until a later lifecycle decision retires an
  old Console-only identity.
- **NEG-002**: Viewport/theme/reduced-motion coverage adds browser-test time
  and makes visual regressions more deliberately governed.
- **NEG-003**: Compact secondary actions require careful accessible-label and
  contextual-tooltip reviews; icon substitution is not a license to remove
  meaning.

## Alternatives Considered

### Patch the controlled Console without a new canonical asset

- **ALT-001**: Change Console CSS/TSX in place and accept its local digest.
- **ALT-002**: **Rejection Reason**: It repeats the 1.1 drift failure mode and
  violates ADR-007's verified dual-distribution boundary.

### Change the frozen 1.0 generated-app asset at the same time

- **ALT-003**: Apply reduced motion, compact controls, and Lineage work to the
  v1.0 canonical asset and current generated packages.
- **ALT-004**: **Rejection Reason**: Generated UI has a different product
  surface and immutable `ui.*@2.1.0` evidence. It would create a Registry,
  Composer, package-lifecycle, and generated-product migration outside this
  bounded Console decision.

### Add a new UI framework or copy an external product console

- **ALT-005**: Introduce a new component library, external source snapshot, or
  runtime template to solve the visual issues.
- **ALT-006**: **Rejection Reason**: The accepted Console already has the
  required pinned primitives and no dependency gap. A new source would trigger
  supply-chain/license and technology-governance work without addressing the
  identified scoped defects more directly.

### Keep disabled rail actions as future-product placeholders

- **ALT-007**: Leave Settings and Help visible but disabled.
- **ALT-008**: **Rejection Reason**: They present unavailable navigation as a
  broken affordance and consume scarce rail attention. Discoverable future
  capabilities belong in a documented roadmap, not inert product controls.

### Use screenshot comparison as the only visual proof

- **ALT-009**: Assert a single desktop screenshot and manually inspect it.
- **ALT-010**: **Rejection Reason**: It cannot prove reduced-motion behavior,
  token/computed-style parity, keyboard containment, or narrow-width Lineage
  usability.

## Verification Gate

- **VRF-001**: `factory-ui@1.2.0` has a complete manifest/inventory and the
  Console distribution verifies byte-for-byte only against it. The verifier
  rejects a tampered/missing/mixed 1.1/1.2 file. Verified 1.1 rollback and
  generated 1.0 verification remain covered.
- **VRF-002**: Static/source tests prove that removed dead selectors have no
  active source owner; disabled Settings/Help rail actions are not rendered;
  compact secondary action affordances have stable accessible names; and the
  closed/count-first Evidence trigger still leads to bounded artifacts and
  diagnostics.
- **VRF-003**: Browser accessibility tests emulate
  `prefers-reduced-motion: reduce` and prove non-essential motion is disabled
  while focus rings, state changes, Command/Stop/Products/Evidence behavior,
  and Lineage keyboard containment remain available.
- **VRF-004**: Browser tests at 390 px and 560 px prove Lineage is fully
  inside the viewport, has no page-level horizontal overflow, permits usable
  graph navigation, keeps Close reachable, traps focus, and restores focus to
  `open-lineage-trigger` after Escape and Close. Desktop evidence proves the
  floating placement stays below Console chrome without covering the lifecycle
  route primary action.
- **VRF-005**: Browser computed-style assertions cover the declared desktop
  light and dark themes: Canvas/paper/ink/focus/border/status values are
  resolved from the intended token family and meet the specified contrast and
  perceptual distinction threshold recorded in the v1.2 contract.
- **VRF-006**: Required fresh evidence includes:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit -v
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node --check apps/web/app.js
  git diff --check
  ```

- **VRF-007**: Task review, QA, independent release review, and PM
  reconciliation report no unresolved P0/P1. Acceptance of this ADR authorizes
  only a bounded implementation ledger; it does not promote a generated
  package, alter a Golden component implementation, or change existing
  application locks.

## Founder Decisions Required

- **FDR-001**: Accept or reject a new Console-only immutable
  `factory-ui@1.2.0` successor under the exact scope above.
- **FDR-002**: Confirm the stated visual quality gate: desktop computed-style
  evidence for both themes, reduced-motion support, and Lineage usable at 390
  px and 560 px are release criteria rather than optional polish.
- **FDR-003**: Confirm that v1.0 generated applications remain frozen and
  v1.1 is the only permitted Console rollback identity.
- **FDR-004**: Confirm that no new external dependency/source or generated UI
  migration is authorized in this slice.

## References

- **REF-001**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-002**: `docs/adr/010-light-default-shadcn-console-composition.md`
- **REF-003**: `docs/adr/012-generated-ui-v2-lifecycle-reconciliation.md`
- **REF-004**: `docs/adr/013-factory-ui-1-1-console-successor.md`
- **REF-005**: `docs/contracts/factory-ui-kit-v1.md`
- **REF-006**: `docs/contracts/factory-ui-kit-v1.1.md`
- **REF-007**: `docs/superpowers/ledgers/console-lifecycle-overlay-refinement.md`
- **REF-008**: `docs/superpowers/ledgers/factory-ui-kit-1-1-console-sheet-extension.md`
