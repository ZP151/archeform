---
title: "ADR-012: Generated UI v2 Lifecycle Reconciliation"
status: "Accepted"
date: "2026-07-27"
authors: "Tech Lead; Founder-delegated Controller"
tags: ["architecture", "ui", "components", "supply-chain", "lifecycle"]
supersedes: "ADR-007 DEC-002 lifecycle handling for already-materialized ui.*@2.0.x only"
superseded_by: ""
---

# ADR-012: Generated UI v2 Lifecycle Reconciliation

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The Founder-delegated Controller accepted this reconciliation on 2026-07-27.
Migrate through a non-selectable historical hold and a
new, canonically verified successor generation. Do not mutate existing package
identity in an attempt to relabel it.

## Context

- **CTX-001**: ADR-007 `DEC-002` and
  `docs/contracts/factory-ui-kit-v1.md` require the generated-app
  `ui.*@2.0.0` distribution to start as `candidate` and prohibit its selection
  for a new Composition Plan before Trusted Registry promotion.
- **CTX-002**: Repository paths including
  `packages/components/ui.app-shell/2.0.0/component.json` and `trust.json`
  already declare `golden` and `promoted`. The same condition exists across
  the current v2 suite, including patch releases
  `ui.approval-form@2.0.1` and `ui.profile-page@2.0.1`.
- **CTX-003**: Those package inventories, digests, component locks, generated
  outputs, and run evidence may already be historical lineage. Rewriting a
  manifest, trust sidecar, template, or inventory in place changes the exact
  package identity and would make prior locks and replay evidence dishonest.
- **CTX-004**: The current v2 template roots use their own `fp-*` styling and
  component markers. They do not yet provide the canonical Factory UI Kit
  evidence required by ADR-007 `DEC-001` and `DEC-005`: matching
  `data-factory-ui="1.0.0"` markers, canonical CSS/token digest mapping, and
  generated-product accessibility and responsive evidence.
- **CTX-005**: `factory-component/v1`,
  `factory-component-adapter/v1`, and `factory-composition/v1` remain frozen.
  The Composer owns output paths, adapter order, dependency validation, and
  atomic locks. This reconciliation must not add executable adapters, a new
  generated runtime, a new slot, or a third-party runtime dependency.
- **CTX-006**: No evidence currently authorizes an external-provenance claim
  for the materialized v2 packages. A repository checkout, a local digest, or
  a package name is not a substitute for verified third-party source,
  licence, SBOM, provenance, and promotion evidence.

## Decision

- **DEC-001**: Treat every already-materialized `ui.*@2.0.x` package as a
  **historical-held generation** for Registry policy. Its current immutable
  files are retained unchanged and may resolve only when a historical run or
  lock requests the exact `{key, version, digest}`. A historical-held package
  is not eligible for a new Composition Plan, even if its immutable manifest
  says `golden` or its trust sidecar says `promoted`.
- **DEC-002**: The Registry's new-plan eligibility is a policy decision, not
  a reinterpretation of an immutable package manifest. Until a successor is
  promoted, it must deny every new v2 selection with a stable reason such as
  `historical_ui_generation_not_selectable`. It must still allow exact replay
  subject to the existing revocation rule. Neither path may silently rewrite,
  upgrade, or substitute a lock.
- **DEC-003**: Materialize a coherent successor suite at exact version
  `2.1.0` for `ui.app-shell`, `ui.login-page`, `ui.home-page`,
  `ui.profile-page`, `ui.system-settings-page`, `ui.approval-form`,
  `ui.my-requests`, and `ui.approval-queue`. Each successor starts as
  `candidate`. It preserves the frozen category, input contract, dependency
  topology, and output slots; dependent packages require exact
  `ui.app-shell@2.1.0`. No mixed `2.0.x`/`2.1.0` UI set is selectable for a
  new plan.
- **DEC-004**: A `2.1.0` package can become Golden and new-plan selectable
  only after the accepted Trusted Registry promotion process records all of:
  canonical Factory UI Kit identity and matching CSS/token file digests;
  required `data-factory-ui="1.0.0"` and
  `data-factory-component` markers; a versioned package inventory and
  declarative adapter; fixture and package evidence; slot containment and
  dependency validation; generated leave and expense interaction evidence;
  keyboard/focus and 390px/desktop responsive evidence; and Registry rejection
  evidence for candidate, held, incompatible, unsigned, revoked, and
  out-of-slot selections.
- **DEC-005**: The canonical-kit evidence for this migration is
  repository-local. It may identify the Factory-owned canonical asset and
  exact local file digests, but it must not claim an external vendor, upstream
  commit, third-party SBOM, licence, DSSE attestation, or source provenance
  that has not independently passed the ADR-004/ADR-005 intake and promotion
  process. `provenance_reference` remains `null` rather than asserting an
  unverified origin.
- **DEC-006**: The Composer remains the only assembly authority. Successor
  adapters may bind validated input to their declared templates and slots; no
  model output, component package, or canonical asset may choose URLs, paths,
  arbitrary code, primitives, dependencies, or output topology.

## Proposed Profile and Compatibility

| Aspect | Historical held v2 | Proposed successor v2.1.0 |
| --- | --- | --- |
| Package versions | Existing `2.0.0`, plus `ui.approval-form@2.0.1` and `ui.profile-page@2.0.1` | Exact `2.1.0` for all eight UI package keys |
| Immutable identity | Retained exactly as recorded | New manifest, inventory, digest, fixture, adapter, and trust record |
| New-plan resolution | Denied by Registry policy | Candidate until valid Golden promotion; selectable only after promotion |
| Historical replay | Exact lock only, subject to revocation | Exact lock only, subject to revocation |
| Canonical Factory UI Kit | Not evidenced | Required matching `factory-ui/1.0.0` assets, markers, and digest mapping |
| Slots and Composer | Existing frozen slots and ownership | No change |
| Runtime profile | Existing Python 3.12/FastAPI, PostgreSQL 16, Next.js 15.5.21/React 19.2.7, Docker Compose | No change |

- **COM-001**: Existing generated output remains inspectable and replayable by
  its exact historical lock. A new plan never uses a bare component key and
  never reuses a held package merely because its manifest contains `golden`.
- **COM-002**: A new 2.1.0 leave or expense plan locks all eight exact UI
  successor versions. Its fields, labels, schema, and user-facing behavior may
  differ only through the validated component inputs and documented extension
  points.
- **COM-003**: This ADR introduces no assertion that the legacy v2 files are
  unsafe or invalid for their historical run. It corrects their future
  selection policy and creates an evidence-bearing forward path.

## Migration and Rollback

- **MIG-001**: PM creates one integration-owned ledger and freezes the
  successor contract before any writer begins. The ledger names the contract
  owner, allowed paths, required evidence, and the historical-hold policy.
- **MIG-002**: Integration first implements and tests held-generation denial
  for new plans while preserving exact replay. The policy change is atomic:
  failed validation writes neither a lock nor generated output.
- **MIG-003**: Frontend/integration materializes the eight `2.1.0` candidate
  packages from the canonical Factory UI Kit using only declared slots and
  package-local templates. The legacy `2.0.x` directories, manifests, trust
  sidecars, locks, and output are not edited.
- **MIG-004**: QA records the required package, Composer, generated-product,
  accessibility, responsive, and rejection evidence. Trusted Registry
  promotion is then an explicit, separate decision recorded in the ledger;
  it is not inferred from a passing UI screenshot.
- **MIG-005**: After promotion, create new leave and expense plans that lock
  the coherent `2.1.0` set. Do not migrate an existing plan, run, or output in
  place.
- **RBK-001**: Before promotion, disable candidate selection and retain the
  historical hold. Existing replay stays available subject to revocation.
- **RBK-002**: After promotion, revoke the `2.1.0` new-plan policy mapping
  and stop future 2.1.0 plan creation if a gate fails. Preserve all immutable
  evidence and locks; do not edit either generation or substitute historical
  output.
- **ABT-001**: Abort promotion on a canonical digest/marker mismatch, absent
  required evidence, an out-of-slot write, a lock upgrade, an external
  provenance assertion without approved intake, a P0/P1 security or
  accessibility finding, or a failed generated leave/expense smoke flow.

## Consequences

### Positive

- **POS-001**: Historical lineage remains truthful while future plan
  selection is made consistent with ADR-007 and the frozen contract.
- **POS-002**: Canonical Factory UI Kit adoption becomes a measurable product
  gate rather than a visual aspiration or a Console-only convention.
- **POS-003**: The resolution fails closed without expanding the runtime,
  adapter authority, package slots, or external supply-chain trust boundary.

### Negative

- **NEG-001**: No current `2.0.x` generated UI can be selected for a new plan
  until a successor is promoted, even though its historical artifact remains
  locally runnable.
- **NEG-002**: The repository temporarily carries two immutable generated UI
  generations and associated test evidence.
- **NEG-003**: Promotion requires real product interaction evidence in
  addition to package and visual checks, adding integration work before a
  new-plan UX can use the successor suite.

## Alternatives Considered

### Relabel existing v2 files as candidate

- **ALT-001**: Change `lifecycle` and `trust.json` in the `2.0.x` directories.
- **ALT-002**: **Rejection Reason**: It alters inventory and digest identity,
  invalidates exact locks, and rewrites historical evidence.

### Continue selecting the existing v2 Golden records

- **ALT-003**: Treat the present `golden` and `promoted` fields as sufficient
  for future selection.
- **ALT-004**: **Rejection Reason**: It contradicts ADR-007 and lacks the
  canonical-kit, generated-product, and trust-promotion evidence required for
  an ongoing Golden profile.

### Replace locks with a silent v2 upgrade

- **ALT-005**: Redirect old `2.0.x` locks to a corrected implementation.
- **ALT-006**: **Rejection Reason**: It makes replay non-deterministic and
  hides the component code actually used to create historical output.

### Assert upstream provenance from local package files

- **ALT-007**: Populate provenance fields from an assumed or remembered
  external source.
- **ALT-008**: **Rejection Reason**: It bypasses the accepted quarantined
  intake and promotion controls and creates an unsupported supply-chain claim.

## Verification Gate

- **VRF-001**: Registry/Composer tests prove new-plan denial for every held
  `2.0.x` package, exact held-lock replay, revocation denial, and no partial
  lock or output on policy denial.
- **VRF-002**: Successor package tests prove exact `2.1.0` identity, coherent
  eight-package dependency resolution, required canonical markers and CSS
  digest mapping, fixture validity, adapter containment, and non-mixed UI
  versions.
- **VRF-003**: Generated leave and expense browser tests prove the same
  `2.1.0` locks compose different validated fields, labels, schema, and UI;
  both complete role-aware login, submit, approve/reject, audit, stop, and
  cleanup paths. Tests also verify keyboard focus, 390px and desktop layout,
  and absence of raw brief, model credentials, arbitrary code, URL, or path
  control in generated state or evidence.
- **VRF-004**: Promotion evidence includes fresh, recorded output for at
  least:

  ```powershell
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  python -m unittest discover -s tests/executor -v
  node tests/web/generated-composable-preview-e2e.mjs
  node tests/web/console-next-e2e.mjs
  node tests/web/console-next-accessibility.mjs
  npm --prefix apps/console-next run build
  git diff --check
  ```

- **VRF-005**: The ledger records the explicit promotion decision, all
  evidence paths and digests, residual risks, and rollback verification. A
  production claim or a real-model requirement run is not evidence of
  canonical UI or Registry policy compliance by itself.

## References

- **REF-001**: `docs/adr/003-first-party-component-packages-registry-and-declarative-composer.md`
- **REF-002**: `docs/adr/004-trusted-registry-and-local-supply-chain.md`
- **REF-003**: `docs/adr/005-quarantined-third-party-source-intake-and-shadcn-ui-v2.md`
- **REF-004**: `docs/adr/007-canonical-factory-ui-kit-and-dual-distribution.md`
- **REF-005**: `docs/contracts/factory-ui-kit-v1.md`
- **REF-006**: `docs/contracts/factory-component-composition-v1.md`
- **REF-007**: `docs/tech-governance.md`
