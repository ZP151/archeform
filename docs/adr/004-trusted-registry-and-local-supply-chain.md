---
title: "ADR-004: Trusted Registry and Local Supply Chain"
status: "Accepted"
date: "2026-07-26"
authors: "Tech Lead"
tags: ["architecture", "decision", "supply-chain", "trusted-registry"]
supersedes: ""
superseded_by: ""
---

# ADR-004: Trusted Registry and Local Supply Chain

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

The Controller accepted this ADR on 2026-07-26 under the founder-delegated
architecture and release authority. It does not alter the accepted
`factory-component/v1`, `factory-component-adapter/v1`, or
`factory-composition/v1` contracts, reclassify an existing package, introduce
an external registry, or authorize a package download. The Controller may
accept it under the delegated authority recorded in ADR-003; implementation
still requires a PM ledger and serialized Integration ownership.

## Context

- **CTX-001**: ADR-003 and the accepted Component Suite prove local first-party
  component composition by exact `key`, `version`, and canonical package
  digest. The fourteen existing packages use immutable package locks, but
  their `verification` fields are not publisher provenance, signed evidence,
  license-policy results, or revocation controls.
- **CTX-002**: The frozen v1 component schema already reserves a source
  revision, SPDX license expression/list version, verification time, and
  optional SBOM/provenance digest references. Its `additionalProperties: false`
  boundary means Stage 2 must not add trust semantics to `component.json`.
- **CTX-003**: Existing generated applications and their component locks are
  evidence. A promotion, revocation, or replacement must never mutate a lock
  or silently substitute its package identity.
- **CTX-004**: The product security boundary remains local-first and
  fail-closed. The Registry and Composer may not fetch, install, execute, or
  infer components, URLs, packages, keys, or adapters. Models remain unable to
  choose component identity or trust policy.
- **CTX-005**: Public research records the applicable direction: immutable OCI
  digests rather than tags; SBOM/provenance evidence bound to the exact
  subject; SPDX expressions and explicit policy exceptions; and declarative
  composition rather than executable template actions. See
  `docs/market-validation.md`, lines 78-103.
- **CTX-006**: The repository currently has no committed Git baseline. A
  cryptographic provenance claim must therefore be blocked until a source
  revision is an actual immutable Git commit. This ADR does not authorize a
  commit, remote, account, or publication.

## Decision

Adopt a local, sidecar **Trusted Registry** for first-party packages. The
existing package digest stays the sole package-content identity. The Trusted
Registry adds immutable trust evidence and deterministic policy decisions
without modifying package manifests, locks, adapter semantics, or generated
application output.

- **DEC-001**: Store one canonical trust record at
  `packages/trust/records/<component-key>/<version>/<package-digest-hex>.json`.
  Its subject is exactly `{ key, version, digest }`; the record path is a
  storage locator only and never a second identity. Its schema version is
  `factory-trust-record/v1` and its digest is calculated from canonical JSON
  with its self-referential record digest omitted.
- **DEC-002**: Store evidence blobs content-addressably below
  `packages/trust/evidence/sha256/<digest-hex>.json`. Trust records refer only
  to `sha256:` evidence digests. A verifier recomputes every evidence digest,
  requires a one-to-one exact subject match, and rejects missing, duplicate,
  malformed, cross-subject, or path-escaping references.
- **DEC-003**: A trust record has five immutable evidence sections:
  `source`, `license`, `sbom`, `provenance`, and `signature`, plus a
  deterministic `verification` result. `source` requires a full Git commit
  hash and canonical repository identity. `license` requires an SPDX 3.0
  expression, SPDX license-list version, policy version, direct/transitive
  dependency result, and zero or more exception identifiers. `sbom` requires
  an SPDX 3.0 JSON document whose subject names the exact component digest.
  `provenance` requires an in-toto Statement v1 / SLSA provenance v1.1
  predicate whose subject and resolved source revision match the trust record.
- **DEC-004**: A signature is a DSSE v1 envelope containing the canonical
  trust-record payload digest and the exact package digest as its subject. The
  initial local verifier accepts only Ed25519 signatures whose public-key
  fingerprint is present in the checked-in trust policy. Private signing keys
  are supplied only through a local environment variable or OS-managed secret
  store and never enter a repository file, generated output, component lock,
  browser state, logs, screenshots, or reports. Key rotation adds a new
  policy version; it does not modify old evidence.
- **DEC-005**: Maintain an append-only, versioned policy document at
  `packages/trust/policies/<policy-version>.json`. It declares allowed SPDX
  expressions, disallowed identifiers, allowed exception IDs with expiry,
  required evidence formats, authorized signer fingerprints, maximum evidence
  age, and the candidate/Golden/revoked decision rule. The policy digest is
  copied into each verification result. Unknown, expired, duplicated, or
  unapproved exceptions fail closed.
- **DEC-006**: Trust lifecycle is registry-owned and append-only:
  `candidate -> verified -> golden`, with `deprecated` and `revoked` terminal
  selection states. Candidate records may be inspected and verified locally,
  but only an evidence-complete `golden` record is selectable for a new
  Composition Plan. A promotion creates a new trust record and signed
  verification decision for the same immutable package digest; it never edits
  `component.json` or a prior record.
- **DEC-007**: Revocation is an explicit, signed registry event in
  `packages/trust/revocations/<package-digest-hex>/<event-digest-hex>.json`.
  It records the subject, reason code, effective time, signer, and policy
  version. New plans reject a revoked package. Existing locks remain byte-for-
  byte unchanged and historically inspectable; a new materialization attempt
  fails with a stable `revoked_locked_component` result rather than silently
  replacing or upgrading it. Replacement requires a newly approved application
  version with an explicitly different lock.
- **DEC-008**: Existing Component Suite locks are grandfathered as
  `legacy-local` trust records solely for historical inspection. They remain
  replayable only until a revocation event exists. They cannot be promoted,
  used for a new plan, or represented as provenance-verified until a real Git
  baseline, required evidence, signature, and policy decision are recorded.
- **DEC-009**: The Registry loads packages and trust records only from
  repository-contained paths. It has no HTTP, OCI, Git, package-manager, shell,
  plugin, or URL adapter. A future external intake path must be quarantined,
  content-addressed, scan-gated, and approved by a separate ingestion ADR;
  no current endpoint accepts external component locations.
- **DEC-010**: The Composer consumes the trust result only after exact package
  digest validation and before lock resolution. It persists the already
  selected `component-lock.json` unchanged and may add a separate
  `trust-manifest.json` containing trust-record, policy, evidence, and
  revocation-event digests. It must never copy raw SBOMs, provenance payloads,
  signatures, credentials, or private-key references into generated
  applications.

## Proposed profile and compatibility

| Aspect | Accepted Stage 1 profile | Proposed Stage 2 profile |
| --- | --- | --- |
| Package identity | `key@version@sha256` local package | Unchanged |
| Component schema | Frozen `factory-component/v1` | Unchanged |
| Trust evidence | Reserved, informational fields | Digest-bound sidecar records and policy verdict |
| New-plan resolution | Golden package lifecycle only | Golden package plus current valid trust record |
| Existing lock replay | Digest-verified package | Same lock; explicit rejection only after revocation |
| Storage | Repository packages | Repository packages plus local `packages/trust/` |
| Network behavior | No runtime download | Unchanged; no external ingestion |

- **COM-001**: `factory-composition/v1` remains frozen. The optional generated
  `trust-manifest.json` is evidence beside, not inside, its output manifest or
  lock contract. A future composition schema revision requires a new ADR.
- **COM-002**: Components with a `golden` package lifecycle but no valid Stage
  2 trust record are never selected for new plans after the migration gate.
  This intentionally strengthens selection without changing the stored lock
  identity.
- **COM-003**: Source revision must be a full, locally verifiable Git commit.
  A human-readable branch, tag, remote URL, or the current placeholder
  `source_revision` field is insufficient provenance.

## Consequences

### Positive

- **POS-001**: Source, license, SBOM, provenance, signature, verification date,
  signer, and policy decision become independently verifiable evidence bound
  to the exact package digest.
- **POS-002**: Candidate promotion, expiration, revocation, and replacement
  become deterministic registry actions instead of package-manifest edits.
- **POS-003**: Existing locks remain auditable and immutable while revocation
  prevents unsafe silent replay or substitution.
- **POS-004**: Local-first storage preserves current air-gapped and no-runtime-
  download constraints while allowing later OCI/quarantine work to be added
  behind a new decision.

### Negative

- **NEG-001**: Evidence generation, signing, policy maintenance, key rotation,
  and verification introduce operational work and new test surface.
- **NEG-002**: A Git baseline is a hard precondition to promotion; current
  packages cannot claim new provenance until one exists.
- **NEG-003**: Revoked locks will intentionally stop new materializations, so
  operators must create an explicitly upgraded application version.
- **NEG-004**: Local evidence can establish controlled first-party history, not
  independent third-party trust or vulnerability remediation.

## Alternatives considered

### Mutate `component.json` with new trust fields

- **ALT-001**: **Description**: Extend the frozen component manifest for each
  promotion, signature, or verification event.
- **ALT-002**: **Rejection reason**: It invalidates package digests, changes
  package identity, conflicts with the frozen schema, and can silently alter
  existing composition evidence.

### Trust a lifecycle field or local digest alone

- **ALT-003**: **Description**: Treat `lifecycle: golden` and canonical digest
  validation as proof of source and security trust.
- **ALT-004**: **Rejection reason**: Content identity is not source provenance,
  license approval, SBOM, build provenance, signature verification, or policy
  authorization.

### Fetch packages and proof from public registries at resolution time

- **ALT-005**: **Description**: Add OCI, npm, Git, or HTTP resolution directly
  to the Registry.
- **ALT-006**: **Rejection reason**: It broadens execution and supply-chain
  attack surface, undermines reproducibility, and violates the current
  no-runtime-download product boundary.

### Silently replace a revoked lock with the newest Golden package

- **ALT-007**: **Description**: Automatically upgrade an application during
  materialization or execution.
- **ALT-008**: **Rejection reason**: It corrupts reproducible lineage and
  bypasses the definition/plan approval gate.

## Implementation notes

- **IMP-001**: Integration owns the new trust-record, policy, revocation-event,
  DSSE envelope, SPDX SBOM, and provenance schemas. The frozen Stage 1
  contracts are read-only. New trust formats must be schema-versioned and
  canonicalization rules must reject duplicate JSON keys, noncanonical paths,
  unsupported algorithms, and ambiguous timestamps.
- **IMP-002**: Policy verification is offline and deterministic. Its initial
  accepted algorithms are SHA-256 and Ed25519; accepted formats are SPDX 3.0
  JSON, in-toto Statement v1 with SLSA provenance v1.1 predicate, and DSSE v1.
  Any implementation library or signing-tool choice is pinned in the package
  lock and may not download at runtime.
- **IMP-003**: Implement migration as discovery-only first: generate
  `legacy-local` records for every existing package digest, report exact missing
  provenance/evidence, and preserve Stage 1 execution. Enable Stage 2 new-plan
  enforcement only after every selected Golden package has a verified record
  and the verification/rollback gates pass.
- **IMP-004**: Rollback disables new-plan Stage 2 enforcement through a
  policy-version rollback, preserves all trust records and revocations, and
  restores the accepted Stage 1 resolver for preexisting locks. It must not
  delete evidence, edit locks, downgrade a revocation event, or make a revoked
  lock silently runnable.
- **IMP-005**: Test fixtures must cover digest substitution, evidence subject
  mismatch, unknown or expired SPDX exception, bad signer, stale evidence,
  absent Git commit, revoked exact lock, promotion without mutation, and a
  rejected URL/Git/OCI/npm input. QA must prove no raw evidence payload or
  secret appears in a generated application or browser-visible state.

## Verification gate

- **VRF-001**: A candidate can become Golden only with exact-digest source,
  SPDX, SBOM, SLSA provenance, DSSE signature, policy, and verification-date
  evidence that passes offline verification.
- **VRF-002**: A missing, malformed, expired, mismatched, unsigned, or policy-
  denied record rejects new-plan selection before Composer output is written.
- **VRF-003**: A revocation preserves the historical lock exactly, rejects a
  new materialization with `revoked_locked_component`, and requires an explicit
  new lock for replacement.
- **VRF-004**: Existing Stage 1 applications retain their exact component locks
  and have a documented `legacy-local` migration state; no package manifest or
  composition contract changes as part of the migration.
- **VRF-005**: Required Python, API, Executor, browser, supply-chain fixture,
  and diff checks pass, including an offline/no-network regression.

## References

- **REF-001**: `docs/adr/003-first-party-component-packages-registry-and-declarative-composer.md` — accepted Stage 1 component, Registry, Composer, and local-only boundary.
- **REF-002**: `docs/contracts/factory-component-composition-v1.md` — frozen component and composition contracts.
- **REF-003**: `docs/market-validation.md`, lines 78-103 — OCI digest, SPDX, SLSA, evidence-subject, and no-runtime-download findings.
- **REF-004**: [SPDX specifications](https://spdx.dev/use/specifications/), [SLSA provenance v1.1](https://slsa.dev/spec/v1.1/provenance), [in-toto Statement](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md), and [DSSE](https://github.com/secure-systems-lab/dsse/blob/master/protocol.md).
