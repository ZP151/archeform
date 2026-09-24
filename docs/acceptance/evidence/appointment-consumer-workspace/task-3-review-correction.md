# Appointment workspace: first scoped correction

Status: the same independent reviewer closes all five findings after round 2,
P0/P1/P2 0/0/0, with all four exact hashes verified. Task 3 source/component
acceptance is complete. This is component/source evidence,
not actual Preview, PostgreSQL or hosted delivery acceptance.

## Round 2: retained-cursor clock recovery

The scoped reviewer confirms that a retained cursor could bypass authenticated
list recovery after a failed Date check. Both `more()` and its shared button now
require clock readiness (the handler also requires an unlocked command state).
Two new cases fail first with the button still enabled, then pass: missing Date
on a list refresh and on a cursor page. Both require Retry availability to read
the authenticated appointment list, reload offset zero, then allow offset 100.

Final scoped run passes **3/3** (two behavior cases plus strict emitted frontend
TypeScript); the full suite now contains 33 cases, of which the other 30 were
skipped in this narrow run. The immediately preceding complete run passed 31/31.
Compiler build and whitespace checks pass. No fresh full QA gate was added for
this two-guard repair. Round 1's captures remain the visual evidence; this final
run captures no additional screenshot.

## Round 1: original five findings

The first independent review reports P0/P1/P2 0/0/5. Root verified each finding
against the implementation and added failing behavior cases before corrections.
Only the presentation renderer and its focused test change. The facade and shared
style helper retain their previously reviewed hashes.

| Finding                                        | Correction and evidence                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff cannot reach later slots                 | Customer and staff reuse the same week/cursor controls. Tests reach a replacement after 100 eligible slots, the following week, and an empty 500-row scan page with a continuation.                                                                                                                                                                                     |
| Failed availability still permits rescheduling | Loading/clock readiness and a currently offered, different target gate both controls and the command. Missing Date and denied reads block submission until recovery; an invalid target after changing weeks disables submission.                                                                                                                                        |
| Incomplete current schedule conflict values    | A separate saved-values region names all six authoritative fields while preserving the desired form. A test changes service, start, end, timezone, capacity and status concurrently, inspects each current value, and proves only a deliberate new key overwrites it. Successful update/replay refreshes this snapshot from the authoritative list, not an old receipt. |
| History stale after external changes           | Refresh clears cached history and reloads previously inspected visible records. Generation and per-record sequence guards reject late success/error responses. Tests cover cached and still-pending old reads across an external confirmation.                                                                                                                          |
| Service metadata provenance missing            | Saved cards label their heading as the current service name; the booked-time history qualification stays separate. A rename-after-booking test verifies both.                                                                                                                                                                                                           |

Initial correction RED: three staff-navigation/recovery cases fail at the actual
missing controls/enabled selector; four conflict/history/provenance cases fail at
their missing or stale visible values. A further focused assertion catches the
saved schedule snapshot remaining stale after a successful correction. Each then
passes after its corresponding implementation change. An additional empty-scan
cursor case exercises the same staff navigation correction.

Final command: `pnpm --filter @factory/compiler exec vitest run
test/appointment-consumer-workspace.test.ts --reporter=dot` — **31/31**, exit 0.
Compiler typecheck/build and `git diff --check` pass. Earlier 133-case integration
evidence is historical; this correction reruns the full affected presentation
suite, not unchanged setup/Graph gates. The next-task adapter suite remains
intentionally RED until the separate default-selection implementation.

Final captures:
`generated/.appointment-v2-task3-ui/root-interaction-63100b70-dc01-4186-9cf6-89b540eef004/`.
The immediately preceding 31-pass run's identical rendered conflict/staff states
were inspected at 390/1440 and dark 768 pixels: all saved fields are visible,
phone width does not overflow, and desktop staff actions remain legible. The last
change affects only the authoritative snapshot after saving; current final
captures are retained separately rather than replacing prior evidence.

No listener, provider, Docker, deployment, Git integration, historical fixture
recapture or policy-rejected operation was attempted. Actual consumer entry and
durable/hosted acceptance remain open. Logical coverage remains ten definitions
across six previously demonstrated runtime families.
