# README references and main integration assessment

Date: 2026-09-15. The initial documentation-only assessment below is historical.
The founder's follow-up explicitly requests main integration through PR #4 and
the earlier Restaurant app screenshot. The final section records that repair;
ADR-0067 and the active ledger control its decision and acceptance.

## Product evidence and editorial choices

The September 5 consumer reset establishes the default goal: describe a need,
answer necessary business questions, and receive a usable application.
The September 13 definition-batch acceptance establishes five local definitions
across Ordering, Approval, and Team Task. Approval correction, Task correction,
and Publication Review supply actual business and recovery evidence.
The product-definition scale plan supplies the next coverage goals.
The threat model supplies the production identity and operating limitations.

The first README correction led with that user outcome, showing an actual generated
Publication Review screenshot, links each supported application to acceptance,
and separates local capability from production work. It replaces the old
assembler clone address, pins the documented package manager, protects an
existing local environment file, and explains that Compose down removes volumes.
The architecture retains Draft -> Publish -> immutable Compilation and stable
implementation identifiers. No source, dependency, security, or deployment
contract changes are proposed.

## Public GitHub references

Read on September 15, 2026. These are documentation and product-positioning
references only; no source, branding, or third-party assets were copied.

| Project and source                                                                     | Observed documentation pattern                                                          | Application to Archeform                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Appsmith README](https://github.com/appsmithorg/appsmith/blob/release/README.md)      | Concrete business use cases, installation choices, and a separate developer setup entry | Lead with useful business jobs and make local trial instructions discoverable     |
| [ToolJet README](https://github.com/ToolJet/ToolJet/blob/develop/README.md)            | Explicit feature boundaries and distinct quick-start and self-hosting guidance          | Name the supported scope and distinguish a local trial from production deployment |
| [Dyad README](https://github.com/dyad-sh/dyad/blob/main/README.md)                     | Short local-builder positioning and a direct download entry                             | State who the product serves and the next action before internal architecture     |
| [Amplication README](https://github.com/amplication/amplication/blob/master/README.md) | Reusable generation standards, usage, and monorepo development instructions             | Explain reviewed reusable definitions and retain a concise architecture map       |

These editorial choices are an interpretation of the linked examples.
Archeform does not inherit their features, license terms, maturity, integrations,
or hosting support. Popularity counts were not used as product evidence.

## Fresh Git and CI inspection

- Local and remote main both resolve to
  `ff9ae7eca0ca09b0d643d32627fa2882678eae94` after fetching origin.
- The latest delivered consumer branch resolves locally and remotely to
  `6c937d61dd50f56df3227af2e958ae3669627b34`, 29 commits ahead of main.
- The consumer worktree was clean before this documentation task.
- The original checkout remains on `codex/post-v0.1-local-readiness` with
  pre-existing document and Candidate-test changes; they were preserved.
- [Main CI run 33756827488](https://github.com/ZP151/archeform/actions/runs/33756827488)
  is failed. Its recorded Node 22.11 Candidate concurrency failure remains
  unresolved in the delivery ledger.
- [Consumer CI run 34758145809](https://github.com/ZP151/archeform/actions/runs/34758145809)
  at the inspected consumer tip failed `pnpm format:check` on both Node 22.11
  and Node 22.x. Later checks did not run.
- Local `pnpm exec prettier --list-different .` exited 1 and identified 30
  pre-existing files, including historical evidence and ADRs. This is a fresh
  formatting failure, not a fresh reproduction of the Candidate failure.

The latest slice is accepted for bounded local branch delivery. Its ledger
explicitly excludes main integration and repository release from that earlier
delivery. The new founder request asks for an up-to-date main, but does not
waive acceptance gates in `docs/delivery-policy.md`.

## Integration boundary

Synchronizing local main with origin/main is verified. Integrating the latest
functional iteration remains blocked by the recorded baseline and missing
passing full gates. A reviewed pull request must retain these failures and
must not mark the iteration or release accepted just because individual
product slices passed.

Historical source identities, approval hashes, and acceptance receipts must
remain traceable when addressing formatting. A blanket rewrite of evidence is
not part of this README correction. Candidate repair must address the actual
unchanged concurrency behavior; excluding tests, reducing concurrency, or
retrying until green does not resolve it.

The README describes the consumer branch explicitly until integration is
accepted. When main is accepted and merged, remove the temporary availability
notice, restore the default-branch clone command, rerun the applicable gate at
the merged commit, and verify local main equals origin/main.

This task does not restart the stopped PostgreSQL publication experiment,
publish a product revision, run a model, launch runtime resources, create a
repository release, or deploy to a cloud.

## Follow-up: Restaurant result and PR integration repair

The founder requested completion of main integration rather than stopping at
a draft PR. The README result now uses the previously captured Saffron & Sage
Restaurant order page at desktop and mobile widths. Original files are
`acceptance-artifacts/d1.8/orders-1440.png` and `orders-390.png`; copies under
`docs/images/` are byte-identical and inspected. They contain sample ordering
data and explicitly simulated payment. The earlier D1.8 Restaurant delivery is
the provenance; this task does not claim a new generated-product screenshot run.

The formatting baseline had 30 local paths but 14 canonical Git content changes;
the remaining differences were local line endings. The 26-file evidence manifest
and three existing ADRs were formatted with the already-installed Prettier.
Fifteen JSON files preserve parsed values. The two evidence scripts preserve the
TypeScript syntax tree's node kinds and literal values; comparing full printer
output was initially inconclusive because formatting itself changes that text.
The three ADRs change only inline-code continuation indentation, retaining all
decisions. [Digest reconciliation](2026-09-15-format-reconciliation.json) links
the original Git blobs to formatted files and records screenshot identity.
Historical acceptance digests and result fields are not rewritten as new results.

The historical main Candidate failure was reproduced deterministically before
source edits. A second process commits the sole terminal winner between
`verifyIdentity` and current-entry access. Reconciliation correctly marks the
newly loaded entry unverified, so the old code rejects a valid idempotent caller.
ADR-0067 retains the existing strict verifier, serializers and CAS. The first
decision review required explicit version/manifests, effects, commands and
evidence destinations; the amended proposal received independent standing
acceptance with zero findings before implementation.

The correction performs one bounded verification of the changed current snapshot.
Deterministic RED was 4 failed/1 passed; the positive case reproduced the exact
historical verification error. Initial GREEN passed 5/5, including denial for
tampered, blocked, rejected and conflicting results, and the owning suite passed
435/435. One assertion was corrected because the receipt helper enumerates only
candidate-ready statuses; complete lifecycle record counts remain unchanged.
Independent review then found a residual interleaving before a second reconciling
accessor. A sixth deterministic test reproduced that error. The accepted ADR
amendment binds the verified snapshot and leaves later winners to the existing
strict indexed/CAS path. Final focused tests pass 6/6, with owning typecheck,
build and lint passing. The review's remaining formatting finding is corrected.
No storage migration or R0 restart is involved, and the original checkout's
unfinished tests remain untouched.

Initial full checks: frozen install, typecheck (29 tasks), build (17 tasks),
third-party notices and source studies pass. Full tests passed 28/29 tasks;
compiler passed 774/776 and timed out in two existing browser layout cases.
A focused rerun passed 2/2 in 26.77 seconds of test time, retaining the full-run
failure as evidence. Instrumentation isolated slow browser teardown: one case
finished assertions at 6,844 ms but browser close completed at 21,652 ms. Root
removed diagnostics and explicitly closes the browser context before the browser,
with both cleanup calls protected by finally. The focused cases now pass 2/2 in
3.53 seconds. All widths, assertions, page content loads, timeouts and concurrency
settings remain unchanged. CI installs Chromium and its system prerequisites for
the already-pinned Playwright dependency before tests.

Final local checks pass: full tests 29/29 tasks (compiler 776/776 and external
intake 436/436), typecheck 29/29, build 17/17, repository formatting, frozen
install, third-party notices and source-study verification. README local links
and anchors pass 29/29. Independent final integration review reports P0/P1/P2
0/0/0 and confirms the bound-snapshot repair, unchanged layout assertions,
Chromium prerequisite, image provenance and all formatting digests. Root accepts
the integration correction for normal commit and push to PR #4. Merge remains
conditional on passing remote CI; the exact merged main commit must pass the
same matrix and local main must equal origin/main. Existing product runtime
acceptance and resource-cleanup evidence remain valid for the unchanged product
implementations; no new runtime acceptance, release or deployment is claimed.

### Remote CI follow-up

Push run 34876048661 on Node 22.11.0 passed external-intake 436/436 but
failed one compiler-worker timing assertion: the 20 ms readiness cap observed
two requests instead of one. The same commit's PR run 34876054380 on Node
22.11.0 passed all gates. The fixture relied on a real timer reaching an exact
Date.now deadline; timer precision can leave time for another request. Root
uses a local Date.now spy and consumes exactly 20 ms in the mocked failed
health request, restoring the spy in finally. The operation/readiness values,
error and one-request assertion are unchanged; production source is unchanged.
Focused test passes 1/1 in 34 ms; owning tests pass 319/319, owning typecheck,
focused formatting and diff checks pass. Both remote observations remain
recorded; the deterministic fixture correction requires a new green CI commit.
