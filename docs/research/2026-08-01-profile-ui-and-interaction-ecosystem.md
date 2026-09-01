# Profile UI and Interaction Ecosystem

**Research date:** 2026-08-01  
**Decision investigated:** Which mature, licence-compatible UI libraries and
reference applications could give Factory-generated products professional
multi-page interaction without making a visual library, a dashboard template,
or an upstream data model the source of truth?

## Decision

Factory should build a **small, Factory-owned interaction runtime** and a
curated set of PageModel component assets. It should use pinned libraries for
accessibility, form state, tables, graph editors, media, maps, charts, offline
shells, and tests. It should not clone dashboards or use an external editor's
document as application truth.

```text
Published Application Graph
  -> PageModel projection + Profile UI bindings
  -> Factory component-asset registry
  -> pinned UI/runtime libraries
  -> generated Next.js application or Workbench
```

**Observed fact:** the sources in this memo are public official repositories
and their licence files. Repository activity and stars are maintenance signals,
not a security certification. GitHub repository metadata was checked on
2026-07-31.

**Inference:** the Factory interfaces, ordering, and boundaries below are
Factory-owned decisions. No entry is installed, a Candidate, a Golden asset,
or authority to copy code today.

## Required ownership boundary

`ApplicationGraphV1.page` remains canonical. The editor stores a validated
PageModel projection; library-specific JSON, CSS classes, component props,
pixel coordinates, and visual state are implementation details. The compiler
accepts only a Published Revision and emits a target-specific projection.

| Asset class    | Factory owns                                                                 | Library may provide                                 | Library must not provide                                                 |
| -------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Page and route | route key, component tree, bindings, responsive intent, accessibility policy | canvas/editor, layout measurement, drag interaction | canonical persisted page document or route authority                     |
| Form           | field key, domain binding, validation rule, command/action, error vocabulary | client state and accessible controls                | new domain fields, command semantics, or arbitrary validation code       |
| Data view      | query key, row identity, column semantics, action permissions                | rendering, sorting UI, virtualization               | policy bypass, unbounded data fetching, hidden calculated business state |
| Flow/lineage   | declared node/edge semantics and permitted transitions                       | selection, position, pan/zoom, edge rendering       | executable action code or a new workflow model                           |
| Theme          | semantic design tokens, allowed variants, brand metadata                     | CSS/runtime implementation                          | arbitrary persisted HTML/CSS/JS in the Graph                             |

The resulting component asset is a Factory manifest, not a copied dashboard:

```text
asset key + version + allowed PageModel props + declared data bindings
+ accessibility/visual fixtures + package lock + licence/notice evidence
```

## Candidate map (30 public sources)

Classifications mean: **direct dependency** can later be pinned behind a
Factory wrapper; **component-asset source study** means the source-distributed
code needs an exact source-study before a Factory asset is derived; **reference
only** permits design/architecture learning but no source incorporation; and
**no-copy** blocks reuse under the current policy.

|   # | Candidate and official evidence                                             | Exact licence                                                                                                                                | Class                                | PageModel/capability interface                                                    | Reuse boundary and maintenance/risk evidence                                                                                                                                                                                                                                                             |
| --: | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)                 | [MIT](https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE)                                                                         | Direct dependency                    | `experience.design-token-projection/v1`                                           | Compile Factory semantic tokens to a restricted token/CSS layer. It cannot make arbitrary classes persistent Graph data. Active repository metadata on 2026-07-31; prevent profile assets from depending on undocumented utility strings.                                                                |
|   2 | [shadcn/ui](https://github.com/shadcn-ui/ui)                                | [MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)                                                                                  | Component-asset source study         | `experience.component-asset/v1`                                                   | shadcn distributes source rather than a runtime component package. Each selected block needs its exact version, source/notice record, Factory wrapper, visual fixture, and declared bindings. The main repo had about 120k stars and was active on 2026-07-31; do not bulk-copy a dashboard or registry. |
|   3 | [Radix Primitives](https://github.com/radix-ui/primitives)                  | [MIT](https://github.com/radix-ui/primitives/blob/main/LICENSE)                                                                              | Direct dependency                    | `experience.accessible-primitive/v1`                                              | Use as the accessible base for dialogs, menus, tabs, popovers, and controls. Factory owns tokens and semantic component names. About 19k stars and active metadata on 2026-07-31; avoid coupling PageModel to Radix prop names.                                                                          |
|   4 | [React Aria / React Spectrum](https://github.com/adobe/react-spectrum)      | [Apache-2.0](https://github.com/adobe/react-spectrum/blob/main/LICENSE)                                                                      | Direct dependency study              | `experience.accessibility-behavior/v1`                                            | Alternative/headless accessibility implementation for complex keyboard, selection, and collection interaction. Choose a primitive baseline per asset family; do not ship competing Radix and React Aria implementations for one generated control. About 15k stars, active on 2026-07-31.                |
|   5 | [TanStack Table](https://github.com/TanStack/table)                         | [MIT](https://github.com/TanStack/table/blob/beta/LICENSE)                                                                                   | Direct dependency                    | `experience.data-grid/v1`                                                         | Generate small/admin tables from declared columns, row keys, filters, and permitted actions. Server query/policy remain compiler-generated. About 28k stars; default branch is currently `beta`, so pin a stable release rather than the branch.                                                         |
|   6 | [AG Grid Community](https://github.com/ag-grid/ag-grid)                     | Community packages [MIT; Enterprise commercial](https://github.com/ag-grid/ag-grid/blob/latest/LICENSE.txt)                                  | Direct dependency study              | `experience.advanced-data-grid/v1`                                                | Use only explicit Community package paths for high-volume grids. The compiler must reject Enterprise imports/features and record the package-specific notice. About 15k stars, active 2026-07-31; licence split is the primary risk.                                                                     |
|   7 | [React Hook Form](https://github.com/react-hook-form/react-hook-form)       | [MIT](https://github.com/react-hook-form/react-hook-form/blob/master/LICENSE)                                                                | Direct dependency                    | `experience.bound-form/v1`                                                        | Bind a PageModel form control to Graph-declared field schemas and command endpoints. It cannot introduce fields or rules. About 44k stars and active 2026-07-31.                                                                                                                                         |
|   8 | [Zod](https://github.com/colinhacks/zod)                                    | [MIT](https://github.com/colinhacks/zod/blob/main/LICENSE)                                                                                   | Direct dependency                    | `contract.runtime-validation/v1`                                                  | Compile Graph constraints to client/server validation and error maps. Pin generated schemas with API target versions; never accept model-authored executable refinements. About 43k stars and active 2026-07-31.                                                                                         |
|   9 | [TanStack Form](https://github.com/TanStack/form)                           | [MIT](https://github.com/TanStack/form/blob/main/LICENSE)                                                                                    | Reference/direct-dependency study    | `experience.bound-form/v1`                                                        | Compare against React Hook Form before adoption; Factory should have one form-state baseline per target. About 6.6k stars and active 2026-07-31; do not adopt merely to duplicate RHF capability.                                                                                                        |
|  10 | [TanStack Query](https://github.com/TanStack/query)                         | [MIT](https://github.com/TanStack/query/blob/main/LICENSE)                                                                                   | Direct dependency                    | `experience.server-state/v1`                                                      | Generated query/mutation clients get Graph route/policy/idempotency metadata. Cache state must not become application truth. Public metadata showed active maintenance on 2026-07-31.                                                                                                                    |
|  11 | [dnd kit](https://github.com/clauderic/dnd-kit)                             | [MIT](https://github.com/clauderic/dnd-kit/blob/master/LICENSE)                                                                              | Direct dependency                    | `experience.layout-editing/v1`                                                    | Dragging creates a candidate PageModel layout diff which semantic validation accepts or rejects. Do not persist raw DOM geometry as business layout semantics. About 17k stars and active 2026-07-31.                                                                                                    |
|  12 | [Motion](https://github.com/motiondivision/motion)                          | [MIT](https://github.com/motiondivision/motion/blob/main/LICENSE.md)                                                                         | Direct dependency study              | `experience.motion-token/v1`                                                      | Permit a small set of named transition tokens (`enter`, `exit`, `reorder`, `success`), not model-supplied JavaScript animation definitions. About 33k stars and active 2026-07-31.                                                                                                                       |
|  13 | [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) | [MIT](https://github.com/bvaughn/react-resizable-panels/blob/main/LICENSE.md)                                                                | Direct dependency                    | `experience.resizable-workspace/v1`                                               | Workbench-only layouts and generated admin workspaces may persist bounded panel preferences outside business Graph semantics. Check exact release because it is a UI preference, not a product capability.                                                                                               |
|  14 | [Puck](https://github.com/puckeditor/puck)                                  | [MIT](https://github.com/puckeditor/puck/blob/main/LICENSE)                                                                                  | Direct dependency adapter            | `experience.page-composition/v1`                                                  | Puck is the Page Studio canvas. Adapter maps Puck edit operations to PageModel diffs and compiles PageModel back to Puck data. About 13k stars and active 2026-07-31. Puck data is never persisted as canonical Graph truth.                                                                             |
|  15 | [React Flow / xyflow](https://github.com/xyflow/xyflow)                     | [MIT](https://github.com/xyflow/xyflow/blob/main/LICENSE)                                                                                    | Direct dependency adapter            | `experience.graph-layout/v1`                                                      | Use for Flow, Domain relation, dependency, and lineage projections. Factory validates typed nodes/edges before saving; React Flow coordinates and viewport are optional presentation metadata. About 38k stars and active 2026-07-31.                                                                    |
|  16 | [Apache ECharts](https://github.com/apache/echarts)                         | [Apache-2.0](https://github.com/apache/echarts/blob/master/LICENSE)                                                                          | Direct dependency                    | `analytics.dashboard-projection/v1`                                               | Compile redacted aggregate metrics to named chart assets. Charts cannot query data directly or define metrics. About 67k stars and active 2026-07-31; retain Apache notice.                                                                                                                              |
|  17 | [Recharts](https://github.com/recharts/recharts)                            | [MIT](https://github.com/recharts/recharts/blob/main/LICENSE)                                                                                | Direct dependency study              | `analytics.dashboard-projection/v1`                                               | A lighter React chart option for generated business dashboards. Select either this or ECharts per generated target/profile family to avoid duplicate visualization runtimes. About 27k stars and active 2026-07-31.                                                                                      |
|  18 | [Lexical](https://github.com/facebook/lexical)                              | [MIT](https://github.com/facebook/lexical/blob/main/LICENSE)                                                                                 | Direct dependency study              | `experience.rich-text/v1`                                                         | Store a Factory-defined, sanitised rich-text document or a constrained Lexical projection with export/import validation. Never compile embedded arbitrary HTML/script. About 23k stars and active 2026-07-31.                                                                                            |
|  19 | [Tiptap](https://github.com/ueberdosis/tiptap)                              | [MIT](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)                                                                             | Direct dependency study              | `experience.rich-text/v1`                                                         | Compare against Lexical; use only core/extensions whose paths have suitable notices. Do not copy commercial collaboration, cloud, or template material without a separate review. About 37k stars and active 2026-07-31.                                                                                 |
|  20 | [Uppy](https://github.com/transloadit/uppy)                                 | [MIT](https://github.com/transloadit/uppy/blob/main/LICENSE)                                                                                 | Direct dependency                    | `core.attachment-upload/v1`                                                       | Client upload UI sends a Graph-declared attachment command to a Factory storage provider. Source, MIME, size, retention, virus-scan state, and access policy remain Graph/provider controlled. About 31k stars and active 2026-07-31.                                                                    |
|  21 | [FullCalendar](https://github.com/fullcalendar/fullcalendar)                | [MIT core; Premium plugins separately licensed](https://github.com/fullcalendar/fullcalendar/blob/main/LICENSE.md)                           | Direct dependency study              | `scheduling.calendar-projection/v1`                                               | Compile availability/reservation views from Graph state; reject Premium plugin imports and arbitrary event-source URLs. About 21k stars and active 2026-07-31; package path/version fence required.                                                                                                      |
|  22 | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)                | [BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE)                                                                 | Direct dependency                    | `geo.map-presentation/v1`                                                         | Render approved location/route projections only. Tiles, geocoding, routing, and tracking stay separate providers with their own privacy/licence decisions. About 11k stars and active 2026-07-31.                                                                                                        |
|  23 | [Workbox](https://github.com/GoogleChrome/workbox)                          | [MIT](https://github.com/GoogleChrome/workbox/blob/v7/LICENSE)                                                                               | Direct dependency                    | `runtime.offline-shell/v1`                                                        | Start with offline shell and explicit read cache rules. Offline commands require Graph-declared idempotency/conflict behavior; a service worker must not retry money/order transitions blindly. About 13k stars; v7 branch activity was visible 2026-07-29.                                              |
|  24 | [cmdk](https://github.com/pacocoursey/cmdk)                                 | [MIT](https://github.com/pacocoursey/cmdk/blob/main/LICENSE)                                                                                 | Direct dependency                    | `experience.command-surface/v1`                                                   | Workbench and generated apps get a keyboard command surface generated from permitted actions. It must call the same policy-checked commands as visible controls.                                                                                                                                         |
|  25 | [Storybook](https://github.com/storybookjs/storybook)                       | [MIT](https://github.com/storybookjs/storybook/blob/next/LICENSE)                                                                            | Direct dependency (development only) | `experience.component-fixture/v1`                                                 | Generate and review asset fixtures, states, keyboard tests, and visual regressions. Storybook stories cannot become the source of a PageModel or bypass generated application tests.                                                                                                                     |
|  26 | [Playwright](https://github.com/microsoft/playwright)                       | [Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE)                                                                      | Direct dependency (test only)        | `verification.role-journey/v1`                                                    | Compile role journeys from Published Graph fixtures and execute them against Workbench/generated targets. About 94k stars and active 2026-07-31; do not use record-and-replay scripts as Graph input.                                                                                                    |
|  27 | [axe-core](https://github.com/dequelabs/axe-core)                           | [MPL-2.0](https://github.com/dequelabs/axe-core/blob/develop/LICENSE)                                                                        | Direct dependency study (test only)  | `verification.accessibility/v1`                                                   | Run against asset/profile fixtures and retain MPL file-level notice obligations. It detects classes of accessibility issues but does not prove legal accessibility conformance. About 7.3k stars and active 2026-07-30.                                                                                  |
|  28 | [Appsmith](https://github.com/appsmithorg/appsmith)                         | [Apache-2.0](https://github.com/appsmithorg/appsmith/blob/release/LICENSE)                                                                   | Reference only / narrow source study | Admin page composition, datasource-bound widget, and permission UX vocabulary     | Do not embed the low-code runtime or adopt its model. A future study could identify one separately licensed, pure UI utility only after an exact file ledger. About 40k stars and active 2026-07-31.                                                                                                     |
|  29 | [Amplication](https://github.com/amplication/amplication)                   | Repository has [Apache-2.0 material](https://github.com/amplication/amplication/blob/master/LICENSE); `ee/` requires path-specific exclusion | Reference only / narrow source study | Generator plugin isolation, Git export, and template lifecycle patterns           | Never import code or inspect/copy `ee/` as reusable material. A fixed-ref study must establish exact allowed paths before any reuse. About 16k stars and active 2026-07-31.                                                                                                                              |
|  30 | [Medusa](https://github.com/medusajs/medusa)                                | [MIT](https://github.com/medusajs/medusa/blob/develop/LICENSE)                                                                               | Reference only / provider study      | Commerce storefront/admin interaction vocabulary and a later `CommerceProviderV1` | It is not a PageModel asset, generated runtime, schema, or payment authority. Use only to compare contracts and provider behavior; the existing governed portfolio has the detailed provider boundary.                                                                                                   |

## First 12 adoption queue

This queue is intentionally not a bulk installation list. Every item needs a
pin, licence notice/SBOM, Factory wrapper or adapter manifest, fixture,
negative test, and removal/replacement test. It is ordered by how much it
unlocks for many profiles, not by visual novelty.

| Priority | Bounded adoption slice                           | First observable result                                                                                                                                | Profile leverage                                  |
| -------: | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
|        1 | Tailwind token compiler + Radix wrapper baseline | Same token set renders accessible buttons, dialogs, menus, sheets, and navigation in Workbench and generated apps.                                     | Every profile                                     |
|        2 | Factory-owned shadcn asset registry study        | A small, licensed set of page blocks (`app-shell`, `record-list`, `record-detail`, `action-toolbar`, `empty-state`) can be selected by PageModel keys. | Every multipage profile                           |
|        3 | Zod compiler boundary                            | The same Graph field constraints produce client and server validation/error fixtures.                                                                  | Every profile                                     |
|        4 | React Hook Form adapter                          | Generated create/edit/request forms have declared validation, labels, error summaries, and command submissions.                                        | Records, approvals, commerce, scheduling          |
|        5 | TanStack Query client projection                 | Generated list/detail/mutation screens handle loading, retry, invalidation, and declared conflict responses.                                           | Every networked profile                           |
|        6 | TanStack Table baseline                          | Generated admin record/table screens support declared sorting, filtering, pagination, row selection, and authorised row actions.                       | Merchant/admin/operations surfaces                |
|        7 | Puck PageModel round-trip                        | A business user changes an allowed page layout/binding in Page Studio and receives a validated Draft diff, not opaque Puck truth.                      | Customer and internal applications                |
|        8 | React Flow projections                           | Flow, domain-relation, and product-lineage canvases save only validated semantic edge changes; graph interaction becomes consistent across Workbench.  | Workflow, data, audit, dependency views           |
|        9 | Uppy attachment adapter                          | Any Graph-declared attachment field gets a safe upload flow, scan/policy state, and role-bound display.                                                | CRM, support, approvals, commerce, property       |
|       10 | ECharts aggregate dashboard asset                | A profile declares metrics and receives a tested, accessible dashboard projection without arbitrary data access.                                       | Merchant analytics, inventory, service operations |
|       11 | FullCalendar core projection                     | Reservation, appointment, queue, and merchant schedule pages render Graph-declared availability without importing Premium code.                        | Hospitality, appointments, field service          |
|       12 | Workbox offline-shell policy                     | Generated apps have a reliable offline shell and safe cached reads; mutation/offline synchronization remains explicitly deferred and tested.           | Restaurant, field, inventory, retail              |

**Deliberate deferrals:** AG Grid, TanStack Form, React Aria, Recharts, Tiptap,
and Lexical are comparison choices, not concurrent baselines. Implementing
multiple libraries for the same component category would make generated UI
less consistent, not more powerful. Map, motion, command palette, resize
panels, Storybook, Playwright, and axe-core are adopted only when their narrow
adapter/test slice is scheduled.

## Puck, shadcn, and primitives as assets—not Graph truth

### Puck

Puck can provide fast visual multi-page editing, responsive preview, and
component arrangement. Factory should map it like this:

```text
Puck editor intent
  -> allowed component/prop change
  -> PageModel Graph diff
  -> Graph semantic + policy validation
  -> Draft revision
  -> Publish
  -> compiler emits Puck projection and generated app
```

It must not persist raw Puck data as the application definition, let an editor
invent a route/data binding/action, or permit a visual block to execute custom
JavaScript. Puck is an authoring adapter, and the generated app need not ship
Puck at runtime.

### shadcn/ui

shadcn is especially useful because its registry/source distribution can seed
Factory-owned, inspectable assets. Its correct role is an **internal curated
asset source**, not a remote template marketplace reachable by a model:

1. Source-study a single fixed upstream block and retain its MIT notice.
2. Replace direct domain/API assumptions with PageModel bindings.
3. Wrap it in Factory tokens and approved Radix primitives.
4. Add Storybook, accessibility, visual, and generated-app fixtures.
5. Publish it as a versioned Factory component asset only after the normal
   evidence/promotion path.

The library's source-distribution model is a reason for a source study, not a
reason to copy all components, dashboard templates, `components.json`, or
styling assumptions into every generated project.

### Radix, React Aria, forms, and grids

The component asset declares semantic `kind`, `bindings`, `allowedVariants`,
and `a11yRequirements`. The target renderer chooses a pinned implementation.
For example, a `record-table` asset can use TanStack Table in generated web
applications and a different native implementation later without changing
`PageModel`. A `date-range` asset may use a calendar projection but its value
remains a DomainModel field with declared validation.

## Workbench versus generated-product scope

One UI foundation can serve both, but the asset registries must be separate.

| Registry               | Purpose                                      | Examples                                                                                           | Must never become                                                    |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `workbench-ui`         | Factory operator interaction                 | Graph canvas, revision timeline, Provider evidence, command surface, token/theme controls          | A generated-customer UI dependency or a source of business semantics |
| `generated-ui`         | Profile-ready user/merchant/admin components | customer catalog, cart, request form, merchant inventory grid, kitchen queue, appointment schedule | The Application Graph itself or a profile-specific runtime fork      |
| `shared-accessibility` | Primitive wrappers/testing standards         | focus management, dialog, keyboard navigation, validation summary, colour/contrast fixture         | A reason to bypass profile policy/data binding                       |

This separation lets the Workbench remain advanced without leaking developer
console controls into a restaurant, ecommerce, clinic, or booking application.
It also means the same base component can have a Factory Workbench wrapper and
a generated-product wrapper with different allowed actions.

## Adoption gate and source-copy rule

The accepted External Capability Intake slice remains fixture-only. This memo
does **not** permit live retrieval, candidate creation, Golden promotion,
dependency installation, source copying, or provider activation.

For a future direct dependency or component asset, require:

```text
fixed release/commit and package digest
-> exact licence + third-party notice evidence
-> SBOM, vulnerability, secret, and path-scope checks
-> Factory adapter/asset contract and local fixture
-> Published-Revision-only and output-boundary negative tests
-> visual, keyboard, and role-policy journey evidence
-> promotion decision and removal/replacement test
```

For upstream application repositories, reuse must be more restrictive: a
separate source study must name exact files and line ranges, confirm the
licence/notice obligations at that immutable ref, record why Factory cannot
write a smaller independent implementation, and add Factory-authored tests.
No whole dashboard, backend, migration, seed data, generated project, or
business schema is eligible for bulk import.

## Product decision affected

The first high-leverage functional iteration after the current commercial
foundation repair should be a **PageModel component-asset foundation**, not a
manual expansion of Restaurant screens. It gives Restaurant Ordering,
Ecommerce, approvals, reservations, ticketing, CRM, and service Profiles the
same professional multi-page building blocks: shell/navigation, form, table,
detail, action, upload, graph, chart, calendar, and safe offline experience.

The Restaurant profile can then gain customer and merchant functionality as
compositions of those assets and shared commerce/hospitality Graph packages.
That advances a 100+ Profile factory; it does not turn Factory into a
one-off restaurant application codebase.

## Residual risks

- A permissive licence does not make a dependency secure, supported, or
  compatible with generated targets. Pinning, notices, SBOMs, fixtures, and
  revalidation remain required.
- Project-level licences may not cover all package paths, assets, fonts,
  Premium/enterprise directories, tiles, map data, or cloud services.
- Editors and UI libraries can make arbitrary content appear easy to save.
  Factory must keep the allowlisted component/data/action boundary at the
  Graph adapter.
- Professional interaction also needs performance budgets, responsive visual
  tests, keyboard journeys, localisation, privacy, and error/empty/loading
  states. A library cannot supply those product decisions automatically.
