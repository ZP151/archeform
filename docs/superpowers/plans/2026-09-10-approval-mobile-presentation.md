# Approval Mobile Presentation Implementation Plan

> **For agentic workers:** Use subagent-driven-development for this single bounded slice. Root owns the acceptance harness, product evidence, ledger and Git delivery.

**Goal:** Make the generated approval application easy to scan and act on from a phone, with a visible improvement over D2.3.

**Architecture:** Refine the existing compiler-local `approval-v1` presentation. Keep the immutable Graph lifecycle, server authorization, declared routes, typed forms and workflow unchanged. ADR-0053 and its recorded standing acceptance freeze the implementation details before production writes.

**Tech stack:** Existing TypeScript compiler, emitted Next.js/React, native HTML disclosure and the seven already accepted Lucide SVG assets. No new dependency.

## Product correction and direction

D2.3 established one functional local journey, not visual product acceptance.
The inspected 390 px screenshot has three navigation rows, a large role control,
repeated field captions, prominent internal IDs and weak record separation.
CSS and icons are loaded. The problem is information hierarchy and density.

Three approaches were considered: cosmetic color changes alone leave the reading
effort intact; a new approval design system creates unnecessary assets and
contracts; refining the existing shell and records addresses the observed gap.
Choose the last approach. Preserve the application's identity and content.

Use a compact header with honest demo-role disclosure, route navigation with an
active marker, a clear primary creation action, and separated record summaries.
Promote a declared numeric amount without inventing a currency; show declared
category/date and textual status with semantic color. Put remaining fields and
the internal ID in native keyboard-accessible disclosure. Keep state-valid
actions visible. Desktop should use its width instead of stretching the mobile
field stack. No fabricated statistics, charts, receipt upload, identity or photos.

## Reuse search and ownership

1. `packages/ui-primitives/src/index.ts`: existing button, badge, input, select
   and disclosure-adjacent native control semantics; no source copy needed.
2. `packages/ui-patterns/src/index.ts`: reuse compact-sidebar-navigation active
   link semantics and existing form-field, empty-state and confirmation-state
   contracts. Bottom-tab-navigation uses tab semantics and is unsuitable for
   ordinary route links without adaptation.
3. `packages/workbench-ui` and `packages/generated-ui`: Workbench controls own
   editor semantics; generated business assets are Restaurant-specific.
4. Screen/experience/product recipes likewise describe Restaurant behavior and
   cannot be relabelled as approvals.
5. Existing `EntityRecords`, `FormBlock`, `ApprovalIcon`, shell and scoped styles
   in `packages/compiler/src/index.ts` already own this behavior and are the
   reuse target. Parameterize/recompose them; no new registry key.
6. Pinned source-study inventory records shadcn/Radix as unaccepted candidates.
   No third-party source or Base44 asset will be copied. The current pinned
   Lucide helper and notices remain unchanged.

Root retains plan, active PM ledger, project status, E2E harness and screenshots.
Tech Lead owns only the proposed ADR; a separate reviewer owns no product files.
A fresh implementation owner receives the exact accepted compiler/test manifest.
Parallel writers must not edit shared paths. Spark is unavailable until its
reported reset; root/assigned implementation fallback is recorded in the ledger.

## Single delivery slice

- [x] Obtain independent standing acceptance of the bounded template proposal,
      recording its exact hash before production implementation.
- [x] Write focused failing tests for deterministic summaries, retained fields,
      missing/ambiguous data, native disclosure and active navigation.
- [x] Refine only approval presentation; preserve legacy and Restaurant bytes.
- [x] Update the existing browser harness for explicit detail expansion and new
      D2.4 screenshot paths; never overwrite accepted D2.3 evidence.
- [x] Run relevant compiler tests, types/build and formatting. Run one actual
      deterministic interpretation -> composition -> Publish -> Compile -> Verify
      -> Preview -> two-request browser journey, with no model call or cloud action.
- [x] Verify create/submit/approve/reject/reload/requester-denial and at
      390/768/1440 px: no horizontal overflow, axe results, visible primary action,
      readable amount/status, accessible details, and all routes reachable. At
      390 x 900, the first record summary and its valid action must fit above the
      fold; internal IDs remain collapsed. Capture form and list results.
- [x] Inspect the generated screenshots in one batch; make one batched visual
      correction if needed and one confirmation pass. Automated accessibility
      checks alone do not establish visual acceptance or real-device testing.
- [x] Obtain one proportionate independent implementation review, remove exact
      temporary runtime resources and update product evidence. Controller delivery will
      commit and normally push the iteration branch. No main integration or release.

## Next product priorities

1. Finish this visible mobile usability correction before expanding templates.
2. Extend the ten-case approval matrix with coarse intent and material workflow
   differences. Measure first usable outcome, questions and rescue steps.
3. Validate the journey with ordinary users on real phones; desktop browser
   viewport tests are not physical-device evidence.
4. Resolve H1's existing host/account/access prerequisites and real-user identity
   decision before claiming shareable private applications. Hosted ADR-0047
   remains proposed; this slice creates no external resources.
5. Expand definitions only after the supported journey is reliably generated and
   usable. Reusable business behavior matters more than a nominal template count.

### Next implementation entry and exit criteria

All follow-on slices and new families inherit the
[shared consumer acceptance matrix](../../acceptance/consumer-product-checklist.md).
Before dispatch, map it to that family's actual business journey and screens;
at acceptance, include generated visual evidence and all applicable outcomes
in the existing review. D2.4's layout is an approval example, not a universal
screen design. Missing required dimensions remain open even when tests pass.

| Priority | Work                                                                                                                                                  | Evidence required to advance                                                                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2.5     | Exercise A01 coarse approval intent and classify the remaining A01-A10 gaps before changing code. Reuse the existing interpretation/composition path. | Keep each first real outcome separate from deterministic fixture results; record material questions, technical handoffs, time to usable app, task completion and manual rescue. Fix the first reproduced product gap with a focused regression.           |
| D2.6     | Address material business differences one at a time, then validate ordinary-user mobile completion.                                                   | Preserve required business questions when missing facts affect workflow or access. Confirm creation, submission, decisions and retained results; record observed user confusion and backtracking on real phones. Browser viewport checks remain separate. |
| H1       | Resolve the proposed hosted identity/access/provider decision and implement only its accepted scope.                                                  | Real authenticated users, appropriate data access, a reachable application and an operational recovery path must be demonstrated before claiming a shareable private product. Local demo roles do not satisfy this milestone.                             |
| Later    | Extend Appointment and additional reusable business definitions.                                                                                      | Each supported definition must generate and complete its core business journey with usable responsive presentation. Catalog size is secondary to measured completion and reduced user effort.                                                             |

Use focused checks for the changed path and reuse valid evidence. Run the full
consumer journey when an affected lifecycle or generated interaction requires
it; retain broader gates at contract/security/release boundaries. A green
developer check does not substitute for a visible, completed user task.
