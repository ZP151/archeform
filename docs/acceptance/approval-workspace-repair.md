# Shared approval workspace repair

Status: accepted for bounded local iteration, 2026-09-11.

## Problem and scope

The founder rejected B2's visual result again. The previous visual verdict is
withdrawn. Existing compiler and business evidence at `82e0d4e7` remains valid
for that source; it does not establish that the interface is finished.

Ordinary requesters and reviewers need a usable working application with full
navigation and business records near the first viewport. Implement the private
shared recipe in ADR-0056 and `packages/compiler/DESIGN.md`, preserving Graph,
server policy, lifecycle, B2 finding/race protection and non-approval output.
Expense and Purchase both consume it. No new definition or runtime family is
counted by this repair; the baseline remains three definitions and two families.

## Baseline diagnosis and RED

Actual provider-free immutable Compilation `cmtx0xe72000dkf4tc1xf5nrt` reached
ready in 181815 ms using the accepted B2 image and current canonical Purchase
fixture. Stylesheet requests returned HTTP 200 with CSS content type. Browser
facts were `stylesheetLoaded=true`, `iconsVisible=true`, `appDisplay=block`,
`bodyOverflow=false`, and no workspace recipe sentinel. The new workspace
assertion failed as intended. This proves a presentation-template gap rather
than a CSS/icon delivery failure in that reproduced result.

The rejected phone shows clipped horizontal route links, the first Submit near
771 px, huge tinted cards and only one complete identifying summary before the
fold. Desktop strands the third oversized card below the first two and lacks a
workspace hierarchy. The previous checks measured overflow, touch size and axe,
but omitted these product outcomes.

Preview `preview-c2a2c8ad-19d9-475e-a0c3-68dc0ca789a9` stopped with zero exact
project containers, networks and volumes. The baseline failure log is retained
in ignored `.superpowers/sdd/2026-09-11-approval-workspace/baseline-red.log`.

## Predeclared acceptance cases

| Dimension                | Required outcome                                                                                                                                               | Evidence                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Shared assembly          | One private recipe produces both Expense and Purchase; Graph copy/theme edits survive; non-approval output unchanged                                           | Focused emitted-runtime tests and both actual lanes                  |
| Responsive workspace     | Desktop sidebar; closed native navigation on phone/tablet; full unchanged route labels reachable in one activation                                             | 390/768/1440 browser checks and actual images                        |
| Task reach and hierarchy | First permitted action ends by 650 px at 390 x 900; at least two ordinary records' identifying summaries visible; neutral aligned rows and state badge accents | Geometry checks plus independent before/after image inspection       |
| Form                     | Appropriate typed fields, coherent layout, clear submit footer, retained data on errors and pending protection                                                 | Existing real form actions, focused regression, phone/desktop images |
| Loading integrity        | CSS HTTP 200/content type, computed recipe/grid styles, every displayed icon has visible SVG geometry                                                          | Shared browser helper, CSS-disabled and icon-hidden negative checks  |
| Real business            | Create, submit, approve/reject, persistence and role/state denials remain correct                                                                              | Actual existing Expense and Purchase lanes                           |
| Finding and recovery     | Search/status/clear, no-match, loading/error/empty, filtered decision feedback and role-scope protection remain correct                                        | B2 focused tests and Purchase actual lane                            |
| Access and delivery      | Immutable source, no added authority, exact local cleanup, source/evidence identity                                                                            | Existing lifecycle tests, runtime IDs and scoped review              |
| Product goal             | No technical handoffs introduced; prepared local ready target <=5 minutes                                                                                      | Deterministic runtime metrics, explicitly not real-user measurement  |

Use one combined independent implementation/business/visual review. Founder
visual approval, real-model classification, physical-phone/ordinary-user trials,
production identity and managed deployment remain unproven here.

## Next milestone

B3 Task discovery and a proposed decision proceed while this repair is completed.
It must add a distinct task journey with due/priority summaries and explicit
assignment/access semantics using reusable assembly. Production implementation
waits for its frozen decision and the current shared presentation acceptance.

## Verified outcome

Both actual generated applications pass the provider-free immutable-delivery
lanes, **2/2 in 6.9 minutes**, with one worker and zero retries. They use canonical
synthetic fixtures and real application services; these are not mocked business
interactions or real-model/ordinary-user results.

| Lane     | Compilation                 | Ready     | Business complete | First action, phone |
| -------- | --------------------------- | --------- | ----------------- | ------------------- |
| Expense  | `cmtx27u91002gkf4tga18ctkz` | 185207 ms | 193781 ms         | 550 px              |
| Purchase | `cmtx2c7lt004jkf4t3a9tqf2w` | 177833 ms | 193799 ms         | 573 px              |

Each creates two records, submits them, approves one and rejects one, and retains
values and states after reload. Role denials remain enforced. Purchase also proves
invalid-transition denial, procurement audit API, finding the known record in two
inputs, one-action clear, retained filters on refresh, cleared filters on role
change, and outcome feedback when a decision removes a filtered record. Both
report zero questions and technical handoffs, with one deterministic interpretation.

At 390/768/1440 px, both prove no overflow, usable role selection and summary
geometry, loaded CSS with HTTP 200 and CSS content type, visible local SVG geometry,
resolved Graph design tokens, the workspace grid, and zero axe violations in the
checked states. The shared helper intentionally disables CSS and hides SVGs and
confirms both degradations are detected before restoring the application.

The controller inspected all 13 actual screenshots. The phone now exposes full
route labels through a compact disclosure and shows two identifying summaries;
the desktop uses a sidebar and aligned full-width records. State color is confined
to badges. Forms, finding, no-match and the open navigation are included. Focus
rings in form/no-match captures are actual keyboard focus, not a loading defect.

- [Purchase phone](evidence/consumer-approval-workspace/workspace-results-390.png)
- [Purchase desktop](evidence/consumer-approval-workspace/workspace-results-1440.png)
- [Purchase form](evidence/consumer-approval-workspace/workspace-form-390.png)
- [Expense phone](evidence/consumer-approval-workspace/expense/d24-results-390.png)
- [Source and image manifest](evidence/consumer-approval-workspace/manifest.json)

## Regression and final-source correction

The full affected compiler suite passed **665/665 across 39 files** in 214.04 s;
the runtime file passed **28/28**, with compiler typecheck/build/lint green. The
impeccable draft detector returned no findings; this is supplementary evidence,
not visual acceptance.

The independent review found a mobile accessible-name omission and incomplete
recipe descriptor assertions. A focused test first failed on the missing name.
The final correction adds only `aria-label={'Navigation: ' + activePage.title}`
to the existing summary and asserts the exact reused assets/seven icons. Two
focused workspace/digest tests then passed (26 unaffected cases skipped, 7.83 s).
The final compiler build and formatting/diff checks pass. Final Expense bundle
SHA-256 is `0d88224154e7f9cbc9fe884b93a217c727ff589f7acf0514c35d8ed755e7b573`.

A targeted Chromium check rendered the final emitted TSX and CSS for the collection
and form, verified `Navigation: <actual page title>` as the accessible name, and
used Enter to open/close the native disclosure with five visible routes. This
uses synthetic SSR state solely for the accessibility correction. The durable
E2E helper now requires the same accessible name on future runtime lanes.

The actual business screenshots precede this accessibility-only correction.
Visible markup, CSS, routing, state and business code are unchanged; the existing
real business and pixel evidence is retained with explicit source identities.
No complete image build or lifecycle rerun was warranted for the name change.

The acceptance worker image is
`factory-t9-workspace-r1-20260911-compiler-worker:latest`, OCI image ID
`sha256:62cdac7de8c93ba0aecacadbb02db446ff74856f39009cd67367fa9aa07fb3ac`.
Its recipe SHA is `3f78f6ca5c4bbacff24430c11a4828eb67f2e883306a10dc5d41b9cbf855a0a6`.
Its index SHA is `b614f69d4e0f9a88d17fe0ad2bfbe693c4bb80469b9ace707101372adf42c8b9`;
the local final index is `935d617f388b28ccf9881594e1a6e8274020b78505e09cf7015f00180023458d`.
The difference is formatter line wrapping and an optional trailing comma around
the recipe spread. TypeScript AST structure/order/kinds/identifiers/literals are
identical (normalized digest `14d793afc6a879bdea8fb167084be61a179ad2ae87fe21e968615b70501de9e2`).
These index files are semantically equivalent, not byte-identical.

## Runtime cleanup and limits

Preview IDs are `preview-95cae033-ea03-4ef7-a0f3-4fd3e5e06390` (Expense) and
`preview-3844b32c-84db-406d-8ffb-7e6eafdfe31f` (Purchase); both are stopped.
The first Factory teardown omitted the explicit local env-file and stopped at
Compose interpolation before mutation. Repeating with `--env-file .env` exited 0.
Fresh exact-label queries found zero containers (including stopped), networks and
volumes for Factory and all three Preview projects, including the rejected baseline.
No unrelated runtime was removed.

Safe logs remain under ignored `.superpowers/sdd/2026-09-11-approval-workspace/`:
`baseline-red.log`, `image-build.log`, `e2e-first.log`, `navigation-a11y.json`,
`design-detect.json`, and `cleanup-final.json`. No credentials or raw model
messages are included in the tracked evidence.

This repair adds no definition, runtime family or external asset. Counts remain
**three definitions / two runtime families**. It does not claim founder visual
approval, production authentication, managed deployment, real-model selection
quality, physical-phone usability, or ordinary-user first-time success.

## Independent review and delivery decision

Independent nonwriter `/root/b2_review` inspected the frozen source, business
and regression results, all 13 actual images, the final accessibility correction,
source identities and exact cleanup. Final scoped ordinary-iteration verdict:
**P0/P1/P2 = 0/0/0**, clean for local acceptance. Root accepts this bounded shared
repair and authorizes one normal commit/push to the active iteration branch.
No main integration, repository release or cloud deployment is implied.
