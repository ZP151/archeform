# Approval correction whole-slice task review

SPEC_COMPLIANCE: NEEDS_FIXES

TASK_QUALITY: NEEDS_FIXES

APPROVED_FOR_QA: no

Findings: P0/P1/P2 = 0/0/3. This is the implementation task gate before actual QA, not a release-readiness judgment.

## Review boundary and evidence

- Independent read-only reviewer: `/root/approval_correction_review`; not the implementation writer. Only this review report was written. No Git mutations, application runtime, services, providers, or suite reruns were performed.
- Reviewed the complete working-diff package against `92f21089beeb184a236a1512cb4c1866f158e903`, task brief and its exact worker/test ownership extensions, implementation report, plan, accepted ADR-0060/0062, governance, threat model, delivery policy, ledger acceptance records, and both root-owned E2E additions.
- Independently read SHA-256 values: ADR-0060 `b47961bec46af1757087e3c067ff6c1e35556aae2b07e9de01e0dbc16f122107`; ADR-0062 `088cef645a80a34d05fe027cec3e15914ba2735bdd682778c7de41e96a5b8201`. They match the recorded accepted decisions. Their retained Proposed headers do not override the independent acceptance recorded in the ledger.
- The source-freeze check covered 33 paths. All production and test paths matched. Only `docs/acceptance/approval-correction.md` differed, consistent with root continuing its acceptance note. This review judges the frozen diff, not later acceptance claims.
- Reported package results are compiler 693, worker 301, adapters 185 tests, plus the reported build/typecheck/lint checks. These are implementation-owner evidence, not independently rerun results. The focused test source was inspected; actual PostgreSQL/HTTP/browser QA remains pending.

## Strengths

- Commands authorize before receipt access, validate strict envelopes, derive length-delimited actor/role/entity/record/operation scope, normalize payload hashes, and put receipt replay before record existence/version/state checks: `packages/compiler/src/approval-mutation-contract.ts:354` through the transaction at line 371. The controller resolves validated fixture identity before supplying its session scope; the unchanged resolver was checked at `packages/compiler/src/index.ts:3597`.
- A successful command performs its conditional write, audit/reason, declared effects, local notification enqueue, and receipt inside one store transaction; Prisma uses Serializable transactions and bounded retry for the relevant conflicts: `packages/compiler/src/approval-mutation-contract.ts:371`, `:384`, `:393`, `:396`, and `:461`. Error bodies omit business values, and authoritative version conflicts expose only id/status/version.
- Secondary-entity mutation confinement is explicit in command and HTTP routes, and version is added only to the selected entity: `packages/compiler/src/approval-mutation-contract.ts:355`, `:529`, and `packages/compiler/src/targets/database/target.ts:447`. Decision reads recheck read authority and project exact event fields at `packages/compiler/src/approval-mutation-contract.ts:398`.
- The new regression file executes emitted runtime modules, checks all seven steps of the same-record journey with reconstructed ApplicationRuntime instances, exercises simultaneous keys, and injects failures after underlying persistence operations: `packages/compiler/test/approval-correction-runtime.test.ts:118`, `:182`, `:478`, `:798`, and `:854`.
- Permanent standalone legacy fixtures and ordered per-file/aggregate hash comparisons preserve old output expectations rather than updating them to new output: `packages/compiler/test/fixtures/approval-legacy.ts:1` and `packages/compiler/test/approval-correction-runtime.test.ts:44`.
- Presentation is parameterized through existing assets and controls. Reasons are React text children, and existing icons/progress are exercised: `packages/compiler/src/approval-mutation-contract.ts:671`, `packages/compiler/src/approval-decision-history.ts:50`, and `packages/compiler/test/approval-correction-runtime.test.ts:646`.
- The worker consumes correction bodies only after its exact graph/lock predicate; its stored-success probe retains bounded status/identity facts rather than response contents: `apps/compiler-worker/src/verifier/verification-graph-plan.ts:454`, `:716`, and `apps/compiler-worker/src/verifier/probes.ts:488`. The request adapter retains bounded flat values and exact envelopes at `apps/compiler-worker/src/verifier/verification-environment.ts:100`.

## Important findings

### R1 — P2: Reject an incompatible stored status field before selecting correction

Location: `packages/compiler/src/approval-mutation-contract.ts:251`–`:259`; mirrored at `apps/compiler-worker/src/verifier/verification-graph-plan.ts:1053`–`:1061`.

The final entity check only verifies that the entity exists and lacks four reserved fields. It never validates the status field that every correction command writes. An otherwise exact correction Graph can change its status field to `integer` and still select correction; a missing status field also passes this predicate when its index/seed references are removed. Graph validation checks flow states and transitions separately from field storage, so it does not close this gap (`packages/graph/src/model.ts:823`). The database emitter then projects the declared type/absence, while create unconditionally writes `status: 'draft'` and later commands write the other string states (`packages/compiler/src/approval-mutation-contract.ts:374`, `:381`; `packages/compiler/src/targets/database/target.ts:444`). The resulting PostgreSQL product cannot perform the accepted journey even though correction was selected. This breaches ADR-0060 SEL-001/DAT-001 and the fail-closed presentation dispatch in ADR-0062 SEL-001.

Validate the selected entity's status declaration against the accepted correction storage semantics in both private predicates before any correction output is admitted. Add focused compiler/worker negatives for missing and incompatible status declarations, with a valid recomputed lock so a checksum mismatch cannot mask the predicate. Keep the permitted generic fallback for unrelated business-field material signatures separate from an unusable workflow status column.

### R2 — P2: Preserve the record command lock and retry payload across filtering

Location: `packages/compiler/src/approval-mutation-contract.ts:638`–`:648`, with the child mounted only for visible records via `:622` and `packages/compiler/src/index.ts:3147`–`:3152`.

Pending state, retained key/payload, edit version, edit values, and reason live only inside `ApprovalRecordCommands`. Search and status filters remain usable while a command is pending. Start a held Save/Return, filter that row out, and clear the filter before the request resolves: React mounts a fresh child with `pending=false`, `busy=false`, and no retained request. The parent still knows a mutation is pending, but the child receives none of that state and enables another mutation for the same record. Filtering after an unknown result likewise discards the payload/key required to recover that command. The server concurrency guard prevents a stale overwrite, but the UI violates ADR-0060 UI-001's pending lock and retained-key recovery contract inside an unchanged role/entity/page scope.

Keep command state in a stable scope-and-record owner above the filtered rendering, or provide an equivalent mechanism that preserves both the pending lock and exact unknown-result retry across a row remount. Add an executed React/browser regression that holds a request, filters out/back, verifies no second command can start, then loses the response and verifies the recovered retry uses the original payload/key. The current pending E2E at `e2e/approval-presentation.ts:918` does not unmount/remount the row.

### R3 — P2: Deliver conflict feedback when its refresh removes the row

Location: `packages/compiler/src/approval-mutation-contract.ts:661` and `:667`.

The 409 branch refreshes the list and returns if the child has unmounted before reporting the conflict. For a Submitted filter, another reviewer can approve/return the record before this stale command; the authoritative refresh removes that row. In that lifecycle, the parent list feedback remains the earlier "in progress" state and never receives the required conflict message. The success path deliberately reports through the generation-guarded parent after refresh (`:665`), but the conflict path and catch retain the child-alive gate. This contradicts ADR-0060 UI-001's requirement that 409 refreshes and shows plain conflict feedback.

Send the conflict outcome to the existing scope-generation-guarded parent even when filtering removes the child, while still suppressing obsolete role/entity/page outcomes. Extend the executed filtered-success regression at `packages/compiler/test/approval-correction-runtime.test.ts:565` with a 409/unmount case. Verify that pending feedback is replaced with the exact safe conflict message and that no automatic retry occurs.

## Coverage and QA handoff

- The root E2E source uses actual HTTP requests for creation, conditional updates, reasons, decisions, and audits. Its lost-response handlers call `route.fetch()` before aborting delivery, so those cases are real commits followed by browser recovery, not fabricated successful mutation responses: `e2e/approval-presentation.ts:862` and `:1063`.
- Both lanes invoke the same-record helper and compare immutable Compilation fingerprints. The helper races two API writes at version 1, requires one 200/one 409, and checks final version 7, eight audit events, and two retained decisions: `e2e/approval-presentation.ts:959`, `:1125`, and `:1167`. These are authored acceptance checks; they have not passed under this review.
- Actual persistence reconstruction/replay, PostgreSQL transaction behavior, complete browser journeys, screenshots, asset loading, accessibility, and cleanup must remain explicitly open until QA provides evidence. Memory reconstruction keeps the same store and is not a database restart.
- The authored capture helper covers edit, reason, returned, and approved-history at all three widths, but pending/conflict/return-retry explicitly use only 390 px (`e2e/approval-presentation.ts:939`, `:998`, `:1090`). Before final acceptance, QA/root must supply the other required 768/1440 state evidence or record an explicitly justified reuse of valid unchanged evidence under the delivery policy. This is a pending acceptance obligation, not a claim that QA already failed.
- After these focused repairs, refresh affected source hashes and rebuild affected final-source images before actual QA. Preserve unrelated package evidence; no package-wide rerun is requested by this review solely to reconfirm the implementation report.

## Focused checks beyond diff context

These were read-only checks for named cross-cutting risks, not a broader audit:

1. Authentication/scope correctness: inspected the existing fixture-session resolver and controller role resolution at `packages/compiler/src/index.ts:3564`–`:3608`.
2. Filtered component lifetime: inspected `useEntityRecords`, visible-record mapping, and parent mutation feedback at `packages/compiler/src/index.ts:3013`–`:3038` and `:3109`–`:3163`, because the added emitter replacements did not include these complete functions.
3. Status-storage compatibility: inspected Graph field/flow validation and database field rendering. No existing status-column check rejects the admitted incompatible declaration.
4. New receipt model collision: checked the existing `assertUniqueDatabaseStorageNames` at `packages/compiler/src/targets/database/target.ts:1171` and its invocation at `:1230`. It already fails closed for duplicate Prisma/SQL names, so the suspected model-name collision is not reported as a defect.
5. Readable decision ordering and transaction integration: inspected the truncated Prisma listAudit/inTransaction context at `packages/compiler/src/index.ts:2530` and `:2547`. Actual database behavior remains QA-owned.

No additional architecture decision, dependency, public contract, or deployment action is requested by these findings. The existing accepted requirements are sufficient for their repair.

## Final scoped recheck — 2026-09-12

This section supersedes the earlier task verdict. The original findings above remain historical evidence. Scope was limited to R1/R2/R3 repairs, their affected tests, and root's E2E additions; no new broad audit or application/service execution was performed.

SPEC_COMPLIANCE: APPROVED

TASK_QUALITY: APPROVED

APPROVED_FOR_QA: yes

Remaining findings: P0/P1/P2 = 0/0/0. This authorizes the planned actual QA stage only. Actual PostgreSQL/browser acceptance and final release judgment remain separate and pending.

### Findings closed

- **R1 closed.** Compiler and worker predicates now require a required enum status declaration with exactly the four correction states (`packages/compiler/src/approval-mutation-contract.ts:259`; `apps/compiler-worker/src/verifier/verification-graph-plan.ts:1061`). Each predicate uses the existing duplicate-rejecting set comparison. Compiler and worker tests remove/mistype/truncate/make status optional while rebuilding a valid immutable lock, so checksum rejection cannot mask the original defect (`packages/compiler/test/approval-correction-runtime.test.ts:565`; `apps/compiler-worker/test/verification-graph-plan.test.ts:687`). The check is after correction candidacy and leaves legacy selection and separate business-field material fallback unchanged.
- **R2 closed.** The existing parent scope now owns the per-record command-state map; filter changes preserve it while role/entity/page scope changes replace it (`packages/compiler/src/approval-mutation-contract.ts:631`). Mode, edit values, reason, pending lock, edit version, and retained payload/key survive child remounts. Children subscribe/unsubscribe to that owner, commands check its pending flag and current parent generation, and retries use the saved serialized payload (`:658`, `:668`, `:682`, `:688`). Field editing still invalidates the retained key. The added emitted React DOM tests exercise both Edit and Return with a held request, filter out/back, retained field/reason, disabled controls, ignored second submit, a lost response, another remount, and exact equality of both request options including body/key (`packages/compiler/test/approval-correction-runtime.test.ts:597`).
- **R3 closed.** The 409 branch and catch report through the current parent-scope guard, rather than depending on the filtered child's lifetime (`packages/compiler/src/approval-mutation-contract.ts:692`, `:698`). Successful and conflicted commands refresh authoritative data and suppress outcomes from obsolete scopes. Tests now cover both 200 and 409 after child unmount in current and obsolete scopes, including exact conflict copy (`packages/compiler/test/approval-correction-runtime.test.ts:762`). History retains its separate child lifetime guard.

### Root acceptance additions checked

- Held Save now filters the row out/back, checks the edit value and disabled commands, and asserts that only one PATCH was sent (`e2e/approval-presentation.ts:927`). Unknown Return similarly filters out/back, retains the required reason, and compares both the retry key and exact `{expectedVersion: 3, reason}` payload (`:1080` through `:1128`). Both Expense and Purchase continue to use this shared helper.
- Pending, conflict, create retry, and Return retry captures now all include 390/768/1440. CSS/assets, axe, 44 px controls, and screenshots remain in the capture loop (`e2e/approval-presentation.ts:801`).
- The scoped read found and root immediately corrected one E2E-only issue: create-retry had applied the record-page hero requirement to a form page. The final helper takes an explicit `presentation: 'records' | 'form'`, defaults to records, and skips only the inapplicable record/hero material assertion for create-retry (`e2e/approval-presentation.ts:805`, `:811`, `:897`). All three widths, CSS/assets, accessibility, control sizing, and screenshots still run. Record-state material checks remain mandatory. This issue is closed within this same scoped recheck; production source was unchanged by that correction.

### Evidence and final freeze

- Owner reports focused GREEN: compiler 62 tests in two files (23 correction and 39 legacy presentation), worker 91 tests in three files, and affected compiler/worker build/typecheck/lint. The updated report records the corresponding failing status and lifecycle tests before repair. Those focused tests include ordered legacy byte checks and generated strict API/UI typechecking. Existing full-package results of 693/301/185 describe the previously reviewed baseline and were reused; this review does not represent them as rerun after repair.
- Root additionally reports Workbench `use-consumer-generation.test.tsx` 14/14 at 22:28:55 for the changed fixture briefs, plus two Playwright tests parsed by `--list`. Parsing remains discovery evidence, not browser success. Root reports the E2E-only follow-up formatting check passed.
- Independent read-only SHA-256 comparison against the final `source-freeze.json`, captured `2026-09-12T14:38:25.904Z`, matched all 33 paths with zero mismatches. Final mutation module: `9e72d62276a798ea5435917dd64a158dc46d5a165f2f5bdbd973aef94291add5`; worker graph-plan: `4db3b34c4e97f624acd092abc368a352b81c4ba8293e5afa0377fda6983c27fa`; E2E helper: `f7df97ee5c199afd590a1a2845b0408a5480a5a9fa6a53d8d575886817aef62f`.
- No production/test source edits, Git mutations, package-wide reruns, runtime services, or provider actions were performed by this reviewer. Only this report was appended. Root may proceed with final-source image verification and the planned independent actual QA.

## Scoped actual-failure recheck — 2026-09-12, final freeze 14:56 UTC

SPEC_COMPLIANCE: APPROVED

TASK_QUALITY: APPROVED

APPROVED_FOR_QA: yes

Remaining findings: P0/P1/P2 = 0/0/0 within this scoped repair. Earlier valid whole-slice and R1/R2/R3 review conclusions remain in force. This verdict permits another actual QA attempt; it does not claim PostgreSQL/browser acceptance or release readiness.

### Immutable Published Graph and separate lock

- The actual failure was the selector's assumption that a Published Graph retains draft `compositionSelections`. The repair consumes the separately supplied immutable composition lock at the private selector (`packages/compiler/src/approval-mutation-contract.ts:44`, `:60`, `:148`). It verifies the lock checksum against the original Graph and, if optional embedded selections exist, requires structural agreement. The existing six exact package/version/digest/binding checks still apply. This does not hydrate or rewrite the Published Graph.
- The facade's existing canonical-lock validation remains ahead of compilation (`packages/compiler/src/index.ts:282` and `:311`). It selects the correction entity with the separate lock and passes only that selection to private runtime/API/page/style renderers (`:3874`, `:4245`). The runtime still hashes the original Graph into receipt scope (`packages/compiler/src/approval-mutation-contract.ts:407`). I checked that the runtime receives `graph`, not the separate renderer-only asset-lock view.
- The database target obtains the same selection from its immutable input lock and carries it in its internal plan into schema/migration rendering (`packages/compiler/src/targets/database/target.ts:1123`, `:1216`). Version remains confined to that selected entity, and receipt/reason additions remain conditional. There is no Published Graph metadata mutation or historical artifact update.
- The worker now accepts absent embedded selections while checking the original Graph checksum and every exact separate package/binding through its private predicate (`apps/compiler-worker/src/verifier/verification-graph-plan.ts:454`, `:849`). Present embedded selections must still agree. Unsupported/malformed input retains the prior non-correction protocol rather than partially selecting correction.
- Both families now have positive tests with no embedded selections and a separate recomputed lock; tests assert unchanged input JSON, original Graph hash, correction runtime/schema/UI/proxy output, and malformed lock/binding/checksum/status rejection (`packages/compiler/test/approval-correction-runtime.test.ts:45`, `:59`, `:86`; `apps/compiler-worker/test/verification-graph-plan.test.ts:685`). Emitted runtime tests now default to this actual Published shape (`packages/compiler/test/approval-correction-runtime.test.ts:149`). Existing standalone legacy byte checks remain present and reported green.

### Acceptance fixtures, cleanup, and restart probe

- The Expense fixture now supplies authored definition-selection data through the registered parser/projector, like the existing Purchase fixture, instead of depending on an exact fixture-interpreter brief string (`apps/workbench/test/consumer-generation-fixture.ts:28`). This is test-only transport, not a model/provider call. The two new fixture tests verify requirement identity/checksum and current returned/revise semantics (`apps/workbench/test/consumer-generation-fixture.test.ts:8`).
- Both current-preview helpers safely treat an absent/empty current-preview result as no preview, and require a matching Compilation identity plus an ID before returning a cleanup target (`e2e/consumer-approval.spec.ts:76`; `e2e/consumer-purchase-request.spec.ts:56`). Existing exact-project validation and resource cleanup remain in place.
- The new restart probe stays inside the accepted lost-response/reconstruction case. It first commits Create via `route.fetch()` and aborts browser delivery, leaves the browser's retained request in place, then looks up a single running container by both the exact test Preview project and `com.docker.compose.service=api` labels (`e2e/approval-presentation.ts:905`). The project and resulting single container ID are validated before restart. It uses argument-array `execFileSync`, reads only `State.StartedAt`, requires a changed start timestamp, polls the same generated API back to 200, and reads the same persisted version-0 record before retry (`:911` through `:953`). The repeated successful body and original key are still compared. No database, other service, topology, or external resource is restarted or added.
- Expense and Purchase pass their already observed Preview project's exact name into that helper (`e2e/consumer-approval.spec.ts:842`; `e2e/consumer-purchase-request.spec.ts:890`). The safe evidence adds `apiRestartBeforeCreateReplay: true` only after the assertions complete (`e2e/approval-presentation.ts:1292`). Actual execution and cleanup remain QA-owned; this review only inspected the probe.

### Evidence and freeze

- Owner reports the exact previously failed persisted input now compiles to 63 files with original input hash and input JSON unchanged; worker derivation from the same input yields one stored-success probe and one PATCH action. This is focused reproduction evidence, not a browser acceptance result, and the failed Compilation record was not rewritten.
- Reported affected GREEN: compiler 128 tests in three files (29 correction, 39 legacy presentation, 60 database), worker 93 tests in three files, affected build/typecheck/lint, and `git diff --check`. Root reports the two fixture tests, 14 generation-hook tests, and Workbench typecheck passed. Prior unaffected full-package evidence is reused. No suites or application services were rerun by this reviewer.
- Independent SHA-256 comparison matched all 35 paths in `source-freeze.json`, captured `2026-09-12T14:56:04.582Z`, with zero mismatches. Checked final production hashes: mutation module `e0887dee854c59c3fff2521a50cbe61b89fd47a26db4c4f167b7b90114bcaab4`; facade `224c39e936826590e4cf3089b2e0d855f32b140b487422fd92bff2c2021ea01c`; database target `688ee494c07190d012790f40bc6239428bd4d3887eb02a75bd6731636f73a955`; worker graph-plan `f9ad9d69d719b36b5cdc364ab74399c64292101e7fad09dc4bba02e92357f5b4`. E2E helper hash: `8292a1ff24828d213269f0a24b5c853d32c6902ae0ce614c9166de53b7f32347`.
- Only this report was appended. No production/test edits, Git mutations, runtime/service execution, provider actions, or broad new audit were performed. Root can finish the matching image builds and proceed with actual QA against this freeze.

## Scoped session-header recheck — 2026-09-12, source freeze 15:11 UTC

SPEC_COMPLIANCE: APPROVED

TASK_QUALITY: APPROVED

APPROVED_FOR_QA: yes

Remaining findings: P0/P1/P2 = 0/0/0 within this scoped repair. The earlier valid whole-slice and repair reviews remain in force. This permits the next actual QA attempt; attempt 2 failed before user Preview, and neither actual acceptance nor release readiness is claimed.

### Header forwarding and security

- The session branch now preserves declared journey headers and appends the resolved fixture-session header (`apps/compiler-worker/src/verifier/probes.ts:84`). This fixes the observed loss of the required command key while leaving principal-only and anonymous construction unchanged. Both role journeys and stored-success replay use this helper; chained steps still resolve their session before construction (`:217`, `:291`, `:439`). Request bodies, receipt semantics, response handling, and evidence content are unchanged by this two-file repair.
- The named authority risk was checked against existing validation. Role-journey validation runs before dispatch, rejects simultaneous principal/session channels, rejects reserved principal headers and duplicates, and bounds lowercase names and identifier values (`apps/compiler-worker/src/verifier/role-journey.ts:407`, `:422`). Idempotency validation delegates to it (`:559`). Chain validation still forbids a switch of principal kind. Consequently a declared header cannot replace resolved session authority. The environment also retains its exact header-name allowlist and bounded values before fetch (`apps/compiler-worker/src/verifier/verification-environment.ts:84`, `:415`); no credential-named header or broader transport permission is introduced. Its existing object construction preserves the final resolved header (`:450`).
- Both-family regression cases derive the real correction journeys from a Published-shaped Graph with a separate immutable lock, then execute create, submit replay, and approve/return/revise chains through the probe functions (`apps/compiler-worker/test/verification-probes.test.ts:1142`). The request double returns 400 unless both session and command key arrive; assertions require the exact declared key, exactly one session, no role header, expected request counts, byte-equivalent replay options, and omission of key/record identity from evidence (`:1184`, `:1217`). The separate reserved-session override test fails before any request (`:1243`). These tests directly reproduce the missing-header branch that the prior principal-only replay case did not exercise.

### Evidence and source identity

- Owner reports focused RED at 23:09:32: 45 passed / 2 failed, one failure per Published family. Reported GREEN at 23:09:50: 96 tests in three files (47 probes, 28 graph plan, 21 environment), plus worker build/typecheck/lint and diff-check. The report also records isolated request-argument capture from the exact persisted Expense input: session and key were both present in the journey, only session was forwarded before repair, and both are forwarded after the final worker build. This is focused diagnostic evidence, not successful actual verification. No suites or services were rerun by this reviewer.
- Independent SHA-256 comparison against `source-freeze.json`, captured `2026-09-12T15:11:21.5Z`, matched 34 of 35 paths, including every production/test path. The only mismatch is `docs/acceptance/approval-correction.md`; root explicitly identified its concurrent status-only correction, and the inspected paragraph now accurately says actual acceptance remains open. This authorized bookkeeping change is not a source finding; final documentation reconciliation remains root-owned.
- The two reviewed hashes match both the owner manifest and source freeze: `apps/compiler-worker/src/verifier/probes.ts` = `e3fcd97d6b86ceee8e786cc8edcbd1298f7c83d2539091c5980ad28d7f36d0d9`; `apps/compiler-worker/test/verification-probes.test.ts` = `e51644b7c987461ce1be13c5a424291d103d3f9a5656fb56362d55c20680552a`.
- Scope was limited to the two-file header repair, its tests, and existing validation/transport needed to assess the named security risk. Only this report was appended. No production/test edits, Git mutations, runtime/provider operations, or broad repeat audit were performed. Root may complete the matching worker image build and rerun actual QA.

## Scoped command-layout and accent recheck — 2026-09-12, source freeze 15:43 UTC

SPEC_COMPLIANCE: APPROVED

TASK_QUALITY: APPROVED

APPROVED_FOR_QA: yes

Remaining findings: P0/P1/P2 = 0/0/0 within this scoped repair. Earlier backend, API, immutable-input, probe, and R1/R2/R3 conclusions remain in force. Actual attempt 4 exposed the compact-layout regression; this verdict permits another actual QA attempt and does not claim persisted acceptance or release readiness.

### Layout, tokens, and old output

- The only new production change is correction-gated CSS in `packages/compiler/src/index.ts:3476`. It explicitly places the correction wrapper in record grid row 3, where the existing layout already places commands and closed Details, with progress remaining in row 4. The direct command row reserves the existing 6 rem Details space. On desktop, the wrapper begins after the media column; mobile retains its full record width. Nested history details reset their inherited record-grid placement. These rules restore the intended existing layout instead of increasing the accepted viewport boundary.
- Edit and Return forms remain full width within the wrapper: the end padding applies to the direct command row and return-reason text, not the forms or fieldsets. The emitted forms still follow the nonempty disabled command row while a mode is active (`packages/compiler/src/approval-mutation-contract.ts:731`), leaving the closed Details affordance alongside that first row. Existing responsive field columns and 44 px controls remain unchanged. No controls, reason fields, history, or media were removed to achieve the compact result.
- The correction-specific selector uses the existing accent, border, and accent-text tokens for enabled direct commands and form submit buttons (`packages/compiler/src/index.ts:3478`). It does not recolor Cancel or disabled controls. This repairs the same direct-child mismatch that had prevented the legacy action selector from reaching the new wrapper. Legacy workspace/presentation styles remain unchanged, and the correction predicate still excludes the new CSS from old output. The focused suite retains exact ordered artifact path/byte/hash and combined bundle comparisons against both frozen legacy families, twice (`packages/compiler/test/approval-correction-runtime.test.ts:109`).

### Focused browser and root acceptance evidence

- The added both-family test renders the emitted Published-input application and actual emitted CSS into Chromium (`packages/compiler/test/approval-correction-runtime.test.ts:630`). At 390, 768, and 1440 with height 900 it measures the draft Submit bottom, requires the unchanged 650 px limit, checks each draft command target at least 44 x 44, and verifies Submit's right edge does not overlap Details (`:714`). The initial RED reproduced the exact persisted-QA bottom of 704.984375 px in both families.
- Computed-color checks resolve the actual inherited tokens and compare background, border, and text for Submit at each width. Additional emitted command scenarios are inserted into the real generated shell to retain its token declarations; they check Approve/Return and primary Save/Return plus secondary Cancel (`:694`, `:759`). These latter scenarios check colors, not complete interactive form geometry at every width. Actual persisted edit/return/pending/conflict/retry captures remain part of the upcoming QA.
- Independently inspected both refreshed original `correction-layout-expense-390.png` and `correction-layout-purchase-390.png`. Both show the approved cobalt actions, original family hero/record media, Submit beside Details without overlap, and progress beneath. The report's measured Submit bottom is 615.59375 px at 390/768 for both families, with 102.046875 x 44 px Submit targets. These are isolated emitted-DOM screenshots, not persisted runtime screenshots. Image SHA-256 values: Expense `c662dde24032551e9b56c11657dbaa49cce631e60cf5fef98350ca68d89e509c`; Purchase `1ead5349dacfe19f01f4bc0061a38958d8d2e024ce42e26140c74b9d0acb3ba6`.
- Root's decision-color selector now includes commands beneath the correction wrapper while retaining the legacy selector (`e2e/approval-presentation.ts:747`). The generated-page failure PNG catch captures the separate generated application page, swallows only directory/screenshot errors, then retains the original failure and cleanup path (`e2e/consumer-approval.spec.ts:897`; `e2e/consumer-purchase-request.spec.ts:924`). It does not capture the intake page or raw interpretation material. The mechanical immutable-input assertion recognizes the existing canonical `sha256:` prefix without changing the returned fingerprint comparison (`e2e/approval-presentation.ts:16`). Actual 650 px assertions and existing 44 px checks remain intact.

### Evidence and final identity

- Owner report records geometry RED 29 passed / 2 failed at 23:32:40 and subsequent 31 correction plus 39 presentation passing checks. Color RED at 23:40:57 again failed both families. After the CSS repair, an isolated-fragment token-harness omission was corrected without changing production; final correction GREEN at 23:42:21 passed all 31. The unchanged-source 39-test presentation run supplies the other affected checks. Compiler build/typecheck/lint and diff-check are reported passed after the production CSS change. Earlier backend/API/worker evidence is reused; no broad suites or application services were rerun by this reviewer.
- Independent SHA-256 comparison matched all 35 paths in the final `source-freeze.json`, captured `2026-09-12T15:43:55.097Z`, with zero mismatches. Final compiler facade hash: `42a87b685943fadb86b745978f9667b5252901b3fafb84ed8f81c0d21bca4ddc`; correction test: `07a6dec059377557b408413f23ccacc5ed75776b1547f5e2e9fb0bcad56b7ff1`; shared E2E helper: `ff8a5e0ee93965d6e44e0cdf70eac35530bdaa76cb3387ee46522631be6c2567`.
- Only this report was appended. No source edits, Git mutations, provider/runtime operations, new gates, or broad audit were performed. Root may finish matching image verification and rerun actual QA under the existing acceptance criteria.
