# Approval correction implementation report

Status: DONE_WITH_CONCERNS. Implementation, bounded R1/R2/R3 repair, persisted Published-input compilation fix, and session-header verifier fix verification complete; all source/test writes paused and frozen for independent scoped recheck and root-owned persisted acceptance. No Git mutations, runtime providers, Docker services, or external transport used by this owner.

## Scope and implementation

Implemented the accepted ADR-0060 correction contract and independently accepted ADR-0062 presentation integration. The same serialized owner implemented the Tech Lead KEEP verifier compatibility extensions recorded in task-1-brief.md and the ledger. Root owns E2E, Workbench fixture, and governance/acceptance documentation.

- Adapter canonical Expense/Purchase definitions now declare draft/submitted/approved/returned, requester update authority, Return and Revise transitions, and correction/resubmission interpretation. Material ambiguity boundaries remain explicit.
- Compiler-private structural selection validates the exact flow, roles, grants, six pinned selections and bindings, entity footprint, page blocks and capabilities. Malformed correction graphs fail closed. An unrelated non-approval flow containing `returned` does not select correction. No public selector, Graph version, package lock, or immutable Compilation contract changed.
- Generated API accepts strict values envelopes, versioned PATCH/transition commands and scoped header keys. Authentication precedes replay. Canonical normalized request hashes, conditional status/version updates, serializable Prisma transactions, bounded serialization/unique-conflict retries, and durable receipts recover the stored successful response. Every accepted mutation appends one audit record atomically with reason, declared effects, local outbox and receipt. Memory transactions implement equivalent rollback/replay semantics and cloned reads.
- Selected records start at version 0. Returned revisions update the same ID to Draft; resubmission and final approval retain decision history. Invalid fields, factory-owned fields, malformed descriptors, stale versions and unauthorized actions return bounded errors. Record decision history requires read authority and returns only actor/action/entity/recordId/reason/at.
- Existing approval presentation is parameterized for the correction variant. It preserves approved local icons/media, adds row-scoped Edit/Save and Return reason forms, retains request keys after unknown outcomes, guards pending requests and scope changes, refreshes stale conflicts without overwriting, and carries filtered-row success to generation-guarded parent list feedback after the row unmounts. Reason text is escaped by React. Return reason and history remain record-scoped.
- Graph-derived worker verification applies wrapped values, strict expected versions, PATCH/200 mutation routes and header replay only to exact correction output with the corresponding immutable lock. The local predicate mirrors compiler selection without a public compiler export. Stored-success probes check bounded status/identity only; bodies, keys, reasons and hostile response content never enter evidence. Existing static/Restaurant/legacy replay403 behavior remains covered.
- Bounded request forwarding accepts only the existing flat primitive record or exact `{values}` / `{expectedVersion,values}` envelopes. The existing 512-character total, 16 value keys, key regex, 200-character string and finite primitive limits remain. Arrays, null, deeper values, extra outer keys and invalid versions are rejected before fetch without echoing the body.

## Focused RED/GREEN evidence

Commands run from the assigned consumer-delivery worktree using pnpm.

1. `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts`: initial dispatch RED 1 passed / 1 failed because the mutation contract was absent; immutable legacy proof already passed. GREEN grew to 14 executed tests covering protocol/runtime/rollback/presentation and strict emitted API+UI typechecking.
2. `pnpm --filter @factory/adapters test -- test/requirement-interpreter.test.ts`: canonical RED 137 passed / 1 failed (expected returned; received rejected). GREEN 138 passed after definition/selection changes.
3. `pnpm --filter @factory/compiler-worker test -- test/verification-graph-plan.test.ts test/verification-probes.test.ts`: protocol RED 57 passed / 3 failed (missing values envelope and stored-success replay). GREEN 60 passed before expanded negative cases; final graph-plan file now has 22 passing tests and probes 44.
4. `pnpm --filter @factory/compiler-worker test -- test/verification-environment.test.ts`: exact-envelope RED 18 passed / 3 failed (`Request bodies must be bounded declared fixtures.`). GREEN 21 passed; valid bodies forwarded byte for byte, invalid bodies never fetched.
5. `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts`: icon preservation RED 12 passed / 1 failed (`lucide-receipt-text` absent). GREEN includes executed Submit/Approve/Return icon rendering plus success after refresh removes the row.
6. `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts test/database-target-parity.test.ts test/role-journey-runtime.test.ts`: GREEN 78 tests / 3 files. Legacy database and journey helper bindings preserve existing expected assertions. The original full migration run exposed 39 failures (37 database tests during an incorrect baseline restore, plus 2 journey fixtures); the database file was restored from the exact frozen Git base with 60 tests retained, then only scoped fixture bindings reapplied. Fixture scaffolding errors in added worker negatives were corrected before final verification.
7. Rollback coverage injects failure after each underlying create, conditional update, audit, capability event, notification enqueue and receipt write; it verifies all previously committed state remains unchanged, no outbox survives, and the failed key can subsequently succeed.

## Final package checks

- Adapters full suite: 185 tests / 11 files passed.
- Worker full suite: 301 tests / 20 files passed (final run 22:06:19, duration 8.12 s).
- Compiler full final suite: 693 tests / 41 files passed (start 22:04:29, duration 188.35 s).
- Final strengthened rollback/presentation focused rerun: 14 tests / 1 file passed (22:06:52, duration 11.21 s).
- `git diff --check`: passed. Temporary emitted typecheck fixtures were cleaned; no generated test files remain.
- `pnpm --filter @factory/adapters typecheck`, `build`, `lint`: passed.
- `pnpm --filter @factory/compiler typecheck`, `build`, `lint`: passed.
- `pnpm --filter @factory/compiler-worker typecheck`, `build`, `lint`: passed.
- Tests execute generated transaction modules and React rendering/command callbacks, and strictly typecheck all emitted API source plus generated UI. They do not substitute for root-owned persisted PostgreSQL/HTTP/browser acceptance.

## Immutable legacy proof

Permanent standalone `packages/compiler/test/fixtures/approval-legacy.ts` was captured before implementation from base `92f21089beeb184a236a1512cb4c1866f158e903`; it imports no mutable adapter builder. Tests regenerate each input twice and compare every ordered path, byte length and SHA-256 plus whole-manifest and bundle hashes.

| Input | Files | Manifest SHA-256 | Bundle SHA-256 |
| --- | ---: | --- | --- |
| Expense | 63 | ba92104233b89d77cba794aa5bac632294aa3f436a14d114ab94f9f17e61c19e | 1f2e8cd027720107ac48a44cb2ca5335ddbe4380f2f58073250309dde75adac6 |
| Purchase | 63 | 0e9f7c95065f7261e9ca4bff271294d78e475644d84e8d6853d11d944e8c5791 | e1a4aa49712f7b79fb9214c89c8439a1dbb4c61b6c6833545787fc81473f35fb |
| Booking | 62 | c96ec5e61fdc8c2b5a4163c429fa4dfea8c13a2964e607561439f2b8eb5e2888 | cd1c3e4693bb6f3056ca667f17985f5fcefbe07c8d4dffd1ad151edc4819ce18 |

Manifest hash is SHA-256 of JSON ordered `{path,bytes,sha256}` entries. Bundle hash is SHA-256 of ordered length-delimited path/content (`UTF8ByteLength:pathUTF8ByteLength:content`). Existing old-purpose composition/database/journey tests use these frozen inputs instead of rewriting legacy expected hashes to correction output.

## E2E handoff and concerns

Each `.approval-record` contains its controls and forms with accessible names `Edit record` / `Return record`; actions are Edit, Save, Return, Cancel. The reason control label is `Reason for return`. The latest return reason appears above Edit, with retained `Decision history` details below. Global auditor history displays Return and its reason. Mutation feedback exists both for the row and at list level; parent updates check scope generation. Filtered successful mutations retain `Expense: Approved.` or `Purchase request: Approved.` / `Purchase request: Returned.` even when the row disappears.

Exact safe error copy:

- `This record changed. Review the refreshed record before trying again.`
- `The result is unknown. Try again to recover this request.`
- `Decision history is unavailable. Try again.` (with Retry)

Actual concurrent PostgreSQL commands, response abort/replay, persisted reconstruction and browser journeys remain root-owned acceptance work. No claim of those gates passing is made here. Compiler-private and worker-local exact selectors intentionally duplicate a frozen contract; future contract changes must update both with matching tests. The verifier retains its existing bounded flat-value scope and does not claim support for arbitrary nested Graph values.

## Bounded task-review repair R1/R2/R3

The root-authorized single repair batch addresses exactly the three P2 findings in task-review.md. No new dependency, public contract, ADR, service, or Git mutation was introduced. Previously recorded full-package evidence describes the pre-review baseline; only affected focused suites and package checks were rerun for this batch as requested.

- R1: Both private selectors require one required enum status column containing exactly draft/submitted/approved/returned. Missing status, integer status, incomplete enum and optional status are rejected even with a valid recomputed immutable composition lock. Business-field material fallback remains independent.
- R2: EntityRecords now owns a Map of command states within its existing entity/page/role scope. Each record retains edit mode, declared values, reason, edit version, pending lock and exact retained payload/key. Filtered children subscribe to the stable state and can unmount/remount without releasing the lock. Responses update that owner and the current parent; scope replacement discards the former owner. Retried unknown commands reuse the saved serialized body. Existing field-edit handlers invalidate the saved key.
- R3: Conflict refresh and success use the current parent scope guard rather than the child-alive flag. A filtered-away row reports the exact safe conflict feedback; an obsolete scope receives no final mutation feedback. History reads retain their separate child lifetime protection.

RED evidence:

- `pnpm --filter @factory/compiler-worker test -- test/verification-graph-plan.test.ts`: 22 passed / 4 failed at 22:28:25; all four valid-lock status negatives incorrectly selected stored-success correction.
- `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts`: four compiler status negatives reproduced absent fail-closed selection. After R1, final lifecycle RED at 22:30:44 was 18 passed / 3 failed: actual React DOM Edit and Return lost their forms after filter out/back, and 409 refresh left parent feedback pending.
- The previous filtered-success harness selected the first true ref, which could identify pending instead of child lifetime. The harness now targets the actual lifetime ref and exercises both HTTP 200 and 409 with current and obsolete scope. Early React DOM harness event-dispatch mistakes were repaired before counting lifecycle RED evidence.

GREEN evidence on the final repaired source:

- `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts test/composition-page-runtime.test.ts`: 62 tests / 2 files passed, start 22:33:58, duration 26.59 s (23 correction and 39 legacy presentation tests).
- `pnpm --filter @factory/compiler-worker test -- test/verification-graph-plan.test.ts test/verification-probes.test.ts test/verification-environment.test.ts`: 91 tests / 3 files passed, start 22:34:08, duration 3.43 s.
- Compiler and worker each passed `typecheck`, `build`, and `lint` after the repair. No adapter files changed in the repair.
- The two new lifecycle tests mount the emitted EntityRecords with React DOM using the already-installed Vitest happy-dom peer. They hold an actual fetch promise, filter the row out/back, verify preserved form/value/reason and disabled controls, dispatch a second submission and observe one request, reject the first response, filter out/back again, and compare the complete retry request options (including identical body/key). They do not launch product services or replace root PostgreSQL/browser acceptance.
- Ordered legacy hash proofs still pass. Generated strict API/UI typechecking still passes. All source/test writes are paused at this repaired handoff. Root must refresh image/source evidence and obtain the scoped independent recheck before actual acceptance.

## Actual-QA Published-input compilation fix

Root reported failed immutable compilation `cmtyhteol000dp84tjghvrs46` before preview. Read-only Control Plane retrieval located Published Revision `cmtyhtenr000bp84tfkdopaqu`; its stored Graph hash matched the compilation input hash. A direct compiler call reproduced the bounded error `Approval correction shape is not supported.` at the private selector's six-package check. No Graph, prompt, credentials or response bodies were printed or persisted; diagnostics emitted only safe category, compiler stack file and booleans/counts.

Root cause: the existing lifecycle intentionally strips mutable `integration.compositionSelections` in `publishedGraphFromDraft`, retaining six verified selections only in the separate immutable compositionLock. The correction selector and worker had incorrectly required those selections inside the Published Graph. Synthetic fixtures retaining draft selections masked the lifecycle mismatch.

The fix stays within six previously owned paths: compiler `src/approval-mutation-contract.ts`, `src/index.ts`, `src/targets/database/target.ts`, `test/approval-correction-runtime.test.ts`; worker `src/verifier/verification-graph-plan.ts`, `test/verification-graph-plan.test.ts`. The compiler-private selector now consumes the separate checksum-bound immutable lock, still enforcing all six exact packages and bindings; optional embedded test selections must agree structurally. The selected entity is passed through private render arguments and the database plan. The original Published Graph is never hydrated, mutated or rehashed from added metadata. Runtime receipt scope uses its original Published checksum. Worker derivation uses the separate matching lock and still rejects malformed contracts. No public selector export, Graph/schema version, dependency, service or Git mutation changed.

Focused RED evidence:

- Direct call against the persisted failed input reproduced the selector error with matching input hash, zero embedded selections and six separate locked packages.
- `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts`: both published Expense and Purchase positive regressions failed with that same safe selector error before repair. An early checksum-negative fixture lacked the required prefix and was corrected before final evidence.
- `pnpm --filter @factory/compiler-worker test -- test/verification-graph-plan.test.ts`: 26 passed / 2 failed at 22:49:44; both published families fell back to legacy replay instead of deriving stored-success commands.

Final GREEN evidence:

- Direct read-only call against the exact persisted Published input after the final build: 63 generated files, original input hash matches, input Graph/lock JSON unchanged, receipt schema present. Worker derivation from that same input produces one stored-success probe and one PATCH action. This creates no artifact files and does not change the failed Compilation record.
- `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts test/composition-page-runtime.test.ts test/database-target-parity.test.ts`: 128 tests / 3 files passed, start 22:53:46, duration 32.14 s (29 correction, 39 legacy presentation, 60 database tests).
- `pnpm --filter @factory/compiler-worker test -- test/verification-graph-plan.test.ts test/verification-probes.test.ts test/verification-environment.test.ts`: 93 tests / 3 files passed, start 22:53:56, duration 3.88 s.
- Both affected packages passed typecheck, build and lint. `git diff --check` exited 0. No unrelated full-suite rerun was performed.
- The emitted command/transaction tests now default to a true Published Graph without draft selections and a separate recomputed immutable lock. Positive generation and malformed package/binding/checksum/status cases cover this shape for both families. Ordered legacy hashes and R1/R2/R3 tests remain green.

All source/test writes paused at this handoff. Root must refresh final image/source evidence and rerun actual QA. The direct compiler reproduction is not a claim that HTTP/database/browser acceptance has passed.

## Actual-QA session-header verifier fix

Attempt 2 passed immutable compilation but both verifications failed before user preview. Safe persisted evidence showed migration, health, reads, denial and cleanup passed; create returned HTTP 400 (`role-journey.unexpected_status`), submit HTTP 400 (`idempotency.first_request_unexpected`), and approve/reject/update chains HTTP 400 (`role-journey.chain_unexpected`). The overall diagnosis was `binding.status_mismatch`. The scoped identifiers were Expense compilation `cmtyij0ja0009o54twcmsym0f`, verification `verify-906aae97-1cf8-4934-b0c9-5a727e989b77`; Purchase compilation `cmtyimlrs002co54t9jboi55s`, verification `verify-f6a67e25-952d-4324-a415-36356a59a9fd`. Read-only CP/Prisma and bounded worker-stage diagnostics made no service or run-state changes.

Root cause: probes.ts `journeyHeaders` returned immediately for sessionId, dropping already validated declared headers. Published correction journeys carried both the resolved fixture session and required idempotency key; actual mutation requests received only the session header. The previous principal-based replay test never exercised that session branch.

Root authorized exactly `apps/compiler-worker/src/verifier/probes.ts` and `apps/compiler-worker/test/verification-probes.test.ts`. Session journeys now forward declared headers followed by the resolved fixture-session header, preserving resolved authority. Existing validation still rejects attempts to declare a conflicting fixture-session header before any request. Header/body allowlists, response handling and redaction remain unchanged.

- Direct in-memory probe capture from the exact persisted Expense Published input confirmed before-fix booleans: input session=true/key=true, forwarded session=true/key=false. After the final worker build, forwarded session=true/key=true. Capture did not issue a business HTTP mutation; it inspected arguments to an isolated request double and is not a claim of actual verification passing.
- RED: `pnpm --filter @factory/compiler-worker test -- test/verification-probes.test.ts`, start 23:09:32: 45 passed / 2 failed. Both actual Published-shape families failed because session+key were not forwarded together.
- GREEN: `pnpm --filter @factory/compiler-worker test -- test/verification-probes.test.ts test/verification-graph-plan.test.ts test/verification-environment.test.ts`, start 23:09:50, duration 3.47 s: 96 tests / 3 files passed (47 probes, 28 graph plan, 21 environment).
- The new both-family tests exercise published graph-derived create, stored-success replay, and every approve/return/revise chain through the real probe functions. Each request must carry exactly one resolved session and the same declared command key; replay options remain identical. A separate regression rejects a declared session override before request dispatch. Evidence assertions exclude keys and captured record IDs.
- Worker typecheck/build/lint passed and diff-check exited 0. Compiler/adapter sources and prior passing evidence were unchanged. Source/test writes are paused; report hashes below include this final two-path repair. Only the worker runtime image requires rebuilding for this fix. Actual QA must rerun under root control.

## Actual-QA compact command layout fix

Attempt 4 reached the generated product UI for both families, but the first Submit button ended at 704.984375 px in the 390 x 900 viewport, exceeding the unchanged accepted 650 px boundary. The existing record grid reserves row 3 for actions/Details and row 4 for progress. The correction-controls wrapper specified a full-width column without a grid row, so automatic placement moved all commands after progress into row 5. Existing direct-child action styles did not apply to the wrapper.

The bounded repair changes only correction CSS emitted in `packages/compiler/src/index.ts`: place the wrapper explicitly in row 3, reserve the existing Details width beside commands, keep nested details in their own grid, use the existing spacing token, and align the wrapper after the media column on desktop. Full-width edit/return forms and all controls remain present. No threshold, label, icon, business behavior, API, lock, or legacy-output contract changed.

- Focused RED: `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts`, start 23:32:40, duration 14.04 s: 29 passed / 2 failed. Both new Chromium tests reproduced the exact actual-QA 704.984375 px bottom using the full emitted application DOM and CSS from Published inputs.
- Initial GREEN: the same command, start 23:34:41, duration 13.96 s: 31 passed.
- Final GREEN: `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts test/composition-page-runtime.test.ts`, start 23:38:00, duration 27.46 s: 70 tests / 2 files passed (31 correction, 39 legacy presentation). The two new tests measure real Chromium layout at widths 390, 768, and 1440 with height 900, preserve the 650 px boundary, verify all command targets at least 44 x 44, and verify Submit does not overlap Details.
- Final measurements: both families Submit bottom 615.59375 px at widths 390 and 768; Expense 477.703125 px and Purchase 477.421875 px at width 1440. Submit is 102.046875 x 44 px at every measured width.
- Original generated-only 390 px screenshots were captured directly by Playwright with `FACTORY_CORRECTION_LAYOUT_EVIDENCE_DIR` pointing at this report directory: `correction-layout-expense-390.png` and `correction-layout-purchase-390.png`. They are unmodified PNG bytes; this is isolated emitted-DOM evidence, not a replacement for actual persisted browser acceptance.
- Compiler typecheck, build, and lint passed. Diff-check passed. No worker, adapter, backend, or product-service changes were made; previous evidence for those paths is retained. Source/test writes are paused for root's image refresh and actual QA rerun.

## Approved accent inheritance follow-up

Root's inspection of the original mobile screenshots found the same direct-child selector mismatch also omitted the approved accent style. Existing legacy CSS targets `.approval-record > .approval-actions`; correction adds an intervening command wrapper. This was a concrete inheritance regression. The correction-only CSS now applies the same existing accent/background, border, and text tokens to enabled direct command buttons and form submit buttons. Cancel keeps the existing secondary style; disabled commands retain existing disabled presentation. Legacy CSS and emitted legacy bytes remain untouched.

- Color RED: `pnpm --filter @factory/compiler test -- test/approval-correction-runtime.test.ts`, start 23:40:57, duration 14.98 s: 29 passed / 2 failed. Chromium computed white background/muted border/dark text instead of accent `rgb(21, 94, 239)` background/border and white text for both families.
- After the source fix, the combined correction/presentation run at 23:41:27 passed all 39 legacy presentation tests but exposed a test-harness omission: isolated command fragments lacked the generated application's inline token declarations. The test now renders each emitted command scenario inside the actual generated application shell so token resolution is exercised rather than comparing unresolved transparent values. This was test-only; production source stayed frozen.
- Final correction GREEN: the focused command above, start 23:42:21, duration 23.61 s: all 31 tests passed. Both families verify computed token background/border/text on Submit at all three widths, Approve and Return actions, primary Save and Return form buttons, and visually secondary Cancel. Existing geometry, target size, immutable transaction, replay, filtered-remount, conflict, and obsolete-scope tests remain green. Together with the unchanged-source 39-test presentation result this supplies 70 affected passing checks.
- Compiler typecheck, build, lint and diff-check passed after the final production CSS change. Only the test harness was subsequently corrected and formatted. Refreshed original 390 px screenshots at the existing report-directory paths now show the approved accent buttons; all Submit geometry remains identical to the preceding section.
- Final source/test writes are paused. Root owns image refresh, review, and the actual persisted QA rerun.

## Frozen write manifest

All owned implementation/test paths below are ready for review. Source and test writes are paused. Hashes below match the final owned files. Report-only completion updates do not alter emitted bytes.

| Owned path | SHA-256 |
| --- | --- |
| packages/adapters/src/requirements/approval-definition-template.ts | fbb8bc45f6d616fd1cf8c238ff275bd22100a952c179f0889196681a485c6d37 |
| packages/adapters/src/requirements/approval-definition-selection.ts | 38893e071880b1de004c26c37db489af5f519303824686ef601eeb03a2e4344a |
| packages/adapters/src/requirements/purchase-request-definition-selection.ts | 92d3bfc907c248ecbeec86b4f985c406a71c5869e80baa6335b108980770fa90 |
| packages/adapters/test/requirement-interpreter.test.ts | 0acca796e5bee29184e9b6b0d666b2e2c284c91941aa1e744b944e1f45536469 |
| packages/compiler/src/approval-mutation-contract.ts | e0887dee854c59c3fff2521a50cbe61b89fd47a26db4c4f167b7b90114bcaab4 |
| packages/compiler/src/index.ts | 42a87b685943fadb86b745978f9667b5252901b3fafb84ed8f81c0d21bca4ddc |
| packages/compiler/src/approval-workspace-presentation.ts | db5bb0c753f2a3e0b1667f6868a56849f201fe3fbedf0f127a323f635e1b1725 |
| packages/compiler/src/approval-decision-history.ts | 2d0668557182c2e9ebef8fd44da235701facc3abbcc8b46229e9269d19c602d1 |
| packages/compiler/src/approval-presentation-components.ts | 30fb07dfd0b5add46c549529c3ac2a066d6cf011ea6b74aad6a3c50b78f5c031 |
| packages/compiler/src/approval-visual-assets.ts | 34f0085f7bb9339b72ae3b23678c7715307cd7fe4db98c7cb1c3548726f0d991 |
| packages/compiler/src/targets/database/target.ts | 688ee494c07190d012790f40bc6239428bd4d3887eb02a75bd6731636f73a955 |
| packages/compiler/test/composition-page-runtime.test.ts | 1bbcba839d2cfe511bdaea2a5f120bcb77618204b0098605008c8c6796a43c1b |
| packages/compiler/test/database-target-parity.test.ts | de3b1331f6004dcc9aee60513b15fec1e56e515d7c2d251ccc370e10d963b011 |
| packages/compiler/test/role-journey-runtime.test.ts | 08db1033abc65802a7de7ae659b12dd2714e46682b009f44fed53ec7a60f8472 |
| packages/compiler/test/approval-correction-runtime.test.ts | 07a6dec059377557b408413f23ccacc5ed75776b1547f5e2e9fb0bcad56b7ff1 |
| packages/compiler/test/fixtures/approval-legacy.ts | 0fef3e089a838e38091da2e78910ae460e21834eda18a12ffb272b27757a1614 |
| apps/compiler-worker/src/verifier/verification-graph-plan.ts | f9ad9d69d719b36b5cdc364ab74399c64292101e7fad09dc4bba02e92357f5b4 |
| apps/compiler-worker/src/verifier/role-journey.ts | 784cf622a6e548fafd22dfe6011a7d2596e155f33cc80b79e0c46d0ee1d84f9e |
| apps/compiler-worker/src/verifier/probes.ts | e3fcd97d6b86ceee8e786cc8edcbd1298f7c83d2539091c5980ad28d7f36d0d9 |
| apps/compiler-worker/src/verifier/verification-environment.ts | 63f9c248c1dfe0367d6b921f08267f42b01c4571c29fbf204359e8eeba12dfbb |
| apps/compiler-worker/test/verification-graph-plan.test.ts | 8de2e27daf57d257dea347cd3b6421f8e1dfd39d16f4f5de796915f288c8e246 |
| apps/compiler-worker/test/verification-probes.test.ts | e51644b7c987461ce1be13c5a424291d103d3f9a5656fb56362d55c20680552a |
| apps/compiler-worker/test/verification-environment.test.ts | 7ff4b1de49c0b0f312a321d0eaa674b2f021d8705d8dd0ada4b44121cfc253c5 |
