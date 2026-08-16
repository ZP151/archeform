---
title: "ADR-0020: Workbench Source Export Route and Diff Surface"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags:
  ["architecture", "control-plane", "workbench", "source", "export", "route"]
supersedes: ""
superseded_by: ""
---

# ADR-0020: Workbench Source Export Route and Diff Surface

## Status and founder gate

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** additively — complete the deferred Task 8 source
breadth surface with one read-only, tenant- and digest-scoped source-export
route plus the Workbench download/diff surface, reusing the already-delivered
compiler `buildSourceZip`/`buildGitExport`/`diffGeneratedFiles`.

**Accepted on 2026-08-14** under the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。`.

PM/controller confirms the condition is met. The slice is bounded, additive,
reversible, read-only, tenant- and digest-scoped, and inside the accepted
Restaurant Task 8 scope. It adds no Graph, Capability, Recipe, schema,
dependency, provider, network, service, credential, Docker, Compose, or
deployment change. No new founder prompt is required.

## Founder Decision Record

- **Decision:** Accepted
- **Date:** 2026-08-14
- **Source:** founder standing instruction
- **Exact response:** `参考以下总结，若符合项目目标，则持续接受而迭代。`
- **PM reconciliation:** The work matches the repository evidence and the
  accepted Restaurant goal: it completes the deferred Task 8 source-export
  surface with one read-only, tenant- and digest-scoped route over the frozen
  compiler functions, with no new dependency, provider, or lifecycle change.
  This response therefore accepts ADR-0020 and authorizes the ordinary in-scope
  source-export slice. It does not authorize Publish, Compilation lifecycle
  change, Access or Workflow authority additions, or any Task 9 action.

## Context

ADR-0019 delivered the compiler core of Task 8 source breadth: deterministic
source manifest, controlled overlay apply, generated-file diff, deterministic
ZIP export, and Graph-first Git export. Its DEC-009 explicitly deferred the
Workbench download/diff surface and its E2E journey to a follow-up slice that
adds a tenant- and digest-scoped read-only source-export route.

The Control Plane already owns `GeneratedArtifactReader` (the digest-verifying
byte authority) and already depends on `@factory/compiler`. The compiler
`buildSourceZip` (browser-portable, stored method) and `buildGitExport`
(Node-only SHA-1/zlib) are delivered and tested but not yet exported from the
compiler facade.

## Decision

- **DEC-001 — Keep** the immutable Compilation artifact manifest and
  `GeneratedArtifactReader` as the byte authority; keep the existing
  `GET /compilations/:id/artifact-content` route; keep the Golden profile.
- **DEC-002 — Migrate additively** the compiler facade to re-export the source
  target functions (`buildSourceManifest`, `applySourceOverlay`,
  `diffGeneratedFiles`, `buildSourceZip`, `buildGitExport`) and their public
  types. No other facade, schema, or target change.
- **DEC-003 — Migrate additively** one read-only Control Plane route,
  `GET /compilations/:id/source-archive?format=zip|git`, that reads every
  registered artifact of a succeeded Compilation through
  `GeneratedArtifactReader`, rehashes each byte string, builds the requested
  archive with the compiler function, and returns it as
  `application/zip` or `application/octet-stream` (git object bytes) with a
  fixed safe filename. The route is tenant-scoped to the Compilation's
  workspace, digest-bound, read-only, records no request body, and returns one
  fixed redacted error on any failure.
- **DEC-004 — Migrate additively** the Workbench Source surface: a
  "Download source ZIP" and "Download source Git export" action for the current
  succeeded Compilation, and a bounded generated-file diff view driven by
  `diffGeneratedFiles` between two admitted Compilation manifest snapshots.
  Export responses are admitted through the existing strict own-data rules; no
  Draft source projection or Compilation creation is added.
- **DEC-005 — Reject** a mutable route, a new provider/network/service/Docker/
  Compose/deployment change, a Graph/Capability/Recipe/schema change, a new
  dependency, and any export of credentials, raw prompts, raw responses, or
  files outside the registered manifest.

## Security boundary

- The export re-reads and rehashes every registered artifact byte string before
  serialization; an altered volume fails closed.
- The route is tenant- and digest-scoped and never accepts a caller path beyond
  the immutable artifact manifest.
- ZIP/Git serialization reuses the delivered path/digest/serialization guards;
  package/configuration/entry/credential/raw-model exclusion is enforced at
  this admission layer for the export response.
- No request body, artifact content, secret, or hostile material is logged or
  echoed.

## API, data, adapter, and operability effects

- **API-001**: One additive read-only route; the existing artifact route and
  all Graph/Capability/Recipe contracts are unchanged.
- **ADP-001**: No new adapter, provider, or remote authority. Git serialization
  remains a local deterministic object writer.
- **DAT-001**: No durable migration. Exports are derived, non-persisted
  artifacts; no stored record changes.
- **LIC-001**: No dependency, copied source, or supply-chain coordinate change.
- **OPS-001**: No service, queue, Docker, Compose, or deployment step.

## Alternatives considered

1. **Control Plane builds the archive from registered artifacts — selected.**
   It reuses the existing byte authority and compiler dependency with one
   additive route.
2. **Client-side ZIP/Git — rejected.** Git needs Node crypto, and whole-tree
   client fetching duplicates the digest authority in the browser.
3. **Compiler worker emits a prebuilt archive artifact — rejected.** It widens
   the queue/worker contract and stores derived bytes; on-demand derivation is
   cheaper and stays digest-bound to the immutable source.
4. **Skip until Task 9 — rejected.** Task 9 acceptance requires ZIP/Git export
   and source-lookup evidence, so the route must land first.

## Migration, rollback, and abort conditions

- **MIG-001**: Additive only. Existing source explorer/search/transfer behavior
  is unchanged.
- **ROL-001**: Rollback is removal of the route, the facade re-exports, and the
  Workbench buttons/diff surface. No stored record changes.
- **ABT-001**: Stop if a Graph/Capability/Recipe/schema/identifier must change,
  if a dependency/lockfile change becomes necessary, or if a new
  provider/network/service/Docker/Compose/deployment action is needed.
- **ABT-002**: Stop if the route can escape tenant/digest scoping, mutate
  state, leak a secret or raw-model material, or return non-deterministic
  bytes.
- **IRR-001**: No irreversible step is authorized. Commit, push, Publish,
  release, and deployment remain separate gated actions.

## Verification and evidence

- Focused TDD RED/GREEN across the compiler facade re-exports, the Control Plane
  route/service, and the Workbench download/diff surface.
- Full Compiler, Control Plane, and Workbench suites; no-emit and build gates;
  direct Prettier and `git diff --check`.
- Adversarial matrix: cross-tenant access, altered-artifact rehash failure,
  invalid/unknown `format`, missing Compilation, path traversal, and
  secret/raw-model exclusion.
- Determinism: byte-identical ZIP and Git output for equal input; ZIP round-trip
  re-read; Git object `fsck` verification.
- One independent Sol review. Terra and a separate final Sol release review are
  not required unless review finds a stable-boundary/security P0/P1 or the
  repair changes this contract.
- Evidence is recorded in the active PM ledger and `docs/project-status.md`.

## Implementation and delivery authority

The exact implementation manifest (compiler facade re-export, the Control Plane
route/service, the Workbench download/diff surface, tests, and the
`e2e/restaurant-source-export.spec.ts` acceptance) is frozen in the Task 8
source-export design and executable plan. One Sol writer owns the paths;
parallel writers are not authorized because the route and facade are shared
integration contracts.

Only the controller may stage the frozen paths, commit the accepted slice with a
single bounded subject, push without force, and prove local `HEAD` equals
upstream with a clean tree. This ADR does not authorize implementation before
founder acceptance.

## References

- `docs/tech-governance.md`
- `docs/threat-model.md`
- `docs/adr/adr-0019-workbench-source-diff-export-overlay.md`
- `docs/adr/adr-0017-workbench-source-explorer.md`
- `apps/control-plane/src/artifact-content.ts`
- `packages/compiler/src/targets/source/export-zip.ts`
- `packages/compiler/src/targets/source/export-git.ts`
- `packages/compiler/src/targets/source/diff.ts`
