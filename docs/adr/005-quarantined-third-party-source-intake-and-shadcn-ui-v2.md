---
title: "ADR-005: Quarantined Third-Party Source Intake and shadcn/ui v2"
status: "Accepted"
date: "2026-07-26"
authors: "Tech Lead"
tags: ["architecture", "decision", "supply-chain", "ui", "shadcn"]
supersedes: ""
superseded_by: ""
---

# ADR-005: Quarantined Third-Party Source Intake and shadcn/ui v2

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The Controller accepted this ADR on 2026-07-26 under the founder-delegated
architecture and release authority. Acceptance authorizes governance planning
only. It does not authorize a network download, source vendoring, package
promotion, component selection, Git baseline creation, a commit, remote,
account, or publication. The separately PM-owned ledger records the
implementation order and keeps `source_baseline_absent` as a visible blocker
for all candidate-to-Golden promotion and new-plan selection.

## Context

- **CTX-001**: ADR-003 established frozen `factory-component/v1`,
  `factory-component-adapter/v1`, and `factory-composition/v1` contracts for
  first-party, digest-locked component packages. The Registry resolves Golden
  packages and the Composer owns deterministic composition, containment, and
  output manifests.
- **CTX-002**: ADR-004 adds a local Trusted Registry, immutable sidecar trust
  evidence, and the lifecycle `candidate -> verified -> golden`. Its
  `DEC-009` requires any external intake to be quarantined, content-addressed,
  scan-gated, and approved by a separate ingestion ADR. The repository still
  has no immutable Git commit baseline; consequently no non-legacy candidate
  can become Golden or claim source provenance.
- **CTX-003**: The current `ui.*@1.0.0` packages and locks are production
  lineage. Rewriting their manifests, inventories, lifecycle fields, or files
  would change their canonical digests and invalidate historical evidence.
- **CTX-004**: The source candidate is the MIT-licensed
  `shadcn-ui/ui` repository at exact Git commit
  `7774cd7dcee1e98d0815aa6e829f33a7fc952fdf`. shadcn/ui distributes source
  code and registry definitions rather than a stable runtime component binary;
  Factory Pilot must therefore retain a locally verified snapshot and must not
  use its CLI, a URL registry, Git, npm, or a package manager at generation or
  runtime.
- **CTX-005**: Factory Pilot already uses Python 3.12/FastAPI, PostgreSQL 16,
  Next.js 15.5.21, React 19.2.7, and Docker Compose for generated products.
  The present `apps/web` control console is a dependency-free static client at
  the frozen local origin `http://127.0.0.1:5173`; this Origin is part of the
  control-plane capability contract.
- **CTX-006**: The Explorer migration map assigns `ui.app-shell` the existing
  `frontend/app-shell` and audit-presentation ownership and assigns the seven
  remaining UI packages their frozen route/feature slots. It also requires the
  Composer, rather than a package, to own shared page assembly. Market
  evidence supports immutable identity, SPDX/SBOM/provenance evidence, and
  declarative rather than executable template actions.

## Decision

Recommend a staged, reversible **migration** from the current v1 UI selection
to a locally controlled shadcn-derived v2 candidate set. This decision does
not change the accepted runtime profile or the frozen v1 contracts.

- **DEC-001**: Treat the exact commit
  `7774cd7dcee1e98d0815aa6e829f33a7fc952fdf` as the only upstream source for
  this intake batch. After approval, intake stores its complete source tree and
  unmodified MIT license under
  `packages/vendor/shadcn-ui/7774cd7dcee1e98d0815aa6e829f33a7fc952fdf/`.
  A deterministic offline extractor enumerates every upstream `registry:ui`
  item into a candidate index. It rejects a changed commit, a missing notice,
  an unpinned source, a path escape, a non-regular file, or a source tree that
  contains unindexed registry UI items.
- **DEC-002**: No Registry, Composer, generated application, or control
  console may fetch, run, install, or resolve third-party source through a
  URL, Git client, npm, shadcn CLI, package manager, shell adapter, or remote
  registry. The snapshot is a quarantined input. Candidate discovery and all
  later verification operate only on repository-contained files.
- **DEC-003**: Preserve every `ui.*@1.0.0` package, exact lock, digest, and
  historical output unchanged. The Trusted Registry marks v1 as
  `deprecated` for *new-plan selection* after migration, while allowing an
  exact historical `{key, version, digest}` lock to replay subject to the
  ADR-004 revocation rule. It must never silently upgrade a v1 lock to v2.
- **DEC-004**: Publish successors with the same component keys and exact
  semantic version `2.0.0`: `ui.app-shell`, `ui.login-page`, `ui.home-page`,
  `ui.profile-page`, `ui.system-settings-page`, `ui.approval-form`,
  `ui.my-requests`, and `ui.approval-queue`. Each successor has its own
  immutable inventory, digest, declarative adapter, fixture, test, and
  sidecar trust record. A v2 package is initially a candidate and is not
  selectable for a new composition plan.
- **DEC-005**: `ui.app-shell@2.0.0` remains the sole contributor to the
  frozen `frontend/app-shell` slot and provides local template copies of the
  first promotion batch: Accordion, Alert Dialog, Badge, Button, Card,
  Dialog, Dropdown Menu, Input, Label, Select, Separator, Sheet, Skeleton,
  Table, Tabs, Textarea, Sonner, and Tooltip. The other seven v2 UI packages
  require exactly `ui.app-shell@2.0.0`, import only those controlled
  primitives, and write only their existing declared route or feature slots.
  No new frozen component slot is added.
- **DEC-006**: Keep adapters declarative and schema-bound. An adapter may
  copy/render a declared template using validated `input.*` bindings into its
  already declared slot. It may not select a primitive, execute JavaScript,
  call a tool, read the vendor tree, change dependency versions, access a URL,
  or write the Composer-owned shared page assembly or manifest.
- **DEC-007**: Extend Registry resolution into two explicit paths without
  changing lock identity: (a) new-plan policy resolves an explicit
  `ui.<key> -> 2.0.0` profile mapping only when the exact v2 package has a
  current valid Golden trust record; (b) historical replay resolves only the
  original exact lock, including deprecated v1, and returns
  `revoked_locked_component` if that locked digest is revoked. Bare-key
  lookup must fail when more than one selectable version exists. The Composer
  continues to own dependency order, adapter order, slot conflict detection,
  output checksums, and atomic materialization.
- **DEC-008**: Introduce `apps/console-next/` only after its dependencies have
  been captured in a checked-in, exact lockfile from the approved local
  candidate closure. It uses the existing Next.js 15.5.21/React 19.2.7 profile,
  the shadcn default theme, and binds `127.0.0.1:5173` to preserve the frozen
  control-plane Origin contract. `apps/web/` remains a read-only rollback
  console and receives no new workflow capability.
- **DEC-009**: Generated application scaffolds receive only the exact,
  Golden v2 primitive source and an exact dependency lock closure. Candidate
  catalogue items never enter generated output. The canonical internal source
  and the emitted `ui.app-shell@2.0.0` templates must be byte-identical except
  for a documented, deterministic package-path transformation; every derived
  file retains the required MIT notice.
- **DEC-010**: Candidate evidence records the upstream repository identity and
  full commit, SPDX expression, MIT notice digest, transitive dependency SBOM,
  source and extraction provenance, DSSE signature, policy result, and
  package digest. The initial Git baseline, offline evidence verification, and
  explicit promotion decision are all required before any v2 package can be
  Golden or selected by a new plan.

## Proposed Profile and Compatibility

| Aspect | Existing accepted profile | Proposed v2 migration profile |
| --- | --- | --- |
| UI package source | Repository-owned `ui.*@1.0.0` Golden packages | Quarantined shadcn snapshot, then locally derived `ui.*@2.0.0` candidates |
| Package identity | Exact `key`, version, and SHA-256 digest | Unchanged; v1 and v2 are distinct immutable identities |
| Adapter model | Frozen declarative v1 adapter | Unchanged; no executable or network operation |
| New-plan resolution | Bare-key Golden selection | Explicit exact v2 mapping plus valid Golden trust record |
| Historical replay | Exact Golden lock | Exact historical lock, including deprecated v1, subject to revocation |
| Console | Static `apps/web` on `127.0.0.1:5173` | New Next console on the same origin; static console retained for rollback |
| Generated frontend | Existing Next 15.5.21/React 19.2.7 scaffold | Same versions; exact v2 dependency closure only after promotion |

- **COM-001**: `factory-component/v1`, `factory-component-adapter/v1`,
  `factory-composition/v1`, the control-plane HTTP contract, role model, and
  Executor/Compose topology remain frozen. Any schema, slot, API, topology,
  or major dependency change requires a successor contract and governance
  review.
- **COM-002**: A legacy plan stays reproducible by its existing lock. A new
  v2 plan must contain every exact v2 lock; a mixed v1/v2 UI lock set, an
  omitted version, an ambiguous bare key, or a candidate/deprecated/revoked
  new-plan selection fails before output is written.
- **COM-003**: Exact direct and transitive third-party package versions are
  intentionally not accepted by this proposal. They are discovered from the
  fixed snapshot during quarantined intake, recorded in the candidate SBOM and
  lockfile, checked against the approved license policy, and presented in the
  promotion evidence. A failed policy result or an unpinned closure blocks
  promotion rather than widening the profile.

## Migration and Rollback

- **MIG-001**: After acceptance, PM creates an Integration-owned ledger in
  `planned` state with frozen contract artifact, allowed write paths, exact
  intake commit, and `source_baseline_absent` as a promotion blocker. No
  source is copied before that ledger exists.
- **MIG-002**: Integration performs a quarantined, one-way local source intake
  and emits the complete candidate index plus offline integrity, license,
  dependency, SBOM, provenance, and signature evidence. Failure removes the
  incomplete candidate from consideration; it does not change any existing
  package, trust record, or lock.
- **MIG-003**: Frontend creates and tests candidate v2 packages and the new
  console behind a separate local start command. Integration serially adds the
  Registry/Composer selection and replay paths, then updates the generated
  scaffold only after the exact v2 closure is verified. Backend and control
  plane API contracts remain unchanged.
- **MIG-004**: After an explicitly authorized initial Git baseline and a
  passing offline trust gate, promote only the 18 listed primitives and the
  eight v2 UI packages. Update the new-plan policy to select exact v2 locks;
  retain every other extracted registry UI item as a candidate. PM records the
  decision, version mapping, evidence digests, and residual risks.
- **MIG-005**: Migrate leave and expense only by creating new approved plans
  with all v2 locks. Existing plans, runs, manifests, and generated output are
  not rewritten.
- **RBK-001**: Before promotion, rollback deletes no evidence and simply stops
  candidate work; the current v1 packages and static console remain the sole
  selectable/operational path.
- **RBK-002**: After promotion, rollback reverts the new-plan policy to the
  last accepted v1 selection profile, disables the new console start path, and
  stops future v2 plan creation. It preserves v2 evidence, v2 locks, old v1
  locks, and revocation events; it never edits a package or substitutes a
  lock.
- **ABT-001**: Abort the migration if a source commit cannot be verified,
  licensing or dependency policy fails, the required notice is missing,
  generated copies differ from canonical source, Origin compatibility breaks,
  a candidate becomes selectable, or any P0/P1 security, replay, or
  lifecycle finding remains open.

## Consequences

### Positive

- **POS-001**: UI source becomes reproducible, locally inspectable, and
  attributable while preserving Factory Pilot's no-runtime-download boundary.
- **POS-002**: v2 improves UI composition without corrupting the v1 lock and
  generated-output lineage needed for audits and replay.
- **POS-003**: The shared primitive owner remains one package and the Composer
  retains all assembly authority, avoiding a new slot or executable-plugin
  model.
- **POS-004**: A full upstream catalogue can be evaluated quickly while its
  unreviewed majority stays outside product output.

### Negative

- **NEG-001**: Quarantined source, derivative notices, SBOM/provenance,
  signature, policy, and byte-equivalence checks add build and review work.
- **NEG-002**: No v2 UI is immediately usable by new products because the Git
  baseline and trust-promotion gates are intentionally blocking.
- **NEG-003**: Maintaining a rollback console and two immutable UI generations
  temporarily increases local test and documentation surface.
- **NEG-004**: The exact dependency closure cannot be pre-approved until the
  fixed source is locally analysed; discovery can reject the intake entirely.

## Alternatives Considered

### Overwrite `ui.*@1.0.0` in place

- **ALT-001**: **Description**: Replace v1 templates/manifests with shadcn
  source while retaining existing keys and versions.
- **ALT-002**: **Rejection Reason**: It changes inventory and digest evidence,
  invalidates historical locks, and makes replay non-deterministic.

### Install shadcn/ui through its CLI or a live registry

- **ALT-003**: **Description**: Run the upstream CLI or retrieve components at
  developer, Composer, or generated-application build time.
- **ALT-004**: **Rejection Reason**: It violates ADR-003/004 local-only
  resolution and makes source, dependency, and license evidence mutable.

### Promote the entire upstream catalogue immediately

- **ALT-005**: **Description**: Treat every extracted UI entry as Golden.
- **ALT-006**: **Rejection Reason**: It bypasses application-specific testing,
  dependency policy, provenance, Git-baseline, and promotion gates.

### Add a new component slot per primitive

- **ALT-007**: **Description**: Give each shadcn primitive a separate Composer
  slot and package.
- **ALT-008**: **Rejection Reason**: It changes the frozen component contract,
  expands composition conflicts, and fragments common primitive ownership.

### Keep the static console as the primary v2 experience

- **ALT-009**: **Description**: Port selected styles manually into the
  dependency-free browser workspace.
- **ALT-010**: **Rejection Reason**: It would not consume the controlled React
  primitives that generated applications use and would duplicate UI behavior.

## Security and Operability Controls

- **SEC-001**: Intake and all validation are offline after the approved source
  acquisition. Production resolution rejects URL/Git/npm/OCI/package-manager/
  CLI/executable-adapter declarations and paths outside approved roots.
- **SEC-002**: The Registry checks exact trust subject, current policy, source
  commit, license, SBOM, provenance, signature, lifecycle, and revocation
  before a package is selectable. The Composer checks the returned exact
  package and never writes a partial lock or output on denial.
- **SEC-003**: MIT notices remain with source and derived templates. No raw
  source archive, SBOM, provenance document, signature payload, secret, or
  private key is copied into a generated application or browser state.
- **OPS-001**: The new console preserves loopback-only binding and the existing
  Origin/capability boundary; it exposes the same Brief -> Definition ->
  Approval -> Plan -> Run -> Stop workflow before it can become primary.
- **OPS-002**: Candidate index, package digests, source commit, policy digest,
  evidence digests, selection mapping, test output, and rollback result are
  recorded in the PM ledger, not inferred from an upstream branch name.

## Verification Gate

- **VRF-001**: Intake rejects missing/floating source identity, missing MIT
  notice, incomplete candidate enumeration, altered source, unpinned or
  license-denied dependency closure, malformed SBOM/provenance/signature, and
  any network/CLI/package-manager resolution attempt.
- **VRF-002**: Package and Registry tests prove source/template equivalence,
  required notice retention, exact v2 dependency declaration, candidate denial,
  non-Golden denial, lifecycle/revocation enforcement, duplicate/bare-key
  ambiguity rejection, and exact v1 historical replay without implicit upgrade.
- **VRF-003**: Composer tests prove only `ui.app-shell@2.0.0` emits primitives
  in `frontend/app-shell`, other UI v2 packages stay in frozen slots, no
  candidate source enters output, and locks/output manifests remain atomic and
  repeatable.
- **VRF-004**: Browser tests prove the new console completes Brief ->
  Definition -> Approval -> Plan -> Run -> Stop at
  `127.0.0.1:5173`; generated leave and expense applications use the same v2
  locks and complete login, submit, approve, audit, stop, and cleanup flows.
- **VRF-005**: Before promotion, retain fresh passing evidence for:

  ```powershell
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  python -m unittest discover -s tests/executor -v
  node --check apps/web/app.js
  node tests/web/workspace-e2e.mjs
  git diff --check
  ```

  In addition, the approved implementation ledger must contain the exact
  console and generated-app typecheck/build/Playwright commands and their
  output. A successful suite does not bypass the Git-baseline, signed-trust,
  policy, or explicit promotion decision.

## References

- **REF-001**: `docs/adr/003-first-party-component-packages-registry-and-declarative-composer.md` — frozen package, adapter, Registry, Composer, and slot boundary.
- **REF-002**: `docs/adr/004-trusted-registry-and-local-supply-chain.md` — candidate lifecycle, evidence, baseline gate, and external-intake requirement.
- **REF-003**: `docs/tech-governance.md` — ADR authority, exact-version, migration, rollback, and verification requirements.
- **REF-004**: `docs/contracts/factory-component-composition-v1.md` — frozen package identity, adapter, slot, and lock contracts.
- **REF-005**: `docs/reports/central-renderer-migration-map.md` and `docs/market-validation.md` — Explorer mapping and public ecosystem evidence.
- **REF-006**: [shadcn/ui source repository](https://github.com/shadcn-ui/ui), [MIT license](https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md), [shadcn/ui documentation](https://ui.shadcn.com/docs), and [registry documentation](https://ui.shadcn.com/docs/registry) — source-distribution and registry context.
