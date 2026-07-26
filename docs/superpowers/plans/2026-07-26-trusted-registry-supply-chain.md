# Trusted Registry and Local Supply Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline-verifiable first-party trust evidence, policy-driven
candidate promotion and revocation, while preserving every accepted Stage 1
package and application lock byte-for-byte.

**Architecture:** Keep `factory-component/v1`, its adapter contract, and
`factory-composition/v1` frozen. The Registry consumes separate, content-
addressed `factory-trust-record/v1` records and evidence blobs keyed by the
existing package digest; the Composer adds non-secret trust evidence beside
rather than inside the existing component lock. All verification is local and
fail-closed; no component, evidence, key, URL, or tool is fetched at runtime.

**Tech stack:** Existing Python 3.12/FastAPI test environment, JSON Schema
Draft 2020-12, SHA-256, Ed25519, DSSE v1, SPDX 3.0 JSON, in-toto Statement v1,
SLSA provenance v1.1, existing Next.js/Docker Compose generated applications.

## Global constraints

- Preserve the accepted `docs/contracts/factory-*-v1.schema.json` files and
  every existing `component.json`, adapter, package digest, and
  `component-lock.json` unchanged.
- Only Integration may write shared Registry/Composer/trust-contract paths;
  no parallel frontend/backend writer changes those paths.
- No network client, OCI client, Git client, package-manager install, shell
  action, executable adapter, raw model output, raw brief, private key, or
  credential may enter the trust resolver or generated output.
- Private signing keys are local environment/OS-secret inputs only; fixtures
  use non-production test keys and test secrets never appear in reports.
- New plans resolve only current Golden packages with valid trust records;
  revoked locks remain exact historical evidence and fail explicitly instead
  of being upgraded.
- A full Git commit baseline is required before any non-legacy promotion.
- Required final checks are:

  ```powershell
  python -m unittest discover -s tests/agents -v
  python -m unittest discover -s tests/api -v
  python -m unittest discover -s tests/executor -v
  node --check apps/web/app.js
  git diff --check
  ```

---

## File structure

| Path | Responsibility |
| --- | --- |
| `docs/adr/004-trusted-registry-and-local-supply-chain.md` | Accepted architecture decision and scope boundary. |
| `docs/contracts/factory-trust-record-v1.schema.json` | Immutable package-subject, evidence references, and verdict schema. |
| `docs/contracts/factory-trust-policy-v1.schema.json` | Versioned offline policy and signer/exception/age constraints. |
| `docs/contracts/factory-revocation-event-v1.schema.json` | Append-only signed revocation event schema. |
| `docs/contracts/factory-trust-manifest-v1.schema.json` | Non-secret generated trust evidence manifest schema. |
| `packages/trust/policies/` | Immutable checked-in policy versions only. |
| `packages/trust/records/` | One immutable record per exact package digest. |
| `packages/trust/evidence/sha256/` | Content-addressed SPDX, provenance, and DSSE fixture evidence. |
| `packages/trust/revocations/` | Content-addressed signed revocation events. |
| `apps/api/trust_contract.py` | Canonical JSON, containment, digest, schema, and evidence validation. |
| `apps/api/trusted_registry.py` | Offline discovery, trust verification, promotion, and revocation resolution. |
| `apps/api/component_composer.py` | Calls trusted resolution before materialization and emits trust manifest. |
| `tests/api/test_trust_contract.py` | Contract and adversarial evidence regressions. |
| `tests/api/test_trusted_registry.py` | Lifecycle, policy, promotion, and revocation regressions. |
| `tests/api/test_component_composer.py` | Trust gate and no-leak materialization regressions. |
| `tests/fixtures/trust/` | Contained test-only records, keys, evidence, and invalid cases. |

## Task 1: PM governance and source-baseline gate

**Files:**
- Create: `docs/superpowers/ledgers/trusted-registry-supply-chain.md`
- Modify: `docs/project-status.md`

**Consumes:** Accepted ADR-003, this proposed ADR, and the Component Suite
acceptance evidence.

**Produces:** A PM-owned ledger that names Integration as the single writer,
records ADR-004 acceptance, and blocks promotion until a full Git commit
baseline exists.

- [ ] Create the ledger in `planned` state with outcome, non-goals, allowed
  paths, frozen-contract declaration, acceptance criteria, test commands, and
  exact task dependencies below.
- [ ] Record `source_baseline_absent` as a blocker for non-legacy promotion;
  do not create a commit, remote, branch, or external account as part of this
  task.
- [ ] Update the project-status milestone only after ADR-004 is accepted and
  the ledger exists.
- [ ] Hand off the ledger and baseline decision to the Integration writer.

## Task 2: Trust-format contract and contained fixture corpus

**Files:**
- Create: `docs/contracts/factory-trust-record-v1.schema.json`
- Create: `docs/contracts/factory-trust-policy-v1.schema.json`
- Create: `docs/contracts/factory-revocation-event-v1.schema.json`
- Create: `docs/contracts/factory-trust-manifest-v1.schema.json`
- Create: `tests/fixtures/trust/valid/`
- Create: `tests/fixtures/trust/invalid/`
- Create: `tests/api/test_trust_contract.py`

**Consumes:** Frozen v1 component/composition schemas and ADR-004 DEC-001 to
DEC-005.

**Produces:** Versioned, closed JSON schemas and fixtures that bind every
trust/evidence item to an exact existing package digest without editing the
component contract.

- [ ] Write failing tests for a valid record and policy, then individual
  failures for a noncanonical subject, path escape, duplicate evidence
  reference, mismatched evidence subject, invalid SPDX expression/list version,
  unknown policy exception, stale `verified_at`, and unsigned record.
- [ ] Run `python -m unittest tests.api.test_trust_contract -v`; expect the
  new tests to fail because trust validation does not exist.
- [ ] Define closed schemas with required subject, record digest, full source
  commit, policy digest, evidence digest, issued/verified timestamps, signer
  fingerprint, and policy verdict fields. Restrict algorithms to `sha256` and
  `ed25519`; restrict evidence types to SPDX 3.0 JSON, DSSE v1, and in-toto
  Statement v1/SLSA v1.1.
- [ ] Add valid and hostile fixtures wholly under `tests/fixtures/trust/`; no
  fixture uses a production key, a fetchable external location, or an
  unapproved external source identifier. Fixed standards-defined JSON-LD
  identifiers (for example, the SPDX 3.0.1 `@context` IRI) are permitted as
  inert data and must be covered by the no-network regression; they are never
  dereferenced by Factory Pilot.
- [ ] Re-run the focused contract tests; expect every valid fixture to pass and
  every hostile fixture to fail with a stable error code.

## Task 3: Offline trust validator and signature/provenance verification

**Files:**
- Create: `apps/api/trust_contract.py`
- Modify: `tests/api/test_trust_contract.py`

**Consumes:** Task 2 schemas and fixtures.

**Produces:** A pure local validator that recomputes record/evidence digests,
checks exact subject binding, validates full Git source revision, policy age,
SPDX/SBOM/provenance shape, and DSSE Ed25519 signatures without network or
shell calls.

- [ ] Add failing tests that monkeypatch network, subprocess, and URL-opening
  functions to raise, then verify trust validation still completes solely from
  local fixture paths.
- [ ] Add failing tests for a swapped SPDX blob, provenance whose resolved
  dependencies contain another revision, an invalid DSSE payload type, an
  untrusted signer fingerprint, and a signature over a different record digest.
- [ ] Implement canonical JSON and content-addressed evidence reads that reject
  symlinks, junctions, unsupported algorithms, duplicate JSON keys, and files
  outside the configured trust root.
- [ ] Implement deterministic signature and provenance checks against the
  checked-in policy's public keys; private-key handling is excluded from this
  module.
- [ ] Run `python -m unittest tests.api.test_trust_contract -v`; retain exact
  passing output in the ledger hand-off.

## Task 4: Trusted Registry lifecycle, policy, and immutable migration

**Files:**
- Create: `apps/api/trusted_registry.py`
- Create: `packages/trust/policies/1.0.0.json`
- Create: `packages/trust/records/`
- Create: `packages/trust/evidence/sha256/`
- Create: `packages/trust/revocations/`
- Create: `tests/api/test_trusted_registry.py`

**Consumes:** Tasks 2-3; existing `ComponentRegistry`; actual package digests.

**Produces:** A local trust resolver that distinguishes legacy, candidate,
verified, Golden, deprecated, and revoked state while never mutating packages,
component locks, or existing trust records.

- [ ] Write failing tests proving a legacy record describes an existing package
  digest without changing its manifest; a candidate cannot resolve for a new
  plan; a valid verified candidate can promote to Golden; and promotion creates
  a new record rather than edits an existing JSON file.
- [ ] Write failing tests proving missing Git baseline blocks promotion,
  an expired policy exception blocks promotion, a revoked digest blocks new
  plans, and a revoked historical lock returns exactly
  `revoked_locked_component` without selecting a replacement.
- [ ] Implement discovery only from `packages/components` and `packages/trust`.
  Do not add URLs, OCI, Git, npm, or package-manager inputs or clients.
- [ ] Implement append-only record and revocation paths derived from the exact
  subject/evidence digests. Reject conflicting records, policy rollback that
  would erase a revocation, and unknown transition pairs.
- [ ] Generate legacy-local records for each accepted Component Suite package
  only after tests prove their source/evidence insufficiency is reported, not
  hidden. Do not promote them without the source-baseline gate.
- [ ] Run `python -m unittest tests.api.test_trusted_registry -v` and retain
  exact output.

## Task 5: Registry/Composer trust gate and evidence-safe output

**Files:**
- Modify: `apps/api/component_composer.py`
- Modify: `tests/api/test_component_composer.py`
- Create: `tests/api/test_trusted_composition.py`

**Consumes:** Task 4 trusted resolver and frozen `factory-composition/v1`.

**Produces:** New-plan resolution requires valid Golden trust; historical lock
replay is explicit; generated output receives only a digest-only
`trust-manifest.json` and never a credential or raw evidence payload.

- [ ] Write failing tests for missing record, stale evidence, invalid signer,
  wrong-subject evidence, revoked lock, and Golden package that would otherwise
  be accepted by the current ComponentRegistry.
- [ ] Write a failing test proving `component-lock.json` bytes are identical
  before and after trust integration, while `trust-manifest.json` includes only
  package, record, policy, and evidence digests.
- [ ] Implement the trust check after package digest validation and before
  Composer output writes. Map denial conditions to stable, non-secret errors.
- [ ] Implement contained `trust-manifest.json` generation as a separate
  evidence artifact; do not extend `factory-composition/v1` or expose raw
  SBOM/provenance/signature content.
- [ ] Run `python -m unittest tests.api.test_component_composer -v` and
  `python -m unittest tests.api.test_trusted_composition -v`.

## Task 6: Migration, executor proof, QA, and release review

**Files:**
- Modify: `tests/executor/test_executor.py`
- Modify: `docs/project-status.md` (PM only, after acceptance)
- Modify: `docs/superpowers/ledgers/trusted-registry-supply-chain.md` (PM only)

**Consumes:** Tasks 2-5 and the accepted Component Suite leave/expense proof.

**Produces:** Evidence that legacy locks remain immutable, valid trusted
packages run both applications, revoked locks fail explicitly, and no secret or
raw evidence leaks into outputs.

- [ ] Add executor regressions for a valid digest-only trust manifest, a
  missing/mismatched trust manifest, and a revoked locked component. Verify
  teardown and cleanup still work for both leave and expense products.
- [ ] QA runs the generated leave and expense role-aware submit/approve/audit
  smoke flows with the same exact package locks, then asserts all trust output
  contains only allowed digests and no private-key, raw SBOM, provenance, or
  credential content.
- [ ] QA runs the no-network regression, the required Python/API/Executor/node
  suite, and `git diff --check`; attach fresh exact output to the ledger.
- [ ] A read-only reviewer checks ADR-004 compliance, frozen-contract
  preservation, append-only lifecycle behavior, and rollback semantics. Return
  P0/P1 findings to the Integration writer before PM acceptance.
- [ ] PM records accepted or blocked state, current policy version, remaining
  source-baseline limitation, and the next roadmap slice.

## Coverage review

| ADR-004 requirement | Plan task |
| --- | --- |
| Source provenance and Git baseline | 1, 2, 3, 4 |
| SPDX policy and exceptions | 2, 3, 4 |
| SBOM and provenance evidence | 2, 3 |
| DSSE signature and verification dates | 2, 3 |
| Candidate/Golden promotion and revocation | 4 |
| Immutable existing locks and replacement | 4, 5, 6 |
| Local-first/no runtime download | 3, 4, 6 |
| Composer integration and evidence privacy | 5, 6 |
| Migration, rollback, QA, release review | 4, 6 |

## Execution handoff

Plan complete and saved to
`docs/superpowers/plans/2026-07-26-trusted-registry-supply-chain.md`.

Execution must begin only after a PM creates the Stage 2 ledger and records
ADR-004 acceptance. Use Subagent-Driven execution with a single serialized
Integration writer for Tasks 2-5; task review, QA, and release review remain
read-only until their assigned hand-off permits test-only changes.
