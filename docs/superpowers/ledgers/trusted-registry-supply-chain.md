# Trusted Registry and Local Supply Chain ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

Only PM changes task or programme state. Integration is the single writer for
all trust contracts, trust data, Registry/Composer integration, and the related
test paths. Review, QA, and release review are read-only unless the PM assigns a
separate test-only path after a hand-off.

## Programme state

| Field | Value |
| --- | --- |
| State | implementing |
| Scope | Trusted Registry and Local Supply Chain (Stage 2) |
| Approved ADR | `docs/adr/004-trusted-registry-and-local-supply-chain.md` — accepted by the Controller on 2026-07-26 under founder-delegated authority. |
| Contract owner | Integration |
| Contract status | Stage 1 `factory-component/v1`, `factory-component-adapter/v1`, and `factory-composition/v1` remain frozen and read-only. Stage 2 trust formats and the offline validator are accepted and frozen after independent standards review and final QA. |
| Single production write owner | Integration |
| Allowed writer paths | Only the paths explicitly assigned to the active TR task in this ledger. |
| Source baseline | `source_baseline_absent`: all project files are currently untracked; no full immutable Git commit exists. |
| Promotion decision | Non-legacy candidate-to-Golden promotion is blocked until a full Git commit baseline exists. This task does not authorize a commit, branch, remote, account, publication, or history rewrite. |
| Controller authority | The Controller may accept ADRs, contracts, task reviews, QA, release reviews, and this Stage 2 slice when their documented gates are met. |

## Outcome and boundaries

- **Outcome:** Add offline-verifiable sidecar trust records, policy decisions,
  evidence validation, promotion and revocation controls for exact existing
  package digests while preserving accepted Stage 1 package manifests and locks
  byte-for-byte.
- **Non-goals:** External registry/intake, HTTP/OCI/Git/npm/package-manager
  resolution, runtime downloads, executable adapters, cloud deployment,
  mutation of Stage 1 contracts or locks, publishing artifacts, and creating a
  Git baseline.
- **Security invariants:** No private key, credential, raw evidence payload,
  raw brief, model output, URL, shell action, or package selection enters the
  resolver or generated output. Runtime verification is local and fail-closed.

## Acceptance gates

1. Frozen Stage 1 schemas, package content, digests, adapters, and existing
   `component-lock.json` bytes remain unchanged.
2. New trust schemas bind policy, source, SPDX, SBOM, provenance, DSSE, and
   verdict evidence to one exact package digest and reject ambiguous/local-path
   escapes, unsupported algorithms, invalid signatures, and cross-subject data.
3. Registry accepts only repository-contained evidence, applies append-only
   lifecycle and revocation decisions, and never silently replaces a lock.
4. `source_baseline_absent` prevents a non-legacy package from promotion; it
   does not hide the absence or claim provenance.
5. Composer blocks untrusted new-plan selection before output writes and emits
   a digest-only trust manifest without changing the component lock.
6. Leave and expense proof preserves identical Stage 1 locks, validates trust
   output privacy, rejects revoked locks explicitly, and proves cleanup.
7. Required fresh evidence passes:

   ```powershell
   python -m unittest discover -s tests/agents -v
   python -m unittest discover -s tests/api -v
   python -m unittest discover -s tests/executor -v
   node --check apps/web/app.js
   git diff --check
   ```

## Tasks

| ID | Task | Owner / specialization | State | Dependencies | Allowed write paths | Completion gate |
| --- | --- | --- | --- | --- | --- | --- |
| TR-01 | Governance and source-baseline gate | PM | accepted | ADR-004 accepted | This ledger; `docs/project-status.md` | ADR, scope, delegated acceptance, frozen-v1 rule, and `source_baseline_absent` are recorded. |
| TR-02 | Trust contracts and contained fixture corpus | Integration | accepted | TR-01 | `docs/contracts/factory-trust-*-v1.schema.json`; `tests/fixtures/trust/**`; `tests/api/test_trust_contract.py` | Closed versioned schemas, valid/hostile fixtures, official SPDX 3.0.1 conformance, and focused passing tests are independently reviewed and accepted. |
| TR-03 | Offline validator and evidence verification | Integration | accepted | TR-02 | `apps/api/trust_contract.py`; `tests/api/test_trust_contract.py` | Local-only canonical validation, digest, DSSE, SPDX, provenance, signer, and no-network regressions are independently reviewed and accepted. |
| TR-04 | Trusted Registry lifecycle and migration | Integration | planned | TR-03 | `apps/api/trusted_registry.py`; `packages/trust/**`; `tests/api/test_trusted_registry.py` | Append-only records/revocations work; legacy is explicit; `source_baseline_absent` blocks promotion. |
| TR-05 | Composer trust gate and safe evidence output | Integration | planned | TR-04 | `apps/api/component_composer.py`; `tests/api/test_component_composer.py`; `tests/api/test_trusted_composition.py` | Trust gate precedes writes; locks are unchanged; digest-only manifest is contained. |
| TR-06 | Executor proof, QA, and release review | QA / Reviewer / PM | planned | TR-05 reviewed | PM-assigned test path only; this ledger; `docs/project-status.md` after acceptance | Two-product smoke, privacy, no-network, cleanup, and independent review show no unresolved P0/P1. |

## Handoff and stop rules

- Integration begins only TR-02 and serializes TR-02 through TR-05. Any
  required Stage 1 contract, package, Compose topology, or lock change stops
  the task and returns it to PM/Controller governance.
- A task hand-off includes changed paths, focused RED/GREEN evidence, exact
  commands and output, residual risks, and an assertion that no secret/raw
  evidence was emitted.
- Task review is read-only. P0/P1 returns work to the same Integration writer;
  after three failed repair/review cycles PM records `blocked` and escalates
  the changed scope.
- `source_baseline_absent` remains visible through release. It blocks only
  promotion, not legacy inspection, fixture validation, or implementation.

## PM decision log

- **2026-07-26:** ADR-004 accepted under delegated Controller authority.
  TR-01 is accepted. The Stage 2 programme is `implementing`, but TR-02 is
  the only authorized next write task. No Stage 1 contract, package, lock, or
  promotion state may change.
- **2026-07-26:** Independent re-review found no P0, but found a P1: the
  purported valid SPDX 3.0.1 JSON-LD fixture does not pass the official SPDX
  3.0.1 schema while the local validator accepts it. It also found a P2:
  `.invalid` URLs conflict with the plan's no-external-URL fixture rule. The
  same Integration writer is repairing both findings; TR-04 remains blocked.
- **2026-07-26:** The fourth review confirmed that the normal SPDX fixture now
  passes the official schema, but found a remaining P1: the local retained
  subset accepts invalid IRI-like values. Integration is adding strict syntax
  validation and a re-signed regression. The plan's fixture wording was
  clarified to permit inert, fixed standards identifiers such as the SPDX
  JSON-LD context while continuing to prohibit fetchable/unapproved locations;
  no runtime dereference is permitted.
- **2026-07-26:** Fifth independent review found no P0/P1/P2. The valid SPDX
  3.0.1 JSON-LD evidence passes the official schema; the re-signed non-IRI
  `createdBy` attack and all prior cryptographic/path regressions reject.
  Final baseline QA passed governance 4/4, API 140/140, Executor 24/24, trust
  22/22, JavaScript syntax, and diff checks. The Controller accepted and froze
  TR-02/TR-03. TR-04 is the next serialized implementation task.
