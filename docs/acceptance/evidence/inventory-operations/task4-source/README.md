# Supplies Stockroom admission and acceptance case

Date: 2026-09-24. Status: source accepted after one independent ordinary review;
actual generated-product acceptance is pending. Authority: unchanged ADR-0076.

The canonical definition and real case binding reuse the delivered Inventory
family. All first-nine definition rows and historical generated outputs remain
unchanged. No production interpreter or public contract changes. Authored provider
responses verify schema/selection behavior; they do not measure model accuracy.
Initial and unrelated-follow-up material questions are retained. A real answered
context that still requires unsupported capability keeps the historical
`output_invalid` refusal and leaves the prior interpretation unchanged; explicit
acceptance of the supported scope succeeds. The shared ordinary-user refusal UX
is recorded separately for an accepted follow-up decision.

## Checks

- Adapter admission/selection tests: 227/227.
- Compiler compatibility: 117/117, including all nine historical bytes.
- Case-index tests: 5/5; actual index check passes.
- Adapter build/typecheck and owned formatting pass.
- Case helper tests: 3/3; Playwright lists one actual case.
- Scoped strict case checking reports no owned-file errors; five inherited
  `restaurant-delivery.ts` diagnostics remain. This is not a whole-E2E typecheck pass.
- Regression selection RED: 10 pass, two fail; corrected harness: 12/12.
- Screenshot-capture-only correction: 13/13 browser checks, all accepted PNG
  hashes unchanged. Ordinary regression requires no screenshot overwrite.
- Actual `pnpm regression definitions`: all eight steps pass, including the new
  Inventory admission, emitted UI and exact contract suites in existing steps.
- Independent ordinary review closes new P0/P1/P2 0/0/0, verifies all eleven
  data/case hashes, and retains the separately reviewed three root test/lane paths.

The actual case reuses the Directory lifecycle with unchanged defaults. It checks
empty Preview storage, cable receive10/issue3/adjust-1, balance6 and three retained
movements, untouched zero-stock pad, name correction, same-key uncertainty and
API restart replay. A separately labelled third item tests stock-command stale
UI reconciliation and same-version API races, preserving flagship facts. All
measurements, failure phases, fixed bounded database facts, images and exact owned
cleanup must come from the subsequent real run. No runtime has been started by
the writer or reviewer.

## Frozen paths

| Path                                                                         | SHA-256                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/adapters/src/requirements/definitions/product-definitions.v1.json` | `63a909554cb01c3c4af171f97fee66029e3ee5480f5a6299e64abb990744c1ef` |
| `packages/adapters/test/supplies-stockroom-definition.test.ts`               | `afca9c8bf26001e2dbcc9abf82a1007ad19915d696b0e3c5922730e49173de4f` |
| `packages/adapters/test/inventory-operations-definition.test.ts`             | `dd995e982da89161e25d61a8c5d4ebf8f310874d58005bd149043477114b1232` |
| `packages/adapters/test/product-definition-data.test.ts`                     | `a0f1fe7ca2d7cfc75edf044c5913e54e6a1cb79a6ef4896545dfd44b8a1c1e1a` |
| `packages/adapters/test/requirement-interpreter.test.ts`                     | `75fe3daaefe840ad72c4aa667b4c5622cd7c53db9769aeb38e427c97562fd708` |
| `scripts/definition-case-bindings.mjs`                                       | `fa7c94af89f24d7fb9d613bfd7407d34aee85e3c746b7a83b00c052932fa6fdc` |
| `scripts/definition-case-index.test.mjs`                                     | `240c2d5bfadcc16d26184f47b9cbabca39c9ba456fb056bce3ec529cd33b7705` |
| `e2e/inventory-operations.spec.ts`                                           | `982e48c5a0b53cd96705ab91a9adca86c57157d760558707f26f4c53cff50944` |
| `e2e/helpers/inventory-operations.ts`                                        | `c45bad933e1f8411c472730507db593d1e8a7779ce5a6f203ab22e489a7e8c03` |
| `e2e/helpers/inventory-operations.test.ts`                                   | `944797121439ec10abab70aac46273773730de0b40b3a59e40a9bce81ce0a1df` |
| `e2e/helpers/content-directory.ts`                                           | `4fb529a9b6b5d3a7e596719886378dc4a77132481a238b0c6237e7f4b329d072` |
| `scripts/regression.mjs`                                                     | `7243709895793e930d7dd9cf566be14996682e6b1f90458cdeb1516291f5f5fb` |
| `scripts/regression.test.mjs`                                                | `29adb3060ecf9928c762f3f24368af84ebe5275fc0963af9712bb9b60d000163` |
| `packages/compiler/test/inventory-operations-presentation.test.ts`           | `e0c4924d4801820d4445cd071b65cffb2a91f7f0107b966b631f60bfc1d8ec74` |
