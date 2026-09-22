# Faster product assembly: engineering optimization plan

**Status:** Reviewed and reconciled after Equipment's complete local acceptance
on 2026-09-17. The same ordinary independent reviewer approves this plan and the
product with P0/P1/P2 0/0/0; PM accepts the next execution sequence. The first
Package A slice (the provider-free definition lane and non-authoritative case
index) was delivered and accepted on 2026-09-22. The remaining emitted-control,
complete-workspace, cache, dispatch and extraction work below remains planned;
its stated technology-authority prerequisites remain applicable.

**Product objective:** An ordinary user describes a business job and receives a
usable, responsive application with minimal clarification and no exposed
development workflow. Internal Graph, Publish, compilation and verification
steps remain reliable platform responsibilities. A large catalogue is useful
only when its definitions select complete, reusable business behavior.

## Evidence and present constraints

Inventory at base `436484fc71f63adf11e8f48938bc5983ac42ca41` found:

| Observation                                                                                          | Delivery consequence                                                                               | Evidence location                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Six locally accepted definitions, three demonstrated runtime families                                | A catalogue count cannot substitute for another executable business family                         | Product status; scale roadmap; Training acceptance                                               |
| An independent definition CLI still expected five keys after Training was admitted                   | Separate hand-maintained lists can leave an acceptance command stale even when package tests pass  | `scripts/verify-product-definition-data.mjs`; reproduced RED and 16-case GREEN in this iteration |
| Compiler entry point 4,518 lines; capability entry point 3,790 lines; restaurant runtime 2,696 lines | New family branches require broad source comprehension and increase change coupling                | Tracked source inventory; baseline line counts, not permanent size limits                        |
| 318 tracked Markdown documents; PM ledger 5,335 lines; current status 1,560 lines                    | Finding current authority/next work involves scanning accumulated history                          | `docs/project-status.md`; active consumer ledger                                                 |
| 583 tracked evidence files, 44,244,640 bytes                                                         | Evidence needs indexing and bounded selection; deleting it would lose provenance                   | Tracked `docs/acceptance/evidence` inventory                                                     |
| All three service Dockerfiles copy the whole context before dependency installation                  | Documentation/evidence edits can invalidate expensive dependency/build layers                      | Service Dockerfiles; `.dockerignore`                                                             |
| Docker ignore excludes build outputs, but not docs, evidence, `.superpowers` or `test-results`       | Local diagnostic material can enlarge the context independently of Git ignore                      | `.dockerignore`; Docker and Git ignore are separate policies                                     |
| Catalogue validation limits are 100 entries and 2 MiB                                                | Hundreds/thousands require an explicit storage/retrieval design; raising a counter is insufficient | Product definition data validator and authoring guide                                            |
| Existing regression lanes are smoke or a broad five-package product suite                            | Ordinary data admission lacks a single complete, short command entry point                         | `scripts/regression.mjs`; worker/control-plane are outside that product lane                     |
| Owned local acceptance runner is approximately 2,889 lines with Restaurant-specific dispatch         | Build on its proven resource/cleanup controls rather than introduce another independent launcher   | `scripts/local-product-acceptance.mjs`                                                           |
| Approval batch helper already drives parameterized business journeys                                 | Subsequent supported jobs can add case data instead of cloned browser scripts                      | `e2e/helpers/approval-definition-batch.ts`                                                       |
| The Approval helper can wait 25 minutes before checking a five-minute ready target                   | An already-missed delivery target can consume avoidable acceptance time                            | The helper's 1,500,000 ms poll and 300,000 ms ready assertion                                    |

Training's last accepted local attempt reached ready in **180,306 ms** and
completed its journey in **218,198 ms**, using a fixture provider. This is one
observation, not a percentile, cold-build benchmark or real-model result.
Equipment's final attempt reached ready in **197,474 ms** and completed checks
in **248,387 ms**; the browser lane passes 1/1 including cleanup in 4.4 minutes.
There were four consumer attempts: three failures followed by one pass. The
first attempt did not pass; this is not a cross-product reliability estimate.
The [acceptance record](../../acceptance/equipment-procurement.md) retains each
failure, repair, source identity, visual result and exact cleanup. Measure cold
and warm setup separately; do not advertise speedups from cache assumptions alone.

The current shared runtime's first actual PostgreSQL attempt exposed a specific
coverage gap: in-memory arithmetic and emitted-runtime tests passed, but Prisma
persisted numeric `0.07` as `0.07000000000000001`. Post-write validation correctly
rolled back the transaction, blocking a legitimate correction. The same boundary
also affects generated seed upserts. This makes persistence representation a
required shared-capability test, rather than a late discovery in every new
definition's browser acceptance. Canonical decimal writes now cover API and seed
paths; actual attempt 3 proves exact persistence and all-table rollback. A
separate UI inspection caught inherited hidden numeric labels; final checks now
measure visible label geometry and total emphasis at all three viewport widths.

The shared capability's full gate took 46,664 ms for formatting, 16,262 ms for
lint, 41,044 ms for types, 443,372 ms for tests and 79,635 ms for builds. These
are one recorded local run, with Turbo cache reuse, not a benchmark distribution.
The approximately 7.4-minute test stage belongs at shared-contract boundaries.
A later two-file generated UI repair used 35 focused cases and a 3.1-second
actual presentation check, preserving byte-identical API/seed evidence instead
of repeating the full database journey. This is the intended repair policy.

Equipment preparation also exposed avoidable setup work: a first Factory build
took 221,221 ms before the ordinary review identified incomplete inventory
exclusions in candidate guidance. Its Control Plane/Workbench images are
superseded by corrected builds. The unchanged worker image is reused because it
does not consume the catalogue; its shared source identity and actual immutable
Graph execution remain checked. Freeze candidate values and formatting,
run cheap admission checks, and resolve concrete source-review questions before
starting expensive image construction. Reuse the same ordinary reviewer for
final runtime/UI evidence; this ordering adds no separate approval stage.
The corrected consumer build again downloaded dependencies with zero reuse and
encountered registry connection resets despite no dependency change. This is an
observed reason to prioritize cache inputs and source ordering; it is not a
reason to change package versions, registries or accepted runtime contracts.
The corrected two-consumer image build took 232,491 ms; the unchanged worker was
reused. These different-input, network-affected observations establish setup
cost, not a measured speedup. The final source receipt checks 20 source/built
files across three services. Catalogue consumers match current data; the worker
matches current generated-template source and output. Unused calculated-template
copies in the other services are explicitly checked against the accepted base,
not misreported as current bytes.

Equipment's first actual consumer attempt then exposed a shared layout gap:
visible numeric labels put Submit at 654.6875 px, beyond the accepted 650 px
bound. The earlier emitted test rendered a card alone. The repaired test renders
the complete generated workspace, reproduces the same failure, and passes after
removing only calculated-label bottom spacing. All 35 calculated/compatibility
cases pass, preserving readable labels, total emphasis and 44 px targets. Only
one CSS output changes in the 67-file fixture; unchanged API evidence is reused.
The first affected worker image rebuild took 109,346 ms; completing the
multi-record density repair required another worker-only build of 109,485 ms.
This is one shared
presentation repair discovered by a new definition, not zero runtime work or a
new Equipment-specific branch. Make complete-workspace checks part of the cheap
lane before actual generation. Preserve both failed and passing attempts.

The next attempts refined that lesson. Attempt 2 reached ready in 196,978 ms but
an over-specific capitalization assertion stopped the case; the test now checks
the accepted greater-than-zero meaning while retaining exact field binding and
no-write checks. Attempt 3 reached ready in 197,283 ms and passed the complete
correction/retry/concurrency journey, then failed the two-summary mobile bound.
A one-record workspace was insufficient coverage. The emitted regression now
includes three records, long titles and the audit role's closed global history;
it reproduces the 915.171875 px summary bottom against the existing 900 px bound.
Readable calculated-label line-height and the existing small row gap repair it.
All 36 calculated/compatibility cases pass; only CSS changes. Package A must
exercise representative role/state/record-count combinations before an image
build, and use stable error meaning unless exact copy is a product contract.

## Priorities and delivery boundaries

| Priority | Work package                                            | Owner and paths                                                                         | Dependency                                            | Completion evidence                                                                                                  |
| -------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P0       | Accepted baseline: authoritative totals and Equipment   | Current calculated-request plan owners                                                  | Accepted ADR-0070                                     | Complete local journey, UI, persistence, denial/recovery; six old bundles unchanged                                  |
| P1       | One ordinary definition admission command               | Tooling owner: `scripts/regression.mjs`, script tests, root scripts and authoring guide | P0 current baseline and reviewed scope                | A new supported row is validated, independently checked and routed to its case without editing several command lists |
| P1       | Current inventory and evidence index                    | Adapters/test-tooling owner; PM for current status/ledger index                         | Separate current membership from historical snapshots | Missing case/duplicate case/unaccepted row fails; old snapshots retain independent constants                         |
| P1       | Stable build cache and smaller local build context      | Runtime/tooling owner: three Dockerfiles, `.dockerignore`, acceptance setup tests       | Tech Lead decision for operability changes            | Same runtime artifacts and ownership/cleanup behavior; measured cold/warm runs; no dependency upgrade                |
| P1       | Reusable local case dispatch                            | Acceptance tooling owner: existing owned runner and batch helper                        | Frozen case dispatch/lease contract                   | Approval and Restaurant cases share setup/cleanup controls; interruption tests remain green                          |
| P2       | Compiler responsibilities with explicit family profiles | Compiler owner: `src/index.ts`, Approval helpers and target boundaries                  | P0 frozen generated-byte snapshots                    | Small no-output-change extraction steps; all protected ordered bundles identical                                     |
| P2       | Data authoring without duplicated manual projections    | Graph/adapters owner: strict catalogue authoring/projection boundary                    | Accepted ADR for representation changes               | One authored field change cannot leave canonical/guide/seed/selection data inconsistent                              |
| P2       | Varied data batches with demonstrated reuse             | Definition owner and one independent ordinary reviewer                                  | P1 admission command and supported profile inventory  | Every new row has a distinct job, actual representative behavior and complete UI coverage                            |
| P2       | Appointment family                                      | Shared runtime owner with Tech Lead                                                     | Explicit interval/capacity/cancellation scope         | Actual conflict prevention, cancellation recovery, responsive schedule and persistence                               |
| P3       | Larger searchable catalogue                             | Catalogue/retrieval owner                                                               | Several repeatable varied batches and usage evidence  | Bounded lookup, versioned manifests, deterministic selection and measurable cost at staged sizes                     |

Do not combine cache work, compiler extraction and catalogue representation in
one branch-sized rewrite. Each can be accepted and reverted independently.
Use disjoint ownership only after the relevant interfaces and generated-output
expectations are frozen; a shared-contract change pauses affected writers.

## Package A: short, complete ordinary admission

### Delivered first slice — 2026-09-22

`node scripts/regression.mjs definitions` now builds the adapter/compiler
dependency closures, runs its tool tests and independent catalogue validator,
verifies one case/evidence binding per current definition and executes the
focused adapter and protected compiler compatibility tests. The derived
`factory.product-definition-case-index/v1` is routing information only and
cannot register or accept a definition. It strips provider variables, stops on
the first failed child, and keeps the existing direct commands callable. See
`docs/acceptance/definition-regression-lane.md` for the RED/GREEN and real-lane
evidence. Emitted control/read-only/summary checks and complete-workspace
density checks remain the next Package A step.

1. Extend the existing regression entry point with a documented definition
   lane. It builds only necessary stale workspace dependencies, validates the
   catalogue, runs the independent adversarial CLI, semantic distinctness and
   protected compatibility tests, then reports which actual journey is needed.
   Before image construction, validate case bindings against emitted control
   types, read-only outputs and summary placement, and test the stable meaning
   of invalid-input feedback with no write. Render the complete workspace for
   density/label checks with representative record counts, long titles and
   role-dependent history/navigation. Keep these provider-free checks separate from actual
   database authority and end-to-end business acceptance.
2. Keep provider credentials stripped from provider-free lanes. A short local
   unit run must never start paid/provider services as a hidden side effect.
3. Derive a non-authoritative current index from the reviewed catalogue and
   fixed checked-in case bindings. It reports definition key, runtime family and
   case coverage; PM's current acceptance record remains the authority for local
   product acceptance. The index cannot register a definition, promote acceptance
   or supply executable commands. Independently assert that every accepted key
   has exactly one supported case and every case refers to a registered key.
4. Preserve historical snapshots and their checksums as independent constants.
   Never generate expected old outputs from the current catalogue or treat a
   generated membership assertion as independent evidence of correctness.
5. Make a failed command stop the lane with a safe concise summary. Retain
   affected logs and exact exit status; do not require another prose report for
   every passing subcommand.

**Acceptance:** Demonstrate a missing new-case binding, stale CLI inventory and
unsupported semantic row fail before an expensive runtime build. An unchanged
supported definition completes the lane with zero runtime implementation edits
beyond reviewed definition data and case bindings.
Measure wall time over three clean repeated local runs; initial target is a
warm provider-free lane below two minutes, subject to observed baseline.

**Rollback:** Keep existing direct commands callable until the lane has passed
both success and failure tests. Reverting orchestration must not revert data or
Published artifacts. A new shared manifest/authority needs its own bounded
technology decision; do not silently move execution authority into editable data.

## Package B: reuse the owned runtime harness and build cache

1. Separate package-manager/dependency inputs from source changes in the
   existing service builds. Keep pinned toolchain, frozen lockfile and the same
   runtime files. Evaluate manifest-first installation or the already supported
   package-manager fetch mechanism against actual workspace resolution.
2. Propose a reviewed build-context allow/deny policy. Verify generated source,
   capability manifests, asset files and notices still reach every image. Exclude
   local execution logs and screenshots only after proving they are not runtime
   inputs. Credentials retain their existing exclusion.
3. Extend the existing acceptance runner's case dispatch rather than copying its
   process, lease, cancellation and cleanup code. Case data may select a known
   suite; it must not supply arbitrary commands, paths, environment or executable
   imports. Reuse the current containment and ownership validations.
4. Reuse one immutable build for a serial batch when source/dependency hashes
   match. Give each generated application its own owned resource identity and
   cleanup evidence. Never reuse another task's live application or delete
   unrelated Docker resources to make a test pass.
5. Align acceptance deadlines with the measured five-minute ready target. Stop
   an already-failed attempt promptly through the existing owned cancellation and
   cleanup mechanisms; do not merely shorten a browser wait and leave a compiler,
   verifier or preview job running. Test cleanup during each in-flight phase.

**Measure separately:** source/context preparation, dependency install, Factory
build, service readiness, generated compilation, preview readiness, browser
journey and cleanup. Capture three cold/warm observations per changed stage;
compare the same machine and inputs. Target at least 50% less repeated setup for
data-only changes; retain the five-minute local user-visible readiness target.
No target is a claimed result until measured.

**Acceptance:** Docs-only changes reuse dependency layers; data-only changes
rebuild required artifacts; a manifest change invalidates the correct layer;
all runtime checks and notices remain intact. Interruption, failed startup,
resource collision and cleanup tests still pass. No Compose, image-major,
database, provider or cloud change is bundled into the optimization.

**Rollback:** Retain prior Docker build recipe and runner mode until equivalence
is proven. A cache miss must cause a normal build, never a stale acceptance.

## Package C: make runtime extension local and predictable

Use the existing Graph/adapter/compiler separation. Extract compiler functions
by actual responsibility, preserving their emitted strings and order:

- profile selection and supported-shape checks;
- field projection and seed/witness selection;
- mutation/transaction/receipt rendering;
- record/decision-history projection;
- form/list/detail presentation and state handling;
- generated business verification and target dispatch.

Keep one selector per supported family/profile with explicit supported shapes.
Do not grow a product-name switch. A new reusable capability should change its
owned helper and necessary integration points; a new supported definition
should change data and case bindings only.

For numeric capability changes, keep three distinct checks: exact pure arithmetic,
the emitted database adapter's write/read representation, and a real PostgreSQL
journey using precision-sensitive operands. Include seed initialization and
post-write rollback. A mocked store cannot establish the database driver's
numeric behavior; a browser screenshot cannot establish transaction safety.
Run this shared boundary once per relevant capability change and reuse it for
unchanged data-only admissions.

Start with a small extraction from the compiler entry point after Equipment is
accepted. Preserve the original exports and exact bundles. Do not introduce a
new plugin system, target registry or expression framework while existing
modules can provide the boundary. Keep large immutable test fixtures out of
production-module cleanup; their length alone is not a reason to rewrite them.

**Acceptance:** Each extraction runs focused family tests and exact old bundle
comparisons. A second supported calculated definition must assemble without a
new conditional source branch. Review the affected diff once; do not repeat the
entire release process after a pure helper move. Any behavior or cross-package
contract change returns to the shared lane instead.

**Rollback:** Revert an individual extraction without changing saved Graphs,
registry keys, generated bytes or catalogue hashes. No migration is necessary
for a byte-preserving private refactor.

## Package D: author definitions once and scale deliberately

First document which fields are authored business intent and which are derived
validation/projection artifacts. The current strict catalogue deliberately
stores several checks; remove manual duplication only after proving the
replacement preserves independent authority and compatibility.

Proposed sequence:

1. Add a local authoring tool that proposes a complete candidate from existing
   reviewed family data, detects contradictory references and emits a diff.
   It does not admit products or mutate published state automatically.
2. Derive deterministic guide/projection fields where the accepted contract
   permits. Keep immutable source fingerprints and explicit execution bounds.
   Have tests deliberately corrupt derived and authored sides independently.
3. Add a small varied batch to prove that the same capability really supports
   distinct jobs. Do not count renamings, themes or duplicated role labels.
4. Only then propose versioned catalogue chunks and bounded retrieval. Measure
   parse cost, memory, lookup, selection quality, ambiguity and generated artifact
   stability at 25, 100 and 1,000 candidate definitions. The current 100-entry /
   2 MiB limits stay until a replacement is accepted.

**Admission rubric:** Every candidate names its user job, actors, main record,
business invariant, happy path, correction/cancellation, denied behavior,
persistence, summary/detail presentation, media policy and deployment boundary.
If the existing family cannot execute a requirement, create a reusable capability
task and leave the candidate pending. Do not weaken the brief to inflate counts.

**Rollback:** Candidate generation remains optional and produces reviewable data.
Retain the existing accepted loader and immutable catalogue version for existing
applications. A new loader/retrieval contract must define old-reader behavior
before rollout.

## Remove repeated delivery work without removing product checks

| Stop doing                                                                | Replace with                                                                       | Keep                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Repeating full task/QA/release review for each ordinary data or text edit | One focused independent product review, reusing unchanged shared evidence          | Full shared boundary review and required release checks                |
| Manually copying the current accepted count into many executable lists    | Derived non-authoritative current index with completeness checks                   | Independently frozen historical output fixtures                        |
| Cloning a browser journey per product                                     | Parameterized family cases with explicit control/summary expectations              | Actual business, state, responsive and persistence checks              |
| Rebuilding unchanged dependencies for a docs/evidence edit                | Verified build layers and bounded context                                          | Frozen install, notices and generated artifact verification            |
| Re-reading thousands of historical ledger lines to find next work         | Concise current state, owners, open risks and links to dated history               | Exact authority decisions, provenance and immutable acceptance records |
| Saving repeated full logs/screenshots for unchanged behavior              | Indexed representative state evidence plus new failure/fix evidence                | Enough material to reproduce the actual changed product outcome        |
| Claiming progress from catalogue size alone                               | Report registered, distinct, locally accepted and user-validated counts separately | UI quality and genuine workflow completeness                           |

The present stale CLI correction and new six-output compatibility guard are
bounded improvements already made in this iteration. Broader items above remain
planned. Historical evidence is not deleted, and no failing gate is waived.

## Iteration scorecard and exit criteria

### Execution sequence after this local admission

Use small delivery batches with one accountable owner. The timeboxes below are
planning caps for a focused implementation pass, not promised elapsed dates.
At the cap, record the demonstrated outcome and split the remaining concrete
gap; do not mark a partial product accepted or add another audit to compensate.

| Batch         | First implementation pass                             | Work and owner                                                                                                                          | Exit and next decision                                                                                                                                       |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1             | 1–2 working days                                      | Tooling owner implements the short provider-free lane and derived non-authoritative index; PM retains product acceptance authority      | Missing/duplicate cases fail early, all seven rows retain protected output, three warm timings recorded; approve or revise the two-minute target             |
| 2             | 1–2 working days after bounded operability acceptance | Runtime/tooling owner improves Docker context/layers and existing runner dispatch                                                       | Same artifacts/cleanup guarantees; cold/warm breakdown and docs-only cache hit proven; retain old mode until equivalent                                      |
| 3             | 2–3 working days                                      | Definition owner prepares 3–5 distinct supported jobs, ranks by demand and reuse; one reviewer examines their combined product evidence | At least two materially different jobs complete their real local journeys with zero runtime source branches; report rejected gaps and first-pass denominator |
| 4             | One bounded extraction per pass                       | Compiler owner separates one private responsibility with exact-output guard                                                             | No generated-byte change; next similar capability requires fewer unrelated module edits, measured rather than inferred from line count                       |
| 5             | Design first, then separate vertical slices           | Tech Lead and runtime owner establish Appointment intervals/timezones/capacity; implement reserve → conflict → cancel → rebook          | Complete responsive scheduling journey and concurrent conflict prevention; only then count a fourth runtime family                                           |
| Alongside 3–5 | Small consented evaluation batches                    | Product owner observes rough-prompt selection and ordinary-user first useful action                                                     | Record questions, abandoned intent, rescue and completion against fixture baseline; prioritize the largest effort failure                                    |

Do not wait for module extraction or catalogue scale work before shipping the
next supported business definition. Run independent preparation in parallel only
when write paths and shared interfaces are frozen. Appointment should follow its
business invariants, rather than adding nominal rows to the Approval family.

Record these metrics in one concise acceptance summary per batch:

| Metric                                                    | Current evidence                                                                            | Target / decision rule                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| User clarification turns                                  | Fixture-based paths only; real-user baseline unavailable                                    | Zero for supported complete briefs; ask only material missing choices                                |
| Describe-to-ready time                                    | Training 180,306 ms; Equipment 197,474 ms, local fixture observations                       | At most 300,000 ms per accepted local attempt; real-model p50/p95 measured separately                |
| Runtime source edits beyond definition data/case bindings | Equipment required a shared CSS density repair; no product branch                           | Zero for later in-profile data admission; shared gaps get focused reusable repairs                   |
| First-pass complete acceptance                            | Equipment first attempt failed; four attempts, three failures and one pass                  | Capture denominator and failures; improve across three batches, no retrospective hiding              |
| Regression and setup time                                 | Shared tests 443,372 ms; full Factory preparation 221,221 ms; later builds documented above | Warm definition lane under two minutes; repeated setup at least 50% lower after validated cache work |
| UI regression                                             | Accepted per-product screenshots and state checks                                           | No missing styles/media, overflow, editable derived output or misleading recovery                    |
| Business correctness                                      | Current family-specific local tests                                                         | Required invariants, denials, retries, concurrency and persistence pass                              |
| Coverage                                                  | Seven registered / seven locally accepted / three families                                  | Increase only after actual acceptance; track real-model/user validation separately                   |

Run the next batches from the accepted Equipment baseline: implement the
short admission lane and setup savings; admit several distinct supported jobs;
deliver Appointment's reusable scheduling invariants; expand catalogue retrieval
from measured evidence. Run consented ordinary-user and real-model evaluations
alongside these batches under existing provider authority. Treat failed intent
selection, excessive clarification or incomplete results as prioritization data.
Do not expose internal audit stages to ordinary users or equate a local preview
with a production deployment.

## Final reconciliation

- [x] Equipment actual acceptance, attempt timings and review outcomes linked.
- [x] Seven registered / seven locally accepted / three runtime families reconciled with current status and roadmap.
- [x] New failure/repair costs incorporated into priorities above.
- [x] Immediate bounded changes distinguished from proposed future work.
- [x] One independent review confirms actionability, authority boundaries and
      that no retrospective unsupported success claim was introduced.
