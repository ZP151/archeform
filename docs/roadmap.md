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

Modularise the compiler behind `CompilerTargetPluginV1`:

```text
supports -> plan -> render -> validate
```

Each plugin consumes only the immutable Published Graph and explicit compiler
context. Begin with low-risk `docs`, `policy`, and `database` targets. For each
migration, compare the new output digests with the current compiler before the
plugin becomes authoritative; any unexpected difference blocks migration until
explained and accepted. Preserve deterministic compilation records and the
existing target contracts throughout the transition.

Move Restaurant-specific behavior into declared capability contributions,
bindings, and target plugins. No compiler, runtime, or generated-app branch may
select semantics by profile name.

### Verification loop

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

P0 acceptance gates:

- `CompilerTargetPluginV1` lifecycle contracts and focused tests exist.
- Docs, policy, and database plugins have digest-comparison evidence against
  the current compiler, including an explicit disposition for each difference.
- At least one generated application completes the full isolated verification
  loop, including denial, idempotency, cleanup, and a reviewable Draft Diff.
- Published Graphs and completed Compilations remain immutable under verifier
  and diagnosis tests.

## P1 — governed composition, AI, and Workbench expansion

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

## P2 and P3

- **P2:** managed deployment, observability, fleet upgrades, and rollbacks,
  all tied to immutable Compilation and verification evidence.
- **P3:** additional frontend and backend frameworks, admitted only as
  Graph-first compiler/runtime adapters after the P0/P1 boundaries are proven.

## Dependency-aware sequence

1. Stabilise immutable Graph, capability-lock, and compiler admission
   boundaries already under active verification.
2. Define and test `CompilerTargetPluginV1`; migrate docs, policy, then
   database with output-digest comparison to the current compiler.
3. Establish the isolated verifier and its safe-diagnosis-to-Draft-Diff
   contract against the migrated targets.
4. Deliver the staged AI `RequirementSpec` and `CompositionPlan` boundary,
   then permit constrained Draft Diffs.
5. Expand cross-profile capabilities and Factory-owned Workbench wrappers with
   verified generated-application journeys.
6. Add managed delivery and fleet operations, then consider additional
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
production-readiness evidence. The next bounded goal first reconciles the
active typed-binding contract dependency, then delivers the compiler plugin
kernel and documentation, policy, and database parity gates.
