# Archeform roadmap

## Product direction

Archeform is a **Graph-first verified application factory**. The versioned
Application Graph is the durable business source of truth; Workbench editors,
AI, compiler targets, generated applications, Git exchange, and runtime
providers are constrained adapters around it. Product Closure remains on
`ApplicationGraphV1`. The Restaurant Product introduces
`factory.application-graph/v2` through an explicit version adapter while every
V1 Published Revision and hash remains immutable. Archeform is not a
collection of frameworks.

The lifecycle remains: mutable Draft -> validated immutable Published Graph ->
immutable Compilation -> independently verified generated application. A
diagnosis can create a new Draft Diff for review, but it can never patch a
Published Graph, Compilation, or generated source directly.

## P0 — deterministic compiler and generated-application verification

### Plugin compiler migration

**Satisfied on 2026-08-06** by the P0 Compiler Target Plugin Kernel Goal
(`docs/superpowers/ledgers/2026-08-06-compiler-target-plugin-kernel.md`).
The compiler is now modularised behind `CompilerTargetPluginV1`:

```text
supports -> plan -> render -> validate
```

- `packages/compiler/src/core/` owns the versioned contract
  (`CompilerTargetPluginV1`, `PublishedCompilationInput`,
  `CompilationContextV1`, `TargetValidationResult`), deterministic admission
  and ordering (`CompilerTargetRegistryV1`), and generated-file path,
  collision, and digest rules.
- Documentation, policy (Casbin), and database (Prisma schema x2, initial
  migration, seed) are independent registered targets under
  `packages/compiler/src/targets/`, each with frozen file/byte/SHA-256 parity
  evidence across all five Profiles (20 + 15 + 20 frozen legacy digest
  vectors; no unexplained difference). The facade
  (`packages/compiler/src/index.ts`) no longer owns those renderers and
  remains a thin public facade with an unchanged export surface.
- Each plugin consumes only the immutable Published Graph, the validated
  capability composition lock, and the explicit compiler context. Package-
  owned database/policy contributions and Restaurant artifacts flow through
  the explicit context; no compiler, runtime, or generated-app branch selects
  semantics by profile name.
- `packages/compiler/src/index.ts` shrank from 4565 to ~3600 lines through
  responsibility-based extraction; no generic utils/helpers modules were
  introduced.

### Verification loop — satisfied: P0 Isolated Verifier finalization

Every generated-application acceptance path must run:

```text
compile -> isolated boot -> migration -> health -> API -> role journeys
-> authorization denial -> idempotency -> cleanup -> safe diagnosis -> Draft Diff
```

The verifier must use isolated resources, prove cleanup, and retain only the
minimum safe evidence needed for reproducibility. It must check successful and
denied role journeys, migrations, health, API behavior, idempotency, and
resource cleanup. Safe diagnosis identifies Graph-, capability-, binding-, or
target-level causes and proposes a constrained new Draft Diff; it must not
modify generated source, runtime state, Published Graphs, or Compilations.

**Satisfied on 2026-08-07** by the P0 Isolated Verifier Finalization Goal
(`docs/superpowers/ledgers/2026-08-07-isolated-verifier-finalization.md`). The
queued verification run always reaches a terminal status (failed jobs are
terminated with a bounded diagnostic; stalled and queue-layer failures are
observed), and the real Docker acceptance
(`pnpm verify:isolated-verifier-expense`) proves compile, isolated boot,
migration, health, API, role journeys, authorization denial, idempotent
retry, cleanup, generated journey tests, and safe allowlisted evidence end to
end at commits `4c70d2c`/`41fae0f`/`ee97b97`/`765dd39`/`924bd5b` (see
`docs/acceptance/isolated-verifier-expense.md` and
`docs/acceptance/isolated-verifier-release.md`). The Compiler Target Plugin
Kernel and its documentation, policy, and database parity migrations were
already accepted; Isolated Verifier Tasks 1–5 were accepted in the 2026-08-06
ledger and Task 6 finalization is now complete. Safe diagnosis remains scoped
to a reviewable Draft Diff proposal and never patches generated source,
runtime state, Published Graphs, or Compilations.

P0 acceptance gates:

- `CompilerTargetPluginV1` lifecycle contracts and focused tests exist.
- Docs, policy, and database plugins have digest-comparison evidence against
  the current compiler, including an explicit disposition for each difference.
- At least one generated application completes the full isolated verification
  loop, including denial, idempotency, cleanup, and a reviewable Draft Diff.
- Published Graphs and completed Compilations remain immutable under verifier
  and diagnosis tests.

## P1 — Product Closure, then Prompt-to-Polished Restaurant Product

> **Roadmap update — 2026-08-12:** Honest Requirement-to-Product Closure and D0
> are accepted; ADR-0009 is founder-accepted. The reviewed D0 commit and
> non-force push remain pending before Task 1, which stays blocked until local
> HEAD equals the remote branch tip.
> Prompt-to-Polished Restaurant Product is the sole P1 product target. The
> Foundry, 100+ recipe catalogue, twelve-anchor
> expansion, cloud deployment, production payments, connector marketplace,
> and fleet work are deferred until the Restaurant Product is accepted. The
> historical Foundry evidence below remains valid platform foundation; it is
> not an active breadth target.

### P1 Product Closure gate (accepted; delivery pending)

Product Closure was reopened on 2026-08-09. The Base44-inspired
Golden Path goal
(`docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md`)
completed one low-friction Expense Approval replay, retained as **fixed replay
evidence** (commits `2fe78d30`..`e398561`, clean-checkout suites, docker-level
cleanup proof), but a blank or non-Expense workspace cannot start that journey
and no free-form requirement enters the system. It does not prove
requirement-to-product closure. The accepted gate follows the 2026-08-09 honest
requirement-to-product closure plan:

```text
empty workspace -> free-form requirement -> validated RequirementSpec and
ProductBlueprint -> deterministic capability plan -> generated Application
Graph -> editable multi-page Puck product -> Publish -> Compile -> isolated
verification -> runnable preview and cleanup
```

Two unrelated prompts — Expense Approval and Appointment Booking — passed
from an empty workspace **without selecting a Profile or starter**, with
materially different entities, fields, pages, routes, roles, permissions,
workflows, navigation, seed scenarios, and role journeys; both products are
edited in multi-page Page Studio, published, compiled, independently booted,
verified, previewed, and cleanly removed. The Workbench is rebuilt around this
primary journey (icon rail, contextual sheets, one primary action, compact
typography, Lucide, light default / dark functional; portfolio noise leaves
the default Home frame). The real OpenAI provider was used for final local
acceptance through environment-only credentials; raw prompts, responses, and
credentials were not persisted. The accepted clean checkout reconstructed the
exact 105-tracked/56-untracked manifest, passed 16/16 typecheck tasks, 16/16
test tasks, 10/10 builds, both guarded real-model journeys, material difference,
accessibility/theme, live action inventory 22/22, and exact 26-file evidence
hash parity. Cleanup finished at 0 containers, 0 networks, and 0 volumes. Final
Terra QA passed and independent Sol release review returned `ACCEPT` with
P0/P1/P2=0/0/4. Implementation plan:
`docs/superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md`;
acceptance record:
`docs/acceptance/requirement-to-product-closure.md`; PM ledger:
`docs/superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md`.

Delivery order changes; platform authority does not. The `ApplicationGraphV1`
remains the sole business source of truth, and the lifecycle remains mutable
Draft -> immutable Published Graph -> immutable Compilation. Only the
deterministic planner may select approved immutable capability locks; the
model may propose business semantics only. New capability families and
vertical Profiles remain paused; the 100+ recipe catalogue and 12-anchor
expansion remain deferred until the Restaurant Product is accepted.

### Sole post-closure P1 — Prompt-to-Polished Restaurant Product

The next product proof is one fine-dining restaurant requirement producing a
polished, runnable product in the default journey:

```text
Apps -> Describe -> Building / Live Preview -> Edit -> Publish
```

One Published `factory.application-graph/v2` revision owns two surfaces: a
customer mobile application and a merchant desktop application. The customer
surface includes Home, Menu, Dish Detail, Cart, Checkout, Orders, Order Detail,
and Profile. The merchant surface includes Dashboard, Menu Management, Orders,
Kitchen Queue, Tables, Users/Roles, and Settings. Both surfaces share catalog,
pricing, modifier, cart, order, inventory, simulated-payment, identity,
authorization, workflow, and audit semantics.

The Workbench keeps Graph, capability-lock, lineage, evidence, Prisma, SQL,
and Casbin details in Advanced surfaces by default. Users edit Page, Data,
Users, Workflow, and Experience in business language. Generated source is
visible, searchable, diffable, downloadable, and Git-exportable; initial
writes are limited to `src/extensions/**` and Recipe-declared extension slots.

Acceptance requires the restaurant prompt to produce the customer and merchant
surfaces, at least fifteen surface-owned screens, multi-block editable page
trees, shared transactional behavior, generated source, isolated runtime
verification, accessibility, clean-checkout reproducibility, and cleanup.
Product code begins only after the accepted D0 scope is committed and pushed,
local HEAD equals the remote branch tip, and the Graph v2 contract is reviewed
and frozen.

The root README controls public identity: active Workbench copy and metadata
move to Archeform · 元象 during this target. Existing `@factory/*` packages,
`factory.application-graph/*` serialized versions, Git paths, historical
records, and immutable hashes stay stable. The naming change is not permission
for an unversioned internal namespace rewrite.

The UI delivery model is a governed source stack rather than ad hoc component
generation:

```text
ui-primitives -> ui-patterns -> workbench-ui / generated-ui
              -> screen-recipes -> experience-recipes -> product-recipes
```

After Graph v2 review/freeze, Restaurant semantics and the UI Registry/source
foundation begin as two parallel write lines. Customer and merchant compilers
start only when both inputs are ready for QA. Shared contract changes stop the
parallel wave and return to the Graph contract owner.

Workbench implementation includes characterization-first decomposition of the
current 3,818-line global stylesheet, 907-line controller, and 1,131-line
Control Plane client. New Workspace Home, Builder Workspace, and App Management
behavior may not be appended to those monoliths.

Authorities:

- `docs/iterations/2026-08-10-prompt-to-polished-product-reset.md`
- `docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md`
- `docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md`
- `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`
- `docs/research/2026-08-10-product-builder-ui-ecosystem.md`

### Retained platform foundation — staged AI composition

Replace one-shot AI Graph Diffs with a staged, reviewable flow:

```text
RequirementSpec -> CompositionPlan -> constrained Graph Diff
```

`RequirementSpec` records the outcome, clarified questions, constraints, and
acceptance scenarios. `CompositionPlan` selects compatible capability versions,
declares bindings and target implications, exposes risks, and explains why the
proposal fits the Graph. Only a validated plan may produce a constrained Graph
Diff against a mutable Draft. Raw prompts, raw responses, and credentials are
never persisted.

### Retained platform foundation — capability-led reuse

Prioritise cross-profile capabilities over profile-specific templates or new
frameworks: identity/session, files/media, search, scheduling, reporting, and
notification providers. Profile recipes compose versioned capabilities and
bindings; they do not grant profile-name conditionals or hidden runtime
authority.

Workbench component expansion proceeds only through Archeform-owned wrappers and
the capability registry. Puck, XYFlow, shadcn, and TanStack remain replaceable
adapters and presentation tooling, never Graph authority or persisted business
semantics.

Deferred Foundry breadth gates (not current P1 acceptance):

- A staged proposal records questions, chosen capability versions, bindings,
  risks, acceptance scenarios, and explanation before any Graph Diff is
  offered.
- The system rejects a Graph Diff without an accepted CompositionPlan or one
  that would alter a Published Graph.
- A reusable capability serves at least two Profile Graphs with versioned
  locks, binding validation, and generated-application evidence.
- New Workbench components prove their Archeform wrapper and capability-registry
  boundary; third-party editor data is not persisted as Graph truth.
- The Foundry has 25–35 verified capability families, and each counted family
  has current immutable lock, provenance and licence evidence, typed binding
  validation, fixtures, positive and negative tests, and isolated evidence from
  two Profile Graphs.
- `ProfileRecipeCatalogV1` contains at least 100 representative recipes and
  twelve independently compiled anchor Profiles across the defined domains.

### Frozen Foundry execution snapshot — through 2026-08-08

> **Do not dispatch from this section.** Every task state, batch sequence,
> pending gate, and “next” action below records the Foundry checkpoint as it
> existed through 2026-08-08. The snapshot is preserved for provenance only;
> its `implementing`, `ready_for_qa`, and `reviewed` labels have no current
> scheduling authority. Foundry execution is frozen until the Restaurant
> Product is accepted and a later roadmap decision explicitly reactivates it.

At the frozen checkpoint, the staged composition contracts (Train A of the
then-active Foundry Goal) had been implemented at `f97eafa` and hardened at
`67cf682`, `7524e6b`,
and `e13bef1` after independent task review and behavioral QA findings —
`RequirementSpecV1`/`CompositionPlanV1`/`CompositionDecisionV1`/
`CompositionClarificationV1`/`ProfileRecipeCatalogV1` with canonical hashes,
checksum-bound plan/Draft/Diff review, Draft-only application, and fail-closed
guards over whole-subtree integration rewrites (including empty/`.`/`..`
alias paths), decoded prototype-key paths and `~1`-escaped prototype tokens,
case-insensitive prototype-key and `www` business text (including
punctuation-adjacent hosts), nested exact-key items, and recipe lock/binding
requirements (`@factory/graph` 153/153, typecheck/lint/build green). Train A
was recorded as `reviewed` at `e13bef1` (task review, QA, release review, and
PM gate all PASS; it was held at `reviewed` until every train was accepted).
Train B (planner and Foundry admission) had been implemented at `3c1848c` and
repaired at `64e954b1`
after both independent gates failed on the same two P1 defects (unguarded
fixture `JSON.parse` throw; multi-provider dependency edges lost by a
last-write-wins map): deterministic `planComposition` (recipe scoring,
golden-lifecycle locks, structural Graph-symbol bindings, surface-mapped
output slots, fixture-fragment operations, bounded clarifications,
schema-valid answers for an empty staged catalogue) and
`evaluateFoundryAdmission` with sorted reason codes over a KAT-verified
pure-JS lock digest (`@factory/capabilities` 313/313, graph 153/153).
Train B's Control Plane review (Task 3) had been implemented at `74e918d` and
repaired at `fbdd4ce` + `507feca` after its gate round: operation-`value`
material is deep-scanned against the unsafe-material boundary at the schema
gate (`parseCompositionPlan`/`hashCompositionDiff`), the plan's
requirement checksum is verified at the seam before persistence, and
Graph-level application failures surface as bounded conflicts
(control-plane 177/177, graph 156/156, capabilities 313/313). Task 3's
re-verification at `38618ad` returned TASK_REVIEW_PASS with two P2
scan-boundary gaps (RV-1: `.*` lookahead could not cross line terminators,
so multi-line unsafe material evaded the scan; RV-2: object keys inside
operation values were never tested) and QA_PASS (19/19 probes); both were
repaired at `a8914d0` — the lookahead now scans `[\s\S]*` across lines and
`walkUnsafeValue` tests every walked key (graph 159/159, capabilities
313/313, control-plane 177/177); the checkpoint had recorded it as
`ready_for_qa` at `a8914d0` while re-verification gates were pending. Round 2
at `50b0e23` returned TASK_REVIEW_PASS
with one P2 (NEW-1: key failures echoed the offending key into the
rejection message), repaired at `f337174` — the walker names the container
only and a regression test asserts non-echo for `__proto__`/URL keys
(graph 160/160, capabilities 313/313, control-plane 177/177); the checkpoint
recorded it as `ready_for_qa` at `ed82b17` while re-verification gates were
pending. Round 3 at `342b19c` closed both re-verification gates with no
findings (task review PASS; behavioral QA 27/27), and the PM recorded Task 3 `ready_for_qa ->
reviewed` — Train B Tasks 2–3 were recorded as `reviewed` at `342b19c`.
Task 4 (constrained planning adapters) had been implemented at `50b0e23` + `34b81ed`:
the deterministic adapter returns only the planner's resolution over
approved assets, the guarded OpenAI adapter contributes only parsed safe
business text and fails closed on any divergence or unsafe material, and
the Control Plane seam maps bounded provider failures to conflicts with
nothing persisted (control-plane 181/181, adapters 34/34). Task 4's gate
round 1 (task review PASS, behavioral QA QA_PASS 28/28 with two P2
seam-hardening notes — path strings never scanned for material; zod
strict and mutable-root messages echoing offending material) was repaired
at `52432a6b`: Diff paths now clear the same guards as plan operations,
and no rejection message echoes rejected material. Re-verification QA
then found one P0 (QA-4-1): `~1`-escaped URL material decodes after the
raw scan and persisted/applied through record surfaces; repaired at
`7ab4c5ed` by scanning the decoded segments in both path guards (the raw
boundary previously applied even unescaped URL paths), with a test-only
positive-escape pin closure at `1d9865d`. Both re-verification gates
closed with no findings at `1d9865d` (TASK_REVIEW_PASS; QA_PASS 24
probes) and the PM recorded Task 4 `ready_for_qa -> reviewed` — Train B
Tasks 2–4 are `reviewed` (graph 175/175, control-plane 183/183,
capabilities 313/313, adapters 34/34).

Train C Task 5 (Foundry evidence matrix and promotion workflow) had been
implemented at `b59f8645`: a declared evidence registry binds every current
family to its
exact key/version/manifest-digest (23 literal records, first-party policy
fields, empty verifier locks), and `buildFoundryMatrix` reports one
deterministic verdict per current family — eligible only with full
manifest-side evidence plus two Profile verifier locks, and never counting
aliases, historical versions, or retired families. The honest matrix state:
**zero eligible** — 9 families quarantined for missing two-Profile evidence
(commerce.money-pricing, commerce.order-operations, core.identity-policy,
core.policy-declarations, and the five restaurant families) and 14 rejected
because their current manifests declare no binding contract (core
audit/crud/notification/workflow/identity-context/location-context, commerce
catalog/cart/line-configuration/inventory/inventory-ledger/order/
simulated-payment, restaurant.menu). `docs/foundry/capability-matrix.md` and
`docs/foundry/promotion-policy.md` record the honest split. At that checkpoint,
the manifest-readiness repair for the 14 was listed as a subsequent Train D batch;
that instruction is frozen and no longer authorizes work. The gate
round returned task review TASK_REVIEW_PASS and behavioral QA QA_FAIL with
two P2 runtime-immutability gaps (QA-1: registry records mutable; QA-2:
matrix output mutable), repaired by deep-freezing the declared records and
the matrix result with two runtime pins. Both re-verification gates closed
with no findings at `0ce7899b` (task review TASK_REVIEW_PASS; QA_PASS
35/35) and the PM recorded Train C Task 5 `ready_for_qa -> reviewed`
(capabilities 329/329, graph 175/175, control-plane 183/183).

Train D Task 6 Batch 0 (manifest readiness repair) had been implemented at
`36cc7dea` (strict contract declaration) and `cd6baf6` (pairing rules pinned
by mutation-red tests; ledger reconciled): all 23 current families now
declare the strict `factory.capability-binding/v1` contract. `composition.ts` gained one
generic bounded input type (`message.template`, paired only with
manifest-declared enum parameters whose values the manifest itself bounds —
no caller can inject an arbitrary selection); every manifest's parameters
and inputSchema now agree key-for-key with required flags; `domain.field`
inputs declare their owning entity and field types; profile bindings carry
the owning entity symbol plus `fieldKey` (compiler-rendered output stays
byte-identical); and all 23 manifest digests were recomputed and re-pinned
across the TS assets, on-disk packages, and evidence records. The
capabilities suite was repaired from 101 failing to **332/332** (the three
mutation-red pairing-rule tests landed with the gate-round repair); the
Foundry matrix reported the honest post-repair split — zero eligible, all 23
quarantined for missing two-Profile proof, none rejected — and the
generated-notification-outbox runtime still delivers with the new
manifests. Two workbench issues (Next.js `node:crypto` build failure and a
concurrent-suite Home test timeout) were reproduced at the accepted Task 5
HEAD with zero Batch 0 changes and are recorded as pre-existing environment
limitations. Batch 0's three independent gates closed with PASS: task
review TASK_REVIEW_PASS and behavioral QA QA_PASS (7/7 probes, zero
findings) at `cd6baf6`, and release review RELEASE_PASS at the docs-only
`7120106` (its P2 doc suite-count drift, 329/329 → 332/332 in three docs,
repaired and verified closed); both commits were remote-reachable and the
worktree was clean. The PM then recorded Train D Task 6 as `implementing` at
`7120106` after Batch 0 delivery. The historical record named Batch 1 family
growth and Batch 2 verifier regeneration as subsequent work; neither batch is
currently authorized.

**Batch 1 (Task 6) was delivered at `a8a6be5`:** four new capability
families — `core.files-media`, `core.search` (Foundation), `core.scheduling`,
`core.approvals` (Operational) — one family per commit, TDD, all pushed to
`feat/governed-composition-capability-foundry`. The portfolio stood at
**27 current families** (within the 25–35 band), all declaring the strict
binding contract and all quarantined solely for lacking two-Profile proof
(zero eligible / 27 quarantined / 0 rejected — honest by construction).
Observed results: capabilities 352/352 (28 files), graph 175/175,
control-plane 183/183, adapters 34/34, compiler 330/330 (scratch worktree),
`verify:generated-notification-outbox` green. The Batch 1 gate round closed
with all three independent gates PASS: task review at `68bea3c5`, and
behavioral QA plus release review at `d3e18f5a` (final HEAD, origin tip;
both commits remote-reachable on the same chain) after the single QA P1 —
the control-plane portfolio test's stale `golden: 23 / lockedVersions: 50`
pin vs the live-derived 27/54 (deterministic 182/183) — was repaired at the
test+docs-only commit `d3e18f5a` (pin → 27/54). Suites at final HEAD:
control-plane 183/183 (17 files), capabilities 352/352, graph 175/175,
adapters 34/34, typecheck clean; outbox runtime 1 pending drained / 1
delivered / safeFailure true. The checkpoint left Task 6 recorded as
`implementing` and named Batch 2 verifier regeneration plus Batch 3 evidence
locks as unfinished historical work. Those batches remain frozen and must not
be resumed without a new post-Restaurant roadmap decision.

## P2 and P3

- **P2:** managed deployment, observability, fleet upgrades, and rollbacks,
  all tied to immutable Compilation and verification evidence.
- **P3:** additional frontend and backend frameworks, admitted only as
  Graph-first compiler/runtime adapters after the P0/P1 boundaries are proven.

## Dependency-aware sequence

1. Seal and independently accept Honest Requirement-to-Product Closure,
   including bounded clarification, two real-model products, clean checkout,
   and cleanup.
2. Freeze the Graph v2, Product Intent, Experience Brief, Product Recipe,
   Application Surface, Screen Intent, Source Overlay, and Draft Preview
   Snapshot contracts.
3. Compose one deterministic Restaurant Product Recipe and establish the
   pinned UI-source foundation plus Fine Dining experience recipe.
4. Compile and run the customer mobile and merchant desktop surfaces against
   one Published Graph and shared transactional semantics.
5. Rebuild the Workbench around Describe, live Draft preview, contextual Edit,
   controlled Source Mode, and Publish.
6. Close Restaurant Product with guarded real-model, accessibility,
   clean-checkout, role-journey, source-export, and cleanup evidence.
7. Only then reconsider Foundry breadth, managed delivery, fleet operations,
   connectors, and additional framework adapters.

## Ecosystem and source-study rules

Prospective direct dependencies for this strategy are **Testcontainers for
Node**, **fast-check**, and **ts-morph**. They are not installed or approved by
this roadmap; each requires a pinned published release, licence notice, and the
existing dependency/provenance/security gates before adoption. Dagger and
OpenTelemetry are later candidates for managed verification and observability.

Amplication, Backstage Scaffolder, bolt.diy, Dyad, and OpenHands are
source-study-only architecture references. Archeform must not imply that
their code, packages, templates, or runtime designs are installed, copied, or
approved. Any source reuse continues to require an exact immutable source-study
record, licence compatibility decision, third-party notices, security evidence,
focused boundary tests, and a removal path.

## Non-goals

- Generated files are not an editable source of truth and are never
  reverse-parsed into a Graph. Only declared overlays and
  `src/extensions/**` are writable in the first Source Mode.
- Published Graphs and Compilations are never mutable repair targets.
- A profile template, framework, editor, AI provider, or runtime provider does
  not define Archeform business semantics.
- P2/P3 work does not bypass P0 verification gates.
- Source-study references do not authorise copying code or installing
  dependencies.

## Current evidence boundary

The concise current state and evidence links are in `docs/project-status.md`;
the prior detailed record is archived at
`docs/archive/status-history/2026-08-09-project-status.md`. The compiler plugin
kernel and isolated verifier are accepted platform foundations. The
Base44-inspired Expense Approval journey is fixed replay evidence only. Honest
Requirement-to-Product Closure and D0 are accepted on the current reviewed tree;
ADR-0009 is founder-accepted. The controller-owned exact-scope commit and
non-force push remain pending. No Restaurant Product implementation is
authorized before local HEAD equals the remote branch tip and the Graph v2
contract is reviewed and frozen.
