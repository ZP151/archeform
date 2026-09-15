---
title: "ADR-0043: Compile-Time Lucide Icons for Generated Customer UI"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags: ["architecture", "decision", "compiler", "icons", "supply-chain"]
supersedes: ""
superseded_by: ""
---

# ADR-0043: Compile-Time Lucide Icons for Generated Customer UI

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This proposal grants no implementation, Product Publish, repository release,
provider, cloud, or deployment authority. Founder acceptance, directly or
through the standing independent-review policy in `docs/tech-governance.md`,
and a PM-recorded assignment must precede implementation.

## Recommendation

**Migrate** the compiler asset dependency profile by adding exact published
`lucide-static` `0.468.0` to `@factory/compiler`. Read a fixed internal allowlist
of its local SVG files during compilation and embed those SVG strings into the
existing generated customer application. Generated applications retain visible
navigation, status, and detail labels; compact Refresh keeps the accessible name
and title `Refresh status` with a 48 px target. Do not add photos, a CDN, a
generated runtime dependency, a registry asset, or user-selectable icon paths.

## Context and Current Accepted Profile

- **CUR-001**: The accepted Golden profile is the exact runtime/dependency table
  in `docs/tech-governance.md`, including Node.js `>=22.11.0 <23`, pnpm `9.0.0`,
  and TypeScript `^5.7.2` locked `5.9.3`. ADR-0042 keeps the generated Restaurant
  bundle dependency-free at runtime and uses text-only customer navigation.
- **CUR-002**: `lucide-react ^0.468.0`, locked `0.468.0`, is already accepted in
  Workbench and `@factory/ui-primitives`; it is not a compiler dependency and its
  React components cannot be imported by the dependency-free generated runtime.
- **CUR-003**: Existing `data-lucide` registry placeholders require a separate
  browser renderer that generated apps do not load. The native-anchor customer
  navigation also cannot reuse the registry's button/tab pattern without
  changing interaction semantics. This is the documented reuse gap.
- **CUR-004**: The lifecycle remains mutable Draft -> immutable Published Graph
  -> immutable Compilation. Existing Published Graphs and Compilations are never
  rewritten. Stable identifiers remain `factory.application-graph/v3`,
  `factory.restaurant-product-bundle/v1`, and runtime schema `1`.

## Proposed Compiler Asset Profile

- **PRO-001**: Add `"lucide-static": "0.468.0"` to
  `packages/compiler/package.json` and its exact pnpm lock entry. The npm package
  is ISC licensed, has zero dependencies, reports unpacked size `30,957,951`
  bytes, shasum `f4e5525123fff588decd8e1aa10856842b107b78`, and integrity
  `sha512-JvpWui2umxRyEVMoETfMzb+qKqibV/sdoqJbKmW1JLdkuhXluJKoO6NqCbvCK/vAbUuH5bTEFD4T6uECsrNcnA==`.
  It is build-time input only and adds no generated `package.json` dependency.
- **PRO-002**: A private compiler helper resolves the installed package from
  `import.meta.url`, reads only these exact paths, and exposes an internal frozen
  key union: `house`, `utensils-crossed`, `shopping-bag`, `receipt-text`,
  `user-round`, `refresh-cw`, `arrow-right`, `arrow-left`, `chef-hat`,
  `circle-check`, `circle-x`, `clock`, and `circle-help`. No Graph, prompt,
  provider result, runtime request, or other untrusted value selects a path.
- **PRO-003**: The helper verifies the exact recorded SHA-256 for every selected
  SVG, rejects missing or changed inputs, and emits deterministic inline markup.
  It does not implement a general SVG parser. The pinned source receives only
  fixed accessibility attributes: decorative SVGs use `aria-hidden="true"` and
  `focusable="false"`; surrounding text or control semantics own the name.
- **PRO-004**: Use icons with the existing customer native navigation, truthful
  known order-state presentation, Refresh control, detail/back links, and empty
  state. Unknown status keeps `Status unavailable` and cannot receive a success
  icon. No icon introduces an action or state absent from authoritative data.
- **PRO-005**: Add `packages/compiler/THIRD_PARTY_NOTICES.md` with package,
  version, official repository, npm integrity, selected file paths/hashes,
  license hash
  `1e7290b35280a048667bbf0ebabac1c7fd52a75300e8b2946ac165715997f2bc`,
  and the retained ISC/Feather attribution. Each newly generated customer-only
  and dual-surface bundle includes root `THIRD_PARTY_NOTICES.md` containing the
  installed license text. No reference-repository source is copied.

## Contracts, Ownership, and Impact

- **CON-001**: The Restaurant V3 compiler-target owner owns the private icon
  adapter. Frozen implementation paths are new
  `packages/compiler/src/targets/restaurant-v3/customer-icons.ts`, new
  `packages/compiler/test/restaurant-customer-icons.test.ts`, customer/product
  targets and their two existing focused tests, compiler `package.json`,
  `pnpm-lock.yaml`, and `packages/compiler/THIRD_PARTY_NOTICES.md`. Root owns
  `e2e/restaurant-orders.spec.ts`, PM documents, and any post-acceptance concise
  coordinate record in `docs/tech-governance.md`.
- **CON-002**: Generated templates and E2E remain serialized integration work;
  the contract is not frozen for parallel frontend/backend writers. Existing
  customer HTML/CSS and server-embedded CSS may change, and the generated notice
  file is additive. Merchant source, shared registry/recipe source and digests,
  Graph/API/state/seed/runtime behavior, routes, identifiers, and manifests
  remain unchanged.
- **IMP-001**: Catalog and adapter impact is zero outside the private compiler
  helper: no registry key, port, capability, recipe, Graph adapter, public API,
  or data migration is added.
- **IMP-002**: License and supply-chain impact is one exact package, its lockfile
  entry, a local provenance record, and license distribution in generated
  bundles. The cost is approximately 31 MB unpacked in development/compiler
  installation, while emitted output contains only 13 selected SVG strings.
- **IMP-003**: Security and operability boundaries are unchanged. Icons make no
  request, execute no script, receive no credentials, and add no browser/runtime
  package, process, port, cache, provider, Compose service, or cleanup duty.

## Alternatives Considered

- **ALT-001 — Keep text-only output**: rejected by the founder's explicit
  product feedback that the generated app should use icons or imagery.
- **ALT-002 — Use `lucide-react` at runtime**: rejected because it would add
  React and rendering dependencies to the dependency-free generated product.
- **ALT-003 — Hand-author or copy SVGs**: rejected because it duplicates the
  accepted Lucide family and creates avoidable provenance and maintenance work.
- **ALT-004 — Load a CDN, remote font/icon kit, photos, or emoji**: rejected due
  to external availability/privacy risk or inconsistent rendering. No truthful
  restaurant photo source exists in this slice, so imagery remains deferred.

## Migration, Rollback, and Abort

- **MIG-001**: After acceptance, add the exact dependency/lock/notice and focused
  helper RED/GREEN before customer template integration. Apply icons only to new
  Compilations and retain all text/accessibility semantics.
- **ROL-001**: Revert the frozen source, manifest, lock, notice, tests, and E2E
  assertions. No Graph, API, data, runtime, Compose, or cloud rollback exists;
  prior immutable Compilations remain unchanged.
- **ABT-001**: Abort on a version/integrity/license/hash mismatch, unsafe SVG,
  dynamic path selection, missing generated notice, new transitive dependency,
  registry/shared-source drift, generated runtime import, external request,
  business-contract change, mutable Draft compilation, or merchant change.
- **ABT-002**: There are no irreversible steps. Dependency acceptance is not a
  release or deployment decision.

## Consequences

- **POS-001**: The customer UI gains a coherent visual vocabulary from the same
  Lucide version family already used by Archeform, without a runtime loader.
- **POS-002**: Fixed local inputs and hashes keep generation deterministic and
  prevent untrusted icon/path selection.
- **NEG-001**: Compiler installs grow by about 31 MB and now depend on one more
  supply-chain artifact whose version, hashes, and license must be maintained.
- **NEG-002**: The target-local icon mapping must stay synchronized with the
  generated customer semantics; it is not a reusable catalog asset.

## Measurable Verification

- **VER-001**: Focused tests verify exact package version/integrity, license and
  selected-file hashes, unsafe/missing input refusal, frozen-key refusal,
  deterministic markup, accessible SVG attributes, generated notice text, and
  absence of `lucide-static` from generated manifests/imports.
- **VER-002**: Customer/product target tests prove deterministic bundles, exact
  icon/label/status mapping, unknown-status refusal, additive notice files, and
  no merchant/shared/API/state/seed/runtime behavior drift.
- **VER-003**: Run compiler tests, typecheck, lint, build,
  `pnpm verify:third-party`, `pnpm verify:source-studies`, and
  `node scripts/regression.mjs product`; record exact results in the active PM
  ledger.
- **VER-004**: Run `e2e/restaurant-orders.spec.ts` with one worker and zero
  retries. At 320/390/768/1440 px require visible text labels, correct known and
  unavailable states, keyboard Refresh, 48 px target, decorative SVG semantics,
  zero external asset requests/page errors, zero WCAG A/AA axe violations, no
  overflow, screenshot inspection, and exact temporary cleanup.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`,
  ADR-0010, ADR-0041, and ADR-0042.
- **REF-002**: `packages/ui-primitives/package.json`,
  `packages/ui-patterns/src/index.ts`, and the Restaurant V3 compiler target.
- **REF-003**: <https://www.npmjs.com/package/lucide-static/v/0.468.0>,
  <https://lucide.dev/guide/packages/lucide-static>, and
  <https://github.com/lucide-icons/lucide>.
- **REF-004**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
