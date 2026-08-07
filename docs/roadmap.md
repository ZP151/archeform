# Factory Pilot roadmap

## Product direction

Factory Pilot is a **Graph-first verified application factory**. The
`ApplicationGraphV1` is the durable business source of truth; Workbench
editors, AI, compiler targets, generated applications, Git exchange, and
runtime providers are constrained adapters around it. Factory Pilot is not a
Graph-to-code generator and is not a collection of frameworks.

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

## P1 — Governed Composition & Capability Foundry (active Goal)

### Staged AI composition

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

### Capability-led reuse

Prioritise cross-profile capabilities over profile-specific templates or new
frameworks: identity/session, files/media, search, scheduling, reporting, and
notification providers. Profile recipes compose versioned capabilities and
bindings; they do not grant profile-name conditionals or hidden runtime
authority.

Workbench component expansion proceeds only through Factory-owned wrappers and
the capability registry. Puck, XYFlow, shadcn, and TanStack remain replaceable
adapters and presentation tooling, never Graph authority or persisted business
semantics.

P1 acceptance gates:

- A staged proposal records questions, chosen capability versions, bindings,
  risks, acceptance scenarios, and explanation before any Graph Diff is
  offered.
- The system rejects a Graph Diff without an accepted CompositionPlan or one
  that would alter a Published Graph.
- A reusable capability serves at least two Profile Graphs with versioned
  locks, binding validation, and generated-application evidence.
- New Workbench components prove their Factory wrapper and capability-registry
  boundary; third-party editor data is not persisted as Graph truth.
- The Foundry has 25–35 verified capability families, and each counted family
  has current immutable lock, provenance and licence evidence, typed binding
  validation, fixtures, positive and negative tests, and isolated evidence from
  two Profile Graphs.
- `ProfileRecipeCatalogV1` contains at least 100 representative recipes and
  twelve independently compiled anchor Profiles across the defined domains.

Current evidence: the staged composition contracts (Train A of the active
Goal) are implemented at `f97eafa` and hardened at `67cf682`, `7524e6b`,
and `e13bef1` after independent task review and behavioral QA findings —
`RequirementSpecV1`/`CompositionPlanV1`/`CompositionDecisionV1`/
`CompositionClarificationV1`/`ProfileRecipeCatalogV1` with canonical hashes,
checksum-bound plan/Draft/Diff review, Draft-only application, and fail-closed
guards over whole-subtree integration rewrites (including empty/`.`/`..`
alias paths), decoded prototype-key paths and `~1`-escaped prototype tokens,
case-insensitive prototype-key and `www` business text (including
punctuation-adjacent hosts), nested exact-key items, and recipe lock/binding
requirements (`@factory/graph` 153/153, typecheck/lint/build green). Train A
is `reviewed` at `e13bef1` (task review, QA, release review, and PM gate all
PASS; held at `reviewed` until every train is accepted). Train B (planner and
Foundry admission) is implemented at `3c1848c` and repaired at `64e954b1`
after both independent gates failed on the same two P1 defects (unguarded
fixture `JSON.parse` throw; multi-provider dependency edges lost by a
last-write-wins map): deterministic `planComposition` (recipe scoring,
golden-lifecycle locks, structural Graph-symbol bindings, surface-mapped
output slots, fixture-fragment operations, bounded clarifications,
schema-valid answers for an empty staged catalogue) and
`evaluateFoundryAdmission` with sorted reason codes over a KAT-verified
pure-JS lock digest (`@factory/capabilities` 313/313, graph 153/153).
Train B's Control Plane review (Task 3) is implemented at `74e918d` and
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
313/313, control-plane 177/177); it is `ready_for_qa` at `a8914d0` pending
re-verification gates. Round 2 at `50b0e23` returned TASK_REVIEW_PASS
with one P2 (NEW-1: key failures echoed the offending key into the
rejection message), repaired at `f337174` — the walker names the container
only and a regression test asserts non-echo for `__proto__`/URL keys
(graph 160/160, capabilities 313/313, control-plane 177/177); it is
`ready_for_qa` at `ed82b17` pending re-verification gates. Round 3 at
`342b19c` closed both re-verification gates with no findings (task review
PASS; behavioral QA 27/27), and the PM records Task 3 `ready_for_qa ->
reviewed` — Train B Tasks 2–3 are `reviewed` at `342b19c`. Task 4
(constrained planning adapters) is implemented at `50b0e23` + `34b81ed`:
the deterministic adapter returns only the planner's resolution over
approved assets, the guarded OpenAI adapter contributes only parsed safe
business text and fails closed on any divergence or unsafe material, and
the Control Plane seam maps bounded provider failures to conflicts with
nothing persisted (control-plane 181/181, adapters 34/34); it is
`ready_for_qa` at `34b81ed` pending independent gates.

## P2 and P3

- **P2:** managed deployment, observability, fleet upgrades, and rollbacks,
  all tied to immutable Compilation and verification evidence.
- **P3:** additional frontend and backend frameworks, admitted only as
  Graph-first compiler/runtime adapters after the P0/P1 boundaries are proven.

## Dependency-aware sequence

1. Finish and independently accept the isolated verifier against the accepted
   compiler targets, including the real Docker loop and terminal failure path.
2. Deliver the staged AI `RequirementSpec` and `CompositionPlan` boundary,
   then permit constrained Draft Diffs and reviewable decisions.
3. Build the Capability Foundry, expand cross-profile capability families, and
   establish the 100+ recipe catalogue with verified generated-application
   journeys.
4. Add managed delivery and fleet operations, then consider additional
   framework adapters.

## Ecosystem and source-study rules

Prospective direct dependencies for this strategy are **Testcontainers for
Node**, **fast-check**, and **ts-morph**. They are not installed or approved by
this roadmap; each requires a pinned published release, licence notice, and the
existing dependency/provenance/security gates before adoption. Dagger and
OpenTelemetry are later candidates for managed verification and observability.

Amplication, Backstage Scaffolder, bolt.diy, Dyad, and OpenHands are
source-study-only architecture references. Factory Pilot must not imply that
their code, packages, templates, or runtime designs are installed, copied, or
approved. Any source reuse continues to require an exact immutable source-study
record, licence compatibility decision, third-party notices, security evidence,
focused boundary tests, and a removal path.

## Non-goals

- Generated source is not an editable source of truth and is never
  reverse-parsed into a Graph.
- Published Graphs and Compilations are never mutable repair targets.
- A profile template, framework, editor, AI provider, or runtime provider does
  not define Factory business semantics.
- P2/P3 work does not bypass P0 verification gates.
- Source-study references do not authorise copying code or installing
  dependencies.

## Current evidence boundary

Existing completed acceptance evidence remains historical and is recorded in
`docs/project-status.md`. Retail Counter and Grocery Pickup are accepted local
generated prototypes, including Preview stop and exact cleanup. They are not
production-readiness evidence. The compiler target plugin kernel and its three
parity migrations are accepted; the next bounded goal is the isolated verifier
and safe diagnosis-to-Draft-Diff loop.
