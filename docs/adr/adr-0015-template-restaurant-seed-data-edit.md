---
title: "ADR-0015: Template Restaurant Seed Data Edit"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "templates", "draft", "data-editor", "preview"]
supersedes: ""
superseded_by: ""
---

# ADR-0015: Template Restaurant Seed Data Edit

## Status and founder decision gate

**Accepted on 2026-08-14.** The founder's standing instruction is, verbatim,
`参考以下总结，若符合项目目标，则持续接受而迭代。`

PM/controller explicitly adjudicates that Task 7C meets the condition. It is
bounded, additive, append-only, and reversible; directly advances the accepted
polished and editable Restaurant product; and introduces no Graph, platform,
provider, service, dependency, database, deployment, or generated-runtime
expansion. No new founder prompt is required. This acceptance applies only to
the exact seed-name edit below.

Implementation state: **accepted, not delivered**. The exact 28-path tree has
passed writer verification, intended-vs-implemented review, targeted Terra QA,
and final Sol release review. Only controller staging, commit, non-force push,
and pushed equality remain.

## Recommendation

- **Keep** the accepted Node.js 22, React 19, Next.js 15, NestJS 10, Prisma 6,
  PostgreSQL 16, Application Graph V1/V2/V3, Product Recipe, Screen Recipe,
  Draft Preview Snapshot V2, and mutable Draft -> immutable Published revision
  -> immutable Compilation contracts.
- **Migrate additively** by adding one template-specific Graph V3 data-field
  revision command and one Workbench Data workspace. It reuses the existing
  Draft/Snapshot tables, strict `factory.template-draft-instance/v1` response,
  checksum validation, Restaurant preview renderer, and compiler-owned preview
  closure assertion.
- **Reject** a generic record editor, browser-supplied Graph or seed records,
  arbitrary entity/record/field selection, seed insertion/deletion/reordering,
  mutable history, Graph/schema/Prisma changes, compiler changes, and any
  platform or runtime expansion.

## Exact visible outcome

The real journey is exactly:

```text
Builder -> Data -> Menu items -> Margherita pizza -> Dish name
Margherita pizza -> Heirloom tomato pizza
```

The successful server response appends Draft r.5 and exactly one new immutable
active Snapshot V2. Its two Snapshot-bound Workbench previews are Customer Menu
and Merchant Menu Management. They change only after the strict server response
passes Graph and checksum admission; no optimistic preview mutation is allowed.

## Stable API and TypeScript contract

Add exactly this local route:

```text
POST /template-draft-instances/:applicationGraphId/data-field-revisions
```

The exact body and exported operation signatures are:

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

The service and Workbench client signatures are exactly:

```ts
appendTemplateDataFieldRevision(
  applicationGraphId: string,
  input: unknown,
): Promise<TemplateDraftInstanceV1>;

appendTemplateDataFieldRevision(
  applicationGraphId: string,
  input: AppendTemplateDataFieldRevisionInput,
): Promise<WorkbenchTemplateDraftInstance>;
```

Success returns the unchanged strict
`factory.template-draft-instance/v1` envelope. No version is inferred from body
shape and no Graph, entity, record, seed array, scenario, binding, policy,
permission, preview, Snapshot, or lifecycle field is accepted from the browser.

## One-time hostile-safe capture

Capture the complete command exactly once before Prisma, Graph, workspace,
origin, registry, hash, or renderer work. Reuse only the frozen captured
primitives across at most three Serializable attempts.

The body must be an own plain record with exactly the five enumerable own data
properties above. Reject symbols, accessors, inherited or non-enumerable
properties, missing/extra keys, custom prototypes, arrays, Proxies whose
required reflection traps throw, and caller-controlled conversion hooks. Do
not call getters, iterators, `toString`, `valueOf`, or `toJSON`.

`entityKey`, `recordId`, and `fieldKey` accept only the three literals in the
type. `baseDraftRevisionId` is a primitive bounded Graph key. `value` must be a
primitive string, trimmed once, 2 through 120 characters after trimming, with
no U+0000..U+001F or U+007F controls. Empty or non-string values are rejected.
Capture has no Graph authority and therefore does not decide whether the
normalized value is unchanged; the Graph-aware operation maps that no-op to the
fixed 409 below. Capture failures return HTTP 400 with exactly
`Template Draft request is invalid.` and never echo hostile material.

## Server authority and required current closure

Every Serializable attempt must perform these checks in order:

1. Select the Application by both `applicationGraphId` and the server-owned
   local workspace before reading or asserting origin data. Absent and
   cross-workspace Applications share the existing fixed not-found response.
2. Prove the exact curated Restaurant origin, then read the current latest
   Draft and require its id to equal `baseDraftRevisionId`.
3. Reassert the stored graph as strict Application Graph V3 and verify workspace
   identity, application identity, aggregate name, and Graph hash.
4. Require exactly one `domain.seedData` record whose `entity` is `menu-item`
   and whose `id` is `margherita-pizza`.
5. Require exactly one seed scenario in the complete Graph and require its key
   to be `fine-dining-service`. Its `records` array must be a full, index-aligned
   mirror of `domain.seedData`: equal length, and for every index `i`,
   `records[i].entityKey === seedData[i].entity` and
   `records[i].values` is structurally equal to `seedData[i].values`.
6. Require the `menu-item` entity exactly once, its `name` field exactly once,
   and that field to be `{ key: "name", type: "string", required: true }` for
   those properties.
7. Require exactly one `menu-item.name` field authority and require
   `authority: "client"`.
8. Require exactly these four binding-policy closures for `menu-item.name`:
   three reads at `customer-home/home-items`,
   `customer-menu/menu-items`, and
   `customer-dish-detail/dish-configurator`, plus one write at
   `merchant-menu-management/merchant-menu-table`. Each has binding key
   `name`, exact entity/field, exact access, and client authority.
9. Require the manager permission for resource `menu-item` to contain action
   `update`.

Unknown, duplicate, missing, drifted, stale, or unauthorized selectors are not
repaired or inferred. Browser navigation and display state are selectors, not
authority.

## Exact two-location mutation

Clone the latest asserted Graph from server-owned data. Update only:

- the matched `domain.seedData[index].values.name`; and
- the index-aligned
  `seedScenarios[0].records[index].values.name`.

Set both to the same captured normalized `value`. Do not mutate the stored base
or caller input. Prove the two arrays remain a full index-aligned mirror.

For structural restoration, clone the candidate, restore those two `name`
values to the two base values, and require deep structural equality with the
complete base Graph. This equality includes all other seed/scenario values and
ordering; entities, fields, relations, pages, surfaces, recipes, blocks,
bindings, roles, permissions, flows, journeys, authorities, policies,
integrations, experience, metadata, and origin identity.

Reassert the complete Graph V3, derive its checksum, and call the existing
`assertRestaurantDraftPreviewGraphClosure` before any Draft append or renderer
invocation. No compiler, Graph, capability, recipe, or registry file changes.

## Concurrency, errors, and atomic Snapshot behavior

Use one bounded Prisma Serializable operation with at most three attempts.
Every attempt re-reads and revalidates workspace, origin, latest base, Graph,
seed/scenario mirror, schema, authority, bindings, and permission while reusing
the one captured command.

- A stale base, normalized no-op, P2002 uniqueness race, or exhausted P2034
  returns HTTP 409 with exactly
  `Template Draft revision moved; reload before editing.`
- A malformed request or invalid supported-Graph closure returns HTTP 400 with
  exactly `Template Draft request is invalid.`
- Errors never echo or log ids, values, request bodies, Graphs, snapshots,
  reflection errors, or hostile objects.

On acceptance, append exactly the next Draft, render the two governed surfaces,
append exactly one checksum-bound immutable active Snapshot V2, select it as
active, and return the strict response. Draft append, both surface renders,
Snapshot append, and response assembly are atomic. Validation, closure,
checksum, renderer, Snapshot, P2002, or exhausted P2034 failure leaves no new
Draft or Snapshot row. Every prior Draft and Snapshot remains unchanged and
readable.

## Workbench boundary

Add Data to the active Graph V3 template Builder navigation. The Data workspace
is deliberately literal and narrow: `Menu items`, `Margherita pizza`, and one
labelled `Dish name` text input. It sends only the exact five-field command,
using the currently loaded Draft id as the base.

Workbench derives the visible current seed only from the strict
`WorkbenchTemplateDraftInstance.draft.graph` after the existing response parser
has asserted Graph V3 and matched its hash to the active Snapshot checksum. It
then locates the one supported seed and its aligned scenario mirror. It does not
derive editable state from preview markup, local fixtures, route labels, or
optimistic state.

The Customer Menu and Merchant Menu Management preview panels remain bound to
the same strict instance/Snapshot. Pending and failed saves preserve the local
input but do not change either preview. Only a strict successful server response
replaces the instance, advances r.4 to r.5, and makes both previews show
`Heirloom tomato pizza`. All failures normalize to
`Template data could not be saved.` in the browser.

The workspace preserves keyboard order, focus-visible controls, a minimum 44px
target, status announcements, and a no-horizontal-overflow 390px layout.

## Compatibility, security, and operability effects

- **API/data:** one additive local route; no Prisma migration; append-only use
  of existing Draft and Snapshot rows.
- **Graph/capabilities/compiler:** no contract or source change. V1/V2 behavior,
  Graph V3 assertions, Capability/Product/Screen Recipes, preview closure, and
  production compilation remain unchanged.
- **Security:** strict one-time capture, workspace-before-origin lookup,
  server-owned base/Graph/permission authority, fixed errors, bounded retries,
  no raw-body/value logging, and no HTML/source interpretation.
- **Supply chain/operations:** no package, lockfile, license, registry, network,
  provider, worker, queue, service, Docker, Compose, export, Publish,
  Compilation, deployment, or external authority change.

## Alternatives considered

1. **Generic Data CRUD.** Rejected because it would require dynamic schema,
   record identity, authorization, validation, and UI contracts.
2. **Edit only `domain.seedData`.** Rejected because it breaks the accepted
   full seed-scenario mirror and produces inconsistent preview/runtime inputs.
3. **Send the whole seed record or Graph.** Rejected because the browser would
   gain authority over unrelated fields and governed contracts.
4. **Derive preview values from local UI state.** Rejected because it would
   display uncommitted state and bypass Snapshot/checksum authority.
5. **Change compiler or recipe projections.** Rejected because the existing
   Graph V3 preview closure already accepts the legal value change.
6. **Mutate the latest Draft/Snapshot.** Rejected because it destroys immutable
   history and concurrency evidence.

## Migration, rollback, abort conditions, and ownership

No migration or irreversible external step exists. Before the first accepted
write, rollback may remove the route and UI together. After r.5 exists,
rollback disables new writes but retains read/preview support for the immutable
Draft/Snapshot history; it never edits or deletes rows.

Abort implementation and return to PM/Tech Lead if the slice requires any path
outside the frozen manifest, a second entity/record/field, a Graph/recipe/
capability/compiler/Prisma/package/lock change, a mutable row, automatic rebase,
generic authorization, external service, generated-runtime behavior, Publish,
Compilation, export, or deployment.

One GPT-5.6-Sol writer owns the exact 22-path implementation. An independent
intended-vs-implemented reviewer follows; targeted GPT-5.6-Terra QA is mandatory
because this is a serialized API/security boundary; one final independent Sol
release review follows. PM/controller alone owns the exact 28-path delivery
commit and non-force push.

## Verification obligations

Acceptance requires focused TDD evidence for strict capture; the two-location
pure mutation and full restoration equality; exact seed/scenario/schema/
authority/binding/permission closure; workspace/origin/base checks;
stale/no-op/P2002/P2034 behavior; renderer and Snapshot rollback; strict client
admission; authoritative dual-preview UI; accessibility; and the real r.4 ->
r.5 browser journey at 1440px and 390px.

Fresh completion gates must cover full Control Plane and Workbench suites;
Graph, Capabilities, and Compiler compatibility; all relevant no-emit checks
and builds; Prisma validation; Playwright; exact formatting, static-boundary,
sensitive-data, browser-import, diff, and 22+6 containment checks. Evidence and
review verdicts belong in the active Restaurant ledger.
