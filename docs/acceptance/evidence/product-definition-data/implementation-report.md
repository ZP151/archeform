# Definition data implementation report

Status: implementation complete; source frozen for independent task review, QA,
and final release judgment. Root owns acceptance and all Git/runtime actions.

## Files and responsibility

Only the adapters paths authorized by the plan were changed:

- Added `src/requirements/product-definition-data.ts`: strict V1 envelope and
  entry parsing, bounded fixed loader, raw duplicate-member guard, immutable
  parsed catalogue, exact checked-in membership, and bounded batch reports.
- Added `src/requirements/definition-family-registry.ts`: three fixed family
  contracts, generated provider selection schemas, family guide schemas,
  semantic validation/fingerprints, execution expectation checks, and one
  generic data projector.
- Added `src/requirements/definitions/product-definitions.v1.json`: exactly the
  four canonical Requirement/Blueprint structures, complete existing guides and
  static instructions, structured primary jobs and correction/failure cases,
  fixed execution expectations and first-party provenance.
- Added `src/requirements/definition-batch-cli.ts`: default fixed shipped input
  and explicit bounded stdin; no candidate path interface or file writes.
- Refactored `definition-selection-catalogue.ts`, all four definition-selection
  modules, and `approval-definition-template.ts`. The four modules retain
  compatibility names only; canonical descriptors and per-definition
  executable projection branches were removed.
- Added `scripts/copy-product-definition-data.mjs`; changed only package build
  and validation commands in `package.json`. No dependency/export changes.
- Added `test/product-definition-data.test.ts` with 26 focused cases.
- No interpreter source edit, compiler source edit, extra helper split, service,
  stage, commit, push, public export, dependency, lockfile or runtime change.

## Test-first evidence

Initial `pnpm --filter @factory/adapters exec vitest run
 test/product-definition-data.test.ts` failed because the new data module was
absent. Once executable, the same suite had seven behavior failures against
incomplete family validation; final initial slice passed 15/15.

Additional focused red checks caught structured guide permission drift before
its fix (1 failure / 22 passing), unresolved guide journey actor references
before its fix (1 failure / 23 skipped), and unpaired escaped Unicode surrogates
before their fix (2 failures / 24 skipped). The final focused suite passes
26/26. The raw guard now decodes JSON string escapes itself; its only
`JSON.parse` call occurs after the complete bounded document passes lexical,
depth, decoded-key uniqueness, finite-number and Unicode validation.

Existing interpreter regression initially exposed canonical Restaurant source
drift no longer checked on every projection. The fixed family authority check
was restored in generic projection; all 148 existing interpreter cases passed,
including authority/recipe drift, strict selection, fallback and menu behavior.

## Verification

- `pnpm --filter @factory/adapters test`: 12 files / 218 tests passed before
  the final three narrowly scoped guard cases were added. This includes all
  148 interpreter tests, browser entries, parameter and adapter contracts.
- Final `pnpm --filter @factory/adapters exec vitest run
test/product-definition-data.test.ts`: 26/26 passed after both guard fixes.
  No broad-suite repeat was required for these validation-only refinements.
- Final adapters `build`, `typecheck`, and `lint`: all exit 0.
- `pnpm --filter @factory/compiler exec vitest run
test/definition-data-compatibility.test.ts test/task-compatibility.test.ts
test/task-correction-compatibility.test.ts`: 3 files / 3 tests passed.
- Immutable baseline SHA-256 remains
  `585efce4cf6383abdf323ba8d9de1d2f9b928f254a9cdb907e83698d2c3b28ea`.
- Root independently reported the data-only Approval authoring compiler test
  passed: equipmentCode reached Prisma and emitted UI, correction runtime
  remained, and Published input/catalogue were unchanged.
- Final built CLI run twice and exact source bytes via stdin: all exit 0,
  exact counts 4/4/4/4, equal reports after removing durationMs, empty stderr.
- Final built invalid-surrogate stdin exits 1 with only
  `definition.invalid-json` in its bounded report and empty stderr.
- The focused suite additionally exercises actual built CLI malformed and
  escaped-duplicate JSON, fatal UTF-8, oversize stdin, unknown non-echoing args,
  fixed source/dist byte equality, exact trusted membership, semantic/key
  colliders, family coordinates, field/permission/state/lock/checksum drift,
  correction/failure presence, alias normalization, case-key/order exclusion,
  and ordered field/step significance.

## Behavior and compatibility

All four exported catalogue structures, JSON schemas, guides, complete static
instructions, supported/clarification projections and complete ordered generated
bundles remain exact. Candidate validation never registers a definition or
changes the runtime catalogue. Cosmetic aliases reject every fingerprint
collider; duplicate definition keys reject every colliding member. A validated
Approval typed-field variant proves actual data-driven projection and receives
zero catalogue admissions. The current runtime definition count remains four;
new runtime families and new distinct admissions are both zero.

Restaurant planning projection and executed V3 authority are deliberately
separate existing paths. The immutable adapter compatibility helper captures
its historical generic Requirement planning output. DAT-007 execution claims
correctly describe the actual existing Restaurant profile's 20 locks. The fixed
registry composes the existing Restaurant V3 authority and verifies its two
surfaces, 15 pages, seven journeys, 99 field authorities, 135 binding policies,
full role/permission/flow/journey authority and fixed lock identities/digests.
The historic compatibility suite additionally preserves the actual V3 bundle.
Approval and Task retain six exact locks and all six derived binding contracts,
fixed page/entity counts and transition effects.

The loader's original literal `new URL` was rewritten by Webpack into an asset
URL and failed Workbench/JSDOM integration. The final fixed loader uses Node
`dirname(fileURLToPath(import.meta.url))` plus fixed literal path segments and
bounded open/read/close. It reads at most 2 MiB plus one sentinel before fatal
UTF-8 decoding; stdin has the same bound. Root owns the Workbench rebuild and
route/consumer regression evidence on this final source.

## Self-review and remaining limitations

No material unresolved implementation blocker remains. Independent review and
QA still own the acceptance verdict. Root must record the final Workbench
integration result; this report does not infer it from the adapters build.

Approval variants are limited to currently supported typed business fields;
references and changed grants/states/identity/integrations fail. Task's exact
five-field contract and Restaurant's fixed authority remain narrow. The batch
validator is an authoring boundary and family-gap detector, not evidence of new
runtime products, a 30-entry catalogue, or ordinary-user/model accuracy.
Provider guidance remains reviewed first-party business text; structured guide
semantics are checked, but free prose is not interpreted by a model or treated
as executable authority. Existing unchanged UI/runtime evidence can be reused
only through the established exact compatibility proof and root acceptance.
