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

## Remaining route

The next tooling slice can add the already-planned cheap emitted-control and
complete-workspace checks before image construction. Build-context/cache
changes remain a separate operability decision and must measure cold and warm
stages independently. Definition counts, accepted journeys and ordinary-user
effort remain separate metrics.
