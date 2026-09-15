# Approval visual emphasis — 2026-09-12

ADR-0058 replaces the withdrawn September 11 visual acceptance. Full Graph-accent
navigation, primary actions and semantic status colors restore useful emphasis;
all five generated Refresh controls use the existing icon with an accessible
name, title and 44 px target. No business or authority contract changed.

## Actual runtime evidence

The two existing provider-free deterministic selection lanes passed 2/2 in
7 minutes with one worker and zero retries. Both exercised immutable Publish,
Compilation and Preview, two UI requests, submission, one approval and one
rejection, role/state denials and persisted results after reload. Purchase also
verified shared search, status filters, clear and filtered mutation feedback.
Each used zero questions, zero technical handoffs and one interpretation fixture;
this is not evidence of real-model quality or ordinary-user success.

| Definition | Compilation               | Ready / task time  |
| ---------- | ------------------------- | ------------------ |
| Expense    | cmtx8d53d000dmg4thqvmpagw | 188487 / 197038 ms |
| Purchase   | cmtx8hl63002gmg4t850h3pws | 168244 / 182404 ms |

All 13 adjacent PNGs are actual emitted-runtime images, inspected at 390, 768 and
1440 px, including forms, navigation, search and no-match states. CSS sentinel 2,
visible icons, responsive summaries, zero overflow and zero axe violations passed.
The neutral content and compact mobile geometry remain intact. Approval rows are
still simple workflow prototypes; these images do not establish product maturity
or founder visual approval.

## Test and source identity

Focused RED demonstrated the previously visible Refresh label. Final compiler
runtime suite passed 29/29; build, typecheck and lint passed. The previous full
665-test compiler result is retained historical evidence, not a new run.
Static real-emitter Chromium checks cover light/dark at 390/1440, independent
keyboard focus, hover/current navigation, action/status token pairs and zero axe.
The final test helper waits for existing CSS transitions after focus leaves a
link; an intermediate axe check caught that transient state before this correction.

The full runtime lanes loaded the initial presentation helper. A subsequent
read-only check on the same live Purchase Preview verified the corrected
independent keyboard focus and computed action/badge assertions at 390/1440.
The last canvas assertion and animation-wait correction were verified against
the identical emitted stylesheet in the static harness, not by rerunning all
business lanes. No production change occurred across these checks.

- Worker image: `sha256:5649d878404712a7e72e5eeda8422ebabfd8ccd106eca23788297cee93d730ad`.
- Recipe SHA-256: `d6de833c9ee9fdfb4aa955c5d8be646492e4e978847f3824c5b67d4b55139218`.
- Compiler index SHA-256: `d59b8027a37ff4691f72c422049d431f1e00429270b6ae4321f4707e716fa064`.
- Focused test SHA-256: `7fb98f6f432b089c0670a264f44986ffc094e7e7c58f4d29df6e90db63bab44b`.

Image and local production hashes match exactly. Safe logs are ignored under
`.superpowers/sdd/2026-09-12-approval-emphasis/`: `e2e.log`,
`live-presentation.json`, `design-checks.json`, and `runtime-suite.log`.

## Cleanup and next business outcome

Both previews stopped. Exact-label checks after Factory `down -v` found zero
containers, networks and volumes for `factory-t9-ui-emphasis-20260912`,
`factory-preview-preview-bcabc78c-4c3a-4b6c-8c2d-6978ecfd658c`, and
`factory-preview-preview-4251ab94-cf89-42ea-af51-e91ca261110f`.

Next is visible decision history using existing authorized reads, followed by
governed correction/return/resubmission and uncertain-write recovery. Catalog
counts remain three definitions/two demonstrated families. Cloud operation,
verified identity and complete approval closure are not delivered by this repair.

Independent nonwriter `/root/b2_review` completed the combined implementation,
business and visual review with P0/P1/P2 0/0/0. Root accepts this bounded ordinary
correction and authorizes its normal branch commit/push. This is not a repository
release verdict or permission to deploy.
