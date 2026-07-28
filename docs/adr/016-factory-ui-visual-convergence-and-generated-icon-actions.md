---
title: "ADR-016: Factory UI Visual Convergence and Generated Icon Actions"
status: "Accepted"
date: "2026-07-28"
authors: "Tech Lead"
tags: ["architecture", "console", "generated-ui", "accessibility", "supply-chain"]
supersedes: ""
superseded_by: ""
---

# ADR-016: Factory UI Visual Convergence and Generated Icon Actions

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Accepted by the Founder-delegated Controller on 2026-07-28. This authorizes
implementation only through the separate, serialized Console and generated-UI
task ledgers described here. It does not authorize package promotion,
component-plan selection, mutation of historical identities, or a generated
Lineage/provenance feature.

## Context

- **CTX-001**: The controlled Console and generated approval applications now
  share a visual direction: sparse light-default control surfaces, retained
  dark mode, compact icon-led secondary actions, governed evidence disclosure,
  and a clear primary decision. They do not yet share the same immutable asset
  identity or release cadence.
- **CTX-002**: The Console's current verified distribution is
  `factory-ui@1.2.0` under ADR-014. The founder-approved Console direction
  requires a compact bottom-right Lineage window, a usable intermediate
  viewport, and a keyboard-correct command palette. Those are material UI-kit
  and accessibility changes and must not mutate `1.2.0`.
- **CTX-003**: `factory-ui@1.3.0` already exists as the immutable canonical
  generated-product asset created by ADR-015. It is the exact dependency of
  the candidate `ui.*@2.2.0` family. Reusing the same key/version for a
  Console successor would overwrite an existing identity, invalidate replay,
  and violate the Registry's immutable package rule.
- **CTX-004**: The generated approval product needs a subsequent coherent
  candidate family that converges on the approved workspace direction: a
  one-column decision workspace, a centered focus-trapped confirmation,
  a truthful audit marker, and compact top utility/rail actions. This is a
  generated UI asset and package-family migration, not a Console CSS copy.
- **CTX-005**: `lucide-react@0.474.0` is already an exact direct dependency of
  the Console's checked-in closure. Its package metadata and bundled license
  identify the license as ISC. The package is tree-shakeable and provides the
  required neutral UI glyphs without copied product logos, hand-drawn SVGs, or
  runtime source retrieval.
- **CTX-006**: Introducing icons into generated output changes its direct
  dependency closure and canonical asset digest. It therefore requires exact
  lock/integrity, source provenance, license notice, SBOM/closure evidence,
  and browser verification. A Console lockfile is evidence of an available
  candidate, not authorization for generated output to resolve the package at
  runtime or to reuse an unverified closure.
- **CTX-007**: A product Lineage/provenance graph inside generated applications
  would require new generated data, API, permissions, output slots, and
  privacy rules. No frozen generated API/data contract currently authorizes
  that surface.
- **CTX-008**: The existing Factory component, adapter, composition, API/data,
  Composer, Docker Compose, and model-safety contracts remain frozen. Visual
  work must not add arbitrary code, routes, URLs, paths, external network
  access, model-controlled primitive selection, or a new deployment topology.

## Decision

- **DEC-001**: Recommend a bounded **migrate** path with two separately
  immutable successor tracks after Founder acceptance:

  1. a Console-only `factory-ui-console@1.3.0` successor; and
  2. a generated canonical `factory-ui@1.4.0` successor with a coherent
     `ui.*@2.3.0` candidate family.

  `factory-ui-console` is a Console distribution identity, not an alias or
  replacement for canonical generated `factory-ui`. This namespace distinction
  is mandatory because canonical `factory-ui@1.3.0` already exists and remains
  immutable. The word “1.3” in the Console track denotes the successor to
  Console `1.2.0`; it must never create a second
  `factory-ui@1.3.0` Registry identity.
- **DEC-002**: Console `factory-ui-console@1.3.0` preserves the existing
  Console profile, local proxy boundary, Next.js 15/React 19 runtime, and
  current exact Console dependency closure. It must implement only:

  - a compact bottom-right floating Lineage window with a distinct maximize
    path for the full canvas;
  - an intermediate tablet viewport policy that keeps the Lineage window,
    controls, and close action usable from 701px through 900px; and
  - a true searchable command combobox whose active command is exposed through
    `aria-activedescendant` or an equally valid roving-focus implementation.

  Products remain a left sheet, Evidence remains a right context sheet, and
  destructive Stop remains a centered confirmation with initial focus on
  Cancel. Lineage may remain a clear-overlay modal window to preserve focus
  containment; it must not regress into a right sheet.
- **DEC-003**: Materialize canonical generated `factory-ui@1.4.0` as a new
  immutable asset with its own manifest, inventory, digest evidence, fixtures,
  package tests, and complete distribution proof. It supersedes neither
  generated `1.0.0` nor `1.3.0`; historical versions remain exact replay
  identities.
- **DEC-004**: Materialize one coherent generated candidate family at exact
  `2.3.0`:

  ```text
  ui.app-shell@2.3.0
  ui.login-page@2.3.0
  ui.home-page@2.3.0
  ui.profile-page@2.3.0
  ui.system-settings-page@2.3.0
  ui.approval-form@2.3.0
  ui.my-requests@2.3.0
  ui.approval-queue@2.3.0
  ```

  Every dependent package requires exact `ui.app-shell@2.3.0`; the shell
  requires exact canonical `factory-ui@1.4.0`. New plans reject mixed
  2.1/2.2/2.3 UI families. The family remains candidate-only until the existing
  ADR-004 promotion process accepts exact trust, digest, source, license, and
  verification evidence.
- **DEC-005**: Generated 2.3 applications use a one-column workspace for the
  active decision. Context becomes a compact top utility area and icon rail,
  with tooltips and accessible names. The visible interface uses
  `lucide-react@0.474.0` icons only for non-branded, secondary or status
  affordances. Text remains available for primary actions, semantic labels,
  error states, and keyboard/screen-reader access. Icons do not replace a
  required visible label where ambiguity would result.
- **DEC-006**: Generated approve/reject remains a governed two-step decision.
  The confirmation is a centered, focus-trapped modal with visible Cancel and
  Confirm actions; initial focus is Cancel. It retains the ADR-015 requirements
  for no request before confirmation, disabled pending controls, duplicate
  prevention, governed feedback, and focus return. No inline or side-sheet
  decision confirmation is permitted in 2.3.
- **DEC-007**: Generated 2.3 renders the audit marker only when immutable audit
  evidence is actually available for the current product/record state. The
  marker must not imply a completed audit, approval, persistence result, or
  privileged audit access when those facts are absent. It uses a labelled
  neutral/status presentation and cannot disclose raw audit payloads.
- **DEC-008**: `lucide-react` is pinned at exact `0.474.0` for both successor
  tracks. Its ISC license text and required attribution are retained in the
  third-party notice and generated dependency evidence. The implementation
  must record package name, exact version, resolved tarball/integrity, source
  URL, license, lockfile digest, SBOM/closure record, and approved icon import
  inventory. It must use static named imports only; dynamic icon-name lookup,
  runtime registry/network resolution, copied third-party logos, and arbitrary
  SVG injection are forbidden.
- **DEC-009**: Generated Lineage/provenance visualization is explicitly out of
  scope. This ADR does not introduce a generated graph, graph API, component
  dependency payload, artifact/evidence browser, route, permission, output
  slot, or Composer behavior. A separate proposed and accepted API/data and
  generated-output-contract ADR is required before that feature is planned.
- **DEC-010**: The Composer remains the sole assembly authority. The 2.3
  adapters only bind existing validated application/component inputs to
  existing declared slots. They cannot select packages, icon names, arbitrary
  code, URLs, paths, routes, topology, or model behavior. Any needed contract
  change stops this migration and returns ownership to integration.

## Proposed Profiles and Compatibility

| Aspect | Historical / current identity | Proposed successor identity |
| --- | --- | --- |
| Console UI distribution | `factory-ui@1.1.0`, `factory-ui@1.2.0` | `factory-ui-console@1.3.0`, Console-only |
| Generated canonical asset | `factory-ui@1.0.0`, `factory-ui@1.3.0` | `factory-ui@1.4.0`, generated-only candidate |
| Generated UI family | Exact `ui.*@2.1.0`, candidate `ui.*@2.2.0` | Exact coherent `ui.*@2.3.0` candidate |
| Icon dependency | Console closure contains `lucide-react@0.474.0` | Both successors pin the exact same version with separate closure evidence |
| Runtime profile | Next.js 15/React 19, existing Factory API/data contracts | Unchanged |
| Component/adapter/output slots | Frozen current contracts | Unchanged |
| New-plan eligibility | Existing trust rules | Neither successor selectable before its independent promotion gate |
| Historical replay | Exact existing locks | Preserved; no rewrite or substitution |

- **COM-001**: A Console-only distribution must never satisfy a canonical
  generated `factory-ui` dependency, and a generated asset must never be
  imported as a Console distribution by implication.
- **COM-002**: Existing generated 2.1 and 2.2 locks remain exact replay only.
  No migration mutates their manifests, inventories, trust records, component
  locks, evidence, or generated output in place.
- **COM-003**: Generated leave and expense products may differ only through
  approved application inputs and declared extensions. They must use the same
  exact 2.3 package family and `factory-ui@1.4.0` identity.

## Supply-Chain and License Boundary

- **SUP-001**: `lucide-react@0.474.0` is licensed ISC. The successor packages
  preserve its license text and package attribution alongside the existing
  third-party records. The contained Feather-origin attribution is retained as
  stated in the upstream license.
- **SUP-002**: The existing Console lock is read-only evidence. Generated 1.4
  must receive its own exact dependency closure and verifier evidence; it may
  not copy, modify, or silently inherit the Console lockfile.
- **SUP-003**: No runtime may download icons, query GitHub/npm/shadcn, resolve
  a remote registry, or accept an icon identifier from a brief, model result,
  or unvalidated component input.
- **SUP-004**: The dependency review must prove that only named icon imports
  required by approved templates are present and tree-shakeable. An icon
  library does not authorize external branding, unreviewed illustrations, or
  an arbitrary SVG render surface.

## Migration and Rollback

- **MIG-001**: After Founder acceptance, PM creates separate serialized
  ledgers: one frontend-owned Console ledger for `factory-ui-console@1.3.0`,
  and one integration-owned generated-ui ledger for canonical 1.4 and the
  coherent 2.3 family. The ledgers name their immutable identity, contract
  owner/status, permitted paths, dependency evidence, and rollback owner.
- **MIG-002**: The Console writer creates a complete Console-only 1.3 asset
  from verified 1.2 source, records a fresh inventory/digest and exact
  distribution verification, then implements the compact Lineage geometry,
  701–900px behavior, and command combobox semantics. The 1.1/1.2 assets and
  all generated assets remain read-only.
- **MIG-003**: The integration writer creates canonical 1.4 and the complete
  2.3 package family from the frozen generated behavior contract. It imports
  only approved named Lucide icons through the declared dependency, records
  the exact closure/license evidence, and implements the one-column workspace,
  compact utility/rail, truthful audit marker, and centered confirmation.
- **MIG-004**: QA proves Console and generated application behavior separately.
  It verifies Console overlay direction/focus/layout and generated signed-out
  isolation, role routing, decision safety, feedback, audit marker truth,
  responsive themes, package identity, Composer containment, API smoke, and
  Docker cleanup.
- **MIG-005**: PM may request the existing candidate-to-Golden promotion gate
  only after all task review, QA, independent release review, and required
  evidence are green. ADR acceptance alone does not permit selection by a new
  plan or Golden promotion.
- **RBK-001**: Before promotion, stop candidate selection and retain Console
  1.2 plus generated 2.1/2.2 resolution/replay. Preserve candidate source,
  inventories, closures, licenses, and evidence; do not delete, relabel, or
  overwrite them.
- **RBK-002**: After a promotion decision, revoke the affected successor trust
  mapping to stop future selection if a gate fails. Preserve exact locks and
  evidence; never silently downgrade or substitute a historical package.
- **ABT-001**: Abort on an identity/version collision, absent or altered
  supply-chain evidence, unlicensed/incorrect icon source, runtime icon
  resolution, generated Lineage scope expansion, mixed UI family, out-of-slot
  adapter write, unaudited audit marker, confirmation safety regression,
  viewport clipping, or unresolved P0/P1 security/privacy/accessibility issue.

## Consequences

### Positive

- **POS-001**: Console and generated products converge on the approved visual
  language without lying about their different immutable identities.
- **POS-002**: Compact Lineage and command interactions receive explicit
  responsive and accessibility criteria instead of being treated as cosmetic
  follow-up work.
- **POS-003**: Generated 2.3 introduces compact, accessible icon actions
  without copying ungoverned visuals or exposing a dynamic SVG/code surface.
- **POS-004**: Separate versioned candidates preserve historical replay and
  make a failed visual migration reversible without an application-data
  migration.

### Negative

- **NEG-001**: The repository must retain another Console distribution,
  another generated canonical asset, coherent package evidence, and separate
  verifiers until explicit lifecycle retirement decisions are made.
- **NEG-002**: The `factory-ui-console` namespace is more precise than the
  informal “Console factory-ui 1.3” label, but introduces a Registry/catalog
  naming distinction that must be understood by the Composer and reviewers.
- **NEG-003**: Lucide adds generated dependency-closure and license-review
  work even though it is already locked for Console use.
- **NEG-004**: Generated provenance visualization remains deferred; users do
  not receive graph-like inspectability inside generated applications in this
  slice.

## Alternatives Considered

### Reuse canonical `factory-ui@1.3.0` for the Console successor

- **ALT-001**: Add Console changes to the existing generated 1.3 asset or
  create another asset with the same Registry key/version.
- **ALT-002**: **Rejection Reason**: Both options violate immutable identity,
  invalidate generated 2.2 evidence, and make replay ambiguous.

### Patch Console 1.2 and generated 1.3 in place

- **ALT-003**: Apply visual changes directly to current assets and refresh
  local digests.
- **ALT-004**: **Rejection Reason**: A new digest cannot make a mutated
  historical asset truthful; existing plans and evidence require exact source.

### Reuse Console CSS as generated 1.4 source without a new canonical asset

- **ALT-005**: Copy the live Console distribution into generated components.
- **ALT-006**: **Rejection Reason**: Console and generated products have
  distinct role, session, package, and API boundaries. It also bypasses the
  generated asset, closure, and trust evidence required for a candidate.

### Add a new icon library or use copied branded SVGs

- **ALT-007**: Introduce another icon dependency, copy logos from product
  references, or accept arbitrary SVG markup.
- **ALT-008**: **Rejection Reason**: `lucide-react@0.474.0` is already pinned,
  licensed, and suitable for neutral interface glyphs. Alternatives expand
  supply-chain and brand-license risk without a demonstrated capability gap.

### Add generated Lineage in this visual slice

- **ALT-009**: Render the Factory component graph or provenance evidence in
  every generated application.
- **ALT-010**: **Rejection Reason**: It needs a new generated data/API/output
  contract, permission model, evidence privacy policy, and Composer work that
  this ADR explicitly does not authorize.

## Verification Gate

- **VRF-001**: The Console successor has a complete manifest/inventory and
  byte-for-byte distribution verification under the distinct
  `factory-ui-console@1.3.0` identity. The verifier rejects a missing, altered,
  or mixed Console 1.1/1.2/1.3 distribution and rejects a collision with
  canonical generated `factory-ui@1.3.0`.
- **VRF-002**: Console browser evidence proves left Products, right Evidence,
  centered Command/Stop, compact bottom-right Lineage, fullscreen Lineage on
  demand, focus restoration, clear-overlay modal containment, and no
  horizontal overflow at 390px, 560px, 768px, 900px, and desktop. The command
  palette proves focused search, filtering, Arrow key active-descendant or
  roving-focus behavior, Enter activation, and accessible command state.
- **VRF-003**: Generated 1.4 and every 2.3 package have fresh manifests,
  inventories/digests, adapter/fixture/package tests, canonical sidecars,
  exact family requirements, and candidate trust records. Composer tests
  reject missing, altered, mixed, unsigned, stale, revoked, incompatible, or
  non-Golden candidates.
- **VRF-004**: Generated browser evidence proves the one-column workspace,
  compact labelled utility/rail actions, light default/dark retained, 390px
  and desktop no-overflow behavior, signed-out isolation, role-route filtering,
  centered focus-trapped confirm-before-request, pending duplicate prevention,
  feedback/focus restoration, and a truthful non-leaking audit marker.
- **VRF-005**: Supply-chain evidence records the exact
  `lucide-react@0.474.0` version, integrity/resolved source, ISC license text,
  third-party notice, package/import inventory, generated closure digest, and
  SBOM. Static tests reject dynamic imports, remote resolution, arbitrary SVG,
  brand/logo imports, and model-derived icon selection.
- **VRF-006**: Generated application verification proves no raw brief, model
  request/response, credential, capability token, signing material, URL, path,
  arbitrary code, or secret enters DOM, logs, feedback, evidence, or templates.
  The existing API smoke and Docker cleanup evidence remain green.
- **VRF-007**: Required fresh commands include:

  ```powershell
  py -3.12 -m unittest tests.api.test_factory_ui_kit -v
  py -3.12 -m unittest tests.api.test_console_ui_sources -v
  py -3.12 -m unittest tests.api.test_component_contract -v
  py -3.12 -m unittest tests.api.test_component_composer -v
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  npm --prefix apps/console-next run preflight
  npm --prefix apps/console-next run build
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  node tests/web/generated-composable-preview-e2e.mjs
  node --check apps/web/app.js
  git diff --check
  ```

- **VRF-008**: Independent task review, QA, release review, and PM
  reconciliation report no unresolved P0/P1. No successor is promoted or made
  selectable merely because an ADR is accepted or tests pass.

## Founder Decisions Required

- **FDR-001**: Accept or reject the distinct Console identity
  `factory-ui-console@1.3.0`, rather than attempting an immutable-key collision
  with existing generated `factory-ui@1.3.0`.
- **FDR-002**: Accept or reject canonical generated `factory-ui@1.4.0` and the
  coherent `ui.*@2.3.0` candidate strategy, including its no-promotion rule.
- **FDR-003**: Confirm the exact `lucide-react@0.474.0` ISC-licensed source as
  the only permitted new icon dependency for the two successor tracks.
- **FDR-004**: Confirm that generated Lineage/provenance remains out of scope
  until a separate accepted generated API/data/output-contract ADR.

## Founder Decision

- **FDR-001**: Accepted. `factory-ui-console@1.3.0` is the distinct Console
  successor; it must not collide with generated `factory-ui@1.3.0`.
- **FDR-002**: Accepted. Generated `factory-ui@1.4.0` and the coherent
  `ui.*@2.3.0` family remain candidate-only until a separate promotion gate.
- **FDR-003**: Accepted. Only the exact ISC-licensed
  `lucide-react@0.474.0` dependency described by this ADR is permitted for
  these successors.
- **FDR-004**: Accepted. Generated Lineage/provenance remains excluded until
  a dedicated API/data/output-contract ADR is accepted.

## References

- **REF-001**: `docs/adr/004-component-trust-and-promotion.md`
- **REF-002**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-003**: `docs/adr/014-factory-ui-1-2-console-visual-accessibility-successor.md`
- **REF-004**: `docs/adr/015-generated-approval-ui-2-2-role-aware-workflow-safety.md`
- **REF-005**: `docs/contracts/generated-approval-ui-2-2.md`
- **REF-006**: `docs/tech-governance.md`
- **REF-007**: `apps/console-next/package.json`
- **REF-008**: `apps/console-next/package-lock.json`
- **REF-009**: `apps/console-next/node_modules/lucide-react/package.json`
