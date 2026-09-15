# Product definition data task review

Review scope: one completed definition-data task from base
`f8cdfe812c6c5ab2710a641862aa8f026134ab15`. This is a task gate only; it is
not QA, release review, ledger mutation, or permission to accept the task.

Reviewed authorities: `AGENTS.md`, the definition-data plan, ADR-0065 at
SHA-256 `40aeafc6a532d85fae26aa3420c0f910e5870a8ffe286c4e6e97988bcdc4f333`,
the active task ledger, source manifest, implementation report, and the
frozen review diff. The 18 manifest-listed paths match their recorded byte
counts and SHA-256 values.

## Specification compliance

**SPEC_COMPLIANCE: PASS**

- The only canonical source is the bounded adjacent JSON file. The loader
  constructs that fixed path from its module location and reads at most 2 MiB
  plus one sentinel byte before parsing ([product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:364)).
  It cannot take a data-supplied path or perform discovery.
- Raw input is decoded as fatal UTF-8, tokenized before `JSON.parse`, has a
  per-object decoded-key set, rejects escape-equivalent duplicate keys,
  non-finite numbers, unsupported controls, unpaired surrogates, and depth
  over 64 ([product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:155)).
- The catalogue envelope and entry schemas are closed, versioned, bounded to
  1..100 entries, and route guide validation through the fixed family schema
  ([product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:271), [product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:289)).
- Registry execution is closed to the three accepted coordinates
  restaurant/V3, approval/V1, and task/V2
  ([definition-family-registry.ts](../../../../packages/adapters/src/requirements/definition-family-registry.ts:443)). The generic entry factory creates the selection schema and projection from validated data; it does not dispatch an entry-named implementation ([definition-family-registry.ts](../../../../packages/adapters/src/requirements/definition-family-registry.ts:1264)).
- Batch validation rejects every duplicate-key and cross-key semantic collider,
  admits only a deeply equal member of the frozen shipped catalogue, and never
  writes a candidate back to it ([product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:459), [product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:477)).
  The fingerprint preserves field and journey-step order while making case
  collections set-like and normalizing only registry-resolved aliases
  ([definition-family-registry.ts](../../../../packages/adapters/src/requirements/definition-family-registry.ts:1225)).
- The CLI has exactly the safe default and `--stdin` modes, accepts no path
  argument, truncates stdin at the shared byte bound, and has a bounded
  non-echoing internal-failure path ([definition-batch-cli.ts](../../../../packages/adapters/src/requirements/definition-batch-cli.ts:7)).

## Code quality

**CODE_QUALITY: APPROVED**

- The raw parser, strict schema parsing, family validation, and reporting are
  separated into focused units; data loading is cached only after the full
  parse-and-freeze boundary ([product-definition-data.ts](../../../../packages/adapters/src/requirements/product-definition-data.ts:345)).
- The fixed registry compares Restaurant execution against its actual V3
  authority and graph-derived locks, surfaces, pages, journeys, field
  authorities, and binding policies rather than the generic planning result
  ([definition-family-registry.ts](../../../../packages/adapters/src/requirements/definition-family-registry.ts:969)). Approval and Task retain the fixed six-lock/binding checks in the same execution validator.
- Named cross-package check: Task role/entity/workflow aliases remain safe.
  The unchanged compiler derives the member/viewer roles and primary entity
  from the capability-bound Graph rather than literal `member`, `viewer`, or
  `task` selector strings ([task-mutation-contract.ts](../../../../packages/compiler/src/task-mutation-contract.ts:184)). Its existing compiler regression proves renamed roles, entity, workflow, declaration order, and field order compile to the Task presentation ([task-mutation-runtime.test.ts](../../../../packages/compiler/test/task-mutation-runtime.test.ts:601)). The registry's structural slot normalization therefore does not admit a candidate that the Task compiler rejects; no execution-drift finding results.
- Focused tests exercise actual data-only projection, raw duplicate and Unicode
  failures, bound checks, all-collider handling, alias/case-order rules,
  family-guide drift, and the built CLI ([product-definition-data.test.ts](../../../../packages/adapters/test/product-definition-data.test.ts:24), [product-definition-data.test.ts](../../../../packages/adapters/test/product-definition-data.test.ts:182)).
- Evidence is internally consistent: the final 26 focused adapter tests pass;
  the final adapter build/typecheck/lint pass; the compiler authoring plus
  compatibility set passes 4/4; the built CLI evidence records 16 passing
  process cases and 4/4/4/4 shipped counts; and the final Workbench build and
  64 affected consumer tests pass. See
  [implementation report](implementation-report.md:30),
  [compiler regression log](compiler-regression.log:1), and
  [command evidence](command-evidence.json:1).

## Findings

No P0, P1, or P2 findings.

## Assessment

**TASK_REVIEW_PASS: yes**

The implementation satisfies the frozen data/registry/validator contract and
preserves the demonstrated four-definition compatibility boundary. This clean
task-review result is evidence for PM and QA; it does not change the ledger or
authorize acceptance, integration, publishing, or release.
