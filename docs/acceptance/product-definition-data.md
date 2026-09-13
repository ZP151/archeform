# Product definition data foundation

Date: 2026-09-13. Base: f8cdfe812c6c5ab2710a641862aa8f026134ab15.
Status: accepted by root for bounded branch delivery; task review, independent
Terra QA and independent Sol release review pass with P0/P1/P2 0/0/0.
Source delivery: `22f5842a96e9cf165fd866ee1117d92adc0c14e7`, pushed to the
iteration branch with remote-tip equality and a clean working tree verified.

## Product outcome

Four reviewed definitions now supply their canonical structure and selection
guidance through one strict JSON catalogue. Fixed family implementations own
projection and execution binding. The existing consumer flow remains unchanged.
This removes the need for a per-definition executable projector and provides a
bounded provider-free authoring validator. It does not establish a thousand-entry
catalogue, model-selection accuracy or ordinary-user success rates.

An independent compiler probe changes an Approval field through data alone and
observes the required field in generated Prisma and UI output, alongside the
existing correction runtime. Published input and the shipped catalogue remain
unchanged. This is one authoring probe, not a newly admitted runtime product.

## Scope and counts

| Measure                                                   | Observed scope |
| --------------------------------------------------------- | -------------- |
| Migrated reviewed definitions                             | 4              |
| Existing demonstrated local runtime families              | 3              |
| Newly admitted distinct products / runtime families       | 0 / 0          |
| Shipped attempted / valid / distinct / admitted           | 4 / 4 / 4 / 4  |
| Data-only field-variation compiler probes                 | 1              |
| Actual new provider, ordinary-user or runtime E2E samples | 0              |
| New UI assets, dependencies or public contracts           | 0              |

Restaurant execution validation uses its existing full V3 profile, including
20 capability locks, rather than the generic six-lock Requirement planning
projection. Approval and Task retain their respective exact six-lock family
bindings. Both the generic interpretation round trips and the actual Restaurant
V3 output remain covered by independent immutable compatibility fixtures.

## Verification evidence

- Pre-implementation capture: four canonical structures, schemas, guidance,
  supported/clarification projections and complete ordered Published bundles.
  The baseline SHA-256 remains
  `585efce4cf6383abdf323ba8d9de1d2f9b928f254a9cdb907e83698d2c3b28ea`.
- Built CLI: 16 process-level cases cover default/repeated/stdin admission,
  deterministic output, byte-equal build copy, malformed and escaped-duplicate
  JSON, invalid UTF-8, byte/entry bounds, unknown arguments and fields, unknown
  family, duplicate identity/semantics, and missing correction/failure cases.
- Workbench: production build completes page collection, static generation and
  traces; four affected interpretation/consumer suites pass 64 tests.
- Independent compiler authoring: one test passes, observing generated schema,
  UI/correction selection and immutable input/catalogue retention.
- Full adapters: 218 tests passed before three final guard cases; the final
  focused data suite passes 26 tests after those fixes. Build, typecheck and
  lint pass. Final compiler authoring plus all three compatibility suites pass
  four tests on the frozen source.
- Independent task review passes with P0/P1/P2 0/0/0. Terra QA verifies all 18
  source hashes, reruns 174 data/interpreter tests and all 16 built CLI cases,
  and returns QA_PASS with P0/P1/P2 0/0/0.
- Independent Sol release review passes with P0/P1/P2 0/0/0. It verifies the
  frozen diff and exact catalogue membership, including rejection of a
  Unicode-equivalent but changed instruction. Root accepts this bounded slice.
- One observed shipped batch validates in 381 ms. This measures the local
  provider-free validator, not consumer time to a usable app.

Machine reports and source identity are in
`docs/acceptance/evidence/product-definition-data/`. The existing Task,
Approval and Restaurant real-runtime/UI evidence is reused only with unchanged
full generated output; no new screenshots stand in for a changed implementation.

## Defects discovered and corrected

The first actual Workbench build exposed a loader integration failure that
adapter unit tests and plain Node execution did not detect. Webpack rewrote a
static `new URL` JSON reference, and the JSDOM consumer test also received a
non-file URL. The fixed loader uses Node path construction around the exact
adjacent filename, with bounded raw reads and no configuration or dependency
change. Both integration paths pass after the repair.

The command acceptance harness initially sent a large stdin buffer to a process
that correctly rejected unknown arguments before reading it; Windows reported
a closed pipe. The harness now tests argument rejection without feeding an
irrelevant body. This was a test repair, not a production behavior change.

The Workbench build reports an existing workspace-root inference warning due
to multiple ancestor lockfiles. Its build succeeds; no Next configuration or
deployment changes are part of this slice. Hosted packaging remains outside
the demonstrated local scope.

## Next delivery

Use the six representative candidate briefs in the updated scale roadmap to
measure data-only additions, duplicates and missing family capabilities. The
next 30-definition milestone depends on meaningful business breadth and actual
journeys; the 100-definition milestone additionally requires measured selection
and bounded retrieval. Use the authoring guide and shared business regression
matrix, keeping one contract-level review sequence rather than per-field gates.
