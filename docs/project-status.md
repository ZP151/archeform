# Archeform delivery status

Updated: 2026-08-12

## Product outcome

Archeform is an Application Graph platform whose default experience is:

```text
Apps -> Describe -> Building / Live Preview -> Edit -> Publish
```

The user describes a product in business language and receives a polished,
runnable default. The Application Graph remains the durable business source of
truth, but Graph internals, capability locks, lineage, and evidence stay in
Advanced surfaces unless an exception requires attention. Page design, data,
users, permissions, workflows, and experience remain editable. Generated
source remains visible, searchable, diffable, exportable, and subject to
controlled extension boundaries.

The full status history through 2026-08-09 is preserved verbatim in
[`archive/status-history/2026-08-09-project-status.md`](archive/status-history/2026-08-09-project-status.md).

## Current gate — deliver accepted D0 governance repair

Task 0 Product Closure is `accepted` on the current reviewed tree. Final Terra
release QA passed, and independent Sol release review returned `ACCEPT` with
P0/P1/P2=0/0/4. The four P2s are recorded as deferred and nonblocking in the
active PM ledger. No Product Closure code or live-provider work remains.

Accepted current-tree evidence includes:

- exact clean-checkout reconstruction of 105 tracked and 56 untracked manifest
  paths, frozen install, 16/16 typecheck tasks, 16/16 test tasks, and 10/10
  builds;
- environment-only real-model Prompt A and Prompt B journeys passing 2/2 in
  20.3 minutes with no credential or raw model material in output or evidence;
- materially different Published Graphs, accessibility and theme evidence,
  live action inventory 22/22, and exactly 26 canonical evidence PNGs with
  repository/clean-checkout hash equality;
- isolated cleanup at 0 containers, 0 networks, and 0 volumes, with the
  post-run preview guard passing.

The controller-owned reviewed commit and push remain pending, followed by proof
that local HEAD equals the remote branch tip. D0 is `reviewed`, not accepted:
restarted Terra QA passes with P0/P1/P2=0/0/0 and the full provider-free
governance suite passed 11/11 before the decision. The founder accepted ADR-0009
in founder chat on 2026-08-11 with the exact response `接受，继续`. The required
post-decision check is RED 10/11 and the CLI verifier fails on the same single
issue because it still hardcodes ADR status `Proposed`. D0 remains `reviewed`,
not accepted. Founder-transition fix round 3 then fails scoped Sol re-review
with P0/P1/P2=0/1/0: accepted and not-recorded decision markers can coexist, and
proposed status does not reject orphan accepted-decision metadata. Fresh Sol
fix round 4/5 is limited to the verifier and its tests. That repair now passes
RED 18/20 to GREEN 20/20, source-native checks 26/26, and scoped Sol re-review
with P0/P1/P2=0/0/0. Terra recheck is next on the exact tree and complete prior
provider-free evidence. That recheck now passes P0/P1/P2=0/0/0 with focused
20/20, source-native 26/26, CLI, and all prior D0 evidence clean. D0 remains
`reviewed`, not accepted; ADR-0009 remains `Accepted`. Exactly one final
independent Sol release review then returns `REJECT` with P0/P1/P2=0/3/0. PM
acceptance and commit/push are not authorized. The single remaining repair,
round 5/5, is limited to technology governance, the workstream, and the D0
verifier/test. It must remove stale live-state authority, verify the actual
D0/Task 1 fields, and compare every Golden-profile table row bidirectionally to
tracked runtime authorities. Final round-5 scoped Sol re-review returns `ACCEPT`
with P0/P1/P2=0/0/0, and final Terra QA passes P0/P1/P2=0/0/0 with source-native
52/52, CLI, and every governance evidence gate fresh green. PM accepts D0 on
2026-08-12. Controller verification of that exact accepted tree then fails:
source-native governance tests pass 51/52 and the direct CLI exits 1 because the
verifier rejects legitimate D0 state `accepted` and requires `reviewed`.
Independent Sol classifies this as P0/P1/P2=0/1/0 and load-bearing. The prior
Terra result predates the state transition. The round-5/5 cap is exhausted, so
stage/commit/push authority is revoked and delivery is blocked. New explicit
founder authority was required to reopen a minimal post-accept transition
repair. The founder then explicitly responded `接受，继续` in founder chat on
2026-08-12. This reopens exactly one verifier/test-only repair. D0 returns to
`implementing` for that repair while ADR-0009 remains accepted and the prior
acceptance/delivery history is preserved. Task 1 and Restaurant Product code
remain blocked. The exact two-path writer handoff is now complete: RED
reproduces the reviewed-only rejection, GREEN passes the combined source-native
command 58/58 (governance 52/52 plus no-preview 6/6) and the CLI verifier, and
formatting/diff/scope checks pass. Independent Sol review then returns `FAIL`
with P0/P1/P2=0/2/0: historical whole-ledger authorization markers can replay
after supersession/revocation, and the original evidence label obscured the
52+6 composition. The same verifier/test-only writer scope is repairing ordered
single-record authorization and supersession. D0 remains `implementing`; Terra
QA and delivery remain unauthorized pending a clean re-review. The same-scope
writer re-handoff now records RED 0/5 for stale/split/revoked/consumed/duplicate
authority and GREEN combined 63/63 (governance 57/57 plus no-preview 6/6),
focused 7/7, broader 25/25, CLI, formatting, diff, and two-path scope. The same
Sol reviewer recheck is in progress; no later gate is authorized yet.
The same Sol re-review now passes P0/P1/P2=0/0/0 with focused 7/7, broader
25/25, combined 63/63 (governance 57/57 plus no-preview 6/6), CLI, formatting,
and diff checks green. D0 is `ready_for_qa` for one exact-tree, provider-free
Terra pass over authorization freshness, live state/blockers, and the complete
D0 evidence. Terra stops before the full run with P0/P1/P2=0/1/0: the current
CLI exits 1 and the checked-in contract passes 0/1 because the verifier rejects
the legitimate `ready_for_qa` transition. D0 returns to `implementing` for the
same exact two-path, founder-authorized repair. It must validate one current
ordered Sol-PASS/Terra-authorization record and reject missing, split, stale,
failed, revoked, superseded, or consumed records. Same-Sol re-review must pass
before Terra restarts. The same-scope re-handoff now records RED 0/10 across the
complete authorization lifecycle, then GREEN focused 10/10, broader 34/34, and
combined 72/72 (governance 66/66 plus no-preview 6/6), with CLI,
formatting/diff, and two-path scope clean. The same Sol re-review is in progress.
D0 remains `implementing`; Terra, delivery, and Task 1 remain unauthorized. The
same Sol re-review then fails P0/P1/P2=0/1/0 because invalidation misses the
repository-native `Sol task review returns FAIL` wording. The same two-path
repair now requires a bounded semantic Sol/Terra gate-outcome classifier across
review, re-review, task review, release review, QA, and recheck vocabulary, with
parameterized REDs and false-positive controls. No broader ledger schema or
scope is authorized. The resulting handoff declares combined source-native
82/82 (governance 76/76 plus no-preview 6/6), CLI, formatting, diff, and scope
green, but the same Sol re-review returns `FAIL` with P0/P1/P2=0/1/0: the
classifier checks only the first severity tuple, so an earlier 0/0/0 masks a
later current 0/1/0 in the same gate record. The correction remains frozen to
the verifier and its test only. It must evaluate every non-quoted tuple, cover
both tuple orders and mixed PASS/FAIL wording, and retain quoted-history and
all-zero false-positive controls. Fresh controller evidence on the active TDD
tree is RED at governance 79/81 on the zero-then-nonzero and mixed-outcome
controls; the reverse order, quoted-history, and all-zero controls pass. The
all-tuples GREEN handoff now passes focused 5/5, broader ledger 49/49, and
combined source-native 87/87 (governance 81/81 plus no-preview 6/6), together
with CLI, formatting, diff, and exact two-path scope. The same Sol re-review now
returns `FAIL` with P0/P1/P2=0/1/0: Markdown inline-code historical tuples are
not excluded, so a valid current 0/0/0 record is consumed by a backtick-quoted
`historical P0/P1/P2=0/1/0` explanation. The repair remains on the exact
verifier/test pair and must add backtick, straight-single, and curly quote
controls while retaining genuine backticked PASS/FAIL verdict detection and
unquoted nonzero-tuple invalidation. The inline-code fix records focused RED 4/5
on exactly that false positive, then GREEN focused 5/5, broader ledger 53/53,
and combined source-native 91/91 (governance 85/85 plus no-preview 6/6), with
CLI, formatting, diff, and exact two-path scope green. The same Sol final
re-review returns `FAIL` with P0/P1/P2=0/1/0 because the exact explanatory-span
boundary is still uncovered: the sanitizer handles a backtick span containing
only the tuple, while the ledger requires
`historical P0/P1/P2=0/1/0` inside the paired span and also requires ASCII
single-quoted history rather than only double-quoted coverage. The same
verifier/test repair must remove complete tuple-containing paired spans for
Markdown backticks, ASCII single/double quotes, and curly single/double quotes,
while leaving genuine standalone backticked PASS/FAIL verdict tokens visible.
The complete paired-span fix records focused RED 2/5 on the backtick phrase,
ASCII single-quoted phrase, and curly single-quoted phrase, then GREEN focused
5/5, broader ledger 56/56, and combined source-native 94/94 (governance 88/88
plus no-preview 6/6), with CLI, formatting, diff, and exact two-path scope green.
The same Sol re-review returns `FAIL` with P0/P1/P2=0/1/0: the paired-span regex
mistakes intra-word ASCII and curly apostrophes for quote delimiters, so a
genuine unquoted nonzero tuple between possessives can be removed and stale
ready authority can pass. The exact verifier/test repair must replace that
single-quote regex behavior with a boundary-aware paired-span scanner where
single quotes delimit only at non-word boundaries. Focused controls must cover
ASCII and curly possessives, contractions, exact quote positives, and unmatched
or mixed delimiters. The boundary-aware scanner handoff records focused RED
9/11 on the possessive/contraction controls, then GREEN focused 11/11, broader
ledger 64/64, and combined source-native 102/102 (governance 96/96 plus
no-preview 6/6), with CLI, formatting, diff, and exact two-path scope green. The
same Sol re-review now passes P0/P1/P2=0/0/0 with fresh scanner 11/11, complete
102/102, CLI, formatting, and diff evidence; lifecycle, ADR-0009, Task 1 state
and proposed contract, and the push-equality blocker remain strict. D0 advances
to `ready_for_qa` for one exact-tree, provider-free, read-only Terra restart.
Task 1 and delivery remain blocked; PM re-acceptance and every
product/provider/service/Docker action remain unauthorized pending Terra PASS
with no open P0/P1. The final exact-tree Terra restart now passes
P0/P1/P2=0/0/0 with combined source-native 102/102 (governance 96/96 plus
no-preview 6/6), CLI, complete scanner/lifecycle/ADR/Task 1 contract and blocker,
Golden-profile, provenance, threat-model, recovery, all 11 TOMLs, formatting,
diff, exact 19-path, and clean sensitive-material evidence. PM re-accepts D0 on
2026-08-12. D0 is `accepted`; Task 1 remains `planned`, its contract `proposed`,
and blocked until PM records the reviewed D0 commit pushed with local HEAD equal
to the remote branch tip. The controller may now perform only the accepted-state
CLI, exact 19-path stage audit, reviewed commit, non-force push, and local/remote
equality verification. Product/provider/service/Docker work remains
unauthorized. Controller pre-commit verification then fails combined
source-native 101/102 on one fixture-only P1: the positive authorized-repair
fixture changes its copied ledger to `implementing` but leaves the later PM
re-acceptance in place, so production correctly rejects the authority as
consumed. The direct accepted-state CLI remains green. D0 stays `accepted`, but
delivery authority is revoked while a test-only correction reconstructs the
historical positive slice before re-acceptance; the stale-authority negative
must keep the full final history. The same Sol review and one exact accepted-tree
Terra QA pass are required before PM can restore delivery. Task 1 and every
product/provider/service/Docker action remain blocked. The fixture-only handoff
records RED 0/1 on the consumed-authority positive, then GREEN post-accept 7/7
and combined source-native 102/102 (governance 96/96 plus no-preview 6/6), with
the accepted-state CLI, formatting, diff, and exact test-only scope green.
Production verification remains unchanged. The same Sol review is in progress;
D0 remains `accepted`, and delivery and Terra QA remain blocked pending the
verdict. The same Sol fixture re-review now passes P0/P1/P2=0/0/0 with fresh
post-accept 7/7, complete 102/102, accepted-state CLI, formatting, and diff
evidence; production remains unchanged. One exact accepted-tree, provider-free,
read-only Terra QA pass is now authorized. Delivery remains revoked, and Task 1
remains blocked, until Terra passes with no open P0/P1 and PM explicitly restores
the exact 19-path delivery authority. Final accepted-tree Terra QA now passes
P0/P1/P2=0/0/0 with combined source-native 102/102 (governance 96/96 plus
no-preview 6/6), accepted-state CLI, complete fixture/scanner/lifecycle/ADR/Task
1 contract and blocker, Golden-profile, provenance, threat-model, recovery, all
11 TOMLs, all five maps, formatting, diff, exact 19-path, and clean
sensitive-material evidence. PM restores the exact 19-path controller delivery
authority. D0 remains `accepted`; Task 1 remains `planned`, `proposed`, and
blocked until PM records the pushed local/remote equality. No product, provider,
service, Docker, or cloud action is authorized.

Authorities:

- [Product Closure plan](superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md)
- [Product Closure ledger](superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md)
- [Product Closure acceptance record](acceptance/requirement-to-product-closure.md)

## Sole P1 after Product Closure

After the closure gate is sealed, the only P1 product target is
**Prompt-to-Polished Restaurant Product**. One fine-dining restaurant brief
must create one immutable Published Application Graph with two coherent
surfaces:

- a customer mobile application with Home, Menu, Dish Detail, Cart, Checkout,
  Orders, Order Detail, and Profile;
- a merchant desktop application with Dashboard, Menu Management, Orders,
  Kitchen Queue, Tables, Users/Roles, and Settings.

Both surfaces share catalog, modifiers, pricing, cart totals, orders,
idempotency, inventory, simulated payment, identity, policy, workflow, and
audit semantics. The default Workbench journey hides database, policy-engine,
and infrastructure details while keeping contextual editors and Advanced
inspection available.

## Product-entry decision

The current Workbench intentionally exposes no Profile starter or template
picker. Product review has identified this as a gap. The accepted correction is
to offer two equal creation paths: `Describe a product` and `Start from a
template`. A template is a versioned, published, first-party Product
Recipe and Graph snapshot that is instantiated as an independent editable
Draft workspace with seed data and an immediate Draft Preview Snapshot. It
would retain origin/version metadata but would not auto-merge future template
updates.

The first iteration uses curated official templates only. Community publishing,
template commerce, and automatic template-update propagation remain deferred.
The three product contexts are Workspace Home, Builder Workspace, and
application-scoped Management; the last exposes only capabilities backed by
real behavior and tests.

The current Workbench screenshot does not yet meet this decision. It uses a
generic dotted canvas, exposes workspace/revision/lifecycle mechanics early,
opens the Inspector by default, shows fragmented cards and large empty areas,
and renders several requirement-composer controls without their intended
component styles. This is now treated as an information-architecture and source
ownership problem rather than a color-polish task.

The accepted UI source stack is:

```text
ui-primitives -> ui-patterns -> workbench-ui / generated-ui
              -> screen-recipes -> experience-recipes -> product-recipes
```

The 3,818-line `globals.css`, 907-line `use-workbench-controller.ts`, and
1,131-line `control-plane-client.ts` are mandatory Task 6 decomposition inputs.
The new Workspace Home, Builder Workspace, and App Management behavior will not
be appended to those monoliths.

The public product identity is Archeform · 元象, following the root README.
Stable `@factory/*` package names, `factory.application-graph/*` serialized
protocols, Git paths, history, and immutable hashes remain unchanged until a
separate versioned internal-namespace migration is approved.

Authorities:

- [Product reset](iterations/2026-08-10-prompt-to-polished-product-reset.md)
- [Restaurant Product design](superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md)
- [Restaurant Product plan](superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md)
- [Restaurant Product ledger](superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md)
- [Product-builder ecosystem research](research/2026-08-10-product-builder-ui-ecosystem.md)

## Next gate

The next authorized sequence is:

1. rerun the accepted-state CLI, stage only the exact 19 paths, verify the
   staged manifest and
   sensitive-material boundary, create the reviewed D0 commit, push without
   force, and verify local HEAD equals the remote branch tip;
2. only after PM records that pushed equality, freeze `ProductIntentV1`,
   `ExperienceBriefV1`, `ProductRecipeV1`,
   `ApplicationSurfaceV1`, `ScreenIntentV1`, `SourceOverlayV1`,
   `DraftPreviewSnapshotV1`, and `factory.application-graph/v2` in Task 1;
3. begin Task 2 Restaurant semantics and Task 3 UI Registry/Workbench source
   foundation in parallel only after the Graph v2 contract is reviewed and
   frozen;
4. converge those two lines in the customer and merchant compiler surfaces;
   pause both if a shared contract change is required.

## Explicitly deferred

Until Restaurant Product acceptance, do not resume:

- 100+ Profile or broad capability-family expansion;
- production payments;
- cloud deployment, application fleet, or managed operations;
- connector-marketplace or unrestricted third-party runtime ingestion;
- unrestricted generated-source editing or reverse parsing;
- Figma or Stitch runtime integration;
- production use of Aceternity candidates without item-level evidence.

## Evidence boundary

This page is a current delivery summary, not a release claim. The PM ledger and
acceptance records control task state. Credentials and raw model prompts or
responses must never enter documentation, evidence, generated source, or
runtime logs.
