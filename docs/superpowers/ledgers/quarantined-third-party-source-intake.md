# Quarantined Third-Party Source Intake and shadcn/ui v2 ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

Only the PM changes task or programme state. The Controller exercises the
founder-delegated PM authority for this autonomous workstream. Integration is
the single writer for every implementation task in this ledger.

## Programme state

| Field | Value |
| --- | --- |
| State | planned |
| Scope | Offline, quarantined third-party source intake and an optional shadcn-derived UI v2 migration. |
| Approved ADR | `docs/adr/005-quarantined-third-party-source-intake-and-shadcn-ui-v2.md` — accepted by the Controller on 2026-07-26. |
| Dependencies | ADR-004 Stage 2 trust formats, lifecycle Registry, and Composer trust gate must be accepted first. |
| Contract owner | Integration |
| Frozen contracts | Stage 1 component, adapter, composition, HTTP, role, and Compose contracts remain unchanged. |
| Source baseline | Established locally at root commit `d14b41dec8dd5009e1c7393e76b540ec7522a71b`; no remote is configured. |
| Promotion decision | Still blocked. No third-party candidate can become Golden, be selected by a new plan, alter the v1 policy, or enter generated output until offline evidence verification and an explicit promotion decision exist. The Git-baseline prerequisite alone authorizes neither intake nor promotion. |
| External action | None assigned. No download, clone, vendoring, account, publication, or network intake is authorized by this ledger. |

## Outcome and non-goals

- **Outcome:** Define a reversible, offline-verifiable path for a fixed-source,
  MIT-attributed candidate intake and immutable `ui.*@2.0.0` successors without
  mutating existing v1 packages, locks, generated outputs, or the static
  console.
- **Non-goals:** Performing the actual source acquisition; installing shadcn,
  npm, Git, or a package manager during resolution; changing a frozen contract;
  promoting a candidate; enabling v2 new-plan selection; replacing the current
  console; creating a Git baseline; or publishing anything externally.

## Acceptance gates

1. ADR-004 trust-contract, lifecycle, and Composer-gate work is accepted with
   no unresolved P0/P1 finding.
2. A future intake uses exactly the ADR-005 commit and records a complete,
   local snapshot, MIT notice, candidate index, dependency closure, SPDX SBOM,
   provenance, DSSE signature, policy result, and immutable package digests.
3. v1 exact locks remain byte-for-byte replayable and are never upgraded to
   v2 implicitly; bare-key ambiguity, candidate selection, deprecated new-plan
   selection, and revocation all fail closed.
4. No adapter, Registry, Composer, console, generated application, or test
   path fetches, installs, executes, or resolves a third-party source remotely.
5. The initial baseline, independent evidence verification, and an explicit
   promotion decision are recorded before any v2 package is Golden or emitted.

## Tasks

| ID | Task | Owner / specialization | State | Dependencies | Allowed write paths | Completion gate |
| --- | --- | --- | --- | --- | --- | --- |
| QSI-01 | Governance, isolation, and migration gate | PM / Controller | accepted | ADR-005 accepted | This ledger; `docs/project-status.md` | Acceptance, scope, no-external-action rule, and promotion blocker are recorded. |
| QSI-02 | Offline intake contract and hostile fixture design | Integration | planned | TR-06 accepted; QSI-01 | Future task card only; no source tree | Contract specifies fixed-SHA acquisition, enumeration, path/notice/closure rejection, and no-network evidence without acquiring source. |
| QSI-03 | Quarantined candidate intake implementation | Integration | blocked | QSI-02; explicit external-source authorization | `packages/vendor/shadcn-ui/**`; candidate-index code/tests; assigned trust paths only | Exact snapshot and contained evidence verify offline; no candidate is Golden/selectable. |
| QSI-04 | v2 package and console migration | Frontend + Integration serialized | blocked | QSI-03 reviewed; explicit promotion authorization | Explicit future paths only | Eight v2 packages, primitive ownership, console compatibility, and v1 replay tests pass. |
| QSI-05 | Promotion and new-plan policy | Integration / PM | blocked | QSI-04 reviewed; authorized Git baseline; passing trust evidence; explicit promotion decision | Explicit future paths only | Only permitted Golden v2 locks are selectable; rollback preserves all locks/evidence. |

## Stop and hand-off rules

- Do not begin QSI-02 while ADR-004/TR-06 is incomplete. QSI-03 through QSI-05
  require their listed gates; `blocked` is intentional, not a failure.
- Any request to change a frozen schema, output slot, runtime profile, Origin,
  HTTP API, Compose topology, or component lock returns to ADR governance.
- Every hand-off states changed paths, exact commands/output, residual risks,
  whether an external action occurred, and proof that no credential, raw source
  archive, SBOM/provenance payload, or private key entered generated output.
- No worker may convert this ledger's acceptance into permission to create a
  Git commit or contact/download from an external service.

## PM decision log

- **2026-07-26:** ADR-005 accepted under delegated Controller authority. QSI-01
  is accepted. The programme remains `planned`; the Stage 2 trusted-registry
  slice is the only implementation work in progress. No external intake or
  v2 migration writer is assigned.
