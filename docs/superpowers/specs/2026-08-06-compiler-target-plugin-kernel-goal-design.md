---
Date: 2026-08-06
Status: Proposed
Approved-By: Pending founder review
Required-Plan: docs/superpowers/plans/2026-08-06-compiler-target-plugin-kernel.md
---

# Compiler Target Plugin Kernel Goal Design

## Outcome

Deliver the first bounded P0 execution goal for the Graph-first verified
application factory: reconcile the active typed-binding governance dependency,
introduce `CompilerTargetPluginV1`, and move documentation, policy, and database
target ownership out of the centralized compiler through deterministic parity
gates.

This Goal ends after the plugin kernel and three low-risk target migrations are
accepted. The isolated verifier and diagnosis-to-Draft-Diff loop become the
next P0 Goal.

## Current evidence baseline

- `main` is synchronized with `origin/main` at the start of goal design.
- The TypeScript workspace contains Workbench, Control Plane, Compiler Worker,
  Intake CLI, Graph, Capabilities, Compiler, Adapters, External Intake, and
  public Portfolio packages.
- Five starter Profiles have generated-application evidence: Expense Approval,
  Restaurant Ordering, Simple Ecommerce, Retail Counter, and Grocery Pickup.
- The physical capability catalogue currently contains 23 package keys and 50
  version directories. These counts are inventory, not production breadth.
- `packages/compiler/src/index.ts` centrally owns compilation planning and much
  of target rendering. `CompilerTargetPluginV1` exists only in product
  direction documents.
- Typed Capability Binding Task 2 remains `implementing`; Task 2A is accepted.
  That unresolved reconciliation is a hard dependency, not historical noise.

## Why this is the next execution goal

The current long-running portfolio Goal mixes product direction, capability
breadth, compiler architecture, AI composition, generated-runtime verification,
and operations. A fast execution model cannot complete that scope safely in a
single auditable loop. The plugin kernel is the smallest architectural slice
that reduces compiler concentration while preserving current generated output.

The target order is intentionally low risk:

```text
governance reconciliation
  -> plugin kernel
  -> documentation parity
  -> policy parity
  -> database parity
  -> acceptance and next-goal handoff
```

## Authority and lifecycle

The immutable Published Graph and validated capability composition lock remain
the only product compilation inputs. The mutable Draft, generated source,
editor state, profile name, provider output, or filesystem path cannot become a
semantic authority.

The lifecycle remains:

```text
Draft -> validated Published Graph -> immutable Compilation -> verification
```

This Goal does not alter that lifecycle or permit reverse parsing.

## Stage 0: governance reconciliation

Before compiler work, reconcile
`docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`:

1. Re-run the focused Task 2/2A probes needed to decide whether the accepted
   immutable composition resolution boundary closes Task 2's repeated-read P1.
2. If the finding is closed, record the evidence and advance Task 2 only through
   its declared review, QA, release, and PM state transitions.
3. If the finding remains, implement only the bounded Task 2 repair authorized
   by its contract and repeat its gates.
4. Do not start plugin implementation while Task 2 remains an unexplained
   compiler-admission dependency.

This reconciliation may update governance records and bounded typed-binding
code. It may not change an accepted ADR without a new explicit decision.
Stage 1 cannot begin until a fresh task review, QA, release review, and PM
transition have returned Typed Binding Task 2 to `accepted`.

## Stage 1: plugin kernel

Define a public, versioned compiler target contract with these responsibilities:

```ts
interface CompilerTargetPluginV1<TPlan> {
  readonly apiVersion: "factory.compiler-target/v1";
  readonly key: CompilationTargetKey;
  supports(input: PublishedCompilationInput): boolean;
  plan(input: PublishedCompilationInput): TPlan;
  render(plan: TPlan): readonly GeneratedFile[];
  validate(files: readonly GeneratedFile[]): TargetValidationResult;
}
```

The implementation plan may refine supporting type names, but it must preserve
the lifecycle, explicit immutable inputs, serializable plans, deterministic
rendering, and fail-closed validation.

The Registry must reject duplicate keys, unsupported target requests, output
path traversal, duplicate file paths, nondeterministic output, and validation
failure. `packages/compiler/src/index.ts` remains a compatibility-free public
facade for current Factory callers while delegating migrated target ownership.

## Stages 2-4: target migration

Migrate targets serially:

1. Documentation: API reference, ERD, permission matrix, and application docs.
2. Policy: Casbin model/policy and generated authorization projections.
3. Database: Prisma schema, initial migration, seed, and package-owned database
   contributions.

For every target and each fixed Profile fixture:

- capture the legacy path, exact bytes, and SHA-256 digest;
- render through the plugin;
- compare file set, bytes, and digest;
- block unexplained differences;
- add target-owned negative tests;
- remove the old central renderer only after parity succeeds.

An intentional output change requires a separately documented decision and may
not be hidden inside a refactor commit.

## Responsibility-based file decomposition

Large-file reduction is an architectural outcome, not a formatting exercise.
Use these target boundaries:

```text
packages/compiler/src/
  index.ts                         public facade and orchestration
  core/
    target-plugin.ts               contract and result types
    target-registry.ts             admission and ordering
    generated-files.ts             path, collision, and digest rules
  targets/
    documentation/                 documentation plan/render/validate
    policy/                        policy plan/render/validate
    database/                      database plan/render/validate
```

Each module owns one reason to change, uses typed inputs/outputs, and can be
tested without booting unrelated targets. Avoid generic `utils` or `helpers`
modules. Prefer new production files below 500 non-generated lines and
functions below 60 lines, but preserve cohesive logic; a justified exception is
recorded in the iteration ledger. No unrelated Restaurant/runtime extraction is
part of this Goal.

## Iteration and evidence model

Create
`docs/superpowers/ledgers/2026-08-06-compiler-target-plugin-kernel.md` when the
implementing agent creates and reviews the plan. Every iteration entry records:

- owned task and paths;
- RED command and expected failure;
- GREEN and regression commands with exact totals;
- digest-parity result or explained disposition;
- review findings and repairs;
- the already-pushed implementation commit hash and observed remote
  reachability;
- residual risk and next task.

Update `docs/project-status.md` only with current milestone evidence and the
next smallest slice. Update `docs/roadmap.md` when a gate is actually satisfied.
Do not append raw prompts, model responses, credentials, generated source,
ephemeral identifiers, or local URLs.

Review, QA, release review, and PM transitions run in fresh independent Claude
contexts. The implementation context coordinates the sequence but cannot
self-certify a gate or advance a ledger state.

Within this approved scope, the implementation context is autonomous: it may
inspect any non-sensitive repository source, choose cohesive module boundaries,
run proportional tests, repair findings, and continue to the next plan task
without routine founder confirmation. Only a declared stop condition requires
founder input.

## Commit and push policy

Use one conventional commit per independently green iteration. Add a bounded
evidence update when independent gates complete and the accepted hash is known.
The expected implementation sequence is:

1. `docs: reconcile p0 compiler plugin goal`
2. `feat(compiler): add target plugin kernel`
3. `refactor(compiler): migrate documentation target`
4. `refactor(compiler): migrate policy target`
5. `refactor(compiler): migrate database target`
6. `docs: accept compiler target plugin kernel`

Before every commit, run focused tests, affected-package typecheck and lint,
formatting, and `git diff --check`. Prefer an isolated feature branch or
worktree. Use normal Git commands after inspecting the current branch, remote,
status, and intended diff. Never force-push, amend a pushed commit, include
unrelated changes, or push a failing iteration.

Task review, QA, release review, and PM acceptance occur only after the green
implementation commit is remote-reachable, and every gate must cite that exact
hash. A repair creates and pushes a new commit and restarts all gates against
the new tip. Only after acceptance may the separate evidence-reconciliation
commit record the accepted hash. An evidence entry must never predict the hash
of the commit that contains that entry.

## Design approval and planning

Product implementation starts after the founder approves this design:

```text
Status: Approved
Approved-By: Founder
```

After approval, the implementing agent may create and maintain the detailed
plan and ledger, select a suitable feature branch or worktree, and continue
without routine founder confirmation. The tracked `.env.example` is safe; local
credentials and raw model material remain outside all source, evidence, and
logs.

## Testing strategy

- Apply RED-GREEN-REFACTOR to every behavior change.
- Test the public plugin lifecycle and Registry failures independently.
- Preserve current compiler public behavior through facade tests.
- Compare documentation, policy, and database output across all five Profiles.
- Run the complete Compiler suite at every target milestone.
- Run affected Graph, Capabilities, Control Plane, and Worker suites when their
  boundary is exercised.
- Run generated application boot/migration smoke when runtime or migration
  bytes change.
- Run repository formatting, diff, provenance, and secret checks before final
  acceptance.

This Goal contains no AI behavior. A real-model call is neither required nor
valid evidence for deterministic compiler refactoring.

## Non-goals

- Isolated verifier or diagnosis-to-Draft-Diff implementation.
- `RequirementSpec`, `CompositionPlan`, or AI provider changes.
- New capability families, Profiles, dependencies, or external source reuse.
- Restaurant runtime extraction or behavior changes.
- Cloud deployment, providers, observability, fleet, upgrade, or rollback.
- Graph, lifecycle, capability-lock, or output-slot contract changes.

## Completion criteria

The Goal is complete only when:

1. Typed Binding Task 2 is reconciled through its existing governance gates.
2. `CompilerTargetPluginV1` and Registry have focused positive and fail-closed
   tests.
3. Documentation, policy, and database are independent registered targets.
4. All five Profile fixtures have recorded file/byte/digest parity for the
   three targets, with no unexplained difference.
5. The compiler facade no longer owns those renderers.
6. No profile-name semantic branch or mutable compilation input is introduced.
7. Required focused, package, integration, and smoke gates pass.
8. Goal ledger, roadmap, project status, and acceptance evidence agree.
9. Fresh independent task-review, QA, release-review, and PM contexts have
   completed every required transition.
10. The worktree is clean and every Goal commit is present on the selected
    remote feature branch.

Completion is reported as `GOAL_COMPLETE` with commits, commands, totals,
remaining gaps, and the recommended next Goal. Any contract-level blocker is
reported as `GOAL_NEEDS_DECISION` with evidence and no scope expansion.
