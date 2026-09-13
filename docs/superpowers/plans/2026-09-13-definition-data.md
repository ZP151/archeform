# Product Definition Data Implementation Plan

> **For agentic workers:** Use the local subagent-driven-development skill for
> the single integrated slice. Root owns Git, evidence and acceptance; the
> implementation writer never commits, stages, pushes or operates services.

**Goal:** Drive all four reviewed definitions from strict data and deliver a
provider-free batch validator without changing any existing generated product.

**Architecture:** A checked-in JSON catalogue supplies canonical structures and
selection guidance. A fixed registry owns admitted family execution, validation
and projection. A bounded developer command validates candidates and reports
safe reasons without admitting files to the runtime catalogue.

**Tech stack:** Existing Node 22, pnpm 9, TypeScript/NodeNext, Zod and node:crypto;
no dependency, public API, Graph, database, runtime, UI or deployment change.

## Frozen scope and constraints

- Base `f8cdfe812c6c5ab2710a641862aa8f026134ab15`, existing isolated
  `consumer-delivery` worktree, branch `codex/consumer-delivery-roadmap`.
- ADR-0065 accepted SHA-256
  `40aeafc6a532d85fae26aa3420c0f910e5870a8ffe286c4e6e97988bcdc4f333`.
  Root recorded independent standing acceptance in the active ledger before
  source implementation; the decision receipt is in the acceptance evidence.
- Use DAT/REG/VAL identifiers in that ADR as exact data/report authority:
  `factory.product-definition-catalogue/v1`,
  `factory.product-definition-data/v1`,
  `factory.product-definition-validation-report/v1`; 2 MiB / 100-entry bounds.
- All four canonical structures, selection JSON schemas, guides/instructions,
  supported/clarification projections and true Published ordered bundles remain
  exact. Never refresh baseline values after implementation.
- No entry-named module/import/path/route/provider/code execution or package
  selection. Fixed expectation values are checked claims, not execution inputs.
- Definitions remain four. Additional distinct admissions are zero in this
  bounded migration; unsupported candidates expose family gaps.
- Preserve English source, tests, documentation and UI. Never record credentials
  or raw model/user prompts/responses in evidence or diagnostic output.

## One integrated task: data authoring, dispatch and batch validation

**Implementation ownership:**

- Add `packages/adapters/src/requirements/product-definition-data.ts`,
  `definition-family-registry.ts`,
  `definitions/product-definitions.v1.json`, `definition-batch-cli.ts`.
- Refactor `definition-selection-catalogue.ts`, the existing four
  `*-definition-selection.ts` files and `approval-definition-template.ts`.
  Compatibility export shims may remain; per-definition executable projection
  and duplicated canonical descriptors may not.
- Add `packages/adapters/scripts/copy-product-definition-data.mjs` to copy one
  fixed JSON file to the adjacent built location. Change
  `packages/adapters/package.json` only for build/copy and validation commands.
  The loader reads its exact fixed file as raw bytes before parsing; no JSON
  module import, TypeScript setting, dependency or package-root export changes.
- `openai-interpreter.ts` is conditional ownership only if current catalogue
  exports cannot be consumed unchanged. Report the need before editing.
- Own `packages/adapters/test/product-definition-data.test.ts` and affected
  `requirement-interpreter.test.ts` tests. Use the existing harnesses.

**Root ownership:** the new compiler compatibility test and fixture/helper,
`packages/compiler/test/definition-data-authoring.test.ts`,
`scripts/verify-product-definition-data.mjs`, design/plan/ledger/status,
acceptance evidence, and all Git actions.
QA/reviewers are read-only apart from their assigned report file. Any shared
contract change stops the implementation wave until resolved.

**Interfaces and behavior:**

- Consume the strict JSON envelope and existing family authorities. Produce
  the same `definitionSelectionCatalogue`, Zod union, JSON schemas, instructions
  and `projectDefinitionSelection` result contracts as the current callers use.
- The private parser rejects duplicate JSON object keys, unknown fields,
  versions/families, executable values and malformed canonical data. It copies
  and freezes admitted data. Generic projection changes only the existing
  validated selection fields and derives the same checksum/clarifications.
- Semantic fingerprints include supported fields, permissions, workflow and
  correction/failure semantics; ignore cosmetic copy and definition aliases.
  Exclude case keys, sort case collections, and normalize only structurally
  proven family role/entity/workflow aliases; preserve ordered steps and fields.
  All colliding members are rejected, without a first/last winner.
- The built command reads the shipped JSON by default or bounded candidate
  bytes through explicit `--stdin`. It accepts no candidate paths and writes no files. Reports, safe errors
  and exit status follow VAL-004..007. No stack, data, path or instruction leaks.

- [x] Capture pre-change four-definition baseline and run it with both old
      compatibility suites: three files / three tests pass. Remove capture utility.
- [x] Record independent standing acceptance and exact implementation owner.
- [x] Write and run focused failing tests for data-driven projection and strict
      parser/semantic/batch behavior before implementation.
- [x] Implement parsed data, fixed family validation and generic dispatch. Prove
      the data is the source consumed, not decorative metadata beside old projectors.
- [x] Add the provider-free command and tests for built Node loading, invalid
      input, oversized stdin, unknown arguments, duplicate semantics and deterministic bounded reports.
- [x] Run affected adapters tests/typecheck/build/lint and exact compatibility.
      Check existing OpenAI interpreter selection and Restaurant parameter behavior.
- [x] Run the built command twice; require shipped counts 4/4/4/4 and equality
      apart from duration. Exercise a small hostile/unsupported candidate batch.
- [x] Complete one independent task review, independent QA and final Sol review;
      use scoped checks for fixes and reuse byte-identical real-runtime/UI evidence.
- [ ] Reconcile the product scorecard, family-support gaps and next 30-definition
      batch plan, then root accepts, commits and pushes with remote equality.

## Acceptance and product scorecard

Functional: all four shipped definitions come from data, project exactly and
validate successfully. Generated bundles include every emitted source/CSS/asset
file in order. Existing immutable artifacts are not migrated.

Adversarial: malformed/duplicate-key JSON; excessive byte/depth/entry pressure;
unknown/executable keys; unsupported version/family/policy; invalid canonical
checksums/bindings; missing correction/failure; permission/state/field drift;
cosmetic aliases; duplicate keys; deterministic safe diagnostics. Any internal
fault uses the safe nonzero path. Runtime catalogue cannot be mutated by a
candidate validation command.

Report attempted/valid/distinct/admitted counts, reason counts, validation time,
four migrated definitions, zero added runtime families and zero new distinct
admissions. Distinguish a working authoring foundation from thousands of
definitions or ordinary-user/model accuracy. Existing real-runtime evidence
remains valid only when the exact output comparison passes.

Next: use the validator to identify which supported family contract can admit a
small semantically varied batch through data alone. Propose the narrowest
family expansion needed before a 30-entry milestone; do not hand-code another
catalogue of cosmetic products or silently widen current runtime selectors.
