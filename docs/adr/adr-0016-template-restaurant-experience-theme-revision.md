---
title: "ADR-0016: Template Restaurant Experience Theme Revision"
status: "Accepted"
date: "2026-08-14"
authors: "Archeform Tech Lead"
tags: ["architecture", "templates", "draft", "experience", "theme", "preview"]
supersedes: ""
superseded_by: ""
---

# ADR-0016: Template Restaurant Experience Theme Revision

## Status and founder gate

**Accepted on 2026-08-14** under the founder's standing instruction
`参考以下总结，若符合项目目标，则持续接受而迭代。`

PM/controller confirms the condition is met. The slice is bounded,
append-only, reversible, and directly advances the accepted polished editable
Restaurant product. Application Graph V3 already admits `dark`, the curated
Restaurant source Experience Recipe declares dark support, and the existing
compiler preview closure accepts theme-mode variation without changing a Graph,
recipe, compiler, generated-runtime, database, dependency, provider, service,
or deployment contract. No new founder prompt is required.

The exact 29-path implementation tree is PM-accepted for delivery after
independent repaired-tree review `PASS`, targeted Terra `PASS`, and final Sol
`RELEASE_ACCEPT` with actionable P0/P1/P2=0/0/0. It is not yet delivered.

## Recommendation

- **Keep** the accepted Node.js 22, React 19, Next.js 15, NestJS 10, Prisma 6,
  PostgreSQL 16, Application Graph V1/V2/V3, Draft Preview Snapshot V2,
  Product/Screen/Experience Recipes, compiler targets, and Draft -> Published
  -> Compilation lifecycle.
- **Migrate additively** by adding one exact template Experience-theme Draft
  command and one backed `Experience` Workbench destination. Reuse the existing
  strict template-instance response, current-Snapshot admission, compiler-owned
  preview closure, dual renderer, and append-only Draft/Snapshot persistence.
- **Reject** complete Experience or Graph submission, token/design-system/
  locale/navigation editing, optimistic preview mutation, Workbench chrome-
  theme coupling, generated-runtime theming, mutable rows, and generic theme
  CRUD.

## Exact visible outcome

```text
Builder -> Experience -> Theme
Light -> Dark
```

The operation starts from delivered Draft r.5. Success appends Draft r.6 and
exactly one new immutable active Snapshot V2. The Customer and Merchant
Workbench preview frames switch to dark only after a strict checksum-bound
server response replaces the current instance. Pending or failed saves leave
both frames light.

## Stable API and exact interfaces

Add exactly:

```text
POST /template-draft-instances/:applicationGraphId/experience-theme-revisions
```

```ts
export type AppendTemplateExperienceThemeRevisionInput = {
  readonly baseDraftRevisionId: string;
  readonly mode: "dark";
};

export type TemplateExperienceThemeEditResult =
  AppendTemplateExperienceThemeRevisionInput & {
    readonly graph: ApplicationGraphV3;
  };

export function captureTemplateExperienceThemeRevisionInput(
  input: unknown,
): AppendTemplateExperienceThemeRevisionInput;

export function applyTemplateExperienceThemeEdit(
  graphInput: unknown,
  input: unknown,
): TemplateExperienceThemeEditResult;

export function applyCapturedTemplateExperienceThemeEdit(
  graphInput: unknown,
  command: AppendTemplateExperienceThemeRevisionInput,
): TemplateExperienceThemeEditResult;
```

The service and Workbench client use the same method name:

```ts
appendTemplateExperienceThemeRevision(
  applicationGraphId: string,
  input: unknown,
): Promise<TemplateDraftInstanceV1>;

appendTemplateExperienceThemeRevision(
  applicationGraphId: string,
  input: AppendTemplateExperienceThemeRevisionInput,
): Promise<WorkbenchTemplateDraftInstance>;
```

Success returns the unchanged strict
`factory.template-draft-instance/v1` envelope. The browser cannot send tokens,
design system, locales, navigation, surfaces, pages, preview state, Graph,
Snapshot, revision number, checksum, or lifecycle state.

## Strict one-time command capture

Capture the body exactly once before Prisma, workspace, origin, Graph, Snapshot,
hash, registry, or renderer work. Reuse only the frozen captured primitives
across bounded retries.

The body is an own plain record with exactly two enumerable own data properties:
`baseDraftRevisionId` and `mode`. Reject arrays, custom prototypes, inherited,
accessor, symbol, non-enumerable, missing, or extra properties; reflection
failures; caller conversions; and values with getters, iterators, `toString`,
`valueOf`, or `toJSON`. The base is a primitive 1..128 Graph key and `mode` is
exactly the primitive literal `dark`.

Malformed input returns HTTP 400 with exactly
`Template Draft request is invalid.` and never echoes input.

## Current authority and exact mutation

Within every Serializable attempt, the server must:

1. select the Application by `applicationGraphId` and server-owned local
   workspace before reading origin; absent and cross-workspace share the fixed
   existing not-found response;
2. prove the exact curated Restaurant origin and read the latest Draft plus its
   latest Snapshot;
3. require `baseDraftRevisionId` to equal the latest Draft id;
4. reassert the stored Graph as Application Graph V3 and verify workspace,
   application, aggregate name, Draft ownership, and Graph hash;
5. reassert the current Snapshot V2 and require local workspace, Application,
   latest Draft, exact current Graph checksum, and `active` state;
6. require `graph.experience.theme.mode === "light"`; and
7. preserve complete Restaurant preview closure.

Clone the current server-owned Graph and change only
`graph.experience.theme.mode` from `light` to `dark`. Tokens, optional
`designSystem`, locales, responsive navigation, surfaces, pages, domain,
policy, flows, journeys, authorities, bindings, integrations, metadata, and all
other values and ordering remain structurally equal.

Prove full restoration equality by cloning the candidate, restoring mode to
`light`, and requiring deep structural equality with the entire base Graph.
Then reassert Graph V3, derive its checksum, and call the existing
`assertRestaurantDraftPreviewGraphClosure` before Draft creation or renderer
invocation. A current `dark` mode is a no-op conflict; any other current mode is
invalid for this curated operation.

## Concurrency, errors, and atomic lifecycle

Use one Prisma Serializable operation with at most three attempts. Every retry
re-reads and revalidates workspace, origin, latest Draft/current Snapshot,
identity, checksum, active state, current light mode, Graph, and compiler
preview closure while reusing the one captured command.

- Stale base, current-dark no-op, P2002, or exhausted P2034 returns HTTP 409
  with exactly `Template Draft revision moved; reload before editing.`
- Malformed input, current-Snapshot drift, unsupported current mode, identity
  drift, Graph failure, or preview-closure failure returns HTTP 400 with exactly
  `Template Draft request is invalid.`
- Errors and evidence never log or echo ids, bodies, Graphs, Snapshots, themes,
  reflection errors, or hostile values.

Success atomically appends exactly Draft r.6, renders exactly the Customer and
Merchant preview surfaces, appends exactly one checksum-bound immutable active
Snapshot V2, selects it, and returns the strict response. Validation, checksum,
renderer, Snapshot, response assembly, P2002, or exhausted P2034 failure leaves
no new Draft or Snapshot. r.5 and every prior row remain unchanged and readable.

## Workbench boundary

Add `Experience` to the backed Builder destination registry and a distinct
local Workbench surface. This is an operator UI addition only; it is not a
Graph, recipe, compiler target, or generated-runtime destination.

The Experience workspace shows `Theme` with a keyboard-accessible Light/Dark
radio group or native select. Only Dark is a saveable change in this slice.
Workbench derives the current mode only from
`WorkbenchTemplateDraftInstance.draft.graph` after the existing strict parser
has matched Graph hash, latest Draft/Snapshot identity, active state, and both
preview documents.

Two preview frames are labelled Customer and Merchant and carry the strict
Snapshot id. Their frame presentation is derived from the checksum-matched
Graph mode, not local selection or Workbench chrome theme. Pending/failure
keeps both accepted light frames while preserving the proposed Dark selection.
Only strict success replaces the instance and changes both frames to dark.
Browser failures normalize to `Template experience could not be saved.`

Controls are labelled, focus-visible, keyboard operable, announced, at least
44px, WCAG AA, and stack without horizontal overflow at 390px. The 1440px layout
retains the existing sparse split-workspace language.

## Compatibility and security effects

- **API/UI registry:** one additive local POST and one backed `experience`
  Workbench destination/surface. Existing destination keys remain unchanged.
- **Graph/data:** no schema or Prisma change. Existing Draft/Snapshot tables are
  append-only. V1/V2 and V3 assertions remain unchanged.
- **Compiler/runtime:** the existing pure preview closure is reused unchanged.
  No surface-plan shape, compiler target, generated source, or runtime behavior
  changes; this outcome is limited to Workbench preview frames.
- **Supply chain/operations:** no new package, dependency, lock resolution,
  registry asset, copied source, provider, network, queue, worker, service,
  Docker, Compose, export, Publish, Compilation, deployment, or external action.
- **Security:** hostile capture, workspace-before-origin, immutable base/current
  Snapshot authority, strict checksums, fixed errors, bounded retries, atomic
  history, and no raw input or Graph logging.

## Alternatives and deferrals

1. **Exact mode command — selected.** Smallest honest Graph/Snapshot round trip.
2. **Submit complete Experience/Graph — rejected.** Grants browser authority
   over tokens, design system, locales, navigation, and unrelated contracts.
3. **Toggle Workbench chrome theme — rejected.** It is local UI state, not
   persisted product truth or Snapshot evidence.
4. **Change generated runtime theme — deferred.** Production compilation/source
   behavior is a separate Published-only contract.
5. **Generic light/dark/system editor — deferred.** This slice proves only the
   current curated `light -> dark` operation.

Explicitly deferred: token, design-system, locale, responsive-navigation,
surface, page, data, Access, Users, Workflow, content, Source, export, Publish,
Compilation, generated-runtime, history-picker, provider, service, deployment,
dependency, Graph, Capability, Product/Screen/Experience Recipe, Compiler, and
Prisma/database changes.

## Rollback, abort conditions, and verification

Before the first accepted r.6 write, rollback may remove the route, Experience
destination, and workspace together. After r.6 exists, rollback disables new
writes while retaining read/preview support for immutable history; it never
edits or deletes rows.

Abort and return to Tech Lead/PM if implementation needs another mode,
Experience field, implementation path, Graph/recipe/compiler/Prisma/package/
lock change, generated-runtime theming, automatic rebase, mutable history,
external service, Publish, Compilation, export, or deployment.

Acceptance requires focused TDD for pure capture/mutation; service current-
Snapshot/concurrency/rollback; strict client; additive destination/surface;
accessible Experience workspace; non-speculative dual frames; and real browser
r.5 -> r.6/reload at 1440px and 390px. Fresh full Control Plane, Workbench,
Workbench UI, Graph, Capabilities, and Compiler compatibility; no-emit/build;
Prisma; Playwright; exact containment; formatting/diff/static/sensitive checks;
one independent review; targeted Terra/browser QA; and final Sol release review
must pass before PM/controller delivery.
