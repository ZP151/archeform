# Composer Scaffold Fixture Collision Hygiene — task card

## Outcome

Restore deterministic full-API verification when the Composer collision
regression copies the repository-owned scaffold fixture.  The test must create
its intentional conflicting `ApplicationShell.tsx` file whether or not the
empty `frontend/app-shell` directory already belongs to the copied fixture.

## Non-goals

- Change the Composer, Registry, scaffold contents, component packages,
  application contracts, generated output, or runtime behaviour.
- Add a framework, dependency, ADR, source intake, credential, or network
  operation.
- Relax the collision regression or hide a real Composer rejection.
- Change any test other than the one setup statement named below.

## Scope and ownership

- **Task ID:** `composer-scaffold-fixture-collision-hygiene`
- **Owner:** PM
- **Single write owner:** `/root` (integration test writer)
- **Specialization:** integration
- **Contract status:** not applicable; this is deterministic test-fixture setup
  hygiene, not a production or shared-contract change.
- **Allowed implementation path:**
  `tests/api/test_composable_control_plane.py`
- **Permitted documentation paths:** this task card, its ledger, and
  `docs/project-status.md` only when PM records final acceptance.

## Required minimal repair

At the intentional collision setup near the copied scaffold root, make the
parent-directory creation idempotent.  The test must still write the collision
file and must still prove that the Composer rejects it before creating output.

## Acceptance criteria

1. The existing Composer collision regression no longer errors merely because
   `frontend/app-shell` already exists in the copied fixture.
2. The regression still fails closed for a tampered or conflicting runtime
   scaffold and verifies that no output directory was created.
3. No product, scaffold, package, contract, generated-output, or unrelated
   test path changes.
4. The focused test and the required repository verification gates pass, or
   any independent failure is recorded without broadening this task.

## Verification order

```powershell
py -3.12 -m unittest tests.api.test_composable_control_plane.ComposableControlPlaneTests.test_composer_rejects_tampered_or_conflicting_runtime_scaffold_before_output -v
python -m unittest discover -s tests/api -v
python -m unittest discover -s tests/agents -v
node --check apps/web/app.js
git diff --check
```

## Stop rules

- Stop and return to PM if the focused test reveals a Composer or scaffold
  defect rather than a directory-creation collision.
- Stop if any code path, fixture content, contract, or test outside the single
  allowed test file needs to change.
- No completion decision without task review, QA, and release review evidence.
