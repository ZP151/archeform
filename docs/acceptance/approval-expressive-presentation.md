# Expressive approval presentation acceptance

Date: 2026-09-12. Status: implementation and actual runtime verification complete;
final combined review is recorded in the delivery ledger.

## User outcome and reusable supply

The founder selected a combination of the three visual concepts: stronger cobalt
hierarchy, warm photographic materials and clear approval progression. The shared
generated Expense and Purchase workspace now composes these elements through
private versioned assets rather than requesting page source from the model.

| Asset                            | Version | Responsibility                                                                      |
| -------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| approval-workspace-presentation  | 2.0.0   | Responsive shell, readable summaries, compact navigation and actions                |
| approval-presentation-components | 1.0.0   | Primary-action hero, decorative material with fallback, real current-state progress |
| approval-visual-assets           | 1.0.0   | Two original admitted WebPs, structural selection and integrity checks              |

The existing seven pinned Lucide icons are reused. Refresh, navigation and filter
reset retain accessible names and 44 px targets while removing redundant visible
labels. Submit, Approve and Reject retain explicit business labels. Images are
decorative category illustrations, not photographs of a particular request or
uploaded evidence. Progress derives only the exact current four-state flow and
does not invent historical timestamps or actors.

No runtime dependency, backend API, Graph schema, provider, database or model
instruction contract changed. The existing interpretation selects a reviewed
business definition; deterministic compiler configuration selects the compatible
visual composition. Explicit Graph design-system choices remain authoritative.
Contributor guidance is in [generated UI assembly](../design/generated-ui-assembly.md).

## Evidence and limits

The [combined reference](evidence/consumer-expressive-approval/design-reference.png)
is an illustrative target. The [prior actual mobile result](evidence/consumer-expressive-approval/before-390.png)
provides the before comparison. Synthetic SSR layout diagnostics are kept in
ignored local staging and are not product acceptance evidence.

The generated-bundle comparison against the pre-change capture changes only
`web/app/page-runtime.tsx` and `web/app/globals.css` for Expense and Purchase.
All 33 server files per bundle remain identical. All 62 Booking files remain
identical. The frozen non-approval and Restaurant bundle tests also pass.

The original 768 x 512 WebPs total 55,886 decoded bytes. Purchase emits only
the 26,830-byte workspace material; Expense also emits its 29,056-byte material.
They travel inside the immutable generated frontend without external image
requests. Failed images preserve layout and data operations.

## Completed verification

- Complete compiler regression: 675 passing tests in 40 files. After the final
  scoped repairs, all 42 affected tests pass, including generated strict typing,
  both material signatures and mutation parity, multi-entity isolation, palette
  preservation, malformed progression and unchanged server/non-approval output.
- Package build and lint pass. The actual running worker's four changed source
  digests match the final worktree files; [verification.json](evidence/consumer-expressive-approval/verification.json)
  records them, safe runtime facts and screenshot dimensions/digests.
- Existing real Expense and Purchase lanes: 2/2 pass, one worker, zero retries.
  Interpretation uses authored deterministic fixtures; Publish, compilation,
  verification, preview, data persistence and API actions are real. No model or
  production deployment claim is inferred from this result.
- Each lane creates two requests, submits them, approves one and rejects one,
  verifies cross-role denials and reload persistence, and exercises history with
  permission denial, retry and late-response isolation. Purchase also covers
  invalid transitions, search/filter behavior, mutation feedback and list recovery.
- CSS returns HTTP 200 with the correct media type; sentinel 4, icons and all
  referenced tokens resolve. Real 390/768/1440 views pass overflow, accessibility,
  navigation, business-summary and first-action checks. First action is at 616 px
  on mobile/tablet and 478 px on desktop for both fixed populated cases.
- Both sets of bundled images decode at 768 x 512. A deliberately broken hero
  image preserves geometry, records and Refresh; reloading recovers the image.
  Dark presentation is exercised through the emitted theme attribute at all
  three widths; this does not add a user-facing theme switch. Caption custom-token
  computed styles and absent/explicit/custom Graph palette cases are checked.
- Local delivery ready times were 176.212 seconds for Expense and 172.042 seconds
  for Purchase in these deterministic-interpretation fixtures. These are not
  live-model latency or ordinary-user effort measurements.
- Exact Preview cleanup assertions pass. The Factory project's containers,
  networks and volumes are all zero in [cleanup.json](evidence/consumer-expressive-approval/cleanup.json).

## Visual comparison

Root inspected all 29 current actual PNGs: 13 Expense and 16 Purchase. Compared
with the chosen concept, the implemented screens retain cobalt hierarchy,
warm photographic materials, compact familiar icon actions, neutral readable
record surfaces and state progression. Long purchase identities wrap; forms
retain focused native input controls; decision history remains distinct from
current-state progress. No overlapping, clipped or unloaded elements remain in
the captured cases. The images are category illustrations, so they repeat across
matching records; they do not assert product-specific image identity.

| Actual screen    | Phone                                                                    | Tablet                                                                   | Desktop                                                                    |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Purchase results | [390](evidence/consumer-expressive-approval/workspace-results-390.png)   | [768](evidence/consumer-expressive-approval/workspace-results-768.png)   | [1440](evidence/consumer-expressive-approval/workspace-results-1440.png)   |
| Expense results  | [390](evidence/consumer-expressive-approval/expense/d24-results-390.png) | [768](evidence/consumer-expressive-approval/expense/d24-results-768.png) | [1440](evidence/consumer-expressive-approval/expense/d24-results-1440.png) |

Additional committed evidence covers both forms, history open/closed, dark
presentation and media fallback, plus Purchase navigation/search/no-match states.
The generated concept is not a screenshot of a functional application, and
viewport checks do not establish physical-device or ordinary-user acceptance.

## Remaining product work

This is reusable visual supply for two demonstrated runtime families, not an
expansion to hundreds of verified business definitions. Return with reason,
same-record correction and resubmission remain the next accepted ADR-0060
milestone. Production identity, managed deployment and other business families
retain their separate roadmap gaps. Internal review does not imply founder
approval of the final appearance.
