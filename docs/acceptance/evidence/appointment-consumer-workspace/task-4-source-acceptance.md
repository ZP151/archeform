# Appointment V2 default-selection source acceptance

Status: source and deterministic acceptance only, 2026-09-24.

Fresh supported Appointment requests select the V2 definition and reuse the
automatic consumer lifecycle. Explicit historical V1 projection remains available
with a truthful manual explanation. All ten historical data rows and their raw
source prefix are preserved. The catalogue has eleven physical rows, ten logical
definitions and six previously demonstrated runtime families.

Authority: accepted ADR-0081 SHA-256
`65f867c7afeeefc892b8493e508d86d5d212302fcc247e927843ce05b6672adc`.
The implementation plan and active ledger retain the standing acceptance record.

The reviewed scope has 23 files: the writer's 21-path slice (18 changed) and the
root's two case-index paths. Independent `scope_recovery_task_review` verifies
all source/baseline hashes and closes P0/P1/P2 at 0/0/0. Independent Terra
`appointment_default_qa` verifies the same hashes before and after its checks:

| Focused check                                                         | Result  |
| --------------------------------------------------------------------- | ------- |
| Adapter definition selection, interpretation and historical admission | 306/306 |
| Workbench family, generation lifecycle and Home                       | 175/175 |
| Worker Graph-based verification                                       | 33/33   |
| Scoped whitespace and 23-file hash stability                          | Pass    |

Retained writer evidence includes 38 capability cases, affected typechecks and
builds, and the successful second eight-step definitions run. The first combined
lane stopped while the concurrently rewritten E2E file was briefly absent; its
failed result remains recorded. The first Workbench combined run also retained
a test import failure, corrected before the independent 175-case success.

Working snapshots and complete commands are retained under
`generated/.appointment-v2-task4-review` and
`generated/.appointment-v2-task4-completion`; they are local ignored artifacts.
The latter manifest SHA-256 is
`a5d9d62c9d3381a8e30396be4c47909275e1155cb2266daa87e1b6a8877d00cd`.

The migrated actual case is under source correction. No actual Preview,
PostgreSQL journey, new hosted endpoint, shipped default, logical product or
runtime-family count is established by this source acceptance. Existing CI covers
the previously pushed base, not these uncommitted changes.
