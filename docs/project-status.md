# Factory Pilot delivery status

Updated: 2026-08-01

## Latest capability and supply-chain audit — 2026-08-01

Factory Pilot has a working composition and compilation foundation, but its
current capability catalogue is not yet a broad production-application
platform.

- `pnpm test` completed successfully for all 14 workspace tasks on this
  worktree. The current task run reused local Turbo test cache entries, so this
  is regression evidence for the checked revisions rather than a new
  end-to-end release acceptance.
- Five Profile starters are available: Expense Approval, Restaurant Ordering,
  Simple Ecommerce, Retail Counter, and Grocery Pickup. The latter three reuse
  shared commerce composition locks, but that does not make their business
  operations complete or independently accepted.
- The catalogue contains 19 capability families and 33 physical, versioned
  package directories. Only a smaller subset clearly owns executable runtime
  behaviour: core CRUD/workflow/audit/notification plus selected cart,
  inventory, and simulated-payment contributions. Generic catalogue and order
  behaviour, and several Restaurant behaviours, still have compiler-owned or
  Profile-specific implementations.
- The Restaurant Profile has accepted local evidence for its bounded
  table-to-order lifecycle, simulated payment, inventory effects, kitchen and
  cashier flows, audit, and generated artifacts. Identity, membership,
  promotion, real payment, settlement, delivery, reservations, realtime,
  offline operation, and production observability remain absent or partial.
- The external-source portfolio records 43 fixed sources and 108 demand
  mappings. It is a discovery and intake input, not an installed capability
  catalogue. The current pipeline creates immutable quarantine evidence and
  source-study projections, and now deterministically derives and persists a
  declarative Candidate proposal for an allowlisted TypeScript Provider source
  through the repository-local quarantine API. It does not create Factory
  capability packages.

### Supply-chain release gate

An earlier independent review reported two P1 isolation gaps in external
intake. Both are already addressed by ancestor commit `aba30f5`: batch parsing
keeps each opaque request inside the item-level validation boundary, and
source-study input is parsed with a strict runtime schema plus sensitive-key
rejection. The focused regression tests are present and the full workspace
test run passes. Automatic Portfolio-to-Candidate creation can therefore begin
from the existing release boundary. The intended scale path remains: fixed
source portfolio -> quarantine -> licence/SBOM/security evidence -> strict
source study -> non-promoting Candidate proposal -> Factory-owned package or
provider adapter. Whole-repository copying remains outside the supported path
because it bypasses licence scope, provenance, compatibility, and Application
Graph authority controls.

## Current product and reuse assessment — 2026-08-01

Factory Pilot is a working Application Graph composition foundation, not yet a
production-complete catalogue of one hundred application types.

- Five Profile starters compile from Published Graphs today: Expense Approval,
  Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.
  Only Restaurant has a specialised transaction-oriented runtime; the other
  commerce Profiles share a smaller generic runtime.
- The current catalogue has 19 capability families and 33 versioned physical
  asset packages. Package counts do not prove business completeness. Core
  CRUD/workflow/audit/notification plus selected commerce handlers are
  executable; some catalogue/order concerns remain compiler-owned and several
  restaurant behaviours remain Profile-specific.
- The completed transaction slice introduces
  `commerce.inventory@1.1.0`. Simple Ecommerce, Retail Counter, and Grocery
  Pickup now prove a common `cart -> submitted -> paid` lifecycle where submit
  reserves stock and a privileged cancellation compensates it. This is useful
  generated-runtime evidence, but it is not a complete generic transaction
  kernel: the generic Prisma path still lacks a database transaction,
  idempotent command receipt, ledger write, and outbox.
- The reusable-source portfolio maps 122 business scenarios to a smaller
  cross-profile kernel, and carries 43 fixed-source records for external
  intake. It is discovery evidence, not 122 installed products. The
  quarantine pipeline can acquire fixed references, isolate a prohibited batch
  sibling, capture redacted evidence, and create a strict source-study
  projection. It now derives an allowlisted Portfolio source record into a
  quarantined, non-promoting Candidate proposal; it does not create a Golden
  package or activate an external runtime.

### Decision: scale reuse without importing upstream authority

The supported high-throughput reuse routes are:

1. **Pinned dependency:** import a small published technical library with its
   licence notice and update policy.
2. **Provider adapter:** connect a mature external runtime through a typed,
   replaceable Factory contract while Factory retains the Application Graph.
3. **Selective source copy:** copy only an identified, permissively licensed,
   compact source path after an immutable source study, copy ledger, notice,
   fixture, conformance and removal test.
4. **Reference only:** learn domain vocabulary from copyleft,
   source-available, commercial, or architecture-incompatible projects.

Bulk cloning full vertical repositories is not an acceptable fourth route. It
would import unknown transitive licences, assumptions, credentials and data
models into the compiler, while making upstream code the de facto business
source of truth. The high-leverage next sequence is to complete the generic
transaction kernel, repair the intake isolation boundaries, then automate
allowlisted fixed-reference acquisition into non-promoting Candidate proposals.

## Historical execution snapshot — 2026-08-01

The latest capability and supply-chain audit above is authoritative. The
following retained execution notes describe earlier increments and may use
superseded counts or in-progress wording.

Factory Pilot has a credible composition foundation, but it is not yet a
production-complete application platform or a catalogue of one hundred ready
business products.

- The repository currently contains 19 capability families and 33 physical,
  versioned package directories. Five Profile starters are available:
  Expense Approval, Restaurant Ordering, Simple Ecommerce, Retail Counter,
  and Grocery Pickup. Their published Graphs, package locks, generated targets,
  and acceptance depth are not interchangeable claims of production readiness.
- Eight shared packages have executable package contributions today: CRUD,
  workflow, audit, notification, inventory, simulated payment, cart, and line
  configuration. Catalog, order, and several Restaurant flows are still at
  different stages of extraction from compiler-owned behaviour. Several Restaurant flows
  are still Profile-specific compiler behaviour. The library is therefore
  useful but uneven; it is not yet an independently replaceable domain kernel.
- The generic line-configuration slice now has focused green evidence:
  `commerce.line-configuration@1.1.1` is a new immutable Golden successor;
  `1.1.0` remains replayable. The generated runtime resolves options only from
  published records, rejects cross-catalog or unavailable selections, derives
  labels and price deltas server-side, and exposes a bounded
  `catalog-configurator` PageModel block. Full Capabilities and Compiler
  verification passed on 2026-08-01; broader product and generated-application
  acceptance remain release gates for the platform.
- The external-intake lane can bulk acquire fixed public references into
  quarantine and record redacted provenance evidence. It can derive an
  allowlisted quarantined Candidate but cannot promote Golden packages
  automatically. The next supply
  chain milestone is a bounded Candidate-proposal generator with licence,
  SBOM, security, fixture, conformance, and provenance gates.

### Product implication

The shortest path to broad coverage is not one hundred copied vertical
applications. It is a small, executable cross-profile kernel plus Profile
recipes and provider adapters. A bulk intake pipeline should automate
discovery, fixed-SHA acquisition, licence classification, dependency/SBOM
analysis, fixture generation, and Candidate task creation; it must not allow
an upstream repository, schema, credential, or arbitrary source tree to become
an executable Graph or compiler input without Factory-owned contracts and
tests.

## Current Profile and external-reuse refresh — 2026-07-31

Factory Pilot is a working **Application Graph composition foundation**, not a
complete catalogue of production business applications yet.

### Verified current capability evidence

- Five Graph-backed Profile starters are registered: Expense Approval,
  Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.
  Their shared commerce recipes retain versioned package locks while using
  distinct entities, roles, routes, state machines, seed data, and policies.
- `commerce.line-configuration@1.1.0` is now the current portable commerce
  package. Restaurant, Ecommerce, Retail Counter, and Grocery Pickup all lock
  the same package version and bind it only through declared Graph symbols.
  The package requires a catalog-to-option-group-to-option relation and a
  line-to-immutable-snapshot relation. It exposes selection mode, cardinality,
  ordered options, server-side pricing inputs, and snapshot fields without
  selecting behavior from a Profile name.
- The Compiler now substitutes declared template parameters exclusively from
  the immutable Composition Lock. A generated Restaurant configuration module
  receives `menu-item`; the equivalent Ecommerce module receives `product`.
  It cannot read mutable draft state or arbitrary Graph paths while rendering.
- Fresh verification on this worktree passed: `@factory/capabilities` has
  233 tests plus typecheck/lint/build; `@factory/compiler` has 192 tests plus
  typecheck/lint; `git diff --check` passed.

### Production completeness: truthful position

The Restaurant Profile has meaningful local proof for table session, catalog,
cart, order lifecycle, simulated payment, kitchen/cashier flows, inventory,
audit, generated API/Web/database/test artifacts, and a Merchant console.
It is **not** a full production restaurant suite. The following capability
families are still absent or only represented by a narrow simulation:

- real identity, payment, refund, split settlement, tax, loyalty, promotion,
  membership, receipts/printers, delivery, reservations, waitlists, offline
  conflict handling, realtime provider delivery, and production observability;
- cross-profile packages for party/customer, availability, reservation,
  pricing, fulfilment, shipment, documents, support, reporting, and
  authorization providers;
- a source-to-Candidate pipeline that can turn a checked external source
  study into a Factory-authored package proposal with fixtures, conformance
  tests, and provenance.

The current generated configuration module proves package parameterisation;
the next compiler slice must add the generic request/validation handler and
PageModel blocks that exercise configured-line choices at runtime. Until that
slice has generated-application journey evidence, it must not be described as
an independently complete production feature.

### Scale strategy: many scenarios from a small capability kernel

The 122-scenario map and 43 fixed-reference source records are planning and
intake inputs, not installed applications. Factory should reach 100+ scenarios
by composing a shared capability kernel, rather than cloning 100 vertical
repositories. The scalable delivery lanes are:

1. **Direct dependencies** for bounded technical functions (for example
   editors, charts, QR rendering, cache, or state machines), each pinned with
   its notice and package update policy.
2. **Provider adapters** for mature systems whose runtime should remain
   external (for example a commerce, authorization, print, or realtime
   provider). Factory retains the Application Graph and provider contract.
3. **Fixed-reference source studies** for permissively licensed implementations
   whose small, identified algorithms or domain rules can be re-authored into
   a Factory package. Automated intake fetches a commit SHA into quarantine,
   records licence/SBOM/security/module evidence, derives a candidate task,
   and runs offline fixtures. It never promotes raw repository code into a
   Graph, Compiler, or generated runtime.

Whole-repository copying is not a scalable shortcut: the selected projects use
different runtimes and data models, carry transitive licences, and often embed
assumptions that conflict with Draft → Publish → immutable Compilation. The
fast path is automated discovery and quarantine plus targeted, attributable
adapters or re-authored fragments. This removes one-by-one manual discovery
without allowing an unreviewed upstream repository to become execution
authority.

## Current evidence audit — 2026-08-01

The repository is a credible **composition foundation**, not yet a complete
library of production application profiles. The following facts were checked
against the current worktree:

- The current worktree expands the reusable Order Operations slice from three
  starter Profiles to five: Expense Approval, Restaurant Ordering, Simple
  Ecommerce, Retail Counter, and Grocery Pickup. Retail Counter and Grocery
  Pickup compile from the same current Catalog/Cart/Order capability-lock set
  as Ecommerce, with distinct Graph entities, roles, routes, seed data, and
  fulfilment transitions. This is current-worktree evidence pending its
  dedicated commit; it is not a claim that five production Profiles are
  accepted.
- Fresh targeted verification passed: the Compiler has 192 tests, the
  Compiler Worker has 76 tests, both packages typecheck and lint, both build
  targets required by the slice pass, and `git diff --check` is clean. The
  Worker tests materialise isolated Retail Counter and Grocery Pickup outputs
  and assert that no Restaurant command runtime artifact is emitted.
- `pnpm test` completed successfully with 14 Turbo tasks. The command reused
  verified local cache entries; its package evidence reports 32 Graph, 66
  Workbench, 116 Control Plane, 74 Worker, 182 Compiler, 219 Capabilities,
  402 External Intake, 61 Intake CLI, and 20 Adapter tests.
- `packages/capabilities/assets` contains 19 named capability families across
  30 versioned package directories. Package count is not equivalent to
  executable coverage: `core.crud`, `core.workflow`, `core.audit`,
  `core.notification`, `commerce.inventory`,
  `commerce.simulated-payment`, `commerce.cart@1.0.1`,
  `commerce.catalog@1.2.0`, and `commerce.order@1.2.0` have package-local
  executable contributions. Several Restaurant behaviours intentionally
  remain profile-specific extensions.
- The fixed-reference portfolio contains 43 source records and 108 scenario
  demand mappings: 1 direct dependency, 7 provider candidates, 11 selective
  source-study candidates, 8 architecture-only references, and 16 exclusions.
  These are research and intake inputs, never installed capabilities or
  production readiness evidence.
- A guarded live acquisition attempt for TastyIgniter, its Cart extension, and
  InvenTree was blocked by public GitHub metadata `403` responses. The command
  created only ignored, redacted quarantine receipts and acquired no source
  content, Candidate, Golden package, provider, Graph, or generated runtime.
  A local environment-only GitHub read token is required before retrying live
  metadata acquisition; it must not be inspected, logged, persisted, or
  committed.

The immediate product priority is two coupled tracks: (1) extract
compiler-owned generic catalogue/order behaviour behind physical capability
packages, then prove it across at least Restaurant and Ecommerce; (2) use the
existing intake pipeline to turn a small number of fixed, permissively
licensed source studies into narrow, Factory-authored Candidate proposals with
fixtures and conformance evidence. Factory must not bulk-clone vertical
repositories or treat any external schema/runtime as Application Graph truth.
The detailed 122-recipe portfolio and source classifications are in
[`research/2026-08-01-100-profile-capability-ecosystem.md`](research/2026-08-01-100-profile-capability-ecosystem.md);
the Restaurant gap audit is in
[`audits/restaurant-ordering-requirements-audit.md`](audits/restaurant-ordering-requirements-audit.md).

## Capability ecosystem status correction

Factory Pilot currently proves three independently modeled Profile families:
Expense Approval, Restaurant Ordering, and Simple Ecommerce. A Published
Application Graph can be compiled into a local bundle with generated Web/API,
database, policy, flow, test, and documentation outputs. This is a functional
foundation, not evidence that Factory Pilot already supports one hundred
production-ready application types.

The repository contains 19 current capability families and historical locked
versions. The reusable capability boundary is uneven: `core.crud`,
`core.workflow`, `core.audit`, `core.notification`, `commerce.inventory`,
`commerce.simulated-payment`, and `commerce.cart@1.0.1` have executable,
version-locked package contributions. The cart migration now includes a
manifest-declared runtime handler, template, fixtures, contract tests, and
historical-lock replay evidence. `commerce.catalog`, `commerce.order`, and
several Restaurant behaviors still rely on compiler-owned generic or
profile-specific runtime code; their package records alone are not yet proof
of independently replaceable implementation.

The 122-scenario research taxonomy is a mapping of Profile recipes, shared
capability locks, fixtures, and acceptance journeys. The separately executable
external-source portfolio currently contains 43 source records and 108 demand
signals; the two planning counts must not be conflated. Neither is an installed
component catalogue or a production-readiness claim. The next high-leverage
product milestone is a bulk capability supply chain: curated source portfolio
-> fixed-reference quarantine -> licence/SBOM/security/module evidence ->
source study -> Candidate artifact -> offline conformance -> Factory-authored
Golden package or provider adapter. Until that pipeline is implemented,
external source intake remains deliberately limited to immutable quarantine
evidence and cannot create a Candidate, copy source, alter a Graph, or
influence a compiler/runtime. The local `portfolio acquire` CLI command now
constructs a strict batch from explicitly selected, intake-eligible portfolio
IDs; it adds no authority beyond that quarantine boundary.

The source-acquisition CLI now has an optional local read-token transport for
GitHub metadata. `FACTORY_GITHUB_READ_TOKEN` is consumed only from the process
environment and is scoped to `api.github.com`; archive and all other requests
have authorization removed. Its focused tests prove token host confinement and
non-echoing invalid configuration. Intake CLI verification currently passes
61 tests, typecheck, lint, build, and `git diff --check`. No live external
source has been claimed acquired by this change: materialization, scanning,
Candidate creation, conformance, and Golden promotion remain separate gates.

## Current milestone

### Parallel delivery track: Live External Source Acquisition

Status: `ready_for_qa`. The current worktree now has a CLI-only fixed-source
acquisition lane: a strict batch can resolve an exact public GitHub tag or SHA,
persist immutable quarantine evidence, and project redacted source-study
metadata. It cannot extract or execute downloaded source, run a scanner, create
a Candidate, promote a Golden asset, copy source, mutate the Application Graph,
or become a compiler/runtime input. Deterministic evidence is recorded in
`docs/acceptance/live-external-source-acquisition.md`; the one guarded public
smoke terminally blocked and was cleaned up, so it is not live-source success
evidence. Independent task review and QA remain required.

Typed Capability Binding Validation is the current hardening milestone.
ADRs 0006, 0007, and 0008 are `Accepted` under Factory controller authority;
the amended design, implementation plans, and ledger now govern the work.
ADR-0008 was accepted after independent reproduction showed the repair-round-4
P1 is a shared resolution-input ownership failure rather than a bounded local
parameter defect. Task 1, **pure typed Graph symbol index**, is `accepted` after
bounded repair round 1. Original implementation commit
`86d5a00f26d5f331764de0e8bf7694e657cd2514` passed independent Task 1 review
and behavioral QA with no P0/P1/P2, but release review then found one
load-bearing P1 in duplicate navigation/flow identifier handling. Repair commit
`784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` passed independent re-review and
repair-round behavioral QA with no P0/P1/P2. Final release review returned
RELEASE PASS with no P0/P1/P2, and fresh verification passed.

Task 2, **typed manifest and binding contracts**, is `implementing` in repair
round 4. Its bounded writer is Typed Manifest Contract Integration, its
contract owner is Capability Binding Contract, and its write boundary is the
exact four Capabilities paths recorded below. Independent review of implementation commit
`4458bfc7c8ffcaef29dfebb755d8399e12000198` found two P1s, so Task 2 does not
advance. Repair round 1 commit
`a7331df0ac6a6f54f82bf61a060607777bc06dc0` stays inside the existing path
boundary and passed independent repair re-review with no P0/P1/P2. Task 2 stays
inside its exact four-path boundary. After architecture amendment commit
`36317bf`, the PM records `implementing -> ready_for_qa`. Accepted ADR-0007
assigns owner-aware Draft Graph serialization to new Task 3 without expanding
Task 2. Independent behavioral QA passed 45/45 focused typed contract tests,
188/188 full Capabilities tests, typecheck, lint, build, bounded scope checks,
and strict public probes. The PM previously recorded
`ready_for_qa -> reviewed`. Independent release review then found one P1:
prototype-backed schema or binding data could influence canonical binding-lock
semantics despite the strict own-key contract. The PM records
`reviewed -> implementing`. Repair round 2 commit
`565c64c5e79799261f8dc72c7e0da298fef4742d` changes only
`packages/capabilities/src/composition.ts` and
`packages/capabilities/test/typed-binding-contract.test.ts`, but independent
task re-review returned FAIL: required `ownerBinding`/`fieldTypes`, optional
field constraints, and an empty-string unknown own key were not all enforced
with exact own-property semantics. Repair round 3 commit
`00ac760c54f353f6ae242f92a5dd4809791cd633` stays inside those exact two
Capabilities paths and adds focused `Object.prototype` pollution and empty-key
regressions. Fresh implementation verification passed 49/49 focused tests,
Capabilities typecheck, and Capabilities lint. Independent repair-round-3 task
review passed with no P0/P1/P2 after 29/29 typed-binding and 20/20 composition
tests, and confirmed the exact two-path diff. The PM recorded
`implementing -> ready_for_qa`. Independent repair-round-3 behavioral QA then
returned PASS: 49/49 focused tests, 192/192 full Capabilities tests,
Capabilities typecheck/lint/build, 180/180 Compiler tests, and the adversarial
compiled probe passed. The PM previously recorded
`ready_for_qa -> reviewed`. Independent release review then returned FAIL with
two P1s: accessor-backed bindings could validate one value and expose another
before canonical lock selection, and strict parameters accepted
prototype-supplied `key`, `type`, and `required` values. The PM records
`reviewed -> implementing` for repair round 4. Repair commit
`b85dbda063fe6fa6db3b712f5891b013285e0356` snapshots immutable own-enumerable
data for strict schemas, parameters, and bindings, then uses the normalized
binding snapshot for validation and canonicalization. It changes only the
same two authorized Capabilities repair paths. Fresh engineer verification
passed 195/195 Capabilities tests plus Capabilities typecheck, lint, and build,
and 180/180 Compiler tests plus Compiler typecheck and lint. This remains
implementation evidence only. Independent task review of the repair returned
FAIL with one new P1: `manifest.parameters` is snapshotted separately during
schema validation and binding validation, so a getter can supply different
parameter schemas at those two stages. Task 2 remains `implementing` and is not
accepted. Controller-accepted ADR-0008 stops further local Task 2 repair and
its remaining review gates. Task 2A, **immutable composition resolution
boundary**, is now `accepted` after repair round 2. Its bounded writer is
**Immutable Composition Resolution Integration**, and its contract owner is
**Capability Composition Resolution Boundary**. Plan Tasks 1 through 3 produced commits
`b310d8e`, `c9e5ca3`, and
`73accc24a68d55308d127717e36cd63130024f3e`; independent review of plan Task 3
then returned FAIL with two P1s. Governance commit `76274e3` formally amended
the repair boundary to five exact Capabilities paths. Repair commit
`a09d459077f80fa82161df928137b1f2052a75bb` stayed inside those paths, and
independent repair review returned SPEC PASS and QUALITY PASS with no
P0/P1/P2. Independent behavioral QA at `a09d459` then passed with no P0/P1/P2:
Capabilities passed 214/214 with its package checks, Compiler passed 180/180
with its package checks, every public accessor probe observed zero getter
invocations and rejected with the capture error, the frozen digest remained
exact, and the largest 13-selection composition produced one digest across
1,000 resolutions at p95 2.708 ms. Scope and diff checks were clean. The PM
previously recorded `ready_for_qa -> reviewed`. Independent release review then
returned FAIL with one P1: `resolveCapabilityAssetLock`,
`assertGoldenCapabilityAssetLocks`, `assertGoldenCapabilityComposition`,
`composeDefaultCapabilityDraft`, and `composeProfileDraft` observe caller-owned
input or context before descriptor capture. Direct probes invoked getters, and
a self-changing `profile` getter produced incoherent output. The Controller
authorized repair round 2 inside the unchanged five-path boundary, and the PM
previously recorded `reviewed -> implementing`. Repair round 2 commit
`40096847c4a4b28c3d02fd33d01805d46da0bded` changes three authorized paths and
received independent SPEC PASS and QUALITY PASS with no P0/P1/P2. The reviewer
audited all eight exported structured composition/lock boundaries and their
self-redefining accessor and alias probes. The PM previously recorded
`implementing -> ready_for_qa`. Fresh repair-round-2 behavioral QA against
`40096847c4a4b28c3d02fd33d01805d46da0bded` returned PASS with no P0/P1/P2:
Capabilities passed 219/219, Compiler passed 180/180, all eight public
boundaries rejected with the capture error and zero getter invocations, and
the alias, server-lock, deep-freeze, digest, and largest-composition
single-digest probes passed at p95 2.884 ms. The PM previously recorded
`ready_for_qa -> reviewed`. Final independent release review at governance
commit `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` against source commit
`40096847c4a4b28c3d02fd33d01805d46da0bded` returned RELEASE PASS with no
P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed 219/219
Capabilities tests, 180/180 Compiler tests, and 76/76 focused tests. The
largest registered composition produced one digest across 1,000 resolutions
at p95 2.554 ms; source/governance drift and secret checks were clean. The PM
reconciles the ordered gates as `reviewed -> accepted`. The earlier task-review
and QA results against `a09d459` remain historical, not acceptance evidence.
Owner-aware Graph persistence remains explicitly owned by planned Graph Task
3, which is still blocked because Task 2 remains `implementing`. Physical
assets remain Task 4; Tasks 4 through 7 remain serially blocked.

Commercial Capability Foundation Task 2 remains `implementing` and escalated
after its five permitted repair rounds. It is blocked on accepted Typed
Capability Binding Validation Task 7 and later PM reconciliation; it is not
accepted. Commercial Foundation Tasks 3 and 4 remain `planned` and blocked.

The Application Graph remains the source of truth. External intake artifacts
remain quarantined Candidate evidence or pending-review packets; they are not
Golden capabilities, Graph input, compiler input, generated runtime authority,
provider authority, approval, or source-copy execution.

## Completed evidence

ADR-0006 fixes the typed-binding architecture under controller authority:

- `factory.capability-binding/v1` is manifest-owned and interpreted by generic
  composition validation.
- The Graph owns a capability-agnostic typed index with separate symbol
  namespaces and fields resolved only under their entity owner.
- Draft composition, verified Publish lock creation, and compiler admission
  validate the exact Graph and selected locks.
- Historical Golden bytes, digests, Published revisions, and locks remain
  immutable. New current recipes migrate to verified
  `core.location-context@1.0.1`,
  `commerce.inventory-ledger@1.0.1`, and
  `commerce.inventory@2.0.0`.
- No validator may dispatch on Profile name, package version, field name,
  source path, compiler target, or output path.

ADR-0007 fixes serialized owner-aware selection ownership under controller
authority:

- Draft Graph bindings add the owner-aware
  `{ graphSymbol: "graph.domain.<entity>", fieldKey }` value without removing
  existing number, boolean, or historic `{ graphSymbol }` values.
- Graph parsing and validation prove exact entity/field existence only;
  Capabilities retains scalar, required, unique, and manifest-kind admission.
- Historic Draft JSON stays readable without owner inference or hash rewrite.
  Published Graphs remain selection-free and immutable locks retain bindings
  and digests.
- New Task 3 owns only the Graph schema, parser/validator, hashing regressions,
  browser-entry regressions, and exact three Graph paths recorded in the ledger.

ADR-0008 fixes the composition-resolution ownership boundary under controller
authority:

- Public composition and lock creation capture one descriptor-validated,
  Factory-owned snapshot before any matching, validation, normalization,
  resolution, canonicalization, or hashing.
- Records and arrays must be ordinary own-data structures; accessors, symbols,
  sparse or inherited indices, extra array properties, custom prototypes, and
  cycles fail closed.
- Existing valid `factory.capability/v1`, `factory.capability-binding/v1`, and
  `factory.composition/v1` bytes and lock digests remain unchanged.
- Commits `b310d8e`, `c9e5ca3`, and `73accc2` are historical implementation
  evidence. Governance amendment `76274e3` authorized the exact five-path
  repair, and repair commit `a09d459077f80fa82161df928137b1f2052a75bb`
  stayed within it. Independent repair review returned SPEC PASS and QUALITY
  PASS with no P0/P1/P2. Independent behavioral QA then passed with no
  P0/P1/P2 after 214/214 Capabilities tests, 180/180 Compiler tests, zero-getter
  public capture probes, exact digest compatibility, and a single digest across
  1,000 resolutions of the 13-selection composition at p95 2.708 ms. The PM
  records the historical Task 2A `ready_for_qa -> reviewed` transition.
  Subsequent release review returned FAIL with one P1 in the five exported
  wrappers named above. Their task-review and QA results remain historical;
  Controller-authorized repair round 2 returned Task 2A
  `reviewed -> implementing` under the unchanged five-path boundary. Repair
  commit `40096847c4a4b28c3d02fd33d01805d46da0bded` changes only
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/src/index.ts`, and
  `packages/capabilities/test/composition-contract.test.ts`. Independent
  repair-round-2 review returned SPEC PASS and QUALITY PASS with no P0/P1/P2
  after auditing all eight exported structured composition/lock boundaries and
  the self-redefining accessor/alias probes. The PM previously recorded
  `implementing -> ready_for_qa`. Fresh repair-round-2 behavioral QA against
  `40096847c4a4b28c3d02fd33d01805d46da0bded` passed with no P0/P1/P2 after
  219/219 Capabilities tests, 180/180 Compiler tests, zero-getter capture-error
  rejection at all eight public boundaries, and passing alias, server-lock,
  deep-freeze, digest, and largest-composition single-digest probes at p95
  2.884 ms. The PM previously recorded `ready_for_qa -> reviewed`. Final
  independent release review at governance commit
  `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` against source commit
  `40096847c4a4b28c3d02fd33d01805d46da0bded` returned RELEASE PASS with no
  P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed 219/219
  Capabilities tests, 180/180 Compiler tests, and 76/76 focused tests, with one
  digest across 1,000 largest-composition resolutions at p95 2.554 ms and clean
  source/governance drift and secret checks. The PM records
  `reviewed -> accepted` for Task 2A only.

The approved design and plan are recorded at
`docs/superpowers/specs/2026-08-01-typed-capability-binding-validation-design.md`
and
`docs/superpowers/plans/2026-08-01-typed-capability-binding-validation.md`, with
the Task 2A boundary plan at
`docs/superpowers/plans/2026-08-01-immutable-composition-resolution-input.md`.
The governed task state is recorded in
`docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`.
This status/ledger synchronization changes no product code, source manifest,
physical package, shared contract, or existing Commercial Foundation ledger.

Typed Binding Task 1 implementation, review, and QA evidence is:

- Reviewed code commit:
  `86d5a00f26d5f331764de0e8bf7694e657cd2514`
  (`feat: index typed graph symbols`).
- The implementation changes only `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`, inside the exact four-path
  boundary.
- Fresh Node `v22.11.0` verification passed 30/30 focused application-Graph and
  browser-entry tests, Graph typecheck, Graph lint, and implementation diff
  checks.
- Independent Task 1 review of
  `4617cb23752e17eaa223bdddb1b3f3164472f2a3..86d5a00f26d5f331764de0e8bf7694e657cd2514`
  returned PASS with no P0/P1/P2.
- Independent behavioral QA on Node `v22.11.0` passed
  `pnpm --filter @factory/graph test -- --run` at 30/30 tests, plus Graph
  typecheck, lint, and build.
- A direct public `dist/browser.js` probe passed 17/17 owner-scoped
  duplicate/wrong/missing-field assertions and 18/18 isolated-namespace
  assertions. Wrong or missing owners and fields returned `undefined`.
- Browser/model source and built output contained no Node builtin or
  `@factory/capabilities` import. The implementation and documentation-only
  follow-up diffs were bounded and clean.
- QA returned PASS with no P0/P1/P2. The PM reconciled this as sufficient only
  for `ready_for_qa -> reviewed`; it is not release review or acceptance.
- Release review then found one verified P1: generic `indexBy` uses
  last-write-wins `Map` construction, while semantic Graph validation omits
  duplicate navigation-entry-ID and flow-ID checks. An invalid Graph can
  therefore resolve one of those typed symbols by declaration order instead of
  failing closed.
- The PM returned Task 1 `reviewed -> implementing` and authorized bounded
  repair round 1. Earlier task-review and QA evidence remains historical but
  cannot support acceptance while this finding is open.
- Repair commit `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  makes generic indexing fail closed on duplicate keys and adds semantic
  duplicate navigation-entry-ID and flow-ID issues. The repair changes only
  `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`.
- Fresh Node `v22.11.0` verification passed 32/32 focused application/browser
  tests and 32/32 full Graph tests, plus Graph typecheck, lint, build, and
  repair diff checks.
- Independent re-review of
  `7a0ee76e620d92032c07c7272d2b637e6835a8cc..784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  returned PASS with no P0/P1/P2. The PM reconciled this as sufficient only for
  `implementing -> ready_for_qa`.
- Independent repair-round re-QA on Node `v22.11.0` passed 32/32 Graph tests,
  Graph typecheck, lint, build, and repair diff checks.
- Public built-browser probes proved validation, parsing, and indexing reject
  duplicate navigation-entry and flow IDs. Owner-scoped field and isolated
  namespace probes passed, and browser/model source plus built output contained
  no Node builtin or `@factory/capabilities` import.
- Re-QA confirmed the repair scope remained exactly
  `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts` and returned PASS with no
  P0/P1/P2. The PM reconciled this as `ready_for_qa -> reviewed`.
- Deferred limitation: `parseApplicationGraph` still accepts a duplicate
  domain field, while validation, `assertValidApplicationGraph`, and typed
  indexing reject it. Repair round 1 was bounded to the missing navigation/flow
  parse rejection and did not change this pre-existing parser behavior.
- Final independent release review of repair commit
  `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` and reconciled governance
  baseline `d6f8b994fef491ef5405fee44ae015f01de788e5` returned RELEASE PASS with
  no P0/P1/P2.
- Fresh Node `v22.11.0` acceptance verification passed 32/32 Graph tests,
  Graph typecheck, lint, build, and the bounded repair diff check. The PM
  records Task 1 `reviewed -> accepted`.
- Task 1 acceptance is limited to the pure Graph index. Typed manifests,
  serialized selections, safe assets, and Draft/Publish/compiler enforcement
  remain Tasks 2 through 6; the
  parent Foundation defect remains open.

Typed Binding Task 2 implementation, repair-review, and QA evidence is:

- Implementation commit `4458bfc7c8ffcaef29dfebb755d8399e12000198`
  (`feat: define typed capability bindings`) is a direct child of dispatch
  `bf77d90a5e2e7627ad806b7851462935b2add7e0` and changes exactly the four
  authorized Task 2 paths.
- Independent review of
  `bf77d90a5e2e7627ad806b7851462935b2add7e0..4458bfc7c8ffcaef29dfebb755d8399e12000198`
  found two P1s; Task 2 remained `implementing` at that review point.
- P1 1: strict field and non-field manifest declarations do not have exact
  own-key allowlists, and duplicate `fieldTypes` entries are accepted. Repair
  round 1 stays inside the existing Task 2 paths and writer ownership.
- Repair implementation commit
  `a7331df0ac6a6f54f82bf61a060607777bc06dc0` changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Independent repair re-review of
  `4458bfc7c8ffcaef29dfebb755d8399e12000198..a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  returned PASS with no P0/P1/P2. It confirmed exact strict-key allowlists,
  duplicate-`fieldTypes` rejection, preserved specific non-field rejection, and
  the exact two-path repair diff.
- Repair verification passed 45/45 focused contract tests and 188/188 full
  Capabilities tests, plus Capabilities typecheck, lint, build, and bounded diff
  checks.
- Architecture amendment commit `36317bf` finalized Task 3 ownership. The PM
  reconciles the clean implementation, verification, bounded diff, and passing
  independent re-review as `implementing -> ready_for_qa`.
- Independent behavioral QA then passed 45/45 focused typed contract tests and
  188/188 full Capabilities tests, plus Capabilities typecheck, lint, and build.
  Strict public-package probes and bounded scope checks also passed.
- QA confirmed the implementation stayed inside Task 2's exact four
  Capabilities paths and the repair stayed inside its exact two-path subset.
  The PM previously recorded `ready_for_qa -> reviewed`.
- Independent release review then returned FAIL with one P1. Strict validation
  and canonical selection could read inherited schema constraints or an
  inherited binding `fieldKey`, allowing prototype-backed data to influence
  the canonical binding value persisted in a lock. The prior task-review and
  QA evidence remains historical and cannot support acceptance while this
  finding is open. The PM records `reviewed -> implementing` for repair round 2.
- Repair implementation commit
  `565c64c5e79799261f8dc72c7e0da298fef4742d`
  (`fix: reject prototype-backed capability bindings`) changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`. It adds
  plain-record/exact-own-key enforcement and focused regressions for inherited
  field-binding and schema values.
- Fresh local Node `v22.11.0` focused verification passed 47/47 tests across
  `typed-binding-contract.test.ts` and `composition-contract.test.ts`. This is
  repair-round-2 implementation evidence only.
- Independent task re-review of repair round 2 returned FAIL. Required
  `ownerBinding` and `fieldTypes` could still be satisfied through inherited
  values, optional `fieldRequired` and `fieldUnique` constraints were not
  governed solely by own-property presence, and the unknown-key guard did not
  reject an empty-string own key.
- Repair round 3 remains owned by **Typed Manifest Contract Integration** under
  the unchanged **Capability Binding Contract**. Its exact repair paths remain
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Repair implementation commit
  `00ac760c54f353f6ae242f92a5dd4809791cd633`
  (`fix: require own strict binding constraints`) requires own
  `ownerBinding`/`fieldTypes`, evaluates optional field constraints only when
  they are own properties, and rejects an empty-string unknown own key. New
  focused regressions cover `Object.prototype` pollution and the empty key.
- Fresh local Node `v22.11.0` implementation verification passed 49/49 tests
  across `typed-binding-contract.test.ts` and `composition-contract.test.ts`,
  plus Capabilities typecheck and lint. The commit changes exactly the two
  repair paths above.
- Independent repair-round-3 task review returned PASS with no P0/P1/P2. It
  passed 29/29 `typed-binding-contract.test.ts` tests and 20/20
  `composition-contract.test.ts` tests, verified the own-property and empty-key
  regressions, and confirmed the exact two-path diff.
- The PM reconciled the bounded implementation, fresh checks, and clean task
  review as `implementing -> ready_for_qa`.
- Independent repair-round-3 behavioral QA returned PASS. It passed 49/49
  focused tests, 192/192 full Capabilities tests, Capabilities typecheck, lint,
  and build, 180/180 Compiler tests, and the adversarial compiled probe.
- The PM previously reconciled that passing QA evidence as
  `ready_for_qa -> reviewed`.
- Independent release review then returned FAIL with two P1s. First,
  accessor-backed binding values could return one value during validation and
  another before canonicalization, so lock bytes could diverge from the value
  that passed validation. Second, strict parameter declarations could obtain
  `key`, `type`, and `required` through their prototype rather than exact own
  data, allowing inherited state to influence the strict contract.
- The prior repair-round-3 task-review and QA evidence remains historical and
  cannot support acceptance while these findings await independent repair
  review. The PM records `reviewed -> implementing` for repair round 4.
- Repair commit `b85dbda063fe6fa6db3b712f5891b013285e0356`
  (`fix: snapshot strict composition inputs`) changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`. It snapshots
  exact own, enumerable data records; rejects accessor-backed and inherited
  strict inputs; normalizes binding values once; and uses that immutable
  snapshot for both validation and canonical selection.
- Fresh engineer verification passed 195/195 Capabilities tests plus
  Capabilities typecheck, lint, and build. Compiler regression verification
  passed 180/180 tests plus Compiler typecheck and lint. The bounded diff is
  exactly the same two-path repair subset above.
- This is repair implementation evidence only. Independent task review of
  `b85dbda063fe6fa6db3b712f5891b013285e0356` returned FAIL with one new P1:
  `validateCapabilityBindingSchema` and `validateBindings` independently read
  and snapshot `manifest.parameters`, allowing a getter-backed manifest to
  return different strict parameter schemas between the two stages.
- The original two release P1 repairs and engineer checks remain historical
  implementation evidence, but `b85dbda063fe6fa6db3b712f5891b013285e0356`
  cannot advance to QA. Independent reproduction showed the remaining witness
  belongs to the shared immutable resolution-input boundary. Task 2A is now
  independently accepted, but Task 2 remains `implementing`; its local repair
  and review gates stay stopped until a separate PM reconciliation. Task 2 is
  not `accepted`.
- P1 2: `fieldKey` can exist in the Capabilities binding type but cannot persist
  through the strict `ApplicationGraphV1` composition-binding schema, which
  accepts only `{ graphSymbol }`.
- Accepted ADR-0007 and the synchronized design/plan/ledger amendment route the
  second finding to new Task 3. Task 2 remains inside its four Capabilities
  paths, Task 3 remains `planned` until Tasks 2 and 2A are accepted, and this
  update authorizes no Graph implementation.

Commercial Capability Foundation Task 1 is accepted and frozen. Its verified
`1.0.0` identities are `core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`; their physical
package, evidence-digest, verified-lock, and Publish-boundary contracts remain
unchanged.

Commercial Capability Foundation Task 2 completed two bounded fix rounds
within its exact five paths:

- Initial implementation `35aa96e` composed the two profile recipes. Fix round
  1, `ed3c2ba`, added configurable-line PolicyModel permissions, exact provider
  ownership, and complete cross-profile output assertions.
- The first scoped re-review found one remaining P1 in notification-provider
  coverage. Fix round 2, `ac43247`, added that ownership and an exact
  expected-effect-union assertion.
- Scoped re-review of `35aa96e + ed3c2ba + ac43247` returned PASS with all
  findings addressed and no P0/P1.
- Fresh Node `v22.11.0` verification passed 107/107 focused tests across
  `capability-registry`, `restaurant-profile`, and
  `commercial-profile-composition`; Capabilities typecheck and formatting also
  passed.
- Subsequent release review found four P1 semantic defects not covered by that
  scoped evidence. The earlier task-review and verification results remain
  historical evidence only; they do not support QA or acceptance while these
  findings are open.
- Fix round 3, `e61e790`, stayed inside the same exact five paths and closed all
  four findings:
  1. Simple Ecommerce now uses coherent `shopper` and `merchant` roles across
     bindings, permissions, and fulfillment.
  2. Composition now enforces fail-closed PolicyModel requirements for all four
     Foundation packages in both profiles.
  3. Restaurant stock movements now require location scope, a unique
     idempotency key/index, and item, order, and location relations, with
     adversarial validation.
  4. Production composition now admits only the three declared inventory
     co-provider effects and rejects every other overlap through the full
     profile entry points.
- Independent scoped re-review approved the repair with all four original P1s
  addressed and no P0/P1. Fresh Node `v22.11.0` verification passed 126/126
  focused tests across the three Task 2 suites; Capabilities typecheck and
  formatting also passed.
- Independent re-QA of the four-commit set passed 145/145 focused Task 2 tests
  and 152/152 full Capabilities tests. Build, typecheck, formatting, bounded
  diff checks, and direct checks of the four fix-round-3 categories passed.
  Re-QA nevertheless returned FAIL with one P1: those green suites do not prove
  Restaurant semantic rejection on the active default composition path.
- Fix round 4, `bf0b16f`, stayed inside two of the same exact five paths and
  closed that P1:
  - public `composeCapabilityDraft` now applies package- and binding-derived
    inventory-ledger semantic validation after composition resolution and
    symbol validation;
  - the validator is bounded by selection of `commerce.inventory-ledger`,
    derives movement and location entities from its bindings, and contains no
    profile-name or package-version dispatch; and
  - active `composeDefaultCapabilityDraft -> composeCapabilityDraft`
    regressions reject a non-unique idempotency key, a missing unique
    idempotency index, and a missing movement-to-location relation.
- Independent scoped re-review approved the repair with no P0/P1. Fresh Node
  `v22.11.0` verification passed all 155 Capabilities tests, including 28/28
  commercial-profile-composition tests; build, typecheck, and formatting also
  passed.
- Second independent re-QA then passed 148/148 focused Task 2 tests and 155/155
  full Capabilities tests. Build, typecheck, formatting, exact five-path diff
  checks, 56 remove-one-permission cases, the three active ledger mutations,
  no-ledger composition, and provider-overlap rejection all passed with no
  P0/P1/P2 demonstrated.
- Final release review nevertheless returned FAIL with one P1: the active
  generic validator still accepts inventory-ledger relations with a missing or
  wrong location source field and accepts missing catalog or order provenance
  relations. The green re-QA evidence does not justify acceptance while that
  public-boundary gap remains open.
- Final fix round 5, `6433940`, stayed inside two of the same exact five paths
  and closed that P1:
  - public inventory-provenance validation resolves movement, location,
    catalog, and order targets from the selected package's exact bindings;
  - it requires exactly one `many-to-one` relation to each target, an explicit
    declared string source field, required location/catalog fields, and
    distinct source fields; and
  - public-boundary tests reject missing, wrong, or reused relation fields and
    missing catalog or order relations while preserving no-ledger composition.
- Simple Ecommerce now includes the bound stock-movement-to-order relation via
  `orderId`. No profile-name, package-version, or provenance-field-name
  dispatch was introduced.
- Final scoped re-review approved the repair with no P0/P1 and the frozen scope
  intact. Fresh Node `v22.11.0` verification passed all 162 Capabilities tests,
  including 35/35 commercial-profile-composition tests; build, typecheck,
  formatting, and repair diff checks also passed.
- Final independent QA then passed 155/155 focused Task 2 tests and 162/162 full
  Capabilities tests. Build, typecheck, formatting, exact five-path diff checks,
  56 permission removals, inventory provenance mutations, no-ledger
  composition, and exact provider-overlap checks all passed with no P0/P1/P2
  demonstrated.
- Final release review nevertheless returned FAIL with one P1. Direct
  public-package probes proved that composition accepts both
  `core.location-context.locationCodeField = graph.domain.price` and
  `commerce.inventory-ledger.stockField = graph.domain.price`. The final QA
  evidence remains historical but cannot support acceptance because it did not
  exercise wrong-entity or wrong-type field substitutions.

The complete External Capability Intake project is accepted and frozen. Its
Task 6 writer record is
[`acceptance/external-capability-intake.md`](acceptance/external-capability-intake.md).
On Node `v22.11.0`, it records:

- A fixture-only CLI preflight of exactly 43 portfolio sources and 108 demand
  signals: 19 independent requested results, 24 independent policy-only
  blocks, stable redacted repeat output, no Candidate creation, and exact
  run-owned cleanup.
- Release-boundary regressions that reject Candidate artifacts at Golden,
  Graph, and compiler entry points; reject Golden/Graph/compiler/generated/
  runtime/provider/approval/copy-execution fields; and preserve package-root
  importer isolation.
- Independent re-QA after document repair `0b558fc` passed; PM ledger
  `77b4062` moved Task 6 `ready_for_qa -> reviewed`. Release review against
  `77b4062` then found two P2/no-P0/P1: the concurrent real
  directory-replacement race exceeded Vitest's 5-second default, and the prior
  documents were stale at `ready_for_qa`.
- Controller repair authorization `a9867b8` led to implementation commits
  `4924ec0 + dc6ca19`, which passed independent task review with no P0/P1/P2.
  PM ledger `43913ae` then moved Task 6 `implementing -> ready_for_qa`.
- Fresh re-QA at `43913ae` concurrently passed External Intake 392/392, Intake
  CLI 56/56, Graph 28/28, Capabilities 123/123, and Compiler 180/180. The
  directory and junction races completed in 6,361 ms and 3,688 ms.
- A serial Intake CLI run passed 56/56 with those races at 1,941 ms and 1,858
  ms; focused release-boundary and bulk-intake tests passed 3/3 and 1/1. All
  five affected typecheck/lint gates, targeted Prettier, `git diff --check`,
  and clean-worktree verification passed.

## Active work

- Typed Binding Task 1 is `accepted` and frozen under its pure Application
  Graph Type System contract. Its deferred parser limitation remains recorded.
- Typed Binding Task 2 is `implementing` in repair round 4 under the
  accepted ADR, design, plan, and Task 1 dependency. The implementation owner
  of record remains Typed Manifest Contract Integration and the contract owner
  remains Capability Binding Contract.
- Task 2's exact allowed paths are:
  `packages/capabilities/src/assets/contract.ts`,
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/test/composition-contract.test.ts`, and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Repair round 1 commit `a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  and its task-review/QA evidence remain historical after release review found
  the prototype-backed binding-lock P1.
- Repair round 2 commit `565c64c5e79799261f8dc72c7e0da298fef4742d`
  remains inside the exact two-path repair boundary, but independent task
  re-review returned FAIL on exact own-property enforcement.
- Repair round 3 commit `00ac760c54f353f6ae242f92a5dd4809791cd633`
  changes only `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`. Fresh local
  verification passed 49/49 focused tests, Capabilities typecheck, and
  Capabilities lint. Independent task review passed with no P0/P1/P2 after
  29/29 typed-binding and 20/20 composition tests. Independent behavioral QA
  then returned PASS after 49/49 focused tests, 192/192 full Capabilities
  tests, Capabilities typecheck/lint/build, 180/180 Compiler tests, and the
  adversarial compiled probe. Release review subsequently failed with the two
  accessor/prototype P1s recorded above, so this evidence is historical.
- Repair round 4 commit `b85dbda063fe6fa6db3b712f5891b013285e0356`
  changes the same exact two paths. It replaces repeated reads of caller-owned
  strict inputs with exact own-enumerable data snapshots and normalized
  binding values shared by validation and canonical selection. Fresh engineer
  verification passed 195/195 Capabilities tests, Capabilities typecheck,
  lint, and build, plus 180/180 Compiler tests and Compiler typecheck/lint.
  Independent task review then returned FAIL: separate reads of
  `manifest.parameters` in schema validation and binding validation allow a
  getter to supply different strict parameter schemas between stages. Repair
  round 4 remains `implementing`, but independent reproduction and accepted
  ADR-0008 stop further local Task 2 repair. Task 2A is now accepted; Task 2
  review, QA, release review, and acceptance verification remain stopped until
  a separate PM reconciliation authorizes its remaining gates.
- Repair round 4 may not change physical package roots and registrations,
  profile recipes, public Draft composition, Publish, compiler, Workbench,
  lifecycle, historical bindings, or introduce
  Profile/package/version/field-name dispatch.
- Typed Binding Task 2A, **immutable composition resolution boundary**, is
  `accepted` after repair round 2 under the **Capability Composition
  Resolution Boundary**
  contract owner and accepted ADR-0008. Its bounded writer is **Immutable
  Composition Resolution Integration**. Its exact allowed paths are:
  `packages/capabilities/src/node.ts`,
  `packages/capabilities/src/index.ts`,
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/test/composition-contract.test.ts`, and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Independent review of plan Task 3 commit
  `73accc24a68d55308d127717e36cd63130024f3e` returned FAIL with two P1s.
  `createVerifiedCapabilityCompositionLock` and `composeCapabilityDraft` read
  caller-owned selections or locks before capture, allowing a self-redefining
  accessor to make verification or provider-overlap checks observe different
  assets from resolution or lock creation. Compiled parameter- and
  binding-schema maps also retain runtime-mutable schema values.
- Controller-authorized repair round 1 requires capture before every public
  package-verification, provider-overlap, or other selection/lock read, reuse of
  that same owned snapshot downstream, and deep runtime immutability for every
  compiled schema value, including nested records and arrays. Governance commit
  `76274e304e1d09f58b847bcfd4c80e3db1072e28` formally amended the scope to
  those exact five paths.
- Repair commit `a09d459077f80fa82161df928137b1f2052a75bb` changes exactly the
  five authorized paths. Independent repair review returned SPEC PASS and
  QUALITY PASS with no P0/P1/P2 and no remaining task-review finding. The PM
  records `implementing -> ready_for_qa` at that task-review gate.
- Independent behavioral QA against `a09d459` returned PASS with no P0/P1/P2.
  Capabilities passed 214/214 with its package checks, and Compiler passed
  180/180 with its package checks. All public accessor probes observed zero
  getter invocations and rejected with the capture error; the valid frozen
  digest remained exact. The largest registered 13-selection composition
  resolved 1,000 times with exactly one digest and p95 2.708 ms, below the 20 ms
  ceiling. The exact five-path scope and diff checks were clean.
- Host default Node PATH is unusable because the configured NVM symlink is
  absent. Node v22.11.0 was available and every QA command used a process-local
  PATH to that binary; QA made no machine or persistent environment change.
- The PM previously reconciled QA and its environment limitation as
  `ready_for_qa -> reviewed`. Independent release review of `a09d459` then
  returned FAIL with one P1: `resolveCapabilityAssetLock`,
  `assertGoldenCapabilityAssetLocks`, `assertGoldenCapabilityComposition`,
  `composeDefaultCapabilityDraft`, and `composeProfileDraft` read caller-owned
  input or context before descriptor capture. Direct probes observed getter
  invocation, and a self-changing `profile` getter produced incoherent output.
- The Controller authorizes repair round 2 inside the same exact five paths.
  Every exported composition/lock public entry point must capture before any
  input or context observation and consume only the owned snapshot afterward.
  Exhaustive tests must prove zero getter invocations and self-changing-accessor
  coherence across all five wrappers. The PM records
  `reviewed -> implementing`; prior task-review and QA evidence remains
  historical. At that transition, fresh task review, QA, release review, and
  acceptance verification were required.
- Repair round 2 commit `40096847c4a4b28c3d02fd33d01805d46da0bded`
  changes only `packages/capabilities/src/composition.ts`,
  `packages/capabilities/src/index.ts`, and
  `packages/capabilities/test/composition-contract.test.ts`, a subset of the
  unchanged five authorized paths. Independent repair-round-2 review returned
  SPEC PASS and QUALITY PASS with no P0/P1/P2 after auditing all eight exported
  structured composition/lock boundaries and their self-redefining accessor
  and alias probes. The PM previously recorded `implementing -> ready_for_qa`.
  Prior QA against `a09d459` remains historical. Fresh repair-round-2
  behavioral QA against `40096847c4a4b28c3d02fd33d01805d46da0bded`
  returned PASS with no P0/P1/P2. Capabilities passed 219/219 and Compiler
  passed 180/180; all eight public boundaries rejected with the capture error
  and zero getter invocations; alias, server-lock, deep-freeze, and digest
  checks passed; and the largest registered composition retained one digest at
  p95 2.884 ms. The PM previously recorded `ready_for_qa -> reviewed`.
- Final independent release review at governance commit
  `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` against source commit
  `40096847c4a4b28c3d02fd33d01805d46da0bded` returned RELEASE PASS with no
  P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed 219/219
  Capabilities tests, 180/180 Compiler tests, and 76/76 focused tests. The
  1,000-resolution probe retained one digest at p95 2.554 ms, with no
  source/governance drift or secrets. The PM records `reviewed -> accepted`.
- Typed Binding Task 3 remains `planned`. Its Task 2A dependency is accepted,
  but Task 2 remains `implementing`, so Task 3 stays blocked. It owns exactly:
  `packages/graph/src/model.ts`,
  `packages/graph/test/application-graph.test.ts`, and
  `packages/graph/test/browser-entry.test.ts`.
- Physical assets remain Task 4 and blocked until Task 3 is accepted. Tasks 5
  and 6 remain serially blocked on their preceding accepted task. Task 7
  remains `planned` until Tasks 1, 2, 2A, and 3 through 6 are all `accepted`.
- Commercial Foundation Task 2 remains `implementing` and escalated. No sixth
  repair is authorized; its previous exact five-path implementation boundary
  remains historical release evidence only. It cannot resume acceptance until
  Typed Binding Task 7 is accepted and the PM reconciles the parent ledger.
- This PM transition changes only the typed-binding ledger and project status.
  It modifies no implementation code, source manifest, physical package,
  shared contract, or existing Commercial Foundation ledger.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- This slice is fixture-only and provides no public-network or live-service
  evidence. Acceptance grants no promotion, approval, Golden, Graph, compiler,
  generated-runtime, provider, or source-copy authority.
- Foundation Tasks 3 and 4 are blocked on accepted Task 2 profile composition
  metadata. Task 2 is back in `implementing` and escalated; neither downstream
  task is dispatched by this update.
- Typed Binding Task 2 is `implementing` in repair round 4 after independent
  release review found two P1s in accessor-backed binding canonicalization and
  prototype-supplied strict parameters. Commit
  `b85dbda063fe6fa6db3b712f5891b013285e0356` is implementation evidence only;
  independent task review failed on the separate `manifest.parameters`
  snapshot gap. Accepted ADR-0008 supersedes further local repair with Task 2A,
  now `accepted` after repair round 2 at commit
  `40096847c4a4b28c3d02fd33d01805d46da0bded` passed independent SPEC and
  QUALITY review with no P0/P1/P2. Release review of amended repair commit
  `a09d459` and its earlier QA remain historical. Fresh repair-round-2 QA
  against `40096847c4a4b28c3d02fd33d01805d46da0bded` passed with no P0/P1/P2,
  219/219 Capabilities tests, 180/180 Compiler tests, zero-getter capture-error
  rejection at all eight public boundaries, passing alias/server-lock/
  deep-freeze/digest checks, and one largest-composition digest at p95 2.884 ms.
  Final release review and fresh acceptance verification then passed against
  source `40096847c4a4b28c3d02fd33d01805d46da0bded` and governance
  `27c45b54951d00869f7cf6c58cc537c1a9b8ef35` with no P0/P1/P2; acceptance
  verification passed 219/219 Capabilities, 180/180 Compiler, and 76/76 focused
  tests, plus one digest across 1,000 resolutions at p95 2.554 ms and clean
  drift/secret checks. The PM records `reviewed -> accepted` for Task 2A. This
  does not advance Task 2, which remains `implementing` pending separate PM
  reconciliation.
  Graph Task 3 remains `planned` and blocked on Task 2 acceptance; its Task 2A
  dependency is now accepted.
  It, not either Capabilities task, owns owner-aware Graph persistence. Tasks 4
  through 6 cannot overlap or start before the preceding task is `accepted`.
- Physical asset Task 4 is additionally blocked on accepted Task 3 serialized
  Graph round-trip, structural validation, hash, and browser evidence.
- Typed Binding Task 7 cannot start before Tasks 1, 2, 2A, and 3 through 6 are all
  `accepted`. Its acceptance does not automatically accept Commercial
  Foundation Task 2; the PM must reconcile that parent state separately.
- No sixth Commercial Foundation Task 2 repair is authorized. ADR-0006 governs
  the dedicated hardening project; any change to its accepted contract,
  dependency chain, or exact task paths stops downstream work for PM and
  architecture review.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.
- Task 2 must not confuse accepted physical Foundation contracts with completed
  Restaurant or Ecommerce product behavior. Cross-profile bindings and
  deterministic recipe evidence are the gate.
- Task 2 intentionally records `commerce.inventory` and
  `commerce.inventory-ledger` as co-providers of `inventory.reserve`,
  `inventory.release`, and `inventory.decrement`. Fix round 3 now rejects the
  formerly undeclared `inventory.adjust` overlap, but future Task 3 must still
  define and prove lock-derived runtime resolution that cannot double-execute
  any of the three intentional stock movements or select behavior by profile
  name. This is a downstream risk, not authority to start Task 3.
- The flattened graph-symbol namespace allows an existing field symbol from the
  wrong entity or semantic type to satisfy a Foundation binding. Until Typed
  Binding Tasks 1, 2, 2A, and 3 through 7 are accepted, immutable locks can
  direct location or inventory behavior at unrelated data, including price
  fields.
- Task 1 provides the pure typed index but does not define typed manifest
  requirements, serialize owner-aware selections, publish safe assets, or
  enforce binding semantics at Draft, Publish, or compiler admission. Tasks 2
  through 6 are still required before recipe migration and parent closure.
- Task 2 repair round 1 closes the unexpected-own-key and duplicate-`fieldTypes`
  defects in implementation and task re-review, but its independent behavioral
  QA is historical after release review found that prototype-backed schema or
  binding values could influence lock canonicalization. Repair round 2 then
  failed independent task re-review because required and optional constraints
  were not fully own-property-bound and an empty-string own key escaped the
  unknown-key check. Repair round 3 is present inside the exact two-path repair
  boundary and passed independent task review with no P0/P1/P2. Behavioral QA
  then passed its focused, full Capabilities, compiler-regression, build-gate,
  and adversarial compiled-probe evidence, but release review then found that
  accessor-backed bindings could change between validation and
  canonicalization and that strict parameters could inherit their declaration.
  Repair round 4 commit `b85dbda063fe6fa6db3b712f5891b013285e0356`
  snapshots exact own-enumerable strict input data and passed fresh engineer
  package checks, but independent task review found a remaining time-of-check/
  time-of-use gap because `manifest.parameters` is fetched and snapshotted
  separately by schema validation and binding validation. A getter can return
  different parameter schemas between those stages. Independent reproduction
  expanded the risk to all caller-owned composition inputs. ADR-0008 assigns
  that boundary to Task 2A. Task 2A is accepted, but local Task 2 repair and
  review remain stopped until a separate PM reconciliation determines the
  remaining Task 2 gates.
- Task 2A plan Task 3 commit
  `73accc24a68d55308d127717e36cd63130024f3e` left public pre-capture reads and
  runtime-mutable compiled schema values. Governance amendment `76274e3`
  formalized the five-path repair, and repair commit
  `a09d459077f80fa82161df928137b1f2052a75bb` passed independent SPEC and
  QUALITY review with no P0/P1/P2. Independent behavioral QA also passed with
  no P0/P1/P2, 214/214 Capabilities tests, 180/180 Compiler tests, zero-getter
  capture rejection, exact digest compatibility, and one digest across the
  1,000-run performance probe at p95 2.708 ms. Release review then returned Task
  2A to `implementing` for repair round 2 after finding that five exported
  composition/lock wrappers still observe caller-owned inputs or context before
  capture. Direct probes invoked getters, and a changing profile getter
  produced incoherent output. The existing review and QA evidence is
  historical. Repair round 2
  commit `40096847c4a4b28c3d02fd33d01805d46da0bded` changes three of the five
  authorized paths and passed independent task review with SPEC PASS, QUALITY
  PASS, and no P0/P1/P2 after an audit of all eight exported structured
  composition/lock boundaries and self-redefining accessor/alias probes. Fresh
  behavioral QA against that commit passed with no P0/P1/P2: Capabilities
  passed 219/219, Compiler passed 180/180, every one of the eight public
  boundaries rejected with the capture error and zero getter invocations, and
  alias, server-lock, deep-freeze, digest, and largest-composition
  single-digest probes passed at p95 2.884 ms. Final release review then passed
  with no P0/P1/P2. Fresh Node `v22.11.0` acceptance verification passed
  219/219 Capabilities, 180/180 Compiler, and 76/76 focused tests, plus one
  digest across 1,000 resolutions at p95 2.554 ms and clean source/governance
  drift and secret checks. Task 2A is `accepted`; this grants no Profile,
  physical asset, Provider, Candidate Intake, or external source authority.
- Owner-aware field bindings cannot currently survive the Application Graph
  schema. ADR-0007 assigns the repair to Task 3, but the risk remains until that
  task passes independent review, QA, release review, and fresh verification.
  No downstream Draft, Publish, or compiler gate may assume the serialized
  `{ graphSymbol, fieldKey }` value exists before then.
- Repair round 1 rejects duplicate navigation-entry and flow IDs and makes
  `indexBy` fail closed. Independent re-QA, release review, and fresh
  verification passed; Task 1 is accepted.
- `parseApplicationGraph` still accepts a duplicate domain field even though
  validation, assertion, and typed indexing reject it. This is a documented
  deferred limitation outside the bounded navigation/flow repair.
- New safe versions must be created and digest-verified; accepted historical
  package roots and locks cannot be edited in place. Current recipes must
  migrate through a new Draft revision.
- Publish and compiler admission must become Graph-aware without restoring an
  unsafe lock-only overload or allowing compiler output before validation.

## Next smallest valuable slice

Reconcile accepted Task 2A against Task 2's repair-round-4 repeated-read P1 and
determine the smallest bounded Task 2 re-review or repair gate. Keep Task 2
`implementing` until that separate reconciliation is complete. Do not start
Graph Task 3; keep Typed Binding Graph Tasks 3 through 7 `planned` and blocked,
Commercial Foundation Task 2 `implementing` and escalated, and its Tasks 3 and
4 `planned` and blocked.
