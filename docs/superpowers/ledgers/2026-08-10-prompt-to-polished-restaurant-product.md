# PM Ledger — Archeform Prompt-to-Polished Restaurant Product

Goal authority:
`docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`.
Design authority:
`docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`.
Branch: `feat/governed-composition-capability-foundry`.

Iteration states are controlled by PM only:

```text
planned -> implementing -> ready_for_qa -> reviewed -> accepted
```

Task 0 resumes immediately from the paused-session handoff. Restaurant product
code in Tasks 1–9 begins only after Task 0 is sealed, reviewed, committed, and
pushed. Expense Approval and Appointment Booking then remain regression
products; they are not the product-experience target for this iteration.

The root README is the public-brand authority. Active Workbench identity moves
to Archeform · 元象 in this iteration; stable `@factory/*` package names,
`factory.application-graph/*` protocols, Git paths, historical records, and
immutable hashes are not renamed by this ledger.

## Locked outcome

One restaurant brief produces a polished, runnable product with two application
surfaces backed by one immutable Published Application Graph:

- a customer mobile surface with Home, Menu, Dish Detail, Cart, Checkout,
  Orders, Order Detail, and Profile;
- a merchant desktop surface with Dashboard, Menu Management, Orders, Kitchen
  Queue, Tables, Users/Roles, and Settings.

These are fifteen distinct surface-owned screens. Both surfaces share one
domain, transaction, policy, workflow, and audit model.

The default journey is `Apps -> Describe -> Building/Live Preview -> Edit ->
Publish`. Graph internals, capability locks, lineage, and evidence remain in
Advanced surfaces unless an exception requires attention.

## Contract ownership

- Graph and Draft Preview Snapshot contract owner: `integration`.
- Restaurant and commerce semantics owner: `backend`.
- Generated UI and Workbench journey owner: `frontend`.
- Compiler, source export, and isolated acceptance owner: `platform`.
- Draft Preview Snapshot creation, retention, and disposal owner:
  `control-plane`; preview surface rendering owner: `platform`.
- Contract status: `proposed` until Task 1 is reviewed; parallel implementation
  against Graph v2 is forbidden before the contract is frozen.
- Contract artifact:
  `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`.

Any change to Graph v2, `DraftPreviewSnapshotV1`, lifecycle, compiler input,
surface ownership, or generated-source ownership stops parallel work and
returns to the Task 1 integration owner.

Multi-agent controller contract:
`docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`. Spark workers
may own only bounded, frozen-contract, path-disjoint details and never change
this ledger. Sol retains contract/integration and mandatory review ownership;
Terra retains QA. The controller is the only commit/push and state-transition
authority unless it explicitly delegates one reviewed Git action.

Controller runtime note — every explicit `gpt-5.3-codex-spark` spawn request in
this Goal has been rejected by the available subagent runtime, which currently
advertises only GPT-5.6-Sol and GPT-5.6-Terra. Bounded work is therefore
promoted to Sol under the workstream's fallback rule, while Terra remains QA;
the intended local Spark configuration is preserved and D0 records the actual
runtime gap instead of claiming false availability.

After Task 1 is frozen, Task 2 and Task 3 start together as the only parallel
product-code writer lines. Task 2 owns business semantics and never changes UI
registry source; Task 3 owns UI source/registry and never changes Restaurant
semantics. A missing shared key or binding is a Task 1 contract issue, not a
reason for either line to widen its paths.

## D0 — Record the product reset and freeze scope

State: `implementing`.

Owner: `pm`.

Allowed paths: the 2026-08-10 iteration, design, plan, ledger, research, and
Codex workstream documents; `.codex/config.toml`, `.codex/README.md`, assigned
`.codex/agents/*.toml`, `AGENTS.md`; plus separately assigned
roadmap/status/history annotations and the Task 0 clean-checkout manifest.

Acceptance evidence:

- product decisions, lifecycle, and non-goals are explicit;
- the five authoritative documents cross-reference one another;
- Base44 is documented only as a public product-pattern reference;
- source adoption and license boundaries are explicit.
- the 00:00-to-freeze decision chronicle, Archeform naming boundary, layered UI
  registry, template entry, large-file split, and parallel wave are explicit.
- the local configuration names `gpt-5.3-codex-spark` as the bounded
  default/Explorer with explicit worker and reviewer roles; runtime
  availability is probed and any unavailable-model promotion to Sol is recorded,
  while Sol retains contracts/integration/release review and Terra retains QA;
- the long-run workstream defines recovery, writer waves, reports, reviews,
  commits/pushes, escalation, and honest `GOAL_COMPLETE` conditions.

Blocked by: none. D0 does not authorize product-code implementation before
Task 0 and Task 1 gates.

## Task 0 — Seal Honest Requirement-to-Product Closure

State: `accepted`.

Owner: `integration`.

Allowed paths: the paths already assigned by the 2026-08-09 closure ledger.
This task must not begin Restaurant Product implementation.

Acceptance evidence:

- clarification converges in one round by default and never exceeds two rounds;
- interpretation, clarification, composition, compilation, and verification
  have independent timeouts and recoverable bounded states;
- Expense and Appointment complete guarded real-model journeys;
- material-difference, axe/theme, action inventory, clean-checkout, and cleanup
  evidence are recorded;
- no preview container, network, volume, artifact directory, credential, raw
  prompt, or raw provider response remains;
- independent review, closure ledger, commit, and push are complete.

Blocked by: none. The paused-session handoff is sufficient to resume. Review,
ledger closure, commit, and push are Task 0 exit gates.

Controller checkpoint — 2026-08-10 composition rejection boundary:

- Task 0 remains `implementing`. The generic Review-creation HTTP 400 was
  traced to pre-transaction request validation; the previous client retained
  only status, so the exact rejected check could not be recovered after no
  Graph or Review row persisted.
- A reviewed diagnostic slice now emits five bounded `composition.*` codes for
  request envelope, request identity, requirement contract, blueprint
  contract, and requirement/blueprint checksum binding. Workbench retains only
  that explicit allowlist and never carries rejected values or server messages.
- RED evidence was 5 Control Plane and 6 Workbench failures. Implementer GREEN
  evidence was Control Plane 219/219 and Workbench 261/261; the controller
  independently reran the focused boundary suites at 28/28 and 54/54.
- Independent Sol task review found no P0/P1 and approved both specification
  compliance and task quality. Existing deprecation, React test-act, and DNS
  warning noise is non-blocking and remains assigned to its owning tooling.
- The rebuilt, run-scoped Appointment reproduction completed interpretation,
  composition, publish, compilation, verification, preview, and evidence
  capture without a composition rejection. Verification persisted
  `succeeded`; the test then failed only because its final material-difference
  assertion requires Prompt A's in-memory hash and Prompt B was deliberately
  selected alone. The isolated Compose project, containers, network, volumes,
  and artifact volume were removed and cleanup was verified.
- The clean-checkout harness now passes manifest, frozen-install, formatting,
  TOML, shell-syntax, typecheck (16/16 packages), test (16/16 packages), and
  build (10/10 packages) gates. Root test concurrency is capped at four after a
  Windows Tinypool shutdown `EPERM` occurred only under unconstrained package
  concurrency; the affected package passed focused, the forced four-way full
  suite passed, and both the root and fresh-clean full suites then passed.
- The first paired run completed real-model Expense interpretation, then found
  a deterministic harness-ordering defect: the requirement overlay correctly
  intercepted a global theme click. The theme capture moved into the existing
  pre-reload theme-retention proof; focused Workbench evidence is 27/27 and the
  Playwright collection still contains exactly two guarded journeys.
- Independent review then rejected a redundant pre-theme brief fill because it
  could expose raw input in the theme screenshot. That fill is removed, the
  potentially affected isolated checkout is deleted, repository copies are
  absent, and the brief is now filled only after the theme evidence is captured.
  The wrapper also executes the material-difference checker explicitly and its
  progress/evidence counts are fail-closed.
- Focused re-review confirmed the privacy and material-difference repairs, then
  rejected inherited requirement screenshots as insufficient proof of fresh
  evidence. All 26 expected screenshots are now output-only and asserted absent
  from the clean checkout before Playwright. Both guarded journeys capture the
  blank requirement composer before any brief is entered; potentially affected
  repository requirement artifacts were removed. Focused re-review approved the
  privacy, evidence-provenance, material-difference, and cleanup controls for the
  final paired run with no P0/P1.
- Both failed isolated projects and every preview container, network, volume,
  and artifact resource were removed and independently verified absent.
- The approved clean paired run passed both guarded real-model journeys in 15.3
  minutes. Both verifications reached `succeeded`; both previews reached
  `stopped`; material difference passed for hashes, entities, pages, navigation,
  policy, and flows with no cross-product business-vocabulary leakage. The
  subsequent read-only action inventory failed closed because one visible
  Page-surface `<select>` lacked an accessible name; the wrapper trap again
  removed every isolated and preview resource.
- Browser and published-package source diagnosis identified Puck 0.22.3's
  viewport-zoom select as the sole offender; Archeform's Page selects were
  already labelled. A focused regression failed 1/5 before the fix. The
  first-party Page Studio boundary now labels only the pinned Puck zoom control
  and observes vendor remounts without patching dependency source; focused GREEN
  is 5/5. The real-browser sweep then passed Page and exposed two previously
  masked Domain `Unique` inputs; a focused shell regression failed 1/12, explicit
  field-qualified labels brought the combined focused suites to 17/17.
- The continued browser sweep proved three truthful preconditions missing only
  from the frozen gate inventory: Domain `Add relation` needs a second entity,
  AI `Propose Draft change` needs a description, and Code `Export Published`
  needs a Published revision. The executable allowlist and acceptance inventory
  now document each exact gate. The full read-only action inventory is GREEN in
  4.4 seconds across Home, all six canvas surfaces, and Release.
- Workbench full regression is GREEN at 262/262. The sequential Workbench
  typecheck and production build pass; formatting, Bash syntax, and diff checks
  also pass. An earlier concurrent typecheck overlapped the build's `.next`
  recreation and failed only on transient generated type files; the required
  sequential rerun is clean.
- The first independent accessibility gate rejected one P1 in its own
  inventory: disabled icon-only buttons with empty text were filtered before
  their `aria-label` could be checked. Two focused browser regressions failed
  2/2 against the old implementation, proving that false negative and that an
  unresolved `aria-labelledby` IDREF was incorrectly accepted as a name. The
  repaired inventory retains the icon label, resolves IDREFs to non-empty text,
  and passes 2/2; the Release inventory now accurately assigns the initial gate
  to action inventory and later live phases to the Golden Path.
- Next: complete the focused re-review, then rerun the frozen clean harness from
  a new scratch checkout. No additional real-model or composition fix is
  indicated by the successful paired journeys.
- Focused Sol re-review closed the inventory finding with no P0/P1 and approved
  the fresh paired rerun. The first launch attempt stopped at the manifest guard
  before install or service startup because a Windows-form scratch argument was
  relative under WSL Bash; its nested clone was verified and removed. A second
  WSL probe proved that shell lacked the Windows `pnpm` toolchain and stopped at
  install. Both scratch directories were removed. The accepted runner shell is
  Git Bash with a new absolute `/c/...` scratch path.
- The correctly isolated Git-Bash run passed the frozen install, manifest
  formatting/syntax checks, 16/16 typecheck tasks, 16/16 test tasks, and 10/10
  build tasks (Workbench 262/262, Control Plane 219/219, compiler 357/357).
  Prompt A completed its guarded release. Prompt B reached isolated
  verification but failed closed when no `.release-evidence-summary` became
  visible within 300 seconds. The wrapper trap removed all five containers,
  both volumes, and the project network; independent label-filtered checks found
  no remaining project resource. No evidence copied back.
- Task 0 remains `implementing`. The verification timeout is under bounded
  Sol/controller diagnosis; another paired run is not authorized until the
  lifecycle cause is proven or a focused safe-status reproduction distinguishes
  terminal failure from a long-running verification.
- The bounded reproduction reused the clean images in a fresh isolated project
  and selected only Prompt B. Safe lifecycle telemetry showed the Verification
  Run `pending` with one active queue job at 50 and 127 seconds, then
  `succeeded` with twenty shaped evidence steps and a completed queue job at
  201 seconds. The browser completed release, preview, and cleanup, then failed
  only at the expected cross-scenario material-difference assertion because
  Prompt A was intentionally omitted. No preview resource remained, and the
  diagnostic Compose project, containers, volumes, and network were removed
  and independently verified absent.
- The proven defect is a consumer timeout mismatch: Workbench applies the same
  300-second deadline to compilation and verification, the verification worker
  permits individual environment operations up to 600 seconds, and the
  Playwright acceptance wait uses the same 300-second edge rather than observing
  the existing bounded failure card. Task 0 is repairing this contract under
  TDD: compilation keeps its 300-second deadline, verification receives an
  independent 900-second deadline, and acceptance races success against the
  bounded failure code with a ten-second observation buffer. A fresh paired run
  remains gated on focused GREEN and independent review.
- Timeout RED proved the old hook failed the active verification at 300 seconds;
  focused GREEN keeps it `verifying` through that point and fails closed with
  `verification.timeout` at 900 seconds. The owned hook suite is 11/11 and the
  Workbench typecheck is clean. Browser RED independently proved the former
  success-only observer ignored a rendered failure card, and a second RED proved
  unbounded diagnosis text could escape the provisional helper. Final browser
  GREEN is 2/2: it races success and failure for 910 seconds, retains only a
  fixed-code grammar, and collapses all other diagnosis text to
  `verification.failed`. The local fixture is explicitly gated; ordinary
  Playwright collection remains exactly Prompt A and Prompt B. Prettier and
  diff checks pass. The controller's full Workbench regression is 262/262;
  sequential typecheck and production build pass.
- Independent Sol review found no P0/P1 and approved one fresh paired
  real-model clean-harness run. One non-blocking P2 notes that the deadline
  tests do not resolve a deferred request after expiry, although the centralized
  active predicate guards every post-await transition; the implementation and
  existing boundary tests are sufficient for this Task 0 gate. The fresh paired
  run remains mandatory because it is the first full acceptance after the
  timeout repair.
- The post-repair clean checkout passed the manifest guard, frozen install,
  formatting/syntax checks, 16/16 typecheck tasks, 16/16 test tasks, and 10/10
  build tasks. Prompt A again completed the full guarded release. Prompt B
  published and compiled, then the repaired observer surfaced the terminal
  bounded diagnosis `runtime.cleanup_failed` instead of waiting blindly. The
  harness trap removed all five run-scoped services, both volumes, and the
  network; independent checks found no acceptance or preview container,
  network, volume, or `.preview-runs` entry. No evidence was copied back.
- Task 0 remains `implementing`. This is now a bounded verification-runtime
  cleanup investigation under the repair cap, not another provider or
  composition hypothesis. A further paired run is forbidden until a
  deterministic test explains how cleanup can report failure even though the
  requested resources are subsequently absent, and the repair passes review.
- Two independent Sol traces found that deterministic explanation. A
  non-timeout preview boot failure performs compensating Compose teardown and,
  when that succeeds, deletes its copied preview directory before rethrowing
  the original boot error. The verification lifecycle then unconditionally
  calls stop; stop verifies the now-absent copied Compose file before Docker and
  therefore reports `preview_stop_failed`. All planned probes are skipped, so
  that second cleanup attempt becomes the sole failed evidence step and maps to
  `runtime.cleanup_failed` even though the first cleanup already removed every
  resource. The repair must carry an explicit self-cleanup disposition, avoid
  only that proven double stop, and still record the boot failure as a failed
  bounded step; merely treating missing source as successful cleanup would hide
  live leaks and is forbidden.
- Cleanup/boot RED was 4/57 worker failures plus 4/36 Graph-diagnosis
  failures. Focused GREEN carries an explicit default-false cleanup disposition,
  marks it complete only before any resource exists or after compensating down
  and directory removal both finish, skips only the proven redundant stop,
  records the first planned step as a failed bounded preview-start step, and
  maps all four safe preview-start codes to `runtime.preview_start_failed`
  without a Draft Diff. Incomplete cleanup still runs stop and fails closed;
  focused worker evidence is 57/57 and Graph diagnosis is 36/36.
- The same trace found the verification logging adapters dropped their supplied
  process runner and timeout options, silently falling back to the preview
  runner's defaults. A separate RED received `undefined` instead of the exact
  runner. The extracted bounded logging adapter now forwards runner and options
  by identity; focused GREEN is 1/1 and compiler-worker typecheck passes. The
  clean-checkout manifest includes both new adapter/test paths and every newly
  changed tracked repair path. Writer handoff is complete: compiler-worker is
  212/212, Graph is 216/216, both typechecks pass, and the controller reproduced
  those counts after rebuilding Graph before the worker suite. Focused formatting,
  Bash syntax, and diff checks pass. Task 0 is now `ready_for_qa`; Terra QA and
  the independent Sol gate remain required before another guarded run.
- Terra focused QA passed with no P0/P1: cleanup/lifecycle/job/logging 72/72,
  explicit complete/incomplete cleanup transitions 2/2, Graph diagnosis 36/36
  including all four preview-start mappings, Workbench release/cleanup 12/12,
  the 300/900-second boundary 1/1, and the local Playwright observer 2/2.
  Normal Golden Path collection is exactly two guarded journeys; worker,
  Graph, and Workbench typechecks, scoped Prettier, and Bash syntax pass. The
  manifest covers 79/79 tracked changes and all 52 present untracked paths;
  preview resources are 0/0/0 and both preview artifact locations are absent.
  QA authorizes one isolated Prompt B run, followed only if green and clean by
  the paired clean harness. The already recorded late-response P2 remains
  non-blocking.
- Independent Sol review rejected the run authorization on two P1s. A required
  probe that exhausts its operation timeout is currently recorded as skipped;
  because terminal status checks only failed steps, later passing work and
  cleanup could false-succeed. Separately, the clean harness proves only its
  outer Compose project absent and does not independently inspect the
  verification worker's distinct `factory-preview-*` projects. Task 0 returns
  to `implementing`. The repair contract is: probe timeout becomes a failed
  bounded step and fixed no-Diff runtime diagnosis, while a dedicated
  fail-closed resource guard checks preview containers, networks, and volumes
  before startup, in the trap, and at final cleanup without deleting unrelated
  resources. No provider run is authorized until deterministic tests, Terra QA,
  and Sol re-review close both findings.
- Required-probe timeout repair RED is recorded: the focused lifecycle case
  received `skipped` with no failure code instead of `failed` with
  `probe.timeout`, and the focused Graph diagnosis case received an unknown
  diagnosis instead of fixed `runtime.probe_timeout`. The failures isolate the
  reviewer finding before implementation; the parallel preview-resource guard
  remains path-disjoint and in its own TDD cycle.
- Preview-resource guard behavior RED is recorded after an initial missing-module
  boundary check: 5/6 cases failed against a zero-result stub. No Docker label
  queries were issued, matching container/network/volume resources returned
  success instead of failure, and an injected Docker query error failed open;
  only unrelated-label filtering passed. The contract therefore proves all
  three resource kinds and Docker-error handling before the implementation.
- Required-probe timeout repair GREEN is complete: lifecycle 21/21 and Graph
  diagnosis 37/37 pass; full Graph is 217/217, followed by a successful Graph
  build and typecheck; full compiler-worker then passes 212/212 with its
  typecheck clean. Timed-out required probes now record fixed
  `probe.timeout` failed evidence while later probes and cleanup continue, and
  Graph emits fixed `runtime.probe_timeout` with no Draft Diff. Diff checking
  passes and no provider was invoked.
- Preview-resource guard repair GREEN is complete: its six deterministic cases
  pass for empty state, exact read-only label queries, matching containers,
  networks, and volumes, unrelated/outer projects, and Docker-query failure.
  The guard recognizes only `factory-preview-preview-*`, emits fixed generic
  errors, and never deletes resources. The clean harness runs its test in the
  deterministic gate and invokes the guard before startup, after outer Compose
  down in the trap, and at final cleanup. Bash syntax, scoped formatting, and
  diff checks pass; no provider was invoked.
- Controller integration reran a fresh Graph build, Graph 217/217, Graph
  typecheck, compiler-worker 212/212, compiler-worker typecheck, guard 6/6,
  the live read-only Docker guard, harness syntax, scoped formatting, and
  `git diff --check`; all pass. The frozen manifest is exact for 79 changed
  tracked files and all 54 present untracked files, with the six output-only
  evidence paths intentionally absent. Writer handoff covers the four
  lifecycle/diagnosis paths, both guard files, and the clean harness. Task 0 is
  `ready_for_qa`; Terra must retest both repaired P1 contracts before Sol
  re-review can authorize any provider execution.
- Terra independently passes the repaired deterministic QA gate with no P0/P1:
  Graph rebuild and 217/217, compiler-worker 212/212, both typechecks, focused
  timeout and diagnosis cases 1/1 each, guard 6/6 plus a successful live
  read-only query, harness ordering, scoped formatting, Bash/TOML syntax, and
  diff checking. The manifest remains 79/79 tracked with all 54 present
  untracked paths covered; preview containers/networks/volumes are 0/0/0 and
  both preview artifact directories are absent. QA recommends independent Sol
  re-review before the isolated Prompt B provider gate.
- Independent Sol re-review closes both P1s with no new P0/P1. It verifies that
  timeout evidence is failed and terminally fail-closed, the diagnosis is fixed
  and no-Diff, the guard is read-only and exact to the worker preview namespace,
  Docker-query errors fail closed, and the clean harness exercises the guard in
  its deterministic suite plus all three required runtime positions. The two
  previously recorded P2 coverage gaps remain non-blocking. Review authorizes
  one isolated Prompt B run; the paired clean harness remains conditional on a
  fully green focused run and empty preview/resource artifacts.
- Pre-launch inspection found no supported no-code way for a Prompt B-only
  Playwright run to satisfy the existing pair-only in-memory Prompt A hash
  assertion: grep filtering correctly leaves that hash undefined. Task 0
  returns to `implementing` for a bounded acceptance-runner TDD slice. The
  frozen contract adds an explicit Prompt B-only environment mode that always
  validates Prompt B's published hash, requires Prompt A to be absent in focus
  mode, and preserves valid unequal A/B hashes in normal paired mode; the clean
  harness must explicitly clear the focus flag. No production behavior or
  manifest path changes, and no provider starts before local proof and review.
- Prompt B-only runner RED is recorded with seven local graph-outcome fixtures:
  five paired-mode cases pass, while a valid Prompt B with absent Prompt A in
  focus mode fails at the old Prompt A hash assertion; serial mode then leaves
  the final case unrun. This isolates the pair-only assertion without invoking
  Docker, a provider, or product behavior.
- Prompt B-only runner GREEN is complete: all seven local no-provider outcome
  fixtures pass. Prompt B's hash is always validated; focus mode additionally
  requires Prompt A state to be absent, while normal mode still requires valid
  unequal A/B hashes. Normal discovery remains exactly two guarded journeys,
  and focused Prompt B discovery is exactly one. The paired clean harness
  explicitly clears the focus flag. Controller reruns confirm 7/7, both
  inventories, scoped formatting, Bash syntax, diff checking, and the exact
  79/79 tracked plus all 54 present untracked manifest boundary. Writer handoff
  covers only the already-manifested E2E spec and harness; Task 0 returns to
  `ready_for_qa` for narrow Terra QA and Sol review before any provider startup.
- Terra narrow QA passes the Prompt B-only runner with no new P0/P1/P2: local
  outcomes 7/7, normal collection exactly two guarded journeys, focus
  collection exactly one Prompt B journey, and the clean harness explicitly
  clears the mode while retaining its unfiltered paired run and subsequent
  standalone material-difference proof. Manifest, 94-file scoped formatting,
  Bash/TOML syntax, and diff checking pass. QA authorizes the focused real run
  subject to final Sol review of this acceptance-only slice.
- Final narrow Sol review finds no P0/P1/P2 and authorizes exactly one focused
  real Prompt B run. Review confirms the focus branch always validates Prompt
  B, requires Prompt A state to be absent, cannot weaken an unfiltered paired
  run, and introduces no credential, prompt, response, manifest, or immutable
  lifecycle exposure. The paired clean harness remains unauthorized unless the
  focused run is fully green and both Docker and artifact cleanup are empty.
- The authorized cold current-source Prompt B-only run passes 1/1 in 8.7
  minutes. It creates one review, immutable Published revision, Compilation,
  and Verification run; verification terminalizes `succeeded`, the generated
  preview passes its browser and accessibility gates, and Stop removes the
  preview. The guaranteed outer teardown reports `status=0 cleanup=True` after
  removing five services, two volumes, and its network. Independent post-run
  proof finds preview resources 0/0/0, outer project resources 0/0/0, and both
  preview artifact directories absent. No credential, raw prompt, or provider
  response was logged or persisted. The paired frozen clean harness is now
  authorized.
- The authorized paired clean harness passed its frozen install, manifest,
  formatting and syntax checks, 16/16 typecheck tasks, 16/16 test tasks, and
  10/10 build tasks. Both guarded real-model journeys passed in 15.5 minutes;
  both Verification runs terminalized `succeeded`, both preview projects were
  removed, and the independent material-difference gate passed across hashes,
  entities, pages, navigation, policy, flows, and business vocabulary. The
  subsequent read-only action inventory failed closed on the disabled boundary
  reorder control `Move Request intake up`, whose truthful disabled state was
  not classified by the executable gate inventory. The wrapper trap removed
  the outer project, both volumes, and its network; the dedicated preview guard
  and independent label checks find preview and outer resources 0/0/0, and
  both preview artifact directories are absent. Task 0 returns to
  `implementing` for a bounded action-inventory TDD repair. The failed harness
  scratch is retained until the repair and evidence disposition are complete;
  no further provider run is authorized before focused GREEN and review.
- Action-inventory RED is recorded against the clean failure's exact boundary
  label: the focused fixture rejected disabled `Move Request intake up` as an
  undocumented control. Source and existing PageTree tests prove that the first
  item's up control and last item's down control are intentionally disabled
  local reorder boundaries. Minimal GREEN extends only the executable disabled
  inventory to the exact dynamic `Move <page> up/down` label family and adds a
  positive boundary fixture while retaining the negative undocumented icon
  fixture; no Workbench behavior or shared contract changes. The authoritative
  inventory now explicitly documents both boundary states. Controller evidence
  is 3/3 focused Playwright fixtures and 4/4 PageTree regressions, with scoped
  Prettier and `git diff --check` clean. Writer handoff is complete and Task 0
  returns to `ready_for_qa`; narrow Terra QA and Sol review are required before
  the paired harness may run again.
- Terra narrow QA passes the action-inventory repair with no P0/P1/P2: focused
  Playwright is 3/3, PageTree is 4/4, the action-inventory authority names the
  dynamic labels and both disabled boundary states, and all 79 tracked plus all
  56 present untracked paths remain within the frozen manifest. The 94-file
  scoped Prettier gate, Bash/TOML syntax, diff checking, and the live read-only
  preview-resource guard pass; preview containers, networks, and volumes are
  0/0/0. QA recommends exactly one paired frozen-harness rerun after independent
  Sol review; it did not start services or invoke a provider.
- Independent Sol review finds no P0/P1/P2. The anchored pattern admits only a
  non-empty dynamic page title followed by `up` or `down`, matches PageTree's
  exact labels and truthful boundary behavior, retains both negative naming
  gates, and does not skip any live surface. The authority, frozen manifest,
  and full harness invocation remain consistent; no product, lifecycle,
  persistence, credential, prompt, or provider boundary changes. Review
  authorizes exactly one frozen paired clean-harness rerun.
- The authorized rerun passed the fresh frozen install, manifest, format and
  syntax gates, 16/16 typechecks, 16/16 package tests, and 10/10 builds. Prompt
  A reached Review, immutable publish, Compilation, and isolated verification,
  then failed closed with bounded `runtime.preview_start_failed`; Prompt B did
  not run, and action inventory was therefore not reached. The wrapper trap
  removed all five outer services, both volumes, and its network. Independent
  preview and outer label checks are 0/0/0, neither root nor scratch preview
  artifact directory exists, and no evidence was copied back. This is a new
  runtime-start RED rather than recurrence of the action-inventory finding.
  Task 0 returns to `implementing` for bounded Sol diagnosis under the repair
  cap; no further provider run is authorized before a deterministic cause,
  focused regression, QA, and review.
- The failed preview's retained, task-created Docker build intermediate makes
  the runtime-start RED deterministic without another provider call. Replaying
  only its exact generated database install/Prisma-generate command reproduces
  Prisma `P1012`: the generated schema defines `AuditEvent` twice. The immutable
  product Graph legitimately contributes an `audit-event` domain entity, while
  the database target unconditionally appends a different compiler-owned audit
  persistence model with the same Prisma name. The copied safe schema proves
  both declarations and contains no credential, prompt, or provider material.
  Cleanup remains truthful and empty. This is a generated-model namespace
  collision, not a Docker-resource leak or an unclassified provider failure.
  Task 0 remains `implementing` while Sol freezes the smallest compiler-owned
  namespacing contract and its regression scope; no further provider run is
  authorized before focused RED/GREEN, deterministic package verification,
  Terra QA, and independent Sol review.
- Sol freezes the complete repair contract under the Task 0 repair cap. Seven
  compiler/package-owned Prisma names are reachable through legitimate kebab
  Graph entity keys: audit and capability events, the commerce line projection,
  the order-operation receipt, the notification outbox, and both money-pricing
  models. A one-name repair would leave six identical P1 collision paths. The
  compiler therefore reserves the Graph-unreachable `Factory_` storage
  namespace and must render all seven model names, physical tables, relations,
  indexes, constraints, and generic Prisma delegates there, after capability
  contribution digests are verified and without changing signed asset source.
  Graph domain names remain unchanged; the Restaurant schema override remains
  its existing closed contract. A local Prisma 6.19.3 probe validates both the
  underscore-bearing model syntax and the lower-first `factory_...` client
  delegate. The probe's accidental home-level package install was audited as
  task-created and removed by three exact absolute targets; repository state
  was not changed. Required GREEN includes exact Expense and all-seven
  namespace regressions, final assembled schema/migration uniqueness guards,
  generic/Restaurant delegate coverage, actual Prisma validation/generation,
  full compiler verification, Terra QA, and independent Sol review. Safe-stage
  diagnostic-code expansion is deferred because the initiating compiler cause
  is now exact; no further provider run is authorized before this repair is
  accepted.
- Prisma-namespace RED is recorded before implementation. The focused compiler
  command selected five cases: the Restaurant closed-schema control passed;
  the exact Expense collision, the all-seven collision family, and the final
  assembled Prisma and SQL duplicate guards failed as intended. Expense
  rendered two `AuditEvent` declarations, the all-seven fixture produced 24
  declarations but only 17 unique model names, and neither assembled duplicate
  fixture failed during compilation. This is the frozen failure boundary; the
  Sol writer is implementing only the reviewed namespace and validation
  contract, with no provider or service execution.
- Namespace implementation reaches focused GREEN: the exact/all-seven/Restaurant
  and assembled duplicate cases pass 5/5, and the two initially owned test
  files pass 79/79. Two additional adversarial RED cases proved that the first
  assembled guard did not reject duplicate schema-global SQL indexes or
  same-table SQL constraints; the extended fixed-error guard passes all four
  model/table/index/constraint cases and the owned files pass 81/81. The first
  full compiler run is a regression RED at 356/364: eight stale expectations
  in notification-outbox fake Prisma accessors and order-operation/money-pricing
  generated-name assertions still use the pre-namespace identifiers. They are
  test-contract failures, not production failures or compatibility authority.
  Their three exact test paths and harness allow-list entries are added to the
  same Sol ownership for a no-fallback GREEN before package verification.
- The extended compiler GREEN passes the three stale-contract files 31/31 and
  the full package 364/364, with typecheck and build successful. An assembled
  all-seven collision artifact passes real Prisma 6.19.3 validation and client
  generation; the client exposes all seven exact `factory_...` delegates. The
  repository-local probe used an explicit isolated generator output, then its
  schema and client directory were removed by verified exact absolute paths.
  No package manifest, lock, provider, service, or persistent probe artifact
  changed. Post-format confirmation and independent QA/review remain required.
- Writer handoff is complete. Final writer evidence is compiler 364/364 with
  typecheck and build green, assembled Prisma validate/generate green, and all
  exact probe targets absent. Controller re-verification passes the seven-case
  namespace/assembly focus, the neutral diagnosis focus, scoped formatting,
  Bash syntax, repository diff checking, and the live fail-closed preview
  resource guard. Task 0 returns to `ready_for_qa` for independent Terra QA and
  Sol implementation review. No further provider run is authorized until both
  gates accept this repair.
- Independent Sol implementation review finds no P0/P1/P2. It confirms the
  seven-name token/quoted-identifier remap occurs only after capability digest
  verification, leaves signed assets and Graph domain names unchanged, covers
  tables/relations/indexes/constraints/delegates, preserves the closed
  Restaurant override, and fails duplicate final artifacts with one fixed
  non-disclosing error. The exact/all-seven/adversarial/Restaurant tests and
  neutral diagnosis contract are adequate, and every changed repair path is
  contained by the clean-harness allow-list. Review authorizes exactly one
  paired frozen clean-harness rerun after Terra QA also passes.
- Terra independently passes the repaired QA gate with no P0/P1/P2. Fresh
  evidence is compiler focused 112/112 and full 364/364 plus typecheck/build;
  Graph diagnosis 37/37 focused and 217/217 full plus typecheck/build; and an
  assembled all-seven Prisma 6.19.3 validate/generate whose generated client
  exposes all seven exact delegates. The first QA schema location correctly
  failed auto-install-disabled generation outside the owning package and left
  no residue; the exact Control Plane-local rerun succeeded and both targets
  were removed. Manifest containment is 82/82 tracked plus all 56 present
  untracked paths, with four output-only absences; 97-file formatting,
  Bash/TOML, diff, live preview guard, direct 0/0/0 resource counts, both
  artifact-directory checks, and all home/probe residue checks pass. No
  provider or product service was started. With the independent Sol review
  also green, exactly one paired frozen clean-harness rerun is now authorized.
- The authorized clean-checkout invocation first exposed two wrapper-only
  preflight errors before any service or provider use: WSL interpreted a
  Windows scratch argument as a relative `C:` clone target, which was stopped
  and removed by its exact verified WSL path; the corrected WSL invocation had
  no `pnpm` on PATH. The harness was restarted under its intended Git Bash
  environment. Frozen install, formatting, the six-case resource guard, and
  16/16 typechecks then passed, but the full clean test matrix failed closed at
  211/212 compiler-worker tests: its order-operations lifecycle assertion still
  expected pre-namespace `model OrderOperationReceipt`. No Docker stack,
  preview, or provider started. This is an additional stale-test RED within the
  already frozen namespace contract, not a product/runtime failure. Task 0
  returns to `implementing` for the exact assertion and manifest repair,
  deterministic QA/review, and only then a clean-harness restart.
- The downstream stale-contract repair is complete. The compiler-worker
  lifecycle assertion now expects the frozen `Factory_OrderOperationReceipt`
  storage model and its exact test path is present in the clean-harness tracked
  manifest. The recorded clean-harness result (211/212) is the RED; focused
  GREEN passes 4/4 and the full compiler-worker suite passes 212/212, with
  typecheck, build, scoped formatting, Bash syntax, and diff checks green. The
  writer handoff is complete, no provider or service was started, and Task 0
  returns to `ready_for_qa` for independent narrow review and QA before the
  paired harness may restart.
- Independent Sol review finds no P0/P1/P2 in the downstream delta. It confirms
  the assertion names the frozen storage-only model, generic runtime/domain
  behavior has no compatibility fallback, and the exact test path appears once
  in the clean-harness manifest. Fresh review execution passes the focused 4/4,
  full compiler-worker 212/212, typecheck, build, formatting, Bash syntax, and
  diff checks. The review approves exactly one paired harness restart after QA.
- Terra independently passes the narrow QA gate with no P0/P1/P2. Fresh
  evidence is focused 4/4, full compiler-worker 212/212, typecheck/build, all
  six fail-closed resource-guard cases, a live guard, direct managed-resource
  counts of 0/0/0, and absent preview artifact directories. Manifest
  containment is exact at 83/83 tracked changes and all 56 present untracked
  paths. Formatting, Bash syntax, and diff checks pass. With both gates green,
  Task 0 returns to `implementing` for the single authorized paired frozen
  clean-harness restart.
- The restarted paired clean harness passes the clean checkout, frozen install,
  formatting, six-case resource guard, all 16 typecheck tasks, the complete
  unit-test matrix (including Graph 217/217, Workbench 262/262, Control Plane
  219/219, compiler-worker 212/212, and compiler 364/364), all ten build tasks,
  the fixture-free Compose build, and Prompt A. Prompt B publishes and submits
  its compilation, but the Release workspace never exposes `Run Isolated
Verification`; the bounded 300-second button wait fails. The harness fails
  closed before material-difference/action-inventory completion and removes all
  five containers, its network, and both volumes. The live fail-closed guard,
  direct managed-resource counts of 0/0/0, and both preview-directory checks
  pass afterward. No raw provider prompt or response is inspected or recorded
  in this ledger. Task 0 remains `implementing` for provider-safe root-cause
  diagnosis; another live rerun is forbidden until a bounded repair completes
  RED/GREEN plus independent Sol review and Terra QA.
- Provider-safe read-only diagnosis proves a second success-only acceptance
  blind spot: during the compile-to-verify handoff the E2E waits only for `Run
Isolated Verification`, although a terminal release already renders a
  `.release-failure-card` with a regex-bounded `.release-diagnosis`. Both the
  Workbench compilation deadline and the Playwright success wait are exactly
  300 seconds, so a timeout can also lose an edge race. Existing unit coverage
  proves `compilation.timeout` and the failure card; no compile-boundary E2E
  observer fixture exists.
- The same diagnosis finds a load-bearing lifecycle gap below the observer.
  `executeQueuedCompilation` reports only successful completion. If bundle
  generation, artifact materialization, or the success callback throws, the
  BullMQ compilation job fails but no authenticated failure callback exists;
  the Control Plane row can remain `queued` until the Workbench's 300-second
  timeout. Verification jobs already have fail-closed terminal evidence, so
  this is an asymmetric compilation contract defect. The exact prior worker
  exception is intentionally unrecoverable after the harness removed its
  database/artifact volumes. A Sol contract owner must freeze bounded,
  non-disclosing queued-to-failed terminalization and the success/failure E2E
  observer before writers begin; no live provider rerun is authorized.
- The Sol contract owner freezes the compilation repair contract. The only
  worker failure evidence is
  `{ apiVersion: "factory.compilation-failure/v1", failureCode:
"compilation.failed" }`, submitted with the existing internal worker token
  to `POST /internal/compilations/:compilationId/failed`; message, reason,
  stack, cause, Graph, prompt, response, and arbitrary diagnostic fields are
  forbidden. The Control Plane owns canonical `completedAt`, persists exactly
  failed status/code/time with no artifacts, and makes queued-to-succeeded and
  queued-to-failed compete under one atomic transaction/CAS discipline.
  Identical terminal retries are idempotent without changing `completedAt`;
  differing same-terminal or cross-terminal evidence conflicts, malformed
  evidence fails closed, and terminal compilations remain immutable. The
  success path must atomically couple artifact creation to the terminal result
  so a race cannot leave orphan artifacts.
- The worker must bound both execution and completion-report exceptions by
  attempting the fixed failure callback and then throwing only `Queued
compilation failed after bounded failure reporting.` without the original
  cause. Workbench must strictly parse only exact queued/running, real
  succeeded artifact-count/time, or failed code/time result shapes while
  projecting stable outer row fields and rejecting unsafe extra result keys.
  The compile-to-verify E2E observer races the verification action against the
  existing failure card for 315 seconds, accepts only `compilation.failed` or
  `compilation.timeout`, falls back to `compilation.failed`, and never includes
  adjacent card content. Required RED/GREEN covers worker execution and report
  failures, exact reporter auth/payload, callback idempotency and races,
  strict Workbench parsing/immediate failure, and local success/failure/timeout/
  malicious E2E fixtures. One Sol integration writer owns this cross-package
  contract; provider and service execution remains forbidden through review
  and QA.
- Compilation terminalization TDD is active. The Control Plane RED fails 9 of
  106 focused lifecycle service/controller cases on the absent failure method,
  route, authentication, idempotency, and terminal race behavior. Minimal
  GREEN passes 108/108 plus typecheck: exact failed and succeeded retries
  preserve `completedAt`, differing same-terminal and cross-terminal evidence
  conflicts, success and failure share an exact queued-result CAS in a
  Serializable interactive transaction, and artifacts are inserted only in
  the winning success transaction. A follow-up PostgreSQL serialization RED
  proves two raw `P2034` conflicts escaped; GREEN retries a Serializable
  terminal transaction at most three times so the retry can observe identical
  idempotency or a terminal conflict, and maps exhausted conflicts to a fixed 409. The expanded Control Plane focus passes 110/110 plus typecheck. The
  worker RED records four expected failures around missing bounded reporting;
  worker GREEN passes all 7 focused cases plus typecheck. No provider or service
  was started.
- The Workbench strict-result RED fails 13 of 59 focused parser/client/release
  cases because no parser exists and create/get accept unsafe result extras.
  GREEN passes 59/59 plus typecheck: both compilation endpoints request unknown
  data, project required outer fields, strictly parse exact queued/running/real
  succeeded/failed result shapes, and the release hook uses the parsed failed
  code. The compile-boundary observer RED then fails only the missing helper
  after nine baseline cases; GREEN passes all 13 provider-free local fixtures,
  including success, explicit failure, timeout, and malicious diagnosis
  fallback, while the two guarded provider journeys remain skipped. No provider
  or service was started.
- The writer's first full regression gate passes the complete Control Plane
  suite at 233/233 (19 files, including its build step). Focused Control Plane
  coverage is now 111/111 after an additional orphan-artifact edge, and the
  clean-harness manifest contains the ten newly changed tracked paths across
  Control Plane, compiler-worker, and Workbench compilation-status ownership.
  Full worker/Workbench and whole-tree manifest/hygiene checks remain required;
  Task 0 stays `implementing` and no live rerun is authorized.
- The first full Workbench regression records 272 passed and four failed. All
  four failures are stale pre-contract terminal fixtures in
  `components/workbench-home.test.tsx` and
  `components/shell/workbench-shell.test.tsx`: succeeded rows omit required
  `artifactCount`, and a failed row omits required `failureCode`. The strict
  production parser is not weakened. The integration writer's ownership is
  extended only to those two test paths and their exact manifest entries for a
  focused fixture RED/GREEN followed by the full Workbench rerun.
- The stale Workbench fixture repair is GREEN without a compatibility path:
  the expanded focus passes 84/84 and the full Workbench suite passes 276/276
  across 33 files. The local compile observer passes 13 cases with the two
  guarded journeys skipped, and normal Playwright inventory is exactly those
  two journeys. Fresh full Control Plane is 233/233 and compiler-worker is
  215/215; all three package typechecks and both remaining builds pass. Scoped
  Prettier, Bash syntax, and diff checks pass. Clean-harness containment is
  exact at 94/94 tracked changes and all 56 present untracked paths covered by
  the 60-entry untracked manifest (four output-only evidence paths absent),
  with zero outside, missing tracked, or duplicate entries. No provider,
  service, or Compose process was started; writer final diff review/handoff is
  the remaining implementation gate.
- The Sol integration writer handoff is complete across the 18 approved paths.
  Final writer evidence is Control Plane 233/233, compiler-worker 215/215,
  Workbench 276/276, all focused suites/typechecks/builds, 13 provider-free
  observer fixtures, exactly two guarded journey entries, formatting/Bash/diff
  hygiene, and exact manifest containment. Security review confirms fixed
  authenticated failure evidence, no raw exception/Graph/provider material in
  callback, persistence, thrown error, or console output, and immutable
  terminal/race semantics. No provider, product service, Compose, commit, or
  push occurred. Task 0 is `ready_for_qa`; independent Sol task review and
  Terra QA are the next gates. Real PostgreSQL concurrency remains an explicit
  adversarial review focus, while Control Plane unavailability during bounded
  failure reporting remains the frozen residual.
- Terra QA's first broad hygiene pass finds one P1 gate failure: among 109
  manifest-scoped Prettier inputs, only this ledger fails after the controller's
  latest continuous-status entries. The controller independently reproduces
  the focused Prettier RED with exit 1, formats only this ledger, and returns it
  for a fresh scoped formatting/manifest/diff recheck. Product code, provider
  state, and services are unchanged; paired acceptance remains blocked until
  QA confirms the repair.
- Independent Sol task review approves the repair with no P0/P1. Fresh review
  evidence passes Control Plane 111/111, compiler-worker 7/7, Workbench 84/84,
  all three typechecks, 13 local observer cases with guarded journeys skipped,
  current-tree Prettier, Bash syntax, diff checks, and exact manifest
  reconciliation. Review confirms the fixed authenticated payload, strict
  failure parsing, atomic queued-result CAS plus artifact transaction, bounded
  `P2034` handling, terminal idempotency/conflicts, non-disclosing worker path,
  strict Workbench projection, and bounded 315-second E2E observer. P2s are the
  absence of real PostgreSQL contention evidence before the live harness and
  inherited non-failing React `act(...)`/test-host DNS warning noise.
- Terra independently passes QA with no open P0/P1 after reproducing and
  rechecking the ledger-only Prettier repair. Fresh full evidence is Control
  Plane 233/233, compiler-worker 215/215, Workbench 276/276, affected
  typechecks/builds, the required focused suites, 13/13 provider-free observer
  cases, exactly two guarded journey entries, six resource-guard cases, and
  full manifest hygiene across 109 Prettier inputs, one Bash file, six TOML
  files, and diff checks. Manifest reconciliation is 94/94 tracked and all 56
  present untracked paths covered by the 60-entry manifest. Task 0 preview
  labels are 0/0/0 and preview artifact directories are absent. Shared or
  historical non-preview Docker projects remain present and untouched. QA
  accepts the deterministic CAS/`P2034` evidence for the pre-live gate and
  authorizes exactly one isolated paired frozen clean-harness run, which owns
  its labels and cleanup. Task 0 returns to `implementing` for that run only.
- The single authorized paired frozen clean-harness run passes manifest
  reconstruction, frozen install, Prisma generation, formatting, all six
  resource-guard cases, all 16 typecheck tasks, the complete 16-task unit-test
  matrix, all ten build tasks, fresh image construction, five-service health,
  and the complete Prompt A release. Prompt B then reaches the bounded
  requirement failure surface and is rejected during interpretation before
  composition, publication, compilation, material-difference, or action
  inventory. Playwright reports exactly `Requirement interpretation was
rejected.`; one journey passes and one fails after 11.6 minutes. The harness
  trap removes its five containers, network, and two volumes. A fresh guard,
  exact harness-project container/network/volume queries, and all four preview
  artifact-directory checks are empty. No raw prompt, provider response, trace,
  screenshot, or model material is inspected or recorded. Task 0 remains
  `implementing`; another provider run is forbidden until provider-safe
  diagnosis, bounded RED/GREEN if required, independent Sol review, and Terra
  QA complete.
- Provider-safe Sol diagnosis finds a load-bearing interpretation deadline
  asymmetry. The OpenAI interpreter may perform one initial call plus two
  sequential deterministic repair calls, but the Workbench gives initial
  interpretation only the one-call 180-second deadline; only clarification
  receives the corresponding 540-second budget. Neither the route nor adapter
  propagates the browser abort into the provider transport, so server/provider
  work can continue after the UI has failed. The exact prior failure class is
  intentionally unrecoverable without inspecting forbidden raw artifacts, but
  this structural underbudget can reject a legitimate repair sequence and is a
  P1 acceptance defect.
- The same diagnosis proves another success-only observer and bounded-code
  gap. The route returns HTTP status plus an interpreter error message, the
  hook discards both status and body for every non-timeout failure, and the E2E
  treats any global error banner as `Requirement interpretation was rejected.`
  It therefore cannot distinguish interpretation timeout/failure from a later
  automatic review/planning failure after a successful interpretation. A Sol
  tech lead is freezing one server-owned deadline/abort, fixed error-code wire,
  strict Workbench mapping, and journey-scoped E2E observer contract before a
  writer begins. No further provider run is authorized.
- The Sol tech lead freezes the interpretation repair with no founder, ADR,
  dependency, catalog, Graph, persistence, or Compose decision required. Each
  OpenAI semantic call is limited to 180 seconds with `maxRetries: 0`; one
  adapter invocation owns a 540-second total across the initial candidate and
  at most two deterministic repair rounds. Initial interpretation and
  clarification both use a 555-second Workbench deadline, the journey-scoped
  browser observer uses 570 seconds, and each canonical product retains an
  1,800-second outer cap. The abort chain is browser request to Next request to
  interpreter to transport to the SDK call; caller, total, and round signals
  are composed, timers are cleared, an abort prevents later repairs, and no
  client/E2E retry or reclick is allowed.
- The only failure wire is the exact versioned code-only envelope
  `{ error: { apiVersion:
"factory.requirement-interpretation-error/v1", code } }`. The allowlist is
  `requirement.request_invalid`/400, `requirement.output_invalid`/422,
  `requirement.provider_rejected`/502,
  `requirement.provider_not_configured`/503,
  `requirement.provider_unavailable`/503, `requirement.timeout`/504, and
  `requirement.failed`/500. Workbench strictly validates exact keys and
  code/status pairing, renders only fixed local messages, and collapses every
  unknown, hostile, or mismatched body to `requirement.failed`. Success remains
  `{ interpretation }` and must be strictly revalidated. No provider,
  validator, exception, abort, model, or candidate message may enter repair
  input, response, UI, E2E errors, console output, evidence, or persistence;
  JSON/shape/semantic repair uses one fixed instruction and final failures are
  typed `requirement.output_invalid`.
- Journey failure state is structured by phase and bounded code. The initial
  E2E observer is scoped to the Product Creation requirement outcome and exact
  `requirement.*` failure attributes; it never reads a global error banner.
  Successful interpretation is observed before automatic Review/planning,
  whose clarification/review/planning/composition outcomes are handled by a
  separate allowlisted observer. One Sol integration writer owns the adapter
  transport/interpreter, route/wire, Workbench contract/state/UI, and local E2E
  fixtures as one serialized contract. Required RED covers round/total/caller
  abort, SDK options, no transport retry, typed output exhaustion, hostile
  sentinel non-disclosure, exact route/status bodies, strict client fallback,
  equal initial/clarification deadlines, transient-state preservation, phase
  separation, observer/product caps, and single-click acceptance. Provider,
  service, Compose, ledger, and clean-harness execution remain controller-only
  until writer handoff, independent Sol review, and Terra QA.
- Interpretation repair TDD is active. The adapters baseline passes 34/34; the
  first focused RED then fails 8 of 34 cases with two fake-timer unhandled
  rejections. It proves the missing round/total/caller abort chain, absent SDK
  signal/timeout/no-retry options, old provider error classification, raw final
  `SyntaxError`, and dynamic semantic/hostile repair failures. Only the focused
  adapter test changes before this RED; production remains untouched. The
  shared transport fields will be optional so existing Graph proposal behavior
  remains unchanged, while requirement interpretation supplies the frozen
  values. No provider or service is used.
- The adapter implementation passes its focused 34/34, expanded 41/41, and
  typecheck gates: round/total/caller aborts, exact SDK options, no provider
  retry/repair, typed output exhaustion, and hostile-message non-disclosure are
  green. Controller inspection then finds one collateral shared-transport
  regression: the Graph proposal path was fabricating requirement-specific
  timeout/retry options. A dedicated RED fails 1 of 7 Graph provider cases;
  GREEN forwards only policy fields actually supplied, preserves Graph SDK
  defaults, and makes the requirement transport fail closed unless its exact
  composed signal/180-second/zero-retry policy is present. The combined adapter
  focus returns to 41/41 plus typecheck. No provider or service is used.
- The Workbench/route RED is recorded before its production edits: five focused
  files run 90 cases, with 20 expected failures and 70 passes. Route failures
  prove message-bearing bodies and the old classifier; journey-model failure
  proves no structured phase/code state; hook failures prove no strict
  response parser, fixed mapping, or structured failure; Home failures prove
  semantic outcome attributes are absent. Both new 555-second timer cases
  already reach their expected fixed text and preserve state but correctly
  fail on the missing structured object. No unexpected error, provider,
  service, or path blocker occurs.
- The Workbench/route phase is GREEN after rebuilding the browser-safe adapters
  entry: route, new interpretation contract, journey model, hook, Home, and
  composer pass 93/93 plus Workbench typecheck. Exact code/status bodies,
  strict success parsing, hostile/extra/unknown/version/status-mismatch
  fallback, structured phase/code/message, semantic Home attributes, equal
  555-second initial/clarification deadlines, and transient brief/answer
  preservation are pinned. Hostile sentinels do not enter journey state. The
  intermediate 76-pass/17-fail run was solely a stale adapters `dist` export,
  not a contract failure. No provider or service is used.
- The adjacent diagnosis-truthfulness slice completes strict RED/GREEN. The
  focused Graph test first received the old false claim that every preview
  start failure is environmental, then passes with a bounded neutral summary:
  the diagnosis does not determine the cause. The stable runtime code,
  category, `/metadata` path, and null Draft Diff are unchanged. Full Graph
  verification is 217/217 with typecheck and build green; scoped formatting and
  diff checks pass. No provider or service was used.
- Spark scoped re-review finds no P0/P1/P2 in the two-file diagnosis slice. It
  confirms all four preview-start lifecycle codes share the exact neutral
  summary while stable category, code, path, and null-Diff behavior remain
  pinned; adjacent timeout, migration, health, unreachable, crash, attributable,
  and default mappings are unchanged.
- The scoped requirement observer RED collects 22 local cases, passes the seven
  inherited fixtures, and fails first on the intentionally absent
  `waitForRequirementOutcome`; serial execution leaves the later new cases
  unrun. GREEN then passes 20 local fixtures with the two guarded real-model
  journeys skipped, and the normal inventory remains exactly Prompt A and
  Prompt B with one 1,800-second cap each. A separate adapter RED/GREEN also
  pins abort-before-parse, bringing the focused interpreter file to 35/35.
  Controller contract inspection blocks broad handoff on bounded corrections:
  downstream journey codes and fixed local UI messages must use the exact Sol
  frozen vocabulary, the separate review/planning observer must not inherit the
  570-second requirement-only deadline, and adversarial privacy evidence must
  cover every frozen hostile-input class and console surface. No provider,
  service, or Compose run is authorized while these corrections remain active.
- The controller corrections complete under focused RED/GREEN. The initial
  Workbench correction RED fails 13 assertions across 81 cases; the route RED
  fails 1 of 15 when a hostile runtime interpreter code escapes with no valid
  status; and the E2E RED rejects the frozen `product.planning_timeout` code and
  initially lacks its dedicated plan bound. GREEN passes the six-file
  Workbench focus 102/102, the expanded adapter adversarial matrix 36/36, and
  22 local Playwright fixtures with both guarded journeys skipped. The
  requirement observer retains 570 seconds, the separate plan observer uses
  the 1,800-second product cap, fixed messages and `journey.*`/`product.*`
  codes match the Sol contract, an unknown HTTP 400 collapses to
  `product.failed`, and only the five approved `composition.*` rejections are
  retained. The privacy matrix covers hostile transient inputs and abort/cause
  material plus log, info, warn, error, debug, and trace consoles without
  exposing the sentinel. Broad provider-free writer verification is now in
  progress; live provider and service execution remain unauthorized.
- The Sol integration writer hands off the interpretation repair. A final
  strict-success RED fails 1 of 10 because a valid interpretation with an
  extra nested key is accepted; exact nested interpretation keys plus
  authoritative validation make the route/contract/hook focus 58/58. Final
  writer evidence is adapters 71/71 and Workbench 302/302 with both packages'
  typecheck, build, and lint gates green; the local browser suite passes 22
  with two guarded skips, and normal collection is exactly the two canonical
  journeys. The controller-owned clean harness now contains all 98 tracked
  changes and all 58 present untracked files, with only four declared
  output-only screenshots absent; Bash syntax, the manifest comparison, and
  scoped diff hygiene pass. Its paired wall clock is 3,660 seconds, preserving
  1,800 seconds per product plus one bounded cleanup minute. The writer started
  no provider, service, Compose, persistence, dependency, catalog, commit,
  push, or deployment action. Task 0 is `ready_for_qa` for an independent Sol
  task review and Terra evidence gate; no live provider run is authorized
  until both accept this exact shared tree.
- Independent Sol task review approves the repaired contract with no P0/P1.
  Fresh review evidence passes adapters 71/71, Workbench 302/302, 22 local
  browser fixtures with two guarded skips, both affected typechecks, scoped
  formatting, Bash syntax, and diff hygiene. It defers two non-blocking P2
  hygiene items: the pinned OpenAI SDK dependency chain emits Node's
  `punycode` deprecation warning, and inherited Workbench shell tests retain
  React `act` warnings plus expected stubbed-control-plane DNS noise.
- Terra QA independently reports no P0/P1 and recommends exactly one frozen
  paired harness attempt. Its fresh evidence passes adapters 71/71,
  Workbench 302/302, Graph 217/217, all affected type/build/lint gates except
  the known unchanged Graph-wide formatting failures, 22 local browser
  fixtures, a 3x observer repeat, exact two-journey discovery, manifest and
  format/Bash/TOML/diff checks, the six resource-guard cases, and live zero
  Task 0 preview labels/directories. One 50 ms local observer fixture times out
  once only under concurrent load and then passes standalone plus the 3x
  repeat; this test-only load sensitivity is a deferred P2. The controller
  separately reruns the Workbench production build through every Next phase
  and records explicit exit 0. Task 0 is `reviewed`; only the single paired
  clean harness authorized by these gates may run next.
- The authorized paired clean harness uses scratch root
  `C:\Users\15492\AppData\Local\Temp\archeform-t0-paired-662794fd8aa940ac98e5a2356e70f1ed`
  and isolated project `factory-t9-20260811012133-199186`. Three invocation
  preflights fail before any install, service, or provider work while the
  controller corrects the required scratch argument and selects the explicit
  Git-Bash executable instead of WSL Bash; the one encoded workspace scratch
  directory created by the first Windows-path form is resolved exactly,
  removed, and confirmed absent. The valid harness then passes the frozen
  install, Prisma generation, manifest formatting and resource guard, all
  16 typecheck tasks, all 16 test tasks, all 10 builds, image builds, and the
  five-service isolated health gate. Prompt A proceeds through requirement,
  planning, publication, and compilation but its isolated verification fails
  with the bounded code `runtime.preview_start_failed`; Prompt B does not run.
  No raw prompt, response, service log, screenshot, trace, or generated product
  artifact is inspected or reported. Fail-closed cleanup removes all five
  containers, both volumes, and the network; independent guard and exact-label
  checks confirm 0/0/0 resources and all four candidate preview directories
  absent. Task 0 returns to `implementing` for provider-free hard diagnosis and
  bounded TDD repair before any further live authorization.
- The first provider-free capability probe finds that the exact isolated worker
  image is Alpine 3.24.1 with Docker Compose 5.1.4 and no discoverable Buildx
  plugin. Before the proposed image repair lands, a decisive actual-image,
  Docker-socket, named-volume topology smoke runs the same absolute compose
  file/project-directory shape against a network-free `FROM scratch` build.
  Compose emits its bounded missing-Buildx warning, falls back to the classic
  builder, and completes the build successfully. The controller stops the
  proposed writer before any file changes, removes only the exact smoke image
  and volume, and confirms 0 containers, networks, volumes, and images remain.
  Missing Buildx is therefore a hardening gap, not the demonstrated preview
  failure. No removed product artifact, prompt/response material, service log,
  or provider state is inspected. Task 0 remains `implementing`; provider-free
  diagnosis must continue and no model-backed rerun is authorized.
- Two deeper provider-free actual-image probes then exercise the complete
  preview runner through the Docker socket, host network, named artifact
  volume, generated three-image build, PostgreSQL migration, dynamic port
  discovery, bounded web readiness, and stop cleanup. The first compiles the
  deterministic Expense profile; the second uses the fixture requirement
  interpreter, plan, and product composition path for the exact Prompt A brief.
  Both builds, migrations, starts, and stops succeed. Each observes at least one
  transient web-readiness attempt before succeeding inside the existing
  30-second bound. Exact project containers, networks, named volumes, generated
  image tags, and controller-created scratch directories are removed and
  independently confirmed absent after each probe. These results exclude the
  worker/Docker topology and frozen provider-free Prompt A composition as the
  deterministic cause. The discarded live cause remains recoverable only as a
  safe startup phase on a new isolated run; raw stderr, generated product data,
  and provider material remain intentionally unavailable. A reviewed bounded
  phase-code repair is required before any further model-backed attempt.
- The Sol technology gate keeps the Golden profile and freezes one serialized,
  additive diagnostic repair. Worker startup emits fixed code-only boundaries
  for artifact verification/materialization, Compose build/start/bootstrap,
  loopback port discovery, the existing operation timeout, cancellation, and
  exhausted web readiness; generic and legacy health codes remain readable.
  Graph maps them to exact `runtime.preview_*` diagnoses with fixed summaries,
  `/metadata`, and no Draft Diff. Workbench and the Golden Path use one exact
  allowlist so unknown or hostile safe-shaped strings collapse to
  `verification.failed`; adjacent text never survives. Cleanup semantics,
  immutable Compilation, time budgets, generated templates, images,
  dependencies, topology, persistence, and the technology catalog do not
  change. One Sol integration writer owns the worker, Graph, Workbench, E2E,
  and manifest slice under TDD, followed by independent Sol review and Terra
  QA. Only after those gates may one paired clean harness run; a new
  stage-specific failure then permits one provider-free repair cycle and one
  final paired run, while repetition of the same code or a surviving P0/P1
  breaches the repair cap.
- The serialized integration writer records focused RED before production
  changes. Compiler-worker stage/lifecycle coverage fails 23 of 66 because
  known boundaries still collapse to the generic/legacy health codes; Graph
  diagnosis fails 7 of 41 because the new stage codes are unmapped and
  timeout, cancellation, and readiness still share the generic public code;
  Workbench fails 36 of 67 because the shared exact normalizer is absent and a
  merely safe-shaped unknown value still escapes. These are the expected
  missing-contract failures only. No provider, service, Docker, Compose, or
  product artifact is touched; GREEN implementation remains in progress.
- Worker, Graph, and Workbench focused GREEN reaches 66/66, 41/41, and 67/67.
  The first local Playwright collection then records an integration RED:
  importing the normalizer from `release-model.ts` pulls its timeline and
  `@factory/graph` ESM dependency through Playwright's CommonJS collection
  boundary, so tests cannot collect. The controller authorizes exactly one
  dependency-light shared module and test,
  `release-diagnosis.ts`/`release-diagnosis.test.ts`, plus their exact clean
  harness manifest entries. No other ownership expands; the writer must move
  only the allowlist/normalizer there and re-establish provider-free GREEN.
- Full compiler-worker verification passes 224/224 with typecheck, build, and
  lint; full Graph passes 221/221 with typecheck and build. Workbench reaches
  336/338, with only two stale `release-workspace.test.tsx` fixtures using the
  synthetic `binding.missing_identity_policy` value that Graph never emits;
  the actual diff-bearing diagnosis is `binding.denial_policy_not_bound`.
  The exact allowlist remains frozen. The controller authorizes only that test
  path and its manifest entry for fixture repair, with no production or
  contract expansion.
- The two newly created dependency-light diagnosis files are correctly listed
  in the harness `UNTRACKED_FILES` set, not `TRACKED_FILES`; existing release
  model and workspace fixtures remain tracked. This preserves clean-checkout
  patch reconstruction and exact untracked containment.
- A founder environment check confirms the ignored root `.env` exists but was
  missing both local infrastructure keys, and `.env.example` omitted them too.
  The controller generates two distinct 32-byte cryptographic random values,
  writes only the two local keys to the ignored `.env`, and verifies only their
  lengths, distinction, and ignore status without exposing either value. The
  frozen harness was not blocked by this omission: it already generates fresh
  run-scoped Redis and worker credentials in process memory and uses the root
  `.env` only as the provider source. Local manual Compose now has the required
  keys; per-run harness credential isolation remains unchanged.
- The Sol integration writer hands off the phase-code repair. Exact internal
  stage codes now cover artifact verification/materialization, Compose
  build/start/bootstrap, port discovery, timeout, cancellation, and readiness;
  timeout/cancel precedence, cleanup truth, generic fallback, and the legacy
  health alias remain intact. Graph exposes the frozen fixed runtime mappings,
  summaries, `/metadata`, and null Draft Diff. A dependency-light exact
  Workbench/E2E normalizer accepts only emitted diagnosis codes; safe-shaped
  unknown, hostile, and adjacent content collapses to `verification.failed`.
  Focused GREEN is compiler-worker 66/66, Graph 41/41, and Workbench 76/76;
  full GREEN is worker 224/224 with typecheck/build/lint, Graph 221/221 with
  typecheck/build, and Workbench 349/349 with typecheck/build/lint. Local
  Playwright passes 24 with two guarded journeys skipped, normal discovery is
  exactly two, and scoped formatting/Bash/diff gates pass. Graph-wide lint
  retains only two unchanged, out-of-scope historical files. No provider,
  service, Docker, Compose, commit, or push occurs in the writer gate.
- The local configuration documentation gap is closed without storing a
  secret: `.env.example` now has empty, documented Redis-password and internal
  worker-token placeholders, explicitly requires distinct local random values,
  and remains free of real values. The first manifest-scoped format attempt is
  RED because Prettier has no `.env.example` parser; the harness now gives that
  file a fixed exact-placeholder validation instead. GREEN passes both exact
  blank-placeholder checks, `docker compose ... config --quiet` against the
  ignored local `.env`, Git-Bash syntax, ledger formatting, and diff hygiene.
  Manifest containment is exact at 102/102 tracked and 60 present untracked of
  64 declared, with only four output-only screenshots absent and no outside,
  missing, or duplicate path. Task 0 is `ready_for_qa` for independent Sol task
  review and Terra evidence testing on this exact shared tree; another paired
  real-model harness remains unauthorized until both gates accept.
- Independent Sol review identifies one P1 in the new documentation gate: a
  blank placeholder plus a duplicate nonblank assignment would satisfy the
  original existence-only `grep`. The single permitted fix round changes the
  harness to require exactly one assignment and the exact empty value for each
  local credential key. The actual example passes; an adversarial duplicate
  nonblank fixture is rejected; Bash syntax remains green. No local value is
  read or exposed. Sol re-review and Terra QA remain in progress.
- Terra QA reproduces a Windows-only ignored `.next` cleanup race after
  successful Workbench compilation (`EPERM`/`ENOTEMPTY`) and correctly withholds
  authorization. The controller verifies no relevant Node process, moves only
  the exact ignored `apps/workbench/.next` directory to a verified temporary
  backup, and runs one clean sequential Workbench production build. All Next
  phases pass with explicit exit 0; the exact temporary backup is then removed
  and the new ignored build output remains. This is local generated-state
  isolation, not a source repair or clean-harness exception.
- Independent Sol re-review accepts the fixed slice with no P0/P1/P2. Fresh
  review evidence passes worker 224/224, Graph 221/221, Workbench 349/349,
  affected type/build/lint gates, the 24-case provider-free observer, exact
  two-journey discovery, hostile and unexpected fallbacks, cleanup semantics,
  placeholder adversarial cases, manifest comparison, and hygiene. Only the
  documented inherited Graph formatting debt and warning noise remain outside
  the reviewed slice.
- Terra QA independently reports no open P0/P1. It passes focused worker
  143/143, Graph 111/111, Workbench 87/87; the same three full suites; affected
  type/build/lint gates including the controller's clean sequential Workbench
  build; 24 local browser cases with two guarded skips; exact two-journey
  discovery; exact placeholder, manifest, Prettier/Bash/TOML/diff, Compose
  config, and six resource-guard checks; and live preview cleanup at 0/0/0/0.
  Task 0 is `reviewed`. Exactly one paired frozen harness is now authorized on
  this exact tree; no other provider or service run is authorized.
- The single authorized paired frozen harness uses scratch root
  `C:\Users\15492\AppData\Local\Temp\archeform-t0-paired-b58c4a8f45af43efa5f8e9140775f94c`.
  Its clean manifest reconstruction, frozen install, placeholder and resource
  guards, all 16 typecheck/test workspaces, all 10 builds, and the five-service
  isolated-stack health gate pass. Prompt A completes its guarded real-model
  journey. Prompt B reaches release but its Compilation terminalizes with the
  bounded code `compilation.failed`; material-difference, action-inventory, and
  evidence-copy gates therefore do not run and the attempt is not acceptance
  evidence. The guaranteed trap removes the exact five containers, network,
  and two volumes, and the independent fail-closed preview guard passes after
  cleanup. Task 0 returns to `implementing` for the one provider-free repair
  cycle permitted by the phase-code repair cap. No provider rerun is authorized
  until a deterministic RED/GREEN, independent Sol review, and Terra QA pass;
  repetition of `compilation.failed` or a surviving P0/P1 breaches the cap.
- Two independent provider-free Sol analyses identify a concrete valid-contract
  compiler gap with the same outer failure. `ProductBlueprintV1` accepts two
  distinct reference fields from one entity to the same target; the composer
  emits two relations with distinct scalar fields and the Application Graph is
  valid, but the database target derives Prisma relation/object/back-field
  names and SQL foreign-key constraint names only from the endpoint pair. The
  assembled database validator then rejects the duplicates with its fixed
  storage-validation error, and the queued worker correctly terminalizes that
  path as `compilation.failed`. The canonical repository Appointment fixture
  has only one Appointment-to-Service relation and still compiles to 47 files,
  explaining why the deterministic baseline stayed green. Exact attribution
  to the discarded live Graph remains an inference, not a claim.
- The controller freezes the one repair cycle to the database target and its
  focused compiler regressions. For field-distinguished duplicate endpoint
  relations only, a stable scalar-field-derived suffix must uniquely name the
  Prisma relation annotation, owner object field, target back field, and SQL
  foreign-key constraint; singleton endpoint pairs must retain exact output
  bytes and digests. The Graph contract, provider behavior, compilation failure
  wire, worker lifecycle, timeouts, and other generated targets do not change.
  A final live failure, including another generic `compilation.failed`, does
  not authorize another repair and breaches the Task 0 repair cap.
- The serialized Sol writer records RED before production changes. The focused
  compiler command selects the valid composed double-reference journey, exact
  repeated-endpoint database names, and the singleton-byte control: two tests
  fail at `assertUniqueDatabaseStorageNames` with the fixed generated-storage
  validation error, while the singleton output/digest control passes. No
  provider, service, Docker, Compose, or acceptance artifact is touched.
- The first bounded independent review rejects the initial GREEN on two P1
  edges inside the same frozen naming contract: a generated owner/back Prisma
  field can collide with a valid entity-declared field, and long valid scalar
  keys can produce distinct textual foreign-key identifiers that PostgreSQL
  truncates to the same 63-byte name. The sole fix round must record RED first,
  avoid the complete rendered-field namespace deterministically, and use a
  bounded collision-resistant suffix for database identifiers while retaining
  the exact singleton bytes. This does not expand Graph or lifecycle scope.
- Fix-round RED is recorded before the second production edit: both selected
  parity cases fail. The declared/generated collision produces eleven unique
  Appointment fields from twelve declarations, and both generated FK names
  violate the PostgreSQL 63-byte identifier bound. The writer is applying the
  one deterministic allocation/bounded-name fix; singleton controls remain
  unchanged.
- The Sol writer handoff completes the duplicate-endpoint repair within the
  four approved paths. The final allocator reserves declared, base, scalar,
  many-to-many, singleton, and previously assigned relation fields; a collision
  fallback uses a bounded SHA-256 suffix, duplicate FK names are at most 63
  bytes, and the singleton empty-suffix path retains its exact bytes. Focused
  contract cases pass 5/5, both changed compiler files pass 42/42, the full
  compiler suite passes 369/369, and typecheck/build, scoped Prettier, Bash
  syntax, diff checking, and manifest containment pass. Package-wide compiler
  lint still reports only unchanged `packages/compiler/src/restaurant-runtime.ts`;
  owned formatting is green. An independent bounded re-review closes both P1s
  with no open P0/P1. A P2 remains: the long-scalar regression bounds the hash
  suffix with short endpoints, so the explicit long-base truncation branch has
  no direct long-endpoint case. Task 0 is `ready_for_qa`; independent Sol task
  review and Terra QA are required before the final paired run.
- Independent Sol task review returns `TASK_REVIEW_PASS` with no P0/P1. Fresh
  evidence passes the changed files 42/42, full compiler 369/369, typecheck,
  build, scoped formatting, Bash syntax, manifest, and diff gates; the exact
  singleton digests and allocation reservations are intact. The unchanged
  package-wide `restaurant-runtime.ts` formatting debt remains outside scope.
  The direct long-endpoint truncation case remains a non-blocking P2 because
  Graph identifiers are ASCII and the implementation truncates only the base
  while retaining the complete unique suffix within the 63-byte budget.
- Terra QA independently reports no P0/P1 and authorizes exactly one final
  cap-bounded paired harness on this tree. Its evidence passes all 30 database
  parity cases including the five frozen relation contracts, compiler
  typecheck/build and selected broader regressions, owned formatting/Bash/diff,
  exact manifest containment at 103 tracked and 60 present untracked paths,
  all six resource-guard cases, and the live fail-closed guard. Task 0 is
  `reviewed`. Any terminal failure in the final paired harness breaches the
  repair cap and does not authorize another repair.
- The final cap-bounded paired harness uses scratch root
  `C:\Users\15492\AppData\Local\Temp\archeform-t0-final-7480c9a9e6124bd5a5d953303ef42275`.
  Clean reconstruction, frozen install, Prisma generation, formatting, the
  six resource-guard cases, all 16 typecheck tasks, all 16 test tasks including
  compiler 369/369, all ten production builds, image construction, and the
  five-service health gate pass. Prompt A completes its full guarded journey.
  Prompt B now passes the repaired compilation boundary, but isolated
  verification terminalizes with the new bounded phase code
  `runtime.preview_compose_up_failed`; material-difference, action-inventory,
  and evidence-copy gates do not run. The trap removes the exact five outer
  containers, network, and two volumes. Independent checks find outer
  containers/networks/volumes at 0/0/0, both preview directories absent, and
  the fail-closed preview guard green. No raw prompt, provider response, service
  log, screenshot, credential, or discarded artifact is inspected.
- This is a load-bearing P1 after the explicitly final paired run. The Task 0
  repair cap is exhausted: no further diagnosis repair, provider rerun,
  acceptance, commit/push, or Task 1 start is authorized in this Goal without
  new founder authority that explicitly reopens the cap. Task 0 returns to
  `implementing` only to record the blocked handoff; the controller stops.
- The founder explicitly reopens the Task 0 repair cap only for
  `runtime.preview_compose_up_failed`. This authority permits one bounded
  provider-free diagnosis and TDD repair round, one independent Sol review and
  Terra QA gate, and exactly one final real-model Prompt A/B acceptance run.
  It does not authorize Task 1, Restaurant feature expansion, or unrelated
  edits. The real-model credential may be read only from the ignored local
  `.env`; credentials and raw prompts or responses must never be logged,
  persisted, screenshotted, or reported. A green final acceptance authorizes
  the reviewed Task 0 commit and push. Any terminal final-run failure stops the
  controller without another repair or provider rerun.
- The reopened provider-free diagnosis reproduces the bounded failure with no
  failed-run artifact or log inspection. A deterministic double-reference
  Appointment bundle whose Service seed precedes Appointment passes the full
  Compose `up --build --detach --wait` boundary in the exact final-harness
  compiler-worker image. Changing only the seed order so Appointment precedes
  Service makes that boundary exit nonzero; running the same bundle's migrate
  service independently also exits nonzero. Exact isolated cleanup leaves
  containers, networks, and volumes at 0/0/0. The root cause is the database
  seed renderer: it binds relation scalars to target seed IDs but executes
  records in unvalidated provider/entity order. A second contract-valid defect
  in the same renderer indexes temporal fields by camel-cased entity key but
  looks them up by raw seed entity key, so a hyphenated booking entity can
  retain a Prisma-invalid date-only value. The single authorized repair round
  is frozen to stable seed-dependency ordering, deterministic cycle rejection,
  and consistent temporal entity-key lookup in the compiler database target
  and its focused parity tests only. Graph, Compose, API, Web, Restaurant, and
  lifecycle contracts remain out of scope.
- The single authorized compiler repair round is GREEN. Tests-first evidence
  records four intended failures for owner-before-target double and optional
  references, required dependency cycles, and a hyphenated temporal entity;
  the independent-order characterization already passed. The minimal database
  target change stably orders synthesized seeded-target dependencies, preserves
  target-first and unrelated input order, leaves missing optional targets
  unbound, rejects an unsatisfiable required cycle with one fixed safe error,
  and uses raw entity keys consistently for temporal normalization. Focused
  tests pass 6/6, database parity passes 35/35, the full compiler passes
  374/374, and typecheck, build, scoped Prettier, and diff checking pass. The
  exact owner-first double-reference runtime probe that previously failed now
  passes full Compose in the final-harness compiler-worker image; cleanup is
  again 0/0/0 and the fail-closed global preview guard passes. The temporary
  probe source and generated bundles are removed. Task 0 is `ready_for_qa` for
  exactly one independent Sol review and one Terra QA gate; no further repair
  is authorized before the final paired run.
- The one authorized Sol review and Terra QA gate reject the repair tree, so
  the final paired real-model harness is not authorized and was not started.
  Both independently reproduce a load-bearing P1 in the repaired seed path:
  a synthesized natural-key relation copies the target seed's raw temporal
  value after the target record has been normalized, producing a date-only
  owner foreign key beside the target's ISO instant and recreating a Prisma
  seed failure for a valid Graph. Terra also classifies optional-only bound
  dependency cycles as P1 because they are rejected with the fixed required-
  cycle error; Sol classifies that issue as P2 while confirming the same
  behavior. Fresh QA still passes focused 6/6, database parity 35/35, the full
  compiler suite, typecheck, build, formatting, diff checking, manifest
  containment, all six resource-guard tests, and the live exact-label guard;
  those broad greens do not cover or overrule the adversarial P1. The single
  founder-authorized diagnosis/fix round and the one review/QA gate are now
  consumed. No second repair, provider run, acceptance, commit/push, or Task 1
  start is authorized. Task 0 returns to `implementing` solely to record this
  blocked handoff and requires new founder authority to reopen the cap again.
- The founder reopens Task 0 within the existing Prisma seed, relation-key, and
  Compose-preview boundary for at most three consecutive repair rounds. Each
  round must run focused and regression tests followed by one Sol review and
  one Terra QA gate on the exact tree. The controller may automatically repair
  every directly related P0/P1 those gates demonstrate, but may not start Task
  1 or expand product behavior. After all gates are clean, exactly one final
  real-model Prompt A/B acceptance is authorized using only the ignored local
  `.env`; raw prompts, responses, credentials, and service logs remain
  prohibited. A green final acceptance authorizes the reviewed Task 0 commit
  and push. Round 1 begins from the confirmed temporal natural-key P1 and the
  optional-cycle P1 reported by Terra, with self-reference behavior included
  only as the same dependency-cycle boundary.
- Round 1/3 completes one tests-first repair in the same two compiler-owned
  files. RED records five intended failures: date and zone-less datetime
  natural-key owner values remained raw, a two-node optional cycle threw the
  required-cycle error, an optional self-reference remained bound, and a
  required self-reference was not rejected; the non-temporal natural-key
  characterization passed. The minimal GREEN normalizes synthesized natural-
  key values through the target field contract, retains exact non-temporal
  values and acyclic optional bindings, deterministically sheds the smallest
  stable optional blocking set (including optional self-links), and preserves
  the fixed rejection for required cycles. Explicit relationship values remain
  untouched. Focused tests pass 8/8, database parity passes 41/41, the full
  compiler passes 380/380, and typecheck, build, scoped Prettier, and diff
  checking pass. Task 0 is `ready_for_qa` for the required Round 1 Sol review
  and Terra QA gate; no provider or Compose run is authorized at this gate.
- Round 1 Terra QA passes with no concrete P0/P1: database parity 41/41, the
  full compiler suite, typecheck/build, scoped formatting/diff, six resource-
  guard tests, live exact-label guard, shell syntax, and exact harness
  containment at 103/103 tracked plus 60/64 present untracked paths all pass.
  The four absent untracked entries are output-only evidence paths. The Round 1
  Sol review nevertheless fails the gate with a provider-free P1: optional
  deadlock shedding is global rather than cycle-local. For an acyclic optional
  Appointment-to-Service binding entering an optional Service self-cycle, the
  source-index tie-break removes the valid Appointment binding and then the
  self-link, while removing only the self-link is sufficient. Round 2/3 is
  authorized solely to make shedding operate within the actually cyclic
  dependency component, preserve dependencies outside that component, and
  retain fixed rejection of required cycles. Task 0 returns to `implementing`;
  no provider or Compose run starts between rounds.
- Round 2/3 completes the cycle-local TDD repair in the same two compiler-owned
  files. The focused RED records exactly the acyclic inbound optional binding
  into an optional Service self-cycle being over-shed; three surrounding SCC,
  mixed-cycle, and required-cycle characterizations already pass. The minimal
  GREEN finds the stable sink cyclic dependency component and releases only
  optional bindings internal to it, preserving acyclic inbound, outbound,
  independent, and required edges. Repeated rendering remains deterministic
  and required-only cycles retain the fixed safe error. Focused tests pass
  8/8, database parity passes 44/44, the full compiler passes 383/383, and
  typecheck, build, scoped Prettier, and diff checks pass. Task 0 is
  `ready_for_qa` for the required Round 2 Sol review and Terra QA gate; no
  provider or Compose run is authorized at this gate.
- Round 2 Sol review and Terra QA both reject the final gate with one concrete
  P1 while finding no SCC-related P0/P1. A valid owner-first seed that explicitly
  supplies its required relationship scalar preserves the value but skips all
  dependency registration, so sequential Prisma upsert still inserts the owner
  before its target and can fail fresh Compose bootstrap. Round 2 evidence
  otherwise passes focused 8/8, SCC-focused 5/5, database parity 44/44, the
  full compiler suite, typecheck/build, formatting/diff, exact 103/103 tracked
  and 60/64 present-untracked manifest containment, Bash syntax, six resource-
  guard cases, the live exact-label guard, and five credential-boundary cases.
  Round 3/3 is authorized only to preserve each explicit non-null relation
  value while resolving its unique target seed by effective ID or normalized
  natural key, register a non-sheddable ordering dependency, reject unresolved
  or ambiguous values with a fixed safe error, and ensure explicit optional
  bindings are never removed by cycle release. Task 0 returns to `implementing`;
  this is the final permitted repair round.
- Round 3/3 writer handoff is complete. Focused RED produced nine intended
  failures with the optional-null characterization already passing. The repair
  preserves each explicit non-null relationship scalar while resolving exactly
  one target seed by effective ID or normalized natural key, registers a
  non-sheddable ordering dependency, and fails closed with the fixed database
  storage error for missing, ambiguous, required-null, or unorderable explicit
  bindings. Optional explicit null remains unbound, and synthesized optional
  SCC shedding remains cycle-local and deterministic. The existing Restaurant
  `menu-item.categoryKey -> menu-category` zero-match path still reaches its
  established specialized validator; ambiguous matches remain generic and
  fixed. Final writer evidence passes focused 16/16, database parity 55/55,
  full compiler 394/394 across 21 files, typecheck, build, scoped Prettier, and
  scoped diff-check. No provider, service, Docker, Compose, artifact, commit, or
  push action was taken. Task 0 is `ready_for_qa` for one independent Sol review
  and one Terra QA gate on this exact tree; the real-model harness remains
  unauthorized until both gates accept it.
- Round 3/3 Terra QA passes its provider-free matrix with no observed P0/P1:
  focused database parity 55/55, Round 1 adversarial 7/7, Round 2 SCC 4/4,
  Round 3 explicit relationships 11/11, Restaurant/determinism/temporal/
  foreign-key 10/10, fixed-diagnostic 7/7, full compiler 394/394, typecheck,
  build, scoped formatting/diff/Bash/TOML, resource guard 6/6, live exact-label
  cleanup, and exact 103/103 tracked plus 60/64 present-untracked manifest
  containment. The only package-lint failure is inherited formatting debt in
  `packages/compiler/src/restaurant-runtime.ts`.
- The independent Round 3/3 Sol gate rejects acceptance with two directly
  related P1s that its adversarial provider-free reproducers expose despite the
  green matrix. First, the new generic resolver accepts a Restaurant relation
  targeting the effective fallback ID of a seed without `seed.id`, but the
  later specialized Restaurant validator indexes only raw `seed.id` and rejects
  the valid graph. Second, an entity-declared `seed.values.id` can override the
  record ID at generated Prisma create time while relationship resolution still
  uses `seed.id` or its fallback; the owner then references a target ID that was
  never inserted. Both can prevent a fresh Prisma seed and Compose preview.
  The authorized three repair rounds are exhausted. Task 0 returns to
  `implementing` but is stopped pending a material founder decision; the final
  Prompt A/B real-model harness, acceptance, commit, and push are not authorized
  while either P1 remains.
- Founder direction `继续执行` reopens exactly one additional bounded repair
  round for those two P1s and resumes the blocked Goal. The round may only make
  generated Prisma seed identity consistent: Restaurant specialized validation
  must use the same effective seed ID as generic relation resolution, and an
  entity-declared `seed.values.id` must not override the factory-owned record ID
  used for dependency matching and Prisma upsert. It must start with focused
  failing tests, retain all Round 1-3 seed ordering/SCC/diagnostic/byte-stability
  controls, receive one independent Sol review and one Terra QA gate, and must
  not start the real-model harness until both gates accept the exact tree. Task
  1 and unrelated product work remain unauthorized.
- The extra seed-ID writer handoff is complete on exactly
  `packages/compiler/src/targets/database/target.ts` and
  `packages/compiler/test/database-target-parity.test.ts`. Focused RED produced
  four intended failures with one genuine-missing Restaurant control already
  passing: conflicting `values.id` was accepted, equal explicit and fallback
  IDs leaked into Prisma update, and a valid Restaurant fallback category was
  rejected. GREEN makes the effective envelope ID the sole factory-owned
  identity, treats `values.id` only as a redundant assertion, rejects mismatch
  with the fixed database-storage error, strips equal values before generated
  create/update, and uses effective positional IDs in the Restaurant specialized
  validator. Generated seed execution tests assert actual where/create/update
  payloads and owner foreign keys through an in-memory Prisma boundary. Final
  writer evidence passes focused 5/5, database parity 60/60 including frozen
  bytes/digests and all Round 1-3 controls, full compiler 399/399 across 21
  files, typecheck, build, scoped Prettier, and scoped diff-check. No provider,
  service, Docker, Compose, artifact, commit, or push action was taken. Task 0
  is `ready_for_qa`; the real-model harness remains unauthorized until one
  independent Sol review and one Terra QA gate accept this exact tree.
- The independent Sol re-review passes both seed-ID findings as addressed and
  reports no new directly related P0/P1. Fresh review evidence passes the exact
  five regressions, database parity 60/60, full compiler 399/399, typecheck,
  build, scoped Prettier, and scoped diff-check. Terra QA independently passes
  the same behaviors plus manifest containment, Bash/TOML hygiene, six resource
  guard cases, and the live exact-label guard. Its initial package-lint P1 label
  is corrected to P2/nonblocking inherited formatter debt because
  `packages/compiler/src/restaurant-runtime.ts` is unchanged from HEAD, absent
  from the clean-harness manifest, and the frozen harness intentionally runs
  manifest-scoped rather than package-wide Prettier. Both gates authorize
  exactly one final paired Prompt A/B frozen clean-harness run on this exact
  tree. No additional repair, provider rerun, or Task 1 work is authorized if
  that single run fails.
- The one authorized paired frozen clean-harness run consumed its real-model
  allowance on the accepted seed-ID tree. All clean-checkout install, scoped
  format, typecheck, test, build, isolated-stack health, Prompt A, Prompt B,
  and material-difference gates passed; Playwright completed both guarded
  journeys in 16.3 minutes. The subsequent provider-free action inventory
  failed only because Puck's truthful disabled `undo` history boundary was not
  documented by the inventory allowlist. Puck 0.22.3 also exposes the paired
  `redo` boundary, disabled when no future history exists. This is an ordinary
  acceptance-documentation gap, not a product, provider, Graph, seed, Prisma,
  relation, compilation, or preview-runtime failure. The failed-run trap and
  an independent live guard prove zero remaining project containers, networks,
  volumes, or preview resources. Task 0 is reopened to `implementing` only for
  a provider-free TDD correction in `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`, followed by one scoped Sol
  review, one scoped Terra QA gate, and completion of the remaining read-only
  action-inventory/evidence/cleanup gates from the preserved successful run.
  The real-model allowance is exhausted: no prompt may be submitted again.
  Product code, the frozen harness, Task 1, and unrelated scope remain closed.
- The provider-free action-inventory writer handoff is complete on exactly
  `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`. Focused RED rejected the
  previously undocumented disabled `undo` boundary. GREEN adds a local
  `undo`/`redo` boundary fixture, retains the negative undocumented icon and
  PageTree boundary fixtures, admits only exact lowercase `undo|redo` in the
  anchored allowlist, and documents the two Puck 0.22.3 local-history gates.
  The four focused fixtures pass; scoped Prettier and diff checks pass. No
  product code, service, Docker, Compose, provider, harness, evidence, or Task
  1 action was taken. Task 0 is `ready_for_qa` for one scoped Sol review and
  one scoped Terra QA gate; the live read-only action inventory remains the
  controller's final provider-free runtime check.
- Independent scoped Sol review and Terra QA both accept the Puck history-gate
  correction with no P0/P1/P2. Fresh evidence passes the four focused fixtures;
  Terra's adversarial matrix additionally rejects uppercase, adjacent,
  malicious, and unrelated disabled controls while retaining exact lowercase
  `undo|redo`, PageTree, and broken-label behavior. Scoped formatting, diff,
  preview-resource unit, and live preview-resource guards pass. The live
  read-only action inventory is authorized once the isolated stack is restored.
- Before restoring that stack, the controller checked the successful paired
  run's preserved clean-checkout evidence manifest. Twenty-four of twenty-six
  required screenshots exist; only
  `prompt-a-theme-dark-{1440x900,1024x768}.png` are absent. Static tracing shows
  that `interpretBrief` receives the canonical slug `prompt-a`, while the
  retained-theme helper is guarded by the unreachable value
  `expense-approval`. Therefore the theme behavior and evidence capture were
  skipped even though both model journeys passed. Task 0 remains
  `implementing` for one provider-free acceptance-code correction owned only
  by `e2e/golden-path.spec.ts`: start with a focused RED for the canonical
  Prompt A slug, retain normal discovery as exactly the two guarded journeys,
  add a bounded theme-evidence-only path that cannot submit a requirement, and
  regenerate only the two missing theme screenshots against the restored
  isolated stack. Existing 24 screenshots and both successful model outcomes
  remain authoritative. No provider rerun, product-code change, new prompt,
  harness change, or Task 1 action is authorized.
- The theme-evidence writer handoff is complete on only
  `e2e/golden-path.spec.ts`. RED proved the canonical `prompt-a` slug did not
  own theme evidence and the strict theme-only inventory did not exist. GREEN
  introduces a small predicate that accepts only `prompt-a`, uses it in the
  normal journey, and adds strict
  `FACTORY_E2E_THEME_EVIDENCE_ONLY=1` discovery containing exactly one bounded
  test. That test opens the blank composer, asserts it remains blank, performs
  the existing light-to-dark persistence proof, writes only the two expected
  theme images, and counts zero interpretation POSTs. Normal discovery remains
  exactly Prompt A and Prompt B; a non-exact flag falls back to normal mode.
  Fresh provider-free evidence passes the predicate test, 25 observer fixtures
  with both guarded journeys skipped, normal/theme/non-exact inventories,
  scoped Prettier, and diff check. No service, Docker, Compose, provider, model,
  prompt, product-code, harness, evidence, or Task 1 action was taken. Task 0
  is `ready_for_qa` for one scoped Sol review and one scoped Terra QA gate
  before the controller restores the isolated stack.
- Independent scoped Sol review and Terra QA accept the theme-only repair with
  no P0/P1/P2. Fresh evidence passes the canonical predicate, 25 provider-free
  observer fixtures with the two model journeys skipped, the four action
  inventory fixtures, six preview-resource guard cases, scoped formatting and
  diff checks, exact normal/theme discovery, and adversarial flag values. Both
  gates confirm that theme-only mode is isolation-gated, keeps the composer
  blank, cannot fill/click/submit interpretation, records zero interpretation
  POSTs, and can write only the two named dark-theme images. They authorize the
  controller to restore a fresh isolated stack from the preserved successful
  clean checkout, run exactly the theme-only evidence test and live read-only
  action inventory, validate/copy the 26 expected screenshots, and prove exact
  cleanup. Provider/model submission remains forbidden.
- The first live theme-only check failed provider-free before screenshot
  capture because the Workbench truthfully opens its read-only Inspector by
  default; the overlay intercepted the utility-bar theme click. The failure
  proves the acceptance helper omitted a required normal user interaction, not
  a product defect. The 180-second timeout triggered the cleanup trap, which
  removed the isolated project with zero remaining containers, networks, or
  volumes; the composer stayed blank and no interpretation POST/provider call
  occurred. Task 0 returns to `implementing` for one focused fix in only
  `e2e/golden-path.spec.ts`: close the visible Inspector through its accessible
  `Close inspector` control before each pre- and post-reload theme toggle, pin
  that behavior with a provider-free local fixture, then repeat the exact
  theme-only and action-inventory runtime checks after scoped Sol/Terra gates.
  Force-clicking, hiding the overlay, modifying product code, submitting a
  prompt, rerunning either model journey, or widening scope remains forbidden.
- The Inspector-interaction writer handoff is complete on only
  `e2e/golden-path.spec.ts`. Focused RED proved the missing close helper;
  GREEN closes a visible Inspector through the exact accessible
  `Close inspector` button and asserts it hidden before both the initial dark
  toggle and the post-reload light toggle. A local blocking-overlay fixture
  pins that interaction. Fresh provider-free evidence passes the focused
  fixture, all 26 observer fixtures with two guarded model journeys skipped,
  exact normal/theme discovery, scoped Prettier, and diff check. Blank-composer
  and zero interpretation POST assertions remain unchanged. No service,
  Docker, Compose, provider, model, prompt, artifact, product-code, harness,
  documentation, commit, push, or Task 1 action was taken. Task 0 is
  `ready_for_qa` for one final scoped Sol review and Terra QA gate before the
  provider-free live retry.
- The final scoped Sol review and Terra QA gate accept the accessible
  Inspector-close repair with no P0/P1/P2. Fresh evidence passes the blocking
  and absent-Inspector behaviors, all 26 local observer fixtures with two
  guarded model journeys skipped, four action-inventory fixtures, six resource
  guard cases, exact normal/theme discovery, adversarial flag fallback,
  scoped formatting/diff, and harness shell syntax. Both gates authorize one
  provider-free live theme-only and read-only action-inventory retry on a new
  isolated stack; prompt/provider submission remains prohibited.
- The authorized provider-free retry proves the theme-only gate GREEN in 6.2
  seconds, including both dark-theme screenshots, blank composer, persistence,
  and zero interpretation POSTs. The action inventory then passes its four
  local fixtures and fails only on Puck's truthful disabled active-viewport
  selector `Switch to Large viewport`. Cleanup again proves zero isolated
  containers, networks, and volumes; no provider/model call occurred. Static
  exhaustive inspection of installed Puck 0.22.3 shows the remaining visible
  disabled chrome boundaries are exactly the active `Small|Medium|Large`
  viewport selector and `Zoom viewport in|out` at the corresponding zoom
  bound, in addition to already documented undo/redo. Task 0 remains
  `implementing` for one final provider-free inventory correction in only
  `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`: add positive fixtures for
  this exact finite label set, retain adversarial rejection, update the
  anchored allowlist and documentation, then run scoped review/QA followed by
  the live action inventory only. Theme evidence must not be regenerated and
  model journeys/provider submission/product code/harness/Task 1 remain closed.
- The final Puck viewport/zoom inventory handoff is complete on exactly
  `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`. RED failed on the first new
  exact label while five controls passed. GREEN covers all five finite labels,
  retains exact anchoring and case sensitivity, and rejects adjacent,
  case-changed, malicious, and unrelated icon controls. The documentation now
  records Puck 0.22.3's active viewport and zoom-bound gates. Fresh focused
  evidence passes 6/6, scoped Prettier, and diff check. An independent Sol task
  review reports no P0/P1/P2 and approves the bounded change. No service,
  Docker, Compose, provider, model, prompt, product-code, harness, evidence,
  commit, push, or Task 1 action was taken. Task 0 is `ready_for_qa` for one
  final Terra gate before the live action-inventory-only run.
- Terra QA rejects the viewport/zoom gate with one concrete P1 missed by the
  writer and scoped Sol review: installed Puck 0.22.3's default viewport list
  also contains `Full-width`; PageStudio supplies no override, and selecting
  it makes the derived `Switch to Full-width viewport` action disabled. The
  current exact allowlist and positive fixture reject that reachable state.
  Task 0 returns to `implementing` on the same two files only to add this sixth
  exact finite label to tests, anchored allowlist, and documentation, then
  repeat scoped review/QA. Live services, theme capture, product code,
  provider/model calls, harness changes, and Task 1 remain unauthorized.
- The Full-width fix-round handoff is complete on the same two files. Focused
  RED fails exactly on `Switch to Full-width viewport`; GREEN passes all six
  fixtures, keeps adjacent/case/malicious and unrelated-icon rejection, and
  enumerates Small, Medium, Large, and Full-width exactly in both the anchored
  allowlist and Puck 0.22.3 documentation. Scoped Prettier and diff checks pass.
  No live/service/provider/model/theme/evidence/product/harness/Task 1 action
  was taken. Task 0 is `ready_for_qa` for a fresh scoped Sol re-review and
  Terra QA before the live action-inventory-only run.
- Fresh independent Sol re-review and Terra QA accept the complete Puck
  viewport/zoom inventory with no P0/P1/P2. Evidence passes all six local
  fixtures and finite-set/near-miss checks, installed Puck 0.22.3 source
  parity, PageStudio no-override proof, scoped formatting/diff, six resource
  guard cases, live read-only resource guard, and manifest containment. Terra
  authorizes exactly one live invocation of only the final read-only Workbench
  sweep on a fresh isolated stack. Theme capture, Golden Path, lifecycle
  mutation, prompt/provider/model submission, and other E2E specs remain
  forbidden.
- The authorized isolated provider-free action-inventory-only sweep failed on
  the Domain surface at the truthful disabled button `Zoom In`. Both guarded
  real-model Prompt A and Prompt B journeys already passed and must never be
  rerun. Cleanup for exact project
  `factory-t9-recovery-20260811172420-252137` proves zero containers, zero
  networks, and zero volumes; no provider call occurred. Task 0 returns to
  `implementing` for one exhaustive disabled-control inventory repair limited
  to exactly `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`. The repair must begin with a
  focused failing test, exhaustively enumerate the reachable truthful disabled
  controls in the action inventory while retaining fail-closed adversarial
  rejection, then receive exactly one independent Sol review and one Terra QA
  gate. If both gates pass, exactly one provider-free live
  action-inventory-only rerun is authorized. Theme capture, Golden Path, model
  journeys, prompt/provider submission, product code, harness changes, Task 1,
  and every other E2E spec remain forbidden.
- The exhaustive provider-free disabled-control inventory writer handoff is
  complete on exactly `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`. Initial RED was 8 failed and
  7 passed of 15; the WAI accessible-name precedence RED was 1/1; the
  schema-boundary and hidden-ancestor RED was 2/2; and the controller's Chromium
  standards RED was 1/1, proving an associated `<label for>` must override
  visible button content. Both inventory helpers now resolve names in exact
  `aria-labelledby` > `aria-label` > associated/native label > content order,
  with placeholder last where applicable, and use `offsetParent` for real
  visibility so hidden ancestors stay outside the sweep. The live sweep includes
  Home before every rail canvas and Release. Its anchored fail-closed inventory
  exhaustively enumerates the exact Workbench, Puck, React Flow, Page Studio,
  Code, and Release gate families while admitting only schema-bounded safe
  dynamic `Move`, `Choose`, and `Compile` labels. Final provider-free fixtures
  pass 20/20; scoped Prettier and tracked/untracked diff checks are clean. No
  service, Docker, Compose, provider, or model action occurred. Task 0 is
  `ready_for_qa` for exactly one independent Sol review followed by one Terra QA
  gate on this exact two-file repair before the single provider-free live
  action-inventory-only rerun; every previously frozen prohibition remains.
- The independent Sol gate returns `REVIEW_FAIL` with P0=0, P1=1, and P2=0.
  The `/u` dynamic-label regex quantifier counts Unicode code points, while Zod
  `.max(160)` uses JavaScript UTF-16 code units; labels containing 81 or 160
  astral letters are therefore schema-invalid but currently admitted. Task 0
  returns to `implementing` for one focused same-scope repair limited to exactly
  `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`. The frozen repair must capture
  each dynamic label for `Move`, `Choose`, and `Compile` and require explicit
  `.length <= 160`, with focused tests proving 80 astral letters accepted, 81
  rejected, ASCII 160 accepted, ASCII 161 rejected, and all existing negative
  cases preserved. The same Sol reviewer must recheck this fix; this is not a
  new review. Terra QA may run only if that recheck is clean. No live runtime,
  service, Docker, Compose, provider, or model action is authorized, and every
  previously frozen prohibition remains.
- The Unicode boundary fix writer handoff is complete on exactly
  `e2e/action-inventory.spec.ts` and
  `docs/acceptance/workbench-action-inventory.md`. Focused RED is 1/1: 81
  Deseret letters occupying 162 JavaScript UTF-16 code units were admitted.
  The implementation now separates the exact static gate pattern from anchored
  safe-character captures and applies explicit `dynamicLabel.length <= 160`
  checks to `Move`, `Choose`, and `Compile`. Tests accept 80 Deseret letters at
  160 code units and reject 81 at 162 units across all three families; ASCII
  160/161 boundaries and all existing adversarial negatives remain pinned. The
  full provider-free fixture suite passes 21/21; scoped Prettier and diff checks
  are clean. No service, Docker, Compose, provider, model, or other runtime
  action occurred. Task 0 is `ready_for_qa` only for the same Sol reviewer to
  recheck this fix. Terra QA remains gated until that recheck passes; every
  previously frozen prohibition remains.
- The same independent Sol reviewer recheck passes with P0/P1/P2=0/0/0 and
  closes the prior Unicode length P1. Fresh review evidence passes the focused
  astral-boundary case 1/1 and the full provider-free fixture suite 21/21;
  Prettier, diff, whitespace, and manifest checks are clean. All prior vendor,
  WAI accessible-name, and finite disabled-control inventory findings are
  closed. No service, Docker, Compose, provider, model, or other runtime action
  occurred. Task 0 remains `ready_for_qa` and authorizes exactly one Terra QA
  gate next. The live action-inventory sweep is not yet authorized, and every
  previously frozen runtime and provider prohibition remains.
- Final Terra QA passes with P0/P1/P2=0/0/0. Fresh evidence passes the complete
  provider-free fixture suite 21/21, resource-guard tests 6/6 plus the live
  read-only guard, Prettier, Bash syntax, whole-tree and scoped diff checks, and
  exact manifest containment at 103/103 tracked paths and 60 present of 64
  declared untracked paths. The source and vendor disabled-control audit is
  complete. After the stack is restored, Terra explicitly authorizes exactly
  one isolated provider-free live invocation:
  `e2e/action-inventory.spec.ts --grep "every visible workbench control"`. Task
  0 returns to `implementing` for this live run only. No other E2E spec, theme
  capture, Golden Path, model or provider submission, product mutation, or
  unrelated runtime action is authorized; every previously frozen prohibition
  remains.
- The single authorized isolated live action-inventory run passes. Exactly the
  two acceptance files were synchronized into the preserved clean checkout with
  SHA-256 equality. Preflight proved exact project containers/networks/volumes
  at 0/0/0 and all required ports free. The cached isolated five-service stack
  started with fresh volumes, an explicitly empty provider key, and no root
  `.env`; all five services became healthy. The only E2E command executed was:

  ```text
  pnpm exec playwright test e2e/action-inventory.spec.ts --grep 'every visible workbench control' --workers=1 --reporter=line
  ```

  Exactly one test passed in 6.3 seconds. No other E2E, theme, Golden Path,
  provider, or model action ran.
  The same-process `finally` teardown removed every service, volume, and the
  network; the preview guard passed and exact project containers/networks/
  volumes are 0/0/0. Exactly the 26 expected evidence PNGs were then validated
  and copied from the preserved clean checkout into the workspace with SHA-256
  equality. No focus extra was copied and no image content was inspected. Task
  0 is `ready_for_qa` pending fresh final verification and an independent Sol
  release review; it is not yet accepted, and every provider/model prohibition
  remains.

- Final independent Sol release review identifies one P1. The untracked
  `e2e/plan-compose-only.spec.ts` is unconditionally discovered by ordinary
  Playwright runs, can invoke the real provider up to five times, and has no
  isolation or explicit opt-in guard. Its eight `prompt-a-focus-*` PNGs are not
  named by the plan, ledger, acceptance record, or canonical 26-file evidence
  contract; the clean harness copies them in before execution rather than
  regenerating or validating them. They are undocumented auxiliary output, not
  retained bounded acceptance evidence. Task 0 returns to `implementing` for a
  final-release repair limited to exactly
  `scripts/t9d-clean-checkout-acceptance.sh`, deletion of the untracked
  `e2e/plan-compose-only.spec.ts`, and deletion of the eight untracked
  `docs/acceptance/evidence/prompt-a-focus-*.png` files. The harness manifest
  must remove those nine entries and continue to fail closed if any unlisted
  file reappears; the canonical 26 evidence files and already accepted live
  results remain unchanged. The removed files are recoverable from the
  preserved successful clean checkout. No product code, model/provider call,
  service, Docker, Compose, other evidence mutation, or Task 1 action is
  authorized.
- The bounded final-release P1 repair is complete. RED ordinary
  `pnpm exec playwright test --list` discovered the unconditional
  plan-compose-only focused test among 39 tests in 9 files. Before deletion,
  all nine targets were verified SHA-256-equal to, and recoverable from, the
  preserved successful clean checkout. The repair removed exactly
  `e2e/plan-compose-only.spec.ts`, the eight `prompt-a-focus-*.png` files, and
  their nine `UNTRACKED_FILES` manifest entries; no other path changed. GREEN
  ordinary discovery reports 38 tests in 8 files with unsafe focus count 0.
  Manifest containment is exact at 103/103 tracked and 55/55 untracked paths;
  the evidence directory contains exactly the canonical 26 PNGs and zero focus
  files. Ledger Prettier, harness `bash -n`, and `git diff --check` pass. No
  product, runtime, provider, service, or model change or invocation occurred,
  and the canonical successful 26 evidence files remain untouched. Task 0 is
  `ready_for_qa` pending final independent Sol and Terra rechecks on this exact
  repair; it is not yet accepted.
- Final independent Sol release review finds two open Task 0 P1s after the
  focus-spec cleanup. First, Graph and blueprint contracts accept a declared
  `id`, the database compiler silently replaces or drops it, and generic
  in-memory runtime/client inputs still accept and spread it. This diverges from
  Prisma behavior and permits duplicate or empty identity overwrite. Second,
  choose/apply composition lacks bounded abort and reconciliation, while the
  server appends the Draft and then updates Review status non-atomically and
  non-idempotently under response loss, crash, or concurrency, contrary to the
  Task 0 plan contract at lines 234-235. Review also records one P2: the
  material-difference script reads the latest mutable Draft while claiming to
  compare Published Graph hashes. Task 0 returns to `implementing`. No files,
  solution, or repair contract are frozen until the same reviewer delivers the
  consolidated adjacent audit. No founder decision, model/provider call,
  service, Docker, Compose, product mutation, or Task 1 action is authorized.
- The consolidated final review reports P0=0, P1=3, and P2=3. PM freezes one
  final provider-free Task 0 repair wave with three path-disjoint Sol owners;
  only the controller may update the clean-harness manifest or this ledger
  after reviewed writer handoffs.
  - **Contract A — identity parity.** Product Blueprint and Application Graph
    semantic boundaries must reject every entity-declared `id`; the database
    compiler must fail closed rather than silently replace or reinterpret it;
    and generated create/update inputs and forms must not accept a client `id`.
    Tests must cover optional, non-string, empty, and duplicate declarations
    plus in-memory/Prisma parity. Allowed paths are
    `packages/graph/src/model.ts`,
    `packages/graph/src/product-blueprint.ts`,
    `packages/graph/src/composition-shared.ts`, focused adjacent
    `packages/graph/test/**` identity tests, `packages/compiler/src/index.ts`,
    `packages/compiler/src/targets/database/target.ts`, and focused adjacent
    compiler runtime/parity tests under `packages/compiler/test/**`.
  - **Contract B — bounded atomic composition.** Decision and apply operations
    use an abortable 180-second operation plus one bounded
    retry/reconciliation. The choose server CAS makes the same choice
    idempotent and a different choice conflicting. Apply uses one Serializable
    atomic Draft-plus-Review CAS with bounded `P2034` retry and reconstructs an
    already-applied result from base revision + 1. Tests cover concurrent same
    and different choice, concurrent apply, response loss/crash windows,
    aborts, and timeouts. Allowed paths are
    `apps/control-plane/src/composition/product-composition.service.ts`, focused
    adjacent Control Plane composition tests,
    `apps/workbench/lib/control-plane-client.ts` and its tests, and
    `apps/workbench/lib/product-journey/use-product-journey.ts` and its tests.
    No schema change is authorized; a writer that proves one unavoidable must
    stop and return to PM before editing it.
  - **Contract C — compilation completion truth.** Worker execution failure is
    distinct from success-delivery failure. Successful artifact execution uses
    at most three bounded idempotent completion-delivery attempts, never calls
    the failure endpoint afterward, and on exhaustion throws one fixed
    non-disclosing completion-report error. Allowed paths are
    `apps/compiler-worker/src/queued-compilation.ts`,
    `apps/compiler-worker/src/control-plane-reporter.ts`, and their focused
    adjacent tests. Control Plane lifecycle tests may be changed only for
    characterization if needed; Contract C does not authorize Control Plane
    production changes.
- The three review P2s—enqueue compensation, mutable-Draft material-difference
  sourcing, and reference-key normalization collision—are deferred and remain
  recorded. PM does not treat the material-difference P2 as a Task 0 blocker:
  the guarded E2E independently compares actual Published Graph hashes, and the
  successful paired run performed no post-Publish Draft mutation. The
  standalone script is therefore non-authoritative for immutable-source proof
  until repaired. Task 0 remains `implementing`. No real-model/provider call,
  service, Docker, Compose, cloud, commit/push, or Task 1 action is authorized
  during this wave.
- The final A/B/C writer and review wave is complete.
  - **Contract A — identity parity:** Graph and Product Blueprint now enforce
    factory-owned identity. RED comprised seven Graph failures, three compiler
    failures, and forged-input/TOCTOU cases. GREEN passes Graph 228/228 and
    compiler 403/403 plus both packages' typecheck and build gates. Independent
    review initially found one TOCTOU P1; the fix uses one validated snapshot,
    and re-review passes with P0/P1/P2=0/0/0. The handoff stays within the frozen
    A paths and includes new
    `packages/compiler/test/factory-record-identity.test.ts`. Controller-only
    manifest reconciliation added `packages/graph/src/model.ts`, the affected
    `application-graph.test.ts`, and the new compiler identity test; containment
    is exact at 105 tracked and 56 untracked paths.
  - **Contract B — bounded atomic composition:** focused Control Plane 35/35
    and Workbench 73/73 pass; full Control Plane 240/240 and Workbench 354/354
    pass with affected typecheck and build gates. Independent task review passes
    with P0/P1=0. Its sole P2 is the absence of real PostgreSQL concurrency
    integration coverage for the transaction race behavior.
  - **Contract C — compilation completion truth:** RED recorded four expected
    failures. Final compiler-worker evidence passes 226/226 plus typecheck,
    build, and lint. Review's payload-identity P2 across all three delivery
    attempts was fixed with a focused test; re-review passes with
    P0/P1/P2=0/0/0.
- No model/provider, service, Docker, Compose, database-schema, or Control Plane
  lifecycle production action occurred. The previously deferred enqueue
  compensation, mutable-Draft material-difference, and reference-key
  normalization collision P2s remain recorded, joined by Contract B's missing
  real-PostgreSQL concurrency-integration P2. Task 0 is `ready_for_qa` pending
  independent Terra QA and final Sol release review on this exact tree; it is
  not yet accepted.
- Final release review confirms one additional provider-boundary P1. Contract A
  reserves the exact entity field key `id` at Product Blueprint and Application
  Graph semantic boundaries, but the requirement provider input schema, strict
  JSON schema, and instructions still allow it. A nondeterministic real-model
  proposal can therefore spend its bounded repair rounds on a now-forbidden
  field and terminalize `requirement.output_invalid`. Task 0 returns to
  `implementing` for one minimal adapter-first TDD repair limited to
  `packages/adapters/src/requirements/openai-interpreter.ts` and
  `packages/adapters/test/requirement-interpreter.test.ts`.
  `packages/graph/src/composition-shared.ts` is conditionally allowed only if
  the writer proves a dependency-free shared parser contract is strictly
  necessary; adapter-only narrowing is preferred, and the writer must stop
  before widening further. The repair requires focused RED/GREEN, independent
  Sol task review, and Terra QA. Only the controller may update the clean
  harness manifest or this ledger. One real-model acceptance cap has already
  been consumed; no real-model rerun, provider call, service, Docker, Compose,
  unrelated product change, commit/push, or Task 1 action is authorized.
- The provider-id boundary writer handoff and same Sol task re-review are
  complete on exactly
  `packages/adapters/src/requirements/openai-interpreter.ts` and
  `packages/adapters/test/requirement-interpreter.test.ts`; no shared Graph path
  was needed. RED covers initial and repeated declared `id` output 2/2 plus one
  lookaround-compatibility case 1/1. GREEN passes the interpreter focus 38/38,
  the full adapters suite 73/73, typecheck, build, lint, scoped Prettier, and
  diff checking. The final strict provider pattern is lookaround-free. The same
  independent Sol reviewer returns PASS with P0/P1/P2=0/0/0. Task 0 is
  `ready_for_qa` for Terra QA on this exact repair. The one real-model acceptance
  cap remains consumed; no model/provider rerun or other previously prohibited
  runtime action is authorized.
- Final provider-id Terra QA passes, and the final independent Sol release
  re-review returns code `ACCEPT` with P0=0, P1=0, and P2=4. The four retained
  P2s are enqueue compensation, mutable-Draft material-difference sourcing,
  reference-key normalization collision, and the absence of real PostgreSQL
  concurrency integration coverage for Contract B. Task 0 remains
  `ready_for_qa`, not accepted: commit/push and PM acceptance are on hold solely
  for a founder evidence decision because the consumed paired real-model run
  predates the provider-facing schema repair. The decision is frozen to exactly
  two options, and PM does not select either:
  1. **Option A:** the founder authorizes one additional paired final-tree
     real-model run.
  2. **Option B:** the founder explicitly accepts the prior paired live run plus
     final provider-free proof as an evidence deviation under the consumed
     one-run cap.
     No additional code work, model/provider execution, service, Docker, Compose,
     commit/push, PM acceptance, or Task 1 action is authorized before that founder
     decision.
- The founder selects **Option A** and explicitly authorizes exactly one
  additional final-tree paired real-model Prompt A/B clean-harness run against
  the current reviewed frozen tree and exact manifest boundary of 105 tracked
  and 56 untracked paths. The provider credential may be read only from the
  ignored local `.env`; no credential, raw prompt, or raw provider response may
  be persisted, copied, logged, screenshotted, or reported. The run must fail
  closed and prove cleanup of its exact containers, networks, volumes, preview
  resources, and artifact directories. This authorization permits no other
  provider call, focused model run, live rerun, product change, or scope
  expansion. Task 0 remains `ready_for_qa` with live acceptance in progress.
  Task 1 remains blocked until this run passes, fresh QA and independent release
  review accept the exact final tree and evidence, PM accepts Task 0, and the
  reviewed Task 0 commit and push complete.
- The single Option A final-tree acceptance passes from exact clean checkout
  `C:\Users\15492\AppData\Local\Temp\archeform-task0-final-e8dd0a0f0aa347f1a7cc627b41dc04d6\clean-checkout`.
  Frozen install, manifest-scoped formatting, and the resource guard pass;
  typecheck is 16/16, tests are 16/16 including Graph 228/228, compiler 403/403,
  Control Plane 240/240, Workbench 354/354, and compiler-worker 226/226, and
  builds are 10/10. The isolated Compose stack became healthy. Both guarded
  real-model Prompt A and Prompt B journeys pass 2/2 in 20.3 minutes, and
  material difference is verified across their Published Graphs. No raw prompt
  or provider response is recorded. The live action inventory passes 22/22;
  exactly 26 canonical evidence PNGs are regenerated and copied. Same-run
  cleanup leaves exact project containers/networks/volumes at 0/0/0 and the
  post-run preview-resource guard passes. Repository evidence is 26/26
  SHA-256-equal to the clean checkout with zero focus extras. Manifest
  containment remains exact at 105/105 tracked and 56/56 untracked paths. No
  credential, raw prompt, raw response, or other raw model material was output.
  Task 0 remains `ready_for_qa` for exactly one final Terra release QA followed
  by one independent Sol release review. No further provider call or live rerun
  is authorized, and Task 1 remains blocked through those gates, PM acceptance,
  and the reviewed Task 0 commit and push.
- Final Terra release QA passes, and the independent Sol release review returns
  `ACCEPT` with P0/P1/P2=0/0/4. The four previously recorded P2s remain deferred
  and nonblocking; no open P0/P1 remains. PM accepts Task 0 on the current tree.
  Current-tree evidence is the exact 105/105 tracked plus 56/56 untracked
  manifest, the accepted clean-harness results above, repository evidence
  26/26 hash-equal to the clean checkout, and cleanup at 0/0/0 with the
  post-run guard green. The controller is authorized to create and push the one
  reviewed Task 0 commit under `docs/delivery-policy.md`, then verify local HEAD
  equals the remote branch tip. This acceptance authorizes no additional
  provider/live run. D0 remains `implementing`, and Task 1 remains blocked until
  the Task 0 commit and push complete and D0 is reviewed.

## Task 1 — Freeze Product Intent and Application Graph v2

State: `planned`.

Owner: `integration`.

Allowed paths: `packages/graph/src/**`, `packages/graph/test/**`, and Graph
contract documentation assigned by PM.

Acceptance evidence:

- strict schemas exist for the six approved product interfaces,
  `ApplicationGraphV2`, and `DraftPreviewSnapshotV1`;
- `DraftPreviewSnapshotV1` immutably binds one Draft revision and checksum, is
  preview-only, expires or is disposed, and cannot be deployed, exported,
  promoted, or recorded as a Compilation;
- schema, semantic, hashing, Draft-preview lifecycle, and immutable V1-to-V2
  Draft upgrade tests pass;
- a V1 Published Revision is never changed or rehashed;
- production compilers accept only Published V1/V2 Graph inputs through an
  explicit version adapter.

Blocked by: Task 0 accepted and D0 reviewed.

## Task 2 — Compose one deterministic Restaurant Product Recipe

State: `planned`.

Owner: `backend` with `integration` review.

Allowed paths: `packages/capabilities/**`, restaurant fixtures assigned by PM,
and focused capability tests.

Acceptance evidence:

- one approved recipe selects the two surfaces, fifteen named screens, roles,
  capabilities, flows, seed scenarios, and journeys;
- it composes catalog, modifiers, pricing, cart, server totals, order,
  idempotency, inventory, audit, simulated payment, identity, and policy;
- restaurant table, availability, kitchen, fulfillment, and reporting semantics
  are present;
- repeated fixture composition produces the same Graph and hash.

Blocked by: Task 1 reviewed and contract frozen.

## Task 3 — Establish the UI Registry and shared source foundation

State: `planned`.

Owner: `frontend`.

Allowed paths: `packages/ui-primitives/**`, `packages/ui-patterns/**`,
`packages/workbench-ui/**`, `packages/generated-ui/**`,
`packages/screen-recipes/**`, `packages/experience-recipes/**`,
`packages/product-recipes/**`, their tests, and explicitly assigned workspace
package manifests.

Acceptance evidence:

- task hand-off records the searched template/registry inventory, reused keys
  and paths, parameterization, rejected candidates, and any functional gap that
  justified new source;
- pinned shadcn/ui Radix source and Lucide primitives retain provenance and
  license notices;
- generated business blocks cover customer, merchant, and state surfaces;
- each primitive, pattern, block, screen, experience, and product registry item
  owns version, source, license, schema, slots/nesting, bindings, complete UI
  states, responsive variants, token requirements, accessibility evidence,
  fixtures, interaction tests, and screenshots;
- fifteen validated screen recipes and one Restaurant Product Recipe assemble
  only registered keys and parameters;
- Fine Dining defines responsive, light/dark, customer, and merchant tokens;
- selected UI source can be copied into a standalone application;
- style-only differences use tokens/recipe parameters and duplicate detection
  rejects near-equivalent registry entries without distinct semantics;
- no Aceternity item enters production without per-item evidence.

Blocked by: Task 1 reviewed and contract frozen.

## Task 4 — Compile and run the customer mobile surface

State: `planned`.

Owner: `platform` with `frontend` package inputs.

Allowed paths: compiler targets, generated-project templates, customer-surface
fixtures, and focused compiler/runtime tests assigned by PM.

Acceptance evidence:

- generated production pages include Home, Menu, Dish Detail, Cart, Checkout,
  Orders, Order Detail, and Profile;
- customer journeys work against generated APIs;
- production artifacts accept only a Published Graph;
- the preview renderer accepts only `DraftPreviewSnapshotV1`, renders the same
  customer surface semantics, and emits no exportable/deployable artifact or
  Compilation record;
- migration, health, role journey, denial, idempotency, source, and cleanup
  checks pass.

Blocked by: Tasks 2 and 3 ready for QA.

## Task 5 — Compile and run the merchant desktop surface

State: `planned`.

Owner: `platform` with `frontend` package inputs.

Allowed paths: compiler targets, generated-project templates, merchant-surface
fixtures, and focused compiler/runtime tests assigned by PM.

Acceptance evidence:

- generated production pages include Dashboard, Menu Management, Orders,
  Kitchen Queue, Tables, Users/Roles, and Settings;
- merchant journeys share the customer surface's Graph data;
- production artifacts accept only a Published Graph;
- Draft Preview Snapshot rendering is semantically equivalent but remains
  ephemeral, non-exportable, non-deployable, and Compilation-free;
- role journeys, denials, audit, migration, health, idempotency, and cleanup
  pass.

Blocked by: Tasks 2 and 3 ready for QA.

## Task 6 — Rebuild the Workbench prompt-to-live journey

State: `planned`.

Owner: `frontend` with `control-plane` preview lifecycle support.

Allowed paths: `apps/workbench/**`, `packages/workbench-ui/**`, assigned
Control Plane preview endpoints/services, and their tests.

Acceptance evidence:

- `Apps -> Describe -> Building/Live Preview -> Edit -> Publish` is the primary
  route with no Graph configuration required;
- Workspace Home, Builder Workspace, and App Management are separate,
  progressively disclosed contexts;
- Workspace Home offers both `Describe a product` and `Start from a template`;
- the curated template path creates an independent editable Draft, retains
  template origin/version, transfers no secret/provider account, never receives
  automatic upstream changes, and reaches a Draft preview within 30 seconds;
- App Management exposes only implemented Overview, Data, Users, Workflows,
  Integrations, Security, Code, Logs, and Settings capabilities; no dead future
  navigation is present;
- every pre-Publish preview creates or selects an immutable Draft Preview
  Snapshot and shows its revision/checksum state;
- editing creates a new Draft and a new preview snapshot; it never mutates the
  snapshot already shown;
- Publish independently snapshots the current Draft as a Published Revision;
  no preview snapshot is promoted or exported;
- technical and evidence surfaces remain Advanced;
- the compact Workbench design system remains separate from Fine Dining.
- active Workbench identity and metadata use Archeform · 元象 while generated
  applications keep independent product branding;
- `globals.css`, `use-workbench-controller.ts`, and `control-plane-client.ts`
  are characterized and split by context/responsibility before new journey
  behavior accumulates in them;
- `globals.css` contains no more than 150 lines of imports/reset/root tokens;
  feature CSS, controllers, and clients meet the 300-line review target unless
  an approved single-responsibility exception is recorded;
- no active user-facing `Factory Pilot` remains outside an explicitly allowed
  historical, legal, package, or serialized protocol occurrence.

Blocked by: Task 1 reviewed; Tasks 2 and 3 expose stable fixtures and UI blocks;
Tasks 4 and 5 expose snapshot preview renderers.

## Task 7 — Make Page, Data, Users, Workflow, and Experience contextual editors

State: `planned`.

Owner: `frontend`.

Allowed paths: Workbench Page/Puck, Domain, Policy, Flow, Experience, selection
context, Draft operation, and adjacent test paths assigned by PM.

Acceptance evidence:

- selecting a page synchronizes Preview, Puck, bound Data, related Workflow,
  and source files;
- Puck round-trips complete multi-block page trees;
- Data and Users use business language; Prisma, SQL, and Casbin remain Advanced;
- Data, Users, Workflow, or Experience edits create a new Draft revision and
  require a new Draft Preview Snapshot before preview changes;
- no editor mutates Published Graphs or existing preview snapshots.

Blocked by: Tasks 2, 3, and 6 ready for QA.

## Task 8 — Add Source Mode, controlled overlays, ZIP, and Git export

State: `planned`.

Owner: `platform` with `frontend` integration.

Allowed paths: source manifest/export compiler targets, Workbench Code surface,
Git adapter, ZIP export, and their tests when assigned by PM.

Acceptance evidence:

- Code shows the complete generated file tree, origins, search, and diff;
- ZIP and Graph-first Git export share one manifest and checksums;
- only `src/extensions/**` and declared slots are writable;
- baseline digest and conflict state use `SourceOverlayV1`;
- Draft Preview Snapshot output is never visible as exportable source;
- credentials, raw model material, and private files are absent.

Blocked by: Tasks 1, 4, and 5 reviewed.

## Task 9 — Close the Restaurant Product with guarded real-model acceptance

State: `planned`.

Owner: `qa`, followed by independent `reviewer` and PM acceptance.

Allowed paths: acceptance tests, bounded evidence, acceptance record, and PM
ledger transitions. QA and reviewer do not change production code.

Acceptance evidence:

- one restaurant prompt requires at most one visible critical clarification and
  produces a runnable dual-surface product within 30 minutes;
- output contains the fifteen required named screens and multi-block page trees;
- pre-Publish preview binds an immutable Draft Preview Snapshot and cannot be
  exported or deployed;
- Publish creates a distinct immutable Published Revision; production compile
  consumes that revision only;
- customer and merchant journeys, editing/republication, accessibility, source,
  clean-checkout, and cleanup gates pass;
- the final guarded run uses an environment-only real model key;
- independent release review records no open P0/P1 finding before PM accepts.
- the accepted iteration is integrated into `main` without force, the exact
  main commit passes the release gate, `main` and the planned annotated release
  tag are pushed, and a GitHub Release is created when authenticated tooling is
  available without claiming cloud deployment.

Blocked by: Tasks 3–8 reviewed.

## Deferred work

The following remain outside this iteration until Task 9 is accepted:

- 100+ Profile expansion or broad capability-family intake;
- production payment processing;
- cloud deployment, application fleet, and managed operations;
- connector marketplace and unrestricted third-party runtime ingestion;
- unrestricted arbitrary source editing or reverse parsing;
- Figma or Stitch runtime integration;
- production activation of Aceternity candidates.
