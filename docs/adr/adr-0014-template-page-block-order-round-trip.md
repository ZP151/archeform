---
title: "ADR-0014: Template Page Block Order Round Trip"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "templates", "draft", "page-editor", "puck", "preview"]
supersedes: ""
superseded_by: ""
---

# ADR-0014: Template Page Block Order Round Trip

## Status and decision gate

**Accepted.** On 2026-08-14 the PM/controller confirmed that this bounded,
append-only Restaurant Page-order slice directly advances the accepted product
goal without expanding Graph, Product Recipe, generated runtime, provider,
service, deployment, or dependency boundaries. The founder's standing
instruction below is therefore sufficient acceptance for this reversible
decision.

### Founder standing instruction and adjudication

The founder instructed Archeform to continue accepting and iterating when work
matches the stated product goal, verbatim:
`参考以下总结，若符合项目目标，则持续接受而迭代。`

This text is standing product direction. PM has applied it only to the bounded
decision recorded here; it does not authorize later block insertion, deletion,
field editing, Graph schema, Product Recipe, generated runtime, Publish,
Compilation, Source, provider, service, export, or deployment work.

## Recommendation

- **Keep** the accepted Node.js 22, React 19, Next.js 15, Puck 0.22.3,
  NestJS 10, Prisma 6, and PostgreSQL 16 profile; Application Graph V1/V2/V3
  schemas and assertions; Product Recipe contracts; the frozen Screen Recipe
  registry; Draft Preview Snapshot V2; and the mutable Draft -> immutable
  Published revision -> immutable Compilation lifecycle.
- **Migrate additively** by adding one V3-template-specific block-order Draft
  revision route, one narrow Puck order adapter, and a compatible widening of
  the internal Restaurant V3 surface projection. After exact closure
  validation, Graph order becomes authoritative for projection order while
  the Screen Recipe remains authoritative for membership, types, bindings,
  source coordinates, and original seed order.
- **Reject** the existing Puck V1 `PageModel` adapter for this operation;
  browser-supplied Graphs or block objects; block add, delete, duplicate,
  field, prop, binding, policy, recipe, source, or region edits; automatic
  rebasing; mutable Draft or Snapshot rows; V3 Publish or Draft Compilation;
  changes to generated Customer/Merchant runtime markup; Graph, Product
  Recipe, Screen Recipe, database, dependency, provider, or deployment
  changes.

## Context

ADR-0012 established a separate curated-template V3 Draft and immutable
Snapshot lifecycle. ADR-0013 added one safe Page-title operation that captures
a primitive command, appends a new Draft, and renders a new immutable dual-
surface Snapshot atomically. The next bounded visible edit is to reorder the
existing blocks of one selected Restaurant page and see that order round-trip
through the server-authoritative Draft preview.

The current Graph contract already models order twice: `page.blocks` is an
ordered array, and each recipe region contains ordered `blockIds`. V2/V3
assertions require every page block to be referenced exactly once across
regions, while binding policies address blocks by stable id. Reordering the
same ids therefore needs no Graph schema or semantic migration.

The current Restaurant surface projection is narrower than the Graph: it
requires Screen Recipe registry order and emits blocks in that order. Its
validation must be widened for a true Draft preview round trip. That does not
mean the generated product runtime has become order-driven. The current
Customer and Merchant target markup is composed in source, and production
Restaurant compilation pins an exact approved Graph closure and hash. This
slice may make Draft preview projections honest; it must continue to reject a
reordered Draft at the production compilation boundary and must not claim that
generated runtime pages visually reorder.

## Accepted contract

### Exact operation

Add exactly this local Control Plane route:

```text
POST /template-draft-instances/:applicationGraphId/page-block-order-revisions
```

Its exact JSON body is:

```ts
type AppendTemplatePageBlockOrderRevisionInput = {
  baseDraftRevisionId: string;
  surfaceKey: "customer-mobile" | "merchant-desktop";
  pageId: string;
  regionKey: "main";
  blockIds: string[];
};
```

Success returns the existing strict
`factory.template-draft-instance/v1` envelope, including the appended Draft
and its newly rendered active `DraftPreviewSnapshotV2`. No version is inferred
from body shape, and no complete Graph, page, block, binding, recipe, or source
document is accepted from the browser.

### Strict capture and dense-array admission

Capture the complete command exactly once before starting a Prisma
transaction or performing any database, Graph, origin, registry, hash, or
renderer work. Reuse only the captured primitive values across bounded
serialization retries. Capture must not call caller-controlled getters,
conversion hooks, iterators, proxies, or `toJSON` methods.

For `blockIds`, inspect the own `length` data descriptor and enforce the 2..20
bound before prototype, own-key, or index-descriptor traversal. After the one
required `Reflect.ownKeys` call, reject an impossible key count before inspecting
individual index descriptors. A hostile Proxy may trigger the unavoidable
reflection trap, but cannot cause unbounded per-key reflection work.

The body must be an own plain record with exactly five enumerable own data
properties and no symbols, accessors, inherited properties, non-enumerable
properties, missing properties, or extra properties. `blockIds` must be an
ordinary Array whose prototype is exactly `Array.prototype`, with length from
2 through 20. Its own keys must be exactly the dense indices `0` through
`length - 1` plus the ordinary `length` property; every index must be an own
enumerable data property. Sparse arrays, custom prototypes, custom keys,
symbols, accessors, inherited entries, and array subclasses are invalid.

Every identifier is a primitive string satisfying the existing Graph key
rule: 1 through 128 characters and `/^[a-z][a-z0-9-]*$/`. `blockIds` must be
unique. `surfaceKey` and `regionKey` accept only the literals in the contract.
Any reflection or capture trap, malformed route/body, or admission failure is
mapped to the fixed `Template Draft request is invalid.` rejection before any
persistence or caller-controlled conversion. Errors never echo route ids,
block ids, bodies, Graph content, or hostile values.

### Server, workspace, base, and origin authority

After successful capture, the server must:

1. select the Application by both `applicationGraphId` and the server-owned
   local workspace identity before reading or asserting stored origin data;
2. return the same fixed not-found response for absent and cross-workspace
   Applications, including those with malformed origin data;
3. prove the Application is the exact supported curated Restaurant template
   origin and load the latest Draft revision under Serializable isolation;
4. require `baseDraftRevisionId` to equal that latest Draft revision id;
5. reassert the stored Graph as strict Application Graph V3 and verify its
   workspace identity and hash;
6. resolve `surfaceKey`, prove that it owns exactly `pageId`, resolve that
   page, and require its governed recipe to contain the single supported
   `main` region; and
7. prove the current `page.blocks`, current `main.blockIds`, and requested
   `blockIds` contain exactly the same unique ids, with the current two arrays
   already agreeing in order, and prove the requested order is different.

Before any renderer invocation or Draft insert, call one pure Compiler-owned
closure assertion over the candidate Graph. It validates both Restaurant
surfaces against the immutable Screen Recipe membership, type, binding, recipe,
and source registries. This assertion is exported only so the Control Plane can
enforce the existing cross-package contract at the correct transaction stage;
it adds no compiler target or generated-runtime behavior.

The browser's application, surface, page, region, block ids, base revision,
and displayed preview are selectors only. None is authority. Unknown,
mismatched, stale, unchanged, duplicate, missing, extra, or cross-surface
values fail before rendering or persistence.

### Exact same-set mutation

Construct the next Graph from a server-owned clone of the latest asserted
Graph. Build an id map from the existing `page.blocks` only after proving
uniqueness and exact closure. Then perform exactly two coordinated changes:

- replace that page's `blocks` array with fresh copies of the existing block
  objects in captured `blockIds` order; and
- replace only the selected `main.blockIds` array with the same captured order.

The two resulting arrays must agree exactly. Every block's id, type, optional
entity, props, and bindings remains byte-for-byte structurally equal to its
base value. Page id, title, route, surface ownership, screen intent, recipe
key/version/region key/layout, every other page and region, roles, flows,
journeys, field authorities, binding policies, navigation, metadata, source,
workspace, and all other Graph content remain structurally equal. The server
must prove this non-order equality, reassert the complete Graph V3, and derive
its new hash; it must not patch caller objects or mutate the base Draft.

Binding policies and field authorities remain addressed by stable ids and are
not reordered or regenerated. The frozen Screen Recipe and source registry
remain unchanged. Because membership and types are unchanged, the exact
source module coordinates, digests, origins, and recipe keys also remain
unchanged.

## Puck and Workbench boundary

Keep Puck 0.22.3, but do not pass Graph V3 through
`PuckPageDocument` version 1, `pageModelToPuckDocument`,
`puckDocumentToPageModel`, or `applyPuckBlocksToPageModel`. Those adapters are
V1 `PageModel` boundaries and intentionally support block insertion, removal,
id generation, editable props, and binding behavior that this V3 operation
forbids.

Create a separate narrow block-order adapter. Its input is the asserted
server-preview page reduced to immutable display identity `{ id, type }`; its
only accepted output is an id permutation. It must reject inserted, removed,
duplicated, renamed, or type-changed items before calling the Control Plane.
Use `Puck.Layout`, `Puck.Outline`, and `Puck.Preview` with global permissions
that allow drag and forbid duplicate, delete, edit, and insert. Do not render
the component palette or field controls. Puck permissions are defense in
depth, not authority: a crafted browser call still meets the full server
checks above.

The Page workspace keeps the existing title editor and adds an explicit
block-order mode for the currently controlled `surfaceKey` and `pageId`.
Every block has visible identity and keyboard-accessible Move up/Move down
controls using the same pure permutation reducer as drag. Boundary controls
are disabled, focus remains predictable, instructions and changes are
announced, and Save is enabled only for a valid changed permutation. Save
uses the currently loaded Draft id as the base. All failures normalize to the
fixed `Template page could not be saved.` message. A successful response,
never speculative client state, replaces the current instance and preview.

## Restaurant surface projection migration

Migrate the internal `factory.restaurant-surface-plan/v1` projection and its
validator as a compatible widening, not as a Graph or Screen Recipe change:

1. resolve the page's immutable registry recipe by exact key and version;
2. require Graph blocks to have the exact same unique id set and cardinality
   as registry blocks;
3. for each id, require exact registry type and exact governed bindings;
4. require the selected Graph `main.blockIds` to equal
   `page.blocks.map(block => block.id)` in order and to be the same exact set;
5. emit projected blocks and `main.blockIds` in asserted Graph order, taking
   type and binding content only from the validated immutable closure; and
6. keep source module, digest, origin, and recipe-key validation exact and
   order-independent where their existing contract represents a set.

The V1 identifier is retained only because its serialized shape already
represents ordered block and region arrays, every formerly valid
registry-order plan stays valid, and the migration admits additional exact
permutations without changing fields. Before implementation, verify that no
external or public consumer depends on the undocumented registry-order-only
invariant. If such a consumer exists, abort this widening and propose a new
versioned surface-plan contract instead of silently changing its assumption.

The Draft-preview path may project and render the reordered Graph from its
immutable Snapshot. Production product compilation remains Published-only and
keeps its exact approved Graph hash and closure. It must continue rejecting
the reordered Draft. Customer and Merchant generated app modules remain
unchanged and may keep their current source-composed runtime order. Therefore
this ADR authorizes no claim that a generated application or compiled runtime
has adopted the Draft block order; that requires a later design and ADR.

## Concurrency, persistence, and Snapshot behavior

Use one bounded Serializable operation with at most three attempts. Each
attempt re-reads and revalidates workspace, origin, latest Draft, Graph,
surface, page, region, same-set closure, and requested change, while reusing
the one captured primitive command. A serialization conflict may retry. A
stale base, replay, unchanged order, or uniqueness race returns the fixed
`Template Draft revision moved; reload before editing.` conflict; it is never
silently rebased and never converted into replay success.

On acceptance, append exactly the next immutable Draft revision and render
both governed preview surfaces from that asserted next Graph. Store exactly
one new immutable `DraftPreviewSnapshotV2`, tied to the new Draft id and Graph
checksum, then return the strict instance envelope. Draft append, dual-surface
render, Snapshot insert, and active-Snapshot selection are one atomic outcome.
Renderer, checksum, validation, Snapshot, P2002, or exhausted P2034 failure
must leave no new Draft or Snapshot row. The base Draft and every prior
Snapshot remain unchanged and readable.

This is optimistic concurrency, not a general idempotency-key protocol. A
replayed accepted command has a stale base and conflicts deterministically.

## API, data, and compatibility effects

- **API:** one new exact local route and input type; the existing strict
  template-instance response is reused.
- **Data:** no Prisma migration and no mutable row. Existing Draft and
  Snapshot tables receive only append-only records.
- **Graph and recipes:** no schema, assertion, Product Recipe, Screen Recipe,
  binding-policy, field-authority, or source-registry change.
- **Compiler:** one pure Restaurant surface-projection compatibility widening
  for exact permutations; product compilation contracts and target output
  remain unchanged.
- **V1/V2:** the V1 lifecycle and generated bytes retain parity. Generic V2
  remains unsupported. No V1/V2 route becomes a version union.
- **Operations:** no network provider, external coordinate, service, worker,
  Docker, Compose, export, deployment, or new dependency is introduced.

## Security and privacy assessment

- Treat route ids, request bodies, array structure, proxies, retry timing,
  Puck output, and displayed preview as hostile. Capture plain data once and
  use fixed redacted errors before database or Graph work.
- Scope the Application by server-owned workspace before origin inspection so
  cross-workspace invalid origin data cannot become an existence oracle.
- Reassert Graph V3 and exact template provenance at read, mutation, hash,
  render, store, and response boundaries.
- Require exact same-set closure and immutable per-id block content. This
  blocks browser attempts to inject code, source coordinates, props,
  bindings, roles, policies, authority, or navigation through a reorder.
- Bound the list to 20 items, retries to three attempts, and rendering to the
  two governed surfaces. Do not log raw bodies, ids, Graphs, snapshots, proxy
  errors, or hostile values.
- Keep authorization server-owned. Puck permissions and hidden UI controls do
  not substitute for tenant, origin, base-revision, or Graph validation.

## Alternatives considered

1. **Keep registry order forever.** Rejected because it cannot round-trip the
   accepted visible reorder through a server-authoritative Draft preview.
2. **Reuse the Puck V1 PageModel adapter.** Rejected because it permits a much
   wider insert/delete/prop/binding mutation surface and loses the V3 Graph
   authority boundary.
3. **Accept a complete page or Graph from Puck.** Rejected because it lets the
   browser propose governed content and makes immutability proofs fragile.
4. **Rewrite the frozen Screen Recipe order.** Rejected because a per-Draft
   user edit must not mutate shared registry provenance or source digests.
5. **Teach generated runtimes to compose arbitrary Graph block order now.**
   Deferred and rejected for this slice. Current runtime markup and exact
   production compilation closure do not honestly provide that capability.
6. **Mutate the latest Draft or Snapshot in place.** Rejected because it
   destroys history, concurrency evidence, and rollback safety.
7. **Automatically rebase a stale permutation.** Rejected because concurrent
   membership or order changes make intent ambiguous; the user must reload.

## Migration, rollback, and abort conditions

No database, Graph, Product Recipe, Screen Recipe, source, or dependency
migration is required. Add the route, narrow order adapter, Workbench mode,
strict tests, and pure projection widening behind the existing curated-
template boundary. Previously stored registry-order Graphs and projections
remain valid without rewriting.

Before the first accepted mutation, rollback may remove the route, UI, and
projection widening together. After any reordered Draft/Snapshot is appended,
rollback must disable new writes while retaining read and projection support
for already immutable reordered history; removing that compatibility would
make accepted Snapshots unopenable. Immutable rows are never edited or
deleted as rollback.

Abort implementation and return to design if any of the following is true:

- Graph assertions cannot preserve exact same-set `page.blocks` and
  `main.blockIds` order without a schema change;
- the supported page has multiple editable regions or requires cross-region
  movement;
- a stable external surface-plan consumer relies on registry-order-only
  semantics and cannot adopt a new version;
- an honest product outcome requires generated Customer/Merchant runtime
  markup, Publish, or Compilation to reorder in this slice;
- the request must add, remove, duplicate, rename, edit, or regenerate a block,
  prop, binding, policy, authority, recipe, or source coordinate;
- atomic Draft and dual-surface Snapshot append cannot be retained; or
- implementation requires a new Graph/Product Recipe/database contract,
  dependency, provider, service, export, or deployment boundary.

## Verification obligations

Before implementation can be accepted, focused RED/GREEN evidence must prove:

1. the exact five-field body, ordinary dense array requirements, 2..20 bound,
   unique Graph keys, hostile proxy/reflection failures, zero getter or
   conversion calls, capture exactly once before Prisma, and captured-command
   reuse across P2034 retries;
2. both surfaces accept a changed exact permutation, update only
   `page.blocks` and `main.blockIds`, keep those orders equal, and leave every
   per-id block value and all non-order Graph content structurally equal;
3. stale/replay, unchanged, unknown, cross-workspace, invalid-origin,
   mismatched-surface/page/region, sparse, duplicate, missing, extra,
   type/binding/source drift, P2002, and exhausted P2034 cases fail with the
   specified fixed responses before render or append;
4. one accepted operation appends exactly the next Draft and one new active
   checksum-matched Snapshot, prior history remains immutable, and separate
   renderer and Snapshot-store failures each roll back both attempted rows;
5. the projection accepts every exact registry-member permutation, emits
   Graph order, rejects closure drift, keeps source identity unchanged, and
   preserves the original registry-order projection output;
6. the narrow Puck adapter is mutation-resistant, uses actual Puck 0.22.3
   permissions (`drag: true`, `duplicate: false`, `delete: false`,
   `edit: false`, `insert: false`), exposes no component or field controls,
   and produces the same permutation as keyboard Move controls;
7. Workbench selection is controlled, Save uses the loaded base revision,
   pending/stale/error states never speculate, errors use the fixed Page-save
   copy, and focus, keyboard order, announcements, contrast, 1440 px, and
   390 px layouts remain accessible;
8. a real browser journey opens the Task 7A r.3 Snapshot, reorders the three
   Customer Home blocks, saves r.4, observes the new server-rendered order, and
   reloads the same authoritative r.4 state; separate server evidence proves
   the prior r.3 Draft/Snapshot checksum, Graph, and bindings remain unchanged;
   this slice does not add a template-history picker; and
9. direct package tests, no-emit type checks, Workbench and Control Plane
   builds, production Workbench build, static containment, dependency-boundary
   checks, and diff checks pass; V1 lifecycle/byte parity and V2 rejection stay
   unchanged; and production V3 compilation still rejects the reordered Draft
   rather than implying generated-runtime support.

The delivery ledger must record the exact RED reasons, GREEN counts, direct
commands, immutable-history evidence, projection compatibility evidence,
responsive browser evidence, and an independent intended-vs-implemented
review. Passing tests do not authorize delivery; the Accepted decision remains
bounded by explicit PM/controller acceptance after the mandatory task review,
fresh Terra QA, and final independent Sol release review.
