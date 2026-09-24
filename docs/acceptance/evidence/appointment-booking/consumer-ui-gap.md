# Appointment consumer UI gap

Status: open P1, diagnosed on 2026-09-24 from source at delivered base
`7a85d6efd946ffd9d1a826771e0e12a187a85b92` plus the frozen ADR-0079 changes.
Independent read-only investigator: `appointment_consumer_diagnosis`.
No service, browser, provider or Docker execution was performed for this diagnosis.

## Verified boundary

The accepted Appointment profile still renders the generic legacy workspace.
`packages/compiler/src/index.ts` selects that rendering at lines 4294-4318;
the Appointment projection contains command metadata but no component consumes it.
The generic form at lines 3157-3167 sends raw field values without an idempotency
key. The Appointment API instead requires a key and an exact `{ values }`
envelope. Generic non-commerce transitions at lines 3098-3103 and 3252 send `{}`;
confirm, reschedule and cancel require specific expected-version payloads.

There is no generated Appointment history control. The accepted permission
witness in `appointment-compilation-admission.ts` grants customer/staff
Appointment actions but no Schedule read, so useful slot selection also needs
an explicit bounded availability decision. Merely wrapping create payloads does
not complete the product.

The actual case in `e2e/appointment-booking.spec.ts` performs the business
mutations and history reads with `apiJson`. Its screenshot helper resizes and
captures the page; names such as `appointment-form` and `appointment-history`
do not establish rendered interaction or recovery. Preserve those artifacts as
historical API/runtime evidence, not ordinary-user completion evidence.

This predates ADR-0079: the relevant compiler source has no change against
`7a85d6ef^`; the generic form predates the September 19 Appointment runtime.
`definition-data-compatibility.test.ts` explicitly protects legacy page bytes.

## Resolution route

ADR-0072 FAC-006 freezes historical generated behavior. ADR-0079 EFF-001 and
IMP-005 exclude template changes; ABT-001 requires Tech Lead/PM escalation for
that boundary. PM dispatches `appointment_ui_decision` to propose ADR-0081,
covering a functional responsive workspace, safe slot discovery, exact retries,
current-state actions and immutable compatibility. After one scoped clock/ID
repair, independent `appointment_ui_decision_review` returns standing acceptance
yes, P0/P1/P2 0/0/0, for exact SHA-256
`65f867c7afeeefc892b8493e508d86d5d212302fcc247e927843ce05b6672adc`.
PM records acceptance under the existing September 1 authority. The V2 repair
is queued for serialized implementation; no code or consumer acceptance follows
from decision acceptance alone. See the
[implementation plan](../../../superpowers/plans/2026-09-24-appointment-consumer-workspace.md).

The ten registered definitions and six demonstrated runtimes remain historical
coverage facts. Appointment consumer UI acceptance is reopened and must not be
counted as a completed usable interface. Actual UI operations and inspection,
not API-only mutation tests or screenshot filenames, must close this issue.
