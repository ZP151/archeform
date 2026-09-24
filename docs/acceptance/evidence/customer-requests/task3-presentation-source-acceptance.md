# Customer Requests presentation source acceptance

PM accepts the responsive presentation source on 2026-09-24 after one
independent review and scoped closure of its three P2 findings. No P0/P1/P2
remains in this presentation scope. The separate worker verifier is not included
in this acceptance.

Customers use a focused phone conversation; staff use a desktop queue and
conversation on the same declared request contract. The workspace supports
request submission, replies and linked corrections, resolution, reopening,
cancellation, list/history paging and recoverable uncertain or stale writes.
It composes existing workspace styles, native controls, page projection and
pinned ISC Lucide icons. Refresh and Back are accessible icon controls; primary
actions and consequential commands retain clear labels. Explicit Graph themes
remain authoritative.

The compiler routes the exact family to its private presentation and includes
its stylesheet in the actual emitted globals.css. Component tests consume those
emitted page and CSS bytes, not separately reconstructed theme styling. Root
and the reviewer inspected the retained 390/768/1440, dark, explicit-theme,
long-content and recovery captures in [task3-ui](task3-ui/). Grouped visual
corrections removed repeated mobile navigation/create controls and technical
recovery wording, improved action hierarchy and made the short fixture's staff
answer visible within the initial 390x900 viewport.

Independent review found a history cursor race during refresh, missing read
cancellation on principal switch and missing keyboard focus restoration. Three
focused tests reproduced these failures before repair. The repaired emitted
component suite passes 19/19, including held list/detail/history cancellation,
the missing-boundary-event ordering and explicit keyboard focus assertions.
Compiler types, build and changed-file formatting pass. Root retains the
unaffected 91 compiler compilation/contract/export cases and twelve-definition
immutable emitted-output equality; these are not represented as reruns after
the interaction-only repair.

Source identities are in `task3-presentation-source-manifest.json`. The initial
four-source manifest SHA-256 is
`7a93a4aa972827fef9f074979e8a812d8ee56331e9f35c3c72e9ce2f35bd8451`;
the original repair manifest SHA-256 is
`9c2b9a5fdaa815dfff2f7b8aa2bc03adc2f43909ef6cccfb83fb952f7619d829`.
The original review and scoped recheck are retained in
`task3-presentation-review.md` and `task3-presentation-recheck.md`.
`task3-presentation-repair-manifest.json` preserves source/evidence hash values
from the repair. Original logs, before snapshots and reports remain in
`generated/.customer-requests-task3/` and its `repair-1/` directory.

All browser requests were intercepted with an emitted in-memory runtime; no
listener, actual application service or database ran. Retained visual images
precede the interaction-only repair and remain evidence for unchanged layouts,
not a new capture claim. Actual consumer entry, PostgreSQL persistence and races,
ordinary-user acceptance, private hosted identity, retained-data deployment and
rollback remain open. Registered, actual-local and hosted counts do not change.
