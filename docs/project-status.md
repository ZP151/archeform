# Archeform delivery status

Updated: 2026-09-01

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

## Current milestone — Post-v0.1 Local Restaurant Readiness

### Current authoritative checkpoint — 2026-09-02

`factory-pilot v0.1.0` remains the delivered local Alpha baseline. The active
follow-up is now a bounded local-only iteration for one to five invited
technical evaluators: supported Node 22 preflight, credential-free CI, and one
repeatable real Home-template journey through edit, immutable Publish,
Compilation, verification, customer order, merchant fulfilment, preview, and
empty cleanup. Hosted or multi-user operation, production identity/tenant
isolation, cloud deployment, new Graph/capability/provider contracts, and
Compose topology changes remain excluded.

The active branch is `codex/post-v0.1-local-readiness` at `140f8646`, exactly
equal to its upstream `origin/codex/post-v0.1-local-readiness` at ahead/behind
`0/0` before ADR-0030 acceptance reconciliation. D0, U1, U2, F0, V0, their
governing ADRs through ADR-0029, and the portable Compiler missing-root fixture
are delivered on that branch.

The founder explicitly accepted ADR-0029 on 2026-09-01 and established a
standing independent-agent review policy for future Tech Lead ADRs. A separate
qualified reviewer may authorize automatic continuation only under the exact
boundedness and P0/P1 `0/0` conditions recorded in `docs/tech-governance.md`;
non-qualifying or material-risk decisions stop or escalate.

### Remote repository alignment

- A fresh `fetch --prune --tags` proves local `HEAD`, local `main`, and
  `origin/main` all equal `abcae804`, with ahead/behind `0/0`.
- GitHub records exactly two pull requests, both merged into `main`: Restaurant
  Product closure PR #1 and the post-release status/Home-polish PR #2. There is
  no open pull request for the current readiness iteration.
- GitHub records the non-draft, non-prerelease `factory-pilot v0.1.0` release.
  Its annotated tag peels to merge commit `a66d290e`.
- GitHub Actions run `33510492402` executed both U2 Node lanes. Both passed
  checkout, setup, frozen install, toolchain Doctor, and Prisma generation,
  then failed the inherited root formatting baseline. The failure contains no
  evidence of a workflow, permission, credential, or dependency-cache defect.
- Replacement GitHub Actions run `33530986071` at commit `140f8646` passed
  every configured step in both Node `22.11.0` and current `22.x` lanes. This
  accepts U2 and F0; it does not erase the separately reproduced scheduler-
  dependent Candidate race now governed by ADR-0030.
- Two remote archive tags now preserve the exact former local-only branch tips:
  `archive/agent-console-next-shadcn-2026-08-31` peels to `dbf0ba40`, and
  `archive/commerce-transaction-v1-2026-08-31` peels to `b481fc78`. The local
  branch names remain present and neither branch is an iteration input.

### Milestone state

- **D0 — design and governance:** `accepted` on 2026-09-01. The founder
  explicitly accepted ADR-0024 and directed continued execution under a
  long-running goal. The remote branch-asset tags are reconciled.
- **U1 — supported toolchain doctor:** `accepted` on 2026-09-01. The founder
  accepted ADR-0025, making `pnpm run doctor` and `pnpm run doctor:toolchain`
  the supported spellings.
- **U2 — credential-free CI:** `accepted`; replacement run `33530986071`
  passed both complete Node lanes.
- **F0 — repository format baseline:** `accepted`; its exact 58-path commit
  `e0cfaa94` passed independent review, byte-integrity gates, and replacement
  remote CI.
- **V0 — generated notification outbox verifier repair:** `accepted` on
  2026-09-01; ADR and task reviews are clean, controller gates passed, and
  commit `0bed0d3e` is pushed at local/upstream `0/0`.
- **R0 — Candidate durable-winner convergence:** `implementing` under accepted
  ADR-0030. The first independent ADR review found one staging-isolation P1;
  the revised ADR received a fresh `0/0/0` review and
  `APPROVED_FOR_STANDING_ACCEPTANCE: yes` under the founder's standing policy.
- **U3 — real Home template product acceptance:** `planned`, serialized, and
  queued behind R0; no U3 implementation is authorized.
- **U4 — QA, release review, and delivery:** `planned`; blocked by accepted U1,
  U2, and U3.

U1 is accepted with fresh supported-environment evidence: Node `v22.11.0`, pnpm
`9.0.0`, Doctor tests 35/35, explicit toolchain Doctor PASS, and explicit local
Doctor PASS with Docker server `29.6.2`. The exact selector, focused formatting,
diff, unchanged lockfile, active-reference, sensitive-pattern, and four-path
containment checks also pass. Historical characterization retains obsolete
`pnpm doctor` only as collision evidence; the explicit command is the supported
local preflight. No Compose resources were created. Independent review recorded
P0/P1/P2=`0/0/0`.

### Risks, blockers, and next smallest slice

- **Delivery state:** U2, F0, V0, and the portable Compiler fixture are pushed
  through `140f8646` with local/upstream equality before ADR-0030 acceptance
  reconciliation. Replacement CI is green in both Node lanes.
- **Current gate:** implement and independently verify the accepted ADR-0030
  four-path Candidate convergence repair. U3 remains planned behind R0.
- **Evidence gap:** the `pm-status` workflow names `docs/mvp.md`, but that file
  does not exist. This refresh used `docs/roadmap.md`, the current delivery
  assessment, the readiness design, and its PM ledger as the available scope
  authorities.
- **Next smallest slice:** capture deterministic Candidate/Store RED, implement
  atomic isolated publication and strict durable-winner recovery, then obtain
  independent task/QA and replacement CI evidence. Do not begin U3 until R0 is
  accepted.

### Previous release checkpoint — 2026-08-21

The Restaurant dual-surface product milestone is complete and recorded as
`factory-pilot v0.1.0`. Its recorded release gate passed 29/29 package
typechecks, 29/29 test tasks, 17/17 builds, third-party/source-study checks, one
environment-only real-model journey, desktop and 390px accessibility with zero
violations, and empty cleanup. The post-release Home creation-entry polish is
delivered at `4d99fd2`. This proves a credible local product Alpha; it does not
prove a hosted or multi-user product.

### Restaurant delivery history — checkpoint 2026-08-14

Graph V3 is delivered and its gate is consumed. Controller commit
`8230197241589865f289c223fc346b6d91a438ae` has the exact subject
`feat(graph): add application graph v3 contracts`, exactly the frozen 16 paths,
and a successful non-force push on
`feat/governed-composition-capability-foundry`. Local `HEAD` equals upstream at
that exact hash and the delivered baseline was clean. Before delivery, focused
Graph/browser 111/111, dispatch 12/12, Graph 465/465, compiler 415/415,
typecheck/build, formatting/diff, declaration/browser/import, exact-manifest,
and sensitive checks passed. Staged Expected16/Actual16 equality had no missing,
unexpected, unstaged, or untracked path.

The shared contract, now refrozen for Product Recipe V2, is
[`superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`](superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md).
Its formatted SHA-256 is
`ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.
It fixes two surfaces, fifteen page/route/recipe identities, the legacy mapping,
registry namespaces, the complete field-authority classification, three flows,
seven step-scoped V3 journeys, transition/UI Policy keys, and every page/block
Domain/Flow/Policy binding port. The legacy actorless table-session expiry paths
become explicit manager-granted V3 transitions; V1/V2 bytes and validators are
unchanged.

A pre-write shared-contract check found that this manifest cannot be expressed
by delivered `ProductRecipeV1`. Its surface owner set is exactly
`entryPageKey` plus `navigation.items[].pageKey`, and it rejects every unowned
screen. The manifest requires `customer-dish-detail`, `customer-checkout`, and
`customer-order-detail` to belong to `customer-mobile` while deliberately
excluding them from the five-item bottom-tab navigation. Adding hidden or
duplicate navigation entries would violate the exact navigation contract.
The stop-both rule was active until Product Recipe V2 delivery. The pre-V2 hash
`75d67d44e922c3064fd5a63fc877366e2d17259be4fcebace1adbc4a6a8a4423` remains
historical evidence, not the executable Task 2/Task 3 contract.

### Active work

- Product Recipe V2 is `delivered` at
  `0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa` with the exact subject and 17-path
  manifest. The non-force push succeeded despite an informational moved-repo
  notice; remote configuration remains unchanged. Local `HEAD` equals upstream,
  tracked dirty and staged counts are zero, and the residual untracked set is
  exactly the Task 3 inventory plus 21 scaffolds. The prerequisite delivery gate
  is consumed.
- The Restaurant shared manifest is refrozen for
  `factory.product-recipe/v2` at formatted SHA-256
  `ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732` on base
  `0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`.
- Task 2 is delivered and pushed at
  `fbcf92eaf916c9eefa618cad163b44c34dcb0c3c` with exactly eleven capability
  paths. Fresh evidence passes focused 20/20, full Capabilities 384/384, Graph
  661/661, both typechecks/builds, exact containment, and independent review
  P0/P1/P2=0/0/0. It provides the deterministic Product Recipe V2 and Graph V3
  Restaurant semantics without dependency or runtime expansion.
- Task 3 is delivered and pushed at
  `8313e7ae49f8782bd3ab104d0141c60c96f6e4c3` with exactly 31 paths: the reuse
  inventory, seven private packages, one notice, and seven importer-only lock
  additions. Fresh evidence passes 44/44 tests, seven typechecks/builds, 270
  normal renderer executions, 135 hostile-state rejections, 135 unsafe-URL
  scrubs, all fifteen screen-source ESM imports, full-product ESM import, and
  independent review P0/P1/P2=0/0/0. The lock delta is exactly `+72/-0` with no
  package or snapshot drift.
- Cross-task closure passes for the exact fifteen pages, seven journeys,
  surface ownership, generated block ports, and the 53,497-byte complete
  product source selection. The shared contract SHA remains
  `ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.
- Task 4 is delivered at `0e85ed6135abeea3f3c44624856b796fa05c2c03`.
  Task 5 is delivered at `96712e8653507910f4c78ebe9c964a9428f9fef5`
  with exactly 17 compiler paths, the exact subject
  `feat(compiler): add restaurant merchant v3 target`, non-force push,
  local/upstream equality, and a clean tree. Fresh delivery evidence passes
  focused 67/67, Compiler 491/491, Graph 661/661, Capabilities 384/384,
  type/build/static gates, and independent P0/P1/P2=0/0/0.
- Task 6A is delivered and pushed at
  `1a659a2700056fa5c6814aadd6cb0fb924f27596`. It replaces the former mixed
  shell with distinct Apps and Builder contexts, makes Advanced progressive,
  and preserves the existing V1 product journey. Fresh delivery evidence passed
  375 Workbench tests and independent review had no blocking finding.
- Task 6B is delivered by the enclosing Task 6B commit under accepted
  [`ADR-0012`](adr/adr-0012-curated-template-draft-preview-lifecycle.md). The
  delivered slice adds one first-party Restaurant template, an independent V3
  Draft clone, append-only Snapshot V2 persistence, a dual-surface product
  preview, and rename-only Draft r.2 editing. It does not widen Graph, V3
  Publish, or Compilation. Fresh evidence passes Control Plane 253/253,
  Workbench 384/384, the real browser clone/preview/rename journey 1/1, both
  package typechecks/builds, and final independent review P0/P1/P2=0/0/0.
- Task 7A is delivered by its enclosing reviewed commit under accepted
  [`ADR-0013`](adr/adr-0013-template-page-draft-revision-operation.md). It is
  limited to selecting one delivered Restaurant page, changing only its title,
  and appending Graph V3 Draft r.3 plus a new immutable Snapshot V2. Graph,
  Puck, Data, Users, Workflow, Experience, Publish, Compilation, dependencies,
  providers, and deployment remain unchanged. Fresh evidence passes Control
  Plane 278/278, Workbench 390/390, Graph 661/661, Capabilities 384/384,
  Compiler 491/491, both typechecks/builds, Prisma validation, browser journey
  1/1, exact 28-path containment, and independent P0/P1/P2=0/0/0 review.
- Task 7B is delivered by its enclosing reviewed commit under accepted
  [`ADR-0014`](adr/adr-0014-template-page-block-order-round-trip.md). It is the
  bounded visible Page slice: reorder the existing exact block set in one
  Graph V3 `main` region, append a Draft and immutable Snapshot V2, and show the
  server-authoritative order in Workbench. Its exact 25 implementation paths are
  frozen in
  [`the executable plan`](superpowers/plans/2026-08-14-template-page-block-order.md).
  Puck permits drag only; insert, edit, duplicate, and delete remain disabled.
  Graph, Product Recipe, Screen Recipe, generated runtime, Publish,
  Compilation, Prisma, dependencies, lockfiles, providers, services, and
  deployment remain unchanged.
- Task 7C is delivered at
  `78955444cb82d95346fb4fbded03167f982eb693` with exact subject
  `feat(workbench): add governed restaurant data editing`, non-force push,
  local/upstream equality, and a clean tree. Accepted
  [`ADR-0015`](adr/adr-0015-template-restaurant-seed-data-edit.md) authorizes
  only `Menu items -> Margherita pizza -> Dish name`: update the mirrored
  `menu-item.name` seed/scenario value to `Heirloom tomato pizza`, append Draft
  r.5 and one active immutable Snapshot V2, then update Customer Menu and
  Merchant Menu Management only from the strict checksum-matched response. The
  [`executable plan`](superpowers/plans/2026-08-14-template-restaurant-seed-data-edit.md)
  freezes exactly 22 implementation paths. Graph, Capabilities, recipes,
  Compiler, Prisma, packages, lockfiles, generated runtime, Publish, Source,
  providers, services, and deployment remain excluded. Final evidence passes
  focused Control Plane 90 and Workbench 86; full Control Plane 370, Workbench
  439, Graph 661, Capabilities 384, Compiler 501; five no-emits, builds, Prisma,
  Next, Playwright 1/1, and exact-28/static gates. Final Sol returns
  `RELEASE_ACCEPT` and targeted Terra returns `PASS`, both P0/P1/P2=0/0/0.
- Task 7D Experience is delivered at
  `35da63df867dc0271254b1cbad38e5613a27c348` with exact subject
  `feat(workbench): add governed restaurant theme editing`, non-force push,
  local/upstream equality, and a clean tree. Accepted
  [`ADR-0016`](adr/adr-0016-template-restaurant-experience-theme-revision.md).
  Its exact outcome is Builder -> Experience -> Theme, Light -> Dark: append
  Draft r.6 and one active immutable Snapshot V2, then switch the Customer and
  Merchant Workbench preview frames only from a strict checksum-bound response.
  The [design](superpowers/specs/2026-08-14-template-restaurant-experience-theme-design.md)
  and [executable plan](superpowers/plans/2026-08-14-template-restaurant-experience-theme.md)
  freeze exactly 23 implementation paths and an additive Workbench Experience
  destination. Graph, Capabilities, recipes, Compiler, generated runtime,
  Prisma, dependencies, providers, services, and deployment remain unchanged.
  Independent review passes after the P1 repair, targeted Terra passes, and
  final Sol returns `RELEASE_ACCEPT`, actionable P0/P1/P2=0/0/0. Controller
  delivery consumed the exact 29 paths.
- Task 8A Source Explorer is delivered at
  `8c2767bb2c333d2086ca1b2d0f8cdc4c348bf7f0` with exact subject
  `feat(workbench): add governed source explorer`, non-force push,
  local/upstream equality, and a clean tree. Accepted
  [`ADR-0017`](adr/adr-0017-workbench-source-explorer.md). It adds only
  Builder -> Code -> Source for a succeeded immutable Compilation: show the
  complete registered artifact tree ordered by path, then display a selected
  file only after exact manifest path/digest admission and the existing server
  rehash. The [design](superpowers/specs/2026-08-14-workbench-source-explorer-design.md)
  and [plan](superpowers/plans/2026-08-14-workbench-source-explorer.md) freeze
  exactly nine Workbench paths. The ninth is only the existing shell test for a
  valid 64-lowercase-hex digest fixture; no production contract changes. Search,
  diff, edit, overlays, ZIP, Git, Draft
  Snapshot source, and all Control Plane/Graph/Compiler/runtime expansion are
  deferred.
  Repaired-tree independent re-review is clean, targeted Terra returns `PASS`,
  and final Sol returns `RELEASE_ACCEPT`, actionable P0/P1/P2=0/0/0, after
  stale-failure and valid-success A/B characterization. Controller delivery
  consumed the exact 15 paths.
- Task 8B Source Search is delivered at
  `84a90c4b17fe30bc35921fb25aebf228009678be` with exact subject
  `feat(workbench): add source search`, non-force push, local/upstream equality,
  and a clean tree. It adds only local
  case-insensitive manifest-path filtering and bounded inert find-in-current-
  verified-file highlighting. The
  [executable plan](superpowers/plans/2026-08-14-workbench-source-search.md)
  freezes exactly four Workbench paths, 120-character queries, exact
  non-overlapping match counts, and at most 500 rendered marks. No API, client,
  hook, service, index, preload, Diff/edit/overlay/ZIP/Git, or Snapshot work is
  authorized.
  Mandatory RED is unit 6/15 plus browser 1/1; initial GREEN passes focused 15,
  full Workbench 488, no-emit, Next, and browser 1/1. Independent review's one
  same-ID Compilation replacement P1 is repaired RED 1/16 -> GREEN 16/16; fresh
  full Workbench 489, no-emit, Next, browser 1/1, and exact-eight static gates
  pass. The same reviewer returns P0/P1/P2=0/0/0 and
  `READY_FOR_DELIVERY YES`; controller delivery consumed the exact eight paths.
- Task 8C Verified Source Transfer is delivered at
  `97b6dbdb6176ca26af6d7fa2b71dad6bbc692e19` with exact subject
  `feat(workbench): add verified source transfer`, non-force push,
  local/upstream equality, and a clean tree. Under the founder standing
  instruction and ordinary deterministic UI delivery policy, the
  [executable plan](superpowers/plans/2026-08-14-workbench-verified-source-transfer.md)
  freezes the same exact four Workbench paths. Only the current verified file
  can be copied or downloaded; copy transfers the exact admitted content with a
  stale-completion token, while download emits the exact UTF-8 bytes using a
  scrubbed safe basename hint and deterministic Object URL cleanup. Selection,
  pending/failure, or Compilation invalidation clears/disables transfer state.
  No new request, client, hook, API, Control Plane, dependency, ZIP, Diff, Git,
  overlay, or persistence work is authorized.
  Mandatory RED is unit 28/44 plus browser 1/1 with production untouched. GREEN
  passes focused 44, full Workbench 517, no-emit, Next, browser 1/1, and clean
  exact-eight static/containment gates. The independent review returns
  P0/P1/P2=0/0/0 and `READY_FOR_DELIVERY YES`; controller delivery consumed the
  exact eight paths.
- D0 Restaurant V3 Runtime Catalog Parity is `delivered` at
  `74c68a132f48b3230992fad2f3fa80abfb066b84` with exact subject
  `fix(compiler): bind restaurant runtime catalog to graph seed`, non-force push,
  local/upstream equality, and a clean tree.
  [ADR-0018](adr/adr-0018-restaurant-v3-runtime-catalog-parity.md) replaces only
  the Restaurant compiler's blanket canonical Graph hash pin with an exact
  r.6-family normalize-to-canonical-hash proof and binds both generated surfaces
  to one strict Graph-seeded runtime catalog. USD Graph prices remain major-unit
  numbers with finite `0..100000` and at most two decimals; runtime/API rows emit
  integer minor units. Focused 121/121, full Compiler 579, Graph 661, and
  Capabilities 384 passed with all three no-emit/build gates; independent Sol
  review returned P0/P1/P2=0/0/0.
- Task 8 source breadth (compiler core) is `delivered` under accepted
  [ADR-0019](adr/adr-0019-workbench-source-diff-export-overlay.md). It adds the
  deterministic source manifest, controlled overlay apply, generated-file diff,
  deterministic ZIP export, and Graph-first Git export in
  `packages/compiler/src/targets/source/`. No Graph, Capability, Recipe, schema,
  dependency, Control Plane route, provider, service, Docker, Compose, or
  deployment change. Independent Sol review returned ACCEPT with P0/P1/P2=0/0/5;
  the five non-blocking P2s (git file/dir prefix-collision rejection now closed,
  package/config/entry exclusion deferred to the source-export admission layer,
  diff/mediaType/origin contract clarifications) are recorded as deferred. The
  Workbench download/diff surface and its E2E journey are deferred to a follow-up
  slice that adds a tenant- and digest-scoped read-only source-export route.
- Task 8 source-export route and Workbench download surface is `delivered` under
  accepted [ADR-0020](adr/adr-0020-workbench-source-export-route.md). It adds one
  read-only, tenant- and digest-scoped
  `GET /compilations/:id/source-archive?format=zip|git` route that rehashes every
  registered artifact through `GeneratedArtifactReader` and builds the archive via
  the delivered `buildSourceZip`/`buildGitExport`, plus the Workbench download
  buttons and client transport. No Graph, Capability, Recipe, schema, dependency,
  provider, service, Docker, Compose, or deployment change. Independent Sol review
  returned ACCEPT with P0/P1/P2=0/0/0. The
  `e2e/restaurant-source-export.spec.ts` journey is deferred to Task 9's
  full-stack acceptance.
- Generated runtime Graph-valid permission and actor enforcement is `delivered`
  under accepted
  [ADR-0021](adr/adr-0021-generated-runtime-permission-actor-enforcement.md). It
  replaces the fixed capability-flag authorization with generic
  `permission`/`transition`/`flowRequest`/`clientField`/`writableField` predicates
  over the serialized Published Graph `policy.permissions`, `flows`,
  `fieldAuthorities`, and `bindingPolicies`, so any Graph-valid permission or actor
  addition is enforced and any removal fails closed. Independent Sol review
  returned ACCEPT with P0/P1/P2=0/0/0 after two P1 and one P2 repair. This is the
  prerequisite for the Access and Workflow contextual editors.
- Compiler admission of Graph-valid permission and actor additions is
  `delivered` under accepted
  [ADR-0022](adr/adr-0022-compiler-admission-permission-actor-additions.md). It
  extracts a cached `getCanonicalRestaurantAuthority()` into
  `@factory/capabilities` (composed from source-level standard Restaurant
  `intent`/`experience`, not test fixtures) and admits bounded additions to
  `policy.roles` and `policy.permissions` while `normalizeAllowedRestaurantValues`
  restores the canonical roles and permissions so the canonical-hash negative
  space still holds. Flows, journeys, field authorities, and bindings remain
  pinned; flow and journey admission is deferred to the Workflow editor slice.
  Independent Sol review returned ACCEPT with P0/P1/P2=0/0/2; the two non-
  blocking P2s (package-internal circular import hazard and role/permission
  ordering-drift acceptance) are recorded as deferred.
- The Workbench Access contextual editor is `delivered` under ADR-0021 and
  ADR-0022. Builder -> Access on the Restaurant template Draft renders the
  declared roles/permissions and admits one bounded write — add a team role
  (Graph key, 1..128, `^[a-z][a-zA-Z0-9-]*$`, not already declared) with a
  bounded `table-session`/`read` permission — appended as Draft r.7 and one
  active immutable Snapshot V2. It is the
  [design](superpowers/specs/2026-08-14-workbench-access-contextual-editor-design.md)
  and [plan](superpowers/plans/2026-08-14-workbench-access-contextual-editor.md)
  freeze, implemented across the Control Plane `template-access-edit.ts`
  capture/apply, the `appendTemplateAccessRevision` service method and
  `POST /template-draft-instances/:id/access-revisions` route, and the
  Workbench client/controller/`template-access-workspace` surface. Only
  `policy.roles` and `policy.permissions` change; the resulting Draft must
  still pass `assertApplicationGraphV3` and
  `assertRestaurantDraftPreviewGraphClosure`, and duplicate, malformed, or
  canonical-role-removing edits fail closed. Independent Sol review returned
  ACCEPT with P0/P1/P2=0/0/4 after a same-reviewer P1 repair; the four P2s
  (negative-injection parity, routing-test, r.7 fixture-role, and
  branch-isolation canaries) are recorded as deferred non-blocking.
- The first independent two-axis Task 7B review returned NOT READY with
  P0/P1/P2=0/6/3. Actionable findings cover hostile array reflection
  amplification, unchanged-order 400 versus fixed 409, registry closure after
  Draft-create attempt, hostile/extra Puck data, real Puck canvas synchronization,
  and the mandatory full release-gate sequence. PM froze same-writer TDD repair,
  added only the existing Compiler preview and two barrel paths needed for a pure
  pre-append closure assertion, and corrected the scope to 25 implementation / 31
  delivery paths. No Graph, recipe, runtime, database, dependency, or lockfile
  expansion is authorized.

### Historical blocked decisions and risks at the 2026-08-14 checkpoint

The following detailed Restaurant history predates the v0.1.0 completion.
Workflow editing, production payments, cloud deployment, fleet operations, and
unrestricted source editing remain deferred; Task 9 itself is no longer
pending. See the current checkpoint above and the release record for the
controlling state.

### Retained historical reconciliation through V3 acceptance

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
service, Docker, or cloud action is authorized. D0 delivery is now complete at
commit `484aa5c42a481efdd8e7c4a2e234c7773d7e5857`
(`docs: establish executable technology governance`). The commit contains the
exact 19 authorized paths and was pushed without force to
`feat/governed-composition-capability-foundry`; fresh evidence records local
HEAD equal to the upstream remote tip at the same hash, worktree status count
0, and the committed accepted-state governance CLI passing. D0 delivery is
fully closed.

Task 1 is `delivered` under integration ownership after independent final Sol
release review `ACCEPT` with P0/P1/P2=0/0/0, fresh PM acceptance
reconciliation, and controller delivery. Commit
`a6e4e6945e79f7ca7cf93686ee00628534f98acd` has the exact subject
`feat(graph): add application graph v2 contracts`, contains the exact 17-path
manifest, and was pushed without force to
`feat/governed-composition-capability-foundry`. Fresh post-push evidence records
local `HEAD` equal to the upstream branch tip at that hash and an empty
worktree. The Task 1 delivery gate is closed and consumed. ADR-0009 remains
accepted, and the additive `factory.application-graph/v2` contract remains
frozen without changing the current Golden runtime profile.

The formerly implicit Task 1 shared boundaries are frozen in the PM ledger:
strict Published V1/V2 envelopes and version adapter, an explicit
Published-V1-to-new-V2-Draft upgrade context with immutable source lineage and
hashes, exact Draft Preview Snapshot transition commands/results and prohibited
production actions, a Graph V2 `journeys` namespace, intrinsic total
`fieldAuthorities`, and matching per-binding `bindingPolicies`. The original
three P1s—intrinsic field authority, own-`__proto__` V1 rejection, and a literal
V2 hash vector—are repaired. A same-Sol re-review P1 for inherited
`constructor` binding lookup is also repaired through own-property validation.
Fresh acceptance evidence passes the six Task 1 files 142/142, Source Overlay
89/89, full Graph 370/370 across 18 files, strict/hash/V1/browser 176/176,
typecheck, build, exact-14 and PM-document formatting, diff/whitespace,
containment, declarations, browser checks, prior A–E regressions, the complete
Windows/DOS matrix, and the journey probe. The exact changed-path manifest is
17/17—14 Graph paths plus this ledger, project status, and roadmap—with zero
sensitive-pattern matches. Broad Prettier still warns only on the same two
unmodified inherited tests.

Task 2 Restaurant semantics and Task 3 UI Registry remain `planned`, with zero
immediate writer authority. The post-delivery shared-contract audit found three
material blockers:

- Graph V2 requires each journey actor to appear in every transition of every
  referenced flow, but the existing Restaurant order flow deliberately divides
  transitions among customer, kitchen, cashier, and manager;
- Graph V2 block bindings and their policies resolve only exact
  `graph.domain.<entity>.<field>` targets, while the Task 3 plan calls for
  Domain/Flow/Policy registry bindings; the plan does not say whether Flow and
  Policy are registry metadata or Graph block bindings;
- Task 3 proposed new UI workspace packages and pinned shadcn/ui Radix
  source/dependency intake without a technology decision. Accepted ADR-0010 now
  permits only the private-package experiment on existing accepted coordinates
  and rejects copied shadcn/ui source and new direct Radix dependencies.

The exact fifteen page keys, recipe keys, block/registry keys, binding ports,
field authorities, journey/flow partition, and legacy-to-new-screen map are
therefore not frozen. Task 2 has one prospective backend writer over the eleven
exact capability paths listed in the ledger; Task 3 has one prospective
frontend writer over the exact private UI package paths listed there. Neither
task is `implementing`, and no RED, package, dependency, copied source, provider,
service, network, Docker, or Compose work is authorized yet.

Founder accepted
`docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`.
The explicit founder response in founder chat on 2026-08-12 was verbatim
`接受`. The accepted ADR records `keep` for the Golden runtime and immutable
Graph V1/V2;
`migrate` for an additive `factory.application-graph/v3` with step-scoped
journey actors, typed Domain/Flow/Policy binding policies, V2-to-V3 Draft
lineage, and `factory.draft-preview-snapshot/v2`; `experiment` for the seven
private version `0.1.0` UI/recipe workspace packages using only the accepted
React, TypeScript, Vitest, and Lucide coordinates; and `reject` for copied
shadcn/ui source or new direct Radix dependencies in this wave. Flow and Policy
bindings are non-authoritative declarations; server-side tenant, actor, policy,
transition, revision, idempotency, and concurrency checks remain mandatory.

The founder separately wrote verbatim `Task 2/3 也授权，如果需要` in founder chat
on 2026-08-12. This is conditional future authorization, not an immediate
dispatch.

The serialized Graph V3 prerequisite first advanced to `ready_for_qa` with contract
`frozen` in
`superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md` and exact
plan `superpowers/plans/2026-08-12-application-graph-v3-prerequisite.md`. The
completed writer slice owns exactly ten paths: new Graph V3 and Snapshot V2 source/tests; the
Graph adapter, adapter test, Node and browser exports; the compiler facade; and
one compiler version-dispatch test. No manifest, lockfile, capability, UI,
Workbench, Control Plane, worker, provider, service, Docker, Compose,
target-plugin, generated-template, PM document, commit, or push is authorized.

The exact contract uses ordered step-scoped journey actors; strict
Domain/Flow/Policy binding discriminators; immutable Published V2-to-new-V3
Draft conversion with Domain-only policy wrapping and source lineage; strict
Published V1/V2/V3 dispatch; and a Graph-V3-only Draft Preview Snapshot V2.
Compiler reconciliation corrects the earlier assumption that V2 compilation
already exists: the current compiler remains V1-only. The new versioned wrapper
strict-adapts first, delegates V1 byte-identically, rejects V2/V3 with exact
unsupported-version errors, and performs no projection or down-conversion.

Initial RED was Graph 6 failed/12 passed and compiler dispatch 7/7 failed with
production untouched. The completed writer and repair evidence passes focused
Graph 51/51, adapter 26/26, focused compatibility 85/85, compiler dispatch 8/8,
full Graph 414/414, full compiler 411/411, typecheck, build, exact-10 formatting,
diff, containment, declarations, browser exports, and banned-import checks. A
Sol task-review P1 for recursive symbol-keyed/non-enumerable Published and
context inputs was repaired from adapter RED 8 failed/18 passed. Final same-Sol
re-review returns specification `COMPLIANT`, code quality `APPROVED`, and
P0/P1/P2=0/0/0, with independent adapter 26/26 and 8/8 adversarial probes
rejected.

Fresh Terra QA now returns `PASS` with P0/P1/P2=0/0/0. It passes focused Graph
59/59, broader behavior 71/71, compiler dispatch 8/8, full Graph 20 files and
414/414, full compiler 23 files and 411/411, both typecheck/build gates,
exact-10 formatting, diff, implementation containment 10/10, delivery
containment 16/16, declarations 21/21, dynamic browser exports 8/8, zero banned
Node imports, and zero changed-hunk sensitive-material matches. The inherited
non-failing `punycode` warning is unchanged. Terra made no edit and used no
provider, model, network, service, Docker, or Compose action.

Final Sol release review returns `REJECT` with P0/P1/P2=0/2/0 while focused
Graph 59/59 and compiler dispatch 8/8 remain green. The missing matrix permits
adapter array subclasses/custom prototypes and caller-controlled `.map()`, and
permits direct Graph V3/Snapshot V2 Zod parsing to normalize inherited,
symbol-keyed, non-enumerable, accessor, or nested hostile inputs. The Graph V3
prerequisite returns to `implementing`; the prior Terra PASS is historical
evidence only.

The six-path repair is handed off. RED evidence is adapter P1 A 20 failed/26
passed and direct V3/Snapshot P1 B 15 failed/41 passed with production untouched.
GREEN passes combined repair 110/110, compatibility 180/180, full Graph 465/465,
compiler 411/411, dispatch 8/8, typecheck/build, format/diff, exact 6/10/16
containment, declarations, browser/import, sensitive-scan, and pinned-hash gates.
Same-Sol re-review returns `COMPLIANT`/`APPROVED`, P0/P1/P2=0/0/0, with 121
hostile checks, zero failures, and zero caller invocations. At that repair
checkpoint the prerequisite advanced to `ready_for_qa` and the writer paused.

Fresh repaired-tree Terra QA returns `PASS`, P0/P1/P2=0/0/0. It passes focused
repair 110/110, compatibility/browser 180/180, hostile arrays 28/28, direct
Node/browser V3/Snapshot boundaries 23/23, corrected helper 6/6 with zero caller
invocations, compiler dispatch 8/8, Graph 465/465, compiler 411/411, typecheck/
build/format/diff, exact 6/10/16 containment, declarations 23/23, identical
browser exports 8/8, zero banned imports, pinned hashes 3/3, zero sensitive
matches, and no drift. The initial QA anomaly was helper inversion/object spread
only; the corrected probe is green, with no product finding or QA edit.

New independent final Sol review returns `RELEASE_REJECT`, P0/P1/P2=0/1/0. The
compiler wrapper validates prototype/key ownership but not enumerable data
descriptors, then dereferences both required fields. A getter executes
(independent probe calls=1), and hidden required values are accepted. Both prior
Graph release P1 families remain closed; there is no other finding. V3 returns
to `implementing`.

The compiler repair is handed off. RED is 4 failed/8 passed with production
untouched. GREEN passes focused 12/12, compiler 415/415, Graph 465/465, hostile
110/110, compatibility/browser 180/180, all static gates, exact 2/10/16
containment, declarations, browser/import, sensitive, and hash checks. Same-Sol
re-review is `COMPLIANT`/`APPROVED`, P0/P1/P2=0/0/0; independent accessors and
hidden data for both required fields reject exactly with zero calls, and parity,
ordering, symbol/inherited/non-plain rejection, and V2/V3 errors remain exact.
At that compiler-repair checkpoint V3 advanced to `ready_for_qa` and the writer
paused.

Compiler-repaired Terra QA returns `PASS`, P0/P1/P2=0/0/0. It passes dispatch
12/12, hostile 110/110, compatibility/browser 180/180, Graph 465/465,
independent descriptor 13/13 and direct Graph/Snapshot 8/8 probes with zero
calls, type/build/format/diff, 2/10/16 containment, declarations 23/23, browser
8/8, zero imports/sensitive matches, and all pins. Three full compiler processes
exited 0, but captured aggregate stdout truncated after database parity, so
Terra does not independently claim the exact 415 count. Prior writer/reviewer/
PM 415/415 evidence remains separate; no product defect or QA edit was found.

Escalated final Sol returns `RELEASE_ACCEPT`, P0/P1/P2=0/0/0. Independent
compiler/adapter/direct-browser probes complete 70/10/70 checks with zero
getter/caller invocation. Final and fresh PM evidence passes focused Graph/
browser 111/111, dispatch 12/12, Graph 465/465, compiler 23 files/415 tests with
raw exit 0, both typechecks/builds, exact-10 format/diff, implementation 10/10
and delivery 16/16 containment, declarations 23/23, browser 8/8, zero imports/
sensitive matches, and all three pins. The complete compiler output resolves
Terra's prior evidence-capture limitation.

The Graph V3 prerequisite is `accepted` but not delivered. The next smallest
valuable slice is controller-only delivery of exactly the frozen 16 paths with
subject `feat(graph): add application graph v3 contracts`: explicit staging,
staged manifest equality/diff/sensitive checks, one commit, non-force push, and
proof that local `HEAD` equals upstream with a clean worktree. No provider,
service, Docker, Compose, or cloud action is authorized. Task 2/Task 3 remain
`planned` with zero writers until PM separately records delivery equality and
freezes their shared key-and-binding manifest.

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

`factory-pilot v0.1.0` completed the Restaurant Product and Task 9 release gate.
The next product gate has not yet been frozen. Before implementation expands,
PM must define the post-release target cohort, local-versus-hosted boundary,
measurable acceptance journey, ownership, and supported Node 22 verification
matrix. The already delivered Home creation-entry polish is the first bounded
usability input, not by itself a new product release.

## Explicitly deferred

Until a post-v0.1.0 iteration explicitly authorizes them, do not resume:

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
