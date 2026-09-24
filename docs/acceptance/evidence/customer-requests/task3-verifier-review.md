# Customer Requests verifier task review

Verdict: **CHANGES REQUESTED**. P0/P1/P2: **0/0/2**.

Independent specification, correctness, quality and security review of the six frozen worker sources. No implementation, documentation or Git edits. This is a source-only task gate; independent QA, final judgment and PM acceptance remain outstanding.

## Authority and identity

Read workspace AGENTS.md, delivery policy, both technology/security authorities, ADR-0085, ADR-0084 runtime contract and the Task 2 handoff/repair, current ledger, actual source paths, tests and retained evidence. The ledger records independent standing acceptance of ADR-0085 before the implementation assignment. Its proposal header is deliberately not the live-state authority.

- Six-source manifest: `45e7f196cf8c944432b2bf35fe6e737b828f7eb43fb7def84c912cc703ac237d`; all six current source hashes match. See `source-hash-checks.json`.
- ADR-0085: `bcf5e50e79dce5c80a270fda6dc2bf7ca0399211d63bfaf4ed3a059b37224464`, exact match.
- ADR-0084: `8a78888dd9f1996588f475188b4645664c06bf9e1a49561112cdfa89c6f954c6`, exact match.
- Compared the four shared worker files with `f003e12a04ce8ca7874426e0d25c0020a3c1286f`. Changes are confined to selector dispatch, private journey validation/dispatch and private request/comparison transport integration. The two new worker paths are in the frozen manifest. No other tracked compiler-worker change is present.
- `git diff --exit-code f003e12a -- packages/compiler/src/customer-requests-runtime.ts packages/compiler/src/customer-requests-contract.ts` exits zero. Concurrent compiler presentation/integration work is excluded from this verdict.

## Actionable findings

### CR-V-P2-001 — Validate private journey data before reading it; reject inherited fixture fields

Location: `apps/compiler-worker/src/verifier/role-journey.ts:403` and the added private guard at lines 410–427.

The generic preamble reads `journey.journeyId`/`journey.action` before the Customer Requests own-data guard. An own `journeyId` accessor executes before eventual rejection. The guard also checks own keys without checking the object's prototype. A journey made with `Object.assign(Object.create({body:"{}"}), validJourney)` is accepted, although the private mode must exclude general body payloads. An inherited `headers` getter returning undefined is executed by the subsequent generic validation and the journey is accepted.

Reproduction: the retained `probe.ts` uses an exact-derived profile and registry, substitutes only these journey shapes, and calls `validateRoleJourney`. `probe-result.json` records `ownAccessorExecutedBeforeRejection: true`, `inheritedBodyAccepted: true`, `inheritedAccessorAccepted: true`, and `inheritedGetterCalls: 1`.

Consequence: this private fixture boundary can execute accessors and accept inherited/mixed fixture state instead of failing closed. This is a validation-contract defect at an internal source fixture boundary, not evidence of remote code execution or a generated-runtime authorization bypass. It conflicts with the exact private witness/mixed-mode requirements and the claimed accessor/inheritance rejection.

Correction: identify and validate the private journey through own descriptors before generic value reads, require a plain or null-prototype exact own-data object, and return its already-validated registry action without inspecting inherited generic fields. Preserve generic journey behavior. Add focused assertions that each private own accessor has zero calls and that inherited general fields/accessors/custom prototypes reject before fetch.

### CR-V-P2-002 — Reject negative-zero response versions before comparison and digest capture

Location: `apps/compiler-worker/src/verifier/customer-requests-verification.ts:272` (`equal` scalar comparison), consumed by mutation validation at lines 575 onward and other read comparisons.

`actual === expected` treats negative zero as zero. An otherwise valid emitted create response whose JSON wire representation changes only `"version":0` to `"version":-0`, or only `"requestVersion":0` to `"requestVersion":-0`, passes comparison. The digest is then built from the expected canonical response and equals the unmodified response digest. Thus the boundary accepts an excluded integer representation and its replay identity collapses that alteration. The strict input integer helper correctly rejects negative zero; the response comparator does not apply equivalent validation.

Reproduction: `probe.ts` executes the real emitted ApplicationRuntime and InMemoryRecordStore for one synthetic create, verifies its canonical response, and passes the two textual wire mutations to the actual comparator. Results are `canonicalMutationAccepted: true`, `requestNegativeZeroAccepted: true`, `eventNegativeZeroAccepted: true`, and `negativeZeroSharesCanonicalDigest: true`. Text replacement is intentional: JSON.stringify itself normalizes negative zero and would hide the case.

Consequence: false-positive success for malformed response versions and a missed response/replay corruption case, contrary to the accepted bounded integer and exact response identity contract. No actual business mutation or ownership breach was demonstrated.

Correction: use exact numeric equality (for example Object.is for scalar values) or validate every received numeric contract field with the existing integer rule before accepting it. Cover mutation request/event versions and the shared read/history/activity comparisons. Retain canonical valid responses and ensure malformed versions return no captured ID/event/digest.

## Positive findings and specification coverage

The exact compiler selector verifies the Graph/lock and returns a frozen profile. The worker brands that in-process object; cloned serialized descriptors fail. Malformed family selection throws a bounded contract error rather than falling through. Derivation remains before the historical family/generic routes. No new Graph, runtime, API, dependency or persisted verification schema was introduced.

Private request validation is otherwise well-contained: exact own fields; no accessors, inherited/custom prototypes or extra symbols in request options, descriptors and nested expectations; fixed operations, API port and routes; safe captured IDs excluding dot segments; fixed sessions independent of bound role names; mutually exclusive comparison modes; exact body grammars and bounded headers/text/body bytes. The generic flat-body parser and top-level ID capture remain unchanged.

The actual runner has a deterministic 62-request trace:

| Request group                                                    | Count | Verification                                                                                                                                    |
| ---------------------------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial A list                                                   |     1 | Exact empty page                                                                                                                                |
| A versions 0–9 plus detail/history after every mutation          |    30 | Create, update, staff reply/correction, customer reply, complete/reopen twice, cancel; ownership, snapshots, actor attribution and full history |
| Invalid and duplicate correction targets                         |     2 | Exact safe 400 errors before terminal state                                                                                                     |
| B create with A's original create key                            |     1 | Separate principal scope and distinct ID                                                                                                        |
| A, B and staff lists                                             |     3 | Exact ownership, stable order and null end cursors                                                                                              |
| Staff B detail/history and B denied A detail/history             |     4 | Staff access plus same-role owner isolation                                                                                                     |
| Staff A detail/history                                           |     2 | Both owned records visible to staff                                                                                                             |
| B's update/reply/reopen/cancel against A using original body/key |     4 | Authorization precedes stale replay lookup; exact 404                                                                                           |
| Original create/update/complete replays                          |     3 | Original status, request ID, event ID, full canonical digest and old expected state                                                             |
| A current detail/history after replay group                      |     2 | Authoritative state stays cancelled at 9 with ten events                                                                                        |
| Changed payload, stale version, terminal state                   |     3 | Exact conflict pairs                                                                                                                            |
| Staff create/update/reopen/cancel and customer complete denials  |     5 | Exact 403                                                                                                                                       |
| Final A detail/history                                           |     2 | No extra event/state change                                                                                                                     |
| Total                                                            |    62 | Two created requests; ten A events and one B event                                                                                              |

Response comparison otherwise verifies exact shapes/apiVersions, ownership, actor principal/role, status/text/version snapshots, parent identity, explicit nulls, correction linkage, canonical real UTC timestamps, list/detail projections, historical resolution, unique captured event IDs and complete descending history. All expected successes and denials require both status and positive comparison; unexpected error fields fail. Raw bodies and transient identities/digests do not enter the fixed step summary/failure evidence.

Transport retains the existing operation timeout for fetch and reading, checks abort before accepting read results, uses fatal UTF-8 and a 16 KiB byte ceiling, and cancels its reader on every acquired-reader exit. Cancellation promises are deliberately not awaited, avoiding a stalled-cancel deadline escape. The runner checks its journey signal before every request and after results, with a hard 64-request ceiling. No process, observer, new endpoint or startup capability is added.

## Evidence review and limitations

Reused retained passing evidence rather than rerunning broad suites:

- Final focused log: 115/115, including four role-binding variants executing the emitted memory runtime through the real environment/probe seams. Tests assert process/stop stubs are not called; startup is only the authored stub.
- Retained worker typecheck/build logs and changed-file formatting success, with zero exits reported in the frozen handoff.
- Historical regression log: 274/274 in 11 suites.
- Historical worker equality: 12/12, full serialized plans. Protected baseline hash is `dab1ba9ab76dfcaa422a2eb25eba078d24d0bdff093241561d26914c3e244438`, exact match. Comparator source verifies the baseline/input digests and refuses baseline recapture.
- Original compiler capture `before.json` remains `c9c6c0245de95ffb7176131e59206aa8ca0bceecb21b5ed70185ae6654f25eba`; original equality remains `3f6bd2c708c6b4ccd8391a4cfd24ba532e6e680a0f920213d7639124c18e655d`.
- RED is retained as `red.md`, a recorded three-case failure narrative, not a raw first-RED command log. The final tests genuinely exercise emitted behavior; the two parser gaps above are absent from that passing coverage.

All inspected evidence digests are recorded in `evidence-hashes.json`; original files were not rewritten. The only fresh execution is the concrete two-concern probe, exit zero:

```text
node node_modules/.pnpm/vite-node@2.1.9_@types+node@22.20.1_terser@5.49.0/node_modules/vite-node/vite-node.mjs generated/.customer-requests-task3-verifier-review/probe.ts
```

The probe calls direct validators and emitted in-memory runtime only. No environment boot, outbound fetch, listener, service, database, Docker, provider, cloud, cleanup or Git mutation occurred. It prints only safe boolean/count outcomes. The earlier rejected startup was not retried.

The evidence supports source-level runtime agreement and unchanged historical worker behavior, subject to the two corrections. It establishes no PostgreSQL, concurrency, restart, browser, actual-local product, hosted product, deployment or release result. Both findings are bounded repairs within the accepted ADR; no broader contract change is requested. Reuse unaffected evidence and perform focused repair re-review before the remaining independent gates.
