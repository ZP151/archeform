# Task Ledger: composer-scaffold-fixture-collision-hygiene

- **State:** accepted
- **Owner:** pm
- **Single write owner:** `/root` (integration test writer)
- **Specialization:** integration
- **Contract owner:** not applicable
- **Contract status:** not applicable
- **Contract artifact:** not applicable; deterministic test setup only
- **Allowed write paths:** `tests/api/test_composable_control_plane.py`; this
  ledger; `docs/superpowers/plans/2026-07-28-composer-scaffold-fixture-collision-hygiene.md`; and
  `docs/project-status.md` only for the PM's final acceptance record.
- **Read-only parallel work:** task review, QA, and release review after the
  writer hand-off. No concurrent writers.
- **Approved ADR:** not required. No framework, runtime, schema, contract,
  package identity, dependency, or topology changes.
- **Plan:** `docs/superpowers/plans/2026-07-28-composer-scaffold-fixture-collision-hygiene.md`

## Task card

### Outcome

Make the existing Composer scaffold-collision regression deterministic after
the fixture gained an empty `frontend/app-shell` directory. The test setup may
create an already-present directory, but the intentional colliding file and
the Composer's fail-closed assertion remain mandatory.

### Non-goals

- Product code, Composer logic, Registry policy, scaffold contents, generated
  applications, package assets, or manifests.
- New or modified API/data/shared-template contracts.
- Test weakening, unrelated test cleanup, dependency changes, or a real-model
  call.

### Safety invariants

- The Composer must continue to reject a tampered or conflicting scaffold
  before materialization and leave no output directory.
- The repair must not mask a path-containment, manifest, or composition error.
- The write boundary is exactly one existing test setup statement.

### Dependencies

- The confirmed fixture condition: copying
  `packages/composer-scaffold/1.0.0` can already create
  `frontend/app-shell` before the test creates its deliberate collision.
- Existing frozen Composer/Registry contracts are read-only.

## Acceptance criteria

1. `test_composer_rejects_tampered_or_conflicting_runtime_scaffold_before_output`
   passes with its deliberate collision in place.
2. The test still asserts the exception and no output materialization.
3. No path outside the allowed boundary changes.
4. Fresh focused, full API, agent, JavaScript syntax, and diff checks pass, or
   independent failures are preserved and explicitly reported for their own
   governed slice.

## Coordination

This is a serialized, test-only repair. A path or scope expansion stops work
and returns it to PM. The v1.1 Factory UI Kit successor remains a separate
active slice and is not modified by this task.

## Implementation evidence

- **Changed paths:** `tests/api/test_composable_control_plane.py` only.
- **RED:** confirmed full API failure is `FileExistsError` at the test's
  `collision.parent.mkdir(parents=True)` after `copytree` has copied the
  fixture-owned empty directory.
- **GREEN:** fresh targeted Composer collision test, Console workflow and
  accessibility E2E, full API and agent suites, JavaScript syntax, and
  `git diff --check` were reported green on 2026-07-28.
- **Residual risks:** a full API run may identify unrelated active-slice
  failures; this task neither fixes nor reclassifies them.

## Task review

- Fresh task review found no P0/P1. The intentional collision and no-output
  assertion remain intact within the one-file test boundary.

## QA

- Fresh QA found no P0/P1: the targeted collision test, full API/agent suites,
  JavaScript syntax, and diff gate remained green within the authorized test
  boundary.

## Release review

- Independent release review passed with no P0/P1.

## PM decision

- **2026-07-28:** PM created this narrowly-scoped test-hygiene task and
  authorized the named single writer. Governance does not require an ADR:
  there is no technology, dependency, production, API/data-contract, or
  deployment-topology change.
- **2026-07-28:** On the reported green focused and repository gates, PM moved
  this test-only task from `implementing` to `ready_for_qa`. Task review, QA,
  and release review remain required before acceptance.
- **2026-07-28:** QA and independent release review found no P0/P1. PM advanced
  the task from `ready_for_qa` to `reviewed`, then Founder-delegated Controller
  accepted it and PM advanced it to `accepted`.
