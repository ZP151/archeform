# Approval Mobile Presentation Acceptance

Date: 2026-09-10. Scope: D2.4, existing generated `approval-v1` presentation.
Authority and prior failed outcomes are recorded in the active consumer ledger.

## Visible result

The generated application now presents amount and status before secondary
details, keeps valid actions visible, distinguishes decisions with text/icons
and semantic color, and uses two columns on desktop. Native Details preserves
ID and all other declared fields. Existing Lucide assets and Graph theme tokens
are reused. No dependency, public contract or authentication change is included.

| Evidence                                                                        | Size       |
| ------------------------------------------------------------------------------- | ---------- |
| [Phone results](evidence/consumer-approval/d24-results-390.png)                 | 390 x 1016 |
| [Phone form](evidence/consumer-approval/d24-form-390.png)                       | 390 x 900  |
| [Tablet results](evidence/consumer-approval/d24-results-768.png)                | 768 x 956  |
| [Desktop results](evidence/consumer-approval/d24-results-1440.png)              | 1440 x 900 |
| [Unchanged prior baseline](evidence/consumer-approval/d23-real-results-390.png) | 390 x 2004 |

Root inspected the first four images, found mobile role clipping and narrow
implicit record tracks, then inspected the final corrected four images. The
final images show full role text and record-width content. A conservative
tablet text-fit assertion also prompted an all-width minimum-size correction;
its failed attempt is retained separately. No assertion was weakened to pass.
The single mechanical scan of first-pass emitted UI returned no findings;
the final correction is covered by focused and actual browser checks.

## Reproducible checks

- Focused failing tests preceded implementation and responsive corrections.
  The full compiler suite passed 659 tests across 39 files before the final
  CSS-only corrections. Final affected coverage passed 22 tests; types, build,
  formatting and diff checks passed. Unchanged full-suite evidence is reused.
- The final canonical `e2e/consumer-approval.spec.ts` run passed 1/1 with one
  worker and zero retries, using fixed interpretation and actual composition,
  immutable Publish/Compile/Verify/Preview and generated UI. No model call.
- Two synthetic requests were created and submitted through the UI; one was
  approved and one rejected. Reload retained results, and requester approval
  returned 403. The canonical initial draft is retained as the third record.
- At 390/768/1440 px: no document overflow, zero axe violations, all five routes
  reachable with the matching active marker, readable role selection and
  full-width summaries. Details opens/closes by keyboard; IDs start collapsed.
  Visible mobile controls meet 44 px targets. Initial Submit bottom is
  461/409/409 px respectively, within the 900 px viewport height.
- Ready: 171646 ms. Business assertions: 177411 ms. Questions: 0. Technical
  handoffs: 0. These measure one prepared local fixture lane, not real-model
  accuracy, a cold-start benchmark, ordinary-user effort, or a hosted SLA.

Final compiler source SHA-256:
`4e21934b49caacf2b98473c68dc2007ebee0c2eb5d90dc443e43cbc6f6d5c08f`.
The tracked-Dockerfile image's internal source matches. Image config:
`80d447bee8d706a979ff01c579e98f7c35da34f864688eab86aae50f28adc6ed`.
Compilation `cmtudzai3004jmt4t9ywx7rc0` and verification
`cmtudzbpo006cmt4tderzq899` succeeded. Preview
`preview-ab09680e-ad94-45f2-8ac3-a6de1255d380` stopped successfully.

The isolated Factory project and all three preview projects have zero remaining
containers, networks and volumes, verified by exact Compose project labels.
No cloud deployment, main integration or repository release was performed.

## Product limits and next work

This closes the observed bare field-stack presentation gap for the supported
approval app. It does not establish a mature general-purpose application
platform. Real-model coverage for coarse and materially different requirements,
ordinary-user testing on physical phones, real identity/data isolation and
hosted availability remain separate work. The [next plan](../superpowers/plans/2026-09-10-approval-mobile-presentation.md)
prioritizes those outcomes over nominal template count or repeated audits.
