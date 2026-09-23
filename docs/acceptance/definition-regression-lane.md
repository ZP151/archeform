# Definition regression lane acceptance

Date: 2026-09-22
Status: accepted as a provider-free tooling slice on the consumer-delivery branch

This slice reduces the effort of admitting another reviewed definition. One
command now builds the required adapter/compiler dependency closures, validates
the checked-in catalogue with the independent CLI, checks a derived case index,
and runs the focused adapter and protected compiler compatibility suites. It
does not publish a Graph, compile an application, start a provider, or promote
a product to accepted status.

## Delivered behavior

- `node scripts/regression.mjs definitions` executes six fixed steps and stops
  on the first nonzero or uncertain child result.
- Provider variables are removed from every child environment. The lane does
  not start a provider or a Preview runtime.
- `scripts/definition-case-bindings.mjs` is the single checked-in routing
  manifest for the current eight catalogue definitions and their executable
  case/evidence paths.
- `scripts/definition-case-index.mjs --check` derives
  `factory.product-definition-case-index/v1` with `authoritative: false` and
  requires exactly one registered, unique, existing case and evidence path per
  catalogue entry. It cannot register or accept a definition.
- The existing definition CLI now consumes the same current/protected key
  manifest. Historical output fixtures remain independent and are not
  regenerated.

## Verification

The focused RED test was observed before implementation: the new index module
was missing and `definitions --dry-run` was rejected. After implementation:

```text
node --test scripts/definition-case-index.test.mjs scripts/regression.test.mjs
14 passed, 0 failed
```

The index command reports eight catalogue entries and eight unique case
bindings. Its tests cover missing, unregistered and duplicate bindings.

The first real lane attempt stopped at the compatibility step because the
initial build plan did not include the compiler dependency closure. The build
plan was corrected to include both adapter and compiler closures, and the
repeat passed all six steps:

```text
node scripts/regression.mjs definitions
definition-build 0
definition-tool-tests 0
definition-validation 0
definition-case-index 0
definition-adapter-tests 0
definition-compatibility-tests 0
```

The successful run used the pinned workspace lockfile and the existing shared
Turbo cache. It is a provider-free local observation, not a cold-build or
ordinary-user performance claim. The full runtime business and visual
acceptance cases remain the authority for product completeness.

## Emitted-control continuation — 2026-09-24

The current lane has eight fixed steps. After the cheap adapter checks, it runs
the existing `@factory/control-plane prisma:generate` command, then the existing
compiler `approval-numeric-domain.test.ts` and `approval-calculated-total.test.ts`
suites before protected compatibility. The added cases cover emitted numeric
controls, read-only totals, invalid-input no-write behavior and complete-workspace
browser density with realistic records/roles. This reuses existing tests and
changes no generated output or dependency.

The first direct emitted run passed 95 of 97 cases and exposed two setup failures:
the clean worktree lacked a generated Prisma client. The lane now prepares that
client itself, without connecting to or migrating a database. Focused RED was
observed before adding the setup step; script tests subsequently pass 12/12 and
the real emitted suites pass 97/97. The engineer recorded 48.18 seconds for that
direct test run; it is not an end-to-end lane benchmark.

Root's complete `pnpm regression definitions` run passes all eight steps:

```text
definition-build 0
definition-tool-tests 0
definition-validation 0
definition-case-index 0
definition-adapter-tests 0
definition-prisma-generate 0
definition-emitted-control-tests 0
definition-compatibility-tests 0
```

Independent read-only `/root/directory_decision_review` approves the two-file
tooling change with P0/P1/P2 0/0/0. Generation and emitted-test failures stop the
lane; Windows dispatch and provider-variable stripping remain covered. The
ordinary tooling scope is accepted locally. Actual product acceptance and
new-family visual review remain separate, applicable outcomes.

Build-context/cache work and three comparable warm-lane timing samples remain
open. No cold/warm speedup or two-minute lane guarantee is claimed. New-family
representative emitted cases must join the lane when implemented; the Approval
tests do not establish Directory, Inventory or hosted-product acceptance.
