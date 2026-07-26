---
title: "ADR-003: First-Party Component Packages, Golden Registry, and Declarative Composer"
status: "Accepted"
date: "2026-07-26"
authors: "Tech Lead"
tags: ["architecture", "decision", "component-packages", "composition", "proposed"]
supersedes: ""
superseded_by: ""
---

# ADR-003: First-Party Component Packages, Golden Registry, and Declarative Composer

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The founder accepted this ADR on 2026-07-26 and delegated continuing
architecture, contract, live-model, deployment, and release authority to the
active Controller. This ADR authorizes the bounded Component Suite experiment
and Integration's shared-contract freeze. It does not authorize external
package ingestion, public registry operation, arbitrary code execution, or an
undocumented scope expansion.

## Context

- **CTX-001**: ADR-002 constrains requirement interpretation to a locally
  validated `ApplicationDefinition`, requires two approvals, and separates
  loopback-only runtime execution into a manually started Executor.
- **CTX-002**: VNext still uses fixed Golden labels and a centralized renderer.
  The Component Suite must prove leave and expense approval applications can
  use the same independently versioned, digest-locked assets while differing
  only through validated inputs.
- **CTX-003**: The Stage 1 roadmap requires a pre-implementation decision on
  package contracts, digests, output slots, merge rules, lifecycle states, and
  migration/rollback boundaries.
- **CTX-004**: Models and raw requirements must not select packages,
  dependencies, adapters, paths, URLs, code, runtime topology, or deployment
  targets. Raw briefs, credentials, capability tokens, and full model output
  remain excluded from state, generated output, logs, screenshots, and reports.
- **CTX-005**: This introduces shared `factory-component/v1` and
  `factory-composition/v1` contracts. Integration owns them while unfrozen and
  serializes contract changes.
- **CTX-006**: The Explorer's central-renderer migration map identifies
  package/slot boundaries, migration order, and existing regression evidence.
  In particular, it finds that the current audit display has no target owner;
  leaving that ownership implicit would preserve centralized-renderer coupling.
- **CTX-007**: The 2026-07-26 public ecosystem report supports a local,
  key/version/digest-locked Stage 1 package boundary; it recommends
  declarative—not executable—adapters and Composer-owned ordering, merging,
  containment, and output manifests. OCI transport, signing, SBOM/provenance
  enforcement, and candidate-to-Golden promotion remain Stage 2 concerns.

## Decision

Recommend a bounded, reversible **experiment**. Retain the approved Python
3.12/FastAPI, PostgreSQL 16, Next.js 15/React, Docker Compose, approvals,
control-plane, and Executor profiles from ADR-002. This ADR adds no public
registry, registry service, package-manager dependency, cloud runtime, or
external component source.

- **DEC-001**: Define a first-party executable component package as
  `packages/components/<component-key>/<version>/` containing `component.json`,
  `adapter.json`, owned templates, fixtures, and tests. A catalog label or a
  centralized-renderer branch is not a package.
- **DEC-002**: Freeze repository-owned `factory-component/v1` and
  `factory-composition/v1` JSON contracts before implementation. The latter
  records definition checksum, exact locks, normalized validated inputs,
  dependency graph, adapter order, and output checksums. Incompatible contract
  changes need a successor version and governance review.
- **DEC-003**: `component.json` declares exact `key` and `version`, package
  inventory, deterministic digest, category, `provides`, `requires`,
  compatibility, input schema, output slots, lifecycle state, and verification
  evidence. Its digest is SHA-256 over a canonical manifest-defined inventory
  of UTF-8 normalized relative paths and file bytes; no path outside the root
  or generated-at-runtime value participates. It also reserves versioned
  evidence fields for source revision, build/verification time, SPDX license
  expression and list/schema version, SBOM/provenance reference and digest,
  and verification result. Stage 1 records those fields without treating a
  local digest as publisher provenance or enforcing a promotion policy.
- **DEC-004**: `adapter.json` is declarative data using only frozen allowlisted
  operations. It maps locally validated inputs into declared output slots; it
  cannot evaluate code, invoke shell/network, import dependencies, select
  packages, use absolute/parent paths, change Compose topology, or create slots.
- **DEC-005**: Registry owns repository-root package discovery, strict manifest
  validation, lifecycle filtering, digest verification, compatibility checks,
  and deterministic `key@version@digest` lookup. It indexes only first-party
  Golden packages and never fetches, installs, promotes, or executes artifacts.
- **DEC-006**: Composer owns deterministic Golden resolution, dependency graph
  validation, adapter ordering, slot-conflict and containment checks, immutable
  locks, and output-manifest generation. It fails closed for unknown,
  digest-mismatched, non-Golden, incompatible, cyclic, missing-dependency,
  out-of-slot, conflicting, or path-escaping contributions.
- **DEC-007**: Approved profile policy and Composer—not the model or raw
  requirement—select packages. For this experiment, leave and expense must
  resolve identical key/version/digest locks; only locally validated definition
  inputs may cause their fields, labels, schema, and UI to differ.
- **DEC-008**: The centralized renderer remains the VNext compatibility
  baseline. The composable route has no implicit renderer fallback once chosen;
  missing or invalid components block planning or generation.
- **DEC-009**: `ui.app-shell` exclusively owns the audit **presentation**
  package contribution in the declared `frontend/features/audit/**` output
  slot, including the audit-view fixture. `ops.audit-log` exclusively owns the
  audit behavior and persistence contributions in `backend/audit` and
  `data/audit-schema`; it contributes no frontend files. Composer alone
  assembles `frontend/app/page.tsx`, so no package writes that shared path and
  no audit-UI ownership remains implicit.

## Proposed Profile and Compatibility

| Aspect | Accepted VNext baseline | Proposed Component Suite experiment |
| --- | --- | --- |
| Component source | Golden manifest labels | Versioned first-party packages |
| Selection authority | Fixed deterministic resolver | Profile policy, Registry, and Composer; never model input |
| Output | Centralized owned-template renderer | Declared adapters in bounded slots plus output manifest |
| Provenance | Component keys, versions, digests | Exact package locks, canonical digests, adapter order, checksums |
| Runtime | Separate local Executor | Unchanged; Composer has no Docker, shell, cloud, or Executor authority |

- **COM-001**: Existing VNext routes, approvals, queue-file protocol, and
  Executor checks remain compatible. New internal contracts do not change the
  frozen VNext HTTP contract without separate integration review.
- **COM-002**: Integration must publish exact schemas, errors, fixtures,
  compatibility rule, and frozen status before frontend, backend, and
  Registry/Composer writers work concurrently. A shared-contract, output-slot,
  manifest, adapter-operation, or Compose change pauses that work.
- **COM-003**: Experiment lifecycle states are `candidate`, `golden`,
  `deprecated`, and `revoked`; only `golden` is resolvable. Public ingestion,
  promotion, signatures, SBOMs, and provenance are deferred to Stage 2.
- **COM-004**: The frozen contract names `frontend/features/audit/**` as an
  exclusive `ui.app-shell` slot. It separately names `backend/audit` and
  `data/audit-schema` as exclusive `ops.audit-log` slots. A package may depend
  on another package's declared contract but may not write, merge into, or
  claim its slot; Composer owns the shared page assembly slot.

## Consequences

### Positive

- **POS-001**: Assets gain explicit versions, inputs, dependencies, fixtures,
  tests, evidence, and digests rather than being implicit renderer branches.
- **POS-002**: Locks and output manifests make a definition-to-application
  lineage reproducible and inspectable.
- **POS-003**: Declared slots and fail-closed composition preserve the
  constrained compiler boundary while enabling two bounded products.

### Negative

- **NEG-001**: Metadata, digest canonicalization, adapters, and composition
  validation create meaningful implementation and test surface.
- **NEG-002**: The initial scope remains one bounded first-party approval-app
  profile; broader reuse awaits a later decision.
- **NEG-003**: Local digest reliability needs path, encoding, ordering,
  symlink/junction, and containment regressions.
- **NEG-004**: Local content identity is not publisher identity, license,
  vulnerability, SBOM, or external provenance verification.

## Alternatives Considered

### Retain the centralized renderer and fixed labels

- **ALT-001**: **Description**: Continue adding renderer branches and use the
  current labels as the component abstraction.
- **ALT-002**: **Rejection Reason**: It cannot prove independently versioned
  assets, reproducible composition, or same-lock/different-input behavior.

### Let the model select packages and generate adapters

- **ALT-003**: **Description**: Accept package keys, paths, dependencies, or
  executable transformations from model output.
- **ALT-004**: **Rejection Reason**: It violates ADR-002's constrained
  definition and Golden-selection boundary.

### Use executable plugin adapters

- **ALT-005**: **Description**: Load Python, JavaScript, or arbitrary scripts
  from packages during composition.
- **ALT-006**: **Rejection Reason**: It introduces execution, dependency,
  sandboxing, and nondeterminism concerns beyond the experiment.

### Add a public registry or cloud execution now

- **ALT-007**: **Description**: Fetch artifacts from external sources or couple
  composition to Docker/cloud previews.
- **ALT-008**: **Rejection Reason**: It expands supply-chain, credentials,
  egress, deployment, and authority risks outside Stage 1.

## Migration, Rollback, and Founder Decisions

- **MIG-001**: After founder acceptance, Integration creates and tests the
  shared schemas, fixtures, and errors; it records their frozen path/version in
  the ledger before any parallel package or Composer work. The freeze includes
  the explicit audit-UI ownership and slot boundaries in DEC-009.
- **MIG-002**: Writers migrate one responsibility at a time into packages.
  Integration introduces Registry and Composer beside—not in place of—the
  current renderer.
- **MIG-003**: QA proves leave and expense share immutable locks yet produce
  distinct validated artifacts and retain submit, approve, audit, run, stop,
  and cleanup behavior through the unchanged Executor boundary.
- **MIG-004**: No existing run is rewritten, no data migration is needed, and
  no external artifact acquisition is authorized.
- **RBK-001**: Rollback disables the composable route and stops new composition
  plans. Existing VNext definitions, plans, runs, renderer, approvals, and
  Executor behavior remain available.
- **RBK-002**: Abort if digests are not reproducible, adapters cannot be bound
  to slots, Golden filtering/containment can be bypassed, identical locks do
  not reproduce output, or any P0/P1 finding remains unresolved.
- **FND-001**: The founder accepted this experiment on 2026-07-26 and delegated
  continuing architecture, contract, live-model, deployment, and release
  authority to the active Controller.
- **FND-002**: Explorer and market evidence is recorded in
  `docs/reports/central-renderer-migration-map.md` and
  `docs/market-validation.md` (Composable Internal Approval Suite section).
  Future scope expansion requires a new or revised Controller decision.
- **FND-003**: External ingestion, promotion, signing, SBOM/provenance,
  registry service, new adapter operations, cloud execution, or new profiles
  require their own governance review.

## Security and Operability Controls

- **SEC-001**: Registry and Composer accept only contained first-party Golden
  packages whose canonical inventories and SHA-256 digests match their locks;
  resolved symlinks/junctions may not leave approved roots.
- **SEC-002**: Composer writes only contained declared slots and resolves
  conflicts deterministically. It never silently overwrites contributions;
  `ops.audit-log` cannot contribute to `frontend/features/audit/**`, and
  `ui.app-shell` cannot contribute to `backend/audit` or `data/audit-schema`.
- **SEC-003**: Adapters use only approved locally validated definition data;
  they cannot access secrets, tools, environment values, or raw briefs.
- **SEC-004**: Evidence stores minimal checksums, validation outcomes, and
  bounded errors, never raw briefs, API keys, tokens, model responses, or
  command lines.
- **OPS-001**: A failed composition publishes neither a partial lock nor output
  manifest and returns a bounded actionable error.
- **OPS-002**: Repeated inputs must produce deterministic registry and Composer
  results with redacted diagnosis of failed package, dependency, digest,
  compatibility, slot, or containment checks.

## Implementation Notes

- **IMP-001**: This proposal authorizes no implementation. The first artifact
  after acceptance is a frozen Integration-owned contract.
- **IMP-002**: The contract must define canonical JSON, path normalization,
  file types, inventory ordering, SHA-256 encoding, ignored files,
  symlink/junction policy, adapter allowlist, slots, merge precedence, and
  machine-readable errors; ambiguity blocks the freeze. It must reserve the
  evidence and SPDX fields in DEC-003 and define the exclusive audit slots in
  DEC-009.
- **IMP-003**: The Composition Plan includes definition checksum, exact locks,
  normalized validated inputs, dependency graph, adapter order, and output
  manifest checksums, never the raw brief.
- **IMP-004**: The package layout is:

    packages/components/<component-key>/<version>/
      component.json
      adapter.json
      templates/
      fixtures/
      tests/

## Verification Gate

Founder acceptance of this proposal is not release acceptance. Before the
Component Suite becomes supported, the ledger must contain fresh successful
evidence for the existing required checks and focused frozen-contract tests:
`python -m unittest discover -s tests/agents -v`, `python -m unittest discover
-s tests/api -v`, `python -m unittest discover -s tests/executor -v`, `node
--check apps/web/app.js`, `node tests/web/workspace-e2e.mjs`, `python
packages/templates/leave-approval/smoke_test.py --help`, and `git diff --check`.

- **VER-001**: Contract tests reject malformed manifests, duplicate identities,
  unsupported versions, non-canonical/mismatched digests, external paths,
  symlinks/junctions, invalid lifecycles, undeclared dependencies, and adapters
  outside declared slots.
- **VER-002**: Registry/Composer tests prove unknown, non-Golden, incompatible,
  cyclic, missing, duplicate, and slot-conflicting packages fail closed without
  a partial lock or output manifest, including an `ops.audit-log` contribution
  to `frontend/features/audit/**` or a `ui.app-shell` contribution to either
  audit backend/data slot.
- **VER-003**: Repeatable tests prove identical approved definitions and
  inventories yield identical locks, adapter order, manifests, and checksums.
- **VER-004**: Leave and expense prove identical locks yet expected distinct
  validated fields, labels, schema, and UI, without model-directed composition;
  fixtures prove the audit view is contributed only by `ui.app-shell`.
- **VER-005**: End-to-end evidence proves both retain submitter, approver, and
  auditor behavior, use the separate Executor, support stop/expiry/teardown,
  and leave no Docker resources after cleanup.
- **VER-006**: Security tests prove secrets, raw briefs, tokens, full model
  responses, and command lines are absent from metadata, locks, state, output,
  logs, screenshots, and ledger evidence.
- **VER-007**: Task review, QA, and release review have no unresolved P0/P1;
  PM records the founder's final decision.

## References

- **REF-001**: `docs/architecture.md` — controlled-compilation invariants.
- **REF-002**: `docs/adr/002-vnext-model-adapter-and-local-executor.md` —
  constrained definition, Golden selection, and Executor boundary.
- **REF-003**: `docs/tech-governance.md` and `docs/threat-model.md` — authority
  and security invariants.
- **REF-004**: `docs/composable-platform-roadmap.md` — Stage 1 and deferred
  supply-chain stages.
- **REF-005**: `docs/reports/central-renderer-migration-map.md` — Explorer
  migration map, proposed slots, audit-UI ownership gap, migration order, and
  regression evidence.
- **REF-006**: `docs/market-validation.md` (2026-07-26 Composable Internal
  Approval Suite evidence log) — local key/version/digest identity,
  declarative-adapter boundary, deferred supply-chain enforcement, and SPDX
  evidence recommendations.
- **REF-007**: `docs/superpowers/plans/2026-07-26-composable-internal-approval-suite.md`,
  `docs/agent-workstreams/composable-internal-approval-suite.md`, and
  `docs/superpowers/ledgers/composable-internal-approval-suite.md` — scope,
  tasks, work waves, and current acceptance gate.
