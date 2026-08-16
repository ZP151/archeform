---
title: "ADR-0012: Curated Template Draft Preview Lifecycle"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "templates", "draft", "preview", "workbench"]
supersedes: ""
superseded_by: ""
---

# ADR-0012: Curated Template Draft Preview Lifecycle

## Status

**Accepted.** The founder instructed Archeform to keep accepting and iterating
when the work matches the stated product goal, verbatim:
`参考以下总结，若符合项目目标，则持续接受而迭代。` The referenced direction
explicitly requires template cloning into an independent Draft, immediate
editing, and immutable Draft Preview Snapshot revisions. This decision stays
inside that direction and authorizes only the bounded Task 6B slice below.

## Recommendation

- **Keep** the accepted Node/React/NestJS/Prisma/PostgreSQL runtime, Application
  Graph V1/V2/V3, Product Recipe V1/V2, compiler targets, and immutable
  Draft -> Published -> Compilation lifecycle.
- **Migrate additively** by adding one curated-template API and two nullable
  lifecycle persistence records: template origin on an Application aggregate
  and append-only digest-bound Draft Preview Snapshot V2 records.
- **Reject** Graph changes, template marketplaces, remote template intake,
  auto-update/merge, secret copying, Preview-to-Publish promotion, mutable
  snapshots, and a Draft-to-Compilation shortcut.

## Context

Task 6A delivered the visible Workspace Home and Builder contexts, but Home has
only the Describe path. The accepted Restaurant Product Recipe V2, deterministic
Application Graph V3, dual-surface compiler target, and Snapshot V2 renderer
already exist. The remaining gap is lifecycle integration: a curated product
must become an independently identified Draft and a preview must bind the exact
Draft revision and Graph checksum.

The existing `ApplicationGraph` and append-only `DraftRevision` records can
store a V3 Draft without changing the Graph contract. Existing V1 lifecycle
methods remain V1-only; Task 6B uses a separate template service so it cannot
silently widen legacy parsing, Publish, export, proposal, or Compilation paths.

## Decision

### Curated catalog

Task 6B exposes exactly one first-party template:

```ts
type CuratedTemplateV1 = {
  apiVersion: "factory.curated-template/v1";
  key: "restaurant-dual-surface";
  version: "1.0.0";
  name: "Maison Aurelia";
  description: string;
  surfaces: readonly ["customer-mobile", "merchant-desktop"];
  graphChecksum: `sha256:${string}`;
};
```

The template is assembled deterministically from the delivered Restaurant
Product Recipe and capability composition. No provider, network, external
source, executable upload, or caller-selected package participates.

### Clone and edit API

```ts
type TemplateDraftInstanceV1 = {
  apiVersion: "factory.template-draft-instance/v1";
  template: CuratedTemplateV1;
  origin: {
    templateKey: "restaurant-dual-surface";
    templateVersion: "1.0.0";
    templateGraphChecksum: `sha256:${string}`;
  };
  draft: {
    applicationGraphId: string;
    applicationKey: string;
    draftRevisionId: string;
    revisionNumber: number;
    graph: ApplicationGraphV3;
  };
  snapshot: DraftPreviewSnapshotV2;
  previews: readonly RestaurantDraftPreviewSurfaceDocumentV2[];
};
```

The additive endpoints are:

- `GET /workspaces/local/curated-templates`;
- `POST /workspaces/local/curated-templates/:templateKey/instances` with exact
  `{ requestId, name? }`;
- `GET /workspaces/local/template-draft-instances/:applicationKey` to resume a
  previously cloned template Draft through the V3-specific boundary;
- `POST /template-draft-instances/:applicationGraphId/revisions` with exact
  `{ baseDraftRevisionId, name }`.

`requestId` is the independent application key and idempotency identity. A
replay succeeds only when template origin and requested name match. An edit
requires the current Draft revision id, changes only Graph metadata name in
this slice, appends the next Draft revision, and creates a new Snapshot. It
never updates an existing Draft or Snapshot.

Local application summaries expose only nullable `{ templateKey,
templateVersion }` origin classification so Workbench can select the correct
open boundary. They never expose the template checksum, Graph, Snapshot, or
provider material.

### Persistence

- `ApplicationGraph.templateOrigin` is nullable JSON. When present it is the
  exact `{ templateKey, templateVersion, templateGraphChecksum }` record.
- `DraftPreviewSnapshot` stores an append-only versioned Snapshot JSON record
  and relates through the existing same-application composite Draft identity.
  A Draft may have multiple preview snapshots; an unexpired active snapshot may
  be selected again, while a later preview appends a new record.
- Historic applications have null origin and no snapshots. No backfill is
  required.

### Preview boundary

The server constructs `DraftPreviewSnapshotV2`, validates its checksum, moves
it through ready -> rendering -> active, renders both surfaces with the
existing Restaurant V3 preview renderer while rendering, then stores the
active snapshot. Snapshot ids, Draft ids, Graph checksum, expiry, and surface
projection are server-derived. Browser input grants no lifecycle authority.

Preview documents are memory/response material only. They cannot be exported,
deployed, published, or compiled. Publish remains a separate future V3
lifecycle slice and production Compilation continues to require a distinct
immutable Published revision.

## Security and privacy

- The template registry is a fixed allowlist and unknown keys fail without
  reflecting arbitrary material.
- Clone and edit inputs are strict, bounded plain data. Caller ids and names are
  validated before persistence; stale edits fail with a conflict.
- Graph V3 and Snapshot V2 are re-asserted at every store/response boundary.
- Template origin contains no credentials, provider accounts, raw prompts,
  model responses, generated source, or environment material.
- A clone never receives later template changes automatically.

## Alternatives rejected

- **UI-only template cards:** rejected because they do not create a real Draft.
- **Put origin in Graph metadata:** rejected because it changes a stable Graph
  contract and leaks platform lineage into product truth.
- **Relax the V1 lifecycle parser to a version union:** rejected for this slice
  because legacy proposal/export/Publish paths are V1-specific.
- **Persist rendered source or preview documents:** rejected because the exact
  Graph + Snapshot can reproduce projection and preview is non-exportable.
- **Add a marketplace or arbitrary template upload:** rejected as a separate
  supply-chain and tenancy boundary.

## Migration, rollback, and abort conditions

The migration adds nullable origin data and a new snapshot table. Rollback
removes only Task 6B routes/UI and, before any production data exists, the new
table/column. Existing Draft and Published rows remain unchanged. Abort if the
implementation needs a Graph change, external dependency, provider/network
call, V3-to-V1 conversion, mutable snapshot, or Draft Compilation path.

## Verification

- Control Plane tests prove allowlisting, deterministic checksum, idempotent
  clone, independent identities, stale-edit rejection, append-only Drafts and
  Snapshots, no secret fields, and preview-only behavior.
- Workbench tests prove equal Describe/Template entry, cloning progress/error,
  dual-surface preview, origin/version display, title edit, and revision/
  Snapshot replacement.
- Existing Graph, Capabilities, Compiler, Control Plane, and Workbench suites,
  typechecks, builds, browser smoke, formatting, and diff checks remain green.
