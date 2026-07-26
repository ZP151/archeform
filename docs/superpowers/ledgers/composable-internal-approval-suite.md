# Composable Internal Approval Suite ledger

**PM-owned state machine:** `planned -> implementing -> ready_for_qa -> reviewed -> accepted`

Only the PM may change a task state. Engineers, reviewers, and QA append
evidence through their hand-offs but do not alter the state field.

## Programme state

| Field | Value |
| --- | --- |
| State | accepted |
| Scope | Composable Internal Approval Suite MVP |
| Contract owner | Integration |
| Contract status | frozen |
| Contract artifact | `docs/contracts/factory-component-v1.schema.json`, `docs/contracts/factory-component-adapter-v1.schema.json`, and `docs/contracts/factory-composition-v1.schema.json`, verified by CIS-05. |
| Approved ADR | `docs/adr/003-first-party-component-packages-registry-and-declarative-composer.md` — founder accepted its recommendation on 2026-07-26; the proposal file remains unchanged under the PM-only write constraint. |
| Current gate | Component Suite MVP accepted; Stage 2 trusted supply-chain work is next. |
| Parallel writer limit | 3 after contract freeze |
| Current allowed write paths | Task-specific Wave 2 package or Registry/Composer paths only; shared contract changes remain serialized through Integration. |
| Read-only parallel work | Task review, QA, and release review follow their corresponding writer hand-offs. |

## CIS-01 task card reconciliation

- **Outcome:** Govern a bounded, reversible Component Suite experiment that
  proves leave and expense approval applications can share exact first-party
  component locks and vary only through validated inputs.
- **Non-goals:** Product implementation; shared-contract work; Registry,
  Composer, package, topology, or generated-app changes; external acquisition;
  cloud execution; executable adapters; model-directed package selection; and
  founder acceptance on behalf of the founder.
- **Owner / single write owner:** PM.
- **Specialization:** integration (governance only).
- **Contract owner:** Integration.
- **Contract status / artifact:** unfrozen / not yet created. The future
  versioned artifacts are `factory-component/v1` and
  `factory-composition/v1`.
- **Allowed write paths:**
  `docs/superpowers/plans/2026-07-26-composable-internal-approval-suite.md`
  and `docs/superpowers/ledgers/composable-internal-approval-suite.md` only.
- **Dependencies:** Accepted CIS-02 and CIS-03 discovery evidence; fulfilled
  by the founder's 2026-07-26 acceptance of ADR-003. CIS-05 remains the next
  serialized task.
- **Acceptance criteria:** The task card and ledger record complete scope,
  non-goals, ownership, contract gate, safety constraints, allowed paths,
  dependencies, and hand-off order; the programme remains `planned`; no
  production or contract path changes.
- **Next required hand-off:** Assign the Integration-owned CIS-05
  contract-freeze task. Its engineer must return the frozen contract version,
  exact paths, passing contract evidence, and residual risks before any Wave 2
  writer is authorized.

## Tasks

| ID | Task | Owner | State | Dependencies | Evidence / next hand-off |
| --- | --- | --- | --- | --- |
| CIS-01 | Wave 0 governance reconciliation | PM | accepted | Required governance reading | Task card and ledger reconciled; programme remains planned and no production path is authorized. |
| CIS-02 | Central renderer migration map | Explorer | accepted | CIS-01 guide | Accepted discovery evidence: `docs/reports/central-renderer-migration-map.md`; inputs to ADR-003 only. |
| CIS-03 | Public ecosystem research | Market Researcher | accepted | CIS-01 guide | Accepted discovery evidence: `docs/market-validation.md` (2026-07-26 CIS section); inputs to ADR-003 only. |
| CIS-04 | Component package and Composer ADR | Tech Lead | accepted | CIS-02, CIS-03 accepted | Founder accepted ADR-003 on 2026-07-26; no implementation authorization is implied. |
| CIS-05 | Shared contract freeze | Integration | accepted | CIS-04 accepted | Frozen v1 schemas, fixtures, and 20/20 contract tests passed; independent review found no P0/P1/P2. |
| CIS-06 | Frontend asset packages | Frontend | accepted | CIS-05 accepted | Eight Golden UI packages, typed bindings, enum select support, and generated-browser integration reviewed. |
| CIS-07 | Backend and data asset packages | Backend / Platform | accepted | CIS-05 accepted | Six Golden backend/data/workflow packages, signed local session, package-owned CRUD/workflow/audit, and security review passed. |
| CIS-08 | Registry and Composer | Integration | accepted | CIS-05 accepted | Golden discovery, locks, contained materialization, Composer-owned scaffold, tamper/TOCTOU rejection, and review passed. |
| CIS-09 | Two-application proof | QA | accepted | CIS-06, CIS-07, CIS-08 reviewed | QA passed leave and expense real Docker/Playwright flows, lifecycle cleanup, privacy, and fail-closed tests. |
| CIS-10 | Release review and acceptance | Reviewer / PM | accepted | CIS-09 | Independent architecture review and QA passed with no unresolved P0/P1. |

## Wave 0 evidence

| Date | Item | Result | Owner |
| --- | --- | --- | --- |
| 2026-07-26 | Required workstream guide | Created | PM |
| 2026-07-26 | Roadmap and implementation plan | Created | PM |
| 2026-07-26 | CIS-01 task card and ledger reconciliation | Accepted as PM governance evidence; no product or contract paths changed | PM |
| 2026-07-26 | CIS-02 Explorer report | **Accepted** as discovery evidence. Maps current renderer responsibilities to package/Composer-slot ownership, migration order, coupling risks, and regression paths. Evidence: `docs/reports/central-renderer-migration-map.md`. Open ADR input: audit-UI slot ownership. | PM |
| 2026-07-26 | CIS-03 Market Research report | **Accepted** as public-source discovery evidence. Records dated direct sources and ADR inputs for immutable identity, declarative composition, provenance/SBOM, SPDX licensing, and no-runtime-download boundaries. Evidence: `docs/market-validation.md` (2026-07-26 CIS section). It is not legal advice or Stage 2 supply-chain authorization. | PM |
| 2026-07-26 | ADR 003 | **Founder accepted.** Accepted CIS-02/CIS-03 evidence supports the bounded, reversible experiment. The decision authorizes only PM assignment of CIS-05; it does not freeze a contract or authorize any Wave 2 writer. | Founder / PM |
| 2026-07-26 | CIS-05 contract freeze | **Accepted by Controller.** V1 schemas, validator, fixtures, and 20/20 focused tests passed; 4/4 agent and 94/94 API regressions passed; independent review reported no P0/P1/P2. | Integration / Reviewer / Controller |
| 2026-07-26 | CIS-06 to CIS-08 implementation | **Accepted by Controller.** Fourteen real Golden packages, Registry/Composer locks, contained materialization, package-owned backend behavior, and Composer-owned runtime scaffold passed independent review. | Engineering / Reviewer / Controller |
| 2026-07-26 | CIS-09 two-product QA | **Accepted by Controller.** Leave and expense used identical locks with distinct validated UI/schema inputs; full Docker/Playwright signed-cookie submit, role switch, approve, audit, stop, and cleanup passed. | QA / Controller |
| 2026-07-26 | CIS-10 release review | **Accepted by Controller.** Architecture review and QA reported no unresolved P0/P1. | Reviewer / QA / Controller |

## PM update rules

- Wave 2 writers consume the frozen v1 contract without changing it. Any
  shared-contract, output-slot, adapter-operation, or Compose-topology change
  pauses all three writers and returns ownership to Integration.
- `implementing` begins only after the Integration-owned contract freeze is
  handed off with a frozen versioned artifact and passing contract evidence.
- `ready_for_qa` requires all three Wave 2 tasks reviewed without unresolved
  P0/P1 findings.
- `reviewed` requires QA and independent release review.
- `accepted` requires the PM to record the founder-facing acceptance decision.

## PM decision

- **2026-07-26:** CIS-01 is accepted as a documentation-only governance task.
  The Component Suite programme remains `planned`. ADR-003 is proposed, the
  contract is unfrozen and absent, and CIS-02/CIS-03 evidence plus a founder
  decision are required before CIS-05 may be assigned.
- **2026-07-26:** CIS-02 and CIS-03 are accepted as read-only discovery
  evidence. Their acceptance does not accept ADR-003, freeze a contract, or
  authorize implementation. The programme remains `planned`; the next gate is
  the founder's explicit ADR-003 decision.
- **2026-07-26:** Founder accepted ADR-003. CIS-04 is accepted. The programme
  remains `planned`, the contract remains unfrozen and absent, and the only
  newly authorized action is PM assignment of CIS-05 to Integration for the
  serialized contract-freeze hand-off.
- **2026-07-26:** Controller accepted CIS-05 after Integration's 20/20 contract
  tests, 4/4 agent tests, 94/94 API tests, syntax/diff checks, and an
  independent re-review with no P0/P1/P2 findings. Wave 2 is authorized.
- **2026-07-26:** Controller accepted CIS-06 through CIS-10 after independent
  architecture review, QA, package/contract/API/Executor suites, and real
  leave-and-expense Docker/Playwright evidence. The programme is accepted.
