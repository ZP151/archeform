---
title: "ADR-0017: Workbench Source Explorer"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "workbench", "source", "compilation", "artifacts"]
supersedes: ""
superseded_by: ""
---

# ADR-0017: Workbench Source Explorer

## Status and founder gate

**Accepted on 2026-08-14** under the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。`

PM/controller confirms the condition is met. Task 8A is bounded, additive,
reversible, read-only, and directly advances the accepted promise that generated
source is visible without pretending a Draft Preview Snapshot is source. It
reuses one succeeded immutable Compilation, its registered artifact manifest,
and the existing server-side digest-verifying content endpoint. It changes no
Graph, Capability, recipe, compiler, generated runtime, lifecycle, database,
dependency, provider, network, service, or deployment contract. No new founder
prompt is required.

Task 7D Experience is delivered at
`35da63df867dc0271254b1cbad38e5613a27c348`. Access and Workflow follow-ups
remain blocked at design because Graph-valid authority additions are not
enforced by the current Restaurant compiler/runtime and must not be presented
as product behavior.

## Decision

- **Keep** the accepted Golden profile and immutable Draft -> Published Graph
  -> Compilation lifecycle.
- **Keep** the existing read-only routes:
  `GET /compilations/:compilationId` and
  `GET /compilations/:compilationId/artifact-content?path=...`.
- **Migrate additively** only the Workbench Code surface into a Source explorer
  for the current succeeded Compilation. Render the complete registered
  artifact list ordered by path, including path, media type, optional byte size,
  and digest.
- **Require** strict client admission of artifact content against the exact
  selected manifest descriptor. The response has exactly the own enumerable
  data properties `{path,digest,content}`; path and digest must equal the
  selection. The existing server endpoint rereads and SHA-256 verifies the
  registered bytes before responding.
- **Clear** accepted content when a selection starts. Pending shows only the
  selected path; failure shows no unverified content; a late response for an
  older selection cannot replace the current selection.
- **Isolate** Source failures in dedicated `artifactError` state. Selection and
  Compilation invalidation clear it; only the current request token may set the
  fixed artifact failure. Unrelated Workbench operation failures cannot hide
  admitted source content.
- **Reject** a new Control Plane route, Draft source projection, client-side
  filesystem authority, source mutation, reverse parsing, or export behavior.

## Exact visible outcome

```text
Builder -> Code -> Source
```

Only a succeeded immutable Compilation exposes Source. The user sees the full
registered artifact tree in path order, selects one file, and sees its content
only after strict descriptor binding and successful server rehash. A pending or
failed selection never displays prior content as if it belonged to the new
path.

## Authority and security

The Compilation artifact rows are the tree authority. The selected row's path
and digest are the request and response-binding authority. The existing
`GeneratedArtifactReader` remains the byte authority: it requires a safe root,
a safe relative registered path, a SHA-256 digest, root containment, and at most
1,000,000 bytes, then hashes the reread bytes before returning content.

The Workbench parser must not invoke response accessors or conversion hooks,
must reject extra, inherited, symbol, non-enumerable, or accessor properties,
and must return only a fresh frozen primitive copy. Rejections use one fixed
message and never log or echo path, digest, content, or hostile material.

## Compatibility and rollback

This decision adds no endpoint and changes no stored record. Removing the
Workbench explorer restores the prior Code facts surface without migration.
The existing Activity sheet may continue showing compilation evidence, but it
does not own Task 8A's Source state or rendering contract.

## Explicit deferrals

Search, diff, editing, Source Overlay, ZIP, Git, export, Draft Preview Snapshot
inspection, current-Draft source claims, Publish, Compilation creation,
generated-runtime changes, Graph/Capabilities/recipes/Compiler, Prisma or
database work, dependencies/lockfiles, providers, network/services, Docker,
Compose, deployment, and Access/Workflow authority changes are deferred.

## Implementation and delivery authority

Implementation is limited to the exact nine Workbench paths frozen in the
[design](../superpowers/specs/2026-08-14-workbench-source-explorer-design.md)
and [plan](../superpowers/plans/2026-08-14-workbench-source-explorer.md). Any
tenth implementation path is a PM stop. The ninth path is only the existing
Workbench shell test whose malformed `sha256:journey` mock must become a valid
64-lowercase-hex digest; it authorizes no production or contract change.

One writer uses focused TDD. One independent review and targeted real-browser
QA must pass. Because strict response admission is the load-bearing trust
boundary, one fresh final Sol review must return acceptance with no actionable
P0/P1 before PM/controller delivery. Only the controller may stage the exact
nine implementation plus six governance paths, commit
`feat(workbench): add governed source explorer`, push without force, and prove
local `HEAD` equals upstream with a clean tree.

The repaired-tree independent re-review is clean, targeted Terra returns
`PASS`, and final Sol after the P2 characterization returns `RELEASE_ACCEPT`,
actionable P0/P1/P2=0/0/0. Stale failure plus valid success A/B coverage proves
only the current token controls artifact error and admitted content. PM records
`PM_DELIVERY_AUTHORITY YES` for only the exact 15 paths and frozen subject; the
slice is accepted, not delivered.
