# Template Page Block Order Design

Status: accepted and frozen by ADR-0014 on 2026-08-14.

## Goal

Deliver the next bounded Task 7 Page-editor slice. A user opens an existing
Restaurant page with at least two governed blocks, uses the installed Puck
canvas or keyboard controls to reorder those same blocks inside the existing
`main` recipe region, and saves the order as the next Graph V3 Draft plus a new
immutable Snapshot V2.

This is a visible Page composition edit. It does not invent content properties
that Graph V3 cannot represent and does not widen Graph, Product Recipe, or
Snapshot schemas.

## Why order is the correct next edit

Restaurant Graph V3 blocks contain `id`, `type`, and typed `bindings`; they do
not contain the legacy Puck `props` used by the V1 `PageModel`. Sending the V1
document through the V3 boundary would fabricate headings and titles, lose
recipe-region identity, or grant the browser authority over bindings.

Graph V3 already represents two coupled orderings:

- `page.blocks`, the page block sequence; and
- `page.recipe.regions[].blockIds`, the block sequence inside each recipe
  region.

The current Restaurant recipes all have one `main` region, and every block is
referenced exactly once. Reordering the same block set in both places is
therefore the smallest honest multi-block round trip. Block IDs keep every
Domain/Flow/Policy binding policy stable.

## Alternatives

### Selected: same-set region reorder

The browser submits only an ordered list of existing block IDs for the selected
page and `main` region. The server verifies exact membership and uniqueness,
reorders the existing immutable block values, updates the matching region list,
reasserts the complete Graph V3, and appends Draft/Snapshot history.

### Rejected: legacy V1 Puck adapter

The current adapter maps legacy Hero/Collection/Form/etc. props and may insert,
copy, or delete blocks. Restaurant V3 uses registry block keys and typed
bindings with no props. Reusing it would silently cross version and authority
boundaries.

### Rejected: browser-supplied blocks or bindings

The browser cannot add block objects, change type, edit bindings, relabel
binding policies, insert registry keys, or send a complete Graph.

### Deferred: content/property editing and new blocks

Those features require a versioned, source-exportable V3 property/slot contract
and a policy for new block IDs, recipe membership, binding completeness, and
generated-source round trips. They remain separate tasks.

## Reuse inventory

The design audit searched these approved sources before creating a component:

- `packages/ui-primitives/src/index.ts`, `packages/ui-patterns/src/index.ts`, and
  `packages/workbench-ui/src/index.ts` for an existing reorder/outline control;
- `packages/generated-ui/src/index.ts`, `packages/screen-recipes/src/index.ts`,
  `packages/experience-recipes/src/index.ts`, and
  `packages/product-recipes/src/index.ts` for a source-selectable Restaurant
  editor recipe;
- `apps/workbench/components/page-studio.tsx` for the legacy V1 Puck boundary;
- `apps/workbench/components/template-page-workspace.tsx` and
  `apps/workbench/styles/template-page.css` for the delivered Page shell,
  selection, status, focus, responsive, and token conventions; and
- installed `@puckeditor/core` 0.22.3 for supported Layout, Outline, Preview,
  permission, iframe, and drag behavior.

The audit also searched generated-project template sources in
`packages/compiler/src/targets/restaurant-v3/source-registry.ts`,
`customer-target.ts`, `merchant-target.ts`, and `product-target.ts`. They remain
runtime/compiler outputs and were rejected as editor component sources; this
slice changes only their existing pure projection closure and never copies their
markup. Pinned source-study records
`docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`,
`docs/research/2026-08-10-product-builder-ui-ecosystem.md`, and
`docs/research/2026-07-30-profile-capability-source-study.md` were checked for a
governed Page-order control. They supply product-flow, progressive-disclosure,
and no-copy boundaries but no reusable source asset or accepted external
coordinate for this interaction, so no source, template, asset, dependency, or
registry key is imported.

The registry packages were rejected as direct UI reuse because they generate
product/runtime source or expose generic primitives, not a Workbench Graph V3
editor boundary. `page-studio.tsx` was rejected because its V1 adapter permits
props, insertion, deletion, duplication, and id generation. The delivered
template Page workspace and CSS are reused in place. The only new component is
`TemplatePageBlockOrder`; its distinct functional gap is a mutation-resistant,
same-set Graph V3 reorder surface with no content or binding authority.

Reused keys, paths, and changed parameters are:

- installed `@puckeditor/core` 0.22.3; no dependency or lockfile change;
- `Puck.Layout`, `Puck.Outline`, and `Puck.Preview` with global permissions
  `{ drag: true, duplicate: false, delete: false, edit: false, insert: false }`
  and `iframe.enabled: false` so pointer and Escape events share the Workbench
  document boundary;
- the delivered Workbench Page workspace, selection state, strict client,
  fixed save/error state, focus behavior, and dual-surface preview;
- exact block identities/types from the strict Control Plane response;
- `packages/screen-recipes` as the immutable block membership/type/binding
  authority;
- the existing generated preview block visual language and Workbench tokens;
  only the Page-order layout, status, move controls, and 390px stacking rules
  are added to the existing feature stylesheet.

The Puck component palette and fields are not rendered. The browser never gains
insert, delete, duplicate, type, prop, binding, recipe, or source authority.
Keyboard Move up/down controls operate on the same local ordered ID list.

## Stable command

Add one template-specific route:

```text
POST /template-draft-instances/:applicationGraphId/page-block-order-revisions
```

Exact body:

```ts
type AppendTemplatePageBlockOrderRevisionInput = {
  baseDraftRevisionId: string;
  surfaceKey: "customer-mobile" | "merchant-desktop";
  pageId: string;
  regionKey: "main";
  blockIds: string[];
};
```

The body is an own plain record with exactly five enumerable data properties.
`blockIds` is an ordinary dense own-data array, length 2 through 20, containing
bounded unique Graph keys. Accessors, symbols, inherited keys, sparse/custom
arrays, caller conversion, extra/missing keys, malformed identifiers, and
hostile reflection fail with the fixed request error before Prisma access.

The command must name the latest immutable base Draft. Page and surface must
match stored Graph truth. The page must contain the named `main` region. The ID
list must be an exact permutation of both the current region membership and the
current page block membership, and it must change the order. Unknown, missing,
duplicate, extra, cross-page, or unchanged IDs fail without persistence.

## Server mutation and lifecycle

The service captures the strict command once before a Serializable transaction
and reuses it across at most three P2034 retries. It scopes Application lookup
by ID and the server-selected local workspace before inspecting template
origin, then checks the latest base.

The pure operation:

1. reasserts the stored Graph V3;
2. locates one selected page and its one `main` region;
3. maps existing block objects by ID;
4. creates a new `page.blocks` array in requested order using fresh copies of
   the inspected existing block values;
5. creates the region `blockIds` in the same order;
6. proves every other Graph value, block type, binding, field authority,
   binding policy, journey, flow, recipe key, route, title, surface, and source
   identity is unchanged; and
7. reasserts and hashes the complete Graph V3.

The existing atomic helper appends exactly one Draft and active Snapshot V2,
renders both surfaces, and rolls back on validation, projection, render,
Snapshot, or persistence failure. Stale/replayed bases return the fixed reload
conflict and never rebase. Prior Draft/Snapshot rows remain immutable.

## Projection migration

The current Restaurant surface projection compares the Graph blocks and region
order to Registry order exactly. Migrate that projection from "Registry order
is immutable" to "Registry membership/type/bindings are immutable; Graph order
is authoritative after exact permutation validation."

For every projected page:

- the block ID set, type for each ID, and complete bindings for each ID must
  equal the immutable Screen Recipe;
- `recipe.main.blockIds` must equal `page.blocks.map(id)` exactly;
- projection output uses the validated Graph order and immutable block values;
- missing/extra/duplicate/type/binding/source mutations still fail closed.

This migration enables Draft preview and deterministic manifest order. It does
not claim V3 Publish, change generated source bytes, or promise that the current
hard-coded production runtime visually reorders blocks; V3 Publish/Compilation
and source regeneration remain blocked and require their existing later gates.

## Workbench interaction

The Page workspace keeps the title editor and adds a compact `Block order`
mode for pages with two or more blocks:

- Puck shows only the current page's existing blocks;
- drag changes a local proposed ID order;
- Move up/down buttons provide a labelled keyboard path;
- duplicate/delete/insert/field editing are absent and also rejected by the
  pure adapter and server;
- `Save order as new Draft` is disabled when unchanged, invalid, or busy;
- the adjacent delivered preview remains server-authoritative before success;
- success preserves surface/page selection, advances the revision/Snapshot,
  and renders the new block order;
- failure keeps the local order and shows one fixed non-echoing error;
- Escape/back discards the local proposal and returns to the unchanged preview.

At narrow widths Puck/editor and preview stack. Drag is never the only
interaction. All buttons are labelled, focus-visible, and at least 44px.

## Browser and security boundaries

- Puck data carries only inspected `{id,type}` display identity; the save
  command carries only IDs.
- Puck `onChange` output is reduced to an exact same-set ID permutation before
  it can update local editor state.
- Unsaved order never changes the authoritative product preview or Graph.
- Titles and block labels render as React text, never raw HTML.
- No request body, block ID list, title, prompt, model response, credential, or
  hostile input is logged as evidence.
- No provider, network, service, queue, worker, Docker, Compose, database
  migration, dependency resolution, Publish, Compilation, Source export, or
  deployment action is authorized.

## Verification

TDD and independent review must prove:

- strict exact admission, zero ordinary getter/conversion invocation, caught
  Proxy reflection, no echo, dense-array and length bounds;
- valid customer and merchant multi-block permutations;
- unknown/missing/extra/duplicate/cross-page/unchanged IDs and surface/region
  mismatches;
- only the selected page's block and `main` region order changes; all block
  values/bindings/policies and every other Graph value remain equal;
- compiler projection accepts valid permutations and rejects membership, type,
  binding, region, and source drift through a pure closure assertion before
  renderer or Draft-create invocation;
- stale/replay/P2002/P2034 and render/Snapshot rollback behavior;
- actual Puck data/config permissions, same-set output reduction, no component
  palette or editable fields, keyboard reorder, unchanged preview before save,
  fixed error, focus, and 390px layout;
- one browser journey opens Customer Home, reorders its three blocks, saves the
  next Draft/Snapshot, and observes the preview order change while block IDs and
  binding summaries remain the same.

Fresh gates include focused/full Control Plane, Workbench, Compiler, Graph, and
Capabilities; typechecks/builds; Prisma; Playwright; exact formatting/diff/
containment; sensitive/browser-import checks; one independent task review;
fresh Terra QA; final independent Sol release review; one reviewed commit;
non-force push; clean local/upstream equality.
