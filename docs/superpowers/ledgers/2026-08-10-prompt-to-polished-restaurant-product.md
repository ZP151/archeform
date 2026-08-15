# PM Ledger — Archeform Prompt-to-Polished Restaurant Product

Goal authority:
`docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`.
Design authority:
`docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`.
Branch: `feat/governed-composition-capability-foundry`.

<!-- d0-authority-map:start -->

- `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`: the reset records founder decisions.
- `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`: the design owns the product contract.
- `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`: the plan owns execution order.
- `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`: the ledger alone owns live task state.
- `docs/research/2026-08-10-product-builder-ui-ecosystem.md`: the research owns external evidence.

Product approval does not approve a proposed technology decision. A design,
plan, or ADR proposal is not founder approval; the explicit governance gate in
`docs/tech-governance.md` remains required.

<!-- d0-authority-map:end -->

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
- Contract status: `frozen` for Task 1 implementation under founder-accepted
  ADR-0009. Task 1 implementation is not yet reviewed or accepted; downstream
  implementation against Graph v2 remains forbidden until Task 1 is accepted
  and pushed.
- Contract artifact:
  `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`.
- Exact Task 1 public signatures and the additive journey/binding gap closure:
  the frozen shared-contract checkpoint in the Task 1 section of this ledger.
- Governance decision artifact:
  `docs/adr/adr-0009-application-graph-v2-shared-contract.md` (`Accepted`,
  `keep` the current runtime profile and add the versioned V2 contract).

Any change to Graph v2/v3, `DraftPreviewSnapshotV1`/`V2`, lifecycle, compiler input,
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

After Task 1 is delivered, Task 2 and Task 3 are eligible to start together only
when PM proves their shared keys and bindings are fully satisfied by an accepted
contract. Task 2 owns business semantics and never changes UI registry source;
Task 3 owns UI source/registry and never changes Restaurant semantics. A missing
or conflicting shared key or binding stops the wave and returns to the contract
owner; it is not a reason for either line to widen its paths.

## D0 — Record the product reset and freeze scope

State: `accepted`.

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
- Independent Tech Lead review of D0 returns `FAIL` with
  P0/P1/P2=0/3/1. D0 remains `implementing`; Task 1 remains `planned` with its
  contract `proposed` and blocked. The implementation plan and product-design
  text do not constitute founder acceptance of a technology decision. No ADR
  currently records approval for the additive
  `factory.application-graph/v2` shared-data contract.
- Freeze one bounded, provider-free D0 governance repair under one Sol writer;
  the following paths are the complete writer boundary:
  - governance and decision authority: `AGENTS.md`, `.codex/README.md`,
    `.codex/agents/pm.toml`, `.codex/agents/tech_lead.toml`,
    `docs/tech-governance.md`, `docs/threat-model.md`, and
    `docs/adr/adr-0009-application-graph-v2-shared-contract.md`;
  - mutual authority links:
    `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`,
    `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`,
    `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`,
    and `docs/research/2026-08-10-product-builder-ui-ecosystem.md`;
  - copied-skill provenance: `.codex/README.md`,
    `THIRD_PARTY_NOTICES.md`, and
    `.agents/skills/UPSTREAM_PROVENANCE.md`;
  - state-driven recovery:
    `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`;
  - executable documentation-contract verification:
    `scripts/verify-d0-governance.mjs` and
    `scripts/verify-d0-governance.test.mjs`.
- The controller alone owns this ledger, any status reconciliation, manifest
  reconciliation if containment requires it, and the eventual reviewed commit
  and push. The writer must stop before changing any path outside the frozen
  list.
- Contract A must make technology governance executable: the Tech Lead and PM
  role instructions read an existing, current governance authority and threat
  model; `AGENTS.md` contains the exhaustive dispatch triggers for changes to
  runtime/framework/package or supported version, database/ORM/queue/provider
  or Compose topology, stable Graph/API/schema/identifier/serialization or
  compatibility contracts, security/credential/tenant/data boundaries,
  compiler targets/generated templates/deployment/operability, and every
  current-to-proposed Golden profile transition. The governance authority must
  distinguish the current accepted profile from a proposed profile and require
  a Tech Lead `keep`, `experiment`, `migrate`, or `reject` recommendation plus
  explicit founder acceptance before PM authorizes implementation. The threat
  model is the current authority for assets, trust boundaries, attacker
  capabilities, abuse cases, required controls, and residual-risk ownership;
  design or plan prose cannot silently supersede it. The Tech Lead must create
  only a **proposed** ADR at
  `docs/adr/adr-0009-application-graph-v2-shared-contract.md` for the additive
  `factory.application-graph/v2` contract, covering current V1, proposed V2,
  Published-V1 immutability, adapters, compatibility, migration, rollback,
  threats, and measurable verification, and then stop for an explicit founder
  accept/reject decision. D0 and Task 1 cannot pass that decision gate by
  inference.
- Contract B must give the reset, design, plan, ledger, and research documents
  consistent mutual links and one non-overlapping authority map: reset records
  founder decisions, design owns product contract, plan owns execution order,
  this ledger alone owns live state, and research owns external evidence. The
  writer updates the four assigned non-ledger documents; the controller makes
  the matching ledger link. No document may claim state authority or founder
  approval from another document's proposal.
- Contract C must make every direct-copy or pinned-source claim for local skills
  truthful. Each retained claim needs the upstream repository, full commit SHA,
  exact source path, license identity/source and retained-notice location, plus
  an honest local hash/divergence classification. If that evidence cannot be
  established, the direct-copy/pinned claim must be corrected or removed and
  the local adaptation described without inventing provenance.
- Contract D must replace task-name-specific startup with ledger-state-driven
  recovery: reconcile an in-flight review/accept/commit handoff first, otherwise
  select the earliest unblocked non-accepted task; skip every accepted task;
  never replay an already consumed provider, model, service, Docker, Compose,
  theme, Golden Path, action-inventory, or other live gate. A consumed live gate
  remains closed unless the ledger records a new explicit founder authorization
  with exact scope. On the current state the controller may complete the
  accepted Task 0 commit/push handoff and D0 repair; it may not rerun Task 0 or
  start Task 1.
- Verification is TDD and provider-free. First capture a focused RED from
  `node --test scripts/verify-d0-governance.test.mjs` against at least the
  missing/broken governance authority, cross-links, provenance, and recovery
  cases; then make that focused test and
  `node scripts/verify-d0-governance.mjs` GREEN. Also run scoped Prettier, TOML
  parsing, and `git diff --check`. No Task 1 implementation, product/runtime
  code, provider/model call, service, Docker, Compose, or live acceptance gate
  is authorized. After the writer handoff, require one independent Sol review
  with no open P0/P1, then one Terra QA pass. Founder acceptance of the proposed
  Graph V2 ADR remains a separate required stop. Only after review, QA, explicit
  founder decision, PM acceptance, and controller commit/push may D0 become
  `accepted` and Task 1 be considered for implementation.
- D0 task review returns **Spec ❌** and **Needs fixes** with
  P0/P1/P2=0/3/0. Fix round 1 records all three P1 findings:
  1. The required five-document authority map is incomplete: this ledger had no
     marker-delimited `d0-authority-map` block, while the verifier inspected only
     four documents, so the gate falsely passed without the sole live-state
     authority satisfying Contract B.
  2. A secondary authority contradicts live D0 state: `docs/tech-governance.md`
     says “D0 and Task 1 remain blocked” while this ledger says D0 is
     `implementing`. The repair must say D0 cannot be accepted and Task 1 cannot
     begin; it must not assign D0 the `blocked` state.
  3. The Golden-profile gate asserts prose rather than the tracked manifest
     authorities: the verifier regexes its own prose instead of comparing
     package ranges, lockfile resolutions, Dockerfile runtime tags, and Compose
     image majors, so real profile drift can pass.
     The PM-owned portion of fix round 1 adds the exact fifth authority-map block
     above and preserves this ledger as the only live-state authority. The Sol
     writer separately owns the frozen tech-governance wording and executable
     Golden-profile verification repairs; it must not edit this ledger. D0 remains
     `implementing`, and Task 1 remains `planned`, `proposed`, and blocked. No Task
     1 implementation, provider/model call, service, Docker, Compose, live-gate
     replay, acceptance, commit, or push is authorized by this checkpoint.
- D0 fix-round-1 writer evidence and the scoped Sol re-review are complete.
  TDD evidence is initial RED 0/3 with 81 reported violations, initial GREEN
  3/3, fix RED with 3 passing and 7 failing, and final GREEN 10/10. The direct
  CLI governance verifier passes; all 11 project TOML files parse; scoped
  Prettier, diff checking, and the frozen-scope audit pass. This ledger contains
  the fifth marker-delimited authority map, byte-identical to the reset, design,
  plan, and research blocks. The exact changed paths at review are:
  - `.agents/skills/UPSTREAM_PROVENANCE.md`;
  - `.codex/README.md`;
  - `.codex/agents/pm.toml`;
  - `.codex/agents/tech_lead.toml`;
  - `AGENTS.md`;
  - `THIRD_PARTY_NOTICES.md`;
  - `docs/adr/adr-0009-application-graph-v2-shared-contract.md`;
  - `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`;
  - `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`;
  - `docs/research/2026-08-10-product-builder-ui-ecosystem.md`;
  - `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`;
  - `docs/tech-governance.md`;
  - `docs/threat-model.md`;
  - `scripts/verify-d0-governance.mjs`;
  - `scripts/verify-d0-governance.test.mjs`.
- The scoped Sol re-review returns `PASS` with P0/P1/P2=0/0/0: all three prior
  P1s are closed and no new breakage is found. D0 advances to `ready_for_qa` for
  one independent Terra QA pass over exactly this provider-free documentation
  and governance slice. QA must re-run the 10/10 focused verifier tests, direct
  CLI verifier, five-block identity, 11-file TOML parsing, scoped Prettier,
  diff/whitespace check, and exact-path scope audit; it remains read-only. Task
  1 remains `planned`, its contract remains `proposed`, and it stays blocked.
  ADR-0009 remains `Proposed` and requires an explicit founder accept/reject
  decision before D0 acceptance or Task 1 implementation. No provider/model
  call, service, Docker, Compose, live-gate replay, Task 1 change, acceptance,
  commit, or push is authorized by this handoff.
- Independent Terra QA returns `FAIL` with P0/P1/P2=0/1/0. Fresh governance
  verifier tests pass 9/10: the blocked-state negative test emits its expected
  issue only when the ledger state is `implementing`. Once the legitimate PM
  transition set D0 to `ready_for_qa`, a mutation assigning “D0 and Task 1
  remain blocked” escaped that specific invariant and produced only generic
  missing-gate issues. D0 returns to `implementing`; Task 1 remains `planned`,
  its contract remains `proposed`, and it stays blocked. ADR-0009 remains
  `Proposed` pending explicit founder acceptance or rejection.
- Freeze D0 fix round 2 to exactly `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`; the writer may return its evidence
  report but may change no other path. The verifier must reject assigning D0 a
  `blocked` state independently of D0's current normal lifecycle state, without
  weakening the distinct Task 1 blocked gate. Capture a focused RED reproducing
  the escape with D0 at `ready_for_qa`, then GREEN the focused and full
  provider-free governance suite. Run the direct CLI verifier, scoped Prettier,
  diff/whitespace checking, and exact two-path scope audit. One scoped Sol
  re-review with no open P0/P1 is required before Terra QA restarts. No Task 1
  implementation, provider/model call, service, Docker, Compose, live gate,
  acceptance, commit, or push is authorized.
- D0 fix round 2 is complete on exactly `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. Focused RED is 10/11, reproducing the
  lifecycle-independent blocked-state escape; GREEN is 11/11. The direct CLI
  verifier, scoped Prettier, diff/whitespace check, and exact two-path audit all
  pass. The scoped Sol re-review returns `PASS` with P0/P1/P2=0/0/0: the Terra
  QA P1 is closed and no new breakage is found. D0 advances to `ready_for_qa` for
  a Terra QA restart on this exact tree. Terra must run the full 11/11 governance
  suite plus the prior complete provider-free checklist: direct CLI verifier,
  five authority-block identity, all 11 TOML files, scoped Prettier,
  diff/whitespace checking, and exact-path scope audit. Task 1 remains `planned`,
  its contract remains `proposed`, and it stays blocked. ADR-0009 remains
  `Proposed` pending explicit founder acceptance or rejection. No Task 1
  implementation, provider/model call, service, Docker, Compose, live-gate
  replay, acceptance, commit, or push is authorized.
- Restarted independent Terra QA returns `PASS` with P0/P1/P2=0/0/0 on the
  exact reviewed tree. The full governance suite passes 11/11, the direct CLI
  verifier passes, and all five marker-delimited authority maps are identical at
  SHA-256
  `7F02C5DCA0F46AC9FFEB0B424EBF671EE71F24B75152030D2A3B0905F3C00AF0`.
  All 11 TOML files parse; scoped formatting, diff/whitespace checking, and the
  exact-path scope audit pass. Golden-profile verification is bound to the
  tracked package ranges, lockfile resolutions, Dockerfile runtime tags, and
  Compose image majors rather than governance prose. Copied-skill provenance
  verifies the recorded upstream full SHAs, license sources/notices, and honest
  local hash/divergence classifications. No open QA finding remains.
- D0 advances to `reviewed`, not `accepted`, for the explicit founder ADR gate.
  The exact founder decision prompt is: **Accept or reject ADR-0009, which
  recommends keeping the current Golden runtime profile and introducing
  additive versioned `factory.application-graph/v2` with V1
  immutable/compatible boundaries.** No choice is inferred from the plan,
  design, ADR recommendation, review, or QA evidence. If the founder accepts,
  one final independent Sol release gate, PM acceptance, and the
  controller-owned reviewed commit/push with remote-tip verification still
  remain. If the founder rejects, D0 returns to governance repair and Task 1 is
  replanned; implementation does not begin. Task 1 remains `planned`, its
  contract remains `proposed`, and it stays blocked. ADR-0009 remains
  `Proposed`. No Task 1 implementation, provider/model call, service, Docker,
  Compose, live-gate replay, acceptance, commit, or push is authorized before
  the founder decision.
- Founder decision for the exact ADR-0009 accept/reject gate is recorded without
  inference. The founder response in chat is `接受，继续`. ADR-0009 is marked
  `Accepted` with decision date 2026-08-11 and decision source `founder chat`.
  This accepts the ADR recommendation to keep the current Golden runtime profile
  and introduce additive versioned `factory.application-graph/v2` with V1
  immutable/compatible boundaries. It does not accept D0 or authorize Task 1.
  D0 remains `reviewed`; Task 1 remains `planned`, its contract remains
  `proposed`, and it stays blocked until D0's reviewed commit/push and remote-tip
  verification complete. The final independent Sol release gate is now
  authorized on the exact D0 tree, provider-free and read-only. On `PASS` with
  no open P0/P1, PM may accept D0 and the controller may create and push the
  reviewed commit. No product or Task 1 change, provider/model call, service,
  Docker, Compose, or live-gate replay is authorized.
- The required post-decision governance transition check is RED exactly as the
  fail-closed gate anticipated: the focused suite passes 10/11, with only “ADR-0009
  missing Proposed status,” and the direct CLI verifier fails with the same one
  issue. The verifier still hardcodes the pre-decision `Proposed` state and does
  not yet validate the recorded `Accepted` decision state. PM changes no
  verifier code. Freeze one bounded writer repair to exactly
  `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`: make ADR-state verification
  decision-aware while failing closed on an `Accepted` status without the
  matching accepted founder gate, decision date 2026-08-11, and decision source
  `founder chat`, and on contradictory `Proposed`/accepted combinations. Preserve
  all existing governance, Golden-profile, provenance, authority-map, and
  recovery checks. GREEN requires 11/11 plus direct CLI, scoped Prettier,
  diff/whitespace, and exact two-path audit, followed by scoped independent Sol
  re-review and Terra recheck before the final independent Sol release gate.
  D0 remains `reviewed`, not accepted; Task 1 remains `planned`, `proposed`, and
  blocked. The final release gate is paused, and no product or Task 1 change,
  provider/model call, service, Docker, Compose, live-gate replay, acceptance,
  commit, or push is authorized until this repair is clean.
- D0 founder-transition fix round 3 scoped Sol re-review returns `FAIL` with
  P0/P1/P2=0/1/0. The exact P1 is a non-exclusive decision-state check: the
  verifier detects `gateAccepted` and `gateNotRecorded`, but its `Accepted`
  branch does not reject `gateNotRecorded`. An ADR containing both decision
  markers plus otherwise valid accepted metadata therefore passes. The test
  replaces markers rather than exercising their coexistence, and the
  `Proposed` branch also fails to reject orphan visible accepted-decision
  metadata. The recorded founder decision and ADR semantics do not change. D0
  remains `reviewed`, not accepted; Task 1 remains `planned`, its contract
  `proposed`, and blocked.
- Freeze fix round 4/5 to a fresh Sol writer on exactly
  `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`; only an ignored local handoff/review
  report may be created outside those tracked paths. Require exactly one founder
  decision marker. The `Accepted` branch must reject coexistence with the
  not-recorded marker, and the `Proposed` branch must reject any visible accepted
  decision metadata. Add focused coexistence and orphan-metadata RED tests, then
  GREEN the focused and complete provider-free suite. Run the direct CLI
  verifier, scoped Prettier, diff/whitespace check, and exact two-path audit.
  One scoped Sol re-review must pass before the Terra recheck and final
  independent Sol release gate resume. No ADR, ledger, or status semantics may
  change in the writer round. No product or Task 1 change, provider/model call,
  service, Docker, Compose, live-gate replay, acceptance, commit, or push is
  authorized.
- D0 fix round 4 writer and scoped Sol re-review are complete on exactly
  `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. Focused RED is 18/20 for the
  coexistence and orphan accepted-metadata defects; GREEN is 20/20. The
  source-native suite passes 26/26. The direct CLI verifier, scoped Prettier,
  diff/whitespace check, and exact two-path audit pass. The scoped Sol re-review
  returns `PASS` with P0/P1/P2=0/0/0: the prior P1 is closed, mutually exclusive
  founder-decision state is enforced, and no new breakage is found. Bare-root
  Node discovery still encounters pre-existing compiled Vitest output; this is
  classified as an out-of-scope pre-existing discovery condition, not evidence
  from or a widening of this two-path repair.
- D0 remains `reviewed`, not accepted. ADR-0009 remains `Accepted`; Task 1
  remains `planned`, its contract `proposed`, and blocked. Authorize one
  independent Terra recheck on this exact tree: run the complete focused suite
  20/20, source-native suite 26/26, and direct CLI verifier, then revalidate the
  prior complete provider-free D0 evidence including five-map hash identity, all
  11 TOMLs, Golden-profile manifest bindings, copied-skill provenance,
  state-driven recovery, scoped Prettier, diff/whitespace, and exact-path audit.
  Only a clean Terra pass authorizes the final independent Sol release review.
  No product or Task 1 change, provider/model call, service, Docker, Compose,
  live-gate replay, acceptance, commit, or push is authorized.
- Final founder-accepted D0 Terra recheck returns `PASS` with
  P0/P1/P2=0/0/0 on the exact current tree. The focused governance suite passes
  20/20, the source-native suite passes 26/26, and the direct CLI verifier
  passes. All five authority maps remain identical at SHA-256
  `7F02C5DCA0F46AC9FFEB0B424EBF671EE71F24B75152030D2A3B0905F3C00AF0`;
  all 11 TOML files parse; scoped formatting, diff/whitespace, and exact-path
  scope checks pass. Golden-profile manifest bindings, copied-skill provenance,
  mutually exclusive founder-decision state, and state-driven recovery evidence
  all pass. Bare-root Node discovery of pre-existing compiled Vitest output
  remains non-required and outside this D0 slice.
- D0 remains `reviewed`, not accepted; ADR-0009 remains `Accepted`; Task 1
  remains `planned`, its contract `proposed`, and blocked. Authorize exactly one
  final independent Sol release review of the entire D0 slice and current tree,
  provider-free and read-only. On `ACCEPT` with no open P0/P1, PM may accept D0
  and the controller may create and push the reviewed commit, then verify the
  remote branch tip. On any P0/P1, route one bounded repair within the remaining
  cap and keep Task 1 blocked. No product or Task 1 change, provider/model call,
  service, Docker, Compose, live-gate replay, acceptance, commit, or push is
  otherwise authorized.
- Final independent D0 Sol release review returns `REJECT` with
  P0/P1/P2=0/3/0. PM may not accept D0 or authorize commit/push. The three exact
  P1 findings are:
  1. `docs/tech-governance.md` still treats ADR-0009 as awaiting founder
     acceptance while V1 remains the currently implemented contract and also
     carries live D0 task state; the workstream retains a checkpoint-specific,
     already-consumed founder gate. Secondary authorities therefore conflict
     with the accepted ADR and can replay consumed state instead of deferring
     live task state and authorization solely to this ledger.
  2. The verifier does not parse the actual D0 and Task 1 sections for `State`,
     contract status, and `Blocked by`. Prose checks can pass while those
     authoritative fields prematurely unblock Task 1 or mark implementation
     active.
  3. Golden-profile verification does not parse every documented profile-table
     row and compare it bidirectionally with manifest ranges, lockfile exact
     resolutions, Dockerfile tags, and Compose image tags. A drift introduced
     from the authority-table side can therefore pass.
- Freeze the single remaining repair, round 5/5, under one fresh Sol writer.
  The only tracked writer paths are `docs/tech-governance.md`,
  `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`,
  `scripts/verify-d0-governance.mjs`, and
  `scripts/verify-d0-governance.test.mjs`; only an ignored local handoff/review
  report is additionally permitted. The repair contract is:
  1. Technology governance records ADR-0009 as founder-accepted while V1 remains
     the currently implemented Application Graph contract, removes live D0 task
     state, and defers all task state and authorization to this ledger. The
     workstream removes its checkpoint-specific consumed founder gate and
     defers recovery and authorization to the live ledger.
  2. The verifier parses the actual D0 and Task 1 sections, including `State`,
     contract status, and `Blocked by`, and rejects premature Task 1 unblocking
     or implementation. Tests mutate those actual fields, not explanatory
     prose.
  3. The verifier parses every documented Golden-profile table row and compares
     it bidirectionally with package-manifest ranges, lockfile exact resolutions,
     Dockerfile runtime tags, and Compose image tags. Add an authority-table-side
     mutation RED. Do not edit package manifests, lockfiles, Dockerfiles, or
     Compose files.
     Capture behavioral RED evidence for all three findings, then GREEN the full
     provider-free suite and direct CLI verifier; run scoped Prettier, all TOML
     parsing, diff/whitespace, and exact four-path audit. Require one scoped Sol
     re-review and one Terra recheck. This is the repair cap: any residual
     load-bearing P0/P1 stops and blocks the Goal, with no further repair round. D0
     remains `reviewed`, not accepted; Task 1 remains `planned`, its contract
     `proposed`, and blocked. No product or Task 1 change, provider/model call,
     service, Docker, Compose, live-gate replay, acceptance, commit, or push is
     authorized.
- Final round-5 scoped Sol re-review returns `ACCEPT` with P0/P1/P2=0/0/0. All
  three final-release P1s are addressed and no new breakage is found. D0 remains
  `reviewed`, not accepted; ADR-0009 remains `Accepted`; Task 1 remains
  `planned`, its contract `proposed`, and blocked by its authoritative field
  below.
- Authorize the one final independent Terra recheck required by this ledger on
  the exact current round-5 tree, provider-free and read-only. Terra must run the
  source-native suite 52/52 and direct CLI verifier; verify all five authority
  maps, all 11 TOMLs, scoped Prettier, diff/whitespace, and exact-path scope;
  prove bidirectional Golden-profile table truth against manifests, lockfile,
  Dockerfiles, and Compose; parse and validate the actual live D0 and Task 1
  states, Task 1 contract status, and authoritative `Blocked by` field; and
  revalidate the accepted ADR decision, copied-skill provenance, threat-model
  authority, and state-driven recovery. No bare-root compiled-test discovery is
  required. On Terra `PASS` with no open P0/P1, PM may accept D0 and authorize
  the controller-owned reviewed commit/push with local HEAD verified equal to
  the remote branch tip. Any P0/P1 at this repair cap stops and blocks the Goal;
  no repair round remains. No product or Task 1 change, provider/model call,
  service, Docker, Compose, or live-gate replay is authorized.
- Final round-5 independent Terra QA returns `PASS` with P0/P1/P2=0/0/0 on
  fresh evidence. The source-native suite passes 52/52 and the direct CLI
  verifier passes. All five authority maps, all 11 TOMLs, scoped Prettier,
  diff/whitespace, and exact-scope checks are green. Bidirectional Golden-profile
  truth, actual live D0 and Task 1 fields plus the authoritative blocker,
  accepted ADR-0009, copied-skill provenance, threat-model authority, and
  state-driven recovery all pass. No open P0/P1 remains at the round-5 cap.
- PM accepts D0 on 2026-08-12. Task 1 remains `planned`, its contract remains
  `proposed`, and it stays blocked until delivery completes. The controller is
  explicitly authorized to stage exactly the following D0 scope and no other
  path:
  - `.agents/skills/UPSTREAM_PROVENANCE.md`;
  - `.codex/README.md`;
  - `.codex/agents/pm.toml`;
  - `.codex/agents/tech_lead.toml`;
  - `AGENTS.md`;
  - `THIRD_PARTY_NOTICES.md`;
  - `docs/adr/adr-0009-application-graph-v2-shared-contract.md`;
  - `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`;
  - `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`;
  - `docs/project-status.md`;
  - `docs/research/2026-08-10-product-builder-ui-ecosystem.md`;
  - `docs/roadmap.md`;
  - `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`;
  - `docs/tech-governance.md`;
  - `docs/threat-model.md`;
  - `scripts/verify-d0-governance.mjs`;
  - `scripts/verify-d0-governance.test.mjs`.
    Before commit, the controller must verify the staged manifest equals this
    exact 19-path list and contains no credential, raw model material, or unrelated
    path. The controller may then create the reviewed D0 commit, push the current
    branch without force under `docs/delivery-policy.md`, and verify local HEAD
    equals the remote branch tip. This acceptance does not itself unblock Task 1:
    PM must record that push equality before changing Task 1 state or contract
    status. No product or Task 1 implementation, provider/model call, service,
    Docker, Compose, or live-gate replay is authorized.
- Controller final-tree verification after PM acceptance fails closed.
  Source-native governance tests pass 51/52 and the direct governance CLI exits
  1 because the verifier hard-rejects the legitimate ledger transition to D0
  state `accepted` and still requires `reviewed`. Independent Sol classification
  is P0/P1/P2=0/1/0: this is a load-bearing final-release P1 inside the delivery
  gate. The prior Terra evidence predates this executable state transition and
  therefore cannot authorize delivery of the accepted tree.
- The round-5/5 repair cap recorded above is exhausted, so no repair is
  authorized. The prior stage, commit, and push authorization is revoked. D0
  remains `accepted` as the exact state that reproduces the blocker, but its
  delivery is blocked and PM does not authorize a commit or push. Task 1 remains
  `planned`, its contract `proposed`, and blocked by the authoritative field
  below. New explicit founder authority is required to reopen one minimal
  post-accept transition repair; no such authority is inferred from the earlier
  ADR acceptance or continuation response. Until then, no verifier, product, or
  Task 1 change, provider/model call, service, Docker, Compose, live-gate replay,
  staging, commit, or push is authorized.
- After the recorded accepted-state P1 blocker, the founder explicitly responds
  `接受，继续`. This is new authority from founder chat dated 2026-08-12 and
  reopens exactly one minimal D0 post-accept transition repair. It does not
  alter the founder-accepted ADR-0009 decision or erase the prior PM acceptance
  and failed-delivery history. D0 moves to `implementing` only for this repair;
  Task 1 remains `planned`, its contract `proposed`, and blocked by its
  authoritative field below.
- Freeze one Sol TDD writer to exactly `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. PM alone may update this ledger,
  `docs/project-status.md`, and later acceptance/delivery records. The repair
  must make the legitimate current D0 `accepted` state verify green without
  weakening any pre-accept, lifecycle-state, contract-status, or Task 1 blocker
  fail-closed check. Add focused RED/GREEN coverage for valid accepted-state
  consistency and for contradictory or premature accepted states, including an
  unaccepted ADR, premature Task 1 implementation/unblocking, or a weakened
  push-equality blocker. GREEN requires the complete provider-free governance
  suite and direct CLI verifier, scoped Prettier, diff/whitespace, and exact
  two-path audit.
- After the writer handoff require one independent Sol review with no open
  P0/P1, then one independent Terra QA pass on the exact tree. Only after both
  pass may PM re-accept D0 and restore delivery authority for the exact 19-path
  D0 manifest, reviewed commit, non-force push, and local HEAD/remote-tip
  equality verification. No further repair is authorized by this decision. No
  product or Task 1 change, provider/model call, service, Docker, Compose,
  live-gate replay, staging, commit, or push is authorized during the repair.
- The founder-authorized accepted-transition writer handoff is complete on
  exactly `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. RED reproduces the reviewed-only
  rejection of the legitimate accepted D0 state. GREEN passes the combined
  source-native command 58/58, comprising governance 52/52 plus no-preview 6/6,
  and the direct CLI verifier; scoped Prettier, diff/whitespace, and exact
  two-path scope checks pass. It retains strict fail-closed validation of Task 1
  state, contract status, and the authoritative push-equality blocker. D0
  remains `implementing` while the independent Sol task review runs. Task 1
  remains `planned`, `proposed`, and blocked; ADR-0009 remains `Accepted`. Terra
  QA, PM re-acceptance, staging, commit, and push are not yet authorized. No
  product or Task 1 change, provider/model call, service, Docker, Compose, or
  live-gate replay is authorized.
- Independent Sol review returns `FAIL` with P0/P1/P2=0/2/0. The two P1s are:
  1. The verifier's implementing-authorization markers use unscoped whole-ledger
     regular expressions. Historical authorization therefore survives a later
     re-acceptance, consumption, supersession, or revocation and can be replayed
     as current authority.
  2. The handoff evidence wording called 58/58 the governance source-native
     suite. The combined source-native command is 58/58: the governance file is
     52/52 and the no-preview resource-guard file is 6/6. No test is missing;
     the record is corrected above.
     The writer continues in the same exact verifier/test scope with TDD for one
     ordered authorization record and explicit supersession/revocation; no new
     repair path or authority is added. D0 remains `implementing`; Terra QA and all
     delivery actions remain unauthorized pending a clean scoped Sol re-review.
     Task 1 remains `planned`, `proposed`, and blocked. No product or Task 1 change,
     provider/model call, service, Docker, Compose, live-gate replay, staging,
     commit, or push is authorized.
- The same-scope replay-repair writer re-handoff is complete on the exact
  verifier/test paths. Focused RED is 0/5 across stale, split, revoked, consumed,
  and duplicate authorization cases. GREEN passes the combined source-native
  command 63/63, comprising governance 57/57 plus no-preview 6/6; the focused
  replay suite passes 7/7 and the broader governance suite passes 25/25. The
  direct CLI verifier, scoped Prettier, diff/whitespace, and exact two-path scope
  checks pass. The same Sol reviewer recheck has started. D0 remains
  `implementing`; Task 1 remains `planned`, `proposed`, and blocked. Terra QA,
  PM re-acceptance, staging, commit, and push remain unauthorized pending the
  reviewer verdict. No product or Task 1 change, provider/model call, service,
  Docker, Compose, or live-gate replay is authorized.
- The same Sol re-review returns `PASS` with P0/P1/P2=0/0/0: both prior P1s are
  addressed and no new breakage is found. Fresh evidence passes focused 7/7,
  broader 25/25, and the combined source-native command 63/63, comprising
  governance 57/57 plus no-preview 6/6; the direct CLI verifier, scoped
  Prettier, and diff/whitespace checks pass.
- D0 advances to `ready_for_qa`. Authorize one independent Terra QA pass,
  provider-free and read-only, on this exact tree. QA must prove ordered,
  one-time authorization freshness and consumption across accepted, reviewed,
  and explicitly authorized implementing states; validate ADR-0009, actual D0
  and Task 1 state, Task 1 contract status and authoritative push-equality
  blocker; rerun the complete governance and Golden-profile truth, copied-skill
  provenance, threat-model authority, and state-driven recovery gates; and
  verify the exact 19-path scope with formatting and diff/whitespace clean.
  Task 1 remains `planned`, `proposed`, and blocked. PM re-acceptance, staging,
  commit, and push remain unauthorized until Terra passes with no open P0/P1.
  No product or Task 1 change, provider/model call, service, Docker, Compose, or
  live-gate replay is authorized.
- Terra QA stops before the full run and returns `FAIL` with P0/P1/P2=0/1/0.
  After PM legally advanced D0 to `ready_for_qa`, the current direct CLI verifier
  exits 1 and the checked-in contract passes 0/1 because the verifier explicitly
  rejects `ready_for_qa`. The load-bearing root cause is phase-specific
  allowed-state encoding rather than validation of the governed D0 lifecycle;
  the preceding Sol review missed this executable transition.
- D0 returns to `implementing`. Continue within the existing founder-authorized
  repair and the same exact two tracked paths,
  `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`; no scope or repair authority expands.
  TDD must accept `ready_for_qa` only when one current ordered record contains
  both the Sol `PASS` and Terra authorization, and must reject a missing, split,
  stale, later-review-failed, revoked, superseded, or consumed record. Preserve
  the fresh implementing, reviewed, and accepted lifecycle rules plus strict
  ADR-0009, Task 1 state, Task 1 contract status, and authoritative push-equality
  blocker checks. GREEN requires focused and full provider-free suites, direct
  CLI, scoped Prettier, diff/whitespace, and exact two-path audit. Then require
  the same Sol reviewer to re-review before Terra restarts on the exact tree.
  Task 1 remains `planned`, `proposed`, and blocked. Terra restart, PM
  re-acceptance, staging, commit, and push remain unauthorized pending the clean
  re-review. No product or Task 1 change, provider/model call, service, Docker,
  Compose, or live-gate replay is authorized.
- The same two-path `ready_for_qa` P1 writer re-handoff is complete. Focused RED
  is 0/10 across valid, missing, split, and duplicate authorization records plus
  later Sol failure, Terra failure, revocation, supersession, consumption, and
  return-to-implementing cases. GREEN passes focused 10/10, broader 34/34, and
  the combined source-native command 72/72, comprising governance 66/66 plus
  no-preview 6/6. The current `implementing` state passes the direct CLI
  verifier; scoped Prettier, diff/whitespace, and exact two-path checks pass.
  The same Sol reviewer re-review has started. D0 remains `implementing`; Task 1
  remains `planned`, `proposed`, and blocked. Terra restart, PM re-acceptance,
  staging, commit, and push remain unauthorized pending the reviewer verdict.
  No product or Task 1 change, provider/model call, service, Docker, Compose, or
  live-gate replay is authorized.
- The same Sol re-review returns `FAIL` with P0/P1/P2=0/1/0. Ready-authority
  invalidation recognizes later `Sol review` and `Sol re-review` failure wording
  but misses the repository-native `Sol task review returns FAIL`; the
  adversarial fixture therefore leaves stale authority valid. This is the third
  related wording gap and is treated as a semantic gate-outcome classification
  defect, not another exact-sentence omission.
- Continue in the same exact ordered-record model and the same two tracked paths,
  `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. Implement one bounded semantic
  classifier: any later required Sol or Terra gate record carrying `FAIL` or
  nonzero P0/P1/P2 consumes ready authority across the bounded vocabulary of
  review, re-review, task review, release review, QA, and recheck. Add
  parameterized REDs for every supported gate/outcome form plus false-positive
  controls for unrelated prose and zero-severity passing records. Do not add a
  broader ledger schema, widen paths, or weaken the existing ordered-record,
  state, ADR, Task 1 contract, or push-equality blocker checks. D0 remains
  `implementing`; Task 1 remains `planned`, `proposed`, and blocked. Terra,
  re-acceptance, staging, commit, and push remain unauthorized pending a clean
  same-Sol re-review. No product or Task 1 change, provider/model call, service,
  Docker, Compose, or live-gate replay is authorized.
- The semantic-classifier writer handoff declares the combined source-native
  command green at 82/82, comprising governance 76/76 plus no-preview 6/6, with
  the direct CLI verifier, scoped Prettier, diff/whitespace, and exact two-path
  scope checks also green. The same Sol re-review nevertheless returns `FAIL`
  with P0/P1/P2=0/1/0. The classifier uses only the first `P0/P1/P2` tuple in a
  gate record, so a historical 0/0/0 tuple can mask a later current 0/1/0 tuple
  in that same record. The declared green evidence therefore does not close the
  load-bearing ready-authority invalidation gate.
- Freeze the correction to the same exact verifier/test paths and ordered-record
  model. TDD must evaluate every non-quoted `P0/P1/P2` tuple in a bounded Sol or
  Terra gate record and consume ready authority when any tuple is nonzero,
  regardless of zero/nonzero order or mixed PASS/FAIL outcome wording. Add both
  tuple-order variants, mixed-outcome coverage, multiple-all-zero controls, and
  quoted-history nonzero controls that must not invalidate current authority.
  Preserve every existing vocabulary, lifecycle, authorization freshness, ADR,
  Task 1 contract, and push-equality blocker check. Fresh controller evidence on
  the in-progress TDD tree is intentionally RED at governance 79/81: the
  zero-then-nonzero and mixed PASS/FAIL controls fail, while the reverse-order,
  quoted-history, and all-zero controls pass. Require GREEN focused and complete
  provider-free suites, direct CLI, scoped Prettier, diff/whitespace, and exact
  two-path scope before the same Sol reviewer rechecks. D0 remains
  `implementing`; Task 1 remains `planned`, its contract remains `proposed`, and
  it stays blocked. Terra, PM re-acceptance, staging, commit, push, product or
  Task 1 code, provider/model calls, services, Docker, Compose, and live-gate
  replay remain unauthorized.
- The all-tuples writer GREEN handoff is complete on exactly
  `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. Focused tuple-order and quoted-history
  coverage passes 5/5, the broader ledger suite passes 49/49, and the combined
  source-native command passes 87/87, comprising governance 81/81 plus
  no-preview 6/6. The direct CLI verifier, scoped Prettier, diff/whitespace, and
  exact two-path scope checks pass. The same Sol reviewer re-review has started.
  D0 remains `implementing`; Task 1 remains `planned`, its contract remains
  `proposed`, and it stays blocked. Terra, PM re-acceptance, staging, commit,
  push, product or Task 1 code, provider/model calls, services, Docker, Compose,
  and live-gate replay remain unauthorized pending the reviewer verdict.
- The same Sol re-review returns `FAIL` with P0/P1/P2=0/1/0. The remaining P1
  is a quote-boundary defect: tuple classification removes straight and curly
  double-quoted history but still counts Markdown inline-code history. A valid
  current ready record with plain P0/P1/P2=0/0/0 is therefore consumed when its
  explanation contains backtick-quoted `historical P0/P1/P2=0/1/0`.
- Continue TDD on the same exact ordered-record model and the same two tracked
  paths, `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. Exclude severity tuples inside native
  Markdown inline-code explanatory spans from tuple classification without
  suppressing genuine backticked `PASS` or `FAIL` verdict tokens. Add focused
  controls for backtick-quoted, straight-single-quoted, and curly-quoted history,
  plus actual backticked and plain verdict failures and genuine unquoted nonzero
  tuples. Preserve the all-tuples behavior, bounded Sol/Terra vocabulary,
  ordered authority, lifecycle, ADR, Task 1 contract, and push-equality blocker
  checks. No broader parser or ledger schema, path, product, provider, service,
  Docker, Compose, or live-gate scope is authorized. D0 remains `implementing`;
  Task 1 remains `planned`, its contract remains `proposed`, and it stays
  blocked. Terra, PM re-acceptance, staging, commit, and push remain unauthorized
  pending a GREEN handoff and clean same-Sol re-review.
- The inline-code quote-boundary writer GREEN handoff is complete on the same
  exact verifier/test paths. Focused RED is 4/5 with only the valid inline-code
  historical-tuple control failing. GREEN passes the focused quote-boundary
  suite 5/5, the broader ledger suite 53/53, and the combined source-native
  command 91/91, comprising governance 85/85 plus no-preview 6/6. The direct CLI
  verifier, scoped Prettier, diff/whitespace, and exact two-path scope checks
  pass. The same Sol reviewer re-review has started. D0 remains `implementing`;
  Task 1 remains `planned`, its contract remains `proposed`, and it stays
  blocked. Terra, PM re-acceptance, staging, commit, push, product or Task 1
  code, provider/model calls, services, Docker, Compose, and live-gate replay
  remain unauthorized pending the reviewer verdict.
- The same Sol final re-review returns `FAIL` with P0/P1/P2=0/1/0. The exact
  quote-boundary contract is still uncovered: the sanitizer removes an inline
  code span only when the tuple is the span's complete content. The required
  ledger case is a complete explanatory span such as
  `historical P0/P1/P2=0/1/0`, and the required ASCII single-quoted form is
  `'historical P0/P1/P2=0/1/0'`; the writer test instead placed `historical`
  outside the code span and used ASCII double quotes.
- Continue TDD on exactly `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs`. Tuple sanitization must remove the
  complete paired span when that span contains a severity tuple for native
  Markdown backticks, ASCII single quotes, ASCII double quotes, curly single
  quotes, and curly double quotes. Standalone backticked `PASS` and `FAIL`
  verdict tokens must remain visible to genuine verdict classification. Add
  exact regressions for every paired-span form plus genuine backticked and plain
  verdict failures and unquoted nonzero tuples. Preserve all-tuples evaluation,
  bounded gate vocabulary, ordered authority, lifecycle, ADR, Task 1 contract,
  and push-equality blocker checks. Do not add a broader parser or ledger schema,
  widen paths, or authorize product, provider/model, service, Docker, Compose,
  or live-gate work. D0 remains `implementing`; Task 1 remains `planned`, its
  contract remains `proposed`, and it stays blocked. Terra, PM re-acceptance,
  staging, commit, and push remain unauthorized pending a GREEN handoff and
  clean same-Sol re-review.
- The complete paired-span writer GREEN handoff is complete on the same exact
  verifier/test paths. Focused RED is 2/5: the Markdown backtick phrase, ASCII
  single-quoted phrase, and curly single-quoted phrase fail while the other two
  paired-span controls pass. GREEN passes the focused paired-span suite 5/5, the
  broader ledger suite 56/56, and the combined source-native command 94/94,
  comprising governance 88/88 plus no-preview 6/6. The direct CLI verifier,
  scoped Prettier, diff/whitespace, and exact two-path scope checks pass. The
  same Sol reviewer re-review has started. D0 remains `implementing`; Task 1
  remains `planned`, its contract remains `proposed`, and it stays blocked.
  Terra, PM re-acceptance, staging, commit, push, product or Task 1 code,
  provider/model calls, services, Docker, Compose, and live-gate replay remain
  unauthorized pending the reviewer verdict.
- The same Sol re-review returns `FAIL` with P0/P1/P2=0/1/0. The paired-span
  regular expression fails open on apostrophes: it treats intra-word ASCII and
  curly apostrophes as single-quote delimiters, so a genuine unquoted nonzero
  tuple between text such as `reviewer's` and `team's` is removed and stale
  ready authority remains valid.
- Continue TDD on exactly `scripts/verify-d0-governance.mjs` and
  `scripts/verify-d0-governance.test.mjs` with a boundary-aware paired-span
  scanner, not another broad regular expression. ASCII and curly single quotes
  may open or close a paired explanatory span only at non-word boundaries;
  intra-word ASCII or Unicode apostrophes in possessives and contractions never
  delimit a span. Add genuine-nonzero REDs between ASCII possessives and between
  curly possessives, contraction controls, exact tuple-containing quote-span
  positives, and unmatched or mixed-delimiter cases that must not suppress a
  genuine tuple. Preserve Markdown backtick and double-quote handling,
  standalone backticked verdict visibility, all-tuples evaluation, bounded gate
  vocabulary, ordered authority, lifecycle, ADR, Task 1 contract, and
  push-equality blocker checks. Do not widen the parser or ledger schema, paths,
  product, provider/model, service, Docker, Compose, or live-gate scope. D0
  remains `implementing`; Task 1 remains `planned`, its contract remains
  `proposed`, and it stays blocked. Terra, PM re-acceptance, staging, commit, and
  push remain unauthorized pending a GREEN handoff and clean same-Sol re-review.
- The boundary-aware scanner writer GREEN handoff is complete on the same exact
  verifier/test paths. Focused RED is 9/11 with the ASCII/curly possessive and
  contraction controls failing. GREEN passes the focused scanner suite 11/11,
  the broader ledger suite 64/64, and the combined source-native command
  102/102, comprising governance 96/96 plus no-preview 6/6. The direct CLI
  verifier, scoped Prettier, diff/whitespace, and exact two-path scope checks
  pass. The same Sol reviewer re-review has started. D0 remains `implementing`;
  Task 1 remains `planned`, its contract remains `proposed`, and it stays
  blocked. Terra, PM re-acceptance, staging, commit, push, product or Task 1
  code, provider/model calls, services, Docker, Compose, and live-gate replay
  remain unauthorized pending the reviewer verdict.
- The same Sol re-review returns `PASS` with P0/P1/P2=0/0/0. Fresh evidence
  passes the boundary-aware scanner suite 11/11 and the complete provider-free
  source-native command 102/102, comprising governance 96/96 plus no-preview
  6/6; the direct CLI verifier, scoped Prettier, and diff/whitespace checks pass.
  Lifecycle, accepted ADR-0009, live Task 1 state and proposed contract, and the
  authoritative push-equality blocker remain strict. D0 advances to
  `ready_for_qa`. Authorize one independent Terra QA pass, provider-free and
  read-only, on this exact tree. QA must revalidate authorization freshness,
  the scanner boundaries, complete D0 governance evidence, live fields and
  blockers, exact two-path implementation scope, and the exact 19-path D0
  delivery manifest without changing files. Task 1 remains `planned`, its
  contract remains `proposed`, and it stays blocked. PM re-acceptance, staging,
  commit, push, delivery, product or Task 1 code, provider/model calls, services,
  Docker, Compose, and live-gate replay remain unauthorized pending Terra PASS
  with no open P0/P1.
- Final Terra restart returns `PASS` with P0/P1/P2=0/0/0 on the exact
  `ready_for_qa` tree. The combined source-native command passes 102/102,
  comprising governance 96/96 plus no-preview 6/6, and the direct CLI verifier
  passes. Boundary-scanner behavior, lifecycle, accepted ADR-0009, live Task 1
  state and proposed contract, the authoritative push-equality blocker,
  bidirectional Golden-profile truth, copied-skill provenance, threat-model
  authority, state-driven recovery, all 11 TOMLs, formatting, diff/whitespace,
  and the exact 19-path scope pass. The sensitive-material scan is clean.
- PM re-accepts D0 on 2026-08-12. Task 1 remains `planned`, its contract remains
  `proposed`, and it stays blocked until PM records the reviewed D0 commit pushed
  with local HEAD equal to the remote branch tip. The prior revoked delivery
  authorization is not reused. The controller must first rerun
  `node scripts/verify-d0-governance.mjs` on this exact post-transition
  `accepted` tree and receive exit code 0; the earlier `ready_for_qa` CLI result
  does not satisfy this gate. After that accepted-state check, the controller is
  authorized to stage exactly these 19 paths and no other path:
  - `.agents/skills/UPSTREAM_PROVENANCE.md`;
  - `.codex/README.md`;
  - `.codex/agents/pm.toml`;
  - `.codex/agents/tech_lead.toml`;
  - `AGENTS.md`;
  - `THIRD_PARTY_NOTICES.md`;
  - `docs/adr/adr-0009-application-graph-v2-shared-contract.md`;
  - `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`;
  - `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`;
  - `docs/project-status.md`;
  - `docs/research/2026-08-10-product-builder-ui-ecosystem.md`;
  - `docs/roadmap.md`;
  - `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`;
  - `docs/tech-governance.md`;
  - `docs/threat-model.md`;
  - `scripts/verify-d0-governance.mjs`;
  - `scripts/verify-d0-governance.test.mjs`.
    The controller must verify that the staged manifest equals this exact list
    and contains no credential, raw model material, or unrelated path, then
    create one reviewed D0 commit, push the current branch without force under
    `docs/delivery-policy.md`, and verify local HEAD equals the remote branch
    tip. PM must record that equality before Task 1 state or contract status may
    change. No product or Task 1 implementation, provider/model call, service,
    Docker, Compose, live-gate replay, cloud deployment, or any path outside the
    list is authorized.
- Controller pre-commit verification on the exact accepted tree fails combined
  source-native 101/102. The sole failure is the fixture
  `ledger verification accepts the authorized post-accept repair state`: its
  positive setup changes the copied live ledger state from `accepted` to
  `implementing` but retains the later PM re-acceptance above, so production
  correctly rejects the historical founder repair authority as consumed. The
  direct accepted-state CLI remains green; this is a test-fixture P1, not a
  production fail-open.
- The stage, commit, and push authorization above is temporarily revoked. Keep
  live D0 State `accepted`; do not rewrite acceptance or founder-authority
  history. Freeze one test-only TDD correction to
  `scripts/verify-d0-governance.test.mjs`. The positive authorized-implementing
  helper must reconstruct that historical slice by truncating the copied ledger
  before the final PM re-acceptance and consumption record. The stale-authority
  negative must retain the complete final history and continue to prove that
  production rejects consumed authority. Do not change
  `scripts/verify-d0-governance.mjs`, any ledger schema, or any other path.
  Require focused and complete provider-free GREEN, the direct accepted-state
  CLI, scoped Prettier, diff/whitespace, and exact one-path scope, followed by
  the same Sol review and one exact accepted-tree, provider-free, read-only
  Terra QA pass. PM may restore the exact 19-path delivery authorization only
  after both gates pass with no open P0/P1. Task 1 remains `planned`, its
  contract remains `proposed`, and it stays blocked. Staging, commit, push,
  product or Task 1 implementation, provider/model calls, services, Docker,
  Compose, cloud deployment, and live-gate replay remain unauthorized.
- The fixture-only writer GREEN handoff is complete on
  `scripts/verify-d0-governance.test.mjs`; production verification code is
  unchanged. Focused RED is 0/1 on the consumed-authority positive fixture. The
  helper now reconstructs pre-consumption implementing history, while the stale
  negative retains the complete final re-accepted history. GREEN passes the
  post-accept suite 7/7 and the combined source-native command 102/102,
  comprising governance 96/96 plus no-preview 6/6. The direct accepted-state
  CLI verifier, scoped Prettier, diff/whitespace, and exact test-only scope
  checks pass. The same Sol review has started. D0 remains `accepted`; Task 1
  remains `planned`, its contract remains `proposed`, and it stays blocked.
  Delivery, Terra QA, staging, commit, push, product or Task 1 implementation,
  provider/model calls, services, Docker, Compose, cloud deployment, and
  live-gate replay remain unauthorized pending the reviewer verdict.
- The same Sol fixture re-review returns `PASS` with P0/P1/P2=0/0/0. Fresh
  evidence passes the post-accept suite 7/7 and the complete provider-free
  source-native command 102/102; the direct accepted-state CLI verifier, scoped
  Prettier, and diff/whitespace checks pass. Production verification remains
  unchanged, the positive fixture reconstructs pre-consumption history, and the
  stale negative retains the complete final history. Authorize one independent
  Terra QA pass, provider-free and read-only, on this exact accepted tree. QA
  must revalidate the fixture boundary, full governance 96/96 plus no-preview
  6/6, accepted-state CLI, scanner/lifecycle/ADR/Task 1 state, proposed contract
  and blocker, Golden-profile truth, provenance, threat model, recovery, all 11
  TOMLs, formatting, diff/whitespace, exact 19-path scope, and the
  sensitive-material boundary. On Terra `PASS` with no open P0/P1, PM may
  restore the exact 19-path delivery authority. D0 remains `accepted`; Task 1
  remains `planned`, its contract remains `proposed`, and it stays blocked.
  Delivery, staging, commit, push, product or Task 1 implementation,
  provider/model calls, services, Docker, Compose, cloud deployment, and
  live-gate replay remain unauthorized pending Terra and a later PM restoration
  record.
- Final accepted-tree Terra QA returns `PASS` with P0/P1/P2=0/0/0. The combined
  provider-free source-native command passes 102/102, comprising governance
  96/96 plus no-preview 6/6, and the direct accepted-state CLI verifier passes.
  The complete fixture and scanner boundaries, lifecycle, accepted ADR-0009,
  live Task 1 state and proposed contract, authoritative push-equality blocker,
  bidirectional Golden-profile truth, copied-skill provenance, threat-model
  authority, state-driven recovery, all 11 TOMLs, all five authority maps,
  formatting, diff/whitespace, exact 19-path scope, and sensitive-material scan
  are clean. No open P0/P1 remains.
- PM restores delivery authority for this exact accepted tree. The controller
  must first rerun `node scripts/verify-d0-governance.mjs` after this restoration
  record and receive exit code 0. It may then stage exactly these 19 paths and no
  other path:
  - `.agents/skills/UPSTREAM_PROVENANCE.md`;
  - `.codex/README.md`;
  - `.codex/agents/pm.toml`;
  - `.codex/agents/tech_lead.toml`;
  - `AGENTS.md`;
  - `THIRD_PARTY_NOTICES.md`;
  - `docs/adr/adr-0009-application-graph-v2-shared-contract.md`;
  - `docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md`;
  - `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`;
  - `docs/project-status.md`;
  - `docs/research/2026-08-10-product-builder-ui-ecosystem.md`;
  - `docs/roadmap.md`;
  - `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`;
  - `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`;
  - `docs/tech-governance.md`;
  - `docs/threat-model.md`;
  - `scripts/verify-d0-governance.mjs`;
  - `scripts/verify-d0-governance.test.mjs`.
    The controller must prove the staged manifest equals this exact list and
    repeat the sensitive-material boundary check, then create one reviewed D0
    commit, push the current branch without force under
    `docs/delivery-policy.md`, and verify local HEAD equals the remote branch
    tip. D0 remains `accepted`; Task 1 remains `planned`, its contract remains
    `proposed`, and it stays blocked until PM records that pushed equality. No
    product or Task 1 implementation, provider/model call, service, Docker,
    Compose, live-gate replay, cloud deployment, or path outside the list is
    authorized.
- D0 delivery is complete. Controller commit
  `484aa5c42a481efdd8e7c4a2e234c7773d7e5857`
  (`docs: establish executable technology governance`) contains exactly the 19
  authorized paths and was pushed without force to
  `feat/governed-composition-capability-foundry`. Fresh controller evidence
  records local HEAD and the upstream remote tip at that exact hash, worktree
  status count 0, and the committed accepted-state governance CLI passing. PM
  records the pushed equality and closes D0 delivery. D0 remains `accepted`;
  this delivery gate is consumed and is not replayed against later Task 1 live
  state. The PM-owned Task 1 kickoff records below form the new dirty baseline
  and do not alter the delivered D0 commit.

## Task 1 — Freeze Product Intent and Application Graph v2

State: `delivered`.

Owner: `integration` using one GPT-5.6-Sol writer.

Specialization: Graph serialization, immutable lifecycle, canonical hashing,
and compatibility boundaries.

Contract owner: `integration`.

Contract status: `frozen`.

Contract artifact:
`docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`,
authorized by accepted
`docs/adr/adr-0009-application-graph-v2-shared-contract.md`.

Allowed paths:

- `packages/graph/src/product-intent.ts`;
- `packages/graph/src/product-recipe.ts`;
- `packages/graph/src/application-graph-v2.ts`;
- `packages/graph/src/source-overlay.ts`;
- `packages/graph/src/draft-preview-snapshot.ts`;
- `packages/graph/src/application-graph-adapter.ts`;
- `packages/graph/src/index.ts`;
- `packages/graph/src/browser.ts`;
- `packages/graph/test/product-intent.test.ts`;
- `packages/graph/test/product-recipe.test.ts`;
- `packages/graph/test/application-graph-v2.test.ts`;
- `packages/graph/test/source-overlay.test.ts`;
- `packages/graph/test/draft-preview-snapshot.test.ts`;
- `packages/graph/test/application-graph-adapter.test.ts`.

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

Blocked by: none. Task 0 is accepted, and D0 delivery is closed at
`484aa5c42a481efdd8e7c4a2e234c7773d7e5857` with local HEAD verified equal to
the upstream remote tip.

Task 1 implementation checkpoint — 2026-08-12:

- Governance is already satisfied by founder-accepted ADR-0009. This wave keeps
  the current Golden runtime profile and implements only the frozen additive
  `factory.application-graph/v2` contract. Any runtime, dependency, provider,
  security boundary, serialization identifier, compatibility rule, or other
  material contract deviation stops the writer and returns to PM and technology
  governance; it is not absorbed into Task 1.
- TDD starts with focused REDs for the exact approved contracts and adversarial
  boundaries: strict Product Intent, Experience Brief, Product Recipe, surface,
  screen, Graph V2, Source Overlay, and Draft Preview Snapshot schemas; excess
  keys and package/source/provider material; duplicate or unresolved references;
  cross-surface navigation; unsafe overlays and client-writable server fields;
  immutable snapshot revision/checksum binding and legal transitions; explicit
  deploy/export/Compilation rejection; stable canonical V2 hashing; byte- and
  hash-immutable V1-to-V2 Draft upgrade; explicit V1/V2 adapters; and unknown or
  missing version rejection. The writer runs the focused Graph test after every
  RED/GREEN cycle and makes only the minimum contract-preserving implementation.
- GREEN requires `pnpm --filter @factory/graph test`,
  `pnpm --filter @factory/graph typecheck`, and
  `pnpm exec prettier --check packages/graph/src packages/graph/test`, plus a
  self-review proving browser exports contain no runtime-only dependency and the
  diff stays inside the exact 14 paths.
- One independent GPT-5.6-Sol task review then covers frozen-interface fidelity,
  lifecycle and V1 immutability, canonical hashing, fail-closed versioning,
  security/material boundaries, browser safety, and path containment. After no
  open P0/P1, one provider-free, service-free GPT-5.6-Terra QA pass reruns the
  complete Graph tests, typecheck, formatting, deterministic/hash fixtures, and
  the schema, lifecycle, adapter, overlay, and browser-export adversarial matrix.
  One final independent Sol release review and fresh PM verification are
  required before Task 1 may become `accepted` or receive commit/push authority.
- First dependency wave: exactly one Sol integration writer owns the 14 paths.
  Read-only mapping may inspect existing V1 parsers, hashes, and exports, but no
  parallel writer starts. Tasks 2 and 3 remain `planned` and blocked; Restaurant
  semantics, UI registry/source, compilers, Workbench, providers, services,
  Docker, and Compose remain unauthorized. Only after Task 1 is accepted and its
  reviewed commit is pushed may PM start Tasks 2 and 3 as the first path-disjoint
  parallel product wave. A shared-contract change stops both future lines and
  returns to this contract owner.

Task 1 frozen shared-contract checkpoint — 2026-08-12:

- This checkpoint closes implementation ambiguities inside the founder-accepted
  additive V2 decision. It does not change the Golden runtime profile, V1
  serialization or hash behavior, a security/tenant/provider boundary, a
  compiler target, a generated template, a service, Docker, or Compose. The
  exact 14-path Task 1 wave may resume against this checkpoint. Task 1 remains
  `implementing`; no review, acceptance, commit, push, or downstream-task gate
  is implied.
- The shared digest alias and strict Published V1 input envelope are exact:

  ```ts
  export type Sha256Digest = `sha256:${string}`;

  export type PublishedApplicationGraphV1Input = {
    kind: "published-application-graph";
    status: "published";
    graphVersion: "factory.application-graph/v1";
    revisionId: string;
    revisionNumber: number;
    graphHash: Sha256Digest;
    graph: ApplicationGraphV1;
  };
  ```

  The record is exact-key. `revisionNumber` is a positive integer;
  `graphVersion` must equal `graph.apiVersion`; and `graphHash` must equal the
  existing canonical `hashApplicationGraph(graph)`. Historic Published V1
  bytes and hashes are inputs only and remain immutable.

- The V1-to-V2 upgrade context, immutable new Draft envelope, and public
  signature are exact:

  ```ts
  export type ApplicationGraphV1ToV2UpgradeContext = {
    migrationVersion: "factory.application-graph-v1-to-v2/v1";
    targetDraftRevisionId: string;
    targetDraftRevisionNumber: number;
    surfaces: ApplicationSurfaceV1[];
    pageUpgrades: Array<{
      pageId: string;
      surfaceKey: string;
      screenIntent: ScreenIntentV1;
      recipe: {
        key: string;
        version: string;
        regions: Array<{ key: string; blockIds: string[] }>;
      };
    }>;
    responsiveNavigation: Array<{
      surfaceKey: string;
      compactAt: number;
      collapse: "drawer" | "tabs" | "none";
    }>;
    seedScenarios: ApplicationGraphV2["seedScenarios"];
    journeys: ApplicationGraphV2["journeys"];
    fieldAuthorities: ApplicationGraphV2["fieldAuthorities"];
    bindingPolicies: ApplicationGraphV2["bindingPolicies"];
  };

  export type ApplicationGraphV2DraftRevision = {
    kind: "application-graph-draft-revision";
    status: "draft";
    revisionId: string;
    revisionNumber: number;
    graphVersion: "factory.application-graph/v2";
    graphHash: Sha256Digest;
    graph: ApplicationGraphV2;
    lineage: {
      kind: "application-graph-v1-upgrade";
      migrationVersion: "factory.application-graph-v1-to-v2/v1";
      source: Omit<PublishedApplicationGraphV1Input, "graph">;
    };
  };

  export function upgradeApplicationGraphV1ToV2Draft(
    source: PublishedApplicationGraphV1Input,
    context: ApplicationGraphV1ToV2UpgradeContext,
  ): ApplicationGraphV2DraftRevision;
  ```

  Both inputs are strict and target revision numbers are positive integers.
  The source envelope is parsed and its version/hash binding verified before
  upgrade. `pageUpgrades` contains exactly one entry for every V1 page and no
  unknown page. The upgrade retains the V1 metadata, page base data, domain,
  policy, flow, integration, and experience base data while attaching only the
  explicit V2 context, then returns a fresh parsed V2 Graph and new canonical
  hash. It never mutates `source`, `source.graph`, or `context`. Lineage records
  the exact Published source kind, status, Graph version, revision identity,
  positive revision number, and hash, while deliberately omitting duplicate
  source Graph bytes.

- The strict Published V2 envelope, discriminated input/output unions, and
  adapter signature are exact:

  ```ts
  export type PublishedApplicationGraphV2Input = {
    kind: "published-application-graph";
    status: "published";
    graphVersion: "factory.application-graph/v2";
    revisionId: string;
    revisionNumber: number;
    graphHash: Sha256Digest;
    graph: ApplicationGraphV2;
  };

  export type PublishedApplicationGraphInput =
    PublishedApplicationGraphV1Input | PublishedApplicationGraphV2Input;

  export type AdaptedPublishedApplicationGraph =
    PublishedApplicationGraphV1Input | PublishedApplicationGraphV2Input;

  export function adaptPublishedApplicationGraph(
    input: unknown,
  ): AdaptedPublishedApplicationGraph;
  ```

  The adapter parses outer `kind`, `status`, and `graphVersion` first and
  dispatches only the exact V1 or V2 branch. It strict-parses the matching Graph,
  verifies the positive revision and canonical hash, and returns a fresh
  validated envelope on the same version branch. Extra keys, a missing,
  unknown, or mismatched version, a Draft, or a preview snapshot fail closed.
  The adapter never guesses, defaults, upgrades, or down-converts.

- `ApplicationGraphV2` gains one minimal Graph-internal journey namespace; it
  is not a seventh model-facing interface:

  ```ts
  journeys: Array<{
    key: string;
    label: string;
    actorRoleKey: string;
    flowKeys: string[];
    entryPageKey: string;
    outcome: string;
  }>;
  ```

  Journey keys are unique. `actorRoleKey` resolves to an authorization role in
  `policy.roles`; `flowKeys` is non-empty, unique within the journey, and every
  key resolves to `flow.flows[].id`; and `entryPageKey` resolves to one Graph
  page. Every embedded `ScreenIntentV1.primaryJourneyKeys` entry resolves to
  this namespace, and every Graph flow is reachable from at least one journey.
  `ProductRecipeV1.acceptanceJourneyKeys` uses the same journey-key namespace;
  it is never an alias for `ProductRecipeV1.flows`. Because a standalone
  Product Recipe does not contain a Graph, its structural parser checks exact
  keys, grammar, and uniqueness, while the deterministic recipe/composer
  admission gate must resolve those keys against the composed Graph's
  `journeys` before the Draft is valid.

- `ApplicationGraphV2` gains one intrinsic, generic authority classification
  for every domain field:

  ```ts
  fieldAuthorities: Array<{
    entityKey: string;
    fieldKey: string;
    authority: "client" | "server";
  }>;
  ```

  The tuple `(entityKey, fieldKey)` is unique and resolves exactly one declared
  Graph domain field. Every domain field has exactly one `fieldAuthorities`
  entry; unknown fields, duplicates, and omissions fail closed. This is the
  source of authority truth. It uses no field-key, entity-key, product-name, or
  regular-expression heuristic. The deterministic approved Product
  Recipe/composer alone supplies it. Provider/model output cannot supply or
  override it. Task 2 must classify server-derived totals, order state, payment
  state, inventory movement, and audit fields as `server`; client-owned input
  fields are classified explicitly as `client`.

- `ApplicationGraphV2` binds each block binding to that intrinsic field
  authority through:

  ```ts
  bindingPolicies: Array<{
    pageId: string;
    blockId: string;
    bindingKey: string;
    entityKey: string;
    fieldKey: string;
    access: "read" | "write";
    authority: "client" | "server";
  }>;
  ```

  The tuple `(pageId, blockId, bindingKey)` is unique. `pageId` resolves a Graph
  page; `blockId` resolves a block on that page; `bindingKey` resolves a key in
  that block's binding record; and `entityKey` plus `fieldKey` resolve one Graph
  domain field. Every Graph block binding has exactly one policy.
  `bindingPolicy.authority` must exactly equal the referenced
  `fieldAuthorities` entry. `access: "write"` is valid only when that intrinsic
  field authority is `client`; a server-authoritative field therefore remains
  non-writable even if a caller relabels only its binding policy as
  `{ access: "write", authority: "client" }`. The deterministic approved
  Product Recipe/composer alone owns both `fieldAuthorities` and
  `bindingPolicies`. Provider/model output cannot supply or override either,
  and `ScreenIntentV1` remains bounded product meaning rather than an authority
  channel.

- The Draft Preview Snapshot transition command/result unions and public
  signature are exact:

  ```ts
  export type DraftPreviewSnapshotTransitionCommand =
    | {
        kind: "start-rendering" | "activate";
        occurredAt: string;
        currentDraftRevisionId: string;
        currentGraphChecksum: Sha256Digest;
      }
    | { kind: "dispose" | "expire"; occurredAt: string }
    | {
        kind: "deploy" | "export" | "publish" | "create-compilation";
        occurredAt: string;
      };

  export type DraftPreviewSnapshotTransitionResult = {
    snapshot: DraftPreviewSnapshotV1;
    event: {
      kind: "draft-preview-snapshot-transition";
      snapshotId: string;
      from: DraftPreviewSnapshotV1["state"];
      to: DraftPreviewSnapshotV1["state"];
      occurredAt: string;
    };
  };

  export function transitionDraftPreviewSnapshot(
    snapshot: unknown,
    command: DraftPreviewSnapshotTransitionCommand,
  ): DraftPreviewSnapshotTransitionResult;
  ```

  Snapshot and command records are strict. `start-rendering` permits only
  `ready -> rendering`, and `activate` permits only `rendering -> active`; both
  require exact `currentDraftRevisionId` and `currentGraphChecksum` matches and
  `occurredAt < expiresAt`. `dispose` permits
  `ready|rendering|active -> disposed`. `expire` permits
  `ready|rendering|active -> expired` only when `occurredAt >= expiresAt`.
  Terminal snapshots reject every command. `deploy`, `export`, `publish`, and
  `create-compilation` always reject explicitly. A legal transition returns a
  fresh snapshot plus append-only event, never mutates either input, and keeps
  the snapshot's Draft binding and checksums identical; the event owns the
  transition timestamp because the frozen snapshot shape has no `updatedAt`.

- These types, validators, hashers, upgrade/adapter functions, and snapshot
  functions must be browser-safe exports. They add no runtime-only dependency.
  All prior Task 1 RED/GREEN, exact-scope, task-review, QA, release-review, and
  fresh-verification gates remain unchanged.

Independent Task 1 review checkpoint — 2026-08-12:

- Independent review returns `FAIL` with three P1 findings. Task 1 remains
  `implementing`; QA, release review, acceptance, commit, push, Tasks 2 and 3,
  and every product/runtime/provider/service/Docker/Compose action remain
  blocked. The same sole Sol integration writer may repair only inside the
  exact 14 Task 1 paths after this formatted freeze, followed by a fresh
  independent Task 1 re-review.
- **P1 — intrinsic field authority.** Implement the exact `fieldAuthorities`
  contract above, add it to
  `ApplicationGraphV1ToV2UpgradeContext`, copy it immutably into the new V2
  Draft, and validate total field coverage plus binding-policy equality. The
  focused fixture declares `order.total` as `server`; changing its binding
  policy to `{ access: "write", authority: "client" }` must fail. Do not add
  protected-name lists, field-key patterns, product-name branches, or other
  heuristics.
- **P1 — own `__proto__` fail-closed.** The strict Published V1 adapter test
  must construct an own enumerable nested `__proto__` key, rather than merely
  changing an object's prototype, and prove the envelope rejects it as an
  extra key before any normalization. Existing V1 parsing, canonical bytes,
  and hashes remain unchanged.
- **P1 — fixed V2 canonical hash vector.** The complete valid V2 fixture,
  including `fieldAuthorities`, must pin one exact `sha256:<64 lowercase hex>`
  result. Reordered object keys must match that fixed digest, while meaningful
  array reordering must not. A regex-only digest assertion or comparison only
  against another call to the same hasher is insufficient.

Task 1 final writer and same-Sol review handoff — 2026-08-12:

- The original Task 1 RED run recorded 51 failures out of 288 tests while the
  237 inherited Graph tests stayed green. The final focused six-file suite now
  passes 63/63, and the complete Graph suite passes 291/291 across 18 files.
  This preserves the RED-to-GREEN history rather than treating a final green
  run alone as TDD evidence.
- Final writer verification is green for Graph typecheck, Graph build, exact-14
  Prettier, `git diff --check`, generated declaration exports, browser-runtime
  imports/exports, and exact path containment: all 14 and only the 14 assigned
  Graph paths are changed. The broader
  `pnpm exec prettier --check packages/graph/src packages/graph/test` remains
  nonzero only for inherited formatting in the unmodified
  `packages/graph/test/blank-application.test.ts` and
  `packages/graph/test/hash-product-composition-diff.test.ts`; neither file is
  part of Task 1 or changed by this wave.
- Review history is closed for the QA handoff. The original independent review
  found the three P1s recorded above: missing intrinsic `fieldAuthorities`,
  insufficient own-`__proto__` V1 fail-closed proof, and no literal canonical
  V2 hash vector. All three were repaired. The same Sol re-review then found one
  inherited-object P1: a binding key named `constructor` could satisfy lookup
  through the object prototype. The writer added an own-property RED and made
  binding lookup require an own key. Final same-Sol review returns `PASS` with
  P0/P1/P2=0/0/0 and explicitly recommends `ready_for_qa`.
- Fresh PM verification reproduces the final focused 63/63 and complete
  291/291 results, typecheck, build, exact-14 Prettier, `git diff --check`,
  declaration presence, zero runtime-only imports in the browser-safe source,
  four required browser runtime exports, and containment
  `Expected=14 Actual=14 Missing=0 Unexpected=0`. PM therefore advances Task 1
  `implementing -> ready_for_qa`. This is not QA, release review, acceptance,
  delivery, commit/push authority, or permission to start Tasks 2 and 3.
- One exact-tree GPT-5.6-Terra QA pass is now authorized and is strictly
  provider-free, model-free, service-free, network-free, Docker-free, and
  Compose-free. Terra is read-only and must run:
  `pnpm --filter @factory/graph test`; the focused six Task 1 test files;
  `pnpm --filter @factory/graph typecheck`;
  `pnpm --filter @factory/graph build`; exact-14 Prettier; and
  `git diff --check`. QA must independently verify exact-14 containment,
  generated declaration exports, browser-safe import/runtime exports, fixed V2
  hashing and meaningful array order, strict unknown/extra/prototype-key
  rejection including own `__proto__` and `constructor`, total
  `fieldAuthorities` coverage and binding-policy equality, journey resolution,
  V1 byte/hash immutability and V2 Draft lineage, fail-closed Published V1/V2
  adapters, snapshot binding/transitions/prohibited actions, and Source Overlay
  containment. The two named inherited broad-Prettier warnings may be reported
  but are not repair authority. Any product defect or open P0/P1 returns Task 1
  to `implementing`; Terra changes no files.
- Tasks 2 and 3 remain `planned` and blocked. Final Sol release review, fresh PM
  acceptance verification, reviewed commit, non-force push, and local/remote
  equality are still required before any downstream implementation or delivery
  authority exists.

Task 1 Terra QA handoff — 2026-08-12:

- Independent GPT-5.6-Terra QA returns `PASS` with P0/P1/P2=0/0/0 on the exact
  `ready_for_qa` tree. QA changed no files and made no provider/model call,
  network request, service start, Docker action, or Compose action.
- Terra reproduces the complete Graph suite at 291/291 across 18 files and the
  focused six Task 1 files at 63/63 with verbose adversarial coverage. Graph
  typecheck and build pass; exact-14 Prettier and `git diff --check` pass;
  containment is 14/14 with no missing or unexpected Graph path; generated
  declaration symbols are present; the browser-safe source has zero banned
  runtime imports; and the compiled browser entry exposes the required dynamic
  exports.
- QA covers the full strict schema, literal hash, meaningful array order,
  intrinsic field-authority, binding-policy, journey, Source Overlay,
  Draft Preview Snapshot, Published V1/V2 adapter, upgrade-lineage, and V1
  byte/hash-immutability matrix. It includes missing/unknown versions, nested
  excess and own prototype-named keys, own `__proto__`, inherited
  `constructor`, unresolved references, relabeled server writes, snapshot
  binding/time/state violations, prohibited production actions, unsafe overlay
  paths, declaration visibility, and browser/runtime boundaries.
- The broad
  `pnpm exec prettier --check packages/graph/src packages/graph/test` warning is
  unchanged and inherited only:
  `packages/graph/test/blank-application.test.ts` and
  `packages/graph/test/hash-product-composition-diff.test.ts` remain unmodified
  and outside the Task 1 path set. QA correctly records them without expanding
  repair scope.
- Fresh PM reconciliation reproduces full 291/291, focused 63/63, typecheck,
  build, exact-14 Prettier, `git diff --check`, containment
  `Expected=14 Actual=14 Missing=0 Unexpected=0`, declaration symbols, zero
  banned browser-runtime imports, four browser dynamic exports, and the same two
  unmodified inherited broad-Prettier warnings. Task 1 stays `ready_for_qa`;
  this QA PASS is not release review, acceptance, delivery, commit/push
  authority, or downstream authorization.
- Exactly one independent GPT-5.6-Sol final release review is now authorized on
  this exact tree. It is read-only and provider-free, model-call-free,
  service-free, network-free, Docker-free, and Compose-free. The reviewer must
  reconcile the accepted ADR/design and frozen ledger contract, all 14 Graph
  paths, original RED and repair history, same-Sol task-review closure, Terra QA
  evidence, V1 immutability, strict/fail-closed boundaries, lifecycle and
  security invariants, browser/declaration exposure, test adequacy, and exact
  path containment. The two inherited formatting warnings are observation only
  and grant no write scope.
- Only a final Sol `ACCEPT` with no open P0/P1 permits PM to run fresh acceptance
  verification and consider Task 1 acceptance/delivery. A rejection or any open
  P0/P1 returns Task 1 to `implementing` under a newly frozen repair. Until PM
  records acceptance and the reviewed commit is pushed with local/remote
  equality, Tasks 2 and 3 remain `planned` and blocked, and no commit, push,
  product, provider, service, Docker, Compose, or downstream action is
  authorized.

Task 1 final Sol release rejection and repair freeze — 2026-08-12:

- Independent final GPT-5.6-Sol release review returns `REJECT` with
  P0/P1/P2=0/3/2. PM returns Task 1 from `ready_for_qa` to `implementing`.
  The preceding task-review and Terra QA passes remain historical evidence for
  the pre-repair tree only. They do not authorize release, acceptance,
  delivery, commit/push, or downstream work.
- P1 A — binding target integrity: every `bindingPolicies` entry must bind the
  actual block target. The corresponding own binding value must equal exactly
  `graph.domain.${entityKey}.${fieldKey}`. A policy cannot relabel another
  target, including `order.note`, as an authorized field.
- P1 B — Source Overlay root authority: `declaredSlots` never authorize a path
  outside `writableRoots`. Every normalized `declaredSlots.file` and
  `files.path` must remain strictly within `src/extensions/**`. Package
  manifests, lockfiles, configuration files, executable entry points, absolute
  paths, backslash/URL variants, dot segments, and path traversal are rejected;
  callers cannot self-authorize an out-of-root target by declaring it.
- P1 C — Published adapter record boundary: before Zod normalization, the
  adapter must recursively require plain own-property record input. Arrays are
  allowed; every record prototype must be exactly `Object.prototype` or `null`,
  and every required field must be an own property. Inherited envelope or Graph
  fields fail closed. This does not change V1 schemas, bytes, or hash behavior.
- P2 D — seed membership: required seed-field membership uses own-property
  checks only. Focused cases cover `constructor`, `toString`, and `__proto__`
  without relaxing the schema.
- P2 E — journey actor consistency: for every flow referenced by a journey,
  that journey's `actorRoleKey` must appear in every transition's `roles`.
  Existing transition permission-grant validation remains required.
- PM authorizes exactly one same-writer TDD repair inside the already frozen 14
  Graph source/test paths. The writer first adds focused RED evidence for all
  five findings, then makes the smallest GREEN implementation. No public
  schema/signature addition, path expansion, V1 mutation, runtime/dependency,
  provider/model, service, network, Docker, Compose, or product-semantic change
  is authorized. There is no accepted-design conflict.
- The repaired tree must pass the focused six-file suite, the full 18-file Graph
  suite, typecheck, build, exact-14 Prettier and containment, diff/whitespace,
  declaration and browser-runtime checks, literal hash vectors, V1 fixtures,
  and the full strict/hash/authority/journey/overlay/snapshot/Published matrix.
  The two inherited broad-Prettier warnings remain observation-only if the
  corresponding unmodified files remain outside the repair.
- Gate sequence is fixed: clean same-Sol task re-review, PM transition back to
  `ready_for_qa`, fresh exact-tree provider-free Terra QA, independent final Sol
  release review, then fresh PM acceptance reconciliation only on `ACCEPT` with
  no open P0/P1. QA, release, acceptance, delivery, commit/push, and Tasks 2–3
  remain blocked while this repair is active.

Task 1 five-finding repair and same-Sol re-review handoff — 2026-08-12:

- The writer preserved TDD evidence for the release-review repair. Before any
  production change, the focused affected set recorded 10 failures and 39
  passes. After the smallest repair, that affected set passes 49/49; the six
  Task 1 test files pass 75/75; the full Graph suite passes 303/303 across 18
  files; and the strict/hash/V1 set passes 108/108.
- All five frozen findings are closed without a public schema/signature change
  or path expansion. Binding policies now prove the exact underlying
  `graph.domain.${entityKey}.${fieldKey}` target; Source Overlay declarations
  cannot authorize paths outside normalized `src/extensions/**`; the Published
  adapter recursively enforces plain own-property records before Zod; seed
  required-field membership is own-property-only for `constructor`, `toString`,
  and `__proto__`; and each journey actor is present in every transition of
  every referenced flow while existing permission-grant checks remain intact.
- Same-Sol task re-review returns `PASS` with P0/P1/P2=0/0/0 and closes A–E.
  Fresh PM verification reproduces focused 75/75, complete 303/303,
  strict/hash/V1 108/108, typecheck, build, exact-14 Prettier,
  `git diff --check`, containment
  `Expected=14 Actual=14 Missing=0 Unexpected=0`, declaration exports, zero
  banned browser-runtime imports, and four required dynamic browser exports.
  The broad Prettier warning remains limited to the same two unmodified
  inherited tests:
  `packages/graph/test/blank-application.test.ts` and
  `packages/graph/test/hash-product-composition-diff.test.ts`.
- PM advances Task 1 `implementing -> ready_for_qa`. This transition supersedes
  the earlier QA tree but is not QA, release review, acceptance, delivery,
  commit/push authority, or permission to begin Tasks 2 and 3.
- Exactly one fresh GPT-5.6-Terra QA pass is authorized on this exact repaired
  tree. Terra is read-only and must remain provider-free, model-call-free,
  network-free, service-free, Docker-free, and Compose-free. It must reproduce
  the full 303-test Graph suite, focused six-file 75-test suite,
  strict/hash/V1 108-test suite, typecheck, build, exact-14 Prettier,
  `git diff --check`, exact path containment, declaration/browser exposure, and
  the full strict/hash/authority/journey/overlay/snapshot/Published/V1
  immutability matrix. QA must explicitly retest A–E, including exact binding
  target equality, overlay self-authorization attempts, recursive inherited
  records, prototype-named seed fields, and journey actor coverage across every
  referenced-flow transition. Terra changes no files.
- Any product defect or open P0/P1 returns Task 1 to `implementing` under a new
  PM repair freeze. A clean Terra result returns to PM for reconciliation and
  authorization of a new independent final Sol release review. Release review,
  acceptance, delivery, commit/push, and all downstream work remain blocked.

Task 1 repaired-tree Terra QA handoff — 2026-08-12:

- Fresh GPT-5.6-Terra QA returns a `PASS` recommendation on the exact repaired
  tree with P0/P1/P2=0/0/1. QA changed no files and made no provider/model call,
  network request, service start, Docker action, or Compose action. Task 1 stays
  `ready_for_qa`; this is not release, acceptance, delivery, commit/push, or
  downstream authority.
- Terra reproduces the full Graph suite at 303/303 across 18 files, the focused
  six Task 1 files at 75/75, the strict/hash/V1 set at 108/108, typecheck, build,
  exact-14 Prettier, `git diff --check`, containment 14/14 with no missing or
  unexpected path, declaration exports, zero banned browser-runtime imports,
  and all four required dynamic browser exports. The repository regression
  matrix for release findings A–E passes. The broad Prettier warning remains
  limited to the same two unmodified inherited tests and grants no repair scope.
- The single P2 is a QA-harness coverage limitation, not a demonstrated product
  defect. After three failed fixture-extraction attempts, Terra's ad hoc
  extractor could not inject a second transition for an additional journey
  actor adversarial case. The existing repository test proves E on a
  one-transition failure, and `assertJourneyActorConsistency` iterates every
  journey, every referenced flow, and every transition. PM does not authorize a
  product-code or shared-contract change for this P2; final release review must
  inspect and explicitly disposition the limitation.
- Exactly one independent GPT-5.6-Sol final release review is authorized on this
  exact repaired and QA-reviewed tree. It is read-only and must remain
  provider-free, model-call-free, network-free, service-free, Docker-free, and
  Compose-free. The reviewer reconciles the accepted ADR/design, frozen ledger,
  all 14 Graph paths, RED/GREEN and same-Sol repair review history, fresh Terra
  evidence, strict/hash/V1 and browser/declaration boundaries, all A–E repairs,
  and the open P2 harness-coverage limitation. The reviewer changes no files.
- Only a final Sol `ACCEPT` with no open P0/P1 permits PM to run fresh acceptance
  verification and consider Task 1 acceptance. A `REJECT` or any open P0/P1
  returns Task 1 to `implementing` under a new PM repair freeze. Repository
  release, delivery, commit/push, Tasks 2–3, and all downstream work remain
  blocked until PM records acceptance and the remaining delivery-policy gates
  are independently satisfied.

Task 1 Windows-safe Source Overlay repair freeze — 2026-08-12:

- Final GPT-5.6-Sol re-review returns `REJECT` with P0/P1/P2=0/1/0. The remaining
  P1 is a Windows path-alias bypass in Source Overlay validation. PM returns
  Task 1 from `ready_for_qa` to `implementing`; all preceding repair, task-review,
  and Terra evidence remains historical for the rejected tree only and grants
  no later-gate authority.
- The earlier journey QA P2 is closed without product changes. An independent
  two-transition probe passes, corroborating the repository regression and the
  production loop across every transition of every journey-referenced flow.
  It is not part of this repair.
- The exact path contract is now frozen. `safeRelativePath` rejects any segment
  containing an ASCII control character U+0000–U+001F or U+007F; any
  Windows-invalid character `<`, `>`, `:`, `"`, `|`, `?`, or `*`; a backslash;
  a trailing dot; or a trailing space. It also rejects the case-insensitive
  Windows device stems `CON`, `PRN`, `AUX`, `NUL`, `CLOCK$`, `COM1`–`COM9`, and
  `LPT1`–`LPT9`, including forms with an extension or a trailing alias.
- Paths remain relative sequences of nonempty forward-slash segments. Empty,
  `.`, and `..` segments, absolute paths, drive-prefixed paths, URLs, and path
  traversal remain invalid. Canonical keys used for uniqueness, writable-root,
  and reserved-path checks must use the Windows-safe normalized path and compare
  case-insensitively; Windows aliases cannot evade a reserved check or coexist
  as distinct slot/file paths.
- Exactly one same Sol writer is authorized to make the smallest TDD repair
  inside the already frozen 14 Task 1 Graph paths. Focused RED evidence must
  precede production changes and cover `package.json.`, `package.json `,
  `package.json::$DATA`, `main.tsx.`, ASCII-control segments, all device-stem
  families with case/extension aliases, case-only duplicate aliases, and benign
  neighboring names that must remain accepted. No schema/signature addition,
  V1 change, path expansion, runtime/dependency, provider/model, service,
  network, Docker, Compose, or product-semantic change is authorized.
- The GREEN tree must pass the affected Source Overlay tests, all six Task 1
  files, the full 18-file Graph suite, strict/hash/V1 suite, typecheck, build,
  exact-14 Prettier and containment, `git diff --check`, declaration and browser
  checks, all A–E regressions, and benign-neighbor path cases. The same two
  inherited broad-Prettier warnings remain observation-only if unchanged.
- Gate sequence is fixed: same-Sol task re-review, fresh exact-tree Terra QA,
  independent final Sol release review, then PM acceptance reconciliation only
  after `ACCEPT` with no open P0/P1. QA, release review, acceptance, repository
  release, delivery, commit/push, Tasks 2–3, and all downstream work remain
  blocked while the repair is active.

Task 1 Windows-safe repair and same-Sol re-review handoff — 2026-08-12:

- The writer preserved focused TDD evidence. Before production changes, the
  Source Overlay repair suite recorded 41 failures and 34 passes. After the
  smallest repair, Source Overlay passes 75/75; the six Task 1 files pass
  128/128; the full Graph suite passes 356/356 across 18 files; and the
  strict/hash/V1 set passes 161/161.
- The repair changes only `packages/graph/src/source-overlay.ts` and
  `packages/graph/test/source-overlay.test.ts` within the frozen 14-path Task 1
  boundary. It adds the exact Windows-invalid/control/trailing-alias/device-stem
  rejection and case-insensitive canonical comparison frozen above, with
  malicious and benign-neighbor regressions. It adds no schema/signature,
  dependency, runtime, provider, service, network, Docker, Compose, or V1
  change. All prior A–E repairs remain intact.
- Same-Sol task re-review returns `PASS` with P0/P1/P2=0/0/0. The Windows alias
  P1 is closed. Fresh PM verification reproduces Source Overlay 75/75, focused
  128/128, complete 356/356, strict/hash/V1 161/161, typecheck, build, exact-14
  Prettier, `git diff --check`, containment
  `Expected=14 Actual=14 Missing=0 Unexpected=0`, declaration exports, zero
  banned browser-runtime imports, and all four required dynamic browser exports.
  The same two unmodified inherited broad-Prettier warnings remain observation
  only.
- PM advances Task 1 `implementing -> ready_for_qa`. This is not QA, final
  release review, acceptance, repository release, delivery, commit/push, or
  downstream authority.
- Exactly one fresh GPT-5.6-Terra QA pass is authorized on this exact repaired
  tree. Terra is read-only and must remain provider-free, model-call-free,
  network-free, service-free, Docker-free, and Compose-free. It must reproduce
  Source Overlay 75/75, the focused six-file 128/128, full Graph 356/356,
  strict/hash/V1 161/161, typecheck, build, exact-14 Prettier,
  `git diff --check`, exact containment, declaration/browser exposure, and the
  complete strict/hash/authority/journey/overlay/snapshot/Published/V1
  immutability matrix. QA must independently exercise the malicious and benign
  Windows path matrix: controls, invalid characters, trailing dot/space, ADS,
  device stems and extensions, case-only collisions, case-insensitive
  root/reserved checks, traversal/drive/URL/backslash rejection, and benign
  neighboring names. Terra changes no files.
- Any product defect or open P0/P1 returns Task 1 to `implementing` under a new
  PM freeze. A clean Terra result returns to PM before any final Sol review is
  authorized. Final release review, acceptance, repository release, delivery,
  commit/push, Tasks 2–3, and all downstream work remain blocked.

Task 1 Windows-repaired Terra QA handoff — 2026-08-12:

- Fresh GPT-5.6-Terra QA returns `PASS` with P0/P1/P2=0/0/0 on the exact
  Windows-repaired tree. QA changed no files and made no provider/model call,
  network request, service start, Docker action, or Compose action. Task 1 stays
  `ready_for_qa`; this is not release review, acceptance, repository release,
  delivery, commit/push, or downstream authority.
- Terra reproduces Source Overlay 75/75, the focused six Task 1 files 128/128,
  the complete Graph suite 356/356 across 18 files, strict/hash/V1 161/161,
  typecheck, build, exact-14 Prettier, `git diff --check`, containment 14/14 with
  no missing or unexpected path, declaration exports, zero banned
  browser-runtime imports, and all four required dynamic browser exports.
- QA passes the complete malicious/benign Windows path matrix: ASCII controls,
  Windows-invalid characters and ADS, trailing dot/space aliases, every frozen
  device-stem family with mixed case and extensions, case-only collisions,
  case-insensitive root/reserved matching, traversal/drive/URL/backslash
  rejection, and benign neighboring names. All prior A–E repository regressions
  also pass. Broad Prettier still warns only on the same two unmodified inherited
  tests; that observation grants no write scope.
- Exactly one independent GPT-5.6-Sol final release review is authorized on this
  exact QA-passed tree. It is read-only and must remain provider-free,
  model-call-free, network-free, service-free, Docker-free, and Compose-free.
  The reviewer reconciles the accepted ADR/design, frozen ledger, all 14 Graph
  paths, complete RED/GREEN and repair-review history, fresh Terra evidence, V1
  immutability, strict/hash/lifecycle/security boundaries, browser/declaration
  exposure, A–E repairs, the closed journey probe, and the complete Windows path
  contract. The reviewer changes no files.
- Only a final Sol `ACCEPT` with no open P0/P1 permits PM to run fresh acceptance
  verification and consider Task 1 acceptance. A `REJECT` or any open P0/P1
  returns Task 1 to `implementing` under a new PM freeze. Repository release,
  delivery, commit/push, Tasks 2–3, and all downstream work remain blocked until
  PM records acceptance and the remaining delivery-policy gates are satisfied.

Task 1 DOS 8.3 alias repair freeze — 2026-08-12:

- Final GPT-5.6-Sol release review returns `REJECT` with P0/P1/P2=0/1/0. The
  remaining P1 is a Windows DOS 8.3 short-name bypass of Source Overlay reserved
  paths: `PACKAG~1.JSO`, `TSCONF~1.JSO`, and `VITEST~1.TS` are currently accepted.
  The reviewer confirms the first two resolve byte-identically to their reserved
  long-name targets on the exact review volume. PM returns Task 1 from
  `ready_for_qa` to `implementing`; the preceding QA pass is historical evidence
  for the rejected tree only.
- The minimal path contract is frozen: `safeRelativePath` rejects `~` in every
  path segment. This conservative lexical rule prevents DOS short-name aliases
  without filesystem resolution, runtime I/O, platform probing, or an incomplete
  long-name-to-short-name inference table. Every previously frozen Windows path
  rejection and canonical-comparison invariant remains unchanged.
- Exactly one same Sol writer is authorized to make the smallest TDD repair
  inside the frozen 14 Task 1 Graph paths, limited in practice to the Source
  Overlay source/test pair. Focused RED evidence must precede production changes
  and cover mixed-case short aliases for reserved package, configuration, and
  executable-entry paths, including the three confirmed examples, plus benign
  near-neighbor paths without a tilde that must remain accepted. The complete
  existing malicious/benign Windows matrix must remain green.
- No schema/signature addition, path expansion, V1 change, filesystem call,
  runtime/dependency, provider/model, service, network, Docker, Compose, or
  product-semantic change is authorized. Rejecting `~` is the complete repair;
  the writer must not add filesystem-dependent alias resolution.
- The repaired tree must pass the affected Source Overlay suite, all six Task 1
  files, full 18-file Graph suite, strict/hash/V1 suite, typecheck, build,
  exact-14 Prettier and containment, `git diff --check`, declaration/browser
  checks, prior A–E regressions, the closed journey probe, the full existing
  Windows matrix, new short-alias attacks, and benign no-tilde neighbors. The
  same two inherited broad-Prettier warnings remain observation-only if
  unchanged.
- Gate sequence is fixed: same-Sol task re-review, fresh exact-tree Terra QA,
  independent final Sol release review, then PM acceptance reconciliation only
  after `ACCEPT` with no open P0/P1. QA, release review, acceptance, repository
  release, delivery, commit/push, Tasks 2–3, and all downstream work remain
  blocked while this repair is active.

Task 1 DOS alias repair and same-Sol re-review handoff — 2026-08-12:

- The writer preserved focused TDD evidence: before the production change, the
  Source Overlay suite recorded 9 failures and 80 passes. After the minimal
  repair, Source Overlay passes 89/89; the six Task 1 files pass 142/142; the
  full Graph suite passes 370/370 across 18 files; and the strict/hash/V1 set,
  including the browser entry boundary, passes 176/176.
- The repair only adds `~` to the per-segment lexical rejection in
  `packages/graph/src/source-overlay.ts` and adds the frozen malicious/benign
  cases in `packages/graph/test/source-overlay.test.ts`. All prior Windows path
  cases, A–E repairs, V1 behavior, public schemas/signatures, declarations, and
  browser boundaries remain intact. No filesystem resolution or runtime I/O was
  added.
- Same-Sol task re-review returns `PASS` with P0/P1/P2=0/0/0 and closes the DOS
  alias P1. Fresh PM verification reproduces Source Overlay 89/89, focused
  142/142, complete 370/370, strict/hash/V1 176/176, typecheck, build, exact-14
  Prettier, `git diff --check`, containment
  `Expected=14 Actual=14 Missing=0 Unexpected=0`, declaration exports, zero
  banned browser-runtime imports, and all four required dynamic browser exports.
  The same two unmodified inherited broad-Prettier warnings remain observation
  only.
- PM advances Task 1 `implementing -> ready_for_qa`. This is not QA, final
  release review, acceptance, repository release, delivery, commit/push, or
  downstream authority.
- Exactly one fresh GPT-5.6-Terra QA pass is authorized on this exact repaired
  tree. Terra is read-only and must remain provider-free, model-call-free,
  network-free, service-free, Docker-free, and Compose-free. It must reproduce
  Source Overlay 89/89, focused 142/142, full Graph 370/370, strict/hash/V1
  176/176, typecheck, build, exact-14 Prettier, `git diff --check`, exact
  containment, declaration/browser exposure, and the complete
  strict/hash/authority/journey/overlay/snapshot/Published/V1 matrix. QA must
  independently retest the confirmed DOS package/configuration/entry aliases,
  mixed-case and nested tilde variants, benign no-tilde neighbors, the complete
  prior Windows malicious/benign matrix, all A–E regressions, and the closed
  journey probe. Terra changes no files.
- Any product defect or open P0/P1 returns Task 1 to `implementing` under a new
  PM freeze. A clean Terra result returns to PM before any final Sol review is
  authorized. Final release review, acceptance, repository release, delivery,
  commit/push, Tasks 2–3, and all downstream work remain blocked.

Task 1 DOS-repaired Terra QA handoff — 2026-08-12:

- Fresh GPT-5.6-Terra QA returns `PASS` with P0/P1/P2=0/0/0 on the exact
  DOS-repaired tree. QA changed no files and made no provider/model call, network
  request, service start, Docker action, or Compose action. Task 1 stays
  `ready_for_qa`; this is not release review, acceptance, repository release,
  delivery, commit/push, or downstream authority.
- Terra reproduces Source Overlay 89/89, the focused six Task 1 files 142/142,
  the complete Graph suite 370/370 across 18 files, strict/hash/V1/browser
  176/176, typecheck, build, exact-14 Prettier, `git diff --check`, containment
  14/14 with no missing or unexpected path, declaration exports, zero banned
  browser-runtime imports, and all four required dynamic browser exports.
- QA passes the confirmed DOS package/configuration/entry aliases, mixed-case
  and nested tilde variants, benign no-tilde neighbors, the complete prior
  Windows malicious/benign path matrix, all A–E regressions, and the closed
  journey probe. Broad Prettier still warns only on the same two unmodified
  inherited tests; that observation grants no write scope.
- Exactly one independent GPT-5.6-Sol final release review is authorized on this
  exact QA-passed tree. It is read-only and must remain provider-free,
  model-call-free, network-free, service-free, Docker-free, and Compose-free.
  The reviewer reconciles the accepted ADR/design, frozen ledger, all 14 Graph
  paths, complete RED/GREEN and repair-review history, fresh Terra evidence, V1
  immutability, strict/hash/lifecycle/security boundaries, browser/declaration
  exposure, A–E repairs, the closed journey probe, the complete Windows path
  contract, and DOS alias/benign-neighbor coverage. The reviewer changes no
  files.
- Only a final Sol `ACCEPT` with no open P0/P1 permits PM to run fresh acceptance
  verification and consider Task 1 acceptance. A `REJECT` or any open P0/P1
  returns Task 1 to `implementing` under a new PM freeze. Repository release,
  delivery, commit/push, Tasks 2–3, and all downstream work remain blocked until
  PM records acceptance and the remaining delivery-policy gates are satisfied.

Task 1 final acceptance and delivery-manifest freeze — 2026-08-12:

- Independent final GPT-5.6-Sol release review returns `ACCEPT` with
  P0/P1/P2=0/0/0 on the exact DOS-repaired and Terra-QA-passed tree. All prior
  release findings, including A–E, Windows aliases, DOS short names, and the
  journey multi-transition probe, are closed with no open finding.
- Fresh PM acceptance reconciliation passes the complete Graph suite 370/370
  across 18 files, focused six-file suite 142/142, Source Overlay 89/89,
  strict/hash/V1/browser 176/176, typecheck, build, exact-14 and PM-document
  Prettier, `git diff --check`, Graph containment
  `Expected=14 Actual=14 Missing=0 Unexpected=0`, generated declaration exports,
  zero banned browser-runtime imports, and all four required dynamic browser
  exports. The exact delivery manifest is
  `Expected=17 Actual=17 Missing=0 Unexpected=0`, and the non-disclosing
  sensitive-pattern scan returns zero matches. The two inherited broad-Prettier
  warnings remain outside the manifest and unchanged.
- PM marks Task 1 `accepted`. This is not delivery, integration into `main`, a
  repository release, Product Publish, cloud deployment, or authority to begin
  Tasks 2 and 3. Current branch
  `feat/governed-composition-capability-foundry` is at base
  `484aa5c42a481efdd8e7c4a2e234c7773d7e5857`, equal to its upstream before the
  Task 1 commit.

Exact Task 1 delivery manifest — 17 paths:

1. `packages/graph/src/product-intent.ts`
2. `packages/graph/src/product-recipe.ts`
3. `packages/graph/src/application-graph-v2.ts`
4. `packages/graph/src/source-overlay.ts`
5. `packages/graph/src/draft-preview-snapshot.ts`
6. `packages/graph/src/application-graph-adapter.ts`
7. `packages/graph/src/index.ts`
8. `packages/graph/src/browser.ts`
9. `packages/graph/test/product-intent.test.ts`
10. `packages/graph/test/product-recipe.test.ts`
11. `packages/graph/test/application-graph-v2.test.ts`
12. `packages/graph/test/source-overlay.test.ts`
13. `packages/graph/test/draft-preview-snapshot.test.ts`
14. `packages/graph/test/application-graph-adapter.test.ts`
15. `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
16. `docs/project-status.md`
17. `docs/roadmap.md`

Controller-only Task 1 delivery sequence:

1. Confirm the active branch, base/upstream relationship, and worktree still
   match this acceptance record. Stage exactly the 17 manifest paths by explicit
   path, with no glob, generated artifact, inherited formatting file, or other
   worktree path included.
2. Verify the staged-path set is exactly 17 with no missing or unexpected path;
   run `git diff --cached --check`; repeat the non-disclosing sensitive scan on
   the staged manifest; and stop on any mismatch, credential-like material,
   unexpected remote divergence, hook failure, or changed acceptance evidence.
3. Create one reviewed English commit with the authorized subject
   `feat(graph): add application graph v2 contracts`. Do not amend, squash
   unrelated work, rewrite history, or force any Git operation.
4. Push the current iteration branch normally and without force. Do not merge
   `main`, create a tag or repository release, invoke Product Publish, or run a
   provider, model, network service, Docker, or Compose workflow as part of this
   delivery.
5. Verify the post-push local `HEAD` equals the upstream branch tip and report
   the commit hash plus equality evidence to PM. Tasks 2 and 3 remain `planned`
   and blocked until PM records that exact local/remote equality and closes Task
   1 delivery.

Task 1 delivery closure — 2026-08-12:

- Controller commit `a6e4e6945e79f7ca7cf93686ee00628534f98acd`
  has the exact reviewed subject
  `feat(graph): add application graph v2 contracts` and contains exactly the
  frozen 17-path manifest: 14 Task 1 Graph paths plus this ledger, project
  status, and roadmap.
- The commit was pushed without force to
  `feat/governed-composition-capability-foundry`. Fresh post-push evidence
  records local `HEAD` and the upstream branch tip at the same exact hash, with
  an empty worktree. PM therefore records Task 1 as `delivered`, closes and
  consumes its delivery gate, and does not replay it against later work.
- Delivery does not authorize integration into `main`, a tag or repository
  release, Product Publish, cloud deployment, providers, models, services,
  Docker, or Compose. Task 2 and Task 3 may start only if their shared
  Restaurant key, journey, and binding contract is fully compatible with the
  delivered Task 1 contract and any new technology intake has completed its
  governance gate.

## Task 2 — Compose one deterministic Restaurant Product Recipe

State: `delivered`.

Owner: exactly one GPT-5.6-Sol `backend` writer; `integration` remains contract
owner.

Specialization: deterministic Restaurant domain, policy, flow, journey,
authority, seed, and two-surface composition semantics.

Contract owner: `integration`.

Contract status: `refrozen` for `factory.product-recipe/v2` after delivery at
`0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`. Formatted shared-manifest SHA-256:
`ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.

Contract artifact: the delivered Graph V3 contract plus frozen artifact
`docs/superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`.
Its active implementation plan is
`docs/superpowers/plans/2026-08-12-restaurant-product-recipe-task2.md`.
Accepted ADR-0011 and delivered Product Recipe V2 close the prior serialization
block while preserving V1.

Exact writer paths:

- `packages/capabilities/src/commerce/product-recipe.ts`;
- `packages/capabilities/src/restaurant/product-recipe.ts`;
- `packages/capabilities/src/restaurant/product-graph.ts`;
- `packages/capabilities/src/capability-catalogue.ts`;
- `packages/capabilities/src/plan-alternatives.ts`;
- `packages/capabilities/src/product-composer.ts`;
- `packages/capabilities/src/index.ts`;
- `packages/capabilities/test/restaurant-product-recipe.test.ts`;
- `packages/capabilities/test/restaurant-product-composition.test.ts`;
- `packages/capabilities/test/product-composer.test.ts`;
- `packages/capabilities/test/restaurant-product-fixture.ts`.

Acceptance evidence:

- one approved recipe selects the two surfaces, fifteen named screens, roles,
  capabilities, flows, seed scenarios, and journeys;
- it composes catalog, modifiers, pricing, cart, server totals, order,
  idempotency, inventory, audit, simulated payment, identity, and policy;
- restaurant table, availability, kitchen, fulfillment, and reporting semantics
  are present;
- repeated fixture composition produces the same Graph and hash.

Resolved prerequisite notes:

- delivered V3 step-scoped actors preserve the multi-role order lifecycle;
- the shared manifest freezes the exact fifteen pages, recipes, registry/block
  keys, authority classifications, flow coverage, and legacy mapping;
- the two legacy actorless expiry paths gain explicit manager grants only in
  the deterministic V3 product layer; the legacy V1 profile stays unchanged.

Authorization: the sole writer may execute focused RED/GREEN in exactly the
eleven paths above from base `0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`.
Product output must parse through `assertProductRecipeV2`; V1 remains immutable.
Use relevant compatibility gates and one independent code review. No
dependency, install, provider/model/network/service, Docker, Compose, commit,
push, hidden navigation, or V2-to-V1 down-conversion is authorized.

## Task 3 — Establish the UI Registry and shared source foundation

State: `delivered`.

Owner: exactly one GPT-5.6-Terra `frontend` writer; `integration` remains shared
contract owner.

Specialization: reuse-first UI source registry, accessible primitives and
patterns, generated business blocks, screen/experience/product recipes,
provenance, and source ownership.

Contract owner: `integration` for shared keys and bindings; `frontend` for the
registry implementation after contract and governance acceptance.

Contract status: `refrozen` for Product Recipe V2 at formatted shared-manifest
SHA-256 `ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732` on base
`0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`.

Contract artifact: the same required
`docs/superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`
plus accepted technology-governance ADR
`docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`
which rejects copied shadcn/ui source and new direct Radix dependencies in this
wave. A pinned source-study record is outside this wave and is required only if
a later demonstrated gap starts a separately governed source-intake decision.

Active implementation plan:
`docs/superpowers/plans/2026-08-12-ui-registry-task3.md`.

Exact writer boundaries; the preserved inventory and 21 scaffolds are the
starting baseline:

- `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`;
- `pnpm-lock.yaml`, limited to seven new workspace importers and the exact
  already locked ADR-0010 coordinates;
- `packages/ui-primitives/package.json`;
- `packages/ui-primitives/tsconfig.json`;
- `packages/ui-primitives/src/index.ts`;
- `packages/ui-primitives/src/components/**`;
- `packages/ui-primitives/THIRD_PARTY_NOTICES.md`;
- `packages/ui-primitives/test/components.test.tsx`;
- `packages/ui-patterns/package.json`;
- `packages/ui-patterns/tsconfig.json`;
- `packages/ui-patterns/src/index.ts`;
- `packages/ui-patterns/src/navigation/**`;
- `packages/ui-patterns/src/forms/**`;
- `packages/ui-patterns/src/feedback/**`;
- `packages/ui-patterns/test/pattern-contracts.test.tsx`;
- `packages/workbench-ui/package.json`;
- `packages/workbench-ui/tsconfig.json`;
- `packages/workbench-ui/src/index.ts`;
- `packages/workbench-ui/src/**`;
- `packages/workbench-ui/test/**`;
- `packages/generated-ui/package.json`;
- `packages/generated-ui/tsconfig.json`;
- `packages/generated-ui/src/index.ts`;
- `packages/generated-ui/src/customer/**`;
- `packages/generated-ui/src/merchant/**`;
- `packages/generated-ui/src/states/**`;
- `packages/generated-ui/test/restaurant-blocks.test.tsx`;
- `packages/screen-recipes/package.json`;
- `packages/screen-recipes/tsconfig.json`;
- `packages/screen-recipes/src/customer/**`;
- `packages/screen-recipes/src/merchant/**`;
- `packages/screen-recipes/src/index.ts`;
- `packages/screen-recipes/test/restaurant-screens.test.ts`;
- `packages/experience-recipes/package.json`;
- `packages/experience-recipes/tsconfig.json`;
- `packages/experience-recipes/src/fine-dining.ts`;
- `packages/experience-recipes/src/index.ts`;
- `packages/experience-recipes/test/fine-dining.test.ts`;
- `packages/product-recipes/package.json`;
- `packages/product-recipes/tsconfig.json`;
- `packages/product-recipes/src/restaurant-ordering.ts`;
- `packages/product-recipes/src/index.ts`;
- `packages/product-recipes/test/restaurant-product.test.ts`.

No root workspace manifest, external version/resolution change, runtime,
provider, service, Docker, or Compose path is authorized. Any expansion returns
to PM and technology governance before writing.

Acceptance evidence:

- task hand-off records the searched template/registry inventory, reused keys
  and paths, parameterization, rejected candidates, and any functional gap that
  justified new source;
- the experiment uses only the accepted React, TypeScript, Vitest, and Lucide
  coordinates; copied shadcn/ui source and new direct Radix dependencies are
  absent;
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

Resolved prerequisite notes:

- delivered V3 provides exact Domain/Flow/Policy policy discriminators and the
  shared manifest assigns each actual block port;
- the exact page, recipe, block, slot, port, authority, and registry namespaces
  are frozen;
- ADR-0010 and the shared manifest constrain the seven-package experiment;
  copied shadcn/ui source and direct Radix dependencies remain rejected.

Authorization: the sole writer may execute focused RED/GREEN within the exact
boundaries above. The current inventory and 21 scaffolds contain no accepted
behavior and must be extended, not discarded. They can begin RED/source work
without an install, but full cross-package resolution cannot complete because
the seven lock importers and local workspace links are absent. Exactly one
direct-pnpm offline reconciliation is authorized to add only those importers,
already locked coordinates, and ignored local links. No network, new
coordinate, version/resolution drift, root workspace edit, broader lock diff,
provider/model/service, Docker, Compose, commit, or push is authorized. Use
relevant compatibility gates and one independent code review.

Task 2/Task 3 first-wave gate audit — 2026-08-12:

- Task 1 delivery equality is satisfied, but equality alone is insufficient for
  parallel dispatch. Read-only repository audit confirms the delivered Graph
  suite at 370/370 and finds the three material conflicts above. Existing
  Restaurant entity, role, flow, and block vocabulary is reusable evidence, but
  its legacy screens/routes are not the new fifteen-screen contract.
- The first wave therefore does not start. Tasks 2 and 3 remain path-disjoint
  prospective tasks with zero immediate writer authority; no writer may create
  aliases, split flows, relabel Graph bindings, or select dependencies to work
  around the missing shared decision.
- Tech Lead ADR-0010 recommends: `keep` the accepted Golden runtime and
  immutable Graph V1/V2; `migrate` the Restaurant product additively to
  `factory.application-graph/v3` with step-scoped journey actors, typed
  Domain/Flow/Policy policies, explicit V2-to-V3 Draft lineage, and
  `factory.draft-preview-snapshot/v2`; `experiment` with the seven private
  version `0.1.0` UI/recipe workspace packages using only the accepted React,
  TypeScript, Vitest, and Lucide coordinates; and `reject` copied shadcn/ui
  source or new direct Radix dependencies in this wave. Flow and Policy
  bindings remain non-authoritative client declarations and every state change
  remains subject to server tenant, actor, policy, transition, revision,
  idempotency, and concurrency checks.
- Founder acceptance checkpoint — 2026-08-12: the founder explicitly accepted
  ADR-0010 in founder chat with the verbatim response `接受`. The founder also
  wrote verbatim `Task 2/3 也授权，如果需要`; PM records that second response as
  conditional future authorization, not immediate dispatch. Tasks 2 and 3 may
  start without another founder prompt only after Graph V3 passes review, QA,
  release review, PM acceptance, one reviewed commit and non-force push with
  local/upstream equality, and PM freezes their exact shared Restaurant
  key-and-binding manifest with disjoint paths.
- PM therefore opens one serialized Graph V3 prerequisite under
  `docs/superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md`.
  Until that prerequisite is delivered and the shared manifest is frozen, Tasks
  2 and 3 stay `planned` with zero writers. Any shared-contract change stops both
  and returns to the Graph contract owner.
- Graph V3 prerequisite freeze — 2026-08-12: state `implementing`, contract
  `frozen`, owner one GPT-5.6-Sol integration writer. Exact implementation plan:
  `docs/superpowers/plans/2026-08-12-application-graph-v3-prerequisite.md`.
  Writer ownership is exactly ten paths: new Graph V3 and Snapshot V2 source and
  tests; Graph adapter, adapter test, Node export, and browser export; compiler
  facade and one version-dispatch test. The full exact manifest and public
  signatures are in the prerequisite ledger. No other path and no commit/push is
  authorized for the writer.
- Reconciliation corrects one prior assumption: the delivered compiler still
  consumes only legacy V1 `PublishedGraphInput`; it does not compile V2. The
  frozen additive entry strict-adapts Published V1/V2/V3, delegates V1
  byte-identically to the legacy compiler, and rejects valid V2/V3 with exact
  unsupported-version errors. V3 compilation is deferred to a later frozen
  compiler-target task; no projection or down-conversion is allowed.
- Fresh pre-RED baseline passes Graph 18 files/370 tests plus typecheck/build and
  compiler 22 files/403 tests. Sol task review, provider-free Terra QA, final Sol
  release review, fresh PM acceptance, and one controller-only reviewed
  commit/non-force push with equality are mandatory before Task 2/3 manifest
  freeze or writer dispatch.

Graph V3 prerequisite writer/review checkpoint — 2026-08-12:

- The exact ten-path implementation is handed off and the sole Sol writer is
  paused. Initial RED was Graph 6 failed/12 passed and compiler dispatch 7/7
  failed with production untouched. Final writer evidence includes focused Graph
  51/51, compiler dispatch 8/8, strict-wrapper RED 1/8 to GREEN 8/8, migration
  `DataCloneError` RED 1/18 to GREEN 18/18, full compiler 411/411, and full Graph
  initially 406 then repaired to 414/414.
- Independent Sol task review found one P1 family in recursive Published/context
  handling of symbol-keyed and non-enumerable own properties. Repair RED was
  adapter 8 failed/18 passed; GREEN is adapter 26/26, focused compatibility
  85/85, compiler dispatch 8/8, plus green typecheck, build, exact-10 formatting,
  diff, 10/10 containment, declarations, browser exports, and banned-import
  checks.
- Final same-Sol re-review returns specification `COMPLIANT`, code quality
  `APPROVED`, P0/P1/P2=0/0/0, independent adapter 26/26, and all 8/8 adversarial
  probes rejected. PM advances only the serialized Graph V3 prerequisite to
  `ready_for_qa`.
- Exactly one fresh, read-only GPT-5.6-Terra QA pass is authorized on the exact
  reviewed tree and complete frozen matrix. It must be provider/model/network/
  service/Docker/Compose-free and change no files. Task 2 and Task 3 stay
  `planned` with zero writers. Final release review, acceptance, the exact
  16-path delivery, commit, push, shared-manifest freeze, and downstream work
  remain unauthorized.

Graph V3 prerequisite Terra QA checkpoint — 2026-08-12:

- The single authorized exact-tree Terra pass is consumed and returns `PASS`
  with P0/P1/P2=0/0/0. Evidence is focused Graph 59/59, broader behavioral
  matrix 71/71, compiler dispatch 8/8, full Graph 20 files/414 tests, and full
  compiler 23 files/411 tests.
- Graph/compiler typecheck and build, exact-10 Prettier, diff, implementation
  containment 10/10, delivery containment 16/16, declarations 21/21, dynamic
  browser exports 8/8, zero banned Node imports in the browser closure, and zero
  changed-hunk sensitive-material matches all pass. The only warning is the
  inherited non-failing Node `punycode` deprecation warning.
- Terra made no edit and used no provider, model, network, service, Docker, or
  Compose action. The prerequisite remains `ready_for_qa`.
- Exactly one independent read-only GPT-5.6-Sol final release review is now
  authorized on the exact Terra-passed tree under the release-review skill. It
  must inspect the actual diff, call paths, tests, threat model, delivery policy,
  ADR, ledger, plan, and exact containment, then return explicit `ACCEPT` or
  `REJECT` plus P0/P1/P2 and actionable file/line evidence. Task 2 and Task 3
  remain `planned` with zero writers; acceptance, delivery, commit, push,
  shared-manifest freeze, and downstream work remain blocked pending final Sol
  `ACCEPT` with no open P0/P1 and fresh PM reconciliation.

Graph V3 prerequisite final-release rejection — 2026-08-12:

- Final Sol release review returns `REJECT` with P0/P1/P2=0/2/0. Focused Graph
  59/59 and compiler dispatch 8/8 still pass, proving a matrix gap. PM returns
  only the Graph V3 prerequisite from `ready_for_qa` to `implementing`; the prior
  Terra PASS is historical evidence, not acceptance or delivery authority.
- P1 A: adapter recursive arrays accept `Array` subclasses/custom prototypes and
  copy through caller-controlled instance `.map()`. The repair requires standard
  dense arrays, own enumerable data descriptors, descriptor-value/manual copy,
  and no accessor, inherited index, iterator, or caller-method execution across
  Published V1/V2/V3 and V2-to-V3 contexts.
- P1 B: direct Graph V3 and Snapshot V2 schema/assert/hash/transition APIs allow
  Zod normalization to hide inherited fields and symbol-keyed, non-enumerable,
  accessor, or nested hostile extras. The same recursive all-own plain-record/
  plain-array boundary must govern Node/browser direct APIs and exported schemas.
- The same sole Sol writer is authorized for focused RED→GREEN in exactly six
  paths: adapter source/test, Graph V3 source/test, and Snapshot V2 source/test.
  No signature, schema field, serialized version, compiler, dependency, shared
  source, or manifest expansion is authorized.
- Required gates are same-Sol task re-review, fresh Terra QA, a new independent
  final Sol release review, then fresh PM reconciliation only on explicit
  `ACCEPT` with no open P0/P1. Acceptance, delivery, commit, push, shared
  Restaurant manifest freeze, and Task 2/Task 3 writers remain blocked.

Graph V3 recursive-boundary repair checkpoint — 2026-08-12:

- The six-path writer handoff records adapter P1 A RED 20 failed/26 passed and
  direct Graph V3/Snapshot V2 P1 B RED 15 failed/41 passed with production
  untouched. GREEN is combined repair 110/110, compatibility 180/180, full
  Graph 465/465, compiler 411/411, and dispatch 8/8.
- Typecheck/build, exact-10 format, diff, repair 6/6, implementation 10/10,
  delivery 16/16, declarations, browser exports/import closure, sensitive scan,
  and pinned-hash gates all pass. The inherited non-failing `punycode` warning
  is unchanged.
- Same-Sol re-review returns specification `COMPLIANT`, code quality `APPROVED`,
  P0/P1/P2=0/0/0, and `ready_for_qa: yes`. Its independent hostile probe reports
  121 checks, zero failures, and zero caller invocations.
- PM advances only the Graph V3 prerequisite to `ready_for_qa` and authorizes
  exactly one fresh read-only Terra QA pass on the exact repaired tree. Terra
  must repeat both complete hostile-array and direct Graph/Snapshot boundary
  matrices plus all frozen gates without provider, model, network, service,
  Docker, Compose, or file edits.
- A new final Sol release review is not yet authorized. Acceptance, delivery,
  commit, push, shared Restaurant manifest freeze, and Task 2/Task 3 writers
  remain blocked pending Terra reconciliation.

Graph V3 repaired-tree Terra checkpoint — 2026-08-12:

- Fresh repaired-tree Terra QA returns `PASS`, P0/P1/P2=0/0/0. It passes
  focused repair 110/110, compatibility/browser 180/180, hostile arrays 28/28,
  direct Node/browser V3/Snapshot boundaries 23/23, corrected independent helper
  6/6 with zero caller invocation, compiler dispatch 8/8, full Graph 465/465,
  and compiler 411/411.
- Typecheck/build/format/diff, exact repair/implementation/delivery containment
  6/10/16, declarations 23/23, identical browser exports 8/8, zero banned Node
  imports, pinned hashes 3/3, zero sensitive matches, and no drift all pass.
- The initial helper anomaly was caused only by inverted helper expectations and
  object spread. The corrected probe is green; QA records no product finding,
  made no edit, and used no provider, model, network, service, Docker, or Compose
  action. The single Terra authority is consumed; V3 remains `ready_for_qa`.
- Exactly one new independent read-only Sol final release review is authorized
  against the repaired exact tree under the release-review skill. It must return
  `RELEASE_ACCEPT` or `RELEASE_REJECT` with P0/P1/P2 and evidence. Acceptance,
  delivery, commit, push, the shared Restaurant manifest, and Task 2/Task 3
  writers remain blocked pending `RELEASE_ACCEPT` with no open P0/P1 and fresh
  PM reconciliation.

Graph V3 compiler-wrapper release rejection — 2026-08-12:

- New independent final Sol review returns `RELEASE_REJECT`, P0/P1/P2=0/1/0.
  The prior strict-array and direct Graph V3/Snapshot V2 P1 families remain
  closed and there is no other finding. PM returns only the V3 prerequisite to
  `implementing`.
- The versioned compiler wrapper checks plain prototype, exact own-key count,
  and key ownership but then dereferences the two required properties. Accessor
  required fields execute—independent probe calls=1—and non-enumerable required
  data fields are accepted.
- The same sole Sol writer is authorized for RED→GREEN only in compiler
  `src/index.ts` and `test/application-graph-version-dispatch.test.ts`. Both
  required fields must be own enumerable data descriptors, accessor and hidden
  required fields must fail with the unchanged exact wrapper error and zero
  calls, and production must consume descriptor values only. Valid V1 byte
  parity and V2/V3 unsupported controls remain exact.
- No public contract, error, Graph schema, serialized version, target, template,
  dependency, or manifest expansion is authorized. Same-Sol task re-review,
  fresh Terra QA, and another final Sol release review are mandatory.
- Acceptance, delivery, commit, push, shared Restaurant manifest freeze, and
  Task 2/Task 3 writers remain blocked. This is the third failed repair/review
  cycle; any further rejection or scope/path change stops another writer round
  pending controller governance escalation.

Graph V3 compiler-wrapper repair checkpoint — 2026-08-12:

- Compiler RED is 4 failed/8 passed with production untouched. GREEN is focused
  dispatch 12/12, full compiler 415/415, Graph 465/465, prior hostile matrix
  110/110, and compatibility/browser 180/180.
- Typecheck/build/format/diff, exact 2/10/16 containment, declarations, browser
  export/import closure, sensitive scan, and pinned-hash gates all pass.
- Same-Sol re-review returns `COMPLIANT`/`APPROVED`, P0/P1/P2=0/0/0, and
  `ready_for_qa: yes`. Independent descriptor probes reject accessors and hidden
  data for both wrapper fields with the exact error and zero calls; symbol,
  inherited, and non-plain cases, parity, ordering, and V2/V3 errors remain
  exact.
- PM advances only V3 to `ready_for_qa` and authorizes exactly one fresh
  read-only Terra QA pass on the compiler-repaired exact tree. Terra must repeat
  the complete descriptor matrix and every frozen Graph/compiler gate without
  provider, model, network, service, Docker, Compose, or file edits.
- Final release review, acceptance, delivery, commit, push, shared Restaurant
  manifest freeze, and Task 2/Task 3 writers remain blocked. The third-cycle
  escalation stays active.

Graph V3 compiler-repaired Terra checkpoint — 2026-08-12:

- Terra QA returns `PASS`, P0/P1/P2=0/0/0. It passes dispatch 12/12, hostile
  Graph 110/110, compatibility/browser 180/180, Graph 465/465, independent
  descriptor probe 13/13 with exact rejection/zero calls and V1/V2/V3 ordering
  and parity, direct Graph/Snapshot probe 8/8 with zero calls, type/build/format/
  diff, 2/10/16 containment, declarations 23/23, browser 8/8, zero imports and
  sensitive matches, and all three pins.
- Full compiler ran three times with exit code 0, but captured aggregate stdout
  truncated after database parity. Terra transparently does not claim a precise
  415 count from that output; prior writer/reviewer/PM 415/415 evidence remains
  separate. This is an evidence-capture limitation, not a product defect.
- Terra found no drift, changed no file, and used no provider, model, network,
  service, Docker, or Compose action. V3 remains `ready_for_qa`.
- Under the recorded third-cycle escalation, exactly one final independent
  read-only Sol release review is authorized. It must adjudicate the compiler
  evidence limitation and return `RELEASE_ACCEPT` or `RELEASE_REJECT` with
  P0/P1/P2 and evidence. Acceptance, delivery, commit, push, shared Restaurant
  manifest freeze, and Task 2/Task 3 writers remain blocked; no further writer
  round is pre-authorized.

Graph V3 final acceptance and delivery freeze — 2026-08-12:

- Escalated final independent Sol returns `RELEASE_ACCEPT`, P0/P1/P2=0/0/0.
  Compiler descriptor probe 70, adapter probe 10, and direct/browser Graph/
  Snapshot probe 70 all pass with zero getter/caller invocation. Both prior
  Graph P1 families and the compiler P1 are closed; there is no other finding.
- Final evidence passes focused Graph/browser 111/111, dispatch 12/12, Graph
  465/465, compiler 23 files/415 tests with raw exit 0, both typechecks, exact-10
  format/diff, implementation 10/10 and delivery 16/16 containment,
  declarations 23/23, browser 8/8, zero imports/sensitive matches, and all pins.
  Complete final-review and PM compiler output resolves Terra's earlier
  truncated-output limitation.
- PM marks only the Graph V3 prerequisite `accepted` (not delivered). Controller
  delivery is authorized for exactly the frozen 16 paths and exact subject
  `feat(graph): add application graph v3 contracts` after explicit staging,
  staged equality/diff/sensitive checks, and all frozen gates.
- The controller may push only without force and must prove local `HEAD` equals
  upstream with a clean tree. PM must record the commit, exact paths, push, and
  equality before consuming the gate.
- Task 2 and Task 3 remain `planned` with zero writers. Their shared
  key-and-binding manifest may be frozen only after PM records V3 delivery
  equality; acceptance alone does not start them.

Graph V3 delivery and Restaurant first-wave freeze — 2026-08-12:

- Controller delivered exact commit
  `8230197241589865f289c223fc346b6d91a438ae` with subject
  `feat(graph): add application graph v3 contracts` and exactly the frozen 16
  paths. The non-force push succeeded; local `HEAD` equals upstream at the same
  hash and the delivered baseline is clean. Pre-stage focused 111/111,
  dispatch 12/12, Graph 465/465, compiler 415/415, typecheck/build, format/diff,
  declarations/browser/import, manifest, and sensitive gates passed. Staged
  Expected16/Actual16 equality had no missing, unexpected, unstaged, or
  untracked path. PM marks V3 `delivered` and consumes its delivery authority.
- The versioned shared contract is frozen at
  `docs/superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`.
  Its formatted SHA-256 is
  `75d67d44e922c3064fd5a63fc877366e2d17259be4fcebace1adbc4a6a8a4423`.
  It fixes the exact two surfaces, fifteen pages/routes/recipes and legacy map,
  registry namespaces, closed field-authority classification, three flow keys,
  seven step-scoped journeys, transition/UI Policy keys, and every page/block
  Domain/Flow/Policy binding. The legacy actorless table-session expiry paths
  receive explicit manager V3 grants and Policy permissions; V1/V2 remain
  immutable. No new architecture ambiguity remains.
- Task 2 advances to `implementing` under one GPT-5.6-Sol backend writer with
  exactly the eleven capability paths above and plan
  `docs/superpowers/plans/2026-08-12-restaurant-product-recipe-task2.md`.
  Task 3 advances to `implementing` under one GPT-5.6-Terra frontend writer with
  exactly the seven package boundaries, internal reuse-inventory record, and
  lockfile importer-only boundary above and plan
  `docs/superpowers/plans/2026-08-12-ui-registry-task3.md`.
- ADR-0010 remains controlling: the Golden runtime and immutable Graph V1/V2
  are kept; the private packages are an experiment on only the accepted locked
  coordinates; copied shadcn/ui source, direct Radix, another external
  dependency/version, provider/model/network/service code, Docker, and Compose
  remain rejected. Actual browser screenshots are a Task 4/5 runtime gate;
  Task 3 owns deterministic screenshot-state declarations without adding a
  browser dependency.
- The paths are disjoint. A missing or changed shared key, field, authority,
  journey, binding port, dependency/source requirement, or Graph contract stops
  both writers immediately and returns to PM/integration ownership. Neither
  task has commit/push authority. Each must complete focused RED→GREEN, one
  independent Sol task review, fresh Terra QA, independent Sol release review,
  PM acceptance, and controller-only delivery. Tasks 4/5 and every downstream
  product/delivery action remain blocked.

Task 2/Task 3 shared-contract stop-both — 2026-08-12:

- Before Task 2 wrote a test or production path, the backend writer proved the
  exact fifteen-screen manifest cannot satisfy delivered `ProductRecipeV1`.
  `assertProductRecipe` derives a surface's complete ownership set only from
  `entryPageKey` and visible `navigation.items[].pageKey`, then rejects every
  screen outside that set.
- The frozen manifest deliberately owns `customer-dish-detail`,
  `customer-checkout`, and `customer-order-detail` on `customer-mobile` while
  omitting them from the exact bottom-tab sequence. Adding hidden or duplicate
  tab items would violate the product contract and is prohibited. Task 2 made
  zero capability-path writes.
- Task 3 stopped immediately. Its dirty baseline is one reuse-inventory record
  plus exactly 21 untracked scaffold files: a manifest, tsconfig, and test in
  each of seven private packages. No `src/**` file or lockfile diff exists. The
  attempted package test stopped before behavior because package-local
  dependency tooling was unavailable; it is not RED evidence.
- PM invokes the shared-contract stop rule. Task 2 and Task 3 return to
  `planned`; both contract statuses are `blocked`; all writer, install,
  dependency-resolution, commit, push, provider/model/network/service, Docker,
  and Compose authority is revoked. Existing dirty work must be preserved.
- This is a stable serialization trigger. Accepted ADR-0010 does not authorize
  changing Product Recipe ownership. Proposed
  `docs/adr/adr-0011-product-recipe-surface-page-ownership.md` must preserve V1
  bytes,
  parsing, and hashes; explicitly separate owned page keys from visible
  navigation in an additive version; reject unknown, missing, duplicate, and
  cross-surface ownership; and require explicit founder acceptance. Only then
  may PM freeze one serialized prerequisite writer and exact paths/gates before
  refreezing this shared manifest and resuming the parallel wave.

ADR-0011 acceptance and Product Recipe V2 prerequisite freeze — 2026-08-14:

- The founder responded in founder chat exactly
  `参考以下总结，若符合项目目标，则持续接受而迭代。` PM confirms that the referenced
  summary matches current repository evidence and the accepted Restaurant
  product goal. It recommends ADR-0011 and continued delivery of the documented
  vertical slice, so PM records ADR-0011 `Accepted` on 2026-08-14.
- The accepted decision keeps Product Recipe/Application Surface V1 immutable
  and adds `factory.product-recipe/v2` plus
  `factory.application-surface/v2`. V2 surface `ownedPageKeys` is required,
  non-empty, bounded at 100, ordered, and unique; it is the complete owner set,
  while navigation remains visible navigation only. Every screen has exactly
  one owner; entry and visible navigation are subsets of the same surface's
  ownership.
- The exact public V2 API, semantic errors, strict hostile own-data boundary,
  one-way V1 Draft adapter, no-down-conversion rule, four-path manifest, TDD
  matrix, and acceptance/delivery sequence are frozen in
  `docs/superpowers/ledgers/2026-08-14-product-recipe-v2-prerequisite.md` and
  `docs/superpowers/plans/2026-08-14-product-recipe-v2-prerequisite.md`.
- Local `HEAD` and upstream are equal at delivered Graph V3 commit
  `8230197241589865f289c223fc346b6d91a438ae`. Task 2 still has zero
  capability-path writes. Task 3's one reuse inventory plus exactly 21 scaffold
  files remain preserved with no `src/**` or lockfile diff.
- Exactly one GPT-5.6-Sol integration writer is authorized for only
  `packages/graph/src/product-recipe.ts`,
  `packages/graph/test/product-recipe-v2.test.ts`,
  `packages/graph/test/product-recipe.test.ts`, and
  `packages/graph/test/browser-entry.test.ts`. The writer does not stage,
  commit, or push. No Task 2 or Task 3 writer is authorized.
- Because this is a serialized contract, it must pass focused RED/GREEN, one Sol
  task review, fresh read-only Terra QA, independent Sol release review, fresh
  PM acceptance, and controller-only delivery/non-force push with local/upstream
  equality. The later accepted delivery manifest and preserved residual baseline
  are frozen below. Only after equality may PM amend/refreeze the Restaurant
  manifest and resume Task 2/Task 3.
- Prospectively, the heavy gate is reserved for serialized/cross-package
  contracts, security/authority boundaries, and final release. Ordinary
  deterministic component/page work inside accepted scope uses TDD plus one
  independent review. Repair caps govern real-model/high-cost reruns, not
  ordinary provider-free local fixes. Founder reapproval is not required for
  an ordinary P1 or reversible in-scope choice; it remains required for product
  scope change, irreversible architecture, external credentials/authority,
  cloud/deployment, or a surviving load-bearing issue.
- There is no material contract ambiguity. Any V1 behavior change, seventh
  implementation path, dependency, down-conversion, inferred ownership, hidden
  navigation, new serialized field, external authority, or irreversible
  architecture decision stops the writer and returns to PM.

Product Recipe V2 final acceptance and delivery freeze — 2026-08-14:

- The final independent Sol release review returns `RELEASE_ACCEPT`, actionable
  P0/P1/P2=0/0/0, with the separately deferred/prohibited nested-Zod P2. The
  direct-runtime Terra recheck and every frozen contract, compatibility,
  hostile-boundary, type, format/diff, browser/hash, restoration, and exact-four
  containment gate remain green. No further QA or review is required.
- Fresh PM reconciliation accepts the Product Recipe V2 prerequisite on
  2026-08-14. Controller delivery is authorized for exactly 17 paths: the four
  Product Recipe V2 implementation paths plus 13 deliberate governance records
  that make the founder decision, Graph V3 closure, current status/policy, shared
  contract, and inactive downstream plans self-contained. The exact subject is
  `feat(graph): add product recipe v2 contracts`; push is non-force.
- The Task 3 reuse inventory plus 21 package scaffolds are the exact excluded
  22-path residual baseline. They are not staged, deleted, stashed, committed,
  or claimed as accepted behavior. Delivery requires Expected17/Actual17 staged
  equality, cached diff/sensitive PASS, workspace/lock restoration, local
  `HEAD` equal to upstream after push, and post-push dirty equality to exactly
  those 22 residual paths rather than a globally clean worktree.
- Task 2 and Task 3 remain `planned`/blocked until PM records pushed equality.
  Only then may PM refreeze the shared contract for Product Recipe V2 and
  separately resume the founder's conditional Task 2/Task 3 authorization.

Product Recipe V2 delivery closure and parallel-wave resumption — 2026-08-14:

- Controller delivered commit
  `0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa` with the exact subject and 17
  paths. The non-force push succeeded; local `HEAD` equals upstream, tracked
  dirty and staged counts are zero, and the untracked residual is exactly the
  preserved Task 3 inventory plus 21 scaffolds. The remote moved-repository
  notice is informational; remote configuration remains unchanged. The Product
  Recipe V2 delivery gate is consumed.
- PM refreezes `factory.restaurant-task2-task3-contract/v1` for
  `factory.product-recipe/v2` at formatted SHA-256
  `ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.
- Task 2 advances to `implementing` under exactly one GPT-5.6-Sol backend writer
  over its eleven capability paths. Task 3 advances to `implementing` under
  exactly one GPT-5.6-Terra frontend writer over its inventory, seven private
  package boundaries, and importer-only `pnpm-lock.yaml` boundary. The writers
  are path-disjoint and may run in parallel.
- Task 3 may start RED/source work from the preserved scaffolds without an
  install. Full cross-package resolution requires one bounded direct-pnpm
  offline reconciliation because the seven lock importers and local links are
  absent. It may add only those importers, references to already locked
  coordinates, and ignored local links; no network, new coordinate,
  version/resolution drift, root workspace edit, or second attempt is
  authorized.
- Both deterministic tasks use focused TDD, relevant compatibility gates, one
  independent code review, PM reconciliation, and controller delivery. A heavy
  Terra/final-Sol loop is required only if a new serialized/security issue
  emerges. Task 4/5 remain blocked.

Task 2/Task 3 acceptance and delivery — 2026-08-14:

- Task 2 passes focused 20/20, full Capabilities 384/384, full Graph 661/661,
  both package typechecks/builds, exact eleven-path containment, and independent
  review with P0/P1/P2=0/0/0. The recursive Restaurant page registry and strict
  proposal boundary close the two review findings. Controller commit
  `fbcf92eaf916c9eefa618cad163b44c34dcb0c3c` has subject
  `feat(capabilities): add restaurant product recipe` and exactly eleven paths.
- Task 3 passes 44/44 tests, seven typechecks/builds, 270 normal renderer
  executions, 135 inherited-state rejections, 135 unsafe-URL scrubs, fifteen
  screen-source ESM imports, full-product ESM import, exact 31-path containment,
  and independent review with P0/P1/P2=0/0/0. Controller commit
  `8313e7ae49f8782bd3ab104d0141c60c96f6e4c3` has subject
  `feat(ui): add restaurant ui registries`; its lock delta is exactly seven
  importers and `+72/-0`, with no package or snapshot drift.
- The shared contract remains byte-stable at SHA-256
  `ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.
  Cross-task closure proves the same fifteen pages, seven journeys, surface
  ownership, generated block ports, and a complete 53,497-byte importable ESM
  product source selection.
- Both commits were pushed without force. Local `HEAD` equals upstream at
  `8313e7ae49f8782bd3ab104d0141c60c96f6e4c3`. Task 2 and Task 3 are delivered;
  their gates are consumed. Task 4 and Task 5 may now be frozen as exact,
  path-disjoint compiler/runtime slices. No provider, service, Docker, Compose,
  cloud, or production-payment authority is implied.

## Task 4 — Compile and run the customer mobile surface

State: `delivered`.

Owner: exactly one compiler integration writer using the frozen Task 4 plan.

Allowed paths: exactly the 18 paths in
`docs/superpowers/plans/2026-08-14-restaurant-customer-compiler-task4.md`.
The writer may add only the two existing workspace dependencies named there and
must use direct local runtimes; package resolution, Graph/Task2/Task3 changes,
provider calls, services, Docker, Compose, Workbench, Control Plane, commit, and
push are not authorized.

Acceptance evidence:

- generated production pages include Home, Menu, Dish Detail, Cart, Checkout,
  Orders, Order Detail, and Profile;
- customer journeys work against generated APIs;
- production artifacts accept only a Published Graph;
- the Graph V3 preview renderer accepts only `DraftPreviewSnapshotV2`, renders the same
  customer surface semantics, and emits no exportable/deployable artifact or
  Compilation record;
- migration, health, role journey, denial, idempotency, source, and cleanup
  checks pass.

Delivery: commit `0e85ed6135abeea3f3c44624856b796fa05c2c03`, exact
18 paths, non-force push, local/upstream equality, and clean worktree. Fresh
controller evidence passed focused 56/56, Compiler 471/471, Graph 661/661,
Capabilities 384/384, type/build/static gates, and final independent P0/P1=0/0.

## Task 5 — Compile and run the merchant desktop surface

State: `delivered`.

Owner: completed compiler integration slice.

Allowed paths: exactly the 17 paths in
`docs/superpowers/plans/2026-08-14-restaurant-merchant-compiler-task5.md`.
There is no dependency/lockfile, Graph/Task2/Task3, Workbench, Control Plane,
provider, network, service, Docker, Compose, commit, or push authority.

Acceptance evidence:

- generated production pages include Dashboard, Menu Management, Orders,
  Kitchen Queue, Tables, Users/Roles, and Settings;
- merchant journeys share the customer surface's Graph data;
- production artifacts accept only a Published Graph;
- Draft Preview Snapshot rendering is semantically equivalent but remains
  ephemeral, non-exportable, non-deployable, and Compilation-free;
- role journeys, denials, audit, migration, health, idempotency, and cleanup
  pass.

Delivery: commit `96712e8653507910f4c78ebe9c964a9428f9fef5`, exact
17 paths, subject `feat(compiler): add restaurant merchant v3 target`,
non-force push, local/upstream equality, and clean worktree. Fresh controller
evidence passed focused 67/67, Compiler 491/491, Graph 661/661, Capabilities
384/384, all three package typechecks, Compiler build, exact formatting/diff/
containment/sensitive gates, and final independent P0/P1/P2=0/0/0. The sole
inherited observation is the existing non-failing `punycode` deprecation.

## Task 6 — Rebuild the Workbench prompt-to-live journey

State: `delivered` through the bounded Task 6B template lifecycle slice.

Owner: controller-integrated Workbench/Control Plane implementation for Task
6B. Task 6A is delivered at `1a659a2700056fa5c6814aadd6cb0fb924f27596`.

Allowed paths: `apps/workbench/**`, `packages/workbench-ui/**`, assigned
Control Plane preview endpoints/services, and their tests.

Current executable plan:
`docs/superpowers/plans/2026-08-14-curated-template-draft-preview.md`.
Accepted ADR-0012 authorizes exactly one first-party Restaurant template, its
local idempotent clone/open/rename API, nullable template origin, append-only
Draft Preview Snapshot V2 persistence, and the focused Workbench product view.
The slice does not change Graph/Product Recipe, enable V3 Publish/Compilation,
add an external dependency, or perform provider/network/Docker/Compose work.

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

Task 6A prerequisites are consumed. Task 6B delivers the exact 36-path slice in
`docs/superpowers/plans/2026-08-14-curated-template-draft-preview.md`: one
curated Restaurant template, independent Graph V3 Draft clone, append-only
Snapshot V2 lifecycle, real 8-page customer and 7-page merchant projections,
and rename-only Draft r.2. Fresh evidence passes Control Plane 253/253,
Workbench 384/384, browser clone/preview/rename 1/1, both package typechecks and
builds, Prisma validation, exact formatting/containment/diff gates, and final
independent review P0/P1/P2=0/0/0. The enclosing commit is the single intentional
Task 6B delivery; it does not enable V3 Publish/Compilation or change Graph,
Product Recipe, provider, or deployment contracts.

## Task 7 — Make Page, Data, Users, Workflow, and Experience contextual editors

State: Task 7A, 7B, 7C, and 7D are `delivered`.

Owner: Task 7A/7B/7C/7D writer, review, QA, release, and delivery authorities
are consumed.

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

Blocked by: none for the first bounded Page-selection/editor slice. Broader Data,
Users, Workflow, and Experience work remains serialized behind that slice.

### Task 7A frozen execution — 2026-08-14

ADR-0013 is Accepted from the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。` PM/controller confirmed the
slice is the next accepted Restaurant outcome, is append-only and reversible,
and does not expand Graph, Product Recipe, Puck, compiler, dependency, provider,
service, or deployment boundaries. The threat model now names both Snapshot V1
and accepted Snapshot V2 explicitly.

Contract:

- exact route `POST /template-draft-instances/:applicationGraphId/page-revisions`;
- exact own-plain body `{baseDraftRevisionId,surfaceKey,pageId,title}`;
- only `graph.page.pages[].title` may change;
- one Serializable operation appends the next Draft and an active Snapshot V2;
- stale/replayed bases fail with the fixed reload conflict and never rebase;
- prior Draft/Snapshot rows remain immutable; V1 lifecycle, Publish,
  Compilation, Source, export, and provider/runtime paths remain unchanged.

Executable plan:
`docs/superpowers/plans/2026-08-14-template-page-editor.md`.

Writer implementation authority is exactly the plan's 21-path manifest: six
Template Control Plane source/test paths and fifteen Workbench client,
controller, Preview/Page/shell/style/fixture/browser paths. Need for any other
implementation path is a PM stop. Governance paths are controller-owned.

Gates were intentionally bounded: focused TDD RED/GREEN; full Control Plane and
Workbench plus Graph/Capabilities/Compiler compatibility; type/build/Prisma/
browser/static evidence; one independent code review; same-writer repair; and
fresh controller verification. Ordinary UI work used no separate Terra/Sol
release-review loop.

Final Task 7A evidence:

- pure operation RED missing module -> GREEN 12/12;
- route/service RED 4 failed/24 passed -> GREEN, strict client RED 1/40 ->
  GREEN, and UI RED 3 failed/19 passed plus one missing suite -> GREEN;
- independent review initially found late/repeated input admission,
  cross-workspace origin oracle, arbitrary UI error text, and missing renderer
  rollback evidence; same-writer RED was Control Plane 5 failed/12 passed and
  Workbench 1 failed/19 passed;
- repaired focused suites pass Control Plane 37/37 and Workbench 67/67; input is
  captured once before Prisma, workspace scoping precedes origin inspection,
  errors are fixed/redacted, and renderer/Snapshot failures prove atomicity;
- fresh controller gates pass Control Plane 22 files/278 tests, Workbench 39
  files/390 tests, Graph 661, Capabilities 384, Compiler 491, both no-emit
  checks, Control Plane build, Next production build, Prisma validation,
  Playwright r.2 -> r.3 1/1, formatting/diff/sensitive/browser-import checks,
  and exact implementation 21 plus governance 7 containment;
- authoritative independent re-review is READY YES with P0/P1/P2=0/0/0.

Delivery is the enclosing exact 28-path commit with subject
`feat(workbench): add template page draft editing`, followed by non-force push
and local/upstream equality. No dependency, lockfile, Graph, Product Recipe,
compiler, Prisma, provider, service, Docker, Compose, Publish, export, or
deployment path changes. The next bounded Graph V3 Page block round-trip is
governed by the accepted ADR and frozen execution record below. Data, Users,
Workflow, Experience, Source, Publish, and Compilation writers remain zero.

### Task 7B frozen execution — 2026-08-14

ADR-0014 is Accepted from the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。` PM/controller confirmed that
same-set Page block ordering is the next visible Restaurant slice and that the
decision is additive, append-only, reversible, and within the accepted Graph
V3 and Snapshot V2 boundaries.

Contract:

- exact route
  `POST /template-draft-instances/:applicationGraphId/page-block-order-revisions`;
- exact own-plain body
  `{baseDraftRevisionId,surfaceKey,pageId,regionKey,blockIds}`;
- `regionKey` is exactly `main`; `blockIds` is an ordinary dense own-data Array
  of 2..20 unique Graph keys and must be a changed exact permutation;
- only the selected page's `blocks` order and matching `main.blockIds` order may
  change; every block value, binding, recipe, source, policy, authority, and all
  other Graph content remains structurally equal;
- one bounded Serializable operation appends the next Draft and one immutable
  dual-surface Snapshot V2; stale/replayed bases conflict and never rebase;
- internal Draft projection becomes Graph-order authoritative only after exact
  registry membership/type/binding/source validation;
- Puck allows drag and keyboard reordering only; insert, edit, duplicate, and
  delete are disabled; and
- generated Customer/Merchant runtime markup and production compilation remain
  unchanged and continue rejecting reordered Drafts.

Executable plan:
`docs/superpowers/plans/2026-08-14-template-page-block-order.md`.

The corrected sole writer authority is exactly 25 implementation paths: seven
Compiler projection/preview/facade source/tests, six Control Plane operation/
route/service source/tests, and twelve Workbench adapter/Puck/Page/controller/
client/style/fixture/browser paths enumerated in the plan. Need for any
additional implementation path is a PM stop. No Graph, Product Recipe, Screen
Recipe, generated target/runtime,
Prisma, package, workspace, lockfile, provider, service, Docker, Compose,
Source, Publish, Compilation, export, commit, or push write is authorized.

Execution gates are focused TDD RED/GREEN, full Compiler/Control Plane/
Workbench/Graph/Capabilities compatibility, type/build/Prisma/browser/static
evidence, independent task review, same-writer TDD repair for any P0/P1, fresh
independent Terra QA, independent final Sol release review, PM acceptance,
fresh controller verification, and one exact 31-path reviewed commit with
subject `feat(workbench): add governed page block ordering`, non-force push, and
local/upstream equality.

First Task 7B independent review and repair freeze — 2026-08-14:

- Writer RED/GREEN and self-review produced focused Compiler 57/57, Control
  Plane 52/52, Workbench 56/56, Playwright 1/1, full five-package 2,250 tests,
  three no-emit checks, builds, Prisma validation, exact containment, and static
  gates. This evidence is historical for the rejected tree only.
- Independent two-axis review returns NOT READY with P0/P1/P2=0/6/3. Confirmed
  P1s are: hostile Array own-key reflection amplification; unchanged current
  order returning 400 instead of the fixed reload conflict; registry/type/
  binding/source closure occurring after a Draft-create attempt; Puck adapter
  acceptance of extra fields and hostile accessors; stale real Puck canvas
  after keyboard/authoritative prop changes; and governance omission of the
  mandatory Terra/final-Sol release sequence.
- PM verified the findings. The same writer is reopened for TDD repair in the
  corrected exact 25 paths. Three added paths are only
  `packages/compiler/src/targets/restaurant-v3/preview.ts`,
  `packages/compiler/src/targets/restaurant-v3/index.ts`, and
  `packages/compiler/src/index.ts`, so a pure Compiler-owned dual-surface
  closure assertion can be invoked before append or render. This is no Graph,
  recipe, target, generated-runtime, dependency, or architecture expansion.
- Required RED/GREEN covers bounded reflection, exact unchanged conflict,
  zero-append/zero-render closure drift, hostile/exact Puck data, actual canvas
  synchronization, shared permutation logic, and stronger history/focus/390px
  browser evidence. After GREEN, the same independent task reviewer must
  re-review the exact tree. Terra QA and final Sol release review remain blocked
  until a clean re-review and PM reconciliation.

Task 7B repaired-tree re-review checkpoint — 2026-08-14:

- Same-writer repair passes focused Compiler 63/63, Control Plane 58/58,
  Workbench 34/34, Playwright 1/1, full five-package 2,282/2,282, all three
  no-emit checks, builds, Prisma validation, exact 25/31 containment, and static
  gates.
- The same independent reviewer confirms all six prior P1 defects are closed
  and returns P0/P1/P2=0/0/4, but READY_FOR_QA NO until the frozen evidence
  contract is complete. Remaining P2s are: service-seam source-drift must prove
  zero Draft/renderer invocation; a real-browser failed-save must prove actual
  Puck canvas retains the accepted local permutation while server preview stays
  unchanged; the stale bottom status gate must be corrected; and the reuse
  inventory must explicitly record generated-template and pinned source-study
  searches.
- PM corrected the two governance records and reopens the same writer only for
  `apps/control-plane/test/template.service.test.ts` and
  `apps/workbench/e2e/template-draft.pw.ts`. No production edit is authorized or
  expected. After those exact evidence tests pass, the same reviewer must issue
  a final task-review verdict before Terra QA can start.

Task 7B final task-review handoff and Terra authorization — 2026-08-14:

- The evidence-only reopen changed only the service and browser test paths.
  Source drift now proves one closure call and zero Draft, Snapshot, or renderer
  calls. Real Playwright proves a fixed failed save retains the actual Puck local
  permutation while r.3 Snapshot/server preview remain unchanged, then the same
  command succeeds as r.4 with focus, authoritative reload, 390px, overflow, and
  44px evidence.
- The same independent reviewer returns P0/P1/P2=0/0/0 and
  READY_FOR_QA YES. Fresh non-emitting reviewer evidence passes Compiler 63/63,
  Control Plane 59/59, Workbench affected suites 76/76, all three no-emit checks,
  exact 25 implementation plus six governance paths, empty index, clean diff,
  and zero forbidden Graph/recipe/runtime/Prisma/dependency/lock drift.
- PM advances Task 7B to `ready_for_qa`, pauses the writer, and authorizes exactly
  one fresh independent GPT-5.6-Terra read-only pass on this exact tree. Terra
  must use direct existing runtimes only; no pnpm/corepack/install/network/
  provider/model/service/Docker/Compose, file edit, emitting build, stage,
  commit, or push is authorized.
- QA must rerun focused Compiler/Control Plane/Workbench repair suites, full
  five-package tests, three no-emit checks, exact-25 formatting/diff/containment,
  and the real Playwright journey; independently probe bounded reflection,
  unchanged 409, pre-append dual-surface closure, hostile Puck capture, actual
  canvas synchronization, r.3 immutability, r.4 reload, focus, and 390px. Only a
  QA PASS with no open P0/P1 returns to PM for final Sol authorization.
- Final Sol release review, PM acceptance, staging, delivery, commit, push, and
  all later editor/Task 8/Task 9 authorities remain blocked.

Task 7B Terra QA handoff and final Sol authorization — 2026-08-14:

- The single authorized fresh Terra QA pass is consumed and returns corrected
  PASS with P0/P1/P2=0/0/0 and READY_FOR_FINAL_RELEASE_REVIEW YES. Fresh direct
  evidence passes focused Compiler 63/63, Control Plane 59/59, Workbench 76/76;
  full Compiler 501/501, Control Plane 315/315, Workbench 422/422, Graph 661/661,
  Capabilities 384/384; real Playwright 1/1; all three no-emit checks; exact-25
  format/diff/static gates; and exact 25+6 containment with no forbidden drift.
- Terra initially selected the unreferenced `.pnpm` TypeScript 5.7.2 store path
  manually and reported inherited NodeNext diagnostics. Controller root-cause
  proof showed the repository root `node_modules/typescript` junction targets
  TypeScript 5.9.3; the exact intended Workbench no-emit command exits zero.
  Terra reran that command, withdrew the 5.7.2 finding completely, and issued
  the corrected PASS. No product or governance file changed during QA.
- Exactly one fresh independent GPT-5.6-Sol final release review is now
  authorized, read-only, on this exact Terra-passed tree. It must reconcile the
  accepted ADR/design/plan/ledger and delivery policy; inspect all 31 paths;
  independently verify the six repaired P1 boundaries, Puck/browser/history/
  responsive evidence, V1/production-compilation compatibility, exact
  containment, and all fresh QA gates; and return RELEASE_ACCEPT only with no
  actionable P0/P1.
- PM acceptance, staging, delivery, commit, push, and every later editor/Task
  8/Task 9 authority remain blocked pending final Sol reconciliation.

Task 7B final release acceptance and delivery authority — 2026-08-14:

- The single authorized independent GPT-5.6-Sol final release review is
  consumed and returns `RELEASE_ACCEPT`, actionable P0/P1/P2=0/0/0, no deferred
  Task 7B issue, and READY YES. It independently confirms strict one-time hostile
  capture, bounded reflection, fixed stale/unchanged 409 behavior, pre-append
  dual-surface Compiler closure, Serializable retry, Draft/Snapshot atomicity,
  r.3 immutability, exact Puck capture/shared reduction/remount, fixed client
  error, authoritative success replacement, projection compatibility, and
  continued production-compile rejection of reordered Drafts.
- Fresh final-review evidence passes focused Compiler 63/63, Control Plane
  59/59, Workbench 76/76; full Compiler 501/501, Control Plane 315/315,
  Workbench 422/422, Graph 661/661, Capabilities 384/384; and all three
  repository-root TypeScript 5.9.3 no-emit checks. Format, diff, browser-import,
  sensitive, and exact Expected31/Actual31 containment checks pass with zero
  missing, unexpected, staged, or forbidden path. Corrected Terra QA already
  passed the real browser journey 1/1 on this same tree.
- PM accepts the exact 31-path delivery tree. The controller alone is authorized
  to stage those 31 paths, prove staged equality and sensitive checks, create
  exactly one commit with subject
  `feat(workbench): add governed page block ordering`, push the active branch
  without force, and prove local `HEAD` equals upstream with no residual dirty
  path. The enclosing reviewed commit is the bounded Task 7B delivery.
- This authority does not enable Data, Users, Workflow, Experience, Source,
  Publish, Compilation, block insertion/deletion/editing, generated-runtime
  ordering, provider, service, Docker, Compose, or deployment work. The next
  bounded editor slice requires a fresh contract and path freeze after pushed
  equality.

Task 7B is `delivered` by its enclosing reviewed commit. Data, Users, Workflow,
Experience, Source, Publish, Compilation, block insertion/deletion/editing,
generated-runtime ordering, Task 8, and Task 9 writers remain zero until a new
bounded slice is frozen after pushed equality.

### Task 7C frozen execution — 2026-08-14

State: `delivered` at `78955444cb82d95346fb4fbded03167f982eb693` with
exact subject `feat(workbench): add governed restaurant data editing`,
non-force push, local/upstream equality, and a clean tree.

Decision and contract:

- ADR-0015 is Accepted under the founder standing instruction
  `参考以下总结，若符合项目目标，则持续接受而迭代。`; PM adjudicates the slice as
  bounded, additive/reversible, directly advancing the polished editable
  Restaurant product, and introducing no Graph/platform expansion.
- Visible outcome is exactly Builder -> Data -> Menu items -> Margherita pizza
  -> Dish name, `Margherita pizza` -> `Heirloom tomato pizza`.
- Exact POST route:
  `/template-draft-instances/:applicationGraphId/data-field-revisions` with
  own-plain five-field body
  `{baseDraftRevisionId,entityKey,recordId,fieldKey,value}` and literal selectors
  `menu-item`, `margherita-pizza`, `name`; normalized value is 2..120 with no
  controls.
- Capture is hostile-safe and once-only before Prisma; local workspace precedes
  origin; latest base is mandatory. The current Graph must have exactly one
  matched seed, exactly one `fine-dining-service` scenario, a complete
  index-aligned seed/scenario mirror, required string/client-authoritative
  `menu-item.name`, the exact three customer reads, merchant write, and manager
  `menu-item:update`.
- Update only the two aligned `values.name` locations and prove complete
  restoration equality. Reassert Graph V3 and run the existing compiler preview
  closure before append/render.
- At most three Serializable attempts. Stale/no-op/P2002/exhausted P2034 return
  fixed 409; malformed/closure-invalid returns fixed 400. Draft r.5, two renders,
  and exactly one active immutable Snapshot V2 are atomic; errors never log or
  echo inputs/Graph/Snapshot material.
- Workbench derives the visible seed only from the strict Graph after Snapshot
  checksum match. Customer Menu and Merchant Menu Management change only after
  strict success; pending/failure never changes either preview.

Authorities:

- [ADR-0015](../../adr/adr-0015-template-restaurant-seed-data-edit.md)
- [Task 7C design](../specs/2026-08-14-template-restaurant-seed-data-edit-design.md)
- [Task 7C executable plan](../plans/2026-08-14-template-restaurant-seed-data-edit.md)
- [Delivery policy](../../delivery-policy.md)

Exact writer manifest (22):

```text
apps/control-plane/src/template/template-data-field-edit.ts
apps/control-plane/src/template/template.controller.ts
apps/control-plane/src/template/template.service.ts
apps/control-plane/test/template-data-field-edit.test.ts
apps/control-plane/test/template.controller.test.ts
apps/control-plane/test/template.service.test.ts
apps/workbench/lib/control-plane-client.ts
apps/workbench/lib/control-plane-client.test.ts
apps/workbench/hooks/use-workbench-controller.ts
apps/workbench/components/workbench.tsx
apps/workbench/components/template-data-workspace.tsx
apps/workbench/components/template-data-workspace.test.tsx
apps/workbench/components/template-draft-workspace.tsx
apps/workbench/components/template-draft-workspace.test.tsx
apps/workbench/components/template-page-workspace.tsx
apps/workbench/components/template-page-workspace.test.tsx
apps/workbench/components/shell/workbench-shell.tsx
apps/workbench/components/shell/workbench-shell.test.tsx
apps/workbench/styles/template-data.css
apps/workbench/app/globals.css
apps/workbench/test/template-draft-fixture.ts
apps/workbench/e2e/template-draft.pw.ts
```

Any additional implementation path is a PM STOP. Compiler, Graph,
Capabilities, Product/Screen Recipes, Prisma, package, lockfile, generated
runtime, Docker, and Compose paths are explicitly excluded.

Exact controller governance manifest (6):

```text
docs/adr/adr-0015-template-restaurant-seed-data-edit.md
docs/project-status.md
docs/roadmap.md
docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md
docs/superpowers/plans/2026-08-14-template-restaurant-seed-data-edit.md
docs/superpowers/specs/2026-08-14-template-restaurant-seed-data-edit-design.md
```

Acceptance evidence:

- Focused final GREEN: Control Plane 90, Workbench 86. Full GREEN: Control Plane
  370, Workbench 439, Graph 661, Capabilities 384, Compiler 501. Five no-emit
  gates, builds, Prisma, Next, Playwright 1/1, exact-28 containment, formatting,
  diff, and static boundaries pass.
- The current-Snapshot hash/admission P1, JSON key-order P2, and final
  double-submit P1 are closed; the last repair is the bounded two-file latch.
- The same independent Sol reviewer returns final `RELEASE_ACCEPT` with
  P0/P1/P2=0/0/0. Post-repair targeted Terra returns `PASS`, P0/P1/P2=0/0/0,
  and `READY_FOR_DELIVERY YES`.
- Controller delivery consumed the exact 22+6 manifest, staged
  Expected28/Actual28 with no missing, unexpected, unstaged, or untracked path,
  committed exactly `feat(workbench): add governed restaurant data editing`,
  pushed without force, and proved local `HEAD` equals upstream at
  `78955444cb82d95346fb4fbded03167f982eb693` with a clean tree.

Deferred: every other entity/record/field, generic CRUD/schema forms, Users,
permissions editing, Workflow, Experience, Page/block/content changes, history
picker, Source, export, Publish, Compilation, generated-runtime behavior,
provider/service/network/queue/worker, Docker/Compose, deployment, dependency,
package, lockfile, Graph, Capability, recipe, Compiler, Prisma, or database
change.

Access/Workflow design stop: Graph-valid permission or actor additions are not
enforced by the current Restaurant compiler/runtime, so Workbench must not
present them as product behavior; no ADR, route, UI, or writer authority exists.

### Task 7D Experience freeze — 2026-08-14

State: `delivered` at `35da63df867dc0271254b1cbad38e5613a27c348`
with exact subject `feat(workbench): add governed restaurant theme editing`,
non-force push, local/upstream equality, and a clean tree.

Contract:

- ADR-0016 is Accepted under the founder standing instruction
  `参考以下总结，若符合项目目标，则持续接受而迭代。`; PM adjudicates this slice as
  bounded, append-only/reversible, directly advancing the polished editable
  Restaurant, and requiring no Graph/platform expansion or new prompt.
- Exact outcome: Builder -> Experience -> Theme, Light -> Dark. Exact POST:
  `/template-draft-instances/:applicationGraphId/experience-theme-revisions`
  with strict own-data `{baseDraftRevisionId,mode:"dark"}`.
- Capture happens once before Prisma and never invokes caller behavior. Every
  one of at most three Serializable attempts revalidates local workspace before
  origin, latest Draft/base, latest active Snapshot V2 identity/checksum, exact
  current light mode, Graph V3, and existing compiler preview closure.
- Change only `graph.experience.theme.mode`; restoring light must equal the
  complete base Graph. Stale/no-op/P2002/exhausted P2034 use fixed 409;
  malformed/authority/closure drift uses fixed 400; errors never log or echo
  request, Graph, Snapshot, or hostile material.
- Draft r.6, exactly two renders, and one active immutable Snapshot V2 are
  atomic. Customer and Merchant Workbench frames derive dark only from the
  strict checksum-matched response; pending/failure remain accepted light.
- The additive Workbench `Experience` destination/surface is operator UI only.
  Tokens, designSystem, locales, navigation, Graph/Capability/recipe/Compiler/
  runtime/Prisma/dependency/provider/service/deployment behavior stays fixed.

Authorities:

- [ADR-0016](../../adr/adr-0016-template-restaurant-experience-theme-revision.md)
- [Task 7D design](../specs/2026-08-14-template-restaurant-experience-theme-design.md)
- [Task 7D executable plan](../plans/2026-08-14-template-restaurant-experience-theme.md)
- [Delivery policy](../../delivery-policy.md)

Exact writer manifest (23):

```text
apps/control-plane/src/template/template-experience-theme-edit.ts
apps/control-plane/src/template/template.controller.ts
apps/control-plane/src/template/template.service.ts
apps/control-plane/test/template-experience-theme-edit.test.ts
apps/control-plane/test/template.controller.test.ts
apps/control-plane/test/template.service.test.ts
packages/workbench-ui/src/index.ts
packages/workbench-ui/test/boundary.test.ts
apps/workbench/lib/workbench-model.ts
apps/workbench/lib/workbench-model.test.ts
apps/workbench/components/shell/icon-rail.tsx
apps/workbench/components/shell/workbench-shell.tsx
apps/workbench/components/shell/workbench-shell.test.tsx
apps/workbench/lib/control-plane-client.ts
apps/workbench/lib/control-plane-client.test.ts
apps/workbench/hooks/use-workbench-controller.ts
apps/workbench/components/workbench.tsx
apps/workbench/components/template-experience-workspace.tsx
apps/workbench/components/template-experience-workspace.test.tsx
apps/workbench/styles/template-experience.css
apps/workbench/app/globals.css
apps/workbench/test/template-draft-fixture.ts
apps/workbench/e2e/template-draft.pw.ts
```

Any additional implementation path is a PM STOP.

Exact controller governance manifest (6):

```text
docs/adr/adr-0016-template-restaurant-experience-theme-revision.md
docs/project-status.md
docs/roadmap.md
docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md
docs/superpowers/plans/2026-08-14-template-restaurant-experience-theme.md
docs/superpowers/specs/2026-08-14-template-restaurant-experience-theme-design.md
```

Evidence: implementation and the P1 repair completed; independent review
returns `PASS`; targeted Terra returns `PASS`; final Sol returns
`RELEASE_ACCEPT`, actionable P0/P1/P2=0/0/0; and PM records
`PM_DELIVERY_AUTHORITY YES` for the exact 29 paths.

Controller delivery consumed the exact 23+6 manifest, staged
Expected29/Actual29 with no missing, unexpected, unstaged, or untracked path,
committed the frozen subject, pushed without force, and proved local `HEAD`
equals upstream at the delivered hash with a clean tree.

Deferred: every other theme mode/property, tokens, designSystem, locales,
navigation, Data, Access, Users, Workflow, Page/content, history, Source,
export, Publish, Compilation, generated runtime, Graph, Capability, recipe,
Compiler, Prisma/database, package/dependency/lock, provider/network/service,
Docker/Compose, and deployment.

## Task 8 — Add Source Mode, controlled overlays, ZIP, and Git export

State: Task 8A Source Explorer, Task 8B Source Search, and Task 8C Verified
Source Transfer are `delivered`. Diff, editing, overlays, ZIP, Git, and export
remain `planned` with writer count zero.

Owner: Task 8A/8B/8C writer, review, and controller authorities are consumed.

### Task 8A Source Explorer freeze — 2026-08-14

Decision and contract:

- [ADR-0017](../../adr/adr-0017-workbench-source-explorer.md) is Accepted under
  the founder standing instruction
  `参考以下总结，若符合项目目标，则持续接受而迭代。`; PM confirms the slice is bounded,
  additive/reversible, read-only, product-truthful, and requires no platform or
  runtime expansion.
- Exact journey: Builder -> Code -> Source, available only for the current
  succeeded immutable Compilation.
- `GET /compilations/:compilationId` remains the complete registered artifact-
  tree authority. Workbench copies and orders rows by path, showing path, media
  type, optional byte size, and digest.
- Selection clears stale content and calls only the existing
  `GET /compilations/:compilationId/artifact-content?path=...` route. The client
  admits exactly own-data `{path,digest,content}` only when path and digest equal
  the selected manifest descriptor; the server has already reread and SHA-256
  verified the registered bytes.
- Pending shows the selected path and no old content. Failure shows no
  unverified content. A monotonic request token prevents an older selection
  response from replacing the latest selection.
- Search, diff, edit, Source Overlay, ZIP, Git, export, Draft Preview Snapshot
  source, current-Draft source claims, and Compilation creation are excluded.

Authorities:

- [Task 8A design](../specs/2026-08-14-workbench-source-explorer-design.md)
- [Task 8A executable plan](../plans/2026-08-14-workbench-source-explorer.md)
- [Delivery policy](../../delivery-policy.md)

Exact writer manifest (9):

```text
apps/workbench/lib/control-plane-client.ts
apps/workbench/lib/control-plane-client.test.ts
apps/workbench/hooks/use-workbench-controller.ts
apps/workbench/components/workbench.tsx
apps/workbench/components/canvases/code-canvas.tsx
apps/workbench/components/canvases/code-canvas.test.tsx
apps/workbench/app/globals.css
apps/workbench/e2e/source-explorer.pw.ts
apps/workbench/components/shell/workbench-shell.test.tsx
```

The initial full Workbench run is the accepted RED at 480/482: both failures
share only malformed mock digest `sha256:journey` in the existing shell test,
which the strict client correctly rejects. The same writer is authorized to
change only that fixture to one valid 64-lowercase-hex digest, then rerun the
focused/full/browser/static gates and independent review. No production
validation weakening or digest synthesis is authorized.

Any tenth implementation path is a PM STOP. No Control Plane, Graph,
Capabilities, recipe, Compiler/generated runtime, Prisma/database, package/
dependency/lock, provider/network/service, Docker, Compose, or deployment path
is authorized.

Gates were focused TDD, full Workbench test/no-emit/Next compatibility, exact
Playwright journey at 1440px and 390px, exact/static evidence, one independent
intended-vs-implemented review, targeted real-browser QA, and one fresh final
Sol review of strict response admission.

The repaired-tree independent re-review is clean; targeted Terra returns
`PASS`; final Sol after the P2 characterization returns `RELEASE_ACCEPT`,
actionable P0/P1/P2=0/0/0. Stale failure plus valid success A/B coverage proves
only the current token controls artifact error and admitted content. PM records
`PM_DELIVERY_AUTHORITY YES` for exact 15 and the frozen subject. Controller
delivery consumed the exact 15, committed
`feat(workbench): add governed source explorer`, pushed without force, and
proved local `HEAD` equals upstream at
`8c2767bb2c333d2086ca1b2d0f8cdc4c348bf7f0` with a clean tree.

### Task 8B Source Search freeze — 2026-08-14

State: `delivered` at `84a90c4b17fe30bc35921fb25aebf228009678be`.

Decision and contract:

- The founder standing instruction
  `参考以下总结，若符合项目目标，则持续接受而迭代。` covers this bounded,
  additive/reversible, deterministic UI slice. Delivery policy classifies it as
  ordinary component work; no Tech Lead dispatch or ADR is required because no
  stable API, Graph, security, runtime, persistence, dependency, or lifecycle
  contract changes.
- Inside the delivered verified Source Explorer, `Filter source files` applies
  a local case-insensitive literal filter only to registered manifest paths.
  Empty shows all, zero matches shows a fixed state, and typing never requests
  content.
- `Find in current file` consumes only the current verified content. It is
  case-insensitive literal substring search with exact non-overlapping count,
  React text/`mark` rendering, 120-character query limit, and at most 500
  rendered ranges. It clears/disables on pending, artifact failure, or
  Compilation invalidation; no raw HTML is parsed or rendered.
- No other file content is loaded. Search service/index, API/client/hook,
  semantic/regex search, Diff, edit/replace, overlay, ZIP, Git, export, and Draft
  Preview Snapshot content remain excluded.

Authority:

- [Task 8B executable plan](../plans/2026-08-14-workbench-source-search.md)
- [Delivery policy](../../delivery-policy.md)

Exact writer manifest (4):

```text
apps/workbench/components/canvases/code-canvas.tsx
apps/workbench/components/canvases/code-canvas.test.tsx
apps/workbench/app/globals.css
apps/workbench/e2e/source-explorer.pw.ts
```

Any fifth implementation path is a PM STOP. One Sol writer used focused TDD,
then full Workbench/no-emit/Next and real-browser gates. One independent review
was the only post-writer review gate. PM/controller alone may deliver the exact
four implementation plus four governance paths with subject
`feat(workbench): add source search`, non-force push, local/upstream equality,
and a clean tree.

Mandatory RED was unit 6/15 plus browser 1/1; initial GREEN was focused 15,
full Workbench 488, no-emit, Next, and browser 1/1. Independent review found one
P1: same-ID Compilation replacement retained stale find state. Repair RED 1/16
became GREEN 16/16; fresh full Workbench 489, no-emit, Next, browser 1/1, and
exact-eight static gates pass. The same reviewer closes P0/P1/P2=0/0/0 with
`READY_FOR_DELIVERY YES`. Controller delivery consumed the exact eight,
committed `feat(workbench): add source search`, pushed without force, and
proved local `HEAD` equals upstream with a clean tree.

### Task 8C Verified Source Transfer freeze — 2026-08-14

State: `delivered` at `97b6dbdb6176ca26af6d7fa2b71dad6bbc692e19`.

Decision and contract:

- The founder standing instruction
  `参考以下总结，若符合项目目标，则持续接受而迭代。` covers this bounded,
  additive/reversible, local deterministic UI slice. Delivery policy classifies
  it as ordinary component work; no ADR is required because no stable API,
  Graph, security, runtime, persistence, dependency, or lifecycle contract
  changes.
- In the existing Source viewer, `Copy current file` and
  `Download current file` are disabled unless current succeeded-Compilation
  path/digest/content already form the existing `verifiedArtifact`.
- Copy passes the exact admitted content to the native clipboard without
  transformation. Fixed no-echo pending/success/failure states are bound by a
  monotonic token and current authority so an older completion cannot claim a
  newer selection.
- Download creates one `application/octet-stream` UTF-8 Blob from those exact
  bytes, uses a safe basename hint, clicks one local anchor, and revokes a
  created Object URL exactly once from `finally`. The basename replaces C0/DEL
  and `<>:"/\\|?*` with `_`, removes trailing periods/spaces, falls back to
  `source.txt` when empty or dot-only, and prefixes Windows device stems with
  `_`.
- Selection, pending/failure, or Compilation invalidation disables actions and
  clears transfer state. Copy/download make zero new requests, never call
  `onInspectArtifact`, and preserve path filter, current-file find, admitted
  viewer content, and unrelated operation state.
- ZIP is stopped because there is no bounded archive/export contract or direct
  Workbench ZIP dependency. Source Diff is stopped because no durable,
  discoverable previous-Compilation baseline exists. Git, Source Overlay,
  editing, and every broader Source contract remain deferred.

Authority:

- [Task 8C executable plan](../plans/2026-08-14-workbench-verified-source-transfer.md)
- [Delivery policy](../../delivery-policy.md)

Exact writer manifest (4):

```text
apps/workbench/components/canvases/code-canvas.tsx
apps/workbench/components/canvases/code-canvas.test.tsx
apps/workbench/app/globals.css
apps/workbench/e2e/source-explorer.pw.ts
```

Any fifth implementation path is a PM STOP. Mandatory RED was unit 28/44 plus
browser 1/1 with production untouched. GREEN is focused 44, full Workbench 517,
no-emit, Next, and browser 1/1; exact-eight static/containment gates are clean.
The independent review closes P0/P1/P2=0/0/0 with
`READY_FOR_DELIVERY YES`. Controller delivery consumed the exact eight paths,
committed `feat(workbench): add verified source transfer`, pushed without
force, and proved local `HEAD` equals upstream with a clean tree.

Later Task 8 acceptance remains: Code eventually gains search/diff, ZIP and
Graph-first Git share one checksum manifest, writable extensions use
`SourceOverlayV1`, Draft Preview Snapshot output is never exportable source, and
credentials, raw model material, and private files stay absent. Task 8C does not
authorize any later Task 8 writer.

## D0 — Restaurant V3 Runtime Catalog Parity

State: `accepted`; `ready_for_writer`; not implemented or delivered, on base
`97b6dbdb6176ca26af6d7fa2b71dad6bbc692e19`.

Owner: one Sol writer for exact ten Compiler paths, then one independent Sol
review. PM/controller retains exact-sixteen delivery.

Decision and contract:

- [ADR-0018](../../adr/adr-0018-restaurant-v3-runtime-catalog-parity.md) is
  Accepted under `参考以下总结，若符合项目目标，则持续接受而迭代。`; the slice is
  bounded, reversible, and corrects existing dual-Restaurant runtime truth, so
  no new founder prompt is required.
- Keep strict Published V3/hash/Composition-Lock admission. Accept only the
  canonical Graph plus the delivered r.6 value family: application name,
  Customer Menu title, equal same-set Customer Home block/region order,
  mirrored Margherita name, and theme mode. Validate first, restore only those
  values in a clone, then require the complete normalized V3 hash to equal the
  existing canonical hash; all unlisted drift fails.
- Require one exact `fine-dining-service` scenario fully index-aligned and
  deeply mirrored with `domain.seedData`; exact unique category/two menu items,
  field types/required flags/authorities/bindings, manager `menu-item:update`,
  bounded primitive values, safe image URLs, and resolving category refs.
- Graph price is finite USD major units `0..100000` with at most two decimals
  by `Number(price.toFixed(2)) === price`; runtime emits
  `Math.round(price * 100)` integer minor units `0..10000000` with no implicit
  rounding.
- Emit deterministic seed-order version-1 catalog rows containing only
  category key, name, description, minor price, available, stock, preparation
  minutes, and image URL. Customer and merchant retain one shared state/API.
- [Design](../specs/2026-08-14-restaurant-v3-runtime-catalog-parity-design.md)
  and [executable plan](../plans/2026-08-14-restaurant-v3-runtime-catalog-parity.md)
  are the writer authority. D0 does not claim Publish, worker compilation,
  Workbench launch, or visible title/order/theme runtime parity.

Exact writer manifest (10):

```text
packages/compiler/src/targets/restaurant-v3/contracts.ts
packages/compiler/src/targets/restaurant-v3/runtime-api.ts
packages/compiler/src/targets/restaurant-v3/customer-target.ts
packages/compiler/src/targets/restaurant-v3/merchant-target.ts
packages/compiler/src/targets/restaurant-v3/product-target.ts
packages/compiler/test/restaurant-v3-contract.test.ts
packages/compiler/test/restaurant-customer-runtime.test.ts
packages/compiler/test/restaurant-merchant-v3-runtime.test.ts
packages/compiler/test/restaurant-customer-target.test.ts
packages/compiler/test/restaurant-product-v3-target.test.ts
```

Any eleventh implementation path is a PM STOP. No new canonical fixture/import,
Control Plane, worker, Publish, Workbench, PreviewRunner, Graph/Capability/
Recipe/schema/facade, Prisma, package/dependency/lock, provider/network/service,
Docker/Compose, or deployment path is authorized.

Gates: mandatory focused RED/GREEN; full Compiler, Graph, and Capabilities;
their no-emit/build gates; generated Node journeys; exact-ten format/diff/
containment/static evidence; and one independent intended-vs-implemented Sol
review. Terra or separate final Sol is required only if review escalates a
stable-boundary/security P0/P1 or a repair changes the frozen contract.

Controller delivery, after PM acceptance, is exact ten implementation plus six
governance paths with Expected16/Actual16 equality, zero index/unrelated paths,
subject `fix(compiler): bind restaurant runtime catalog to graph seed`,
non-force push, local/upstream equality, and a clean tree.

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

Blocked by: Tasks 3–8 reviewed, D0 delivered, and a separately frozen honest
V3 Publish/Compilation/launch closure.

## Deferred work

The following remain outside this iteration until Task 9 is accepted:

- 100+ Profile expansion or broad capability-family intake;
- production payment processing;
- cloud deployment, application fleet, and managed operations;
- connector marketplace and unrestricted third-party runtime ingestion;
- unrestricted arbitrary source editing or reverse parsing;
- Figma or Stitch runtime integration;
- production activation of Aceternity candidates.
