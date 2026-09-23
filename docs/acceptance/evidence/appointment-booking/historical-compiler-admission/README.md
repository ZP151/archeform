# Historical booking compiler admission

Date: 2026-09-24. Scope: restore the frozen TypeScript generic booking compiler
behavior while retaining current Appointment admission. This is not a new product,
runtime, capacity guarantee, migration, deployment or whole-branch CI acceptance.

## Authority and frozen identities

- Accepted ADR-0077 SHA-256:
  `67b2c9331ae604b2624b77273ba91b38908282dcedc98d3bdb1f2533d1d77c1f`.
- Private admission source SHA-256:
  `23854a1cf0fade62e83196c1cc909c44cd4882817c0c1fdb2d6464848781bc7f`.
- Focused test SHA-256:
  `1bf43979bc79d2b93f5ea4dc9c0a550991477957b0571bd215212e821dc08af2`.
- Unchanged historical fixture SHA-256:
  `0fef3e089a838e38091da2e78910ae460e21834eda18a12ffb272b27757a1614`.

The historical witness checks complete entities, relations, policy, workflow and
six package selections, with only the accepted owner-aware normalization and
paired secondary Service reference. It independently checks the Graph checksum,
reconstructed lock and embedded selections at bundle and actual page seams.
Historical matches return to generic compilation, never bypass numeric admission.
Current Appointment with missing capability and numeric domains remains rejected.

## Reproduced verification

| Check                                                 | Observed result                             |
| ----------------------------------------------------- | ------------------------------------------- |
| Initial historical regression                         | RED: four expected failures out of 64 cases |
| Final focused admission suite                         | GREEN: 99/99                                |
| Four existing historical runtime suites               | 78/78                                       |
| Existing Appointment admission title selection        | 60 passed, 17 unselected                    |
| Compiler typecheck and owned-source/test formatting   | Passed                                      |
| Independent Astra task review after scoped correction | P0/P1/P2 0/0/0                              |

The task reviewer found one P2 in the first test version: separately locked input
checked determinism without comparing the frozen historical content. Extending
the baseline assertion reproduced one expected failure in that form while the
embedded form passed. The correction maps only the changed Graph checksum and
lock digest in exactly five metadata files, with literal occurrence counts.
It then checks the same complete ordered manifest, manifest hash and bundle hash
twice for both input forms. Six negative cases ensure wrong/missing/duplicate
digests, unexpected paths and unrelated content changes remain detectable.
Generated files, inputs and the historical fixture are asserted immutable.

Independent Terra QA passes 99/99, targeted formatting and diff checks, with
P0/P1/P2 0/0/0. Independent Sol judgment also closes 0/0/0, verifies the frozen
identities and unchanged current-profile branch, and approves bounded source
delivery. PM accepts this compatibility correction. Retain unaffected 78/60
evidence; the P2 correction changes only the focused test. Inventory work and
whole-branch release acceptance are excluded.
