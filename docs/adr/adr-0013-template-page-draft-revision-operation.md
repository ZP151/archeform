---
title: "ADR-0013: Template Page Draft Revision Operation"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "templates", "draft", "page-editor", "preview"]
supersedes: ""
superseded_by: ""
---

# ADR-0013: Template Page Draft Revision Operation

## Status and decision gate

**Accepted on 2026-08-14.** The PM/controller confirmed that this bounded,
reversible Page-title slice directly advances the already accepted Restaurant
product goal without expanding Graph, Product Recipe, Compilation, provider,
dependency, or production-deployment boundaries.

### Founder standing instruction

The founder instructed Archeform to continue accepting and iterating when work
matches the stated product goal, verbatim:
`参考以下总结，若符合项目目标，则持续接受而迭代。` The PM/controller adjudicated
that instruction as sufficient acceptance for this slice because it is the
next smallest visible edit already named in the accepted Restaurant execution
order, is append-only and locally reversible, and introduces no new external
authority. This acceptance does not authorize later Puck, Data, Users,
Workflow, Experience, Publish, Compilation, Source, export, provider, service,
or deployment work.

## Recommendation

- **Keep** the accepted Node.js 22, React 19, Next.js 15, NestJS 10, Prisma 6,
  and PostgreSQL 16 profile; the existing Application Graph V1/V2/V3,
  Product Recipe V1/V2, and Draft Preview Snapshot V2 contracts; and the
  mutable Draft -> immutable Published revision -> immutable Compilation
  lifecycle.
- **Migrate additively** by adding one V3-template-specific Page-title Draft
  revision route. It reuses the existing `DraftRevision` and
  `DraftPreviewSnapshot` persistence records and returns the accepted
  `factory.template-draft-instance/v1` envelope.
- **Reject** browser-supplied complete Graphs, widening a V1 lifecycle route to
  a version union, page id/route/surface/recipe/block/binding edits, automatic
  rebasing, mutable Draft or Snapshot rows, Preview-to-Publish promotion,
  Draft Compilation, new dependencies, and any Graph or database schema
  change in this slice.

## Context

ADR-0012 delivered a separate V3 template boundary with exact clone, open, and
rename operations. Its edit route accepts only
`{ baseDraftRevisionId, name }` and changes only Graph metadata name. The next
bounded Task 7 slice must let a user select an exact customer or merchant page,
change its business-facing title, and observe the result only after the server
has appended a new Graph V3 Draft revision and a new immutable Snapshot V2.

The existing Graph V3 already permits bounded page titles, and the existing
tables already store append-only Draft revisions and Snapshot V2 records. No
Graph version, persistence migration, compiler input, package coordinate, or
runtime topology change is required. The current legacy Puck adapter consumes
the V1 `PageModel` and is not a safe authority for the governed Restaurant V3
page, recipe, and binding closure, so Puck block-tree editing remains deferred.

## Proposed contract

### Route and exact request

Add this local, template-specific endpoint without changing ADR-0012's rename
endpoint:

```text
POST /template-draft-instances/:applicationGraphId/page-revisions
```

It accepts exactly:

```ts
type AppendTemplatePageRevisionInput = {
  baseDraftRevisionId: string;
  surfaceKey: "customer-mobile" | "merchant-desktop";
  pageId: string;
  title: string;
};
```

The body must be an own plain record with exactly four enumerable data
properties. Inherited, accessor, symbol, non-enumerable, missing, extra, sparse,
or non-plain input fails before any caller-controlled conversion or
persistence. Route identifiers and body identifiers use the existing bounded
identifier rules. `surfaceKey` accepts only the two delivered Restaurant
surfaces. `title` is trimmed business text from 2 through 80 characters and
rejects control characters. An unchanged normalized title is invalid.

Every malformed request returns the existing fixed
`Template Draft request is invalid.` rejection without echoing identifiers,
titles, request bodies, or hostile input. The response is the unchanged
`factory.template-draft-instance/v1` envelope from ADR-0012. No request or
response version is guessed from shape.

### Server authority and allowed mutation

The browser supplies an edit intent, not a Graph replacement or lifecycle
authority. Before writing, the Control Plane must verify server-side that:

1. `applicationGraphId` resolves inside the server-selected local workspace;
2. the Application has the exact accepted Restaurant curated-template origin;
3. `baseDraftRevisionId` is the latest Draft for that same Application;
4. the stored Draft reasserts as `factory.application-graph/v3`;
5. `pageId` identifies exactly one current Graph page; and
6. that page's stored `surfaceKey` equals the requested `surfaceKey`.

An identifier alone grants no workspace or Application authority. Browser
headers, titles, routes, roles, recipe keys, bindings, hashes, revision
numbers, Snapshot fields, and projections are never trusted as authorization
or derived state. This local boundary does not claim production multi-tenant
identity completeness; external multi-tenant use remains blocked by the
current threat model.

The server clones the stored current Graph and changes only the matching
`graph.page.pages[].title`. Application identity and aggregate name remain
unchanged. Page id, route, surface, Screen Intent, recipe, regions, block order
and content, bindings, authorities, Domain, Policy, Flow, journeys,
integration selection, metadata other than the already-stored name, and
template origin must remain structurally equal. The complete result is
reasserted as Application Graph V3 before persistence.

### Concurrency, replay, and atomicity

The operation runs in one Prisma Serializable transaction using the delivered
maximum of three bounded attempts. The immutable base Draft id is the
optimistic-concurrency token:

- if the supplied base is latest, one successful command appends exactly the
  next Draft revision;
- if the base is stale, a competing edit wins, or a uniqueness conflict proves
  the revision moved, the request returns the fixed
  `Template Draft revision moved; reload before editing.` conflict;
- serialization conflicts may retry only within the same bounded operation;
  retries must re-read and revalidate workspace, origin, latest Draft, page,
  and surface;
- the server never silently rebases or merges a stale title; and
- replaying a command whose immutable base has already been consumed cannot
  append another revision. The caller reopens the current template Draft after
  an ambiguous transport result.

This is at-most-once mutation through an immutable-revision precondition, not a
successful-response replay API. Adding replay-success idempotency or an
idempotency record would be a separate serialized/persistence decision.

Draft creation, Graph validation, dual-surface rendering, Snapshot creation,
and response assembly are one atomic lifecycle operation. A validation,
rendering, or persistence failure rolls back the new Draft and Snapshot. The
server must not commit a new Draft whose required fresh Snapshot was not
stored.

### Snapshot and preview behavior

For the appended Draft, the server derives the revision number, Draft id,
Graph checksum, Snapshot id, Snapshot checksum, state, timestamps, expiry, and
both surface projections. It constructs and validates a new
`factory.draft-preview-snapshot/v2`, transitions it
`ready -> rendering -> active`, renders customer and merchant previews while
the Snapshot is rendering, and appends the active Snapshot record.

The new Snapshot binds the new Draft id and the hash of the complete edited
Graph. The response is returned only after the strict Graph, Snapshot, and
projection boundaries pass. Prior Draft and Snapshot rows remain immutable and
addressable; neither is updated, deleted, promoted, exported, deployed,
published, or compiled. Preview documents remain response-only material and
are not persisted as source or artifacts.

## API, data, adapter, and operability effects

- **API:** one additive local POST route and one exact command. Existing clone,
  open, rename, V1 lifecycle, AI proposal, import, Publish, export,
  Compilation, and preview-run routes remain byte- and behavior-compatible.
- **Data:** no Prisma schema or migration. The operation appends existing
  `DraftRevision` and `DraftPreviewSnapshot` rows. Once committed, these rows
  are intentionally immutable and are not removed by feature rollback.
- **Graph and compiler:** no Graph, Product Recipe, Snapshot, compiler target,
  or generated-source contract change. V3 Publish and Compilation remain
  unavailable; production compilers still consume only separately accepted
  immutable Published revisions.
- **Adapters and UI:** the Workbench sends only the four-field intent and may
  expose only the Page destination for an active Graph V3 template Draft.
  Existing Puck, Data, Workflow, Access, AI, Code, and Publish adapters do not
  receive or mutate the V3 template Graph in this slice.
- **Catalog, license, and supply chain:** no new registry key, source study,
  copied source, dependency, package version, lockfile resolution, or license
  notice. Existing Workbench navigation, Restaurant recipes, preview renderer,
  styles, and Lucide family are reused.
- **Operability:** no provider, network, queue, worker, service, Docker,
  Compose, deployment, port, volume, or cleanup change. The endpoint remains
  within the accepted local Control Plane boundary.

## Security and privacy assessment

- Treat the browser, route ids, body, and retry timing as hostile. Strict plain
  data capture and fixed redacted errors occur before Graph lookup or render.
- Scope the Application to the server-selected local workspace and exact
  template origin before mutation. Reassert Graph V3 at read, mutation, store,
  render, and response boundaries.
- Use the immutable base Draft and Serializable transaction to reject stale,
  replayed, and racing writes. Never use a browser-supplied revision number,
  Graph hash, Snapshot id, or lifecycle state.
- Do not log or persist request bodies. The flow accepts no credential, raw
  prompt, model response, provider account, executable source, path, package,
  deployment token, or external URL.
- Rendered page titles remain React text and must not become raw HTML or source
  code. Security-sensitive evidence records bounded status and digests, not the
  title or raw request.
- Rate limiting, production authentication, tenant isolation, and audit
  retention remain incomplete residual risks owned by PM/Security. This ADR
  does not authorize external or multi-tenant production exposure.

## Alternatives considered

### Extend the rename route with a union

**Rejected.** It would invalidate ADR-0012's exact body, introduce shape-based
dispatch, and combine unrelated metadata and page operations under one stable
route.

### Send a complete edited Graph from the browser

**Rejected.** It would grant the browser authority over unrelated Graph,
policy, flow, binding, recipe, lineage, and lifecycle fields and risk silently
widening the V1 Draft boundary.

### Add a full Graph V3 Puck adapter now

**Rejected for this slice.** It combines block-tree editing, regions,
responsive variants, surface ownership, bindings, and round-trip semantics.
Those contracts require a later bounded decision and tests.

### Mutate the current Draft or Snapshot in place

**Rejected.** It violates the accepted append-only Draft timeline, immutable
Snapshot binding, history, checksum, and compiler trust boundaries.

## Migration, rollback, and abort conditions

There is no database or Graph migration. After acceptance, implementation may
add only the route, strict operation, Workbench Page interaction, and focused
tests authorized by the PM-frozen Task 7A manifest.

Rollback removes the route and Workbench action and stops future page-title
operations. Already committed Draft and Snapshot rows remain valid immutable
history; rollback must not delete or rewrite them. Existing clone, open,
rename, V1 lifecycle, Published revisions, and Compilations continue unchanged.

Abort and return to Tech Lead/PM if implementation requires any of the
following:

- a Graph, Product Recipe, Snapshot, Prisma, or response-envelope change;
- a new dependency, lockfile resolution, provider, service, queue, runtime, or
  deployment boundary;
- browser-supplied full Graph data or authority over any non-title field;
- automatic stale rebase, replay-success persistence, mutable history, V3
  Publish, Draft Compilation, or preview export; or
- external/multi-tenant authentication or authorization claims.

The only irreversible effect after acceptance is the deliberate append of
immutable Draft and Snapshot history. No external, destructive, or deployment
step is authorized.

## Verification and evidence

Before PM acceptance of implementation, focused evidence must prove:

1. exact strict admission, zero hostile getter/conversion calls, bounded title,
   both surface keys, exact page ownership, and fixed redacted errors;
2. customer and merchant edits change only one page title, reassert the complete
   Graph V3, and leave all non-title Graph content structurally equal;
3. stale, replayed, mismatched-surface, unknown-page, unchanged-title,
   P2002, and P2034 cases fail or retry exactly as specified;
4. one accepted r.2 operation creates exactly Draft r.3 and one new active
   Snapshot bound to its new Graph hash while r.2 and its Snapshot remain
   unchanged;
5. renderer or Snapshot failure rolls back both new records and never calls
   Publish, Compilation, export, provider, network, queue, or runtime services;
6. the Workbench preserves exact `{ surfaceKey, pageId }` selection, exposes
   Page only for the active V3 template, does not update the visible title
   before the strict server response, and remains keyboard- and narrow-layout
   accessible; and
7. one browser journey clones, renames to r.2, selects Customer Menu, opens the
   Page workspace, saves `Seasonal Menu`, and observes r.3, a different
   Snapshot, and the new preview title.

The implementation gate runs the focused Control Plane and Workbench tests,
both full suites, Graph/Capabilities/Compiler compatibility, both package
typechecks and builds, Prisma validation, browser acceptance, formatting,
diff/containment, sensitive-data, and browser-import checks. The active evidence
and final P0/P1/P2 review verdict are recorded in
`docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.

This accepted ADR authorizes only the PM-frozen Task 7A implementation and its
reviewed delivery. Every later editor, Publish, Compilation, Source, export,
provider, service, or deployment slice requires its own existing gate.
