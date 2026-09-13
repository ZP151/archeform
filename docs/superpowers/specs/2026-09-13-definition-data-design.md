# Product Definition Data Foundation

## Outcome and existing authorization

The founder approved the core roadmap and asked to continue its next goal after
Task correction delivery. This slice makes reviewed product definitions
data-driven and validates a batch before admission. Ordinary users keep the
existing brief-to-app flow; there is no new consumer wizard or technical step.
Technical contract acceptance follows ADR-0065 and the existing independent
standing-review policy before implementation.

## Chosen approach

Use strict, bounded, JSON-representable definition data bound to fixed admitted
family implementations. The data must actually drive canonical definitions and
projection. A metadata inventory alongside four independent handwritten
projectors would not meet this goal. Existing family-specific parameter handling
can remain fixed code where its semantics require it.

Keeping executable per-definition modules would preserve behavior but retain the
current scaling bottleneck. Loading arbitrary template modules would introduce
unnecessary execution and supply-chain authority. A data representation with
explicit admitted bindings gives a reversible path without either expansion.

## User and authoring flow

Reviewed data describes the job, supported fields, roles, state/rule bindings,
correction and failure journeys, limits, presentation/capability bindings and
provenance. The validator returns bounded actionable diagnostics. A batch
report separates attempted, valid, distinct and admitted definitions from
unsupported capabilities and cosmetic duplicates. Accepted data is consumed by
the current catalogue and fixed execution code, through the existing immutable
Publish and Compilation path.

The four existing definitions are migration fixtures, not four new products.
Any new candidate needing a field, permission, rule or workflow outside a proven
family is rejected and recorded as a family-support gap. A changed title,
example, color or display label does not create distinct business coverage.

## Scope and boundaries

- Preserve all four canonical structures, selection JSON schemas, guides,
  instructions, supported/clarification projections and complete Published
  bundles. Root captured these at `f8cdfe81` before source changes.
- Preserve the approved UI, existing selectors, demo identity limits, public
  Graph/API contracts, runtime services and package versions.
- No prompt can choose executable modules, files, dependencies, routes or
  runtime bindings. No network import or provider call is introduced.
- A provider-free command validates the shipped definitions and a small
  adversarial candidate batch, with deterministic safe machine-readable results
  and a failing exit status when admission fails.
- Do not force unsupported new families into existing selectors to reach a
  numeric target. Scheduling, inventory, content actions, identity and hosting
  remain separate roadmap capabilities.

## Acceptance and efficient regression

The first failing tests cover malformed/version/unknown/executable data,
unsupported family bindings, semantic drift, missing correction cases,
cosmetic duplicates and batch bounds. Positive tests prove all four current
definitions project through data and fixed implementations. Root-owned exact
compatibility fixtures cannot be refreshed after implementation.

Run affected package checks and the new compatibility tests. Exercise the
actual provider-free batch command, including failures and deterministic output.
An unchanged runtime and presentation with byte-identical Published bundles can
reuse their accepted real-runtime and visual evidence. If a business rule or
presentation output changes, stop and resolve the drift before claiming this
slice; do not silently substitute new screenshots or a new baseline.

Use one contract-level review sequence, with scoped follow-ups for fixes and
no approval gate per definition or field. Root owns Git delivery after required
review, and reports configuration-only additions honestly. The next 30-entry
batch begins only after this foundation and its supported-family limits are
demonstrated.
