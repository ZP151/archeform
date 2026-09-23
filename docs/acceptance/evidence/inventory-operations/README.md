# Inventory Operations actual local acceptance

Date: 2026-09-24. Source base: `58d305de111563500652bf3b51454a7e3122ddf5`.
Definition: `supplies-stockroom`; family: `inventory-operations/v1`.
Scope: authored local demo roles and one whole-item stock pool. Independent Terra
QA and Sol final judgment close P0/P1/P2 0/0/0. PM accepts this narrow local family
for root-owned branch delivery; no repository release or hosted approval follows.

## Attempts and actual results

| Attempt                                | Outcome                              | Ready      | First completed stock job | Total including Preview cleanup |
| -------------------------------------- | ------------------------------------ | ---------- | ------------------------- | ------------------------------- |
| `4be6c434-bcb7-45ca-ad3a-80345963539a` | Failed at over-issue alert assertion | 192,635 ms | 196,150 ms                | 213,120 ms                      |
| `f0cfb8f9-b769-4bec-8955-8580a14693ee` | Passed, exit 0, one case             | 199,288 ms | 202,860 ms                | 238,805 ms                      |

Both attempts are preserved with source hashes, immutable Published/Compilation
identities, fixed database facts, phase timings and actual generated screenshots.
Outer image construction and service preparation are excluded from these timings.
The successful prepared-local run meets the 300,000 ms readiness target. These
authored selections make no model call and include no ordinary-user study.

The first attempt correctly rejected over-issue with HTTP 409 and kept the user's
quantity and reason. Its global `alert` locator also matched Next's route announcer.
A focused Chromium reproduction using the installed announcer failed for both
affected states, then passed when scoped to `main.inventory-v1`. Only the two
test selectors changed; business assertions and all product source stayed intact.
Independent review closes 0/0/0 at corrected spec SHA-256
`e4e3b79f8867364f40ae80072eeb494eae300f3733ab414d3de2aec0d4205f14`.

The successful run starts with an empty actual PostgreSQL store, creates two SKUs,
receives 10 cables, issues 3 and links a -1 correction to the original movement.
The cable ends at quantity 6/version 4 with three retained movements after a
name-only correction; the pad stays at zero/version 0. An additional isolated
concurrency probe ends at 8/version 4 with four movements. Final database totals
are 3 items, 7 movements, 11 audit records, 11 receipts and 7 capability effects.

The case proves literal search/paging, no-write over-issue, preserved stale intent
with explicit refresh/reconfirmation, one winner for same-version concurrent
writes, dropped committed-response exact-key/body retry, observer/generic-route
denial, and API restart followed by the original receipt replay without an extra
movement or effect. Published/Compilation fingerprints stay unchanged. It observes
zero unintended remote requests. This is an API restart while retaining the
database, not a PostgreSQL process restart or an upgrade/migration test.

## Visual and independent QA judgment

Root and independent Terra `inventory_family_qa` inspect actual 390/768/1440
results and recovery, observer and dark states. Phone detail shows item identity,
quantity/unit and Issue in the first viewport; both authored item summaries fit
the list viewport. Desktop makes receiving, correction and history discoverable.
Movement rows provide signed delta, before/after balance, reason, time and the
correction link. Errors explain the next action and retain input. Observer views
hide mutation/history controls. No clipping or new visual finding is observed.
Automated `visualReview: pending-image-inspection` is retained in the raw record;
this separate judgment records the subsequent inspection without rewriting it.

Terra checks all 16 actual phases and records new P0/P1/P2 0/0/0. Retain prior
accepted contract/runtime/verifier/UI/admission evidence in the task subfolders:
the only correction here is the independently reviewed locator scope. Source CI
run `35928931625` passes both Node jobs at `58d305de`. No unchanged broad suite is
repeated merely to produce a new count.

Independent Sol `inventory_family_release` verifies the accepted ADR, frozen
source identities, actual call-path assertions, failed-attempt retention and
cleanup. It returns `APPROVED_FOR_NARROW_LOCAL_FAMILY_ACCEPTANCE: yes`, with
P0/P1/P2 0/0/0. PM advances counts to ten registered, ten locally accepted
definitions and six demonstrated runtime families. Historical cleanup residuals
and the excluded maturity claims below remain unchanged.

## Ownership, cleanup and delivery limits

Both Preview attempts remove their exact artifact, containers, network and volume.
Root removes only outer project `factory-t10-inventory-ffeaac8c0d97` and verifies
zero project containers, networks and volumes in
`attempt-f0cfb8f9-b769-4bec-8955-8580a14693ee/root-resource-proof.json`.
Ignored local configuration is retained. Historical policy-blocked scratch and
worker residuals are untouched and remain open; this cleanup does not close them.

Command: `pnpm exec playwright test e2e/inventory-operations.spec.ts --workers=1`
with the recorded isolated loopback project environment and no provider key.
The accepted local scope establishes neither hosted delivery, private identity,
real-model fit, physical-phone usability nor ordinary-user effort reduction.
Preview is disposable. The separate Team Task durable rehearsal does not prove
Inventory upgrade, migration or cross-revision exactly-once commands.
