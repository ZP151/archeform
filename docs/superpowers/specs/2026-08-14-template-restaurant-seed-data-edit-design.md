# Template Restaurant Seed Data Edit Design

Status: accepted and frozen by ADR-0015 on 2026-08-14. The implementation is
accepted on the exact reviewed 28-path tree and is not yet delivered.

## Goal and visible outcome

Deliver Task 7C as the first bounded Restaurant Data edit. Starting from the
delivered Task 7B Draft r.4, the user follows:

```text
Builder -> Data -> Menu items -> Margherita pizza -> Dish name
```

They replace `Margherita pizza` with `Heirloom tomato pizza`. A successful save
appends Draft r.5 and one active immutable Snapshot V2. The Snapshot-bound
Customer Menu and Merchant Menu Management previews show the new value only
after a strict Control Plane response replaces the current instance.

This is one seed-value edit, not generic Data CRUD. It directly advances the
polished editable Restaurant product while keeping Graph, platform, compiler,
capability, recipe, Prisma, package, provider, runtime, and deployment contracts
unchanged.

## Selected approach

Use one server-owned, template-specific field revision command. The browser
sends only the current base Draft id and the four exact selectors/value. The
server captures those primitives once, re-reads the latest server-owned Graph,
proves the complete Restaurant data/binding/permission closure, changes the
same `name` value in the index-aligned seed and scenario records, proves full
restoration equality, invokes the existing compiler preview closure, and
atomically appends the next Draft and Snapshot.

This is preferred over a generic editor because it makes the complete authority
and immutability proof small enough to review. It also avoids inventing a new
Graph field operation protocol before the product has demonstrated a second
field shape.

Rejected alternatives are whole-Graph or whole-record submission, editing only
one side of the seed/scenario mirror, optimistic preview mutation, mutable rows,
and compiler/recipe widening. Each either grants browser authority or breaks
the accepted lifecycle/closure.

## Reuse inventory and component boundary

Reuse the delivered Task 6B/7A/7B boundaries:

- `WorkbenchTemplateDraftInstance` and `templateDraftResponse` for strict Graph
  V3, Snapshot V2, checksum, two-surface, workspace, and revision admission;
- `TemplateService` workspace/origin/latest-Draft lookup, three-attempt
  Serializable pattern, `instanceFrom`, dual render, and Snapshot append;
- the exported compiler-owned
  `assertRestaurantDraftPreviewGraphClosure` before append/render;
- `template-draft-workspace.tsx`, `template-page-workspace.tsx`, and
  `workbench-shell.tsx` for selection, Builder navigation, preview framing,
  fixed status, focus, and responsive conventions;
- existing form/button/status tokens and the delivered Lucide icon family; and
- the real Restaurant Graph V3 fixture and Task 7B r.4 Playwright journey.

The policy-ordered search includes approved UI primitives/patterns/Workbench
packages, Screen/Experience/Product Recipes, existing Workbench template
workspaces, compiler generated-project templates, and pinned source studies.
None provides a Graph V3 seed-field editor. Create only
`TemplateDataWorkspace`; its distinct gap is checksum-bound seed/scenario
editing with no generic record or schema authority. No registry key, external
source, copied asset, dependency, or icon family is introduced.

## Exact command and operation interfaces

The endpoint is exactly:

```text
POST /template-draft-instances/:applicationGraphId/data-field-revisions
```

```ts
export type AppendTemplateDataFieldRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly entityKey: "menu-item";
  readonly recordId: "margherita-pizza";
  readonly fieldKey: "name";
  readonly value: string;
};

export type TemplateDataFieldEditResult =
  AppendTemplateDataFieldRevisionInput & {
    readonly graph: ApplicationGraphV3;
  };

export function captureTemplateDataFieldRevisionInput(
  input: unknown,
): AppendTemplateDataFieldRevisionInput;

export function applyTemplateDataFieldEdit(
  graphInput: unknown,
  input: unknown,
): TemplateDataFieldEditResult;

export function applyCapturedTemplateDataFieldEdit(
  graphInput: unknown,
  command: AppendTemplateDataFieldRevisionInput,
): TemplateDataFieldEditResult;
```

The controller delegates the raw body to:

```ts
appendTemplateDataFieldRevision(
  applicationGraphId: string,
  input: unknown,
): Promise<TemplateDraftInstanceV1>;
```

The Workbench client exposes the same method name with the exact typed input and
returns `Promise<WorkbenchTemplateDraftInstance>` through the existing strict
response parser.

## Admission and authority

The raw body is an own plain record with exactly five enumerable own data
properties. Capture reads descriptors, copies primitives once, freezes the
result, and never invokes getters, conversion hooks, iterators, or `toJSON`.
Selectors accept only `menu-item`, `margherita-pizza`, and `name`.
`baseDraftRevisionId` is a bounded Graph key. `value` is a primitive string,
trimmed to 2..120 characters, with no C0/DEL control characters.

Malformed input returns fixed HTTP 400
`Template Draft request is invalid.` Stale base, normalized no-op, P2002, and
exhausted P2034 return fixed HTTP 409
`Template Draft revision moved; reload before editing.` Cross-workspace and
missing Applications share the fixed existing not-found response. No response
or log echoes selectors, values, bodies, Graphs, Snapshots, or hostile errors.

Every attempt scopes by local workspace before origin inspection, verifies the
curated Restaurant origin and latest base, then proves:

- exactly one `domain.seedData` record matches
  `menu-item` / `margherita-pizza`;
- the Graph has exactly one seed scenario and it is `fine-dining-service`;
- every seed record and scenario record is index-aligned with equal entity and
  structurally equal `values`;
- `menu-item.name` is exactly one required string field with client authority;
- exactly three customer read policies bind `name` at
  `customer-home/home-items`, `customer-menu/menu-items`, and
  `customer-dish-detail/dish-configurator`;
- exactly one merchant write policy binds `name` at
  `merchant-menu-management/merchant-menu-table`; and
- manager has `menu-item:update` permission.

All identities and access/authority values are exact. Duplicate or drifted
entries fail; the operation does not search for a close substitute.

## Mutation and immutable lifecycle

The pure operation clones the asserted current Graph and updates only the
matched `domain.seedData[index].values.name` and aligned
`seedScenarios[0].records[index].values.name`. Both receive the normalized
captured value. It rechecks the full mirror, restores those two values in a
clone, and demands deep equality with the complete base Graph. It then
reasserts Graph V3 and returns fresh data.

The service invokes `assertRestaurantDraftPreviewGraphClosure` on that candidate
before Draft creation or rendering. It uses at most three Serializable attempts
and redoes the complete server-owned validation each time with the one captured
command. Success appends exactly Draft r.5, renders exactly Customer and
Merchant surfaces, stores exactly one new checksum-bound active Snapshot V2,
and returns the existing strict instance envelope. Renderer, checksum,
validation, Snapshot, uniqueness, or exhausted serialization failure rolls back
the entire attempted Draft/Snapshot outcome. r.4 and all earlier rows remain
structurally unchanged and readable.

## Workbench interaction and data flow

The Builder gains Data for an active Graph V3 template Draft. The workspace is
a sparse hierarchy rather than a generic grid:

```text
Menu items
  Margherita pizza
    Dish name  [Margherita pizza]
```

It shows the current Draft/Snapshot, the single text field, one `Save as new
Draft` action, fixed status, and two compact preview panels labelled Customer
Menu and Merchant Menu Management. The page workspace and Page-order behavior
remain unchanged.

```text
strict r.4 instance + checksum match
  -> locate exact seed and aligned scenario in draft.graph
  -> local Dish name input
  -> exact five-field client command
  -> Control Plane current-base and closure proof
  -> update two mirrored values only
  -> Graph V3 + compiler preview closure
  -> atomic Draft r.5 + active Snapshot V2 + two renders
  -> strict client response + checksum match
  -> replace instance
  -> both preview panels show Heirloom tomato pizza
```

The displayed seed comes only from the strict response Graph after checksum
match. Local fixtures, preview markup, labels, and unsaved state are not product
truth. While pending or after failure, both previews remain on the accepted
server value and the unsaved input remains available. The UI maps every failure
to `Template data could not be saved.`

Save is disabled for invalid, unchanged, or busy state. Keyboard submit and
Escape/back behavior are deterministic; focus returns to a status/heading after
success and remains useful after failure. Inputs/actions are labelled,
focus-visible, and at least 44px. At 390px the editor and previews stack with no
horizontal overflow; 1440px uses the existing sparse split workspace.

## Explicit deferrals

Deferred and unauthorized: any other entity, record, field, seed scenario,
schema-driven form, record list CRUD, add/delete/duplicate/reorder, relation
editing, Users, permissions editing, Workflow, Experience, block/content edits,
Source, export, Publish, Compilation, generated-runtime editing, history picker,
audit log, production authentication/multi-tenancy claim, provider, service,
network, queue, worker, Docker, Compose, deployment, dependency, package,
lockfile, Graph, Capability, Product Recipe, Screen Recipe, compiler, Prisma, or
database change.

## Verification and delivery

TDD starts with the pure operation; continues through route/service concurrency
and rollback; then strict client/controller/UI; and ends in a real browser that
opens the delivered r.4, edits the exact field, observes no speculative preview
change, saves r.5, sees both surfaces change, reloads r.5, and proves focus,
announcements, contrast, 1440px, and 390px behavior.

Fresh gates cover focused and full Control Plane/Workbench tests; Graph,
Capabilities, and Compiler compatibility; package no-emit/build; Prisma
validation; Playwright; exact 22 implementation plus six governance path
containment; formatting/diff; browser-import, dependency-boundary, compiler/
Graph/capability/recipe/Prisma/lock static exclusion; and sensitive-data scans.

Delivery is serialized: one Sol writer, independent intended-vs-implemented
review, targeted Terra QA, final independent Sol review, PM acceptance, then
controller-only exact-28 staging, commit
`feat(workbench): add governed restaurant data editing`, non-force push, and
local/upstream equality.
