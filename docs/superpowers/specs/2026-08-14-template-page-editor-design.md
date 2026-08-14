# Template Page Editor Design

Status: accepted under the founder's standing instruction to continue accepting
and iterating when a slice advances the Restaurant prompt-to-product goal.

## Goal

Deliver the first bounded Task 7 editor slice. A user selects one page in the
delivered Restaurant customer or merchant preview, opens that exact page in the
Page workspace, changes its business-facing title, and saves the change as a
new Graph V3 Draft revision with a new immutable Draft Preview Snapshot V2.

## Product boundary

This is Task 7A, not the whole contextual-editor program. It proves one honest
edit from visible product UI through persisted product truth and back to a
fresh preview. Data, Users, Workflow, Experience, Puck block-tree mutation,
Source Mode, Publish, and Compilation remain separate later slices.

The edit changes only `graph.page.pages[].title`. It cannot change a page id,
route, surface, Screen Intent, recipe, region, block, binding, authority,
Domain, Policy, Flow, journey, integration selection, application identity, or
template origin. Application Graph V1/V2/V3 and Snapshot V2 contracts remain
unchanged.

## Alternatives

### Selected: server-owned page-title operation

Add one strict template-Draft page revision command. The server identifies the
current Graph V3 Draft, verifies the selected page belongs to the stated
surface, applies one bounded title change, reasserts the complete Graph V3,
appends the Draft, renders both surfaces, and stores a new Snapshot V2.

This is the smallest end-to-end edit that is visible, deterministic, reviewable,
and honest about Draft/Snapshot lifecycle.

### Rejected: send the complete edited Graph from the browser

The browser would gain authority over unrelated Graph fields and could relabel
server-derived bindings, policy, flows, or lineage. This also widens the legacy
V1 draft endpoint into an unsafe version union.

### Deferred: full Puck Graph V3 adapter

The current Puck adapter consumes the legacy `PageModel`, while the Restaurant
Draft is an `ApplicationGraphV3` with Screen Intent, recipe regions, typed
bindings, and surface ownership. Building that adapter now would combine page
selection, block editing, binding preservation, responsive variants, and
round-trip semantics in one slice. Task 7A leaves the accepted Puck dependency
and existing adapter unchanged and uses the title operation as the lifecycle
foundation for the later block-tree slice.

## Reuse inventory

Reuse, in policy order:

- `packages/workbench-ui`: the accepted `page` Builder destination and compact
  Builder navigation vocabulary;
- `packages/screen-recipes` and `packages/product-recipes`: the immutable page,
  recipe, surface, and navigation identities already projected by Task 6B;
- `apps/workbench/components/template-draft-workspace.tsx`: the real dual-
  surface selector, page list, preview, origin, revision, and Snapshot details;
- existing Workbench form, button, focus, spacing, color, radius, and status
  styles from Task 6A/6B;
- the existing Lucide family already used throughout Workbench.

No new primitive, pattern, business block, screen recipe, experience recipe,
product recipe, icon family, dependency, source study, or registry key is
needed. The legacy Puck adapter is inspected but not imported into the Graph V3
boundary because that would lose V3 semantics.

## API and lifecycle

The additive local endpoint is:

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

The response remains the delivered `factory.template-draft-instance/v1`
envelope. No response version or Graph schema changes.

The command requires an own plain record with four enumerable data properties.
`title` is trimmed business text from 2 through 80 characters with no control
characters. `surfaceKey` is one of the two delivered surface keys. `pageId`
must identify exactly one current Graph page and that page's `surfaceKey` must
equal the command surface. Unknown, inherited, accessor, symbol, extra, or
malformed input fails with the fixed request error and never echoes input.

The server executes in a serializable transaction with the delivered bounded
retry behavior. The supplied base Draft must still be latest. The command
clones the current Graph, changes only the selected page title, validates the
whole Graph V3, appends the next Draft revision, creates and stores a new active
Snapshot V2, and returns freshly rendered customer and merchant preview
documents. A stale or racing edit returns the existing fixed reload conflict.

Existing Draft and Snapshot rows are immutable. The application aggregate name
does not change during a page edit. V1 lifecycle, AI proposal, import, Publish,
export, Compilation, and preview-run routes remain untouched.

## Workbench interaction

Task 6B's preview owns the selected `{ surfaceKey, pageId }` state. Selecting a
page updates that state without a network call. `Edit page` opens the Builder's
Page workspace for the same selection. While a template Draft is active, the
Builder navigation exposes only Page; future Data, Workflow, Access, AI, Code,
and Release destinations stay absent until implemented for Graph V3.

The Page workspace has one active decision:

- a compact back action to the product preview;
- the selected surface and route as context;
- a labelled `Page title` input containing the current server title;
- the same product preview beside the editor;
- a primary `Save as new Draft` action.

Save is disabled while unchanged, invalid, or busy. Escape/back returns to the
preview without persisting. A successful save keeps the same surface/page
selected, renders the new title, shows the incremented Draft revision and the
new Snapshot state, and returns focus to the editor heading or save status. A
fixed inline error preserves the unsaved value for correction. Technical ids,
hashes, binding targets, and Graph details remain under explicit Preview
details or Advanced surfaces.

The layout preserves Task 6B's light, sparse, one-accent Workbench language.
It uses existing 8–12px radii, hairline dividers, compact labels, and no new
card grid, gradient, oversized heading, or persistent explanatory panel. At
narrow widths editor and preview stack; the labelled input and actions remain
keyboard reachable, focus-visible, and at least 44px high.

## State and data flow

```text
Task 6B preview page selection
  -> Page workspace local title draft
  -> strict Workbench client command
  -> strict Control Plane page operation
  -> current Graph V3 Draft + optimistic base check
  -> clone one page title + assert complete Graph V3
  -> append Draft revision
  -> render both surfaces + append active Snapshot V2
  -> strict client response validation
  -> same selected page, new title/revision/Snapshot
```

## Error and authority rules

- Browser state selects a page but grants no authority over its surface,
  recipe, blocks, bindings, or lifecycle fields.
- The server derives revision number, Draft id, Graph checksum, Snapshot id,
  Snapshot checksum, state, timestamps, and projections.
- Stale edits fail; they never overwrite or silently rebase.
- Invalid operations fail before persistence and never call renderers.
- No credential, raw prompt, model response, provider account, source upload,
  generated source, deployment token, or external request enters this flow.

## Verification

Focused RED/GREEN evidence must cover:

- both surface keys and an exact page selection;
- valid customer and merchant title edits;
- unknown page, surface mismatch, stale base, unchanged title, bounds, controls,
  extra/inherited/accessor/symbol input, and transaction conflict;
- exactly one new Draft and Snapshot with prior rows unchanged;
- Graph hash and Snapshot binding changed together while all non-title Graph
  content remains structurally equal;
- Workbench selection persistence, Page-only navigation, disabled/busy/error
  states, keyboard operation, narrow layout, and no technical details by
  default;
- one real browser journey: clone, rename to r.2, select Customer Menu, open
  Page, rename it to `Seasonal Menu`, save r.3, and observe the new Snapshot and
  preview title.

Fresh completion evidence includes the focused Control Plane and Workbench
suites, both full suites, Graph/Capabilities/Compiler compatibility, both
typechecks/builds, Prisma validation, exact formatting/diff/containment,
sensitive and browser-import scans, one independent review, one bounded commit,
non-force push, clean status, and local/upstream equality.
