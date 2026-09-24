# Event Registration Task 1 source checkpoint

September 24, 2026. Task 1 source is accepted with the limitations below.
Independent implementation review, QA and final source judgment each report
P0/P1/P2 0/0/0. This packet covers the contract and
compiler-profile task only, not an executable Event Registration application.

## Result and boundary

The new family has exact Blueprint and Graph witnesses for events, registrations
and both histories; two workflows; five page intents; organizer/attendee roles;
capacity/version domains; ownership fields and unique indexes. Composition maps
these structures through the six existing physical capabilities. The immutable
compiler profile verifies the complete Graph, lock bindings and real package bytes.

Whole-event cancellation, attendee cancellation, registration reopen, check-in
and undo-check-in are represented in the contract. New attendance verbs are
accepted only by this exact family. The three public compilation entry points
explicitly reject this family until its runtime exists, preventing incomplete
generic CRUD output from being presented as a usable Event product.

The accepted decision is [ADR-0086](../../../adr/adr-0086-event-registration-family.md),
SHA-256 `64fcfd08b629355662ba8ff733bbe46874a9a595fbeb2695d12eed3d377dbdbd`.
Separate standing-decision review and exact PM acceptance are recorded in the
active ledger. This task adds no runtime, UI, worker verifier, catalogue row,
provider, package, deployment or actual-product acceptance.

## Frozen artifacts and verification

- `task1-source-manifest.json`: fifteen frozen source/test/fixture identities.
- `task1-profile-handoff.json`: detached profile and real composed fixture
  coordinates for the subsequent runtime task, which is not started.
- `task1-historical-equality.json`: root's independent current derivation and
  immutable-input output equality for all thirteen pre-Event physical definitions.
- Protected baseline: `generated/.event-registration-task1/before.json`, SHA-256
  `ea8273865f03f9dcb80779552badfb4b324d3021066a85e144fd5f6fce03664a`.
  The original capture and all older captures remain unchanged.

Author checks pass 111 Graph cases (49 Event plus 62 Customer Requests), four
composition cases and 81 compiler/export cases. All three affected package
typechecks and builds pass. Root separately verifies all fifteen frozen hashes,
thirteen historical definitions and full repository formatting. Full repository
typecheck passes all 29 tasks, including downstream consumers of the new actions.
The independent source reviewer executes 86 focused cases successfully; its
verdict and live-source identities are recorded in `task1-source-review.json`.
Independent Terra QA then passes the full Graph suite (1033 cases), four
composition cases and 81 compiler/export cases, plus a separate thirteen-row
historical comparison. Its verdict and parity receipt are
`task1-source-qa.json` and `task1-qa-historical-equality.json`.
Separate Sol final judgment rechecks all fifteen live identities and accepts the
exact source scope in `task1-source-judgment.json`; its original verdict SHA-256 is
`02c2bfe37149c5c6d054b6ebb597ad700a991315ee1b954d5301dd41b0ea3f84`.
PM accepts this checkpoint for controller commit/push. The controller verifies
the delivered revision and remote CI after push and records that result in the
final handoff; earlier CI is not used to claim this new source has passed remotely.

Initial RED, GREEN, type/build logs and the original handoff are retained under
`generated/.event-registration-task1/implementation/`. Root logs are under its
parent directory. A discovered Appointment near-match conflict is corrected and
covered: shared time/capacity fields alone cannot classify an Event. Its first
intermediate raw failure log was overwritten; `near-match-regression.md` records
the observed failure and this limitation honestly. Initial TDD logs remain intact.

Meaningful rejection tests include catalogue-wide attendance-verb isolation,
physical source-byte tampering, malformed locks, unknown/accessor/inherited/cyclic
data, exact numeric domains and renamed/swapped/max-length role slots. No source
test is claimed as PostgreSQL race, durable runtime or consumer UI evidence.

## User acceptance handoff

The user requested completion of the current task, workspace organization, push
and a wait for acceptance. Task 2 remains unstarted and requires the user's resume.
The long Goal will be paused after delivery verification. The
[current status](../../../project-status.md) separates thirteen physical rows,
twelve logical definitions, eight registered families, ten historical local
definitions/six demonstrated families with the Appointment UI qualification, and
zero hosted applications. Event Registration changes none of those counts yet.

The [implementation plan](../../../superpowers/plans/2026-09-24-event-registration.md)
and [responsive handoff](../../../design/event-registration-workspace.md) record
the remaining runtime, phone/desktop, recovery and delivery acceptance. Earlier
status history is preserved in full, while the current status page is concise.
The original checkout's Eval V2 work and unrelated resources remain untouched.

Actual browser/service/database execution remains outside the current authorized
boundary after the blocked Workbench startup. No main integration, repository
release, hosted operation or destructive cleanup accompanies this checkpoint.
