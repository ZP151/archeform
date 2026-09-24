# Appointment V2 actual consumer delivery

Status: pending actual execution. This directory is a future per-attempt evidence
destination, not acceptance evidence. The migrated case is
`e2e/appointment-booking.spec.ts`, selected by `appointment-booking-v2`.

The current source/component repair is recorded in
[Appointment workspace evidence](../../appointment-consumer-workspace/README.md).
Default activation source and the migrated case source now pass their scoped
reviews; real ordinary-user entry remains pending. Task 5 independent reviewer
`appointment_case_source_review` closes 0/0/0 after verifying five source and
four baseline hashes. Frozen case SHA-256:
`2bcbbcc7b0feb3d67afdd28e3f0c9d8e3e59a8d98cfa7c9161261fbbc3626e55`.
The tracked strict check `pnpm exec tsc -p e2e/tsconfig.consumer-delivery.json`
passes, discovery finds one case and the shared helper tests pass 11/11. These
are source checks, not an actual business run or screenshot acceptance.
Actual execution remains subject to the recorded local-startup policy rejection;
no alternative startup or hosted deployment is implied by this registration.

Each future attempt must retain named visible states, persisted cross-role
request/confirm/reschedule/confirm/cancel history, conflicts/recovery, API restart,
before/after immutable identity, measured user effort and scoped resource cleanup.
Use unique attempt directories and preserve failures. The historical V1 local
runtime evidence remains at `docs/acceptance/evidence/appointment-booking`; its
explicit definition and immutable compiler compatibility checks remain retained.

V2 replaces one logical product. Eleven physical definition rows still represent
ten active logical definitions and six previously demonstrated runtime families;
this directory does not increase accepted or hosted product counts.
