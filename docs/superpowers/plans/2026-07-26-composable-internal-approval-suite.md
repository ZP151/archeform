# Composable Internal Approval Suite task card

- **Task ID:** CIS-01
- **Programme state:** planned
- **Task owner / single write owner:** PM
- **Specialization:** integration (governance only; no production writer is
  authorized)
- **Contract owner:** Integration
- **Contract status:** unfrozen
- **Contract artifact:** not yet created; the future artifacts are
  `factory-component/v1` and `factory-composition/v1`, to be frozen only by
  Integration after founder acceptance of ADR-003
- **ADR gate:** The founder accepted the ADR-003 recommendation on 2026-07-26.
  That decision is recorded in the CIS ledger; the original Tech Lead proposal
  remains unchanged under the PM-only write constraint.
- **Allowed write paths for this task:** this task card and
  `docs/superpowers/ledgers/composable-internal-approval-suite.md` only
- **Read-only parallel work:** CIS-02 Explorer migration map and CIS-03 Market
  Research report; neither changes product code, contracts, or ledger state

## Outcome

Establish controlled governance for an experiment that composes leave and
expense approval applications from the same independently versioned,
digest-locked first-party packages, varying only through validated application
inputs.

## Non-goals

- Product-code, contract, package, Registry, Composer, Compose-topology, or
  generated-application changes.
- Contract freeze, implementation dispatch, or a change to the VNext HTTP or
  Executor boundary.
- External package acquisition, public registry operation, cloud deployment,
  executable adapters, arbitrary model-directed composition, or new profiles.
- Founder acceptance of ADR-003 on the founder's behalf.

## Dependencies and current gate

1. CIS-02 has provided the accepted read-only central-renderer migration and
   regression map at `docs/reports/central-renderer-migration-map.md`; CIS-03
   has provided the accepted public-source ecosystem report in the
   2026-07-26 Composable Internal Approval Suite section of
   `docs/market-validation.md`. These are ADR decision inputs, not a frozen
   contract or implementation authorization.
2. The founder accepted ADR-003 after reviewing the accepted discovery
   hand-offs. The programme remains `planned`; this does not itself freeze a
   contract or authorize a production writer.
3. Integration, as the sole shared-contract writer, may now be assigned CIS-05
   to create, test, and freeze the versioned `factory-component/v1` and
   `factory-composition/v1` artifacts.
4. PM may authorize the three Wave 2 writers only after the Integration
   hand-off names the frozen contract version and has recorded its evidence in
   the ledger.

## Acceptance criteria

1. The task card and ledger name the outcome, non-goals, safety boundaries,
   owner, single write owner, specialization, contract owner/status/artifact,
   dependencies, allowed paths, and next hand-off.
2. The suite remains `planned`; no task is represented as implementing and no
   production or contract path is authorized.
3. The task card preserves the requirement that leave and expense use identical
   package locks and differ only through locally validated inputs.
4. The next hand-off is unambiguous: assign the Integration-owned CIS-05
   contract-freeze task; no Wave 2 writer is authorized until that task has
   handed off a frozen versioned contract and passing evidence.

## Next required hand-off

PM may assign the Integration-owned CIS-05 shared-contract freeze task. The
assigned engineer must define and test the versioned contract artifacts before
any Wave 2 writer is authorized.

## Safety invariants

- A model may emit only the bounded Application Definition; it may not choose
  packages, paths, adapters, URLs, dependencies, code, runtime topology, or
  deployment targets.
- Composer must eventually accept only Golden first-party digest-locked
  packages, apply declarative adapters only to declared output slots, and fail
  closed on conflicts, containment failures, missing dependencies, or
  incompatibility.
- Raw briefs, API keys, capability tokens, and full model responses remain out
  of source control, state, generated output, logs, screenshots, and reports.
- A shared-contract or output-slot change pauses concurrent writers and returns
  ownership to Integration.

## Planned implementation sequence

## Shared package contract

```text
packages/components/<component-key>/<version>/
  component.json
  adapter.json
  templates/
  fixtures/
  tests/
```

`component.json` declares key, version, package root, deterministic digest,
category, provides, requires, compatibility, input schema, output slots,
verification evidence, and lifecycle state. `adapter.json` declares bounded
contributions only; it cannot execute code or select arbitrary paths.

`factory-composition/v1` contains the Application Definition checksum, exact
selected key/version/digest locks, normalized validated inputs, dependency
graph, adapter order, and generated-output manifest with checksums.

## Work breakdown and dependencies

| Task | Owner | Depends on | Scope | Completion evidence |
| --- | --- | --- | --- | --- |
| 1. Baseline verification | Integration | None | Preserve current live-model and Executor safety evidence | Fixture suite plus guarded live smoke record with no secrets |
| 2. ADR and task governance | Tech Lead / PM | Explorer and Market reports | ADR 003, task cards, ledger, workstream guide | Founder acceptance and PM state record |
| 3. Freeze shared contracts | Integration | Accepted ADR | JSON schemas, fixture packages, contract tests | Contract tests and frozen version |
| 4. Frontend asset packages | Frontend | Frozen contract | Eight UI packages and isolated tests | Package fixtures/tests pass |
| 5. Backend and data assets | Backend / Platform | Frozen contract | Auth, RBAC, records, workflow, audit, PostgreSQL packages | Package fixtures/tests pass |
| 6. Registry and Composer | Integration | Frozen contract | Package loading, Golden filtering, graph, locks, adapters, output verification | Rejection and composition tests pass |
| 7. Leave and expense proof | QA | Tasks 4-6 reviewed | Validated input fixtures, generation, run/stop/smoke | Same locks; different validated artifacts and passing smoke |
| 8. Release review | Reviewer / PM | QA | Independent release assessment and ledger decision | Accepted release record or blocking findings |

Tasks 4, 5, and 6 are the only parallel writers. A shared-contract or output
slot change pauses all three and returns to Task 3.

## Component suite scope

### Frontend assets

`ui.login-page`, `ui.app-shell`, `ui.home-page`, `ui.profile-page`,
`ui.system-settings-page`, `ui.approval-form`, `ui.my-requests`, and
`ui.approval-queue`.

### Backend, workflow, and runtime assets

`backend.session-auth`, `backend.rbac`, `backend.record-api`,
`workflow.single-level-approval`, `ops.audit-log`, and
`data.postgres-runtime`.

## Required safety and acceptance tests

- Missing, digest-mismatched, incompatible, unsigned, or non-Golden packages
  fail closed.
- An adapter cannot write outside its declared output slots.
- Model output cannot select package keys, file paths, URLs, dependencies,
  adapters, or arbitrary code.
- Leave and expense fixtures resolve to identical key/version/digest locks.
- Fields, labels, validated schema, database schema, and UI vary only through
  approved inputs.
- Both generated applications pass role-aware submit, approve, and audit smoke
  tests; local Executor run, stop, and Docker cleanup are evidenced.
- Raw briefs and real-model credentials are absent from state, output, logs,
  screenshots, and reports.

## Explicit non-goals

- Cloud deployment, external component harvesting, external artifact
  publishing, and multiple application profiles.
- Arbitrary code generation, executable package adapters, and unrestricted
  model-directed composition.
